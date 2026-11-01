"""Worked example: build training labels that ignore the prompt tokens.

Orbit fine-tuned its assistant on support chats and the training loss looked
excellent, but the model learned to repeat the customer's question before
answering it. The trainer had computed the loss on every token, prompt
included. This file builds the label sequence a causal language model trainer
expects: every prompt token gets the ignore label, minus one hundred, so only
the completion and the end-of-sequence token count toward the loss. It then
pads a batch to its longest example and reports how many tokens train.

The tokenizer is a stand-in: words become ids in order of first appearance,
with 0 for padding and 1 for end of sequence. A real tokenizer gives different
ids, and the label arithmetic is exactly the same. Run alone: python solution.py
"""

EXAMPLES = [
    {"prompt": "how do i reset my password", "completion": "use the forgot password link"},
    {"prompt": "where is my invoice", "completion": "open billing and choose invoices"},
    {"prompt": "cancel my plan", "completion": "go to billing and choose cancel plan"},
]
PAD = 0             # the padding id; its label is ignored too
EOS = 1             # end of sequence: the model must learn to stop, so it is trained
IGNORE = -100       # the label the loss skips, by convention of the training frameworks


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
    for example in EXAMPLES:
        rows.append(build_labels(example, vocab))
    print(f"{len(EXAMPLES)} examples, pad {PAD}, eos {EOS}, ignore label {IGNORE}, vocabulary of {len(vocab)} words")
    for number, (example, (ids, labels)) in enumerate(zip(EXAMPLES, rows), start=1):
        prompt_count = len(example["prompt"].split())
        print(f"\nexample {number}: {prompt_count} prompt tokens, {len(ids) - prompt_count - 1} completion tokens, eos")
        print(f"  ids     {ids}")
        print(f"  labels  {labels}")

    batch = pad_batch(rows)
    print(f"\nbatch padded to {len(batch[0][0])} positions")
    trained = 0
    real = 0
    for ids, labels, mask in batch:
        print(f"  ids {ids}")
        print(f"  lab {labels}")
        print(f"  att {mask}")
        for label in labels:
            if label != IGNORE:
                trained += 1
        real += sum(mask)
    print(f"\ntrained tokens {trained} of {real} real tokens ({trained / real:.0%}); the rest are prompt")

    try:
        build_labels({"prompt": "thanks", "completion": ""}, dict(vocab))
    except ValueError as error:
        print(f"rejected: {error}")

    assert rows[0][0][:6] == [2, 3, 4, 5, 6, 7] and rows[0][1][:6] == [IGNORE] * 6, "the prompt is in the ids and ignored in the labels"
    assert rows[0][0][6:] == rows[0][1][6:] == [8, 9, 10, 7, 11, EOS], "the completion and eos are trained; password keeps its id"
    assert trained == 20 and real == 33, "twenty of thirty three real tokens carry a label"
    print("\nOK")
