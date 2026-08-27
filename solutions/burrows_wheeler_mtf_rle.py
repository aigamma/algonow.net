# Puzzle 75: Burrows-Wheeler compression x move-to-front plus RLE
# Sort every rotation of the text, keep the LAST column, and the
# result is reversible: and suddenly compressible, because letters
# with the same context land next to each other.
#
# The pairing is the point. The algorithm is the transform itself:
# built here via the live suffix-array unit's prefix doubling
# (bwt[i] = s[sa[i]-1]), and inverted by the LF-mapping miracle: the
# last column, alone, reconstructs the text. The heuristic is the
# back end that CASHES the clustering: move-to-front turns runs of
# recently-seen symbols into small integers, and RLE folds the
# zeros. The referees are exact and adversarial: byte-exact round
# trips at every stage on 300 mixed strings and every corpus; the
# PERMUTATION SHOCKER asserted to the bit: the order-0 entropy of
# the BWT output EQUALS the raw text's exactly (a permutation
# changes no symbol counts: the transform compresses NOTHING by
# itself): while the same MTF meter shows what the transform
# actually did: after BWT, 71% of MTF output is a 0 or 1, and the
# order-0 entropy falls from 4.16 to 2.14 bits per symbol: context
# converted into locality, so a dumb coder becomes smart.
import math
import random
from collections import Counter


