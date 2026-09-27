# Puzzle 154: Otsu thresholding x between-class variance
# Image binarization: a grayscale image of 128 x 128 pixels holding
# objects on a background, both noisy, to be turned into a mask of
# object and not-object with one gray-level threshold. The truth is
# known because the image is synthesized from a known mask. Otsu's
# method is the algorithm: try every threshold t from 0 to 255 and
# choose the one that best separates the histogram into two classes.
# The heuristic is the criterion: between-class variance, the weighted
# squared distance between the two class means, which is maximized
# exactly when the within-class variance is minimized, and which can be
# computed for all 256 thresholds in one pass over the histogram.
#
# Referees:
# (1) THE IDENTITY: at every threshold the between-class variance plus
#     the within-class variance equals the total variance (to 1e-9), so
#     the argmax of one is the argmin of the other; the threshold is
#     compared with the Bayes threshold that the known class
#     distributions define, and the mask with the known truth;
# (2) THE COST, counted: the one-pass histogram method (256 bins, one
#     sweep with running sums) against the naive recomputation of both
#     class means and variances at every threshold from the pixels;
# (3) THE ILLUMINATION FAILURE, measured: a smooth shading gradient
#     across the image makes any single global threshold fail; Sauvola's
#     local threshold (from integral images, polarity inverted, window
#     41) recovers most of the mask, and a morphological top-hat
#     (opening with a window larger than any object) followed by global
#     Otsu recovers it almost entirely;
# (4) THE UNBALANCED FAILURE, measured on classes that overlap: with the
#     object occupying 50%, 20%, and 6% of the pixels, Otsu's threshold
#     collapses into the background at 6% while Kittler-Illingworth's
#     minimum-error threshold holds, and at 50% the minimum-error
#     criterion finds a spurious tail minimum while Otsu holds; each
#     criterion has a regime it cannot survive;
# (5) THE NEGATIVE EXAMPLES, measured: a fixed threshold at mid-gray
#     and the mean gray level as the threshold, on the same images.
import math
import random

SEED = 20260926
SIZE = 128


