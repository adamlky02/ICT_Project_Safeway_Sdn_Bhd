"""Authentication regression tests; no company database, storage or AI calls.

Run from the repository root: python -m unittest discover -s backend/tests -v
"""
import io
import os
import tempfile
import time
import unittest
import bcrypt
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Do not load local credentials or construct a real cloud storage client.
with patch.dict(os.environ, {"DATABASE_URL": "sqlite://", "SECRET_KEY": "test-only-secret-not-for-deployment-12345", "GOOGLE_API_KEY": "test-only"}), patch('dotenv.load_dotenv'), patch('boto3.client'):
    from backend.general import auth, database, models, chat_history
    from backend.route import chat, documents, authentication, profile


class ProtectedRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool,
                                    execution_options={'schema_translate_map': {'AI chatbot': None}})
        @event.listens_for(self.engine, 'connect')
        def functions(connection, _):
            connection.create_function('now', 0, lambda: datetime.now(timezone.utc).isoformat())
            connection.create_function('gen_random_uuid', 0, lambda: uuid4().hex)
        tables = [models.User.__table__, models.AuthSession.__table__, models.KnowledgeBase.__table__, chat_history.ChatSession.__table__, chat_history.ChatMessageRecord.__table__]
        database.Base.metadata.create_all(self.engine, tables=tables)
        self.db = sessionmaker(bind=self.engine, expire_on_commit=False)()
        self.a = models.User(id=uuid4(), email='a@example.test', password_hash='unused', role='staff', is_active=True)
        self.b = models.User(id=uuid4(), email='b@example.test', password_hash='unused', role='staff', is_active=True)
        self.db.add_all([self.a, self.b]); self.db.commit()
        self.session = chat_history.get_or_create_session(self.db, str(self.b.id), initial_title='Private B history')
        chat_history.save_chat_turn(self.db, self.session.id, 'Private question', 'Private answer', [])
        self.app = FastAPI()
        self.app.include_router(chat.router)
        self.app.include_router(authentication.router)
        self.app.include_router(profile.router)
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
        return {'Authorization': 'Bearer ' + auth.create_access_token(user or self.a, self.db)}

    def routes(self):
        sid = str(self.session.id)
        return [
            ('POST', '/api/chat', {'message': 'Hello'}),
            ('GET', '/api/chat-history/sessions', None),
            ('POST', '/api/chat-history/sessions', {}),
            ('GET', f'/api/chat-history/sessions/{sid}', None),
            ('GET', f'/api/chat-history/sessions/{sid}/export', None),
            ('PATCH', f'/api/chat-history/sessions/{sid}/title', {'title': 'Changed'}),
            ('DELETE', f'/api/chat-history/sessions/{sid}', None),
            ('GET', '/api/files/manual.pdf', None),
            ('GET', '/api/admin/documents/42/download', None),
        ]

    def test_all_routes_reject_missing_invalid_expired_and_wrong_scope_tokens(self):
        invalid_tokens = [None, 'malformed', auth.create_access_token(self.a, self.db) + 'x', auth._create_signed_token({'sub': str(self.a.id), 'scope': 'access', 'exp': int(time.time())-1}),
                          auth.create_developer_mode_token(self.a, SimpleNamespace(id=uuid4()))[0],
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
        # This test isolates chat's identity handling; authentication is covered separately.
        self.app.dependency_overrides[auth.get_current_user] = lambda: self.a
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
        admin = models.User(id=uuid4(), email='admin@example.test', password_hash='unused', role='admin', is_active=True)
        developer = models.User(id=uuid4(), email='dev@example.test', password_hash='unused', role='developer', is_active=True)
        self.db.add_all([admin, developer])
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
        admin = models.User(id=uuid4(), email='admin@example.test', password_hash='unused', role='admin', is_active=True)
        self.db.add(admin)
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

    def test_export_only_allows_owner_and_uses_private_attachment_headers(self):
        url = f'/api/chat-history/sessions/{self.session.id}/export'
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.get(url, headers=self.headers()).status_code, 404)
        admin = models.User(id=uuid4(), email='export-admin@example.test', password_hash='unused', role='admin', is_active=True)
        self.db.add(admin); self.db.commit()
        self.assertEqual(self.client.get(url, headers=self.headers(admin)).status_code, 404)
        response = self.client.get(url, headers=self.headers(self.b))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('Private question', response.text)
        self.assertIn('Private answer', response.text)
        self.assertIn('attachment;', response.headers['content-disposition'])
        self.assertIn('.txt', response.headers['content-disposition'])
        self.assertEqual(response.headers['cache-control'], 'private, no-store')
        self.assertEqual(response.headers['x-content-type-options'], 'nosniff')
        self.assertTrue(response.content.startswith(b'\xef\xbb\xbf'))
        self.assertIn('charset=utf-8', response.headers['content-type'])
        self.assertEqual(self.client.get(f'/api/chat-history/sessions/{uuid4()}/export', headers=self.headers(self.b)).status_code, 404)
        self.assertEqual(self.client.get('/api/chat-history/sessions/invalid/export', headers=self.headers(self.b)).status_code, 400)

    def test_export_last_rounds_preserves_order_unicode_and_source_titles(self):
        session = chat_history.get_or_create_session(self.db, str(self.a.id), initial_title='中文 / Bahasa Melayu')
        now = datetime.now(timezone.utc)
        for index in range(3):
            # User and assistant timestamps deliberately match, as PostgreSQL now() does.
            created_at = now + timedelta(seconds=index)
            self.db.add_all([
                chat_history.ChatMessageRecord(session_id=session.id, sender='bot', content=f'回答-{index}', created_at=created_at,
                    sources=[{'title': '员工手册 / Panduan', 'file_path': 'private-storage-key'}]),
                chat_history.ChatMessageRecord(session_id=session.id, sender='user', content=f'问题-{index}', created_at=created_at),
            ])
        self.db.commit()
        url = f'/api/chat-history/sessions/{session.id}/export'
        headers = self.headers()
        for rounds, first_index in [(1, 2), (2, 1), (99, 0)]:
            response = self.client.get(url, params={'last_rounds': rounds}, headers=headers)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertIn('中文 / Bahasa Melayu', response.text)
            self.assertIn('Source: 员工手册 / Panduan', response.text)
            self.assertNotIn('private-storage-key', response.text)
            for index in range(3):
                if index < first_index:
                    self.assertNotIn(f'问题-{index}', response.text)
                    self.assertNotIn(f'回答-{index}', response.text)
                else:
                    self.assertLess(response.text.index(f'问题-{index}'), response.text.index(f'回答-{index}'))
            if first_index < 2:
                self.assertLess(response.text.index(f'回答-{first_index}'), response.text.index(f'问题-{first_index+1}'))
        response = self.client.get(url, headers=headers)
        for index in range(3):
            self.assertIn(f'问题-{index}', response.text)
            self.assertIn(f'回答-{index}', response.text)

    def test_export_rejects_invalid_rounds_and_handles_empty_conversation(self):
        session = chat_history.get_or_create_session(self.db, str(self.a.id))
        url = f'/api/chat-history/sessions/{session.id}/export'
        headers = self.headers()
        for count in ['0', '-1', '1.5', 'abc', '10001']:
            self.assertEqual(self.client.get(url, params={'last_rounds': count}, headers=headers).status_code, 422)
        response = self.client.get(url, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn('No saved messages', response.text)

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

    def login(self):
        self.a.password_hash = bcrypt.hashpw(b'test-password', bcrypt.gensalt(rounds=4)).decode()
        self.db.commit()
        response = self.client.post('/api/login', json={'email': self.a.email, 'password': 'test-password', 'role': 'staff'})
        self.assertEqual(response.status_code, 200, response.text)
        return {'Authorization': 'Bearer ' + response.json()['access_token']}

    def test_logout_revokes_only_current_login_and_blocks_all_protected_routes(self):
        first = self.login()
        second = self.login()
        other = self.headers(self.b)
        self.assertNotEqual(first, second)
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers=first).status_code, 200)
        self.assertEqual(self.client.post('/api/logout', headers=first).status_code, 200)
        # Open a new ORM session to demonstrate revocation is persisted, not in memory.
        with sessionmaker(bind=self.engine)() as fresh_db:
            self.app.dependency_overrides[database.get_db] = lambda: fresh_db
            with patch.object(chat, 'get_embedding') as embed:
                for method, url, body in self.routes():
                    self.assertEqual(self.client.request(method, url, json=body, headers=first).status_code, 401, url)
                embed.assert_not_called()
            self.assertEqual(self.client.post('/api/logout', headers=first).status_code, 401)
            self.assertEqual(self.client.get('/api/chat-history/sessions', headers=second).status_code, 200)
            self.assertEqual(self.client.get('/api/chat-history/sessions', headers=other).status_code, 200)
        self.storage.get_object.assert_not_called()

    def test_database_expiration_unknown_session_and_legacy_tokens_are_rejected(self):
        headers = self.headers()
        payload = auth._verify_signed_token(headers['Authorization'][7:], 'Invalid')
        session = self.db.query(models.AuthSession).filter_by(id=UUID(payload['sid'])).one()
        session.expires_at = int(time.time()) - 1
        self.db.commit()
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 401)
        for change in [{'sid': str(uuid4())}, {'sid': payload['sid'], 'sub': str(self.b.id)}]:
            token = auth._create_signed_token({**payload, **change})
            self.assertEqual(self.client.get('/api/chat-history/sessions', headers={'Authorization': 'Bearer '+token}).status_code, 401)
        payload.pop('sid')
        token = auth._create_signed_token(payload)
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers={'Authorization': 'Bearer '+token}).status_code, 401)
        self.assertEqual(self.client.post('/api/logout').status_code, 401)

    def test_password_change_revokes_all_logins_and_new_password_can_log_in(self):
        first, second = self.login(), self.login()
        response = self.client.put(f'/api/profile/{self.a.id}', headers=first,
                                   json={'full_name': 'Updated', 'password': 'new-password'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()['requires_login'])
        for headers in [first, second]:
            self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 401)
        response = self.client.post('/api/login', json={'email': self.a.email, 'password': 'test-password', 'role': 'staff'})
        self.assertEqual(response.status_code, 401)
        response = self.client.post('/api/login', json={'email': self.a.email, 'password': 'new-password', 'role': 'staff'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers={'Authorization': 'Bearer '+response.json()['access_token']}).status_code, 200)

    def test_profile_name_change_does_not_revoke_session(self):
        headers = self.headers()
        response = self.client.put(f'/api/profile/{self.a.id}', headers=headers, json={'full_name': 'Updated'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()['requires_login'])
        self.assertEqual(self.client.get('/api/chat-history/sessions', headers=headers).status_code, 200)

    def test_developer_unlock_cannot_be_reused_in_a_new_login_session(self):
        first, second = self.headers(), self.headers()
        sessions = []
        for headers in [first, second]:
            payload = auth._verify_signed_token(headers['Authorization'][7:], 'Invalid')
            sessions.append(self.db.query(models.AuthSession).filter_by(id=UUID(payload['sid'])).one())
        token, _ = auth.create_developer_mode_token(self.a, sessions[0])
        self.assertEqual(auth.verify_developer_mode_token(token, self.a, sessions[0]), self.a)
        self.assertEqual(self.client.post('/api/logout', headers=first).status_code, 200)
        with self.assertRaises(HTTPException) as caught:
            auth.verify_developer_mode_token(token, self.a, sessions[1])
        self.assertEqual(caught.exception.status_code, 403)

if __name__ == '__main__':
    unittest.main()
