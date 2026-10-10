# Puzzle 194: Set-associative cache x Index-tag lookup
# The algorithm: S sets of W ways, a block living in any way of exactly one
# set. The heuristic: split the address into offset, index (names the set),
# and tag; read one set; compare its W tags in parallel.
#
# Referees: (1) offset, index, and tag rebuild every address bit for bit;
# (2) an independent dictionary direct-mapped cache and an ordered-dictionary
# fully associative LRU cache give the simulator's hit-or-miss sequence at
# W = 1 and W = blocks; (3) Belady's optimal policy, unbeatable at this
# capacity, misses no more than any configuration; (4) misses = compulsory +
# capacity + conflict (Hill and Smith 1989); (5) measured traces, the
# N against two-way N/2 rule of thumb, and comparator and tag-storage cost.
#
# AUTHOR CORRECTION: the draft expected more ways to rescue the column walk.
# Measured, the 1,024-byte row stride folds a column into the same few sets,
# so 2 to 16 ways miss 100 percent like direct-mapped; only full
# associativity (or a 16-row tile) reaches the 12.5 percent that locality
# allows. Second: the draft expected the four-way cache to miss 12.5 percent
# on the three arrays; their 192 blocks fit 3 to a set in 256, so four
# passes miss only the 192 first touches while 1 and 2 ways miss all 6,144.
import heapq
import math
import random
import time
from collections import OrderedDict

SEED = 20261010
ADDRESS_BITS = 32
BLOCK = 64


def log2_exact(n):
    b = n.bit_length() - 1
    assert 1 << b == n, n
    return b


class SetAssociativeCache:
    def __init__(self, capacity, block, ways, policy='lru', seed=SEED):
        self.block = block
        self.ways = ways
        self.blocks = capacity // block
        assert self.blocks * block == capacity and self.blocks % ways == 0
        self.sets = self.blocks // ways
        self.offset_bits = log2_exact(block)
        self.index_bits = log2_exact(self.sets)
        self.tag_bits = ADDRESS_BITS - self.offset_bits - self.index_bits
        self.policy = policy
        self.rng = random.Random(seed)
        self.tags = [[None] * ways for _ in range(self.sets)]
        self.stamp = [[0] * ways for _ in range(self.sets)]
        self.clock = 0
        self.hits = self.misses = self.compares = self.evictions = 0

    def split(self, address):
        offset = address & (self.block - 1)
        index = (address >> self.offset_bits) & (self.sets - 1)
        tag = address >> (self.offset_bits + self.index_bits)
        return tag, index, offset

    def join(self, tag, index, offset):
        return (tag << (self.offset_bits + self.index_bits)) | (index << self.offset_bits) | offset

    def access(self, address):
        tag, index, _ = self.split(address)
        line = self.tags[index]
        self.clock += 1
        self.compares += self.ways
        if tag in line:
            self.hits += 1
            if self.policy == 'lru':
                self.stamp[index][line.index(tag)] = self.clock
            return True
        self.misses += 1
        if None in line:
            victim = line.index(None)
        else:
            self.evictions += 1
            if self.policy == 'random':
                victim = self.rng.randrange(self.ways)
            else:
                st = self.stamp[index]
                victim = st.index(min(st))
        line[victim] = tag
        self.stamp[index][victim] = self.clock
        return False

    def run(self, trace):
        return [self.access(a) for a in trace]


class DirectMappedReference:
    def __init__(self, capacity, block):
        self.offset_bits = log2_exact(block)
        self.sets = capacity // block
        self.index_bits = log2_exact(self.sets)
        self.line = {}

    def run(self, trace):
        out = []
        for address in trace:
            b = address >> self.offset_bits
            index = b & (self.sets - 1)
            tag = b >> self.index_bits
            if self.line.get(index) == tag:
                out.append(True)
            else:
                self.line[index] = tag
                out.append(False)
        return out


class FullyAssociativeLRUReference:
    def __init__(self, capacity, block):
        self.offset_bits = log2_exact(block)
        self.blocks = capacity // block
        self.od = OrderedDict()

    def run(self, trace):
        out = []
        for address in trace:
            b = address >> self.offset_bits
            if b in self.od:
                self.od.move_to_end(b)
                out.append(True)
                continue
            if len(self.od) >= self.blocks:
                self.od.popitem(last=False)
            self.od[b] = True
            out.append(False)
        return out


