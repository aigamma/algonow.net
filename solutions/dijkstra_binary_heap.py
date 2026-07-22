# Puzzle 07: Dijkstra's algorithm x binary heap priority queue
# Shortest paths from one source on a graph with nonnegative edge weights.
#
# The pairing is the point. Dijkstra's method is a proof strategy: settle the
# nearest unsettled vertex, and its distance can never improve again. Which
# data structure answers "nearest unsettled" decides whether the same proof
# costs O(V^2) or O(E log V), and on a sparse graph that is the difference
# between a second and an hour.
import heapq
import math
import random
from collections import deque


def dijkstra_heap(graph, source, counter=None):
    """Shortest distances from `source` using a binary heap.

    `graph` maps u -> list of (v, weight) with weight >= 0. Returns a dict of
    vertex -> distance, omitting unreachable vertices.

    Lazy deletion: instead of decreasing a key in place, push a fresh entry
    and skip stale pops. That is why the heap can exceed V entries, and why
    the loop checks `if d > dist[u]`.
    """
    dist = {source: 0}
    heap = [(0, source)]
    settled = set()
    while heap:
        d, u = heapq.heappop(heap)
        if counter is not None:
            counter["pops"] = counter.get("pops", 0) + 1
        if u in settled or d > dist.get(u, math.inf):
            continue
        settled.add(u)
        for v, w in graph.get(u, ()):  # relax every outgoing edge
            if counter is not None:
                counter["edges"] = counter.get("edges", 0) + 1
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
                if counter is not None:
                    counter["pushes"] = counter.get("pushes", 0) + 1
    return dist


# ---------------------------------------------------------------- the rivals


def dijkstra_scan(graph, source, counter=None):
    """The original 1959 formulation: no priority queue at all.

    Each round scans every unsettled vertex to find the nearest. That is
    O(V^2) regardless of how few edges exist, which is why it wins on dense
    graphs and loses badly on sparse ones.
    """
    dist = {source: 0}
    settled = set()
    vertices = set(graph) | {v for us in graph.values() for v, _ in us} | {source}
    while True:
        u, best = None, math.inf
        for x in vertices:
            if x not in settled and dist.get(x, math.inf) < best:
                u, best = x, dist[x]
            if counter is not None:
                counter["scans"] = counter.get("scans", 0) + 1
        if u is None:
            return dist
        settled.add(u)
        for v, w in graph.get(u, ()):
            if counter is not None:
                counter["edges"] = counter.get("edges", 0) + 1
            if best + w < dist.get(v, math.inf):
                dist[v] = best + w


def bellman_ford(graph, source, counter=None):
    """Relax every edge V-1 times. Slower, and it survives negative weights.

    Included because the honest reason to reach for it is not speed: it is
    the only method here that stays correct when an edge can be negative,
    which is exactly where Dijkstra's proof collapses.
    """
    vertices = set(graph) | {v for us in graph.values() for v, _ in us} | {source}
    dist = {source: 0}
    for _ in range(len(vertices) - 1):
        changed = False
        for u in graph:
            if u not in dist:
                continue
            for v, w in graph[u]:
                if counter is not None:
                    counter["relaxations"] = counter.get("relaxations", 0) + 1
                if dist[u] + w < dist.get(v, math.inf):
                    dist[v] = dist[u] + w
                    changed = True
        if not changed:
            break
    return dist


def bfs_unweighted(graph, source, counter=None):
    """Breadth-first search, correct only if every edge has the same weight.

    On this page it is the control that shows what the priority queue is for:
    a queue is a heap for a graph where every key is equal.
    """
    dist = {source: 0}
    q = deque([source])
    while q:
        u = q.popleft()
        if counter is not None:
            counter["pops"] = counter.get("pops", 0) + 1
        for v, _w in graph.get(u, ()):
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist


# ------------------------------------------------------------- the instances


def grid_graph(n, seed=11):
    """A sparse graph: an n by n lattice, four neighbours, random weights.

    Sparse is the normal case in practice (road networks, dependency graphs,
    social graphs), and it is where the heap earns its keep.
    """
    rng = random.Random(seed)
    g = {}
    idx = lambda r, c: r * n + c
    for r in range(n):
        for c in range(n):
            u = idx(r, c)
            g[u] = []
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n:
                    g[u].append((idx(nr, nc), rng.randint(1, 9)))
    return g, n * n


def dense_graph(v, seed=13):
    """A dense graph: every vertex connected to every other."""
    rng = random.Random(seed)
    g = {u: [(w, rng.randint(1, 9)) for w in range(v) if w != u] for u in range(v)}
    return g, v


