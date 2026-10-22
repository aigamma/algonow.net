"""Worked example: re-ingest only what changed by hashing each document's content.

Orbit re-embedded its whole knowledge base every night: hours of compute and
provider spend, although most documents never change from one day to the
next. This file hashes the text of every document in tonight's export,
compares each hash with the manifest the previous run saved, and plans the
work: embed the changed and new documents, delete the vectors of documents
that disappeared, and skip everything else.

Input: the previous run's manifest (document id to content hash) and the
current export (document id and text). Output: one decision per document,
the plan, and the manifest to save for tomorrow. Run alone: python solution.py
"""
import hashlib

# The documents as the previous run saw them. In production the previous run
# saves only its manifest (ids and hashes) as a small JSON file; the texts are
# here so this file can compute that manifest honestly and run on its own.
PREVIOUS_DOCS = [
    {"id": "d1", "text": "Rotate an API key: create the replacement, deploy it, then revoke the old key."},
    {"id": "d2", "text": "List calls need the read scope."},
    {"id": "d3", "text": "A lost key cannot be recovered. Create a replacement and revoke the lost one."},
    {"id": "d4", "text": "Invoices are under Billing, one PDF per month."},
    {"id": "d5", "text": "The write scope adds create and delete."},
]

# Tonight's export: d2 was edited, d4 is gone, and the billing page came back
# under a new id after it was moved to another section.
CURRENT_DOCS = [
    {"id": "d1", "text": "Rotate an API key: create the replacement, deploy it, then revoke the old key."},
    {"id": "d2", "text": "List and get calls need the read scope."},
    {"id": "d3", "text": "A lost key cannot be recovered. Create a replacement and revoke the lost one."},
    {"id": "d5", "text": "The write scope adds create and delete."},
    {"id": "d6", "text": "Invoices are under Billing, one PDF per month."},
]


def content_hash(text):
    """The SHA-256 of the text as sixty-four hex characters: same text, same hash."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_manifest(docs):
    """A dictionary from document id to the hash of its text, in export order."""
    manifest = {}
    for doc in docs:
        if doc["id"] in manifest:
            raise ValueError(f"duplicate document id '{doc['id']}'")
        manifest[doc["id"]] = content_hash(doc["text"])
    return manifest


def plan_ingest(previous, docs):
    """Compare tonight's documents with the previous manifest.
    Returns one row per document (its decision and both hashes) and the new manifest."""
    manifest = build_manifest(docs)
    rows = []
    for doc_id in manifest:
        current = manifest[doc_id]
        if doc_id not in previous:
            rows.append({"id": doc_id, "decision": "new", "previous": None, "current": current})
        elif previous[doc_id] == current:
            rows.append({"id": doc_id, "decision": "unchanged", "previous": current, "current": current})
        else:
            rows.append({"id": doc_id, "decision": "changed", "previous": previous[doc_id], "current": current})
    for old_id in sorted(set(previous) - set(manifest)):
        rows.append({"id": old_id, "decision": "deleted", "previous": previous[old_id], "current": None})
    return rows, manifest


def ids_with(rows, decision):
    """The ids of the rows that got this decision, in row order."""
    found = []
    for row in rows:
        if row["decision"] == decision:
            found.append(row["id"])
    return found


def short(hash_value):
    """The first twelve characters of a hash for printing, or (none)."""
    if hash_value is None:
        return "(none)"
    return hash_value[:12]


def named(ids):
    """A comma-separated list of ids, or the word none."""
    if ids == []:
        return "none"
    return ", ".join(ids)


if __name__ == "__main__":
    previous = build_manifest(PREVIOUS_DOCS)      # in production: the JSON the last run saved
    rows, manifest = plan_ingest(previous, CURRENT_DOCS)
    print(f"previous manifest: {len(previous)} documents; current export: {len(CURRENT_DOCS)} documents\n")
    print(f"{'id':<3} {'decision':<9}  {'previous hash':<13}  current hash")
    for row in rows:
        print(f"{row['id']:<3} {row['decision']:<9}  {short(row['previous']):<13}  {short(row['current'])}")

    embed = ids_with(rows, "changed") + ids_with(rows, "new")
    delete = ids_with(rows, "deleted")
    skip = ids_with(rows, "unchanged")
    print(f"\nplan: embed {len(embed)} ({named(embed)}), delete {len(delete)} ({named(delete)}), skip {len(skip)} ({named(skip)})")
    print(f"saved: {len(skip)} of {len(CURRENT_DOCS)} embeddings ({100 * len(skip) // len(CURRENT_DOCS)}%)")
    print(f"new manifest: {len(manifest)} entries, saved for the next run")

    try:
        plan_ingest(previous, CURRENT_DOCS + [{"id": "d1", "text": "a second copy of d1"}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert skip == ["d1", "d3", "d5"], "three documents are unchanged"
    assert embed == ["d2", "d6"] and delete == ["d4"], "re-embed d2 and d6, delete d4"
    assert len(manifest) == len(CURRENT_DOCS), "the new manifest covers tonight's export"
    print("\nOK")