def make_image(rng, fraction=0.5, bg=(80, 15), fg=(160, 20), shade=0.0):
    """Blobs of foreground on background with Gaussian noise; the mask is
    known. shade adds a left-to-right brightness ramp of that many levels."""
    truth = [[False] * SIZE for _ in range(SIZE)]
    target = fraction * SIZE * SIZE
    count = 0
    guard = 0
    while count < target and guard < 500:
        guard += 1
        cx, cy = rng.uniform(0, SIZE), rng.uniform(0, SIZE)
        r = rng.uniform(6, 18)
        for y in range(max(0, int(cy - r)), min(SIZE, int(cy + r) + 1)):
            for x in range(max(0, int(cx - r)), min(SIZE, int(cx + r) + 1)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r and not truth[y][x]:
                    truth[y][x] = True
                    count += 1
    img = []
    for y in range(SIZE):
        row = []
        for x in range(SIZE):
            mu, sd = fg if truth[y][x] else bg
            v = rng.gauss(mu, sd) + shade * (x / (SIZE - 1) - 0.5)
            row.append(min(255, max(0, int(round(v)))))
        img.append(row)
    return img, truth, count / (SIZE * SIZE)


def histogram(img):
    h = [0] * 256
    for row in img:
        for v in row:
            h[v] += 1
    return h


def otsu(hist):
    """One pass: running weight and sum give both class means at every t."""
    n = sum(hist)
    total = sum(i * c for i, c in enumerate(hist))
    w0 = 0
    s0 = 0
    best_t, best_var = 0, -1.0
    curve = []
    ops = 0
    for t in range(256):
        w0 += hist[t]
        s0 += t * hist[t]
        ops += 4
        w1 = n - w0
        if w0 == 0 or w1 == 0:
            curve.append(0.0)
            continue
        m0 = s0 / w0
        m1 = (total - s0) / w1
        var_b = (w0 / n) * (w1 / n) * (m0 - m1) ** 2
        ops += 6
        curve.append(var_b)
        if var_b > best_var:
            best_var, best_t = var_b, t
    return best_t, curve, ops


def naive_otsu(pixels):
    """Recompute both classes from the pixels at every threshold."""
    ops = 0
    best_t, best_var = 0, -1.0
    n = len(pixels)
    for t in range(256):
        lo = [p for p in pixels if p <= t]
        hi = [p for p in pixels if p > t]
        ops += n
        if not lo or not hi:
            continue
        m0 = sum(lo) / len(lo)
        m1 = sum(hi) / len(hi)
        ops += n
        var_b = (len(lo) / n) * (len(hi) / n) * (m0 - m1) ** 2
        if var_b > best_var:
            best_var, best_t = var_b, t
    return best_t, ops


def within_between_total(hist):
    n = sum(hist)
    mean = sum(i * c for i, c in enumerate(hist)) / n
    total_var = sum(c * (i - mean) ** 2 for i, c in enumerate(hist)) / n
    worst = 0.0
    for t in range(256):
        lo = [(i, c) for i, c in enumerate(hist) if i <= t and c]
        hi = [(i, c) for i, c in enumerate(hist) if i > t and c]
        if not lo or not hi:
            continue
        w0 = sum(c for _, c in lo)
        w1 = sum(c for _, c in hi)
        m0 = sum(i * c for i, c in lo) / w0
        m1 = sum(i * c for i, c in hi) / w1
        v0 = sum(c * (i - m0) ** 2 for i, c in lo) / w0
        v1 = sum(c * (i - m1) ** 2 for i, c in hi) / w1
        within = (w0 * v0 + w1 * v1) / n
        between = (w0 / n) * (w1 / n) * (m0 - m1) ** 2
        worst = max(worst, abs(within + between - total_var))
    return worst, total_var


def bayes_threshold(bg, fg, fraction):
    """The threshold minimizing the expected error for two known Gaussians."""
    def cdf(x, mu, sd):
        return 0.5 * (1 + math.erf((x - mu) / (sd * math.sqrt(2))))
    best_t, best_err = 0, 2.0
    for t in range(256):
        err = (1 - fraction) * (1 - cdf(t + 0.5, *bg)) + fraction * cdf(t + 0.5, *fg)
        if err < best_err:
            best_err, best_t = err, t
    return best_t, best_err


def accuracy(img, truth, thr):
    ok = 0
    for y in range(SIZE):
        for x in range(SIZE):
            ok += (img[y][x] > thr) == truth[y][x]
    return ok / (SIZE * SIZE)


def kittler_illingworth(hist):
    n = sum(hist)
    best_t, best_j = 0, float('inf')
    for t in range(1, 255):
        w0 = sum(hist[:t + 1])
        w1 = n - w0
        if w0 < 2 or w1 < 2:
            continue
        m0 = sum(i * hist[i] for i in range(t + 1)) / w0
        m1 = sum(i * hist[i] for i in range(t + 1, 256)) / w1
        v0 = sum(hist[i] * (i - m0) ** 2 for i in range(t + 1)) / w0
        v1 = sum(hist[i] * (i - m1) ** 2 for i in range(t + 1, 256)) / w1
        if v0 <= 0 or v1 <= 0:
            continue
        p0, p1 = w0 / n, w1 / n
        j = 1 + 2 * (p0 * math.log(math.sqrt(v0)) + p1 * math.log(math.sqrt(v1))) - 2 * (p0 * math.log(p0) + p1 * math.log(p1))
        if j < best_j:
            best_j, best_t = j, t
    return best_t


def sauvola(img, window=15, k=0.2, R=128.0):
    """Sauvola's local threshold t = m (1 + k (s / R - 1)) with m and s from
    integral images. The rule assumes dark objects on a light background
    (document text), so the image is inverted first and a pixel is object
    when it falls BELOW the local threshold."""
    inv = [[255 - v for v in row] for row in img]
    S = [[0] * (SIZE + 1) for _ in range(SIZE + 1)]
    S2 = [[0] * (SIZE + 1) for _ in range(SIZE + 1)]
    for y in range(SIZE):
        rs = rs2 = 0
        for x in range(SIZE):
            v = inv[y][x]
            rs += v
            rs2 += v * v
            S[y + 1][x + 1] = S[y][x + 1] + rs
            S2[y + 1][x + 1] = S2[y][x + 1] + rs2
    half = window // 2
    mask = [[False] * SIZE for _ in range(SIZE)]
    for y in range(SIZE):
        y0, y1 = max(0, y - half), min(SIZE, y + half + 1)
        for x in range(SIZE):
            x0, x1 = max(0, x - half), min(SIZE, x + half + 1)
            area = (y1 - y0) * (x1 - x0)
            s1 = S[y1][x1] - S[y0][x1] - S[y1][x0] + S[y0][x0]
            s2 = S2[y1][x1] - S2[y0][x1] - S2[y1][x0] + S2[y0][x0]
            m = s1 / area
            sd = math.sqrt(max(0.0, s2 / area - m * m))
            mask[y][x] = inv[y][x] < m * (1 + k * (sd / R - 1))
    return mask


def separable(img, window, fn):
    half = window // 2
    tmp = [[fn(row[max(0, x - half):x + half + 1]) for x in range(SIZE)] for row in img]
    out = [[0] * SIZE for _ in range(SIZE)]
    for x in range(SIZE):
        col = [tmp[y][x] for y in range(SIZE)]
        for y in range(SIZE):
            out[y][x] = fn(col[max(0, y - half):y + half + 1])
    return out


def tophat_otsu(img, window=41):
    """Illumination correction: a morphological opening (minimum filter then
    maximum filter, window larger than any object) estimates the background,
    the white top-hat img - opening removes it, and Otsu runs on the result."""
    op = separable(separable(img, window, min), window, max)
    th = [[img[y][x] - op[y][x] for x in range(SIZE)] for y in range(SIZE)]
    hist = [0] * 256
    for row in th:
        for v in row:
            hist[min(255, max(0, v))] += 1
    t, _, _ = otsu(hist)
    return [[th[y][x] > t for x in range(SIZE)] for y in range(SIZE)], t


def mask_accuracy(mask, truth):
    ok = 0
    for y in range(SIZE):
        for x in range(SIZE):
            ok += mask[y][x] == truth[y][x]
    return ok / (SIZE * SIZE)


if __name__ == '__main__':
    rng = random.Random(SEED)
    BG, FG = (80, 15), (160, 20)

    # Oracle 1: the identity, the Bayes threshold, the mask.
    img, truth, frac = make_image(rng, 0.5, BG, FG)
    hist = histogram(img)
    t_otsu, curve, ops_fast = otsu(hist)
    worst_gap, total_var = within_between_total(hist)
    assert worst_gap < 1e-6, worst_gap
    t_bayes, bayes_err = bayes_threshold(BG, FG, frac)
    acc_otsu = accuracy(img, truth, t_otsu)
    acc_bayes = accuracy(img, truth, t_bayes)
    assert abs(t_otsu - t_bayes) <= 6, (t_otsu, t_bayes)
    assert acc_otsu > 0.97 and acc_otsu > acc_bayes - 0.01, (acc_otsu, acc_bayes)

    # Oracle 2: the cost.
    pixels = [v for row in img for v in row]
    t_naive, ops_naive = naive_otsu(pixels)
    assert t_naive == t_otsu, (t_naive, t_otsu)
    ops_fast_total = ops_fast + SIZE * SIZE       # plus the histogram pass
    assert ops_naive > 200 * ops_fast_total, (ops_naive, ops_fast_total)      # measured 416x

    # Oracle 3: illumination.
    img_s, truth_s, frac_s = make_image(rng, 0.25, BG, FG, shade=140)
    t_s, _, _ = otsu(histogram(img_s))
    acc_global = accuracy(img_s, truth_s, t_s)
    best_global = max(accuracy(img_s, truth_s, t) for t in range(0, 256, 2))
    acc_sauvola_doc = mask_accuracy(sauvola(img_s, 15, 0.2), truth_s)
    acc_sauvola = mask_accuracy(sauvola(img_s, 41, 0.2), truth_s)
    mask_th, t_th = tophat_otsu(img_s, 41)
    acc_tophat = mask_accuracy(mask_th, truth_s)
    # AUTHOR CORRECTION: the draft ran Sauvola with the document defaults
    # (window 15) on bright blobs without inverting and scored 67%; with the
    # polarity right it scores 85% at window 15 and 92% at window 41, and the
    # top-hat correction followed by global Otsu reaches 97%
    assert acc_global < 0.7 and best_global < 0.85, (acc_global, best_global)
    assert acc_sauvola > 0.9 and acc_tophat > 0.95, (acc_sauvola, acc_tophat)

    # Oracle 4: class imbalance, on classes that overlap (Bayes error 3 to 10%).
    BG2, FG2 = (100, 18), (150, 22)
    rows = []
    for fraction in (0.5, 0.2, 0.05):
        im, tr, fr = make_image(rng, fraction, BG2, FG2)
        h = histogram(im)
        t_o, _, _ = otsu(h)
        t_k = kittler_illingworth(h)
        t_b, _ = bayes_threshold(BG2, FG2, fr)
        mean_t = int(sum(v for row in im for v in row) / (SIZE * SIZE))
        rows.append((fr, t_b, accuracy(im, tr, t_b), t_o, accuracy(im, tr, t_o), t_k, accuracy(im, tr, t_k), mean_t, accuracy(im, tr, mean_t), accuracy(im, tr, 128)))
    # AUTHOR CORRECTION: the draft expected Otsu's drift to grow smoothly with
    # imbalance on well-separated classes; measured, all thresholds scored
    # within a point there. On overlapping classes the failures are sharp and
    # opposite: at 8% objects Otsu's threshold falls inside the background
    # (73%) while minimum-error holds (96%); at 50% minimum-error finds a
    # spurious minimum in the upper tail (48%) while Otsu holds (89%). Neither
    # criterion is safe in every regime, and a mass guard on the classes
    # (1%, 2%, 5%) does not rescue the spurious minimum.
    assert rows[2][4] < 0.8 and rows[2][6] > 0.95, rows[2]
    assert rows[0][4] > 0.88 and rows[0][6] < 0.6, rows[0]
    assert rows[1][4] > 0.85 and rows[1][6] > 0.85, rows[1]
    assert rows[2][8] < 0.65, rows[2]

    print(f'contest: {SIZE} x {SIZE} synthetic images, background N(80, 15) and objects N(160, 20), the mask known; referees: the within + between = total identity at every threshold, the Bayes threshold of the known Gaussians, and the true mask')
    print(f'identity: worst |within + between - total| = {worst_gap:.2e} over 256 thresholds (total variance {total_var:.0f}); Otsu threshold {t_otsu}, Bayes threshold {t_bayes} (error floor {bayes_err:.2%}); mask accuracy Otsu {acc_otsu:.2%}, Bayes {acc_bayes:.2%}')
    print(f'cost: one-pass histogram method {ops_fast_total:,} operations (histogram pass + {ops_fast:,} on 256 bins); naive recomputation from {len(pixels):,} pixels at every threshold {ops_naive:,}; same threshold {t_naive}')
    print(f'illumination ramp of 140 levels ({frac_s:.0%} objects): global Otsu {acc_global:.1%} at threshold {t_s}; the best possible global threshold {best_global:.1%}; Sauvola window 15 {acc_sauvola_doc:.1%}, window 41 {acc_sauvola:.1%}; top-hat (opening 41) then Otsu at {t_th}: {acc_tophat:.1%}')
    print(f'class imbalance on overlapping classes N(100, 18) vs N(150, 22):')
    print(f"  {'object %':>8} {'Bayes t':>7} {'acc':>6} {'Otsu t':>6} {'acc':>6} {'K-I t':>5} {'acc':>6} {'mean t':>6} {'acc':>6} {'t=128 acc':>9}")
    for fr, tb, ab, to, ao, tk, ak, tm, am, a128 in rows:
        print(f'  {fr:>8.1%} {tb:>7} {ab:>6.1%} {to:>6} {ao:>6.1%} {tk:>5} {ak:>6.1%} {tm:>6} {am:>6.1%} {a128:>9.1%}')
    print(f'OK: within + between = total to {worst_gap:.0e}; Otsu {t_otsu} vs Bayes {t_bayes} at {acc_otsu:.1%}; one pass {ops_fast_total:,} ops vs naive {ops_naive:,}; shading breaks any global threshold ({best_global:.0%} at best), Sauvola recovers {acc_sauvola:.0%} and top-hat plus Otsu {acc_tophat:.0%}; '
          f'on overlapping classes at {rows[2][0]:.0%} objects Otsu {rows[2][4]:.0%} vs minimum-error {rows[2][6]:.0%}, and at {rows[0][0]:.0%} objects Otsu {rows[0][4]:.0%} vs minimum-error {rows[0][6]:.0%}')
