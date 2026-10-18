"""Answer to the practice variation: each list's contribution is multiplied by
its weight, and a list with no weight counts once. Everything outside the
marked region is the practice starter, unchanged. Run alone: python practice_answer.py
"""
import sys

K = 60   # the usual constant: it keeps rank 1 from dwarfing rank 2 (1/61 against 1/62)

RANKINGS = {
    "keyword": ["errors E4031", "cli rotate-key", "runbook rotate a key", "scopes", "audit log"],
    "vector": ["runbook rotate a key", "faq key expiry", "cli rotate-key", "errors E4031", "incident call"],
}

WEIGHTS = {"keyword": 2, "vector": 1}


def fusion_order(entry):
    """Sort key for a (document, score) pair: highest score first, ties by name."""
    doc, score = entry
    return (-score, doc)


# --- answer begins ---
def fuse(rankings, k, weights):
    """Weighted reciprocal rank fusion: each list gives each of its documents
    weight / (k + rank). A list missing from weights counts once."""
    scores = {}
    for name, ranking in rankings.items():
        for rank, doc in enumerate(ranking, start=1):
            if ranking.count(doc) > 1:
                raise ValueError(f"the {name} ranking lists '{doc}' more than once")
            scores[doc] = scores.get(doc, 0.0) + weights.get(name, 1) / (k + rank)   # the one changed line
    return sorted(scores.items(), key=fusion_order)
# --- answer ends ---


if __name__ == "__main__":
    fused = fuse(RANKINGS, K, WEIGHTS)
    if fused[0][0] != "errors E4031":
        print(f"NOT OK: expected 'errors E4031' first with the keyword list weighted 2, got '{fused[0][0]}'")
        print("Make fuse multiply each contribution by the list's weight.")
        sys.exit(1)
    for name, ranking in RANKINGS.items():
        print(f"{name} ranking: " + ", ".join(ranking))
    described = []
    for name, weight in WEIGHTS.items():
        described.append(f"{name} {weight}")
    print(f"\nfused with k = {K} and weights {', '.join(described)}:")
    for position, (doc, score) in enumerate(fused, start=1):
        found = []
        for name, ranking in RANKINGS.items():
            if doc in ranking:
                found.append(f"{name} {ranking.index(doc) + 1}")
        print(f"{position:2}. {doc:22} {score:.6f}  ({', '.join(found)})")
    if [doc for doc, score in fused[:3]] != ["errors E4031", "runbook rotate a key", "cli rotate-key"]:
        print("\nNOT OK: the top three should be errors E4031, runbook rotate a key, cli rotate-key")
        sys.exit(1)
    print("\nOK")
