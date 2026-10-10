"""Shannon entropy estimation x Maximum likelihood plug-in (puzzle 195).

Estimate the entropy of an unknown distribution over k symbols from n
samples by plugging the empirical frequencies into Shannon's formula, and
measure exactly what that shortcut costs.

ORACLES. (1) Distributions with closed-form entropy: uniform (log2 k), Zipf
(computed from its probabilities), two-point. (2) The EXACT expectation of
the plug-in for any n: the estimate is a sum over symbols of a function of
each symbol's count, and each count is Binomial(n, p_i), so E[H_hat] is a
finite sum; a brute-force enumeration of every count vector on a tiny
alphabet confirms the formula to 1e-12, and every Monte Carlo mean must sit
within three standard errors of it. (3) Miller's first-order bias
(k - 1)/(2n) nats and Zahl's jackknife against the exact bias. (4) The
ideal-code-length identity against a Huffman code on the empirical counts.
(5) Plug-in mutual information of independent variables against the exact
and the (kx - 1)(ky - 1)/(2n) bias. (6) The undersampled collapse toward
log2 n.

AUTHOR CORRECTION: the draft claimed the plug-in's standard deviation shrinks
like one over the square root of n for every distribution. For the uniform
distribution the leading variance term vanishes (every log p_i is equal) and
the measured spread shrinks like one over n; the square-root law holds for
Zipf. The page says so.
"""
import heapq
import math
import random
from collections import Counter

LN2 = math.log(2)


def plugin_bits(counts):
    n = sum(counts)
    return math.log2(n) - sum(c * math.log2(c) for c in counts if c) / n


def miller_madow_bits(counts):
    n = sum(counts)
    k_hat = sum(1 for c in counts if c)
    return plugin_bits(counts) + (k_hat - 1) / (2 * n * LN2)


def jackknife_bits(counts):
    n = sum(counts)
    h = plugin_bits(counts)
    s = sum(c * math.log2(c) for c in counts if c)
    acc = 0.0
    for c in counts:
        if c:
            s_minus = s - c * math.log2(c) + ((c - 1) * math.log2(c - 1) if c > 1 else 0.0)
            acc += c * (math.log2(n - 1) - s_minus / (n - 1))
    return n * h - (n - 1) / n * acc


def true_bits(probs):
    return -sum(p * math.log2(p) for p in probs if p)


def zipf(k, s=1.0):
    w = [1 / i ** s for i in range(1, k + 1)]
    z = sum(w)
    return [x / z for x in w]


def sample_counts(cum, k, n, rng):
    c = Counter(rng.choices(range(k), cum_weights=cum, k=n))
    return [c.get(i, 0) for i in range(k)]


def exact_expected_plugin(probs, n):
    """E[-sum (c_i/n) log2(c_i/n)] with c_i ~ Binomial(n, p_i), summed over a
    window of twelve standard deviations around each mean (mass outside is
    below 1e-20)."""
    total = 0.0
    lg = math.lgamma
    lgn = lg(n + 1)
    for p in probs:
        if p <= 0:
            continue
        mu = n * p
        sd = math.sqrt(n * p * (1 - p))
        lo = max(1, int(mu - 12 * sd - 3))
        hi = min(n, int(mu + 12 * sd + 3))
        lp, lq = math.log(p), math.log1p(-p)
        for c in range(lo, hi + 1):
            pmf = math.exp(lgn - lg(c + 1) - lg(n - c + 1) + c * lp + (n - c) * lq)
            total -= pmf * (c / n) * math.log2(c / n)
    return total


def exact_expected_distinct(probs, n):
    return sum(1 - (1 - p) ** n for p in probs)


def enumerate_expected_plugin(probs, n):
    """Brute force over every count vector (independent check of the formula)."""
    k = len(probs)
    total = 0.0

    def rec(i, left, counts, logp):
        nonlocal total
        if i == k - 1:
            counts.append(left)
            lp = logp + left * math.log(probs[i]) - math.lgamma(left + 1)
            total += math.exp(lp + math.lgamma(n + 1)) * plugin_bits(counts)
            counts.pop()
            return
        for c in range(left + 1):
            counts.append(c)
            rec(i + 1, left - c, counts, logp + c * math.log(probs[i]) - math.lgamma(c + 1))
            counts.pop()

    rec(0, n, [], 0.0)
    return total


def huffman_mean_length(counts):
    heap = [(c, i, 0.0) for i, c in enumerate(counts) if c]  # (weight, tiebreak, summed lengths)
    heapq.heapify(heap)
    total_len = 0.0
    while len(heap) > 1:
        a = heapq.heappop(heap)
        b = heapq.heappop(heap)
        total_len += a[0] + b[0]  # every merged symbol gains one bit
        heapq.heappush(heap, (a[0] + b[0], min(a[1], b[1]), 0.0))
    return total_len / sum(counts)


