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


if __name__ == "__main__":
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
