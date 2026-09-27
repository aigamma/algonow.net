# Puzzle 161: Nelder-Mead x reflect-expand-contract simplex
# Derivative-free optimization: minimize a function of a few variables
# when no gradient is available, or the function is noisy, or it is
# a black box that costs a simulation per call. Nelder-Mead is the
# algorithm: keep n + 1 points (a simplex) in n dimensions, ordered by
# value, and replace the worst one each iteration. The heuristic is
# the move set: reflect the worst point through the centroid of the
# others; if that is the new best, try expanding further; if it is
# still the worst, contract toward the centroid; if even that fails,
# shrink the whole simplex toward the best point. The simplex crawls,
# stretches along valleys, and shrinks onto the minimum, using only
# comparisons of function values.
#
# Referees:
# (1) THE MINIMUM: on Rosenbrock's banana in two dimensions, whose
#     minimum is exactly (1, 1) with value 0, 50 random starts in
#     [-2, 2]^2 must reach a value below 1e-8 in at least 90% of runs,
#     with function evaluations and the four move kinds counted, against
#     BFGS with the analytic gradient and coordinate descent with a
#     line search;
# (2) NOISE: on a quadratic with additive evaluation noise of 1e-3,
#     Nelder-Mead reaches the noise floor while BFGS with
#     finite-difference gradients (step 1e-6) wanders, measured as the
#     final distance from the true minimum;
# (3) THE COUNTEREXAMPLE: McKinnon's function, on which the method
#     from his prescribed initial simplex converges to the origin, a
#     point that is not a minimizer (the minimum is at (0, -1/2) with
#     value -1/4), by repeated inside contractions; a restart from a
#     fresh simplex escapes;
# (4) DIMENSION: evaluations to reach 1e-6 on an ill-conditioned
#     quadratic in n = 2, 4, 8, 16 dimensions, showing the simplex
#     method's cost climb far faster than BFGS's;
# (5) THE NEGATIVE EXAMPLE, measured: finite-difference gradients on
#     the noisy function, and Nelder-Mead in 32 dimensions within the
#     same budget.
#
# AUTHOR CORRECTION: the draft expected the 32-dimensional run to fail
# inside 200,000 evaluations. It converged, at 81,689 evaluations
# against 216 for BFGS, so the dimension penalty is reported as cost
# (378x), not as failure, and the assertion only requires convergence
# through n = 16 for the simplex and through n = 32 for BFGS.
import math
import random

SEED = 20260926


def nelder_mead(f, x0, step=0.5, max_evals=20000, ftol=1e-12, xtol=1e-10, simplex=None):
    n = len(x0)
    if simplex is None:
        simplex = [list(x0)]
        for i in range(n):
            p = list(x0)
            p[i] += step
            simplex.append(p)
    vals = [f(p) for p in simplex]
    evals = n + 1
    ops = {'reflect': 0, 'expand': 0, 'contract': 0, 'shrink': 0}
    history = []
    while evals < max_evals:
        order = sorted(range(n + 1), key=lambda i: vals[i])
        simplex = [simplex[i] for i in order]
        vals = [vals[i] for i in order]
        history.append((simplex[0][:], vals[0]))
        spread = vals[-1] - vals[0]
        size = max(math.sqrt(sum((a - b) ** 2 for a, b in zip(simplex[i], simplex[0]))) for i in range(1, n + 1))
        if spread < ftol and size < xtol:
            break
        centroid = [sum(simplex[i][k] for i in range(n)) / n for k in range(n)]
        worst = simplex[-1]
        reflected = [c + (c - w) for c, w in zip(centroid, worst)]
        fr = f(reflected)
        evals += 1
        if vals[0] <= fr < vals[-2]:
            simplex[-1], vals[-1] = reflected, fr
            ops['reflect'] += 1
            continue
        if fr < vals[0]:
            expanded = [c + 2 * (c - w) for c, w in zip(centroid, worst)]
            fe = f(expanded)
            evals += 1
            if fe < fr:
                simplex[-1], vals[-1] = expanded, fe
                ops['expand'] += 1
            else:
                simplex[-1], vals[-1] = reflected, fr
                ops['reflect'] += 1
            continue
        if fr < vals[-1]:
            contracted = [c + 0.5 * (r - c) for c, r in zip(centroid, reflected)]      # outside contraction
        else:
            contracted = [c + 0.5 * (w - c) for c, w in zip(centroid, worst)]          # inside contraction
        fc = f(contracted)
        evals += 1
        if fc < min(fr, vals[-1]):
            simplex[-1], vals[-1] = contracted, fc
            ops['contract'] += 1
            continue
        best = simplex[0]
        for i in range(1, n + 1):
            simplex[i] = [b + 0.5 * (p - b) for b, p in zip(best, simplex[i])]
            vals[i] = f(simplex[i])
            evals += 1
        ops['shrink'] += 1
    order = sorted(range(n + 1), key=lambda i: vals[i])
    return simplex[order[0]], vals[order[0]], evals, ops, history


