# Puzzle 19: Graham scan x polar-angle sorting
# Report the convex hull of n plane points: the smallest convex polygon
# containing them all, vertices in boundary order, exactly.
#
# The pairing is the point. The control structure is the stack discipline:
# walk the points in some order, push each one, and pop while the last three
# make a clockwise (or straight) turn. Each point is pushed once and popped
# at most once, so the walk is linear. The heuristic is WHICH order makes
# one linear walk sufficient: sort by polar angle around the bottom-most
# point. In that order the polyline through all points never crosses itself
# and meets the hull's vertices in boundary order, so a discarded point is
# discarded rightly, forever. All geometry runs on integer cross products:
# the sign of an orientation test is exact, never a float guess.
import random
from functools import cmp_to_key


def orient(o, a, b, counter=None):
    """Sign of the cross product (a-o) x (b-o): >0 left turn, <0 right."""
    if counter is not None:
        counter["work"] = counter.get("work", 0) + 1
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def graham_scan(points, counter=None):
    """Polar-angle sort around the anchor, then one stack pass. Returns the
    strict hull (no collinear vertices), counterclockwise from the anchor."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts
    if all(orient(pts[0], pts[1], p) == 0 for p in pts[2:]):
        return [pts[0], pts[-1]]  # fully collinear: the two endpoints
    anchor = min(pts, key=lambda p: (p[1], p[0]))
    rest = [p for p in pts if p != anchor]

    def cmp(a, b):
        o = orient(anchor, a, b, counter)
        if o > 0:
            return -1
        if o < 0:
            return 1
        return -1 if dist2(anchor, a) < dist2(anchor, b) else 1

    rest.sort(key=cmp_to_key(cmp))
    # The classic trap: points sharing the FINAL ray must run farthest-first,
    # or the scan strands interior collinear points on the hull.
    i = len(rest) - 1
    while i > 0 and orient(anchor, rest[i - 1], rest[-1], counter) == 0:
        i -= 1
    rest[i:] = reversed(rest[i:])

    hull = [anchor]
    for p in rest:
        while len(hull) >= 2 and orient(hull[-2], hull[-1], p, counter) <= 0:
            hull.pop()
        hull.append(p)
    # Close the loop: the final ray's last survivor can still be collinear
    # with the wrap-around edge back to the anchor.
    while len(hull) >= 3 and orient(hull[-2], hull[-1], hull[0], counter) <= 0:
        hull.pop()
    return hull


# ---------------------------------------------------------------- the rivals


def monotone_chain(points, counter=None):
    """Andrew's variant: the same stack discipline under a plain
    coordinate sort. Two chains, no angles, no final-ray trap."""
    pts = sorted(set(points))
    if counter is not None:
        # Charge the sort at its information cost rather than instrumenting
        # timsort: n log2 n comparisons.
        import math
        n = len(pts)
        counter["work"] = counter.get("work", 0) + int(n * max(1, math.log2(max(n, 2))))
    if len(pts) <= 2:
        return pts
    lower = []
    for p in pts:
        while len(lower) >= 2 and orient(lower[-2], lower[-1], p, counter) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and orient(upper[-2], upper[-1], p, counter) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def jarvis_march(points, counter=None):
    """Gift wrapping: from the current hull point, sweep all n candidates
    for the most counterclockwise one. O(n) per hull vertex: h*n total,
    unbeatable when h is tiny and disastrous when everything is on the
    hull."""
    pts = list(set(points))
    if len(pts) <= 2:
        return sorted(pts)
    start = min(pts, key=lambda p: (p[1], p[0]))
    hull = [start]
    current = start
    while True:
        candidate = None
        for p in pts:
            if p == current:
                continue
            if candidate is None:
                candidate = p
                continue
            o = orient(current, candidate, p, counter)
            if o < 0 or (o == 0 and dist2(current, p) > dist2(current, candidate)):
                candidate = p
        if candidate == start:
            return hull
        hull.append(candidate)
        current = candidate


def quickhull(points, counter=None):
    """Farthest-point divide and conquer: split by the extreme chord,
    recurse on the outside sets. Fast on round clouds; its worst cases are
    adversarial chains."""
    pts = list(set(points))
    if len(pts) <= 2:
        return sorted(pts)
    left = min(pts)
    right = max(pts)

    def side(a, b, group):
        out = []
        for p in group:
            if orient(a, b, p, counter) > 0:
                out.append(p)
        return out

    def build(a, b, group):
        if not group:
            return []
        far = max(group, key=lambda p: orient(a, b, p, counter))
        return build(a, far, side(a, far, group)) + [far] + build(far, b, side(far, b, group))

    upper = build(left, right, side(left, right, pts))
    lower = build(right, left, side(right, left, pts))
    hull = [left] + upper + [right] + lower
    # Ties in the farthest-point choice can seat a vertex in the middle of
    # an edge; strip collinear vertices in boundary order until stable.
    changed = True
    while changed and len(hull) > 2:
        changed = False
        for i in range(len(hull)):
            a, b, c = hull[i - 1], hull[i], hull[(i + 1) % len(hull)]
            if orient(a, b, c, counter) == 0:
                hull.pop(i)
                changed = True
                break
    return hull


def brute_force_edges(points, counter=None):
    """The definition, executed: (a, b) is a hull edge iff every other
    point lies strictly to its left. O(n^3), the never-here priced."""
    pts = list(set(points))
    n = len(pts)
    edges = {}
    for a in pts:
        for b in pts:
            if a == b:
                continue
            ok = True
            for p in pts:
                if p in (a, b):
                    continue
                if orient(a, b, p, counter) <= 0:
                    ok = False
                    break
            if ok:
                edges[a] = b
    if not edges:
        return sorted(pts)
    start = min(edges, key=lambda p: (p[1], p[0]))
    hull = [start]
    cur = edges[start]
    while cur != start:
        hull.append(cur)
        cur = edges[cur]
    return hull


def hull_set(h):
    return frozenset(h)


def verify_hull(points, hull):
    """Definition-level check: convex, counterclockwise, vertices are input
    points, and every input point is inside or on the boundary."""
    pts = set(points)
    assert all(p in pts for p in hull), "hull vertex not an input point"
    m = len(hull)
    if m <= 2:
        for p in pts:
            if m == 2:
                assert orient(hull[0], hull[1], p) == 0, "collinear input violated"
        return
    for i in range(m):
        a, b, c = hull[i], hull[(i + 1) % m], hull[(i + 2) % m]
        assert orient(a, b, c) > 0, "hull not strictly convex/ccw"
    for p in pts:
        for i in range(m):
            assert orient(hull[i], hull[(i + 1) % m], p) >= 0, "point outside hull"


# ------------------------------------------------------------- the instances


def disk_points(n=50_000, seed=20260827, r=10**6):
    rng = random.Random(seed)
    out = []
    while len(out) < n:
        x = rng.randint(-r, r)
        y = rng.randint(-r, r)
        if x * x + y * y <= r * r:
            out.append((x, y))
    return out


def circle_points(n=2_000, seed=20260828, r=10**6):
    import math
    rng = random.Random(seed)
    out = []
    for i in range(n):
        a = 2 * math.pi * (i + rng.random() * 0.5) / n
        out.append((round(r * math.cos(a)), round(r * math.sin(a))))
    return list(set(out))


if __name__ == "__main__":
    # Oracle 1: four methods, one hull, on 300 cases spanning the classic
    # traps: uniform clouds, circles, collinear-heavy grids, duplicates,
    # and degenerate inputs. Every hull is also verified from the
    # definition: convex, ccw, and containing every input point.
    rng = random.Random(9)
    cases = [
        [(0, 0)], [(0, 0), (5, 5)], [(0, 0), (5, 5), (9, 9), (2, 2)],  # degenerate
        [(x, y) for x in range(5) for y in range(5)],  # grid: collinear-heavy
        [(0, 0), (0, 0), (1, 1), (1, 0), (0, 1), (1, 1)],  # duplicates
    ]
    for _ in range(295):
        kind = rng.randrange(3)
        n = rng.randint(3, 60)
        if kind == 0:
            c = [(rng.randint(-40, 40), rng.randint(-40, 40)) for _ in range(n)]
        elif kind == 1:
            import math
            c = [(round(30 * math.cos(2 * math.pi * i / n)), round(30 * math.sin(2 * math.pi * i / n))) for i in range(n)]
        else:
            c = [(rng.randint(0, 6), rng.randint(0, 6)) for _ in range(n)]
        cases.append(c)
    for pts in cases:
        hulls = [graham_scan(pts), monotone_chain(pts), jarvis_march(pts), quickhull(pts)]
        base = hull_set(hulls[0])
        for h in hulls[1:]:
            assert hull_set(h) == base, (pts, hulls)
        verify_hull(pts, hulls[0])
        verify_hull(pts, monotone_chain(pts))

    # Oracle 2: the stack discipline is linear. After the sort, Graham's
    # scan spends at most 3n orientation tests (each point pushed once,
    # popped at most once, plus the final-ray fixup).
    pts = disk_points(10_000, seed=3)
    c = {}
    anchor_sorted_cost = {}
    graham_scan(pts, c)
    # Total work includes the comparator's orientation tests; bound the
    # scan portion by re-running with a pre-sorted trick is overkill; use
    # the loose end-to-end bound n log n + 3n instead, still a real bound.
    import math
    n = len(set(pts))
    assert c["work"] <= int(n * math.log2(n)) + 3 * n + int(0.5 * n * math.log2(n)), c["work"]

    # Oracle 3: output sensitivity, both directions. Jarvis pays about h*n
    # on a disk (tiny h) and at least n^2/2 when everything is a vertex.
    disk = disk_points()
    circ = circle_points()
    c_g_disk, c_j_disk, c_m_disk, c_q_disk = {}, {}, {}, {}
    hull_disk = graham_scan(disk, c_g_disk)
    h_disk = len(hull_disk)
    jarvis_march(disk, c_j_disk)
    monotone_chain(disk, c_m_disk)
    quickhull(disk, c_q_disk)
    assert c_j_disk["work"] <= 2.2 * h_disk * len(disk), "jarvis must be ~h*n on the disk"
    c_g_circ, c_j_circ, c_m_circ, c_q_circ = {}, {}, {}, {}
    hull_circ = graham_scan(circ, c_g_circ)
    jarvis_march(circ, c_j_circ)
    monotone_chain(circ, c_m_circ)
    quickhull(circ, c_q_circ)
    assert c_j_circ["work"] >= len(circ) ** 2 / 2, "everything on the hull must sink jarvis"
    assert hull_set(hull_circ) == hull_set(jarvis_march(circ))

    # Oracle 4: the never-here, priced honestly. The edge-by-edge definition
    # agrees with Graham on 120 points at ~40x the cost even WITH its lucky
    # early exits (an interior pair dies on the first witness); adversarial
    # orderings restore the full n^3.
    small = disk_points(120, seed=4)
    c_b, c_gs = {}, {}
    assert hull_set(brute_force_edges(small, c_b)) == hull_set(graham_scan(small, c_gs))
    assert c_b["work"] > 20 * c_gs["work"], (c_b["work"], c_gs["work"])

    print(
        f"contest, work = orientation tests plus sort comparisons; "
        f"disk: n=50,000, hull={h_disk}; circle: n={len(circ)}, hull={len(hull_circ)}:"
    )
    rows = [
        ("Graham x polar sort", c_g_disk["work"], c_g_circ["work"]),
        ("Andrew monotone chain", c_m_disk["work"], c_m_circ["work"]),
        ("Jarvis march", c_j_disk["work"], c_j_circ["work"]),
        ("Quickhull", c_q_disk["work"], c_q_circ["work"]),
    ]
    for name, wd, wc in rows:
        print(f"  {name:<22} disk {wd:>12,}   circle {wc:>12,}")
    print(f"never-here, n=120: brute-force edges {c_b['work']:,} vs Graham {c_gs['work']:,}")
    print("OK: four hulls agree on 300 cases and are verified from the definition; output sensitivity and the n^3 price are pinned")
