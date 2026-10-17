"""Retrieval evaluation: does the chunker give the answering model whole answers?
RAG_CHUNKER selects the module under test (default: the reference solution).
Thresholds are exact on these deterministic fixtures; measured values are noted."""
import importlib
import os
import unittest
from functools import partial

from rag_chunking.pipeline import (MAX_CHARS, TOP_K, BM25Index, BudgetError, Chunk, evaluate,
                                   fixed_window_chunks, load_queries, load_runbooks, resolve_span, tokenize)

CHUNKER = importlib.import_module(os.environ.get("RAG_CHUNKER", "rag_chunking.solution"))
RUNBOOKS = load_runbooks()
QUERIES = load_queries()
BY_ID = {doc.id: doc for doc in RUNBOOKS}


class FixtureIntegrity(unittest.TestCase):
    def test_every_labeled_answer_is_verbatim_and_fits_one_chunk(self):
        self.assertGreaterEqual(len(QUERIES), 20)
        self.assertEqual(len({q["id"] for q in QUERIES}), len(QUERIES))
        for query in QUERIES:
            answer = resolve_span(BY_ID[query["doc"]], query["span"])
            self.assertEqual(BY_ID[query["doc"]].text.count(answer), 1, query["id"])
            self.assertLessEqual(len(answer), MAX_CHARS - 60, "answers must leave room for a heading trail")

    def test_queries_are_paraphrases_not_copied_text(self):
        for query in QUERIES:
            for doc in RUNBOOKS:
                self.assertNotIn(query["query"].lower(), doc.text.lower(), query["id"])
            self.assertNotIn(query["span"][0].lower(), query["query"].lower(), query["id"])


class Bm25Sanity(unittest.TestCase):
    def test_rare_terms_outrank_common_ones(self):
        texts = ["webhook signature digest header", "export job files manifest", "signature of the export manifest"]
        index = BM25Index(Chunk("d", "", 0, 1, t) for t in texts)
        self.assertGreater(index.idf["webhook"], index.idf["signature"])
        self.assertEqual(index.search("webhook digest", k=1)[0].body, texts[0])
        self.assertEqual(index.search("zebra", k=3), [], "no matching term, no result")
        self.assertEqual(tokenize("The Exports, the EXPORT!"), ["export", "export"])


class RetrievalRegression(unittest.TestCase):
    def test_fixed_windows_reproduce_the_reported_regression(self):
        plain = evaluate(partial(fixed_window_chunks, max_chars=MAX_CHARS), RUNBOOKS, QUERIES)
        self.assertLessEqual(plain.recall, 0.5)          # measured 8/23
        self.assertLessEqual(plain.intact, 0.5, "most answers are cut by a window boundary")   # 9/23
        overlapped = evaluate(partial(fixed_window_chunks, max_chars=MAX_CHARS, overlap=100), RUNBOOKS, QUERIES)
        self.assertLessEqual(overlapped.recall, 0.7, "overlap is not the fix")   # measured 12/23

    def test_whole_documents_are_rejected_even_though_they_would_score_perfectly(self):
        def whole(doc):
            return [Chunk(doc.id, "", 0, len(doc.text), doc.text)]
        with self.assertRaises(BudgetError):
            evaluate(whole, RUNBOOKS, QUERIES)


class StructureAwareRetrieval(unittest.TestCase):
    def test_every_answer_is_intact_in_some_chunk(self):
        # The chunker's own job, exact: no labeled answer may straddle a boundary.
        result = evaluate(CHUNKER.chunk_document, RUNBOOKS, QUERIES, TOP_K)
        self.assertEqual(result.intact, 1.0, [q for q, ok in result.intact_by_query.items() if not ok])
        self.assertLessEqual(result.longest_text, MAX_CHARS)

    def test_answer_recall_at_three_clears_the_bar(self):
        # measured 21/23. The two known misses are ranking failures, not cuts:
        # q01 is outranked by its own section's intro, q19 shares no vocabulary.
        result = evaluate(CHUNKER.chunk_document, RUNBOOKS, QUERIES, TOP_K)
        misses = {q for q, hit in result.hits.items() if not hit}
        self.assertGreaterEqual(result.recall, 0.9, sorted(misses))
        self.assertTrue(misses <= {"q01", "q19"}, f"new misses: {sorted(misses - {'q01', 'q19'})}")


if __name__ == "__main__":
    unittest.main()
