"""Worked example: store only a teacher's top-k probabilities and renormalize.

Orbit distills a small router from its large assistant. The teacher's
distribution over its vocabulary of thirty two thousand tokens is the training
target at every position, and storing all of it for two million positions
would take terabytes. Almost all of that mass sits on a handful of tokens.
This file keeps the k largest probabilities per position, renormalizes them so
they sum to one again, and measures the mass that was dropped.

Input: the teacher's probabilities at three positions over a six-token
vocabulary (real vocabularies are far larger; six is enough to see every
step). Output: per position, the kept (index, probability) pairs, their
renormalized values, and the dropped mass. Run alone: python solution.py
"""

VOCAB = ["key", "scope", "token", "secret", "api", "old"]   # index 0 to 5
POSITIONS = [
    {"id": "p1", "context": "revoke the old", "probs": [0.5, 0.2, 0.15, 0.1, 0.03, 0.02]},
    {"id": "p2", "context": "calls need the read", "probs": [0.3, 0.3, 0.2, 0.1, 0.05, 0.05]},
    {"id": "p3", "context": "rotate the API", "probs": [0.9, 0.04, 0.03, 0.02, 0.005, 0.005]},
]
K = 3


def sort_key(pair):
    """Largest probability first; among equals, the lower index first."""
    index, prob = pair
    return (-prob, index)


def top_k_sparse(probs, k):
    """The k largest probabilities with their indices, largest first."""
    if k < 1 or k > len(probs):
        raise ValueError(f"k must be between 1 and {len(probs)}, got {k}")
    pairs = []
    for index, prob in enumerate(probs):
        pairs.append((index, prob))
    pairs.sort(key=sort_key)
    return pairs[:k]


def renormalize(sparse):
    """Scale the kept probabilities so they sum to one again."""
    kept_sum = 0.0
    for index, prob in sparse:
        kept_sum += prob
    renormalized = []
    for index, prob in sparse:
        renormalized.append((index, prob / kept_sum))
    return renormalized


def dropped_mass(probs, sparse):
    """The probability mass of every token that was not kept."""
    kept_indices = set()
    for index, prob in sparse:
        kept_indices.add(index)
    dropped = 0.0
    for index, prob in enumerate(probs):
        if index not in kept_indices:
            dropped += prob
    return dropped


def truncate_all(positions, k):
    """One record per position: the kept pairs, their renormalized values, the dropped mass."""
    records = []
    for position in positions:
        sparse = top_k_sparse(position["probs"], k)
        records.append({
            "id": position["id"],
            "kept": sparse,
            "renormalized": renormalize(sparse),
            "dropped": dropped_mass(position["probs"], sparse),
        })
    return records


if __name__ == "__main__":
    records = truncate_all(POSITIONS, K)
    print(f"{len(POSITIONS)} positions, vocabulary of {len(VOCAB)} tokens, k = {K}")
    for position, record in zip(POSITIONS, records, strict=True):
        print(f"\nposition {record['id']} (after '{position['context']}'): teacher {position['probs']}")
        print(f"  {'index':>5}  {'token':<7} {'teacher':>7}  {'renormalized':>12}")
        for (index, prob), (same_index, value) in zip(record["kept"], record["renormalized"], strict=True):
            print(f"  {index:>5}  {VOCAB[index]:<7} {prob:>7.3f}  {value:>12.3f}")
        print(f"  kept mass {1 - record['dropped']:.3f}, dropped mass {record['dropped']:.3f}")

    total_dropped = 0.0
    for record in records:
        total_dropped += record["dropped"]
    print(f"\nmean dropped mass {total_dropped / len(records):.3f}")
    print(f"storage: {K} (index, probability) pairs per position instead of {len(VOCAB)} probabilities")

    try:
        top_k_sparse(POSITIONS[0]["probs"], 7)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert [index for index, prob in records[1]["kept"]] == [0, 1, 2], "the tie at 0.3 goes to the lower index"
    for record in records:
        assert abs(sum(value for index, value in record["renormalized"]) - 1.0) < 1e-9, "renormalized values sum to one"
    assert [round(record["dropped"], 3) for record in records] == [0.15, 0.2, 0.03], "dropped mass per position"
    print("\nOK")
