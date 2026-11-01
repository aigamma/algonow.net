"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
votes are fixed strings, the tallies are integers, and every agreement is a
count over five. The independent tally is a plain dictionary built without
Counter."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from teacher_votes import practice_answer
from teacher_votes.solution import SAMPLES, THRESHOLD, decide, filter_samples, normalize

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "teacher_votes"
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


def plain_tally(votes):
    tally = {}
    for vote in votes:
        key = vote.strip().lower()
        tally[key] = tally.get(key, 0) + 1
    return tally


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_normalization_merges_spellings(self):
        self.assertEqual(normalize("Billing"), "billing")
        self.assertEqual(normalize("billing "), "billing")
        self.assertEqual(normalize("  OUTAGE\n"), "outage")
        self.assertEqual(normalize("access"), "access")

    def test_counts_match_an_independent_tally_and_keep_most_common_order(self):
        for prompt, decision in zip(SAMPLES, filter_samples(SAMPLES, THRESHOLD)):
            self.assertEqual(decision["counts"], plain_tally(prompt["votes"]), prompt["id"])
            counts = list(decision["counts"].values())
            self.assertEqual(counts, sorted(counts, reverse=True), "largest count first")
            self.assertEqual(sum(counts), 5)
        decisions = filter_samples(SAMPLES, THRESHOLD)
        self.assertEqual(list(decisions[2]["counts"].items()), [("access", 2), ("billing", 2), ("outage", 1)], "ties keep first-seen order")
        self.assertEqual(decisions[4]["counts"], {"billing": 3, "outage": 1, "access": 1})

    def test_decisions_labels_and_agreements(self):
        decisions = filter_samples(SAMPLES, THRESHOLD)
        self.assertEqual([d["action"] for d in decisions], ["kept", "kept", "dropped", "kept", "kept"])
        self.assertEqual([d.get("label") for d in decisions], ["billing", "access", None, "outage", "billing"])
        self.assertEqual([d.get("agreement") for d in decisions], [1.0, 0.6, None, 0.8, 0.6])
        self.assertEqual(decisions[2]["reason"], "tie at 2")

    def test_threshold_edges_and_a_low_agreement_drop(self):
        two_of_five = {"id": "x", "votes": ["a", "a", "b", "c", "d"]}
        self.assertEqual(decide(two_of_five, 0.6)["action"], "dropped")
        self.assertEqual(decide(two_of_five, 0.6)["reason"], "agreement 0.40 below 0.60")
        three_of_five = {"id": "y", "votes": ["a", "a", "a", "b", "c"]}
        self.assertEqual(decide(three_of_five, 0.6)["action"], "kept", "exactly the threshold is kept")
        self.assertEqual(decide(three_of_five, 0.8)["action"], "dropped")
        self.assertEqual(decide(three_of_five, 1.0)["action"], "dropped")
        unanimous = {"id": "z", "votes": ["a", "a", "a"]}
        self.assertEqual(decide(unanimous, 1.0)["action"], "kept")
        self.assertEqual(decide({"id": "w", "votes": ["a"]}, 0.6)["agreement"], 1.0, "a single sample is unanimous")

    def test_invalid_input_is_rejected_and_input_unchanged(self):
        with self.assertRaises(ValueError) as caught:
            decide({"id": "p9", "votes": []}, THRESHOLD)
        self.assertIn("p9 has no samples", str(caught.exception))
        for bad in (0.5, 0.0, 1.5, -0.1):
            with self.assertRaises(ValueError):
                filter_samples(SAMPLES, bad)
        self.assertEqual(filter_samples([], THRESHOLD), [])
        copy = [{"id": p["id"], "votes": list(p["votes"])} for p in SAMPLES]
        filter_samples(SAMPLES, THRESHOLD)
        self.assertEqual(SAMPLES, copy, "normalization never writes back into the votes")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 1 gold, 3 silver, and 1 dropped"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_grades_tiers(self):
        self.assertEqual(practice_answer.tier_of(1.0, 0.6), "gold")
        self.assertEqual(practice_answer.tier_of(0.8, 0.6), "silver")
        self.assertEqual(practice_answer.tier_of(0.6, 0.6), "silver")
        self.assertEqual(practice_answer.tier_of(0.4, 0.6), "dropped")
        self.assertEqual(practice_answer.tier_of(1.0, 1.0), "gold", "gold is tested before the threshold")
        decisions = practice_answer.filter_samples(SAMPLES, THRESHOLD)
        self.assertEqual([d.get("tier") for d in decisions], ["gold", "silver", None, "silver", "silver"])
        self.assertEqual([d["action"] for d in decisions], [d["action"] for d in filter_samples(SAMPLES, THRESHOLD)], "the same prompts are kept")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "SAMPLES = [", "# --- answer begins ---"), segment(starter, "SAMPLES = [", "def tier_of"))
        self.assertEqual(segment(answer, "def decide"), segment(starter, "def decide"))


