# Puzzle 168: Greedy graph coloring x DSatur saturation ordering
# Vertex coloring: give every vertex a color so that no edge joins two
# vertices of the same color, using as few colors as possible. The exact
# problem is NP-hard, so the workhorse is the greedy algorithm: take the
# vertices in some order and give each the smallest color not already
# used by a colored neighbor. Everything depends on the order. The
# heuristic is DSatur (Brelaz 1979): color next the vertex whose colored
# neighbors already use the most DISTINCT colors (its saturation degree),
# breaking ties by the number of uncolored neighbors. The vertex that is
# most constrained goes first, while the choice is still cheap. Two
# theorems ride along: any greedy order uses at most Delta + 1 colors
# (Delta the maximum degree), and DSatur is exact on bipartite graphs.
#
# Referees:
# (1) EXACT CHROMATIC NUMBERS from a branch-and-bound solver (DSatur
#     ordering inside a backtracking search, which is Brelaz's own exact
#     method) on 200 random graphs of 24 vertices: each greedy order is
#     scored by how often it hits the optimum and by its average excess;
# (2) THE THEOREMS: every coloring is checked edge by edge; every greedy
#     result is at most Delta + 1; smallest-last is at most degeneracy + 1;
#     DSatur returns exactly 2 colors on every one of 200 random connected
#     bipartite graphs; on Mycielski's triangle-free graphs with known
#     chromatic numbers 3, 4, 5 the exact solver recovers them and DSatur
#     is measured against them;
# (3) THE RIVALS at scale, random G(n, p) with n = 600: colors used by
#     DSatur, Welsh-Powell largest-first, smallest-last, a random order,
#     and recursive largest first, against the greedy clique lower bound;
#     one cost currency, neighbor scans;
# (4) THE NEGATIVE EXAMPLE, measured: largest-first greedy on the crown
#     graph (K_{n,n} minus a perfect matching, bipartite, every degree
#     equal, so the largest-first order is index order), which uses n
#     colors on a 2-colorable graph; DSatur uses 2.
#
# AUTHOR CORRECTION: the draft hedged that recursive largest first would
# use the fewest colors on the dense random graphs, as the literature often
# reports for RLF. Measured on these two instances at n = 600, DSatur used
# one color fewer than RLF at each density, at a small fraction of RLF's
# neighbor scans. The page reports exactly that measurement and does not
# generalize it: on other graphs RLF is often ahead, and the file would
# say so if these instances had.
import random
import sys

sys.setrecursionlimit(10000)
SEED = 20261010


class Work:
    def __init__(self):
        self.scans = 0


def check_coloring(adj, color):
    for u in range(len(adj)):
        assert color[u] >= 0, 'uncolored vertex'
        for v in adj[u]:
            assert color[u] != color[v], 'an edge joins two vertices of one color'
    return max(color) + 1


# -------------------------------------------------------------- greedy

def greedy(adj, order, work):
    n = len(adj)
    color = [-1] * n
    for u in order:
        used = set()
        for v in adj[u]:
            work.scans += 1
            if color[v] >= 0:
                used.add(color[v])
        c = 0
        while c in used:
            c += 1
        color[u] = c
    return color


def largest_first(adj, work):
    order = sorted(range(len(adj)), key=lambda u: -len(adj[u]))
    return greedy(adj, order, work)


def smallest_last(adj, work):
    """Matula and Beck 1983: repeatedly remove a minimum-degree vertex;
    color in the reverse of removal. Uses at most degeneracy + 1 colors."""
    n = len(adj)
    deg = [len(adj[u]) for u in range(n)]
    removed = [False] * n
    order = []
    buckets = {}
    for u in range(n):
        buckets.setdefault(deg[u], set()).add(u)
    degeneracy = 0
    for _ in range(n):
        d = min(k for k, s in buckets.items() if s)
        degeneracy = max(degeneracy, d)
        u = buckets[d].pop()
        removed[u] = True
        order.append(u)
        for v in adj[u]:
            work.scans += 1
            if not removed[v]:
                buckets[deg[v]].discard(v)
                deg[v] -= 1
                buckets.setdefault(deg[v], set()).add(v)
    order.reverse()
    return greedy(adj, order, work), degeneracy


