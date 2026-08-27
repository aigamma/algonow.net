# Puzzle 62: Mo's algorithm x sqrt block query ordering
# Answer q offline range queries: here COUNT DISTINCT in [l, r], a
# query no classic tree decomposes: by dragging one window across the
# array in a cleverly chosen order.
#
# The pairing is the point. The algorithm is the two-pointer window:
# maintain [curL, curR] with O(1) add/remove updates to the running
# answer; any query is reachable by sliding pointers. The heuristic is
# the ORDER: sort queries by (l's sqrt-block, then r), so the right
# pointer sweeps monotonically within each block (n per block) and the
# left pointer jitters at most a block width per query: total moves
# O(n^2/b + q*b). The referee is brute-force recounting of every
# query, and the meter is exact: every add/remove is counted, for
# every ordering raced: random order, sorted-by-l, plain sqrt blocks,
# the snake refinement (alternate r direction per block), the Hilbert
# curve refinement, and the block-size dial including the folklore
# b = sqrt(n) against the true optimum b = n/sqrt(q).
import math
import random


def solve(a, vmax, queries, order, counter):
    """Answer distinct-count queries in the given order; count moves."""
    freq = [0] * (vmax + 1)
    distinct = 0
    moves = 0
    curL, curR = 0, -1  # empty window
    out = [0] * len(queries)

    def add(i):
        nonlocal distinct
        v = a[i]
        if freq[v] == 0:
            distinct += 1
        freq[v] += 1

    def remove(i):
        nonlocal distinct
        v = a[i]
        freq[v] -= 1
        if freq[v] == 0:
            distinct -= 1

    for qi in order:
        l, r = queries[qi]
        while curR < r:
            curR += 1
            add(curR)
            moves += 1
        while curL > l:
            curL -= 1
            add(curL)
            moves += 1
        while curR > r:
            remove(curR)
            curR -= 1
            moves += 1
        while curL < l:
            remove(curL)
            curL += 1
            moves += 1
        out[qi] = distinct
    counter["moves"] = moves
    return out


def mo_order(queries, block, snake=False):
    def key(i):
        l, r = queries[i]
        b = l // block
        rr = -r if (snake and b % 2 == 1) else r
        return (b, rr)

    return sorted(range(len(queries)), key=key)


def hilbert_d(x, y, order=13):
    d = 0
    s = 1 << (order - 1)
    while s > 0:
        rx = 1 if (x & s) > 0 else 0
        ry = 1 if (y & s) > 0 else 0
        d += s * s * ((3 * rx) ^ ry)
        if ry == 0:
            if rx == 1:
                x = s - 1 - x
                y = s - 1 - y
            x, y = y, x
        s //= 2
    return d


if __name__ == "__main__":
    rng = random.Random(20260827)
    n, q, vmax = 6000, 900, 300
    a = [rng.randrange(vmax + 1) for _ in range(n)]
    queries = []
    for _ in range(q):
        l = rng.randrange(n)
        r = rng.randrange(l, n)
        queries.append((l, r))

    # The referee: brute-force recount of every query.
    truth = [len(set(a[l : r + 1])) for l, r in queries]

    # The orderings raced, all through the SAME window machinery.
    meters = {}

    def race(name, order):
        c = {}
        got = solve(a, vmax, queries, order, c)
        assert got == truth, name  # every ordering answers correctly
        meters[name] = c["moves"]
        return c["moves"]

    race("random order", list(range(q)))
    race("sorted by l", sorted(range(q), key=lambda i: queries[i]))
    b_folk = int(math.isqrt(n))            # the folklore block
    b_true = max(1, int(n / math.sqrt(q))) # the cost-balancing optimum
    race("mo sqrt blocks", mo_order(queries, b_folk))
    race("mo snake", mo_order(queries, b_folk, snake=True))
    race("mo tuned block", mo_order(queries, b_true, snake=True))
    hil = sorted(range(q), key=lambda i: hilbert_d(queries[i][0], queries[i][1]))
    race("mo hilbert", hil)

    # The ordering IS the speed: same machinery, same answers.
    assert meters["mo sqrt blocks"] < 0.5 * meters["random order"]
    assert meters["mo sqrt blocks"] < 0.5 * meters["sorted by l"]
    assert meters["mo snake"] < meters["mo sqrt blocks"]       # r never resets
    assert meters["mo hilbert"] < meters["mo sqrt blocks"]     # the t3 refinement

    # The theory bound for the sqrt-block schedule.
    bound = 2 * (n * n / b_folk + q * b_folk + n)
    assert meters["mo sqrt blocks"] < bound

    # The block dial: the folklore sqrt(n) is calibrated for q ~ n;
    # with q << n the balance point n/sqrt(q) is wider and cheaper.
    dial = {}
    for b in [10, b_folk, b_true, 2000]:
        c = {}
        got = solve(a, vmax, queries, mo_order(queries, b), c)
        assert got == truth
        dial[b] = c["moves"]
    assert dial[10] > dial[b_folk]      # too narrow: l cheap, r thrashes
    assert dial[2000] > dial[b_true]    # too wide: l thrashes
    assert dial[b_true] < dial[b_folk]  # the honest dial: n/sqrt(q) wins

    print(f"contest: {q} offline distinct-count queries on n = {n:,}; referee: brute-force recount of every query, every ordering asserted equal; meter: exact add/remove count")
    print(f"  {'ordering':<22} {'pointer moves':>14}")
    for name in ["random order", "sorted by l", "mo sqrt blocks", "mo snake", "mo hilbert", "mo tuned block"]:
        note = {
            "random order": "both pointers thrash a third of the array per query",
            "sorted by l": "l monotone, r resets every query",
            "mo sqrt blocks": f"b = {b_folk}: r sweeps once per block",
            "mo snake": "alternate r direction: the free 2x on r returns",
            "mo hilbert": "the t3 refinement: one curve, no blocks",
            "mo tuned block": f"b = n/sqrt(q) = {b_true}, snaked: the honest dial",
        }[name]
        print(f"  {name:<22} {meters[name]:>14,}   {note}")
    print(f"the dial, measured: b=10 -> {dial[10]:,} | b={b_folk} (folklore sqrt n) -> {dial[b_folk]:,} | b={b_true} (n/sqrt q) -> {dial[b_true]:,} | b=2000 -> {dial[2000]:,}")
    print(f"the lesson in the dial: sqrt(n) is calibrated for q ~ n; at q = {q} << n the balance point n/sqrt(q) = {b_true} cuts moves by {100 * (1 - dial[b_true]/dial[b_folk]):.0f}%")
    print("OK: six orderings through one window, every answer equal to the brute-force referee, the sqrt-block schedule inside its theory bound, snake and Hilbert refinements measured, and the block dial's U-shape with the folklore corrected")
