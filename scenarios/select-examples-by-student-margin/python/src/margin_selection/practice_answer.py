"""Answer to the practice variation: the uncertainty score is the entropy of
the student's whole distribution instead of one minus the margin between its
top two probabilities, so a prompt whose doubt is spread over several routes
ranks higher. Everything outside the marked region is the practice starter,
unchanged. Run alone: python practice_answer.py
"""
import math
import sys

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


# --- answer begins ---
def uncertainty(probs, routes):
    """The student's top route and how unsure it is: the entropy of the whole
    distribution, 0 for a certain answer and log of the route count for an even split."""
    if len(probs) != len(routes):
        raise ValueError(f"{len(probs)} probabilities for {len(routes)} routes")
    if abs(sum(probs) - 1.0) > 1e-6:
        raise ValueError(f"probabilities must sum to 1, got {sum(probs):.2f}")
    ranked = sorted(zip(probs, routes), reverse=True)   # (probability, route) pairs, largest first
    top = ranked[0][1]
    entropy = 0.0
    for p in probs:
        if p > 0:                                        # a zero probability adds nothing; log(0) would fail
            entropy -= p * math.log(p)
    return top, entropy
# --- answer ends ---


def most_uncertain_first(record):
    """The sort key: the largest uncertainty first, then the id so ties break the same way every run."""
    return (-record["uncertainty"], record["id"])


def select(candidates, routes, budget):
    """Score every candidate, then pick the `budget` most uncertain.
    Returns (scored rows, picked ids)."""
    if budget < 0 or budget > len(candidates):
        raise ValueError(f"budget must be between 0 and {len(candidates)}, got {budget}")
    scored = []
    for candidate in candidates:
        top, doubt = uncertainty(candidate["probs"], routes)
        scored.append({"id": candidate["id"], "top": top, "uncertainty": doubt})
    ranked = sorted(scored, key=most_uncertain_first)
    picked = []
    for row in ranked[:budget]:
        picked.append(row["id"])
    return scored, picked


if __name__ == "__main__":
    scored, picked = select(CANDIDATES, ROUTES, BUDGET)
    if picked != ["u4", "u6", "u3"]:
        print(f"NOT OK: expected the entropy ranking to pick u4, u6, u3, got {', '.join(picked)}")
        print("Make uncertainty return the entropy of the whole distribution, minus the sum of p times log p.")
        sys.exit(1)
    print(f"{len(CANDIDATES)} unlabeled prompts, routes {', '.join(ROUTES)}, teacher budget {BUDGET}, ranked by entropy")
    print(f"{'id':<3} {'probabilities':<16} {'top':<8} entropy")
    for candidate, row in zip(CANDIDATES, scored):
        cells = []
        for p in candidate["probs"]:
            cells.append(f"{p:.2f}")
        print(f"{row['id']:<3} {' '.join(cells):<16} {row['top']:<8} {row['uncertainty']:7.3f}")
    print(f"\nsend to the teacher (largest entropy): {', '.join(picked)}")
    print(f"even split over {len(ROUTES)} routes would score {math.log(len(ROUTES)):.3f}; a certain answer scores 0.000")

    try:
        uncertainty([0.60, 0.60, 0.10], ROUTES)
    except ValueError as error:
        print(f"\nrejected: {error}")

    print("\nOK")
