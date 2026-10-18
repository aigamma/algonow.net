"""Practice: change one behavior of the worked example.

The worked solution reports which kept records have a twin among the
evaluation prompts, and leaves them in. Make dedupe remove them: a record
whose key is among the normalized evaluation keys is dropped as an
evaluation overlap, reported separately from the duplicates, and never kept.

Hint: build a set of the evaluation keys before the loop, one normalize call
per prompt. Inside the loop, right after the key is computed, test membership
with "in" and record the id in the overlaps list before continuing. The
duplicate rule stays as it is.

Expected: three kept (r1, r3, r8), two duplicates dropped (r4 and r7, both
twins of r1), and three overlaps removed (r2, r5, and r6, whose key is r2's).
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

RECORDS = [
    {"id": "r1", "prompt": "How do I rotate a key?",
     "answer": "Create a replacement key, deploy it, then revoke the old one."},
    {"id": "r2", "prompt": "Which scope do list calls need?",
     "answer": "The read scope covers list and get calls."},
    {"id": "r3", "prompt": "Can a lost key be recovered?",
     "answer": "No. Create a replacement and revoke the lost one."},
    {"id": "r4", "prompt": "how do i rotate a key",
     "answer": "Run rotate-key; it creates the replacement and schedules the revocation."},
    {"id": "r5", "prompt": "Where do I find my invoice?",
     "answer": "Open Billing, then Invoices; each month is a PDF."},
    {"id": "r6", "prompt": "which scope do LIST calls need",
     "answer": "List calls need the read scope."},
    {"id": "r7", "prompt": "How do I rotate a key ?",
     "answer": "Create a new key with the same scopes and retire the old one after seven days."},
    {"id": "r8", "prompt": "What does the write scope add?",
     "answer": "The write scope adds create and delete."},
]

EVAL_PROMPTS = [
    "which scope do list calls need",
    "How is usage billed?",
    "Where do I find my invoice?",
]


def normalize(text):
    """The key for a prompt: lowercase, letters and digits and spaces only,
    with any run of whitespace collapsed to one space."""
    lowered = text.lower()
    kept_chars = ""
    for char in lowered:
        if char.isalnum() or char.isspace():
            kept_chars = kept_chars + char
    return " ".join(kept_chars.split())


def dedupe(records, eval_prompts):
    """Keep the first record for each key, in order, and name the duplicates.
    The evaluation prompts are not used yet: your change goes here."""
    first_id = {}
    kept = []
    dropped = []
    overlaps = []
    for record in records:
        if "prompt" not in record:
            raise ValueError(f"record '{record['id']}' has no prompt")
        key = normalize(record["prompt"])
        if key == "":
            raise ValueError(f"record '{record['id']}' has an empty prompt")
        if key in first_id:
            dropped.append((record["id"], first_id[key]))
            continue
        first_id[key] = record["id"]
        kept.append(record)
    return kept, dropped, overlaps


if __name__ == "__main__":
    kept, dropped, overlaps = dedupe(RECORDS, EVAL_PROMPTS)
    if len(kept) != 3:
        print(f"NOT OK: expected 3 kept with the evaluation overlap removed, got {len(kept)} kept")
        print("Make dedupe drop a record whose key is among the evaluation keys.")
        sys.exit(1)
    print(f"{len(RECORDS)} records, {len(kept)} kept, {len(dropped)} duplicates dropped, {len(overlaps)} evaluation overlaps removed")
    print("\nkept:")
    for record in kept:
        print(f"  {record['id']}  {normalize(record['prompt'])}")
    print("\ndropped:")
    for dropped_id, kept_id in dropped:
        print(f"  {dropped_id} duplicates {kept_id}")
    print("\nremoved:")
    for overlap_id in overlaps:
        print(f"  {overlap_id} overlaps evaluation")
    if [record["id"] for record in kept] != ["r1", "r3", "r8"] or overlaps != ["r2", "r5", "r6"]:
        print("\nNOT OK: expected r1, r3, r8 kept and r2, r5, r6 removed as overlaps")
        sys.exit(1)
    print("\nOK")
