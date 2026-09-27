# Puzzle 162: Register allocation x Graph coloring
# Compiler backend: a program uses unboundedly many virtual registers; the
# machine has K. Values live at the same time cannot share a register, and
# a value that does not fit is spilled: a store after each definition, a
# load before each use. The algorithm (Chaitin 1982) builds the
# interference graph, one node per value and an edge between any two that
# are simultaneously live; a K-coloring is an allocation. The heuristic is
# the simplify-select order with a spill-cost choice (Briggs's optimistic
# variant): remove any node with fewer than K neighbors, since it can be
# colored last; when stuck, remove the node with the smallest cost per
# degree, cost being defs plus uses weighted ten-fold per loop level; pop
# the stack coloring each node with a register its neighbors do not hold,
# spill the ones that find none, rewrite, and repeat.
#
# Referees: (1) two oracles on every allocation, no interference edge
# inside one register and the same trace of computed values on K physical
# registers; (2) 30 random structured programs at K = 4, 8, 12, 16 by
# coloring, linear scan (Poletto and Sarkar 1999), and a degree-only spill
# choice, scored by loads and stores executed; (3) simplify-select and
# DSatur against the exact chromatic number; (4) the negative examples,
# everything in memory and degree-only spilling, measured.
#
# AUTHOR CORRECTIONS: the first generator drew operands uniformly from
# every earlier value, so almost everything lived to the end and every
# method spilled nearly everything (coloring 3,726 values at K = 4 against
# 4,569 for spilling all); operands now favor recent values, 80% from the
# last six defined. The exact chromatic number was first sought by branch
# and bound alone and ran out of budget on 21 of 30 graphs; the maximum
# clique now supplies the lower bound, which meets the upper bound on all.
import copy
import random
import time

SEED = 20260926
OPS = ('add', 'sub', 'mul', 'xor', 'and')
MASK = (1 << 32) - 1


def apply_op(op, a, b):
    if op == 'add':
        return (a + b) & MASK
    if op == 'sub':
        return (a - b) & MASK
    if op == 'mul':
        return (a * b) & MASK
    if op == 'xor':
        return a ^ b
    return a & b


class Program:
    def __init__(self):
        self.blocks = []       # each {'instrs': [...], 'term': (...)}
        self.depth = []        # loop nesting depth per block
        self.nv = 0
        self.temps = set()     # spill temporaries, never spilled again
        self.slots = 0

    def new_block(self, depth):
        self.blocks.append({'instrs': [], 'term': None})
        self.depth.append(depth)
        return len(self.blocks) - 1

    def fresh(self, temp=False):
        self.nv += 1
        v = f'v{self.nv}'
        if temp:
            self.temps.add(v)
        return v


