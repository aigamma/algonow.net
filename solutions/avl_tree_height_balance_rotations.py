# Puzzle 165: AVL tree x Height-balance rotations
# Strictly balanced dictionary: keep a sorted set of keys under insert,
# delete, and lookup, with every operation bounded by a logarithm of the
# size, whatever order the keys arrive in. The algorithm is the binary
# search tree: left subtree smaller, right subtree larger, one comparison
# per level. The heuristic is the AVL height-balance rule (Adelson-Velsky
# and Landis, 1962): every node stores the height of its subtree, the two
# children of any node may differ in height by at most one, and whenever
# an insertion or deletion breaks that rule the tree is repaired on the
# way back up by a single or double rotation at the lowest unbalanced
# node. The rule forces the height below 1.4405 log2(n + 2) - 0.328, so a
# lookup never costs more than about 1.44 log2 n comparisons, and an
# insertion is repaired by at most one rotation (single or double).
#
# Referees:
# (1) A SET REFEREE shadows a mixed workload of 60,000 operations: after
#     every checkpoint the in-order walk of the AVL tree must equal
#     sorted(reference), every lookup must agree with membership in the
#     reference, and the whole tree is audited for the search-tree order,
#     correct stored heights, and balance factors in {-1, 0, +1};
# (2) THE HEIGHT THEOREM, measured: after every insertion batch the
#     height is asserted below the Adelson-Velsky-Landis bound
#     1.4405 log2(n + 2) - 0.328, and against the information-theoretic
#     floor ceil(log2(n + 1)) for a perfectly balanced tree;
# (3) THE ROTATION THEOREM: at most one rebalancing (a single or a double
#     rotation) per insertion, asserted on every one of them; deletions
#     may rotate once per level, and the measured average is reported;
# (4) THE RIVALS on one workload: an unbalanced binary search tree, a
#     treap with random heap priorities, and a left-leaning red-black tree
#     (Sedgewick's formulation of the red-black rules), all held to the
#     same set referee, scored in node visits per lookup and rotations per
#     update, under random arrival and under sorted arrival;
# (5) THE NEGATIVE EXAMPLE, measured: the unbalanced tree under sorted
#     arrival, whose height equals the number of keys.
#
# AUTHOR CORRECTION: the draft expected a double rotation to be rarer
# than a single one by a wide margin on random insertions; measured, the
# two kinds are close to equally common (the draft's claim was an
# intuition, not a theorem), so the page reports the measured split.
import math
import random
import sys

sys.setrecursionlimit(10000)

SEED = 20261010


class Counter:
    """One work currency for every structure: node visits (one per node
    touched on the search path) and rotations."""

    def __init__(self):
        self.visits = 0
        self.rotations = 0
        self.single = 0
        self.double = 0


# ---------------------------------------------------------------- AVL tree

class AVLNode:
    __slots__ = ('key', 'left', 'right', 'height')

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1


def h(node):
    return node.height if node else 0


def update(node):
    node.height = 1 + max(h(node.left), h(node.right))


def balance(node):
    return h(node.left) - h(node.right)


def rotate_right(y, c):
    x = y.left
    y.left = x.right
    x.right = y
    update(y)
    update(x)
    c.rotations += 1
    return x


def rotate_left(x, c):
    y = x.right
    x.right = y.left
    y.left = x
    update(x)
    update(y)
    c.rotations += 1
    return y


def rebalance(node, c):
    """Repair one node after an update. Returns the new subtree root and
    whether a rebalancing (single or double) happened here."""
    update(node)
    b = balance(node)
    if b > 1:
        if balance(node.left) < 0:
            node.left = rotate_left(node.left, c)
            c.double += 1
        else:
            c.single += 1
        return rotate_right(node, c), True
    if b < -1:
        if balance(node.right) > 0:
            node.right = rotate_right(node.right, c)
            c.double += 1
        else:
            c.single += 1
        return rotate_left(node, c), True
    return node, False


