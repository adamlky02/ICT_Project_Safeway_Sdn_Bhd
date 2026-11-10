"""Run from the repository root: python -m backend.ai.reindex [--apply] [--document-id N]."""

import argparse
import sys

from sqlalchemy import text


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Plan or apply retrieval-v2 indexing. No writes or cloud calls without --apply.")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--document-id", type=int)
    parser.add_argument("--force", action="store_true", help="Rebuild documents already fully on the current index version")
    args = parser.parse_args(argv)
    from ..general import database, models
    from .embeddings import EMBEDDING_VERSION
    from .indexing import MAX_DOCUMENT_BYTES, prepare_document_index, replace_document_index

    with database.SessionLocal() as db:
        # Fail before any embedding requests when migration is missing.
        db.execute(text('SELECT embedding_version FROM "AI chatbot".document_chunks LIMIT 0'))
        query = db.query(models.KnowledgeBase)
        if args.document_id is not None:
            query = query.filter(models.KnowledgeBase.id == args.document_id)
        docs = query.order_by(models.KnowledgeBase.id).all()
        if args.document_id is not None and not docs:
            print("Document not found.", file=sys.stderr)
            return 1
        failures = 0
        for doc in docs:
            doc_id, title, key = doc.id, doc.title, doc.file_path
            extension = doc.file_type or key.rsplit(".", 1)[-1].lower()
            state = db.execute(text('''SELECT count(*), count(*) FILTER (WHERE embedding_version = :version)
                FROM "AI chatbot".document_chunks WHERE doc_id = :doc_id'''), {"doc_id": doc_id, "version": EMBEDDING_VERSION}).one()
            if not args.force and state[0] > 0 and state[0] == state[1]:
                print(f"Document {doc_id}: current; skipped.")
                continue
            print(f"Document {doc_id}: {'reindexing' if args.apply else 'would reindex'} {state[0]} existing chunks.")
            if not args.apply:
                continue
            # Release the read transaction while remote extraction/embedding is in progress.
            db.rollback()
            try:
                from ..route.documents import s3_client, R2_BUCKET
                body = s3_client.get_object(Bucket=R2_BUCKET, Key=key)["Body"]
                try:
                    file_bytes = body.read(MAX_DOCUMENT_BYTES + 1)
                finally:
                    body.close()
                prepared = prepare_document_index(file_bytes, extension, title)
                replace_document_index(db, doc_id, prepared)
                db.commit()
                print(f"Document {doc_id}: committed {len(prepared)} chunks.")
            except Exception as exc:
                db.rollback()
                # Provider/DB errors can echo credentials and document content.
                print(f"Document {doc_id}: failed ({type(exc).__name__}); previous index retained.", file=sys.stderr)
                failures += 1
        return int(failures > 0)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Reindex could not start ({type(exc).__name__}). Check database configuration and apply the retrieval-v2 migration.", file=sys.stderr)
        raise SystemExit(1) from None
