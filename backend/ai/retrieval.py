"""Postgres hybrid candidate retrieval and deterministic, inspectable relevance reranking."""

import math
import os
import re
from collections import Counter
from dataclasses import dataclass

from sqlalchemy import text

from .embeddings import EMBEDDING_DIMENSIONS, EMBEDDING_VERSION

_STOP = set("a an the is are was were be my me i we our you your what which how when where can could do does for of to and or in on at with please tell about policy safeway saya kami anda apakah apa berapa bila yang dan atau di ke dari untuk boleh ini itu 的了是在有我你他她它多少什么怎么如何请问是否公司政策".split())
_CJK_STOP = {"什么", "多少", "怎么", "如何", "请问", "是否", "公司", "政策", "这个", "那个", "可以", "的是", "我的"}


def query_terms(query: str) -> list[str]:
    query = query.removeprefix("task: search result | query: ").casefold()
    terms = [term for term in re.findall(r"[a-z0-9]+(?:[-./][a-z0-9]+)*", query) if len(term) > 1 and term not in _STOP]
    for run in re.findall(r"[\u3400-\u9fff]+", query):
        terms.extend(run[i:i + 2] for i in range(len(run) - 1) if run[i:i + 2] not in _CJK_STOP)
    return list(dict.fromkeys(terms))[:16]


@dataclass(frozen=True)
class Passage:
    content: str
    title: str
    category: str
    file_path: str
    doc_id: str
    distance: float
    semantic_rank: int | None = None
    lexical_rank: int | None = None

    @property
    def key(self):
        return self.doc_id, self.content


def rerank_passages(passages: list[Passage], query: str, *, limit: int = 6, min_similarity: float = 0.35) -> list[Passage]:
    """Fuse rank positions and lexical coverage. This is not a trained cross-encoder or a confidence score."""
    terms = query_terms(query)
    scored = []
    seen = set()
    for passage in passages:
        if passage.key in seen or not math.isfinite(passage.distance):
            continue
        seen.add(passage.key)
        haystack = f"{passage.title} {passage.content}".casefold()
        hits = sum(term in haystack for term in terms)
        coverage = hits / len(terms) if terms else 0
        strong_lexical = coverage >= 0.5 and (hits >= 2 or (hits == 1 and len(terms) == 1 and len(terms[0]) >= 4))
        if 1 - passage.distance < min_similarity and not strong_lexical:
            continue
        rrf = sum(1 / (60 + rank) for rank in (passage.semantic_rank, passage.lexical_rank) if rank)
        score = rrf + 0.015 * coverage
        scored.append((score, passage))
    scored.sort(key=lambda item: (-item[0], item[1].distance, str(item[1].doc_id), item[1].content))
    counts = Counter()
    selected = []
    for _, passage in scored:
        if counts[passage.doc_id] < 3:
            selected.append(passage)
            counts[passage.doc_id] += 1
        if len(selected) == limit:
            break
    return selected


def retrieve_passages(db, query_vector: list[float], query: str) -> list[Passage]:
    if len(query_vector) != EMBEDDING_DIMENSIONS or not all(math.isfinite(x) for x in query_vector):
        raise ValueError("Invalid query vector")
    terms = query_terms(query)
    match = " + ".join(f"CASE WHEN strpos(lower(c.content), :term{i}) > 0 THEN 1 ELSE 0 END" for i in range(len(terms))) or "0"
    sql = f'''
        WITH semantic AS (
            SELECT c.doc_id, c.content,
                   row_number() OVER (ORDER BY c.embedding <=> CAST(:vector AS vector), c.doc_id, md5(c.content)) AS rank
            FROM "AI chatbot".document_chunks c
            WHERE c.embedding_version = :version
            ORDER BY c.embedding <=> CAST(:vector AS vector), c.doc_id, md5(c.content) LIMIT :candidates
        ), lexical_scores AS (
            SELECT c.doc_id, c.content,
                   ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', :query)) + ({match}) AS score
            FROM "AI chatbot".document_chunks c WHERE c.embedding_version = :version
        ), lexical AS (
            SELECT doc_id, content, row_number() OVER (ORDER BY score DESC, doc_id, md5(content)) AS rank
            FROM lexical_scores WHERE score > 0 ORDER BY score DESC, doc_id, md5(content) LIMIT :candidates
        ), candidates AS (
            SELECT doc_id, content FROM semantic UNION SELECT doc_id, content FROM lexical
        )
        SELECT c.content, k.title, k.category, k.file_path, c.doc_id,
               c.embedding <=> CAST(:vector AS vector) AS distance, s.rank, l.rank
        FROM "AI chatbot".document_chunks c
        JOIN candidates x ON x.doc_id = c.doc_id AND x.content = c.content
        JOIN "AI chatbot".knowledge_base k ON k.id = c.doc_id
        LEFT JOIN semantic s ON s.doc_id = c.doc_id AND s.content = c.content
        LEFT JOIN lexical l ON l.doc_id = c.doc_id AND l.content = c.content
        WHERE c.embedding_version = :version
    '''
    params = {"vector": str(query_vector), "version": EMBEDDING_VERSION, "candidates": 24, "query": query.removeprefix("task: search result | query: ")}
    params.update({f"term{i}": term for i, term in enumerate(terms)})
    rows = db.execute(text(sql), params).fetchall()
    passages = [Passage(*row) for row in rows]
    minimum = float(os.getenv("AI_RETRIEVAL_MIN_SIMILARITY", "0.35"))
    if not 0 <= minimum <= 1:
        raise ValueError("AI_RETRIEVAL_MIN_SIMILARITY must be between zero and one")
    return rerank_passages(passages, query, min_similarity=minimum)
