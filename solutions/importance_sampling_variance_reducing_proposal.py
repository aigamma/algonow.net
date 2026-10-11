"""Importance sampling x Variance-reducing proposal (puzzle 201).

Estimate E_p[f(X)] with samples from a proposal q instead of the target p,
weighting each sample by p(x)/q(x). The rare-event case P(Z > 4) for a
standard normal has a closed form (0.5 erfc(4/sqrt 2) = 3.167e-5), so every
estimator here is held to the truth, to its own closed-form variance, and
to Kish's effective sample size.

Oracles: closed-form tail probabilities (math.erfc) and moments; the exact
second moment of the mean-shifted proposal, exp(mu^2) * Qbar(a + mu); the
zero-variance proposals, whose weights must be constant to 1e-9; Kahn and
Marshall (1953), Siegmund (1976), Owen (2013, chapter 9).

AUTHOR CORRECTIONS. (1) The draft expected the narrow proposal N(4, 0.5)
to blow up: its weight integral diverges (sigma_q < 1), so its variance is
infinite. Measured, it is the steadiest row in the table, because the
weights exceed one only beyond x = 8.09, which N(4, 0.5) reaches about once
in 10^16 draws; the page reports the theorem and the fact that the sample
never sees the region that makes it true. The honest failure is the
proposal that overshoots the event, N(7, 0.5). (2) The draft said
self-normalized weights "cost a small 1/n bias"; with the tilted proposal
the normalizer is dominated by rare samples near the origin and the
estimate lands near twice the truth, so the page says self-normalization
needs a proposal that covers the whole target, not just the event.
"""
import math
import random
from statistics import NormalDist

SQRT2 = math.sqrt(2.0)
ND = NormalDist()


def qbar(x):
    """P(Z > x) for a standard normal, exact to double precision."""
    return 0.5 * math.erfc(x / SQRT2)


def mean_sd(xs):
    n = len(xs)
    m = sum(xs) / n
    v = sum((x - m) ** 2 for x in xs) / (n - 1)
    return m, math.sqrt(v)


def tilted_run(rng, n, a, mu, sigma):
    """One importance-sampling run for P(Z > a) with proposal N(mu, sigma^2).
    Returns the estimate, the mean squared weighted value, Kish's ESS of the
    event weights, the largest single weight's share, and the
    self-normalized estimate."""
    tot = 0.0
    tot2 = 0.0
    wsum = 0.0
    wmax = 0.0
    for _ in range(n):
        x = rng.gauss(mu, sigma)
        # log p(x) - log q(x) for N(0,1) against N(mu, sigma^2)
        lw = -0.5 * x * x + 0.5 * ((x - mu) / sigma) ** 2 + math.log(sigma)
        w = math.exp(lw)
        wsum += w
        if x > a:
            tot += w
            tot2 += w * w
            wmax = max(wmax, w)
    ess = (tot * tot / tot2) if tot2 > 0 else 0.0
    share = (wmax / tot) if tot > 0 else 0.0
    return tot / n, tot2 / n, ess, share, tot / wsum


def plain_run(rng, n, a):
    return sum(1 for _ in range(n) if rng.gauss(0.0, 1.0) > a) / n


def bump(x, c=3.0, s=0.3):
    return math.exp(-((x - c) ** 2) / (2 * s * s))


def bump_truth(c=3.0, s=0.3):
    # integral of phi(x) exp(-(x-c)^2 / (2 s^2)) dx
    return s / math.sqrt(1 + s * s) * math.exp(-c * c / (2 * (1 + s * s)))


