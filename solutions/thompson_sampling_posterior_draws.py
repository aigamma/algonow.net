# Puzzle 109: Thompson sampling x posterior draws
# Multi-armed bandits: k slot machines with unknown payout rates,
# one pull per round, and every pull spent learning is a pull not
# spent earning. Thompson sampling's move is probability matching
# by simulation: keep an exact Bayesian posterior per arm (Beta,
# by conjugacy with Bernoulli rewards), and each round DRAW one
# plausible world from each posterior and play the arm that wins
# in that imagined world. Arms are explored exactly as often as
# they are plausibly best: uncertainty itself sets the
# exploration rate, and no epsilon knob exists to mis-tune.
#
# The pairing is the point. The algorithm is Thompson sampling
# (Thompson, Biometrika 1933: proposed for clinical trials,
# ignored for eight decades, now the industry default). The
# heuristic is the posterior draw: one random sample per arm per
# round, standing in for the whole distribution: the cheapest
# honest summary of what might be true.
#
# Referees:
# (1) conjugacy audited exactly: every arm's Beta parameters
#     equal (1 + successes, 1 + failures) with the counts kept
#     independently; posterior means match the closed form;
# (2) calibration measured: the true payout rate falls inside
#     each arm's central 95% posterior interval at the advertised
#     rate across runs (a Bayesian's promise, checked);
# (3) identification: the most-pulled arm equals the true best
#     arm in >= 95% of runs on the hard instance;
# (4) the regret race on 100 seeded runs x 10,000 rounds, with a
#     twist this file's first draft got WRONG and the measurement
#     corrected: at this horizon, vanilla UCB1's conservative
#     bonus OVER-EXPLORES and loses to tuned epsilon-greedy
#     (176.6 vs 95.3): the guarantee costs rent. Thompson beats
#     both. Orderings asserted as measured, not as assumed;
# (5) the asymptotic split measured: epsilon-greedy's regret
#     roughly doubles from T/2 to T (linear forever) while
#     Thompson's and UCB1's growth curves bend (the log shape):
#     epsilon's lead over UCB1 is a horizon artifact, and the
#     growth rates say so;
# (6) the greedy trap counted: the fraction of greedy runs stuck
#     committed to a suboptimal arm at the horizon.
import math
import random

SEED = 20260829
ARMS = [0.45, 0.50, 0.55]   # the hard instance: gaps of 0.05
T = 10_000
RUNS = 100
BEST = max(ARMS)
BEST_I = ARMS.index(BEST)


def pull(rng, mu):
    return 1 if rng.random() < mu else 0


def run_thompson(rng):
    k = len(ARMS)
    a = [1] * k
    b = [1] * k
    succ = [0] * k
    fail = [0] * k
    pulls = [0] * k
    regret = 0.0
    half_regret = 0.0
    for t in range(T):
        draws = [rng.betavariate(a[i], b[i]) for i in range(k)]
        i = max(range(k), key=lambda j: draws[j])
        r = pull(rng, ARMS[i])
        a[i] += r
        b[i] += 1 - r
        succ[i] += r
        fail[i] += 1 - r
        pulls[i] += 1
        regret += BEST - ARMS[i]
        if t == T // 2 - 1:
            half_regret = regret
    # Oracle 1: conjugacy, exactly.
    for i in range(k):
        assert a[i] == 1 + succ[i] and b[i] == 1 + fail[i]
        n = succ[i] + fail[i]
        mean = a[i] / (a[i] + b[i])
        assert abs(mean - (succ[i] + 1) / (n + 2)) < 1e-12
    return regret, half_regret, pulls, a, b


def run_ucb1(rng):
    k = len(ARMS)
    n = [0] * k
    s = [0.0] * k
    regret = 0.0
    half_regret = 0.0
    for t in range(T):
        if t < k:
            i = t
        else:
            i = max(range(k), key=lambda j: s[j] / n[j] + math.sqrt(2 * math.log(t + 1) / n[j]))
        r = pull(rng, ARMS[i])
        n[i] += 1
        s[i] += r
        regret += BEST - ARMS[i]
        if t == T // 2 - 1:
            half_regret = regret
    return regret, half_regret, n


def run_eps(rng, eps):
    k = len(ARMS)
    n = [0] * k
    s = [0.0] * k
    regret = 0.0
    half_regret = 0.0
    for t in range(T):
        if t < k:
            i = t
        elif rng.random() < eps:
            i = rng.randrange(k)
        else:
            i = max(range(k), key=lambda j: s[j] / n[j])
        r = pull(rng, ARMS[i])
        n[i] += 1
        s[i] += r
        regret += BEST - ARMS[i]
        if t == T // 2 - 1:
            half_regret = regret
    return regret, half_regret, n


