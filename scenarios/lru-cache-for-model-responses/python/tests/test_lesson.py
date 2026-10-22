"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Expectations are exact: the
requests are fixed and nothing is random."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from response_cache import practice_answer
from response_cache.solution import ANSWERS, CAPACITY, REQUESTS, cached_answer, fake_model, key_for

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "response_cache"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
TTL = practice_answer.TTL_MINUTES
OUTCOMES = ["miss", "miss", "miss", "hit", "hit", "miss", "hit", "hit", "miss"]


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


def new_stats():
    return {"calls": 0, "hits": 0, "evictions": 0}


def replay():
    """The worked run, one record per request."""
    cache, stats, steps = {}, new_stats(), []
    for request in REQUESTS:
        answer, outcome, evicted = cached_answer(cache, request["prompt"], CAPACITY, fake_model, stats)
        steps.append({"id": request["id"], "key": key_for(request["prompt"]), "outcome": outcome, "evicted": evicted,
                      "order": list(cache), "calls": stats["calls"], "hits": stats["hits"], "evictions": stats["evictions"]})
    return steps, stats


def fifo_replay():
    """What a first-in-first-out cache does on the same requests: a hit is not refreshed."""
    cache, stats, outcomes = {}, new_stats(), []
    for request in REQUESTS:
        key = key_for(request["prompt"])
        if key in cache:
            stats["hits"] += 1
            outcomes.append("hit")
            continue
        cache[key] = fake_model(request["prompt"])
        stats["calls"] += 1
        outcomes.append("miss")
        if len(cache) > CAPACITY:
            del cache[next(iter(cache))]
            stats["evictions"] += 1
    return outcomes, stats


