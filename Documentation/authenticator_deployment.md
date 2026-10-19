# Authenticator deployment for Render Hobby and Neon

The implementation supports optional authenticator-app MFA for every role,
profile enrollment/disable controls, lost-device requests, and admin/developer
approval or rejection. Administrator/developer accounts start password-only
and display a security reminder. The six previously created Neon accounts are
not modified or automatically enrolled by this feature.

## Recommended: frontend and API on the same Render origin

Build the React frontend and serve it through FastAPI on one Render web service.
The backend automatically serves `frontend/dist` if that build exists. This
avoids third-party-cookie restrictions between independently hosted sites.

From the repository root, the Render build command is:

```sh
python -m pip install -r backend/requirements.txt && npm --prefix frontend ci && npm --prefix frontend run build
```

The start command is:

```sh
uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
```

Use a supported Python 3.12 backend environment and Node 24.12 or a compatible
version for the existing Vite 8 toolchain. Leave `VITE_API_URL` unset/empty for
the same-origin production build. Development still defaults to localhost:8000.
Frontend URLs such as `/login`, `/profile`, and `/admin` resolve to the SPA;
unknown `/api/` routes remain 404 and never return the frontend document.

## Configure the Render backend dashboard, not Git

| Setting | Value/purpose |
| --- | --- |
| `DATABASE_URL` | Existing Neon connection URL, including TLS parameters. |
| `APP_ENV` | `production` |
| `SECRET_KEY` | Preserve the existing stable secret used by Developer Mode and possibly AI-key encryption. |
| `MFA_ENCRYPTION_KEY` | A separate cryptographically random value of at least 32 characters. |
| `SESSION_COOKIE_SECURE` | `true` |
| `SESSION_COOKIE_SAMESITE` | `lax` for the recommended same-origin deployment. |
| `ALLOWED_ORIGINS` | The exact public HTTPS site origin, with no trailing slash or wildcard. |

Generate the MFA key once using a secure password manager or a cryptographic
random generator. For example, in a private terminal:

```sh
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Copy the generated value into the Render backend environment settings and
store a secure backup. Never put it in source code, `VITE_*`, a frontend build,
a committed `.env` file, or public deployment logs. Preserve the same value
across restarts, redeployments, and every instance sharing the Neon database.
No local `.env` upload is required for Render. `.env.example` has placeholders
only; it is not a source of production secrets.

Changing or losing the key prevents decryption of existing authenticator
secrets. Recover the original key or use the reviewed recovery workflow to
replace affected factors. There is no automatic replacement, AI-key fallback,
or password-only downgrade. Key rotation is an operational migration, not a
routine environment edit. Keep Neon backups and the corresponding key backup.

Render Hobby still requires runtime credentials. This implementation removes
the need to commit secret files, but does not claim to eliminate cloud secrets
or guarantee availability during Render, Neon, or network outages.



## Additive Neon schema and rollout

Startup creates five new tables in the existing `AI chatbot` schema:
`authenticators`, `safeway_auth_sessions`, `mfa_reset_requests`, `auth_rate_limits`, and
`security_events`. No existing account, password, document, or chat data is
removed. New/unenrolled accounts remain password-only. The dedicated
`safeway_auth_sessions` table deliberately leaves any pre-existing
`auth_sessions` table and its older schema unchanged.

For a controlled migration before starting the new application, execute
`backend/migrations/20261019_optional_mfa.sql` using trusted Neon/database access.
The script is idempotent and only creates the new tables/indexes. Startup's
SQLAlchemy `create_all` can also create them. Do not run legacy MFA cleanup
scripts as a prerequisite for this release; old `User_list.totp_*` columns are
ignored by the new separate authenticator model.

Deploy the backend/frontend as one coordinated release. Drain older backend
instances so their former signed-token login routes cannot continue serving
requests. Existing browser sessions must sign in again after the upgrade.
If rolling back, keep the new tables; do not drop enrollment/recovery data.
Older password-only releases do not enforce these enrollments, so restoring
an old release needs an explicit access-control decision or maintenance mode.

## User and reviewer behaviour

- Enable: current password, local QR/manual key, six-digit confirmation, then
  download/save the ten one-use recovery codes.
- Disable: current password and a fresh authenticator/recovery code. Other
  sessions are revoked; the current browser receives a replacement session.
- Lost phone: after password verification, request a reset from the MFA login
  screen. A request grants no chat, document, profile, or management access.
- Review: another administrator/developer checks identity, enters their own
  password and factor if enrolled, and records an approval/rejection note.
- Approval revokes the subject's sessions, old QR secret, and recovery codes.
  Refresh leads back to password login and mandatory new-QR confirmation.
- Rejection preserves the current authenticator. The decision is visible in
  the profile and subsequent MFA login screens. Click Refresh status or return
  to password login to check an approval; no email notifications are sent.

Use a fresh code after a successful verification because the same TOTP interval
cannot be reused. Five incorrect factor attempts cause a 15-minute cooldown.
Password and sensitive-action requests also have shared database rate limits.
No reviewer can approve their own reset; maintain multiple recovery-capable
management accounts and secure their access.

## Deployment smoke test

Use dedicated test accounts on the intended deployment:

1. Sign in as unenrolled staff and management; verify optional settings/reminder.
2. Enable MFA, save recovery codes, sign out, and verify code-based login.
3. Verify a consumed code/recovery code cannot be reused.
4. Request a reset from both Profile and the lost-device login screen.
5. Reject a request and verify the original factor still works.
6. Approve a fresh request from a different management account; verify all old
   sessions fail and password login requires a new QR registration.
7. Restart/redeploy and repeat login; enrollment and pending requests persist.
8. Verify chat history, document viewing/download, and role restrictions.

Local validation uses isolated data; it does not deploy to Render, change the
production environment, or enroll the existing Neon accounts.
