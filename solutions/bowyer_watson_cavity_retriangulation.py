# Puzzle 120: Bowyer-Watson x bad-triangle cavity retriangulation
# Delaunay triangulation: connect a set of points into triangles so that
# no point lies strictly inside any triangle's circumcircle. That empty
# circumcircle rule maximizes the smallest angle over all triangulations
# and makes the mesh the dual of the Voronoi diagram. The algorithm
# inserts points one at a time into a triangulation that starts as one
# enormous super-triangle. The heuristic is what happens per insertion:
# every triangle whose circumcircle contains the new point is "bad";
# together the bad triangles form a star-shaped cavity; delete them and
# fan the cavity's boundary edges to the new point. Every triangle in
# the fan is Delaunay, so the invariant survives each insertion.
#
# All arithmetic is exact: points have integer coordinates and the
# orientation and in-circle tests are integer determinants.
#
# Referees:
# (1) THE DEFINITION, BRUTE FORCE: every output triangle's circumcircle
#     is checked against every other point (no point strictly inside),
#     and on the small instance the output triangle set EQUALS the set
#     of all point triples with an empty circumcircle, enumerated;
# (2) EULER: a triangulation of n points with h on the hull has exactly
#     2n - 2 - h triangles and 3n - 3 - h edges; h comes from an
#     independent convex hull (Andrew's monotone chain);
# (3) THE HULL: the boundary of the triangulation must be that hull,
#     edge for edge; this catches the classic super-triangle failure,
#     which is measured below as the negative example;
# (4) LAWSON'S FLIPS, the rival written independently (insert into the
#     containing triangle, flip locally non-Delaunay edges until none
#     remain), produces the identical triangle set on every instance;
# (5) THE COST: in-circle tests are counted for the cavity method, the
#     flip method, and rebuilding from scratch after each insertion.
import random
from collections import defaultdict

SEED = 20260926
RANGE = 1_000_000


