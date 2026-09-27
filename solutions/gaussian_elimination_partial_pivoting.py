# Puzzle 133: Gaussian elimination x partial pivoting
# Linear systems: solve A x = b for a dense n x n matrix. Gaussian
# elimination is the algorithm: subtract multiples of each row from the
# rows below it until the matrix is upper triangular, then solve by
# back substitution, about 2n^3/3 floating-point operations. The
# heuristic is partial pivoting: before eliminating column k, swap the
# row with the largest |entry| in that column up to the diagonal.
# Every multiplier is then at most 1 in size, which keeps the
# intermediate numbers from exploding and turns a method that can fail
# on a harmless matrix into one that is backward stable in practice.
#
# Referees:
# (1) EXACT ARITHMETIC: on 30 random integer systems (n = 6), the
#     floating-point solution with partial pivoting must agree with an
#     exact rational solve (Python fractions) to 1e-12 relative;
# (2) THE BACKWARD ERROR: on random 80 x 80 systems, the relative
#     residual |Ax - b| / (|A| |x|) with partial pivoting sits at the
#     precision of the arithmetic; the same elimination with no
#     pivoting is measured on the same systems and on a system whose
#     first pivot is zero, where it cannot proceed at all;
# (3) THE CLASSIC 2 x 2: [[eps, 1], [1, 1]] x = [1, 2] with eps = 1e-17
#     (below the precision of double). Without pivoting the computed x
#     is (0, 1), wrong in its first component by 100%; with pivoting
#     it is (1, 1) to full precision;
# (4) THE GROWTH FACTOR: Wilkinson's matrix of order 24 drives partial
#     pivoting's element growth to exactly 2^23, the theoretical worst
#     case, while complete pivoting (search the whole remaining block)
#     holds it near 1; on random matrices partial pivoting's growth is
#     small, which is why the worst case is a curiosity, not a fear;
# (5) THE COUNT: multiply-adds at n = 40, 80, 160 grow by about 8x per
#     doubling, the 2n^3/3 law, and the pivot searches of partial
#     pivoting cost O(n^2) comparisons against complete pivoting's
#     O(n^3).
import math
import random
from fractions import Fraction

SEED = 20260926


def eliminate(A, b, pivoting='partial', counter=None):
    """Returns x and the growth factor max|U| / max|A|. Raises
    ZeroDivisionError when a pivot is exactly zero."""
    n = len(A)
    M = [list(map(float, row)) + [float(b[i])] for i, row in enumerate(A)]
    col_perm = list(range(n))
    max_a = max(abs(M[i][j]) for i in range(n) for j in range(n))
    growth = max_a
    ops = 0
    searches = 0
    for k in range(n):
        if pivoting == 'partial':
            p = max(range(k, n), key=lambda i: abs(M[i][k]))
            searches += n - k
            M[k], M[p] = M[p], M[k]
        elif pivoting == 'complete':
            p, q = k, k
            best = -1.0
            for i in range(k, n):
                for j in range(k, n):
                    searches += 1
                    if abs(M[i][j]) > best:
                        best = abs(M[i][j])
                        p, q = i, j
            M[k], M[p] = M[p], M[k]
            if q != k:
                for row in M:
                    row[k], row[q] = row[q], row[k]
                col_perm[k], col_perm[q] = col_perm[q], col_perm[k]
        if M[k][k] == 0.0:
            raise ZeroDivisionError(f'zero pivot at step {k}')
        for i in range(k + 1, n):
            f = M[i][k] / M[k][k]
            M[i][k] = 0.0
            for j in range(k + 1, n + 1):
                M[i][j] -= f * M[k][j]
            ops += n - k
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                if abs(M[i][j]) > growth:
                    growth = abs(M[i][j])
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / M[i][i]
    if pivoting == 'complete':
        y = [0.0] * n
        for k in range(n):
            y[col_perm[k]] = x[k]
        x = y
    if counter is not None:
        counter['ops'] = counter.get('ops', 0) + ops
        counter['searches'] = counter.get('searches', 0) + searches
    return x, growth / max_a


def exact_solve(A, b):
    n = len(A)
    M = [[Fraction(v) for v in row] + [Fraction(b[i])] for i, row in enumerate(A)]
    for k in range(n):
        p = next(i for i in range(k, n) if M[i][k] != 0)
        M[k], M[p] = M[p], M[k]
        for i in range(k + 1, n):
            f = M[i][k] / M[k][k]
            for j in range(k, n + 1):
                M[i][j] -= f * M[k][j]
    x = [Fraction(0)] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x


def residual(A, x, b):
    n = len(A)
    r = max(abs(sum(A[i][j] * x[j] for j in range(n)) - b[i]) for i in range(n))
    norm_a = max(sum(abs(v) for v in row) for row in A)
    norm_x = max(abs(v) for v in x)
    return r / (norm_a * norm_x)


