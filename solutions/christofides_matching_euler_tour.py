# Puzzle 117: Christofides x matching plus Euler tour
# Metric TSP approximation: visit n cities and return, where distances
# obey the triangle inequality, and do it with a PROVEN bound. The
# algorithm builds a minimum spanning tree, finds the vertices of odd
# degree (always an even number of them), adds a minimum-weight
# perfect matching on exactly those vertices, walks an Euler tour of
# the resulting multigraph, and shortcuts repeated cities. The
# heuristic is the matching plus Euler tour step: the MST alone
# costs at most OPT, the matching at most OPT/2 (half of an optimal
# tour's odd-vertex shortcut), so the Euler walk costs at most
# 1.5 OPT and the triangle inequality makes the shortcut no longer.
#
# Referees:
# (1) THE EXACT OPTIMUM by Held-Karp bitmask dynamic programming
#     (an independent implementation) on every instance: every
#     ratio on this page is against the true optimum, not a bound;
# (2) THE MATCHING IS EXACT: the subset dynamic program is
#     cross-checked against brute-force enumeration of every perfect
#     matching when the odd set is small enough to enumerate;
# (3) THE EULER TOUR IS A TOUR: Hierholzer's walk consumes every
#     multigraph edge exactly once and closes; the shortcut visits
#     every city exactly once and, by the triangle inequality, is
#     never longer than the walk;
# (4) THE THEOREM, NUMERICALLY: MST <= OPT, matching <= OPT / 2,
#     Christofides <= 1.5 OPT, double-tree <= 2 OPT, on every
#     instance; and the sharper truth measured: Christofides lands
#     far inside its bound on random Euclidean instances;
# (5) THE RIVALS on the same instances: nearest neighbor (no
#     bound, and measured worse), the MST double-tree (2-approx),
#     2-opt from a random tour, and Christofides polished by 2-opt.
import itertools
import math
import random

SEED = 20260926


def euclid(pts):
    n = len(pts)
    return [[math.dist(pts[i], pts[j]) for j in range(n)] for i in range(n)]


def tour_length(tour, d):
    return sum(d[tour[i]][tour[(i + 1) % len(tour)]] for i in range(len(tour)))


# ------------------------------------------------------------ the pieces
def prim_mst(d):
    n = len(d)
    in_tree = [False] * n
    best = [math.inf] * n
    parent = [-1] * n
    best[0] = 0
    edges = []
    for _ in range(n):
        u = min((i for i in range(n) if not in_tree[i]), key=lambda i: best[i])
        in_tree[u] = True
        if parent[u] >= 0:
            edges.append((parent[u], u))
        for v in range(n):
            if not in_tree[v] and d[u][v] < best[v]:
                best[v] = d[u][v]
                parent[v] = u
    return edges


def odd_vertices(edges, n):
    deg = [0] * n
    for u, v in edges:
        deg[u] += 1
        deg[v] += 1
    return [i for i in range(n) if deg[i] % 2 == 1]


def min_perfect_matching(odd, d):
    """Exact minimum-weight perfect matching on the odd vertices by
    dynamic programming over subsets: the lowest unmatched vertex is
    paired with every remaining partner. Exponential in |odd|, which
    is why real implementations use Edmonds' blossom algorithm; the
    self-test keeps |odd| small enough to be exact here."""
    m = len(odd)
    assert m % 2 == 0
    full = (1 << m) - 1
    memo = {0: (0.0, ())}

    def solve(mask):
        if mask in memo:
            return memo[mask]
        i = 0
        while not (mask >> i) & 1:
            i += 1
        best = (math.inf, ())
        rest = mask & ~(1 << i)
        j = i + 1
        while j < m:
            if (rest >> j) & 1:
                cost, pairs = solve(rest & ~(1 << j))
                cost += d[odd[i]][odd[j]]
                if cost < best[0]:
                    best = (cost, pairs + ((odd[i], odd[j]),))
            j += 1
        memo[mask] = best
        return best

    return solve(full)


