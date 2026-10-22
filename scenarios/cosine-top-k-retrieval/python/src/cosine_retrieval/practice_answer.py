"""Answer to the practice variation: rank_chunks skips every chunk whose cosine
is below the minimum before it is ever added to the scored list. Everything
outside the marked region is the practice starter, unchanged.
Run alone: python practice_answer.py
"""
import math
import sys

QUERY = [0.9, 0.1, 0.0, 0.4]      # the embedded question: how do I rotate an API key?
CHUNKS = [
    {"id": "c1", "title": "Rotate an API key", "vector": [0.8, 0.2, 0.1, 0.5]},
    {"id": "c2", "title": "Billing overview", "vector": [1.5, 3.0, 3.5, 0.5]},
    {"id": "c3", "title": "List call scopes", "vector": [0.9, 2.7, 0.6, 0.3]},
    {"id": "c4", "title": "Revoke a lost key", "vector": [0.6, 0.0, 0.1, 0.8]},
    {"id": "c5", "title": "Invoice downloads", "vector": [0.1, 0.1, 0.9, 0.2]},
]
K = 3
MINIMUM = 0.5          # a chunk below this cosine is not worth showing


def dot(a, b):
    """The dot product: multiply matching positions and add the products up."""
    total = 0.0
    for x, y in zip(a, b, strict=True):
        total += x * y
    return total


def norm(a):
    """The length of a vector: the square root of its dot product with itself."""
    return math.sqrt(dot(a, a))


def cosine(a, b):
    """The cosine of the angle between two vectors: 1.0 for the same direction,
    0.0 for unrelated directions, regardless of how long either vector is."""
    length_a = norm(a)
    length_b = norm(b)
    if length_a == 0.0 or length_b == 0.0:
        raise ValueError("a zero vector has no direction")
    return dot(a, b) / (length_a * length_b)


def by_score_then_id(record):
    """Sort key for an (id, score) pair: highest score first, ties broken by id."""
    chunk_id, score = record
    return (-score, chunk_id)


# --- answer begins ---
def rank_chunks(query, chunks, k, minimum=0.0):
    """Score every chunk against the query by cosine, skip any chunk below the
    minimum, and return the top k of the rest as (id, score) pairs."""
    scored = []
    for chunk in chunks:
        score = cosine(query, chunk["vector"])
        if score < minimum:
            continue                    # too weak a match to show, however few remain
        scored.append((chunk["id"], score))
    scored.sort(key=by_score_then_id)
    return scored[:k]
# --- answer ends ---


if __name__ == "__main__":
    top = rank_chunks(QUERY, CHUNKS, K, minimum=MINIMUM)
    titles = {}
    for chunk in CHUNKS:
        titles[chunk["id"]] = chunk["title"]
    if len(top) != 2:
        print(f"NOT OK: expected 2 chunks at or above a cosine of {MINIMUM}, got {len(top)}")
        print("Make rank_chunks skip every chunk whose cosine is below the minimum.")
        sys.exit(1)
    print(f"{len(CHUNKS)} chunks scored against the query, top {K} kept, minimum cosine {MINIMUM}")
    for position, (chunk_id, score) in enumerate(top, start=1):
        print(f"  {position}  {chunk_id}  {titles[chunk_id]:<18} {score:.3f}")
    print(f"{len(top)} chunks at or above {MINIMUM}; the rest were dropped")
    if top[0][0] != "c1" or top[1][0] != "c4" or top[1][1] < MINIMUM:
        print(f"\nNOT OK: expected c1 then c4, both at or above {MINIMUM}")
        sys.exit(1)
    print("\nOK")
