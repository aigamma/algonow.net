# Puzzle 28: Simplex method x Dantzig pivot rule
# Maximize a linear objective over linear inequalities, exactly, with a
# certificate, and survive the two classic traps: cycling and the cube.
#
# The pairing is the point. The simplex control structure walks vertices of
# the feasible polytope, moving along an edge that improves the objective
# until none does; optimality then falls out as a dual certificate read off
# the final tableau. The heuristic is WHICH improving edge: Dantzig's rule
# takes the steepest immediate rate (most positive reduced cost). On real
# instances that greed is superb (a few dozen pivots, measured); on the
# Klee-Minty cube it is walked through every one of the 2^n vertices
# (measured: 4,095 pivots at n=12); and on Beale's degenerate corner, with
# a plain tie-break, it cycles forever in exact arithmetic, while Bland's
# humble smallest-index rule provably terminates on the same instance.
import random
from fractions import Fraction


def simplex(A, b, c, rule="dantzig", rng=None, exact=False, cap=100000):
    """Tableau simplex for max c^T x, Ax <= b, x >= 0 with b >= 0 (the
    origin is feasible). Returns (status, objective, x, pivots, tableau,
    basis, cycled). Work in exact Fractions when exact=True."""
    m, n = len(A), len(c)
    num = Fraction if exact else float
    T = [[num(A[i][j]) for j in range(n)] + [num(1) if k == i else num(0) for k in range(m)] + [num(b[i])] for i in range(m)]
    z = [num(-cj) for cj in c] + [num(0)] * m + [num(0)]  # reduced costs (negated c)
    basis = list(range(n, n + m))
    seen = {tuple(sorted(basis))}
    pivots = 0
    while pivots < cap:
        improving = [j for j in range(n + m) if z[j] < 0]
        if not improving:
            x = [num(0)] * (n + m)
            for i, bv in enumerate(basis):
                x[bv] = T[i][-1]
            obj = sum(num(c[j]) * x[j] for j in range(n))
            return "optimal", obj, x[:n], pivots, (T, z), basis, False
        if rule == "dantzig":
            enter = min(improving, key=lambda j: (z[j], j))  # most negative
        elif rule == "bland":
            enter = min(improving)
        else:
            enter = rng.choice(improving)
        # Ratio test, ties to the lowest row index (the classic tie-break).
        best_i, best_ratio = -1, None
        for i in range(m):
            if T[i][enter] > 0:
                ratio = T[i][-1] / T[i][enter]
                if best_ratio is None or ratio < best_ratio:
                    best_ratio, best_i = ratio, i
        if best_i < 0:
            return "unbounded", None, None, pivots, (T, z), basis, False
        # Pivot.
        piv = T[best_i][enter]
        T[best_i] = [v / piv for v in T[best_i]]
        for i in range(m):
            if i != best_i and T[i][enter] != 0:
                f = T[i][enter]
                T[i] = [a - f * bv for a, bv in zip(T[i], T[best_i])]
        if z[enter] != 0:
            f = z[enter]
            z = [a - f * bv for a, bv in zip(z, T[best_i])]
        basis[best_i] = enter
        pivots += 1
        key = tuple(sorted(basis))
        if key in seen:
            return "cycled", None, None, pivots, (T, z), basis, True
        seen.add(key)
    return "capped", None, None, pivots, (T, z), basis, False


def objective_of(T, z, basis, c, n):
    m = len(T)
    x = [0.0] * (n + m)
    for i, bv in enumerate(basis):
        x[bv] = float(T[i][-1])
    return sum(float(c[j]) * x[j] for j in range(n)), x


