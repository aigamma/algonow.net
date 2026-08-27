# Puzzle 57: Edmonds-Karp x shortest augmenting paths
# Maximum flow with a termination bound that does not depend on the
# capacities: and the min-cut certificate that proves every answer.
#
# The pairing is the point. The algorithm is Ford-Fulkerson's
# augmenting scheme: find a source-to-sink path with residual room,
# push the bottleneck, repeat: correct whenever it stops, but HOW LONG
# it runs depends entirely on which paths you pick: the famous zigzag
# gadget makes a bad chooser take 2C iterations, measured below at
# 200,000 for C = 100,000. The heuristic is one word: BFS: always
# augment along a SHORTEST residual path. Edmonds and Karp proved the
# shortest-path distances only ever grow, bounding augmentations by
# V*E/2 with no capacity anywhere in the bound: the same gadget falls
# in 2. Every flow on this page is certified by the other side of the
# duality: the reachable set of the final residual graph is a cut whose
# capacity equals the flow, checked edge by edge, and at small sizes
# the min cut is confirmed by enumerating ALL 2^n source-side subsets.
import random
from collections import deque


def max_flow_ek(n, cap, s, t, counter=None):
    """cap: dict (u,v)->capacity. Returns (value, flow dict)."""
    flow = {}
    adj = {}
    for (u, v) in cap:
        adj.setdefault(u, set()).add(v)
        adj.setdefault(v, set()).add(u)

    def residual(u, v):
        return cap.get((u, v), 0) - flow.get((u, v), 0) + flow.get((v, u), 0)

    value = 0
    while True:
        # BFS for a SHORTEST augmenting path.
        parent = {s: None}
        q = deque([s])
        while q and t not in parent:
            u = q.popleft()
            for v in adj.get(u, ()):
                if counter is not None:
                    counter["edges"] = counter.get("edges", 0) + 1
                if v not in parent and residual(u, v) > 0:
                    parent[v] = u
                    q.append(v)
        if t not in parent:
            return value, flow
        if counter is not None:
            counter["augs"] = counter.get("augs", 0) + 1
        # Bottleneck and push.
        path = []
        v = t
        while parent[v] is not None:
            path.append((parent[v], v))
            v = parent[v]
        bott = min(residual(u, v) for (u, v) in path)
        for (u, v) in path:
            back = min(flow.get((v, u), 0), bott)
            if back:
                flow[(v, u)] -= back
            fwd = bott - back
            if fwd:
                flow[(u, v)] = flow.get((u, v), 0) + fwd
        value += bott


def pathological_ff(C, counter=None):
    """The zigzag gadget: s->a, s->b (cap C), a->t, b->t (cap C),
    a->b (cap 1). The bad chooser alternates paths THROUGH the middle
    edge, pushing 1 per augmentation: 2C augmentations."""
    fa = fb = fat = fbt = 0  # s->a, s->b, a->t, b->t
    mid = 0  # a->b flow (may be +1 or 0 alternating)
    augs = 0
    total = 0
    while fa < C or fb < C:
        if mid == 0 and fa < C and fbt < C:
            fa += 1
            mid = 1
            fbt += 1
        elif mid == 1 and fb < C and fat < C:
            fb += 1
            mid = 0
            fat += 1
        else:
            # Middle unusable: finish with direct paths.
            if fa < C and fat < C:
                d = min(C - fa, C - fat)
                fa += d
                fat += d
            elif fb < C and fbt < C:
                d = min(C - fb, C - fbt)
                fb += d
                fbt += d
            else:
                break
        augs += 1
    total = fat + fbt
    if counter is not None:
        counter["augs"] = augs
    return total, augs


def min_cut_from_flow(n, cap, flow, s):
    """Reachable set in the residual graph: the certificate side."""
    def residual(u, v):
        return cap.get((u, v), 0) - flow.get((u, v), 0) + flow.get((v, u), 0)

    adj = {}
    for (u, v) in cap:
        adj.setdefault(u, set()).add(v)
        adj.setdefault(v, set()).add(u)
    seen = {s}
    q = deque([s])
    while q:
        u = q.popleft()
        for v in adj.get(u, ()):
            if v not in seen and residual(u, v) > 0:
                seen.add(v)
                q.append(v)
    return seen


