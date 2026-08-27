# Puzzle 50: Floyd-Warshall x intermediate-vertex sweep
# Shortest paths between ALL pairs of vertices, negative edges welcome,
# negative cycles detected, in three lines of loop: with the famous
# loop-order bug measured, and its stranger redemption measured too.
#
# The pairing is the point. The algorithm is dynamic programming over
# an unusual dimension: not path length, but WHICH vertices may serve
# as intermediates. After processing k, dist[i][j] is exact for all
# paths whose interior stops lie in {0..k}. The heuristic is the sweep
# that makes it three lines: relax through ONE new intermediate at a
# time, in place, k outermost. Put k innermost (the classic bug) and
# the invariant dies: measured wrong on most random graphs: yet
# repeating that wrong loop three times over heals it, a known oddity
# this file confirms on every trial. Referees: per-source Bellman-Ford
# (negative-safe), BFS reachability for the transitive-closure reading,
# and reconstructed paths re-priced edge by edge.
import random

INF = float("inf")


def floyd_warshall(n, w, counter=None):
    """w: dict (u,v)->weight. Returns (dist, nxt) with path
    reconstruction; dist[i][i] < 0 signals a negative cycle."""
    dist = [[INF] * n for _ in range(n)]
    nxt = [[None] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for (u, v), wt in w.items():
        if wt < dist[u][v]:
            dist[u][v] = wt
            nxt[u][v] = v
    for k in range(n):
        dk = dist[k]
        for i in range(n):
            dik = dist[i][k]
            if dik == INF:
                continue
            di = dist[i]
            for j in range(n):
                if counter is not None:
                    counter["ops"] = counter.get("ops", 0) + 1
                alt = dik + dk[j]
                if alt < di[j]:
                    di[j] = alt
                    nxt[i][j] = nxt[i][k]
    return dist, nxt


def floyd_warshall_wrong(n, w, passes=1):
    """The classic bug: k INNERMOST. One pass is wrong; three passes
    over the wrong loop famously repair it."""
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for (u, v), wt in w.items():
        dist[u][v] = min(dist[u][v], wt)
    for _ in range(passes):
        for i in range(n):
            for j in range(n):
                for k in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
    return dist


def bellman_ford_from(n, edges, src):
    dist = [INF] * n
    dist[src] = 0
    for _ in range(n - 1):
        changed = False
        for (u, v, wt) in edges:
            if dist[u] + wt < dist[v]:
                dist[v] = dist[u] + wt
                changed = True
        if not changed:
            break
    return dist


def dijkstra_from(n, adj, src, counter=None):
    import heapq

    dist = [INF] * n
    dist[src] = 0
    pq = [(0, src)]
    done = [False] * n
    while pq:
        d, u = heapq.heappop(pq)
        if done[u]:
            continue
        done[u] = True
        for (v, wt) in adj[u]:
            if counter is not None:
                counter["ops"] = counter.get("ops", 0) + 1
            if not done[v] and d + wt < dist[v]:
                dist[v] = d + wt
                heapq.heappush(pq, (d + wt, v))
    return dist


def johnson(n, w, counter=None):
    """Bellman-Ford once for potentials, then n Dijkstras on the
    reweighted (nonnegative) graph."""
    edges = [(u, v, wt) for (u, v), wt in w.items()]
    aug = edges + [(n, v, 0) for v in range(n)]
    h = bellman_ford_from(n + 1, aug, n)
    if counter is not None:
        counter["ops"] = counter.get("ops", 0) + len(aug) * (n)  # BF bill, upper
    adj = [[] for _ in range(n)]
    for (u, v, wt) in edges:
        adj[u].append((v, wt + h[u] - h[v]))
    dist = []
    for s in range(n):
        ds = dijkstra_from(n, adj, s, counter)
        dist.append([d - h[s] + h[v] if d < INF else INF for v, d in enumerate(ds)])
    return dist


def rand_graph(rng, n, m, negatives=True):
    """Potential construction: negative edges, no negative cycles."""
    phi = [rng.randint(-30, 30) for _ in range(n)]
    w = {}
    while len(w) < m:
        u, v = rng.randrange(n), rng.randrange(n)
        if u != v and (u, v) not in w:
            noise = rng.randint(0, 15) if negatives else rng.randint(1, 15)
            w[(u, v)] = (phi[v] - phi[u] + noise) if negatives else noise
    return w


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 200 trials against per-source Bellman-Ford, negative
    # edges included; plus the transitive-closure reading vs BFS.
    from collections import deque

    for trial in range(200):
        n = rng.randint(2, 40)
        m = rng.randint(1, min(n * (n - 1), 4 * n))
        w = rand_graph(rng, n, m)
        edges = [(u, v, wt) for (u, v), wt in w.items()]
        dist, nxt = floyd_warshall(n, w)
        for s in range(n):
            assert dist[s] == bellman_ford_from(n, edges, s), (n, s)
        # Reachability: dist finite iff BFS reaches.
        adj = [[] for _ in range(n)]
        for (u, v), _ in w.items():
            adj[u].append(v)
        for s in range(0, n, max(1, n // 5)):
            seen = {s}
            q = deque([s])
            while q:
                u = q.popleft()
                for v in adj[u]:
                    if v not in seen:
                        seen.add(v)
                        q.append(v)
            for t in range(n):
                assert (dist[s][t] < INF) == (t in seen)

    # Oracle 2: path reconstruction re-priced edge by edge.
    n = 60
    w = rand_graph(rng, n, 500)
    dist, nxt = floyd_warshall(n, w)
    checked = 0
    for _ in range(300):
        s, t = rng.randrange(n), rng.randrange(n)
        if dist[s][t] == INF or s == t:
            continue
        path = [s]
        while path[-1] != t:
            path.append(nxt[path[-1]][t])
            assert len(path) <= n + 1  # no cycles in a shortest path
        total = sum(w[(a, b)] for a, b in zip(path, path[1:]))
        assert total == dist[s][t]
        checked += 1
    assert checked > 200

    # Oracle 3: the loop-order bug, measured: and its 3-pass redemption.
    wrong_once = 0
    for _ in range(60):
        n2 = rng.randint(4, 16)
        w2 = rand_graph(rng, n2, rng.randint(n2, 3 * n2))
        good, _ = floyd_warshall(n2, w2)
        bad1 = floyd_warshall_wrong(n2, w2, passes=1)
        bad3 = floyd_warshall_wrong(n2, w2, passes=3)
        if bad1 != good:
            wrong_once += 1
        assert bad3 == good  # the strange healing, every time
    assert wrong_once > 20  # the one-pass bug is common, not exotic

    # Oracle 4: negative-cycle detection via the diagonal.
    n3 = 30
    w3 = rand_graph(rng, n3, 200)
    d3, _ = floyd_warshall(n3, w3)
    assert all(d3[i][i] == 0 for i in range(n3))
    w3[(5, 17)] = -50
    w3[(17, 9)] = -50
    w3[(9, 5)] = -50
    d3b, _ = floyd_warshall(n3, w3)
    assert any(d3b[i][i] < 0 for i in (5, 17, 9))

    # Oracle 5: the two-terrain ledger at n = 200.
    import time

    N = 200
    results = {}
    for terrain, m in (("dense", N * (N - 1) // 2), ("sparse", 800)):
        w_t = rand_graph(rng, N, m)
        c_fw = {}
        t0 = time.perf_counter()
        d_fw, _ = floyd_warshall(N, w_t, c_fw)
        t_fw = time.perf_counter() - t0
        c_jn = {}
        t0 = time.perf_counter()
        d_jn = johnson(N, w_t, c_jn)
        t_jn = time.perf_counter() - t0
        assert d_jn == d_fw  # mutual referee at scale
        results[terrain] = (c_fw["ops"], t_fw, c_jn["ops"], t_jn, m)

    print(f"contest: all-pairs shortest paths at n = {N}, two terrains; referees: per-source Bellman-Ford on 200 small trials, and Johnson agreeing with Floyd-Warshall exactly at scale")
    print(f"  {'method':<22} {'dense ops':>12} {'s':>6} {'sparse ops':>12} {'s':>6}")
    fw = results["dense"], results["sparse"]
    print(f"  {'Floyd-Warshall':<22} {fw[0][0]:>12,} {fw[0][1]:>6.2f} {fw[1][0]:>12,} {fw[1][1]:>6.2f}   n^3 regardless: dense strength, sparse vice")
    print(f"  {'Johnson (BF + Dijkstra)':<22} {fw[0][2]:>12,} {fw[0][3]:>6.2f} {fw[1][2]:>12,} {fw[1][3]:>6.2f}   scales with m: the sparse winner")
    print(f"the loop-order bug, measured: k-innermost was wrong on {wrong_once}/60 random graphs: and running the WRONG loop 3 times healed it on all 60 (a known oddity, confirmed)")
    print("negative cycles: a planted 3-cycle drove the diagonal negative (detected); clean graphs kept dist[i][i] = 0 everywhere")
    print("paths: 200+ reconstructed routes re-priced edge by edge, every total equal to its matrix entry")
    print("OK: 200 Bellman-Ford-refereed trials with negative edges, reachability matching BFS, reconstruction exact, the bug and its 3-pass healing both measured, cycles detected on the diagonal, and Johnson agreeing with the sweep on both terrains at n=200")
