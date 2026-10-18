"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact up to
floating-point rounding (assertAlmostEqual) because the inputs are fixed and
nothing is random."""
import copy
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from distillation_targets import practice_answer
from distillation_targets.solution import (
    CLASSES, LABELS, STUDENT_LOGITS, TEACHER_LOGITS, TEMPERATURE,
    cross_entropy, hard_loss, kl_divergence, one_hot, soft_loss, softmax)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "distillation_targets"
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


def naive_softmax(logits, temperature):
    """The textbook formula without the max trick, for comparison."""
    exponentials = [math.exp(value / temperature) for value in logits]
    total = sum(exponentials)
    return [value / total for value in exponentials]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_softmax_sums_to_one_and_matches_the_printed_values(self):
        printed = {1: [0.174, 0.039, 0.779, 0.009], 2: [0.934, 0.047, 0.017, 0.002], 3: [0.076, 0.558, 0.339, 0.028]}
        for number, teacher in enumerate(TEACHER_LOGITS, start=1):
            probabilities = softmax(teacher, 1.0)
            self.assertAlmostEqual(sum(probabilities), 1.0, places=12)
            for value, shown in zip(probabilities, printed[number], strict=True):
                self.assertAlmostEqual(value, shown, places=3)
        self.assertAlmostEqual(sum(softmax(TEACHER_LOGITS[2], TEMPERATURE)), 1.0, places=12)

    def test_softmax_is_unchanged_by_adding_a_constant_to_every_logit(self):
        base = softmax(TEACHER_LOGITS[0], 1.0)
        shifted = softmax([value + 7.5 for value in TEACHER_LOGITS[0]], 1.0)
        for a, b in zip(base, shifted, strict=True):
            self.assertAlmostEqual(a, b, places=12)

    def test_temperature_one_is_the_plain_softmax(self):
        for teacher in TEACHER_LOGITS:
            for a, b in zip(softmax(teacher, 1.0), naive_softmax(teacher, 1.0), strict=True):
                self.assertAlmostEqual(a, b, places=12)

    def test_higher_temperature_flattens_but_keeps_the_top_class(self):
        for teacher in TEACHER_LOGITS:
            sharp = softmax(teacher, 1.0)
            soft = softmax(teacher, TEMPERATURE)
            softer = softmax(teacher, 10.0)
            self.assertLess(max(soft), max(sharp))
            self.assertLess(max(softer), max(soft))
            self.assertEqual(soft.index(max(soft)), sharp.index(max(sharp)))
            self.assertEqual(softer.index(max(softer)), sharp.index(max(sharp)))

    def test_cross_entropy_of_a_one_hot_target_is_minus_log_of_that_probability(self):
        probabilities = softmax(STUDENT_LOGITS[0], 1.0)
        self.assertAlmostEqual(cross_entropy(one_hot("outage"), probabilities), -math.log(probabilities[2]), places=12)
        self.assertAlmostEqual(hard_loss(STUDENT_LOGITS[0], "outage"), -math.log(probabilities[2]), places=12)
        self.assertEqual(one_hot("access"), [0.0, 1.0, 0.0, 0.0])

    def test_soft_loss_is_zero_when_the_student_equals_the_teacher_and_positive_otherwise(self):
        for teacher, student in zip(TEACHER_LOGITS, STUDENT_LOGITS, strict=True):
            self.assertAlmostEqual(soft_loss(teacher, teacher, TEMPERATURE), 0.0, places=12)
            self.assertGreater(soft_loss(teacher, student, TEMPERATURE), 0.0)

    def test_soft_loss_scales_with_temperature_squared(self):
        teacher, student = TEACHER_LOGITS[0], STUDENT_LOGITS[0]
        divergence = kl_divergence(softmax(teacher, TEMPERATURE), softmax(student, TEMPERATURE))
        self.assertAlmostEqual(soft_loss(teacher, student, TEMPERATURE), divergence * TEMPERATURE ** 2, places=12)
        self.assertAlmostEqual(soft_loss(teacher, student, 1.0), kl_divergence(softmax(teacher, 1.0), softmax(student, 1.0)), places=12)

    def test_invalid_temperature_is_rejected(self):
        for temperature in (0, 0.0, -1.0):
            with self.assertRaises(ValueError) as caught:
                softmax(TEACHER_LOGITS[0], temperature)
            self.assertIn("temperature must be positive", str(caught.exception))

    def test_ragged_rows_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            soft_loss([1.0, 2.0, 3.0], STUDENT_LOGITS[0], TEMPERATURE)
        self.assertIn("expected 4 logits", str(caught.exception))
        with self.assertRaises(ValueError):
            soft_loss(TEACHER_LOGITS[0], [1.0, 2.0, 3.0, 4.0, 5.0], TEMPERATURE)
        with self.assertRaises(ValueError):
            hard_loss([1.0, 2.0, 3.0], "outage")

    def test_inputs_are_not_modified(self):
        before = copy.deepcopy((TEACHER_LOGITS, STUDENT_LOGITS, LABELS))
        for teacher, student, label in zip(TEACHER_LOGITS, STUDENT_LOGITS, LABELS, strict=True):
            softmax(teacher, TEMPERATURE)
            soft_loss(teacher, student, TEMPERATURE)
            hard_loss(student, label)
        self.assertEqual((TEACHER_LOGITS, STUDENT_LOGITS, LABELS), before)


class WhySoftTargets(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the lesson's own example 3."""

    def test_max_trick_matches_the_naive_formula_and_survives_large_logits(self):
        for teacher in TEACHER_LOGITS:
            for a, b in zip(softmax(teacher, TEMPERATURE), naive_softmax(teacher, TEMPERATURE), strict=True):
                self.assertAlmostEqual(a, b, places=12)
        huge = [1000.0, 999.0, 998.0, 997.0]
        with self.assertRaises(OverflowError):
            naive_softmax(huge, 1.0)
        probabilities = softmax(huge, 1.0)
        self.assertAlmostEqual(sum(probabilities), 1.0, places=12)
        self.assertTrue(all(math.isfinite(value) for value in probabilities))
        self.assertEqual(probabilities.index(max(probabilities)), 0)

    def test_the_hard_target_gives_the_near_miss_no_credit_but_the_soft_target_does(self):
        teacher = TEACHER_LOGITS[2]
        self.assertEqual(one_hot("access")[CLASSES.index("outage")], 0.0)
        self.assertAlmostEqual(softmax(teacher, TEMPERATURE)[CLASSES.index("outage")], 0.329, places=3)
        self.assertAlmostEqual(softmax(teacher, TEMPERATURE)[CLASSES.index("access")], 0.422, places=3)

    def test_soft_loss_tells_a_near_miss_from_a_far_miss_while_the_hard_loss_cannot(self):
        teacher = TEACHER_LOGITS[2]
        near = STUDENT_LOGITS[2]                 # weight on outage, the teacher's second choice
        far = [near[0], near[1], near[3], near[2]]   # the same weight moved to feature
        self.assertAlmostEqual(hard_loss(near, "access"), hard_loss(far, "access"), places=12,
                               msg="the hard loss sees only the gold probability, which is equal")
        self.assertLess(soft_loss(teacher, near, TEMPERATURE), soft_loss(teacher, far, TEMPERATURE),
                        "the soft loss rewards the student for agreeing with the teacher's ranking")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the mean blended loss 0.436 at alpha 0.7, got 0.336"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_blends_the_two_losses(self):
        expected_blend = [0.460, 0.474, 0.373]
        for teacher, student, label, shown in zip(TEACHER_LOGITS, STUDENT_LOGITS, LABELS, expected_blend, strict=True):
            soft = soft_loss(teacher, student, TEMPERATURE)
            hard = hard_loss(student, label)
            blended = practice_answer.distillation_loss(teacher, student, label, TEMPERATURE, 0.7)
            self.assertAlmostEqual(blended, 0.7 * soft + 0.3 * hard, places=12)
            self.assertAlmostEqual(blended, shown, places=3)
            self.assertAlmostEqual(practice_answer.distillation_loss(teacher, student, label, TEMPERATURE, 1.0), soft, places=12)
            self.assertAlmostEqual(practice_answer.distillation_loss(teacher, student, label, TEMPERATURE, 0.0), hard, places=12)

    def test_answer_keeps_the_worked_functions(self):
        for teacher, student, label in zip(TEACHER_LOGITS, STUDENT_LOGITS, LABELS, strict=True):
            self.assertEqual(practice_answer.softmax(teacher, TEMPERATURE), softmax(teacher, TEMPERATURE))
            self.assertEqual(practice_answer.soft_loss(teacher, student, TEMPERATURE), soft_loss(teacher, student, TEMPERATURE))
            self.assertEqual(practice_answer.hard_loss(student, label), hard_loss(student, label))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CLASSES = [", "# --- answer begins ---"),
                         segment(starter, "CLASSES = [", "def distillation_loss"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def r6(values):
    if isinstance(values, list):
        return [round(value, 6) for value in values]
    return round(values, 6)


def derive_trace():
    """Every number the animation shows, derived from the real functions and rounded
    to six decimals. The JavaScript port must reproduce this exactly."""
    examples = []
    for teacher, student, label in zip(TEACHER_LOGITS, STUDENT_LOGITS, LABELS, strict=True):
        examples.append({
            "label": label,
            "teacher_logits": teacher,
            "student_logits": student,
            "teacher_t1": r6(softmax(teacher, 1.0)),
            "teacher_t2": r6(softmax(teacher, TEMPERATURE)),
            "student_t2": r6(softmax(student, TEMPERATURE)),
            "soft_loss": r6(soft_loss(teacher, student, TEMPERATURE)),
            "hard_loss": r6(hard_loss(student, label)),
        })
    soft = [soft_loss(t, s, TEMPERATURE) for t, s in zip(TEACHER_LOGITS, STUDENT_LOGITS, strict=True)]
    hard = [hard_loss(s, label) for s, label in zip(STUDENT_LOGITS, LABELS, strict=True)]
    blend = [practice_answer.distillation_loss(t, s, label, TEMPERATURE, practice_answer.ALPHA)
             for t, s, label in zip(TEACHER_LOGITS, STUDENT_LOGITS, LABELS, strict=True)]
    return {
        "classes": CLASSES,
        "temperature": TEMPERATURE,
        "examples": examples,
        "means": {"soft": r6(sum(soft) / len(soft)), "hard": r6(sum(hard) / len(hard))},
        "blend": {"alpha": practice_answer.ALPHA, "per_example": r6(blend), "mean": r6(sum(blend) / len(blend))},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on logits.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_logits_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "logits.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"classes": CLASSES, "teacher_logits": TEACHER_LOGITS, "student_logits": STUDENT_LOGITS,
                                   "labels": LABELS, "temperature": TEMPERATURE, "alpha": practice_answer.ALPHA})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([example["label"] for example in trace["examples"]], LABELS)
        self.assertEqual(trace["means"], {"soft": 0.33619, "hard": 0.668689})
        self.assertEqual(trace["blend"]["per_example"], [0.460226, 0.474146, 0.373446])
        self.assertEqual(trace["blend"]["mean"], 0.435939)


if __name__ == "__main__":
    unittest.main()
