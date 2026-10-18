"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise validate directly, at every reason and boundary, and
measure the readers that shipped on the same lines. Expectations are exact:
the input is fixed text and nothing is random."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from jsonl_validation import practice_answer
from jsonl_validation.solution import LINES, MAX_ANSWER_CHARS, validate

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "jsonl_validation"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"

GOOD = '{"prompt": "How do I rotate a key?", "answer": "Create a replacement key."}'


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


def run(lines, max_chars=MAX_ANSWER_CHARS, function=validate):
    """Drive the generator to the end and return what it kept and what it rejected."""
    rejections = []
    kept = list(function(lines, rejections, max_chars))
    return kept, rejections


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_keeps_exactly_the_four_good_lines(self):
        kept, rejections = run(LINES.splitlines())
        self.assertEqual([record["prompt"] for record in kept],
                         ["How do I rotate a key?", "Which scope do list calls need?",
                          "Can a lost key be recovered?", "Where do I find my invoice?"])
        self.assertEqual(kept[1], {"prompt": "Which scope do list calls need?", "answer": "The read scope covers list and get calls."})
        for record in kept:
            self.assertLessEqual(len(record["answer"]), MAX_ANSWER_CHARS)

    def test_each_rejection_names_its_line_and_reason(self):
        kept, rejections = run(LINES.splitlines())
        self.assertEqual(rejections, [(3, "malformed json"), (5, "missing answer"), (6, "empty answer"), (8, "answer too long")])
        self.assertEqual(len(json.loads(LINES.splitlines()[7])["answer"]), 345, "the long answer is 345 characters")

    def test_blank_lines_are_skipped_and_not_counted(self):
        self.assertEqual(len(LINES.splitlines()), 9, "eight records plus the empty last line")
        kept, rejections = run(["", "   ", GOOD, "\t", ""])
        self.assertEqual(len(kept), 1)
        self.assertEqual(rejections, [])

    def test_generator_is_lazy(self):
        rejections = []
        records = validate(LINES.splitlines(), rejections, MAX_ANSWER_CHARS)
        first = next(records)
        self.assertEqual(first["prompt"], "How do I rotate a key?")
        self.assertEqual(rejections, [], "nothing past line 1 has been read yet")
        next(records)
        self.assertEqual(rejections, [], "line 2 is good, line 3 is still unread")
        third = next(records)
        self.assertEqual(third["prompt"], "Can a lost key be recovered?")
        self.assertEqual(rejections, [(3, "malformed json")], "reaching line 4 passed line 3")

    def test_non_object_lines_and_non_string_fields(self):
        lines = ["[1, 2]", "42", "null", '{"prompt": 5, "answer": "x"}', '{"prompt": "q", "answer": ["x"]}', "{}"]
        kept, rejections = run(lines)
        self.assertEqual(kept, [])
        self.assertEqual([reason for number, reason in rejections],
                         ["not an object", "not an object", "not an object", "missing prompt", "missing answer", "missing prompt"])

    def test_empty_prompt_and_empty_answer(self):
        kept, rejections = run(['{"prompt": "   ", "answer": "x"}', '{"prompt": "q", "answer": " "}'])
        self.assertEqual(rejections, [(1, "empty prompt"), (2, "empty answer")])

    def test_answer_length_boundary(self):
        exact = json.dumps({"prompt": "q", "answer": "a" * MAX_ANSWER_CHARS})
        over = json.dumps({"prompt": "q", "answer": "a" * (MAX_ANSWER_CHARS + 1)})
        kept, rejections = run([exact, over])
        self.assertEqual(len(kept), 1, "an answer of exactly the limit is kept")
        self.assertEqual(rejections, [(2, "answer too long")])

    def test_nothing_raises_on_bad_content(self):
        lines = ["not json at all", "{", '"just a string"', '{"prompt": "q"', GOOD]
        kept, rejections = run(lines)
        self.assertEqual(len(kept), 1)
        self.assertEqual([reason for number, reason in rejections],
                         ["malformed json", "malformed json", "not an object", "malformed json"])

    def test_kept_records_are_new_dictionaries(self):
        first_kept, first_rejections = run(LINES.splitlines())
        first_kept[0]["answer"] = "changed by the caller"
        second_kept, second_rejections = run(LINES.splitlines())
        self.assertTrue(second_kept[0]["answer"].startswith("Create a replacement key"), "a rerun parses fresh records")
        self.assertIsNot(first_kept[0], second_kept[0])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 4 kept and line 9 rejected as a duplicate prompt, got 5 kept and 4 rejected"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_rejects_the_repeat_and_keeps_the_first(self):
        lines = practice_answer.LINES.splitlines()
        self.assertEqual(len(lines), 10, "nine records plus the empty last line")
        self.assertEqual(json.loads(lines[8])["prompt"], json.loads(lines[0])["prompt"], "line 9 repeats the prompt of line 1")
        kept, rejections = run(lines, function=practice_answer.validate)
        self.assertEqual(len(kept), 4)
        self.assertEqual(rejections[-1], (9, "duplicate prompt"))
        self.assertTrue(kept[0]["answer"].startswith("Create a replacement key"))
        self.assertEqual(rejections[:4], [(3, "malformed json"), (5, "missing answer"), (6, "empty answer"), (8, "answer too long")])

    def test_answer_matches_the_worked_example_on_the_worked_input(self):
        self.assertEqual(run(LINES.splitlines(), function=practice_answer.validate), run(LINES.splitlines()))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "MAX_ANSWER_CHARS = 300", "# --- answer begins ---"),
                         segment(starter, "MAX_ANSWER_CHARS = 300", "def validate"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace(lines, function, max_chars):
    """Trace what the generator does with every physical line by running the
    real function over growing prefixes. The animation's JavaScript port must
    reproduce this exactly."""
    steps = []
    previous_kept, previous_rejected = 0, 0
    for index in range(len(lines)):
        rejections = []
        kept = list(function(lines[:index + 1], rejections, max_chars))
        line = lines[index]
        step = {"line": index + 1, "text_preview": line[:40], "outcome": "blank", "reason": None,
                "prompt_preview": None, "answer_chars": None, "kept_count": len(kept), "rejected_count": len(rejections)}
        if len(kept) > previous_kept:
            step.update(outcome="kept", prompt_preview=kept[-1]["prompt"][:40], answer_chars=len(kept[-1]["answer"]))
        elif len(rejections) > previous_rejected:
            step.update(outcome="rejected", reason=rejections[-1][1])
            if rejections[-1][1] == "answer too long":
                step["answer_chars"] = len(json.loads(line)["answer"])
        steps.append(step)
        previous_kept, previous_rejected = len(kept), len(rejections)
    by_reason = Counter()
    for number, reason in rejections:
        by_reason[reason] += 1
    return {"steps": steps, "by_reason": [[reason, count] for reason, count in by_reason.most_common()]}


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on lines.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_lines_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "lines.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"max_answer_chars": MAX_ANSWER_CHARS, "lines": LINES.splitlines(),
                                   "practice_lines": practice_answer.LINES.splitlines()})
        self.assertEqual(fixture["practice_lines"][:8], fixture["lines"][:8])
        self.assertEqual(fixture["practice_lines"][9], "")

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        worked = derive_trace(LINES.splitlines(), validate, MAX_ANSWER_CHARS)
        practice = derive_trace(practice_answer.LINES.splitlines(), practice_answer.validate, MAX_ANSWER_CHARS)
        self.assertEqual(fixture, {"max_answer_chars": MAX_ANSWER_CHARS, "steps": worked["steps"], "by_reason": worked["by_reason"],
                                   "practice": practice})
        self.assertEqual([step["outcome"] for step in worked["steps"]],
                         ["kept", "kept", "rejected", "kept", "rejected", "rejected", "kept", "rejected", "blank"])
        self.assertEqual([step["reason"] for step in practice["steps"]][8:], ["duplicate prompt", None])
        self.assertEqual(worked["steps"][7]["answer_chars"], 345)