def wilkinson(n):
    W = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j or j == n - 1:
                W[i][j] = 1.0
            elif j < i:
                W[i][j] = -1.0
    return W


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: exact arithmetic.
    worst_exact = 0.0
    for _ in range(30):
        n = 6
        A = [[rng.randint(-9, 9) for _ in range(n)] for _ in range(n)]
        b = [rng.randint(-9, 9) for _ in range(n)]
        try:
            xe = exact_solve(A, b)
        except StopIteration:
            continue                                    # singular: skip
        xf, _ = eliminate(A, b, 'partial')
        scale = max(abs(float(v)) for v in xe) or 1.0
        worst_exact = max(worst_exact, max(abs(float(xe[i]) - xf[i]) for i in range(n)) / scale)
    assert worst_exact < 1e-12, worst_exact

    # Oracle 2: backward error on random 80 x 80 systems.
    worst_partial = 0.0
    worst_none = 0.0
    worst_complete = 0.0
    for _ in range(10):
        n = 80
        A = [[rng.gauss(0, 1) for _ in range(n)] for _ in range(n)]
        b = [rng.gauss(0, 1) for _ in range(n)]
        xp, _ = eliminate(A, b, 'partial')
        xn, _ = eliminate(A, b, 'none')
        xc, _ = eliminate(A, b, 'complete')
        worst_partial = max(worst_partial, residual(A, xp, b))
        worst_none = max(worst_none, residual(A, xn, b))
        worst_complete = max(worst_complete, residual(A, xc, b))
    assert worst_partial < 1e-13 and worst_complete < 1e-13, (worst_partial, worst_complete)
    A0 = [[0.0, 1.0], [1.0, 1.0]]
    failed_zero = False
    try:
        eliminate(A0, [1.0, 2.0], 'none')
    except ZeroDivisionError:
        failed_zero = True
    assert failed_zero
    x0, _ = eliminate(A0, [1.0, 2.0], 'partial')
    assert abs(x0[0] - 1.0) < 1e-15 and abs(x0[1] - 1.0) < 1e-15

    # Oracle 3: the classic 2 x 2.
    eps = 1e-17
    A2 = [[eps, 1.0], [1.0, 1.0]]
    b2 = [1.0, 2.0]
    xn2, _ = eliminate(A2, b2, 'none')
    xp2, _ = eliminate(A2, b2, 'partial')
    true2 = [1.0 / (1.0 - eps), (1.0 - 2 * eps) / (1.0 - eps)]
    assert abs(xn2[0] - true2[0]) > 0.99, xn2
    assert abs(xp2[0] - true2[0]) < 1e-15 and abs(xp2[1] - true2[1]) < 1e-15, xp2

    # Oracle 4: growth factors.
    nW = 24
    W = wilkinson(nW)
    bW = [rng.gauss(0, 1) for _ in range(nW)]
    _, growth_partial = eliminate(W, bW, 'partial')
    _, growth_complete = eliminate(W, bW, 'complete')
    assert abs(growth_partial - 2 ** (nW - 1)) < 1e-6, growth_partial
    assert growth_complete <= 2.0 + 1e-9, growth_complete
    growth_random = 0.0
    for _ in range(10):
        n = 80
        A = [[rng.gauss(0, 1) for _ in range(n)] for _ in range(n)]
        _, g = eliminate(A, [1.0] * n, 'partial')
        growth_random = max(growth_random, g)
    assert growth_random < 50, growth_random

    # Oracle 5: the count.
    counts = {}
    for n in (40, 80, 160):
        A = [[rng.gauss(0, 1) for _ in range(n)] for _ in range(n)]
        b = [1.0] * n
        cp = {}
        eliminate(A, b, 'partial', cp)
        cc = {}
        eliminate(A, b, 'complete', cc)
        counts[n] = (cp['ops'], cp['searches'], cc['searches'])
    r1 = counts[80][0] / counts[40][0]
    r2 = counts[160][0] / counts[80][0]
    assert 6.5 < r1 < 8.5 and 7.0 < r2 < 8.5, (r1, r2)
    assert counts[160][2] > 20 * counts[160][1]

    print(f'contest: dense linear systems; referees: exact rational elimination (n = 6), the relative residual, the constructed 2 x 2, and Wilkinson\'s growth matrix')
    print(f"  {'method':<38} {'2x2, eps 1e-17':>16} {'resid. 80x80':>13} {'Wilkinson growth':>17}   verdict")
    print(f"  {'elimination, no pivoting':<38} {f'x = ({xn2[0]:.0f}, {xn2[1]:.0f})':>16} {worst_none:>13.1e} {'-':>17}   wrong on the 2 x 2, dead on a zero pivot")
    print(f"  {'elimination, partial pivoting':<38} {f'x = ({xp2[0]:.0f}, {xp2[1]:.0f})':>16} {worst_partial:>13.1e} {growth_partial:>17,.0f}   every multiplier at most 1; the worst case is 2^(n-1)")
    print(f"  {'elimination, complete pivoting':<38} {'-':>16} {worst_complete:>13.1e} {growth_complete:>17,.0f}   growth tamed, at O(n^3) comparisons")
    print(f'exact arithmetic (30 integer systems, n = 6): worst relative disagreement {worst_exact:.1e}; random 80 x 80 growth under partial pivoting at most {growth_random:.1f}')
    print(f'count: multiply-adds {counts[40][0]:,} / {counts[80][0]:,} / {counts[160][0]:,} at n = 40 / 80 / 160 (x{r1:.1f}, x{r2:.1f}); pivot searches at n = 160: partial {counts[160][1]:,}, complete {counts[160][2]:,}')
    print(f'OK: partial pivoting matched exact arithmetic to {worst_exact:.0e}, held the residual at {worst_partial:.0e}, solved the 2 x 2 exactly where no pivoting returned ({xn2[0]:.0f}, {xn2[1]:.0f}), '
          f'hit Wilkinson growth {growth_partial:,.0f} = 2^{nW - 1} where complete pivoting held {growth_complete:.0f}, and the count grew x{r1:.1f} and x{r2:.1f} per doubling')
