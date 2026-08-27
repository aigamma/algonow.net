# Puzzle 53: Interval tree x max-endpoint subtree pruning
# Store n intervals: bookings, IP ranges, gene annotations: and answer
# "which contain this point?" and "which overlap this window?" without
# touching the intervals that could not possibly answer.
#
# The pairing is the point. The algorithm is a balanced BST keyed on
# interval LOW endpoints: ordinary search-tree machinery. The heuristic
# is one extra number per node: the maximum HIGH endpoint anywhere in
# its subtree. That single augmented field is a certificate of absence:
# a subtree whose max-end lies left of the query can contain no answer
# and is pruned wholesale, unvisited. Every report is refereed by a
# brute-force scan; the max-end invariant is re-verified recursively;
# and the design lesson is measured with an adversary: a sorted-list
# scan handles stabbing until a few long-lived early intervals force it
# to wade through everything, while the pruned tree does not care.
import random


class Node:
    __slots__ = ("lo", "hi", "left", "right", "maxend")

    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.left = None
        self.right = None
        self.maxend = hi


def build_balanced(intervals):
    """Static balanced build: sort by low endpoint, recurse on medians,
    compute max-end bottom-up."""
    ivs = sorted(intervals)

    def rec(lo_i, hi_i):
        if lo_i > hi_i:
            return None
        mid = (lo_i + hi_i) // 2
        node = Node(*ivs[mid])
        node.left = rec(lo_i, mid - 1)
        node.right = rec(mid + 1, hi_i)
        for ch in (node.left, node.right):
            if ch is not None and ch.maxend > node.maxend:
                node.maxend = ch.maxend
        return node

    import sys

    sys.setrecursionlimit(1_000_000)
    return rec(0, len(ivs) - 1)


def check_maxend(node):
    if node is None:
        return -float("inf")
    m = max(node.hi, check_maxend(node.left), check_maxend(node.right))
    assert node.maxend == m  # the augmented field is exactly the subtree max
    return m


def stab(node, x, out, counter=None):
    """All intervals containing point x. Prune any subtree whose
    max-end < x; skip right subtrees when node.lo > x."""
    if node is None:
        return
    if counter is not None:
        counter["visits"] = counter.get("visits", 0) + 1
    if node.maxend < x:
        return  # the certificate of absence: nothing below can reach x
    stab(node.left, x, out, counter)
    if node.lo <= x:
        if node.hi >= x:
            out.append((node.lo, node.hi))
        stab(node.right, x, out, counter)


def window(node, a, b, out, counter=None):
    """All intervals overlapping [a, b]."""
    if node is None:
        return
    if counter is not None:
        counter["visits"] = counter.get("visits", 0) + 1
    if node.maxend < a:
        return
    window(node.left, a, b, out, counter)
    if node.lo <= b:
        if node.hi >= a:
            out.append((node.lo, node.hi))
        window(node.right, a, b, out, counter)


def brute_stab(ivs, x, counter=None):
    if counter is not None:
        counter["visits"] = counter.get("visits", 0) + len(ivs)
    return sorted((lo, hi) for lo, hi in ivs if lo <= x <= hi)


def brute_window(ivs, a, b):
    return sorted((lo, hi) for lo, hi in ivs if lo <= b and hi >= a)


