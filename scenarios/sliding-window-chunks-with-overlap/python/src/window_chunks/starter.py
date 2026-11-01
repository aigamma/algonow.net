"""Practice: change one behavior of the worked example.

The sentence "To recover, set the timeout to thirty seconds, then restart the
worker." is twelve words long and starts at word 20, so no twelve-word window
starting at a multiple of eight contains all of it. A hit on chunk c3 alone
returns an instruction with its ending cut off. Make expand return the hit
together with its previous and next chunks: the words from the previous
chunk's start to the next chunk's end. The first chunk has no previous and
the last chunk has no next. Everything else stays the same.

Hint: collect the ids in a list and find the hit's position with the list's
index method. The first neighbour is max(0, position - 1) and the last is
min(len(chunks) - 1, position + 1), which clamps the ends of the list. Take
the start of the first neighbour, the end of the last, slice the words, and
join them.

Expected: the hit on c3 expands to c2, c3, and c4, words 8 to 35, which
contains the whole sentence; c1 expands to c1 and c2, and c5 to c4 and c5.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

DOCUMENT = (
    "The gateway returns a timeout when the model takes longer than the limit. "
    "Check the queue depth and the logs. "
    "To recover, set the timeout to thirty seconds, then restart the worker. "
    "Confirm the alert clears within five minutes."
)
WINDOW = 12         # words per chunk
OVERLAP = 4         # words shared by neighbouring chunks
SENTENCE = (20, 32) # "To recover, ... restart the worker.": word positions 20 to 31, longer than one window's fit
HIT = "c3"          # the chunk the retriever returned for "how do I recover"


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


def expand(chunks, words, hit_id):
    """The words of the hit chunk together with its previous and next chunks.
    Not written yet: as shipped it returns the hit chunk alone."""
    for chunk in chunks:
        if chunk["id"] == hit_id:
            return {"ids": [chunk["id"]], "start": chunk["start"], "end": chunk["end"], "text": chunk["text"]}
    raise ValueError(f"unknown chunk {hit_id}")


if __name__ == "__main__":
    words = DOCUMENT.split()
    chunks = chunk_words(DOCUMENT, WINDOW, OVERLAP)
    expanded = expand(chunks, words, HIT)
    if not (expanded["start"] <= SENTENCE[0] and SENTENCE[1] <= expanded["end"]):
        print(f"NOT OK: expected the expansion of {HIT} to cover words {SENTENCE[0]} to {SENTENCE[1] - 1}, got words {expanded['start']} to {expanded['end'] - 1}")
        print("Make expand return the words from the previous chunk's start to the next chunk's end.")
        sys.exit(1)
    print(f"{len(words)} words, window {WINDOW}, overlap {OVERLAP} (stride {WINDOW - OVERLAP}): {len(chunks)} chunks")
    hit = chunks[int(HIT[1:]) - 1]
    print(f"hit {HIT} alone: words {hit['start']} to {hit['end'] - 1}")
    print(f"  {hit['text']}")
    print(f"hit {HIT} expanded to {', '.join(expanded['ids'])}: words {expanded['start']} to {expanded['end'] - 1}")
    print(f"  {expanded['text']}")
    single = []
    for chunk in chunks:
        if chunk["start"] <= SENTENCE[0] and SENTENCE[1] <= chunk["end"]:
            single.append(chunk["id"])
    print(f'sentence "{" ".join(words[SENTENCE[0]:SENTENCE[1]])}" (words {SENTENCE[0]} to {SENTENCE[1] - 1}): whole in {", ".join(single) or "no single chunk"}, whole in the expansion')
    for edge in ("c1", chunks[-1]["id"]):
        grown = expand(chunks, words, edge)
        print(f"hit {edge} expanded to {', '.join(grown['ids'])}: words {grown['start']} to {grown['end'] - 1}")

    if single or expand(chunks, words, "c1")["ids"] != ["c1", "c2"] or expand(chunks, words, "c5")["ids"] != ["c4", "c5"]:
        print("\nNOT OK: the ends of the list have only one neighbour")
        sys.exit(1)
    print("\nOK")
