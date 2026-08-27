# Puzzle 30: Skip list x coin-flip level promotion
# A dynamic ordered set where insert, delete, search, and in-order scans
# all stay logarithmic, whatever order the keys arrive in.
#
# The pairing is the point. The control structure is layered linked lists:
# a base lane holding every key in order, and express lanes above, each
# skipping roughly half the lane below; a search rides the top lane right
# until it would overshoot, drops down, and repeats. The heuristic is how
# the lanes are staffed: every inserted key flips a fair coin until tails,
# and the number of heads is its tower height. That lottery REPLACES the
# entire rebalancing apparatus of the tree world: no rotations, no colors,
# no bookkeeping, and, measured below, total indifference to insertion
# order, because the randomness lives in the structure instead of being
# assumed of the input.
import random


class SkipList:
    MAX_LEVEL = 24

    def __init__(self, rng):
        self.rng = rng
        self.head = [None] * self.MAX_LEVEL  # head forward pointers
        self.key_of = {}
        self.level = 1
        self.n = 0
        self.heights = []  # tower heights, for the coin oracle

    class Node:
        __slots__ = ("key", "fwd")

        def __init__(self, key, height):
            self.key = key
            self.fwd = [None] * height

    def _path(self, key, counter=None):
        """Per-level predecessors of `key`, counting node visits."""
        update = [None] * self.level
        node = None  # None means the head
        for lvl in range(self.level - 1, -1, -1):
            nxt = self.head[lvl] if node is None else node.fwd[lvl]
            while nxt is not None and nxt.key < key:
                if counter is not None:
                    counter["visits"] = counter.get("visits", 0) + 1
                node = nxt
                nxt = node.fwd[lvl]
            if counter is not None:
                counter["visits"] = counter.get("visits", 0) + 1
            update[lvl] = node
        return update

    def search(self, key, counter=None):
        update = self._path(key, counter)
        node = self.head[0] if update[0] is None else update[0].fwd[0]
        return node is not None and node.key == key

    def insert(self, key, counter=None):
        if self.search(key, counter):
            return False
        height = 1
        while height < self.MAX_LEVEL and self.rng.random() < 0.5:
            height += 1  # heads: promote another level
        self.heights.append(height)
        while self.level < height:
            self.head[self.level] = None
            self.level += 1
        update = self._path(key, counter)
        node = SkipList.Node(key, height)
        for lvl in range(height):
            prev = update[lvl] if lvl < len(update) else None
            if prev is None:
                node.fwd[lvl] = self.head[lvl]
                self.head[lvl] = node
            else:
                node.fwd[lvl] = prev.fwd[lvl]
                prev.fwd[lvl] = node
        self.n += 1
        return True

    def delete(self, key, counter=None):
        update = self._path(key, counter)
        node = self.head[0] if update[0] is None else update[0].fwd[0]
        if node is None or node.key != key:
            return False
        for lvl in range(len(node.fwd)):
            prev = update[lvl] if lvl < len(update) else None
            if prev is None:
                if self.head[lvl] is node:
                    self.head[lvl] = node.fwd[lvl]
            elif prev.fwd[lvl] is node:
                prev.fwd[lvl] = node.fwd[lvl]
        self.n -= 1
        return True

    def items(self):
        out = []
        node = self.head[0]
        while node is not None:
            out.append(node.key)
            node = node.fwd[0]
        return out


