# Puzzle 107: LSD radix sort x stable digit-bucket passes
# Sorting without comparisons. The comparison lower bound (log2 of
# n factorial) binds every sort that learns order by asking
# "is a < b?": LSD radix never asks. It reads keys digit by digit,
# least significant first: each pass distributes all n keys into
# base-many buckets by ONE digit and gathers them back in bucket
# order. The magic is the heuristic: every pass must be STABLE
# (equal digits keep their arrival order), because stability is
# what lets pass k inherit and preserve the work of passes
# 1..k-1. After the last pass the keys are sorted, and no key was
# ever compared to another.
#
# The pairing is the point. The algorithm is LSD radix sort
# (older than computers: Hollerith's punched-card tabulators
# sorted the 1890 census one column at a time; formalized for
# machines in Seward's 1954 counting-sort work). The heuristic is
# the stable digit-bucket pass: the invariant that makes the
# passes COMPOSE. This file removes the stability on purpose and
# measures the wreck: the same code with unstable passes sorts
# almost nothing correctly.
#
# Referees:
# (1) sorted() exact on 400 randomized cases (mixed widths,
#     duplicates, sorted, reversed) plus every contest instance;
# (2) STABILITY exact: tagged records with duplicate keys emerge
#     in sorted()'s stable order, asserted id-by-id;
# (3) the stability-dependence theorem, measured: unstable inner
#     passes break the sort on a counted fraction of arrays (the
#     neverUse: not slower, WRONG);
# (4) the asymptotic split, measured: doubling n doubles radix
#     work (ratio ~2.0) while the comparison referee's count
#     grows by ~2.1x (n log n): linear vs linearithmic, observed;
# (5) the digit-width dial, measured both ways: wider digits win
#     at large n (fewer passes) and LOSE at small n (histogram
#     cost dominates): the dial has a regime, with numbers.
import math
import random

SEED = 20260829


class Key:
    """Wraps an int so the comparison referee's comparisons are counted."""
    __slots__ = ('v',)
    COUNT = [0]

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Key.COUNT[0] += 1
        return self.v < other.v


def lsd_radix(arr, width_bits, digit_bits, touch, stable=True):
    """Sort non-negative ints < 2^width_bits. Currency: element
    touches (each pass reads each key's digit once and places it
    once = 2n) plus histogram slots visited (base per pass)."""
    base = 1 << digit_bits
    mask = base - 1
    passes = (width_bits + digit_bits - 1) // digit_bits
    a = list(arr)
    for p in range(passes):
        shift = p * digit_bits
        buckets = [[] for _ in range(base)]
        for x in a:
            touch[0] += 2
            buckets[(x >> shift) & mask].append(x)
        if not stable:
            for b in buckets:
                b.reverse()  # sabotage: equal digits lose arrival order
        out = []
        for b in buckets:
            touch[0] += 1  # one histogram/bucket slot visited
            out.extend(b)
        a = out
    return a


