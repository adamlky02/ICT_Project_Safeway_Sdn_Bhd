# Chat, history and document authentication

All `/api/chat`, `/api/chat-history/*` and `/api/files/{filename}` requests require
`Authorization: Bearer <access_token>` from the existing login endpoint. Invalid,
expired, wrong-scope tokens and inactive/deleted accounts return HTTP 401.

## Client contract

- Chat accepts `message`, optional `history` and optional `session_id`.
- History creation accepts an optional `title` in the JSON body.
- History list/detail/rename/delete use the signed-in account automatically.
- Legacy `user_id` values in request bodies or query strings are ignored; they
  cannot select another identity. The frontend no longer sends them.
- A foreign, unknown or archived chat session cannot be used to append a turn;
  it returns 404 before any embedding or generation call. Other users' history
  cannot be read, renamed or deleted, including by administrators.
- File requests require a registered knowledge-base record. Both cloud reads
  and local fallback require authentication; local paths must remain within the
  upload directory. Responses use `Cache-Control: private, no-store`.
- The PDF viewer sends the bearer token in HTTP headers, never in the URL.

The current data model treats indexed documents as shared with all active users.
Department-level or per-document permissions are not introduced by this change.
Direct cloud-object exposure must be controlled separately by the storage bucket
configuration; these changes protect the application's routes.

## Login and hosted backend configuration

All staff, administrator, and developer accounts sign in with their email and
password through `POST /api/login`. A successful login immediately returns the
account's portal identity and signed access token. Inactive accounts, incorrect
passwords, and unauthorized portal roles remain rejected. Management accounts
may enter the staff portal while retaining their stored permissions. Developer
Mode still requires a recent confirmation of the same account password.

Configure these backend settings in the hosting platform's environment or
managed secret store:

| Setting | Purpose |
| --- | --- |
| `APP_ENV=production` | Validate stable authentication settings at startup; Render is also detected automatically. |
| `SECRET_KEY` | A random, stable secret of at least 32 characters for signing login tokens. |
| `DATABASE_URL` | The shared database containing accounts and application data. |
| `ALLOWED_ORIGINS` | The deployed frontend's HTTPS origin(s). |

Use the same signing key on every backend worker and retain it across restarts
and redeployments. Keep backend secrets out of `VITE_*`, Git, and browser code.
The frontend's `VITE_API_URL` must point to the public HTTPS backend URL at build
time. AI configuration encryption remains separate and unchanged.

### Deploying the password-only login

Deploy the updated backend and rebuild/redeploy the frontend together. The
authenticator enrollment and verification endpoint has been removed. Previously
enrolled or locked accounts now use the same password-only login as other
accounts; saved authenticator state is no longer read or required. The backend
no longer requires `MFA_ENCRYPTION_KEY` or `MFA_ENCRYPTION_PREVIOUS_KEYS`; remove
those obsolete settings from the hosting environment.

After every backend instance has been updated, run
`backend/migrations/20261019_remove_mfa.sql` against the deployed PostgreSQL
database to permanently delete the old enrollment, replay, and lockout columns.
This idempotent cleanup is separate from application startup to avoid breaking
older instances during a rolling deployment. Take a database backup first if
you need to retain a rollback option. Fresh databases omit these columns.

## Verification

From the repository root in an installed backend environment:

```sh
python -m pip install -r backend/requirements-test.txt
python -m unittest discover -s backend/tests -v
```

The suite uses an in-memory SQLite database and mocked storage/AI services. It
does not load local environment credentials or call company services. It checks
missing/invalid/expired/wrong-scope tokens, disabled accounts, identity spoofing,
cross-user reads and mutations, owner access, and cloud/local file downloads.
Login regressions cover all account roles and portals, previously enrolled
accounts, credential failures, removed endpoints, and stable signing configuration.
CI runs the suite after installing the locked backend dependencies.

For a deployment smoke test, sign in, send a message, reopen/rename/delete your
own history, and open a source PDF. Repeat protected requests without a token
(expect 401) and with another test account's conversation ID (expect 404).
This smoke test requires an authorized test environment and is not simulated
by the automated suite.
