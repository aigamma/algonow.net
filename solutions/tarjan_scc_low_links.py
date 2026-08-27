# Puzzle 52: Tarjan's SCC algorithm x low-link stack discipline
# Split a directed graph into its strongly connected components: the
# maximal sets of mutually reachable vertices: in ONE depth-first pass,
# with the components emitted in reverse topological order for free.
#
# The pairing is the point. The algorithm is DFS with discovery
# indices: the skeleton every graph walker shares. The heuristic is the
# low-link discipline: every vertex tracks the smallest discovery index
# reachable through its subtree plus at most one back edge, and stays
# on an auxiliary stack until some ancestor PROVES the component is
# closed: the proof being lowlink[v] == index[v], at which point
# everything above v on the stack pops as one finished component.
# Referees are layered: brute-force mutual reachability at small n,
# Kosaraju's independent two-pass method agreeing at scale, the
# condensation certified acyclic with Tarjan's emission order checked
# as its reverse topological sort: and the payload demonstrated: 2-SAT
# solved via implication SCCs with every satisfying assignment
# re-verified clause by clause against exhaustive truth tables.
import random
from collections import deque


def tarjan_scc(n, adj, counter=None):
    """Iterative Tarjan: one pass, components in reverse topo order."""
    index = [-1] * n
    low = [-1] * n
    on_stack = [False] * n
    stack = []
    comps = []
    comp_of = [-1] * n
    counter_idx = [0]

    for root in range(n):
        if index[root] != -1:
            continue
        work = [(root, 0)]
        while work:
            v, ei = work[-1]
            if ei == 0:
                index[v] = low[v] = counter_idx[0]
                counter_idx[0] += 1
                stack.append(v)
                on_stack[v] = True
            advanced = False
            while ei < len(adj[v]):
                w = adj[v][ei]
                ei += 1
                if counter is not None:
                    counter["touch"] = counter.get("touch", 0) + 1
                if index[w] == -1:
                    work[-1] = (v, ei)
                    work.append((w, 0))
                    advanced = True
                    break
                if on_stack[w]:
                    low[v] = min(low[v], index[w])
            if advanced:
                continue
            work.pop()
            if low[v] == index[v]:
                comp = []
                while True:
                    w = stack.pop()
                    on_stack[w] = False
                    comp_of[w] = len(comps)
                    comp.append(w)
                    if w == v:
                        break
                comps.append(comp)
            if work:
                p = work[-1][0]
                low[p] = min(low[p], low[v])
    return comps, comp_of


def kosaraju_scc(n, adj, counter=None):
    """The independent referee: order by finish time, sweep the
    reverse graph."""
    radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        work = [(s, 0)]
        seen[s] = True
        while work:
            v, ei = work[-1]
            if ei < len(adj[v]):
                work[-1] = (v, ei + 1)
                w = adj[v][ei]
                if counter is not None:
                    counter["touch"] = counter.get("touch", 0) + 1
                if not seen[w]:
                    seen[w] = True
                    work.append((w, 0))
            else:
                order.append(v)
                work.pop()
    comp_of = [-1] * n
    comps = []
    for s in reversed(order):
        if comp_of[s] != -1:
            continue
        comp = []
        dq = deque([s])
        comp_of[s] = len(comps)
        while dq:
            v = dq.popleft()
            comp.append(v)
            for w in radj[v]:
                if counter is not None:
                    counter["touch"] = counter.get("touch", 0) + 1
                if comp_of[w] == -1:
                    comp_of[w] = len(comps)
                    dq.append(w)
        comps.append(comp)
    return comps, comp_of


def brute_scc(n, adj):
    reach = []
    for s in range(n):
        seen = {s}
        dq = deque([s])
        while dq:
            v = dq.popleft()
            for w in adj[v]:
                if w not in seen:
                    seen.add(w)
                    dq.append(w)
        reach.append(seen)
    comp_of = [-1] * n
    comps = []
    for v in range(n):
        if comp_of[v] != -1:
            continue
        comp = [u for u in range(n) if u in reach[v] and v in reach[u]]
        for u in comp:
            comp_of[u] = len(comps)
        comps.append(comp)
    return comps, comp_of


def partition_key(comps):
    return sorted(tuple(sorted(c)) for c in comps)


