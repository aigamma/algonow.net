"""Worked example: batch training examples with a seeded shuffle and a generator.

Orbit's fine-tuning script fed its examples in file order. The export was
sorted by label, so every early batch held a single label and the model's
loss swung with each one, and the ragged last batch crashed a shape check
that assumed every batch was full. This file yields batches from a seeded
shuffle: the same seed always gives the same order, each epoch gets its own
seed, the caller's list is never reordered, and the last batch is simply
shorter.

Input: ten labeled examples, a batch size, a seed, and an epoch count.
Output: the batches of each epoch, with the label mix of every batch.
Run alone: python solution.py
"""
import random

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


def batches(examples, batch_size, seed):
    """Yield the examples in a seeded random order, batch_size at a time.
    The last batch is shorter when the count does not divide evenly."""
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
    print(f"{len(EXAMPLES)} examples, batch size {BATCH_SIZE}, seed {SEED}, {EPOCHS} epochs")
    for epoch in range(EPOCHS):
        epoch_seed = SEED + epoch
        print(f"\nepoch {epoch + 1} (seed {epoch_seed})")
        seen = []
        for number, batch in enumerate(batches(EXAMPLES, BATCH_SIZE, epoch_seed), start=1):
            ids = ", ".join(ids_of(batch))
            print(f"  batch {number}: {ids:<17} {describe(label_mix(batch))}")
            seen.extend(ids_of(batch))
        assert sorted(seen) == sorted(ids_of(EXAMPLES)), "every example appears exactly once per epoch"

    first = list(batches(EXAMPLES, BATCH_SIZE, SEED))
    again = list(batches(EXAMPLES, BATCH_SIZE, SEED))
    print(f"\nsame seed, same batches: {first == again}")
    print(f"input order unchanged: {ids_of(EXAMPLES) == ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10']}")

    try:
        list(batches(EXAMPLES, 0, SEED))
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert first == again, "a seed must reproduce its batches"
    assert [len(batch) for batch in first] == [4, 4, 2], "two full batches and a ragged last one"
    assert first != list(batches(EXAMPLES, BATCH_SIZE, SEED + 1)), "the next epoch uses a different order"
    print("\nOK")
