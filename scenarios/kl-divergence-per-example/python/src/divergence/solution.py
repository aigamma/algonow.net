"""Worked example: find where a student disagrees with its teacher using KL divergence.

Orbit distilled a small router from its assistant. The router sends each
support question to one of three teams: billing, access, or outage. On every
checked example the student picked the same top route as the teacher, so the
evaluation said one hundred percent agreement, and yet some routes behaved
badly in production: the student spreads its probability differently, and a
route that the teacher was sure of becomes a coin flip for the student. This
file computes the KL divergence from the teacher's distribution to the
student's for each example and ranks the examples by how far apart they are.

Input: four examples, each with the teacher's and the student's probabilities
over the three routes. Output: the per-route terms, the divergence per
example, the mean, the examples ranked worst first, and the top-route
agreement. Run alone: python solution.py
"""
import math

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


def rank_by_divergence(examples):
    """(divergence, id) pairs, largest divergence first; equal divergences go by id."""
    scored = []
    for example in examples:
        scored.append((kl_divergence(example["teacher"], example["student"]), example["id"]))

    def worst_first(pair):
        return (-pair[0], pair[1])

    return sorted(scored, key=worst_first)


def top_route(probs):
    """The index of the largest probability: the route that would be chosen."""
    best = 0
    for index in range(1, len(probs)):
        if probs[index] > probs[best]:
            best = index
    return best


def agreement(examples):
    """How many examples have the same top route for teacher and student."""
    agreed = 0
    for example in examples:
        if top_route(example["teacher"]) == top_route(example["student"]):
            agreed += 1
    return agreed


if __name__ == "__main__":
    print(f"{len(EXAMPLES)} examples, {len(ROUTES)} routes: {', '.join(ROUTES)}")
    print(f"{'id':<3} {'teacher':<8} {'student':<8} {'billing':>8} {'access':>8} {'outage':>8} {'KL':>7}")
    total_kl = 0.0
    for example in EXAMPLES:
        terms = kl_terms(example["teacher"], example["student"])
        kl = kl_divergence(example["teacher"], example["student"])
        total_kl += kl
        t_route = ROUTES[top_route(example["teacher"])]
        s_route = ROUTES[top_route(example["student"])]
        print(f"{example['id']:<3} {t_route:<8} {s_route:<8} {terms[0]:>+8.4f} {terms[1]:>+8.4f} {terms[2]:>+8.4f} {kl:>7.4f}")
    print(f"\nmean KL {total_kl / len(EXAMPLES):.4f}")

    ranked = rank_by_divergence(EXAMPLES)
    print("ranked worst first: " + ", ".join(f"{example_id} {kl:.4f}" for kl, example_id in ranked))
    agreed = agreement(EXAMPLES)
    print(f"top-route agreement: {agreed} of {len(EXAMPLES)}")

    try:
        kl_divergence([0.5, 0.3, 0.1], [0.4, 0.4, 0.2])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert agreed == len(EXAMPLES), "the top routes agree on every example"
    assert ranked[0][1] == "e2" and ranked[0][0] > 0.2, "e2 diverges most, well above 0.2"
    assert all(kl >= 0 for kl, _ in ranked), "KL divergence is never negative"
    print("\nOK")
