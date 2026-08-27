# Puzzle 39: Activity selection x earliest-finish-first greedy
# Pick the largest set of non-overlapping intervals: the canonical
# problem where exactly one greedy compass points true and the plausible
# ones all point wrong.
#
# The pairing is the point. The algorithm is the one-pass greedy
# skeleton: sort by SOMETHING, sweep, take whatever fits. The heuristic
# is the compass: sort by earliest FINISH. The exchange argument makes
# it exact: the first-finishing compatible interval can be swapped into
# any optimal solution without loss, so greed never pays for its haste.
# This file does not cite that theorem: it verifies greedy == optimal on
# thousands of instances against a DP referee that is itself verified
# against brute-force subset enumeration. The wrong compasses (earliest
# start, shortest first, fewest conflicts) are refuted by constructed
# gadgets and measured deficits, and the weighted boundary, where ALL
# cardinality greed dies and DP takes over, is priced.
import bisect
import random


def greedy(intervals, key):
    """The shared skeleton: sort by key, sweep, take what fits."""
    chosen = []
    last_end = float("-inf")
    for (s, e) in sorted(intervals, key=key):
        if s >= last_end:
            chosen.append((s, e))
            last_end = e
    return chosen


def earliest_finish(intervals):
    return greedy(intervals, key=lambda iv: iv[1])


def earliest_start(intervals):
    return greedy(intervals, key=lambda iv: iv[0])


def shortest_first(intervals):
    """Take in duration order whenever compatible with everything chosen
    so far (kept in a start-sorted list; conflicts checked by bisect)."""
    starts = []
    ends_at = []
    chosen = []
    for (s, e) in sorted(intervals, key=lambda x: x[1] - x[0]):
        i = bisect.bisect_right(starts, s)
        if (i > 0 and ends_at[i - 1] > s) or (i < len(starts) and starts[i] < e):
            continue
        starts.insert(i, s)
        ends_at.insert(i, e)
        chosen.append((s, e))
    return chosen


def fewest_conflicts(intervals):
    """Repeatedly take the live interval overlapping the fewest live
    others, then delete it and its conflicts."""
    live = list(intervals)
    chosen = []
    while live:
        counts = []
        for i, a in enumerate(live):
            c = sum(1 for j, b in enumerate(live) if i != j and a[0] < b[1] and b[0] < a[1])
            counts.append((c, i))
        _, pick = min(counts)
        a = live[pick]
        chosen.append(a)
        live = [b for b in live if not (a[0] < b[1] and b[0] < a[1])]
    return chosen


def dp_optimal(intervals, weights=None):
    """Weighted interval scheduling DP with predecessor binary search:
    with unit weights it is the exact cardinality referee."""
    if not intervals:
        return 0
    order = sorted(range(len(intervals)), key=lambda i: intervals[i][1])
    ends = [intervals[i][1] for i in order]
    best = [0] * (len(order) + 1)
    for t, i in enumerate(order, start=1):
        s, e = intervals[i]
        w = 1 if weights is None else weights[i]
        p = bisect.bisect_right(ends, s, 0, t - 1)
        best[t] = max(best[t - 1], best[p] + w)
    return best[-1]


def brute_force(intervals):
    """All subsets: the referee's referee, exponential and exact."""
    n = len(intervals)
    best = 0
    for mask in range(1 << n):
        chosen = [intervals[i] for i in range(n) if mask >> i & 1]
        ok = all(
            a[1] <= b[0] or b[1] <= a[0]
            for x, a in enumerate(chosen)
            for b in chosen[x + 1 :]
        )
        if ok:
            best = max(best, len(chosen))
    return best


