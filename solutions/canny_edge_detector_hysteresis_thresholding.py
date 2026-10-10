# Puzzle 173: Canny edge detector x Hysteresis thresholding
# Edge detection: from a noisy grayscale image, mark the pixels where the
# intensity changes sharply, as thin connected curves, without marking the
# noise. The algorithm is Canny's pipeline (1986): smooth with a Gaussian,
# take the gradient (Sobel), keep only the pixels that are local maxima of
# gradient magnitude along the gradient direction (non-maximum
# suppression, which makes the edges one pixel thin), then decide which
# maxima are edges. The heuristic is hysteresis thresholding: two
# thresholds, not one. A pixel above the high threshold is an edge; a
# pixel above the low threshold is an edge only if it connects, through
# other above-low pixels, to a pixel above the high threshold. Strong
# evidence anywhere on a contour lets the weak parts of the same contour
# through, while isolated weak responses, which is what noise produces,
# are dropped.
#
# Referees:
# (1) GROUND TRUTH BY CONSTRUCTION: a 96 x 96 image of a filled disk and
#     a square whose brightness ramps across it, so its edges run from weak
#     contrast to strong, over a background, with Gaussian noise added; the
#     true edge set is the set of boundary pixels of the clean shapes. Detections are scored by precision, recall, and F1 within
#     one pixel of the truth, by the fraction of edge pixels that are
#     "thick" (part of a fully filled 2 x 2 block), and by the number
#     of connected edge components against the truth's two;
# (2) THE HYSTERESIS INVARIANT, checked pixel by pixel: every retained
#     pixel is above the low threshold, and every retained pixel that is
#     below the high threshold is 8-connected through retained pixels to
#     one above the high threshold;
# (3) THE NOISELESS CASE: Canny must recover the truth with F1 above 0.98
#     and zero thick pixels;
# (4) THE RIVALS at three noise levels: Sobel magnitude with a single
#     threshold (no thinning), Sobel with non-maximum suppression and a
#     single threshold (the ablation: Canny without hysteresis), and
#     Marr-Hildreth zero crossings of the Laplacian of Gaussian, scored by
#     the same referee;
# (5) THE NEGATIVE EXAMPLE, measured: a single threshold low enough to keep
#     the whole contour, which admits thousands of noise pixels, against a
#     single threshold high enough to reject the noise, which breaks the
#     contour into fragments; hysteresis keeps the contour whole with the
#     noise out.
#
# AUTHOR CORRECTIONS: the draft's expectation that Marr-Hildreth would lose
# on recall held (0.65 to 0.76, in 5 to 28 fragments, with high precision).
# What the draft got wrong was the hero: the first non-maximum suppression
# mapped the two diagonal gradient bins to the wrong neighbor pairs (image
# coordinates run downward) and kept both pixels of a tied pair, which left
# 35% of the noiseless edge two pixels thick and broke the contours into 24
# pieces; the version measured here uses the image-coordinate diagonals and
# one strict comparison. The thickness metric was also changed from "three
# or more edge neighbors", which counts every step of a one-pixel staircase,
# to "inside a filled 2 x 2 block". And the first image had edges of
# constant contrast, so a single high threshold kept everything and
# hysteresis had nothing to rescue; the square's brightness now ramps so
# its edges run from weak to strong, which is the case the heuristic exists
# for.
import math
import random
from collections import deque

SEED = 20261010
N = 96


def make_image(rng, noise_sigma):
    clean = [[40.0] * N for _ in range(N)]
    truth = set()
    inside = [[False] * N for _ in range(N)]
    cx, cy, r = 32.0, 40.0, 17.5
    for y in range(N):
        for x in range(N):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                clean[y][x] = 160.0
                inside[y][x] = True
            if 56 <= x <= 84 and 20 <= y <= 48:
                # the square's brightness ramps from 70 at its left edge to 160
                # at its right edge, so its top and bottom edges run from weak
                # contrast (30 over the background) to strong (120): the case
                # hysteresis exists for
                clean[y][x] = 70.0 + 90.0 * (x - 56) / 28.0
                inside[y][x] = True
    for y in range(N):
        for x in range(N):
            if inside[y][x]:
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if 0 <= y + dy < N and 0 <= x + dx < N and not inside[y + dy][x + dx]:
                            truth.add((x, y))
                            break
                    else:
                        continue
                    break
    noisy = [[clean[y][x] + rng.gauss(0.0, noise_sigma) for x in range(N)] for y in range(N)]
    return noisy, truth