class AVLTree:
    def __init__(self, counter):
        self.root = None
        self.c = counter
        self.size = 0
        self.last_rebalances = 0

    def insert(self, key):
        self.last_rebalances = 0
        self.root = self._insert(self.root, key)

    def _insert(self, node, key):
        if node is None:
            self.size += 1
            return AVLNode(key)
        self.c.visits += 1
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        else:
            return node
        node, did = rebalance(node, self.c)
        if did:
            self.last_rebalances += 1
        return node

    def delete(self, key):
        self.last_rebalances = 0
        self.root = self._delete(self.root, key)

    def _delete(self, node, key):
        if node is None:
            return None
        self.c.visits += 1
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif key > node.key:
            node.right = self._delete(node.right, key)
        else:
            self.size -= 1
            if node.left is None:
                return node.right
            if node.right is None:
                return node.left
            # replace by the in-order successor, then delete it below
            succ = node.right
            while succ.left is not None:
                self.c.visits += 1
                succ = succ.left
            node.key = succ.key
            self.size += 1
            node.right = self._delete(node.right, succ.key)
        node, did = rebalance(node, self.c)
        if did:
            self.last_rebalances += 1
        return node

    def contains(self, key):
        node = self.root
        while node is not None:
            self.c.visits += 1
            if key < node.key:
                node = node.left
            elif key > node.key:
                node = node.right
            else:
                return True
        return False

    def height(self):
        return h(self.root)

    def inorder(self):
        out = []
        stack = []
        node = self.root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            out.append(node.key)
            node = node.right
        return out

    def audit(self):
        """Search order, stored heights, and the balance rule at every node."""
        def walk(node, lo, hi):
            if node is None:
                return 0
            assert lo < node.key < hi, 'search order broken'
            hl = walk(node.left, lo, node.key)
            hr = walk(node.right, node.key, hi)
            assert node.height == 1 + max(hl, hr), 'stored height wrong'
            assert abs(hl - hr) <= 1, 'balance rule broken'
            return node.height
        walk(self.root, -math.inf, math.inf)


# ------------------------------------------------- unbalanced search tree

class BSTNode:
    __slots__ = ('key', 'left', 'right')

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


class PlainBST:
    """The baseline: the same search tree with no balance rule at all."""

    def __init__(self, counter):
        self.root = None
        self.c = counter

    def insert(self, key):
        if self.root is None:
            self.root = BSTNode(key)
            return
        node = self.root
        while True:
            self.c.visits += 1
            if key < node.key:
                if node.left is None:
                    node.left = BSTNode(key)
                    return
                node = node.left
            elif key > node.key:
                if node.right is None:
                    node.right = BSTNode(key)
                    return
                node = node.right
            else:
                return

    def contains(self, key):
        node = self.root
        while node is not None:
            self.c.visits += 1
            if key < node.key:
                node = node.left
            elif key > node.key:
                node = node.right
            else:
                return True
        return False

    def delete(self, key):
        parent, node = None, self.root
        while node is not None and node.key != key:
            self.c.visits += 1
            parent = node
            node = node.left if key < node.key else node.right
        if node is None:
            return
        if node.left is not None and node.right is not None:
            sp, s = node, node.right
            while s.left is not None:
                self.c.visits += 1
                sp, s = s, s.left
            node.key = s.key
            parent, node = sp, s
        child = node.left if node.left is not None else node.right
        if parent is None:
            self.root = child
        elif parent.left is node:
            parent.left = child
        else:
            parent.right = child

    def height(self):
        best = 0
        stack = [(self.root, 1)] if self.root else []
        while stack:
            node, d = stack.pop()
            best = max(best, d)
            if node.left:
                stack.append((node.left, d + 1))
            if node.right:
                stack.append((node.right, d + 1))
        return best

    def inorder(self):
        out, stack, node = [], [], self.root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            out.append(node.key)
            node = node.right
        return out


# ------------------------------------------------------------------ treap

class TreapNode:
    __slots__ = ('key', 'pri', 'left', 'right')

    def __init__(self, key, pri):
        self.key = key
        self.pri = pri
        self.left = None
        self.right = None


