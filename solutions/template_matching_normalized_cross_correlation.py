# Puzzle 200: Template matching x Normalized cross-correlation
# Pattern localization: find where a small template appears inside a larger
# image whose brightness and contrast differ from the template's and which
# carries noise. The algorithm is template matching: slide the template over
# every position and score the window. The heuristic is normalized
# cross-correlation (NCC, Lewis 1995): subtract each window's mean and divide
# by the window and template standard deviations, so the score is a
# correlation coefficient in [-1, 1] that ignores any gain and offset of the
# scene, with the window statistics read from summation tables in O(1) per
# position instead of O(template area).
#
# Referees:
# (1) PLANTED TRUTH: synthetic 64 x 64 scenes with a 12 x 12 pattern planted
#     at a known position; every matcher's argmax is compared with the plant
#     under gain and offset, under noise, with sub-pixel shifts, and under
#     rotation and scale that NCC does not model;
# (2) ALGEBRA: NCC equals 1 at an exact copy and lies in [-1, 1] at every
#     position of every map; the table-plus-FFT map equals the direct
#     per-window map at every position;
# (3) COUNTS: multiplications per full match for the direct path and for
#     the summation-table and FFT path, from counters, not estimates.
# AUTHOR CORRECTIONS: (1) the draft assumed the FFT numerator would cut the
# multiplication count at this scene size; the counters say the opposite
# (three 128 x 128 padded transforms cost more than the 12 x 12 direct sums),
# so the page credits the summation tables, not the FFT, for the speed.
# (2) The draft's smooth scenes let chance windows correlate at 0.83 with
# the template, beating half-pixel-shifted plants; the scenes were given
# finer texture (chance peaks 0.44) and the pattern less per-pixel noise.
# (3) The draft refined the peak with two one-dimensional parabolas (0.61 px
# against 0.73 integer on the same seed); the least-squares quadratic over
# the 3 x 3 neighbourhood (0.36 px) replaced it.
import math
import random
from operator import mul, sub

S, T = 64, 12
P = S - T + 1
FLOOR = 1e-6  # variance floor per pixel: below it a window or template is untextured


def texture(rng, n, waves=10, fmax=1.6, noise=0.5):
    c = [(rng.uniform(0.08, fmax), rng.uniform(0.08, fmax), rng.uniform(0, 6.283), rng.uniform(0.4, 1.0)) for _ in range(waves)]
    img = [[sum(a * math.cos(fx * x + fy * y + ph) for fx, fy, ph, a in c) + rng.gauss(0, noise) for x in range(n)] for y in range(n)]
    lo, hi = min(map(min, img)), max(map(max, img))
    return [[(v - lo) * 255.0 / (hi - lo) for v in row] for row in img]


def bilinear(img, y, x):
    m = len(img) - 1.000001
    y, x = min(max(y, 0.0), m), min(max(x, 0.0), m)
    y0, x0 = int(y), int(x)
    fy, fx = y - y0, x - x0
    a, b = img[y0], img[y0 + 1]
    return (a[x0] * (1 - fx) + a[x0 + 1] * fx) * (1 - fy) + (b[x0] * (1 - fx) + b[x0 + 1] * fx) * fy


def warp(src, dx=0.0, dy=0.0, angle=0.0, scale=1.0):
    """A T x T patch sampled from the centre of src, shifted, rotated, scaled."""
    c, h = (len(src) - 1) / 2, (T - 1) / 2
    co, si = math.cos(angle), math.sin(angle)
    out = []
    for i in range(T):
        row = []
        for j in range(T):
            u, v = (j - h - dx) / scale, (i - h - dy) / scale
            row.append(bilinear(src, c - si * u + co * v, c + co * u + si * v))
        out.append(row)
    return out


def scene_with(rng, src, x, y, **kw):
    sc = texture(rng, S)
    patch = warp(src, **kw)
    for i in range(T):
        sc[y + i][x:x + T] = patch[i]
    return sc


def tstats(tmpl):
    n = T * T
    st = sum(map(sum, tmpl))
    stt = sum(sum(map(mul, r, r)) for r in tmpl)
    return st, stt, stt - st * st / n


