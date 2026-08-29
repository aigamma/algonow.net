# Puzzle 106: Treap x random heap priorities
# An ordered dictionary from two properties at once: a binary
# SEARCH tree on the keys (in-order = sorted) and a max-HEAP on
# per-key priorities. If the priorities are random, the tree's
# shape is exactly the shape of a BST built by inserting keys in
# random order: expected depth O(log n): no matter what order
# the keys actually arrived in. The adversary who feeds you
# sorted keys, the one who collapses a plain BST into a linked
# list, is powerless: the dice, not the input, decide the shape.
#
# The pairing is the point. The algorithm is the treap (Vuillemin's
# cartesian tree, 1980; randomized by Seidel-Aragon, 1989): one
# structure satisfying both orders, maintained by split and merge.
# The heuristic is the random priority: one uniform draw per key,
# fixed for the key's lifetime, which makes the tree's shape a
# CANONICAL function of the (key, priority) set: this file proves
# that by building the same set in three different insertion
# orders and asserting structural identity.
#
# Referees, ONE currency (node visits per operation):
# (1) a plain Python dict/sorted referee: after every batch of a
#     30,000-op mixed workload, the in-order traversal equals
#     sorted(reference keys) EXACTLY, and every membership probe
#     agrees;
# (2) both invariants audited over the whole tree at every
#     checkpoint: BST order on keys, heap order on priorities;
# (3) split/merge round-trip: split at 500 random keys, sides
#     verified strictly partitioned, merge restores the exact
#     in-order sequence;
# (4) canonical shape: three insertion orders, same (key,
#     priority) pairs, identical structure (preorder equality);
# (5) the depth theorem measured at n = 100,000: average depth
#     within the 2 ln n expectation's neighborhood;
# (6) the adversary measured: sequential keys: the plain BST
#     collapses (2,001 visits per lookup at n = 4,000), the treap
#     does not (~17), and the deterministic-priority "treap"
#     collapses right back (the neverUse, measured).
import math
import random
import sys

sys.setrecursionlimit(20000)
SEED = 20260829


class TNode:
    __slots__ = ('key', 'pri', 'left', 'right')

    def __init__(self, key, pri):
        self.key = key
        self.pri = pri
        self.left = None
        self.right = None


def split(node, key, visits):
    """(keys < key, keys >= key), heap order preserved on both sides."""
    if node is None:
        return None, None
    visits[0] += 1
    if node.key < key:
        left, right = split(node.right, key, visits)
        node.right = left
        return node, right
    left, right = split(node.left, key, visits)
    node.left = right
    return left, node


def merge(a, b, visits):
    """All keys in a < all keys in b; pick the higher priority as root."""
    if a is None:
        return b
    if b is None:
        return a
    visits[0] += 1
    if a.pri >= b.pri:
        a.right = merge(a.right, b, visits)
        return a
    b.left = merge(a, b.left, visits)
    return b


class Treap:
    def __init__(self, rng, pri_of=None):
        self.root = None
        self.rng = rng
        self.pri_of = pri_of  # None: random draws (the heuristic)

    def insert(self, key, visits):
        pri = self.rng.random() if self.pri_of is None else self.pri_of(key)
        if self.contains(key, visits):
            return
        left, right = split(self.root, key, visits)
        self.root = merge(merge(left, TNode(key, pri), visits), right, visits)

    def delete(self, key, visits):
        left, right = split(self.root, key, visits)
        mid, right = split(right, key + 1, visits)
        # mid holds the key (or nothing); drop it
        self.root = merge(left, right, visits)
        return mid is not None

    def contains(self, key, visits):
        node = self.root
        while node is not None:
            visits[0] += 1
            if key == node.key:
                return True
            node = node.left if key < node.key else node.right
        return False


def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.key)
        inorder(node.right, out)


def preorder(node, out):
    if node:
        out.append(node.key)
        preorder(node.left, out)
        preorder(node.right, out)


def audit(node, lo, hi, pri_cap):
    """Both invariants over the whole subtree. Returns node count."""
    if node is None:
        return 0
    assert lo < node.key < hi, (node.key, lo, hi)
    assert node.pri <= pri_cap + 1e-15, (node.pri, pri_cap)
    return 1 + audit(node.left, lo, node.key, node.pri) + audit(node.right, node.key, hi, node.pri)


def depth_stats(node, d=1):
    if node is None:
        return 0, 0, 0
    nl, sl, ml = depth_stats(node.left, d + 1)
    nr, sr, mr = depth_stats(node.right, d + 1)
    return nl + nr + 1, sl + sr + d, max(d, ml, mr)


