"""Lee maze routing x Breadth-first wave expansion: Lee's 1961 wave router
held to an independent shortest-path referee, to a connectivity oracle, to
A*, Hadlock, and Soukup on the same grids, to multi-net completion by net
ordering with rip-up and reroute, to Akers's two-bit coding, and to a
greedy straight-line router as the negative example.

Detailed routing on a grid: connect a source pin to a target pin with a
path of free cells, around obstacles and around the nets already routed.
Lee (1961): expand a breadth-first wave from the source, labeling every
reached cell with its distance, until the wave reaches the target; then
retrace from the target through labels D-1, D-2, ..., 0. The wave is a
shortest-path proof (every label is exact) and the search is complete (a
path is found whenever one exists), at the price of labeling, in the worst
case, the whole grid.

Oracles: a second breadth-first search from the target (the shortest grid
distance, computed independently) must equal every Lee path length; every
path must be valid (adjacent cells, no obstacle, no repeat); a flood fill
decides connectivity and Lee must succeed exactly when it says connected;
A* (Manhattan heuristic) and Hadlock (detour numbers, a 0-1 breadth-first
search) must return the same lengths with fewer labeled cells; Soukup's
line probe need not; Akers's two-bit coding must retrace the same length.

Author correction: the first rip-up scheme sent every ripped-up net to the
back of the queue and hoped; on the first run it completed fewer nets than
plain short-first ordering (16.8 against 18.8 of 40), because the victims
often failed to reroute around the net that displaced them. The scheme
now reroutes the victims at once and rolls the whole move back when it
would leave fewer nets routed, which is what makes rip-up a net gain
(21.1 against 19.2 of 40 on the final grids).
"""
import heapq
import random
import time
from collections import deque

DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def neighbors(n, blocked, cell):
    r, c = cell
    for dr, dc in DIRS:
        q = (r + dr, c + dc)
        if 0 <= q[0] < n and 0 <= q[1] < n and q not in blocked:
            yield q


def make_grid(rng, n, density, walls, seal=0.0):
    """Random obstacle cells plus straight walls, each with one gap that is
    sealed with probability seal (to make unreachable targets)."""
    blocked = {(r, c) for r in range(n) for c in range(n) if rng.random() < density}
    for _ in range(walls):
        gap = rng.randrange(n) if rng.random() >= seal else -1
        line, horizontal = rng.randrange(2, n - 2), rng.random() < 0.5
        for k in range(n):
            if k != gap:
                blocked.add((line, k) if horizontal else (k, line))
    return blocked


def free_cell(rng, n, blocked, avoid=()):
    while True:
        p = (rng.randrange(n), rng.randrange(n))
        if p not in blocked and p not in avoid:
            return p


def lee_route(n, blocked, src, dst):
    """Wave expansion from src; every labeled cell holds its exact distance.
    Returns (path or None, labeled cell count)."""
    label = {src: 0}
    frontier = [src]
    d = 0
    found = src == dst
    while frontier and not found:
        d += 1
        nxt = []
        for cell in frontier:
            for q in neighbors(n, blocked, cell):
                if q not in label:
                    label[q] = d
                    nxt.append(q)
                    if q == dst:
                        found = True
        frontier = nxt
    if not found:
        return None, len(label)
    path, cur, prev = [dst], dst, None
    while cur != src:  # follow labels D-1, D-2, ...; keep going straight when possible
        best = None
        for dr, dc in DIRS:
            q = (cur[0] + dr, cur[1] + dc)
            if label.get(q) == label[cur] - 1 and (best is None or (dr, dc) == prev):
                best, prev = q, (dr, dc)
        cur = best
        path.append(cur)
    return path[::-1], len(label)


