"""Triangle counting x Node-iterator (puzzle 210).

Exact triangle counts by the node-iterator (every pair of a node's neighbors
checked for an edge, the sum divided by three) and by the degree-ordered
forward algorithm (Schank and Wagner 2005; Latapy 2008), refereed by brute
force over node triples and by trace(A^3)/6; Watts-Strogatz clustering and
transitivity; wedge sampling (Seshadhri, Pinar, Kolda 2013); the hub blow-up
on a preferential-attachment graph; the all-triples negative example.
Author corrections: the first forward implementation oriented every edge
downhill in degree, so the hub's out-list held all of its neighbors and the
method did no better than the node-iterator (23,649 merge steps against
23,282 pair checks); the assertion caught it and the edges now point uphill,
which is what bounds every out-list by the square root of twice the edge
count. The draft also expected forward to win big everywhere; on the
uniform-degree ER graph it saves only about 1.5x (the saving is the hub, not
the graph), and the draft's guess that the top one percent of hubs take half
the pair checks is replaced by the measured share printed below.
"""
import bisect
import itertools
import math
import random
import time


def er_graph(n, p, rng):
    adj = [set() for _ in range(n)]
    for u in range(n):
        for v in range(u + 1, n):
            if rng.random() < p:
                adj[u].add(v)
                adj[v].add(u)
    return adj


