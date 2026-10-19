"""Chat failure diagnostics without cloud services, credentials or company data."""

import asyncio
import os
import unittest
from threading import Event
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://", "SECRET_KEY": "test-only-secret-not-for-deployment-12345"}), patch("dotenv.load_dotenv"), patch("boto3.client"):
    from backend.route import chat


class ChatFailureTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.db.execute.return_value.fetchall.return_value = [
            ("Synthetic policy", "Test manual", "General", "test.txt"),
        ]
        self.user = SimpleNamespace(id="test-user")
        self.session_id = "test-session"
        for name, options in (
            ("get_or_create_session", {"return_value": SimpleNamespace(id=self.session_id)}),
            ("get_embedding", {"return_value": [0.1]}),
            ("generate_ai_response", {"return_value": "Synthetic answer"}),
            ("save_chat_turn", {}),
        ):
            mocked = patch.object(chat, name, **options)
            setattr(self, name, mocked.start())
            self.addCleanup(mocked.stop)

    def request(self):
        return chat.chat_with_ai(chat.ChatRequest(message="Synthetic question"), self.db, self.user)

    def test_each_failure_identifies_its_stage_and_preserves_session_without_leaking_details(self):
        for stage, target in (
            ("embedding", self.get_embedding),
            ("retrieval", self.db.execute),
            ("generation", self.generate_ai_response),
        ):
            with self.subTest(stage=stage):
                target.side_effect = RuntimeError("private-document-text-or-credential")
                with self.assertLogs(chat.logger, level="ERROR") as logs:
                    result = self.request()
                target.side_effect = None
                self.assertEqual(result["error_code"], f"chat_{stage}_failed")
                self.assertEqual(result["session_id"], self.session_id)
                self.assertEqual(result["sources"], [])
                self.assertNotIn("currently busy", result["message"])
                self.assertIn(f"stage={stage}", logs.output[0])
                self.assertNotIn("private-document-text-or-credential", str(result) + str(logs.output))
                self.save_chat_turn.assert_not_called()

    def test_embedding_configuration_failure_does_not_call_generation(self):
        self.get_embedding.side_effect = chat.EmbeddingError(
            "embedding_not_configured", "Document search is not configured. Please contact an administrator.",
        )
        with self.assertLogs(chat.logger, level="ERROR"):
            result = self.request()
        self.assertEqual(result["error_code"], "embedding_not_configured")
        self.assertIn("Document search is not configured", result["message"])
        self.db.execute.assert_not_called()
        self.generate_ai_response.assert_not_called()

    def test_saved_key_configuration_failure_is_distinct_from_a_busy_provider(self):
        self.generate_ai_response.side_effect = HTTPException(503, "private-configuration-detail")
        with self.assertLogs(chat.logger, level="ERROR") as logs:
            result = self.request()
        self.assertEqual(result["error_code"], "generation_configuration_error")
        self.assertIn("not configured correctly", result["message"])
        self.assertIn("status=503", logs.output[0])
        self.assertNotIn("private-configuration-detail", str(result) + str(logs.output))

    def test_provider_failure_keeps_safe_status_details_in_server_log(self):
        self.generate_ai_response.side_effect = chat.ProviderError("The AI provider request failed (HTTP 429).")
        with self.assertLogs(chat.logger, level="ERROR") as logs:
            result = self.request()
        self.assertEqual(result["error_code"], "chat_generation_failed")
        self.assertIn("HTTP 429", logs.output[0])
        self.assertNotIn("HTTP 429", result["message"])

    def test_timeout_is_reported_explicitly_without_saving_a_failed_answer(self):
        self.generate_ai_response.side_effect = chat.ProviderTimeoutError("Safe timeout detail")
        with self.assertLogs(chat.logger, level="ERROR"):
            result = self.request()
        self.assertEqual(result["error_code"], "generation_timeout")
        self.assertIn("took too long", result["message"])
        self.save_chat_turn.assert_not_called()

    def test_waiting_for_provider_does_not_block_other_requests(self):
        entered, release = Event(), Event()

        def slow_provider(*args):
            entered.set()
            if not release.wait(timeout=3):
                raise RuntimeError("Another request could not run while the provider was waiting")
            return "Synthetic answer"

        self.generate_ai_response.side_effect = slow_provider
        app = FastAPI()
        app.include_router(chat.router)
        app.dependency_overrides[chat.database.get_db] = lambda: self.db
        app.dependency_overrides[chat.get_current_user] = lambda: self.user

        @app.get("/probe")
        async def probe():
            release.set()
            return {"ok": True}

        async def exercise():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                pending = asyncio.create_task(client.post("/api/chat", json={"message": "Synthetic question"}))
                try:
                    self.assertTrue(await asyncio.to_thread(entered.wait, 2))
                    self.assertEqual((await client.get("/probe")).status_code, 200)
                finally:
                    release.set()
                    response = await pending
                self.assertEqual(response.json()["message"], "Synthetic answer")

        asyncio.run(exercise())

    def test_success_still_returns_sources_and_saves_the_answer(self):
        result = self.request()
        self.assertEqual(result["message"], "Synthetic answer")
        self.assertEqual(result["session_id"], self.session_id)
        self.assertEqual(result["sources"][0]["title"], "Test manual")
        self.assertNotIn("error_code", result)
        self.save_chat_turn.assert_called_once_with(
            self.db, self.session_id, "Synthetic question", "Synthetic answer", result["sources"],
        )


if __name__ == "__main__":
    unittest.main()
