"""AI settings lifecycle regressions using a real isolated database and mocked AI calls."""

import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("dotenv.load_dotenv"):
    from backend.ai import providers


class AISettingsLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            execution_options={"schema_translate_map": {"AI chatbot": None}},
        )

        @event.listens_for(self.engine, "connect")
        def database_functions(connection, _):
            connection.create_function("now", 0, lambda: datetime.now(timezone.utc).isoformat())

        providers.models.IntegrationSetting.__table__.create(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        self.db = self.sessions()
        self.active = providers._default_profile()
        self.draft = {
            **self.active,
            "display_name": "Synthetic OpenRouter draft",
            "provider": "openai_compatible",
            "base_url": "https://openrouter.ai/api/v1",
            "model": "openrouter/free",
            "secret_source": "stored",
            "api_key_ciphertext": "synthetic-ciphertext-never-used-for-a-request",
            "test_status": "untested",
        }
        self.db.add(providers.models.IntegrationSetting(
            id=uuid4(),
            category=providers.AI_SETTING_CATEGORY,
            provider=self.active["provider"],
            mode="active",
            config={"active": self.active, "draft": self.draft, "previous": None},
        ))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def saved_settings(self):
        with self.sessions() as db:
            return providers.get_ai_settings(db)

    def test_successful_test_persists_status_and_allows_activation_after_reload(self):
        with patch.object(providers, "_provider_request", return_value="CONNECTED") as request:
            result = providers.test_ai_draft(self.db)
        request.assert_called_once()
        self.assertEqual(result["draft"]["test_status"], "passed")
        saved = self.saved_settings()
        self.assertEqual(saved["draft"]["test_status"], "passed")
        self.assertIsNotNone(saved["draft"]["tested_at"])
        self.assertGreaterEqual(saved["draft"]["latency_ms"], 0)
        self.assertEqual(saved["active"]["model"], self.active["model"])
        self.assertNotIn("api_key_ciphertext", saved["draft"])

        with self.sessions() as db:
            activated = providers.activate_ai_draft(db, "synthetic-developer")
        self.assertEqual(activated["active"]["model"], self.draft["model"])
        self.assertIsNone(activated["draft"])
        self.assertEqual(activated["previous"]["model"], self.active["model"])
        self.assertEqual(self.saved_settings()["active"]["model"], self.draft["model"])

    def assert_failed_test_is_persisted(self, failure, expected_status):
        with patch.object(providers, "_provider_request", side_effect=failure):
            with self.assertRaises(HTTPException) as caught:
                providers.test_ai_draft(self.db)
        self.assertEqual(caught.exception.status_code, expected_status)
        saved = self.saved_settings()
        self.assertEqual(saved["draft"]["test_status"], "failed")
        self.assertIsNotNone(saved["draft"]["tested_at"])
        self.assertEqual(saved["active"]["model"], self.active["model"])
        with self.sessions() as db:
            with self.assertRaises(HTTPException) as blocked:
                providers.activate_ai_draft(db, "synthetic-developer")
        self.assertEqual(blocked.exception.status_code, 409)

    def test_provider_failure_persists_failed_status_and_blocks_activation(self):
        self.assert_failed_test_is_persisted(providers.ProviderError("Synthetic timeout"), 502)

    def test_configuration_failure_persists_failed_status_and_blocks_activation(self):
        self.assert_failed_test_is_persisted(HTTPException(503, "Synthetic configuration failure"), 503)

    def test_failed_retest_invalidates_previous_success(self):
        with patch.object(providers, "_provider_request", return_value="CONNECTED"):
            providers.test_ai_draft(self.db)
        self.assertEqual(self.saved_settings()["draft"]["test_status"], "passed")
        self.assert_failed_test_is_persisted(providers.ProviderError("Synthetic timeout"), 502)

    def test_untested_draft_cannot_be_activated(self):
        with self.assertRaises(HTTPException) as blocked:
            providers.activate_ai_draft(self.db, "synthetic-developer")
        self.assertEqual(blocked.exception.status_code, 409)
        self.assertEqual(self.saved_settings()["active"]["model"], self.active["model"])


if __name__ == "__main__":
    unittest.main()