def planted(k, size, p_in, p_out, rng):
    n = k * size
    adj = [set() for _ in range(n)]
    for u in range(n):
        for v in range(u + 1, n):
            if rng.random() < (p_in if u // size == v // size else p_out):
                adj[u].add(v)
                adj[v].add(u)
    return adj


def preferential(n, m, rng):
    """Barabasi-Albert growth: m links per new node, chosen by degree."""
    adj = [set() for _ in range(n)]
    for u in range(m + 1):
        for v in range(u + 1, m + 1):
            adj[u].add(v)
            adj[v].add(u)
    urn = [v for v in range(m + 1) for _ in range(m)]
    for v in range(m + 1, n):
        chosen = set()
        while len(chosen) < m:
            chosen.add(rng.choice(urn))
        for u in chosen:
            adj[u].add(v)
            adj[v].add(u)
            urn.extend((u, v))
    return adj


def edges(adj):
    return sum(map(len, adj)) // 2


def node_iterator(adj):
    """Triangles, per-node triangle counts, and neighbor-pair checks."""
    per = [0] * len(adj)
    checks = 0
    for v, nbs in enumerate(adj):
        nb = sorted(nbs)
        for i, u in enumerate(nb):
            au = adj[u]
            for w in nb[i + 1:]:
                checks += 1
                if w in au:
                    per[v] += 1
    assert sum(per) % 3 == 0
    return sum(per) // 3, per, checks


def forward(adj):
    """Degree-ordered forward algorithm: orient every edge uphill, from the
    lower-degree endpoint to the higher, so no out-list exceeds sqrt(2m);
    count each triangle once at its lowest-degree node by merging the sorted
    out-lists of the node and of each out-neighbor. Returns triangles, merge
    steps, largest out-degree."""
    n = len(adj)
    order = sorted(range(n), key=lambda v: (len(adj[v]), v))
    rank = [0] * n
    for r, v in enumerate(order):
        rank[v] = r
    out = [None] * n
    for v in range(n):
        out[rank[v]] = sorted(rank[u] for u in adj[v] if rank[u] > rank[v])
    tri = steps = 0
    for a in out:
        for s in a:
            b = out[s]
            i = j = 0
            while i < len(a) and j < len(b):
                steps += 1
                if a[i] == b[j]:
                    tri += 1
                    i += 1
                    j += 1
                elif a[i] < b[j]:
                    i += 1
                else:
                    j += 1
    return tri, steps, max(len(o) for o in out)


def brute(adj):
    t = 0
    for a, b, c in itertools.combinations(range(len(adj)), 3):
        if b in adj[a] and c in adj[a] and c in adj[b]:
            t += 1
    return t


def trace_cubed(adj):
    """trace(A^3) / 6 with a plain O(n^3) multiply; returns the count and
    the scalar multiplications spent."""
    n = len(adj)
    A = [[1 if v in adj[u] else 0 for v in range(n)] for u in range(n)]
    A2 = [[sum(A[i][k] * A[k][j] for k in range(n)) for j in range(n)] for i in range(n)]
    tr = sum(A2[i][k] * A[k][i] for i in range(n) for k in range(n))
    assert tr % 6 == 0
    return tr // 6, n ** 3 + n * n


def clustering(adj, per):
    wedges = sum(d * (d - 1) // 2 for d in map(len, adj))
    trans = 3 * (sum(per) // 3) / wedges
    local = [2 * per[v] / (len(adj[v]) * (len(adj[v]) - 1)) for v in range(len(adj)) if len(adj[v]) >= 2]
    return wedges, trans, sum(local) / len(local)


def wedge_sample(adj, k, rng):
    """Sample k wedges (a node by its wedge count, then two neighbors) and
    return the closed fraction, the implied triangle count, and the
    binomial standard error."""
    weights = [len(a) * (len(a) - 1) // 2 for a in adj]
    cum = list(itertools.accumulate(weights))
    closed = 0
    for _ in range(k):
        v = bisect.bisect_right(cum, rng.randrange(cum[-1]))
        u, w = rng.sample(sorted(adj[v]), 2)
        closed += w in adj[u]
    c = closed / k
    return c, c * cum[-1] / 3, math.sqrt(c * (1 - c) / k)


def main():
    t0 = time.perf_counter()
    rng = random.Random(210)

    # 1. small graphs: every method agrees with brute force
    for _ in range(40):
        g = er_graph(rng.randint(10, 26), rng.uniform(0.15, 0.6), rng)
        t_ni, per, _ = node_iterator(g)
        t_fw, _, _ = forward(g)
        t_bf = brute(g)
        assert t_ni == t_fw == t_bf, (t_ni, t_fw, t_bf)
        assert sum(per) == 3 * t_bf
    g = er_graph(100, 0.1, rng)
    t_tr, mults = trace_cubed(g)
    t_ni, _, chk_tr = node_iterator(g)
    assert t_tr == t_ni
    print(f"trace(A^3)/6 = {t_tr} = node-iterator on n = 100 (p 0.1): {mults:,} multiplications against {chk_tr:,} pair checks ({mults / chk_tr:.0f}x)")

    # 2. the three families
    fams = [
        ("Erdos-Renyi n=400 p=0.02", er_graph(400, 0.02, rng)),
        ("planted 4 x 60, p_in 0.30, p_out 0.01", planted(4, 60, 0.30, 0.01, rng)),
        ("preferential attachment n=600 m=3", preferential(600, 3, rng)),
    ]
    rows = []
    print(f"{'family':38} {'n':>4} {'m':>6} {'tri':>6} {'pair checks':>12} {'fwd steps':>10} {'max out':>7} {'transit':>8} {'avg C':>7}")
    for name, g in fams:
        t_ni, per, checks = node_iterator(g)
        t_fw, steps, maxout = forward(g)
        assert t_ni == t_fw
        wedges, trans, avg_c = clustering(g, per)
        rows.append((name, g, t_ni, per, checks, steps, maxout, wedges, trans, avg_c))
        print(f"{name:38} {len(g):>4} {edges(g):>6} {t_ni:>6} {checks:>12,} {steps:>10,} {maxout:>7} {trans:>8.4f} {avg_c:>7.4f}")
    er_row, pp_row, ba_row = rows

    # 3. the hub blow-up on the preferential-attachment graph
    g = ba_row[1]
    degs = sorted((len(a) for a in g), reverse=True)
    top = max(1, len(g) // 100)
    hub_checks = sum(d * (d - 1) // 2 for d in degs[:top])
    hub_share = hub_checks / ba_row[4]
    print(f"BA hubs: top {top} nodes (degrees {degs[0]} to {degs[top - 1]}) take {hub_share:.1%} of {ba_row[4]:,} pair checks; forward {ba_row[5]:,} merge steps ({ba_row[4] / ba_row[5]:.1f}x fewer), largest out-degree {ba_row[6]}")
    assert ba_row[5] < ba_row[4]
    er_ratio = er_row[4] / er_row[5]
    print(f"ER: pair checks {er_row[4]:,} against forward {er_row[5]:,} ({er_ratio:.2f}x): the saving is the hub, not the graph")

    # 4. clustering: planted communities against an ER twin of equal density
    g = pp_row[1]
    twin = er_graph(len(g), edges(g) / (len(g) * (len(g) - 1) / 2), rng)
    _, per_t, _ = node_iterator(twin)
    _, trans_t, avg_t = clustering(twin, per_t)
    print(f"planted transitivity {pp_row[8]:.4f}, average clustering {pp_row[9]:.4f}; ER twin ({edges(twin)} edges) {trans_t:.4f} and {avg_t:.4f} ({pp_row[8] / trans_t:.1f}x)")
    assert pp_row[8] > 2.5 * trans_t  # measured 3.3x: the inter-community edges dilute p_in = 0.3

    # 5. Erdos-Renyi expectation: C(n,3) p^3 triangles, transitivity p
    n, p, er_reps = 120, 0.08, 30
    counts, trans_list = [], []
    for _ in range(er_reps):
        g = er_graph(n, p, rng)
        t, per, _ = node_iterator(g)
        counts.append(t)
        trans_list.append(clustering(g, per)[1])
    expect = math.comb(n, 3) * p ** 3
    mean = sum(counts) / er_reps
    se = (sum((c - mean) ** 2 for c in counts) / (er_reps - 1) / er_reps) ** 0.5
    tmean = sum(trans_list) / er_reps
    print(f"ER n={n} p={p}: {er_reps} seeds, mean triangles {mean:.1f} +- {se:.1f} against C(n,3) p^3 = {expect:.1f}; mean transitivity {tmean:.4f} against p = {p}")
    assert abs(mean - expect) < 3.5 * se + 1e-9
    assert abs(tmean - p) < 0.01

    # 6. wedge sampling against the exact transitivity on the planted graph
    g, exact_t, exact_trans = pp_row[1], pp_row[2], pp_row[8]
    k, ws_reps = 2000, 20
    ests, ses = [], []
    for _ in range(ws_reps):
        c, t_est, se_c = wedge_sample(g, k, rng)
        ests.append(c)
        ses.append(se_c)
    err = (sum((c - exact_trans) ** 2 for c in ests) / ws_reps) ** 0.5
    se_pred = sum(ses) / ws_reps
    print(f"wedge sampling, {k} wedges x {ws_reps} runs: rms error {err:.4f} against predicted se {se_pred:.4f}; estimate {ests[0]:.4f} -> {ests[0] * pp_row[7] / 3:.0f} triangles against {exact_t} exact; {k} closure checks against {pp_row[4]:,} pair checks")
    assert err < 2.5 * se_pred
    assert all(abs(c - exact_trans) < 4 * s for c, s in zip(ests, ses))

    # 7. the negative example: every node triple of the 600-node BA graph
    g = ba_row[1]
    t1 = time.perf_counter()
    t_bf = brute(g)
    t_brute = time.perf_counter() - t1
    t1 = time.perf_counter()
    t_ni, _, checks = node_iterator(g)
    t_node = time.perf_counter() - t1
    triples = math.comb(len(g), 3)
    assert t_bf == t_ni == ba_row[2]
    print(f"all triples on the BA graph (n=600): {triples:,} triples in {t_brute:.2f} s against {checks:,} pair checks in {t_node * 1000:.0f} ms ({triples / checks:.0f}x the work, {t_brute / t_node:.0f}x the time), both {t_bf} triangles")

    total = time.perf_counter() - t0
    print(
        f"OK: node-iterator, forward, brute force, and trace(A^3)/6 agree on 40 small graphs, the n=100 cube, and the three families "
        f"({er_row[2]}, {pp_row[2]}, {ba_row[2]} triangles); ER {er_reps} seeds mean {mean:.1f} against {expect:.1f} expected and transitivity {tmean:.4f} against p {p}; "
        f"planted clustering {pp_row[8]:.3f} against {trans_t:.3f} for an ER twin; BA hubs: the top {top} nodes take {hub_share:.0%} of {ba_row[4]:,} pair checks where forward spends {ba_row[5]:,} merge steps ({ba_row[4] / ba_row[5]:.1f}x fewer) and ER gains only {er_ratio:.2f}x; "
        f"wedge sampling rms error {err:.4f} against se {se_pred:.4f} from {k} wedges; all triples {triples:,} against {checks:,} pair checks ({triples / checks:.0f}x); {total:.1f} s"
    )


if __name__ == "__main__":
    main()