def main():
    a = 4.0
    p_true = qbar(a)
    runs = 20
    rng = random.Random(201)

    # ---- 1. plain Monte Carlo against the tilted proposal ---------------
    n_plain = 100_000
    plain = [plain_run(rng, n_plain, a) for _ in range(runs)]
    pm, psd = mean_sd(plain)
    plain_var_sample = p_true * (1 - p_true)

    n_is = 10_000
    is_runs = [tilted_run(rng, n_is, a, a, 1.0) for _ in range(runs)]
    im, isd = mean_sd([r[0] for r in is_runs])
    second = sum(r[1] for r in is_runs) / runs  # measured E_q[(w 1)^2]
    second_exact = math.exp(a * a) * qbar(2 * a)  # exp(mu^2) Qbar(a + mu) at mu = a
    is_var_sample = second_exact - p_true * p_true
    ess_frac = sum(r[2] for r in is_runs) / runs / n_is
    share = sum(r[3] for r in is_runs) / runs
    reduction = plain_var_sample / is_var_sample

    # the best mean shift: minimize exp(mu^2) Qbar(a + mu) on a fine grid
    grid = [a - 1 + k / 200 for k in range(401)]
    best_mu = min(grid, key=lambda m: math.exp(m * m) * qbar(a + m))
    best_var = math.exp(best_mu * best_mu) * qbar(a + best_mu) - p_true * p_true

    # ---- 2. other proposals: wide, undershifted, narrow, overshooting -----
    table = {}
    for label, mu, sigma in (("wide N(4,2)", a, 2.0), ("undershot N(2,1)", 2.0, 1.0), ("narrow N(4,0.5)", a, 0.5), ("overshoot N(7,0.5)", 7.0, 0.5)):
        rr = [tilted_run(rng, n_is, a, mu, sigma) for _ in range(runs)]
        m, sd = mean_sd([r[0] for r in rr])
        table[label] = (m / p_true, sd / p_true, sum(r[3] for r in rr) / runs, sum(r[2] for r in rr) / runs / n_is)
    # narrow proposal: log(p^2/q) has x^2 coefficient -1 + 1/(2 sigma^2) > 0, so
    # the second moment diverges; the weight first exceeds one at the larger
    # root of -x^2/2 + 2 (x-4)^2 - ln 2 = 0
    narrow_coeff = -1.0 + 1.0 / (2 * 0.5 ** 2)
    x_cross = (16 + math.sqrt(256 - 6 * (32 - math.log(2)))) / 3
    draws_to_cross = 1.0 / qbar((x_cross - a) / 0.5)

    # ---- 3. self-normalized weights on the rare event ------------------
    snis_m, _ = mean_sd([r[4] for r in is_runs])

    # ---- 4. a concentrated integrand with a closed form ----------------
    c, s = 3.0, 0.3
    truth = bump_truth(c, s)
    n_b = 10_000
    plain_b, good_b = [], []
    zero_dev = 0.0
    s2 = s * s
    mu_star, sd_star = c / (1 + s2), math.sqrt(s2 / (1 + s2))
    for _ in range(runs):
        plain_b.append(sum(bump(rng.gauss(0.0, 1.0), c, s) for _ in range(n_b)) / n_b)
        tot = 0.0
        for _ in range(n_b):
            x = rng.gauss(c, 0.5)
            tot += bump(x, c, s) * math.exp(-0.5 * x * x + 0.5 * ((x - c) / 0.5) ** 2) * 0.5
        good_b.append(tot / n_b)
        for _ in range(200):
            x = rng.gauss(mu_star, sd_star)
            w = bump(x, c, s) * math.exp(-0.5 * x * x + 0.5 * ((x - mu_star) / sd_star) ** 2) * sd_star
            zero_dev = max(zero_dev, abs(w - truth))
    pb_m, pb_sd = mean_sd(plain_b)
    gb_m, gb_sd = mean_sd(good_b)
    plain_b_sd = math.sqrt(((s / SQRT2) / math.sqrt(1 + s2 / 2) * math.exp(-c * c / (2 * (1 + s2 / 2))) - truth * truth) / n_b)
    snis_bias = {}
    for n in (100, 1_000, 10_000):
        ests = []
        for _ in range(runs):
            num = den = 0.0
            for _ in range(n):
                x = rng.gauss(c, 1.0)
                w = math.exp(-0.5 * x * x + 0.5 * (x - c) ** 2)
                num += bump(x, c, s) * w
                den += w
            ests.append(num / den)
        snis_bias[n] = (mean_sd(ests)[0] - truth) / truth

    # ---- 5. rivals on E[exp(Z)] = exp(1/2) ------------------------------
    ez = math.exp(0.5)
    var_plain_ez = math.exp(2) - math.exp(1)
    n_e = 10_000
    res = {k: [] for k in ("plain", "antithetic", "control", "stratified", "importance")}
    for _ in range(runs):
        xs = [rng.gauss(0.0, 1.0) for _ in range(n_e)]
        res["plain"].append(sum(math.exp(x) for x in xs) / n_e)
        res["antithetic"].append(sum(0.5 * (math.exp(x) + math.exp(-x)) for x in xs[: n_e // 2]) / (n_e // 2))
        res["control"].append(sum(math.exp(x) - ez * x for x in xs) / n_e)  # beta = Cov(e^Z, Z) = e^(1/2)
        strata = 100
        acc = 0.0
        for k in range(strata):
            for _ in range(n_e // strata):
                acc += math.exp(ND.inv_cdf((k + rng.random()) / strata))
        res["stratified"].append(acc / n_e)
        res["importance"].append(sum(math.exp(y) * math.exp(-0.5 * y * y + 0.5 * (y - 1) ** 2) for y in (rng.gauss(1.0, 1.0) for _ in range(n_e))) / n_e)
    ez_rows = {k: mean_sd(v) for k, v in res.items()}
    ez_ratio = {k: (ez_rows["plain"][1] / ez_rows[k][1]) ** 2 if ez_rows[k][1] > 1e-12 else float("inf") for k in ez_rows}

    # ---- report ---------------------------------------------------------
    print(f"P(Z > 4) = {p_true:.4e}; {runs} runs each")
    print(f"  plain MC, n = {n_plain:,}: mean/truth {pm / p_true:.3f}, sd/truth {psd / p_true:.3f}")
    print(f"  tilt N(4,1), n = {n_is:,}: mean/truth {im / p_true:.4f}, sd/truth {isd / p_true:.4f}; ESS {ess_frac:.3f} n; top weight share {share:.4f}")
    print(f"  second moment measured {second:.3e} vs exact exp(16) Qbar(8) = {second_exact:.3e}; per-sample variance ratio plain/IS {reduction:,.0f}")
    print(f"  best shift mu* = {best_mu:.2f} (variance {best_var:.3e} vs {is_var_sample:.3e} at mu = 4)")
    for k, (m, rsd, sh, ef) in table.items():
        print(f"  {k:20s} mean/truth {m:.3f}, sd/truth {rsd:.3f}, top weight share {sh:.3f}, ESS {ef:.4f} n")
    print(f"  narrow: x^2 coefficient of log(p^2/q) = {narrow_coeff:+.1f} (divergent); weight exceeds one past x = {x_cross:.2f}, reached once in {draws_to_cross:.1e} draws")
    print(f"  self-normalized with the tilt: {snis_m / p_true:.2f}x truth")
    print(f"bump integral truth {truth:.5e}: plain sd/truth {pb_sd / truth:.3f} (closed form {plain_b_sd / truth:.3f}); N(3,0.5) proposal sd/truth {gb_sd / truth:.4f}; zero-variance weights deviate {zero_dev:.1e}")
    print("  self-normalized relative bias: " + ", ".join(f"n = {n:,}: {b:+.4f}" for n, b in snis_bias.items()))
    print(f"E[exp Z] = {ez:.4f}, n = {n_e:,}: " + "; ".join(f"{k} {ez_rows[k][0]:.4f} (variance ratio {ez_ratio[k]:,.1f})" for k in res))

    # ---- assertions -----------------------------------------------------
    assert abs(p_true - 3.167124e-5) < 1e-9
    assert abs(pm - p_true) < 4 * psd / math.sqrt(runs) + 1e-12
    assert abs(im - p_true) < 4 * isd / math.sqrt(runs)
    assert abs(second / second_exact - 1) < 0.15
    assert abs(isd * isd * n_is / is_var_sample - 1) < 0.6  # run-to-run variance matches the closed form
    assert reduction > 5_000 and psd > 20 * isd  # sqrt(7000 / 10) at ten times the samples
    assert abs(best_mu - a) < 0.3 and best_var <= is_var_sample
    assert ess_frac > 0.1 and share < 0.01
    assert table["wide N(4,2)"][1] > isd / p_true and table["undershot N(2,1)"][1] > isd / p_true
    assert narrow_coeff > 0 and 8.0 < x_cross < 8.2 and draws_to_cross > 1e15
    assert table["narrow N(4,0.5)"][1] < 0.05  # steady in practice, the correction
    over = table["overshoot N(7,0.5)"]
    assert over[0] < 0.2 and over[2] > 0.3 and over[3] < 0.01  # precisely wrong: tiny spread, far below truth
    assert 1.5 < snis_m / p_true < 3
    assert abs(truth - 0.0046286) < 1e-6
    assert abs(pb_m - truth) < 4 * pb_sd / math.sqrt(runs)
    assert abs(gb_m - truth) < 4 * gb_sd / math.sqrt(runs) and gb_sd < pb_sd / 5
    assert abs(pb_sd / plain_b_sd - 1) < 0.4
    assert zero_dev < 1e-9
    assert abs(snis_bias[100]) > abs(snis_bias[1_000]) > abs(snis_bias[10_000]) and abs(snis_bias[10_000]) < 0.1
    for k in res:
        assert abs(ez_rows[k][0] - ez) < 4 * max(ez_rows[k][1], 1e-12) / math.sqrt(runs) + 1e-9
    assert abs(ez_rows["plain"][1] ** 2 * n_e / var_plain_ez - 1) < 0.6
    assert ez_ratio["control"] > 1.5 and ez_ratio["antithetic"] > 1.5 and ez_ratio["stratified"] > 5
    assert ez_rows["importance"][1] < 1e-12  # exp(x) phi(x) is proportional to N(1, 1): zero variance
    print(
        f"OK: the tilted proposal N(4,1) estimates P(Z > 4) = {p_true:.3e} with sd/truth {isd / p_true:.4f} where plain Monte Carlo "
        f"at ten times the samples sits at {psd / p_true:.2f}; the measured second moment is within {abs(second / second_exact - 1) * 100:.1f}% of exp(16) Qbar(8) "
        f"and the per-sample variance ratio is {reduction:,.0f}; ESS {ess_frac:.2f} n; the overshooting proposal N(7,0.5) is precisely wrong at {over[0]:.3f}x truth with sd/truth {over[1]:.3f} "
        f"and one weight carrying {over[2]:.0%} of the estimate; the narrow proposal has infinite variance yet sd/truth {table['narrow N(4,0.5)'][1]:.3f} because its weights pass one only beyond x = {x_cross:.2f}; "
        f"self-normalizing the tilt gives {snis_m / p_true:.2f}x truth; zero-variance proposals hold their weights constant to {zero_dev:.0e}; "
        f"E[exp Z] variance ratios antithetic {ez_ratio['antithetic']:.1f}, control {ez_ratio['control']:.1f}, stratified {ez_ratio['stratified']:.1f}, importance exact"
    )


if __name__ == "__main__":
    main()
