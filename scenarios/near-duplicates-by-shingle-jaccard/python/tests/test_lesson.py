"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
texts are fixed and nothing is random; similarities are rational numbers and
are compared with exact fractions. Independent arithmetic rebuilds the shared
and union counts from the inclusion-exclusion identity, and the exact-match
baseline is the dedupe that shipped."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path

from shingle_dedupe import practice_answer
from shingle_dedupe.solution import RECORDS, SHINGLE, THRESHOLD, jaccard, near_duplicates, shingles, words_of

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "shingle_dedupe"
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


def pair_table(records, shingle_function, size):
    sets = {record["id"]: shingle_function(record["text"], size) for record in records}
    pairs = []
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            a, b = sets[records[i]["id"]], sets[records[j]["id"]]
            pairs.append({"a": records[i]["id"], "b": records[j]["id"], "shared": len(a & b), "union": len(a | b),
                          "jaccard": round(jaccard(a, b), 6), "flagged": jaccard(a, b) >= THRESHOLD})
    return sets, pairs


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_words_are_lowercased_and_stripped_of_punctuation(self):
        self.assertEqual(words_of("Restart the worker, then set"), ["restart", "the", "worker", "then", "set"])
        self.assertEqual(words_of("  Rotate the API key!  "), ["rotate", "the", "api", "key"])
        self.assertEqual(words_of("--- ..."), [])
        self.assertEqual(len(words_of(RECORDS[0]["text"])), 15)

    def test_shingle_sets_have_the_expected_sizes_and_members(self):
        sets = {record["id"]: shingles(record["text"], SHINGLE) for record in RECORDS}
        self.assertEqual({key: len(value) for key, value in sets.items()}, {"r1": 13, "r2": 13, "r3": 11, "r4": 14, "r5": 4})
        self.assertIn(("set", "the", "timeout"), sets["r1"])
        self.assertIn(("please", "restart", "the"), sets["r4"])
        self.assertTrue(sets["r1"] <= sets["r4"], "r4 is r1 with one word in front, so it holds every shingle of r1")
        self.assertEqual(sets["r4"] - sets["r1"], {("please", "restart", "the")})
        self.assertEqual(sets["r1"] - sets["r2"], {("and", "confirm", "the"), ("confirm", "the", "alert"), ("seconds", "and", "confirm")})
        self.assertEqual(shingles("one two", 3), set(), "fewer words than the shingle size gives no shingles")

    def test_jaccard_matches_exact_fractions_and_inclusion_exclusion(self):
        sets, pairs = pair_table(RECORDS, shingles, SHINGLE)
        by_pair = {(pair["a"], pair["b"]): pair for pair in pairs}
        self.assertEqual((by_pair[("r1", "r2")]["shared"], by_pair[("r1", "r2")]["union"]), (10, 16))
        self.assertEqual((by_pair[("r1", "r4")]["shared"], by_pair[("r1", "r4")]["union"]), (13, 14))
        self.assertEqual((by_pair[("r1", "r5")]["shared"], by_pair[("r1", "r5")]["union"]), (4, 13))
        self.assertEqual(by_pair[("r1", "r3")]["shared"], 0)
        for pair in pairs:
            a, b = sets[pair["a"]], sets[pair["b"]]
            self.assertEqual(pair["union"], len(a) + len(b) - pair["shared"], "inclusion-exclusion")
            self.assertAlmostEqual(jaccard(a, b), float(Fraction(pair["shared"], pair["union"])), places=12)
            self.assertAlmostEqual(jaccard(a, b), jaccard(b, a), places=12, msg="symmetric")
        self.assertEqual(jaccard(sets["r1"], sets["r1"]), 1.0)
        self.assertEqual(jaccard(sets["r1"], sets["r3"]), 0.0)
        self.assertAlmostEqual(jaccard(sets["r1"], sets["r2"]), float(Fraction(5, 8)), places=12)

    def test_decisions_keep_the_first_of_each_group(self):
        decisions = near_duplicates(RECORDS, SHINGLE, THRESHOLD)
        self.assertEqual([(d[0], d[1], d[2]) for d in decisions],
                         [("r1", "kept", None), ("r2", "dropped", "r1"), ("r3", "kept", None), ("r4", "dropped", "r1"), ("r5", "kept", None)])
        self.assertAlmostEqual(decisions[1][3], float(Fraction(5, 8)), places=12)
        self.assertAlmostEqual(decisions[3][3], float(Fraction(13, 14)), places=12)
        self.assertAlmostEqual(decisions[4][3], float(Fraction(4, 13)), places=12, msg="r5's best match among the kept is r1, below the threshold")
        self.assertEqual(decisions[0][3], 0.0, "nothing kept yet")

    def test_threshold_and_order_change_the_groups(self):
        strict = near_duplicates(RECORDS, SHINGLE, 0.95)
        self.assertEqual([d[1] for d in strict], ["kept"] * 5, "at 0.95 even r4 at 0.93 survives")
        loose = near_duplicates(RECORDS, SHINGLE, 0.3)
        self.assertEqual([(d[0], d[1], d[2]) for d in loose],
                         [("r1", "kept", None), ("r2", "dropped", "r1"), ("r3", "kept", None), ("r4", "dropped", "r1"), ("r5", "dropped", "r1")])
        reversed_records = list(reversed(RECORDS))
        backwards = near_duplicates(reversed_records, SHINGLE, THRESHOLD)
        self.assertEqual([(d[0], d[1], d[2]) for d in backwards],
                         [("r5", "kept", None), ("r4", "kept", None), ("r3", "kept", None), ("r2", "dropped", "r4"), ("r1", "dropped", "r4")],
                         "the first record seen is the one kept, so order decides which copy survives")

    def test_invalid_input_is_rejected_and_input_unchanged(self):
        with self.assertRaises(ValueError) as caught:
            near_duplicates([{"id": "r9", "text": "Restart it."}], SHINGLE, THRESHOLD)
        self.assertIn("r9 is too short", str(caught.exception))
        self.assertEqual(near_duplicates([], SHINGLE, THRESHOLD), [])
        copy = [dict(record) for record in RECORDS]
        near_duplicates(RECORDS, SHINGLE, THRESHOLD)
        self.assertEqual(RECORDS, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 79 character shingles"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_uses_character_windows_over_the_normalized_text(self):
        sets = {record["id"]: practice_answer.shingles(record["text"], practice_answer.SHINGLE) for record in RECORDS}
        self.assertEqual({key: len(value) for key, value in sets.items()}, {"r1": 79, "r2": 77, "r3": 61, "r4": 86, "r5": 29})
        self.assertIn("resta", sets["r1"])
        self.assertIn("t the", sets["r1"], "windows cross word boundaries over single spaces")
        self.assertEqual(practice_answer.shingles("Ok.", 5), set())
        self.assertAlmostEqual(jaccard(sets["r1"], sets["r2"]), float(Fraction(69, 87)), places=12)
        self.assertAlmostEqual(jaccard(sets["r1"], sets["r4"]), float(Fraction(79, 86)), places=12)
        decisions = practice_answer.near_duplicates(RECORDS, practice_answer.SHINGLE, THRESHOLD)
        self.assertEqual([(d[0], d[1], d[2]) for d in decisions],
                         [("r1", "kept", None), ("r2", "dropped", "r1"), ("r3", "kept", None), ("r4", "dropped", "r1"), ("r5", "kept", None)])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "RECORDS = [", "# --- answer begins ---"), segment(starter, "RECORDS = [", "def shingles"))
        self.assertEqual(segment(answer, "def jaccard"), segment(starter, "def jaccard"))


