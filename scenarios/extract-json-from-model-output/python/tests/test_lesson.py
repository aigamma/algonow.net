"""Checks of the worked example and the practice variation: the three lesson
files run alone and compared with the fixtures byte for byte, then the
functions at their edges. Every expectation is exact; nothing is random."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from json_extract import practice_answer
from json_extract.solution import REPLIES, REQUIRED_KEYS, find_json_span, parse_reply, validate

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "json_extract"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
TEXT = {reply["id"]: reply["text"] for reply in REPLIES}


def run_alone(name):
    """Copy one lesson file alone into an empty directory and run it with python -I -S
    and a minimal environment: no package, no import path, no siblings."""
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

    def test_find_json_span_handles_prose_fences_and_nesting(self):
        self.assertEqual(find_json_span(TEXT["r1"]), (0, len(TEXT["r1"]) - 1))
        self.assertEqual(find_json_span(TEXT["r2"]), (8, len(TEXT["r2"]) - 5))
        start, end = find_json_span(TEXT["r3"])
        self.assertEqual(TEXT["r3"][start:end + 1], '{"intent": "outage", "priority": 3, "tags": ["gateway", "error {502}"]}')
        self.assertEqual(find_json_span('x {"a": {"b": 1}} y'), (2, 16), "the outer object, not the inner one")
        self.assertEqual(find_json_span('} stray {"a": 1}'), (8, 15), "a closing brace before any object is ignored")

    def test_braces_inside_strings_and_escaped_quotes_do_not_count(self):
        self.assertEqual(find_json_span('{"a": "x } y", "b": 1}'), (0, 21))
        self.assertEqual(find_json_span('{"a": "say \\"}\\"", "b": 2}'), (0, 25), "an escaped quote stays inside the string")
        self.assertIsNone(find_json_span(TEXT["r4"]), "a truncated object never closes")
        self.assertIsNone(find_json_span("no braces here"))
        self.assertIsNone(find_json_span('{"a": "unterminated }'))

    def test_validate_names_the_first_problem(self):
        self.assertEqual(validate({}), "missing key intent")
        self.assertEqual(validate({"intent": "x", "tags": []}), "missing key priority")
        self.assertEqual(validate({"intent": "", "priority": 1, "tags": []}), "intent must be a non-empty string")
        for bad in [True, 0, 4, "2", 2.0]:
            self.assertEqual(validate({"intent": "x", "priority": bad, "tags": []}), "priority must be an integer from 1 to 3", repr(bad))
        self.assertEqual(validate({"intent": "x", "priority": 2, "tags": "keys"}), "tags must be a list of strings")
        self.assertEqual(validate({"intent": "x", "priority": 2, "tags": ["keys", 7]}), "tags must be a list of strings")
        for good in [1, 2, 3]:
            self.assertIsNone(validate({"intent": "x", "priority": good, "tags": []}))

    def test_parse_reply_outcomes_for_the_six_replies(self):
        outcomes = []
        for reply in REPLIES:
            record, reason = parse_reply(reply["text"])
            outcomes.append((reply["id"], record is not None, reason))
        self.assertEqual(outcomes, [("r1", True, None), ("r2", True, None), ("r3", True, None), ("r4", False, "no object"),
                                    ("r5", False, "priority must be an integer from 1 to 3"), ("r6", False, "invalid json")])
        record, _ = parse_reply(TEXT["r3"])
        self.assertEqual(record, {"intent": "outage", "priority": 3, "tags": ["gateway", "error {502}"]})

    def test_non_string_reply_is_rejected(self):
        for bad in [None, {"intent": "x"}]:
            with self.assertRaises(ValueError) as caught:
                parse_reply(bad)
            self.assertIn(type(bad).__name__, str(caught.exception))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected r6 to be accepted"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_repair_drops_only_trailing_commas(self):
        repair = practice_answer.repair_trailing_commas
        self.assertEqual(repair('{"a": 1,}'), '{"a": 1}')
        self.assertEqual(repair('[1, 2,]'), '[1, 2]')
        self.assertEqual(repair('{"a": [1,\n  ],\n}'), '{"a": [1\n  ]\n}', "whitespace between the comma and the bracket is skipped")
        self.assertEqual(repair('{"a": 1, "b": [2, 3]}'), '{"a": 1, "b": [2, 3]}', "ordinary commas stay")

    def test_answer_accepts_r6_with_the_repair_note(self):
        record, note = practice_answer.parse_reply(TEXT["r6"])
        self.assertEqual(record, {"intent": "access", "priority": 1, "tags": ["keys", "expired"]})
        self.assertEqual(note, "repaired a trailing comma")
        self.assertEqual(practice_answer.parse_reply(TEXT["r1"]), ({"intent": "access", "priority": 2, "tags": ["keys", "rotation"]}, None))
        self.assertEqual(practice_answer.parse_reply(TEXT["r4"]), (None, "no object"))
        self.assertEqual(practice_answer.parse_reply(TEXT["r5"]), (None, "priority must be an integer from 1 to 3"))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "REPLIES = [", "# --- answer begins ---"), segment(starter, "REPLIES = [", "def repair_trailing_commas"))
        self.assertEqual(segment(answer, "def parse_reply"), segment(starter, "def parse_reply"))


def walk_trace(text):
    """The depth and string flag after every character as find_json_span walks the
    text, the braces it ignored inside strings, and the span it returns."""
    depth, start, in_string, escaped, span = 0, None, False, False, None
    depths, flags, ignored = [], [], []
    for index, char in enumerate(text):
        if span is not None:
            depths.append(0)
            flags.append(0)
            continue
        if depth == 0:
            if char == "{":
                start, depth = index, 1
        elif in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            elif char in "{}":
                ignored.append(index)
        elif char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                span = [start, index]
        depths.append(depth)
        flags.append(1 if in_string else 0)
    return {"depths": depths, "in_string": flags, "ignored_braces": ignored, "span": span}


def derive_trace():
    """Every reply's walk, outcome, and record, the practice repair, and what the
    whole-reply parse that shipped does; the animation's JavaScript port must match."""
    replies, reasons, naive_parses, naive_raises, bad_parsed = [], {}, [], [], []
    for reply in REPLIES:
        text = reply["text"]
        walk = walk_trace(text)
        assert (tuple(walk["span"]) if walk["span"] else None) == find_json_span(text), "the recorded walk and the real function agree"
        record, reason = parse_reply(text)
        replies.append({"id": reply["id"], "length": len(text), **walk,
                        "outcome": "accepted" if record is not None else "rejected", "reason": reason, "record": record})
        if record is None:
            reasons.setdefault(reason, []).append(reply["id"])
        try:
            parsed = json.loads(text)
            naive_parses.append(reply["id"])
            if validate(parsed) is not None:
                bad_parsed.append(reply["id"])
        except json.JSONDecodeError:
            naive_raises.append(reply["id"])
    text = TEXT["r6"]
    start, end = find_json_span(text)
    candidate = text[start:end + 1]
    comma_index = None
    for index, char in enumerate(candidate):
        if char == "," and (candidate[index + 1:].lstrip().startswith("}") or candidate[index + 1:].lstrip().startswith("]")):
            comma_index = start + index
    record, note = practice_answer.parse_reply(text)
    practice_accepted = 0
    for reply in REPLIES:
        if practice_answer.parse_reply(reply["text"])[0] is not None:
            practice_accepted += 1
    accepted = len([entry for entry in replies if entry["outcome"] == "accepted"])
    return {
        "replies": replies,
        "counts": {"accepted": accepted, "rejected": len(replies) - accepted},
        "reasons": reasons,
        "practice": {"id": "r6", "comma_index": comma_index, "repaired_candidate": practice_answer.repair_trailing_commas(candidate),
                     "note": note, "record": record, "counts": {"accepted": practice_accepted, "rejected": len(replies) - practice_accepted}},
        "naive": {"parses": naive_parses, "raises": naive_raises, "schema_invalid_parsed": bad_parsed},
    }


