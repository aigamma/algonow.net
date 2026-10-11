"""Static timing analysis x longest-path arrival propagation.

Arrivals sweep forward in topological order (max over fan-ins of arrival
plus wire, plus the gate delay), required times sweep backward, slack is the
difference, the zero-slack chain is the critical path: linear in the edges
where paths are exponential in the depth. Referees: every path enumerated,
Bellman-Ford, exhaustive event-driven simulation (the false path), closed
forms for setup, hold, and skew, Monte Carlo over delay variation.
Author corrections: the pessimism share is measured, not assumed; the
corner's gap against the Monte Carlo quantile is printed, not guessed.
"""
import heapq
import math
import random
import time
from itertools import product


def evaluate(fn, ins):
    if fn == 'mux':  # ins = [select, d0, d1]
        return ins[2] if ins[0] else ins[1]
    if fn in ('not', 'buf'):
        return ins[0] ^ (fn == 'not')
    a, o = all(ins), any(ins)
    return {'and': int(a), 'or': int(o), 'nand': int(not a), 'nor': int(not o), 'xor': sum(ins) & 1}[fn]


def node(kind, delay, fanin, fn):
    return {'kind': kind, 'delay': delay, 'fanin': fanin, 'fn': fn}


def random_netlist(rng, n_pi, n_gates, n_po, max_fanin=3):
    """Gates draw fan-ins among earlier nodes (acyclic), one from the last few."""
    net = {f'i{i}': node('pi', 0.0, [], None) for i in range(n_pi)}
    names = list(net)
    for g in range(n_gates):
        k = rng.randint(1, min(max_fanin, len(names)))
        pool = names[-6:] if len(names) > 6 else names
        picks = [rng.choice(pool)]
        while len(picks) < k:
            c = rng.choice(names)
            if c not in picks:
                picks.append(c)
        fn = 'not' if k == 1 else rng.choice(('and', 'or', 'nand', 'nor', 'xor'))
        fanin = [(u, round(rng.uniform(0.05, 0.5), 2)) for u in picks]
        net[f'g{g}'] = node('gate', round(rng.uniform(0.5, 3.0), 2), fanin, fn)
        names.append(f'g{g}')
    gates = [n for n in names if n.startswith('g')]
    for o in range(n_po):
        src = gates[-1 - o] if o < len(gates) else rng.choice(gates)
        net[f'o{o}'] = node('po', 0.0, [(src, round(rng.uniform(0.05, 0.5), 2))], 'buf')
    return net


def layered_netlist(width, depth, delay=1.0):
    net = {f'i{i}': node('pi', 0.0, [], None) for i in range(width)}
    prev = list(net)
    for d in range(depth):
        cur = [f'g{d}_{j}' for j in range(width)]
        for name in cur:
            net[name] = node('gate', delay, [(u, 0.1) for u in prev], 'and')
        prev = cur
    net['o0'] = node('po', 0.0, [(prev[0], 0.1)], 'buf')
    return net


# --- the analysis -----------------------------------------------------------

