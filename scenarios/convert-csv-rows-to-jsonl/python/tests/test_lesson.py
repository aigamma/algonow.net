"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
export is fixed text and nothing is random."""
import csv
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from csv_to_jsonl import practice_answer
from csv_to_jsonl.solution import CSV_TEXT, REQUIRED, rows_to_examples, to_jsonl

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "csv_to_jsonl"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
MAX_CHARS = practice_answer.MAX_CHARS
HEADER = "ticket_id,customer_question,agent_reply,status\n"
EXPECTED_EXAMPLES = [
    {"prompt": "How do I rotate an API key?", "completion": "Create a replacement key and deploy it before revoking the old one."},
    {"prompt": "Which scope do list calls need?", "completion": "The read scope, which covers list and get calls."},
    {"prompt": "Where do I find my invoice?", "completion": "Open Billing, then Invoices.\nEach month is a PDF."},
]


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


def split_on_commas(csv_text):
    """What shipped: every line of the file split on commas, quotes ignored."""
    rows = []
    for line in csv_text.strip("\n").split("\n")[1:]:
        rows.append(line.split(","))
    return rows


def split_records(csv_text):
    """The raw text of each record, header first: a newline outside quotes ends a record."""
    records, current, in_quotes = [], "", False
    for char in csv_text:
        if char == '"':
            in_quotes = not in_quotes
        if char == "\n" and not in_quotes:
            records.append(current)
            current = ""
        else:
            current += char
    if current:
        records.append(current)
    return records


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_examples_are_the_three_closed_tickets_with_a_reply(self):
        examples, skipped = rows_to_examples(CSV_TEXT)
        self.assertEqual(examples, EXPECTED_EXAMPLES)
        self.assertEqual(skipped, {"not_closed": ["t4"], "empty_reply": ["t5"]})

    def test_quoted_comma_and_line_break_stay_inside_one_field(self):
        examples, _ = rows_to_examples(CSV_TEXT)
        self.assertIn(", which covers", examples[1]["completion"])
        self.assertEqual(examples[2]["completion"].count("\n"), 1)
        self.assertTrue(examples[2]["completion"].endswith("a PDF."))

    def test_status_is_compared_after_strip_and_lower(self):
        examples, skipped = rows_to_examples(HEADER + "t7,Q?,A.,Closed \nt8,Q?,A.,CLOSED\nt9,Q?,A., open\n")
        self.assertEqual(len(examples), 2)
        self.assertEqual(skipped, {"not_closed": ["t9"], "empty_reply": []})

    def test_a_reply_of_only_whitespace_counts_as_empty(self):
        examples, skipped = rows_to_examples(HEADER + "t7,Q?,   ,closed\n")
        self.assertEqual((examples, skipped["empty_reply"]), ([], ["t7"]))

    def test_missing_column_and_empty_text_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            rows_to_examples("ticket_id,customer_question,status\nt9,Why?,closed\n")
        self.assertIn("'agent_reply'", str(caught.exception))
        with self.assertRaises(ValueError):
            rows_to_examples("")

    def test_a_header_only_export_gives_no_examples(self):
        self.assertEqual(rows_to_examples(HEADER), ([], {"not_closed": [], "empty_reply": []}))

    def test_to_jsonl_escapes_line_breaks_keeps_non_ascii_and_round_trips(self):
        text = to_jsonl([{"prompt": "Où?", "completion": "Line one.\nLine two."}])
        self.assertEqual(text, '{"prompt": "Où?", "completion": "Line one.\\nLine two."}\n')
        self.assertEqual(json.loads(text.splitlines()[0])["completion"], "Line one.\nLine two.")
        self.assertEqual(to_jsonl([]), "")
        self.assertEqual(to_jsonl(EXPECTED_EXAMPLES).count("\n"), 3)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected t1 to be skipped as too_long"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_skips_only_the_example_over_the_budget(self):
        examples, skipped = practice_answer.rows_to_examples(CSV_TEXT, max_chars=MAX_CHARS)
        self.assertEqual(examples, EXPECTED_EXAMPLES[1:])
        self.assertEqual(skipped, {"not_closed": ["t4"], "empty_reply": ["t5"], "too_long": ["t1"]})
        lengths = [len(e["prompt"]) + len(e["completion"]) for e in EXPECTED_EXAMPLES]
        self.assertEqual(lengths, [94, 79, 76])

    def test_answer_without_a_budget_matches_the_worked_example(self):
        examples, skipped = practice_answer.rows_to_examples(CSV_TEXT)
        self.assertEqual(examples, EXPECTED_EXAMPLES)
        self.assertEqual(skipped["too_long"], [])

    def test_answer_budget_boundary_is_inclusive(self):
        kept, _ = practice_answer.rows_to_examples(CSV_TEXT, max_chars=94)
        self.assertEqual(len(kept), 3, "exactly the budget still fits")
        kept, skipped = practice_answer.rows_to_examples(CSV_TEXT, max_chars=93)
        self.assertEqual((len(kept), skipped["too_long"]), (2, ["t1"]))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CSV_TEXT = ", "# --- answer begins ---"), segment(starter, "CSV_TEXT = ", "def rows_to_examples"))
        self.assertEqual(segment(answer, "def to_jsonl"), segment(starter, "def to_jsonl"))


def derive_trace():
    """Every row's parse, decision, and JSONL line, the split-on-commas shards
    that shipped, and the practice decisions, all from the lesson's functions.
    The animation's JavaScript must reproduce this exactly."""
    rows = list(csv.DictReader(io.StringIO(CSV_TEXT)))
    records = split_records(CSV_TEXT)[1:]
    examples, skipped = rows_to_examples(CSV_TEXT)
    lines = to_jsonl(examples).splitlines()
    steps = []
    kept = 0
    for row, raw in zip(rows, records, strict=True):
        step = {"id": row["ticket_id"], "raw": raw, "quoted": '"' in raw,
                "naive_lines": [line.split(",") for line in raw.split("\n")],
                "fields": [row[column] for column in REQUIRED],
                "chars": len(row["customer_question"].strip()) + len(row["agent_reply"].strip())}
        if row["ticket_id"] in skipped["not_closed"]:
            step["decision"] = "not_closed"
        elif row["ticket_id"] in skipped["empty_reply"]:
            step["decision"] = "empty_reply"
        else:
            step["decision"] = "kept"
            step["line"] = lines[kept]
            kept += 1
        steps.append(step)
    p_examples, p_skipped = practice_answer.rows_to_examples(CSV_TEXT, max_chars=MAX_CHARS)
    practice_steps = []
    for step in steps:
        decision = step["decision"]
        if step["id"] in p_skipped["too_long"]:
            decision = "too_long"
        practice_steps.append({"id": step["id"], "chars": step["chars"], "decision": decision})
    return {
        "required": REQUIRED, "rows": rows, "steps": steps,
        "naive": {"lines": CSV_TEXT.strip("\n").split("\n")[1:], "field_counts": [len(r) for r in split_on_commas(CSV_TEXT)]},
        "kept": [s["id"] for s in steps if s["decision"] == "kept"], "skipped": skipped, "jsonl": to_jsonl(examples),
        "practice": {"max_chars": MAX_CHARS, "steps": practice_steps, "kept": [s["id"] for s in practice_steps if s["decision"] == "kept"],
                     "skipped": p_skipped, "jsonl": to_jsonl(p_examples)},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on export.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_export_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "export.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"csv_text": CSV_TEXT, "required": REQUIRED, "max_chars": MAX_CHARS,
                                   "rows": list(csv.DictReader(io.StringIO(CSV_TEXT)))})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([s["decision"] for s in trace["steps"]], ["kept", "kept", "kept", "not_closed", "empty_reply"])
        self.assertEqual([s["chars"] for s in trace["steps"]], [94, 79, 76, 67, 30])
        self.assertEqual([s["quoted"] for s in trace["steps"]], [False, True, True, False, False])
        self.assertEqual(trace["naive"]["field_counts"], [4, 5, 4, 2, 4, 4])
        self.assertEqual(trace["practice"]["kept"], ["t2", "t3"])


