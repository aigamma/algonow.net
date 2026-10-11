"""Greedy k-center x Farthest-first traversal (puzzle 212).

Gonzalez (1985): start anywhere, then repeatedly add the point farthest
from the centers chosen so far. After k picks the farthest remaining point
is the witness: it and the k centers are k + 1 points pairwise at least the
greedy radius apart, any k centers serve two of them from one center, so
the optimum radius is at least half the greedy radius. Everything below is
measured against exact optima (brute force over center subsets), against
the witness inequality on every instance, and against k-means++ seeding,
Lloyd, PAM swaps, the Hochbaum-Shmoys threshold method, random centers,
and exhaustive search.

AUTHOR CORRECTIONS (draft claims replaced by measurement): the draft said
Lloyd's iterations would raise the max radius from any seeding; from the
traversal's seeds they lowered it (2.806 to 2.607) while k-means++ seeds
ended at 3.507. The draft expected single-center swaps to trim the greedy
radius by a few percent; 210 candidate swaps found no improvement, because
the radius is set by isolated noise points that no one swap rescues. The
draft expected the threshold method to tie the traversal; it averaged
1.241 against 1.285 on the exact instances, at the cost of sorting every
pairwise distance.
"""
import itertools
import math
import random
import time

T0 = time.time()


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def nearest(pts, centers):
    """Distance from each point to its nearest center."""
    return [min(dist(p, pts[c]) for c in centers) for p in pts]


def radius(pts, centers):
    return max(nearest(pts, centers))


def sse(pts, centers):
    return sum(d * d for d in nearest(pts, centers))


def farthest_first(pts, k, start=0):
    """Gonzalez. Returns centers, the radius after each pick, the witness."""
    centers = [start]
    d = [dist(p, pts[start]) for p in pts]
    radii = []
    far = 0
    for _ in range(k):
        far = max(range(len(pts)), key=d.__getitem__)
        radii.append(d[far])
        if len(centers) == k:
            break
        centers.append(far)
        for i, p in enumerate(pts):
            e = dist(p, pts[far])
            if e < d[i]:
                d[i] = e
    return centers, radii, far


def exact_k_center(pts, k):
    """Brute force over k-subsets of the points; returns (radius, evaluations)."""
    n = len(pts)
    D = [[dist(a, b) for b in pts] for a in pts]
    best = float('inf')
    evals = 0
    for combo in itertools.combinations(range(n), k):
        evals += 1
        worst = 0.0
        for i in range(n):
            m = min(D[i][c] for c in combo)
            if m > worst:
                worst = m
                if worst >= best:
                    break
        if worst < best:
            best = worst
    return best, evals


def threshold_method(pts, k):
    """Hochbaum-Shmoys: binary search the radius r over pairwise distances;
    greedily take an uncovered point and cover everything within 2r."""
    n = len(pts)
    cands = sorted({dist(pts[i], pts[j]) for i in range(n) for j in range(i + 1, n)})

    def cover(r):
        centers = []
        covered = [False] * n
        for i in range(n):
            if not covered[i]:
                centers.append(i)
                for j in range(n):
                    if not covered[j] and dist(pts[i], pts[j]) <= 2 * r:
                        covered[j] = True
        return centers

    lo, hi = 0, len(cands) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if len(cover(cands[mid])) <= k:
            hi = mid
        else:
            lo = mid + 1
    return cover(cands[lo])


def kmeanspp(pts, k, rng):
    centers = [rng.randrange(len(pts))]
    d2 = [dist(p, pts[centers[0]]) ** 2 for p in pts]
    while len(centers) < k:
        pick = rng.choices(range(len(pts)), weights=d2)[0]
        centers.append(pick)
        for i, p in enumerate(pts):
            e = dist(p, pts[pick]) ** 2
            if e < d2[i]:
                d2[i] = e
    return centers


