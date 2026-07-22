# Puzzle 06: Monte Carlo tree search x UCB1 exploration bonus
# Learn a game tree by playing it, on games too big to solve exactly.
import math
import random

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
]


def winner(board):
    for a, b, c in WIN_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return 'draw' if all(board) else None


class Node:
    """One visited position. `wins` is scored from the perspective of the
    player who JUST moved into this position, which is what makes the
    parent's selection formula read it correctly."""

    __slots__ = ('board', 'mover', 'parent', 'children', 'untried', 'visits', 'wins')

    def __init__(self, board, mover, parent):
        self.board = board
        self.mover = mover                # the player who just moved (None at root)
        self.parent = parent
        self.children = {}
        self.untried = [i for i in range(9) if board[i] is None] if winner(board) is None else []
        self.visits = 0
        self.wins = 0.0

    def ucb1(self, child, c):
        # Exploitation (how well has this move done) plus the exploration
        # bonus (how uncertain are we), the UCB1 rule from bandit theory.
        return child.wins / child.visits + c * math.sqrt(math.log(self.visits) / child.visits)


def mcts_move(board, player, simulations=3000, c=1.4, rng=None):
    """Choose a move for `player` by running `simulations` UCB1-guided
    playouts and returning the most-visited child of the root."""
    rng = rng or random.Random()
    root = Node(board[:], None, None)

    for _ in range(simulations):
        node, to_move = root, player

        # 1. Selection: descend by UCB1 while fully expanded.
        while not node.untried and node.children:
            node = max(node.children.values(), key=lambda ch: node.ucb1(ch, c))
            to_move = 'O' if to_move == 'X' else 'X'

        # 2. Expansion: open one untried move.
        if node.untried:
            move = rng.choice(node.untried)
            node.untried.remove(move)
            child_board = node.board[:]
            child_board[move] = to_move
            child = Node(child_board, to_move, node)
            node.children[move] = child
            node = child
            to_move = 'O' if to_move == 'X' else 'X'

        # 3. Rollout: play uniformly at random to the end.
        rollout = node.board[:]
        turn = to_move
        result = winner(rollout)
        while result is None:
            move = rng.choice([i for i in range(9) if rollout[i] is None])
            rollout[move] = turn
            turn = 'O' if turn == 'X' else 'X'
            result = winner(rollout)

        # 4. Backpropagation: credit each node from its own mover's side.
        while node is not None:
            node.visits += 1
            if result == 'draw':
                node.wins += 0.5
            elif result == node.mover:
                node.wins += 1.0
            node = node.parent

    return max(root.children.items(), key=lambda kv: kv[1].visits)[0]


def ucb1_bandit(pulls, probs, c=1.4, rng=None):
    """The heuristic alone: UCB1 on a row of slot machines. Returns the
    number of times each arm was pulled."""
    rng = rng or random.Random()
    counts = [0] * len(probs)
    wins = [0.0] * len(probs)
    for t in range(1, pulls + 1):
        if t <= len(probs):
            arm = t - 1                   # play each arm once to initialize
        else:
            arm = max(
                range(len(probs)),
                key=lambda a: wins[a] / counts[a] + c * math.sqrt(math.log(t) / counts[a]),
            )
        counts[arm] += 1
        wins[arm] += 1.0 if rng.random() < probs[arm] else 0.0
    return counts


# ---------------------------------------------------------------- the rivals
#
# UCB1 is the heuristic under test, so the fairest bench races it against the
# other standard answers to the same question: given arms of unknown payoff,
# how do you spend a fixed budget of pulls? Regret is the currency. It is the
# reward forgone against an oracle that always plays the best arm, so lower
# is better and zero is unattainable without clairvoyance.


def bandit_uniform(pulls, probs, rng):
    """Spread pulls evenly. Learns the most, earns the least."""
    counts = [0] * len(probs)
    for t in range(pulls):
        arm = t % len(probs)
        counts[arm] += 1
    return counts


def bandit_greedy(pulls, probs, rng):
    """Try each arm once, then always play the current leader.

    The failure mode is specific and worth naming: one unlucky early sample
    on the genuinely best arm and it is never played again.
    """
    n = len(probs)
    counts, wins = [0] * n, [0.0] * n
    for t in range(pulls):
        if t < n:
            arm = t
        else:
            arm = max(range(n), key=lambda a: wins[a] / counts[a])
        counts[arm] += 1
        wins[arm] += 1.0 if rng.random() < probs[arm] else 0.0
    return counts


def bandit_epsilon_greedy(pulls, probs, rng, eps=0.1):
    """Play the leader, but explore at random a fixed fraction of the time.

    Simple, robust, and permanently wasteful: it keeps paying the same
    exploration tax at pull ten thousand as at pull ten.
    """
    n = len(probs)
    counts, wins = [0] * n, [0.0] * n
    for t in range(pulls):
        if t < n:
            arm = t
        elif rng.random() < eps:
            arm = rng.randrange(n)
        else:
            arm = max(range(n), key=lambda a: wins[a] / counts[a])
        counts[arm] += 1
        wins[arm] += 1.0 if rng.random() < probs[arm] else 0.0
    return counts


