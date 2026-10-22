"""Worked example: balance a skewed label set by capping each class with a seeded sample.

Orbit's intent classifier was fine-tuned on a support export in which seven
of every twelve records were billing questions, so the model learned to
answer "billing" to everything and still scored well on its own skewed test
set. This file caps every label at a fixed number of records: labels over
the cap keep a seeded random sample, smaller labels keep every record, and
the survivors go back into their original order so the run is repeatable
and reviewable.

Input: records in export order, each a dictionary with an id, a label, and
the customer's text. Output: the kept records in input order and the ids
that were dropped. Run alone: python solution.py
"""
import random
from collections import Counter

RECORDS = [
    {"id": "r1", "label": "billing", "text": "Why was I charged twice this month?"},
    {"id": "r2", "label": "access", "text": "I cannot log in after the password reset."},
    {"id": "r3", "label": "billing", "text": "How do I download last month's invoice?"},
    {"id": "r4", "label": "billing", "text": "Can you refund the duplicate payment?"},
    {"id": "r5", "label": "outage", "text": "The dashboard has been down since noon."},
    {"id": "r6", "label": "billing", "text": "Which plan am I on and what does it cost?"},
    {"id": "r7", "label": "access", "text": "My API key says it is not active."},
    {"id": "r8", "label": "billing", "text": "Does the price include tax?"},
    {"id": "r9", "label": "billing", "text": "Update the card on file for my account."},
    {"id": "r10", "label": "outage", "text": "Uploads fail with a gateway error."},
    {"id": "r11", "label": "access", "text": "Add a teammate to the workspace."},
    {"id": "r12", "label": "billing", "text": "Where can I see my usage this cycle?"},
]
CAP = 3       # the most records any one label may keep
SEED = 11     # the seed makes the sample the same on every run


def label_of(record):
    """The record's label; a record without one is a data error, not a class."""
    if "label" not in record:
        raise ValueError(f"record '{record['id']}' has no label")
    return record["label"]


def count_labels(records):
    """How many records carry each label."""
    counts = Counter()
    for record in records:
        counts[label_of(record)] += 1
    return counts


def group_by_label(records):
    """A dictionary from each label to its records, in input order."""
    groups = {}
    for record in records:
        label = label_of(record)
        if label not in groups:
            groups[label] = []
        groups[label].append(record)
    return groups


def ids_of(records):
    """The ids of some records, in their order."""
    ids = []
    for record in records:
        ids.append(record["id"])
    return ids


def downsample(records, cap, seed):
    """Keep at most cap records per label: a seeded sample for a label over the
    cap, every record for the rest. Returns the kept records in input order
    and the dropped ids, also in input order."""
    if cap < 1:
        raise ValueError(f"cap must be at least 1, got {cap}")
    groups = group_by_label(records)
    rng = random.Random(seed)
    kept = []
    for label in sorted(groups):
        group = groups[label]
        if len(group) <= cap:
            kept.extend(group)
        else:
            kept.extend(rng.sample(group, cap))

    position = {}
    for index, record in enumerate(records):
        position[record["id"]] = index

    def by_position(record):
        return position[record["id"]]

    kept.sort(key=by_position)
    kept_ids = set(ids_of(kept))
    dropped = []
    for record in records:
        if record["id"] not in kept_ids:
            dropped.append(record["id"])
    return kept, dropped


if __name__ == "__main__":
    before = count_labels(RECORDS)
    kept, dropped = downsample(RECORDS, CAP, SEED)
    after = count_labels(kept)
    print(f"{len(RECORDS)} records, cap {CAP} per label, seed {SEED}")
    print(f"\n{'label':<9}{'before':>7}{'after':>7}")
    for label in sorted(before):
        print(f"{label:<9}{before[label]:>7}{after[label]:>7}")
    print(f"\nkept {len(kept)}, input order: {', '.join(ids_of(kept))}")
    print(f"dropped {len(dropped)}: {', '.join(dropped)}")
    top_label, top_count = before.most_common(1)[0]
    after_label, after_count = after.most_common(1)[0]
    print(f"\nalways answering '{top_label}' is right {top_count} of {len(RECORDS)} times"
          f" ({100 * top_count / len(RECORDS):.0f}%) before, {after_count} of {len(kept)}"
          f" ({100 * after_count / len(kept):.0f}%) after")
    again, _ = downsample(RECORDS, CAP, SEED)
    print(f"same seed, same sample: {ids_of(again) == ids_of(kept)}")

    try:
        downsample([{"id": "r13", "text": "no label at all"}], CAP, SEED)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(kept) == 8 and len(dropped) == 4, "eight kept, four dropped"
    assert after["billing"] == CAP and after["access"] == 3 and after["outage"] == 2, "billing capped, the rest whole"
    assert ids_of(kept) == ["r2", "r5", "r6", "r7", "r8", "r10", "r11", "r12"], "kept records keep their input order"
    assert dropped == ["r1", "r3", "r4", "r9"], "every dropped record is a billing record"
    print("\nOK")
