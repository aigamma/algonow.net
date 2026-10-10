# Puzzle 188: 2-opt x Edge-uncrossing swaps
# Tour improvement: given any tour through n points in the plane, make it
# shorter, over and over, until no small change helps. The algorithm is
# local search over tours (a neighborhood of small edits, apply an improving
# edit, repeat until none exists, which is a local optimum). The heuristic
# is the 2-opt move (Croes 1958): remove two edges (a, b) and (c, d) and
# reconnect as (a, c) and (b, d), which reverses the segment between them.
# In the plane that is exactly the move that uncrosses two crossing edges,
# and the triangle inequality says uncrossing always shortens, so a 2-opt
# local optimum has no crossings at all. One candidate costs four distance
# lookups; a pass over all pairs is O(n^2); neighbor lists (Johnson and
# McGeoch 1997) cut a pass to O(n k).
#
# Referees:
# (1) THE EXACT OPTIMUM by Held-Karp bitmask dynamic programming (written
#     here, itself checked against brute force at n = 9) on twenty random
#     Euclidean instances with n = 16: nearest neighbor, 2-opt from it,
#     2-opt then Or-opt, and 2-opt from a random tour, each scored by its
#     exact percentage over the optimum and by how often it is optimal;
# (2) THE THEOREM, checked geometrically: every 2-opt local optimum under the
#     full neighborhood has zero crossing edges (counted by segment
#     intersection over all edge pairs), on every instance, from every start,
#     while the starting tours do cross; every accepted move strictly
#     shortens the tour and the accepted deltas sum exactly to the change in
#     length; the tour stays a permutation of the cities;
# (3) SCALE: n = 100 to 1,600 uniform points: tour length against the
#     Beardwood-Halton-Hammersley estimate of the optimum, improving swaps,
#     distance lookups, and wall time, for the full scan against sorted
#     neighbor lists of ten and of twenty (with the Johnson-McGeoch
#     pruning), and first-improvement against best-improvement from both
#     starts;
# (4) THE RIVALS: Or-opt segment relocation after 2-opt (a cheap subset of
#     3-opt), and 2-opt from a random start against the nearest-neighbor
#     start;
# (5) THE NEGATIVE EXAMPLE, measured: the unimproved nearest-neighbor tour
#     and the unimproved random tour, with their crossing counts and the
#     factor by which they exceed the 2-opt result.
#
# AUTHOR CORRECTION: the draft expected neighbor lists of ten to lose
# nothing. Measured, ten can leave crossings behind (five at n = 1,600: the
# pruned neighborhood cannot see every uncrossing move) while twenty reached
# a crossing-free local optimum at every size for a seventh to a fourteenth
# of the full scan's lookups; the page reports twenty as the setting. The
# draft also expected first- and best-improvement to tie; measured on ten
# instances, best-improvement is one to three percent shorter from both
# starts at four to fourteen times the lookups. And the neighbor-list scan,
# which tries the shortest candidate edge first, landed on a shorter local
# optimum than the full scan at every one of the five sizes: a different
# path through the same landscape, not a bigger neighborhood.
import itertools
import math
import random
import time

SEED = 20261010


class Work:
    def __init__(self):
        self.dist = 0
        self.swaps = 0


def make_points(rng, n):
    return [(rng.random(), rng.random()) for _ in range(n)]


def distance_matrix(pts):
    n = len(pts)
    return [[math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) for j in range(n)] for i in range(n)]


def tour_length(D, tour):
    n = len(tour)
    return sum(D[tour[i]][tour[(i + 1) % n]] for i in range(n))


def nearest_neighbor(D, work, start=0):
    n = len(D)
    unvisited = set(range(n))
    unvisited.discard(start)
    tour = [start]
    cur = start
    while unvisited:
        work.dist += len(unvisited)
        nxt = min(unvisited, key=D[cur].__getitem__)
        unvisited.discard(nxt)
        tour.append(nxt)
        cur = nxt
    return tour


