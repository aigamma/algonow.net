"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; scores are compared to three
decimals, the precision the page prints."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from mmr_rerank import practice_answer
from mmr_rerank.solution import (CANDIDATES, K, LAMBDA, SIMILARITY, mmr, pairwise_max, score_round,
                                 sources_of, top_by_relevance)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "mmr_rerank"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
CAP = practice_answer.MAX_PER_SOURCE


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


def ids(indexes):
    return [CANDIDATES[index]["id"] for index in indexes]


def picked_ids(picks):
    return ids([pick[0] for pick in picks])


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_first_round_scores_are_lambda_times_relevance(self):
        rows = score_round(CANDIDATES, SIMILARITY, [], list(range(6)), LAMBDA)
        self.assertEqual([round(penalty, 6) for index, penalty, score in rows], [0.0] * 6)
        self.assertEqual([round(score, 3) for index, penalty, score in rows], [0.644, 0.63, 0.616, 0.56, 0.525, 0.385])

    def test_second_round_penalties_are_the_similarity_to_the_first_pick(self):
        rows = score_round(CANDIDATES, SIMILARITY, [0], [1, 2, 3, 4, 5], LAMBDA)
        self.assertEqual([penalty for index, penalty, score in rows], [0.92, 0.90, 0.45, 0.50, 0.40])
        self.assertEqual([round(score, 3) for index, penalty, score in rows], [0.354, 0.346, 0.425, 0.375, 0.265])

    def test_picks_and_scores_match_the_page(self):
        picks, rounds = mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
        self.assertEqual(picked_ids(picks), ["c1", "c4", "c5"])
        self.assertEqual([pick[1] for pick in picks], [0.0, 0.45, 0.50], "the penalty of each pick")
        self.assertEqual([round(pick[2], 3) for pick in picks], [0.644, 0.425, 0.375])
        self.assertEqual([len(rows) for rows in rounds], [6, 5, 4], "one fewer candidate each round")
        self.assertEqual(pairwise_max(SIMILARITY, [pick[0] for pick in picks]), 0.50)

    def test_lambda_one_reproduces_the_relevance_order(self):
        picks, rounds = mmr(CANDIDATES, SIMILARITY, K, 1.0)
        self.assertEqual([pick[0] for pick in picks], top_by_relevance(CANDIDATES, K))
        self.assertEqual(picked_ids(picks), ["c1", "c2", "c3"])

    def test_lambda_zero_picks_by_novelty_alone(self):
        picks, rounds = mmr(CANDIDATES, SIMILARITY, K, 0.0)
        self.assertEqual(picked_ids(picks), ["c1", "c6", "c4"], "the first index on the tie, then the least similar each time")
        for pick, rows in zip(picks[1:], rounds[1:]):
            self.assertEqual(pick[1], min(penalty for index, penalty, score in rows))

    def test_invalid_lambda_and_ragged_matrix_are_rejected(self):
        for bad in (1.5, -0.1):
            with self.assertRaises(ValueError):
                mmr(CANDIDATES, SIMILARITY, K, bad)
        with self.assertRaises(ValueError):
            mmr(CANDIDATES, SIMILARITY[:5], K, LAMBDA)
        with self.assertRaises(ValueError):
            mmr(CANDIDATES, SIMILARITY[:5] + [SIMILARITY[5][:4]], K, LAMBDA)

    def test_k_larger_than_the_pool_returns_every_candidate_once(self):
        picks, rounds = mmr(CANDIDATES, SIMILARITY, 10, LAMBDA)
        self.assertEqual(sorted(picked_ids(picks)), ["c1", "c2", "c3", "c4", "c5", "c6"])
        self.assertEqual(len(rounds[-1]), 1)

    def test_input_lists_are_not_modified(self):
        candidates, similarity = [dict(candidate) for candidate in CANDIDATES], [list(row) for row in SIMILARITY]
        mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
        top_by_relevance(CANDIDATES, K)
        self.assertEqual((CANDIDATES, SIMILARITY), (candidates, similarity))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the picks c1, c4, c6"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_caps_each_source(self):
        picks, rounds = practice_answer.mmr(CANDIDATES, SIMILARITY, K, LAMBDA, max_per_source=CAP)
        self.assertEqual(picked_ids(picks), ["c1", "c4", "c6"])
        self.assertEqual([ids(blocked) for rows, blocked in rounds], [[], ["c2", "c3"], ["c2", "c3", "c5"]])
        self.assertEqual([len(rows) for rows, blocked in rounds], [6, 3, 1])
        self.assertEqual(sources_of(CANDIDATES, [pick[0] for pick in picks]), ["cli-reference", "runbook", "security-faq"])
        self.assertEqual(pairwise_max(SIMILARITY, [pick[0] for pick in picks]), 0.45)

    def test_answer_without_a_cap_reproduces_the_worked_run(self):
        picks, rounds = practice_answer.mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
        worked_picks, worked_rounds = mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
        self.assertEqual(picks, worked_picks)
        self.assertEqual([rows for rows, blocked in rounds], worked_rounds)
        self.assertEqual([blocked for rows, blocked in rounds], [[], [], []])

    def test_answer_stops_when_every_source_is_capped(self):
        picks, rounds = practice_answer.mmr(CANDIDATES, SIMILARITY, 6, LAMBDA, max_per_source=CAP)
        self.assertEqual(picked_ids(picks), ["c1", "c4", "c6"], "three sources, so three picks even when six were asked for")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CANDIDATES = [", "# --- answer begins ---"), segment(starter, "CANDIDATES = [", "def mmr"))
        self.assertEqual(segment(answer, "def names"), segment(starter, "def names"))


def summary(indexes):
    return {"ids": ids(indexes), "pairwise_max": round(pairwise_max(SIMILARITY, indexes), 6), "sources": sources_of(CANDIDATES, indexes)}


def rows_record(rows):
    return [{"id": CANDIDATES[index]["id"], "relevance": CANDIDATES[index]["relevance"], "penalty": round(penalty, 6), "score": round(score, 6)}
            for index, penalty, score in rows]


def derive_trace():
    """Every round of the real run, the picks, the relevance-only baseline, the
    practice run with its blocked candidates, and the lambda extremes, all from
    the lesson's own functions. The animation's JavaScript port must reproduce
    this exactly (six decimals)."""
    picks, rounds = mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
    picked = [pick[0] for pick in picks]
    worked = [{"selected": ids(picked[:number]), "rows": rows_record(rows), "picked": CANDIDATES[picked[number]]["id"]}
              for number, rows in enumerate(rounds)]
    capped, capped_rounds = practice_answer.mmr(CANDIDATES, SIMILARITY, K, LAMBDA, max_per_source=CAP)
    capped_picked = [pick[0] for pick in capped]
    practice = [{"selected": ids(capped_picked[:number]), "blocked": ids(blocked), "rows": rows_record(rows),
                 "picked": CANDIDATES[capped_picked[number]]["id"]} for number, (rows, blocked) in enumerate(capped_rounds)]
    one, _ = mmr(CANDIDATES, SIMILARITY, K, 1.0)
    zero, _ = mmr(CANDIDATES, SIMILARITY, K, 0.0)
    return {"k": K, "lambda": LAMBDA, "relevance_only": summary(top_by_relevance(CANDIDATES, K)),
            "rounds": worked, "picks": summary(picked),
            "practice": {"max_per_source": CAP, "rounds": practice, "picks": summary(capped_picked)},
            "lambda_extremes": {"one": picked_ids(one), "zero": picked_ids(zero)}}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on candidates.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_candidates_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "candidates.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"candidates": CANDIDATES, "similarity": SIMILARITY, "k": K, "lambda": LAMBDA, "max_per_source": CAP})
        for row_number, row in enumerate(SIMILARITY):
            self.assertEqual(row[row_number], 1.0)
            self.assertEqual(row, [SIMILARITY[column][row_number] for column in range(6)], "the matrix is symmetric")

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["picks"]["ids"], ["c1", "c4", "c5"])
        self.assertEqual(trace["rounds"][1]["rows"][2], {"id": "c4", "relevance": 0.8, "penalty": 0.45, "score": 0.425})
        self.assertEqual(trace["practice"]["picks"]["ids"], ["c1", "c4", "c6"])
        self.assertEqual(trace["lambda_extremes"], {"one": ["c1", "c2", "c3"], "zero": ["c1", "c6", "c4"]})