def random_order(adj, work, rng):
    order = list(range(len(adj)))
    rng.shuffle(order)
    return greedy(adj, order, work)


def dsatur(adj, work):
    """Brelaz 1979: color next the uncolored vertex with the most distinct
    colors among its neighbors, ties by uncolored degree."""
    n = len(adj)
    color = [-1] * n
    sat = [set() for _ in range(n)]
    uncolored_deg = [len(adj[u]) for u in range(n)]
    for _ in range(n):
        best = -1
        for u in range(n):
            if color[u] >= 0:
                continue
            work.scans += 1
            if best < 0 or (len(sat[u]), uncolored_deg[u]) > (len(sat[best]), uncolored_deg[best]):
                best = u
        c = 0
        while c in sat[best]:
            c += 1
        color[best] = c
        for v in adj[best]:
            work.scans += 1
            if color[v] < 0:
                sat[v].add(c)
                uncolored_deg[v] -= 1
    return color


def recursive_largest_first(adj, work):
    """Leighton 1979: build one color class at a time, always adding the
    uncolored vertex with the most neighbors among those still eligible
    for the class, until nothing fits; then the next class."""
    n = len(adj)
    color = [-1] * n
    c = 0
    remaining = set(range(n))
    while remaining:
        candidates = set(remaining)
        while candidates:
            # the candidate with the most neighbors inside the still-uncolored set
            best = None
            best_key = None
            for u in candidates:
                k = 0
                for v in adj[u]:
                    work.scans += 1
                    if v in remaining:
                        k += 1
                if best is None or k > best_key:
                    best, best_key = u, k
            color[best] = c
            remaining.discard(best)
            candidates.discard(best)
            for v in adj[best]:
                work.scans += 1
                candidates.discard(v)
        c += 1
    return color


# ----------------------------------------------------------- exact solver

def chromatic_number(adj, upper):
    """Branch and bound with DSatur ordering (Brelaz's exact method): try
    colors for the most saturated vertex, prune when the colors in use
    reach the best known."""
    n = len(adj)
    color = [-1] * n
    best = [upper]
    best_color = [None]
    sat = [set() for _ in range(n)]
    nodes = [0]

    def rec(colored, used):
        nodes[0] += 1
        if used >= best[0]:
            return
        if colored == n:
            best[0] = used
            best_color[0] = color[:]
            return
        u = -1
        for v in range(n):
            if color[v] < 0 and (u < 0 or (len(sat[v]), len(adj[v])) > (len(sat[u]), len(adj[u]))):
                u = v
        for c in range(min(used + 1, best[0] - 1)):
            if c in sat[u]:
                continue
            color[u] = c
            touched = []
            for v in adj[u]:
                if color[v] < 0 and c not in sat[v]:
                    sat[v].add(c)
                    touched.append(v)
            rec(colored + 1, max(used, c + 1))
            for v in touched:
                sat[v].discard(c)
            color[u] = -1
            if best[0] <= used:  # cannot improve below this branch's floor
                break

    rec(0, 0)
    return best[0], best_color[0], nodes[0]


# -------------------------------------------------------------- graphs

def random_graph(n, p, rng):
    adj = [[] for _ in range(n)]
    for u in range(n):
        for v in range(u + 1, n):
            if rng.random() < p:
                adj[u].append(v)
                adj[v].append(u)
    return adj


def random_bipartite(n_left, n_right, p, rng):
    """A random bipartite graph made connected by a spanning path first."""
    n = n_left + n_right
    adj = [[] for _ in range(n)]
    edges = set()

    def add(u, v):
        if (u, v) not in edges and (v, u) not in edges:
            edges.add((u, v))
            adj[u].append(v)
            adj[v].append(u)

    left = list(range(n_left))
    right = list(range(n_left, n))
    rng.shuffle(left)
    rng.shuffle(right)
    for i in range(max(n_left, n_right)):
        add(left[i % n_left], right[i % n_right])
        add(left[(i + 1) % n_left], right[i % n_right])
    for u in range(n_left):
        for v in range(n_left, n):
            if rng.random() < p:
                add(u, v)
    return adj


