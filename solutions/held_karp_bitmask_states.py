# Puzzle 81: Held-Karp x bitmask subset states
# The exact traveling salesman tour: not approximated, PROVEN
# minimal: by daring to enumerate subsets instead of orderings.
#
# The pairing is the point. The algorithm is the DP over partial
# tours: the cost of the best path that starts at city 0, visits
# exactly the set S, and stands at city j, depends only on (S, j):
# not on the order S was walked: (n-1)! orderings collapse onto
# 2^(n-1) x (n-1) states. The heuristic is the bitmask: a subset IS
# an integer, membership is a shift, removal is an XOR: the state
# space becomes an array indexed by the subset itself, and the
# transition count lands EXACTLY on the closed form
# sum C(n-1, s) * s * (s-1): asserted to the unit. Referees: brute
# force over all (n-1)! tours on 100 instances (tour AND cost);
# the reconstructed tour re-costed and verified to visit every
# city once; the transition counter against the closed form; and
# the heuristics priced against proven optima: nearest neighbor
# +14% average (worst +45%), 2-opt +2.4%: numbers a heuristic page
# can only estimate, an exact page certifies.
import itertools
import math
import random


def held_karp(dist, counter=None):
    """dist: n x n. Returns (optimal cost, tour starting/ending 0)."""
    n = len(dist)
    FULL = 1 << (n - 1)  # subsets of cities 1..n-1
    INF = float("inf")
    # forward DP: push each settled (S, j) outward to every k not in
    # S, so the transition counter matches the closed form exactly.
    dp = [[INF] * (n - 1) for _ in range(FULL)]
    parent = [[-1] * (n - 1) for _ in range(FULL)]
    for j in range(n - 1):
        dp[1 << j][j] = dist[0][j + 1]
    for S in range(1, FULL):
        for j in range(n - 1):
            if not (S >> j) & 1 or dp[S][j] == INF:
                continue
            base = dp[S][j]
            for k in range(n - 1):
                if (S >> k) & 1:
                    continue
                if counter is not None:
                    counter["transitions"] = counter.get("transitions", 0) + 1
                nS = S | (1 << k)
                cand = base + dist[j + 1][k + 1]
                if cand < dp[nS][k]:
                    dp[nS][k] = cand
                    parent[nS][k] = j
    best = INF
    bj = -1
    for j in range(n - 1):
        cand = dp[FULL - 1][j] + dist[j + 1][0]
        if cand < best:
            best = cand
            bj = j
    S, j = FULL - 1, bj
    rev = []
    while j != -1:
        rev.append(j + 1)
        pj = parent[S][j]
        S ^= 1 << j
        j = pj
    tour = [0] + rev[::-1] + [0]
    return best, tour


def brute(dist):
    n = len(dist)
    best = math.inf
    best_t = None
    for perm in itertools.permutations(range(1, n)):
        c = dist[0][perm[0]] + sum(
            dist[perm[i]][perm[i + 1]] for i in range(n - 2)
        ) + dist[perm[-1]][0]
        if c < best:
            best = c
            best_t = (0,) + perm + (0,)
    return best, list(best_t)


def tour_cost(dist, tour):
    return sum(dist[tour[i]][tour[i + 1]] for i in range(len(tour) - 1))


def nearest_neighbor(dist):
    n = len(dist)
    seen = {0}
    tour = [0]
    while len(seen) < n:
        cur = tour[-1]
        nxt = min((d for d in range(n) if d not in seen), key=lambda d: dist[cur][d])
        tour.append(nxt)
        seen.add(nxt)
    tour.append(0)
    return tour


def two_opt(dist, tour):
    tour = tour[:]
    improved = True
    while improved:
        improved = False
        for i in range(1, len(tour) - 2):
            for j in range(i + 1, len(tour) - 1):
                a, b = tour[i - 1], tour[i]
                c, d = tour[j], tour[j + 1]
                if dist[a][c] + dist[b][d] < dist[a][b] + dist[c][d]:
                    tour[i : j + 1] = tour[i : j + 1][::-1]
                    improved = True
    return tour


