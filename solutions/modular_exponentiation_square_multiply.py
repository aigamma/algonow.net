# Puzzle 88: Modular exponentiation x square-and-multiply
# Raising a to the e-th power mod m, where e has two thousand bits:
# the operation every handshake on the internet performs, made
# possible by reading the exponent in binary.
#
# The pairing is the point. The algorithm is modular
# exponentiation with reduction after every step, so numbers never
# outgrow 2m. The heuristic is square-and-multiply: scan the
# exponent's bits: square for every bit, multiply only on the 1s:
# floor(log2 e) + popcount(e) - 1 multiplications instead of e - 1.
# The count law is asserted EXACTLY against the exponent's bit
# structure, the naive ladder is actually run and counted at
# e ~ 10^6 (34,482x), and at 2048 bits the gap is not a speedup
# but the difference between 3,000 operations and a number of
# multiplications with 617 decimal digits. The referee is the
# strongest available: Python's built-in pow, matched on 3,000
# random triples up to 2048 bits, edge cases included. The dark
# side is measured too: square-and-multiply's operation count
# DEPENDS on the exponent's popcount: an eavesdropper counting
# operations reads the key's 1s: and the Montgomery ladder is
# shown paying identical counts for every same-length exponent:
# the leak, sealed, at the price of always multiplying. Clients:
# toy RSA round-tripping 50 messages through 512-bit primes, and
# 100 Diffie-Hellman handshakes agreeing on both sides.
import random


def sqm(a, e, m, counter=None):
    """Left-to-right square-and-multiply. Squares once per bit
    after the leading 1; multiplies once per 1-bit after it."""
    if m == 1:
        return 0
    if e == 0:
        return 1 % m
    result = a % m
    for bit in bin(e)[3:]:
        result = (result * result) % m
        if counter is not None:
            counter["sq"] = counter.get("sq", 0) + 1
        if bit == "1":
            result = (result * a) % m
            if counter is not None:
                counter["mul"] = counter.get("mul", 0) + 1
    return result


def ladder(a, e, m, counter=None):
    """Montgomery ladder: one square AND one multiply per bit,
    every bit, regardless of its value: the count leaks only the
    exponent's LENGTH."""
    if m == 1:
        return 0
    r0, r1 = 1, a % m
    for bit in bin(e)[2:] if e else "":
        if bit == "0":
            r1 = (r0 * r1) % m
            r0 = (r0 * r0) % m
        else:
            r0 = (r0 * r1) % m
            r1 = (r1 * r1) % m
        if counter is not None:
            counter["ops"] = counter.get("ops", 0) + 2
    return r0 if e else 1 % m


def naive_power(a, e, m, counter=None):
    """The ladder of e-1 multiplications: run only where e is small
    enough to survive it."""
    result = 1 % m
    x = a % m
    for _ in range(e):
        result = (result * x) % m
        if counter is not None:
            counter["mul"] = counter.get("mul", 0) + 1
    return result


