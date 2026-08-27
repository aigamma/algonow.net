# Puzzle 27: Aho-Corasick x failure-link automaton
# Report every occurrence of every pattern in a dictionary, with its
# identity, in ONE forward pass over the text, whatever the dictionary size.
#
# The pairing is the point. The control structure is a trie of all the
# patterns, walked over the text character by character. The heuristic is
# puzzle 09's failure function grown up: every trie node carries a failure
# link to the longest proper suffix of its string that is also a trie node,
# so a mismatch never moves the text finger backward, it just slides the
# automaton down to the longest still-viable prefix. Output links collect
# the patterns that end inside other patterns. Build cost is the dictionary;
# text cost is the text, measured flat as the dictionary grows tenfold.
import random
from collections import deque


class AhoCorasick:
    def __init__(self, patterns):
        self.patterns = list(patterns)
        self.goto = [{}]
        self.fail = [0]
        self.out = [[]]  # pattern indices ending at this node
        for idx, p in enumerate(self.patterns):
            node = 0
            for ch in p:
                if ch not in self.goto[node]:
                    self.goto.append({})
                    self.fail.append(0)
                    self.out.append([])
                    self.goto[node][ch] = len(self.goto) - 1
                node = self.goto[node][ch]
            self.out[node].append(idx)
        # BFS to set failure links: a node's fail is its parent's fail
        # advanced by the same character, the trie-wide failure function.
        q = deque()
        for ch, v in self.goto[0].items():
            q.append(v)
        while q:
            u = q.popleft()
            for ch, v in self.goto[u].items():
                q.append(v)
                f = self.fail[u]
                while f and ch not in self.goto[f]:
                    f = self.fail[f]
                self.fail[v] = self.goto[f][ch] if ch in self.goto[f] and self.goto[f][ch] != v else 0
                self.out[v] = self.out[v] + self.out[self.fail[v]]  # output links, flattened

    def node_string(self, target):
        """The string spelled by the path to `target` (test use only)."""
        for s, node in self._walk_all():
            if node == target:
                return s
        return None

    def _walk_all(self):
        stack = [("", 0)]
        while stack:
            s, node = stack.pop()
            yield s, node
            for ch, v in self.goto[node].items():
                stack.append((s + ch, v))

    def search(self, text, counter=None):
        """(pattern index, end position) for every occurrence. The text
        index i only ever increases: the one-pass property is structural."""
        hits = []
        node = 0
        for i, ch in enumerate(text):
            while node and ch not in self.goto[node]:
                if counter is not None:
                    counter["steps"] = counter.get("steps", 0) + 1
                node = self.fail[node]
            if counter is not None:
                counter["steps"] = counter.get("steps", 0) + 1
            node = self.goto[node].get(ch, 0)
            for idx in self.out[node]:
                hits.append((idx, i - len(self.patterns[idx]) + 1))
        return hits


def kmp_all(text, pattern, counter=None):
    """Puzzle 09's matcher, run once per pattern: the k-pass rival."""
    m = len(pattern)
    fail = [0] * (m + 1)
    k = 0
    for j in range(1, m):
        while k and pattern[j] != pattern[k]:
            k = fail[k]
        if pattern[j] == pattern[k]:
            k += 1
        fail[j + 1] = k
    out = []
    j = 0
    for i, ch in enumerate(text):
        while j and ch != pattern[j]:
            if counter is not None:
                counter["steps"] = counter.get("steps", 0) + 1
            j = fail[j]
        if counter is not None:
            counter["steps"] = counter.get("steps", 0) + 1
        if ch == pattern[j]:
            j += 1
        if j == m:
            out.append(i - m + 1)
            j = fail[m]
    return out


def rk_multi(text, patterns, counter=None):
    """Rabin-Karp with one hash set: flat in k, but every pattern must
    share one length; verification is the honest tax on every hash hit."""
    L = len(patterns[0])
    assert all(len(p) == L for p in patterns)
    mod = (1 << 61) - 1
    base = 256
    high = pow(base, L - 1, mod)
    table = {}
    for idx, p in enumerate(patterns):
        h = 0
        for ch in p:
            h = (h * base + ord(ch)) % mod
        table.setdefault(h, []).append(idx)
    hits = []
    h = 0
    for i, ch in enumerate(text):
        if i >= L:
            h = (h - ord(text[i - L]) * high) % mod  # evict before shifting
        h = (h * base + ord(ch)) % mod
        if counter is not None:
            counter["steps"] = counter.get("steps", 0) + 1
        if i >= L - 1 and h in table:
            start = i - L + 1
            for idx in table[h]:
                if counter is not None:
                    counter["steps"] = counter.get("steps", 0) + L
                if text[start : i + 1] == patterns[idx]:
                    hits.append((idx, start))
    return hits


