# Puzzle 21: Kahn's algorithm x zero in-degree queue
# Order tasks so every task follows all its prerequisites, or prove no such
# order exists and say exactly what is stuck.
#
# The pairing is the point. The control structure is source removal: a task
# with no unmet prerequisites is safe to do now; do it, delete it, repeat
# until nothing remains. The heuristic is HOW the ready tasks are found: a
# maintained queue of zero in-degree vertices, updated as each removal
# decrements its neighbors. That single bookkeeping choice is the difference
# between touching every edge once, V+E total (asserted exactly below), and
# rescanning all vertices per removal, V^2. And the queue is a genuine slot:
# FIFO gives parallel waves, a min-heap gives the lexicographically smallest
# order, a priority gives scheduling. The frontier is the algorithm; the
# order within the frontier is policy.
import heapq
import random
from collections import deque


def kahn(n, adj, indeg, counter=None, queue="fifo"):
    """Topological order via the ready queue. Returns (order, leftover):
    leftover is empty iff the graph is acyclic; otherwise it is every task
    that can never unblock (cycle members and everything downstream)."""
    deg = list(indeg)
    ready = [v for v in range(n) if deg[v] == 0]
    if queue == "heap":
        heapq.heapify(ready)
    else:
        ready = deque(ready)
    order = []
    work = n  # the initial in-degree pass
    while ready:
        v = heapq.heappop(ready) if queue == "heap" else ready.popleft()
        work += 1
        order.append(v)
        for w in adj[v]:
            work += 1
            deg[w] -= 1
            if deg[w] == 0:
                if queue == "heap":
                    heapq.heappush(ready, w)
                else:
                    ready.append(w)
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work
    leftover = [v for v in range(n) if deg[v] > 0]
    return order, leftover


def kahn_rescan(n, adj, indeg, counter=None):
    """The same source-removal idea with the heuristic removed: every round,
    rescan all vertices for one with no unmet prerequisites. V^2 + E."""
    deg = list(indeg)
    done = [False] * n
    order = []
    work = 0
    while len(order) < n:
        found = -1
        for v in range(n):
            work += 1
            if not done[v] and deg[v] == 0:
                found = v
                break
        if found < 0:
            break  # stuck: a cycle
        done[found] = True
        order.append(found)
        for w in adj[found]:
            work += 1
            deg[w] -= 1
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work
    leftover = [v for v in range(n) if not done[v]]
    return order, leftover


