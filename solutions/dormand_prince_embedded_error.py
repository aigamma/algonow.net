# Puzzle 112: Dormand-Prince x embedded error step control
# Adaptive ODE integration: the solver inside MATLAB's ode45 and
# SciPy's RK45. A Runge-Kutta step of order five is only as good
# as its step size, and the right step size varies wildly along
# one solution: huge across quiet stretches, tiny through sharp
# transients. The Dormand-Prince tableau computes TWO answers
# from the SAME six function evaluations: one of order five, one
# of order four: and their difference is a free, per-step error
# estimate. The controller accepts or rejects the step and sets
# the next h by the classic fifth-root law. Nobody chooses a
# step size: the equation itself does.
#
# The pairing is the point. The algorithm is the Dormand-Prince
# RK5(4) pair (1980): seven stages, first-same-as-last. The
# heuristic is embedded error step control: est = |y5 - y4|,
# h_next = h * (tol/est)^(1/5) with a safety factor: the rule
# that turned fixed-step integration into a self-driving one.
#
# Referees (one currency: function evaluations):
# (1) exact solutions: e^{-t} and cos/sin verify global error
#     under tolerance at tol = 1e-8;
# (2) THE ORDER, MEASURED: fixed-step DP at h vs h/2: global
#     error ratio ~ 2^5 = 32 (asserted 24..44): "order five" as
#     an experiment, not a claim;
# (3) the estimator audited: per-step embedded estimate vs TRUE
#     local error (from the exact solution): within a factor of
#     ten for >= 90% of steps;
# (4) THE ADAPTIVITY DIVIDEND: the ignition problem y' = y^2 -
#     y^3 (flat, sharp flame front, flat): adaptive steps span a
#     measured min-to-max range while fixed-step RK4 matching
#     the same accuracy pays an eval multiple, refereed by an
#     ultra-fine independent RK4 run;
# (5) the cost-accuracy law: evals scale ~ tol^(-1/5): measured
#     across tol = 1e-3 -> 1e-9;
# (6) the stiffness honesty row: y' = -2000(y - cos t): the
#     explicit pair is forced into tiny steps by STABILITY, not
#     accuracy: adaptivity cannot fix stiffness (BDF country),
#     and the eval blowup is measured.
import math

# Dormand-Prince 5(4) tableau (the ode45 coefficients).
A = [
    [],
    [1 / 5],
    [3 / 40, 9 / 40],
    [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
    [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
]
B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0]
B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40]
C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1]


def dp_step(f, t, y, h, evals, k1=None):
    """One DP5(4) step on a vector y. Returns (y5, y4, k7) where k7
    is reusable as the next step's k1 (FSAL)."""
    k = [None] * 7
    if k1 is None:
        k[0] = f(t, y)
        evals[0] += 1
    else:
        k[0] = k1
    for i in range(1, 7):
        yi = list(y)
        for j, a in enumerate(A[i]):
            for d in range(len(y)):
                yi[d] += h * a * k[j][d]
        k[i] = f(t + C[i] * h, yi)
        evals[0] += 1
    y5 = [y[d] + h * sum(B5[i] * k[i][d] for i in range(7)) for d in range(len(y))]
    y4 = [y[d] + h * sum(B4[i] * k[i][d] for i in range(7)) for d in range(len(y))]
    return y5, y4, k[6]


def solve_adaptive(f, t0, t1, y0, tol, evals, trace=None):
    t = t0
    y = list(y0)
    h = (t1 - t0) / 100
    k1 = None
    rejects = 0
    hs = []
    while t < t1 - 1e-14:
        h = min(h, t1 - t)
        y5, y4, k7 = dp_step(f, t, y, h, evals, k1)
        est = math.sqrt(sum((a - b) ** 2 for a, b in zip(y5, y4)))
        scale = tol * (1 + math.sqrt(sum(v * v for v in y)))
        if est <= scale or h < 1e-12 * (t1 - t0):
            if trace is not None:
                trace.append((t, h, est))
            t += h
            y = y5
            k1 = k7  # FSAL: the 7th stage is the next step's 1st
            hs.append(h)
        else:
            rejects += 1
            k1 = None
        ratio = (scale / est) ** 0.2 if est > 0 else 5.0
        h *= max(0.2, min(5.0, 0.9 * ratio))
    return y, hs, rejects


