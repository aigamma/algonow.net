# Puzzle 148: Locality-sensitive hashing x random hyperplane hashes
# Approximate nearest neighbors: 2,000 unit vectors in 32 dimensions,
# clustered so that near neighbors exist, and 100 queries, each asking
# for the vector at the smallest angle. Brute force computes 2,000
# dot products per query and is exactly right. Locality-sensitive
# hashing is the algorithm: hash every vector so that near vectors
# collide with higher probability than far ones, look up the query's
# bucket, and compute exact distances only to the candidates found
# there. The heuristic is the hash: random hyperplanes through the
# origin, one bit each for which side the vector falls on, so that two
# vectors at angle theta agree on a bit with probability 1 - theta/pi;
# k bits make a code (agreement p^k, sharp), and L independent codes
# make L chances (1 - (1 - p^k)^L), which is how a bad single bit is
# amplified into a useful filter.
#
# Referees:
# (1) THE COLLISION LAW, measured: for pairs at exact angles 15, 30,
#     60, 90, and 120 degrees, the fraction of 20,000 random
#     hyperplanes that separate them must match theta/pi within 0.015;
# (2) THE AMPLIFICATION, measured: at k = 10 bits and L = 20 tables,
#     the probability that a pair at 30 degrees (and at 80) becomes a
#     candidate matches 1 - (1 - p^k)^L over 500 fresh hyperplane sets
#     within 0.04;
# (3) THE SEARCH, against brute force: recall at one (the LSH answer
#     equals the true nearest neighbor) and the candidates examined per
#     query, over 100 queries, for a sweep of (k, L); the working point
#     must reach recall 0.9 with under a quarter of the data examined;
# (4) THE ABLATIONS: one bit and one table examines about half the
#     data (no filter); twenty bits in one table has recall far below
#     the working point (a filter with no second chance);
# (5) THE RIVALS, measured in dot products per query: brute force
#     (exact, n); random projection to 8 dimensions with an exact
#     rerank of the top 5 percent; and a k-d tree in 32 dimensions,
#     which is exact and visits nearly every point, the curse of
#     dimensionality counted rather than asserted.
import math
import random
from operator import mul

SEED = 20260926
DIM = 32
N = 2000
CLUSTERS = 25
NOISE = 0.08
QUERIES = 100


def dot(a, b):
    return sum(map(mul, a, b))


def normalize(v):
    s = math.sqrt(dot(v, v))
    return [x / s for x in v]


def gauss_vec(rng, d):
    return [rng.gauss(0, 1) for _ in range(d)]


def angle(a, b):
    return math.acos(max(-1.0, min(1.0, dot(a, b))))


def make_data(rng):
    centers = [normalize(gauss_vec(rng, DIM)) for _ in range(CLUSTERS)]

    def point():
        c = rng.randrange(CLUSTERS)
        return normalize([x + rng.gauss(0, NOISE) for x in centers[c]])
    base = [point() for _ in range(N)]
    queries = [point() for _ in range(QUERIES)]
    return base, queries


def brute_force(q, base):
    best, best_i = -2.0, None
    for i, v in enumerate(base):
        s = dot(q, v)
        if s > best:
            best, best_i = s, i
    return best_i


class LSH:
    def __init__(self, base, k, L, rng):
        self.k, self.L = k, L
        self.planes = [[gauss_vec(rng, DIM) for _ in range(k)] for _ in range(L)]
        self.tables = []
        for t in range(L):
            table = {}
            for i, v in enumerate(base):
                table.setdefault(self.code(v, t), []).append(i)
            self.tables.append(table)
        self.base = base

    def code(self, v, t):
        return tuple(dot(v, h) >= 0 for h in self.planes[t])

    def query(self, q):
        cands = set()
        for t in range(self.L):
            cands.update(self.tables[t].get(self.code(q, t), ()))
        best, best_i = -2.0, None
        for i in cands:
            s = dot(q, self.base[i])
            if s > best:
                best, best_i = s, i
        return best_i, len(cands), self.k * self.L + len(cands)


