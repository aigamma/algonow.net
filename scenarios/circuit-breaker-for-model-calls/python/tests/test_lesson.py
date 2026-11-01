"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
arrival times and the scripted provider answers are fixed and nothing is
random."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from circuit_breaker import practice_answer
from circuit_breaker.solution import CALLS, COOLDOWN, THRESHOLD, protect

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "circuit_breaker"
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


def call(call_id, t, provider):
    return {"id": call_id, "t": t, "provider": provider}


def actions(records):
    return [record[3] for record in records]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_states_and_actions_for_the_ten_calls(self):
        records = protect(CALLS, THRESHOLD, COOLDOWN)
        self.assertEqual([record[0] for record in records], ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"])
        self.assertEqual([record[2] for record in records],
                         ["closed", "closed", "closed", "closed", "open", "open", "half-open", "open", "half-open", "closed"])
        self.assertEqual(actions(records),
                         ["ok", "failed", "failed", "failed", "skipped", "skipped", "trial failed", "skipped", "trial ok", "ok"])
        self.assertEqual([record[4] for record in records],
                         ["closed", "closed", "closed", "open", "open", "open", "open", "open", "closed", "closed"])

    def test_exactly_threshold_consecutive_failures_open_the_breaker_and_a_success_resets_the_count(self):
        two_then_two = [call("a", 0.0, "fail"), call("b", 0.1, "fail"), call("c", 0.2, "ok"), call("d", 0.3, "fail"), call("e", 0.4, "fail")]
        self.assertEqual([record[4] for record in protect(two_then_two, THRESHOLD, COOLDOWN)], ["closed"] * 5,
                         "a success between failures resets the run, so no three in a row")
        three = [call("a", 0.0, "fail"), call("b", 0.1, "fail"), call("c", 0.2, "fail")]
        records = protect(three, THRESHOLD, COOLDOWN)
        self.assertEqual([record[4] for record in records], ["closed", "closed", "open"], "the third failure opens it, not the second")
        self.assertEqual(protect(three, 4, COOLDOWN)[-1][4], "closed", "a threshold of four needs a fourth failure")

    def test_a_call_exactly_at_the_end_of_the_cooldown_is_the_trial(self):
        opens = [call("a", 0.0, "fail"), call("b", 0.0, "fail"), call("c", 0.0, "fail")]
        on_time = protect(opens + [call("d", COOLDOWN, "ok")], THRESHOLD, COOLDOWN)
        self.assertEqual(on_time[-1][2:], ("half-open", "trial ok", "closed"))
        early = protect(opens + [call("d", COOLDOWN - 0.001, "ok")], THRESHOLD, COOLDOWN)
        self.assertEqual(early[-1][2:], ("open", "skipped", "open"), "a thousandth of a second early is still open")

    def test_a_failed_trial_reopens_and_starts_a_new_cooldown(self):
        script = [call("a", 0.0, "fail"), call("b", 0.0, "fail"), call("c", 0.0, "fail"),
                  call("d", 2.0, "fail"), call("e", 3.9, "ok"), call("f", 4.0, "ok")]
        records = protect(script, THRESHOLD, COOLDOWN)
        self.assertEqual(records[3][2:], ("half-open", "trial failed", "open"))
        self.assertEqual(records[4][3], "skipped", "the new cooldown runs from the failed trial at 2.0, not from 0.0")
        self.assertEqual(records[5][2:], ("half-open", "trial ok", "closed"))

    def test_invalid_settings_and_out_of_order_arrivals_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            protect(CALLS, 0, COOLDOWN)
        self.assertIn("threshold", str(caught.exception))
        with self.assertRaises(ValueError):
            protect(CALLS, THRESHOLD, 0)
        with self.assertRaises(ValueError):
            protect(CALLS, THRESHOLD, -1.0)
        with self.assertRaises(ValueError) as caught:
            protect([call("c1", 1.0, "ok"), call("c2", 0.5, "ok")], THRESHOLD, COOLDOWN)
        self.assertIn("time order", str(caught.exception))
        self.assertEqual(protect([], THRESHOLD, COOLDOWN), [])

    def test_input_is_not_modified(self):
        copy = [dict(item) for item in CALLS]
        protect(CALLS, THRESHOLD, COOLDOWN)
        self.assertEqual(CALLS, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected c10 to be the second trial call"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_needs_two_trial_successes_to_close(self):
        records = practice_answer.protect(practice_answer.CALLS, THRESHOLD, COOLDOWN, practice_answer.RECOVERY)
        worked = protect(CALLS, THRESHOLD, COOLDOWN)
        self.assertEqual(records[:8], worked[:8], "nothing changes until the first successful trial")
        self.assertEqual(records[8][2:], ("half-open", "trial ok", "half-open"))
        self.assertEqual(records[9][2:], ("half-open", "trial ok", "closed"))
        with_one = practice_answer.protect(practice_answer.CALLS, THRESHOLD, COOLDOWN, 1)
        self.assertEqual(with_one, worked, "with a recovery of one the answer is the worked solution")

    def test_answer_resets_the_count_when_a_trial_fails(self):
        script = [call("a", 0.0, "fail"), call("b", 0.0, "fail"), call("c", 0.0, "fail"),
                  call("d", 2.0, "ok"), call("e", 2.5, "fail"), call("f", 4.5, "ok"), call("g", 4.75, "ok")]
        records = practice_answer.protect(script, THRESHOLD, COOLDOWN, 2)
        self.assertEqual(actions(records)[3:], ["trial ok", "trial failed", "trial ok", "trial ok"])
        self.assertEqual([record[4] for record in records][3:], ["half-open", "open", "half-open", "closed"],
                         "the good trial before the failure does not count toward closing")
        with self.assertRaises(ValueError):
            practice_answer.protect(script, THRESHOLD, COOLDOWN, 0)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "THRESHOLD = ", "# --- answer begins ---"), segment(starter, "THRESHOLD = ", "def protect"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every decision of the real functions, the counts, the practice replay,
    and the evaluation numbers, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly."""
    records = []
    for call_id, t, before, action, after in protect(CALLS, THRESHOLD, COOLDOWN):
        records.append({"id": call_id, "t": t, "before": before, "action": action, "after": after})
    answered = {item["id"]: item["provider"] for item in CALLS}
    reached = [record["id"] for record in records if record["action"] != "skipped"]
    returned_failure = [record["id"] for record in records if record["action"] in ("failed", "trial failed")]
    skipped = [record["id"] for record in records if record["action"] == "skipped"]
    practice = []
    for call_id, t, before, action, after in practice_answer.protect(practice_answer.CALLS, THRESHOLD, COOLDOWN, practice_answer.RECOVERY):
        practice.append({"id": call_id, "t": t, "before": before, "action": action, "after": after})
    return {
        "threshold": THRESHOLD,
        "cooldown": COOLDOWN,
        "records": records,
        "reached": reached,
        "returned_failure": returned_failure,
        "skipped": skipped,
        "shipped": {"provider_calls": len(CALLS),
                    "failures": sum(1 for item in CALLS if item["provider"] == "fail"),
                    "skipped_would_have_failed": sum(1 for call_id in skipped if answered[call_id] == "fail"),
                    "skipped_would_have_succeeded": sum(1 for call_id in skipped if answered[call_id] == "ok")},
        "practice": {"recovery": practice_answer.RECOVERY, "records": practice,
                     "trials": [record["id"] for record in practice if record["action"] == "trial ok"]},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on calls.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_calls_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "calls.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["threshold"], THRESHOLD)
        self.assertEqual(fixture["cooldown"], COOLDOWN)
        self.assertEqual(fixture["recovery"], practice_answer.RECOVERY)
        self.assertEqual(fixture["calls"], CALLS)
        self.assertEqual(practice_answer.CALLS, CALLS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["reached"], ["c1", "c2", "c3", "c4", "c7", "c9", "c10"])
        self.assertEqual(trace["returned_failure"], ["c2", "c3", "c4", "c7"])
        self.assertEqual(trace["skipped"], ["c5", "c6", "c8"])
        self.assertEqual(trace["records"][6], {"id": "c7", "t": 3.3, "before": "half-open", "action": "trial failed", "after": "open"})
        self.assertEqual(trace["practice"]["trials"], ["c9", "c10"])


class CallingTheProviderEveryTimeOnTheSameScript(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the ten calls."""

    def test_what_shipped_sends_every_call_and_eats_seven_failures(self):
        self.assertEqual(len(CALLS), 10, "every call reached the provider")
        self.assertEqual(sum(1 for item in CALLS if item["provider"] == "fail"), 7, "seven of them waited out the timeout and failed")

    def test_the_breaker_spares_three_calls_that_would_have_failed(self):
        records = protect(CALLS, THRESHOLD, COOLDOWN)
        answered = {item["id"]: item["provider"] for item in CALLS}
        reached = [record[0] for record in records if record[3] != "skipped"]
        skipped = [record[0] for record in records if record[3] == "skipped"]
        self.assertEqual(len(reached), 7)
        self.assertEqual(sum(1 for record in records if record[3] in ("failed", "trial failed")), 4)
        self.assertEqual(skipped, ["c5", "c6", "c8"])
        self.assertEqual([answered[call_id] for call_id in skipped], ["fail", "fail", "fail"],
                         "on this script every skipped call would have failed anyway")

    def test_a_skipped_call_can_be_one_the_provider_would_have_answered(self):
        recovers_early = [call("a", 0.0, "fail"), call("b", 0.1, "fail"), call("c", 0.2, "fail"),
                          call("d", 0.5, "ok"), call("e", 2.5, "ok")]
        records = protect(recovers_early, THRESHOLD, COOLDOWN)
        self.assertEqual(records[3][3], "skipped", "d arrives during the cooldown and is turned back")
        self.assertEqual(recovers_early[3]["provider"], "ok", "although the provider had already recovered: the honest cost")
        self.assertEqual(records[4][2:], ("half-open", "trial ok", "closed"))


if __name__ == "__main__":
    unittest.main()
