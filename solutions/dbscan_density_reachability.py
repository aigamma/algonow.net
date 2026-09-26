# Puzzle 129: DBSCAN x density-reachability
# Arbitrary-shape clustering: two interleaved crescents, a tight blob,
# and a hundred points of uniform noise. DBSCAN is the algorithm: a
# point with at least minPts neighbors within eps is a core point; a
# cluster is everything reachable from a core point through chains of
# core points at most eps apart, plus the non-core points within eps
# of them (borders); everything else is noise. The heuristic is the
# density-reachability rule itself: membership is decided by chains of
# dense neighborhoods, never by distance to a center, which is why a
# crescent is one cluster and a bridge of sparse points is not.
#
# Referees:
# (1) THE EXACT DEFINITION, computed independently: brute-force pairwise
#     distances, core points by count, union-find over core pairs within
#     eps. The scan's clusters must equal those connected components on
#     every core point, every border must sit in a cluster owning one of
#     its core neighbors, and every noise point must have no core
#     neighbor;
# (2) GROUND TRUTH: the adjusted Rand index of the scan against the
#     generating labels (crescent, crescent, blob, noise), and the same
#     index for k-means with k = 3 (Lloyd, k-means++ seeding, 20
#     restarts, best inertia kept), which must be far worse because
#     crescents have no center;
# (3) THE PARAMETERS, ablated and measured. minPts = 1: every point is
#     core, so the scan degenerates to single linkage at eps; the draft
#     expected noise to bridge the crescents, and the run refused it
#     (the gap is wider than eps and the noise too sparse), so what it
#     shows instead is every stray point becoming a cluster of its own:
#     61 clusters and no noise at all. eps = 0.5: too wide, the
#     crescents merge into one label (measured as their majority labels
#     coinciding) while stray noise now forms extra small clusters.
#     eps = 0.08: too narrow, the crescents fragment and most points
#     become noise;
# (4) THE INDEX: neighborhood queries through a grid of eps-sized cells
#     compute a fraction of the brute-force n(n-1)/2 distances;
# (5) BORDER AMBIGUITY, measured: the number of border points within eps
#     of core points of two different clusters, whose label depends on
#     visit order. DBSCAN's known nondeterminism, counted rather than
#     hidden.
import math
import random
from collections import deque

SEED = 20260926
EPS = 0.2
MIN_PTS = 5


def make_data(rng):
    X = []
    truth = []
    for _ in range(200):                       # upper crescent
        t = rng.uniform(0, math.pi)
        X.append((math.cos(t) + rng.gauss(0, 0.06), math.sin(t) + rng.gauss(0, 0.06)))
        truth.append(0)
    for _ in range(200):                       # lower crescent, interleaved
        t = rng.uniform(0, math.pi)
        X.append((1 - math.cos(t) + rng.gauss(0, 0.06), 0.5 - math.sin(t) + rng.gauss(0, 0.06)))
        truth.append(1)
    for _ in range(100):                       # a tight blob to the right
        X.append((rng.gauss(3.0, 0.12), rng.gauss(0.8, 0.12)))
        truth.append(2)
    for _ in range(100):                       # uniform noise over the scene
        X.append((rng.uniform(-1.5, 4.5), rng.uniform(-1.5, 2.5)))
        truth.append(3)
    return X, truth


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


class GridIndex:
    """Cells of side eps: every neighbor within eps lies in the 3 x 3
    block around a point's cell. Counts the distances it computes."""

    def __init__(self, X, eps):
        self.X = X
        self.eps = eps
        self.cells = {}
        self.distances = 0
        for i, (x, y) in enumerate(X):
            self.cells.setdefault((math.floor(x / eps), math.floor(y / eps)), []).append(i)

    def query(self, i):
        x, y = self.X[i]
        cx, cy = math.floor(x / self.eps), math.floor(y / self.eps)
        out = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in self.cells.get((cx + dx, cy + dy), ()):
                    self.distances += 1
                    if dist(self.X[i], self.X[j]) <= self.eps:
                        out.append(j)
        return out


