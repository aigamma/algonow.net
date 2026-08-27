# Puzzle 12: HyperLogLog x leading-zero registers
# Count the DISTINCT items in a million-item stream, in one kilobyte, forever.
#
# The pairing is the point. The control structure is stochastic averaging:
# split the stream by hash into m substreams, keep one tiny register per
# substream, and combine the registers with a harmonic mean (plus a
# small-range fallback). The heuristic is the observable each register
# stores: the longest run of leading zeros ever seen in that substream's
# hashes. A run of r leading zeros appears about once per 2^r distinct
# hashes, so the maximum run is a witness statement about how many distinct
# values went by, and 1,024 witnesses averaged together pin the count to
# about three percent using 768 bytes.
import math
import random

M64 = (1 << 64) - 1


def mix(x):
    """splitmix64, the shared hash for every sketch here."""
    x = (x + 0x9E3779B97F4A7C15) & M64
    x ^= x >> 30
    x = (x * 0xBF58476D1CE4E5B9) & M64
    x ^= x >> 27
    x = (x * 0x94D049BB133111EB) & M64
    x ^= x >> 31
    return x


class HyperLogLog:
    """m = 2^p registers of ~6 bits each. add() is O(1); estimate() is a
    harmonic mean with the linear-counting fallback for small counts."""

    def __init__(self, p, salt=0):
        self.p = p
        self.m = 1 << p
        self.salt = salt
        self.reg = bytearray(self.m)
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, x):
        h = mix(x ^ self.salt)
        idx = h >> (64 - self.p)
        v = h & ((1 << (64 - self.p)) - 1)
        rho = (64 - self.p) - v.bit_length() + 1
        if rho > self.reg[idx]:
            self.reg[idx] = rho

    def estimate(self):
        s = 0.0
        zeros = 0
        for r in self.reg:
            s += 2.0 ** -r
            if r == 0:
                zeros += 1
        e = self.alpha * self.m * self.m / s
        if e <= 2.5 * self.m and zeros:  # small-range: linear counting
            return self.m * math.log(self.m / zeros)
        return e

    def merge(self, other):
        """Union is register-wise max: the distributed-counting superpower."""
        assert self.p == other.p and self.salt == other.salt
        out = HyperLogLog(self.p, self.salt)
        out.reg = bytearray(max(a, b) for a, b in zip(self.reg, other.reg))
        return out

    def bytes_used(self):
        return self.m * 6 // 8  # 6-bit registers packed


# ---------------------------------------------------------------- the rivals


class FlajoletMartin:
    """PCSA, the 1983-85 ancestor: per-substream BITMAPS of seen zero-run
    lengths, estimated from the lowest unset bit. More state per substream,
    a worse constant, and the direct parent of everything above."""

    PHI = 0.77351

    def __init__(self, m=256, salt=0):
        self.m = m
        self.salt = salt
        self.maps = [0] * m

    def add(self, x):
        h = mix(x ^ self.salt)
        j = h % self.m
        y = h // self.m
        # rho: position of the lowest set bit (trailing zeros)
        rho = (y & -y).bit_length() - 1 if y else 31
        self.maps[j] |= 1 << min(rho, 31)

    def estimate(self):
        total = 0
        for bm in self.maps:
            r = 0
            while (bm >> r) & 1:
                r += 1
            total += r
        return (self.m / self.PHI) * (2.0 ** (total / self.m))

    def bytes_used(self):
        return self.m * 4  # 32-bit bitmaps


class KMinimumValues:
    """Keep the k smallest distinct hash fractions; the k-th smallest of n
    uniform draws sits near k/n, so n is about (k-1)/u_k."""

    def __init__(self, k=128, salt=0):
        self.k = k
        self.salt = salt
        self.mins = []  # sorted list of the k smallest, small at the front
        self.have = set()

    def add(self, x):
        u = mix(x ^ self.salt) / 2**64
        if u in self.have:
            return
        if len(self.mins) < self.k:
            self.have.add(u)
            self.mins.append(u)
            self.mins.sort()
        elif u < self.mins[-1]:
            self.have.discard(self.mins[-1])
            self.have.add(u)
            self.mins[-1] = u
            self.mins.sort()

    def estimate(self):
        if len(self.mins) < self.k:
            return float(len(self.mins))
        return (self.k - 1) / self.mins[-1]

    def bytes_used(self):
        return self.k * 8  # 64-bit values


