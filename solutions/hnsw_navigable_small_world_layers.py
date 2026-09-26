# Puzzle 125: HNSW x navigable small-world layers
# Vector similarity search: given a million embeddings, find the ten
# nearest to a query in a few hundred distance computations instead of
# a million. The algorithm is a greedy graph search: from an entry
# point, repeatedly move to the neighbor closest to the query, keeping
# a small beam (ef) of the best candidates, until nothing in the beam
# improves. The heuristic is the hierarchy: every point is inserted
# into a random number of layers (geometric, most points only in the
# bottom layer), each layer is a navigable small-world graph over the
# points present in it, and a query descends from the sparse top layer
# to the dense bottom one, so the first hops cross the whole space and
# the last hops refine locally. Neighbor lists are pruned with the
# diversity heuristic (keep a candidate only if it is closer to the
# node than to any neighbor already kept), which keeps the graph
# navigable instead of clustered.
#
# Referees:
# (1) EXACT BRUTE FORCE: every query's true ten nearest neighbors are
#     computed by scanning all points; recall@10 is measured, never
#     assumed;
# (2) THE ABLATIONS on the same data and queries: a single-layer
#     graph (no hierarchy), a search with no beam (ef = 1), and
#     neighbor lists chosen by plain nearest-M instead of the
#     diversity heuristic; each priced in recall and distance
#     computations. THE HONEST ROW: at these sizes the single-layer
#     graph costs about the same per query as the hierarchy, because
#     the hierarchy's saving is a logarithmic entry into a graph of
#     millions, not a few thousand; the page says so instead of
#     claiming a win it did not measure;
# (3) THE COST: distance computations per query are counted for every
#     method, brute force included, and the hierarchy's count is
#     asserted a small fraction of the brute-force scan;
# (4) THE RIVAL: a k-d tree with exact pruning, written separately, on
#     the same 16-dimensional data, priced in distance computations to
#     show the curse of dimensionality it suffers and HNSW does not;
# (5) STRUCTURE: the layer sizes follow the geometric law (each layer
#     roughly 1/M of the one below) and every node's degree is bounded
#     by the configured maximum.
import heapq
import math
import random

SEED = 20260926
DIM = 16
COUNT = [0]


def dist2(a, b):
    COUNT[0] += 1
    s = 0.0
    for x, y in zip(a, b):
        d = x - y
        s += d * d
    return s


class HNSW:
    def __init__(self, M=8, ef_construction=48, heuristic=True, single_layer=False, rng=None):
        self.M = M
        self.M0 = 2 * M
        self.efc = ef_construction
        self.mL = 1.0 / math.log(M)
        self.heuristic = heuristic
        self.single_layer = single_layer
        self.rng = rng or random.Random(0)
        self.points = []
        self.layers = []          # layers[l][node] -> list of neighbor ids
        self.entry = None
        self.top = -1

    def _search_layer(self, q, ep, ef, layer):
        visited = {ep}
        d0 = dist2(q, self.points[ep])
        candidates = [(d0, ep)]
        best = [(-d0, ep)]        # max-heap of the ef best
        while candidates:
            d, c = heapq.heappop(candidates)
            if d > -best[0][0]:
                break
            for e in self.layers[layer][c]:
                if e in visited:
                    continue
                visited.add(e)
                de = dist2(q, self.points[e])
                if len(best) < ef or de < -best[0][0]:
                    heapq.heappush(candidates, (de, e))
                    heapq.heappush(best, (-de, e))
                    if len(best) > ef:
                        heapq.heappop(best)
        return sorted((-d, e) for d, e in best)

    def _select(self, q, cands, M):
        """cands: sorted list of (dist, id). The diversity heuristic keeps
        a candidate only if it is closer to q than to every neighbor
        already kept, then fills up with the discarded nearest ones."""
        if not self.heuristic or len(cands) <= M:
            return [e for _, e in cands[:M]]
        kept = []
        discarded = []
        for d, e in cands:
            if len(kept) >= M:
                break
            ok = True
            for k in kept:
                if dist2(self.points[e], self.points[k]) < d:
                    ok = False
                    break
            (kept if ok else discarded).append(e)
        for e in discarded:
            if len(kept) >= M:
                break
            kept.append(e)
        return kept

    def insert(self, p):
        qid = len(self.points)
        self.points.append(p)
        level = 0 if self.single_layer else int(-math.log(self.rng.random()) * self.mL)
        while len(self.layers) <= level:
            self.layers.append({})
        for l in range(level + 1):
            self.layers[l][qid] = []
        if self.entry is None:
            self.entry = qid
            self.top = level
            return
        ep = self.entry
        for l in range(self.top, level, -1):
            ep = self._search_layer(p, ep, 1, l)[0][1]
        for l in range(min(level, self.top), -1, -1):
            W = self._search_layer(p, ep, self.efc, l)
            maxM = self.M0 if l == 0 else self.M
            neighbors = self._select(p, W, maxM)
            self.layers[l][qid] = list(neighbors)
            for e in neighbors:
                lst = self.layers[l][e]
                lst.append(qid)
                if len(lst) > maxM:
                    cands = sorted((dist2(self.points[e], self.points[x]), x) for x in lst)
                    self.layers[l][e] = self._select(self.points[e], cands, maxM)
            ep = W[0][1]
        if level > self.top:
            self.entry = qid
            self.top = level

    def search(self, q, k, ef):
        ep = self.entry
        for l in range(self.top, 0, -1):
            ep = self._search_layer(q, ep, 1, l)[0][1]
        W = self._search_layer(q, ep, max(ef, k), 0)
        return [e for _, e in W[:k]]


