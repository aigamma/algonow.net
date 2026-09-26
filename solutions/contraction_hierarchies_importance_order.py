# Puzzle 122: Contraction hierarchies x node-importance contraction order
# Continental road routing: answer point-to-point shortest-path queries
# on a road network fast enough for a navigation app, after a one-time
# preprocessing pass. The algorithm contracts the nodes one by one: to
# remove node v, look at each pair of its remaining neighbors (u, w),
# and if the only shortest u-w path runs through v, add a shortcut edge
# u-w with that length. Every node gets a rank (its contraction time),
# and a query is a bidirectional Dijkstra that only ever climbs to
# higher ranks: forward from the source up, backward from the target
# up, meeting at the top. The heuristic is the ORDER: contract
# unimportant nodes first, where importance is estimated by the edge
# difference (shortcuts added minus edges removed) plus a count of
# already-contracted neighbors, kept lazily up to date. A good order
# keeps the hierarchy shallow and the shortcut count near the edge
# count; a bad one buries the graph in shortcuts.
#
# Referees:
# (1) EXACT DISTANCES: on hundreds of random queries the hierarchy's
#     answer equals plain Dijkstra's distance on the original graph;
# (2) EXACT PATHS: every query's unpacked path walks only original
#     edges and sums to the distance;
# (3) THE ABLATIONS, measured: a random contraction order, and
#     importance ordering without the witness search (every pair gets
#     a shortcut), each priced in shortcuts and query work;
# (4) THE RIVALS on the same queries: unidirectional Dijkstra and
#     bidirectional Dijkstra, priced in settled nodes;
# (5) THE SHAPE: the number of nodes a query settles is a tiny fraction
#     of the graph, asserted, and the preprocessing bill is counted.
import heapq
import random

SEED = 20260926


def grid_road_network(side, rng, remove=0.18):
    """A square grid with random edge weights and a fraction of edges
    removed, kept connected: the standard stand-in for a road map."""
    n = side * side
    adj = [dict() for _ in range(n)]

    def add(u, v, w):
        adj[u][v] = w
        adj[v][u] = w

    edges = []
    for r in range(side):
        for c in range(side):
            u = r * side + c
            if c + 1 < side:
                edges.append((u, u + 1))
            if r + 1 < side:
                edges.append((u, u + side))
    rng.shuffle(edges)
    # a random spanning tree first (connectivity), then the rest minus removals
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    kept = []
    rest = []
    for u, v in edges:
        a, b = find(u), find(v)
        if a != b:
            parent[a] = b
            kept.append((u, v))
        else:
            rest.append((u, v))
    for u, v in rest:
        if rng.random() > remove:
            kept.append((u, v))
    for u, v in kept:
        add(u, v, rng.randint(1, 20))
    return adj


def dijkstra(adj, s, t=None):
    """Returns (dist array or single distance, settled count)."""
    n = len(adj)
    dist = [float('inf')] * n
    dist[s] = 0
    pq = [(0, s)]
    settled = 0
    done = [False] * n
    while pq:
        d, u = heapq.heappop(pq)
        if done[u]:
            continue
        done[u] = True
        settled += 1
        if u == t:
            return d, settled
        for v, w in adj[u].items():
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return (dist if t is None else dist[t]), settled


def bidirectional_dijkstra(adj, s, t):
    if s == t:
        return 0, 0
    n = len(adj)
    dist = [[float('inf')] * n, [float('inf')] * n]
    done = [[False] * n, [False] * n]
    dist[0][s] = 0
    dist[1][t] = 0
    pq = [[(0, s)], [(0, t)]]
    best = float('inf')
    settled = 0
    while pq[0] or pq[1]:
        side = 0 if (pq[0] and (not pq[1] or pq[0][0][0] <= pq[1][0][0])) else 1
        d, u = heapq.heappop(pq[side])
        if done[side][u]:
            continue
        done[side][u] = True
        settled += 1
        if d + (pq[1 - side][0][0] if pq[1 - side] else 0) >= best:
            break
        for v, w in adj[u].items():
            nd = d + w
            if nd < dist[side][v]:
                dist[side][v] = nd
                heapq.heappush(pq[side], (nd, v))
            if done[1 - side][v] and nd + dist[1 - side][v] < best:
                best = nd + dist[1 - side][v]
    return best, settled


