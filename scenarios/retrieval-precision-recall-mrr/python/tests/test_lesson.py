"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
rankings are fixed lists and nothing is random; floats are compared with the
exact value the same arithmetic produces, or rounded to six decimals."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from retrieval_metrics import practice_answer
from retrieval_metrics.solution import (K, QUERIES, evaluate, hits_in_top, precision_at_k, recall_at_k,
                                        reciprocal_rank)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "retrieval_metrics"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
KEYS = ["old", "new"]


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


def rounded(value):
    return round(value, 6)


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_metrics_on_a_hand_computed_ranking(self):
        ranked = ["a", "b", "c", "d", "e"]
        self.assertEqual(hits_in_top(ranked, {"b", "e"}, 3), 1)
        self.assertEqual(precision_at_k(ranked, {"b", "e"}, 3), 1 / 3)
        self.assertEqual(recall_at_k(ranked, {"b", "e"}, 3), 1 / 2)
        self.assertEqual(reciprocal_rank(ranked, {"b", "e"}), 1 / 2)
        self.assertEqual(precision_at_k(ranked, {"a"}, 1), 1.0, "a single relevant result at position 1")
        self.assertEqual(recall_at_k(ranked, {"a", "b", "c"}, 3), 1.0, "every relevant chunk inside the first three")

    def test_a_ranking_with_no_hits_scores_zero_everywhere(self):
        ranked = ["a", "b", "c", "d", "e"]
        self.assertEqual((precision_at_k(ranked, {"z"}, 3), recall_at_k(ranked, {"z"}, 3), reciprocal_rank(ranked, {"z"})), (0.0, 0.0, 0.0))

    def test_a_short_ranking_is_scored_as_far_as_it_goes(self):
        self.assertEqual(precision_at_k(["a"], {"a"}, 3), 1 / 3, "the slice is shorter than k; k still divides")
        self.assertEqual(recall_at_k(["a"], {"a"}, 3), 1.0)
        self.assertEqual(reciprocal_rank([], {"a"}), 0.0)

    def test_guards_reject_a_bad_k_and_an_empty_relevant_set(self):
        with self.assertRaises(ValueError) as caught:
            precision_at_k(["a"], {"a"}, 0)
        self.assertIn("k must be at least 1", str(caught.exception))
        with self.assertRaises(ValueError):
            recall_at_k(["a"], set(), 3)
        with self.assertRaises(ValueError):
            reciprocal_rank(["a"], set())
        with self.assertRaises(ValueError):
            evaluate(QUERIES, "old", 0)

    def test_the_rows_and_means_are_what_the_page_says(self):
        rows, means = evaluate(QUERIES, "old", K)
        self.assertEqual([(row[0], round(row[1], 3), round(row[2], 3), round(row[3], 3)) for row in rows],
                         [("q1", 0.333, 1.0, 0.333), ("q2", 0.667, 1.0, 0.5), ("q3", 0.333, 1.0, 1.0), ("q4", 0.0, 0.0, 0.0)])
        self.assertEqual({key: rounded(value) for key, value in means.items()}, {"precision": 0.333333, "recall": 0.75, "mrr": 0.458333})
        rows, means = evaluate(QUERIES, "new", K)
        self.assertEqual([round(row[3], 3) for row in rows], [1.0, 1.0, 0.5, 0.0])
        self.assertEqual({key: rounded(value) for key, value in means.items()}, {"precision": 0.333333, "recall": 0.75, "mrr": 0.625})

    def test_input_is_not_modified(self):
        before = json.dumps([{**q, "relevant": sorted(q["relevant"])} for q in QUERIES], sort_keys=True)
        evaluate(QUERIES, "old", K)
        evaluate(QUERIES, "new", K)
        self.assertEqual(json.dumps([{**q, "relevant": sorted(q["relevant"])} for q in QUERIES], sort_keys=True), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected nDCG@3 to score both rankings"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_ndcg_identities_and_the_hand_computed_case(self):
        ndcg = practice_answer.ndcg_at_k
        self.assertEqual(ndcg(["a", "b", "c"], {"a"}, 3), 1.0, "a hit at position 1 is the best possible")
        self.assertEqual(ndcg(["a", "b", "c"], {"z"}, 3), 0.0)
        self.assertEqual(ndcg(["a", "b", "c"], {"b"}, 3), (1 / math.log2(3)) / 1)
        two = (1 / math.log2(3) + 1 / math.log2(4)) / (1 + 1 / math.log2(3))
        self.assertEqual(ndcg(["x", "a", "b", "y"], {"a", "b"}, 3), two)
        self.assertEqual(round(two, 3), 0.693)
        with self.assertRaises(ValueError):
            ndcg(["a"], {"a"}, 0)

    def test_answer_means_are_the_documented_values(self):
        _, old = practice_answer.evaluate(QUERIES, "old", K)
        _, new = practice_answer.evaluate(QUERIES, "new", K)
        self.assertEqual((rounded(old["ndcg"]), rounded(new["ndcg"])), (0.548357, 0.657732))
        self.assertEqual((rounded(old["mrr"]), rounded(new["mrr"])), (0.458333, 0.625))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "QUERIES = [", "# --- answer begins ---"),
                         segment(starter, "QUERIES = [", "def ndcg_at_k"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def hit_positions(ranked, relevant):
    positions = []
    for position, chunk_id in enumerate(ranked, start=1):
        if chunk_id in relevant:
            positions.append(position)
    return positions


def derive_trace():
    """Every row, mean, hit position, and nDCG for both rankings, from the
    lesson's own functions. The animation's JavaScript port must reproduce this
    exactly (six decimals)."""
    rankings = {}
    for key in KEYS:
        rows, means = evaluate(QUERIES, key, K)
        _, with_ndcg = practice_answer.evaluate(QUERIES, key, K)
        records = []
        for query, row in zip(QUERIES, rows, strict=True):
            records.append({"id": query["id"], "precision": rounded(row[1]), "recall": rounded(row[2]), "rr": rounded(row[3]),
                            "ndcg": rounded(practice_answer.ndcg_at_k(query[key], query["relevant"], K)),
                            "hit_positions": hit_positions(query[key], query["relevant"]),
                            "hits_in_top_k": hits_in_top(query[key], query["relevant"], K)})
        rankings[key] = {"rows": records, "means": {"precision": rounded(means["precision"]), "recall": rounded(means["recall"]),
                                                     "mrr": rounded(means["mrr"]), "ndcg": rounded(with_ndcg["ndcg"])}}
    old, new = rankings["old"]["means"], rankings["new"]["means"]
    same_hits = True
    for query in QUERIES:
        if set(query["old"][:K]) & query["relevant"] != set(query["new"][:K]) & query["relevant"]:
            same_hits = False
    return {"k": K, "rankings": rankings,
            "delta": {name: rounded(new[name] - old[name]) for name in ["precision", "recall", "mrr", "ndcg"]},
            "same_hits_in_top_k": same_hits}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on queries.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_queries_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "queries.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"k": K, "queries": [{**query, "relevant": sorted(query["relevant"])} for query in QUERIES]})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["rankings"]["old"]["rows"][0], {"id": "q1", "precision": 0.333333, "recall": 1.0, "rr": 0.333333,
                                                               "ndcg": 0.5, "hit_positions": [3], "hits_in_top_k": 1})
        self.assertEqual(trace["rankings"]["new"]["rows"][1]["hit_positions"], [1, 2])
        self.assertEqual(trace["delta"], {"precision": 0.0, "recall": 0.0, "mrr": 0.166667, "ndcg": 0.109375})
        self.assertTrue(trace["same_hits_in_top_k"])


