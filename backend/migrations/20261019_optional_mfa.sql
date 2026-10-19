-- Additive optional MFA schema; apply with the coordinated application release.
-- Existing accounts, credentials, documents, conversations, and legacy auth_sessions are preserved.
BEGIN;

CREATE TABLE IF NOT EXISTS "AI chatbot".authenticators (
	user_id UUID NOT NULL,
	enabled BOOLEAN DEFAULT false NOT NULL,
	requires_enrollment BOOLEAN DEFAULT false NOT NULL,
	secret TEXT,
	pending_secret TEXT,
	pending_expires BIGINT,
	generation INTEGER DEFAULT 0 NOT NULL,
	last_counter BIGINT,
	failures INTEGER DEFAULT 0 NOT NULL,
	lock_until BIGINT,
	recovery_hashes JSON NOT NULL,
	enrolled_at BIGINT,
	reset_sequence INTEGER DEFAULT 0 NOT NULL,
	PRIMARY KEY (user_id),
	FOREIGN KEY(user_id) REFERENCES "AI chatbot"."User_list" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AI chatbot".safeway_auth_sessions (
	token_hash VARCHAR(64) NOT NULL,
	user_id UUID NOT NULL,
	purpose VARCHAR(20) NOT NULL,
	portal_role VARCHAR(20) NOT NULL,
	generation INTEGER NOT NULL,
	expires_at BIGINT NOT NULL,
	binding VARCHAR(64),
	mfa_verified BOOLEAN NOT NULL,
	PRIMARY KEY (token_hash),
	FOREIGN KEY(user_id) REFERENCES "AI chatbot"."User_list" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_AI chatbot_safeway_auth_sessions_expires_at" ON "AI chatbot".safeway_auth_sessions (expires_at);

CREATE INDEX IF NOT EXISTS "ix_AI chatbot_safeway_auth_sessions_user_id" ON "AI chatbot".safeway_auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS "AI chatbot".mfa_reset_requests (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	status VARCHAR(20) NOT NULL,
	reason TEXT NOT NULL,
	request_number INTEGER NOT NULL,
	generation INTEGER NOT NULL,
	created_at BIGINT NOT NULL,
	reviewed_at BIGINT,
	reviewer_id UUID,
	review_note TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES "AI chatbot"."User_list" (id) ON DELETE CASCADE,
	FOREIGN KEY(reviewer_id) REFERENCES "AI chatbot"."User_list" (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_AI chatbot_mfa_reset_requests_user_id" ON "AI chatbot".mfa_reset_requests (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_mfa_reset_per_user ON "AI chatbot".mfa_reset_requests (user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS "AI chatbot".auth_rate_limits (
	key VARCHAR(64) NOT NULL,
	count INTEGER NOT NULL,
	window_start BIGINT NOT NULL,
	PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS "ix_AI chatbot_auth_rate_limits_window_start" ON "AI chatbot".auth_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS "AI chatbot".security_events (
	id UUID NOT NULL,
	event VARCHAR(50) NOT NULL,
	subject_id UUID NOT NULL,
	actor_id UUID NOT NULL,
	occurred_at BIGINT NOT NULL,
	details JSON NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS "ix_AI chatbot_security_events_subject_id" ON "AI chatbot".security_events (subject_id);

COMMIT;
