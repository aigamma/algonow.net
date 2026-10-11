"""Sharding x Hash partitioning (puzzle 199).

Split one table across N shards by shard = h(key) mod N with a deterministic
64-bit hash, and measure what that choice buys and what it costs.

ORACLES. (1) Balance: under random keys the shard loads are Multinomial
(n, 1/N), so the chi-square statistic sum (load - n/N)^2 / (n/N) has mean
N - 1 and the per-shard standard deviation is sqrt(n/N (1 - 1/N)); both are
measured over repeated key sets. (2) Routing: every key lives on exactly one
shard and a lookup after insertion finds it. (3) Resharding: growing N to
N + 1 under modulo moves N/(N + 1) of the keys (exactly 1/(N + 1) stay),
doubling moves exactly half and only to shard s + N, while a consistent
hashing ring and jump consistent hash move about 1/(N + 1), with every moved
key landing on the new node. (4) Skew: the hottest key of a Zipf workload
alone exceeds a shard's mean load, which no hash of the key can fix and a
salt can. (5) Range partitioning as the rival: one shard per range scan
against all N, but a hot tail under time-ordered inserts. (6) The negative
example: a poor hash (the last digit) that leaves shards empty, and the
modulo rehash that moves nine tenths of a cluster.

AUTHOR CORRECTIONS: the draft guessed that a ring with one point per node runs
"two to three times" out of balance at sixteen nodes; over twenty rings the
heaviest node measured 2.1 to 5.4 times the mean, so the page quotes the
measured range. The draft also salted only the two keys above half a shard's
mean load, which left the third-hottest key's shard at 1.4 times the mean;
the page salts every key above a tenth of the mean (thirteen keys) and
reports the measured 1.19.
"""
import bisect
import hashlib
import math
import random
import time

MASK = (1 << 64) - 1


def h64(key):
    """A deterministic 64-bit hash of a string (Python's own hash is salted per process)."""
    return int.from_bytes(hashlib.blake2b(key.encode(), digest_size=8).digest(), 'little')


def mod_shard(key, n_shards):
    return h64(key) % n_shards


class Ring:
    """Consistent hashing: nodes placed at vnodes points on a 64-bit circle."""

    def __init__(self, nodes, vnodes):
        self.vnodes, self.points, self.owner = vnodes, [], []
        for node in nodes:
            self.add(node)

    def add(self, node):
        for v in range(self.vnodes):
            p = h64(f'{node}#{v}')
            i = bisect.bisect(self.points, p)
            self.points.insert(i, p)
            self.owner.insert(i, node)

    def lookup(self, key):
        i = bisect.bisect(self.points, h64(key))
        return self.owner[i % len(self.points)]


def jump_hash(key64, buckets):
    """Lamping and Veach 2014: the bucket changes only when a new bucket claims the key."""
    b, j = -1, 0
    while j < buckets:
        b = j
        key64 = (key64 * 2862933555777941757 + 1) & MASK
        j = int((b + 1) * ((1 << 31) / ((key64 >> 33) + 1)))
    return b


def loads_of(assign, n_shards):
    loads = [0] * n_shards
    for s in assign:
        loads[s] += 1
    return loads


def balance_trials(n_keys, n_shards, trials, rng):
    mean = n_keys / n_shards
    chis, sds, maxr = [], [], []
    for _ in range(trials):
        loads = loads_of((mod_shard(f'user:{rng.getrandbits(40)}', n_shards) for _ in range(n_keys)), n_shards)
        ss = sum((l - mean) ** 2 for l in loads)
        chis.append(ss / mean)
        sds.append(math.sqrt(ss / n_shards))
        maxr.append(max(loads) / mean)
    return chis, sds, maxr


def mean_se(xs):
    m = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    return m, sd / math.sqrt(len(xs))


