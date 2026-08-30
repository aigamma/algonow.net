# Puzzle 111: Arithmetic coding x range renormalization
# The entropy-coding job is to turn a message into the fewest
# possible bits given a probability model. (This comment avoids
# the words c-o-d-i-n-g-colon in the first two lines on purpose:
# Python's PEP 263 encoding-declaration regex reads them there,
# and a first draft of this header crashed the interpreter with
# "encoding problem: turn". Even comments have parsers.) Huffman gives every symbol a whole
# number of bits, and that granularity is a wall: a symbol with
# probability 0.99 carries 0.014 bits of information but must
# spend at least 1 full bit. Arithmetic coding dissolves the
# wall: the entire message becomes ONE number in [0, 1), each
# symbol narrowing the interval by its probability, so a
# 0.99-probability symbol costs its true 0.0145 bits: fractional
# bits, pooled across the message.
#
# The pairing is the point. The algorithm is arithmetic coding
# (Elias's interval idea, made finite-precision by Rissanen and
# Pasco, canonized by Witten-Neal-Cleary 1987). The heuristic is
# range renormalization: the move that makes it an ALGORITHM
# rather than a thought experiment: whenever the interval's
# leading bits are settled, ship them and rescale the 32-bit
# registers (with the classic underflow/straddle handling), so
# the state never grows. This file builds the naive
# infinite-precision coder too and MEASURES its state exploding.
#
# Referees:
# (1) round-trip exactness: decode(encode(x)) == x on 300
#     randomized messages (skewed, uniform, single-symbol,
#     empty-ish) and every contest text;
# (2) the Shannon floor: output never beats the model entropy
#     (asserted >= nH - epsilon) and lands within 0.2% + 64 bits
#     of it (the finite-precision tax, measured tiny);
# (3) the Huffman wall measured: on a 99/1 binary source Huffman
#     pays ~1 bit/symbol against an entropy of 0.081: 12x: while
#     on English-like frequencies Huffman sits within a few
#     percent (parity said plainly);
# (4) renormalization audited: the range register never
#     underflows quarter-width, straddle events counted;
# (5) the neverUse measured: the exact-fraction coder's state
#     grows without bound (denominator bits vs symbols coded)
#     while the range coder never leaves 32 bits.
import heapq
import math
import random
from fractions import Fraction

SEED = 20260829
BITS = 32
FULL = (1 << BITS) - 1
HALF = 1 << (BITS - 1)
QUARTER = 1 << (BITS - 2)


def build_model(counts):
    """Cumulative-frequency model over symbol ids 0..k-1."""
    total = sum(counts)
    cum = [0]
    for c in counts:
        cum.append(cum[-1] + c)
    return counts, cum, total


def ac_encode(syms, model):
    counts, cum, total = model
    low = 0
    high = FULL
    pending = 0
    out = []
    straddles = 0

    def emit(bit):
        out.append(bit)
        nonlocal pending
        while pending:
            out.append(1 - bit)
            pending -= 1

    for s in syms:
        rng = high - low + 1
        assert rng >= QUARTER, 'range underflow: renormalization failed'
        high = low + rng * cum[s + 1] // total - 1
        low = low + rng * cum[s] // total
        while True:
            if high < HALF:
                emit(0)
            elif low >= HALF:
                emit(1)
                low -= HALF
                high -= HALF
            elif low >= QUARTER and high < 3 * QUARTER:
                pending += 1
                straddles += 1
                low -= QUARTER
                high -= QUARTER
            else:
                break
            low = low * 2
            high = high * 2 + 1
    pending += 1
    if low < QUARTER:
        emit(0)
    else:
        emit(1)
    return out, straddles


