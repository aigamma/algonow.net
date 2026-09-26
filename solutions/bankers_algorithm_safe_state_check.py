# Puzzle 132: Banker's algorithm x safe-state check
# Deadlock avoidance: processes hold resources and request more, each
# having declared in advance the most it will ever hold. The banker's
# algorithm is the rule: grant a request only if the state after the
# grant is SAFE, meaning some order exists in which every process can
# be given its full remaining need out of what is free plus what the
# earlier processes release when they finish. The heuristic is the
# safe-state check itself: a greedy scan that repeatedly finishes any
# process whose remaining need fits in the free pool, which decides
# safety in O(n^2 m) without trying the n! orders, because finishing
# a process can only make the pool larger.
#
# Referees:
# (1) THE GREEDY CHECK AGAINST EXHAUSTION: on 400 random states of up
#     to 7 processes, the greedy verdict must equal a brute-force
#     search over all 7! completion orders, and the greedy's own
#     sequence must be replayed and verified; the work is counted for
#     both;
# (2) THE TEXTBOOK STATE (Silberschatz, Galvin, Gagne): five processes
#     and three resource types, safe with a specific order; P1's
#     request (1, 0, 2) is granted, P4's (3, 3, 0) refused for lack of
#     resources, P0's (0, 2, 0) refused because granting it leaves an
#     unsafe state;
# (3) THE SIMULATION: 200 random workloads in which each process
#     declares a maximum but actually uses a random part of it (the
#     banker only ever sees the declaration), driven to completion:
#     under the banker every process finishes in all 200; the ablation
#     that grants whatever is available deadlocks in a measured
#     fraction (a state with pending requests and no process able to
#     proceed). AUTHOR CORRECTION: the draft had every process claim
#     its full declared maximum, and the naive granter then deadlocked
#     in 200 of 200 and no unsafe state ever escaped, which is a
#     tautology (unsafe plus everyone demanding the maximum is certain
#     deadlock), not a measurement; the actual demands are now drawn
#     below the declarations, as they are in practice;
# (4) THE PRICE OF CAUTION, measured as deferrals: the banker refuses
#     requests the process would in fact have been fine to receive,
#     because it must plan for the declared maximum, and each refusal
#     is a wait in a real system. (The draft also compared scheduling
#     steps and found the two policies identical; that was true by
#     construction, one step per unit granted, so it was removed.)
# (5) UNSAFE IS NOT DEADLOCKED: from each unsafe sampled state, with
#     actual demands drawn below the declared needs, the fraction from
#     which a naive granter still finishes, because unsafe means "no
#     guarantee", not "doomed".
import itertools
import random

SEED = 20260926


def is_safe(available, allocation, need, counter=None):
    """The greedy check. Returns (safe, order)."""
    n = len(allocation)
    work = list(available)
    finished = [False] * n
    order = []
    progress = True
    while progress:
        progress = False
        for i in range(n):
            if finished[i]:
                continue
            if counter is not None:
                counter[0] += 1
            if all(need[i][j] <= work[j] for j in range(len(work))):
                for j in range(len(work)):
                    work[j] += allocation[i][j]
                finished[i] = True
                order.append(i)
                progress = True
    return all(finished), order


def safe_by_exhaustion(available, allocation, need, counter=None):
    """Try every completion order."""
    n = len(allocation)
    for perm in itertools.permutations(range(n)):
        work = list(available)
        ok = True
        for i in perm:
            if counter is not None:
                counter[0] += 1
            if all(need[i][j] <= work[j] for j in range(len(work))):
                for j in range(len(work)):
                    work[j] += allocation[i][j]
            else:
                ok = False
                break
        if ok:
            return True
    return False


def replay(available, allocation, need, order):
    work = list(available)
    for i in order:
        if not all(need[i][j] <= work[j] for j in range(len(work))):
            return False
        for j in range(len(work)):
            work[j] += allocation[i][j]
    return len(set(order)) == len(allocation)


