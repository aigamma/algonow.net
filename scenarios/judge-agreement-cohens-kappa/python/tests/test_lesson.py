"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
grades are fixed and nothing is random; the agreement numbers are rational
and are compared with exact fractions or a tolerance of one part in a
trillion. The permutation check is an independent oracle for the chance
formula: averaged over every arrangement of the judge's grades with the same
totals, the observed agreement must equal the chance agreement exactly."""
import itertools
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path

from judge_kappa import practice_answer
from judge_kappa.solution import GRADES, band, kappa

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "judge_kappa"
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


def always_pass(records):
    """The lazy judge of the demonstration: the human grades with every judge grade set to pass."""
    return [{"id": record["id"], "human": record["human"], "judge": "pass"} for record in records]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_pair_counts_and_totals_for_the_ten_answers(self):
        result = kappa(GRADES)
        self.assertEqual(result["counts"], {("pass", "pass"): 6, ("pass", "fail"): 1, ("fail", "pass"): 1, ("fail", "fail"): 2})
        self.assertEqual(result["human_totals"], {"pass": 7, "fail": 3})
        self.assertEqual(result["judge_totals"], {"pass": 7, "fail": 3})
        self.assertEqual(result["labels"], ["fail", "pass"], "labels are sorted, so the output order is stable")

    def test_observed_chance_and_kappa_are_the_exact_fractions(self):
        result = kappa(GRADES)
        self.assertAlmostEqual(result["observed"], float(Fraction(8, 10)), places=12)
        self.assertAlmostEqual(result["chance"], float(Fraction(29, 50)), places=12)
        # An independent form of the same statistic, in integers: (n * agreed - sum of total products) / (n squared - that sum).
        n, agreed, products = 10, 8, 3 * 3 + 7 * 7
        self.assertAlmostEqual(result["kappa"], float(Fraction(n * agreed - products, n * n - products)), places=12)
        self.assertEqual(Fraction(n * agreed - products, n * n - products), Fraction(11, 21))
        self.assertEqual(band(result["kappa"]), "moderate")

    def test_three_labels_are_handled_and_sorted(self):
        result = kappa(practice_answer.GRADES)
        self.assertEqual(result["labels"], ["fail", "partial", "pass"])
        self.assertEqual(result["human_totals"], {"pass": 6, "partial": 3, "fail": 3})
        self.assertEqual(result["judge_totals"], {"pass": 7, "partial": 2, "fail": 3})
        self.assertAlmostEqual(result["observed"], float(Fraction(8, 12)), places=12)
        self.assertAlmostEqual(result["chance"], float(Fraction(57, 144)), places=12)
        self.assertAlmostEqual(result["kappa"], float(Fraction(13, 29)), places=12)

    def test_band_thresholds(self):
        self.assertEqual(band(-0.1), "no better than chance")
        self.assertEqual(band(0.0), "no better than chance")
        self.assertEqual(band(0.19), "slight")
        self.assertEqual(band(0.2), "fair")
        self.assertEqual(band(0.4), "moderate")
        self.assertEqual(band(0.6), "substantial")
        self.assertEqual(band(0.8), "almost perfect")
        self.assertEqual(band(1.0), "almost perfect")

    def test_invalid_input_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            kappa([])
        self.assertIn("no graded answers", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            kappa([{"id": "a03", "human": "pass", "judge": ""}])
        self.assertIn("a03 has no judge grade", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            kappa([{"id": "a01", "human": "", "judge": "pass"}])
        self.assertIn("a01 has no human grade", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            kappa([{"id": "a01", "human": "pass", "judge": "pass"}, {"id": "a02", "human": "pass", "judge": "pass"}])
        self.assertIn("undefined", str(caught.exception))

    def test_input_is_not_modified(self):
        copy = [dict(record) for record in GRADES]
        kappa(GRADES)
        self.assertEqual(GRADES, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected two labels and kappa 0.50"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_collapses_into_new_records_and_leaves_the_input_alone(self):
        before = [dict(record) for record in practice_answer.GRADES]
        collapsed = practice_answer.collapse(practice_answer.GRADES, practice_answer.COLLAPSE)
        self.assertEqual(practice_answer.GRADES, before, "the input records are unchanged")
        self.assertEqual([record["judge"] for record in collapsed], ["pass", "pass", "pass", "pass", "pass", "fail", "pass", "fail", "fail", "fail", "fail", "pass"])
        self.assertEqual([record["human"] for record in collapsed], ["pass"] * 6 + ["fail"] * 6)
        result = kappa(collapsed)
        self.assertEqual(result["labels"], ["fail", "pass"])
        self.assertAlmostEqual(result["observed"], 0.75, places=12)
        self.assertAlmostEqual(result["chance"], 0.5, places=12)
        self.assertAlmostEqual(result["kappa"], 0.5, places=12)
        self.assertEqual(practice_answer.collapse([], practice_answer.COLLAPSE), [])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "GRADES = [", "# --- answer begins ---"), segment(starter, "GRADES = [", "def collapse"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def summary(result):
    return {"labels": result["labels"], "agreed": round(result["observed"] * sum(result["human_totals"].values())),
            "n": sum(result["human_totals"].values()), "observed": round(result["observed"], 6),
            "chance": round(result["chance"], 6), "kappa": round(result["kappa"], 6), "band": band(result["kappa"])}


def derive_trace():
    """Every pair, count, total, and statistic of the real functions, plus the
    lazy judge and the practice replay, all from the lesson's own code. The
    animation's JavaScript port must reproduce this exactly (six decimals)."""
    result = kappa(GRADES)
    items = [{"id": r["id"], "human": r["human"], "judge": r["judge"], "agree": r["human"] == r["judge"]} for r in GRADES]
    counts = {f"{human}|{judge}": count for (human, judge), count in sorted(result["counts"].items())}
    three = kappa(practice_answer.GRADES)
    collapsed = kappa(practice_answer.collapse(practice_answer.GRADES, practice_answer.COLLAPSE))
    return {
        "items": items,
        "counts": counts,
        "human_totals": dict(sorted(result["human_totals"].items())),
        "judge_totals": dict(sorted(result["judge_totals"].items())),
        **summary(result),
        "always_pass": summary(kappa(always_pass(GRADES))),
        "practice": {"mapping": practice_answer.COLLAPSE, "three_labels": summary(three), "collapsed": summary(collapsed)},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on grades.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_grades_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "grades.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["grades"], GRADES)
        self.assertEqual(fixture["practice_grades"], practice_answer.GRADES)
        self.assertEqual(fixture["collapse"], practice_answer.COLLAPSE)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["counts"], {"fail|fail": 2, "fail|pass": 1, "pass|fail": 1, "pass|pass": 6})
        self.assertEqual((trace["agreed"], trace["n"], trace["observed"], trace["chance"], trace["kappa"], trace["band"]), (8, 10, 0.8, 0.58, 0.52381, "moderate"))
        self.assertEqual(trace["always_pass"]["kappa"], 0.0)
        self.assertEqual((trace["practice"]["three_labels"]["kappa"], trace["practice"]["collapsed"]["kappa"]), (0.448276, 0.5))


