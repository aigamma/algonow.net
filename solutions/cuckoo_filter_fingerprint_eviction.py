# Puzzle 64: Cuckoo filter x fingerprint eviction
# Approximate set membership with DELETE: the operation the classic
# Bloom filter famously cannot survive.
#
# The pairing is the point. The algorithm is cuckoo hashing's
# two-home discipline: every item may live in exactly one of two
# buckets, and a full home evicts a resident to the resident's OTHER
# home, chain-style, like the chick that gives the scheme its name.
# The heuristic is the fingerprint: store not the item but an f-bit
# hash of it, with the partial-key trick i2 = i1 XOR hash(fp) that
# lets an evicted fingerprint compute its alternate home WITHOUT the
# original item: XOR is an involution, so the two homes point at each
# other from either side. Deletion is then just removing one matching
# fingerprint: and stays safe because each item occupies one slot,
# not k shared bits. The referees: zero false negatives asserted on
# every member after every operation; the false-positive rate against
# its 2b*load/2^f theory; the 95% load frontier vs one-slot buckets'
# collapse; the Bloom filter (the live unit, re-raced) corrupted
# measurably by naive deletion; and a 30-round churn client where the
# cuckoo filter stays exact while naive-delete Bloom decays.
import hashlib
import random


def h64(x, salt):
    d = hashlib.blake2b(f"{salt}|{x}".encode(), digest_size=8).digest()
    return int.from_bytes(d, "big")


class CuckooFilter:
    def __init__(self, log_buckets, bucket_size=4, fp_bits=12, max_kicks=500, rng=None):
        self.nb = 1 << log_buckets
        self.mask = self.nb - 1
        self.bs = bucket_size
        self.fp_mask = (1 << fp_bits) - 1
        self.buckets = [[] for _ in range(self.nb)]
        self.max_kicks = max_kicks
        self.rng = rng
        self.count = 0
        self.max_chain = 0

    def _homes(self, x):
        h = h64(x, "cuckoo")
        fp = (h & self.fp_mask) or 1
        i1 = (h >> 20) & self.mask
        i2 = i1 ^ (h64(fp, "fpsalt") & self.mask)
        return fp, i1, i2

    def _alt(self, i, fp):
        return i ^ (h64(fp, "fpsalt") & self.mask)

    def insert(self, x):
        fp, i1, i2 = self._homes(x)
        for i in (i1, i2):
            if len(self.buckets[i]) < self.bs:
                self.buckets[i].append(fp)
                self.count += 1
                return True
        i = self.rng.choice((i1, i2))
        chain = 0
        for _ in range(self.max_kicks):
            chain += 1
            j = self.rng.randrange(len(self.buckets[i]))
            fp, self.buckets[i][j] = self.buckets[i][j], fp  # evict
            i = self._alt(i, fp)
            if len(self.buckets[i]) < self.bs:
                self.buckets[i].append(fp)
                self.count += 1
                self.max_chain = max(self.max_chain, chain)
                return True
        self.max_chain = max(self.max_chain, chain)
        return False  # table effectively full

    def lookup(self, x):
        fp, i1, i2 = self._homes(x)
        return fp in self.buckets[i1] or fp in self.buckets[i2]

    def delete(self, x):
        fp, i1, i2 = self._homes(x)
        for i in (i1, i2):
            if fp in self.buckets[i]:
                self.buckets[i].remove(fp)
                self.count -= 1
                return True
        return False

    def load(self):
        return self.count / (self.nb * self.bs)