def bfgs(f, grad, x0, max_iter=500, tol=1e-10):
    n = len(x0)
    x = list(x0)
    H = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    g = grad(x)
    evals = 1
    for it in range(max_iter):
        gnorm = math.sqrt(sum(v * v for v in g))
        if gnorm < tol:
            return x, f(x), evals, it
        d = [-sum(H[i][j] * g[j] for j in range(n)) for i in range(n)]
        # backtracking Armijo line search
        t = 1.0
        fx = f(x)
        evals += 1
        slope = sum(a * b for a, b in zip(g, d))
        while True:
            xn = [xi + t * di for xi, di in zip(x, d)]
            fn = f(xn)
            evals += 1
            if fn <= fx + 1e-4 * t * slope or t < 1e-12:
                break
            t *= 0.5
        gn = grad(xn)
        evals += 1
        s = [t * di for di in d]
        y = [a - b for a, b in zip(gn, g)]
        sy = sum(a * b for a, b in zip(s, y))
        if sy > 1e-14:
            rho = 1.0 / sy
            Hy = [sum(H[i][j] * y[j] for j in range(n)) for i in range(n)]
            yHy = sum(y[i] * Hy[i] for i in range(n))
            for i in range(n):
                for j in range(n):
                    H[i][j] += (1 + rho * yHy) * rho * s[i] * s[j] - rho * (Hy[i] * s[j] + s[i] * Hy[j])
        x, g = xn, gn
    return x, f(x), evals, max_iter


def fd_grad(f, h=1e-6):
    def g(x):
        out = []
        for i in range(len(x)):
            xp = list(x)
            xm = list(x)
            xp[i] += h
            xm[i] -= h
            out.append((f(xp) - f(xm)) / (2 * h))
        return out
    return g


def golden(f1d, a, b, tol=1e-9):
    phi = (math.sqrt(5) - 1) / 2
    c, d = b - phi * (b - a), a + phi * (b - a)
    fc, fd = f1d(c), f1d(d)
    evals = 2
    while abs(b - a) > tol:
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - phi * (b - a)
            fc = f1d(c)
        else:
            a, c, fc = c, d, fd
            d = a + phi * (b - a)
            fd = f1d(d)
        evals += 1
    return (a + b) / 2, evals


def coordinate_descent(f, x0, max_sweeps=500, tol=1e-12):
    x = list(x0)
    evals = 0
    fx = f(x)
    for sweep in range(max_sweeps):
        for i in range(len(x)):
            def f1d(t, i=i):
                y = list(x)
                y[i] = t
                return f(y)
            t, e = golden(f1d, x[i] - 2.0, x[i] + 2.0)
            evals += e
            x[i] = t
        fn = f(x)
        evals += 1
        if abs(fx - fn) < tol:
            return x, fn, evals, sweep + 1
        fx = fn
    return x, fx, evals, max_sweeps