def certify(n, cap, flow, value, s, t):
    """The full certificate suite: capacity, conservation, duality."""
    for (u, v), f in flow.items():
        assert 0 <= f <= cap.get((u, v), 0) + 1e-9, (u, v)
    for x in range(n):
        if x in (s, t):
            continue
        inn = sum(f for (u, v), f in flow.items() if v == x)
        out = sum(f for (u, v), f in flow.items() if u == x)
        assert inn == out, x
    side = min_cut_from_flow(n, cap, flow, s)
    assert s in side and t not in side
    cut_cap = sum(c for (u, v), c in cap.items() if u in side and v not in side)
    assert cut_cap == value  # max-flow == min-cut, on this instance
    for (u, v), c in cap.items():
        if u in side and v not in side:
            assert flow.get((u, v), 0) == c  # every cut edge saturated
    return side


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 200 small graphs: flow certified AND the min cut
    # confirmed against enumeration of every source-side subset.
    for trial in range(200):
        n = rng.randint(3, 11)
        cap = {}
        for _ in range(rng.randint(2, 3 * n)):
            u, v = rng.randrange(n), rng.randrange(n)
            if u != v:
                cap[(u, v)] = cap.get((u, v), 0) + rng.randint(1, 9)
        s, t = 0, n - 1
        val, flow = max_flow_ek(n, cap, s, t)
        certify(n, cap, flow, val, s, t)
        best_cut = float("inf")
        for mask in range(1 << (n - 2)):
            side = {s}
            for b in range(n - 2):
                if mask >> b & 1:
                    side.add(b + 1)
            cc = sum(c for (u, v), c in cap.items() if u in side and v not in side)
            best_cut = min(best_cut, cc)
        assert val == best_cut, (val, best_cut)  # duality, both directions

    # Oracle 2: the zigzag gadget, both choosers. C = 100,000.
    C = 100_000
    c_bad = {}
    val_bad, augs_bad = pathological_ff(C, c_bad)
    assert val_bad == 2 * C
    assert augs_bad >= 2 * C  # one unit per augmentation: the disease
    gadget = {(0, 1): C, (0, 2): C, (1, 3): C, (2, 3): C, (1, 2): 1}
    c_ek = {}
    val_ek, flow_ek = max_flow_ek(4, gadget, 0, 3, c_ek)
    assert val_ek == 2 * C
    assert c_ek["augs"] == 2  # BFS never touches the middle edge
    certify(4, gadget, flow_ek, val_ek, 0, 3)

    # Oracle 3: scale. n = 500, m = 3,000: augmentations far below the
    # capacity-free V*E/2 bound; the certificate holds.
    N, M = 500, 3_000
    cap = {}
    while len(cap) < M:
        u, v = rng.randrange(N), rng.randrange(N)
        if u != v and (u, v) not in cap:
            cap[(u, v)] = rng.randint(1, 1_000_000)
    s, t = 0, N - 1
    c_scale = {}
    val, flow = max_flow_ek(N, cap, s, t, c_scale)
    certify(N, cap, flow, val, s, t)
    assert c_scale["augs"] <= N * M / 2
    assert c_scale["augs"] < 200  # in practice: tiny, and capacity-free

    # Oracle 4: the application. Project selection: choose projects
    # (with profits) and their prerequisite machines (with costs) to
    # maximize net profit == total profit - min cut. Brute-forced.
    profits = [14, 9, 7, 5]           # projects 0..3
    costs = [10, 6, 8]                # machines 0..2
    needs = [[0, 1], [1], [1, 2], [2]]
    # Network: s -> project (profit), machine -> t (cost), project ->
    # machine (inf).
    S, T = 7, 8
    INF = 10**9
    net = {}
    for p, pr in enumerate(profits):
        net[(S, p)] = pr
    for m_i, co in enumerate(costs):
        net[(4 + m_i, T)] = co
    for p, ms in enumerate(needs):
        for m_i in ms:
            net[(p, 4 + m_i)] = INF
    val_ps, flow_ps = max_flow_ek(9, net, S, T)
    best_net = -1
    best_set = None
    for mask in range(16):
        chosen = [p for p in range(4) if mask >> p & 1]
        machines = set()
        for p in chosen:
            machines.update(needs[p])
        netp = sum(profits[p] for p in chosen) - sum(costs[m_i] for m_i in machines)
        if netp > best_net:
            best_net = netp
            best_set = chosen
    assert sum(profits) - val_ps == best_net  # min-cut == optimal closure

    print(f"contest: the zigzag gadget at C = {C:,}, then a {N}-node/{M:,}-edge network; referee: the min-cut certificate on every flow, plus exhaustive cut enumeration on 200 small graphs")
    print(f"  {'chooser':<26} {'gadget augs':>11}   scale behavior")
    print(f"  {'Pathological (via middle)':<26} {augs_bad:>11,}   one unit per trip: 2C, capacity-dependent")
    print(f"  {'BFS shortest (E-K)':<26} {c_ek['augs']:>11}   {c_scale['augs']} augmentations at n={N}, m={M:,}: capacity-free")
    print(f"duality certified everywhere: cut capacity == flow value, every cut edge saturated, conservation at every node; 200 small instances confirmed against ALL 2^(n-2) cuts")
    print(f"the application: project selection solved by min-cut: net profit {best_net} (= total profits {sum(profits)} - cut {val_ps}), matching brute force over all 16 project sets (chosen: {best_set})")
    print("OK: duality both directions on 200 graphs, the gadget measured at 200,000 vs 2, the scale run far under the capacity-free bound with its certificate, and the min-cut application matching exhaustive search")
