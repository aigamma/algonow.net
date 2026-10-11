"""Mean-variance optimization x Markowitz frontier (puzzle 219).

Markowitz (1952): minimize variance for a target return. The frontier is a
hyperbola with closed-form weights (Merton 1972); two funds span it; the
tangency portfolio maximizes Sharpe. Pure Python, own linear algebra.
Oracles: KKT solves vs the closed form; two-fund separation on random
covariances; tangency vs a dense grid; exact long-only frontier vs a simplex
grid; estimation error over simulated windows vs 1/N and the truth.

AUTHOR CORRECTIONS (the measurement won): (1) the draft expected the plug-in
tangency portfolio to catch 1/N by 120 months; it did not (0.150 vs 0.205,
truth 0.212), so the page says it trails 1/N at every window; (2) the draft
guessed plug-in weights of "about 3x" at 60 months; measured 2.2 at 60, 2.4
at 24, 1.7 at 120.
"""
import math
import random
import time

T0 = time.time()
rng = random.Random(20261010)


# ---------------------------------------------------------------- linear algebra
def solve(M, b):
    """Gauss-Jordan with partial pivoting; returns x with M x = b."""
    n = len(M)
    A = [row[:] + [b[i]] for i, row in enumerate(M)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(A[r][c]))
        A[c], A[p] = A[p], A[c]
        piv = A[c][c]
        if abs(piv) < 1e-14:
            raise ZeroDivisionError('singular system')
        A[c] = [v / piv for v in A[c]]
        for r in range(n):
            if r != c and A[r][c] != 0.0:
                f = A[r][c]
                A[r] = [rv - f * cv for rv, cv in zip(A[r], A[c])]
    return [A[i][n] for i in range(n)]


def matvec(M, v):
    return [sum(a * b for a, b in zip(row, v)) for row in M]


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def quad(w, S):
    return dot(w, matvec(S, w))


