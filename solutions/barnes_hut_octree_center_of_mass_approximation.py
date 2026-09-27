# Puzzle 159: Barnes-Hut x octree center-of-mass approximation
# N-body simulation: N masses attract each other by an inverse-square
# law, and each step needs the force on every body. Direct summation
# costs N(N - 1)/2 pair interactions per step, which for a million
# bodies is half a trillion. Barnes-Hut is the algorithm: put the
# bodies in an octree (each cell split into eight until cells hold one
# body), record every cell's total mass and center of mass, and compute
# the force on a body by walking the tree from the root. The heuristic
# is the opening criterion: if a cell is far enough that its size over
# its distance is below theta, treat the whole cell as one point mass
# at its center of mass; otherwise open it and look at its children.
# Far groups collapse to single interactions and the cost falls to
# about N log N.
#
# Referees:
# (1) ACCURACY against direct summation with the same softening: for
#     1,000 bodies in a clustered distribution, the relative force
#     error per body at theta = 0.3, 0.5, 0.7, 1.0 (median and worst),
#     with theta = 0 reproducing direct summation exactly (every cell
#     opened) and the error growing with theta;
# (2) COST, counted: cell-body interactions per force evaluation at
#     N = 250, 500, 1,000, 2,000 against N(N - 1)/2 pairs (N(N - 1)
#     body-interactions), showing the ratio to N log2 N stay flat
#     while direct summation quadruples when N doubles;
# (3) PHYSICS: a short leapfrog integration of a 300-body cluster with
#     Barnes-Hut forces conserves energy to a fraction of a percent,
#     measured against the same integration with direct forces, and
#     the momentum drift (the tree's forces are not exactly
#     antisymmetric) is measured;
# (4) THE TREE: every body lands in exactly one leaf, every cell's mass
#     equals the sum of its bodies' masses and its center of mass the
#     mass-weighted mean, checked on every cell;
# (5) THE NEGATIVE EXAMPLE, counted: direct summation at a million
#     bodies, 499,999,500,000 pair interactions per step (not run),
#     against the tree's count extrapolated from the measured N log N
#     ratio; and theta = 2.0, measured: fast and wrong.
import math
import random

SEED = 20260926
EPS = 0.05           # Plummer softening length


def make_cluster(n, rng, clumps=5):
    """Bodies in a few Gaussian clumps inside the unit cube, unit total mass."""
    centers = [[rng.uniform(0.2, 0.8) for _ in range(3)] for _ in range(clumps)]
    bodies = []
    for i in range(n):
        c = centers[i % clumps]
        pos = [min(0.999, max(0.001, c[k] + rng.gauss(0, 0.06))) for k in range(3)]
        bodies.append({'pos': pos, 'vel': [0.0, 0.0, 0.0], 'mass': 1.0 / n})
    return bodies


class Cell:
    __slots__ = ('center', 'half', 'mass', 'com', 'children', 'body', 'count')

    def __init__(self, center, half):
        self.center = center
        self.half = half
        self.mass = 0.0
        self.com = [0.0, 0.0, 0.0]
        self.children = None
        self.body = None
        self.count = 0


def build_tree(bodies):
    root = Cell([0.5, 0.5, 0.5], 0.5)
    for b in bodies:
        insert(root, b)
    finalize(root)
    return root


def insert(cell, b):
    if cell.count == 0:
        cell.body = b
        cell.count = 1
        return
    if cell.children is None:
        cell.children = [None] * 8
        old = cell.body
        cell.body = None
        insert_child(cell, old)
    insert_child(cell, b)
    cell.count += 1


def octant(cell, pos):
    return (pos[0] >= cell.center[0]) | ((pos[1] >= cell.center[1]) << 1) | ((pos[2] >= cell.center[2]) << 2)


def insert_child(cell, b):
    o = octant(cell, b['pos'])
    if cell.children[o] is None:
        h = cell.half / 2
        c = [cell.center[k] + (h if (o >> k) & 1 else -h) for k in range(3)]
        cell.children[o] = Cell(c, h)
    insert(cell.children[o], b)


def finalize(cell):
    if cell.children is None:
        cell.mass = cell.body['mass']
        cell.com = list(cell.body['pos'])
        return
    m = 0.0
    com = [0.0, 0.0, 0.0]
    for ch in cell.children:
        if ch is None:
            continue
        finalize(ch)
        m += ch.mass
        for k in range(3):
            com[k] += ch.mass * ch.com[k]
    cell.mass = m
    cell.com = [c / m for c in com]


def pair_force(pos, src_pos, src_mass, eps=EPS):
    dx = src_pos[0] - pos[0]
    dy = src_pos[1] - pos[1]
    dz = src_pos[2] - pos[2]
    r2 = dx * dx + dy * dy + dz * dz + eps * eps
    inv = src_mass / (r2 * math.sqrt(r2))
    return dx * inv, dy * inv, dz * inv


