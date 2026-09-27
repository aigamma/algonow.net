# Puzzle 144: Parallel prefix sum x Blelloch scan
# Data-parallel primitive: given a sequence and an associative
# operation, produce every running total, all n of them, on a machine
# with as many processors as elements. Sequentially it is one pass and
# n operations, but the pass is a chain: total i waits for total i - 1.
# The parallel prefix sum breaks the chain with a tree. The heuristic
# is Blelloch's two-sweep scan: an up-sweep that reduces pairs into a
# balanced tree of partial totals (n - 1 operations, log n levels),
# then a down-sweep that walks the tree back down handing each node
# the total of everything to its left (n - 1 more operations, log n
# levels). Two n of work and two log n of depth, against the Hillis-
# Steele scan's n log n work, and the naive n squared.
#
# Every scan is run on a simulated PRAM: each level's operations are
# recorded, work is the count of operations and depth the count of
# levels, and the levels are applied in lockstep so that nothing
# depends on execution order within a level.
#
# Referees:
# (1) CORRECTNESS against the sequential prefix sum on random arrays
#     for three associative operations: integer addition, maximum, and
#     2 x 2 matrix multiplication, which is associative but NOT
#     commutative, so a scan that silently swapped operands would fail;
# (2) THE WORK LAW, counted: Blelloch's work is 2(n - 1) at every n,
#     Hillis-Steele's is n log2 n - n + 1, sequential is n - 1, naive
#     independent prefixes n(n - 1) / 2, measured at n = 2^8 ... 2^14;
# (3) THE DEPTH LAW, counted: Blelloch 2 log2 n levels, Hillis-Steele
#     log2 n, sequential n;
# (4) THE COMPOSITION: an exclusive scan turned inclusive by one
#     parallel shift-and-add, exact;
# (5) THE APPLICATIONS: stream compaction (keep the elements that pass
#     a predicate, in order) and one digit of a radix sort, both built
#     from the scan, checked against Python's own filter and sort.
import random

SEED = 20260926


class PRAM:
    """Records operations per level; applies each level in lockstep."""

    def __init__(self):
        self.work = 0
        self.depth = 0

    def level(self, ops, work=None):
        """ops: list of (target index, value) pairs computed from a
        snapshot, then written together. work: the number of applications
        of the operation in this level (a bare copy is a move, not work);
        defaults to one per write."""
        if not ops:
            return
        self.depth += 1
        self.work += len(ops) if work is None else work
        return ops


def blelloch_exclusive(a, op, identity, pram):
    n = len(a)
    assert n & (n - 1) == 0
    x = list(a)
    d = 1
    while d < n:                                  # up-sweep
        snap = list(x)
        ops = [(i + 2 * d - 1, op(snap[i + d - 1], snap[i + 2 * d - 1])) for i in range(0, n, 2 * d)]
        pram.level(ops)
        for i, v in ops:
            x[i] = v
        d *= 2
    x[n - 1] = identity
    d = n // 2
    while d >= 1:                                 # down-sweep
        snap = list(x)
        ops = []
        for i in range(0, n, 2 * d):
            left = snap[i + d - 1]
            ops.append((i + d - 1, snap[i + 2 * d - 1]))                    # a copy
            ops.append((i + 2 * d - 1, op(snap[i + 2 * d - 1], left)))     # the operation
        pram.level(ops, work=n // (2 * d))
        for i, v in ops:
            x[i] = v
        d //= 2
    return x


def hillis_steele_inclusive(a, op, pram):
    n = len(a)
    x = list(a)
    d = 1
    while d < n:
        snap = list(x)
        ops = [(i, op(snap[i - d], snap[i])) for i in range(d, n)]
        pram.level(ops)
        for i, v in ops:
            x[i] = v
        d *= 2
    return x


def sequential_inclusive(a, op, pram):
    x = list(a)
    for i in range(1, len(a)):
        pram.level([(i, None)])
        x[i] = op(x[i - 1], x[i])
    return x


def naive_parallel_inclusive(a, op, pram):
    """Every prefix computed independently by its own chain: one level
    per position in the longest chain, n(n-1)/2 operations."""
    n = len(a)
    x = list(a)
    for k in range(1, n):
        ops = [(i, None) for i in range(k, n)]
        pram.level(ops)
    # the counting above is the point; the values are computed plainly
    out = []
    acc = None
    for v in a:
        acc = v if acc is None else op(acc, v)
        out.append(acc)
    return out


def shift_add(a, exclusive, op, pram):
    """Inclusive from exclusive in one parallel level."""
    ops = [(i, op(exclusive[i], a[i])) for i in range(len(a))]
    pram.level(ops)
    return [v for _, v in ops]


def matmul(A, B):
    return ((A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3]),
            (A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]))


def mat(A, B):
    r = matmul(A, B)
    return (r[0][0], r[0][1], r[1][0], r[1][1])


def compact(a, keep, pram):
    flags = [1 if keep(v) else 0 for v in a]
    pos = blelloch_exclusive(flags, lambda x, y: x + y, 0, pram)
    total = pos[-1] + flags[-1]
    out = [None] * total
    ops = [(pos[i], a[i]) for i in range(len(a)) if flags[i]]
    pram.level(ops)
    for i, v in ops:
        out[i] = v
    return out


