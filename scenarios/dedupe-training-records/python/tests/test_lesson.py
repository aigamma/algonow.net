"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise normalize, dedupe, and evaluation_overlap directly, at
their edges, and measure the exact-string dedupe that shipped on the same
records. Expectations are exact: the input is fixed text and nothing is random."""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from dedupe_records import practice_answer
from dedupe_records.solution import EVAL_PROMPTS, RECORDS, dedupe, evaluation_overlap, normalize

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "dedupe_records"
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


def ids(records):
    return [record["id"] for record in records]


class Normalization(unittest.TestCase):
    def test_three_spellings_of_one_question_share_a_key(self):
        self.assertEqual(normalize("How do I rotate a key?"), "how do i rotate a key")
        self.assertEqual(normalize("how do i rotate a key"), "how do i rotate a key")
        self.assertEqual(normalize("How do I rotate a key ?"), "how do i rotate a key")
        self.assertEqual(normalize("which scope do LIST calls need"), normalize("Which scope do list calls need?"))

    def test_punctuation_is_dropped_and_whitespace_runs_collapse(self):
        self.assertEqual(normalize("  Rotate,   the\tkey!!  "), "rotate the key")
        self.assertEqual(normalize("E4031: key not active"), "e4031 key not active", "digits survive, the colon does not")
        self.assertEqual(normalize("line one\nline two"), "line one line two", "a newline is whitespace too")

    def test_an_all_punctuation_prompt_normalizes_to_nothing(self):
        self.assertEqual(normalize("???"), "")
        self.assertEqual(normalize("   "), "")


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_first_record_per_key_is_kept_and_later_ones_name_it(self):
        kept, dropped = dedupe(RECORDS)
        self.assertEqual(ids(kept), ["r1", "r2", "r3", "r5", "r8"])
        self.assertEqual(dropped, [("r4", "r1"), ("r6", "r2"), ("r7", "r1")])

    def test_kept_records_are_the_originals_in_input_order(self):
        kept, dropped = dedupe(RECORDS)
        for record in kept:
            self.assertIn(record, RECORDS)
            self.assertIs(record, RECORDS[RECORDS.index(record)], "kept records are the caller's dictionaries, not copies")
        positions = [RECORDS.index(record) for record in kept]
        self.assertEqual(positions, sorted(positions))

    def test_input_is_not_modified(self):
        before = copy.deepcopy(RECORDS)
        dedupe(RECORDS)
        evaluation_overlap(dedupe(RECORDS)[0], EVAL_PROMPTS)
        self.assertEqual(RECORDS, before)

    def test_missing_or_empty_prompt_raises_naming_the_record(self):
        with self.assertRaises(ValueError) as missing:
            dedupe([{"id": "r9", "answer": "x"}])
        self.assertIn("r9", str(missing.exception))
        with self.assertRaises(ValueError) as empty:
            dedupe(RECORDS + [{"id": "r9", "prompt": "???", "answer": "x"}])
        self.assertIn("r9", str(empty.exception))
        self.assertIn("empty", str(empty.exception))

    def test_a_clean_list_keeps_everything(self):
        clean = [RECORDS[0], RECORDS[1], RECORDS[2]]
        kept, dropped = dedupe(clean)
        self.assertEqual(kept, clean)
        self.assertEqual(dropped, [])
        self.assertEqual(dedupe([]), ([], []))

    def test_evaluation_overlap_names_the_twins(self):
        kept, dropped = dedupe(RECORDS)
        self.assertEqual(evaluation_overlap(kept, EVAL_PROMPTS), ["r2", "r5"])
        self.assertEqual(evaluation_overlap(kept, ["How is usage billed?"]), [])
        self.assertEqual(evaluation_overlap(kept, ["HOW DO I ROTATE A KEY???"]), ["r1"], "overlap is judged on keys, not spellings")
        self.assertEqual(evaluation_overlap([], EVAL_PROMPTS), [])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 3 kept with the evaluation overlap removed, got 5 kept"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_removes_the_overlap_and_keeps_three(self):
        kept, dropped, overlaps = practice_answer.dedupe(RECORDS, EVAL_PROMPTS)
        self.assertEqual(ids(kept), ["r1", "r3", "r8"])
        self.assertEqual(dropped, [("r4", "r1"), ("r7", "r1")])
        self.assertEqual(overlaps, ["r2", "r5", "r6"], "r6 shares r2's key, so it is an overlap, not a duplicate of a kept record")

    def test_answer_with_no_evaluation_prompts_equals_the_worked_solution(self):
        kept, dropped, overlaps = practice_answer.dedupe(RECORDS, [])
        self.assertEqual((kept, dropped), dedupe(RECORDS))
        self.assertEqual(overlaps, [])

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "RECORDS = [", "# --- answer begins ---"),
                         segment(starter, "RECORDS = [", "def dedupe"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace(records, eval_prompts):
    """Trace every decision by running the real functions over growing prefixes.
    The animation's JavaScript port must reproduce this exactly."""
    steps = []
    previous_dropped = 0
    for index in range(len(records)):
        kept, dropped = dedupe(records[:index + 1])
        record = records[index]
        step = {"id": record["id"], "prompt": record["prompt"], "key": normalize(record["prompt"]), "decision": "kept", "twin": None}
        if len(dropped) > previous_dropped:
            step["decision"] = "dropped"
            step["twin"] = dropped[-1][1]
        steps.append(step)
        previous_dropped = len(dropped)
    kept, dropped = dedupe(records)
    id_for_key = {}
    for record in kept:
        id_for_key[normalize(record["prompt"])] = record["id"]
    eval_keys = []
    matches = []
    for prompt in eval_prompts:
        key = normalize(prompt)
        eval_keys.append(key)
        if key in id_for_key:
            matches.append({"eval": prompt, "key": key, "training_id": id_for_key[key]})
    practice_steps = []
    previous = (0, 0, 0)
    for index in range(len(records)):
        p_kept, p_dropped, p_overlaps = practice_answer.dedupe(records[:index + 1], eval_prompts)
        record = records[index]
        step = {"id": record["id"], "prompt": record["prompt"], "key": normalize(record["prompt"]), "decision": "kept", "twin": None}
        if len(p_dropped) > previous[1]:
            step["decision"] = "dropped"
            step["twin"] = p_dropped[-1][1]
        elif len(p_overlaps) > previous[2]:
            step["decision"] = "overlap"
        practice_steps.append(step)
        previous = (len(p_kept), len(p_dropped), len(p_overlaps))
    p_kept, p_dropped, p_overlaps = practice_answer.dedupe(records, eval_prompts)
    trace = {
        "steps": steps,
        "kept": ids(kept),
        "dropped": [[dropped_id, kept_id] for dropped_id, kept_id in dropped],
        "overlap": {"eval_keys": eval_keys, "matches": matches},
        "practice": {"steps": practice_steps, "kept": ids(p_kept),
                     "dropped": [[dropped_id, kept_id] for dropped_id, kept_id in p_dropped], "overlaps": p_overlaps},
    }
    return json.loads(json.dumps(trace))


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on records.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_records_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "records.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"records": RECORDS, "eval_prompts": EVAL_PROMPTS})
        self.assertEqual(practice_answer.RECORDS, RECORDS)
        self.assertEqual(practice_answer.EVAL_PROMPTS, EVAL_PROMPTS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        derived = derive_trace(RECORDS, EVAL_PROMPTS)
        self.assertEqual(fixture, derived)
        self.assertEqual([step["decision"] for step in derived["steps"]],
                         ["kept", "kept", "kept", "dropped", "kept", "dropped", "dropped", "kept"])
        self.assertEqual([step["twin"] for step in derived["steps"] if step["twin"]], ["r1", "r2", "r1"])
        self.assertEqual([match["training_id"] for match in derived["overlap"]["matches"]], ["r2", "r5"])
        self.assertEqual([step["decision"] for step in derived["practice"]["steps"]],
                         ["kept", "overlap", "kept", "dropped", "overlap", "overlap", "dropped", "kept"])


class ShippedApproachOnTheSameInput(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same records."""

    def test_exact_string_dedupe_keeps_every_spelling(self):
        exact = set()
        for record in RECORDS:
            exact.add(record["prompt"])
        self.assertEqual(len(exact), 8, "every spelling differs, so exact-string dedupe keeps all eight")
        self.assertEqual(len(dedupe(RECORDS)[0]), 5, "normalized keys collapse them to five")

    def test_exact_string_overlap_misses_a_respelled_evaluation_prompt(self):
        raw = set()
        for record in RECORDS:
            raw.add(record["prompt"])
        exact_hits = [prompt for prompt in EVAL_PROMPTS if prompt in raw]
        self.assertEqual(exact_hits, ["Where do I find my invoice?"], "only the verbatim twin is found by exact comparison")
        self.assertEqual(evaluation_overlap(dedupe(RECORDS)[0], EVAL_PROMPTS), ["r2", "r5"], "the normalized check finds both")


if __name__ == "__main__":
    unittest.main()
