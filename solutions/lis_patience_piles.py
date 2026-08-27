# Puzzle 74: Longest increasing subsequence x patience piles
# The longest strictly increasing subsequence of an array: found by
# dealing the array into a solitaire game, in O(n log n), with a
# duality theorem falling out of the piles for free.
#
# The pairing is the point. The algorithm is the one-pass deal with
# binary search: each value lands on the LEFTMOST pile whose top is
# >= it, or starts a new pile: n bisect steps total. The heuristic is
# the patience-pile invariant that makes the pile COUNT the answer:
# every pile is decreasing top-to-bottom, so an increasing
# subsequence can take at most one card per pile (LIS <= piles):
# while backpointers from each card to the top of the pile to its
# left splice together an increasing sequence one card per pile
# (piles <= LIS): equality, constructive, reconstructed and verified
# here card by card. The referees: the O(n^2) DP on 400 arrays with
# the witness subsequence checked; FULL 2^n enumeration on 50 small
# arrays (the absolute referee); the duality corollary LIS x LDS >=
# n asserted on every trial (each pile is a decreasing subsequence);
# Ulam's problem measured (mean LIS of a random n-permutation ~
# 2 sqrt n); and the op meter: 50 million DP comparisons vs 13
# bisect-steps-per-item at n = 10,000.
import bisect
import random
from itertools import combinations


def lis_patience(a, counter=None):
    """Returns (length, one witness subsequence as indices)."""
    tops = []          # tops[k]: current top VALUE of pile k
    top_idx = []       # index of that top card
    parent = [-1] * len(a)
    for i, x in enumerate(a):
        k = bisect.bisect_left(tops, x)
        if counter is not None:
            counter["steps"] = counter.get("steps", 0) + max(1, len(tops)).bit_length()
        if k == len(tops):
            tops.append(x)
            top_idx.append(i)
        else:
            tops[k] = x
            top_idx[k] = i
        parent[i] = top_idx[k - 1] if k > 0 else -1
    # Reconstruct from the last pile's top.
    out = []
    i = top_idx[-1] if top_idx else -1
    while i != -1:
        out.append(i)
        i = parent[i]
    return len(tops), out[::-1]


def lis_dp(a, counter=None):
    n = len(a)
    if n == 0:
        return 0
    best = [1] * n
    for i in range(n):
        for j in range(i):
            if counter is not None:
                counter["cmps"] = counter.get("cmps", 0) + 1
            if a[j] < a[i]:
                best[i] = max(best[i], best[j] + 1)
    return max(best)


def lis_brute(a):
    n = len(a)
    best = 0
    for r in range(n, 0, -1):
        for idxs in combinations(range(n), r):
            if all(a[idxs[k]] < a[idxs[k + 1]] for k in range(r - 1)):
                return r
    return 0


def piles_of(a):
    """The actual piles, for the duality assertions."""
    piles = []
    for x in a:
        tops = [p[-1] for p in piles]
        k = bisect.bisect_left(tops, x)
        if k == len(piles):
            piles.append([x])
        else:
            piles[k].append(x)
    return piles


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 400 arrays vs the O(n^2) DP, with the witness checked:
    # right length, strictly increasing, and index-ordered.
    for trial in range(400):
        n = rng.randint(1, 150)
        if trial % 4 == 0:
            a = [rng.randint(0, 20) for _ in range(n)]   # heavy ties
        else:
            a = [rng.randint(-1000, 1000) for _ in range(n)]
        L, w = lis_patience(a)
        assert L == lis_dp(a), (a, L)
        assert len(w) == L
        assert all(w[k] < w[k + 1] for k in range(L - 1))
        assert all(a[w[k]] < a[w[k + 1]] for k in range(L - 1))

        # The duality, every trial: piles are decreasing subsequences
        # covering the array, so LIS * LDS >= n: with pile count == L.
        piles = piles_of(a)
        assert len(piles) == L
        for p in piles:
            assert all(p[k] >= p[k + 1] for k in range(len(p) - 1))
        lds = lis_dp([-x for x in a])
        assert L * lds >= n  # Erdos-Szekeres, constructive form

    # Oracle 2: the absolute referee: full subsequence enumeration on
    # 50 arrays of n <= 15.
    for _ in range(50):
        n = rng.randint(1, 15)
        a = [rng.randint(0, 30) for _ in range(n)]
        L, _ = lis_patience(a)
        assert L == lis_brute(a)

    # Oracle 3: the op meter at n = 10,000.
    n = 10_000
    a = [rng.randint(0, 10**6) for _ in range(n)]
    c_p, c_d = {}, {}
    L, _ = lis_patience(a, c_p)
    assert L == lis_dp(a, c_d)
    ratio = c_d["cmps"] / c_p["steps"]
    assert ratio > 100

    # Oracle 4: Ulam's problem, measured. Mean LIS of a random
    # permutation of n is ~ 2 sqrt(n) (minus a Tracy-Widom sized
    # correction): at n = 2,500, 2 sqrt(n) = 100.
    total = 0
    T = 200
    for _ in range(T):
        perm = list(range(2_500))
        rng.shuffle(perm)
        total += lis_patience(perm)[0]
    mean_lis = total / T
    assert 88 < mean_lis < 100  # below 2*sqrt(n), by the known shave

    # Oracle 5: the client: nested envelopes. Sort by width (ties:
    # height DESC so equal widths cannot chain), LIS on heights.
    m = 200
    envs = [(rng.randint(1, 300), rng.randint(1, 300)) for _ in range(m)]
    envs_sorted = sorted(envs, key=lambda e: (e[0], -e[1]))
    heights = [h for _, h in envs_sorted]
    chain, w = lis_patience(heights)
    # verify the witness is a real nesting chain
    picked = [envs_sorted[i] for i in w]
    for k in range(len(picked) - 1):
        assert picked[k][0] < picked[k + 1][0] and picked[k][1] < picked[k + 1][1]
    # and matches the O(m^2) DP on the 2D dominance order
    best = [1] * m
    for i in range(m):
        for j in range(i):
            if envs_sorted[j][0] < envs_sorted[i][0] and envs_sorted[j][1] < envs_sorted[i][1]:
                best[i] = max(best[i], best[j] + 1)
    assert chain == max(best)

    print(f"contest: LIS of 10,000 values; referee: the O(n^2) DP on 400 arrays with witnesses verified, and FULL 2^n enumeration on 50 small arrays")
    print(f"  {'method':<26} {'ops':>12}   note")
    print(f"  {'DP over pairs':<26} {c_d['cmps']:>12,}   n(n-1)/2 comparisons: the quadratic table")
    print(f"  {'Patience + bisect':<26} {c_p['steps']:>12,}   ~log n per card: {ratio:.0f}x fewer")
    print(f"the duality, asserted on all 400 arrays: pile count == LIS (each pile decreasing, one card per pile max; backpointers splice the witness), and LIS x LDS >= n (Erdos-Szekeres, constructive)")
    print(f"Ulam's problem, measured: mean LIS of a random 2,500-permutation = {mean_lis:.1f} vs 2 sqrt(n) = 100: the famous shave below the ceiling is Tracy-Widom sized")
    print(f"the client: 200 envelopes, longest nesting chain = {chain} (width-sorted with heights tie-broken DESC, LIS on heights), witness chain verified pair by pair and DP-matched")
    print("OK: 400 arrays DP-matched with witnesses verified, 50 arrays against full enumeration, the pile duality and Erdos-Szekeres on every trial, the op meter, Ulam's constant measured, and the envelope chain checked")
