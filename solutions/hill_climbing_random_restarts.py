# Puzzle 178: Hill climbing x Random restarts
# Local optimization: find the best state in a space too large to
# enumerate, given only an objective and a neighborhood. The algorithm is
# hill climbing: from the current state, look at every neighbor and move
# to the best one as long as it improves the objective; stop when no
# neighbor does, which is a local optimum. The heuristic is random
# restarts: when a climb stalls somewhere that is not the goal, throw the
# state away and climb again from a fresh random start. If one climb
# reaches the global optimum with probability p, the number of climbs
# until success is geometric with mean 1 / p, so a method that is
# complete almost never on its own becomes complete almost surely, at a
# cost that is a formula in p and the length of a climb.
#
# Referees:
# (1) EIGHT QUEENS: place eight queens so that no two attack; the
#     objective is the number of attacking pairs, the optimum is zero, and
#     the complete set of 92 solutions is computed by exhaustive
#     backtracking, so every solution the climber returns can be checked
#     against it. Russell and Norvig report that steepest-ascent climbing
#     from a random state solves the puzzle about 14% of the time, in
#     about 4 steps when it succeeds and 3 when it sticks, and 94% of the
#     time with up to 100 sideways moves; all four numbers are measured
#     here over 3,000 random starts;
# (2) THE GEOMETRIC LAW: the measured mean number of climbs until the
#     first success must match 1 / p within sampling error, on both
#     problems;
# (3) RASTRIGIN'S FUNCTION in two dimensions, with its single global
#     minimum of zero at the origin and a local minimum near every point
#     of the integer lattice: a pattern-search climb from a random start in
#     the square of side 10.24 lands in the right basin about one time in
#     forty, measured over 20,000 starts;
# (4) THE RIVALS at one budget of objective evaluations per run (5,000 on
#     eight queens, 20,000 on Rastrigin): a single climb, a climb allowing
#     sideways moves, climbing with random restarts, simulated annealing
#     with geometric cooling, tabu search with a fixed tenure (queens), and
#     iterated local search with a two-queen or two-coordinate kick;
#     success rate over 200 or 100 runs and mean evaluations to success;
# (5) THE NEGATIVE EXAMPLE, measured: one greedy climb on Rastrigin, about
#     one success in forty, against the same climber with restarts.
#
# AUTHOR CORRECTION: the draft expected simulated annealing to beat
# restarts on eight queens at equal budget. Measured, both reach near
# certainty at 5,000 evaluations (98% and 95%) and restarts get there in
# fewer evaluations on average (1,520 against 2,001), because a failed
# climb is cheap and the landscape has no deep basins. The draft also did
# not expect the rivals to win outright: tabu search solved every queens
# run in 700 evaluations and iterated local search every Rastrigin run in
# 3,709, against 89% for restarts there. The page reports all of it: the
# hero's case is the one-line formula and the absence of parameters, not
# the fastest column.
import math
import random

SEED = 20261010
N = 8


class Work:
    def __init__(self):
        self.evals = 0


# ----------------------------------------------------------- eight queens

def conflicts(state, work=None):
    if work is not None:
        work.evals += 1
    c = 0
    for i in range(N):
        for j in range(i + 1, N):
            if state[i] == state[j] or abs(state[i] - state[j]) == j - i:
                c += 1
    return c


def all_solutions():
    """Exhaustive backtracking: the 92 arrangements with no attacks."""
    out = []
    cols = [0] * N

    def place(c, rows, d1, d2):
        if c == N:
            out.append(tuple(cols))
            return
        for r in range(N):
            if r in rows or (r - c) in d1 or (r + c) in d2:
                continue
            cols[c] = r
            place(c + 1, rows | {r}, d1 | {r - c}, d2 | {r + c})

    place(0, frozenset(), frozenset(), frozenset())
    return set(out)


def random_state(rng):
    return [rng.randrange(N) for _ in range(N)]


def climb_queens(state, rng, work, sideways_limit=0, budget=None):
    """Steepest-ascent: move one queen within its column to the best row.
    Returns (state, conflicts, steps). Sideways moves (equal value) are
    allowed up to sideways_limit in a row."""
    state = list(state)
    cur = conflicts(state, work)
    steps = 0
    sideways = 0
    while cur > 0:
        if budget is not None and work.evals >= budget:
            break
        best_val = None
        best_moves = []
        for c in range(N):
            for r in range(N):
                if r == state[c]:
                    continue
                old = state[c]
                state[c] = r
                v = conflicts(state, work)
                state[c] = old
                if best_val is None or v < best_val:
                    best_val, best_moves = v, [(c, r)]
                elif v == best_val:
                    best_moves.append((c, r))
        if best_val < cur:
            sideways = 0
        elif best_val == cur and sideways < sideways_limit:
            sideways += 1
        else:
            break
        c, r = rng.choice(best_moves)
        state[c] = r
        cur = best_val
        steps += 1
    return state, cur, steps


