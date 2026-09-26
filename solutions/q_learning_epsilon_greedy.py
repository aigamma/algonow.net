# Puzzle 127: Q-learning x epsilon-greedy exploration
# Reinforcement learning: an agent in an unknown world must learn which
# action to take in each state to collect the most reward over time,
# from nothing but the rewards it stumbles into. Q-learning is the
# algorithm: keep a table Q(s, a) of expected return, and after every
# step move Q(s, a) toward reward plus the discounted best Q of the
# next state, the Bellman optimality update, regardless of which
# action the agent actually takes next. The heuristic is how the agent
# behaves while learning: epsilon-greedy takes the best-known action
# most of the time and a random one with probability epsilon, because a
# table that is never sampled never improves, and the value of a state
# nobody visits is a guess.
#
# The world is Sutton and Barto's cliff walk: a 4 x 12 grid, start at
# the bottom left, goal at the bottom right, and the cells between them
# on the bottom row are a cliff: stepping in costs 100 and sends the
# agent back to the start. Every other step costs 1.
#
# Referees:
# (1) VALUE ITERATION on the known model computes the exact optimal
#     Q*; the greedy policy from the learned table must equal the
#     optimal policy on every state the optimal path uses, and the
#     learned start value must sit within a tolerance of Q*(start);
# (2) THE OPTIMAL PATH has 13 steps (along the cliff edge); the learned
#     greedy policy must walk it in exactly 13 steps without falling;
# (3) THE ABLATIONS, measured rather than assumed: epsilon = 0 from a
#     ZERO table still finds the optimum, because zeros are optimistic
#     in a world where every reward is negative (an untried action
#     always looks better than a tried one, so the greedy agent
#     explores until the optimism is used up); epsilon = 0 from a
#     PESSIMISTIC table (every entry -100, below any path's true value)
#     locks into the first route it stumbles on and never finds the 13;
#     epsilon = 0.5 finds the optimum and falls off the cliff far more
#     often while training;
# (4) THE RIVAL, on-policy SARSA with the same epsilon, must learn the
#     SAFER path (longer than 13) and suffer fewer cliff falls during
#     training than Q-learning: the textbook contrast, measured rather
#     than quoted;
# (5) CONVERGENCE is measured in episodes until the greedy policy first
#     matches the optimum and stays there.
import random

SEED = 20260926
ROWS, COLS = 4, 12
START = (3, 0)
GOAL = (3, 11)
CLIFF = {(3, c) for c in range(1, 11)}
ACTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]   # up, down, left, right
GAMMA = 1.0


def step(state, a):
    r, c = state
    dr, dc = ACTIONS[a]
    nr = min(ROWS - 1, max(0, r + dr))
    nc = min(COLS - 1, max(0, c + dc))
    nxt = (nr, nc)
    if nxt in CLIFF:
        return START, -100, False, True
    if nxt == GOAL:
        return nxt, -1, True, False
    return nxt, -1, False, False


def value_iteration():
    """Exact Q* on the known model."""
    states = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) not in CLIFF and (r, c) != GOAL]
    V = {s: 0.0 for s in states}
    V[GOAL] = 0.0
    Q = {}
    for _ in range(500):
        delta = 0.0
        for s in states:
            best = float('-inf')
            for a in range(4):
                nxt, rew, done, _ = step(s, a)
                q = rew + (0.0 if done else GAMMA * V[nxt])
                Q[(s, a)] = q
                best = max(best, q)
            delta = max(delta, abs(best - V[s]))
            V[s] = best
        if delta < 1e-9:
            break
    return V, Q


def greedy_path(Q, max_steps=100, init=0.0):
    s = START
    path = [s]
    for _ in range(max_steps):
        a = max(range(4), key=lambda x: Q.get((s, x), init))
        nxt, rew, done, fell = step(s, a)
        if fell:
            return path, False
        path.append(nxt)
        s = nxt
        if done:
            return path, True
    return path, False


def run(kind, epsilon, episodes, rng, alpha=0.5, optimal_policy=None, init=0.0):
    """kind: 'q' or 'sarsa'. init: the value every untried entry starts at.
    Returns (Q, falls per 100 episodes list, episode when the greedy
    policy first became and stayed optimal)."""
    Q = {}
    g = lambda s_, a_: Q.get((s_, a_), init)
    falls = []
    fell_count = 0
    first_optimal = None
    for ep in range(1, episodes + 1):
        s = START
        a = choose(Q, s, epsilon, rng, init)
        for _ in range(500):
            nxt, rew, done, fell = step(s, a)
            fell_count += fell
            if kind == 'q':
                target = rew + (0.0 if done else GAMMA * max(g(nxt, x) for x in range(4)))
                Q[(s, a)] = g(s, a) + alpha * (target - g(s, a))
                s = nxt
                a = choose(Q, s, epsilon, rng, init)
            else:
                a2 = choose(Q, nxt, epsilon, rng, init)
                target = rew + (0.0 if done else GAMMA * g(nxt, a2))
                Q[(s, a)] = g(s, a) + alpha * (target - g(s, a))
                s, a = nxt, a2
            if done:
                break
        if ep % 100 == 0:
            falls.append(fell_count)
            fell_count = 0
        if optimal_policy is not None and first_optimal is None:
            path, ok = greedy_path(Q, init=init)
            if ok and len(path) - 1 == 13:
                first_optimal = ep
        elif optimal_policy is not None and first_optimal is not None and ep % 50 == 0:
            path, ok = greedy_path(Q, init=init)
            if not (ok and len(path) - 1 == 13):
                first_optimal = None
    return Q, falls, first_optimal