class ShippedApproachOnTheSameInput(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same lines."""

    def test_unguarded_json_loads_crashes_on_line_three(self):
        parsed = []
        with self.assertRaises(json.JSONDecodeError):
            for line in LINES.splitlines():
                if line.strip():
                    parsed.append(json.loads(line))
        self.assertEqual(len(parsed), 2, "two records in, then the crash on line 3, and the rest never read")

    def test_guarding_only_the_parse_keeps_bad_records(self):
        kept = []
        for line in LINES.splitlines():
            if not line.strip():
                continue
            try:
                kept.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        self.assertEqual(len(kept), 7, "seven of the eight records parse")
        bad = [record for record in kept if not isinstance(record.get("answer"), str)
               or record["answer"].strip() == "" or len(record["answer"]) > MAX_ANSWER_CHARS]
        self.assertEqual(len(bad), 3, "three of them would have trained the model badly")
        self.assertEqual(len(run(LINES.splitlines())[0]), 4, "the repair keeps the four good ones")

    def test_counter_orders_repeated_reasons_first_and_keeps_ties_in_order(self):
        kept, rejections = run(["{", "{", GOOD, "{}", "{"])
        by_reason = Counter()
        for number, reason in rejections:
            by_reason[reason] += 1
        self.assertEqual(by_reason.most_common(), [("malformed json", 3), ("missing prompt", 1)])
        kept, rejections = run(['{"prompt": "q"}', "{", "[]"])
        tally = Counter(reason for number, reason in rejections)
        self.assertEqual(tally.most_common(), [("missing answer", 1), ("malformed json", 1), ("not an object", 1)],
                         "equal counts keep first-seen order")


if __name__ == "__main__":
    unittest.main()
