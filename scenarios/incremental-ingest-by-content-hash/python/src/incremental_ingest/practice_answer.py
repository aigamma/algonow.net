"""Answer to the practice variation: a new id whose hash equals a deleted
document's hash is a move, not a new document. Everything outside the marked
region is the practice starter, unchanged. Run alone: python practice_answer.py
"""
import hashlib
import sys

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


# --- answer begins ---
def plan_ingest(previous, docs, detect_moves=True):
    """Compare tonight's documents with the previous manifest.
    Returns one row per document (its decision and both hashes) and the new manifest.
    With detect_moves, a new id whose hash equals a deleted document's hash is a move."""
    manifest = build_manifest(docs)
    deleted = sorted(set(previous) - set(manifest))
    moved_from = {}                      # hash of a deleted document -> its old id
    if detect_moves:
        for old_id in deleted:
            moved_from[previous[old_id]] = old_id
    rows = []
    for doc_id in manifest:
        current = manifest[doc_id]
        if doc_id in previous and previous[doc_id] == current:
            rows.append({"id": doc_id, "decision": "unchanged", "previous": current, "current": current})
        elif doc_id in previous:
            rows.append({"id": doc_id, "decision": "changed", "previous": previous[doc_id], "current": current})
        elif current in moved_from:
            old_id = moved_from[current]
            rows.append({"id": doc_id, "decision": "moved", "previous": current, "current": current, "from": old_id})
            deleted.remove(old_id)       # the old id lives on under the new one
        else:
            rows.append({"id": doc_id, "decision": "new", "previous": None, "current": current})
    for old_id in deleted:
        rows.append({"id": old_id, "decision": "deleted", "previous": previous[old_id], "current": None})
    return rows, manifest
# --- answer ends ---


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
    rows, manifest = plan_ingest(previous, CURRENT_DOCS, detect_moves=True)
    moves = []
    for row in rows:
        if row["decision"] == "moved":
            moves.append(f"{row['from']} -> {row['id']}")
    if moves == []:
        print("NOT OK: expected d6 to be reported as moved from d4 (the same hash under a new id), got new plus deleted")
        print("Make plan_ingest look each new document's hash up among the deleted documents' hashes.")
        sys.exit(1)
    print(f"previous manifest: {len(previous)} documents; current export: {len(CURRENT_DOCS)} documents\n")
    print(f"{'id':<3} {'decision':<9}  {'previous hash':<13}  current hash")
    for row in rows:
        line = f"{row['id']:<3} {row['decision']:<9}  {short(row['previous']):<13}  {short(row['current'])}"
        if row["decision"] == "moved":
            line = line + f"  (from {row['from']})"
        print(line)

    embed = ids_with(rows, "changed") + ids_with(rows, "new")
    delete = ids_with(rows, "deleted")
    skip = ids_with(rows, "unchanged")
    saved = len(skip) + len(moves)
    print(f"\nplan: embed {len(embed)} ({named(embed)}), move {len(moves)} ({named(moves)}), delete {len(delete)} ({named(delete)}), skip {len(skip)} ({named(skip)})")
    print(f"saved: {saved} of {len(CURRENT_DOCS)} embeddings ({100 * saved // len(CURRENT_DOCS)}%)")
    print(f"new manifest: {len(manifest)} entries, saved for the next run")

    if moves != ["d4 -> d6"] or delete != [] or embed != ["d2"]:
        print("\nNOT OK: expected d6 moved from d4, nothing deleted, and only d2 to embed")
        sys.exit(1)
    print("\nOK")
