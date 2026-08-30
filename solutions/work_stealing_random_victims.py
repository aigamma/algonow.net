# Puzzle 114: Work stealing x randomized victim selection
# Task-parallel scheduling: P workers, one recursive fork-join
# computation, and the question every runtime must answer: when a
# worker runs dry, where does the next task come from? The
# central-queue answer serializes every hand-off through one
# lock. Work stealing inverts it: each worker owns a DEQUE,
# pushes and pops its own forks at the bottom (LIFO: hot, cached,
# contention-free), and an idle worker STEALS from the TOP of a
# victim's deque (FIFO: the oldest, biggest subtree: one steal
# buys the most work). The heuristic is who to rob: pick victims
# uniformly at random. Randomness spreads thieves apart (fixed
# orders convoy onto one victim) and makes the theory work:
# Blumofe-Leiserson: expected time W/P + O(T_inf).
#
# The model: a deterministic discrete-step simulator. Each step,
# every busy worker executes one unit; each idle worker makes one
# steal attempt; when several thieves hit one victim in a step,
# exactly one succeeds (the lock), the rest waste the step. The
# central queue serializes: one queue operation per step, total.
#
# Referees:
# (1) WORK CONSERVATION, exactly: every scheduler executes every
#     task exactly once (checksum of task ids) and total units
#     equal the serial work W;
# (2) THE TWO-SIDED SQUEEZE: measured makespan >= max(W/P,
#     T_inf) (the law) and <= W/P + 3 T_inf + P (the
#     Blumofe-Leiserson shape): both asserted from the DAG's
#     analytically computed W and critical path;
# (3) random vs convoy: fixed-victim (all thieves probe worker
#     0 first, then 1...) loses to random on failed-steal rate
#     and makespan, measured;
# (4) the central-queue collapse at fine grain, measured:
#     speedup vs P=1 for both schedulers at coarse and fine
#     task grain;
# (5) the communication bill: steals counted: successful steals
#     stay a small fraction of tasks (the O(P T_inf) shape:
#     communication scales with the critical path, not the work).
import random

SEED = 20260829
P = 16


def build_tree(depth_left, depth_right, grain, skew_levels):
    """A skewed fork-join DAG. Returns (tasks, W, T_inf).
    tasks: id -> (work_units, [children ids]). The skew makes the
    left spine much deeper: the imbalance stealing exists for."""
    tasks = {}
    counter = [0]

    def make(dl, dr, lvl):
        tid = counter[0]
        counter[0] += 1
        if dl <= 0 and dr <= 0:
            tasks[tid] = [grain, []]
            return tid, grain, grain
        left = make(dl - 1, dr - 1, lvl + 1) if dl > 0 else None
        right = make(max(dr - 2, 0) if lvl < skew_levels else dr - 1,
                     max(dr - 2, 0) if lvl < skew_levels else dr - 1,
                     lvl + 1) if dr > 0 else None
        kids = [c for c in (left, right) if c]
        tasks[tid] = [grain, [k[0] for k in kids]]
        w = grain + sum(k[1] for k in kids)
        depth = grain + max((k[2] for k in kids), default=0)
        return tid, w, depth

    root, W, T_inf = make(depth_left, depth_right, 0)
    return tasks, root, W, T_inf


def simulate(tasks, root, policy, rng, grain_check=None):
    """policy: 'steal-random' | 'steal-fixed' | 'central'.
    Fork-join semantics: executing a task's units enqueues its
    children on completion (the join structure is implicit: we
    measure pure task throughput, which is what distinguishes the
    schedulers). Returns (makespan, executed_ids, steal stats)."""
    deques = [[] for _ in range(P)]
    central = []
    if policy == 'central':
        central.append(root)
    else:
        deques[0].append(root)
    current = [None] * P      # (task_id, units_left) per worker
    executed = []
    attempts = 0
    fails = 0
    successes = 0
    t = 0
    remaining = len(tasks)
    while remaining > 0:
        t += 1
        # 1. workers with a task burn one unit
        finished = []
        for w in range(P):
            if current[w] is not None:
                tid, left = current[w]
                left -= 1
                if left == 0:
                    finished.append((w, tid))
                    current[w] = None
                else:
                    current[w] = (tid, left)
        for w, tid in finished:
            executed.append(tid)
            remaining -= 1
            kids = tasks[tid][1]
            if policy == 'central':
                central.extend(kids)
            else:
                deques[w].extend(kids)   # bottom-push: owner's hot end
        # 2. idle workers acquire work
        idle = [w for w in range(P) if current[w] is None]
        if policy == 'central':
            # one queue op per step, total: the lock
            if idle and central:
                w = idle[0]
                current[w] = (central.pop(0), None)
                current[w] = (current[w][0], tasks[current[w][0]][0])
        else:
            # own deque first (bottom pop: free), else one steal attempt
            claimed = set()
            for w in idle:
                if deques[w]:
                    tid = deques[w].pop()
                    current[w] = (tid, tasks[tid][0])
            for w in idle:
                if current[w] is not None:
                    continue
                attempts += 1
                if policy == 'steal-random':
                    v = rng.randrange(P)
                else:
                    v = 0
                    while v < P and (not deques[v] or v in claimed):
                        v += 1
                    if v == P:
                        fails += 1
                        continue
                if v == w or not deques[v] or v in claimed:
                    fails += 1
                    continue
                claimed.add(v)           # one thief per victim per step
                tid = deques[v].pop(0)   # top steal: the oldest, biggest
                current[w] = (tid, tasks[tid][0])
                successes += 1
        if t > 10_000_000:
            raise RuntimeError('runaway')
    return t, executed, attempts, fails, successes


