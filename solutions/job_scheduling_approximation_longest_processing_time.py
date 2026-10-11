"""Job scheduling approximation x Longest processing time: Graham's LPT rule
held to exact optima, to its own tight family, to the arbitrary-order list
rule it improves on, to MULTIFIT, and to a local search started from it.

P||Cmax: n jobs with processing times, m identical machines, minimize the
makespan (the latest finishing time). NP-hard for m >= 2 (partition).
List scheduling (Graham 1966): take the jobs in the order given, put each on
the machine that is least loaded so far; makespan <= (2 - 1/m) OPT.
LPT (Graham 1969): sort the jobs longest first, then list-schedule;
makespan <= (4/3 - 1/(3m)) OPT, and the bound is tight.

Oracles: exact optima by branch and bound (checked against brute force over
every assignment on small instances); the two tight families with their
closed-form ratios; the lower bounds max p and ceil(sum p / m) that every
schedule obeys; MULTIFIT (Coffman, Garey, Johnson 1978) and a move-or-swap
local search on the same instances; the exact search's node count.

Author corrections: the draft expected LPT to sit about 10 percent above
the optimum on average for small random instances; the measurement put the
mean ratio at 1.02, with the worst case per machine count well inside the
bound (1.05, 1.11, 1.17 against 1.17, 1.22, 1.25). The draft also expected
MULTIFIT to tie LPT on most instances; it beat LPT on about half of them
(148 wins, 100 ties, 52 losses), so the page reports the three counts and
calls MULTIFIT the stronger offline heuristic at the price of many packings.
"""
import math
import random
import time


def list_schedule(jobs, m):
    """Each job, in the order given, to the least loaded machine."""
    loads = [0] * m
    assign = []
    for p in jobs:
        k = loads.index(min(loads))
        loads[k] += p
        assign.append(k)
    return max(loads), loads, assign


def lpt(jobs, m):
    order = sorted(range(len(jobs)), key=lambda i: -jobs[i])
    mk, loads, assign_sorted = list_schedule([jobs[i] for i in order], m)
    assign = [0] * len(jobs)
    for pos, i in enumerate(order):
        assign[i] = assign_sorted[pos]
    return mk, loads, assign


