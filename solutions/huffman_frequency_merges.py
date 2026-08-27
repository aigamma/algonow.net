# Puzzle 14: Huffman coding x frequency-sorted merges
# Given symbol frequencies, build the prefix-free code that minimizes the
# encoded length, and know exactly when fractional-bit coders beat it.
#
# The pairing is the point. The control structure is bottom-up tree building:
# repeatedly merge two subtrees into one until a single tree remains; leaf
# depth becomes code length. The heuristic is WHICH two to merge: always the
# two lowest-frequency nodes. The exchange argument turns that greedy choice
# into a theorem: the two rarest symbols can be assumed to be siblings at the
# deepest level (swapping anything else deeper only shortens the total), so
# merging them is safe, and induction does the rest. The result is optimal
# among ALL prefix-free codes, proven here against exhaustive search.
import heapq
import math
import random
from collections import Counter


def huffman_lengths(freq):
    """Code length per symbol via frequency-sorted merges."""
    if len(freq) == 1:
        return {next(iter(freq)): 1}
    heap = []
    for i, (s, f) in enumerate(sorted(freq.items())):
        heapq.heappush(heap, (f, i, {s: 0}))
    tie = len(heap)
    while len(heap) > 1:
        f1, _, d1 = heapq.heappop(heap)  # the two lowest frequencies
        f2, _, d2 = heapq.heappop(heap)
        merged = {s: l + 1 for s, l in d1.items()}
        merged.update({s: l + 1 for s, l in d2.items()})
        heapq.heappush(heap, (f1 + f2, tie, merged))
        tie += 1
    return heap[0][2]


def canonical_codes(lengths):
    """Assign actual bit strings from lengths, canonically: sort by (length,
    symbol) and count upward. Prefix-freedom falls out of the Kraft sums."""
    codes = {}
    code = 0
    prev = 0
    for s, l in sorted(lengths.items(), key=lambda kv: (kv[1], kv[0])):
        code <<= l - prev
        prev = l
        codes[s] = format(code, f"0{l}b")
        code += 1
    return codes


def huffman_encode(text, freq):
    codes = canonical_codes(huffman_lengths(freq))
    return "".join(codes[c] for c in text), codes


def huffman_decode(bits, codes):
    inv = {v: k for k, v in codes.items()}
    out = []
    cur = ""
    for b in bits:
        cur += b
        if cur in inv:
            out.append(inv[cur])
            cur = ""
    assert cur == "", "leftover bits"
    return "".join(out)


# ---------------------------------------------------------------- the rivals


def shannon_fano_lengths(freq):
    """Fano's top-down splitter: sort by frequency, cut the list where the
    halves are most balanced, recurse. The 1948-vintage method Huffman's
    term paper dethroned; close to optimal, and provably not optimal."""
    lengths = {}

    def split(items, depth):
        if len(items) == 1:
            lengths[items[0][0]] = max(depth, 1)
            return
        total = sum(f for _, f in items)
        acc = 0
        best_i, best_gap = 1, None
        for i in range(1, len(items)):
            acc += items[i - 1][1]
            gap = abs(2 * acc - total)
            if best_gap is None or gap < best_gap:
                best_gap, best_i = gap, i
        split(items[:best_i], depth + 1)
        split(items[best_i:], depth + 1)

    split(sorted(freq.items(), key=lambda kv: -kv[1]), 0)
    return lengths


class ArithmeticCoder:
    """A 32-bit integer arithmetic coder with the classic E1/E2/E3
    renormalization. Codes the message as one long fraction, so symbols may
    cost fractional bits; total length approaches n times the entropy."""

    TOP = 1 << 32
    MASK = TOP - 1
    HALF = 1 << 31
    QTR = 1 << 30

    def __init__(self, freq):
        self.syms = sorted(freq)
        self.cum = {}
        acc = 0
        for s in self.syms:
            self.cum[s] = (acc, acc + freq[s])
            acc += freq[s]
        self.total = acc

    def encode(self, text):
        low, high, pending = 0, self.MASK, 0
        out = []

        def emit(bit):
            nonlocal pending
            out.append(bit)
            out.extend("1" if bit == "0" else "0" for _ in range(pending))
            pending = 0

        for c in text:
            clo, chi = self.cum[c]
            span = high - low + 1
            high = low + span * chi // self.total - 1
            low = low + span * clo // self.total
            while True:
                if high < self.HALF:
                    emit("0")
                elif low >= self.HALF:
                    emit("1")
                    low -= self.HALF
                    high -= self.HALF
                elif low >= self.QTR and high < 3 * self.QTR:
                    pending += 1
                    low -= self.QTR
                    high -= self.QTR
                else:
                    break
                low <<= 1
                high = (high << 1) | 1
        pending += 1
        emit("0" if low < self.QTR else "1")
        return "".join(out)

    def decode(self, bits, n):
        bits = bits + "0" * 40
        low, high = 0, self.MASK
        code = int(bits[:32], 2)
        pos = 32
        out = []
        for _ in range(n):
            span = high - low + 1
            value = ((code - low + 1) * self.total - 1) // span
            for s in self.syms:
                clo, chi = self.cum[s]
                if clo <= value < chi:
                    break
            out.append(s)
            high = low + span * chi // self.total - 1
            low = low + span * clo // self.total
            while True:
                if high < self.HALF:
                    pass
                elif low >= self.HALF:
                    low -= self.HALF
                    high -= self.HALF
                    code -= self.HALF
                elif low >= self.QTR and high < 3 * self.QTR:
                    low -= self.QTR
                    high -= self.QTR
                    code -= self.QTR
                else:
                    break
                low <<= 1
                high = (high << 1) | 1
                code = ((code << 1) | int(bits[pos])) & self.MASK
                pos += 1
        return "".join(out)


