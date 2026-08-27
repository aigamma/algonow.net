# Puzzle 40: Consistent hashing x virtual nodes
# Place keys on a changing fleet of nodes so that membership changes
# move only the keys they must, and the load stays level.
#
# The pairing is the point. The algorithm is the ring: hash nodes and
# keys onto one circle, and each key belongs to the first node clockwise
# from it. A node's departure hands its arc, and ONLY its arc, to its
# successor: minimal movement is geometry, not luck, and this file
# asserts it as set algebra (the moved keys are EXACTLY the departed
# node's keys). The heuristic is virtual nodes: hash each server onto
# the ring at many points, so arcs interleave, loads level out
# (measured: the coefficient of variation collapses), and a departure's
# grief spreads across many survivors instead of burying one neighbor.
# The rivals are priced honestly: mod-N moves 90% of everything;
# rendezvous hashing matches the ring's movement guarantee with perfect
# balance and pays O(n) hashes per lookup.
import bisect
import hashlib
import random
import statistics


def h64(s):
    """Stable 64-bit hash from sha1: deterministic across runs."""
    return int.from_bytes(hashlib.sha1(s.encode()).digest()[:8], "big")


class Ring:
    def __init__(self, nodes, vnodes=1):
        self.vnodes = vnodes
        self.points = []
        for node in nodes:
            for v in range(vnodes):
                self.points.append((h64(f"{node}#{v}"), node))
        self.points.sort()
        self.hashes = [p[0] for p in self.points]

    def owner(self, key, counter=None):
        if counter is not None:
            counter["hashes"] = counter.get("hashes", 0) + 1
        i = bisect.bisect_right(self.hashes, h64(key))
        return self.points[i % len(self.points)][1]


def mod_n_owner(nodes, key):
    return sorted(nodes)[h64(key) % len(nodes)]


def rendezvous_owner(nodes, key, counter=None):
    if counter is not None:
        counter["hashes"] = counter.get("hashes", 0) + len(nodes)
    return max(nodes, key=lambda nd: h64(f"{nd}|{key}"))


def load_stats(assign, nodes):
    counts = {nd: 0 for nd in nodes}
    for nd in assign.values():
        counts[nd] += 1
    mean = sum(counts.values()) / len(counts)
    return {
        "max_over_mean": max(counts.values()) / mean,
        "min_over_mean": min(counts.values()) / mean,
        "cv": statistics.pstdev(counts.values()) / mean,
        "counts": counts,
    }


