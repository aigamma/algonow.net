# Puzzle 13: Kadane's algorithm x running maximum
# Find the contiguous run with the largest sum in an array of mixed signs.
#
# The pairing is the point. The control structure is a single left-to-right
# scan carrying one number, the best sum of a run ENDING exactly here. The
# heuristic is the update that makes that one number sufficient: extend or
# restart, best_here = max(x, best_here + x), because a negative running
# prefix is dead weight that handicaps every future window, and the moment
# it goes negative you drop it. One read per element, constant memory, and
# provably optimal: any correct method must at least look at each element.
import random


def kadane(arr, counter=None):
    """(best sum, i, j) with arr[i..j] inclusive achieving it. One pass,
    one read per element, O(1) state. At least one element is taken, so an
    all-negative array answers with its largest element."""
    best = None
    best_i = best_j = 0
    run = 0
    run_start = 0
    for idx, x in enumerate(arr):
        if counter is not None:
            counter["work"] = counter.get("work", 0) + 1
        if run <= 0:
            run = x  # restart: the old prefix could only hurt
            run_start = idx
        else:
            run += x  # extend: the old prefix still helps
        if best is None or run > best:
            best = run
            best_i, best_j = run_start, idx
    return best, best_i, best_j


# ---------------------------------------------------------------- the rivals


def brute_force(arr, counter=None):
    """Every window, by running sums: n(n+1)/2 window extensions. The
    definition made executable, and the oracle for everything else."""
    best = None
    best_i = best_j = 0
    n = len(arr)
    for i in range(n):
        running = 0
        for j in range(i, n):
            running += arr[j]
            if counter is not None:
                counter["work"] = counter.get("work", 0) + 1
            if best is None or running > best:
                best = running
                best_i, best_j = i, j
    return best, best_i, best_j


def divide_conquer(arr, counter=None):
    """Shamos's n log n: the best run lives in the left half, the right
    half, or crosses the middle, and the crossing case is two greedy scans
    outward from the split. The 4-tuple this merge implies (total, best,
    prefix, suffix) is exactly a segment tree node, which is why this
    formulation is what parallel and incremental versions build on."""

    def solve(lo, hi):
        if lo == hi:
            if counter is not None:
                counter["work"] = counter.get("work", 0) + 1
            return arr[lo], lo, lo
        mid = (lo + hi) // 2
        lb, li, lj = solve(lo, mid)
        rb, ri, rj = solve(mid + 1, hi)
        # Best run crossing the split: greedy outward in both directions.
        s = 0
        left_best = None
        left_at = mid
        for k in range(mid, lo - 1, -1):
            s += arr[k]
            if counter is not None:
                counter["work"] = counter.get("work", 0) + 1
            if left_best is None or s > left_best:
                left_best, left_at = s, k
        s = 0
        right_best = None
        right_at = mid + 1
        for k in range(mid + 1, hi + 1):
            s += arr[k]
            if counter is not None:
                counter["work"] = counter.get("work", 0) + 1
            if right_best is None or s > right_best:
                right_best, right_at = s, k
        cb = left_best + right_best
        best = max(lb, rb, cb)
        if best == lb:
            return lb, li, lj
        if best == rb:
            return rb, ri, rj
        return cb, left_at, right_at

    return solve(0, len(arr) - 1)


class SegmentTree:
    """Max-subarray segment tree: each node holds (total, best, prefix,
    suffix) for its range, merged associatively. Built once in O(n), then a
    point update costs O(log n) node merges and the root always holds the
    whole-array answer: the structure for maximum subarray under change."""

    def __init__(self, arr, counter=None):
        self.n = len(arr)
        self.arr = list(arr)
        self.counter = counter
        self.node = [None] * (4 * self.n)
        self._build(1, 0, self.n - 1)

    def _merge(self, L, R):
        if self.counter is not None:
            self.counter["work"] = self.counter.get("work", 0) + 1
        total = L[0] + R[0]
        best = max(L[1], R[1], L[3] + R[2])
        prefix = max(L[2], L[0] + R[2])
        suffix = max(R[3], R[0] + L[3])
        return (total, best, prefix, suffix)

    def _leaf(self, x):
        if self.counter is not None:
            self.counter["work"] = self.counter.get("work", 0) + 1
        return (x, x, x, x)

    def _build(self, v, lo, hi):
        if lo == hi:
            self.node[v] = self._leaf(self.arr[lo])
            return
        mid = (lo + hi) // 2
        self._build(2 * v, lo, mid)
        self._build(2 * v + 1, mid + 1, hi)
        self.node[v] = self._merge(self.node[2 * v], self.node[2 * v + 1])

    def update(self, i, x):
        self.arr[i] = x
        v, lo, hi = 1, 0, self.n - 1
        path = []
        while lo != hi:
            path.append(v)
            mid = (lo + hi) // 2
            if i <= mid:
                v, hi = 2 * v, mid
            else:
                v, lo = 2 * v + 1, mid + 1
        self.node[v] = self._leaf(x)
        for p in reversed(path):
            self.node[p] = self._merge(self.node[2 * p], self.node[2 * p + 1])

    def best(self):
        return self.node[1][1]


