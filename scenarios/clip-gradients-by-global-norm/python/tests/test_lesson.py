"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
inputs are fixed numbers and nothing is random; where a float is compared, the
test states the value the same arithmetic produces or a tight bound."""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from grad_clip import practice_answer
from grad_clip.solution import (GRADS, LEARNING_RATE, MAX_NORM, PARAMS, SMALL_GRADS, apply_update,
                                clip_by_global_norm, distance, global_norm)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "grad_clip"
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


def copy(grads):
    return [list(group) for group in grads]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_global_norm_is_the_square_root_of_the_sum_of_squares(self):
        self.assertEqual(global_norm([[3.0, 4.0]]), 5.0)
        self.assertEqual(global_norm(GRADS), math.sqrt(170.0))
        self.assertEqual(round(global_norm(GRADS), 4), 13.0384)
        self.assertEqual(global_norm([[], []]), 0.0)

    def test_clipping_scales_every_value_by_one_factor_onto_the_max(self):
        clipped, norm, scale = clip_by_global_norm(GRADS, MAX_NORM)
        self.assertEqual(norm, math.sqrt(170.0))
        self.assertEqual(scale, MAX_NORM / (norm + 1e-6))
        self.assertEqual(round(scale, 4), 0.3835)
        for group, new_group in zip(GRADS, clipped):
            self.assertEqual(new_group, [value * scale for value in group])
        self.assertLess(abs(global_norm(clipped) - MAX_NORM), 1e-5, "the result is max_norm long")
        self.assertEqual([[round(v, 4) for v in g] for g in clipped], [[1.1504, 1.5339], [0.0, 4.6018], [0.3835]])

    def test_the_direction_is_unchanged(self):
        clipped, norm, scale = clip_by_global_norm(GRADS, MAX_NORM)
        self.assertLess(abs(clipped[1][1] / clipped[0][0] - 12.0 / 3.0), 1e-9)
        self.assertLess(abs(clipped[0][1] / clipped[0][0] - 4.0 / 3.0), 1e-9)
        self.assertEqual(clipped[1][0], 0.0, "a zero gradient stays zero")

    def test_a_small_batch_passes_through_unchanged(self):
        clipped, norm, scale = clip_by_global_norm(SMALL_GRADS, MAX_NORM)
        self.assertEqual(scale, 1.0)
        self.assertEqual(round(norm, 4), 1.3038)
        self.assertEqual(clipped, SMALL_GRADS)
        self.assertIsNot(clipped, SMALL_GRADS, "a new list, not the input")

    def test_all_zero_gradients_do_not_divide_by_zero(self):
        clipped, norm, scale = clip_by_global_norm([[0.0, 0.0], [0.0]], MAX_NORM)
        self.assertEqual((norm, scale), (0.0, 1.0))
        self.assertEqual(clipped, [[0.0, 0.0], [0.0]])

    def test_the_update_moves_against_the_gradient_and_leaves_the_inputs_alone(self):
        before_params, before_grads = copy(PARAMS), copy(GRADS)
        updated = apply_update(PARAMS, SMALL_GRADS, LEARNING_RATE)
        self.assertEqual([[round(v, 4) for v in g] for g in updated], [[0.47, -0.24], [1.0, 0.18], [0.09]])
        clip_by_global_norm(GRADS, MAX_NORM)
        self.assertEqual((PARAMS, GRADS), (before_params, before_grads))
        self.assertEqual(round(distance(PARAMS, updated), 4), 0.1304)

    def test_bad_max_norm_and_shape_mismatches_are_rejected(self):
        for bad in (0, -1.0):
            with self.assertRaises(ValueError):
                clip_by_global_norm(GRADS, bad)
        with self.assertRaises(ValueError) as caught:
            apply_update(PARAMS, [[3.0, 4.0], [12.0], [1.0]], LEARNING_RATE)
        self.assertEqual(str(caught.exception), "parameter group 2 has 2 values but 1 gradients")
        with self.assertRaises(ValueError):
            apply_update(PARAMS, GRADS[:2], LEARNING_RATE)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected group 2 clipped to 5.0"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_clips_each_group_on_its_own(self):
        clipped, norms, scales = practice_answer.clip_by_group_norm(GRADS, MAX_NORM)
        self.assertEqual(norms, [5.0, 12.0, 1.0])
        self.assertEqual([round(s, 4) for s in scales], [1.0, 0.4167, 1.0])
        self.assertEqual([[round(v, 4) for v in g] for g in clipped], [[3.0, 4.0], [0.0, 5.0], [1.0]])
        for group in clipped:
            self.assertLessEqual(global_norm([group]), MAX_NORM + 1e-9, "every group is bounded")
        self.assertEqual(round(global_norm(clipped), 4), 7.1414, "the whole is not")
        with self.assertRaises(ValueError):
            practice_answer.clip_by_group_norm(GRADS, 0)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "GRADS = [", "# --- answer begins ---"),
                         segment(starter, "GRADS = [", "def clip_by_group_norm"))
        self.assertEqual(segment(answer, "def apply_update"), segment(starter, "def apply_update"))


def derive_trace():
    """Both batches through the real functions, the parameter steps, and the
    per-group variation, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly (six decimals)."""
    r6 = lambda value: round(value, 6)
    batches = []
    for name, grads in (("bad", GRADS), ("ordinary", SMALL_GRADS)):
        clipped, norm, scale = clip_by_global_norm(grads, MAX_NORM)
        squares = [[r6(v * v) for v in g] for g in grads]
        batches.append({
            "name": name, "grads": grads, "squares": squares, "group_sums": [r6(sum(g)) for g in squares],
            "total": r6(sum(sum(g) for g in squares)), "norm": r6(norm), "scale": r6(scale),
            "clipped": [[r6(v) for v in g] for g in clipped], "norm_after": r6(global_norm(clipped)),
            "step_without": r6(distance(PARAMS, apply_update(PARAMS, grads, LEARNING_RATE))),
            "step_with": r6(distance(PARAMS, apply_update(PARAMS, clipped, LEARNING_RATE))),
        })
    by_group, norms, scales = practice_answer.clip_by_group_norm(GRADS, MAX_NORM)
    return {
        "max_norm": MAX_NORM, "learning_rate": LEARNING_RATE, "batches": batches,
        "per_group": {"norms": [r6(n) for n in norms], "scales": [r6(s) for s in scales],
                      "clipped": [[r6(v) for v in g] for g in by_group], "global_norm_after": r6(global_norm(by_group)),
                      "step": r6(distance(PARAMS, apply_update(PARAMS, by_group, LEARNING_RATE)))},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on gradients.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_gradients_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "gradients.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"grads": GRADS, "params": PARAMS, "small_grads": SMALL_GRADS,
                                   "max_norm": MAX_NORM, "learning_rate": LEARNING_RATE})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        bad, ordinary = trace["batches"]
        self.assertEqual((bad["total"], bad["norm"], bad["scale"], bad["norm_after"]), (170.0, 13.038405, 0.383482, 5.0))
        self.assertEqual((bad["step_without"], bad["step_with"]), (1.30384, 0.5))
        self.assertEqual((ordinary["scale"], ordinary["clipped"]), (1.0, SMALL_GRADS))
        self.assertEqual(trace["per_group"]["global_norm_after"], 7.141427)


class WhatShipped(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same batch."""

    def test_the_unclipped_step_is_ten_times_an_ordinary_step(self):
        bad_step = distance(PARAMS, apply_update(PARAMS, GRADS, LEARNING_RATE))
        ordinary_step = distance(PARAMS, apply_update(PARAMS, SMALL_GRADS, LEARNING_RATE))
        self.assertEqual(round(bad_step, 4), 1.3038)
        self.assertEqual(round(ordinary_step, 4), 0.1304)
        self.assertAlmostEqual(bad_step / ordinary_step, 10.0, places=9)

    def test_the_clipped_step_is_half_a_unit_in_the_same_direction(self):
        clipped, norm, scale = clip_by_global_norm(GRADS, MAX_NORM)
        unclipped = apply_update(PARAMS, GRADS, LEARNING_RATE)
        with_clipping = apply_update(PARAMS, clipped, LEARNING_RATE)
        self.assertLess(abs(distance(PARAMS, with_clipping) - 0.5), 1e-6)
        for before, after_raw, after_clipped in zip(PARAMS, unclipped, with_clipping):
            for p, raw, clip in zip(before, after_raw, after_clipped):
                if raw != p:
                    self.assertLess(abs((clip - p) / (raw - p) - scale), 1e-9, "the same direction, scaled")

    def test_per_group_clipping_bounds_the_groups_but_not_the_whole(self):
        by_group, norms, scales = practice_answer.clip_by_group_norm(GRADS, MAX_NORM)
        self.assertGreater(global_norm(by_group), MAX_NORM)
        step = distance(PARAMS, apply_update(PARAMS, by_group, LEARNING_RATE))
        self.assertEqual(round(step, 4), 0.7141)
        self.assertLess(0.5, step)


if __name__ == "__main__":
    unittest.main()
