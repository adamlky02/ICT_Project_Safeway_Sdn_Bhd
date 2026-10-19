import os
from functools import lru_cache

import google.generativeai as genai
from google.api_core import exceptions as google_errors


class EmbeddingError(RuntimeError):
    """A safe document-search failure, without provider responses or credentials."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@lru_cache(maxsize=1)
def _configure_embeddings(api_key: str) -> None:
    # Retain the SDK's connections across document chunks and chat requests.
    genai.configure(api_key=api_key)


def get_embedding(text_string: str, task_type: str | None = "retrieval_document"):
    """Convert document or query text into a 3072-dimension semantic vector."""
    # Resolve after environment loading; response-provider keys do not configure embeddings.
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise EmbeddingError(
            "embedding_not_configured",
            "Document search is not configured. Please contact an administrator.",
        )
    _configure_embeddings(api_key)
    embedding_options = {
        "model": "models/gemini-embedding-2",
        "content": text_string,
    }
    if task_type:
        embedding_options["task_type"] = task_type
    try:
        result = genai.embed_content(**embedding_options)
    except (google_errors.Unauthenticated, google_errors.PermissionDenied):
        raise EmbeddingError(
            "embedding_access_denied",
            "Document search could not authenticate with its provider. Please contact an administrator.",
        ) from None
    except google_errors.ResourceExhausted:
        raise EmbeddingError(
            "embedding_quota_exceeded",
            "Document search has reached its provider's rate limit or quota. Please try again later.",
        ) from None
    except google_errors.NotFound:
        raise EmbeddingError(
            "embedding_model_unavailable",
            "The document search model is unavailable. Please contact an administrator.",
        ) from None
    except google_errors.InvalidArgument:
        raise EmbeddingError(
            "embedding_request_rejected",
            "The document search provider rejected the request. Please contact an administrator.",
        ) from None
    except (google_errors.DeadlineExceeded, google_errors.ServiceUnavailable):
        raise EmbeddingError(
            "embedding_unavailable",
            "Document search is temporarily unavailable. Please try again later.",
        ) from None
    return result["embedding"]
