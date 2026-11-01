"""Practice: change one behavior of the worked example.

The margin looks only at the top two probabilities. A prompt whose doubt is
spread over three routes, 0.15, 0.60, 0.25, scores a comfortable margin of
0.35 even though the student puts forty percent of its belief elsewhere.
Make uncertainty return the entropy of the whole distribution instead of
one minus the margin: minus the sum, over the routes, of p times the natural
log of p. Everything else stays the same: the key function already sorts the
largest uncertainty first.

Hint: start a running total at 0.0, loop over the probabilities, and for
each p above zero subtract p times math.log(p) from the total. Skip a zero
probability: it contributes nothing and math.log(0) raises. Return the top
route and the total.

Expected: u4 scores the highest entropy, 1.099, then u6 at 1.061, then u3 at
0.938 instead of u2 at 0.898, so the picks become u4, u6, u3. Run alone:
python starter.py   (it prints NOT OK until the change is made)
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


def uncertainty(probs, routes):
    """The student's top route and how unsure it is. Not changed yet: this is
    one minus the margin between the top two probabilities."""
    if len(probs) != len(routes):
        raise ValueError(f"{len(probs)} probabilities for {len(routes)} routes")
    if abs(sum(probs) - 1.0) > 1e-6:
        raise ValueError(f"probabilities must sum to 1, got {sum(probs):.2f}")
    ranked = sorted(zip(probs, routes), reverse=True)   # (probability, route) pairs, largest first
    top = ranked[0][1]
    return top, 1.0 - (ranked[0][0] - ranked[1][0])


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