if __name__ == '__main__':
    rng = random.Random(SEED)

    ts_r = ts_h = ucb_r = ucb_h = eps_r = eps_h = gr_r = 0.0
    ts_best = 0
    greedy_stuck = 0
    coverage_hits = 0
    coverage_total = 0
    for run in range(RUNS):
        r, h, pulls, a, b = run_thompson(rng)
        ts_r += r
        ts_h += h
        if pulls.index(max(pulls)) == BEST_I:
            ts_best += 1
        # Oracle 2: calibration: central 95% posterior interval per arm
        # via 400 posterior draws; count coverage of the true rate.
        for i in range(len(ARMS)):
            draws = sorted(rng.betavariate(a[i], b[i]) for _ in range(400))
            lo, hi = draws[9], draws[389]  # ~2.5% and ~97.5%
            coverage_total += 1
            if lo <= ARMS[i] <= hi:
                coverage_hits += 1
        r, h, _ = run_ucb1(rng)
        ucb_r += r
        ucb_h += h
        r, h, _ = run_eps(rng, 0.10)
        eps_r += r
        eps_h += h
        r, _, n_g = run_eps(rng, 0.0)  # pure greedy
        gr_r += r
        if n_g.index(max(n_g)) != BEST_I:
            greedy_stuck += 1

    ts_r /= RUNS
    ts_h /= RUNS
    ucb_r /= RUNS
    ucb_h /= RUNS
    eps_r /= RUNS
    eps_h /= RUNS
    gr_r /= RUNS
    coverage = coverage_hits / coverage_total

    # Oracle 3: identification.
    assert ts_best >= 0.95 * RUNS, ts_best
    # Oracle 2 verdict: calibration in a sane Bayesian window.
    assert 0.88 <= coverage <= 0.995, coverage
    # Oracle 4: the race as MEASURED (the first draft assumed
    # UCB1 < epsilon-greedy here and the run said otherwise).
    assert ts_r < eps_r * 0.9, (ts_r, eps_r)   # thompson beats tuned epsilon
    assert ts_r < ucb_r * 0.7, (ts_r, ucb_r)   # and beats UCB1 clearly
    assert eps_r < ucb_r, (eps_r, ucb_r)       # the horizon twist, asserted as found
    assert gr_r > ts_r * 2.5, (gr_r, ts_r)     # the trap dwarfs the principled policies
    # Oracle 5: the asymptotic split via SECOND-HALF INCREMENTS
    # (raw half-ratios are polluted by early learning costs, which
    # a first draft of this oracle learned the hard way). Epsilon's
    # second-half regret has an analytic floor: eps x (T/2) x mean
    # gap = 0.1 x 5,000 x 0.05 = 25, paid forever; the posterior
    # policies' increments shrink as their curves bend.
    eps_inc = eps_r - eps_h
    ts_inc = ts_r - ts_h
    ucb_inc = ucb_r - ucb_h
    eps_floor = 0.10 * (T / 2) * (sum(BEST - m for m in ARMS) / len(ARMS))
    assert eps_floor * 0.8 < eps_inc < eps_floor * 2.4, (eps_inc, eps_floor)
    assert ts_inc < 0.6 * eps_inc, (ts_inc, eps_inc)   # the bend vs the floor
    assert ucb_inc < ucb_h, (ucb_inc, ucb_h)           # UCB1 bends too: its loss is the horizon, not the shape
    # Oracle 6: the trap.
    assert greedy_stuck > 0.25 * RUNS, greedy_stuck

    print(f'contest: 3 arms at payout rates {ARMS} (gaps of 0.05), T = 10,000 rounds, mean cumulative regret over {RUNS} independent runs')
    print(f"  {'policy':<26} {'mean regret':>12}")
    print(f"  {'greedy (no exploration)':<26} {gr_r:>12.1f}   the trap: stuck on a loser in {greedy_stuck}% of runs, forever")
    print(f"  {'UCB1':<26} {ucb_r:>12.1f}   the horizon twist: its conservative bonus OVER-explores here and loses to tuned epsilon")
    print(f"  {'epsilon-greedy (10%)':<26} {eps_r:>12.1f}   ahead of UCB1 today, linear forever: pays ~eps x gap x T without end")
    print(f"  {'thompson sampling':<26} {ts_r:>12.1f}   probability matching: uncertainty sets its own exploration rate: beats both")
    print(f"the asymptotic split, measured by second-half increments: epsilon paid {eps_inc:.0f} more (its analytic floor: eps x T/2 x mean gap = {eps_floor:.0f}, owed forever); thompson paid {ts_inc:.0f} (bending hard); ucb1 paid {ucb_inc:.0f}: bending, but at 0.05 gaps its logarithm is expensive and the crossover below epsilon sits far past this horizon")
    print(f"the posterior, audited: Beta(a,b) == (1+successes, 1+failures) exactly on every arm of every run; the true rate sat inside the central 95% interval {coverage:.1%} of the time")
    print(f"identification: thompson's most-pulled arm was the true best in {ts_best}/{RUNS} runs")
    print(f'OK: conjugacy exact, calibration {coverage:.1%} inside [88%, 99.5%], identification {ts_best}/{RUNS}, '
          f'race as measured: greedy {gr_r:.0f} and ucb1 {ucb_r:.0f} above eps {eps_r:.0f} above thompson {ts_r:.0f} '
          f'(the first draft assumed ucb1 < eps and the run corrected it), '
          f'second-half increments eps {eps_inc:.0f} (floor {eps_floor:.0f}) vs thompson {ts_inc:.0f}, and the greedy trap counted ({greedy_stuck}% stuck)')
