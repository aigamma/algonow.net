"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; floats are compared at the
precision the page prints or against the same arithmetic."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from cosine_retrieval import practice_answer
from cosine_retrieval.solution import CHUNKS, K, QUERY, by_score_then_id, cosine, dot, norm, rank_chunks, scale

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "cosine_retrieval"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
MINIMUM = practice_answer.MINIMUM
BY_DOT = ["c2", "c3", "c1", "c4", "c5"]
BY_COSINE = ["c1", "c4", "c3", "c2", "c5"]


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


def ordered(score_of):
    """Ids sorted by a score function, highest first, ties by id."""
    pairs = [(chunk["id"], score_of(chunk["vector"])) for chunk in CHUNKS]
    return [chunk_id for chunk_id, score in sorted(pairs, key=by_score_then_id)]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_dot_product_and_norm_are_the_hand_computed_values(self):
        self.assertAlmostEqual(dot(QUERY, CHUNKS[0]["vector"]), 0.72 + 0.02 + 0.0 + 0.20, places=12)
        self.assertEqual(norm([3.0, 4.0]), 5.0)
        self.assertEqual(norm(QUERY), math.sqrt(0.98))
        self.assertEqual(dot([], []), 0.0)

    def test_cosine_is_one_for_the_same_direction_and_zero_across(self):
        self.assertAlmostEqual(cosine([0.3, 0.4], [0.3, 0.4]), 1.0, places=12)
        self.assertAlmostEqual(cosine([1.0, 0.0], [2.0, 0.0]), 1.0, places=12)
        self.assertEqual(cosine([1.0, 0.0], [0.0, 5.0]), 0.0)
        self.assertEqual(cosine(QUERY, CHUNKS[0]["vector"]), dot(QUERY, CHUNKS[0]["vector"]) / (norm(QUERY) * norm(CHUNKS[0]["vector"])))

    def test_cosine_ignores_length_and_the_dot_product_does_not(self):
        billing = CHUNKS[1]["vector"]
        longer = scale(billing, 10)
        self.assertLess(abs(cosine(QUERY, longer) - cosine(QUERY, billing)), 1e-12)
        self.assertAlmostEqual(dot(QUERY, longer), 10 * dot(QUERY, billing), places=12)
        self.assertEqual(scale([1.0, 2.0], 3), [3.0, 6.0])

    def test_the_two_rankings_are_the_ones_on_the_page(self):
        self.assertEqual(ordered(lambda vector: dot(QUERY, vector)), BY_DOT)
        self.assertEqual(ordered(lambda vector: cosine(QUERY, vector)), BY_COSINE)
        cosines = [round(cosine(QUERY, chunk["vector"]), 3) for chunk in CHUNKS]
        self.assertEqual(cosines, [0.979, 0.383, 0.415, 0.864, 0.195])
        self.assertEqual(len(set(cosines)), len(cosines), "no cosine ties among the five chunks")

    def test_top_k_keeps_the_first_k_in_order_and_breaks_ties_by_id(self):
        top = rank_chunks(QUERY, CHUNKS, K)
        self.assertEqual([chunk_id for chunk_id, score in top], BY_COSINE[:K])
        self.assertEqual(rank_chunks(QUERY, CHUNKS, 0), [])
        self.assertEqual(len(rank_chunks(QUERY, CHUNKS, 10)), len(CHUNKS), "k past the end keeps everything")
        twins = [{"id": "z2", "title": "", "vector": [1.0, 0.0, 0.0, 0.0]}, {"id": "z1", "title": "", "vector": [2.0, 0.0, 0.0, 0.0]}]
        self.assertEqual([chunk_id for chunk_id, score in rank_chunks(QUERY, twins, 2)], ["z1", "z2"])

    def test_zero_vectors_and_mismatched_lengths_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            cosine(QUERY, [0.0, 0.0, 0.0, 0.0])
        self.assertIn("zero vector", str(caught.exception))
        with self.assertRaises(ValueError):
            rank_chunks(QUERY, [{"id": "c9", "title": "", "vector": [0.5, 0.5, 0.5]}], K)
        with self.assertRaises(ValueError):
            dot([1.0, 2.0], [1.0])

    def test_input_lists_are_not_modified(self):
        query, chunks = list(QUERY), json.loads(json.dumps(CHUNKS))
        rank_chunks(QUERY, CHUNKS, K)
        self.assertEqual((QUERY, CHUNKS), (query, chunks))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 2 chunks at or above a cosine of 0.5, got 3"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_drops_every_chunk_below_the_minimum(self):
        kept = practice_answer.rank_chunks(QUERY, CHUNKS, K, minimum=MINIMUM)
        self.assertEqual([chunk_id for chunk_id, score in kept], ["c1", "c4"])
        self.assertTrue(all(score >= MINIMUM for chunk_id, score in kept))
        self.assertEqual([chunk_id for chunk_id, score in practice_answer.rank_chunks(QUERY, CHUNKS, K, minimum=0.9)], ["c1"])
        self.assertEqual(practice_answer.rank_chunks(QUERY, CHUNKS, K, minimum=0.99), [], "nothing clears an impossible bar")

    def test_answer_with_minimum_zero_reproduces_the_worked_run(self):
        self.assertEqual(practice_answer.rank_chunks(QUERY, CHUNKS, K, minimum=0.0), rank_chunks(QUERY, CHUNKS, K))
        self.assertEqual(practice_answer.rank_chunks(QUERY, CHUNKS, K), rank_chunks(QUERY, CHUNKS, K))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "QUERY = [", "# --- answer begins ---"), segment(starter, "QUERY = [", "def rank_chunks"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every score of the real run, both rankings, the top k, and the practice
    result, all from the lesson's own functions. The animation's JavaScript port
    must reproduce this exactly (six decimals)."""
    rows = []
    for chunk in CHUNKS:
        rows.append({"id": chunk["id"], "title": chunk["title"], "dot": round(dot(QUERY, chunk["vector"]), 6),
                     "norm": round(norm(chunk["vector"]), 6), "cosine": round(cosine(QUERY, chunk["vector"]), 6)})
    top = rank_chunks(QUERY, CHUNKS, K)
    kept = practice_answer.rank_chunks(QUERY, CHUNKS, K, minimum=MINIMUM)
    full = sorted([(chunk["id"], cosine(QUERY, chunk["vector"])) for chunk in CHUNKS], key=by_score_then_id)
    return {
        "k": K,
        "query_norm": round(norm(QUERY), 6),
        "rows": rows,
        "by_dot": ordered(lambda vector: dot(QUERY, vector)),
        "by_cosine": ordered(lambda vector: cosine(QUERY, vector)),
        "top": [{"id": chunk_id, "score": round(score, 6)} for chunk_id, score in top],
        "practice": {"minimum": MINIMUM, "kept": [{"id": chunk_id, "score": round(score, 6)} for chunk_id, score in kept],
                     "dropped": [chunk_id for chunk_id, score in full if score < MINIMUM]},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on chunks.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_chunks_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "chunks.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"query": QUERY, "chunks": CHUNKS, "k": K, "minimum": MINIMUM})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["by_dot"], BY_DOT)
        self.assertEqual(trace["by_cosine"], BY_COSINE)
        self.assertEqual([row["cosine"] for row in trace["rows"]], [0.979379, 0.383466, 0.414558, 0.86442, 0.194939])
        self.assertEqual(trace["practice"]["dropped"], ["c3", "c2", "c5"])


class DotProductOnTheSameChunks(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five chunks."""

    def test_dot_product_ranking_buries_the_runbook_the_user_needed(self):
        self.assertEqual(BY_DOT[:K], ["c2", "c3", "c1"], "the top three that shipped")
        self.assertEqual(BY_DOT.index("c1") + 1, 3)
        lengths = {chunk["id"]: norm(chunk["vector"]) for chunk in CHUNKS}
        self.assertGreater(lengths["c2"], 4 * lengths["c1"], "the billing overview's vector is more than four times as long")
        self.assertGreater(lengths["c3"], lengths["c1"])
        self.assertEqual([round(lengths[chunk_id], 2) for chunk_id in ["c1", "c2", "c3"]], [0.97, 4.87, 2.92])

    def test_cosine_ranking_puts_the_runbook_first_and_the_overview_fourth(self):
        top = rank_chunks(QUERY, CHUNKS, K)
        self.assertEqual(top[0][0], "c1")
        self.assertEqual(BY_COSINE.index("c2") + 1, 4)
        self.assertEqual([round(score, 3) for chunk_id, score in top], [0.979, 0.864, 0.415])
        self.assertLess(cosine(QUERY, CHUNKS[1]["vector"]), 0.4, "a long vector pointing elsewhere scores low once length is divided out")


if __name__ == "__main__":
    unittest.main()
