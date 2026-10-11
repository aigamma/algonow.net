"""Ordinary least squares x Normal equations (puzzle 211).

(X^T X) b = X^T y by Cholesky, held against Householder QR, the exact
Gauss-Markov formulas over 400 seeds, Jacobi condition numbers on a
Vandermonde design (kappa squared until a non-positive pivot), Lauchli's
matrix, ridge, flop counts, gradient descent, Theil-Sen, and Huber.
Pure Python, seeded, every number printed. Author corrections at the end.
"""
import math
import random
import time

OPS = {'n': 0}


def flops(k):
    OPS['n'] += k


def xtx(X):
    n, p = len(X), len(X[0])
    G = [[0.0] * p for _ in range(p)]
    for row in X:
        for i in range(p):
            ri = row[i]
            for j in range(i, p):
                G[i][j] += ri * row[j]
    for i in range(p):
        for j in range(i):
            G[i][j] = G[j][i]
    flops(n * p * (p + 1) // 2)
    return G


def xty(X, y):
    p = len(X[0])
    v = [0.0] * p
    for row, yi in zip(X, y):
        for i in range(p):
            v[i] += row[i] * yi
    flops(len(X) * p)
    return v


def cholesky(G):
    p = len(G)
    L = [[0.0] * p for _ in range(p)]
    for i in range(p):
        for j in range(i + 1):
            s = G[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                if s <= 0:
                    raise ArithmeticError('pivot %.2e at %d' % (s, i))
                L[i][i] = math.sqrt(s)
            else:
                L[i][j] = s / L[j][j]
    flops(p ** 3 // 6)
    return L


def chol_solve(L, b):
    p = len(L)
    z = [0.0] * p
    for i in range(p):
        z[i] = (b[i] - sum(L[i][k] * z[k] for k in range(i))) / L[i][i]
    x = [0.0] * p
    for i in reversed(range(p)):
        x[i] = (z[i] - sum(L[k][i] * x[k] for k in range(i + 1, p))) / L[i][i]
    flops(2 * p * p)
    return x


def normal_eq(X, y, lam=0.0):
    G = xtx(X)
    for i in range(1, len(G)):
        G[i][i] += lam  # the intercept is never penalized
    return chol_solve(cholesky(G), xty(X, y))


def inverse_spd(G):
    L = cholesky(G)
    p = len(G)
    return [chol_solve(L, [float(i == j) for i in range(p)]) for j in range(p)]  # symmetric


def qr_solve(X, y):
    """Householder QR; returns the least squares solution."""
    n, p = len(X), len(X[0])
    A = [row[:] for row in X]
    b = y[:]
    for k in range(p):
        norm = math.sqrt(sum(A[i][k] ** 2 for i in range(k, n)))
        if norm == 0:
            raise ArithmeticError('rank deficient')
        alpha = -norm if A[k][k] >= 0 else norm
        v = [0.0] * n
        v[k] = A[k][k] - alpha
        for i in range(k + 1, n):
            v[i] = A[i][k]
        vn = sum(v[i] * v[i] for i in range(k, n))
        for j in range(k, p):
            s = 2 * sum(v[i] * A[i][j] for i in range(k, n)) / vn
            for i in range(k, n):
                A[i][j] -= s * v[i]
        s = 2 * sum(v[i] * b[i] for i in range(k, n)) / vn
        for i in range(k, n):
            b[i] -= s * v[i]
        flops(2 * (n - k) * (p - k + 1) + 2 * (n - k))
    beta = [0.0] * p
    for i in reversed(range(p)):
        beta[i] = (b[i] - sum(A[i][j] * beta[j] for j in range(i + 1, p))) / A[i][i]
    return beta


def sym_eigs(G, sweeps=80):
    """Cyclic Jacobi eigenvalues of a symmetric matrix."""
    A = [r[:] for r in G]
    p = len(A)
    for _ in range(sweeps):
        for i in range(p):
            for j in range(i + 1, p):
                if A[i][j] == 0:
                    continue
                th = (A[j][j] - A[i][i]) / (2 * A[i][j])
                t = (1 if th >= 0 else -1) / (abs(th) + math.sqrt(th * th + 1))
                c = 1 / math.sqrt(t * t + 1)
                s = t * c
                for k in range(p):
                    aik, ajk = A[i][k], A[j][k]
                    A[i][k], A[j][k] = c * aik - s * ajk, s * aik + c * ajk
                for k in range(p):
                    aki, akj = A[k][i], A[k][j]
                    A[k][i], A[k][j] = c * aki - s * akj, s * aki + c * akj
    return sorted(A[i][i] for i in range(p))


def singular_values(X, sweeps=80):
    """Hestenes one-sided Jacobi: rotate column pairs to orthogonality."""
    U = [r[:] for r in X]
    n, p = len(U), len(U[0])
    for _ in range(sweeps):
        rotated = False
        for i in range(p):
            for j in range(i + 1, p):
                a = sum(U[k][i] ** 2 for k in range(n))
                b = sum(U[k][j] ** 2 for k in range(n))
                g = sum(U[k][i] * U[k][j] for k in range(n))
                if g == 0 or abs(g) <= 1e-15 * math.sqrt(a * b):
                    continue
                rotated = True
                z = (b - a) / (2 * g)
                t = (1 if z >= 0 else -1) / (abs(z) + math.sqrt(1 + z * z))
                c = 1 / math.sqrt(1 + t * t)
                s = c * t
                for k in range(n):
                    ui, uj = U[k][i], U[k][j]
                    U[k][i], U[k][j] = c * ui - s * uj, s * ui + c * uj
        if not rotated:
            break
    return sorted(math.sqrt(sum(U[k][j] ** 2 for k in range(n))) for j in range(p))


def predict(X, b):
    return [sum(xi * bi for xi, bi in zip(row, b)) for row in X]


def mean(v):
    return sum(v) / len(v)


def median(v):
    s = sorted(v)
    m = len(s) // 2
    return s[m] if len(s) % 2 else 0.5 * (s[m - 1] + s[m])


def theil_sen(x, y):
    slopes = [(y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x)) if x[j] != x[i]]
    b1 = median(slopes)
    return median([yi - b1 * xi for xi, yi in zip(x, y)]), b1


def huber(X, y, iters=40, k=1.345):  # M-estimate by reweighted least squares
    b = normal_eq(X, y)
    for _ in range(iters):
        r = [yi - fi for yi, fi in zip(y, predict(X, b))]
        scale = median([abs(ri) for ri in r]) / 0.6745 or 1e-12
        w = [min(1.0, k * scale / abs(ri)) if ri else 1.0 for ri in r]
        Xw = [[math.sqrt(wi) * v for v in row] for wi, row in zip(w, X)]
        yw = [math.sqrt(wi) * yi for wi, yi in zip(w, y)]
        b = normal_eq(Xw, yw)
    return b


def main():
    t0 = time.time()
    rng = random.Random(211)
    oks = 0

    def check(cond, msg):
        nonlocal oks
        assert cond, msg
        oks += 1

    # 1 + 2  well conditioned: fixed design, 400 noise draws
    n, p, sigma = 200, 4, 1.0
    beta = [1.5, -2.0, 0.7, 3.0]
    X = [[1.0] + [rng.gauss(0, 1) for _ in range(p - 1)] for _ in range(n)]
    G = xtx(X)
    Ginv = inverse_spd(G)
    S, seeds = 400, []
    cover = 0
    for s in range(S):
        r = random.Random(1000 + s)
        y = [f + r.gauss(0, sigma) for f in predict(X, beta)]
        b = normal_eq(X, y)
        if s == 0:
            bq = qr_solve(X, y)
            gap = max(abs(u - v) for u, v in zip(b, bq))
            res = [yi - fi for yi, fi in zip(y, predict(X, b))]
            orth = max(abs(v) for v in xty(X, res))
        rss = sum((yi - fi) ** 2 for yi, fi in zip(y, predict(X, b)))
        s2 = rss / (n - p)
        for j in range(p):
            se = math.sqrt(s2 * Ginv[j][j])
            cover += abs(b[j] - beta[j]) <= 1.96 * se
        seeds.append(b)
    cov = cover / (S * p)
    means = [mean([b[j] for b in seeds]) for j in range(p)]
    evar = [sum((b[j] - means[j]) ** 2 for b in seeds) / (S - 1) for j in range(p)]
    tvar = [sigma ** 2 * Ginv[j][j] for j in range(p)]
    zs = [abs(means[j] - beta[j]) / math.sqrt(tvar[j] / S) for j in range(p)]
    ratios = [evar[j] / tvar[j] for j in range(p)]
    print('n=%d p=%d: |Cholesky - QR| %.1e, |X^T r| %.1e' % (n, p, gap, orth))
    print('  z-scores %s; variance ratios %s; 95%% coverage %.4f (SE %.4f)' % (
        ' '.join('%.2f' % z for z in zs), ' '.join('%.3f' % q for q in ratios), cov, math.sqrt(cov * (1 - cov) / (S * p))))
    check(gap < 1e-10, gap)
    check(orth < 1e-9, orth)
    check(max(zs) < 3, zs)
    check(all(0.75 < q < 1.25 for q in ratios), ratios)
    check(0.925 <= cov <= 0.975, cov)

    # 3  Vandermonde conditioning
    m = 50
    xs = [i / (m - 1) for i in range(m)]
    print('Vandermonde on [0,1], %d points, exact data' % m)
    fail_deg = None
    table = {}
    kap_sq_ok = 0
    for d in range(2, 15):
        V = [[x ** j for j in range(d + 1)] for x in xs]
        bt = [(-1) ** j for j in range(d + 1)]
        y = predict(V, bt)
        sv = singular_values(V)
        kx = sv[-1] / sv[0]
        ev = sym_eigs(xtx(V))
        kg = ev[-1] / ev[0] if ev[0] > 0 else float('inf')
        eq = max(abs(u - v) for u, v in zip(qr_solve(V, y), bt))
        try:
            ec = max(abs(u - v) for u, v in zip(normal_eq(V, y), bt))
            ecs = '%.1e' % ec
        except ArithmeticError as e:
            ec = float('inf')
            ecs = 'FAIL (' + str(e) + ')'
            if fail_deg is None:
                fail_deg = d
        if kx * kx < 1e14:
            check(abs(kg / kx ** 2 - 1) < 0.05, (d, kg, kx * kx))
            kap_sq_ok += 1
        table[d] = (kx, kg, ec, eq)
        if d in (4, 6, 8, 10, 12, 14):
            print('  d=%2d kappa(X) %.1e kappa^2 %.1e seen %.1e  Cholesky %s  QR %.1e' % (d, kx, kx * kx, kg, ecs, eq))
    check(fail_deg is not None, 'Cholesky never failed')
    check(all(table[d][2] > table[d][3] for d in (6, 8)), 'Cholesky should be worse than QR at d=6,8')
    check(table[fail_deg - 1][3] < 1e-3 and table[12][3] < 1, 'QR survives past the Cholesky wall')
    print('  kappa(X^T X) = kappa(X)^2 within 5%% on %d degrees; Cholesky fails at degree %d where QR errs %.1e' % (kap_sq_ok, fail_deg, table[fail_deg][3]))

    # Lauchli
    eps = 1e-8
    Lx = [[1.0, 1.0, 1.0], [eps, 0, 0], [0, eps, 0], [0, 0, eps]]
    bl = [1.0, 2.0, 3.0]
    yl = predict(Lx, bl)
    eql = max(abs(u - v) for u, v in zip(qr_solve(Lx, yl), bl))
    try:
        normal_eq(Lx, yl)
        lauchli = 'solved (unexpected)'
        lfail = False
    except ArithmeticError as e:
        lauchli = 'Cholesky FAIL (' + str(e) + ')'
        lfail = True
    print('  Lauchli eps=%.0e: QR error %.1e; %s; kappa(X) %.1e' % (eps, eql, lauchli, singular_values(Lx)[-1] / singular_values(Lx)[0]))
    check(lfail and eql < 1e-6, (lfail, eql))

    # 4  ridge on a near-collinear design
    nr, R = 100, 300
    rr = random.Random(4)
    x1 = [rr.gauss(0, 1) for _ in range(nr)]
    Xc = [[1.0, a, a + 0.01 * rr.gauss(0, 1)] for a in x1]
    bc = [1.0, 2.0, -1.0]
    fc = predict(Xc, bc)
    err = {'ols': [], 'ridge': []}
    bias = [0.0, 0.0]
    for s in range(R):
        r = random.Random(5000 + s)
        y = [f + r.gauss(0, 1) for f in fc]
        bo = normal_eq(Xc, y)
        br = normal_eq(Xc, y, lam=1.0)
        err['ols'].append(math.sqrt(sum((bo[j] - bc[j]) ** 2 for j in (1, 2))))
        err['ridge'].append(math.sqrt(sum((br[j] - bc[j]) ** 2 for j in (1, 2))))
        bias[0] += (br[1] - bc[1]) / R
        bias[1] += (br[2] - bc[2]) / R
    ro, rrg = mean(err['ols']), mean(err['ridge'])
    x2 = [row[2] for row in Xc]
    corr = sum(a * b for a, b in zip(x1, x2)) / math.sqrt(sum(a * a for a in x1) * sum(b * b for b in x2))
    print('ridge, correlation %.4f: coefficient RMSE OLS %.2f, ridge(lambda=1) %.2f, bias %+.2f %+.2f' % (corr, ro, rrg, bias[0], bias[1]))
    check(rrg < ro / 5 and max(abs(v) for v in bias) > 0.05, (ro, rrg, bias))

    # 5  flop counts, n >> p
    nb, pb = 4000, 6
    rb = random.Random(6)
    Xb = [[1.0] + [rb.gauss(0, 1) for _ in range(pb - 1)] for _ in range(nb)]
    yb = [rb.gauss(0, 1) for _ in range(nb)]
    OPS['n'] = 0
    t1 = time.time()
    b_ne = normal_eq(Xb, yb)
    f_ne, t_ne = OPS['n'], time.time() - t1
    OPS['n'] = 0
    t1 = time.time()
    b_qr = qr_solve(Xb, yb)
    f_qr, t_qr = OPS['n'], time.time() - t1
    print('cost n=%d p=%d: normal equations %s flops %.2f s, QR %s flops %.2f s, ratio %.2f, agree %.1e' % (
        nb, pb, format(f_ne, ','), t_ne, format(f_qr, ','), t_qr, f_qr / f_ne, max(abs(u - v) for u, v in zip(b_ne, b_qr))))
    check(1.8 < f_qr / f_ne < 3.5, f_qr / f_ne)

    # 6a gradient descent on the degree-6 design
    d = 6
    V = [[x ** j for j in range(d + 1)] for x in xs]
    bt = [(-1) ** j for j in range(d + 1)]
    y = predict(V, bt)
    direct = max(abs(u - v) for u, v in zip(qr_solve(V, y), bt))

    def gd(Xg, yg, iters):
        Gg = xtx(Xg)
        lam_max = sym_eigs(Gg)[-1]
        lam_min = sym_eigs(Gg)[0]
        g0 = xty(Xg, yg)
        b = [0.0] * len(Gg)
        step = 1 / lam_max
        for _ in range(iters):
            grad = [sum(Gg[i][j] * b[j] for j in range(len(b))) - g0[i] for i in range(len(b))]
            b = [bi - step * gi for bi, gi in zip(b, grad)]
        return b, lam_max / lam_min

    bg, kg = gd(V, y, 5000)
    eg = max(abs(u - v) for u, v in zip(bg, bt))
    egf = max(abs(u - v) for u, v in zip(predict(V, bg), y))
    mu = [mean([row[j] for row in V]) for j in range(d + 1)]
    sd = [math.sqrt(mean([(row[j] - mu[j]) ** 2 for row in V])) or 1.0 for j in range(d + 1)]
    Vs = [[1.0] + [(row[j] - mu[j]) / sd[j] for j in range(1, d + 1)] for row in V]
    bgs, kgs = gd(Vs, y, 5000)
    egs = max(abs(u - v) for u, v in zip(predict(Vs, bgs), y))
    print('gradient descent, degree %d, 5,000 steps: raw kappa %.1e, coefficient error %.2f, fit error %.1e (direct %.1e); standardized kappa %.1e, fit %.1e' % (
        d, kg, eg, egf, direct, kgs, egs))
    check(kgs > kg / 10, (kgs, kg))
    check(eg > 0.1 and direct < 1e-6, (eg, direct))

    # 6b one outlier
    no = 60
    r7 = random.Random(7)
    xo = [10 * i / (no - 1) for i in range(no)]
    yo = [1 + 2 * xi + r7.gauss(0, 0.5) for xi in xo]
    Xo = [[1.0, xi] for xi in xo]
    clean = normal_eq(Xo, yo)
    yb = yo[:]
    yb[-3] += 40
    dirty = normal_eq(Xo, yb)
    ts_c, ts_d = theil_sen(xo, yo), theil_sen(xo, yb)
    hu_c, hu_d = huber(Xo, yo), huber(Xo, yb)
    sh = (abs(dirty[1] - clean[1]), abs(ts_d[1] - ts_c[1]), abs(hu_d[1] - hu_c[1]))
    print('one outlier (+40 at x=%.1f of %d points): slope shift OLS %.3f, Theil-Sen %.3f, Huber %.3f' % (xo[-3], no, sh[0], sh[1], sh[2]))
    check(sh[0] > 5 * max(sh[1], sh[2]), sh)

    el = time.time() - t0
    print('OK: Cholesky = QR to %.0e, |X^T r| %.0e; %d seeds: max z %.2f, variance ratios %.2f-%.2f, 95%% coverage %.3f; kappa(X^T X) = kappa(X)^2 on %d degrees, Cholesky fails at degree %d (QR %.0e), Lauchli fails Cholesky (QR %.0e); ridge RMSE %.2f -> %.2f at bias %.2f; QR %.2fx the flops at n=%d p=%d; gradient descent off %.2f after 5,000 steps; outlier slope shift OLS %.3f vs Theil-Sen %.3f, Huber %.3f; %d checks, %.1f s' % (
        gap, orth, S, max(zs), min(ratios), max(ratios), cov, kap_sq_ok, fail_deg, table[fail_deg][3], eql, ro, rrg, max(abs(v) for v in bias), f_qr / f_ne, nb, pb, eg, sh[0], sh[1], sh[2], oks, el))


if __name__ == '__main__':
    main()

# AUTHOR CORRECTIONS (the measurement won, the page follows it)
# 1. Standardizing the columns was expected to rescue gradient descent on
#    the degree-6 monomial design; kappa(X^T X) only fell 3.9e8 -> 9.8e7 and
#    the fit stayed 1e-2 off after 5,000 steps. Centered monomials remain
#    nearly collinear; an orthogonal basis or QR is the real fix.
# 2. The Cholesky wall was guessed at degree 10 (kappa^2 4e14); it solved
#    there (error 1.4e-3) and the first non-positive pivot came at degree 12.