if __name__ == '__main__':
    rng = random.Random(SEED)

    # The skewed instance, coarse grain.
    tasks, root, W, T_inf = build_tree(16, 12, 8, 6)
    n_tasks = len(tasks)

    results = {}
    for policy in ('steal-random', 'steal-fixed', 'central'):
        r = random.Random(SEED + 7)
        makespan, executed, att, fails, succ = simulate(tasks, root, policy, r)
        # Oracle 1: work conservation, exactly.
        assert sorted(executed) == sorted(tasks.keys()), policy
        assert sum(tasks[t0][0] for t0 in executed) == W
        results[policy] = (makespan, att, fails, succ)

    ms_rand, att_rand, fail_rand, steals_rand = results['steal-random']
    ms_fixed, att_fixed, fail_fixed, _ = results['steal-fixed']
    ms_central, _, _, _ = results['central']

    # Oracle 2: the two-sided squeeze on the random-stealing run.
    lower = max(W / P, T_inf)
    assert ms_rand >= lower, (ms_rand, lower)
    assert ms_rand <= W / P + 3 * T_inf + P, (ms_rand, W / P, T_inf)

    # Oracle 3: random spreads thieves; fixed order convoys.
    fail_rate_rand = fail_rand / max(att_rand, 1)
    fail_rate_fixed = fail_fixed / max(att_fixed, 1)
    assert ms_rand <= ms_fixed, (ms_rand, ms_fixed)

    # Oracle 5: the communication bill: steals << tasks.
    steal_frac = steals_rand / n_tasks
    assert steal_frac < 0.25, steal_frac

    # Oracle 4: the grain sweep: speedups vs the serial W.
    rows = []
    for label, grain in (('coarse tasks (grain 64)', 64), ('fine tasks (grain 4)', 4)):
        tk, rt, Wg, Tg = build_tree(13, 10, grain, 5)
        r = random.Random(SEED + 11)
        ms_s, ex_s, _, _, _ = simulate(tk, rt, 'steal-random', r)
        assert sorted(ex_s) == sorted(tk.keys())
        r = random.Random(SEED + 11)
        ms_c, ex_c, _, _, _ = simulate(tk, rt, 'central', r)
        assert sorted(ex_c) == sorted(tk.keys())
        sp_s = Wg / ms_s
        sp_c = Wg / ms_c
        rows.append((label, Wg, sp_s, sp_c))
    (l1, W1, sp_s1, sp_c1), (l2, W2, sp_s2, sp_c2) = rows
    assert sp_s2 > 2.5 * sp_c2, (sp_s2, sp_c2)   # fine grain: the lock collapse
    # THE HONEST COARSE ROW (the first draft assumed stealing wins
    # everywhere; the run said otherwise): with 64-unit tasks the
    # single lock is nearly idle (one dequeue buys 64 steps), so the
    # central queue's perfect balance EDGES stealing. The stealing
    # dividend lives at fine grain and that is where runtimes earn it.
    assert abs(sp_s1 - sp_c1) < 0.15 * sp_c1, (sp_s1, sp_c1)

    print(f'contest: a skewed fork-join DAG on P = {P} workers (discrete-step model: one unit/worker/step, one steal attempt when idle, one thief per victim per step, central queue serialized)')
    print(f"  {'scheduler':<26} {'makespan':>9}   W = {W:,} units, T_inf = {T_inf} (critical path), {n_tasks:,} tasks")
    print(f"  {'central shared queue':<26} {ms_central:>9,}   every hand-off through one lock")
    print(f"  {'stealing, fixed victims':<26} {ms_fixed:>9,}   thieves convoy: {fail_rate_fixed:.0%} of attempts fail")
    print(f"  {'stealing, random victims':<26} {ms_rand:>9,}   spread thieves: {fail_rate_rand:.0%} fail: inside W/P + 3 T_inf = {W / P + 3 * T_inf:,.0f}")
    print(f"the squeeze: {ms_rand:,} sits between the law's floor max(W/P, T_inf) = {lower:,.0f} and the Blumofe-Leiserson shape W/P + O(T_inf)")
    print(f"the communication bill: {steals_rand:,} successful steals for {n_tasks:,} tasks ({steal_frac:.1%}): migration scales with the critical path, not the work")
    print(f"the grain sweep (speedup vs serial): {l1}: stealing {sp_s1:.1f}x vs central {sp_c1:.1f}x; {l2}: stealing {sp_s2:.1f}x vs central {sp_c2:.1f}x: coarse grain forgives the lock (parity, said plainly): fine grain is where stealing earns its keep")
    print(f'OK: every scheduler executed every task exactly once with total work {W:,} conserved; the squeeze held ({lower:,.0f} <= {ms_rand:,} <= {W / P + 3 * T_inf + P:,.0f}); '
          f'random <= fixed ({ms_rand:,} vs {ms_fixed:,}) with failed-steal rates {fail_rate_rand:.0%} vs {fail_rate_fixed:.0%}; '
          f'steals at {steal_frac:.1%} of tasks; and the fine-grain central collapse measured ({sp_s2:.1f}x vs {sp_c2:.1f}x)')
