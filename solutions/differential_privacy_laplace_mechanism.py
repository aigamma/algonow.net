# Puzzle 177: Differential privacy x Laplace mechanism
# Private data release: publish a statistic of a database (a count, a sum,
# a histogram) so that nobody can tell from the output whether any one
# person's record is in the data, while the statistic stays useful. The
# algorithm is differential privacy (Dwork, McSherry, Nissim, and Smith
# 2006): a randomized release M is epsilon-differentially private when,
# for every pair of databases differing in one record and every set of
# outputs S, Pr[M(D) in S] <= e^epsilon Pr[M(D') in S]. The heuristic is
# the Laplace mechanism: add noise drawn from the Laplace distribution
# with scale b = (global sensitivity) / epsilon, where the sensitivity is
# the most one record can change the true answer. The density ratio of
# two Laplace distributions one sensitivity apart is at most e^epsilon
# everywhere, which is exactly the guarantee, and the price is a mean
# absolute error of b, no more and no less.
#
# Referees:
# (1) THE GUARANTEE, MEASURED: a count over 1,000 records and its
#     neighbor one record away; 200,000 noisy releases from each are
#     histogrammed, and in every bin with enough mass the ratio of the two
#     empirical probabilities stays within e^epsilon times a statistical
#     margin; the exact Laplace density ratio, evaluated on a grid, must
#     reach e^epsilon and never exceed it (the bound is tight);
# (2) THE UTILITY, MEASURED: the mean absolute error of the release must
#     equal the scale b within 2 percent and the variance 2 b^2 within 5
#     percent, at epsilon 0.1, 0.5, 1, and 2;
# (3) SENSITIVITY: the largest change any single record can make to a
#     count, a sum of bounded values, a mean, and a median, computed by
#     trying every record and both extreme replacements, against the
#     global sensitivities 1, range, range / n, and range; the noise each
#     needs at epsilon 1 follows;
# (4) COMPOSITION, MEASURED: ten releases of the same count at epsilon
#     one tenth each; the adversary's log-likelihood ratio between the
#     neighbors, over 100,000 trials, never exceeds the composed epsilon
#     of one, and its spread is reported;
# (5) THE RIVALS, same database, same question "is this person's record
#     in the data": the Gaussian mechanism at (epsilon 1, delta 1e-5), on
#     one count and on fifty counts under one budget; randomized response
#     (local privacy, no trusted curator); exact release; and
#     uncalibrated noise with a fixed small standard deviation; scored by
#     mean absolute error and by a differencing attacker's success rate
#     at telling the neighbors apart, against the theorem that no attacker
#     beats e^epsilon / (1 + e^epsilon) for a pure epsilon mechanism.
#
# AUTHOR CORRECTION: the draft expected the Laplace mechanism to beat the
# Gaussian mechanism on the fifty-count batch as well as on the single
# count. Measured, the Gaussian's L2 calibration wins the batch (mean
# error 27 against 50) at the price of a delta; the page reports the
# crossover rather than a clean sweep.
import math
import random

SEED = 20261010
N = 1000
RANGE = 100.0


def laplace(rng, b):
    u = rng.random() - 0.5
    return -b * math.copysign(1.0, u) * math.log(1 - 2 * abs(u))


def laplace_density(x, mu, b):
    return math.exp(-abs(x - mu) / b) / (2 * b)


def make_database(rng, n=N):
    """n records: a sensitive bit and a bounded income-like value."""
    return [(1 if rng.random() < 0.3 else 0, rng.random() * RANGE) for _ in range(n)]


def count(db):
    return sum(r[0] for r in db)


def total(db):
    return sum(r[1] for r in db)


def mean(db):
    return total(db) / len(db)


