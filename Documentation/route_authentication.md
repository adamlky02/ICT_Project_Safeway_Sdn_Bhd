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

For a deployment smoke test, sign in, send a message, reopen/rename/delete your
own history, and open a source PDF. Repeat protected requests without a token
(expect 401) and with another test account's conversation ID (expect 404).
This smoke test requires an authorized test environment and is not simulated
by the automated suite.
