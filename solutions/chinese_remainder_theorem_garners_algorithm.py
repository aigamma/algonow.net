# Puzzle 147: Chinese remainder theorem x Garner's algorithm
# Modular reconstruction: a large integer is known only by its
# remainders modulo several pairwise coprime moduli m_1 ... m_k. The
# Chinese remainder theorem says the integer is determined uniquely
# modulo the product M = m_1 ... m_k, and gives a formula for it:
# x = sum of r_i * M_i * (M_i^-1 mod m_i), with M_i = M / m_i, reduced
# mod M. Garner's algorithm is the heuristic for computing it: build x
# in the mixed-radix form x = v_1 + v_2 m_1 + v_3 m_1 m_2 + ..., where
# each digit v_j is found by one small modular inverse and arithmetic
# that stays below m_j until the final assembly. No big products of
# all the moduli, no big inverses, and the digits come out one modulus
# at a time, so the reconstruction can stop early when the value is
# already determined.
#
# Referees:
# (1) THE RECONSTRUCTION, exact: 2,000 random integers below M split
#     into residues modulo five coprime moduli and rebuilt by Garner
#     and by the direct CRT formula, both equal to the original; and
#     the reverse check that the rebuilt value has every residue;
# (2) THE UNIQUENESS: two distinct integers below M never share all
#     five residues (checked exhaustively for small moduli);
# (3) THE COST, counted in big-number operations: the direct formula
#     multiplies M-sized numbers and inverts M_i-sized ones; Garner
#     works in numbers the size of one modulus until the last step,
#     with the operand sizes measured in bits;
# (4) THE APPLICATION: a 640-bit product of two 320-bit integers
#     computed in ten 64-bit moduli by residue arithmetic and
#     reassembled by Garner, equal to Python's own product; and RSA
#     decryption by CRT (Garner across p and q) equal to plain modular
#     exponentiation while costing a quarter of the multiplications;
# (5) THE FAILURE, exact: with moduli that share a factor, the
#     reconstruction is not unique, shown by a pair of integers with
#     identical residues;
# (6) THE NEGATIVE EXAMPLE, counted: the sieve (start at the first
#     residue, add the running product until the next residue matches)
#     finds each mixed-radix digit by walking to it, one step per unit
#     of the digit, so it costs about half a modulus per digit: about
#     two million steps for the five million-sized moduli where Garner
#     spends ten small operations.
import math
import random
import time

SEED = 20260926


