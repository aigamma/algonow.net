# Puzzle 183: Round-robin scheduling x Time quantum
# CPU scheduling: one processor, many jobs arriving over time with
# different CPU demands, and nobody knows a job's demand in advance. Pick
# which job runs next so that interactive jobs feel responsive, batch jobs
# still finish, and the processor is not eaten by the cost of switching.
# The algorithm is round-robin: a FIFO ready queue; the job at the head
# runs, and when it finishes or its turn expires it goes to the back and
# the next one runs. The heuristic is the time quantum: the fixed length
# of a turn. A small quantum gives every job a share of the processor
# within (n - 1) quanta, so a one-unit job behind a hundred-unit job waits
# one quantum instead of a hundred units (the convoy effect, defeated). A
# quantum below the context-switch cost hands the processor to the
# switching itself; a quantum above every burst turns round-robin back into
# first-come first-served. The rule of thumb since the 1960s: pick the
# quantum so that about 80% of bursts finish inside one turn.
#
# Referees:
# (1) LEGALITY AND CONSERVATION, on every schedule of every policy: one
#     job at a time, no job before its arrival, each job's segments add
#     up to exactly its burst, busy time identical across policies, and
#     the makespan equal to busy time plus idle time plus the switches
#     times the switch cost;
# (2) EXHAUSTIVE OPTIMA on small instances: shortest-job-first has the
#     minimum mean waiting time over ALL non-preemptive orders (every
#     permutation enumerated, 200 instances of 7 jobs released together),
#     and shortest-remaining-time-first has the minimum over ALL preemptive
#     unit-granularity schedules (a dynamic program over remaining-work
#     states, 100 instances with staggered arrivals);
# (3) THE ROUND-ROBIN FAIRNESS BOUND, checked on every job: between two
#     consecutive turns of a job every other job runs at most once, so the
#     gap is at most k (q + c) + c with k the number of other jobs that ran
#     in it, q the quantum, c the switch cost;
# (4) THE QUANTUM SWEEP on one mixed workload of 60 jobs (interactive
#     bursts of 1 to 6 units, batch bursts of 20 to 80, Poisson-like
#     arrivals at about 80% utilization), switch cost 1: mean response, mean turnaround, mean
#     waiting, maximum waiting, switches, and processor utilization for
#     q = 1, 2, 4, 8, 16, 32, 64, and infinity (which is FCFS), against
#     FCFS, SJF, SRTF, and a three-level multilevel feedback queue;
# (5) THE NEGATIVE EXAMPLES, measured: FCFS with a convoy (a batch job at
#     the head, interactive jobs stalled behind it), and a quantum smaller
#     than the switch cost (q = 1 with c = 2), where the processor spends
#     two thirds of its time switching.
#
# AUTHOR CORRECTIONS: three, all recorded. (1) The draft stated the
# textbook bound "no job waits more than (n - 1) q for its next turn" and
# the measurement broke it by one unit: with a switch cost the gap is
# k (q + c) + c, where k is the number of other jobs that ran in the gap,
# and the structural fact underneath (every other job runs at most once
# between two turns of a job, arrivals included) is what the file asserts.
# (2) The first workload put 1,047 units of demand into 300 time units, an
# offered load above three, so every policy was measuring queue collapse
# rather than scheduling; the arrivals were spread to about 76% load. (3)
# The 80%-of-bursts rule of thumb picks a quantum of 36 on this bimodal
# mix, which measures almost like FCFS for response; the page recommends
# sizing the quantum to the interactive bursts instead (q = 4), and says
# plainly that FCFS has the best mean turnaround here and that the
# multilevel feedback queue beats plain round-robin on both response and
# turnaround: round-robin buys responsiveness, not throughput.
import itertools
import math
import random
from collections import deque
from functools import lru_cache

SEED = 20261010
INF = float('inf')


class Job:
    __slots__ = ('jid', 'arrival', 'burst', 'kind')

    def __init__(self, jid, arrival, burst, kind):
        self.jid = jid
        self.arrival = arrival
        self.burst = burst
        self.kind = kind