def orient(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def in_circle(a, b, c, d):
    """> 0 iff d is strictly inside the circumcircle of the
    counterclockwise triangle abc. Exact on integer input."""
    adx, ady = a[0] - d[0], a[1] - d[1]
    bdx, bdy = b[0] - d[0], b[1] - d[1]
    cdx, cdy = c[0] - d[0], c[1] - d[1]
    return ((adx * adx + ady * ady) * (bdx * cdy - cdx * bdy)
            - (bdx * bdx + bdy * bdy) * (adx * cdy - cdx * ady)
            + (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady))


def ccw(tri, pts):
    a, b, c = tri
    return tri if orient(pts[a], pts[b], pts[c]) > 0 else (a, c, b)


class Counter:
    def __init__(self):
        self.incircle = 0
        self.orient = 0


# ------------------------------------------------------- Bowyer-Watson
def bowyer_watson(points, super_scale=1000, counter=None):
    """Returns the set of triangles (index triples, canonical order)."""
    counter = counter or Counter()
    n = len(points)
    lo = min(min(p) for p in points)
    hi = max(max(p) for p in points)
    span = max(hi - lo, 1) * super_scale
    mid = (lo + hi) // 2
    pts = list(points) + [(mid - 2 * span, mid - span), (mid + 2 * span, mid - span), (mid, mid + 2 * span)]
    S = (n, n + 1, n + 2)
    tris = {ccw(S, pts)}
    for i in range(n):
        p = pts[i]
        bad = []
        for t in tris:
            counter.incircle += 1
            if in_circle(pts[t[0]], pts[t[1]], pts[t[2]], p) > 0:
                bad.append(t)
        # the cavity boundary: edges of bad triangles not shared by two bad ones
        edge_count = defaultdict(int)
        for t in bad:
            for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                edge_count[frozenset(e)] += 1
        for t in bad:
            tris.remove(t)
        for t in bad:
            for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                if edge_count[frozenset(e)] == 1:
                    tris.add(ccw((e[0], e[1], i), pts))
    return {canon(t) for t in tris if not (set(t) & set(S))}


def canon(t):
    a, b, c = sorted(t)
    return (a, b, c)


# ---------------------------------------------------------- Lawson flips
def lawson(points, counter=None):
    """Incremental insertion with edge flips: split the containing
    triangle into three, then flip any edge whose opposite vertex lies
    inside the circumcircle, until no such edge remains."""
    counter = counter or Counter()
    n = len(points)
    lo = min(min(p) for p in points)
    hi = max(max(p) for p in points)
    span = max(hi - lo, 1) * 1000
    mid = (lo + hi) // 2
    pts = list(points) + [(mid - 2 * span, mid - span), (mid + 2 * span, mid - span), (mid, mid + 2 * span)]
    S = {n, n + 1, n + 2}
    tris = {ccw((n, n + 1, n + 2), pts)}
    # edge -> set of triangles
    by_edge = defaultdict(set)

    def add(t):
        tris.add(t)
        for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            by_edge[frozenset(e)].add(t)

    def remove(t):
        tris.remove(t)
        for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            by_edge[frozenset(e)].discard(t)

    remove(next(iter(tris)))
    add(ccw((n, n + 1, n + 2), pts))
    for i in range(n):
        p = pts[i]
        container = None
        for t in tris:
            counter.orient += 3
            if (orient(pts[t[0]], pts[t[1]], p) >= 0 and orient(pts[t[1]], pts[t[2]], p) >= 0
                    and orient(pts[t[2]], pts[t[0]], p) >= 0):
                container = t
                break
        assert container is not None
        a, b, c = container
        remove(container)
        stack = []
        for e in ((a, b), (b, c), (c, a)):
            t = ccw((e[0], e[1], i), pts)
            add(t)
            stack.append(frozenset(e))
        while stack:
            e = stack.pop()
            ts = list(by_edge[e])
            if len(ts) != 2:
                continue
            t1 = next(t for t in ts if i in t)
            t2 = next(t for t in ts if t is not t1)
            if i not in t1:
                continue
            u, v = tuple(e)
            w = next(x for x in t2 if x not in e)
            counter.incircle += 1
            if in_circle(pts[t1[0]], pts[t1[1]], pts[t1[2]], pts[w]) > 0:
                remove(t1)
                remove(t2)
                add(ccw((i, u, w), pts))
                add(ccw((i, w, v), pts))
                stack.append(frozenset((u, w)))
                stack.append(frozenset((w, v)))
    return {canon(t) for t in tris if not (set(t) & S)}


# -------------------------------------------------------------- referees
def brute_force_delaunay(points, counter=None):
    """All triples whose circumcircle holds no other point strictly."""
    counter = counter or Counter()
    n = len(points)
    out = set()
    for a in range(n):
        for b in range(a + 1, n):
            for c in range(b + 1, n):
                t = ccw((a, b, c), points)
                if orient(points[t[0]], points[t[1]], points[t[2]]) == 0:
                    continue
                empty = True
                for d in range(n):
                    if d in t:
                        continue
                    counter.incircle += 1
                    if in_circle(points[t[0]], points[t[1]], points[t[2]], points[d]) > 0:
                        empty = False
                        break
                if empty:
                    out.add(canon(t))
    return out


def convex_hull(points):
    """Andrew's monotone chain: hull vertices in counterclockwise order."""
    idx = sorted(range(len(points)), key=lambda i: points[i])

    def half(seq):
        h = []
        for i in seq:
            while len(h) >= 2 and orient(points[h[-2]], points[h[-1]], points[i]) <= 0:
                h.pop()
            h.append(i)
        return h

    lower = half(idx)
    upper = half(reversed(idx))
    return lower[:-1] + upper[:-1]


def boundary_edges(tris):
    count = defaultdict(int)
    for t in tris:
        for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            count[frozenset(e)] += 1
    return {e for e, c in count.items() if c == 1}


def all_edges(tris):
    return {frozenset(e) for t in tris for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0]))}


def check_delaunay(points, tris, counter=None):
    counter = counter or Counter()
    for t in tris:
        a, b, c = ccw(t, points)
        for d in range(len(points)):
            if d in t:
                continue
            counter.incircle += 1
            assert in_circle(points[a], points[b], points[c], points[d]) <= 0, (t, d)