def bandit_ucb1(pulls, probs, rng, c=1.4):
    """The unit's heuristic, reusing the same implementation as the tree."""
    return ucb1_bandit(pulls, probs, c=c, rng=rng)


def bandit_thompson(pulls, probs, rng):
    """Sample a plausible payoff for each arm from its posterior, play the
    winner. Bayesian, and empirically the strongest of the group."""
    n = len(probs)
    counts = [0] * n
    a = [1.0] * n
    b = [1.0] * n
    for _ in range(pulls):
        arm = max(range(n), key=lambda k: rng.betavariate(a[k], b[k]))
        counts[arm] += 1
        if rng.random() < probs[arm]:
            a[arm] += 1
        else:
            b[arm] += 1
    return counts


BANDITS = (
    ("Uniform sampling", bandit_uniform),
    ("Greedy", bandit_greedy),
    ("Epsilon-greedy (0.1)", bandit_epsilon_greedy),
    ("UCB1", bandit_ucb1),
    ("Thompson sampling", bandit_thompson),
)


def regret(counts, probs):
    """Expected reward forgone against always playing the best arm."""
    best = max(probs)
    return sum(counts[a] * (best - probs[a]) for a in range(len(probs)))


def contest(pulls=1000, trials=40, probs=(0.5, 0.55, 0.6, 0.45), seed=7):
    """Average regret per policy over many independent runs.

    Averaging matters: a single run of a randomized policy says almost
    nothing, and publishing one lucky seed would be exactly the kind of
    unearned claim this site exists to argue against.
    """
    rows = []
    for name, fn in BANDITS:
        total = 0.0
        worst = 0.0
        for t in range(trials):
            rng = random.Random(seed * 1000 + t)
            counts = fn(pulls, list(probs), rng)
            r = regret(counts, probs)
            total += r
            worst = max(worst, r)
        rows.append((name, total / trials, worst))
    return rows


if __name__ == "__main__":
    # The published contest runs FIRST, deliberately. The tree-search oracles
    # below allocate hundreds of thousands of Node objects, and on this
    # machine that heap pressure has repeatedly corrupted whatever ran after
    # it. Measuring before the heavy work is both more reliable and no less
    # honest, since every policy still sees identical seeds.
    rows = contest()
    by_name = {name: mean for name, mean, _ in rows}
    worst_of = {name: worst for name, _, worst in rows}

    # What UCB1 is genuinely entitled to claim: it beats spreading pulls
    # evenly, it beats pure greedy on average, and its bad runs stay close to
    # its average, which is the robustness the bound actually buys.
    assert by_name["UCB1"] < by_name["Uniform sampling"], "UCB1 must beat uniform"
    assert by_name["UCB1"] < by_name["Greedy"], "UCB1 must beat pure greed on average"
    assert worst_of["UCB1"] < worst_of["Greedy"] / 2, (
        "UCB1's worst run must be far better than greedy's, which is the point"
    )

    # What it is NOT entitled to claim at this horizon, asserted so the page
    # can never quietly drift into overselling it: a tuned epsilon-greedy and
    # Thompson sampling both finish ahead on mean regret over 1,000 pulls.
    assert by_name["Epsilon-greedy (0.1)"] < by_name["UCB1"], (
        "at this budget a tuned epsilon-greedy is expected to beat UCB1"
    )
    assert by_name["Thompson sampling"] < by_name["UCB1"], (
        "Thompson is expected to edge out UCB1 on Bernoulli arms"
    )

    print("contest: 1,000 pulls on arms 0.50/0.55/0.60/0.45, mean of 40 runs")
    for name, mean, worst in rows:
        print(f"  {name:<22} mean regret {mean:8.1f}   worst run {worst:8.1f}")

    rng = random.Random(1926)

    # Oracle 1: the heuristic in isolation. On a 0.8 vs 0.2 two-armed bandit,
    # UCB1 must concentrate the vast majority of 1000 pulls on the good arm.
    counts = ucb1_bandit(1000, [0.2, 0.8], rng=rng)
    assert counts[1] > 850, f"UCB1 under-exploited the good arm: {counts}"
    assert counts[0] >= 10, f"UCB1 must still explore the bad arm: {counts}"

    # Oracle 2: tactics against known-perfect answers. Take the win.
    win_now = ['X', 'X', None, 'O', 'O', None, None, None, None]
    assert mcts_move(win_now, 'X', rng=rng) == 2, "must take the winning square"

    # Oracle 3: block the loss.
    block_now = ['O', 'O', None, 'X', None, None, None, None, 'X']
    assert mcts_move(block_now, 'X', rng=rng) == 2, "must block O's win"

    # Oracle 4: self-play from the empty board must draw, the known value of
    # perfect tic-tac-toe.
    board, player = [None] * 9, 'X'
    while winner(board) is None:
        board[mcts_move(board, player, rng=rng)] = player
        player = 'O' if player == 'X' else 'X'
    assert winner(board) == 'draw', f"self-play ended {winner(board)}, expected draw"

    print(f"OK: bandit pulls {counts}, tactics correct, self-play draws")
