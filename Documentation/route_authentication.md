# Chat, history and document authentication

All `/api/chat`, `/api/chat-history/*` and `/api/files/{filename}` requests require
`Authorization: Bearer <access_token>` from the existing login endpoint. Invalid,
expired, wrong-scope tokens and inactive/deleted accounts return HTTP 401.

## Client contract

- Each conversation's **Actions** menu provides **Download TXT**, **Rename**,
  and **Delete**. Choose **Select conversations** to use checkboxes, **Select all**,
  or **Deselect all**, then use the selection's **Actions** menu for bulk download
  or deletion. Select all follows the current search; changing the search clears
  the selection. Deletion requires confirmation.
- TXT downloads contain the complete saved conversation, including its title, message
  timestamps, questions, answers, and source titles. UTF-8 with a BOM preserves
  Chinese and Malay text in Windows editors. Unsaved messages and source
  documents are excluded.
- `GET /api/chat-history/sessions/{session_id}/export` returns a private,
  non-cacheable `.txt` attachment. It uses the existing login session and only
  permits the conversation's owner, including for administrator accounts.
  Invalid IDs return 400; unknown or foreign conversations return 404.
- `POST /api/chat-history/sessions/export` and `POST /api/chat-history/sessions/delete`
  accept `{ "session_ids": ["uuid", "uuid"] }`. Every conversation must belong to
  the signed-in user. Exports combine the selected histories into one TXT file;
  deletion removes the complete selection in one transaction. A missing or
  foreign conversation rejects the entire request with 404, and an empty or
  invalid selection returns 422. Duplicate IDs are handled once.
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

## Login and optional authenticator protection

All roles start with MFA disabled. Management accounts receive an enable-MFA
reminder, including when entering the staff portal. MFA is enforced on every
login once an account enrolls. QR enrollment requires the current password and
a valid six-digit authenticator code; merely scanning a QR does not enable MFA.

`POST /api/login` returns either an authenticated identity or a restricted
five-minute `mfa_login`/`setup` challenge. Restricted tokens cannot access chat,
history, files, profiles, or administration. Factor verification uses PyOTP
(RFC 6238), a 30-second interval, at most one adjacent interval of tolerance,
database-locked replay counters, a five-failure/15-minute cooldown, and shared
request limits. Recovery codes are random, hashed, shown once, and single-use.

Browser sessions use an HttpOnly cookie and a database-persisted opaque token
hash. Browser local storage contains identity metadata and a non-credential
`cookie` marker. API clients can use the returned opaque bearer token instead.
Signed tokens from older releases are no longer accepted as access sessions.
Role and account status are always read from the database. Cookie mutations
require `X-Safeway-Request: 1` and an approved Origin; CORS allows credentials
only for the configured frontend origins. Logout, credential changes, and MFA
changes invalidate server sessions. Developer Mode unlock tokens are also bound
to the account's credential fingerprint and authenticator generation.

## Authenticator routes

| Route | Access and purpose |
| --- | --- |
| `GET /api/mfa/status` | Own enrollment metadata and most recent request. |
| `POST /api/mfa/enroll` | Signed-in user plus current password; begin pending setup. |
| `POST /api/mfa/enroll/confirm` | Current setup token plus TOTP; activate MFA and return recovery codes once. |
| `POST /api/login/mfa/verify` | Current login challenge plus TOTP/recovery code; issue full session. |
| `POST /api/mfa/disable` | Current session, password, and existing factor; disable intentionally. |
| `POST /api/mfa/reset-requests` | Own current session and password; request lost-device recovery. |
| `POST /api/login/mfa/reset-request` | Password-verified login challenge; request recovery without application access. |
| `GET /api/admin/authenticators` | Administrator/developer directory with enrollment and latest request metadata. |
| `POST /api/admin/authenticators/reset-requests/{id}/decision` | Another administrator/developer, current password, their own factor if enabled, and a review note. |
| `POST /api/logout` | Revoke the current access session and expire the cookie. |

Approval deletes the active authenticator and recovery codes, revokes all of
the subject's sessions/challenges, and requires replacement enrollment. The
next password login returns a new QR setup instead of access. Approval never
creates an unrestricted password-only recovery session. Rejection leaves the
existing factor and sessions active. Requests are idempotent while pending,
bound to the enrollment generation, and cannot be self-approved. Reviewers
must verify identity through the company's operational procedure. Both admin
and developer roles may review requests for every role. No email is sent by
this implementation; notifications and decision notes appear in the UI.

MFA records, sessions, request limits, review history, and audit events persist
in PostgreSQL and are shared by workers. No user secrets, passwords, recovery
codes, or tokens are logged or returned in the management directory.

## Render and Neon deployment

See [Authenticator deployment](authenticator_deployment.md) for the same-origin
Render build, environment settings, additive Neon schema, and smoke checks.
The dedicated MFA encryption key belongs in the Render backend dashboard. It
is never generated on startup and never falls back to an AI or session key.
An unavailable key blocks affected enrollment/verification operations with 503;
it does not silently disable MFA or prevent unenrolled accounts from logging in.

## Verification

From the repository root in an installed backend environment:

```sh
python -m pip install -r backend/requirements.txt -r backend/requirements-test.txt
python -m compileall -q backend
python -m unittest discover -s backend/tests -v
```

The suite uses SQLite and mocked storage/AI services, not company credentials
or Neon. It covers all account roles/portals, restricted challenge scopes,
enrollment, encrypted storage, QR expiry, replay and recovery-code rejection,
cooldown, lost-device requests, review permissions, self-approval rejection,
approval/rejection, forced replacement enrollment, session revocation, key loss,
CSRF, worker restarts, password changes, and existing per-user data boundaries.

Frontend checks: `npm run typecheck` and `npm run build` in `frontend/`.
