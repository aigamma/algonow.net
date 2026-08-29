# Puzzle 102: Johnson's algorithm x reweighting potentials
# All-pairs shortest paths on a sparse graph with negative edges:
# the graph Dijkstra cannot touch and Floyd-Warshall solves at a
# flat n^3. Johnson's move: run ONE Bellman-Ford from a virtual
# source to learn a potential h(v) for every vertex, lift every
# edge to w'(u,v) = w(u,v) + h(u) - h(v) (provably nonnegative,
# asserted here on every edge), and then run one cheap Dijkstra
# per source on the lifted graph. Along any path the potentials
# telescope, so shortest paths are UNCHANGED: subtract them back
# out and the true distances reappear, exactly.
#
# The pairing is the point. The algorithm is Johnson's (1977):
# the orchestration: one Bellman-Ford, n Dijkstras, an exact
# un-telescope. The heuristic is the potential function itself:
# one number per vertex, learned from the graph, that tilts every
# edge nonnegative without moving any shortest path: the same
# mathematics as A*'s consistent heuristic and min-cost-flow's
# node potentials.
#
# Referees, ONE work currency (edge relaxations examined):
# (1) Floyd-Warshall recomputes every distance matrix and must
#     agree EXACTLY (integers, unreachable pairs included) on 60
#     randomized negative-edge graphs plus both contest instances;
# (2) n independent Bellman-Fords agree too (a second referee
#     that never touches a heap or a potential);
# (3) the lift is audited: w + h(u) - h(v) >= 0 on EVERY edge of
#     every graph, and the recovered distances match the referee
#     integer-for-integer (the telescoping identity, cashed out);
# (4) a planted negative cycle is DETECTED by the Bellman-Ford
#     stage and independently by Floyd-Warshall's diagonal;
# (5) the disaster is measured, not asserted: plain Dijkstra run
#     directly on negative edges gets a counted fraction of all
#     pairs WRONG: the neverUse is wrongness, not cost.
import heapq
import math
import random

SEED = 20260829
INF = math.inf


def bellman_ford(n, edges, src, counter):
    """Textbook Bellman-Ford. Returns (dist, negative_cycle?)."""
    dist = [INF] * n
    dist[src] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] is not INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        counter[0] += len(edges)
        if not changed:
            break
    for u, v, w in edges:
        counter[0] += 1
        if dist[u] is not INF and dist[u] + w < dist[v]:
            return dist, True
    return dist, False


def dijkstra(n, adj, src, counter):
    """Textbook Dijkstra (pop-finalize). Correct ONLY for w >= 0."""
    dist = [INF] * n
    dist[src] = 0
    pq = [(0, src)]
    done = [False] * n
    while pq:
        d, u = heapq.heappop(pq)
        if done[u]:
            continue
        done[u] = True
        for v, w in adj[u]:
            counter[0] += 1
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(pq, (d + w, v))
    return dist


def floyd_warshall(n, edges):
    """The referee: flat n^3 sweep. Relaxations = n^3 by construction."""
    d = [[INF] * n for _ in range(n)]
    for i in range(n):
        d[i][i] = 0
    for u, v, w in edges:
        if w < d[u][v]:
            d[u][v] = w
    for k in range(n):
        dk = d[k]
        for i in range(n):
            di = d[i]
            dik = di[k]
            if dik is INF:
                continue
            for j in range(n):
                alt = dik + dk[j]
                if alt < di[j]:
                    di[j] = alt
    return d


def johnson(n, edges, counter):
    """One Bellman-Ford, a lift, n Dijkstras, an exact un-telescope."""
    virtual = [(n, v, 0) for v in range(n)]
    h, neg = bellman_ford(n + 1, edges + virtual, n, counter)
    if neg:
        return None, h
    lifted = [[] for _ in range(n)]
    for u, v, w in edges:
        wl = w + h[u] - h[v]
        assert wl >= 0, (u, v, w, h[u], h[v])  # the theorem, on every edge
        lifted[u].append((v, wl))
    dist = []
    for s in range(n):
        ds = dijkstra(n, lifted, s, counter)
        dist.append([ds[v] - h[s] + h[v] if ds[v] is not INF else INF for v in range(n)])
    return dist, h