def make_dictionary(k, rng, lo=4, hi=10, alpha="abcdef"):
    seen = set()
    while len(seen) < k:
        L = rng.randint(lo, hi)
        seen.add("".join(rng.choice(alpha) for _ in range(L)))
    return sorted(seen)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the textbook nest, pinned exactly. Patterns that end inside
    # each other must all be reported, via output links.
    ac = AhoCorasick(["he", "she", "his", "hers"])
    hits = sorted(ac.search("ushers"))
    named = sorted((ac.patterns[i], pos) for i, pos in hits)
    assert named == [("he", 2), ("hers", 2), ("she", 1)], named

    # Oracle 2: failure links verified against their definition. For every
    # node, the link must point to the node of the LONGEST proper suffix of
    # its string that exists in the trie. Checked exhaustively.
    small = AhoCorasick(make_dictionary(30, rng, 2, 6, "abc"))
    strings = {node: s for s, node in small._walk_all()}
    node_of = {s: node for node, s in strings.items()}
    for node, s in strings.items():
        if node == 0:
            continue
        want = 0
        for cut in range(1, len(s)):
            if s[cut:] in node_of:
                want = node_of[s[cut:]]
                break
        assert small.fail[node] == want, (s, strings[small.fail[node]], strings.get(want))

    # Oracle 3: agreement three ways plus a slicing referee, overlapping
    # and nested matches included.
    for trial in range(60):
        pats = make_dictionary(rng.randint(3, 12), rng, 1, 5, "ab")
        text = "".join(rng.choice("ab") for _ in range(rng.randint(20, 300)))
        ac = AhoCorasick(pats)
        got = sorted(ac.search(text))
        ref = sorted(
            (idx, i)
            for idx, p in enumerate(pats)
            for i in range(len(text) - len(p) + 1)
            if text[i : i + len(p)] == p
        )
        assert got == ref, (pats, text)
        via_kmp = sorted((idx, pos) for idx, p in enumerate(pats) for pos in kmp_all(text, p))
        assert via_kmp == ref

    # Oracle 4: automaton size is the dictionary, not the text: node count
    # is at most the total pattern length plus the root.
    pats = make_dictionary(500, rng)
    ac = AhoCorasick(pats)
    assert len(ac.goto) <= sum(len(p) for p in pats) + 1

    # Oracle 5: the one-pass bound. Transitions during the text walk are
    # amortized: at most 2n plus the reported matches.
    text = "".join(rng.choice("abcdef") for _ in range(50_000))
    c = {}
    hits = ac.search(text, c)
    assert c["steps"] <= 3 * len(text) + len(hits), c["steps"]

    # The contest: text fixed, dictionary grows tenfold.
    N = 50_000
    text = "".join(rng.choice("abcdef") for _ in range(N))
    dict_small = make_dictionary(100, rng)
    dict_big = make_dictionary(1000, rng)
    fixed_small = make_dictionary(100, rng, 8, 8)  # single length for RK
    fixed_big = make_dictionary(1000, rng, 8, 8)

    results = {}
    for label, pats in (("small", dict_small), ("big", dict_big)):
        c = {}
        ac = AhoCorasick(pats)
        h_ac = sorted(ac.search(text, c))
        results[("ac", label)] = (c["steps"], h_ac)
    c = {}
    h_kmp = []
    for idx, p in enumerate(dict_small):
        for pos in kmp_all(text, p, c):
            h_kmp.append((idx, pos))
    results[("kmp", "small")] = (c["steps"], sorted(h_kmp))
    assert results[("kmp", "small")][1] == results[("ac", "small")][1], "AC vs k-pass KMP"
    for label, pats in (("small", fixed_small), ("big", fixed_big)):
        c = {}
        h_rk = sorted(rk_multi(text, pats, c))
        ref = sorted(AhoCorasick(pats).search(text))
        assert h_rk == ref
        results[("rk", label)] = (c["steps"], h_rk)

    ac_s, ac_b = results[("ac", "small")][0], results[("ac", "big")][0]
    kmp_s = results[("kmp", "small")][0]
    rk_s, rk_b = results[("rk", "small")][0], results[("rk", "big")][0]
    assert kmp_s > 50 * ac_s, "the k-pass rival must pay per pattern"
    assert ac_b < 2 * ac_s, "AC's text cost must stay flat as k grows 10x"

    print(f"contest: text n = {N:,}, work = automaton/text steps; the dictionary grows tenfold:")
    print(f"  {'method':<26} {'100 patterns':>13} {'1,000 patterns':>15}")
    print(f"  {'Aho-Corasick':<26} {ac_s:>13,} {ac_b:>15,}")
    print(f"  {'KMP, once per pattern':<26} {kmp_s:>13,} {'not run (k*n)':>15}")
    print(f"  {'Rabin-Karp multi-hash':<26} {rk_s:>13,} {rk_b:>15,}  (single-length dictionaries)")
    print("OK: the ushers nest pinned, failure links verified against their definition, three matchers agree with the referee, text cost flat at 10x patterns")
