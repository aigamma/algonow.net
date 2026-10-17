"""Starting point: the chunker that shipped with the fixed-window change.

Replace chunk_document so retrieval recovers whole procedures again without
raising the prompt budget. The tests spell out the contract:

  * every chunk's body equals doc.text[start:end], so citations stay exact
  * len(chunk.text) <= max_chars, where text is "breadcrumb\\nbody"
  * breadcrumb is the heading trail, for example "API keys > Scopes"
  * a numbered procedure is never split across chunks
  * an oversized paragraph is split at sentence boundaries
  * bad budgets and non-string text fail loudly

Grade this module instead of the reference with:
  RAG_CHUNKER=rag_chunking.starter PYTHONPATH=src python -m unittest discover -s tests
"""
from __future__ import annotations

from .pipeline import MAX_CHARS, Chunk, Document, fixed_window_chunks


def chunk_document(doc: Document, max_chars: int = MAX_CHARS) -> list[Chunk]:
    # Fixed character windows: cheap, predictable, and blind to the document.
    # This is what cut the procedures in half. Rewrite it.
    return fixed_window_chunks(doc, max_chars)