# ---------------------------------------------------------------- rival
class KDTree:
    def __init__(self, points, ids=None, depth=0):
        ids = list(range(len(points))) if ids is None else ids
        self.points = points
        axis = depth % DIM
        if len(ids) <= 8:
            self.leaf = ids
            self.left = self.right = None
            return
        ids.sort(key=lambda i: points[i][axis])
        mid = len(ids) // 2
        self.axis = axis
        self.split = points[ids[mid]][axis]
        self.leaf = None
        self.left = KDTree(points, ids[:mid], depth + 1)
        self.right = KDTree(points, ids[mid:], depth + 1)

    def knn(self, q, k):
        heap = []   # max-heap of (-d, id)

        def visit(node):
            if node.leaf is not None:
                for i in node.leaf:
                    d = dist2(q, self.points[i])
                    if len(heap) < k:
                        heapq.heappush(heap, (-d, i))
                    elif d < -heap[0][0]:
                        heapq.heapreplace(heap, (-d, i))
                return
            diff = q[node.axis] - node.split
            first, second = (node.left, node.right) if diff < 0 else (node.right, node.left)
            visit(first)
            if len(heap) < k or diff * diff < -heap[0][0]:
                visit(second)

        visit(self)
        return [i for _, i in sorted((-d, i) for d, i in heap)]


def brute_force(points, q, k):
    return [i for _, i in sorted((dist2(q, p), i) for i, p in enumerate(points))[:k]]


def make_points(n, rng):
    return [[rng.gauss(0, 1) for _ in range(DIM)] for _ in range(n)]


def evaluate(index_search, points, queries, truth, k=10):
    hits = 0
    COUNT[0] = 0
    for q, t in zip(queries, truth):
        got = index_search(q)
        hits += len(set(got) & set(t))
    return hits / (k * len(queries)), COUNT[0] / len(queries)


