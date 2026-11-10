"""Real pgvector SQL checks using only connection-local temporary tables, rolled back after each test."""

import os
import unittest
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.ai.embeddings import EMBEDDING_VERSION
from backend.ai.indexing import replace_document_index
from backend.ai.retrieval import retrieve_passages

URL = os.getenv("AI_TEST_POSTGRES_URL", "")


class TemporaryTablesSession:
    """Redirect the two fixed production table names to pg_temp; never touch application records."""

    def __init__(self, session):
        self.session = session

    def execute(self, statement, params=None):
        return self.session.execute(text(str(statement).replace('"AI chatbot".', 'pg_temp.')), params)

    def __getattr__(self, name):
        return getattr(self.session, name)


@unittest.skipUnless(URL, "AI_TEST_POSTGRES_URL is not configured; real PostgreSQL checks run in CI")
class PostgresRetrievalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(URL, connect_args={"connect_timeout": 10})
        cls.migration = (Path(__file__).parents[1] / "migrations/20261109_ai_retrieval_v2.sql").read_text()

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        self.connection = self.engine.connect()
        self.transaction = self.connection.begin()
        self.connection.exec_driver_sql('''CREATE TEMP TABLE knowledge_base
            (id integer PRIMARY KEY, title text, category text, file_path text) ON COMMIT DROP''')
        self.connection.exec_driver_sql('''CREATE TEMP TABLE document_chunks
            (doc_id integer REFERENCES pg_temp.knowledge_base(id) ON DELETE CASCADE, content text, embedding vector(3072)) ON COMMIT DROP''')
        migration = self.migration.replace('"AI chatbot".', 'pg_temp.').replace('BEGIN;', '').replace('COMMIT;', '')
        self.connection.exec_driver_sql(migration)
        self.connection.exec_driver_sql(migration)
        self.db = TemporaryTablesSession(Session(bind=self.connection, join_transaction_mode="create_savepoint"))
        self.vector = [1.0] + [0.0] * 3071
        self.db.execute(text('''INSERT INTO "AI chatbot".knowledge_base VALUES
            (1, 'Alpha 5W-30', 'Product', 'alpha.txt'), (2, 'Legacy', 'Policy', 'legacy.txt')'''))
        self.insert(1, "Alpha 5W-30 viscosity is 10.2 cSt at 100°C", EMBEDDING_VERSION)
        self.insert(2, "Legacy Alpha 5W-30 unrelated value", "legacy")
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.transaction.rollback()
        self.connection.close()

    def insert(self, doc_id, content, version):
        self.db.execute(text('''INSERT INTO "AI chatbot".document_chunks VALUES
            (:id, :content, CAST(:vector AS vector), :version)'''), {"id": doc_id, "content": content, "vector": str(self.vector), "version": version})

    def test_real_hybrid_query_excludes_legacy_vectors(self):
        passages = retrieve_passages(self.db, self.vector, "Alpha 5W-30 viscosity")
        self.assertEqual(len(passages), 1)
        self.assertEqual(passages[0].doc_id, 1)
        self.assertIn("10.2", passages[0].content)

    def test_failed_replacement_rolls_back_deleted_chunks(self):
        invalid = [{"content": "replacement", "embedding": "[1,2]", "version": EMBEDDING_VERSION}]
        with self.assertRaises(Exception):
            replace_document_index(self.db, 1, invalid)
        self.db.rollback()
        self.assertIn("10.2", retrieve_passages(self.db, self.vector, "Alpha 5W-30 viscosity")[0].content)

    def test_successful_replacement_and_bound_query_text(self):
        replace_document_index(self.db, 1, [{"content": "Alpha 5W-30 viscosity is 11 cSt", "embedding": str(self.vector), "version": EMBEDDING_VERSION}])
        self.db.commit()
        passages = retrieve_passages(self.db, self.vector, "Alpha '; DROP TABLE knowledge_base; --")
        self.assertEqual(len(passages), 1)
        self.assertIn("11 cSt", passages[0].content)
