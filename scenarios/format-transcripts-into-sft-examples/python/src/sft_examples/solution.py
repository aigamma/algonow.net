"""Worked example: turn chat transcripts into supervised fine-tuning examples.

Orbit exports its support chats as flat rows: a conversation id, a turn
index, a role, and the text. The rows arrive in the order they were written
to the export, which is not always turn order, and two conversations can be
interleaved. Supervised fine-tuning wants something else: one example per
assistant turn, with the turns that came before it as the context and the
assistant's text as the target, and never more than the last few turns of
context. This file groups the rows by conversation, sorts each conversation
by turn, walks it, and builds one example at every assistant turn that has
text, with a window of at most MAX_HISTORY earlier turns.

Input: nine rows from two conversations. Output: one example per usable
assistant turn and a count of the assistant turns skipped for being empty.
Run alone: python solution.py
"""

ROWS = [
    {"conversation": "c1", "turn": 1, "role": "user", "text": "How do I rotate an API key?"},
    {"conversation": "c2", "turn": 1, "role": "user", "text": "Where do I find my invoice?"},
    {"conversation": "c1", "turn": 2, "role": "assistant", "text": "Create a replacement key, deploy it, then revoke the old one."},
    {"conversation": "c1", "turn": 3, "role": "user", "text": "Does the old key stop working right away?"},
    {"conversation": "c2", "turn": 2, "role": "assistant", "text": "Under Billing."},
    {"conversation": "c1", "turn": 5, "role": "user", "text": "And what if the key is already lost?"},
    {"conversation": "c1", "turn": 4, "role": "assistant", "text": ""},
    {"conversation": "c2", "turn": 3, "role": "user", "text": "Found it, thanks!"},
    {"conversation": "c1", "turn": 6, "role": "assistant", "text": "A lost key cannot be recovered. Create a replacement and revoke the lost one."},
]
MAX_HISTORY = 4     # a context holds at most this many earlier turns


def turn_index(row):
    """The sort key: the turn number of a row."""
    return row["turn"]


def group_turns(rows):
    """A dictionary from conversation id to its turns in turn order.
    Two rows with the same turn index in one conversation are an export bug."""
    conversations = {}
    for row in rows:
        if row["conversation"] not in conversations:
            conversations[row["conversation"]] = []
        conversations[row["conversation"]].append(row)
    for conversation_id, turns in conversations.items():
        turns.sort(key=turn_index)
        for position in range(1, len(turns)):
            if turns[position]["turn"] == turns[position - 1]["turn"]:
                raise ValueError(f"conversation '{conversation_id}' has two turns with index {turns[position]['turn']}")
    return conversations


def build_examples(rows, max_history=4):
    """One example per assistant turn that has text: the turns before it
    (at most max_history of them) as the context, its text as the target.
    Returns the examples and how many assistant turns were skipped for being empty."""
    conversations = group_turns(rows)
    examples = []
    skipped = 0
    for conversation_id, turns in conversations.items():
        for position, turn in enumerate(turns):
            if turn["role"] != "assistant":
                continue
            if turn["text"] == "":
                skipped += 1
                continue
            start = max(0, position - max_history)
            context = []
            for earlier in turns[start:position]:
                context.append({"role": earlier["role"], "text": earlier["text"]})
            examples.append({"conversation": conversation_id, "turn": turn["turn"],
                             "context": context, "target": turn["text"]})
    return examples, skipped


def position_of(turns, turn_number):
    """How many turns come before the given turn number in a sorted conversation."""
    position = 0
    for turn in turns:
        if turn["turn"] == turn_number:
            return position
        position += 1
    return position


if __name__ == "__main__":
    examples, skipped = build_examples(ROWS, max_history=MAX_HISTORY)
    conversations = group_turns(ROWS)
    print(f"{len(ROWS)} rows, {len(conversations)} conversations, context window {MAX_HISTORY} turns")
    for number, example in enumerate(examples, start=1):
        earlier = position_of(conversations[example["conversation"]], example["turn"])
        dropped = earlier - len(example["context"])
        note = ""
        if dropped > 0:
            note = f", {dropped} earlier turn dropped by the window"
        print(f"\nexample {number}: {example['conversation']} turn {example['turn']}, context size {len(example['context'])}{note}")
        for message in example["context"]:
            text = message["text"]
            if text == "":
                text = "(empty)"
            print(f"  {message['role']}: {text}")
        print(f"  target: {example['target']}")
    print(f"\n{len(examples)} examples, {skipped} skipped (empty assistant turn)")

    try:
        build_examples(ROWS + [{"conversation": "c1", "turn": 2, "role": "assistant", "text": "Rotate it."}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(examples) == 3 and skipped == 1, "three examples, one empty assistant turn skipped"
    longest = 0
    for example in examples:
        if len(example["context"]) > longest:
            longest = len(example["context"])
    assert longest == MAX_HISTORY, "the longest context fills the window exactly"
    assert examples[1]["context"][0]["text"].startswith("Create a replacement"), "the window dropped the first turn of c1"
    print("\nOK")