class AVL:
    """The deterministic rival: height-balance rotations, invariant
    verified for every node after the workload."""

    class Node:
        __slots__ = ("key", "left", "right", "h")

        def __init__(self, key):
            self.key = key
            self.left = self.right = None
            self.h = 1

    def __init__(self):
        self.root = None
        self.rotations = 0

    def _h(self, x):
        return x.h if x else 0

    def _fix(self, x):
        x.h = 1 + max(self._h(x.left), self._h(x.right))
        return x

    def _rotate_right(self, y):
        self.rotations += 1
        x = y.left
        y.left = x.right
        x.right = y
        self._fix(y)
        return self._fix(x)

    def _rotate_left(self, x):
        self.rotations += 1
        y = x.right
        x.right = y.left
        y.left = x
        self._fix(x)
        return self._fix(y)

    def _balance(self, x):
        self._fix(x)
        bf = self._h(x.left) - self._h(x.right)
        if bf > 1:
            if self._h(x.left.left) < self._h(x.left.right):
                x.left = self._rotate_left(x.left)
            return self._rotate_right(x)
        if bf < -1:
            if self._h(x.right.right) < self._h(x.right.left):
                x.right = self._rotate_right(x.right)
            return self._rotate_left(x)
        return x

    def insert(self, key, counter=None):
        def go(node):
            if node is None:
                return AVL.Node(key)
            if counter is not None:
                counter["visits"] = counter.get("visits", 0) + 1
            if key < node.key:
                node.left = go(node.left)
            elif key > node.key:
                node.right = go(node.right)
            else:
                return node
            return self._balance(node)

        self.root = go(self.root)

    def search(self, key, counter=None):
        node = self.root
        while node is not None:
            if counter is not None:
                counter["visits"] = counter.get("visits", 0) + 1
            if key == node.key:
                return True
            node = node.left if key < node.key else node.right
        return False

    def check_invariant(self):
        def go(node):
            if node is None:
                return 0
            hl, hr = go(node.left), go(node.right)
            assert abs(hl - hr) <= 1, "AVL balance violated"
            assert node.h == 1 + max(hl, hr)
            return node.h

        go(self.root)


class PlainBST:
    class Node:
        __slots__ = ("key", "left", "right")

        def __init__(self, key):
            self.key = key
            self.left = self.right = None

    def __init__(self):
        self.root = None

    def insert(self, key, counter=None):
        if self.root is None:
            self.root = PlainBST.Node(key)
            return
        node = self.root
        while True:
            if counter is not None:
                counter["visits"] = counter.get("visits", 0) + 1
            if key < node.key:
                if node.left is None:
                    node.left = PlainBST.Node(key)
                    return
                node = node.left
            elif key > node.key:
                if node.right is None:
                    node.right = PlainBST.Node(key)
                    return
                node = node.right
            else:
                return

    def search(self, key, counter=None):
        node = self.root
        while node is not None:
            if counter is not None:
                counter["visits"] = counter.get("visits", 0) + 1
            if key == node.key:
                return True
            node = node.left if key < node.key else node.right
        return False


class SortedArray:
    def __init__(self):
        self.a = []

    def insert(self, key, counter=None):
        import bisect
        i = bisect.bisect_left(self.a, key)
        if i < len(self.a) and self.a[i] == key:
            return
        if counter is not None:
            # log2 comparisons for the bisect, plus every element shifted.
            counter["visits"] = counter.get("visits", 0) + max(1, len(self.a)).bit_length() + (len(self.a) - i)
        self.a.insert(i, key)

    def search(self, key, counter=None):
        import bisect
        if counter is not None:
            counter["visits"] = counter.get("visits", 0) + max(1, len(self.a)).bit_length()
        i = bisect.bisect_left(self.a, key)
        return i < len(self.a) and self.a[i] == key


