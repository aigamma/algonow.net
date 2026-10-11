# Puzzle 193: Distance-vector routing x Bellman-Ford exchange
# Network routing with no central map: every router keeps a vector of its
# best known distance and next hop to each destination (RIP, RFC 1058), hands
# it to each neighbor every update interval, and relaxes each entry to the
# minimum over neighbors of link cost plus advertised distance: Bellman-Ford
# spread across the routers, settling in L - 1 intervals (L = longest hop
# count among the cheapest paths). After a link dies, routers hand each other
# the dead route and count it upward until a finite "infinity" (16) stops them.
#
# Referees: 200 random weighted graphs where the quiet tables must equal an
# independent Dijkstra and Floyd-Warshall on every pair, next hops must reach
# every destination at the referee's cost, and busy intervals must equal L - 1
# exactly; the chain A-B-C after A-B fails (plain 15 intervals, split horizon
# and poison reverse 2, triggered updates the same 15 changes in 1 interval,
# no count in 500 random asynchronous orders under poison reverse); the RFC
# 1058 triangle (15 under all three rules in lockstep, a majority of 1,000
# random orders); meshes losing a router (15 under every variant); link state
# flooding in exactly the BFS hop diameter; no cap: counting after 1,000.
#
# AUTHOR CORRECTIONS: the draft expected poison reverse to settle the lockstep
# triangle in four intervals; the trace shows the dead route circling A, B, C
# to 15, so the page calls poison reverse a two-router fix. And a next-hop
# change at an unchanged distance now counts as a table change (under poison
# reverse it changes what neighbors hear); the first draft declared the tables
# quiet while one router still sat at infinity.
import heapq
import random
import time
from collections import deque

SEED = 20261010
INF = float('inf')


def random_connected_graph(rng, n, extra, max_w):
    order = list(range(n))
    rng.shuffle(order)
    edges = {}
    for i in range(1, n):
        u, v = order[i], order[rng.randrange(i)]
        edges[(min(u, v), max(u, v))] = rng.randint(1, max_w)
    tries = 0
    while len(edges) < n - 1 + extra and tries < 20 * n * n:
        u, v = rng.sample(range(n), 2)
        edges.setdefault((min(u, v), max(u, v)), rng.randint(1, max_w))
        tries += 1
    adj = {u: {} for u in range(n)}
    for (u, v), w in edges.items():
        adj[u][v] = adj[v][u] = w
    return adj


def remove_edge(adj, u, v):
    del adj[u][v]
    del adj[v][u]


def dijkstra(adj, src, count=None):
    """Referee: (cost, hops) lexicographic; `count` counts relaxations."""
    dist = {u: (INF, INF) for u in adj}
    dist[src] = (0, 0)
    pq = [(0, 0, src)]
    while pq:
        d, h, u = heapq.heappop(pq)
        if (d, h) > dist[u]:
            continue
        for v, w in adj[u].items():
            if count is not None:
                count[0] += 1
            if (d + w, h + 1) < dist[v]:
                dist[v] = (d + w, h + 1)
                heapq.heappush(pq, (d + w, h + 1, v))
    return dist


def floyd_warshall(adj):
    d = {u: {v: (0 if u == v else adj[u].get(v, INF)) for v in adj} for u in adj}
    for k in adj:
        for i in adj:
            for j in adj:
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    return d


def hop_diameter(adj):
    best = 0
    for s in adj:
        seen = {s: 0}
        q = deque([s])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if v not in seen:
                    seen[v] = seen[u] + 1
                    q.append(v)
        best = max(best, max(seen.values()))
    return best


