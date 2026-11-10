"""Shared extraction and atomic indexing used by uploads and the resumable reindex command."""

import fitz
from sqlalchemy import text

from .catalogue_chunks import PAGE_HEADER, PRODUCT_HEADER, build_index_chunks
from .embeddings import EMBEDDING_VERSION, get_embedding

MAX_DOCUMENT_BYTES = 25 * 1024 * 1024


def extract_document_text(file_bytes: bytes, extension: str) -> str:
    if len(file_bytes) > MAX_DOCUMENT_BYTES:
        raise ValueError("Documents must be at most 25 MB.")
    if extension == "pdf":
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            pages = [page.get_text() for page in document]
        raw_text = "\n".join(pages)
        if PRODUCT_HEADER.search(raw_text) and PAGE_HEADER.search(raw_text):
            return raw_text  # AI-ready catalogues already carry their original product/page labels.
        return "\n".join(f"--- PAGE {index + 1} ---\n{content}" for index, content in enumerate(pages))
    if extension == "txt":
        return file_bytes.decode("utf-8-sig")
    raise ValueError("Only PDF and TXT are supported for indexing.")


def prepare_document_index(file_bytes: bytes, extension: str, title: str) -> list[dict]:
    chunks = list(dict.fromkeys(chunk for chunk in build_index_chunks(extract_document_text(file_bytes, extension)) if len(chunk.strip()) > 20))
    if not chunks:
        raise ValueError("No searchable text was found. Scanned PDFs need OCR before upload.")
    # Finish every external request before touching the current document index.
    return [{"content": chunk, "embedding": str(get_embedding(chunk, title=title)), "version": EMBEDDING_VERSION} for chunk in chunks]


def replace_document_index(db, doc_id: int, prepared: list[dict]) -> None:
    if not prepared:
        raise ValueError("Cannot replace an index with no passages")
    # Serializes replacement against concurrent reindexing/deletion; caller owns commit/rollback.
    exists = db.execute(text('SELECT id FROM "AI chatbot".knowledge_base WHERE id = :doc_id FOR UPDATE'), {"doc_id": doc_id}).first()
    if not exists:
        raise ValueError("Document no longer exists")
    db.execute(text('DELETE FROM "AI chatbot".document_chunks WHERE doc_id = :doc_id'), {"doc_id": doc_id})
    db.execute(text('''
        INSERT INTO "AI chatbot".document_chunks (doc_id, content, embedding, embedding_version)
        VALUES (:doc_id, :content, CAST(:embedding AS vector), :version)
    '''), [{"doc_id": doc_id, **chunk} for chunk in prepared])