def generate(rng, size):
    """A random structured program: ops, if/else, and counted loops."""
    prog = Program()

    def pick(avail):
        # operands favor recent values: 80% from the last six
        if len(avail) > 6 and rng.random() < 0.8:
            return rng.choice(avail[-6:])
        return rng.choice(avail)

    def body(b, avail, budget, depth):
        avail = list(avail)
        while budget > 0:
            r = rng.random()
            if depth < 2 and r < 0.12 and len(avail) >= 2:
                cond, one = prog.fresh(), prog.fresh()
                prog.blocks[b]['instrs'].append(('const', one, 1))
                prog.blocks[b]['instrs'].append(('op', cond, 'and', pick(avail), one))
                bt, be, bj = prog.new_block(depth), prog.new_block(depth), prog.new_block(depth)
                prog.blocks[b]['term'] = ('br', cond, bt, be)
                n1, n2 = rng.randint(2, 6), rng.randint(2, 6)
                endt = body(bt, avail, n1, depth)
                prog.blocks[endt]['term'] = ('jump', bj)
                ende = body(be, avail, n2, depth)
                prog.blocks[ende]['term'] = ('jump', bj)
                budget -= n1 + n2 + 1
                b = bj
            elif depth < 2 and r < 0.26 and len(avail) >= 2:
                c, one = prog.fresh(), prog.fresh()
                prog.blocks[b]['instrs'].append(('const', c, rng.randint(3, 5)))
                prog.blocks[b]['instrs'].append(('const', one, 1))
                bh, bb, bx = prog.new_block(depth + 1), prog.new_block(depth + 1), prog.new_block(depth)
                prog.blocks[b]['term'] = ('jump', bh)
                prog.blocks[bh]['term'] = ('br', c, bb, bx)
                n1 = rng.randint(4, 10)
                endb = body(bb, avail, n1, depth + 1)
                prog.blocks[endb]['instrs'].append(('op', c, 'sub', c, one))
                prog.blocks[endb]['term'] = ('jump', bh)
                budget -= n1 + 2
                b = bx
            else:
                if not avail or rng.random() < 0.55:
                    d = prog.fresh()
                    if len(avail) < 2 or rng.random() < 0.2:
                        prog.blocks[b]['instrs'].append(('const', d, rng.randint(1, 1000)))
                    else:
                        prog.blocks[b]['instrs'].append(('op', d, rng.choice(OPS), pick(avail), pick(avail)))
                    avail.append(d)
                else:
                    d = pick(avail)
                    prog.blocks[b]['instrs'].append(('op', d, rng.choice(OPS), pick(avail), pick(avail)))
                budget -= 1
        return b

    b0 = prog.new_block(0)
    end = body(b0, [], size, 0)
    last = [ins[1] for ins in prog.blocks[end]['instrs'] if ins[0] in ('op', 'const')][-3:]
    if not last:
        v = prog.fresh()
        prog.blocks[end]['instrs'].append(('const', v, 7))
        last = [v]
    acc = last[0]
    for v in last[1:]:
        t = prog.fresh()
        prog.blocks[end]['instrs'].append(('op', t, 'xor', acc, v))
        acc = t
    prog.blocks[end]['term'] = ('ret', acc)
    return prog


def uses_of(ins):
    k = ins[0]
    if k == 'op':
        return [ins[3], ins[4]]
    if k == 'store':
        return [ins[1]]
    return []


def def_of(ins):
    return ins[1] if ins[0] in ('op', 'const', 'load') else None


def term_uses(term):
    if term[0] in ('br', 'ret'):
        return [term[1]]
    return []


def successors(term):
    if term[0] == 'jump':
        return [term[1]]
    if term[0] == 'br':
        return [term[2], term[3]]
    return []


def liveness(prog):
    B = len(prog.blocks)
    use = [set() for _ in range(B)]
    defs = [set() for _ in range(B)]
    for i, blk in enumerate(prog.blocks):
        for ins in blk['instrs']:
            for u in uses_of(ins):
                if u not in defs[i]:
                    use[i].add(u)
            d = def_of(ins)
            if d is not None:
                defs[i].add(d)
        for u in term_uses(blk['term']):
            if u not in defs[i]:
                use[i].add(u)
    succ = [successors(blk['term']) for blk in prog.blocks]
    live_in = [set() for _ in range(B)]
    live_out = [set() for _ in range(B)]
    changed = True
    while changed:
        changed = False
        for i in reversed(range(B)):
            out = set()
            for s in succ[i]:
                out |= live_in[s]
            inn = use[i] | (out - defs[i])
            if out != live_out[i] or inn != live_in[i]:
                live_out[i], live_in[i] = out, inn
                changed = True
    return live_in, live_out


