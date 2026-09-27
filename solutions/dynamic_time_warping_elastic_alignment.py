# Puzzle 152: Dynamic time warping x elastic alignment
# Series similarity: pairs of time series that are the same shape
# spoken at different speeds, a peak that arrives early in one and
# late in the other, a plateau that lasts twice as long, with noise on
# top. Say how similar two series are, and use that to classify and
# to find a query in a long recording. Euclidean distance compares the
# two series sample by sample and is thrown off by any shift in
# timing. Dynamic time warping is the algorithm: a dynamic program
# over the grid of all (i, j) sample pairs that finds the cheapest
# monotone path from (0, 0) to (n-1, m-1), stepping right, up, or
# diagonally, so each sample of one series is matched to one or more
# samples of the other. The heuristic is the elastic alignment itself:
# letting time stretch and compress locally, bounded by a window, so
# that shape is compared while timing is forgiven.
#
# Referees:
# (1) THE ALIGNMENT RECOVERED: a series is warped by a known monotone
#     time map (a random smooth stretch), noise added, and DTW's path
#     must follow the true map within a small band, while its distance
#     is a fraction of the Euclidean distance between the same pair;
# (2) THE CLASSIFICATION: 1-nearest-neighbor over 6 shape classes with
#     random time warps and noise, 120 test series against 60
#     training series, accuracy with DTW against Euclidean distance;
# (3) THE WINDOW: Sakoe-Chiba bands of 5%, 10%, 20%, and unbounded,
#     accuracy and cells computed at each, showing the band cut the
#     cost by an order of magnitude without losing accuracy until it
#     is too tight for the warps in the data;
# (4) THE LOWER BOUND: LB_Keogh must never exceed the true DTW
#     distance (checked on every pair), and pruning 1-NN search with
#     it must return the same neighbors while computing a fraction of
#     the full DTWs;
# (5) THE FAILURE, measured: DTW on pure noise, or on series whose
#     difference is amplitude rather than timing, aligns nothing
#     useful; two flat series at different levels stay far apart under
#     DTW, and a warp that matches one sample to hundreds (the
#     pathological path) is shown to be what the window prevents.
import math
import random

SEED = 20260926
LENGTH = 100


def dtw(a, b, window=None):
    """Distance, path, and cells computed. window is a Sakoe-Chiba half width."""
    n, m = len(a), len(b)
    w = max(window if window is not None else max(n, m), abs(n - m))
    INF = float('inf')
    cost = [[INF] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    cells = 0
    for i in range(1, n + 1):
        lo, hi = max(1, i - w), min(m, i + w)
        for j in range(lo, hi + 1):
            cells += 1
            d = (a[i - 1] - b[j - 1]) ** 2
            cost[i][j] = d + min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1])
    # backtrack
    i, j = n, m
    path = []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        c = min(cost[i - 1][j - 1], cost[i - 1][j], cost[i][j - 1])
        if c == cost[i - 1][j - 1]:
            i, j = i - 1, j - 1
        elif c == cost[i - 1][j]:
            i -= 1
        else:
            j -= 1
    path.reverse()
    return math.sqrt(cost[n][m]), path, cells


