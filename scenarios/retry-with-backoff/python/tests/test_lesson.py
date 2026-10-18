"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise call_with_retry directly through scripted endpoints and
a recording sleep, so no test waits. Expectations are exact: the scripts are
fixed and the delays are exact binary fractions."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from retry_backoff import practice_answer
from retry_backoff.solution import (ANSWER, BASE_DELAY, EXHAUSTS, INVALID, MAX_ATTEMPTS, RECOVERS,
                                    call_with_retry, scripted_endpoint)

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "retry_backoff"
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


def counted(script):
    """A scripted endpoint that also records which outcome each call hit."""
    endpoint = scripted_endpoint(script)
    log = []

    def call():
        log.append(script[len(log)])
        return endpoint()

    return call, log


def recorder():
    waits = []

    def sleep(seconds):
        waits.append(seconds)

    return sleep, waits


class Quiet:
    """Swallow the attempt lines the function prints, so test output stays clean."""

    def __enter__(self):
        self.stdout = sys.stdout
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
        return self

    def __exit__(self, *exc):
        sys.stdout.close()
        sys.stdout = self.stdout
        return False


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_delays_double_from_the_base(self):
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError):
            call_with_retry(scripted_endpoint(EXHAUSTS), sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(waits, [0.5, 1.0, 2.0])
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError):
            call_with_retry(scripted_endpoint(["timeout"] * 5), sleep, 5, 0.25)
        self.assertEqual(waits, [0.25, 0.5, 1.0, 2.0], "each wait is the base times a power of two")

    def test_success_returns_the_answer_and_stops_calling(self):
        call, log = counted(["timeout", "ok", "ok", "ok"])
        sleep, waits = recorder()
        with Quiet():
            answer = call_with_retry(call, sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(answer, ANSWER)
        self.assertEqual(log, ["timeout", "ok"], "the remaining script entries are never touched")
        self.assertEqual(waits, [0.5])

    def test_both_retryable_errors_are_retried(self):
        call, log = counted(["rate limited", "timeout", "ok"])
        sleep, waits = recorder()
        with Quiet():
            answer = call_with_retry(call, sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(answer, ANSWER)
        self.assertEqual(log, ["rate limited", "timeout", "ok"])
        self.assertEqual(waits, [0.5, 1.0])

    def test_value_error_is_not_retried_or_swallowed(self):
        call, log = counted(["invalid request", "ok"])
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(ValueError) as caught:
            call_with_retry(call, sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(str(caught.exception), "prompt is empty")
        self.assertEqual(log, ["invalid request"], "exactly one call: the error is not in the except tuple")
        self.assertEqual(waits, [])

    def test_giving_up_names_the_attempts_and_the_last_error(self):
        call, log = counted(["timeout", "timeout", "timeout", "rate limited", "ok"])
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError) as caught:
            call_with_retry(call, sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(str(caught.exception), "gave up after 4 attempts: 429 too many requests")
        self.assertEqual(len(log), MAX_ATTEMPTS, "the cap is exact: the fifth entry is never called")
        self.assertEqual(waits, [0.5, 1.0, 2.0], "no wait after the last attempt")

    def test_one_attempt_means_no_waits(self):
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError) as caught:
            call_with_retry(scripted_endpoint(["timeout"]), sleep, 1, BASE_DELAY)
        self.assertEqual(str(caught.exception), "gave up after 1 attempts: no response in 10 seconds")
        self.assertEqual(waits, [])

    def test_sleep_receives_the_exact_delays(self):
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError):
            call_with_retry(scripted_endpoint(["timeout"] * 6), sleep, 6, 0.3)
        self.assertEqual(waits, [0.3 * 2 ** n for n in range(5)], "doubling is exact even for a base that is not")
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError):
            call_with_retry(scripted_endpoint(["timeout"] * 6), sleep, 6, 0.25)
        self.assertEqual(waits, [0.25, 0.5, 1.0, 2.0, 4.0])
        self.assertEqual(sum(waits), 7.75, "binary fractions add exactly")

    def test_script_running_out_is_a_test_bug_not_a_policy(self):
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(IndexError):
            call_with_retry(scripted_endpoint(["timeout"]), sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(waits, [0.5], "the empty script is hit on the second attempt and is not retried")


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("\nNOT OK: expected the waits [0.5, 1.0] under a 3.0 s budget, got [0.5, 1.0, 2.0]\n", result.stdout)
        self.assertTrue(result.stdout.replace("\r\n", "\n").endswith("past max_wait.\n"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_with_a_huge_budget_matches_the_worked_behavior(self):
        for script in (RECOVERS, EXHAUSTS, INVALID):
            worked_sleep, worked_waits = recorder()
            answer_sleep, answer_waits = recorder()
            with Quiet():
                worked = self.outcome(lambda: call_with_retry(scripted_endpoint(script), worked_sleep, MAX_ATTEMPTS, BASE_DELAY))
                answer = self.outcome(lambda: practice_answer.call_with_retry(scripted_endpoint(script), answer_sleep, MAX_ATTEMPTS, BASE_DELAY, 1000.0))
            self.assertEqual(worked, answer)
            self.assertEqual(worked_waits, answer_waits)

    @staticmethod
    def outcome(run):
        try:
            return ("returned", run())
        except Exception as error:   # noqa: BLE001 - the comparison wants every outcome
            return ("raised", type(error).__name__, str(error))

    def test_budget_stops_early_with_the_exact_message(self):
        call, log = counted(EXHAUSTS)
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError) as caught:
            practice_answer.call_with_retry(call, sleep, MAX_ATTEMPTS, BASE_DELAY, practice_answer.MAX_WAIT)
        self.assertEqual(str(caught.exception), "wait budget of 3.0 s exhausted after 3 attempts: no response in 10 seconds")
        self.assertEqual(waits, [0.5, 1.0])
        self.assertEqual(len(log), 3)
        exact_sleep, exact_waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError) as exact:
            practice_answer.call_with_retry(scripted_endpoint(EXHAUSTS), exact_sleep, MAX_ATTEMPTS, BASE_DELAY, 1.5)
        self.assertEqual(exact_waits, [0.5, 1.0], "a wait that lands exactly on the budget is allowed")
        self.assertIn("after 3 attempts", str(exact.exception))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "MAX_ATTEMPTS = 4", "# --- answer begins ---"),
                         segment(starter, "MAX_ATTEMPTS = 4", "def call_with_retry"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def retry_immediately(call, max_attempts):
    """The loop that shipped: try again at once, on any error, up to the cap."""
    for attempt in range(1, max_attempts + 1):
        try:
            return call()
        except Exception:   # noqa: BLE001 - this is the bug being measured
            if attempt == max_attempts:
                raise


class TightLoopThatShipped(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same scripts."""

    def test_tight_loop_hammers_and_retries_invalid_requests(self):
        shipped_call, shipped_log = counted(EXHAUSTS)
        with self.assertRaises(TimeoutError):
            retry_immediately(shipped_call, MAX_ATTEMPTS)
        self.assertEqual(len(shipped_log), 4, "four calls in the same instant: no wait at all")
        repaired_call, repaired_log = counted(EXHAUSTS)
        sleep, waits = recorder()
        with Quiet(), self.assertRaises(RuntimeError):
            call_with_retry(repaired_call, sleep, MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(len(repaired_log), 4)
        self.assertEqual(sum(waits), 3.5, "the same four calls spread over three and a half seconds")

        invalid = ["invalid request"] * 4
        shipped_call, shipped_log = counted(invalid)
        with self.assertRaises(ValueError):
            retry_immediately(shipped_call, MAX_ATTEMPTS)
        self.assertEqual(len(shipped_log), 4, "the shipped loop retried a request that can never succeed")
        repaired_call, repaired_log = counted(invalid)
        with Quiet(), self.assertRaises(ValueError):
            call_with_retry(repaired_call, recorder()[0], MAX_ATTEMPTS, BASE_DELAY)
        self.assertEqual(len(repaired_log), 1, "the repair raises after one call")


def derive_trace(scripts, retry, max_attempts, base_delay, max_wait=None):
    """Run each script through the real retry function with a recording sleep and
    a wrapper that notes every attempt: its number, outcome, start time, and wait.
    The animation's JavaScript port must reproduce this exactly."""
    runs = []
    for name, script in scripts.items():
        endpoint = scripted_endpoint(script)
        attempts, waits = [], []

        def call():
            attempts.append({"attempt": len(attempts) + 1, "outcome": script[len(attempts)], "at": round(sum(waits), 6), "wait": None})
            return endpoint()

        def sleep(seconds):
            attempts[-1]["wait"] = seconds
            waits.append(seconds)

        with Quiet():
            try:
                if max_wait is None:
                    message = retry(call, sleep, max_attempts, base_delay)
                else:
                    message = retry(call, sleep, max_attempts, base_delay, max_wait)
                result = "answer"
            except RuntimeError as error:
                message = str(error)
                result = "budget exhausted" if message.startswith("wait budget") else "gave up"
            except ValueError as error:
                message = str(error)
                result = "not retried"
        runs.append({"name": name, "script": list(script), "attempts": attempts, "result": result,
                     "message": message, "total_wait": round(sum(waits), 6)})
    return runs


def full_trace():
    scripts = {"recovers": RECOVERS, "exhausts": EXHAUSTS, "invalid": INVALID}
    return {
        "base_delay": BASE_DELAY,
        "max_attempts": MAX_ATTEMPTS,
        "runs": derive_trace(scripts, call_with_retry, MAX_ATTEMPTS, BASE_DELAY),
        "budget": {
            "max_wait": practice_answer.MAX_WAIT,
            "runs": derive_trace({"exhausts": EXHAUSTS}, practice_answer.call_with_retry, MAX_ATTEMPTS, BASE_DELAY, practice_answer.MAX_WAIT),
        },
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on scripts.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_scripts_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "scripts.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"base_delay": BASE_DELAY, "max_attempts": MAX_ATTEMPTS, "max_wait": practice_answer.MAX_WAIT,
                                   "scripts": {"recovers": RECOVERS, "exhausts": EXHAUSTS, "invalid": INVALID}})
        self.assertEqual(practice_answer.RECOVERS, RECOVERS)
        self.assertEqual(practice_answer.EXHAUSTS, EXHAUSTS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = full_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([run["result"] for run in trace["runs"]], ["answer", "gave up", "not retried"])
        self.assertEqual([attempt["at"] for attempt in trace["runs"][1]["attempts"]], [0, 0.5, 1.5, 3.5])
        self.assertEqual(trace["budget"]["runs"][0]["result"], "budget exhausted")
        self.assertEqual(len(trace["budget"]["runs"][0]["attempts"]), 3)


if __name__ == "__main__":
    unittest.main()
