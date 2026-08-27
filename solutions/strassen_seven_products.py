# Puzzle 31: Strassen's algorithm x seven-product block split
# Multiply two n x n matrices exactly, below n^3 scalar multiplications,
# with every product verified by an independent randomized check.
#
# The pairing is the point. The control structure is divide and conquer on
# 2x2 block matrices: a product of n x n matrices is eight products of
# half-size blocks, which recursion turns into n^3 again, no progress. The
# heuristic is the 1969 identity: seven cunning block products (M1..M7)
# whose sums and differences assemble all four quadrants of the answer.
# One multiplication traded for eighteen additions per level, and the
# exponent falls from 3 to log2(7) = 2.807: measured below as 9,834,496
# multiplications (cutoff 16) where the classical method spends
# 16,777,216, and fewer total operations too. Every
# product on this page is audited by Freivalds' randomized probe, because
# a fast wrong answer is worth nothing.
import random


def classical(A, B, counter=None):
    n = len(A)
    m = len(B[0])
    k = len(B)
    Bt = [[B[r][c] for r in range(k)] for c in range(m)]  # transpose helps
    C = [[0] * m for _ in range(n)]
    mults = 0
    adds = 0
    for i in range(n):
        Ai = A[i]
        for j in range(m):
            Bj = Bt[j]
            s = 0
            for t in range(k):
                s += Ai[t] * Bj[t]
            mults += k
            adds += k - 1
            C[i][j] = s
    if counter is not None:
        counter["mults"] = counter.get("mults", 0) + mults
        counter["adds"] = counter.get("adds", 0) + adds
    return C


def mat_add(X, Y, counter=None, sign=1):
    n = len(X)
    if counter is not None:
        counter["adds"] = counter.get("adds", 0) + n * n
    if sign > 0:
        return [[X[i][j] + Y[i][j] for j in range(n)] for i in range(n)]
    return [[X[i][j] - Y[i][j] for j in range(n)] for i in range(n)]


def strassen(A, B, cutoff=16, counter=None):
    """Square power-of-two inputs; pad externally for other sizes."""
    n = len(A)
    if n <= cutoff:
        return classical(A, B, counter)
    h = n // 2
    q = lambda M, r, c: [row[c * h : c * h + h] for row in M[r * h : r * h + h]]
    A11, A12, A21, A22 = q(A, 0, 0), q(A, 0, 1), q(A, 1, 0), q(A, 1, 1)
    B11, B12, B21, B22 = q(B, 0, 0), q(B, 0, 1), q(B, 1, 0), q(B, 1, 1)
    M1 = strassen(mat_add(A11, A22, counter), mat_add(B11, B22, counter), cutoff, counter)
    M2 = strassen(mat_add(A21, A22, counter), B11, cutoff, counter)
    M3 = strassen(A11, mat_add(B12, B22, counter, -1), cutoff, counter)
    M4 = strassen(A22, mat_add(B21, B11, counter, -1), cutoff, counter)
    M5 = strassen(mat_add(A11, A12, counter), B22, cutoff, counter)
    M6 = strassen(mat_add(A21, A11, counter, -1), mat_add(B11, B12, counter), cutoff, counter)
    M7 = strassen(mat_add(A12, A22, counter, -1), mat_add(B21, B22, counter), cutoff, counter)
    C11 = mat_add(mat_add(M1, M4, counter), mat_add(M7, M5, counter, -1), counter)
    C12 = mat_add(M3, M5, counter)
    C21 = mat_add(M2, M4, counter)
    C22 = mat_add(mat_add(M1, M3, counter), mat_add(M6, M2, counter, -1), counter)
    C = [[0] * n for _ in range(n)]
    for i in range(h):
        C[i][:h] = C11[i]
        C[i][h:] = C12[i]
        C[h + i][:h] = C21[i]
        C[h + i][h:] = C22[i]
    return C


def strassen_padded(A, B, cutoff=16, counter=None):
    """Any square size: pad to the next power of two, run, crop."""
    n = len(A)
    m = 1
    while m < n:
        m *= 2
    if m == n:
        return strassen(A, B, cutoff, counter)
    Ap = [row + [0] * (m - n) for row in A] + [[0] * m for _ in range(m - n)]
    Bp = [row + [0] * (m - n) for row in B] + [[0] * m for _ in range(m - n)]
    Cp = strassen(Ap, Bp, cutoff, counter)
    return [row[:n] for row in Cp[:n]]


def freivalds(A, B, C, rng, probes=20, counter=None):
    """Is AB == C? Probe with random 0/1 vectors: A(Bv) vs Cv, O(n^2) per
    probe, error probability at most 2^-probes. Exact over the integers."""
    n = len(A)
    for _ in range(probes):
        v = [rng.randrange(2) for _ in range(n)]
        Bv = [sum(B[i][j] * v[j] for j in range(n)) for i in range(n)]
        ABv = [sum(A[i][j] * Bv[j] for j in range(n)) for i in range(n)]
        Cv = [sum(C[i][j] * v[j] for j in range(n)) for i in range(n)]
        if counter is not None:
            counter["probe_ops"] = counter.get("probe_ops", 0) + 3 * n * n
        if ABv != Cv:
            return False
    return True


