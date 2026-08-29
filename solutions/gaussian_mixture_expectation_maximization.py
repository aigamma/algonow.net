# Puzzle 103: Gaussian mixture model x expectation-maximization
# Soft clustering: explain the data as k overlapping Gaussian
# sources, each with its own weight, center, and full covariance
# (tilted ellipses, not just circles), and let every point belong
# FRACTIONALLY to all of them. EM alternates two moves that never
# hurt: the E-step computes each point's responsibilities (how
# much each component owns it, given current parameters), and the
# M-step refits every parameter in closed form under those
# responsibility weights.
#
# The pairing is the point. The algorithm is the Gaussian mixture
# model: the likelihood being climbed, the thing with parameters.
# The heuristic is expectation-maximization's responsibility
# weighting: guess softly, refit on the soft guess, repeat: the
# guiding rule with a THEOREM attached (Dempster-Laird-Rubin
# 1977: the data log-likelihood never decreases), and this file
# asserts that theorem numerically at every single iteration of
# every run it performs.
#
# Referees:
# (1) THE MONOTONICITY THEOREM: log-likelihood non-decreasing at
#     all iterations of all runs (main fits + 20 restarts);
# (2) responsibilities are a soft partition: every row sums to 1;
# (3) recovery: on a planted 3-source mixture the fitted means,
#     weights, and covariances match the truth (best label
#     permutation, toleranced), and the fitted train
#     log-likelihood is >= the TRUE parameters' (EM found an
#     optimum at least as good as the generator);
# (4) the rival is refereed too: Lloyd's k-means distortion is
#     asserted non-increasing per iteration;
# (5) the contest is measured: hard vs soft on overlapping
#     tilted ellipses (accuracy vs planted labels, best
#     permutation) and on round well-separated blobs (parity,
#     said plainly);
# (6) the pathology is measured, not warned about: unregularized
#     EM seeded on a single point collapses a covariance
#     (min determinant ~ 0) while the log-likelihood DIVERGES:
#     the neverUse, with numbers.
import math
import random

SEED = 20260829
TAU = 2 * math.pi


def mat2_inv_det(s):
    a, b, c, d = s
    det = a * d - b * c
    return (d / det, -b / det, -c / det, a / det), det


def log_gauss2(x, y, mu, cov):
    (ia, ib, ic, id_), det = mat2_inv_det(cov)
    dx, dy = x - mu[0], y - mu[1]
    q = dx * (ia * dx + ib * dy) + dy * (ic * dx + id_ * dy)
    return -0.5 * q - 0.5 * math.log(TAU * TAU * det)


def logsumexp(vals):
    m = max(vals)
    return m + math.log(sum(math.exp(v - m) for v in vals))


def sample_gauss2(rng, mu, cov):
    # Cholesky of a 2x2 covariance: [[l11,0],[l21,l22]]
    a, b, _, d = cov
    l11 = math.sqrt(a)
    l21 = b / l11
    l22 = math.sqrt(d - l21 * l21)
    z1, z2 = rng.gauss(0, 1), rng.gauss(0, 1)
    return (mu[0] + l11 * z1, mu[1] + l21 * z1 + l22 * z2)


def em_fit(pts, k, init_means, iters, ridge=1e-6):
    """Full-covariance 2D EM. Returns (weights, means, covs, ll_history,
    responsibilities). Asserts the monotonicity theorem per iteration."""
    n = len(pts)
    w = [1.0 / k] * k
    mu = [list(m) for m in init_means]
    cov = [(1.0, 0.0, 0.0, 1.0) for _ in range(k)]
    lls = []
    resp = None
    for _ in range(iters):
        # E-step: responsibilities in the log domain.
        resp = []
        ll = 0.0
        for (x, y) in pts:
            lp = [math.log(w[j]) + log_gauss2(x, y, mu[j], cov[j]) for j in range(k)]
            z = logsumexp(lp)
            ll += z
            resp.append([math.exp(v - z) for v in lp])
        if lls:
            assert ll >= lls[-1] - 1e-9, (ll, lls[-1])  # the theorem, every step
        lls.append(ll)
        # M-step: closed-form refit under responsibility weights.
        for j in range(k):
            nj = sum(r[j] for r in resp)
            w[j] = nj / n
            mx = sum(r[j] * p[0] for r, p in zip(resp, pts)) / nj
            my = sum(r[j] * p[1] for r, p in zip(resp, pts)) / nj
            mu[j] = [mx, my]
            sa = sb = sd = 0.0
            for r, (x, y) in zip(resp, pts):
                dx, dy = x - mx, y - my
                sa += r[j] * dx * dx
                sb += r[j] * dx * dy
                sd += r[j] * dy * dy
            cov[j] = (sa / nj + ridge, sb / nj, sb / nj, sd / nj + ridge)
    return w, mu, cov, lls, resp


