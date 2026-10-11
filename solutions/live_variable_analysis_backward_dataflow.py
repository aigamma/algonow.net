"""Live variable analysis x Backward dataflow (puzzle 220).

A variable is live at a point when some path from that point reads it before
writing it. IN[B] = use[B] | (OUT[B] - def[B]); OUT[B] = union of IN over the
successors; exit OUT is empty. The facts flow against control, so the worklist
runs in postorder and revisits a predecessor only when a successor's IN grew.
Referees that never form a set equation: a per-variable reachability search
over the graph, and exhaustive simple paths on the smaller programs. Then the
two consumers, dead-store elimination (checked by executing every program
before and after) and the interference graph for register allocation, and the
negative example: one backward sweep without iteration.

Author correction recorded while measuring: the draft expected the liveness
interference graph to need about half the registers of the naive "every
variable interferes" allocation. Measured: 5.17 of 6 on average, because every
variable is read from input in the entry block and printed late, so most are
live together at most points; the saving is real but small here, and the
chromatic number equals the largest simultaneously live set on every program.
"""
import random
import sys
import time
from collections import deque

NV = 6
MOD = 101


class Program:
    def __init__(self):
        self.blocks, self.succ, self.cond, self.loop_head = [], [], [], []

    def new(self):
        self.blocks.append([]); self.succ.append([]); self.cond.append(None); self.loop_head.append(False)
        return len(self.blocks) - 1

    def preds(self):
        p = [[] for _ in self.blocks]
        for b, ss in enumerate(self.succ):
            for s in ss:
                p[s].append(b)
        return p


def reads(st):
    return {st[3], st[4]} if st[0] == 'asg' else ({st[1]} if st[0] == 'prt' else set())


def writes(st):
    return {st[1]} if st[0] in ('asg', 'cst', 'inp') else set()


def gen_program(rng, max_depth=3):
    pg = Program()
    depth_seen = [0]

    def stmt():
        r = rng.random()
        if r < 0.55:
            return ('asg', rng.randrange(NV), rng.choice('+-*'), rng.randrange(NV), rng.randrange(NV))
        if r < 0.75:
            return ('cst', rng.randrange(NV), rng.randrange(10))
        return ('prt', rng.randrange(NV))

    def simple():
        b = pg.new()
        pg.blocks[b] = [stmt() for _ in range(rng.randint(1, 3))]
        return b, b

    def fragment(depth):
        first = last = None
        for _ in range(rng.randint(1, 3)):
            r = rng.random()
            if depth >= max_depth or r < 0.45:
                f, l = simple()
            elif r < 0.75:
                f = pg.new(); pg.cond[f] = rng.randrange(NV)
                a0, a1 = fragment(depth + 1); b0, b1 = fragment(depth + 1)
                l = pg.new()
                pg.succ[f] = [a0, b0]; pg.succ[a1].append(l); pg.succ[b1].append(l)
                pg.blocks[l] = [stmt()] if rng.random() < 0.5 else []
            else:
                depth_seen[0] = max(depth_seen[0], depth + 1)
                f = pg.new(); pg.cond[f] = rng.randrange(NV); pg.loop_head[f] = True
                b0, b1 = fragment(depth + 1)
                l = pg.new()
                pg.succ[f] = [b0, l]; pg.succ[b1].append(f)
                pg.blocks[l] = [stmt()] if rng.random() < 0.5 else []
            if last is not None:
                pg.succ[last].append(f)
            first = f if first is None else first
            last = l
        return first, last

    entry = pg.new()
    pg.blocks[entry] = [('inp', v) for v in range(NV)]
    f, l = fragment(0)
    pg.succ[entry].append(f)
    ex = pg.new()
    pg.blocks[ex] = [('prt', rng.randrange(NV)) for _ in range(2)]
    pg.succ[l].append(ex)
    return pg, depth_seen[0]


def use_def(pg):
    use, dfn = [], []
    for b, blk in enumerate(pg.blocks):
        u, d = set(), set()
        for st in blk:
            u |= reads(st) - d
            d |= writes(st) - u
        if pg.cond[b] is not None and pg.cond[b] not in d:
            u.add(pg.cond[b])
        use.append(u); dfn.append(d)
    return use, dfn


def postorder(pg):
    seen, order = set(), []

    def dfs(b):
        seen.add(b)
        for s in pg.succ[b]:
            if s not in seen:
                dfs(s)
        order.append(b)
    dfs(0)
    return order


class Stats:
    def __init__(self):
        self.visits = self.ops = self.passes = 0


def transfer(pg, use, dfn, b, IN, OUT, st):
    out = set()
    for s in pg.succ[b]:
        out |= IN[s]; st.ops += 1
    new = use[b] | (out - dfn[b]); st.ops += 1; st.visits += 1
    OUT[b] = out
    changed = new != IN[b]
    assert new >= IN[b], 'a live set shrank'
    IN[b] = new
    return changed


