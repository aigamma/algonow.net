# Puzzle 179: Kernel density estimation x Silverman bandwidth
# Density estimation: from a sample of n numbers, recover the probability
# density they were drawn from, as a smooth curve, with no parametric
# family assumed. The algorithm is the kernel density estimate
# (Rosenblatt 1956, Parzen 1962): center a small bump, here a Gaussian of
# width h, on every observation and average the bumps. The heuristic is
# Silverman's rule of thumb (1986) for the one number that matters, the
# bandwidth h: 0.9 min(s, IQR / 1.34) n^(-1/5), the bandwidth that would
# be optimal if the data were Gaussian, made robust with the interquartile
# range and shrunk a little so a non-Gaussian shape is not smoothed away.
# Too small an h gives a spiky estimate that follows the sample; too
# large gives a blur that hides the shape; the rule puts h in the right
# place for most unimodal data in one line of arithmetic.
#
# Referees (every density is a Gaussian mixture, so the integrated squared
# error against the TRUE density is an exact closed form, not a numerical
# integral):
# (1) THE ORACLE BANDWIDTH: on three Marron-Wand test densities (Gaussian,
#     skewed unimodal, separated bimodal), the bandwidth that minimizes the
#     exact ISE is found by a grid search for each sample; Silverman's h,
#     Scott's normal-reference h, and least-squares cross-validation are
#     scored by their ISE as a multiple of the oracle's;
# (2) THE RATES: Silverman's h shrinks as n^(-1/5) by construction, and
#     the ISE of the resulting estimate must fall near the n^(-4/5) rate
#     of the theory, measured on log-log slopes across n = 50 to 800;
# (3) THE KNOWN FAILURE: on the separated bimodal density the sample
#     standard deviation is dominated by the gap between the modes, so the
#     rule oversmooths; its h must exceed the oracle's by a factor and its
#     ISE must be worse than cross-validation's, which adapts;
# (4) THE RIVAL ESTIMATOR: a histogram with Freedman-Diaconis and Sturges
#     bin widths, its ISE also exact, against the kernel estimate on every
#     density;
# (5) THE NEGATIVE EXAMPLE, measured: a fixed small bandwidth (the spiky
#     estimate that looks "detailed") and a fixed large one (the blur), as
#     multiples of the oracle ISE.
#
# AUTHOR CORRECTIONS: the draft expected cross-validation to beat the rule
# of thumb on every density. Measured, cross-validation wins where the
# rule's Gaussian assumption fails (the separated bimodal density, by a
# factor of five) and loses on the Gaussian itself, where its
# sample-to-sample variance costs more than the rule's small bias. The
# draft also expected the kernel estimate to beat the histogram on every
# density; on the separated bimodal density the oversmoothed rule-of-thumb
# estimate loses even to a ten-bin histogram, which the page reports as
# the failure it is. And the measured slope of the rule's bandwidth
# against n sits a little above -1/5, because the scale estimate
# min(s, IQR / 1.34) is biased low at small n; the tolerance says so.
import math
import random

SEED = 20261010
SQRT_2PI = math.sqrt(2 * math.pi)
SQRT_2 = math.sqrt(2)

# Marron and Wand (1992) densities 1, 2, and 7: (weight, mean, sd)
DENSITIES = {
    'Gaussian': [(1.0, 0.0, 1.0)],
    'skewed unimodal': [(1 / 5, 0.0, 1.0), (1 / 5, 1 / 2, 2 / 3), (3 / 5, 13 / 12, 5 / 9)],
    'separated bimodal': [(1 / 2, -3 / 2, 1 / 2), (1 / 2, 3 / 2, 1 / 2)],
}
H_GRID = [0.03 * (1.5 / 0.03) ** (i / 29) for i in range(30)]  # 30 bandwidths, log-spaced


def phi(x, mu, s):
    z = (x - mu) / s
    return math.exp(-0.5 * z * z) / (s * SQRT_2PI)


