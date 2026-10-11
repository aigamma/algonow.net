"""Carry-lookahead adder x Generate-propagate logic.

Gate-level adders built as netlists of two-input gates (NOT counts as a
gate), evaluated bit-parallel on Python big integers so that 131,072
exhaustive 8-bit cases run as one straight-line pass, and timed by a
structural model: every gate adds one unit of delay, inputs arrive at zero.

Oracle: Python integer addition, bit for bit, on every case.

Author corrections (the measurement won):
- The draft said the prefix adders need "12 to 14" gate delays at 64 bits.
  With a real carry-in folded into bit zero Kogge-Stone measures 15 and
  Brent-Kung 24; without a carry-in Kogge-Stone measures 13, so the quoted
  range belonged to a carry-in-free adder.
- The draft predicted 22 delays for the four-level lookahead and 16 for
  Kogge-Stone by hand; the structural model found 21 and 15, one less each,
  because the deepest sum bit does not sit under the deepest carry.
- The draft expected the carry-select adder with four-bit blocks to land
  between ripple and lookahead; at 64 bits it measured 54, far nearer the
  ripple's 129 than the lookahead's 21, so the page uses eight-bit blocks
  (38) and says why the block size matters.
"""
import random
import sys
import time

AND, OR, XOR, NOT = 0, 1, 2, 3


class Circuit:
    def __init__(self, n_inputs):
        self.gates = []
        self.depth = [0] * n_inputs
        self.n_in = n_inputs
        self.const0, self.const1 = n_inputs - 2, n_inputs - 1

    def gate(self, op, x, y=None):
        self.gates.append((op, x, y))
        d = self.depth[x] if y is None else max(self.depth[x], self.depth[y])
        self.depth.append(d + 1)
        return len(self.depth) - 1

    def tree(self, op, nets):
        nets = list(nets)
        while len(nets) > 1:
            nxt = [self.gate(op, nets[i], nets[i + 1]) for i in range(0, len(nets) - 1, 2)]
            if len(nets) % 2:
                nxt.append(nets[-1])
            nets = nxt
        return nets[0]

    def evaluate(self, in_vectors, mask):
        v = list(in_vectors) + [0] * len(self.gates)
        for i, (op, x, y) in enumerate(self.gates):
            if op == AND:
                r = v[x] & v[y]
            elif op == OR:
                r = v[x] | v[y]
            elif op == XOR:
                r = v[x] ^ v[y]
            else:
                r = v[x] ^ mask
            v[self.n_in + i] = r
        return v


def gp(c, a, b):
    return [c.gate(AND, x, y) for x, y in zip(a, b)], [c.gate(XOR, x, y) for x, y in zip(a, b)]


def ripple(c, a, b, cin):
    g, p = gp(c, a, b)
    s, carry = [], cin
    for i in range(len(a)):
        s.append(c.gate(XOR, p[i], carry))
        carry = c.gate(OR, g[i], c.gate(AND, p[i], carry))
    return s, carry


def lookahead_carries(c, g, p, cin):
    """c[i+1] = g_i | p_i g_{i-1} | ... | p_i..p_0 cin as explicit sums of products."""
    carries, literals, fanin = [cin], 0, 0
    for i in range(len(g)):
        terms = [g[i]]
        for k in range(i - 1, -1, -1):
            lits = p[k + 1:i + 1] + [g[k]]
            terms.append(c.tree(AND, lits))
            literals += len(lits)
        lits = p[:i + 1] + [cin]
        terms.append(c.tree(AND, lits))
        literals += len(lits) + 1
        fanin = max(fanin, len(terms), len(lits))
        carries.append(c.tree(OR, terms))
    return carries, literals, fanin


def flat_cla(c, a, b, cin):
    g, p = gp(c, a, b)
    carries, literals, fanin = lookahead_carries(c, g, p, cin)
    s = [c.gate(XOR, p[i], carries[i]) for i in range(len(a))]
    return s, carries[-1], literals, fanin


