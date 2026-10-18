"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise learning_rate directly at its edges, compare it with
the constant rate that shipped, and pin the animation fixtures to the real
function. Expectations are exact where the arithmetic is exact (the warmup
line, the peak, the landing at zero) and within 1e-12 where a cosine is
involved (the decay midpoint)."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from lr_schedule import practice_answer
from lr_schedule.solution import PEAK, TOTAL_STEPS, WARMUP_STEPS, learning_rate

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "lr_schedule"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
HOLD_STEPS = practice_answer.HOLD_STEPS


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


def schedule(total=TOTAL_STEPS, warmup=WARMUP_STEPS, peak=PEAK):
    return [learning_rate(step, total, warmup, peak) for step in range(0, total + 1)]


def hold_schedule(hold=HOLD_STEPS, total=TOTAL_STEPS, warmup=WARMUP_STEPS, peak=PEAK):
    return [practice_answer.learning_rate(step, total, warmup, hold, peak) for step in range(0, total + 1)]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_warmup_is_linear_and_reaches_the_peak_at_warmup_steps(self):
        self.assertEqual(learning_rate(0, TOTAL_STEPS, WARMUP_STEPS, PEAK), 0.0)
        self.assertAlmostEqual(learning_rate(5, TOTAL_STEPS, WARMUP_STEPS, PEAK), PEAK / 2, delta=1e-18)
        for step in range(1, WARMUP_STEPS):
            self.assertAlmostEqual(learning_rate(step, TOTAL_STEPS, WARMUP_STEPS, PEAK), PEAK * step / WARMUP_STEPS, delta=1e-18)
            self.assertLess(learning_rate(step, TOTAL_STEPS, WARMUP_STEPS, PEAK), PEAK)
        self.assertEqual(learning_rate(WARMUP_STEPS, TOTAL_STEPS, WARMUP_STEPS, PEAK), PEAK, "the peak arrives exactly when warmup ends")

    def test_decay_midpoint_is_half_the_peak(self):
        midpoint = WARMUP_STEPS + (TOTAL_STEPS - WARMUP_STEPS) // 2
        self.assertEqual(midpoint, 55)
        self.assertAlmostEqual(learning_rate(midpoint, TOTAL_STEPS, WARMUP_STEPS, PEAK), PEAK / 2, delta=1e-12)

    def test_last_step_lands_at_zero(self):
        self.assertEqual(learning_rate(TOTAL_STEPS, TOTAL_STEPS, WARMUP_STEPS, PEAK), 0.0, "cos(pi) is exactly -1.0")
        self.assertLess(learning_rate(TOTAL_STEPS - 1, TOTAL_STEPS, WARMUP_STEPS, PEAK), 1e-7, "the last update is tiny but not zero")

    def test_rates_stay_within_zero_and_the_peak(self):
        rates = schedule()
        self.assertEqual(len(rates), TOTAL_STEPS + 1)
        self.assertLessEqual(max(rates), PEAK)
        self.assertGreaterEqual(min(rates), 0.0)
        self.assertEqual(rates.index(max(rates)), WARMUP_STEPS)
        for earlier, later in zip(rates[WARMUP_STEPS:], rates[WARMUP_STEPS + 1:]):
            self.assertGreater(earlier, later, "the decay only falls")

    def test_short_and_long_warmups_behave(self):
        one = schedule(warmup=1)
        self.assertEqual(one[0], 0.0)
        self.assertEqual(one[1], PEAK)
        self.assertEqual(one[-1], 0.0)
        long = schedule(warmup=TOTAL_STEPS - 1)
        self.assertEqual(long[TOTAL_STEPS - 1], PEAK)
        self.assertEqual(long[TOTAL_STEPS], 0.0, "a one-step decay still lands at zero")

    def test_invalid_arguments_raise(self):
        with self.assertRaises(ValueError) as caught:
            learning_rate(0, TOTAL_STEPS, TOTAL_STEPS, PEAK)
        self.assertIn("leaves no steps for the decay", str(caught.exception))
        with self.assertRaises(ValueError):
            learning_rate(0, TOTAL_STEPS, TOTAL_STEPS + 5, PEAK)
        with self.assertRaises(ValueError):
            learning_rate(-1, TOTAL_STEPS, WARMUP_STEPS, PEAK)
        with self.assertRaises(ValueError) as beyond:
            learning_rate(TOTAL_STEPS + 1, TOTAL_STEPS, WARMUP_STEPS, PEAK)
        self.assertIn("outside 0 to 100", str(beyond.exception))


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the peak 2.00e-04 at step 25 with a hold of 20 steps, got 1.87e-04"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_hold_keeps_the_peak_for_exactly_the_hold_steps(self):
        rates = hold_schedule()
        held = [step for step, rate in enumerate(rates) if rate == PEAK]
        self.assertEqual(held, list(range(WARMUP_STEPS, WARMUP_STEPS + HOLD_STEPS + 1)), "steps 10 to 30 sit at the peak")
        self.assertLess(rates[WARMUP_STEPS + HOLD_STEPS + 1], PEAK)
        midpoint = WARMUP_STEPS + HOLD_STEPS + (TOTAL_STEPS - WARMUP_STEPS - HOLD_STEPS) // 2
        self.assertEqual(midpoint, 65)
        self.assertAlmostEqual(rates[midpoint], PEAK / 2, delta=1e-12)
        self.assertEqual(rates[-1], 0.0)
        with self.assertRaises(ValueError):
            practice_answer.learning_rate(0, TOTAL_STEPS, WARMUP_STEPS, TOTAL_STEPS - WARMUP_STEPS, PEAK)

    def test_hold_of_zero_matches_the_worked_solution(self):
        self.assertEqual(hold_schedule(hold=0), schedule())

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "TOTAL_STEPS = 100", "# --- answer begins ---"),
                         segment(starter, "TOTAL_STEPS = 100", "def learning_rate"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


class ConstantRateThatShipped(unittest.TestCase):
    """The evaluation that separates the repair from the bug: the same run under
    the constant rate that shipped and under the schedule."""

    def test_constant_rate_that_shipped_versus_the_schedule(self):
        rates = schedule()
        constant = [PEAK for step in range(0, TOTAL_STEPS + 1)]
        self.assertEqual(constant[1] / rates[1], 10.0, "step 1 gets one tenth of the full rate under the schedule")
        self.assertAlmostEqual(sum(rates), 50 * PEAK, delta=1e-15, msg="the warmup contributes 4.5 peaks and the decay 45.5")
        self.assertEqual(sum(constant), PEAK * (TOTAL_STEPS + 1))
        self.assertAlmostEqual(sum(constant) / sum(rates), 2.02, delta=1e-12)
        self.assertEqual(max(rates[:WARMUP_STEPS]), 0.9 * PEAK, "nothing above nine tenths of the peak before warmup ends")


def derive_trace():
    """The schedule for every step, the printed rows, the phases, and the hold
    variation, from the real functions. The animation's JavaScript port must
    reproduce this exactly; rates are rounded to twelve decimals on both sides."""
    total, warmup, hold, peak = TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK
    raw = [learning_rate(step, total, warmup, peak) for step in range(0, total + 1)]
    rates = [round(rate, 12) for rate in raw]
    printed = [{"step": step, "rate": rates[step]} for step in range(0, total + 1) if step % 10 == 0 or step == 5]
    hold_raw = [practice_answer.learning_rate(step, total, warmup, hold, peak) for step in range(0, total + 1)]
    hold_rates = [round(rate, 12) for rate in hold_raw]
    midpoint = warmup + (total - warmup) // 2
    hold_midpoint = warmup + hold + (total - warmup - hold) // 2
    return {
        "total_steps": total, "warmup_steps": warmup, "peak": peak,
        "rates": rates, "printed": printed,
        "phases": [{"name": "warmup", "from": 0, "to": warmup}, {"name": "decay", "from": warmup, "to": total}],
        "midpoint": {"step": midpoint, "rate": rates[midpoint]},
        "step_one": {"schedule": rates[1], "constant": peak},
        "sums": {"schedule": round(sum(raw), 12), "constant": round(peak * (total + 1), 12)},
        "hold": {"hold_steps": hold, "rates": hold_rates,
                 "phases": [{"name": "warmup", "from": 0, "to": warmup}, {"name": "hold", "from": warmup, "to": warmup + hold},
                            {"name": "decay", "from": warmup + hold, "to": total}],
                 "midpoint": {"step": hold_midpoint, "rate": hold_rates[hold_midpoint]}},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on schedule.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_schedule_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "schedule.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"total_steps": TOTAL_STEPS, "warmup_steps": WARMUP_STEPS, "hold_steps": HOLD_STEPS, "peak": PEAK})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(len(trace["rates"]), 101)
        self.assertEqual([row["step"] for row in trace["printed"]], [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        self.assertEqual(trace["midpoint"], {"step": 55, "rate": 0.0001})
        self.assertEqual(trace["hold"]["midpoint"], {"step": 65, "rate": 0.0001})
        self.assertEqual(trace["sums"], {"schedule": 0.01, "constant": 0.0202})


if __name__ == "__main__":
    unittest.main()