class TwoRankingsOnTheSameQueries(unittest.TestCase):
    """The evaluation that turns "felt better" into a measurement."""

    def test_both_rankings_find_the_same_relevant_chunks_in_the_top_three(self):
        for query in QUERIES:
            self.assertEqual(set(query["old"][:K]) & query["relevant"], set(query["new"][:K]) & query["relevant"], query["id"])
        _, old = evaluate(QUERIES, "old", K)
        _, new = evaluate(QUERIES, "new", K)
        self.assertEqual((old["precision"], old["recall"]), (new["precision"], new["recall"]))
        self.assertEqual(rounded(old["recall"]), 0.75)

    def test_the_new_ranking_puts_the_first_hit_earlier_on_average(self):
        _, old = evaluate(QUERIES, "old", K)
        _, new = evaluate(QUERIES, "new", K)
        self.assertEqual((rounded(old["mrr"]), rounded(new["mrr"])), (0.458333, 0.625))
        self.assertEqual(rounded(new["mrr"] - old["mrr"]), 0.166667)
        firsts = {query["id"]: (hit_positions(query["old"], query["relevant"])[:1], hit_positions(query["new"], query["relevant"])[:1]) for query in QUERIES}
        self.assertEqual(firsts, {"q1": ([3], [1]), "q2": ([2], [1]), "q3": ([1], [2]), "q4": ([], [])},
                         "two queries improve, one slips, one is found by neither")


if __name__ == "__main__":
    unittest.main()