def sorted_scan_stab(sorted_ivs, x, counter=None):
    """The plausible rival: intervals sorted by low; scan every one
    with lo <= x and test its end. Long-lived early intervals make the
    candidate set huge."""
    import bisect

    hi_idx = bisect.bisect_right(sorted_ivs, (x, float("inf")))
    if counter is not None:
        counter["visits"] = counter.get("visits", 0) + hi_idx
    return sorted((lo, hi) for lo, hi in sorted_ivs[:hi_idx] if hi >= x)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 20,000 refereed queries across 100 random small sets.
    for trial in range(100):
        n = rng.randint(1, 120)
        ivs = []
        for _ in range(n):
            lo = rng.randint(0, 500)
            ivs.append((lo, lo + rng.randint(0, 80)))
        root = build_balanced(ivs)
        check_maxend(root)
        for _ in range(100):
            x = rng.randint(-10, 590)
            out = []
            stab(root, x, out)
            assert sorted(out) == brute_stab(ivs, x)
            a = rng.randint(-10, 560)
            b = a + rng.randint(0, 60)
            wout = []
            window(root, a, b, wout)
            assert sorted(wout) == brute_window(ivs, a, b)

    # Oracle 2: scale. A year of bookings in minutes: 20,000 intervals,
    # 2,000 stabbing queries, exact agreement, visits counted.
    YEAR = 525_600
    N = 20_000
    ivs = []
    for _ in range(N):
        lo = rng.randint(0, YEAR)
        ivs.append((lo, lo + rng.randint(5, 480)))
    root = build_balanced(ivs)
    check_maxend(root)
    sorted_ivs = sorted(ivs)
    c_tree = {}
    c_brute = {}
    c_scan = {}
    total_k = 0
    import math

    for _ in range(2_000):
        x = rng.randint(0, YEAR)
        out = []
        stab(root, x, out, c_tree)
        want = brute_stab(ivs, x, c_brute)
        assert sorted(out) == want
        assert sorted_scan_stab(sorted_ivs, x, c_scan) == want
        total_k += len(want)
    avg_k = total_k / 2_000
    avg_tree = c_tree["visits"] / 2_000
    logn = math.log2(N)
    assert avg_tree < 6 * (logn + avg_k * logn / 2 + 1)  # O(k log n) family

    # Oracle 3: the adversary that breaks the sorted scan. Add 40
    # long-lived early intervals (spanning most of the year): the
    # scan's candidate set becomes nearly everything; the tree prunes.
    ivs_adv = ivs + [(rng.randint(0, 1_000), YEAR - rng.randint(0, 1_000)) for _ in range(40)]
    root_adv = build_balanced(ivs_adv)
    check_maxend(root_adv)
    sorted_adv = sorted(ivs_adv)
    c_tree_a = {}
    c_scan_a = {}
    for _ in range(500):
        x = rng.randint(YEAR // 2, YEAR)  # late-day queries
        out = []
        stab(root_adv, x, out, c_tree_a)
        want = brute_stab(ivs_adv, x)
        assert sorted(out) == want
        assert sorted_scan_stab(sorted_adv, x, c_scan_a) == want
    scan_avg_a = c_scan_a["visits"] / 500
    tree_avg_a = c_tree_a["visits"] / 500
    assert scan_avg_a > 0.7 * len(ivs_adv)   # the scan wades through ~everything
    assert tree_avg_a < scan_avg_a / 25      # the pruned tree does not care

    print(f"contest: {N:,} bookings across a year of minutes, 2,000 stabbing queries (avg {avg_k:.1f} answers); referee: brute scan agreed on every report, max-end invariant verified recursively")
    print(f"  {'structure':<26} {'visits/query':>12}")
    print(f"  {'Brute scan':<26} {c_brute['visits'] / 2_000:>12,.0f}   touches every interval, every time")
    print(f"  {'Sorted list + bisect':<26} {c_scan['visits'] / 2_000:>12,.0f}   candidates = all with lo <= x: fine on this shape")
    print(f"  {'Interval tree (max-end)':<26} {avg_tree:>12,.0f}   prunes by the certificate of absence")
    print(f"the adversary: add 40 long-lived early intervals and query late in the year: sorted scan {scan_avg_a:,.0f} visits/query (wading through ~everything); the tree {tree_avg_a:,.0f} ({scan_avg_a / tree_avg_a:,.0f}x): long survivors are invisible to sorting and harmless to pruning")
    print("OK: 20,000 refereed point and window queries across 100 sets, the max-end invariant exact at every node of every tree, scale agreement on all 2,500 queries, and the sorted-scan adversary measured")
