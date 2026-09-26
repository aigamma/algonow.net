# Puzzle 123: Bron-Kerbosch x Tomita pivoting
# Maximal clique listing: report every clique that cannot be extended
# by another vertex, exactly once. The algorithm keeps three sets: R,
# the clique being built; P, the candidates that could extend it; X,
# the vertices already reported with R (so nothing is listed twice).
# When P and X are both empty, R is maximal. The heuristic is the
# pivot: choose a vertex u in P union X with the most neighbors in P,
# and branch only on the candidates that are NOT neighbors of u. Every
# maximal clique either contains u or contains a non-neighbor of u, so
# nothing is lost, and the branching factor collapses. Tomita, Tanaka,
# and Takahashi proved the pivoted search runs in O(3^(n/3)) time,
# which is optimal because Moon and Moser showed a graph can have that
# many maximal cliques.
#
# Referees:
# (1) BRUTE FORCE on small graphs: every subset of the vertices is
#     tested for being a clique and maximal; the enumerated set of
#     maximal cliques equals the pivoted search's set, exactly;
# (2) INDEPENDENT VALIDITY on larger graphs: every reported set is a
#     clique (all pairs adjacent) and maximal (no outside vertex is
#     adjacent to all of it), no set is reported twice, and the three
#     variants (no pivot, Tomita pivot, degeneracy order plus pivot)
#     report identical collections;
# (3) MOON-MOSER: the complete multipartite graph with parts of size
#     three on 3k vertices has exactly 3^k maximal cliques, and the
#     pivoted search makes exactly (3^(k+1) - 1) / 2 recursive calls on
#     it while the unpivoted search makes exactly 4^k: laws read off the
#     run and then asserted, so the gap between them grows as (4/3)^k;
# (4) COST: recursive calls are counted for the three variants on
#     random graphs of growing density;
# (5) DEGENERACY: the outer-level ordering by degeneracy bounds the
#     depth-one candidate sets by the degeneracy d, asserted.
import itertools
import random

SEED = 20260926


def random_graph(n, p, rng):
    adj = [set() for _ in range(n)]
    for u in range(n):
        for v in range(u + 1, n):
            if rng.random() < p:
                adj[u].add(v)
                adj[v].add(u)
    return adj


def moon_moser(k):
    """Complete k-partite graph with parts of size 3: 3^k maximal cliques."""
    n = 3 * k
    adj = [set() for _ in range(n)]
    for u in range(n):
        for v in range(n):
            if u != v and u // 3 != v // 3:
                adj[u].add(v)
    return adj


def bron_kerbosch(adj, pivot=True, counter=None):
    counter = counter if counter is not None else [0]
    cliques = []

    def rec(R, P, X):
        counter[0] += 1
        if not P and not X:
            cliques.append(frozenset(R))
            return
        if pivot:
            u = max(P | X, key=lambda w: len(P & adj[w]))
            candidates = P - adj[u]
        else:
            candidates = set(P)
        for v in sorted(candidates):
            rec(R | {v}, P & adj[v], X & adj[v])
            P = P - {v}
            X = X | {v}

    rec(set(), set(range(len(adj))), set())
    return cliques


def degeneracy_order(adj):
    """Repeatedly remove a minimum-degree vertex; the largest degree seen
    at removal time is the degeneracy."""
    n = len(adj)
    deg = [len(adj[v]) for v in range(n)]
    removed = [False] * n
    order = []
    d = 0
    for _ in range(n):
        v = min((x for x in range(n) if not removed[x]), key=lambda x: deg[x])
        d = max(d, deg[v])
        removed[v] = True
        order.append(v)
        for w in adj[v]:
            if not removed[w]:
                deg[w] -= 1
    return order, d


def bron_kerbosch_degeneracy(adj, counter=None):
    """Eppstein-Loffler-Strash: the outer level iterates a degeneracy
    ordering, so every depth-one candidate set has at most d vertices;
    pivoting inside."""
    counter = counter if counter is not None else [0]
    order, d = degeneracy_order(adj)
    pos = {v: i for i, v in enumerate(order)}
    cliques = []
    max_p = 0

    def rec(R, P, X):
        counter[0] += 1
        if not P and not X:
            cliques.append(frozenset(R))
            return
        u = max(P | X, key=lambda w: len(P & adj[w]))
        for v in sorted(P - adj[u]):
            rec(R | {v}, P & adj[v], X & adj[v])
            P = P - {v}
            X = X | {v}

    for v in order:
        counter[0] += 1
        P = {w for w in adj[v] if pos[w] > pos[v]}
        X = {w for w in adj[v] if pos[w] < pos[v]}
        max_p = max(max_p, len(P))
        rec({v}, P, X)
    return cliques, d, max_p