def worklist(pg, use, dfn, order):
    n = len(pg.blocks); IN = [set() for _ in range(n)]; OUT = [set() for _ in range(n)]
    st = Stats(); preds = pg.preds(); q = deque(order); queued = set(order)
    while q:
        b = q.popleft(); queued.discard(b)
        if transfer(pg, use, dfn, b, IN, OUT, st):
            for p in preds[b]:
                if p not in queued:
                    q.append(p); queued.add(p)
    return IN, OUT, st


def round_robin(pg, use, dfn, order, limit=None):
    n = len(pg.blocks); IN = [set() for _ in range(n)]; OUT = [set() for _ in range(n)]; st = Stats()
    while True:
        st.passes += 1
        changed = False
        for b in order:
            changed |= transfer(pg, use, dfn, b, IN, OUT, st)
        if not changed or (limit and st.passes >= limit):
            return IN, OUT, st


def live_oracle(pg, use, dfn):
    """Per-variable reachability: v is live entering B when a block that reads v
    before writing it is reachable from B through blocks that do not write v."""
    n = len(pg.blocks); IN = [set() for _ in range(n)]
    for v in range(NV):
        for b in range(n):
            seen = {b}; stack = [b]; live = False
            while stack and not live:
                x = stack.pop()
                if v in use[x]:
                    live = True
                elif v not in dfn[x]:
                    for s in pg.succ[x]:
                        if s not in seen:
                            seen.add(s); stack.append(s)
            if live:
                IN[b].add(v)
    return IN


def path_oracle(pg, use, dfn, cap=400000):
    """Exhaustive simple paths: enumerate every simple path from B and read the
    first block on it that touches v. Returns (IN, paths) or None past the cap."""
    n = len(pg.blocks); IN = [set() for _ in range(n)]; count = [0]
    for b in range(n):
        def walk(x, onpath, pending):
            count[0] += 1
            if count[0] > cap:
                raise OverflowError
            IN[b].update(pending & use[x])
            pending = pending - use[x] - dfn[x]
            if not pending:
                return
            for s in pg.succ[x]:
                if s not in onpath:
                    onpath.add(s); walk(s, onpath, pending); onpath.discard(s)
        try:
            walk(b, {b}, set(range(NV)))
        except OverflowError:
            return None
    return IN, count[0]


def eliminate(pg, OUT):
    """Drop every assignment whose target is not live after it."""
    out = Program(); removed = 0
    out.succ = [list(s) for s in pg.succ]; out.cond = list(pg.cond); out.loop_head = list(pg.loop_head)
    for b, blk in enumerate(pg.blocks):
        live = set(OUT[b]) | ({pg.cond[b]} if pg.cond[b] is not None else set())
        keep = []
        for st in reversed(blk):
            w = writes(st)
            if w and not (w & live):
                removed += 1
                continue
            keep.append(st)
            live = (live - w) | reads(st)
        out.blocks.append(list(reversed(keep)))
    return out, removed


def run(pg, inputs, cap=6):
    env = [0] * NV; out = []; heads = {}; b = 0; steps = 0
    while True:
        for st in pg.blocks[b]:
            k = st[0]
            if k == 'inp':
                env[st[1]] = inputs[st[1]]
            elif k == 'cst':
                env[st[1]] = st[2]
            elif k == 'asg':
                a, c = env[st[3]], env[st[4]]
                env[st[1]] = (a + c if st[2] == '+' else a - c if st[2] == '-' else a * c) % MOD
            else:
                out.append(env[st[1]])
        steps += 1
        if not pg.succ[b]:
            return out
        if pg.cond[b] is None:
            b = pg.succ[b][0]
        else:
            take_first = env[pg.cond[b]] % 2 == 0
            if pg.loop_head[b]:
                heads[b] = heads.get(b, 0) + 1
                if heads[b] > cap:
                    take_first = False
            b = pg.succ[b][0 if take_first else 1]
        assert steps < 100000


def interference(pg, OUT):
    edges = set(); points = 0; maxlive = 0
    for b, blk in enumerate(pg.blocks):
        live = set(OUT[b]) | ({pg.cond[b]} if pg.cond[b] is not None else set())
        sets = [live]
        for st in reversed(blk):
            live = (live - writes(st)) | reads(st); sets.append(live)
        for s in sets:
            points += 1; maxlive = max(maxlive, len(s))
            for x in s:
                for y in s:
                    if x < y:
                        edges.add((x, y))
    return edges, points, maxlive


def chromatic(edges, n=NV):
    adj = [set() for _ in range(n)]
    for x, y in edges:
        adj[x].add(y); adj[y].add(x)
    for k in range(1, n + 1):
        col = [-1] * n

        def ok(i):
            if i == n:
                return True
            for c in range(k):
                if all(col[j] != c for j in adj[i]):
                    col[i] = c
                    if ok(i + 1):
                        return True
            col[i] = -1
            return False
        if ok(0):
            return k
    return n


