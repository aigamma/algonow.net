"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; where a float is compared, the
test states the exact value the same arithmetic produces or a tight bound."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from sparse_targets import practice_answer
from sparse_targets.solution import K, POSITIONS, VOCAB, dropped_mass, renormalize, sort_key, top_k_sparse, truncate_all

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "sparse_targets"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
P = practice_answer.P


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


def kl_from_stored(probs, sparse):
    """KL divergence from the stored (renormalized) targets to the teacher: the sum
    over kept tokens of q times the log of q over p, computed term by term."""
    total = 0.0
    for (index, prob), (same, value) in zip(sparse, renormalize(sparse), strict=True):
        total += value * math.log(value / prob)
    return total


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_sort_key_orders_largest_first_and_breaks_ties_by_index(self):
        pairs = [(0, 0.3), (1, 0.3), (2, 0.2), (3, 0.1), (4, 0.05), (5, 0.05)]
        self.assertEqual(sorted(pairs, key=sort_key), pairs, "already sorted: the tie at 0.3 keeps index 0 first")
        self.assertEqual(sorted([(0, 0.1), (1, 0.6), (2, 0.3)], key=sort_key), [(1, 0.6), (2, 0.3), (0, 0.1)])
        self.assertEqual(sorted([(2, 0.5), (0, 0.5)], key=sort_key), [(0, 0.5), (2, 0.5)])

    def test_top_k_keeps_the_documented_pairs(self):
        self.assertEqual(top_k_sparse(POSITIONS[0]["probs"], 3), [(0, 0.5), (1, 0.2), (2, 0.15)])
        self.assertEqual(top_k_sparse(POSITIONS[1]["probs"], 3), [(0, 0.3), (1, 0.3), (2, 0.2)])
        self.assertEqual(top_k_sparse(POSITIONS[2]["probs"], 3), [(0, 0.9), (1, 0.04), (2, 0.03)])
        self.assertEqual(top_k_sparse([0.1, 0.6, 0.3], 2), [(1, 0.6), (2, 0.3)], "indices travel with their probabilities")
        self.assertEqual(len(top_k_sparse(POSITIONS[0]["probs"], 6)), 6, "k equal to the vocabulary keeps everything")

    def test_renormalized_values_sum_to_one_and_match_the_page(self):
        for position, rounded in zip(POSITIONS, [[0.588, 0.235, 0.176], [0.375, 0.375, 0.25], [0.928, 0.041, 0.031]], strict=True):
            values = renormalize(top_k_sparse(position["probs"], K))
            self.assertAlmostEqual(sum(value for index, value in values), 1.0, places=12)
            self.assertEqual([round(value, 3) for index, value in values], rounded)
            self.assertEqual([index for index, value in values], [0, 1, 2])

    def test_dropped_mass_is_the_mass_of_the_tokens_not_kept(self):
        for position, rounded in zip(POSITIONS, [0.15, 0.2, 0.03], strict=True):
            sparse = top_k_sparse(position["probs"], K)
            dropped = dropped_mass(position["probs"], sparse)
            self.assertEqual(round(dropped, 3), rounded)
            kept = sum(prob for index, prob in sparse)
            self.assertAlmostEqual(kept + dropped, sum(position["probs"]), places=12, msg="kept plus dropped is the whole mass")
        self.assertEqual(dropped_mass([0.2, 0.8], [(1, 0.8), (0, 0.2)]), 0.0)

    def test_k_outside_the_vocabulary_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            top_k_sparse(POSITIONS[0]["probs"], 7)
        self.assertIn("between 1 and 6", str(caught.exception))
        with self.assertRaises(ValueError):
            top_k_sparse(POSITIONS[0]["probs"], 0)

    def test_inputs_are_not_modified(self):
        before = json.dumps(POSITIONS)
        truncate_all(POSITIONS, K)
        self.assertEqual(json.dumps(POSITIONS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected top-p with p = 0.9 to keep 4, 4, 1 tokens"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_keeps_the_smallest_prefix_that_reaches_p(self):
        counts = [len(practice_answer.top_p_sparse(position["probs"], P)) for position in POSITIONS]
        self.assertEqual(counts, [4, 4, 1])
        self.assertEqual(practice_answer.top_p_sparse(POSITIONS[2]["probs"], P), [(0, 0.9)])
        for position in POSITIONS:
            kept = practice_answer.top_p_sparse(position["probs"], P)
            self.assertGreaterEqual(sum(prob for index, prob in kept), P)
            self.assertLess(sum(prob for index, prob in kept[:-1]), P, "one fewer token would fall short of p")
        self.assertEqual(len(practice_answer.top_p_sparse(POSITIONS[0]["probs"], 1.0)), 6, "p of one keeps everything")
        self.assertEqual(len(practice_answer.top_p_sparse(POSITIONS[0]["probs"], 0.01)), 1, "a tiny p keeps the largest token")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "VOCAB = [", "# --- answer begins ---"), segment(starter, "VOCAB = [", "def top_p_sparse"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every number the animation shows, from the lesson's own functions. The
    JavaScript port must reproduce this exactly (six decimals)."""
    rounded = lambda value: round(value, 6)
    positions = []
    total_dropped = 0.0
    for position in POSITIONS:
        sparse = top_k_sparse(position["probs"], K)
        dropped = dropped_mass(position["probs"], sparse)
        total_dropped += dropped
        top_p = practice_answer.top_p_sparse(position["probs"], P)
        positions.append({
            "id": position["id"], "context": position["context"], "probs": position["probs"],
            "kept": [[index, rounded(prob)] for index, prob in sparse],
            "renormalized": [[index, rounded(value)] for index, value in renormalize(sparse)],
            "kept_mass": rounded(sum(prob for index, prob in sparse)), "dropped": rounded(dropped),
            "kl_from_stored": rounded(kl_from_stored(position["probs"], sparse)),
            "top_p": {"kept": [[index, rounded(prob)] for index, prob in top_p],
                      "renormalized": [[index, rounded(value)] for index, value in renormalize(top_p)],
                      "count": len(top_p), "kept_mass": rounded(sum(prob for index, prob in top_p)),
                      "dropped": rounded(dropped_mass(position["probs"], top_p))},
        })
    return {"k": K, "p": P, "vocab": VOCAB, "positions": positions,
            "mean_dropped": rounded(total_dropped / len(POSITIONS)), "storage": {"kept": K, "vocab": len(VOCAB)}}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on positions.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_positions_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "positions.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"vocab": VOCAB, "positions": POSITIONS, "k": K, "p": P})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["positions"][0]["renormalized"], [[0, 0.588235], [1, 0.235294], [2, 0.176471]])
        self.assertEqual([position["top_p"]["count"] for position in trace["positions"]], [4, 4, 1])
        self.assertEqual(trace["mean_dropped"], 0.126667)


class StoredTargetsAgainstTheTeacher(unittest.TestCase):
    """The evaluation that measures what the truncation costs, on the three positions."""

    def test_divergence_from_the_stored_targets_is_minus_the_log_of_the_kept_mass(self):
        values = []
        for position in POSITIONS:
            sparse = top_k_sparse(position["probs"], K)
            kept = sum(prob for index, prob in sparse)
            kl = kl_from_stored(position["probs"], sparse)
            self.assertAlmostEqual(kl, -math.log(kept), places=12, msg="every kept token is scaled by the same factor")
            values.append(round(kl, 4))
        self.assertEqual(values, [0.1625, 0.2231, 0.0305])
        self.assertLess(values[2], values[0])
        self.assertLess(values[0], values[1], "the flat position p2 loses the most, the confident p3 the least")

    def test_the_other_direction_has_no_finite_value_and_storage_halves(self):
        sparse = top_k_sparse(POSITIONS[0]["probs"], K)
        kept_indices = {index for index, prob in sparse}
        self.assertTrue(any(index not in kept_indices and prob > 0 for index, prob in enumerate(POSITIONS[0]["probs"])),
                        "the teacher gives mass to a token the stored targets set to zero, so KL(teacher || stored) is infinite")
        self.assertEqual((K, len(VOCAB)), (3, 6))
        self.assertLess(K / len(VOCAB), 1.0)


if __name__ == "__main__":
    unittest.main()