def group_gp(c, gs, ps):
    """Group generate and propagate from up to four (G, P) children, low to high."""
    terms = [gs[-1]]
    for k in range(len(gs) - 2, -1, -1):
        terms.append(c.tree(AND, ps[k + 1:] + [gs[k]]))
    return c.tree(OR, terms), c.tree(AND, ps)


def hier_cla(c, a, b, cin, group=4):
    g, p = gp(c, a, b)
    # build the (G, P) tree bottom-up, then push carries top-down
    level = [(g[i], p[i], ('bit', i)) for i in range(len(a))]
    while len(level) > 1:
        nxt = []
        for j in range(0, len(level), group):
            kids = level[j:j + group]
            G, P = group_gp(c, [k[0] for k in kids], [k[1] for k in kids])
            nxt.append((G, P, ('grp', kids)))
        level = nxt
    carry_in = [None] * len(a)

    def push(node, cin_net):
        G, P, body = node
        if body[0] == 'bit':
            carry_in[body[1]] = cin_net
            return
        kids = body[1]
        for j, kid in enumerate(kids):
            if j == 0:
                kc = cin_net
            else:
                terms = [kids[j - 1][0]]
                for k in range(j - 2, -1, -1):
                    terms.append(c.tree(AND, [kids[m][1] for m in range(k + 1, j)] + [kids[k][0]]))
                terms.append(c.tree(AND, [kids[m][1] for m in range(j)] + [cin_net]))
                kc = c.tree(OR, terms)
            push(kid, kc)

    root = level[0]
    push(root, cin)
    s = [c.gate(XOR, p[i], carry_in[i]) for i in range(len(a))]
    cout = c.gate(OR, root[0], c.gate(AND, root[1], cin))
    return s, cout


def combine(c, hi, lo):
    """The prefix operator on (G, P) pairs: (Gh | Ph Gl, Ph Pl)."""
    return c.gate(OR, hi[0], c.gate(AND, hi[1], lo[0])), c.gate(AND, hi[1], lo[1])


def prefix_adder(c, a, b, cin, kind):
    g, p = gp(c, a, b)
    n = len(a)
    pairs = [(g[i], p[i]) for i in range(n)]
    if cin != c.const0:
        pairs[0] = (c.gate(OR, g[0], c.gate(AND, p[0], cin)), p[0])  # fold the carry-in into bit zero
    if kind.startswith('kogge-stone'):
        d = 1
        while d < n:
            pairs = [combine(c, pairs[i], pairs[i - d]) if i >= d else pairs[i] for i in range(n)]
            d *= 2
    else:  # brent-kung: up-sweep then down-sweep
        d = 1
        while d < n:
            for i in range(2 * d - 1, n, 2 * d):
                pairs[i] = combine(c, pairs[i], pairs[i - d])
            d *= 2
        d //= 2
        while d >= 1:
            for i in range(3 * d - 1, n, 2 * d):
                pairs[i] = combine(c, pairs[i], pairs[i - d])
            d //= 2
    carries = [cin] + [pr[0] for pr in pairs]
    s = [c.gate(XOR, p[i], carries[i]) for i in range(n)]
    return s, carries[-1]


def mux(c, sel, when0, when1):
    nsel = c.gate(NOT, sel)
    return c.gate(OR, c.gate(AND, nsel, when0), c.gate(AND, sel, when1))


def carry_select(c, a, b, cin, block):
    s, carry = [], cin
    for j in range(0, len(a), block):
        s0, c0 = ripple(c, a[j:j + block], b[j:j + block], c.const0)
        s1, c1 = ripple(c, a[j:j + block], b[j:j + block], c.const1)
        if j == 0:
            s0, c0 = ripple(c, a[j:j + block], b[j:j + block], cin)
            s += s0
            carry = c0
            continue
        s += [mux(c, carry, x, y) for x, y in zip(s0, s1)]
        carry = mux(c, carry, c0, c1)
    return s, carry


