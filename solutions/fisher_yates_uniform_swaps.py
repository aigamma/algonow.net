# Puzzle 46: Fisher-Yates shuffle x backward uniform swaps
# Produce a uniformly random permutation: every one of n! orderings
# equally likely: in place, in one pass, and PROVE the uniformity with
# the same test that convicts the famous off-by-one impostor.
#
# The pairing is the point. The algorithm is the in-place sweep: walk i
# from the last position down, and swap position i with a random
# position. The heuristic is the range that random index is drawn from:
# j uniform in [0, i]: the not-yet-locked prefix INCLUDING i itself.
# That one bound is the whole theorem: position i receives each
# remaining item with equal probability and then never moves, so the
# n! leaves of the decision tree are exactly the n! permutations, once
# each. Widen the range to [0, n-1], the single most famous shuffle bug
# in software, and n^n equally likely paths must land on n! outcomes,
# which do not divide: the bias is not sampled here, it is ENUMERATED
# exactly (all 256 paths at n = 4) and then confirmed empirically. The
# seed-space ceiling gets the same treatment: a 16-bit-seeded shuffle
# of 10 items is measured reaching 65,536 of the 3,628,800 orderings.
import itertools
import math
import random


def fisher_yates(items, rng):
    a = list(items)
    for i in range(len(a) - 1, 0, -1):
        j = rng.randint(0, i)  # the heuristic: [0, i], never [0, n-1]
        a[i], a[j] = a[j], a[i]
    return a


def naive_swap_anywhere(items, rng):
    """The famous bug: swap every position with a random position."""
    a = list(items)
    n = len(a)
    for i in range(n):
        j = rng.randint(0, n - 1)
        a[i], a[j] = a[j], a[i]
    return a


def sort_by_key(items, rng, key_space=None):
    """Assign random keys and sort. Uniform iff keys never collide;
    a small key space makes collisions common and the stable sort
    leaks the original order."""
    if key_space is None:
        return [x for _, x in sorted((rng.random(), x) for x in items)]
    keyed = [(rng.randrange(key_space), k, x) for k, x in enumerate(items)]
    return [x for _, _, x in sorted(keyed)]


def perm_counts(shuffler, n, trials, rng):
    counts = {}
    base = tuple(range(n))
    for _ in range(trials):
        p = tuple(shuffler(base, rng))
        counts[p] = counts.get(p, 0) + 1
    return counts


