# Puzzle 24: Reservoir sampling x Algorithm R
# Hold, at every instant, a uniform random sample of exactly k items from a
# stream whose length nobody knows.
#
# The pairing is the point. The control structure is the reservoir
# discipline: keep exactly k items at all times, decide each newcomer's
# fate the moment it arrives, never look back, so the sample is valid at
# EVERY prefix, because the stream may end without warning. The heuristic
# is Algorithm R's admission rule: item number n enters with probability
# k/n, evicting a uniformly random resident. The two-line induction: item
# n's own chance is k/n by construction; a resident's chance was k/(n-1)
# and it survives with 1 - (k/n)(1/k) = (n-1)/n, so k/(n-1) times
# (n-1)/n = k/n. Everyone, always, exactly k/n, and this file proves
# "exactly" with exact rational arithmetic, not statistics.
import math
import random
from fractions import Fraction
from heapq import heappush, heappushpop


def reservoir_r(stream, k, rng, counter=None):
    """Algorithm R. One decision per item; the sample is exact-k and
    uniform at every prefix."""
    sample = []
    n = 0
    for x in stream:
        n += 1
        if len(sample) < k:
            sample.append(x)
            continue
        if counter is not None:
            counter["draws"] = counter.get("draws", 0) + 1
        j = rng.randrange(n)  # admit iff j < k, and j names the evictee
        if j < k:
            sample[j] = x
        assert len(sample) == k
    return sample


def reservoir_l(stream, k, rng, counter=None):
    """Algorithm L (Li, 1994): same distribution, but SKIP counts are drawn
    directly, so the random draws collapse from n to about k log(n/k)."""
    sample = []
    it = iter(stream)
    for x in it:
        sample.append(x)
        if len(sample) == k:
            break
    if len(sample) < k:
        return sample
    w = math.exp(math.log(rng.random()) / k)
    if counter is not None:
        counter["draws"] = counter.get("draws", 0) + 1
    while True:
        skip = math.floor(math.log(rng.random()) / math.log(1 - w))
        if counter is not None:
            counter["draws"] = counter.get("draws", 0) + 2
        nxt = None
        for _ in range(skip + 1):
            nxt = next(it, None)
            if nxt is None:
                return sample
        sample[rng.randrange(k)] = nxt
        w *= math.exp(math.log(rng.random()) / k)
        if counter is not None:
            counter["draws"] = counter.get("draws", 0) + 2


def bottom_k(stream, k, rng, counter=None):
    """Bottom-k sampling: give every item a random key, keep the k smallest
    keys. Same uniformity, one extra property this file proves outright:
    shard samples MERGE (union then re-top-k) into the global sample."""
    heap = []  # max-heap of (negated key, item)
    for x in stream:
        if counter is not None:
            counter["draws"] = counter.get("draws", 0) + 1
        key = rng.random()
        if len(heap) < k:
            heappush(heap, (-key, x))
        elif -heap[0][0] > key:
            heappushpop(heap, (-key, x))
    return heap  # (negkey, item) pairs; items = [x for _, x in heap]


def bernoulli_sample(stream, p, rng, counter=None):
    """Keep each item independently with probability p. Needs n known in
    advance to aim for k, and delivers a Binomial-sized sample: the wrong
    contract for exact-k, measured below."""
    out = []
    for x in stream:
        if counter is not None:
            counter["draws"] = counter.get("draws", 0) + 1
        if rng.random() < p:
            out.append(x)
    return out