def analyze(prog):
    """Interference graph by Chaitin's rule (a defined value interferes with
    everything live after its definition), each value's position interval
    over the block order, its loop-weighted cost, and its live positions."""
    live_in, live_out = liveness(prog)
    adj = {}
    lo = {}
    hi = {}
    live_positions = {}
    cost = {}

    def node(v):
        if v not in adj:
            adj[v] = set()
            live_positions[v] = set()
            cost[v] = 0

    def touch(v, p):
        lo[v] = min(lo.get(v, p), p)
        hi[v] = max(hi.get(v, p), p)
        live_positions[v].add(p)

    base = 0
    for i, blk in enumerate(prog.blocks):
        w = 10 ** prog.depth[i]
        n = len(blk['instrs'])
        live = set(live_out[i])
        for u in term_uses(blk['term']):
            live.add(u)
        for v in live:
            node(v)
            touch(v, base + n)
        for u in term_uses(blk['term']):
            cost[u] += w
        for j in range(n - 1, -1, -1):
            ins = blk['instrs'][j]
            p = base + j
            d = def_of(ins)
            if d is not None:
                node(d)
                for l in live:
                    if l != d:
                        node(l)
                        adj[d].add(l)
                        adj[l].add(d)
                touch(d, p)
                cost[d] += w
                live.discard(d)
            for u in uses_of(ins):
                node(u)
                live.add(u)
                cost[u] += w
            for v in live:
                touch(v, p)
        base += n + 1
    return adj, lo, hi, cost, live_positions


def simplify_select(adj, K, cost, temps, spill_choice='cost'):
    # Chaitin's simplify-select with Briggs's optimistic coloring
    deg = {v: len(adj[v]) for v in adj}
    work = set(adj)
    stack = []
    while work:
        low = [v for v in work if deg[v] < K]
        if low:
            v = min(low, key=lambda x: (deg[x], x))
        else:
            cands = [v for v in work if v not in temps] or list(work)
            if spill_choice == 'cost':
                v = min(cands, key=lambda x: (cost[x] / max(deg[x], 1), x))
            else:
                v = max(cands, key=lambda x: (deg[x], x))
        stack.append(v)
        work.discard(v)
        for m in adj[v]:
            if m in work:
                deg[m] -= 1
    color = {}
    spilled = []
    while stack:
        v = stack.pop()
        used = {color[m] for m in adj[v] if m in color}
        free = [c for c in range(K) if c not in used]
        if free:
            color[v] = free[0]
        else:
            spilled.append(v)
    return color, spilled


def linear_scan(lo, hi, K, temps):
    """Poletto and Sarkar: by interval start; when K are active, spill the
    interval that ends last (spill temporaries are exempt)."""
    intervals = sorted(lo, key=lambda v: (lo[v], hi[v], v))
    active = []
    free = list(range(K))
    color = {}
    spilled = []
    for v in intervals:
        start = lo[v]
        keep = []
        for a in active:
            if hi[a] < start:
                free.append(color[a])
            else:
                keep.append(a)
        active = keep
        if free:
            color[v] = free.pop()
            active.append(v)
            continue
        victims = [a for a in active if a not in temps]
        far = max(victims, key=lambda a: (hi[a], a)) if victims else None
        if v not in temps and (far is None or hi[far] <= hi[v]):
            spilled.append(v)
        elif far is not None:
            color[v] = color[far]
            del color[far]
            active.remove(far)
            spilled.append(far)
            active.append(v)
        else:
            raise RuntimeError('register pressure exceeds K among spill temporaries')
    return color, spilled


def rewrite_spills(prog, spilled):
    slot = {}
    for v in spilled:
        slot[v] = prog.slots
        prog.slots += 1
    for blk in prog.blocks:
        new = []
        for ins in blk['instrs']:
            k = ins[0]
            if k == 'op':
                _, d, op, a, b = ins
                if a in slot:
                    t = prog.fresh(True)
                    new.append(('load', t, slot[a]))
                    a2 = t
                else:
                    a2 = a
                if b in slot:
                    if b == a:
                        b2 = a2
                    else:
                        t = prog.fresh(True)
                        new.append(('load', t, slot[b]))
                        b2 = t
                else:
                    b2 = b
                if d in slot:
                    t = prog.fresh(True)
                    new.append(('op', t, op, a2, b2))
                    new.append(('store', t, slot[d]))
                else:
                    new.append(('op', d, op, a2, b2))
            elif k == 'const':
                _, d, imm = ins
                if d in slot:
                    t = prog.fresh(True)
                    new.append(('const', t, imm))
                    new.append(('store', t, slot[d]))
                else:
                    new.append(ins)
            else:
                new.append(ins)
        term = blk['term']
        if term[0] in ('br', 'ret') and term[1] in slot:
            t = prog.fresh(True)
            new.append(('load', t, slot[term[1]]))
            blk['term'] = (term[0], t) + term[2:]
        blk['instrs'] = new