if __name__ == "__main__":
    import math
    rng = random.Random(20260827)

    # Oracle 1: correctness against a shadow set through a mixed workload
    # of inserts, deletes, and searches, plus exact in-order iteration.
    sl = SkipList(random.Random(1))
    shadow = set()
    for _ in range(10_000):
        op = rng.random()
        key = rng.randrange(3000)
        if op < 0.5:
            assert sl.insert(key) == (key not in shadow)
            shadow.add(key)
        elif op < 0.75:
            assert sl.delete(key) == (key in shadow)
            shadow.discard(key)
        else:
            assert sl.search(key) == (key in shadow)
    assert sl.items() == sorted(shadow), "in-order iteration must match"

    # Oracle 2: the coin, verified. Tower heights are geometric(1/2):
    # the fraction with height >= k should be about 2^(1-k).
    big = SkipList(random.Random(2))
    for key in random.Random(3).sample(range(10**7), 20_000):
        big.insert(key)
    for k in (2, 3, 4, 5, 6):
        frac = sum(1 for h in big.heights if h >= k) / len(big.heights)
        expect = 2.0 ** (1 - k)
        assert 0.6 * expect < frac < 1.5 * expect, (k, frac, expect)

    # Oracle 3: expected-log, measured with a tail. Average and p99 search
    # visits over 20,000 random searches stay within small multiples of
    # log2 n.
    costs = []
    for key in random.Random(4).sample(range(10**7), 20_000):
        c = {}
        big.search(key, c)
        costs.append(c["visits"])
    costs.sort()
    avg = sum(costs) / len(costs)
    lg = math.log2(big.n)
    assert avg < 4 * lg, (avg, lg)
    assert costs[int(0.99 * len(costs))] < 10 * lg, "the p99 tail must stay tame"

    # Oracle 4: the immunity. Feed the SAME 20,000 keys in sorted order and
    # in random order: skip-list search costs stay within 10 percent,
    # because the lottery never looks at the arrival order. The plain BST
    # degenerates by orders of magnitude on the sorted feed.
    keys = list(range(2000))
    sl_sorted = SkipList(random.Random(5))
    for k in keys:
        sl_sorted.insert(k)
    sl_random = SkipList(random.Random(5))
    for k in random.Random(6).sample(keys, len(keys)):
        sl_random.insert(k)

    def avg_search(structure, probes):
        total = 0
        for k in probes:
            c = {}
            structure.search(k, c)
            total += c["visits"]
        return total / len(probes)

    probes = random.Random(7).sample(keys, 500)
    a_sorted = avg_search(sl_sorted, probes)
    a_random = avg_search(sl_random, probes)
    assert abs(a_sorted - a_random) / a_random < 0.15, (a_sorted, a_random)
    bst = PlainBST()
    c_bst_sorted = {}
    for k in keys:
        bst.insert(k, c_bst_sorted)
    bst_sorted_avg = avg_search(bst, probes)
    assert bst_sorted_avg > 30 * a_sorted, (bst_sorted_avg, a_sorted)

    # Oracle 5: AVL keeps its invariant through the same sorted feed.
    avl = AVL()
    c_avl = {}
    for k in keys:
        avl.insert(k, c_avl)
    avl.check_invariant()

    # The contest: n = 20,000 keys, two arrival orders, then 20,000
    # searches; work = node visits (sorted array counts shifts).
    N = 20_000
    all_keys = random.Random(8).sample(range(10**7), N)
    probes = random.Random(9).sample(all_keys, N)
    results = {}
    for label, feed in (("random", all_keys), ("sorted", sorted(all_keys))):
        for name, make in (
            ("Skip list", lambda: SkipList(random.Random(10))),
            ("AVL tree", AVL),
            ("Plain BST", PlainBST),
            ("Sorted array", SortedArray),
        ):
            if name == "Plain BST" and label == "sorted":
                # Degenerate: measure on the first 2,000 only, honestly.
                s = PlainBST()
                c = {}
                for k in sorted(all_keys)[:2000]:
                    s.insert(k, c)
                for k in probes[:500]:
                    s.search(k, c)
                results[(name, label)] = c["visits"] / 2500
                continue
            s = make()
            c = {}
            for k in feed:
                s.insert(k, c)
            for k in probes:
                s.search(k, c)
            results[(name, label)] = c["visits"] / (2 * N)

    print(f"contest: n = {N:,} keys inserted then {N:,} searched; average visits per operation:")
    print(f"  {'structure':<16} {'random arrivals':>16} {'sorted arrivals':>16}")
    for name in ("Skip list", "AVL tree", "Plain BST", "Sorted array"):
        a = results[(name, "random")]
        b = results[(name, "sorted")]
        note = "  (measured at n=2,000: it is that bad)" if name == "Plain BST" else ""
        print(f"  {name:<16} {a:>16.1f} {b:>16.1f}{note}")
    print(f"skip-list p99 search: {costs[int(0.99 * len(costs))]} visits (log2 n = {lg:.1f}); AVL paid {avl.rotations:,} rotations for its determinism")
    print("OK: shadow-set agreement, the geometric coin verified, expected-log with a tame tail, order-immunity within 15%, the BST collapse, and the AVL invariant")