def Phi(x, mu, s):
    return 0.5 * (1 + math.erf((x - mu) / (s * SQRT_2)))


def pdf(mix, x):
    return sum(w * phi(x, mu, s) for w, mu, s in mix)


def sample(mix, n, rng):
    out = []
    for _ in range(n):
        r = rng.random()
        acc = 0.0
        for w, mu, s in mix:
            acc += w
            if r <= acc:
                out.append(rng.gauss(mu, s))
                break
        else:
            w, mu, s = mix[-1]
            out.append(rng.gauss(mu, s))
    return out


def int_f_squared(mix):
    return sum(wk * wl * phi(mk - ml, 0.0, math.sqrt(sk * sk + sl * sl)) for wk, mk, sk in mix for wl, ml, sl in mix)


class Sample:
    """A sample with its pairwise distances precomputed, so every bandwidth
    in a grid search costs one pass over the n(n - 1) / 2 distances."""

    def __init__(self, xs, mix):
        self.xs = xs
        self.n = len(xs)
        self.mix = mix
        self.diffs = [abs(xs[i] - xs[j]) for i in range(self.n) for j in range(i + 1, self.n)]
        self.f2 = int_f_squared(mix)
        srt = sorted(xs)
        mean = sum(xs) / self.n
        self.sd = math.sqrt(sum((x - mean) ** 2 for x in xs) / (self.n - 1))
        self.iqr = srt[int(0.75 * (self.n - 1))] - srt[int(0.25 * (self.n - 1))]

    def int_fhat_squared(self, h):
        s = h * SQRT_2
        total = self.n * phi(0.0, 0.0, s) + 2 * sum(phi(d, 0.0, s) for d in self.diffs)
        return total / (self.n * self.n)

    def int_fhat_f(self, h):
        total = 0.0
        for w, mu, sd in self.mix:
            s = math.sqrt(h * h + sd * sd)
            total += w * sum(phi(x, mu, s) for x in self.xs)
        return total / self.n

    def ise(self, h):
        """Exact integrated squared error of the Gaussian KDE at bandwidth h."""
        return self.int_fhat_squared(h) - 2 * self.int_fhat_f(h) + self.f2

    def lscv(self, h):
        """Least-squares cross-validation criterion (Rudemo 1982, Bowman 1984):
        an unbiased estimate of ISE minus the constant integral of f squared."""
        leave_one_out = 2 * sum(phi(d, 0.0, h) for d in self.diffs)  # sum over i != j of K_h(x_i - x_j)
        return self.int_fhat_squared(h) - 2 * leave_one_out / (self.n * (self.n - 1))

    def silverman(self):
        return 0.9 * min(self.sd, self.iqr / 1.34) * self.n ** (-1 / 5)

    def scott(self):
        return 1.06 * self.sd * self.n ** (-1 / 5)

    def oracle(self):
        return min(H_GRID, key=self.ise)

    def cross_validated(self):
        return min(H_GRID, key=self.lscv)

    def histogram_ise(self, rule):
        lo, hi = min(self.xs), max(self.xs)
        if rule == 'Freedman-Diaconis':
            width = 2 * self.iqr * self.n ** (-1 / 3)
        else:  # Sturges
            width = (hi - lo) / (math.ceil(math.log2(self.n)) + 1)
        bins = max(1, math.ceil((hi - lo) / width))
        width = (hi - lo) / bins
        counts = [0] * bins
        for x in self.xs:
            counts[min(bins - 1, int((x - lo) / width))] += 1
        ise = self.f2
        for b, c in enumerate(counts):
            a, z = lo + b * width, lo + (b + 1) * width
            height = c / (self.n * width)
            mass = sum(w * (Phi(z, mu, s) - Phi(a, mu, s)) for w, mu, s in self.mix)
            ise += height * height * width - 2 * height * mass
        return ise, bins


