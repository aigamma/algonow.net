# Puzzle 139: Cuckoo hashing x two-table eviction kicks
# Worst-case-constant lookup: a hash table where every lookup is
# guaranteed to probe at most two slots, whatever the data and however
# unlucky the hashes. Cuckoo hashing is the algorithm: two tables with
# two independent hash functions, and every key lives in exactly one of
# its two possible slots, so a lookup checks those two and stops. The
# heuristic is the insertion: put the new key in its first slot; if
# that slot is occupied, kick the occupant out to its OTHER slot, which
# may kick another, like a cuckoo chick pushing eggs from the nest;
# stop when a kicked key lands in an empty slot, and if the chain runs
# too long (a cycle), rehash everything with fresh functions.
#
# Referees:
# (1) THE INVARIANT, after every operation on 20,000 random inserts and
#     deletes: every stored key sits in one of its two slots, no key is
#     stored twice, and a dictionary kept alongside agrees with every
#     lookup answer (present and absent) on 40,000 probes;
# (2) THE LOOKUP BOUND, counted: the maximum probes of any lookup is
#     exactly 2, at load 0.45, against separate chaining (mean and
#     worst chain lengths measured at the same load) and linear probing
#     (mean and worst probe counts at loads 0.45 and 0.9);
# (3) THE INSERTION COST, counted: mean and maximum kick-chain lengths
#     at loads 0.1 ... 0.49, and the number of rehashes forced by
#     cycles: the rule of thumb is that the two-table scheme works
#     below load 0.5 and fails above it;
# (4) THE CLIFF, measured: inserting past load 0.5, rehashes cascade
#     until the table gives up (ten fresh function pairs in a row that
#     all fail); the load at which that happens is reported. AUTHOR
#     NOTE: the first draft let rehashing retry without limit and hung
#     past the cliff, which is the cliff demonstrating itself; the
#     limit makes it a measurement;
# (5) THE ABLATION: insertion without kicks (refuse when both slots are
#     full) fails at a measured, far lower load, because it can use
#     only the slots that happen to be free.
import random

SEED = 20260926
PRIME = 2 ** 61 - 1


class TableFull(Exception):
    pass


class Cuckoo:
    def __init__(self, size, rng, max_kicks=200, max_rehash_attempts=10):
        self.size = size
        self.rng = rng
        self.max_kicks = max_kicks
        self.max_rehash_attempts = max_rehash_attempts
        self.t = [[None] * size, [None] * size]
        self.count = 0
        self.rehashes = 0
        self.total_kicks = 0
        self.max_chain = 0
        self._new_functions()

    def _new_functions(self):
        self.a = [self.rng.randrange(1, PRIME) for _ in range(2)]
        self.b = [self.rng.randrange(0, PRIME) for _ in range(2)]

    def h(self, i, key):
        return ((self.a[i] * key + self.b[i]) % PRIME) % self.size

    def lookup(self, key):
        """Returns (found, probes)."""
        if self.t[0][self.h(0, key)] == key:
            return True, 1
        if self.t[1][self.h(1, key)] == key:
            return True, 2
        return False, 2

    def _place(self, key, count_stats=True):
        """Try to place key by kicking. Returns the evicted key that found
        no home (None on success)."""
        cur = key
        table = 0
        for step in range(self.max_kicks):
            slot = self.h(table, cur)
            if self.t[table][slot] is None:
                self.t[table][slot] = cur
                if count_stats:
                    self.total_kicks += step
                    self.max_chain = max(self.max_chain, step)
                return None
            cur, self.t[table][slot] = self.t[table][slot], cur
            table = 1 - table
        return cur

    def insert(self, key, allow_kicks=True):
        found, _ = self.lookup(key)
        if found:
            return True
        if not allow_kicks:
            for table in range(2):
                slot = self.h(table, key)
                if self.t[table][slot] is None:
                    self.t[table][slot] = key
                    self.count += 1
                    return True
            return False
        homeless = self._place(key)
        if homeless is None:
            self.count += 1
            return True
        # a cycle: rehash everything with fresh functions, bounded
        keys = [k for row in self.t for k in row if k is not None] + [homeless]
        for attempt in range(self.max_rehash_attempts):
            self.rehashes += 1
            self.t = [[None] * self.size, [None] * self.size]
            self._new_functions()
            failed = False
            for k in keys:
                if self._place(k, count_stats=False) is not None:
                    failed = True
                    break
            if not failed:
                self.count = len(keys)
                return True
        raise TableFull(len(keys) / (2 * self.size))

    def delete(self, key):
        for i in range(2):
            slot = self.h(i, key)
            if self.t[i][slot] == key:
                self.t[i][slot] = None
                self.count -= 1
                return True
        return False

    def load(self):
        return self.count / (2 * self.size)

    def invariant_ok(self):
        seen = set()
        for i in range(2):
            for slot, k in enumerate(self.t[i]):
                if k is None:
                    continue
                if self.h(i, k) != slot or k in seen:
                    return False
                seen.add(k)
        return len(seen) == self.count