def topo_order(net):
    """Kahn's algorithm: release a node once every fan-in is done."""
    indeg = {v: len(net[v]['fanin']) for v in net}
    fanout = {v: [] for v in net}
    for v in net:
        for u, w in net[v]['fanin']:
            fanout[u].append((v, w))
    ready, order = [v for v in net if indeg[v] == 0], []
    while ready:
        v = ready.pop()
        order.append(v)
        for w, _ in fanout[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                ready.append(w)
    assert len(order) == len(net), 'cycle in the netlist'
    return order, fanout


def arrival(net, order, longest=True, pi_at=None):
    """Forward pass: arrivals, winning fan-ins, and the edge relaxation count."""
    pick = max if longest else min
    at, pred, relax = {}, {}, 0
    for v in order:
        n = net[v]
        if n['kind'] == 'pi':
            at[v], pred[v] = (pi_at or {}).get(v, 0.0), None
            continue
        t, u = pick((at[u] + w, u) for u, w in n['fanin'])
        relax += len(n['fanin'])
        at[v], pred[v] = t + n['delay'], u
    return at, pred, relax


def required(net, order, fanout, at, period):
    """Backward pass; slack = required - arrival; a dead gate is unconstrained."""
    rt = {}
    for v in reversed(order):
        if net[v]['kind'] == 'po':
            rt[v] = period
        elif fanout[v]:
            rt[v] = min(rt[w] - net[w]['delay'] - wd for w, wd in fanout[v])
        else:
            rt[v] = math.inf
    return rt, {v: rt[v] - at[v] for v in net}


def critical_path(net, at, pred):
    end = max((v for v in net if net[v]['kind'] == 'po'), key=lambda v: at[v])
    path = [end]
    while pred[path[-1]] is not None:
        path.append(pred[path[-1]])
    return path[::-1], at[end]


# --- referees ---------------------------------------------------------------

def enumerate_paths(net, fanout):
    """Every input-to-output path, explicitly, with its delay and its hops."""
    paths = []

    def walk(v, so_far, hops):
        if net[v]['kind'] == 'po':
            paths.append((so_far, hops))
            return
        for w, wd in fanout[v]:
            walk(w, so_far + wd + net[w]['delay'], hops + [w])

    for v in net:
        if net[v]['kind'] == 'pi':
            walk(v, 0.0, [v])
    return paths


def count_paths(net, order):
    cnt = {}
    for v in order:
        cnt[v] = 1 if net[v]['kind'] == 'pi' else sum(cnt[u] for u, _ in net[v]['fanin'])
    return sum(cnt[v] for v in net if net[v]['kind'] == 'po')


def bellman_ford_longest(net):
    """Longest arrivals with no topological order, on negated weights."""
    dist = {v: (0.0 if net[v]['kind'] == 'pi' else -math.inf) for v in net}
    edges = [(u, v, -(w + net[v]['delay'])) for v in net for u, w in net[v]['fanin']]
    for _ in range(len(net) - 1):
        changed = False
        for u, v, c in edges:
            if dist[u] != -math.inf and (dist[v] == -math.inf or dist[u] + c < dist[v]):
                dist[v], changed = dist[u] + c, True
        if not changed:
            break
    return {v: -d for v, d in dist.items()}


def simulate(net, order, fanout, vec_a, vec_b):
    """Transport-delay event simulation: settle on a, switch to b at time zero."""
    pis = [v for v in order if net[v]['kind'] == 'pi']
    val = {}
    for v in order:
        n = net[v]
        val[v] = vec_a[pis.index(v)] if n['kind'] == 'pi' else evaluate(n['fn'], [val[u] for u, _ in n['fanin']])
    heap, seq, events, last_po = [], 0, 0, 0.0
    for i, v in enumerate(pis):
        if vec_b[i] != val[v]:
            heapq.heappush(heap, (0.0, seq, v, vec_b[i]))
            seq += 1
    while heap:
        t, _, v, newv = heapq.heappop(heap)
        events += 1
        if val[v] == newv:
            continue
        val[v] = newv
        if net[v]['kind'] == 'po':
            last_po = max(last_po, t)
            continue
        for w, wd in fanout[v]:
            n = net[w]
            heapq.heappush(heap, (t + wd + n['delay'], seq, w, evaluate(n['fn'], [val[u] for u, _ in n['fanin']])))
            seq += 1
    return last_po, events


def dynamic_longest(net):
    order, fanout = topo_order(net)
    n_pi = sum(1 for v in net if net[v]['kind'] == 'pi')
    best, total = 0.0, 0
    vectors = list(product((0, 1), repeat=n_pi))
    for a in vectors:
        for b in vectors:
            if a != b:
                t, ev = simulate(net, order, fanout, a, b)
                best, total = max(best, t), total + ev
    return best, total, len(vectors) * (len(vectors) - 1)


def false_path_circuit():
    """a's slow chain enters mux1's d0 (s = 0); mux1 enters mux2's d1 (s = 1)."""
    net = {k: node('pi', 0.0, [], None) for k in ('a', 'b', 'c', 's')}
    prev = 'a'
    for i in range(4):
        net[f'buf{i}'] = node('gate', 2.0, [(prev, 0.1)], 'buf')
        prev = f'buf{i}'
    net['mux1'] = node('gate', 1.0, [('s', 0.1), (prev, 0.1), ('b', 0.1)], 'mux')
    net['mux2'] = node('gate', 1.0, [('s', 0.1), ('c', 0.1), ('mux1', 0.1)], 'mux')
    net['o0'] = node('po', 0.0, [('mux2', 0.1)], 'buf')
    return net


def project_schedule(rng, n_tasks):
    """The critical path method: durations in days, zero wire delay."""
    net = {'start': node('pi', 0.0, [], None)}
    names = ['start']
    for t in range(n_tasks):
        k = rng.randint(1, min(2, len(names)))
        preds = rng.sample(names[-5:] if len(names) > 5 else names, k)
        net[f't{t}'] = node('gate', float(rng.randint(1, 12)), [(p, 0.0) for p in preds], 'and')
        names.append(f't{t}')
    used = {p for w in net.values() for p, _ in w['fanin']}
    sinks = [v for v in names if v != 'start' and v not in used]
    net['finish'] = node('po', 0.0, [(s, 0.0) for s in sinks], 'and')
    return net


def main():
    t0 = time.perf_counter()
    rng = random.Random(20261010)
    near = lambda x, y, eps=1e-9: abs(x - y) <= eps
    checks = 0

    # 1. every arrival equals the longest enumerated path and Bellman-Ford
    n_nets, n_paths, max_paths, relax_total = 300, 0, 0, 0
    for _ in range(n_nets):
        net = random_netlist(rng, rng.randint(3, 5), rng.randint(6, 14), rng.randint(1, 3))
        order, fanout = topo_order(net)
        at, pred, relax = arrival(net, order)
        relax_total += relax
        paths = enumerate_paths(net, fanout)
        assert len(paths) == count_paths(net, order)
        n_paths += len(paths)
        max_paths = max(max_paths, len(paths))
        # every prefix of a full path is a path to its last hop
        longest, shortest = {}, {}
        for d, hops in paths:
            s = 0.0
            for i in range(1, len(hops)):
                s += dict(net[hops[i]]['fanin'])[hops[i - 1]] + net[hops[i]]['delay']
                longest[hops[i]] = max(longest.get(hops[i], -1.0), s)
                shortest[hops[i]] = min(shortest.get(hops[i], 1e18), s)
        for v in longest:
            assert near(at[v], longest[v]), (v, at[v], longest[v])
        bf = bellman_ford_longest(net)
        assert all(near(at[v], bf[v]) for v in net)
        cp, cp_delay = critical_path(net, at, pred)
        assert near(cp_delay, max(d for d, _ in paths))
        assert net[cp[0]]['kind'] == 'pi' and net[cp[-1]]['kind'] == 'po'
        at_min, _, _ = arrival(net, order, longest=False)
        for v in shortest:
            assert near(at_min[v], shortest[v])
        rt, slack = required(net, order, fanout, at, cp_delay)
        assert all(near(slack[v], 0.0) for v in cp)
        assert min(s for s in slack.values() if s != math.inf) > -1e-9
        checks += 7
    print(f'{n_nets} random netlists: arrival = longest enumerated path = Bellman-Ford on every node; '
          f'{n_paths:,} paths (max {max_paths} per netlist) against {relax_total:,} relaxations')

    # 2. paths explode with depth, relaxations do not
    rows = []
    for width, depth in ((3, 4), (4, 8), (4, 16), (6, 24)):
        net = layered_netlist(width, depth)
        order, fanout = topo_order(net)
        at, pred, relax = arrival(net, order)
        cnt = count_paths(net, order)
        cp, cp_delay = critical_path(net, at, pred)
        assert near(cp_delay, depth * 1.1 + 0.1) and len(cp) == depth + 2
        rows.append((width, depth, cnt, relax))
        if cnt < 200000:
            assert len(enumerate_paths(net, fanout)) == cnt
        checks += 1
    print('width depth    paths               relaxations')
    for w, d, c, r in rows:
        print(f'{w:5d} {d:5d} {c:>18,} {r:>12,}')

    # 3. setup and hold at the flip-flops, Fmax, skew
    net = random_netlist(rng, 6, 120, 4)
    order, fanout = topo_order(net)
    t_cq, t_su, t_h = 0.3, 0.2, 0.1
    pis = [v for v in net if net[v]['kind'] == 'pi']
    pos = [v for v in net if net[v]['kind'] == 'po']
    at, pred, relax = arrival(net, order, pi_at={p: t_cq for p in pis})
    at_min, _, _ = arrival(net, order, longest=False, pi_at={p: t_cq for p in pis})
    worst = max(at[o] for o in pos)
    fmax_period = worst + t_su
    lo, hi = 0.0, 100.0
    for _ in range(60):
        mid = (lo + hi) / 2
        rt, slack = required(net, order, fanout, at, mid - t_su)
        lo, hi = (lo, mid) if min(slack[o] for o in pos) >= 0 else (mid, hi)
    assert near(hi, fmax_period, 1e-9)
    period = round(fmax_period + 0.5, 2)
    rt, slack = required(net, order, fanout, at, period - t_su)
    for o in pos:
        assert near(slack[o], period - t_su - at[o])
    hold = {o: at_min[o] - t_h for o in pos}
    skew = 0.4
    rt_s, slack_s = required(net, order, fanout, at, period - t_su + skew)
    assert all(near(slack_s[o] - slack[o], skew) for o in pos)
    assert all(near(hold[o] - (at_min[o] - t_h - skew), skew) for o in pos)
    cp, cp_delay = critical_path(net, at, pred)
    print(f'sequential: {len(net)} nodes, longest register path {worst:.2f} ns over {len(cp) - 2} gates, Fmax {1000 / fmax_period:.1f} MHz '
          f'(period {fmax_period:.2f}), binary search agrees; at {period:.2f} ns setup slack {min(slack[o] for o in pos):.2f}, '
          f'hold slack {min(hold.values()):.2f}; {skew} ns of capture skew shifts every setup slack by +{skew} and every hold slack by -{skew}')
    checks += 4

    # 4. the false path: a structural longest path that no vector pair exercises
    fp = false_path_circuit()
    order_fp, fanout_fp = topo_order(fp)
    at_fp, pred_fp, _ = arrival(fp, order_fp)
    cp_fp, sta_fp = critical_path(fp, at_fp, pred_fp)
    dyn_fp, ev_fp, pairs_fp = dynamic_longest(fp)
    assert sta_fp > dyn_fp + 5.0 and dyn_fp > 0
    print(f'false path: STA reports {sta_fp:.1f} ns through {" > ".join(cp_fp)}; all {pairs_fp} vector pairs '
          f'({ev_fp:,} events) never settle later than {dyn_fp:.1f} ns')
    checks += 1
    n_small, gap_count, constant, worst_gap, events = 60, 0, 0, 0.0, 0
    for _ in range(n_small):
        sm = random_netlist(rng, 4, rng.randint(5, 9), 1)
        o_s, f_s = topo_order(sm)
        a_s, p_s, _ = arrival(sm, o_s)
        _, sta_d = critical_path(sm, a_s, p_s)
        dyn_d, ev, _ = dynamic_longest(sm)
        events += ev
        assert dyn_d <= sta_d + 1e-9
        if dyn_d == 0:
            constant += 1  # the output never moves; STA still reports a path
        elif sta_d - dyn_d > 1e-9:
            gap_count += 1
            worst_gap = max(worst_gap, (sta_d - dyn_d) / sta_d)
    print(f'{n_small} random four-input circuits: simulation never exceeds STA; {constant} constant output; STA strictly pessimistic on '
          f'{gap_count} of the rest (worst gap {100 * worst_gap:.0f}%); {events:,} events against {240 * n_small:,} vector pairs')
    checks += 1

    # 5. the critical path method is the same recurrence on a schedule
    proj = project_schedule(rng, 30)
    o_p, f_p = topo_order(proj)
    a_p, p_p, _ = arrival(proj, o_p)
    cp_p, finish = critical_path(proj, a_p, p_p)
    paths_p = enumerate_paths(proj, f_p)
    assert near(finish, max(d for d, _ in paths_p))
    rt_p, slack_p = required(proj, o_p, f_p, a_p, finish)
    crit = [v for v in proj if near(slack_p[v], 0.0) and proj[v]['kind'] == 'gate']
    print(f'critical path method on 30 tasks: finish day {finish:.0f}, {len(crit)} critical tasks with zero float, '
          f'{len(paths_p)} enumerated schedule paths agree')
    checks += 1

    # 6. statistical timing: Monte Carlo over delay variation against the corner
    net = random_netlist(rng, 6, 200, 4)
    order, fanout = topo_order(net)
    at, pred, relax = arrival(net, order)
    cp, nominal = critical_path(net, at, pred)
    sigma, samples, delays = 0.10, 1000, []
    mc = random.Random(7)
    base = {v: net[v]['delay'] for v in net}

    def scale(f):
        for v in net:
            if net[v]['kind'] == 'gate':
                net[v]['delay'] = max(0.05, base[v] * f(v))

    for _ in range(samples):
        scale(lambda v: 1 + sigma * mc.gauss(0, 1))
        a, p, _ = arrival(net, order)
        delays.append(critical_path(net, a, p)[1])
    scale(lambda v: 1 + 3 * sigma)
    a, p, _ = arrival(net, order)
    corner = critical_path(net, a, p)[1]
    scale(lambda v: 1.0)
    delays.sort()
    mean = sum(delays) / samples
    sd = math.sqrt(sum((d - mean) ** 2 for d in delays) / (samples - 1))
    q3 = delays[int(0.9987 * samples)]
    assert corner > q3 > nominal and abs(mean - nominal) < 3 * sd
    print(f'statistical timing, {len(net)} nodes: nominal {nominal:.2f} ns; Monte Carlo, {samples} samples at 10% gate sigma: '
          f'mean {mean:.2f}, sd {sd:.2f}, 99.87th percentile {q3:.2f}; all gates at 3 sigma: {corner:.2f} '
          f'({100 * (corner / q3 - 1):.0f}% pessimistic); {relax} relaxations per analysis')
    checks += 1

    elapsed = time.perf_counter() - t0
    assert elapsed < 30
    print(f'OK: arrivals equal the longest enumerated path and Bellman-Ford on {n_nets} netlists ({n_paths:,} paths against '
          f'{relax_total:,} relaxations), shortest paths likewise; the {rows[-1][0]}-wide {rows[-1][1]}-deep ladder has {rows[-1][2]:,} paths '
          f'and {rows[-1][3]} relaxations; Fmax {1000 / fmax_period:.1f} MHz from the {worst:.2f} ns register path, slacks closed form, '
          f'skew shifts setup and hold by exactly {skew}; the false path reads {sta_fp:.1f} ns in STA against {dyn_fp:.1f} ns over all '
          f'{pairs_fp} vector pairs, STA pessimistic on {gap_count} of {n_small - constant} toggling circuits; Monte Carlo 99.87th '
          f'percentile {q3:.2f} against the corner {corner:.2f}; {checks} checks in {elapsed:.1f} s')


if __name__ == '__main__':
    main()
