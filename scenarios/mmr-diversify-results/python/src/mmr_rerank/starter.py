"""Practice: change one behavior of the worked example.

The worked solution lets one source fill every slot when its chunks score
well. Make mmr respect a cap: a candidate whose source already has
MAX_PER_SOURCE picks is skipped for the rest of the run. Everything else
stays the same.

Hint: at the top of each round, split the remaining indexes into allowed and
blocked by counting, for each candidate, how many selected candidates share
its source; score only the allowed ones, and stop the loop when nothing is
allowed. Return each round as (rows, blocked) so the demonstration can show
what was skipped.

Expected: with a cap of 1 the picks become c1, c4, c6, because c5 shares
c4's source and is blocked, so the command flags chunk takes the third slot.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

CANDIDATES = [
    {"id": "c1", "source": "runbook", "title": "Rotate an API key, runbook v3", "relevance": 0.92},
    {"id": "c2", "source": "runbook", "title": "Rotate an API key, runbook v2", "relevance": 0.90},
    {"id": "c3", "source": "runbook", "title": "Rotate an API key, runbook v1", "relevance": 0.88},
    {"id": "c4", "source": "security-faq", "title": "Revoke the old key after rotating", "relevance": 0.80},
    {"id": "c5", "source": "security-faq", "title": "Grace period for the old key", "relevance": 0.75},
    {"id": "c6", "source": "cli-reference", "title": "rotate-key command flags", "relevance": 0.55},
]
SIMILARITY = [            # SIMILARITY[i][j]: how alike candidates i and j are, 0 to 1
    [1.00, 0.92, 0.90, 0.45, 0.50, 0.40],
    [0.92, 1.00, 0.91, 0.42, 0.48, 0.38],
    [0.90, 0.91, 1.00, 0.40, 0.46, 0.36],
    [0.45, 0.42, 0.40, 1.00, 0.30, 0.20],
    [0.50, 0.48, 0.46, 0.30, 1.00, 0.25],
    [0.40, 0.38, 0.36, 0.20, 0.25, 1.00],
]
K = 3
LAMBDA = 0.7              # weight on relevance; 1 - LAMBDA weights the novelty penalty
MAX_PER_SOURCE = 1        # at most this many picks from any one source


def top_by_relevance(candidates, k):
    """What shipped: the k most relevant candidates, ignoring overlap."""
    pairs = []
    for index, candidate in enumerate(candidates):
        pairs.append((-candidate["relevance"], index))   # negative, so the highest sorts first
    pairs.sort()
    picked = []
    for negative_relevance, index in pairs[:k]:
        picked.append(index)
    return picked


def score_round(candidates, similarity, selected, remaining, lam):
    """Score every remaining candidate against what is already selected:
    lam * relevance - (1 - lam) * (its highest similarity to a selected one)."""
    rows = []
    for index in remaining:
        penalty = 0.0
        for chosen in selected:
            if similarity[index][chosen] > penalty:
                penalty = similarity[index][chosen]
        score = lam * candidates[index]["relevance"] - (1 - lam) * penalty
        rows.append((index, penalty, score))
    return rows


def mmr(candidates, similarity, k, lam, max_per_source=None):
    """Pick k candidates greedily, one per round, each the highest MMR score.
    Returns the picks as (index, penalty, score) and every round as (rows, blocked).
    The cap is not used yet: your change goes here."""
    if not 0.0 <= lam <= 1.0:
        raise ValueError(f"lambda must be between 0 and 1, got {lam}")
    n = len(candidates)
    if len(similarity) != n:
        raise ValueError(f"similarity has {len(similarity)} rows for {n} candidates")
    for row in similarity:
        if len(row) != n:
            raise ValueError(f"a similarity row has {len(row)} entries for {n} candidates")
    selected = []                 # indexes picked so far, in order
    remaining = list(range(n))    # indexes still available
    picks = []
    rounds = []
    while len(selected) < k and remaining:
        rows = score_round(candidates, similarity, selected, remaining, lam)
        best = rows[0]
        for row in rows:
            if row[2] > best[2]:
                best = row
        index, penalty, score = best
        selected.append(index)
        remaining.remove(index)
        picks.append(best)
        rounds.append((rows, []))
    return picks, rounds


def names(candidates, indexes):
    """The ids of the given candidates as one comma-separated string."""
    ids = []
    for index in indexes:
        ids.append(candidates[index]["id"])
    return ", ".join(ids)


def pairwise_max(similarity, indexes):
    """The highest similarity between any two of the given candidates."""
    highest = 0.0
    for first in range(len(indexes)):
        for second in range(first + 1, len(indexes)):
            if similarity[indexes[first]][indexes[second]] > highest:
                highest = similarity[indexes[first]][indexes[second]]
    return highest


def sources_of(candidates, indexes):
    """The distinct sources among the given candidates, sorted."""
    found = []
    for index in indexes:
        if candidates[index]["source"] not in found:
            found.append(candidates[index]["source"])
    return sorted(found)


if __name__ == "__main__":
    picks, rounds = mmr(CANDIDATES, SIMILARITY, K, LAMBDA, max_per_source=MAX_PER_SOURCE)
    picked = []
    for index, penalty, score in picks:
        picked.append(index)
    if names(CANDIDATES, picked) != "c1, c4, c6":
        print(f"NOT OK: expected the picks c1, c4, c6 with at most {MAX_PER_SOURCE} pick per source, got {names(CANDIDATES, picked)}")
        print("Make mmr skip a candidate whose source already has max_per_source picks before scoring the round.")
        sys.exit(1)
    print(f"{len(CANDIDATES)} candidates, pick {K}, lambda {LAMBDA}, at most {MAX_PER_SOURCE} per source")
    shipped = top_by_relevance(CANDIDATES, K)
    print(f"relevance alone: {names(CANDIDATES, shipped)} (highest similarity between two picks "
          f"{pairwise_max(SIMILARITY, shipped):.2f}, sources: {', '.join(sources_of(CANDIDATES, shipped))})")
    for number, (rows, blocked) in enumerate(rounds, start=1):
        so_far = names(CANDIDATES, picked[:number - 1])
        if so_far == "":
            so_far = "none"
        line = f"\npick {number}, selected so far: {so_far}"
        if blocked:
            line = line + f" (blocked: {names(CANDIDATES, blocked)})"
        print(line)
        print(f"  {'id':<3} {'relevance':>9} {'penalty':>8} {'score':>6}")
        for index, penalty, score in rows:
            mark = ""
            if index == picked[number - 1]:
                mark = "  picked"
            print(f"  {CANDIDATES[index]['id']:<3} {CANDIDATES[index]['relevance']:>9.2f} {penalty:>8.2f} {score:>6.3f}{mark}")
    print(f"\nmmr picks: {names(CANDIDATES, picked)} (highest similarity between two picks "
          f"{pairwise_max(SIMILARITY, picked):.2f}, sources: {', '.join(sources_of(CANDIDATES, picked))})")
    if len(sources_of(CANDIDATES, picked)) != 3:
        print("\nNOT OK: expected three different sources among the picks")
        sys.exit(1)
    print("\nOK")
