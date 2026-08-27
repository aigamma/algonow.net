# Puzzle 37: Fast Fourier transform x Cooley-Tukey radix-2
# All n frequency amplitudes of an n-sample signal in O(n log n), where
# the definition costs n^2, plus the convolution superpower that makes
# polynomial products cheap.
#
# The pairing is the point. The algorithm is the transform itself, a
# matrix-vector product with the roots-of-unity matrix: n^2 complex
# multiplications by definition. The heuristic is the radix-2 split:
# the DFT of n samples is two DFTs of the even and odd halves, stitched
# with n/2 twiddle multiplications, because the roots of unity at size n
# contain the roots at size n/2. T(n) = 2T(n/2) + n/2 gives exactly
# (n/2) log2 n butterfly multiplications, asserted to the integer below.
# Every claim is refereed: the naive DFT, exact integer convolution by
# schoolbook, Parseval's theorem, and round-trip inversion.
import cmath
import math
import random


def fft(vec, invert=False, counter=None):
    """Iterative radix-2 Cooley-Tukey. Counts butterfly multiplications
    (the v = a*w products): exactly (n/2) log2 n of them. Twiddle
    updates (w *= wlen) are the same count again and could be tabled."""
    n = len(vec)
    assert n and (n & (n - 1)) == 0, "radix-2 wants powers of two"
    a = list(vec)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        wlen = cmath.exp((1 if invert else -1) * 2j * cmath.pi / length)
        half = length // 2
        for i in range(0, n, length):
            w = 1.0 + 0.0j
            for k in range(half):
                u = a[i + k]
                v = a[i + k + half] * w
                if counter is not None:
                    counter["mults"] = counter.get("mults", 0) + 1
                a[i + k] = u + v
                a[i + k + half] = u - v
                w *= wlen
        length *= 2
    if invert:
        a = [x / n for x in a]
    return a


def naive_dft(vec, counter=None):
    """The definition: X[k] = sum_j x[j] * W^(jk). n^2 multiplications."""
    n = len(vec)
    out = []
    for k in range(n):
        s = 0j
        for j in range(n):
            s += vec[j] * cmath.exp(-2j * cmath.pi * j * k / n)
            if counter is not None:
                counter["mults"] = counter.get("mults", 0) + 1
        out.append(s)
    return out


def poly_mul_schoolbook(p, q, counter=None):
    out = [0] * (len(p) + len(q) - 1)
    for i, pi in enumerate(p):
        for j, qj in enumerate(q):
            out[i + j] += pi * qj
            if counter is not None:
                counter["mults"] = counter.get("mults", 0) + 1
    return out


def _karatsuba(p, q, counter):
    """Equal power-of-two lengths in, full product (length 2n-1) out."""
    n = len(p)
    if n == 1:
        if counter is not None:
            counter["mults"] = counter.get("mults", 0) + 1
        return [p[0] * q[0]]
    m = n // 2
    p0, p1 = p[:m], p[m:]
    q0, q1 = q[:m], q[m:]
    low = _karatsuba(p0, q0, counter)
    high = _karatsuba(p1, q1, counter)
    mid = _karatsuba(
        [a + b for a, b in zip(p0, p1)],
        [a + b for a, b in zip(q0, q1)],
        counter,
    )
    out = [0] * (2 * n - 1)
    for i, v in enumerate(low):
        out[i] += v
    for i, v in enumerate(high):
        out[i + 2 * m] += v
    for i, v in enumerate(mid):
        out[i + m] += v - low[i] - high[i]
    return out


def poly_mul_karatsuba(p, q, counter=None):
    """Three half-size products instead of four: O(n^1.585). Exactly
    3^log2(n) scalar multiplications on power-of-two inputs."""
    need = len(p) + len(q) - 1
    n = 1
    while n < max(len(p), len(q)):
        n *= 2
    pp = list(p) + [0] * (n - len(p))
    qq = list(q) + [0] * (n - len(q))
    return _karatsuba(pp, qq, counter)[:need]


