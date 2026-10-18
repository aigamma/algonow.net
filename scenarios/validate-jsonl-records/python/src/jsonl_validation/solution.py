"""Worked example: validate a JSONL training file line by line.

A fine-tuning job reads a JSONL export of support conversations: one JSON
object per line, each with a "prompt" and an "answer". Overnight the job
crashed on one malformed line, and after that line was deleted by hand it
trained on a record with no answer key and on one whose answer was empty.
This file validates the export line by line instead: every bad line is
rejected with a reason and its line number, the good records are handed out
one at a time, and the job never stops on a bad line.

Input: the lines of the file, in order. Output: the kept records, yielded one
at a time, and a list of (line number, reason) pairs for the rejected lines.
Run alone: python solution.py
"""
import json
from collections import Counter

MAX_ANSWER_CHARS = 300   # the training job's limit per answer

# The export, exactly as the job reads it. It ends with an empty line, which a
# hand-edited file often does.
LINES = """{"prompt": "How do I rotate a key?", "answer": "Create a replacement key with the same scopes, deploy it to every caller, then revoke the old key after seven days."}
{"prompt": "Which scope do list calls need?", "answer": "The read scope covers list and get calls."}
{"prompt": "Why was I billed twice?", "answer": "The first charge is a temporary hold that drops off within three days."
{"prompt": "Can a lost key be recovered?", "answer": "No. Keys are stored hashed; create a replacement and revoke the lost one."}
{"prompt": "How long does a hold last?"}
{"prompt": "What does the write scope add?", "answer": ""}
{"prompt": "Where do I find my invoice?", "answer": "Open Billing, then Invoices; each month is a PDF."}
{"prompt": "What happens during rotation?", "answer": "Rotation keeps the old key valid while the new one rolls out. Create the replacement key with the same scopes, deploy it to every caller, confirm in the request log that the old key's request count has dropped to zero, and only then revoke the old key. A caller that still sends the old key after revocation gets error E4031 until it is updated."}

"""


def validate(lines, rejections, max_answer_chars):
    """Yield each good record from lines, in order. A bad line is skipped and
    its (line number, reason) is appended to rejections; a blank line is
    skipped silently. Nothing here raises because of bad content."""
    for number, line in enumerate(lines, start=1):
        text = line.strip()
        if text == "":
            continue
        try:
            record = json.loads(text)
        except json.JSONDecodeError:
            rejections.append((number, "malformed json"))
            continue
        if not isinstance(record, dict):
            rejections.append((number, "not an object"))
            continue
        prompt = record.get("prompt")
        answer = record.get("answer")
        if not isinstance(prompt, str):
            rejections.append((number, "missing prompt"))
            continue
        if not isinstance(answer, str):
            rejections.append((number, "missing answer"))
            continue
        if prompt.strip() == "":
            rejections.append((number, "empty prompt"))
            continue
        if answer.strip() == "":
            rejections.append((number, "empty answer"))
            continue
        if len(answer) > max_answer_chars:
            rejections.append((number, "answer too long"))
            continue
        yield record


if __name__ == "__main__":
    lines = LINES.splitlines()
    rejections = []
    kept = []
    for record in validate(lines, rejections, MAX_ANSWER_CHARS):
        kept.append(record)
    blank = len(lines) - len(kept) - len(rejections)
    print(f"{len(lines)} lines read: {len(kept)} records kept, {len(rejections)} rejected, {blank} blank skipped")

    print("\nrejected:")
    for number, reason in rejections:
        print(f"  line {number}: {reason}")

    by_reason = Counter()
    for number, reason in rejections:
        by_reason[reason] += 1
    print("\nby reason:")
    for reason, count in by_reason.most_common():
        print(f"  {reason}: {count}")

    print("\nkept:")
    for position, record in enumerate(kept, start=1):
        print(f"  {position}. Q: {record['prompt']}")
        print(f"     A: {record['answer']}")

    bad_lines = []
    for number, reason in rejections:
        bad_lines.append(number)
    assert len(kept) == 4 and len(rejections) == 4, "four kept, four rejected"
    assert bad_lines == [3, 5, 6, 8], "the bad lines by number"
    assert kept[0]["prompt"] == "How do I rotate a key?", "the first good record"
    print("\nOK")
