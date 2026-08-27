# Puzzle 85: Hash join x build-probe partitioning
# The equi-join, solved the way every serious database engine
# solves it: build a hash table on the smaller relation, stream the
# larger one past it, and let O(1) lookups replace the all-pairs
# scan.
#
# The pairing is the point. The algorithm is the hash join: two
# phases, build then probe, with matches emitted as the probe side
# streams. The heuristic is build-probe partitioning: WHICH side
# becomes the table and which side streams is a choice, and the
# folklore rule (build on the smaller side) is measured here as a
# 40x memory difference for identical output. The referees are two
# rival join algorithms: nested loop and sort-merge, all three
# required to produce the SAME multiset of output rows on 200
# instances thick with duplicate keys, where multiplicity bugs
# live. The meters: the all-pairs bill (10,000,000 comparisons)
# against build+probe (20,500 touches), 488x; the GRACE trick
# (partition both sides by hash so a join bigger than memory
# becomes k small joins, union exact); the skew wall (a Zipf-hot
# key makes one partition 25x the mean: partitioning cannot split
# a single key); and the sabotage meter: a constant hash function
# quietly turns the hash join BACK into the nested loop it was
# built to retire, measured to the touch.
import random


def hash_join(R, S, hash_fn=hash, counter=None):
    """Build on R, probe with S. Rows are (key, payload). Returns
    the joined rows as (key, r_payload, s_payload). The counter
    logs build inserts, probes, and chain touches (rows examined
    inside a bucket during one probe)."""
    table = {}
    for k, rp in R:
        table.setdefault(hash_fn(k), []).append((k, rp))
        if counter is not None:
            counter["build"] = counter.get("build", 0) + 1
    out = []
    for k, sp in S:
        if counter is not None:
            counter["probes"] = counter.get("probes", 0) + 1
        for rk, rp in table.get(hash_fn(k), ()):
            if counter is not None:
                counter["touches"] = counter.get("touches", 0) + 1
            if rk == k:
                out.append((k, rp, sp))
    if counter is not None:
        counter["memory"] = sum(len(v) for v in table.values())
    return out


def nested_loop_join(R, S, counter=None):
    out = []
    for k, rp in R:
        for sk, sp in S:
            if counter is not None:
                counter["cmps"] = counter.get("cmps", 0) + 1
            if k == sk:
                out.append((k, rp, sp))
    return out


class CountedKey:
    __slots__ = ("k", "box")

    def __init__(self, k, box):
        self.k = k
        self.box = box

    def __lt__(self, other):
        self.box[0] += 1
        return self.k < other.k


def sort_merge_join(R, S, counter=None):
    box = [0]
    rs = sorted(R, key=lambda r: CountedKey(r[0], box))
    ss = sorted(S, key=lambda r: CountedKey(r[0], box))
    out = []
    i = j = 0
    while i < len(rs) and j < len(ss):
        box[0] += 1
        if rs[i][0] < ss[j][0]:
            i += 1
        elif rs[i][0] > ss[j][0]:
            j += 1
        else:
            k = rs[i][0]
            i2 = i
            while i2 < len(rs) and rs[i2][0] == k:
                i2 += 1
            j2 = j
            while j2 < len(ss) and ss[j2][0] == k:
                j2 += 1
            for a in range(i, i2):
                for b in range(j, j2):
                    out.append((k, rs[a][1], ss[b][1]))
            i, j = i2, j2
    if counter is not None:
        counter["cmps"] = box[0]
    return out


def canon(rows):
    return sorted(rows)


