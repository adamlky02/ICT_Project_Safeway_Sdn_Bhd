-- Additive PostgreSQL migration: apply before deploying revocable login sessions.
-- Also created by the application's existing create_all startup mechanism.
BEGIN;
CREATE TABLE IF NOT EXISTS "AI chatbot".auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES "AI chatbot"."User_list"(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id
    ON "AI chatbot".auth_sessions (user_id);
COMMIT;
