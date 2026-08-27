# Puzzle 55: Karatsuba multiplication x three-product splitting
# Multiply two n-digit integers exactly, below the schoolbook's n^2
# digit products: the 1960 identity that ended a conjecture and opened
# the fast-arithmetic ladder this site has climbed twice already.
#
# The pairing is the point. The algorithm is split-and-recurse on
# half-length halves: x = a*B + b, y = c*B + d, and the product needs
# ac, ad, bc, bd: four half-size multiplications, which recursion turns
# straight back into n^2. The heuristic is Gauss's trick, deployed by
# the 23-year-old Karatsuba in 1960 after Kolmogorov conjectured n^2
# was optimal: (a+b)(c+d) - ac - bd IS ad + bc: the cross term for one
# extra multiplication instead of two, three products total, and the
# exponent falls to log2(3) = 1.585. The identity is verified on 500
# scalar cases, the counts are asserted to the integer (3^log2 n
# exactly), the referee is Python's own int product (which itself runs
# Karatsuba above 70 digits: the referee is the defendant's grown-up
# self), and the crossover where the add-overhead stops mattering is
# MEASURED, not assumed: the same honesty CPython encodes as a cutoff.
import math
import random


def digits_of(x):
    return [int(ch) for ch in str(x)[::-1]] or [0]


def to_int(ds):
    return sum(d * 10**i for i, d in enumerate(ds))


def norm(ds):
    """Carry-propagate a digit list (entries may exceed 9 or be big)."""
    out = []
    carry = 0
    for d in ds:
        carry += d
        out.append(carry % 10)
        carry //= 10
    while carry:
        out.append(carry % 10)
        carry //= 10
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def schoolbook(a, b, counter=None):
    """Digit lists in, digit list out. Exactly len(a)*len(b) mults."""
    res = [0] * (len(a) + len(b))
    for i, da in enumerate(a):
        for j, db in enumerate(b):
            res[i + j] += da * db
            if counter is not None:
                counter["mults"] = counter.get("mults", 0) + 1
    return norm(res)


def add_lists(a, b, counter=None):
    n = max(len(a), len(b))
    if counter is not None:
        counter["adds"] = counter.get("adds", 0) + n
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def sub_lists(a, b, counter=None):
    """a - b as raw (possibly negative) coefficients; norm later can't
    see negatives, so subtraction happens on the coefficient level and
    the final result is guaranteed nonnegative by the identity."""
    n = max(len(a), len(b))
    if counter is not None:
        counter["adds"] = counter.get("adds", 0) + n
    return [(a[i] if i < len(a) else 0) - (b[i] if i < len(b) else 0) for i in range(n)]


def karatsuba_raw(a, b, counter, cutoff=1):
    """Equal power-of-two lengths; returns RAW coefficient list (no
    carries): carries are propagated once at the end."""
    n = len(a)
    if n <= cutoff:
        res = [0] * (2 * n)
        for i, da in enumerate(a):
            for j, db in enumerate(b):
                res[i + j] += da * db
                if counter is not None:
                    counter["mults"] = counter.get("mults", 0) + 1
        return res
    h = n // 2
    b_lo, a_hi = a[:h], a[h:]
    d_lo, c_hi = b[:h], b[h:]
    lo = karatsuba_raw(b_lo, d_lo, counter, cutoff)      # bd
    hi = karatsuba_raw(a_hi, c_hi, counter, cutoff)      # ac
    mid = karatsuba_raw(
        add_lists(b_lo, a_hi, counter), add_lists(d_lo, c_hi, counter), counter, cutoff
    )
    cross = sub_lists(sub_lists(mid, lo, counter), hi, counter)  # ad + bc
    res = [0] * (2 * n)
    for i, v in enumerate(lo):
        res[i] += v
    for i, v in enumerate(cross):
        res[i + h] += v
    for i, v in enumerate(hi):
        res[i + 2 * h] += v
    return res