def restarts_queens(rng, work, budget, sideways_limit=0):
    climbs = 0
    while work.evals < budget:
        state, cur, _ = climb_queens(random_state(rng), rng, work, sideways_limit, budget)
        climbs += 1
        if cur == 0:
            return state, climbs
    return None, climbs


def annealing_queens(rng, work, budget, t0=2.0, t1=0.05):
    state = random_state(rng)
    cur = conflicts(state, work)
    steps = max(1, budget - 1)
    alpha = (t1 / t0) ** (1 / steps)
    t = t0
    while cur > 0 and work.evals < budget:
        c = rng.randrange(N)
        r = rng.randrange(N)
        if r == state[c]:
            continue
        old = state[c]
        state[c] = r
        v = conflicts(state, work)
        d = v - cur
        if d <= 0 or rng.random() < math.exp(-d / t):
            cur = v
        else:
            state[c] = old
        t *= alpha
    return state if cur == 0 else None


def tabu_queens(rng, work, budget, tenure=7):
    state = random_state(rng)
    cur = conflicts(state, work)
    best = cur
    tabu = {}  # (col, row) -> step until which moving col back to row is forbidden
    step = 0
    while cur > 0 and work.evals < budget:
        step += 1
        best_val = None
        best_moves = []
        for c in range(N):
            for r in range(N):
                if r == state[c]:
                    continue
                old = state[c]
                state[c] = r
                v = conflicts(state, work)
                state[c] = old
                if tabu.get((c, r), 0) > step and v >= best:  # tabu unless it beats the best ever (aspiration)
                    continue
                if best_val is None or v < best_val:
                    best_val, best_moves = v, [(c, r)]
                elif v == best_val:
                    best_moves.append((c, r))
        if not best_moves:
            tabu.clear()
            continue
        c, r = rng.choice(best_moves)
        tabu[(c, state[c])] = step + tenure
        state[c] = r
        cur = best_val
        best = min(best, cur)
    return state if cur == 0 else None


def ils_queens(rng, work, budget, kick=2):
    state, cur, _ = climb_queens(random_state(rng), rng, work, 0, budget)
    while cur > 0 and work.evals < budget:
        trial = list(state)
        for c in rng.sample(range(N), kick):
            trial[c] = rng.randrange(N)
        trial, val, _ = climb_queens(trial, rng, work, 0, budget)
        if val <= cur:
            state, cur = trial, val
    return state if cur == 0 else None


# -------------------------------------------------------------- Rastrigin

LOW, HIGH = -5.12, 5.12


def rastrigin(p, work=None):
    if work is not None:
        work.evals += 1
    x, y = p
    return 20.0 + x * x + y * y - 10.0 * (math.cos(2 * math.pi * x) + math.cos(2 * math.pi * y))


SUCCESS = 1e-4


def climb_rastrigin(p, work, budget=None, step=0.5, min_step=1e-5):
    """Pattern search: try the eight compass neighbors at the current step,
    move to the best if it improves, otherwise halve the step."""
    p = list(p)
    cur = rastrigin(p, work)
    while step > min_step:
        if budget is not None and work.evals >= budget:
            break
        best_v, best_p = cur, None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                q = [p[0] + dx * step, p[1] + dy * step]
                v = rastrigin(q, work)
                if v < best_v:
                    best_v, best_p = v, q
        if best_p is None:
            step *= 0.5
        else:
            p, cur = best_p, best_v
    return p, cur


def random_point(rng):
    return [rng.uniform(LOW, HIGH), rng.uniform(LOW, HIGH)]


def restarts_rastrigin(rng, work, budget):
    climbs = 0
    best = math.inf
    while work.evals < budget:
        p, v = climb_rastrigin(random_point(rng), work, budget)
        climbs += 1
        best = min(best, v)
        if v < SUCCESS:
            return v, climbs
    return best, climbs


def annealing_rastrigin(rng, work, budget, t0=5.0, t1=1e-3):
    p = random_point(rng)
    cur = rastrigin(p, work)
    best_p, best = list(p), cur
    polish = 400
    steps = max(1, budget - polish)
    alpha = (t1 / t0) ** (1 / steps)
    t = t0
    while work.evals < budget - polish:
        sigma = 0.3 + 1.5 * (t / t0)
        q = [p[0] + rng.gauss(0, sigma), p[1] + rng.gauss(0, sigma)]
        v = rastrigin(q, work)
        d = v - cur
        if d <= 0 or rng.random() < math.exp(-d / t):
            p, cur = q, v
            if v < best:
                best_p, best = list(q), v
        t *= alpha
    _, polished = climb_rastrigin(best_p, work, budget, step=0.25)
    return min(best, polished)