def dbscan(X, eps, min_pts):
    """Labels: 1.. for clusters, -1 for noise. Returns labels, the core
    mask, and the number of distances the index computed."""
    n = len(X)
    index = GridIndex(X, eps)
    labels = [None] * n
    core = [False] * n
    cluster = 0
    for i in range(n):
        if labels[i] is not None:
            continue
        nb = index.query(i)
        if len(nb) < min_pts:
            labels[i] = -1
            continue
        core[i] = True
        cluster += 1
        labels[i] = cluster
        seeds = deque(j for j in nb if j != i)
        while seeds:
            j = seeds.popleft()
            if labels[j] == -1:
                labels[j] = cluster                # a border point claimed by this cluster
            if labels[j] is not None:
                continue
            labels[j] = cluster
            nbj = index.query(j)
            if len(nbj) >= min_pts:
                core[j] = True
                seeds.extend(nbj)
    return labels, core, index.distances


def reference_partition(X, eps, min_pts):
    """The definition, brute force: pairwise distances, core by count,
    union-find over core pairs within eps. Returns the component id of
    every core point, the core mask, and each point's core neighbors."""
    n = len(X)
    within = [[] for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            if dist(X[i], X[j]) <= eps:
                within[i].append(j)
                within[j].append(i)
    core = [len(within[i]) + 1 >= min_pts for i in range(n)]
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(n):
        if core[i]:
            for j in within[i]:
                if core[j]:
                    parent[find(i)] = find(j)
    comp = [find(i) if core[i] else None for i in range(n)]
    core_neighbors = [[j for j in within[i] if core[j]] for i in range(n)]
    return comp, core, core_neighbors


def adjusted_rand_index(a, b):
    n = len(a)
    from collections import Counter
    pairs = Counter(zip(a, b))
    ra = Counter(a)
    rb = Counter(b)
    comb = lambda m: m * (m - 1) // 2
    sum_ij = sum(comb(v) for v in pairs.values())
    sum_a = sum(comb(v) for v in ra.values())
    sum_b = sum(comb(v) for v in rb.values())
    total = comb(n)
    expected = sum_a * sum_b / total
    max_index = 0.5 * (sum_a + sum_b)
    return (sum_ij - expected) / (max_index - expected)


def majority_label(labels, truth, cls):
    from collections import Counter
    return Counter(l for l, t in zip(labels, truth) if t == cls).most_common(1)[0][0]


def kmeans(X, k, rng, restarts=20):
    """Lloyd's algorithm with k-means++ seeding; the best of `restarts`
    runs by inertia."""
    best = None
    for _ in range(restarts):
        centers = [X[rng.randrange(len(X))]]
        while len(centers) < k:
            d2 = [min((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 for c in centers) for p in X]
            r = rng.random() * sum(d2)
            acc = 0.0
            for p, w in zip(X, d2):
                acc += w
                if acc >= r:
                    centers.append(p)
                    break
        for _ in range(100):
            assign = [min(range(k), key=lambda c: (p[0] - centers[c][0]) ** 2 + (p[1] - centers[c][1]) ** 2) for p in X]
            new = []
            for c in range(k):
                members = [p for p, a in zip(X, assign) if a == c]
                new.append((sum(p[0] for p in members) / len(members), sum(p[1] for p in members) / len(members)) if members else centers[c])
            if new == centers:
                break
            centers = new
        inertia = sum((p[0] - centers[a][0]) ** 2 + (p[1] - centers[a][1]) ** 2 for p, a in zip(X, assign))
        if best is None or inertia < best[0]:
            best = (inertia, assign)
    return best[1]


if __name__ == '__main__':
    rng = random.Random(SEED)
    X, truth = make_data(rng)
    n = len(X)
    labels, core, grid_distances = dbscan(X, EPS, MIN_PTS)
    comp, ref_core, core_neighbors = reference_partition(X, EPS, MIN_PTS)

    # Oracle 1: the definition, point by point.
    assert core == ref_core, 'core masks differ'
    seen = {}
    for i in range(n):
        if core[i]:
            assert labels[i] > 0
            if comp[i] in seen:
                assert seen[comp[i]] == labels[i], ('core points of one component got two labels', i)
            else:
                seen[comp[i]] = labels[i]
    assert len(set(seen.values())) == len(seen), 'two components got one label'
    ambiguous = 0
    for i in range(n):
        if core[i]:
            continue
        owners = {labels[j] for j in core_neighbors[i]}
        if labels[i] == -1:
            assert not core_neighbors[i], ('a noise point has a core neighbor', i)
        else:
            assert labels[i] in owners, ('a border point sits in a cluster owning none of its core neighbors', i)
            if len(owners) > 1:
                ambiguous += 1
    clusters = len(seen)
    noise = sum(1 for l in labels if l == -1)

    # Oracle 2: ground truth, and k-means on the same scene.
    ari = adjusted_rand_index(labels, truth)
    km = kmeans(X, 3, random.Random(SEED + 1))
    ari_km = adjusted_rand_index(km, truth)
    assert clusters == 3, clusters
    assert ari > 0.9, ari
    assert ari_km < 0.6, ari_km

    # Oracle 3: the parameters, ablated.
    l1, _, _ = dbscan(X, EPS, 1)
    ari_min1 = adjusted_rand_index(l1, truth)
    clusters_min1 = len({l for l in l1 if l > 0})
    l_wide, _, _ = dbscan(X, 0.5, MIN_PTS)
    ari_wide = adjusted_rand_index(l_wide, truth)
    clusters_wide = len({l for l in l_wide if l > 0})
    l_narrow, _, _ = dbscan(X, 0.08, MIN_PTS)
    ari_narrow = adjusted_rand_index(l_narrow, truth)
    clusters_narrow = len({l for l in l_narrow if l > 0})
    noise_narrow = sum(1 for l in l_narrow if l == -1)
    assert ari_min1 < ari and ari_wide < ari and ari_narrow < ari, (ari_min1, ari_wide, ari_narrow)
    # AUTHOR CORRECTION: the draft asserted that eps 0.5 yields fewer than
    # three clusters; the run gave five, because at that radius stray
    # noise forms small clusters of its own even as the crescents merge.
    # The claim that matters is measured directly: the two crescents share
    # one majority label at eps 0.5 and carry different ones at eps 0.2.
    merged_wide = majority_label(l_wide, truth, 0) == majority_label(l_wide, truth, 1)
    merged_min1 = majority_label(l1, truth, 0) == majority_label(l1, truth, 1)
    assert majority_label(labels, truth, 0) != majority_label(labels, truth, 1)
    assert merged_wide, 'eps 0.5 should merge the crescents'
    assert clusters_narrow > 3 and noise_narrow > noise, (clusters_narrow, noise_narrow, noise)

    # Oracle 4: the index.
    brute = n * (n - 1) // 2
    assert grid_distances < 0.25 * brute, (grid_distances, brute)

    print(f'contest: two crescents (200 + 200), a blob (100), uniform noise (100); eps {EPS}, minPts {MIN_PTS}; referee: the definition by brute force (n = {n})')
    print(f"  {'method':<34} {'clusters':>8} {'noise':>6} {'ARI vs truth':>13}   verdict")
    rows = [
        (f'DBSCAN eps {EPS} minPts {MIN_PTS}', clusters, noise, ari, 'crescents, blob, and noise, matching the definition on every point'),
        ('k-means, k = 3 (best of 20)', 3, 0, ari_km, 'centers cannot hold a crescent: each is cut in two'),
        (f'DBSCAN eps {EPS} minPts 1', clusters_min1, sum(1 for l in l1 if l == -1), ari_min1, 'every point is core: single linkage, ' + ('noise bridges the crescents' if merged_min1 else 'every stray point becomes its own cluster')),
        (f'DBSCAN eps 0.5 minPts {MIN_PTS}', clusters_wide, sum(1 for l in l_wide if l == -1), ari_wide, 'too wide: the crescents merge, and stray noise forms clusters of its own'),
        (f'DBSCAN eps 0.08 minPts {MIN_PTS}', clusters_narrow, noise_narrow, ari_narrow, 'too narrow: fragments, and most points are noise'),
    ]
    for name, c, nz, a, verdict in rows:
        print(f'  {name:<34} {c:>8} {nz:>6} {a:>13.3f}   {verdict}')
    print(f'index: {grid_distances:,} distances through eps-cells vs {brute:,} brute force ({grid_distances / brute:.1%}); '
          f'core points {sum(core)}, border points {n - sum(core) - noise}, ambiguous borders {ambiguous}')
    print(f'OK: DBSCAN found {clusters} clusters and {noise} noise points, equal to the brute-force definition on every core point with every border and noise point verified; '
          f'ARI {ari:.3f} vs k-means {ari_km:.3f}; minPts 1 {ari_min1:.3f} ({clusters_min1} clusters, crescents merged: {merged_min1}), eps 0.5 {ari_wide:.3f} ({clusters_wide} clusters, crescents merged), eps 0.08 {ari_narrow:.3f} ({clusters_narrow} clusters, {noise_narrow} noise); '
          f'grid index {grid_distances / brute:.1%} of brute force; {ambiguous} order-dependent border points')
