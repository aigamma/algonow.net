"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed strings and nothing is random; ratios are compared at three
or six decimals, the same rounding the page shows."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from answer_scoring import practice_answer
from answer_scoring.solution import ARTICLES, PAIRS, exact_match, normalize, score_all, token_f1

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "answer_scoring"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
PRACTICE_GOLDS = {pair["id"]: pair["gold"] for pair in practice_answer.PAIRS}


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

    def test_normalize_at_its_edges(self):
        self.assertEqual(normalize("The read scope."), ["read", "scope"])
        self.assertEqual(normalize("  Rotate,   the\tKEY!!  "), ["rotate", "key"])
        self.assertEqual(normalize("A key in an hour: 7 days"), ["key", "in", "hour", "7", "days"])
        self.assertEqual(normalize("the"), [], "an answer made only of articles has no tokens")
        self.assertEqual(normalize("..."), [])

    def test_exact_match_ignores_case_punctuation_and_articles(self):
        self.assertEqual(exact_match("The read scope.", "read scope"), 1)
        self.assertEqual(exact_match("Billing, then Invoices", "billing then invoices"), 1)
        self.assertEqual(exact_match("read scope", "scope read"), 0, "order still matters for exact match")
        self.assertEqual(exact_match("seven days", "7 days"), 0)

    def test_the_rows_for_the_five_pairs(self):
        rows, mean_em, mean_f1 = score_all(PAIRS)
        rounded = [(pair_id, em, overlap, round(p, 3), round(r, 3), round(f1, 3)) for pair_id, em, overlap, p, r, f1 in rows]
        self.assertEqual(rounded, [("e1", 1, 2, 1.0, 1.0, 1.0), ("e2", 0, 5, 0.833, 0.556, 0.667),
                                   ("e3", 0, 1, 0.5, 0.5, 0.5), ("e4", 1, 3, 1.0, 1.0, 1.0), ("e5", 0, 0, 0.0, 0.0, 0.0)])
        self.assertEqual(mean_em, 0.4)
        self.assertEqual(round(mean_f1, 3), 0.633)
        self.assertEqual((len(normalize(PAIRS[1]["prediction"])), len(normalize(PAIRS[1]["gold"]))), (6, 9), "e2 shares 5 of 6 and 9 tokens")

    def test_f1_is_symmetric_and_the_overlap_counts_repeats_once(self):
        self.assertEqual(token_f1("seven days", "7 days")[3], token_f1("7 days", "seven days")[3])
        self.assertEqual(token_f1("key key key", "key")[0], 1, "a repeated token matches as many times as the other side has it")
        self.assertEqual(round(token_f1("key key key", "key")[3], 3), 0.5)

    def test_empty_answers_and_zero_overlap_take_the_guarded_branches(self):
        self.assertEqual(token_f1("", ""), (0, 1.0, 1.0, 1.0))
        self.assertEqual(token_f1("the", "read scope"), (0, 0.0, 0.0, 0.0))
        self.assertEqual(token_f1("no", "yes"), (0, 0.0, 0.0, 0.0), "nothing shared: no division happens")

    def test_an_empty_gold_answer_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            score_all([{"id": "e6", "prediction": "yes", "gold": "..."}])
        self.assertIn("'e6'", str(caught.exception))

    def test_input_pairs_are_not_modified(self):
        before = json.dumps(PAIRS)
        score_all(PAIRS)
        self.assertEqual(json.dumps(PAIRS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected e3 to match one of its 2 acceptable answers"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_keeps_the_best_of_several_gold_answers(self):
        em, overlap, precision, recall, f1 = practice_answer.score_pair("seven days", ["7 days", "seven days"])
        self.assertEqual((em, overlap, precision, recall, f1), (1, 2, 1.0, 1.0, 1.0))
        em, overlap, precision, recall, f1 = practice_answer.score_pair(PAIRS[1]["prediction"], PRACTICE_GOLDS["e2"])
        self.assertEqual((em, overlap, round(f1, 3)), (0, 5, 0.667), "e2's second gold answer scores 0.5, so the first stays best")
        rows, mean_em, mean_f1 = practice_answer.score_all(practice_answer.PAIRS)
        self.assertEqual((round(mean_em, 3), round(mean_f1, 3)), (0.6, 0.733))

    def test_answer_with_single_gold_answers_reproduces_the_worked_run(self):
        single = [{"id": pair["id"], "prediction": pair["prediction"], "gold": [pair["gold"]]} for pair in PAIRS]
        self.assertEqual(practice_answer.score_all(single), score_all(PAIRS))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "PAIRS = [", "# --- answer begins ---"), segment(starter, "PAIRS = [", "def score_pair"))
        self.assertEqual(segment(answer, "def score_all"), segment(starter, "def score_all"))


def words_of(text):
    """The words of an answer before articles are dropped: the first two steps of normalize."""
    kept = ""
    for char in text.lower():
        if char.isalnum() or char.isspace():
            kept = kept + char
    return kept.split()