def lloyd(pts, means, iters=50):
    """Lloyd from coordinate means; returns means, iterations, assignment."""
    assign = None
    for it in range(1, iters + 1):
        new = [min(range(len(means)), key=lambda c: dist(p, means[c])) for p in pts]
        if new == assign:
            return means, it - 1, assign
        assign = new
        for c in range(len(means)):
            members = [p for p, a in zip(pts, assign) if a == c]
            if members:
                means[c] = (sum(p[0] for p in members) / len(members), sum(p[1] for p in members) / len(members))
    return means, iters, assign


def radius_to_means(pts, means):
    return max(min(dist(p, m) for m in means) for p in pts)


def sse_to_means(pts, means):
    return sum(min(dist(p, m) for m in means) ** 2 for p in pts)


def swap_search(pts, centers, objective, rng, passes=12, samples=20):
    """Swap local search from a start: try swapping each center with the
    current farthest point and with sampled points; keep improving swaps."""
    centers = list(centers)
    cur = objective(pts, centers)
    evals = 0
    for _ in range(passes):
        improved = False
        d = nearest(pts, centers)
        far = max(range(len(pts)), key=d.__getitem__)
        cands = [far] + [rng.randrange(len(pts)) for _ in range(samples)]
        for ci in range(len(centers)):
            for p in cands:
                if p in centers:
                    continue
                trial = centers[:ci] + [p] + centers[ci + 1:]
                val = objective(pts, trial)
                evals += 1
                if val < cur - 1e-12:
                    centers, cur, improved = trial, val, True
        if not improved:
            break
    return centers, cur, evals


def small_instance(rng, n):
    pts = []
    blobs = [(rng.random(), rng.random()) for _ in range(rng.randint(2, 3))]
    for _ in range(n):
        if rng.random() < 0.7:
            cx, cy = rng.choice(blobs)
            pts.append((cx + rng.gauss(0, 0.08), cy + rng.gauss(0, 0.08)))
        else:
            pts.append((rng.random(), rng.random()))
    return pts


def big_instance(rng, n=1000, k=10):
    cores = [(rng.uniform(1, 9), rng.uniform(1, 9)) for _ in range(k)]
    pts = []
    for i in range(n):
        if i % 10 == 0:
            pts.append((rng.uniform(0, 10), rng.uniform(0, 10)))
        else:
            cx, cy = cores[i % k]
            pts.append((cx + rng.gauss(0, 0.45), cy + rng.gauss(0, 0.45)))
    return pts


def mean_se(xs):
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / max(1, len(xs) - 1)
    return m, math.sqrt(v / len(xs))


