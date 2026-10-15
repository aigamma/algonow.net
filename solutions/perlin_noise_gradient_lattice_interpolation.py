# Puzzle 191: Perlin noise x Gradient lattice interpolation
# Procedural texturing: natural-looking variation at every point of a
# surface, computed on demand, smooth at every scale, with no image stored.
# Perlin noise (1985; the 2002 form is used here) hashes every integer
# lattice point to a pseudo-random unit GRADIENT through a seeded permutation
# table; the noise is zero at every lattice point, and inside a cell it
# blends the four corner gradients dotted with the offsets to the corners.
# The heuristic is that gradient lattice interpolation: zero at the lattice,
# slopes prescribed by the gradients, and the quintic fade 6t^5 - 15t^4 +
# 10t^3, whose first and second derivatives vanish at both ends, so cells
# join with continuous slope and curvature. The asserts are the referees.
#
# AUTHOR CORRECTIONS: the draft wrote the range as [-1, 1], the scaled range
# most implementations present; the raw bound measured is sqrt(2)/2 =
# 0.7071, attained exactly in the inward and outward cells. The draft also
# called the noise band-pass; along a generic line about two fifths of the
# power sits below a quarter cycle per cell, because each cell carries a
# random mean. A small nonzero high-frequency tail also rules out a strict
# band limit; this is smooth, predominantly low-frequency noise.
import math
import random
import time

SEED = 20261010
HALF_ROOT_TWO = math.sqrt(0.5)
GRADS = ((1.0, 0.0), (-1.0, 0.0), (0.0, 1.0), (0.0, -1.0),
         (HALF_ROOT_TWO, HALF_ROOT_TWO), (-HALF_ROOT_TWO, HALF_ROOT_TWO),
         (HALF_ROOT_TWO, -HALF_ROOT_TWO), (-HALF_ROOT_TWO, -HALF_ROOT_TWO))


def fade_quintic(t):
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def fade_cubic(t):
    return t * t * (3.0 - 2.0 * t)


def fade_linear(t):
    return t


class Lattice:
    """Seeded permutation table hashing grid points to gradients or values; wraps at 256."""

    def __init__(self, seed):
        rng = random.Random(seed)
        p = list(range(256))
        rng.shuffle(p)
        self.p = p + p
        self.corners = 0  # corner gradients or values fetched (the work currency)

    def hash(self, i, j):
        return self.p[self.p[i & 255] + (j & 255)]

    def gradient(self, i, j):
        self.corners += 1
        return GRADS[self.hash(i, j) & 7]

    def value(self, i, j):
        self.corners += 1
        return self.hash(i, j) / 127.5 - 1.0

    def perlin(self, x, y, fade=fade_quintic):
        xi, yi = math.floor(x), math.floor(y)
        tx, ty = x - xi, y - yi
        g00, g10, g01, g11 = self.gradient(xi, yi), self.gradient(xi + 1, yi), self.gradient(xi, yi + 1), self.gradient(xi + 1, yi + 1)
        n00 = g00[0] * tx + g00[1] * ty
        n10 = g10[0] * (tx - 1.0) + g10[1] * ty
        n01 = g01[0] * tx + g01[1] * (ty - 1.0)
        n11 = g11[0] * (tx - 1.0) + g11[1] * (ty - 1.0)
        u, v = fade(tx), fade(ty)
        nx0 = n00 + u * (n10 - n00)
        nx1 = n01 + u * (n11 - n01)
        return nx0 + v * (nx1 - nx0)

    def value_noise(self, x, y, fade=fade_quintic):
        xi, yi = math.floor(x), math.floor(y)
        u, v = fade(x - xi), fade(y - yi)
        c00, c10, c01, c11 = self.value(xi, yi), self.value(xi + 1, yi), self.value(xi, yi + 1), self.value(xi + 1, yi + 1)
        nx0 = c00 + u * (c10 - c00)
        nx1 = c01 + u * (c11 - c01)
        return nx0 + v * (nx1 - nx0)

    def white(self, x, y):  # one hashed value per sample; neighbors share nothing
        a, b = int(x * 16.0), int(y * 16.0)
        return ((self.hash(a, b) ^ (a * 7 + b * 13)) & 255) / 127.5 - 1.0

    def fbm(self, x, y, octaves, persistence=0.5, lacunarity=2.0):
        total, amp, freq, norm = 0.0, 1.0, 1.0, 0.0
        for _ in range(octaves):
            total += amp * self.perlin(x * freq, y * freq)
            norm += amp
            amp *= persistence
            freq *= lacunarity
        return total / norm


F2 = 0.5 * (math.sqrt(3.0) - 1.0)
G2 = (3.0 - math.sqrt(3.0)) / 6.0