if __name__ == "__main__":
    # Oracle 1: EXACT uniformity, by exhaustive branching with rational
    # arithmetic. For every n <= 8 and k <= 3, walk Algorithm R's entire
    # decision tree, weighting each branch by its exact probability, and
    # confirm every item's inclusion probability is k/n as a Fraction.
    def exact_inclusion(n, k):
        prob = [Fraction(0)] * n

        def go(i, sample, p):
            if i == n:
                for x in sample:
                    prob[x] += p
                return
            if len(sample) < k:
                go(i + 1, sample + (i,), p)
                return
            admit = Fraction(k, i + 1)
            for slot in range(k):
                nxt = list(sample)
                nxt[slot] = i
                go(i + 1, tuple(nxt), p * admit / k)
            go(i + 1, sample, p * (1 - admit))

        go(0, tuple(), Fraction(1))
        return prob

    for n in range(1, 9):
        for k in range(1, min(3, n) + 1):
            probs = exact_inclusion(n, k)
            assert all(p == Fraction(k, n) for p in probs), (n, k, probs)

    # Oracle 2: bottom-k is uniform by symmetry, verified by enumerating
    # every ordering of distinct keys on small cases: each item lands in
    # the k smallest in exactly k/n of the orderings.
    from itertools import permutations
    for n, k in ((4, 1), (5, 2), (6, 3)):
        count = [0] * n
        total = 0
        for perm in permutations(range(n)):
            total += 1
            ranked = sorted(range(n), key=lambda i: perm[i])[:k]
            for i in ranked:
                count[i] += 1
        assert all(c * n == k * total for c in count), (n, k, count)

    # Oracle 3: statistical agreement at a size the enumeration cannot
    # reach: n = 100, k = 10, 30,000 trials, every item's inclusion
    # frequency within 4 sigma of 0.1, for R and L both.
    T = 30_000
    n_stat, k_stat = 100, 10
    sigma = math.sqrt(0.1 * 0.9 / T)
    for sampler in (reservoir_r, reservoir_l):
        freq = [0] * n_stat
        for t in range(T):
            rng = random.Random(1_000_000 + t)
            for x in sampler(range(n_stat), k_stat, rng):
                freq[x] += 1
        worst = max(abs(f / T - 0.1) for f in freq)
        assert worst < 4 * sigma, (sampler.__name__, worst, 4 * sigma)

    # Oracle 4: the draw ledger at scale. n = 1,000,000, k = 100.
    N, K = 1_000_000, 100
    c_r, c_l, c_bk, c_bern = {}, {}, {}, {}
    s_r = reservoir_r(range(N), K, random.Random(1), c_r)
    s_l = reservoir_l(range(N), K, random.Random(2), c_l)
    bottom_k(range(N), K, random.Random(3), c_bk)
    assert len(s_r) == K and len(s_l) == K
    assert c_r["draws"] == N - K, c_r["draws"]  # one draw per post-fill item
    bound_l = 5 * K * (1 + math.log(N / K))
    assert c_l["draws"] < bound_l, (c_l["draws"], bound_l)

    # Oracle 5: Bernoulli's broken contract: aimed at k, it delivers a
    # Binomial spread. Over 400 runs at n = 10,000, the size varies.
    sizes = []
    for t in range(400):
        got = bernoulli_sample(range(10_000), K / 10_000, random.Random(5000 + t))
        sizes.append(len(got))
    assert min(sizes) < K < max(sizes), (min(sizes), max(sizes))
    assert abs(sum(sizes) / len(sizes) - K) < 3, sum(sizes) / len(sizes)

    # Oracle 6: bottom-k merges EXACTLY. Sample two halves of a stream
    # with the same per-item keys, merge by re-taking the k smallest, and
    # get byte-for-byte the full-stream sample.
    keys = {i: random.Random(777 + i).random() for i in range(20_000)}

    def bk_with_keys(items):
        heap = []
        for x in items:
            if len(heap) < K:
                heappush(heap, (-keys[x], x))
            elif -heap[0][0] > keys[x]:
                heappushpop(heap, (-keys[x], x))
        return sorted(heap)

    full = bk_with_keys(range(20_000))
    half_a = bk_with_keys(range(10_000))
    half_b = bk_with_keys(range(10_000, 20_000))
    merged = sorted(sorted(half_a + half_b, reverse=True)[:K])
    assert merged == full, "shard samples must merge into the global sample"

    # Oracle 7: the never-here, measured. Systematic sampling (every
    # n/k-th item) locks onto one phase whenever the data's period divides
    # the stride, which real streams arrange constantly (hourly patterns
    # sampled daily, 8-cycle telemetry sampled every 10,000).
    period_stream = [i % 8 for i in range(N)]
    step = N // K  # 10,000: divisible by the period 8
    systematic = [period_stream[i] for i in range(0, N, step)][:K]
    res = [period_stream[x] for x in reservoir_r(range(N), K, random.Random(9))]
    true_mean = sum(period_stream) / N
    sys_err = abs(sum(systematic) / len(systematic) - true_mean)
    res_err = abs(sum(res) / len(res) - true_mean)
    assert len(set(systematic)) == 1, "the systematic sample is one phase, only"
    assert sys_err > 10 * max(res_err, 0.05), (sys_err, res_err)

    print(f"contest: stream n = {N:,}, k = {K}; the ledger per method:")
    print(f"  {'method':<26} {'random draws':>13} {'memory':>10} {'exact k?':>9}")
    print(f"  {'Reservoir x Algorithm R':<26} {c_r['draws']:>13,} {K:>10} {'yes':>9}")
    print(f"  {'Reservoir x Algorithm L':<26} {c_l['draws']:>13,} {K:>10} {'yes':>9}")
    print(f"  {'Bottom-k random keys':<26} {c_bk['draws']:>13,} {K:>10} {'yes':>9}")
    print(f"  {'Store all, pick at end':<26} {K:>13,} {N:>10,} {'yes':>9}")
    print(f"  {'Bernoulli p = k/n':<26} {N:>13,} {'~k':>10} {'NO':>9}")
    print(f"bernoulli sizes over 400 runs: min {min(sizes)}, mean {sum(sizes)/len(sizes):.1f}, max {max(sizes)}")
    print(f"systematic sampling on the periodic stream: one phase only, mean error {sys_err:.2f} vs reservoir {res_err:.3f}")
    print("OK: uniformity proven EXACTLY by rational branching, bottom-k by full enumeration, draws bounded, the merge is exact, and the contracts are pinned")
