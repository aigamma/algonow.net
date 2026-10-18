"""Worked example: fuse a keyword ranking and a vector ranking into one list.

A support assistant retrieves runbook chunks two ways. A keyword index finds
exact terms such as error codes and flag names; a vector index finds chunks
that say the same thing in other words. Each returns its own ranked list for
a question, and the prompt has room for the top three. Taking the vector list
first and appending the keyword leftovers buried exact matches. This file
fuses the two lists with reciprocal rank fusion instead: every list gives
each of its documents 1 / (k + rank), the scores add up, and the fused list
is sorted by score.

Input: rankings, a dictionary from a list name to a ranked list of document
names, best first. Output: a list of (document, score) pairs, best first.
Run alone: python solution.py
"""

K = 60   # the usual constant: it keeps rank 1 from dwarfing rank 2 (1/61 against 1/62)

RANKINGS = {
    "keyword": ["errors E4031", "cli rotate-key", "runbook rotate a key", "scopes", "audit log"],
    "vector": ["runbook rotate a key", "faq key expiry", "cli rotate-key", "errors E4031", "incident call"],
}


def fusion_order(entry):
    """Sort key for a (document, score) pair: highest score first, ties by name."""
    doc, score = entry
    return (-score, doc)


def fuse(rankings, k):
    """Reciprocal rank fusion: each list gives each of its documents 1 / (k + rank)."""
    scores = {}
    for name, ranking in rankings.items():
        for rank, doc in enumerate(ranking, start=1):
            if ranking.count(doc) > 1:
                raise ValueError(f"the {name} ranking lists '{doc}' more than once")
            scores[doc] = scores.get(doc, 0.0) + 1 / (k + rank)
    return sorted(scores.items(), key=fusion_order)


if __name__ == "__main__":
    for name, ranking in RANKINGS.items():
        print(f"{name} ranking: " + ", ".join(ranking))
    fused = fuse(RANKINGS, K)
    print(f"\nfused with k = {K}:")
    for position, (doc, score) in enumerate(fused, start=1):
        found = []
        for name, ranking in RANKINGS.items():
            if doc in ranking:
                found.append(f"{name} {ranking.index(doc) + 1}")
        print(f"{position:2}. {doc:22} {score:.6f}  ({', '.join(found)})")

    assert len(fused) == 7, "seven distinct documents"
    assert fused[0][0] == "runbook rotate a key", "ranked 3 and 1: the best combination"
    assert fused[1][0] == "errors E4031", "ranked 1 and 4 beats ranked 2 and 3 by a hair"
    assert fused[5][0] == "audit log" and fused[6][0] == "incident call", "equal scores sort by name"
    print("\nOK")