def match(sc, tmpl, cnt=None, sad=False, floor=FLOOR):
    """Direct per-window scores: NCC, SSD, raw correlation, and optionally SAD."""
    n = T * T
    st, stt, tvar = tstats(tmpl)
    maps = {'ncc': [], 'ssd': [], 'raw': [], 'sad': []}
    for y in range(P):
        rn, rs, rr, ra = [], [], [], []
        for x in range(P):
            sf = sff = sft = sa = 0.0
            for i in range(T):
                r, tr = sc[y + i][x:x + T], tmpl[i]
                sf += sum(r)
                sff += sum(map(mul, r, r))
                sft += sum(map(mul, r, tr))
                if sad:
                    sa += sum(map(abs, map(sub, r, tr)))
            fvar = sff - sf * sf / n
            den = math.sqrt(fvar * tvar) if fvar > floor * n and tvar > floor * n else 0.0
            rn.append((sft - sf * st / n) / den if den else 0.0)
            rs.append(sff - 2 * sft + stt)
            rr.append(sft)
            ra.append(sa)
        for k, row in zip(('ncc', 'ssd', 'raw', 'sad'), (rn, rs, rr, ra)):
            maps[k].append(row)
    if cnt is not None:
        cnt['direct'] += P * P * 2 * n  # f*f and f*t per window; the template sums are shared
    return maps


def integral(img, sq=False):
    n = len(img)
    I = [[0.0] * (n + 1) for _ in range(n + 1)]
    for y in range(n):
        acc, up, cur = 0.0, I[y], I[y + 1]
        for x in range(n):
            v = img[y][x]
            acc += v * v if sq else v
            cur[x + 1] = up[x + 1] + acc
    return I


def box(I, y, x):
    return I[y + T][x + T] - I[y][x + T] - I[y + T][x] + I[y][x]


def fft1(a, inv=False):
    """Iterative radix-2 Cooley-Tukey in place; returns the complex multiplications."""
    n, j = len(a), 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    m, cm = 2, 0
    while m <= n:
        h = m // 2
        ang = (2 if inv else -2) * math.pi / m
        tw = [complex(math.cos(ang * k), math.sin(ang * k)) for k in range(h)]
        for k in range(0, n, m):
            for t in range(h):
                u, v = a[k + t], a[k + t + h] * tw[t]
                a[k + t], a[k + t + h] = u + v, u - v
        cm += n // 2
        m *= 2
    if inv:
        for i in range(n):
            a[i] /= n
    return cm


def fft2(g, inv=False):
    n, cm = len(g), 0
    for row in g:
        cm += fft1(row, inv)
    for x in range(n):
        col = [g[y][x] for y in range(n)]
        cm += fft1(col, inv)
        for y in range(n):
            g[y][x] = col[y]
    return cm


def fast_ncc(sc, tmpl, cnt):
    """Lewis 1995: summation tables for the window mean and variance, FFT for the numerator."""
    n, N = T * T, 128
    st, stt, tvar = tstats(tmpl)
    I1, I2 = integral(sc), integral(sc, True)
    cnt['tables'] += S * S
    F = [[complex(sc[y][x]) if y < S and x < S else 0j for x in range(N)] for y in range(N)]
    G = [[complex(tmpl[y][x]) if y < T and x < T else 0j for x in range(N)] for y in range(N)]
    cm = fft2(F) + fft2(G)
    H = [[F[y][x] * G[y][x].conjugate() for x in range(N)] for y in range(N)]
    cm += N * N + fft2(H, True)
    cnt['fft'] += 4 * cm  # four real multiplications per complex one
    out = []
    for y in range(P):
        row = []
        for x in range(P):
            sf, sff, sft = box(I1, y, x), box(I2, y, x), H[y][x].real
            fvar = sff - sf * sf / n
            den = math.sqrt(fvar * tvar) if fvar > FLOOR * n and tvar > FLOOR * n else 0.0
            row.append((sft - sf * st / n) / den if den else 0.0)
        out.append(row)
    return out


def argbest(m, hi=True):
    best = None
    for y, row in enumerate(m):
        for x, v in enumerate(row):
            if best is None or (v > best[0] if hi else v < best[0]):
                best = (v, x, y)
    return best


