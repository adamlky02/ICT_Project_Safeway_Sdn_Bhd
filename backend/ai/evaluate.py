"""Synthetic multilingual component benchmarks. Offline mode makes no cloud/database calls.

Live generation uses gold evidence to isolate model/prompt behavior from retrieval quality.
Optional live retrieval measures the same reranker over in-memory Gemini vectors, not SQL execution.
"""

import argparse
import json
import math
import os
import statistics
import sys
import time
from collections import Counter
from datetime import date
from pathlib import Path

from .prompt import PROMPT_VERSION, build_grounded_chat_prompt, parse_grounded_answer
from .retrieval import Passage, query_terms, rerank_passages
from .conversation import build_conversation_transcript, build_retrieval_query
from .language import language_matches

FIXTURES = Path(__file__).with_name("evaluation_cases.json")


def load_cases(path=FIXTURES):
    data = json.loads(Path(path).read_text())
    ids = [case["id"] for case in data["cases"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate evaluation IDs")
    for case in data["cases"]:
        if case["language"] not in {"en", "ms", "zh"} or not case["question"].strip():
            raise ValueError("Invalid evaluation case")
        if not set(case["evidence_ids"] + case["retrieval_targets"]).issubset(data["documents"]):
            raise ValueError("Unknown fixture document")
    return data


def lexical_candidates(documents: dict, question: str):
    terms = query_terms(question)
    ranked = sorted(documents.items(), key=lambda item: (-sum(t in (item[1]["title"] + " " + item[1]["content"]).casefold() for t in terms), item[0]))
    return [Passage(doc["content"], doc["title"], "Synthetic evaluation", "synthetic.txt", key, 1.0, None, rank)
            for rank, (key, doc) in enumerate(ranked, start=1)]


def retrieval_metrics(data: dict, *, vectors=None, query_vectors=None):
    recalls, reciprocal_ranks = [], []
    for case in data["cases"]:
        targets = set(case["retrieval_targets"])
        if not targets:
            continue
        query = build_retrieval_query(case.get("history", []), case["question"])
        if vectors is None:
            candidates = lexical_candidates(data["documents"], query)
        else:
            query_vector = query_vectors[case["id"]]
            distances = {key: 1 - cosine(vector, query_vector) for key, vector in vectors.items()}
            semantic_order = sorted(distances, key=distances.get)
            lexical = {p.doc_id: p.lexical_rank for p in lexical_candidates(data["documents"], query)}
            candidates = [Passage(data["documents"][key]["content"], data["documents"][key]["title"], "Synthetic evaluation", "synthetic.txt", key,
                                  distances[key], rank, lexical[key]) for rank, key in enumerate(semantic_order, start=1)]
        selected = rerank_passages(candidates, query)
        found = [p.doc_id for p in selected]
        recalls.append(len(targets.intersection(found)) / len(targets))
        reciprocal_ranks.append(next((1 / rank for rank, key in enumerate(found, start=1) if key in targets), 0))
    return {"labelled_queries": len(recalls), "recall_at_6": round(statistics.mean(recalls), 4) if recalls else None,
            "mrr_at_6": round(statistics.mean(reciprocal_ranks), 4) if reciprocal_ranks else None}


def cosine(a, b):
    denominator = math.sqrt(sum(x * x for x in a) * sum(x * x for x in b))
    if denominator == 0 or len(a) != len(b):
        raise ValueError("Invalid evaluation vector")
    return sum(x * y for x, y in zip(a, b)) / denominator


def case_prompt(case, documents):
    evidence = [{"source_id": f"S{index}", **documents[key]} for index, key in enumerate(case["evidence_ids"], start=1)]
    return build_grounded_chat_prompt(today=date(2026, 11, 9), conversation_text=build_conversation_transcript(case.get("history", [])),
        birthday_reasoning_text=json.dumps(case.get("trusted_birthday_data", {"intent": "other"})),
        context_text=json.dumps(evidence, ensure_ascii=False), staff_question=case["question"],
        source_ids=tuple(item["source_id"] for item in evidence))


def score_answer(raw, case, prompt):
    try:
        answer = parse_grounded_answer(raw, prompt.source_ids)
    except ValueError as exc:
        result = {"valid_contract": False, "status_correct": False, "required_facts_present": False, "forbidden_facts_absent": False, "passed": False,
                  "contract_error": str(exc)}
        try:
            unvalidated = json.loads(raw)
            if isinstance(unvalidated, dict):
                result["unvalidated_answer_for_human_review"] = str(unvalidated.get("answer", ""))[:6000]
                result["unvalidated_source_ids"] = unvalidated.get("source_ids")
        except (ValueError, TypeError):
            pass
        return result
    lower = answer.answer.casefold()
    checks = {"valid_contract": True, "status_correct": answer.status == case["expected_status"],
              "language_signal_correct": language_matches(answer.answer, case["language"]),
              "required_facts_present": all(term.casefold() in lower for term in case["required_terms"]),
              "forbidden_facts_absent": not any(term.casefold() in lower for term in case["forbidden_terms"])}
    return {**checks, "source_ids_recovered_from_valid_citations": bool(answer.source_ids and not json.loads(raw).get("source_ids")), "passed": all(checks.values())}


def live_generation(data, models, provider, *, delay_seconds=0, previous_reports=()):
    # Importing the providers requires DB configuration, but this command never opens a DB connection.
    os.environ.setdefault("DATABASE_URL", "sqlite://")
    from .providers import _default_profile, _provider_request, _openai_compatible_request
    reports = []
    for model in models:
        profile = {**_default_profile(), "model": model, "timeout_seconds": 90}
        if provider == "deepseek":
            # Environment-only synthetic benchmarking; never store a key in the output artifact.
            profile.update(provider="openai_compatible", base_url="https://api.deepseek.com", structured_output="json_object")
            key = os.getenv("DEEPSEEK_API_KEY", "").strip()
            if not key:
                raise ValueError("DEEPSEEK_API_KEY is required")
        previous = next((item for item in previous_reports if item["model"] == model and item["provider"] == provider), {})
        case_ids = {case["id"] for case in data["cases"]}
        # Preserve completed failures too: resampling only failed answers would inflate quality scores.
        outcomes = [item for item in previous.get("cases", []) if "error_type" not in item and item["id"] in case_ids]
        completed_ids = {item["id"] for item in outcomes}
        latencies = []
        input_tokens, output_tokens = previous.get("input_tokens", 0), previous.get("output_tokens_including_reported_reasoning", 0)
        attempted_now = 0
        for index, case in enumerate(data["cases"], start=1):
            if case["id"] in completed_ids:
                continue
            if attempted_now and delay_seconds:
                time.sleep(delay_seconds)
            attempted_now += 1
            prompt = case_prompt(case, data["documents"])
            started = time.monotonic()
            try:
                if provider == "deepseek":
                    raw = _openai_compatible_request(profile, prompt, False, api_key=key)
                else:
                    raw = _provider_request(profile, prompt)
                outcome = score_answer(raw, case, prompt)
                if outcome["valid_contract"]:
                    outcome["answer_for_human_review"] = parse_grounded_answer(raw, prompt.source_ids).answer
                input_tokens += getattr(raw, "input_tokens", 0)
                output_tokens += getattr(raw, "output_tokens", 0)
            except Exception as exc:
                outcome = {"passed": False, "error_type": type(exc).__name__, "status_code": getattr(exc, "status_code", None)}
            latency = round((time.monotonic() - started) * 1000)
            latencies.append(latency)
            outcomes.append({"id": case["id"], "language": case["language"], "latency_ms": latency, **outcome})
            print(f"{model}: {index}/{len(data['cases'])} checked", file=sys.stderr, flush=True)
            # Authentication/quota errors should not trigger dozens of repeated paid attempts.
            if attempted_now >= 3 and all("error_type" in item for item in outcomes[-3:]):
                break
        completed = sum("error_type" not in item for item in outcomes)
        passed = sum(item["passed"] for item in outcomes)
        reports.append({"model": model, "provider": provider, "evaluated": len(outcomes), "requested": len(data["cases"]),
                        "passed": passed, "pass_rate": round(passed / len(outcomes), 4),
                        "completed_responses": completed, "response_pass_rate": round(passed / completed, 4) if completed else None,
                        "request_failures": len(outcomes) - completed, "unattempted": len(data["cases"]) - len(outcomes),
                        "requests_this_invocation": attempted_now, "latency_scope": "requests in latest invocation",
                        "latency_p50_ms": round(statistics.median(latencies)) if latencies else previous.get("latency_p50_ms"),
                        "latency_p95_ms": sorted(latencies)[math.ceil(0.95 * len(latencies)) - 1] if latencies else previous.get("latency_p95_ms"),
                        "input_tokens": input_tokens, "output_tokens_including_reported_reasoning": output_tokens,
                        "cost_usd": None, "cost_note": "Apply the provider's current tariff; no price assumptions are embedded.", "cases": outcomes})
    return reports


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Send synthetic gold-evidence questions to real models; incurs provider usage")
    parser.add_argument("--live-retrieval", action="store_true", help="Embed the synthetic corpus and queries using Gemini; incurs usage")
    parser.add_argument("--provider", choices=["gemini", "deepseek"], default="gemini")
    parser.add_argument("--models", nargs="+")
    parser.add_argument("--delay-seconds", type=float, default=3, help="Pause between live requests to respect provider rate limits (0-60)")
    parser.add_argument("--resume", action="store_true", help="With --output, preserve completed answers and retry only request failures/unattempted cases")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--case-ids", nargs="+", help="Run only these fixture IDs for diagnosis")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    if not 0 <= args.delay_seconds <= 60:
        parser.error("--delay-seconds must be between 0 and 60")
    args.models = args.models or (["deepseek-flash"] if args.provider == "deepseek" else ["gemini-3.5-flash-lite", "gemini-3.8-flash"])
    previous_reports = []
    if args.resume:
        if not args.live or not args.output or not args.output.exists():
            parser.error("--resume requires --live and an existing --output report")
        previous = json.loads(args.output.read_text())
        if previous.get("prompt_version") != PROMPT_VERSION:
            parser.error("The previous report uses a different prompt version")
        previous_reports = previous.get("live_generation_with_gold_evidence") or []
    data = load_cases()
    if args.case_ids:
        data["cases"] = [case for case in data["cases"] if case["id"] in args.case_ids]
        if len(data["cases"]) != len(set(args.case_ids)):
            parser.error("Unknown case ID")
    if args.limit is not None:
        if args.limit < 1:
            parser.error("--limit must be positive")
        data["cases"] = data["cases"][:args.limit]
    report = {"prompt_version": PROMPT_VERSION, "dataset_version": data["version"], "synthetic_only": True,
              "fixture_count": len(data["cases"]), "languages": dict(Counter(case["language"] for case in data["cases"])),
              "offline_lexical_retrieval": retrieval_metrics(data), "live_generation_with_gold_evidence": None,
              "limitations": ["Synthetic fixtures do not measure production accuracy.", "This fixture suite is used for tuning/regression and is not a held-out evaluation set.",
                             "Generation uses gold evidence; this is not an end-to-end database benchmark.",
                             "Fact checks use explicit terms/status/schema, not a semantic judge. Language quality and faithfulness need human review."]}
    if args.live or args.live_retrieval:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parents[1] / ".env")
    if args.live_retrieval:
        from .embeddings import get_embedding
        vectors = {key: get_embedding(doc["content"], title=doc["title"]) for key, doc in data["documents"].items()}
        query_vectors = {case["id"]: get_embedding(build_retrieval_query(case.get("history", []), case["question"]), task_type=None)
                         for case in data["cases"] if case["retrieval_targets"]}
        report["live_in_memory_hybrid_retrieval"] = retrieval_metrics(data, vectors=vectors, query_vectors=query_vectors)
    if args.live:
        report["live_generation_with_gold_evidence"] = live_generation(data, args.models, args.provider, delay_seconds=args.delay_seconds, previous_reports=previous_reports)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return int(bool(args.live and any(item["evaluated"] != item["requested"] or item["passed"] != item["evaluated"] for item in report["live_generation_with_gold_evidence"])))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Evaluation failed ({type(exc).__name__}); check configuration. No secret or provider body is logged.", file=sys.stderr)
        raise SystemExit(1) from None
