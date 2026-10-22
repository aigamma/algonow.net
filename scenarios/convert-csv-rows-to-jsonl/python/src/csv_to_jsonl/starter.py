"""Practice: change one behavior of the worked example.

The worked solution keeps every closed ticket that has a reply. Give
rows_to_examples a character budget: when max_chars is a number and the
prompt plus the completion is longer than it, skip the row as too_long,
reported with the other reasons. Everything else stays the same.

Hint: the check belongs after the status and empty-reply checks, so a row
is reported for what it is first, and only a row that would otherwise be
kept is measured. One comparison of the two lengths added together against
max_chars, guarded by "max_chars is not None", then append the id to the
too_long list and continue.

Expected: with a budget of 90 characters, t1 (94 characters) is skipped as
too_long, two examples are kept, and the file ends with OK.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import csv
import io
import json
import sys

CSV_TEXT = """ticket_id,customer_question,agent_reply,status
t1,How do I rotate an API key?,Create a replacement key and deploy it before revoking the old one.,closed
t2,Which scope do list calls need?,"The read scope, which covers list and get calls.",closed
t3,Where do I find my invoice?,"Open Billing, then Invoices.
Each month is a PDF.",closed
t4,Can a lost key be recovered?,We are checking with the security team.,open
t5,What does the write scope add?,,closed
"""

REQUIRED = ["ticket_id", "customer_question", "agent_reply", "status"]
MAX_CHARS = 90     # prompt plus completion must fit in this many characters


def rows_to_examples(csv_text, max_chars=None):
    """Parse the export and keep one example per closed ticket with a reply.
    Returns the examples and the skipped ticket ids grouped by reason.
    The budget is not used yet: your change goes here."""
    reader = csv.DictReader(io.StringIO(csv_text))
    columns = reader.fieldnames or []
    for column in REQUIRED:
        if column not in columns:
            raise ValueError(f"the export has no '{column}' column")
    examples = []
    skipped = {"not_closed": [], "empty_reply": [], "too_long": []}
    for row in reader:
        status = row["status"].strip().lower()
        if status != "closed":
            skipped["not_closed"].append(row["ticket_id"])
            continue
        reply = row["agent_reply"].strip()
        if reply == "":
            skipped["empty_reply"].append(row["ticket_id"])
            continue
        examples.append({"prompt": row["customer_question"].strip(), "completion": reply})
    return examples, skipped


def to_jsonl(examples):
    """One JSON object per line, in order, each line ended by a newline."""
    text = ""
    for example in examples:
        text = text + json.dumps(example, ensure_ascii=False) + "\n"
    return text


if __name__ == "__main__":
    examples, skipped = rows_to_examples(CSV_TEXT, max_chars=MAX_CHARS)
    if "t1" not in skipped["too_long"]:
        print(f"NOT OK: expected t1 to be skipped as too_long with a budget of {MAX_CHARS} characters, got too_long {skipped['too_long']}")
        print("Make rows_to_examples measure the prompt plus the completion against max_chars before keeping a row.")
        sys.exit(1)
    jsonl = to_jsonl(examples)
    rows_read = len(examples)
    for ids in skipped.values():
        rows_read += len(ids)
    print(f"{rows_read} rows read, {len(examples)} examples kept, budget {MAX_CHARS} characters")
    print("\njsonl:")
    print(jsonl, end="")
    print()
    for reason, ids in skipped.items():
        print(f"skipped {reason}: {len(ids)} ({', '.join(ids)})")

    try:
        rows_to_examples("ticket_id,customer_question,status\nt9,Why?,closed\n")
    except ValueError as error:
        print(f"\nrejected: {error}")

    if len(examples) != 2 or skipped["too_long"] != ["t1"]:
        print(f"\nNOT OK: expected two examples kept and only t1 over the budget, got {len(examples)} kept and {skipped['too_long']}")
        sys.exit(1)
    print("\nOK")