def main():
    rng = random.Random(212)

    # 1. exact optima on small instances: ratio, witness inequality, rivals
    ratios, hs_ratios, rand_ratios = [], [], []
    optimal = 0
    nodes = 0
    for n, k, reps in ((12, 3, 150), (14, 4, 80)):
        for _ in range(reps):
            pts = small_instance(rng, n)
            opt, ev = exact_k_center(pts, k)
            nodes += ev
            centers, radii, witness = farthest_first(pts, k)
            r = radii[-1]
            assert abs(radius(pts, centers) - r) < 1e-12
            group = centers + [witness]
            minpair = min(dist(pts[a], pts[b]) for a, b in itertools.combinations(group, 2))
            assert r <= minpair + 1e-12, 'witness: the k + 1 points must be at least r apart'
            assert minpair <= 2 * opt + 1e-12, 'witness: two of the k + 1 points share an optimal center'
            assert r <= 2 * opt + 1e-12
            ratios.append(r / opt)
            optimal += r <= opt + 1e-9
            hs = threshold_method(pts, k)
            assert len(hs) <= k
            hs_ratios.append(radius(pts, hs) / opt)
            rand_ratios.append(radius(pts, rng.sample(range(n), k)) / opt)
    rm, rse = mean_se(ratios)
    hm, hse = mean_se(hs_ratios)
    qm, qse = mean_se(rand_ratios)
    print(f"{len(ratios)} small instances (n = 12 and 14, k = 3 and 4), exact optimum by {nodes:,} subset evaluations")
    print(f"  farthest-first   ratio mean {rm:.3f} +- {rse:.3f}  worst {max(ratios):.3f}  optimal on {optimal}")
    print(f"  threshold method ratio mean {hm:.3f} +- {hse:.3f}  worst {max(hs_ratios):.3f}")
    print(f"  random centers   ratio mean {qm:.3f} +- {qse:.3f}  worst {max(rand_ratios):.3f}")
    assert max(ratios) <= 2 + 1e-9 and max(hs_ratios) <= 2 + 1e-9

    # 2. the tight family: k copies of {0, 1, 2}, far apart
    tight = []
    for k in range(1, 6):
        pts = [(100.0 * j + x, 0.0) for j in range(k) for x in (0.0, 1.0, 2.0)]
        centers, radii, _ = farthest_first(pts, k)
        opt, _ = exact_k_center(pts, k)
        tight.append(radii[-1] / opt)
        assert abs(radii[-1] - 2.0) < 1e-12 and abs(opt - 1.0) < 1e-12
    print(f"tight family ratios for k = 1..5: {', '.join(f'{t:.3f}' for t in tight)}")

    # 3. n = 1,000, k = 10: the traversal against k-means++, Lloyd, PAM swaps
    pts = big_instance(rng)
    k = 10
    t = time.time()
    ff, radii, _ = farthest_first(pts, k)
    ff_time = time.time() - t
    ff_r, ff_sse = radii[-1], sse(pts, ff)
    pp_r, pp_sse, ll_r, ll_sse, ll_it, fl_r, fl_sse = [], [], [], [], [], [], []
    for s in range(10):
        r2 = random.Random(1000 + s)
        c = kmeanspp(pts, k, r2)
        pp_r.append(radius(pts, c))
        pp_sse.append(sse(pts, c))
        means, it, _ = lloyd(pts, [pts[i] for i in c])
        ll_r.append(radius_to_means(pts, means))
        ll_sse.append(sse_to_means(pts, means))
        ll_it.append(it)
    means, fl_it, _ = lloyd(pts, [pts[i] for i in ff])
    fl_r, fl_sse = radius_to_means(pts, means), sse_to_means(pts, means)
    r3 = random.Random(7)
    sw, sw_r, sw_ev = swap_search(pts, ff, radius, r3)
    pam, pam_sum, pam_ev = swap_search(pts, ff, lambda P, C: sum(nearest(P, C)), r3)
    hs = threshold_method(pts, k)
    hs_r = radius(pts, hs)
    rnd_r = [radius(pts, random.Random(50 + s).sample(range(len(pts)), k)) for s in range(10)]
    print(f"n = {len(pts):,}, k = {k}:  method                    max radius   SSE       extra")
    print(f"  farthest-first traversal            {ff_r:8.3f} {ff_sse:9.1f}   {ff_time * 1000:.1f} ms")
    print(f"  k-means++ seeding (10 seeds)        {mean_se(pp_r)[0]:8.3f} {mean_se(pp_sse)[0]:9.1f}   worst radius {max(pp_r):.3f}")
    print(f"  k-means++ then Lloyd                {mean_se(ll_r)[0]:8.3f} {mean_se(ll_sse)[0]:9.1f}   {mean_se(ll_it)[0]:.1f} iterations")
    print(f"  traversal then Lloyd                {fl_r:8.3f} {fl_sse:9.1f}   {fl_it} iterations")
    print(f"  swap search on the max (from FFT)   {sw_r:8.3f} {sse(pts, sw):9.1f}   {sw_ev} evaluations")
    print(f"  PAM swaps on the sum (from FFT)     {radius(pts, pam):8.3f} {sse(pts, pam):9.1f}   sum {pam_sum:.1f} vs {sum(nearest(pts, ff)):.1f}")
    print(f"  threshold method                    {hs_r:8.3f} {sse(pts, hs):9.1f}   {len(hs)} centers")
    print(f"  random centers (10 draws)           {mean_se(rnd_r)[0]:8.3f}             ratio to FFT {mean_se(rnd_r)[0] / ff_r:.2f} +- {mean_se(rnd_r)[1] / ff_r:.2f}")
    assert ff_r <= min(pp_r) and ff_r < mean_se(ll_r)[0], 'the traversal owns the max radius'
    assert mean_se(ll_sse)[0] < ff_sse and mean_se(pp_sse)[0] < ff_sse, 'k-means owns the sum of squares'
    assert sw_r <= ff_r + 1e-12 and radius(pts, pam) >= ff_r and pam_sum < sum(nearest(pts, ff))
    assert ff_r <= 2 * hs_r + 1e-9 and hs_r <= 2 * ff_r + 1e-9, 'both sit within a factor two of the same optimum'

    # 4. one outlier eats a center (ten tight clusters, no noise, so each center matters)
    clean = [(cx + rng.gauss(0, 0.3), cy + rng.gauss(0, 0.3)) for cx, cy in [(2, 2), (2, 5), (2, 8), (5, 2), (5, 5), (5, 8), (8, 2), (8, 5), (8, 8), (5, 11)] for _ in range(60)]
    cc, cradii, _ = farthest_first(clean, k)
    far_pts = clean + [(60.0, 60.0)]
    oc, oradii, _ = farthest_first(far_pts, k)
    assert len(far_pts) - 1 in oc, 'the outlier becomes a center'
    bulk_r = radius(clean, [c for c in oc if c != len(far_pts) - 1])
    print(f"ten clean clusters, k = 10: radius {cradii[-1]:.3f}; add one outlier at (60, 60): it is center {oc.index(len(far_pts) - 1) + 1} of {k}, the bulk keeps {k - 1} centers and its radius becomes {bulk_r:.3f} ({bulk_r / cradii[-1]:.2f}x)")
    assert bulk_r > 1.5 * cradii[-1]

    # 5. exhaustive search is not an option
    growth, secs = [], []
    p16 = small_instance(random.Random(16), 16)
    for kk in (3, 4, 5, 6):
        t = time.time()
        _, ev = exact_k_center(p16, kk)
        secs.append(time.time() - t)
        growth.append(ev)
    per_eval = sum(secs) / sum(growth)
    years = math.comb(1000, 10) * per_eval / 3.15e7
    print(f"exact search at n = 16, k = 3..6: {', '.join(f'{g:,}' for g in growth)} subsets in {sum(secs):.2f} s; C(1000, 10) = {math.comb(1000, 10):.3e} subsets, about {years:.1e} years at that pace")
    assert growth == [math.comb(16, kk) for kk in (3, 4, 5, 6)]

    print(f"OK: farthest-first within 2 x OPT on {len(ratios)} exact instances (mean {rm:.3f}, worst {max(ratios):.3f}, optimal on {optimal}) with r <= min pair <= 2 OPT on every one; the tight family hits exactly 2.000 for k = 1 to 5; threshold method mean {hm:.3f}, random centers {qm:.2f}; at n = 1,000 and k = 10 the traversal's radius {ff_r:.3f} beats k-means++ {mean_se(pp_r)[0]:.3f} and k-means++ plus Lloyd {mean_se(ll_r)[0]:.3f} while Lloyd's SSE {mean_se(ll_sse)[0]:.0f} beats the traversal's {ff_sse:.0f}; {sw_ev} candidate swaps improve nothing; one outlier costs a center and {bulk_r / cradii[-1]:.2f}x the bulk radius; C(1000, 10) = {math.comb(1000, 10):.2e}; {time.time() - T0:.1f} s")


if __name__ == '__main__':
    main()
