# Puzzle 180: Gray code generation x Reflected binary
# Subset enumeration: list every subset of n items (every n-bit string)
# so that consecutive entries differ in exactly one element, and do it in
# constant work per step. The algorithm is Gray code generation: an
# ordering of all 2^n binary strings in which neighbors differ in one bit,
# so a walk through it changes one thing at a time (a Hamiltonian path on
# the n-dimensional cube, and in this case a cycle). The heuristic is the
# reflected construction (Frank Gray, patent filed 1947, granted 1953):
# the n-bit list is the (n - 1)-bit list with a leading 0, followed by the
# same list reversed with a leading 1. Reflection makes the seam a single
# bit flip, and the recursion collapses to a closed form, g(i) = i XOR
# (i >> 1), with the bit that flips at step i being the number of trailing
# zeros of i, the ruler sequence.
#
# Referees:
# (1) THE CONSTRUCTION AGAINST THE CLOSED FORM: the reflected list equals
#     g(i) = i XOR (i >> 1) for all 2^n codes at every n from 1 to 16
#     (131,070 codes checked), and the inverse (a prefix XOR) recovers i
#     for every code;
# (2) THE GRAY PROPERTY: every consecutive pair differs in exactly one
#     bit, the closing pair too (a Hamiltonian cycle of the n-cube), and
#     all 2^n codes are distinct; the flipped bit at step i equals the
#     trailing-zero count of i, checked for every step;
# (3) THE ENCODER, measured: an absolute rotary encoder read during a
#     transition with misaligned sensors can return any mixture of old
#     and new bits; over all 256 transitions of an 8-bit encoder, the
#     worst reading error in natural binary against Gray, where every
#     reading is one of the two positions the shaft is between;
# (4) SUBSET SUMS, counted: all 2^20 subsets of 20 numbers enumerated in
#     Gray order with an incremental sum (one add or subtract per step)
#     against binary counting with incremental updates (bit flips per
#     step) and against recomputing each sum from scratch; every
#     incremental sum checked against the direct sum;
# (5) THE RIVALS: binary counting (average bits flipped per step
#     2 - 2^(1 - n)), lexicographic listing by size (elements changed per
#     step), and Steinhaus-Johnson-Trotter for permutations, the same idea
#     of one adjacent change per step, checked on all 720 permutations of
#     six items; and the negative example, measured: the natural binary
#     encoder.
#
# AUTHOR CORRECTION: the draft expected binary counting to flip about
# log2(n) bits per step on average. Measured, the mean over the 2^n - 1
# increments is (2^(n + 1) - n - 2) / (2^n - 1), under two for every n
# (1.733 at n = 4, 1.99998 at n = 20), because carries are rare; the
# draft's intuition confused the worst case (n bits at the half-way
# rollover) with the average. A second correction: the draft wrote the
# binary encoder's worst misread as 255 positions; the reading can be
# any value, but the distance from a reading to the two positions the
# shaft is between is at most 127, half the dial, and that is the number
# the page reports.
import random
import time

SEED = 20261010


def reflected(n):
    """The recursive mirror construction, as lists of bit strings."""
    if n == 0:
        return ['']
    prev = reflected(n - 1)
    return ['0' + s for s in prev] + ['1' + s for s in reversed(prev)]


def gray(i):
    return i ^ (i >> 1)


def gray_inverse(g):
    # prefix XOR: bit k of i is the parity of bits k and above of g
    i = g
    mask = g >> 1
    while mask:
        i ^= mask
        mask >>= 1
    return i


def trailing_zeros(i):
    t = 0
    while i & 1 == 0:
        i >>= 1
        t += 1
    return t


def popcount(x):
    return bin(x).count('1')


# ------------------------------------------------------------- encoder

def transition_readings(a, b, n):
    """All values a misaligned sensor bank can return while the code
    changes from a to b: each differing bit independently old or new."""
    diff = a ^ b
    bits = [k for k in range(n) if diff >> k & 1]
    readings = []
    for mask in range(1 << len(bits)):
        v = a
        for j, k in enumerate(bits):
            if mask >> j & 1:
                v ^= 1 << k
        readings.append(v)
    return readings


def encoder_worst_error(n, encode, decode):
    """Over every transition i -> i + 1 (mod 2^n), the worst distance from
    a possible reading to the two positions the shaft is between, and the
    mean of the per-transition worst distances."""
    size = 1 << n
    worst = 0
    total = 0
    for i in range(size):
        j = (i + 1) % size
        a, b = encode(i), encode(j)
        err = 0
        for r in transition_readings(a, b, n):
            pos = decode(r)
            d = min(abs(pos - i), abs(pos - j))
            err = max(err, d)
        worst = max(worst, err)
        total += err
    return worst, total / size


# ---------------------------------------------------------- enumeration

