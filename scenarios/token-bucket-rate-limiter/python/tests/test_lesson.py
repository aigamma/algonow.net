"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
arrival times are fixed numbers and nothing is random; levels are compared
after rounding to two decimals, the precision the lesson prints."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from token_bucket import practice_answer
from token_bucket.solution import CAPACITY, RATE, REQUESTS, admit

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "token_bucket"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
WINDOW_SECONDS = 1.0       # the sliding window the evaluation counts arrivals in
BURST_SECONDS = 1.6        # the burst that shipped: how many arrivals fall inside it


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


def busiest_window(times, window):
    """The most arrivals inside any window of the given length that starts at an arrival."""
    busiest = 0
    for start in times:
        count = 0
        for t in times:
            if start <= t <= start + window:
                count += 1
        busiest = max(busiest, count)
    return busiest


def levels(records, index):
    return [round(record[index], 2) for record in records]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_decisions_and_levels_for_the_eight_requests(self):
        records = admit(REQUESTS, CAPACITY, RATE)
        self.assertEqual([record[0] for record in records], ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"])
        self.assertEqual([record[3] for record in records], ["admit", "admit", "admit", "reject", "admit", "reject", "admit", "admit"])
        self.assertEqual(levels(records, 2), [3.0, 2.2, 1.4, 0.6, 1.5, 0.6, 3.0, 2.1])
        self.assertEqual(levels(records, 4), [2.0, 1.2, 0.4, 0.6, 0.5, 0.6, 2.0, 1.1])

    def test_the_bucket_never_overfills_and_a_reject_spends_nothing(self):
        for request_id, t, before, decision, after in admit(REQUESTS, CAPACITY, RATE):
            self.assertLessEqual(before, CAPACITY, request_id)
            self.assertGreaterEqual(after, 0.0, request_id)
            if decision == "admit":
                self.assertAlmostEqual(after, before - 1, places=9, msg=request_id)
            else:
                self.assertEqual(after, before, "a rejected request leaves the level alone")
                self.assertLess(before, 1.0, "only a request that finds less than a whole token is rejected")

    def test_a_request_arriving_exactly_when_one_token_has_refilled_is_admitted(self):
        drain = [{"id": "a", "t": 0.0}, {"id": "b", "t": 0.0}, {"id": "c", "t": 0.0}]
        just_in_time = admit(drain + [{"id": "d", "t": 1.0}], CAPACITY, RATE)
        self.assertEqual([record[3] for record in just_in_time], ["admit", "admit", "admit", "admit"])
        self.assertEqual(just_in_time[-1][2], 1.0)
        too_early = admit(drain + [{"id": "d", "t": 0.999}], CAPACITY, RATE)
        self.assertEqual(too_early[-1][3], "reject")

    def test_a_long_gap_refills_to_the_capacity_and_no_further(self):
        records = admit([{"id": "a", "t": 0.0}, {"id": "b", "t": 100.0}], CAPACITY, RATE)
        self.assertEqual(records[1][2], CAPACITY)
        self.assertEqual(records[1][4], CAPACITY - 1)

    def test_invalid_settings_and_out_of_order_arrivals_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            admit(REQUESTS, 0, RATE)
        self.assertIn("capacity", str(caught.exception))
        with self.assertRaises(ValueError):
            admit(REQUESTS, CAPACITY, 0)
        with self.assertRaises(ValueError):
            admit(REQUESTS, CAPACITY, -1.0)
        with self.assertRaises(ValueError) as caught:
            admit([{"id": "q1", "t": 1.0}, {"id": "q2", "t": 0.5}], CAPACITY, RATE)
        self.assertIn("time order", str(caught.exception))
        self.assertEqual(admit([], CAPACITY, RATE), [])

    def test_input_is_not_modified(self):
        copy = [dict(request) for request in REQUESTS]
        admit(REQUESTS, CAPACITY, RATE)
        self.assertEqual(REQUESTS, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected every request to be admitted"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_gives_each_tenant_its_own_bucket(self):
        records = practice_answer.admit(practice_answer.REQUESTS, CAPACITY, RATE)
        self.assertEqual([record[4] for record in records], ["admit"] * 8)
        by_id = {record[0]: record for record in records}
        self.assertEqual(by_id["q4"][3], 3.0, "tenant b's first request finds its own bucket full")
        self.assertEqual(by_id["q6"][3], 3.0, "and so does its second, after tenant a's burst")
        self.assertEqual(levels([by_id["q1"], by_id["q2"], by_id["q3"], by_id["q5"], by_id["q7"]], 3), [3.0, 2.2, 1.4, 1.5, 3.0])
        self.assertEqual([record[1] for record in records], ["a", "a", "a", "b", "a", "b", "a", "b"])

    def test_answer_still_rejects_out_of_order_arrivals_across_tenants(self):
        with self.assertRaises(ValueError):
            practice_answer.admit([{"id": "q1", "t": 1.0, "tenant": "a"}, {"id": "q2", "t": 0.5, "tenant": "b"}], CAPACITY, RATE)

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CAPACITY = ", "# --- answer begins ---"), segment(starter, "CAPACITY = ", "def admit"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every decision of the real functions, the counts, the practice replay,
    and the evaluation numbers, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly (six decimals)."""
    records = []
    for request_id, t, before, decision, after in admit(REQUESTS, CAPACITY, RATE):
        records.append({"id": request_id, "t": t, "before": round(before, 6), "decision": decision, "after": round(after, 6)})
    admitted = [record["id"] for record in records if record["decision"] == "admit"]
    rejected = [record["id"] for record in records if record["decision"] == "reject"]
    practice = []
    counts = {}
    for request_id, tenant, t, before, decision, after in practice_answer.admit(practice_answer.REQUESTS, CAPACITY, RATE):
        practice.append({"id": request_id, "tenant": tenant, "t": t, "before": round(before, 6), "decision": decision, "after": round(after, 6)})
        counts.setdefault(tenant, {"admit": 0, "reject": 0})[decision] += 1
    arrivals = [request["t"] for request in REQUESTS]
    admitted_times = [record["t"] for record in records if record["decision"] == "admit"]
    return {
        "capacity": CAPACITY,
        "rate": RATE,
        "records": records,
        "admitted": admitted,
        "rejected": rejected,
        "shipped": {"window_seconds": WINDOW_SECONDS, "burst_seconds": BURST_SECONDS,
                    "within_burst": sum(1 for t in arrivals if t <= BURST_SECONDS),
                    "busiest_window": busiest_window(arrivals, WINDOW_SECONDS),
                    "limited_busiest_window": busiest_window(admitted_times, WINDOW_SECONDS)},
        "practice": {"records": practice, "counts": counts},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on requests.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_requests_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "requests.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["capacity"], CAPACITY)
        self.assertEqual(fixture["rate"], RATE)
        self.assertEqual(fixture["window_seconds"], WINDOW_SECONDS)
        self.assertEqual(fixture["burst_seconds"], BURST_SECONDS)
        self.assertEqual(fixture["requests"], practice_answer.REQUESTS)
        self.assertEqual([{"id": request["id"], "t": request["t"]} for request in fixture["requests"]], REQUESTS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["admitted"], ["q1", "q2", "q3", "q5", "q7", "q8"])
        self.assertEqual(trace["rejected"], ["q4", "q6"])
        self.assertEqual(trace["records"][1], {"id": "q2", "t": 0.2, "before": 2.2, "decision": "admit", "after": 1.2})
        self.assertEqual(trace["practice"]["counts"], {"a": {"admit": 5, "reject": 0}, "b": {"admit": 3, "reject": 0}})


class ForwardingEverythingOnTheSameArrivals(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the eight arrivals."""

    def test_what_shipped_sends_six_of_eight_inside_the_burst(self):
        arrivals = [request["t"] for request in REQUESTS]
        self.assertEqual(sum(1 for t in arrivals if t <= BURST_SECONDS), 6, "six requests inside one point six seconds")
        self.assertEqual(busiest_window(arrivals, WINDOW_SECONDS), 4, "four arrivals inside one second, against a rate of one per second")

    def test_the_bucket_bounds_every_one_second_window(self):
        admitted_times = [t for _, t, _, decision, _ in admit(REQUESTS, CAPACITY, RATE) if decision == "admit"]
        self.assertEqual(len(admitted_times), 6)
        self.assertLessEqual(busiest_window(admitted_times, WINDOW_SECONDS), CAPACITY + 1, "at most the burst plus one second of refill")
        self.assertEqual(busiest_window(admitted_times, WINDOW_SECONDS), 3)

    def test_per_tenant_buckets_admit_more_on_the_same_arrivals(self):
        shared = admit(REQUESTS, CAPACITY, RATE)
        separate = practice_answer.admit(practice_answer.REQUESTS, CAPACITY, RATE)
        self.assertEqual(sum(1 for record in shared if record[3] == "admit"), 6)
        self.assertEqual(sum(1 for record in separate if record[4] == "admit"), 8)
        tenant_of = {request["id"]: request["tenant"] for request in practice_answer.REQUESTS}
        self.assertEqual([tenant_of[record[0]] for record in shared if record[3] == "reject"], ["b", "b"],
                         "the shared bucket rejected only tenant b, starved by tenant a's burst")


if __name__ == "__main__":
    unittest.main()