def rosenbrock(x):
    return sum(100 * (x[i + 1] - x[i] ** 2) ** 2 + (1 - x[i]) ** 2 for i in range(len(x) - 1))


def rosenbrock_grad(x):
    n = len(x)
    g = [0.0] * n
    for i in range(n - 1):
        g[i] += -400 * x[i] * (x[i + 1] - x[i] ** 2) - 2 * (1 - x[i])
        g[i + 1] += 200 * (x[i + 1] - x[i] ** 2)
    return g


def mckinnon(x):
    """McKinnon (1998): theta = 6, tau = 2, phi = 60; minimum at (0, -1/2)."""
    a, b = x
    if a <= 0:
        return 360 * a * a + b + b * b
    return 6 * a * a + b + b * b


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: Rosenbrock from 50 starts.
    nm_ok = bf_ok = cd_ok = 0
    nm_evals = []
    bf_evals = []
    cd_evals = []
    ops_total = {'reflect': 0, 'expand': 0, 'contract': 0, 'shrink': 0}
    for _ in range(50):
        x0 = [rng.uniform(-2, 2), rng.uniform(-2, 2)]
        x, fx, e, ops, _ = nelder_mead(rosenbrock, x0)
        if fx < 1e-8:
            nm_ok += 1
            nm_evals.append(e)
        for k in ops:
            ops_total[k] += ops[k]
        x, fx, e, it = bfgs(rosenbrock, rosenbrock_grad, x0)
        if fx < 1e-8:
            bf_ok += 1
            bf_evals.append(e)
        x, fx, e, sw = coordinate_descent(rosenbrock, x0, max_sweeps=200)
        if fx < 1e-8:
            cd_ok += 1
            cd_evals.append(e)
    mean = lambda xs: sum(xs) / len(xs) if xs else float('nan')
    assert nm_ok >= 45, nm_ok
    assert bf_ok >= 45 and mean(bf_evals) < mean(nm_evals), (bf_ok, mean(bf_evals), mean(nm_evals))
    assert cd_ok < nm_ok, (cd_ok, nm_ok)

    # Oracle 2 and 5: noise.
    noise_rng = random.Random(SEED + 1)
    center = [0.3, -0.7, 1.1]

    def noisy_quadratic(x):
        return sum((xi - ci) ** 2 for xi, ci in zip(x, center)) + noise_rng.gauss(0, 1e-3)
    x0 = [3.0, 3.0, 3.0]
    xn2, fn2, en2, _, _ = nelder_mead(noisy_quadratic, x0, step=1.0, max_evals=3000, ftol=1e-6, xtol=1e-4)
    dist_nm = math.sqrt(sum((a - c) ** 2 for a, c in zip(xn2, center)))
    xb, fb, eb, itb = bfgs(noisy_quadratic, fd_grad(noisy_quadratic), x0, max_iter=200)
    dist_fd = math.sqrt(sum((a - c) ** 2 for a, c in zip(xb, center)))
    xa, fa, ea, ita = bfgs(lambda x: sum((xi - ci) ** 2 for xi, ci in zip(x, center)), lambda x: [2 * (xi - ci) for xi, ci in zip(x, center)], x0)
    assert dist_nm < 0.05, dist_nm
    assert dist_fd > 10 * dist_nm, (dist_fd, dist_nm)

    # Oracle 3: McKinnon's counterexample.
    lam1 = (1 + math.sqrt(33)) / 8
    lam2 = (1 - math.sqrt(33)) / 8
    simplex = [[0.0, 0.0], [1.0, 1.0], [lam1, lam2]]
    xm, fm, em, opsm, hist = nelder_mead(mckinnon, [0.0, 0.0], simplex=[p[:] for p in simplex], max_evals=5000)
    stalled = math.sqrt(xm[0] ** 2 + xm[1] ** 2) < 1e-3
    assert stalled, xm
    xr, fr_, er, opsr, _ = nelder_mead(mckinnon, xm, step=0.5, max_evals=5000)
    assert abs(fr_ + 0.25) < 1e-6 and abs(xr[1] + 0.5) < 1e-3, (xr, fr_)

    # Oracle 4: dimension.
    dim_rows = []
    for n in (2, 4, 8, 16, 32):
        scales = [10 ** (i / (n - 1)) for i in range(n)]                # condition number 100
        q = lambda x, s=scales: sum(si * xi * xi for si, xi in zip(s, x))
        qg = lambda x, s=scales: [2 * si * xi for si, xi in zip(s, x)]
        x0 = [1.0] * n
        xn, fn, en, _, _ = nelder_mead(q, x0, step=0.5, max_evals=200000, ftol=1e-14, xtol=1e-9)
        xb, fb, eb, itb = bfgs(q, qg, x0)
        dim_rows.append((n, en, fn < 1e-6, eb, fb < 1e-6))
    assert all(r[2] for r in dim_rows[:4]) and all(r[4] for r in dim_rows), dim_rows
    assert dim_rows[3][1] > 20 * dim_rows[3][3], dim_rows[3]
    growth_nm = dim_rows[3][1] / dim_rows[0][1]
    growth_bf = dim_rows[3][3] / dim_rows[0][3]
    assert growth_nm > 3 * growth_bf, (growth_nm, growth_bf)

    print(f'contest: minimize without derivatives; referees: known minima (Rosenbrock at (1, 1) with value 0; McKinnon\'s function at (0, -1/2) with value -1/4; a noisy quadratic with a known center)')
    print(f'Rosenbrock, 50 starts in [-2, 2]^2, target value below 1e-8: Nelder-Mead {nm_ok} of 50 at {mean(nm_evals):.0f} evaluations; BFGS with the analytic gradient {bf_ok} of 50 at {mean(bf_evals):.0f} (function plus gradient calls); coordinate descent with golden-section lines {cd_ok} of 50')
    print(f'moves over the 50 runs: {ops_total["reflect"]:,} reflections, {ops_total["expand"]:,} expansions, {ops_total["contract"]:,} contractions, {ops_total["shrink"]} shrinks')
    print(f'noise 1e-3 on a quadratic from (3, 3, 3): Nelder-Mead ends {dist_nm:.4f} from the center in {en2} evaluations; BFGS with finite-difference gradients (h 1e-6) ends {dist_fd:.3f} away; BFGS with exact gradients on the clean function {math.sqrt(sum((a - c) ** 2 for a, c in zip(xa, center))):.1e}')
    print(f'McKinnon\'s counterexample from his simplex: the method stalls at ({xm[0]:.2e}, {xm[1]:.2e}) with value {fm:.2e} after {opsm["contract"]} contractions and {opsm["reflect"]} reflections in {em} evaluations; a restart with a fresh simplex reaches ({xr[0]:.3f}, {xr[1]:.3f}) with value {fr_:.4f}')
    print(f"  {'n':>3} {'Nelder-Mead evals':>17} {'reached 1e-6':>12} {'BFGS evals':>10} {'reached':>7}")
    for n, en_, ok_n, eb_, ok_b in dim_rows:
        print(f'  {n:>3} {en_:>17,} {str(ok_n):>12} {eb_:>10,} {str(ok_b):>7}')
    print(f'OK: Nelder-Mead {nm_ok} of 50 on Rosenbrock at {mean(nm_evals):.0f} evaluations vs BFGS {mean(bf_evals):.0f}; noise-robust at {dist_nm:.3f} vs finite differences {dist_fd:.2f}; McKinnon stall reproduced and escaped by restart; '
          f'evaluations grow {growth_nm:.0f}x from n = 2 to 16 vs BFGS {growth_bf:.0f}x, and n = 32 {"fails" if not dim_rows[4][2] else "still converges"} in 200,000')