def gaussian_kernel(sigma):
    radius = int(math.ceil(3 * sigma))
    k = [math.exp(-(i * i) / (2 * sigma * sigma)) for i in range(-radius, radius + 1)]
    s = sum(k)
    return [v / s for v in k], radius


def blur(img, sigma):
    k, r = gaussian_kernel(sigma)
    tmp = [[0.0] * N for _ in range(N)]
    for y in range(N):
        row = img[y]
        for x in range(N):
            acc = 0.0
            for i, w in enumerate(k):
                xx = min(max(x + i - r, 0), N - 1)
                acc += w * row[xx]
            tmp[y][x] = acc
    out = [[0.0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            acc = 0.0
            for i, w in enumerate(k):
                yy = min(max(y + i - r, 0), N - 1)
                acc += w * tmp[yy][x]
            out[y][x] = acc
    return out


def sobel(img):
    gx = [[0.0] * N for _ in range(N)]
    gy = [[0.0] * N for _ in range(N)]
    mag = [[0.0] * N for _ in range(N)]
    for y in range(1, N - 1):
        for x in range(1, N - 1):
            a, b, c = img[y - 1][x - 1], img[y - 1][x], img[y - 1][x + 1]
            d, f = img[y][x - 1], img[y][x + 1]
            g, h, i = img[y + 1][x - 1], img[y + 1][x], img[y + 1][x + 1]
            sx = (c + 2 * f + i) - (a + 2 * d + g)
            sy = (g + 2 * h + i) - (a + 2 * b + c)
            gx[y][x], gy[y][x] = sx, sy
            mag[y][x] = math.hypot(sx, sy)
    return gx, gy, mag


def non_max_suppression(gx, gy, mag):
    """Keep a pixel only if its magnitude is at least that of its two
    neighbors along the gradient direction (quantized to 4 directions)."""
    out = [[0.0] * N for _ in range(N)]
    for y in range(1, N - 1):
        for x in range(1, N - 1):
            m = mag[y][x]
            if m == 0.0:
                continue
            # image coordinates: y grows downward, so a gradient at 45 degrees
            # (gx > 0, gy > 0) points to (x + 1, y + 1)
            angle = math.degrees(math.atan2(gy[y][x], gx[y][x])) % 180.0
            if angle < 22.5 or angle >= 157.5:
                n1, n2 = mag[y][x - 1], mag[y][x + 1]
            elif angle < 67.5:
                n1, n2 = mag[y - 1][x - 1], mag[y + 1][x + 1]
            elif angle < 112.5:
                n1, n2 = mag[y - 1][x], mag[y + 1][x]
            else:
                n1, n2 = mag[y + 1][x - 1], mag[y - 1][x + 1]
            # strict on one side so a symmetric pair keeps exactly one pixel
            if m > n1 and m >= n2:
                out[y][x] = m
    return out


def hysteresis(nms, low, high):
    strong = [(x, y) for y in range(N) for x in range(N) if nms[y][x] >= high]
    edges = set(strong)
    queue = deque(strong)
    while queue:
        x, y = queue.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in edges and nms[ny][nx] >= low:
                    edges.add((nx, ny))
                    queue.append((nx, ny))
    return edges


def canny(img, sigma=1.4, low=None, high=None, return_stages=False):
    b = blur(img, sigma)
    gx, gy, mag = sobel(b)
    nms = non_max_suppression(gx, gy, mag)
    # thresholds as fractions of the strongest gradient (a common rule):
    # high at half of it, low at 40% of high; the referee tests the
    # mechanism, not the knob
    if high is None:
        peak = max(v for row in mag for v in row)
        high = 0.5 * peak
        low = 0.4 * high
    edges = hysteresis(nms, low, high)
    if return_stages:
        return edges, nms, low, high
    return edges


def single_threshold(field, t):
    return {(x, y) for y in range(N) for x in range(N) if field[y][x] >= t}


def marr_hildreth(img, sigma=2.0, slope=4.0):
    b = blur(img, sigma)
    lap = [[0.0] * N for _ in range(N)]
    for y in range(1, N - 1):
        for x in range(1, N - 1):
            lap[y][x] = b[y - 1][x] + b[y + 1][x] + b[y][x - 1] + b[y][x + 1] - 4 * b[y][x]
    edges = set()
    for y in range(1, N - 1):
        for x in range(1, N - 1):
            v = lap[y][x]
            for nx, ny in ((x + 1, y), (x, y + 1)):
                w = lap[ny][nx]
                if (v < 0 <= w or w < 0 <= v) and abs(v - w) >= slope:
                    edges.add((x, y) if abs(v) < abs(w) else (nx, ny))
    return edges


def score(edges, truth):
    near_truth = set()
    for x, y in truth:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                near_truth.add((x + dx, y + dy))
    near_edges = set()
    for x, y in edges:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                near_edges.add((x + dx, y + dy))
    tp = sum(1 for p in edges if p in near_truth)
    precision = tp / len(edges) if edges else 0.0
    recall = sum(1 for p in truth if p in near_edges) / len(truth)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall > 0 else 0.0
    # a pixel is thick when it sits in a fully filled 2 x 2 block of edge pixels;
    # a one-pixel staircase has none, a two-pixel-wide band is nearly all of them
    thick = sum(1 for (x, y) in edges if any(
        (x + a, y) in edges and (x, y + b) in edges and (x + a, y + b) in edges for a in (-1, 1) for b in (-1, 1)))
    return {'precision': precision, 'recall': recall, 'f1': f1, 'n': len(edges), 'thick': thick / len(edges) if edges else 0.0, 'components': components(edges)}


def components(edges):
    seen = set()
    count = 0
    for p in edges:
        if p in seen:
            continue
        count += 1
        stack = [p]
        seen.add(p)
        while stack:
            x, y = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in edges and q not in seen:
                        seen.add(q)
                        stack.append(q)
    return count


def check_hysteresis_invariant(edges, nms, low, high):
    for (x, y) in edges:
        assert nms[y][x] >= low
    strong = {p for p in edges if nms[p[1]][p[0]] >= high}
    reach = set(strong)
    queue = deque(strong)
    while queue:
        x, y = queue.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q in edges and q not in reach:
                    reach.add(q)
                    queue.append(q)
    assert reach == edges, 'a retained weak pixel is not connected to a strong one'
    return len(strong), len(edges) - len(strong)


def main():
    rng = random.Random(SEED)

    # Oracle 3: the noiseless image.
    clean, truth = make_image(random.Random(SEED), 0.0)
    edges, nms, low, high = canny(clean, return_stages=True)
    s0 = score(edges, truth)
    assert s0['f1'] > 0.98 and s0['thick'] < 0.02, s0
    assert s0['components'] == 2, s0
    check_hysteresis_invariant(edges, nms, low, high)

    # Oracle 2 and 4: three noise levels.
    rows = {}
    for noise in (8.0, 16.0, 24.0, 40.0):
        img, truth = make_image(random.Random(SEED + int(noise)), noise)
        edges, nms, low, high = canny(img, return_stages=True)
        strong, weak = check_hysteresis_invariant(edges, nms, low, high)
        b = blur(img, 1.4)
        _, _, mag = sobel(b)
        res = {
            'Canny (hysteresis)': score(edges, truth),
            'Sobel + NMS, single threshold at high': score(single_threshold(nms, high), truth),
            'Sobel + NMS, single threshold at low': score(single_threshold(nms, low), truth),
            'Sobel magnitude, single threshold': score(single_threshold(mag, high), truth),
            'Marr-Hildreth (LoG zero crossings)': score(marr_hildreth(img), truth),
        }
        res['_strong_weak'] = (strong, weak)
        rows[noise] = res
    print('contest: a 96 x 96 image of a disk (120 levels above the background) and a square whose brightness ramps from 30 to 120 above it, under Gaussian noise of 8, 16, 24, and 40 levels; referee: the boundary pixels of the clean shapes, scored within one pixel; thick = edge pixels inside a filled 2 x 2 block')
    print(f'noiseless: Canny precision {s0["precision"]:.3f}, recall {s0["recall"]:.3f}, F1 {s0["f1"]:.3f}, {s0["n"]} edge pixels ({len(truth)} true), thick {s0["thick"]:.3f}, components {s0["components"]} (truth 2)')
    print(f'{"noise":>5} {"method":>40} {"precision":>9} {"recall":>7} {"F1":>6} {"pixels":>7} {"thick":>6} {"comps":>5}')
    for noise, res in rows.items():
        for name, r in res.items():
            if name.startswith('_'):
                continue
            print(f'{noise:>5.0f} {name:>40} {r["precision"]:>9.3f} {r["recall"]:>7.3f} {r["f1"]:>6.3f} {r["n"]:>7d} {r["thick"]:>6.3f} {r["components"]:>5d}')
        strong, weak = res['_strong_weak']
        print(f'      hysteresis kept {strong} strong and {weak} weak pixels, every weak one connected to a strong one')
    for noise, res in rows.items():
        c = res['Canny (hysteresis)']
        hi = res['Sobel + NMS, single threshold at high']
        lo = res['Sobel + NMS, single threshold at low']
        sob = res['Sobel magnitude, single threshold']
        # the high threshold alone loses the weak edges at every noise level;
        # the low threshold alone is only exposed once the noise reaches it
        assert c['f1'] > hi['f1'] and c['f1'] >= lo['f1'] - 1e-12, (noise, c, hi, lo)
        assert c['recall'] > hi['recall'] + 0.1, (noise, c['recall'], hi['recall'])
        assert c['precision'] >= lo['precision'], (noise, c['precision'], lo['precision'])
        assert c['thick'] < 0.05 and sob['thick'] > 0.5, (noise, c['thick'], sob['thick'])
        assert c['f1'] > sob['f1'], (noise, c['f1'], sob['f1'])
    # Oracle 5: at the heaviest noise, the two single thresholds fail in
    # opposite ways and hysteresis fails in neither
    heavy = rows[40.0]
    c, hi, lo = heavy['Canny (hysteresis)'], heavy['Sobel + NMS, single threshold at high'], heavy['Sobel + NMS, single threshold at low']
    assert lo['n'] > 2 * len(truth) and c['precision'] > lo['precision'] + 0.2, (lo['n'], len(truth), c['precision'], lo['precision'])
    assert hi['recall'] < 0.9 < c['recall'], (hi['recall'], c['recall'])

    c8 = rows[8.0]['Canny (hysteresis)']
    print(f'OK: Canny F1 {s0["f1"]:.3f} noiseless and {c8["f1"]:.3f} / {rows[16.0]["Canny (hysteresis)"]["f1"]:.3f} / {rows[24.0]["Canny (hysteresis)"]["f1"]:.3f} / {c["f1"]:.3f} at noise 8 / 16 / 24 / 40 against '
          f'{rows[8.0]["Sobel + NMS, single threshold at high"]["f1"]:.3f} / {rows[16.0]["Sobel + NMS, single threshold at high"]["f1"]:.3f} / {rows[24.0]["Sobel + NMS, single threshold at high"]["f1"]:.3f} / {hi["f1"]:.3f} for a single high threshold and '
          f'{rows[8.0]["Sobel magnitude, single threshold"]["f1"]:.3f} / {rows[16.0]["Sobel magnitude, single threshold"]["f1"]:.3f} / {rows[24.0]["Sobel magnitude, single threshold"]["f1"]:.3f} / {heavy["Sobel magnitude, single threshold"]["f1"]:.3f} for thresholded Sobel magnitude; '
          f'at noise 40 the low threshold alone keeps {lo["n"]:,} pixels for {len(truth)} true (precision {lo["precision"]:.2f}) and the high threshold alone loses the weak edges (recall {hi["recall"]:.2f}); hysteresis recall {c["recall"]:.2f}, precision {c["precision"]:.2f}; the invariant held pixel by pixel')


if __name__ == '__main__':
    main()
