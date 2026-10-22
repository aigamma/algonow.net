"""Worked example: estimate pass at k for a code model from n samples per problem.

Orbit samples five candidate solutions for every benchmark problem and runs
the tests on each one. The team reported the share of problems where any of
the five passed as the model's score. That number is pass at five: the chance
that a user who tries five samples gets at least one that works. A user who
takes one sample sees something much lower, and nobody had computed it.
This file computes the unbiased pass at k estimator for several k from the
same samples: for each problem, the chance that at least one of k samples
drawn from the n passes, given that c of the n passed.

Input: for each problem, the number of samples n and how many passed, c.
Output: pass at k for k of 1, 3, and 5 per problem, and the mean per k.
Run alone: python solution.py
"""
from math import comb

PROBLEMS = [
    {"id": "p1", "name": "date parsing", "n": 5, "c": 5},
    {"id": "p2", "name": "interval merge", "n": 5, "c": 3},
    {"id": "p3", "name": "LRU cache", "n": 5, "c": 1},
    {"id": "p4", "name": "email check", "n": 5, "c": 0},
    {"id": "p5", "name": "topological sort", "n": 5, "c": 2},
    {"id": "p6", "name": "binary search", "n": 5, "c": 4},
]
KS = [1, 3, 5]           # how many samples a user would take


def pass_at_k(n, c, k):
    """The chance that at least one of k samples, drawn without replacement
    from the n, passes, given that c of the n passed. Unbiased for any k <= n."""
    if k < 1 or k > n:
        raise ValueError(f"k must be between 1 and n: k {k}, n {n}")
    if c < 0 or c > n:
        raise ValueError(f"c must be between 0 and n: c {c}, n {n}")
    if n - c < k:
        return 1.0                 # too few failures to fill a subset of k: every subset holds a pass
    return (comb(n, k) - comb(n - c, k)) / comb(n, k)    # subsets with a pass, over all subsets


def estimate(problems, ks, score=pass_at_k):
    """One row per problem with the score for every k, then the mean per k.
    The scoring function is a parameter so another estimator can reuse the table."""
    rows = []
    for problem in problems:
        scores = []
        for k in ks:
            scores.append(score(problem["n"], problem["c"], k))
        rows.append({"id": problem["id"], "name": problem["name"], "n": problem["n"], "c": problem["c"], "scores": scores})
    means = []
    for position in range(len(ks)):
        total = 0.0
        for row in rows:
            total += row["scores"][position]
        means.append(total / len(rows))
    return rows, means


def print_table(rows, means, ks, label):
    """The table the trainer reads: one row per problem, one column per k."""
    print(f"{'problem':<20}{'c/n':>4}", end="")
    for k in ks:
        print(f"{label + '@' + str(k):>9}", end="")
    print()
    for row in rows:
        print(f"{row['id']} {row['name']:<17}{str(row['c']) + '/' + str(row['n']):>4}", end="")
        for value in row["scores"]:
            print(f"{value:>9.3f}", end="")
        print()
    print(f"{'mean':<24}", end="")
    for value in means:
        print(f"{value:>9.3f}", end="")
    print()


if __name__ == "__main__":
    rows, means = estimate(PROBLEMS, KS)
    print(f"{len(PROBLEMS)} problems, {PROBLEMS[0]['n']} samples each, k of {KS[0]}, {KS[1]}, and {KS[2]}")
    print_table(rows, means, KS, "pass")

    any_correct = 0
    for problem in PROBLEMS:
        if problem["c"] > 0:
            any_correct += 1
    any_rate = any_correct / len(PROBLEMS)
    print(f"\nany sample passed: {any_correct} of {len(PROBLEMS)} problems ({any_rate:.3f}), the same number as the pass@5 mean")
    print(f"a user who takes one sample passes {means[0]:.3f} of the problems, not {any_rate:.3f}")

    try:
        pass_at_k(5, 2, 6)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert pass_at_k(5, 2, 3) == 0.9, "nine of the ten subsets of three hold a passing sample"
    assert [round(mean, 3) for mean in means] == [0.5, 0.75, 0.833], "the means the page shows"
    assert abs(means[2] - any_rate) < 1e-12, "pass at n is the any-correct rate"
    print("\nOK")
