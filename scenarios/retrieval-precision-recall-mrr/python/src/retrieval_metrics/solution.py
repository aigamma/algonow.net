"""Worked example: measure a retriever with precision at k, recall at k, and MRR.

Orbit swapped the embedding model behind its runbook retriever because the
new results "felt better". Nobody could say by how much, or whether the old
model found chunks the new one misses. This file scores both rankings on the
same four questions with three standard numbers: precision at k (of the
first k results, the fraction that are relevant), recall at k (of the
relevant chunks, the fraction the first k results found), and the reciprocal
rank (one over the position of the first relevant result).

Input: four queries, each with the ids of the chunks a reviewer marked
relevant and the top five ids returned by the old and by the new model.
Output: the three numbers per query for each ranking, and their means.
Run alone: python solution.py
"""

QUERIES = [
    {"id": "q1", "question": "how do I rotate an API key?",
     "relevant": {"c1"},
     "old": ["c4", "c2", "c1", "c9", "c5"],
     "new": ["c1", "c4", "c2", "c9", "c5"]},
    {"id": "q2", "question": "a key was leaked, what do I do?",
     "relevant": {"c3", "c8"},
     "old": ["c6", "c3", "c8", "c7", "c2"],
     "new": ["c3", "c8", "c6", "c7", "c2"]},
    {"id": "q3", "question": "which scope do list calls need?",
     "relevant": {"c5"},
     "old": ["c5", "c2", "c9", "c4", "c1"],
     "new": ["c2", "c5", "c9", "c4", "c1"]},
    {"id": "q4", "question": "where is last month's invoice?",
     "relevant": {"c10"},
     "old": ["c2", "c4", "c6", "c7", "c9"],
     "new": ["c4", "c2", "c9", "c6", "c7"]},
]
K = 3   # how many results a reader actually looks at


def hits_in_top(ranked, relevant, k):
    """How many of the first k results are relevant."""
    if k < 1:
        raise ValueError(f"k must be at least 1, got {k}")
    if not relevant:
        raise ValueError("the relevant set is empty: nothing can be scored")
    hits = 0
    for chunk_id in ranked[:k]:
        if chunk_id in relevant:
            hits += 1
    return hits


def precision_at_k(ranked, relevant, k):
    """Of the first k results, the fraction that are relevant."""
    return hits_in_top(ranked, relevant, k) / k


def recall_at_k(ranked, relevant, k):
    """Of the relevant chunks, the fraction found among the first k results."""
    return hits_in_top(ranked, relevant, k) / len(relevant)


def reciprocal_rank(ranked, relevant):
    """One over the position of the first relevant result, or 0.0 when none appears."""
    if not relevant:
        raise ValueError("the relevant set is empty: nothing can be scored")
    for position, chunk_id in enumerate(ranked, start=1):
        if chunk_id in relevant:
            return 1 / position
    return 0.0


def evaluate(queries, ranking_key, k):
    """Score every query's ranking under one key ("old" or "new").
    Returns one (id, precision, recall, reciprocal rank) row per query and the three means."""
    rows = []
    total_precision = 0.0
    total_recall = 0.0
    total_rr = 0.0
    for query in queries:
        ranked = query[ranking_key]
        relevant = query["relevant"]
        precision = precision_at_k(ranked, relevant, k)
        recall = recall_at_k(ranked, relevant, k)
        rr = reciprocal_rank(ranked, relevant)
        rows.append((query["id"], precision, recall, rr))
        total_precision += precision
        total_recall += recall
        total_rr += rr
    n = len(rows)
    means = {"precision": total_precision / n, "recall": total_recall / n, "mrr": total_rr / n}
    return rows, means


if __name__ == "__main__":
    print(f"{len(QUERIES)} queries, each judged on its first {K} results")
    results = {}
    for key in ["old", "new"]:
        rows, means = evaluate(QUERIES, key, K)
        results[key] = means
        print(f"\n{key} ranking")
        print(f"{'query':<6}{'P@3':>7}{'R@3':>7}{'RR':>7}")
        for query_id, precision, recall, rr in rows:
            print(f"{query_id:<6}{precision:>7.3f}{recall:>7.3f}{rr:>7.3f}")
        print(f"{'mean':<6}{means['precision']:>7.3f}{means['recall']:>7.3f}{means['mrr']:>7.3f}")
    old, new = results["old"], results["new"]
    print(f"\nnew minus old: P@3 {new['precision'] - old['precision']:+.3f}, "
          f"R@3 {new['recall'] - old['recall']:+.3f}, MRR {new['mrr'] - old['mrr']:+.3f}")
    print(f"the same relevant chunks reach the top {K}; the new model puts them earlier")

    try:
        evaluate(QUERIES, "new", 0)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert old["precision"] == new["precision"], "the top three hold the same number of hits"
    assert old["recall"] == new["recall"], "both rankings find the same relevant chunks"
    assert new["mrr"] > old["mrr"], "the new ranking puts the first hit earlier on average"
    assert reciprocal_rank(QUERIES[3]["old"], QUERIES[3]["relevant"]) == 0.0, "q4 is found by neither"
    print("\nOK")