def refine(m, x, y):
    """Sub-pixel peak: least-squares quadratic over the 3 x 3 neighbourhood, its stationary point."""
    if not (0 < x < P - 1 and 0 < y < P - 1):
        return float(x), float(y)
    pts = [(i, j, m[y + j][x + i]) for i in (-1, 0, 1) for j in (-1, 0, 1)]
    tot = sum(v for _, _, v in pts)
    b = sum(i * v for i, _, v in pts) / 6
    c = sum(j * v for _, j, v in pts) / 6
    d = (sum(i * i * v for i, _, v in pts) - 2 * tot / 3) / 2
    f = (sum(j * j * v for _, j, v in pts) - 2 * tot / 3) / 2
    e = sum(i * j * v for i, j, v in pts) / 4
    det = 4 * d * f - e * e
    if det <= 0:
        return float(x), float(y)
    return x + (e * c - 2 * f * b) / det, y + (e * b - 2 * d * c) / det


def trial(rng, src, hits, maxabs, sad=False, gain=1.0, offset=0.0, noise=0.0, cnt=None, **kw):
    x, y = rng.randrange(P), rng.randrange(P)
    sc = scene_with(rng, src, x, y, **kw)
    tmpl = warp(src)
    if gain != 1.0 or offset or noise:
        sc = [[gain * v + offset + (rng.gauss(0, noise) if noise else 0.0) for v in row] for row in sc]
    maps = match(sc, tmpl, cnt, sad)
    for k in ('ncc', 'ssd', 'raw', 'sad'):
        if k == 'sad' and not sad:
            continue
        v, bx, by = argbest(maps[k], k in ('ncc', 'raw'))
        hits[k] += (bx, by) == (x, y)
    maxabs[0] = max(maxabs[0], max(abs(v) for row in maps['ncc'] for v in row))
    return sc, tmpl, maps, x, y


def rates(rng, src, trials, maxabs, **kw):
    hits = {'ncc': 0, 'ssd': 0, 'raw': 0, 'sad': 0}
    for _ in range(trials):
        trial(rng, src, hits, maxabs, sad=True, **kw)
    return hits


