"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise pack_blocks directly. Expectations are exact: the
inputs are fixed text and nothing is random."""
import copy
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from rag_chunking import practice_answer
from rag_chunking.solution import BLOCKS, MAX_CHARS, TOO_LONG, chunk_text, pack_blocks

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "rag_chunking"
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


def sizes(chunks):
    return [len(chunk_text(chunk["heading"], chunk["text"])) for chunk in chunks]


def letters(text):
    return "".join(text.split())


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_four_chunks_each_within_budget(self):
        chunks = pack_blocks(BLOCKS, MAX_CHARS)
        self.assertEqual(sizes(chunks), [106, 195, 110, 88])
        for size in sizes(chunks):
            self.assertLessEqual(size, MAX_CHARS)

    def test_same_heading_blocks_join_until_the_budget_runs_out(self):
        chunks = pack_blocks(BLOCKS, MAX_CHARS)
        self.assertEqual(chunks[1], {"heading": "Rotate a key", "text": BLOCKS[1]["text"] + "\n\n" + BLOCKS[2]["text"]})
        self.assertEqual(len(chunk_text("Rotate a key", chunks[1]["text"] + "\n\n" + BLOCKS[3]["text"])), 294,
                         "the fourth block would push chunk two past the budget")
        self.assertEqual(chunks[2], {"heading": "Rotate a key", "text": BLOCKS[3]["text"]})

    def test_heading_change_opens_a_new_chunk_even_when_the_text_would_fit(self):
        chunks = pack_blocks(BLOCKS, MAX_CHARS)
        by_size_alone = chunk_text(chunks[2]["heading"], chunks[2]["text"] + "\n\n" + BLOCKS[4]["text"])
        self.assertEqual(len(by_size_alone), 193, "the example must show a block that fits by size alone")
        self.assertEqual(chunks[3], {"heading": "Scopes", "text": BLOCKS[4]["text"]})

    def test_exact_budget_boundary(self):
        first = {"heading": "H", "text": "a" * 50}
        room = MAX_CHARS - len(chunk_text("H", first["text"])) - 2      # characters left after the blank line
        exact = pack_blocks([first, {"heading": "H", "text": "b" * room}], MAX_CHARS)
        self.assertEqual(sizes(exact), [MAX_CHARS], "a chunk may reach the budget exactly")
        over = pack_blocks([first, {"heading": "H", "text": "b" * (room + 1)}], MAX_CHARS)
        self.assertEqual(len(over), 2, "one character more opens a new chunk")

    def test_oversized_block_is_rejected_with_its_size(self):
        with self.assertRaises(ValueError) as caught:
            pack_blocks([TOO_LONG], MAX_CHARS)
        self.assertIn("281", str(caught.exception))
        self.assertIn("200", str(caught.exception))
        with self.assertRaises(ValueError):
            pack_blocks(BLOCKS + [TOO_LONG], MAX_CHARS)

    def test_input_blocks_are_not_modified(self):
        before = copy.deepcopy(BLOCKS)
        chunks = pack_blocks(BLOCKS, MAX_CHARS)
        self.assertEqual(BLOCKS, before)
        for chunk in chunks:
            for block in BLOCKS:
                self.assertIsNot(chunk, block, "chunks are new records, never the caller's blocks")

    def test_nothing_lost_duplicated_or_reordered(self):
        chunks = pack_blocks(BLOCKS, MAX_CHARS)
        self.assertEqual(letters("".join(chunk["text"] for chunk in chunks)),
                         letters("".join(block["text"] for block in BLOCKS)))

    def test_no_blocks_no_chunks(self):
        self.assertEqual(pack_blocks([], MAX_CHARS), [])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: a block under 'Incident call' needs 281 characters"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_splits_an_oversized_block_at_line_breaks(self):
        chunks = practice_answer.pack_blocks(practice_answer.PRACTICE_BLOCKS, MAX_CHARS)
        self.assertEqual([chunk["heading"] for chunk in chunks], practice_answer.EXPECTED_HEADINGS)
        self.assertEqual(sizes(chunks), [106, 195, 110, 88, 136, 161])
        lines = TOO_LONG["text"].split("\n")
        self.assertEqual(chunks[4]["text"], "\n\n".join(lines[:3]))
        self.assertEqual(chunks[5]["text"], "\n\n".join(lines[3:]))

    def test_answer_packs_fitting_blocks_exactly_like_the_worked_example(self):
        self.assertEqual(practice_answer.pack_blocks(BLOCKS, MAX_CHARS), pack_blocks(BLOCKS, MAX_CHARS))

    def test_answer_still_rejects_a_single_line_over_budget(self):
        with self.assertRaises(ValueError):
            practice_answer.pack_blocks([{"heading": "H", "text": "x" * 300}], MAX_CHARS)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "MAX_CHARS = 200", "# --- answer begins ---"),
                         segment(starter, "MAX_CHARS = 200", "def pack_blocks"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def fixed_windows(text, size, overlap=0):
    """The approach that shipped: slide a window over the joined text, blind to blocks."""
    step = size - overlap
    return [text[start:start + size] for start in range(0, len(text), step)]


class ShippedApproachOnTheSameInput(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five blocks."""
    JOINED = "\n\n".join(block["text"] for block in BLOCKS)   # 463 characters, headings dropped

    def test_fixed_windows_cut_two_of_the_five_blocks(self):
        self.assertEqual(len(self.JOINED), 463)
        windows = fixed_windows(self.JOINED, MAX_CHARS)
        self.assertEqual(len(windows), 3)
        whole = [number for number, block in enumerate(BLOCKS, start=1)
                 if any(block["text"] in window for window in windows)]
        self.assertEqual(whole, [1, 2, 4], "the procedure and the scopes paragraph are cut")
        self.assertTrue(windows[0].endswith("1. Create a replacement key with the s"), "cut inside step one")
        self.assertTrue(windows[1].endswith("The read scope cov"), "cut inside the scopes paragraph")
        packed = pack_blocks(BLOCKS, MAX_CHARS)
        for block in BLOCKS:
            self.assertTrue(any(block["text"] in chunk["text"] for chunk in packed), "pack_blocks keeps every block whole")

    def test_overlap_rescues_this_example_only_by_alignment(self):
        windows = fixed_windows(self.JOINED, MAX_CHARS, overlap=100)
        self.assertEqual(len(windows), 5)
        self.assertEqual(sum(len(window) for window in windows), 826, "826 characters indexed for 463 of text")
        for block in BLOCKS:
            self.assertTrue(any(block["text"] in window for window in windows))
        # an overlap of n guarantees whole blocks only up to n + 1 characters: a block that
        # starts one character before a window boundary is cut by every window that touches it
        unlucky = "a" * 197 + "\n\n" + "b" * 102 + "\n\n" + "c" * 50
        self.assertFalse(any("b" * 102 in window for window in fixed_windows(unlucky, 200, overlap=100)))
        lucky = "a" * 197 + "\n\n" + "b" * 101 + "\n\n" + "c" * 50
        self.assertTrue(any("b" * 101 in window for window in fixed_windows(lucky, 200, overlap=100)))


if __name__ == "__main__":
    unittest.main()