def simulate(jobs, policy, quantum=INF, switch_cost=0, levels=None):
    """Event-driven single-CPU simulation. policy in {'fcfs', 'sjf',
    'srtf', 'rr', 'mlfq'}. Returns the schedule (job id, start, end) and
    per-job metrics. Time is integer; a context switch of switch_cost is
    charged whenever a different job than the last one is dispatched."""
    n = len(jobs)
    remaining = [j.burst for j in jobs]
    first_run = [None] * n
    finish = [None] * n
    pending = sorted(range(n), key=lambda i: (jobs[i].arrival, i))
    ready = deque()
    level_of = [0] * n
    queues = [deque() for _ in range(len(levels))] if policy == 'mlfq' else None
    t = 0
    last = None
    switches = 0
    schedule = []
    ready_sizes = []
    p = 0
    done = 0
    idle = 0

    def admit(upto):
        nonlocal p
        while p < len(pending) and jobs[pending[p]].arrival <= upto:
            i = pending[p]
            p += 1
            if policy == 'mlfq':
                queues[0].append(i)
            else:
                ready.append(i)

    def ready_count():
        return sum(len(q) for q in queues) if policy == 'mlfq' else len(ready)

    while done < n:
        admit(t)
        if ready_count() == 0:
            nxt = jobs[pending[p]].arrival
            idle += nxt - t
            t = nxt
            continue
        # choose
        if policy == 'fcfs':
            i = ready.popleft()
            run = remaining[i]
        elif policy == 'sjf':
            i = min(ready, key=lambda k: (remaining[k], jobs[k].arrival, k))
            ready.remove(i)
            run = remaining[i]
        elif policy == 'srtf':
            i = min(ready, key=lambda k: (remaining[k], jobs[k].arrival, k))
            ready.remove(i)
            # run until completion or the next arrival (which may preempt)
            next_arr = jobs[pending[p]].arrival if p < len(pending) else INF
            run = min(remaining[i], max(1, next_arr - t - (switch_cost if last != i else 0))) if next_arr != INF else remaining[i]
            run = max(1, min(run, remaining[i]))
        elif policy == 'rr':
            i = ready.popleft()
            run = min(remaining[i], quantum)
        else:  # mlfq
            lvl = next(k for k, q in enumerate(queues) if q)
            i = queues[lvl].popleft()
            run = min(remaining[i], levels[lvl])
        ready_sizes.append(ready_count() + 1)
        if last is not None and last != i:
            switches += 1
            t += switch_cost
        if first_run[i] is None:
            first_run[i] = t
        start = t
        t += run
        remaining[i] -= run
        schedule.append((i, start, t))
        last = i
        admit(t)  # arrivals during the run join before the preempted job
        if remaining[i] == 0:
            finish[i] = t
            done += 1
        else:
            if policy == 'rr':
                ready.append(i)
            elif policy == 'srtf' or policy == 'sjf' or policy == 'fcfs':
                ready.append(i)
            else:
                if run == levels[level_of[i]] and level_of[i] < len(levels) - 1:
                    level_of[i] += 1
                queues[level_of[i]].append(i)
    metrics = []
    for i, j in enumerate(jobs):
        turnaround = finish[i] - j.arrival
        metrics.append({'jid': j.jid, 'kind': j.kind, 'turnaround': turnaround, 'waiting': turnaround - j.burst, 'response': first_run[i] - j.arrival})
    return {
        'schedule': schedule, 'metrics': metrics, 'switches': switches, 'makespan': t, 'idle': idle,
        'busy': sum(j.burst for j in jobs), 'max_ready': max(ready_sizes),
    }


def check_legal(jobs, result):
    """One job at a time, nothing before arrival, segments sum to the
    burst, makespan accounted for."""
    sched = sorted(result['schedule'], key=lambda s: s[1])
    for (a, s1, e1), (b, s2, e2) in zip(sched, sched[1:]):
        assert e1 <= s2, 'two jobs overlap'
    total = {}
    for i, s, e in sched:
        assert s >= jobs[i].arrival, 'a job ran before it arrived'
        assert e > s, 'an empty segment'
        total[i] = total.get(i, 0) + (e - s)
    for i, j in enumerate(jobs):
        assert total[i] == j.burst, (i, total[i], j.burst)
    return True


