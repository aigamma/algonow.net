# Puzzle 26: Fenwick tree x low-bit ladders
# An array that keeps changing, a stream of prefix-sum questions, and both
# must stay logarithmic at once.
#
# The pairing is the point. The control structure is an implicit tree kept
# inside one plain array: cell i is responsible for a block of the original
# array, and queries and updates are walks between responsible cells. The
# heuristic is what makes the tree exist without a single pointer: lowbit,
# i & (-i), the lowest set bit of the index. Cell i owns exactly the block
# of length lowbit(i) ending at i; a prefix query descends i -= lowbit(i),
# summing disjoint blocks that tile the prefix (the index's binary
# expansion, read as geometry); an update climbs i += lowbit(i), touching
# every owner. Twelve lines, n cells, log n touches, and this file asserts
# the ownership invariant for every cell after every batch of updates.
import random


class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed: the bit tricks demand it

    def update(self, i, delta, counter=None):
        i += 1
        while i <= self.n:
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            self.tree[i] += delta
            i += i & (-i)  # climb to the next owner

    def prefix(self, i, counter=None):
        """Sum of arr[0..i-1]."""
        s = 0
        while i > 0:
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            s += self.tree[i]
            i -= i & (-i)  # drop the lowest block, descend the ladder
        return s


class PrefixArray:
    """Cumulative sums: O(1) queries, and every update rebuilds the tail.
    Unbeatable when nothing changes; measured into the ground when it does."""

    def __init__(self, arr):
        self.cum = [0]
        for x in arr:
            self.cum.append(self.cum[-1] + x)

    def update(self, i, delta, counter=None):
        for j in range(i + 1, len(self.cum)):
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            self.cum[j] += delta

    def prefix(self, i, counter=None):
        if counter is not None:
            counter["touches"] = counter.get("touches", 0) + 1
        return self.cum[i]


class SegTreeSum:
    """The general tool: explicit ranges, 2n storage here, log touches. It
    does everything Fenwick does and everything Fenwick cannot (min, max,
    lazy ranges); the price is constant factor and memory."""

    def __init__(self, arr):
        self.n = len(arr)
        self.t = [0] * (2 * self.n)
        for i, x in enumerate(arr):
            self.t[self.n + i] = x
        for i in range(self.n - 1, 0, -1):
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def update(self, i, delta, counter=None):
        i += self.n
        while i >= 1:
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            self.t[i] += delta
            i //= 2

    def prefix(self, i, counter=None):
        # Sum of [0, i): standard iterative range sum with l=0.
        s = 0
        l, r = self.n, self.n + i
        while l < r:
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            if l & 1:
                s += self.t[l]
                l += 1
            if r & 1:
                r -= 1
                s += self.t[r]
            l //= 2
            r //= 2
        return s