def akers_code(d):
    return 1 + (d // 2) % 2  # 1, 1, 2, 2, 1, 1, 2, 2, ...


def lee_route_akers(n, blocked, src, dst):
    """The same wave, storing only Akers's two-bit code per cell. The retrace
    knows the wave count D and asks for code(D-1), code(D-2), ...: codes two
    steps apart always differ, so a neighbor with the wanted code is at the
    wanted distance."""
    code = {src: akers_code(0)}
    frontier, d, found = [src], 0, src == dst
    while frontier and not found:
        d += 1
        nxt, cd = [], akers_code(d)
        for cell in frontier:
            for q in neighbors(n, blocked, cell):
                if q not in code:
                    code[q] = cd
                    nxt.append(q)
                    if q == dst:
                        found = True
        frontier = nxt
    if not found:
        return None
    path, cur, k = [dst], dst, d
    while cur != src:
        want = akers_code(k - 1)
        cur = next(q for q in neighbors(n, blocked, cur) if code.get(q) == want)
        k -= 1
        path.append(cur)
    return path[::-1]


def bfs_distances(n, blocked, start):
    dist = {start: 0}
    dq = deque([start])
    while dq:
        cur = dq.popleft()
        for q in neighbors(n, blocked, cur):
            if q not in dist:
                dist[q] = dist[cur] + 1
                dq.append(q)
    return dist


def astar_route(n, blocked, src, dst):
    """A* with the Manhattan heuristic (consistent, so the first pop of dst is
    optimal). Returns (path, expansions, peak labeled cells)."""
    g, parent, closed = {src: 0}, {}, set()
    heap, expansions = [(manhattan(src, dst), 0, src)], 0
    while heap:
        _, gc, cur = heapq.heappop(heap)
        if cur in closed:
            continue
        closed.add(cur)
        expansions += 1
        if cur == dst:
            break
        for q in neighbors(n, blocked, cur):
            if gc + 1 < g.get(q, 1 << 30):
                g[q] = gc + 1
                parent[q] = cur
                heapq.heappush(heap, (gc + 1 + manhattan(q, dst), gc + 1, q))
    if dst not in closed:
        return None, expansions, len(g)
    path, cur = [dst], dst
    while cur != src:
        cur = parent[cur]
        path.append(cur)
    return path[::-1], expansions, len(g)


def hadlock_route(n, blocked, src, dst):
    """Hadlock's detour numbers: a step toward the target costs 0, a step away
    costs 1 (a 0-1 breadth-first search). Length = Manhattan + 2 x detours."""
    det, parent, dq = {src: 0}, {}, deque([src])
    while dq:
        cur = dq.popleft()
        if cur == dst:
            break
        for q in neighbors(n, blocked, cur):
            step = 0 if manhattan(q, dst) < manhattan(cur, dst) else 1
            if det[cur] + step < det.get(q, 1 << 30):
                det[q] = det[cur] + step
                parent[q] = cur
                (dq.appendleft if step == 0 else dq.append)(q)
    if dst not in det:
        return None, len(det)
    path, cur = [dst], dst
    while cur != src:
        cur = parent[cur]
        path.append(cur)
    assert len(path) - 1 == manhattan(src, dst) + 2 * det[dst]
    return path[::-1], len(det)


def soukup_route(n, blocked, src, dst):
    """Soukup's line probe: run straight toward the target while that reduces
    the Manhattan distance; when stuck, expand a breadth-first wave out of
    every visited cell until some cell is nearer than the stuck one, then
    probe again. Complete, not shortest. Returns (path, visited cells)."""
    parent, visited, cur = {src: None}, {src}, src
    while cur != dst:
        moved = True
        while moved and cur != dst:
            moved = False
            dr = (dst[0] > cur[0]) - (dst[0] < cur[0])
            dc = (dst[1] > cur[1]) - (dst[1] < cur[1])
            for step in sorted([(dr, 0), (0, dc)], key=lambda s: -abs(dst[0] - cur[0]) if s[1] == 0 else -abs(dst[1] - cur[1])):
                if step == (0, 0):
                    continue
                q = (cur[0] + step[0], cur[1] + step[1])
                if 0 <= q[0] < n and 0 <= q[1] < n and q not in blocked and q not in visited and manhattan(q, dst) < manhattan(cur, dst):
                    visited.add(q)
                    parent[q] = cur
                    cur, moved = q, True
                    break
        if cur == dst:
            break
        target_d, dq, seen = manhattan(cur, dst), deque(visited), set(visited)
        escape = None
        while dq and escape is None:
            p = dq.popleft()
            for q in neighbors(n, blocked, p):
                if q not in seen:
                    seen.add(q)
                    parent[q] = p
                    visited.add(q)
                    if manhattan(q, dst) < target_d:
                        escape = q
                        break
                    dq.append(q)
        if escape is None:
            return None, len(visited)
        cur = escape
    path, cur = [dst], dst
    while cur != src:
        cur = parent[cur]
        path.append(cur)
    return path[::-1], len(visited)


def greedy_route(n, blocked, src, dst, limit):
    """The negative example: step to the unvisited free neighbor nearest the
    target, turn at obstacles, never back up. Returns (steps or None, steps)."""
    cur, visited, steps = src, {src}, 0
    while cur != dst:
        cands = [(manhattan(q, dst), q) for q in neighbors(n, blocked, cur) if q not in visited]
        if not cands or steps >= limit:
            return None, steps
        cur = min(cands)[1]
        visited.add(cur)
        steps += 1
    return steps, steps


def valid_path(n, blocked, path, src, dst):
    if path[0] != src or path[-1] != dst or len(set(path)) != len(path):
        return False
    return all(manhattan(a, b) == 1 and b not in blocked and 0 <= b[0] < n and 0 <= b[1] < n for a, b in zip(path, path[1:]))


def route_nets(n, blocked, nets, order, ripup_budget):
    """Sequential Lee routing; each routed path and every other net's pins
    block later nets. On failure, with budget left, route through the routed
    nets (true obstacles only), rip up every net the path crosses, and reroute
    the victims at once; if fewer nets end up routed than before, roll back."""
    pins = {p for a, b in nets for p in (a, b)}
    routed, ripups, failed = {}, 0, set()

    def attempt(i, through):
        a, b = nets[i]
        occupied = set() if through else {c for p in routed.values() for c in p}
        return lee_route(n, blocked | (pins - {a, b}) | occupied, a, b)[0]

    for i in order:
        path = attempt(i, False)
        if path is not None:
            routed[i] = path
            continue
        path = attempt(i, True)
        victims = [j for j, p in routed.items() if set(p) & set(path)] if path else []
        if not victims or ripups + len(victims) > ripup_budget:
            failed.add(i)
            continue
        snapshot = dict(routed)
        for j in victims:
            del routed[j]
        routed[i] = path
        for j in victims:
            p2 = attempt(j, False)
            if p2 is not None:
                routed[j] = p2
        if len(routed) < len(snapshot):
            routed = snapshot
            failed.add(i)
        else:
            ripups += len(victims)
    return len(routed), ripups


def main():
    t0 = time.time()
    rng = random.Random(20261010)
    n, trials = 60, 300

    # 1. single nets: Lee against the referee and the rivals
    agg = {k: 0 for k in ('len', 'lee', 'astar', 'apeak', 'had', 'souk', 'souk_long', 'souk_extra', 'greedy_fail', 'greedy_extra', 'greedy_ok')}
    t_lee = t_astar = 0.0
    for _ in range(trials):
        blocked = make_grid(rng, n, 0.22, 3)
        src = free_cell(rng, n, blocked)
        far = [c for c, d in bfs_distances(n, blocked, src).items() if d >= n // 2]
        if not far:
            continue
        dst = rng.choice(far)
        dist = bfs_distances(n, blocked, dst)
        t = time.perf_counter()
        path, labeled = lee_route(n, blocked, src, dst)
        t_lee += time.perf_counter() - t
        assert path is not None and valid_path(n, blocked, path, src, dst)
        assert len(path) - 1 == dist[src], 'Lee path is not shortest'
        t = time.perf_counter()
        apath, expansions, peak = astar_route(n, blocked, src, dst)
        t_astar += time.perf_counter() - t
        hpath, hlabeled = hadlock_route(n, blocked, src, dst)
        spath, svisited = soukup_route(n, blocked, src, dst)
        akers = lee_route_akers(n, blocked, src, dst)
        for p in (apath, hpath, spath, akers):
            assert p is not None and valid_path(n, blocked, p, src, dst)
        assert len(apath) == len(path) == len(hpath) == len(akers)
        assert len(spath) >= len(path)
        gsteps, _ = greedy_route(n, blocked, src, dst, 4 * n * n)
        agg['len'] += len(path) - 1
        agg['lee'] += labeled
        agg['astar'] += expansions
        agg['apeak'] += peak
        agg['had'] += hlabeled
        agg['souk'] += svisited
        agg['souk_long'] += len(spath) > len(path)
        agg['souk_extra'] += (len(spath) - len(path)) / (len(path) - 1)
        if gsteps is None:
            agg['greedy_fail'] += 1
        else:
            agg['greedy_ok'] += 1
            agg['greedy_extra'] += (gsteps - (len(path) - 1)) / (len(path) - 1)
        agg.setdefault('routed', 0)
        agg['routed'] += 1
    R = agg['routed']
    mean = lambda k: agg[k] / R
    print(f'{R} routed nets on {n} x {n} grids (22% obstacles, 3 walls), mean path {mean("len"):.1f} cells:')
    print(f'  Lee labeled {mean("lee"):,.0f} cells per net ({100 * mean("lee") / (n * n):.0f}% of the grid), {1e6 * t_lee / R:,.0f} us per net')
    print(f'  A* expanded {mean("astar"):,.0f} cells, peak labeled {mean("apeak"):,.0f}, {1e6 * t_astar / R:,.0f} us per net, same length on every net')
    print(f'  Hadlock labeled {mean("had"):,.0f} cells, same length on every net')
    print(f'  Soukup visited {mean("souk"):,.0f} cells, longer than shortest on {agg["souk_long"]} of {R} nets, {100 * mean("souk_extra"):.1f}% extra length on average')
    print(f'  greedy straight line failed on {agg["greedy_fail"]} of {R} nets; when it succeeded its path was {100 * agg["greedy_extra"] / max(agg["greedy_ok"], 1):.1f}% longer')
    assert mean('astar') < mean('lee') and mean('had') < mean('lee')

    # 2. completeness against a connectivity oracle on walled grids
    connected = disconnected = 0
    for _ in range(150):
        blocked = make_grid(rng, n, 0.15, 5, seal=0.35)
        src = free_cell(rng, n, blocked)
        dst = free_cell(rng, n, blocked, (src,))
        reach = bfs_distances(n, blocked, src)
        path, labeled = lee_route(n, blocked, src, dst)
        if dst in reach:
            connected += 1
            assert path is not None and len(path) - 1 == reach[dst]
        else:
            disconnected += 1
            assert path is None and labeled == len(reach), 'the wave must exhaust exactly the reachable region'
    print(f'completeness: {connected} connected grids all routed at the shortest length, {disconnected} disconnected grids all reported after labeling exactly the reachable region')

    # 3. multi-net routing: order and rip-up
    results = {'short first': [], 'long first': [], 'random': [], 'short first + rip-up': []}
    for _ in range(8):
        blocked = make_grid(rng, n, 0.08, 0)
        nets, used = [], set()
        for _ in range(40):
            a = free_cell(rng, n, blocked, used)
            used.add(a)
            b = free_cell(rng, n, blocked, used)
            used.add(b)
            nets.append((a, b))
        by_len = sorted(range(40), key=lambda i: manhattan(*nets[i]))
        results['short first'].append(route_nets(n, blocked, nets, by_len, 0)[0])
        results['long first'].append(route_nets(n, blocked, nets, by_len[::-1], 0)[0])
        rand_order = list(range(40))
        rng.shuffle(rand_order)
        results['random'].append(route_nets(n, blocked, nets, rand_order, 0)[0])
        results['short first + rip-up'].append(route_nets(n, blocked, nets, by_len, 40))
    rip = results['short first + rip-up']
    print('multi-net, 8 grids x 40 two-pin nets (8% obstacles), nets completed: '
          + ', '.join(f'{k} {sum(v) / 8:.1f}' for k, v in results.items() if 'rip' not in k)
          + f', short first with rip-up and reroute {sum(r[0] for r in rip) / 8:.1f} ({sum(r[1] for r in rip) / 8:.1f} rip-ups)')
    assert sum(results['short first']) >= sum(results['long first'])
    assert sum(r[0] for r in rip) >= sum(results['short first'])

    # 4. memory: labels versus two-bit codes
    bits_lee = max(1, (n * n - 1).bit_length())
    print(f'memory: Lee labels need {bits_lee} bits per cell on a {n} x {n} grid, Akers coding 2 bits, A* kept {100 * mean("apeak") / mean("lee"):.0f}% of the cells Lee labeled')

    el = time.time() - t0
    print(f'OK: Lee equals the independent shortest distance on {R} routed nets and every rival that promises the shortest length agrees; '
          f'the wave labeled {mean("lee"):,.0f} cells per net against {mean("astar"):,.0f} A* expansions and {mean("had"):,.0f} Hadlock labels; '
          f'Soukup was longer on {agg["souk_long"]} of {R}; completeness held on {connected} connected and {disconnected} disconnected grids; '
          f'short nets first completed {sum(results["short first"]) / 8:.1f} of 40 against {sum(results["long first"]) / 8:.1f} long first, '
          f'{sum(r[0] for r in rip) / 8:.1f} with rip-up; Akers two-bit retrace matched on every net; greedy failed on {agg["greedy_fail"]} of {R}; {el:.1f} s')


if __name__ == '__main__':
    main()