class KDTree:
    """Exact nearest neighbor in Euclidean distance (equal to angular order
    on unit vectors), counting the points whose distance is computed."""

    def __init__(self, pts, leaf=8):
        self.pts = pts
        self.root = self.build(list(range(len(pts))), 0, leaf)

    def build(self, idx, depth, leaf):
        if len(idx) <= leaf:
            return ('leaf', idx)
        axis = depth % DIM
        idx.sort(key=lambda i: self.pts[i][axis])
        mid = len(idx) // 2
        return ('node', axis, self.pts[idx[mid]][axis], self.build(idx[:mid], depth + 1, leaf), self.build(idx[mid:], depth + 1, leaf))

    def nearest(self, q):
        best = [float('inf'), None, 0]

        def visit(node):
            if node[0] == 'leaf':
                for i in node[1]:
                    best[2] += 1
                    d = sum((a - b) ** 2 for a, b in zip(q, self.pts[i]))
                    if d < best[0]:
                        best[0], best[1] = d, i
                return
            _, axis, split, left, right = node
            diff = q[axis] - split
            near, far = (left, right) if diff < 0 else (right, left)
            visit(near)
            if diff * diff < best[0]:
                visit(far)
        visit(self.root)
        return best[1], best[2]


def random_projection_search(q, base, proj_base, proj, rerank):
    pq = [dot(q, p) for p in proj]
    scored = sorted(range(len(base)), key=lambda i: -dot(pq, proj_base[i]))[:rerank]
    best, best_i = -2.0, None
    for i in scored:
        s = dot(q, base[i])
        if s > best:
            best, best_i = s, i
    return best_i, len(proj) * 1 + rerank      # cost in 32-dim-dot equivalents below


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: the collision law on exact angles.
    law = []
    for deg in (15, 30, 60, 90, 120):
        th = math.radians(deg)
        a = normalize(gauss_vec(rng, DIM))
        b0 = normalize(gauss_vec(rng, DIM))
        # Gram-Schmidt a perpendicular direction, then rotate by theta
        perp = normalize([x - dot(a, b0) * y for x, y in zip(b0, a)])
        b = [math.cos(th) * x + math.sin(th) * y for x, y in zip(a, perp)]
        assert abs(math.degrees(angle(a, b)) - deg) < 1e-6
        separated = 0
        trials = 20000
        for _ in range(trials):
            h = gauss_vec(rng, DIM)
            if (dot(a, h) >= 0) != (dot(b, h) >= 0):
                separated += 1
        frac = separated / trials
        assert abs(frac - th / math.pi) < 0.015, (deg, frac, th / math.pi)
        law.append((deg, frac, th / math.pi))

    # Oracle 2: amplification at k = 10, L = 20.
    k, L = 10, 20
    amp = []
    for deg in (30, 80):
        th = math.radians(deg)
        p = 1 - th / math.pi
        formula = 1 - (1 - p ** k) ** L
        a = normalize(gauss_vec(rng, DIM))
        b0 = normalize(gauss_vec(rng, DIM))
        perp = normalize([x - dot(a, b0) * y for x, y in zip(b0, a)])
        b = [math.cos(th) * x + math.sin(th) * y for x, y in zip(a, perp)]
        hits = 0
        trials = 500
        for _ in range(trials):
            found = False
            for _t in range(L):
                planes = [gauss_vec(rng, DIM) for _ in range(k)]
                if all((dot(a, h) >= 0) == (dot(b, h) >= 0) for h in planes):
                    found = True
                    break
            hits += found
        measured = hits / trials
        assert abs(measured - formula) < 0.04, (deg, measured, formula)
        amp.append((deg, measured, formula))

    # Oracle 3: the search against brute force.
    base, queries = make_data(rng)
    truth = [brute_force(q, base) for q in queries]
    nn_angles = [math.degrees(angle(q, base[t])) for q, t in zip(queries, truth)]
    sweep = []
    for k, L in ((6, 4), (10, 10), (10, 20), (12, 24)):
        index = LSH(base, k, L, rng)
        hits = 0
        cands = 0
        cost = 0
        for q, t in zip(queries, truth):
            ans, nc, c = index.query(q)
            hits += ans == t
            cands += nc
            cost += c
        sweep.append((k, L, hits / QUERIES, cands / QUERIES, cost / QUERIES))
    work = next(row for row in sweep if row[0] == 10 and row[1] == 20)
    assert work[2] >= 0.9 and work[3] < 0.25 * N, work

    # Oracle 4: ablations.
    ab = []
    for k, L in ((1, 1), (20, 1)):
        index = LSH(base, k, L, rng)
        hits = 0
        cands = 0
        for q, t in zip(queries, truth):
            ans, nc, _ = index.query(q)
            hits += ans == t
            cands += nc
        ab.append((k, L, hits / QUERIES, cands / QUERIES))
    assert ab[0][3] > 0.4 * N, ab[0]
    assert ab[1][2] < work[2] - 0.3, (ab[1], work)

    # Oracle 5: rivals.
    PROJ_DIM = 8
    proj = [gauss_vec(rng, DIM) for _ in range(PROJ_DIM)]
    proj_base = [[dot(v, p) for p in proj] for v in base]
    rerank = N // 20
    rp_hits = 0
    for q, t in zip(queries, truth):
        ans, _ = random_projection_search(q, base, proj_base, proj, rerank)
        rp_hits += ans == t
    rp_cost = PROJ_DIM + N * PROJ_DIM / DIM + rerank      # projecting q, n short dots, the rerank
    tree = KDTree(base)
    kd_visits = 0
    for q, t in zip(queries, truth):
        ans, visited = tree.nearest(q)
        assert ans == t
        kd_visits += visited
    kd_visits /= QUERIES
    assert kd_visits > 0.5 * N, kd_visits
    assert work[4] < kd_visits and work[4] < N

    print(f'contest: nearest neighbor by angle among {N:,} unit vectors in {DIM} dimensions ({CLUSTERS} clusters), {QUERIES} queries; referee: brute force; true neighbor at {sum(nn_angles) / len(nn_angles):.1f} degrees on average')
    print(f"  {'angle':>6} {'separated, measured':>20} {'theta / pi':>11}")
    for deg, frac, f in law:
        print(f'  {deg:>5} deg {frac:>20.4f} {f:>11.4f}')
    for deg, m, f in amp:
        print(f'amplification at k = 10, L = 20, pair at {deg} deg: candidate probability measured {m:.3f}, formula 1 - (1 - p^k)^L = {f:.3f}')
    print(f"  {'k':>3} {'L':>3} {'recall@1':>9} {'candidates':>11} {'dots per query':>15}")
    for k, L, r, c, cost in sweep:
        print(f'  {k:>3} {L:>3} {r:>9.2f} {c:>11.0f} {cost:>15.0f}')
    for k, L, r, c in ab:
        print(f'ablation k = {k}, L = {L}: recall@1 {r:.2f}, candidates {c:.0f} of {N:,}')
    print(f'rivals: brute force recall 1.00 at {N:,} dots; random projection to {PROJ_DIM} dims + rerank of {rerank}: recall {rp_hits / QUERIES:.2f} at about {rp_cost:.0f} dot-equivalents; k-d tree in {DIM} dims: exact, {kd_visits:.0f} of {N:,} points visited per query')
    print(f'OK: the collision law within 0.015 at five angles; amplification within 0.04 at two; LSH at k = 10, L = 20 recall {work[2]:.2f} with {work[3]:.0f} candidates and {work[4]:.0f} dots per query vs brute force {N:,}; '
          f'one bit examines {ab[0][3]:.0f}, twenty bits in one table recalls {ab[1][2]:.2f}; the k-d tree visits {kd_visits:.0f} of {N:,}')
