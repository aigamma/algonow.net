# Puzzle 187: Reaching definitions x Forward dataflow
# Which assignments might be the last write of each variable when control
# reaches a block? The algorithm is Kildall's iterative fixpoint over the
# control-flow graph: per block OUT = gen union (IN minus kill), IN the union
# of the predecessors' OUT, repeated until nothing changes. The heuristic is
# the forward direction with a worklist in reverse postorder: a block is
# processed after the blocks that feed it and revisited only when an input
# changed. Reaching definitions is distributive, so the fixpoint equals the
# meet over all paths, and the loop depth bounds the passes.
#
# Referees, on 300 random structured programs: (1) the fixpoint equals a
# per-definition reachability search and the exhaustive union over every walk
# from the entry visiting no block more than twice (a reaching fact's witness
# is a simple path to the defining block followed by a simple path onward, so
# two visits suffice); (2) sets never shrink and round robin in reverse
# postorder stays within depth + 2 passes, four schedules compared in block
# visits and set operations; (3) 120 executions per program along real paths:
# every executed use-def pair must be in the analysis's chains and no flagged
# dead store may ever be read; (4) the negative example, one sweep without
# revisits, measured.
#
# AUTHOR CORRECTION: the draft's exhaustive referee enumerated simple paths
# only and failed on the first loop: a definition inside a loop body reaches
# the loop exit only through a path that visits the head twice. Two visits
# per block is exactly enough, by the argument in (1).
import random
from collections import deque

SEED = 20261010
VARS = ['a', 'b', 'c', 'd']


class Program:
    """blocks[b]: (var, kind, operands) statements, kind in const/copy/add;
    succ[b]: successors; block 0 is the entry, defining every variable once;
    cond[b]: the variable tested when b branches (true branch first)."""

    def __init__(self):
        self.blocks = []
        self.succ = []
        self.cond = []
        self.loop_depth = 0

    def new_block(self):
        self.blocks.append([])
        self.succ.append([])
        self.cond.append(None)
        return len(self.blocks) - 1

    def definitions(self):
        return [(b, i, v) for b, stmts in enumerate(self.blocks) for i, (v, _, _) in enumerate(stmts)]

    def uses(self):
        out = []
        for b, stmts in enumerate(self.blocks):
            for i, (_, kind, ops) in enumerate(stmts):
                for v in ops:
                    if isinstance(v, str):
                        out.append((b, i, v))
            if self.cond[b] is not None:
                out.append((b, len(stmts), self.cond[b]))
        return out


def random_program(rng, max_depth=3):
    p = Program()
    entry = p.new_block()
    p.blocks[entry] = [(v, 'const', (rng.randint(0, 9),)) for v in VARS]
    nest = [0]

    def fill(b):
        for _ in range(rng.randint(1, 3)):
            v = rng.choice(VARS)
            k = rng.random()
            if k < 0.3:
                p.blocks[b].append((v, 'const', (rng.randint(0, 9),)))
            elif k < 0.55:
                p.blocks[b].append((v, 'copy', (rng.choice(VARS),)))
            else:
                p.blocks[b].append((v, 'add', (rng.choice(VARS), rng.choice(VARS))))

    def gen(cur, depth):
        """Emit a structured region after cur; return the block control leaves from."""
        for _ in range(rng.randint(1, 3)):
            r = rng.random()
            if depth <= 0 or r < 0.4:
                nb = p.new_block()
                fill(nb)
                p.succ[cur].append(nb)
                cur = nb
            elif r < 0.7:
                test = p.new_block()
                fill(test)
                p.cond[test] = rng.choice(VARS)
                p.succ[cur].append(test)
                then_b = p.new_block()
                fill(then_b)
                else_b = p.new_block()
                fill(else_b)
                p.succ[test].extend([then_b, else_b])
                end_then = gen(then_b, depth - 1)
                end_else = gen(else_b, depth - 1)
                join = p.new_block()
                fill(join)
                p.succ[end_then].append(join)
                p.succ[end_else].append(join)
                cur = join
            else:
                head = p.new_block()
                p.cond[head] = rng.choice(VARS)
                p.succ[cur].append(head)
                body = p.new_block()
                fill(body)
                exit_b = p.new_block()
                fill(exit_b)
                p.succ[head].extend([body, exit_b])
                nest[0] += 1
                p.loop_depth = max(p.loop_depth, nest[0])
                end_body = gen(body, depth - 1)
                nest[0] -= 1
                p.succ[end_body].append(head)
                cur = exit_b
        return cur

    last = gen(entry, max_depth)
    tail = p.new_block()
    u1, u2 = rng.sample(VARS, 2)
    p.blocks[tail].append(('a', 'add', (u1, u2)))
    p.succ[last].append(tail)
    return p