def lsd_radix_records(recs, key_of, width_bits, digit_bits):
    """The same passes over (key, payload) records, for stability."""
    base = 1 << digit_bits
    mask = base - 1
    passes = (width_bits + digit_bits - 1) // digit_bits
    a = list(recs)
    for p in range(passes):
        shift = p * digit_bits
        buckets = [[] for _ in range(base)]
        for r in a:
            buckets[(key_of(r) >> shift) & mask].append(r)
        a = [r for b in buckets for r in b]
    return a


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: sorted() exact on 400 randomized cases.
    for trial in range(400):
        n = rng.randrange(0, 300)
        w = rng.choice([8, 16, 32])
        arr = [rng.randrange(1 << w) for _ in range(n)]
        if trial % 4 == 1:
            arr.sort()
        elif trial % 4 == 2:
            arr.sort(reverse=True)
        elif trial % 4 == 3 and n:
            arr = [arr[0]] * n  # all duplicates
        got = lsd_radix(arr, w, 8, [0])
        assert got == sorted(arr), (trial, w)

    # Oracle 2: stability, exactly. 30,000 tagged records, keys
    # drawn from only 500 values so duplicates abound.
    recs = [(rng.randrange(500), i) for i in range(30_000)]
    got = lsd_radix_records(recs, lambda r: r[0], 16, 8)
    ref = sorted(recs, key=lambda r: r[0])  # sorted() is stable
    assert got == ref, 'stable passes must reproduce stable sort exactly'

    # Oracle 3: the stability-dependence theorem. Same code,
    # unstable passes: count how many of 200 multi-digit arrays
    # still come out sorted.
    broken = 0
    for _ in range(200):
        arr = [rng.randrange(1 << 16) for _ in range(200)]
        got = lsd_radix(arr, 16, 8, [0], stable=False)
        if got != sorted(arr):
            broken += 1
    assert broken > 150, broken  # the sort collapses without the invariant

    # The contest: 200,000 keys; the referee sorts the same array
    # with counted comparisons.
    N = 200_000
    arr32 = [rng.randrange(1 << 32) for _ in range(N)]
    arr8 = [rng.randrange(1 << 8) for _ in range(N)]

    def referee_comparisons(arr):
        Key.COUNT[0] = 0
        out = sorted(Key(v) for v in arr)
        assert all(out[i].v <= out[i + 1].v for i in range(len(out) - 1))
        return Key.COUNT[0]

    t32 = [0]
    got32 = lsd_radix(arr32, 32, 8, t32)
    assert got32 == sorted(arr32)
    cmp32 = referee_comparisons(arr32)

    t8 = [0]
    got8 = lsd_radix(arr8, 8, 8, t8)
    assert got8 == sorted(arr8)
    cmp8 = referee_comparisons(arr8)

    # the honest row: wide keys, tiny n: passes cost regardless of n.
    n_small = 1_000
    arr_wide = [rng.randrange(1 << 64) for _ in range(n_small)]
    tw = [0]
    got_w = lsd_radix(arr_wide, 64, 8, tw)
    assert got_w == sorted(arr_wide)
    cmp_w = referee_comparisons(arr_wide)
    assert tw[0] > cmp_w, (tw[0], cmp_w)  # comparison sort WINS here

    # Oracle 4: the asymptotic split. Double n, remeasure.
    arr32b = [rng.randrange(1 << 32) for _ in range(2 * N)]
    t32b = [0]
    assert lsd_radix(arr32b, 32, 8, t32b) == sorted(arr32b)
    cmp32b = referee_comparisons(arr32b)
    radix_ratio = t32b[0] / t32[0]
    cmp_ratio = cmp32b / cmp32
    assert 1.9 < radix_ratio < 2.1, radix_ratio       # linear
    assert cmp_ratio > radix_ratio + 0.05, (cmp_ratio, radix_ratio)  # linearithmic pulls ahead

    # Oracle 5: the digit-width dial, both directions.
    dial_big = {}
    for db in (4, 8, 16):
        t = [0]
        assert lsd_radix(arr32, 32, db, t) == got32
        dial_big[db] = t[0]
    assert dial_big[16] < dial_big[8] < dial_big[4], dial_big  # big n: wider wins
    arr_tiny = [rng.randrange(1 << 32) for _ in range(2_000)]
    dial_small = {}
    for db in (8, 16):
        t = [0]
        assert lsd_radix(arr_tiny, 32, db, t) == sorted(arr_tiny)
        dial_small[db] = t[0]
    assert dial_small[16] > dial_small[8], dial_small  # small n: histograms dominate

    log_fact = sum(math.log2(k) for k in range(2, N + 1))

    print('contest: sorting 200,000 keys; currencies stated per method: comparisons for the comparison referee, element touches + bucket slots for radix')
    print(f"  {'instance':<30} {'sorted() cmps':>13} {'radix work':>11}")
    print(f"  {'32-bit keys, n = 200,000':<30} {cmp32:>13,} {t32[0]:>11,}   four stable passes beat the comparison bill {cmp32 / t32[0]:.1f}x")
    print(f"  {'8-bit keys, n = 200,000':<30} {cmp8:>13,} {t8[0]:>11,}   one pass: {cmp8 / t8[0]:.1f}x: narrow keys are radix country")
    print(f"  {'64-bit keys, n = 1,000':<30} {cmp_w:>13,} {tw[0]:>11,}   the honest row: 8 passes regardless of n: comparisons win {tw[0] / cmp_w:.1f}x")
    print(f"the lower bound it never meets: log2(n!) = {log_fact:,.0f} comparisons bind ANY comparison sort at n = 200,000; radix asked zero questions of the form a < b")
    print(f"the asymptotic split, measured: doubling n scaled radix work {radix_ratio:.2f}x (linear) and referee comparisons {cmp_ratio:.2f}x (n log n)")
    print(f"the dial, measured both ways: at n = 200,000 digit width 16 > 8 > 4 ({dial_big[16]:,} < {dial_big[8]:,} < {dial_big[4]:,} work); at n = 2,000 width 16 LOSES to 8 ({dial_small[16]:,} vs {dial_small[8]:,}): histograms dominate small arrays")
    print(f"the invariant, sabotaged: unstable inner passes broke {broken} of 200 arrays: stability is what lets pass k preserve passes 1..k-1")
    print(f'OK: radix == sorted() on 400 cases and all instances with stability exact on 30,000 tagged records; '
          f'the 32-bit contest at {cmp32 / t32[0]:.1f}x and the wide-key honest row conceded at {tw[0] / cmp_w:.1f}x against; '
          f'linear-vs-linearithmic measured ({radix_ratio:.2f}x vs {cmp_ratio:.2f}x on doubling); the dial measured in both regimes; '
          f'and unstable passes wrong on {broken} of 200: the heuristic is load-bearing')
