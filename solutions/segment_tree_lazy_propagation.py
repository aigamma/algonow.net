# Puzzle 35: Segment tree x lazy propagation
# An array under interleaved RANGE updates and RANGE queries, both in
# logarithmic time, with the generality that survives changing the
# question.
#
# The pairing is the point. The algorithm is the segment tree: a binary
# tree of interval sums where any range [l, r] decomposes into O(log n)
# canonical nodes. That alone gives fast range READS, but a range WRITE
# still touches every element under it. The heuristic is lazy
# propagation: stamp the write on the covering node as a debt and stop;
# push the debt one level down only when a later operation actually
# walks through. Writes become as cheap as reads, measured below at a
# 57x saving over the honest naive array, with every answer cross-checked
# by three rival structures and a brute-force referee.
import math
import random


class LazySegTree:
    """Range add, range sum. Node visits counted for the ledger."""

    def __init__(self, vals, counter=None):
        self.n = len(vals)
        size = 1
        while size < self.n:
            size *= 2
        self.size = size
        self.s = [0] * (2 * size)
        self.lz = [0] * (2 * size)
        for i, v in enumerate(vals):
            self.s[size + i] = v
        for i in range(size - 1, 0, -1):
            self.s[i] = self.s[2 * i] + self.s[2 * i + 1]
        self.c = counter

    def _visit(self):
        if self.c is not None:
            self.c["visits"] = self.c.get("visits", 0) + 1

    def _apply(self, node, v, length):
        self.s[node] += v * length
        self.lz[node] += v

    def _push(self, node, length):
        if self.lz[node]:
            half = length // 2
            self._apply(2 * node, self.lz[node], half)
            self._apply(2 * node + 1, self.lz[node], half)
            self.lz[node] = 0

    def add(self, l, r, v):
        self._add(1, 0, self.size - 1, l, r, v)

    def _add(self, node, lo, hi, l, r, v):
        self._visit()
        if r < lo or hi < l:
            return
        if l <= lo and hi <= r:
            self._apply(node, v, hi - lo + 1)
            return
        self._push(node, hi - lo + 1)
        mid = (lo + hi) // 2
        self._add(2 * node, lo, mid, l, r, v)
        self._add(2 * node + 1, mid + 1, hi, l, r, v)
        self.s[node] = self.s[2 * node] + self.s[2 * node + 1]

    def query(self, l, r):
        return self._query(1, 0, self.size - 1, l, r)

    def _query(self, node, lo, hi, l, r):
        self._visit()
        if r < lo or hi < l:
            return 0
        if l <= lo and hi <= r:
            return self.s[node]
        self._push(node, hi - lo + 1)
        mid = (lo + hi) // 2
        return self._query(2 * node, lo, mid, l, r) + self._query(
            2 * node + 1, mid + 1, hi, l, r
        )


class EagerSegTree(LazySegTree):
    """The never-use: the same tree, refusing the debt. A range write is
    performed as one point-update per element, each O(log n)."""

    def add(self, l, r, v):
        for i in range(l, r + 1):
            self._add(1, 0, self.size - 1, i, i, v)