# ------------------------------------------------------- the analysis

def gen_kill(p):
    by_var = {}
    for d in p.definitions():
        by_var.setdefault(d[2], set()).add(d)
    gen, kill = [], []
    for b, stmts in enumerate(p.blocks):
        last = {}
        for i, (v, _, _) in enumerate(stmts):
            last[v] = (b, i, v)
        g = set(last.values())
        k = set()
        for v in last:
            k |= by_var[v]
        gen.append(g)
        kill.append(k - g)
    return gen, kill


def predecessors(p):
    pred = [[] for _ in p.blocks]
    for b, ss in enumerate(p.succ):
        for s in ss:
            pred[s].append(b)
    return pred


def reverse_postorder(p):
    seen = set()
    order = []

    def dfs(b):
        seen.add(b)
        for s in p.succ[b]:
            if s not in seen:
                dfs(s)
        order.append(b)

    dfs(0)
    order.reverse()
    return order


class Work:
    def __init__(self):
        self.visits = 0
        self.set_ops = 0
        self.passes = 0


def worklist(p, order, work, rng=None):
    """Worklist seeded in the given order; a successor is re-queued when its
    predecessor's OUT changed. With rng, the next block is drawn at random."""
    gen, kill = gen_kill(p)
    pred = predecessors(p)
    n = len(p.blocks)
    IN = [set() for _ in range(n)]
    OUT = [set() for _ in range(n)]
    queue = deque(order)
    queued = set(order)
    while queue:
        if rng is not None:
            b = rng.choice(list(queue))
            queue.remove(b)
        else:
            b = queue.popleft()
        queued.discard(b)
        work.visits += 1
        new_in = set()
        for q in pred[b]:
            new_in |= OUT[q]
            work.set_ops += 1
        IN[b] = new_in
        new_out = gen[b] | (new_in - kill[b])
        work.set_ops += 2
        if new_out != OUT[b]:
            OUT[b] = new_out
            for s in p.succ[b]:
                if s not in queued:
                    queue.append(s)
                    queued.add(s)
    return IN, OUT


def round_robin(p, order, work, max_passes=1000):
    """Sweep the order until a pass changes nothing; asserts sets never shrink."""
    gen, kill = gen_kill(p)
    pred = predecessors(p)
    n = len(p.blocks)
    IN = [set() for _ in range(n)]
    OUT = [set() for _ in range(n)]
    for _ in range(max_passes):
        work.passes += 1
        changed = False
        for b in order:
            work.visits += 1
            new_in = set()
            for q in pred[b]:
                new_in |= OUT[q]
                work.set_ops += 1
            new_out = gen[b] | (new_in - kill[b])
            work.set_ops += 2
            assert new_in >= IN[b] and new_out >= OUT[b], 'a set shrank: not monotone'
            if new_in != IN[b] or new_out != OUT[b]:
                changed = True
            IN[b], OUT[b] = new_in, new_out
        if not changed:
            break
    return IN, OUT


def single_pass(p, order):
    """The negative example: one sweep, no revisits."""
    gen, kill = gen_kill(p)
    pred = predecessors(p)
    n = len(p.blocks)
    IN = [set() for _ in range(n)]
    OUT = [set() for _ in range(n)]
    for b in order:
        new_in = set()
        for q in pred[b]:
            new_in |= OUT[q]
        IN[b] = new_in
        OUT[b] = gen[b] | (new_in - kill[b])
    return IN, OUT


# --------------------------------------------------------- the referees

def per_definition_reach(p):
    """Referee 1a: from each definition that survives its own block, search
    forward; it enters IN of every block reached and OUT of those that do not
    write the variable, and never passes through a block that writes it."""
    n = len(p.blocks)
    IN = [set() for _ in range(n)]
    OUT = [set() for _ in range(n)]
    for d in p.definitions():
        b, i, v = d
        if any(stmt[0] == v for stmt in p.blocks[b][i + 1:]):
            continue
        OUT[b].add(d)
        queue = deque(p.succ[b])
        seen = set()
        while queue:
            s = queue.popleft()
            if s in seen:
                continue
            seen.add(s)
            IN[s].add(d)
            if any(stmt[0] == v for stmt in p.blocks[s]):
                continue
            OUT[s].add(d)
            queue.extend(p.succ[s])
    return IN, OUT