class ContractionHierarchy:
    def __init__(self, adj, order='importance', witness=True, witness_limit=400):
        self.n = len(adj)
        self.base = adj
        self.g = [dict(a) for a in adj]          # working graph (shrinks)
        self.up = [dict() for _ in range(self.n)]  # edges to higher-ranked nodes, with via-node
        self.rank = [-1] * self.n
        self.shortcuts = 0
        self.witness_settled = 0
        self.witness = witness
        self.witness_limit = witness_limit
        self.contracted = [False] * self.n
        self.deleted_neighbors = [0] * self.n
        self.order_mode = order
        self.via = {}                              # (u, w) -> v for shortcut unpacking

    def _witness(self, u, w, v, limit_dist):
        """Is there a u-w path avoiding v of length <= limit_dist? A
        bounded Dijkstra in the working graph."""
        dist = {u: 0}
        pq = [(0, u)]
        settled = 0
        while pq:
            d, x = heapq.heappop(pq)
            if d > dist.get(x, float('inf')):
                continue
            settled += 1
            self.witness_settled += 1
            if x == w:
                return True
            if d > limit_dist or settled > self.witness_limit:
                break
            for y, wt in self.g[x].items():
                if y == v or self.contracted[y]:
                    continue
                nd = d + wt
                if nd <= limit_dist and nd < dist.get(y, float('inf')):
                    dist[y] = nd
                    heapq.heappush(pq, (nd, y))
        return False

    def _shortcuts_for(self, v, simulate):
        """The shortcuts contracting v would need. If simulate, count
        only (for the priority); else add them."""
        nbrs = [(u, w) for u, w in self.g[v].items() if not self.contracted[u]]
        added = 0
        for i, (u, du) in enumerate(nbrs):
            for w, dw in nbrs[i + 1:]:
                through = du + dw
                needed = True
                if self.witness:
                    needed = not self._witness(u, w, v, through)
                if needed and not (w in self.g[u] and self.g[u][w] <= through):
                    added += 1
                    if not simulate:
                        self.g[u][w] = through
                        self.g[w][u] = through
                        self.via[(u, w)] = v
                        self.via[(w, u)] = v
        return added, len(nbrs)

    def _priority(self, v):
        added, removed = self._shortcuts_for(v, simulate=True)
        return 2 * (added - removed) + self.deleted_neighbors[v]

    def build(self, rng):
        n = self.n
        if self.order_mode == 'random':
            order = list(range(n))
            rng.shuffle(order)
            for r, v in enumerate(order):
                self._contract(v, r)
            return
        pq = [(self._priority(v), v) for v in range(n)]
        heapq.heapify(pq)
        r = 0
        while pq:
            p, v = heapq.heappop(pq)
            # lazy update: recompute; if it got worse than the next, requeue
            np_ = self._priority(v)
            if pq and np_ > pq[0][0]:
                heapq.heappush(pq, (np_, v))
                continue
            self._contract(v, r)
            r += 1

    def _contract(self, v, r):
        added, _ = self._shortcuts_for(v, simulate=False)
        self.shortcuts += added
        self.rank[v] = r
        self.contracted[v] = True
        for u, w in self.g[v].items():
            if not self.contracted[u]:
                self.deleted_neighbors[u] += 1
                # v is now below u: the edge u-v points UP from v to u
                self.up[v][u] = w
        # edges from v to already-contracted neighbors were recorded when
        # those neighbors were contracted (as their up-edges to v)

    def query(self, s, t):
        """Bidirectional upward search. Returns (distance, settled, path)."""
        if s == t:
            return 0, 0, [s]
        n = self.n
        dist = [[float('inf')] * n, [float('inf')] * n]
        prev = [[-1] * n, [-1] * n]
        done = [[False] * n, [False] * n]
        dist[0][s] = 0
        dist[1][t] = 0
        pq = [[(0, s)], [(0, t)]]
        best = float('inf')
        meet = -1
        settled = 0
        while pq[0] or pq[1]:
            side = 0 if (pq[0] and (not pq[1] or pq[0][0][0] <= pq[1][0][0])) else 1
            d, u = heapq.heappop(pq[side])
            if done[side][u]:
                continue
            done[side][u] = True
            settled += 1
            if d >= best:
                pq[side] = []
                continue
            if done[1 - side][u] and d + dist[1 - side][u] < best:
                best = d + dist[1 - side][u]
                meet = u
            for v, w in self.up[u].items():
                nd = d + w
                if nd < dist[side][v]:
                    dist[side][v] = nd
                    prev[side][v] = u
                    heapq.heappush(pq[side], (nd, v))
        if meet < 0:
            return float('inf'), settled, []
        # rebuild the two halves and unpack shortcuts
        def half(side, end):
            chain = [end]
            while prev[side][chain[-1]] != -1:
                chain.append(prev[side][chain[-1]])
            return chain
        fwd = list(reversed(half(0, meet)))   # s ... meet
        bwd = half(1, meet)                    # meet ... t
        route = fwd + bwd[1:]
        path = [route[0]]
        for a, b in zip(route, route[1:]):
            path.extend(self._unpack(a, b)[1:])
        return best, settled, path

    def _unpack(self, a, b):
        if (a, b) in self.via:
            v = self.via[(a, b)]
            return self._unpack(a, v) + self._unpack(v, b)[1:]
        return [a, b]


