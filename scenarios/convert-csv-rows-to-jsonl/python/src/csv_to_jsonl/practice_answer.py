"""Answer to the practice variation: a row whose prompt plus completion is
longer than the budget is skipped as too_long. Everything outside the marked
region is the practice starter, unchanged. Run alone: python practice_answer.py
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


# --- answer begins ---
def rows_to_examples(csv_text, max_chars=None):
    """Parse the export and keep one example per closed ticket with a reply
    whose prompt plus completion fits the budget, when a budget is given.
    Returns the examples and the skipped ticket ids grouped by reason."""
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
        prompt = row["customer_question"].strip()
        if max_chars is not None and len(prompt) + len(reply) > max_chars:
            skipped["too_long"].append(row["ticket_id"])
            continue
        examples.append({"prompt": prompt, "completion": reply})
    return examples, skipped
# --- answer ends ---


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
