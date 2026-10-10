# Puzzle 192: Random search x Uniform hyperparameter sampling
# Tune a learner's knobs with a fixed budget of trainings. Random search
# draws every trial independently from the whole space and keeps the best;
# the heuristic is uniform sampling, log-uniform across orders of magnitude
# (Bergstra and Bengio 2012). Two facts carry it: n draws land in the top 5%
# of the space with probability 1 - 0.95^n in any dimension (0.954 at 60),
# and since only a few knobs matter, a grid with k points per axis tries k
# values of the knob that matters while n random trials try n.
# Referees: (1) the theorem against a top-5%-by-volume threshold in two and
# six dimensions; (2) k x k grids against k^2 random and Latin hypercube
# trials on an objective with one important axis; (3) a polynomial ridge
# learner with three knobs tuned at budgets 27 and 64 by grid, random, and
# Latin hypercube sampling, refereed by a dense scan of 3,610 settings; (4) uniform against log-uniform learning rates, both against
# closed forms; (5) a 15,625-point six-knob grid against 60 random trials.
# AUTHOR CORRECTIONS: (a) the draft scored the learning-rate experiment by
# the loss (within 2x of the optimum) and claimed log-uniform draws would get
# there in most repeats; measured 0.07 against 0.27, since the loss after
# 100 steps is exponentially sensitive to the rate, so the page scores a draw
# within 2x of the best RATE, where both samplers match closed forms. (b) The
# draft learner trained on 40 points and every method, grid included, landed
# within 5% of its optimum; the page uses 14 points, where the within-5%
# region is 8.5% of the space and the methods separate.
import math
import random
import time

SEED = 20261010


# ------------------------------------------------------------------ samplers
def uniform_points(n, dim, rng):
    """Random search: n independent uniform draws from the unit cube."""
    return [[rng.random() for _ in range(dim)] for _ in range(n)]


def grid_points(ks):
    """Full factorial grid with ks[d] points on axis d, endpoints included."""
    pts = [[]]
    for k in ks:
        axis = [i / (k - 1) for i in range(k)] if k > 1 else [0.5]
        pts = [p + [a] for p in pts for a in axis]
    return pts


def latin_hypercube(n, dim, rng):
    """One point per stratum on every axis (McKay, Beckman, Conover 1979)."""
    cols = []
    for _ in range(dim):
        perm = list(range(n))
        rng.shuffle(perm)
        cols.append([(perm[i] + rng.random()) / n for i in range(n)])
    return [[cols[d][i] for d in range(dim)] for i in range(n)]


def distinct_values(points, axis):
    return len({round(p[axis], 12) for p in points})


def mean_se(xs):
    n = len(xs)
    m = sum(xs) / n
    v = sum((x - m) ** 2 for x in xs) / (n - 1) if n > 1 else 0.0
    return m, math.sqrt(v / n)


# ------------------------------- a two-dimensional objective, one axis matters
X_STAR, Y_STAR = 0.37, 0.62


def f2(p):
    important = math.exp(-((p[0] - X_STAR) / 0.12) ** 2)
    weak = 0.08 * math.exp(-((p[1] - Y_STAR) / 0.30) ** 2)
    return important + weak


F2_MAX = f2([X_STAR, Y_STAR])


def top_threshold(fn, dim, frac, rng=None, m=400):
    """The (1 - frac) quantile of fn over the unit cube: a 400 x 400 grid in
    two dimensions, a 200,000-point uniform sample above that."""
    if dim == 2:
        vals = sorted(fn([(i + 0.5) / m, (j + 0.5) / m]) for i in range(m) for j in range(m))
    else:
        vals = sorted(fn(p) for p in uniform_points(200000, dim, rng))
    return vals[int(round((1 - frac) * len(vals)))]


def hit_probability(fn, dim, thr, n, reps, rng):
    hits = 0
    for _ in range(reps):
        for _ in range(n):
            if fn([rng.random() for _ in range(dim)]) >= thr:
                hits += 1
                break
    p = hits / reps
    return p, math.sqrt(max(p * (1 - p), 1e-12) / reps)


def best_value(points, fn):
    return max(fn(p) for p in points)


