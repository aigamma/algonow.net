"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed counts, nothing is random, and every estimate is checked
against the subsets it stands for, enumerated by brute force."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from itertools import combinations
from pathlib import Path

from pass_at_k import practice_answer
from pass_at_k.solution import KS, PROBLEMS, estimate, pass_at_k

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "pass_at_k"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


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


def by_subsets(n, c, k, all_pass=False):
    """The estimate as a count over the actual subsets: the first c samples pass."""
    samples = [index < c for index in range(n)]
    hits = 0
    total = 0
    for combo in combinations(range(n), k):
        flags = [samples[i] for i in combo]
        hits += 1 if (all(flags) if all_pass else any(flags)) else 0
        total += 1
    return hits / total


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_pass_at_one_is_the_pass_rate_and_pass_at_n_is_any_correct(self):
        for problem in PROBLEMS:
            n, c = problem["n"], problem["c"]
            self.assertEqual(pass_at_k(n, c, 1), c / n)
            self.assertEqual(pass_at_k(n, c, n), 1.0 if c > 0 else 0.0)

    def test_every_estimate_equals_the_share_of_subsets_holding_a_pass(self):
        for problem in PROBLEMS:
            for k in range(1, problem["n"] + 1):
                self.assertAlmostEqual(pass_at_k(problem["n"], problem["c"], k), by_subsets(problem["n"], problem["c"], k), places=12)
        self.assertEqual(pass_at_k(5, 2, 3), 0.9, "nine of the ten subsets of three hold a pass")

    def test_pass_at_k_never_falls_as_k_grows(self):
        for problem in PROBLEMS:
            values = [pass_at_k(problem["n"], problem["c"], k) for k in range(1, problem["n"] + 1)]
            self.assertEqual(values, sorted(values))

    def test_the_table_and_the_means_are_what_the_page_shows(self):
        rows, means = estimate(PROBLEMS, KS)
        self.assertEqual([[round(s, 3) for s in row["scores"]] for row in rows],
                         [[1.0, 1.0, 1.0], [0.6, 1.0, 1.0], [0.2, 0.6, 1.0], [0.0, 0.0, 0.0], [0.4, 0.9, 1.0], [0.8, 1.0, 1.0]])
        self.assertEqual([round(mean, 3) for mean in means], [0.5, 0.75, 0.833])
        self.assertEqual([row["id"] for row in rows], ["p1", "p2", "p3", "p4", "p5", "p6"])

    def test_bad_arguments_are_rejected(self):
        for n, c, k in [(5, 2, 0), (5, 2, 6), (5, 6, 1), (5, -1, 1)]:
            with self.assertRaises(ValueError):
                pass_at_k(n, c, k)
        with self.assertRaises(ValueError) as caught:
            pass_at_k(5, 2, 6)
        self.assertIn("k 6, n 5", str(caught.exception))

    def test_the_early_return_is_exact_not_rounded(self):
        self.assertEqual(pass_at_k(5, 3, 3), 1.0, "two failures cannot fill a subset of three")
        self.assertEqual(pass_at_k(5, 3, 2), 1 - 1 / 10, "two failures fill exactly one subset of two")

    def test_estimate_takes_another_scoring_function_and_keeps_the_input(self):
        before = json.dumps(PROBLEMS)
        rows, means = estimate(PROBLEMS, KS, score=lambda n, c, k: c)
        self.assertEqual([row["scores"] for row in rows], [[5, 5, 5], [3, 3, 3], [1, 1, 1], [0, 0, 0], [2, 2, 2], [4, 4, 4]])
        self.assertEqual(means, [2.5, 2.5, 2.5])
        self.assertEqual(json.dumps(PROBLEMS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected pass_all_k(5, 5, 3) to be 1.000"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_all_k_equals_the_share_of_subsets_made_only_of_passes(self):
        for problem in PROBLEMS:
            for k in range(1, problem["n"] + 1):
                self.assertAlmostEqual(practice_answer.pass_all_k(problem["n"], problem["c"], k),
                                       by_subsets(problem["n"], problem["c"], k, all_pass=True), places=12)
        self.assertEqual(practice_answer.pass_all_k(5, 4, 3), 0.4)
        self.assertEqual(practice_answer.pass_all_k(5, 2, 3), 0.0, "two passes cannot fill a subset of three")
        with self.assertRaises(ValueError):
            practice_answer.pass_all_k(5, 2, 6)

    def test_all_k_means_and_the_shared_first_column(self):
        rows, means = estimate(PROBLEMS, KS, score=practice_answer.pass_all_k)
        self.assertEqual([round(mean, 3) for mean in means], [0.5, 0.25, 0.167])
        at_least_rows, at_least_means = estimate(PROBLEMS, KS)
        self.assertEqual(means[0], at_least_means[0], "with one sample the two events are the same")
        for row, other in zip(rows, at_least_rows, strict=True):
            self.assertLessEqual(row["scores"][1], other["scores"][1])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "PROBLEMS = [", "# --- answer begins ---"), segment(starter, "PROBLEMS = [", "def pass_all_k"))
        self.assertEqual(segment(answer, "def estimate"), segment(starter, "def estimate"))