def main():
    t0 = time.time()
    N = 300
    tot = dict(blocks=0, stmts=0, facts=0, loops=0, deadstores=0, chrom=0, naive=0, paths=0, pathprogs=0, perfect=0, tight=0)
    sched = {k: Stats() for k in ('postorder worklist', 'random worklist', 'round robin postorder', 'round robin reversed', 'single sweep')}
    max_pass = 0; bound_ok = True; missed = 0; wrong_single = 0; equal_runs = 0; runs = 0
    for i in range(N):
        rng = random.Random(20261010 + i)
        pg, depth = gen_program(rng)
        use, dfn = use_def(pg)
        po = postorder(pg); rpo = list(reversed(po)); rnd = list(po); rng.shuffle(rnd)
        IN, OUT, s1 = worklist(pg, use, dfn, po)
        INr, _, s2 = worklist(pg, use, dfn, rnd)
        INa, _, s3 = round_robin(pg, use, dfn, po)
        INb, _, s4 = round_robin(pg, use, dfn, rpo)
        INs, OUTs, s5 = round_robin(pg, use, dfn, po, limit=1)
        for k, s in zip(sched, (s1, s2, s3, s4, s5)):
            sched[k].visits += s.visits; sched[k].ops += s.ops; sched[k].passes += s.passes
        assert IN == INr == INa == INb, 'the iterating solvers disagree'
        assert IN == live_oracle(pg, use, dfn), 'fixpoint differs from the reachability referee'
        po_ref = path_oracle(pg, use, dfn)
        if po_ref is not None:
            assert po_ref[0] == IN, 'fixpoint differs from the exhaustive simple paths'
            tot['paths'] += po_ref[1]; tot['pathprogs'] += 1
        max_pass = max(max_pass, s3.passes)
        bound_ok &= s3.passes <= depth + 2
        tot['tight'] += s3.passes == depth + 2
        tot['blocks'] += len(pg.blocks); tot['stmts'] += sum(len(b) for b in pg.blocks)
        tot['facts'] += sum(len(x) for x in IN); tot['loops'] += any(pg.loop_head)
        missed += sum(len(IN[b] - INs[b]) for b in range(len(pg.blocks)))
        # consumers: dead stores, checked by execution; interference graph
        opt, removed = eliminate(pg, OUT); tot['deadstores'] += removed
        bad, _ = eliminate(pg, OUTs)
        differs = False
        for r in range(30):
            inputs = [rng.randrange(10) for _ in range(NV)]
            ref = run(pg, inputs); runs += 1
            assert run(opt, inputs) == ref, 'dead-store elimination changed the output'
            equal_runs += 1
            differs |= run(bad, inputs) != ref
        wrong_single += differs
        edges, _, maxlive = interference(pg, OUT)
        chrom = chromatic(edges); tot['chrom'] += chrom; tot['naive'] += NV
        assert chrom >= maxlive
        tot['perfect'] += chrom == maxlive
    n = tot['blocks']
    print(f"{N} programs, {n} blocks, {tot['stmts']} statements, {tot['facts']} live facts, {tot['loops']} with a loop")
    print(f"{'schedule':<24}{'visits':>9}{'per block':>11}{'set ops':>9}{'passes':>8}")
    for k, s in sched.items():
        print(f"{k:<24}{s.visits:>9}{s.visits / n:>11.2f}{s.ops:>9}{s.passes if s.passes else '-':>8}")
    print(f"round robin postorder max passes {max_pass}; bound depth + 2 holds on all {N} and is tight on {tot['tight']}")
    print(f"exhaustive simple paths: {tot['paths']} paths on {tot['pathprogs']} programs, all equal to the fixpoint")
    print(f"dead stores removed {tot['deadstores']}; output identical on {equal_runs} of {runs} runs")
    print(f"single sweep: {missed} live facts missing; its dead-store pass changed the output on {wrong_single} programs")
    print(f"registers: liveness graph {tot['chrom'] / N:.2f} on average against {NV} with every variable interfering; equal to the largest live set on {tot['perfect']} of {N}")
    assert bound_ok and missed > 0 and wrong_single > 0 and equal_runs == runs
    assert sched['postorder worklist'].visits < sched['round robin postorder'].visits < sched['round robin reversed'].visits
    assert sched['postorder worklist'].visits < sched['random worklist'].visits
    print(f"OK: the postorder worklist fixpoint equals the reachability referee on all {N} programs and exhaustive simple paths "
          f"({tot['paths']} paths) on {tot['pathprogs']}; sets never shrank; round robin within depth + 2 passes (max {max_pass}); "
          f"{sched['postorder worklist'].visits} visits in postorder against {sched['random worklist'].visits} random and "
          f"{sched['round robin reversed'].visits} against the flow; {tot['deadstores']} dead stores removed with identical output on "
          f"{runs} runs; the liveness interference graph needs {tot['chrom'] / N:.2f} registers against {NV}; the single sweep misses "
          f"{missed} facts and its elimination breaks {wrong_single} programs; {time.time() - t0:.1f} s")


if __name__ == '__main__':
    main()