def derive_trace():
    """Every shingle count, pair similarity, and decision of the real functions,
    for word shingles and for the practice's character shingles. The
    animation's JavaScript port must reproduce this exactly (six decimals)."""
    sets, pairs = pair_table(RECORDS, shingles, SHINGLE)
    decisions = [{"id": d[0], "action": d[1], "match": d[2], "score": round(d[3], 6)} for d in near_duplicates(RECORDS, SHINGLE, THRESHOLD)]
    char_sets, char_pairs = pair_table(RECORDS, practice_answer.shingles, practice_answer.SHINGLE)
    char_decisions = [{"id": d[0], "action": d[1], "match": d[2], "score": round(d[3], 6)}
                      for d in practice_answer.near_duplicates(RECORDS, practice_answer.SHINGLE, THRESHOLD)]
    return {
        "records": [{"id": r["id"], "text": r["text"], "words": len(words_of(r["text"])), "shingles": len(sets[r["id"]])} for r in RECORDS],
        "size": SHINGLE,
        "threshold": THRESHOLD,
        "pairs": pairs,
        "decisions": decisions,
        "kept": sum(1 for d in decisions if d["action"] == "kept"),
        "practice": {"size": practice_answer.SHINGLE, "records": [{"id": r["id"], "shingles": len(char_sets[r["id"]])} for r in RECORDS],
                     "pairs": char_pairs, "decisions": char_decisions, "kept": sum(1 for d in char_decisions if d["action"] == "kept")},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on records.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_records_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "records.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["records"], RECORDS)
        self.assertEqual(practice_answer.RECORDS, RECORDS)
        self.assertEqual((fixture["size"], fixture["threshold"], fixture["practice_size"]), (SHINGLE, THRESHOLD, practice_answer.SHINGLE))

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([pair["jaccard"] for pair in trace["pairs"]][:4], [0.625, 0.0, 0.928571, 0.307692])
        self.assertEqual([d["action"] for d in trace["decisions"]], ["kept", "dropped", "kept", "dropped", "kept"])
        self.assertEqual(trace["practice"]["pairs"][0]["jaccard"], 0.793103)
        self.assertEqual(trace["practice"]["records"][0]["shingles"], 79)


class WhatShippedOnTheSameRecords(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five records."""

    def test_exact_match_after_normalization_keeps_every_record(self):
        seen = set()
        kept = []
        for record in RECORDS:
            key = " ".join(words_of(record["text"]))
            if key not in seen:
                seen.add(key)
                kept.append(record["id"])
        self.assertEqual(kept, ["r1", "r2", "r3", "r4", "r5"], "no two texts are identical, so exact matching removed nothing")

    def test_shingle_jaccard_finds_the_two_near_copies(self):
        decisions = near_duplicates(RECORDS, SHINGLE, THRESHOLD)
        self.assertEqual([d[0] for d in decisions if d[1] == "dropped"], ["r2", "r4"])
        self.assertEqual(sum(1 for d in decisions if d[1] == "kept"), 3)

    def test_a_fragment_and_an_unrelated_record_stay_below_the_threshold(self):
        _, pairs = pair_table(RECORDS, shingles, SHINGLE)
        by_pair = {(pair["a"], pair["b"]): pair["jaccard"] for pair in pairs}
        self.assertLess(by_pair[("r1", "r5")], THRESHOLD, "a fragment shares shingles but not enough of the union")
        self.assertEqual(by_pair[("r1", "r3")], 0.0)
        self.assertEqual([pair for pair in pairs if pair["flagged"]], [pair for pair in pairs if pair["jaccard"] >= THRESHOLD])
        self.assertEqual(sum(1 for pair in pairs if pair["flagged"]), 3)


if __name__ == "__main__":
    unittest.main()
