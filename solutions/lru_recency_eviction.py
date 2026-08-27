# Puzzle 17: LRU caching x least-recently-used eviction
# A cache of k slots, a stream of requests, and one online decision: on a
# miss with a full cache, which resident dies?
#
# The pairing is the point. The control structure is demand caching: serve
# hits, fetch misses, evict only when full, decide online with no view of
# the future, every decision final. The heuristic is recency: evict the
# least recently used resident, betting that the past predicts the future
# through temporal locality (what was touched recently will be touched again
# soon). The bet is measurably brilliant on real reuse patterns, provably
# k-competitive against a clairvoyant (Sleator-Tarjan), immune to Belady's
# anomaly by the stack property, and it collapses to zero on one famous
# pattern this file pins: the sequential scan a hair larger than the cache.
import bisect
import random
from collections import deque
from functools import lru_cache as _memo


class LRU:
    """dict-ordered recency: Python dicts preserve insertion order, so
    delete-and-reinsert keeps the least recent at the front. O(1) per op."""

    def __init__(self, k):
        self.k = k
        self.slots = {}

    def request(self, x):
        if x in self.slots:
            del self.slots[x]
            self.slots[x] = True
            return True
        if len(self.slots) >= self.k:
            self.slots.pop(next(iter(self.slots)))
        self.slots[x] = True
        return False


class FIFO:
    """Evict in arrival order, ignoring use entirely."""

    def __init__(self, k):
        self.k = k
        self.q = deque()
        self.resident = set()

    def request(self, x):
        if x in self.resident:
            return True
        if len(self.q) >= self.k:
            self.resident.discard(self.q.popleft())
        self.q.append(x)
        self.resident.add(x)
        return False


class RandomEvict:
    def __init__(self, k, seed=20260827):
        self.k = k
        self.rng = random.Random(seed)
        self.items = []
        self.resident = set()

    def request(self, x):
        if x in self.resident:
            return True
        if len(self.items) >= self.k:
            i = self.rng.randrange(len(self.items))
            self.resident.discard(self.items[i])
            self.items[i] = self.items[-1]
            self.items.pop()
        self.items.append(x)
        self.resident.add(x)
        return False


class LFU:
    """Evict the least frequently used; ties break toward least recent.
    Counts persist for residents only (plain LFU, no decay)."""

    def __init__(self, k):
        self.k = k
        self.count = {}
        self.last = {}
        self.clock = 0

    def request(self, x):
        self.clock += 1
        if x in self.count:
            self.count[x] += 1
            self.last[x] = self.clock
            return True
        if len(self.count) >= self.k:
            victim = min(self.count, key=lambda v: (self.count[v], self.last[v]))
            del self.count[victim]
            del self.last[victim]
        self.count[x] = 1
        self.last[x] = self.clock
        return False


class Belady:
    """The clairvoyant: evict the resident whose next use lies farthest in
    the future (or never). Needs the whole trace in advance, which is
    exactly why it is a measuring stick and not a policy."""

    def __init__(self, k, trace):
        self.k = k
        n = len(trace)
        nxt = [n + 1] * n
        seen = {}
        for i in range(n - 1, -1, -1):
            nxt[i] = seen.get(trace[i], n + 1)
            seen[trace[i]] = i
        self.nxt = nxt
        self.resident = {}  # item -> its next-use position
        self.i = 0

    def request(self, x):
        i = self.i
        self.i += 1
        if x in self.resident:
            self.resident[x] = self.nxt[i]
            return True
        if len(self.resident) >= self.k:
            victim = max(self.resident, key=lambda v: self.resident[v])
            del self.resident[victim]
        self.resident[x] = self.nxt[i]
        return False


def run(policy, trace):
    hits = sum(1 for x in trace if policy.request(x))
    return hits / len(trace)


# --------------------------------------------------------------- the traces


def zipf_trace(n=100_000, universe=1000, alpha=0.9, seed=20260827):
    """Web-shaped popularity: a few hot objects, a long cold tail."""
    rng = random.Random(seed)
    weights = [1.0 / (r + 1) ** alpha for r in range(universe)]
    cum = []
    acc = 0.0
    for w in weights:
        acc += w
        cum.append(acc)
    total = cum[-1]
    return [bisect.bisect_left(cum, rng.random() * total) for _ in range(n)]


def loop_trace(n=100_000, universe=80):
    """The scan: a cyclic sweep one hair larger than the cache. Recency's
    nightmare: every item is evicted exactly 16 requests before its reuse."""
    return [i % universe for i in range(n)]


def drift_trace(n=100_000, universe=1000, alpha=0.9, phase=20_000, seed=20260828):
    """The same Zipf popularity, but the world moves: every 20,000 requests
    the identities behind the ranks reshuffle. Frequency's nightmare: LFU's
    accumulated counts keep yesterday's celebrities resident."""
    rng = random.Random(seed)
    weights = [1.0 / (r + 1) ** alpha for r in range(universe)]
    cum = []
    acc = 0.0
    for w in weights:
        acc += w
        cum.append(acc)
    total = cum[-1]
    ids = list(range(universe))
    out = []
    for i in range(n):
        if i % phase == 0:
            rng.shuffle(ids)
        out.append(ids[bisect.bisect_left(cum, rng.random() * total)])
    return out


