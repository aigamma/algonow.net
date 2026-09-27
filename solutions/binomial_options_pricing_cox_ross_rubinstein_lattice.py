# Puzzle 135: Binomial options pricing x Cox-Ross-Rubinstein lattice
# Option pricing: what is a contract worth today that pays max(S - K, 0)
# (a call) or max(K - S, 0) (a put) at maturity T, when the stock S
# moves randomly with volatility sigma and cash earns the risk-free
# rate r? The binomial model is the algorithm: cut T into N steps, let
# the stock go up by a factor u or down by d each step, price the
# option at maturity on every node, and roll back one step at a time
# taking the discounted risk-neutral expectation, checking early
# exercise at each node for American contracts. The heuristic is the
# Cox-Ross-Rubinstein choice of factors: u = exp(sigma sqrt(dt)),
# d = 1/u, p = (exp(r dt) - d) / (u - d), which matches the volatility
# so the tree converges to the continuous model, and, because u d = 1,
# centers the lattice so that every node in the whole tree sits on one
# grid of 2N + 1 prices.
#
# AUTHOR CORRECTION: the draft claimed that u d = 1 is what makes the
# tree recombine. Measured, it is not: any tree with CONSTANT factors
# recombines (an up then a down lands where a down then an up does,
# whatever u d is), and the Jarrow-Rudd factors with u d != 1 give the
# same N + 1 maturity nodes. What breaks recombination is refitting
# the factors step by step; what u d = 1 buys is the shared grid.
# Both are counted below.
#
# Referees:
# (1) BLACK-SCHOLES: the closed-form European call and put prices
#     (normal CDF via erf) as the limit; the lattice price must
#     converge, with the error at N = 1,000 steps under a cent on a
#     100-dollar stock, and delta from the first branching within
#     0.01 of the closed-form delta;
# (2) PUT-CALL PARITY inside the tree, exactly: C - P = S - K exp(-rT)
#     to 1e-10 at every N, because the tree is arbitrage-free;
# (3) THE MARTINGALE: the risk-neutral expected stock price discounted
#     to today equals S to 1e-10, and the tree's variance of log
#     returns converges to sigma^2 T;
# (4) RECOMBINATION AND THE GRID, counted at N = 16: CRR has 17
#     distinct maturity prices and 33 distinct prices in the whole
#     tree; Jarrow-Rudd (constant factors, u d != 1) has 17 at maturity
#     but 153 in the whole tree (every node its own price); factors
#     refitted with a different volatility at every step have 65,536
#     distinct maturity prices, one per path, and the rollback is
#     exponential;
# (5) AMERICAN PUT: early exercise is worth something (the American
#     price exceeds the European by a measured premium), the price
#     agrees with a fine reference tree (N = 4,000) to a cent, and the
#     exercise boundary read off the tree rises toward maturity (the
#     lattice reads it on a discrete price grid, so it is compared a
#     quarter of the horizon apart rather than step by step, where the
#     grid's zigzag would fail a strict test); the American call equals
#     the European one (no dividends);
# (6) THE COARSE-STEP FAILURE: with too few steps and a high rate the
#     risk-neutral probability leaves (0, 1); the run finds the first N
#     at which the CRR tree is valid for r = 40%.
import math

S0, K, R, SIGMA, T = 100.0, 100.0, 0.05, 0.20, 1.0


def norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def black_scholes(S, K, r, sigma, T, kind):
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if kind == 'call':
        return S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2), norm_cdf(d1)
    return K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1), norm_cdf(d1) - 1.0


def crr_factors(r, sigma, dt):
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    p = (math.exp(r * dt) - d) / (u - d)
    return u, d, p


def jarrow_rudd_factors(r, sigma, dt):
    drift = (r - 0.5 * sigma * sigma) * dt
    u = math.exp(drift + sigma * math.sqrt(dt))
    d = math.exp(drift - sigma * math.sqrt(dt))
    p = (math.exp(r * dt) - d) / (u - d)
    return u, d, p


