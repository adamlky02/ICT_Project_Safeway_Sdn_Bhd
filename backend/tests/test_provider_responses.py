"""Provider response regressions with mocked HTTP and no local credentials."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from fastapi import HTTPException

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("dotenv.load_dotenv"):
    from backend.ai import providers


class ProviderResponseTests(unittest.TestCase):
    def setUp(self):
        self.profile = {
            "provider": "openai_compatible",
            "base_url": "https://openrouter.ai/api/v1",
            "model": "openrouter/free",
            "temperature": 0.4,
            "max_tokens": 1024,
            "timeout_seconds": 120,
            "thinking_mode": "disabled",
        }
        self.post_patch = patch.object(providers.requests, "post")
        self.post = self.post_patch.start()
        self.addCleanup(self.post_patch.stop)
        self.key_patch = patch.object(providers, "_resolve_api_key", return_value="test-only-key")
        self.key_patch.start()
        self.addCleanup(self.key_patch.stop)
        self.set_response("CONNECTED", "stop")

    def set_response(self, content, finish_reason, reasoning=None):
        response = Mock()
        response.json.return_value = {"choices": [{
            "message": {"content": content, "reasoning": reasoning},
            "finish_reason": finish_reason,
        }]}
        self.post.return_value = response

    def test_connection_uses_configured_budget_and_openrouter_thinking_mode(self):
        for enabled in (False, True):
            with self.subTest(enabled=enabled):
                self.profile["thinking_mode"] = "enabled" if enabled else "disabled"
                result = providers._openai_compatible_request(self.profile, "Reply CONNECTED", test_mode=True)
                self.assertEqual(result, "CONNECTED")
                payload = self.post.call_args.kwargs["json"]
                self.assertEqual(payload["max_tokens"], 1024)
                self.assertEqual(payload["reasoning"], {"enabled": enabled})
                self.assertEqual(self.post.call_args.args[0], "https://openrouter.ai/api/v1/chat/completions")

    def test_live_requests_honor_budget_and_other_provider_parameters(self):
        for base_url in ("https://openrouter.ai/api/v1", "https://api.deepseek.com", "https://api.openai.com/v1"):
            with self.subTest(base_url=base_url):
                self.profile["base_url"] = base_url
                self.profile["max_tokens"] = 2048
                providers._openai_compatible_request(self.profile, "Hello", test_mode=False)
                payload = self.post.call_args.kwargs["json"]
                self.assertEqual(payload["max_tokens"], 2048)
                if "openrouter.ai" in base_url:
                    self.assertEqual(payload["reasoning"], {"enabled": False})
                else:
                    self.assertNotIn("reasoning", payload)
                if "deepseek.com" in base_url:
                    self.assertEqual(payload["thinking"], {"type": "disabled"})

    def test_reasoning_only_truncation_does_not_pass_connection_test(self):
        self.set_response(None, "length", reasoning="Internal reasoning is not an answer")
        with self.assertRaises(providers.ProviderError) as caught:
            providers._openai_compatible_request(self.profile, "Hello", test_mode=True)
        self.assertIn("output token limit", str(caught.exception))
        self.assertNotIn("Internal reasoning", str(caught.exception))

    def test_empty_completed_response_still_fails(self):
        self.set_response("", "stop")
        with self.assertRaisesRegex(providers.ProviderError, "empty response"):
            providers._openai_compatible_request(self.profile, "Hello", test_mode=True)

    def test_gemini_connection_uses_configured_budget(self):
        self.profile["base_url"] = providers.DEFAULT_GEMINI_BASE_URL
        self.post.return_value.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "CONNECTED"}]}}]
        }
        with patch.object(providers, "_resolve_api_key", return_value="test-only-key"):
            self.assertEqual(providers._gemini_request(self.profile, "Hello", test_mode=True), "CONNECTED")
        self.assertEqual(self.post.call_args.kwargs["json"]["generationConfig"]["maxOutputTokens"], 1024)

    def test_connect_timeout_is_short_while_response_timeout_honors_the_profile(self):
        for adapter in (providers._gemini_request, providers._openai_compatible_request):
            for seconds in (5, 45, 120):
                with self.subTest(adapter=adapter.__name__, seconds=seconds):
                    self.profile["timeout_seconds"] = seconds
                    self.post.side_effect = providers.requests.ReadTimeout("private-network-detail")
                    with self.assertRaises(providers.ProviderTimeoutError) as caught:
                        adapter(self.profile, "Synthetic question", test_mode=False)
                    self.assertEqual(self.post.call_args.kwargs["timeout"], (min(10, seconds), seconds))
                    self.assertIn(f"within {seconds} seconds", str(caught.exception))
                    self.assertNotIn("private-network-detail", str(caught.exception))

    def test_connection_timeout_is_distinct_from_waiting_for_model_output(self):
        for adapter in (providers._gemini_request, providers._openai_compatible_request):
            with self.subTest(adapter=adapter.__name__):
                self.post.side_effect = providers.requests.ConnectTimeout("private-network-detail")
                with self.assertRaises(providers.ProviderTimeoutError) as caught:
                    adapter(self.profile, "Synthetic question", test_mode=True)
                self.assertIn("connection timed out", str(caught.exception))
                self.assertNotIn("private-network-detail", str(caught.exception))

    def test_timed_out_connection_test_marks_draft_failed_and_keeps_active_provider(self):
        active = {"provider": "gemini", "model": "synthetic-active-model"}
        draft = dict(self.profile)
        setting = SimpleNamespace(config={"active": active, "draft": draft, "previous": None})
        db = MagicMock()
        self.post.side_effect = providers.requests.ReadTimeout("private-network-detail")
        with patch.object(providers, "_get_setting", return_value=setting), patch.object(providers, "_validated_base_url", return_value=self.profile["base_url"]):
            with self.assertRaises(HTTPException) as caught:
                providers.test_ai_draft(db)
        self.assertEqual(caught.exception.status_code, 502)
        self.assertIn("within 120 seconds", caught.exception.detail)
        self.assertEqual(setting.config["draft"]["test_status"], "failed")
        self.assertIs(setting.config["active"], active)
        db.commit.assert_called_once()

    def test_live_timeout_uses_fallback_without_changing_the_saved_active_profile(self):
        setting = SimpleNamespace(config={"active": self.profile, "draft": None, "previous": None})
        db = MagicMock()
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-only-fallback-key"}), patch.object(providers, "_get_setting", return_value=setting), patch.object(providers, "_provider_request", side_effect=[providers.ProviderTimeoutError("Active provider timed out"), "Fallback answer"]) as request:
            with self.assertLogs(providers.logger, level="WARNING") as logs:
                self.assertEqual(providers.generate_ai_response(db, "Synthetic prompt"), "Fallback answer")
        self.assertEqual(request.call_count, 2)
        self.assertEqual(request.call_args_list[1].args[0]["provider"], "gemini")
        self.assertIn("attempt=active", logs.output[0])
        self.assertIs(setting.config["active"], self.profile)
        db.commit.assert_not_called()

    def test_both_provider_failures_are_logged_without_raw_configuration_details(self):
        setting = SimpleNamespace(config={"active": self.profile, "draft": None, "previous": None})
        failures = [providers.ProviderTimeoutError("Active provider timed out"), HTTPException(503, "private-configuration-detail")]
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-only-fallback-key"}), patch.object(providers, "_get_setting", return_value=setting), patch.object(providers, "_provider_request", side_effect=failures):
            with self.assertLogs(providers.logger, level="WARNING") as logs:
                with self.assertRaises(HTTPException):
                    providers.generate_ai_response(MagicMock(), "Synthetic prompt")
        self.assertIn("attempt=active", logs.output[0])
        self.assertIn("Active provider timed out", logs.output[0])
        self.assertIn("attempt=fallback", logs.output[1])
        self.assertNotIn("private-configuration-detail", str(logs.output))


if __name__ == "__main__":
    unittest.main()