def ils_rastrigin(rng, work, budget, kick=1.5):
    p, cur = climb_rastrigin(random_point(rng), work, budget)
    while cur >= SUCCESS and work.evals < budget:
        q = [p[0] + rng.uniform(-kick, kick), p[1] + rng.uniform(-kick, kick)]
        q, v = climb_rastrigin(q, work, budget, step=0.25)
        if v <= cur:
            p, cur = q, v
    return cur


# ------------------------------------------------------------------ main

def main():
    rng = random.Random(SEED)
    solutions = all_solutions()
    assert len(solutions) == 92

    # Oracle 1: single steepest-ascent climbs on eight queens.
    trials = 3000
    successes = 0
    steps_ok = []
    steps_stuck = []
    found = set()
    for _ in range(trials):
        w = Work()
        s, c, steps = climb_queens(random_state(rng), rng, w)
        assert conflicts(s) == c
        if c == 0:
            successes += 1
            steps_ok.append(steps)
            assert tuple(s) in solutions
            found.add(tuple(s))
        else:
            steps_stuck.append(steps)
    p_queens = successes / trials
    assert 0.10 < p_queens < 0.20, p_queens
    mean_ok = sum(steps_ok) / len(steps_ok)
    mean_stuck = sum(steps_stuck) / len(steps_stuck)
    assert 3 < mean_ok < 5.5 and 2 < mean_stuck < 4.5, (mean_ok, mean_stuck)

    # sideways moves (AIMA: 94%)
    side_ok = 0
    side_steps_ok, side_steps_stuck = [], []
    for _ in range(trials):
        w = Work()
        s, c, steps = climb_queens(random_state(rng), rng, w, sideways_limit=100)
        if c == 0:
            side_ok += 1
            side_steps_ok.append(steps)
            assert tuple(s) in solutions
        else:
            side_steps_stuck.append(steps)
    p_side = side_ok / trials
    assert p_side > 0.85, p_side

    # Oracle 2: the geometric law on eight queens.
    climbs_to_success = []
    for _ in range(600):
        w = Work()
        s, climbs = restarts_queens(rng, w, budget=10 ** 9)
        assert s is not None and tuple(s) in solutions
        found.add(tuple(s))
        climbs_to_success.append(climbs)
    mean_climbs = sum(climbs_to_success) / len(climbs_to_success)
    assert abs(mean_climbs - 1 / p_queens) < 0.15 * (1 / p_queens), (mean_climbs, 1 / p_queens)

    # Oracle 3: Rastrigin single climbs.
    r_trials = 20000
    r_ok = 0
    r_evals = []
    for _ in range(r_trials):
        w = Work()
        p, v = climb_rastrigin(random_point(rng), w)
        r_evals.append(w.evals)
        if v < SUCCESS:
            r_ok += 1
            assert abs(p[0]) < 1e-3 and abs(p[1]) < 1e-3
    p_rast = r_ok / r_trials
    assert 0.01 < p_rast < 0.06, p_rast  # about one climb in forty lands in the central basin
    mean_climb_evals = sum(r_evals) / len(r_evals)
    r_climbs = []
    for _ in range(150):
        w = Work()
        v, climbs = restarts_rastrigin(rng, w, budget=10 ** 9)
        assert v < SUCCESS
        r_climbs.append(climbs)
    r_mean_climbs = sum(r_climbs) / len(r_climbs)
    assert abs(r_mean_climbs - 1 / p_rast) < 0.25 * (1 / p_rast), (r_mean_climbs, 1 / p_rast)

    # Oracle 4: the race on eight queens.
    q_budget = 5000
    q_runs = 200
    q_methods = {
        'single climb': lambda r, w: (lambda res: res[0] if res[1] == 0 else None)(climb_queens(random_state(r), r, w, 0, q_budget)),
        'climb + sideways (100)': lambda r, w: (lambda res: res[0] if res[1] == 0 else None)(climb_queens(random_state(r), r, w, 100, q_budget)),
        'random restarts': lambda r, w: restarts_queens(r, w, q_budget)[0],
        'simulated annealing': lambda r, w: annealing_queens(r, w, q_budget),
        'tabu search (tenure 7)': lambda r, w: tabu_queens(r, w, q_budget),
        'iterated local search': lambda r, w: ils_queens(r, w, q_budget),
    }
    q_results = {}
    for name, fn in q_methods.items():
        ok = 0
        evals_ok = []
        for i in range(q_runs):
            r = random.Random(SEED + 1000 + i)
            w = Work()
            s = fn(r, w)
            if s is not None:
                assert conflicts(s) == 0 and tuple(s) in solutions
                ok += 1
                evals_ok.append(w.evals)
        q_results[name] = (ok / q_runs, (sum(evals_ok) / len(evals_ok)) if evals_ok else float('nan'))
    assert q_results['random restarts'][0] > 0.9, q_results
    assert q_results['random restarts'][0] > q_results['single climb'][0] + 0.5

    # the race on Rastrigin
    r_budget = 20000
    r_runs = 100
    r_methods = {
        'single climb': lambda r, w: climb_rastrigin(random_point(r), w, r_budget)[1],
        'random restarts': lambda r, w: restarts_rastrigin(r, w, r_budget)[0],
        'simulated annealing': lambda r, w: annealing_rastrigin(r, w, r_budget),
        'iterated local search': lambda r, w: ils_rastrigin(r, w, r_budget),
    }
    r_results = {}
    for name, fn in r_methods.items():
        ok = 0
        evals_ok = []
        for i in range(r_runs):
            r = random.Random(SEED + 5000 + i)
            w = Work()
            v = fn(r, w)
            if v < SUCCESS:
                ok += 1
                evals_ok.append(w.evals)
        r_results[name] = (ok / r_runs, (sum(evals_ok) / len(evals_ok)) if evals_ok else float('nan'))
    assert r_results['random restarts'][0] > 0.5, r_results
    assert r_results['single climb'][0] < 0.05, r_results
    expected_restart_rate = 1 - (1 - p_rast) ** (r_budget / mean_climb_evals)

    print('contest: eight queens (objective: attacking pairs; 92 solutions by exhaustive backtracking as the referee) and Rastrigin in two dimensions (global minimum 0 at the origin, a local minimum near every lattice point); one currency: objective evaluations')
    print(f'eight queens, one steepest-ascent climb from a random state, {trials:,} starts: success {p_queens:.1%} (Russell and Norvig: about 14%), {mean_ok:.2f} steps when it succeeds, {mean_stuck:.2f} when it sticks; '
          f'with up to 100 sideways moves: success {p_side:.1%} (about 94%), {sum(side_steps_ok) / len(side_steps_ok):.1f} steps on success, {sum(side_steps_stuck) / max(1, len(side_steps_stuck)):.1f} on failure')
    print(f'the geometric law: 1 / p = {1 / p_queens:.2f} climbs expected; measured mean climbs to the first solution over 600 runs {mean_climbs:.2f}; {len(found)} of the 92 solutions found across all successful climbs')
    print(f'Rastrigin, one pattern-search climb from a random start in the square, {r_trials:,} starts: success {p_rast:.2%} (1 / p = {1 / p_rast:.0f} climbs), {mean_climb_evals:.0f} evaluations per climb; measured mean climbs to success over 150 runs {r_mean_climbs:.0f}')
    print(f'{"eight queens, budget 5,000 evaluations, 200 runs":>52} {"success":>8} {"evals to success":>17}')
    for name, (rate, ev) in q_results.items():
        print(f'{name:>52} {rate:>8.1%} {ev:>17,.0f}')
    print(f'{"Rastrigin, budget 20,000 evaluations, 100 runs":>52} {"success":>8} {"evals to success":>17}')
    for name, (rate, ev) in r_results.items():
        print(f'{name:>52} {rate:>8.1%} {ev:>17,.0f}')
    print(f'restarts on Rastrigin: the formula 1 - (1 - p)^(budget / climb) = {expected_restart_rate:.1%} predicted, {r_results["random restarts"][0]:.1%} measured')
    print(f'OK: one climb solves eight queens {p_queens:.1%} of the time and Rastrigin {p_rast:.1%}; the mean climbs to success {mean_climbs:.2f} and {r_mean_climbs:.0f} match 1 / p = {1 / p_queens:.2f} and {1 / p_rast:.0f}; '
          f'at 5,000 evaluations restarts solve eight queens {q_results["random restarts"][0]:.1%} against {q_results["single climb"][0]:.1%} for one climb, annealing {q_results["simulated annealing"][0]:.1%}, tabu {q_results["tabu search (tenure 7)"][0]:.1%}, ILS {q_results["iterated local search"][0]:.1%}; '
          f'at 20,000 evaluations on Rastrigin restarts {r_results["random restarts"][0]:.0%}, annealing {r_results["simulated annealing"][0]:.0%}, ILS {r_results["iterated local search"][0]:.0%}, one climb {r_results["single climb"][0]:.0%}; every solution returned was one of the 92')


if __name__ == '__main__':
    main()
