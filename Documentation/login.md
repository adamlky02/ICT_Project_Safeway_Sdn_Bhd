# Login file guide

Authentication code lives in `backend/login/` and `frontend/src/login/`.
The public API paths and login behaviour are unchanged by this organization.

## Backend

| File | Responsibility |
| --- | --- |
| `backend/login/auth.py` | Password verification, current-user resolution, role checks, cookie CSRF checks, and Developer Mode token validation. |
| `backend/login/mfa.py` | Encrypted authenticator secrets, TOTP/recovery verification, session/challenge lifecycle, request limits, audit events, enrollment, and recovery requests. |
| `backend/login/bootstrap.py` | Optional initial developer account setup. |
| `backend/login/email.py` | New staff account credential email. |
| `backend/login/routes/authentication.py` | Staff/admin password login, MFA/setup challenges, and logout. |
| `backend/login/routes/mfa.py` | Enrollment, factor verification, disabling MFA, lost-device requests, and administrator recovery decisions. |
| `backend/login/routes/developer.py` | Developer Mode password confirmation and temporary unlock. |
| `backend/login/routes/profile.py` | Own profile and password changes, including MFA confirmation and session revocation. |
| `backend/login/routes/users.py` | Account creation, credential/role changes, account deletion, and related session revocation. |

`backend/route/__init__.py` registers these routes with the other API routes.
Chat, history, document, analytics, and AI-settings endpoints import their
access-control dependencies from `backend.login.auth`.

Database configuration and shared tables remain in `backend/general/database.py`
and `backend/general/models.py`. SQL migrations remain in `backend/migrations/`;
the current additive MFA migration is `20261019_optional_mfa.sql`. The older
session/removal scripts are historical migrations, not current login procedures.

## Frontend

| File | Responsibility |
| --- | --- |
| `frontend/src/login/LoginPage.tsx` | Staff/admin portal selection, password login, MFA/setup challenge completion, and lost-device requests. |
| `frontend/src/login/session.ts` | Browser identity cache, authenticated cookie requests, session-expiry events, and logout. |
| `frontend/src/login/types.ts` | Login identities, portal roles, Developer Mode responses, and MFA contracts. |
| `frontend/src/login/components/LoginLoadingOverlay.tsx` | Login progress display. |
| `frontend/src/login/components/AuthenticatorForms.tsx` | Shared factor input, QR setup, security dialogs, and recovery-code receipt. |
| `frontend/src/login/components/AuthenticatorSettings.tsx` | Profile enrollment, disable, and recovery actions. |
| `frontend/src/login/components/MfaReminder.tsx` | Management-account enrollment reminder. |
| `frontend/src/login/components/AuthenticatorPanel.tsx` | Administrator authenticator directory and recovery review. |
| `frontend/src/login/components/DeveloperModeModal.tsx` | Developer Mode password-unlock dialog. |

`frontend/src/App.tsx` mounts the login page. Profile and administration pages
use the shared login components. Generic API settings and response/error
helpers remain in `frontend/src/api/client.ts`.

## Login procedures

1. Password login checks request limits, credentials, account status, and the
   requested staff/admin portal.
2. Unenrolled accounts receive a session. Enrolled accounts must complete an
   MFA challenge with a fresh TOTP or unused recovery code.
3. Enrollment requires password confirmation and a verified QR/manual-key code
   before MFA becomes active; recovery codes are shown once.
4. Lost-device requests require a verified password/session. Another authorized
   reviewer approves or rejects the request. Approval revokes old sessions and
   requires new authenticator enrollment before access.
5. Password, role, and MFA changes revoke affected sessions. Logout revokes the
   current session and expires its cookie. Developer Mode requires a separate,
   short-lived password unlock.

See [Authentication contract](route_authentication.md) for route details and
[Authenticator deployment](authenticator_deployment.md) for operational setup.

## Tests

`backend/tests/login/` contains `test_route_authentication.py` and
`test_mfa_lifecycle.py`, including the regression for login after idle rate-limit
buckets expire. The other five test files cover active AI-settings, provider,
embedding, chat-error, and document-chunking behaviour. No test files were found
to be obsolete or unrelated to this system; they remain in the system suite.

Run all backend tests from the repository root:

```sh
python -m unittest discover -s backend/tests -v
```

Run only login/MFA regressions, keeping package-aware discovery:

```sh
python -m unittest discover -s backend/tests/login -t backend/tests -v
```

Use isolated synthetic data; these tests do not use company services or accounts.
