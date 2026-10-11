"""Greedy vertex cover x Maximal matching: the two-approximation held to exact
optima, to its own lower bound, to a certified LP optimum, and to the
max-degree greedy that wins on average and loses by a logarithm.

Vertex cover: a set of vertices touching every edge. NP-hard (Karp 1972).
The algorithm (Gavril, in Garey and Johnson 1979): take any uncovered edge,
put BOTH endpoints in the cover, delete every edge they touch, repeat. The
kept edges form a maximal matching M; every cover needs one endpoint of each
edge of M, so OPT >= |M| and the output 2|M| <= 2 OPT.

Oracles: exact minimum covers by branch and bound (checked against brute
force on small graphs); the LP relaxation solved exactly through the
bipartite double cover (Nemhauser-Trotter) with a primal-dual certificate;
Konig's theorem on bipartite graphs; the known Theta(log n) bad family for
the max-degree greedy, with OPT exact because that graph is bipartite.

Author corrections: the draft expected the matching rule's worst case over
random graphs to sit under two (it guessed 1.90); the measurement hit exactly
2.00 on several graphs, which the theorem allows. The draft also expected
branch and bound to blow up by n = 24 on G(n, 0.3); the matching bound prunes
dense random graphs to a few dozen nodes, so the growth experiment moved to
sparse graphs of average degree four, where the nodes climb from about two
dozen at n = 24 to tens of thousands at n = 120.
"""
import math
import random
import time
from itertools import combinations


def gnp(n, p, rng):
    return [(u, v) for u in range(n) for v in range(u + 1, n) if rng.random() < p]


def is_cover(edges, cover):
    return all(u in cover or v in cover for u, v in edges)


def matching_cover(edges):
    """Any uncovered edge: take both ends. The kept edges are a maximal matching."""
    cover, matching = set(), []
    for u, v in edges:
        if u not in cover and v not in cover:
            cover.add(u)
            cover.add(v)
            matching.append((u, v))
    return cover, matching


def degree_greedy(n, edges):
    """Greedy set cover specialised to edges: repeatedly take the max-degree vertex."""
    adj = [set() for _ in range(n)]
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)
    deg = [len(a) for a in adj]
    alive = [True] * n
    cover, remaining = set(), len(edges)
    while remaining:
        v = max(range(n), key=lambda x: (deg[x], -x))
        cover.add(v)
        alive[v] = False
        for u in adj[v]:
            if alive[u]:
                deg[u] -= 1
        remaining -= deg[v]
        deg[v] = 0
    return cover


def exact_cover(n, edges):
    """Branch and bound: branch on the max-degree vertex (take it, or take all
    its neighbours); prune with the matching lower bound. Returns (OPT, nodes)."""
    best, nodes = [n], [0]

    def rec(rem, size):
        nodes[0] += 1
        if not rem:
            best[0] = min(best[0], size)
            return
        if size + len(matching_cover(rem)[1]) >= best[0]:
            return
        deg = {}
        for u, v in rem:
            deg[u] = deg.get(u, 0) + 1
            deg[v] = deg.get(v, 0) + 1
        v, dv = max(deg.items(), key=lambda kv: (kv[1], -kv[0]))
        if dv == 1:
            best[0] = min(best[0], size + len(rem))
            return
        rec([e for e in rem if v not in e], size + 1)
        nb = {w for e in rem if v in e for w in e} - {v}
        rec([e for e in rem if e[0] not in nb and e[1] not in nb], size + len(nb))

    rec(list(edges), 0)
    return best[0], nodes[0]


def brute_cover(n, edges):
    for k in range(n + 1):
        for s in combinations(range(n), k):
            if is_cover(edges, set(s)):
                return k
    return n


def kuhn(nl, nr, adj_l):
    """Maximum bipartite matching by augmenting paths. Returns (match_l, match_r)."""
    match_r = [-1] * nr

    def grow(u, seen):
        for v in adj_l[u]:
            if v not in seen:
                seen.add(v)
                if match_r[v] < 0 or grow(match_r[v], seen):
                    match_r[v] = u
                    return True
        return False

    for u in range(nl):
        grow(u, set())
    match_l = [-1] * nl
    for v, u in enumerate(match_r):
        if u >= 0:
            match_l[u] = v
    return match_l, match_r