def random_graph(rng, n, m):
    """Negative edges, no negative cycle: weights are built from a
    hidden potential (w = base + p(u) - p(v), base >= 0), so every
    cycle's weight is the sum of its nonnegative bases. The
    generator IS the reweighting theorem run backwards."""
    p = [rng.randrange(-50, 51) for _ in range(n)]
    seen = set()
    edges = []
    while len(edges) < m:
        u, v = rng.randrange(n), rng.randrange(n)
        if u == v or (u, v) in seen:
            continue
        seen.add((u, v))
        edges.append((u, v, rng.randrange(0, 21) + p[u] - p[v]))
    return edges


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1 + 2 + 3: sixty randomized graphs, three ways, exact.
    neg_edge_total = 0
    edge_total = 0
    for trial in range(60):
        n = rng.randrange(6, 41)
        m = rng.randrange(n, 4 * n)
        edges = random_graph(rng, n, m)
        neg_edge_total += sum(1 for _, _, w in edges if w < 0)
        edge_total += len(edges)
        ref = floyd_warshall(n, edges)
        c = [0]
        got, _ = johnson(n, edges, c)
        assert got is not None
        assert got == ref, f'trial {trial}: johnson != floyd-warshall'
        bf_all = [bellman_ford(n, edges, s, c)[0] for s in range(n)]
        assert bf_all == ref, f'trial {trial}: bellman-ford != floyd-warshall'
    assert neg_edge_total > 0.15 * edge_total, (neg_edge_total, edge_total)

    # Oracle 4: a planted negative cycle is detected twice over.
    n = 12
    edges = random_graph(rng, n, 30)
    cyc = [2, 5, 7, 3]
    for a, b in zip(cyc, cyc[1:] + cyc[:1]):
        edges = [e for e in edges if (e[0], e[1]) != (a, b)]
        edges.append((a, b, -4))
    c = [0]
    got, _ = johnson(n, edges, c)
    assert got is None, 'johnson missed the planted negative cycle'
    fw = floyd_warshall(n, edges)
    assert any(fw[i][i] < 0 for i in range(n)), 'floyd-warshall diagonal missed it too'

    # Oracle 5: the disaster, measured. Plain Dijkstra on the raw
    # negative-edge graph: silently wrong, counted against truth.
    n_bad = 40
    edges_bad = random_graph(rng, n_bad, 120)
    truth = floyd_warshall(n_bad, edges_bad)
    adj_bad = [[] for _ in range(n_bad)]
    for u, v, w in edges_bad:
        adj_bad[u].append((v, w))
    wrong = 0
    reachable = 0
    for s in range(n_bad):
        c = [0]
        ds = dijkstra(n_bad, adj_bad, s, c)
        for v in range(n_bad):
            if truth[s][v] is not INF:
                reachable += 1
                if ds[v] != truth[s][v]:
                    wrong += 1
    assert wrong > 0, 'expected plain dijkstra to be wrong somewhere'
    wrong_pct = 100 * wrong / reachable

    # The contest: one graph shape, two densities, ONE currency
    # (edge relaxations examined). Floyd-Warshall's count is n^3 by
    # construction of its triple loop; Johnson and n x Bellman-Ford
    # count actual scans.
    N = 200
    rows = []
    for label, m in [('sparse, m = 4n', 800), ('dense, m = n^2/4', 10000)]:
        edges = random_graph(rng, N, m)
        ref = floyd_warshall(N, edges)
        fw_relax = N ** 3
        cj = [0]
        got, h = johnson(N, edges, cj)
        assert got == ref, f'{label}: johnson != floyd-warshall'
        cb = [0]
        bf_all = [bellman_ford(N, edges, s, cb)[0] for s in range(N)]
        assert bf_all == ref, f'{label}: n x bellman-ford != floyd-warshall'
        # the telescoping identity, cashed out on every finite pair
        for s in range(N):
            for v in range(N):
                assert (got[s][v] is INF) == (ref[s][v] is INF)
        rows.append((label, m, fw_relax, cj[0], cb[0]))

    (l1, m1, fw1, j1, b1), (l2, m2, fw2, j2, b2) = rows
    print('contest: all-pairs shortest paths with negative edges, n = 200; one currency: edge relaxations examined; referee: floyd-warshall, exact')
    print(f"  {'instance':<20} {'floyd-warshall':>15} {'johnson':>12} {'n x bellman-ford':>17}")
    print(f"  {l1:<20} {fw1:>15,} {j1:>12,} {b1:>17,}   sparse is johnson country: {fw1 / j1:.0f}x under floyd-warshall")
    print(f"  {l2:<20} {fw2:>15,} {j2:>12,} {b2:>17,}   density closes the gap to {fw2 / j2:.1f}x: floyd-warshall's tiny constant earns its keep")
    print(f"the lift, audited: every one of {m1:,} + {m2:,} contest edges (and all 60 referee graphs) nonnegative after w + h(u) - h(v); distances un-telescope integer-exact")
    print(f"the disaster, measured: plain dijkstra on raw negative edges: wrong on {wrong:,} of {reachable:,} reachable pairs ({wrong_pct:.0f}%): not slower, WRONG")
    print(f"negative cycle: planted 4-cycle at weight -4 detected by the bellman-ford stage and by floyd-warshall's own diagonal")
    print(f'OK: johnson == floyd-warshall == n x bellman-ford on 60 randomized graphs and both contest instances (exact, unreachable pairs included); '
          f'every lifted edge nonnegative; sparse dividend {fw1 / j1:.0f}x with the dense gap closing to {fw2 / j2:.1f}x, said plainly; '
          f'plain dijkstra measured wrong on {wrong_pct:.0f}% of pairs; the planted negative cycle caught twice')