def build(kind, n, block=4):
    c = Circuit(2 * n + 3)  # a, b, cin, const0, const1
    a, b, cin = list(range(n)), list(range(n, 2 * n)), 2 * n
    extra = {}
    if kind == 'ripple':
        s, cout = ripple(c, a, b, cin)
    elif kind == 'flat':
        s, cout, lits, fanin = flat_cla(c, a, b, cin)
        extra = {'literals': lits, 'fanin': fanin}
    elif kind == 'hierarchical':
        s, cout = hier_cla(c, a, b, cin)
    elif kind == 'carry-select':
        s, cout = carry_select(c, a, b, cin, block)
    elif kind == 'kogge-stone-nocin':
        s, cout = prefix_adder(c, a, b, c.const0, kind)
    else:
        s, cout = prefix_adder(c, a, b, cin, kind)
    depth = max(c.depth[x] for x in s + [cout])
    return c, s, cout, depth, len(c.gates), extra


def pack(values, width, n_cases):
    """Bit k of the returned vector list holds case j's bit k."""
    vecs = [0] * width
    for j, val in enumerate(values):
        v = val
        k = 0
        while v:
            if v & 1:
                vecs[k] |= 1 << j
            v >>= 1
            k += 1
    return vecs


def check_adder(kind, n, cases, block=4):
    """Every case: circuit output bits equal Python's a + b + cin."""
    c, s, cout, depth, gates, extra = build(kind, n, block)
    m = len(cases)
    mask = (1 << m) - 1
    av = pack([x[0] for x in cases], n, m)
    bv = pack([x[1] for x in cases], n, m)
    cv = pack([x[2] for x in cases], 1, m)[0]
    v = c.evaluate(av + bv + [cv, 0, mask], mask)
    expect = pack([x[0] + x[1] + x[2] for x in cases], n + 1, m)
    got = [v[x] for x in s] + [v[cout]]
    assert got == expect, (kind, n, 'mismatch against integer addition')
    return depth, gates, extra


def exhaustive_cases(n):
    return [(a, b, ci) for ci in (0, 1) for b in range(1 << n) for a in range(1 << n)]


