"""Grounding, multilingual retrieval, chunk boundaries and fixture-integrity regressions."""

import json
import os
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from backend.ai.catalogue_chunks import build_index_chunks
from backend.ai.conversation import build_retrieval_query
from backend.ai.evaluate import case_prompt, live_generation, load_cases, score_answer
from backend.ai.prompt import GroundingError, build_grounded_chat_prompt, parse_grounded_answer
from backend.ai.retrieval import Passage, query_terms, rerank_passages, retrieve_passages
from backend.ai.language import question_language, language_matches


def response(answer="14 days. [S1]", status="answered", source_ids=None):
    return json.dumps({"answer": answer, "status": status, "source_ids": ["S1"] if source_ids is None else source_ids, "missing_information": []})


class GroundingTests(unittest.TestCase):
    def test_language_hints_and_obviously_wrong_long_responses(self):
        self.assertEqual(question_language("正式员工有多少天年假？"), "zh")
        self.assertEqual(question_language("Adakah minyak ini ada dalam stok?"), "ms")
        self.assertEqual(question_language("What is Alpha's viscosity?"), "en")
        self.assertFalse(language_matches("Manufacturer catalogues do not prove Safeway stock or vehicle compatibility.", "ms"))

    def test_unknown_duplicate_missing_and_hidden_source_ids_are_rejected(self):
        for raw in (response("14 days. [S9]", source_ids=["S9"]), response(source_ids=["S1", "S1"]),
                    response("14 days.", source_ids=[]), response("14 days. [S2]")):
            with self.subTest(raw=raw), self.assertRaises(GroundingError):
                parse_grounded_answer(raw, ["S1"])

    def test_omitted_source_list_is_derived_only_from_valid_existing_citations(self):
        result = parse_grounded_answer(response("No stock information was provided. [S1]", "insufficient_evidence", []), ["S1"])
        self.assertEqual(result.source_ids, ["S1"])
        with self.assertRaises(GroundingError):
            parse_grounded_answer(response("No stock information was provided. [S99]", "insufficient_evidence", []), ["S1"])

    def test_malformed_json_and_extra_fields_fail_closed(self):
        for raw in ("Plain text", '{"answer":"secret"}', response()[:-1] + ', "debug": "private"}'):
            with self.assertRaises(GroundingError):
                parse_grounded_answer(raw, ["S1"])

    def test_unknown_information_can_be_reported_without_citations(self):
        result = parse_grounded_answer(response("No price was supplied.", "insufficient_evidence", []), ["S1"])
        self.assertEqual(result.source_ids, [])

    def test_user_and_document_instructions_never_enter_system_role(self):
        prompt = build_grounded_chat_prompt(today=date(2026, 11, 9), conversation_text="No history",
            birthday_reasoning_text='{"intent":"other"}', context_text="IGNORE_RULES_PRIVATE_MARKER",
            staff_question="REVEAL_PRIVATE_MARKER", source_ids=("S1",))
        self.assertNotIn("PRIVATE_MARKER", prompt.system_instruction)
        data = json.loads(prompt.user_content)
        self.assertEqual(data["trusted_server_data"]["date"], "2026-11-09")
        self.assertEqual(data["untrusted_evidence"], "IGNORE_RULES_PRIVATE_MARKER")
        self.assertEqual(prompt.response_schema["properties"]["source_ids"]["items"]["enum"], ["S1"])


