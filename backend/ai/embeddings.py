import os

import google.generativeai as genai


# Embedding Model (keeps the existing vector index pinned to Gemini)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def get_embedding(text_string: str, task_type: str | None = "retrieval_document"):
    """Convert document or query text into a 3072-dimension semantic vector."""
    embedding_options = {
        "model": "models/gemini-embedding-2",
        "content": text_string,
    }
    if task_type:
        embedding_options["task_type"] = task_type
    result = genai.embed_content(**embedding_options)
    return result["embedding"]
