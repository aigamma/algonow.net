# Puzzle 48: Earliest deadline first x dynamic deadline priority
# Schedule periodic tasks on one preemptive CPU so that EVERY deadline
# is met whenever the math says meeting them is possible at all.
#
# The pairing is the point. The algorithm is priority scheduling with
# preemption: at every instant, run the highest-priority ready job, and
# take the CPU away the moment a higher one arrives. The heuristic is
# WHAT the priority is: the absolute deadline, recomputed per job, so
# priorities are dynamic. Liu and Layland's 1973 theorem says this one
# rule is optimal on one CPU: utilization <= 100% implies zero misses:
# and this file hammers the theorem over 300 random task sets simulated
# to their full hyperperiods. The fixed-priority alternative
# (rate-monotonic: shorter period = higher priority, forever) is safe
# only to ln 2 ~ 69.3%: the gap between 69% and 100% is measured as a
# success-rate curve, the classic (2,5),(4,7) casualty is asserted
# deterministically, and the overload flip, where RM degrades
# gracefully while EDF's misses spray across every task, is measured
# too, because that flip is why avionics still flies fixed priorities.
import math
import random
from functools import reduce


def lcm(a, b):
    return a * b // math.gcd(a, b)


def simulate(tasks, policy, horizon=None):
    """tasks: list of (C, T) with deadline == period. Discrete time,
    synchronous release at t = 0 (the critical instant). Returns
    per-task deadline-miss counts over the horizon."""
    n = len(tasks)
    if horizon is None:
        horizon = reduce(lcm, (t for _, t in tasks), 1)
    remaining = [0] * n          # work left on the current job
    deadline = [0] * n           # absolute deadline of the current job
    misses = [0] * n
    for t in range(horizon):
        for i, (C, T) in enumerate(tasks):
            if t % T == 0:
                if remaining[i] > 0:
                    misses[i] += 1  # previous job still unfinished: missed
                remaining[i] = C
                deadline[i] = t + T
        ready = [i for i in range(n) if remaining[i] > 0]
        if ready:
            if policy == "edf":
                run = min(ready, key=lambda i: (deadline[i], i))
            elif policy == "rm":
                run = min(ready, key=lambda i: (tasks[i][1], i))
            else:  # fifo: earliest release, no preemption between jobs
                run = min(ready, key=lambda i: (deadline[i] - tasks[i][1], tasks[i][1], i))
            remaining[run] -= 1
    for i in range(n):
        if remaining[i] > 0:
            misses[i] += 1
    return misses


def rand_task_set(rng, n_tasks, u_target):
    """Integer-C task sets near a target utilization."""
    periods = rng.sample([4, 5, 8, 10, 16, 20, 25, 40, 50, 80, 100], n_tasks)
    shares = [rng.random() for _ in range(n_tasks)]
    s = sum(shares)
    tasks = []
    for share, T in zip(shares, periods):
        C = max(1, round(share / s * u_target * T))
        C = min(C, T)
        tasks.append((C, T))
    return tasks


def utilization(tasks):
    return sum(C / T for C, T in tasks)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the EDF theorem, hammered. 300 random sets with U <= 1,
    # simulated to their full hyperperiods: zero misses, every time.
    checked = 0
    while checked < 300:
        ts = rand_task_set(rng, rng.randint(2, 5), rng.uniform(0.5, 0.99))
        if utilization(ts) > 1.0:
            continue
        assert sum(simulate(ts, "edf")) == 0, (ts, utilization(ts))
        checked += 1

    # Oracle 2: the Liu-Layland safe zone for fixed priorities. Sets
    # under ln 2 utilization: rate-monotonic also never misses.
    checked = 0
    while checked < 150:
        ts = rand_task_set(rng, rng.randint(2, 5), rng.uniform(0.35, 0.65))
        if utilization(ts) > 0.693:
            continue
        assert sum(simulate(ts, "rm")) == 0, ts
        checked += 1

    # Oracle 3: the classic casualty, deterministic. Tasks (2,5) and
    # (4,7): U = 0.971. Rate-monotonic misses; EDF does not.
    classic = [(2, 5), (4, 7)]
    assert abs(utilization(classic) - (2 / 5 + 4 / 7)) < 1e-12
    assert sum(simulate(classic, "edf")) == 0
    assert sum(simulate(classic, "rm")) > 0

    # Oracle 4: the gap, as a curve. Success rate by utilization bin.
    bins = [(0.70, 0.80), (0.80, 0.90), (0.90, 0.97), (0.97, 1.00)]
    curve = {}
    for lo, hi in bins:
        ok_rm = 0
        ok_edf = 0
        total = 0
        while total < 120:
            ts = rand_task_set(rng, rng.randint(2, 5), rng.uniform(lo, hi))
            u = utilization(ts)
            if not (lo <= u <= hi):
                continue
            total += 1
            if sum(simulate(ts, "rm")) == 0:
                ok_rm += 1
            if sum(simulate(ts, "edf")) == 0:
                ok_edf += 1
        assert ok_edf == total  # the theorem again, bin by bin
        curve[(lo, hi)] = (ok_rm, total)
    rates = [ok / tot for (ok, tot) in curve.values()]
    assert rates[0] > rates[-1]          # the curve falls
    assert rates[-1] < 0.85              # near U = 1, RM drops real sets

    # Oracle 5: the overload flip. Add ONE tick of work to the classic
    # pair: (3,5),(4,7), U = 1.171. Under EDF the misses spray across
    # BOTH tasks (phase drift hands the pain around); under
    # rate-monotonic the fast task is absolutely shielded and the slow
    # one absorbs everything. (An honest note, measured first: with
    # well-separated periods EDF also shields the fast task, because
    # its deadlines are nearly always earliest: the spray needs
    # near-equal, non-harmonic periods, and this pair has them.)
    over = [(3, 5), (4, 7)]  # U = 0.6 + 0.571 = 1.171
    assert utilization(over) > 1.0
    m_edf = simulate(over, "edf")
    m_rm = simulate(over, "rm")
    assert m_edf[0] > 0 and m_edf[1] > 0        # EDF: everyone pays
    assert m_rm[0] == 0                         # RM: the (3,5) task untouched
    assert m_rm[1] > m_edf[1]                   # the slow task absorbs it all

    print("contest: periodic task sets, one preemptive CPU, simulated to full hyperperiods from the synchronous critical instant")
    print(f"  {'policy':<22} {'U<=1 sets scheduled':>19}   overload (U=1.171) miss pattern")
    print(f"  {'EDF (deadline prio)':<22} {'300/300 + 480/480':>19}   misses spray: both tasks pay {m_edf}")
    print(f"  {'Rate-monotonic':<22} {'safe only to 69.3%':>19}   graceful: fast task shielded {m_rm}")
    print("the Liu-Layland gap, measured (RM success rate by utilization bin): " + " | ".join(f"U {lo:.2f}-{hi:.2f}: {ok}/{tot}" for (lo, hi), (ok, tot) in curve.items()))
    print(f"the classic casualty: tasks (C=2,T=5) and (C=4,T=7), U = 97.1%: EDF meets every deadline over the 35-tick hyperperiod; rate-monotonic drops {sum(simulate(classic, 'rm'))} job(s): asserted deterministically")
    print("OK: EDF at zero misses on all 780 sets with U <= 1 (the optimality theorem, hammered), RM clean below ln 2 and falling through the gap above it, the (2,5)/(4,7) casualty exact, and the overload flip measured: EDF sprays, RM shields its favorites")