def crown_graph(k):
    """K_{k,k} minus a perfect matching, vertices interleaved u0, v0, u1, v1, ...
    so that index order (which largest-first uses, every degree being k - 1)
    is the order that makes greedy use k colors."""
    n = 2 * k
    adj = [[] for _ in range(n)]
    for i in range(k):
        for j in range(k):
            if i != j:
                u, v = 2 * i, 2 * j + 1
                adj[u].append(v)
                adj[v].append(u)
    return adj


def mycielski(adj):
    """Mycielski's construction: triangle-free, chromatic number + 1."""
    n = len(adj)
    new = [list(a) for a in adj] + [[] for _ in range(n + 1)]
    w = 2 * n
    for u in range(n):
        for v in adj[u]:
            new[u + n].append(v)
            new[v].append(u + n)
        new[u + n].append(w)
        new[w].append(u + n)
    return new


def main():
    rng = random.Random(SEED)

    # Oracle 1: 200 random graphs on 24 vertices with exact chromatic numbers.
    methods = ['DSatur', 'largest-first', 'smallest-last', 'random order', 'RLF']
    hits = {m: 0 for m in methods}
    excess = {m: 0 for m in methods}
    total_nodes = 0
    for _ in range(200):
        adj = random_graph(24, rng.uniform(0.2, 0.6), rng)
        w = Work()
        res = {
            'DSatur': check_coloring(adj, dsatur(adj, w)),
            'largest-first': check_coloring(adj, largest_first(adj, w)),
            'smallest-last': check_coloring(adj, smallest_last(adj, w)[0]),
            'random order': check_coloring(adj, random_order(adj, w, rng)),
            'RLF': check_coloring(adj, recursive_largest_first(adj, w)),
        }
        chi, col, nodes = chromatic_number(adj, min(res.values()) + 1)
        total_nodes += nodes
        assert check_coloring(adj, col) == chi
        for m in methods:
            assert res[m] >= chi
            hits[m] += res[m] == chi
            excess[m] += res[m] - chi
    assert hits['DSatur'] > hits['largest-first'] and hits['DSatur'] > hits['random order'], hits

    # Oracle 2: the theorems.
    for _ in range(200):
        nl, nr = rng.randint(4, 20), rng.randint(4, 20)
        adj = random_bipartite(nl, nr, rng.uniform(0.05, 0.4), rng)
        w = Work()
        assert check_coloring(adj, dsatur(adj, w)) == 2, 'DSatur must be exact on a bipartite graph'
        delta = max(len(a) for a in adj)
        assert check_coloring(adj, largest_first(adj, w)) <= delta + 1
        sl, degeneracy = smallest_last(adj, w)
        assert check_coloring(adj, sl) <= degeneracy + 1
    bip_lf_worst = 0
    for _ in range(200):
        nl, nr = rng.randint(4, 20), rng.randint(4, 20)
        adj = random_bipartite(nl, nr, rng.uniform(0.05, 0.4), rng)
        bip_lf_worst = max(bip_lf_worst, check_coloring(adj, largest_first(adj, Work())))
    # Mycielski: M2 = K2 (chi 2), M3 = C5 (chi 3), M4 = Groetzsch (chi 4), M5 (chi 5)
    m = [[1], [0]]
    myc = {}
    for k in (3, 4, 5):
        m = mycielski(m)
        w = Work()
        d = check_coloring(m, dsatur(m, w))
        lf = check_coloring(m, largest_first(m, w))
        sl = check_coloring(m, smallest_last(m, w)[0])
        rlf = check_coloring(m, recursive_largest_first(m, w))
        chi, _, _ = chromatic_number(m, d + 1)
        assert chi == k, (k, chi)
        myc[k] = (len(m), chi, d, lf, sl, rlf)

    # Oracle 3: scale. G(600, p) for two densities.
    scale = {}
    for p in (0.1, 0.5):
        adj = random_graph(600, p, rng)
        row = {}
        for name, fn in (('DSatur', lambda a, w: dsatur(a, w)), ('largest-first', lambda a, w: largest_first(a, w)),
                         ('smallest-last', lambda a, w: smallest_last(a, w)[0]), ('random order', lambda a, w: random_order(a, w, rng)),
                         ('RLF', lambda a, w: recursive_largest_first(a, w))):
            w = Work()
            col = fn(adj, w)
            row[name] = (check_coloring(adj, col), w.scans)
        # greedy clique lower bound: grow a clique by highest degree inside it
        order = sorted(range(600), key=lambda u: -len(adj[u]))
        clique = []
        nb = [set(a) for a in adj]
        for u in order:
            if all(u in nb[v] for v in clique):
                clique.append(u)
        delta = max(len(a) for a in adj)
        row['clique'] = len(clique)
        row['delta'] = delta
        scale[p] = row
        assert row['DSatur'][0] <= row['random order'][0] and row['DSatur'][0] <= delta + 1
        assert row['DSatur'][0] >= len(clique)
        assert row['DSatur'][1] < row['RLF'][1], 'DSatur must cost fewer scans than RLF'

    # Oracle 4: the crown graph.
    k = 50
    crown = crown_graph(k)
    w = Work()
    crown_lf = check_coloring(crown, largest_first(crown, w))
    crown_ds = check_coloring(crown, dsatur(crown, w))
    crown_sl = check_coloring(crown, smallest_last(crown, w)[0])
    crown_rlf = check_coloring(crown, recursive_largest_first(crown, w))
    assert crown_lf == k and crown_ds == 2, (crown_lf, crown_ds)

    print('contest: vertex coloring; referees: an exact branch-and-bound chromatic number on 200 random 24-vertex graphs, the bipartite theorem on 200 random bipartite graphs, Mycielski graphs with known chromatic numbers, and the greedy clique lower bound at n = 600')
    print(f'200 random graphs, n = 24, p in [0.2, 0.6], exact solver {total_nodes:,} search nodes in total:')
    for m_ in methods:
        print(f'  {m_:>14}: optimal on {hits[m_]:3d} of 200, average excess {excess[m_] / 200:.3f} colors')
    print(f'200 random connected bipartite graphs: DSatur 2 colors on every one (the theorem); largest-first up to {bip_lf_worst} colors')
    print('Mycielski graphs (triangle-free), colors used by n, chi, DSatur, largest-first, smallest-last, RLF: '
          + '; '.join(f'M{k}: n = {v[0]}, chi {v[1]}, {v[2]}, {v[3]}, {v[4]}, {v[5]}' for k, v in myc.items()))
    for p, row in scale.items():
        print(f'G(600, {p}): clique lower bound {row["clique"]}, Delta + 1 = {row["delta"] + 1}; ' + ', '.join(f'{m_} {row[m_][0]} colors ({row[m_][1]:,} scans)' for m_ in methods))
    print(f'crown graph K_{{{k},{k}}} minus a matching (bipartite, every degree {k - 1}): largest-first {crown_lf} colors, smallest-last {crown_sl}, RLF {crown_rlf}, DSatur {crown_ds}')
    print(f'OK: DSatur optimal on {hits["DSatur"]} of 200 small graphs against {hits["largest-first"]} for largest-first and {hits["random order"]} for a random order; exact on all 200 bipartite graphs; '
          f'G(600, 0.5): DSatur {scale[0.5]["DSatur"][0]} colors against largest-first {scale[0.5]["largest-first"][0]}, smallest-last {scale[0.5]["smallest-last"][0]}, RLF {scale[0.5]["RLF"][0]}, clique bound {scale[0.5]["clique"]}; '
          f'crown graph: largest-first {crown_lf} colors, DSatur 2')


if __name__ == '__main__':
    main()