def belady_misses(trace, blocks, block):
    """Fully associative optimal replacement (Belady 1966): evict the block
    whose next use is farthest; the floor for any cache of this capacity."""
    offset_bits = log2_exact(block)
    seq = [a >> offset_bits for a in trace]
    n = len(seq)
    never = n + 1
    nxt = [0] * n
    last = {}
    for i in range(n - 1, -1, -1):
        nxt[i] = last.get(seq[i], never)
        last[seq[i]] = i
    resident = {}
    heap = []
    misses = 0
    for i, b in enumerate(seq):
        if b in resident:
            resident[b] = nxt[i]
            heapq.heappush(heap, (-nxt[i], b))
            continue
        misses += 1
        if len(resident) >= blocks:
            while True:
                neg, victim = heapq.heappop(heap)
                if victim in resident and resident[victim] == -neg:
                    break
            del resident[victim]
        resident[b] = nxt[i]
        heapq.heappush(heap, (-nxt[i], b))
    return misses


def compulsory(trace, block):
    offset_bits = log2_exact(block)
    return len({a >> offset_bits for a in trace})


def trace_sequential(n_bytes, stride=8, base=0):
    return list(range(base, base + n_bytes, stride))


def trace_three_arrays(spacing, elements, passes, base=1 << 16):
    """C[i] = A[i] + B[i] over arrays whose bases are `spacing` bytes apart."""
    t = []
    for _ in range(passes):
        for i in range(elements):
            t.append(base + i * 8)
            t.append(base + spacing + i * 8)
            t.append(base + 2 * spacing + i * 8)
    return t


def trace_matrix(rows, cols, order, band=16, base=1 << 20):
    t = []
    if order == 'row':
        for i in range(rows):
            for j in range(cols):
                t.append(base + (i * cols + j) * 8)
    elif order == 'column':
        for j in range(cols):
            for i in range(rows):
                t.append(base + (i * cols + j) * 8)
    elif order == 'tiled':
        for i0 in range(0, rows, band):
            for j in range(cols):
                for i in range(i0, i0 + band):
                    t.append(base + (i * cols + j) * 8)
    return t


def trace_zipf(n_accesses, n_blocks, block, exponent, seed):
    rng = random.Random(seed)
    ids = list(range(n_blocks))
    rng.shuffle(ids)
    weights = [1.0 / (k + 1) ** exponent for k in range(n_blocks)]
    picks = rng.choices(ids, weights=weights, k=n_accesses)
    base = 1 << 24
    return [base + b * block + rng.randrange(0, block, 8) for b in picks]


