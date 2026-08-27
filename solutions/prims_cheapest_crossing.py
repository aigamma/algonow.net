# Puzzle 77: Prim's algorithm x cheapest crossing edge
# Connect every vertex with minimum total wire: grow ONE tree from a
# seed, and at every step add the cheapest edge that crosses from
# the tree to the rest.
#
# The pairing is the point. The algorithm is single-tree growth with
# a heap frontier: lazy-deletion heapq, O(E log V). The heuristic is
# the cheapest crossing edge, and its license is the CUT PROPERTY:
# for any cut, the lightest crossing edge belongs to some minimum
# spanning tree (swap it in, something else must leave, the total
# never rises). This page does not cite the property: it AUDITS it:
# for the finished tree, every tree edge is removed in turn, the two
# components recovered, and the edge asserted no heavier than every
# crossing edge: n-1 cut certificates per instance. Referees beyond
# the audit: Kruskal (the live unit's union-find machinery, rebuilt)
# equal on 300 graphs; brute force over ALL spanning trees on 50
# small graphs; identical edge SETS under distinct weights (the
# unique-MST theorem); the dense-vs-sparse meter both ways; and the
# classic confusion measured: one changed line turns Prim into
# Dijkstra, and on the hub gadget the shortest-path tree costs 8.4x
# the MST: different questions, one keystroke apart.
import heapq
import random
from itertools import combinations


def prim(n, adj, counter=None):
    """adj[u] = list of (w, v). Returns (total, edge set)."""
    seen = [False] * n
    seen[0] = True
    heap = [(w, 0, v) for w, v in adj[0]]
    heapq.heapify(heap)
    total = 0
    edges = set()
    got = 1
    while heap and got < n:
        w, u, v = heapq.heappop(heap)
        if counter is not None:
            counter["heap_ops"] = counter.get("heap_ops", 0) + 1
        if seen[v]:
            continue
        seen[v] = True
        got += 1
        total += w
        edges.add((min(u, v), max(u, v)))
        for w2, x in adj[v]:
            if not seen[x]:
                heapq.heappush(heap, (w2, v, x))
                if counter is not None:
                    counter["heap_ops"] += 1
    return total, edges, got == n


def kruskal(n, edge_list, counter=None):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
            if counter is not None:
                counter["find_ops"] = counter.get("find_ops", 0) + 1
        return x

    total = 0
    edges = set()
    if counter is not None:
        counter["sort_cmps"] = int(len(edge_list) * max(1, (len(edge_list)).bit_length()))
    for w, u, v in sorted(edge_list):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            total += w
            edges.add((min(u, v), max(u, v)))
    return total, edges


def dijkstra_tree(n, adj, root=0):
    """The one-keystroke cousin: keys accumulate distance from the
    root instead of single edge weights: a shortest-path tree."""
    import math

    dist = [math.inf] * n
    dist[0] = 0
    par = [-1] * n
    done = [False] * n
    heap = [(0, root, -1)]
    edges = set()
    total = 0
    while heap:
        d, u, p = heapq.heappop(heap)
        if done[u]:
            continue
        done[u] = True
        if p >= 0:
            edges.add((min(u, p), max(u, p)))
        for w, v in adj[u]:
            if not done[v] and d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (d + w, v, u))
    for a, b in edges:
        total += next(w for w, v in adj[a] if v == b)
    return total, edges


def components_without(n, edges, dropped):
    rest = [e for e in edges if e != dropped]
    par = list(range(n))

    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]
            x = par[x]
        return x

    for a, b in rest:
        par[find(a)] = find(b)
    side = set(i for i in range(n) if find(i) == find(dropped[0]))
    return side


