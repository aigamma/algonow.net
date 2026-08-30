# Puzzle 110: Alpha-beta pruning x iterative deepening move ordering
# Game-tree search, and the paradox every chess engine is built
# on: searching the SAME position at depths one, two, three, up
# to d costs LESS than searching once at depth d blind. The
# reason: alpha-beta's power is hostage to move ordering. With
# the best move tried first everywhere it visits about b^(d/2)
# leaves (Knuth-Moore, 1975): the square root of the tree: with
# random ordering, vastly more. Iterative deepening turns
# yesterday's shallow search into today's ordering oracle: each
# node's best move from depth k goes first at depth k+1, and
# cutoff statistics (the history table) order the rest.
#
# The game model matters and is stated honestly: leaf values are
# built from per-(ply, move) increments plus hash noise: a
# "strongly ordered" tree, the standard model for search
# analysis: because in real games move quality CORRELATES across
# sibling positions (a capture that is good here is often good
# there). A first draft used pure hash-random leaves, where no
# ordering knowledge can transfer between nodes at all, and the
# paradox rightly failed to appear: correlation is the soil the
# heuristic grows in, so the model carries it, and the noise
# term keeps it from being a foregone conclusion.
#
# Referees:
# (1) exhaustive minimax recomputes exact root values on 40
#     random trees and the depth-6 contest tree; every ordering
#     of alpha-beta must match exactly;
# (2) the Knuth-Moore floor demonstrated with oracle ordering;
# (3) at depth 8 (exhaustive unaffordable: 8^8 leaves), three
#     adversarial orderings (random, reversed, ID+history) must
#     agree on the value: agreement is the referee;
# (4) THE PARADOX asserted: ID's total across ALL depths 1..d
#     under one blind depth-d search;
# (5) the mechanism measured: first-move cutoff rates.
import random

SEED = 20260829


class Game:
    """Leaf = sum of per-(ply, move) increments + bounded hash noise."""

    def __init__(self, rng, b, depth, noise=60):
        self.b = b
        self.depth = depth
        self.inc = [[rng.randrange(-100, 101) for _ in range(b)] for _ in range(depth)]
        self.key = rng.randrange(1 << 30)
        self.noise = noise

    def leaf_value(self, path):
        # score from the mover-at-root's perspective, negamax style:
        # ply i's increment favors the player to move at ply i.
        total = 0
        for i, m in enumerate(path):
            total += self.inc[i][m] if i % 2 == 0 else -self.inc[i][m]
        h = 1469598103934665603 ^ self.key
        for m in path:
            h ^= m + 0x9E3779B97F4A7C15
            h = (h * 1099511628211) % (1 << 64)
        return total + (h % (2 * self.noise + 1)) - self.noise


def minimax(g, path, depth, count):
    count[0] += 1
    if depth == 0:
        v = g.leaf_value(path)
        return v if len(path) % 2 == 0 else -v
    best = -10**9
    for m in range(g.b):
        v = -minimax(g, path + (m,), depth - 1, count)
        if v > best:
            best = v
    return best


def alphabeta(g, path, depth, alpha, beta, count, order_of, stats=None, first=None):
    count[0] += 1
    if depth == 0:
        v = g.leaf_value(path)
        return v if len(path) % 2 == 0 else -v
    best = -10**9
    for idx, m in enumerate(order_of(path, depth)):
        v = -alphabeta(g, path + (m,), depth - 1, -beta, -alpha, count, order_of, stats, first)
        if v > best:
            best = v
            if first is not None:
                first[path] = m
        if best > alpha:
            alpha = best
        if alpha >= beta:
            if stats is not None:
                stats['cutoffs'] += 1
                stats['cut_idx'] = stats.get('cut_idx', 0) + idx
                if idx == 0:
                    stats['first_cut'] += 1
            break
    return best


def make_order_random(rng, b):
    def order(path, depth):
        ms = list(range(b))
        rng.shuffle(ms)
        return ms
    return order


def make_order_reversed(b):
    def order(path, depth):
        return list(range(b - 1, -1, -1))
    return order


def make_order_id(table, history, b):
    # history is keyed by (ply, move): the same move index means
    # different things at different plies (real engines key theirs
    # by side-to-move and move for the same reason).
    def order(path, depth):
        ply = len(path)
        ms = sorted(range(b), key=lambda m: -history.get((ply, m), 0))
        bm = table.get(path)
        if bm is not None:
            ms.remove(bm)
            ms.insert(0, bm)
        return ms
    return order