def stats(xs):
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return m, math.sqrt(v), math.sqrt(v / len(xs))


if __name__ == '__main__':
    rng = random.Random(20261010)
    checks = 0
    bound_checks = 0

    # 1. the exact-expectation formula against brute force on a tiny alphabet
    tiny = [0.4, 0.3, 0.2, 0.1]
    e_formula = exact_expected_plugin(tiny, 8)
    e_brute = enumerate_expected_plugin(tiny, 8)
    assert abs(e_formula - e_brute) < 1e-12, (e_formula, e_brute)
    assert e_formula < true_bits(tiny)  # Jensen: the plug-in is biased low
    print(f'exact E[H_hat] on a 4-symbol alphabet at n = 8: formula {e_formula:.6f} = brute force {e_brute:.6f} bits; truth {true_bits(tiny):.6f}')

    # 2. the sweep: uniform and Zipf over 100 symbols, n from 10 to 10,000
    K = 100
    dists = {'uniform': [1 / K] * K, 'zipf': zipf(K)}
    NS = [10, 30, 100, 300, 1000, 3000, 10000]
    results = {}
    print('\n dist      n   truth   exact E[ML]   MC mean     bias   Miller 1st   sd(ML)   MM bias   JK bias')
    for name, probs in dists.items():
        cum = list(__import__('itertools').accumulate(probs))
        truth = true_bits(probs)
        for n in NS:
            reps = 200 if n <= 1000 else 120
            ml, mm, jk = [], [], []
            for _ in range(reps):
                counts = sample_counts(cum, K, n, rng)
                h = plugin_bits(counts)
                distinct = sum(1 for c in counts if c)
                assert h <= math.log2(distinct) + 1e-9  # never above log of what was seen
                bound_checks += 1
                ml.append(h)
                mm.append(miller_madow_bits(counts))
                jk.append(jackknife_bits(counts))
            m, sd, se = stats(ml)
            exact = exact_expected_plugin(probs, n)
            exact_mm = exact + (exact_expected_distinct(probs, n) - 1) / (2 * n * LN2)
            miller = -(K - 1) / (2 * n * LN2)
            mmm = stats(mm)
            jkm = stats(jk)
            assert abs(m - exact) <= 3 * se + 1e-9, (name, n, m, exact, se)
            assert abs(mmm[0] - exact_mm) <= 3 * mmm[2] + 1e-9, (name, n, mmm[0], exact_mm)
            assert exact < truth
            checks += 3
            results[(name, n)] = dict(truth=truth, exact=exact, mean=m, sd=sd, se=se, miller=miller,
                                      mm=mmm[0] - truth, jk=jkm[0] - truth, exact_mm=exact_mm - truth)
            print(f' {name:7s} {n:6d}  {truth:.4f}   {exact:.4f}      {m:.4f}   {exact - truth:+.4f}   {miller:+.4f}   {sd:.4f}   {mmm[0] - truth:+.4f}   {jkm[0] - truth:+.4f}')
    # the first-order formula and the exact bias agree once n is large against k
    for name in dists:
        for n in (3000, 10000):
            r = results[(name, n)]
            assert abs((r['exact'] - r['truth']) - r['miller']) <= 0.05 * abs(r['miller']), (name, n, r)
            checks += 1
        r1, r10 = results[(name, 1000)], results[(name, 10000)]
        ratio = (r1['exact'] - r1['truth']) / (r10['exact'] - r10['truth'])
        assert 8.0 <= ratio <= 12.0, ratio  # bias shrinks like 1/n
        for n in (1000, 3000, 10000):
            r = results[(name, n)]
            assert abs(r['mm']) < abs(r['exact'] - r['truth']) and abs(r['jk']) < abs(r['exact'] - r['truth']), (name, n, r)
            checks += 1
    sd_ratio_zipf = results[('zipf', 1000)]['sd'] / results[('zipf', 10000)]['sd']
    sd_ratio_unif = results[('uniform', 1000)]['sd'] / results[('uniform', 10000)]['sd']
    assert 2.3 <= sd_ratio_zipf <= 4.3, sd_ratio_zipf  # one over root n
    assert sd_ratio_unif > 6.0, sd_ratio_unif  # the uniform leading term vanishes: one over n
    checks += 2
    # the undersampled collapse: n = 10 against 100 symbols
    r = results[('uniform', 10)]
    assert r['exact'] - r['truth'] < -2.5 and r['mm'] < -1.0 and r['jk'] < -1.0, r
    assert abs(r['exact'] - math.log2(10)) < 0.25, r['exact']
    checks += 2
    print(f'\nundersampled: 100 equiprobable symbols, n = 10: truth {r["truth"]:.3f} bits, E[plug-in] {r["exact"]:.3f} (log2 10 = {math.log2(10):.3f}), Miller-Madow {r["truth"] + r["mm"]:.3f}, jackknife {r["truth"] + r["jk"]:.3f}')
    print(f'bias ratios n = 1,000 against 10,000: uniform {(results[("uniform", 1000)]["exact"] - results[("uniform", 1000)]["truth"]) / (results[("uniform", 10000)]["exact"] - results[("uniform", 10000)]["truth"]):.2f}, zipf {ratio:.2f}; sd ratios uniform {sd_ratio_unif:.2f}, zipf {sd_ratio_zipf:.2f} (root ten = {math.sqrt(10):.2f})')
    u1 = results[('uniform', 1000)]
    print(f'corrections at n = 1,000, uniform: plug-in bias {u1["exact"] - u1["truth"]:+.5f}, Miller-Madow {u1["mm"]:+.5f} (exact {u1["exact_mm"]:+.5f}), jackknife {u1["jk"]:+.5f} bits')

    # 3. the code-length identity on one Zipf sample
    cum = list(__import__('itertools').accumulate(dists['zipf']))
    counts = sample_counts(cum, K, 10000, rng)
    h = plugin_bits(counts)
    ideal = sum(c * math.log2(10000 / c) for c in counts if c) / 10000
    huff = huffman_mean_length(counts)
    assert abs(ideal - h) < 1e-9 and h <= huff < h + 1
    checks += 2
    print(f'\ncode length: plug-in {h:.4f} bits per symbol = ideal code length {ideal:.4f}; Huffman on the counts {huff:.4f} (truth {true_bits(dists["zipf"]):.4f})')

    # 4. plug-in mutual information of two independent uniform variables
    kx = ky = 10
    n_mi = 1000
    reps = 300
    joint = [1 / (kx * ky)] * (kx * ky)
    exact_mi = 2 * exact_expected_plugin([1 / kx] * kx, n_mi) - exact_expected_plugin(joint, n_mi)
    first_order = (kx - 1) * (ky - 1) / (2 * n_mi * LN2)
    mis = []
    for _ in range(reps):
        xs = [rng.randrange(kx) for _ in range(n_mi)]
        ys = [rng.randrange(ky) for _ in range(n_mi)]
        cx = Counter(xs)
        cy = Counter(ys)
        cxy = Counter(zip(xs, ys))
        mis.append(plugin_bits(list(cx.values())) + plugin_bits(list(cy.values())) - plugin_bits(list(cxy.values())))
    mi_mean, mi_sd, mi_se = stats(mis)
    assert abs(mi_mean - exact_mi) <= 3 * mi_se and mi_mean > 5 * mi_se
    assert abs(exact_mi - first_order) <= 0.1 * first_order
    checks += 2
    print(f'mutual information of independent variables (10 x 10, n = 1,000): true 0, plug-in mean {mi_mean:.4f} +/- {mi_se:.4f} bits, exact E {exact_mi:.4f}, first order {first_order:.4f}')

    # 5. the negative example: a heavy tail with n of the order of k
    big = zipf(2000)
    truth_big = true_bits(big)
    cum_big = list(__import__('itertools').accumulate(big))
    neg = {}
    for n in (2000, 20000):
        exact = exact_expected_plugin(big, n)
        seen = exact_expected_distinct(big, n)
        exact_mm = exact + (seen - 1) / (2 * n * LN2)
        jks = [jackknife_bits(sample_counts(cum_big, 2000, n, rng)) for _ in range(20)]
        neg[n] = (exact - truth_big, exact_mm - truth_big, stats(jks)[0] - truth_big, seen)
        print(f'heavy tail, 2,000 symbols, n = {n:,}: truth {truth_big:.3f} bits, plug-in {exact:.3f} ({exact - truth_big:+.3f}), Miller-Madow {exact_mm - truth_big:+.3f}, jackknife {neg[n][2]:+.3f}; symbols ever seen {seen:.0f} of 2,000')
    assert neg[2000][0] < -0.5 and neg[2000][1] < -0.2 and neg[2000][2] < -0.1
    assert abs(neg[20000][0]) < abs(neg[2000][0]) / 3
    checks += 2

    print(f'\nOK: Monte Carlo means within three standard errors of the exact expectation on all 14 (distribution, n) cells; the plug-in never above log2 of the symbols seen in {bound_checks:,} samples; '
          f'bias {results[("uniform", 10000)]["exact"] - results[("uniform", 10000)]["truth"]:+.5f} bits at n = 10,000 against Miller {results[("uniform", 10000)]["miller"]:+.5f}; '
          f'at n = 10 the plug-in collapses to {results[("uniform", 10)]["exact"]:.2f} bits for a truth of {results[("uniform", 10)]["truth"]:.2f}; '
          f'Huffman {huff:.3f} within one bit above the plug-in {h:.3f}; '
          f'independent variables show {mi_mean:.4f} bits of plug-in mutual information; '
          f'the heavy tail at n = k is {neg[2000][0]:+.2f} bits low; {checks} assertions')