def subset_sums_gray(values):
    """Enumerate all subsets in Gray order with an incremental sum.
    Returns the sums in Gray order and the count of element operations."""
    n = len(values)
    total = 0
    sums = [0]
    ops = 0
    for i in range(1, 1 << n):
        k = trailing_zeros(i)
        if gray(i) >> k & 1:
            total += values[k]
        else:
            total -= values[k]
        ops += 1
        sums.append(total)
    return sums, ops


def subset_sums_binary_incremental(values):
    """Binary counting with incremental updates: every bit that flips
    costs one add or subtract."""
    n = len(values)
    total = 0
    sums = [0]
    ops = 0
    prev = 0
    for i in range(1, 1 << n):
        diff = prev ^ i
        k = 0
        while diff:
            if diff & 1:
                if i >> k & 1:
                    total += values[k]
                else:
                    total -= values[k]
                ops += 1
            diff >>= 1
            k += 1
        prev = i
        sums.append(total)
    return sums, ops


def subset_sums_recompute(values):
    n = len(values)
    sums = []
    ops = 0
    for mask in range(1 << n):
        s = 0
        for k in range(n):
            ops += 1
            if mask >> k & 1:
                s += values[k]
        sums.append(s)
    return sums, ops


def lexicographic_by_size(n):
    """Subsets listed by size, lexicographically within a size, as bit
    masks: the order a textbook table of combinations uses."""
    out = []
    from itertools import combinations
    for k in range(n + 1):
        for comb in combinations(range(n), k):
            m = 0
            for e in comb:
                m |= 1 << e
            out.append(m)
    return out


def steinhaus_johnson_trotter(n):
    """Permutations by adjacent transpositions (even's speedup)."""
    perm = list(range(1, n + 1))
    direction = [-1] * n  # -1 left, +1 right
    out = [perm[:]]
    while True:
        mobile = -1
        for i in range(n):
            j = i + direction[i]
            if 0 <= j < n and perm[i] > perm[j] and (mobile < 0 or perm[i] > perm[mobile]):
                mobile = i
        if mobile < 0:
            break
        j = mobile + direction[mobile]
        perm[mobile], perm[j] = perm[j], perm[mobile]
        direction[mobile], direction[j] = direction[j], direction[mobile]
        for i in range(n):
            if perm[i] > perm[j]:
                direction[i] = -direction[i]
        out.append(perm[:])
    return out