def suffix_array(s):
    """Prefix doubling, O(n log^2 n): the live suffix-array unit's
    road, reused as the BWT constructor."""
    n = len(s)
    rank = [ord(c) for c in s]
    sa = list(range(n))
    k = 1
    tmp = [0] * n
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key)
        tmp[sa[0]] = 0
        for j in range(1, n):
            tmp[sa[j]] = tmp[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = tmp[:]
        if rank[sa[-1]] == n - 1:
            return sa
        k *= 2


SENTINEL = "\x00"


def bwt(s):
    """s must not contain the sentinel; returns the last column of
    the sorted rotations of s + SENTINEL."""
    t = s + SENTINEL
    sa = suffix_array(t)
    # sorting suffixes of a sentinel-terminated string == sorting
    # rotations: bwt[i] is the char before each suffix.
    return "".join(t[i - 1] for i in sa)


def ibwt(last):
    """LF-mapping inversion: counts + ranks, O(n)."""
    n = len(last)
    counts = Counter(last)
    first_pos = {}
    total = 0
    for c in sorted(counts):
        first_pos[c] = total
        total += counts[c]
    seen = {}
    lf = [0] * n
    for i, c in enumerate(last):
        r = seen.get(c, 0)
        seen[c] = r + 1
        lf[i] = first_pos[c] + r
    # Walk backward from row 0 (the sentinel-first rotation: the
    # sentinel sorts smallest): L[i] is the char BEFORE that
    # rotation's start, and LF hops to its row: the text emerges
    # last-char-first.
    out = []
    i = 0
    for _ in range(n - 1):
        out.append(last[i])
        i = lf[i]
    return "".join(reversed(out))


def mtf_encode(s, alphabet):
    table = list(alphabet)
    out = []
    for c in s:
        i = table.index(c)
        out.append(i)
        table.pop(i)
        table.insert(0, c)
    return out


def mtf_decode(codes, alphabet):
    table = list(alphabet)
    out = []
    for i in codes:
        c = table[i]
        out.append(c)
        table.pop(i)
        table.insert(0, c)
    return "".join(out)


def rle_encode(codes):
    """Fold runs of zeros (the MTF hot symbol) into (0, runlen)."""
    out = []
    i = 0
    while i < len(codes):
        if codes[i] == 0:
            j = i
            while j < len(codes) and codes[j] == 0:
                j += 1
            out.append((0, j - i))
            i = j
        else:
            out.append((codes[i], 1))
            i += 1
    return out


def rle_decode(pairs):
    out = []
    for v, r in pairs:
        out.extend([v] * r)
    return out


def entropy_bits(seq):
    """Order-0 Shannon entropy in bits per symbol."""
    n = len(seq)
    c = Counter(seq)
    return -sum((k / n) * math.log2(k / n) for k in c.values())


def mean_run(seq):
    runs = 1
    for a, b in zip(seq, seq[1:]):
        runs += a != b
    return len(seq) / runs


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: round trips at every stage, 300 mixed strings.
    alpha = [SENTINEL] + [chr(c) for c in range(32, 127)]
    for trial in range(300):
        n = rng.randint(1, 200)
        if trial % 3 == 0:
            s = "".join(rng.choice("ab") for _ in range(n))
        elif trial % 3 == 1:
            s = "".join(rng.choice("the quick fox ") for _ in range(n))
        else:
            s = "".join(chr(rng.randint(32, 126)) for _ in range(n))
        last = bwt(s)
        assert sorted(last) == sorted(s + SENTINEL)  # a permutation, provably
        assert ibwt(last) == s                        # and reversible
        codes = mtf_encode(last, alpha)
        assert mtf_decode(codes, alpha) == last
        assert rle_decode(rle_encode(codes)) == codes

    # The corpus: english-ish, deterministic (as the LZW unit built).
    vocab = (
        "the transform sorts every rotation and keeps the last column "
        "because letters that share a context become neighbors there "
    ).split()
    text = " ".join(rng.choice(vocab) for _ in range(3_400))
    n = len(text)
    last = bwt(text)
    assert ibwt(last) == text  # byte-exact at scale

    # Oracle 2: THE PERMUTATION SHOCKER, exact. The BWT output has
    # the same symbol counts as the input (plus the sentinel), so its
    # order-0 entropy is IDENTICAL: the transform compresses nothing
    # by itself.
    h_raw = entropy_bits(text + SENTINEL)
    h_bwt = entropy_bits(last)
    assert abs(h_raw - h_bwt) < 1e-12

    # Oracle 3: what the transform DID do: clustering, measured.
    run_raw = mean_run(text)
    run_bwt = mean_run(last)
    assert run_bwt > 2.2 * run_raw

    # Oracle 4: MTF cashes the clustering. Same coder, two inputs.
    m_raw = mtf_encode(text, alpha)
    m_bwt = mtf_encode(last, alpha)
    small_raw = sum(1 for v in m_raw if v <= 1) / len(m_raw)
    small_bwt = sum(1 for v in m_bwt if v <= 1) / len(m_bwt)
    h_mtf_raw = entropy_bits(m_raw)
    h_mtf_bwt = entropy_bits(m_bwt)
    assert small_bwt > 2 * small_raw
    assert h_mtf_bwt < 0.75 * h_mtf_raw
    assert h_mtf_bwt < 0.75 * h_raw  # the pipeline beats raw order-0

    # Oracle 5: RLE folds what MTF exposed: total symbols after RLE.
    r_bwt = rle_encode(m_bwt)
    r_raw = rle_encode(m_raw)
    assert len(r_bwt) < 0.8 * len(m_bwt)   # zeros folded
    assert len(r_raw) > 0.95 * len(m_raw)  # nothing to fold without BWT

    print(f"contest: a {n:,}-char english-ish corpus through the bzip2-shaped pipeline; referee: byte-exact round trips at every stage, and entropy identities asserted to the bit")
    print(f"  {'stage':<26} {'H0 bits/sym':>11} {'mean run':>9} {'<=1 frac':>9}")
    print(f"  {'raw text':<26} {h_raw:>11.2f} {run_raw:>9.2f} {'-':>9}")
    print(f"  {'BWT(last column)':<26} {h_bwt:>11.2f} {run_bwt:>9.2f} {'-':>9}   SAME entropy: a permutation compresses nothing")
    print(f"  {'MTF(raw)':<26} {h_mtf_raw:>11.2f} {'-':>9} {small_raw:>9.1%}   the coder without the transform: little to grab")
    print(f"  {'MTF(BWT)':<26} {h_mtf_bwt:>11.2f} {'-':>9} {small_bwt:>9.1%}   context turned into locality: the coder got smart")
    print(f"the shocker, exact: H0(raw) == H0(bwt) to the bit ({h_raw:.10f}): the transform moves information, never removes it: MTF+RLE is where the bytes die (RLE folded MTF(BWT) to {len(r_bwt):,} symbols from {len(m_bwt):,}; on raw, {len(r_raw):,}: nothing to fold)")
    print(f"the constructor: the live suffix-array unit's prefix doubling builds the transform (bwt[i] = s[sa[i]-1]); the LF-mapping inverts the last column alone: 300 round trips byte-exact")
    print("OK: round trips at every stage on 300 strings and the corpus, the permutation identity exact, clustering and MTF gain measured, RLE fold measured with its raw-side null result, and the SA-built transform inverted by LF everywhere")
