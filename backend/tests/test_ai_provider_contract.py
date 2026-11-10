"""Provider capabilities, structured connection probes, and grounding fallback regressions."""

import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("dotenv.load_dotenv"):
    from backend.ai import providers
from backend.ai.prompt import GroundedPrompt

VALID = json.dumps({"answer": "CONNECTED [S1]", "status": "answered", "source_ids": ["S1"], "missing_information": []})


class ProviderContractTests(unittest.TestCase):
    def setUp(self):
        self.profile = {**providers._default_profile(), "secret_source": "render_environment"}
        self.prompt = GroundedPrompt("TRUSTED_SYSTEM_MARKER", "UNTRUSTED_USER_MARKER", ("S1",))
        mocked = patch.object(providers, "_resolve_api_key", return_value="synthetic-key")
        mocked.start()
        self.addCleanup(mocked.stop)
        mocked = patch.object(providers, "_post_with_transient_retries")
        self.post = mocked.start()
        self.addCleanup(mocked.stop)
        self.response = Mock()
        self.post.return_value = self.response

    def gemini(self, model="gemini-3.5-flash-lite", thinking="disabled", effort="medium"):
        self.profile.update(model=model, thinking_mode=thinking, reasoning_effort=effort)
        self.response.json.return_value = {"candidates": [{"content": {"parts": [{"text": "private reasoning", "thought": True}, {"text": VALID}]}}],
                                           "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20, "thoughtsTokenCount": 5}}
        result = providers._gemini_request(self.profile, self.prompt, False)
        return result, self.post.call_args.args[3]

    def test_gemini_uses_system_instruction_native_schema_and_provider_sampling_defaults(self):
        result, body = self.gemini()
        self.assertEqual(body["systemInstruction"]["parts"][0]["text"], "TRUSTED_SYSTEM_MARKER")
        self.assertEqual(body["contents"][0]["parts"][0]["text"], "UNTRUSTED_USER_MARKER")
        config = body["generationConfig"]
        self.assertNotIn("temperature", config)
        self.assertEqual(config["responseMimeType"], "application/json")
        self.assertEqual(config["thinkingConfig"], {"thinkingLevel": "minimal"})
        self.assertNotIn("private reasoning", result)
        self.assertEqual(result.input_tokens, 10)
        self.assertEqual(result.output_tokens, 25)

    def test_gemini_maps_minimum_effort_to_supported_model_levels(self):
        for model in ("gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.1-pro-preview"):
            with self.subTest(model=model):
                _, body = self.gemini(model)
                self.assertEqual(body["generationConfig"]["thinkingConfig"], {"thinkingLevel": "low"})
        _, body = self.gemini(thinking="enabled", effort="max")
        self.assertEqual(body["generationConfig"]["thinkingConfig"], {"thinkingLevel": "high"})

    def test_deepseek_has_real_system_role_json_and_effort_without_temperature(self):
        self.profile.update(provider="openai_compatible", base_url="https://api.deepseek.com", model="deepseek-flash", thinking_mode="enabled")
        self.response.json.return_value = {"choices": [{"message": {"content": VALID}, "finish_reason": "stop"}]}
        providers._openai_compatible_request(self.profile, self.prompt, False)
        body = self.post.call_args.args[3]
        self.assertEqual([message["role"] for message in body["messages"]], ["system", "user"])
        self.assertNotIn("temperature", body)
        self.assertEqual(body["reasoning_effort"], "high")
        self.assertEqual(body["response_format"], {"type": "json_object"})

    def test_invalid_active_output_uses_validated_fallback_without_changing_saved_settings(self):
        setting = SimpleNamespace(config={"active": {**self.profile, "model": "synthetic-custom-model"}, "draft": None, "previous": None})
        db = MagicMock()
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "synthetic-key"}), patch.object(providers, "_get_setting", return_value=setting), patch.object(
            providers, "_provider_request", side_effect=['{"answer":"private junk"}', VALID]
        ) as request:
            self.assertEqual(providers.generate_ai_response(db, self.prompt), VALID)
        self.assertEqual(request.call_count, 2)
        db.commit.assert_not_called()

    def test_connection_probe_rejects_plain_text_and_persists_failure(self):
        setting = SimpleNamespace(config={"active": dict(self.profile), "draft": dict(self.profile), "previous": None})
        db = MagicMock()
        with patch.object(providers, "_get_setting", return_value=setting), patch.object(providers, "_provider_request", return_value="CONNECTED"):
            with self.assertRaises(providers.HTTPException):
                providers.test_ai_draft(db)
        self.assertEqual(setting.config["draft"]["test_status"], "failed")


if __name__ == "__main__":
    unittest.main()