def contest():
    """Race every method on one sparse instance and report the numbers."""
    n = 30
    graph, vcount = grid_graph(n)
    edges = sum(len(v) for v in graph.values())
    rows = []

    c = {}
    heap_dist = dijkstra_heap(graph, 0, c)
    rows.append(("Dijkstra x binary heap", c.get("pops", 0) + c.get("pushes", 0) + c.get("edges", 0), heap_dist))

    c = {}
    scan_dist = dijkstra_scan(graph, 0, c)
    rows.append(("Dijkstra x linear scan", c.get("scans", 0) + c.get("edges", 0), scan_dist))

    c = {}
    bf_dist = bellman_ford(graph, 0, c)
    rows.append(("Bellman-Ford", c.get("relaxations", 0), bf_dist))

    c = {}
    bfs_dist = bfs_unweighted(graph, 0, c)
    rows.append(("Breadth-first search", c.get("pops", 0), bfs_dist))

    return vcount, edges, rows


if __name__ == "__main__":
    # Oracle 1: the heap version must agree with the textbook scan version on
    # many random graphs. Two independent implementations of one definition.
    rng = random.Random(5)
    for trial in range(12):
        n = rng.randint(6, 40)
        g = {u: [] for u in range(n)}
        for u in range(n):
            for _ in range(rng.randint(1, 4)):
                v = rng.randrange(n)
                if v != u:
                    g[u].append((v, rng.randint(1, 20)))
        a = dijkstra_heap(g, 0)
        b = dijkstra_scan(g, 0)
        c = bellman_ford(g, 0)
        assert a == {k: v for k, v in b.items() if v < math.inf}, f"trial {trial}: heap vs scan"
        assert a == c, f"trial {trial}: heap vs Bellman-Ford"

    # Oracle 2: distances must satisfy the triangle inequality along edges,
    # which is the property that makes them shortest paths at all.
    graph, _ = grid_graph(20)
    dist = dijkstra_heap(graph, 0)
    for u, edges in graph.items():
        for v, w in edges:
            if u in dist and v in dist:
                assert dist[v] <= dist[u] + w + 1e-9, "an edge violates the shortest-path bound"

    # Oracle 3: the failure that defines the boundary, pinned exactly.
    #
    # Building this took a correction worth keeping. A single negative edge is
    # not enough to fool this implementation: because it pushes improved keys
    # rather than decreasing them, a vertex whose distance improves before it
    # is settled still comes out right. The failure needs a vertex to be
    # SETTLED at a wrong value and then have that value read by a successor.
    #
    #   0 ->1 costs 1      1 ->3 costs 1
    #   0 ->2 costs 5      2 ->1 costs -10
    #
    # Dijkstra settles 1 at distance 1, relaxes 3 to 2, and only later
    # discovers 1 is really -5. By then 3 has been settled from a stale
    # parent and is never revisited. True distance to 3 is -4.
    neg = {0: [(1, 1), (2, 5)], 1: [(3, 1)], 2: [(1, -10)], 3: []}
    dj = dijkstra_heap(neg, 0)
    bf = bellman_ford(neg, 0)
    assert dj[3] == 2, f"Dijkstra should report the stale 2 here, got {dj[3]}"
    assert bf[3] == -4, f"Bellman-Ford must find the true -4 path, got {bf[3]}"
    assert dj[3] != bf[3], "the whole point is that these disagree"

    # Oracle 4: BFS is right only when every weight is 1.
    unit = {u: [(v, 1) for v, _ in es] for u, es in grid_graph(12)[0].items()}
    assert bfs_unweighted(unit, 0) == dijkstra_heap(unit, 0), "BFS must match on unit weights"

    # Oracle 5: the published contest.
    vcount, edges, rows = contest()
    heap_dist = rows[0][2]
    for name, _work, dist in rows[:3]:
        assert dist == heap_dist, f"{name} disagreed with the heap version"
    work = {name: w for name, w, _ in rows}
    assert work["Dijkstra x binary heap"] < work["Dijkstra x linear scan"], (
        "on a sparse graph the heap must beat the scan"
    )
    assert work["Bellman-Ford"] > work["Dijkstra x binary heap"], (
        "Bellman-Ford must cost more than Dijkstra when weights are nonnegative"
    )

    print(f"contest on a {vcount}-vertex sparse grid with {edges} edges, source 0:")
    for name, w, _dist in rows:
        print(f"  {name:<26} work {w:>9,}")

    # The crossover the page quotes: on a dense graph the scan wins back.
    dg, dv = dense_graph(250)
    c1, c2 = {}, {}
    dijkstra_heap(dg, 0, c1)
    dijkstra_scan(dg, 0, c2)
    heap_work = c1.get("pops", 0) + c1.get("pushes", 0) + c1.get("edges", 0)
    scan_work = c2.get("scans", 0) + c2.get("edges", 0)
    print(f"dense {dv}-vertex graph: heap work {heap_work:,}, scan work {scan_work:,}")

    print("OK: heap matches scan and Bellman-Ford, and fails as expected on a negative edge")
