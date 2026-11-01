"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
document and the settings are fixed and nothing is random. The guarantee that
an overlap of O words keeps every span of O + 1 words whole is checked by
brute force over every position and length."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from window_chunks import practice_answer
from window_chunks.solution import DOCUMENT, OVERLAP, SPAN, WINDOW, chunk_words, whole_in

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "window_chunks"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
WORDS = DOCUMENT.split()


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


def positions(chunks):
    return [(chunk["start"], chunk["end"]) for chunk in chunks]


def longest_always_whole(chunks, n):
    """The longest span length such that every span of that length, at every
    position, lies whole inside some chunk: a brute-force oracle."""
    longest = 0
    for length in range(1, n + 1):
        for start in range(0, n - length + 1):
            if not whole_in(chunks, start, start + length):
                return longest
        longest = length
    return longest


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_chunks_positions_ids_and_texts(self):
        chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
        self.assertEqual(positions(chunks), [(0, 12), (8, 20), (16, 28), (24, 36), (32, 39)])
        self.assertEqual([chunk["id"] for chunk in chunks], ["c1", "c2", "c3", "c4", "c5"])
        for chunk in chunks:
            self.assertEqual(chunk["text"], " ".join(WORDS[chunk["start"]:chunk["end"]]))
        self.assertTrue(chunks[2]["text"].startswith("depth and the logs. To recover, set the timeout"))
        self.assertEqual(chunks[4]["text"], "Confirm the alert clears within five minutes.")

    def test_every_chunk_fits_the_window_and_neighbours_share_exactly_the_overlap(self):
        chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
        for chunk in chunks:
            self.assertLessEqual(chunk["end"] - chunk["start"], WINDOW)
            self.assertGreater(chunk["end"], chunk["start"])
        for previous, current in zip(chunks, chunks[1:]):
            self.assertEqual(previous["end"] - current["start"], OVERLAP, f"{previous['id']} and {current['id']}")
            self.assertEqual(current["start"] - previous["start"], WINDOW - OVERLAP)

    def test_every_word_is_covered_and_no_chunk_is_redundant(self):
        chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
        covered = set()
        for chunk in chunks:
            covered.update(range(chunk["start"], chunk["end"]))
        self.assertEqual(covered, set(range(len(WORDS))))
        for chunk in chunks:
            others = [other for other in chunks if other is not chunk]
            self.assertEqual(whole_in(others, chunk["start"], chunk["end"]), [], f"{chunk['id']} lies inside another chunk")
        # Without the break, a sixth window at 40 would repeat words 32 to 38 only.
        self.assertEqual(len(chunks), 5)

    def test_spans_up_to_overlap_plus_one_are_always_whole(self):
        chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
        self.assertEqual(longest_always_whole(chunks, len(WORDS)), OVERLAP + 1)
        self.assertEqual(whole_in(chunks, *SPAN), ["c3"], "the six-word instruction fits by position, not by guarantee")
        self.assertEqual(whole_in(chunks, 20, 32), [], "the twelve-word sentence fits no window at stride eight")
        for window, overlap in ((10, 3), (8, 7), (12, 0), (5, 4)):
            self.assertEqual(longest_always_whole(chunk_words(DOCUMENT, window, overlap), len(WORDS)), overlap + 1, f"window {window}, overlap {overlap}")

    def test_invalid_settings_are_rejected_and_an_empty_document_gives_no_chunks(self):
        with self.assertRaises(ValueError) as caught:
            chunk_words(DOCUMENT, 0, 0)
        self.assertIn("window", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            chunk_words(DOCUMENT, 12, 12)
        self.assertIn("overlap", str(caught.exception))
        with self.assertRaises(ValueError):
            chunk_words(DOCUMENT, 12, -1)
        self.assertEqual(chunk_words("", WINDOW, OVERLAP), [])
        self.assertEqual(chunk_words("   ", WINDOW, OVERLAP), [])
        self.assertEqual(positions(chunk_words("one two three", 12, 4)), [(0, 3)], "a document shorter than the window is one chunk")
        self.assertEqual(positions(chunk_words("one two three four", 2, 1)), [(0, 2), (1, 3), (2, 4)])

    def test_split_and_join_preserve_the_document(self):
        self.assertEqual(" ".join(WORDS), DOCUMENT)
        self.assertEqual(len(WORDS), 39)
        self.assertEqual(WORDS[SPAN[0]:SPAN[1]], ["set", "the", "timeout", "to", "thirty", "seconds,"])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the expansion of c3 to cover words 20 to 31"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_expands_a_hit_to_its_neighbours_and_clamps_the_ends(self):
        chunks = practice_answer.chunk_words(practice_answer.DOCUMENT, WINDOW, OVERLAP)
        grown = practice_answer.expand(chunks, WORDS, "c3")
        self.assertEqual((grown["ids"], grown["start"], grown["end"]), (["c2", "c3", "c4"], 8, 36))
        self.assertEqual(grown["text"], " ".join(WORDS[8:36]))
        self.assertTrue(grown["start"] <= 20 and 32 <= grown["end"], "the whole recovery sentence is inside the expansion")
        self.assertEqual(practice_answer.expand(chunks, WORDS, "c1")["ids"], ["c1", "c2"])
        self.assertEqual(practice_answer.expand(chunks, WORDS, "c5")["ids"], ["c4", "c5"])
        self.assertEqual(practice_answer.expand(chunks, WORDS, "c5")["end"], 39)
        with self.assertRaises(ValueError):
            practice_answer.expand(chunks, WORDS, "c9")
        self.assertEqual(practice_answer.SENTENCE, (20, 32))
        self.assertEqual(WORDS[20:32], ["To", "recover,", "set", "the", "timeout", "to", "thirty", "seconds,", "then", "restart", "the", "worker."])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "DOCUMENT = (", "# --- answer begins ---"), segment(starter, "DOCUMENT = (", "def expand"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every chunk, the storage cost, the span checks with and without overlap,
    and the practice expansion, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly."""
    chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
    flat = chunk_words(DOCUMENT, WINDOW, 0)
    stored = sum(chunk["end"] - chunk["start"] for chunk in chunks)
    practice_chunks = practice_answer.chunk_words(practice_answer.DOCUMENT, WINDOW, OVERLAP)
    grown = practice_answer.expand(practice_chunks, WORDS, practice_answer.HIT)
    hit = practice_chunks[int(practice_answer.HIT[1:]) - 1]
    sentence = practice_answer.SENTENCE
    return {
        "words": len(WORDS),
        "window": WINDOW,
        "overlap": OVERLAP,
        "stride": WINDOW - OVERLAP,
        "chunks": chunks,
        "stored_words": stored,
        "factor": round(stored / len(WORDS), 6),
        "span": {"start": SPAN[0], "end": SPAN[1], "text": " ".join(WORDS[SPAN[0]:SPAN[1]]), "whole_in": whole_in(chunks, *SPAN)},
        "no_overlap": {"chunks": [{"id": c["id"], "start": c["start"], "end": c["end"]} for c in flat],
                       "whole_in": whole_in(flat, *SPAN), "boundary": WINDOW * (SPAN[0] // WINDOW + 1)},
        "guarantee": OVERLAP + 1,
        "practice": {
            "hit": practice_answer.HIT,
            "alone": {"start": hit["start"], "end": hit["end"]},
            "expanded": {"ids": grown["ids"], "start": grown["start"], "end": grown["end"]},
            "sentence": {"start": sentence[0], "end": sentence[1], "text": " ".join(WORDS[sentence[0]:sentence[1]]),
                         "whole_in": whole_in(practice_chunks, *sentence)},
            "edges": {edge: {"ids": practice_answer.expand(practice_chunks, WORDS, edge)["ids"],
                             "start": practice_answer.expand(practice_chunks, WORDS, edge)["start"],
                             "end": practice_answer.expand(practice_chunks, WORDS, edge)["end"]}
                      for edge in ("c1", practice_chunks[-1]["id"])},
        },
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on document.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_document_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "document.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["document"], DOCUMENT)
        self.assertEqual(practice_answer.DOCUMENT, DOCUMENT)
        self.assertEqual((fixture["window"], fixture["overlap"]), (WINDOW, OVERLAP))
        self.assertEqual(tuple(fixture["span"]), SPAN)
        self.assertEqual(tuple(fixture["sentence"]), practice_answer.SENTENCE)
        self.assertEqual(fixture["hit"], practice_answer.HIT)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(positions(trace["chunks"]), [(0, 12), (8, 20), (16, 28), (24, 36), (32, 39)])
        self.assertEqual((trace["stored_words"], trace["factor"]), (55, 1.410256))
        self.assertEqual((trace["span"]["whole_in"], trace["no_overlap"]["whole_in"], trace["no_overlap"]["boundary"]), (["c3"], [], 24))
        self.assertEqual(trace["practice"]["expanded"], {"ids": ["c2", "c3", "c4"], "start": 8, "end": 36})


class WhatShippedOnTheSameDocument(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the one document."""

    def test_no_overlap_cuts_the_instruction_at_the_boundary(self):
        flat = chunk_words(DOCUMENT, WINDOW, 0)
        self.assertEqual(positions(flat), [(0, 12), (12, 24), (24, 36), (36, 39)])
        self.assertEqual(whole_in(flat, *SPAN), [])
        self.assertTrue(flat[1]["text"].endswith("set the"), "the chunk that shipped ends mid-instruction")
        self.assertTrue(flat[2]["text"].startswith("timeout to thirty seconds,"))
        self.assertEqual(whole_in(chunk_words(DOCUMENT, WINDOW, OVERLAP), *SPAN), ["c3"])

    def test_overlap_costs_forty_one_percent_more_storage(self):
        chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
        flat = chunk_words(DOCUMENT, WINDOW, 0)
        stored = sum(c["end"] - c["start"] for c in chunks)
        self.assertEqual(stored, 55)
        self.assertEqual(sum(c["end"] - c["start"] for c in flat), 39)
        self.assertEqual(round(stored / 39, 2), 1.41)
        self.assertEqual(len(chunks), 5)
        self.assertEqual(len(flat), 4)

    def test_overlap_guarantee_versus_no_overlap(self):
        self.assertEqual(longest_always_whole(chunk_words(DOCUMENT, WINDOW, OVERLAP), len(WORDS)), 5)
        self.assertEqual(longest_always_whole(chunk_words(DOCUMENT, WINDOW, 0), len(WORDS)), 1, "without overlap only single words are safe everywhere")


if __name__ == "__main__":
    unittest.main()
