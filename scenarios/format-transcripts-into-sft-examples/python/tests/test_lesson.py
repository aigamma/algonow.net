"""Checks of the worked example and the practice variation: the three lesson
files run alone against the expected-output fixtures byte for byte, then the
functions directly, with exact expectations (nothing is random)."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from sft_examples import practice_answer
from sft_examples.solution import MAX_HISTORY, ROWS, build_examples, group_turns, position_of

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "sft_examples"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
SYSTEM = practice_answer.SYSTEM
MIN_TARGET_WORDS = practice_answer.MIN_TARGET_WORDS


def run_alone(name):
    """Run one lesson file alone in an empty directory with python -I -S."""
    keep = {"PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE"}
    env = {key: value for key, value in os.environ.items() if key.upper() in keep}
    with tempfile.TemporaryDirectory() as empty:
        shutil.copyfile(PACKAGE / name, Path(empty) / name)
        return subprocess.run([sys.executable, "-I", "-S", name], cwd=empty, env=env,
                              capture_output=True, text=True, timeout=60)


def expected(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def last_turn_examples(rows):
    """What shipped: one example per conversation, the whole transcript before
    the last assistant turn as context, that turn as the target."""
    examples = []
    for conversation_id, turns in group_turns(rows).items():
        last = None
        for position, turn in enumerate(turns):
            if turn["role"] == "assistant" and turn["text"] != "":
                last = position
        if last is not None:
            examples.append({"conversation": conversation_id, "turn": turns[last]["turn"],
                             "context": [{"role": t["role"], "text": t["text"]} for t in turns[:last]],
                             "target": turns[last]["text"]})
    return examples


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_rows_group_by_conversation_in_turn_order(self):
        conversations = group_turns(ROWS)
        self.assertEqual(list(conversations), ["c1", "c2"], "first seen first")
        self.assertEqual([t["turn"] for t in conversations["c1"]], [1, 2, 3, 4, 5, 6])
        self.assertEqual([t["turn"] for t in conversations["c2"]], [1, 2, 3])
        self.assertEqual([r["turn"] for r in ROWS if r["conversation"] == "c1"], [1, 2, 3, 5, 4, 6], "the export is not in turn order")

    def test_duplicate_turn_index_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            group_turns(ROWS + [{"conversation": "c1", "turn": 2, "role": "assistant", "text": "Rotate it."}])
        self.assertEqual(str(caught.exception), "conversation 'c1' has two turns with index 2")
        group_turns(ROWS + [{"conversation": "c2", "turn": 4, "role": "assistant", "text": "Welcome."}])

    def test_examples_match_the_page(self):
        examples, skipped = build_examples(ROWS, max_history=MAX_HISTORY)
        self.assertEqual(skipped, 1)
        self.assertEqual([(e["conversation"], e["turn"], len(e["context"])) for e in examples], [("c1", 2, 1), ("c1", 6, 4), ("c2", 2, 1)])
        self.assertEqual(examples[0]["context"], [{"role": "user", "text": "How do I rotate an API key?"}])
        self.assertEqual([m["role"] for m in examples[1]["context"]], ["assistant", "user", "assistant", "user"])
        self.assertEqual(examples[1]["context"][2]["text"], "", "the empty turn stays in the context as it happened")
        self.assertEqual(examples[1]["target"], "A lost key cannot be recovered. Create a replacement and revoke the lost one.")

    def test_the_window_never_exceeds_max_history(self):
        for window in [0, 1, 2, 3, 4, 10]:
            examples, _ = build_examples(ROWS, max_history=window)
            self.assertEqual(len(examples), 3)
            for example in examples:
                self.assertLessEqual(len(example["context"]), window)
        examples, _ = build_examples(ROWS, max_history=10)
        self.assertEqual(len(examples[1]["context"]), 5, "a wide window keeps the whole conversation")
        examples, _ = build_examples(ROWS, max_history=0)
        self.assertEqual(examples[1]["context"], [], "a zero window keeps only the target")

    def test_position_of_counts_the_earlier_turns(self):
        turns = group_turns(ROWS)["c1"]
        self.assertEqual([position_of(turns, n) for n in [1, 2, 6]], [0, 1, 5])

    def test_user_turns_and_empty_assistant_turns_never_become_targets(self):
        examples, skipped = build_examples(ROWS)
        self.assertTrue(all(e["target"] != "" for e in examples))
        self.assertEqual(skipped, 1)
        no_text = [{"conversation": "c9", "turn": 1, "role": "user", "text": "Hi"}, {"conversation": "c9", "turn": 2, "role": "assistant", "text": ""}]
        self.assertEqual(build_examples(no_text), ([], 1))

    def test_input_rows_are_not_modified(self):
        before = json.dumps(ROWS)
        build_examples(ROWS)
        self.assertEqual(json.dumps(ROWS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected every context to start with the system message"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_prepends_the_system_message_and_skips_short_targets(self):
        examples, skipped = practice_answer.build_examples(ROWS, max_history=MAX_HISTORY)
        self.assertEqual(skipped, 2)
        self.assertEqual([(e["conversation"], e["turn"], len(e["context"])) for e in examples], [("c1", 2, 2), ("c1", 6, 5)])
        for example in examples:
            self.assertEqual(example["context"][0], {"role": "system", "text": SYSTEM})
            self.assertGreaterEqual(len(example["target"].split()), MIN_TARGET_WORDS)
        self.assertEqual(len("Under Billing.".split()), 2, "the dropped target has two words")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "ROWS = [", "# --- answer begins ---"), segment(starter, "ROWS = [", "def build_examples"))
        self.assertEqual(segment(answer, "def position_of"), segment(starter, "def position_of"))


def derive_trace():
    """The walk, examples, practice, and shipped baseline from the lesson's own
    functions; the animation's JavaScript port must reproduce this exactly."""
    conversations = group_turns(ROWS)

    def walk(builder, skip_reason):
        rows, examples = [], []
        for conversation_id, turns in conversations.items():
            for position, turn in enumerate(turns):
                if turn["role"] != "assistant":
                    continue
                words = len(turn["text"].split())
                skipped = skip_reason(turn["text"], words)
                record = {"conversation": conversation_id, "position": position, "turn": turn["turn"], "words": words,
                          "decision": skipped if skipped else "example", "start": max(0, position - MAX_HISTORY),
                          "context_size": 0, "dropped": 0}
                if not skipped:
                    record["context_size"] = position - record["start"]
                    record["dropped"] = record["start"]
                rows.append(record)
        return rows

    worked_walk = walk(build_examples, lambda text, words: "skipped-empty" if text == "" else None)
    practice_walk = walk(practice_answer.build_examples, lambda text, words: ("skipped-empty" if text == "" else "skipped-short") if words < MIN_TARGET_WORDS else None)
    examples, skipped = build_examples(ROWS, max_history=MAX_HISTORY)
    practice_examples, practice_skipped = practice_answer.build_examples(ROWS, max_history=MAX_HISTORY)
    shipped = last_turn_examples(ROWS)
    return {
        "max_history": MAX_HISTORY,
        "conversations": {cid: [{"turn": t["turn"], "role": t["role"], "text": t["text"]} for t in turns] for cid, turns in conversations.items()},
        "walk": worked_walk, "examples": examples, "skipped": skipped,
        "practice": {"system": SYSTEM, "min_target_words": MIN_TARGET_WORDS, "walk": practice_walk,
                     "examples": practice_examples, "skipped": practice_skipped},
        "shipped": {"examples": [{"conversation": e["conversation"], "turn": e["turn"], "context_size": len(e["context"])} for e in shipped],
                    "max_context": max(len(e["context"]) for e in shipped)},
    }