def iterative_deepening(g, depth, count, stats=None, per_depth=None):
    """Depths 1..depth; previous iteration's best move first, the
    rest ordered by the per-ply history table (best-move counts)."""
    table = {}
    history = {}
    v = None
    for d in range(1, depth + 1):
        first = {}
        st = {'cutoffs': 0, 'first_cut': 0}
        c_iter = [0]
        v = alphabeta(g, (), d, -10**9, 10**9, c_iter, make_order_id(table, history, g.b), st, first)
        count[0] += c_iter[0]
        if per_depth is not None:
            per_depth.append(c_iter[0])
        for p, m in first.items():
            k = (len(p), m)
            history[k] = history.get(k, 0) + 1
        if stats is not None and d == depth:
            stats.update(st)
        table = first
    return v


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: exhaustive minimax referee on 40 small trees.
    for trial in range(40):
        b, d = rng.choice([(3, 4), (4, 4), (3, 5)])
        g = Game(rng, b, d)
        c = [0]
        ref = minimax(g, (), d, c)
        c2 = [0]
        assert alphabeta(g, (), d, -10**9, 10**9, c2, make_order_random(rng, b)) == ref, trial
        c3 = [0]
        assert iterative_deepening(g, d, c3) == ref, trial
        assert c2[0] <= c[0]

    # Oracle 2: the Knuth-Moore floor with oracle ordering.
    B0, D0 = 6, 6
    g0 = Game(rng, B0, D0)
    truth = {}

    def fill_truth(path, depth):
        if depth == 0:
            v = g0.leaf_value(path)
            return v if len(path) % 2 == 0 else -v
        vals = [-fill_truth(path + (m,), depth - 1) for m in range(B0)]
        truth[path] = sorted(range(B0), key=lambda m: -vals[m])
        return max(vals)

    ref_val = fill_truth((), D0)
    leaves = [0]

    def ab_oracle(path, depth, alpha, beta):
        if depth == 0:
            leaves[0] += 1
            v = g0.leaf_value(path)
            return v if len(path) % 2 == 0 else -v
        best = -10**9
        for m in truth.get(path, range(B0)):
            v = -ab_oracle(path + (m,), depth - 1, -beta, -alpha)
            best = max(best, v)
            alpha = max(alpha, best)
            if alpha >= beta:
                break
        return best

    assert ab_oracle((), D0, -10**9, 10**9) == ref_val
    km_floor = B0 ** ((D0 + 1) // 2) + B0 ** (D0 // 2) - 1
    assert km_floor <= leaves[0] <= 1.6 * km_floor, (leaves[0], km_floor)

    # The contest tree: b = 8, depth 6 exhaustively refereed, depth 8
    # refereed by three-way ordering agreement.
    B, D = 8, 8
    g = Game(rng, B, D)

    c_mm = [0]
    ref6 = minimax(g, (), 6, c_mm)
    c_blind = [0]
    st_blind = {'cutoffs': 0, 'first_cut': 0}
    assert alphabeta(g, (), 6, -10**9, 10**9, c_blind, make_order_random(rng, B), st_blind) == ref6
    c_id = [0]
    st_id = {}
    per_depth = []
    assert iterative_deepening(g, 6, c_id, st_id, per_depth) == ref6

    # Oracle 4: THE PARADOX: six searches for less than one.
    assert c_id[0] < c_blind[0], (c_id[0], c_blind[0])
    # Oracle 5: the mechanism, two ways. (a) The final iteration
    # alone, riding the tables the earlier ones built, is far under
    # the blind search: the shallow passes more than pay for
    # themselves. (b) Cutoffs arrive earlier in the move list.
    c_last = per_depth[-1]
    assert c_last < 0.55 * c_blind[0], (c_last, c_blind[0])
    idx_id = st_id['cut_idx'] / max(st_id['cutoffs'], 1)
    idx_blind = st_blind['cut_idx'] / max(st_blind['cutoffs'], 1)
    assert idx_id < idx_blind - 0.25, (idx_id, idx_blind)
    rate_id = st_id['first_cut'] / max(st_id['cutoffs'], 1)
    rate_blind = st_blind['first_cut'] / max(st_blind['cutoffs'], 1)

    # Depth 8: three adversarial orderings agree; ID far cheaper.
    c8_rand = [0]
    v8_rand = alphabeta(g, (), 8, -10**9, 10**9, c8_rand, make_order_random(rng, B))
    c8_rev = [0]
    v8_rev = alphabeta(g, (), 8, -10**9, 10**9, c8_rev, make_order_reversed(B))
    c8_id = [0]
    v8_id = iterative_deepening(g, 8, c8_id)
    assert v8_rand == v8_rev == v8_id, (v8_rand, v8_rev, v8_id)
    assert c8_id[0] < 0.4 * c8_rand[0], (c8_id[0], c8_rand[0])

    print('contest: one currency (nodes visited); referees: exhaustive minimax at depth 6, three-way ordering agreement at depth 8 (b = 8, strongly ordered tree + noise)')
    print(f"  {'method':<34} {'depth 6':>10} {'depth 8':>12}")
    print(f"  {'exhaustive minimax':<34} {c_mm[0]:>10,} {'~19.2M (skipped)':>12}   every node, no judgment")
    print(f"  {'alpha-beta, random order':<34} {c_blind[0]:>10,} {c8_rand[0]:>12,}   cutoffs, but late: ordering is everything")
    print(f"  {'alpha-beta + ID ordering (1..d)':<34} {c_id[0]:>10,} {c8_id[0]:>12,}   ALL depths summed: the paradox: d searches < one blind search")
    print(f"the mechanism: the final iteration alone cost {c_last:,} nodes ({100 * c_last / c_blind[0]:.0f}% of blind) riding the tables the shallow passes built; "
          f"mean cutoff index {idx_id:.2f} vs {idx_blind:.2f} (first-move cutoff {rate_id:.0%} vs {rate_blind:.0%})")
    print(f"the Knuth-Moore floor, demonstrated: oracle ordering visits {leaves[0]:,} leaves vs the b^ceil(d/2) + b^floor(d/2) - 1 = {km_floor:,} bound (b=6, d=6)")
    print(f"the model, stated: per-(ply, move) increments + noise (move quality correlates across siblings, as in real games); a pure hash-random draft KILLED the paradox: no correlation, nothing for ordering to learn: and that negative result is part of the lesson")
    print(f'OK: alpha-beta == minimax on 40 trees and the depth-6 contest ({ref6}); the paradox asserted (ID total {c_id[0]:,} < one blind {c_blind[0]:,}); '
          f'the final iteration at {100 * c_last / c_blind[0]:.0f}% of blind with cutoffs at index {idx_id:.2f} vs {idx_blind:.2f}; the Knuth-Moore floor within 1.6x; '
          f'three-way agreement at depth 8 ({v8_id}) with ID at {100 * c8_id[0] / c8_rand[0]:.0f}% of random\'s bill')