if __name__ == "__main__":
    rng = random.Random(20260827)
    N = 4
    PERMS = list(itertools.permutations(range(N)))
    TRIALS = 240_000
    EXP = TRIALS / len(PERMS)  # 10,000 per permutation

    # Oracle 1: Fisher-Yates is uniform, tested exactly. Every one of
    # the 24 cells within 4.5 sigma, and the chi-square statistic in a
    # comfortable band around its 23-degree expectation.
    c_fy = perm_counts(fisher_yates, N, TRIALS, rng)
    sigma = math.sqrt(TRIALS * (1 / 24) * (23 / 24))
    for p in PERMS:
        assert abs(c_fy.get(p, 0) - EXP) < 4.5 * sigma, (p, c_fy.get(p, 0))
    chi_fy = sum((c_fy.get(p, 0) - EXP) ** 2 / EXP for p in PERMS)
    assert chi_fy < 60, chi_fy  # 23 dof: expect ~23

    # Oracle 2: the impostor, enumerated THEN measured. All n^n = 256
    # equally likely index paths of swap-anywhere at n = 4, mapped to
    # the permutation each produces: the exact bias fingerprint.
    theory = {}
    for path in itertools.product(range(N), repeat=N):
        a = list(range(N))
        for i, j in enumerate(path):
            a[i], a[j] = a[j], a[i]
        theory[tuple(a)] = theory.get(tuple(a), 0) + 1
    assert sum(theory.values()) == 256
    assert len(set(theory.values())) > 1  # NOT uniform, by enumeration
    # 256 paths over 24 permutations cannot be flat: 24 does not divide 256.
    c_bug = perm_counts(naive_swap_anywhere, N, TRIALS, rng)
    worst_rel = 0.0
    for p in PERMS:
        expected_bug = TRIALS * theory[p] / 256
        # The measurement must match the BUG'S OWN theory...
        assert abs(c_bug.get(p, 0) - expected_bug) < 5 * math.sqrt(expected_bug), p
        # ...and depart from uniformity where the theory says it does.
        worst_rel = max(worst_rel, abs(theory[p] * TRIALS / 256 - EXP) / EXP)
    assert worst_rel > 0.10  # double-digit structural bias

    # Oracle 3: sort-by-random-float is uniform (collisions measure
    # zero at float precision); sort-by-tiny-key leaks order through
    # stable-sort collisions, measured against ITS exact theory too.
    c_sortf = perm_counts(lambda it, r: sort_by_key(it, r), N, TRIALS, rng)
    chi_sortf = sum((c_sortf.get(p, 0) - EXP) ** 2 / EXP for p in PERMS)
    assert chi_sortf < 60, chi_sortf
    c_tiny = perm_counts(lambda it, r: sort_by_key(it, r, key_space=4), N, TRIALS, rng)
    ident = tuple(range(N))
    # Exact theory for key_space=4: enumerate all 4^4 key vectors.
    tiny_theory = {}
    for keys in itertools.product(range(4), repeat=N):
        order = tuple(x for _, _, x in sorted((keys[k], k, k) for k in range(N)))
        tiny_theory[order] = tiny_theory.get(order, 0) + 1
    assert tiny_theory[ident] > 256 / 24  # identity overrepresented: leaks
    exp_ident = TRIALS * tiny_theory[ident] / 256
    assert abs(c_tiny.get(ident, 0) - exp_ident) < 5 * math.sqrt(exp_ident)
    tiny_bias = (tiny_theory[ident] * TRIALS / 256 - EXP) / EXP

    # Oracle 4: the seed-space ceiling, measured. Shuffling 10 items
    # with every possible 16-bit seed reaches at most 65,536 of the
    # 3,628,800 orderings: the arithmetic behind the 1999 online-poker
    # exploit, run rather than recounted.
    reached = set()
    for seed in range(65_536):
        reached.add(tuple(fisher_yates(range(10), random.Random(seed))))
    assert len(reached) <= 65_536
    frac = len(reached) / math.factorial(10)
    assert frac < 0.02
    assert 2**32 < math.factorial(52)  # the deck outruns the seed, always

    print(f"contest: n = {N}, all 24 permutations counted over {TRIALS:,} shuffles (expected {EXP:,.0f} per cell); referees: 4.5-sigma cell bounds, chi-square, and EXACT enumeration of each variant's own theory")
    print(f"  {'shuffle':<26} {'chi2 (23 dof)':>13}   verdict")
    print(f"  {'Fisher-Yates [0, i]':<26} {chi_fy:>13.1f}   uniform: every cell within noise of 10,000")
    chi_bug = sum((c_bug.get(p, 0) - EXP) ** 2 / EXP for p in PERMS)
    print(f"  {'swap-anywhere [0, n-1]':<26} {chi_bug:>13.1f}   biased {worst_rel:.0%} at worst: 256 paths cannot cover 24 cells evenly")
    print(f"  {'sort by random float':<26} {chi_sortf:>13.1f}   uniform, at O(n log n) plus n floats")
    chi_tiny = sum((c_tiny.get(p, 0) - EXP) ** 2 / EXP for p in PERMS)
    print(f"  {'sort by 4-valued key':<26} {chi_tiny:>13.1f}   stable-sort leak: identity {tiny_bias:+.0%} overrepresented")
    print(f"the impostor's fingerprint: enumeration of all 256 swap-anywhere paths predicts every measured cell within 5 sigma: the bug is not noisy, it is exact")
    print(f"the seed ceiling, measured: 16-bit seeds reach {len(reached):,} of 3,628,800 orderings of 10 items ({frac:.2%}); a 32-bit seed cannot reach even a sliver of 52! ~ 8e67: the 1999 poker-site lesson as arithmetic")
    print("OK: Fisher-Yates uniform under cell and chi-square tests, both biased variants matched to their own exact enumerated theories, the float-key sort certified uniform at its price, and the seed-space ceiling measured directly")
