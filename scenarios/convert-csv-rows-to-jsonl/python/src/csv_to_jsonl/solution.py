"""Worked example: convert a CSV support export into JSONL training examples.

Orbit's support tickets are exported as a CSV with four columns: the ticket
id, the customer's question, the agent's reply, and a status. Replies contain
commas and line breaks, and the first converter split every line on commas,
which shredded two of every five rows. This file reads the export with the
standard csv module, which understands quoted fields, keeps the closed tickets
that have a reply, and writes one JSON object per line: the JSONL that a
fine-tuning job consumes.

Input: the CSV text, written inline below. Output: a list of examples, each a
dictionary with a prompt and a completion, the ids of the skipped rows by
reason, and the JSONL text. Run alone: python solution.py
"""
import csv
import io
import json

CSV_TEXT = """ticket_id,customer_question,agent_reply,status
t1,How do I rotate an API key?,Create a replacement key and deploy it before revoking the old one.,closed
t2,Which scope do list calls need?,"The read scope, which covers list and get calls.",closed
t3,Where do I find my invoice?,"Open Billing, then Invoices.
Each month is a PDF.",closed
t4,Can a lost key be recovered?,We are checking with the security team.,open
t5,What does the write scope add?,,closed
"""

REQUIRED = ["ticket_id", "customer_question", "agent_reply", "status"]


def rows_to_examples(csv_text):
    """Parse the export and keep one example per closed ticket with a reply.
    Returns the examples and the skipped ticket ids grouped by reason."""
    reader = csv.DictReader(io.StringIO(csv_text))
    columns = reader.fieldnames or []
    for column in REQUIRED:
        if column not in columns:
            raise ValueError(f"the export has no '{column}' column")
    examples = []
    skipped = {"not_closed": [], "empty_reply": []}
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
    examples, skipped = rows_to_examples(CSV_TEXT)
    jsonl = to_jsonl(examples)
    rows_read = len(examples)
    for ids in skipped.values():
        rows_read += len(ids)
    print(f"{rows_read} rows read, {len(examples)} examples kept")
    print("\njsonl:")
    print(jsonl, end="")
    print()
    for reason, ids in skipped.items():
        print(f"skipped {reason}: {len(ids)} ({', '.join(ids)})")

    try:
        rows_to_examples("ticket_id,customer_question,status\nt9,Why?,closed\n")
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(examples) == 3, "three closed tickets with a reply"
    assert skipped == {"not_closed": ["t4"], "empty_reply": ["t5"]}, "every skip names its ticket"
    assert ", which covers" in examples[1]["completion"], "the quoted comma stayed inside the reply"
    assert jsonl.count("\n") == 3 and "\\n" in jsonl.splitlines()[2], "the line break became two characters"
    print("\nOK")
