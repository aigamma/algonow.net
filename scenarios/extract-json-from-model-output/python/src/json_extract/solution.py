"""Worked example: extract and validate the JSON object inside a model's reply.

Orbit's assistant asks the model to classify a support ticket and answer with
one JSON object: an intent, a priority from 1 to 3, and a list of tags. The
service parsed the whole reply with json.loads. The model answers in prose,
wraps the object in a code fence, adds a closing remark, sometimes stops in
the middle of the object, and sometimes returns the wrong types, so one
unparseable reply raised an exception and crashed the worker. This file finds
the first balanced object in each reply, parses only that span, checks the
keys and the types, and returns a reason for every reply it cannot use.

Input: six replies exactly as the model produced them. Output: the parsed
record or a reason per reply, and a tally. Run alone: python solution.py
"""
import json

REPLIES = [
    {"id": "r1", "text": '{"intent": "access", "priority": 2, "tags": ["keys", "rotation"]}'},
    {"id": "r2", "text": '```json\n{"intent": "billing", "priority": 1, "tags": ["invoice"]}\n```'},
    {"id": "r3", "text": 'Sure! Here is the classification:\n{"intent": "outage", "priority": 3, "tags": ["gateway", "error {502}"]}\nLet me know if you need more.'},
    {"id": "r4", "text": 'Here you go: {"intent": "billing", "priority": 2, "tags": ["invoice", "refund"'},
    {"id": "r5", "text": '{"intent": "billing", "priority": "high", "tags": ["invoice"]}'},
    {"id": "r6", "text": 'Classification: {"intent": "access", "priority": 1, "tags": ["keys", "expired"],} Done.'},
]
REQUIRED_KEYS = ["intent", "priority", "tags"]


def find_json_span(text):
    """The positions of the first balanced object in text, (start, end) with both
    ends inclusive, or None when no object closes. A brace inside a quoted string
    does not count, and a backslash inside a string protects the next character."""
    depth = 0
    start = None
    in_string = False
    escaped = False
    for index, char in enumerate(text):
        if depth == 0:                      # outside any object: only an opening brace matters
            if char == "{":
                start = index
                depth = 1
            continue
        if in_string:                       # inside a quoted value: wait for the closing quote
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return start, index
    return None


def validate(record):
    """The reason the record is unusable, or None when it passes every check."""
    for key in REQUIRED_KEYS:
        if key not in record:
            return f"missing key {key}"
    if not isinstance(record["intent"], str) or record["intent"] == "":
        return "intent must be a non-empty string"
    priority = record["priority"]
    if isinstance(priority, bool) or not isinstance(priority, int) or priority < 1 or priority > 3:
        return "priority must be an integer from 1 to 3"
    if not isinstance(record["tags"], list):
        return "tags must be a list of strings"
    for tag in record["tags"]:
        if not isinstance(tag, str):
            return "tags must be a list of strings"
    return None


def parse_reply(text):
    """(record, None) when the reply holds a usable object, otherwise (None, reason)."""
    if not isinstance(text, str):
        raise ValueError(f"reply must be a string, got {type(text).__name__}")
    span = find_json_span(text)
    if span is None:
        return None, "no object"
    start, end = span
    candidate = text[start:end + 1]
    try:
        record = json.loads(candidate)
    except json.JSONDecodeError:
        return None, "invalid json"
    problem = validate(record)
    if problem is not None:
        return None, problem
    return record, None


if __name__ == "__main__":
    print(f"{len(REPLIES)} replies; a usable reply holds one object with intent (text), priority (1 to 3), and tags (a list)")
    print(f"\n{'id':<3} {'outcome':<9} detail")
    accepted = []
    rejected = {}                           # reason -> the ids rejected for it, in order
    for reply in REPLIES:
        record, reason = parse_reply(reply["text"])
        if record is None:
            if reason not in rejected:
                rejected[reason] = []
            rejected[reason].append(reply["id"])
            print(f"{reply['id']:<3} {'rejected':<9} {reason}")
        else:
            accepted.append(reply["id"])
            print(f"{reply['id']:<3} {'accepted':<9} intent={record['intent']}  priority={record['priority']}  tags={', '.join(record['tags'])}")
    print(f"\naccepted {len(accepted)} ({', '.join(accepted)}), rejected {len(REPLIES) - len(accepted)}")
    for reason in rejected:
        print(f"  {reason}: {', '.join(rejected[reason])}")

    try:
        parse_reply(None)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert accepted == ["r1", "r2", "r3"], "three replies hold a usable object"
    assert rejected == {"no object": ["r4"], "priority must be an integer from 1 to 3": ["r5"], "invalid json": ["r6"]}, "every rejection names its reason"
    print("\nOK")
