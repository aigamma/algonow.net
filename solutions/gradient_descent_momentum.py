# Puzzle 20: Gradient descent x Polyak momentum
# Minimize a smooth convex bowl whose valley is a hundred times longer than
# it is wide, paying per gradient evaluation.
#
# The pairing is the point. Gradient descent is the discipline: step against
# the gradient, at a step size the curvature licenses, and convergence is a
# theorem with a rate: (kappa-1)/(kappa+1) per step, so an ill-conditioned
# bowl (kappa = L/mu large) costs O(kappa) iterations of zigzag. Polyak's
# heavy-ball heuristic adds one term: reuse a fraction beta of the previous
# step. Velocity accumulates along the valley floor (where gradients agree
# step after step) and cancels across the walls (where they alternate), and
# the rate improves to (sqrt(kappa)-1)/(sqrt(kappa)+1): the square root of
# the condition number, not the condition number. This file measures both
# rates against their theorems, then against every rival with a different
# contract.
import math
import random

D = 60
KAPPA = 100.0
MU, L = 1.0, KAPPA


def build_problem(seed=20260827):
    """A = Q^T diag(lambda) Q with log-spaced eigenvalues in [1, 100] and a
    random rotation, so no method can cheat along the axes."""
    rng = random.Random(seed)
    lam = [MU * (KAPPA / MU) ** (i / (D - 1)) for i in range(D)]
    m = [[rng.gauss(0, 1) for _ in range(D)] for _ in range(D)]
    q = []
    for i in range(D):  # Gram-Schmidt
        v = m[i][:]
        for u in q:
            dot = sum(a * b for a, b in zip(v, u))
            v = [a - dot * b for a, b in zip(v, u)]
        norm = math.sqrt(sum(a * a for a in v))
        q.append([a / norm for a in v])
    a = [[sum(q[k][i] * lam[k] * q[k][j] for k in range(D)) for j in range(D)] for i in range(D)]
    b = [rng.gauss(0, 1) for _ in range(D)]
    return a, b


def matvec(a, x, counter=None):
    if counter is not None:
        counter["matvecs"] = counter.get("matvecs", 0) + 1
    return [sum(ai * xi for ai, xi in zip(row, x)) for row in a]


def grad(a, b, x, counter=None):
    ax = matvec(a, x, counter)
    return [g - bi for g, bi in zip(ax, b)]


def f_of(a, b, x):
    ax = matvec(a, x)
    return 0.5 * sum(xi * ai for xi, ai in zip(x, ax)) - sum(bi * xi for bi, xi in zip(b, x))


def gnorm(g):
    return math.sqrt(sum(v * v for v in g))


