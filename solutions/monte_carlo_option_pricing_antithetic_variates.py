"""Monte Carlo option pricing x Antithetic variates (puzzle 217).

Price options by simulating the risk-neutral terminal price (or path) and
discounting the average payoff; pair every normal draw z with -z so the two
payoffs are negatively correlated and the pair mean has less variance than
two independent draws. Every estimator here is held to a closed form: the
Black-Scholes call (Black and Scholes 1973), the geometric-average Asian
call (Kemna and Vorst 1990), and the continuous down-and-out call (Reiner
and Rubinstein 1991) with the Broadie-Glasserman-Kou barrier shift for
discrete monitoring.

Oracles: closed-form prices via math.erf; the 1/sqrt(n) law of the run-to-
run spread; the exact mean S0 of the discounted terminal price used as a
control; the geometric Asian price used as a control for the arithmetic
Asian (the Kemna-Vorst trick); Boyle (1977), Glasserman (2003).

AUTHOR CORRECTIONS. (1) The draft expected the straddle, a non-monotone
payoff, to gain nothing from antithetic pairing; measured, the pairing makes
it WORSE (variance ratio 0.60, paired payoffs correlated at +0.64), because
the mirrored draw lands on the same arm of the V, so the page says antithetic
variates can hurt, not merely idle. (2) The draft's deep out-of-the-money
example used K = 200, where 10,000 plain paths produced a single hit and the
reported standard error was itself meaningless; the page uses K = 180 (28
hits), where the plain error bar at least exists and is honestly huge.
"""
import math
import random
import time

S0, R, SIG, T = 100.0, 0.05, 0.2, 1.0
DF = math.exp(-R * T)
DRIFT = (R - 0.5 * SIG * SIG) * T
VOL = SIG * math.sqrt(T)
BETA_BGK = 0.5826


def ncdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bs_call(S, K, r=R, sig=SIG, t=T):
    d1 = (math.log(S / K) + (r + 0.5 * sig * sig) * t) / (sig * math.sqrt(t))
    return S * ncdf(d1) - K * math.exp(-r * t) * ncdf(d1 - sig * math.sqrt(t))


def terminal(z):
    return S0 * math.exp(DRIFT + VOL * z)


def mean_se(xs):
    n = len(xs)
    m = sum(xs) / n
    v = sum((x - m) ** 2 for x in xs) / (n - 1)
    return m, math.sqrt(v / n), v


def plain(payoff, n, rng):
    return mean_se([DF * payoff(terminal(rng.gauss(0.0, 1.0))) for _ in range(n)])


def antithetic(payoff, pairs, rng):
    a, b = [], []
    for _ in range(pairs):
        z = rng.gauss(0.0, 1.0)
        a.append(DF * payoff(terminal(z)))
        b.append(DF * payoff(terminal(-z)))
    m, se, v = mean_se([(x + y) / 2 for x, y in zip(a, b)])
    ma, mb = sum(a) / pairs, sum(b) / pairs
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (pairs - 1)
    sa = math.sqrt(sum((x - ma) ** 2 for x in a) / (pairs - 1))
    sb = math.sqrt(sum((y - mb) ** 2 for y in b) / (pairs - 1))
    return m, se, v, cov / (sa * sb)


def control(payoff, n, rng):
    """Control variate: the discounted terminal price, whose mean is exactly S0."""
    xs, cs = [], []
    for _ in range(n):
        s = terminal(rng.gauss(0.0, 1.0))
        xs.append(DF * payoff(s))
        cs.append(DF * s)
    mx, mc = sum(xs) / n, sum(cs) / n
    beta = sum((x - mx) * (c - mc) for x, c in zip(xs, cs)) / sum((c - mc) ** 2 for c in cs)
    return mean_se([x - beta * (c - S0) for x, c in zip(xs, cs)])[:2] + (beta,)


