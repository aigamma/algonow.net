"""Answer to the practice variation: top_p_sparse keeps the smallest set of
largest probabilities whose mass reaches p. Everything outside the marked
region is the practice starter, unchanged. Run alone: python practice_answer.py
"""
import sys

VOCAB = ["key", "scope", "token", "secret", "api", "old"]   # index 0 to 5
POSITIONS = [
    {"id": "p1", "context": "revoke the old", "probs": [0.5, 0.2, 0.15, 0.1, 0.03, 0.02]},
    {"id": "p2", "context": "calls need the read", "probs": [0.3, 0.3, 0.2, 0.1, 0.05, 0.05]},
    {"id": "p3", "context": "rotate the API", "probs": [0.9, 0.04, 0.03, 0.02, 0.005, 0.005]},
]
K = 3
P = 0.9


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


def truncate_all(positions, p):
    """One record per position: the kept pairs, their renormalized values, the dropped mass."""
    records = []
    for position in positions:
        sparse = top_p_sparse(position["probs"], p)
        records.append({
            "id": position["id"],
            "kept": sparse,
            "renormalized": renormalize(sparse),
            "dropped": dropped_mass(position["probs"], sparse),
        })
    return records


# --- answer begins ---
def top_p_sparse(probs, p):
    """The smallest set of largest probabilities whose mass reaches p, largest first."""
    pairs = []
    for index, prob in enumerate(probs):
        pairs.append((index, prob))
    pairs.sort(key=sort_key)
    kept = []
    mass = 0.0
    for index, prob in pairs:
        kept.append((index, prob))
        mass += prob
        if mass >= p:
            break                       # enough mass is kept: stop here
    return kept
# --- answer ends ---


if __name__ == "__main__":
    records = truncate_all(POSITIONS, P)
    counts = [len(record["kept"]) for record in records]
    if counts == [3, 3, 3]:
        print(f"NOT OK: expected top-p with p = {P} to keep 4, 4, 1 tokens, got {counts[0]}, {counts[1]}, {counts[2]}")
        print("Make top_p_sparse stop appending once the running mass reaches p.")
        sys.exit(1)
    print(f"{len(POSITIONS)} positions, vocabulary of {len(VOCAB)} tokens, top-p with p = {P}")
    for position, record in zip(POSITIONS, records, strict=True):
        print(f"\nposition {record['id']} (after '{position['context']}'): teacher {position['probs']}")
        print(f"  {'index':>5}  {'token':<7} {'teacher':>7}  {'renormalized':>12}")
        for (index, prob), (same_index, value) in zip(record["kept"], record["renormalized"], strict=True):
            print(f"  {index:>5}  {VOCAB[index]:<7} {prob:>7.3f}  {value:>12.3f}")
        print(f"  kept {len(record['kept'])} of {len(VOCAB)}, kept mass {1 - record['dropped']:.3f}, dropped mass {record['dropped']:.3f}")

    top_k_counts = [len(top_k_sparse(position["probs"], K)) for position in POSITIONS]
    print(f"\nkept counts with p = {P}: {counts[0]}, {counts[1]}, {counts[2]} (top-k with k = {K} kept {top_k_counts[0]}, {top_k_counts[1]}, {top_k_counts[2]})")
    if counts != [4, 4, 1]:
        print(f"\nNOT OK: expected the kept counts 4, 4, 1 with p = {P}")
        sys.exit(1)
    print("\nOK")