def derive_trace():
    """The table, the means, the any-correct rate, and the subsets the figure
    enumerates, all from the lesson's own functions (six decimals)."""
    def subsets_for(problem_id, k, all_pass):
        problem = next(p for p in PROBLEMS if p["id"] == problem_id)
        n, c = problem["n"], problem["c"]
        samples = [index < c for index in range(n)]
        rows = []
        for combo in combinations(range(n), k):
            flags = [samples[i] for i in combo]
            rows.append({"indexes": list(combo), "counts": all(flags) if all_pass else any(flags)})
        value = practice_answer.pass_all_k(n, c, k) if all_pass else pass_at_k(n, c, k)
        return {"problem": problem_id, "n": n, "c": c, "k": k, "samples": samples, "subsets": rows,
                "counting": sum(1 for row in rows if row["counts"]), "total": len(rows), "estimate": round(value, 6)}

    def table(score):
        rows, means = estimate(PROBLEMS, KS, score=score)
        return ([{"id": r["id"], "name": r["name"], "n": r["n"], "c": r["c"], "scores": [round(s, 6) for s in r["scores"]]} for r in rows],
                [round(m, 6) for m in means])

    rows, means = table(pass_at_k)
    all_rows, all_means = table(practice_answer.pass_all_k)
    any_correct = sum(1 for p in PROBLEMS if p["c"] > 0)
    return {"ks": KS, "rows": rows, "means": means, "any_correct": any_correct, "any_rate": round(any_correct / len(PROBLEMS), 6),
            "subsets": subsets_for("p5", 3, False),
            "all_k": {"rows": all_rows, "means": all_means, "subsets": subsets_for("p6", 3, True)}}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on problems.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_problems_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "problems.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"problems": PROBLEMS, "ks": KS, "subset_problem": "p5", "subset_k": 3, "practice_problem": "p6"})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["means"], [0.5, 0.75, 0.833333])
        self.assertEqual((trace["subsets"]["counting"], trace["subsets"]["total"], trace["subsets"]["estimate"]), (9, 10, 0.9))
        self.assertEqual((trace["all_k"]["subsets"]["counting"], trace["all_k"]["subsets"]["estimate"]), (4, 0.4))


class AnyCorrectOnTheSameSamples(unittest.TestCase):
    """The evaluation that separates the honest estimate from the number that shipped."""

    def test_any_correct_is_pass_at_five_and_overstates_fewer_samples(self):
        rows, means = estimate(PROBLEMS, KS)
        any_rate = sum(1 for p in PROBLEMS if p["c"] > 0) / len(PROBLEMS)
        self.assertEqual(round(any_rate, 4), 0.8333, "five of the six problems had some passing sample")
        self.assertAlmostEqual(means[2], any_rate, places=12, msg="the shipped number is the pass at five mean")
        self.assertEqual(round(any_rate - means[1], 4), 0.0833, "it overstates pass at three by a twelfth")
        self.assertEqual(round(any_rate - means[0], 4), 0.3333, "and pass at one by a third")

    def test_per_problem_the_shipped_indicator_hides_the_pass_rate(self):
        rows, means = estimate(PROBLEMS, KS)
        for row in rows:
            indicator = 1.0 if row["c"] > 0 else 0.0
            self.assertEqual(row["scores"][2], indicator)
            self.assertLessEqual(row["scores"][0], indicator)
        self.assertEqual([row["scores"][0] for row in rows if row["scores"][2] == 1.0], [1.0, 0.6, 0.2, 0.4, 0.8])


if __name__ == "__main__":
    unittest.main()
