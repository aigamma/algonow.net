"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact up to
floating point: margins are differences of the given probabilities, compared
to nine places, and entropies are compared to six places against an
independent computation with math.log."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from margin_selection import practice_answer
from margin_selection.solution import BUDGET, CANDIDATES, ROUTES, by_margin, score, select

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "margin_selection"
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


def independent_margin(probs):
    """Largest minus second largest, found without sorting."""
    largest = second = float("-inf")
    for p in probs:
        if p > largest:
            largest, second = p, largest
        elif p > second:
            second = p
    return largest - second


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_scores_name_the_top_two_routes_and_the_margin(self):
        scored, picked = select(CANDIDATES, ROUTES, BUDGET)
        self.assertEqual([row["top"] for row in scored], ["billing", "access", "access", "billing", "outage", "outage", "outage", "access"])
        self.assertEqual([row["second"] for row in scored], ["access", "outage", "outage", "outage", "access", "billing", "billing", "billing"])
        for candidate, row in zip(CANDIDATES, scored):
            self.assertAlmostEqual(row["margin"], independent_margin(candidate["probs"]), places=9, msg=row["id"])
        self.assertAlmostEqual(scored[0]["margin"], 0.87, places=9)
        self.assertAlmostEqual(scored[3]["margin"], 0.01, places=9)
        self.assertAlmostEqual(scored[5]["margin"], 0.01, places=9)

    def test_the_smallest_margins_are_picked_with_ties_broken_by_id(self):
        scored, picked = select(CANDIDATES, ROUTES, BUDGET)
        self.assertEqual(picked, ["u4", "u6", "u2"])
        ranked = sorted(scored, key=by_margin)
        self.assertEqual([row["id"] for row in ranked], ["u4", "u6", "u2", "u7", "u3", "u8", "u5", "u1"])
        self.assertEqual(select(CANDIDATES, ROUTES, 0)[1], [])
        self.assertEqual(len(select(CANDIDATES, ROUTES, len(CANDIDATES))[1]), 8)
        self.assertEqual(select(list(reversed(CANDIDATES)), ROUTES, BUDGET)[1], ["u4", "u6", "u2"], "arrival order does not change the picks")

    def test_invalid_input_is_rejected_and_input_unchanged(self):
        with self.assertRaises(ValueError) as caught:
            score([0.60, 0.60, 0.10], ROUTES)
        self.assertIn("sum to 1", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            score([0.50, 0.50], ROUTES)
        self.assertIn("2 probabilities for 3 routes", str(caught.exception))
        with self.assertRaises(ValueError):
            select(CANDIDATES, ROUTES, 9)
        with self.assertRaises(ValueError):
            select(CANDIDATES, ROUTES, -1)
        copy = [{"id": c["id"], "probs": list(c["probs"])} for c in CANDIDATES]
        select(CANDIDATES, ROUTES, BUDGET)
        self.assertEqual(CANDIDATES, copy, "sorted makes copies; the probabilities keep their order")

    def test_margin_edges(self):
        self.assertAlmostEqual(score([1.0, 0.0, 0.0], ROUTES)[2], 1.0, places=9)
        self.assertAlmostEqual(score([0.5, 0.5, 0.0], ROUTES)[2], 0.0, places=9)
        top, second, gap = score([0.5, 0.5, 0.0], ROUTES)
        self.assertEqual({top, second}, {"billing", "access"})
        self.assertAlmostEqual(score([1 / 3, 1 / 3, 1 / 3], ROUTES)[2], 0.0, places=9)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the entropy ranking to pick u4, u6, u3"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_ranks_by_entropy_and_changes_the_third_pick(self):
        scored, picked = practice_answer.select(CANDIDATES, ROUTES, BUDGET)
        self.assertEqual(picked, ["u4", "u6", "u3"])
        for candidate, row in zip(CANDIDATES, scored):
            reference = -sum(p * math.log(p) for p in candidate["probs"] if p > 0)
            self.assertAlmostEqual(row["uncertainty"], reference, places=9, msg=row["id"])
        by_id = {row["id"]: row["uncertainty"] for row in scored}
        self.assertAlmostEqual(by_id["u4"], 1.099, places=3)
        self.assertAlmostEqual(by_id["u6"], 1.061, places=3)
        self.assertAlmostEqual(by_id["u3"], 0.938, places=3)
        self.assertAlmostEqual(by_id["u2"], 0.898, places=3)
        self.assertGreater(by_id["u3"], by_id["u2"], "entropy sees u3's spread, margin did not")
        self.assertAlmostEqual(practice_answer.uncertainty([1.0, 0.0, 0.0], ROUTES)[1], 0.0, places=9)
        self.assertAlmostEqual(practice_answer.uncertainty([1 / 3, 1 / 3, 1 / 3], ROUTES)[1], math.log(3), places=9)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "ROUTES = [", "# --- answer begins ---"), segment(starter, "ROUTES = [", "def uncertainty"))
        self.assertEqual(segment(answer, "def most_uncertain_first"), segment(starter, "def most_uncertain_first"))