def bounded_walk_oracle(p, limit=2):
    """Referee 1b: the union over every walk from the entry visiting no block
    more than limit times of the definitions surviving along the walk."""
    n = len(p.blocks)
    IN = [set() for _ in range(n)]
    OUT = [set() for _ in range(n)]
    gen, kill = gen_kill(p)
    visits = [0] * n
    count = [0]

    def walk(b, carried):
        count[0] += 1
        IN[b] |= carried
        out = gen[b] | (carried - kill[b])
        OUT[b] |= out
        for s in p.succ[b]:
            if visits[s] < limit:
                visits[s] += 1
                walk(s, out)
                visits[s] -= 1

    visits[0] = 1
    walk(0, set())
    return IN, OUT, count[0]


def use_def_chains(p, IN):
    """(use, definition) pairs: the last earlier local write, else IN's definitions of the variable."""
    chains = set()
    for (b, i, v) in p.uses():
        local = None
        for j in range(i - 1, -1, -1):
            if p.blocks[b][j][0] == v:
                local = (b, j, v)
                break
        if local is not None:
            chains.add(((b, i, v), local))
        else:
            for d in IN[b]:
                if d[2] == v:
                    chains.add(((b, i, v), d))
    return chains


def simulate(p, rng, runs=120, loop_cap=6, step_cap=600):
    """Concrete executions along real paths: branches follow the parity of the
    tested variable; a loop head is forced to exit after loop_cap visits."""
    observed = set()
    read = set()
    for _ in range(runs):
        env = {v: rng.randint(0, 9) for v in VARS}
        last_def = {}
        b = 0
        steps = 0
        visits = {}
        while True:
            visits[b] = visits.get(b, 0) + 1
            for i, (v, kind, ops) in enumerate(p.blocks[b]):
                for u in ops:
                    if isinstance(u, str):
                        d = last_def[u]
                        observed.add(((b, i, u), d))
                        read.add(d)
                if kind == 'const':
                    env[v] = ops[0]
                elif kind == 'copy':
                    env[v] = env[ops[0]]
                else:
                    env[v] = (env[ops[0]] + env[ops[1]] + rng.randint(0, 1)) % 101
                last_def[v] = (b, i, v)
            if not p.succ[b]:
                break
            if len(p.succ[b]) == 2:
                cv = p.cond[b]
                observed.add(((b, len(p.blocks[b]), cv), last_def[cv]))
                read.add(last_def[cv])
                take_true = env[cv] % 2 == 1 and visits[b] <= loop_cap
                b = p.succ[b][0] if take_true else p.succ[b][1]
            else:
                b = p.succ[b][0]
            steps += 1
            if steps > step_cap:
                break
    return observed, read


