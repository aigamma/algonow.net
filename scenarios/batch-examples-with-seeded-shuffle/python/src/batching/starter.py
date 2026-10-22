"""Practice: change one behavior of the worked example.

The worked solution yields a shorter last batch when the examples do not
divide evenly. Make batches skip that ragged batch when drop_last is True,
so every batch it yields has exactly batch_size examples and the leftover
examples are left out of the epoch. Everything else stays the same.

Hint: build the slice into a name before yielding it. When drop_last is
True and the slice is shorter than batch_size, leave the loop with break
instead of yielding; it can only be the last slice.

Expected: with drop_last True each epoch yields two batches of four, eight
examples in all, and the demonstration names the two examples left out
(epoch 1: e3, e6; epoch 2: e4, e6).
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import random
import sys

EXAMPLES = [
    {"id": "e1", "label": "billing", "prompt": "Where is my invoice?"},
    {"id": "e2", "label": "billing", "prompt": "Why was I charged twice?"},
    {"id": "e3", "label": "billing", "prompt": "Change the card on file"},
    {"id": "e4", "label": "billing", "prompt": "Refund for last month"},
    {"id": "e5", "label": "billing", "prompt": "Is tax included?"},
    {"id": "e6", "label": "access", "prompt": "Reset my password"},
    {"id": "e7", "label": "access", "prompt": "Rotate an API key"},
    {"id": "e8", "label": "access", "prompt": "Add a teammate"},
    {"id": "e9", "label": "access", "prompt": "Which scope do list calls need?"},
    {"id": "e10", "label": "access", "prompt": "Revoke a lost key"},
]
BATCH_SIZE = 4
SEED = 7          # epoch 1 shuffles with the seed, epoch 2 with the seed plus one, and so on
EPOCHS = 2
DROP_LAST = True  # skip a final batch that is shorter than the batch size


def batches(examples, batch_size, seed, drop_last=False):
    """Yield the examples in a seeded random order, batch_size at a time.
    The last batch is shorter when the count does not divide evenly.
    drop_last is not used yet: your change goes here."""
    if batch_size < 1:
        raise ValueError(f"batch_size must be at least 1, got {batch_size}")
    order = list(examples)                # a copy: the caller's list is never reordered
    random.Random(seed).shuffle(order)    # the same seed always gives the same order
    for start in range(0, len(order), batch_size):
        yield order[start:start + batch_size]


def ids_of(batch):
    """The ids of a batch, in batch order."""
    ids = []
    for example in batch:
        ids.append(example["id"])
    return ids


def label_mix(batch):
    """How many examples of each label a batch holds, in order of first appearance."""
    counts = {}
    for example in batch:
        label = example["label"]
        counts[label] = counts.get(label, 0) + 1
    return counts


def describe(counts):
    """A dictionary of counts as one line: 'billing 3, access 1'."""
    parts = []
    for label, count in counts.items():
        parts.append(f"{label} {count}")
    return ", ".join(parts)


if __name__ == "__main__":
    all_ids = ids_of(EXAMPLES)
    epoch_sizes = []
    for epoch in range(EPOCHS):
        epoch_seed = SEED + epoch
        seen = []
        for batch in batches(EXAMPLES, BATCH_SIZE, epoch_seed, drop_last=DROP_LAST):
            seen.extend(ids_of(batch))
        epoch_sizes.append(len(seen))
    if epoch_sizes != [8, 8]:
        print(f"NOT OK: expected each epoch to yield 8 examples with drop_last={DROP_LAST}, got {epoch_sizes}")
        print("Make batches skip a final batch that is shorter than batch_size when drop_last is True.")
        sys.exit(1)

    print(f"{len(EXAMPLES)} examples, batch size {BATCH_SIZE}, seed {SEED}, {EPOCHS} epochs, drop_last {DROP_LAST}")
    for epoch in range(EPOCHS):
        epoch_seed = SEED + epoch
        print(f"\nepoch {epoch + 1} (seed {epoch_seed})")
        seen = []
        for number, batch in enumerate(batches(EXAMPLES, BATCH_SIZE, epoch_seed, drop_last=DROP_LAST), start=1):
            ids = ", ".join(ids_of(batch))
            print(f"  batch {number}: {ids:<17} {describe(label_mix(batch))}")
            seen.extend(ids_of(batch))
        left_out = []
        for example_id in all_ids:
            if example_id not in seen:
                left_out.append(example_id)
        print(f"  left out: {', '.join(left_out)}")
        assert len(seen) == 8 and len(left_out) == 2, "two full batches, two examples left out"

    kept_all = list(batches(EXAMPLES, BATCH_SIZE, SEED, drop_last=False))
    print(f"\nwith drop_last False the ragged batch is back: {[len(batch) for batch in kept_all]}")
    print("\nOK")
