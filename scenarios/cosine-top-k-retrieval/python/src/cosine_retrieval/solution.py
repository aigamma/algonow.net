"""Worked example: rank chunks by cosine similarity and keep the top k.

Orbit's assistant embeds every runbook chunk and the question as vectors and
ranked the chunks by the raw dot product. Long chunks with large vectors won
every time: a billing overview outranked the one paragraph about rotating an
API key. Cosine similarity divides the dot product by both vector lengths, so
only the direction counts. This file scores five chunks against a query by
hand and keeps the top three.

Input: a query vector and chunks with an id, a title, and a vector.
Output: every chunk's dot product, length, and cosine, and the top k chunks
by cosine. Run alone: python solution.py
"""
import math

QUERY = [0.9, 0.1, 0.0, 0.4]      # the embedded question: how do I rotate an API key?
CHUNKS = [
    {"id": "c1", "title": "Rotate an API key", "vector": [0.8, 0.2, 0.1, 0.5]},
    {"id": "c2", "title": "Billing overview", "vector": [1.5, 3.0, 3.5, 0.5]},
    {"id": "c3", "title": "List call scopes", "vector": [0.9, 2.7, 0.6, 0.3]},
    {"id": "c4", "title": "Revoke a lost key", "vector": [0.6, 0.0, 0.1, 0.8]},
    {"id": "c5", "title": "Invoice downloads", "vector": [0.1, 0.1, 0.9, 0.2]},
]
K = 3


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


def rank_chunks(query, chunks, k):
    """Score every chunk against the query by cosine and return the top k as (id, score) pairs."""
    scored = []
    for chunk in chunks:
        scored.append((chunk["id"], cosine(query, chunk["vector"])))
    scored.sort(key=by_score_then_id)
    return scored[:k]


def scale(vector, factor):
    """A copy of the vector with every number multiplied by the factor."""
    scaled = []
    for x in vector:
        scaled.append(x * factor)
    return scaled


if __name__ == "__main__":
    dots = {}
    cosines = {}
    for chunk in CHUNKS:
        dots[chunk["id"]] = dot(QUERY, chunk["vector"])
        cosines[chunk["id"]] = cosine(QUERY, chunk["vector"])
    dot_rank = {}
    for position, (chunk_id, score) in enumerate(sorted(dots.items(), key=by_score_then_id), start=1):
        dot_rank[chunk_id] = position
    cosine_rank = {}
    for position, (chunk_id, score) in enumerate(sorted(cosines.items(), key=by_score_then_id), start=1):
        cosine_rank[chunk_id] = position

    print(f"{len(CHUNKS)} chunks scored against the query (length {norm(QUERY):.2f}), top {K} kept")
    print(f"{'id':<3} {'title':<18} {'dot':>5} {'len':>5} {'cosine':>7} {'by dot':>7} {'by cos':>7}")
    for chunk in CHUNKS:
        chunk_id = chunk["id"]
        print(f"{chunk_id:<3} {chunk['title']:<18} {dots[chunk_id]:>5.2f} {norm(chunk['vector']):>5.2f} "
              f"{cosines[chunk_id]:>7.3f} {dot_rank[chunk_id]:>7} {cosine_rank[chunk_id]:>7}")

    top = rank_chunks(QUERY, CHUNKS, K)
    print(f"\ntop {K} by cosine:")
    for position, (chunk_id, score) in enumerate(top, start=1):
        print(f"  {position}  {chunk_id}  {score:.3f}")

    try:
        rank_chunks(QUERY, [{"id": "c9", "title": "Short vector", "vector": [0.5, 0.5, 0.5]}], K)
    except ValueError as error:
        print(f"\nrejected: {error}")

    longer = scale(CHUNKS[1]["vector"], 10)
    assert top[0][0] == "c1", "the key rotation runbook ranks first by cosine"
    assert dot_rank["c2"] == 1 and cosine_rank["c2"] == 4, "the billing overview wins by dot product and drops by cosine"
    assert abs(cosine(QUERY, longer) - cosines["c2"]) < 1e-12, "cosine ignores the length of the vector"
    assert dot(QUERY, longer) > dots["c2"], "the dot product does not"
    print("\nOK")