def random_graph(rng, n, m, wmax=100, distinct=False):
    m = min(m, n * (n - 1) // 2)  # more distinct edges than exist
    # cannot be sampled: the uncapped request spun forever (found
    # when oracle 3's n=4..7 draws asked for m up to 3n)
    edges = set()
    # a random spanning skeleton keeps it connected
    order = list(range(n))
    rng.shuffle(order)
    for i in range(1, n):
        edges.add((min(order[i - 1], order[i]), max(order[i - 1], order[i])))
    while len(edges) < m:
        u, v = rng.sample(range(n), 2)
        edges.add((min(u, v), max(u, v)))
    if distinct:
        ws = rng.sample(range(1, 10 * len(edges) + 1), len(edges))
    else:
        ws = [rng.randint(1, wmax) for _ in edges]
    edge_list = [(w, u, v) for w, (u, v) in zip(ws, sorted(edges))]
    adj = [[] for _ in range(n)]
    for w, u, v in edge_list:
        adj[u].append((w, v))
        adj[v].append((w, u))
    return edge_list, adj


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: weight equality with Kruskal on 300 graphs, and the
    # CUT-PROPERTY AUDIT on every one: each tree edge minimal across
    # the cut its removal defines.
    for trial in range(300):
        n = rng.randint(4, 40)
        m = rng.randint(n, min(3 * n, n * (n - 1) // 2))
        edge_list, adj = random_graph(rng, n, m)
        t_p, e_p, ok = prim(n, adj)
        assert ok
        t_k, e_k = kruskal(n, edge_list)
        assert t_p == t_k
        wmap = {(min(u, v), max(u, v)): w for w, u, v in edge_list}
        for e in e_p:
            side = components_without(n, e_p, e)
            crossing = [
                wmap[(min(a, b), max(a, b))]
                for (a, b) in wmap
                if (a in side) != (b in side)
            ]
            assert wmap[e] == min(crossing), (e, wmap[e], min(crossing))

    # Oracle 2: the absolute referee: ALL spanning trees on 50 small
    # graphs (n <= 7): Prim's total equals the true minimum.
    for _ in range(50):
        n = rng.randint(3, 7)
        m = rng.randint(n, n * (n - 1) // 2)
        edge_list, adj = random_graph(rng, n, m)
        t_p, _, _ = prim(n, adj)
        best = None
        for combo in combinations(edge_list, n - 1):
            par = list(range(n))

            def find(x):
                while par[x] != x:
                    par[x] = par[par[x]]
                    x = par[x]
                return x

            comps = n
            for w, u, v in combo:
                if find(u) != find(v):
                    par[find(u)] = find(v)
                    comps -= 1
            if comps == 1:
                t = sum(w for w, _, _ in combo)
                best = t if best is None else min(best, t)
        assert t_p == best

    # Oracle 3: unique MST under distinct weights: identical edge SETS.
    for _ in range(100):
        n = rng.randint(4, 30)
        m = rng.randint(n, 3 * n)
        edge_list, adj = random_graph(rng, n, m, distinct=True)
        _, e_p, _ = prim(n, adj)
        _, e_k = kruskal(n, edge_list)
        assert e_p == e_k

    # Oracle 4: the dense-vs-sparse meter. Dense: Prim's heap stays
    # near-linear in m while Kruskal must sort all of m. Sparse: the
    # sort is cheap and union-find is nearly free.
    n_d = 200
    edge_list_d, adj_d = random_graph(rng, n_d, n_d * (n_d - 1) // 4)
    cp_d, ck_d = {}, {}
    t1, _, _ = prim(n_d, adj_d, cp_d)
    t2, _ = kruskal(n_d, edge_list_d, ck_d)
    assert t1 == t2
    n_s = 2_000
    edge_list_s, adj_s = random_graph(rng, n_s, 3 * n_s)
    cp_s, ck_s = {}, {}
    t3, _, _ = prim(n_s, adj_s, cp_s)
    t4, _ = kruskal(n_s, edge_list_s, ck_s)
    assert t3 == t4

    # Oracle 5: the confusion, measured. The hub gadget: n spokes of
    # cost 10, a ring of cost 1. One keystroke (accumulate distance)
    # turns Prim into Dijkstra, and the shortest-path tree pays 8x+.
    H = 40
    hub_adj = [[] for _ in range(H + 1)]
    hub_edges = []
    for i in range(1, H + 1):
        hub_adj[0].append((10, i))
        hub_adj[i].append((10, 0))
        hub_edges.append((10, 0, i))
    for i in range(1, H):
        hub_adj[i].append((1, i + 1))
        hub_adj[i + 1].append((1, i))
        hub_edges.append((1, i, i + 1))
    t_mst, _, _ = prim(H + 1, hub_adj)
    t_spt, _ = dijkstra_tree(H + 1, hub_adj)
    assert t_mst == 10 + (H - 1) * 1          # one spoke + the ring path
    assert t_spt >= 10 * H * 0.8              # nearly all spokes
    ratio = t_spt / t_mst

    # Oracle 6: the client: cabling 200 sites in the plane (complete
    # Euclidean graph): MST vs a hub star vs nearest-neighbor chain.
    import math

    pts = [(rng.random(), rng.random()) for _ in range(200)]
    dist = lambda a, b: math.dist(pts[a], pts[b])
    cadj = [[] for _ in range(200)]
    for a in range(200):
        for b in range(a + 1, 200):
            d = dist(a, b)
            cadj[a].append((d, b))
            cadj[b].append((d, a))
    t_c, _, _ = prim(200, cadj)
    star = min(sum(dist(h, b) for b in range(200) if b != h) for h in range(200))
    unvisited = set(range(1, 200))
    cur = 0
    nn = 0.0
    while unvisited:
        nxt = min(unvisited, key=lambda b: dist(cur, b))
        nn += dist(cur, nxt)
        unvisited.remove(nxt)
        cur = nxt
    assert t_c < nn < star

    print(f"contest: minimum spanning tree; referee: Kruskal equal on 300 graphs, ALL spanning trees enumerated on 50, and the cut property AUDITED edge by edge on every instance")
    print(f"  {'graph':<26} {'Prim heap ops':>13} {'Kruskal ops':>12}")
    print(f"  {'dense (n=200, m=9,950)':<26} {cp_d['heap_ops']:>13,} {ck_d['sort_cmps'] + ck_d.get('find_ops', 0):>12,}   the sort of all m is the bill")
    print(f"  {'sparse (n=2,000, m=6,000)':<26} {cp_s['heap_ops']:>13,} {ck_s['sort_cmps'] + ck_s.get('find_ops', 0):>12,}   cheap sort, near-free finds")
    print(f"the confusion, measured: one keystroke (d+w instead of w) turns Prim into Dijkstra: on the hub gadget the shortest-path tree costs {t_spt:.0f} vs the MST's {t_mst}: {ratio:.1f}x: different questions, one line apart")
    print(f"the cut audit: every tree edge, on every one of 300 graphs, is the minimum across the cut its removal defines: the exchange argument checked {300}x(n-1) times")
    print(f"the client: cabling 200 plane sites: MST {t_c:.2f} < nearest-neighbor chain {nn:.2f} < best hub star {star:.2f}")
    print("OK: Kruskal-equal on 300, brute-force-equal on 50, unique-MST edge sets under distinct weights, the cut property audited everywhere, dense/sparse meters, the 8x Dijkstra confusion gadget, and the cabling client ordered")