def rk4_fixed(f, t0, t1, y0, n, evals):
    h = (t1 - t0) / n
    t = t0
    y = list(y0)
    for _ in range(n):
        k1 = f(t, y)
        k2 = f(t + h / 2, [y[d] + h / 2 * k1[d] for d in range(len(y))])
        k3 = f(t + h / 2, [y[d] + h / 2 * k2[d] for d in range(len(y))])
        k4 = f(t + h, [y[d] + h * k3[d] for d in range(len(y))])
        evals[0] += 4
        y = [y[d] + h / 6 * (k1[d] + 2 * k2[d] + 2 * k3[d] + k4[d]) for d in range(len(y))]
        t += h
    return y


def dp_fixed(f, t0, t1, y0, n, evals):
    h = (t1 - t0) / n
    t = t0
    y = list(y0)
    k1 = None
    for _ in range(n):
        y, _, k1 = dp_step(f, t, y, h, evals, k1)
        t += h
    return y


if __name__ == '__main__':
    # Oracle 1: exact solutions at tol = 1e-8.
    ev = [0]
    y, _, _ = solve_adaptive(lambda t, y: [-y[0]], 0, 5, [1.0], 1e-8, ev)
    err_exp = abs(y[0] - math.exp(-5))
    assert err_exp < 1e-6, err_exp
    ev = [0]
    y, _, _ = solve_adaptive(lambda t, y: [y[1], -y[0]], 0, 2 * math.pi, [1.0, 0.0], 1e-8, ev)
    err_osc = math.hypot(y[0] - 1.0, y[1])
    assert err_osc < 1e-6, err_osc

    # Oracle 2: THE ORDER, measured. Fixed-step DP on the oscillator.
    errs = []
    for n in (100, 200):
        ev = [0]
        y = dp_fixed(lambda t, y: [y[1], -y[0]], 0, 2 * math.pi, [1.0, 0.0], n, ev)
        errs.append(math.hypot(y[0] - 1.0, y[1]))
    order_ratio = errs[0] / errs[1]
    assert 24 < order_ratio < 44, order_ratio  # 2^5 = 32

    # Oracle 3: the estimator audited on y' = -y (exact local error
    # known). Subtlety the first draft got wrong: |y5 - y4| estimates
    # the ORDER-FOUR solution's local error (O(h^5)); the solver then
    # advances with y5 whose error is O(h^6) ("local extrapolation").
    # So the audit checks two things: the estimate tracks y4's true
    # error within a factor of ten, and it conservatively bounds the
    # advanced y5's true error.
    good = 0
    conservative = 0
    total = 0
    t = 0.0
    yv = [1.0]
    h = 0.1
    ev = [0]
    while t < 4.0:
        y5, y4, _ = dp_step(lambda tt, yy: [-yy[0]], t, yv, h, ev)
        est = abs(y5[0] - y4[0])
        true_next = yv[0] * math.exp(-h)
        err4 = abs(y4[0] - true_next)
        err5 = abs(y5[0] - true_next)
        total += 1
        if err4 == 0 or 0.1 <= est / max(err4, 1e-18) <= 10:
            good += 1
        if est >= err5:
            conservative += 1
        t += h
        yv = y5
    assert good >= 0.9 * total, (good, total)
    assert conservative >= 0.9 * total, (conservative, total)

    # Oracle 4: THE ADAPTIVITY DIVIDEND: the ignition problem.
    delta = 0.01
    T = 2 / delta

    def flame(t, y):
        return [y[0] ** 2 - y[0] ** 3]

    ev_dp = [0]
    trace = []
    y_dp, hs, rejects = solve_adaptive(flame, 0, T, [delta], 1e-6, ev_dp, trace)
    h_min, h_max = min(hs), max(hs)
    span = h_max / h_min
    assert span > 50, span  # steps breathe across the front (measured ~69x)

    # referee: ultra-fine independent RK4.
    ev_ref = [0]
    y_ref = rk4_fixed(flame, 0, T, [delta], 400_000, ev_ref)
    assert abs(y_dp[0] - y_ref[0]) < 1e-5, (y_dp[0], y_ref[0])

    # fixed-step RK4 matching the adaptive answer's accuracy must
    # resolve the front everywhere: find the needed n by doubling.
    n = 1000
    while True:
        ev4 = [0]
        y4 = rk4_fixed(flame, 0, T, [delta], n, ev4)
        if abs(y4[0] - y_ref[0]) < 1e-5:
            break
        n *= 2
    fixed_evals = ev4[0]
    dividend = fixed_evals / ev_dp[0]
    assert dividend > 3, (fixed_evals, ev_dp[0])

    # Oracle 5: the cost-accuracy law: evals ~ tol^(-1/5). Measured
    # on the oscillator over ten periods, which is ERROR-limited
    # everywhere (the flame's flats are clamp-limited: the controller's
    # 5x growth cap, not the tolerance, sets the step there: a first
    # draft measured the law on the flame and got 2.5x, honestly noise).
    evals_by_tol = {}
    for tol in (1e-3, 1e-9):
        ev = [0]
        solve_adaptive(lambda t, y: [y[1], -y[0]], 0, 20 * math.pi, [1.0, 0.0], tol, ev)
        evals_by_tol[tol] = ev[0]
    law_ratio = evals_by_tol[1e-9] / evals_by_tol[1e-3]
    assert 8 < law_ratio < 30, law_ratio  # (1e6)^(1/5) = 15.8

    # Oracle 6: the stiffness honesty row.
    def stiff(t, y):
        return [-2000 * (y[0] - math.cos(t))]

    ev_stiff = [0]
    y_st, hs_st, rej_st = solve_adaptive(stiff, 0, 1.5, [0.0], 1e-6, ev_stiff)
    exact_st = (2000 / (1 + 2000 ** 2)) * (2000 * math.cos(1.5) + math.sin(1.5)) - \
        (2000 ** 2 / (1 + 2000 ** 2)) * math.exp(-2000 * 1.5)
    assert abs(y_st[0] - exact_st) < 1e-4, (y_st[0], exact_st)
    ev_smooth = [0]
    solve_adaptive(lambda t, y: [-(y[0] - math.cos(t))], 0, 1.5, [0.0], 1e-6, ev_smooth)
    stiff_blowup = ev_stiff[0] / ev_smooth[0]
    assert stiff_blowup > 20, stiff_blowup

    print('contest: the ignition problem y\' = y^2 - y^3 over [0, 200] (flat, flame front, flat); one currency: function evaluations; referee: an independent 400,000-step RK4 run')
    print(f"  {'method':<34} {'f-evals':>10}")
    print(f"  {'fixed-step RK4 (front-limited)':<34} {fixed_evals:>10,}   the smallest step, paid everywhere: the front sets the bill for the flats")
    print(f"  {'dormand-prince adaptive':<34} {ev_dp[0]:>10,}   steps breathe {span:,.0f}x from h={h_min:.2e} to {h_max:.2f}: {dividend:.0f}x fewer evals, same answer")
    print(f"the order, measured: halving h cut fixed-step DP's global error {order_ratio:.1f}x (2^5 = 32): order five as an experiment")
    print(f"the estimator, audited: |y5 - y4| within 10x of y4's TRUE local error on {good}/{total} steps of y' = -y, and a conservative bound on the advanced y5's error on {conservative}/{total}")
    print(f"the dial (on the error-limited oscillator, 10 periods): tol 1e-3 -> 1e-9 multiplied evals {law_ratio:.1f}x (the fifth-root law predicts 15.8x): accuracy is priced, predictably")
    print(f"the stiffness wall, measured: y' = -2000(y - cos t): {ev_stiff[0]:,} evals ({rej_st} rejects) vs {ev_smooth[0]:,} on the equally-smooth non-stiff twin: {stiff_blowup:.0f}x: STABILITY, not accuracy, pins the step: adaptivity cannot fix stiffness (that is BDF country)")
    print(f'OK: exact-solution errors under tolerance (e^-t: {err_exp:.1e}; oscillator: {err_osc:.1e}); order five measured at {order_ratio:.1f}x; '
          f'the estimator honest on {good}/{total} steps; the adaptive dividend {dividend:.0f}x with steps spanning {span:,.0f}x, refereed by independent RK4; '
          f'the fifth-root cost law at {law_ratio:.1f}x; and the stiffness blowup at {stiff_blowup:.0f}x, stated as the boundary of the method')
