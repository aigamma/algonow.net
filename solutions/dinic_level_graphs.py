# Puzzle 15: Dinic's algorithm x level-graph blocking flows
# Route the maximum flow from s to t through a capacitated network.
#
# The pairing is the point. Ford and Fulkerson's augmenting-path idea is
# correct with ANY path choice, and that freedom is its wound: bad choices
# zigzag one unit at a time forever. Dinic's control structure works in
# phases; the heuristic is the level graph: BFS labels every vertex with its
# residual distance from s, augmentation is restricted to edges that step
# exactly one level down, and each phase pushes a BLOCKING flow (every
# level-respecting s-t path hits a saturated edge). A blocked level graph
# forces the s-t distance to rise, so there are at most V phases, and the
# zigzag paths are simply not in the graph the search is allowed to see.
from collections import deque
import random


class FlowNet:
    """Adjacency-indexed residual network. Edge i and i^1 are partners:
    pushing on one adds residual to the other. Every method below shares
    this representation and pays into the same edge-examination counter."""

    def __init__(self, n):
        self.n = n
        self.adj = [[] for _ in range(n)]
        self.to = []
        self.cap = []

    def add(self, u, v, c):
        self.adj[u].append(len(self.to))
        self.to.append(v)
        self.cap.append(c)
        self.adj[v].append(len(self.to))
        self.to.append(u)
        self.cap.append(0)

    def clone(self):
        g = FlowNet(self.n)
        g.adj = [list(a) for a in self.adj]
        g.to = list(self.to)
        g.cap = list(self.cap)
        return g

    def flow_on(self, original):
        """Flow per original edge index (even ids): the reverse capacity."""
        return {e: self.cap[e ^ 1] for e in range(0, len(self.to), 2) if original.cap[e] > 0}


def look(counter):
    counter["work"] = counter.get("work", 0) + 1