class LinearCounting:
    """One bit per hash slot, estimate m ln(m/zeros). Sharp while zeros
    remain; past its ceiling every bit is set and it has nothing to say."""

    def __init__(self, m_bits=8192, salt=0):
        self.m = m_bits
        self.salt = salt
        self.bits = bytearray(m_bits // 8)

    def add(self, x):
        p = mix(x ^ self.salt) % self.m
        self.bits[p >> 3] |= 1 << (p & 7)

    def estimate(self):
        ones = sum(bin(b).count("1") for b in self.bits)
        zeros = self.m - ones
        if zeros == 0:
            return None  # saturated: no estimate exists
        return self.m * math.log(self.m / zeros)

    def bytes_used(self):
        return self.m // 8


# --------------------------------------------------------------- the stream

TRUE_DISTINCT = 200_000
STREAM_LEN = 1_000_000


def stream(seed=20260827):
    """Exactly TRUE_DISTINCT distinct ids: each appears once, then 800,000
    seeded repeats. About five appearances per id."""
    rng = random.Random(seed)
    for i in range(TRUE_DISTINCT):
        yield i
    for _ in range(STREAM_LEN - TRUE_DISTINCT):
        yield rng.randrange(TRUE_DISTINCT)


def contest():
    hll = HyperLogLog(p=10)  # 1,024 registers, 768 B
    fm = FlajoletMartin(m=256)  # 1,024 B
    kmv = KMinimumValues(k=128)  # 1,024 B
    lc = LinearCounting(m_bits=8192)  # 1,024 B
    exact = set()
    for x in stream():
        hll.add(x)
        fm.add(x)
        kmv.add(x)
        lc.add(x)
        exact.add(x)
    rows = [
        ("HyperLogLog, 1,024 registers", hll.estimate(), hll.bytes_used()),
        ("Flajolet-Martin, 256 bitmaps", fm.estimate(), fm.bytes_used()),
        ("K-minimum values, k = 128", kmv.estimate(), kmv.bytes_used()),
        ("Linear counting, 8,192 bits", lc.estimate(), lc.bytes_used()),
        ("Exact hash set", float(len(exact)), 16 * len(exact)),
    ]
    return rows, hll


if __name__ == "__main__":
    # Oracle 1: the observable itself. A run of at least r leading zeros
    # should appear in about 2^-r of hashes; check r = 8 over 100,000 keys.
    r = 8
    hits = 0
    for x in range(100_000):
        v = mix(x ^ 12345) & ((1 << 54) - 1)
        rho = 54 - v.bit_length() + 1
        if rho > r:
            hits += 1
    expect = 100_000 * 2.0 ** -r  # rho > r means at least r leading zeros
    assert 0.6 * expect < hits < 1.6 * expect, f"rho tail off: {hits} vs {expect:.0f}"

    # Oracle 2: the contest sketch lands within 3 sigma (about 10 percent).
    rows, hll_full = contest()
    by = {name: (est, mem) for name, est, mem in rows}
    hll_est = by["HyperLogLog, 1,024 registers"][0]
    assert abs(hll_est - TRUE_DISTINCT) / TRUE_DISTINCT < 0.10, hll_est

    # Oracle 3: merge is exact. Sketch each half-stream separately; the
    # register-wise max must equal the full sketch REGISTER FOR REGISTER.
    a = HyperLogLog(p=10)
    b = HyperLogLog(p=10)
    for i, x in enumerate(stream()):
        (a if i % 2 == 0 else b).add(x)
    merged = a.merge(b)
    assert bytes(merged.reg) == bytes(hll_full.reg), "merge must be exact"

    # Oracle 4: error shrinks with registers, 1/sqrt(m). Average error over
    # 8 salts at m = 256 versus m = 4,096 on a smaller stream.
    def avg_err(p, trials=8):
        total = 0.0
        for t in range(trials):
            h = HyperLogLog(p, salt=mix(500 + t))
            for x in range(20_000):
                h.add(x)
            total += abs(h.estimate() - 20_000) / 20_000
        return total / trials

    e_small, e_big = avg_err(8), avg_err(12)
    assert e_big < e_small, f"more registers must mean less error ({e_small:.3f} vs {e_big:.3f})"
    assert e_big < 0.03, f"4,096 registers should sit under 3 percent, got {e_big:.3f}"

    # Oracle 5: linear counting is sharp below its ceiling and silent above.
    lc_small = LinearCounting(8192)
    for x in range(1000):
        lc_small.add(x)
    est = lc_small.estimate()
    assert est is not None and abs(est - 1000) / 1000 < 0.06, est
    assert by["Linear counting, 8,192 bits"][0] is None, "must saturate at 200k"

    # Oracle 6: the rivals stay inside their own 3-sigma bands.
    fm_est = by["Flajolet-Martin, 256 bitmaps"][0]
    kmv_est = by["K-minimum values, k = 128"][0]
    assert abs(fm_est - TRUE_DISTINCT) / TRUE_DISTINCT < 0.15, fm_est
    assert abs(kmv_est - TRUE_DISTINCT) / TRUE_DISTINCT < 0.27, kmv_est
    assert by["Exact hash set"][0] == TRUE_DISTINCT

    # Oracle 7: the tempting shortcut, measured. Count distinct in a one
    # percent sample and scale by 100: repeats make it wildly wrong.
    rng = random.Random(99)
    sample_distinct = len({x for x in stream() if rng.random() < 0.01})
    scaled = sample_distinct * 100
    assert scaled > 3 * TRUE_DISTINCT, f"sampling should overshoot; got {scaled:,}"

    print(
        f"contest: {STREAM_LEN:,}-item stream, exactly {TRUE_DISTINCT:,} distinct; "
        f"every sketch holds about 1 KB:"
    )
    for name, est, mem in rows:
        if est is None:
            print(f"  {name:<30} estimate   SATURATED           memory {mem:>9,} B")
        else:
            err = (est - TRUE_DISTINCT) / TRUE_DISTINCT
            print(f"  {name:<30} estimate {est:>9,.0f}  ({err:+.2%})   memory {mem:>9,} B")
    print(f"the tempting shortcut: distinct in a 1% sample x 100 = {scaled:,}  ({scaled / TRUE_DISTINCT:.1f}x truth)")
    print("OK: witness tail, 3-sigma landing, exact merge, error scaling, saturation, and the sampling trap all measured")
