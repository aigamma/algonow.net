# Puzzle 121: Reed-Solomon x Berlekamp-Massey decoding
# Burst error correction: send k data symbols as an n-symbol codeword
# so that any t = (n - k) / 2 corrupted symbols can be found and
# repaired, wherever they land, however many of their bits flipped.
# Reed-Solomon (1960) is the code: the message is a polynomial over
# GF(2^8), and the codeword is that polynomial times a generator whose
# 2t roots are consecutive powers of a primitive element alpha, so a
# clean codeword evaluates to zero at all of them. The heuristic is
# how the receiver finds the errors: the 2t syndromes S_j = r(alpha^j)
# form a sequence, and the Berlekamp-Massey algorithm synthesizes the
# shortest linear recurrence that generates it. That recurrence's
# connection polynomial is the error locator: its roots point at the
# corrupted positions. Chien search finds the roots, Forney's formula
# reads the error values, and the codeword is repaired.
#
# Referees:
# (1) EXACT RECOVERY: over many random codewords with e <= t random
#     symbol errors (random positions, random nonzero values), the
#     decoder returns the original message exactly, and the located
#     positions equal the injected positions;
# (2) PETERSON-GORENSTEIN-ZIERLER, an independent decoder that finds
#     the locator by solving the syndrome linear system with Gaussian
#     elimination over the field, agrees with Berlekamp-Massey on the
#     locator polynomial for every trial;
# (3) THE BOUND: with t + 1 errors the syndrome cannot be trusted, and
#     the run reports what happened: decoding failure, or a
#     miscorrection to a different valid codeword (both counted);
# (4) BURSTS: a burst of t consecutive symbols with every bit flipped
#     (8t bit errors) is corrected, which is the property block codes
#     over bytes are built for;
# (5) THE COST: field multiplications are counted for Berlekamp-Massey
#     (O(t^2)) against PGZ (O(t^4) with the unknown error count), and
#     brute force over error patterns is priced by arithmetic.
import random

SEED = 20260926
PRIM = 0x11d          # x^8 + x^4 + x^3 + x^2 + 1, the AES-free classic
N = 255
K = 223
T = (N - K) // 2      # 16, the CCSDS deep-space code

EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= PRIM
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]

MULS = [0]


def gmul(a, b):
    MULS[0] += 1
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]


def ginv(a):
    assert a != 0
    return EXP[255 - LOG[a]]


