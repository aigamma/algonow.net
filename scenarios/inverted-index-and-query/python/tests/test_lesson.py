"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Every expectation is exact:
the documents are fixed text and nothing is random."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from inverted_index import practice_answer
from inverted_index.solution import DOCS, QUERIES, and_query, build_index, postings_read, tokenize

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "inverted_index"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
OR_QUERY = practice_answer.OR_QUERY


def run_alone(name):
    """Copy one lesson file by itself into an empty directory and run it with
    python -I -S and a minimal environment: no package, no import path, no siblings."""
    keep = {"PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE"}
    env = {key: value for key, value in os.environ.items() if key.upper() in keep}
    with tempfile.TemporaryDirectory() as empty:
        shutil.copyfile(PACKAGE / name, Path(empty) / name)
        return subprocess.run([sys.executable, "-I", "-S", name], cwd=empty, env=env,
                              capture_output=True, text=True, timeout=60)


def expected(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def scan_query(docs, terms):
    """What shipped: read every document and keep the ones that contain every term."""
    found = []
    for doc in docs:
        words = set(tokenize(doc["text"]))
        if all(term in words for term in terms):
            found.append(doc["id"])
    return found


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_tokenize_lowercases_strips_punctuation_and_splits(self):
        self.assertEqual(tokenize("Rotate, the KEY!!"), ["rotate", "the", "key"])
        self.assertEqual(tokenize("E4031: key\tnot   active\n"), ["e4031", "key", "not", "active"])
        self.assertEqual(tokenize("???"), [])
        self.assertEqual(tokenize(DOCS[0]["text"]), ["rotate", "the", "api", "key", "then", "revoke", "the", "old", "key"])

    def test_postings_follow_input_order_and_list_a_repeated_term_once(self):
        index = build_index(DOCS)
        self.assertEqual(len(index), 31)
        self.assertEqual(index["key"], ["d1", "d3"], "key appears twice in d1 and twice in d3, listed once each")
        self.assertEqual(index["the"], ["d1", "d2", "d4"])
        self.assertEqual(index["revoke"], ["d1"])
        for term, ids in index.items():
            self.assertEqual(len(ids), len(set(ids)), term)
            self.assertEqual(ids, sorted(ids), f"{term}: input order is id order for these documents")

    def test_and_queries_find_exactly_the_documented_documents(self):
        index = build_index(DOCS)
        self.assertEqual([and_query(index, terms) for terms in QUERIES], [["d1"], ["d4"], []])

    def test_and_query_identities(self):
        index = build_index(DOCS)
        self.assertEqual(and_query(index, ["key"]), index["key"], "one term: its own posting list")
        self.assertEqual(and_query(index, ["zebra"]), [], "an unseen term matches nothing")
        self.assertEqual(and_query(index, ["key", "zebra"]), [])
        self.assertEqual(and_query(index, ["revoke", "key"]), and_query(index, ["key", "revoke"]), "order of terms does not matter")
        self.assertEqual(and_query(index, ["key", "key"]), index["key"])
        self.assertEqual(and_query(index, ["the", "key"]), ["d1"])

    def test_empty_query_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            and_query(build_index(DOCS), [])
        self.assertIn("no terms", str(caught.exception))

    def test_postings_read_counts_the_work(self):
        index = build_index(DOCS)
        self.assertEqual([postings_read(index, terms) for terms in QUERIES], [3, 4, 4])
        self.assertEqual(postings_read(index, ["zebra"]), 0)
        self.assertEqual(postings_read(index, ["the"]), 3)

    def test_input_is_not_modified(self):
        before = json.dumps(DOCS)
        index = build_index(DOCS)
        and_query(index, QUERIES[0])
        self.assertEqual(json.dumps(DOCS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected four documents ranked by matched terms"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_ranks_by_match_count_then_id(self):
        index = build_index(DOCS)
        self.assertEqual(practice_answer.or_query(index, OR_QUERY), [("d3", 2), ("d4", 2), ("d1", 1), ("d2", 1)])
        self.assertEqual(practice_answer.or_query(index, ["key"]), [("d1", 1), ("d3", 1)])
        self.assertEqual(practice_answer.or_query(index, ["zebra"]), [])
        self.assertEqual(practice_answer.or_query(index, ["key", "revoke"])[0], ("d1", 2), "the AND match ranks first with the full count")
        with self.assertRaises(ValueError):
            practice_answer.or_query(index, [])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "DOCS = [", "# --- answer begins ---"), segment(starter, "DOCS = [", "def or_query"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every step of the real build, the three queries, and the practice ranking,
    all from the lesson's own functions. The animation's JavaScript port must
    reproduce this exactly."""
    index = build_index(DOCS)
    steps = []
    order = []
    for doc in DOCS:
        tokens = tokenize(doc["text"])
        distinct = sorted(set(tokens))
        new_terms = []
        for term in distinct:
            if term not in order:
                order.append(term)
                new_terms.append(term)
        steps.append({"doc": doc["id"], "tokens": tokens, "distinct": distinct,
                      "repeated": sorted(term for term in distinct if tokens.count(term) > 1), "new_terms": new_terms})
    queries = []
    for terms in QUERIES:
        queries.append({"terms": terms, "postings": {term: index.get(term, []) for term in terms},
                        "result": and_query(index, terms), "postings_read": postings_read(index, terms)})
    ranked = practice_answer.or_query(index, OR_QUERY)
    return {
        "index": index,
        "order": order,
        "steps": steps,
        "shared_terms": sorted(term for term in index if len(index[term]) >= 2),
        "queries": queries,
        "or_query": {"terms": OR_QUERY, "counts": {doc_id: count for doc_id, count in ranked}, "ranked": [list(pair) for pair in ranked]},
        "scan_reads": len(DOCS) * len(QUERIES),
        "index_reads": sum(query["postings_read"] for query in queries),
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on docs.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_docs_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "docs.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"docs": DOCS, "queries": QUERIES, "or_query": OR_QUERY})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(len(trace["order"]), 31)
        self.assertEqual(trace["shared_terms"], ["create", "key", "scope", "the"])
        self.assertEqual(trace["steps"][0]["repeated"], ["key", "the"])
        self.assertEqual([len(step["new_terms"]) for step in trace["steps"]], [7, 5, 7, 4, 8])
        self.assertEqual([query["result"] for query in trace["queries"]], [["d1"], ["d4"], []])
        self.assertEqual((trace["index_reads"], trace["scan_reads"]), (11, 15))


class LinearScanOnTheSameDocuments(unittest.TestCase):
    """The evaluation that separates the index from the scan that shipped."""

    def test_scan_and_index_agree_on_every_query(self):
        index = build_index(DOCS)
        for terms in QUERIES + [["key"], ["the"], ["zebra"], ["the", "scope"], ["create", "key", "new"]]:
            self.assertEqual(and_query(index, terms), scan_query(DOCS, terms), terms)

    def test_index_reads_fewer_entries_than_the_scan(self):
        index = build_index(DOCS)
        total = 0
        for terms in QUERIES:
            read = postings_read(index, terms)
            self.assertLessEqual(read, len(DOCS), "a query never reads more entries than the scan reads documents")
            total += read
        self.assertEqual(total, 11)
        self.assertLess(total, len(DOCS) * len(QUERIES), "11 posting entries against 15 document reads")


if __name__ == "__main__":
    unittest.main()