# --------------------------------------------- the learner: polynomial ridge
DEG_MAX = 10
LOG_LAM_LO, LOG_LAM_HI = -7.0, 2.0


def chebyshev_row(x, dmax):
    t = [1.0, x]
    for _ in range(2, dmax + 1):
        t.append(2 * x * t[-1] - t[-2])
    return t


def solve_augmented(a):
    """Gaussian elimination with partial pivoting on an m x (m + 1) system."""
    m = len(a)
    for col in range(m):
        piv = max(range(col, m), key=lambda r: abs(a[r][col]))
        if piv != col:
            a[col], a[piv] = a[piv], a[col]
        inv = 1.0 / a[col][col]
        for r in range(col + 1, m):
            f = a[r][col] * inv
            if f:
                ar, ac = a[r], a[col]
                for c in range(col, m + 1):
                    ar[c] -= f * ac[c]
    w = [0.0] * m
    for r in range(m - 1, -1, -1):
        s = a[r][m]
        for c in range(r + 1, m):
            s -= a[r][c] * w[c]
        w[r] = s / a[r][r]
    return w


class RidgeLearner:
    """Chebyshev-feature ridge regression on a noisy curve, scored by
    validation MSE. Knobs: degree, lambda (log scale), and one the closed-form
    solver never reads."""

    def __init__(self, rng, n_train=14, n_val=200, noise=0.2):
        def target(x):
            return math.sin(3 * x) + 0.4 * x * x

        xtr = [rng.uniform(-1, 1) for _ in range(n_train)]
        ytr = [target(x) + rng.gauss(0, noise) for x in xtr]
        xva = [rng.uniform(-1, 1) for _ in range(n_val)]
        self.yva = [target(x) + rng.gauss(0, noise) for x in xva]
        rows = [chebyshev_row(x, DEG_MAX) for x in xtr]
        self.rows_va = [chebyshev_row(x, DEG_MAX) for x in xva]
        m = DEG_MAX + 1
        self.xtx = [[sum(r[i] * r[j] for r in rows) for j in range(m)] for i in range(m)]
        self.xty = [sum(r[i] * y for r, y in zip(rows, ytr)) for i in range(m)]
        self.evaluations = 0

    def val_mse(self, degree, lam):
        m = degree + 1
        a = [self.xtx[i][:m] + [self.xty[i]] for i in range(m)]
        for i in range(1, m):
            a[i][i] += lam
        w = solve_augmented(a)
        self.evaluations += 1
        err = 0.0
        for r, y in zip(self.rows_va, self.yva):
            pred = 0.0
            for i in range(m):
                pred += w[i] * r[i]
            err += (pred - y) ** 2
        return err / len(self.yva)


def config_of(u):
    """Unit cube to knobs: degree 1..10 uniformly, lambda log-uniform, the
    third coordinate is the irrelevant knob."""
    degree = min(DEG_MAX, 1 + int(DEG_MAX * u[0]))
    lam = 10 ** (LOG_LAM_LO + (LOG_LAM_HI - LOG_LAM_LO) * u[1])
    return degree, lam


def learner_score(learner, u):
    degree, lam = config_of(u)
    return learner.val_mse(degree, lam)


def distinct_configs(points):
    return len({config_of(u) for u in points})


# ------------------------------- gradient descent toy for the learning rate
EIGS = [10 ** (2 * i / 9) for i in range(10)]  # curvatures 1 to 100
GD_STEPS = 100
ETA_LO, ETA_HI = 1e-5, 1.0
ETA_STABLE = 2.0 / max(EIGS)  # above this the steepest direction diverges


def gd_loss(eta):
    total = 0.0
    for lam in EIGS:
        r = 1.0 - eta * lam
        if abs(r) >= 1.0:
            return math.inf
        total += 0.5 * lam * r ** (2 * GD_STEPS)
    return total


# ----------------------------------------------- the six-dimensional version
def f6(p):
    extra = 0.0
    for j in range(2, 6):
        extra += 0.005 * math.exp(-((p[j] - 0.5) / 0.4) ** 2)
    return f2(p) + extra