def shipped_labels(decisions):
    rows = []
    for prompt, decision in zip(SAMPLES, decisions):
        first = normalize(prompt["votes"][0])
        if decision["action"] == "kept" and first == decision["label"]:
            status = "same"
        elif decision["action"] == "kept":
            status = "minority"
        else:
            status = "unsettled"
        rows.append({"id": prompt["id"], "first": first, "status": status})
    return rows


def derive_trace():
    """Every tally, decision, and shipped label of the real functions, plus the
    practice tiers, all from the lesson's own code. The animation's JavaScript
    port must reproduce this exactly."""
    decisions = filter_samples(SAMPLES, THRESHOLD)
    tiers = practice_answer.filter_samples(SAMPLES, THRESHOLD)
    shipped = shipped_labels(decisions)
    prompts = []
    for prompt, decision in zip(SAMPLES, decisions):
        prompts.append({"id": prompt["id"], "votes": prompt["votes"], "normalized": [normalize(v) for v in prompt["votes"]],
                        "counts": [[answer, count] for answer, count in decision["counts"].items()], "action": decision["action"],
                        "label": decision.get("label"), "agreement": decision.get("agreement"), "reason": decision.get("reason")})
    return {
        "threshold": THRESHOLD,
        "prompts": prompts,
        "kept": sum(1 for d in decisions if d["action"] == "kept"),
        "shipped": {"labels": shipped, "wrong": sum(1 for row in shipped if row["status"] != "same")},
        "practice": {"tiers": [{"id": d["id"], "tier": d.get("tier", "dropped")} for d in tiers],
                     "counts": {"gold": sum(1 for d in tiers if d.get("tier") == "gold"), "silver": sum(1 for d in tiers if d.get("tier") == "silver"),
                                "dropped": sum(1 for d in tiers if d["action"] == "dropped")}},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on samples.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_samples_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "samples.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["samples"], SAMPLES)
        self.assertEqual(practice_answer.SAMPLES, SAMPLES)
        self.assertEqual(fixture["threshold"], THRESHOLD)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([p["action"] for p in trace["prompts"]], ["kept", "kept", "dropped", "kept", "kept"])
        self.assertEqual(trace["prompts"][4]["counts"], [["billing", 3], ["outage", 1], ["access", 1]])
        self.assertEqual(trace["shipped"]["wrong"], 2)
        self.assertEqual(trace["practice"]["counts"], {"gold": 1, "silver": 3, "dropped": 1})


class WhatShippedOnTheSameSamples(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five prompts."""

    def test_the_first_sample_labels_two_prompts_wrongly_or_prematurely(self):
        rows = shipped_labels(filter_samples(SAMPLES, THRESHOLD))
        self.assertEqual([row["status"] for row in rows], ["same", "same", "unsettled", "same", "minority"])
        self.assertEqual(rows[4]["first"], "outage", "p5's first sample is a minority answer against a billing majority")

    def test_without_normalization_p5_would_be_dropped(self):
        raw_tally = {}
        for vote in SAMPLES[4]["votes"]:
            raw_tally[vote] = raw_tally.get(vote, 0) + 1
        self.assertEqual(max(raw_tally.values()), 1, "every raw spelling is different")
        self.assertEqual(decide(SAMPLES[4], THRESHOLD)["action"], "kept")

    def test_a_tie_is_dropped_even_though_its_top_share_is_no_lower_than_a_kept_prompt_might_allow(self):
        decisions = filter_samples(SAMPLES, THRESHOLD)
        self.assertEqual(decisions[2]["action"], "dropped")
        self.assertEqual(max(decisions[2]["counts"].values()), 2)
        self.assertLess(2 / 5, THRESHOLD)


if __name__ == "__main__":
    unittest.main()
