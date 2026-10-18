"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise fuse directly. Expectations are exact: the two
rankings are fixed lists and nothing is random."""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from rank_fusion import practice_answer
from rank_fusion.solution import K, RANKINGS, fuse, fusion_order

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "rank_fusion"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
WEIGHTS = practice_answer.WEIGHTS


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


def docs(fused):
    return [doc for doc, score in fused]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_fused_order_and_exact_scores(self):
        fused = fuse(RANKINGS, K)
        self.assertEqual(docs(fused), ["runbook rotate a key", "errors E4031", "cli rotate-key", "faq key expiry",
                                       "scopes", "audit log", "incident call"])
        # contributions are added in dictionary order: the keyword list first, then the vector list
        self.assertEqual(fused[0], ("runbook rotate a key", (0.0 + 1 / 63) + 1 / 61))
        self.assertEqual(fused[1], ("errors E4031", (0.0 + 1 / 61) + 1 / 64))
        self.assertEqual(fused[2], ("cli rotate-key", (0.0 + 1 / 62) + 1 / 63))
        self.assertEqual(fused[3], ("faq key expiry", 0.0 + 1 / 62))
        self.assertEqual([round(score, 6) for doc, score in fused],
                         [0.032266, 0.032018, 0.032002, 0.016129, 0.015625, 0.015385, 0.015385])

    def test_equal_scores_sort_by_name(self):
        fused = fuse(RANKINGS, K)
        self.assertEqual(fused[5][1], fused[6][1], "audit log and incident call are both a lone fifth place")
        self.assertEqual(docs(fused)[5:], ["audit log", "incident call"])
        self.assertEqual(fusion_order(("b", 0.5)), (-0.5, "b"))
        self.assertLess(fusion_order(("a", 0.5)), fusion_order(("b", 0.5)))
        self.assertLess(fusion_order(("z", 0.6)), fusion_order(("a", 0.5)), "a higher score sorts first whatever the name")

    def test_a_document_in_both_lists_outranks_any_document_in_one_list(self):
        fused = dict(fuse(RANKINGS, K))
        in_both = [doc for doc in RANKINGS["keyword"] if doc in RANKINGS["vector"]]
        in_one = [doc for doc in fused if doc not in in_both]
        self.assertEqual(len(in_both), 3)
        self.assertGreater(min(fused[doc] for doc in in_both), max(fused[doc] for doc in in_one))
        # the general reason at these list lengths: two last places beat one first place
        self.assertGreater(1 / (K + 5) + 1 / (K + 5), 1 / (K + 1))

    def test_duplicate_inside_one_list_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            fuse({"keyword": ["a", "b", "a"], "vector": ["c"]}, K)
        self.assertIn("keyword", str(caught.exception))
        self.assertIn("'a'", str(caught.exception))
        # the same document in two different lists is the whole point, not a duplicate
        self.assertEqual(docs(fuse({"keyword": ["a"], "vector": ["a"]}, K)), ["a"])

    def test_input_rankings_are_not_modified(self):
        before = copy.deepcopy(RANKINGS)
        fuse(RANKINGS, K)
        self.assertEqual(RANKINGS, before)

    def test_no_rankings_no_results(self):
        self.assertEqual(fuse({}, K), [])
        self.assertEqual(fuse({"keyword": [], "vector": []}, K), [])


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected 'errors E4031' first"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_weights_the_keyword_list(self):
        fused = practice_answer.fuse(RANKINGS, K, WEIGHTS)
        self.assertEqual(docs(fused), ["errors E4031", "runbook rotate a key", "cli rotate-key", "scopes",
                                       "audit log", "faq key expiry", "incident call"])
        self.assertEqual(fused[0], ("errors E4031", (0.0 + 2 / 61) + 1 / 64))
        self.assertEqual([round(score, 6) for doc, score in fused],
                         [0.048412, 0.048139, 0.048131, 0.03125, 0.030769, 0.016129, 0.015385])

    def test_answer_with_weights_of_one_equals_the_worked_example(self):
        self.assertEqual(practice_answer.fuse(RANKINGS, K, {"keyword": 1, "vector": 1}), fuse(RANKINGS, K))

    def test_answer_counts_a_list_without_a_weight_once(self):
        self.assertEqual(practice_answer.fuse(RANKINGS, K, {}), fuse(RANKINGS, K))
        only_vector = practice_answer.fuse(RANKINGS, K, {"vector": 3})
        self.assertEqual(only_vector[0], ("runbook rotate a key", (0.0 + 1 / 63) + 3 / 61))

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "K = 60", "# --- answer begins ---"),
                         segment(starter, "K = 60", "def fuse"))
        self.assertEqual(segment(answer, 'if __name__ == "__main__":'), segment(starter, 'if __name__ == "__main__":'))


def derive_trace(rankings, k, fuse_function, weights=None):
    """Replay the accumulation step by step and pair it with the real fused order.
    The animation's JavaScript port must reproduce this exactly."""
    scores, contributions = {}, []
    for name, ranking in rankings.items():
        for rank, doc in enumerate(ranking, start=1):
            weight = 1 if weights is None else weights.get(name, 1)
            add = weight / (k + rank)
            scores[doc] = scores.get(doc, 0.0) + add
            contributions.append({"list": name, "rank": rank, "doc": doc, "add": round(add, 6), "total": round(scores[doc], 6)})
    pairs = fuse_function(rankings, k) if weights is None else fuse_function(rankings, k, weights)
    fused = []
    for doc, score in pairs:
        ranks = {}
        for name, ranking in rankings.items():
            if doc in ranking:
                ranks[name] = ranking.index(doc) + 1
        fused.append({"doc": doc, "score": round(score, 6), "ranks": ranks})
    return contributions, fused