def radix_digit_pass(a, bit, pram):
    """Stable partition by one bit: zeros first, then ones, via two scans."""
    ones = [(v >> bit) & 1 for v in a]
    zeros = [1 - b for b in ones]
    pz = blelloch_exclusive(zeros, lambda x, y: x + y, 0, pram)
    po = blelloch_exclusive(ones, lambda x, y: x + y, 0, pram)
    nz = pz[-1] + zeros[-1]
    out = [None] * len(a)
    ops = [(pz[i] if zeros[i] else nz + po[i], a[i]) for i in range(len(a))]
    pram.level(ops)
    for i, v in ops:
        out[i] = v
    return out


if __name__ == '__main__':
    rng = random.Random(SEED)
    add = lambda x, y: x + y
    mx = max

    # Oracle 1: three operations, against the sequential scan.
    n = 256
    ints = [rng.randint(-50, 50) for _ in range(n)]
    mats = [(rng.randint(-2, 2), rng.randint(-2, 2), rng.randint(-2, 2), rng.randint(-2, 2)) for _ in range(n)]
    for a, op, ident in ((ints, add, 0), (ints, mx, float('-inf')), (mats, mat, (1, 0, 0, 1))):
        seq = sequential_inclusive(a, op, PRAM())
        hs = hillis_steele_inclusive(a, op, PRAM())
        ex = blelloch_exclusive(a, op, ident, PRAM())
        bl = shift_add(a, ex, op, PRAM())
        assert seq == hs == bl, (op, seq[:5], hs[:5], bl[:5])
        # the exclusive scan is the inclusive one shifted right by the identity
        assert ex == [ident] + seq[:-1]
    # a scan that swapped operands would fail on matrices: check the swap is detectable
    swapped = blelloch_exclusive(mats, lambda x, y: mat(y, x), (1, 0, 0, 1), PRAM())
    assert swapped != [(1, 0, 0, 1)] + sequential_inclusive(mats, mat, PRAM())[:-1]

    # Oracle 2 + 3: work and depth.
    table = []
    for k in (8, 10, 12, 14):
        m = 1 << k
        a = [rng.randint(0, 9) for _ in range(m)]
        p_bl = PRAM()
        blelloch_exclusive(a, add, 0, p_bl)
        p_hs = PRAM()
        hillis_steele_inclusive(a, add, p_hs)
        p_seq = PRAM()
        sequential_inclusive(a, add, p_seq)
        if k <= 10:
            p_nv = PRAM()
            naive_parallel_inclusive(a, add, p_nv)
            naive = (p_nv.work, p_nv.depth)
            assert p_nv.work == m * (m - 1) // 2 and p_nv.depth == m - 1
        else:
            naive = None
        assert p_bl.work == 2 * (m - 1) and p_bl.depth == 2 * k, (p_bl.work, p_bl.depth)
        assert p_hs.work == m * k - m + 1 and p_hs.depth == k, (p_hs.work, p_hs.depth)
        assert p_seq.work == m - 1 and p_seq.depth == m - 1
        table.append((m, k, p_bl.work, p_bl.depth, p_hs.work, p_hs.depth, p_seq.work, p_seq.depth, naive))

    # Oracle 5: the applications.
    m = 1024
    data = [rng.randint(0, 999) for _ in range(m)]
    p_c = PRAM()
    kept = compact(data, lambda v: v % 3 == 0, p_c)
    assert kept == [v for v in data if v % 3 == 0]
    p_r = PRAM()
    arr = list(data)
    for bit in range(10):
        arr = radix_digit_pass(arr, bit, p_r)
    assert arr == sorted(data)

    print('contest: prefix sums of n elements on a simulated PRAM; referees: the sequential scan for three associative operations (one of them non-commutative), and the closed-form work and depth of each scan')
    print(f"  {'n':>6} {'Blelloch work/depth':>20} {'Hillis-Steele':>16} {'sequential':>14} {'naive parallel':>16}")
    for m, k, bw, bd, hw, hd, sw, sd, nv in table:
        print(f'  {m:>6} {f"{bw:,} / {bd}":>20} {f"{hw:,} / {hd}":>16} {f"{sw:,} / {sd}":>14} {(f"{nv[0]:,} / {nv[1]}" if nv else "not run"):>16}')
    print(f'correctness: sequential, Hillis-Steele, and Blelloch agree on {n} integers under addition and maximum and on {n} two-by-two matrices under multiplication; a scan that swaps operands gives a different (wrong) matrix answer, so the order is checked, not assumed')
    print(f'applications on {len(data)} elements: stream compaction kept {len(kept)} multiples of three in order ({p_c.work:,} work, {p_c.depth} depth); ten radix digit passes sorted the array ({p_r.work:,} work, {p_r.depth} depth)')
    print(f'OK: Blelloch scan exact on three operations including a non-commutative one, work 2(n - 1) and depth 2 log2 n at every n from 256 to 16,384, against Hillis-Steele n log2 n - n + 1, sequential depth n, and naive n(n - 1)/2; compaction and radix sort built from it match filter and sort')
