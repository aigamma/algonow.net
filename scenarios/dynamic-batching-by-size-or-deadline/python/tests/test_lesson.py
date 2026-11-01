"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
arrival times are fixed numbers and nothing is random; times and waits are
compared after rounding to two decimals, the precision the lesson prints,
because sums such as 1.7 + 1.0 can be off by one unit in the last place."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from dynamic_batcher import practice_answer
from dynamic_batcher.solution import MAX_BATCH, MAX_WAIT, REQUESTS, batch

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "dynamic_batcher"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
WINDOW_SECONDS = 1.0       # the sliding window the evaluation counts model calls in


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
    """The most events inside any window of the given length that starts at an event."""
    busiest = 0
    for start in times:
        count = 0
        for t in times:
            if start <= t <= start + window:
                count += 1
        busiest = max(busiest, count)
    return busiest


def waits_of(batches, requests):
    """One (id, wait) pair per request, in the order the batches were sent."""
    arrival = {request["id"]: request["t"] for request in requests}
    return [(request_id, record["at"] - arrival[request_id]) for record in batches for request_id in record["ids"]]


def rounded(values, places=2):
    return [round(value, places) for value in values]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_batches_members_times_and_reasons(self):
        batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        self.assertEqual([record["ids"] for record in batches], [["r1", "r2", "r3", "r4"], ["r5", "r6"], ["r7", "r8", "r9"]])
        self.assertEqual(rounded([record["at"] for record in batches]), [0.4, 1.5, 2.7])
        self.assertEqual([record["reason"] for record in batches], ["full", "deadline", "deadline"])

    def test_every_wait_and_the_two_bounds(self):
        batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        waits = waits_of(batches, REQUESTS)
        self.assertEqual([request_id for request_id, _ in waits], ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9"])
        self.assertEqual(rounded([wait for _, wait in waits]), [0.4, 0.3, 0.1, 0.0, 1.0, 0.6, 1.0, 0.7, 0.5])
        for request_id, wait in waits:
            self.assertGreaterEqual(wait, 0.0, request_id)
            self.assertLessEqual(wait, MAX_WAIT + 1e-9, request_id)
        for record in batches:
            self.assertLessEqual(len(record["ids"]), MAX_BATCH)
        self.assertAlmostEqual(sum(wait for _, wait in waits) / len(waits), 4.6 / 9, places=9)

    def test_a_deadline_flush_happens_exactly_at_the_oldest_arrival_plus_max_wait(self):
        batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        self.assertEqual(batches[1]["at"], REQUESTS[4]["t"] + MAX_WAIT, "r5 arrived at 0.5 and waited the full second")
        self.assertEqual(batches[2]["at"], REQUESTS[6]["t"] + MAX_WAIT, "r7 arrived at 1.7 and the loop ended with it pending")

    def test_an_arrival_exactly_at_the_deadline_finds_the_batch_already_sent(self):
        at_deadline = batch([{"id": "a", "t": 0.0}, {"id": "b", "t": 1.0}], MAX_BATCH, MAX_WAIT)
        self.assertEqual([record["ids"] for record in at_deadline], [["a"], ["b"]])
        self.assertEqual([record["at"] for record in at_deadline], [1.0, 2.0])
        self.assertEqual([record["reason"] for record in at_deadline], ["deadline", "deadline"])
        just_before = batch([{"id": "a", "t": 0.0}, {"id": "b", "t": 0.999}], MAX_BATCH, MAX_WAIT)
        self.assertEqual([record["ids"] for record in just_before], [["a", "b"]])
        self.assertEqual(just_before[0]["at"], 1.0)

    def test_a_single_request_is_sent_at_its_own_deadline(self):
        batches = batch([{"id": "only", "t": 0.3}], MAX_BATCH, MAX_WAIT)
        self.assertEqual(batches, [{"ids": ["only"], "at": 1.3, "reason": "deadline"}])

    def test_a_cap_of_one_sends_every_request_at_once(self):
        batches = batch(REQUESTS, 1, MAX_WAIT)
        self.assertEqual(len(batches), len(REQUESTS))
        for record, request in zip(batches, REQUESTS):
            self.assertEqual(record, {"ids": [request["id"]], "at": request["t"], "reason": "full"})

    def test_invalid_settings_and_out_of_order_arrivals_are_rejected(self):
        with self.assertRaises(ValueError) as caught:
            batch(REQUESTS, 0, MAX_WAIT)
        self.assertIn("max_batch", str(caught.exception))
        with self.assertRaises(ValueError):
            batch(REQUESTS, MAX_BATCH, 0)
        with self.assertRaises(ValueError):
            batch(REQUESTS, MAX_BATCH, -1.0)
        with self.assertRaises(ValueError) as caught:
            batch([{"id": "r1", "t": 1.0}, {"id": "r2", "t": 0.5}], MAX_BATCH, MAX_WAIT)
        self.assertIn("time order", str(caught.exception))
        self.assertEqual(batch([], MAX_BATCH, MAX_WAIT), [])

    def test_input_is_not_modified(self):
        copy = [dict(request) for request in REQUESTS]
        batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        self.assertEqual(REQUESTS, copy)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected four batches"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_respects_the_token_budget(self):
        batches = practice_answer.batch(practice_answer.REQUESTS, MAX_BATCH, MAX_WAIT, practice_answer.MAX_TOKENS)
        tokens_of = {request["id"]: request["tokens"] for request in practice_answer.REQUESTS}
        self.assertEqual([record["ids"] for record in batches], [["r1", "r2", "r3"], ["r4", "r5", "r6"], ["r7", "r8"], ["r9"]])
        self.assertEqual([record["reason"] for record in batches], ["tokens", "deadline", "tokens", "deadline"])
        self.assertEqual(rounded([record["at"] for record in batches]), [0.4, 1.4, 2.2, 3.2])
        self.assertEqual([sum(tokens_of[i] for i in record["ids"]) for record in batches], [500, 450, 490, 60])
        waits = waits_of(batches, practice_answer.REQUESTS)
        self.assertEqual(rounded([wait for _, wait in waits]), [0.4, 0.3, 0.1, 1.0, 0.9, 0.5, 0.5, 0.2, 1.0])
        self.assertLessEqual(max(wait for _, wait in waits), MAX_WAIT + 1e-9)

    def test_answer_rejects_an_oversized_request(self):
        with self.assertRaises(ValueError) as caught:
            practice_answer.batch([{"id": "big", "t": 0.0, "tokens": 600}], MAX_BATCH, MAX_WAIT, practice_answer.MAX_TOKENS)
        self.assertIn("big", str(caught.exception))
        self.assertIn("600", str(caught.exception))
        exact = practice_answer.batch([{"id": "fits", "t": 0.0, "tokens": 500}], MAX_BATCH, MAX_WAIT, practice_answer.MAX_TOKENS)
        self.assertEqual(exact[0]["ids"], ["fits"], "a request of exactly the budget is allowed")

    def test_answer_with_a_large_budget_matches_the_worked_run(self):
        generous = practice_answer.batch(practice_answer.REQUESTS, MAX_BATCH, MAX_WAIT, 10_000)
        plain = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        self.assertEqual(generous, plain, "the token rule only adds flushes; without pressure it changes nothing")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "import sys", "# --- answer begins ---"), segment(starter, "import sys", "def batch"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every batch and wait of the real functions, the practice replay, and the
    evaluation numbers, all from the lesson's own code. The animation's
    JavaScript port must reproduce this exactly (six decimals)."""
    def describe(batches, requests, with_tokens):
        tokens_of = {request["id"]: request.get("tokens") for request in requests}
        records = []
        for record in batches:
            row = {"ids": list(record["ids"]), "at": round(record["at"], 6), "reason": record["reason"]}
            if with_tokens:
                row["tokens"] = sum(tokens_of[i] for i in record["ids"])
            records.append(row)
        arrival = {request["id"]: request["t"] for request in requests}
        waits = [{"id": i, "t": arrival[i], "at": round(record["at"], 6), "wait": round(record["at"] - arrival[i], 6)}
                 for record in batches for i in record["ids"]]
        raw = [record["at"] - arrival[i] for record in batches for i in record["ids"]]
        return {"batches": records, "waits": waits, "longest_wait": round(max(raw), 6), "average_wait": round(sum(raw) / len(raw), 6),
                "busiest_window": busiest_window([record["at"] for record in batches], WINDOW_SECONDS)}

    worked = describe(batch(REQUESTS, MAX_BATCH, MAX_WAIT), REQUESTS, False)
    practice = describe(practice_answer.batch(practice_answer.REQUESTS, MAX_BATCH, MAX_WAIT, practice_answer.MAX_TOKENS),
                        practice_answer.REQUESTS, True)
    return {
        "max_batch": MAX_BATCH,
        "max_wait": MAX_WAIT,
        "max_tokens": practice_answer.MAX_TOKENS,
        "window_seconds": WINDOW_SECONDS,
        **worked,
        "shipped": {"model_calls": len(REQUESTS), "busiest_window": busiest_window([request["t"] for request in REQUESTS], WINDOW_SECONDS)},
        "practice": practice,
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on arrivals.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_arrivals_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "arrivals.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture["max_batch"], MAX_BATCH)
        self.assertEqual(fixture["max_wait"], MAX_WAIT)
        self.assertEqual(fixture["max_tokens"], practice_answer.MAX_TOKENS)
        self.assertEqual(fixture["window_seconds"], WINDOW_SECONDS)
        self.assertEqual(fixture["requests"], practice_answer.REQUESTS)
        self.assertEqual([{"id": request["id"], "t": request["t"]} for request in fixture["requests"]], REQUESTS)

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual([record["ids"] for record in trace["batches"]], [["r1", "r2", "r3", "r4"], ["r5", "r6"], ["r7", "r8", "r9"]])
        self.assertEqual(trace["waits"][6], {"id": "r7", "t": 1.7, "at": 2.7, "wait": 1.0})
        self.assertEqual(trace["longest_wait"], 1.0)
        self.assertEqual(trace["average_wait"], 0.511111)
        self.assertEqual([record["reason"] for record in trace["practice"]["batches"]], ["tokens", "deadline", "tokens", "deadline"])
        self.assertEqual([record["tokens"] for record in trace["practice"]["batches"]], [500, 450, 490, 60])


class OneCallPerRequestOnTheSameArrivals(unittest.TestCase):
    """The evaluation that separates the repair from what shipped, on the nine arrivals."""

    def test_what_shipped_makes_nine_calls_and_six_inside_one_second(self):
        arrivals = [request["t"] for request in REQUESTS]
        self.assertEqual(len(arrivals), 9, "one model call per request")
        self.assertEqual(busiest_window(arrivals, WINDOW_SECONDS), 6, "six model calls inside one second at the busiest")

    def test_batching_makes_three_calls_and_bounds_every_wait(self):
        batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
        self.assertEqual(len(batches), 3)
        self.assertEqual(busiest_window([record["at"] for record in batches], WINDOW_SECONDS), 1, "the batched calls are a second or more apart")
        waits = [wait for _, wait in waits_of(batches, REQUESTS)]
        self.assertLessEqual(max(waits), MAX_WAIT + 1e-9)
        self.assertEqual(round(max(waits), 2), 1.0, "the cap is reached, by the two deadline batches")

    def test_the_token_budget_adds_one_call_and_keeps_the_wait_bound(self):
        batches = practice_answer.batch(practice_answer.REQUESTS, MAX_BATCH, MAX_WAIT, practice_answer.MAX_TOKENS)
        self.assertEqual(len(batches), 4)
        waits = [wait for _, wait in waits_of(batches, practice_answer.REQUESTS)]
        self.assertLessEqual(max(waits), MAX_WAIT + 1e-9)
        self.assertAlmostEqual(sum(waits) / len(waits), 4.9 / 9, places=9)


if __name__ == "__main__":
    unittest.main()
