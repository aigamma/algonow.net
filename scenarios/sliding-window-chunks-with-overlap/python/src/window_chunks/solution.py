"""Worked example: chunk a flat document into sliding word windows with overlap.

Orbit's older runbooks are long paragraphs with no headings, so the block
packer has nothing to pack and ingest fell back to fixed windows of twelve
words with no overlap. The recovery instruction "set the timeout to thirty
seconds" was cut in two at a window boundary, and the retriever returned one
chunk ending in "set the" and another beginning "timeout to thirty seconds".
This file slides a window of WINDOW words forward by WINDOW minus OVERLAP
words at a time, so the last OVERLAP words of each chunk open the next one.

Input: one document as a string. Output: one chunk per window with its id,
its first and last word positions, and its text. Run alone: python solution.py
"""

DOCUMENT = (
    "The gateway returns a timeout when the model takes longer than the limit. "
    "Check the queue depth and the logs. "
    "To recover, set the timeout to thirty seconds, then restart the worker. "
    "Confirm the alert clears within five minutes."
)
WINDOW = 12         # words per chunk
OVERLAP = 4         # words shared by neighbouring chunks
SPAN = (22, 28)     # the instruction "set the timeout to thirty seconds": word positions 22 to 27


def chunk_words(text, window, overlap):
    """Split text into windows of `window` words that advance by
    `window - overlap` words. Returns a list of chunk dictionaries."""
    if window < 1:
        raise ValueError(f"window must be at least 1, got {window}")
    if overlap < 0 or overlap >= window:
        raise ValueError(f"overlap must be between 0 and window - 1: window {window}, overlap {overlap}")
    words = text.split()                       # whitespace split: no empty words, punctuation stays attached
    stride = window - overlap                  # how far each window moves forward
    chunks = []
    for start in range(0, len(words), stride):
        end = min(start + window, len(words))  # the last window may be short
        chunks.append({"id": f"c{len(chunks) + 1}", "start": start, "end": end, "text": " ".join(words[start:end])})
        if end == len(words):
            break                              # this window reached the end; a further one would only repeat words
    return chunks


def whole_in(chunks, span_start, span_end):
    """The ids of the chunks that contain every word from span_start up to
    but not including span_end."""
    found = []
    for chunk in chunks:
        if chunk["start"] <= span_start and span_end <= chunk["end"]:
            found.append(chunk["id"])
    return found


if __name__ == "__main__":
    words = DOCUMENT.split()
    chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
    print(f"{len(words)} words, window {WINDOW}, overlap {OVERLAP} (stride {WINDOW - OVERLAP})")
    print(f"{'id':<3} {'start':>5} {'end':>4}  words")
    for chunk in chunks:
        print(f"{chunk['id']:<3} {chunk['start']:>5} {chunk['end']:>4}  {chunk['text']}")
    stored = 0
    for chunk in chunks:
        stored += chunk["end"] - chunk["start"]
    print(f"\n{len(chunks)} chunks, {stored} words stored for {len(words)} ({stored / len(words):.2f}x)")

    span_text = " ".join(words[SPAN[0]:SPAN[1]])
    print(f'span "{span_text}" (words {SPAN[0]} to {SPAN[1] - 1}): whole in {", ".join(whole_in(chunks, *SPAN)) or "none"}')
    flat = chunk_words(DOCUMENT, WINDOW, 0)
    print(f"with overlap 0: whole in {', '.join(whole_in(flat, *SPAN)) or 'none'} (a window boundary falls at word {WINDOW * (SPAN[0] // WINDOW + 1)})")

    for window, overlap in ((12, 12), (0, 0)):
        try:
            chunk_words(DOCUMENT, window, overlap)
        except ValueError as error:
            print(f"rejected: {error}")

    assert [(c["start"], c["end"]) for c in chunks] == [(0, 12), (8, 20), (16, 28), (24, 36), (32, 39)]
    assert whole_in(chunks, *SPAN) == ["c3"] and whole_in(flat, *SPAN) == [], "the overlap keeps the instruction whole"
    assert chunk_words("", WINDOW, OVERLAP) == [], "an empty document gives no chunks"
    print("\nOK")