class SqrtBlocks:
    """Square-root decomposition: block sums of size ~sqrt(n). Updates touch
    two cells; queries walk ~sqrt(n) blocks. The simplest tunable"""

    def __init__(self, arr):
        import math
        self.arr = list(arr)
        self.b = max(1, int(math.sqrt(len(arr))))
        self.blocks = [0] * (len(arr) // self.b + 1)
        for i, x in enumerate(arr):
            self.blocks[i // self.b] += x

    def update(self, i, delta, counter=None):
        if counter is not None:
            counter["touches"] = counter.get("touches", 0) + 2
        self.arr[i] += delta
        self.blocks[i // self.b] += delta

    def prefix(self, i, counter=None):
        s = 0
        full = i // self.b
        for b in range(full):
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            s += self.blocks[b]
        for j in range(full * self.b, i):
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            s += self.arr[j]
        return s


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the lowbit identity itself: i & -i is the lowest set bit.
    for i in range(1, 4097):
        low = i & (-i)
        assert low == 2 ** (bin(i)[::-1].index("1")), i

    # Oracle 2: the ownership invariant, the meaning of the ladder. After
    # random updates, cell i of the tree must equal the sum of exactly the
    # block of length lowbit(i) ending at i. Checked for EVERY cell.
    n = 512
    arr = [rng.randint(-9, 9) for _ in range(n)]
    fw = Fenwick(n)
    for i, x in enumerate(arr):
        fw.update(i, x)
    for _ in range(300):
        i = rng.randrange(n)
        d = rng.randint(-5, 5)
        arr[i] += d
        fw.update(i, d)
    for i in range(1, n + 1):
        low = i & (-i)
        assert fw.tree[i] == sum(arr[i - low : i]), i

    # Oracle 3: four structures, one brute-force referee, interleaved.
    n = 800
    arr = [rng.randint(-20, 20) for _ in range(n)]
    fw = Fenwick(n)
    for i, x in enumerate(arr):
        fw.update(i, x)
    pa = PrefixArray(arr)
    st = SegTreeSum(arr)
    sq = SqrtBlocks(arr)
    shadow = list(arr)
    for _ in range(3000):
        if rng.random() < 0.5:
            i = rng.randrange(n)
            d = rng.randint(-9, 9)
            shadow[i] += d
            fw.update(i, d)
            pa.update(i, d)
            st.update(i, d)
            sq.update(i, d)
        else:
            i = rng.randint(0, n)
            want = sum(shadow[:i])
            assert fw.prefix(i) == want
            assert pa.prefix(i) == want
            assert st.prefix(i) == want
            assert sq.prefix(i) == want
            # Range sums as prefix differences.
            l = rng.randint(0, i)
            assert fw.prefix(i) - fw.prefix(l) == sum(shadow[l:i])

    # Oracle 4: the logarithmic promise as a maximum. No single Fenwick
    # operation on n = 100,000 touches more than log2(n) + 1 cells.
    import math
    big = 100_000
    fwb = Fenwick(big)
    worst = 0
    for _ in range(2000):
        c = {}
        fwb.update(rng.randrange(big), rng.randint(-5, 5), c)
        worst = max(worst, c["touches"])
        c = {}
        fwb.prefix(rng.randint(0, big), c)
        worst = max(worst, c["touches"])
    assert worst <= math.ceil(math.log2(big)) + 1, worst

    # Oracle 5: inverses restore the world. Apply updates, revert them,
    # and every prefix returns to its baseline.
    base = [fwb.prefix(i) for i in range(0, big, 9973)]
    edits = [(rng.randrange(big), rng.randint(-9, 9)) for _ in range(500)]
    for i, d in edits:
        fwb.update(i, d)
    for i, d in edits:
        fwb.update(i, -d)
    assert [fwb.prefix(i) for i in range(0, big, 9973)] == base

    # Oracle 6: the never-here, proven by two witnesses. Min has no
    # subtraction, so no function of prefix minima can answer range min:
    # these two arrays share every prefix-min yet differ on min(1..1).
    a1, a2 = [1, 5, 9], [1, 7, 9]
    pm = lambda a: [min(a[: i + 1]) for i in range(len(a))]
    assert pm(a1) == pm(a2) == [1, 1, 1]
    assert min(a1[1:2]) != min(a2[1:2])  # 5 vs 7: unrecoverable from prefixes

    # The contest: one n, two workloads.
    N = 3000
    arr = [rng.randint(-20, 20) for _ in range(N)]
    mixed_ops = []
    for _ in range(6000):
        if rng.random() < 0.5:
            mixed_ops.append(("u", rng.randrange(N), rng.randint(-9, 9)))
        else:
            mixed_ops.append(("q", rng.randint(0, N), 0))
    static_qs = [rng.randint(0, N) for _ in range(100_000)]

    def run_mixed(make):
        s = make()
        c = {}
        for kind, i, d in mixed_ops:
            if kind == "u":
                s.update(i, d, c)
            else:
                s.prefix(i, c)
        return c["touches"]

    def run_static(make):
        s = make()
        c = {}
        for i in static_qs:
            s.prefix(i, c)
        return c["touches"]

    def fw_make():
        f = Fenwick(N)
        for i, x in enumerate(arr):
            f.update(i, x)
        return f

    results = {}
    for name, make in (
        ("Fenwick x lowbit", fw_make),
        ("Prefix-sum array", lambda: PrefixArray(arr)),
        ("Segment tree", lambda: SegTreeSum(arr)),
        ("Sqrt decomposition", lambda: SqrtBlocks(arr)),
    ):
        results[name] = (run_mixed(make), run_static(make))

    assert results["Fenwick x lowbit"][0] < results["Sqrt decomposition"][0] < results["Prefix-sum array"][0]
    assert results["Prefix-sum array"][1] < results["Fenwick x lowbit"][1]

    print(f"contest: n = {N:,}; two workloads, work = cells touched:")
    print(f"  {'structure':<22} {'mixed 3k+3k ops':>16} {'static 100k queries':>20}")
    for name in ("Fenwick x lowbit", "Prefix-sum array", "Segment tree", "Sqrt decomposition"):
        a, b = results[name]
        print(f"  {name:<22} {a:>16,} {b:>20,}")
    print(f"worst single Fenwick op at n=100,000: {worst} touches (log2 bound {math.ceil(math.log2(big)) + 1})")
    print("OK: lowbit and the ownership invariant verified for every cell, four structures agree with the referee, the log bound is a maximum, min is proven prefix-irrecoverable")
