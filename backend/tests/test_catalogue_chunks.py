import unittest

from backend.ai.catalogue_chunks import build_index_chunks


class CatalogueChunkTests(unittest.TestCase):
    def test_product_and_page_labels_remain_on_each_chunk(self):
        text = (
            "=== PRODUCT: Quartz A 5W-30 ===\n"
            "--- PAGE 12 ---\n"
            + "\n".join(f"Characteristic {n}: value {n}" for n in range(90))
            + "\n=== PRODUCT: Quartz B 10W-40 ===\n"
            "--- PAGE 13 ---\n"
            "Viscosity grade | SAE J300 | 10W-40\n"
        )
        chunks = build_index_chunks(text, max_chars=200)
        self.assertGreater(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 200 for chunk in chunks))
        self.assertTrue(all("Source: Catalogue.pdf, page " in chunk for chunk in chunks))
        self.assertTrue(all("Quartz B" not in chunk for chunk in chunks[:-1]))
        self.assertIn("Product: Quartz B 10W-40", chunks[-1])
        self.assertIn("Viscosity grade | SAE J300 | 10W-40", chunks[-1])

    def test_regular_documents_keep_existing_chunking(self):
        self.assertEqual(build_index_chunks("a" * 1001), ["a" * 1000, "a"])
        malformed = "=== PRODUCT: Sample ===\nNo page marker"
        self.assertEqual(build_index_chunks(malformed), [malformed])


if __name__ == "__main__":
    unittest.main()