class Treap:
    """Random heap priorities: expected depth about 2 ln n, no height
    stored, rotations whenever the heap order is violated."""

    def __init__(self, counter, rng):
        self.root = None
        self.c = counter
        self.rng = rng

    def insert(self, key):
        self.root = self._insert(self.root, key, self.rng.random())

    def _insert(self, node, key, pri):
        if node is None:
            return TreapNode(key, pri)
        self.c.visits += 1
        if key < node.key:
            node.left = self._insert(node.left, key, pri)
            if node.left.pri > node.pri:
                x = node.left
                node.left = x.right
                x.right = node
                self.c.rotations += 1
                return x
        elif key > node.key:
            node.right = self._insert(node.right, key, pri)
            if node.right.pri > node.pri:
                y = node.right
                node.right = y.left
                y.left = node
                self.c.rotations += 1
                return y
        return node

    def delete(self, key):
        self.root = self._delete(self.root, key)

    def _delete(self, node, key):
        if node is None:
            return None
        self.c.visits += 1
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif key > node.key:
            node.right = self._delete(node.right, key)
        else:
            if node.left is None:
                return node.right
            if node.right is None:
                return node.left
            # rotate the higher-priority child up, then delete below
            self.c.rotations += 1
            if node.left.pri > node.right.pri:
                x = node.left
                node.left = x.right
                x.right = node
                x.right = self._delete(x.right, key)
                return x
            y = node.right
            node.right = y.left
            y.left = node
            y.left = self._delete(y.left, key)
            return y
        return node

    def contains(self, key):
        node = self.root
        while node is not None:
            self.c.visits += 1
            if key < node.key:
                node = node.left
            elif key > node.key:
                node = node.right
            else:
                return True
        return False

    def height(self):
        best = 0
        stack = [(self.root, 1)] if self.root else []
        while stack:
            node, d = stack.pop()
            best = max(best, d)
            if node.left:
                stack.append((node.left, d + 1))
            if node.right:
                stack.append((node.right, d + 1))
        return best

    def inorder(self):
        out, stack, node = [], [], self.root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            out.append(node.key)
            node = node.right
        return out


# ------------------------------------------- left-leaning red-black tree

RED, BLACK = True, False


class RBNode:
    __slots__ = ('key', 'left', 'right', 'color')

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.color = RED


def is_red(node):
    return node is not None and node.color == RED