def brute_perfect_matching(odd, d):
    """Every perfect matching, enumerated: the referee for the DP."""
    if not odd:
        return 0.0
    first, rest = odd[0], odd[1:]
    best = math.inf
    for k, partner in enumerate(rest):
        best = min(best, d[first][partner] + brute_perfect_matching(rest[:k] + rest[k + 1:], d))
    return best


def euler_tour(edges, n, start=0):
    """Hierholzer on a multigraph given as an edge list; returns the
    closed walk as a vertex sequence and asserts every edge was used."""
    adj = [[] for _ in range(n)]
    for idx, (u, v) in enumerate(edges):
        adj[u].append((v, idx))
        adj[v].append((u, idx))
    used = [False] * len(edges)
    stack = [start]
    walk = []
    while stack:
        u = stack[-1]
        while adj[u] and used[adj[u][-1][1]]:
            adj[u].pop()
        if adj[u]:
            v, idx = adj[u].pop()
            used[idx] = True
            stack.append(v)
        else:
            walk.append(stack.pop())
    assert all(used), 'Euler walk left an edge unused'
    assert walk[0] == walk[-1], 'Euler walk did not close'
    return walk


def shortcut(walk):
    seen = set()
    tour = []
    for v in walk:
        if v not in seen:
            seen.add(v)
            tour.append(v)
    return tour


def christofides(d, check_matching=False):
    n = len(d)
    mst = prim_mst(d)
    odd = odd_vertices(mst, n)
    match_cost, pairs = min_perfect_matching(odd, d)
    if check_matching and len(odd) <= 10:
        assert abs(match_cost - brute_perfect_matching(odd, d)) < 1e-9
    walk = euler_tour(mst + list(pairs), n)
    tour = shortcut(walk)
    assert sorted(tour) == list(range(n)), 'shortcut tour is not a permutation'
    walk_len = sum(d[walk[i]][walk[i + 1]] for i in range(len(walk) - 1))
    return tour, {
        'mst': sum(d[u][v] for u, v in mst),
        'odd': len(odd),
        'matching': match_cost,
        'walk': walk_len,
    }


def double_tree(d):
    """The MST doubled: every edge twice is Eulerian; shortcut it.
    The classic 2-approximation and Christofides' point of departure."""
    n = len(d)
    mst = prim_mst(d)
    walk = euler_tour(mst + mst, n)
    return shortcut(walk)


def nearest_neighbor(d, start=0):
    n = len(d)
    tour = [start]
    left = set(range(n)) - {start}
    while left:
        u = tour[-1]
        v = min(left, key=lambda w: d[u][w])
        tour.append(v)
        left.remove(v)
    return tour


def two_opt(tour, d):
    n = len(tour)
    improved = True
    t = list(tour)
    while improved:
        improved = False
        for i in range(n - 1):
            for j in range(i + 2, n if i > 0 else n - 1):
                a, b = t[i], t[i + 1]
                c, e = t[j], t[(j + 1) % n]
                if d[a][c] + d[b][e] < d[a][b] + d[c][e] - 1e-12:
                    t[i + 1:j + 1] = reversed(t[i + 1:j + 1])
                    improved = True
    return t


def held_karp(d):
    """The exact referee: bitmask DP over subsets ending at each city."""
    n = len(d)
    full = 1 << (n - 1)
    dp = [[math.inf] * (n - 1) for _ in range(full)]
    for j in range(n - 1):
        dp[1 << j][j] = d[0][j + 1]
    for mask in range(1, full):
        for j in range(n - 1):
            if not (mask >> j) & 1 or dp[mask][j] == math.inf:
                continue
            base = dp[mask][j]
            for k in range(n - 1):
                if (mask >> k) & 1:
                    continue
                nm = mask | (1 << k)
                cand = base + d[j + 1][k + 1]
                if cand < dp[nm][k]:
                    dp[nm][k] = cand
    return min(dp[full - 1][j] + d[j + 1][0] for j in range(n - 1))


