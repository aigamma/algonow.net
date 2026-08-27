# Puzzle 10: Quicksort x median-of-three pivot
# Sort an array in place, using nothing but pairwise less-than comparisons.
#
# The pairing is the point. Quicksort's control structure (partition around a
# pivot, recurse on both sides) is correct no matter which pivot you pick.
# What the pivot decides is the SHAPE of the recursion: a median-ish pivot
# gives balanced halves and n log n work, a bad pivot peels one element per
# level and costs n squared over two. Median-of-three samples the first,
# middle, and last keys and takes the middle one: three comparisons of
# insurance per partition that kill the classic cliff inputs (sorted,
# reverse-sorted, organ-pipe) while leaving the average case a touch cheaper
# than a blind pivot. What it does NOT kill is a true adversary, and this
# file measures that honestly too.
import math
import random


def counting_lt(counter, adversary=None):
    """A less-than that pays into one shared counter, so every method on the
    page spends the same currency. With an adversary attached, the answers
    come from McIlroy's killer instead of the numbers."""
    if adversary is None:
        def lt(x, y):
            counter["comparisons"] = counter.get("comparisons", 0) + 1
            return x < y
    else:
        def lt(x, y):
            counter["comparisons"] = counter.get("comparisons", 0) + 1
            return adversary.compare(x, y) < 0
    return lt


def choose_first(a, lo, hi, lt):
    """The naive rule: no work, no defense."""
    return lo


def choose_median_of_three(a, lo, hi, lt):
    """Sample first, middle, last; return the index holding the median.

    Two or three comparisons, paid into the same counter as everything else,
    which is the honest price of the insurance.
    """
    mid = (lo + hi) // 2
    x, y, z = a[lo], a[mid], a[hi]
    if lt(x, y):
        if lt(y, z):
            return mid
        return hi if lt(x, z) else lo
    if lt(x, z):
        return lo
    return hi if lt(y, z) else mid


