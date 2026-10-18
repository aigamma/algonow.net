"""Worked example: split a fine-tuning set by hashing ids so the split never moves.

Orbit fine-tunes a small support model on transcripts. New transcripts arrive
every week, and the training job used to shuffle everything and cut the first
fifth off as validation. Each week the shuffle dealt a different hand: a
transcript scored in validation this week had been trained on last week, and
the validation numbers jumped for reasons that had nothing to do with the
model. This file assigns each transcript by a hash of its id instead. The same
id lands in the same bucket on every machine and every run, so adding
transcripts never moves the ones already assigned.

Input: transcript ids, one per record, in arrival order. Output: a dictionary
with two lists, "train" and "validation", each in input order.
Run alone: python solution.py
"""
import hashlib
import random

VALIDATION_SHARE = 20   # buckets 0 to 19 of 100: about one record in five

WEEK_ONE = ["t-1813", "t-1814", "t-1815", "t-1816", "t-1817", "t-1818"]
WEEK_TWO = ["t-1819", "t-1820"]
SEED = 7   # the seeded shuffle that shipped, kept here for comparison


def bucket(record_id):
    """A number from 0 to 99 that depends only on the id: the same on every machine, every run."""
    digest = hashlib.sha256(record_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


def side_of(record_id, validation_share):
    """Validation when the bucket is below the share, train otherwise."""
    if bucket(record_id) < validation_share:
        return "validation"
    return "train"


def assign(ids, validation_share):
    """Sort ids into train and validation, keeping input order on each side."""
    sides = {"train": [], "validation": []}
    for record_id in ids:
        if record_id == "":
            raise ValueError("an empty id cannot be assigned")
        if record_id in sides["train"] or record_id in sides["validation"]:
            raise ValueError(f"duplicate id '{record_id}'")
        sides[side_of(record_id, validation_share)].append(record_id)
    return sides


def shuffle_split(ids, validation_share, seed):
    """What shipped: shuffle a copy with a fixed seed and take the first share as validation."""
    order = list(ids)
    random.Random(seed).shuffle(order)
    count = max(1, round(len(order) * validation_share / 100))
    return order[:count]


if __name__ == "__main__":
    print(f"validation share: {VALIDATION_SHARE} of 100 buckets")

    first = assign(WEEK_ONE, VALIDATION_SHARE)
    print(f"\nweek 1: {len(WEEK_ONE)} transcripts")
    for record_id in WEEK_ONE:
        print(f"{record_id}  bucket {bucket(record_id):2}  {side_of(record_id, VALIDATION_SHARE)}")
    print(f"train {len(first['train'])}, validation {len(first['validation'])}")

    both = assign(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE)
    print(f"\nweek 2: {len(WEEK_TWO)} more transcripts")
    for record_id in WEEK_TWO:
        print(f"{record_id}  bucket {bucket(record_id):2}  {side_of(record_id, VALIDATION_SHARE)}")
    moved = []
    for record_id in WEEK_ONE:
        if (record_id in first["validation"]) != (record_id in both["validation"]):
            moved.append(record_id)
    if moved:
        print("moved: " + ", ".join(moved))
    else:
        print(f"unchanged: all {len(WEEK_ONE)} earlier assignments")

    print(f"\nseeded shuffle for comparison (seed {SEED}, same {VALIDATION_SHARE}%)")
    one = shuffle_split(WEEK_ONE, VALIDATION_SHARE, SEED)
    two = shuffle_split(WEEK_ONE + WEEK_TWO, VALIDATION_SHARE, SEED)
    print("week 1 validation: " + ", ".join(sorted(one)))
    print("week 2 validation: " + ", ".join(sorted(two)))
    changes = []
    for record_id in WEEK_ONE:
        if record_id in one and record_id not in two:
            changes.append(f"{record_id} left validation")
        if record_id not in one and record_id in two:
            changes.append(f"{record_id} joined validation")
    print("moved: " + ", ".join(changes))

    try:
        assign(["t-1813", "t-1813"], VALIDATION_SHARE)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(both["train"]) + len(both["validation"]) == len(WEEK_ONE) + len(WEEK_TWO), "every id on one side"
    assert moved == [], "adding transcripts must not move earlier ones"
    assert changes != [], "the shuffle is shown moving a transcript"
    print("\nOK")