def combined(payoff, pairs, rng):
    """Antithetic pairs with the terminal price as control; returns the estimator variance."""
    xs, cs = [], []
    for _ in range(pairs):
        z = rng.gauss(0.0, 1.0)
        sa, sb = terminal(z), terminal(-z)
        xs.append(DF * (payoff(sa) + payoff(sb)) / 2)
        cs.append(DF * (sa + sb) / 2)
    mx, mc = sum(xs) / pairs, sum(cs) / pairs
    beta = sum((x - mx) * (c - mc) for x, c in zip(xs, cs)) / sum((c - mc) ** 2 for c in cs)
    return mean_se([x - beta * (c - S0) for x, c in zip(xs, cs)])[2] / pairs


def spread(fn, runs, seed):
    ests = [fn(random.Random(seed + k))[0] for k in range(runs)]
    m, se, v = mean_se(ests)
    return m, math.sqrt(v)


# ---------- geometric and arithmetic Asian calls (m monitoring dates) ----------
def geo_asian_exact(K, m):
    mu = math.log(S0) + DRIFT * (m + 1) / (2 * m)
    var = SIG * SIG * T * (m + 1) * (2 * m + 1) / (6 * m * m)
    sg = math.sqrt(var)
    d1 = (mu - math.log(K) + var) / sg
    return DF * (math.exp(mu + 0.5 * var) * ncdf(d1) - K * ncdf(d1 - sg))


def asian_pair(K, m, rng):
    """One antithetic pair of paths; returns (arith, geo) payoff pairs, discounted."""
    h = T / m
    dr, vl = (R - 0.5 * SIG * SIG) * h, SIG * math.sqrt(h)
    zs = [rng.gauss(0.0, 1.0) for _ in range(m)]
    out = []
    for sgn in (1.0, -1.0):
        s, tot, lg = S0, 0.0, 0.0
        for z in zs:
            s *= math.exp(dr + vl * sgn * z)
            tot += s
            lg += math.log(s)
        out.append((DF * max(tot / m - K, 0.0), DF * max(math.exp(lg / m) - K, 0.0)))
    return out


# ---------- down-and-out call, continuous closed form and discrete simulation ----------
def down_out_exact(K, H):
    lam = (R + 0.5 * SIG * SIG) / (SIG * SIG)
    y = math.log(H * H / (S0 * K)) / VOL + lam * VOL
    c_di = S0 * (H / S0) ** (2 * lam) * ncdf(y) - K * DF * (H / S0) ** (2 * lam - 2) * ncdf(y - VOL)
    return bs_call(S0, K) - c_di


def down_out_mc(K, H, m, n, rng):
    h = T / m
    dr, vl = (R - 0.5 * SIG * SIG) * h, SIG * math.sqrt(h)
    vals = []
    for _ in range(n):
        s, alive = S0, True
        for _ in range(m):
            s *= math.exp(dr + vl * rng.gauss(0.0, 1.0))
            if s <= H:
                alive = False
                break
        vals.append(DF * max(s - K, 0.0) if alive else 0.0)
    return mean_se(vals)[:2]


def importance_otm(K, n, rng):
    """Shift the draw to the strike: z ~ N(mu, 1), weight phi(z) / phi(z - mu)."""
    mu = (math.log(K / S0) - DRIFT) / VOL
    vals = []
    for _ in range(n):
        z = mu + rng.gauss(0.0, 1.0)
        vals.append(DF * max(terminal(z) - K, 0.0) * math.exp(-mu * z + 0.5 * mu * mu))
    return mean_se(vals)[:2] + (mu,)


