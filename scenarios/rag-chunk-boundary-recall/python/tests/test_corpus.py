"""Behind-the-scenes evaluation: the lesson's pack_blocks over six full runbooks
and twenty-three labeled questions, through the BM25 harness in pipeline.py.
Thresholds are exact on these deterministic fixtures; measured values are noted."""
import re
import unittest
from functools import partial

from rag_chunking import practice_answer, solution
from rag_chunking.pipeline import (MAX_CHARS, TOP_K, BM25Index, BudgetError, IndexedChunk, evaluate,
                                   fixed_window_chunks, load_queries, load_runbooks, packed, parse_blocks,
                                   resolve_span, tokenize)

RUNBOOKS = load_runbooks()
QUERIES = load_queries()
BY_ID = {doc.id: doc for doc in RUNBOOKS}
chunk_document = packed(solution.pack_blocks)
PROCEDURE = re.compile(r"(?m)^(?:\d+\. .*(?:\n|$))+")   # consecutive numbered lines, found without the parser


def letters(text):
    return "".join(text.split())


class ParsedRunbooks(unittest.TestCase):
    """The input shape the worked example assumes, checked on the real runbooks."""

    def test_every_block_fits_the_corpus_budget(self):
        # measured: the largest single block makes a 456-character chunk text, so the
        # worked example's reject policy never fires on this corpus
        longest = max(len(solution.chunk_text(block["heading"], block["text"]))
                      for doc in RUNBOOKS for block in parse_blocks(doc.text))
        self.assertEqual(longest, 456)
        self.assertLessEqual(longest, MAX_CHARS)

    def test_numbered_procedures_arrive_as_one_block(self):
        count = 0
        for doc in RUNBOOKS:
            texts = {block["text"] for block in parse_blocks(doc.text)}
            for procedure in PROCEDURE.findall(doc.text):
                self.assertIn(procedure.strip(), texts, doc.id)
                count += 1
        self.assertEqual(count, 14)

    def test_blocks_carry_a_heading_trail_and_no_heading_text(self):
        for doc in RUNBOOKS:
            blocks = parse_blocks(doc.text)
            self.assertGreaterEqual(len(blocks), 5, doc.id)
            for block in blocks:
                self.assertTrue(block["heading"].startswith(doc.title), block["heading"])
                self.assertNotIn("#", block["text"])
                self.assertNotIn("\n\n", block["text"])
                self.assertEqual(block["text"], block["text"].strip())
        trails = {block["heading"] for block in parse_blocks(BY_ID["api-keys"].text)}
        self.assertIn("API keys > Rotate a key without downtime", trails)


class FixtureIntegrity(unittest.TestCase):
    def test_every_labeled_answer_is_verbatim_and_fits_one_chunk(self):
        self.assertEqual(len(QUERIES), 23)
        self.assertEqual(len({query["id"] for query in QUERIES}), 23)
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
        index = BM25Index(IndexedChunk("d", "", text) for text in texts)
        self.assertGreater(index.idf["webhook"], index.idf["signature"])
        self.assertEqual(index.search("webhook digest", k=1)[0].body, texts[0])
        self.assertEqual(index.search("zebra", k=3), [], "no matching term, no result")
        self.assertEqual(tokenize("The Exports, the EXPORT!"), ["export", "export"])


class Baselines(unittest.TestCase):
    def test_fixed_windows_reproduce_the_reported_regression(self):
        plain = evaluate(fixed_window_chunks, RUNBOOKS, QUERIES)
        self.assertLessEqual(plain.recall, 0.5)          # measured 8 of 23
        self.assertLessEqual(plain.intact, 0.5, "most answers are cut by a window boundary")   # 9 of 23
        overlapped = evaluate(partial(fixed_window_chunks, overlap=100), RUNBOOKS, QUERIES)
        self.assertLessEqual(overlapped.recall, 0.7, "overlap is not the fix")   # measured 12 of 23

    def test_whole_documents_are_rejected_even_though_they_would_score_perfectly(self):
        def whole(doc, max_chars):
            return [IndexedChunk(doc.id, "", doc.text)]
        with self.assertRaises(BudgetError):
            evaluate(whole, RUNBOOKS, QUERIES)


class PackedRunbooks(unittest.TestCase):
    def test_every_answer_is_intact_in_some_chunk(self):
        # the packer's own job, exact: no labeled answer may straddle a boundary
        result = evaluate(chunk_document, RUNBOOKS, QUERIES, TOP_K)
        self.assertEqual(result.intact, 1.0, [q for q, ok in result.intact_by_query.items() if not ok])
        self.assertEqual(result.chunk_count, 30)
        self.assertEqual(result.longest_text, 494)

    def test_answer_recall_at_three_clears_the_bar(self):
        # measured 21 of 23; the two known misses are ranking failures, not cuts:
        # q01 is outranked by its own section's intro, q19 shares no vocabulary
        result = evaluate(chunk_document, RUNBOOKS, QUERIES, TOP_K)
        misses = {q for q, hit in result.hits.items() if not hit}
        self.assertGreaterEqual(result.recall, 0.9, sorted(misses))
        self.assertTrue(misses <= {"q01", "q19"}, f"new misses: {sorted(misses - {'q01', 'q19'})}")

    def test_chunks_are_whole_blocks_in_order_with_nothing_lost(self):
        for doc in RUNBOOKS:
            blocks = parse_blocks(doc.text)
            chunks = chunk_document(doc)
            self.assertEqual(letters("".join(chunk.body for chunk in chunks)),
                             letters("".join(block["text"] for block in blocks)), doc.id)
            for chunk in chunks:
                for piece in chunk.body.split("\n\n"):
                    self.assertIn(piece, [block["text"] for block in blocks], "every piece is one whole block")

    def test_practice_answer_packs_the_corpus_identically(self):
        self.assertEqual(packed(practice_answer.pack_blocks)(BY_ID["api-keys"]), chunk_document(BY_ID["api-keys"]))
        result = evaluate(packed(practice_answer.pack_blocks), RUNBOOKS, QUERIES, TOP_K)
        self.assertEqual(result.intact, 1.0)
        self.assertEqual(sum(result.hits.values()), 21)


if __name__ == "__main__":
    unittest.main()
