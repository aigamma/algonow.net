"""Hidden Markov map matching (Newson and Krumm 2009): Viterbi over road
candidates, emission = Gaussian in the fix's perpendicular distance to the
road, transition = exponential in |straight-line - route distance| / beta.
Oracles: the exhaustive maximum over every candidate sequence on short
traces; the hidden route each trace was generated from; beta = infinity
reproducing nearest-road snapping exactly; the score re-summed term by term.

AUTHOR CORRECTIONS. (1) The draft expected the 18 m frontage road to take
about a fifth of snapped fixes at sigma 10 (the Gaussian tail past 9 m);
measured 10.4%, because cross streets take fixes too. (2) The draft assumed
thinning would cost accuracy at every step; every second fix was flat
(0.902 against 0.894), every fourth cost three points. (3) The draft
expected snapping's position error to be far worse; it is only slightly
worse (3.5 m against 3.3 m at sigma 4). The HMM's win is the route: length
error 0.005 against 0.466.
"""
import heapq
import math
import random
import time

# ---------------------------------------------------------------- network
def build_network(rng):
    """Grid avenues 100 m apart, diagonals, two frontage roads 18 m off."""
    nodes, edges, index = [], [], {}

    def node(x, y):
        key = (round(x, 3), round(y, 3))
        if key not in index:
            index[key] = len(nodes)
            nodes.append((x, y))
        return index[key]

    def edge(a, b):
        (ax, ay), (bx, by) = nodes[a], nodes[b]
        edges.append((a, b, math.hypot(bx - ax, by - ay)))

    nx, ny = 9, 7
    grid = [[node(100.0 * i, 100.0 * j) for j in range(ny)] for i in range(nx)]
    for i in range(nx):
        for j in range(ny):
            if i + 1 < nx:
                edge(grid[i][j], grid[i + 1][j])
            if j + 1 < ny:
                edge(grid[i][j], grid[i][j + 1])
    for _ in range(8):
        i, j = rng.randrange(nx - 1), rng.randrange(ny - 1)
        edge(grid[i][j], grid[i + 1][j + 1])
    f = [node(100.0 * k, 318.0) for k in range(1, 8)]
    for k in range(6):
        edge(f[k], f[k + 1])
    edge(f[0], grid[1][3])
    edge(f[-1], grid[7][3])
    g = [node(418.0, 100.0 * k) for k in range(1, 6)]
    for k in range(4):
        edge(g[k], g[k + 1])
    edge(g[0], grid[4][1])
    edge(g[-1], grid[4][5])
    adj = [[] for _ in nodes]
    for e, (a, b, w) in enumerate(edges):
        adj[a].append((b, w, e))
        adj[b].append((a, w, e))
    avenue = [grid[k][3] for k in range(1, 8)]
    frontage = set(range(len(edges) - 12, len(edges) - 6))
    return nodes, edges, adj, avenue, frontage


def all_pairs(nodes, adj):
    table = []
    for s in range(len(nodes)):
        dist = [math.inf] * len(nodes)
        dist[s] = 0.0
        heap = [(0.0, s)]
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist[u]:
                continue
            for v, w, _ in adj[u]:
                if d + w < dist[v]:
                    dist[v] = d + w
                    heapq.heappush(heap, (dist[v], v))
        table.append(dist)
    return table, len(nodes)


# ----------------------------------------------------------------- geometry
def project(p, nodes, edge):
    a, b, length = edge
    (ax, ay), (bx, by) = nodes[a], nodes[b]
    dx, dy = bx - ax, by - ay
    u = ((p[0] - ax) * dx + (p[1] - ay) * dy) / (length * length)
    u = min(1.0, max(0.0, u))
    return math.hypot(p[0] - ax - u * dx, p[1] - ay - u * dy), u


def point_at(nodes, edges, e, u):
    a, b, _ = edges[e]
    return (nodes[a][0] + u * (nodes[b][0] - nodes[a][0]), nodes[a][1] + u * (nodes[b][1] - nodes[a][1]))


def route_distance(c1, c2, edges, D):
    (e1, u1), (e2, u2) = c1, c2
    a1, b1, l1 = edges[e1]
    a2, b2, l2 = edges[e2]
    if e1 == e2:
        return abs(u1 - u2) * l1
    best = math.inf
    for n1, d1 in ((a1, u1 * l1), (b1, (1 - u1) * l1)):
        for n2, d2 in ((a2, u2 * l2), (b2, (1 - u2) * l2)):
            best = min(best, d1 + D[n1][n2] + d2)
    return best


