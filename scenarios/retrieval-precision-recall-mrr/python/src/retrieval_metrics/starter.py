"""Practice: change one behavior of the worked example.

Precision, recall, and the reciprocal rank treat a hit at position 1 and a
hit at position 3 the same, except for the reciprocal rank, which only looks
at the first hit. Add nDCG at k: every relevant result in the first k earns
1 / log2(position + 1), so later hits earn less, and the total is divided by
the best total possible for that query. Everything else stays the same.

Hint: loop over the first k results with enumerate starting at 1, add the
discounted gain for each relevant one, then compute the ideal total for
min(k, number of relevant chunks) hits at positions 1, 2, 3, ... and divide.
math.log2 gives the base two logarithm.

Expected: old mean nDCG@3 0.548 and new mean nDCG@3 0.658; q2 scores 0.693
old (hits at positions 2 and 3) and 1.000 new (hits at positions 1 and 2).
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import math
import sys

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
    Returns one (id, precision, recall, reciprocal rank, nDCG) row per query and the four means."""
    rows = []
    total_precision = 0.0
    total_recall = 0.0
    total_rr = 0.0
    total_ndcg = 0.0
    for query in queries:
        ranked = query[ranking_key]
        relevant = query["relevant"]
        precision = precision_at_k(ranked, relevant, k)
        recall = recall_at_k(ranked, relevant, k)
        rr = reciprocal_rank(ranked, relevant)
        ndcg = ndcg_at_k(ranked, relevant, k)
        rows.append((query["id"], precision, recall, rr, ndcg))
        total_precision += precision
        total_recall += recall
        total_rr += rr
        total_ndcg += ndcg
    n = len(rows)
    means = {"precision": total_precision / n, "recall": total_recall / n,
             "mrr": total_rr / n, "ndcg": total_ndcg / n}
    return rows, means


def ndcg_at_k(ranked, relevant, k):
    """Not written yet: your change goes here. Return the discounted gain of the
    relevant results among the first k, divided by the best gain possible."""
    return 0.0


if __name__ == "__main__":
    results = {}
    tables = {}
    for key in ["old", "new"]:
        rows, means = evaluate(QUERIES, key, K)
        results[key] = means
        tables[key] = rows
    if results["old"]["ndcg"] == 0.0 and results["new"]["ndcg"] == 0.0:
        print(f"NOT OK: expected nDCG@{K} to score both rankings, got 0.000 for every query; write ndcg_at_k")
        sys.exit(1)
    print(f"{len(QUERIES)} queries, each judged on its first {K} results, with nDCG@{K}")
    for key in ["old", "new"]:
        print(f"\n{key} ranking")
        print(f"{'query':<6}{'P@3':>7}{'R@3':>7}{'RR':>7}{'nDCG':>7}")
        for query_id, precision, recall, rr, ndcg in tables[key]:
            print(f"{query_id:<6}{precision:>7.3f}{recall:>7.3f}{rr:>7.3f}{ndcg:>7.3f}")
        means = results[key]
        print(f"{'mean':<6}{means['precision']:>7.3f}{means['recall']:>7.3f}{means['mrr']:>7.3f}{means['ndcg']:>7.3f}")
    old, new = results["old"], results["new"]
    print(f"\nnew minus old: MRR {new['mrr'] - old['mrr']:+.3f}, nDCG@{K} {new['ndcg'] - old['ndcg']:+.3f}")
    if round(old["ndcg"], 3) != 0.548 or round(new["ndcg"], 3) != 0.658:
        print(f"\nNOT OK: expected mean nDCG@{K} of 0.548 old and 0.658 new, got {old['ndcg']:.3f} and {new['ndcg']:.3f}")
        sys.exit(1)
    print("\nOK")
