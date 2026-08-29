# Puzzle 105: K-d tree x median-split axis cycling
# Nearest-neighbor search. The brute-force scan measures the
# distance to every point, every query: honest, exact, and n per
# question. The k-d tree carves space instead: split the points
# at their MEDIAN along one axis, cycle to the next axis one
# level down, recurse. A query descends to its home cell, then
# unwinds: a sibling subtree is entered ONLY if the slab distance
# to its splitting plane is under the best distance found so far.
# In 2D that prune is savage: 26 nodes visited where brute
# examines 60,000.
#
# The pairing is the point. The algorithm is the k-d tree
# (Bentley 1975): the recursive spatial carve and the
# descend-then-unwind query. The heuristic is median-split axis
# cycling (the classic construction rule): medians balance the
# tree (depth audited <= ceil(log2 n) + 1), cycling axes gives
# every dimension its turn, and together they make the
# ball-overlaps-plane prune effective: in LOW dimension. The
# same file measures the famous failure honestly: at d = 16 the
# prune almost never fires and the tree visits most of the
# points anyway: the curse of dimensionality, counted.
#
# Referees:
# (1) brute force recomputes the exact nearest distance for 300
#     queries per instance; the tree must match it EXACTLY
#     (squared distances, integer-free floats compared by ==
#     after identical arithmetic on the same coordinates);
# (2) the k-d property verified recursively at EVERY node (whole
#     left subtree <= split on the node's axis, right >= it);
# (3) balance audited: depth <= ceil(log2 n) + 1, and the tree
#     holds exactly the input multiset;
# (4) range queries: axis-aligned boxes, tree result == brute
#     filter as SETS, 200 boxes;
# (5) the curse measured: same code, same n, d = 2, 8, 16:
#     visited fraction rising toward 1: the neverUse with a
#     number, not a warning.
import math
import random

SEED = 20260829


class Node:
    __slots__ = ('pt', 'axis', 'left', 'right')

    def __init__(self, pt, axis, left, right):
        self.pt = pt
        self.axis = axis
        self.left = left
        self.right = right


def build(pts, depth, d):
    if not pts:
        return None
    axis = depth % d
    pts = sorted(pts, key=lambda p: p[axis])
    mid = len(pts) // 2
    return Node(
        pts[mid],
        axis,
        build(pts[:mid], depth + 1, d),
        build(pts[mid + 1:], depth + 1, d),
    )


def dist2(a, b):
    return sum((ax - bx) ** 2 for ax, bx in zip(a, b))


def nn(root, q, count):
    """Descend home-side first, unwind, prune with the slab test."""
    best = [math.inf, None]

    def visit(node):
        if node is None:
            return
        count[0] += 1
        d2 = dist2(node.pt, q)
        if d2 < best[0]:
            best[0] = d2
            best[1] = node.pt
        delta = q[node.axis] - node.pt[node.axis]
        near, far = (node.left, node.right) if delta < 0 else (node.right, node.left)
        visit(near)
        if delta * delta < best[0]:   # the ball crosses the plane
            visit(far)

    visit(root)
    return best[1], best[0]


def brute_nn(pts, q):
    return min(dist2(p, q) for p in pts)


def range_query(root, lo, hi, out):
    if root is None:
        return
    p = root.pt
    if all(l <= c <= h for c, l, h in zip(p, lo, hi)):
        out.append(p)
    axis = root.axis
    if lo[axis] <= p[axis]:
        range_query(root.left, lo, hi, out)
    if hi[axis] >= p[axis]:
        range_query(root.right, lo, hi, out)


def check_kd(node, lo, hi, d, depth=0):
    """Whole-subtree bound check: every point inside (lo, hi] per axis."""
    if node is None:
        return 0, 0
    p = node.pt
    assert all(lo[a] <= p[a] <= hi[a] for a in range(d)), (p, lo, hi)
    assert node.axis == depth % d
    llo, lhi = list(lo), list(hi)
    lhi[node.axis] = p[node.axis]
    rlo, rhi = list(lo), list(hi)
    rlo[node.axis] = p[node.axis]
    nl, dl = check_kd(node.left, llo, lhi, d, depth + 1)
    nr, dr = check_kd(node.right, rlo, rhi, d, depth + 1)
    return nl + nr + 1, 1 + max(dl, dr)