class SplitOnCommasOnTheSameExport(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the five rows."""

    def test_split_on_commas_shreds_the_two_quoted_rows(self):
        rows = split_on_commas(CSV_TEXT)
        self.assertEqual(len(rows), 6, "the quoted line break makes a sixth line")
        self.assertEqual([len(row) for row in rows], [4, 5, 4, 2, 4, 4])
        true_rows = list(csv.DictReader(io.StringIO(CSV_TEXT)))
        shredded = [row["ticket_id"] for row in true_rows if [row[c] for c in REQUIRED] not in rows]
        self.assertEqual(shredded, ["t2", "t3"], "two of the five rows come out wrong")

    def test_dict_reader_parses_every_row_to_four_fields(self):
        rows = list(csv.DictReader(io.StringIO(CSV_TEXT)))
        self.assertEqual([row["ticket_id"] for row in rows], ["t1", "t2", "t3", "t4", "t5"])
        for row in rows:
            self.assertEqual(list(row.keys()), REQUIRED)
            self.assertNotIn(None, row.values())
        self.assertEqual(rows[1]["agent_reply"], "The read scope, which covers list and get calls.")
        self.assertEqual(rows[2]["agent_reply"], "Open Billing, then Invoices.\nEach month is a PDF.")


if __name__ == "__main__":
    unittest.main()