class Chaining:
    def __init__(self, size, rng):
        self.size = size
        self.a = rng.randrange(1, PRIME)
        self.b = rng.randrange(0, PRIME)
        self.buckets = [[] for _ in range(size)]

    def h(self, key):
        return ((self.a * key + self.b) % PRIME) % self.size

    def insert(self, key):
        self.buckets[self.h(key)].append(key)

    def lookup(self, key):
        b = self.buckets[self.h(key)]
        for i, k in enumerate(b):
            if k == key:
                return True, i + 1
        return False, max(1, len(b))


class LinearProbing:
    def __init__(self, size, rng):
        self.size = size
        self.a = rng.randrange(1, PRIME)
        self.b = rng.randrange(0, PRIME)
        self.t = [None] * size

    def h(self, key):
        return ((self.a * key + self.b) % PRIME) % self.size

    def insert(self, key):
        i = self.h(key)
        while self.t[i] is not None:
            i = (i + 1) % self.size
        self.t[i] = key

    def lookup(self, key):
        i = self.h(key)
        probes = 1
        while self.t[i] is not None:
            if self.t[i] == key:
                return True, probes
            i = (i + 1) % self.size
            probes += 1
        return False, probes


if __name__ == '__main__':
    rng = random.Random(SEED)
    SIZE = 10_000                                  # per table: 20,000 slots in all
    universe = 10 ** 9

    # Oracle 1: the invariant and the set referee under churn.
    table = Cuckoo(SIZE, random.Random(SEED + 1))
    truth = set()
    present = []                                   # for O(1) random deletes
    for op in range(20_000):
        if present and rng.random() < 0.3:
            j = rng.randrange(len(present))
            k = present[j]
            present[j] = present[-1]
            present.pop()
            table.delete(k)
            truth.discard(k)
        else:
            k = rng.randrange(universe)
            if k not in truth:
                table.insert(k)
                truth.add(k)
                present.append(k)
        if op % 1000 == 999:
            assert table.invariant_ok(), op
    assert table.invariant_ok() and table.count == len(truth)
    worst_probe = 0
    for _ in range(20_000):
        k = rng.choice(present)
        found, probes = table.lookup(k)
        assert found
        worst_probe = max(worst_probe, probes)
    for _ in range(20_000):
        k = rng.randrange(universe)
        found, probes = table.lookup(k)
        assert found == (k in truth)
        worst_probe = max(worst_probe, probes)
    assert worst_probe == 2
    churn_load = table.load()
    churn_rehashes = table.rehashes

    # Oracle 2 + 3: lookup and insertion costs by load, against the rivals.
    keys = list({rng.randrange(universe) for _ in range(int(0.49 * 2 * SIZE) + 50)})[: int(0.49 * 2 * SIZE)]
    cuckoo = Cuckoo(SIZE, random.Random(SEED + 2))
    checkpoints = {0.1: None, 0.2: None, 0.3: None, 0.4: None, 0.45: None, 0.49: None}
    inserted = 0
    for k in keys:
        cuckoo.insert(k)
        inserted += 1
        load = inserted / (2 * SIZE)
        for cp in checkpoints:
            if checkpoints[cp] is None and load >= cp - 1e-9:
                checkpoints[cp] = (cuckoo.total_kicks / inserted, cuckoo.max_chain, cuckoo.rehashes)
    n45 = int(0.45 * 2 * SIZE)
    chain = Chaining(2 * SIZE, random.Random(SEED + 3))
    probing = LinearProbing(2 * SIZE, random.Random(SEED + 4))
    cuckoo45 = Cuckoo(SIZE, random.Random(SEED + 2))
    for k in keys[:n45]:
        chain.insert(k)
        probing.insert(k)
        cuckoo45.insert(k)

    def cost(tbl, sample):
        ps = [tbl.lookup(k)[1] for k in sample]
        return sum(ps) / len(ps), max(ps)

    sample_present = rng.sample(keys[:n45], 5000)
    sample_absent = [rng.randrange(universe) for _ in range(5000)]
    c_hit, c_hit_max = cost(cuckoo45, sample_present)
    c_miss, c_miss_max = cost(cuckoo45, sample_absent)
    ch_hit, ch_hit_max = cost(chain, sample_present)
    ch_miss, ch_miss_max = cost(chain, sample_absent)
    lp_hit, lp_hit_max = cost(probing, sample_present)
    lp_miss, lp_miss_max = cost(probing, sample_absent)
    assert c_hit_max == 2 and c_miss_max == 2
    assert ch_hit_max > 2 and lp_hit_max > 2
    probing90 = LinearProbing(2 * SIZE, random.Random(SEED + 5))
    keys90 = list({rng.randrange(universe) for _ in range(int(0.9 * 2 * SIZE) + 50)})[: int(0.9 * 2 * SIZE)]
    for k in keys90:
        probing90.insert(k)
    lp90_hit, lp90_hit_max = cost(probing90, rng.sample(keys90, 5000))
    lp90_miss, lp90_miss_max = cost(probing90, sample_absent)

    # Oracle 4: the cliff past load 0.5, bounded.
    cliff = Cuckoo(SIZE, random.Random(SEED + 6))
    more = list({rng.randrange(universe) for _ in range(int(0.7 * 2 * SIZE) + 50)})
    gave_up_at = None
    rehash_at = {}
    for i, k in enumerate(more):
        try:
            cliff.insert(k)
        except TableFull as e:
            gave_up_at = e.args[0]
            break
        load = (i + 1) / (2 * SIZE)
        for cp in (0.45, 0.5, 0.52, 0.55):
            if cp not in rehash_at and load >= cp - 1e-9:
                rehash_at[cp] = cliff.rehashes
    assert gave_up_at is not None and gave_up_at < 0.6, gave_up_at
    assert rehash_at.get(0.5, 0) <= 2, rehash_at

    # Oracle 5: no kicks.
    nokick = Cuckoo(SIZE, random.Random(SEED + 7))
    failed_at = None
    for i, k in enumerate(keys):
        if not nokick.insert(k, allow_kicks=False):
            failed_at = i / (2 * SIZE)
            break
    assert failed_at is not None and failed_at < 0.2, failed_at

    print(f'contest: {2 * SIZE:,} slots (two tables of {SIZE:,}), random 30-bit keys; referee: a Python set kept alongside 20,000 inserts and deletes, then 40,000 lookups')
    print(f"  {'table at load 0.45':<28} {'hit probes mean/max':>20} {'miss probes mean/max':>21}   verdict")
    print(f"  {'cuckoo (two tables)':<28} {f'{c_hit:.2f} / {c_hit_max}':>20} {f'{c_miss:.2f} / {c_miss_max}':>21}   every lookup at most two probes, present or absent")
    print(f"  {'separate chaining':<28} {f'{ch_hit:.2f} / {ch_hit_max}':>20} {f'{ch_miss:.2f} / {ch_miss_max}':>21}   short on average, unbounded in the worst bucket")
    print(f"  {'linear probing':<28} {f'{lp_hit:.2f} / {lp_hit_max}':>20} {f'{lp_miss:.2f} / {lp_miss_max}':>21}   clusters; at load 0.9: {lp90_hit:.1f} / {lp90_hit_max} hit, {lp90_miss:.1f} / {lp90_miss_max} miss")
    print('insertion cost by load (mean kicks per insert / longest kick chain / rehashes so far):')
    for cp in (0.1, 0.2, 0.3, 0.4, 0.45, 0.49):
        m, mx, rh = checkpoints[cp]
        print(f'  load {cp:.2f}: {m:.3f} / {mx} / {rh}')
    print(f'the cliff: rehashes by load {" / ".join(f"{cp:.2f}" for cp in sorted(rehash_at))} = {" / ".join(str(rehash_at[cp]) for cp in sorted(rehash_at))}; the table gave up at load {gave_up_at:.3f} after ten fresh function pairs in a row failed ({cliff.rehashes} rehashes in all); '
          f'without kicks the table refused an insert at load {failed_at:.3f}')
    print(f'churn run: final load {churn_load:.3f}, {churn_rehashes} rehashes, invariant held at every checkpoint, 40,000 lookups agreed with the set, worst probe {worst_probe}')
    print(f'OK: cuckoo lookups at most 2 probes (chaining worst {ch_hit_max}, linear probing worst {lp_hit_max} at load 0.45 and {lp90_hit_max} at 0.9); mean kicks {checkpoints[0.45][0]:.2f} at load 0.45 with {checkpoints[0.49][2]} rehashes below 0.5; '
          f'the table gave up at load {gave_up_at:.3f}; no-kick insertion failed at load {failed_at:.3f}')
