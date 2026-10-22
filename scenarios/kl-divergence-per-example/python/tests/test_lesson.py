"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; where a float is compared, the
test states the value the same arithmetic produces, rounded, or a tight bound."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from divergence import practice_answer
from divergence.solution import (EXAMPLES, FLOOR, ROUTES, TOLERANCE, agreement, check_distribution,
                                 kl_divergence, kl_terms, rank_by_divergence, top_route)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "divergence"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
THRESHOLD = 0.2            # the divergence above which a route is worth a look


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


def by_id(example_id):
    return next(example for example in EXAMPLES if example["id"] == example_id)


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_a_distribution_must_be_nonnegative_and_sum_to_one(self):
        check_distribution([0.5, 0.5])
        check_distribution([1.0, 0.0, 0.0])
        check_distribution([0.3333333, 0.3333333, 0.3333334])
        with self.assertRaises(ValueError) as short:
            check_distribution([0.5, 0.3, 0.1])
        self.assertIn("sums to 0.9", str(short.exception))
        with self.assertRaises(ValueError) as negative:
            check_distribution([1.2, -0.2])
        self.assertIn("negative", str(negative.exception))
        with self.assertRaises(ValueError):
            kl_divergence([0.5, 0.5], [0.6, 0.6])

    def test_identical_distributions_diverge_by_zero(self):
        for example in EXAMPLES:
            self.assertEqual(kl_divergence(example["teacher"], example["teacher"]), 0.0)
        self.assertEqual(kl_terms([0.2, 0.8], [0.2, 0.8]), [0.0, 0.0])

    def test_one_term_is_the_hand_computed_value(self):
        # teacher 0.8 against student 0.5 on one route: 0.8 times the log of 1.6
        terms = kl_terms([0.1, 0.8, 0.1], [0.4, 0.5, 0.1])
        self.assertEqual(terms[1], 0.8 * math.log(0.8 / 0.5))
        self.assertEqual(terms[2], 0.0)
        self.assertEqual(kl_divergence([0.1, 0.8, 0.1], [0.4, 0.5, 0.1]), terms[0] + terms[1] + terms[2])

    def test_the_four_examples_land_where_the_page_says(self):
        values = {example["id"]: round(kl_divergence(example["teacher"], example["student"]), 4) for example in EXAMPLES}
        self.assertEqual(values, {"e1": 0.0268, "e2": 0.2374, "e3": 0.0076, "e4": 0.043})
        terms = [round(term, 4) for term in kl_terms(by_id("e2")["teacher"], by_id("e2")["student"])]
        self.assertEqual(terms, [-0.1386, 0.376, 0.0])
        mean = sum(kl_divergence(example["teacher"], example["student"]) for example in EXAMPLES) / len(EXAMPLES)
        self.assertEqual(round(mean, 4), 0.0787)

    def test_divergence_is_never_negative_and_not_symmetric(self):
        for example in EXAMPLES:
            forward = kl_divergence(example["teacher"], example["student"])
            backward = kl_divergence(example["student"], example["teacher"])
            self.assertGreaterEqual(forward, 0.0)
            self.assertGreaterEqual(backward, 0.0)
        e2 = by_id("e2")
        self.assertEqual(round(kl_divergence(e2["teacher"], e2["student"]), 4), 0.2374)
        self.assertEqual(round(kl_divergence(e2["student"], e2["teacher"]), 4), 0.3195)

    def test_a_zero_student_probability_is_clipped_not_a_crash(self):
        # the teacher keeps a tenth on outage, the student gives it nothing: a huge but finite number
        value = kl_divergence([0.7, 0.2, 0.1], [0.7, 0.3, 0.0])
        self.assertTrue(math.isfinite(value))
        self.assertAlmostEqual(value, 0.1 * math.log(0.1 / FLOOR) + 0.2 * math.log(0.2 / 0.3), places=12)
        self.assertGreater(value, 1.5)
        # a zero where the teacher has no mass contributes nothing
        self.assertEqual(kl_terms([0.0, 1.0], [0.0, 1.0]), [0.0, 0.0])

    def test_ranking_is_worst_first_with_an_id_tie_break(self):
        ranked = rank_by_divergence(EXAMPLES)
        self.assertEqual([example_id for _, example_id in ranked], ["e2", "e4", "e1", "e3"])
        twins = [{"id": "b", "teacher": [0.5, 0.5], "student": [0.5, 0.5]},
                 {"id": "a", "teacher": [0.5, 0.5], "student": [0.5, 0.5]}]
        self.assertEqual([example_id for _, example_id in rank_by_divergence(twins)], ["a", "b"])

    def test_inputs_are_not_modified(self):
        before = json.dumps(EXAMPLES)
        rank_by_divergence(EXAMPLES)
        agreement(EXAMPLES)
        self.assertEqual(json.dumps(EXAMPLES), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the Jensen-Shannon divergence for e2"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_is_symmetric_bounded_and_lands_where_the_page_says(self):
        values = {}
        for example in EXAMPLES:
            forward = practice_answer.js_divergence(example["teacher"], example["student"])
            backward = practice_answer.js_divergence(example["student"], example["teacher"])
            self.assertAlmostEqual(forward, backward, places=12)
            self.assertGreaterEqual(forward, 0.0)
            self.assertLessEqual(forward, math.log(2))
            self.assertEqual(practice_answer.js_divergence(example["teacher"], example["teacher"]), 0.0)
            values[example["id"]] = round(forward, 4)
        self.assertEqual(values, {"e1": 0.007, "e2": 0.0657, "e3": 0.0019, "e4": 0.0079})

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "ROUTES = [", "# --- answer begins ---"),
                         segment(starter, "ROUTES = [", "def js_divergence"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every example's terms, divergence, top routes, and JS value, the mean, the
    two rankings, and the agreement, all from the lesson's own functions. The
    animation's JavaScript port must reproduce this exactly (six decimals)."""
    rows = []
    for example in EXAMPLES:
        terms = kl_terms(example["teacher"], example["student"])
        rows.append({
            "id": example["id"],
            "teacher": example["teacher"],
            "student": example["student"],
            "terms": [round(term, 6) for term in terms],
            "kl": round(kl_divergence(example["teacher"], example["student"]), 6),
            "js": round(practice_answer.js_divergence(example["teacher"], example["student"]), 6),
            "teacher_top": top_route(example["teacher"]),
            "student_top": top_route(example["student"]),
        })
    mean = sum(kl_divergence(example["teacher"], example["student"]) for example in EXAMPLES) / len(EXAMPLES)
    js_ranked = sorted(((practice_answer.js_divergence(e["teacher"], e["student"]), e["id"]) for e in EXAMPLES),
                       key=lambda pair: (-pair[0], pair[1]))
    return {
        "routes": ROUTES,
        "rows": rows,
        "mean_kl": round(mean, 6),
        "ranked": [[round(kl, 6), example_id] for kl, example_id in rank_by_divergence(EXAMPLES)],
        "ranked_js": [[round(js, 6), example_id] for js, example_id in js_ranked],
        "agreement": agreement(EXAMPLES),
        "threshold": THRESHOLD,
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on examples.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_examples_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "examples.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"routes": ROUTES, "examples": EXAMPLES, "tolerance": TOLERANCE,
                                   "floor": FLOOR, "threshold": THRESHOLD})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([row["kl"] for row in trace["rows"]], [0.026812, 0.237373, 0.007648, 0.042969])
        self.assertEqual(trace["rows"][1]["terms"], [-0.138629, 0.376003, 0.0])
        self.assertEqual(trace["ranked"][0], [0.237373, "e2"])
        self.assertEqual(trace["ranked_js"][0], [0.065651, "e2"])
        self.assertEqual(trace["agreement"], 4)


class TopRouteAgreementOnTheSameExamples(unittest.TestCase):
    """The evaluation that separates the lesson's measurement from the one that shipped."""

    def test_the_top_routes_agree_on_every_example(self):
        self.assertEqual(agreement(EXAMPLES), 4)
        for example in EXAMPLES:
            self.assertEqual(top_route(example["teacher"]), top_route(example["student"]))
        self.assertEqual(top_route([0.1, 0.8, 0.1]), 1)
        self.assertEqual(top_route([0.5, 0.5]), 0, "the first of equal values wins")

    def test_divergence_still_ranks_e2_first_above_the_threshold(self):
        ranked = rank_by_divergence(EXAMPLES)
        self.assertEqual(ranked[0][1], "e2")
        self.assertGreater(ranked[0][0], THRESHOLD)
        self.assertTrue(all(kl < THRESHOLD for kl, example_id in ranked if example_id != "e2"))
        e2 = by_id("e2")
        self.assertEqual(round(e2["teacher"][1], 2), 0.8, "the teacher is sure of access")
        self.assertEqual(round(e2["student"][1], 2), 0.5, "the student gives access only half the mass")


if __name__ == "__main__":
    unittest.main()
