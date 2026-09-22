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

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Do not load local credentials or construct a real cloud storage client.
with patch.dict(os.environ, {"DATABASE_URL": "sqlite://", "SECRET_KEY": "test-only-secret-not-for-deployment-12345", "GOOGLE_API_KEY": "test-only"}), patch('dotenv.load_dotenv'), patch('boto3.client'):
    from backend.general import auth, database, models, chat_history
    from backend.route import chat, documents


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
        self.db.add_all([self.a, self.b]); self.db.commit()
        self.session = chat_history.get_or_create_session(self.db, str(self.b.id), initial_title='Private B history')
        chat_history.save_chat_turn(self.db, self.session.id, 'Private question', 'Private answer', [])
        self.app = FastAPI()
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

if __name__ == '__main__':
    unittest.main()