def quicksort(a, lt, choose):
    """Iterative Lomuto quicksort, in place. The explicit stack survives the
    degenerate recursions this page exists to demonstrate."""
    stack = [(0, len(a) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            continue
        p = choose(a, lo, hi, lt)
        a[p], a[hi] = a[hi], a[p]
        i = lo
        for j in range(lo, hi):
            if lt(a[j], a[hi]):
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        stack.append((lo, i - 1))
        stack.append((i + 1, hi))


# ---------------------------------------------------------------- the rivals


def mergesort(a, lt):
    """Top-down stable mergesort. Guaranteed n log n comparisons, but it pays
    with a second array: the one rival here that is not in place."""
    n = len(a)
    if n <= 1:
        return list(a)
    left = mergesort(a[: n // 2], lt)
    right = mergesort(a[n // 2 :], lt)
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if lt(right[j], left[i]):  # strict: equal keys keep left first (stable)
            out.append(right[j])
            j += 1
        else:
            out.append(left[i])
            i += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out


def _sift_down(a, lo, root, end, lt):
    """Heap sift within a[lo..end], root relative to lo."""
    while True:
        left = lo + 2 * root + 1
        right = left + 1
        largest = lo + root
        if left <= end and lt(a[largest], a[left]):
            largest = left
        if right <= end and lt(a[largest], a[right]):
            largest = right
        if largest == lo + root:
            return
        a[lo + root], a[largest] = a[largest], a[lo + root]
        root = largest - lo


def heapsort_range(a, lo, hi, lt):
    """In-place heapsort of a[lo..hi]. Also introsort's escape hatch."""
    n = hi - lo + 1
    for root in range(n // 2 - 1, -1, -1):
        _sift_down(a, lo, root, hi, lt)
    for end in range(hi, lo, -1):
        a[lo], a[end] = a[end], a[lo]
        _sift_down(a, lo, 0, end - 1, lt)


def heapsort(a, lt):
    if len(a) > 1:
        heapsort_range(a, 0, len(a) - 1, lt)


def introsort(a, lt):
    """Musser's hybrid: quicksort with median-of-three until the recursion
    depth spends its 2 log n budget, then heapsort finishes that range. The
    engineered answer to the adversary: same average, bounded worst case."""
    n = len(a)
    if n <= 1:
        return
    stack = [(0, n - 1, 2 * int(math.log2(n)))]
    while stack:
        lo, hi, depth = stack.pop()
        if lo >= hi:
            continue
        if depth == 0:
            heapsort_range(a, lo, hi, lt)
            continue
        p = choose_median_of_three(a, lo, hi, lt)
        a[p], a[hi] = a[hi], a[p]
        i = lo
        for j in range(lo, hi):
            if lt(a[j], a[hi]):
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        stack.append((lo, i - 1, depth - 1))
        stack.append((i + 1, hi, depth - 1))


class _Wrapped:
    """Routes CPython's own sort through the shared comparator."""
    __slots__ = ("v", "lt")

    def __init__(self, v, lt):
        self.v = v
        self.lt = lt

    def __lt__(self, other):
        return self.lt(self.v, other.v)


def timsort(a, lt):
    """CPython's list.sort IS Timsort (powersort merge policy since 3.11);
    wrapping the keys makes it pay into the same comparison counter."""
    return [w.v for w in sorted(_Wrapped(x, lt) for x in a)]


# ------------------------------------------------------------- the adversary


class KillerAdversary:
    """McIlroy's killer (Software: Practice and Experience 29(4), 1999).

    Keys start as 'gas'. When two gas keys are compared, the current pivot
    candidate freezes to the next solid value, so whatever key the sort is
    pivoting on turns out to be nearly the smallest of its range: every
    partition is terrible, and any deterministic quicksort goes quadratic.
    Answers stay consistent with a real total order throughout, so this is
    not cheating; it is worst-case input, discovered on demand.
    """

    def __init__(self, n):
        self.solid = {}
        self.nsolid = 0
        self.candidate = -1
        self.gas = n  # larger than any solid value

    def _value(self, x):
        return self.solid.get(x, self.gas)

    def compare(self, x, y):
        if x not in self.solid and y not in self.solid:
            freeze = x if x == self.candidate else y
            self.solid[freeze] = self.nsolid
            self.nsolid += 1
        if x not in self.solid:
            self.candidate = x
        elif y not in self.solid:
            self.candidate = y
        return self._value(x) - self._value(y)


# --------------------------------------------------------------- the contest


METHODS = [
    ("Quicksort x median-of-three", "qs3"),
    ("Quicksort x first element", "qs1"),
    ("Mergesort", "merge"),
    ("Heapsort", "heap"),
    ("Timsort", "tim"),
    ("Introsort", "intro"),
]


def run_method(kind, data, counter, adversary=None):
    lt = counting_lt(counter, adversary)
    a = list(data)
    if kind == "qs3":
        quicksort(a, lt, choose_median_of_three)
    elif kind == "qs1":
        quicksort(a, lt, choose_first)
    elif kind == "merge":
        a = mergesort(a, lt)
    elif kind == "heap":
        heapsort(a, lt)
    elif kind == "tim":
        a = timsort(a, lt)
    elif kind == "intro":
        introsort(a, lt)
    return a


def contest(n=2048, seed=20260827):
    rng = random.Random(seed)
    shuffled = list(range(n))
    rng.shuffle(shuffled)
    already = list(range(n))
    rows = []
    for name, kind in METHODS:
        counts = []
        for data in (shuffled, already):
            c = {}
            out = run_method(kind, data, c)
            assert out == sorted(data), f"{name} failed to sort"
            counts.append(c["comparisons"])
        c = {}
        run_method(kind, list(range(n)), c, adversary=KillerAdversary(n))
        counts.append(c["comparisons"])
        rows.append((name, counts))
    return n, rows


if __name__ == "__main__":
    # Oracle 1: every method agrees with Python's sorted() across random
    # cases: duplicates, all-equal, empty, singletons, sorted, reversed.
    rng = random.Random(3)
    cases = [[], [7], [2, 1], [5, 5, 5, 5], list(range(40)), list(range(40, 0, -1))]
    for _ in range(200):
        n = rng.randint(2, 90)
        cases.append([rng.randint(0, 20) for _ in range(n)])
    for data in cases:
        want = sorted(data)
        for name, kind in METHODS:
            got = run_method(kind, data, {})
            assert got == want, f"{name} wrong on {data[:8]}..."

    # Oracle 2: stability, probed with (key, tag) pairs compared on key only.
    # Mergesort and Timsort must preserve tag order inside equal keys;
    # quicksort provably breaks it, pinned on a concrete deterministic case.
    def tags_stable(pairs):
        for i in range(1, len(pairs)):
            if pairs[i - 1][0] == pairs[i][0] and pairs[i - 1][1] > pairs[i][1]:
                return False
        return True

    rng = random.Random(9)
    broke = None
    for trial in range(200):
        pairs = [(rng.randint(0, 3), i) for i in range(rng.randint(4, 16))]
        lt = lambda p, q: p[0] < q[0]  # compare keys only, tags ride along
        m = mergesort(list(pairs), lt)
        t = timsort(list(pairs), lt)
        assert tags_stable(m), f"mergesort unstable on {pairs}"
        assert tags_stable(t), f"Timsort unstable on {pairs}"
        q = list(pairs)
        quicksort(q, lt, choose_median_of_three)
        assert sorted(q) == sorted(pairs)
        if broke is None and not tags_stable(q):
            broke = pairs
    assert broke is not None, "expected quicksort to break stability somewhere"

    # Oracle 3: the cliff and the rescue, pinned with inequalities. On an
    # already-sorted array the first-element pivot is quadratic and the
    # median-of-three pivot is n log n.
    n = 2048
    c1, c3 = {}, {}
    run_method("qs1", list(range(n)), c1)
    run_method("qs3", list(range(n)), c3)
    assert c1["comparisons"] >= n * n / 4, "first pivot must go quadratic on sorted input"
    assert c3["comparisons"] <= 2 * n * math.log2(n), "median-of-three must stay n log n"

    # Oracle 4: the adversary. Median-of-three quicksort dies (quadratic);
    # introsort's depth cutoff rescues it; the n log n rivals cannot be hurt
    # because their comparison counts are bounded whatever the answers are.
    adv_counts = {}
    for name, kind in METHODS:
        c = {}
        run_method(kind, list(range(n)), c, adversary=KillerAdversary(n))
        adv_counts[kind] = c["comparisons"]
    assert adv_counts["qs3"] >= n * n / 8, "the killer must beat median-of-three"
    assert adv_counts["qs1"] >= n * n / 8, "the killer must beat the naive pivot too"
    assert adv_counts["intro"] <= 6 * n * math.log2(n), "introsort must stay bounded"
    for kind in ("merge", "heap", "tim"):
        assert adv_counts[kind] <= 3 * n * math.log2(n), f"{kind} must be unhurt"

    # Oracle 5: Timsort on already-sorted input is exactly one run-detection
    # pass: n - 1 comparisons. The most adaptive number on the board.
    c = {}
    run_method("tim", list(range(n)), c)
    assert c["comparisons"] == n - 1, f"Timsort on sorted input: {c['comparisons']}"

    # Oracle 6: the published contest, regenerated and order-checked.
    n, rows = contest()
    work = {name: counts for name, counts in rows}
    assert work["Quicksort x median-of-three"][0] < work["Heapsort"][0], (
        "on shuffled input quicksort must beat heapsort"
    )
    assert work["Quicksort x first element"][1] > 40 * work["Quicksort x median-of-three"][1], (
        "on sorted input the naive pivot must be a disaster"
    )
    print(f"contest on {n:,} distinct keys, work in comparisons:")
    print(f"  {'method':<28} {'shuffled':>9} {'sorted':>9} {'adversarial':>11}")
    for name, counts in rows:
        print(f"  {name:<28} {counts[0]:>9,} {counts[1]:>9,} {counts[2]:>11,}")

    print("OK: six sorts agree with sorted(), stability pinned, the cliff, the rescue, and the killer all measured")