# --------------------------------------------------------------- the contest


def make_array(n, seed):
    rng = random.Random(seed)
    return [rng.randint(-9, 9) for _ in range(n)]


def contest():
    small = make_array(4_000, 20260827)
    big = make_array(300_000, 20260828)

    rows = {}
    c = {}
    kadane(small, c)
    k_small = c["work"]
    c = {}
    kadane(big, c)
    k_big = c["work"]

    c = {}
    divide_conquer(small, c)
    d_small = c["work"]
    c = {}
    divide_conquer(big, c)
    d_big = c["work"]

    c = {}
    brute_force(small, c)
    b_small = c["work"]

    c = {}
    st = SegmentTree(small, c)
    s_small = c["work"]
    c2 = {}
    st_big = SegmentTree(big, c2)
    s_big = c2["work"]

    # The dynamic workload: 2,000 point updates, each followed by a
    # whole-array answer. Kadane rescans; the tree repairs a path.
    rng = random.Random(7)
    upd = [(rng.randrange(4_000), rng.randint(-9, 9)) for _ in range(2_000)]
    c = {}
    arr = list(small)
    for i, x in upd:
        arr[i] = x
        kadane(arr, c)
    k_dyn = c["work"]
    c = {}
    st_dyn = SegmentTree(small, c)
    for i, x in upd:
        st_dyn.update(i, x)
        st_dyn.best()
    s_dyn = c["work"]

    rows["kadane"] = (k_small, k_big, k_dyn)
    rows["dc"] = (d_small, d_big, None)
    rows["brute"] = (b_small, None, None)
    rows["segtree"] = (s_small, s_big, s_dyn)
    return rows


if __name__ == "__main__":
    # Oracle 1: agreement, with brute force as the executable definition.
    # Values must match across all four; every reported witness interval is
    # re-summed independently and must achieve its method's value.
    rng = random.Random(3)
    cases = [
        [5], [-7], [-3, -1, -4], [2, 2, 2], [0, 0, 0],
        [1, -2, 3, -1, 4], [-1, 10, -1, 10, -1],
    ]
    for _ in range(400):
        n = rng.randint(1, 60)
        cases.append([rng.randint(-9, 9) for _ in range(n)])
    for arr in cases:
        vb, bi, bj = brute_force(arr)
        vk, ki, kj = kadane(arr)
        vd, di, dj = divide_conquer(arr)
        vs = SegmentTree(arr).best()
        assert vk == vb == vd == vs, (arr, vk, vb, vd, vs)
        assert sum(arr[ki : kj + 1]) == vk, "kadane witness must achieve its value"
        assert sum(arr[bi : bj + 1]) == vb, "brute witness must achieve its value"
        assert sum(arr[di : dj + 1]) == vd, "d&c witness must achieve its value"

    # Oracle 2: the all-negative convention, pinned. At least one element is
    # taken, so the answer is the largest single element, never zero.
    assert kadane([-3, -1, -4])[0] == -1
    assert kadane([-5])[0] == -5

    # Oracle 3: optimality made structural. Kadane reads each element
    # exactly once; the counter must equal n exactly, not approximately.
    c = {}
    kadane(make_array(10_000, 1), c)
    assert c["work"] == 10_000, c["work"]

    # Oracle 4: the dynamic answer stays exact. After every one of 300
    # random point updates, the tree's root must equal a fresh full rescan.
    arr = make_array(600, 5)
    st = SegmentTree(arr)
    rng = random.Random(9)
    for _ in range(300):
        i, x = rng.randrange(600), rng.randint(-9, 9)
        arr[i] = x
        st.update(i, x)
        assert st.best() == kadane(arr)[0], "tree and rescan disagree"

    # Oracle 5: the published contest, regenerated and order-checked.
    rows = contest()
    k_small, k_big, k_dyn = rows["kadane"]
    d_small, d_big, _ = rows["dc"]
    b_small, _, _ = rows["brute"]
    s_small, s_big, s_dyn = rows["segtree"]
    assert k_small < s_small < d_small < b_small, "one-shot ranking must hold"
    assert k_small == 4_000 and k_big == 300_000, "kadane is exactly n"
    assert s_dyn * 50 < k_dyn, "under churn the tree must win fifty-fold"

    print("contest, work = element reads plus node merges:")
    print(f"  {'method':<26} {'one shot, n=4,000':>18} {'one shot, n=300,000':>20} {'2,000 updates':>14}")
    fmt = lambda v: f"{v:,}" if v is not None else "not run"
    print(f"  {'Kadane x running maximum':<26} {fmt(k_small):>18} {fmt(k_big):>20} {fmt(k_dyn):>14}")
    print(f"  {'Divide and conquer':<26} {fmt(d_small):>18} {fmt(d_big):>20} {fmt(None):>14}")
    print(f"  {'Brute force pairs':<26} {fmt(b_small):>18} {fmt(None):>20} {fmt(None):>14}")
    print(f"  {'Segment tree':<26} {fmt(s_small):>18} {fmt(s_big):>20} {fmt(s_dyn):>14}")
    print("OK: four methods agree with the definition, witnesses re-summed, n reads exactly, the tree survives churn")
