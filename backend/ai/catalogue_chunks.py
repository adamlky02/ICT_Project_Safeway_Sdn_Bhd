"""Keep product and source-page labels attached to searchable catalogue passages."""

import re
from textwrap import wrap


# Catalogue Boundaries (recognizes explicit product and source-page markers in extracted text)
PRODUCT_HEADER = re.compile(r"^=== PRODUCT: (.+?) ===$", re.MULTILINE)
PAGE_HEADER = re.compile(r"^--- PAGE (\d+) ---$", re.MULTILINE)


def _split_regular(text: str, max_chars: int, overlap: int = 160) -> list[str]:
    """Prefer section, paragraph and sentence boundaries; retain bounded overlap within a section."""
    if max_chars < 100:
        raise ValueError("Chunk size must be at least 100 characters")
    chunks = []
    sections = re.split(r"(?m)(?=^#{1,6}\s+)", text)
    for section in sections:
        start = 0
        while start < len(section):
            end = min(start + max_chars, len(section))
            if end < len(section):
                boundaries = list(re.finditer(r"\n|[.!?。！？；;](?:\s|$)", section[start + max_chars // 2:end]))
                if boundaries:
                    end = start + max_chars // 2 + boundaries[-1].end()
            part = section[start:end].strip()
            if part:
                chunks.append(part)
            if end == len(section):
                break
            start = max(start + 1, end - min(overlap, max_chars // 4))
    return chunks


# Page Chunk Assembly (reserves room for source labels and repeats them on every passage)
def _split_page(text: str, prefix: str, max_chars: int) -> list[str]:
    capacity = max_chars - len(prefix) - 2
    if capacity < 100:
        raise ValueError("Chunk size is too small for catalogue metadata")

    chunks: list[str] = []
    current = ""
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = wrap(line, width=capacity, break_long_words=True, break_on_hyphens=False) or [line]
        for part in parts:
            candidate = f"{current}\n{part}" if current else part
            if len(candidate) > capacity and current:
                chunks.append(f"{prefix}\n{current}")
                current = part
            else:
                current = candidate
    if current:
        chunks.append(f"{prefix}\n{current}")
    return chunks


def build_index_chunks(text: str, max_chars: int = 1600) -> list[str]:
    """Keep catalogue product/page boundaries and use overlapping sections for ordinary documents."""
    products = list(PRODUCT_HEADER.finditer(text))
    if not products:
        pages = list(PAGE_HEADER.finditer(text))
        if pages and not text[:pages[0].start()].strip():
            chunks = []
            for index, page in enumerate(pages):
                end = pages[index + 1].start() if index + 1 < len(pages) else len(text)
                prefix = f"Source page: {page.group(1)}\n"
                chunks.extend(prefix + part for part in _split_regular(text[page.end():end], max_chars - len(prefix)))
            return chunks
        return _split_regular(text, max_chars)

    sections = [
        text[product.end():products[index + 1].start() if index + 1 < len(products) else len(text)]
        for index, product in enumerate(products)
    ]
    # Legacy Text Fallback (avoids discarding introductory text or product sections without page markers)
    if text[:products[0].start()].strip() or any(not PAGE_HEADER.search(section) for section in sections):
        return _split_regular(text, max_chars)

    chunks: list[str] = []
    # Source-Bounded Chunking (keeps each passage within one product and one catalogue page)
    for product, section in zip(products, sections):
        pages = list(PAGE_HEADER.finditer(section))
        for page_index, page in enumerate(pages):
            page_end = pages[page_index + 1].start() if page_index + 1 < len(pages) else len(section)
            content = section[page.end():page_end]
            prefix = f"Product: {product.group(1)}\nSource: Catalogue.pdf, page {page.group(1)}"
            chunks.extend(_split_page(content, prefix, max_chars))
    return chunks
