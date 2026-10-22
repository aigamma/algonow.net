"""Answer to the practice variation: every context starts with the system
message, and an assistant turn shorter than MIN_TARGET_WORDS words is skipped
like an empty one. Everything outside the marked region is the practice
starter, unchanged. Run alone: python practice_answer.py
"""
import sys

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
SYSTEM = "You are Orbit's support assistant. Answer from the runbook, briefly."
MIN_TARGET_WORDS = 3


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


# --- answer begins ---
def build_examples(rows, max_history=4):
    """One example per assistant turn with at least MIN_TARGET_WORDS words:
    the system message, then the turns before it (at most max_history of them),
    as the context, and its text as the target. Returns the examples and how
    many assistant turns were skipped for being empty or too short."""
    conversations = group_turns(rows)
    examples = []
    skipped = 0
    for conversation_id, turns in conversations.items():
        for position, turn in enumerate(turns):
            if turn["role"] != "assistant":
                continue
            if len(turn["text"].split()) < MIN_TARGET_WORDS:
                skipped += 1
                continue
            start = max(0, position - max_history)
            context = [{"role": "system", "text": SYSTEM}]
            for earlier in turns[start:position]:
                context.append({"role": earlier["role"], "text": earlier["text"]})
            examples.append({"conversation": conversation_id, "turn": turn["turn"],
                             "context": context, "target": turn["text"]})
    return examples, skipped
# --- answer ends ---


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
    starts_with_system = len(examples) > 0
    for example in examples:
        if example["context"][0]["role"] != "system":
            starts_with_system = False
    if not starts_with_system or skipped != 2:
        print(f"NOT OK: expected every context to start with the system message and 2 skipped assistant turns, got {len(examples)} examples and {skipped} skipped")
        print("Make build_examples append the SYSTEM message first and skip targets shorter than MIN_TARGET_WORDS words.")
        sys.exit(1)
    conversations = group_turns(ROWS)
    print(f"{len(ROWS)} rows, {len(conversations)} conversations, context window {MAX_HISTORY} turns, system message first, targets of at least {MIN_TARGET_WORDS} words")
    for number, example in enumerate(examples, start=1):
        history = 0
        for message in example["context"]:
            if message["role"] != "system":
                history += 1
        earlier = position_of(conversations[example["conversation"]], example["turn"])
        dropped = earlier - history
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
    print(f"\n{len(examples)} examples, {skipped} skipped (empty, or shorter than {MIN_TARGET_WORDS} words)")

    try:
        build_examples(ROWS + [{"conversation": "c1", "turn": 2, "role": "assistant", "text": "Rotate it."}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(examples) == 2, "the two-word answer is no longer a target"
    assert examples[0]["context"][0]["text"] == SYSTEM, "the system message comes first"
    print("\nOK")