def match_flags(tokens, others):
    """Which tokens find a partner on the other side, left to right, each partner used once."""
    remaining = Counter(others)
    flags = []
    for token in tokens:
        flags.append(remaining[token] > 0)
        if remaining[token] > 0:
            remaining[token] -= 1
    return flags


def scored(prediction, gold):
    overlap, precision, recall, f1 = token_f1(prediction, gold)
    return {"em": exact_match(prediction, gold), "overlap": overlap, "precision": round(precision, 6),
            "recall": round(recall, 6), "f1": round(f1, 6)}


def derive_trace():
    """Every pair's tokens, matches, and scores, the means, what string equality
    scored, and the practice run, all from the lesson's own functions. The
    animation's JavaScript port must reproduce this exactly (six decimals)."""
    rows = []
    for pair in PAIRS:
        predicted, gold = normalize(pair["prediction"]), normalize(pair["gold"])
        assert [word for word in words_of(pair["prediction"]) if word not in ARTICLES] == predicted
        rows.append({"id": pair["id"], "prediction": pair["prediction"], "gold": pair["gold"],
                     "prediction_words": words_of(pair["prediction"]), "gold_words": words_of(pair["gold"]),
                     "prediction_tokens": predicted, "gold_tokens": gold,
                     "prediction_matched": match_flags(predicted, gold), "gold_matched": match_flags(gold, predicted),
                     "string_equal": pair["prediction"] == pair["gold"], **scored(pair["prediction"], pair["gold"])})
    worked_rows, mean_em, mean_f1 = score_all(PAIRS)
    practice_rows = []
    for pair in practice_answer.PAIRS:
        per_gold = [scored(pair["prediction"], gold) for gold in pair["gold"]]
        best = 0
        for index, entry in enumerate(per_gold):
            if entry["f1"] > per_gold[best]["f1"]:
                best = index
        em, overlap, precision, recall, f1 = practice_answer.score_pair(pair["prediction"], pair["gold"])
        assert (em, overlap, round(f1, 6)) == (max(entry["em"] for entry in per_gold), per_gold[best]["overlap"], per_gold[best]["f1"])
        gold_tokens = normalize(pair["gold"][best])
        practice_rows.append({"id": pair["id"], "golds": pair["gold"], "per_gold": per_gold, "best_gold": best,
                              "best_gold_tokens": gold_tokens, "prediction_matched": match_flags(normalize(pair["prediction"]), gold_tokens),
                              "gold_matched": match_flags(gold_tokens, normalize(pair["prediction"])),
                              "em": em, "overlap": overlap, "precision": round(precision, 6), "recall": round(recall, 6), "f1": round(f1, 6)})
    practice_scored, practice_em, practice_f1 = practice_answer.score_all(practice_answer.PAIRS)
    return {"rows": rows, "mean_em": round(mean_em, 6), "mean_f1": round(mean_f1, 6),
            "shipped": {"string_equal_count": sum(1 for row in rows if row["string_equal"]),
                        "exact_match_count": sum(row["em"] for row in rows)},
            "practice": {"rows": practice_rows, "mean_em": round(practice_em, 6), "mean_f1": round(practice_f1, 6)}}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on answers.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_answers_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "answers.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"pairs": PAIRS, "articles": list(ARTICLES), "practice_golds": PRACTICE_GOLDS})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([row["f1"] for row in trace["rows"]], [1.0, 0.666667, 0.5, 1.0, 0.0])
        self.assertEqual(trace["rows"][1]["prediction_matched"], [False, True, True, True, True, True])
        self.assertEqual((trace["mean_em"], trace["mean_f1"]), (0.4, 0.633333))
        self.assertEqual(trace["practice"]["rows"][2]["best_gold"], 1)
        self.assertEqual((trace["practice"]["mean_em"], trace["practice"]["mean_f1"]), (0.6, 0.733333))


class StringEqualityOnTheSamePairs(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five pairs."""

    def test_string_equality_scores_nothing_that_normalization_rescues(self):
        equal_as_strings = [pair["id"] for pair in PAIRS if pair["prediction"] == pair["gold"]]
        self.assertEqual(equal_as_strings, [], "what shipped: zero of five pairs are equal as strings")
        rows, mean_em, mean_f1 = score_all(PAIRS)
        self.assertEqual([row[0] for row in rows if row[1] == 1], ["e1", "e4"], "normalization rescues the two format-only differences")

    def test_token_f1_gives_partial_credit_where_exact_match_gives_none(self):
        rows, mean_em, mean_f1 = score_all(PAIRS)
        partial = [row[0] for row in rows if row[1] == 0 and row[5] > 0]
        self.assertEqual(partial, ["e2", "e3"])
        self.assertGreater(mean_f1, mean_em)
        self.assertEqual(round(mean_f1 - mean_em, 3), 0.233)


if __name__ == "__main__":
    unittest.main()