def konig(nl, nr, adj_l, match_l, match_r):
    """Minimum vertex cover of a bipartite graph from a maximum matching:
    (L minus Z) union (R intersect Z), Z = alternating reach from unmatched L."""
    vis_l, vis_r = [False] * nl, [False] * nr
    stack = [u for u in range(nl) if match_l[u] < 0]
    for u in stack:
        vis_l[u] = True
    while stack:
        u = stack.pop()
        for v in adj_l[u]:
            if not vis_r[v]:
                vis_r[v] = True
                w = match_r[v]
                if w >= 0 and not vis_l[w]:
                    vis_l[w] = True
                    stack.append(w)
    return {u for u in range(nl) if not vis_l[u]}, {v for v in range(nr) if vis_r[v]}


def lp_half_integral(n, edges):
    """Exact LP relaxation via the bipartite double cover: x_v = (v_L in C) + (v_R in C)
    over two, with the dual fractional matching y as the optimality certificate."""
    adj_l = [[] for _ in range(n)]
    for u, v in edges:
        adj_l[u].append(v)
        adj_l[v].append(u)
    ml, mr = kuhn(n, n, adj_l)
    cl, cr = konig(n, n, adj_l, ml, mr)
    x = [((v in cl) + (v in cr)) / 2 for v in range(n)]
    y = {e: ((ml[e[0]] == e[1]) + (ml[e[1]] == e[0])) / 2 for e in edges}
    assert all(x[u] + x[v] >= 1 for u, v in edges), "primal infeasible"
    load = [0.0] * n
    for (u, v), w in y.items():
        load[u] += w
        load[v] += w
    assert max(load, default=0) <= 1 + 1e-9, "dual infeasible"
    assert abs(sum(x) - sum(y.values())) < 1e-9, "no strong duality certificate"
    rounded = {v for v in range(n) if x[v] >= 0.5}
    assert is_cover(edges, rounded)
    return sum(x), rounded


