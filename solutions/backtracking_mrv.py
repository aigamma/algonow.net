# Puzzle 04: Backtracking search x minimum remaining values
# Sudoku: depth-first trial and error, aimed at the tightest cell first.


def candidates(board, cell):
    """Digits that can legally sit in `cell` (0..80) right now."""
    r, c = divmod(cell, 9)
    used = set()
    for i in range(9):
        used.add(board[r * 9 + i])
        used.add(board[i * 9 + c])
    br, bc = 3 * (r // 3), 3 * (c // 3)
    for dr in range(3):
        for dc in range(3):
            used.add(board[(br + dr) * 9 + (bc + dc)])
    return [d for d in range(1, 10) if d not in used]


def solve(board, use_mrv=True, counter=None):
    """Solve in place; return True when a full valid grid stands.

    The algorithm is backtracking: place a legal digit, recurse, and undo on
    failure. The heuristic is minimum remaining values: always work on the
    empty cell with the fewest legal digits. A cell with one candidate is
    free progress; a cell with zero proves the branch dead immediately.
    Without the heuristic the same search works in reading order and learns
    about dead ends only after long detours.
    """
    if counter is not None:
        counter[0] += 1

    empties = [i for i in range(81) if board[i] == 0]
    if not empties:
        return True

    if use_mrv:
        cell = min(empties, key=lambda i: len(candidates(board, i)))
    else:
        cell = empties[0]

    for digit in candidates(board, cell):
        board[cell] = digit
        if solve(board, use_mrv, counter):
            return True
        board[cell] = 0
    return False


def is_valid_solution(board):
    unit_ok = lambda cells: sorted(board[i] for i in cells) == list(range(1, 10))
    rows = all(unit_ok(range(r * 9, r * 9 + 9)) for r in range(9))
    cols = all(unit_ok(range(c, 81, 9)) for c in range(9))
    boxes = all(
        unit_ok([(3 * br + dr) * 9 + (3 * bc + dc) for dr in range(3) for dc in range(3)])
        for br in range(3) for bc in range(3)
    )
    return rows and cols and boxes


def parse(grid):
    return [int(ch) if ch.isdigit() else 0 for ch in grid if ch in '0123456789.']


if __name__ == "__main__":
    # A standard hard-rated puzzle. Both orderings must solve it; the givens
    # must survive; the finished grid must satisfy every row, column, box.
    hard = parse(
        "4.....8.5"
        ".3......."
        "...7....."
        ".2.....6."
        "....8.4.."
        "....1...."
        "...6.3.7."
        "5..2....."
        "1.4......"
    )
    board = hard[:]
    mrv_calls = [0]
    assert solve(board, use_mrv=True, counter=mrv_calls), "MRV failed to solve"
    assert is_valid_solution(board), "solution violates a row, column, or box"
    assert all(board[i] == hard[i] for i in range(81) if hard[i]), "a given was overwritten"

    # The heuristic must earn its keep on a gentler puzzle where the naive
    # order also terminates quickly enough to measure.
    easy = parse(
        "..3.2.6.."
        "9..3.5..1"
        "..18.64.."
        "..81.29.."
        "7.......8"
        "..67.82.."
        "..26.95.."
        "8..2.3..9"
        "..5.1.3.."
    )
    plain_board, plain_calls = easy[:], [0]
    assert solve(plain_board, use_mrv=False, counter=plain_calls)
    assert is_valid_solution(plain_board)
    mrv_board, mrv_calls2 = easy[:], [0]
    assert solve(mrv_board, use_mrv=True, counter=mrv_calls2)
    assert mrv_calls2[0] < plain_calls[0], (
        f"MRV should visit fewer nodes: {mrv_calls2[0]} vs {plain_calls[0]}"
    )

    # A contradictory grid (two 5s in one row) must be refused, not solved.
    broken = easy[:]
    broken[0], broken[1] = 5, 5
    assert not solve(broken, use_mrv=True), "contradictory grid must fail"

    print(f"OK: hard puzzle solved in {mrv_calls[0]} calls with MRV; "
          f"easy puzzle {plain_calls[0]} calls plain -> {mrv_calls2[0]} with MRV")
