"""Practice: change one behavior of the worked example.

The worked solution only takes records away: labels over the cap are
sampled down and smaller labels are left as they are, so outage still has
two records against three for the others. Make balance lift every label
below FLOOR by repeating records: while a label has fewer kept records than
the floor, pick one of its kept records at random with the seeded generator
and append it again. A repeated record keeps its id and is reported as a
repeat. Everything else stays the same.

Hint: after downsample, group the kept records by label and count them.
Create random.Random(seed) once. For each label in sorted order, loop while
its count is below the floor: rng.choice(group) picks one record, append it
to kept, append its id to repeats, and add one to the count.

Expected: outage gains one repeat (which record it is depends on the seed:
the completed answer prints it), every label ends at three, nine records
in all. Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import random
import sys
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
FLOOR = 3     # the fewest records any one label may end with (practice)


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


def balance(records, cap, floor, seed):
    """Downsample, then lift every label below the floor by repeating records.
    Returns the kept records (originals in input order, then the repeats),
    the dropped ids, and the ids of the repeats. The floor is not used yet:
    your change goes here."""
    kept, dropped = downsample(records, cap, seed)
    repeats = []
    return kept, dropped, repeats


if __name__ == "__main__":
    before = count_labels(RECORDS)
    kept, dropped, repeats = balance(RECORDS, CAP, FLOOR, SEED)
    after = count_labels(kept)
    if min(after.values()) < FLOOR or len(repeats) != 1:
        print(f"NOT OK: expected every label lifted to the floor of {FLOOR} with one repeat, got {dict(after)} and {len(repeats)} repeats")
        print("Make balance repeat a seeded random pick of a label until that label reaches the floor.")
        sys.exit(1)
    print(f"{len(RECORDS)} records, cap {CAP} per label, floor {FLOOR}, seed {SEED}")
    print(f"\n{'label':<9}{'before':>7}{'after':>7}")
    for label in sorted(before):
        print(f"{label:<9}{before[label]:>7}{after[label]:>7}")
    listed = []
    for record in kept:
        if len(listed) >= len(kept) - len(repeats):
            listed.append(record["id"] + " (repeat)")
        else:
            listed.append(record["id"])
    print(f"\nkept {len(kept)}, input order then repeats: {', '.join(listed)}")
    print(f"dropped {len(dropped)}: {', '.join(dropped)}")
    print(f"repeats {len(repeats)}: {', '.join(repeats)}")
    biggest = max(after.values())
    print(f"\nalways answering one label is right at most {biggest} of {len(kept)} times ({100 * biggest / len(kept):.0f}%) after")

    try:
        balance([{"id": "r13", "text": "no label at all"}], CAP, FLOOR, SEED)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if repeats != ["r10"] or len(kept) != 9:
        print(f"\nNOT OK: expected one repeat of r10 and nine kept records, got {repeats} and {len(kept)}")
        sys.exit(1)
    print("\nOK")