def dfs_toposort(n, adj, counter=None):
    """Reverse finishing order of an iterative DFS. Returns (order, cycle):
    cycle is None on a DAG, otherwise an actual directed cycle, recovered
    from the back edge, which is the diagnosis Kahn cannot give."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    parent = [-1] * n
    order = []
    work = 0
    for root in range(n):
        if color[root] != WHITE:
            continue
        stack = [(root, iter(adj[root]))]
        color[root] = GRAY
        while stack:
            v, it = stack[-1]
            advanced = False
            for w in it:
                work += 1
                if color[w] == WHITE:
                    color[w] = GRAY
                    parent[w] = v
                    stack.append((w, iter(adj[w])))
                    advanced = True
                    break
                if color[w] == GRAY:
                    # Back edge v->w: the tree path w..v plus that edge is a
                    # directed cycle. Walk parents from v back to w.
                    path = [v]
                    u = v
                    while u != w:
                        u = parent[u]
                        path.append(u)
                    if counter is not None:
                        counter["work"] = counter.get("work", 0) + work
                    return None, list(reversed(path))
            if not advanced:
                color[v] = BLACK
                order.append(v)
                stack.pop()
        work += 1
    if counter is not None:
        counter["work"] = counter.get("work", 0) + work
    return list(reversed(order)), None


def waves_of(n, adj, indeg):
    """Kahn by generations: everything ready now is one parallel wave. The
    wave count equals the longest prerequisite chain plus one."""
    deg = list(indeg)
    frontier = [v for v in range(n) if deg[v] == 0]
    waves = []
    while frontier:
        waves.append(frontier)
        nxt = []
        for v in frontier:
            for w in adj[v]:
                deg[w] -= 1
                if deg[w] == 0:
                    nxt.append(w)
        frontier = nxt
    return waves


def valid_order(n, edges, order):
    if sorted(order) != list(range(n)):
        return False
    pos = {v: i for i, v in enumerate(order)}
    return all(pos[u] < pos[v] for u, v in edges)


def make_dag(n=2000, m=8000, seed=20260827):
    rng = random.Random(seed)
    perm = list(range(n))
    rng.shuffle(perm)  # hidden true order, so vertex ids carry no hint
    edges = set()
    while len(edges) < m:
        i, j = sorted(rng.sample(range(n), 2))
        edges.add((perm[i], perm[j]))
    edges = sorted(edges)
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
    return adj, indeg, edges


if __name__ == "__main__":
    N = 2000
    adj, indeg, edges = make_dag(N)

    # Oracle 1: validity from the definition, for every method. Orders may
    # differ; each must place every task after all its prerequisites.
    c_q, c_r, c_d = {}, {}, {}
    order_q, left_q = kahn(N, adj, indeg, c_q)
    order_r, left_r = kahn_rescan(N, adj, indeg, c_r)
    order_d, cyc_d = dfs_toposort(N, adj, c_d)
    assert not left_q and not left_r and cyc_d is None
    assert valid_order(N, edges, order_q)
    assert valid_order(N, edges, order_r)
    assert valid_order(N, edges, order_d)

    # Oracle 2: the heuristic's price, exact. The ready queue touches each
    # vertex twice (count + pop) and each edge once; the rescan pays a full
    # vertex sweep per extraction.
    assert c_q["work"] == 2 * N + len(edges), c_q["work"]
    assert c_r["work"] > N * N / 2, c_r["work"]

    # Oracle 3: cycle diagnosis, both dialects. Plant a 5-cycle and its
    # downstream: Kahn names every task that can never unblock; DFS returns
    # an actual cycle, verified edge by edge.
    adj_c = [list(a) for a in adj]
    indeg_c = list(indeg)
    ring = [order_q[100], order_q[300], order_q[500], order_q[700], order_q[900]]
    for a, b in zip(ring, ring[1:] + ring[:1]):
        adj_c[a].append(b)
        indeg_c[b] += 1
    _, left_c = kahn(N, adj_c, indeg_c)
    assert set(ring) <= set(left_c), "every ring member must be reported stuck"
    _, cyc = dfs_toposort(N, adj_c)
    assert cyc is not None and len(cyc) >= 2
    cyc_edges = set()
    for u in range(N):
        for v in adj_c[u]:
            cyc_edges.add((u, v))
    for a, b in zip(cyc, cyc[1:] + cyc[:1]):
        assert (a, b) in cyc_edges, "DFS's reported cycle must be a real cycle"

    # Oracle 4: the queue is a policy slot. A min-heap queue yields the
    # lexicographically smallest order, proven against brute-force
    # enumeration of ALL topological orders of small random DAGs.
    def all_orders(n, adj_s, indeg_s):
        out = []
        deg = list(indeg_s)
        used = [False] * n

        def go(prefix):
            if len(prefix) == n:
                out.append(list(prefix))
                return
            for v in range(n):
                if not used[v] and deg[v] == 0:
                    used[v] = True
                    for w in adj_s[v]:
                        deg[w] -= 1
                    prefix.append(v)
                    go(prefix)
                    prefix.pop()
                    for w in adj_s[v]:
                        deg[w] += 1
                    used[v] = False

        go([])
        return out

    rng = random.Random(4)
    for _ in range(40):
        ns = rng.randint(3, 7)
        es = set()
        for _ in range(rng.randint(2, 9)):
            i, j = sorted(rng.sample(range(ns), 2))
            es.add((i, j))
        adj_s = [[] for _ in range(ns)]
        indeg_s = [0] * ns
        for u, v in es:
            adj_s[u].append(v)
            indeg_s[v] += 1
        every = all_orders(ns, adj_s, indeg_s)
        lex, _ = kahn(ns, adj_s, indeg_s, queue="heap")
        assert lex == min(every), (es, lex, min(every))

    # Oracle 5: waves. The number of parallel generations equals the
    # longest prerequisite chain plus one, computed independently by DP.
    waves = waves_of(N, adj, indeg)
    assert sum(len(w) for w in waves) == N
    longest = [0] * N
    for v in order_q:  # DP over a known-valid topological order
        for w in adj[v]:
            longest[w] = max(longest[w], longest[v] + 1)
    assert len(waves) == max(longest) + 1, (len(waves), max(longest) + 1)

    # Oracle 6: the never-here. No scalar sort key can encode a partial
    # order: sorting tasks by total in-degree violates real prerequisites,
    # counted exactly.
    by_indeg = sorted(range(N), key=lambda v: (indeg[v], v))
    pos = {v: i for i, v in enumerate(by_indeg)}
    violations = sum(1 for u, v in edges if pos[u] > pos[v])
    assert violations > len(edges) / 10, violations

    print(f"contest: {N:,} tasks, {len(edges):,} dependencies; work = vertex and edge touches:")
    print(f"  {'method':<24} {'work':>10}   cycle diagnosis (planted 5-ring)      parallel waves")
    print(f"  {'Kahn x ready queue':<24} {c_q['work']:>10,}   names all {len(left_c)} tasks that cannot start   {len(waves)} waves = longest chain + 1")
    print(f"  {'Kahn x source rescan':<24} {c_r['work']:>10,}   same report, at {c_r['work'] // c_q['work']}x the price          same")
    print(f"  {'DFS finish-order':<24} {c_d['work']:>10,}   returns an actual cycle, length {len(cyc)}      not available")
    print(f"sorting by in-degree as a shortcut violates {violations:,} of {len(edges):,} dependencies")
    print("OK: three orders valid by definition, V+E exact, both cycle dialects verified, lex-min proven exhaustively, waves = longest chain")
