"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Nearest-rank expectations are
exact: every answer is one of the integer samples. Interpolated answers are
compared to nine decimal places, because a fractional position carries
floating-point noise (the lesson prints them with two decimals). The seeded
random lists are reproducible, so their expectations are exact too."""
import json
import math
import os
import random
import shutil
import statistics
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from latency_percentiles import practice_answer
from latency_percentiles.solution import DEPLOYMENTS, percentile, summarize

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "latency_percentiles"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
PERCENTILES = [50, 95, 99]
KEYS = ["mean", "p50", "p95", "p99"]


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


def smallest_covering(latencies, p):
    """The definition by brute force, independent of any rank arithmetic: the
    smallest sample value such that at least p percent of the samples are at
    or below it."""
    for candidate in sorted(latencies):
        at_or_below = 0
        for value in latencies:
            if value <= candidate:
                at_or_below += 1
        if at_or_below * 100 >= p * len(latencies):
            return candidate
    raise AssertionError("the largest sample covers every percentile")


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_percentiles_and_means_for_both_deployments(self):
        self.assertEqual(summarize(DEPLOYMENTS["old"]), {"mean": 332.25, "p50": 330, "p95": 365, "p99": 370})
        self.assertEqual(summarize(DEPLOYMENTS["new"]), {"mean": 292.0, "p50": 180, "p95": 1200, "p99": 1400})

    def test_nearest_rank_matches_the_brute_force_definition(self):
        for latencies in DEPLOYMENTS.values():
            for p in [1, 10, 25, 50, 75, 90, 95, 99, 100]:
                self.assertEqual(percentile(latencies, p), smallest_covering(latencies, p), (latencies, p))
        rng = random.Random(7)
        for _ in range(200):
            latencies = [rng.randint(50, 2000) for _ in range(rng.randint(1, 40))]
            p = rng.choice([1, 5, 20, 33, 35, 50, 66, 75, 90, 95, 99, 100])
            self.assertEqual(percentile(latencies, p), smallest_covering(latencies, p), (latencies, p))

    def test_rank_arithmetic_for_twenty_samples(self):
        ordered = sorted(DEPLOYMENTS["new"])
        self.assertEqual((math.ceil(50 * 20 / 100), percentile(DEPLOYMENTS["new"], 50)), (10, ordered[9]))
        self.assertEqual((math.ceil(95 * 20 / 100), percentile(DEPLOYMENTS["new"], 95)), (19, ordered[18]))
        self.assertEqual((math.ceil(99 * 20 / 100), percentile(DEPLOYMENTS["new"], 99)), (20, ordered[19]))
        # Multiplying first keeps whole ranks whole: 35 percent of 20 samples is exactly 7 of them.
        self.assertEqual(math.ceil(35 * 20 / 100), 7)
        self.assertEqual(percentile(list(range(1, 21)), 35), 7)

    def test_boundaries(self):
        for latencies in DEPLOYMENTS.values():
            self.assertEqual(percentile(latencies, 100), max(latencies))
            self.assertEqual(percentile(latencies, 0.1), min(latencies))
        for p in [0.1, 50, 99, 100]:
            self.assertEqual(percentile([417], p), 417)

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            percentile([], 50)
        self.assertIn("empty", str(caught.exception))
        for p in [0, 101, -5]:
            with self.assertRaises(ValueError) as caught:
                percentile(DEPLOYMENTS["old"], p)
            self.assertIn("percentile", str(caught.exception))

    def test_input_is_not_modified(self):
        copy = {name: list(latencies) for name, latencies in DEPLOYMENTS.items()}
        for latencies in DEPLOYMENTS.values():
            summarize(latencies)
        self.assertEqual(DEPLOYMENTS, copy)
        self.assertNotEqual(DEPLOYMENTS["new"], sorted(DEPLOYMENTS["new"]), "the logged order is not sorted order")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected old p95 365.25"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_interpolates_like_statistics_quantiles(self):
        for latencies in DEPLOYMENTS.values():
            cut_points = statistics.quantiles(latencies, n=100, method="inclusive")
            for p in PERCENTILES:
                self.assertAlmostEqual(practice_answer.percentile(latencies, p), cut_points[p - 1], places=9)
        self.assertAlmostEqual(practice_answer.percentile(DEPLOYMENTS["old"], 50), 332.5, places=9)
        self.assertAlmostEqual(practice_answer.percentile(DEPLOYMENTS["old"], 95), 365.25, places=9)
        self.assertAlmostEqual(practice_answer.percentile(DEPLOYMENTS["new"], 95), 1210.0, places=9)
        self.assertAlmostEqual(practice_answer.percentile(DEPLOYMENTS["new"], 99), 1362.0, places=9)
        self.assertEqual(practice_answer.percentile(DEPLOYMENTS["new"], 100), 1400)
        self.assertEqual(practice_answer.percentile([417], 50), 417)

    def test_answer_keeps_the_guards(self):
        with self.assertRaises(ValueError):
            practice_answer.percentile([], 50)
        for p in [0, 101]:
            with self.assertRaises(ValueError):
                practice_answer.percentile(DEPLOYMENTS["old"], p)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "DEPLOYMENTS = ", "# --- answer begins ---"), segment(starter, "DEPLOYMENTS = ", "def percentile"))
        self.assertEqual(segment(answer, "def summarize"), segment(starter, "def summarize"))


def derive_trace():
    """Everything the animation needs, from the real functions: each deployment's
    samples, sorted copy, and mean; the rank, index, and value of every
    nearest-rank percentile; the position, lower index, fraction, and value of
    every interpolated one; and the differences between the deployments under
    both methods. Floats carry six decimals. The animation's JavaScript port
    must reproduce this exactly."""
    deployments = {}
    for name, latencies in DEPLOYMENTS.items():
        ordered = sorted(latencies)
        n = len(ordered)
        nearest = {}
        interpolated = {}
        for p in PERCENTILES:
            rank = math.ceil(p * n / 100)
            value = percentile(latencies, p)
            assert value == ordered[rank - 1]
            nearest[f"p{p}"] = {"rank": rank, "index": rank - 1, "value": value}
            position = (n - 1) * p / 100
            lower = math.floor(position)
            interpolated[f"p{p}"] = {"position": round(position, 6), "lower": lower, "fraction": round(position - lower, 6),
                                     "value": round(practice_answer.percentile(latencies, p), 6)}
        deployments[name] = {"samples": list(latencies), "sorted": ordered, "mean": round(sum(latencies) / n, 6),
                             "nearest": nearest, "interpolated": interpolated}
    old, new = summarize(DEPLOYMENTS["old"]), summarize(DEPLOYMENTS["new"])
    old_i, new_i = practice_answer.summarize(DEPLOYMENTS["old"]), practice_answer.summarize(DEPLOYMENTS["new"])
    return {
        "n": len(DEPLOYMENTS["old"]),
        "percentiles": PERCENTILES,
        "deployments": deployments,
        "differences": {"nearest": {key: round(new[key] - old[key], 6) for key in KEYS},
                        "interpolated": {key: round(new_i[key] - old_i[key], 6) for key in KEYS}},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on latencies.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_latencies_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "latencies.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["deployments"], DEPLOYMENTS)
        self.assertEqual(fixture["percentiles"], PERCENTILES)
        self.assertEqual([f"p{p}" for p in fixture["percentiles"]], [key for key in summarize(DEPLOYMENTS["old"]) if key != "mean"])
        self.assertEqual({len(latencies) for latencies in DEPLOYMENTS.values()}, {20})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["deployments"]["new"]["nearest"]["p95"], {"rank": 19, "index": 18, "value": 1200})
        self.assertEqual(trace["deployments"]["old"]["nearest"]["p50"], {"rank": 10, "index": 9, "value": 330})
        self.assertEqual(trace["deployments"]["new"]["interpolated"]["p95"], {"position": 18.05, "lower": 18, "fraction": 0.05, "value": 1210.0})
        self.assertEqual(trace["differences"]["nearest"], {"mean": -40.25, "p50": -150, "p95": 835, "p99": 1030})


class MeanVersusTail(unittest.TestCase):
    """The evaluation that separates the repair from the bug: on the same samples
    the mean and the tail disagree about which deployment is better."""

    def test_the_mean_ranks_new_as_better_while_the_tail_ranks_old_as_better(self):
        old, new = summarize(DEPLOYMENTS["old"]), summarize(DEPLOYMENTS["new"])
        self.assertEqual(new["mean"] - old["mean"], -40.25, "the mean improved")
        self.assertEqual(new["p50"] - old["p50"], -150, "the median improved")
        self.assertEqual(new["p95"] - old["p95"], 835, "the ninety-fifth percentile got worse")
        self.assertEqual(new["p99"] - old["p99"], 1030, "the ninety-ninth percentile got worse")
        self.assertEqual(sum(1 for value in DEPLOYMENTS["new"] if value > 1000), 2, "two of twenty new samples are above a second")
        self.assertEqual(sum(1 for value in DEPLOYMENTS["old"] if value > 1000), 0)

    def test_p99_of_twenty_samples_is_the_maximum(self):
        for latencies in DEPLOYMENTS.values():
            self.assertEqual(percentile(latencies, 99), max(latencies))
        # With ninety-nine samples p99 is still the maximum; a hundred samples is the first count where it is not.
        self.assertEqual(percentile(list(range(1, 100)), 99), 99)
        self.assertEqual(percentile(list(range(1, 101)), 99), 99)

    def test_interpolation_tells_the_same_story(self):
        old, new = practice_answer.summarize(DEPLOYMENTS["old"]), practice_answer.summarize(DEPLOYMENTS["new"])
        self.assertAlmostEqual(new["mean"] - old["mean"], -40.25, places=9)
        self.assertAlmostEqual(new["p50"] - old["p50"], -150.0, places=9)
        self.assertAlmostEqual(new["p95"] - old["p95"], 844.75, places=9)
        self.assertAlmostEqual(new["p99"] - old["p99"], 992.95, places=9)
        self.assertAlmostEqual(new["p95"] - percentile(DEPLOYMENTS["new"], 95), 10.0, places=9, msg="the two methods differ by ten ms here")


if __name__ == "__main__":
    unittest.main()