def poly_mul_fft(p, q, counter=None):
    """Convolution theorem: transform, multiply pointwise, invert,
    round. Exactness is checked, never assumed."""
    need = len(p) + len(q) - 1
    n = 1
    while n < need:
        n *= 2
    fp = fft(list(p) + [0] * (n - len(p)), counter=counter)
    fq = fft(list(q) + [0] * (n - len(q)), counter=counter)
    prod = []
    for a, b in zip(fp, fq):
        prod.append(a * b)
        if counter is not None:
            counter["mults"] = counter.get("mults", 0) + 1
    raw = fft(prod, invert=True, counter=counter)
    rounded = [round(x.real) for x in raw[:need]]
    max_err = max(abs(x.real - r) for x, r in zip(raw[:need], rounded))
    return rounded, max_err


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: agreement with the definition, and the exact op counts.
    for n in (2, 4, 8, 64, 256):
        x = [complex(rng.uniform(-5, 5), rng.uniform(-5, 5)) for _ in range(n)]
        c_f = {}
        got = fft(x, counter=c_f)
        want = naive_dft(x)
        assert max(abs(a - b) for a, b in zip(got, want)) < 1e-8
        assert c_f["mults"] == (n // 2) * int(math.log2(n))  # to the integer

    # Oracle 2: round-trip inversion and Parseval's theorem.
    for _ in range(50):
        n = 2 ** rng.randint(1, 9)
        x = [complex(rng.uniform(-5, 5), rng.uniform(-5, 5)) for _ in range(n)]
        X = fft(x)
        back = fft(X, invert=True)
        assert max(abs(a - b) for a, b in zip(back, x)) < 1e-9
        e_time = sum(abs(v) ** 2 for v in x)
        e_freq = sum(abs(v) ** 2 for v in X) / n
        assert abs(e_time - e_freq) < 1e-6 * max(e_time, 1.0)

    # Oracle 3: the headline ledger at n = 1,024, where BOTH ran.
    N = 1_024
    x = [complex(rng.uniform(-1, 1), 0) for _ in range(N)]
    c_naive = {}
    c_fast = {}
    slow = naive_dft(x, c_naive)
    fast = fft(x, counter=c_fast)
    assert max(abs(a - b) for a, b in zip(slow, fast)) < 1e-7
    assert c_naive["mults"] == N * N
    assert c_fast["mults"] == (N // 2) * 10

    # And the scale row: n = 65,536 measured for the FFT alone; the
    # naive count at that size is definitional (n^2), not run.
    N2 = 65_536
    c_big = {}
    fft([complex(rng.uniform(-1, 1), 0) for _ in range(N2)], counter=c_big)
    assert c_big["mults"] == (N2 // 2) * 16

    # Oracle 4: spectral analysis, the d-phrase itself. Three tones
    # hidden in noise; the top three spectrum bins must be exactly the
    # planted frequencies, and the amplitude must survive normalization.
    SN = 4_096
    tones = [(50, 1.0), (120, 0.7), (333, 0.4)]
    sig = []
    for t in range(SN):
        v = sum(amp * math.cos(2 * math.pi * f * t / SN) for f, amp in tones)
        sig.append(complex(v + rng.gauss(0, 0.1), 0))
    spec = fft(sig)
    mags = [(abs(spec[k]), k) for k in range(1, SN // 2)]
    top3 = {k for _, k in sorted(mags, reverse=True)[:3]}
    assert top3 == {f for f, _ in tones}, top3
    amp50 = 2 * abs(spec[50]) / SN
    assert abs(amp50 - 1.0) < 0.05, amp50

    # Oracle 5: the polynomial ladder, both rungs refereed. At 1,024
    # coefficients all three methods run and must agree exactly.
    P = [rng.randint(-9, 9) for _ in range(1_024)]
    Q = [rng.randint(-9, 9) for _ in range(1_024)]
    c_school = {}
    ref = poly_mul_schoolbook(P, Q, c_school)
    c_kar = {}
    kar = poly_mul_karatsuba(P, Q, c_kar)
    assert kar == ref
    c_conv = {}
    conv, err1k = poly_mul_fft(P, Q, c_conv)
    assert conv == ref  # exact after rounding
    assert err1k < 0.4, err1k
    assert c_school["mults"] == 1_024 * 1_024

    # At 8,192 coefficients the schoolbook is left home; Karatsuba and
    # the FFT referee each other and must agree to the coefficient.
    P2 = [rng.randint(-9, 9) for _ in range(8_192)]
    Q2 = [rng.randint(-9, 9) for _ in range(8_192)]
    c_kar2 = {}
    kar2 = poly_mul_karatsuba(P2, Q2, c_kar2)
    c_conv2 = {}
    conv2, err8k = poly_mul_fft(P2, Q2, c_conv2)
    assert kar2 == conv2
    assert err8k < 0.4, err8k

    print(f"contest: the full spectrum of an n-sample signal; complex multiplications counted exactly")
    print(f"  {'method':<26} {'mults':>15}   note")
    print(f"  {'Naive DFT, n=1,024':<26} {c_naive['mults']:>15,}   the definition, verified correct")
    print(f"  {'FFT, n=1,024':<26} {c_fast['mults']:>15,}   205x, and exactly (n/2)*log2 n")
    print(f"  {'FFT, n=65,536':<26} {c_big['mults']:>15,}   naive would be n^2 = 4,294,967,296 (not run)")
    print(f"spectral analysis at n=4,096: the top three bins are exactly the planted tones {sorted(f for f, _ in tones)}; amplitude recovered {amp50:.3f} vs 1.0")
    print(f"polynomial ladder, 1,024 coefficients (all agree exactly): schoolbook {c_school['mults']:,} * Karatsuba {c_kar['mults']:,} * FFT convolution {c_conv['mults']:,} (max float error {err1k:.2e}, rounded exact)")
    print(f"polynomial ladder, 8,192 coefficients (Karatsuba and FFT referee each other): Karatsuba {c_kar2['mults']:,} * FFT {c_conv2['mults']:,} ({c_kar2['mults'] / c_conv2['mults']:.1f}x apart and widening; float error {err8k:.2e})")
    print("OK: the definition agreed at five sizes with butterfly counts exact to the integer, 50 round-trips and Parseval held, the planted tones were found on top, and both convolution rungs are coefficient-exact against their referees")
