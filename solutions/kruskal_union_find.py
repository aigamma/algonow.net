# Puzzle 23: Kruskal's algorithm x union-find cycle test
# Connect every vertex at minimum total weight: the minimum spanning tree,
# with a certificate, and with the component question answered fast enough
# to ask E times.
#
# The pairing is the point. Kruskal's control structure is the cut-property
# greedy: scan edges lightest first, and take any edge whose endpoints lie
# in different components; the exchange argument makes every such choice
# safe. The heuristic is HOW "different components?" gets answered. It will
# be asked once per edge. Union-find with rank and path compression answers
# in amortized nearly-constant time (the flat forest of puzzle 08); answer
# it instead by searching the current forest, and the same greedy drowns,
# measured 30-fold here and growing with n. The data structure is not an
# implementation detail; it is the difference between E alpha and E n.
import math
import random
from collections import deque
import heapq


class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.jumps = 0

    def find(self, x):
        root = x
        while self.parent[root] != root:
            self.jumps += 1
            root = self.parent[root]
        while self.parent[x] != root:  # path compression: flatten the walk
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True


def kruskal_uf(n, edges, counter=None):
    """Edges must arrive sorted by weight. Work = DSU parent-jumps plus one
    touch per edge; the sort is charged separately at E log2 E."""
    dsu = DSU(n)
    tree = []
    work = 0
    for w, u, v in edges:
        work += 1
        if dsu.union(u, v):
            tree.append((w, u, v))
            if len(tree) == n - 1:
                break
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work + dsu.jumps
        counter["jumps"] = dsu.jumps
        counter["finds"] = 2 * (work)
    return tree


def kruskal_bfs(n, edges, counter=None):
    """The same greedy with the heuristic removed: answer "already
    connected?" by breadth-first search over the forest built so far."""
    adj = [[] for _ in range(n)]
    tree = []
    work = 0
    for w, u, v in edges:
        # BFS from u looking for v.
        seen = {u}
        q = deque([u])
        connected = False
        while q:
            x = q.popleft()
            if x == v:
                connected = True
                break
            for y in adj[x]:
                work += 1
                if y not in seen:
                    seen.add(y)
                    q.append(y)
        work += 1
        if not connected:
            adj[u].append(v)
            adj[v].append(u)
            tree.append((w, u, v))
            if len(tree) == n - 1:
                break
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work
    return tree


def prim_heap(n, adj, counter=None):
    """Prim with a lazy-deletion binary heap: grow one tree from vertex 0,
    always adding the lightest edge leaving it. Dijkstra's shape, spanning
    trees' proof."""
    in_tree = [False] * n
    tree = []
    work = 0
    heap = [(0, 0, -1, -1)]  # (weight, vertex, from, edge weight)
    while heap and len(tree) < n - 1 + 1:
        w, v, frm, ew = heapq.heappop(heap)
        work += 1
        if in_tree[v]:
            continue
        in_tree[v] = True
        if frm >= 0:
            tree.append((ew, frm, v))
        for wv, t in adj[v]:
            work += 1
            if not in_tree[t]:
                heapq.heappush(heap, (wv, t, v, wv))
                work += 1
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work
    return tree


def boruvka(n, edges, counter=None):
    """Every component picks its lightest outgoing edge simultaneously;
    components at least halve per round, so log n rounds of full edge scans.
    The 1926 original, and the shape modern parallel MST codes still use."""
    dsu = DSU(n)
    tree = []
    work = 0
    components = n
    while components > 1:
        best = {}
        useful = False
        for w, u, v in edges:
            work += 1
            ru, rv = dsu.find(u), dsu.find(v)
            if ru == rv:
                continue
            if ru not in best or w < best[ru][0]:
                best[ru] = (w, u, v)
            if rv not in best or w < best[rv][0]:
                best[rv] = (w, u, v)
            useful = True
        if not useful:
            break  # disconnected graph: forest complete
        for w, u, v in best.values():
            if dsu.union(u, v):
                tree.append((w, u, v))
                components -= 1
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work + dsu.jumps
    return tree


def dijkstra(adj, src):
    import math as m
    dist = {src: 0}
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, m.inf):
            continue
        for w, v in adj[u]:
            nd = d + w
            if nd < dist.get(v, m.inf):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist


def make_graph(n, m, seed):
    rng = random.Random(seed)
    weights = rng.sample(range(1, 10**9), m)  # distinct: the MST is unique
    edges = set()
    # A spanning path first, so the graph is connected.
    order = list(range(n))
    rng.shuffle(order)
    for i in range(n - 1):
        edges.add((min(order[i], order[i + 1]), max(order[i], order[i + 1])))
    while len(edges) < m:
        u, v = rng.sample(range(n), 2)
        edges.add((min(u, v), max(u, v)))
    edges = [(w, u, v) for w, (u, v) in zip(weights, sorted(edges))]
    edges.sort()
    adj = [[] for _ in range(n)]
    for w, u, v in edges:
        adj[u].append((w, v))
        adj[v].append((w, u))
    return edges, adj