def simplex(lat, x, y):
    """2-D simplex noise (Perlin 2001): skew the plane into equilateral
    triangles; sum a radially faded gradient kernel from the three corners."""
    s = (x + y) * F2
    i, j = math.floor(x + s), math.floor(y + s)
    t = (i + j) * G2
    x0, y0 = x - (i - t), y - (j - t)
    i1, j1 = (1, 0) if x0 > y0 else (0, 1)
    n = 0.0
    for dx, dy, di, dj in ((x0, y0, 0, 0), (x0 - i1 + G2, y0 - j1 + G2, i1, j1), (x0 - 1.0 + 2.0 * G2, y0 - 1.0 + 2.0 * G2, 1, 1)):
        g = lat.gradient(i + di, j + dj)
        a = 0.5 - dx * dx - dy * dy
        if a > 0.0:
            a *= a
            n += a * a * (g[0] * dx + g[1] * dy)
    return 70.0 * n


def fft(xs):
    n = len(xs)
    if n == 1:
        return [complex(xs[0])]
    even, odd = fft(xs[0::2]), fft(xs[1::2])
    out = [0j] * n
    for k in range(n // 2):
        w = complex(math.cos(-2.0 * math.pi * k / n), math.sin(-2.0 * math.pi * k / n)) * odd[k]
        out[k], out[k + n // 2] = even[k] + w, even[k] - w
    return out


def power_spectrum(samples):
    return [abs(c) ** 2 for c in fft(samples)][: len(samples) // 2 + 1]


def spectrum_bands(power, per_cell):
    """Power below 1/4, between 1/4 and 2, and above 2 cycles per cell, plus
    the median frequency."""
    n = 2 * (len(power) - 1)
    total = sum(power)
    freqs = [k * per_cell / n for k in range(len(power))]
    low = sum(p for p, f in zip(power, freqs) if f < 0.25) / total
    mid = sum(p for p, f in zip(power, freqs) if 0.25 <= f <= 2.0) / total
    high = sum(p for p, f in zip(power, freqs) if f > 2.0) / total
    acc = 0.0
    for p, f in zip(power, freqs):
        acc += p
        if acc >= total / 2.0:
            return low, mid, high, f
    return low, mid, high, freqs[-1]


def lag_one(samples):
    m = sum(samples) / len(samples)
    return sum((a - m) * (b - m) for a, b in zip(samples, samples[1:])) / sum((a - m) ** 2 for a in samples)


def zero_crossings(samples):
    return sum(1 for a, b in zip(samples, samples[1:]) if (a < 0.0) != (b < 0.0))


def slope_jump(f, x, y, h):  # one-sided slopes meeting at the border x
    return abs((f(x + h, y) - f(x, y)) / h - (f(x, y) - f(x - h, y)) / h)


def curvature_jump(f, x, y, h):
    left = (f(x, y) - 2.0 * f(x - h, y) + f(x - 2.0 * h, y)) / (h * h)
    right = (f(x + 2.0 * h, y) - 2.0 * f(x + h, y) + f(x, y)) / (h * h)
    return abs(right - left)


def main():
    rng = random.Random(SEED)
    lat = Lattice(SEED)
    t0 = time.perf_counter()

    # (1) zero at the lattice, slope equal to the assigned gradient
    lattice_pts = [(i, j) for i in range(128) for j in range(128)]
    nonzero = sum(1 for i, j in lattice_pts if lat.perlin(float(i), float(j)) != 0.0)
    assert nonzero == 0, nonzero
    h = 1e-4
    worst_grad, value_grad_rms, perlin_grad_rms = 0.0, 0.0, 0.0
    for i, j in lattice_pts:
        gx = (lat.perlin(i + h, float(j)) - lat.perlin(i - h, float(j))) / (2.0 * h)
        gy = (lat.perlin(float(i), j + h) - lat.perlin(float(i), j - h)) / (2.0 * h)
        g = GRADS[lat.hash(i, j) & 7]
        worst_grad = max(worst_grad, abs(gx - g[0]), abs(gy - g[1]))
        perlin_grad_rms += gx * gx + gy * gy
        vx = (lat.value_noise(i + h, float(j)) - lat.value_noise(i - h, float(j))) / (2.0 * h)
        vy = (lat.value_noise(float(i), j + h) - lat.value_noise(float(i), j - h)) / (2.0 * h)
        value_grad_rms += vx * vx + vy * vy
    perlin_grad_rms = math.sqrt(perlin_grad_rms / len(lattice_pts))
    value_grad_rms = math.sqrt(value_grad_rms / len(lattice_pts))
    assert worst_grad < 1e-5, worst_grad
    assert abs(perlin_grad_rms - 1.0) < 1e-5 and value_grad_rms < 1e-4, (perlin_grad_rms, value_grad_rms)

    # (2) the range bound sqrt(2)/2, attained in the all-inward and all-outward cells
    centers = [lat.perlin(i + 0.5, j + 0.5) for i in range(256) for j in range(256)]
    cmax, cmin = max(centers), min(centers)
    attained = sum(1 for c in centers if abs(c) >= HALF_ROOT_TWO - 1e-9)
    inward = sum(1 for c in centers if abs(c - HALF_ROOT_TWO) < 1e-9)
    randoms = [lat.perlin(rng.uniform(0, 256), rng.uniform(0, 256)) for _ in range(200_000)]
    rmax, rmin = max(randoms), min(randoms)
    mean = sum(randoms) / len(randoms)
    std = math.sqrt(sum(r * r for r in randoms) / len(randoms) - mean * mean)
    assert cmax <= HALF_ROOT_TWO + 1e-12 and cmin >= -HALF_ROOT_TWO - 1e-12, (cmax, cmin)
    assert rmax <= HALF_ROOT_TWO + 1e-12 and rmin >= -HALF_ROOT_TWO - 1e-12, (rmax, rmin)
    assert abs(cmax - HALF_ROOT_TWO) < 1e-12 and abs(cmin + HALF_ROOT_TWO) < 1e-12 and attained >= 2, (cmax, cmin, attained)
    assert abs(mean) < 0.01, mean

    # (3) smoothness across cell borders: slope jump (C1) and curvature jump (C2)
    borders = [(float(rng.randrange(1, 255)), rng.uniform(0.05, 0.95) + rng.randrange(0, 255)) for _ in range(2_000)]
    quintic = lambda x, y: lat.perlin(x, y, fade_quintic)
    cubic = lambda x, y: lat.perlin(x, y, fade_cubic)
    linear = lambda x, y: lat.perlin(x, y, fade_linear)
    c1 = {name: max(slope_jump(f, x, y, 1e-5) for x, y in borders) for name, f in (('quintic', quintic), ('cubic', cubic), ('linear', linear))}
    c2 = {name: {hh: max(curvature_jump(f, x, y, hh) for x, y in borders) for hh in (1e-3, 1e-4)} for name, f in (('quintic', quintic), ('cubic', cubic))}
    assert c1['quintic'] < 1e-3 and c1['cubic'] < 1e-3 and c1['linear'] > 0.1, c1
    assert c1['linear'] > 1_000 * c1['quintic'], c1
    assert c2['quintic'][1e-4] < c2['quintic'][1e-3] / 5.0, c2['quintic']  # shrinks with h: continuous curvature
    assert c2['cubic'][1e-4] > 0.5 * c2['cubic'][1e-3], c2['cubic']  # does not shrink: a curvature step
    assert c2['cubic'][1e-4] > 20.0 * c2['quintic'][1e-4], c2
    interior_slope = max(abs((lat.perlin(x + 0.5 + 1e-5, y) - lat.perlin(x + 0.5, y)) / 1e-5) for x, y in borders[:200])
    c1['value noise'] = max(slope_jump(lambda x, y: lat.value_noise(x, y), x, y, 1e-5) for x, y in borders)
    c1['simplex'] = max(slope_jump(lambda x, y: simplex(lat, x, y), x + rng.random(), y, 1e-5) for x, y in borders)  # random points: its edges are not the lattice lines
    assert c1['value noise'] < 1e-3 and c1['simplex'] < 1e-3, c1

    # (4) spectrum, autocorrelation, and zero crossings along lattice-periodic lines
    per_cell = 16
    xs = [k / per_cell for k in range(256 * per_cell)]
    line_y = 100.37
    lines = {
        'Perlin': [lat.perlin(x, line_y) for x in xs],
        'Perlin, lattice row': [lat.perlin(x, 100.0) for x in xs],
        'value noise': [lat.value_noise(x, line_y) for x in xs],
        'white noise': [lat.white(x, line_y) for x in xs],
    }
    bands = {name: spectrum_bands(power_spectrum(s), per_cell) for name, s in lines.items()}
    lag = {name: lag_one(s) for name, s in lines.items()}
    crossings = {name: zero_crossings(s) / 256.0 for name, s in lines.items()}
    assert bands['Perlin'][2] < 1e-3 and bands['Perlin, lattice row'][2] < 1e-3, (bands['Perlin'], bands['Perlin, lattice row'])
    assert bands['Perlin, lattice row'][1] > 0.85, bands['Perlin, lattice row']
    assert bands['Perlin'][0] < bands['value noise'][0] and bands['Perlin'][3] > bands['value noise'][3], (bands['Perlin'], bands['value noise'])
    assert bands['white noise'][2] > 0.6 and abs(lag['white noise']) < 0.1, (bands['white noise'], lag['white noise'])
    assert lag['Perlin'] > 0.95 and crossings['Perlin'] < 2.0 < crossings['white noise'], (lag, crossings)

    # (5) rivals: simplex corner count and fractal octaves
    probes = [(rng.uniform(0, 256), rng.uniform(0, 256)) for _ in range(20_000)]
    lat.corners = 0
    for x, y in probes:
        lat.perlin(x, y)
    perlin_corners = lat.corners / len(probes)
    lat.corners = 0
    simplex_vals = [simplex(lat, x, y) for x, y in probes]
    simplex_corners = lat.corners / len(probes)
    assert perlin_corners == 4.0 and simplex_corners == 3.0, (perlin_corners, simplex_corners)
    octave_rows = []
    for octaves in (1, 2, 3, 4):
        vals = [lat.fbm(x, y, octaves) for x, y in probes[:8_000]]
        mx, mn = max(vals), min(vals)
        assert mx <= HALF_ROOT_TWO + 1e-12 and mn >= -HALF_ROOT_TWO - 1e-12, (octaves, mx, mn)
        octave_rows.append((octaves, mx, mn, math.sqrt(sum(v * v for v in vals) / len(vals) - (sum(vals) / len(vals)) ** 2)))
    elapsed = time.perf_counter() - t0

    print(f'lattice: {len(lattice_pts):,} grid points, {nonzero} nonzero; slope equals the hashed gradient to {worst_grad:.1e}; root-mean-square slope there {perlin_grad_rms:.6f} (Perlin) against {value_grad_rms:.1e} (value noise)')
    print(f'range: cell centers in [{cmin:+.6f}, {cmax:+.6f}], random points in [{rmin:+.4f}, {rmax:+.4f}], bound {HALF_ROOT_TWO:.6f} attained in {attained} of 65,536 cells ({inward} all inward); mean {mean:+.4f}, standard deviation {std:.4f}')
    print(f'{"fade":>8} {"slope jump at borders":>22} {"curvature jump h=1e-3":>22} {"h=1e-4":>8}')
    for name in ('quintic', 'cubic', 'linear'):
        cj = c2.get(name)
        print(f'{name:>8} {c1[name]:>22.2e} {(f"{cj[1e-3]:.4f}" if cj else "n/a"):>22} {(f"{cj[1e-4]:.4f}" if cj else "n/a"):>8}')
    print(f'interior slopes reach {interior_slope:.3f}, so the linear crease of {c1["linear"]:.3f} is a visible kink; value noise {c1["value noise"]:.1e}; simplex at random points {c1["simplex"]:.1e}')
    print(f'{"noise":>22} {"power below 1/4 c/cell":>22} {"1/4 to 2":>9} {"above 2":>8} {"median (c/cell)":>15} {"lag-one corr":>12} {"zero crossings/cell":>19}')
    for name in bands:
        lo, mi, hi, md = bands[name]
        print(f'{name:>22} {lo:>22.1%} {mi:>9.1%} {hi:>8.3%} {md:>15.3f} {lag[name]:>12.4f} {crossings[name]:>19.2f}')
    print(f'corners per sample: Perlin {perlin_corners:.0f}, simplex {simplex_corners:.0f} (simplex range on 20,000 samples [{min(simplex_vals):+.3f}, {max(simplex_vals):+.3f}])')
    print('octaves (max, min, std): ' + '; '.join(f'{o}: {mx:+.4f}, {mn:+.4f}, {sd:.4f}' for o, mx, mn, sd in octave_rows))
    print(f'{elapsed:.1f} s')
    print(f'OK: 0 of {len(lattice_pts):,} lattice points nonzero and every slope there equals its gradient to {worst_grad:.0e}; the bound sqrt(2)/2 = {HALF_ROOT_TWO:.4f} held on 265,536 samples and was attained in {attained} cells; '
          f'slope jump at borders {c1["quintic"]:.0e} (quintic) against {c1["linear"]:.3f} (linear crease); curvature jump at h = 1e-4 {c2["quintic"][1e-4]:.4f} (quintic) against {c2["cubic"][1e-4]:.3f} (cubic); '
          f'{bands["Perlin"][2]:.3%} of the power above two cycles per cell and the median frequency {bands["Perlin"][3]:.3f} against value noise {bands["value noise"][3]:.3f}; value noise flat at every grid point ({value_grad_rms:.0e}); simplex 3 corners against 4; four octaves inside the bound')


if __name__ == '__main__':
    main()