def is_probable_prime(n, rng, rounds=40):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d = n - 1
    r = 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for _ in range(rounds):
        a = rng.randrange(2, n - 1)
        x = sqm(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = (x * x) % n
            if x == n - 1:
                break
        else:
            return False
    return True


def gen_prime(bits, rng):
    while True:
        cand = rng.getrandbits(bits) | (1 << (bits - 1)) | 1
        if is_probable_prime(cand, rng):
            return cand


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the stdlib referee. 3,000 triples up to 2048 bits,
    # edges included: sqm and the ladder equal pow exactly.
    cases = [(0, 0, 7), (5, 0, 7), (0, 5, 7), (3, 1, 7), (10, 10, 1), (7, 2, 2)]
    for _ in range(3_000):
        bits = rng.choice([8, 16, 64, 256, 1024, 2048])
        a = rng.getrandbits(bits)
        e = rng.getrandbits(bits)
        m = rng.getrandbits(bits) | 1
        if m <= 1:
            m = 3
        cases.append((a, e, m))
    for a, e, m in cases:
        want = pow(a, e, m)
        assert sqm(a, e, m) == want, (a, e, m)
        assert ladder(a, e, m) == want, (a, e, m)

    # Oracle 2: THE COUNT LAW, exact. Squares == bit_length - 1;
    # multiplies == popcount - 1: asserted on 500 exponents.
    for _ in range(500):
        e = rng.getrandbits(rng.randint(2, 2048)) | 1
        c = {}
        sqm(3, e, 10**9 + 7, c)
        assert c["sq"] == e.bit_length() - 1, (e, c)
        assert c.get("mul", 0) == bin(e).count("1") - 1, (e, c)

    # The naive ladder, actually run where it can survive.
    e_small = 999_983
    cn = {}
    cs = {}
    want = pow(7, e_small, 10**9 + 7)
    assert naive_power(7, e_small, 10**9 + 7, cn) == want
    assert sqm(7, e_small, 10**9 + 7, cs) == want
    small_ops = cs["sq"] + cs.get("mul", 0)
    naive_ops = cn["mul"]
    small_ratio = naive_ops / small_ops
    assert small_ratio > 20_000, small_ratio  # measured 34,482x

    # At 2048 bits the naive count is e - 1 itself: a number with
    # 617 decimal digits. The law, not a run.
    e_big = rng.getrandbits(2048) | (1 << 2047) | 1
    c2 = {}
    sqm(3, e_big, (1 << 2048) - 159, c2)
    big_ops = c2["sq"] + c2["mul"]
    naive_digits = len(str(e_big - 1))
    assert big_ops < 4_000
    assert naive_digits == 617

    # Oracle 3: THE LEAK, counted. Same 1024-bit length, popcount 3
    # vs ~512: square-and-multiply's op count differs by exactly the
    # popcount difference: the ladder's counts are IDENTICAL.
    e_sparse = (1 << 1023) | (1 << 500) | 1
    e_dense = (1 << 1023) | ((1 << 1023) - 1) & rng.getrandbits(1023) | 1
    m_leak = (1 << 1024) - 105
    c_sp = {}
    c_de = {}
    sqm(3, e_sparse, m_leak, c_sp)
    sqm(3, e_dense, m_leak, c_de)
    sp_ops = c_sp["sq"] + c_sp["mul"]
    de_ops = c_de["sq"] + c_de["mul"]
    leak_gap = de_ops - sp_ops
    assert leak_gap == bin(e_dense).count("1") - bin(e_sparse).count("1")
    assert leak_gap > 300  # the eavesdropper's signal
    l_sp = {}
    l_de = {}
    ladder(3, e_sparse, m_leak, l_sp)
    ladder(3, e_dense, m_leak, l_de)
    assert l_sp["ops"] == l_de["ops"]  # the leak, sealed

    # Oracle 4: toy RSA. 512-bit primes via Miller-Rabin (itself
    # riding sqm), 50 messages round-tripped exactly.
    p = gen_prime(512, rng)
    q = gen_prime(512, rng)
    while q == p:
        q = gen_prime(512, rng)
    n = p * q
    e_rsa = 65537
    d = pow(e_rsa, -1, (p - 1) * (q - 1))
    for _ in range(50):
        msg = rng.randrange(2, n - 1)
        ct = sqm(msg, e_rsa, n)
        back = sqm(ct, d, n)
        assert back == msg

    # Oracle 5: Diffie-Hellman. 100 handshakes: both sides derive
    # the same secret, and it equals g^(ab) computed directly.
    p_dh = gen_prime(256, rng)
    g = 2
    for _ in range(100):
        x = rng.randrange(2, p_dh - 2)
        y = rng.randrange(2, p_dh - 2)
        gx = sqm(g, x, p_dh)
        gy = sqm(g, y, p_dh)
        s1 = sqm(gy, x, p_dh)
        s2 = sqm(gx, y, p_dh)
        assert s1 == s2 == sqm(g, (x * y) % (p_dh - 1), p_dh)

    print("contest: a^e mod m at 2048 bits; referee: Python's built-in pow, matched exactly on 3,006 triples including every edge case")
    print(f"  {'method':<24} {'ops at e~10^6':>13} {'ops at 2048 bits':>17}   nature")
    print(f"  {'Naive ladder':<24} {naive_ops:>13,} {'~10^617':>17}   e-1 multiplications: run only where survivable")
    print(f"  {'Square-and-multiply':<24} {small_ops:>13,} {big_ops:>17,}   squares per bit, multiplies per 1: {small_ratio:,.0f}x measured")
    print(f"  {'Montgomery ladder':<24} {'2/bit':>13} {l_sp['ops']:>17,}   every bit pays both: the count leaks nothing")
    print(f"the count law, exact on 500 exponents: squares == bit_length - 1, multiplies == popcount - 1")
    print(f"the leak, counted: same 1024-bit length, popcount 3 vs {bin(e_dense).count('1')}: square-and-multiply pays {sp_ops:,} vs {de_ops:,} ops ({leak_gap} more: exactly the popcount gap: an op-counting eavesdropper reads the key's 1s); the ladder pays {l_sp['ops']:,} for both: identical")
    print(f"the clients: RSA with 512-bit Miller-Rabin primes round-tripped 50 messages exactly; 100 Diffie-Hellman handshakes agreed on both sides and matched g^(ab)")
    print("OK: 3,006 matches against pow, the count law exact, the naive ladder priced by execution at 10^6 and by law at 2048 bits, the popcount leak counted and sealed by the ladder, and both cryptographic clients round-tripping")
