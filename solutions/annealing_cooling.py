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

    print("OK: annealing beats greedy and lands near the circle optimum")
