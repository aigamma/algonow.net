"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise compare directly. Expectations are exact: the inputs
are fixed lists and nothing is random."""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from paired_eval import practice_answer
from paired_eval.solution import GOLD, IDS, PROMPT_A, PROMPT_B, compare, describe, percent

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "paired_eval"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"

BOTH, ONLY_A, ONLY_B, NEITHER = (True, True), (True, False), (False, True), (False, False)
CELL_NAMES = {BOTH: "both", ONLY_A: "only_a", ONLY_B: "only_b", NEITHER: "neither"}


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


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_two_by_two_counts_and_totals(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(result["counts"], {BOTH: 3, ONLY_A: 2, ONLY_B: 3, NEITHER: 1})
        self.assertEqual((result["n"], result["a_right"], result["b_right"]), (9, 5, 6))
        self.assertEqual((percent(5, 9), percent(6, 9)), ("56%", "67%"))

    def test_regressions_and_gains_by_ticket(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(result["regressions"], [("t3", "outage"), ("t5", "outage")])
        self.assertEqual(result["gains"], [("t4", "feature"), ("t6", "billing"), ("t7", "access")])
        self.assertEqual(describe(result["regressions"]), "t3 outage, t5 outage")

    def test_every_ticket_lands_in_exactly_one_cell(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(sum(result["counts"].values()), len(IDS))
        for ticket, label, answer_a, answer_b in zip(IDS, GOLD, PROMPT_A, PROMPT_B, strict=True):
            single = compare([ticket], [label], [answer_a], [answer_b])["counts"]
            self.assertEqual(sorted(single.values()), [0, 0, 0, 1], ticket)

    def test_accuracy_equals_the_row_and_column_sums(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        counts = result["counts"]
        self.assertEqual(result["a_right"], counts[BOTH] + counts[ONLY_A])
        self.assertEqual(result["b_right"], counts[BOTH] + counts[ONLY_B])
        self.assertEqual(result["a_right"], sum(answer == label for answer, label in zip(PROMPT_A, GOLD)))

    def test_unequal_lengths_raise_value_error(self):
        with self.assertRaises(ValueError) as caught:
            compare(IDS, GOLD[:8], PROMPT_A, PROMPT_B)
        self.assertIn("argument 2 is shorter", str(caught.exception))
        with self.assertRaises(ValueError):
            compare(IDS[:8], GOLD, PROMPT_A, PROMPT_B)
        with self.assertRaises(ValueError):
            compare(IDS, GOLD, PROMPT_A, PROMPT_B + ["billing"])

    def test_input_lists_are_not_modified(self):
        before = copy.deepcopy((IDS, GOLD, PROMPT_A, PROMPT_B))
        compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual((IDS, GOLD, PROMPT_A, PROMPT_B), before)

    def test_empty_set_gives_zero_counts_and_no_division_error(self):
        result = compare([], [], [], [])
        self.assertEqual(result, {"n": 0, "a_right": 0, "b_right": 0,
                                  "counts": {BOTH: 0, ONLY_A: 0, ONLY_B: 0, NEITHER: 0},
                                  "regressions": [], "gains": []})
        self.assertEqual(percent(0, 0), "0%")

    def test_exact_comparison_is_case_and_whitespace_sensitive(self):
        self.assertEqual(PROMPT_B[4], "Outage ")
        result = compare(["t5"], ["outage"], ["outage"], ["Outage "])
        self.assertEqual(result["counts"][ONLY_A], 1, "the policy of the worked example: exact strings")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected prompt B right 7 of 9 after normalizing, got 6 of 9"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_normalizes_case_and_whitespace(self):
        result = practice_answer.compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(result["counts"], {BOTH: 4, ONLY_A: 1, ONLY_B: 3, NEITHER: 1})
        self.assertEqual((result["a_right"], result["b_right"]), (5, 7))
        self.assertEqual(result["regressions"], [("t3", "outage")])
        self.assertEqual(practice_answer.normalize("  Outage "), "outage")

    def test_answer_matches_the_worked_example_on_clean_labels(self):
        clean_b = [answer.strip().lower() for answer in PROMPT_B]
        self.assertEqual(practice_answer.compare(IDS, GOLD, PROMPT_A, clean_b), compare(IDS, GOLD, PROMPT_A, clean_b))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, 'IDS = ["t1"', "# --- answer begins ---"),
                         segment(starter, 'IDS = ["t1"', "def normalize"))
        self.assertEqual(segment(answer, "def compare"), segment(starter, "def compare"))


class AggregateVersusPaired(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the nine tickets."""

    def test_aggregate_accuracy_alone_would_have_approved_prompt_b(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertGreater(result["b_right"], result["a_right"], "B wins on aggregate accuracy")
        self.assertEqual(len(result["regressions"]), 2, "and still regresses two tickets")
        self.assertEqual({label for ticket, label in result["regressions"]}, {"outage"}, "both outage tickets")

    def test_net_change_equals_gains_minus_regressions(self):
        result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(len(result["gains"]) - len(result["regressions"]), result["b_right"] - result["a_right"])
        self.assertEqual((len(result["gains"]), len(result["regressions"])), (3, 2))


def derive_trace(compare_function, ids, gold, a, b):
    """Trace every ticket's cell by comparing it on its own with the real function,
    then the whole set. The animation's JavaScript port must reproduce this exactly."""
    items = []
    for ticket, label, answer_a, answer_b in zip(ids, gold, a, b, strict=True):
        single = compare_function([ticket], [label], [answer_a], [answer_b])
        cell = [key for key, count in single["counts"].items() if count == 1][0]
        items.append({"id": ticket, "gold": label, "a": answer_a, "b": answer_b,
                      "a_right": cell[0], "b_right": cell[1], "cell": CELL_NAMES[cell]})
    whole = compare_function(ids, gold, a, b)
    return {
        "items": items,
        "counts": {CELL_NAMES[key]: count for key, count in whole["counts"].items()},
        "regressions": [list(pair) for pair in whole["regressions"]],
        "gains": [list(pair) for pair in whole["gains"]],
        "accuracy": {"a": whole["a_right"], "b": whole["b_right"], "n": whole["n"]},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on tickets.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_tickets_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "tickets.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"ids": IDS, "gold": GOLD, "prompt_a": PROMPT_A, "prompt_b": PROMPT_B})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace(compare, IDS, GOLD, PROMPT_A, PROMPT_B)
        trace["normalized"] = derive_trace(practice_answer.compare, IDS, GOLD, PROMPT_A, PROMPT_B)
        self.assertEqual(fixture, trace)
        self.assertEqual([item["cell"] for item in trace["items"]],
                         ["both", "both", "only_a", "only_b", "only_a", "only_b", "only_b", "both", "neither"])
        self.assertEqual(trace["normalized"]["items"][4]["cell"], "both", "t5 moves after normalizing")
        self.assertEqual(trace["normalized"]["accuracy"], {"a": 5, "b": 7, "n": 9})


if __name__ == "__main__":
    unittest.main()
