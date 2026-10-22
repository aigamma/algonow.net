"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed text and nothing is random; scores are small fractions that
round to the values the page prints."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from grounding_check import practice_answer
from grounding_check.solution import (ANSWER, CHUNKS, STOPWORDS, THRESHOLD, check_grounding, content_words,
                                      split_citation, split_sentences, support_score)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "grounding_check"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
SCORES = [0.875, 0.857, 0.167, 1.0]
VERDICTS = ["supported", "supported", "unsupported", "supported"]


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

    def test_split_sentences_cuts_at_terminal_punctuation(self):
        self.assertEqual(split_sentences("Is it lost? Yes! Rotate it. Then stop"),
                         ["Is it lost?", "Yes!", "Rotate it.", "Then stop"])
        self.assertEqual(split_sentences("   "), [])
        self.assertEqual(len(split_sentences(ANSWER)), 4)

    def test_split_citation_handles_none_one_and_two_ids(self):
        self.assertEqual(split_citation("Plain sentence."), ("Plain sentence.", []))
        self.assertEqual(split_citation("Deploy it [c1]."), ("Deploy it.", ["c1"]))
        self.assertEqual(split_citation("Revoke it [c2, c3]."), ("Revoke it.", ["c2", "c3"]))

    def test_content_words_drops_punctuation_case_and_stopwords(self):
        self.assertEqual(content_words("Revoke the OLD key; revocation takes effect!"),
                         {"revoke", "old", "key", "revocation", "takes", "effect"})
        self.assertEqual(content_words("So be it, then."), set())
        self.assertIn("the", STOPWORDS)

    def test_support_score_edges(self):
        self.assertEqual(support_score(set(), {"key"}), 0.0)
        self.assertEqual(support_score({"key", "old"}, {"key", "old", "new"}), 1.0)
        self.assertEqual(support_score({"gateway"}, {"key"}), 0.0)

    def test_rows_match_the_page(self):
        rows = check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD)
        self.assertEqual([row["best"] for row in rows], ["c1", "c2", "c1", "c2"])
        self.assertEqual([round(row["score"], 3) for row in rows], SCORES)
        self.assertEqual([row["verdict"] for row in rows], VERDICTS)
        self.assertEqual([row["cited"] for row in rows], [["c1"], ["c3"], ["c1"], ["c2"]])
        self.assertEqual(rows[2]["text"], "Then restart the gateway so the new key is picked up.")

    def test_threshold_boundary_is_inclusive(self):
        chunks = [{"id": "x", "text": "alpha beta gamma"}]
        answer = "Alpha beta gamma delta epsilon [x]."
        self.assertEqual(check_grounding(answer, chunks, threshold=0.6)[0]["verdict"], "supported")
        self.assertEqual(check_grounding(answer, chunks, threshold=0.61)[0]["verdict"], "unsupported")

    def test_ties_go_to_the_first_chunk(self):
        rows = check_grounding(ANSWER, CHUNKS)
        self.assertEqual((rows[2]["best"], round(rows[2]["score"], 3)), ("c1", 0.167), "every chunk shares only 'key'")
        reversed_rows = check_grounding(ANSWER, list(reversed(CHUNKS)))
        self.assertEqual(reversed_rows[2]["best"], "c3")

    def test_empty_answer_is_rejected(self):
        for answer in ["", "   "]:
            with self.assertRaises(ValueError):
                check_grounding(answer, CHUNKS)

    def test_a_sentence_without_content_words_gets_no_content(self):
        row = check_grounding("So be it [c1].", CHUNKS)[0]
        self.assertEqual((row["verdict"], row["score"]), ("no content", 0.0))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected sentence 2"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_marks_the_miscited_sentence(self):
        rows = practice_answer.check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD, require_citation=True)
        self.assertEqual([row["verdict"] for row in rows], ["supported", "miscited", "unsupported", "supported"])
        self.assertEqual((rows[1]["best"], rows[1]["cited"], round(rows[1]["score"], 3)), ("c2", ["c3"], 0.857))

    def test_answer_without_the_flag_reproduces_the_worked_rows(self):
        self.assertEqual(practice_answer.check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD),
                         check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CHUNKS = [", "# --- answer begins ---"), segment(starter, "CHUNKS = [", "def check_grounding"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every score the figure shows, derived from the lesson's own functions.
    The animation's JavaScript port must reproduce this exactly (six decimals)."""
    chunk_words = {chunk["id"]: content_words(chunk["text"]) for chunk in CHUNKS}
    sentences = []
    for number, sentence in enumerate(split_sentences(ANSWER), start=1):
        text, cited = split_citation(sentence)
        words = content_words(text)
        scores = []
        for chunk in CHUNKS:
            shared = words & chunk_words[chunk["id"]]
            scores.append({"id": chunk["id"], "shared": sorted(shared),
                           "score": round(support_score(words, chunk_words[chunk["id"]]), 6)})
        row = check_grounding(sentence, CHUNKS, threshold=THRESHOLD)[0]
        sentences.append({"number": number, "sentence": sentence, "text": text, "cited": cited, "words": sorted(words),
                          "scores": scores, "best": row["best"], "score": round(row["score"], 6), "verdict": row["verdict"]})
    rows = check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD)
    practice = practice_answer.check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD, require_citation=True)
    return {
        "threshold": THRESHOLD,
        "chunks": [{"id": chunk["id"], "words": sorted(chunk_words[chunk["id"]])} for chunk in CHUNKS],
        "sentences": sentences,
        "summary": {"supported": sum(1 for row in rows if row["verdict"] == "supported"),
                    "flagged": [row["number"] for row in rows if row["verdict"] != "supported"]},
        "shipped": {"with_citation": sum(1 for row in rows if row["cited"]), "total": len(rows)},
        "practice": {"verdicts": [row["verdict"] for row in practice],
                     "supported": sum(1 for row in practice if row["verdict"] == "supported"),
                     "flagged": [row["number"] for row in practice if row["verdict"] != "supported"]},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on answer.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_answer_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "answer.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"chunks": CHUNKS, "answer": ANSWER, "threshold": THRESHOLD, "stopwords": sorted(STOPWORDS)})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([s["score"] for s in trace["sentences"]], [0.875, 0.857143, 0.166667, 1.0])
        self.assertEqual(trace["summary"], {"supported": 3, "flagged": [3]})
        self.assertEqual(trace["practice"]["verdicts"], ["supported", "miscited", "unsupported", "supported"])


class WhatShipped(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same answer."""

    def test_citation_presence_passes_every_sentence(self):
        rows = check_grounding(ANSWER, CHUNKS)
        self.assertEqual(sum(1 for row in rows if row["cited"]), 4, "every sentence carries a bracket, so the shipped check passed 4 of 4")

    def test_overlap_flags_the_invented_step(self):
        rows = check_grounding(ANSWER, CHUNKS, threshold=THRESHOLD)
        self.assertEqual([row["number"] for row in rows if row["verdict"] != "supported"], [3])
        words = content_words(split_citation(split_sentences(ANSWER)[2])[0])
        for chunk in CHUNKS:
            self.assertEqual(words & content_words(chunk["text"]), {"key"}, "the restart sentence shares only 'key' with any chunk")


if __name__ == "__main__":
    unittest.main()
