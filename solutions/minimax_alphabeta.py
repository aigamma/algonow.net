# Puzzle 03: Minimax x alpha-beta pruning order
# Perfect tic-tac-toe play, with pruning made powerful by move ordering.

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),   # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),   # columns
    (0, 4, 8), (2, 4, 6),              # diagonals
]

# The ordering heuristic: try the center first, then corners, then edges.
# Strong moves examined early make alpha-beta's windows collapse fast.
ORDER = (4, 0, 2, 6, 8, 1, 3, 5, 7)


def winner(board):
    for a, b, c in WIN_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


def alphabeta(board, player, alpha=-2, beta=2, counter=None, ordered=True):
    """Return (value, best_move) for `player` ('X' maximizes, 'O' minimizes).

    Value is +1 for an X win, -1 for an O win, 0 for a draw. Alpha is the
    best value the maximizer can already force; beta the minimizer's. The
    moment a subtree proves value >= beta (or <= alpha), the remaining
    siblings cannot change the ancestor's choice and are never examined.
    """
    if counter is not None:
        counter[0] += 1
    w = winner(board)
    if w == 'X':
        return 1, None
    if w == 'O':
        return -1, None
    moves = [i for i in (ORDER if ordered else range(9)) if board[i] is None]
    if not moves:
        return 0, None

    best_move = moves[0]
    if player == 'X':
        value = -2
        for m in moves:
            board[m] = 'X'
            child, _ = alphabeta(board, 'O', alpha, beta, counter, ordered)
            board[m] = None
            if child > value:
                value, best_move = child, m
            alpha = max(alpha, value)
            if alpha >= beta:
                break                      # the cutoff: O would never allow this line
        return value, best_move
    value = 2
    for m in moves:
        board[m] = 'O'
        child, _ = alphabeta(board, 'X', alpha, beta, counter, ordered)
        board[m] = None
        if child < value:
            value, best_move = child, m
        beta = min(beta, value)
        if beta <= alpha:
            break
    return value, best_move


def minimax_plain(board, player, counter):
    """The unpruned baseline: identical values, exhaustive visits."""
    counter[0] += 1
    w = winner(board)
    if w == 'X':
        return 1
    if w == 'O':
        return -1
    moves = [i for i in range(9) if board[i] is None]
    if not moves:
        return 0
    results = []
    for m in moves:
        board[m] = player
        results.append(minimax_plain(board, 'O' if player == 'X' else 'X', counter))
        board[m] = None
    return max(results) if player == 'X' else min(results)


if __name__ == "__main__":
    # Oracle 1: pruning never changes the answer. Compare against plain
    # minimax from assorted mid-game positions.
    positions = [
        [None] * 9,
        ['X', None, None, None, 'O', None, None, None, None],
        ['X', 'O', 'X', None, 'O', None, None, None, None],
        ['X', 'O', None, None, 'X', None, None, None, 'O'],
    ]
    for pos in positions:
        to_move = 'X' if pos.count('X') == pos.count('O') else 'O'
        plain = minimax_plain(pos[:], to_move, [0])
        pruned, _ = alphabeta(pos[:], to_move)
        assert plain == pruned, f"pruning changed the value at {pos}"

    # Oracle 2: tactical competence. Take the win; block the loss.
    win_now = ['X', 'X', None, 'O', 'O', None, None, None, None]
    assert alphabeta(win_now[:], 'X')[1] == 2, "must take the winning square"
    block_now = ['O', 'O', None, 'X', None, None, None, None, 'X']
    assert alphabeta(block_now[:], 'X')[1] == 2, "must block O's winning square"

    # Oracle 3: perfect play from the empty board is a draw.
    board, player = [None] * 9, 'X'
    while winner(board) is None and any(c is None for c in board):
        _, move = alphabeta(board[:], player)
        board[move] = player
        player = 'O' if player == 'X' else 'X'
    assert winner(board) is None, "perfect vs perfect must draw"

    # Oracle 4: the heuristic earns its keep. Ordered pruning must examine
    # far fewer nodes than plain minimax, and fewer than unordered pruning.
    plain_n, ordered_n, unordered_n = [0], [0], [0]
    minimax_plain([None] * 9, 'X', plain_n)
    alphabeta([None] * 9, 'X', counter=ordered_n, ordered=True)
    alphabeta([None] * 9, 'X', counter=unordered_n, ordered=False)
    assert ordered_n[0] < unordered_n[0] < plain_n[0], (
        f"expected ordered < unordered < plain, got "
        f"{ordered_n[0]} / {unordered_n[0]} / {plain_n[0]}"
    )

    print(f"OK: values match plain minimax; nodes {plain_n[0]} plain -> "
          f"{unordered_n[0]} pruned -> {ordered_n[0]} ordered")
