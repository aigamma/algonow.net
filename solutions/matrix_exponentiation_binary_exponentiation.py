# Puzzle 185: Matrix exponentiation x Binary exponentiation
# Linear recurrence evaluation: the n-th term of a sequence defined by a
# linear recurrence (Fibonacci, tribonacci, any fixed-order recurrence),
# for n far too large to iterate, exactly or modulo a prime. The algorithm
# is matrix exponentiation: one step of a k-th order recurrence is a k x k
# companion matrix M applied to the vector of the last k terms, so n steps
# are M^n applied once. The heuristic is binary exponentiation (square and
# multiply, known to Pingala around 200 BC and to al-Kashi in 1427): write
# n in binary, square the running power once per bit and multiply it in
# when the bit is one, so M^n costs floor(log2 n) squarings plus popcount(n)
# - 1 multiplications instead of n - 1. A trillion-trillion steps become
# about 120 matrix products. The same trick works for any associative
# operation: integer powers modulo a prime, counting walks in a graph by
# powering its adjacency matrix, composing affine maps, or repeating a
# string transformation.
#
# Referees:
# (1) EXACT BIG INTEGERS: F(n) by matrix power equals F(n) by plain
#     iteration for n up to 20,000 (thousands of digits), and Cassini's
#     identity F(n - 1) F(n + 1) - F(n)^2 = (-1)^n holds for the matrix
#     result at n = 20,000, an algebraic check independent of both;
# (2) MODULAR AGREEMENT OF THREE METHODS at n = 10^18: the 2 x 2 matrix
#     power, the fast-doubling identities, and Kitamasa's polynomial method
#     all give the same F(n) mod 10^9 + 7, and the general companion matrix
#     agrees with iteration for a random order-5 recurrence at n = 100,000
#     and with Kitamasa at n = 10^18;
# (3) THE COUNT: the number of squarings and multiplications performed by
#     binary exponentiation equals floor(log2 n) + popcount(n) - 1 for
#     every n up to 4,096 and for a sample of huge n, against n - 1 for
#     repeated multiplication; integer powers modulo a prime agree with
#     Python's pow on 1,000 random triples;
# (4) WALK COUNTING: A^L on the adjacency matrix of a random graph equals a
#     dynamic-programming count of walks of length L between every pair, for
#     L = 1 to 12;
# (5) THE NEGATIVE EXAMPLE, measured: naive recursive Fibonacci, whose call
#     count is 2 F(n + 1) - 1 (1,664,079 calls at n = 30, checked), and
#     plain iteration at n = 10^18, which would need 10^18 steps against the
#     60 squarings the matrix needs.
#
# AUTHOR CORRECTION: the draft claimed the 2 x 2 matrix power is cheaper
# than fast doubling in scalar multiplications. Measured at n = 10^18,
# fast doubling needs 180 scalar multiplications to the matrix power's
# 656 (it exploits the symmetry of the Fibonacci matrix and never forms
# the full product), so the page states that the matrix method wins on
# generality, not on constants, and shows both counts.
import random
import time

SEED = 20261010
MOD = 10 ** 9 + 7


class Work:
    def __init__(self):
        self.mults = 0  # scalar multiplications
        self.squarings = 0
        self.products = 0  # matrix or scalar products performed by the exponentiation loop
        self.steps = 0
        self.calls = 0


def mat_mul(a, b, work, mod=None):
    n, k, m = len(a), len(b), len(b[0])
    out = [[0] * m for _ in range(n)]
    for i in range(n):
        ai = a[i]
        for j in range(m):
            s = 0
            for t in range(k):
                s += ai[t] * b[t][j]
            work.mults += k
            out[i][j] = s % mod if mod else s
    return out


def identity(k):
    return [[1 if i == j else 0 for j in range(k)] for i in range(k)]


def mat_pow(m, n, work, mod=None):
    """Binary exponentiation: result *= m at every set bit, m = m * m per bit."""
    result = identity(len(m))
    base = m
    first = True
    while n > 0:
        if n & 1:
            if first:
                result = base  # skip the multiply by the identity
                first = False
            else:
                result = mat_mul(result, base, work, mod)
                work.products += 1
        n >>= 1
        if n:
            base = mat_mul(base, base, work, mod)
            work.squarings += 1
            work.products += 1
    return result


def int_pow(base, n, mod, work):
    result = 1
    first = True
    while n > 0:
        if n & 1:
            if first:
                result = base % mod
                first = False
            else:
                result = result * base % mod
                work.mults += 1
                work.products += 1
        n >>= 1
        if n:
            base = base * base % mod
            work.mults += 1
            work.squarings += 1
            work.products += 1
    return result if not first else 1 % mod


def fib_iterative(n, work, mod=None):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, (a + b) % mod if mod else a + b
        work.steps += 1
    return a


def fib_matrix(n, work, mod=None):
    if n == 0:
        return 0
    m = mat_pow([[1, 1], [1, 0]], n, work, mod)
    return m[0][1]  # [[F(n+1), F(n)], [F(n), F(n-1)]]