def allocate(prog, K, method, max_rounds=30):
    # returns (program after spilling, register map, spilled values, rounds)
    prog = copy.deepcopy(prog)
    spilled_all = []
    for r in range(max_rounds):
        adj, lo, hi, cost, _ = analyze(prog)
        if method == 'coloring':
            color, spilled = simplify_select(adj, K, cost, prog.temps, 'cost')
        elif method == 'coloring-degree':
            color, spilled = simplify_select(adj, K, cost, prog.temps, 'degree')
        elif method == 'linear-scan':
            color, spilled = linear_scan(lo, hi, K, prog.temps)
        elif method == 'memory':
            originals = [v for v in adj if v not in prog.temps]
            if originals:
                rewrite_spills(prog, originals)
                spilled_all += originals
                continue
            color, spilled = simplify_select(adj, K, cost, prog.temps, 'cost')
        else:
            raise ValueError(method)
        if not spilled:
            return prog, color, spilled_all, r + 1
        spilled_all += spilled
        rewrite_spills(prog, spilled)
    raise RuntimeError(f'{method} did not converge in {max_rounds} rounds at K = {K}')


def run(prog, regmap=None, K=None, limit=200000):
    # interpret on virtual registers, or on K physical ones with a register
    # map; returns (trace of computed values, steps, loads, stores)
    if regmap is None:
        regs = {}
        R = lambda v: regs[v]
        W = lambda v, x: regs.__setitem__(v, x)
    else:
        file = [0] * K
        R = lambda v: file[regmap[v]]
        W = lambda v, x: file.__setitem__(regmap[v], x)
    mem = {}
    trace = []
    b = 0
    steps = loads = stores = 0
    while True:
        blk = prog.blocks[b]
        for ins in blk['instrs']:
            steps += 1
            if steps > limit:
                raise RuntimeError('runaway program')
            k = ins[0]
            if k == 'const':
                W(ins[1], ins[2])
                trace.append(ins[2])
            elif k == 'op':
                x = apply_op(ins[2], R(ins[3]), R(ins[4]))
                W(ins[1], x)
                trace.append(x)
            elif k == 'load':
                W(ins[1], mem[ins[2]])
                loads += 1
            else:
                mem[ins[2]] = R(ins[1])
                stores += 1
        term = blk['term']
        if term[0] == 'jump':
            b = term[1]
        elif term[0] == 'br':
            b = term[2] if R(term[1]) != 0 else term[3]
        else:
            trace.append(R(term[1]))
            return trace, steps, loads, stores


def valid_allocation(prog, regmap):
    adj, _, _, _, _ = analyze(prog)
    for v in adj:
        if v not in regmap:
            return False
        for m in adj[v]:
            if regmap[m] == regmap[v]:
                return False
    return True


def dsatur(adj):
    # Brelaz's DSatur greedy coloring; returns the number of colors used
    color = {}
    sat = {v: set() for v in adj}
    while len(color) < len(adj):
        v = max((v for v in adj if v not in color), key=lambda v: (len(sat[v]), len(adj[v]), v))
        c = 0
        while c in sat[v]:
            c += 1
        color[v] = c
        for m in adj[v]:
            sat[m].add(c)
    return max(color.values()) + 1 if color else 0


