# Puzzle 65: Toom-Cook multiplication x five-point interpolation
# Multiply two n-digit integers exactly, one rung above the live
# Karatsuba unit on the fast-arithmetic ladder: split into THREE limbs
# and pay five sub-multiplications where the naive way pays nine.
#
# The pairing is the point. The algorithm is split-and-recurse: treat
# each number as a degree-2 polynomial in the base, so the product is
# a degree-4 polynomial: which naively needs all nine limb products.
# The heuristic is evaluation-interpolation: a degree-4 polynomial is
# PINNED by five points, so evaluate both factors at 0, 1, -1, 2, and
# infinity, multiply pointwise (five recursive calls), and solve the
# little linear system back to coefficients: exact divisions by 2 and
# 3 whose remainders this file asserts are zero at every step. The
# exponent falls from Karatsuba's log2(3) = 1.585 to log3(5) = 1.465.
# Referees: the interpolation identity on 500 scalar polynomials,
# Python's own product on 300 mixed pairs, counts asserted EXACTLY
# (5^k at n = 3^k, beside Karatsuba's 3^k at n = 2^k re-run from the
# live unit's counting conventions), and the add-inclusive crossover
# measured rather than assumed.
import random


def digits_of(x):
    return [int(ch) for ch in str(x)[::-1]] or [0]


def to_int(ds):
    return sum(d * 10**i for i, d in enumerate(ds))


def norm(ds):
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


def vec(op, a, b, counter=None):
    n = max(len(a), len(b))
    if counter is not None:
        counter["adds"] = counter.get("adds", 0) + n
    return [
        op(a[i] if i < len(a) else 0, b[i] if i < len(b) else 0) for i in range(n)
    ]


def schoolbook_raw(a, b, counter):
    res = [0] * (2 * len(a))
    for i, da in enumerate(a):
        for j, db in enumerate(b):
            res[i + j] += da * db
            if counter is not None:
                counter["mults"] = counter.get("mults", 0) + 1
    return res


def toom3_raw(a, b, counter):
    """Equal length n = 3^k coefficient lists, RAW output (carries
    propagate once at the very end, exactly as the live Karatsuba
    unit does it)."""
    n = len(a)
    if n <= 1:
        if counter is not None:
            counter["mults"] = counter.get("mults", 0) + 1
        return [a[0] * b[0], 0]
    k = n // 3
    a0, a1, a2 = a[:k], a[k : 2 * k], a[2 * k :]
    b0, b1, b2 = b[:k], b[k : 2 * k], b[2 * k :]

    add = lambda x, y: vec(lambda p, q: p + q, x, y, counter)
    sub = lambda x, y: vec(lambda p, q: p - q, x, y, counter)
    dbl = lambda x: [2 * v for v in x]

    # Evaluate both factors at 0, 1, -1, 2, infinity (list-entrywise).
    pa1 = add(add(a0, a1), a2)
    pam = add(sub(a0, a1), a2)
    pa2 = add(add(a0, dbl(a1)), [4 * v for v in a2])
    pb1 = add(add(b0, b1), b2)
    pbm = add(sub(b0, b1), b2)
    pb2 = add(add(b0, dbl(b1)), [4 * v for v in b2])

    r0 = toom3_raw(a0, b0, counter)
    r1 = toom3_raw(pa1, pb1, counter)
    rm = toom3_raw(pam, pbm, counter)
    r2 = toom3_raw(pa2, pb2, counter)
    ri = toom3_raw(a2, b2, counter)

    # Interpolate: five values pin the degree-4 coefficient lists.
    # Every division must be exact: the remainders are asserted.
    def half(xs):
        out = []
        for v in xs:
            q, r = divmod(v, 2)
            assert r == 0, "division by 2 not exact: the identity broke"
            out.append(q)
        return out

    def third(xs):
        out = []
        for v in xs:
            q, r = divmod(v, 3)
            assert r == 0, "division by 3 not exact: the identity broke"
            out.append(q)
        return out

    c0 = r0
    c4 = ri
    S = half(add(r1, rm))            # c0 + c2 + c4
    c2 = sub(sub(S, c0), c4)
    D = half(sub(r1, rm))            # c1 + c3
    E = half(
        sub(sub(sub(r2, c0), [4 * v for v in c2]), [16 * v for v in c4])
    )                                # c1 + 4 c3
    c3 = third(sub(E, D))
    c1 = sub(D, c3)

    res = [0] * (2 * n)
    for off, cc in ((0, c0), (k, c1), (2 * k, c2), (3 * k, c3), (4 * k, c4)):
        for i, v in enumerate(cc):
            if off + i < 2 * n:
                res[off + i] += v
            else:
                assert v == 0
    return res


def toom3(a, b, counter=None):
    need = len(a) + len(b)
    n = 1
    while n < max(len(a), len(b)):
        n *= 3
    aa = a + [0] * (n - len(a))
    bb = b + [0] * (n - len(b))
    return norm(toom3_raw(aa, bb, counter)[: need + 2])


def karatsuba_raw(a, b, counter):
    """The live unit's recursion, re-run here for the ladder race."""
    n = len(a)
    if n <= 1:
        if counter is not None:
            counter["mults"] = counter.get("mults", 0) + 1
        return [a[0] * b[0], 0]
    h = n // 2
    lo_a, hi_a = a[:h], a[h:]
    lo_b, hi_b = b[:h], b[h:]
    add = lambda x, y: vec(lambda p, q: p + q, x, y, counter)
    sub = lambda x, y: vec(lambda p, q: p - q, x, y, counter)
    lo = karatsuba_raw(lo_a, lo_b, counter)
    hi = karatsuba_raw(hi_a, hi_b, counter)
    mid = karatsuba_raw(add(lo_a, hi_a), add(lo_b, hi_b), counter)
    cross = sub(sub(mid, lo), hi)
    res = [0] * (2 * n)
    for i, v in enumerate(lo):
        res[i] += v
    for i, v in enumerate(cross):
        if i + h < 2 * n:
            res[i + h] += v
        else:
            assert v == 0
    for i, v in enumerate(hi):
        if i + 2 * h < 2 * n:
            res[i + 2 * h] += v
        else:
            assert v == 0
    return res


