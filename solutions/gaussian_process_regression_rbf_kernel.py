"""Gaussian process regression x RBF kernel: the self-test.

Pure Python, 1-D inputs, our own Cholesky and solves. ORACLES: (1) with
no noise the posterior mean passes through every training point and the
variance there is zero; (2) the posterior mean equals kernel ridge
regression (same kernel, ridge = noise variance) computed by an
independent Gauss-Jordan inverse; (3) with the quadratic-feature kernel
the GP posterior equals the Bayesian linear regression posterior
(weight space, Rasmussen and Williams eq. 2.11-2.12) in mean and
variance; (4) random Fourier features converge to the exact RBF
posterior as the feature count grows; (5) calibration: functions drawn
from the prior with known noise fall inside the 95% predictive interval
about 95% of the time; (6) the Cholesky log marginal likelihood equals
the direct determinant-and-inverse formula, and maximizing it recovers
the generating length scale; (7) the cost grows like n cubed and a
sparse (DTC) approximation with m inducing points converges to the
exact posterior. Negative example: a wildly wrong length scale.
AUTHOR CORRECTION: the draft asserted that the random-feature error falls
at every step of D; the measured kernel error rose from D = 200 to 800
(0.039 to 0.047, sampling noise in the drawn frequencies), so the
assertion compares the first and last D by a factor of three and the
page says the decrease is overall, not monotone.
"""
import math
import random
import time


def rbf(ell, sf2=1.0):
    c = -0.5 / (ell * ell)
    return lambda a, b: sf2 * math.exp(c * (a - b) * (a - b))


def kmat(xs, zs, k):
    return [[k(x, z) for z in zs] for x in xs]


def cholesky(a):
    n = len(a)
    low = [[0.0] * n for _ in range(n)]
    for i in range(n):
        li = low[i]
        for j in range(i + 1):
            lj = low[j]
            s = a[i][j] - sum(li[t] * lj[t] for t in range(j))
            if i == j:
                if s <= 0.0:
                    raise ValueError("not positive definite")
                li[j] = math.sqrt(s)
            else:
                li[j] = s / lj[j]
    return low


def solve_lower(low, b):
    y = [0.0] * len(b)
    for i in range(len(b)):
        y[i] = (b[i] - sum(low[i][t] * y[t] for t in range(i))) / low[i][i]
    return y


def chol_solve(low, b):
    n = len(b)
    y = solve_lower(low, b)
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - sum(low[t][i] * x[t] for t in range(i + 1, n))) / low[i][i]
    return x


def inverse(a):
    """Gauss-Jordan with partial pivoting: the independent route."""
    n = len(a)
    m = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        piv = m[c][c]
        m[c] = [v / piv for v in m[c]]
        for r in range(n):
            if r != c and m[r][c] != 0.0:
                f = m[r][c]
                m[r] = [u - f * v for u, v in zip(m[r], m[c])]
    return [row[n:] for row in m]


def determinant(a):
    n = len(a)
    m = [row[:] for row in a]
    d = 1.0
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        if p != c:
            m[c], m[p] = m[p], m[c]
            d = -d
        d *= m[c][c]
        for r in range(c + 1, n):
            f = m[r][c] / m[c][c]
            m[r] = [u - f * v for u, v in zip(m[r], m[c])]
    return d


class GP:
    def __init__(self, xs, ys, k, noise2, jitter=1e-10):
        self.xs, self.k, n = xs, k, len(xs)
        kk = kmat(xs, xs, k)
        for i in range(n):
            kk[i][i] += noise2 + jitter
        self.low = cholesky(kk)
        self.alpha = chol_solve(self.low, ys)
        self.lml = (-0.5 * sum(y * a for y, a in zip(ys, self.alpha))
                    - sum(math.log(self.low[i][i]) for i in range(n))
                    - 0.5 * n * math.log(2 * math.pi))

    def predict(self, x):
        ks = [self.k(x, xi) for xi in self.xs]
        v = solve_lower(self.low, ks)
        return sum(a * b for a, b in zip(ks, self.alpha)), max(self.k(x, x) - sum(t * t for t in v), 0.0)