class RansCoder:
    """Range ANS with byte renormalization: arithmetic coding's ratios at
    table-driven speed. Frequencies are quantized to 4,096 slots; encoding
    runs backward, decoding forward. This is the engine family inside zstd."""

    SCALE = 12
    M = 1 << SCALE
    L = 1 << 23

    def __init__(self, freq):
        total = sum(freq.values())
        self.f = {}
        acc = 0
        items = sorted(freq.items())
        for s, fr in items:
            q = max(1, round(fr * self.M / total))
            self.f[s] = q
        drift = self.M - sum(self.f.values())
        top = max(self.f, key=lambda s: self.f[s])
        self.f[top] += drift  # absorb rounding into the commonest symbol
        assert self.f[top] > 0
        self.cum = {}
        for s in sorted(self.f):
            self.cum[s] = acc
            acc += self.f[s]
        self.slot = [None] * self.M
        for s in self.f:
            for k in range(self.cum[s], self.cum[s] + self.f[s]):
                self.slot[k] = s

    def encode(self, text):
        x = self.L
        out = bytearray()
        for c in reversed(text):
            f = self.f[c]
            x_max = ((self.L >> self.SCALE) << 8) * f
            while x >= x_max:
                out.append(x & 255)
                x >>= 8
            x = ((x // f) << self.SCALE) + (x % f) + self.cum[c]
        return x, out

    def decode(self, state, data, n):
        x = state
        data = bytearray(data)
        out = []
        for _ in range(n):
            slot = x & (self.M - 1)
            s = self.slot[slot]
            out.append(s)
            x = self.f[s] * (x >> self.SCALE) + slot - self.cum[s]
            while x < self.L and data:
                x = (x << 8) | data.pop()
        return "".join(out)

    @staticmethod
    def bits(state, data):
        return 8 * len(data) + 32  # payload plus the flushed state


def rle_bits(text):
    """Naive run-length coding: (symbol, count) pairs at 16 bits each. The
    wrong model for frequency skew: it prices repetition, which English
    prose barely has, so it EXPANDS this instance."""
    runs = 1
    for i in range(1, len(text)):
        if text[i] != text[i - 1]:
            runs += 1
    return runs * 16


# --------------------------------------------------------------- the contest

WORDS = (
    "the of a to in is that it for on with as at by from this be are was "
    "code tree bit symbol merge queue table stream block letter count sum "
    "prefix length weight branch leaf root depth swap proof paper exam"
).split()


def prose(target=200_000, seed=20260827):
    rng = random.Random(seed)
    parts = []
    size = 0
    while size < target:
        w = rng.choice(WORDS)
        parts.append(w)
        size += len(w) + 1
    return " ".join(parts)


def skewed(n=200_000, seed=20260828):
    """A quiet sensor: almost always 'a', rarely 'b', very rarely 'c'."""
    rng = random.Random(seed)
    return "".join(
        "a" if (r := rng.random()) < 0.98 else ("b" if r < 0.995 else "c")
        for _ in range(n)
    )


def entropy_bits(text):
    n = len(text)
    freq = Counter(text)
    return n * -sum((f / n) * math.log2(f / n) for f in freq.values())


def measure(text):
    n = len(text)
    freq = Counter(text)
    k = len(freq)
    fixed = n * math.ceil(math.log2(k)) if k > 1 else n

    hl = huffman_lengths(freq)
    h_bits = sum(freq[s] * hl[s] for s in freq)
    sf = shannon_fano_lengths(freq)
    sf_bits = sum(freq[s] * sf[s] for s in freq)

    ac = ArithmeticCoder(freq)
    a_stream = ac.encode(text)
    a_bits = len(a_stream)

    rc = RansCoder(freq)
    state, payload = rc.encode(text)
    r_bits = RansCoder.bits(state, payload)

    return {
        "n": n,
        "entropy": entropy_bits(text),
        "ascii": 8 * n,
        "fixed": fixed,
        "shannon_fano": sf_bits,
        "huffman": h_bits,
        "arithmetic": a_bits,
        "rans": r_bits,
        "_roundtrip": (ac, a_stream, rc, state, payload, freq),
    }


if __name__ == "__main__":
    rng = random.Random(5)

    # Oracle 1: optimality, against exhaustive search. For 200 random small
    # alphabets, enumerate every Kraft-feasible length vector up to depth 8
    # and confirm no prefix-free code beats Huffman's cost.
    def best_possible(freqs):
        syms = sorted(freqs, key=lambda s: -freqs[s])
        best = [math.inf]

        def dfs(i, kraft_left, cost):
            if cost >= best[0]:
                return
            if i == len(syms):
                best[0] = cost
                return
            for l in range(1, 9):
                unit = 2 ** -l
                if unit > kraft_left + 1e-12:
                    continue
                # Even giving every later symbol depth 8 must still fit.
                if kraft_left - unit + 1e-12 < (len(syms) - i - 1) * 2 ** -8:
                    continue
                dfs(i + 1, kraft_left - unit, cost + freqs[syms[i]] * l)

        dfs(0, 1.0, 0)
        return best[0]

    sf_beaten_somewhere = False
    for _ in range(200):
        k = rng.randint(2, 6)
        freqs = {chr(97 + i): rng.randint(1, 40) for i in range(k)}
        hl = huffman_lengths(freqs)
        h_cost = sum(freqs[s] * hl[s] for s in freqs)
        assert abs(h_cost - best_possible(freqs)) < 1e-9, (freqs, h_cost)
        sfl = shannon_fano_lengths(freqs)
        sf_cost = sum(freqs[s] * sfl[s] for s in freqs)
        assert sf_cost >= h_cost, "Shannon-Fano can never beat Huffman"
        if sf_cost > h_cost:
            sf_beaten_somewhere = True
    assert sf_beaten_somewhere, "the sweep should catch Fano losing at least once"

    # Oracle 2: the code is a real prefix-free code with a full tree:
    # no code word starts another, and the Kraft sums come to exactly 1.
    freqs = {c: f for c, f in Counter(prose(20_000)).items()}
    lengths = huffman_lengths(freqs)
    codes = canonical_codes(lengths)
    words = sorted(codes.values())
    for i in range(len(words) - 1):
        assert not words[i + 1].startswith(words[i]), "prefix violation"
    assert abs(sum(2 ** -l for l in lengths.values()) - 1.0) < 1e-9, "tree not full"

    # Oracle 3: round trips. Huffman, arithmetic, and rANS must all decode
    # back to the exact original on both instances.
    for text in (prose(30_000), skewed(30_000)):
        freq = Counter(text)
        bits, cds = huffman_encode(text, freq)
        assert huffman_decode(bits, cds) == text, "huffman roundtrip"
        ac = ArithmeticCoder(freq)
        assert ac.decode(ac.encode(text), len(text)) == text, "arithmetic roundtrip"
        rc = RansCoder(freq)
        st, payload = rc.encode(text)
        assert rc.decode(st, bytes(payload), len(text)) == text, "rANS roundtrip"

    # Oracle 4: Shannon's floor, as an inequality the coders cannot cross.
    a = measure(prose())
    b = measure(skewed())
    for m in (a, b):
        for key in ("huffman", "shannon_fano", "arithmetic", "rans"):
            assert m[key] >= m["entropy"] - 64, f"{key} beat entropy: impossible"
    # ...and the near-entropy coders sit within one percent of it (plus the
    # rANS state flush) on the big instances.
    assert a["arithmetic"] < 1.01 * a["entropy"] + 64
    assert a["rans"] < 1.01 * a["entropy"] + 64

    # Oracle 5: the skew cliff. Prefix codes cannot go below one bit per
    # symbol, so on the quiet sensor Huffman pays ~n while the fractional
    # coders pay near the tiny entropy.
    assert b["huffman"] >= b["n"], "prefix codes are floored at 1 bit/symbol"
    assert b["arithmetic"] < b["n"] / 5, "arithmetic must crush the skew"
    assert b["rans"] < b["n"] / 5, "rANS must crush the skew"

    # Oracle 6: on ordinary text Huffman sits within one percent of entropy,
    # and Fano never beats it.
    assert a["huffman"] < 1.01 * a["entropy"]
    assert a["shannon_fano"] >= a["huffman"]

    # Oracle 7: the never-here, measured. Naive RLE expands English prose.
    assert rle_bits(prose()) > a["ascii"], "RLE should expand run-free text"

    def row(name, key):
        return f"  {name:<26} {a[key]:>12,.0f} {b[key]:>12,.0f}"

    print(f"contest, bits to encode each instance (English prose n={a['n']:,}, "
          f"quiet sensor n={b['n']:,}):")
    print(f"  {'entropy floor (Shannon)':<26} {a['entropy']:>12,.0f} {b['entropy']:>12,.0f}")
    print(row("ASCII, 8 bits flat", "ascii"))
    print(row("fixed width", "fixed"))
    print(row("Shannon-Fano", "shannon_fano"))
    print(row("Huffman x sorted merges", "huffman"))
    print(row("arithmetic coding", "arithmetic"))
    print(row("rANS", "rans"))
    print(f"  naive RLE on the prose expands it to {rle_bits(prose()):,} bits")
    print("OK: optimal against exhaustive search, three coders round-trip, the floor holds, and the skew cliff is measured")