def main():
    rng = random.Random(SEED)

    # Oracle 1 and 2: construction against closed form, inverse, Gray
    # property, cycle, distinctness, ruler sequence, for n = 1..16.
    codes_checked = 0
    for n in range(1, 17):
        lst = reflected(n)
        size = 1 << n
        assert len(lst) == size
        seen = set()
        for i, s in enumerate(lst):
            g = int(s, 2)
            assert g == gray(i), (n, i, s)
            assert gray_inverse(g) == i
            seen.add(g)
            if i > 0:
                diff = g ^ gray(i - 1)
                assert popcount(diff) == 1, (n, i)
                assert diff == 1 << trailing_zeros(i), (n, i, diff)
        assert len(seen) == size and max(seen) == size - 1
        assert popcount(gray(size - 1) ^ gray(0)) == 1, 'the cycle does not close'
        codes_checked += size
    assert codes_checked == 131070

    # Oracle 3: the encoder, n = 8.
    n_enc = 8
    bin_worst, bin_mean = encoder_worst_error(n_enc, lambda i: i, lambda v: v)
    gray_worst, gray_mean = encoder_worst_error(n_enc, gray, gray_inverse)
    # the error is the distance from the reading to the two positions the
    # shaft is actually between, so a Gray reading is always exact (0) and a
    # binary reading can be anywhere on the dial
    assert gray_worst == 0 and gray_mean == 0.0, (gray_worst, gray_mean)
    assert bin_worst == (1 << (n_enc - 1)) - 1, bin_worst  # half the dial away: the rollover 127 to 128 can read as 0 or 255
    # the reading at the half-way rollover 127 -> 128 can be anything
    half = transition_readings(127, 128, n_enc)
    assert len(half) == 256 and min(half) == 0 and max(half) == 255

    # Oracle 4: subset sums over all 2^20 subsets of 20 numbers.
    n_sub = 20
    values = [rng.randint(1, 1000) for _ in range(n_sub)]
    t0 = time.perf_counter()
    gsums, gops = subset_sums_gray(values)
    t_gray = time.perf_counter() - t0
    t0 = time.perf_counter()
    bsums, bops = subset_sums_binary_incremental(values)
    t_bin = time.perf_counter() - t0
    t0 = time.perf_counter()
    rsums, rops = subset_sums_recompute(values)
    t_rec = time.perf_counter() - t0
    # the Gray-order sums, rearranged by subset mask, equal the direct sums
    for i in range(1 << n_sub):
        assert gsums[i] == rsums[gray(i)], i
    assert bsums == rsums
    assert gops == (1 << n_sub) - 1
    bin_flips_avg = bops / ((1 << n_sub) - 1)
    assert abs(bin_flips_avg - (2 ** (n_sub + 1) - n_sub - 2) / (2 ** n_sub - 1)) < 1e-9, bin_flips_avg
    assert rops == n_sub * (1 << n_sub)
    # a subset-sum search: the first subset hitting a target, in Gray order
    target = sum(values) // 3
    hit = next((i for i, s in enumerate(gsums) if s == target), None)

    # Oracle 5: the rivals.
    flips = {}
    for n in (4, 8, 12, 16):
        total = sum(popcount(i ^ (i - 1)) for i in range(1, 1 << n))
        flips[n] = (total / ((1 << n) - 1), max(popcount(i ^ (i - 1)) for i in range(1, 1 << n)))
        # exact mean over the 2^n - 1 increments without the wraparound:
        # (2^(n + 1) - n - 2) / (2^n - 1), which tends to 2 from below
        assert abs(flips[n][0] - (2 ** (n + 1) - n - 2) / (2 ** n - 1)) < 1e-9, (n, flips[n][0])
        assert flips[n][1] == n
    lex = lexicographic_by_size(12)
    assert sorted(lex) == list(range(1 << 12))
    lex_changes = [popcount(lex[i] ^ lex[i - 1]) for i in range(1, len(lex))]
    lex_avg = sum(lex_changes) / len(lex_changes)
    lex_max = max(lex_changes)
    assert lex_avg > 2 and lex_max >= 10, (lex_avg, lex_max)
    perms = steinhaus_johnson_trotter(6)
    assert len(perms) == 720 and len({tuple(p) for p in perms}) == 720
    for a, b in zip(perms, perms[1:]):
        diff = [k for k in range(6) if a[k] != b[k]]
        assert len(diff) == 2 and diff[1] == diff[0] + 1, (a, b)
    # lexicographic permutations change more positions
    from itertools import permutations
    lexperms = list(permutations(range(1, 7)))
    lex_perm_changes = [sum(1 for k in range(6) if a[k] != b[k]) for a, b in zip(lexperms, lexperms[1:])]
    lex_perm_avg = sum(lex_perm_changes) / len(lex_perm_changes)
    assert lex_perm_avg > 2.5

    print('contest: enumerate every subset of n items changing one element at a time; referees: the closed form g(i) = i XOR (i >> 1) and its inverse on all 131,070 codes for n = 1 to 16, the one-bit and Hamiltonian-cycle properties, the ruler sequence, every incremental subset sum against the direct sum')
    print(f'construction: the reflected list equals the closed form on {codes_checked:,} codes; every neighbor pair differs in one bit, the cycle closes, the flipped bit at step i is the trailing-zero count of i; the inverse recovers every index')
    print(f'the 8-bit encoder, 256 transitions with misaligned sensors: natural binary worst error {bin_worst} positions (mean of per-transition worst errors {bin_mean:.2f}), the half-way rollover 127 to 128 readable as any of {len(half)} values; Gray code worst error {gray_worst}: every reading is one of the two positions the shaft is between')
    print(f'{"subset order, n = 20":>34} {"element ops":>12} {"per step":>9} {"seconds":>8}')
    print(f'{"Gray order, incremental sum":>34} {gops:>12,} {gops / ((1 << n_sub) - 1):>9.3f} {t_gray:>8.2f}')
    print(f'{"binary counting, incremental":>34} {bops:>12,} {bin_flips_avg:>9.5f} {t_bin:>8.2f}')
    print(f'{"recompute each sum":>34} {rops:>12,} {n_sub:>9d} {t_rec:>8.2f}')
    print(f'  first subset in Gray order summing to {target:,}: index {hit if hit is not None else "none"}')
    print('binary counting bits flipped per step (mean, worst): ' + ', '.join(f'n = {n}: {m:.5f}, {w}' for n, (m, w) in flips.items()) + ' (exactly (2^(n + 1) - n - 2) / (2^n - 1), tending to 2)')
    print(f'lexicographic listing by size, n = 12: {lex_avg:.2f} elements changed per step on average, worst {lex_max}; Gray: exactly 1')
    print(f'Steinhaus-Johnson-Trotter: all 720 permutations of six items, each an adjacent swap of the last; lexicographic next-permutation changes {lex_perm_avg:.2f} positions per step on average')
    print(f'OK: reflected Gray codes equal i XOR (i >> 1) on {codes_checked:,} codes with one bit flipped per step and a closed cycle at every n to 16; the 8-bit encoder misreads by up to {bin_worst} positions in binary and never in Gray; '
          f'all 1,048,576 subset sums by one operation each against {bin_flips_avg:.5f} for binary counting and {n_sub} for recomputation; lexicographic listing changes {lex_avg:.2f} elements per step')


if __name__ == '__main__':
    main()