def brute_force_maximal_cliques(adj):
    n = len(adj)
    out = set()
    for mask in range(1, 1 << n):
        members = [v for v in range(n) if (mask >> v) & 1]
        if all(b in adj[a] for a, b in itertools.combinations(members, 2)):
            ms = set(members)
            if not any(all(v in adj[m] for m in members) for v in range(n) if v not in ms):
                out.add(frozenset(members))
    return out


def validate(adj, cliques):
    n = len(adj)
    seen = set()
    for c in cliques:
        assert c not in seen, 'reported twice'
        seen.add(c)
        for a, b in itertools.combinations(sorted(c), 2):
            assert b in adj[a], 'not a clique'
        for v in range(n):
            if v not in c:
                assert not all(v in adj[m] for m in c), 'not maximal'
    return len(seen)


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: brute force on small random graphs of several densities.
    for trial in range(12):
        n = 10 + trial % 5
        p = 0.3 + 0.1 * (trial % 4)
        adj = random_graph(n, p, rng)
        brute = brute_force_maximal_cliques(adj)
        assert set(bron_kerbosch(adj, pivot=True)) == brute, trial
        assert set(bron_kerbosch(adj, pivot=False)) == brute, trial
        assert set(bron_kerbosch_degeneracy(adj)[0]) == brute, trial

    # Oracle 2 + 4: larger graphs, three variants agree, costs counted.
    table = []
    for n, p in ((60, 0.3), (60, 0.5), (60, 0.7), (120, 0.5)):
        adj = random_graph(n, p, rng)
        c0, c1, c2 = [0], [0], [0]
        plain = bron_kerbosch(adj, pivot=False, counter=c0)
        piv = bron_kerbosch(adj, pivot=True, counter=c1)
        degen, d, max_p = bron_kerbosch_degeneracy(adj, counter=c2)
        count = validate(adj, piv)
        assert set(plain) == set(piv) == set(degen)
        assert max_p <= d                                              # Oracle 5
        assert c1[0] < c0[0], (c1[0], c0[0])
        table.append((n, p, count, c0[0], c1[0], c2[0], d))

    # Oracle 3: Moon-Moser graphs, 3^k cliques, pivoted calls near-linear in them.
    mm = []
    for k in (4, 5, 6, 7):
        adj = moon_moser(k)
        c0, c1 = [0], [0]
        piv = bron_kerbosch(adj, pivot=True, counter=c1)
        assert len(piv) == 3 ** k and validate(adj, piv) == 3 ** k
        if k <= 6:
            plain = bron_kerbosch(adj, pivot=False, counter=c0)
            assert set(plain) == set(piv)
        mm.append((k, 3 ** k, c1[0], c0[0] if k <= 6 else None))
        # THE MEASURED LAWS (the first draft asserted a tenfold gap at
        # k = 6; the run said 3.7x, and the exact shapes underneath it):
        assert c1[0] == (3 ** (k + 1) - 1) // 2, (k, c1[0])
        if k <= 6:
            assert c0[0] == 4 ** k, (k, c0[0])
    ratios = [c0 / c1 for k, cl, c1, c0 in mm if c0 is not None]
    assert ratios[0] < ratios[1] < ratios[2], ratios                       # (4/3)^k: the gap widens

    print('contest: maximal clique listing; currency: recursive calls; referees: brute-force subset enumeration on small graphs, independent clique/maximality/uniqueness validation on large ones, three variants agreeing')
    print(f"  {'graph':<18} {'cliques':>8} {'no pivot':>10} {'Tomita pivot':>13} {'degeneracy+pivot':>17} {'d':>4}")
    for n, p, count, c0, c1, c2, d in table:
        print(f"  G({n}, {p:.1f}){'':<9} {count:>8,} {c0:>10,} {c1:>13,} {c2:>17,} {d:>4}")
    print('Moon-Moser graphs (parts of three, 3^k maximal cliques): pivoted calls follow (3^(k+1) - 1) / 2, unpivoted calls 4^k')
    for k, cl, c1, c0 in mm:
        print(f"  k = {k}: {cl:>5,} cliques   pivoted calls {c1:>7,}   unpivoted {c0 if c0 is not None else '(skipped)':>10}   {'' if c0 is None else f'{c0 / c1:.1f}x'}")
    print(f'OK: 12 small graphs equal to brute force under all three variants; every reported set a clique, maximal, and unique; the variants agree on all four large graphs; '
          f'pivoting cuts calls on every graph (e.g. {table[1][3]:,} to {table[1][4]:,} on G(60, 0.5)); depth-one candidate sets bounded by the degeneracy; '
          f'Moon-Moser 3^k cliques found exactly, pivoted calls exactly (3^(k+1) - 1) / 2 and unpivoted exactly 4^k, the gap widening {ratios[0]:.1f}x, {ratios[1]:.1f}x, {ratios[2]:.1f}x')