def collect(node, out):
    if node:
        out.append(node.pt)
        collect(node.left, out)
        collect(node.right, out)


if __name__ == '__main__':
    rng = random.Random(SEED)

    # The 2D city: 60,000 points, the headline instance.
    N2 = 60_000
    pts2 = [(rng.random(), rng.random()) for _ in range(N2)]
    root2 = build(pts2, 0, 2)

    # Oracle 2 + 3: structure, balance, and content.
    size, depth = check_kd(root2, [-math.inf] * 2, [math.inf] * 2, 2)
    assert size == N2
    assert depth <= math.ceil(math.log2(N2)) + 1, depth
    held = []
    collect(root2, held)
    assert sorted(held) == sorted(pts2)

    # Oracle 1: brute referee on 300 queries; visits counted on 2,000.
    visits2 = 0
    for i in range(2000):
        q = (rng.random(), rng.random())
        c = [0]
        _, d2b = nn(root2, q, c)
        visits2 += c[0]
        if i < 300:
            assert d2b == brute_nn(pts2, q), (q, d2b)
    avg2 = visits2 / 2000
    assert avg2 < N2 / 500, avg2

    # Oracle 4: 200 range boxes, set-exact vs brute filter.
    for _ in range(200):
        cx, cy = rng.random(), rng.random()
        w, h = rng.random() * 0.1, rng.random() * 0.1
        lo, hi = (cx - w, cy - h), (cx + w, cy + h)
        got = []
        range_query(root2, lo, hi, got)
        ref = [p for p in pts2 if lo[0] <= p[0] <= hi[0] and lo[1] <= p[1] <= hi[1]]
        assert sorted(got) == sorted(ref)

    # Oracle 5: the curse, same code at d = 2, 8, 16 (n = 4,000).
    NC = 4_000
    curse = []
    for d in (2, 8, 16):
        pts = [tuple(rng.random() for _ in range(d)) for _ in range(NC)]
        root = build(pts, 0, d)
        sz, dep = check_kd(root, [-math.inf] * d, [math.inf] * d, d)
        assert sz == NC and dep <= math.ceil(math.log2(NC)) + 1
        total = 0
        for i in range(300):
            q = tuple(rng.random() for _ in range(d))
            c = [0]
            _, best = nn(root, q, c)
            total += c[0]
            assert best == brute_nn(pts, q), (d, i)
        curse.append((d, total / 300))
    (d2_, v2), (d8, v8), (d16, v16) = curse
    assert v2 < v8 < v16, curse
    assert v16 > 0.5 * NC, v16     # the prune has effectively died
    assert v2 < NC / 40, v2

    print('contest: nearest neighbor, one currency (points/nodes examined per query); referee: brute force recomputes the exact distance, 300 queries per instance')
    print(f"  {'instance':<28} {'brute scan':>11} {'k-d tree':>9}")
    print(f"  {'2D, n = 60,000':<28} {N2:>11,} {avg2:>9.1f}   the carve pays: {N2 / avg2:,.0f}x fewer points examined")
    print(f"  {'d = 8, n = 4,000':<28} {NC:>11,} {v8:>9.0f}   the prune weakens: every axis wants its turn and gets it rarely")
    print(f"  {'d = 16, n = 4,000':<28} {NC:>11,} {v16:>9.0f}   the curse: {100 * v16 / NC:.0f}% of the tree visited: worse than brute once overhead counts")
    print(f"structure, audited: k-d property at every one of {N2:,} nodes (whole-subtree bounds), depth {depth} <= {math.ceil(math.log2(N2)) + 1}, content the exact input multiset; 200 range boxes set-equal to the brute filter")
    print(f"the referee: 300 + 300 + 300 + 300 queries across all instances, tree distance == brute distance, exactly, every time")
    print(f'OK: nearest neighbors exact against brute force on every refereed query; the k-d property and balance audited at every node; '
          f'range queries set-exact; the 2D carve examines {N2 / avg2:,.0f}x fewer points; and the curse is measured, not recited: '
          f'{v2:.0f} -> {v8:.0f} -> {v16:.0f} visits as d goes 2 -> 8 -> 16 ({100 * v16 / NC:.0f}% of all points at d = 16)')