def binomial(S, K, r, sigma, T, N, kind, american=False, factors=None):
    """Backward induction on the recombining lattice. Returns the price,
    the delta from the first branching, and the exercise boundary (the
    highest stock price at which exercise is optimal, per step) for
    American puts."""
    dt = T / N
    u, d, p = factors(r, sigma, dt) if factors else crr_factors(r, sigma, dt)
    disc = math.exp(-r * dt)
    prices = [S * (u ** j) * (d ** (N - j)) for j in range(N + 1)]
    payoff = (lambda s: max(s - K, 0.0)) if kind == 'call' else (lambda s: max(K - s, 0.0))
    values = [payoff(s) for s in prices]
    boundary = [None] * N
    first = None
    for step in range(N - 1, -1, -1):
        new_values = []
        top_exercise = None
        for j in range(step + 1):
            s = S * (u ** j) * (d ** (step - j))
            cont = disc * (p * values[j + 1] + (1.0 - p) * values[j])
            if american:
                ex = payoff(s)
                if ex > cont:
                    cont = ex
                    if top_exercise is None or s > top_exercise:
                        top_exercise = s
            new_values.append(cont)
        values = new_values
        boundary[step] = top_exercise
        if step == 1:
            first = (values[1] - values[0]) / (S * u - S * d)
    return values[0], first, boundary


def count_distinct(values):
    """Distinct values, merging those within a relative 1e-9 (products of
    the same factors in different orders differ only by rounding)."""
    values = sorted(values)
    count = 1
    for a, b in zip(values, values[1:]):
        if b - a > 1e-9 * b:
            count += 1
    return count


def tree_prices(S, N, factor_at_step):
    """All node prices by level, following every path (2^N leaves)."""
    levels = [[S]]
    for k in range(N):
        u, d = factor_at_step(k)
        levels.append([v * u for v in levels[-1]] + [v * d for v in levels[-1]])
    return levels


