"""Practice: change one behavior of the worked example.

The worked solution measures how far the student is from the teacher with the
KL divergence, which is not symmetric: the divergence from the teacher to the
student differs from the divergence from the student to the teacher. Make
js_divergence compute the Jensen-Shannon divergence instead: build the
midpoint distribution (the average of the two, route by route), then take
half the KL divergence from the teacher to the midpoint plus half the KL
divergence from the student to the midpoint. It reads the same both ways and
is never infinite. Everything else stays the same.

Hint: a new empty list, one loop over zip that appends (p + q) / 2, then two
calls of kl_divergence against that list, each multiplied by 0.5 and added.

Expected: e2 reads 0.0657 both ways, the ranking worst first is still
e2, e4, e1, e3, and every JS value is smaller than its KL value here.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import math
import sys

ROUTES = ["billing", "access", "outage"]
EXAMPLES = [
    {"id": "e1", "teacher": [0.7, 0.2, 0.1], "student": [0.6, 0.3, 0.1]},
    {"id": "e2", "teacher": [0.1, 0.8, 0.1], "student": [0.4, 0.5, 0.1]},
    {"id": "e3", "teacher": [0.34, 0.33, 0.33], "student": [0.4, 0.3, 0.3]},
    {"id": "e4", "teacher": [0.9, 0.05, 0.05], "student": [0.95, 0.04, 0.01]},
]
TOLERANCE = 1e-6      # how far from 1 a distribution's sum may be
FLOOR = 1e-9          # the smallest student probability the log is allowed to see


def check_distribution(probs):
    """Stop with a ValueError unless probs is a probability distribution."""
    total = 0.0
    for p in probs:
        if p < 0:
            raise ValueError(f"distribution {probs} has a negative entry")
        total += p
    if abs(total - 1.0) > TOLERANCE:
        raise ValueError(f"distribution {probs} sums to {total:.6g}, not 1")


def kl_terms(teacher, student):
    """One term per route: p times the log of p over q. The student's q is
    clipped to FLOOR, because a zero where the teacher has mass is an infinite
    divergence, and a very large finite number says the same thing."""
    check_distribution(teacher)
    check_distribution(student)
    terms = []
    for p, q in zip(teacher, student, strict=True):
        if p == 0:
            terms.append(0.0)          # the teacher has no mass here: nothing to compare
            continue
        q = max(q, FLOOR)
        terms.append(p * math.log(p / q))
    return terms


def kl_divergence(teacher, student):
    """The KL divergence from the teacher to the student: the sum of the terms."""
    total = 0.0
    for term in kl_terms(teacher, student):
        total += term
    return total


def js_divergence(teacher, student):
    """The Jensen-Shannon divergence. Not implemented yet: your change goes here.
    Build the midpoint distribution, then average the two KL divergences to it."""
    return kl_divergence(teacher, student)


if __name__ == "__main__":
    e2 = EXAMPLES[1]
    forward = js_divergence(e2["teacher"], e2["student"])
    backward = js_divergence(e2["student"], e2["teacher"])
    if round(forward, 4) != 0.0657 or abs(forward - backward) > 1e-12:
        print(f"NOT OK: expected the Jensen-Shannon divergence for e2 to round to 0.0657 and to read the same both ways, got {forward:.4f} and {backward:.4f}")
        print("Build the midpoint distribution and average the two KL divergences to it.")
        sys.exit(1)
    print(f"{len(EXAMPLES)} examples, {len(ROUTES)} routes: {', '.join(ROUTES)}")
    print(f"{'id':<3} {'KL':>7} {'JS':>7}")
    scored = []
    for example in EXAMPLES:
        kl = kl_divergence(example["teacher"], example["student"])
        js = js_divergence(example["teacher"], example["student"])
        scored.append((js, example["id"]))
        print(f"{example['id']:<3} {kl:>7.4f} {js:>7.4f}")

    def worst_first(pair):
        return (-pair[0], pair[1])

    ranked = sorted(scored, key=worst_first)
    print("\nranked by JS, worst first: " + ", ".join(f"{example_id} {js:.4f}" for js, example_id in ranked))
    print(f"JS is symmetric: e2 reads {forward:.4f} both ways")

    assert ranked[0][1] == "e2", "e2 still diverges most"
    assert all(0 <= js <= math.log(2) for js, _ in ranked), "JS lies between 0 and the log of 2"
    print("\nOK")