class LLRBTree:
    """Sedgewick's left-leaning red-black tree (2008): the red-black rules
    (no two reds in a row, equal black height on every path) kept with
    red links leaning left, so insert and delete are a handful of cases.
    Lookups read only keys; the colors cost nothing on the search path."""

    def __init__(self, counter):
        self.root = None
        self.c = counter

    def _rot_left(self, node):
        x = node.right
        node.right = x.left
        x.left = node
        x.color = node.color
        node.color = RED
        self.c.rotations += 1
        return x

    def _rot_right(self, node):
        x = node.left
        node.left = x.right
        x.right = node
        x.color = node.color
        node.color = RED
        self.c.rotations += 1
        return x

    @staticmethod
    def _flip(node):
        node.color = not node.color
        node.left.color = not node.left.color
        node.right.color = not node.right.color

    def insert(self, key):
        self.root = self._insert(self.root, key)
        self.root.color = BLACK

    def _insert(self, node, key):
        if node is None:
            return RBNode(key)
        self.c.visits += 1
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        if is_red(node.right) and not is_red(node.left):
            node = self._rot_left(node)
        if is_red(node.left) and is_red(node.left.left):
            node = self._rot_right(node)
        if is_red(node.left) and is_red(node.right):
            self._flip(node)
        return node

    def _move_red_left(self, node):
        self._flip(node)
        if is_red(node.right.left):
            node.right = self._rot_right(node.right)
            node = self._rot_left(node)
            self._flip(node)
        return node

    def _move_red_right(self, node):
        self._flip(node)
        if is_red(node.left.left):
            node = self._rot_right(node)
            self._flip(node)
        return node

    def _fix_up(self, node):
        if is_red(node.right):
            node = self._rot_left(node)
        if is_red(node.left) and is_red(node.left.left):
            node = self._rot_right(node)
        if is_red(node.left) and is_red(node.right):
            self._flip(node)
        return node

    def _delete_min(self, node):
        if node.left is None:
            return None
        if not is_red(node.left) and not is_red(node.left.left):
            node = self._move_red_left(node)
        node.left = self._delete_min(node.left)
        return self._fix_up(node)

    def delete(self, key):
        if not self.contains(key):
            return
        if not is_red(self.root.left) and not is_red(self.root.right):
            self.root.color = RED
        self.root = self._delete(self.root, key)
        if self.root is not None:
            self.root.color = BLACK

    def _delete(self, node, key):
        self.c.visits += 1
        if key < node.key:
            if not is_red(node.left) and not is_red(node.left.left):
                node = self._move_red_left(node)
            node.left = self._delete(node.left, key)
        else:
            if is_red(node.left):
                node = self._rot_right(node)
            if key == node.key and node.right is None:
                return None
            if not is_red(node.right) and not is_red(node.right.left):
                node = self._move_red_right(node)
            if key == node.key:
                m = node.right
                while m.left is not None:
                    m = m.left
                node.key = m.key
                node.right = self._delete_min(node.right)
            else:
                node.right = self._delete(node.right, key)
        return self._fix_up(node)

    def contains(self, key):
        node = self.root
        while node is not None:
            self.c.visits += 1
            if key < node.key:
                node = node.left
            elif key > node.key:
                node = node.right
            else:
                return True
        return False

    def height(self):
        best = 0
        stack = [(self.root, 1)] if self.root else []
        while stack:
            node, d = stack.pop()
            best = max(best, d)
            if node.left:
                stack.append((node.left, d + 1))
            if node.right:
                stack.append((node.right, d + 1))
        return best

    def inorder(self):
        out, stack, node = [], [], self.root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            out.append(node.key)
            node = node.right
        return out

    def audit(self):
        """The red-black rules: no red right link, no two reds in a row,
        the same number of black links on every root-to-null path."""
        def walk(node):
            if node is None:
                return 0
            assert not is_red(node.right), 'red right link'
            assert not (is_red(node) and is_red(node.left)), 'two reds in a row'
            bl, br = walk(node.left), walk(node.right)
            assert bl == br, 'black heights differ'
            return bl + (0 if is_red(node) else 1)
        assert not is_red(self.root)
        walk(self.root)


# ------------------------------------------------------------- the race

def avl_bound(n):
    return 1.4405 * math.log2(n + 2) - 0.328


