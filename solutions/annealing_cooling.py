# Puzzle 02: Simulated annealing x geometric cooling schedule
# Near-optimal traveling-salesman tours over point coordinates.
import math
import random


def tour_length(cities, tour):
    """Total length of the closed loop visiting `tour` in order."""
    total = 0.0
    for i in range(len(tour)):
        ax, ay = cities[tour[i]]
        bx, by = cities[tour[(i + 1) % len(tour)]]
        total += math.hypot(ax - bx, ay - by)
    return total


def anneal_tsp(cities, t_start=None, alpha=0.995, t_min=1e-3, sweeps_per_t=None, seed=0):
    """Return (best_tour, best_length) for the city list.

    The algorithm is simulated annealing over 2-opt moves: propose reversing
    a random tour segment, accept improvements always, and accept a
    worsening move with probability exp(-delta / T). The heuristic is the
    geometric cooling schedule T <- alpha * T: temperature is the willingness
    to take bad trades, high while exploring, near zero while polishing.
    """
    rng = random.Random(seed)
    n = len(cities)
    tour = list(range(n))
    rng.shuffle(tour)
    length = tour_length(cities, tour)
    best, best_len = tour[:], length

    # A workable starting temperature is the scale of a typical bad trade.
    if t_start is None:
        t_start = max(math.hypot(ax - bx, ay - by)
                      for ax, ay in cities for bx, by in cities)
    if sweeps_per_t is None:
        sweeps_per_t = 4 * n

    temp = t_start
    while temp > t_min:
        for _ in range(sweeps_per_t):
            i, j = sorted(rng.sample(range(n), 2))
            if i == 0 and j == n - 1:
                continue
            a, b = tour[i - 1], tour[i]
            c, d = tour[j], tour[(j + 1) % n]
            # 2-opt delta: replace edges (a,b) and (c,d) with (a,c) and (b,d).
            dist = lambda p, q: math.hypot(
                cities[p][0] - cities[q][0], cities[p][1] - cities[q][1]
            )
            delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d)
            if delta <= 0 or rng.random() < math.exp(-delta / temp):
                tour[i:j + 1] = reversed(tour[i:j + 1])
                length += delta
                if length < best_len:
                    best, best_len = tour[:], length
        temp *= alpha

    return best, best_len


# ---------------------------------------------------------------- the rivals


def nearest_neighbor(cities, start=0):
    """Greedy construction: always hop to the closest unvisited city.

    Fast, simple, and provably able to be arbitrarily bad. It is the honest
    baseline every tour heuristic is measured against.
    """
    unvisited = set(range(len(cities)))
    unvisited.remove(start)
    tour = [start]
    while unvisited:
        last = tour[-1]
        nxt = min(unvisited, key=lambda c: math.hypot(
            cities[last][0] - cities[c][0], cities[last][1] - cities[c][1]))
        unvisited.remove(nxt)
        tour.append(nxt)
    return tour, tour_length(cities, tour)


def two_opt(cities, tour=None, seed=0):
    """Pure hill climbing over 2-opt moves: accept improvements, never worsen.

    This is simulated annealing with the temperature pinned at zero, which
    makes it the cleanest possible control for what the cooling schedule is
    actually buying.
    """
    n = len(cities)
    if tour is None:
        tour, _ = nearest_neighbor(cities)
    tour = tour[:]
    dist = lambda p, q: math.hypot(
        cities[p][0] - cities[q][0], cities[p][1] - cities[q][1])
    improved = True
    while improved:
        improved = False
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                a, b = tour[i - 1], tour[i]
                c, d = tour[j], tour[(j + 1) % n]
                if b == d:
                    continue
                delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d)
                if delta < -1e-12:
                    tour[i:j + 1] = reversed(tour[i:j + 1])
                    improved = True
    return tour, tour_length(cities, tour)


def random_restart_two_opt(cities, restarts=12, seed=0):
    """Hill climbing that escapes local optima by starting over.

    The other classic answer to "my search got stuck": keep the best of many
    independent climbs instead of letting one climb accept a bad trade.
    """
    rng = random.Random(seed)
    n = len(cities)
    best, best_len = None, float("inf")
    for _ in range(restarts):
        start = list(range(n))
        rng.shuffle(start)
        tour, length = two_opt(cities, start)
        if length < best_len:
            best, best_len = tour, length
    return best, best_len