K = 64


if __name__ == "__main__":
    zipf = zipf_trace()
    loop = loop_trace()

    # Oracle 1: Belady really is the offline optimum. On 50 tiny instances,
    # compare farthest-future eviction against an exhaustive DP over all
    # reachable cache states (demand paging, mandatory insertion).
    def dp_min_misses(trace, k):
        @_memo(maxsize=None)
        def go(i, cache):
            if i == len(trace):
                return 0
            x = trace[i]
            if x in cache:
                return go(i + 1, cache)
            if len(cache) < k:
                return 1 + go(i + 1, frozenset(cache | {x}))
            best = None
            for victim in cache:
                c = 1 + go(i + 1, frozenset((cache - {victim}) | {x}))
                if best is None or c < best:
                    best = c
            return best

        r = go(0, frozenset())
        go.cache_clear()
        return r

    rng = random.Random(7)
    for _ in range(50):
        t = [rng.randrange(5) for _ in range(rng.randint(6, 14))]
        k = rng.randint(2, 3)
        b = Belady(k, t)
        misses = sum(1 for x in t if not b.request(x))
        assert misses == dp_min_misses(tuple(t), k), (t, k)

    # Oracle 2: structural sanity for every policy: residency never exceeds
    # k, and a hit is only ever claimed for a true resident.
    for policy_cls in (LRU, FIFO, RandomEvict, LFU):
        p = policy_cls(8)
        shadow = set()
        rng2 = random.Random(1)
        for _ in range(2000):
            x = rng2.randrange(20)
            hit = p.request(x)
            assert hit == (x in shadow), f"{policy_cls.__name__} lied about a hit"
            if not hit:
                shadow.add(x)
            size = len(getattr(p, "slots", getattr(p, "resident", getattr(p, "count", {}))))
            if size > 8:
                raise AssertionError(f"{policy_cls.__name__} overflowed")
            # mirror the eviction: rebuild shadow from the policy's residency
            if policy_cls is LRU:
                shadow = set(p.slots)
            elif policy_cls is LFU:
                shadow = set(p.count)
            else:
                shadow = set(p.resident)

    # Oracle 3: the stack property. LRU with a bigger cache holds a superset
    # of the smaller cache at EVERY step, so more memory can never hurt.
    small, big = LRU(32), LRU(33)
    h_small = h_big = 0
    for x in zipf[:30_000]:
        h_small += small.request(x)
        h_big += big.request(x)
        assert set(small.slots) <= set(big.slots), "stack property broken"
    assert h_big >= h_small

    # Oracle 4: Belady's anomaly, pinned on his own 1969 string. FIFO with
    # MORE memory takes MORE faults; LRU cannot do this (oracle 3).
    s = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    fifo3 = FIFO(3)
    fifo4 = FIFO(4)
    m3 = sum(1 for x in s if not fifo3.request(x))
    m4 = sum(1 for x in s if not fifo4.request(x))
    assert (m3, m4) == (9, 10), (m3, m4)

    # Oracle 5: the contest, regenerated, with the theorem asserted: the
    # clairvoyant tops every column, and the scan zeroes out recency.
    drift = drift_trace()
    results = {}
    for name, make in (
        ("LRU", lambda t: LRU(K)),
        ("FIFO", lambda t: FIFO(K)),
        ("Random", lambda t: RandomEvict(K)),
        ("LFU", lambda t: LFU(K)),
        ("Belady OPT", lambda t: Belady(K, t)),
    ):
        results[name] = (run(make(zipf), zipf), run(make(drift), drift), run(make(loop), loop))
    for name in ("LRU", "FIFO", "Random", "LFU"):
        for col in range(3):
            assert results[name][col] <= results["Belady OPT"][col] + 1e-12
    assert results["LRU"][0] > results["FIFO"][0], "locality must pay on the web trace"
    assert results["LFU"][0] > results["LRU"][0], "static popularity must flatter frequency"
    assert results["LRU"][1] > results["LFU"][1], "drift must punish frequency's memory"
    assert results["LRU"][2] < 0.001, "the scan must zero out recency"
    assert results["Random"][2] > 0.05, "blind luck must beat perfect recency here"

    print(f"contest: cache of {K} slots, 100,000 requests per trace, hit rates:")
    print(f"  {'policy':<12} {'stationary zipf':>16} {'drifting zipf':>14} {'looping scan':>14}")
    for name in ("LRU", "FIFO", "Random", "LFU", "Belady OPT"):
        a, b, c = results[name]
        print(f"  {name:<12} {a:>15.1%} {b:>13.1%} {c:>13.1%}")
    print("OK: Belady verified optimal by exhaustive DP, the stack property held at every step, the anomaly and the scan are pinned")