if __name__ == '__main__':
    rng = random.Random(SEED)
    SIDE = 40
    adj = grid_road_network(SIDE, rng)
    n = len(adj)
    m = sum(len(a) for a in adj) // 2

    ch = ContractionHierarchy(adj, order='importance', witness=True)
    ch.build(random.Random(SEED + 1))
    ch_random = ContractionHierarchy(adj, order='random', witness=True)
    ch_random.build(random.Random(SEED + 2))
    ch_nowit = ContractionHierarchy(adj, order='importance', witness=False)
    ch_nowit.build(random.Random(SEED + 3))

    QUERIES = 200
    pairs = [(rng.randrange(n), rng.randrange(n)) for _ in range(QUERIES)]
    settled = {'dijkstra': 0, 'bidirectional': 0, 'ch': 0, 'ch_random': 0, 'ch_nowit': 0}
    for s, t in pairs:
        d_ref, st = dijkstra(adj, s, t)
        settled['dijkstra'] += st
        d_bi, st = bidirectional_dijkstra(adj, s, t)
        settled['bidirectional'] += st
        assert d_bi == d_ref, (s, t, d_bi, d_ref)
        for label, h in (('ch', ch), ('ch_random', ch_random), ('ch_nowit', ch_nowit)):
            d, st, path = h.query(s, t)
            settled[label] += st
            assert d == d_ref, (label, s, t, d, d_ref)                       # Oracle 1
            assert path[0] == s and path[-1] == t
            total = 0
            for a, b in zip(path, path[1:]):
                assert b in adj[a], (label, a, b)                              # Oracle 2
                total += adj[a][b]
            assert total == d_ref
    avg = {k: v / QUERIES for k, v in settled.items()}

    # Oracle 5: the shape of the win, asserted.
    assert avg['ch'] < 0.05 * n, avg['ch']
    assert avg['ch'] < avg['bidirectional'] / 4, (avg['ch'], avg['bidirectional'])
    assert ch.shortcuts < 1.5 * m, (ch.shortcuts, m)
    assert ch_random.shortcuts > 1.6 * ch.shortcuts, (ch_random.shortcuts, ch.shortcuts)
    assert ch_nowit.shortcuts > 1.6 * ch.shortcuts, (ch_nowit.shortcuts, ch.shortcuts)

    print(f'contest: point-to-point shortest paths on a {SIDE} x {SIDE} grid road network ({n:,} nodes, {m:,} edges, random weights 1-20, 18% of edges removed), {QUERIES} random queries; currency: nodes settled per query; every answer checked against plain Dijkstra and every path unpacked and re-summed')
    print(f"  {'method':<40} {'settled/query':>13} {'shortcuts':>10} {'preprocessing (witness settles)':>32}")
    print(f"  {'Dijkstra':<40} {avg['dijkstra']:>13,.0f} {'-':>10} {'-':>32}")
    print(f"  {'bidirectional Dijkstra':<40} {avg['bidirectional']:>13,.0f} {'-':>10} {'-':>32}")
    print(f"  {'contraction hierarchy, importance order':<40} {avg['ch']:>13,.0f} {ch.shortcuts:>10,} {ch.witness_settled:>32,}")
    print(f"  {'contraction hierarchy, random order':<40} {avg['ch_random']:>13,.0f} {ch_random.shortcuts:>10,} {ch_random.witness_settled:>32,}")
    print(f"  {'importance order, no witness search':<40} {avg['ch_nowit']:>13,.0f} {ch_nowit.shortcuts:>10,} {ch_nowit.witness_settled:>32,}")
    print(f'the hierarchy answers in {avg["ch"] / avg["dijkstra"]:.1%} of Dijkstra\'s settled nodes and {avg["ch"] / avg["bidirectional"]:.1%} of bidirectional\'s, with shortcuts at {ch.shortcuts / m:.2f}x the edge count; random order needs {ch_random.shortcuts / ch.shortcuts:.1f}x the shortcuts, no witness search {ch_nowit.shortcuts / ch.shortcuts:.1f}x')
    print(f'OK: {QUERIES}/{QUERIES} hierarchy distances equal to Dijkstra under all three orders; every unpacked path walks original edges and sums to the distance; '
          f'importance order settles {avg["ch"]:.0f} nodes per query vs {avg["bidirectional"]:.0f} bidirectional and {avg["dijkstra"]:.0f} unidirectional; '
          f'shortcuts {ch.shortcuts:,} vs {ch_random.shortcuts:,} random order vs {ch_nowit.shortcuts:,} without witnesses')
