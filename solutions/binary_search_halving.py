# Puzzle 22: Binary search x halving invariant
# Find a target's position in a sorted array, in logarithmic time, and
# survive the edges that have trapped professionals since 1946.
#
# The pairing is the point. The control structure is the bracket: maintain
# a half-open interval [lo, hi) that provably contains the answer, and
# shrink it with probes until it closes. The heuristic is WHERE to probe.
# The midpoint is the minimax choice: whatever the comparison answers, the
# bracket halves, so ceil(log2 n) + 1 probes suffice on ANY input, asserted
# below as a maximum over ten thousand lookups, not an average. Probe by
# value proportion instead (interpolation) and uniform keys collapse in
# log log n probes while skewed keys degrade; probe by doubling from a
# cursor (exponential search) and nearby targets cost log of the distance,
# not log of the array. Same invariant, three probe policies: the entire
# family in one loop.
import bisect
import random


def binary_lower_bound(a, t, counter=None):
    """First index at which t could be inserted keeping order (bisect_left).
    The invariant: the answer always lies in [lo, hi]."""
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if counter is not None:
            counter["probes"] = counter.get("probes", 0) + 1
        if a[mid] < t:
            lo = mid + 1
        else:
            hi = mid
    return lo


def interpolation_lower_bound(a, t, counter=None):
    """Probe where the value SHOULD be if keys were spread evenly. On
    uniform keys the bracket collapses in about log log n probes; on skewed
    keys the estimate misleads and the probe creeps."""
    lo, hi = 0, len(a)
    while lo < hi:
        if counter is not None:
            counter["probes"] = counter.get("probes", 0) + 1
        span = a[hi - 1] - a[lo] if hi - 1 > lo else 0
        if span <= 0:
            # Flat stretch: fall back to a midpoint probe.
            mid = (lo + hi) // 2
        elif t <= a[lo]:
            mid = lo
        elif t > a[hi - 1]:
            return hi
        else:
            mid = lo + (t - a[lo]) * (hi - 1 - lo) // span
            mid = max(lo, min(mid, hi - 1))
        if a[mid] < t:
            lo = mid + 1
        else:
            hi = mid
    return lo


def exponential_lower_bound(a, t, hint=0, counter=None):
    """Gallop from a cursor: double the step until the bracket overshoots,
    then binary-search inside it. Cost is logarithmic in the DISTANCE from
    the hint, which is the whole point for merge joins and nearby lookups."""
    n = len(a)
    c = counter if counter is not None else {}
    if hint < n and a[hint] < t:
        step = 1
        lo = hint
        while hint + step < n and a[hint + step] < t:
            c["probes"] = c.get("probes", 0) + 1
            lo = hint + step
            step *= 2
        c["probes"] = c.get("probes", 0) + 1
        hi = min(hint + step, n)
        lo += 1
    else:
        step = 1
        hi = hint
        while hint - step >= 0 and a[hint - step] >= t:
            c["probes"] = c.get("probes", 0) + 1
            hi = hint - step
            step *= 2
        c["probes"] = c.get("probes", 0) + 1
        lo = max(hint - step, 0)
    while lo < hi:
        mid = (lo + hi) // 2
        c["probes"] = c.get("probes", 0) + 1
        if a[mid] < t:
            lo = mid + 1
        else:
            hi = mid
    if counter is not None:
        counter.update(c)
    return lo


def linear_lower_bound(a, t, hint=0, counter=None):
    """Scan forward (or back) from the cursor. On truly nearby targets it
    is competitive; anywhere else it is the n/2 baseline."""
    i = hint
    if i < len(a) and a[i] < t:
        while i < len(a) and a[i] < t:
            if counter is not None:
                counter["probes"] = counter.get("probes", 0) + 1
            i += 1
        return i
    while i > 0 and a[i - 1] >= t:
        if counter is not None:
            counter["probes"] = counter.get("probes", 0) + 1
        i -= 1
    return i