def segments_cross(p1, p2, p3, p4):
    def orient(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    o1, o2 = orient(p1, p2, p3), orient(p1, p2, p4)
    o3, o4 = orient(p3, p4, p1), orient(p3, p4, p2)
    return (o1 > 0) != (o2 > 0) and (o3 > 0) != (o4 > 0) and 0 not in (o1, o2, o3, o4)


def count_crossings(pts, tour):
    n = len(tour)
    edges = [(pts[tour[i]], pts[tour[(i + 1) % n]]) for i in range(n)]
    count = 0
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if segments_cross(edges[i][0], edges[i][1], edges[j][0], edges[j][1]):
                count += 1
    return count


def neighbor_lists(D, k, work):
    n = len(D)
    work.dist += n * (n - 1)
    return [sorted((j for j in range(n) if j != i), key=D[i].__getitem__)[:k] for i in range(n)]


def two_opt(D, tour, work, neighbors=None, best_improvement=False, trace=None):
    """2-opt local search. Full neighborhood by default: first improvement,
    the scan continuing past each accepted swap, until a clean pass. With
    sorted neighbor lists the candidates are the Johnson-McGeoch ones: for
    each city and each of its two tour edges, the near cities closer than
    that edge (every improving move has such a short new edge, so nothing
    is lost except moves whose short edge is beyond the k nearest). Each
    swap reverses the shorter side of the cycle."""
    n = len(tour)
    tour = list(tour)
    pos = [0] * n
    for i, c in enumerate(tour):
        pos[c] = i

    def accept(delta, lo, hi):
        inner = hi - lo
        if inner <= n - inner:
            s, e = lo + 1, hi
        else:
            s, e = hi + 1, lo
        length = (e - s) % n + 1
        for t in range(length // 2):
            p, q = (s + t) % n, (e - t) % n
            tour[p], tour[q] = tour[q], tour[p]
            pos[tour[p]] = p
            pos[tour[q]] = q
        work.swaps += 1
        if trace is not None:
            trace.append(delta)

    while True:
        improved = False
        best = None
        for i in range(n):
            a, b = tour[i], tour[(i + 1) % n]
            dab = D[a][b]
            work.dist += 1
            found = None
            if neighbors is None:
                for j in range(i + 2, n - 1 if i == 0 else n):
                    c, dd = tour[j], tour[(j + 1) % n]
                    work.dist += 3
                    delta = D[a][c] + D[b][dd] - dab - D[c][dd]
                    if delta < -1e-12:
                        if best_improvement:
                            if best is None or delta < best[0]:
                                best = (delta, i, j)
                        else:
                            found = (delta, i, j)
                            break
            else:
                for t2 in (a, b):
                    for t3 in neighbors[t2]:
                        work.dist += 1
                        if D[t2][t3] >= dab:
                            break
                        j = pos[t3] if t2 == a else (pos[t3] - 1) % n
                        lo, hi = (i, j) if i < j else (j, i)
                        if hi - lo < 2 or (lo == 0 and hi == n - 1):
                            continue
                        x, y, u, v = tour[lo], tour[lo + 1], tour[hi], tour[(hi + 1) % n]
                        work.dist += 3
                        delta = D[x][u] + D[y][v] - D[x][y] - D[u][v]
                        if delta < -1e-12:
                            if best_improvement:
                                if best is None or delta < best[0]:
                                    best = (delta, lo, hi)
                            else:
                                found = (delta, lo, hi)
                                break
                    if found:
                        break
            if found:
                accept(*found)
                improved = True
        if best_improvement:
            if best is None:
                break
            accept(*best)
        elif not improved:
            break
    return tour


def or_opt(D, tour, work):
    """Or-opt: move a run of 3, 2, or 1 consecutive cities to any other
    edge of the tour, either way round, when that shortens the tour; the
    scan continues past each accepted move until a clean pass."""
    n = len(tour)
    tour = list(tour)
    while True:
        improved = False
        for L in (3, 2, 1):
            for i in range(n):
                seg = [tour[(i + t) % n] for t in range(L)]
                s0, s1 = seg[0], seg[-1]
                p, q = tour[(i - 1) % n], tour[(i + L) % n]
                work.dist += 3
                gain = D[p][s0] + D[s1][q] - D[p][q]
                if gain <= 1e-12:
                    continue
                skip = {(i + t) % n for t in range(-1, L)}
                best = None
                for k in range(n):
                    if k in skip:
                        continue
                    u, v = tour[k], tour[(k + 1) % n]
                    work.dist += 5
                    duv = D[u][v]
                    df = D[u][s0] + D[s1][v] - duv - gain
                    dr = D[u][s1] + D[s0][v] - duv - gain
                    if df < -1e-12 and (best is None or df < best[0]):
                        best = (df, k, False)
                    if dr < -1e-12 and (best is None or dr < best[0]):
                        best = (dr, k, True)
                if best is not None:
                    _, k, rev = best
                    u = tour[k]
                    piece = seg[::-1] if rev else seg
                    rest = [c for c in tour if c not in seg]
                    at = rest.index(u) + 1
                    tour = rest[:at] + piece + rest[at:]
                    work.swaps += 1
                    improved = True
        if not improved:
            break
    return tour


def held_karp(D):
    """Exact optimum by bitmask DP over subsets that contain city 0."""
    n = len(D)
    INF = float('inf')
    size = 1 << n
    dp = [[INF] * n for _ in range(size)]
    dp[1][0] = 0.0
    others = range(1, n)
    for mask in range(1, size, 2):
        row = dp[mask]
        for last in range(n):
            cur = row[last]
            if cur == INF:
                continue
            dl = D[last]
            for nxt in others:
                bit = 1 << nxt
                if mask & bit:
                    continue
                val = cur + dl[nxt]
                cell = dp[mask | bit]
                if val < cell[nxt]:
                    cell[nxt] = val
    full = size - 1
    return min(dp[full][last] + D[last][0] for last in others)


def brute_force(D):
    n = len(D)
    return min(tour_length(D, (0,) + p) for p in itertools.permutations(range(1, n)))


def is_permutation(tour, n):
    return sorted(tour) == list(range(n))


def pct(v, opt):
    return 100 * (v / opt - 1)


def main():
    t_start = time.perf_counter()
    rng = random.Random(SEED)

    # The referee is itself refereed: Held-Karp against brute force at n = 9.
    D9 = distance_matrix(make_points(rng, 9))
    assert abs(held_karp(D9) - brute_force(D9)) < 1e-9

    # Referees 1 and 2: the exact optimum on twenty instances with n = 16.
    names = ['nearest neighbor', '2-opt from NN', '2-opt then Or-opt', '2-opt from random']
    gaps = {k: [] for k in names}
    N_SMALL, T_SMALL = 16, 20
    nn_cross = rnd_cross = 0
    hk_time = 0.0
    for _ in range(T_SMALL):
        n = N_SMALL
        pts = make_points(rng, n)
        D = distance_matrix(pts)
        t0 = time.perf_counter()
        opt = held_karp(D)
        hk_time += time.perf_counter() - t0
        w = Work()
        nn = nearest_neighbor(D, w)
        t2 = two_opt(D, nn, w)
        t3 = or_opt(D, t2, w)
        rnd = list(range(n))
        rng.shuffle(rnd)
        t2r = two_opt(D, rnd, w)
        tours = dict(zip(names, (nn, t2, t3, t2r)))
        ln = {}
        for k, t in tours.items():
            assert is_permutation(t, n)
            ln[k] = tour_length(D, t)
            assert ln[k] >= opt - 1e-9, (k, ln[k], opt)
            gaps[k].append(pct(ln[k], opt))
        for k in names[1:]:
            assert count_crossings(pts, tours[k]) == 0, k
        assert ln['2-opt from NN'] <= ln['nearest neighbor'] + 1e-12
        assert ln['2-opt then Or-opt'] <= ln['2-opt from NN'] + 1e-12
        nn_cross += count_crossings(pts, nn)
        rnd_cross += count_crossings(pts, rnd)
    mean_gap = {k: sum(v) / len(v) for k, v in gaps.items()}
    max_gap = {k: max(v) for k, v in gaps.items()}
    hits = {k: sum(1 for g in gaps[k] if g < 1e-6) for k in names}
    assert mean_gap['2-opt from NN'] < mean_gap['nearest neighbor'], mean_gap
    assert mean_gap['2-opt from NN'] < 10.0, mean_gap
    assert mean_gap['2-opt then Or-opt'] <= mean_gap['2-opt from NN'] + 1e-9
    assert hits['2-opt from NN'] < T_SMALL, 'a local optimum is not always the optimum; this seed should show it'

    # Referee 2 at scale, referees 3, 4, 5.
    scale = {}
    bhh = {}
    for n in (100, 200, 400, 800, 1600):
        pts = make_points(rng, n)
        D = distance_matrix(pts)
        bhh[n] = 0.7124 * math.sqrt(n)
        row = {}
        w = Work()
        nn = nearest_neighbor(D, w)
        row['nearest neighbor tour'] = (tour_length(D, nn), w.dist, 0, 0.0, count_crossings(pts, nn))
        w = Work()
        trace = []
        t0 = time.perf_counter()
        t2 = two_opt(D, nn, w, trace=trace)
        secs = time.perf_counter() - t0
        assert all(x < 0 for x in trace), 'a non-improving swap was accepted'
        assert is_permutation(t2, n)
        assert abs(row['nearest neighbor tour'][0] + sum(trace) - tour_length(D, t2)) < 1e-9, 'deltas must account for the length change'
        cr2 = count_crossings(pts, t2)
        assert cr2 == 0, (n, cr2)
        row['2-opt, full scan'] = (tour_length(D, t2), w.dist, w.swaps, secs, cr2)
        for k in (10, 20):
            w = Work()
            t0 = time.perf_counter()
            nl = neighbor_lists(D, k, w)
            t2n = two_opt(D, nn, w, neighbors=nl)
            secs = time.perf_counter() - t0
            assert is_permutation(t2n, n)
            row[f'2-opt, neighbor lists k={k}'] = (tour_length(D, t2n), w.dist, w.swaps, secs, count_crossings(pts, t2n))
            assert w.dist < row['2-opt, full scan'][1], 'neighbor lists must save lookups'
        if n <= 200:
            w = Work()
            t0 = time.perf_counter()
            t2b = two_opt(D, nn, w, best_improvement=True)
            secs = time.perf_counter() - t0
            assert count_crossings(pts, t2b) == 0
            row['2-opt, best improvement'] = (tour_length(D, t2b), w.dist, w.swaps, secs, 0)
        if n <= 800:
            w = Work()
            t0 = time.perf_counter()
            t3 = or_opt(D, t2, w)
            secs = time.perf_counter() - t0
            assert is_permutation(t3, n) and tour_length(D, t3) <= tour_length(D, t2) + 1e-12
            row['2-opt then Or-opt'] = (tour_length(D, t3), w.dist, w.swaps, secs, count_crossings(pts, t3))
            rnd = list(range(n))
            rng.shuffle(rnd)
            row['random tour'] = (tour_length(D, rnd), 0, 0, 0.0, count_crossings(pts, rnd))
            w = Work()
            t0 = time.perf_counter()
            t2r = two_opt(D, rnd, w)
            secs = time.perf_counter() - t0
            assert count_crossings(pts, t2r) == 0
            row['2-opt from random'] = (tour_length(D, t2r), w.dist, w.swaps, secs, 0)
            assert row['random tour'][4] > 0 and row['random tour'][0] > 5 * row['2-opt, full scan'][0]
        scale[n] = row
        assert row['2-opt, full scan'][0] < row['nearest neighbor tour'][0]
        assert row['nearest neighbor tour'][4] > 0

    # First- against best-improvement, both starts, ten instances at n = 100.
    n, T = 100, 10
    fb = {k: [0.0, 0, 0] for k in ('NN start, first', 'NN start, best', 'random start, first', 'random start, best')}
    for _ in range(T):
        pts = make_points(rng, n)
        D = distance_matrix(pts)
        w = Work()
        nn = nearest_neighbor(D, w)
        rnd = list(range(n))
        rng.shuffle(rnd)
        for name, start, best in (('NN start, first', nn, False), ('NN start, best', nn, True), ('random start, first', rnd, False), ('random start, best', rnd, True)):
            w = Work()
            t = two_opt(D, start, w, best_improvement=best)
            assert count_crossings(pts, t) == 0
            fb[name][0] += tour_length(D, t)
            fb[name][1] += w.dist
            fb[name][2] += w.swaps

    print('contest: random uniform points in the unit square; referees: the Held-Karp exact optimum (bitmask DP, checked against brute force) on twenty instances with n = 16, a geometric crossing count on every tour, strict improvement on every accepted swap with the deltas summing to the length change; currency: distance lookups, plus wall time')
    print(f'n = {N_SMALL}, {T_SMALL} instances, exact gap over the optimum: ' + '; '.join(f'{k} mean {mean_gap[k]:.2f}% max {max_gap[k]:.2f}% optimal on {hits[k]}/{T_SMALL}' for k in names))
    print(f'  crossings over the {T_SMALL} instances: nearest neighbor {nn_cross}, random {rnd_cross}, every 2-opt local optimum 0; Held-Karp total {hk_time:.1f} s')
    for n, row in scale.items():
        print(f'n = {n}: BHH asymptotic estimate of the optimum {bhh[n]:.2f} (a finite square runs a few percent above it)')
        for name, (L, dist, swaps, secs, cr) in row.items():
            print(f'  {name:>28} length {L:>7.3f} ({L / bhh[n]:.3f} x BHH)  lookups {dist:>12,}  moves {swaps:>5,}  {secs * 1000:>6.0f} ms  crossings {cr:,}')
    print(f'first against best improvement, n = {100}, {T} instances, means:')
    for k, (L, dist, swaps) in fb.items():
        print(f'  {k:>20}: length {L / T:.3f}  lookups {dist / T:,.0f}  moves {swaps / T:.0f}')
    s = scale[400]
    full, rnd, nn2, oro = s['2-opt, full scan'], s['random tour'], s['nearest neighbor tour'], s['2-opt then Or-opt']
    big = scale[1600]
    bfull, k20, k10 = big['2-opt, full scan'], big['2-opt, neighbor lists k=20'], big['2-opt, neighbor lists k=10']
    print(f'total {time.perf_counter() - t_start:.1f} s')
    print(f'OK: at n = 16 over {T_SMALL} instances 2-opt from nearest neighbor averages {mean_gap["2-opt from NN"]:.2f}% over the exact optimum and is optimal {hits["2-opt from NN"]} times (nearest neighbor alone {mean_gap["nearest neighbor"]:.2f}%, 2-opt from random {mean_gap["2-opt from random"]:.2f}%, with Or-opt {mean_gap["2-opt then Or-opt"]:.2f}%); '
          f'zero crossings at every full-neighborhood 2-opt local optimum; at n = 400 the tour fell from {nn2[0]:.2f} with {nn2[4]} crossings to {full[0]:.2f} in {full[2]} swaps and {full[1]:,} lookups, Or-opt took it to {oro[0]:.2f}, '
          f'and a random tour of {rnd[0]:.1f} with {rnd[4]:,} crossings came down to {s["2-opt from random"][0]:.2f} in {s["2-opt from random"][2]:,} swaps; '
          f'at n = 1,600 neighbor lists of twenty reached a local optimum with {k20[4]} crossings in {k20[1]:,} lookups against {bfull[1]:,} for the full scan, while lists of ten left {k10[4]} crossings')


if __name__ == '__main__':
    main()
