# Puzzle 68: Suffix tree x Ukkonen online construction
# Build the full-text index: a compressed trie of EVERY suffix: in
# linear time, reading the text once, left to right, never looking
# back.
#
# The pairing is the point. The algorithm is the suffix tree itself:
# every substring of the text is a walk from the root, so search runs
# in O(pattern), and repeated structure (longest repeat, longest
# common substring) reads off internal nodes. Built naively: insert
# each suffix into a compressed trie: it costs Theta(n^2), measured
# here at 337x the linear build by comparison counters. The heuristic
# is Ukkonen's online machinery: leaves whose ends grow for free
# (once a leaf, always a leaf), an active point that names where the
# next extension happens, rule 3's stop (if the suffix is already
# present, so are all shorter ones), and suffix links that teleport
# between extension sites. Amortized, the whole build is O(n):
# asserted by step counter at 200,000 characters. The referees:
# exact suffix-set equality against brute enumeration on 200 random
# strings, the 2n+1 size theorem on every build, Python's own `in`
# on 500 queries at scale, and DP cross-checks for the longest-repeat
# and longest-common-substring clients.
import random


class Ukkonen:
    def __init__(self, text, counter=None):
        self.s = text
        n = len(text)
        self.child = [{}]
        self.st = [0]
        self.en = [0]          # exclusive end; None = open leaf
        self.link = [0]
        self.steps = 0
        root = 0
        active_node, active_edge, active_len = root, 0, 0
        remainder = 0
        for i, c in enumerate(text):
            remainder += 1
            last_internal = None
            while remainder:
                self.steps += 1
                if active_len == 0:
                    active_edge = i
                ec = text[active_edge]
                nxt = self.child[active_node].get(ec)
                if nxt is None:
                    leaf = self._new(i, None)
                    self.child[active_node][ec] = leaf
                    if last_internal is not None:
                        self.link[last_internal] = active_node
                        last_internal = None
                else:
                    edge_end = self.en[nxt] if self.en[nxt] is not None else i + 1
                    edge_len = edge_end - self.st[nxt]
                    if active_len >= edge_len:
                        active_node = nxt
                        active_edge += edge_len
                        active_len -= edge_len
                        continue  # walk down, retry
                    if text[self.st[nxt] + active_len] == c:
                        active_len += 1  # rule 3: present already: stop
                        if last_internal is not None:
                            self.link[last_internal] = active_node
                        break
                    # split the edge, hang a new leaf
                    split = self._new(self.st[nxt], self.st[nxt] + active_len)
                    self.child[active_node][ec] = split
                    self.st[nxt] += active_len
                    self.child[split][text[self.st[nxt]]] = nxt
                    leaf = self._new(i, None)
                    self.child[split][c] = leaf
                    if last_internal is not None:
                        self.link[last_internal] = split
                    last_internal = split
                remainder -= 1
                if active_node == root and active_len > 0:
                    active_len -= 1
                    active_edge = i - remainder + 1
                elif active_node != root:
                    active_node = self.link[active_node]
        if counter is not None:
            counter["steps"] = self.steps
        self.n = n

    def _new(self, st, en):
        self.child.append({})
        self.st.append(st)
        self.en.append(en)
        self.link.append(0)
        return len(self.child) - 1

    def edge_end(self, v):
        return self.en[v] if self.en[v] is not None else self.n

    def contains(self, p, counter=None):
        v, off = 0, 0  # off inside v's edge is impossible at root
        i = 0
        cur, pos = 0, 0
        while i < len(p):
            nxt = self.child[cur].get(p[i])
            if nxt is None:
                return False
            e0, e1 = self.st[nxt], self.edge_end(nxt)
            j = e0
            while j < e1 and i < len(p):
                if counter is not None:
                    counter["cmps"] = counter.get("cmps", 0) + 1
                if self.s[j] != p[i]:
                    return False
                j += 1
                i += 1
            cur = nxt
        return True

    def suffixes(self):
        out = []
        stack = [(0, "")]
        while stack:
            v, path = stack.pop()
            if not self.child[v] and v != 0:
                out.append(path)
                continue
            for c, u in self.child[v].items():
                stack.append((u, path + self.s[self.st[u] : self.edge_end(u)]))
        return out

    def node_count(self):
        return len(self.child)

    def deepest_internal(self, half=None):
        """(depth, path-start) of the deepest internal node; with
        `half`, only nodes whose subtree holds leaves from both
        sides of position `half` (for the LCS client)."""
        best = (0, 0)
        sides = [None] * len(self.child)

        def mark(v, depth, start):
            nonlocal best
            if not self.child[v] and v != 0:
                suf_start = self.n - depth
                sides[v] = 1 if (half is not None and suf_start > half) else 0
                return {sides[v]} if half is not None else {0}
            got = set()
            for u in self.child[v].values():
                el = self.edge_end(u) - self.st[u]
                got |= mark(u, depth + el, self.st[u] - depth)
            if v != 0:
                ok = (half is None) or (got == {0, 1})
                label_end = self.st[v] + (self.edge_end(v) - self.st[v])
                if ok and depth > best[0]:
                    # path label must not cross the separator
                    lo = label_end - depth
                    seg = self.s[lo : lo + depth]
                    if half is None or ("\x02" not in seg and "\x01" not in seg):
                        best = (depth, lo)
            return got

        import sys

        old = sys.getrecursionlimit()
        sys.setrecursionlimit(400_000)
        mark(0, 0, 0)
        sys.setrecursionlimit(old)
        return best