if __name__ == "__main__":
    rng = random.Random(20260827)
    NODES = [f"node-{c}" for c in "ABCDEFGHIJ"]
    KEYS = [f"key-{i}" for i in range(100_000)]
    VICTIM = "node-D"
    survivors = [n for n in NODES if n != VICTIM]

    # Oracle 1: determinism and order-independence. Two rings built
    # from differently ordered node lists agree on every key.
    r1 = Ring(NODES, vnodes=50)
    r2 = Ring(list(reversed(NODES)), vnodes=50)
    for k in KEYS[:2_000]:
        assert r1.owner(k) == r2.owner(k)

    # Oracle 2: the ring's movement theorem, as set algebra. Remove one
    # node: the keys that move are EXACTLY the keys it owned.
    for vn in (1, 100):
        ring_b = Ring(NODES, vn)
        before = {k: ring_b.owner(k) for k in KEYS}
        after_ring = Ring(survivors, vn)
        after = {k: after_ring.owner(k) for k in KEYS}
        moved = {k for k in KEYS if before[k] != after[k]}
        owned = {k for k in KEYS if before[k] == VICTIM}
        assert moved == owned, vn  # not one key more, not one less

    # Where does the grief go? With one vnode, to a single successor;
    # with 100, across many survivors.
    rb1, ra1 = Ring(NODES, 1), Ring(survivors, 1)
    before1 = {k: rb1.owner(k) for k in KEYS}
    after1 = {k: ra1.owner(k) for k in KEYS}
    heirs1 = {after1[k] for k in KEYS if before1[k] == VICTIM}
    rb100, ra100 = Ring(NODES, 100), Ring(survivors, 100)
    before100 = {k: rb100.owner(k) for k in KEYS}
    after100 = {k: ra100.owner(k) for k in KEYS}
    heirs100 = {after100[k] for k in KEYS if before100[k] == VICTIM}
    assert len(heirs1) == 1, heirs1        # one neighbor buried
    assert len(heirs100) >= 7, heirs100    # the grief is shared

    # Oracle 3: mod-N moves almost everything, measured against theory
    # (N-1)/N = 90%.
    mod_before = {k: mod_n_owner(NODES, k) for k in KEYS}
    mod_after = {k: mod_n_owner(survivors, k) for k in KEYS}
    mod_moved = sum(1 for k in KEYS if mod_before[k] != mod_after[k])
    frac_mod = mod_moved / len(KEYS)
    assert frac_mod > 0.80

    # Oracle 4: a JOIN moves only what lands on the newcomer.
    joined = NODES + ["node-K"]
    ring_join = Ring(joined, 100)
    after_join = {k: ring_join.owner(k) for k in KEYS}
    join_moved = {k for k in KEYS if before100[k] != after_join[k]}
    assert all(after_join[k] == "node-K" for k in join_moved)
    frac_join = len(join_moved) / len(KEYS)
    assert 0.03 < frac_join < 0.16  # ~1/11 in expectation

    # Oracle 5: the vnode dial. Load imbalance collapses as vnodes rise.
    dial = {}
    for vn in (1, 10, 100, 1_000):
        ring = Ring(NODES, vn)
        assign = {k: ring.owner(k) for k in KEYS}
        dial[vn] = load_stats(assign, NODES)
    assert dial[1]["cv"] > 2 * dial[100]["cv"]
    assert dial[100]["cv"] > dial[1_000]["cv"]

    # Oracle 6: rendezvous hashing: the same movement theorem, perfect
    # balance with no vnodes, and the O(n) lookup bill, counted.
    rv_before = {k: rendezvous_owner(NODES, k) for k in KEYS}
    rv_after = {k: rendezvous_owner(survivors, k) for k in KEYS}
    rv_moved = {k for k in KEYS if rv_before[k] != rv_after[k]}
    rv_owned = {k for k in KEYS if rv_before[k] == VICTIM}
    assert rv_moved == rv_owned
    rv_stats = load_stats(rv_before, NODES)
    c_ring = {}
    c_rv = {}
    ring100 = Ring(NODES, 100)
    for k in KEYS[:10_000]:
        ring100.owner(k, c_ring)
        rendezvous_owner(NODES, k, c_rv)
    assert c_rv["hashes"] == 10 * c_ring["hashes"]  # n hashes vs 1 + bisect

    print(f"contest: {len(NODES)} nodes, {len(KEYS):,} keys, one node removed; movement asserted as set algebra (moved == owned by the departed, exactly)")
    print(f"  {'scheme':<28} {'keys moved':>10} {'max/mean load':>13}")
    print(f"  {'mod-N rehash':<28} {frac_mod:>9.1%} {load_stats(mod_before, NODES)['max_over_mean']:>13.2f}   theory says (N-1)/N = 90%")
    frac1 = sum(1 for k in KEYS if before1[k] != after1[k]) / len(KEYS)
    print(f"  {'ring, 1 vnode':<28} {frac1:>9.1%} {dial[1]['max_over_mean']:>13.2f}   minimal movement, lopsided arcs, one heir")
    print(f"  {'ring, 100 vnodes':<28} {sum(1 for k in KEYS if before100[k] != after100[k]) / len(KEYS):>9.1%} {dial[100]['max_over_mean']:>13.2f}   minimal movement, level load, {len(heirs100)} heirs")
    print(f"  {'rendezvous (HRW)':<28} {len(rv_moved) / len(KEYS):>9.1%} {rv_stats['max_over_mean']:>13.2f}   same theorem, no vnodes, n hashes per lookup")
    print("vnode dial (coefficient of variation of node loads): " + " | ".join(f"v={v}: {dial[v]['cv']:.3f}" for v in sorted(dial)))
    print(f"join: adding an 11th node moved {frac_join:.1%} of keys, every one of them onto the newcomer (asserted)")
    print(f"lookup pricing over 10,000 keys: ring 100 vnodes {c_ring['hashes']:,} key-hashes + bisect; rendezvous {c_rv['hashes']:,} hashes (n per lookup)")
    print("OK: order-independent construction, movement equals ownership exactly for ring and rendezvous, mod-N measured near its 90% theory, joins land only on the newcomer, the vnode dial collapses variance, and the grief of a departure spreads from 1 heir to many")