def poly_mul(p, q):
    out = [0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        if a == 0:
            continue
        for j, b in enumerate(q):
            out[i + j] ^= gmul(a, b)
    return out


def poly_eval(p, x):
    """Horner's rule; p is highest degree first."""
    y = 0
    for c in p:
        y = gmul(y, x) ^ c
    return y


def generator(nsym):
    g = [1]
    for i in range(nsym):
        g = poly_mul(g, [1, EXP[i]])
    return g


GEN = generator(2 * T)


def encode(msg):
    """Systematic: codeword = msg || remainder of msg * x^2t mod g."""
    assert len(msg) == K
    rem = list(msg) + [0] * (2 * T)
    for i in range(K):
        coef = rem[i]
        if coef:
            for j in range(1, len(GEN)):
                rem[i + j] ^= gmul(GEN[j], coef)
    return list(msg) + rem[K:]


def syndromes(r):
    return [poly_eval(r, EXP[i]) for i in range(2 * T)]


def berlekamp_massey(S):
    """The shortest LFSR generating S. Returns the connection polynomial
    C (lowest degree first) and its length L."""
    C = [1]
    B = [1]
    L = 0
    m = 1
    b = 1
    for n_ in range(len(S)):
        d = S[n_]
        for i in range(1, L + 1):
            d ^= gmul(C[i], S[n_ - i])
        if d == 0:
            m += 1
            continue
        T_ = list(C)
        coef = gmul(d, ginv(b))
        C = C + [0] * max(0, len(B) + m - len(C))
        for i in range(len(B)):
            C[i + m] ^= gmul(coef, B[i])
        if 2 * L <= n_:
            L = n_ + 1 - L
            B = T_
            b = d
            m = 1
        else:
            m += 1
    return C[:L + 1], L


def chien_search(C):
    """Positions i such that C(alpha^-i) = 0, i.e. error locations."""
    roots = []
    for i in range(N):
        x = EXP[(255 - i) % 255]
        if poly_eval(list(reversed(C)), x) == 0:
            roots.append(i)
    return roots


def forney(S, C, positions):
    """Error values at the located positions."""
    # error evaluator Omega = S(x) C(x) mod x^2t, with S lowest degree first
    S_poly = list(S)
    omega = [0] * (2 * T)
    for i, c in enumerate(C):
        for j, s in enumerate(S_poly):
            if i + j < 2 * T:
                omega[i + j] ^= gmul(c, s)
    # formal derivative of C
    dC = [C[i] if i % 2 == 1 else 0 for i in range(1, len(C))]
    values = {}
    for pos in positions:
        xinv = EXP[(255 - pos) % 255]
        num = poly_eval(list(reversed(omega)), xinv)
        den = poly_eval(list(reversed(dC)), xinv)
        assert den != 0
        # with roots alpha^0..alpha^(2t-1), the Forney factor is X^(1-c) with c = 0
        values[pos] = gmul(EXP[pos], gmul(num, ginv(den)))
    return values


def decode(r):
    """Returns (message, positions, locator) or raises ValueError."""
    r = list(r)
    S = syndromes(r)
    if not any(S):
        return r[:K], [], [1]
    C, L = berlekamp_massey(S)
    positions = chien_search(C)
    if len(positions) != L or L > T:
        raise ValueError('uncorrectable: locator degree and root count disagree')
    values = forney(S, C, positions)
    for pos, val in values.items():
        r[N - 1 - pos] ^= val
    if any(syndromes(r)):
        raise ValueError('uncorrectable: syndromes remain after correction')
    return r[:K], sorted(N - 1 - p for p in positions), C


def pgz_locator(S, t=T):
    """Peterson-Gorenstein-Zierler: try e = t, t-1, ... and solve the
    e x e Hankel system of syndromes for the locator coefficients."""
    for e in range(t, 0, -1):
        A = [[S[i + j] for j in range(e)] + [S[i + e]] for i in range(e)]
        # Gaussian elimination over GF(256)
        rows = e
        singular = False
        for col in range(e):
            piv = next((r_ for r_ in range(col, rows) if A[r_][col]), None)
            if piv is None:
                singular = True
                break
            A[col], A[piv] = A[piv], A[col]
            inv = ginv(A[col][col])
            A[col] = [gmul(v, inv) for v in A[col]]
            for r_ in range(rows):
                if r_ != col and A[r_][col]:
                    f = A[r_][col]
                    A[r_] = [a ^ gmul(f, b) for a, b in zip(A[r_], A[col])]
        if singular:
            continue
        lam = [A[i][e] for i in range(e)]      # lambda_1 ... lambda_e in system order
        # system: S[i+e] = sum_j lam_j S[i+e-1-j]... we solved S[i+e] = sum_j x_j S[i+j],
        # so C(x) = 1 + x_{e-1} x + ... + x_0 x^e
        C = [1] + [lam[e - 1 - j] for j in range(e)]
        return C, e
    return [1], 0


def random_message(rng):
    return [rng.randrange(256) for _ in range(K)]


def corrupt(cw, rng, e, burst=False):
    r = list(cw)
    if burst:
        start = rng.randrange(N - e + 1)
        positions = list(range(start, start + e))
        for p in positions:
            r[p] ^= 0xff
    else:
        positions = rng.sample(range(N), e)
        for p in positions:
            r[p] ^= rng.randrange(1, 256)
    return r, sorted(positions)


if __name__ == '__main__':
    rng = random.Random(SEED)
    assert len(GEN) == 2 * T + 1
    # the generator's roots really are alpha^0 .. alpha^(2t-1)
    for i in range(2 * T):
        assert poly_eval(GEN, EXP[i]) == 0

    # Oracle 1 + 2: exact recovery and locator agreement, e = 0..t.
    TRIALS = 48
    recovered = 0
    agree = 0
    mul_bm = 0
    mul_pgz = 0
    for trial in range(TRIALS):
        msg = random_message(rng)
        cw = encode(msg)
        assert not any(syndromes(cw))
        e = trial % (T + 1)
        r, positions = corrupt(cw, rng, e)
        S = syndromes(r)
        MULS[0] = 0
        C_bm, L = berlekamp_massey(S)
        mul_bm += MULS[0]
        MULS[0] = 0
        C_pgz, e_pgz = pgz_locator(S)
        mul_pgz += MULS[0]
        assert L == e == e_pgz, (trial, L, e, e_pgz)
        assert C_bm == C_pgz, (trial, C_bm, C_pgz)
        decoded, found, _ = decode(r)
        assert decoded == msg and found == positions, trial
        recovered += 1
        agree += 1
    assert recovered == TRIALS and agree == TRIALS

    # Oracle 3: t + 1 errors: the bound, measured.
    failures = 0
    miscorrections = 0
    for trial in range(40):
        msg = random_message(rng)
        cw = encode(msg)
        r, _ = corrupt(cw, rng, T + 1)
        try:
            decoded, _, _ = decode(r)
            if decoded != msg:
                miscorrections += 1
            else:
                raise AssertionError('t+1 errors corrected by luck: impossible for random values')
        except ValueError:
            failures += 1
    assert failures + miscorrections == 40 and failures > 0

    # Oracle 4: bursts of t symbols with every bit flipped.
    for trial in range(12):
        msg = random_message(rng)
        r, positions = corrupt(encode(msg), rng, T, burst=True)
        decoded, found, _ = decode(r)
        assert decoded == msg and found == positions
    # and a burst of t + 1 fails (measured, not assumed)
    burst_fail = 0
    for trial in range(12):
        msg = random_message(rng)
        r, _ = corrupt(encode(msg), rng, T + 1, burst=True)
        try:
            decoded, _, _ = decode(r)
            burst_fail += decoded != msg
        except ValueError:
            burst_fail += 1
    assert burst_fail == 12

    # Oracle 5: the cost of finding the locator, per trial, and brute force priced.
    from math import comb
    brute = sum(comb(N, e) * (255 ** e) for e in range(1, T + 1))
    bm_avg = mul_bm / TRIALS
    pgz_avg = mul_pgz / TRIALS
    assert pgz_avg > 3 * bm_avg, (bm_avg, pgz_avg)

    print(f'contest: RS({N}, {K}) over GF(256), t = {T} correctable symbols; {TRIALS} random codewords with 0..{T} random symbol errors, 40 with {T + 1}, 24 with bursts; currency: field multiplications to find the error locator')
    print(f"  {'locator method':<36} {'mults/trial':>12}   {'agreement':>10}")
    print(f"  {'Berlekamp-Massey (shortest LFSR)':<36} {bm_avg:>12,.0f}   {agree}/{TRIALS}   O(t^2): every syndrome once, one discrepancy per step")
    print(f"  {'Peterson-Gorenstein-Zierler':<36} {pgz_avg:>12,.0f}   {agree}/{TRIALS}   O(t^4): Gaussian elimination retried while the system is singular")
    print(f"  {'brute force over error patterns':<36} {brute:>12.2e}   {'-':>10}   sum over e of C(255, e) 255^e candidates: never")
    print(f'recovery: {recovered}/{TRIALS} exact with e <= t and every located position equal to the injected one; with t + 1 = {T + 1} errors: {failures} decoding failures and {miscorrections} miscorrections out of 40 (the bound, measured)')
    print(f'bursts: 12/12 bursts of {T} symbols with every bit flipped ({8 * T} bit errors) corrected; 12/12 bursts of {T + 1} symbols failed or miscorrected')
    print(f'OK: {recovered}/{TRIALS} exact recoveries with positions matched; Berlekamp-Massey and PGZ agree on the locator {agree}/{TRIALS}; '
          f't+1 errors never silently accepted as the original ({failures} failures, {miscorrections} miscorrections); {8 * T}-bit bursts corrected 12/12 and t+1 bursts rejected 12/12; '
          f'BM {bm_avg:,.0f} vs PGZ {pgz_avg:,.0f} multiplications per locator')