def broken_binary_search(a, t, cap=200):
    """The museum piece: inclusive hi with lo = mid (no +1). On a two
    element array it spins forever; the cap converts eternity into
    evidence. This is the exact shape of the bug that survived from 1946
    to 1962 in print, and in Java's standard library until 2006."""
    lo, hi = 0, len(a) - 1
    steps = 0
    while lo < hi:
        steps += 1
        if steps > cap:
            return None, steps  # looping: caught by the cap
        mid = (lo + hi) // 2
        if a[mid] < t:
            lo = mid  # the missing +1
        else:
            hi = mid
    return lo, steps


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: agreement with CPython's bisect on 100,000 cases spanning
    # duplicates, absent keys, empty arrays, and boundary targets.
    for trial in range(2000):
        n = rng.randint(0, 60)
        a = sorted(rng.randint(0, 30) for _ in range(n))
        for _ in range(50):
            t = rng.randint(-2, 32)
            want = bisect.bisect_left(a, t)
            assert binary_lower_bound(a, t) == want, (a, t)
            assert interpolation_lower_bound(a, t) == want, (a, t)
            hint = rng.randint(0, max(n - 1, 0)) if n else 0
            assert exponential_lower_bound(a, t, hint) == want, (a, t, hint)
            assert linear_lower_bound(a, t, hint) == want, (a, t, hint)

    # Oracle 2: the museum piece really does loop. On [1, 3] searching for
    # 3, the missing +1 pins lo at 0 forever; the cap catches it.
    result, steps = broken_binary_search([1, 3], 3)
    assert result is None and steps > 200, "the classic bug must spin"
    # ...and the correct version handles the same instance in two probes.
    c = {}
    assert binary_lower_bound([1, 3], 3, c) == 1 and c["probes"] <= 2

    # The three arenas.
    N = 1_000_000
    uniform = sorted(rng.randrange(2**31) for _ in range(N))
    cubic = [i * i * i for i in range(N)]  # heavy skew: value != position
    LOOKUPS = 10_000

    def avg_probes(fn, a, targets, use_hint=None):
        total = 0
        maxp = 0
        for i, t in enumerate(targets):
            c = {}
            if use_hint is None:
                fn(a, t, c)
            else:
                fn(a, t, use_hint[i], c)
            total += c.get("probes", 0)
            maxp = max(maxp, c.get("probes", 0))
        return total / len(targets), maxp

    targets_u = [uniform[rng.randrange(N)] for _ in range(LOOKUPS)]
    targets_c = [cubic[rng.randrange(N)] for _ in range(LOOKUPS)]
    # Near-the-cursor workload: each lookup lands a small hop from the last.
    positions = []
    p = N // 2
    for _ in range(LOOKUPS):
        p = (p + rng.randint(1, 50)) % N
        positions.append(p)
    targets_n = [uniform[p] for p in positions]
    hints = [positions[0]] + positions[:-1]

    bin_u, bin_u_max = avg_probes(binary_lower_bound, uniform, targets_u)
    bin_c, _ = avg_probes(binary_lower_bound, cubic, targets_c)
    bin_n, _ = avg_probes(binary_lower_bound, uniform, targets_n)
    itp_u, _ = avg_probes(interpolation_lower_bound, uniform, targets_u)
    itp_c, _ = avg_probes(interpolation_lower_bound, cubic, targets_c)
    itp_n, _ = avg_probes(interpolation_lower_bound, uniform, targets_n)
    gal_u, _ = avg_probes(exponential_lower_bound, uniform, targets_u, [0] * LOOKUPS)
    gal_c, _ = avg_probes(exponential_lower_bound, cubic, targets_c, [0] * LOOKUPS)
    gal_n, gal_n_max = avg_probes(exponential_lower_bound, uniform, targets_n, hints)
    lin_n, _ = avg_probes(linear_lower_bound, uniform, targets_n, hints)

    # Oracle 3: the minimax guarantee, as a MAXIMUM. Every one of 10,000
    # binary lookups stays within ceil(log2 n) + 1 probes.
    import math
    assert bin_u_max <= math.ceil(math.log2(N)) + 1, bin_u_max

    # Oracle 4: interpolation's two faces. Uniform keys: log log n territory,
    # at least 3x under binary. Cubic skew: at least 2x OVER binary.
    assert itp_u * 3 < bin_u, (itp_u, bin_u)
    assert itp_c > 2 * bin_c, (itp_c, bin_c)

    # Oracle 5: galloping is logarithmic in the hop, not the array: nearby
    # targets cost under 2*log2(50) + 6 probes on average.
    assert gal_n < 2 * math.log2(50) + 6, gal_n
    assert gal_n < bin_n, "near the cursor, doubling must beat midpoints"

    # A small-array measurement to price the linear baseline honestly.
    small = uniform[:10_000]
    lin_small, _ = avg_probes(linear_lower_bound, small, [small[rng.randrange(10_000)] for _ in range(200)], [0] * 200)

    print(f"contest: n = {N:,} sorted keys, {LOOKUPS:,} lookups per cell, average probes:")
    print(f"  {'probe policy':<28} {'uniform keys':>13} {'cubic skew':>11} {'near cursor':>12}")
    print(f"  {'Binary x midpoint':<28} {bin_u:>13.1f} {bin_c:>11.1f} {bin_n:>12.1f}")
    print(f"  {'Interpolation x estimate':<28} {itp_u:>13.1f} {itp_c:>11.1f} {itp_n:>12.1f}")
    print(f"  {'Exponential x doubling':<28} {gal_u:>13.1f} {gal_c:>11.1f} {gal_n:>12.1f}")
    print(f"  {'Linear scan from cursor':<28} {'~n/2':>13} {'~n/2':>11} {lin_n:>12.1f}")
    print(f"  (linear priced at n=10,000: {lin_small:,.0f} average probes; at n = 10^6 it is ~500,000)")
    print(f"the museum piece: lo = mid without +1 spins forever on [1,3] seeking 3 (capped at 200 iterations)")
    print("OK: 100,000-case bisect agreement, the minimax bound as a maximum, interpolation's two faces, the gallop bound, and the 1946 bug pinned")