def main():
    t0 = time.perf_counter()
    rng = random.Random(199)
    N = 16
    checks = 0

    # 1. balance against the multinomial prediction
    n_keys, trials = 20_000, 100
    chis, sds, maxr = balance_trials(n_keys, N, trials, rng)
    chi_m, chi_se = mean_se(chis)
    sd_m, _ = mean_se(sds)
    sd_pred = math.sqrt(n_keys / N * (1 - 1 / N))
    assert abs(chi_m - (N - 1)) <= 3 * math.sqrt(2 * (N - 1) / trials) + 0.5, chi_m
    assert abs(sd_m - sd_pred) <= 0.15 * sd_pred, (sd_m, sd_pred)
    assert max(maxr) < 1 + 5 * sd_pred / (n_keys / N), max(maxr)
    checks += 3
    print(f'balance: {trials} key sets of {n_keys:,} keys on {N} shards; chi-square mean {chi_m:.2f} +/- {chi_se:.2f} (theory {N - 1}); '
          f'per-shard sd {sd_m:.1f} (theory {sd_pred:.1f}); heaviest shard {max(maxr):.3f} x mean at worst')

    # 2. routing: every key on exactly one shard, every lookup found
    n = 100_000
    keys = [f'user:{rng.getrandbits(40)}' for _ in range(n)]
    shards = [dict() for _ in range(N)]
    t1 = time.perf_counter()
    home = [mod_shard(k, N) for k in keys]
    route_us = (time.perf_counter() - t1) / n * 1e6
    for k, s in zip(keys, home):
        shards[s][k] = len(k)
    assert sum(len(d) for d in shards) == n
    assert all(k in shards[mod_shard(k, N)] for k in keys)
    assert all(sum(k in d for d in shards) == 1 for k in keys[:2000])
    checks += 3
    loads = [len(d) for d in shards]
    print(f'routing: {n:,} keys, every one found on its home shard and on no other; loads {min(loads):,} to {max(loads):,} (mean {n // N:,}); {route_us:.2f} us per route')

    # 3. resharding: modulo against the ring and jump consistent hash
    new_mod = [mod_shard(k, N + 1) for k in keys]
    moved_mod = sum(a != b for a, b in zip(home, new_mod)) / n
    assert abs(moved_mod - N / (N + 1)) < 0.005, moved_mod
    dbl = [mod_shard(k, 2 * N) for k in keys]
    assert all(b == a or b == a + N for a, b in zip(home, dbl))
    moved_dbl = sum(a != b for a, b in zip(home, dbl)) / n
    assert abs(moved_dbl - 0.5) < 0.01
    sweep = []
    for m in (4, 8, 32):
        hm = [mod_shard(k, m) for k in keys[:20000]]
        hm1 = [mod_shard(k, m + 1) for k in keys[:20000]]
        f = sum(a != b for a, b in zip(hm, hm1)) / 20000
        assert abs(f - m / (m + 1)) < 0.012, (m, f)
        sweep.append((m, f))
    ring = Ring(range(N), 100)
    before = [ring.lookup(k) for k in keys]
    ring.add(N)
    after = [ring.lookup(k) for k in keys]
    moved_ring = sum(a != b for a, b in zip(before, after)) / n
    assert all(b == N for a, b in zip(before, after) if a != b)
    assert abs(moved_ring - 1 / (N + 1)) < 0.02, moved_ring
    ring_loads = loads_of(after, N + 1)
    thin = []
    for t in range(20):
        r1 = Ring([f'r{t}n{i}' for i in range(N)], 1)
        thin.append(max(loads_of((int(r1.lookup(k).split('n')[1]) for k in keys[:20000]), N)) / (20000 / N))
    digests = [h64(k) for k in keys]
    jb = [jump_hash(d, N) for d in digests]
    ja = [jump_hash(d, N + 1) for d in digests]
    moved_jump = sum(a != b for a, b in zip(jb, ja)) / n
    assert all(b == N for a, b in zip(jb, ja) if a != b)
    assert abs(moved_jump - 1 / (N + 1)) < 0.005, moved_jump
    checks += 8
    tb = 10.0
    print(f'reshard {N} -> {N + 1}: modulo moves {moved_mod:.4f} of the keys (theory {N / (N + 1):.4f}); ring with 100 virtual nodes {moved_ring:.4f}; jump consistent hash {moved_jump:.4f} (theory {1 / (N + 1):.4f}); '
          f'every ring and jump move lands on the new node; on a {tb:.0f} TB cluster that is {tb * moved_mod:.2f} TB against {tb * moved_jump:.2f} TB')
    print(f'doubling {N} -> {2 * N}: modulo moves {moved_dbl:.4f}, every mover to shard s + {N}; modulo N -> N + 1 for N = ' + ', '.join(f'{m}: {f:.3f}' for m, f in sweep)
          + f'; ring loads after the add {min(ring_loads):,} to {max(ring_loads):,}; one point per node leaves the heaviest node at {min(thin):.1f} to {max(thin):.1f} x mean')

    # 4. skew: a hot key no hash of the key can split, and a salt
    K, reqs = 100_000, 200_000
    hk = sum(1 / r for r in range(1, K + 1))
    cum, acc = [], 0.0
    for r in range(1, K + 1):
        acc += 1 / (r * hk)
        cum.append(acc)
    ranks = [min(bisect.bisect(cum, rng.random()) + 1, K) for _ in range(reqs)]
    mean_req = reqs / N
    hot = ranks.count(1)
    skew_loads = loads_of((mod_shard(f'item:{r}', N) for r in ranks), N)
    hot_shard = mod_shard('item:1', N)
    assert hot > mean_req and skew_loads[hot_shard] == max(skew_loads)
    before_ratio = max(skew_loads) / mean_req
    counts = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    limit = mean_req / 10
    salted = {r for r, c in counts.items() if c > limit}
    salt_loads = loads_of((mod_shard(f'item:{r}#{rng.randrange(N)}' if r in salted else f'item:{r}', N) for r in ranks), N)
    after_ratio = max(salt_loads) / mean_req
    print(f'skew: Zipf requests over {K:,} keys, {reqs:,} requests; the hottest key alone takes {hot:,} ({hot / reqs:.1%}) against a shard mean of {mean_req:,.0f}; '
          f'heaviest shard {before_ratio:.3f} x mean; salting the {len(salted)} keys above {limit:,.0f} requests into {N} sub-keys each: {after_ratio:.3f} x mean')
    assert before_ratio > 1.5 and after_ratio < 1.25 and after_ratio < before_ratio
    checks += 3

    # 5. range partitioning: scans against hot tails
    DOMAIN = 1_000_000
    ids = list(range(DOMAIN))
    rng.shuffle(ids)
    ids = ids[:n]
    rshard = lambda key: key * N // DOMAIN
    width = 1000
    touched_range, touched_hash = [], []
    for _ in range(1000):
        a = rng.randrange(DOMAIN - width)
        touched_range.append(len({rshard(x) for x in range(a, a + width)}))
        touched_hash.append(len({mod_shard(f'id:{x}', N) for x in range(a, a + width, 5)}))
    tr, th = sum(touched_range) / 1000, sum(touched_hash) / 1000
    assert tr < 1.1 and th > N - 0.01
    seq = list(range(DOMAIN - 10_000, DOMAIN))
    tail_range = max(loads_of((rshard(x) for x in seq), N)) / len(seq)
    tail_hash = max(loads_of((mod_shard(f'id:{x}', N) for x in seq), N)) / len(seq)
    assert tail_range == 1.0 and tail_hash < 0.1
    cities = [rng.randrange(50) for _ in ids]
    city = 7
    by_hash = len({mod_shard(f'id:{x}', N) for x, c in zip(ids, cities) if c == city})
    by_range = len({rshard(x) for x, c in zip(ids, cities) if c == city})
    assert by_hash == N and by_range == N
    checks += 3
    print(f'range partitioning: a scan of {width:,} consecutive keys touches {tr:.3f} shards against {th:.0f} under hashing; '
          f'the last {len(seq):,} time-ordered inserts land {tail_range:.0%} on one shard against {tail_hash:.1%} under hashing; a query by a non-key attribute fans out to {by_hash} shards either way')

    # 6. the negative example: a poor hash
    bad = loads_of((int(k[-1]) % N for k in keys), N)
    empties = bad.count(0)
    bad_ratio = max(bad) / (n / N)
    assert empties == 6 and 1.5 < bad_ratio < 1.7
    checks += 1
    print(f'last-digit "hash": {empties} of {N} shards empty, heaviest {bad_ratio:.2f} x mean')

    print(f'\nOK: {trials} key sets match the multinomial (chi-square {chi_m:.1f} against {N - 1}, sd {sd_m:.0f} against {sd_pred:.0f}); {n:,} keys each on exactly one shard; '
          f'{N} -> {N + 1} shards moves {moved_mod:.1%} of keys under modulo (theory {N / (N + 1):.1%}) against {moved_ring:.1%} on the ring and {moved_jump:.1%} with jump hash, all onto the new node; '
          f'doubling moves {moved_dbl:.1%} to s + {N} only; the hottest Zipf key takes {hot / reqs:.1%} of traffic and puts its shard at {before_ratio:.2f} x mean until salting ({after_ratio:.2f}); '
          f'range scans touch {tr:.2f} shards against {th:.0f}, the hot tail {tail_range:.0%} against {tail_hash:.0%}; last-digit routing leaves {empties} shards empty; {checks} assertions in {time.perf_counter() - t0:.1f} s')


if __name__ == '__main__':
    main()