def cholesky(S):
    n = len(S)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = S[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            L[i][j] = math.sqrt(s) if i == j else s / L[j][j]
    return L


def random_cov(n, scale=0.04):
    """A A^T plus a ridge, scaled: positive definite by construction."""
    A = [[rng.gauss(0, 1) for _ in range(n)] for _ in range(n)]
    S = [[sum(A[i][k] * A[j][k] for k in range(n)) / n for j in range(n)] for i in range(n)]
    for i in range(n):
        S[i][i] += 0.3
    return [[v * scale for v in row] for row in S]


# ---------------------------------------------------------------- the frontier
class Frontier:
    """Closed-form Markowitz frontier (budget constraint only, shorts allowed)."""

    def __init__(self, mu, S):
        n = len(mu)
        ones = [1.0] * n
        self.mu, self.S, self.n = mu, S, n
        self.Si1 = solve(S, ones)
        self.Simu = solve(S, mu)
        self.A = dot(ones, self.Si1)
        self.B = dot(ones, self.Simu)
        self.C = dot(mu, self.Simu)
        self.D = self.A * self.C - self.B * self.B

    def weights(self, m):
        g = (self.C - self.B * m) / self.D
        h = (self.A * m - self.B) / self.D
        return [g * a + h * b for a, b in zip(self.Si1, self.Simu)]

    def variance(self, m):
        return (self.A * m * m - 2 * self.B * m + self.C) / self.D

    def gmv(self):
        return [v / self.A for v in self.Si1], self.B / self.A, 1.0 / self.A

    def tangency(self, rf):
        ex = solve(self.S, [x - rf for x in self.mu])
        s = sum(ex)
        return [v / s for v in ex]


def kkt_weights(mu, S, m):
    """Numerical frontier point: minimize w'Sw s.t. 1'w = 1, mu'w = m."""
    n = len(mu)
    M = [[2 * S[i][j] for j in range(n)] + [1.0, mu[i]] for i in range(n)]
    M.append([1.0] * n + [0.0, 0.0])
    M.append(mu[:] + [0.0, 0.0])
    return solve(M, [0.0] * n + [1.0, m])[:n]


def long_only(mu, S, m):
    """Exact long-only frontier point: the optimum solves the equality QP on
    its own support, so enumerate supports and keep the feasible minimum."""
    n = len(mu)
    best = (math.inf, None)
    for mask in range(1, 1 << n):
        idx = [i for i in range(n) if mask >> i & 1]
        if len(idx) == 1:
            w = [0.0] * n
            w[idx[0]] = 1.0
            if abs(mu[idx[0]] - m) > 1e-9:
                continue
        else:
            sub_mu = [mu[i] for i in idx]
            sub_S = [[S[i][j] for j in idx] for i in idx]
            try:
                ws = kkt_weights(sub_mu, sub_S, m)
            except ZeroDivisionError:
                continue
            if min(ws) < -1e-9:
                continue
            w = [0.0] * n
            for k, i in enumerate(idx):
                w[i] = max(ws[k], 0.0)
        v = quad(w, S)
        if v < best[0]:
            best = (v, w)
    return best


def simplex_grid(n, steps):
    """All weight vectors on the simplex with coordinates in multiples of 1/steps."""
    out = []

    def rec(prefix, left, k):
        if k == n - 1:
            out.append([p / steps for p in prefix] + [left / steps])
            return
        for a in range(left + 1):
            rec(prefix + [a], left - a, k + 1)
    rec([], steps, 0)
    return out


# ---------------------------------------------------------------- 1. closed form
n = 5
mu = [0.010, 0.014, 0.007, 0.012, 0.009]
S = [[0.0040, 0.0012, 0.0004, 0.0016, 0.0006],
     [0.0012, 0.0070, 0.0008, 0.0025, 0.0010],
     [0.0004, 0.0008, 0.0016, 0.0005, 0.0003],
     [0.0016, 0.0025, 0.0005, 0.0060, 0.0012],
     [0.0006, 0.0010, 0.0003, 0.0012, 0.0030]]
F = Frontier(mu, S)
w_gmv, mu_gmv, var_gmv = F.gmv()
grid = [mu_gmv - 0.004 + 0.0002 * k for k in range(81)]
kkt_gap = 0.0
hyp_gap = 0.0
for m in grid:
    w1, w2 = kkt_weights(mu, S, m), F.weights(m)
    kkt_gap = max(kkt_gap, max(abs(a - b) for a, b in zip(w1, w2)))
    hyp_gap = max(hyp_gap, abs(quad(w1, S) - F.variance(m)))
    assert abs(sum(w1) - 1) < 1e-10 and abs(dot(w1, mu) - m) < 1e-10
assert kkt_gap < 1e-10 and hyp_gap < 1e-14, (kkt_gap, hyp_gap)
assert abs(sum(w_gmv) - 1) < 1e-12 and abs(quad(w_gmv, S) - var_gmv) < 1e-15
# the GMV is the vertex: every other frontier point has more variance
assert all(F.variance(m) >= var_gmv - 1e-18 for m in grid)
print(f"KKT vs closed form, 81 targets: weight gap {kkt_gap:.1e}, variance vs hyperbola {hyp_gap:.1e}")
print(f"A {F.A:.1f} B {F.B:.2f} C {F.C:.4f} D {F.D:.2f}; GMV {mu_gmv * 100:.3f}%/mo, sd {math.sqrt(var_gmv) * 100:.3f}%")

# ---------------------------------------------------------------- 2. two-fund separation
two_fund_gap = 0.0
for trial in range(50):
    k = rng.choice([3, 4, 5, 6])
    mu_r = [rng.uniform(0.002, 0.02) for _ in range(k)]
    S_r = random_cov(k, scale=0.005)
    Fr = Frontier(mu_r, S_r)
    g, mg, _ = Fr.gmv()
    t = Fr.tangency(0.001)
    mt = dot(t, mu_r)
    for _ in range(4):
        m = rng.uniform(mg - 0.01, mg + 0.02)
        a = (m - mt) / (mg - mt)  # alpha on GMV, 1 - alpha on tangency
        combo = [a * gi + (1 - a) * ti for gi, ti in zip(g, t)]
        two_fund_gap = max(two_fund_gap, max(abs(x - y) for x, y in zip(combo, Fr.weights(m))))
        two_fund_gap = max(two_fund_gap, abs(quad(combo, S_r) - Fr.variance(m)))
assert two_fund_gap < 1e-9, two_fund_gap
print(f"two-fund separation on 200 frontier points of 50 random covariances: max gap {two_fund_gap:.1e}")

# ---------------------------------------------------------------- 3. tangency and Sharpe
rf = 0.002
w_tan = F.tangency(rf)
mu_tan, sd_tan = dot(w_tan, mu), math.sqrt(quad(w_tan, S))
sharpe_tan = (mu_tan - rf) / sd_tan
sharpe_formula = math.sqrt(F.C - 2 * F.B * rf + F.A * rf * rf)
best_grid = max(((dot(F.weights(m), mu) - rf) / math.sqrt(F.variance(m)), m) for m in [mu_gmv + 1e-5 * k for k in range(1, 3000)])
assert abs(sharpe_tan - sharpe_formula) < 1e-10 and best_grid[0] <= sharpe_tan + 1e-12 and sharpe_tan - best_grid[0] < 1e-6
assert abs(dot(F.weights(mu_tan), mu) - mu_tan) < 1e-12 and max(abs(a - b) for a, b in zip(F.weights(mu_tan), w_tan)) < 1e-10
print(f"tangency at rf {rf * 100:.1f}%: mean {mu_tan * 100:.3f}%, sd {sd_tan * 100:.3f}%, Sharpe {sharpe_tan:.4f} (formula {sharpe_formula:.4f}, grid {best_grid[0]:.4f}); w {[round(w, 3) for w in w_tan]}")

# ---------------------------------------------------------------- 4. long-only frontier
mu4, S4 = mu[:4], [row[:4] for row in S[:4]]
F4 = Frontier(mu4, S4)
pts = simplex_grid(4, 50)
lo_targets = [0.0085 + 0.0005 * k for k in range(11)]
grid_gap = 0.0
inside = 0
envelope_checks = 0
for m in lo_targets:
    v_lo, w_lo = long_only(mu4, S4, m)
    assert w_lo is not None and min(w_lo) >= -1e-9 and abs(sum(w_lo) - 1) < 1e-9 and abs(dot(w_lo, mu4) - m) < 1e-9
    near = [w for w in pts if abs(dot(w, mu4) - m) < 0.00025]
    v_grid = min(quad(w, S4) for w in near)
    grid_gap = max(grid_gap, abs(v_grid - v_lo))
    # the exact long-only frontier is the lower envelope of every feasible
    # long-only portfolio: at each grid point's own return it is no higher
    for w in rng.sample(near, 40):
        assert long_only(mu4, S4, dot(w, mu4))[0] <= quad(w, S4) + 1e-12
        envelope_checks += 1
    assert v_lo >= F4.variance(m) - 1e-15  # inside the unconstrained frontier
    inside += v_lo > F4.variance(m) + 1e-12
print(f"long-only, 4 assets, 11 targets: exact frontier under all {envelope_checks} sampled portfolios of {len(pts):,} grid points (band minimum within {grid_gap:.1e} variance); {inside} of 11 strictly inside the short-sale frontier")
w_hi = long_only(mu4, S4, 0.0135)[1]
print(f"  at 1.35%: long-only {[round(w, 3) for w in w_hi]} vs short-sale {[round(w, 3) for w in F4.weights(0.0135)]}")

# ---------------------------------------------------------------- 5. estimation error
L = cholesky(S)
true_tan = F.tangency(rf)
true_sharpe = sharpe_tan
w_eq = [1.0 / n] * n
sharpe_eq = (dot(w_eq, mu) - rf) / math.sqrt(quad(w_eq, S))


def sample(T):
    out = []
    for _ in range(T):
        z = [rng.gauss(0, 1) for _ in range(n)]
        out.append([mu[i] + sum(L[i][k] * z[k] for k in range(i + 1)) for i in range(n)])
    return out


def estimate(R):
    T = len(R)
    mbar = [sum(r[i] for r in R) / T for i in range(n)]
    C = [[sum((r[i] - mbar[i]) * (r[j] - mbar[j]) for r in R) / (T - 1) for j in range(n)] for i in range(n)]
    return mbar, C


def shrink(C, delta):
    tr = sum(C[i][i] for i in range(n)) / n
    return [[(1 - delta) * C[i][j] + (delta * tr if i == j else 0.0) for j in range(n)] for i in range(n)]


def true_sharpe_of(w):
    return (dot(w, mu) - rf) / math.sqrt(quad(w, S))


def mean_se(xs):
    m = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    return m, sd / math.sqrt(len(xs))


SIMS = 300
results = {}
for T in (24, 60, 120):
    plug, gmv_s, shr, maxw = [], [], [], []
    for _ in range(SIMS):
        mbar, C = estimate(sample(T))
        Fe = Frontier(mbar, C)
        w_p = Fe.tangency(rf)
        if dot(w_p, mbar) < rf:  # sample tangency on the wrong side: the plug-in flips sign
            w_p = [-x for x in w_p]
            s = sum(w_p)
            w_p = [x / s for x in w_p]
        plug.append(true_sharpe_of(w_p))
        maxw.append(max(abs(x) for x in w_p))
        gmv_s.append(true_sharpe_of(Fe.gmv()[0]))
        shr.append(true_sharpe_of(Frontier(mbar, shrink(C, 0.5)).gmv()[0]))
    results[T] = (mean_se(plug), mean_se(gmv_s), mean_se(shr), mean_se(maxw))
print(f"true tangency Sharpe {true_sharpe:.4f}, equal weight {sharpe_eq:.4f} (monthly); {SIMS} simulated windows each:")
for T, (p, g, sh, mw) in results.items():
    print(f"  T = {T:3d}: plug-in tangency {p[0]:.4f} +- {p[1]:.4f} (max |w| {mw[0]:.2f} +- {mw[1]:.2f}); sample GMV {g[0]:.4f} +- {g[1]:.4f}; shrunk GMV {sh[0]:.4f} +- {sh[1]:.4f}")
p24, p60, p120 = results[24][0][0], results[60][0][0], results[120][0][0]
assert p24 < p60 < p120 < true_sharpe  # more data helps, and nothing beats the truth
assert p24 < sharpe_eq and p60 < sharpe_eq and p120 < sharpe_eq  # the plug-in loses to 1/N at every window
assert results[24][1][0] > p24 and results[60][1][0] > p60  # ignoring the means beats using them
assert results[24][3][0] > 1.5  # the extreme weights of the negative example
assert results[60][3][0] > 1.5
print(f"  plug-in under 1/N at T = 24 and 60 by {sharpe_eq - p24:.4f} and {sharpe_eq - p60:.4f}; at T = 120 it is {'above' if p120 > sharpe_eq else 'below'} 1/N by {abs(p120 - sharpe_eq):.4f}")

# ---------------------------------------------------------------- 6. cost
t_solve = time.perf_counter()
for _ in range(1000):
    kkt_weights(mu, S, mu_gmv + 0.002)
t_solve = (time.perf_counter() - t_solve) / 1000 * 1e6
elapsed = time.time() - T0
print(f"one 5-asset frontier solve {t_solve:.0f} us; {elapsed:.1f} s")
print(f"OK: KKT equals the closed form to {kkt_gap:.0e} on 81 targets and two-fund separation holds to {two_fund_gap:.0e} on 50 random covariances; the tangency Sharpe {sharpe_tan:.4f} matches the formula and a dense grid; the exact long-only frontier lies under all {envelope_checks} sampled portfolios of a {len(pts):,}-point simplex grid, inside the short-sale frontier on {inside} of 11 targets; over {SIMS} windows the plug-in tangency earns {p24:.3f} / {p60:.3f} / {p120:.3f} at 24 / 60 / 120 months against 1/N {sharpe_eq:.3f}, the truth {true_sharpe:.3f}, and the sample GMV {results[60][1][0]:.3f} at 60, with max |w| {results[24][3][0]:.1f} at 24 months; {elapsed:.1f} s")
