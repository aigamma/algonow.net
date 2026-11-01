"""Worked example: choose which examples to send to the teacher by the student's margin.

Orbit distills a small router, the student, from its large assistant, the
teacher. Every teacher label costs a call, and this round's budget covers
three of the eight unlabeled prompts. Sending the first three wastes calls on
prompts the student already handles. This file ranks the prompts by the
student's margin, the gap between its top two route probabilities, and sends
the smallest margins to the teacher: the prompts the student is least sure of.

Input: unlabeled prompts, each with the student's probabilities over the
routes. Output: one row per prompt with its top two routes and the margin,
then the ids picked for the teacher. Run alone: python solution.py
"""

ROUTES = ["billing", "access", "outage"]
CANDIDATES = [
    {"id": "u1", "probs": [0.92, 0.05, 0.03]},
    {"id": "u2", "probs": [0.07, 0.48, 0.45]},
    {"id": "u3", "probs": [0.15, 0.60, 0.25]},
    {"id": "u4", "probs": [0.34, 0.33, 0.33]},
    {"id": "u5", "probs": [0.05, 0.15, 0.80]},
    {"id": "u6", "probs": [0.39, 0.21, 0.40]},
    {"id": "u7", "probs": [0.40, 0.05, 0.55]},
    {"id": "u8", "probs": [0.20, 0.70, 0.10]},
]
BUDGET = 3          # teacher calls this round


def score(probs, routes):
    """The student's top route, its runner-up, and the margin between them:
    near 0 when the student is torn, near 1 when it is sure."""
    if len(probs) != len(routes):
        raise ValueError(f"{len(probs)} probabilities for {len(routes)} routes")
    if abs(sum(probs) - 1.0) > 1e-6:
        raise ValueError(f"probabilities must sum to 1, got {sum(probs):.2f}")
    ranked = sorted(zip(probs, routes), reverse=True)   # (probability, route) pairs, largest first
    top_prob, top = ranked[0]
    second_prob, second = ranked[1]
    return top, second, top_prob - second_prob


def by_margin(record):
    """The sort key: the margin, then the id so ties break the same way every run."""
    return (record["margin"], record["id"])


def select(candidates, routes, budget):
    """Score every candidate, then pick the `budget` smallest margins.
    Returns (scored rows, picked ids)."""
    if budget < 0 or budget > len(candidates):
        raise ValueError(f"budget must be between 0 and {len(candidates)}, got {budget}")
    scored = []
    for candidate in candidates:
        top, second, gap = score(candidate["probs"], routes)
        scored.append({"id": candidate["id"], "top": top, "second": second, "margin": gap})
    ranked = sorted(scored, key=by_margin)             # smallest margin first, ties by id
    picked = []
    for row in ranked[:budget]:
        picked.append(row["id"])
    return scored, picked


if __name__ == "__main__":
    scored, picked = select(CANDIDATES, ROUTES, BUDGET)
    print(f"{len(CANDIDATES)} unlabeled prompts, routes {', '.join(ROUTES)}, teacher budget {BUDGET}")
    print(f"{'id':<3} {'probabilities':<16} {'top':<8} {'second':<8} margin")
    for candidate, row in zip(CANDIDATES, scored):
        cells = []
        for p in candidate["probs"]:
            cells.append(f"{p:.2f}")
        print(f"{row['id']:<3} {' '.join(cells):<16} {row['top']:<8} {row['second']:<8} {row['margin']:6.2f}")
    print(f"\nsend to the teacher (smallest margins): {', '.join(picked)}")
    waiting = []
    for candidate in CANDIDATES:
        if candidate["id"] not in picked:
            waiting.append(candidate["id"])
    print(f"wait for a later round: {', '.join(waiting)}")

    margins = {}
    for row in scored:
        margins[row["id"]] = row["margin"]
    first = []
    first_total = 0.0
    for candidate in CANDIDATES[:BUDGET]:
        first.append(candidate["id"])
        first_total += margins[candidate["id"]]
    picked_total = 0.0
    for picked_id in picked:
        picked_total += margins[picked_id]
    print(f"\nwhat shipped, the first {BUDGET} in arrival order: {', '.join(first)}, mean margin {first_total / BUDGET:.2f}")
    print(f"this lesson's picks: mean margin {picked_total / BUDGET:.2f}")

    for bad in ([0.60, 0.60, 0.10], [0.50, 0.50]):
        try:
            score(bad, ROUTES)
        except ValueError as error:
            print(f"rejected: {error}")

    assert picked == ["u4", "u6", "u2"], "the two ties at 0.01 come first, in id order, then 0.03"
    assert round(margins["u1"], 2) == 0.87 and round(margins["u4"], 2) == 0.01
    assert CANDIDATES[1]["probs"] == [0.07, 0.48, 0.45], "sorting a copy leaves the input alone"
    print("\nOK")
