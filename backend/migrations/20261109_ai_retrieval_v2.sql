-- Apply before deploying retrieval-v2, then run the reindex command before switching traffic.
-- Existing vectors remain marked legacy until each document is atomically reindexed.
BEGIN;
ALTER TABLE "AI chatbot".document_chunks
    ADD COLUMN IF NOT EXISTS embedding_version text NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS document_chunks_embedding_version_idx
    ON "AI chatbot".document_chunks (embedding_version);
CREATE INDEX IF NOT EXISTS document_chunks_full_text_idx
    ON "AI chatbot".document_chunks USING gin (to_tsvector('simple', content));
COMMIT;
