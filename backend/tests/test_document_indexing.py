"""PDF extraction and indexing preparation regressions using only in-memory documents."""

import unittest
from unittest.mock import patch

import fitz

from backend.ai.catalogue_chunks import build_index_chunks
from backend.ai.indexing import extract_document_text, prepare_document_index


def pdf_bytes(pages):
    with fitz.open() as document:
        for value in pages:
            page = document.new_page()
            page.insert_text((40, 40), value)
        return document.tobytes()


class DocumentIndexingTests(unittest.TestCase):
    def test_pdf_pages_remain_separate_and_keep_actual_page_numbers(self):
        content = extract_document_text(pdf_bytes(["Alpha policy has fourteen days of leave.", "Beta product has a different specification."]), "pdf")
        chunks = build_index_chunks(content)
        self.assertEqual(len(chunks), 2)
        self.assertIn("Source page: 1", chunks[0])
        self.assertIn("Source page: 2", chunks[1])
        self.assertNotIn("Beta", chunks[0])

    def test_ai_ready_catalogue_keeps_original_labels_instead_of_outer_pdf_markers(self):
        content = extract_document_text(pdf_bytes(["=== PRODUCT: Alpha 5W-30 ===\n--- PAGE 12 ---\nViscosity at 100 C is 10.2 cSt."]), "pdf")
        chunks = build_index_chunks(content)
        self.assertTrue(all("Product: Alpha 5W-30" in chunk for chunk in chunks))
        self.assertTrue(all("page 12" in chunk for chunk in chunks))

    def test_empty_document_does_not_request_embeddings(self):
        with patch("backend.ai.indexing.get_embedding") as embed:
            with self.assertRaises(ValueError):
                prepare_document_index(b"   ", "txt", "Empty")
        embed.assert_not_called()

    def test_chinese_catalogue_lines_without_spaces_remain_bounded(self):
        text = "=== PRODUCT: Sample ===\n--- PAGE 1 ---\n" + "典型黏度说明" * 200
        chunks = build_index_chunks(text, max_chars=300)
        self.assertGreater(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 300 for chunk in chunks))
