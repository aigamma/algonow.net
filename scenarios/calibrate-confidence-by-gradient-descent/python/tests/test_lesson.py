"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; where a float is compared, the
test states the exact value the same arithmetic produces or a tight bound."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from calibration_fit import practice_answer
from calibration_fit.solution import (EPOCHS, LABELS, LEARNING_RATE, SCORES, START_A, START_B, fit, forward,
                                      log_loss, loss_and_gradients, sigmoid)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "calibration_fit"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
TOLERANCE = practice_answer.TOLERANCE
THRESHOLD = 0.6            # the assistant escalates below this
CALIBRATED_SCORES = [0.9, 0.7, 0.5]
PRINTED = [1, 50, 100, 150, 200]


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


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_sigmoid_is_half_at_zero_and_monotonic(self):
        self.assertEqual(sigmoid(0), 0.5)
        values = [sigmoid(x) for x in [-6, -2, -0.5, 0, 0.5, 2, 6]]
        self.assertEqual(values, sorted(values))
        self.assertGreater(values[0], 0)
        self.assertLess(values[-1], 1)
        self.assertEqual(forward(0.9, 1.0, 0.0), sigmoid(0.9), "with a of 1 and b of 0 the raw score passes through")

    def test_gradients_at_the_starting_point_are_the_hand_computed_values(self):
        # one example: score 0.9, label 1, a = 1, b = 0: p = sigmoid(0.9); da = (p - 1) * 0.9; db = p - 1
        p = 1 / (1 + math.exp(-0.9))
        loss, grad_a, grad_b = loss_and_gradients([0.9], [1], 1.0, 0.0)
        self.assertEqual(loss, -math.log(p))
        self.assertEqual(grad_a, (p - 1) * 0.9)
        self.assertEqual(grad_b, p - 1)
        # the mean over the eight answers at the start, which the first printed epoch shows
        loss, grad_a, grad_b = loss_and_gradients(SCORES, LABELS, START_A, START_B)
        self.assertEqual(round(loss, 4), 0.6941)
        self.assertEqual((round(grad_a, 4), round(grad_b, 4)), (0.0612, 0.1637))

    def test_log_loss_rewards_agreement(self):
        self.assertLess(log_loss(0.9, 1), log_loss(0.6, 1))
        self.assertLess(log_loss(0.1, 0), log_loss(0.4, 0))
        self.assertEqual(log_loss(0.5, 1), log_loss(0.5, 0))

    def test_a_zero_learning_rate_changes_nothing(self):
        a, b, history = fit(SCORES, LABELS, learning_rate=0.0, epochs=5)
        self.assertEqual((a, b), (START_A, START_B))
        self.assertEqual(len(history), 5)
        self.assertEqual({record[3] for record in history}, {history[0][3]}, "the loss repeats when nothing moves")

    def test_the_loss_falls_at_every_printed_epoch_and_the_fit_lands_where_the_page_says(self):
        a, b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
        self.assertEqual(len(history), EPOCHS)
        printed = [record for record in history if record[0] in PRINTED]
        losses = [record[3] for record in printed]
        self.assertEqual(losses, sorted(losses, reverse=True))
        self.assertEqual([round(loss, 4) for loss in losses], [0.6941, 0.6129, 0.5856, 0.5668, 0.5535])
        self.assertEqual((round(a, 4), round(b, 4)), (3.232, -2.183))
        for earlier, later in zip(history, history[1:]):
            self.assertLess(later[3], earlier[3], "the loss falls at every epoch at this learning rate")

    def test_calibrated_nine_tenths_matches_the_observed_rate_of_the_top_answers(self):
        a, b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
        top = [label for score, label in zip(SCORES, LABELS) if score >= 0.85]
        observed = sum(top) / len(top)
        self.assertEqual(round(observed, 4), 0.6667, "two of the three answers scored 0.85 or higher were right")
        self.assertEqual(round(forward(0.9, a, b), 3), 0.674)
        self.assertLess(abs(forward(0.9, a, b) - observed), 0.02)
        self.assertEqual([round(forward(score, a, b), 3) for score in CALIBRATED_SCORES], [0.674, 0.52, 0.362])

    def test_mismatched_lengths_and_bad_labels_are_rejected(self):
        with self.assertRaises(ValueError):
            fit(SCORES, LABELS[:7])
        with self.assertRaises(ValueError) as caught:
            loss_and_gradients([0.5], [2], 1.0, 0.0)
        self.assertIn("not 0 or 1", str(caught.exception))

    def test_input_lists_are_not_modified(self):
        scores, labels = list(SCORES), list(LABELS)
        fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
        self.assertEqual((SCORES, LABELS), (scores, labels))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the loop to stop before 200 epochs"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_stops_at_the_documented_epoch(self):
        a, b, history = practice_answer.fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS, tolerance=TOLERANCE)
        self.assertEqual(len(history), 87)
        self.assertEqual(history[-1][0], 87)
        improvement = history[-2][3] - history[-1][3]
        self.assertLess(improvement, TOLERANCE)
        self.assertGreaterEqual(history[-3][3] - history[-2][3], TOLERANCE, "the epoch before still improved enough")
        self.assertEqual((round(a, 4), round(b, 4), round(history[-1][3], 4)), (2.035, -1.3266, 0.5917))
        self.assertEqual((a, b), (history[-1][1], history[-1][2]), "the fitted values are the ones that produced the last loss")

    def test_answer_with_tolerance_zero_reproduces_the_worked_run(self):
        self.assertEqual(practice_answer.fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS, tolerance=0.0),
                         fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS))

    def test_answer_never_stops_before_the_second_epoch(self):
        a, b, history = practice_answer.fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS, tolerance=10.0)
        self.assertEqual(len(history), 2, "a comparison needs two losses, so the second epoch is the earliest stop")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "SCORES = [", "# --- answer begins ---"),
                         segment(starter, "SCORES = [", "def fit"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every epoch of the real fit, the fitted values, the calibrated table, the
    escalation counts, and the early stop, all from the lesson's own functions.
    The animation's JavaScript port must reproduce this exactly (six decimals)."""
    records = []
    a, b = START_A, START_B
    for epoch in range(1, EPOCHS + 1):
        loss, grad_a, grad_b = loss_and_gradients(SCORES, LABELS, a, b)
        records.append({"epoch": epoch, "a": round(a, 6), "b": round(b, 6), "loss": round(loss, 6),
                        "grad_a": round(grad_a, 6), "grad_b": round(grad_b, 6)})
        a -= LEARNING_RATE * grad_a
        b -= LEARNING_RATE * grad_b
    fitted_a, fitted_b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
    assert (fitted_a, fitted_b) == (a, b), "the replay and the real fit agree"
    final_loss, _, _ = loss_and_gradients(SCORES, LABELS, fitted_a, fitted_b)
    stop_a, stop_b, stop_history = practice_answer.fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS, tolerance=TOLERANCE)
    return {
        "learning_rate": LEARNING_RATE,
        "epochs": EPOCHS,
        "records": records,
        "fitted": {"a": round(fitted_a, 6), "b": round(fitted_b, 6), "loss": round(final_loss, 6)},
        "printed": PRINTED,
        "calibrated": [{"score": score, "probability": round(forward(score, fitted_a, fitted_b), 6)} for score in CALIBRATED_SCORES],
        "escalation": {"threshold": THRESHOLD,
                       "raw": sum(1 for score in SCORES if score < THRESHOLD),
                       "calibrated": sum(1 for score in SCORES if forward(score, fitted_a, fitted_b) < THRESHOLD),
                       "probabilities": [round(forward(score, fitted_a, fitted_b), 6) for score in SCORES]},
        "early_stop": {"tolerance": TOLERANCE, "stopped_at": stop_history[-1][0], "a": round(stop_a, 6), "b": round(stop_b, 6),
                       "loss": round(stop_history[-1][3], 6),
                       "improvement": round(stop_history[-2][3] - stop_history[-1][3], 6)},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on answers.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_answers_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "answers.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"scores": SCORES, "labels": LABELS, "start": {"a": START_A, "b": START_B},
                                   "learning_rate": LEARNING_RATE, "epochs": EPOCHS, "tolerance": TOLERANCE,
                                   "threshold": THRESHOLD, "calibrated_scores": CALIBRATED_SCORES, "printed": PRINTED})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(len(trace["records"]), EPOCHS)
        self.assertEqual(trace["records"][0], {"epoch": 1, "a": 1.0, "b": 0.0, "loss": 0.69414, "grad_a": 0.061164, "grad_b": 0.163698})
        self.assertEqual(trace["fitted"], {"a": 3.231959, "b": -2.182988, "loss": 0.553287})
        self.assertEqual(trace["early_stop"]["stopped_at"], 87)
        self.assertEqual(trace["escalation"]["raw"], 2)
        self.assertEqual(trace["escalation"]["calibrated"], 5)


class RawScoresOnTheSameAnswers(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the eight answers."""

    def test_raw_scores_overstate_and_the_threshold_escalated_too_little(self):
        top = [(score, label) for score, label in zip(SCORES, LABELS) if score >= 0.85]
        self.assertEqual([score for score, label in top], [0.95, 0.9, 0.85])
        self.assertEqual(sum(label for score, label in top), 2, "a raw 0.9 promised 90 percent; the top answers delivered 67")
        self.assertEqual(sum(1 for score in SCORES if score < THRESHOLD), 2, "raw scores escalate only the two lowest answers")

    def test_calibrated_probabilities_escalate_more_answers(self):
        a, b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
        calibrated = [forward(score, a, b) for score in SCORES]
        self.assertEqual(sum(1 for p in calibrated if p < THRESHOLD), 5, "five of eight fall below 0.6 once calibrated")
        self.assertEqual([round(p, 3) for p in calibrated], [0.708, 0.674, 0.637, 0.599, 0.52, 0.439, 0.291, 0.229])
        self.assertTrue(all(p < score for p, score in zip(calibrated, SCORES) if score >= 0.6),
                        "every confident raw score is pulled down")


if __name__ == "__main__":
    unittest.main()