class AnimationFixtures(unittest.TestCase):
    """replies.json and expected-trace.json are pinned to the lesson files, so the picture cannot drift."""

    def test_replies_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "replies.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"replies": REPLIES, "required_keys": REQUIRED_KEYS, "priority_range": [1, 3]})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        by_id = {entry["id"]: entry for entry in trace["replies"]}
        self.assertEqual(by_id["r1"]["span"], [0, 64])
        self.assertEqual(by_id["r3"]["span"], [34, 104])
        self.assertEqual(by_id["r3"]["ignored_braces"], [97, 101], "the braces inside the tag string are skipped")
        self.assertEqual(max(by_id["r3"]["depths"]), 1)
        self.assertIsNone(by_id["r4"]["span"])
        self.assertEqual(trace["counts"], {"accepted": 3, "rejected": 3})
        self.assertEqual(trace["practice"]["comma_index"], 79)
        self.assertEqual(trace["practice"]["counts"], {"accepted": 4, "rejected": 2})


class WholeReplyParseOnTheSameReplies(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the six replies."""

    def test_naive_json_loads_crashes_on_four_and_passes_a_bad_record(self):
        parses, raises = [], []
        for reply in REPLIES:
            try:
                parses.append((reply["id"], json.loads(reply["text"])))
            except json.JSONDecodeError:
                raises.append(reply["id"])
        self.assertEqual(raises, ["r2", "r3", "r4", "r6"], "what shipped raised on four of six")
        self.assertEqual([reply_id for reply_id, _ in parses], ["r1", "r5"])
        self.assertEqual(validate(dict(parses)["r5"]), "priority must be an integer from 1 to 3", "and passed a text priority downstream")

    def test_extractor_never_accepts_a_schema_invalid_object(self):
        accepted = 0
        for reply in REPLIES:
            record, reason = parse_reply(reply["text"])
            if record is not None:
                accepted += 1
                self.assertIsNone(validate(record))
            else:
                self.assertTrue(reason)
        self.assertEqual(accepted, 3)
        self.assertEqual(derive_trace()["practice"]["counts"]["accepted"], 4, "the repair recovers one more reply, never a bad one")


if __name__ == "__main__":
    unittest.main()