def main():
    t0 = time.perf_counter()
    rng = random.Random(217)
    call = lambda K: (lambda s: max(s - K, 0.0))
    bs100, bs80 = bs_call(S0, 100.0), bs_call(S0, 80.0)
    put = bs100 - S0 + 100.0 * DF  # put-call parity
    assert abs(bs100 - 10.4506) < 1e-3 and put > 0, bs100

    # 1. unbiasedness: 200 independent runs at 2,000 paths each
    runs, n = 200, 2000
    rows = {}
    for name, fn in (("plain", lambda g: plain(call(100.0), n, g)),
                     ("antithetic", lambda g: antithetic(call(100.0), n // 2, g)),
                     ("control", lambda g: control(call(100.0), n, g))):
        m, sd = spread(fn, runs, 1000)
        z = abs(m - bs100) / (sd / math.sqrt(runs))
        rows[name] = (m, sd, z)
        assert z < 3.5, (name, m, sd, z)

    # 2. the 1 / sqrt(n) law of the spread
    sds = [spread(lambda g, k=k: plain(call(100.0), k, g), 300, 5000)[1] for k in (250, 1000, 4000)]
    ratios = [sds[i] / sds[i + 1] for i in range(2)]
    slope = math.log(sds[2] / sds[0]) / math.log(16.0)
    assert all(1.65 < q < 2.35 for q in ratios) and abs(slope + 0.5) < 0.08, (ratios, slope)

    # 3. variance ratios at equal path counts, two strikes
    ratio = {}
    for K, bs in ((100.0, bs100), (80.0, bs80)):
        g = random.Random(7)
        vp = plain(call(K), 40000, g)[2] / 40000
        ma, _, va, rho = antithetic(call(K), 20000, g)
        va /= 20000
        est_c, se_c, beta = control(call(K), 40000, g)
        vc = se_c * se_c
        both = combined(call(K), 20000, random.Random(8))
        ratio[K] = (vp / va, rho, vp / vc, beta, abs(ma - bs), abs(est_c - bs) / se_c, vp / both)
        assert rho < -0.2 and vp / va > 1.3 and vp / vc > 2.0 and vp / both > vp / vc, ratio[K]
    assert ratio[80.0][0] > ratio[100.0][0] and ratio[80.0][1] < ratio[100.0][1], (ratio[80.0], ratio[100.0])

    # 4. Asian calls: geometric against its closed form, arithmetic with the geometric control
    K, m, pairs = 100.0, 12, 10000
    geo_exact = geo_asian_exact(K, m)
    g = random.Random(11)
    data = [asian_pair(K, m, g) for _ in range(pairs)]
    geo = [(p[0][1] + p[1][1]) / 2 for p in data]
    ari = [(p[0][0] + p[1][0]) / 2 for p in data]
    gm, gse, _ = mean_se(geo)
    assert abs(gm - geo_exact) < 3 * gse, (gm, gse, geo_exact)
    am, ase, av = mean_se(ari)
    mg = sum(geo) / pairs
    b = sum((a - am) * (q - mg) for a, q in zip(ari, geo)) / sum((q - mg) ** 2 for q in geo)
    acv, acv_se, acv_v = mean_se([a - b * (q - geo_exact) for a, q in zip(ari, geo)])
    asian_ratio = av / acv_v
    assert asian_ratio > 20 and abs(acv - am) < 4 * ase, (asian_ratio, acv, am, ase)

    # 5. down-and-out call: discrete monitoring against the shifted-barrier closed form
    K, H, n = 100.0, 85.0, 10000
    cont = down_out_exact(K, H)
    barrier = []
    for steps in (12, 50, 200):
        est, se = down_out_mc(K, H, steps, n, random.Random(steps))
        shifted = down_out_exact(K, H * math.exp(-BETA_BGK * SIG * math.sqrt(T / steps)))
        barrier.append((steps, est, se, shifted))
        assert abs(est - shifted) < 3 * se, (steps, est, se, shifted)
    assert barrier[0][1] > barrier[2][1] > cont - 3 * barrier[2][2], barrier

    # 6. negative examples: the deep out-of-the-money call, the straddle under pairing
    K = 180.0
    bs200 = bs_call(S0, K)
    g = random.Random(3)
    hits = 0
    vals = []
    for _ in range(10000):
        s = terminal(g.gauss(0.0, 1.0))
        hits += s > K
        vals.append(DF * max(s - K, 0.0))
    pm, pse, _ = mean_se(vals)
    im, ise, mu = importance_otm(K, 10000, random.Random(4))
    assert 5 <= hits <= 60 and pse / bs200 > 0.12 and ise / bs200 < 0.05 and abs(im - bs200) < 4 * ise, (hits, pse / bs200, ise / bs200)
    straddle = lambda s: abs(s - 100.0)
    g = random.Random(9)
    vp = plain(straddle, 40000, g)[2] / 40000
    _, _, va, rho_s = antithetic(straddle, 20000, g)
    straddle_ratio = vp / (va / 20000)
    assert straddle_ratio < 1.1 and rho_s > 0, (straddle_ratio, rho_s)

    el = time.perf_counter() - t0
    print(f"Black-Scholes call K=100: {bs100:.4f}; K=80: {bs80:.4f}; K=180: {bs200:.5f}; parity put {put:.4f}")
    print(f"{'estimator (2,000 paths, 200 runs)':38s} {'mean':>8s} {'sd':>7s} {'z':>5s}")
    for k, (m_, sd, z) in rows.items():
        print(f"{k:38s} {m_:8.4f} {sd:7.4f} {z:5.2f}")
    print(f"spread over 300 runs at n = 250, 1000, 4000: {sds[0]:.4f} {sds[1]:.4f} {sds[2]:.4f}; ratios {ratios[0]:.2f} {ratios[1]:.2f}; slope {slope:.3f}")
    for K_ in (100.0, 80.0):
        r_ = ratio[K_]
        print(f"K={K_:.0f}: antithetic ratio {r_[0]:.2f} (pair corr {r_[1]:+.2f}); control ratio {r_[2]:.2f} (beta {r_[3]:.2f}); both {r_[6]:.2f}")
    print(f"geometric Asian m=12: MC {gm:.4f} +- {gse:.4f} against exact {geo_exact:.4f}; arithmetic {am:.4f} +- {ase:.4f}, "
          f"with the geometric control {acv:.4f} +- {acv_se:.4f} (variance ratio {asian_ratio:.0f}, b {b:.3f})")
    print(f"down-and-out K=100 H=85: continuous {cont:.4f}; " + "; ".join(
        f"m={s}: MC {e:.4f} +- {se:.4f}, shifted barrier {sh:.4f}" for s, e, se, sh in barrier))
    print(f"deep OTM K=180: {hits} hits in 10,000; plain {pm:.5f} +- {pse:.5f} (rel {pse / bs200:.2f}); "
          f"tilt mu={mu:.2f}: {im:.5f} +- {ise:.5f} (rel {ise / bs200:.3f}); exact {bs200:.5f}")
    print(f"straddle: antithetic ratio {straddle_ratio:.2f}, pair corr {rho_s:+.2f}")
    print(f"OK: plain, antithetic, and control estimates within {max(r[2] for r in rows.values()):.1f} standard errors of "
          f"Black-Scholes over 200 runs with the spread shrinking by {ratios[0]:.2f} and {ratios[1]:.2f} per fourfold n; "
          f"antithetic variance ratio {ratio[100.0][0]:.1f} at the money (pair correlation {ratio[100.0][1]:+.2f}) and "
          f"{ratio[80.0][0]:.1f} in the money ({ratio[80.0][1]:+.2f}); control variate {ratio[100.0][2]:.1f} and both together {ratio[100.0][6]:.1f}; the geometric "
          f"Asian matches Kemna-Vorst within {abs(gm - geo_exact) / gse:.1f} standard errors and as a control cuts the arithmetic "
          f"Asian's variance {asian_ratio:.0f}x; the discretely monitored barrier matches the shifted-barrier closed form at "
          f"m = 12, 50, 200 and converges down to the continuous {cont:.3f}; the deep out-of-the-money call sees {hits} hits "
          f"in 10,000 (relative error {pse / bs200:.2f}) where the tilt gives {ise / bs200:.3f}; the straddle's antithetic "
          f"ratio is {straddle_ratio:.2f}; {el:.1f} s")


if __name__ == "__main__":
    main()