class AnimationFixtures(unittest.TestCase):
    """turns.json and expected-trace.json are pinned to the lesson files."""

    def test_turns_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "turns.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"rows": ROWS, "max_history": MAX_HISTORY, "system": SYSTEM, "min_target_words": MIN_TARGET_WORDS})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([(w["turn"], w["decision"], w["context_size"], w["dropped"]) for w in trace["walk"]],
                         [(2, "example", 1, 0), (4, "skipped-empty", 0, 0), (6, "example", 4, 1), (2, "example", 1, 0)])
        self.assertEqual([w["decision"] for w in trace["practice"]["walk"]], ["example", "skipped-empty", "example", "skipped-short"])
        self.assertEqual(trace["shipped"]["max_context"], 5)


class LastTurnOnlyOnTheSameRows(unittest.TestCase):
    """The evaluation that separates the repair from what shipped."""

    def test_shipped_builder_makes_one_example_per_conversation_and_overruns_the_window(self):
        shipped = last_turn_examples(ROWS)
        self.assertEqual([(e["conversation"], e["turn"], len(e["context"])) for e in shipped], [("c1", 6, 5), ("c2", 2, 1)])
        self.assertGreater(max(len(e["context"]) for e in shipped), MAX_HISTORY, "five turns of context, over the window")
        self.assertNotIn(("c1", 2), [(e["conversation"], e["turn"]) for e in shipped], "the middle answer is never a target")

    def test_per_turn_builder_keeps_every_answer_inside_the_window(self):
        examples, _ = build_examples(ROWS, max_history=MAX_HISTORY)
        self.assertEqual(len(examples), 3)
        self.assertEqual(max(len(e["context"]) for e in examples), MAX_HISTORY)
        self.assertIn(("c1", 2), [(e["conversation"], e["turn"]) for e in examples])


if __name__ == "__main__":
    unittest.main()
