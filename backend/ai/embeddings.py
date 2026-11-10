"""Versioned Gemini Embedding 2 inputs; document and query vectors share one contract."""

import math
import os
from functools import lru_cache

from google import genai
from google.genai import errors, types

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 3072
EMBEDDING_VERSION = "gemini-embedding-2:retrieval-v2:3072"


class EmbeddingError(RuntimeError):
    """A safe document-search failure, without provider responses or credentials."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@lru_cache(maxsize=1)
def _embedding_client(api_key: str):
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=30000))


def format_embedding_input(content: str, *, document: bool, title: str = "") -> str:
    if document:
        return f"title: {title.strip() or 'Untitled document'} | text: {content.strip()}"
    prefix = "task: search result | query: "
    return content.strip() if content.startswith(prefix) else prefix + content.strip()


def get_embedding(text_string: str, task_type: str | None = "retrieval_document", *, title: str = ""):
    """Return a finite 3072D vector. task_type selects local formatting, never an API parameter."""
    if task_type not in (None, "retrieval_query", "retrieval_document"):
        raise ValueError("Unsupported local embedding task")
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise EmbeddingError("embedding_not_configured", "Document search is not configured. Please contact an administrator.")
    try:
        result = _embedding_client(api_key).models.embed_content(
            model=EMBEDDING_MODEL,
            contents=format_embedding_input(text_string, document=task_type == "retrieval_document", title=title),
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        vector = result.embeddings[0].values
        if len(vector) != EMBEDDING_DIMENSIONS or not all(math.isfinite(x) for x in vector) or not any(vector):
            raise ValueError("Invalid embedding shape")
        return vector
    except errors.APIError as exc:
        code, message = {
            401: ("embedding_access_denied", "Document search could not authenticate with its provider. Please contact an administrator."),
            403: ("embedding_access_denied", "Document search could not authenticate with its provider. Please contact an administrator."),
            429: ("embedding_quota_exceeded", "Document search has reached its provider's rate limit or quota. Please try again later."),
            404: ("embedding_model_unavailable", "The document search model is unavailable. Please contact an administrator."),
            400: ("embedding_request_rejected", "The document search provider rejected the request. Please contact an administrator."),
        }.get(exc.code, ("embedding_unavailable", "Document search is temporarily unavailable. Please try again later."))
        raise EmbeddingError(code, message) from None
    except (IndexError, TypeError, ValueError, AttributeError):
        raise EmbeddingError("embedding_invalid_response", "Document search received an invalid embedding. Please contact an administrator.") from None
    except Exception:
        raise EmbeddingError("embedding_unavailable", "Document search is temporarily unavailable. Please try again later.") from None
