"""Worked example: pack runbook blocks into RAG chunks without cutting a procedure.

A support assistant answers questions from runbooks. Ingest cuts each runbook
into chunks, an index ranks the chunks against the question, and the best few
are pasted into the model's prompt under a fixed budget per chunk. Fixed-size
windows cut numbered procedures in half. This file packs whole blocks instead.

Input: blocks in document order. Each block is a dictionary with a "heading"
(the section it sits under) and a "text" (one paragraph or one procedure).
Output: chunks, each a dictionary with the same two keys. A chunk's text for
the index is its heading, a newline, and its body, and that text must stay
within MAX_CHARS. Run alone: python solution.py
"""

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


def chunk_text(heading, text):
    """The string the index and the prompt see. The budget is measured on it."""
    return heading + "\n" + text


def pack_blocks(blocks, max_chars):
    """Pack blocks into chunks, in order. A chunk holds consecutive blocks under
    one heading, joined by blank lines, while its text stays within max_chars."""
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
    chunks = pack_blocks(BLOCKS, MAX_CHARS)
    print(f"{len(BLOCKS)} blocks in, {len(chunks)} chunks out, budget {MAX_CHARS} characters per chunk")
    for number, chunk in enumerate(chunks, start=1):
        text = chunk_text(chunk["heading"], chunk["text"])
        print(f"\n--- chunk {number}: {len(text)} characters")
        print(text)

    try:
        pack_blocks([TOO_LONG], MAX_CHARS)
    except ValueError as error:
        print(f"\nrejected: {error}")

    for chunk in chunks:
        assert len(chunk_text(chunk["heading"], chunk["text"])) <= MAX_CHARS, "a chunk is over budget"
    assert len(chunks) == 4, "expected four chunks"
    assert BLOCKS[2]["text"] in chunks[1]["text"], "the procedure must stay whole"
    print("\nOK")