def request(available, allocation, need, i, req):
    """Banker's decision for process i requesting req. Returns
    'granted', 'wait' (exceeds what is free), or 'unsafe'."""
    if any(req[j] > need[i][j] for j in range(len(req))):
        raise ValueError('request exceeds declared maximum')
    if any(req[j] > available[j] for j in range(len(req))):
        return 'wait'
    trial_av = [available[j] - req[j] for j in range(len(req))]
    trial_al = [list(row) for row in allocation]
    trial_nd = [list(row) for row in need]
    for j in range(len(req)):
        trial_al[i][j] += req[j]
        trial_nd[i][j] -= req[j]
    safe, _ = is_safe(trial_av, trial_al, trial_nd)
    return 'granted' if safe else 'unsafe'


def random_state(rng, n, m):
    total = [rng.randint(4, 10) for _ in range(m)]
    maxes = [[rng.randint(0, total[j]) for j in range(m)] for _ in range(n)]
    allocation = [[rng.randint(0, maxes[i][j]) for j in range(m)] for i in range(n)]
    for j in range(m):
        used = sum(allocation[i][j] for i in range(n))
        while used > total[j]:
            i = rng.randrange(n)
            if allocation[i][j] > 0:
                allocation[i][j] -= 1
                used -= 1
    available = [total[j] - sum(allocation[i][j] for i in range(n)) for j in range(m)]
    need = [[maxes[i][j] - allocation[i][j] for j in range(m)] for i in range(n)]
    return available, allocation, need


