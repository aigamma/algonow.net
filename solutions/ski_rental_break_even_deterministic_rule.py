# Puzzle 186: Ski rental x Break-even deterministic rule
# Rent-or-buy decisions: every day you ski you may rent for 1 or buy once
# for B and never pay again, and you do not know how many days the season
# will last. The algorithm is the online rent-or-buy framework (Karlin,
# Manasse, Rudolph, and Sleator 1988): decide each day with no knowledge
# of the future and judge the decision by its COMPETITIVE RATIO, the
# worst case over every possible season length of your cost divided by
# the cost of someone who knew the length in advance (min(T, B)). The
# heuristic is the break-even rule: rent until the rent paid would equal
# the purchase, then buy, which here means rent for B - 1 days and buy on
# day B. Its ratio is exactly 2 - 1/B, and no deterministic rule does
# better: whatever threshold you pick, the adversary ends the season the
# day you buy.
#
# Referees (exact rational arithmetic throughout):
# (1) THE RATIO BY ENUMERATION: for B in {2, 3, 5, 10, 20, 50, 100}, every
#     buy-day threshold k in 1..3B is scored against every season length
#     T in 1..3B (plus the long-season limit); the worst ratio of the
#     break-even threshold k = B equals 2 - 1/B exactly, and every other
#     threshold is strictly worse: k < B gives 1 + (B - 1)/k, k > B gives
#     (k - 1 + B)/B, and both neighbours k = B - 1 and k = B + 1 give 2;
# (2) THE RANDOMIZED RIVAL: the Karlin-Manasse-McGeoch-Owicki distribution
#     over buy days achieves the worst-case EXPECTED ratio
#     1 / (1 - (1 - 1/B)^B) exactly (tending to e / (e - 1) = 1.582), the
#     adversary's best response leaves every season length in 1..B
#     equally bad (the equalizing property), and a Monte Carlo of the
#     randomized rule lands within standard error of the exact expectation;
# (3) THE STOCHASTIC CASE: when the season length has a known distribution
#     (geometric, and a two-point mixture), the Bayes-optimal threshold is
#     found by enumeration; the break-even rule's expected cost is measured
#     against it, and against the worst-case-optimal randomized rule, to
#     show what the adversarial guarantee costs on average;
# (4) THE NEGATIVE EXAMPLES, measured: buy on day one (ratio B when the
#     season is one day), never buy (ratio T / B, unbounded), and a late
#     threshold of 2B (ratio 3 - 1/B).
#
# AUTHOR CORRECTIONS: (a) the draft asserted the randomized rule beats the
# break-even rule in expectation on EVERY season-length distribution. The
# geometric case with a short mean refutes it: there the Bayes optimum never
# buys, the break-even rule loses modestly, and the randomized rule, built
# for the adversary, buys too eagerly and loses more. The page reports the
# measured split. (b) The draft wrote the late-threshold ratio as 4 - 1/B
# and the early thresholds as a flat 2; the enumeration returned 3 - 1/B
# and 1 + (B - 1)/k, and the formulas above are the measured ones.
from fractions import Fraction
import math
import random

SEED = 20261010


def cost_threshold(k, T, B):
    """Rent on days 1..k-1, buy at the start of day k, if the season lasts."""
    if T < k:
        return Fraction(T)
    return Fraction(k - 1 + B)


def opt(T, B):
    return Fraction(min(T, B))


def worst_ratio(k, B, horizon):
    worst = Fraction(0)
    worst_T = None
    for T in range(1, horizon + 1):
        r = cost_threshold(k, T, B) / opt(T, B)
        if r > worst:
            worst, worst_T = r, T
    return worst, worst_T


def kmmo_distribution(B):
    """Buy on day k (k = 1..B) with probability proportional to
    ((B - 1) / B)^(B - k); Karlin, Manasse, McGeoch, Owicki 1994."""
    q = Fraction(B - 1, B)
    weights = [q ** (B - k) for k in range(1, B + 1)]
    total = sum(weights)
    return [w / total for w in weights]


def expected_ratio_randomized(B, horizon):
    p = kmmo_distribution(B)
    ratios = []
    for T in range(1, horizon + 1):
        exp_cost = sum(p[k - 1] * cost_threshold(k, T, B) for k in range(1, B + 1))
        ratios.append(exp_cost / opt(T, B))
    return ratios


def expected_cost(k, dist, B):
    return sum(prob * cost_threshold(k, T, B) for T, prob in dist.items())