if __name__ == '__main__':
    rng = random.Random(SEED)
    Q = 100
    K = 10
    queries = make_points(Q, rng)

    # Oracle 3, the scaling law: brute force grows with N, the hierarchy
    # with log N. Same queries, growing indexes, exact truth per size.
    scaling = []
    for N in (1000, 2000, 4000):
        pts = make_points(N, random.Random(SEED + N))
        COUNT[0] = 0
        truth = [brute_force(pts, q, K) for q in queries]
        brute_per_query = COUNT[0] / Q
        COUNT[0] = 0
        idx = HNSW(M=8, ef_construction=48, rng=random.Random(SEED + 1))
        for p_ in pts:
            idx.insert(p_)
        build_cost = COUNT[0]
        recall, per_query = evaluate(lambda q: idx.search(q, K, ef=48), pts, queries, truth)
        assert recall >= 0.9, (N, recall)                                        # Oracle 1
        flat_idx = HNSW(M=8, ef_construction=48, single_layer=True, rng=random.Random(SEED + 2))
        for p_ in pts:
            flat_idx.insert(p_)
        flat_recall, flat_per_query = evaluate(lambda q: flat_idx.search(q, K, ef=48), pts, queries, truth)
        assert flat_recall >= 0.85, (N, flat_recall)
        sizes = [len(layer) for layer in idx.layers]
        for l in range(1, len(sizes)):
            assert sizes[l] < sizes[l - 1], sizes                                 # Oracle 5
        for l, layer in enumerate(idx.layers):
            cap = idx.M0 if l == 0 else idx.M
            assert all(len(nb) <= cap for nb in layer.values()), l
        scaling.append((N, recall, per_query, brute_per_query, build_cost, sizes, flat_recall, flat_per_query))
    fractions = [row[2] / row[3] for row in scaling]
    assert fractions[0] > fractions[1] > fractions[2], fractions                   # the fraction falls with N
    assert fractions[-1] < 0.2, fractions

    # Oracles 2 and 4 on the middle size: ablations and the k-d tree.
    N = 2000
    points = make_points(N, random.Random(SEED + N))
    COUNT[0] = 0
    truth = [brute_force(points, q, K) for q in queries]
    brute_per_query = COUNT[0] / Q
    index = HNSW(M=8, ef_construction=48, rng=random.Random(SEED + 1))
    for p_ in points:
        index.insert(p_)
    sizes = [len(layer) for layer in index.layers]
    results = {}
    results['hnsw'] = evaluate(lambda q: index.search(q, K, ef=48), points, queries, truth)
    results['hnsw ef=1'] = evaluate(lambda q: index.search(q, K, ef=1), points, queries, truth)
    flat = HNSW(M=8, ef_construction=48, single_layer=True, rng=random.Random(SEED + 2))
    for p_ in points:
        flat.insert(p_)
    results['flat graph'] = evaluate(lambda q: flat.search(q, K, ef=48), points, queries, truth)
    plain = HNSW(M=8, ef_construction=48, heuristic=False, rng=random.Random(SEED + 1))
    for p_ in points:
        plain.insert(p_)
    results['nearest-M neighbors'] = evaluate(lambda q: plain.search(q, K, ef=48), points, queries, truth)
    tree = KDTree(points)
    results['k-d tree (exact)'] = evaluate(lambda q: tree.knn(q, K), points, queries, truth)     # Oracle 4
    results['brute force'] = (1.0, brute_per_query)

    r_h, c_h = results['hnsw']
    assert results['hnsw ef=1'][0] < r_h - 0.1, results['hnsw ef=1']              # Oracle 2: the beam matters
    # the single-layer graph at this size: parity with the hierarchy (measured, not assumed)
    flat_c = results['flat graph'][1]
    assert 0.7 * c_h < flat_c < 1.3 * c_h, (flat_c, c_h)
    assert results['k-d tree (exact)'][0] == 1.0
    assert results['k-d tree (exact)'][1] > 0.5 * brute_per_query, results['k-d tree (exact)']   # the curse

    print(f'contest: 10-nearest-neighbor search over random {DIM}-dimensional points, {Q} queries; currency: distance computations per query; referee: exact brute force for every query')
    print(f"  {'points':>7} {'recall@10':>10} {'HNSW dist/q':>12} {'flat dist/q':>12} {'brute force':>12} {'fraction':>9}   layer sizes")
    for N_, recall, per_query, bpq, build_cost, sz, fr, fc in scaling:
        print(f"  {N_:>7,} {recall:>10.3f} {per_query:>12,.0f} {fc:>12,.0f} {bpq:>12,.0f} {per_query / bpq:>9.1%}   {sz} (build {build_cost:,} distances; flat recall {fr:.3f})")
    print(f"  the same 2,000-point index, the heuristic removed piece by piece:")
    print(f"  {'method':<26} {'recall@10':>10} {'distances/query':>16}")
    order = ['brute force', 'k-d tree (exact)', 'flat graph', 'nearest-M neighbors', 'hnsw ef=1', 'hnsw']
    notes = {
        'brute force': 'the referee: every point, every time',
        'k-d tree (exact)': f'exact but cursed: pruning barely works in {DIM} dimensions',
        'flat graph': 'one layer, no hierarchy: parity at this size; the layers pay off at millions, not thousands',
        'nearest-M neighbors': 'no diversity heuristic: clustered neighbor lists',
        'hnsw ef=1': 'the beam removed: pure greedy gets stuck early',
        'hnsw': f'layers {sizes}: descend the sparse layers, refine at the bottom',
    }
    for name in order:
        r, c = results[name]
        print(f"  {name:<26} {r:>10.3f} {c:>16,.0f}   {notes[name]}")
    print(f'OK: recall at least 0.9 at every size with the HNSW fraction of brute force falling {fractions[0]:.1%} > {fractions[1]:.1%} > {fractions[2]:.1%}; '
          f'ef=1 recall {results["hnsw ef=1"][0]:.3f} vs {r_h:.3f}; flat graph {results["flat graph"][1]:.0f} distances vs {c_h:.0f} (parity at this size, said plainly); nearest-M {results["nearest-M neighbors"][0]:.3f} recall at {results["nearest-M neighbors"][1]:.0f}; '
          f'k-d tree exact at {results["k-d tree (exact)"][1]:.0f} distances ({results["k-d tree (exact)"][1] / brute_per_query:.0%} of brute force); layer sizes {sizes}')
