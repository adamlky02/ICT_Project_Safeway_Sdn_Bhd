"""Provider response regressions with mocked HTTP and no local credentials."""

import os
import unittest
from unittest.mock import Mock, patch

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


if __name__ == "__main__":
    unittest.main()