def median(db):
    vals = sorted(r[1] for r in db)
    n = len(vals)
    return vals[n // 2] if n % 2 else 0.5 * (vals[n // 2 - 1] + vals[n // 2])


def local_sensitivity(db, query):
    """Largest change from replacing any one record with an extreme record."""
    base = query(db)
    worst = 0.0
    extremes = [(0, 0.0), (1, RANGE), (0, RANGE), (1, 0.0)]
    for i in range(len(db)):
        for e in extremes:
            alt = db[:i] + [e] + db[i + 1:]
            worst = max(worst, abs(query(alt) - base))
    return worst


def gaussian_sigma(delta_f, eps, delta):
    return delta_f * math.sqrt(2 * math.log(1.25 / delta)) / eps


def attacker_success(rng, release_D, release_Dp, trials, decide):
    """The adversary knows both neighbors, sees one release, guesses which.
    decide(x) returns True for D. Success rate over trials with a fair coin."""
    hits = 0
    for _ in range(trials):
        if rng.random() < 0.5:
            hits += decide(release_D())
        else:
            hits += not decide(release_Dp())
    return hits / trials


def main():
    rng = random.Random(SEED)
    db = make_database(rng)
    # the neighbor: one record flipped from 0 to 1 on the sensitive bit
    idx = next(i for i, r in enumerate(db) if r[0] == 0)
    db_p = db[:idx] + [(1, db[idx][1])] + db[idx + 1:]
    c, c_p = count(db), count(db_p)
    assert c_p == c + 1

    # Oracle 1: the guarantee at epsilon = 1.
    eps = 1.0
    b = 1.0 / eps
    draws = 200_000
    width = 0.5
    bins_D = {}
    bins_Dp = {}
    for _ in range(draws):
        x = c + laplace(rng, b)
        bins_D[math.floor(x / width)] = bins_D.get(math.floor(x / width), 0) + 1
        y = c_p + laplace(rng, b)
        bins_Dp[math.floor(y / width)] = bins_Dp.get(math.floor(y / width), 0) + 1
    worst_ratio = 0.0
    checked_bins = 0
    for k in set(bins_D) | set(bins_Dp):
        a, bb = bins_D.get(k, 0), bins_Dp.get(k, 0)
        if min(a, bb) >= 2000:
            checked_bins += 1
            worst_ratio = max(worst_ratio, a / bb, bb / a)
    # the statistical margin: three standard errors of a ratio of two
    # counts of at least 2,000 is about 3 * sqrt(2 / 2000) = 9.5 percent
    assert worst_ratio <= math.exp(eps) * 1.10, (worst_ratio, math.exp(eps))
    exact_max = 0.0
    for i in range(-400, 401):
        x = c + i * 0.05
        r = laplace_density(x, c, b) / laplace_density(x, c_p, b)
        exact_max = max(exact_max, r, 1 / r)
    assert abs(exact_max - math.exp(eps)) < 1e-9, (exact_max, math.exp(eps))

    # Oracle 2: the utility at four epsilons.
    utility = []
    for e in (0.1, 0.5, 1.0, 2.0):
        scale = 1.0 / e
        errs = [laplace(rng, scale) for _ in range(100_000)]
        mae = sum(abs(v) for v in errs) / len(errs)
        var = sum(v * v for v in errs) / len(errs)
        assert abs(mae - scale) < 0.02 * scale, (e, mae, scale)
        assert abs(var - 2 * scale * scale) < 0.05 * 2 * scale * scale, (e, var)
        utility.append((e, scale, mae, var))

    # Oracle 3: sensitivity.
    sens = {
        'count': (local_sensitivity(db, count), 1.0),
        'sum': (local_sensitivity(db, total), RANGE),
        'mean': (local_sensitivity(db, mean), RANGE / N),
        'median': (local_sensitivity(db, median), RANGE),
    }
    for name, (measured, global_) in sens.items():
        assert measured <= global_ + 1e-9, (name, measured, global_)
    assert abs(sens['count'][0] - 1.0) < 1e-9 and sens['mean'][0] > 0.99 * RANGE / N  # a record near an extreme comes within 1% of the global bound
    assert sens['sum'][0] > 0.99 * RANGE

    # Oracle 4: composition, ten releases at epsilon 0.1 each.
    k, e1 = 10, 0.1
    b1 = 1.0 / e1
    max_llr = 0.0
    llrs = []
    for _ in range(100_000):
        llr = 0.0
        for _ in range(k):
            x = c + laplace(rng, b1)
            llr += math.log(laplace_density(x, c, b1) / laplace_density(x, c_p, b1))
        llrs.append(llr)
        max_llr = max(max_llr, abs(llr))
    assert max_llr <= k * e1 + 1e-9, (max_llr, k * e1)
    llrs.sort()
    p99 = llrs[int(0.99 * len(llrs))]
    mean_llr = sum(llrs) / len(llrs)

    # Oracle 5: the rivals.
    delta = 1e-5
    sigma1 = gaussian_sigma(1.0, 1.0, delta)
    gauss_errs = [rng.gauss(0.0, sigma1) for _ in range(100_000)]
    gauss_mae = sum(abs(v) for v in gauss_errs) / len(gauss_errs)
    # fifty counting queries under one budget: Laplace splits epsilon by L1
    # sensitivity 50, Gaussian by L2 sensitivity sqrt(50)
    kq = 50
    lap_batch_mae = sum(abs(laplace(rng, kq / 1.0)) for _ in range(100_000)) / 100_000
    sigma_batch = gaussian_sigma(math.sqrt(kq), 1.0, delta)
    gauss_batch_mae = sum(abs(rng.gauss(0.0, sigma_batch)) for _ in range(100_000)) / 100_000
    assert gauss_mae > 3 * (1.0 / 1.0), gauss_mae
    assert gauss_batch_mae < lap_batch_mae, (gauss_batch_mae, lap_batch_mae)
    # randomized response at epsilon 1: keep the true bit with probability
    # e / (1 + e), flip otherwise; unbiased count estimate
    p_keep = math.exp(1.0) / (1 + math.exp(1.0))
    rr_errs = []
    for _ in range(2000):
        noisy = sum((bit if rng.random() < p_keep else 1 - bit) for bit, _ in db)
        est = (noisy - N * (1 - p_keep)) / (2 * p_keep - 1)
        rr_errs.append(abs(est - c))
    rr_mae = sum(rr_errs) / len(rr_errs)
    rr_theory = math.sqrt(N * p_keep * (1 - p_keep)) / (2 * p_keep - 1) * math.sqrt(2 / math.pi)
    assert abs(rr_mae - rr_theory) < 0.1 * rr_theory, (rr_mae, rr_theory)

    # the differencing attacker on one bit: sees the count release, knows D and D'
    trials = 100_000
    bound = math.exp(1.0) / (1 + math.exp(1.0))
    att_lap = attacker_success(rng, lambda: c + laplace(rng, 1.0), lambda: c_p + laplace(rng, 1.0), trials, lambda x: x < c + 0.5)
    att_lap_small = attacker_success(rng, lambda: c + laplace(rng, 10.0), lambda: c_p + laplace(rng, 10.0), trials, lambda x: x < c + 0.5)
    att_gauss = attacker_success(rng, lambda: c + rng.gauss(0, sigma1), lambda: c_p + rng.gauss(0, sigma1), trials, lambda x: x < c + 0.5)
    att_exact = attacker_success(rng, lambda: c, lambda: c_p, trials, lambda x: x < c + 0.5)
    att_naive = attacker_success(rng, lambda: c + rng.gauss(0, 0.3), lambda: c_p + rng.gauss(0, 0.3), trials, lambda x: x < c + 0.5)
    lap_theory = 1 - math.exp(-0.5) / 2  # 1/2 + TV/2 for two Laplace(1) one apart
    assert att_lap <= bound + 0.01 and abs(att_lap - lap_theory) < 0.01, (att_lap, bound, lap_theory)
    assert att_lap_small < 0.53 and att_exact == 1.0 and att_naive > 0.9, (att_lap_small, att_exact, att_naive)
    assert att_gauss < att_naive

    print('contest: a database of 1,000 records (a sensitive bit, a bounded value) and its neighbor one record away; the question "is this record in the data" asked of every release; one currency: mean absolute error of the released count, and a differencing attacker’s success at telling the neighbors apart')
    print(f'the guarantee at epsilon 1: {checked_bins} histogram bins with at least 2,000 of 200,000 releases each; worst empirical probability ratio {worst_ratio:.3f} against e^epsilon = {math.exp(eps):.3f}; exact Laplace density ratio peaks at {exact_max:.6f} and never above')
    print('utility: ' + '; '.join(f'epsilon {e}: scale {s:.1f}, mean absolute error {m:.3f}, variance {v:.2f} (2 b^2 = {2 * s * s:.2f})' for e, s, m, v in utility))
    print('sensitivity, measured over every record and extreme replacement vs global: ' + '; '.join(f'{k} {m:.3f} vs {g:.3f} (noise scale at epsilon 1: {g:.3f})' for k, (m, g) in sens.items()))
    print(f'composition: ten releases at epsilon 0.1: the adversary’s log-likelihood ratio never exceeded {max_llr:.4f} (bound {k * e1:.1f}); mean {mean_llr:.4f}, 99th percentile {p99:.4f} over 100,000 trials')
    print(f'{"mechanism":>40} {"guarantee":>18} {"MAE, 1 count":>13} {"MAE, 50 counts":>15} {"attacker":>9}')
    rows = [
        ('Laplace, epsilon 1', 'pure, epsilon 1', 1.0, lap_batch_mae, att_lap),
        ('Laplace, epsilon 0.1', 'pure, epsilon 0.1', 10.0, None, att_lap_small),
        ('Gaussian, epsilon 1, delta 1e-5', 'approximate', gauss_mae, gauss_batch_mae, att_gauss),
        ('randomized response, epsilon 1 (local)', 'pure, local', rr_mae, None, bound),
        ('exact release', 'none', 0.0, 0.0, att_exact),
        ('uncalibrated noise, std 0.3', 'none', 0.3 * math.sqrt(2 / math.pi), None, att_naive),
    ]
    for name, g, m1, m50, att in rows:
        print(f'{name:>40} {g:>18} {m1:>13.2f} {("-" if m50 is None else f"{m50:.2f}"):>15} {att:>9.3f}')
    print(f'the theorem: no attacker beats e^epsilon / (1 + e^epsilon) = {bound:.3f} against a pure epsilon-1 mechanism; the best test against Laplace(1) reaches {lap_theory:.3f}')
    print(f'OK: the Laplace mechanism met e^epsilon in every populated bin (worst ratio {worst_ratio:.3f} vs {math.exp(eps):.3f}) with the exact density ratio tight at {exact_max:.3f}; mean absolute error equals the scale b at four epsilons; '
          f'ten composed releases never exceeded the composed epsilon; the attacker succeeds {att_lap:.3f} of the time against Laplace (bound {bound:.3f}), {att_lap_small:.3f} at epsilon 0.1, {att_exact:.3f} against exact release, {att_naive:.3f} against uncalibrated noise; '
          f'Gaussian loses the single count ({gauss_mae:.2f} vs 1.00) and wins the fifty-count batch ({gauss_batch_mae:.1f} vs {lap_batch_mae:.1f})')


if __name__ == '__main__':
    main()