def choose(Q, s, epsilon, rng, init=0.0):
    if rng.random() < epsilon:
        return rng.randrange(4)
    best = max(Q.get((s, x), init) for x in range(4))
    ties = [x for x in range(4) if Q.get((s, x), init) == best]
    return rng.choice(ties)


if __name__ == '__main__':
    V, Qstar = value_iteration()
    opt_path, ok = greedy_path(Qstar)
    assert ok and len(opt_path) - 1 == 13 and V[START] == -13.0, (len(opt_path), V[START])

    EPISODES = 2000
    results = {}
    RUNS = (('Q-learning eps 0.1', 'q', 0.1, 0.0), ('Q-learning eps 0, zeros', 'q', 0.0, 0.0),
            ('Q-learning eps 0, -100', 'q', 0.0, -100.0), ('Q-learning eps 0.5', 'q', 0.5, 0.0), ('SARSA eps 0.1', 'sarsa', 0.1, 0.0))
    for i, (label, kind, eps, init) in enumerate(RUNS):
        Q, falls, first = run(kind, eps, EPISODES, random.Random(SEED + i), optimal_policy=True, init=init)
        path, reached = greedy_path(Q, init=init)
        results[label] = (Q, falls, first, path, reached)

    Q, falls, first, path, reached = results['Q-learning eps 0.1']
    # Oracle 1 + 2: the learned greedy policy is the optimal one along the cliff edge.
    assert reached and len(path) - 1 == 13, (reached, len(path))
    for s in opt_path[:-1]:
        learned = max(range(4), key=lambda x: Q.get((s, x), 0.0))
        best = max(Qstar[(s, x)] for x in range(4))
        assert Qstar[(s, learned)] == best, s
    assert abs(max(Q.get((START, x), 0.0) for x in range(4)) - V[START]) < 1.5, max(Q.get((START, x), 0.0) for x in range(4))
    assert first is not None

    # Oracle 3: the ablations. AUTHOR CORRECTION: the first draft asserted
    # that pure greedy from a zero table fails; the run refused it (zeros are
    # optimistic here), so the page states that and shows the lock-in with a
    # pessimistic table instead.
    q0 = results['Q-learning eps 0, zeros']
    qp = results['Q-learning eps 0, -100']
    q5 = results['Q-learning eps 0.5']
    assert q0[4] and len(q0[3]) - 1 == 13, 'optimistic zeros explore on their own'
    assert not (qp[4] and len(qp[3]) - 1 == 13), 'a pessimistic greedy table should lock in'
    assert sum(q5[1]) > 3 * sum(falls), (sum(q5[1]), sum(falls))

    # Oracle 4: SARSA learns the safe path and falls less while learning.
    sq, sfalls, sfirst, spath, sreached = results['SARSA eps 0.1']
    assert sreached and len(spath) - 1 > 13, (sreached, len(spath))
    assert sum(sfalls) < sum(falls), (sum(sfalls), sum(falls))

    print(f'contest: the cliff walk ({ROWS} x {COLS}, cliff cost 100, step cost 1), {EPISODES} training episodes, alpha 0.5, gamma 1; referee: exact Q* from value iteration on the known model (optimal path 13 steps, V*(start) = -13)')
    print(f"  {'learner':<24} {'greedy path':>12} {'reaches goal':>13} {'cliff falls':>12} {'first optimal ep':>17}")
    for label, _, _, _ in RUNS:
        Qx, fx, firstx, px, rx = results[label]
        steps_ = len(px) - 1 if rx else '-'
        print(f"  {label:<24} {steps_:>12} {str(rx):>13} {sum(fx):>12,} {str(firstx) if firstx else 'never':>17}   "
              + {'Q-learning eps 0.1': 'off-policy: learns the cliff-edge optimum while exploring',
                 'Q-learning eps 0, zeros': 'no epsilon, but zeros are optimistic when every reward is negative: it explores anyway',
                 'Q-learning eps 0, -100': 'no epsilon and a pessimistic table: locks into the first route found',
                 'Q-learning eps 0.5': 'too much exploration: the optimum is found, the training is carnage',
                 'SARSA eps 0.1': 'on-policy: learns the path its exploring self can survive'}[label])
    print(f'learned V(start) under Q-learning eps 0.1: {max(Q.get((START, x), 0.0) for x in range(4)):.2f} vs V*(start) = {V[START]:.0f}')
    print(f'OK: Q-learning with eps 0.1 walks the 13-step optimum matching value iteration on every state of the path; eps 0 from zeros finds it too (optimism), from -100 it locks in ({len(qp[3]) - 1 if qp[4] else "never reaches the goal"}); eps 0.5 falls {sum(q5[1]):,} times vs {sum(falls):,}; '
          f'SARSA reaches the goal by a {len(spath) - 1}-step safe path with {sum(sfalls):,} falls; first optimal episode {first}')
