# Puzzle 182: Monte Carlo integration x Uniform sampling
# Numerical integration: estimate the integral of a function over a box in
# d dimensions when d is large enough that any grid of points per axis
# multiplies into more evaluations than exist. The algorithm is Monte Carlo
# integration (Metropolis and Ulam 1949): the integral is the volume times
# the mean of f over the box, so estimate the mean by averaging f at random
# points and read the error off the sample standard deviation divided by
# the square root of the sample count. The heuristic is uniform sampling:
# draw the points independently and uniformly over the box, nothing
# cleverer, so the estimate is unbiased, the error estimate is honest
# whenever the variance is finite, and the error falls as 1 / sqrt(N) in
# ANY number of dimensions, because the dimension never enters the formula.
# A product grid cannot say that: m points per axis cost m^d evaluations.
#
# Referees:
# (1) EXACT INTEGRALS: a product of smooth factors with integral exactly
#     one in every dimension, a Gaussian over the unit cube whose value is
#     a power of (sqrt(pi) / 2) erf(1), and the volume of the unit ball
#     inside the cube, pi^(d/2) / Gamma(d/2 + 1), in 1, 2, 6, and 10
#     dimensions; every estimate is scored against the closed form;
# (2) THE 1 / sqrt(N) LAW, measured: the root-mean-square error over 40
#     independent runs at N = 100, 1,000, and 10,000 in each dimension,
#     with the fitted log-log slope held near -1/2 in d = 1, 2, 6, and 10;
# (3) THE ERROR ESTIMATE: the 95% interval from the sample standard
#     deviation covers the exact value in about 95% of 300 repetitions
#     (coverage measured, must sit between 0.90 and 0.99);
# (4) THE RIVALS at an equal evaluation budget: the trapezoidal and
#     Simpson rules on a product grid (in 1-D they win by many orders of
#     magnitude; in 6-D and 10-D the grid has 4 and 2 points per axis),
#     Gauss-Legendre in 1-D, Halton quasi-random points, and stratified
#     (jittered-grid) sampling, each scored against the exact value;
# (5) THE NEGATIVE EXAMPLE, measured: an integrand with a finite integral
#     but infinite variance, x^(-3/4) on (0, 1], integral exactly 4, where
#     the sample standard deviation keeps reporting a small error, the
#     95% interval covers the truth far less than 95% of the time, and the
#     realized error shrinks as N^(-1/3), not N^(-1/2).
#
# AUTHOR CORRECTION: the draft expected Halton points to beat uniform
# sampling in every dimension at the budgets used. Measured, Halton wins
# eleven-fold in 2-D and three-fold in 6-D, barely in 1-D, and loses to
# plain uniform sampling in 10-D at 1,024 points, while stratified
# (jittered-grid) sampling beat both everywhere; the page reports the
# measured ratios rather than the folklore that quasi-random always wins.
import math
import random

SEED = 20261010


# ------------------------------------------------------------ integrands

def smooth_product(x):
    v = 1.0
    for xi in x:
        v *= 1.0 + 0.5 * math.cos(2 * math.pi * xi)
    return v


def gaussian_cube(x):
    s = 0.0
    for xi in x:
        s += xi * xi
    return math.exp(-s)


def ball_indicator(x):
    # x in [-1, 1]^d; the box volume 2^d is applied by the caller
    s = 0.0
    for xi in x:
        s += xi * xi
    return 1.0 if s <= 1.0 else 0.0


def exact_gaussian(d):
    return (math.sqrt(math.pi) / 2 * math.erf(1.0)) ** d


def exact_ball_fraction(d):
    return math.pi ** (d / 2) / math.gamma(d / 2 + 1) / 2 ** d


# --------------------------------------------------------------- methods

def monte_carlo(f, d, n, rng, lo=0.0, hi=1.0):
    """Uniform sampling: mean of f, its standard error, evaluations."""
    total = 0.0
    total_sq = 0.0
    width = hi - lo
    for _ in range(n):
        x = [lo + width * rng.random() for _ in range(d)]
        v = f(x)
        total += v
        total_sq += v * v
    mean = total / n
    var = max(total_sq / n - mean * mean, 0.0) * n / max(n - 1, 1)
    volume = width ** d
    return volume * mean, volume * math.sqrt(var / n), n


