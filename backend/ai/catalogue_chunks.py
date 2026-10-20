"""Basic text chunking used by the existing document upload route."""


def build_index_chunks(text: str) -> list[str]:
    return [text[start:start + 1000] for start in range(0, len(text), 1000)]
