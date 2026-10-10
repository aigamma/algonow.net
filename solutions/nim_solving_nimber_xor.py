# Puzzle 175: Nim solving x Nimber XOR
# Combinatorial game: heaps of counters, two players alternate, a move
# takes any positive number of counters from one heap, and the player who
# takes the last counter wins (normal play). Decide who wins from any
# position and produce the winning move. The algorithm is game solving by
# backward induction: a position is a previous-player win (a P-position)
# when every move leads to a next-player win, and a next-player win (an
# N-position) when some move leads to a P-position; the full game tree
# settles it, at a cost that grows with every heap. The heuristic is the
# nimber: write each heap in binary and XOR the heaps together (Bouton
# 1901). The position is P exactly when the XOR is zero, and from a
# nonzero XOR s there is always a heap h with h XOR s < h; reducing it to
# h XOR s restores zero. The Sprague-Grundy theorem (1935, 1939) makes
# the same number the value of EVERY impartial game: a position's Grundy
# number is the minimum excluded value of its options, a sum of games has
# the XOR of their Grundy numbers, and the whole sum is a loss for the
# player to move exactly when that XOR is zero.
#
# Referees:
# (1) EXHAUSTIVE SOLVING: every Nim position with up to three heaps of at
#     most fifteen counters and up to four heaps of at most nine (sorted
#     canonical positions, backward induction over the whole state space)
#     is labeled P or N, and the label must equal "nim-sum is zero" on
#     every one; from every N-position Bouton's move must lead to a
#     labeled P-position;
# (2) SPRAGUE-GRUNDY, measured: Grundy numbers of the subtraction game
#     with moves {1, 3, 4} computed by minimum excluded value, then the
#     Grundy number of every two-component sum (and of a Nim heap plus a
#     subtraction heap) computed directly by mex over the sum's own
#     options, which must equal the XOR of the components on every pair;
# (3) MISERE PLAY (the player who takes the last counter loses): every
#     position solved exhaustively, and the label must equal the known
#     rule: with some heap of size two or more the XOR rule stands, with
#     every heap at most one the rule flips;
# (4) THE RACE over 2,000 random positions (three to five heaps of one to
#     twenty counters): the XOR player moving first from a nonzero nim-sum
#     against a random mover, a greedy mover (take the largest heap), and
#     a cautious mover (take one from the largest heap) must win every
#     game; moving second from a zero nim-sum it must win every game; the
#     opponents are scored against each other too; work is counted in
#     heap inspections for the XOR player and in positions evaluated for
#     the solver;
# (5) THE COST OF SOLVING WITHOUT THE NUMBER, measured: plain minimax
#     (no memo) node counts on three equal heaps of one to six, against
#     the memoized solver's distinct positions and the XOR rule's three
#     operations.
#
# AUTHOR CORRECTION: the draft expected the greedy mover (take the whole
# largest heap) to beat a random mover most of the time. Measured, moving
# first from positions where a perfect player wins every game, it wins
# 1,255 of 2,000 against random play, against 1,032 for random versus
# random: emptying a heap mostly hands the opponent a smaller game with
# the same odds, so the greedy rule is a slight edge, not a strategy, and
# the page says so with the numbers.
import itertools
import random
from functools import lru_cache

SEED = 20261010


def nim_sum(heaps):
    s = 0
    for h in heaps:
        s ^= h
    return s


def bouton_move(heaps, work=None):
    """Bouton 1901: from nonzero nim-sum s, reduce a heap h with h ^ s < h
    to h ^ s. Returns (index, new size) or None when the nim-sum is zero."""
    s = nim_sum(heaps)
    if work is not None:
        work['inspections'] += len(heaps)
    if s == 0:
        return None
    for i, h in enumerate(heaps):
        if work is not None:
            work['inspections'] += 1
        if h ^ s < h:
            return i, h ^ s
    raise AssertionError('Bouton guarantees a reducible heap')


# ------------------------------------------------ exhaustive solving

def moves(pos):
    """All positions reachable in one move, as sorted tuples with zeros kept."""
    out = set()
    for i, h in enumerate(pos):
        for k in range(h):
            nxt = list(pos)
            nxt[i] = k
            out.add(tuple(sorted(nxt)))
    return out