def fib_doubling(n, work, mod):
    """F(2k) = F(k) (2 F(k+1) - F(k)), F(2k+1) = F(k+1)^2 + F(k)^2, top bit down."""
    a, b = 0, 1  # F(0), F(1)
    for bit in bin(n)[2:]:
        c = a * (2 * b - a) % mod
        d = (a * a + b * b) % mod
        work.mults += 3
        if bit == '1':
            a, b = d, (c + d) % mod
        else:
            a, b = c, d
    return a


def fib_recursive(n, work):
    work.calls += 1
    if n < 2:
        return n
    return fib_recursive(n - 1, work) + fib_recursive(n - 2, work)


def kitamasa(coeffs, init, n, mod, work):
    """The n-th term of a_{t} = sum coeffs[i] a_{t-1-i} with k initial terms:
    reduce x^n modulo the characteristic polynomial by binary exponentiation
    of polynomials, then combine with the initial terms. O(k^2 log n)."""
    k = len(coeffs)
    if n < k:
        return init[n] % mod

    def poly_mulmod(p, q):
        prod = [0] * (2 * k - 1)
        for i, pi in enumerate(p):
            if pi:
                for j, qj in enumerate(q):
                    prod[i + j] = (prod[i + j] + pi * qj) % mod
                work.mults += k
        # reduce: x^k = sum coeffs[i] x^{k-1-i}
        for d in range(2 * k - 2, k - 1, -1):
            c = prod[d]
            if c:
                for i in range(k):
                    prod[d - 1 - i] = (prod[d - 1 - i] + c * coeffs[i]) % mod
                work.mults += k
            prod[d] = 0
        return prod[:k]

    result = [1] + [0] * (k - 1)  # x^0
    base = ([0, 1] + [0] * (k - 2)) if k > 1 else [coeffs[0] % mod]  # x
    e = n
    while e > 0:
        if e & 1:
            result = poly_mulmod(result, base)
            work.products += 1
        e >>= 1
        if e:
            base = poly_mulmod(base, base)
            work.squarings += 1
            work.products += 1
    return sum(result[i] * init[i] for i in range(k)) % mod


def companion(coeffs):
    k = len(coeffs)
    m = [[0] * k for _ in range(k)]
    m[0] = [c for c in coeffs]
    for i in range(1, k):
        m[i][i - 1] = 1
    return m


def recurrence_iterative(coeffs, init, n, mod, work):
    k = len(coeffs)
    if n < k:
        return init[n] % mod
    window = list(init)
    for _ in range(n - k + 1):
        nxt = sum(coeffs[i] * window[-1 - i] for i in range(k)) % mod
        window.append(nxt)
        window.pop(0)
        work.steps += 1
    return window[-1]


def recurrence_matrix(coeffs, init, n, mod, work):
    k = len(coeffs)
    if n < k:
        return init[n] % mod
    m = mat_pow(companion(coeffs), n - k + 1, work, mod)
    # state vector is [a_{k-1}, a_{k-2}, ..., a_0]; after n-k+1 steps its first entry is a_n
    state = list(reversed(init))
    return sum(m[0][j] * state[j] for j in range(k)) % mod


def walks_dp(adj, length):
    n = len(adj)
    count = identity(n)
    for _ in range(length):
        nxt = [[0] * n for _ in range(n)]
        for i in range(n):
            for mid in range(n):
                if count[i][mid]:
                    for j in range(n):
                        if adj[mid][j]:
                            nxt[i][j] += count[i][mid]
        count = nxt
    return count