class DistanceVector:
    """cap: infinity threshold; split: omit routes through v from the vector
    sent to v; poison: send them as infinity; triggered: a changed vector is
    heard inside the same interval; watch: destination whose transient
    distances are recorded."""

    def __init__(self, adj, cap=None, split=False, poison=False, triggered=False, watch=None):
        self.adj, self.cap, self.poison, self.triggered, self.watch = adj, cap, poison, triggered, watch
        self.split = split or poison
        self.nodes = sorted(adj)
        self.dist = {u: {d: 0 if d == u else adj[u].get(d, INF) for d in self.nodes} for u in self.nodes}
        self.nexthop = {u: {d: u if d == u else (d if d in adj[u] else None) for d in self.nodes} for u in self.nodes}
        self.entries = self.messages = self.rounds = 0
        self.reset_watch()

    def reset_watch(self):
        self.watch_changes = self.watch_max = 0

    def advertisement(self, u, to):
        vec = {}
        for d in self.nodes:
            if d == u:
                continue
            if self.split and self.nexthop[u][d] == to and d != to:
                if not self.poison:
                    continue
                vec[d] = INF
            else:
                vec[d] = self.dist[u][d]
        self.messages += 1
        self.entries += len(vec)
        return vec

    def relax(self, u, heard):
        changed = 0
        for d in self.nodes:
            if d == u:
                continue
            best, hop = self.adj[u].get(d, INF), (d if d in self.adj[u] else None)
            for v, vec in heard.items():
                cand = self.adj[u][v] + vec.get(d, INF)
                if cand < best or (cand == best and v == self.nexthop[u][d]):
                    best, hop = cand, v
            if self.cap is not None and best >= self.cap:
                best, hop = INF, None
            # a new next hop at the same distance is a change too (poison reverse)
            if best != self.dist[u][d] or hop != self.nexthop[u][d]:
                changed += 1
            if best != self.dist[u][d] and d == self.watch:
                self.watch_changes += 1
                if best != INF:
                    self.watch_max = max(self.watch_max, best)
            self.dist[u][d], self.nexthop[u][d] = best, hop
        return changed

    def exchange(self, rng=None):
        """One interval: lockstep, or one router at a time in rng order."""
        self.rounds += 1
        changed = 0
        if rng is None and not self.triggered:
            heard = {u: {v: self.advertisement(v, u) for v in self.adj[u]} for u in self.nodes}
            for u in self.nodes:
                changed += self.relax(u, heard[u])
        else:
            order = list(self.nodes)
            if rng is not None:
                rng.shuffle(order)
            queue, steps = deque(order), 0
            while queue:
                u = queue.popleft()
                c = self.relax(u, {v: self.advertisement(v, u) for v in self.adj[u]})
                changed += c
                steps += 1
                if c and self.triggered:
                    queue.extend(self.adj[u])
                assert steps < 100000
        if self.watch is not None:
            held = [self.dist[u][self.watch] for u in self.nodes if u != self.watch and self.dist[u][self.watch] != INF]
            if held:
                self.watch_max = max(self.watch_max, max(held))
        return changed

    def run(self, max_rounds=100000, rng=None):
        busy = 0
        while self.exchange(rng) and busy < max_rounds:
            busy += 1
        return busy

    def path(self, s, d):
        cost, u, seen = 0, s, set()
        while u != d:
            if u in seen or self.nexthop[u][d] is None:
                return None
            seen.add(u)
            cost += self.adj[u][self.nexthop[u][d]]
            u = self.nexthop[u][d]
        return cost


def tables_equal_referee(dv, adj):
    return all(dv.dist[s][d] == dijkstra(adj, s)[d][0] for s in dv.nodes for d in dv.nodes)


def link_state(adj):
    """Flood every router's link records (a new set is forwarded to every
    neighbor but the sender), then one Dijkstra per router."""
    have = {u: {u} for u in adj}
    pending = {u: [(u, None)] for u in adj}
    records = rounds = complete = 0
    while any(pending.values()):
        rounds += 1
        inbox = {u: [] for u in adj}
        for u in adj:
            for origin, frm in pending[u]:
                for v in adj[u]:
                    if v != frm:
                        inbox[v].append((origin, u))
                        records += len(adj[origin])
            pending[u] = []
        for v in adj:
            for origin, frm in inbox[v]:
                if origin not in have[v]:
                    have[v].add(origin)
                    pending[v].append((origin, frm))
                    complete = rounds
    assert all(len(have[u]) == len(adj) for u in adj)
    count = [0]
    for s in adj:
        dijkstra(adj, s, count)
    return complete, records, count[0]


def fail(adj, edges, watch, rng=None, max_rounds=100000, **kw):
    dv = DistanceVector(adj, cap=16, watch=watch, **kw)
    dv.run(rng=rng)
    assert tables_equal_referee(dv, adj)
    for u, v in edges:
        remove_edge(adj, u, v)
    dv.reset_watch()
    dv.entries_before = dv.entries
    trace, busy = [], 0
    while True:
        c = dv.exchange(rng)
        trace.append(tuple(dv.dist[u][watch] for u in dv.nodes if u != watch))
        if c == 0 or busy >= max_rounds:
            break
        busy += 1
    return dv, busy, trace


