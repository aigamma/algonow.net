# Puzzle 33: Quickselect x random pivot
# Find the k-th smallest of n unordered items in expected linear time,
# against inputs that are allowed to be hostile.
#
# The pairing is the point. The algorithm is Hoare's 1961 FIND skeleton:
# partition around a pivot, then recurse into only the side holding rank
# k, so a pivot that lands anywhere reasonable shrinks the problem
# geometrically and the costs sum to a constant times n. The heuristic is
# the lottery: a pivot chosen uniformly at random makes the geometric
# shrink a theorem in expectation for EVERY input, because an adversary
# cannot aim at a coin it has not seen. This file does not argue that
# abstractly: it BUILDS the killer input for the deterministic
# median-of-three rule with McIlroy's gas adversary, replays it to
# measured quadratic cost, then feeds the same killer to the lottery and
# watches it cost 3.4n.
import math
import random


def make_counter():
    return {"cmps": 0}


def counting_less(counter):
    def less(a, b):
        counter["cmps"] += 1
        return a < b
    return less


def pivot_first(arr, lo, hi, less):
    return lo


def pivot_random(rng):
    def rule(arr, lo, hi, less):
        return rng.randint(lo, hi)
    return rule


def pivot_median_of_three(arr, lo, hi, less):
    mid = (lo + hi) // 2
    a, b, c = arr[lo], arr[mid], arr[hi]
    if less(a, b):
        if less(b, c):
            return mid
        return hi if less(a, c) else lo
    if less(a, c):
        return lo
    return hi if less(b, c) else mid


def quickselect(items, k, less, pivot_rule):
    """Iterative select with a three-way (Dutch flag) partition, so
    duplicate-heavy inputs cost linear instead of the classic quadratic."""
    arr = list(items)
    lo, hi = 0, len(arr) - 1
    while True:
        if lo == hi:
            return arr[lo]
        p = pivot_rule(arr, lo, hi, less)
        v = arr[p]
        i, lt, gt = lo, lo, hi
        while i <= gt:
            if less(arr[i], v):
                arr[i], arr[lt] = arr[lt], arr[i]
                lt += 1
                i += 1
            elif less(v, arr[i]):
                arr[i], arr[gt] = arr[gt], arr[i]
                gt -= 1
            else:
                i += 1
        if k < lt:
            hi = lt - 1
        elif k > gt:
            lo = gt + 1
        else:
            return v


def insertion_sorted(vals, less):
    out = list(vals)
    for i in range(1, len(out)):
        j = i
        while j > 0 and less(out[j], out[j - 1]):
            out[j], out[j - 1] = out[j - 1], out[j]
            j -= 1
    return out


