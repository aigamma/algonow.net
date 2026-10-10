# Puzzle 184: Bonferroni correction x Family-wise error control
# Multiple testing: run m hypothesis tests at once and decide which to call
# significant so that the chance of ANY false claim across the whole
# family stays at alpha, whatever the tests' dependence. The algorithm is
# the correction itself: test each hypothesis at level alpha / m, or
# equivalently multiply each p-value by m and compare to alpha. The
# heuristic is the target: the family-wise error rate, P(at least one
# false rejection) <= alpha, guaranteed by the union bound
# P(A_1 or ... or A_m) <= P(A_1) + ... + P(A_m) = m (alpha / m) = alpha,
# which needs no assumption about how the tests relate. The price is
# power: every real effect must now clear alpha / m instead of alpha.
#
# Referees (alpha = 0.05 throughout, two-sided z-tests with p-values from
# the exact normal distribution function):
# (1) THE UNION BOUND, measured: families of m = 20, 100, and 1,000 true
#     nulls, thousands of repetitions each, under independence, under a
#     common positive factor (correlation 0.5), and under centering
#     (negative correlation): Bonferroni's family-wise error rate must be
#     at or below alpha in every setting (within Monte Carlo error);
#     under independence it must equal the exact 1 - (1 - alpha/m)^m, and
#     the Sidak correction 1 - (1 - alpha)^(1/m) must hit alpha exactly;
# (2) THE NESTING, checked per repetition as set inclusions: Holm's
#     step-down rejections contain Bonferroni's, and Benjamini-Hochberg's
#     step-up rejections contain Holm's, on every one of thousands of
#     families (the thresholds i alpha / m >= alpha / (m - i + 1) make this
#     a theorem, and the file asserts it);
# (3) POWER AND ITS PRICE: a family of 100 with 10 real effects of size
#     3.5 standard errors, and one of 1,000 with 50: the share of real
#     effects found by no correction, Bonferroni, Holm, and BH, the FDR of
#     each (BH's at alpha m0 / m, the theorem under independence), and the
#     FWER of BH, which is NOT controlled once real effects are present;
# (4) THE NEGATIVE EXAMPLES, measured: no correction at m = 100 (the
#     family-wise error rate near 1 - 0.95^100 = 0.994), and the look-
#     elsewhere effect: the smallest of m null p-values has median about
#     0.69 / m, so the best of twenty subgroup analyses looks significant
#     about two thirds of the time.
#
# AUTHOR CORRECTION: the draft expected positive correlation to break the
# Sidak correction. Measured, both Bonferroni and Sidak become
# conservative under the common factor (family-wise error well under
# alpha), which is Sidak's own 1967 inequality for the multivariate
# normal; nothing breaks, power is what is lost, and the page says so.
import math
import random

SEED = 20261010
ALPHA = 0.05


def p_two_sided(z):
    return math.erfc(abs(z) / math.sqrt(2))


def family(rng, m, m1, delta, dependence):
    """m z-statistics, the first m1 with mean delta; returns (z, is_null)."""
    if dependence == 'independent':
        z = [rng.gauss(0.0, 1.0) for _ in range(m)]
    elif dependence == 'common factor':
        f = rng.gauss(0.0, 1.0)
        r = 0.5
        z = [math.sqrt(r) * f + math.sqrt(1 - r) * rng.gauss(0.0, 1.0) for _ in range(m)]
    elif dependence == 'centered':
        raw = [rng.gauss(0.0, 1.0) for _ in range(m)]
        mean = sum(raw) / m
        scale = math.sqrt(m / (m - 1))
        z = [(v - mean) * scale for v in raw]
    else:
        raise ValueError(dependence)
    for i in range(m1):
        z[i] += delta
    return z, [i >= m1 for i in range(m)]


def reject_uncorrected(p, alpha):
    return {i for i, v in enumerate(p) if v <= alpha}


def reject_bonferroni(p, alpha):
    m = len(p)
    return {i for i, v in enumerate(p) if v <= alpha / m}


def reject_sidak(p, alpha):
    m = len(p)
    t = 1 - (1 - alpha) ** (1 / m)
    return {i for i, v in enumerate(p) if v <= t}


def reject_holm(p, alpha):
    m = len(p)
    order = sorted(range(m), key=lambda i: p[i])
    rejected = set()
    for k, i in enumerate(order):
        if p[i] <= alpha / (m - k):
            rejected.add(i)
        else:
            break
    return rejected