def max_clique(adj):
    # maximum clique by Bron-Kerbosch with pivoting: a lower bound on chi
    best = [0]

    def bk(R, P, X):
        if not P and not X:
            best[0] = max(best[0], len(R))
            return
        if len(R) + len(P) <= best[0]:
            return
        u = max(P | X, key=lambda v: len(adj[v] & P))
        for v in list(P - adj[u]):
            bk(R | {v}, P & adj[v], X & adj[v])
            P = P - {v}
            X = X | {v}

    bk(set(), set(adj), set())
    return best[0]


def chromatic_number(adj, ub, budget=200000):
    # exact chi: the clique is a lower bound; when ub meets it the answer is
    # proven, otherwise a budgeted DSatur branch and bound searches the gap
    nodes = list(adj)
    omega = max_clique(adj) if nodes else 0
    best = [ub]
    if best[0] <= omega:
        return best[0], True, omega
    color = {}
    counter = [0]
    exact = [True]

    def search(k_used):
        counter[0] += 1
        if counter[0] > budget:
            exact[0] = False
        if not exact[0] or best[0] <= omega or k_used >= best[0]:
            return
        if len(color) == len(nodes):
            best[0] = k_used
            return
        v = max((v for v in nodes if v not in color), key=lambda v: (len({color[m] for m in adj[v] if m in color}), len(adj[v]), v))
        used = {color[m] for m in adj[v] if m in color}
        for c in range(min(k_used + 1, best[0] - 1)):
            if c not in used:
                color[v] = c
                search(max(k_used, c + 1))
                del color[v]

    search(0)
    return best[0], exact[0], omega