def bad_family(n):
    """Left L = n vertices. For each i in 2..n, the n // i disjoint blocks of i
    left vertices each get a right vertex adjacent to the block. Max-degree greedy
    takes every right vertex (sum of n // i, about n (H_n - 1)); L alone is a cover."""
    edges, r = [], n
    for i in range(2, n + 1):
        for b in range(n // i):
            for j in range(b * i, (b + 1) * i):
                edges.append((j, r))
            r += 1
    return r, edges


def main():
    t0 = time.perf_counter()
    rng = random.Random(20261010)

    # 1. the exact referee is itself checked against brute force
    for _ in range(60):
        n = rng.randint(6, 11)
        edges = gnp(n, rng.uniform(0.2, 0.6), rng)
        opt, _ = exact_cover(n, edges)
        assert opt == brute_cover(n, edges)

    # 2. random graphs: ratios to the exact optimum
    N, P, trials = 14, 0.3, 300
    rat_m, rat_g, rat_lp, gap, nodes_all = [], [], [], [], []
    worst_m = worst_g = worst_lp = 0.0
    for _ in range(trials):
        edges = gnp(N, P, rng)
        rng.shuffle(edges)
        opt, nodes = exact_cover(N, edges)
        nodes_all.append(nodes)
        cov, match = matching_cover(edges)
        assert is_cover(edges, cov) and len(cov) == 2 * len(match)
        assert len(match) <= opt <= 2 * len(match)
        g = degree_greedy(N, edges)
        assert is_cover(edges, g)
        lp, rounded = lp_half_integral(N, edges)
        assert lp <= opt + 1e-9 and len(rounded) <= 2 * lp + 1e-9
        if opt:
            rat_m.append(len(cov) / opt)
            rat_g.append(len(g) / opt)
            rat_lp.append(len(rounded) / opt)
            gap.append(opt / lp)
            worst_m, worst_g, worst_lp = max(worst_m, rat_m[-1]), max(worst_g, rat_g[-1]), max(worst_lp, rat_lp[-1])
    mean = lambda xs: sum(xs) / len(xs)
    assert worst_m <= 2 and worst_lp <= 2
    print(f"random G({N}, {P}), {trials} graphs, exact OPT by branch and bound ({mean(nodes_all):.0f} nodes mean)")
    print(f"  matching rule  ratio mean {mean(rat_m):.3f} worst {worst_m:.3f}")
    print(f"  degree greedy  ratio mean {mean(rat_g):.3f} worst {worst_g:.3f}")
    print(f"  LP rounding    ratio mean {mean(rat_lp):.3f} worst {worst_lp:.3f}; OPT/LP mean {mean(gap):.3f}")

    # 3. edge order matters: best of k random orders
    orders = []
    for _ in range(40):
        edges = gnp(N, P, rng)
        opt, _ = exact_cover(N, edges)
        sizes = []
        for _ in range(8):
            rng.shuffle(edges)
            sizes.append(len(matching_cover(edges)[0]))
        orders.append((sizes[0] / opt, min(sizes) / opt))
    print(f"  one order {mean([a for a, _ in orders]):.3f} against best of eight {mean([b for _, b in orders]):.3f}")

    # 4. tight examples: exactly twice the optimum
    kn = 6
    k_edges = [(u, kn + v) for u in range(kn) for v in range(kn)]
    k_cov, k_match = matching_cover(k_edges)
    k_opt, _ = exact_cover(2 * kn, k_edges)
    assert k_opt == kn and len(k_cov) == 2 * kn and len(k_match) == kn
    star = [(0, j) for j in range(1, 9)]
    s_cov, _ = matching_cover(star)
    assert len(s_cov) == 2 and exact_cover(9, star)[0] == 1
    print(f"K_{kn},{kn}: matching rule {len(k_cov)} against OPT {k_opt} (ratio {len(k_cov) / k_opt:.1f}); degree greedy {len(degree_greedy(2 * kn, k_edges))}; star K_1,8: 2 against 1")

    # 5. Konig on random bipartite graphs: min cover equals max matching
    for _ in range(40):
        a, b = rng.randint(3, 6), rng.randint(3, 6)
        edges = [(u, a + v) for u in range(a) for v in range(b) if rng.random() < 0.5]
        adj_l = [[v - a for u2, v in edges if u2 == u] for u in range(a)]
        ml, mr = kuhn(a, b, adj_l)
        cl, cr = konig(a, b, adj_l, ml, mr)
        msize = sum(1 for m in ml if m >= 0)
        assert len(cl) + len(cr) == msize == brute_cover(a + b, edges)
        assert all(u in cl or (v - a) in cr for u, v in edges)

    # 6. the degree greedy's bad family: OPT exact by Konig (the graph is bipartite)
    rows = []
    for n in (16, 32, 64, 128):
        total, edges = bad_family(n)
        adj_l = [[] for _ in range(n)]
        for u, v in edges:
            adj_l[u].append(v - n)
        ml, _ = kuhn(n, total - n, adj_l)
        opt = sum(1 for m in ml if m >= 0)
        g = degree_greedy(total, edges)
        cov, match = matching_cover(edges)
        assert is_cover(edges, g) and is_cover(edges, cov)
        right = total - n
        assert len(g) == right, (len(g), right)
        rows.append((n, right, opt, len(g) / opt, len(cov) / opt))
    print("degree greedy bad family: n, right vertices, OPT, greedy ratio, matching ratio")
    for r in rows:
        print(f"  {r[0]:4d} {r[1]:5d} {r[2]:4d} {r[3]:.3f} {r[4]:.3f}")
    assert rows[-1][3] > rows[0][3] > 2 >= rows[-1][4]
    harmonic = sum(1 / i for i in range(1, 129)) - 1
    print(f"  n = 128: greedy ratio {rows[-1][3]:.3f} against H_n - 1 = {harmonic:.3f}; matching rule {rows[-1][4]:.3f}")

    # 7. exact search grows exponentially
    growth = []
    for n in (24, 48, 72, 96, 120):
        ns = []
        for _ in range(3):
            edges = gnp(n, 4 / (n - 1), rng)
            ns.append(exact_cover(n, edges)[1])
        growth.append((n, mean(ns)))
    print("exact branch and bound nodes, average degree 4: " + ", ".join(f"n = {n}: {v:,.0f}" for n, v in growth))
    assert growth[-1][1] > 100 * growth[0][1]

    el = time.perf_counter() - t0
    print(
        f"OK: matching rule ratio {mean(rat_m):.2f} mean and {worst_m:.2f} worst against exact optima on {trials} random graphs, "
        f"never above 2 and with |M| <= OPT <= 2|M| on every one; K_{kn},{kn} and the star hit exactly 2; "
        f"degree greedy {mean(rat_g):.2f} mean on the same graphs but {rows[-1][3]:.2f} on the bipartite bad family at n = 128 "
        f"(H_n - 1 = {harmonic:.2f}) where the matching rule stays at {rows[-1][4]:.2f}; "
        f"the half-integral LP certified by its dual on every graph, OPT/LP {mean(gap):.3f} mean, rounding worst {worst_lp:.2f}; "
        f"Konig exact on 40 bipartite graphs; branch and bound {growth[0][1]:,.0f} nodes at n = 24 and {growth[-1][1]:,.0f} at n = 120 (average degree 4); {el:.1f} s"
    )


if __name__ == "__main__":
    main()
