"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise bucket, assign, and shuffle_split directly. Every
expectation is exact: SHA-256 is deterministic, the ids are fixed, and the
shuffle is seeded. The one probabilistic check is the comparison of Python's
built-in hash across two processes, which differs with overwhelming odds."""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from stable_split import practice_answer
from stable_split.solution import SEED, VALIDATION_SHARE, WEEK_ONE, WEEK_TWO, assign, bucket, shuffle_split, side_of

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "stable_split"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
KEEP = {"PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE"}
BUCKETS = {"t-1813": 8, "t-1814": 56, "t-1815": 19, "t-1816": 28, "t-1817": 94, "t-1818": 40, "t-1819": 47, "t-1820": 7}


def minimal_env():
    return {key: value for key, value in os.environ.items() if key.upper() in KEEP}


def run_alone(name):
    """Copy one lesson file by itself into an empty directory and run it with
    python -I -S and a minimal environment: no package, no import path, no siblings."""
    with tempfile.TemporaryDirectory() as empty:
        shutil.copyfile(PACKAGE / name, Path(empty) / name)
        return subprocess.run([sys.executable, "-I", "-S", name], cwd=empty, env=minimal_env(),
                              capture_output=True, text=True, timeout=60)


def run_snippet(code):
    """Run a one-line program in a fresh interpreter (hash randomization on, nothing inherited)."""
    return subprocess.run([sys.executable, "-I", "-S", "-c", code], env=minimal_env(),
                          capture_output=True, text=True, timeout=60).stdout.strip()


def expected(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_buckets_of_the_eight_ids_are_exact(self):
        for record_id, number in BUCKETS.items():
            self.assertEqual(bucket(record_id), number)
            digest = hashlib.sha256(record_id.encode("utf-8")).hexdigest()
            self.assertEqual(int(digest[:8], 16) % 100, number, "the first eight hex digits, as an integer, modulo one hundred")

    def test_week_one_splits_two_validation_four_train(self):
        self.assertEqual(assign(WEEK_ONE, VALIDATION_SHARE),
                         {"train": ["t-1814", "t-1816", "t-1817", "t-1818"], "validation": ["t-1813", "t-1815"]})

    def test_adding_records_never_moves_earlier_ones(self):
        first = assign(WEEK_ONE, VALIDATION_SHARE)
        both = assign(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE)
        for record_id in WEEK_ONE:
            self.assertEqual(record_id in first["validation"], record_id in both["validation"], record_id)
        self.assertEqual(both["validation"], ["t-1813", "t-1815", "t-1820"])
        self.assertEqual(both["train"], ["t-1814", "t-1816", "t-1817", "t-1818", "t-1819"])

    def test_bucket_is_identical_in_another_process_while_builtin_hash_is_not(self):
        sha = 'import hashlib; print(int(hashlib.sha256("t-1813".encode("utf-8")).hexdigest()[:8], 16) % 100)'
        self.assertEqual(run_snippet(sha), "8")
        self.assertEqual(run_snippet(sha), "8")
        # The built-in hash of a string is salted per process, so the same program
        # prints a different number each time it starts. That is why it cannot split data.
        self.assertNotEqual(run_snippet('print(hash("t-1813"))'), run_snippet('print(hash("t-1813"))'))

    def test_duplicate_and_empty_ids_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            assign(["t-1813", "t-1814", "t-1813"], VALIDATION_SHARE)
        self.assertIn("duplicate id 't-1813'", str(caught.exception))
        with self.assertRaises(ValueError):
            assign(["t-1813", ""], VALIDATION_SHARE)

    def test_share_zero_is_all_train_and_share_hundred_is_all_validation(self):
        self.assertEqual(assign(WEEK_ONE, 0), {"train": list(WEEK_ONE), "validation": []})
        self.assertEqual(assign(WEEK_ONE, 100), {"train": [], "validation": list(WEEK_ONE)})

    def test_threshold_is_strict(self):
        self.assertEqual(side_of("t-1813", 8), "train", "bucket 8 is not below a share of 8")
        self.assertEqual(side_of("t-1813", 9), "validation")

    def test_sides_keep_input_order_and_input_is_not_modified(self):
        reversed_ids = list(reversed(WEEK_ONE))
        before = list(reversed_ids)
        sides = assign(reversed_ids, VALIDATION_SHARE)
        self.assertEqual(sides["train"], ["t-1818", "t-1817", "t-1816", "t-1814"])
        self.assertEqual(sides["validation"], ["t-1815", "t-1813"])
        self.assertEqual(reversed_ids, before)
        shuffle_split(reversed_ids, VALIDATION_SHARE, SEED)
        self.assertEqual(reversed_ids, before, "the shuffle works on a copy")

    def test_no_ids_no_sides(self):
        self.assertEqual(assign([], VALIDATION_SHARE), {"train": [], "validation": []})


class ShuffleThatShipped(unittest.TestCase):
    """The evaluation that separates the repair from the bug: the same ids, both methods."""

    def test_seeded_shuffle_moves_an_earlier_transcript_between_weeks(self):
        one = shuffle_split(WEEK_ONE, VALIDATION_SHARE, SEED)
        two = shuffle_split(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE, SEED)
        self.assertEqual(sorted(one), ["t-1817"])
        self.assertEqual(sorted(two), ["t-1819", "t-1820"])
        moved = [record_id for record_id in WEEK_ONE if (record_id in one) != (record_id in two)]
        self.assertEqual(moved, ["t-1817"], "validation last week, training this week: leakage")
        first = assign(WEEK_ONE, VALIDATION_SHARE)
        both = assign(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE)
        hash_moved = [record_id for record_id in WEEK_ONE if (record_id in first["validation"]) != (record_id in both["validation"])]
        self.assertEqual(hash_moved, [])

    def test_shuffle_takes_at_least_one_and_rounds_the_share(self):
        self.assertEqual(len(shuffle_split(["a", "b"], VALIDATION_SHARE, SEED)), 1)
        self.assertEqual(len(shuffle_split(WEEK_ONE, VALIDATION_SHARE, SEED)), 1, "six times twenty percent rounds to one")
        self.assertEqual(len(shuffle_split(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE, SEED)), 2)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected test ['t-1813', 't-1820'], got []"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_three_way_assignment_is_exact(self):
        sides = practice_answer.assign(practice_answer.TRANSCRIPTS, practice_answer.TEST_SHARE, practice_answer.VALIDATION_SHARE)
        self.assertEqual(sides, practice_answer.EXPECTED)
        self.assertEqual(practice_answer.side_of("t-1816", 10, 20), "validation", "bucket 28 is below 30 now")

    def test_answer_thresholds_are_strict(self):
        self.assertEqual(practice_answer.side_of("t-1813", 8, 20), "validation", "bucket 8 is not below a test share of 8")
        self.assertEqual(practice_answer.side_of("t-1813", 9, 20), "test")
        self.assertEqual(practice_answer.side_of("t-1816", 10, 18), "train", "bucket 28 is not below 28")

    def test_answer_with_no_test_share_matches_the_worked_example(self):
        sides = practice_answer.assign(WEEK_ONE + WEEK_TWO, 0, VALIDATION_SHARE)
        self.assertEqual(sides["test"], [])
        self.assertEqual({"train": sides["train"], "validation": sides["validation"]}, assign(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "TEST_SHARE = 10", "# --- answer begins ---"),
                         segment(starter, "TEST_SHARE = 10", "def side_of"))
        self.assertEqual(segment(answer, "def assign"), segment(starter, "def assign"))


def derive_trace():
    """Everything the page's animation replays, derived from the real functions."""
    records = []
    for week, ids in ((1, WEEK_ONE), (2, WEEK_TWO)):
        for record_id in ids:
            digest = hashlib.sha256(record_id.encode("utf-8")).hexdigest()
            records.append({"id": record_id, "week": week, "hex": digest[:8], "value": int(digest[:8], 16),
                            "bucket": bucket(record_id), "side": side_of(record_id, VALIDATION_SHARE)})
    first = assign(WEEK_ONE, VALIDATION_SHARE)
    both = assign(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE)
    unchanged = all((record_id in first["validation"]) == (record_id in both["validation"]) for record_id in WEEK_ONE)
    one = shuffle_split(WEEK_ONE, VALIDATION_SHARE, SEED)
    two = shuffle_split(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE, SEED)
    moved = []
    for record_id in WEEK_ONE:
        before = "validation" if record_id in one else "train"
        after = "validation" if record_id in two else "train"
        if before != after:
            moved.append({"id": record_id, "from": before, "to": after})
    three_way = [{"id": record_id, "bucket": bucket(record_id),
                  "side": practice_answer.side_of(record_id, practice_answer.TEST_SHARE, practice_answer.VALIDATION_SHARE)}
                 for record_id in WEEK_ONE + WEEK_TWO]
    return {"validation_share": VALIDATION_SHARE, "records": records, "unchanged": unchanged,
            "shuffle": {"seed": SEED, "week_one_validation": sorted(one), "week_two_validation": sorted(two), "moved": moved},
            "three_way": three_way}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on transcripts.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_transcripts_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "transcripts.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"validation_share": VALIDATION_SHARE, "test_share": practice_answer.TEST_SHARE,
                                   "seed": SEED, "week_one": WEEK_ONE, "week_two": WEEK_TWO})
        self.assertEqual(practice_answer.TRANSCRIPTS, WEEK_ONE + WEEK_TWO)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([record["bucket"] for record in trace["records"]], [8, 56, 19, 28, 94, 40, 47, 7])
        self.assertEqual([record["hex"] for record in trace["records"]][:2], ["778f7950", "1a2f9e64"])
        self.assertTrue(trace["unchanged"])
        self.assertEqual(trace["shuffle"]["moved"], [{"id": "t-1817", "from": "validation", "to": "train"}])
        self.assertEqual([record["side"] for record in trace["three_way"]],
                         ["test", "train", "validation", "validation", "train", "train", "train", "test"])


if __name__ == "__main__":
    unittest.main()
