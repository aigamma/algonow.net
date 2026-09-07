# Puzzle 115: Rapidly-exploring random tree x Voronoi-biased sampling
# Motion planning: find a collision-free path for a robot from
# start to goal through obstacle-cluttered space, where the free
# space is continuous and a grid is only ever an approximation.
# The RRT loop is three lines: sample a random point in the
# world, find the NEAREST node of the tree, extend that node one
# fixed step toward the sample. The heuristic is what those three
# lines secretly implement: each tree node is selected for
# extension with probability proportional to the area of its
# VORONOI REGION: the share of the world it is nearest to: so
# frontier nodes facing big unexplored voids get extended most,
# and the tree RUSHES into open space instead of diffusing.
# LaValle's insight was that uniform sampling plus nearest
# neighbor IS an exploration heuristic: nobody codes the bias,
# the geometry supplies it.
#
# This file isolates the heuristic by ablation: the same tree
# growth with the Voronoi bias removed (extend a RANDOM node in
# a RANDOM direction: Brownian diffusion) fails where RRT
# sprints.
#
# Referees:
# (1) COLLISION EXACTNESS: every tree edge and every path edge
#     validated two ways: the builder uses EXACT segment-vs-
#     rectangle geometry (Liang-Barsky), and an independent dense
#     point-sampling cross-check agrees on every edge. Two drafts
#     lost the resolution war first (sampled 1.0 caught at 0.25;
#     sampled 0.25 caught at 0.1): segments graze corners between
#     samples, and only exact geometry ends the war: taught;
# (2) A* ON A FINE GRID as the completeness-and-length referee:
#     where A* finds a path, RRT must too (measured success
#     rates), and RRT's path length lands within a measured
#     factor of the grid-optimal;
# (3) the ablation: Voronoi-biased vs random-walk growth on the
#     same worlds: iterations-to-goal and coverage measured;
# (4) the greedy trap: straight-toward-goal walking dies in the
#     bug trap (measured stuck), RRT escapes (measured rate);
# (5) the honesty row: the narrow passage: RRT's success rate
#     inside a fixed budget drops, measured and stated (the gap
#     bridge/informed sampling variants exist to close).
import math
import random

SEED = 20260829
STEP = 4.0
GOAL_R = 5.0
WORLD = 100.0


def make_world(kind):
    """Obstacles are axis-aligned rectangles (x0, y0, x1, y1)."""
    if kind == 'open':
        obs = [(30, 20, 40, 80), (60, 0, 70, 60)]
    elif kind == 'bugtrap':
        obs = [(35, 25, 75, 30), (35, 70, 75, 75), (70, 30, 75, 70)]
    else:  # narrow
        obs = [(45, 0, 55, 49), (45, 51, 55, 100)]
    start = (10.0, 50.0)
    goal = (90.0, 50.0)
    return obs, start, goal


def in_obstacle(p, obs):
    x, y = p
    for (a, b, c, d) in obs:
        if a <= x <= c and b <= y <= d:
            return True
    return False


def seg_hits_rect(p, q, rect):
    """EXACT segment-vs-rectangle intersection (Liang-Barsky slab
    clipping). Sampling-based edge checks lost the resolution war
    twice in this file's drafts (built at 1.0, caught at 0.25;
    rebuilt at 0.25, caught at 0.1: a segment can always graze a
    corner between samples), so the builder uses exact geometry
    and sampling is demoted to an independent cross-check."""
    a, b, c, d = rect
    dx = q[0] - p[0]
    dy = q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, p[0] - a), (dx, c - p[0]), (-dy, p[1] - b), (dy, d - p[1])):
        if pp == 0:
            if qq < 0:
                return False  # parallel and fully outside this slab
        else:
            t = qq / pp
            if pp < 0:
                if t > t1:
                    return False
                if t > t0:
                    t0 = t
            else:
                if t < t0:
                    return False
                if t < t1:
                    t1 = t
    return t0 <= t1


def edge_free(p, q, obs, res=None):
    """Exact: the segment touches no obstacle rectangle."""
    for rect in obs:
        if seg_hits_rect(p, q, rect):
            return False
    return True


def edge_free_sampled(p, q, obs, res):
    """The independent cross-check: dense point sampling. Exact-free
    implies sampled-free at every resolution (no sample point can
    sit inside a rectangle the segment never enters)."""
    steps = max(1, int(math.dist(p, q) / res))
    for i in range(steps + 1):
        t = i / steps
        if in_obstacle((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t), obs):
            return False
    return True