def rand_matrix(n, rng, lo=-9, hi=9):
    return [[rng.randint(lo, hi) for _ in range(n)] for _ in range(n)]


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the 1969 identity itself, verified on scalars. For 500
    # random 2x2 SCALAR products, the seven Ms assemble the right entries.
    for _ in range(500):
        a11, a12, a21, a22 = (rng.randint(-99, 99) for _ in range(4))
        b11, b12, b21, b22 = (rng.randint(-99, 99) for _ in range(4))
        M1 = (a11 + a22) * (b11 + b22)
        M2 = (a21 + a22) * b11
        M3 = a11 * (b12 - b22)
        M4 = a22 * (b21 - b11)
        M5 = (a11 + a12) * b22
        M6 = (a21 - a11) * (b11 + b12)
        M7 = (a12 - a22) * (b21 + b22)
        assert M1 + M4 - M5 + M7 == a11 * b11 + a12 * b21
        assert M3 + M5 == a11 * b12 + a12 * b22
        assert M2 + M4 == a21 * b11 + a22 * b21
        assert M1 - M2 + M3 + M6 == a21 * b12 + a22 * b22

    # Oracle 2: agreement plus the independent auditor. Strassen (pure and
    # cutoff), classical, and Freivalds all concur, including odd sizes
    # via padding.
    for n in (4, 8, 16, 31, 33, 64, 100):
        A = rand_matrix(n, rng)
        B = rand_matrix(n, rng)
        C_ref = classical(A, B)
        C_str = strassen_padded(A, B, cutoff=8)
        assert C_str == C_ref, n
        assert freivalds(A, B, C_ref, rng), n
    # Pure recursion to the scalar base, at 64.
    A64 = rand_matrix(64, rng)
    B64 = rand_matrix(64, rng)
    c_pure = {}
    C_pure = strassen(A64, B64, cutoff=1, counter=c_pure)
    assert C_pure == classical(A64, B64)
    assert c_pure["mults"] == 7 ** 6, c_pure["mults"]  # exactly 7^log2(64)

    # Oracle 3: Freivalds catches corruption. Flip one entry and the probe
    # refuses within its budget.
    C_bad = [row[:] for row in C_pure]
    C_bad[13][40] += 1
    assert not freivalds(A64, B64, C_bad, rng), "the auditor must catch a lie"

    # Oracle 4: the ledger at n = 256, mult counts exact by construction.
    n = 256
    A = rand_matrix(n, rng, -5, 5)
    B = rand_matrix(n, rng, -5, 5)
    c_cls = {}
    C1 = classical(A, B, c_cls)
    assert c_cls["mults"] == n ** 3
    c_16 = {}
    C2 = strassen(A, B, cutoff=16, counter=c_16)
    assert C2 == C1
    assert c_16["mults"] == 7 ** 4 * 16 ** 3, c_16["mults"]
    assert freivalds(A, B, C2, rng)

    # The cutoff sweep: total scalar operations by recursion depth.
    sweep = {}
    for cutoff in (16, 32, 64, 128, 256):
        c = {}
        strassen(A, B, cutoff=cutoff, counter=c)
        sweep[cutoff] = (c["mults"], c.get("adds", 0))
    best_cut = min(sweep, key=lambda c: sum(sweep[c]))
    assert best_cut not in (256,), "some real recursion should beat pure classical on total ops"

    # Verification vs recomputation, priced.
    c_probe = {}
    assert freivalds(A, B, C2, rng, probes=20, counter=c_probe)
    recompute_ops = 2 * n ** 3

    print(f"contest: n = {n}, exact integer matrices; scalar operations:")
    print(f"  {'method':<26} {'multiplications':>16} {'additions':>13}")
    print(f"  {'Classical':<26} {c_cls['mults']:>16,} {c_cls['adds']:>13,}")
    print(f"  {'Strassen x cutoff 16':<26} {c_16['mults']:>16,} {c_16['adds']:>13,}")
    print(f"  {'Strassen pure (at n=64)':<26} {7 ** 6:>16,} {c_pure['adds']:>13,}   (7^6 exactly; 34M adds at 256: not run)")
    print("cutoff sweep at n=256, total ops (mults + adds):")
    for cut in sorted(sweep):
        m, a = sweep[cut]
        label = "  <- classical" if cut == 256 else ("  <- best" if cut == best_cut else "")
        print(f"    cutoff {cut:>3}: {m + a:>12,}{label}")
    print(f"verification: Freivalds audits the product in {c_probe['probe_ops']:,} ops vs {recompute_ops:,} to recompute ({recompute_ops // c_probe['probe_ops']}x)")
    print("OK: the seven-product identity verified on 500 scalar cases, all methods agree with the auditor, mult counts exact, the corrupted entry caught")