if __name__ == '__main__':
    rng = random.Random(SEED)
    programs = [generate(rng, rng.randint(40, 80)) for _ in range(30)]
    originals = [run(p) for p in programs]
    sizes = [len(analyze(p)[0]) for p in programs]

    # Oracles 1, 2, and 4: allocate every program at K = 4, 6, 8.
    methods = ['coloring', 'linear-scan', 'coloring-degree', 'memory']
    KS = (4, 8, 12, 16)
    totals = {K: {m: {'spills': 0, 'memops': 0, 'rounds': 0, 'valid': 0, 'same': 0} for m in methods} for K in KS}
    for K in KS:
        for p, (trace0, _, _, _) in zip(programs, originals):
            for m in methods:
                q, regmap, spilled, rounds = allocate(p, K, m)
                tr, steps, loads, stores = run(q, regmap, K)
                t = totals[K][m]
                t['spills'] += len(spilled)
                t['memops'] += loads + stores
                t['rounds'] = max(t['rounds'], rounds)
                t['valid'] += valid_allocation(q, regmap)
                t['same'] += tr == trace0
    for K in KS:
        for m in methods:
            assert totals[K][m]['valid'] == 30 and totals[K][m]['same'] == 30, (K, m, totals[K][m])
    pressures = []
    for p in programs:
        adj, lo, hi, cost, lp = analyze(p)
        count = {}
        for v in lp:
            for pos in lp[v]:
                count[pos] = count.get(pos, 0) + 1
        pressures.append(max(count.values()))

    # Oracle 3: the coloring itself against the exact chromatic number.
    ss_eq = ds_eq = exact_n = omega_eq = 0
    ss_over = ds_over = 0
    t_exact = 0.0
    worst_gap = 0
    for p in programs:
        adj, lo, hi, cost, _ = analyze(p)
        color, spilled = simplify_select(adj, 10 ** 6, cost, set(), 'cost')
        ss = max(color.values()) + 1
        ds = dsatur(adj)
        t0 = time.perf_counter()
        chi, exact, omega = chromatic_number(adj, min(ss, ds))
        t_exact += time.perf_counter() - t0
        omega_eq += chi == omega
        if exact:
            exact_n += 1
            ss_eq += ss == chi
            ds_eq += ds == chi
            ss_over += ss - chi
            ds_over += ds - chi
            worst_gap = max(worst_gap, ss - chi)
    assert exact_n >= 25, exact_n
    assert ss_eq >= 0.8 * exact_n, (ss_eq, exact_n)

    # Linear scan's over-approximation: dead positions inside intervals.
    holes = total_len = 0
    for p in programs:
        adj, lo, hi, cost, live_positions = analyze(p)
        for v in adj:
            total_len += hi[v] - lo[v] + 1
            holes += hi[v] - lo[v] + 1 - len(live_positions[v])
    hole_frac = holes / total_len

    # Timing: one large program, the graph build and coloring against the scan.
    big = generate(random.Random(SEED + 7), 3000)
    t0 = time.perf_counter()
    adj_b, lo_b, hi_b, cost_b, _ = analyze(big)
    t_build = time.perf_counter() - t0
    t0 = time.perf_counter()
    simplify_select(adj_b, 8, cost_b, set(), 'cost')
    t_color = time.perf_counter() - t0
    t0 = time.perf_counter()
    linear_scan(lo_b, hi_b, 8, set())
    t_scan = time.perf_counter() - t0
    big_edges = sum(len(a) for a in adj_b.values()) // 2

    print(f'contest: 30 random structured programs of {min(sizes)} to {max(sizes)} values; every allocation checked two ways: '
          'no interference edge inside one register, and the same trace of computed values on K physical registers')
    print(f"  {'K':>2} {'method':>18} {'spilled values':>14} {'dynamic loads+stores':>20} {'max rounds':>10} {'valid':>5} {'same trace':>10}")
    for K in KS:
        for m in methods:
            t = totals[K][m]
            print(f"  {K:>2} {m:>18} {t['spills']:>14,} {t['memops']:>20,} {t['rounds']:>10} {t['valid']:>3}/30 {t['same']:>7}/30")
    print(f'coloring quality on the 30 original graphs (exact chi in {t_exact:.2f} s, exact on {exact_n} of 30, chi = clique number on {omega_eq}): '
          f'simplify-select exactly chi on {ss_eq} of {exact_n} (excess {ss_over}, worst gap {worst_gap}); DSatur exactly chi on {ds_eq} (excess {ds_over})')
    print(f'linear scan intervals: {hole_frac:.1%} of interval positions are dead (the register is held, the value is not live)')
    print(f'register pressure (most values live at one point): min {min(pressures)}, median {sorted(pressures)[15]}, max {max(pressures)}')
    print(f'one program of {len(adj_b):,} values, {big_edges:,} edges, K = 8: graph build {t_build:.2f} s, simplify-select {t_color:.2f} s, linear scan {t_scan*1000:.0f} ms')
    for K in (4, 8, 12):
        assert totals[K]['coloring']['memops'] < totals[K]['linear-scan']['memops'], (K, totals[K])
        assert totals[K]['coloring']['memops'] < totals[K]['coloring-degree']['memops'], (K, totals[K])
    assert totals[16]['memory']['memops'] > 5 * max(1, totals[16]['coloring']['memops']), totals[16]
    print(f"OK: coloring beats linear scan on dynamic memory traffic at K = 4 ({totals[4]['coloring']['memops']:,} vs {totals[4]['linear-scan']['memops']:,}), "
          f"K = 8 ({totals[8]['coloring']['memops']:,} vs {totals[8]['linear-scan']['memops']:,}), K = 12 ({totals[12]['coloring']['memops']:,} vs {totals[12]['linear-scan']['memops']:,}); "
          f"degree-only spilling {totals[8]['coloring-degree']['memops']:,} at K = 8; everything in memory {totals[16]['memory']['memops']:,} against {totals[16]['coloring']['memops']:,} at K = 16; "
          f'simplify-select matches chi on {ss_eq} of {exact_n}; every allocation valid and trace-identical')