def ac_decode(bits, n, model):
    counts, cum, total = model
    low = 0
    high = FULL
    code = 0
    pos = 0
    for _ in range(BITS):
        code = (code << 1) | (bits[pos] if pos < len(bits) else 0)
        pos += 1
    out = []
    for _ in range(n):
        rng = high - low + 1
        value = ((code - low + 1) * total - 1) // rng
        # find symbol with cum[s] <= value < cum[s+1]
        lo, hi = 0, len(counts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if cum[mid] <= value:
                lo = mid
            else:
                hi = mid - 1
        s = lo
        out.append(s)
        high = low + rng * cum[s + 1] // total - 1
        low = low + rng * cum[s] // total
        while True:
            if high < HALF:
                pass
            elif low >= HALF:
                low -= HALF
                high -= HALF
                code -= HALF
            elif low >= QUARTER and high < 3 * QUARTER:
                low -= QUARTER
                high -= QUARTER
                code -= QUARTER
            else:
                break
            low = low * 2
            high = high * 2 + 1
            code = (code << 1) | (bits[pos] if pos < len(bits) else 0)
            pos += 1
    return out


def huffman_lengths(counts):
    """Codeword length per symbol (0-count symbols excluded)."""
    heap = [(c, i, None) for i, c in enumerate(counts) if c > 0]
    if len(heap) == 1:
        return {heap[0][1]: 1}
    heapq.heapify(heap)
    uid = len(counts)
    tree = {}
    while len(heap) > 1:
        c1, i1, t1 = heapq.heappop(heap)
        c2, i2, t2 = heapq.heappop(heap)
        tree[uid] = (i1 if t1 is None else t1, i2 if t2 is None else t2)
        heapq.heappush(heap, (c1 + c2, uid, uid))
        uid += 1
    lengths = {}
    root = heap[0][2]

    def walk(node, depth):
        if node not in tree:
            lengths[node] = max(depth, 1)
            return
        a, b = tree[node]
        walk(a, depth + 1)
        walk(b, depth + 1)

    walk(root, 0)
    return lengths


def entropy_bits(counts, n):
    total = sum(counts)
    h = 0.0
    for c in counts:
        if c:
            p = c / total
            h -= p * math.log2(p)
    return h * n


def frac_encode_state(syms, model):
    """The neverUse: exact-fraction interval coder. Correct, and
    its state grows without bound: returns denominator bit-length
    checkpoints."""
    counts, cum, total = model
    low = Fraction(0)
    width = Fraction(1)
    checkpoints = []
    for i, s in enumerate(syms):
        low = low + width * Fraction(cum[s], total)
        width = width * Fraction(counts[s], total)
        if (i + 1) % 250 == 0:
            checkpoints.append((i + 1, width.denominator.bit_length()))
    return low, width, checkpoints


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: round-trip exactness on 300 randomized messages.
    for trial in range(300):
        k = rng.choice([2, 3, 8, 26])
        n = rng.randrange(1, 300)
        weights = [rng.randrange(1, 50) for _ in range(k)]
        syms = rng.choices(range(k), weights=weights, k=n)
        counts = [max(1, syms.count(i)) for i in range(k)]
        model = build_model(counts)
        bits, _ = ac_encode(syms, model)
        assert ac_decode(bits, n, model) == syms, trial
    # edge: all one symbol
    syms = [0] * 500
    model = build_model([500, 1])
    bits, _ = ac_encode(syms, model)
    assert ac_decode(bits, 500, model) == syms

    # The contest sources, 50,000 symbols each.
    N = 50_000
    results = {}
    for name, probs in [
        ('skewed 99/1', [0.99, 0.01]),
        ('english-like', None),
        ('uniform bytes', [1 / 256] * 256),
    ]:
        if name == 'english-like':
            freqs = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
                     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]
            total = sum(freqs)
            probs = [f / total for f in freqs]
        k = len(probs)
        syms = rng.choices(range(k), weights=probs, k=N)
        counts = [max(1, syms.count(i)) for i in range(k)]
        model = build_model(counts)
        bits, straddles = ac_encode(syms, model)
        assert ac_decode(bits, N, model) == syms, name
        h_bits = entropy_bits(counts, N)
        lengths = huffman_lengths(counts)
        huff_bits = sum(lengths[s] for s in syms)
        # Oracle 2: the floor and the tiny tax.
        assert len(bits) >= h_bits - 1e-6, name
        assert len(bits) <= h_bits * 1.002 + 64, (name, len(bits), h_bits)
        assert huff_bits >= h_bits - 1e-6
        results[name] = (len(bits), huff_bits, h_bits, straddles)

    sk = results['skewed 99/1']
    en = results['english-like']
    un = results['uniform bytes']
    # Oracle 3: the wall, and the parity rows.
    assert sk[1] > 10 * sk[0], sk        # huffman pays >10x on the skew
    assert en[1] < en[2] * 1.05, en      # english: huffman within 5% of entropy
    assert abs(un[1] - un[0]) < un[2] * 0.01  # uniform: parity

    # Oracle 5: the neverUse: fraction-coder state explosion.
    n_frac = 2_000
    syms_f = rng.choices(range(2), weights=[0.6, 0.4], k=n_frac)
    model_f = build_model([max(1, syms_f.count(0)), max(1, syms_f.count(1))])
    _, _, checkpoints = frac_encode_state(syms_f, model_f)
    growth = [b for _, b in checkpoints]
    assert all(g2 > g1 for g1, g2 in zip(growth, growth[1:]))  # monotone explosion
    assert growth[-1] > 2000, growth[-1]  # thousands of bits of state by n=2,000

    print('contest: 50,000 symbols per source; one currency: output bits; the entropy floor n*H computed from the same counted model; referee: exact round-trip decode on every message')
    print(f"  {'source':<22} {'huffman':>10} {'arithmetic':>11} {'entropy floor':>14}")
    print(f"  {'skewed 99/1':<22} {sk[1]:>10,} {sk[0]:>11,} {sk[2]:>14,.0f}   the wall: whole bits per symbol vs 0.08 bits of information: {sk[1] / sk[0]:.1f}x")
    print(f"  {'english-like':<22} {en[1]:>10,} {en[0]:>11,} {en[2]:>14,.0f}   parity said plainly: huffman within {100 * (en[1] / en[2] - 1):.1f}% when probabilities suit whole bits")
    print(f"  {'uniform bytes':<22} {un[1]:>10,} {un[0]:>11,} {un[2]:>14,.0f}   dead heat: 8-bit symbols want exactly 8 bits")
    print(f"the floor, honored: arithmetic output within {100 * (sk[0] / sk[2] - 1):.2f}% / {100 * (en[0] / en[2] - 1):.2f}% / {100 * (un[0] / un[2] - 1):.2f}% of n*H, never below it: {sk[3] + en[3] + un[3]:,} straddle renormalizations handled")
    print(f"the neverUse, measured: the exact-fraction coder's denominator grew {growth[0]:,} -> {growth[-1]:,} bits over 2,000 symbols (monotone, unbounded); the range coder's registers never left {BITS} bits by construction")
    print(f'OK: exact round-trip on 300 randomized messages + all contest sources; output >= n*H always and within 0.2% + 64 bits of it; '
          f'the huffman wall at {sk[1] / sk[0]:.1f}x on the skew with parity on english ({100 * (en[1] / en[2] - 1):.1f}%) and uniform; '
          f'renormalization audited (range never under quarter-width); the fraction coder\'s state measured exploding while the register coder stays at {BITS} bits')