def grid_rule(f, d, m, weights_fn, lo=0.0, hi=1.0):
    """A product rule with m points per axis and the given 1-D weights;
    m^d evaluations."""
    nodes, weights = weights_fn(m, lo, hi)
    total = 0.0
    idx = [0] * d
    count = 0
    while True:
        x = [nodes[i] for i in idx]
        w = 1.0
        for i in idx:
            w *= weights[i]
        total += w * f(x)
        count += 1
        k = 0
        while k < d:
            idx[k] += 1
            if idx[k] < m:
                break
            idx[k] = 0
            k += 1
        if k == d:
            break
    return total, count


def trapezoid_weights(m, lo, hi):
    h = (hi - lo) / (m - 1)
    nodes = [lo + i * h for i in range(m)]
    weights = [h] * m
    weights[0] = weights[-1] = h / 2
    return nodes, weights


def simpson_weights(m, lo, hi):
    assert m % 2 == 1 and m >= 3
    h = (hi - lo) / (m - 1)
    nodes = [lo + i * h for i in range(m)]
    weights = [h / 3 * (4 if i % 2 else 2) for i in range(m)]
    weights[0] = weights[-1] = h / 3
    return nodes, weights


GL5_NODES = [-0.9061798459386640, -0.5384693101056831, 0.0, 0.5384693101056831, 0.9061798459386640]
GL5_WEIGHTS = [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891]


def gauss_legendre_weights(m, lo, hi):
    assert m == 5
    mid = (lo + hi) / 2
    half = (hi - lo) / 2
    return [mid + half * t for t in GL5_NODES], [half * w for w in GL5_WEIGHTS]


PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]


def halton(index, base):
    f = 1.0
    r = 0.0
    while index > 0:
        f /= base
        r += f * (index % base)
        index //= base
    return r


def quasi_monte_carlo(f, d, n, lo=0.0, hi=1.0):
    width = hi - lo
    total = 0.0
    for k in range(1, n + 1):
        x = [lo + width * halton(k, PRIMES[i]) for i in range(d)]
        total += f(x)
    return width ** d * total / n, n


def stratified(f, d, m, rng, lo=0.0, hi=1.0):
    """One uniform point in each of the m^d cells of a grid (a jittered
    grid); m^d evaluations."""
    width = hi - lo
    cell = width / m
    total = 0.0
    idx = [0] * d
    count = 0
    while True:
        x = [lo + (idx[i] + rng.random()) * cell for i in range(d)]
        total += f(x)
        count += 1
        k = 0
        while k < d:
            idx[k] += 1
            if idx[k] < m:
                break
            idx[k] = 0
            k += 1
        if k == d:
            break
    return width ** d * total / count, count


def slope(xs, ys):
    lx = [math.log(x) for x in xs]
    ly = [math.log(y) for y in ys]
    mx, my = sum(lx) / len(lx), sum(ly) / len(ly)
    num = sum((a - mx) * (b - my) for a, b in zip(lx, ly))
    den = sum((a - mx) ** 2 for a in lx)
    return num / den


