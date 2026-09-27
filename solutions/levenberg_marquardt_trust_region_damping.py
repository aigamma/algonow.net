# Puzzle 160: Levenberg-Marquardt x trust-region damping
# Nonlinear least squares: fit a model with a few parameters to noisy
# data by minimizing the sum of squared residuals, when the model is
# nonlinear in its parameters so no closed form exists. The model here
# is a sum of two exponentials, y = a exp(-b t) + c exp(-d t), the
# classic ill-conditioned fit, with the true parameters known so that
# the noise floor of the residual is known too. Levenberg-Marquardt is
# the algorithm: at each iterate, linearize the residuals with the
# Jacobian J and solve the damped normal equations (J^T J + lambda
# D) step = -J^T r. The heuristic is the damping: lambda large makes
# the step a short move down the gradient, lambda near zero makes it
# the full Gauss-Newton step, and lambda is raised after a rejected
# step and lowered after an accepted one, so the method behaves like a
# trust region that grows when the linear model is trustworthy.
#
# Referees:
# (1) THE FLOOR: the residual norm at the true parameters is the noise
#     floor; from 100 random starts in a box far from the truth, the
#     fraction of runs that reach within 1% of the floor (a success)
#     is measured for Levenberg-Marquardt, undamped Gauss-Newton, and
#     gradient descent with backtracking, along with the iterations
#     each needs;
# (2) THE DAMPING TRACE on one run: lambda starts large, falls by
#     orders of magnitude as steps are accepted, and rises when the
#     linear model fails; the accepted step's actual-over-predicted
#     reduction ratio is measured at each iteration;
# (3) THE RATE: near the solution the error shrinks superlinearly for
#     Levenberg-Marquardt (each error a small fraction of the last)
#     against gradient descent's linear crawl, measured as ratios of
#     successive parameter errors;
# (4) THE CONDITIONING: the condition number of J^T J at a bad start
#     and of J^T J + lambda D, showing the damping cap it;
# (5) THE NEGATIVE EXAMPLE, measured: undamped Gauss-Newton from the
#     same starts, whose full steps overshoot and diverge on a
#     measured fraction of runs.
import math
import random

SEED = 20260926
TRUE = [3.0, 1.0, 2.0, 5.0]        # a, b, c, d
NOISE = 0.02


def safe_exp(x):
    """exp that saturates instead of raising: a trial step that sends a rate
    negative gives an astronomically bad residual, which the damping then
    rejects, rather than an exception."""
    return math.exp(min(x, 700.0))


def model(p, t):
    a, b, c, d = p
    return a * safe_exp(-b * t) + c * safe_exp(-d * t)


def jacobian_row(p, t):
    a, b, c, d = p
    e1, e2 = safe_exp(-b * t), safe_exp(-d * t)
    return [e1, -a * t * e1, e2, -c * t * e2]


def residuals(p, data):
    return [model(p, t) - y for t, y in data]


def sumsq(r):
    return sum(x * x for x in r)