def random_points(n, rng):
    pts = set()
    while len(pts) < n:
        pts.add((rng.randrange(RANGE), rng.randrange(RANGE)))
    pts = sorted(pts)
    rng.shuffle(pts)
    return pts


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1 + 2 + 3 + 4 on a small instance, with the brute force.
    small = random_points(40, rng)
    tris = bowyer_watson(small)
    check_delaunay(small, tris)
    brute = brute_force_delaunay(small)
    assert tris == brute, (len(tris), len(brute))
    hull = convex_hull(small)
    h = len(hull)
    assert len(tris) == 2 * 40 - 2 - h
    assert len(all_edges(tris)) == 3 * 40 - 3 - h
    hull_edges = {frozenset((hull[i], hull[(i + 1) % h])) for i in range(h)}
    assert boundary_edges(tris) == hull_edges
    assert lawson(small) == tris

    # Oracles 2-5 on larger instances, plus the cost table.
    table = []
    for n in (100, 200, 400):
        pts = random_points(n, rng)
        c_bw = Counter()
        t_bw = bowyer_watson(pts, counter=c_bw)
        c_law = Counter()
        t_law = lawson(pts, counter=c_law)
        assert t_bw == t_law
        check_delaunay(pts, t_bw)
        hull = convex_hull(pts)
        h = len(hull)
        assert len(t_bw) == 2 * n - 2 - h and len(all_edges(t_bw)) == 3 * n - 3 - h
        assert boundary_edges(t_bw) == {frozenset((hull[i], hull[(i + 1) % h])) for i in range(h)}
        # rebuilding from scratch after every insertion: the cost of not
        # being incremental, counted without running the whole thing twice
        # (each rebuild of i points costs what one full run of i points costs).
        rebuild = 0
        for i in range(3, n + 1, max(1, n // 20)):
            c = Counter()
            bowyer_watson(pts[:i], counter=c)
            rebuild += c.incircle * max(1, n // 20)
        table.append((n, h, len(t_bw), c_bw.incircle, c_law.incircle + c_law.orient, rebuild))

    # Oracle 3 as the negative example: a tight super-triangle drops hull
    # edges, because its three fake vertices are close enough to matter.
    pts = random_points(200, rng)
    hull = convex_hull(pts)
    h = len(hull)
    hull_edges = {frozenset((hull[i], hull[(i + 1) % h])) for i in range(h)}
    dropped = {}
    for scale in (1, 3, 10, 1000):
        t = bowyer_watson(pts, super_scale=scale)
        missing = len(hull_edges - boundary_edges(t))
        dropped[scale] = (missing, len(t), 2 * 200 - 2 - h)
    assert dropped[1000][0] == 0 and dropped[1000][1] == 2 * 200 - 2 - h
    assert dropped[1][0] > 0, dropped

    print('contest: Delaunay triangulation of random integer points (exact predicates), incremental insertion; currency: in-circle tests (Lawson also pays orientation tests to locate); referees: brute-force empty-circumcircle triples, Euler counts, the independent hull as the boundary')
    print(f"  {'n':>5} {'hull':>5} {'triangles':>10} {'Bowyer-Watson':>14} {'Lawson flips':>13} {'rebuild each':>13}")
    for n, h, T, bw, law, rebuild in table:
        print(f"  {n:>5} {h:>5} {T:>10} {bw:>14,} {law:>13,} {rebuild:>13,}   Euler: 2n - 2 - h = {2 * n - 2 - h}")
    print('the super-triangle trap (200 points): hull edges dropped by scale: ' + ', '.join(f'{s}x: {m} missing, {T} triangles vs {want} expected' for s, (m, T, want) in dropped.items()))
    print(f'OK: 40-point output equals the brute-force empty-circumcircle triple set ({len(brute)} triangles); every triangle empty on every instance; Euler counts and hull boundary exact at n = 40, 100, 200, 400; '
          f'Lawson flips identical on all four; in-circle tests {table[-1][3]:,} (cavity) vs {table[-1][4]:,} (flips + locate) vs {table[-1][5]:,} (rebuild) at n = 400; '
          f'tight super-triangle drops {dropped[1][0]} hull edges at 1x and {dropped[3][0]} at 3x, none at 1000x')