def summarize(result, kind=None):
    ms = [m for m in result['metrics'] if kind is None or m['kind'] == kind]
    n = len(ms)
    return {
        'turnaround': sum(m['turnaround'] for m in ms) / n,
        'waiting': sum(m['waiting'] for m in ms) / n,
        'response': sum(m['response'] for m in ms) / n,
        'max_waiting': max(m['waiting'] for m in ms),
        'switches': result['switches'],
        'utilization': result['busy'] / (result['makespan'] - result['idle']),
        'makespan': result['makespan'],
    }


def rr_gap_bound(jobs, result, quantum, switch_cost):
    """Round-robin fairness, checked on every job: between two consecutive
    turns of a job, every other job runs at most once (arrivals included,
    since they join the queue ahead of the preempted job), so the gap is
    at most k (q + c) + c where k is the number of other jobs that ran in it.
    Returns the worst gap and the largest k seen."""
    sched = sorted(result['schedule'], key=lambda seg: seg[1])
    by_job = {}
    for pos, (i, s, e) in enumerate(sched):
        by_job.setdefault(i, []).append((pos, s, e))
    worst = 0
    worst_k = 0
    for segs in by_job.values():
        for (p1, s1, e1), (p2, s2, e2) in zip(segs, segs[1:]):
            others = [sched[k][0] for k in range(p1 + 1, p2)]
            assert len(others) == len(set(others)), 'a job ran twice while another waited for its turn'
            gap = s2 - e1
            # each other turn costs a switch into it plus up to one quantum, and the
            # switch back to this job closes the gap
            assert gap <= len(others) * (quantum + switch_cost) + switch_cost, (gap, len(others), quantum)
            if gap > worst:
                worst, worst_k = gap, len(others)
    return worst, worst_k


def brute_force_nonpreemptive(jobs):
    best = INF
    for order in itertools.permutations(range(len(jobs))):
        t = 0
        wait = 0
        for i in order:
            t = max(t, jobs[i].arrival)
            wait += t - jobs[i].arrival
            t += jobs[i].burst
        best = min(best, wait / len(jobs))
    return best


def optimal_preemptive(jobs):
    """Minimum mean waiting over all unit-granularity preemptive schedules
    (dynamic program over time and remaining work)."""
    n = len(jobs)
    arrivals = tuple(j.arrival for j in jobs)
    bursts = tuple(j.burst for j in jobs)

    @lru_cache(maxsize=None)
    def best(t, rem):
        if all(r == 0 for r in rem):
            return 0
        ready = [i for i in range(n) if rem[i] > 0 and arrivals[i] <= t]
        if not ready:
            return best(t + 1, rem)
        # every unfinished, arrived job waits this unit except the one running
        waiting_now = len(ready) - 1
        out = INF
        for i in ready:
            nr = list(rem)
            nr[i] -= 1
            out = min(out, waiting_now + best(t + 1, tuple(nr)))
        return out

    return best(0, bursts) / n


def workload(rng, n=60, horizon=1300):
    jobs = []
    t = 0
    for k in range(n):
        t += rng.expovariate(n / horizon)
        if rng.random() < 0.7:
            jobs.append(Job(k, int(t), rng.randint(1, 6), 'interactive'))
        else:
            jobs.append(Job(k, int(t), rng.randint(20, 80), 'batch'))
    return jobs


