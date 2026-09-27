# Puzzle 145: RANSAC x random consensus sampling
# Robust model fitting: 200 points, of which 60% lie near a line and
# 40% are scattered anywhere. Find the line. Least squares, which
# minimizes the sum of squared residuals, is pulled off by every
# outlier in proportion to how far away it is, and 80 outliers pull
# hard. RANSAC (random sample consensus) is the algorithm: fit the
# model to the smallest possible sample, count the points that agree
# with it within a threshold, keep the model with the most agreement,
# and refit to that consensus set. The heuristic is the sampling:
# draw the minimal samples at random, enough of them that at least one
# is all inliers with high probability, which takes a number of draws
# that depends on the outlier fraction and not on the size of the data.
#
# Referees:
# (1) THE TRUTH: the points are generated from a known line y = 0.7 x
#     + 3 with noise 0.3; with enough draws for a one-in-a-million
#     failure chance (31 at 40% outliers), the consensus set must match
#     the true inlier set and the refit line must
#     land within 0.05 in slope and 0.3 in intercept, in every one of
#     200 trials (Jaccard above 0.85: the threshold admits the few
#     outliers that happen to sit near the line). AUTHOR CORRECTION: the draft demanded this of the
#     99% draw count and one trial in 200 failed, exactly as a 99%
#     guarantee says it may; the per-trial guarantee is measured in
#     oracle 2 instead, and the every-trial claim now uses the draw
#     count that earns it;
# (2) THE SAMPLE COUNT LAW: N = log(1 - p) / log(1 - w^2) draws for
#     success probability p with inlier fraction w; at 40% outliers and
#     p = 0.99 that is 11 draws, and the measured success rate over
#     2,000 trials must be at least 0.97; with 3 draws it is measured
#     and lower;
# (3) THE OUTLIER SWEEP: 20% / 40% / 60% / 80% outliers, the draws the
#     formula asks for (5 / 11 / 27 / 113) and the measured success at
#     each, showing the cost growing while the data stays the same;
# (4) THE THRESHOLD, ablated: 0.05 (too tight: inliers rejected, the
#     consensus set shrinks and the fit wanders) and 5.0 (too loose:
#     outliers admitted, the refit is pulled), both measured as slope
#     error;
# (5) THE RIVALS: ordinary least squares (pulled), Theil-Sen (the median
#     of pairwise slopes, breakdown point 29%: fine at 20% outliers,
#     degrading past that), and Huber regression by iteratively
#     reweighted least squares (degraded at 60%, several times RANSAC's
#     error but not broken), all measured as slope error against the
#     truth and asserted as a ranking, not as failures.
import math
import random

SEED = 20260926
TRUE_SLOPE, TRUE_INTERCEPT = 0.7, 3.0
NOISE = 0.3
N_POINTS = 200


def make_data(rng, outlier_fraction):
    n_out = int(round(outlier_fraction * N_POINTS))
    pts = []
    inlier = []
    for i in range(N_POINTS):
        if i < N_POINTS - n_out:
            x = rng.uniform(-10, 10)
            pts.append((x, TRUE_SLOPE * x + TRUE_INTERCEPT + rng.gauss(0, NOISE)))
            inlier.append(True)
        else:
            pts.append((rng.uniform(-10, 10), rng.uniform(-15, 25)))
            inlier.append(False)
    return pts, inlier


def least_squares(pts, weights=None):
    n = len(pts)
    w = weights if weights is not None else [1.0] * n
    sw = sum(w)
    mx = sum(wi * x for wi, (x, _) in zip(w, pts)) / sw
    my = sum(wi * y for wi, (_, y) in zip(w, pts)) / sw
    sxx = sum(wi * (x - mx) ** 2 for wi, (x, _) in zip(w, pts))
    sxy = sum(wi * (x - mx) * (y - my) for wi, (x, y) in zip(w, pts))
    slope = sxy / sxx
    return slope, my - slope * mx


def residual(model, p):
    m, b = model
    return abs(p[1] - (m * p[0] + b)) / math.sqrt(1 + m * m)