def enumerate_optimum(A, b, c):
    """Every basis of the slack-extended system, solved exactly: the
    definition of 'best vertex', executable. C(n+m, m) systems: the oracle
    at toy size, the never-here at contest size."""
    from itertools import combinations
    m, n = len(A), len(c)
    cols = [[Fraction(A[i][j]) for i in range(m)] for j in range(n)]
    cols += [[Fraction(1) if i == k else Fraction(0) for i in range(m)] for k in range(m)]
    best = None
    count = 0
    for basis in combinations(range(n + m), m):
        count += 1
        M = [[cols[j][i] for j in basis] + [Fraction(b[i])] for i in range(m)]
        # Gaussian elimination with pivoting, exact.
        ok = True
        for col in range(m):
            piv = next((r for r in range(col, m) if M[r][col] != 0), None)
            if piv is None:
                ok = False
                break
            M[col], M[piv] = M[piv], M[col]
            for r in range(m):
                if r != col:
                    f = M[r][col] / M[col][col]
                    M[r] = [a - f * bb for a, bb in zip(M[r], M[col])]
        if not ok:
            continue
        vals = [M[i][m] / M[i][i] for i in range(m)]
        if any(v < 0 for v in vals):
            continue
        x = [Fraction(0)] * (n + m)
        for j, v in zip(basis, vals):
            x[j] = v
        obj = sum(Fraction(c[j]) * x[j] for j in range(n))
        if best is None or obj > best:
            best = obj
    return best, count


def klee_minty(n):
    """max sum 2^(n-j) x_j subject to the squashed cube: Dantzig's greed
    visits every vertex."""
    A = []
    b = []
    for i in range(1, n + 1):
        row = [0.0] * n
        for j in range(1, i):
            row[j - 1] = 2.0 ** (i - j + 1)
        row[i - 1] = 1.0
        A.append(row)
        b.append(5.0 ** i)
    c = [2.0 ** (n - j) for j in range(1, n + 1)]
    return A, b, c


BEALE_A = [
    [Fraction(1, 4), Fraction(-60), Fraction(-1, 25), Fraction(9)],
    [Fraction(1, 2), Fraction(-90), Fraction(-1, 50), Fraction(3)],
    [Fraction(0), Fraction(0), Fraction(1), Fraction(0)],
]
BEALE_B = [Fraction(0), Fraction(0), Fraction(1)]
BEALE_C = [Fraction(3, 4), Fraction(-150), Fraction(1, 50), Fraction(-6)]