if __name__ == '__main__':
    bs_call, bs_delta = black_scholes(S0, K, R, SIGMA, T, 'call')
    bs_put, _ = black_scholes(S0, K, R, SIGMA, T, 'put')

    # Oracle 1: convergence to Black-Scholes.
    errors = {}
    for N in (10, 50, 100, 500, 1000):
        c, delta, _ = binomial(S0, K, R, SIGMA, T, N, 'call')
        errors[N] = (c, abs(c - bs_call), delta)
    assert errors[1000][1] < 0.01, errors[1000]
    assert errors[10][1] > errors[1000][1]
    assert abs(errors[1000][2] - bs_delta) < 0.01, (errors[1000][2], bs_delta)
    jr_call, _, _ = binomial(S0, K, R, SIGMA, T, 1000, 'call', factors=jarrow_rudd_factors)
    assert abs(jr_call - bs_call) < 0.01, jr_call

    # Oracle 2: put-call parity in the tree.
    worst_parity = 0.0
    for N in (5, 50, 500):
        c, _, _ = binomial(S0, K, R, SIGMA, T, N, 'call')
        pu, _, _ = binomial(S0, K, R, SIGMA, T, N, 'put')
        worst_parity = max(worst_parity, abs((c - pu) - (S0 - K * math.exp(-R * T))))
    assert worst_parity < 1e-10, worst_parity

    # Oracle 3: the martingale and the variance.
    N = 500
    dt = T / N
    u, d, p = crr_factors(R, SIGMA, dt)
    expected = 0.0
    var_log = 0.0
    mean_log = 0.0
    probs = []
    for j in range(N + 1):
        w = math.comb(N, j) * (p ** j) * ((1 - p) ** (N - j))
        probs.append(w)
        s = S0 * (u ** j) * (d ** (N - j))
        expected += w * s
        mean_log += w * math.log(s / S0)
    for j in range(N + 1):
        s = S0 * (u ** j) * (d ** (N - j))
        var_log += probs[j] * (math.log(s / S0) - mean_log) ** 2
    assert abs(expected * math.exp(-R * T) - S0) < 1e-10, expected
    assert abs(var_log - SIGMA * SIGMA * T) < 1e-3, var_log

    # Oracle 4: recombination and the grid, counted at N = 16.
    N16 = 16
    dt16 = T / N16
    cu, cd, _ = crr_factors(R, SIGMA, dt16)
    ju, jd, _ = jarrow_rudd_factors(R, SIGMA, dt16)
    crr_levels = tree_prices(S0, N16, lambda k: (cu, cd))
    jr_levels = tree_prices(S0, N16, lambda k: (ju, jd))
    # factors refitted every step with a different (generic) volatility
    vols = [SIGMA + 0.03 * math.sin(1.0 + 2.3 * k) for k in range(N16)]
    refit_levels = tree_prices(S0, N16, lambda k: (math.exp(vols[k] * math.sqrt(dt16)), math.exp(-vols[k] * math.sqrt(dt16))))
    crr_leaf = count_distinct(crr_levels[-1])
    jr_leaf = count_distinct(jr_levels[-1])
    refit_leaf = count_distinct(refit_levels[-1])
    crr_all = count_distinct([v for lvl in crr_levels for v in lvl])
    jr_all = count_distinct([v for lvl in jr_levels for v in lvl])
    assert crr_leaf == N16 + 1 and jr_leaf == N16 + 1, (crr_leaf, jr_leaf)
    assert refit_leaf == 2 ** N16, refit_leaf
    assert crr_all == 2 * N16 + 1, crr_all
    assert jr_all == (N16 + 1) * (N16 + 2) // 2, jr_all

    # Oracle 5: the American put.
    eu_put, _, _ = binomial(S0, K, R, SIGMA, T, 1000, 'put')
    am_put, _, boundary = binomial(S0, K, R, SIGMA, T, 1000, 'put', american=True)
    am_ref, _, _ = binomial(S0, K, R, SIGMA, T, 4000, 'put', american=True)
    premium = am_put - eu_put
    assert premium > 0.5, premium
    assert abs(am_put - am_ref) < 0.01, (am_put, am_ref)
    bpts = [b for b in boundary if b is not None]
    q = len(bpts) // 4
    assert len(bpts) > 100 and bpts[0] < bpts[q] < bpts[2 * q] < bpts[3 * q] < bpts[-1], 'boundary should rise toward maturity'
    am_call, _, _ = binomial(S0, K, R, SIGMA, T, 1000, 'call', american=True)
    eu_call = errors[1000][0]
    assert abs(am_call - eu_call) < 1e-9, (am_call, eu_call)                 # never exercise a call early without dividends

    # Oracle 6: the coarse-step failure.
    first_valid = None
    for N in range(1, 40):
        _, _, pp = crr_factors(0.40, SIGMA, T / N)
        if 0.0 < pp < 1.0:
            first_valid = N
            break
    assert first_valid is not None and first_valid > 1, first_valid

    print(f'contest: European call, S = {S0:.0f}, K = {K:.0f}, r = {R:.0%}, sigma = {SIGMA:.0%}, T = {T:.0f} year; referee: Black-Scholes {bs_call:.4f} (delta {bs_delta:.4f})')
    print(f"  {'steps N':>8} {'CRR price':>10} {'error':>8} {'delta':>7}   verdict")
    for N in (10, 50, 100, 500, 1000):
        c, e, delta = errors[N]
        print(f'  {N:>8} {c:>10.4f} {e:>8.4f} {delta:>7.4f}   {"under a cent" if e < 0.01 else "converging"}')
    print(f'Jarrow-Rudd factors at N = 1,000: {jr_call:.4f} (also converges); put-call parity inside the tree: worst |C - P - (S - K e^-rT)| = {worst_parity:.1e}; '
          f'martingale: E[S_T] e^-rT - S = {expected * math.exp(-R * T) - S0:.1e}; variance of log returns {var_log:.5f} vs sigma^2 T = {SIGMA * SIGMA * T:.5f}')
    print(f'lattice at N = 16: distinct maturity prices CRR {crr_leaf}, Jarrow-Rudd {jr_leaf}, refitted-per-step {refit_leaf:,}; distinct prices in the whole tree CRR {crr_all}, Jarrow-Rudd {jr_all}')
    print(f'American put (N = 1,000): {am_put:.4f} vs European {eu_put:.4f} (Black-Scholes {bs_put:.4f}), early-exercise premium {premium:.4f}; reference N = 4,000: {am_ref:.4f}; exercise boundary from {bpts[0]:.2f} to {bpts[-1]:.2f}; American call = European call to {abs(am_call - eu_call):.0e}')
    print(f'coarse steps at r = 40%: the risk-neutral probability leaves (0, 1) below N = {first_valid} steps')
    print(f'OK: CRR converged to Black-Scholes within {errors[1000][1]:.4f} at 1,000 steps with delta within {abs(errors[1000][2] - bs_delta):.4f}; parity {worst_parity:.0e}; martingale exact; '
          f'constant factors recombine ({crr_leaf} and {jr_leaf} maturity nodes) where refitted factors give {refit_leaf:,}, and u d = 1 puts the whole tree on {crr_all} prices vs {jr_all}; American put premium {premium:.2f} matching the reference to {abs(am_put - am_ref):.4f}')
