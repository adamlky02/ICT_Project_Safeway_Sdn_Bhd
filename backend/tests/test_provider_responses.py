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
        response.status_code = 200
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


class ProviderRetryTests(unittest.TestCase):
    def setUp(self):
        self.profile = {
            "base_url": providers.DEFAULT_GEMINI_BASE_URL,
            "model": "synthetic-model",
            "temperature": 0.4,
            "max_tokens": 1024,
            "timeout_seconds": 45,
        }
        for target, options in (
            ("requests.post", {}),
            ("time.sleep", {}),
            ("time.monotonic", {"return_value": 0}),
            ("random.uniform", {"return_value": 0}),
            ("_resolve_api_key", {"return_value": "test-only-key"}),
        ):
            mocked = patch(f"{providers.__name__}.{target}", **options)
            setattr(self, target.split(".")[-1], mocked.start())
            self.addCleanup(mocked.stop)

    def response(self, status, headers=None):
        response = Mock(status_code=status, headers=headers or {})
        if status >= 400:
            response.raise_for_status.side_effect = providers.requests.HTTPError(
                "private-provider-response", response=response,
            )
        response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "Recovered answer"}]}}],
            "choices": [{"message": {"content": "Recovered answer"}, "finish_reason": "stop"}],
        }
        return response

    def test_transient_failure_recovers_with_backoff_and_the_same_grounded_request(self):
        for adapter in (providers._gemini_request, providers._openai_compatible_request):
            for status in (502, 503, 504):
                with self.subTest(adapter=adapter.__name__, status=status):
                    self.post.reset_mock()
                    self.sleep.reset_mock()
                    first = self.response(status)
                    second = self.response(status)
                    self.post.side_effect = [first, second, self.response(200)]
                    with self.assertLogs(providers.logger, level="WARNING") as logs:
                        answer = adapter(self.profile, "Synthetic grounded prompt", test_mode=False)
                    self.assertEqual(answer, "Recovered answer")
                    self.assertEqual(self.post.call_count, 3)
                    self.assertEqual([call.args[0] for call in self.sleep.call_args_list], [1, 2])
                    self.assertEqual(self.post.call_args_list[0], self.post.call_args_list[2])
                    first.close.assert_called_once()
                    second.close.assert_called_once()
                    self.assertNotIn("test-only-key", str(logs.output))
                    self.assertNotIn("Synthetic grounded prompt", str(logs.output))

    def test_repeated_503_stops_after_three_attempts_and_retains_safe_http_status(self):
        for adapter in (providers._gemini_request, providers._openai_compatible_request):
            with self.subTest(adapter=adapter.__name__):
                self.post.reset_mock()
                self.post.side_effect = [self.response(503) for _ in range(3)]
                with self.assertLogs(providers.logger, level="WARNING"):
                    with self.assertRaises(providers.ProviderError) as caught:
                        adapter(self.profile, "Synthetic question", test_mode=True)
                self.assertEqual(self.post.call_count, 3)
                self.assertEqual(caught.exception.status_code, 503)
                self.assertIn("HTTP 503", str(caught.exception))
                self.assertNotIn("private-provider-response", str(caught.exception))

    def test_client_and_quota_errors_are_not_retried(self):
        for status in (400, 401, 402, 403, 404, 429):
            with self.subTest(status=status):
                self.post.reset_mock()
                self.post.return_value = self.response(status)
                with self.assertRaises(providers.ProviderError) as caught:
                    providers._gemini_request(self.profile, "Synthetic question", test_mode=True)
                self.assertEqual(caught.exception.status_code, status)
                self.post.assert_called_once()
        self.sleep.assert_not_called()

    def test_response_allowance_is_reduced_for_retry_and_not_restarted(self):
        self.monotonic.side_effect = [0, 1, 2]
        self.post.side_effect = [self.response(503), self.response(200)]
        with self.assertLogs(providers.logger, level="WARNING"):
            providers._gemini_request(self.profile, "Synthetic question", test_mode=False)
        self.assertEqual(self.post.call_args_list[0].kwargs["timeout"], (10, 45))
        self.assertEqual(self.post.call_args_list[1].kwargs["timeout"], (10, 43))

    def test_retry_stops_if_response_allowance_is_already_spent(self):
        self.monotonic.side_effect = [0, 45]
        self.post.return_value = self.response(503)
        with self.assertRaises(providers.ProviderError):
            providers._gemini_request(self.profile, "Synthetic question", test_mode=False)
        self.post.assert_called_once()
        self.sleep.assert_not_called()

    def test_retry_after_is_respected_and_long_pauses_do_not_hold_the_request(self):
        for pause, calls in (("3", 2), ("120", 1), ("Thu, 01 Jan 2099 00:00:00 GMT", 1)):
            with self.subTest(pause=pause):
                self.post.reset_mock()
                self.sleep.reset_mock()
                self.post.side_effect = [self.response(503, {"Retry-After": pause}), self.response(200)]
                if calls == 2:
                    with self.assertLogs(providers.logger, level="WARNING"):
                        providers._gemini_request(self.profile, "Synthetic question", test_mode=False)
                    self.sleep.assert_called_once_with(3)
                else:
                    with self.assertRaises(providers.ProviderError):
                        providers._gemini_request(self.profile, "Synthetic question", test_mode=False)
                    self.sleep.assert_not_called()
                self.assertEqual(self.post.call_count, calls)


if __name__ == "__main__":
    unittest.main()
