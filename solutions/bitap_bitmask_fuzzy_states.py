# Puzzle 66: Bitap x bitmask fuzzy states
# Find a pattern in text WITH typos allowed: up to k insertions,
# deletions, or substitutions: scanning the text once and doing the
# dynamic programming inside machine words.
#
# The pairing is the point. The algorithm is the scan: one pass over
# the text, constant work per character, reporting every position
# where a match ends. The heuristic is the bitmask state register:
# bit j of R_d means "the pattern's first j+1 characters match a
# suffix of the text read so far, with at most d errors". One
# shift-AND updates ALL pattern positions at once: the entire DP
# column lives in k+1 machine words, and the update is three boolean
# ops per error level. The referee is the Sellers DP (the live
# Wagner-Fischer unit's approximate-matching form), run cell by cell:
# bitap must agree with it on EVERY end position across 400
# exhaustive small cases and the full client text. The meter counts
# word-ops against DP cells: the same arithmetic, packed 24-wide.
import random


def masks(pattern, alphabet):
    B = {c: 0 for c in alphabet}
    for j, ch in enumerate(pattern):
        B[ch] |= 1 << j
    return B


def bitap_ends(text, pattern, k, counter=None):
    """End positions i (1-based) where pattern matches text[..i] with
    edit distance <= k. Wu-Manber shift-AND, k+1 registers."""
    m = len(pattern)
    B = masks(pattern, set(text) | set(pattern))
    accept = 1 << (m - 1)
    # R[d] starts with d leading bits set: the first d pattern chars
    # may be deleted before any text is read.
    R = [(1 << d) - 1 for d in range(k + 1)]
    out = []
    for i, c in enumerate(text, 1):
        Bc = B.get(c, 0)
        prev = R[0]
        R[0] = ((R[0] << 1) | 1) & Bc
        if counter is not None:
            counter["word_ops"] = counter.get("word_ops", 0) + 1
        for d in range(1, k + 1):
            cur = R[d]
            R[d] = (
                (((cur << 1) | 1) & Bc)   # match/extend with d errors
                | ((prev << 1) | 1)        # substitution of c
                | (R[d - 1] << 1)          # deletion of a pattern char
                | prev                     # insertion of c into pattern
            )
            prev = cur
            if counter is not None:
                counter["word_ops"] += 1
        if R[k] & accept:
            out.append(i)
    return out


def sellers_ends(text, pattern, k, counter=None):
    """The DP referee: D[p] = edit distance of pattern[:p] to the best
    suffix ending at the current text position (Sellers 1980 form of
    the live Wagner-Fischer table)."""
    m = len(pattern)
    D = list(range(m + 1))
    out = []
    for i, c in enumerate(text, 1):
        prev_diag = D[0]
        D[0] = 0
        for p in range(1, m + 1):
            tmp = D[p]
            D[p] = min(
                prev_diag + (pattern[p - 1] != c),
                D[p] + 1,
                D[p - 1] + 1,
            )
            prev_diag = tmp
            if counter is not None:
                counter["cells"] = counter.get("cells", 0) + 1
        if D[m] <= k:
            out.append(i)
    return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: exhaustive agreement with the DP referee. 400 random
    # small cases across alphabets, pattern lengths, and k = 0..2:
    # every end position, both directions.
    for trial in range(400):
        sigma = "ab" if trial % 3 == 0 else "abcd"
        n = rng.randint(5, 60)
        m = rng.randint(2, min(9, n))
        text = "".join(rng.choice(sigma) for _ in range(n))
        pattern = "".join(rng.choice(sigma) for _ in range(m))
        for k in range(0, 3):
            got = bitap_ends(text, pattern, k)
            want = sellers_ends(text, pattern, k)
            assert got == want, (text, pattern, k, got, want)

    # Oracle 2: exact matching (k=0) equals the naive scan on longer
    # random texts.
    for _ in range(50):
        text = "".join(rng.choice("abc") for _ in range(2000))
        pattern = "".join(rng.choice("abc") for _ in range(6))
        naive = [
            i + len(pattern)
            for i in range(len(text) - len(pattern) + 1)
            if text[i : i + len(pattern)] == pattern
        ]
        assert bitap_ends(text, pattern, 0) == naive

    # Oracle 3: the client. A 120,000-base synthetic genome; a
    # 24-base probe planted at position 71,003 with ONE substituted
    # base. Exact search misses; bitap with k=1 pins the site.
    n = 120_000
    genome = list("".join(rng.choice("acgt") for _ in range(n)))
    probe = "".join(rng.choice("acgt") for _ in range(24))
    site = 71_003
    mutated = list(probe)
    pos = rng.randrange(24)
    old = mutated[pos]
    mutated[pos] = rng.choice([b for b in "acgt" if b != old])
    genome[site : site + 24] = mutated
    genome = "".join(genome)

    assert genome.find(probe) == -1                # exact search: blind
    assert bitap_ends(genome, probe, 0) == []      # k=0 bitap agrees
    c_b = {}
    ends1 = bitap_ends(genome, probe, 1, c_b)
    assert site + 24 in ends1                      # the planted site, pinned
    c_d = {}
    ends_dp = sellers_ends(genome, probe, 1, c_d)
    assert ends1 == ends_dp                        # referee agrees at scale

    # Oracle 4: the meter. Same instance, same answers: the DP paid
    # n*m cells; bitap paid (k+1) word-ops per character, each op
    # processing all 24 pattern positions at once.
    assert c_d["cells"] == n * 24
    assert c_b["word_ops"] == n * 2
    ratio = c_d["cells"] / c_b["word_ops"]
    assert ratio == 12.0

    # Oracle 5: the word-size honesty. In C the mask dies at 64 bits;
    # Python's integers keep going, but each "word op" now spans
    # multiple machine words. A 96-char pattern still agrees with the
    # referee: the cliff is a cost model, not a correctness cliff,
    # and the page says which.
    long_pat = "".join(rng.choice("acgt") for _ in range(96))
    window = genome[:4_000] + long_pat[:60] + genome[4_000:8_000]
    assert bitap_ends(window, long_pat, 2) == sellers_ends(window, long_pat, 2)

    print("contest: one 24-base probe, one planted typo, 120,000 bases; referee: the Sellers DP agreeing on every end position, here and on 400 exhaustive small cases")
    print(f"  {'method':<26} {'ops':>12}   outcome")
    print(f"  {'Exact search (find)':<26} {'~n':>12}   MISSES: one substitution is invisibility")
    print(f"  {'Sellers DP (WF form)':<26} {c_d['cells']:>12,}   finds the site: n*m cells, one at a time")
    print(f"  {'Bitap, k=1':<26} {c_b['word_ops']:>12,}   finds the site: (k+1) word-ops/char, 24 lanes each")
    print(f"the packing, measured: {c_d['cells']:,} DP cells vs {c_b['word_ops']:,} word-ops = {ratio:.0f}x fewer operations, each op updating all 24 pattern positions in one shift-AND")
    print(f"the planted site: probe x 1 substitution at base {site:,}: end position {site + 24:,} reported by bitap k=1 and the referee, missed by exact search and by k=0")
    print("OK: 400 exhaustive small cases at k=0..2 against the Sellers referee, exact mode equal to the naive scan, the planted-typo client pinned at scale with referee agreement, the 12x op packing measured, and the 96-char pattern (past C's word cliff) still exact")