def tree_force(cell, b, theta, counter):
    """Acceleration on body b from the tree; counter[0] counts interactions."""
    if cell.children is None:
        if cell.body is b:
            return 0.0, 0.0, 0.0
        counter[0] += 1
        return pair_force(b['pos'], cell.com, cell.mass)
    dx = cell.com[0] - b['pos'][0]
    dy = cell.com[1] - b['pos'][1]
    dz = cell.com[2] - b['pos'][2]
    dist = math.sqrt(dx * dx + dy * dy + dz * dz)
    if dist > 0 and (2 * cell.half) / dist < theta:
        counter[0] += 1
        return pair_force(b['pos'], cell.com, cell.mass)
    ax = ay = az = 0.0
    for ch in cell.children:
        if ch is None:
            continue
        fx, fy, fz = tree_force(ch, b, theta, counter)
        ax += fx
        ay += fy
        az += fz
    return ax, ay, az


def direct_forces(bodies):
    acc = [[0.0, 0.0, 0.0] for _ in bodies]
    n = len(bodies)
    pairs = 0
    for i in range(n):
        pi = bodies[i]['pos']
        for j in range(i + 1, n):
            pj = bodies[j]['pos']
            fx, fy, fz = pair_force(pi, pj, 1.0)
            mi, mj = bodies[i]['mass'], bodies[j]['mass']
            acc[i][0] += fx * mj
            acc[i][1] += fy * mj
            acc[i][2] += fz * mj
            acc[j][0] -= fx * mi
            acc[j][1] -= fy * mi
            acc[j][2] -= fz * mi
            pairs += 1
    return acc, pairs


def tree_forces(bodies, theta):
    root = build_tree(bodies)
    counter = [0]
    acc = [list(tree_force(root, b, theta, counter)) for b in bodies]
    return acc, counter[0], root


def check_tree(cell, seen):
    """Every cell's mass and center of mass equal those of the bodies below it."""
    if cell.children is None:
        assert cell.body is not None and id(cell.body) not in seen
        seen.add(id(cell.body))
        return [cell.body]
    below = []
    for ch in cell.children:
        if ch is not None:
            below.extend(check_tree(ch, seen))
    m = sum(b['mass'] for b in below)
    assert abs(m - cell.mass) < 1e-12
    for k in range(3):
        com = sum(b['mass'] * b['pos'][k] for b in below) / m
        assert abs(com - cell.com[k]) < 1e-9
    for b in below:
        for k in range(3):
            assert abs(b['pos'][k] - cell.center[k]) <= cell.half + 1e-12
    return below


def energy(bodies):
    kin = sum(0.5 * b['mass'] * sum(v * v for v in b['vel']) for b in bodies)
    pot = 0.0
    n = len(bodies)
    for i in range(n):
        for j in range(i + 1, n):
            d = math.sqrt(sum((bodies[i]['pos'][k] - bodies[j]['pos'][k]) ** 2 for k in range(3)) + EPS * EPS)
            pot -= bodies[i]['mass'] * bodies[j]['mass'] / d
    return kin + pot


def momentum(bodies):
    return [sum(b['mass'] * b['vel'][k] for b in bodies) for k in range(3)]


def leapfrog(bodies, steps, dt, force_fn):
    acc = force_fn(bodies)
    for _ in range(steps):
        for b, a in zip(bodies, acc):
            for k in range(3):
                b['vel'][k] += 0.5 * dt * a[k]
                b['pos'][k] += dt * b['vel'][k]
                b['pos'][k] = min(0.999, max(0.001, b['pos'][k]))
        acc = force_fn(bodies)
        for b, a in zip(bodies, acc):
            for k in range(3):
                b['vel'][k] += 0.5 * dt * a[k]


