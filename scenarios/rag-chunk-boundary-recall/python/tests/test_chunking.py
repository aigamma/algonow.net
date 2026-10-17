"""Structural checks on a chunker: exact expectations, no randomness.
RAG_CHUNKER selects the module under test (default: the reference solution)."""
import importlib
import os
import re
import unittest

from rag_chunking.pipeline import MAX_CHARS, Document, load_runbooks

CHUNKER = importlib.import_module(os.environ.get("RAG_CHUNKER", "rag_chunking.solution"))
chunk_document = CHUNKER.chunk_document
RUNBOOKS = load_runbooks()
PROCEDURE = re.compile(r"(?m)^(?:\d+\. .*(?:\n|$))+")   # consecutive numbered lines


def squash(text):
    return " ".join(text.split())


class ChunkStructure(unittest.TestCase):
    def test_offsets_reproduce_every_chunk_body(self):
        for doc in RUNBOOKS:
            chunks = chunk_document(doc)
            self.assertTrue(chunks, doc.id)
            previous = -1
            for chunk in chunks:
                self.assertEqual(chunk.doc_id, doc.id)
                self.assertLess(chunk.start, chunk.end)
                self.assertEqual(doc.text[chunk.start:chunk.end], chunk.body)
                self.assertTrue(chunk.body.strip(), "empty chunk")
                self.assertGreater(chunk.start, previous, "chunks must be in document order")
                self.assertTrue(chunk.text.endswith(chunk.body))
                previous = chunk.start

    def test_every_chunk_fits_the_prompt_budget(self):
        for doc in RUNBOOKS:
            for chunk in chunk_document(doc):
                self.assertLessEqual(len(chunk.text), MAX_CHARS, chunk.text[:60])

    def test_numbered_procedures_are_never_split(self):
        for doc in RUNBOOKS:
            bodies = [squash(c.body) for c in chunk_document(doc)]
            procedures = PROCEDURE.findall(doc.text)
            self.assertGreaterEqual(len(procedures), 2, doc.id)
            for block in procedures:
                wanted = squash(block)
                self.assertTrue(any(wanted in body for body in bodies),
                                f"{doc.id}: a boundary cut the procedure starting {wanted[:40]!r}")

    def test_chunks_carry_their_heading_trail(self):
        doc = next(d for d in RUNBOOKS if d.id == "api-keys")
        chunks = chunk_document(doc)
        rotate = next(c for c in chunks if "revocation date" in c.body)
        self.assertEqual(rotate.breadcrumb, "API keys > Rotate a key without downtime")
        self.assertTrue(rotate.text.startswith("API keys > Rotate a key without downtime\n"))
        self.assertEqual(chunks[0].breadcrumb, "API keys", "intro text carries only the title")
        for chunk in chunks:
            self.assertNotIn("#", chunk.body, "heading lines are context, not body")

    def test_oversized_paragraph_is_split_at_sentence_boundaries(self):
        sentences = [f"Sentence number {i} says something about the export job and then stops."
                     for i in range(1, 21)]
        doc = Document("long", "Long", "# Long\n\n" + " ".join(sentences) + "\n")
        chunks = chunk_document(doc, max_chars=200)
        self.assertGreater(len(chunks), 3)
        covered = set()
        for chunk in chunks:
            self.assertLessEqual(len(chunk.text), 200)
            self.assertEqual(doc.text[chunk.start:chunk.end], chunk.body)
            self.assertRegex(chunk.body, r"[.!?]$", "cuts must land on sentence ends")
            self.assertFalse(chunk.body[0].isspace())
            covered.update(range(chunk.start, chunk.end))
        for index in range(doc.text.index("Sentence"), len(doc.text)):
            if not doc.text[index].isspace():
                self.assertIn(index, covered, f"character {index} was lost")

    def test_windows_line_endings_do_not_corrupt_offsets(self):
        original = next(d for d in RUNBOOKS if d.id == "webhooks")
        crlf = Document(original.id, original.title, original.text.replace("\n", "\r\n"))
        self.assertEqual([squash(c.body) for c in chunk_document(crlf)],
                         [squash(c.body) for c in chunk_document(original)])
        for chunk in chunk_document(crlf):
            self.assertEqual(crlf.text[chunk.start:chunk.end], chunk.body)

    def test_chunking_is_deterministic(self):
        for doc in RUNBOOKS:
            self.assertEqual(chunk_document(doc), chunk_document(doc))


class ChunkerRejectsBadInput(unittest.TestCase):
    def test_empty_document_yields_no_chunks(self):
        self.assertEqual(chunk_document(Document("empty", "Empty", "")), [])
        self.assertEqual(chunk_document(Document("blank", "Blank", "\n\n   \n")), [])

    def test_invalid_budget_and_text_fail_loudly(self):
        doc = RUNBOOKS[0]
        for bad in (0, -5, 10, True, 2.5):
            with self.assertRaises((ValueError, TypeError), msg=repr(bad)):
                chunk_document(doc, max_chars=bad)
        with self.assertRaises(TypeError):
            chunk_document(Document("bytes", "Bytes", b"not text"))

    def test_heading_only_document_has_nothing_to_index(self):
        self.assertEqual(chunk_document(Document("h", "H", "# Title\n\n## Empty section\n")), [])


if __name__ == "__main__":
    unittest.main()
