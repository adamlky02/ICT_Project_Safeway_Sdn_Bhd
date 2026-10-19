"""Authentication regression tests; no company database, storage or AI calls.

Run from the repository root: python -m unittest discover -s backend/tests -v
"""
import io
import os
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Do not load local credentials or construct a real cloud storage client.
with patch.dict(os.environ, {"DATABASE_URL": "sqlite://", "SECRET_KEY": "test-only-secret-not-for-deployment-12345", "GOOGLE_API_KEY": "test-only"}), patch('dotenv.load_dotenv'), patch('boto3.client'):
    from backend.general import auth, database, models, chat_history
    from backend.route import authentication, chat, documents


class ProtectedRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool,
                                    execution_options={'schema_translate_map': {'AI chatbot': None}})
        @event.listens_for(self.engine, 'connect')
        def functions(connection, _):
            connection.create_function('now', 0, lambda: datetime.now(timezone.utc).isoformat())
            connection.create_function('gen_random_uuid', 0, lambda: uuid4().hex)
        tables = [models.User.__table__, models.KnowledgeBase.__table__, chat_history.ChatSession.__table__, chat_history.ChatMessageRecord.__table__]
        database.Base.metadata.create_all(self.engine, tables=tables)
        self.db = sessionmaker(bind=self.engine, expire_on_commit=False)()
        self.a = models.User(id=uuid4(), email='a@example.test', password_hash='unused', role='staff', is_active=True)
        self.b = models.User(id=uuid4(), email='b@example.test', password_hash='unused', role='staff', is_active=True)
        self.admin = models.User(id=uuid4(), email='admin@example.test', password_hash='unused', role='admin', is_active=True)
        self.db.add_all([self.a, self.b, self.admin]); self.db.commit()
        self.session = chat_history.get_or_create_session(self.db, str(self.b.id), initial_title='Private B history')
        chat_history.save_chat_turn(self.db, self.session.id, 'Private question', 'Private answer', [])
        self.app = FastAPI()
        self.app.include_router(authentication.router)
        self.app.include_router(chat.router)
        self.app.include_router(documents.router)
        self.app.include_router(chat_history.chat_history_router)
        self.app.dependency_overrides[database.get_db] = lambda: self.db
        self.client = TestClient(self.app)
        self.storage = MagicMock()
        self.storage_patch = patch.object(documents, 's3_client', self.storage)
        self.storage_patch.start()

    def tearDown(self):
        self.client.close(); self.storage_patch.stop(); self.db.close(); self.engine.dispose()

    def headers(self, user=None):
        return {'Authorization': 'Bearer ' + auth.create_access_token(user or self.a)}

    def routes(self):
        sid = str(self.session.id)
        return [
            ('POST', '/api/chat', {'message': 'Hello'}),
            ('GET', '/api/chat-history/sessions', None),
            ('POST', '/api/chat-history/sessions', {}),
            ('GET', f'/api/chat-history/sessions/{sid}', None),
            ('PATCH', f'/api/chat-history/sessions/{sid}/title', {'title': 'Changed'}),
            ('DELETE', f'/api/chat-history/sessions/{sid}', None),
            ('GET', '/api/files/manual.pdf', None),
            ('GET', '/api/admin/documents/42/download', None),
        ]

    def test_all_routes_reject_missing_invalid_expired_and_wrong_scope_tokens(self):
        invalid_tokens = [None, 'malformed', auth.create_access_token(self.a) + 'x', auth._create_signed_token({'sub': str(self.a.id), 'scope': 'access', 'exp': int(time.time())-1}),
                          auth.create_developer_mode_token(self.a)[0],
                          auth._create_signed_token({'sub': 'not-a-uuid', 'scope': 'access', 'exp': int(time.time())+60})]
        with patch.object(chat, 'get_embedding') as embed:
            for token in invalid_tokens:
                for method, url, body in self.routes():
                    with self.subTest(token_kind=str(token)[:8], route=url, method=method):
                        response = self.client.request(method, url, json=body, headers={} if token is None else {'Authorization': 'Bearer '+token})
                        self.assertEqual(response.status_code, 401, response.text)
            embed.assert_not_called()
        self.storage.get_object.assert_not_called()

    def test_inactive_and_deleted_accounts_are_rejected(self):
        headers = self.headers()
        self.a.is_active = False; self.db.commit()
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 401)
        self.db.delete(self.a); self.db.commit()
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 401)

    def test_history_identity_cannot_be_spoofed(self):
        response = self.client.get(f'/api/chat-history/sessions?user_id={self.b.id}', headers=self.headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        response = self.client.post('/api/chat-history/sessions', json={'user_id': str(self.b.id), 'title': 'A session'}, headers=self.headers())
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()['user_id'], str(self.a.id))

    def test_other_users_cannot_read_rename_delete_or_append(self):
        url = f'/api/chat-history/sessions/{self.session.id}?user_id={self.b.id}'
        self.assertEqual(self.client.get(url, headers=self.headers()).status_code, 404)
        self.assertEqual(self.client.patch(f'/api/chat-history/sessions/{self.session.id}/title?user_id={self.b.id}', json={'title': 'Attack'}, headers=self.headers()).status_code, 404)
        self.assertEqual(self.client.delete(url, headers=self.headers()).status_code, 404)
        with patch.object(chat, 'get_embedding') as embed:
            response = self.client.post('/api/chat', json={'message': 'Attack', 'user_id': str(self.b.id), 'session_id': str(self.session.id)}, headers=self.headers())
            self.assertEqual(response.status_code, 404, response.text)
            embed.assert_not_called()
        self.assertEqual(self.session.title, 'Private B history')
        self.assertEqual(self.db.query(chat_history.ChatSession).count(), 1)
        self.assertEqual(self.db.query(chat_history.ChatMessageRecord).count(), 2)

    def test_owner_can_read_rename_and_delete_history(self):
        url = f'/api/chat-history/sessions/{self.session.id}'
        response = self.client.get(url, headers=self.headers(self.b))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['messages'][0]['content'], 'Private question')
        self.assertEqual(self.client.patch(url+'/title', json={'title':'Renamed'}, headers=self.headers(self.b)).status_code, 200)
        self.assertEqual(self.client.delete(url, headers=self.headers(self.b)).status_code, 200)
        self.assertEqual(self.db.query(chat_history.ChatMessageRecord).count(), 0)

    def test_invalid_unknown_and_archived_chat_sessions_fail_before_ai(self):
        self.session.is_archived = True
        self.db.commit()
        with patch.object(chat, 'get_embedding') as embed:
            for sid, expected in [('invalid', 400), (str(uuid4()), 404), (str(self.session.id), 404)]:
                response = self.client.post('/api/chat', json={'message': 'Hello', 'session_id': sid}, headers=self.headers(self.b))
                self.assertEqual(response.status_code, expected, response.text)
            embed.assert_not_called()

    def test_authenticated_chat_uses_verified_identity(self):
        fake_db = MagicMock()
        fake_db.query.return_value.filter.return_value.first.return_value = self.a
        fake_db.execute.return_value.fetchall.return_value = []
        self.app.dependency_overrides[database.get_db] = lambda: fake_db
        with patch.object(chat, 'get_or_create_session', return_value=SimpleNamespace(id=uuid4())) as resolve, patch.object(chat, 'save_chat_turn'), patch.object(chat, 'get_embedding', return_value=[0.1]):
            response = self.client.post('/api/chat', json={'message':'Hello', 'user_id':str(self.b.id)}, headers=self.headers())
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(resolve.call_args.args[1], str(self.a.id))

    def test_authenticated_registered_document_download(self):
        self.db.add(models.KnowledgeBase(title='Manual', category='General', file_path='manual.pdf', file_type='pdf', uploaded_by=self.a.id)); self.db.commit()
        self.storage.get_object.return_value = {'Body': io.BytesIO(b'%PDF-test')}
        response = self.client.get('/api/files/manual.pdf', headers=self.headers())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.content, b'%PDF-test')
        self.assertEqual(response.headers['cache-control'], 'private, no-store')

    def test_admin_document_download_reads_r2_and_restricts_access(self):
        admin = self.admin
        developer = models.User(id=uuid4(), email='dev@example.test', password_hash='unused', role='developer', is_active=True)
        self.db.add(developer)
        self.db.add(models.KnowledgeBase(id=42, title='Safety Manual', category='Safety', file_path='stored-key.pdf', file_type='pdf', uploaded_by=admin.id))
        self.db.commit()
        url = '/api/admin/documents/42/download'

        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.get(url, headers=self.headers()).status_code, 403)
        self.assertEqual(self.client.get('/api/admin/documents/999/download', headers=self.headers(admin)).status_code, 404)
        self.storage.get_object.assert_not_called()

        for user in [admin, developer]:
            body = io.BytesIO(b'%PDF-original')
            self.storage.get_object.return_value = {'Body': body}
            response = self.client.get(url, headers=self.headers(user))
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.content, b'%PDF-original')
            self.assertEqual(response.headers['content-type'], 'application/pdf')
            self.assertEqual(response.headers['cache-control'], 'private, no-store')
            self.assertIn('attachment;', response.headers['content-disposition'])
            self.assertIn('Safety%20Manual.pdf', response.headers['content-disposition'])
            self.assertTrue(body.closed)
        self.storage.get_object.assert_called_with(Bucket=documents.R2_BUCKET, Key='stored-key.pdf')

    def test_admin_document_download_reports_missing_or_unavailable_r2_object(self):
        admin = self.admin
        self.db.add(models.KnowledgeBase(id=42, title='Manual', category='General', file_path='stored-key.txt', file_type='txt', uploaded_by=admin.id))
        self.db.commit()
        url = '/api/admin/documents/42/download'
        self.storage.get_object.side_effect = ClientError({'Error': {'Code': 'NoSuchKey', 'Message': 'Missing'}}, 'GetObject')
        self.assertEqual(self.client.get(url, headers=self.headers(admin)).status_code, 404)
        self.storage.get_object.side_effect = RuntimeError('Cloud unavailable')
        response = self.client.get(url, headers=self.headers(admin))
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('Cloud unavailable', response.text)

    def test_unknown_and_unsafe_files_never_reach_storage(self):
        for name in ['unknown.pdf', '..%5Csecret.txt']:
            response = self.client.get('/api/files/'+name, headers=self.headers())
            self.assertEqual(response.status_code, 404, response.text)
        self.storage.get_object.assert_not_called()

    def test_local_fallback_still_requires_authentication(self):
        self.db.add(models.KnowledgeBase(title='Text', category='General', file_path='note.txt', file_type='txt', uploaded_by=self.a.id)); self.db.commit()
        self.storage.get_object.side_effect = RuntimeError('Storage unavailable')
        with tempfile.TemporaryDirectory() as directory, patch.object(documents, 'UPLOAD_DIR', directory):
            Path(directory, 'note.txt').write_text('Internal note')
            self.assertEqual(self.client.get('/api/files/note.txt').status_code, 401)
            response = self.client.get('/api/files/note.txt', headers=self.headers())
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.text, 'Internal note')
            self.assertIn('text/plain', response.headers['content-type'])

    def prepare_login_accounts(self):
        developer = models.User(id=uuid4(), email='dev@example.test', role='developer', is_active=True)
        password_hash = authentication.bcrypt.hashpw(b'correct-password', authentication.bcrypt.gensalt(rounds=4)).decode('utf-8')
        for user in (self.a, self.admin, developer):
            user.password_hash = password_hash
        self.db.add(developer)
        self.db.commit()
        return developer

    def test_password_login_issues_usable_access_for_every_role_and_portal(self):
        developer = self.prepare_login_accounts()
        cases = [(self.a, 'staff', 'staff'), (self.admin, 'admin', 'admin'),
                 (self.admin, 'staff', 'staff'), (developer, 'admin', 'developer'),
                 (developer, 'staff', 'staff')]
        for user, portal, response_role in cases:
            with self.subTest(account_role=user.role, portal=portal):
                response = self.client.post('/api/login', json={
                    'email': user.email, 'password': 'correct-password', 'role': portal,
                })
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(set(result), {'id', 'email', 'role', 'name', 'access_token'})
                self.assertEqual(result['id'], str(user.id))
                self.assertEqual(result['role'], response_role)
                payload = auth._verify_signed_token(result['access_token'], 'Invalid token')
                self.assertEqual(payload['scope'], 'access')
                self.assertEqual(payload['role'], user.role)
                headers = {'Authorization': 'Bearer ' + result['access_token']}
                self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 200)

    def test_login_still_rejects_bad_credentials_inactive_accounts_and_wrong_portals(self):
        developer = self.prepare_login_accounts()
        cases = [(self.a.email, 'wrong-password', 'staff', 401),
                 (self.admin.email, 'wrong-password', 'admin', 401),
                 (developer.email, 'wrong-password', 'admin', 401),
                 ('unknown@example.test', 'correct-password', 'staff', 401),
                 (self.a.email, 'correct-password', 'admin', 403),
                 (developer.email, 'correct-password', 'developer', 400),
                 (self.admin.email, 'correct-password', 'unknown', 400)]
        for email, password, portal, expected in cases:
            with self.subTest(email=email, portal=portal, expected=expected):
                response = self.client.post('/api/login', json={'email': email, 'password': password, 'role': portal})
                self.assertEqual(response.status_code, expected, response.text)
                self.assertNotIn('access_token', response.json())
        for user, portal in ((self.a, 'staff'), (self.admin, 'admin'), (developer, 'admin')):
            user.is_active = False
            self.db.commit()
            response = self.client.post('/api/login', json={'email': user.email, 'password': 'correct-password', 'role': portal})
            self.assertEqual(response.status_code, 401, response.text)

    def test_previously_enrolled_and_locked_accounts_can_sign_in_with_password(self):
        developer = self.prepare_login_accounts()
        # Emulate an existing database before the optional column cleanup.
        for column in ('totp_secret TEXT', 'totp_enabled BOOLEAN DEFAULT FALSE',
                       'totp_last_counter INTEGER', 'totp_failed_attempts INTEGER DEFAULT 0',
                       'totp_lock_until INTEGER'):
            self.db.execute(text('ALTER TABLE "User_list" ADD COLUMN ' + column))
        self.db.execute(text('UPDATE "User_list" SET totp_secret = :secret, totp_enabled = TRUE, '
                             'totp_failed_attempts = 5, totp_lock_until = :lock_until'),
                        {'secret': 'unreadable-legacy-enrollment', 'lock_until': int(time.time()) + 900})
        self.db.commit()
        for user in (self.admin, developer):
            for portal in ('admin', 'staff'):
                with self.subTest(account_role=user.role, portal=portal):
                    response = self.client.post('/api/login', json={'email': user.email, 'password': 'correct-password', 'role': portal})
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertIn('access_token', response.json())

    def test_removed_authenticator_endpoint_and_old_challenges_cannot_issue_access(self):
        response = self.client.post('/api/login/mfa', json={'mfa_token': 'obsolete', 'code': '123456'})
        self.assertEqual(response.status_code, 404, response.text)
        for scope in ('mfa_setup', 'mfa_login'):
            token = auth._create_signed_token({'sub': str(self.admin.id), 'scope': scope, 'exp': int(time.time()) + 300})
            response = self.client.get('/api/chat-history/sessions', headers={'Authorization': 'Bearer ' + token})
            self.assertEqual(response.status_code, 401, response.text)

    def test_production_requires_stable_signing_key_without_authenticator_configuration(self):
        with patch.dict(os.environ, {'APP_ENV': 'production', 'MFA_ENCRYPTION_KEY': '', 'MFA_ENCRYPTION_PREVIOUS_KEYS': ''}):
            for key in ('', 'short'):
                with self.subTest(key=key), patch.object(auth, '_configured_secret', key):
                    with self.assertRaisesRegex(RuntimeError, 'SECRET_KEY'):
                        auth.validate_auth_configuration()
            with patch.object(auth, '_configured_secret', 'test-only-stable-signing-key-1234567890'):
                auth.validate_auth_configuration()


if __name__ == '__main__':
    unittest.main()