def expected_cost_randomized(dist, B):
    p = kmmo_distribution(B)
    return sum(prob * sum(p[k - 1] * cost_threshold(k, T, B) for k in range(1, B + 1)) for T, prob in dist.items())


def geometric_dist(mean, horizon):
    """Season length T >= 1 geometric with the given mean, truncated to the
    horizon (the remaining mass is placed on the horizon)."""
    q = Fraction(1, mean)  # stop probability per day
    dist = {}
    remaining = Fraction(1)
    for T in range(1, horizon):
        pt = remaining * q
        dist[T] = pt
        remaining -= pt
    dist[horizon] = remaining
    return dist


def main():
    rng = random.Random(SEED)

    # Oracle 1: the ratio by enumeration, several B.
    table = {}
    for B in (2, 3, 5, 10, 20, 50, 100):
        horizon = 3 * B
        ratios = {k: worst_ratio(k, B, horizon) for k in range(1, horizon + 1)}
        best_k = min(ratios, key=lambda k: (ratios[k][0], k))
        assert best_k == B, (B, best_k)
        assert ratios[B][0] == 2 - Fraction(1, B), (B, ratios[B])
        for k in range(1, horizon + 1):
            if k != B:
                assert ratios[k][0] > ratios[B][0], (B, k, ratios[k])
        # k < B: the season ends the day you buy, cost k - 1 + B against OPT = k;
        # k > B: the season outlasts you, cost k - 1 + B against OPT = B
        assert ratios[1][0] == Fraction(B)
        assert all(ratios[k] == (1 + Fraction(B - 1, k), k) for k in range(1, B))
        assert all(ratios[k] == (Fraction(k - 1 + B, B), k) for k in range(B + 1, horizon + 1))
        assert ratios[B - 1][0] == 2 and ratios[B + 1][0] == 2
        assert ratios[2 * B][0] == 3 - Fraction(1, B)
        table[B] = ratios

    # Oracle 2: the randomized rule.
    randomized = {}
    for B in (2, 5, 10, 100):
        horizon = 3 * B
        ratios = expected_ratio_randomized(B, horizon)
        worst = max(ratios)
        formula = 1 / (1 - (1 - Fraction(1, B)) ** B)
        assert worst == formula, (B, worst, formula)
        # equalized: every season length, short or long, sees the same expected ratio
        assert all(r == worst for r in ratios), 'the adversary is not equalized'
        assert worst < 2 - Fraction(1, B)
        randomized[B] = (worst, formula)
    limit = math.e / (math.e - 1)
    assert abs(float(randomized[100][0]) - limit) < 0.006
    # Monte Carlo: sample the buy day, score against each adversary T in 1..B
    B = 10
    p_exact = kmmo_distribution(B)
    p = [float(x) for x in p_exact]
    cum = []
    acc = 0.0
    for x in p:
        acc += x
        cum.append(acc)
    trials = 20000
    mc_worst = 0.0
    mc_se_worst = 0.0
    for T in (1, 5, 10):
        costs = []
        for _ in range(trials):
            r = rng.random()
            k = next(i + 1 for i, c in enumerate(cum) if r <= c)
            costs.append(float(cost_threshold(k, T, B)))
        mean = sum(costs) / trials
        var = sum((c - mean) ** 2 for c in costs) / (trials - 1)
        se = math.sqrt(var / trials)
        exact = float(sum(p_exact[k - 1] * cost_threshold(k, T, B) for k in range(1, B + 1)))
        assert abs(mean - exact) < 4 * se + 1e-9, (T, mean, exact, se)
        mc_worst = max(mc_worst, mean / min(T, B))
        mc_se_worst = max(mc_se_worst, se / min(T, B))

    # Oracle 3: the stochastic case.
    B = 10
    horizon = 200
    stochastic = {}
    for name, dist in (('geometric, mean 5', geometric_dist(5, horizon)), ('geometric, mean 20', geometric_dist(20, horizon)),
                       ('half the seasons last 3 days, half last 40', {3: Fraction(1, 2), 40: Fraction(1, 2)})):
        assert sum(dist.values()) == 1
        costs = {k: expected_cost(k, dist, B) for k in range(1, horizon + 2)}
        best_k = min(costs, key=lambda k: (costs[k], k))
        stochastic[name] = {
            'bayes_k': best_k, 'bayes': costs[best_k], 'break_even': costs[B], 'randomized': expected_cost_randomized(dist, B),
            'buy_day_one': costs[1], 'never': costs[horizon + 1], 'exp_opt': sum(prob * opt(T, B) for T, prob in dist.items()),
        }
    s5 = stochastic['geometric, mean 5']
    s20 = stochastic['geometric, mean 20']
    smix = stochastic['half the seasons last 3 days, half last 40']
    # memoryless seasons: the Bayes rule never buys when the mean stay is under B and buys at once when it is over B
    assert s5['bayes_k'] == horizon + 1 and s20['bayes_k'] == 1, (s5['bayes_k'], s20['bayes_k'])
    assert s5['break_even'] < s5['randomized'], 'author correction (a): break-even beats randomized here'
    assert s20['randomized'] < s20['break_even'], 'and loses to it here'
    assert s20['bayes'] <= s20['break_even'] and s20['bayes'] <= s20['randomized']
    assert smix['bayes_k'] == 4 and smix['bayes'] == 8 and smix['break_even'] == 11, smix

    # Oracle 4: the negative examples at B = 10, from the enumeration table.
    B = 10
    buy_day_one = table[B][1]
    late = table[B][2 * B]
    never_ratio_3B = Fraction(3 * B, B)  # rent for the whole 3B-day season against OPT = B
    assert buy_day_one[0] == B and late[0] == 3 - Fraction(1, B) and never_ratio_3B == 3

    print('contest: rent 1 a day or buy for B, season length unknown; referee: exact rational enumeration of every threshold against every season length (competitive ratio = online cost / min(T, B)), plus the Bayes-optimal threshold when the season length has a known distribution')
    print(f'{"B":>4} {"break-even k = B":>18} {"2 - 1/B":>9} {"k = B - 1":>10} {"k = B + 1":>10} {"k = 2B":>8} {"k = 1":>6} {"randomized":>11}')
    for B in (2, 3, 5, 10, 20, 50, 100):
        r = table[B]
        rnd = f'{float(randomized[B][0]):.4f}' if B in randomized else ''
        print(f'{B:>4} {float(r[B][0]):>18.4f} {float(2 - Fraction(1, B)):>9.4f} {float(r[B - 1][0]) if B > 1 else 0:>10.4f} {float(r[B + 1][0]):>10.4f} {float(r[2 * B][0]):>8.4f} {float(r[1][0]):>6.1f} {rnd:>11}')
    print(f'randomized rule, worst expected ratio: exactly 1 / (1 - (1 - 1/B)^B): B = 10 gives {float(randomized[10][0]):.4f}, B = 100 gives {float(randomized[100][0]):.4f}, the limit e / (e - 1) = {limit:.4f}; every season length equally bad (equalized); Monte Carlo at B = 10 agrees within standard error (worst sampled ratio {mc_worst:.3f} +/- {mc_se_worst:.3f})')
    for name, s in stochastic.items():
        print(f'season {name}: Bayes-optimal buy day {s["bayes_k"]} with expected cost {float(s["bayes"]):.3f}; break-even (day 10) {float(s["break_even"]):.3f}; randomized {float(s["randomized"]):.3f}; buy day one {float(s["buy_day_one"]):.3f}; never buy {float(s["never"]):.3f}; clairvoyant {float(s["exp_opt"]):.3f}')
    print(f'negative examples at B = 10: buy on day one ratio {float(buy_day_one[0]):.0f} (a one-day season); never buy ratio {float(never_ratio_3B):.0f} at a 30-day season and growing without bound; threshold 2B ratio {float(late[0]):.2f}')
    print(f'OK: the break-even threshold k = B has worst-case ratio exactly 2 - 1/B for B = 2 to 100 and every other threshold is strictly worse (neighbours 2, day one B, threshold 2B gives 3 - 1/B); the randomized rule reaches exactly 1 / (1 - (1 - 1/B)^B) ({float(randomized[100][0]):.4f} at B = 100, limit {limit:.4f}) with every season length equalized and a Monte Carlo within standard error; '
          f'with a known season distribution the Bayes threshold wins (geometric mean 20: {float(s20["bayes"]):.2f} against break-even {float(s20["break_even"]):.2f} and randomized {float(s20["randomized"]):.2f}), and the author correction stands (geometric mean 5: break-even {float(s5["break_even"]):.2f} beats randomized {float(s5["randomized"]):.2f})')


if __name__ == '__main__':
    main()