def shipped_order(rankings):
    """The merge that shipped: the vector list, then keyword documents not already present."""
    order = list(rankings["vector"])
    for doc in rankings["keyword"]:
        if doc not in order:
            order.append(doc)
    return order


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on rankings.json and replays expected-trace.json;
    both are pinned to the lesson files here, so the picture cannot drift."""

    def test_rankings_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "rankings.json").read_text(encoding="utf-8"))
        self.assertEqual(fixture, {"k": K, "rankings": RANKINGS, "weights": WEIGHTS})

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        contributions, fused = derive_trace(RANKINGS, K, fuse)
        weighted_contributions, weighted_fused = derive_trace(RANKINGS, K, practice_answer.fuse, WEIGHTS)
        self.assertEqual(fixture, {"k": K, "contributions": contributions, "fused": fused, "shipped": shipped_order(RANKINGS),
                                   "weighted": {"weights": WEIGHTS, "contributions": weighted_contributions,
                                                "fused": weighted_fused}})
        self.assertEqual(len(contributions), 10)
        self.assertEqual([entry["doc"] for entry in fused], docs(fuse(RANKINGS, K)))
        for entry in fused:
            last = [c["total"] for c in contributions if c["doc"] == entry["doc"]][-1]
            self.assertEqual(entry["score"], last, "every running total ends at the fused score")
        self.assertEqual(fused[0]["ranks"], {"keyword": 3, "vector": 1})
        self.assertEqual(fused[1]["ranks"], {"keyword": 1, "vector": 4})


class ShippedApproachOnTheSameInput(unittest.TestCase):
    """The evaluation that separates the repair from the bug, on the same two lists."""

    def test_vector_first_merge_drops_the_error_table_from_the_prompt(self):
        shipped = shipped_order(RANKINGS)
        self.assertEqual(shipped, ["runbook rotate a key", "faq key expiry", "cli rotate-key", "errors E4031",
                                   "incident call", "scopes", "audit log"])
        self.assertEqual(shipped.index("errors E4031") + 1, 4, "fourth: outside a top-three prompt")
        fused = docs(fuse(RANKINGS, K))
        self.assertEqual(fused.index("errors E4031") + 1, 2, "second once both lists count")
        self.assertEqual(set(fused[:3]), {"runbook rotate a key", "errors E4031", "cli rotate-key"},
                         "the three documents both retrievers found fill the prompt")
        self.assertNotIn("errors E4031", shipped[:3])

    def test_k_softens_the_top_rank(self):
        lone_first = {"a": ["lone"], "b": ["other"]}
        two_seconds = {"a": ["x", "both"], "b": ["y", "both"]}
        with_k_zero = dict(fuse(lone_first, 0))["lone"], dict(fuse(two_seconds, 0))["both"]
        self.assertEqual(with_k_zero, (1.0, 1.0), "with k = 0 a lone first place ties two second places")
        with_k = dict(fuse(lone_first, K))["lone"], dict(fuse(two_seconds, K))["both"]
        self.assertEqual(with_k, (1 / 61, (0.0 + 1 / 62) + 1 / 62))
        self.assertGreater(with_k[1], with_k[0], "with k = 60 two second places beat a lone first place")


if __name__ == "__main__":
    unittest.main()