def naive_tree_comparisons(text, counter):
    """Insert every suffix into a compressed trie, counting character
    comparisons: the Theta(n^2) baseline."""
    child = [{}]
    lab = [""]
    cmps = 0
    for s0 in range(len(text)):
        cur = 0
        i = s0
        while i < len(text):
            nxt = child[cur].get(text[i])
            if nxt is None:
                child.append({})
                lab.append(text[i:])
                child[cur][text[i]] = len(child) - 1
                break
            L = lab[nxt]
            j = 0
            while j < len(L) and i + j < len(text):
                cmps += 1
                if L[j] != text[i + j]:
                    break
                j += 1
            if j == len(L):
                cur = nxt
                i += j
                continue
            # split
            child.append({})
            lab.append(L[:j])
            mid = len(child) - 1
            child[cur][text[i]] = mid
            lab[nxt] = L[j:]
            child[mid][L[j]] = nxt
            child.append({})
            lab.append(text[i + j :])
            child[mid][text[i + j]] = len(child) - 1
            break
    counter["cmps"] = cmps
    return child


def lcs_dp(a, b):
    best = 0
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1] + 1
                best = max(best, cur[j])
        prev = cur
    return best


def lrs_brute(s):
    n = len(s)
    best = 0
    for i in range(n):
        for j in range(i + 1, n):
            k = 0
            while j + k < n and s[i + k] == s[j + k]:
                k += 1
            best = max(best, k)
    return best