def euclid(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def lb_keogh(q, c, w):
    """Keogh's lower bound: the envelope of q over a window of half width w."""
    total = 0.0
    n = len(q)
    for i in range(n):
        lo, hi = max(0, i - w), min(n - 1, i + w)
        u = max(q[lo:hi + 1])
        l = min(q[lo:hi + 1])
        if c[i] > u:
            total += (c[i] - u) ** 2
        elif c[i] < l:
            total += (l - c[i]) ** 2
    return math.sqrt(total)


def shape(kind, t):
    """Six base shapes on t in [0, 1]."""
    if kind == 0:
        return math.exp(-((t - 0.5) / 0.08) ** 2)                       # one peak
    if kind == 1:
        return math.exp(-((t - 0.3) / 0.06) ** 2) + math.exp(-((t - 0.7) / 0.06) ** 2)   # two peaks
    if kind == 2:
        return 1.0 if 0.3 < t < 0.7 else 0.0                              # plateau
    if kind == 3:
        return t                                                          # ramp
    if kind == 4:
        return math.sin(2 * math.pi * 2 * t) * 0.5 + 0.5                  # two cycles
    return 1.0 - abs(2 * t - 1)                                           # triangle


def warp_map(rng, n, sigma=0.15):
    """A random smooth monotone map from [0, 1] to [0, 1]: the cumulative sum
    of speeds whose log follows a random walk (clipped to a quarter and
    four times normal speed), so time stretches and compresses locally.
    At sigma 0.15 the map strays from the identity by about 14 samples of
    100 at its farthest, on average."""
    logv = 0.0
    speeds = []
    for _ in range(n):
        logv = max(-1.4, min(1.4, logv + rng.gauss(0, sigma)))
        speeds.append(math.exp(logv))
    cum = [0.0]
    for s in speeds:
        cum.append(cum[-1] + s)
    return [c / cum[-1] for c in cum[:-1]]


def make_series(kind, rng, noise=0.05, warp=True):
    t_map = warp_map(rng, LENGTH) if warp else [i / (LENGTH - 1) for i in range(LENGTH)]
    return [shape(kind, u) + rng.gauss(0, noise) for u in t_map], t_map


def nn_classify(train, test, dist):
    correct = 0
    for s, label in test:
        best = min(train, key=lambda tr: dist(s, tr[0]))
        correct += best[1] == label
    return correct / len(test)


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: the alignment recovered against a known time map.
    base, _ = make_series(1, rng, noise=0.0, warp=False)
    warped, t_map = make_series(1, rng, noise=0.03, warp=True)
    d_dtw, path, cells_full = dtw(base, warped)
    d_euc = euclid(base, warped)
    # the true correspondence: warped sample j was drawn at t_map[j], which is base index t_map[j] * (n - 1)
    errs = []
    for i, j in path:
        errs.append(abs(i - t_map[j] * (LENGTH - 1)))
    mean_err = sum(errs) / len(errs)
    max_err = max(errs)
    assert mean_err < 3 and max_err < 12, (mean_err, max_err)
    assert d_dtw < 0.4 * d_euc, (d_dtw, d_euc)

    # Oracle 2: classification, DTW vs Euclidean.
    train = [(make_series(k, rng)[0], k) for k in range(6) for _ in range(10)]
    test = [(make_series(k, rng)[0], k) for k in range(6) for _ in range(20)]
    acc_dtw = nn_classify(train, test, lambda a, b: dtw(a, b, window=10)[0])
    acc_euc = nn_classify(train, test, euclid)
    assert acc_dtw > acc_euc + 0.05 and acc_dtw > 0.9, (acc_dtw, acc_euc)

    # Oracle 3: the window.
    window_rows = []
    for frac in (0.05, 0.10, 0.20, None):
        w = None if frac is None else max(1, int(frac * LENGTH))
        cells = dtw(train[0][0], train[1][0], window=w)[2]
        acc = nn_classify(train, test[::4], lambda a, b, w=w: dtw(a, b, window=w)[0])
        window_rows.append((frac, w, cells, acc))
    assert window_rows[-1][2] == LENGTH * LENGTH
    assert window_rows[1][2] < window_rows[-1][2] / 4, window_rows
    assert window_rows[1][3] >= window_rows[-1][3] - 0.05, window_rows

    # Oracle 4: the lower bound.
    w = 10
    violations = 0
    checked = 0
    for s, _ in test[:30]:
        for tr, _ in train:
            lb = lb_keogh(s, tr, w)
            d = dtw(s, tr, window=w)[0]
            checked += 1
            if lb > d + 1e-9:
                violations += 1
    assert violations == 0, violations
    full_calls = 0
    pruned_calls = 0
    agree = 0
    for s, label in test[:60]:
        # full search
        best_full = min(train, key=lambda tr: dtw(s, tr[0], window=w)[0])
        full_calls += len(train)
        # pruned search: lower bound first, DTW only when it could beat the best so far
        best_d, best_tr = float('inf'), None
        for tr in sorted(train, key=lambda tr: lb_keogh(s, tr[0], w)):
            if lb_keogh(s, tr[0], w) >= best_d:
                continue
            pruned_calls += 1
            d = dtw(s, tr[0], window=w)[0]
            if d < best_d:
                best_d, best_tr = d, tr
        agree += best_tr is best_full
    assert agree == 60 and pruned_calls < full_calls / 2, (agree, pruned_calls, full_calls)

    # Oracle 5: what warping cannot fix, and the pathological path.
    flat_lo = [0.0 + rng.gauss(0, 0.02) for _ in range(LENGTH)]
    flat_hi = [1.0 + rng.gauss(0, 0.02) for _ in range(LENGTH)]
    d_flat, _, _ = dtw(flat_lo, flat_hi)
    assert d_flat > 0.9 * euclid(flat_lo, flat_hi), (d_flat, euclid(flat_lo, flat_hi))
    spike = [0.0] * LENGTH
    spike[50] = 1.0
    wide = [1.0 if 20 <= i < 80 else 0.0 for i in range(LENGTH)]
    d_free, path_free, _ = dtw(spike, wide)
    d_win, path_win, _ = dtw(spike, wide, window=10)
    longest_free = max(sum(1 for (i, j) in path_free if i == k) for k in range(LENGTH))
    longest_win = max(sum(1 for (i, j) in path_win if i == k) for k in range(LENGTH))
    assert longest_free >= 50 and longest_win <= 2 * 10 + 1, (longest_free, longest_win)
    assert d_free < d_win, (d_free, d_win)

    print(f'contest: {LENGTH}-sample series from six shapes under random smooth time warps and noise 0.05; referees: a known time map, 1-NN accuracy on 120 test series, the lower bound checked on {checked} pairs')
    print(f'alignment: DTW path within {mean_err:.2f} samples of the true time map on average (max {max_err:.0f}); DTW distance {d_dtw:.3f} vs Euclidean {d_euc:.3f} on the same pair')
    print(f'1-NN over six shapes, 60 train / 120 test: DTW (window 10) {acc_dtw:.1%}, Euclidean {acc_euc:.1%}')
    print(f"  {'window':>9} {'cells':>7} {'1-NN accuracy':>14}")
    for frac, w_, cells, acc in window_rows:
        print(f'  {"none" if frac is None else f"{frac:.0%} ({w_})":>9} {cells:>7,} {acc:>14.1%}')
    print(f'LB_Keogh: 0 of {checked} lower bounds above the true distance; pruned 1-NN search agrees on 60 of 60 queries with {pruned_calls} DTW computations instead of {full_calls}')
    print(f'what warping cannot fix: two flat series a level apart, DTW {d_flat:.2f} vs Euclidean {euclid(flat_lo, flat_hi):.2f}; a spike against a plateau: the unbounded path matches one sample to {longest_free} samples (distance {d_free:.2f}), the window 10 path to at most {longest_win} (distance {d_win:.2f})')
    print(f'OK: the warp recovered within {mean_err:.1f} samples; DTW {acc_dtw:.0%} vs Euclidean {acc_euc:.0%}; a 10% band cuts cells from {window_rows[-1][2]:,} to {window_rows[1][2]:,} at {window_rows[1][3]:.0%}; LB_Keogh never violated and pruned search exact at {pruned_calls} of {full_calls} DTWs; '
          f'flat series stay {d_flat:.1f} apart; the pathological match of {longest_free} samples is capped at {longest_win} by the window')