def rand_instance(rng, n, span=1_000):
    out = []
    for _ in range(n):
        s = rng.randrange(span)
        out.append((s, s + 1 + rng.randrange(span // 8)))
    return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the referee's referee. DP == brute force on 300 small
    # instances (subset enumeration is exact by construction).
    for _ in range(300):
        ivs = rand_instance(rng, rng.randint(1, 14), span=40)
        assert dp_optimal(ivs) == brute_force(ivs)

    # Oracle 2: the theorem, hammered. Earliest-finish == DP optimal on
    # 2,000 random instances; the cheap wrong compasses rack up deficits
    # there, and the quadratic fewest-conflicts rule gets its own 500.
    deficits = {"earliest start": 0, "shortest first": 0, "fewest conflicts": 0}
    fails = {k: 0 for k in deficits}
    for t in range(2_000):
        ivs = rand_instance(rng, rng.randint(2, 60), span=200)
        opt = dp_optimal(ivs)
        assert len(earliest_finish(ivs)) == opt, ivs  # exact, every time
        for name, fn in (
            ("earliest start", earliest_start),
            ("shortest first", shortest_first),
        ):
            got = len(fn(ivs))
            assert got <= opt
            if got < opt:
                deficits[name] += opt - got
                fails[name] += 1
    fc_example = None
    for t in range(500):
        ivs = rand_instance(rng, rng.randint(2, 30), span=120)
        opt = dp_optimal(ivs)
        got = len(fewest_conflicts(ivs))
        assert got <= opt
        if got < opt:
            deficits["fewest conflicts"] += opt - got
            fails["fewest conflicts"] += 1
            if fc_example is None:
                fc_example = (ivs, got, opt)
    for name in deficits:
        assert fails[name] > 0, name  # every wrong compass actually failed
    assert fc_example is not None

    # Oracle 3: constructed executions, deterministic. Earliest start:
    # one long early request blocks fifty short ones.
    gadget_es = [(0, 1_000)] + [(2 * k + 1, 2 * k + 2) for k in range(50)]
    assert len(earliest_start(gadget_es)) == 1
    assert len(earliest_finish(gadget_es)) == 50 == dp_optimal(gadget_es)

    # Shortest first: a short bridge spoils two long compatible ones,
    # repeated in fifty gadgets: 50 picks where 100 existed.
    gadget_sf = []
    for k in range(50):
        base = k * 30
        gadget_sf += [(base, base + 10), (base + 11, base + 21), (base + 9, base + 12)]
    assert len(shortest_first(gadget_sf)) == 50
    assert len(earliest_finish(gadget_sf)) == 100 == dp_optimal(gadget_sf)

    # Oracle 4: the measured contest. One instance, every compass.
    N = 10_000
    big = rand_instance(rng, N, span=100_000)
    opt_big = dp_optimal(big)
    ef_big = len(earliest_finish(big))
    es_big = len(earliest_start(big))
    sf_big = len(shortest_first(big))
    assert ef_big == opt_big
    fc_ivs = rand_instance(rng, 400, span=4_000)
    fc_opt = dp_optimal(fc_ivs)
    fc_got = len(fewest_conflicts(fc_ivs))

    # Oracle 5: the weighted boundary. Give intervals values and the
    # cardinality greedy dies: DP takes over. Measured ratio.
    worst_ratio = 1.0
    total_greedy_w = 0
    total_opt_w = 0
    for _ in range(300):
        ivs = rand_instance(rng, 40, span=200)
        ws = [rng.randint(1, 100) for _ in ivs]
        chosen = earliest_finish(ivs)
        wmap = {}
        for iv, w in zip(ivs, ws):
            wmap[iv] = max(wmap.get(iv, 0), w)
        greedy_w = sum(wmap[c] for c in chosen)
        opt_w = dp_optimal(ivs, ws)
        assert greedy_w <= opt_w
        total_greedy_w += greedy_w
        total_opt_w += opt_w
        worst_ratio = min(worst_ratio, greedy_w / opt_w)
    avg_ratio = total_greedy_w / total_opt_w
    assert avg_ratio < 0.95  # count-greed measurably leaks value

    print(f"contest: n = {N:,} random requests, one room; referee: weighted-interval DP (itself verified against subset brute force on 300 small instances)")
    print(f"  {'compass':<22} {'selected':>9}   verdict")
    print(f"  {'earliest FINISH':<22} {ef_big:>9,}   optimal, and equal to DP on all 2,000 trials")
    print(f"  {'earliest start':<22} {es_big:>9,}   {opt_big - es_big:,} short of optimal here; gadget: 1 vs 50")
    print(f"  {'shortest first':<22} {sf_big:>9,}   {opt_big - sf_big:,} short here; gadget: 50 vs 100")
    print(f"  {'fewest conflicts':<22} {fc_got:>9,}   at its own n=400: {fc_opt - fc_got} short (suboptimal in {fails['fewest conflicts']}/500 trials)")
    print(f"trial deficits: earliest start {fails['earliest start']}/2,000 failures ({deficits['earliest start']} lost picks), shortest first {fails['shortest first']}/2,000 ({deficits['shortest first']}), fewest conflicts {fails['fewest conflicts']}/500 ({deficits['fewest conflicts']})")
    ex_ivs, ex_got, ex_opt = fc_example
    print(f"discovered fewest-conflicts counterexample ({len(ex_ivs)} intervals): picks {ex_got}, optimal {ex_opt}")
    print(f"the weighted boundary: cardinality greed keeps {avg_ratio:.1%} of optimal value on average (worst trial {worst_ratio:.1%}): the moment values differ, the compass is DP")
    print("OK: DP verified against brute force, earliest-finish equal to optimal on every one of 2,000 trials plus both gadgets, every rival compass caught failing, and the weighted boundary priced")