def main():
    rng = random.Random(SEED)
    programs = [random_program(rng) for _ in range(300)]
    n = len(programs)

    # Referee 1: both oracles equal the fixpoint on every program.
    totals = {'blocks': 0, 'defs': 0, 'uses': 0, 'facts': 0, 'loops': 0}
    walks = walks_max = biggest = 0
    for p in programs:
        rpo = reverse_postorder(p)
        IN, OUT = worklist(p, rpo, Work())
        IN2, OUT2 = per_definition_reach(p)
        assert IN == IN2 and OUT == OUT2, 'fixpoint differs from the per-definition referee'
        IN3, OUT3, count = bounded_walk_oracle(p)
        assert IN == IN3 and OUT == OUT3, 'fixpoint differs from the bounded-walk referee'
        totals['blocks'] += len(p.blocks)
        totals['defs'] += len(p.definitions())
        totals['uses'] += len(p.uses())
        totals['facts'] += sum(len(s) for s in IN)
        totals['loops'] += p.loop_depth > 0
        biggest = max(biggest, len(p.blocks))
        walks += count
        walks_max = max(walks_max, count)

    # Referee 2: monotone, terminating, within the depth bound; four schedules.
    stats = {k: Work() for k in ('wl_rpo', 'wl_random', 'rr_rpo', 'rr_reverse')}
    worst_ratio = 0.0
    random_not_worse = passes_max = bound_hits = rev_passes_max = 0
    for idx, p in enumerate(programs):
        rpo = reverse_postorder(p)
        w = Work()
        INw, OUTw = worklist(p, rpo, w)
        w2 = Work()
        INx, OUTx = worklist(p, rpo, w2, rng=random.Random(SEED + idx))
        w3 = Work()
        INr, OUTr = round_robin(p, rpo, w3)
        w4 = Work()
        INv, OUTv = round_robin(p, list(reversed(rpo)), w4)
        assert INx == INw and OUTx == OUTw and INr == INw and OUTr == OUTw and INv == INw and OUTv == OUTw
        for key, ww in (('wl_rpo', w), ('wl_random', w2), ('rr_rpo', w3), ('rr_reverse', w4)):
            stats[key].visits += ww.visits
            stats[key].set_ops += ww.set_ops
            stats[key].passes += ww.passes
        worst_ratio = max(worst_ratio, w2.visits / w.visits)
        random_not_worse += w2.visits <= w.visits
        bound = p.loop_depth + 2
        assert w3.passes <= bound, (w3.passes, bound)
        passes_max = max(passes_max, w3.passes)
        bound_hits += w3.passes == bound
        rev_passes_max = max(rev_passes_max, w4.passes)
    wl, wr, rr, rv = stats['wl_rpo'], stats['wl_random'], stats['rr_rpo'], stats['rr_reverse']
    assert wl.visits < wr.visits < rr.visits < rv.visits

    # Referee 3: concrete executions.
    chain_total = observed_total = dead_flagged = never_read_unflagged = 0
    for idx, p in enumerate(programs):
        IN, OUT = worklist(p, reverse_postorder(p), Work())
        chains = use_def_chains(p, IN)
        observed, read = simulate(p, random.Random(SEED + 1000 + idx))
        assert observed <= chains, 'an executed use-def pair is missing from the analysis'
        chain_total += len(chains)
        observed_total += len(observed)
        reached = {d for (_, d) in chains}
        for d in p.definitions():
            if d not in reached:
                dead_flagged += 1
                assert d not in read, 'a flagged dead store was read in an execution'
            elif d not in read:
                never_read_unflagged += 1

    # Referee 4: the single sweep.
    missing_facts = wrong_programs = unsound_programs = unsound_pairs = 0
    for idx, p in enumerate(programs):
        rpo = reverse_postorder(p)
        IN, OUT = worklist(p, rpo, Work())
        IN1, OUT1 = single_pass(p, rpo)
        miss = 0
        for b in range(len(p.blocks)):
            assert IN1[b] <= IN[b]
            miss += len(IN[b] - IN1[b])
        missing_facts += miss
        wrong_programs += miss > 0
        observed, _ = simulate(p, random.Random(SEED + 1000 + idx))
        bad = observed - use_def_chains(p, IN1)
        unsound_programs += bool(bad)
        unsound_pairs += len(bad)
    assert missing_facts > 0 and unsound_programs > 0

    print('contest: 300 random structured programs over four variables; referees: a per-definition search, the exhaustive bounded-walk union, 120 executions per program, the depth + 2 pass bound; currency: block visits and set operations')
    print(f'programs: {totals["blocks"]:,} blocks ({totals["blocks"] / n:.1f} on average, max {biggest}), {totals["defs"]:,} definitions, {totals["uses"]:,} uses; {totals["loops"]} of 300 contain a loop; {totals["facts"]:,} reaching facts; both referees equal to the fixpoint on all 300 ({walks:,} walks, {walks_max:,} on the largest program)')
    print(f'{"solver":>24} {"visits":>8} {"set ops":>9} {"passes":>7}')
    print(f'{"worklist, rpo":>24} {wl.visits:>8,} {wl.set_ops:>9,} {"-":>7}')
    print(f'{"worklist, random order":>24} {wr.visits:>8,} {wr.set_ops:>9,} {"-":>7}  worst program {worst_ratio:.1f}x the rpo visits; no worse than rpo on {random_not_worse} of 300')
    print(f'{"round robin, rpo":>24} {rr.visits:>8,} {rr.set_ops:>9,} {rr.passes:>7,}  max passes {passes_max} within depth + 2; the bound tight on {bound_hits} of 300')
    print(f'{"round robin, reverse rpo":>24} {rv.visits:>8,} {rv.set_ops:>9,} {rv.passes:>7,}  max passes {rev_passes_max}')
    print(f'executions: {observed_total:,} observed use-def pairs, all inside the {chain_total:,} chains allowed ({observed_total / chain_total:.1%}); {dead_flagged:,} dead stores flagged, none read; {never_read_unflagged:,} definitions never read that the analysis could not rule out')
    print(f'single sweep: {missing_facts:,} facts missing; wrong on {wrong_programs} of 300 programs; chains unsound on {unsound_programs} ({unsound_pairs:,} executed pairs denied)')
    print(f'OK: fixpoint equal to both referees ({walks:,} walks) on all 300 programs; sets never shrank; round robin within depth + 2 passes (max {passes_max}); '
          f'rpo {wl.visits:,} visits against {wr.visits:,} random and {rv.visits:,} reverse; all {observed_total:,} executed use-def pairs inside the analysis, all {dead_flagged:,} flagged dead stores unread; the single sweep misses {missing_facts:,} facts')


if __name__ == '__main__':
    main()
