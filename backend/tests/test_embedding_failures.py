"""Document-search regressions with synthetic keys and no provider calls."""

import os
import unittest
from unittest.mock import patch

from google.api_core import exceptions as google_errors

from backend.ai import embeddings


class EmbeddingFailureTests(unittest.TestCase):
    def setUp(self):
        embeddings._configure_embeddings.cache_clear()
        self.addCleanup(embeddings._configure_embeddings.cache_clear)
        environment = patch.dict(os.environ, {"GOOGLE_API_KEY": " test-only-embedding-key "})
        environment.start()
        self.addCleanup(environment.stop)
        configure = patch.object(embeddings.genai, "configure")
        self.configure = configure.start()
        self.addCleanup(configure.stop)
        embed = patch.object(embeddings.genai, "embed_content", return_value={"embedding": [0.1, 0.2]})
        self.embed = embed.start()
        self.addCleanup(embed.stop)

    def test_missing_hosted_key_fails_without_attempting_default_cloud_credentials(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "  "}):
            with self.assertRaises(embeddings.EmbeddingError) as caught:
                embeddings.get_embedding("Synthetic question", task_type=None)
        self.assertEqual(caught.exception.code, "embedding_not_configured")
        self.configure.assert_not_called()
        self.embed.assert_not_called()

    def test_key_is_resolved_at_call_time_and_vector_model_stays_compatible(self):
        for task_type in (None, "retrieval_document"):
            with self.subTest(task_type=task_type):
                self.assertEqual(embeddings.get_embedding("Synthetic text", task_type), [0.1, 0.2])
                self.configure.assert_called_with(api_key="test-only-embedding-key")
                options = self.embed.call_args.kwargs
                self.assertEqual(options["model"], "models/gemini-embedding-2")
                if task_type:
                    self.assertEqual(options["task_type"], task_type)
                else:
                    self.assertNotIn("task_type", options)
        self.configure.assert_called_once()
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-only-replacement-key"}):
            embeddings.get_embedding("Synthetic text", task_type=None)
        self.configure.assert_called_with(api_key="test-only-replacement-key")

    def test_provider_failures_are_classified_without_exposing_remote_details(self):
        cases = (
            (google_errors.Unauthenticated, "embedding_access_denied"),
            (google_errors.PermissionDenied, "embedding_access_denied"),
            (google_errors.ResourceExhausted, "embedding_quota_exceeded"),
            (google_errors.NotFound, "embedding_model_unavailable"),
            (google_errors.InvalidArgument, "embedding_request_rejected"),
            (google_errors.DeadlineExceeded, "embedding_unavailable"),
            (google_errors.ServiceUnavailable, "embedding_unavailable"),
        )
        for exception_type, code in cases:
            with self.subTest(exception_type=exception_type):
                self.embed.side_effect = exception_type("private-provider-detail")
                with self.assertRaises(embeddings.EmbeddingError) as caught:
                    embeddings.get_embedding("Synthetic question", task_type=None)
                self.assertEqual(caught.exception.code, code)
                self.assertNotIn("private-provider-detail", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