def solve_normal(positions):
    """Backward induction in order of total counters: a position is N when
    some move reaches a P-position. Returns {position: 'P' or 'N'}."""
    label = {}
    for pos in sorted(positions, key=sum):
        label[pos] = 'N' if any(label[m] == 'P' for m in moves(pos)) else 'P'
    return label


def solve_misere(positions):
    label = {}
    for pos in sorted(positions, key=sum):
        if sum(pos) == 0:
            label[pos] = 'N'  # the previous player took the last counter and lost: the player to move has won
            continue
        label[pos] = 'N' if any(label[m] == 'P' for m in moves(pos)) else 'P'
    return label


def misere_rule(pos):
    if max(pos) >= 2:
        return 'P' if nim_sum(pos) == 0 else 'N'
    return 'P' if nim_sum(pos) == 1 else 'N'


def all_positions(heaps, max_size):
    return {tuple(sorted(p)) for p in itertools.product(range(max_size + 1), repeat=heaps)}


# --------------------------------------------------- Sprague-Grundy

def mex(values):
    g = 0
    while g in values:
        g += 1
    return g


def grundy_subtraction(n, subtraction_set, cache):
    if n in cache:
        return cache[n]
    opts = {grundy_subtraction(n - s, subtraction_set, cache) for s in subtraction_set if s <= n}
    cache[n] = mex(opts)
    return cache[n]


def grundy_sum_direct(a, b, subtraction_set, cache):
    """Grundy number of the sum of two subtraction heaps computed from the
    sum's OWN options (a move in either component), with no appeal to XOR."""
    key = (a, b)
    if key in cache:
        return cache[key]
    opts = set()
    for s in subtraction_set:
        if s <= a:
            opts.add(grundy_sum_direct(a - s, b, subtraction_set, cache))
        if s <= b:
            opts.add(grundy_sum_direct(a, b - s, subtraction_set, cache))
    cache[key] = mex(opts)
    return cache[key]


def grundy_mixed_direct(nim_heap, sub_heap, subtraction_set, cache):
    key = (nim_heap, sub_heap)
    if key in cache:
        return cache[key]
    opts = set()
    for k in range(nim_heap):
        opts.add(grundy_mixed_direct(k, sub_heap, subtraction_set, cache))
    for s in subtraction_set:
        if s <= sub_heap:
            opts.add(grundy_mixed_direct(nim_heap, sub_heap - s, subtraction_set, cache))
    cache[key] = mex(opts)
    return cache[key]


# ------------------------------------------------------------- players

def play_xor(heaps, rng, work):
    mv = bouton_move(heaps, work)
    if mv is None:
        # losing position: any legal move; take one from the largest heap
        i = max(range(len(heaps)), key=lambda j: heaps[j])
        return i, heaps[i] - 1
    return mv


def play_random(heaps, rng, work):
    nonempty = [i for i, h in enumerate(heaps) if h > 0]
    i = rng.choice(nonempty)
    return i, rng.randrange(heaps[i])


def play_greedy(heaps, rng, work):
    i = max(range(len(heaps)), key=lambda j: heaps[j])
    return i, 0


def play_cautious(heaps, rng, work):
    i = max(range(len(heaps)), key=lambda j: heaps[j])
    return i, heaps[i] - 1


def make_solver_player():
    @lru_cache(maxsize=None)
    def is_n(pos):
        return any(not is_n(m) for m in moves(pos))

    def play(heaps, rng, work):
        pos = tuple(heaps)
        for i, h in enumerate(pos):
            for k in range(h):
                nxt = list(pos)
                nxt[i] = k
                if not is_n(tuple(sorted(nxt))):
                    work['positions'] = is_n.cache_info().currsize
                    return i, k
        work['positions'] = is_n.cache_info().currsize
        i = max(range(len(pos)), key=lambda j: pos[j])
        return i, pos[i] - 1

    return play, is_n


