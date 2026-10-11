"""Longest prefix match x Trie lookup (puzzle 202).

A router holds thousands of CIDR prefixes with next hops; every packet must be
sent along the LONGEST prefix that covers its destination. A binary trie
walks the address one bit per level, remembering the last prefix it passed,
so the answer costs at most 32 steps and no scan of the table.

ORACLES. (1) A brute-force scan over every prefix (the longest covering one
wins) is the referee on random addresses and on every prefix's own bounds
and their outside neighbours; the trie, the stride-8 multibit trie, the
path-compressed (Patricia) trie, and binary search on prefix lengths must
all agree with it on every address, before and after inserts and deletes.
(2) Depth: the unibit trie never takes more than 32 steps; the multibit trie
never more than 4; the Patricia trie fewer nodes than the unibit trie.
(3) Expansion: the stride-8 trie holds exactly 256 entries per node and the
expanded entry count equals the sum over prefixes of 2^(8 - (len mod 8)) - 1.
(4) The negative example: a hash table keyed by exact network addresses
misses almost every destination because it cannot express a prefix, and a
linear scan costs the whole table per packet.

AUTHOR CORRECTIONS: the draft expected path compression to roughly halve the
node count; the Patricia trie measured 3,504 nodes against 20,804, a sixfold
cut, and the page quotes the measurement. The draft also assumed the
Patricia lookup would be faster than the unibit walk; in interpreted Python
the skip-bit comparison costs more than the bit steps it saves (0.81 against
0.60 microseconds), so the page credits it with memory, not speed.
"""
import random
import time

W = 32


def make_table(rng, n):
    """A seeded forwarding table with a BGP-like length mix and nested prefixes."""
    lengths = [8, 12, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32]
    weights = [2, 2, 2, 10, 4, 6, 8, 10, 10, 14, 12, 45, 2, 2, 1, 1, 1, 1, 2]
    seen = {(0, 0)}
    table = [(0, 0, 0)]  # the default route: value, length, next hop
    while len(table) < n:
        ln = rng.choices(lengths, weights)[0]
        val = rng.getrandbits(W) & (~0 << (W - ln)) & 0xFFFFFFFF
        if (val, ln) in seen:
            continue
        seen.add((val, ln))
        table.append((val, ln, rng.randrange(1, 64)))
        if ln < 30 and rng.random() < 0.3 and len(table) < n:  # a more specific child inside it
            ln2 = min(W, ln + rng.randint(1, 8))
            val2 = (val | (rng.getrandbits(W) >> ln)) & (~0 << (W - ln2)) & 0xFFFFFFFF
            if (val2, ln2) not in seen:
                seen.add((val2, ln2))
                table.append((val2, ln2, rng.randrange(1, 64)))
    return table


def brute(table, addr):
    """The referee: scan every prefix, keep the longest that covers addr."""
    best_len, best_hop = -1, None
    for val, ln, hop in table:
        if ln > best_len and (ln == 0 or (addr >> (W - ln)) == (val >> (W - ln))):
            best_len, best_hop = ln, hop
    return best_hop


class Unibit:
    """One bit per level; node = [child0, child1, hop or None]."""

    def __init__(self):
        self.root = [None, None, None]
        self.nodes = 1

    def insert(self, val, ln, hop):
        node = self.root
        for i in range(ln):
            b = (val >> (W - 1 - i)) & 1
            if node[b] is None:
                node[b] = [None, None, None]
                self.nodes += 1
            node = node[b]
        node[2] = hop

    def delete(self, val, ln):
        path, node = [], self.root
        for i in range(ln):
            b = (val >> (W - 1 - i)) & 1
            path.append((node, b))
            node = node[b]
        node[2] = None
        while path and node[0] is None and node[1] is None and node[2] is None:
            parent, b = path.pop()
            parent[b] = None
            self.nodes -= 1
            node = parent

    def lookup(self, addr):
        node, best, steps = self.root, self.root[2], 0
        for i in range(W):
            node = node[(addr >> (W - 1 - i)) & 1]
            if node is None:
                break
            steps += 1
            if node[2] is not None:
                best = node[2]
        return best, steps

    def bmp(self, val, ln):
        """Longest real prefix of length <= ln covering the prefix (val, ln)."""
        node, best = self.root, self.root[2]
        for i in range(ln):
            node = node[(val >> (W - 1 - i)) & 1]
            if node is None:
                break
            if node[2] is not None:
                best = node[2]
        return best


