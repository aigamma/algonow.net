# Puzzle 11: Bloom filter x k independent hashes
# Remember n keys in m bits, with m far too small to store the keys, and
# answer "have I seen this?" with no false negatives and few false positives.
#
# The pairing is the point. The Bloom filter's control structure is one bit
# array and one invariant: every hash position of every inserted key is set,
# forever. A zero anywhere is therefore a certain NO; all-ones is only
# evidence. The heuristic is k, how many independent hashes each key gets.
# Each extra hash demands more evidence per query but fills the array faster,
# so k trades against itself, and the optimum k = (m/n) ln 2 is the value
# that leaves half the bits set: every bit a fair coin, maximum information
# per bit of budget.
import math
import random

M64 = (1 << 64) - 1


def mix(x):
    """splitmix64: a cheap, well-scrambled 64-bit mixer, the shared hash
    engine for every structure here so no method gets better randomness."""
    x = (x + 0x9E3779B97F4A7C15) & M64
    x ^= x >> 30
    x = (x * 0xBF58476D1CE4E5B9) & M64
    x ^= x >> 27
    x = (x * 0x94D049BB133111EB) & M64
    x ^= x >> 31
    return x


SEEDS = [mix(1000 + i) for i in range(64)]


class BloomFilter:
    """m bits, k independent hashes. add() sets k bits; query() is a certain
    no on the first zero, a probabilistic yes if all k are set."""

    def __init__(self, m, k):
        self.m = m
        self.k = k
        self.bits = bytearray((m + 7) // 8)

    def _positions(self, key):
        for i in range(self.k):
            yield mix(key ^ SEEDS[i]) % self.m

    def add(self, key):
        for p in self._positions(key):
            self.bits[p >> 3] |= 1 << (p & 7)

    def query(self, key):
        for p in self._positions(key):
            if not (self.bits[p >> 3] >> (p & 7)) & 1:
                return False  # one zero is proof of absence
        return True

    def fill(self):
        return sum(bin(b).count("1") for b in self.bits) / self.m

    def clear_bits_of(self, key):
        """What deletion would have to be, and why it is forbidden: these
        bits may be load-bearing for other keys."""
        for p in self._positions(key):
            self.bits[p >> 3] &= ~(1 << (p & 7)) & 0xFF


class CuckooFilter:
    """Bucketed fingerprints with eviction. Each key's fingerprint lives in
    one of two buckets; inserting into a full pair kicks a resident to its
    alternate home. Supports deletion, which the Bloom filter cannot."""

    BUCKET = 4
    MAX_KICKS = 500

    def __init__(self, nbuckets, fbits):
        self.nb = nbuckets
        self.fbits = fbits
        self.fmask = (1 << fbits) - 1
        self.slots = [[] for _ in range(nbuckets)]
        self.rng = random.Random(20260827)

    def _fingerprint(self, key):
        f = mix(key ^ SEEDS[60]) & self.fmask
        return f if f else 1  # zero is the empty sentinel

    def _b1(self, key):
        return mix(key ^ SEEDS[61]) % self.nb

    def _alt(self, b, f):
        # Subtraction trick: alt(alt(b)) == b without power-of-two tables.
        return (mix(f ^ SEEDS[62]) - b) % self.nb

    def insert(self, key):
        f = self._fingerprint(key)
        b1 = self._b1(key)
        b2 = self._alt(b1, f)
        for b in (b1, b2):
            if len(self.slots[b]) < self.BUCKET:
                self.slots[b].append(f)
                return True
        b = self.rng.choice((b1, b2))
        for _ in range(self.MAX_KICKS):
            i = self.rng.randrange(self.BUCKET)
            f, self.slots[b][i] = self.slots[b][i], f
            b = self._alt(b, f)
            if len(self.slots[b]) < self.BUCKET:
                self.slots[b].append(f)
                return True
        return False  # table effectively full

    def query(self, key):
        f = self._fingerprint(key)
        b1 = self._b1(key)
        return f in self.slots[b1] or f in self.slots[self._alt(b1, f)]

    def delete(self, key):
        f = self._fingerprint(key)
        b1 = self._b1(key)
        for b in (b1, self._alt(b1, f)):
            if f in self.slots[b]:
                self.slots[b].remove(f)
                return True
        return False

    def bits_used(self):
        return self.nb * self.BUCKET * self.fbits


class XorFilter:
    """Static: built once from the full key set by hypergraph peeling, then
    immutable. Query is three probes and two XORs; the false-positive rate
    is exactly 2^-f. The space champion when the set never changes."""

    def __init__(self, keys, fbits, tries=20):
        self.fbits = fbits
        self.fmask = (1 << fbits) - 1
        n = len(keys)
        self.seg = (int(1.23 * n) + 2) // 3 + 1
        c = 3 * self.seg
        for attempt in range(tries):
            self.salt = mix(777 + attempt)
            order = self._peel(keys, c)
            if order is not None:
                self.table = [0] * c
                for key, slot in reversed(order):
                    h0, h1, h2 = self._slots(key)
                    v = self._fingerprint(key)
                    for h in (h0, h1, h2):
                        if h != slot:
                            v ^= self.table[h]
                    self.table[slot] = v
                return
        raise RuntimeError("xor filter peeling failed; raise c or tries")

    def _fingerprint(self, key):
        return mix(key ^ self.salt ^ SEEDS[63]) & self.fmask

    def _slots(self, key):
        h = mix(key ^ self.salt)
        return (
            h % self.seg,
            self.seg + (mix(h ^ SEEDS[1]) % self.seg),
            2 * self.seg + (mix(h ^ SEEDS[2]) % self.seg),
        )

    def _peel(self, keys, c):
        count = [0] * c
        xorsum = [0] * c
        for key in keys:
            for h in self._slots(key):
                count[h] += 1
                xorsum[h] ^= key
        stack = []
        queue = [i for i in range(c) if count[i] == 1]
        while queue:
            slot = queue.pop()
            if count[slot] != 1:
                continue
            key = xorsum[slot]
            stack.append((key, slot))
            for h in self._slots(key):
                count[h] -= 1
                xorsum[h] ^= key
                if count[h] == 1:
                    queue.append(h)
        return stack if len(stack) == len(keys) else None

    def query(self, key):
        h0, h1, h2 = self._slots(key)
        return self._fingerprint(key) == (
            self.table[h0] ^ self.table[h1] ^ self.table[h2]
        )

    def bits_used(self):
        return len(self.table) * self.fbits


# --------------------------------------------------------------- the contest

N = 10_000
M_BITS = 120_000  # 15 KB for ten thousand keys: 12 bits per key
QUERIES = 200_000
PRESENT = list(range(N))
ABSENT = list(range(1_000_000, 1_000_000 + QUERIES))


def contest():
    rows = []

    for k, tag in ((8, "optimal"), (1, "lazy"), (20, "paranoid")):
        bf = BloomFilter(M_BITS, k)
        for key in PRESENT:
            bf.add(key)
        fp = sum(1 for q in ABSENT if bf.query(q))
        rows.append((f"Bloom filter, k = {k} ({tag})", fp, M_BITS / N, bf))

    cf = CuckooFilter(nbuckets=3000, fbits=10)  # 3000 x 4 x 10 = 120,000 bits
    ok = all(cf.insert(key) for key in PRESENT)
    assert ok, "cuckoo filter refused an insert at 83 percent load"
    fp = sum(1 for q in ABSENT if cf.query(q))
    rows.append(("Cuckoo filter, 10-bit prints", fp, cf.bits_used() / N, cf))

    xf = XorFilter(PRESENT, fbits=9)
    fp = sum(1 for q in ABSENT if xf.query(q))
    rows.append(("XOR filter, 9-bit prints", fp, xf.bits_used() / N, xf))

    exact = set(PRESENT)
    fp = sum(1 for q in ABSENT if q in exact)
    rows.append(("Exact hash set", fp, 64.0, exact))

    return rows


if __name__ == "__main__":
    rows = contest()
    by_name = {name: (fp, bpk) for name, fp, bpk, _ in rows}

    # Oracle 1: the defining invariant. No structure may ever deny a key it
    # holds. Checked for every one of the ten thousand keys, in every row.
    for name, _fp, _bpk, s in rows:
        member = s.query if hasattr(s, "query") else s.__contains__
        misses = sum(1 for key in PRESENT if not member(key))
        assert misses == 0, f"{name}: {misses} false negatives (forbidden)"

    # Oracle 2: measured false-positive rates sit near theory. For a Bloom
    # filter with fill p, the rate is p^k; the classic closed form is
    # (1 - e^(-kn/m))^k.
    for k in (1, 8, 20):
        theory = (1 - math.exp(-k * N / M_BITS)) ** k
        name = next(n for n in by_name if n.startswith(f"Bloom filter, k = {k} "))
        measured = by_name[name][0] / QUERIES
        assert 0.5 * theory < measured < 2.0 * theory, (
            f"k={k}: measured {measured:.5f} vs theory {theory:.5f}"
        )

    # Oracle 3: the U-curve. The optimal k beats both too little hashing and
    # too much hashing, at identical memory.
    fp8 = by_name["Bloom filter, k = 8 (optimal)"][0]
    fp1 = by_name["Bloom filter, k = 1 (lazy)"][0]
    fp20 = by_name["Bloom filter, k = 20 (paranoid)"][0]
    assert fp8 * 5 < fp1, "optimal k must crush k=1"
    assert fp8 < fp20, "optimal k must also beat k=20: more hashing is not better"
    kopt = (M_BITS / N) * math.log(2)
    assert abs(kopt - 8.32) < 0.01

    # Oracle 4: the XOR filter is the space champion at this budget, the
    # exact set is perfect but five times over budget.
    assert by_name["XOR filter, 9-bit prints"][0] < fp8 < by_name["Cuckoo filter, 10-bit prints"][0]
    assert by_name["Exact hash set"][0] == 0
    assert by_name["XOR filter, 9-bit prints"][1] < 12.0

    # Oracle 5: deletion. The cuckoo filter deletes cleanly: removed keys
    # stop matching (a rare fingerprint twin may linger), kept keys all stay.
    cf = next(s for n, _f, _b, s in rows if n.startswith("Cuckoo"))
    removed = PRESENT[:1000]
    for key in removed:
        assert cf.delete(key), "deleting a held key must succeed"
    still_yes = sum(1 for key in removed if cf.query(key))
    assert still_yes < 50, f"{still_yes} deleted keys still match: too many twins"
    kept_missing = sum(1 for key in PRESENT[1000:] if not cf.query(key))
    assert kept_missing == 0, "deletion must never take out a bystander"

    # ...while clearing a Bloom filter's bits takes bystanders with it: for
    # some early victim, un-setting its k bits creates a false negative on a
    # DIFFERENT key. Deletion is not an API you can bolt on.
    bf = next(s for n, _f, _b, s in rows if n == "Bloom filter, k = 8 (optimal)")
    victim_found = False
    for victim in PRESENT[:50]:
        backup = bytearray(bf.bits)
        bf.clear_bits_of(victim)
        if any(not bf.query(key) for key in PRESENT[:2000] if key != victim):
            victim_found = True
        bf.bits = backup
        if victim_found:
            break
    assert victim_found, "clearing one key's bits should break some bystander"

    # Oracle 6: the saturation cliff. Overfill the same design five-fold and
    # the filter does not error; it just starts agreeing with everyone.
    sat = BloomFilter(M_BITS, 8)
    for key in range(5 * N):
        sat.add(key)
    sat_fp = sum(1 for q in ABSENT[:20_000] if sat.query(q)) / 20_000
    assert sat_fp > 0.5, f"saturated filter should lie constantly, got {sat_fp:.2%}"

    print(f"contest: {N:,} keys in {M_BITS:,} bits (12.0 per key), {QUERIES:,} absent queries:")
    for name, fp, bpk, _s in rows:
        rate = fp / QUERIES
        print(f"  {name:<30} false positives {fp:>6,}  ({rate:.3%})   bits/key {bpk:>5.1f}")
    print(f"saturation: same filter design at 5x design load lies {sat_fp:.1%} of the time")
    print("OK: no false negatives anywhere, theory matched, the U-curve, deletion, and the cliff all measured")
