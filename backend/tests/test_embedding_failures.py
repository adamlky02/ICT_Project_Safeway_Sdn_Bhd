"""Embedding SDK contract and sanitized failures, without real provider calls."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from google.genai import errors
from backend.ai import embeddings


class EmbeddingFailureTests(unittest.TestCase):
    def setUp(self):
        embeddings._embedding_client.cache_clear()
        self.addCleanup(embeddings._embedding_client.cache_clear)
        environment = patch.dict(os.environ, {"GOOGLE_API_KEY": " test-only-embedding-key "})
        environment.start()
        self.addCleanup(environment.stop)
        self.client = Mock()
        self.vector = [0.1] * embeddings.EMBEDDING_DIMENSIONS
        self.client.models.embed_content.return_value = SimpleNamespace(embeddings=[SimpleNamespace(values=self.vector)])
        constructor = patch.object(embeddings.genai, "Client", return_value=self.client)
        self.constructor = constructor.start()
        self.addCleanup(constructor.stop)

    def test_missing_key_never_uses_ambient_cloud_credentials(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "  "}):
            with self.assertRaises(embeddings.EmbeddingError) as caught:
                embeddings.get_embedding("Synthetic question", task_type=None)
        self.assertEqual(caught.exception.code, "embedding_not_configured")
        self.constructor.assert_not_called()

    def test_model_and_dimensions_remain_fixed_and_task_type_is_never_sent(self):
        for task_type in (None, "retrieval_document"):
            self.assertEqual(embeddings.get_embedding("Synthetic text", task_type, title="Manual"), self.vector)
            options = self.client.models.embed_content.call_args.kwargs
            self.assertEqual(options["model"], "gemini-embedding-2")
            self.assertNotIn("task_type", options)
            self.assertEqual(options["config"].output_dimensionality, 3072)
            expected = "title: Manual | text: Synthetic text" if task_type else "task: search result | query: Synthetic text"
            self.assertEqual(options["contents"], expected)
        self.constructor.assert_called_once()
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "replacement-test-key"}):
            embeddings.get_embedding("Text", task_type=None)
        self.assertEqual(self.constructor.call_count, 2)

    def test_existing_query_prefix_is_not_duplicated(self):
        question = "task: search result | query: Annual leave"
        embeddings.get_embedding(question, task_type=None)
        self.assertEqual(self.client.models.embed_content.call_args.kwargs["contents"], question)

    def test_provider_errors_are_classified_without_remote_text(self):
        for status, code in ((401, "embedding_access_denied"), (403, "embedding_access_denied"), (429, "embedding_quota_exceeded"),
                             (404, "embedding_model_unavailable"), (400, "embedding_request_rejected"), (503, "embedding_unavailable")):
            with self.subTest(status=status):
                self.client.models.embed_content.side_effect = errors.APIError(status, {"error": {"message": "private-provider-detail"}})
                with self.assertRaises(embeddings.EmbeddingError) as caught:
                    embeddings.get_embedding("Question", task_type=None)
                self.assertEqual(caught.exception.code, code)
                self.assertNotIn("private-provider-detail", str(caught.exception))

    def test_wrong_dimension_nan_and_zero_vectors_are_rejected(self):
        for vector in ([0.1], [float("nan")] * 3072, [0.0] * 3072):
            self.client.models.embed_content.return_value = SimpleNamespace(embeddings=[SimpleNamespace(values=vector)])
            with self.assertRaises(embeddings.EmbeddingError) as caught:
                embeddings.get_embedding("Question", task_type=None)
            self.assertEqual(caught.exception.code, "embedding_invalid_response")


if __name__ == "__main__":
    unittest.main()
