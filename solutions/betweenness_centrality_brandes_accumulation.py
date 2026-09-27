# Puzzle 142: Betweenness centrality x Brandes accumulation
# Node importance: which vertices of a network lie on the most shortest
# paths between other vertices? Betweenness centrality is the measure:
# for every vertex v, the sum over pairs (s, t) of the fraction of
# shortest s-t paths that pass through v. Computed from its definition
# it is cubic in the vertices, or worse if the paths are enumerated.
# Brandes's algorithm (2001) is the method: one breadth-first search
# per source, counting shortest paths to every vertex as it goes, and
# then the heuristic, the accumulation: walk the vertices back in
# reverse order of distance and pass each vertex's dependency to its
# predecessors, delta(v) = sum over successors w of
# (sigma(v) / sigma(w)) (1 + delta(w)). Every source costs O(V + E),
# and no path is ever listed.
#
# Referees:
# (1) THE DEFINITION, computed independently: all-pairs breadth-first
#     distances and path counts, and for every triple (s, v, t) the
#     test d(s, v) + d(v, t) = d(s, t) with the product of path counts;
#     Brandes must agree on every vertex to 1e-9 on random graphs;
# (2) CLOSED FORMS: a path (vertex i sits on i (n - 1 - i) pairs), a
#     star (the center on (n - 1)(n - 2) / 2, leaves on 0), a complete
#     graph (all 0), and a cycle, exactly;
# (3) THE COUNT: Brandes's operations (edge relaxations plus
#     accumulation steps) against the definition's triple test, at
#     n = 60, 120, 240, with the ratio growing as n;
# (4) PATH ENUMERATION, the ablation: on a 10 x 10 grid the number of
#     shortest paths between opposite corners is C(18, 9) = 48,620,
#     enumerated and counted by a recursive walker; Brandes obtains
#     the same count from one breadth-first search in 100 vertices'
#     worth of arithmetic;
# (5) THE BRIDGE: on two dense communities joined by one edge, the
#     bridge endpoints have the highest betweenness by a measured
#     margin while degree centrality ranks them below the community
#     hubs.
import math
import random
from collections import deque

SEED = 20260926


def brandes(adj, counter=None):
    n = len(adj)
    cb = [0.0] * n
    for s in range(n):
        stack = []
        preds = [[] for _ in range(n)]
        sigma = [0] * n
        dist = [-1] * n
        sigma[s] = 1
        dist[s] = 0
        q = deque([s])
        while q:
            v = q.popleft()
            stack.append(v)
            for w in adj[v]:
                if counter is not None:
                    counter[0] += 1
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    q.append(w)
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    preds[w].append(v)
        delta = [0.0] * n
        while stack:
            w = stack.pop()
            for v in preds[w]:
                if counter is not None:
                    counter[0] += 1
                delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s:
                cb[w] += delta[w]
    return [c / 2.0 for c in cb]                 # undirected: each pair counted twice


def by_definition(adj, counter=None):
    n = len(adj)
    dist = []
    sigma = []
    for s in range(n):
        d = [-1] * n
        sg = [0] * n
        d[s] = 0
        sg[s] = 1
        q = deque([s])
        while q:
            v = q.popleft()
            for w in adj[v]:
                if d[w] < 0:
                    d[w] = d[v] + 1
                    q.append(w)
                if d[w] == d[v] + 1:
                    sg[w] += sg[v]
        dist.append(d)
        sigma.append(sg)
    cb = [0.0] * n
    for s in range(n):
        for t in range(s + 1, n):
            if dist[s][t] < 0:
                continue
            for v in range(n):
                if counter is not None:
                    counter[0] += 1
                if v == s or v == t:
                    continue
                if dist[s][v] >= 0 and dist[v][t] >= 0 and dist[s][v] + dist[v][t] == dist[s][t]:
                    cb[v] += sigma[s][v] * sigma[v][t] / sigma[s][t]
    return cb


def random_graph(n, m, rng):
    adj = [set() for _ in range(n)]
    for v in range(1, n):                       # a random tree keeps it connected
        u = rng.randrange(v)
        adj[u].add(v)
        adj[v].add(u)
    while sum(len(a) for a in adj) // 2 < m:
        u, v = rng.randrange(n), rng.randrange(n)
        if u != v:
            adj[u].add(v)
            adj[v].add(u)
    return [sorted(a) for a in adj]