def egcd(a, b):
    if b == 0:
        return a, 1, 0
    g, x, y = egcd(b, a % b)
    return g, y, x - (a // b) * y


def inv(a, m):
    g, x, _ = egcd(a % m, m)
    assert g == 1, (a, m)
    return x % m


def crt_direct(residues, moduli, counter=None):
    M = 1
    for m in moduli:
        M *= m
    x = 0
    for r, m in zip(residues, moduli):
        Mi = M // m
        yi = inv(Mi % m, m)
        term = r * Mi * yi
        if counter is not None:
            counter['bits'] = max(counter['bits'], term.bit_length())
            counter['ops'] += 3
        x += term
    return x % M


def garner(residues, moduli, counter=None):
    """Mixed-radix digits v_j, then assemble."""
    k = len(moduli)
    v = []
    for j in range(k):
        t = residues[j]
        for i in range(j):
            t = ((t - v[i]) * inv(moduli[i] % moduli[j], moduli[j])) % moduli[j]
            if counter is not None:
                counter['bits'] = max(counter['bits'], t.bit_length())
                counter['ops'] += 2
        v.append(t)
    x = 0
    scale = 1
    for j in range(k):
        x += v[j] * scale
        scale *= moduli[j]
    return x


def sieve(residues, moduli, counter):
    """The textbook walk: x = r_1, then add the running product until the
    next residue matches. Each digit is found by counting up to it."""
    x = residues[0]
    scale = moduli[0]
    for j in range(1, len(moduli)):
        while x % moduli[j] != residues[j]:
            x += scale
            counter[0] += 1
        scale *= moduli[j]
    return x


def rsa_keys(bits, rng):
    def is_probable_prime(n):
        if n < 2:
            return False
        for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
            if n % p == 0:
                return n == p
        d = n - 1
        s = 0
        while d % 2 == 0:
            d //= 2
            s += 1
        for a in (2, 325, 9375, 28178, 450775, 9780504, 1795265022):
            if a % n == 0:
                continue
            x = pow(a, d, n)
            if x in (1, n - 1):
                continue
            for _ in range(s - 1):
                x = x * x % n
                if x == n - 1:
                    break
            else:
                return False
        return True

    def prime(b):
        while True:
            c = rng.getrandbits(b) | (1 << (b - 1)) | 1
            if is_probable_prime(c):
                return c
    p = prime(bits // 2)
    q = prime(bits // 2)
    while q == p:
        q = prime(bits // 2)
    n = p * q
    e = 65537
    d = inv(e, (p - 1) * (q - 1))
    return p, q, n, e, d


def modpow_counted(base, exp, mod):
    """Square-and-multiply with a multiplication count."""
    result = 1
    b = base % mod
    mults = 0
    for bit in bin(exp)[2:]:
        result = result * result % mod
        mults += 1
        if bit == '1':
            result = result * b % mod
            mults += 1
    return result, mults


if __name__ == '__main__':
    rng = random.Random(SEED)
    moduli = [1000003, 1000033, 1000037, 1000039, 1000081]      # pairwise coprime primes
    M = math.prod(moduli)

    # Oracle 1: reconstruction both ways, 2,000 random integers.
    for _ in range(2000):
        x = rng.randrange(M)
        residues = [x % m for m in moduli]
        assert garner(residues, moduli) == x
        assert crt_direct(residues, moduli) == x
        y = garner(residues, moduli)
        assert all(y % m == r for r, m in zip(residues, moduli))

    # Oracle 2: uniqueness, exhaustive for small moduli.
    small = [3, 5, 7, 11]
    Ms = math.prod(small)
    seen = {}
    for x in range(Ms):
        key = tuple(x % m for m in small)
        assert key not in seen, (x, seen[key])
        seen[key] = x
    assert len(seen) == Ms

    # Oracle 3: operand sizes.
    big_moduli = [(1 << 64) - 59, (1 << 64) - 83, (1 << 64) - 95, (1 << 64) - 179, (1 << 64) - 189, (1 << 64) - 257, (1 << 64) - 279, (1 << 64) - 323, (1 << 64) - 353, (1 << 64) - 363]
    for i in range(len(big_moduli)):
        for j in range(i + 1, len(big_moduli)):
            assert math.gcd(big_moduli[i], big_moduli[j]) == 1
    Mb = math.prod(big_moduli)
    x = rng.randrange(Mb)
    residues = [x % m for m in big_moduli]
    cd = {'bits': 0, 'ops': 0}
    cg = {'bits': 0, 'ops': 0}
    assert crt_direct(residues, big_moduli, cd) == x
    assert garner(residues, big_moduli, cg) == x
    assert cg['bits'] <= 64 and cd['bits'] > 640, (cg['bits'], cd['bits'])

    # Oracle 4a: a 640-bit product by residue arithmetic.
    a = rng.getrandbits(320)
    b = rng.getrandbits(320)
    prod_residues = [(a % m) * (b % m) % m for m in big_moduli]
    assert garner(prod_residues, big_moduli) == a * b
    assert (a * b).bit_length() <= Mb.bit_length() - 1

    # Oracle 4b: RSA decryption by CRT.
    p, q, n, e, d = rsa_keys(512, rng)
    message = rng.randrange(2, n - 1)
    cipher = pow(message, e, n)
    plain_plain, mults_plain = modpow_counted(cipher, d, n)
    dp, dq = d % (p - 1), d % (q - 1)
    mp, mults_p = modpow_counted(cipher % p, dp, p)
    mq, mults_q = modpow_counted(cipher % q, dq, q)
    plain_crt = garner([mp, mq], [p, q])
    assert plain_plain == plain_crt == message
    # each half-size multiplication costs about a quarter of a full one (schoolbook)
    crt_cost = (mults_p + mults_q) * 0.25
    assert crt_cost < 0.6 * mults_plain, (crt_cost, mults_plain)

    # Oracle 5: shared factors break uniqueness.
    bad = [6, 10]
    collide = None
    seen = {}
    for x in range(60):
        key = (x % 6, x % 10)
        if key in seen:
            collide = (seen[key], x)
            break
        seen[key] = x
    assert collide is not None and collide[1] - collide[0] == 30

    # Oracle 6: the sieve, exact but walking. Small moduli exhaustively,
    # then one integer on the million-sized moduli with the steps counted.
    for x in range(Ms):
        assert sieve([x % m for m in small], small, [0]) == x
    x = rng.randrange(M)
    residues = [x % m for m in moduli]
    steps = [0]
    t0 = time.perf_counter()
    assert sieve(residues, moduli, steps) == x
    sieve_seconds = time.perf_counter() - t0
    cs = {'bits': 0, 'ops': 0}
    assert garner(residues, moduli, cs) == x
    assert steps[0] > 100 * cs['ops'], (steps[0], cs['ops'])

    print(f'contest: rebuild an integer from its residues; referee: the original integer, the direct CRT formula, and exhaustive uniqueness on small moduli')
    print(f'reconstruction: 2,000 random integers below M = {M:,} ({M.bit_length()} bits) from residues mod {moduli}: Garner and the direct formula both exact, every residue of the result checked')
    print(f'uniqueness: all {Ms} integers below 3 x 5 x 7 x 11 have distinct residue tuples; with moduli 6 and 10 (shared factor 2), {collide[0]} and {collide[1]} share (r mod 6, r mod 10)')
    print(f'operand sizes on ten 64-bit moduli ({Mb.bit_length()}-bit M): Garner\'s largest intermediate {cg["bits"]} bits in {cg["ops"]} small operations; the direct formula\'s largest {cd["bits"]} bits in {cd["ops"]} big operations')
    print(f'a 640-bit product: {a.bit_length()}-bit x {b.bit_length()}-bit computed as ten 64-bit residue products and reassembled by Garner, equal to the integer product ({(a * b).bit_length()} bits)')
    print(f'RSA-512 decryption: plain exponentiation {mults_plain} full-size multiplications; CRT across p and q {mults_p} + {mults_q} half-size ones, about {crt_cost:.0f} full-size equivalents ({crt_cost / mults_plain:.0%}); both recover the message')
    print(f'the sieve on the five million-sized moduli: {steps[0]:,} additions ({sieve_seconds:.2f}s) to find the digits Garner finds in {cs["ops"]} small operations; on the 64-bit moduli it would need up to 2^64 steps per digit (not run)')
    print(f'OK: Garner rebuilt 2,000 integers exactly and matched the direct formula; uniqueness exhaustive on {Ms} values and broken by moduli 6 and 10 at {collide}; '
          f'intermediates {cg["bits"]} bits vs {cd["bits"]}; the 640-bit product and RSA decryption by CRT ({crt_cost / mults_plain:.0%} of the cost) both exact; the sieve {steps[0]:,} steps vs {cs["ops"]}')
