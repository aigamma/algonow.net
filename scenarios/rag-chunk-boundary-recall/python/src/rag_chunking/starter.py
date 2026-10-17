"""Practice: change one behavior of the worked example.

The worked solution rejects a block that cannot fit the budget on its own.
Change pack_blocks so that such a block is split at its line breaks instead:
each line becomes its own block under the same heading, and packing continues
exactly as before. Everything else stays the same.

Hint: do the splitting before the loop decides anything. Build a new list of
blocks in which only the oversized blocks are replaced by one block per line,
then let the existing loop pack that list. The raise can stay, as the guard
for a single line that is still too long.

Expected: six chunks. The incident call procedure becomes two chunks, steps
one to three and steps four to five, each within the budget.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

MAX_CHARS = 200   # characters per chunk: a stand-in for the prompt builder's token budget

BLOCKS = [
    {"heading": "API keys",
     "text": "Keys are shown once at creation and stored hashed. A lost key cannot be recovered, only replaced."},
    {"heading": "Rotate a key",
     "text": "Rotation keeps the old key valid while the new one rolls out."},
    {"heading": "Rotate a key",
     "text": "1. Create a replacement key with the same scopes.\n"
             "2. Deploy it to every caller.\n"
             "3. Revoke the old key after seven days."},
    {"heading": "Rotate a key",
     "text": "Before revoking, confirm in the request log that the old key's request count has dropped to zero."},
    {"heading": "Scopes",
     "text": "The read scope covers list and get calls. The write scope adds create and delete."},
]

TOO_LONG = {"heading": "Incident call",
            "text": "1. Page the on-call engineer.\n"
                    "2. Open a bridge and post the link in the incident channel.\n"
                    "3. Name an incident commander.\n"
                    "4. Post an update in the incident channel every thirty minutes until the incident is resolved.\n"
                    "5. Schedule the postmortem within two working days."}

PRACTICE_BLOCKS = BLOCKS + [TOO_LONG]
EXPECTED_HEADINGS = ["API keys", "Rotate a key", "Rotate a key", "Scopes", "Incident call", "Incident call"]


def chunk_text(heading, text):
    """The string the index and the prompt see. The budget is measured on it."""
    return heading + "\n" + text


def pack_blocks(blocks, max_chars):
    """Pack blocks into chunks, in order. A chunk holds consecutive blocks under
    one heading, joined by blank lines, while its text stays within max_chars.
    Your change goes here."""
    chunks = []
    for block in blocks:
        heading = block["heading"]
        text = block["text"]
        size = len(chunk_text(heading, text))
        if size > max_chars:
            raise ValueError(f"a block under '{heading}' needs {size} characters, over the budget of {max_chars}")
        if chunks and chunks[-1]["heading"] == heading:
            joined = chunks[-1]["text"] + "\n\n" + text
            if len(chunk_text(heading, joined)) <= max_chars:
                chunks[-1]["text"] = joined
                continue
        chunks.append({"heading": heading, "text": text})
    return chunks


if __name__ == "__main__":
    try:
        chunks = pack_blocks(PRACTICE_BLOCKS, MAX_CHARS)
    except ValueError as error:
        print(f"NOT OK: {error}")
        print("Make pack_blocks split an oversized block at its line breaks instead of rejecting it.")
        sys.exit(1)
    print(f"{len(PRACTICE_BLOCKS)} blocks in, {len(chunks)} chunks out, budget {MAX_CHARS} characters per chunk")
    for number, chunk in enumerate(chunks, start=1):
        text = chunk_text(chunk["heading"], chunk["text"])
        print(f"\n--- chunk {number}: {len(text)} characters")
        print(text)

    headings = []
    for chunk in chunks:
        headings.append(chunk["heading"])
        if len(chunk_text(chunk["heading"], chunk["text"])) > MAX_CHARS:
            print("\nNOT OK: a chunk is over budget")
            sys.exit(1)
    if headings != EXPECTED_HEADINGS:
        print(f"\nNOT OK: expected the headings {EXPECTED_HEADINGS}, got {headings}")
        sys.exit(1)
    if not chunks[4]["text"].startswith("1. Page") or not chunks[5]["text"].startswith("4. Post"):
        print("\nNOT OK: the incident procedure should split between step three and step four")
        sys.exit(1)
    print("\nOK")