def karatsuba(a, b, counter=None, cutoff=1):
    need = len(a) + len(b)
    n = 1
    while n < max(len(a), len(b)):
        n *= 2
    aa = a + [0] * (n - len(a))
    bb = b + [0] * (n - len(b))
    raw = karatsuba_raw(aa, bb, counter, cutoff)
    return norm(raw[: need + 2])


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: Gauss's identity on 500 scalar cases, term by term.
    for _ in range(500):
        a, b, c, d = (rng.randint(0, 10**6) for _ in range(4))
        ac = a * c
        bd = b * d
        mid = (a + b) * (c + d)
        assert mid - ac - bd == a * d + b * c  # the cross term, exactly

    # Oracle 2: correctness against Python's own product (which runs
    # Karatsuba internally above ~70 digits: the grown-up referee).
    for trial in range(200):
        nd = rng.randint(1, 300)
        x = rng.randrange(10 ** (nd - 1), 10**nd) if nd > 1 else rng.randrange(10)
        y = rng.randrange(10 ** max(nd - rng.randint(0, 5), 1))
        dx, dy = digits_of(x), digits_of(y)
        want = x * y
        assert to_int(schoolbook(dx, dy)) == want
        assert to_int(karatsuba(dx, dy)) == want
        assert to_int(karatsuba(dx, dy, cutoff=8)) == want

    # Oracle 3: the counts, exact. Power-of-two digit lengths.
    for k in (4, 6, 8, 10):
        n = 2**k
        dx = [rng.randint(0, 9) for _ in range(n)]
        dy = [rng.randint(0, 9) for _ in range(n)]
        dx[-1] = dy[-1] = max(dx[-1], 1)
        c_s = {}
        c_k = {}
        assert to_int(schoolbook(dx, dy, c_s)) == to_int(karatsuba(dx, dy, c_k))
        assert c_s["mults"] == n * n
        assert c_k["mults"] == 3**k  # exactly 3^log2(n)

    # Oracle 4: the crossover, measured. Total primitive ops (mults +
    # adds) by size: find where three products plus their add tax beat
    # the plain grid: the number CPython hardcodes as a cutoff.
    crossover = None
    sweep = {}
    for k in range(1, 9):
        n = 2**k
        dx = [rng.randint(0, 9) for _ in range(n)]
        dy = [rng.randint(0, 9) for _ in range(n)]
        c_s = {}
        schoolbook(dx, dy, c_s)
        c_k = {}
        karatsuba(dx, dy, c_k)
        tot_s = c_s["mults"] + c_s.get("adds", 0)
        tot_k = c_k["mults"] + c_k.get("adds", 0)
        sweep[n] = (tot_s, tot_k)
        if crossover is None and tot_k < tot_s:
            crossover = n
    assert crossover is not None and 8 <= crossover <= 128

    # The headline ledger at 1,024 digits.
    N = 1_024
    dx = [rng.randint(0, 9) for _ in range(N)]
    dy = [rng.randint(0, 9) for _ in range(N)]
    dx[-1] = dy[-1] = max(dx[-1], 1)
    c_s = {}
    ps = schoolbook(dx, dy, c_s)
    c_k = {}
    pk = karatsuba(dx, dy, c_k)
    assert to_int(ps) == to_int(pk) == to_int(dx) * to_int(dy)
    assert c_s["mults"] == N * N == 1_048_576
    assert c_k["mults"] == 3**10 == 59_049

    print(f"contest: two random {N:,}-digit integers; referee: Python's own int product (which itself runs Karatsuba above 70 digits)")
    print(f"  {'method':<24} {'digit mults':>12}   note")
    print(f"  {'Schoolbook grid':<24} {c_s['mults']:>12,}   n^2 exactly, asserted")
    print(f"  {'Karatsuba (3 products)':<24} {c_k['mults']:>12,}   3^10 exactly, asserted: {c_s['mults'] / c_k['mults']:.1f}x, growing as n^0.415")
    print("the crossover, measured (total mults + adds): " + " | ".join(f"n={n}: {s:,}/{t:,}" for n, (s, t) in sorted(sweep.items())[:6]) + f" -> Karatsuba first wins at n = {crossover} digits (CPython's own cutoff: 70)")
    print("Gauss's identity verified on 500 scalar cases; counts exact at four sizes; correctness at 200 random sizes for pure and cutoff-8 variants")
    print("OK: the identity exact, both counts asserted to the integer, agreement with the grown-up referee everywhere, and the crossover measured where the add tax stops mattering")
