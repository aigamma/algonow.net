# Puzzle 181: Tower of Hanoi x Recursive halving
# Disk-transfer puzzle: n disks of distinct sizes sit on one of three pegs,
# largest at the bottom. Move the whole tower to another peg, one disk at a
# time, never placing a larger disk on a smaller one, in as few moves as
# possible. The algorithm is the recursion: to move n disks from source to
# target, move the top n - 1 to the spare peg, move the largest disk to the
# target, then move the n - 1 from the spare onto it. The heuristic is the
# halving that the recursion embodies: the largest disk can move exactly
# once, in the middle, and both halves of the plan are the same problem one
# disk smaller, so the move count obeys T(n) = 2 T(n - 1) + 1 = 2^n - 1,
# and that count is optimal, because the largest disk cannot move until the
# other n - 1 are stacked on the one peg it is not on, which already costs
# T(n - 1) moves, and must be moved off again afterward.
#
# Referees:
# (1) LEGALITY AND COUNT: the recursive move list is replayed on simulated
#     pegs for every n from 1 to 20; every move takes the top disk of its
#     source and lands on a larger disk or an empty peg; the count is
#     exactly 2^n - 1 (1,048,575 at n = 20) and the tower ends on the
#     target;
# (2) OPTIMALITY by breadth-first search over the 3^n state graph for n
#     from 1 to 8: the shortest path from the start to the goal has length
#     2^n - 1, and the recursive sequence is such a path (the state after
#     move k is at BFS distance exactly k);
# (3) THE ITERATIVE RULE (the smallest disk moves one step around the pegs
#     on every odd move, in a direction fixed by the parity of n, and the
#     only other legal move is made on every even move) produces the
#     identical move sequence for every n up to 12;
# (4) THE BINARY AND GRAY-CODE CORRESPONDENCES: the disk moved at step k is
#     one plus the number of trailing zeros of k (the ruler sequence), and
#     the bit pattern of which disks have moved an odd number of times after
#     k moves is the reflected binary Gray code of k, checked for every k
#     up to 2^12 - 1;
# (5) FOUR PEGS: the Frame-Stewart recursion (split the tower at k, move
#     the top k with four pegs, the bottom n - k with three, the top k back
#     with four) replayed legally, and its move count equal to the true
#     four-peg optimum found by breadth-first search over 4^n states for n
#     from 1 to 8 (Bousch 2014 proved this holds for every n);
# (6) THE NEGATIVE EXAMPLE, measured: a random legal walk that never undoes
#     its previous move, averaged over trials for n = 3 to 6, against the
#     2^n - 1 of the recursion; and the state count breadth-first search
#     must explore to find what the recursion writes down directly.
#
# AUTHOR CORRECTION: the draft stated that the smallest disk always moves
# clockwise. Measured, the direction depends on the parity of n: for an
# odd number of disks the smallest disk cycles source to target to spare,
# for an even number it cycles source to spare to target; the page states
# the parity rule.
import random
from collections import deque

SEED = 20261010


def recursive_moves(n, src, dst, spare, out):
    if n == 0:
        return
    recursive_moves(n - 1, src, spare, dst, out)
    out.append((n, src, dst))
    recursive_moves(n - 1, spare, dst, src, out)


def replay(n, moves, pegs=3, start=0, target=2):
    """Replay a move list on simulated pegs, asserting legality; returns the
    final peg of every disk."""
    stacks = [[] for _ in range(pegs)]
    stacks[start] = list(range(n, 0, -1))  # largest first; top is the end
    for disk, a, b in moves:
        assert stacks[a] and stacks[a][-1] == disk, 'moved a disk that is not on top'
        assert not stacks[b] or stacks[b][-1] > disk, 'placed a disk on a smaller one'
        stacks[b].append(stacks[a].pop())
    assert stacks[target] == list(range(n, 0, -1)), 'the tower did not arrive'
    return stacks


def state_after(n, moves, start=0):
    """The peg of each disk (index 0 = largest) after a move list."""
    peg = [start] * n
    for disk, a, b in moves:
        peg[n - disk] = b
    return tuple(peg)


def legal_moves(state, pegs):
    """From a state (peg per disk, index 0 largest), the legal moves as
    (disk, from, to) with disk 1 the smallest."""
    n = len(state)
    tops = {}
    for i in range(n):  # largest to smallest, so the last write per peg is the top
        tops[state[i]] = i
    out = []
    for p, i in tops.items():
        for q in range(pegs):
            if q == p:
                continue
            if q not in tops or tops[q] < i:  # smaller index = larger disk below
                out.append((n - i, p, q))
    return out