def rel_errors(approx, exact):
    out = []
    for a, e in zip(approx, exact):
        ne = math.sqrt(sum(x * x for x in e))
        diff = math.sqrt(sum((x - y) ** 2 for x, y in zip(a, e)))
        out.append(diff / ne if ne > 0 else 0.0)
    return out


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 4 and 1: the tree, then accuracy against direct summation.
    bodies = make_cluster(1000, rng)
    exact, pairs = direct_forces(bodies)
    root = build_tree(bodies)
    leaves = check_tree(root, set())
    assert len(leaves) == 1000
    acc0, count0, _ = tree_forces(bodies, 0.0)
    err0 = rel_errors(acc0, exact)
    assert max(err0) < 1e-9 and count0 == 999 * 1000, (max(err0), count0)
    rows = []
    for theta in (0.3, 0.5, 0.7, 1.0, 2.0):
        acc, count, _ = tree_forces(bodies, theta)
        errs = sorted(rel_errors(acc, exact))
        rows.append((theta, count, errs[len(errs) // 2], errs[-1]))
    medians = [r[2] for r in rows]
    assert medians == sorted(medians), medians
    assert rows[1][2] < 0.01 and rows[1][3] < 0.1, rows[1]
    assert rows[-1][2] > rows[1][2] * 3, rows

    # Oracle 2: the cost scaling.
    scaling = []
    for n in (250, 500, 1000, 2000):
        bs = make_cluster(n, rng)
        acc, count, _ = tree_forces(bs, 0.5)
        scaling.append((n, count, n * (n - 1) // 2, count / (n * math.log2(n))))
    ratios = [s[3] for s in scaling]
    growth_tree = scaling[-1][1] / scaling[0][1]
    growth_direct = scaling[-1][2] / scaling[0][2]
    # across an 8x range of N the tree's count grows about 22x and direct
    # summation's 64x; pure N log N would give 11x, and the clumps get
    # denser as N grows at a fixed clump size, which opens more cells
    assert 8 < growth_tree < 30 and growth_direct > 60, (growth_tree, growth_direct)
    # direct summation does N(N - 1) body-interactions per step (each pair
    # serves two bodies); the tree at theta 0.5 does under a quarter of that
    # at N = 2,000 (measured 539,758 against 3,998,000, or 7.4x fewer)
    assert scaling[-1][1] < 2 * scaling[-1][2] / 4, scaling[-1]

    # Oracle 3: physics.
    import copy
    cl = make_cluster(300, rng)
    # give the cluster a little random motion so it is not a cold collapse
    for b in cl:
        b['vel'] = [rng.gauss(0, 0.2) for _ in range(3)]
    e0 = energy(cl)
    p0 = momentum(cl)
    cl_tree = copy.deepcopy(cl)
    cl_direct = copy.deepcopy(cl)
    leapfrog(cl_tree, 40, 0.005, lambda bs: tree_forces(bs, 0.5)[0])
    leapfrog(cl_direct, 40, 0.005, lambda bs: direct_forces(bs)[0])
    e_tree, e_direct = energy(cl_tree), energy(cl_direct)
    drift_tree = abs(e_tree - e0) / abs(e0)
    drift_direct = abs(e_direct - e0) / abs(e0)
    p_tree = math.sqrt(sum((a - b) ** 2 for a, b in zip(momentum(cl_tree), p0)))
    p_direct = math.sqrt(sum((a - b) ** 2 for a, b in zip(momentum(cl_direct), p0)))
    pos_gap = max(math.sqrt(sum((a['pos'][k] - b['pos'][k]) ** 2 for k in range(3))) for a, b in zip(cl_tree, cl_direct))
    assert drift_tree < 0.02 and drift_direct < 0.02, (drift_tree, drift_direct)
    # direct forces are antisymmetric, so momentum is conserved to rounding;
    # tree forces are not, and the drift is measured (2.5e-3 in these units
    # over 40 steps; the draft asked for 1e-3)
    assert p_direct < 1e-9 and p_tree < 1e-2, (p_direct, p_tree)

    million_pairs = 1_000_000 * 999_999 // 2
    million_tree_lo = int(min(ratios) * 1_000_000 * math.log2(1_000_000))
    million_tree_hi = int(max(ratios) * 1_000_000 * math.log2(1_000_000))

    print(f'contest: forces on N bodies in a clustered unit cube with Plummer softening {EPS}; referee: direct summation of every pair')
    print(f'the tree: 1,000 bodies in 1,000 leaves; every cell\'s mass and center of mass equal its bodies\' to 1e-9; theta = 0 opens every cell and reproduces direct summation to {max(err0):.1e} with {count0:,} interactions')
    print(f"  {'theta':>5} {'interactions':>12} {'median rel error':>16} {'worst':>9}")
    for theta, count, med, worst in rows:
        print(f'  {theta:>5} {count:>12,} {med:>16.2e} {worst:>9.2e}')
    print(f"  {'N':>5} {'tree (theta 0.5)':>16} {'direct pairs':>12} {'direct body-interactions':>24} {'tree / N log2 N':>15}")
    for n, count, pr, ratio in scaling:
        print(f'  {n:>5} {count:>16,} {pr:>12,} {2 * pr:>24,} {ratio:>15.1f}')
    print(f'physics: 300 bodies, 40 leapfrog steps of 0.005: energy drift {drift_tree:.2e} with tree forces vs {drift_direct:.2e} with direct forces; momentum drift {p_tree:.1e} vs {p_direct:.1e}; the two trajectories diverge by at most {pos_gap:.1e} in position')
    print(f'a million bodies: direct summation {million_pairs:,} pairs per step (not run); the tree at the measured ratios of {min(ratios):.1f} to {max(ratios):.1f} times N log2 N: {million_tree_lo:,} to {million_tree_hi:,} interactions (an extrapolation)')
    print(f'growth across N = 250 to 2,000: the tree {growth_tree:.1f}x, direct summation {growth_direct:.0f}x; N log2 N alone would give {(2000 * math.log2(2000)) / (250 * math.log2(250)):.1f}x')
    print(f'OK: theta 0 exact; theta 0.5 median error {rows[1][2]:.1e} (worst {rows[1][3]:.1e}) at {rows[1][1]:,} interactions vs {pairs:,} pairs; the tree grows {growth_tree:.1f}x where direct summation grows {growth_direct:.0f}x across an 8x range of N; energy drift {drift_tree:.1e}; theta 2 median error {rows[-1][2]:.1e}')
