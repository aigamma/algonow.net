# Puzzle 67: Rate-monotonic scheduling x shorter period wins
# Schedule periodic hard-deadline tasks on one processor with FIXED
# priorities: decided once, offline, burned into the interrupt table.
#
# The pairing is the point. The algorithm is fixed-priority
# preemption: the ready task with the highest priority always owns
# the CPU, priorities never change at runtime: the cheapest possible
# dispatcher. The heuristic is the rate-monotonic rule: shorter
# period = higher priority, and Liu & Layland proved in 1973 that
# among ALL fixed-priority orderings this one is optimal: if any
# fixed assignment meets every deadline, so does rate order. The
# referees: response-time analysis (the exact fixpoint test) against
# a cycle-accurate simulator, agreeing task by task; the Liu-Layland
# utilization bound n(2^(1/n)-1) with zero counterexamples below it;
# the live EDF unit re-simulated as the dynamic-priority rival that
# holds to U = 1; a harmonic set scheduling perfectly AT U = 1.0
# (the bound is sufficient, not necessary); and the classic embedded
# bug: priorities by importance instead of rate: made to miss
# deadlines at a utilization RM handles.
import math
import random


def lcm(a, b):
    return a * b // math.gcd(a, b)


def hyperperiod(tasks):
    h = 1
    for T, C in tasks:
        h = lcm(h, T)
    return h


def simulate_fixed(tasks, priority, horizon):
    """Unit-time preemptive fixed-priority simulation, synchronous
    release at t=0 (the critical instant). Returns (worst response
    per task, deadline_missed). Implicit deadlines D = T."""
    n = len(tasks)
    order = sorted(range(n), key=priority)
    remaining = [0] * n
    release = [0] * n
    started = [0] * n
    worst = [0] * n
    missed = False
    for t in range(horizon):
        for i in range(n):
            T, C = tasks[i]
            if t % T == 0:
                if remaining[i] > 0:
                    missed = True  # previous job still unfinished
                remaining[i] = C
                release[i] = t
        run = next((i for i in order if remaining[i] > 0), None)
        if run is not None:
            remaining[run] -= 1
            if remaining[run] == 0:
                resp = t + 1 - release[run]
                worst[run] = max(worst[run], resp)
                if resp > tasks[run][0]:
                    missed = True
    for i in range(n):
        if remaining[i] > 0:
            missed = True
    return worst, missed


def simulate_edf(tasks, horizon):
    """The live EDF unit's dispatcher, re-raced: earliest absolute
    deadline owns the CPU."""
    n = len(tasks)
    remaining = [0] * n
    deadline = [0] * n
    missed = False
    for t in range(horizon):
        for i in range(n):
            T, C = tasks[i]
            if t % T == 0:
                if remaining[i] > 0:
                    missed = True
                remaining[i] = C
                deadline[i] = t + T
        ready = [i for i in range(n) if remaining[i] > 0]
        if ready:
            run = min(ready, key=lambda i: deadline[i])
            remaining[run] -= 1
            if remaining[run] == 0 and t + 1 > deadline[run]:
                missed = True
    if any(remaining):
        missed = True
    return missed


def rta(tasks):
    """Exact response-time analysis under rate order. Returns list of
    worst responses, or None where the fixpoint exceeds the period."""
    order = sorted(range(len(tasks)), key=lambda i: tasks[i][0])
    resp = [None] * len(tasks)
    for rank, i in enumerate(order):
        T, C = tasks[i]
        higher = order[:rank]
        R = C
        while True:
            newR = C + sum(
                math.ceil(R / tasks[j][0]) * tasks[j][1] for j in higher
            )
            if newR == R:
                break
            R = newR
            if R > T:
                break
        resp[i] = R if R <= T else None
    return resp


def util(tasks):
    return sum(C / T for T, C in tasks)


PERIODS = [4, 5, 8, 10, 16, 20, 25, 40]