def kmeans_fit(pts, k, init_means, iters):
    """Lloyd's iteration; distortion asserted non-increasing (its own
    referee). Returns (means, labels, distortion_history)."""
    mu = [list(m) for m in init_means]
    dists = []
    labels = None
    for _ in range(iters):
        labels = []
        dist = 0.0
        for (x, y) in pts:
            best = 0
            bd = float('inf')
            for j in range(k):
                d = (x - mu[j][0]) ** 2 + (y - mu[j][1]) ** 2
                if d < bd:
                    best, bd = j, d
            labels.append(best)
            dist += bd
        if dists:
            assert dist <= dists[-1] + 1e-9, (dist, dists[-1])  # Lloyd's theorem
        dists.append(dist)
        for j in range(k):
            member = [p for p, l in zip(pts, labels) if l == j]
            if member:
                mu[j] = [sum(p[0] for p in member) / len(member), sum(p[1] for p in member) / len(member)]
    return mu, labels, dists


def best_perm_accuracy(pred, truth, k):
    from itertools import permutations
    best = 0
    for perm in permutations(range(k)):
        ok = sum(1 for p, t in zip(pred, truth) if perm[p] == t)
        best = max(best, ok)
    return best / len(truth)


def plant(rng, spec, n):
    pts, labels = [], []
    for _ in range(n):
        u = rng.random()
        acc = 0.0
        for j, (wj, mu, cov) in enumerate(spec):
            acc += wj
            if u <= acc:
                pts.append(sample_gauss2(rng, mu, cov))
                labels.append(j)
                break
    return pts, labels


def kmeanspp_seeds(rng, pts, k):
    """K-means++ seeding (the live unit's own heuristic): first seed
    uniform, then distance-squared-proportional sampling."""
    seeds = [pts[rng.randrange(len(pts))]]
    while len(seeds) < k:
        d2 = []
        for (x, y) in pts:
            d2.append(min((x - sx) ** 2 + (y - sy) ** 2 for (sx, sy) in seeds))
        total = sum(d2)
        u = rng.random() * total
        acc = 0.0
        for p, d in zip(pts, d2):
            acc += d
            if u <= acc:
                seeds.append(p)
                break
    return seeds


def em_best_of(rng, pts, k, restarts, iters):
    """Standard practice, stated on the page: several seeded restarts,
    keep the best final log-likelihood."""
    best = None
    for _ in range(restarts):
        fit = em_fit(pts, k, kmeanspp_seeds(rng, pts, k), iters)
        if best is None or fit[3][-1] > best[3][-1]:
            best = fit
    return best