class WhatShippedOnTheSameGrades(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the ten answers."""

    def test_raw_agreement_overstates_the_judge(self):
        result = kappa(GRADES)
        self.assertAlmostEqual(result["observed"], 0.80, places=12, msg="the number that shipped")
        self.assertLess(result["kappa"], 0.60, "kappa says moderate, not eighty percent")
        self.assertGreater(result["observed"] - result["kappa"], 0.25)

    def test_a_judge_that_passes_everything_earns_the_base_rate_and_no_kappa(self):
        lazy = kappa(always_pass(GRADES))
        self.assertAlmostEqual(lazy["observed"], 0.70, places=12, msg="seventy percent agreement for doing nothing")
        self.assertAlmostEqual(lazy["chance"], 0.70, places=12)
        self.assertAlmostEqual(lazy["kappa"], 0.0, places=12)
        self.assertEqual(band(lazy["kappa"]), "no better than chance")

    def test_chance_agreement_is_the_mean_agreement_over_every_arrangement_of_the_judge_grades(self):
        humans = [record["human"] for record in GRADES]
        arrangements = 0
        total_observed = Fraction(0)
        for fail_positions in itertools.combinations(range(len(GRADES)), 3):
            judges = ["fail" if index in fail_positions else "pass" for index in range(len(GRADES))]
            records = [{"id": str(index), "human": human, "judge": judge} for index, (human, judge) in enumerate(zip(humans, judges))]
            agreed = sum(1 for human, judge in zip(humans, judges) if human == judge)
            total_observed += Fraction(agreed, len(GRADES))
            arrangements += 1
            self.assertAlmostEqual(kappa(records)["chance"], float(Fraction(29, 50)), places=12, msg="the totals never change, so chance never changes")
        self.assertEqual(arrangements, 120)
        self.assertEqual(total_observed / arrangements, Fraction(29, 50), "the chance agreement is exactly the average agreement by luck")


if __name__ == "__main__":
    unittest.main()