class PlainBST:
    """The rival: no priorities, no balance: shape = insertion order."""

    def __init__(self):
        self.root = None

    def insert(self, key, visits):
        if self.root is None:
            self.root = TNode(key, 0)
            return
        node = self.root
        while True:
            visits[0] += 1
            if key == node.key:
                return
            nxt = node.left if key < node.key else node.right
            if nxt is None:
                child = TNode(key, 0)
                if key < node.key:
                    node.left = child
                else:
                    node.right = child
                return
            node = nxt

    def contains(self, key, visits):
        node = self.root
        while node is not None:
            visits[0] += 1
            if key == node.key:
                return True
            node = node.left if key < node.key else node.right
        return False


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1 + 2: the 30,000-op mixed workload vs a set referee.
    t = Treap(random.Random(SEED + 1))
    ref = set()
    KEYS = 40_000
    for batch in range(10):
        for _ in range(3_000):
            k = rng.randrange(KEYS)
            r = rng.random()
            v = [0]
            if r < 0.55:
                t.insert(k, v)
                ref.add(k)
            elif r < 0.75:
                t.delete(k, v)
                ref.discard(k)
            else:
                assert t.contains(k, v) == (k in ref), k
        got = []
        inorder(t.root, got)
        assert got == sorted(ref), f'batch {batch}: in-order != sorted reference'
        n_nodes = audit(t.root, -math.inf, math.inf, math.inf)
        assert n_nodes == len(ref)

    # Oracle 3: split/merge round-trip at 500 random keys.
    for _ in range(500):
        k = rng.randrange(KEYS)
        v = [0]
        left, right = split(t.root, k, v)
        lkeys, rkeys = [], []
        inorder(left, lkeys)
        inorder(right, rkeys)
        assert all(x < k for x in lkeys)
        assert all(x >= k for x in rkeys)
        t.root = merge(left, right, v)
        whole = []
        inorder(t.root, whole)
        assert whole == sorted(ref)

    # Oracle 4: canonical shape: three insertion orders, one tree.
    keys = rng.sample(range(10**6), 3_000)
    pri = {k: rng.random() for k in keys}
    shapes = []
    for order in (sorted(keys), sorted(keys, reverse=True), keys):
        tt = Treap(None, pri_of=lambda k: pri[k])
        tt.rng = None
        for k in order:
            tt.insert(k, [0])
        shape = []
        preorder(tt.root, shape)
        shapes.append(shape)
    assert shapes[0] == shapes[1] == shapes[2], 'shape depends on insertion order'

    # Oracle 5: the depth theorem at n = 100,000 random keys.
    big = Treap(random.Random(SEED + 2))
    for k in rng.sample(range(10**9), 100_000):
        big.insert(k, [0])
    n, total, mx = depth_stats(big.root)
    assert n == 100_000
    avg_depth = total / n
    ln_n = math.log(n)
    assert avg_depth < 2.5 * ln_n, avg_depth      # expectation ~ 2 ln n = 23.0
    assert mx < 8 * ln_n, mx

    # Oracle 6 + the contest: the adversary. Sequential keys 0..3999.
    N = 4_000
    seq = list(range(N))
    bst = PlainBST()
    for k in seq:
        bst.insert(k, [0])
    treap_a = Treap(random.Random(SEED + 3))
    for k in seq:
        treap_a.insert(k, [0])
    sick = Treap(None, pri_of=lambda k: -k)  # "priorities" from the keys
    for k in seq:
        sick.insert(k, [0])

    probes = rng.sample(range(N), 1_000)
    vb, vt, vs = [0], [0], [0]
    for k in probes:
        assert bst.contains(k, vb)
        assert treap_a.contains(k, vt)
        assert sick.contains(k, vs)
    bst_l = vb[0] / 1000
    treap_l = vt[0] / 1000
    sick_l = vs[0] / 1000
    assert bst_l > 100 * treap_l, (bst_l, treap_l)
    assert sick_l > 100 * treap_l, (sick_l, treap_l)
    _, _, sick_depth = depth_stats(sick.root)
    assert sick_depth == N  # a linked list wearing a treap costume

    # random-order parity row: the plain BST is FINE on shuffled input.
    shuf = seq[:]
    rng.shuffle(shuf)
    bst_r = PlainBST()
    for k in shuf:
        bst_r.insert(k, [0])
    vbr = [0]
    for k in probes:
        assert bst_r.contains(k, vbr)
    bst_rand_l = vbr[0] / 1000

    # insert cost into a growing sorted array (elements shifted).
    shifted = sum(N - 1 - i for i in range(N)) / N  # avg elements moved, seq inserts

    print('contest: an ordered dictionary under three arrival orders; one currency: node visits per lookup (1,000 probed keys, membership referee-checked)')
    print(f"  {'instance':<30} {'plain bst':>10} {'treap':>8} {'sorted array':>13}")
    print(f"  {'random insertion order':<30} {bst_rand_l:>10.1f} {treap_l:>8.1f} {math.floor(math.log2(N)) + 1:>13}   parity: randomness in the DATA balances the bst for free")
    print(f"  {'sequential insertion order':<30} {bst_l:>10.1f} {treap_l:>8.1f} {math.floor(math.log2(N)) + 1:>13}   the adversary: the bst is a {N:,}-link list; the dice never noticed")
    print(f"  {'insert cost (elements moved)':<30} {'~depth':>10} {'~depth':>8} {shifted:>13,.0f}   the array wins lookups but pays half the array per arrival")
    print(f"the invariants: BST + heap order audited over the whole tree at 10 checkpoints of a 30,000-op workload; in-order == sorted(reference) every time; 500 split/merge round-trips exact")
    print(f"the theorem: n = 100,000 random keys: average depth {avg_depth:.1f} (2 ln n = {2 * ln_n:.1f}), max {mx}; CANONICAL SHAPE: three insertion orders, identical preorder")
    print(f"the neverUse, measured: priorities derived from the keys (pri = -key): depth {sick_depth:,} of {N:,}: {sick_l:.1f} visits per lookup: determinism hands the adversary the dice")
    print(f'OK: treap == reference on a 30,000-op workload with both invariants audited; canonical shape proven across three orders; '
          f'avg depth {avg_depth:.1f} vs 2 ln n = {2 * ln_n:.1f} at n = 100,000; the sequential adversary costs the plain bst {bst_l:,.0f} visits '
          f'per lookup vs the treap\'s {treap_l:.1f}; deterministic priorities collapse to depth {sick_depth:,}')