def lower_bound(jobs, m):
    return max(max(jobs), -(-sum(jobs) // m))


def exact(jobs, m, ub):
    """Branch and bound on jobs sorted longest first; ub is an achievable
    makespan (LPT's), so the answer is min(ub, best found below it).
    Machines with equal loads are interchangeable: only the first is tried."""
    js = sorted(jobs, reverse=True)
    n = len(js)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] + js[i]
    loads = [0] * m
    state = {'best': ub, 'nodes': 0}

    def rec(i):
        state['nodes'] += 1
        cur = max(loads)
        if cur >= state['best']:
            return
        if i == n:
            state['best'] = cur
            return
        rest = -(-(sum(loads) + suffix[i]) // m)
        if max(cur, rest, min(loads) + js[i]) >= state['best']:
            return
        seen = set()
        for k in range(m):
            if loads[k] in seen:
                continue
            seen.add(loads[k])
            loads[k] += js[i]
            rec(i + 1)
            loads[k] -= js[i]

    rec(0)
    return state['best'], state['nodes']


def brute_force(jobs, m):
    n = len(jobs)
    best = sum(jobs)
    for code in range(m ** n):
        loads = [0] * m
        c = code
        for p in jobs:
            loads[c % m] += p
            c //= m
        best = min(best, max(loads))
    return best


def ffd_fits(js_desc, m, cap):
    bins = []
    for p in js_desc:
        for b in range(len(bins)):
            if bins[b] + p <= cap:
                bins[b] += p
                break
        else:
            if len(bins) == m:
                return None
            bins.append(p)
    return bins


def multifit(jobs, m):
    """Binary search the bin capacity; first fit decreasing packs into m bins."""
    js = sorted(jobs, reverse=True)
    lo, hi = lower_bound(jobs, m), lpt(jobs, m)[0]
    probes = 1
    while ffd_fits(js, m, hi) is None:  # FFD can fail where LPT fit; widen
        hi += 1
        probes += 1
    while lo < hi:
        mid = (lo + hi) // 2
        probes += 1
        if ffd_fits(js, m, mid) is not None:
            hi = mid
        else:
            lo = mid + 1
    bins = ffd_fits(js, m, hi)
    return max(bins), probes


def local_search(jobs, m):
    """From LPT: move a job off the busiest machine, or swap it for a shorter
    one elsewhere, whenever the busiest machine's load strictly drops."""
    mk, loads, assign = lpt(jobs, m)
    on = [[i for i in range(len(jobs)) if assign[i] == k] for k in range(m)]
    moves = 0
    while True:
        a = loads.index(max(loads))
        improved = False
        for i in on[a]:
            for k in range(m):
                if k == a:
                    continue
                if loads[k] + jobs[i] < loads[a]:
                    loads[a] -= jobs[i]
                    loads[k] += jobs[i]
                    on[a].remove(i)
                    on[k].append(i)
                    improved = True
                    break
                for j in on[k]:
                    if jobs[j] < jobs[i] and loads[k] - jobs[j] + jobs[i] < loads[a]:
                        loads[a] += jobs[j] - jobs[i]
                        loads[k] += jobs[i] - jobs[j]
                        on[a].remove(i)
                        on[k].remove(j)
                        on[a].append(j)
                        on[k].append(i)
                        improved = True
                        break
                if improved:
                    break
            if improved:
                moves += 1
                break
        if not improved:
            return max(loads), moves


def lpt_tight_family(m):
    """2m + 1 jobs: two each of 2m-1 down to m+1, then three of size m."""
    jobs = []
    for s in range(2 * m - 1, m, -1):
        jobs += [s, s]
    jobs += [m, m, m]
    return jobs


def list_tight_family(m):
    return [1] * (m * (m - 1)) + [m]


def main():
    t0 = time.time()
    rng = random.Random(20261010)

    # 1. the exact solver against brute force
    for _ in range(60):
        n, m = rng.randint(4, 8), rng.randint(2, 3)
        jobs = [rng.randint(1, 30) for _ in range(n)]
        ub = lpt(jobs, m)[0]
        assert exact(jobs, m, ub)[0] == brute_force(jobs, m)
    print('exact branch and bound equals brute force on 60 small instances')

    # 2. random instances against the exact optimum
    rows = []
    for _ in range(300):
        n, m = rng.randint(10, 14), rng.randint(2, 4)
        jobs = [rng.randint(1, 50) for _ in range(n)]
        lb = lower_bound(jobs, m)
        mk_lpt, loads, assign = lpt(jobs, m)
        assert mk_lpt == max(loads) and len(assign) == n and all(0 <= a < m for a in assign)
        opt, nodes = exact(jobs, m, mk_lpt)
        mk_list = list_schedule(jobs, m)[0]
        mk_mf, probes = multifit(jobs, m)
        mk_ls, moves = local_search(jobs, m)
        assert lb <= opt <= mk_lpt <= (4 / 3 - 1 / (3 * m)) * opt + 1e-9
        assert opt <= mk_list <= (2 - 1 / m) * opt + 1e-9
        assert opt <= mk_mf and opt <= mk_ls <= mk_lpt
        rows.append((m, n, opt, mk_lpt, mk_list, mk_mf, mk_ls, nodes, lb))
    r_lpt = [r[3] / r[2] for r in rows]
    r_list = [r[4] / r[2] for r in rows]
    r_mf = [r[5] / r[2] for r in rows]
    r_ls = [r[6] / r[2] for r in rows]
    opt_lpt = sum(1 for r in rows if r[3] == r[2])
    mf_win = sum(1 for r in rows if r[5] < r[3])
    mf_tie = sum(1 for r in rows if r[5] == r[3])
    mf_loss = sum(1 for r in rows if r[5] > r[3])
    lb_tight = sum(1 for r in rows if r[8] == r[2])
    mean_nodes = sum(r[7] for r in rows) / len(rows)
    worst_by_m = {}
    for r, ratio in zip(rows, r_lpt):
        worst_by_m[r[0]] = max(worst_by_m.get(r[0], 0), ratio)
    for m, w in worst_by_m.items():
        assert w <= 4 / 3 - 1 / (3 * m) + 1e-9
    print(f'300 random instances, n = 10..14, m = 2..4, sizes 1..50:')
    print(f'  LPT / OPT mean {sum(r_lpt) / 300:.4f}, worst {max(r_lpt):.4f}, optimal on {opt_lpt} of 300; worst by m: '
          + ', '.join(f'm={m}: {worst_by_m[m]:.4f} (bound {4 / 3 - 1 / (3 * m):.4f})' for m in sorted(worst_by_m)))
    print(f'  list (given order) / OPT mean {sum(r_list) / 300:.4f}, worst {max(r_list):.4f}')
    print(f'  MULTIFIT / OPT mean {sum(r_mf) / 300:.4f}, worst {max(r_mf):.4f}; '
          f'against LPT: wins {mf_win}, ties {mf_tie}, losses {mf_loss}')
    print(f'  local search from LPT / OPT mean {sum(r_ls) / 300:.4f}, worst {max(r_ls):.4f}')
    print(f'  exact search {mean_nodes:.0f} nodes mean; lower bound equal to OPT on {lb_tight} of 300')
    assert max(r_list) <= 2 - 1 / 4 + 1e-9

    # 3. the tight families
    tight = []
    for m in (2, 3, 4, 5):
        jobs = lpt_tight_family(m)
        mk, _, _ = lpt(jobs, m)
        opt, _ = exact(jobs, m, mk)
        assert opt == 3 * m and mk == 4 * m - 1
        assert abs(mk / opt - (4 / 3 - 1 / (3 * m))) < 1e-12
        tight.append((m, mk, opt))
        jobs2 = list_tight_family(m)
        mk2 = list_schedule(jobs2, m)[0]
        assert mk2 == 2 * m - 1 and lpt(jobs2, m)[0] == m
        assert abs(mk2 / m - (2 - 1 / m)) < 1e-12
    print('tight families: LPT ' + ', '.join(f'm={m}: {mk}/{opt} = {mk / opt:.4f}' for m, mk, opt in tight)
          + ' (4/3 - 1/(3m) exactly); list order 2 - 1/m exactly, LPT optimal there')

    # 4. large instances against the lower bounds (no exact optimum here)
    m = 10
    g_lpt, g_list, met = [], [], 0
    for _ in range(20):
        big = [rng.randint(1, 100) for _ in range(1000)]
        lb = lower_bound(big, m)
        mk_lpt = lpt(big, m)[0]
        mk_mf = multifit(big, m)[0]
        assert lb <= mk_lpt and lb <= mk_mf
        met += mk_lpt == lb
        g_lpt.append(100 * (mk_lpt - lb) / lb)
        g_list.append(100 * (list_schedule(big, m)[0] - lb) / lb)
    gap_lpt, gap_list, gap_list_max = max(g_lpt), sum(g_list) / 20, max(g_list)
    print(f'20 instances of n = 1,000 on m = 10: LPT met the lower bound max(p, ceil(sum/m)) on {met} of 20 '
          f'(worst gap {gap_lpt:.3f}%); arrival order {gap_list:.2f}% above on average, {gap_list_max:.2f}% at most')
    assert gap_lpt < 0.5

    # 5. the adversarial order for list scheduling at m = 10
    adv = list_tight_family(10)
    mk_adv = list_schedule(adv, 10)[0]
    print(f'adversarial arrival order, m = 10: list {mk_adv} against OPT 10 (ratio {mk_adv / 10:.2f} = 2 - 1/m), LPT {lpt(adv, 10)[0]}')
    assert mk_adv == 19

    # 6. exact search growth at m = 3 with sizes 1..1000 (few ties)
    growth = []
    for n in (12, 16, 20, 24):
        tot = 0
        for _ in range(3):
            jobs = [rng.randint(1, 1000) for _ in range(n)]
            tot += exact(jobs, 3, lpt(jobs, 3)[0])[1]
        growth.append((n, tot / 3))
    print('exact search nodes at m = 3, sizes 1..1000: ' + ', '.join(f'n={n}: {v:,.0f}' for n, v in growth))
    assert growth[-1][1] > 10 * growth[0][1]

    el = time.time() - t0
    print(f'OK: LPT within 4/3 - 1/(3m) of the exact optimum on 300 instances (mean {sum(r_lpt) / 300:.4f}, worst {max(r_lpt):.4f}, '
          f'optimal on {opt_lpt}) against list order mean {sum(r_list) / 300:.4f} worst {max(r_list):.4f}; '
          f'the tight family hits 4/3 - 1/(3m) exactly for m = 2 to 5 and the list family hits 2 - 1/m; '
          f'MULTIFIT wins {mf_win}, ties {mf_tie}, loses {mf_loss} against LPT; local search mean {sum(r_ls) / 300:.4f}; '
          f'n = 1,000 on 10 machines LPT met the lower bound on {met} of 20 instances against {gap_list:.2f}% above for arrival order; '
          f'exact search {growth[0][1]:,.0f} nodes at n = 12 and {growth[-1][1]:,.0f} at n = 24; {el:.1f} s')


if __name__ == '__main__':
    main()
