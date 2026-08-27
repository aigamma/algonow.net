# Puzzle 51: Trie x shared-prefix branching
# A dictionary keyed by strings where lookup cost depends on the KEY'S
# length and never on the dictionary's size: and where "everything
# starting with al-" is a walk, not a scan.
#
# The pairing is the point. The algorithm is the edge-labeled tree:
# one character per edge, one node per distinct prefix, keys marked at
# their end nodes. The heuristic is the sharing: every key rides the
# existing path as far as any previous key has paved it, branching off
# only where it becomes novel. Costs follow structurally: a lookup
# visits exactly len(key)+1 nodes: asserted per lookup, and asserted
# FLAT as the dictionary grows tenfold: a prefix query visits
# len(prefix) plus the answer's own size. The referee is a sorted list
# with bisect, which is also the honest rival: on this page's own
# vocabulary it answers static prefix queries beautifully, and the
# ledger says exactly what the tree buys over it. Structural identity
# asserted: node count == distinct prefixes + 1. And a DFS of the trie
# IS the sorted vocabulary: radix order for free, asserted equal.
import bisect
import random
from pathlib import Path


class Trie:
    def __init__(self, counter=None):
        self.root = {}
        self.c = counter
        self.nodes = 1

    def _visit(self):
        if self.c is not None:
            self.c["visits"] = self.c.get("visits", 0) + 1

    def insert(self, word):
        node = self.root
        self._visit()
        for ch in word:
            if ch not in node:
                node[ch] = {}
                self.nodes += 1
            node = node[ch]
            self._visit()
        node["$"] = True

    def lookup(self, word):
        node = self.root
        self._visit()
        for ch in word:
            if ch not in node:
                return False
            node = node[ch]
            self._visit()
        return "$" in node

    def with_prefix(self, prefix):
        node = self.root
        self._visit()
        for ch in prefix:
            if ch not in node:
                return []
            node = node[ch]
            self._visit()
        out = []

        def dfs(nd, acc):
            self._visit()
            if "$" in nd:
                out.append(acc)
            for k in sorted(kk for kk in nd if kk != "$"):
                dfs(nd[k], acc + k)

        dfs(node, prefix)
        return out

    def all_sorted(self):
        return self.with_prefix("")

    def chain_nodes(self):
        """Single-child pass-through nodes: what path compression (the
        radix tree) would erase."""
        count = 0
        stack = [self.root]
        while stack:
            nd = stack.pop()
            kids = [k for k in nd if k != "$"]
            if len(kids) == 1 and "$" not in nd and nd is not self.root:
                count += 1
            for k in kids:
                stack.append(nd[k])
        return count


def prefix_range(sorted_words, prefix, counter=None):
    """The bisect rival: locate the prefix block in a sorted list."""
    lo = bisect.bisect_left(sorted_words, prefix)
    hi = bisect.bisect_left(sorted_words, prefix + chr(0x10FFFF))
    if counter is not None:
        # Two binary searches, each comparing ~len(prefix) chars deep.
        import math

        counter["visits"] = counter.get("visits", 0) + 2 * max(
            1, math.ceil(math.log2(max(len(sorted_words), 2)))
        )
    return sorted_words[lo:hi]