def grow_tree(kind, rng, voronoi=True, budget=3000, goal_bias=0.05):
    """Returns (found, iterations, nodes, parents). Ablation: with
    voronoi=False, a RANDOM node extends in a RANDOM direction."""
    obs, start, goal = make_world(kind)
    nodes = [start]
    parents = [-1]
    for it in range(1, budget + 1):
        if voronoi:
            if rng.random() < goal_bias:
                target = goal
            else:
                target = (rng.uniform(0, WORLD), rng.uniform(0, WORLD))
            ni = min(range(len(nodes)), key=lambda i: (nodes[i][0] - target[0]) ** 2 + (nodes[i][1] - target[1]) ** 2)
            base = nodes[ni]
            d = math.dist(base, target)
            if d < 1e-9:
                continue
            new = (base[0] + (target[0] - base[0]) * STEP / d,
                   base[1] + (target[1] - base[1]) * STEP / d)
        else:
            ni = rng.randrange(len(nodes))
            base = nodes[ni]
            ang = rng.uniform(0, 2 * math.pi)
            new = (base[0] + STEP * math.cos(ang), base[1] + STEP * math.sin(ang))
        if not (0 <= new[0] <= WORLD and 0 <= new[1] <= WORLD):
            continue
        if in_obstacle(new, obs) or not edge_free(base, new, obs):
            continue
        nodes.append(new)
        parents.append(ni)
        if math.dist(new, goal) <= GOAL_R:
            return True, it, nodes, parents
    return False, budget, nodes, parents


def extract_path(nodes, parents):
    path = [len(nodes) - 1]
    while parents[path[-1]] != -1:
        path.append(parents[path[-1]])
    return [nodes[i] for i in reversed(path)]


def path_length(path):
    return sum(math.dist(path[i], path[i + 1]) for i in range(len(path) - 1))


def astar(kind, cell=1.0):
    """The grid referee: 8-connected A* at 1-unit resolution."""
    import heapq
    obs, start, goal = make_world(kind)
    n = int(WORLD / cell) + 1
    sx, sy = int(start[0] / cell), int(start[1] / cell)
    gx, gy = int(goal[0] / cell), int(goal[1] / cell)
    blocked = [[in_obstacle((i * cell, j * cell), obs) for j in range(n)] for i in range(n)]
    dist = {(sx, sy): 0.0}
    pq = [(math.hypot(gx - sx, gy - sy), 0.0, (sx, sy))]
    while pq:
        f, g, (x, y) = heapq.heappop(pq)
        if (x, y) == (gx, gy):
            return g * cell
        if g > dist.get((x, y), 1e18):
            continue
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if not (0 <= nx < n and 0 <= ny < n) or blocked[nx][ny]:
                    continue
                ng = g + math.hypot(dx, dy)
                if ng < dist.get((nx, ny), 1e18):
                    dist[(nx, ny)] = ng
                    pq.append((ng + math.hypot(gx - nx, gy - ny), ng, (nx, ny)))
    return None


def greedy_walk(kind, budget=3000):
    """The trap-bait rival: always step straight toward the goal."""
    obs, start, goal = make_world(kind)
    p = start
    for it in range(budget):
        d = math.dist(p, goal)
        if d <= GOAL_R:
            return True, it
        q = (p[0] + (goal[0] - p[0]) * STEP / d, p[1] + (goal[1] - p[1]) * STEP / d)
        if in_obstacle(q, obs) or not edge_free(p, q, obs):
            return False, it  # stuck: no local reasoning can proceed
        p = q
    return False, budget


def coverage(nodes, cell=10.0):
    cells = set()
    for (x, y) in nodes:
        cells.add((int(x / cell), int(y / cell)))
    return len(cells) / ((int(WORLD / cell)) ** 2)