def bfs_distances(n, pegs, start=0):
    init = tuple([start] * n)
    dist = {init: 0}
    queue = deque([init])
    while queue:
        s = queue.popleft()
        for disk, a, b in legal_moves(s, pegs):
            t = list(s)
            t[n - disk] = b
            t = tuple(t)
            if t not in dist:
                dist[t] = dist[s] + 1
                queue.append(t)
    return dist


def iterative_moves(n, src=0, dst=2, spare=1):
    """Odd steps: the smallest disk moves one peg along its cycle; even steps:
    the single legal move that does not touch the smallest disk."""
    stacks = [[] for _ in range(3)]
    stacks[src] = list(range(n, 0, -1))
    cycle = [src, dst, spare] if n % 2 == 1 else [src, spare, dst]
    pos = 0
    out = []
    total = 2 ** n - 1
    for step in range(1, total + 1):
        if step % 2 == 1:
            a = cycle[pos]
            pos = (pos + 1) % 3
            b = cycle[pos]
            out.append((1, a, b))
            stacks[b].append(stacks[a].pop())
        else:
            others = [p for p in range(3) if p != cycle[pos]]
            x, y = others
            tx = stacks[x][-1] if stacks[x] else None
            ty = stacks[y][-1] if stacks[y] else None
            if tx is not None and (ty is None or tx < ty):
                a, b, disk = x, y, tx
            else:
                a, b, disk = y, x, ty
            out.append((disk, a, b))
            stacks[b].append(stacks[a].pop())
    return out


def ruler(k):
    t = 0
    while k % 2 == 0:
        k //= 2
        t += 1
    return t


def frame_stewart_count(n, memo={0: 0, 1: 1}):
    if n in memo:
        return memo[n]
    best = min(2 * frame_stewart_count(k) + (2 ** (n - k) - 1) for k in range(1, n))
    memo[n] = best
    return best


def frame_stewart_moves(n, src, dst, spares, out, disks=None):
    """Four pegs: spares is a list of two free pegs. disks lists the disk
    numbers of the tower being moved, top last."""
    if disks is None:
        disks = list(range(n, 0, -1))
    if n == 0:
        return
    if n == 1:
        out.append((disks[-1], src, dst))
        return
    # the split that attains the Frame-Stewart minimum
    best_k = min(range(1, n), key=lambda k: 2 * frame_stewart_count(k) + (2 ** (n - k) - 1))
    k = best_k
    top = disks[n - k:]
    bottom = disks[:n - k]
    s1, s2 = spares
    frame_stewart_moves(k, src, s1, [dst, s2], out, top)
    recursive_moves_named(bottom, src, dst, s2, out)
    frame_stewart_moves(k, s1, dst, [src, s2], out, top)


def recursive_moves_named(disks, src, dst, spare, out):
    """Three-peg recursion over an explicit list of disk numbers (bottom first)."""
    if not disks:
        return
    recursive_moves_named(disks[1:], src, spare, dst, out)
    out.append((disks[0], src, dst))
    recursive_moves_named(disks[1:], spare, dst, src, out)


def random_walk(n, rng, cap):
    """Random legal moves that never immediately undo the previous move;
    returns the move count to reach the goal, or None at the cap."""
    state = tuple([0] * n)
    goal = tuple([2] * n)
    last = None
    for step in range(1, cap + 1):
        moves = legal_moves(state, 3)
        if last is not None:
            undo = (last[0], last[2], last[1])
            filtered = [m for m in moves if m != undo]
            if filtered:
                moves = filtered
        disk, a, b = rng.choice(moves)
        s = list(state)
        s[n - disk] = b
        state = tuple(s)
        last = (disk, a, b)
        if state == goal:
            return step
    return None