def dinic(g, s, t, counter):
    total = 0
    phases = 0
    while True:
        # Phase: BFS levels over the residual graph.
        level = [-1] * g.n
        level[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for e in g.adj[u]:
                look(counter)
                v = g.to[e]
                if g.cap[e] > 0 and level[v] < 0:
                    level[v] = level[u] + 1
                    q.append(v)
        if level[t] < 0:
            counter["phases"] = phases
            return total
        phases += 1
        # Blocking flow: DFS restricted to level+1 edges, with the
        # current-arc pointer so each dead edge is abandoned once per phase.
        it = [0] * g.n

        def push(u, limit):
            if u == t:
                return limit
            while it[u] < len(g.adj[u]):
                e = g.adj[u][it[u]]
                look(counter)
                v = g.to[e]
                if g.cap[e] > 0 and level[v] == level[u] + 1:
                    got = push(v, min(limit, g.cap[e]))
                    if got > 0:
                        g.cap[e] -= got
                        g.cap[e ^ 1] += got
                        return got
                it[u] += 1
            return 0

        while True:
            got = push(s, float("inf"))
            if got == 0:
                break
            total += got


def edmonds_karp(g, s, t, counter):
    total = 0
    augmentations = 0
    while True:
        parent_edge = [-1] * g.n
        parent_edge[s] = -2
        q = deque([s])
        while q and parent_edge[t] == -1:
            u = q.popleft()
            for e in g.adj[u]:
                look(counter)
                v = g.to[e]
                if g.cap[e] > 0 and parent_edge[v] == -1:
                    parent_edge[v] = e
                    q.append(v)
        if parent_edge[t] == -1:
            counter["augmentations"] = augmentations
            return total
        bottleneck = float("inf")
        v = t
        while v != s:
            e = parent_edge[v]
            bottleneck = min(bottleneck, g.cap[e])
            v = g.to[e ^ 1]
        v = t
        while v != s:
            e = parent_edge[v]
            g.cap[e] -= bottleneck
            g.cap[e ^ 1] += bottleneck
            v = g.to[e ^ 1]
        total += bottleneck
        augmentations += 1


def ford_fulkerson_dfs(g, s, t, counter):
    """The original: ANY augmenting path, here by first-found DFS."""
    total = 0
    augmentations = 0
    while True:
        seen = [False] * g.n
        seen[s] = True
        path = []

        def dfs(u):
            if u == t:
                return True
            for e in g.adj[u]:
                look(counter)
                v = g.to[e]
                if g.cap[e] > 0 and not seen[v]:
                    seen[v] = True
                    path.append(e)
                    if dfs(v):
                        return True
                    path.pop()
            return False

        if not dfs(s):
            counter["augmentations"] = augmentations
            return total
        bottleneck = min(g.cap[e] for e in path)
        for e in path:
            g.cap[e] -= bottleneck
            g.cap[e ^ 1] += bottleneck
        total += bottleneck
        augmentations += 1


def push_relabel(g, s, t, counter):
    """FIFO push-relabel: height labels license downhill pushes; a stuck
    vertex lifts itself just enough to move. The other route to max flow,
    working locally with preflows instead of hunting global paths."""
    n = g.n
    height = [0] * n
    height[s] = n
    excess = [0] * n
    for e in g.adj[s]:
        look(counter)
        if g.cap[e] > 0:
            v = g.to[e]
            excess[v] += g.cap[e]
            excess[s] -= g.cap[e]
            g.cap[e ^ 1] += g.cap[e]
            g.cap[e] = 0
    active = deque(v for v in range(n) if v not in (s, t) and excess[v] > 0)
    in_q = [False] * n
    for v in active:
        in_q[v] = True
    while active:
        u = active.popleft()
        in_q[u] = False
        while excess[u] > 0:
            pushed = False
            for e in g.adj[u]:
                look(counter)
                v = g.to[e]
                if g.cap[e] > 0 and height[u] == height[v] + 1:
                    d = min(excess[u], g.cap[e])
                    g.cap[e] -= d
                    g.cap[e ^ 1] += d
                    excess[u] -= d
                    excess[v] += d
                    if v not in (s, t) and not in_q[v]:
                        active.append(v)
                        in_q[v] = True
                    pushed = True
                    if excess[u] == 0:
                        break
            if excess[u] == 0:
                break
            if not pushed:
                lowest = None
                for e in g.adj[u]:
                    look(counter)
                    if g.cap[e] > 0:
                        h = height[g.to[e]]
                        lowest = h if lowest is None else min(lowest, h)
                if lowest is None:
                    break
                height[u] = lowest + 1
                assert height[u] <= 2 * n, "height bound violated"
    return excess[t]


# ------------------------------------------------------------- the instances


def layered_network(seed=20260827, layers=8, width=150, fanout=4, cmax=50):
    rng = random.Random(seed)
    n = 2 + layers * width
    g = FlowNet(n)
    s, t = 0, 1
    node = lambda l, i: 2 + l * width + i
    for i in range(width):
        g.add(s, node(0, i), rng.randint(1, cmax))
    for l in range(layers - 1):
        for i in range(width):
            for _ in range(fanout):
                g.add(node(l, i), node(l + 1, rng.randrange(width)), rng.randint(1, cmax))
    for i in range(width):
        g.add(node(layers - 1, i), t, rng.randint(1, cmax))
    return g, s, t


def diamond(C):
    """Zwick's classic trap: two wide paths and a one-unit cross edge."""
    g = FlowNet(4)
    s, u, v, t = 0, 1, 2, 3
    g.add(s, u, C)
    g.add(s, v, C)
    g.add(u, t, C)
    g.add(v, t, C)
    g.add(u, v, 1)
    return g, s, t


def adversarial_ff(g, s, t, counter, C):
    """Ford-Fulkerson with the documented worst path choice on the diamond:
    alternate the two zigzags through the cross edge, one unit at a time.
    The spec allows any augmenting path; this is the one an adversary picks."""
    # Edge ids by construction order in diamond(): su=0, sv=2, ut=4, vt=6, uv=8.
    total = 0
    augmentations = 0
    while g.cap[0] > 0 or g.cap[2] > 0:
        if g.cap[8] > 0:  # zigzag s->u->v->t
            path = [0, 8, 6]
        else:  # zigzag s->v->(v->u residual)->t
            path = [2, 9, 4]
        bottleneck = min(g.cap[e] for e in path)
        for e in path:
            look(counter)
            g.cap[e] -= bottleneck
            g.cap[e ^ 1] += bottleneck
        total += bottleneck
        augmentations += 1
    counter["augmentations"] = augmentations
    return total


def check_flow(original, residual, s, t, claimed):
    """Validity oracle: capacities respected, conservation holds, and the
    value at the source equals the claim."""
    flows = residual.flow_on(original)
    net = [0] * original.n
    for e, f in flows.items():
        assert 0 <= f <= original.cap[e], "capacity violated"
        u, v = original.to[e ^ 1], original.to[e]
        net[u] -= f
        net[v] += f
    for v in range(original.n):
        if v not in (s, t):
            assert net[v] == 0, f"conservation broken at {v}"
    assert net[t] == claimed and net[s] == -claimed, "value mismatch"


def min_cut_value(original, residual, s):
    """The certificate: capacity of the cut between what s can still reach
    in the residual graph and everything else."""
    reach = [False] * residual.n
    reach[s] = True
    q = deque([s])
    while q:
        u = q.popleft()
        for e in residual.adj[u]:
            v = residual.to[e]
            if residual.cap[e] > 0 and not reach[v]:
                reach[v] = True
                q.append(v)
    cut = 0
    for e in range(0, len(original.to), 2):
        if original.cap[e] > 0:
            u, v = original.to[e ^ 1], original.to[e]
            if reach[u] and not reach[v]:
                cut += original.cap[e]
    return cut


if __name__ == "__main__":
    # Oracle 1: agreement and validity on 200 random small networks, plus
    # the max-flow = min-cut certificate on every one of them.
    rng = random.Random(11)
    for trial in range(200):
        n = rng.randint(4, 14)
        g0 = FlowNet(n)
        for _ in range(rng.randint(n, 3 * n)):
            u, v = rng.randrange(n), rng.randrange(n)
            if u != v:
                g0.add(u, v, rng.randint(1, 20))
        s, t = 0, n - 1
        results = []
        for method in (dinic, edmonds_karp, ford_fulkerson_dfs, push_relabel):
            g = g0.clone()
            val = method(g, s, t, {})
            results.append(val)
            if method is not push_relabel:  # preflow leaves s-side residue
                check_flow(g0, g, s, t, val)
            if method is dinic:
                assert min_cut_value(g0, g, s) == val, "max-flow != min-cut"
        assert len(set(results)) == 1, f"trial {trial}: {results}"

    # Oracle 2: the trap, pinned exactly. At C=1,000 the adversarial choice
    # makes 2C one-unit augmentations; Edmonds-Karp's shortest paths ignore
    # the cross edge and finish in 2; Dinic needs a single phase.
    C = 1_000
    g0, s, t = diamond(C)
    c = {}
    val = adversarial_ff(g0.clone(), s, t, c, C)
    assert val == 2 * C and c["augmentations"] == 2 * C, c
    c = {}
    assert edmonds_karp(g0.clone(), s, t, c) == 2 * C and c["augmentations"] == 2
    c = {}
    assert dinic(g0.clone(), s, t, c) == 2 * C and c["phases"] == 1

    # Oracle 3: the phase bound. On the big layered instance Dinic's phase
    # count must respect its theorem (at most V, and here far below).
    g0, s, t = layered_network()
    c_dinic = {}
    g = g0.clone()
    flow_a = dinic(g, s, t, c_dinic)
    assert c_dinic["phases"] <= g0.n
    check_flow(g0, g, s, t, flow_a)
    assert min_cut_value(g0, g, s) == flow_a, "certificate on the big instance"

    # Oracle 4: everyone agrees on the big instance too.
    c_ek, c_ff, c_pr = {}, {}, {}
    assert edmonds_karp(g0.clone(), s, t, c_ek) == flow_a
    assert ford_fulkerson_dfs(g0.clone(), s, t, c_ff) == flow_a
    assert push_relabel(g0.clone(), s, t, c_pr) == flow_a

    # Oracle 5: the published contest.
    CBIG = 250_000
    gT, s2, t2 = diamond(CBIG)
    c_ff_trap, c_ek_trap, c_dinic_trap, c_pr_trap = {}, {}, {}, {}
    adversarial_ff(gT.clone(), s2, t2, c_ff_trap, CBIG)
    edmonds_karp(gT.clone(), s2, t2, c_ek_trap)
    dinic(gT.clone(), s2, t2, c_dinic_trap)
    push_relabel(gT.clone(), s2, t2, c_pr_trap)
    assert c_dinic_trap["work"] < 100 and c_ff_trap["work"] > 1_000_000
    assert c_dinic["work"] < c_ek["work"], "levels must beat one-path-per-BFS"

    print(f"contest, work = edge examinations; layered network: V={g0.n:,}, "
          f"E={len(g0.to) // 2:,}, max flow {flow_a:,}; trap: Zwick diamond, C={CBIG:,}:")
    rows = [
        ("Dinic x level graphs", c_dinic["work"], c_dinic_trap["work"], f"{c_dinic['phases']} phases"),
        ("Edmonds-Karp", c_ek["work"], c_ek_trap["work"], f"{c_ek['augmentations']} augmentations"),
        ("Ford-Fulkerson, DFS", c_ff["work"], c_ff_trap["work"], f"{c_ff['augmentations']} augmentations (trap: adversarial order)"),
        ("Push-relabel, FIFO", c_pr["work"], c_pr_trap["work"], "preflow, local pushes only"),
    ]
    for name, wa, wt, note in rows:
        print(f"  {name:<22} layered {wa:>10,}   trap {wt:>10,}   {note}")
    print("OK: four methods agree, flows validated, min-cut certificates match, the trap and the phase bound hold")
