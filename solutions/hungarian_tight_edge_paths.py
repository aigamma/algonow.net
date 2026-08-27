# Puzzle 72: Hungarian algorithm x tight-edge alternating paths
# Assign n workers to n jobs at minimum total cost: exactly, in
# O(n^3), with a certificate of optimality attached to the answer.
#
# The pairing is the point. The algorithm is the primal-dual frame:
# maintain potentials u[i], v[j] with u+v never exceeding any cost
# (dual feasibility), and only ever match along TIGHT edges, where
# u[i]+v[j] equals c[i][j] exactly. The heuristic is the tight-edge
# alternating path: grow an alternating tree from an unmatched row
# using tight edges only; when the tree is stuck, raise the tree's
# row potentials and lower its column potentials by the minimum
# slack: no feasible edge breaks, at least one new edge goes tight,
# and the tree grows until an augmenting path completes. One row at
# a time, n times, and the LP duality theorem rides along: at the
# end, sum(u) + sum(v) equals the assignment's cost, which no
# feasible assignment can beat. Referees: exhaustive permutation
# search on 150 small instances; the FULL duality certificate
# (feasibility everywhere, tightness on matched edges, totals equal)
# asserted on every instance including n = 150; and the greedy trap
# measured: 4,004 against the optimal 12.
import itertools
import random


def hungarian(cost, counter=None):
    """Minimum-cost perfect assignment (e-maxx potentials form).
    Returns (total, match) where match[i] = column of row i."""
    n = len(cost)
    INF = float("inf")
    u = [0] * (n + 1)
    v = [0] * (n + 1)
    p = [0] * (n + 1)      # p[j]: row matched to column j (1-based)
    way = [0] * (n + 1)
    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [INF] * (n + 1)
        used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = INF
            j1 = -1
            row = cost[i0 - 1]
            for j in range(1, n + 1):
                if not used[j]:
                    cur = row[j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j] = cur
                        way[j] = j0
                    if minv[j] < delta:
                        delta = minv[j]
                        j1 = j
            if counter is not None:
                counter["dual_updates"] = counter.get("dual_updates", 0) + 1
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while j0:  # unroll the alternating path
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
    match = [0] * n
    for j in range(1, n + 1):
        match[p[j] - 1] = j - 1
    total = sum(cost[i][match[i]] for i in range(n))
    return total, match, u, v


def certify(cost, total, match, u, v):
    """The LP duality certificate, checked directly: u[i]+v[j] never
    exceeds c[i][j]; matched edges are tight; the dual objective
    equals the primal cost. Together these PROVE optimality."""
    n = len(cost)
    for i in range(1, n + 1):
        for j in range(1, n + 1):
            assert u[i] + v[j] <= cost[i - 1][j - 1], (i, j)
    for i in range(n):
        j = match[i]
        assert u[i + 1] + v[j + 1] == cost[i][j]
    assert sum(u[1:]) + sum(v[1:]) == total
    assert sorted(match) == list(range(n))  # a perfect assignment


def greedy(cost):
    n = len(cost)
    taken = [False] * n
    total = 0
    for i in range(n):
        best = min(
            (c, j) for j, c in enumerate(cost[i]) if not taken[j]
        )
        total += best[0]
        taken[best[1]] = True
    return total


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: exhaustive truth. 150 random matrices, n = 2..7:
    # the answer equals the minimum over all n! permutations, and
    # the certificate holds on every one.
    for _ in range(150):
        n = rng.randint(2, 7)
        cost = [[rng.randint(0, 50) for _ in range(n)] for _ in range(n)]
        total, match, u, v = hungarian(cost)
        brute = min(
            sum(cost[i][perm[i]] for i in range(n))
            for perm in itertools.permutations(range(n))
        )
        assert total == brute, (cost, total, brute)
        certify(cost, total, match, u, v)

    # Oracle 2: the greedy trap, exact. Four 2x2 blocks of
    # [[1, 2], [1, 1000]] on a 10^6 off-block background: greedy
    # takes each block's shared cheap column first and pays the
    # 1,000 four times; the optimum pays 3 per block.
    M = 10**6
    n = 8
    trap = [[M] * n for _ in range(n)]
    for b in range(4):
        r, c = 2 * b, 2 * b
        trap[r][c] = 1
        trap[r][c + 1] = 2
        trap[r + 1][c] = 1
        trap[r + 1][c + 1] = 1000
    g = greedy(trap)
    total, match, u, v = hungarian(trap)
    certify(trap, total, match, u, v)
    assert total == 12 and g == 4_004
    assert g / total > 300

    # Oracle 3: scale with certificate, and the greedy gap on honest
    # random costs. n = 150, uniform costs 0..999.
    n = 150
    cost = [[rng.randint(0, 999) for _ in range(n)] for _ in range(n)]
    c_h = {}
    total, match, u, v = hungarian(cost, c_h)
    certify(cost, total, match, u, v)
    g = greedy(cost)
    gap = (g - total) / total
    assert gap > 0.05  # greedy leaves real money on the table
    # The work bound: one dual update per tree layer, at most n per
    # row: n^2 overall, each costing O(n): the O(n^3) promise.
    assert c_h["dual_updates"] <= n * n

    print(f"contest: assign 150 workers to 150 jobs, uniform costs 0..999; referee: all n! permutations on 150 small instances, then the LP duality certificate at every size")
    print(f"  {'method':<26} {'total cost':>10}   guarantee")
    print(f"  {'Greedy (cheapest left)':<26} {g:>10,}   none: {100*gap:.0f}% over optimal here, 334x on the trap")
    print(f"  {'Hungarian':<26} {total:>10,}   optimal, with sum(u)+sum(v) = {sum(u[1:]) + sum(v[1:]):,} as the proof")
    print(f"the trap, exact: four [[1,2],[1,1000]] blocks: greedy 4,004 vs optimal 12: each block's shared cheap column steals the next row's only exit")
    print(f"the machinery: {c_h['dual_updates']:,} dual updates for n = {n} (bound n^2 = {n*n:,}): each raises the stuck tree's rows and lowers its columns by the minimum slack: no feasible edge breaks, one goes tight")
    print(f"the certificate, asserted everywhere: u[i]+v[j] <= c[i][j] on all {n*n:,} pairs, matched edges tight, and the dual total equal to the primal cost: optimality PROVEN, not argued")
    print("OK: 150 instances equal to exhaustive permutation search, the duality certificate on every instance including scale, the greedy trap at 334x, the random-cost greedy gap measured, and the dual-update count inside its bound")
