"""Reference repair: follow the document's own structure, then pack to budget.

Markdown already marks the meaning boundaries: headings open a context, blank
lines separate blocks, a numbered list is one unit. Walk those blocks, carry
the heading trail as a breadcrumb, pack whole blocks greedily, and cut inside
a block only when it alone exceeds the budget, at sentence ends. Every chunk
is a contiguous span of the original text.
"""
from __future__ import annotations

import re

from .pipeline import MAX_CHARS, Chunk, Document

HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*$")
LIST_ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*+])\s+")
SENTENCE_END = re.compile(r"[.!?](?=\s)")
MIN_BODY = 40   # a budget that leaves less room than this is a configuration error


def _blocks(text: str) -> list[tuple[str, int, int]]:
    """(kind, start, end) for each heading, list, or paragraph block."""
    blocks: list[tuple[str, int, int]] = []
    kind = start = end = None
    position = 0
    for line in text.splitlines(keepends=True):
        line_start, position = position, position + len(line)
        stripped = line.strip()
        if not stripped:                      # blank line closes the open block
            if kind:
                blocks.append((kind, start, end))
            kind = None
            continue
        if HEADING.match(stripped):           # a heading is its own block
            if kind:
                blocks.append((kind, start, end))
            kind = None
            first = line_start + len(line) - len(line.lstrip())
            blocks.append(("heading", first, line_start + len(line.rstrip())))
            continue
        line_kind = "list" if LIST_ITEM.match(line) else "paragraph"
        if kind is None or (line_kind == "list" and kind == "paragraph"):
            if kind:
                blocks.append((kind, start, end))
            kind, start = line_kind, line_start + len(line) - len(line.lstrip())
        end = line_start + len(line.rstrip())  # a plain line under a list continues it
    if kind:
        blocks.append((kind, start, end))
    return blocks


def _split_oversized(text: str, start: int, end: int, budget: int) -> list[tuple[int, int]]:
    """Cut one block into contiguous pieces of at most budget characters."""
    pieces = []
    position = start
    while position < end:
        limit = min(end, position + budget)
        if limit == end:
            pieces.append((position, end))
            break
        window = text[position:limit + 1]
        cut = None
        for match in SENTENCE_END.finditer(window):   # prefer the last sentence end
            if 0 < match.end() <= budget:
                cut = position + match.end()
        if cut is None:                                 # then the last whitespace
            spaces = [i for i, ch in enumerate(window[:budget + 1]) if ch.isspace()]
            cut = position + spaces[-1] if spaces else limit
        piece_end = cut
        while piece_end > position and text[piece_end - 1].isspace():
            piece_end -= 1
        if piece_end > position:
            pieces.append((position, piece_end))
        position = cut
        while position < end and text[position].isspace():
            position += 1
    return pieces


def chunk_document(doc: Document, max_chars: int = MAX_CHARS) -> list[Chunk]:
    if not isinstance(doc.text, str):
        raise TypeError("document text must be a string")
    if isinstance(max_chars, bool) or not isinstance(max_chars, int) or max_chars < MIN_BODY:
        raise ValueError(f"max_chars must be an integer of at least {MIN_BODY}")
    text = doc.text
    chunks: list[Chunk] = []
    levels: dict[int, str] = {}
    pending: list[tuple[int, int]] = []

    def breadcrumb() -> str:
        return " > ".join(levels[k] for k in sorted(levels)) or doc.title

    def flush(crumb: str) -> None:
        if pending:
            start, end = pending[0][0], pending[-1][1]
            chunks.append(Chunk(doc.id, crumb, start, end, text[start:end]))
            pending.clear()

    crumb = breadcrumb()
    for kind, start, end in _blocks(text):
        if kind == "heading":
            flush(crumb)
            hashes, title = HEADING.match(text[start:end].strip()).groups()
            levels = {k: v for k, v in levels.items() if k < len(hashes)}
            levels[len(hashes)] = title
            crumb = breadcrumb()
            continue
        budget = max_chars - len(crumb) - 1
        if budget < MIN_BODY:
            raise ValueError(f"max_chars leaves no room for text under {crumb!r}")
        if pending and end - pending[0][0] > budget:   # this block will not fit
            flush(crumb)
        if end - start <= budget:
            pending.append((start, end))
        else:                                           # larger than any chunk
            flush(crumb)
            for piece in _split_oversized(text, start, end, budget):
                chunks.append(Chunk(doc.id, crumb, piece[0], piece[1], text[piece[0]:piece[1]]))
    flush(crumb)
    return chunks
