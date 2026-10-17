"""The fixed retrieval harness every chunker is measured with. Do not change it.

Runbooks become Documents, a chunker turns each into Chunks, BM25 ranks the
chunks, and evaluate() reports answer recall at k (the whole labeled answer is
inside one of the top k chunks) and the intact rate (it is inside some chunk
at all). The prompt budget is enforced here, so recall cannot be bought with
giant chunks.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
MAX_CHARS = 500   # characters of chunk text the prompt builder will paste
TOP_K = 3         # chunks handed to the answering model


@dataclass(frozen=True)
class Document:
    id: str
    title: str
    text: str


@dataclass(frozen=True)
class Chunk:
    doc_id: str
    breadcrumb: str   # heading trail such as "API keys > Scopes"; empty if unknown
    start: int        # offsets into Document.text, so citations can be exact
    end: int
    body: str         # must equal text[start:end]

    @property
    def text(self) -> str:
        """What the index sees and what the prompt builder pastes."""
        return f"{self.breadcrumb}\n{self.body}" if self.breadcrumb else self.body


class BudgetError(ValueError):
    """A chunk is larger than the prompt budget allows."""


def load_runbooks(root: Path = FIXTURES / "runbooks") -> list[Document]:
    docs = []
    for path in sorted(root.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        title = re.search(r"^# (.+)$", text, flags=re.M)
        docs.append(Document(path.stem, title.group(1).strip() if title else path.stem, text))
    if not docs:
        raise FileNotFoundError(f"no runbooks under {root}")
    return docs


def load_queries(path: Path = FIXTURES / "queries.json") -> list[dict]:
    with open(path, encoding="utf-8") as handle:
        queries = json.load(handle)
    for query in queries:
        if set(query) != {"id", "query", "doc", "span"} or len(query["span"]) != 2:
            raise ValueError(f"malformed query record: {query}")
    return queries


def resolve_span(doc: Document, markers: list[str]) -> str:
    """The labeled answer: from the first marker through the end of the last.
    Both markers must occur exactly once so the label is unambiguous."""
    head, tail = markers
    if doc.text.count(head) != 1 or doc.text.count(tail) != 1:
        raise ValueError(f"{doc.id}: span markers must be unique: {markers}")
    start, end = doc.text.index(head), doc.text.index(tail) + len(tail)
    if end <= start:
        raise ValueError(f"{doc.id}: span ends before it starts: {markers}")
    return doc.text[start:end]


STOPWORDS = frozenset(
    "a an and are as at be by can do does for from how i if in is it my of on or our "
    "should that the their there this to we what when where which with you your".split()
)
TOKEN = re.compile(r"[a-z0-9]+")
SUFFIXES = (("ied", "y"), ("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", ""))


def stem(token: str) -> str:
    """A light suffix stripper (webhooks -> webhook, retries -> retry), not Porter."""
    for suffix, replacement in SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= 3:
            return token[: -len(suffix)] + replacement
    return token


def tokenize(text: str) -> list[str]:
    return [stem(t) for t in TOKEN.findall(text.lower()) if t not in STOPWORDS]


class BM25Index:
    """Okapi BM25 over chunk text: the lexical retriever this assistant ships."""

    def __init__(self, chunks, k1: float = 1.5, b: float = 0.75):
        self.chunks = list(chunks)
        self.k1, self.b = k1, b
        self.counts = [Counter(tokenize(c.text)) for c in self.chunks]
        self.lengths = [sum(tf.values()) for tf in self.counts]
        self.avg_len = sum(self.lengths) / len(self.lengths) if self.lengths else 0.0
        df: Counter = Counter()
        for tf in self.counts:
            df.update(tf.keys())
        n = len(self.chunks)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def score(self, terms: list[str], index: int) -> float:
        tf, length = self.counts[index], self.lengths[index]
        norm = self.k1 * (1 - self.b + self.b * length / self.avg_len) if self.avg_len else self.k1
        return sum(self.idf[t] * tf[t] * (self.k1 + 1) / (tf[t] + norm) for t in terms if t in tf)

    def search(self, query: str, k: int = TOP_K) -> list[Chunk]:
        terms = tokenize(query)
        ranked = sorted(range(len(self.chunks)), key=lambda i: (-self.score(terms, i), i))
        return [self.chunks[i] for i in ranked[:k] if self.score(terms, i) > 0]


def fixed_window_chunks(doc: Document, max_chars: int = MAX_CHARS, overlap: int = 0) -> list[Chunk]:
    """The chunker that shipped: character windows with no idea of structure."""
    if not isinstance(doc.text, str):
        raise TypeError("document text must be a string")
    if max_chars <= 0 or overlap < 0 or overlap >= max_chars:
        raise ValueError("need 0 <= overlap < max_chars")
    chunks = []
    for start in range(0, len(doc.text), max_chars - overlap):
        body = doc.text[start:start + max_chars]
        if body.strip():
            chunks.append(Chunk(doc.id, "", start, start + len(body), body))
    return chunks


def normalize(text: str) -> str:
    return " ".join(text.split())


@dataclass
class Evaluation:
    recall: float               # answer intact inside one of the top k retrieved chunks
    intact: float               # answer intact inside some chunk at all: the chunker's own job
    hits: dict[str, bool]
    intact_by_query: dict[str, bool]
    chunk_count: int
    longest_text: int


def evaluate(chunker, docs: list[Document], queries: list[dict], k: int = TOP_K,
             max_chars: int = MAX_CHARS) -> Evaluation:
    """Answer recall at k with the budget enforced. An answer that is intact
    but outranked is a retrieval problem, not a boundary problem."""
    chunks: list[Chunk] = []
    for doc in docs:
        for chunk in chunker(doc):
            if len(chunk.text) > max_chars:
                raise BudgetError(f"{doc.id}: a {len(chunk.text)} character chunk exceeds the {max_chars} budget")
            chunks.append(chunk)
    index = BM25Index(chunks)
    by_id = {doc.id: doc for doc in docs}
    hits, intact = {}, {}
    for query in queries:
        answer = normalize(resolve_span(by_id[query["doc"]], query["span"]))

        def holds(chunk):
            return chunk.doc_id == query["doc"] and answer in normalize(chunk.body)

        hits[query["id"]] = any(holds(c) for c in index.search(query["query"], k))
        intact[query["id"]] = any(holds(c) for c in chunks)
    share = lambda table: sum(table.values()) / len(table) if table else 0.0
    return Evaluation(share(hits), share(intact), hits, intact, len(chunks),
                      max((len(c.text) for c in chunks), default=0))