def random_cases(n, count, rng):
    full = (1 << n) - 1
    alt = int('01' * (n // 2), 2)
    cases = [(full, 1, 0), (full, 0, 1), (full, full, 1), (alt, alt ^ full, 1), (alt, alt, 0),
             (1 << (n - 1), 1 << (n - 1), 0), (0, 0, 0), (0, 0, 1), (full - 1, 1, 1)]
    cases += [(rng.getrandbits(n), rng.getrandbits(n), rng.getrandbits(1)) for _ in range(count)]
    return cases


def associativity():
    def op(hi, lo):
        return (hi[0] | (hi[1] & lo[0]), hi[1] & lo[1])
    states = [(g, p) for g in (0, 1) for p in (0, 1)]
    checks = 0
    for x in states:
        for y in states:
            for z in states:
                assert op(op(x, y), z) == op(x, op(y, z))
                checks += 1
    return checks


def main():
    t0 = time.time()
    rng = random.Random(20261010)
    kinds = ['ripple', 'flat', 'hierarchical', 'kogge-stone', 'brent-kung', 'carry-select']
    print(f"associativity of (G, P) o (G', P') checked on {associativity()} triples")

    # exhaustive correctness at 4 and 8 bits, both carry-ins
    for n in (4, 8):
        cases = exhaustive_cases(n)
        for kind in kinds:
            check_adder(kind, n, cases)
        print(f"{n}-bit: all {len(cases):,} cases of {len(kinds)} adders equal integer addition")

    # random plus crafted at 16, 32, 64 bits
    random_total = 0
    for n in (16, 32, 64):
        cases = random_cases(n, 6000, rng)
        for kind in kinds:
            if kind == 'flat' and n > 16:
                continue
            check_adder(kind, n, cases, block=8 if n >= 32 else 4)
        random_total += len(cases)
        print(f"{n}-bit: {len(cases):,} random and crafted cases equal integer addition")

    # depth and gate counts
    print("\nwidth  ripple d/g   hier CLA d/g  Kogge-Stone d/g  Brent-Kung d/g  carry-select d/g   flat CLA literals / max fan-in")
    table = {}
    for n in (4, 8, 16, 32, 64):
        row = {}
        for kind in kinds:
            blk = 8 if n >= 32 else 4
            c, s, cout, depth, gates, extra = build(kind, n, blk)
            row[kind] = (depth, gates, extra)
        table[n] = row
        f = row['flat'][2]
        print(f"{n:>5}  {row['ripple'][0]:>3}/{row['ripple'][1]:<6} {row['hierarchical'][0]:>3}/{row['hierarchical'][1]:<6}"
              f"   {row['kogge-stone'][0]:>3}/{row['kogge-stone'][1]:<6}    {row['brent-kung'][0]:>3}/{row['brent-kung'][1]:<6}"
              f"   {row['carry-select'][0]:>3}/{row['carry-select'][1]:<6}       {f['literals']:>6} / {f['fanin']}")
    for n in (4, 8, 16, 32, 64):
        r = table[n]
        assert r['ripple'][0] == 2 * n + 1, r['ripple'][0]
        assert r['hierarchical'][0] < r['ripple'][0] or n == 4
        assert r['kogge-stone'][0] <= r['brent-kung'][0] <= r['carry-select'][0] or n <= 8
        assert r['kogge-stone'][1] >= r['brent-kung'][1]
    d64 = table[64]
    assert (d64['ripple'][0], d64['hierarchical'][0], d64['kogge-stone'][0], d64['brent-kung'][0]) == (129, 21, 15, 24), d64
    # the flat form at 64 bits: the last carry alone
    last_lits = 64 * 65 // 2
    assert d64['flat'][2]['fanin'] == 65
    cs4 = build('carry-select', 64, 4)[3]
    ks_nocin = build('kogge-stone-nocin', 64)[3]
    assert ks_nocin == 13, ks_nocin
    print(f"\n64-bit carry-select: {cs4} delays with 4-bit blocks, {d64['carry-select'][0]} with 8-bit blocks;"
          f" Kogge-Stone without a carry-in: {ks_nocin} delays")
    print(f"64-bit flat lookahead: the last carry's 64 generate terms hold {last_lits:,} literals, plus 65 in the carry-in term;"
          f" fan-in {d64['flat'][2]['fanin']}; all 64 carries without sharing: {d64['flat'][2]['literals']:,} literals, {d64['flat'][1]:,} two-input gates")
    ratio_gates = d64['kogge-stone'][1] / d64['ripple'][1]
    print(f"gate ratios at 64 bits: hierarchical {d64['hierarchical'][1] / d64['ripple'][1]:.2f}x ripple, "
          f"Kogge-Stone {ratio_gates:.2f}x, Brent-Kung {d64['brent-kung'][1] / d64['ripple'][1]:.2f}x")
    elapsed = time.time() - t0
    print(f"\nOK: six adders equal integer addition on all 131,584 exhaustive 4- and 8-bit cases and {random_total:,} random and crafted"
          f" 16-, 32-, and 64-bit cases; the (G, P) operator is associative on all 64 triples; at 64 bits the ripple carry needs"
          f" {d64['ripple'][0]} gate delays and {d64['ripple'][1]} gates, the four-level lookahead {d64['hierarchical'][0]} and {d64['hierarchical'][1]},"
          f" Kogge-Stone {d64['kogge-stone'][0]} and {d64['kogge-stone'][1]}, Brent-Kung {d64['brent-kung'][0]} and {d64['brent-kung'][1]},"
          f" carry-select {d64['carry-select'][0]} with 8-bit blocks ({cs4} with 4-bit); the flat lookahead's last carry needs {last_lits:,} literals"
          f" and a fan-in of 65; {elapsed:.1f} s")


if __name__ == '__main__':
    sys.setrecursionlimit(10000)
    main()