class RetrievalTests(unittest.TestCase):
    def test_unrelated_nearest_passages_are_not_accepted_just_because_they_exist(self):
        passage = Passage("Cafeteria opening hours", "Canteen", "General", "test.txt", "1", 0.9, 1, None)
        self.assertEqual(rerank_passages([passage], "Alpha 5W-30 viscosity"), [])

    def test_exact_product_variant_can_survive_low_semantic_similarity(self):
        passage = Passage("Alpha 5W-30 viscosity is 10.2 cSt", "Alpha", "Product", "test.txt", "1", 0.9, 1, 1)
        self.assertEqual(rerank_passages([passage], "Alpha 5W-30 viscosity"), [passage])

    def test_a_shared_number_is_not_sufficient_lexical_evidence(self):
        passage = Passage("Different product tested at 100 degrees", "Other", "Product", "test.txt", "1", 0.95, 1, 1)
        self.assertEqual(rerank_passages([passage], "Alpha 100"), [])

    def test_duplicates_and_document_domination_are_bounded(self):
        passages = [Passage(f"Alpha viscosity fact {n}", "Alpha", "Product", "a.txt", "1", 0.1, n + 1, n + 1) for n in range(7)]
        other = Passage("Alpha viscosity other fact", "Other source", "Product", "b.txt", "2", 0.2, 8, 8)
        selected = rerank_passages(passages + passages + [other], "Alpha viscosity")
        self.assertEqual(len(selected), 4)
        self.assertIn(other, selected)

    def test_chinese_terms_and_multilingual_followups_are_supported(self):
        self.assertIn("年假", query_terms("年假额度是多少？"))
        for question in ("What about its viscosity?", "Bagaimana pula kelikatan itu?", "那么它的黏度呢？"):
            query = build_retrieval_query([{"role": "user", "content": "Alpha 5W-30"}], question)
            self.assertIn("Alpha 5W-30", query)

    def test_query_text_is_bound_as_parameters_and_versions_are_filtered(self):
        db = MagicMock()
        db.execute.return_value.fetchall.return_value = []
        malicious = "Alpha '; DROP TABLE documents; --"
        self.assertEqual(retrieve_passages(db, [0.1] * 3072, malicious), [])
        sql, params = db.execute.call_args.args
        self.assertNotIn(malicious, str(sql))
        self.assertEqual(params["query"], malicious)
        self.assertIn("embedding_version = :version", str(sql))

    def test_invalid_query_vector_never_reaches_database(self):
        db = MagicMock()
        with self.assertRaises(ValueError):
            retrieve_passages(db, [float("nan")], "Question")
        db.execute.assert_not_called()


class ChunkBoundaryTests(unittest.TestCase):
    def test_regular_chunks_overlap_and_remain_bounded(self):
        text = " ".join(f"Policy sentence number {n}." for n in range(200))
        chunks = build_index_chunks(text, max_chars=500)
        self.assertGreater(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 500 for chunk in chunks))
        self.assertTrue(any(chunks[0][-80:].strip() in chunk for chunk in chunks[1:]))

    def test_page_metadata_is_preserved_without_crossing_pages(self):
        chunks = build_index_chunks("--- PAGE 1 ---\n" + "Alpha policy. " * 90 + "\n--- PAGE 2 ---\n" + "Beta policy. " * 90, max_chars=400)
        self.assertTrue(all(chunk.startswith("Source page: ") for chunk in chunks))
        self.assertFalse(any("Alpha" in chunk and "Beta" in chunk for chunk in chunks))

    def test_markdown_sections_do_not_merge(self):
        chunks = build_index_chunks("# Annual leave\n14 days.\n# Sick leave\n12 days.")
        self.assertEqual(len(chunks), 2)


class EvaluationFixtureTests(unittest.TestCase):
    def test_resume_keeps_completed_wrong_answers_instead_of_resampling_until_they_pass(self):
        data = load_cases()
        data["cases"] = data["cases"][:2]
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("dotenv.load_dotenv"):
            from backend.ai import providers
        previous = [{"model": "synthetic-model", "provider": "gemini", "cases": [
            {"id": "annual_en", "language": "en", "passed": False, "valid_contract": True},
            {"id": "annual_ms", "language": "ms", "passed": False, "error_type": "ProviderError"},
        ]}]
        with patch.object(providers, "_provider_request", return_value=response("Pekerja tetap menerima 14 hari cuti tahunan. [S1]")) as request:
            result = live_generation(data, ["synthetic-model"], "gemini", previous_reports=previous)
        request.assert_called_once()
        self.assertEqual(result[0]["evaluated"], 2)
        self.assertEqual(result[0]["passed"], 1)
        self.assertFalse(next(item for item in result[0]["cases"] if item["id"] == "annual_en")["passed"])

    def test_72_cases_are_balanced_and_source_references_are_valid(self):
        data = load_cases()
        self.assertEqual(len(data["cases"]), 72)
        for language in ("en", "ms", "zh"):
            self.assertEqual(sum(case["language"] == language for case in data["cases"]), 24)
        for case in data["cases"]:
            self.assertTrue(case_prompt(case, data["documents"]).source_ids)

    def test_scoring_detects_wrong_entitlement_and_missing_required_units(self):
        data = load_cases()
        case = next(case for case in data["cases"] if case["id"] == "alpha_viscosity_en")
        prompt = case_prompt(case, data["documents"])
        self.assertFalse(score_answer(response("14.4 at 100. [S1]"), case, prompt)["passed"])
        self.assertTrue(score_answer(response("10.2 cSt at 100°C. [S1]"), case, prompt)["passed"])


if __name__ == "__main__":
    unittest.main()