class LazyMinTree:
    """Range add, range MIN: the same lazy idea over a different monoid,
    which is the generality the Fenwick trick cannot follow."""

    def __init__(self, vals):
        self.size = 1
        while self.size < len(vals):
            self.size *= 2
        self.m = [math.inf] * (2 * self.size)
        self.lz = [0] * (2 * self.size)
        for i, v in enumerate(vals):
            self.m[self.size + i] = v
        for i in range(self.size - 1, 0, -1):
            self.m[i] = min(self.m[2 * i], self.m[2 * i + 1])

    def _push(self, node):
        if self.lz[node]:
            for ch in (2 * node, 2 * node + 1):
                self.m[ch] += self.lz[node]
                self.lz[ch] += self.lz[node]
            self.lz[node] = 0

    def add(self, l, r, v, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.size - 1
        if r < lo or hi < l:
            return
        if l <= lo and hi <= r:
            self.m[node] += v
            self.lz[node] += v
            return
        self._push(node)
        mid = (lo + hi) // 2
        self.add(l, r, v, 2 * node, lo, mid)
        self.add(l, r, v, 2 * node + 1, mid + 1, hi)
        self.m[node] = min(self.m[2 * node], self.m[2 * node + 1])

    def minimum(self, l, r, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.size - 1
        if r < lo or hi < l:
            return math.inf
        if l <= lo and hi <= r:
            return self.m[node]
        self._push(node)
        mid = (lo + hi) // 2
        return min(
            self.minimum(l, r, 2 * node, lo, mid),
            self.minimum(l, r, 2 * node + 1, mid + 1, hi),
        )


class FenwickRange:
    """The BIT two-tree identity for range add + range sum: leaner
    constants, but the algebra is sum-specific."""

    def __init__(self, vals, counter=None):
        self.n = len(vals)
        self.b1 = [0] * (self.n + 1)
        self.b2 = [0] * (self.n + 1)
        self.c = None  # every structure builds off the clock; ops pay
        for i, v in enumerate(vals):
            self.add(i, i, v)
        self.c = counter

    def _bump(self):
        if self.c is not None:
            self.c["visits"] = self.c.get("visits", 0) + 1

    def _upd(self, tree, i, v):
        i += 1
        while i <= self.n:
            self._bump()
            tree[i] += v
            i += i & (-i)

    def _pre(self, tree, i):
        i += 1
        s = 0
        while i > 0:
            self._bump()
            s += tree[i]
            i -= i & (-i)
        return s

    def add(self, l, r, v):
        self._upd(self.b1, l, v)
        self._upd(self.b2, l, v * (l - 1))
        self._upd(self.b1, r + 1, -v)  # past the end, the walk is empty
        self._upd(self.b2, r + 1, -v * r)

    def _prefix(self, i):
        return self._pre(self.b1, i) * i - self._pre(self.b2, i)

    def query(self, l, r):
        left = self._prefix(l - 1) if l > 0 else 0
        return self._prefix(r) - left


class SqrtBlocks:
    """Blocked array: per-block pending adds and cached sums."""

    def __init__(self, vals, counter=None):
        self.n = len(vals)
        self.b = max(1, int(math.isqrt(self.n)))
        self.a = list(vals)
        nb = (self.n + self.b - 1) // self.b
        self.badd = [0] * nb
        self.bsum = [0] * nb
        for i, v in enumerate(vals):
            self.bsum[i // self.b] += v
        self.c = counter

    def _bump(self, k=1):
        if self.c is not None:
            self.c["visits"] = self.c.get("visits", 0) + k

    def add(self, l, r, v):
        bl, br = l // self.b, r // self.b
        if bl == br:
            for i in range(l, r + 1):
                self._bump()
                self.a[i] += v
                self.bsum[bl] += v
            return
        for i in range(l, (bl + 1) * self.b):
            self._bump()
            self.a[i] += v
            self.bsum[bl] += v
        for blk in range(bl + 1, br):
            self._bump()
            self.badd[blk] += v
            self.bsum[blk] += v * self.b
        for i in range(br * self.b, r + 1):
            self._bump()
            self.a[i] += v
            self.bsum[br] += v

    def query(self, l, r):
        bl, br = l // self.b, r // self.b
        s = 0
        if bl == br:
            for i in range(l, r + 1):
                self._bump()
                s += self.a[i] + self.badd[bl]
            return s
        for i in range(l, (bl + 1) * self.b):
            self._bump()
            s += self.a[i] + self.badd[bl]
        for blk in range(bl + 1, br):
            self._bump()
            s += self.bsum[blk]
        for i in range(br * self.b, r + 1):
            self._bump()
            s += self.a[i] + self.badd[br]
        return s


class NaiveArray:
    def __init__(self, vals, counter=None):
        self.a = list(vals)
        self.c = counter

    def _bump(self, k):
        if self.c is not None:
            self.c["visits"] = self.c.get("visits", 0) + k

    def add(self, l, r, v):
        self._bump(r - l + 1)
        for i in range(l, r + 1):
            self.a[i] += v

    def query(self, l, r):
        self._bump(r - l + 1)
        return sum(self.a[i] for i in range(l, r + 1))


def make_ops(n, m, rng):
    ops = []
    for i in range(m):
        l = rng.randrange(n)
        r = rng.randrange(l, n)
        if i % 2 == 0:
            ops.append(("add", l, r, rng.randint(-9, 9)))
        else:
            ops.append(("sum", l, r, 0))
    ops[0] = ("add", 0, n - 1, 3)      # full-range edges on purpose
    ops[1] = ("sum", 0, n - 1, 0)
    ops[2] = ("add", n - 1, n - 1, -5)  # single-element edges
    ops[3] = ("sum", 0, 0, 0)
    return ops


def run(structure, ops):
    out = []
    for (kind, l, r, v) in ops:
        if kind == "add":
            structure.add(l, r, v)
        else:
            out.append(structure.query(l, r))
    return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: four structures, one brute-force referee, 2,000 mixed
    # ops on a small array, every query answer compared exactly.
    n = 200
    vals = [rng.randint(-50, 50) for _ in range(n)]
    ops = make_ops(n, 2_000, rng)
    ref = run(NaiveArray(vals), ops)
    assert run(LazySegTree(vals), ops) == ref
    assert run(FenwickRange(vals), ops) == ref
    assert run(SqrtBlocks(vals), ops) == ref
    assert run(EagerSegTree(vals), ops) == ref

    # Oracle 2: the min-monoid tree, same lazy idea, brute referee.
    mt = LazyMinTree(vals)
    shadow = list(vals)
    for (kind, l, r, v) in make_ops(n, 1_000, rng):
        if kind == "add":
            mt.add(l, r, v)
            for i in range(l, r + 1):
                shadow[i] += v
        else:
            assert mt.minimum(l, r) == min(shadow[l : r + 1]), (l, r)

    # Oracle 3: the measured ledger. n = 10,000, m = 2,000 mixed ops.
    N, M = 10_000, 2_000
    big = [rng.randint(-50, 50) for _ in range(N)]
    big_ops = make_ops(N, M, rng)
    touched = sum(r - l + 1 for (_, l, r, _) in big_ops)

    c_naive = {}
    ref_big = run(NaiveArray(big, c_naive), big_ops)
    assert c_naive["visits"] == touched  # the naive bill, to the element

    c_lazy = {}
    assert run(LazySegTree(big, c_lazy), big_ops) == ref_big
    c_fen = {}
    assert run(FenwickRange(big, c_fen), big_ops) == ref_big
    c_sqrt = {}
    assert run(SqrtBlocks(big, c_sqrt), big_ops) == ref_big

    size = 1
    while size < N:
        size *= 2
    per_op_bound = 4 * (math.log2(size) + 2)
    assert c_lazy["visits"] <= M * per_op_bound, c_lazy
    assert c_sqrt["visits"] <= M * 3.5 * math.isqrt(N)

    # Oracle 4: the never-use, priced at n = 1,000, m = 500. The same
    # tree, refusing the lazy debt: every range write walks every leaf.
    n2, m2 = 1_000, 500
    small = [rng.randint(-9, 9) for _ in range(n2)]
    small_ops = make_ops(n2, m2, rng)
    c_eager = {}
    c_lazy2 = {}
    ref_small = run(LazySegTree(small, c_lazy2), small_ops)
    assert run(EagerSegTree(small, c_eager), small_ops) == ref_small
    assert c_eager["visits"] >= 20 * c_lazy2["visits"], (c_eager, c_lazy2)

    print(f"contest: n = {N:,}, m = {M:,} interleaved range-adds and range-sums (avg span {touched // M:,}); referee: every query answer identical across all structures")
    print(f"  {'structure':<26} {'visits':>12} {'per op':>8} {'vs naive':>9}")
    print(f"  {'Naive array':<26} {c_naive['visits']:>12,} {c_naive['visits'] / M:>8.0f} {'1x':>9}")
    print(f"  {'Sqrt decomposition':<26} {c_sqrt['visits']:>12,} {c_sqrt['visits'] / M:>8.0f} {c_naive['visits'] / c_sqrt['visits']:>8.0f}x")
    print(f"  {'Segment tree + lazy':<26} {c_lazy['visits']:>12,} {c_lazy['visits'] / M:>8.0f} {c_naive['visits'] / c_lazy['visits']:>8.0f}x")
    print(f"  {'Fenwick, two trees':<26} {c_fen['visits']:>12,} {c_fen['visits'] / M:>8.0f} {c_naive['visits'] / c_fen['visits']:>8.0f}x")
    print(f"generality: the same lazy idea served range-min over 1,000 ops against a brute-force referee (the sum-specific Fenwick identity cannot follow)")
    print(f"never-use, priced at n = {n2:,}: the eager tree spent {c_eager['visits']:,} node visits where lazy spent {c_lazy2['visits']:,} ({c_eager['visits'] // c_lazy2['visits']}x): a range write that refuses the debt walks every leaf, through the tree")
    print("OK: four structures and the min-monoid variant agree with brute-force referees on every query, the naive bill matches the summed spans exactly, lazy stays inside its 4(log n + 2) per-op bound, and the eager tree pays 20x+ for refusing laziness")