def simulate(rng, n, m, banker, max_steps=4000):
    """Each process declares a maximum and actually needs a random part
    of it; it requests one unit at a time in random order until it holds
    its actual need, then releases everything. The banker sees only the
    declaration. Returns (finished all, deferrals, steps)."""
    total = [rng.randint(6, 12) for _ in range(m)]
    maxes = [[rng.randint(1, total[j]) for j in range(m)] for i in range(n)]
    actual = [[rng.randint(0, maxes[i][j]) for j in range(m)] for i in range(n)]
    allocation = [[0] * m for _ in range(n)]
    need = [[maxes[i][j] for j in range(m)] for i in range(n)]
    available = list(total)
    done = [False] * n
    deferrals = 0
    steps = 0
    while not all(done) and steps < max_steps:
        steps += 1
        candidates = [i for i in range(n) if not done[i]]
        rng.shuffle(candidates)
        progressed = False
        for i in candidates:
            wants = [j for j in range(m) if allocation[i][j] < actual[i][j]]
            if not wants:
                for j in range(m):
                    available[j] += allocation[i][j]
                    allocation[i][j] = 0
                done[i] = True
                progressed = True
                break
            j = rng.choice(wants)
            req = [0] * m
            req[j] = 1
            if banker:
                verdict = request(available, allocation, need, i, req)
            else:
                verdict = 'granted' if available[j] >= 1 else 'wait'
            if verdict == 'granted':
                available[j] -= 1
                allocation[i][j] += 1
                need[i][j] -= 1
                progressed = True
                break
            if verdict == 'unsafe':
                deferrals += 1
        if not progressed:
            return False, deferrals, steps          # nobody can move: deadlock
    return all(done), deferrals, steps


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: greedy vs exhaustion on random states.
    greedy_ops = [0]
    brute_ops = [0]
    unsafe_states = []
    safe_count = 0
    for _ in range(400):
        n = rng.randint(3, 7)
        m = rng.randint(1, 3)
        av, al, nd = random_state(rng, n, m)
        g, order = is_safe(av, al, nd, greedy_ops)
        b = safe_by_exhaustion(av, al, nd, brute_ops)
        assert g == b, (av, al, nd, g, b)
        if g:
            assert replay(av, al, nd, order)
            safe_count += 1
        else:
            unsafe_states.append((av, al, nd))
    assert greedy_ops[0] * 20 < brute_ops[0], (greedy_ops[0], brute_ops[0])

    # Oracle 2: the textbook state.
    available = [3, 3, 2]
    allocation = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]]
    maxes = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]]
    need = [[maxes[i][j] - allocation[i][j] for j in range(3)] for i in range(5)]
    safe, order = is_safe(available, allocation, need)
    assert safe and order == [1, 3, 4, 0, 2], order
    v1 = request(available, allocation, need, 1, [1, 0, 2])
    assert v1 == 'granted', v1
    available = [2, 3, 0]
    allocation[1] = [3, 0, 2]
    need[1] = [0, 2, 0]
    v4 = request(available, allocation, need, 4, [3, 3, 0])
    v0 = request(available, allocation, need, 0, [0, 2, 0])
    assert v4 == 'wait' and v0 == 'unsafe', (v4, v0)
    safe2, order2 = is_safe(available, allocation, need)
    assert safe2 and order2 == [1, 3, 4, 0, 2], order2

    # Oracle 3 + 4: the simulation.
    banker_ok = 0
    naive_ok = 0
    deferrals_total = 0
    for run in range(200):
        seed = SEED + 1000 + run
        fb, d, _ = simulate(random.Random(seed), 5, 3, banker=True)
        fn, _, _ = simulate(random.Random(seed), 5, 3, banker=False)
        banker_ok += fb
        naive_ok += fn
        deferrals_total += d
    assert banker_ok == 200, banker_ok
    assert 0 < naive_ok < 200, naive_ok

    # Oracle 5: unsafe is not deadlocked. From each unsafe sampled state,
    # with actual demands drawn below the declared needs, let a naive
    # granter try to finish with one-unit requests.
    escaped = 0
    for av, al, nd in unsafe_states:
        n = len(al)
        m = len(av)
        av = list(av)
        al = [list(r) for r in al]
        r2 = random.Random(SEED + 5)
        nd = [[r2.randint(0, x) for x in r] for r in nd]
        done = [False] * n
        for _ in range(500):
            if all(done):
                break
            moved = False
            for i in r2.sample(range(n), n):
                if done[i]:
                    continue
                if all(x == 0 for x in nd[i]):
                    for j in range(m):
                        av[j] += al[i][j]
                    done[i] = True
                    moved = True
                    break
                wants = [j for j in range(m) if nd[i][j] > 0 and av[j] > 0]
                if wants:
                    j = r2.choice(wants)
                    av[j] -= 1
                    al[i][j] += 1
                    nd[i][j] -= 1
                    moved = True
                    break
            if not moved:
                break
        escaped += all(done)
    assert 0 < escaped < len(unsafe_states), (escaped, len(unsafe_states))

    print(f'contest: deadlock avoidance; referee for the check: exhaustive search over every completion order on 400 random states (3 to 7 processes, 1 to 3 resource types)')
    print(f"  {'method':<40} {'verdicts agree':>14} {'work (need checks)':>18}   verdict")
    print(f"  {'greedy safe-state check':<40} {'400 / 400':>14} {greedy_ops[0]:>18,}   finish any process that fits, repeat; the pool only grows")
    print(f"  {'exhaustive (every order)':<40} {'400 / 400':>14} {brute_ops[0]:>18,}   the referee: up to 7! orders per state")
    print(f'  sampled states: {safe_count} safe, {len(unsafe_states)} unsafe; with actual demands drawn below the declarations, a naive granter still finished from {escaped} of the {len(unsafe_states)} unsafe states (unsafe means no guarantee, not doom)')
    print(f'textbook state: safe order P{order[0]} P{order[1]} P{order[2]} P{order[3]} P{order[4]}; P1 (1,0,2) {v1}; P4 (3,3,0) {v4}; P0 (0,2,0) {v0}')
    print(f'simulation (200 workloads, 5 processes, 3 resource types, declared maxima with actual demands drawn below them, one-unit requests): banker finished {banker_ok} / 200 with {deferrals_total:,} unsafe deferrals; '
          f'grant-if-available finished {naive_ok} / 200 and deadlocked in {200 - naive_ok}; the deferrals are the price of caution, {deferrals_total / 200:.1f} waits per workload')
    print(f'OK: greedy check agreed with exhaustion on 400 / 400 states at {greedy_ops[0] / brute_ops[0]:.2%} of its work; textbook verdicts {v1}/{v4}/{v0}; banker {banker_ok} / 200 vs naive {naive_ok} / 200; '
          f'{escaped} of {len(unsafe_states)} unsafe states escaped deadlock under a naive granter')
