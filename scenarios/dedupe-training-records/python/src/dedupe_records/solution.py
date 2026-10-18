"""Worked example: deduplicate a training set with normalized keys and a set.

A fine-tuning set was exported from the ticket system over six months. The
same question appears again and again with different capitalization,
spacing, and trailing punctuation, so the model learned a few answers by
heart and little else. Three of the evaluation questions are in the set
too, so the evaluation score was a lie. This file turns each prompt into a
normalized key, keeps the first record per key, names what it drops, and
reports which evaluation prompts have a twin in the training set.

Input: records in export order, each a dictionary with an id, a prompt, and
an answer. Output: the kept records, (dropped id, kept id) pairs for the
rest, and the ids of kept records that overlap the evaluation prompts.
Run alone: python solution.py
"""

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


def dedupe(records):
    """Keep the first record for each key, in order. Return the kept records
    and a (dropped id, kept id) pair for every later record with the same key."""
    first_id = {}
    kept = []
    dropped = []
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
    return kept, dropped


def evaluation_overlap(kept, eval_prompts):
    """The ids of kept records whose key also appears among the evaluation prompts."""
    training_keys = set()
    id_for_key = {}
    for record in kept:
        key = normalize(record["prompt"])
        training_keys.add(key)
        id_for_key[key] = record["id"]
    eval_keys = set()
    for prompt in eval_prompts:
        eval_keys.add(normalize(prompt))
    overlap = []
    for key in training_keys & eval_keys:
        overlap.append(id_for_key[key])
    return sorted(overlap)


if __name__ == "__main__":
    kept, dropped = dedupe(RECORDS)
    print(f"{len(RECORDS)} records, {len(kept)} kept, {len(dropped)} dropped")
    print("\nkept:")
    for record in kept:
        print(f"  {record['id']}  {normalize(record['prompt'])}")
    print("\ndropped:")
    for dropped_id, kept_id in dropped:
        print(f"  {dropped_id} duplicates {kept_id}")

    overlap = evaluation_overlap(kept, EVAL_PROMPTS)
    print(f"\nevaluation overlap: {len(overlap)} of {len(EVAL_PROMPTS)} evaluation prompts have a training twin: {', '.join(overlap)}")

    try:
        dedupe([{"id": "r9", "prompt": "???", "answer": "x"}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(kept) == 5 and len(dropped) == 3, "five kept, three dropped"
    assert dropped == [("r4", "r1"), ("r6", "r2"), ("r7", "r1")], "every drop names its twin"
    assert overlap == ["r2", "r5"], "two evaluation prompts have a twin"
    print("\nOK")