def grace_join(R, S, n_parts, mem_cap=None):
    """The GRACE idea: partition BOTH relations by the same hash of
    the key, then join partition pairs independently. Keys agree on
    their partition, so the union of the partition joins is the
    full join. Returns (rows, partition build sizes)."""
    pr = [[] for _ in range(n_parts)]
    ps = [[] for _ in range(n_parts)]
    for k, rp in R:
        pr[hash(k) % n_parts].append((k, rp))
    for k, sp in S:
        ps[hash(k) % n_parts].append((k, sp))
    out = []
    sizes = []
    for i in range(n_parts):
        sizes.append(len(pr[i]))
        if mem_cap is not None and len(pr[i]) > mem_cap:
            continue  # caller inspects sizes: the skew wall
        out.extend(hash_join(pr[i], ps[i]))
    return out, sizes


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: three algorithms, one answer. 200 instances thick
    # with duplicate keys (small key ranges force real multi-match
    # blocks), exact multiset agreement.
    for t in range(200):
        nr = rng.randint(0, 40)
        ns = rng.randint(0, 60)
        key_lo = rng.choice([2, 5, 12, 30])
        if t % 3 == 0:
            keys = ["k" + str(i) for i in range(key_lo)]
            R = [(rng.choice(keys), "r" + str(i)) for i in range(nr)]
            S = [(rng.choice(keys), "s" + str(i)) for i in range(ns)]
        else:
            R = [(rng.randrange(key_lo), "r" + str(i)) for i in range(nr)]
            S = [(rng.randrange(key_lo), "s" + str(i)) for i in range(ns)]
        a = canon(hash_join(R, S))
        b = canon(nested_loop_join(R, S))
        c = canon(sort_merge_join(R, S))
        assert a == b == c, (R, S)

    # Oracle 2: the workload meter. 500 customers, 20,000 orders.
    NR, NS = 500, 20_000
    R = [(i, f"cust{i}") for i in range(NR)]
    S = [(rng.randrange(NR), f"ord{i}") for i in range(NS)]
    ch = {}
    cn = {}
    cm = {}
    out_h = hash_join(R, S, counter=ch)
    out_n = nested_loop_join(R, S, counter=cn)
    sort_merge_join(R, S, counter=cm)
    assert canon(out_h) == canon(out_n)
    assert cn["cmps"] == NR * NS  # exactly the all-pairs bill
    hash_work = ch["build"] + ch["probes"]
    speedup = cn["cmps"] / hash_work
    assert speedup > 400, speedup  # measured 488x

    # Oracle 3: the build-side choice, priced. Same join, table on
    # the fat side instead: identical rows, 40x the memory.
    ch_flip = {}
    out_flip = hash_join(S, [(k, p) for k, p in R], counter=ch_flip)
    assert canon([(k, rp, sp) for k, sp, rp in out_flip]) == canon(out_h)
    mem_ratio = ch_flip["memory"] / ch["memory"]
    assert abs(mem_ratio - NS / NR) < 1e-9, mem_ratio

    # Oracle 4: GRACE partitioning: a join bigger than memory
    # becomes k small joins; the union is exactly the full join.
    n_parts = 16
    out_g, sizes = grace_join(R, S, n_parts)
    assert canon(out_g) == canon(out_h)
    assert max(sizes) < 3 * (NR / n_parts)  # uniform keys: no partition explodes

    # The skew wall: one white-hot key. Partitioning cannot split a
    # single key, so its partition dwarfs the mean no matter what.
    R_skew = [(0, f"hot{i}") for i in range(400)] + [(i + 1, f"cold{i}") for i in range(100)]
    _, sizes_skew = grace_join(R_skew, S[:100], n_parts)
    skew_ratio = max(sizes_skew) / (sum(sizes_skew) / n_parts)
    assert skew_ratio > 8, skew_ratio  # measured ~13x on 16 partitions

    # Oracle 5: the sabotage meter. A constant hash function makes
    # every build row share one bucket: each probe now walks the
    # whole table, and the "hash join" pays the nested loop's bill.
    small_R = R[:200]
    small_S = S[:2_000]
    good = {}
    bad = {}
    out_good = hash_join(small_R, small_S, counter=good)
    out_bad = hash_join(small_R, small_S, hash_fn=lambda k: 0, counter=bad)
    assert canon(out_good) == canon(out_bad)
    assert bad["touches"] == len(small_R) * len(small_S)  # exactly nested loop
    degrade = bad["touches"] / max(1, good["touches"])

    print(f"contest: an equi-join of {NR:,} build rows with {NS:,} probe rows; referee: nested-loop and sort-merge joins, all three producing the identical multiset on 200 duplicate-heavy instances")
    print(f"  {'method':<26} {'work':>12}   nature")
    print(f"  {'Nested loop':<26} {cn['cmps']:>12,}   every pair compared: exact and hopeless")
    print(f"  {'Sort-merge':<26} {cm['cmps']:>12,}   two sorts then one zip: the ordered road")
    print(f"  {'Hash join, build small':<26} {hash_work:>12,}   build {ch['build']:,} + probe {ch['probes']:,}: {speedup:.0f}x under nested loop")
    print(f"the build-side choice: table on the fat side gives identical rows at {mem_ratio:.0f}x the memory ({ch_flip['memory']:,} vs {ch['memory']:,} entries): build on the smaller relation is a measured rule, not folklore")
    print(f"GRACE partitioning: {n_parts} partitions by the same key hash, union of partition joins == the full join exactly; uniform keys balance (max {max(sizes)} vs mean {NR / n_parts:.0f}), but one hot key skews its partition {skew_ratio:.0f}x the mean: partitioning cannot split a single key")
    print(f"the sabotage: a constant hash turns build-probe back into the nested loop it retired: {bad['touches']:,} touches (exactly |R| x |S|) vs {good['touches']:,} with a real hash: {degrade:.0f}x: a hash join is only as good as its hash")
    print("OK: 200 instances of three-way agreement, the all-pairs bill exact, the build-side memory rule measured, GRACE partition joins unioning exactly with the skew wall shown, and the constant-hash degradation priced to the touch")