# ------------------------------------------------------------------ traces
def random_route(rng, adj, length, start=None):
    while True:
        u = start if start is not None else rng.randrange(len(adj))
        seen, path = {u}, []
        for _ in range(length):
            options = [(v, e) for v, _, e in adj[u] if v not in seen]
            if not options:
                break
            v, e = rng.choice(options)
            path.append((e, u, v))
            seen.add(v)
            u = v
        if len(path) == length:
            return path


def observe(rng, route, nodes, edges, spacing, sigma):
    fixes, s, acc = [], spacing * 0.5, 0.0
    for e, a, b in route:
        length = edges[e][2]
        while s < acc + length:
            t = (s - acc) / length
            x = nodes[a][0] + t * (nodes[b][0] - nodes[a][0])
            y = nodes[a][1] + t * (nodes[b][1] - nodes[a][1])
            u = t if edges[e][0] == a else 1 - t
            fixes.append(((x + rng.gauss(0, sigma), y + rng.gauss(0, sigma)), (e, u)))
            s += spacing
        acc += length
    return fixes


# ------------------------------------------------------------------- model
def candidates(fix, nodes, edges, radius):
    out = []
    for e, edge in enumerate(edges):
        d, u = project(fix, nodes, edge)
        if d <= radius:
            out.append((e, u, d))
    return out


def score_path(path, fixes, cands, sigma, beta, edges, D):
    total, prev = 0.0, None
    for t, ci in enumerate(path):
        e, u, d = cands[t][ci]
        total += -0.5 * (d / sigma) ** 2
        if prev is not None:
            pe, pu, _ = cands[t - 1][prev]
            gc = math.dist(fixes[t - 1][0], fixes[t][0])
            total += -abs(gc - route_distance((pe, pu), (e, u), edges, D)) / beta
        prev = ci
    return total


def viterbi(fixes, cands, sigma, beta, edges, D):
    T = len(fixes)
    score = [-0.5 * (d / sigma) ** 2 for _, _, d in cands[0]]
    back, lattice = [], 0
    for t in range(1, T):
        gc = math.dist(fixes[t - 1][0], fixes[t][0])
        new, bp = [], []
        for e, u, d in cands[t]:
            best, arg = -math.inf, -1
            for i, (pe, pu, _) in enumerate(cands[t - 1]):
                tr = 0.0 if beta == math.inf else -abs(gc - route_distance((pe, pu), (e, u), edges, D)) / beta
                if score[i] + tr > best:
                    best, arg = score[i] + tr, i
            new.append(best - 0.5 * (d / sigma) ** 2)
            bp.append(arg)
            lattice += len(cands[t - 1])
        score, back = new, back + [bp]
    j = max(range(len(score)), key=score.__getitem__)
    path = [j]
    for bp in reversed(back):
        j = bp[j]
        path.append(j)
    path.reverse()
    return path, max(score), lattice


def brute_force(fixes, cands, sigma, beta, edges, D):
    best, arg, count = -math.inf, None, 0

    def rec(t, path, acc):
        nonlocal best, arg, count
        if t == len(fixes):
            count += 1
            if acc > best:
                best, arg = acc, list(path)
            return
        gc = math.dist(fixes[t - 1][0], fixes[t][0]) if t else 0.0
        for ci, (e, u, d) in enumerate(cands[t]):
            term = -0.5 * (d / sigma) ** 2
            if t:
                pe, pu, _ = cands[t - 1][path[-1]]
                term += -abs(gc - route_distance((pe, pu), (e, u), edges, D)) / beta
            path.append(ci)
            rec(t + 1, path, acc + term)
            path.pop()

    rec(0, [], 0.0)
    return arg, best, count


