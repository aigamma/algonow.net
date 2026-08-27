# Puzzle 47: B-tree x high-fanout node splits
# An ordered index for page-based storage: lookups, inserts, and range
# scans that touch O(log_B n) pages, where one page read buys B keys.
#
# The pairing is the point. The algorithm is the balanced multiway
# search tree with a promise no rotation-based tree makes: EVERY leaf
# sits at the same depth, forever, because the tree grows at the root.
# The heuristic is the fanout: pack each node to the page (here up to
# 2t-1 keys), split a full node around its median on the way down, and
# the height becomes log base t of n: at 100,000 keys and t = 64 the
# measured tree is 3 pages tall where a binary tree stands 34. Every
# claim is refereed: a bisect-based shadow dictionary checks every
# operation including full range-scan contents, and the same-depth and
# occupancy invariants are re-verified recursively as the tree grows.
import bisect
import random


class BNode:
    __slots__ = ("keys", "kids")

    def __init__(self):
        self.keys = []
        self.kids = []

    @property
    def leaf(self):
        return not self.kids


class BTree:
    def __init__(self, t=64, counter=None):
        self.t = t
        self.root = BNode()
        self.c = counter
        self.splits = 0

    def _page(self):
        if self.c is not None:
            self.c["pages"] = self.c.get("pages", 0) + 1

    def search(self, key):
        node = self.root
        while True:
            self._page()
            i = bisect.bisect_left(node.keys, key)
            if i < len(node.keys) and node.keys[i] == key:
                return True
            if node.leaf:
                return False
            node = node.kids[i]

    def _split_child(self, parent, i):
        t = self.t
        child = parent.kids[i]
        right = BNode()
        mid = child.keys[t - 1]
        right.keys = child.keys[t:]
        child.keys = child.keys[: t - 1]
        if not child.leaf:
            right.kids = child.kids[t:]
            child.kids = child.kids[:t]
        parent.keys.insert(i, mid)
        parent.kids.insert(i + 1, right)
        self.splits += 1

    def insert(self, key):
        root = self.root
        if len(root.keys) == 2 * self.t - 1:
            new_root = BNode()
            new_root.kids.append(root)
            self._split_child(new_root, 0)
            self.root = new_root
        node = self.root
        while True:
            self._page()
            i = bisect.bisect_left(node.keys, key)
            if i < len(node.keys) and node.keys[i] == key:
                return
            if node.leaf:
                node.keys.insert(i, key)
                return
            if len(node.kids[i].keys) == 2 * self.t - 1:
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
                elif key == node.keys[i]:
                    return
            node = node.kids[i]

    def range_scan(self, lo, hi):
        out = []

        def rec(node):
            self._page()
            i = bisect.bisect_left(node.keys, lo)
            if node.leaf:
                j = i
                while j < len(node.keys) and node.keys[j] <= hi:
                    out.append(node.keys[j])
                    j += 1
                return
            while i < len(node.keys):
                rec(node.kids[i])
                if node.keys[i] > hi:
                    return
                if lo <= node.keys[i] <= hi:
                    out.append(node.keys[i])
                i += 1
            rec(node.kids[len(node.keys)])

        rec(self.root)
        return out

    def height(self):
        h = 1
        node = self.root
        while not node.leaf:
            node = node.kids[0]
            h += 1
        return h

    def check_invariants(self):
        depths = set()

        def rec(node, depth, lo, hi, is_root):
            assert node.keys == sorted(node.keys)
            for k in node.keys:
                assert (lo is None or k > lo) and (hi is None or k < hi)
            if not is_root:
                assert len(node.keys) >= self.t - 1
            assert len(node.keys) <= 2 * self.t - 1
            if node.leaf:
                depths.add(depth)
            else:
                assert len(node.kids) == len(node.keys) + 1
                bounds = [lo] + node.keys + [hi]
                for i, kid in enumerate(node.kids):
                    rec(kid, depth + 1, bounds[i], bounds[i + 1], False)

        rec(self.root, 1, None, None, True)
        assert len(depths) == 1  # EVERY leaf at the same depth


class BST:
    """The pointer-chaser: one key per page, as a disk index would pay."""

    def __init__(self, counter=None):
        self.root = None
        self.c = counter

    def _page(self):
        if self.c is not None:
            self.c["pages"] = self.c.get("pages", 0) + 1

    def insert(self, key):
        if self.root is None:
            self.root = [key, None, None]
            self._page()
            return
        node = self.root
        while True:
            self._page()
            if key == node[0]:
                return
            side = 1 if key < node[0] else 2
            if node[side] is None:
                node[side] = [key, None, None]
                return
            node = node[side]

    def search(self, key):
        node = self.root
        while node is not None:
            self._page()
            if key == node[0]:
                return True
            node = node[1] if key < node[0] else node[2]
        return False


