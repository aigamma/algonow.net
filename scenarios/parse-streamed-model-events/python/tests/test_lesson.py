"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
chunks are fixed strings. The strongest check is independence from chunking:
the same stream cut at every possible position, or one character at a time,
must assemble the same reply."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from stream_reader import practice_answer
from stream_reader.solution import CHUNKS, read_stream

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "stream_reader"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
REPLY = "Restart the worker, then set the timeout."
STREAM = "".join(CHUNKS)


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


def shipped(chunks):
    """What shipped: each chunk parsed as one event. Returns (crashed at, delivered)."""
    delivered = ""
    for number, chunk in enumerate(chunks, start=1):
        payload = chunk.removeprefix("data:").strip()
        try:
            delivered += json.loads(payload).get("delta", "")
        except json.JSONDecodeError:
            return number, delivered
    return None, delivered


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_the_reply_and_the_event_count(self):
        text, events, log = read_stream(CHUNKS)
        self.assertEqual(text, REPLY)
        self.assertEqual(events, 6, "five deltas and one usage event; the end marker and the comment are not events")

    def test_the_log_shows_the_buffer_at_every_chunk_boundary(self):
        text, events, log = read_stream(CHUNKS)
        self.assertEqual([entry[0] for entry in log], [1, 2, 3, 4, 5, 6])
        self.assertEqual([entry[1] for entry in log], [len(chunk) for chunk in CHUNKS])
        self.assertEqual([entry[2] for entry in log], [1, 2, 0, 1, 1, 1])
        self.assertEqual([entry[3] for entry in log], [0, 0, 11, 0, 0, 40], "the split event waits; the data after the end marker is never read")
        self.assertEqual([entry[4] for entry in log], ["Restart ", "Restart the worker", "Restart the worker", "Restart the worker, then ", REPLY, REPLY])

    def test_the_result_does_not_depend_on_where_the_chunks_are_cut(self):
        for cut in range(1, len(STREAM)):
            text, events, log = read_stream([STREAM[:cut], STREAM[cut:]])
            self.assertEqual(text, REPLY, f"cut at {cut}")
            self.assertEqual(events, 6, f"cut at {cut}")
        one_at_a_time = [character for character in STREAM]
        text, events, log = read_stream(one_at_a_time)
        self.assertEqual((text, events), (REPLY, 6))
        text, events, log = read_stream([STREAM])
        self.assertEqual((text, events), (REPLY, 6), "the whole stream in one chunk")

    def test_comments_blank_lines_and_the_end_marker(self):
        text, events, log = read_stream([': keepalive\n\n\n\ndata: {"delta": "a"}\n\ndata: [DONE]\n\n'])
        self.assertEqual((text, events), ("a", 1))
        text, events, log = read_stream(['data: {"delta": "a"}\n\ndata: [DONE]\n\n', 'data: {"delta": "b"}\n\n'])
        self.assertEqual(text, "a", "a chunk after the end marker is not read")
        self.assertEqual(len(log), 1)
        text, events, log = read_stream(['data: {"usage": {"output_tokens": 2}}\n\ndata: [DONE]\n\n'])
        self.assertEqual((text, events), ("", 1), "an event without a delta adds nothing but counts")

    def test_malformed_and_truncated_streams_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            read_stream(['data: {"delta": "x"\n\n'])
        self.assertIn("chunk 1: malformed event", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            read_stream(['data: {"delta": "x"}\n\n'])
        self.assertIn("without [DONE]", str(caught.exception))
        with self.assertRaises(ValueError) as caught:
            read_stream(['data: {"delta": "x"}\n\ndata: {"del'])
        self.assertIn("11 characters still waiting", str(caught.exception))
        with self.assertRaises(ValueError):
            read_stream([])
        copy = list(CHUNKS)
        read_stream(CHUNKS)
        self.assertEqual(CHUNKS, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the usage event to be captured"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_captures_usage_and_changes_nothing_else(self):
        text, events, usage, log = practice_answer.read_stream(CHUNKS)
        self.assertEqual(usage, {"output_tokens": 9})
        self.assertEqual((text, events), (REPLY, 6))
        self.assertEqual(log, read_stream(CHUNKS)[2])
        self.assertIsNone(practice_answer.read_stream(['data: {"delta": "a"}\n\ndata: [DONE]\n\n'])[2], "no usage event gives None")
        text, events, usage, log = practice_answer.read_stream(['data: {"usage": {"output_tokens": 1}}\n\ndata: {"usage": {"output_tokens": 2}}\n\ndata: [DONE]\n\n'])
        self.assertEqual(usage, {"output_tokens": 2}, "the last usage event wins")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CHUNKS = [", "# --- answer begins ---"), segment(starter, "CHUNKS = [", "def read_stream"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every chunk, every line the buffer releases, the buffer left after each
    chunk, the text so far, what shipped, and the practice's usage, all from
    the lesson's own code. The animation's JavaScript port must reproduce this
    exactly."""
    text, events, log = read_stream(CHUNKS)
    steps = []
    buffer = ""
    done = False
    for number, chunk in enumerate(CHUNKS, start=1):
        if done:
            break
        buffer += chunk
        appended = buffer
        lines = []
        while "\n" in buffer and not done:
            line, buffer = buffer.split("\n", 1)
            stripped = line.strip()
            if not stripped:
                lines.append({"line": line, "kind": "blank", "delta": None})
            elif not stripped.startswith("data:"):
                lines.append({"line": line, "kind": "comment", "delta": None})
            else:
                payload = stripped.removeprefix("data:").strip()
                if payload == "[DONE]":
                    lines.append({"line": line, "kind": "done", "delta": None})
                    done = True
                else:
                    event = json.loads(payload)
                    lines.append({"line": line, "kind": "usage" if "usage" in event else "event", "delta": event.get("delta")})
        entry = log[number - 1]
        steps.append({"chunk": number, "appended": appended, "lines": lines, "remaining": buffer, "events_here": entry[2], "waiting": entry[3], "text": entry[4]})
    crashed_at, delivered = shipped(CHUNKS)
    usage = practice_answer.read_stream(CHUNKS)[2]
    return {
        "chunks": [{"number": index + 1, "text": chunk, "length": len(chunk)} for index, chunk in enumerate(CHUNKS)],
        "steps": steps,
        "text": text,
        "events": events,
        "shipped": {"crashed_at": crashed_at, "delivered": delivered},
        "practice": {"usage": usage},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on chunks.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_chunks_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "chunks.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["chunks"], CHUNKS)
        self.assertEqual(practice_answer.CHUNKS, CHUNKS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["text"], REPLY)
        self.assertEqual([step["waiting"] for step in trace["steps"]], [0, 0, 11, 0, 0, 40])
        self.assertEqual([len(step["lines"]) for step in trace["steps"]], [2, 4, 0, 4, 2, 3])
        self.assertEqual(trace["shipped"], {"crashed_at": 2, "delivered": "Restart "})
        self.assertEqual(trace["practice"]["usage"], {"output_tokens": 9})


class WhatShippedOnTheSameChunks(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the six chunks."""

    def test_parsing_whole_chunks_crashes_at_the_second_chunk(self):
        crashed_at, delivered = shipped(CHUNKS)
        self.assertEqual(crashed_at, 2, "two events in one chunk are not one JSON document")
        self.assertEqual(delivered, "Restart ")

    def test_the_split_event_would_also_crash_whole_chunk_parsing(self):
        crashed_at, delivered = shipped([CHUNKS[0], CHUNKS[2], CHUNKS[3]])
        self.assertEqual(crashed_at, 2, "half an event is not JSON either")

    def test_the_buffer_reader_delivers_the_whole_reply(self):
        text, events, log = read_stream(CHUNKS)
        self.assertEqual(text, REPLY)
        self.assertEqual(len(text), 41)


if __name__ == "__main__":
    unittest.main()