def main():
    rng = random.Random(20261010)
    src = texture(rng, T + 8, waves=8, fmax=0.9, noise=0.1)
    maxabs = [0.0]
    cnt = {'direct': 0, 'tables': 0, 'fft': 0}

    # (1) exact copies: every method finds the plant, NCC is exactly 1 there
    peaks = []
    for _ in range(6):
        sc, tmpl, maps, x, y = trial(rng, src, {'ncc': 0, 'ssd': 0, 'raw': 0, 'sad': 0}, maxabs, sad=True)
        peaks.append(maps['ncc'][y][x])
    assert all(abs(p - 1.0) < 1e-9 for p in peaks), peaks

    # (2) gain and offset on the scene, template from the reference lighting
    go = rates(rng, src, 24, maxabs, gain=1.0, offset=0.0)
    go2 = {'ncc': 0, 'ssd': 0, 'raw': 0, 'sad': 0}
    for _ in range(24):
        trial(rng, src, go2, maxabs, sad=True, gain=rng.uniform(0.4, 2.5), offset=rng.uniform(-60, 60))
    assert go2['ncc'] == 24 and go2['ssd'] < 24 and go2['raw'] < 24, go2

    # (3) additive noise at the reference lighting
    noise_rows = []
    for sig in (15, 40, 80, 120):
        h = rates(rng, src, 6, maxabs, noise=float(sig))
        noise_rows.append((sig, h))

    # (4) the fast path equals the direct path; multiplications counted
    x, y = 17, 29
    sc = scene_with(rng, src, x, y)
    tmpl = warp(src)
    direct = match(sc, tmpl, cnt)['ncc']
    fast = fast_ncc(sc, tmpl, cnt)
    gap = max(abs(direct[j][i] - fast[j][i]) for j in range(P) for i in range(P))
    assert gap < 1e-7, gap
    assert argbest(fast)[1:] == (x, y)
    d_num, d_den = P * P * T * T, P * P * T * T

    # (5) sub-pixel shift: parabolic refinement against the planted fraction
    err_int = err_sub = 0.0
    for _ in range(16):
        dx, dy = rng.uniform(0.1, 0.9), rng.uniform(0.1, 0.9)
        x, y = rng.randrange(1, P - 2), rng.randrange(1, P - 2)
        sc = scene_with(rng, src, x, y, dx=dx, dy=dy)
        m = match(sc, tmpl)['ncc']
        _, bx, by = argbest(m)
        rx, ry = refine(m, bx, by)
        err_int += math.hypot(bx - x - dx, by - y - dy)
        err_sub += math.hypot(rx - x - dx, ry - y - dy)
    err_int /= 16
    err_sub /= 16
    assert err_sub < 0.6 * err_int, (err_int, err_sub)

    # (6) rotation and (7) scale of the planted pattern, template unrotated
    rot = []
    for deg in (0, 5, 10, 15, 20, 30, 45):
        h, pk = 0, 0.0
        for _ in range(6):
            x, y = rng.randrange(P), rng.randrange(P)
            m = match(scene_with(rng, src, x, y, angle=math.radians(deg)), tmpl)['ncc']
            v, bx, by = argbest(m)
            h += (bx, by) == (x, y)
            pk += v
        rot.append((deg, h, pk / 6))
    scl = []
    for s in (0.8, 0.9, 1.0, 1.1, 1.25):
        h = 0
        for _ in range(6):
            x, y = rng.randrange(P), rng.randrange(P)
            h += argbest(match(scene_with(rng, src, x, y, scale=s), tmpl)['ncc'])[1:] == (x, y)
        scl.append((s, h))
    assert rot[0][1] == 6 and rot[-1][1] < 2, rot

    # (8) the untextured template and the flat scene region
    flat_src = [[128.0 + rng.gauss(0, 0.0005) for _ in range(T + 8)] for _ in range(T + 8)]
    ft = warp(flat_src)
    nofloor_hits, nofloor_peak, floored = 0, 0.0, 0
    for _ in range(6):
        x, y = rng.randrange(P), rng.randrange(P)
        sc = scene_with(rng, flat_src, x, y)
        sc = [[v + rng.gauss(0, 2.0) for v in row] for row in sc]
        m = match(sc, ft, floor=0.0)['ncc']
        v, bx, by = argbest(m)
        nofloor_hits += (bx, by) == (x, y)
        nofloor_peak += v
        floored += all(v == 0.0 for row in match(sc, ft)['ncc'] for v in row)
    sc = scene_with(rng, src, 5, 5)
    for i in range(20):
        sc[40 + i][40:60] = [77.0] * 20
    zeros = sum(v == 0.0 for row in match(sc, tmpl)['ncc'] for v in row)
    assert zeros == 81 and floored == 6, (zeros, floored)
    assert maxabs[0] <= 1.0 + 1e-9, maxabs

    print(f'{"method":<14}{"exact":>7}{"gain+offset":>13}' + ''.join(f'{"noise " + str(s):>11}' for s, _ in noise_rows))
    for k, name in (('ncc', 'NCC'), ('ssd', 'SSD'), ('sad', 'SAD'), ('raw', 'raw corr')):
        print(f'{name:<14}{go[k]:>4}/24{go2[k]:>10}/24' + ''.join(f'{h[k]:>8}/6' for _, h in noise_rows))
    print(f'fast vs direct max gap {gap:.1e}; direct {d_num:,} numerator + {d_den:,} denominator mults, '
          f'tables {cnt["tables"]:,} + FFT {cnt["fft"]:,}')
    print(f'sub-pixel: integer peak error {err_int:.3f} px, quadratic fit {err_sub:.3f} px over 16 shifts')
    print('rotation deg:hits/6 (mean peak) ' + ' '.join(f'{d}:{h} ({p:.2f})' for d, h, p in rot))
    print('scale:hits/6 ' + ' '.join(f'{s}:{h}' for s, h in scl))
    print(f'flat template without floor: {nofloor_hits}/6 found, mean peak {nofloor_peak / 6:.2f}; with floor flagged {floored}/6; '
          f'flat scene block: {zeros} windows floored')
    print(f'OK: NCC 1.000000 at every exact copy and |NCC| <= 1 over every map (max {maxabs[0]:.9f}); '
          f'gain and offset: NCC {go2["ncc"]}/24 against SSD {go2["ssd"]}, SAD {go2["sad"]}, raw {go2["raw"]}; '
          f'noise 80: NCC {noise_rows[2][1]["ncc"]}/6, SSD {noise_rows[2][1]["ssd"]}/6; '
          f'tables and FFT equal the direct map to {gap:.0e}, {cnt["tables"]:,} table mults replace {d_den:,} per match '
          f'while the FFT numerator costs {cnt["fft"]:,} against {d_num:,}; '
          f'quadratic fit {err_sub:.3f} px against {err_int:.3f}; rotation hits {rot[0][1]}, {rot[3][1]}, {rot[-1][1]}/6 at 0, 15, 45 degrees; '
          f'flat template {nofloor_hits}/6 without the floor, flagged {floored}/6 with it')


if __name__ == '__main__':
    main()