def kde_on_grid(xs, h, grid):
    n = len(xs)
    return [sum(phi(g, x, h) for x in xs) / n for g in grid]


def slope(xs, ys):
    lx = [math.log(x) for x in xs]
    ly = [math.log(y) for y in ys]
    mx, my = sum(lx) / len(lx), sum(ly) / len(ly)
    return sum((a - mx) * (b - my) for a, b in zip(lx, ly)) / sum((a - mx) ** 2 for a in lx)


def main():
    rng = random.Random(SEED)
    n = 300
    rows = {}
    for name, mix in DENSITIES.items():
        S = Sample(sample(mix, n, rng), mix)
        h_or, h_sil, h_sc, h_cv = S.oracle(), S.silverman(), S.scott(), S.cross_validated()
        ise_or = S.ise(h_or)
        row = {
            'h': {'oracle': h_or, 'Silverman': h_sil, 'Scott': h_sc, 'LSCV': h_cv},
            'ise': {'oracle': ise_or, 'Silverman': S.ise(h_sil), 'Scott': S.ise(h_sc), 'LSCV': S.ise(h_cv),
                    'h = 0.03': S.ise(0.03), 'h = 1.5': S.ise(1.5)},
            'sd': S.sd, 'iqr': S.iqr,
        }
        for rule in ('Freedman-Diaconis', 'Sturges'):
            ise, bins = S.histogram_ise(rule)
            row['ise'][f'histogram, {rule}'] = ise
            row[f'bins {rule}'] = bins
        # the estimate is a density: nonnegative and integrating to one on a wide grid
        grid = [-6 + 12 * i / 1200 for i in range(1201)]
        vals = kde_on_grid(S.xs, h_sil, grid)
        assert min(vals) >= 0 and abs(sum(vals) * 0.01 - 1) < 2e-3, sum(vals) * 0.01
        rows[name] = row
    g, sk, bi = rows['Gaussian'], rows['skewed unimodal'], rows['separated bimodal']

    print('contest: a sample of 300 from each of three Marron-Wand densities (Gaussian; skewed unimodal; separated bimodal), one Gaussian kernel estimate per bandwidth rule; referee: the exact integrated squared error against the true density (closed form, since every density is a Gaussian mixture), the oracle bandwidth found by a 30-point grid search')
    print(f'{"density":>18} {"sd":>5} {"IQR":>5} | {"h oracle":>8} {"Silverman":>9} {"Scott":>6} {"LSCV":>6} | ISE as a multiple of the oracle')
    for name, row in rows.items():
        h, ise = row['h'], row['ise']
        o = ise['oracle']
        print(f'{name:>18} {row["sd"]:>5.2f} {row["iqr"]:>5.2f} | {h["oracle"]:>8.3f} {h["Silverman"]:>9.3f} {h["Scott"]:>6.3f} {h["LSCV"]:>6.3f} | '
              f'Silverman {ise["Silverman"] / o:.2f}x, Scott {ise["Scott"] / o:.2f}x, LSCV {ise["LSCV"] / o:.2f}x, '
              f'histogram FD {ise["histogram, Freedman-Diaconis"] / o:.2f}x ({row["bins Freedman-Diaconis"]} bins), Sturges {ise["histogram, Sturges"] / o:.2f}x ({row["bins Sturges"]} bins), '
              f'h = 0.03 {ise["h = 0.03"] / o:.1f}x, h = 1.5 {ise["h = 1.5"] / o:.1f}x; oracle ISE {o:.4f}')

    # Oracle 1: on the Gaussian, the rule of thumb is close to the oracle.
    assert 0.6 < g['h']['Silverman'] / g['h']['oracle'] < 1.3, (g['h'])
    assert g['ise']['Silverman'] < 1.25 * g['ise']['oracle'], (g['ise'])
    assert g['ise']['Scott'] < 1.25 * g['ise']['oracle']
    # Oracle 3: the separated bimodal density is oversmoothed by the rule.
    assert bi['h']['Silverman'] > 1.5 * bi['h']['oracle'], (bi['h'])
    assert bi['ise']['Silverman'] > 1.5 * bi['ise']['oracle']
    assert bi['ise']['LSCV'] < bi['ise']['Silverman'] and bi['h']['LSCV'] < bi['h']['Silverman']
    # the author correction: cross-validation loses to the rule on the Gaussian
    assert g['ise']['LSCV'] > g['ise']['Silverman'], (g['ise'])
    # Oracle 4: the histogram loses to the kernel estimate where the rule is
    # sound (the unimodal densities); on the separated bimodal density the
    # oversmoothed estimate can lose even to a histogram, the failure reported
    for name in ('Gaussian', 'skewed unimodal'):
        row = rows[name]
        assert row['ise']['histogram, Freedman-Diaconis'] > row['ise']['Silverman'], name
        assert row['ise']['histogram, Sturges'] > row['ise']['Silverman'], name
    for name, row in rows.items():
        assert row['ise']['histogram, Freedman-Diaconis'] > row['ise']['oracle'] and row['ise']['histogram, Sturges'] > row['ise']['oracle'], name
    # Oracle 5: both fixed bandwidths are far worse than the oracle.
    for name, row in rows.items():
        assert row['ise']['h = 0.03'] > 3 * row['ise']['oracle'], name
        assert row['ise']['h = 1.5'] > 2 * row['ise']['oracle'], name

    # Oracle 2: the rates on the Gaussian density, twelve samples per size.
    sizes = [50, 100, 200, 400, 800]
    mean_h, mean_ise = [], []
    for m in sizes:
        hs, ises = [], []
        for k in range(12):
            S = Sample(sample(DENSITIES['Gaussian'], m, random.Random(SEED + 1000 * m + k)), DENSITIES['Gaussian'])
            h = S.silverman()
            hs.append(h)
            ises.append(S.ise(h))
        mean_h.append(sum(hs) / 12)
        mean_ise.append(sum(ises) / 12)
    slope_h = slope(sizes, mean_h)
    slope_ise = slope(sizes, mean_ise)
    print('rates on the Gaussian density (twelve samples per n): ' + ', '.join(f'n = {m}: h {hh:.3f}, ISE {ii:.4f}' for m, hh, ii in zip(sizes, mean_h, mean_ise)))
    print(f'log-log slopes: bandwidth {slope_h:.3f} (theory -0.200), ISE {slope_ise:.3f} (theory -0.800 at the optimal rate)')
    # the scale estimate min(sd, IQR / 1.34) is noisier and biased low at small
    # n, which flattens the measured slope a little above the exact -1/5
    assert abs(slope_h + 0.2) < 0.05, slope_h
    assert -1.05 < slope_ise < -0.55, slope_ise

    print(f'OK: Silverman within {g["ise"]["Silverman"] / g["ise"]["oracle"]:.2f}x of the oracle ISE on the Gaussian (h {g["h"]["Silverman"]:.3f} against {g["h"]["oracle"]:.3f}) and {sk["ise"]["Silverman"] / sk["ise"]["oracle"]:.2f}x on the skewed density; '
          f'on the separated bimodal it oversmooths, h {bi["h"]["Silverman"]:.3f} against the oracle {bi["h"]["oracle"]:.3f} for {bi["ise"]["Silverman"] / bi["ise"]["oracle"]:.2f}x the ISE, where cross-validation reaches {bi["ise"]["LSCV"] / bi["ise"]["oracle"]:.2f}x; '
          f'histograms {g["ise"]["histogram, Freedman-Diaconis"] / g["ise"]["oracle"]:.2f}x to {max(r["ise"]["histogram, Sturges"] / r["ise"]["oracle"] for r in rows.values()):.2f}x; '
          f'bandwidth slope {slope_h:.3f}, ISE slope {slope_ise:.3f}')


if __name__ == '__main__':
    main()
