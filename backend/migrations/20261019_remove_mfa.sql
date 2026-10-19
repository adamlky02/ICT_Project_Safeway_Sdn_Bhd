-- Run only after every backend instance uses the password-only login release.
-- Permanently deletes obsolete enrollment data; account passwords are preserved.
BEGIN;
ALTER TABLE "AI chatbot"."User_list"
    DROP COLUMN IF EXISTS totp_secret,
    DROP COLUMN IF EXISTS totp_enabled,
    DROP COLUMN IF EXISTS totp_last_counter,
    DROP COLUMN IF EXISTS totp_failed_attempts,
    DROP COLUMN IF EXISTS totp_lock_until;
COMMIT;