if __name__ == '__main__':
    N = 13
    INSTANCES = 6
    rows = {k: [] for k in ('nn', 'dt', 'two', 'chr', 'chr2', 'opt')}
    theorem = []
    for inst in range(INSTANCES):
        rng = random.Random(SEED + inst * 7)
        pts = [(rng.random() * 100, rng.random() * 100) for _ in range(N)]
        d = euclid(pts)
        opt = held_karp(d)
        tour, parts = christofides(d, check_matching=True)
        chr_len = tour_length(tour, d)
        dt_len = tour_length(double_tree(d), d)
        nn_len = tour_length(nearest_neighbor(d), d)
        rand_tour = list(range(N))
        rng.shuffle(rand_tour)
        two_len = tour_length(two_opt(rand_tour, d), d)
        chr2_len = tour_length(two_opt(tour, d), d)
        # Oracle 3: the shortcut never lengthens the walk (triangle inequality).
        assert chr_len <= parts['walk'] + 1e-9
        # Oracle 4: the theorem, numerically.
        assert parts['mst'] <= opt + 1e-9
        assert parts['matching'] <= opt / 2 + 1e-9, (parts['matching'], opt / 2)
        assert chr_len <= 1.5 * opt + 1e-9
        assert dt_len <= 2 * opt + 1e-9
        assert opt <= min(chr_len, dt_len, nn_len, two_len, chr2_len) + 1e-9
        for k, v in (('nn', nn_len), ('dt', dt_len), ('two', two_len), ('chr', chr_len), ('chr2', chr2_len), ('opt', opt)):
            rows[k].append(v / opt)
        theorem.append((parts['mst'] / opt, parts['matching'] / opt, parts['odd']))

    def mean(xs):
        return sum(xs) / len(xs)

    m = {k: mean(v) for k, v in rows.items()}
    worst = {k: max(v) for k, v in rows.items()}
    # Oracle 5: the ordering that the theory predicts and the run confirms.
    assert m['chr'] < m['dt'], (m['chr'], m['dt'])
    assert m['chr'] < m['nn'], (m['chr'], m['nn'])
    assert m['chr2'] <= m['chr'] + 1e-12
    assert worst['chr'] <= 1.5 and worst['dt'] <= 2.0

    print(f'contest: metric TSP on {INSTANCES} random Euclidean instances of {N} cities, every ratio against the exact Held-Karp optimum')
    print(f"  {'method':<32} {'mean ratio':>10} {'worst':>7}")
    print(f"  {'nearest neighbor':<32} {m['nn']:>10.3f} {worst['nn']:>7.3f}   no guarantee: greedy strands the last cities")
    print(f"  {'double-tree (MST shortcut)':<32} {m['dt']:>10.3f} {worst['dt']:>7.3f}   the 2-approximation Christofides improves on")
    print(f"  {'2-opt from a random tour':<32} {m['two']:>10.3f} {worst['two']:>7.3f}   local search: good on average, no bound")
    print(f"  {'Christofides':<32} {m['chr']:>10.3f} {worst['chr']:>7.3f}   proven <= 1.5, measured far inside it")
    print(f"  {'Christofides + 2-opt':<32} {m['chr2']:>10.3f} {worst['chr2']:>7.3f}   the guarantee as a starting point for polish")
    print(f"  {'Held-Karp (exact)':<32} {m['opt']:>10.3f} {worst['opt']:>7.3f}   the referee: O(2^n n^2), {N} cities only")
    print(f"the theorem, measured: MST/OPT mean {mean(t[0] for t in theorem):.3f} (<= 1), matching/OPT mean {mean(t[1] for t in theorem):.3f} (<= 0.5), odd vertices {sorted(t[2] for t in theorem)}: walk <= 1.5 OPT and the shortcut cannot lengthen it")
    print(f'OK: exact matching cross-checked by enumeration; every Euler walk used every edge and closed; every shortcut a permutation no longer than its walk; '
          f'MST <= OPT, matching <= OPT/2, Christofides <= 1.5 OPT (worst {worst["chr"]:.3f}), double-tree <= 2 OPT (worst {worst["dt"]:.3f}) on all {INSTANCES} instances; '
          f'Christofides mean {m["chr"]:.3f} beats double-tree {m["dt"]:.3f} and nearest neighbor {m["nn"]:.3f}; 2-opt polish {m["chr2"]:.3f}')