def practice_replay(ttl=TTL):
    cache, steps = {}, []
    stats = {"calls": 0, "hits": 0, "expired": 0, "evictions": 0}
    for request in REQUESTS:
        key = key_for(request["prompt"])
        age = request["t"] - cache[key][1] if key in cache else None
        answer, outcome, evicted = practice_answer.cached_answer(cache, request, CAPACITY, fake_model, stats, ttl)
        steps.append({"id": request["id"], "t": request["t"], "key": key, "outcome": outcome, "age": age, "evicted": evicted,
                      "order": list(cache)})
    return steps, stats


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_key_for_merges_case_and_spacing(self):
        self.assertEqual(key_for("Rotate  a key?"), "rotate a key?")
        self.assertEqual(key_for("  LIST call\tscope? "), "list call scope?")
        self.assertEqual(len({key_for(request["prompt"]) for request in REQUESTS}), 4, "four distinct questions")

    def test_outcomes_follow_the_documented_sequence(self):
        steps, stats = replay()
        self.assertEqual([step["outcome"] for step in steps], OUTCOMES)
        self.assertEqual(stats, {"calls": 5, "hits": 4, "evictions": 2})

    def test_a_hit_moves_the_key_to_the_most_recent_end(self):
        steps, _ = replay()
        self.assertEqual(steps[2]["order"], ["rotate a key?", "list call scope?", "find my invoice?"])
        self.assertEqual(steps[3]["order"], ["list call scope?", "find my invoice?", "rotate a key?"], "r4 refreshed the oldest key")

    def test_eviction_removes_the_oldest_key_and_the_cache_never_exceeds_capacity(self):
        steps, _ = replay()
        self.assertEqual([(step["id"], step["evicted"]) for step in steps if step["evicted"]],
                         [("r6", "find my invoice?"), ("r9", "lost key recovery?")])
        for step in steps:
            self.assertLessEqual(len(step["order"]), CAPACITY)
            self.assertEqual(step["order"][-1], step["key"], "the request's key is always the most recent")

    def test_a_cached_answer_is_the_model_answer(self):
        cache, stats = {}, new_stats()
        first = cached_answer(cache, "Rotate a key?", CAPACITY, fake_model, stats)
        second = cached_answer(cache, "rotate a key?", CAPACITY, fake_model, stats)
        self.assertEqual(first, (ANSWERS["rotate a key?"], "miss", None))
        self.assertEqual(second, (ANSWERS["rotate a key?"], "hit", None))
        self.assertEqual(stats, {"calls": 1, "hits": 1, "evictions": 0})

    def test_capacity_below_one_is_rejected(self):
        for capacity in (0, -1):
            with self.assertRaises(ValueError) as caught:
                cached_answer({}, "Rotate a key?", capacity, fake_model, new_stats())
            self.assertIn("capacity must be at least 1", str(caught.exception))

    def test_capacity_one_keeps_only_the_latest_answer(self):
        cache, stats = {}, new_stats()
        for request in REQUESTS[:3]:
            cached_answer(cache, request["prompt"], 1, fake_model, stats)
        self.assertEqual(list(cache), ["find my invoice?"])
        self.assertEqual(stats, {"calls": 3, "hits": 0, "evictions": 2})

    def test_input_requests_are_not_modified(self):
        before = json.dumps(REQUESTS)
        replay()
        self.assertEqual(json.dumps(REQUESTS), before)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected the entry for 'rotate a key?' to expire"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_expires_the_stale_entry_and_keeps_the_fresh_one(self):
        steps, stats = practice_replay()
        self.assertEqual([step["outcome"] for step in steps], ["miss", "miss", "miss", "hit", "hit", "miss", "expired", "hit", "miss"])
        self.assertEqual((steps[6]["age"], steps[7]["age"]), (42, 29))
        self.assertEqual(stats, {"calls": 6, "hits": 3, "expired": 1, "evictions": 2})
        cache = {}
        for request in REQUESTS[:7]:
            practice_answer.cached_answer(cache, request, CAPACITY, fake_model, {"calls": 0, "hits": 0, "expired": 0, "evictions": 0}, TTL)
        self.assertEqual(cache["rotate a key?"][1], 42, "the fresh answer carries the minute it was inserted")

    def test_answer_with_a_huge_ttl_reproduces_the_worked_run(self):
        steps, stats = practice_replay(ttl=10 ** 6)
        self.assertEqual([step["outcome"] for step in steps], OUTCOMES)
        self.assertEqual(stats, {"calls": 5, "hits": 4, "expired": 0, "evictions": 2})

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "CAPACITY = ", "# --- answer begins ---"), segment(starter, "CAPACITY = ", "def cached_answer"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace():
    """Every step of the worked run, the first-in-first-out comparison, and the
    practice run, all from the lesson's own functions. The animation's
    JavaScript port must reproduce this exactly."""
    steps, stats = replay()
    fifo_outcomes, fifo_stats = fifo_replay()
    practice_steps, practice_stats = practice_replay()
    return {
        "capacity": CAPACITY,
        "steps": steps,
        "totals": stats,
        "no_cache_calls": len(REQUESTS),
        "fifo": {"outcomes": fifo_outcomes, **fifo_stats},
        "practice": {"ttl": TTL, "steps": practice_steps, "totals": practice_stats},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on requests.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_requests_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "requests.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"capacity": CAPACITY, "ttl_minutes": TTL, "requests": REQUESTS, "answers": ANSWERS})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["totals"], {"calls": 5, "hits": 4, "evictions": 2})
        self.assertEqual(trace["fifo"]["calls"], 7)
        self.assertEqual(trace["practice"]["totals"]["calls"], 6)


class WhatShippedOnTheSameRequests(unittest.TestCase):
    """The evaluation that separates the policies, on the nine requests."""

    def test_no_cache_calls_nine_times_fifo_seven_and_lru_five(self):
        _, stats = replay()
        _, fifo_stats = fifo_replay()
        self.assertEqual(len(REQUESTS), 9, "no cache: one model call per request")
        self.assertEqual((fifo_stats["calls"], fifo_stats["hits"]), (7, 2))
        self.assertEqual((stats["calls"], stats["hits"]), (5, 4))
        self.assertEqual(len(ANSWERS), 4, "four distinct questions set the floor at four calls")

    def test_lru_wins_because_hits_refresh_recency(self):
        fifo_outcomes, _ = fifo_replay()
        self.assertEqual(fifo_outcomes[6:8], ["miss", "miss"], "FIFO already evicted the repeated questions")
        self.assertEqual(OUTCOMES[6:8], ["hit", "hit"], "LRU kept them because r4 and r5 refreshed them")


if __name__ == "__main__":
    unittest.main()