if __name__ == "__main__":
    N = 1200
    sparse_edges, sparse_adj = make_graph(N, 8000, 20260827)
    dense_edges, dense_adj = make_graph(N, 120000, 20260828)

    # Oracle 1: with distinct weights the MST is unique, so all four
    # methods must return the IDENTICAL edge set, not merely equal weight.
    c_uf, c_bfs, c_prim, c_bor = {}, {}, {}, {}
    t_uf = kruskal_uf(N, sparse_edges, c_uf)
    t_bfs = kruskal_bfs(N, sparse_edges, c_bfs)
    t_prim = prim_heap(N, sparse_adj, c_prim)
    t_bor = boruvka(N, sparse_edges, c_bor)
    canon = lambda t: sorted((w, min(u, v), max(u, v)) for w, u, v in t)
    assert canon(t_uf) == canon(t_bfs) == canon(t_prim) == canon(t_bor)
    assert len(t_uf) == N - 1

    # Oracle 2: it spans and is acyclic: n-1 edges uniting all n vertices.
    d = DSU(N)
    for w, u, v in t_uf:
        assert d.union(u, v), "a tree edge closed a cycle"
    assert len({d.find(x) for x in range(N)}) == 1, "must span"

    # Oracle 3: the cycle property, the certificate of minimality: every
    # non-tree edge is the strictly heaviest edge on the cycle it closes.
    tree_adj = [[] for _ in range(N)]
    for w, u, v in t_uf:
        tree_adj[u].append((w, v))
        tree_adj[v].append((w, u))

    def max_on_path(a, b):
        prev = {a: (None, 0)}
        q = deque([a])
        while q:
            x = q.popleft()
            if x == b:
                break
            for w, y in tree_adj[x]:
                if y not in prev:
                    prev[y] = (x, w)
                    q.append(y)
        best = 0
        x = b
        while prev[x][0] is not None:
            best = max(best, prev[x][1])
            x = prev[x][0]
        return best

    tree_set = {(min(u, v), max(u, v)) for _, u, v in t_uf}
    rng = random.Random(9)
    non_tree = [e for e in sparse_edges if (min(e[1], e[2]), max(e[1], e[2])) not in tree_set]
    for w, u, v in rng.sample(non_tree, 500):
        assert w > max_on_path(u, v), "cycle property violated: not an MST"

    # Oracle 4: the flat forest. Path compression keeps the average find
    # nearly constant: parent-jumps per find stay under 2.
    assert c_uf["jumps"] / c_uf["finds"] < 2.0, c_uf["jumps"] / c_uf["finds"]

    # Oracle 5: a disconnected graph yields a forest, not an error.
    iso_edges = [e for e in sparse_edges if e[1] != 0 and e[2] != 0]
    forest = kruskal_uf(N, iso_edges)
    d2 = DSU(N)
    for w, u, v in forest:
        d2.union(u, v)
    comps = len({d2.find(x) for x in range(N)})
    assert comps == 2 and len(forest) == N - 2

    # Oracle 6: the never-here, measured. The MST connects cheapest; it
    # does not route shortest. Compare tree-path lengths to true shortest
    # paths over 100 random pairs.
    dist0 = dijkstra(sparse_adj, 0)

    def tree_path_len(a, b):
        prev = {a: (None, 0)}
        q = deque([a])
        while q:
            x = q.popleft()
            if x == b:
                break
            for w, y in tree_adj[x]:
                if y not in prev:
                    prev[y] = (x, w)
                    q.append(y)
        total = 0
        x = b
        while prev[x][0] is not None:
            total += prev[x][1]
            x = prev[x][0]
        return total

    worst = 1.0
    for v in rng.sample(range(1, N), 100):
        ratio = tree_path_len(0, v) / dist0[v]
        worst = max(worst, ratio)
    assert worst > 1.5, "the MST detour should be visible"

    # The dense arena.
    cd_uf, cd_prim, cd_bor = {}, {}, {}
    td_uf = kruskal_uf(N, dense_edges, cd_uf)
    td_prim = prim_heap(N, dense_adj, cd_prim)
    td_bor = boruvka(N, dense_edges, cd_bor)
    assert canon(td_uf) == canon(td_prim) == canon(td_bor)

    sort_charge = lambda m: int(m * math.log2(m))
    print(f"contest: n = {N:,}; work = element touches (Kruskal rows add an E log E sort charge):")
    print(f"  {'method':<26} {'sparse, E=8,000':>16} {'dense, E=120,000':>17}")
    print(f"  {'Kruskal x union-find':<26} {c_uf['work'] + sort_charge(8000):>16,} {cd_uf['work'] + sort_charge(120000):>17,}")
    print(f"  {'Kruskal x BFS cycle test':<26} {c_bfs['work'] + sort_charge(8000):>16,} {'not run':>17}")
    print(f"  {'Prim x binary heap':<26} {c_prim['work']:>16,} {cd_prim['work']:>17,}")
    print(f"  {'Boruvka rounds':<26} {c_bor['work']:>16,} {cd_bor['work']:>17,}")
    print(f"union-find flatness: {c_uf['jumps'] / c_uf['finds']:.2f} parent-jumps per find (puzzle 08's promise, kept)")
    print(f"MST paths vs shortest paths: worst detour x{worst:.1f} over 100 pairs (the tree routes cheaply, not shortly)")
    print("OK: four methods return the identical unique MST, the cycle property certifies it, the forest stays flat, and the detour is measured")