def ransac(pts, rng, draws, threshold=1.0):
    best = None
    best_set = []
    for _ in range(draws):
        i, j = rng.sample(range(len(pts)), 2)
        (x1, y1), (x2, y2) = pts[i], pts[j]
        if abs(x2 - x1) < 1e-9:
            continue
        m = (y2 - y1) / (x2 - x1)
        b = y1 - m * x1
        consensus = [k for k, p in enumerate(pts) if residual((m, b), p) <= threshold]
        if len(consensus) > len(best_set):
            best_set = consensus
            best = (m, b)
    if len(best_set) < 2:
        return best, best_set
    return least_squares([pts[k] for k in best_set]), best_set


def draws_needed(p, inlier_fraction, sample_size=2):
    return math.ceil(math.log(1 - p) / math.log(1 - inlier_fraction ** sample_size))


def theil_sen(pts):
    slopes = []
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            if abs(pts[j][0] - pts[i][0]) > 1e-9:
                slopes.append((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]))
    slopes.sort()
    m = slopes[len(slopes) // 2]
    intercepts = sorted(y - m * x for x, y in pts)
    return m, intercepts[len(intercepts) // 2]


def huber(pts, delta=1.0, iters=50):
    model = least_squares(pts)
    for _ in range(iters):
        w = []
        for p in pts:
            r = abs(p[1] - (model[0] * p[0] + model[1]))
            w.append(1.0 if r <= delta else delta / r)
        model = least_squares(pts, w)
    return model


def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b)


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: the truth, 200 trials at 40% outliers with the 99% draw count.
    draws40 = draws_needed(0.99, 0.6)
    assert draws40 == 11, draws40
    draws_sure = draws_needed(0.999999, 0.6)
    assert draws_sure == 31, draws_sure
    worst_slope = 0.0
    worst_intercept = 0.0
    worst_jaccard = 1.0
    ols_errors = []
    for _ in range(200):
        pts, inlier = make_data(rng, 0.4)
        truth = [k for k, v in enumerate(inlier) if v]
        (m, b), consensus = ransac(pts, rng, draws_sure)
        worst_slope = max(worst_slope, abs(m - TRUE_SLOPE))
        worst_intercept = max(worst_intercept, abs(b - TRUE_INTERCEPT))
        worst_jaccard = min(worst_jaccard, jaccard(consensus, truth))
        ols_errors.append(abs(least_squares(pts)[0] - TRUE_SLOPE))
    assert worst_slope < 0.05 and worst_intercept < 0.3, (worst_slope, worst_intercept)
    # The consensus set is the true inlier set up to the threshold: an outlier
    # that happens to fall within 1.0 of the line is counted (about 5% of the
    # uniform outliers do), so the sets agree closely but not exactly. The
    # draft asked for Jaccard 0.95 and the worst of 200 trials was 0.90.
    assert worst_jaccard > 0.85, worst_jaccard
    ols_mean = sum(ols_errors) / len(ols_errors)
    assert ols_mean > 0.1, ols_mean

    # Oracle 2: the draw count law.
    def success_rate(outlier_fraction, draws, trials=2000, threshold=1.0):
        ok = 0
        for _ in range(trials):
            pts, inlier = make_data(rng, outlier_fraction)
            model, consensus = ransac(pts, rng, draws, threshold)
            if model is not None and abs(model[0] - TRUE_SLOPE) < 0.05 and abs(model[1] - TRUE_INTERCEPT) < 0.3:
                ok += 1
        return ok / trials

    rate11 = success_rate(0.4, 11)
    rate3 = success_rate(0.4, 3)
    assert rate11 >= 0.97, rate11
    assert rate3 < rate11, (rate3, rate11)

    # Oracle 3: the outlier sweep.
    sweep = []
    for frac in (0.2, 0.4, 0.6, 0.8):
        d = draws_needed(0.99, 1 - frac)
        sweep.append((frac, d, success_rate(frac, d, trials=500)))
    assert [d for _, d, _ in sweep] == [5, 11, 27, 113], sweep
    assert all(r >= 0.95 for _, _, r in sweep), sweep

    # Oracle 4: the threshold.
    tight_err = []
    loose_err = []
    right_err = []
    for _ in range(100):
        pts, inlier = make_data(rng, 0.4)
        for t, acc in ((0.05, tight_err), (5.0, loose_err), (1.0, right_err)):
            model, _ = ransac(pts, rng, 11, t)
            acc.append(abs(model[0] - TRUE_SLOPE) if model else 1.0)
    mean = lambda xs: sum(xs) / len(xs)
    assert mean(right_err) < mean(tight_err) and mean(right_err) < mean(loose_err), (mean(right_err), mean(tight_err), mean(loose_err))

    # Oracle 5: the rivals by outlier fraction (slope error, 30 trials each).
    rival_rows = []
    for frac in (0.2, 0.4, 0.6):
        errs = {'RANSAC': [], 'least squares': [], 'Theil-Sen': [], 'Huber (IRLS)': []}
        for _ in range(30):
            pts, inlier = make_data(rng, frac)
            errs['RANSAC'].append(abs(ransac(pts, rng, draws_needed(0.99, 1 - frac))[0][0] - TRUE_SLOPE))
            errs['least squares'].append(abs(least_squares(pts)[0] - TRUE_SLOPE))
            errs['Theil-Sen'].append(abs(theil_sen(pts)[0] - TRUE_SLOPE))
            errs['Huber (IRLS)'].append(abs(huber(pts)[0] - TRUE_SLOPE))
        rival_rows.append((frac, {k: mean(v) for k, v in errs.items()}))
    r20, r40, r60 = [row[1] for row in rival_rows]
    # AUTHOR CORRECTION: the draft asserted that Huber fails outright at 60%
    # outliers; measured, it degrades (six times RANSAC's error) and Theil-Sen
    # is worse still, so the ranking is asserted rather than a failure.
    assert r60['RANSAC'] < 0.02 and r60['RANSAC'] < r60['Huber (IRLS)'] < r60['Theil-Sen'] < r60['least squares'], r60
    assert r20['Theil-Sen'] < 0.05, r20

    print(f'contest: a line through {N_POINTS} points, 60% within noise {NOISE} of y = {TRUE_SLOPE} x + {TRUE_INTERCEPT}, 40% scattered; referee: the generating line and the true inlier set')
    print(f'RANSAC at 40% outliers with {draws_sure} draws (p = 0.999999), 200 trials: worst slope error {worst_slope:.3f}, worst intercept error {worst_intercept:.3f}, worst consensus-vs-truth Jaccard {worst_jaccard:.3f}; least squares mean slope error {ols_mean:.3f}')
    print(f'the draw count law at 40% outliers: {draws40} draws succeed in {rate11:.1%} of 2,000 trials, 3 draws in {rate3:.1%}')
    print(f"  {'outliers':>8} {'draws (p=0.99)':>14} {'success':>8}")
    for frac, d, r in sweep:
        print(f'  {frac:>8.0%} {d:>14} {r:>8.1%}')
    print(f'threshold at 40% outliers (mean slope error, 100 trials): 0.05 too tight {mean(tight_err):.3f}, 1.0 {mean(right_err):.3f}, 5.0 too loose {mean(loose_err):.3f}')
    print(f"  {'mean slope error':<16} {'RANSAC':>8} {'least sq':>9} {'Theil-Sen':>10} {'Huber':>8}")
    for frac, e in rival_rows:
        print(f"  {f'{frac:.0%} outliers':<16} {e['RANSAC']:>8.3f} {e['least squares']:>9.3f} {e['Theil-Sen']:>10.3f} {e['Huber (IRLS)']:>8.3f}")
    print(f'OK: RANSAC recovered the line in 200 of 200 trials at 40% outliers (worst slope error {worst_slope:.3f}); {draws40} draws succeeded {rate11:.1%} vs 3 draws {rate3:.1%}; the sweep needed 5 / 11 / 27 / 113 draws at 20-80% outliers, all at or above 95%; '
          f'at 60% outliers RANSAC {r60["RANSAC"]:.3f} vs least squares {r60["least squares"]:.3f}, Theil-Sen {r60["Theil-Sen"]:.3f}, Huber {r60["Huber (IRLS)"]:.3f}')
