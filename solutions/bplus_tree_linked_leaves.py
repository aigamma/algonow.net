# Puzzle 71: B+ tree x linked-leaf range scans
# The database index: every value lives in a leaf, internal nodes
# hold nothing but separator keys, and the leaves are chained left to
# right: so a range query is one descent plus a walk along a linked
# list, and every lookup costs exactly the height.
#
# The pairing is the point. The algorithm is the balanced high-fanout
# tree: the live B-tree unit's machinery: splits propagating upward,
# all leaves at one depth. The heuristic is what the B+ variant does
# with it: evict the values from the internal nodes (separators only,
# so fanout rises and height falls) and CHAIN THE LEAVES, so that
# BETWEEN a AND b never re-climbs the tree. Referees: range answers
# equal to sorted-list slices on 300 random ranges, exact; the
# structural invariants (sorted nodes, uniform leaf depth, occupancy)
# asserted after the build; every B+ lookup touching exactly height
# nodes (1,000 lookups, zero variance) while the plain B-tree's
# lookups wander; and the node-touch meter on the same ranges: one
# descent plus leaf hops vs the in-order tree walk that keeps
# re-visiting parents.
import bisect
import random


class Leaf:
    __slots__ = ("keys", "next")

    def __init__(self):
        self.keys = []
        self.next = None


class Internal:
    __slots__ = ("keys", "children")

    def __init__(self):
        self.keys = []      # separators: children[i] holds keys < keys[i]
        self.children = []


class BPlusTree:
    def __init__(self, order):
        self.order = order  # max keys per node
        self.root = Leaf()
        self.height = 1

    def insert(self, k):
        split = self._insert(self.root, k)
        if split is not None:
            sep, right = split
            newroot = Internal()
            newroot.keys = [sep]
            newroot.children = [self.root, right]
            self.root = newroot
            self.height += 1

    def _insert(self, node, k):
        if isinstance(node, Leaf):
            i = bisect.bisect_left(node.keys, k)
            if i < len(node.keys) and node.keys[i] == k:
                return None
            node.keys.insert(i, k)
            if len(node.keys) > self.order:
                right = Leaf()
                mid = len(node.keys) // 2
                right.keys = node.keys[mid:]
                node.keys = node.keys[:mid]
                right.next = node.next
                node.next = right
                return (right.keys[0], right)  # separator COPIES up
            return None
        i = bisect.bisect_right(node.keys, k)
        split = self._insert(node.children[i], k)
        if split is None:
            return None
        sep, right = split
        node.keys.insert(i, sep)
        node.children.insert(i + 1, right)
        if len(node.keys) > self.order:
            mid = len(node.keys) // 2
            up = node.keys[mid]                # separator MOVES up
            r = Internal()
            r.keys = node.keys[mid + 1 :]
            r.children = node.children[mid + 1 :]
            node.keys = node.keys[:mid]
            node.children = node.children[: mid + 1]
            return (up, r)
        return None

    def lookup(self, k, counter=None):
        node = self.root
        while isinstance(node, Internal):
            if counter is not None:
                counter["nodes"] = counter.get("nodes", 0) + 1
            node = node.children[bisect.bisect_right(node.keys, k)]
        if counter is not None:
            counter["nodes"] = counter.get("nodes", 0) + 1
        i = bisect.bisect_left(node.keys, k)
        return i < len(node.keys) and node.keys[i] == k

    def range(self, a, b, counter=None):
        node = self.root
        while isinstance(node, Internal):
            if counter is not None:
                counter["nodes"] = counter.get("nodes", 0) + 1
            node = node.children[bisect.bisect_right(node.keys, a)]
        out = []
        while node is not None:
            if counter is not None:
                counter["nodes"] = counter.get("nodes", 0) + 1
            for k in node.keys:
                if k > b:
                    return out
                if k >= a:
                    out.append(k)
            node = node.next
        return out

    def check_invariants(self):
        depths = set()

        def walk(node, lo, hi, depth):
            assert node.keys == sorted(node.keys)
            for k in node.keys if isinstance(node, Leaf) else []:
                assert (lo is None or k >= lo) and (hi is None or k < hi)
            if isinstance(node, Leaf):
                depths.add(depth)
                return
            assert len(node.children) == len(node.keys) + 1
            if node is not self.root:
                assert len(node.keys) >= self.order // 2 - 1
            bounds = [lo] + list(node.keys) + [hi]
            for i, ch in enumerate(node.children):
                walk(ch, bounds[i], bounds[i + 1], depth + 1)

        walk(self.root, None, None, 1)
        assert len(depths) == 1  # all leaves at one depth
        # the chain covers every leaf in sorted order
        node = self.root
        while isinstance(node, Internal):
            node = node.children[0]
        prev = None
        while node is not None:
            if prev is not None and node.keys:
                assert prev < node.keys[0]
            if node.keys:
                prev = node.keys[-1]
            node = node.next