if __name__ == '__main__':
    rng = random.Random(SEED)
    RUNS = 12

    # The exact checker's own unit tests: corner grazes and clean misses.
    R = (10, 10, 20, 20)
    assert seg_hits_rect((0, 0), (30, 30), R)          # through the middle
    assert seg_hits_rect((0, 15), (30, 15), R)         # horizontal cut
    assert seg_hits_rect((9, 21), (21, 9), R)          # corner clip
    assert not seg_hits_rect((0, 0), (9, 30), R)       # passes left
    assert not seg_hits_rect((0, 21), (30, 30), R)     # passes above
    assert seg_hits_rect((15, 15), (16, 16), R)        # fully inside

    results = {}
    for kind in ('open', 'bugtrap', 'narrow'):
        ref_len = astar(kind)
        assert ref_len is not None, kind  # every world is solvable: A* says so
        succ = 0
        iters = []
        ratios = []
        cover_v = []
        for run in range(RUNS):
            r = random.Random(SEED + run * 101)
            found, it, nodes, parents = grow_tree(kind, r)
            # Oracle 1: collision exactness at 4x finer resolution.
            obs, start, goal = make_world(kind)
            for i in range(1, len(nodes)):
                assert edge_free_sampled(nodes[parents[i]], nodes[i], obs, 0.1), (kind, run)
            if found:
                succ += 1
                iters.append(it)
                path = extract_path(nodes, parents)
                assert math.dist(path[0], start) < 1e-9
                assert math.dist(path[-1], goal) <= GOAL_R
                for i in range(len(path) - 1):
                    assert edge_free_sampled(path[i], path[i + 1], obs, 0.1)
                ratios.append((path_length(path) + GOAL_R) / ref_len)
            cover_v.append(coverage(nodes))
        results[kind] = {
            'succ': succ, 'iters': iters, 'ratios': ratios,
            'cover': sum(cover_v) / len(cover_v), 'ref': ref_len,
        }

    # Oracle 2 verdicts: completeness where A* certifies a path.
    assert results['open']['succ'] == RUNS
    assert results['bugtrap']['succ'] >= RUNS - 1
    # length honesty: feasible, not optimal.
    all_ratios = results['open']['ratios'] + results['bugtrap']['ratios']
    assert all(1.0 <= r0 <= 2.2 for r0 in all_ratios), all_ratios

    # Oracle 3: the ablation on the bug trap: no Voronoi bias.
    abl_succ = 0
    abl_cover = []
    for run in range(RUNS):
        r = random.Random(SEED + run * 101)
        found, it, nodes, parents = grow_tree('bugtrap', r, voronoi=False)
        if found:
            abl_succ += 1
        abl_cover.append(coverage(nodes))
    v_cover = results['bugtrap']['cover']
    a_cover = sum(abl_cover) / len(abl_cover)
    assert results['bugtrap']['succ'] > abl_succ + RUNS * 0.4, (results['bugtrap']['succ'], abl_succ)
    assert v_cover > a_cover * 1.5, (v_cover, a_cover)

    # Oracle 4: the greedy trap.
    g_open, _ = greedy_walk('open')
    g_trap, stuck_at = greedy_walk('bugtrap')
    assert g_trap is False  # dies at the trap wall
    # (greedy may or may not clear 'open' depending on the wall: measured, not assumed)

    # Oracle 5: the narrow-passage honesty row: harder, not hopeless.
    n_succ = results['narrow']['succ']
    assert 6 <= n_succ <= RUNS, n_succ

    def avg(xs):
        return sum(xs) / len(xs) if xs else float('nan')

    assert avg(results['narrow']['iters']) > 1.5 * avg(results['open']['iters'])

    print(f'contest: motion planning in three worlds, {RUNS} seeded runs each, budget 3,000 iterations; referees: exact segment geometry + dense-sampling cross-check on every edge, and A* on a unit grid for existence and length')
    print(f"  {'world':<12} {'rrt success':>12} {'avg iters':>10} {'len vs A*':>10}")
    for kind, label in (('open', 'open field'), ('bugtrap', 'bug trap'), ('narrow', 'narrow gap')):
        r0 = results[kind]
        print(f"  {label:<12} {r0['succ']:>9}/{RUNS} {avg(r0['iters']):>10.0f} {avg(r0['ratios']) if r0['ratios'] else float('nan'):>10.2f}   " + {
            'open': 'the sprint: Voronoi bias rushes the frontier into the void',
            'bugtrap': f"escapes the concavity that kills greedy (stuck at step {stuck_at})",
            'narrow': 'the honest row: thin gaps starve uniform sampling (bridge/informed variants exist for this)',
        }[kind])
    print(f"the ablation (bug trap): Voronoi-biased {results['bugtrap']['succ']}/{RUNS} successes with {100 * v_cover:.0f}% cell coverage vs random-walk growth {abl_succ}/{RUNS} with {100 * a_cover:.0f}%: same loop, bias removed, exploration collapses to diffusion")
    print(f"the referees: every tree edge exact-checked (Liang-Barsky) at build and cross-checked by dense sampling at 0.1 units; A* certifies each world solvable (optimal lengths {results['open']['ref']:.0f}/{results['bugtrap']['ref']:.0f}/{results['narrow']['ref']:.0f}); RRT paths land at {avg(all_ratios):.2f}x grid-optimal on average: feasible fast, optimal never (that is RRT*'s job)")
    print(f'OK: collision exactness on every edge of every run; A*-certified worlds with RRT success {results["open"]["succ"]}/{RUNS}, {results["bugtrap"]["succ"]}/{RUNS}, {n_succ}/{RUNS}; '
          f'path lengths within [1.0, 2.2]x of grid-optimal; the ablation collapse measured ({results["bugtrap"]["succ"]}/{RUNS} vs {abl_succ}/{RUNS}, coverage {100 * v_cover:.0f}% vs {100 * a_cover:.0f}%); '
          f'greedy dead in the trap at step {stuck_at}')