def random_lp(m, n, rng):
    A = [[rng.uniform(0.1, 2.0) for _ in range(n)] for _ in range(m)]
    b = [rng.uniform(5.0, 20.0) for _ in range(m)]
    c = [rng.uniform(-1.0, 2.0) for _ in range(n)]
    return A, b, c


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the executable definition. On 25 tiny LPs (m=4, n=8), all
    # three pivot rules must land on the optimum found by enumerating all
    # C(12,4)=495 bases in exact arithmetic.
    for trial in range(25):
        A, b, c = random_lp(4, 8, rng)
        A = [[Fraction(a).limit_denominator(1000) for a in row] for row in A]
        b = [Fraction(x).limit_denominator(1000) for x in b]
        c = [Fraction(x).limit_denominator(1000) for x in c]
        best, n_bases = enumerate_optimum(A, b, c)
        for rule in ("dantzig", "bland", "random"):
            status, obj, x, piv, _, _, _ = simplex(A, b, c, rule=rule, rng=random.Random(trial), exact=True)
            assert status == "optimal", (trial, rule, status)
            assert obj == best, (trial, rule, obj, best)

    # Oracle 2: the certificate at scale. On larger random LPs, read the
    # dual off the final tableau and verify: dual feasible, and the gap is
    # zero. Also feasibility of the primal answer, constraint by constraint.
    for trial in range(5):
        A, b, c = random_lp(30, 60, rng)
        status, obj, x, piv, (T, z), basis, _ = simplex(A, b, c, rule="dantzig")
        assert status == "optimal"
        n = len(c)
        m = len(b)
        for i in range(m):
            lhs = sum(A[i][j] * x[j] for j in range(n))
            assert lhs <= b[i] + 1e-7
        assert all(xi >= -1e-9 for xi in x)
        y = [float(z[n + i]) for i in range(m)]  # duals: slack reduced costs
        assert all(yi >= -1e-7 for yi in y), "dual must be feasible (y >= 0)"
        for j in range(n):
            assert sum(y[i] * A[i][j] for i in range(m)) >= c[j] - 1e-6, "dual constraint"
        gap = abs(sum(y[i] * b[i] for i in range(m)) - obj)
        assert gap <= 1e-6 * max(1.0, abs(obj)), f"duality gap {gap}"

    # Oracle 3: Beale's corner, in exact arithmetic. Dantzig with the plain
    # lowest-row tie-break revisits a basis (cycles); Bland's smallest
    # index rule terminates at the true optimum on the same instance.
    status_d, *_rest = simplex(BEALE_A, BEALE_B, BEALE_C, rule="dantzig", exact=True, cap=50)
    cycled = _rest[-1]
    assert status_d == "cycled" and cycled, status_d
    status_b, obj_b, xb, piv_b, _, _, _ = simplex(BEALE_A, BEALE_B, BEALE_C, rule="bland", exact=True, cap=200)
    assert status_b == "optimal", status_b
    best_beale, _ = enumerate_optimum(BEALE_A, BEALE_B, BEALE_C)
    assert obj_b == best_beale == Fraction(1, 20), (obj_b, best_beale)

    # Oracle 4: the cube. Dantzig's pivots on Klee-Minty grow as ~2^n.
    km_counts = {}
    for n in (6, 8, 10, 12):
        A, b, c = klee_minty(n)
        status, obj, x, piv, _, _, _ = simplex(A, b, c, rule="dantzig", cap=100000)
        assert status == "optimal"
        assert abs(obj - 5.0 ** n) < 1e-3 * 5.0 ** n, (n, obj)  # optimum is x_n = 5^n
        km_counts[n] = piv
        assert piv >= 2 ** (n - 1), (n, piv)
    A, b, c = klee_minty(12)
    _, _, _, piv_bland, _, _, _ = simplex(A, b, c, rule="bland", cap=100000)
    _, _, _, piv_rand, _, _, _ = simplex(A, b, c, rule="random", rng=random.Random(7), cap=100000)

    # Oracle 5: the contest on realistic ground: median pivots over 30
    # random LPs (m=30, n=60) per rule.
    med = lambda xs: sorted(xs)[len(xs) // 2]
    pivots = {"dantzig": [], "bland": [], "random": []}
    for trial in range(30):
        A, b, c = random_lp(30, 60, random.Random(5000 + trial))
        for rule in pivots:
            status, obj, x, piv, _, _, _ = simplex(A, b, c, rule=rule, rng=random.Random(trial))
            assert status == "optimal"
            pivots[rule].append(piv)
    assert med(pivots["dantzig"]) <= med(pivots["bland"]), "greed should beat humility on random ground"

    print("contest: pivots to the proven optimum;")
    print(f"  {'pivot rule':<22} {'random LPs (median of 30)':>26} {'Klee-Minty cube n=12':>21}")
    print(f"  {'Dantzig (steepest)':<22} {med(pivots['dantzig']):>26} {km_counts[12]:>21,}")
    print(f"  {'Bland (smallest index)':<22} {med(pivots['bland']):>26} {piv_bland:>21,}")
    print(f"  {'Random improving edge':<22} {med(pivots['random']):>26} {piv_rand:>21,}")
    print(f"Klee-Minty growth under Dantzig: " + ", ".join(f"n={n}: {p:,}" for n, p in km_counts.items()))
    print(f"Beale's corner (exact Fractions): Dantzig cycles; Bland terminates at 1/20 in {piv_b} pivots")
    print("OK: three rules match exhaustive enumeration, duals certify optimality with zero gap, the cube and the cycle are both pinned")