if __name__ == "__main__":
    rng = random.Random(20260827)

    # The corpus: this site's own vocabulary.
    doc = (Path(__file__).resolve().parent.parent / "docs" / "OVERNIGHT-PLAN.md").read_text(
        encoding="utf-8"
    )
    words = sorted({w for w in "".join(c if c.isalpha() else " " for c in doc.lower()).split() if 2 <= len(w) <= 24})
    assert len(words) > 2_000

    # Oracle 1: shadow referee over 20,000 mixed operations.
    trie = Trie()
    shadow = set()
    slist = []
    pool = words[:]
    for op in range(20_000):
        r = rng.random()
        if r < 0.4 and pool:
            w = pool.pop(rng.randrange(len(pool)))
            trie.insert(w)
            shadow.add(w)
            bisect.insort(slist, w)
        elif r < 0.8:
            w = rng.choice(words) if rng.random() < 0.7 else rng.choice(words) + "zq"
            assert trie.lookup(w) == (w in shadow)
        else:
            p = rng.choice(words)[: rng.randint(1, 4)]
            assert trie.with_prefix(p) == prefix_range(slist, p)

    # Oracle 2: the flat-cost theorem. Lookup visits == len(key)+1,
    # exactly, and UNCHANGED as the dictionary grows tenfold.
    def measured_visits(t, w):
        c = {}
        t2 = Trie(c)
        t2.root = t.root
        t2.lookup(w)
        return c["visits"]

    small = Trie()
    for w in words[:300]:
        small.insert(w)
    big = Trie()
    for w in words:
        big.insert(w)
    for w in (words[10], words[100], words[250]):
        v_small = measured_visits(small, w)
        v_big = measured_visits(big, w)
        assert v_small == v_big == len(w) + 1  # size-independent, exactly

    # Oracle 3: structural identities. Nodes == distinct prefixes + 1;
    # DFS == sorted order.
    prefixes = set()
    for w in words:
        for i in range(1, len(w) + 1):
            prefixes.add(w[:i])
    assert big.nodes == len(prefixes) + 1
    assert big.all_sorted() == words  # radix order for free

    # Oracle 4: the compression tease, measured. Chain nodes are what
    # the radix tree erases.
    chains = big.chain_nodes()
    chain_frac = chains / big.nodes
    assert 0.02 < chain_frac < 0.9

    # Oracle 5: the ledger. 2,000 lookups + 200 prefix queries against
    # the bisect rival and the hash-scan straw that prefix queries
    # make real.
    c_trie = {}
    t_led = Trie(c_trie)
    t_led.root = big.root
    c_bis = {}
    hash_set = set(words)
    scan_cost = 0
    n_prefix_hits = 0
    for _ in range(2_000):
        w = rng.choice(words)
        assert t_led.lookup(w)
    lookup_visits = c_trie["visits"]
    for _ in range(200):
        p = rng.choice(words)[: rng.randint(2, 3)]
        got = t_led.with_prefix(p)
        assert got == prefix_range(sorted(words), p, c_bis)
        n_prefix_hits += len(got)
        scan_cost += len(hash_set)  # a hash table must scan everything
    prefix_visits = c_trie["visits"] - lookup_visits

    avg_word = sum(len(w) for w in words) / len(words)
    print(f"contest: this site's own vocabulary ({len(words):,} words, avg {avg_word:.1f} chars); referee: bisect ranges over the sorted list agreed on every one of the mixed 20,000 ops")
    print(f"  {'structure':<24} {'2,000 lookups':>13} {'200 prefix queries':>18}")
    print(f"  {'Trie':<24} {lookup_visits:>13,} {prefix_visits:>18,}   visits = len(key)+1 exactly; prefix = walk + answer")
    print(f"  {'Sorted list + bisect':<24} {'~' + format(int(2000 * 12 * avg_word), ','):>13} {c_bis['visits']:>18,}   superb and static: the honest rival")
    print(f"  {'Hash set':<24} {'~' + format(int(2000 * avg_word), ','):>13} {scan_cost:>18,}   O(key) membership; prefix = scan EVERYTHING")
    print(f"flat-cost theorem: lookup visits identical at 300 words and {len(words):,} words (len+1, asserted); nodes == distinct prefixes + 1 == {big.nodes:,} (asserted); DFS == sorted vocabulary (asserted)")
    print(f"compression tease: {chains:,} of {big.nodes:,} nodes ({chain_frac:.0%}) are single-child chains: exactly what the radix tree's path compression erases")
    print(f"autocomplete: 'al' -> {t_led.with_prefix('al')[:6]}...")
    print("OK: 20,000 shadow-refereed ops, the flat lookup cost asserted exact and size-independent, both structural identities held, the chain fraction measured for the radix sibling, and the prefix ledger priced against bisect and the hash scan")
