"""Practice: change one behavior of the worked example.

The trainer accepts rows of at most MAX_LEN positions, and the first example
is twelve positions long. Make fit keep at most MAX_LEN positions by dropping
prompt tokens from the left, so the completion and its end-of-sequence token
always survive. A completion that cannot fit on its own must be rejected with
a ValueError. Everything else stays the same.

Hint: a row that already fits comes back unchanged. Otherwise count the
prompt positions with labels.count(IGNORE); the trained positions are the
rest, and when there are more of them than max_len, raise. A negative slice,
ids[-max_len:], keeps the last max_len items of a list; apply the same slice
to the labels so the two stay aligned.

Expected: example one drops two prompt tokens and example three drops one,
the batch is padded to ten positions instead of twelve, and the twenty
trained tokens are all still there. Run alone: python starter.py
(it prints NOT OK until the change is made)
"""
import sys

EXAMPLES = [
    {"prompt": "how do i reset my password", "completion": "use the forgot password link"},
    {"prompt": "where is my invoice", "completion": "open billing and choose invoices"},
    {"prompt": "cancel my plan", "completion": "go to billing and choose cancel plan"},
]
PAD = 0             # the padding id; its label is ignored too
EOS = 1             # end of sequence: the model must learn to stop, so it is trained
IGNORE = -100       # the label the loss skips, by convention of the training frameworks
MAX_LEN = 10        # the longest row the trainer accepts


def encode(text, vocab):
    """Word ids from a shared vocabulary, assigning the next id to a new word."""
    ids = []
    for word in text.split():
        if word not in vocab:
            vocab[word] = len(vocab) + 2      # 0 and 1 are reserved for pad and eos
        ids.append(vocab[word])
    return ids


def build_labels(example, vocab):
    """One training row: input ids for prompt plus completion plus eos, and
    labels that ignore the prompt. Returns (ids, labels)."""
    prompt_ids = encode(example["prompt"], vocab)
    completion_ids = encode(example["completion"], vocab)
    if not completion_ids:
        raise ValueError(f"nothing to train on: empty completion for prompt {example['prompt']!r}")
    ids = prompt_ids + completion_ids + [EOS]
    labels = [IGNORE] * len(prompt_ids) + completion_ids + [EOS]   # same length as ids
    return ids, labels


def fit(ids, labels, max_len):
    """Keep at most max_len positions by dropping prompt tokens from the left.
    Not written yet: as shipped the row comes back unchanged."""
    return ids, labels


def pad_batch(rows):
    """Pad every (ids, labels) row to the longest with the pad id and the
    ignore label, and build the attention mask: 1 for a real token, 0 for pad."""
    longest = 0
    for ids, labels in rows:
        longest = max(longest, len(ids))
    padded = []
    for ids, labels in rows:
        missing = longest - len(ids)
        padded.append((ids + [PAD] * missing, labels + [IGNORE] * missing, [1] * len(ids) + [0] * missing))
    return padded


if __name__ == "__main__":
    vocab = {}
    rows = []
    dropped = []
    for example in EXAMPLES:
        ids, labels = build_labels(example, vocab)
        kept_ids, kept_labels = fit(ids, labels, MAX_LEN)
        rows.append((kept_ids, kept_labels))
        dropped.append(len(ids) - len(kept_ids))
    batch = pad_batch(rows)
    if len(batch[0][0]) != MAX_LEN:
        print(f"NOT OK: expected every row to fit {MAX_LEN} positions, got a batch padded to {len(batch[0][0])}")
        print("Make fit keep the last MAX_LEN positions of a row that is too long.")
        sys.exit(1)
    print(f"{len(EXAMPLES)} examples, maximum length {MAX_LEN}: prompt tokens are dropped from the left")
    for number, ((ids, labels), cut) in enumerate(zip(rows, dropped), start=1):
        print(f"\nexample {number}: {len(ids) + cut} tokens, dropped {cut} prompt tokens")
        print(f"  ids     {ids}")
        print(f"  labels  {labels}")
    print(f"\nbatch padded to {len(batch[0][0])} positions")
    trained = 0
    real = 0
    for ids, labels, mask in batch:
        for label in labels:
            if label != IGNORE:
                trained += 1
        real += sum(mask)
    print(f"trained tokens {trained} of {real} real tokens ({trained / real:.0%}); every completion is intact")

    try:
        long_ids, long_labels = build_labels({"prompt": "help", "completion": "one two three four five six seven eight nine ten eleven"}, dict(vocab))
        fit(long_ids, long_labels, MAX_LEN)
    except ValueError as error:
        print(f"rejected: {error}")

    if trained != 20 or dropped != [2, 0, 1]:
        print("\nNOT OK: expected the same twenty trained tokens, with two and one prompt tokens dropped")
        sys.exit(1)
    print("\nOK")
