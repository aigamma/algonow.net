"""Practice: add one behavior to the worked example.

The worked solution estimates pass at k, the chance that at least one of k
samples passes. Add pass_all_k: the chance that every one of the k samples
passes, the number to report when a user will trust the first answer without
checking the others. Everything else stays the same, and the same estimate
and print_table functions produce the second table.

Hint: of the comb(n, k) subsets of size k, the ones made only of passing
samples are the subsets of size k drawn from the c passes, comb(c, k). When
c is below k no such subset exists, so the answer is 0.0. Keep the same two
guards as pass_at_k.

Expected: the second table reads 0.500, 0.250, and 0.167 in its mean row,
with the same 0.500 for k of 1 as pass at 1, because with a single sample
"at least one passes" and "all of them pass" are the same event.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys
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


def pass_all_k(n, c, k):
    """The chance that every one of k samples drawn from the n passes.
    Not written yet: your change goes here."""
    return 0.0


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
    if pass_all_k(5, 5, 3) != 1.0 or pass_all_k(5, 2, 1) != 0.4:
        print(f"NOT OK: expected pass_all_k(5, 5, 3) to be 1.000 and pass_all_k(5, 2, 1) to be 0.400, got {pass_all_k(5, 5, 3):.3f} and {pass_all_k(5, 2, 1):.3f}")
        print("Write pass_all_k: the subsets of size k drawn from the c passes, over all subsets of size k.")
        sys.exit(1)
    rows, means = estimate(PROBLEMS, KS)
    print(f"{len(PROBLEMS)} problems, {PROBLEMS[0]['n']} samples each, k of {KS[0]}, {KS[1]}, and {KS[2]}")
    print_table(rows, means, KS, "pass")

    all_rows, all_means = estimate(PROBLEMS, KS, score=pass_all_k)
    print("\nevery one of the k samples passes")
    print_table(all_rows, all_means, KS, "all")

    assert [round(mean, 3) for mean in all_means] == [0.5, 0.25, 0.167], "the all-k means the page shows"
    assert all_means[0] == means[0], "with one sample, at least one and all of them are the same event"
    print("\nOK")