def derive_trace():
    """Every score, the ranking, the picks, what the first three cost, and the
    practice entropies, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly (six decimals)."""
    scored, picked = select(CANDIDATES, ROUTES, BUDGET)
    ranked = sorted(scored, key=by_margin)
    margins = {row["id"]: row["margin"] for row in scored}
    first = [c["id"] for c in CANDIDATES[:BUDGET]]
    entropy_scored, entropy_picked = practice_answer.select(CANDIDATES, ROUTES, BUDGET)
    return {
        "routes": ROUTES,
        "budget": BUDGET,
        "rows": [{"id": row["id"], "probs": candidate["probs"], "top": row["top"], "second": row["second"], "margin": round(row["margin"], 6)}
                 for candidate, row in zip(CANDIDATES, scored)],
        "ranking": [row["id"] for row in ranked],
        "picked": picked,
        "picked_mean_margin": round(sum(margins[i] for i in picked) / BUDGET, 6),
        "shipped": {"picked": first, "mean_margin": round(sum(margins[i] for i in first) / BUDGET, 6)},
        "practice": {"rows": [{"id": row["id"], "top": row["top"], "entropy": round(row["uncertainty"], 6)} for row in entropy_scored],
                     "picked": entropy_picked, "even_split": round(math.log(len(ROUTES)), 6)},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on candidates.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_candidates_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "candidates.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["candidates"], CANDIDATES)
        self.assertEqual(practice_answer.CANDIDATES, CANDIDATES)
        self.assertEqual((fixture["routes"], fixture["budget"]), (ROUTES, BUDGET))

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["picked"], ["u4", "u6", "u2"])
        self.assertEqual(trace["ranking"], ["u4", "u6", "u2", "u7", "u3", "u8", "u5", "u1"])
        self.assertEqual((trace["picked_mean_margin"], trace["shipped"]["mean_margin"]), (0.016667, 0.416667))
        self.assertEqual(trace["practice"]["picked"], ["u4", "u6", "u3"])


class WhatShippedOnTheSameCandidates(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the eight prompts."""

    def test_the_first_three_spend_a_teacher_call_on_a_sure_prompt(self):
        scored, picked = select(CANDIDATES, ROUTES, BUDGET)
        margins = {row["id"]: row["margin"] for row in scored}
        first = [c["id"] for c in CANDIDATES[:BUDGET]]
        self.assertEqual(first, ["u1", "u2", "u3"])
        self.assertAlmostEqual(margins["u1"], 0.87, places=9, msg="the student is already sure about u1")
        self.assertAlmostEqual(sum(margins[i] for i in first) / BUDGET, 0.416667, places=6)
        self.assertAlmostEqual(sum(margins[i] for i in picked) / BUDGET, 0.016667, places=6)

    def test_every_pick_has_a_smaller_margin_than_every_waiting_prompt(self):
        scored, picked = select(CANDIDATES, ROUTES, BUDGET)
        margins = {row["id"]: row["margin"] for row in scored}
        waiting = [row["id"] for row in scored if row["id"] not in picked]
        self.assertLessEqual(max(margins[i] for i in picked), min(margins[i] for i in waiting))

    def test_margin_and_entropy_agree_on_the_two_most_torn_prompts(self):
        scored, picked = select(CANDIDATES, ROUTES, BUDGET)
        entropy_scored, entropy_picked = practice_answer.select(CANDIDATES, ROUTES, BUDGET)
        self.assertEqual(picked[:2], entropy_picked[:2])
        self.assertNotEqual(picked[2], entropy_picked[2], "they differ on whether u2's two-way doubt or u3's three-way spread matters more")


if __name__ == "__main__":
    unittest.main()