def count_corner_paths(n):
    """Enumerate every monotone lattice path from (0, 0) to (n-1, n-1)."""
    counter = [0]

    def walk(i, j):
        if i == n - 1 and j == n - 1:
            counter[0] += 1
            return
        if i < n - 1:
            walk(i + 1, j)
        if j < n - 1:
            walk(i, j + 1)
    walk(0, 0)
    return counter[0]


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: the definition on random graphs.
    worst = 0.0
    for trial in range(5):
        adj = random_graph(40, 90, rng)
        a = brandes(adj)
        b = by_definition(adj)
        worst = max(worst, max(abs(x - y) for x, y in zip(a, b)))
    assert worst < 1e-9, worst

    # Oracle 2: closed forms.
    n = 12
    path = [[j for j in (i - 1, i + 1) if 0 <= j < n] for i in range(n)]
    star = [list(range(1, n))] + [[0] for _ in range(n - 1)]
    complete = [[j for j in range(n) if j != i] for i in range(n)]
    cycle = [[(i - 1) % n, (i + 1) % n] for i in range(n)]
    bp = brandes(path)
    assert all(abs(bp[i] - i * (n - 1 - i)) < 1e-9 for i in range(n)), bp
    bs = brandes(star)
    assert abs(bs[0] - (n - 1) * (n - 2) / 2) < 1e-9 and all(abs(v) < 1e-9 for v in bs[1:]), bs
    bc = brandes(complete)
    assert all(abs(v) < 1e-9 for v in bc)
    bcy = brandes(cycle)
    assert max(bcy) - min(bcy) < 1e-9
    cycle_def = by_definition(cycle)
    assert abs(bcy[0] - cycle_def[0]) < 1e-9

    # Oracle 3: the count.
    counts = []
    for nn in (60, 120, 240):
        adj = random_graph(nn, 3 * nn, rng)
        cb_ops = [0]
        brandes(adj, cb_ops)
        def_ops = [0]
        by_definition(adj, def_ops)
        counts.append((nn, cb_ops[0], def_ops[0]))
    r1 = (counts[1][2] / counts[1][1]) / (counts[0][2] / counts[0][1])
    r2 = (counts[2][2] / counts[2][1]) / (counts[1][2] / counts[1][1])
    assert 1.6 < r1 < 2.5 and 1.6 < r2 < 2.5, (r1, r2)

    # Oracle 4: path enumeration on the grid.
    g = 10
    grid = [[] for _ in range(g * g)]
    for i in range(g):
        for j in range(g):
            for di, dj in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                if 0 <= i + di < g and 0 <= j + dj < g:
                    grid[i * g + j].append((i + di) * g + (j + dj))
    enumerated = count_corner_paths(g)
    assert enumerated == math.comb(2 * g - 2, g - 1) == 48620, enumerated
    # sigma from one BFS at the corner
    sigma = [0] * (g * g)
    dist = [-1] * (g * g)
    sigma[0] = 1
    dist[0] = 0
    q = deque([0])
    bfs_ops = 0
    while q:
        v = q.popleft()
        for w in grid[v]:
            bfs_ops += 1
            if dist[w] < 0:
                dist[w] = dist[v] + 1
                q.append(w)
            if dist[w] == dist[v] + 1:
                sigma[w] += sigma[v]
    assert sigma[g * g - 1] == enumerated

    # Oracle 5: the bridge.
    k = 15
    comm = [set() for _ in range(2 * k)]
    for side in (0, k):
        for u in range(side, side + k):
            for v in range(u + 1, side + k):
                if rng.random() < 0.6:
                    comm[u].add(v)
                    comm[v].add(u)
    hub_a, hub_b = 0, k
    for v in range(1, k):
        comm[hub_a].add(v)
        comm[v].add(hub_a)
    for v in range(k + 1, 2 * k):
        comm[hub_b].add(v)
        comm[v].add(hub_b)
    bridge_a, bridge_b = 3, k + 3
    comm[bridge_a].add(bridge_b)
    comm[bridge_b].add(bridge_a)
    comm = [sorted(a) for a in comm]
    bet = brandes(comm)
    deg = [len(a) for a in comm]
    top_bet = sorted(range(2 * k), key=lambda v: -bet[v])[:2]
    top_deg = sorted(range(2 * k), key=lambda v: -deg[v])[:2]
    assert set(top_bet) == {bridge_a, bridge_b}, top_bet
    assert set(top_deg) == {hub_a, hub_b}, top_deg
    bridge_rank_by_degree = sorted(range(2 * k), key=lambda v: -deg[v]).index(bridge_a) + 1
    margin = min(bet[bridge_a], bet[bridge_b]) / max(bet[v] for v in range(2 * k) if v not in (bridge_a, bridge_b))

    print('contest: betweenness centrality; referee: the definition by all-pairs distances and path counts, and closed forms on a path, a star, a complete graph, and a cycle')
    print(f"  {'graph':<28} {'Brandes ops':>12} {'definition ops':>15} {'ratio':>7}   verdict")
    for nn, cbo, dfo in counts:
        print(f'  {f"random, n = {nn}, m = {3 * nn}":<28} {cbo:>12,} {dfo:>15,} {dfo / cbo:>7.1f}   one BFS and one accumulation per source vs a triple test per pair')
    print(f'random graphs (5 x n = 40): worst disagreement with the definition {worst:.1e}; closed forms exact on the path, star, complete graph, and cycle of {n}')
    print(f'the 10 x 10 grid: {enumerated:,} shortest corner-to-corner paths enumerated one by one; one breadth-first search counted the same {sigma[g * g - 1]:,} in {bfs_ops} edge visits')
    print(f'two communities of {k} joined by one edge: betweenness ranks the bridge endpoints {top_bet} first by a margin of {margin:.1f}x over every other vertex; degree ranks them {bridge_rank_by_degree}th and the hubs {top_deg} first')
    print(f'OK: Brandes agreed with the definition to {worst:.0e} on random graphs and exactly on four closed forms; its work fell from {counts[0][2] / counts[0][1]:.0f}x to {counts[2][2] / counts[2][1]:.0f}x below the definition as n grew from 60 to 240; '
          f'the grid path count {enumerated:,} came from one BFS; the bridge endpoints topped betweenness by {margin:.1f}x while degree put them {bridge_rank_by_degree}th')