def estimate_beta(traces, edges, D):
    # Newson-Krumm: median |straight-line - route| over true pairs / ln 2
    diffs = []
    for fixes in traces:
        for t in range(1, len(fixes)):
            gc = math.dist(fixes[t - 1][0], fixes[t][0])
            diffs.append(abs(gc - route_distance(fixes[t - 1][1], fixes[t][1], edges, D)))
    diffs.sort()
    return diffs[len(diffs) // 2] / math.log(2)


def matched_edges(path, cands):
    return [cands[t][ci][0] for t, ci in enumerate(path)]


# -------------------------------------------------------------------- main
def main():
    t0 = time.time()
    rng = random.Random(20261010)
    nodes, edges, adj, avenue, frontage = build_network(rng)
    D, dijkstra_calls = all_pairs(nodes, adj)
    relax = sum(len(a) for a in adj) * len(nodes)
    print(f"network: {len(nodes)} nodes, {len(edges)} segments; {dijkstra_calls} Dijkstra runs fill the route table")

    # (a) Viterbi equals the exhaustive maximum on short traces
    checked = paths_total = 0
    for k in range(40):
        route = random_route(rng, adj, 4)
        fixes = observe(rng, route, nodes, edges, 45.0, 8.0)[:6]
        cands = [candidates(f, nodes, edges, 45.0) for f, _ in fixes]
        if min(len(c) for c in cands) == 0:
            continue
        v_path, v_score, _ = viterbi(fixes, cands, 8.0, 6.0, edges, D)
        b_path, b_score, count = brute_force(fixes, cands, 8.0, 6.0, edges, D)
        assert abs(v_score - b_score) < 1e-9 and v_path == b_path, (v_path, b_path)
        assert abs(score_path(v_path, fixes, cands, 8.0, 6.0, edges, D) - v_score) < 1e-9
        checked += 1
        paths_total += count
    print(f"(a) Viterbi equals the exhaustive maximum on {checked} short traces ({paths_total:,} sequences)")

    # (b) accuracy against the hidden route, HMM against snapping, by noise
    print("(b) sigma  radius  beta   cand/fix  HMM acc  snap acc  HMM len err  snap len err  HMM pos m  snap pos m")
    results = {}
    for sigma in (4.0, 8.0, 12.0, 20.0):
        radius = 25.0 + 3.0 * sigma
        traces = [observe(rng, random_route(rng, adj, 14), nodes, edges, 35.0, sigma) for _ in range(30)]
        beta = estimate_beta(traces[:10], edges, D)
        hits = snaps = total = 0
        herr = serr = hpos = spos = 0.0
        ncand = nfix = 0
        for fixes in traces[10:]:
            cands = [candidates(f, nodes, edges, radius) for f, _ in fixes]
            if min(len(c) for c in cands) == 0:
                continue
            path, _, _ = viterbi(fixes, cands, sigma, beta, edges, D)
            snap, _, _ = viterbi(fixes, cands, sigma, math.inf, edges, D)
            truth = [tr[0] for _, tr in fixes]
            hmm_e, snap_e = matched_edges(path, cands), matched_edges(snap, cands)
            hits += sum(a == b for a, b in zip(hmm_e, truth))
            snaps += sum(a == b for a, b in zip(snap_e, truth))
            total += len(fixes)
            true_len = sum(route_distance(fixes[t - 1][1], fixes[t][1], edges, D) for t in range(1, len(fixes)))
            for p, bucket in ((path, 'h'), (snap, 's')):
                pts = [(cands[t][ci][0], cands[t][ci][1]) for t, ci in enumerate(p)]
                length = sum(route_distance(pts[t - 1], pts[t], edges, D) for t in range(1, len(pts)))
                pos = sum(math.dist(point_at(nodes, edges, *pts[t]), point_at(nodes, edges, *fixes[t][1])) for t in range(len(pts)))
                if bucket == 'h':
                    herr += abs(length - true_len) / true_len
                    hpos += pos
                else:
                    serr += abs(length - true_len) / true_len
                    spos += pos
            ncand += sum(len(c) for c in cands)
            nfix += len(fixes)
        n = len(traces) - 10
        results[sigma] = (hits / total, snaps / total, herr / n, serr / n, ncand / nfix, beta, hpos / total, spos / total)
        print(f"    {sigma:4.0f}   {radius:5.0f}  {beta:5.2f}   {ncand / nfix:6.2f}   "
              f"{hits / total:6.3f}   {snaps / total:6.3f}      {herr / n:6.3f}       {serr / n:6.3f}     "
              f"{hpos / total:6.1f}     {spos / total:6.1f}")
    for sigma, (h, s, he, se, _, _, hp, sp) in results.items():
        assert h >= s - 1e-12 and he <= se + 1e-12 and hp <= sp + 1e-12, sigma
    assert results[4.0][0] > 0.95 and results[20.0][0] > results[20.0][1] + 0.05

    # (c) beta -> infinity is snapping; the frontage road fools snapping only
    flips_snap = flips_hmm = n_fix = 0
    for _ in range(40):
        route = [(next(e for v, _, e in adj[avenue[k]] if v == avenue[k + 1]), avenue[k], avenue[k + 1]) for k in range(6)]
        fixes = observe(rng, route, nodes, edges, 30.0, 10.0)
        cands = [candidates(f, nodes, edges, 55.0) for f, _ in fixes]
        path, _, _ = viterbi(fixes, cands, 10.0, results[8.0][5], edges, D)
        snap, _, _ = viterbi(fixes, cands, 10.0, math.inf, edges, D)
        nearest = [min(range(len(c)), key=lambda i: c[i][2]) for c in cands]
        assert snap == nearest
        flips_snap += sum(e in frontage for e in matched_edges(snap, cands))
        flips_hmm += sum(e in frontage for e in matched_edges(path, cands))
        n_fix += len(fixes)
    print(f"(c) beta = infinity is snapping on every fix; avenue with an 18 m frontage road, sigma 10: "
          f"snapping put {flips_snap} of {n_fix} fixes ({100 * flips_snap / n_fix:.1f}%) on it, the HMM {flips_hmm}")
    assert 0.05 < flips_snap / n_fix < 0.40 and flips_hmm <= 0.01 * n_fix

    # (d) thinning the trace
    print("(d) keep every k-th fix at sigma 8:  k   fixes/trace   HMM acc   snap acc")
    thin = {}
    for k in (1, 2, 4):
        hits = snaps = total = 0
        for _ in range(25):
            fixes = observe(rng, random_route(rng, adj, 14), nodes, edges, 35.0, 8.0)[::k]
            cands = [candidates(f, nodes, edges, 49.0) for f, _ in fixes]
            if min(len(c) for c in cands) == 0:
                continue
            path, _, _ = viterbi(fixes, cands, 8.0, results[8.0][5], edges, D)
            snap, _, _ = viterbi(fixes, cands, 8.0, math.inf, edges, D)
            truth = [tr[0] for _, tr in fixes]
            hits += sum(a == b for a, b in zip(matched_edges(path, cands), truth))
            snaps += sum(a == b for a, b in zip(matched_edges(snap, cands), truth))
            total += len(fixes)
        thin[k] = (hits / total, snaps / total, total / 25)
        print(f"    {k}   {total / 25:6.1f}        {hits / total:6.3f}    {snaps / total:6.3f}")
    assert thin[4][0] > thin[4][1]

    # (e) cost of one full trace
    fixes = observe(rng, random_route(rng, adj, 14), nodes, edges, 35.0, 8.0)
    cands = [candidates(f, nodes, edges, 49.0) for f, _ in fixes]
    path, score, lattice = viterbi(fixes, cands, 8.0, results[8.0][5], edges, D)
    assert abs(score_path(path, fixes, cands, 8.0, results[8.0][5], edges, D) - score) < 1e-9
    sequences = 1
    for c in cands:
        sequences *= len(c)
    print(f"(e) one trace of {len(fixes)} fixes: {sum(len(c) for c in cands)} candidates, {lattice:,} lattice "
          f"edges against {sequences:.2e} sequences; {dijkstra_calls} Dijkstra runs, {relax:,} relaxations")

    elapsed = time.time() - t0
    s4, s20 = results[4.0], results[20.0]
    print(f"OK: Viterbi equals the exhaustive maximum on {checked} traces ({paths_total:,} sequences); "
          f"HMM accuracy {s4[0]:.3f} at sigma 4 and {s20[0]:.3f} at sigma 20 against snapping "
          f"{s4[1]:.3f} and {s20[1]:.3f}, position error {s20[6]:.1f} m against {s20[7]:.1f} m and route "
          f"length error {s20[2]:.3f} against {s20[3]:.3f}; "
          f"the frontage road took {100 * flips_snap / n_fix:.1f}% of snapped fixes and "
          f"{flips_hmm} HMM fixes; beta = infinity is snapping exactly; every fourth fix still "
          f"gives {thin[4][0]:.3f} against {thin[4][1]:.3f}; {lattice:,} lattice edges against "
          f"{sequences:.1e} sequences; {elapsed:.1f} s")


if __name__ == "__main__":
    main()