def play_game(start, first, second, rng, work_first, work_second):
    heaps = list(start)
    players = (first, second)
    works = (work_first, work_second)
    turn = 0
    while sum(heaps) > 0:
        i, new = players[turn](heaps, rng, works[turn])
        assert 0 <= new < heaps[i], 'illegal move'
        heaps[i] = new
        if sum(heaps) == 0:
            return turn  # the player who took the last counter wins (normal play)
        turn ^= 1
    raise AssertionError('empty start')


# ---------------------------------------------- plain minimax cost

def minimax_nodes(pos, memo=None, counter=None):
    counter[0] += 1
    if memo is not None:
        key = tuple(sorted(pos))
        if key in memo:
            return memo[key]
    result = False
    for i, h in enumerate(pos):
        for k in range(h):
            nxt = list(pos)
            nxt[i] = k
            if not minimax_nodes(tuple(nxt), memo, counter):
                result = True
                break
        if result:
            break
    if memo is not None:
        memo[tuple(sorted(pos))] = result
    return result


def main():
    rng = random.Random(SEED)

    # Oracle 1: exhaustive normal play against the XOR rule.
    checked = 0
    bouton_checked = 0
    for heaps, size in ((3, 15), (4, 9)):
        positions = all_positions(heaps, size)
        label = solve_normal(positions)
        for pos, lab in label.items():
            assert lab == ('P' if nim_sum(pos) == 0 else 'N'), pos
            checked += 1
            if lab == 'N':
                i, new = bouton_move(list(pos))
                nxt = list(pos)
                nxt[i] = new
                assert label[tuple(sorted(nxt))] == 'P', pos
                bouton_checked += 1
    n_positions_3 = len(all_positions(3, 15))
    n_positions_4 = len(all_positions(4, 9))

    # Oracle 2: Sprague-Grundy on the subtraction game {1, 3, 4} and a mixed sum.
    S = (1, 3, 4)
    gcache = {}
    grundy = [grundy_subtraction(n, S, gcache) for n in range(41)]
    period = 7
    assert all(grundy[n] == grundy[n + period] for n in range(41 - period)), grundy
    sum_cache = {}
    pairs_checked = 0
    for a in range(31):
        for b in range(31):
            assert grundy_sum_direct(a, b, S, sum_cache) == (grundy[a] ^ grundy[b]), (a, b)
            pairs_checked += 1
    mixed_cache = {}
    mixed_checked = 0
    for h in range(13):
        for b in range(21):
            assert grundy_mixed_direct(h, b, S, mixed_cache) == (h ^ grundy[b]), (h, b)
            mixed_checked += 1

    # Oracle 3: misere play.
    misere_checked = 0
    for heaps, size in ((3, 12), (4, 7)):
        positions = all_positions(heaps, size)
        label = solve_misere(positions)
        for pos, lab in label.items():
            if sum(pos) == 0:
                continue
            assert lab == misere_rule(pos), (pos, lab)
            misere_checked += 1

    # Oracle 4: the race.
    starts_nonzero = []
    starts_zero = []
    while len(starts_nonzero) < 2000 or len(starts_zero) < 2000:
        k = rng.randint(3, 5)
        heaps = [rng.randint(1, 20) for _ in range(k)]
        if nim_sum(heaps) != 0:
            if len(starts_nonzero) < 2000:
                starts_nonzero.append(heaps)
        elif len(starts_zero) < 2000:
            starts_zero.append(heaps)
    solver_play, solver_cache = make_solver_player()
    opponents = {
        'random mover': play_random,
        'greedy (take the largest heap)': play_greedy,
        'cautious (one from the largest heap)': play_cautious,
        'memoized solver': solver_play,
    }
    results = {}
    xor_work = {'inspections': 0}
    for name, opp in opponents.items():
        w_opp = {'inspections': 0, 'positions': 0}
        wins_first = sum(1 for s in starts_nonzero if play_game(s, play_xor, opp, rng, xor_work, w_opp) == 0)
        wins_second = sum(1 for s in starts_zero if play_game(s, opp, play_xor, rng, w_opp, xor_work) == 1)
        results[name] = (wins_first, wins_second, w_opp)
        if name != 'memoized solver':
            assert wins_first == 2000 and wins_second == 2000, (name, wins_first, wins_second)
    # the solver is optimal too: from a nonzero start the first mover wins, so the
    # XOR player (first) must win all; from a zero start the solver (first) must lose all
    assert results['memoized solver'][0] == 2000 and results['memoized solver'][1] == 2000
    solver_positions = solver_cache.cache_info().currsize
    # opponents against each other, 2,000 games each from the nonzero starts
    rr = sum(1 for s in starts_nonzero if play_game(s, play_random, play_random, rng, {'inspections': 0}, {'inspections': 0}) == 0)
    gr = sum(1 for s in starts_nonzero if play_game(s, play_greedy, play_random, rng, {'inspections': 0}, {'inspections': 0}) == 0)
    cr = sum(1 for s in starts_nonzero if play_game(s, play_cautious, play_random, rng, {'inspections': 0}, {'inspections': 0}) == 0)
    games = 4 * 4000
    assert rr < 1300 and gr < 1300, (rr, gr)

    # Oracle 5: the cost of solving without the number.
    costs = []
    for n in range(1, 7):
        pos = (n, n, n)
        plain = [0]
        minimax_nodes(pos, None, plain)
        memo_counter = [0]
        memo = {}
        minimax_nodes(pos, memo, memo_counter)
        costs.append((n, plain[0], len(memo)))
    assert costs[-1][1] > 50 * costs[-1][2], costs[-1]
    assert all(costs[i + 1][1] > 2 * costs[i][1] for i in range(len(costs) - 1))

    print('contest: Nim, normal play; referees: exhaustive backward induction over every position with up to three heaps of fifteen and four heaps of nine, the Sprague-Grundy sums computed from their own options, and 2,000 random starting positions per matchup')
    print(f'exhaustive: {checked:,} canonical positions ({n_positions_3:,} with three heaps up to 15, {n_positions_4:,} with four heaps up to 9) labeled P or N; every label equals "nim-sum is zero"; Bouton’s move from every one of the {bouton_checked:,} N-positions reached a P-position')
    print(f'Sprague-Grundy: subtraction game {{1, 3, 4}} Grundy numbers {grundy[:12]} ... period {period}; the Grundy number of every two-heap sum ({pairs_checked} pairs) and of every Nim-heap-plus-subtraction-heap sum ({mixed_checked} pairs), computed by mex over the sum’s own options, equals the XOR of the components')
    print(f'misere: {misere_checked:,} positions solved exhaustively; every label matches the rule (XOR rule while some heap is at least two; flipped when every heap is at most one)')
    print(f'{"matchup":>44} {"XOR first (nonzero start)":>26} {"XOR second (zero start)":>24}  opponent work')
    for name, (wf, ws, w) in results.items():
        work_note = f'{w["positions"]:,} positions memoized' if name == 'memoized solver' else 'heap scans only'
        print(f'{"XOR player vs " + name:>44} {wf:>14} / 2000 {ws:>14} / 2000  {work_note}')
    print(f'XOR player work: {xor_work["inspections"]:,} heap inspections over {games:,} games ({xor_work["inspections"] / games:.1f} per game)')
    print(f'the opponents against each other, first mover from the same nonzero starts: random vs random {rr} / 2000, greedy vs random {gr} / 2000, cautious vs random {cr} / 2000')
    print(f'{"heaps":>8} {"plain minimax nodes":>20} {"memoized positions":>19} {"XOR":>5}')
    for n, plain, memod in costs:
        print(f'{f"({n}, {n}, {n})":>8} {plain:>20,} {memod:>19,} {3:>5}')
    print(f'OK: the XOR rule matched exhaustive solving on {checked:,} positions and Bouton’s move on {bouton_checked:,}; Sprague-Grundy held on {pairs_checked + mixed_checked} sums; misere matched on {misere_checked:,}; '
          f'the XOR player won {sum(r[0] for r in results.values())} of {4 * 2000} games moving first and {sum(r[1] for r in results.values())} of {4 * 2000} moving second; plain minimax {costs[-1][1]:,} nodes on (6, 6, 6) against {costs[-1][2]:,} memoized positions and three XOR operations')


if __name__ == '__main__':
    main()