class RelevanceAloneOnTheSameCandidates(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the six candidates."""

    def test_relevance_alone_takes_three_copies_of_one_paragraph(self):
        shipped = top_by_relevance(CANDIDATES, K)
        self.assertEqual(ids(shipped), ["c1", "c2", "c3"])
        for first in range(3):
            for second in range(first + 1, 3):
                self.assertGreaterEqual(SIMILARITY[shipped[first]][shipped[second]], 0.9, "every pair is a near copy")
        self.assertEqual(sources_of(CANDIDATES, shipped), ["runbook"], "one source fills every slot")
        self.assertNotIn("c4", ids(shipped), "the revocation step never reaches the model")

    def test_mmr_spreads_the_picks_and_the_cap_spreads_them_further(self):
        picks, rounds = mmr(CANDIDATES, SIMILARITY, K, LAMBDA)
        picked = [pick[0] for pick in picks]
        self.assertEqual(ids(picked)[0], "c1", "the most relevant chunk is still first")
        self.assertEqual(pairwise_max(SIMILARITY, picked), 0.50)
        self.assertEqual(sources_of(CANDIDATES, picked), ["runbook", "security-faq"])
        capped, _ = practice_answer.mmr(CANDIDATES, SIMILARITY, K, LAMBDA, max_per_source=CAP)
        self.assertEqual(len(sources_of(CANDIDATES, [pick[0] for pick in capped])), 3)


if __name__ == "__main__":
    unittest.main()