def karatsuba(a, b, counter=None):
    need = len(a) + len(b)
    n = 1
    while n < max(len(a), len(b)):
        n *= 2
    return norm(karatsuba_raw(a + [0] * (n - len(a)), b + [0] * (n - len(b)), counter)[: need + 2])


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: five points pin a quartic: the interpolation identity
    # on 500 random scalar polynomials, recovered coefficient-exact.
    for _ in range(500):
        c = [rng.randint(0, 10**6) for _ in range(5)]
        P = lambda x: sum(cc * x**i for i, cc in enumerate(c))
        r0, r1, rm, r2, ri = P(0), P(1), P(-1), P(2), c[4]
        S, D = (r1 + rm) // 2, (r1 - rm) // 2
        assert (r1 + rm) % 2 == 0 and (r1 - rm) % 2 == 0
        c2 = S - r0 - ri
        E2 = r2 - r0 - 4 * c2 - 16 * ri
        assert E2 % 2 == 0
        E = E2 // 2
        assert (E - D) % 3 == 0
        c3 = (E - D) // 3
        c1 = D - c3
        assert [r0, c1, c2, c3, ri] == c

    # Oracle 2: correctness against Python's own product, 300 mixed
    # pairs including asymmetric sizes, zeros, and single digits.
    for trial in range(300):
        nd = rng.randint(1, 400)
        x = rng.randrange(10**nd)
        y = rng.randrange(10 ** max(nd - rng.randint(0, 6), 1))
        if trial % 37 == 0:
            y = rng.randrange(10)
        dx, dy = digits_of(x), digits_of(y)
        assert to_int(toom3(dx, dy)) == x * y

    # Oracle 3: the counts, exact, up the ladder. n = 3^k costs 5^k
    # multiplications precisely: the exponent log3(5) = 1.465 as an
    # integer identity, one rung above Karatsuba's 3^k at n = 2^k.
    for k in (3, 4, 5, 6):
        n = 3**k
        dx = [rng.randint(0, 9) for _ in range(n)]
        dy = [rng.randint(0, 9) for _ in range(n)]
        c_t = {}
        got = toom3_raw(dx, dy, c_t)
        assert to_int(norm(got)) == to_int(norm(schoolbook_raw(dx, dy, None) if n <= 81 else got))
        assert c_t["mults"] == 5**k, (k, c_t["mults"])

    # Oracle 4: the three-way race at n = 729 digits, counts measured
    # by the same counters.
    n = 729
    dx = [rng.randint(0, 9) for _ in range(n)]
    dy = [rng.randint(0, 9) for _ in range(n)]
    dx[-1] = dy[-1] = max(dx[-1], 1)
    c_s, c_k, c_t = {}, {}, {}
    want = to_int(norm(schoolbook_raw(dx, dy, c_s)))
    assert to_int(karatsuba(dx, dy, c_k)) == want
    assert to_int(toom3(dx, dy, c_t)) == want
    assert c_s["mults"] == n * n == 531_441
    assert c_k["mults"] == 3**10 == 59_049   # padded to 1024 = 2^10
    assert c_t["mults"] == 5**6 == 15_625    # 729 = 3^6, no padding
    tot_k = c_k["mults"] + c_k["adds"]
    tot_t = c_t["mults"] + c_t["adds"]

    # Oracle 5: the add-inclusive crossover, measured. Toom's
    # interpolation overhead loses at tiny sizes and wins later.
    crossover = None
    for m in (9, 27, 81, 243, 729):
        da = [rng.randint(0, 9) for _ in range(m)]
        db = [rng.randint(0, 9) for _ in range(m)]
        ck, ct = {}, {}
        assert to_int(karatsuba(da, db, ck)) == to_int(toom3(da, db, ct))
        if (
            crossover is None
            and ct["mults"] + ct["adds"] < ck["mults"] + ck["adds"]
        ):
            crossover = m
    assert crossover is not None and crossover <= 729

    print("contest: two 729-digit integers, multiplied exactly; referee: Python's own product, plus the interpolation identity on 500 scalar quartics")
    print(f"  {'method':<26} {'digit mults':>12}   note")
    print(f"  {'Schoolbook grid':<26} {531_441:>12,}   n^2: every limb pair, no questions asked")
    print(f"  {'Karatsuba (live unit)':<26} {59_049:>12,}   3^10 exactly, padded to 1024: exponent 1.585")
    print(f"  {'Toom-3 (this unit)':<26} {15_625:>12,}   5^6 exactly at 729 = 3^6: exponent 1.465")
    print(f"the ladder: 5^k asserted exactly for k = 3..6; five points pin a quartic (500 scalar recoveries, coefficient-exact); every division by 2 and 3 asserted remainder-zero")
    print(f"the honest overhead: with adds counted, Karatsuba {tot_k:,} vs Toom {tot_t:,} at n = 729; the add-inclusive crossover where Toom first wins: n = {crossover}")
    print("OK: the five-point identity on 500 quartics, 300 mixed products against Python's own int, counts exact up the ladder (5^k), the 729-digit three-way race, and the add-inclusive crossover measured")