if __name__ == '__main__':
    rng = random.Random(SEED)

    # The planted instance: three tilted, overlapping ellipses.
    TRUE = [
        (0.5, (0.0, 0.0), (4.0, 1.8, 1.8, 1.0)),
        (0.3, (5.0, 1.5), (1.0, -0.9, -0.9, 2.5)),
        (0.2, (2.0, 4.5), (0.6, 0.0, 0.0, 0.6)),
    ]
    pts, truth = plant(rng, TRUE, 1500)

    # Fit: 8 k-means++-seeded restarts, best final likelihood kept
    # (the standard remedy for EM's local optima, and the page says so).
    w, mu, cov, lls, resp = em_best_of(rng, pts, 3, 8, 120)

    # Oracle 2: a soft partition, exactly.
    for r in resp:
        assert abs(sum(r) - 1.0) < 1e-9
        assert all(-1e-12 <= v <= 1 + 1e-12 for v in r)

    # Oracle 1 extended: 20 random restarts on a fresh smaller sample,
    # every iteration of every one monotone (asserted inside em_fit).
    small, _ = plant(rng, TRUE, 300)
    for _ in range(20):
        s = [small[rng.randrange(300)] for _ in range(3)]
        em_fit(small, 3, s, 40)

    # Oracle 3: recovery, best label permutation.
    from itertools import permutations
    def match(perm):
        err = 0.0
        for j in range(3):
            tm = TRUE[perm[j]][1]
            err += math.hypot(mu[j][0] - tm[0], mu[j][1] - tm[1])
        return err
    perm = min(permutations(range(3)), key=match)
    mean_err = max(
        math.hypot(mu[j][0] - TRUE[perm[j]][1][0], mu[j][1] - TRUE[perm[j]][1][1])
        for j in range(3)
    )
    weight_err = max(abs(w[j] - TRUE[perm[j]][0]) for j in range(3))
    cov_err = max(
        max(abs(cov[j][i] - TRUE[perm[j]][2][i]) for i in range(4))
        for j in range(3)
    )
    assert mean_err < 0.35, mean_err
    assert weight_err < 0.05, weight_err
    assert cov_err < 0.6, cov_err

    # ... and the fitted likelihood beats the generator's own parameters.
    ll_true = 0.0
    for (x, y) in pts:
        lp = [math.log(tw) + log_gauss2(x, y, tm, tc) for tw, tm, tc in TRUE]
        ll_true += logsumexp(lp)
    assert lls[-1] >= ll_true - 1e-6, (lls[-1], ll_true)

    # The contest: hard vs soft, accuracy against planted labels.
    gmm_pred = [max(range(3), key=lambda j: r[j]) for r in resp]
    gmm_acc = best_perm_accuracy(gmm_pred, truth, 3)
    km_best = None
    for _ in range(8):
        kmu, klab, kd = kmeans_fit(pts, 3, kmeanspp_seeds(rng, pts, 3), 60)
        if km_best is None or kd[-1] < km_best[2][-1]:
            km_best = (kmu, klab, kd)
    km_acc = best_perm_accuracy(km_best[1], truth, 3)
    assert gmm_acc > km_acc + 0.05, (gmm_acc, km_acc)

    # Parity row: round, well-separated blobs: k-means is fine, and
    # the page says so.
    ROUND = [
        (1 / 3, (0.0, 0.0), (0.5, 0.0, 0.0, 0.5)),
        (1 / 3, (6.0, 0.0), (0.5, 0.0, 0.0, 0.5)),
        (1 / 3, (3.0, 5.0), (0.5, 0.0, 0.0, 0.5)),
    ]
    rpts, rtruth = plant(rng, ROUND, 900)
    _, _, _, _, rresp = em_best_of(rng, rpts, 3, 4, 60)
    rgmm = best_perm_accuracy([max(range(3), key=lambda j: r[j]) for r in rresp], rtruth, 3)
    rkm_best = None
    for _ in range(4):
        kmu, klab, kd = kmeans_fit(rpts, 3, kmeanspp_seeds(rng, rpts, 3), 60)
        if rkm_best is None or kd[-1] < rkm_best[2][-1]:
            rkm_best = (kmu, klab, kd)
    rkm = best_perm_accuracy(rkm_best[1], rtruth, 3)
    assert abs(rgmm - rkm) < 0.02, (rgmm, rkm)

    # The uncertainty ledger: soft clustering KNOWS where it is unsure.
    unsure = sum(1 for r in resp if max(r) < 0.9)

    # Oracle 6: the pathology, measured. No ridge, one component
    # seeded exactly on a data point: variance collapses, the
    # log-likelihood diverges, and the "fit" explains nothing.
    tiny, _ = plant(rng, TRUE, 40)
    _, _, _, sane_tiny_lls, _ = em_best_of(rng, tiny, 2, 4, 25)
    sane_ll = sane_tiny_lls[-1]
    # (a) The mechanism: one component seeded ON a data point with a
    # tight covariance owns only that point; the ridgeless M-step then
    # refits its covariance to that single point's zero scatter, and
    # the determinant underflows to zero. Measured, not warned about.
    n0 = len(tiny)
    sw = [0.5, 0.5]
    smu = [list(tiny[0]), [1.0, 1.0]]
    scov = [(1e-4, 0.0, 0.0, 1e-4), (4.0, 0.0, 0.0, 4.0)]
    min_det = 1.0
    collapse_iter = None
    for it in range(25):
        sresp = []
        for (x, y) in tiny:
            lp = [math.log(sw[j]) + log_gauss2(x, y, smu[j], scov[j]) for j in range(2)]
            z = logsumexp(lp)
            sresp.append([math.exp(v - z) for v in lp])
        for j in range(2):
            nj = sum(r[j] for r in sresp)
            sw[j] = nj / n0
            mx = sum(r[j] * p[0] for r, p in zip(sresp, tiny)) / nj
            my = sum(r[j] * p[1] for r, p in zip(sresp, tiny)) / nj
            smu[j] = [mx, my]
            sa = sb = sd = 0.0
            for r, (x, y) in zip(sresp, tiny):
                dx, dy = x - mx, y - my
                sa += r[j] * dx * dx
                sb += r[j] * dx * dy
                sd += r[j] * dy * dy
            scov[j] = (sa / nj, sb / nj, sb / nj, sd / nj)  # NO ridge: the point
        det0 = abs(scov[0][0] * scov[0][3] - scov[0][1] * scov[0][2])
        min_det = min(min_det, det0)
        if det0 < 1e-200:
            collapse_iter = it + 1
            break  # one more E-step would divide by zero
    assert collapse_iter is not None and min_det < 1e-12, (collapse_iter, min_det)

    # (b) The divergence: walk the likelihood as that component's
    # variance shrinks toward the collapse EM just performed. The data
    # log-likelihood climbs WITHOUT BOUND while the model explains
    # nothing new: Bishop's singularity, with numbers.
    mean_all = (sum(p[0] for p in tiny) / n0, sum(p[1] for p in tiny) / n0)
    sa = sum((p[0] - mean_all[0]) ** 2 for p in tiny) / n0
    sd = sum((p[1] - mean_all[1]) ** 2 for p in tiny) / n0
    ladder = []
    for eps in (1e-2, 1e-10, 1e-30, 1e-80):
        ll = 0.0
        for (x, y) in tiny:
            lp = [
                math.log(0.5) + log_gauss2(x, y, tiny[0], (eps, 0.0, 0.0, eps)),
                math.log(0.5) + log_gauss2(x, y, mean_all, (sa, 0.0, 0.0, sd)),
            ]
            ll += logsumexp(lp)
        ladder.append(ll)
    assert all(b > a for a, b in zip(ladder, ladder[1:])), ladder
    assert ladder[-1] > sane_ll + 100, (ladder[-1], sane_ll)

    print('contest: 3-source clustering, accuracy vs planted labels (best permutation); the fits referee themselves: EM log-likelihood monotone at every iteration, Lloyd distortion non-increasing')
    print(f"  {'instance':<34} {'gmm-em':>8} {'k-means':>9}")
    print(f"  {'tilted, overlapping ellipses':<34} {gmm_acc * 100:>7.1f}% {km_acc * 100:>8.1f}%   full covariance reads the tilt; hard round distance cannot")
    print(f"  {'round, well-separated blobs':<34} {rgmm * 100:>7.1f}% {rkm * 100:>8.1f}%   parity, said plainly: when clusters are round, k-means is enough")
    print(f"recovery, audited: fitted means within {mean_err:.2f} of truth (max), weights within {weight_err:.3f}, covariances within {cov_err:.2f}; fitted log-likelihood {lls[-1]:,.1f} >= the generator's own {ll_true:,.1f}")
    print(f"the theorem, cashed out: log-likelihood non-decreasing at every one of {len(lls) - 1} main-fit steps and every step of 20 restarts; every responsibility row sums to 1")
    print(f"the soft dividend: {unsure} of {len(pts)} points carry max responsibility under 0.9: the model KNOWS which points sit on the seam")
    print(f"the pathology, measured: ridgeless EM seeded on one data point collapsed its covariance determinant below 1e-200 within {collapse_iter} iteration(s); "
          f"walking the same collapse parametrically, the data log-likelihood climbs {ladder[0]:,.0f} -> {ladder[1]:,.0f} -> {ladder[2]:,.0f} -> {ladder[3]:,.0f} without bound "
          f"(a sane 2-component fit of the same 40 points: {sane_ll:,.0f}): likelihood up, insight zero: the ridge exists for this")
    print(f'OK: EM monotone everywhere, responsibilities a soft partition, the planted mixture recovered (means/weights/covariances toleranced, fitted LL >= true LL), '
          f'soft beats hard by {(gmm_acc - km_acc) * 100:.1f} points on tilted overlap with parity on round blobs, and the singularity pathology reproduced with numbers')
