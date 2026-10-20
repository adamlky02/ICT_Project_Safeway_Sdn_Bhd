"""Keep product and source-page labels attached to searchable catalogue passages."""

import re
from textwrap import wrap


# Catalogue Boundaries (recognizes explicit product and source-page markers in extracted text)
PRODUCT_HEADER = re.compile(r"^=== PRODUCT: (.+?) ===$", re.MULTILINE)
PAGE_HEADER = re.compile(r"^--- PAGE (\d+) ---$", re.MULTILINE)


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
        parts = wrap(line, width=capacity, break_long_words=False, break_on_hyphens=False) or [line]
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
    """Use product/page boundaries in an AI-ready catalogue; retain legacy text behavior otherwise."""
    products = list(PRODUCT_HEADER.finditer(text))
    if not products:
        return [text[i:i + 1000] for i in range(0, len(text), 1000)]

    sections = [
        text[product.end():products[index + 1].start() if index + 1 < len(products) else len(text)]
        for index, product in enumerate(products)
    ]
    # Legacy Text Fallback (avoids discarding introductory text or product sections without page markers)
    if text[:products[0].start()].strip() or any(not PAGE_HEADER.search(section) for section in sections):
        return [text[i:i + 1000] for i in range(0, len(text), 1000)]

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