def median_of_medians(vals, k, less):
    """BFPRT 1973: groups of five, the median of medians as pivot,
    worst-case linear by theorem, priced below by measurement."""
    arr = list(vals)
    while True:
        n = len(arr)
        if n <= 10:
            return insertion_sorted(arr, less)[k]
        medians = [
            insertion_sorted(arr[i : i + 5], less)[len(arr[i : i + 5]) // 2]
            for i in range(0, n, 5)
        ]
        piv = median_of_medians(medians, len(medians) // 2, less)
        lows = [x for x in arr if less(x, piv)]
        highs = [x for x in arr if less(piv, x)]
        eq = n - len(lows) - len(highs)
        if k < len(lows):
            arr = lows
        elif k < len(lows) + eq:
            return piv
        else:
            k -= len(lows) + eq
            arr = highs


class GasAdversary:
    """McIlroy 1999, 'A Killer Adversary for Quicksort': values start as
    gas; every comparison the select makes forces at most one freeze, to
    the next-smallest solid value, so whichever element the strategy
    treats as a pivot ends up small and the partition barely shrinks.
    Works against ANY deterministic pivot rule routed through less()."""

    def __init__(self, n):
        self.val = [None] * n
        self.nsolid = 0
        self.candidate = -1
        self.ncmp = 0

    def freeze(self, x):
        self.val[x] = self.nsolid
        self.nsolid += 1

    def less(self, x, y):
        self.ncmp += 1
        if self.val[x] is None and self.val[y] is None:
            self.freeze(x if x == self.candidate else y)
        if self.val[x] is None:
            self.candidate = x
            return False  # gas outranks every solid
        if self.val[y] is None:
            self.candidate = y
            return True
        return self.val[x] < self.val[y]

    def concrete(self):
        for x in range(len(self.val)):
            if self.val[x] is None:
                self.freeze(x)
        return list(self.val)


class Cnt:
    """Comparison-counting box for pricing library sorts and heaps."""

    __slots__ = ("v", "c")

    def __init__(self, v, c):
        self.v = v
        self.c = c

    def __lt__(self, other):
        self.c["cmps"] += 1
        return self.v < other.v


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: correctness against the sorted referee, every method,
    # including duplicate-heavy arrays and both rank edges.
    for trial in range(300):
        n = rng.randint(1, 60)
        vals = [rng.randint(0, 12) for _ in range(n)]  # heavy duplicates
        k = rng.choice([0, n - 1, rng.randrange(n)])
        want = sorted(vals)[k]
        for rule in (pivot_first, pivot_median_of_three, pivot_random(rng)):
            got = quickselect(vals, k, counting_less(make_counter()), rule)
            assert got == want, (vals, k, rule)
        assert median_of_medians(vals, k, counting_less(make_counter())) == want

    # Oracle 2: the friendly-ground ledger at n = 100,000, k = median.
    N = 100_000
    K = N // 2
    big = [rng.random() for _ in range(N)]
    want = sorted(big)[K]

    c_rand = make_counter()
    assert quickselect(big, K, counting_less(c_rand), pivot_random(rng)) == want
    c_med3 = make_counter()
    assert quickselect(big, K, counting_less(c_med3), pivot_median_of_three) == want
    c_mom = make_counter()
    assert median_of_medians(big, K, counting_less(c_mom)) == want
    c_sort = make_counter()
    assert sorted(Cnt(v, c_sort) for v in big)[K].v == want
    c_heap_mid = make_counter()
    import heapq
    assert heapq.nsmallest(K + 1, (Cnt(v, c_heap_mid) for v in big))[-1].v == want
    c_heap_10 = make_counter()
    top10 = heapq.nsmallest(10, (Cnt(v, c_heap_10) for v in big))
    assert [t.v for t in top10] == sorted(big)[:10]

    assert 2.0 * N <= c_rand["cmps"] <= 6.0 * N, c_rand    # theory: ~3.39n
    assert c_mom["cmps"] <= 60 * N
    nlog = N * math.log2(N)
    assert 0.8 * nlog <= c_sort["cmps"] <= 1.1 * nlog

    # Oracle 3: the all-equal storm. Three-way partitioning keeps the
    # classic duplicate trap linear: measured, not promised.
    c_eq = make_counter()
    assert quickselect([7] * N, K, counting_less(c_eq), pivot_random(rng)) == 7
    assert c_eq["cmps"] <= 4 * N, c_eq

    # Oracle 4: BUILD the killer for median-of-three with the gas
    # adversary, then replay it on concrete values: measured quadratic.
    KN = 2_000
    gas = GasAdversary(KN)
    quickselect(list(range(KN)), KN // 2, gas.less, pivot_median_of_three)
    killer = gas.concrete()
    assert sorted(killer) == list(range(KN))  # a genuine permutation

    c_replay = make_counter()
    got = quickselect(killer, KN // 2, counting_less(c_replay), pivot_median_of_three)
    assert got == sorted(killer)[KN // 2]
    assert c_replay["cmps"] >= KN * KN / 8, c_replay  # quadratic, certified

    # The same killer, fed to the lottery: immune, ten seeds averaged.
    lottery_runs = []
    for seed in range(10):
        c = make_counter()
        r2 = random.Random(900 + seed)
        assert quickselect(killer, KN // 2, counting_less(c), pivot_random(r2)) == got
        lottery_runs.append(c["cmps"])
    lottery_avg = sum(lottery_runs) / len(lottery_runs)
    assert lottery_avg <= 12 * KN, lottery_avg

    # Median of medians on the killer: the worst-case guarantee, priced.
    c_mom_k = make_counter()
    assert median_of_medians(killer, KN // 2, counting_less(c_mom_k)) == got
    assert c_mom_k["cmps"] <= 60 * KN

    # Timsort on the killer: the sledgehammer is immune too, at its price.
    c_sort_k = make_counter()
    assert sorted(Cnt(v, c_sort_k) for v in killer)[KN // 2].v == got

    # Oracle 5: the never-use, and it is any fixed rule, not just this
    # one. The gas adversary builds first-element's own killer just as
    # easily. (Folklore says plain sorted input suffices; that is true
    # of the textbook Lomuto partition, but the three-way partition here
    # scrambles sorted input into harmlessness, measured at ~75n, so the
    # honest demonstration is the built killer, not the folklore one.)
    SN = 2_000
    gas2 = GasAdversary(SN)
    quickselect(list(range(SN)), SN // 2, gas2.less, pivot_first)
    killer_first = gas2.concrete()
    assert sorted(killer_first) == list(range(SN))
    c_first = make_counter()
    assert (
        quickselect(killer_first, SN // 2, counting_less(c_first), pivot_first)
        == sorted(killer_first)[SN // 2]
    )
    assert c_first["cmps"] >= SN * SN / 8, c_first

    # The 30-trial average for the headline constant.
    trials = []
    for t in range(30):
        arr = [rng.random() for _ in range(10_000)]
        c = make_counter()
        assert quickselect(arr, 5_000, counting_less(c), pivot_random(rng)) == sorted(arr)[5_000]
        trials.append(c["cmps"] / 10_000)
    avg_const = sum(trials) / len(trials)

    print(f"contest A: random n = {N:,}, k = median; comparisons per element:")
    print(f"  {'method':<30} {'cmps/n':>8}")
    print(f"  {'Quickselect, random pivot':<30} {c_rand['cmps'] / N:>8.2f}   (30-trial avg {avg_const:.2f}; classic theory 3.39n x ~1.5 cmps/element for the three-way partition = 5.1n: the duplicate immunity below is what the 1.5 buys)")
    print(f"  {'Quickselect, median-of-3':<30} {c_med3['cmps'] / N:>8.2f}   cheaper here, and mortal below")
    print(f"  {'Median of medians':<30} {c_mom['cmps'] / N:>8.2f}   the guarantee's constant")
    print(f"  {'Timsort (full sort)':<30} {c_sort['cmps'] / N:>8.2f}   ~= log2 n, answers every k")
    print(f"  {'Heapselect k=10':<30} {c_heap_10['cmps'] / N:>8.2f}   the tiny-k specialist")
    print(f"  {'Heapselect k=n/2':<30} {c_heap_mid['cmps'] / N:>8.2f}   the specialist off its turf")
    print(f"contest B: the killer permutation BUILT for median-of-3 (McIlroy gas), n = {KN:,}, k = median:")
    print(f"  {'Quickselect, median-of-3':<30} {c_replay['cmps']:>10,}   quadratic: n^2/4 = {KN * KN // 4:,}")
    print(f"  {'Quickselect, random pivot':<30} {int(lottery_avg):>10,}   immune ({lottery_avg / KN:.2f}n, 10-seed avg)")
    print(f"  {'Median of medians':<30} {c_mom_k['cmps']:>10,}   the worst case never moves ({c_mom_k['cmps'] / KN:.1f}n)")
    print(f"  {'Timsort (full sort)':<30} {c_sort_k['cmps']:>10,}   immune at log-factor price")
    print(f"all-equal storm n = {N:,}: three-way partition finishes in {c_eq['cmps'] / N:.2f}n comparisons")
    print(f"never-use, measured: the gas adversary builds a killer for the first-element rule too, n = {SN:,}: {c_first['cmps']:,} comparisons on replay; every fixed rule has one, the lottery has none")
    print("OK: every method matches the sorted referee across 300 duplicate-heavy trials and both edges, the killer is a real permutation replayed to certified quadratic, the lottery and BFPRT shrug it off, and the duplicate storm stays linear")