def solve(A, b):
    """Gaussian elimination with partial pivoting; A is n x n."""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda i: abs(M[i][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-300:
            raise ZeroDivisionError
        for i in range(c + 1, n):
            f = M[i][c] / M[c][c]
            for j in range(c, n + 1):
                M[i][j] -= f * M[c][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x


def normal_matrix(p, data):
    n = len(p)
    JtJ = [[0.0] * n for _ in range(n)]
    Jtr = [0.0] * n
    for (t, y) in data:
        row = jacobian_row(p, t)
        r = model(p, t) - y
        for i in range(n):
            Jtr[i] += row[i] * r
            for j in range(n):
                JtJ[i][j] += row[i] * row[j]
    return JtJ, Jtr


def cond_number(A):
    """Condition number by power iteration on A (symmetric positive) and on
    its inverse via repeated solves."""
    n = len(A)
    v = [1.0] * n
    for _ in range(200):
        w = [sum(A[i][j] * v[j] for j in range(n)) for i in range(n)]
        norm = math.sqrt(sum(x * x for x in w))
        v = [x / norm for x in w]
    lam_max = norm
    v = [1.0] * n
    for _ in range(200):
        w = solve(A, v)
        norm = math.sqrt(sum(x * x for x in w))
        v = [x / norm for x in w]
    lam_min = 1.0 / norm
    return lam_max / lam_min


def levenberg_marquardt(p0, data, max_iter=200, rel_tol=1e-10):
    """Returns (p, cost, trace, iterations, smallest lambda used on an accepted
    step). Stops when an accepted step no longer reduces the cost by a
    relative rel_tol, or when the damping has grown past 1e8 without an
    acceptable step (the linear model cannot improve on the iterate)."""
    p = list(p0)
    lam = 1e-2
    cost = sumsq(residuals(p, data))
    trace = []
    lam_min = lam
    for it in range(max_iter):
        JtJ, Jtr = normal_matrix(p, data)
        while True:
            A = [[JtJ[i][j] + (lam * JtJ[i][i] if i == j else 0.0) for j in range(len(p))] for i in range(len(p))]
            try:
                step = solve(A, [-g for g in Jtr])
            except ZeroDivisionError:
                lam *= 10
                if lam > 1e8:
                    return p, cost, trace, it, lam_min
                continue
            q = [x + s for x, s in zip(p, step)]
            new_cost = sumsq(residuals(q, data))
            # predicted reduction from the linear model: -2 step.Jtr - step.JtJ.step
            pred = -2 * sum(s * g for s, g in zip(step, Jtr)) - sum(step[i] * sum(JtJ[i][j] * step[j] for j in range(len(p))) for i in range(len(p)))
            rho = (cost - new_cost) / pred if pred > 0 else -1.0
            if new_cost < cost:
                trace.append((it, lam, rho, new_cost, q))
                lam_min = min(lam_min, lam)
                improved = (cost - new_cost) / cost
                p, cost = q, new_cost
                lam = max(lam / 10, 1e-15)
                if improved < rel_tol:
                    return p, cost, trace, it + 1, lam_min
                break
            lam *= 10
            trace.append((it, lam, rho, cost, None))
            if lam > 1e8:
                return p, cost, trace, it + 1, lam_min
    return p, cost, trace, max_iter, lam_min


def gauss_newton(p0, data, max_iter=200):
    p = list(p0)
    for it in range(max_iter):
        try:
            JtJ, Jtr = normal_matrix(p, data)
            step = solve(JtJ, [-g for g in Jtr])
        except (ZeroDivisionError, OverflowError, ValueError):
            return p, float('inf'), it
        p = [x + s for x, s in zip(p, step)]
        if any(abs(x) > 1e6 or x != x for x in p):
            return p, float('inf'), it
        try:
            cost = sumsq(residuals(p, data))
        except OverflowError:
            return p, float('inf'), it
        if math.sqrt(sum(s * s for s in step)) < 1e-10:
            return p, cost, it + 1
    return p, cost, max_iter


def gradient_descent(p0, data, max_iter=20000, floor=None):
    p = list(p0)
    cost = sumsq(residuals(p, data))
    alpha = 1e-2
    for it in range(max_iter):
        _, Jtr = normal_matrix(p, data)
        grad = [2 * g for g in Jtr]
        gnorm = math.sqrt(sum(g * g for g in grad))
        if gnorm < 1e-12:
            return p, cost, it
        # backtracking line search
        while True:
            q = [x - alpha * g for x, g in zip(p, grad)]
            try:
                new_cost = sumsq(residuals(q, data))
            except OverflowError:
                new_cost = float('inf')
            if new_cost < cost:
                p, cost = q, new_cost
                alpha *= 1.2
                break
            alpha *= 0.5
            if alpha < 1e-18:
                return p, cost, it
        if floor is not None and cost <= floor * 1.01:
            return p, cost, it + 1
    return p, cost, max_iter


if __name__ == '__main__':
    rng = random.Random(SEED)
    data = []
    for i in range(60):
        t = i * 0.05
        data.append((t, model(TRUE, t) + rng.gauss(0, NOISE)))
    floor = sumsq(residuals(TRUE, data))
    best_known, best_cost, _, _, _ = levenberg_marquardt(TRUE, data)     # the local refinement of the truth
    floor_fit = best_cost
    assert floor_fit <= floor
    starts = [[rng.uniform(0.2, 8.0) for _ in range(4)] for _ in range(100)]

    # Oracle 1 and 5: success from far starts.
    lm_ok = gn_ok = gd_ok = 0
    lm_iters = []
    gd_iters = []
    gn_diverged = 0
    for s in starts:
        p, c, tr, it, _ = levenberg_marquardt(s, data)
        if c <= floor_fit * 1.01:
            lm_ok += 1
            lm_iters.append(it)
        p, c, it = gauss_newton(s, data)
        if c == float('inf'):
            gn_diverged += 1
        elif c <= floor_fit * 1.01:
            gn_ok += 1
        p, c, it = gradient_descent(s, data, max_iter=5000, floor=floor_fit)
        if c <= floor_fit * 1.01:
            gd_ok += 1
            gd_iters.append(it)
    assert lm_ok >= 90, lm_ok
    assert gn_diverged >= 20 and gn_ok < lm_ok, (gn_diverged, gn_ok)
    mean = lambda xs: sum(xs) / len(xs) if xs else float('nan')
    assert gd_ok < lm_ok or mean(gd_iters) > 20 * mean(lm_iters), (gd_ok, mean(gd_iters), mean(lm_iters))

    # Oracle 2: the damping trace on one far start.
    start = [6.0, 0.3, 0.5, 2.0]
    p, c, trace, it, lam_min = levenberg_marquardt(start, data)
    accepted = [(i, lam, rho) for i, lam, rho, cc, q in trace if q is not None]
    rejected_steps = [(i, lam, rho) for i, lam, rho, cc, q in trace if q is None]
    lam_first = accepted[0][1]
    assert lam_min < lam_first * 1e-3, (lam_first, lam_min)
    assert c <= floor_fit * 1.01

    # Oracle 3: the rate near the solution, from the accepted iterates of the
    # run above (the replay the draft used kept iterating past convergence
    # and wandered along the flat valley on rounding-level improvements).
    p_hist = [list(start)] + [q for i, lam, rho, cc, q in trace if q is not None]

    # the model is symmetric under swapping the two exponentials, so a run
    # may converge to (c, d, a, b); the error is measured modulo that swap
    def param_err(ph):
        direct = math.sqrt(sum((x - y) ** 2 for x, y in zip(ph, best_known)))
        swapped = math.sqrt(sum((x - y) ** 2 for x, y in zip([ph[2], ph[3], ph[0], ph[1]], best_known)))
        return min(direct, swapped)
    perr = [param_err(ph) for ph in p_hist]
    tail = [e for e in perr if e > 1e-9]
    lm_ratios = [tail[i + 1] / tail[i] for i in range(len(tail) - 4, len(tail) - 1) if tail[i] > 0]
    gd_p, gd_c, gd_it = gradient_descent(start, data, max_iter=3000)
    # gradient descent parameter error over its last steps
    gd_hist = []
    pp = list(start)
    cost = sumsq(residuals(pp, data))
    alpha = 1e-2
    for _ in range(3000):
        _, Jtr = normal_matrix(pp, data)
        grad = [2 * g for g in Jtr]
        while True:
            qq = [x - alpha * g for x, g in zip(pp, grad)]
            nc = sumsq(residuals(qq, data))
            if nc < cost:
                pp, cost = qq, nc
                alpha *= 1.2
                break
            alpha *= 0.5
            if alpha < 1e-18:
                break
        gd_hist.append(param_err(pp))
    gd_ratios = [gd_hist[i + 1] / gd_hist[i] for i in range(len(gd_hist) - 4, len(gd_hist) - 1)]
    assert min(lm_ratios) < 0.2 and min(gd_ratios) > 0.9, (lm_ratios, gd_ratios)

    # Oracle 4: conditioning at the far start.
    JtJ, _ = normal_matrix(start, data)
    kappa = cond_number(JtJ)
    kappas = []
    for lam in (1e-2, 1.0, 100.0):
        A = [[JtJ[i][j] + (lam * JtJ[i][i] if i == j else 0.0) for j in range(4)] for i in range(4)]
        kappas.append((lam, cond_number(A)))
    assert kappas[-1][1] < kappa / 10, (kappa, kappas)

    print(f'contest: fit y = a exp(-b t) + c exp(-d t) to 60 points on t in [0, 3] with noise {NOISE}; truth (a, b, c, d) = {tuple(TRUE)}; referee: the residual floor at the truth, {floor:.5f} (refined to {floor_fit:.5f})')
    print(f'100 random starts in [0.2, 8]^4: Levenberg-Marquardt reaches within 1% of the floor on {lm_ok} (mean {mean(lm_iters):.1f} iterations); undamped Gauss-Newton on {gn_ok}, diverging on {gn_diverged}; gradient descent with backtracking on {gd_ok} (mean {mean(gd_iters):,.0f} iterations, capped at 5,000)')
    print(f'damping trace from {start}: {len(accepted)} accepted steps in {it} iterations, lambda from {lam_first:.0e} down to {lam_min:.0e} at its most Gauss-Newton-like; {len(rejected_steps)} rejected steps raised it tenfold each; final cost {c:.5f}')
    print(f'rate near the solution: Levenberg-Marquardt successive error ratios {", ".join(f"{r:.2e}" for r in lm_ratios)}; gradient descent {", ".join(f"{r:.4f}" for r in gd_ratios)} after 3,000 steps (error {gd_hist[-1]:.2e})')
    print(f'conditioning at the far start: cond(J^T J) = {kappa:.1e}; with lambda 0.01 / 1 / 100: ' + ', '.join(f'{k:.1e}' for _, k in kappas))
    print(f'OK: LM {lm_ok} of 100 far starts, Gauss-Newton {gn_ok} ({gn_diverged} diverged), gradient descent {gd_ok} at {mean(gd_iters):,.0f} iterations vs {mean(lm_iters):.0f}; lambda {lam_first:.0e} -> {lam_min:.0e}; superlinear ratios vs {min(gd_ratios):.3f}; condition number {kappa:.1e} capped to {kappas[-1][1]:.1e}')
