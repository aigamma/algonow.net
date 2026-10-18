"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise accuracy, percentile, and bootstrap_differences
directly. Every expectation is exact: the results are fixed lists and the
generator is seeded, so the resamples are the same on every run."""
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from bootstrap_eval import practice_answer
from bootstrap_eval.solution import NEW, OLD, RESAMPLES, SEED, accuracy, bootstrap_differences, percentile

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "bootstrap_eval"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
KEEP = {"PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE"}


def run_alone(name):
    """Copy one lesson file by itself into an empty directory and run it with
    python -I -S and a minimal environment: no package, no import path, no siblings."""
    env = {key: value for key, value in os.environ.items() if key.upper() in KEEP}
    with tempfile.TemporaryDirectory() as empty:
        shutil.copyfile(PACKAGE / name, Path(empty) / name)
        return subprocess.run([sys.executable, "-I", "-S", name], cwd=empty, env=env,
                              capture_output=True, text=True, timeout=60)


def expected(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def interval(differences):
    return percentile(differences, 2.5), percentile(differences, 97.5)


def replay_indices(old, new, resamples, seed):
    """Draw the same indices the solution draws: the same seed, the same calls in the same order."""
    generator = random.Random(seed)
    count = len(list(zip(old, new, strict=True)))
    draws = []
    for _ in range(resamples):
        indices = []
        for _ in range(count):
            indices.append(generator.randrange(count))
        draws.append(indices)
    return draws


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_accuracies_are_seventeen_and_eighteen_of_twenty_five(self):
        self.assertEqual(len(OLD), 25)
        self.assertEqual(len(NEW), 25)
        self.assertEqual(sum(OLD), 17)
        self.assertEqual(sum(NEW), 18)
        self.assertEqual(accuracy(OLD), 17 / 25)
        self.assertEqual(accuracy(NEW), 18 / 25)
        self.assertEqual(accuracy(NEW) - accuracy(OLD), 18 / 25 - 17 / 25)

    def test_same_seed_reproduces_the_interval_and_another_seed_changes_it(self):
        first = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
        second = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
        self.assertEqual(first, second, "a seeded generator replays the same draws")
        self.assertEqual(interval(first), (-0.12, 0.2))
        self.assertEqual(interval(bootstrap_differences(OLD, NEW, RESAMPLES, 7)), (-0.16, 0.24), "another seed, another interval")

    def test_each_resample_draws_twenty_five_indices_in_range_and_scores_them(self):
        draws = replay_indices(OLD, NEW, RESAMPLES, SEED)
        differences = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
        self.assertEqual(len(draws), RESAMPLES)
        for indices, difference in zip(draws, differences, strict=True):
            self.assertEqual(len(indices), 25)
            self.assertTrue(all(0 <= index < 25 for index in indices))
            old_right = sum(OLD[index] for index in indices)
            new_right = sum(NEW[index] for index in indices)
            self.assertEqual(difference, (new_right - old_right) / 25, "the same resampled items score both models")
        self.assertTrue(any(len(set(indices)) < 25 for indices in draws), "with replacement: some items repeat")

    def test_percentile_is_the_nearest_rank_of_the_sorted_list(self):
        values = [9, 0, 8, 1, 7, 2, 6, 3, 5, 4]
        self.assertEqual(percentile(values, 0), 0)
        self.assertEqual(percentile(values, 100), 9)
        self.assertEqual(percentile(values, 2.5), 0, "round(0.225) is 0")
        self.assertEqual(percentile(values, 97.5), 9, "round(8.775) is 9")
        self.assertEqual(percentile(values, 50), 4, "round(4.5) is 4: Python rounds halves to even")
        self.assertEqual(values, [9, 0, 8, 1, 7, 2, 6, 3, 5, 4], "sorted makes a copy")
        self.assertEqual(round(2.5 / 100 * (RESAMPLES - 1)), 5)
        self.assertEqual(round(97.5 / 100 * (RESAMPLES - 1)), 194)

    def test_interval_brackets_the_observed_difference_and_includes_zero(self):
        low, high = interval(bootstrap_differences(OLD, NEW, RESAMPLES, SEED))
        observed = accuracy(NEW) - accuracy(OLD)
        self.assertLess(low, high)
        self.assertLessEqual(low, observed)
        self.assertLessEqual(observed, high)
        self.assertLessEqual(low, 0)
        self.assertLessEqual(0, high)

    def test_unequal_lengths_and_zero_resamples_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            bootstrap_differences(OLD, NEW[:24], RESAMPLES, SEED)
        self.assertIn("shorter", str(caught.exception))
        with self.assertRaises(ValueError):
            bootstrap_differences(OLD + [1], NEW, RESAMPLES, SEED)
        with self.assertRaises(ValueError):
            bootstrap_differences(OLD, NEW, 0, SEED)

    def test_input_lists_are_not_modified(self):
        old, new = list(OLD), list(NEW)
        bootstrap_differences(old, new, RESAMPLES, SEED)
        self.assertEqual(old, OLD)
        self.assertEqual(new, NEW)


class ShippingDecision(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same results."""

    def test_point_estimate_alone_would_ship_while_the_interval_does_not(self):
        observed = accuracy(NEW) - accuracy(OLD)
        self.assertGreater(observed, 0, "the point estimate says the new model is better")
        low, high = interval(bootstrap_differences(OLD, NEW, RESAMPLES, SEED))
        self.assertTrue(low <= 0 <= high, "the interval says the gain is not established")

    def test_one_thousand_resamples_still_include_zero(self):
        low, high = interval(bootstrap_differences(OLD, NEW, 1000, SEED))
        self.assertEqual((low, high), (-0.12, 0.2))
        self.assertTrue(low <= 0 <= high)

    def test_a_real_gain_is_detected(self):
        old = [1] * 17 + [0] * 8
        new = [1] * 25   # right on everything the old model got right, plus the other eight
        low, high = interval(bootstrap_differences(old, new, RESAMPLES, SEED))
        self.assertGreater(low, 0, "the whole interval sits above zero")
        self.assertLessEqual(high, 1)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected a better share of 59.5%, got None"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_better_fraction_is_exact(self):
        differences = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
        fraction = practice_answer.better_fraction(differences)
        self.assertEqual(fraction, 119 / 200)
        self.assertEqual(fraction, practice_answer.EXPECTED_BETTER)
        self.assertEqual(sum(1 for difference in differences if difference == 0), 36, "ties do not count as better")

    def test_answer_better_fraction_edge_cases(self):
        self.assertEqual(practice_answer.better_fraction([0.04, 0.08, 0.12]), 1.0)
        self.assertEqual(practice_answer.better_fraction([-0.04, 0.0, -0.08]), 0.0)
        self.assertEqual(practice_answer.better_fraction([0.04, 0.0, -0.04, 0.08]), 0.5)

    def test_answer_bootstrap_matches_the_worked_example(self):
        self.assertEqual(practice_answer.bootstrap_differences(OLD, NEW, RESAMPLES, SEED),
                         bootstrap_differences(OLD, NEW, RESAMPLES, SEED))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "OLD = [", "# --- answer begins ---"),
                         segment(starter, "OLD = [", "def better_fraction"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Everything the page's animation replays, derived from the real functions.
    The browser cannot reproduce Python's generator, so the drawn indices and the
    differences travel in the fixture; the browser rescores the shown resamples
    and recomputes the percentiles from them."""
    draws = replay_indices(OLD, NEW, RESAMPLES, SEED)
    differences = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
    resamples = []
    for indices, difference in zip(draws, differences, strict=True):
        old_right = sum(OLD[index] for index in indices)
        new_right = sum(NEW[index] for index in indices)
        assert difference == (new_right - old_right) / len(OLD)
        resamples.append({"indices": indices, "old": old_right, "new": new_right, "difference": round(difference, 4)})
    low, high = interval(differences)
    return {
        "accuracy": {"old": accuracy(OLD), "new": accuracy(NEW), "difference": accuracy(NEW) - accuracy(OLD)},
        "resamples": resamples[:12],
        "differences": [round(difference, 4) for difference in differences],
        "interval": {"low": low, "high": high},
        "includes_zero": low <= 0 <= high,
        "better_fraction": practice_answer.better_fraction(differences),
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on results.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_results_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "results.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"old": OLD, "new": NEW, "resamples": RESAMPLES, "seed": SEED})
        self.assertEqual((practice_answer.OLD, practice_answer.NEW, practice_answer.RESAMPLES, practice_answer.SEED),
                         (OLD, NEW, RESAMPLES, SEED))

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(len(trace["resamples"]), 12)
        self.assertEqual(len(trace["differences"]), RESAMPLES)
        self.assertEqual(trace["interval"], {"low": -0.12, "high": 0.2})
        self.assertTrue(trace["includes_zero"])
        self.assertEqual(trace["better_fraction"], 0.595)
        self.assertEqual(trace["accuracy"], {"old": 0.68, "new": 0.72, "difference": 0.72 - 0.68})


if __name__ == "__main__":
    unittest.main()
