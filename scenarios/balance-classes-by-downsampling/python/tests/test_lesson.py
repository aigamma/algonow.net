"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
seed fixes the sample, so every kept and dropped id is a known value."""
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from class_balance import practice_answer
from class_balance.solution import CAP, RECORDS, SEED, count_labels, downsample, group_by_label, ids_of

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "class_balance"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
FLOOR = practice_answer.FLOOR
KEPT = ["r2", "r5", "r6", "r7", "r8", "r10", "r11", "r12"]
DROPPED = ["r1", "r3", "r4", "r9"]


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

    def test_counts_and_groups_follow_the_input(self):
        self.assertEqual(dict(count_labels(RECORDS)), {"billing": 7, "access": 3, "outage": 2})
        groups = group_by_label(RECORDS)
        self.assertEqual(list(groups), ["billing", "access", "outage"], "labels appear in order of first sight")
        self.assertEqual(ids_of(groups["billing"]), ["r1", "r3", "r4", "r6", "r8", "r9", "r12"])
        self.assertEqual(ids_of(groups["outage"]), ["r5", "r10"])

    def test_downsample_caps_only_the_label_over_the_cap(self):
        kept, dropped = downsample(RECORDS, CAP, SEED)
        self.assertEqual(ids_of(kept), KEPT)
        self.assertEqual(dropped, DROPPED)
        self.assertEqual(dict(count_labels(kept)), {"access": 3, "billing": 3, "outage": 2})
        for record in RECORDS:
            if record["id"] in dropped:
                self.assertEqual(record["label"], "billing", "only the label over the cap loses records")

    def test_kept_records_are_the_originals_in_input_order(self):
        kept, _ = downsample(RECORDS, CAP, SEED)
        by_id = {record["id"]: record for record in RECORDS}
        for record in kept:
            self.assertIs(record, by_id[record["id"]], "kept records are the input dictionaries, not copies")
        positions = [ids_of(RECORDS).index(record_id) for record_id in ids_of(kept)]
        self.assertEqual(positions, sorted(positions))

    def test_same_seed_repeats_and_another_seed_differs(self):
        self.assertEqual(downsample(RECORDS, CAP, SEED), downsample(RECORDS, CAP, SEED))
        self.assertNotEqual(downsample(RECORDS, CAP, 12)[1], DROPPED)
        for seed in range(20):
            kept, dropped = downsample(RECORDS, CAP, seed)
            self.assertEqual(max(count_labels(kept).values()), CAP, "no label ever exceeds the cap")
            self.assertEqual(len(kept) + len(dropped), len(RECORDS))

    def test_a_cap_at_or_above_the_biggest_label_drops_nothing(self):
        for cap in (7, 50):
            kept, dropped = downsample(RECORDS, cap, SEED)
            self.assertEqual(ids_of(kept), ids_of(RECORDS))
            self.assertEqual(dropped, [])

    def test_bad_cap_and_missing_label_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            downsample(RECORDS, 0, SEED)
        self.assertIn("cap must be at least 1", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            downsample([{"id": "r13", "text": "no label"}], CAP, SEED)
        self.assertIn("r13", str(caught.exception))
        with self.assertRaises(ValueError):
            count_labels([{"id": "r14"}])

    def test_input_is_not_modified(self):
        snapshot = json.dumps(RECORDS)
        downsample(RECORDS, CAP, SEED)
        self.assertEqual(json.dumps(RECORDS), snapshot)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected every label lifted to the floor of 3"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_lifts_the_small_label_with_one_seeded_repeat(self):
        kept, dropped, repeats = practice_answer.balance(RECORDS, CAP, FLOOR, SEED)
        self.assertEqual(repeats, ["r10"])
        self.assertEqual(ids_of(kept), KEPT + ["r10"])
        self.assertEqual(dropped, DROPPED)
        self.assertEqual(dict(count_labels(kept)), {"access": 3, "billing": 3, "outage": 3})
        self.assertIs(kept[-1], kept[5], "the repeat is the same record object appended again")

    def test_answer_with_a_floor_within_the_counts_repeats_nothing(self):
        kept, dropped, repeats = practice_answer.balance(RECORDS, CAP, 2, SEED)
        self.assertEqual(repeats, [])
        self.assertEqual((ids_of(kept), dropped), (KEPT, DROPPED))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "RECORDS = [", "# --- answer begins ---"), segment(starter, "RECORDS = [", "def balance"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every decision of the real functions on the lesson's records: the seeded
    sample per label, the kept and dropped ids, the counts, the majority
    baseline, and the practice repeat. The animation's JavaScript port cannot
    reproduce random.Random, so it takes the sampled ids and the repeats from
    this fixture and must derive everything else to match it exactly."""
    groups = group_by_label(RECORDS)
    rng = random.Random(SEED)
    sampled = {}
    for label in sorted(groups):
        group = groups[label]
        sampled[label] = ids_of(group) if len(group) <= CAP else ids_of(rng.sample(group, CAP))
    kept, dropped = downsample(RECORDS, CAP, SEED)
    before, after = count_labels(RECORDS), count_labels(kept)
    p_kept, _, repeats = practice_answer.balance(RECORDS, CAP, FLOOR, SEED)
    p_after = count_labels(p_kept)
    return {
        "cap": CAP, "seed": SEED, "floor": FLOOR, "labels": sorted(groups),
        "before": {label: before[label] for label in sorted(before)},
        "sampled": sampled, "kept": ids_of(kept), "dropped": dropped,
        "after": {label: after[label] for label in sorted(after)},
        "majority": {"before": [max(before.values()), len(RECORDS)], "after": [max(after.values()), len(kept)]},
        "practice": {"repeats": repeats, "kept": ids_of(p_kept),
                     "after": {label: p_after[label] for label in sorted(p_after)},
                     "majority": [max(p_after.values()), len(p_kept)]},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on records.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_records_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "records.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"records": RECORDS, "cap": CAP, "seed": SEED, "floor": FLOOR})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["sampled"]["billing"], ["r6", "r8", "r12"], "the seeded sample, in the order it was drawn")
        self.assertEqual(trace["sampled"]["access"], ["r2", "r7", "r11"])
        self.assertEqual(set(trace["sampled"]["billing"]) | {"r2", "r7", "r11", "r5", "r10"}, set(KEPT))
        self.assertEqual((trace["kept"], trace["dropped"]), (KEPT, DROPPED))
        self.assertEqual(trace["majority"], {"before": [7, 12], "after": [3, 8]})
        self.assertEqual(trace["practice"]["repeats"], ["r10"])
        self.assertEqual(trace["practice"]["majority"], [3, 9])


class MajorityBaseline(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the twelve records."""

    def test_what_shipped_rewards_answering_billing_to_everything(self):
        before = count_labels(RECORDS)
        self.assertEqual(before.most_common(1)[0], ("billing", 7))
        self.assertEqual(round(100 * 7 / 12, 1), 58.3, "a constant answer is right 58 percent of the time on the skewed set")

    def test_the_cap_cuts_the_constant_answer_and_the_floor_levels_it(self):
        kept, _ = downsample(RECORDS, CAP, SEED)
        after = count_labels(kept)
        self.assertEqual(max(after.values()), 3)
        self.assertEqual(round(100 * max(after.values()) / len(kept), 1), 37.5)
        self.assertTrue(all(count <= CAP for count in after.values()))
        self.assertEqual(after["access"], 3, "a label within the cap keeps every record")
        self.assertEqual(after["outage"], 2)
        p_kept, _, _ = practice_answer.balance(RECORDS, CAP, FLOOR, SEED)
        self.assertEqual(set(count_labels(p_kept).values()), {3})
        self.assertEqual(round(100 * 3 / len(p_kept), 1), 33.3)


if __name__ == "__main__":
    unittest.main()
