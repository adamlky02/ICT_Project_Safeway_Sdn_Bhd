# Chat, history and document authentication

All `/api/chat`, `/api/chat-history/*` and `/api/files/{filename}` requests require
`Authorization: Bearer <access_token>` from the existing login endpoint. Invalid,
expired, wrong-scope tokens and inactive/deleted accounts return HTTP 401.

## Revocable login sessions

- Each successful `POST /api/login` creates a separate `auth_sessions` record.
  The signed access token contains its session ID (`sid`); raw tokens are not
  stored in the database. The authentication session ID is separate from chat's
  conversation `session_id`.
- Every protected request checks the signature, token expiry, persisted session
  ownership, session expiry and revocation, and the active user account.
- `POST /api/logout`, with the current bearer token and no body, revokes that
  login only. It returns 200 after the transaction commits. Subsequent requests
  using the same token return 401, including repeated logout requests. Other
  device logins remain valid. Already-running requests are not cancelled.
- Changing a password through the profile or administrator account update
  revokes all of that account's sessions. Profile password changes return
  `requires_login: true`; the profile screen returns to login. Name-only profile
  changes preserve the current session.
- Developer Mode unlock tokens are bound to the login session and cannot be
  carried into a new login after logout.
- Chat, admin and profile logout buttons await server confirmation. A 401 means
  the token is already unusable and local credentials can be removed. Network
  errors, a 10-second timeout or server failures preserve credentials and show
  a retry message, rather than falsely reporting successful revocation.
  Language and theme preferences are preserved.

### Deployment

The additive schema is in `backend/migrations/001_auth_sessions.sql`. Apply it
to PostgreSQL before deploying if the runtime account cannot create tables.
The existing application startup `Base.metadata.create_all` also creates this
new table when it has permission. No existing user or conversation columns are
changed. No company database migration has been run as part of this change.

Deploy backend and frontend together and restart the backend. Existing tokens
without `sid` intentionally return 401; users must sign in again. Keep
`SECRET_KEY` consistent across workers. `ACCESS_TOKEN_TTL_SECONDS` defaults to
43200 (12 hours). Expired/revoked records can be removed later by maintenance;
missing session records are rejected. There is no automatic cleanup job yet.
Do not downgrade to the previous stateless authentication implementation:
that implementation would not enforce the revocation records.

### Manual demonstration

1. Log in and save the access token privately. Use it to call
   `GET /api/chat-history/sessions`; expect 200.
2. Click Logout in the website, or call `POST /api/logout` with that token;
   expect 200.
3. Reuse the saved token for history, chat or a registered document download;
   expect 401 before storage or AI is called.
4. Log in again; the new token works. A separately established login on another
   device remains valid after step 2.
5. In a test environment, disconnect the backend and click Logout; verify the
   retry message. Reconnect and retry; logout should succeed.

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
CI runs the suite after installing the locked backend dependencies.
It also checks login/logout, persisted revocation, separate simultaneous
logins, legacy tokens, session expiry, password-change revocation and
Developer Mode session binding. Storage and AI remain mocked.

For a deployment smoke test, sign in, send a message, reopen/rename/delete your
own history, and open a source PDF. Repeat protected requests without a token
(expect 401) and with another test account's conversation ID (expect 404).
This smoke test requires an authorized test environment and is not simulated
by the automated suite.