if __name__ == "__main__":
    rng = random.Random(20260827)
    TERM = "\x01"

    # Oracle 1: the tree IS the suffix set. 200 random strings: the
    # leaf path-labels equal the true suffixes, exactly, and the
    # size theorem holds: at most 2(n+1) nodes, exactly n+1 leaves.
    for trial in range(200):
        n = rng.randint(1, 60)
        sigma = "ab" if trial % 3 == 0 else "abcd"
        s = "".join(rng.choice(sigma) for _ in range(n)) + TERM
        t = Ukkonen(s)
        got = sorted(t.suffixes())
        want = sorted(s[i:] for i in range(len(s)))
        assert got == want, (s, got, want)
        leaves = sum(1 for v in range(1, t.node_count()) if not t.child[v])
        assert leaves == len(s)
        assert t.node_count() <= 2 * len(s)  # the linear-size theorem

    # Oracle 2: membership at scale against Python's own `in`.
    vocab = ("the tree holds every suffix and the index answers in "
             "pattern time because every substring is a walk ").split()
    text = " ".join(rng.choice(vocab) for _ in range(36_000)) + TERM
    n = len(text)
    c_build = {}
    tree = Ukkonen(text, c_build)
    assert c_build["steps"] < 6 * n  # amortized linearity, measured
    hits = misses = 0
    for _ in range(500):
        if rng.random() < 0.5:
            i = rng.randrange(n - 25)
            p = text[i : i + 20]
            expect = True
            hits += 1
        else:
            p = "".join(rng.choice("qxzj") for _ in range(8))
            expect = p in text
            misses += 1
        assert tree.contains(p) == expect
    c_q = {}
    tree.contains(text[1000:1020], c_q)
    assert c_q["cmps"] <= 20  # O(pattern), not O(text)

    # Oracle 3: the quadratic baseline, raced by comparison counters
    # at n = 2,000 (it does not scale to the client text).
    # The terminator matters here too: without it a suffix can end
    # mid-edge and the naive splitter walks off the string (found the
    # hard way). And the race carries an honest surprise: on
    # English-like text suffixes diverge fast, so the naive build's
    # Theta(n * depth) cost is only a few times worse: the quadratic
    # blowup needs REPETITION, which is exactly what genomes and logs
    # are made of. Both corpora measured, both kept.
    small = text[:2_000] + TERM
    c_naive = {}
    naive_tree_comparisons(small, c_naive)
    c_uk = {}
    Ukkonen(small, c_uk)
    ratio_eng = c_naive["cmps"] / c_uk["steps"]
    assert ratio_eng > 2, ratio_eng

    rep = ("the unit shipped " * 125)[:2_000] + TERM
    c_naive_r = {}
    naive_tree_comparisons(rep, c_naive_r)
    c_uk_r = {}
    Ukkonen(rep, c_uk_r)
    ratio_rep = c_naive_r["cmps"] / c_uk_r["steps"]
    assert ratio_rep > 40, ratio_rep

    # Oracle 4: longest repeated substring: deepest internal node vs
    # brute force on 100 strings.
    for _ in range(100):
        m = rng.randint(2, 120)
        s = "".join(rng.choice("ab") for _ in range(m)) + TERM
        t = Ukkonen(s)
        depth, lo = t.deepest_internal()
        assert depth == lrs_brute(s[:-1]), s
    big_lrs, lrs_lo = tree.deepest_internal()

    # Oracle 5: the client: longest common substring of two strings
    # via one generalized tree, vs the DP, on 100 pairs.
    for _ in range(100):
        la = rng.randint(1, 100)
        lb = rng.randint(1, 100)
        a = "".join(rng.choice("abc") for _ in range(la))
        b = "".join(rng.choice("abc") for _ in range(lb))
        joint = a + "\x02" + b + TERM
        t = Ukkonen(joint)
        depth, lo = t.deepest_internal(half=len(a))
        assert depth == lcs_dp(a, b), (a, b, depth)

    print(f"contest: index {n:,} characters for substring search; referee: exact suffix-set equality on 200 random strings, then Python's own `in` on 500 queries")
    print(f"  {'build at n=2,000':<28} {'naive cmps':>12} {'Ukkonen':>9} {'ratio':>7}")
    print(f"  {'english-ish text':<28} {c_naive['cmps']:>12,} {c_uk['steps']:>9,} {ratio_eng:>6.1f}x   suffixes diverge fast: the naive build merely loses")
    print(f"  {'repetitive text (17-periodic)':<28} {c_naive_r['cmps']:>12,} {c_uk_r['steps']:>9,} {ratio_rep:>6.0f}x   repetition is the quadratic adversary: genomes, logs")
    print(f"the scale build: {n:,} chars in {c_build['steps']:,} extension steps ({c_build['steps']/n:.2f} per char, asserted < 6); a 20-char query walks {c_q['cmps']} comparisons: O(pattern), not O(text)")
    print(f"the size theorem: every build within 2(n+1) nodes with exactly n+1 leaves; longest repeat of the client text: {big_lrs} chars (deepest internal node), cross-checked by brute force on 100 strings")
    print(f"the client: longest common substring via one generalized tree == the DP on all 100 pairs")
    print("OK: suffix sets exact on 200 strings, the size theorem everywhere, amortized linearity measured at scale, the quadratic baseline raced by counters, membership matching Python at 500 queries, and both repeat-structure clients DP-verified")