def held_karp(cities):
    """Exact dynamic programming over subsets: the true optimum, at a price.

    O(n^2 * 2^n) time and O(n * 2^n) memory. Included so the page can quote
    the exact optimum on a small instance and show what exactness costs.
    """
    n = len(cities)
    dist = [[math.hypot(cities[i][0] - cities[j][0], cities[i][1] - cities[j][1])
             for j in range(n)] for i in range(n)]
    best = {(1, 0): (0.0, None)}
    for size in range(2, n + 1):
        new = {}
        for mask, last in list(best):
            if bin(mask).count("1") != size - 1:
                continue
            cost, _ = best[(mask, last)]
            for nxt in range(n):
                if mask & (1 << nxt):
                    continue
                nmask = mask | (1 << nxt)
                cand = cost + dist[last][nxt]
                key = (nmask, nxt)
                if key not in new or cand < new[key][0]:
                    new[key] = (cand, (mask, last))
        best.update(new)
    full = (1 << n) - 1
    return min(best[(full, last)][0] + dist[last][0] for last in range(1, n))


def contest(n=12, seed=99):
    """Race every method on one shared instance and return the numbers.

    Twelve cities, because Held-Karp must actually finish: that is the point
    of the row, not an accident of the demo.
    """
    rng = random.Random(seed)
    cities = [(rng.random(), rng.random()) for _ in range(n)]
    optimum = held_karp(cities)
    rows = []
    _, nn = nearest_neighbor(cities)
    rows.append(("Nearest neighbor", nn))
    _, hc = two_opt(cities)
    rows.append(("2-opt hill climbing", hc))
    _, rr = random_restart_two_opt(cities, restarts=12, seed=1)
    rows.append(("2-opt with 12 restarts", rr))
    _, sa = anneal_tsp(cities, seed=3)
    rows.append(("Simulated annealing", sa))
    rows.append(("Held-Karp (exact)", optimum))
    return cities, optimum, rows


if __name__ == "__main__":
    # Self-test 1: cities on a circle have a known optimal tour (the circle
    # order). Annealing must land within 2 percent of it.
    n = 20
    circle = [(math.cos(2 * math.pi * k / n), math.sin(2 * math.pi * k / n))
              for k in range(n)]
    optimal = tour_length(circle, list(range(n)))
    _, found = anneal_tsp(circle, seed=7)
    assert found <= optimal * 1.02, f"circle tour {found:.4f} vs optimal {optimal:.4f}"

    # Self-test 2: on random cities, annealing must beat the greedy
    # nearest-neighbor baseline it exists to outdo.
    rng = random.Random(99)
    cities = [(rng.random(), rng.random()) for _ in range(30)]

    def nearest_neighbor_length(cities):
        unvisited = set(range(1, len(cities)))
        tour = [0]
        while unvisited:
            last = tour[-1]
            nxt = min(unvisited, key=lambda c: math.hypot(
                cities[last][0] - cities[c][0], cities[last][1] - cities[c][1]))
            unvisited.remove(nxt)
            tour.append(nxt)
        return tour_length(cities, tour)

    greedy = nearest_neighbor_length(cities)
    _, annealed = anneal_tsp(cities, seed=3)
    assert annealed < greedy, f"annealed {annealed:.4f} should beat greedy {greedy:.4f}"

    # Self-test 3: the running length bookkeeping matches a fresh recount.
    tour, ln = anneal_tsp(cities, seed=5)
    assert abs(ln - tour_length(cities, tour)) < 1e-6, "incremental length drifted"
    assert sorted(tour) == list(range(len(cities))), "tour must visit every city once"

    # Self-test 4: the contest must reproduce the ordering the page claims.
    _, optimum, rows = contest()
    by_name = dict(rows)
    assert abs(by_name["Held-Karp (exact)"] - optimum) < 1e-9
    for name in ("Nearest neighbor", "2-opt hill climbing",
                 "2-opt with 12 restarts", "Simulated annealing"):
        assert by_name[name] >= optimum - 1e-9, f"{name} beat the proven optimum"
    assert by_name["2-opt hill climbing"] < by_name["Nearest neighbor"], (
        "local search must improve the greedy construction"
    )
    assert by_name["Simulated annealing"] <= by_name["2-opt hill climbing"] + 1e-9, (
        "annealing must at least match plain hill climbing here"
    )

    print("contest on 12 random cities in the unit square (seed 99):")
    for name, length in rows:
        gap = (length / optimum - 1) * 100
        print(f"  {name:<24} tour {length:.4f}   gap {gap:+.2f}%")
    print("OK: annealing beats greedy and lands near the circle optimum")