def run_workload(make, keys, rng, lookups=2000, checkpoints=10):
    """Insert all keys, then a mixed phase of deletes and reinserts, with
    the set referee checked at every checkpoint. Returns measurements."""
    c = Counter()
    t = make(c)
    ref = set()
    n = len(keys)
    step = max(1, n // checkpoints)
    heights = []
    for i, k in enumerate(keys, 1):
        t.insert(k)
        ref.add(k)
        if i % step == 0 or i == n:
            assert t.inorder() == sorted(ref), 'in-order walk disagrees with the referee'
            if hasattr(t, 'audit'):
                t.audit()
            heights.append((i, t.height()))
    insert_visits = c.visits
    insert_rotations = c.rotations
    # lookups: half present, half absent
    c.visits = 0
    probes = [rng.choice(keys) for _ in range(lookups // 2)]
    while len(probes) < lookups:
        # absent keys drawn from inside the key range, so a miss walks the
        # tree like a hit does rather than running down one spine
        p = rng.randrange(0, 10 * n)
        if p not in ref:
            probes.append(p)
    for p in probes:
        assert t.contains(p) == (p in ref), 'lookup disagrees with the referee'
    lookup_visits = c.visits / len(probes)
    # the mixed phase: delete a third of the keys, reinsert fresh ones
    c.visits = 0
    c.rotations = 0
    victims = rng.sample(keys, n // 3)
    for i, k in enumerate(victims, 1):
        t.delete(k)
        ref.discard(k)
        if i % max(1, len(victims) // 5) == 0:
            assert t.inorder() == sorted(ref), 'in-order walk disagrees after deletes'
            if hasattr(t, 'audit'):
                t.audit()
    delete_rotations = c.rotations
    fresh = []
    while len(fresh) < len(victims):
        k = rng.randrange(0, 4 * n * 10)
        if k not in ref:
            ref.add(k)
            fresh.append(k)
            t.insert(k)
    assert t.inorder() == sorted(ref), 'in-order walk disagrees after reinserts'
    if hasattr(t, 'audit'):
        t.audit()
    return {
        'insert_visits': insert_visits / n,
        'insert_rotations': insert_rotations / n,
        'lookup_visits': lookup_visits,
        'delete_rotations': delete_rotations / max(1, len(victims)),
        'height': t.height(),
        'heights': heights,
        'counter': c,
        'n': len(ref),
    }


def main():
    rng = random.Random(SEED)
    n = 20000
    keys = rng.sample(range(0, 10 * n), n)
    sorted_keys = sorted(keys)

    # Oracle 1 and 2 and 3: the hero under random arrival, with the
    # per-insertion rotation theorem checked on every single insertion.
    c = Counter()
    hero = AVLTree(c)
    ref = set()
    doubles_before = 0
    max_rebalances = 0
    rebalanced_inserts = 0
    for i, k in enumerate(keys, 1):
        hero.insert(k)
        ref.add(k)
        assert hero.last_rebalances <= 1, 'more than one rebalancing on an insertion'
        rebalanced_inserts += hero.last_rebalances
        max_rebalances = max(max_rebalances, hero.last_rebalances)
        if i in (100, 1000, 5000, 10000, 20000):
            hero.audit()
            assert hero.inorder() == sorted(ref)
            assert hero.height() < avl_bound(i), (i, hero.height(), avl_bound(i))
            assert hero.height() >= math.ceil(math.log2(i + 1))
    height_random = hero.height()
    single_r, double_r = c.single, c.double
    assert hero.size == n and len(ref) == n

    # the hero under sorted arrival, the order that destroys a plain tree
    c2 = Counter()
    hero_sorted = AVLTree(c2)
    for i, k in enumerate(sorted_keys, 1):
        hero_sorted.insert(k)
        assert hero_sorted.last_rebalances <= 1
    hero_sorted.audit()
    assert hero_sorted.inorder() == sorted_keys
    height_sorted = hero_sorted.height()
    assert height_sorted < avl_bound(n)

    # deletions: many levels may rotate; measured, not assumed
    c3 = Counter()
    deltree = AVLTree(c3)
    for k in keys:
        deltree.insert(k)
    c3.rotations = 0
    max_del_rebalances = 0
    victims = rng.sample(keys, n // 2)
    for k in victims:
        deltree.delete(k)
        max_del_rebalances = max(max_del_rebalances, deltree.last_rebalances)
    deltree.audit()
    assert deltree.inorder() == sorted(set(keys) - set(victims))
    del_rot_per_op = c3.rotations / len(victims)

    # Oracle 4: the rivals on one workload, random arrival and sorted arrival.
    rows = {}
    makers = {
        'AVL tree': lambda cc: AVLTree(cc),
        'plain BST': lambda cc: PlainBST(cc),
        'treap': lambda cc: Treap(cc, random.Random(SEED + 1)),
        'red-black (LLRB)': lambda cc: LLRBTree(cc),
    }
    for name, make in makers.items():
        rows[name] = {}
        for order, ks in (('random', keys), ('sorted', sorted_keys)):
            if name == 'plain BST' and order == 'sorted':
                # the quadratic case: a smaller instance, or it never finishes
                small = sorted_keys[:4000]
                cc = Counter()
                t = PlainBST(cc)
                for k in small:
                    t.insert(k)
                assert t.height() == len(small)
                assert t.inorder() == small
                cc.visits = 0
                probes = [rng.choice(small) for _ in range(1000)]
                for p in probes:
                    assert t.contains(p)
                rows[name][order] = {
                    'lookup_visits': cc.visits / len(probes),
                    'height': t.height(),
                    'insert_rotations': 0.0,
                    'delete_rotations': 0.0,
                    'n': len(small),
                }
                continue
            r = run_workload(make, ks, random.Random(SEED + 7))
            rows[name][order] = r

    avl_r, avl_s = rows['AVL tree']['random'], rows['AVL tree']['sorted']
    bst_r = rows['plain BST']['random']
    bst_s = rows['plain BST']['sorted']
    tr_r, tr_s = rows['treap']['random'], rows['treap']['sorted']
    rb_r, rb_s = rows['red-black (LLRB)']['random'], rows['red-black (LLRB)']['sorted']

    # Oracle 5 and the orderings the page states.
    assert bst_s['height'] == 4000, bst_s['height']
    assert bst_s['lookup_visits'] > 100 * avl_s['lookup_visits']
    assert avl_r['height'] < avl_bound(n) and avl_s['height'] < avl_bound(n)
    assert avl_s['height'] <= avl_r['height'], (avl_s['height'], avl_r['height'])
    assert avl_r['lookup_visits'] < bst_r['lookup_visits']
    assert avl_r['lookup_visits'] < tr_r['lookup_visits']
    assert avl_r['height'] < tr_r['height'] and avl_r['height'] <= rb_r['height']
    assert avl_r['insert_rotations'] < tr_r['insert_rotations']
    assert tr_s['height'] < 3 * avl_s['height']

    floor_n = math.ceil(math.log2(n + 1))
    print('contest: an ordered set of 20,000 keys, random arrival and sorted arrival; one currency: node visits per lookup, rotations per update; referee: a Python set')
    print(f'AVL bound 1.4405 log2(n + 2) - 0.328 = {avl_bound(n):.1f} at n = 20,000; perfect-balance floor ceil(log2(n + 1)) = {floor_n}')
    print(f'hero, random arrival: height {height_random}; {single_r:,} single and {double_r:,} double rotations over {n:,} insertions '
          f'({rebalanced_inserts / n:.3f} rebalancings per insertion, max {max_rebalances}); sorted arrival: height {height_sorted}, {c2.single:,} single, {c2.double:,} double')
    print(f'hero, deleting {len(victims):,} of {n:,} keys: {del_rot_per_op:.3f} rotations per deletion, at most {max_del_rebalances} rebalancings on one deletion')
    print(f'{"method":>18} {"order":>7} {"lookup":>8} {"height":>7} {"ins rot":>8} {"del rot":>8}')
    for name in makers:
        for order in ('random', 'sorted'):
            r = rows[name][order]
            print(f'{name:>18} {order:>7} {r["lookup_visits"]:8.2f} {r["height"]:7d} {r["insert_rotations"]:8.3f} {r["delete_rotations"]:8.3f}'
                  + ('   (n = 4,000: quadratic)' if name == 'plain BST' and order == 'sorted' else ''))
    print(f'OK: AVL height {height_random} (random) and {height_sorted} (sorted) under the bound {avl_bound(n):.1f} and above the floor {floor_n}; '
          f'at most one rebalancing per insertion over {n:,} insertions; every checkpoint matched the set referee; '
          f'lookups {avl_r["lookup_visits"]:.2f} visits against treap {tr_r["lookup_visits"]:.2f}, red-black {rb_r["lookup_visits"]:.2f}, plain BST {bst_r["lookup_visits"]:.2f}; '
          f'the plain tree under sorted arrival reaches height {bst_s["height"]:,} at n = 4,000 and {bst_s["lookup_visits"]:.0f} visits per lookup')


if __name__ == '__main__':
    main()
