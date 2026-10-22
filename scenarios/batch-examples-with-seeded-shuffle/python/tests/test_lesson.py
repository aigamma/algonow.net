"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the generator directly. Expectations are exact: the
seed fixes every order, so each batch is pinned id by id."""
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from batching import practice_answer
from batching.solution import BATCH_SIZE, EPOCHS, EXAMPLES, SEED, batches, describe, ids_of, label_mix

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "batching"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
ALL_IDS = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10"]
EPOCH_ONE = [["e9", "e4", "e2", "e5"], ["e8", "e1", "e10", "e7"], ["e3", "e6"]]
EPOCH_TWO = [["e9", "e3", "e10", "e5"], ["e1", "e8", "e2", "e7"], ["e6", "e4"]]


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


def id_batches(generator):
    return [ids_of(batch) for batch in generator]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_the_seeded_batches_are_pinned_id_by_id(self):
        self.assertEqual(id_batches(batches(EXAMPLES, BATCH_SIZE, SEED)), EPOCH_ONE)
        self.assertEqual(id_batches(batches(EXAMPLES, BATCH_SIZE, SEED + 1)), EPOCH_TWO)

    def test_the_same_seed_reproduces_the_same_batches(self):
        self.assertEqual(list(batches(EXAMPLES, BATCH_SIZE, SEED)), list(batches(EXAMPLES, BATCH_SIZE, SEED)))
        self.assertNotEqual(id_batches(batches(EXAMPLES, BATCH_SIZE, SEED)), id_batches(batches(EXAMPLES, BATCH_SIZE, SEED + 1)))

    def test_every_example_appears_exactly_once_per_epoch_and_the_input_is_untouched(self):
        before = ids_of(EXAMPLES)
        for epoch in range(EPOCHS):
            seen = []
            for batch in batches(EXAMPLES, BATCH_SIZE, SEED + epoch):
                seen.extend(ids_of(batch))
            self.assertEqual(sorted(seen, key=ALL_IDS.index), ALL_IDS)
        self.assertEqual(ids_of(EXAMPLES), before, "the caller's list is never reordered")
        self.assertEqual(before, ALL_IDS)

    def test_batch_sizes_are_full_except_the_ragged_last_one(self):
        self.assertEqual([len(batch) for batch in batches(EXAMPLES, BATCH_SIZE, SEED)], [4, 4, 2])
        self.assertEqual([len(batch) for batch in batches(EXAMPLES, 5, SEED)], [5, 5], "an even split has no ragged batch")
        self.assertEqual([len(batch) for batch in batches(EXAMPLES, 12, SEED)], [10], "a batch size past the count gives one batch")
        self.assertEqual(list(batches([], BATCH_SIZE, SEED)), [], "no examples, no batches")

    def test_the_generator_is_lazy_and_rejects_a_bad_batch_size_on_first_use(self):
        generator = batches(EXAMPLES, 0, SEED)
        with self.assertRaises(ValueError) as caught:
            next(generator)
        self.assertIn("at least 1", str(caught.exception))
        self.assertEqual(type(batches(EXAMPLES, BATCH_SIZE, SEED)).__name__, "generator")

    def test_the_shuffle_is_the_standard_library_order_for_the_seed(self):
        order = list(EXAMPLES)
        random.Random(SEED).shuffle(order)
        self.assertEqual(ids_of(order), [example_id for batch in EPOCH_ONE for example_id in batch])

    def test_label_mix_counts_in_order_of_first_appearance(self):
        first = list(batches(EXAMPLES, BATCH_SIZE, SEED))[0]
        self.assertEqual(label_mix(first), {"access": 1, "billing": 3})
        self.assertEqual(describe(label_mix(first)), "access 1, billing 3")
        self.assertEqual(describe(label_mix([])), "")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected each epoch to yield 8 examples"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_drops_only_the_ragged_last_batch(self):
        kept = id_batches(practice_answer.batches(EXAMPLES, BATCH_SIZE, SEED, drop_last=True))
        self.assertEqual(kept, EPOCH_ONE[:2])
        kept_two = id_batches(practice_answer.batches(EXAMPLES, BATCH_SIZE, SEED + 1, drop_last=True))
        self.assertEqual(kept_two, EPOCH_TWO[:2])
        self.assertEqual([example_id for example_id in ALL_IDS if example_id not in sum(kept, [])], ["e3", "e6"])
        self.assertEqual([example_id for example_id in ALL_IDS if example_id not in sum(kept_two, [])], ["e4", "e6"])

    def test_answer_with_drop_last_false_reproduces_the_worked_run(self):
        self.assertEqual(list(practice_answer.batches(EXAMPLES, BATCH_SIZE, SEED, drop_last=False)),
                         list(batches(EXAMPLES, BATCH_SIZE, SEED)))
        self.assertEqual(list(practice_answer.batches(EXAMPLES, BATCH_SIZE, SEED)), list(batches(EXAMPLES, BATCH_SIZE, SEED)),
                         "drop_last defaults to False")

    def test_answer_keeps_everything_when_the_count_divides_evenly(self):
        self.assertEqual([len(batch) for batch in practice_answer.batches(EXAMPLES, 5, SEED, drop_last=True)], [5, 5])
        self.assertEqual(list(practice_answer.batches(EXAMPLES, 12, SEED, drop_last=True)), [],
                         "a batch size past the count leaves one short batch, which is dropped")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "EXAMPLES = [", "# --- answer begins ---"),
                         segment(starter, "EXAMPLES = [", "def batches"))
        self.assertEqual(segment(answer, "def ids_of"), segment(starter, "def ids_of"))


def derive_trace():
    """Every epoch's shuffled order and batches, the file order that shipped,
    and the practice run, all from the lesson's own functions. The animation's
    JavaScript takes the shuffled orders from this fixture (it does not port
    the standard library's shuffle) and must reproduce everything else exactly."""
    epochs = []
    mixed_full_batches = []
    for epoch in range(EPOCHS):
        seed = SEED + epoch
        batch_list = list(batches(EXAMPLES, BATCH_SIZE, seed))
        order = []
        for batch in batch_list:
            order.extend(ids_of(batch))
        mixed = sum(1 for batch in batch_list if len(batch) == BATCH_SIZE and len(label_mix(batch)) > 1)
        mixed_full_batches.append(mixed)
        epochs.append({"epoch": epoch + 1, "seed": seed, "order": order,
                       "batches": [{"ids": ids_of(batch), "mix": label_mix(batch)} for batch in batch_list]})
    file_order = [EXAMPLES[start:start + BATCH_SIZE] for start in range(0, len(EXAMPLES), BATCH_SIZE)]
    practice = []
    for epoch in range(EPOCHS):
        seed = SEED + epoch
        kept = list(practice_answer.batches(EXAMPLES, BATCH_SIZE, seed, drop_last=True))
        kept_ids = sum([ids_of(batch) for batch in kept], [])
        practice.append({"epoch": epoch + 1, "seed": seed, "batches": [ids_of(batch) for batch in kept],
                         "left_out": [example_id for example_id in ALL_IDS if example_id not in kept_ids]})
    return {
        "batch_size": BATCH_SIZE,
        "seed": SEED,
        "epochs": epochs,
        "mixed_full_batches": mixed_full_batches,
        "file_order": {
            "batches": [{"ids": ids_of(batch), "mix": label_mix(batch)} for batch in file_order],
            "single_label_batches": sum(1 for batch in file_order if len(label_mix(batch)) == 1),
        },
        "practice": practice,
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on examples.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_examples_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "examples.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"examples": EXAMPLES, "batch_size": BATCH_SIZE, "seed": SEED, "epochs": EPOCHS})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([batch["ids"] for batch in trace["epochs"][0]["batches"]], EPOCH_ONE)
        self.assertEqual([batch["ids"] for batch in trace["epochs"][1]["batches"]], EPOCH_TWO)
        self.assertEqual(trace["practice"][0]["left_out"], ["e3", "e6"])
        self.assertEqual(trace["practice"][1]["left_out"], ["e4", "e6"])


class FileOrderOnTheSameExamples(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the ten examples."""

    def test_file_order_feeds_single_label_batches(self):
        file_order = [EXAMPLES[start:start + BATCH_SIZE] for start in range(0, len(EXAMPLES), BATCH_SIZE)]
        mixes = [label_mix(batch) for batch in file_order]
        self.assertEqual(mixes, [{"billing": 4}, {"billing": 1, "access": 3}, {"access": 2}])
        self.assertEqual(sum(1 for mix in mixes if len(mix) == 1), 2, "two of the three batches hold a single label")

    def test_the_seeded_shuffle_mixes_every_full_batch(self):
        for epoch in range(EPOCHS):
            full = [batch for batch in batches(EXAMPLES, BATCH_SIZE, SEED + epoch) if len(batch) == BATCH_SIZE]
            self.assertEqual(len(full), 2)
            for batch in full:
                self.assertEqual(len(label_mix(batch)), 2, f"epoch {epoch + 1}: {ids_of(batch)}")


if __name__ == "__main__":
    unittest.main()