class BTree:
    """Plain B-tree (values everywhere) for the meters: CLRS-style
    preemptive splits."""

    def __init__(self, t):
        self.t = t
        self.keys = [[]]
        self.kids = [[]]
        self.root = 0

    def _new(self):
        self.keys.append([])
        self.kids.append([])
        return len(self.keys) - 1

    def _split(self, p, i):
        t = self.t
        c = self.kids[p][i]
        r = self._new()
        mid = self.keys[c][t - 1]
        self.keys[r] = self.keys[c][t:]
        self.keys[c] = self.keys[c][: t - 1]
        if self.kids[c]:
            self.kids[r] = self.kids[c][t:]
            self.kids[c] = self.kids[c][:t]
        self.keys[p].insert(i, mid)
        self.kids[p].insert(i + 1, r)

    def insert(self, k):
        if len(self.keys[self.root]) == 2 * self.t - 1:
            new_root = self._new()
            self.kids[new_root] = [self.root]
            self._split(new_root, 0)
            self.root = new_root
        node = self.root
        while True:
            i = bisect.bisect_left(self.keys[node], k)
            if i < len(self.keys[node]) and self.keys[node][i] == k:
                return
            if not self.kids[node]:
                self.keys[node].insert(i, k)
                return
            child = self.kids[node][i]
            if len(self.keys[child]) == 2 * self.t - 1:
                self._split(node, i)
                if k > self.keys[node][i]:
                    i += 1
                elif k == self.keys[node][i]:
                    return
            node = self.kids[node][i]

    def lookup(self, k, counter=None):
        node = self.root
        while True:
            if counter is not None:
                counter["nodes"] = counter.get("nodes", 0) + 1
            i = bisect.bisect_left(self.keys[node], k)
            if i < len(self.keys[node]) and self.keys[node][i] == k:
                return True
            if not self.kids[node]:
                return False
            node = self.kids[node][i]

    def range(self, a, b, counter=None):
        out = []

        def go(node):
            if counter is not None:
                counter["nodes"] = counter.get("nodes", 0) + 1
            ks = self.keys[node]
            kid = self.kids[node]
            lo = bisect.bisect_left(ks, a)
            hi = bisect.bisect_right(ks, b)
            if not kid:
                out.extend(ks[lo:hi])
                return
            for i in range(lo, hi + 1):
                go(kid[i])
                if i < hi:
                    out.append(ks[i])

        go(self.root)
        return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Build both indexes over the same 100,000 timestamped keys.
    N = 100_000
    keys = rng.sample(range(10_000_000), N)
    sorted_keys = sorted(keys)
    bp = BPlusTree(64)
    bt = BTree(32)  # same max node width (63 keys)
    for k in keys:
        bp.insert(k)
        bt.insert(k)
    bp.check_invariants()

    # Oracle 1: range answers equal sorted-list slices, exactly, on
    # 300 random ranges of mixed widths.
    for _ in range(300):
        a = rng.randrange(10_000_000)
        b = a + rng.choice((10, 1_000, 100_000))
        lo = bisect.bisect_left(sorted_keys, a)
        hi = bisect.bisect_right(sorted_keys, b)
        want = sorted_keys[lo:hi]
        assert bp.range(a, b) == want
        assert bt.range(a, b) == want

    # Oracle 2: membership on hits and misses.
    ks = set(keys)
    for _ in range(2_000):
        q = rng.randrange(10_000_000)
        assert bp.lookup(q) == (q in ks)
        assert bt.lookup(q) == (q in ks)

    # Oracle 3: uniform depth. Every B+ lookup touches EXACTLY height
    # nodes: zero variance across 1,000 lookups: while the plain
    # B-tree's early exits scatter.
    bp_touch = set()
    bt_touch = []
    for _ in range(1_000):
        q = rng.choice(keys)
        c1, c2 = {}, {}
        bp.lookup(q, c1)
        bt.lookup(q, c2)
        bp_touch.add(c1["nodes"])
        bt_touch.append(c2["nodes"])
    assert bp_touch == {bp.height}
    assert min(bt_touch) < max(bt_touch)  # the B-tree's answers wander

    # Oracle 4: TWO meters, two truths. Touch count first: in RAM,
    # with equal node widths, the in-order walk is nearly as cheap
    # as the chain: an honest wash. The B+ tree's real win is the
    # SHAPE of the touches: leaves laid out in chain order are read
    # sequentially, while the B-tree's walk jumps between pages
    # scattered by splits. The seek meter counts non-consecutive
    # page transitions under each structure's natural layout: B+
    # leaves numbered along the chain (databases lay them out this
    # way for exactly this reason), B-tree nodes numbered in
    # creation order.
    leaf_page = {}
    node = bp.root
    while isinstance(node, Internal):
        node = node.children[0]
    pg = 0
    while node is not None:
        leaf_page[id(node)] = pg
        pg += 1
        node = node.next

    def bp_range_seeks(a, b):
        node = bp.root
        seeks = len_seq = 0
        seeks += bp.height - 1  # internal descent: scattered pages
        while isinstance(node, Internal):
            node = node.children[bisect.bisect_right(node.keys, a)]
        prev = None
        while node is not None:
            p = leaf_page[id(node)]
            if prev is None or p != prev + 1:
                seeks += 1
            else:
                len_seq += 1
            prev = p
            if node.keys and node.keys[-1] > b:
                break
            node = node.next
        return seeks, len_seq

    def bt_range_seeks(a, b):
        visits = []

        def go(nd):
            visits.append(nd)
            ks = bt.keys[nd]
            kid = bt.kids[nd]
            lo = bisect.bisect_left(ks, a)
            hi = bisect.bisect_right(ks, b)
            if not kid:
                return
            for i in range(lo, hi + 1):
                go(kid[i])

        go(bt.root)
        seeks = 0
        prev = None
        for nd in visits:
            if prev is None or nd != prev + 1:
                seeks += 1
            prev = nd
        return seeks

    bp_nodes = bt_nodes = bp_seeks = bt_seeks = bp_seq = 0
    rows = 0
    for _ in range(60):
        a = rng.randrange(9_000_000)
        b = a + 100_000  # ~1,000 keys at this density
        c1, c2 = {}, {}
        r1 = bp.range(a, b, c1)
        r2 = bt.range(a, b, c2)
        assert r1 == r2
        rows += len(r1)
        bp_nodes += c1["nodes"]
        bt_nodes += c2["nodes"]
        sk, sq = bp_range_seeks(a, b)
        bp_seeks += sk
        bp_seq += sq
        bt_seeks += bt_range_seeks(a, b)
    assert bp_nodes < bt_nodes          # the wash, still a win on paper
    assert bp_seeks * 4 < bt_seeks      # the chain's real earnings: sequential I/O
    avg_leaf = rows / max(bp_nodes - 60 * bp.height, 1)

    print(f"contest: 60 range scans of ~1,000 rows each over a 100,000-key index (same node width, 63 keys); referee: every answer equal to the sorted-list slice, 300 ranges + 2,000 lookups")
    print(f"  {'index':<24} {'node touches':>12} {'disk seeks':>11}   shape of the work")
    print(f"  {'B-tree (live unit)':<24} {bt_nodes:>12,} {bt_seeks:>11,}   in-order walk over pages scattered by splits")
    print(f"  {'B+ tree (this unit)':<24} {bp_nodes:>12,} {bp_seeks:>11,}   descent, then the chain read in a straight line")
    print(f"the honest pair of truths: touch counts nearly tie ({bt_nodes/bp_nodes:.2f}x): in RAM the walk is fine: but the chain turns {bp_seq:,} of the B+ tree's page transitions SEQUENTIAL, leaving {bp_seeks:,} seeks vs {bt_seeks:,} ({bt_seeks/bp_seeks:.0f}x): the win was never fewer touches, it is touches in a straight line")
    print(f"the uniform-depth property: 1,000 B+ lookups each touched exactly {bp.height} nodes (zero variance); the B-tree's touched {min(bt_touch)}..{max(bt_touch)}: predictability is a latency contract")
    print(f"the leaf chain carried ~{avg_leaf:.0f} rows per hop; the fanout arithmetic: with 4KB pages, separator-only internals hold ~256 pointers vs ~60 for inline rows: height 4 vs 5 at 10^8 rows, one seek saved per lookup")
    print("OK: 300 ranges slice-exact on both trees, 2,000 memberships, invariants (sorted nodes, uniform leaf depth, occupancy, ordered chain) asserted, zero-variance B+ lookups vs the wandering B-tree, the touch-count wash reported honestly, and the seek meter won 4x+ by the chain")