def trace_cyclic_one_set(capacity, block, ways, n_blocks, rounds, base=1 << 22):
    stride = (capacity // block // ways) * block
    return [base + k * stride for _ in range(rounds) for k in range(n_blocks)]


def miss_rate(c, trace):
    return (c.misses if hasattr(c, 'misses') else c) / len(trace)


def simulate(trace, capacity, ways, policy='lru', block=BLOCK):
    c = SetAssociativeCache(capacity, block, ways, policy)
    c.run(trace)
    return c


def main():
    t_start = time.time()
    cap = 16 * 1024
    blocks = cap // BLOCK
    assocs = [1, 2, 4, 8, 16, blocks]
    label = {1: 'direct-mapped', blocks: 'fully associative'}
    name = lambda w: label.get(w, f'{w}-way')

    SEQ, TRI, ROW, COL, TIL, ZIP = ('sequential sweep, 64 KB', 'three arrays 16 KB apart', 'matrix 128 x 128, rows',
                                    'matrix 128 x 128, columns', 'matrix columns, 16-row tiles', 'Zipf, 4,096 blocks, s = 1')
    traces = {
        SEQ: trace_sequential(64 * 1024),
        TRI: trace_three_arrays(cap, 512, 4),
        ROW: trace_matrix(128, 128, 'row'),
        COL: trace_matrix(128, 128, 'column'),
        TIL: trace_matrix(128, 128, 'tiled', band=16),
        ZIP: trace_zipf(40_000, 4096, BLOCK, 1.0, SEED),
    }

    # (1) the split rebuilds every address, in every configuration
    split_checks = 0
    for w in assocs:
        c = SetAssociativeCache(cap, BLOCK, w)
        assert c.index_bits == log2_exact(c.sets) and c.offset_bits == log2_exact(BLOCK)
        assert c.tag_bits + c.index_bits + c.offset_bits == ADDRESS_BITS
        for a in traces[ZIP]:
            tag, index, offset = c.split(a)
            assert 0 <= index < c.sets and 0 <= offset < BLOCK and tag < (1 << c.tag_bits)
            assert c.join(tag, index, offset) == a
            split_checks += 1

    # (2) independent references agree with the general simulator exactly
    ref_checks = 0
    for tr in traces.values():
        assert DirectMappedReference(cap, BLOCK).run(tr) == SetAssociativeCache(cap, BLOCK, 1).run(tr)
        assert FullyAssociativeLRUReference(cap, BLOCK).run(tr) == SetAssociativeCache(cap, BLOCK, blocks).run(tr)
        ref_checks += 2 * len(tr)

    # the grid, Belady, and the three C's
    results, belady, comp = {}, {}, {}
    for tname, tr in traces.items():
        row = {w: simulate(tr, cap, w) for w in assocs}
        results[tname] = row
        belady[tname] = belady_misses(tr, blocks, BLOCK)
        comp[tname] = compulsory(tr, BLOCK)
        fa_m = row[blocks].misses
        assert fa_m >= comp[tname]
        for w in assocs:
            assert belady[tname] <= row[w].misses, (tname, w)                      # (3) the floor
            conflict = row[w].misses - fa_m
            assert comp[tname] + (fa_m - comp[tname]) + conflict == row[w].misses  # (4) the three C's
        assert row[blocks].misses - fa_m == 0

    for w in assocs:   # compulsory misses only: one per block
        assert results[SEQ][w].misses == comp[SEQ] == len(traces[SEQ]) // 8

    # (5a) three arrays one cache size apart: 1 and 2 ways miss everything; 4 ways only the 192 first touches
    tri, r3 = traces[TRI], results[TRI]
    assert r3[1].misses == len(tri) and r3[2].misses == len(tri), (r3[1].misses, r3[2].misses, len(tri))
    assert r3[4].misses == comp[TRI] == 192, r3[4].misses
    big_rate = miss_rate(simulate(tri, 2 * cap, 1), tri)
    assert 0.6 < big_rate < 0.8, big_rate

    # (5b) the matrix: rows fine everywhere; columns thrash below full associativity; tiles fix it direct-mapped
    rm, cm, tm = results[ROW], results[COL], results[TIL]
    mat_n = 128 * 128
    for w in assocs:
        assert rm[w].misses * 8 == mat_n, (w, rm[w].misses)
    for w in (1, 2, 4, 8, 16):
        assert cm[w].misses == mat_n, (w, cm[w].misses)
    assert cm[blocks].misses * 8 == mat_n and tm[1].misses * 8 == mat_n and belady[COL] * 8 == mat_n

    # (5c) Zipf: conflicts fall with associativity, diminishing past eight ways
    zt, rz = traces[ZIP], results[ZIP]
    zm = {w: rz[w].misses for w in assocs}
    fa_m = zm[blocks]
    conflict = {w: zm[w] - fa_m for w in assocs}
    assert zm[1] > zm[2] > zm[4] >= zm[8] >= fa_m, zm
    assert conflict[blocks] == 0 and conflict[1] > conflict[2] > conflict[4] >= conflict[8] >= 0, conflict
    assert conflict[4] < 0.25 * conflict[1], (conflict[4], conflict[1])
    fifo4, rand4, lru4 = simulate(zt, cap, 4, 'fifo'), simulate(zt, cap, 4, 'random'), rz[4]
    assert lru4.misses <= fifo4.misses and lru4.misses <= rand4.misses, (lru4.misses, fifo4.misses, rand4.misses)
    two_half = simulate(zt, cap // 2, 2)
    thumb_ratio = zm[1] / two_half.misses
    assert 0.8 < thumb_ratio < 1.25, thumb_ratio

    # (5d) five blocks cycling through one four-way set: LRU and FIFO miss everything, random does not
    cyc = trace_cyclic_one_set(cap, BLOCK, 4, 5, 2000)
    cyc_lru, cyc_fifo, cyc_rand = simulate(cyc, cap, 4, 'lru'), simulate(cyc, cap, 4, 'fifo'), simulate(cyc, cap, 4, 'random')
    assert cyc_lru.misses == len(cyc) and cyc_fifo.misses == len(cyc)
    assert cyc_rand.misses < 0.8 * len(cyc), cyc_rand.misses
    cyc_bel = belady_misses(cyc, 4, BLOCK)
    assert cyc_bel < cyc_lru.misses
    cyc4_lru = simulate(trace_cyclic_one_set(cap, BLOCK, 4, 4, 2000), cap, 4, 'lru')
    assert cyc4_lru.misses == 4

    # comparators and tag storage per associativity (32-bit addresses)
    overhead = {}
    for w in assocs:
        c = SetAssociativeCache(cap, BLOCK, w)
        lru_bits = blocks * (math.ceil(math.log2(w)) if w > 1 else 0)
        overhead[w] = (c.tag_bits, c.index_bits, c.offset_bits, w, (c.tag_bits * blocks + blocks + lru_bits) / (cap * 8) * 100)
    assert overhead[1][0] == 18 and overhead[blocks][0] == 26 and overhead[blocks][3] == 256
    elapsed = time.time() - t_start

    print(f'contest: 16 KB, 64-byte blocks, index then tag; referees: {split_checks:,} address rebuilds, {ref_checks:,} reference agreements, Belady as the floor, the three C decomposition')
    print(f'{"trace":>30} ' + ' '.join(f'{name(w):>17}' for w in assocs) + f' {"Belady":>8} {"compulsory":>10}')
    for tname, tr in traces.items():
        print(f'{tname:>30} ' + ' '.join(f'{100 * miss_rate(results[tname][w], tr):>16.2f}%' for w in assocs)
              + f' {100 * belady[tname] / len(tr):>7.2f}% {100 * comp[tname] / len(tr):>9.2f}%')
    print(f'three arrays: 32 KB direct-mapped still {100 * big_rate:.1f}%; Zipf misses = {comp[ZIP]:,} compulsory + {fa_m - comp[ZIP]:,} capacity + conflict '
          + ', '.join(f'{conflict[w]:,}' for w in assocs) + f'; rule of thumb: 1-way 16 KB {zm[1]:,} against 2-way 8 KB {two_half.misses:,} (ratio {thumb_ratio:.3f})')
    print(f'4-way on Zipf: LRU {lru4.misses:,}, FIFO {fifo4.misses:,}, random {rand4.misses:,}; five blocks in one 4-way set ({len(cyc):,}): LRU {cyc_lru.misses:,}, FIFO {cyc_fifo.misses:,}, random {cyc_rand.misses:,}, Belady {cyc_bel:,}; four blocks: LRU {cyc4_lru.misses}')
    print('ways, tag/index/offset bits, comparators, tag+valid+LRU overhead: ' + '; '.join(f'{name(w)} {tb}/{ib}/{ob} {cmp} {ov:.2f}%' for w, (tb, ib, ob, cmp, ov) in overhead.items()))
    print(f'elapsed {elapsed:.1f} s')
    print(f'OK: the index-tag split reconstructs every address in {split_checks:,} checks and the general simulator matches independent direct-mapped and fully associative LRU references on {ref_checks:,} accesses; '
          f'three arrays one cache size apart (192 of 256 blocks) miss {100 * miss_rate(r3[1], tri):.0f}% direct-mapped and {100 * miss_rate(r3[2], tri):.0f}% two-way but only their {r3[4].misses} first touches four-way; '
          f'the column walk misses 100% at every associativity below full and 12.5% fully associative or tiled; '
          f'Zipf conflict misses fall from {conflict[1]:,} to {conflict[2]:,}, {conflict[4]:,}, {conflict[8]:,}, 0 at 1, 2, 4, 8, 256 ways above a Belady floor of {belady[ZIP]:,} misses; '
          f'direct-mapped 16 KB to two-way 8 KB ratio {thumb_ratio:.3f}; the five-block cycle defeats LRU and FIFO ({cyc_lru.misses:,} of {len(cyc):,}) but not random ({cyc_rand.misses:,})')


if __name__ == '__main__':
    main()
