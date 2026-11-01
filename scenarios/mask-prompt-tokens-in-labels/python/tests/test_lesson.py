"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
examples are fixed strings, the stand-in tokenizer is deterministic, and the
label arithmetic is checked position by position against an independent
reconstruction."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from label_masking import practice_answer
from label_masking.solution import EOS, EXAMPLES, IGNORE, PAD, build_labels, encode, pad_batch

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "label_masking"
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


def build_rows():
    vocab = {}
    rows = [build_labels(example, vocab) for example in EXAMPLES]
    return vocab, rows


def count_trained(batch):
    return sum(1 for ids, labels, mask in batch for label in labels if label != IGNORE)


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_vocabulary_assigns_ids_in_order_of_first_appearance(self):
        vocab, rows = build_rows()
        self.assertEqual(len(vocab), 22)
        self.assertEqual((vocab["how"], vocab["do"], vocab["i"], vocab["reset"], vocab["my"], vocab["password"]), (2, 3, 4, 5, 6, 7))
        self.assertEqual(vocab["to"], 23, "the last new word gets the last id")
        self.assertNotIn(PAD, vocab.values())
        self.assertNotIn(EOS, vocab.values())
        self.assertEqual(encode("my password my", dict(vocab)), [6, 7, 6], "a repeated word keeps its id")

    def test_labels_ignore_exactly_the_prompt_and_train_the_completion_and_eos(self):
        vocab, rows = build_rows()
        for example, (ids, labels) in zip(EXAMPLES, rows):
            prompt_length = len(example["prompt"].split())
            completion_length = len(example["completion"].split())
            self.assertEqual(len(ids), len(labels))
            self.assertEqual(len(ids), prompt_length + completion_length + 1)
            self.assertEqual(labels[:prompt_length], [IGNORE] * prompt_length)
            self.assertEqual(labels[prompt_length:], ids[prompt_length:], "trained positions carry their own id")
            self.assertEqual(ids[-1], EOS)
            self.assertEqual(labels[-1], EOS, "the model is trained to stop")
            self.assertNotIn(IGNORE, ids)
        self.assertEqual(rows[0][0], [2, 3, 4, 5, 6, 7, 8, 9, 10, 7, 11, 1])
        self.assertEqual(rows[0][1], [IGNORE] * 6 + [8, 9, 10, 7, 11, 1])
        self.assertEqual(rows[0][0][5], rows[0][0][9], "password has one id in the prompt and in the completion")

    def test_padding_aligns_ids_labels_and_mask(self):
        vocab, rows = build_rows()
        batch = pad_batch(rows)
        self.assertEqual([len(ids) for ids, labels, mask in batch], [12, 12, 12])
        for (ids, labels, mask), (raw_ids, raw_labels) in zip(batch, rows):
            self.assertEqual(len(ids), len(labels))
            self.assertEqual(len(ids), len(mask))
            self.assertEqual(ids[:len(raw_ids)], raw_ids)
            self.assertEqual(ids[len(raw_ids):], [PAD] * (12 - len(raw_ids)))
            self.assertEqual(labels[len(raw_ids):], [IGNORE] * (12 - len(raw_ids)))
            self.assertEqual(mask, [1] * len(raw_ids) + [0] * (12 - len(raw_ids)))
            for position in range(12):
                if mask[position] == 0:
                    self.assertEqual(labels[position], IGNORE, "a pad never trains")
        self.assertEqual(count_trained(batch), 20)
        self.assertEqual(sum(sum(mask) for ids, labels, mask in batch), 33)

    def test_an_empty_completion_is_rejected_and_inputs_are_unchanged(self):
        with self.assertRaises(ValueError) as caught:
            build_labels({"prompt": "thanks", "completion": ""}, {})
        self.assertIn("empty completion", str(caught.exception))
        self.assertEqual(pad_batch([]), [])
        vocab, rows = build_rows()
        copy = [dict(example) for example in EXAMPLES]
        pad_batch(rows)
        self.assertEqual(EXAMPLES, copy)
        self.assertEqual(rows[1][0], [12, 13, 6, 14, 15, 16, 17, 18, 19, 1], "padding builds new lists")

    def test_a_single_row_batch_needs_no_padding(self):
        vocab = {}
        ids, labels = build_labels(EXAMPLES[2], vocab)
        batch = pad_batch([(ids, labels)])
        self.assertEqual(batch, [(ids, labels, [1] * len(ids))])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected every row to fit 10 positions"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_drops_prompt_tokens_from_the_left_and_keeps_every_completion(self):
        vocab, rows = build_rows()
        fitted = [practice_answer.fit(ids, labels, practice_answer.MAX_LEN) for ids, labels in rows]
        self.assertEqual([len(ids) for ids, labels in fitted], [10, 10, 10])
        self.assertEqual(fitted[0][0], rows[0][0][2:])
        self.assertEqual(fitted[0][1], rows[0][1][2:])
        self.assertEqual(fitted[1], rows[1], "a row that fits is returned unchanged")
        self.assertEqual(fitted[2][0], rows[2][0][1:])
        for (ids, labels), (raw_ids, raw_labels) in zip(fitted, rows):
            trained_before = [label for label in raw_labels if label != IGNORE]
            trained_after = [label for label in labels if label != IGNORE]
            self.assertEqual(trained_after, trained_before, "no trained position is lost")
            self.assertEqual(ids[-1], EOS)
        self.assertEqual(count_trained(practice_answer.pad_batch(fitted)), 20)

    def test_answer_rejects_a_completion_that_cannot_fit(self):
        vocab = {}
        ids, labels = build_labels({"prompt": "help", "completion": "one two three four five six seven eight nine ten eleven"}, vocab)
        with self.assertRaises(ValueError) as caught:
            practice_answer.fit(ids, labels, 10)
        self.assertIn("does not fit", str(caught.exception))
        exact_ids, exact_labels = build_labels({"prompt": "a b c", "completion": "one two three four five six seven eight nine"}, {})
        kept_ids, kept_labels = practice_answer.fit(exact_ids, exact_labels, 10)
        self.assertEqual(len(kept_ids), 10)
        self.assertEqual(kept_labels.count(IGNORE), 0, "exactly the completion and eos fit, no prompt left")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "EXAMPLES = [", "# --- answer begins ---"), segment(starter, "EXAMPLES = [", "def fit"))
        self.assertEqual(segment(answer, "def pad_batch"), segment(starter, "def pad_batch"))