def main():
    rng = random.Random(SEED)

    # Oracle 1: legality and the count 2^n - 1 for n = 1..20.
    counts = {}
    for n in range(1, 21):
        moves = []
        recursive_moves(n, 0, 2, 1, moves)
        assert len(moves) == 2 ** n - 1, (n, len(moves))
        replay(n, moves)
        counts[n] = len(moves)
    assert counts[20] == 1_048_575

    # Oracle 2: optimality by BFS for n = 1..8, and the recursion as a shortest path.
    bfs_states = {}
    for n in range(1, 9):
        dist = bfs_distances(n, 3)
        goal = tuple([2] * n)
        assert dist[goal] == 2 ** n - 1, (n, dist[goal])
        assert len(dist) == 3 ** n, (n, len(dist))
        bfs_states[n] = len(dist)
        moves = []
        recursive_moves(n, 0, 2, 1, moves)
        for k in range(1, len(moves) + 1):
            assert dist[state_after(n, moves[:k])] == k, (n, k)

    # Oracle 3: the iterative rule reproduces the recursion for n = 1..12.
    for n in range(1, 13):
        rec = []
        recursive_moves(n, 0, 2, 1, rec)
        it = iterative_moves(n)
        assert it == rec, (n, next((i for i, (a, b) in enumerate(zip(it, rec)) if a != b), None))

    # Oracle 4: ruler sequence and Gray code, n = 12.
    n = 12
    moves = []
    recursive_moves(n, 0, 2, 1, moves)
    parity = [0] * (n + 1)
    for k, (disk, a, b) in enumerate(moves, 1):
        assert disk == ruler(k) + 1, (k, disk)
        parity[disk] ^= 1
        gray = k ^ (k >> 1)
        bits = sum(parity[d] << (d - 1) for d in range(1, n + 1))
        assert bits == gray, (k, bits, gray)

    # Oracle 5: Frame-Stewart with four pegs against BFS over 4^n states, n = 1..8.
    fs = {}
    for n in range(1, 9):
        moves = []
        frame_stewart_moves(n, 0, 3, [1, 2], moves)
        replay(n, moves, pegs=4, start=0, target=3)
        assert len(moves) == frame_stewart_count(n), (n, len(moves), frame_stewart_count(n))
        dist4 = bfs_distances(n, 4)
        goal4 = tuple([3] * n)
        assert dist4[goal4] == len(moves), (n, dist4[goal4], len(moves))
        assert len(dist4) == 4 ** n
        fs[n] = (len(moves), 2 ** n - 1, len(dist4))

    # Oracle 6: the random walk.
    walk = {}
    cap = 200_000
    for n in range(3, 7):
        results = [random_walk(n, rng, cap) for _ in range(20)]
        finished = [r for r in results if r is not None]
        walk[n] = (sum(finished) / len(finished) if finished else None, len(finished), min(finished) if finished else None, max(finished) if finished else None)
        assert finished and walk[n][0] > 2 ** n - 1, (n, walk[n])
    assert walk[6][0] > 10 * (2 ** 6 - 1), walk[6]  # measured about ninety times the optimum

    print('contest: move n disks from one peg to another; referee: every move replayed for legality on simulated pegs, breadth-first search over the whole state graph for the true optimum, and the closed forms; one currency: moves made (and states explored, for the search)')
    print('recursive solution: ' + ', '.join(f'n = {n}: {counts[n]:,}' for n in (1, 2, 3, 4, 5, 8, 10, 12, 16, 20)) + ' moves, every one legal, every count 2^n - 1')
    print('breadth-first search on three pegs, n = 1 to 8: optimum ' + ', '.join(str(2 ** n - 1) for n in range(1, 9)) + ' moves over ' + ', '.join(f'{bfs_states[n]:,}' for n in range(1, 9)) + ' states; the recursive sequence is a shortest path at every step')
    print('the iterative rule (smallest disk cycles ' + 'source, target, spare for odd n and source, spare, target for even n' + '; otherwise the only other legal move) reproduced the recursion move for move for n = 1 to 12')
    print('binary: the disk moved at step k is one plus the trailing zeros of k; Gray code: the disks moved an odd number of times after k moves spell the reflected binary code of k; both held for every k below 4,096')
    print(f'{"n":>3} {"three pegs":>11} {"four pegs (Frame-Stewart)":>26} {"BFS optimum, 4 pegs":>20} {"4-peg states":>13}')
    for n in range(1, 9):
        print(f'{n:>3} {2 ** n - 1:>11} {fs[n][0]:>26} {fs[n][0]:>20} {fs[n][2]:>13,}')
    print('random legal walk (no immediate undo), 20 trials each, cap 200,000 moves: ' + '; '.join(f'n = {n}: mean {walk[n][0]:,.0f} moves ({walk[n][2]:,} to {walk[n][3]:,}) against {2 ** n - 1}' for n in range(3, 7)))
    print(f'OK: 2^n - 1 legal moves for every n to 20 ({counts[20]:,} at n = 20), proven optimal by breadth-first search to n = 8 with the recursion as a shortest path; the iterative rule, the ruler sequence, and the Gray code all matched; '
          f'Frame-Stewart equals the four-peg optimum for n = 1 to 8 ({fs[8][0]} against {fs[8][1]} on three pegs); a random walk needs {walk[6][0]:,.0f} moves on average at n = 6 against 63')


if __name__ == '__main__':
    main()
