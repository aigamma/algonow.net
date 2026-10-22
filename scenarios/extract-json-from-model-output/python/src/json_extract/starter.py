"""Practice: change one behavior of the worked example.

The worked solution rejects a reply whose object is balanced but not valid
JSON. The most common such defect is a trailing comma before a closing brace
or bracket, which the model produces often and json.loads never accepts.
Make repair_trailing_commas drop every comma whose next non-space character
is a closing brace or bracket, so the retry in parse_reply succeeds and
reply r6 is accepted. Everything else stays the same.

Hint: walk the candidate one character at a time with enumerate, building a
new string. When the character is a comma, look at the rest of the text with
a slice, strip its leading whitespace with lstrip, and skip the comma when
that rest starts with "}" or "]"; otherwise keep the character.

Expected: r6 is accepted with the note "repaired a trailing comma", so four
replies are accepted and two rejected.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import json
import sys

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


def repair_trailing_commas(candidate):
    """Return the candidate with every comma dropped whose next non-space character
    is a closing brace or bracket. Not written yet: the text comes back unchanged."""
    return candidate


def parse_reply(text):
    """(record, note) when the reply holds a usable object, otherwise (None, reason).
    The note is None for a clean parse and names the repair when one was needed."""
    if not isinstance(text, str):
        raise ValueError(f"reply must be a string, got {type(text).__name__}")
    span = find_json_span(text)
    if span is None:
        return None, "no object"
    start, end = span
    candidate = text[start:end + 1]
    note = None
    try:
        record = json.loads(candidate)
    except json.JSONDecodeError:
        repaired = repair_trailing_commas(candidate)
        try:
            record = json.loads(repaired)
        except json.JSONDecodeError:
            return None, "invalid json"
        note = "repaired a trailing comma"
    problem = validate(record)
    if problem is not None:
        return None, problem
    return record, note


if __name__ == "__main__":
    results = []
    for reply in REPLIES:
        record, reason = parse_reply(reply["text"])
        results.append((reply["id"], record, reason))
    accepted_ids = []
    for reply_id, record, reason in results:
        if record is not None:
            accepted_ids.append(reply_id)
    if "r6" not in accepted_ids:
        print(f"NOT OK: expected r6 to be accepted once its trailing comma is repaired, got accepted {', '.join(accepted_ids)}")
        print("Make repair_trailing_commas drop a comma whose next non-space character is } or ].")
        sys.exit(1)

    print(f"{len(REPLIES)} replies; a usable reply holds one object with intent (text), priority (1 to 3), and tags (a list); trailing commas repaired")
    print(f"\n{'id':<3} {'outcome':<9} detail")
    accepted = []
    rejected = {}                           # reason -> the ids rejected for it, in order
    for reply_id, record, reason in results:
        if record is None:
            if reason not in rejected:
                rejected[reason] = []
            rejected[reason].append(reply_id)
            print(f"{reply_id:<3} {'rejected':<9} {reason}")
        else:
            accepted.append(reply_id)
            note = f"  ({reason})" if reason is not None else ""
            print(f"{reply_id:<3} {'accepted':<9} intent={record['intent']}  priority={record['priority']}  tags={', '.join(record['tags'])}{note}")
    print(f"\naccepted {len(accepted)} ({', '.join(accepted)}), rejected {len(REPLIES) - len(accepted)}")
    for reason in rejected:
        print(f"  {reason}: {', '.join(rejected[reason])}")

    try:
        parse_reply(None)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if accepted != ["r1", "r2", "r3", "r6"] or rejected != {"no object": ["r4"], "priority must be an integer from 1 to 3": ["r5"]}:
        print("\nNOT OK: expected r1, r2, r3, and r6 accepted and r4, r5 rejected")
        sys.exit(1)
    print("\nOK")
