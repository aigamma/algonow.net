# Puzzle 18: K-means x k-means++ seeding
# Place k centers among n points to minimize the total squared distance from
# each point to its nearest center, and know which failures are seeding and
# which are shape.
#
# The pairing is the point. Lloyd's iteration is the control structure:
# assign every point to its nearest center, move every center to the mean of
# its assigned points, repeat. Each step provably lowers the objective, so
# it always converges: to the nearest LOCAL optimum, and with careless
# seeding the nearest local optimum is often terrible (two seeds landing in
# one blob merge two real clusters somewhere else). The heuristic is
# k-means++ seeding: pick the first center at random, then pick each next
# center with probability proportional to squared distance from the nearest
# center already chosen. Spread-by-D-squared makes collapsed seeds rare and
# carries a theorem: expected cost within 8(ln k + 2) of optimal before
# Lloyd's even starts.
import random


def dist2(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2


def sse_of(points, centers, assign):
    return sum(dist2(p, centers[a]) for p, a in zip(points, assign))


def seed_random(points, k, rng):
    return [points[i] for i in rng.sample(range(len(points)), k)]


def seed_plus_plus(points, k, rng):
    centers = [points[rng.randrange(len(points))]]
    d2 = [dist2(p, centers[0]) for p in points]
    for _ in range(k - 1):
        total = sum(d2)
        r = rng.random() * total
        acc = 0.0
        for i, w in enumerate(d2):
            acc += w
            if acc >= r:
                centers.append(points[i])
                break
        else:
            centers.append(points[-1])
        for i, p in enumerate(points):
            nd = dist2(p, centers[-1])
            if nd < d2[i]:
                d2[i] = nd
    return centers


def lloyd(points, centers, counter=None, max_iter=200):
    """Lloyd's alternation. Returns (assign, centers, sse, iterations,
    history); the history lets the oracle assert monotone descent."""
    k = len(centers)
    centers = list(centers)
    assign = [-1] * len(points)
    history = []
    for it in range(1, max_iter + 1):
        moved = False
        for i, p in enumerate(points):
            best, bd = assign[i], float("inf")
            for c in range(k):
                if counter is not None:
                    counter["dist"] = counter.get("dist", 0) + 1
                d = dist2(p, centers[c])
                if d < bd:
                    bd, best = d, c
            if best != assign[i]:
                assign[i] = best
                moved = True
        history.append(sse_of(points, centers, assign))
        sums = [[0.0, 0.0, 0] for _ in range(k)]
        for p, a in zip(points, assign):
            sums[a][0] += p[0]
            sums[a][1] += p[1]
            sums[a][2] += 1
        for c in range(k):
            if sums[c][2]:
                centers[c] = (sums[c][0] / sums[c][2], sums[c][1] / sums[c][2])
        if not moved:
            return assign, centers, history[-1], it, history
    return assign, centers, history[-1], max_iter, history


# ---------------------------------------------------------------- the rivals


def dbscan(points, eps, min_pts):
    """Density clustering: core points chain through eps-balls; clusters are
    the connected shapes, whatever shape that is. k is not an input."""
    n = len(points)
    eps2 = eps * eps
    neighbors = [[j for j in range(n) if j != i and dist2(points[i], points[j]) <= eps2] for i in range(n)]
    labels = [None] * n
    cluster = 0
    for i in range(n):
        if labels[i] is not None:
            continue
        if len(neighbors[i]) + 1 < min_pts:
            labels[i] = -1
            continue
        labels[i] = cluster
        stack = list(neighbors[i])
        while stack:
            j = stack.pop()
            if labels[j] == -1:
                labels[j] = cluster
            if labels[j] is not None:
                continue
            labels[j] = cluster
            if len(neighbors[j]) + 1 >= min_pts:
                stack.extend(neighbors[j])
        cluster += 1
    return labels


def single_linkage(points, k):
    """Agglomerative clustering under single linkage, computed the honest
    way: it is exactly the minimum spanning tree with the k-1 longest edges
    cut. Nearest-neighbor chains make it brilliant on filaments and fatal
    around noise bridges."""
    n = len(points)
    in_tree = [False] * n
    best = [float("inf")] * n
    parent = [-1] * n
    best[0] = 0.0
    edges = []
    for _ in range(n):
        v = min((i for i in range(n) if not in_tree[i]), key=lambda i: best[i])
        in_tree[v] = True
        if parent[v] >= 0:
            edges.append((best[v], v, parent[v]))
        for u in range(n):
            if not in_tree[u]:
                d = dist2(points[v], points[u])
                if d < best[u]:
                    best[u] = d
                    parent[u] = v
    edges.sort(reverse=True)
    keep = edges[k - 1 :]
    adj = [[] for _ in range(n)]
    for _, a, b in keep:
        adj[a].append(b)
        adj[b].append(a)
    labels = [-1] * n
    c = 0
    for i in range(n):
        if labels[i] >= 0:
            continue
        stack = [i]
        labels[i] = c
        while stack:
            v = stack.pop()
            for u in adj[v]:
                if labels[u] < 0:
                    labels[u] = c
                    stack.append(u)
        c += 1
    return labels


def rand_index(a, b):
    """Pair-counting agreement between two labelings: 1.0 means identical
    grouping. Label-permutation-proof, which is what clustering needs."""
    n = len(a)
    agree = 0
    total = 0
    for i in range(n):
        for j in range(i + 1, n):
            total += 1
            if (a[i] == a[j]) == (b[i] == b[j]):
                agree += 1
    return agree / total


# ------------------------------------------------------------- the datasets


def blobs(seed=20260827, per=50, sigma=0.7):
    """Fifteen tight, well-separated blobs on a 5 x 3 grid."""
    rng = random.Random(seed)
    pts = []
    truth = []
    centers = [(cx * 10.0, cy * 10.0) for cx in range(5) for cy in range(3)]
    for b, (cx, cy) in enumerate(centers):
        for _ in range(per):
            pts.append((rng.gauss(cx, sigma), rng.gauss(cy, sigma)))
            truth.append(b)
    return pts, truth, centers


def rings(seed=20260828, inner=300, outer=400, noise=0.15):
    rng = random.Random(seed)
    import math
    pts = []
    truth = []
    for i in range(inner):
        a = 2 * math.pi * i / inner
        pts.append((2 * math.cos(a) + rng.gauss(0, noise), 2 * math.sin(a) + rng.gauss(0, noise)))
        truth.append(0)
    for i in range(outer):
        a = 2 * math.pi * i / outer
        pts.append((5 * math.cos(a) + rng.gauss(0, noise), 5 * math.sin(a) + rng.gauss(0, noise)))
        truth.append(1)
    return pts, truth


def bridged_blobs(seed=20260829):
    """Three blobs, plus a thin six-point bridge between the first two."""
    rng = random.Random(seed)
    pts = []
    truth = []
    for b, (cx, cy) in enumerate([(0.0, 0.0), (10.0, 0.0), (5.0, 9.0)]):
        for _ in range(60):
            pts.append((rng.gauss(cx, 0.7), rng.gauss(cy, 0.7)))
            truth.append(b)
    # The bridge only chains if its gaps are smaller than the blobs' own
    # tail edges AND it spans the whole distance: 15 points at 0.5 spacing
    # runs from one blob's edge into the other's.
    for i in range(15):
        pts.append((1.75 + i * 0.5, rng.gauss(0, 0.1)))
        truth.append(0)  # bridge points nominally belong to blob 0
    return pts, truth


K = 15
RUNS = 30


if __name__ == "__main__":
    pts, truth, true_centers = blobs()

    def blob_of_seed(c):
        return min(range(K), key=lambda b: dist2(c, true_centers[b]))

    runs = {"k-means++": [], "random": []}
    seed_coverage = {"k-means++": [], "random": []}
    for name, seeder in (("k-means++", seed_plus_plus), ("random", seed_random)):
        for r in range(RUNS):
            rng = random.Random(1000 + r if name == "random" else 2000 + r)
            centers0 = seeder(pts, K, rng)
            seed_coverage[name].append(len({blob_of_seed(c) for c in centers0}))
            c = {}
            _, _, sse, iters, history = lloyd(pts, centers0, c)
            # Oracle 1: Lloyd's descent theorem, asserted on every run.
            for a, b in zip(history, history[1:]):
                assert b <= a + 1e-9, "SSE rose: Lloyd's proof violated"
            runs[name].append((sse, iters, c["dist"]))

    best_sse = min(s for rs in runs.values() for s, _, _ in rs)
    med = lambda xs: sorted(xs)[len(xs) // 2]
    ratio = {n: med([s / best_sse for s, _, _ in rs]) for n, rs in runs.items()}
    found = {n: sum(1 for s, _, _ in rs if s < 1.01 * best_sse) for n, rs in runs.items()}
    iters_med = {n: med([i for _, i, _ in rs]) for n, rs in runs.items()}
    work_med = {n: med([w for _, _, w in rs]) for n, rs in runs.items()}

    # Best-of-10 random restarts: group the 30 random runs into 3 pools.
    # The folk remedy, priced: with 15 blobs a random seeding is perfect
    # only ~1 run in 30, so even the best of ten restarts usually still
    # carries a defect.
    b10 = [min(runs["random"][i : i + 10], key=lambda t: t[0]) for i in (0, 10, 20)]
    b10_ratio = med([s / best_sse for s, _, _ in b10])
    b10_found = sum(1 for s, _, _ in b10 if s < 1.01 * best_sse)
    b10_work = sum(w for _, _, w in runs["random"][:10])

    # Oracle 2: seeding coverage. D-squared sampling hits nearly all blobs;
    # uniform sampling reliably doubles up and leaves blobs empty.
    assert med(seed_coverage["k-means++"]) >= 14, seed_coverage["k-means++"]
    assert med(seed_coverage["random"]) <= 12, seed_coverage["random"]

    # Oracle 3: the outcome gap the seeding buys. SSE here is quantized by
    # defect count: each doubled-up seed merges two real blobs somewhere
    # and costs about a 4x level, which is why the medians sit where they
    # sit. Ten random restarts, at ~38x the work of one seeded run, still
    # leave the median pool defective.
    assert ratio["k-means++"] <= 1.02
    assert ratio["random"] >= 1.10
    assert found["k-means++"] >= 15 > found["random"]
    assert b10_ratio > 1.02, "ten random restarts should usually still carry a defect"
    assert b10_work > 30 * work_med["k-means++"]

    # Oracle 4: shape beats seeding. On two concentric rings k-means is
    # structurally wrong (its cells are convex), while density and linkage
    # methods read the shape exactly.
    rpts, rtruth = rings()
    rng = random.Random(5)
    _, _, _, _, _h = (None,) * 5
    ra, _, _, _, _ = lloyd(rpts, seed_plus_plus(rpts, 2, rng))
    km_rings = rand_index(ra, rtruth)
    db = dbscan(rpts, eps=0.5, min_pts=4)
    assert all(l >= 0 for l in db), "rings should have no DBSCAN noise"
    db_rings = rand_index(db, rtruth)
    sl_rings = rand_index(single_linkage(rpts, 2), rtruth)
    assert km_rings <= 0.7, km_rings
    assert db_rings == 1.0 and sl_rings == 1.0, (db_rings, sl_rings)

    # Oracle 5: the bridge. Six noise points chain single linkage into
    # merging two real blobs; k-means++ does not care.
    bpts, btruth = bridged_blobs()
    sl_bridge = rand_index(single_linkage(bpts, 3), btruth)
    ka, _, _, _, _ = lloyd(bpts, seed_plus_plus(bpts, 3, random.Random(6)))
    km_bridge = rand_index(ka, btruth)
    assert sl_bridge < 0.9, sl_bridge
    # (k-means splits the bridge's own points at the midpoint, which the
    # blob-0 truth labels penalize a little; the blobs themselves stay
    # intact, which is the claim.)
    assert km_bridge > 0.9, km_bridge
    assert km_bridge > sl_bridge + 0.05, (km_bridge, sl_bridge)

    print(f"contest: 15 tight blobs, 750 points, k = {K}, {RUNS} seeded restarts per row:")
    print(f"  {'seeding':<22} {'median SSE / best':>17} {'optimum found':>14} {'median iters':>13} {'distance evals':>15}")
    print(f"  {'k-means++':<22} {ratio['k-means++']:>16.2f}x {found['k-means++']:>11}/{RUNS} {iters_med['k-means++']:>13} {work_med['k-means++']:>15,}")
    print(f"  {'uniform random':<22} {ratio['random']:>16.2f}x {found['random']:>11}/{RUNS} {iters_med['random']:>13} {work_med['random']:>15,}")
    print(f"  {'best of 10 random':<22} {b10_ratio:>16.2f}x {b10_found:>11}/3 pools {'-':>7} {b10_work:>15,}")
    print(f"seed spread: k-means++ hits {med(seed_coverage['k-means++'])} of 15 blobs (median); random hits {med(seed_coverage['random'])}")
    print(f"shape: two rings, pairing agreement: k-means {km_rings:.2f} / DBSCAN {db_rings:.2f} / single linkage {sl_rings:.2f}")
    print(f"bridge: fifteen noise points between blobs: single linkage {sl_bridge:.2f} / k-means++ {km_bridge:.2f}")
    print("OK: Lloyd's descent asserted on every run, seeding coverage and outcome gaps hold, shape and bridge boundaries pinned")