def reject_bh(p, alpha):
    m = len(p)
    order = sorted(range(m), key=lambda i: p[i])
    cutoff = -1
    for k, i in enumerate(order):
        if p[i] <= (k + 1) * alpha / m:
            cutoff = k
    return set(order[:cutoff + 1])


METHODS = {
    'no correction': reject_uncorrected,
    'Bonferroni': reject_bonferroni,
    'Sidak': reject_sidak,
    'Holm': reject_holm,
    'Benjamini-Hochberg': reject_bh,
}


def se(p, n):
    return math.sqrt(max(p * (1 - p), 1e-12) / n)


def run(rng, m, m1, delta, dependence, reps):
    stats = {name: {'fwer': 0, 'false': 0, 'true': 0, 'fdp': 0.0} for name in METHODS}
    nest_ok = True
    min_ps = []
    for _ in range(reps):
        z, is_null = family(rng, m, m1, delta, dependence)
        p = [p_two_sided(v) for v in z]
        min_ps.append(min(p))
        rej = {name: fn(p, ALPHA) for name, fn in METHODS.items()}
        if not (rej['Bonferroni'] <= rej['Holm'] <= rej['Benjamini-Hochberg']):
            nest_ok = False
        for name, r in rej.items():
            false = sum(1 for i in r if is_null[i])
            true = len(r) - false
            s = stats[name]
            s['fwer'] += false > 0
            s['false'] += false
            s['true'] += true
            s['fdp'] += (false / len(r)) if r else 0.0
    out = {}
    for name, s in stats.items():
        out[name] = {
            'fwer': s['fwer'] / reps,
            'power': (s['true'] / (m1 * reps)) if m1 else None,
            'fdr': s['fdp'] / reps,
            'false_per_family': s['false'] / reps,
        }
    min_ps.sort()
    return out, nest_ok, min_ps[len(min_ps) // 2]


def main():
    rng = random.Random(SEED)

    # Oracle 1: the union bound under three dependence structures.
    null_results = {}
    for m, reps in ((20, 3000), (100, 3000), (1000, 600)):
        for dep in ('independent', 'common factor', 'centered'):
            res, nest, med_min = run(rng, m, 0, 0.0, dep, reps)
            assert nest, (m, dep)
            null_results[(m, dep)] = (res, reps, med_min)
            b = res['Bonferroni']['fwer']
            assert b <= ALPHA + 2.5 * se(ALPHA, reps), (m, dep, b)
            if dep == 'independent':
                exact_b = 1 - (1 - ALPHA / m) ** m
                assert abs(b - exact_b) <= 3 * se(exact_b, reps), (m, b, exact_b)
                sd = res['Sidak']['fwer']
                assert abs(sd - ALPHA) <= 3 * se(ALPHA, reps), (m, sd)
                # Holm and BH equal Bonferroni's family-wise error under the
                # global null up to Monte Carlo noise, and no correction is
                # near 1 - 0.95^m
                nc = res['no correction']['fwer']
                assert abs(nc - (1 - (1 - ALPHA) ** m)) <= 3 * se(1 - (1 - ALPHA) ** m, reps) + 1e-9, (m, nc)
            else:
                # positive or negative dependence: the bound holds, conservatively
                assert res['Sidak']['fwer'] <= ALPHA + 2.5 * se(ALPHA, reps), (m, dep, res['Sidak']['fwer'])

    # Oracle 3: power and its price.
    mixed = {}
    for m, m1, reps in ((100, 10, 3000), (1000, 50, 600)):
        res, nest, _ = run(rng, m, m1, 3.5, 'independent', reps)
        assert nest, (m, m1)
        mixed[m] = (res, reps, m1)
        assert res['Bonferroni']['fwer'] <= ALPHA + 2.5 * se(ALPHA, reps), res['Bonferroni']['fwer']
        assert res['Holm']['fwer'] <= ALPHA + 2.5 * se(ALPHA, reps), res['Holm']['fwer']
        assert res['Holm']['power'] >= res['Bonferroni']['power']
        assert res['Benjamini-Hochberg']['power'] >= res['Holm']['power']
        assert res['no correction']['power'] > res['Benjamini-Hochberg']['power']
        fdr_theory = ALPHA * (m - m1) / m
        assert abs(res['Benjamini-Hochberg']['fdr'] - fdr_theory) <= 3 * math.sqrt(0.05 / reps) + 0.005, (res['Benjamini-Hochberg']['fdr'], fdr_theory)
        assert res['Benjamini-Hochberg']['fwer'] > ALPHA + 3 * se(ALPHA, reps), res['Benjamini-Hochberg']['fwer']

    # Oracle 4: the look-elsewhere effect: the median of the smallest of m
    # null p-values is 1 - 0.5^(1/m), about 0.69 / m.
    for m in (20, 100):
        _, reps, med_min = null_results[(m, 'independent')]
        theory = 1 - 0.5 ** (1 / m)
        assert abs(med_min - theory) <= 0.35 * theory, (m, med_min, theory)
    nc100 = null_results[(100, 'independent')][0]['no correction']['fwer']
    assert nc100 > 0.97, nc100
    nc20 = null_results[(20, 'independent')][0]['no correction']['fwer']

    print('contest: alpha 0.05, two-sided z-tests; referee: the exact binomial expectations of each rule, Monte Carlo standard errors, and set inclusions checked on every family; family-wise error = P(any false rejection), FDR = E[false rejections / rejections]')
    print(f'{"family":>26} {"dependence":>14} {"no correction":>13} {"Bonferroni":>10} {"Sidak":>7} {"Holm":>7} {"BH":>7}   (exact Bonferroni, exact Sidak)')
    for (m, dep), (res, reps, _) in null_results.items():
        exact_b = 1 - (1 - ALPHA / m) ** m
        print(f'{f"m = {m:,} all null, {reps:,} reps":>26} {dep:>14} {res["no correction"]["fwer"]:>13.3f} {res["Bonferroni"]["fwer"]:>10.4f} {res["Sidak"]["fwer"]:>7.4f} {res["Holm"]["fwer"]:>7.4f} {res["Benjamini-Hochberg"]["fwer"]:>7.4f}   ({exact_b:.4f}, {ALPHA:.4f}); se {se(ALPHA, reps):.4f}')
    print('nesting held on every family: Bonferroni rejections within Holm within Benjamini-Hochberg')
    for m, (res, reps, m1) in mixed.items():
        print(f'm = {m:,} with {m1} real effects of 3.5 standard errors, {reps:,} reps: ' + '; '.join(
            f'{name} power {r["power"]:.3f}, FWER {r["fwer"]:.3f}, FDR {r["fdr"]:.3f}' for name, r in res.items() if name != 'Sidak')
              + f'; BH FDR theorem alpha m0 / m = {ALPHA * (m - m1) / m:.3f}')
    med20 = null_results[(20, 'independent')][2]
    med100 = null_results[(100, 'independent')][2]
    print(f'look-elsewhere: the median smallest p-value among 20 nulls is {med20:.4f} (theory {1 - 0.5 ** (1 / 20):.4f}) and among 100 is {med100:.4f} (theory {1 - 0.5 ** (1 / 100):.4f}); '
          f'the best of 20 subgroups clears 0.05 in {nc20:.1%} of experiments, the best of 100 in {nc100:.1%}')
    b100 = null_results[(100, 'independent')][0]['Bonferroni']['fwer']
    cf100 = null_results[(100, 'common factor')][0]['Bonferroni']['fwer']
    print(f'OK: Bonferroni family-wise error {b100:.4f} at m = 100 independent (exact {1 - (1 - ALPHA / 100) ** 100:.4f}), {cf100:.4f} under a common factor, at or below alpha in all nine null settings; '
          f'Sidak exact at alpha under independence; nesting Bonferroni within Holm within BH on every family; with 10 real effects in 100, power Bonferroni {mixed[100][0]["Bonferroni"]["power"]:.3f}, Holm {mixed[100][0]["Holm"]["power"]:.3f}, BH {mixed[100][0]["Benjamini-Hochberg"]["power"]:.3f} '
          f'(BH FWER {mixed[100][0]["Benjamini-Hochberg"]["fwer"]:.3f}, FDR {mixed[100][0]["Benjamini-Hochberg"]["fdr"]:.3f}); no correction at m = 100 false-alarms {nc100:.1%} of the time')


if __name__ == '__main__':
    main()