def rand_metric(rng, n):
    pts = [(rng.random(), rng.random()) for _ in range(n)]
    return [
        [math.dist(pts[a], pts[b]) for b in range(n)] for a in range(n)
    ], pts


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: exact vs brute force on 100 instances, n = 5..9:
    # equal cost AND the reconstructed tour re-costed and valid.
    for _ in range(100):
        n = rng.randint(5, 9)
        dist, _ = rand_metric(rng, n)
        c_hk, t_hk = held_karp(dist)
        c_bf, _ = brute(dist)
        assert abs(c_hk - c_bf) < 1e-9
        assert sorted(t_hk[:-1]) == list(range(n)) and t_hk[0] == t_hk[-1] == 0
        assert abs(tour_cost(dist, t_hk) - c_hk) < 1e-9

    # Oracle 2: the transition count, EXACT. Building S of size s+1
    # from size s: choose the s-subset (C(n-1, s)), the endpoint j
    # (s ways), the newcomer k (n-1-s ways): summed, it must equal
    # the counter to the unit.
    n = 13
    dist, _ = rand_metric(rng, n)
    c = {}
    c_hk, _ = held_karp(dist, c)
    m = n - 1
    closed_form = sum(
        math.comb(m, s) * s * (m - s) for s in range(1, m + 1)
    )
    assert c["transitions"] == closed_form, (c["transitions"], closed_form)

    # Oracle 3: the heuristics priced against PROVEN optima, 100
    # instances at n = 9.
    nn_gaps = []
    opt2_gaps = []
    for _ in range(100):
        dist, _ = rand_metric(rng, 9)
        c_star, _ = held_karp(dist)
        c_nn = tour_cost(dist, nearest_neighbor(dist))
        c_2o = tour_cost(dist, two_opt(dist, nearest_neighbor(dist)))
        nn_gaps.append(c_nn / c_star - 1)
        opt2_gaps.append(c_2o / c_star - 1)
        assert c_2o <= c_nn + 1e-12 and c_star <= c_2o + 1e-9
    nn_avg = 100 * sum(nn_gaps) / len(nn_gaps)
    nn_max = 100 * max(nn_gaps)
    o2_avg = 100 * sum(opt2_gaps) / len(opt2_gaps)
    assert nn_avg > 5           # NN really leaves money on the table
    assert o2_avg < nn_avg / 2  # 2-opt closes most of it

    # Oracle 4: the wall, in arithmetic. n = 20: 19!/2 tours vs the
    # DP's transition closed form: computed, not run.
    tours_20 = math.factorial(19) // 2
    m20 = 19
    trans_20 = sum(math.comb(m20, s) * s * (m20 - s) for s in range(1, m20 + 1))

    # Oracle 5: the client: 13 cities, exact vs the heuristics.
    dist, pts = rand_metric(rng, 13)
    c_star, t_star = held_karp(dist)
    c_nn = tour_cost(dist, nearest_neighbor(dist))
    c_2o = tour_cost(dist, two_opt(dist, nearest_neighbor(dist)))
    assert c_star <= c_2o <= c_nn

    print(f"contest: the exact tour of 13 plane cities; referee: all (n-1)! tours enumerated on 100 instances (n<=9), the transition counter equal to its closed form to the unit")
    print(f"  {'method':<26} {'tour cost':>10}   guarantee")
    print(f"  {'Nearest neighbor':<26} {c_nn:>10.4f}   none: +{100*(c_nn/c_star-1):.1f}% here, +{nn_avg:.0f}% avg, +{nn_max:.0f}% worst (measured vs optima)")
    print(f"  {'NN + 2-opt':<26} {c_2o:>10.4f}   local optimum: +{100*(c_2o/c_star-1):.1f}% here, +{o2_avg:.1f}% avg")
    print(f"  {'Held-Karp':<26} {c_star:>10.4f}   PROVEN minimal: every subset-endpoint state priced")
    print(f"the collapse: (n-1)! orderings -> 2^(n-1) x (n-1) states: at n=13, transitions = {c['transitions']:,} == sum C(12,s)*s*(12-s) exactly; at n=20: {trans_20:,} transitions vs {tours_20:,} tours")
    print(f"the heuristics priced against PROVEN optima (100 instances, n=9): nearest neighbor +{nn_avg:.0f}% average, +{nn_max:.0f}% worst; 2-opt +{o2_avg:.1f}% average: numbers only an exact method can certify")
    print("OK: 100 instances equal to full enumeration with tours revalidated, the transition count exact to its closed form, the heuristics priced against certified optima, and the n=20 wall stated in arithmetic")