def main():
    rng = random.Random(SEED)

    # Oracle 2: exhaustive optima.
    sjf_optimal = 0
    for _ in range(200):
        jobs = [Job(i, 0, rng.randint(1, 20), 'x') for i in range(7)]
        res = simulate(jobs, 'sjf')
        check_legal(jobs, res)
        assert abs(summarize(res)['waiting'] - brute_force_nonpreemptive(jobs)) < 1e-9
        fc = summarize(simulate(jobs, 'fcfs'))['waiting']
        assert fc >= summarize(res)['waiting'] - 1e-9
        sjf_optimal += 1
    srtf_optimal = 0
    srtf_vs_sjf_better = 0
    for _ in range(100):
        jobs = [Job(i, rng.randint(0, 6), rng.randint(1, 5), 'x') for i in range(4)]
        res = simulate(jobs, 'srtf')
        check_legal(jobs, res)
        opt = optimal_preemptive(jobs)
        got = summarize(res)['waiting']
        assert abs(got - opt) < 1e-9, (got, opt, [(j.arrival, j.burst) for j in jobs])
        srtf_optimal += 1
        srtf_vs_sjf_better += got < summarize(simulate(jobs, 'sjf'))['waiting'] - 1e-9

    # Oracle 1, 3, 4: the quantum sweep on one mixed workload.
    jobs = workload(random.Random(SEED + 1))
    c = 1
    sweep = {}
    busy = None
    for q in (1, 2, 4, 8, 16, 32, 64, INF):
        res = simulate(jobs, 'rr', quantum=q, switch_cost=c)
        check_legal(jobs, res)
        assert res['makespan'] == res['busy'] + res['idle'] + res['switches'] * c, 'makespan accounting'
        if busy is None:
            busy = res['busy']
        assert res['busy'] == busy
        gap, k = rr_gap_bound(jobs, res, q if q != INF else busy, c)
        sweep[q] = {'all': summarize(res), 'interactive': summarize(res, 'interactive'), 'batch': summarize(res, 'batch'), 'gap': gap, 'k': k}
    rivals = {}
    for name, pol, kw in (('FCFS', 'fcfs', {}), ('SJF (needs bursts)', 'sjf', {}), ('SRTF (needs bursts)', 'srtf', {}), ('MLFQ 4 / 8 / 16', 'mlfq', {'levels': [4, 8, 16]})):
        res = simulate(jobs, pol, switch_cost=c, **kw)
        check_legal(jobs, res)
        assert res['busy'] == busy
        assert res['makespan'] == res['busy'] + res['idle'] + res['switches'] * c
        rivals[name] = {'all': summarize(res), 'interactive': summarize(res, 'interactive'), 'batch': summarize(res, 'batch')}
    qs = [1, 2, 4, 8, 16, 32, 64]
    # the textbook rule of thumb (80% of bursts inside one quantum) against
    # the quantum sized to the interactive bursts (1 to 6 units), which is
    # the one the page recommends for this mix
    bursts = sorted(j.burst for j in jobs)
    q80 = bursts[int(0.8 * len(bursts)) - 1]
    chosen = 4
    rr = sweep[chosen]
    best_turn = min(qs, key=lambda q: sweep[q]['all']['turnaround'])

    # Oracle 5: the negative examples.
    convoy = [Job(0, 0, 80, 'batch')] + [Job(k, 1, 2, 'interactive') for k in range(1, 9)]
    fc = simulate(convoy, 'fcfs', switch_cost=c)
    rr4 = simulate(convoy, 'rr', quantum=4, switch_cost=c)
    check_legal(convoy, fc)
    check_legal(convoy, rr4)
    convoy_fcfs = summarize(fc, 'interactive')
    convoy_rr = summarize(rr4, 'interactive')
    tiny = simulate(jobs, 'rr', quantum=1, switch_cost=2)
    check_legal(jobs, tiny)
    tiny_s = summarize(tiny)

    print('contest: one processor, 60 jobs arriving over about 1,400 time units (interactive bursts of 1 to 6, batch bursts of 20 to 80), context switch cost 1; referee: legality and conservation on every schedule, exhaustive optima on small instances, the round-robin fairness bound on every turn')
    print(f'exhaustive optima: SJF equal to the best of 5,040 orders on {sjf_optimal} of 200 instances; SRTF equal to the preemptive optimum (a dynamic program) on {srtf_optimal} of 100 staggered instances, strictly better than SJF on {srtf_vs_sjf_better}')
    print(f'the workload: {len(jobs)} jobs, {busy} units of CPU demand over {max(j.arrival for j in jobs)} time units of arrivals; the 80%-of-bursts rule says a quantum of {q80} on this bimodal mix; the page recommends q = {chosen}, the scale of an interactive burst; mean turnaround is best at q = {best_turn}')
    print(f'{"quantum":>8} {"resp int":>8} {"resp all":>8} {"turn all":>8} {"wait all":>8} {"max wait":>8} {"switches":>8} {"util":>6} {"worst gap (others)":>18}')
    for q in (1, 2, 4, 8, 16, 32, 64, INF):
        sw = sweep[q]
        label = 'inf = FCFS' if q == INF else str(q)
        print(f'{label:>8} {sw["interactive"]["response"]:>8.1f} {sw["all"]["response"]:>8.1f} {sw["all"]["turnaround"]:>8.1f} {sw["all"]["waiting"]:>8.1f} {sw["all"]["max_waiting"]:>8d} {sw["all"]["switches"]:>8d} {sw["all"]["utilization"]:>6.3f} {sw["gap"]:>8d} ({sw["k"]})')
    print(f'{"method":>20} {"resp int":>8} {"resp all":>8} {"turn all":>8} {"wait all":>8} {"max wait":>8} {"switches":>8} {"util":>6}')
    for name, r in rivals.items():
        sa = r['all']
        print(f'{name:>20} {r["interactive"]["response"]:>8.1f} {sa["response"]:>8.1f} {sa["turnaround"]:>8.1f} {sa["waiting"]:>8.1f} {sa["max_waiting"]:>8d} {sa["switches"]:>8d} {sa["utilization"]:>6.3f}')
    print(f'convoy (one 80-unit batch job then eight 2-unit interactive jobs): FCFS mean interactive response {convoy_fcfs["response"]:.1f}, round-robin q = 4 {convoy_rr["response"]:.1f}')
    print(f'quantum below the switch cost (q = 1, c = 2): utilization {tiny_s["utilization"]:.3f}, mean turnaround {tiny_s["turnaround"]:.1f} against {rr["all"]["turnaround"]:.1f} at q = {chosen}')

    # FCFS and q = infinity must coincide
    assert sweep[INF]['all'] == rivals['FCFS']['all'], (sweep[INF]['all'], rivals['FCFS']['all'])
    # the sweep's two ends: switching eats the processor at q = 1, and the
    # largest quantum is FCFS; the shape in between is reported, not assumed
    assert sweep[1]['all']['utilization'] < sweep[INF]['all']['utilization'] - 0.2
    assert sweep[1]['all']['switches'] > 5 * sweep[64]['all']['switches']
    # the trade the page states: at q = 4 interactive response under a third
    # of FCFS, utilization within 0.15 of FCFS, turnaround far better than q = 1
    assert rr['interactive']['response'] < rivals['FCFS']['interactive']['response'] / 3, (rr['interactive']['response'], rivals['FCFS']['interactive']['response'])
    assert rr['all']['utilization'] > rivals['FCFS']['all']['utilization'] - 0.15
    assert rr['all']['turnaround'] < sweep[1]['all']['turnaround'] / 2
    # the optima that need burst lengths, and the rival that does not
    assert rivals['SJF (needs bursts)']['all']['waiting'] <= rr['all']['waiting'] + 1e-9
    assert rivals['SRTF (needs bursts)']['all']['waiting'] <= rivals['SJF (needs bursts)']['all']['waiting'] + 1e-9
    assert rivals['MLFQ 4 / 8 / 16']['interactive']['response'] < rr['interactive']['response']
    # the negative examples
    assert convoy_fcfs['response'] > 5 * convoy_rr['response'], (convoy_fcfs['response'], convoy_rr['response'])
    assert tiny_s['utilization'] < sweep[1]['all']['utilization'] - 0.1
    assert tiny_s['turnaround'] > 1.5 * rr['all']['turnaround']

    print(f'OK: round-robin at q = {chosen} answers interactive jobs in {rr["interactive"]["response"]:.1f} units on average against {rivals["FCFS"]["interactive"]["response"]:.1f} for FCFS, at utilization {rr["all"]["utilization"]:.3f} against {rivals["FCFS"]["all"]["utilization"]:.3f} and mean turnaround {rr["all"]["turnaround"]:.1f} against {rivals["FCFS"]["all"]["turnaround"]:.1f}; '
          f'q = 1 drops utilization to {sweep[1]["all"]["utilization"]:.3f} and doubles turnaround to {sweep[1]["all"]["turnaround"]:.1f}; SJF and SRTF matched exhaustive optima on 200 and 100 instances; every schedule legal and conserving; the fairness bound held on every turn')

if __name__ == '__main__':
    main()