def random_set(rng, n, u_lo, u_hi, tries=4000):
    for _ in range(tries):
        Ts = rng.sample(PERIODS, n)
        Cs = [max(1, int(rng.uniform(0.05, 0.6) * T)) for T in Ts]
        tasks = list(zip(Ts, Cs))
        if u_lo <= util(tasks) <= u_hi:
            return tasks
    return None


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the exact test vs the machine. On 200 random sets the
    # RTA fixpoint must agree with the cycle-accurate simulator BOTH
    # WAYS: schedulable -> worst responses equal, task by task;
    # unschedulable -> the simulator actually misses a deadline.
    agree_sched = agree_miss = 0
    for _ in range(200):
        n = rng.randint(2, 4)
        tasks = random_set(rng, n, 0.4, 0.99)
        if tasks is None:
            continue
        resp = rta(tasks)
        worst, missed = simulate_fixed(
            tasks, lambda i: tasks[i][0], hyperperiod(tasks)
        )
        if all(r is not None for r in resp):
            assert not missed, tasks
            for i in range(len(tasks)):
                assert worst[i] == resp[i], (tasks, i, worst[i], resp[i])
            agree_sched += 1
        else:
            assert missed, tasks
            agree_miss += 1
    assert agree_sched > 100 and agree_miss > 10

    # Oracle 2: the Liu-Layland bound protects. 300 sets with
    # U <= n(2^(1/n)-1): zero misses under rate order, ever.
    below = 0
    while below < 300:
        n = rng.randint(2, 4)
        bound = n * (2 ** (1 / n) - 1)
        tasks = random_set(rng, n, 0.3, bound)
        if tasks is None or util(tasks) > bound:
            continue
        _, missed = simulate_fixed(tasks, lambda i: tasks[i][0], hyperperiod(tasks))
        assert not missed, tasks
        below += 1

    # Oracle 3: the gap. 300 sets with ln2-ish bound < U <= 0.95: RM
    # sometimes fails (measure the fraction); the live EDF dispatcher
    # never does (Liu & Layland's own dynamic-priority theorem).
    rm_fail = 0
    trials = 0
    while trials < 300:
        n = rng.randint(3, 4)
        bound = n * (2 ** (1 / n) - 1)
        tasks = random_set(rng, n, bound + 1e-9, 0.95)
        if tasks is None or util(tasks) <= bound:
            continue
        trials += 1
        _, missed = simulate_fixed(tasks, lambda i: tasks[i][0], hyperperiod(tasks))
        rm_fail += missed
        assert not simulate_edf(tasks, hyperperiod(tasks)), tasks  # EDF: never
    frac = rm_fail / trials
    assert frac > 0.01  # the gap is real, not folklore

    # Oracle 4: harmonic magic AT full utilization. Periods dividing
    # each other, U = 1.0 exactly: rate order schedules perfectly:
    # the bound is sufficient, never necessary.
    harmonic = [(10, 5), (20, 5), (40, 10)]
    assert util(harmonic) == 1.0
    _, missed = simulate_fixed(harmonic, lambda i: harmonic[i][0], hyperperiod(harmonic))
    assert not missed

    # Oracle 5: the embedded classic. The "important" slow task gets
    # top priority; the humble 5ms loop starves. Same tasks, rate
    # order: everyone meets. U = 0.75.
    embedded = [(5, 1), (20, 6), (100, 25)]
    assert abs(util(embedded) - 0.75) < 1e-9
    importance = {0: 2, 1: 1, 2: 0}  # telemetry crowned, sensor last
    _, miss_imp = simulate_fixed(embedded, lambda i: importance[i], hyperperiod(embedded))
    _, miss_rm = simulate_fixed(embedded, lambda i: embedded[i][0], hyperperiod(embedded))
    assert miss_imp and not miss_rm
    # The exact fixpoints: note telemetry's 54, not the naive
    # 25 + interference-at-25: the growing window admits more
    # preemptions, which grow the window: iterate to rest.
    resp = rta(embedded)
    assert resp == [1, 8, 54]  # fixpoints, confirmed by the simulator
    worst, _ = simulate_fixed(embedded, lambda i: embedded[i][0], hyperperiod(embedded))
    assert worst == resp

    ll3 = 3 * (2 ** (1 / 3) - 1)
    print("contest: periodic hard-deadline tasks, one CPU; referee: response-time analysis agreeing with a cycle-accurate simulator, task by task, both directions")
    print(f"  {'policy':<26} {'guarantee':>18}   measured")
    print(f"  {'Importance priorities':<26} {'none':>18}   missed deadlines at U = 0.75 (the sensor starved)")
    print(f"  {'Rate-monotonic':<26} {'U <= n(2^1/n - 1)':>18}   0 misses in 300 sets under the bound; optimal among fixed")
    print(f"  {'EDF (live unit)':<26} {'U <= 1':>18}   0 misses in all 300 above-bound sets RM sometimes failed")
    print(f"the gap, measured: above the bound (~{ll3:.3f} for n=3) up to U = 0.95, rate order missed on {frac:.0%} of sets while EDF missed none; the harmonic set (10,20,40 dividing) ran clean AT U = 1.0")
    print(f"the exact test: RTA fixpoints {resp} == simulated worst responses {worst} on the embedded client (5ms sensor, 20ms control, 100ms telemetry, U = 0.75); importance-ordered priorities missed, rate order did not")
    print(f"agreement audit: {agree_sched} schedulable sets with responses equal task-by-task, {agree_miss} RTA-rejected sets all confirmed missing in simulation")
    print("OK: RTA vs simulator both directions, the Liu-Layland bound clean on 300 sets, the RM-vs-EDF gap measured with EDF spotless, harmonic U=1.0 clean, and the importance-priority classic made to fail where rate order succeeds")
