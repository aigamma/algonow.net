# Puzzle 134: Grover's search x amplitude amplification
# Unstructured search: N items, one or a few of them marked, and the
# only tool is an oracle that answers "is this one marked?" Any
# classical strategy needs about N/2 oracle calls on average to find a
# single marked item. Grover's algorithm is the quantum method: put a
# register into an equal superposition over all N items, and repeat a
# two-step iteration about (pi/4) sqrt(N) times: the oracle flips the
# sign of the marked amplitudes, and the diffusion operator reflects
# every amplitude about the mean. The heuristic is amplitude
# amplification, the geometric reading of that iteration: each round
# rotates the state by a fixed angle 2 theta toward the marked
# subspace, where sin theta = sqrt(k / N), so the marked probability
# climbs as sin^2 of the accumulated angle, peaks near 1 after the
# right number of rounds, and falls again if you keep going.
#
# The state vector is simulated exactly (real amplitudes suffice).
#
# Referees:
# (1) THE CLOSED FORM: after t rounds the marked probability must
#     equal sin^2((2t + 1) theta) to 1e-12, at every t, for N = 4,096
#     with k = 1 and k = 4;
# (2) THE OPTIMAL ROUND COUNT: t* = round(pi / (4 theta) - 1/2) gives
#     success probability above 0.999 for k = 1 (t* = 50 oracle calls
#     against a classical expectation of 2,048.5 for a random scan of
#     4,096 items, measured empirically), and the square-root law:
#     t* grows by about sqrt 2 per doubling of N from 256 to 16,384;
# (3) OVERSHOOT, measured: at 2 t* the success probability has fallen
#     to near zero, and at 3 t* it is back near 1;
# (4) THE WRONG k: running the k = 1 schedule on k = 4 marked items
#     lands at a measured low probability; the Boyer-Brassard-Hoyer-
#     Tapp schedule (random round counts under a growing cap) finds a
#     marked item within O(sqrt(N / k)) expected oracle calls without
#     knowing k, measured over 2,000 sampled runs;
# (5) THE ABLATION: the oracle without the diffusion step leaves the
#     marked probability at k / N forever (a sign flip is invisible to
#     measurement), and the diffusion without the oracle does nothing
#     at all (the uniform state is its fixed point), each checked
#     exactly.
import math
import random

SEED = 20260926


def uniform(N):
    a = 1.0 / math.sqrt(N)
    return [a] * N


def oracle(state, marked):
    for i in marked:
        state[i] = -state[i]


def diffusion(state):
    mean = sum(state) / len(state)
    for i in range(len(state)):
        state[i] = 2 * mean - state[i]


def marked_probability(state, marked):
    return sum(state[i] * state[i] for i in marked)


def grover(N, marked, rounds):
    state = uniform(N)
    trace = [marked_probability(state, marked)]
    for _ in range(rounds):
        oracle(state, marked)
        diffusion(state)
        trace.append(marked_probability(state, marked))
    return state, trace


def theta_of(N, k):
    return math.asin(math.sqrt(k / N))


def optimal_rounds(N, k):
    return int(round(math.pi / (4 * theta_of(N, k)) - 0.5))


def measure(state, rng):
    r = rng.random()
    acc = 0.0
    for i, a in enumerate(state):
        acc += a * a
        if acc >= r:
            return i
    return len(state) - 1


def bbht(N, marked, rng, lam=6 / 5):
    """Boyer, Brassard, Hoyer, Tapp 1998: unknown number of marked
    items. Pick rounds uniformly below a cap m, run, measure, check
    with one more oracle call; grow m by lambda on failure. Returns the
    total oracle calls to the first confirmed hit."""
    m = 1.0
    calls = 0
    while True:
        j = rng.randrange(int(m)) if int(m) > 1 else 0
        state, _ = grover(N, marked, j)
        calls += j
        i = measure(state, rng)
        calls += 1                                 # the classical check of the measured item
        if i in marked:
            return calls
        m = min(lam * m, math.sqrt(N))