class Multibit:
    """Fixed stride with controlled prefix expansion; entry = [hop, plen, child]."""

    def __init__(self, stride):
        self.s = stride
        self.root = self.new_node()
        self.nodes = 1
        self.expanded = 0

    def new_node(self):
        return [[None, -1, None] for _ in range(1 << self.s)]

    def insert(self, val, ln, hop):
        s, node = self.s, self.root
        depth = 0 if ln == 0 else (ln - 1) // s
        for d in range(depth):
            idx = (val >> (W - s * (d + 1))) & ((1 << s) - 1)
            if node[idx][2] is None:
                node[idx][2] = self.new_node()
                self.nodes += 1
            node = node[idx][2]
        r = ln - depth * s  # 0..s bits of the prefix inside this node
        base = ((val >> (W - s * (depth + 1))) & ((1 << s) - 1)) & (~0 << (s - r))
        for e in range(base, base + (1 << (s - r))):
            if node[e][1] < ln:
                node[e][0], node[e][1] = hop, ln
        self.expanded += (1 << (s - r)) - 1

    def lookup(self, addr):
        s, node, best, steps = self.s, self.root, None, 0
        for d in range(W // s):
            entry = node[(addr >> (W - s * (d + 1))) & ((1 << s) - 1)]
            steps += 1
            if entry[0] is not None:
                best = entry[0]
            if entry[2] is None:
                break
            node = entry[2]
        return best, steps


def patricia(unode):
    """Collapse single-child, prefix-free chains: node = [hop, [skiplen, skipval, child] x 2]."""
    pnode = [unode[2], None, None]
    count = 1
    for b in (0, 1):
        child = unode[b]
        if child is None:
            continue
        skiplen, skipval = 0, 0
        while child[2] is None and (child[0] is None) != (child[1] is None):
            nb = 0 if child[0] is not None else 1
            skiplen, skipval = skiplen + 1, (skipval << 1) | nb
            child = child[nb]
        sub, c = patricia(child)
        pnode[1 + b] = [skiplen, skipval, sub]
        count += c
    return pnode, count


def patricia_lookup(root, addr):
    node, best, i, visits = root, root[0], 0, 1
    while i < W:
        edge = node[1 + ((addr >> (W - 1 - i)) & 1)]
        if edge is None:
            break
        skiplen, skipval, child = edge
        i += 1
        if skiplen and ((addr >> (W - i - skiplen)) & ((1 << skiplen) - 1)) != skipval:
            break  # the skipped bits disagree: no longer prefix can match
        i += skiplen
        node = child
        visits += 1
        if node[0] is not None:
            best = node[0]
    return best, visits


class LengthSearch:
    """Waldvogel et al. 1997: one hash table per prefix length, binary search with markers."""

    def __init__(self, table, trie):
        self.lens = sorted({ln for _, ln, _ in table})
        self.tabs = {ln: {} for ln in self.lens}
        for val, ln, hop in table:
            lo, hi = 0, len(self.lens) - 1
            while lo <= hi:  # the lengths a search probes on its way to ln get markers
                mid = (lo + hi) // 2
                m = self.lens[mid]
                if m < ln:
                    key = val >> (W - m) if m else 0
                    self.tabs[m].setdefault(key, [None, trie.bmp(val, m)])
                    lo = mid + 1
                elif m == ln:
                    break
                else:
                    hi = mid - 1
            key = val >> (W - ln) if ln else 0
            self.tabs[ln].setdefault(key, [None, None])[0] = hop
        self.markers = sum(1 for t in self.tabs.values() for e in t.values() if e[0] is None)

    def lookup(self, addr):
        lo, hi, best, probes = 0, len(self.lens) - 1, None, 0
        while lo <= hi:
            mid = (lo + hi) // 2
            m = self.lens[mid]
            probes += 1
            entry = self.tabs[m].get(addr >> (W - m) if m else 0)
            if entry is None:
                hi = mid - 1
            else:
                best = entry[0] if entry[0] is not None else entry[1]
                lo = mid + 1
        return best, probes


def dotted(a):
    return '.'.join(str((a >> s) & 255) for s in (24, 16, 8, 0))


def per_lookup_us(fn, addrs, reps=1):
    t0 = time.perf_counter()
    for _ in range(reps):
        for a in addrs:
            fn(a)
    return 1e6 * (time.perf_counter() - t0) / (reps * len(addrs))


def main():
    rng = random.Random(20261010)
    table = make_table(rng, 2000)
    nested = sum(1 for v, ln, _ in table if ln and any(l2 < ln and (v >> (W - l2)) == (v2 >> (W - l2)) for v2, l2, _ in table if l2))
    trie = Unibit()
    for val, ln, hop in table:
        trie.insert(val, ln, hop)
    multi = Multibit(8)
    for val, ln, hop in table:
        multi.insert(val, ln, hop)
    proot, pnodes = patricia(trie.root)
    ls = LengthSearch(table, trie)

    # addresses: random, plus every sampled prefix's first and last address and the two just outside
    addrs = [rng.getrandbits(W) for _ in range(1000)]
    for val, ln, _ in rng.sample(table[1:], 300):
        hi = val | ((1 << (W - ln)) - 1)
        addrs += [val, hi, (val - 1) & 0xFFFFFFFF, (hi + 1) & 0xFFFFFFFF]
    truth = [brute(table, a) for a in addrs]
    steps, msteps, pvisits, probes = [], [], [], []
    for a, t in zip(addrs, truth):
        h, st = trie.lookup(a)
        assert h == t, (dotted(a), h, t)
        steps.append(st)
        h, st = multi.lookup(a)
        assert h == t
        msteps.append(st)
        h, st = patricia_lookup(proot, a)
        assert h == t
        pvisits.append(st)
        h, st = ls.lookup(a)
        assert h == t
        probes.append(st)
    assert max(steps) <= W and max(msteps) <= W // 8
    expected_expansion = sum((1 << (8 - (ln % 8 or 8))) - 1 if ln else 255 for _, ln, _ in table)
    assert multi.expanded == expected_expansion
    assert pnodes < trie.nodes
    matched_two = sum(1 for a in addrs if sum(1 for v, ln, _ in table if ln and (a >> (W - ln)) == (v >> (W - ln))) >= 2)

    # updates: insert fresh prefixes, delete existing ones, re-check against the referee
    nodes_before = trie.nodes
    adds =[(v, ln, h) for v, ln, h in make_table(random.Random(7), 400)[1:] if (v, ln) not in {(t[0], t[1]) for t in table}][:200]
    dels = rng.sample(table[1:], 200)
    for v, ln, h in adds:
        trie.insert(v, ln, h)
    for v, ln, _ in dels:
        trie.delete(v, ln)
    delset = {(v, ln) for v, ln, _ in dels}
    table2 = [t for t in table if (t[0], t[1]) not in delset] + adds
    check = addrs[:600]
    for a in check:
        assert trie.lookup(a)[0] == brute(table2, a)
    nodes_after = trie.nodes
    for v, ln, _ in adds:
        trie.delete(v, ln)
    for v, ln, h in dels:
        trie.insert(v, ln, h)
    for a in check[:300]:
        assert trie.lookup(a)[0] == brute(table, a)
    assert trie.nodes == nodes_before, (trie.nodes, nodes_before)

    # negative example: exact-match hashing cannot express a prefix
    exact = {val: hop for val, ln, hop in table}
    misses = sum(1 for a in addrs[:1000] if a not in exact)

    # timings (interpreted Python; the ratios are the point, not the microseconds)
    rand_addrs = [rng.getrandbits(W) for _ in range(300)]
    t_brute = per_lookup_us(lambda a: brute(table, a), rand_addrs)
    t_trie = per_lookup_us(trie.lookup, rand_addrs, 20)
    t_multi = per_lookup_us(multi.lookup, rand_addrs, 20)
    t_pat = per_lookup_us(lambda a: patricia_lookup(proot, a), rand_addrs, 20)
    t_ls = per_lookup_us(ls.lookup, rand_addrs, 20)
    budget_ns = 1e9 / 14.88e6  # 10 GbE at 64-byte frames: 14.88 million packets per second

    mean = lambda xs: sum(xs) / len(xs)
    print(f'table: {len(table)} prefixes, {nested} nested inside a shorter one, '
          f'{len(set(ln for _, ln, _ in table))} distinct lengths; {len(addrs)} test addresses, '
          f'{matched_two} covered by two or more prefixes')
    print(f'{"structure":28s} {"nodes":>7s} {"entries":>8s} {"mean steps":>10s} {"max":>4s} {"us/lookup":>9s}')
    print(f'{"linear scan (referee)":28s} {"-":>7s} {len(table):8d} {len(table):10d} {len(table):4d} {t_brute:9.1f}')
    print(f'{"unibit trie":28s} {trie.nodes:7d} {trie.nodes * 2:8d} {mean(steps):10.2f} {max(steps):4d} {t_trie:9.2f}')
    print(f'{"stride-8 multibit trie":28s} {multi.nodes:7d} {multi.nodes * 256:8d} {mean(msteps):10.2f} {max(msteps):4d} {t_multi:9.2f}')
    print(f'{"Patricia (path-compressed)":28s} {pnodes:7d} {pnodes * 2:8d} {mean(pvisits):10.2f} {max(pvisits):4d} {t_pat:9.2f}')
    print(f'{"binary search on lengths":28s} {len(ls.lens):7d} {len(table) + ls.markers:8d} {mean(probes):10.2f} {max(probes):4d} {t_ls:9.2f}')
    print(f'multibit expansion: {multi.expanded} extra entries for {len(table)} prefixes; '
          f'{ls.markers} markers for {len(table)} prefixes over {len(ls.lens)} lengths')
    print(f'updates: +200 -200 prefixes, {nodes_after} nodes after, every lookup still equal to the referee; '
          f'restored to {trie.nodes} nodes')
    print(f'exact-match hash table: {misses} of 1000 destinations missed; a 10 GbE line card has {budget_ns:.0f} ns per packet, '
          f'the scan here costs {t_brute * 1000 / budget_ns:,.0f} budgets and the trie {t_trie * 1000 / budget_ns:.0f}')
    print(f'OK: trie, stride-8 trie, Patricia trie, and length search equal the linear-scan referee on all '
          f'{len(addrs)} addresses including {len(addrs) - 1000} prefix-boundary probes, and again after 200 inserts and 200 deletes; '
          f'{trie.nodes} nodes with mean depth {mean(steps):.1f} and max {max(steps)} against {len(table)} comparisons per scan; '
          f'the stride-8 trie answers in {mean(msteps):.2f} steps (max {max(msteps)}) from {multi.nodes} nodes of 256 entries with '
          f'{multi.expanded} expanded entries; Patricia {pnodes} nodes, {mean(pvisits):.1f} visits; '
          f'length search {mean(probes):.1f} probes (max {max(probes)}) with {ls.markers} markers; '
          f'the scan costs {t_brute / t_trie:.0f}x the trie per lookup; exact-match hashing misses {misses} of 1000')


if __name__ == '__main__':
    main()