def main():
    rng = random.Random(SEED)
    dims = (1, 2, 6, 10)
    sizes = (100, 1000, 10000)
    reps = 40

    # Oracle 1 and 2: the 1 / sqrt(N) law in four dimensions on the
    # smooth product (integral exactly 1).
    law = {}
    for d in dims:
        rmse = []
        for n in sizes:
            errs = []
            for _ in range(reps):
                est, _, _ = monte_carlo(smooth_product, d, n, rng)
                errs.append(est - 1.0)
            rmse.append(math.sqrt(sum(e * e for e in errs) / reps))
        law[d] = (rmse, slope(sizes, rmse))
        assert -0.62 <= law[d][1] <= -0.38, (d, law[d])
    # the dimension does not enter: the RMSE at N = 10,000 differs across
    # d only through the integrand's variance, and in every dimension the
    # ratio RMSE(100) / RMSE(10,000) sits near 10
    ratios = {d: law[d][0][0] / law[d][0][2] for d in dims}
    for d in dims:
        assert 6 <= ratios[d] <= 16, (d, ratios[d])

    # Oracle 3: coverage of the 95% interval, Gaussian over the 6-cube.
    d6 = 6
    exact6 = exact_gaussian(d6)
    covered = 0
    claimed = []
    realized = []
    for _ in range(300):
        est, se, _ = monte_carlo(gaussian_cube, d6, 2000, rng)
        claimed.append(se)
        realized.append(est - exact6)
        if abs(est - exact6) <= 1.96 * se:
            covered += 1
    coverage = covered / 300
    assert 0.90 <= coverage <= 0.99, coverage
    rms_realized = math.sqrt(sum(e * e for e in realized) / len(realized))
    mean_claimed = sum(claimed) / len(claimed)
    assert 0.8 <= rms_realized / mean_claimed <= 1.25, (rms_realized, mean_claimed)

    # Oracle 4: the rivals at an equal budget on the Gaussian cube.
    rows = {}
    # 1-D at a budget of 10,001 evaluations (Simpson needs an odd count)
    exact1 = exact_gaussian(1)
    mc1, se1, _ = monte_carlo(gaussian_cube, 1, 10001, rng)
    tr1, _ = grid_rule(gaussian_cube, 1, 10001, trapezoid_weights)
    si1, _ = grid_rule(gaussian_cube, 1, 10001, simpson_weights)
    gl1, _ = grid_rule(gaussian_cube, 1, 5, gauss_legendre_weights)
    qm1, _ = quasi_monte_carlo(gaussian_cube, 1, 10001)
    st1, _ = stratified(gaussian_cube, 1, 10001, rng)
    rows[1] = {
        'Monte Carlo': abs(mc1 - exact1), 'trapezoid grid': abs(tr1 - exact1), 'Simpson grid': abs(si1 - exact1),
        'Gauss-Legendre (5 points)': abs(gl1 - exact1), 'Halton': abs(qm1 - exact1), 'stratified': abs(st1 - exact1),
    }
    assert rows[1]['Simpson grid'] < 1e-12 and rows[1]['trapezoid grid'] < 1e-7, rows[1]
    assert rows[1]['Gauss-Legendre (5 points)'] < 1e-6
    assert rows[1]['Monte Carlo'] > 100 * rows[1]['trapezoid grid']
    # 2-D at 4,096: Halton against uniform (both over 40 runs for the
    # random ones; Halton is deterministic)
    exact2 = exact_gaussian(2)
    mc2 = math.sqrt(sum((monte_carlo(gaussian_cube, 2, 4096, rng)[0] - exact2) ** 2 for _ in range(40)) / 40)
    qm2 = abs(quasi_monte_carlo(gaussian_cube, 2, 4096)[0] - exact2)
    st2 = math.sqrt(sum((stratified(gaussian_cube, 2, 64, rng)[0] - exact2) ** 2 for _ in range(40)) / 40)
    tr2 = abs(grid_rule(gaussian_cube, 2, 64, trapezoid_weights)[0] - exact2)
    rows[2] = {'Monte Carlo (rms of 40)': mc2, 'trapezoid grid 64 x 64': tr2, 'Halton': qm2, 'stratified 64 x 64 (rms of 40)': st2}
    assert qm2 < mc2 / 5, (qm2, mc2)
    # 6-D at 4,096 = 4^6
    mc6 = math.sqrt(sum((monte_carlo(gaussian_cube, 6, 4096, rng)[0] - exact6) ** 2 for _ in range(40)) / 40)
    tr6 = abs(grid_rule(gaussian_cube, 6, 4, trapezoid_weights)[0] - exact6)
    qm6 = abs(quasi_monte_carlo(gaussian_cube, 6, 4096)[0] - exact6)
    st6 = math.sqrt(sum((stratified(gaussian_cube, 6, 4, rng)[0] - exact6) ** 2 for _ in range(40)) / 40)
    rows[6] = {'Monte Carlo (rms of 40)': mc6, 'trapezoid grid 4^6': tr6, 'Halton': qm6, 'stratified 4^6 (rms of 40)': st6}
    assert mc6 < tr6, (mc6, tr6)
    # 10-D at 1,024 = 2^10 (Simpson's coarsest grid would need 3^10 = 59,049)
    exact10 = exact_gaussian(10)
    mc10 = math.sqrt(sum((monte_carlo(gaussian_cube, 10, 1024, rng)[0] - exact10) ** 2 for _ in range(40)) / 40)
    tr10 = abs(grid_rule(gaussian_cube, 10, 2, trapezoid_weights)[0] - exact10)
    qm10 = abs(quasi_monte_carlo(gaussian_cube, 10, 1024)[0] - exact10)
    st10 = math.sqrt(sum((stratified(gaussian_cube, 10, 2, rng)[0] - exact10) ** 2 for _ in range(40)) / 40)
    rows[10] = {'Monte Carlo (rms of 40)': mc10, 'trapezoid grid 2^10': tr10, 'Halton': qm10, 'stratified 2^10 (rms of 40)': st10}
    assert tr10 > 10 * mc10, (tr10, mc10)
    assert tr10 / exact10 > 0.5, 'the two-point grid should be off by more than half the integral'

    # the ball: a rare indicator in 10-D, the relative error formula
    frac10 = exact_ball_fraction(10)
    est_b, se_b, _ = monte_carlo(ball_indicator, 10, 200000, rng, lo=-1.0, hi=1.0)
    frac_est = est_b / 2 ** 10
    pred_rel = math.sqrt((1 - frac10) / (frac10 * 200000))
    assert abs(frac_est - frac10) < 4 * frac10 * pred_rel, (frac_est, frac10, pred_rel)

    # Oracle 5: infinite variance. x^(-3/4) on (0, 1], integral 4.
    def singular(x):
        return x[0] ** -0.75

    sing_cov = 0
    sing_claimed = []
    sing_real = []
    for _ in range(300):
        est, se, _ = monte_carlo(singular, 1, 2000, rng)
        sing_claimed.append(se)
        sing_real.append(est - 4.0)
        if abs(est - 4.0) <= 1.96 * se:
            sing_cov += 1
    sing_coverage = sing_cov / 300
    sing_rms = math.sqrt(sum(e * e for e in sing_real) / 300)
    sing_mean_claimed = sum(sing_claimed) / 300
    assert sing_coverage < 0.9, sing_coverage
    assert sing_rms > 1.3 * sing_mean_claimed, (sing_rms, sing_mean_claimed)
    sing_rmse = []
    for n in (1000, 10000, 100000):
        errs = [monte_carlo(singular, 1, n, rng)[0] - 4.0 for _ in range(20)]
        sing_rmse.append(math.sqrt(sum(e * e for e in errs) / 20))
    sing_slope = slope((1000, 10000, 100000), sing_rmse)
    assert sing_slope > -0.45, sing_slope

    print('contest: integrals with closed forms in 1, 2, 6, and 10 dimensions; one currency: function evaluations; referee: the exact value, and for the error estimate the realized error over hundreds of repetitions')
    print('the 1/sqrt(N) law on the smooth product (integral exactly 1), root-mean-square error over 40 runs:')
    for d in dims:
        r, sl = law[d]
        print(f'  d = {d:>2}: N = 100: {r[0]:.4f}, N = 1,000: {r[1]:.4f}, N = 10,000: {r[2]:.4f}; slope {sl:.3f}; ratio 100 to 10,000: {ratios[d]:.1f}')
    print(f'coverage of the 95% interval, Gaussian over the 6-cube at N = 2,000, 300 repetitions: {coverage:.3f}; realized RMS error {rms_realized:.5f} against the mean claimed standard error {mean_claimed:.5f}')
    print('rivals on the Gaussian cube, absolute error at an equal evaluation budget:')
    print('  d = 1, budget 10,001 (Gauss-Legendre 5): ' + ', '.join(f'{k} {v:.2e}' for k, v in rows[1].items()))
    print('  d = 2, budget 4,096: ' + ', '.join(f'{k} {v:.2e}' for k, v in rows[2].items()))
    print('  d = 6, budget 4,096: ' + ', '.join(f'{k} {v:.2e}' for k, v in rows[6].items()) + f' (exact {exact6:.5f})')
    print('  d = 10, budget 1,024: ' + ', '.join(f'{k} {v:.2e}' for k, v in rows[10].items()) + f' (exact {exact10:.6f}; the coarsest Simpson grid would need 3^10 = 59,049 evaluations)')
    print(f'the ball inside the 10-cube: fraction {frac_est:.5f} against {frac10:.5f} from 200,000 points; predicted relative error {pred_rel:.3f}, realized {abs(frac_est - frac10) / frac10:.3f}')
    print(f'infinite variance, x^(-3/4) on (0, 1] (integral 4), N = 2,000: coverage {sing_coverage:.3f}, realized RMS error {sing_rms:.3f} against claimed {sing_mean_claimed:.3f}; error slope {sing_slope:.3f} against the -0.5 of finite variance')
    print(f'OK: the error fell as N^{law[1][1]:.2f}, N^{law[2][1]:.2f}, N^{law[6][1]:.2f}, N^{law[10][1]:.2f} in 1, 2, 6, 10 dimensions; the 95% interval covered the truth {coverage:.1%} of the time; '
          f'in 10-D at 1,024 evaluations Monte Carlo erred {mc10:.2e} where the two-point trapezoid grid erred {tr10:.2e}; in 1-D Simpson beat it by {rows[1]["Monte Carlo"] / rows[1]["Simpson grid"]:.0e}x; '
          f'on the infinite-variance integrand the interval covered only {sing_coverage:.1%} and the error fell as N^{sing_slope:.2f}')


if __name__ == '__main__':
    main()