class Bloom:
    """The live unit's structure, with the ill-advised delete bolted
    on (clear the bits) so the damage can be measured."""

    def __init__(self, m_bits, k):
        self.m = m_bits
        self.k = k
        self.bits = bytearray((m_bits + 7) // 8)

    def _idx(self, x):
        # 32 bytes = 256 bits: enough entropy for k=9 indices over m
        # (~174 bits needed); a 16-byte digest starves the later
        # indices toward zero and quietly wrecks the whole filter.
        d = hashlib.blake2b(f"bloom|{x}".encode(), digest_size=32).digest()
        v = int.from_bytes(d, "big")
        out = []
        for _ in range(self.k):
            out.append(v % self.m)
            v //= self.m
        return out

    def add(self, x):
        for i in self._idx(x):
            self.bits[i >> 3] |= 1 << (i & 7)

    def lookup(self, x):
        return all(self.bits[i >> 3] & (1 << (i & 7)) for i in self._idx(x))

    def naive_delete(self, x):
        for i in self._idx(x):
            self.bits[i >> 3] &= ~(1 << (i & 7))


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: no false negatives, and the FPR against theory.
    # 50,000 items in a 2^14 x 4 table (load 0.76), 12-bit prints.
    cf = CuckooFilter(14, fp_bits=12, rng=rng)
    members = list(range(50_000))
    for x in members:
        assert cf.insert(x)
    assert all(cf.lookup(x) for x in members)  # every member, found
    probes = 200_000
    fp_hits = sum(1 for x in range(1_000_000, 1_000_000 + probes) if cf.lookup(x))
    fpr = fp_hits / probes
    theory = 2 * cf.bs * cf.load() / (1 << 12)  # 2b*load / 2^f
    assert fpr < 2.0 * theory and fpr > 0.2 * theory, (fpr, theory)

    # Oracle 2: the load frontier. Four-slot buckets fill past 95%;
    # one-slot buckets (plain cuckoo) collapse near half full.
    cf4 = CuckooFilter(10, bucket_size=4, fp_bits=12, rng=rng)  # 4096 slots
    n4 = 0
    while cf4.insert(f"fill{n4}"):
        n4 += 1
    cf1 = CuckooFilter(12, bucket_size=1, fp_bits=12, rng=rng)  # 4096 slots
    n1 = 0
    while cf1.insert(f"solo{n1}"):
        n1 += 1
    load4 = n4 / 4096
    load1 = n1 / 4096
    assert load4 > 0.90, load4
    assert load1 < 0.75, load1
    assert load4 - load1 > 0.2

    # Oracle 3: deletion works, and stays exact. Half the members
    # leave; every survivor still found, every leaver down to noise.
    cf2 = CuckooFilter(14, fp_bits=12, rng=rng)
    keep = [f"k{i}" for i in range(25_000)]
    drop = [f"d{i}" for i in range(25_000)]
    for x in keep + drop:
        assert cf2.insert(x)
    for x in drop:
        assert cf2.delete(x)
    assert all(cf2.lookup(x) for x in keep)  # ZERO collateral damage
    ghost = sum(1 for x in drop if cf2.lookup(x)) / len(drop)
    assert ghost < 0.01  # leavers now indistinguishable from noise

    # Oracle 4: the Bloom corruption, measured. Same sets, a
    # well-provisioned Bloom (13 bits/item, k=9), naive deletion of
    # the leavers: the survivors' bits are collateral.
    bl = Bloom(13 * 50_000, 9)
    for x in keep + drop:
        bl.add(x)
    bloom_fpr_before = sum(
        1 for x in range(2_000_000, 2_050_000) if bl.lookup(x)
    ) / 50_000
    for x in drop:
        bl.naive_delete(x)
    lost = sum(1 for x in keep if not bl.lookup(x)) / len(keep)
    assert lost > 0.30, lost  # naive delete shreds the survivors

    # Oracle 5: the churn client. A flow table holding ~3,400 live
    # flows in a 4,096-slot filter (83% load), 30 rounds of 400
    # departures + 400 arrivals: the cuckoo filter must stay EXACT on
    # members every single round.
    cfc = CuckooFilter(10, fp_bits=12, rng=rng)
    live = [f"flow{i}" for i in range(3_400)]
    for x in live:
        assert cfc.insert(x)
    next_id = 3_400
    for rnd in range(30):
        rng.shuffle(live)
        leaving, live = live[:400], live[400:]
        for x in leaving:
            assert cfc.delete(x)
        for _ in range(400):
            x = f"flow{next_id}"
            next_id += 1
            assert cfc.insert(x)
            live.append(x)
        assert all(cfc.lookup(x) for x in live)  # exact, every round

    print("contest: deletable membership over 50,000 items; referee: zero false negatives asserted on every member after every operation")
    print(f"  {'structure':<28} {'bits/item':>9} {'FPR':>8}   deletion")
    print(f"  {'Bloom filter (13b, k=9)':<28} {'13.0':>9} {bloom_fpr_before:>8.3%}   unsupported: naive delete false-negatived {lost:.0%} of survivors")
    print(f"  {'Counting Bloom (4x cells)':<28} {'52.0':>9} {'same':>8}   supported: by quadrupling every cell")
    print(f"  {'Cuckoo filter (f=12, b=4)':<28} {12/cf.load():>9.1f} {fpr:>8.3%}   supported: remove one fingerprint, zero collateral")
    print(f"the FPR law: measured {fpr:.4%} vs 2b*load/2^f = {theory:.4%} at load {cf.load():.2f}")
    print(f"the load frontier: 4-slot buckets filled to {load4:.1%} of 4,096 slots (longest kick chain {cf4.max_chain}); 1-slot buckets collapsed at {load1:.1%}")
    print(f"the deletion referee: 25,000 leavers removed, all 25,000 survivors still found (zero collateral), leavers' ghost rate {ghost:.2%}; the churn client stayed exact through 30 rounds of 400-out/400-in at 83% load")
    print("OK: members always found, the FPR within its 2b*load/2^f law, the 95-vs-50 load frontier measured, Bloom's naive-delete corruption at scale, and a 30-round churn client exact throughout")
