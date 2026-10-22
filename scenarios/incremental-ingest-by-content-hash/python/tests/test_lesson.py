"""Checks of the worked example and the practice variation.

The first group runs the three lesson files by themselves, the way a learner
would, and compares what they print with the expected-output fixtures byte for
byte. The rest exercise the functions directly. Every expectation is exact:
the inputs are fixed strings and SHA-256 is deterministic."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from incremental_ingest import practice_answer
from incremental_ingest.solution import CURRENT_DOCS, PREVIOUS_DOCS, build_manifest, content_hash, ids_with, plan_ingest

PACKAGE = Path(__file__).resolve().parents[1] / "src" / "incremental_ingest"
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"   # the published test vector


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


def decisions(rows):
    return [(row["id"], row["decision"]) for row in rows]


class WorkedExample(unittest.TestCase):
    def test_solution_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("solution.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-output.txt"))

    def test_content_hash_is_deterministic_sensitive_and_standard(self):
        self.assertEqual(content_hash("abc"), ABC_SHA256)
        self.assertEqual(content_hash("List calls need the read scope."), content_hash("List calls need the read scope."))
        self.assertNotEqual(content_hash("List calls need the read scope."), content_hash("List calls need the read scope"))
        self.assertEqual(len(content_hash("")), 64)
        self.assertTrue(all(char in "0123456789abcdef" for char in content_hash("")))

    def test_plan_classifies_every_document(self):
        previous = build_manifest(PREVIOUS_DOCS)
        rows, manifest = plan_ingest(previous, CURRENT_DOCS)
        self.assertEqual(decisions(rows), [("d1", "unchanged"), ("d2", "changed"), ("d3", "unchanged"), ("d5", "unchanged"), ("d6", "new"), ("d4", "deleted")])
        for row in rows:
            if row["decision"] != "deleted":
                self.assertEqual(row["current"], manifest[row["id"]])
            if row["decision"] != "new":
                self.assertEqual(row["previous"], previous[row["id"]])
        self.assertEqual(ids_with(rows, "changed") + ids_with(rows, "new"), ["d2", "d6"])
        self.assertEqual(ids_with(rows, "deleted"), ["d4"])

    def test_manifest_covers_tonights_export_in_order(self):
        rows, manifest = plan_ingest(build_manifest(PREVIOUS_DOCS), CURRENT_DOCS)
        self.assertEqual(list(manifest), [doc["id"] for doc in CURRENT_DOCS])
        for doc in CURRENT_DOCS:
            self.assertEqual(manifest[doc["id"]], content_hash(doc["text"]))

    def test_empty_previous_manifest_means_everything_is_new(self):
        rows, manifest = plan_ingest({}, CURRENT_DOCS)
        self.assertEqual([row["decision"] for row in rows], ["new"] * len(CURRENT_DOCS))
        self.assertEqual(ids_with(rows, "deleted"), [])

    def test_identical_runs_plan_nothing(self):
        previous = build_manifest(PREVIOUS_DOCS)
        rows, manifest = plan_ingest(previous, PREVIOUS_DOCS)
        self.assertEqual([row["decision"] for row in rows], ["unchanged"] * len(PREVIOUS_DOCS))
        self.assertEqual(manifest, previous)

    def test_duplicate_id_is_rejected(self):
        with self.assertRaises(ValueError) as caught:
            plan_ingest(build_manifest(PREVIOUS_DOCS), CURRENT_DOCS + [{"id": "d3", "text": "again"}])
        self.assertIn("duplicate document id 'd3'", str(caught.exception))

    def test_inputs_are_not_modified(self):
        previous = build_manifest(PREVIOUS_DOCS)
        copies = (dict(previous), [dict(doc) for doc in CURRENT_DOCS])
        plan_ingest(previous, CURRENT_DOCS)
        self.assertEqual((previous, CURRENT_DOCS), copies)


class PracticeVariation(unittest.TestCase):
    def test_starter_reports_not_ok_as_shipped(self):
        result = run_alone("starter.py")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertTrue(result.stdout.startswith("NOT OK: expected d6 to be reported as moved from d4"), result.stdout)
        self.assertEqual(result.stderr, "", "the starter fails on purpose and without a traceback")

    def test_answer_prints_exactly_the_expected_output_when_run_alone(self):
        result = run_alone("practice_answer.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.replace("\r\n", "\n"), expected("expected-practice-output.txt"))

    def test_answer_reports_the_move_and_nothing_deleted(self):
        previous = build_manifest(PREVIOUS_DOCS)
        rows, manifest = practice_answer.plan_ingest(previous, CURRENT_DOCS, detect_moves=True)
        self.assertEqual(decisions(rows), [("d1", "unchanged"), ("d2", "changed"), ("d3", "unchanged"), ("d5", "unchanged"), ("d6", "moved")])
        moved = rows[4]
        self.assertEqual((moved["from"], moved["previous"], moved["current"]), ("d4", previous["d4"], manifest["d6"]))
        self.assertEqual(ids_with(rows, "deleted"), [])

    def test_answer_without_move_detection_matches_the_worked_plan(self):
        previous = build_manifest(PREVIOUS_DOCS)
        self.assertEqual(practice_answer.plan_ingest(previous, CURRENT_DOCS, detect_moves=False), plan_ingest(previous, CURRENT_DOCS))

    def test_answer_needs_an_exact_hash_match_for_a_move(self):
        previous = build_manifest(PREVIOUS_DOCS)
        near_copy = CURRENT_DOCS[:4] + [{"id": "d6", "text": "Invoices are under Billing, one PDF per month"}]
        rows, manifest = practice_answer.plan_ingest(previous, near_copy, detect_moves=True)
        self.assertEqual(decisions(rows)[4:], [("d6", "new"), ("d4", "deleted")], "one missing period is a different document")

    def test_answer_and_starter_differ_only_inside_the_marked_region(self):
        answer = (PACKAGE / "practice_answer.py").read_text(encoding="utf-8")
        starter = (PACKAGE / "starter.py").read_text(encoding="utf-8")
        self.assertEqual(answer.count("# --- answer begins ---"), 1)
        self.assertEqual(answer.count("# --- answer ends ---"), 1)

        def segment(source, start, end=None):
            return source[source.index(start):source.index(end) if end else None]

        self.assertEqual(segment(answer, "PREVIOUS_DOCS = [", "# --- answer begins ---"), segment(starter, "PREVIOUS_DOCS = [", "def plan_ingest"))
        self.assertEqual(segment(answer, "def ids_with"), segment(starter, "def ids_with"))


def derive_trace():
    """The worked plan and the practice plan from the lesson's own functions,
    with every hash in full. The animation's JavaScript port must reproduce it."""
    previous = build_manifest(PREVIOUS_DOCS)
    rows, manifest = plan_ingest(previous, CURRENT_DOCS)
    embed = ids_with(rows, "changed") + ids_with(rows, "new")
    delete = ids_with(rows, "deleted")
    skip = ids_with(rows, "unchanged")
    practice_rows, _ = practice_answer.plan_ingest(previous, CURRENT_DOCS, detect_moves=True)
    moved = ids_with(practice_rows, "moved")
    p_embed = ids_with(practice_rows, "changed") + ids_with(practice_rows, "new")
    p_delete = ids_with(practice_rows, "deleted")
    p_skip = ids_with(practice_rows, "unchanged")
    total = len(CURRENT_DOCS)
    return {
        "previous": previous,
        "rows": rows,
        "manifest": manifest,
        "plan": {"embed": embed, "delete": delete, "skip": skip},
        "counts": {"embed": len(embed), "delete": len(delete), "skip": len(skip), "total": total, "saved_percent": 100 * len(skip) // total},
        "practice": {"rows": practice_rows, "moved": moved, "plan": {"embed": p_embed, "delete": p_delete, "skip": p_skip},
                     "counts": {"embed": len(p_embed), "moved": len(moved), "delete": len(p_delete), "skip": len(p_skip),
                                "saved_percent": 100 * (len(p_skip) + len(moved)) // total}},
    }


class AnimationFixtures(unittest.TestCase):
    """The page's animation runs on documents.json (texts and their real hashes,
    because the browser model does not compute SHA-256 itself) and replays
    expected-trace.json; both are pinned to the lesson files here."""

    def test_documents_fixture_is_the_lesson_input(self):
        fixture = json.loads((FIXTURES / "documents.json").read_text(encoding="utf-8"))
        for key, docs in (("previous", PREVIOUS_DOCS), ("current", CURRENT_DOCS)):
            self.assertEqual([(entry["id"], entry["text"]) for entry in fixture[key]], [(doc["id"], doc["text"]) for doc in docs])
            for entry in fixture[key]:
                self.assertEqual(entry["sha256"], content_hash(entry["text"]))

    def test_expected_trace_is_what_the_solution_does(self):
        fixture = json.loads((FIXTURES / "expected-trace.json").read_text(encoding="utf-8"))
        trace = derive_trace()
        self.assertEqual(fixture, trace)
        self.assertEqual(trace["counts"], {"embed": 2, "delete": 1, "skip": 3, "total": 5, "saved_percent": 60})
        self.assertEqual(trace["practice"]["counts"], {"embed": 1, "moved": 1, "delete": 0, "skip": 3, "saved_percent": 80})
        self.assertEqual(trace["rows"][4]["current"], trace["rows"][5]["previous"], "d6 carries d4's hash")


class FullReingestOnTheSameDocuments(unittest.TestCase):
    """The evaluation that separates the repair from what shipped, on the five documents."""

    def test_full_reingest_embeds_everything_while_the_plan_embeds_two(self):
        rows, manifest = plan_ingest(build_manifest(PREVIOUS_DOCS), CURRENT_DOCS)
        embed = ids_with(rows, "changed") + ids_with(rows, "new")
        self.assertEqual(len(CURRENT_DOCS), 5, "the nightly job that shipped embedded all five")
        self.assertEqual(embed, ["d2", "d6"])
        self.assertEqual(100 * (len(CURRENT_DOCS) - len(embed)) // len(CURRENT_DOCS), 60)
        for row in rows:
            if row["decision"] == "changed":
                self.assertNotEqual(row["previous"], row["current"], "a changed document is never skipped")
            if row["decision"] == "unchanged":
                self.assertEqual(row["previous"], row["current"])

    def test_applying_the_plan_to_the_previous_manifest_reproduces_the_new_manifest(self):
        previous = build_manifest(PREVIOUS_DOCS)
        rows, manifest = plan_ingest(previous, CURRENT_DOCS)
        rebuilt = dict(previous)
        for row in rows:
            if row["decision"] == "deleted":
                del rebuilt[row["id"]]
            elif row["decision"] in ("changed", "new"):
                rebuilt[row["id"]] = row["current"]
        self.assertEqual(rebuilt, manifest, "skip, embed, and delete together turn the old manifest into the new one")


if __name__ == "__main__":
    unittest.main()