def solve_exact(a, b):
    """Gaussian elimination with partial pivoting: the independent oracle,
    and Newton's inner engine."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[piv] = m[piv], m[col]
        for r in range(n):
            if r != col:
                fpiv = m[r][col] / m[col][col]
                m[r] = [x - fpiv * y for x, y in zip(m[r], m[col])]
    return [m[i][n] / m[i][i] for i in range(n)]


TOL = 1e-8


def run_gd(a, b, eta, max_iter=20000):
    c = {}
    x = [0.0] * D
    bn = gnorm(b)
    fs = []
    for it in range(1, max_iter + 1):
        g = grad(a, b, x, c)
        fs.append(f_of(a, b, x))
        if gnorm(g) <= TOL * bn:
            return x, it - 1, c["matvecs"], fs
        x = [xi - eta * gi for xi, gi in zip(x, g)]
    return x, max_iter, c["matvecs"], fs


def run_momentum(a, b, eta, beta, max_iter=20000):
    c = {}
    x = [0.0] * D
    prev = x[:]
    bn = gnorm(b)
    fs = []
    for it in range(1, max_iter + 1):
        g = grad(a, b, x, c)
        fs.append(f_of(a, b, x))
        if gnorm(g) <= TOL * bn:
            return x, it - 1, c["matvecs"], fs
        nxt = [xi - eta * gi + beta * (xi - pi) for xi, gi, pi in zip(x, g, prev)]
        prev, x = x, nxt
    return x, max_iter, c["matvecs"], fs


def run_nesterov(a, b, max_iter=20000):
    c = {}
    x = [0.0] * D
    y = x[:]
    beta = (math.sqrt(KAPPA) - 1) / (math.sqrt(KAPPA) + 1)
    bn = gnorm(b)
    for it in range(1, max_iter + 1):
        g = grad(a, b, y, c)
        if gnorm(grad(a, b, x, c)) <= TOL * bn:
            return x, it - 1, c["matvecs"]
        nxt = [yi - gi / L for yi, gi in zip(y, g)]
        y = [ni + beta * (ni - xi) for ni, xi in zip(nxt, x)]
        x = nxt
    return x, max_iter, c["matvecs"]


def run_cg(a, b, max_iter=20000):
    c = {}
    x = [0.0] * D
    r = [bi for bi in b]
    p = r[:]
    rs = sum(v * v for v in r)
    bn = gnorm(b)
    for it in range(1, max_iter + 1):
        if math.sqrt(rs) <= TOL * bn:
            return x, it - 1, c["matvecs"]
        ap = matvec(a, p, c)
        alpha = rs / sum(pi * api for pi, api in zip(p, ap))
        x = [xi + alpha * pi for xi, pi in zip(x, p)]
        r = [ri - alpha * api for ri, api in zip(r, ap)]
        rs_new = sum(v * v for v in r)
        p = [ri + (rs_new / rs) * pi for ri, pi in zip(r, p)]
        rs = rs_new
    return x, max_iter, c["matvecs"]


def run_newton(a, b):
    # For a quadratic, one Hessian solve lands exactly on the minimizer.
    x0 = [0.0] * D
    g = grad(a, b, x0)
    step = solve_exact(a, [-gi for gi in g])
    x = [xi + si for xi, si in zip(x0, step)]
    solve_matvec_equiv = D / 6  # d^3/3 flops over a 2d^2-flop gradient
    return x, 1, 1 + solve_matvec_equiv


if __name__ == "__main__":
    a, b = build_problem()
    x_star = solve_exact(a, b)
    xn = math.sqrt(sum(v * v for v in x_star))

    def rel_err(x):
        return math.sqrt(sum((p - q) ** 2 for p, q in zip(x, x_star))) / xn

    eta_gd = 2.0 / (L + MU)
    eta_hb = 4.0 / (math.sqrt(L) + math.sqrt(MU)) ** 2
    beta_hb = ((math.sqrt(KAPPA) - 1) / (math.sqrt(KAPPA) + 1)) ** 2

    x_gd, it_gd, mv_gd, fs_gd = run_gd(a, b, eta_gd)
    x_hb, it_hb, mv_hb, fs_hb = run_momentum(a, b, eta_hb, beta_hb)
    x_ns, it_ns, mv_ns = run_nesterov(a, b)
    x_cg, it_cg, mv_cg = run_cg(a, b)
    x_nt, it_nt, mv_nt = run_newton(a, b)

    # Oracle 1: every method lands on the Gaussian-elimination answer.
    for name, x in (("gd", x_gd), ("heavy ball", x_hb), ("nesterov", x_ns), ("cg", x_cg), ("newton", x_nt)):
        assert rel_err(x) < 1e-5, (name, rel_err(x))

    # Oracle 2: the rate THEOREMS, checked numerically. Predicted iteration
    # counts from the contraction factors must bracket the measured ones.
    pred_gd = math.log(TOL) / math.log((KAPPA - 1) / (KAPPA + 1))
    pred_hb = math.log(TOL) / math.log((math.sqrt(KAPPA) - 1) / (math.sqrt(KAPPA) + 1))
    assert 0.4 * pred_gd < it_gd < 2.5 * pred_gd, (it_gd, pred_gd)
    assert 0.4 * pred_hb < it_hb < 3.0 * pred_hb, (it_hb, pred_hb)

    # Oracle 3: the square-root speedup is real: at kappa=100 momentum must
    # beat plain descent at least five-fold (theory says ~10x).
    assert it_hb * 5 < it_gd, (it_hb, it_gd)

    # Oracle 4: conjugate gradient's finite-termination property: on a
    # small system it reaches machine tolerance within d iterations.
    small_d = 8
    saved = D
    D = small_d
    sa, sb = build_problem(seed=7)
    _, it_small, _ = run_cg(sa, sb)
    assert it_small <= small_d + 2, it_small
    D = saved

    # Oracle 5: Newton on a quadratic is exactly one step.
    assert it_nt == 1 and rel_err(x_nt) < 1e-9

    # Oracle 6: the step-size cliff. eta just past 2/L diverges: the top
    # eigenmode grows by |1 - eta*L| = 1.05 per step, and 300 steps let it
    # dominate every shrinking mode.
    x_bad, _, _, fs_bad = run_gd(a, b, 2.05 / L, max_iter=300)
    assert rel_err(x_bad) > rel_err([0.0] * D), "past 2/L the descent must blow up"

    # Oracle 7: honesty about the ball. Plain descent is monotone in f
    # (each step provably decreases it). The heavy ball carries NO such
    # guarantee: at the optimal tuning it happened to descend monotonically
    # here, but push beta into the underdamped regime and it visibly climbs
    # mid-flight while still converging. Momentum is not a descent method.
    assert all(y <= x + 1e-12 for x, y in zip(fs_gd, fs_gd[1:])), "GD must descend monotonically"
    _, _, _, fs_wild = run_momentum(a, b, eta_hb, 0.95, max_iter=400)
    assert any(y > x + 1e-9 for x, y in zip(fs_wild, fs_wild[1:])), "an underdamped ball should climb somewhere"
    assert fs_wild[-1] < fs_wild[0], "and still make net progress"

    print(f"contest: d = {D}, kappa = {KAPPA:.0f}, stop at gradient 1e-8; work in gradient-equivalents:")
    rows = [
        ("Gradient descent", it_gd, mv_gd, f"rate (k-1)/(k+1): predicted ~{pred_gd:.0f}"),
        ("GD x Polyak momentum", it_hb, mv_hb, f"rate (rk-1)/(rk+1): predicted ~{pred_hb:.0f}"),
        ("Nesterov acceleration", it_ns, mv_ns, "the provably optimal first-order rate"),
        ("Conjugate gradient", it_cg, mv_cg, "no dials; finite termination in exact arithmetic"),
        ("Newton (direct solve)", it_nt, round(mv_nt), "one shot; the solve costs d/6 gradients here"),
    ]
    for name, it, mv, note in rows:
        print(f"  {name:<22} iterations {it:>6}   work {mv:>7,.0f}   {note}")
    print("OK: all five agree with elimination, both rate theorems hold, the cliff at 2/L and the ball's overshoot are pinned")