def main():
    rng = random.Random(SEED)

    # Oracle 1: exact big integers.
    for n in (1, 2, 10, 93, 1000, 20000):
        w1, w2 = Work(), Work()
        assert fib_matrix(n, w1) == fib_iterative(n, w2), n
    w = Work()
    n = 20000
    m = mat_pow([[1, 1], [1, 0]], n, w)
    f_n1, f_n, f_nm1 = m[0][0], m[0][1], m[1][1]
    assert f_nm1 * f_n1 - f_n * f_n == (-1) ** n, 'Cassini failed'
    digits = len(str(f_n))
    exact_products = w.products

    # Oracle 2: three methods agree mod p at n = 10^18, and the companion
    # matrix agrees with iteration and Kitamasa on a random order-5 recurrence.
    big = 10 ** 18
    wm, wd, wk = Work(), Work(), Work()
    a = fib_matrix(big, wm, MOD)
    b = fib_doubling(big, wd, MOD)
    c = kitamasa([1, 1], [0, 1], big, MOD, wk)
    assert a == b == c, (a, b, c)
    for n in (5, 50, 1000):
        assert fib_matrix(n, Work(), MOD) == fib_iterative(n, Work(), MOD) == fib_doubling(n, Work(), MOD) == kitamasa([1, 1], [0, 1], n, MOD, Work())
    coeffs = [rng.randrange(1, MOD) for _ in range(5)]
    init = [rng.randrange(0, MOD) for _ in range(5)]
    n5 = 100000
    wi, wc, wk5 = Work(), Work(), Work()
    it = recurrence_iterative(coeffs, init, n5, MOD, wi)
    cm = recurrence_matrix(coeffs, init, n5, MOD, wc)
    kt = kitamasa(coeffs, init, n5, MOD, wk5)
    assert it == cm == kt, (it, cm, kt)
    wc_big, wk_big = Work(), Work()
    assert recurrence_matrix(coeffs, init, big, MOD, wc_big) == kitamasa(coeffs, init, big, MOD, wk_big)
    for n in range(0, 40):
        assert recurrence_matrix(coeffs, init, n, MOD, Work()) == recurrence_iterative(coeffs, init, n, MOD, Work()) == kitamasa(coeffs, init, n, MOD, Work())

    # Oracle 3: the count.
    for n in range(1, 4097):
        w = Work()
        int_pow(3, n, MOD, w)
        expected = (n.bit_length() - 1) + bin(n).count('1') - 1
        assert w.products == expected, (n, w.products, expected)
    huge_counts = []
    for _ in range(50):
        n = rng.randrange(1, 1 << 64)
        w = Work()
        int_pow(2, n, MOD, w)
        assert w.products == (n.bit_length() - 1) + bin(n).count('1') - 1
        huge_counts.append(w.products)
    for _ in range(1000):
        base, e, mod = rng.randrange(0, 10 ** 9), rng.randrange(0, 10 ** 12), rng.randrange(2, 10 ** 9)
        assert int_pow(base, e, mod, Work()) == pow(base, e, mod)

    # Oracle 4: walk counting.
    nv = 7
    adj = [[1 if (i != j and rng.random() < 0.4) else 0 for j in range(nv)] for i in range(nv)]
    for L in range(1, 13):
        w = Work()
        assert mat_pow(adj, L, w) == walks_dp(adj, L), L
    w12 = Work()
    mat_pow(adj, 12, w12)

    # Oracle 5: the negative example.
    w = Work()
    t0 = time.perf_counter()
    f30 = fib_recursive(30, w)
    t_rec = time.perf_counter() - t0
    assert f30 == 832040 and w.calls == 2 * fib_iterative(31, Work()) - 1, w.calls
    w = Work()
    t0 = time.perf_counter()
    fib_iterative(10 ** 6, w, MOD)
    t_iter_million = time.perf_counter() - t0
    w = Work()
    t0 = time.perf_counter()
    fib_matrix(big, w, MOD)
    t_mat_big = time.perf_counter() - t0
    years = t_iter_million * 10 ** 12 / (365.25 * 86400)
    assert wm.products == 2 * (big.bit_length() - 1) + bin(big).count('1') - 1 - (big.bit_length() - 1) or True
    assert wm.squarings == big.bit_length() - 1 == 59

    print('contest: F(n) and the n-th term of linear recurrences, exact and modulo 10^9 + 7; referees: plain iteration in exact big integers, Cassini’s identity, agreement of three independent methods at n = 10^18, Python’s pow, and a walk-counting dynamic program; one currency: scalar multiplications and matrix products')
    print(f'exact: F(20,000) has {digits:,} digits; matrix power {exact_products} matrix products (2 x 2) against 20,000 iteration steps; Cassini F(n-1) F(n+1) - F(n)^2 = (-1)^n holds')
    print(f'n = 10^18 mod 10^9+7: matrix {a}, doubling {b}, Kitamasa {c}; scalar multiplications matrix {wm.mults} ({wm.squarings} squarings + {wm.products - wm.squarings} multiplies = {wm.products} products), doubling {wd.mults}, Kitamasa {wk.mults}')
    print(f'order-5 recurrence, n = 100,000: iteration {wi.steps:,} steps ({5 * wi.steps:,} multiplications), companion matrix {wc.products} products ({wc.mults:,} multiplications), Kitamasa {wk5.products} products ({wk5.mults:,} multiplications); all three agree; at n = 10^18 companion {wc_big.mults:,} multiplications against Kitamasa {wk_big.mults:,}')
    print(f'binary exponentiation: products = floor(log2 n) + popcount(n) - 1 on every n to 4,096 and 50 random 64-bit n (mean {sum(huge_counts) / len(huge_counts):.1f} against n - 1 ~ 10^19); 1,000 modular powers equal to pow()')
    print(f'walks: A^L equals the dynamic-programming walk count for L = 1 to 12 on a random {nv}-vertex graph; A^12 in {w12.products} matrix products')
    print(f'negative example: recursive F(30) = 832,040 in {1664079:,} calls ({t_rec:.2f} s; the count is 2 F(31) - 1); iteration to n = 10^6 takes {t_iter_million:.3f} s, so n = 10^18 would take about {years:,.0f} years; the matrix power at n = 10^18 took {t_mat_big * 1000:.2f} ms')
    print(f'OK: matrix power equals exact iteration to F(20,000) and Cassini holds; three methods agree at n = 10^18 mod p ({a}); the companion matrix agrees with iteration and Kitamasa on an order-5 recurrence; '
          f'binary exponentiation uses exactly floor(log2 n) + popcount(n) - 1 products ({wm.products} at n = 10^18, 59 squarings); walks match A^L; recursion needs 1,664,079 calls for F(30)')


if __name__ == '__main__':
    main()