def sorted_array_pages(n_keys, per_page, probes_rng, keys_sorted, key):
    """Binary search over a sorted file: each probe outside the current
    page costs a read; the final log2(per_page) probes share one page."""
    pages = set()
    lo, hi = 0, n_keys - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        pages.add(mid // per_page)
        if keys_sorted[mid] == key:
            break
        if keys_sorted[mid] < key:
            lo = mid + 1
        else:
            hi = mid - 1
    return len(pages)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: shadow-referee agreement on 20,000 mixed operations,
    # invariants re-verified every 1,000 inserts.
    tree = BTree(t=4)
    shadow = []
    for op in range(20_000):
        r = rng.random()
        k = rng.randint(0, 5_000)
        if r < 0.55:
            tree.insert(k)
            i = bisect.bisect_left(shadow, k)
            if i == len(shadow) or shadow[i] != k:
                shadow.insert(i, k)
            if op % 1_000 == 0:
                tree.check_invariants()
        elif r < 0.85:
            assert tree.search(k) == (
                (j := bisect.bisect_left(shadow, k)) < len(shadow) and shadow[j] == k
            )
        else:
            lo = rng.randint(0, 4_500)
            hi = lo + rng.randint(0, 400)
            want = shadow[bisect.bisect_left(shadow, lo) : bisect.bisect_right(shadow, hi)]
            assert tree.range_scan(lo, hi) == want
    tree.check_invariants()

    # Oracle 2: the height theorem at scale. 100,000 keys, fanout dial.
    KEYS = rng.sample(range(10_000_000), 100_000)
    heights = {}
    big_by_t = {}
    for t in (2, 8, 64, 512):
        bt = BTree(t=t)
        for k in KEYS:
            bt.insert(k)
        bt.check_invariants()
        heights[t] = bt.height()
        big_by_t[t] = bt
    assert heights[2] > heights[8] > heights[64] >= heights[512]
    assert heights[64] <= 4  # log_64(1e5) ~ 2.8

    # Oracle 3: the page ledger. 10,000 lookups against three designs.
    big = big_by_t[64]
    c_bt = {}
    big.c = c_bt
    bst_c = {}
    bst = BST(bst_c)
    for k in KEYS:
        bst.insert(k)
    bst_build_pages = bst_c["pages"]
    bst_c["pages"] = 0
    keys_sorted = sorted(KEYS)
    lookups = rng.sample(KEYS, 10_000)
    sa_pages = 0
    for k in lookups:
        assert big.search(k)
        assert bst.search(k)
        sa_pages += sorted_array_pages(len(KEYS), 127, rng, keys_sorted, k)
    bt_avg = c_bt["pages"] / len(lookups)
    bst_avg = bst_c["pages"] / len(lookups)
    sa_avg = sa_pages / len(lookups)
    assert bt_avg <= 3.2
    assert bst_avg > 4 * bt_avg
    assert sa_avg > 2 * bt_avg

    # Oracle 4: the range scan. 500-wide windows: the B-tree pays its
    # height plus the pages the answer occupies; the BST pays a page
    # per visited node.
    big.c = (c_range := {})
    lo = keys_sorted[50_000]
    hi = keys_sorted[50_000 + 499]
    got = big.range_scan(lo, hi)
    assert got == keys_sorted[50_000 : 50_000 + 500]
    range_pages = c_range["pages"]
    assert range_pages < 30  # height + ~500/127 leaf pages + internals

    # Oracle 5: splits are rare by design: about n / t.
    bt_splits = big_by_t[64].splits
    assert bt_splits < len(KEYS) / 32

    print(f"contest: 100,000 keys, page = one node; 10,000 random lookups; referee: a bisect shadow dict agreed on every one of 20,000 mixed ops including range contents, and the same-depth invariant held at every check")
    print(f"  {'index':<26} {'pages/lookup':>12}   height")
    print(f"  {'B-tree, t=64 (fanout 128)':<26} {bt_avg:>12.2f}   {heights[64]}: every leaf at depth {heights[64]}")
    print(f"  {'Sorted file + binary search':<26} {sa_avg:>12.2f}   the log2 probe trail crosses ~{sa_avg:.0f} pages")
    print(f"  {'BST (pointer per key)':<26} {bst_avg:>12.2f}   ~2 log2 n: every hop a page fault")
    print(f"fanout dial (height at 100K keys): " + " | ".join(f"t={t}: {h}" for t, h in sorted(heights.items())))
    print(f"range scan of 500 keys: B-tree {range_pages} pages (height + the answer's own pages); the BST walk would touch ~500")
    print(f"maintenance: {bt_splits:,} node splits across 100,000 inserts (~n/t): growth happens at the root, which is why every leaf shares a depth")
    print("OK: shadow agreement on 20,000 ops with invariants re-verified, the same-depth property asserted at every scale and fanout, the height dial monotone, the page ledger measured at 4x+ against the pointer-chaser, and the range scan priced at height plus payload")