def derive_trace():
    """Every id, label, and mask of the real functions, the counts, what
    training on every token would have counted, and the practice truncation.
    The animation's JavaScript port must reproduce this exactly."""
    vocab, rows = build_rows()
    batch = pad_batch(rows)
    id_to_word = {value: key for key, value in vocab.items()}
    id_to_word[EOS] = "<eos>"
    id_to_word[PAD] = "<pad>"
    examples = []
    for example, (ids, labels) in zip(EXAMPLES, rows):
        examples.append({"prompt": example["prompt"], "completion": example["completion"],
                         "prompt_tokens": len(example["prompt"].split()), "completion_tokens": len(example["completion"].split()),
                         "ids": ids, "labels": labels, "words": [id_to_word[i] for i in ids]})
    fitted = [practice_answer.fit(ids, labels, practice_answer.MAX_LEN) for ids, labels in rows]
    practice_batch = practice_answer.pad_batch(fitted)
    return {
        "pad": PAD, "eos": EOS, "ignore": IGNORE,
        "vocabulary": len(vocab),
        "examples": examples,
        "longest": len(batch[0][0]),
        "batch": [{"ids": ids, "labels": labels, "mask": mask} for ids, labels, mask in batch],
        "trained": count_trained(batch),
        "real": sum(sum(mask) for ids, labels, mask in batch),
        "shipped": {"trained": sum(sum(mask) for ids, labels, mask in batch), "prompt_tokens": sum(len(e["prompt"].split()) for e in EXAMPLES)},
        "practice": {"max_len": practice_answer.MAX_LEN,
                     "rows": [{"ids": ids, "labels": labels, "dropped": len(raw[0]) - len(ids)} for (ids, labels), raw in zip(fitted, rows)],
                     "longest": len(practice_batch[0][0]), "trained": count_trained(practice_batch),
                     "real": sum(sum(mask) for ids, labels, mask in practice_batch)},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on examples.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_examples_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "examples.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["examples"], EXAMPLES)
        self.assertEqual(practice_answer.EXAMPLES, EXAMPLES)
        self.assertEqual((fixture["pad"], fixture["eos"], fixture["ignore"], fixture["max_len"]), (PAD, EOS, IGNORE, practice_answer.MAX_LEN))

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual((trace["trained"], trace["real"], trace["longest"]), (20, 33, 12))
        self.assertEqual(trace["examples"][0]["words"], ["how", "do", "i", "reset", "my", "password", "use", "the", "forgot", "password", "link", "<eos>"])
        self.assertEqual(trace["shipped"]["trained"], 33)
        self.assertEqual([row["dropped"] for row in trace["practice"]["rows"]], [2, 0, 1])
        self.assertEqual((trace["practice"]["trained"], trace["practice"]["real"]), (20, 30))


class WhatShippedOnTheSameExamples(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the three examples."""

    def test_training_on_every_token_trains_the_thirteen_prompt_tokens_too(self):
        vocab, rows = build_rows()
        shipped_batch = pad_batch([(ids, list(ids)) for ids, labels in rows])
        self.assertEqual(count_trained(shipped_batch), 33, "labels equal to ids train every real token")
        self.assertEqual(count_trained(pad_batch(rows)), 20)
        self.assertEqual(33 - 20, sum(len(example["prompt"].split()) for example in EXAMPLES))

    def test_the_prompt_words_never_appear_as_labels(self):
        vocab, rows = build_rows()
        prompt_only = set()
        for example in EXAMPLES:
            for word in example["prompt"].split():
                prompt_only.add(vocab[word])
        for example in EXAMPLES:
            for word in example["completion"].split():
                prompt_only.discard(vocab[word])
        for ids, labels in rows:
            for label in labels:
                self.assertNotIn(label, prompt_only, "a word that only occurs in prompts is never a training target")

    def test_pads_never_train_however_long_the_batch(self):
        vocab, rows = build_rows()
        rows.append(build_labels({"prompt": "hi", "completion": "hello there friend how are you today then"}, vocab))
        batch = pad_batch(rows)
        self.assertEqual(len(batch[0][0]), 12)
        for ids, labels, mask in batch:
            self.assertEqual(sum(1 for label, m in zip(labels, mask) if m == 0 and label != IGNORE), 0)


if __name__ == "__main__":
    unittest.main()