if __name__ == '__main__':
    rng = random.Random(SEED)
    N = 4096

    # Oracle 1: the closed form, every round, for k = 1 and k = 4.
    worst = 0.0
    for k in (1, 4):
        marked = set(rng.sample(range(N), k))
        th = theta_of(N, k)
        _, trace = grover(N, marked, 120)
        for t, p in enumerate(trace):
            worst = max(worst, abs(p - math.sin((2 * t + 1) * th) ** 2))
    assert worst < 1e-12, worst

    # Oracle 2: the optimal round count and the square-root law.
    marked1 = {rng.randrange(N)}
    t1 = optimal_rounds(N, 1)
    state1, trace1 = grover(N, marked1, t1)
    p1 = trace1[-1]
    assert t1 == 50 and p1 > 0.999, (t1, p1)
    hits = sum(measure(state1, rng) in marked1 for _ in range(2000))
    assert hits > 1980, hits
    # classical: expected queries of a random-order scan, measured
    scans = []
    for _ in range(2000):
        pass
        pos = rng.randrange(N)                      # the target's position in a random order
        scans.append(pos + 1)
    classical_mean = sum(scans) / len(scans)
    assert abs(classical_mean - (N + 1) / 2) < 120, classical_mean   # 2,000 samples of a uniform position: standard error about 26
    law = []
    for n_bits in range(8, 15):
        law.append((2 ** n_bits, optimal_rounds(2 ** n_bits, 1)))
    ratios = [law[i + 1][1] / law[i][1] for i in range(len(law) - 1)]
    assert all(1.3 < r < 1.5 for r in ratios), ratios

    # Oracle 3: overshoot.
    _, trace_long = grover(N, marked1, 3 * t1 + 2)
    p_2t = trace_long[2 * t1 + 1]
    p_3t = trace_long[3 * t1 + 1]
    assert p_2t < 0.01 and p_3t > 0.99, (p_2t, p_3t)

    # Oracle 4: the wrong k, and BBHT.
    marked4 = set(rng.sample(range(N), 4))
    t4 = optimal_rounds(N, 4)
    _, trace4 = grover(N, marked4, t1)
    p_wrong = trace4[t1]
    _, trace4b = grover(N, marked4, t4)
    p_right = trace4b[t4]
    assert p_right > 0.999 and p_wrong < 0.5, (p_right, p_wrong)
    bb_calls = [bbht(N, marked4, rng) for _ in range(2000)]
    bb_mean = sum(bb_calls) / len(bb_calls)
    assert bb_mean < 4 * math.sqrt(N / 4), bb_mean

    # Oracle 5: the ablations.
    s = uniform(N)
    for _ in range(50):
        oracle(s, marked1)
    assert abs(marked_probability(s, marked1) - 1 / N) < 1e-15
    s = uniform(N)
    for _ in range(50):
        diffusion(s)
    assert max(abs(v - 1 / math.sqrt(N)) for v in s) < 1e-12

    print(f'contest: unstructured search over N = {N:,} items; referee: the closed form sin^2((2t + 1) theta), sin theta = sqrt(k / N), checked at every round to {worst:.0e}')
    print(f"  {'method':<40} {'oracle calls':>12} {'success':>9}   verdict")
    print(f"  {'classical random scan, k = 1':<40} {classical_mean:>12,.1f} {'1.000':>9}   expected (N + 1) / 2, measured over 2,000 orders")
    print(f"  {'Grover, k = 1, t* = 50 rounds':<40} {t1:>12} {p1:>9.4f}   {hits} of 2,000 measurements hit the marked item")
    print(f"  {'Grover, k = 1, 2 t* rounds (overshoot)':<40} {2 * t1:>12} {p_2t:>9.4f}   past the peak the amplitude rotates away again")
    print(f"  {'Grover, k = 4, t* = ' + str(t4) + ' rounds':<40} {t4:>12} {p_right:>9.4f}   four targets: half the rounds")
    print(f"  {'Grover, k = 4 with the k = 1 schedule':<40} {t1:>12} {p_wrong:>9.4f}   the wrong round count overshoots")
    print(f"  {'BBHT, k unknown (2,000 runs)':<40} {bb_mean:>12.1f} {'1.000':>9}   random round counts under a growing cap; sqrt(N/k) = {math.sqrt(N / 4):.0f}")
    print(f'square-root law, t* for N = 256 ... 16,384: {[t for _, t in law]} (ratios {", ".join(f"{r:.2f}" for r in ratios)}; sqrt 2 = 1.41)')
    print(f'ablations: 50 oracle calls without diffusion leave the marked probability at 1/N = {1 / N:.2e}; 50 diffusions without the oracle leave the uniform state unchanged')
    print(f'OK: Grover matched the closed form to {worst:.0e} at every round, found 1 of 4,096 in {t1} oracle calls with probability {p1:.4f} against a classical {classical_mean:,.0f}; '
          f'overshoot at 2t* {p_2t:.4f}; k = 4 in {t4} rounds {p_right:.4f} vs the wrong schedule {p_wrong:.3f}; BBHT {bb_mean:.1f} calls unknown k; t* grew x{ratios[0]:.2f} per doubling')