F6_MAX = f6([X_STAR, Y_STAR, 0.5, 0.5, 0.5, 0.5])


def main():
    t0 = time.perf_counter()
    rng = random.Random(SEED)
    lines = []

    # (1) the theorem
    thr2 = top_threshold(f2, 2, 0.05)
    theorem_rows = []
    for n in (10, 30, 60):
        p, se = hit_probability(f2, 2, thr2, n, 10000, rng)
        theory = 1 - 0.95 ** n
        theorem_rows.append((n, p, se, theory))
        assert abs(p - theory) <= 3 * se + 1e-9, (n, p, se, theory)
    p60_theory = 1 - 0.95 ** 60
    assert abs(p60_theory - 0.9539) < 5e-4
    lines.append("(1) P(top 5%% hit by n draws), 10,000 repeats, threshold %.4f of max %.3f:" % (thr2 / F2_MAX, F2_MAX))
    for n, p, se, theory in theorem_rows:
        lines.append("    n = %2d: %.4f +/- %.4f, theory 1 - 0.95^n = %.4f" % (n, p, se, theory))

    # (2) low effective dimensionality
    led_rows = []
    reps = 300
    for k in range(3, 9):
        n = k * k
        grid = grid_points([k, k])
        gbest = best_value(grid, f2) / F2_MAX
        rnd_sets = [uniform_points(n, 2, rng) for _ in range(reps)]
        lhs_sets = [latin_hypercube(n, 2, rng) for _ in range(reps)]
        rnd = [best_value(s, f2) / F2_MAX for s in rnd_sets]
        lhs = [best_value(s, f2) / F2_MAX for s in lhs_sets]
        rm, rse = mean_se(rnd)
        lm, lse = mean_se(lhs)
        assert distinct_values(grid, 0) == k
        assert all(distinct_values(s, 0) == n for s in rnd_sets[:20])
        assert all(distinct_values(s, 0) == n for s in lhs_sets[:20])
        led_rows.append((k, n, gbest, rm, rse, lm, lse))
    grid_by_k = {r[0]: r[2] for r in led_rows}
    rnd_by_k = {r[0]: r[3] for r in led_rows}
    assert grid_by_k[5] < grid_by_k[4] and grid_by_k[3] < grid_by_k[4], grid_by_k
    assert grid_by_k[8] < grid_by_k[7], grid_by_k
    assert rnd_by_k[3] > grid_by_k[3] + 0.2 and rnd_by_k[5] > grid_by_k[5] + 0.2, (rnd_by_k, grid_by_k)
    assert rnd_by_k[8] > rnd_by_k[3], rnd_by_k
    lines.append("(2) one important axis (peak 0.37, width 0.12): best / optimum, %d repeats" % reps)
    lines.append("    budget      grid   random (n distinct x)   LHS")
    for k, n, gbest, rm, rse, lm, lse in led_rows:
        lines.append("    %d x %d = %2d  %.3f  %.3f +/- %.3f   %.3f +/- %.3f" % (k, k, n, gbest, rm, rse, lm, lse))

    # (3) the learner
    learner = RidgeLearner(rng)
    dense = []
    for degree in range(1, DEG_MAX + 1):
        for i in range(361):
            lam = 10 ** (LOG_LAM_LO + (LOG_LAM_HI - LOG_LAM_LO) * i / 360)
            dense.append((learner.val_mse(degree, lam), degree, lam))
    dense.sort()
    opt_mse, opt_degree, opt_lam = dense[0]
    dense_evals = learner.evaluations
    tol = 1.05 * opt_mse
    good_frac = sum(1 for v, _, _ in dense if v <= tol) / len(dense)
    lines.append("(3) ridge learner, dense scan of %d settings: optimum MSE %.4f at degree %d, lambda %.2e; within 5%%: %.3f of the space, theorem predicts %.2f at 27, %.2f at 64" % (dense_evals, opt_mse, opt_degree, opt_lam, good_frac, 1 - (1 - good_frac) ** 27, 1 - (1 - good_frac) ** 64))
    learner_rows = []
    budgets = {27: 3, 64: 4}
    reps_l = 200
    for budget, k in budgets.items():
        grid = grid_points([k, k, k])
        gscores = [learner_score(learner, u) for u in grid]
        gbest = min(gscores)
        gdistinct = distinct_configs(grid)
        assert gdistinct == k * k, gdistinct
        rnd_best, lhs_best = [], []
        for _ in range(reps_l):
            pts = uniform_points(budget, 3, rng)
            assert distinct_configs(pts) == budget or budget > 60  # continuous lambda: all distinct
            rnd_best.append(min(learner_score(learner, u) for u in pts))
            pts = latin_hypercube(budget, 3, rng)
            lhs_best.append(min(learner_score(learner, u) for u in pts))
        rfrac = sum(1 for v in rnd_best if v <= tol) / reps_l
        lfrac = sum(1 for v in lhs_best if v <= tol) / reps_l
        rm, rse = mean_se([v / opt_mse for v in rnd_best])
        lm, lse = mean_se([v / opt_mse for v in lhs_best])
        learner_rows.append((budget, k, gbest / opt_mse, gbest <= tol, gdistinct, rfrac, rm, rse, lfrac, lm, lse))
    lines.append("    budget  grid: distinct, best/opt, hit   random: hit, best/opt   LHS: hit, best/opt   (%d repeats)" % reps_l)
    for budget, k, gratio, gok, gdistinct, rfrac, rm, rse, lfrac, lm, lse in learner_rows:
        lines.append("    %2d      %d per axis: %2d of %2d, %.3f, %s   %.2f, %.3f +/- %.3f   %.2f, %.3f +/- %.3f" % (budget, k, gdistinct, budget, gratio, "yes" if gok else "no", rfrac, rm, rse, lfrac, lm, lse))
    r27, r64 = learner_rows[0], learner_rows[1]
    for row in learner_rows:
        budget, rfrac = row[0], row[5]
        predicted = 1 - (1 - good_frac) ** budget
        se = math.sqrt(max(predicted * (1 - predicted), 1e-9) / reps_l)
        assert abs(rfrac - predicted) <= 3 * se + 0.03, (budget, rfrac, predicted, se)
    assert r64[5] > r27[5], (r27[5], r64[5])  # more random budget, more hits
    assert not r27[3] and not r64[3], (r27[2], r64[2])  # both grids miss the 5% band
    assert r27[2] > 4 and r64[2] > 1.3, (r27[2], r64[2])
    assert learner_rows[0][8] >= r27[5], (learner_rows[0][8], r27[5])  # LHS hits at least as often

    # (4) log-uniform versus uniform learning rate
    etas = [10 ** (math.log10(ETA_LO) + (math.log10(ETA_HI) - math.log10(ETA_LO)) * i / 20000) for i in range(20001)]
    best_eta = min(etas, key=gd_loss)
    best_loss = gd_loss(best_eta)
    p_uniform_theory = (ETA_STABLE - ETA_LO) / (ETA_HI - ETA_LO)
    p_log_theory = math.log(ETA_STABLE / ETA_LO) / math.log(ETA_HI / ETA_LO)
    draws, reps_g = 20, 2000
    win_lo, win_hi = best_eta / 2, min(2 * best_eta, ETA_STABLE)
    w_uniform_theory = 1 - (1 - (win_hi - win_lo) / (ETA_HI - ETA_LO)) ** draws
    w_log_theory = 1 - (1 - math.log(win_hi / win_lo) / math.log(ETA_HI / ETA_LO)) ** draws
    lr_rows = []
    for name, sampler, theory, wtheory in (
        ("uniform", lambda: ETA_LO + (ETA_HI - ETA_LO) * rng.random(), p_uniform_theory, w_uniform_theory),
        ("log-uniform", lambda: 10 ** (math.log10(ETA_LO) + (math.log10(ETA_HI) - math.log10(ETA_LO)) * rng.random()), p_log_theory, w_log_theory),
    ):
        converged = 0
        reps_with_any = 0
        reps_in_window = 0
        ratios = []
        for _ in range(reps_g):
            es = [sampler() for _ in range(draws)]
            losses = [gd_loss(e) for e in es]
            fin = [v for v in losses if v < math.inf]
            converged += len(fin)
            if fin:
                reps_with_any += 1
                ratios.append(min(fin) / best_loss)
            if any(win_lo <= e <= win_hi for e in es):
                reps_in_window += 1
        p = converged / (reps_g * draws)
        se = math.sqrt(p * (1 - p) / (reps_g * draws))
        assert abs(p - theory) <= 3 * se + 1e-9, (name, p, se, theory)
        w = reps_in_window / reps_g
        wse = math.sqrt(w * (1 - w) / reps_g)
        assert abs(w - wtheory) <= 3 * wse + 1e-9, (name, w, wse, wtheory)
        ratios.sort()
        median_ratio = ratios[len(ratios) // 2] if ratios else math.inf
        lr_rows.append((name, p, se, theory, reps_with_any / reps_g, w, wtheory, median_ratio))
    lines.append("(4) learning rate, curvatures 1 to 100 (stable below %.3f, best %.4f at loss %.2e), %d draws x %d repeats:" % (ETA_STABLE, best_eta, best_loss, draws, reps_g))
    for name, p, se, theory, any_ok, w, wtheory, median_ratio in lr_rows:
        lines.append("    %-12s converge %.4f +/- %.4f (theory %.4f); any %.3f; within 2x of best rate %.3f (theory %.3f); median loss/opt %.1f" % (name, p, se, theory, any_ok, w, wtheory, median_ratio))
    assert lr_rows[0][5] < 0.3 and lr_rows[1][5] > 0.6, (lr_rows[0][5], lr_rows[1][5])

    # (5) the six-dimensional negative example
    grid6 = grid_points([5] * 6)
    g6 = best_value(grid6, f6) / F6_MAX
    assert len(grid6) == 15625 and all(distinct_values(grid6, d) == 5 for d in range(6))
    thr6 = top_threshold(f6, 6, 0.05, rng)
    p6, se6 = hit_probability(f6, 6, thr6, 60, 5000, rng)
    assert abs(p6 - p60_theory) <= 3 * se6 + 1e-9, (p6, se6, p60_theory)
    r6 = []
    for _ in range(500):
        pts = uniform_points(60, 6, rng)
        assert distinct_values(pts, 0) == 60
        r6.append(best_value(pts, f6) / F6_MAX)
    r6m, r6se = mean_se(r6)
    r6_90 = sum(1 for v in r6 if v >= 0.9) / 500
    assert g6 < 0.5 and r6m > 0.9, (g6, r6m)
    lines.append("(5) six knobs, five grid points each: %d trainings, best %.3f of the optimum; 60 random trainings %.3f +/- %.3f (above 0.9 in %.2f of 500 repeats), top 5%% hit %.3f +/- %.3f (theory %.4f)" % (len(grid6), g6, r6m, r6se, r6_90, p6, se6, p60_theory))

    elapsed = time.perf_counter() - t0
    print("Random search x Uniform hyperparameter sampling")
    for ln in lines:
        print(ln)
    print("%.1f s" % elapsed)
    print(
        "OK: 1 - 0.95^n matched within 3 SE at n = 10, 30, 60 (%.4f at 60); grid k x k lurches (k = 3, 4, 5: %.2f, %.2f, %.2f of the optimum) while k^2 random trials climb %.2f to %.2f; "
        "ridge learner within 5%% of the dense optimum: random %.0f%% and %.0f%% at 27 and 64, grid %s and %s, LHS %.0f%% and %.0f%%; "
        "uniform learning rates converge on %.1f%% of draws against %.1f%% log-uniform; 15,625-point grid %.2f of the six-knob optimum against %.2f for 60 random trials"
        % (
            theorem_rows[2][1], grid_by_k[3], grid_by_k[4], grid_by_k[5], rnd_by_k[3], rnd_by_k[8],
            100 * r27[5], 100 * r64[5], "hit" if r27[3] else "miss", "hit" if r64[3] else "miss", 100 * r27[8], 100 * r64[8],
            100 * lr_rows[0][1], 100 * lr_rows[1][1], g6, r6m,
        )
    )


if __name__ == "__main__":
    main()