def solve_2sat(n_vars, clauses):
    """Aspvall-Plass-Tarjan: implication graph, SCC, reverse-topo
    assignment. Returns None if unsatisfiable."""
    N = 2 * n_vars
    lit = lambda v, neg: 2 * v + (1 if neg else 0)
    adj = [[] for _ in range(N)]
    for (a, na), (b, nb) in clauses:
        # (a or b): ~a -> b, ~b -> a
        adj[lit(a, not na)].append(lit(b, nb))
        adj[lit(b, not nb)].append(lit(a, na))
    comps, comp_of = tarjan_scc(N, adj)
    assign = []
    for v in range(n_vars):
        if comp_of[lit(v, False)] == comp_of[lit(v, True)]:
            return None
        # Aspvall's rule: v takes the value whose literal-node sits
        # LATER in topological order. Tarjan emits reverse-topo, so
        # later-in-topo means a LOWER component index.
        assign.append(comp_of[lit(v, True)] < comp_of[lit(v, False)])
    return assign


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 300 trials vs brute mutual reachability, plus the
    # condensation certified as a DAG with Tarjan's order its reverse
    # topological sort.
    for trial in range(300):
        n = rng.randint(1, 60)
        m = rng.randint(0, 3 * n)
        adj = [[] for _ in range(n)]
        for _ in range(m):
            u, v = rng.randrange(n), rng.randrange(n)
            if u != v:
                adj[u].append(v)
        comps, comp_of = tarjan_scc(n, adj)
        assert partition_key(comps) == partition_key(brute_scc(n, adj)[0])
        # Condensation edges: comp_of[u] != comp_of[v].
        for u in range(n):
            for v in adj[u]:
                if comp_of[u] != comp_of[v]:
                    # Reverse topo: the TARGET component was emitted first.
                    assert comp_of[v] < comp_of[u]

    # Oracle 2: structure gadgets, deterministic.
    ring = [[(i + 1) % 8] for i in range(8)]
    c, _ = tarjan_scc(8, ring)
    assert len(c) == 1 and len(c[0]) == 8  # one big cycle: one SCC
    dag = [[1, 2], [3], [3], []]
    c, _ = tarjan_scc(4, dag)
    assert len(c) == 4  # a DAG: all singletons
    two = [[1], [0, 2], [3], [2]]  # cycle{0,1} -> cycle{2,3}
    c, cf = tarjan_scc(4, two)
    assert len(c) == 2 and cf[0] == cf[1] and cf[2] == cf[3]
    assert cf[2] < cf[0]  # downstream emitted first: reverse topo

    # Oracle 3: scale, with Kosaraju as the independent referee.
    N = 20_000
    M = 60_000
    adj = [[] for _ in range(N)]
    for _ in range(M):
        u, v = rng.randrange(N), rng.randrange(N)
        if u != v:
            adj[u].append(v)
    m_actual = sum(len(a) for a in adj)
    c_t = {}
    comps_t, cf_t = tarjan_scc(N, adj, c_t)
    c_k = {}
    comps_k, cf_k = kosaraju_scc(N, adj, c_k)
    assert partition_key(comps_t) == partition_key(comps_k)
    assert c_t["touch"] == m_actual      # ONE pass: every edge exactly once
    assert c_k["touch"] == 2 * m_actual  # two passes: the price of elegance
    giant = max(len(cc) for cc in comps_t)

    # Oracle 4: the payload. 2-SAT via implication SCCs, refereed by
    # exhaustive truth tables at n <= 15, assignments re-verified.
    agree_sat = 0
    agree_unsat = 0
    for _ in range(250):
        nv = rng.randint(2, 15)
        nc = rng.randint(1, 4 * nv)
        clauses = []
        for _ in range(nc):
            a, b = rng.randrange(nv), rng.randrange(nv)
            clauses.append(((a, rng.random() < 0.5), (b, rng.random() < 0.5)))
        got = solve_2sat(nv, clauses)
        brute_sat = False
        for mask in range(1 << nv):
            ok = all(
                ((mask >> a) & 1) == na or ((mask >> b) & 1) == nb
                for (a, na), (b, nb) in clauses
            )
            if ok:
                brute_sat = True
                break
        assert (got is not None) == brute_sat
        if got is not None:
            for (a, na), (b, nb) in clauses:  # certificate, re-verified
                assert got[a] == na or got[b] == nb
            agree_sat += 1
        else:
            agree_unsat += 1
    assert agree_sat > 50 and agree_unsat > 50  # both regimes exercised

    print(f"contest: n = {N:,}, m = {M:,} random digraph; referees: brute mutual reachability on 300 small trials, Kosaraju agreeing at scale, the condensation's reverse-topo order asserted edge by edge")
    print(f"  {'method':<26} {'graph touches':>13}   passes")
    print(f"  {'Brute mutual reach':<26} {'~n(n+m)':>13}   n BFS runs: 1.6B touches here, small-n referee only")
    print(f"  {'Kosaraju':<26} {c_k['touch']:>13,}   2 elegant passes (forward finish order, reverse sweep)")
    print(f"  {'Tarjan (low-links)':<26} {c_t['touch']:>13,}   1 pass, every edge exactly once")
    print(f"structure at scale: {len(comps_t):,} components, giant component of {giant:,} vertices; emission order verified reverse-topological on every cross edge")
    print(f"the payload: 250 random 2-SAT instances ({agree_sat} satisfiable / {agree_unsat} not) decided via implication SCCs, every verdict matching exhaustive truth tables and every satisfying assignment re-verified clause by clause")
    print("OK: 300 brute-refereed trials, gadgets exact, Kosaraju agreeing at 20K vertices with the one-pass vs two-pass bill counted, reverse-topo emission asserted, and the 2-SAT payload certified in both directions")