CHAIN = lambda: {0: {1: 1}, 1: {0: 1, 2: 1}, 2: {1: 1}}  # A - B - C
TRIANGLE = lambda: {0: {1: 1, 2: 1}, 1: {0: 1, 2: 1}, 2: {0: 1, 1: 1, 3: 1}, 3: {2: 1}}  # RFC 1058


def main():
    t0 = time.perf_counter()
    rng = random.Random(SEED)
    G = 200
    s = {'n': 0, 'm': 0, 'rounds': 0, 'entries': 0, 'messages': 0, 'maxL': 0, 'maxbusy': 0, 'ls_rounds': 0, 'ls_records': 0, 'ls_relax': 0, 'dv_mem': 0, 'ls_mem': 0}
    for _ in range(G):
        n = rng.randint(8, 30)
        adj = random_connected_graph(rng, n, rng.randint(0, 2 * n), 10)
        m = sum(len(nb) for nb in adj.values()) // 2
        dv = DistanceVector(adj)
        busy = dv.run()
        fw = floyd_warshall(adj)
        L = 0
        for a in adj:
            ref = dijkstra(adj, a)
            for b in adj:
                assert dv.dist[a][b] == ref[b][0] == fw[a][b]
                if a != b:
                    L = max(L, ref[b][1])
                    assert dv.path(a, b) == ref[b][0]
        assert busy == L - 1 <= n - 2, (busy, L)  # the Bellman-Ford bound, exactly
        lsr, lsrec, lsrelax = link_state(adj)
        assert lsr == hop_diameter(adj)
        for k, v in (('n', n), ('m', m), ('rounds', busy + 1), ('entries', dv.entries), ('messages', dv.messages), ('ls_rounds', lsr), ('ls_records', lsrec), ('ls_relax', lsrelax), ('dv_mem', 2 * n), ('ls_mem', 2 * m + 2 * n)):
            s[k] += v
        s['maxL'], s['maxbusy'] = max(s['maxL'], L), max(s['maxbusy'], busy)
    avg = {k: v / G for k, v in s.items()}
    print(f"{G} random weighted graphs ({avg['n']:.1f} routers, {avg['m']:.1f} links): tables == Dijkstra == Floyd-Warshall; busy intervals == L - 1 on all (max L {s['maxL']}, max busy {s['maxbusy']})")
    print(f"  DV {avg['rounds']:.2f} intervals, {avg['messages']:,.0f} vectors, {avg['entries']:,.0f} entries, {avg['dv_mem']:.0f} numbers per router; link state {avg['ls_rounds']:.2f} flood rounds (== hop diameter), {avg['ls_records']:,.0f} records, {avg['ls_relax']:,.0f} relaxations, {avg['ls_mem']:.0f} numbers per router")

    # the chain, lockstep
    plain, b_plain, trace = fail(CHAIN(), [(0, 1)], 0)
    assert plain.watch_max == 15 and b_plain == 15 and plain.watch_changes == 15
    assert trace[:3] == [(3, 2), (3, 4), (5, 4)] and trace[-1] == (INF, INF)
    split, b_split, _ = fail(CHAIN(), [(0, 1)], 0, split=True)
    poison, b_poison, _ = fail(CHAIN(), [(0, 1)], 0, poison=True)
    assert b_split == 2 and split.watch_max == 2 and b_poison == 2 and poison.watch_max == 2
    trig, b_trig, _ = fail(CHAIN(), [(0, 1)], 0, triggered=True)
    assert b_trig == 1 and trig.watch_max == 15 and trig.watch_changes == plain.watch_changes
    arng = random.Random(SEED + 1)
    worst_async = max(fail(CHAIN(), [(0, 1)], 0, rng=arng, poison=True)[0].watch_max for _ in range(500))
    assert worst_async == 2
    print(f"\nchain A-B-C after A-B fails (infinity 16), lockstep: plain {b_plain} intervals, worst {plain.watch_max}, {plain.watch_changes} changes, trace (B, C) {trace[:4]} ...; {b_plain * 0.5:.1f} minutes at RIP's 30 s")
    print(f"  split horizon {b_split} intervals, worst {split.watch_max}; poison reverse {b_poison}, worst {poison.watch_max}, and worst {worst_async} over 500 random asynchronous orders; triggered updates {b_trig} interval, worst {trig.watch_max}, the same {trig.watch_changes} changes")

    # the RFC 1058 triangle
    tri = {k: fail(TRIANGLE(), [(2, 3)], 3, **kw) for k, kw in (('plain', {}), ('split', {'split': True}), ('poison', {'poison': True}))}
    for dv, busy, _ in tri.values():
        assert busy == 15 and dv.watch_max == 15 and all(dv.dist[u][3] == INF for u in (0, 1, 2))
    trials, deceived, d_rounds, c_rounds = 1000, 0, 0, 0
    for _ in range(trials):
        dv, busy, _ = fail(TRIANGLE(), [(2, 3)], 3, rng=arng, poison=True)
        assert all(dv.dist[u][3] == INF for u in (0, 1, 2))
        if dv.watch_max >= 8:
            deceived, d_rounds = deceived + 1, d_rounds + busy
        else:
            c_rounds += busy
    assert deceived > trials // 2
    print(f"\nRFC 1058 triangle after the C-target link fails: plain, split horizon, poison reverse all {tri['plain'][1]} intervals, worst {tri['poison'][0].watch_max} in lockstep (the dead route circles A, B, C)")
    print(f"  poison reverse, {trials} random asynchronous orders: {deceived} counted to 15 in three-router deception ({d_rounds / deceived:.1f} intervals each); {trials - deceived} settled in {c_rounds / (trials - deceived):.1f}")

    # random meshes losing a router (hop counts)
    out = {k: [0, 0, 0] for k in ('plain', 'split', 'poison')}
    ls_rounds = graphs = 0
    for _ in range(100):
        n = rng.randint(8, 20)
        adj0 = random_connected_graph(rng, n, rng.randint(n // 2, 2 * n), 1)
        victim = rng.randrange(n)
        rest = {u: {v: 1 for v in nb if v != victim} for u, nb in adj0.items() if u != victim}
        if hop_diameter(adj0) >= 15 or any(x[0] == INF for x in dijkstra(rest, next(iter(rest))).values()):
            continue
        graphs += 1
        for k, kw in (('plain', {}), ('split', {'split': True}), ('poison', {'poison': True})):
            adj = {u: dict(nb) for u, nb in adj0.items()}
            dv, busy, _ = fail(adj, [(victim, v) for v in adj0[victim]], victim, max_rounds=10000, **kw)
            assert busy < 10000 and tables_equal_referee(dv, adj)
            out[k][0] += busy
            out[k][1] = max(out[k][1], dv.watch_max)
            out[k][2] += dv.entries - dv.entries_before
        ls_rounds += link_state(rest)[0]
    assert out['plain'][1] == out['poison'][1] == 15
    print(f"\n{graphs} random hop-count meshes where a router loses every link; link state floods in {ls_rounds / graphs:.1f} rounds:")
    for k in out:
        print(f"  {k}: {out[k][0] / graphs:.1f} intervals, worst distance {out[k][1]}, {out[k][2] / graphs:,.0f} entries per graph")

    # the negative example: no cap
    nocap = DistanceVector(CHAIN(), watch=0)
    nocap.run()
    remove_edge(nocap.adj, 0, 1)
    for _ in range(1000):
        assert nocap.exchange() > 0
    held = (nocap.dist[1][0], nocap.dist[2][0])
    assert min(held) >= 1000
    print(f"\nno infinity cap: after 1,000 intervals B and C believe A is at {held} hops and are still counting")
    print(f"{time.perf_counter() - t0:.1f} s")
    print(f"OK: tables equal Dijkstra and Floyd-Warshall on every pair of {G} random graphs in exactly L - 1 intervals (max L {s['maxL']}); "
          f"the failed chain counts to infinity in {b_plain} intervals (worst {plain.watch_max}), split horizon in {b_split} with no inflation, triggered updates in {b_trig}; "
          f"poison reverse stops every two-router loop in 500 random orders but {deceived} of {trials} asynchronous orders on the RFC 1058 triangle count to 15; "
          f"link state floods in the hop diameter ({avg['ls_rounds']:.2f} rounds against {avg['rounds']:.2f} intervals, {avg['ls_records']:,.0f} records against {avg['entries']:,.0f} entries); "
          f"without a cap the dead route is at {max(held)} hops after 1,000 intervals and rising")


if __name__ == '__main__':
    main()