def sample_prior(xs, k, rng, jitter=1e-8):
    kk = kmat(xs, xs, k)
    for i in range(len(xs)):
        kk[i][i] += jitter
    low = cholesky(kk)
    z = [rng.gauss(0, 1) for _ in xs]
    return [sum(low[i][t] * z[t] for t in range(i + 1)) for i in range(len(xs))]


def rmse(a, b):
    return math.sqrt(sum((u - v) ** 2 for u, v in zip(a, b)) / len(a))


def main():
    rng = random.Random(20261010)
    k1 = rbf(1.0)
    f = lambda x: math.sin(x) + 0.3 * math.sin(3 * x)
    xs = sorted(rng.uniform(0, 10) for _ in range(30))
    ys = [f(x) for x in xs]
    grid = [i / 5 for i in range(51)]

    # (1) noise-free interpolation
    gp0 = GP(xs, ys, k1, 0.0, jitter=1e-10)
    pred0 = [gp0.predict(x) for x in xs]
    interp_err = max(abs(m - y) for (m, _), y in zip(pred0, ys))
    interp_var = max(v for _, v in pred0)
    assert interp_err < 1e-5 and interp_var < 1e-5, (interp_err, interp_var)

    # (2) kernel ridge regression by Gauss-Jordan equals the GP mean
    noise2 = 0.04
    yn = [y + 0.2 * rng.gauss(0, 1) for y in ys]
    gp = GP(xs, yn, k1, noise2)
    kk = kmat(xs, xs, k1)
    for i in range(len(xs)):
        kk[i][i] += noise2
    kinv = inverse(kk)
    krr_alpha = [sum(kinv[i][j] * yn[j] for j in range(len(xs))) for i in range(len(xs))]
    krr_diff = max(abs(a - b) for a, b in zip(krr_alpha, gp.alpha))
    assert krr_diff < 1e-7, krr_diff

    # (3) weight-space Bayesian linear regression == GP with the feature kernel
    phi = lambda x: [1.0, x / 10, (x / 10) ** 2]
    klin = lambda a, b: sum(p * q for p, q in zip(phi(a), phi(b)))
    ynoisy = [y + 0.2 * rng.gauss(0, 1) for y in ys]
    gpl = GP(xs, ynoisy, klin, noise2, jitter=0.0)
    amat = [[sum(phi(x)[i] * phi(x)[j] for x in xs) / noise2 + (1.0 if i == j else 0.0) for j in range(3)] for i in range(3)]
    ainv = inverse(amat)
    phy = [sum(phi(x)[i] * y for x, y in zip(xs, ynoisy)) / noise2 for i in range(3)]
    wmean = [sum(ainv[i][j] * phy[j] for j in range(3)) for i in range(3)]
    blr_mean_diff = blr_var_diff = 0.0
    for x in grid:
        p = phi(x)
        m_w = sum(p[i] * wmean[i] for i in range(3))
        v_w = sum(p[i] * ainv[i][j] * p[j] for i in range(3) for j in range(3))
        m_f, v_f = gpl.predict(x)
        blr_mean_diff = max(blr_mean_diff, abs(m_w - m_f))
        blr_var_diff = max(blr_var_diff, abs(v_w - v_f))
    assert blr_mean_diff < 1e-7 and blr_var_diff < 1e-7, (blr_mean_diff, blr_var_diff)

    # (4) random Fourier features converge to the exact RBF posterior
    exact = [gp.predict(x)[0] for x in grid]
    rff_rows = []
    for d in (50, 200, 800, 3200):
        omegas = [rng.gauss(0, 1.0) for _ in range(d)]
        phases = [rng.uniform(0, 2 * math.pi) for _ in range(d)]
        sc = math.sqrt(2.0 / d)
        feats = {x: [sc * math.cos(w * x + b) for w, b in zip(omegas, phases)] for x in set(xs) | set(grid)}
        kt = lambda a, b, fe=feats: sum(p * q for p, q in zip(fe[a], fe[b]))
        kerr = sum(abs(kt(a, b) - k1(a, b)) for a in xs for b in xs) / (len(xs) ** 2)
        gpr = GP(xs, yn, kt, noise2)
        rff_rows.append((d, kerr, rmse([gpr.predict(x)[0] for x in grid], exact)))
    assert rff_rows[-1][2] < rff_rows[0][2] / 3 and rff_rows[-1][1] < rff_rows[0][1] / 3, rff_rows

    # (5) calibration on functions drawn from the prior
    sigma = 0.2
    cover_f, cover_y, draws = [], [], 150
    for _ in range(draws):
        fs = sample_prior(grid, k1, rng)
        idx = rng.sample(range(len(grid)), 20)
        test = [i for i in range(len(grid)) if i not in set(idx)]
        g = GP([grid[i] for i in idx], [fs[i] + sigma * rng.gauss(0, 1) for i in idx], k1, sigma * sigma)
        cf = cy = 0
        for i in test:
            m, v = g.predict(grid[i])
            cf += abs(fs[i] - m) <= 1.96 * math.sqrt(v)
            cy += abs(fs[i] + sigma * rng.gauss(0, 1) - m) <= 1.96 * math.sqrt(v + sigma * sigma)
        cover_f.append(cf / len(test))
        cover_y.append(cy / len(test))
    cov = sum(cover_f) / draws
    se = math.sqrt(sum((c - cov) ** 2 for c in cover_f) / (draws - 1) / draws)
    covy = sum(cover_y) / draws
    assert abs(cov - 0.95) < 3 * se + 0.01 and abs(covy - 0.95) < 3 * se + 0.01, (cov, covy, se)

    # (6) log marginal likelihood: Cholesky route == direct formula; recovery of the length scale
    small = xs[:8]
    gs = GP(small, ynoisy[:8], k1, noise2, jitter=0.0)
    ks = kmat(small, small, k1)
    for i in range(8):
        ks[i][i] += noise2
    ki = inverse(ks)
    quad = sum(ynoisy[i] * ki[i][j] * ynoisy[j] for i in range(8) for j in range(8))
    lml_direct = -0.5 * quad - 0.5 * math.log(determinant(ks)) - 4 * math.log(2 * math.pi)
    assert abs(lml_direct - gs.lml) < 1e-8, (lml_direct, gs.lml)
    ells = [0.1, 0.2, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0, 2.8, 4.0, 8.0]
    picks, near, err_rows = [], 0, {0.1: [], "ml": [], 8.0: [], "knn": []}
    for _ in range(30):
        fs = sample_prior(grid, k1, rng)
        idx = rng.sample(range(len(grid)), 30)
        test = [i for i in range(len(grid)) if i not in set(idx)]
        tx, ty = [grid[i] for i in idx], [fs[i] + sigma * rng.gauss(0, 1) for i in idx]
        fits = {e: GP(tx, ty, rbf(e), sigma * sigma) for e in ells}
        best = max(ells, key=lambda e: fits[e].lml)
        picks.append(best)
        near += 0.7 <= best <= 1.4
        truth = [fs[i] for i in test]
        for key, e in ((0.1, 0.1), ("ml", best), (8.0, 8.0)):
            err_rows[key].append(rmse([fits[e].predict(grid[i])[0] for i in test], truth))
        knn = []
        for i in test:
            nb = sorted(range(30), key=lambda j: abs(tx[j] - grid[i]))[:3]
            knn.append(sum(ty[j] for j in nb) / 3)
        err_rows["knn"].append(rmse(knn, truth))
    gmean = math.exp(sum(math.log(p) for p in picks) / len(picks))
    mean_err = {key: sum(v) / len(v) for key, v in err_rows.items()}
    assert 0.6 < gmean < 1.6 and near >= 20, (gmean, near)
    assert mean_err["ml"] < mean_err["knn"] < mean_err[0.1] and mean_err["ml"] < mean_err[8.0], mean_err
    # AUTHOR CORRECTION slot: ordering of the knn baseline against the huge length scale is measured, not assumed.

    # (7) cost: n cubed, and the sparse DTC approximation
    times = []
    for n in (40, 80, 160, 320):
        tx = [rng.uniform(0, 10) for _ in range(n)]
        ty = [f(x) + 0.2 * rng.gauss(0, 1) for x in tx]
        t0 = time.perf_counter()
        GP(tx, ty, k1, noise2)
        times.append((n, time.perf_counter() - t0))
    slope = math.log(times[3][1] / times[2][1]) / math.log(2)
    hours_10k = times[3][1] * (10000 / 320) ** 3 / 3600
    assert slope > 2.0, slope
    n_big = 200
    bx = sorted(rng.uniform(0, 10) for _ in range(n_big))
    by = [f(x) + 0.2 * rng.gauss(0, 1) for x in bx]
    gbig = GP(bx, by, k1, noise2)
    exact_big = [gbig.predict(x)[0] for x in grid]
    sparse_rows = []
    for m in (5, 10, 20, 40):
        z = [10 * (i + 0.5) / m for i in range(m)]
        kmm = kmat(z, z, k1)
        kmn = kmat(z, bx, k1)
        q = [[kmm[i][j] + sum(kmn[i][t] * kmn[j][t] for t in range(n_big)) / noise2 for j in range(m)] for i in range(m)]
        for i in range(m):
            q[i][i] += 1e-9
        rhs = [sum(kmn[i][t] * by[t] for t in range(n_big)) / noise2 for i in range(m)]
        am = chol_solve(cholesky(q), rhs)
        approx = [sum(k1(x, zj) * a for zj, a in zip(z, am)) for x in grid]
        sparse_rows.append((m, rmse(approx, exact_big), n_big * m * m / (n_big ** 3 / 6)))
    assert sparse_rows[-1][1] < sparse_rows[0][1] / 5, sparse_rows

    print("Gaussian process regression x RBF kernel (1-D, pure Python)")
    print(f"interpolation: max |mean - y| {interp_err:.1e}, max var {interp_var:.1e}; KRR vs GP alpha {krr_diff:.1e}")
    print(f"weight space vs function space (quadratic features): mean {blr_mean_diff:.1e}, var {blr_var_diff:.1e}")
    for d, ke, pe in rff_rows:
        print(f"RFF D={d:5d}: kernel error {ke:.4f}, posterior mean RMSE vs exact {pe:.4f}")
    print(f"calibration: latent 95% interval covers {cov:.4f} +- {se:.4f}, noisy {covy:.4f} ({draws} draws, 31 test points each)")
    print(f"LML Cholesky {gs.lml:.6f} vs direct {lml_direct:.6f}; length scale recovered: geometric mean {gmean:.3f}, {near}/30 within one grid step of 1.0")
    print(f"held-out RMSE: ell=0.1 {mean_err[0.1]:.3f}, ML ell {mean_err['ml']:.3f}, ell=8 {mean_err[8.0]:.3f}, 3-NN {mean_err['knn']:.3f}")
    print("fit time: " + ", ".join(f"n={n} {t*1000:.0f} ms" for n, t in times) + f"; slope {slope:.2f} (160 to 320); n=10,000 extrapolates to {hours_10k:.1f} h at this pace")
    for m, e, ratio in sparse_rows:
        print(f"DTC m={m:2d}: RMSE vs exact GP (n=200) {e:.1e}, work ratio {ratio:.3f}")
    print(f"OK: noise-free interpolation exact to {interp_err:.0e}; GP mean equals kernel ridge to {krr_diff:.0e} and the weight-space posterior to {max(blr_mean_diff, blr_var_diff):.0e}; "
          f"random Fourier features shrink the posterior error from {rff_rows[0][2]:.3f} to {rff_rows[-1][2]:.3f} between D = {rff_rows[0][0]} and {rff_rows[-1][0]}; "
          f"the 95% interval covered {cov:.3f} +- {se:.3f} of latent values over {draws} prior draws; the Cholesky marginal likelihood matches the direct formula to 1e-8 and its maximum recovers the length scale "
          f"(geometric mean {gmean:.2f}, {near} of 30 within a grid step); held-out RMSE {mean_err['ml']:.3f} at the ML length scale against {mean_err[0.1]:.3f} at 0.1, {mean_err[8.0]:.3f} at 8, and {mean_err['knn']:.3f} for 3-NN; "
          f"fit time slope {slope:.2f} from n = 160 to 320 ({hours_10k:.1f} hours at n = 10,000); DTC with {sparse_rows[2][0]} inducing points is within {sparse_rows[2][1]:.0e} of the exact n = 200 posterior at {sparse_rows[2][2]:.2f} of the work")


if __name__ == "__main__":
    main()
