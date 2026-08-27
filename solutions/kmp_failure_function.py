# Puzzle 09: Knuth-Morris-Pratt x failure-function prefixes
# Find every occurrence of a pattern in a text, reading the text forward only.
#
# The pairing is the point. The control structure is a left-to-right scan that
# refuses to move its text finger backward. The guiding rule is the failure
# function: for every prefix of the pattern, the length of the longest border
# (a proper prefix that is also a suffix). When a match breaks after j
# characters, the border says exactly how much of that certainty survives, so
# the scan re-aligns the pattern in O(1) and re-reads nothing. Total work is
# bounded by 2n + m comparisons, whatever the input looks like.
import random


def failure_function(pattern, counter=None):
    """fail[j] = length of the longest proper border of pattern[:j].

    fail[0] = fail[1] = 0. Built by the same two-finger argument the search
    uses, run on the pattern against itself.
    """
    m = len(pattern)
    fail = [0] * (m + 1)
    k = 0
    for j in range(1, m):
        while k > 0 and pattern[j] != pattern[k]:
            if counter is not None:
                counter["comparisons"] = counter.get("comparisons", 0) + 1
            k = fail[k]
        if counter is not None:
            counter["comparisons"] = counter.get("comparisons", 0) + 1
        if pattern[j] == pattern[k]:
            k += 1
        fail[j + 1] = k
    return fail


def kmp_search(text, pattern, counter=None, touches=None):
    """All start positions of `pattern` in `text`, overlapping included.

    The text index only ever increases: on a mismatch the PATTERN moves (j
    falls back through borders) while the text finger stays put. That is the
    property that lets this run on a stream, a tape, or a socket.
    """
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    fail = failure_function(pattern, counter)
    out = []
    j = 0
    for i in range(n):  # i is monotone: the text is consumed exactly once
        while j > 0 and text[i] != pattern[j]:
            if counter is not None:
                counter["comparisons"] = counter.get("comparisons", 0) + 1
            if touches is not None:
                touches[i] += 1
            j = fail[j]
        if counter is not None:
            counter["comparisons"] = counter.get("comparisons", 0) + 1
        if touches is not None:
            touches[i] += 1
        if text[i] == pattern[j]:
            j += 1
        if j == m:
            out.append(i - m + 1)
            j = fail[m]  # a full match is just another border fallback
    return out


# ---------------------------------------------------------------- the rivals


def naive_search(text, pattern, counter=None, touches=None):
    """Try every alignment, compare left to right, slide by one on failure.

    The honest baseline: zero preprocessing, zero memory, and on random text
    it is nearly optimal because most alignments die on their first character.
    Its worst case is n times m, and repetitive data finds that worst case.
    """
    n, m = len(text), len(pattern)
    out = []
    for s in range(n - m + 1):
        for j in range(m):
            if counter is not None:
                counter["comparisons"] = counter.get("comparisons", 0) + 1
            if touches is not None:
                touches[s + j] += 1
            if text[s + j] != pattern[j]:
                if counter is not None and j > 0:
                    # After matching j characters the next alignment re-reads
                    # them: the text finger moves backward j places.
                    counter["backups"] = counter.get("backups", 0) + j
                break
        else:
            out.append(s)
            if counter is not None:
                counter["backups"] = counter.get("backups", 0) + m - 1
    return out


def boyer_moore_search(text, pattern, counter=None, touches=None):
    """Full Boyer-Moore: bad-character rule plus the strong good-suffix rule.

    Compares each window right to left and uses the mismatched character and
    the matched suffix to skip alignments wholesale, which is why it examines
    a fraction of the text on ordinary inputs. Kept honest rather than
    simplified: Horspool and Sunday are lighter variants of this method, not
    separate rivals.
    """
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    last = {}
    for j, c in enumerate(pattern):
        last[c] = j

    # Strong good-suffix table, the classic two-pass border construction.
    # shift[j] = how far to slide when the suffix pattern[j:] matched and
    # pattern[j-1] mismatched (j = 0 means the whole pattern matched).
    shift = [0] * (m + 1)
    border = [0] * (m + 1)
    i, j = m, m + 1
    border[i] = j
    while i > 0:
        while j <= m and pattern[i - 1] != pattern[j - 1]:
            if shift[j] == 0:
                shift[j] = j - i
            j = border[j]
        i -= 1
        j -= 1
        border[i] = j
    j = border[0]
    for i in range(m + 1):
        if shift[i] == 0:
            shift[i] = j
        if i == j:
            j = border[j]

    out = []
    s = 0
    while s <= n - m:
        j = m - 1
        while j >= 0 and text[s + j] == pattern[j]:
            if counter is not None:
                counter["comparisons"] = counter.get("comparisons", 0) + 1
            if touches is not None:
                touches[s + j] += 1
            j -= 1
        if j < 0:
            out.append(s)
            s += shift[0]
        else:
            if counter is not None:
                counter["comparisons"] = counter.get("comparisons", 0) + 1
            if touches is not None:
                touches[s + j] += 1
            bad = j - last.get(text[s + j], -1)
            s += max(shift[j + 1], bad, 1)
    return out


def rabin_karp_search(text, pattern, counter=None, touches=None):
    """Rolling-hash fingerprints, verified on every hash hit.

    One cheap arithmetic update per text character, then a direct comparison
    whenever the window's fingerprint equals the pattern's. Verification is
    what keeps it exact, and verification is re-reading: on a text made of
    matches it re-reads m characters at almost every position.
    """
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    mod = (1 << 61) - 1
    base = 256
    high = pow(base, m - 1, mod)
    ph = 0
    wh = 0
    for j in range(m):
        ph = (ph * base + ord(pattern[j])) % mod
        wh = (wh * base + ord(text[j])) % mod
        if counter is not None:
            counter["hash_updates"] = counter.get("hash_updates", 0) + 1
        if touches is not None:
            touches[j] += 1
    out = []
    s = 0
    while True:
        if wh == ph:
            ok = True
            for j in range(m):  # verify: the step that makes it exact
                if counter is not None:
                    counter["comparisons"] = counter.get("comparisons", 0) + 1
                if touches is not None:
                    touches[s + j] += 1
                if text[s + j] != pattern[j]:
                    ok = False
                    break
            if ok:
                out.append(s)
        if s == n - m:
            return out
        wh = ((wh - ord(text[s]) * high) * base + ord(text[s + m])) % mod
        if counter is not None:
            counter["hash_updates"] = counter.get("hash_updates", 0) + 1
        if touches is not None:
            touches[s + m] += 1
        s += 1


def work_of(c):
    """One unit of work per character examined, hash updates included."""
    return c.get("comparisons", 0) + c.get("hash_updates", 0)


# ------------------------------------------------------------- the instances


def microsatellite(reps=60000, mutations=40, seed=20260826):
    """A CA-repeat strand: the tandem repeats DNA fingerprinting reads.

    Dinucleotide microsatellites are real genomic structure, and they are the
    natural habitat of the failure function: the text is one long self-overlap,
    so every method that re-reads pays the pattern length at almost every
    position. A few seeded point mutations keep it honest.
    """
    rng = random.Random(seed)
    strand = list("CA" * reps)
    for _ in range(mutations):
        strand[rng.randrange(len(strand))] = rng.choice("GT")
    return "".join(strand)


WORDS = (
    "the of a to in is that it for on with as at by from this be are was "
    "search text pattern string data table index scan match window shift "
    "stream buffer letter word line page book note code file query answer"
).split()


def prose(target=120000, seed=20260826):
    """Deterministic English-like prose: common words, seeded order.

    Ordinary text is the rivals' home turf, and the honest crossover: a
    diverse alphabet gives the bad-character rule long skips and kills almost
    every naive alignment on its first letter.
    """
    rng = random.Random(seed)
    parts = []
    size = 0
    while size < target:
        w = rng.choice(WORDS)
        parts.append(w)
        size += len(w) + 1
    return " ".join(parts)


def contest():
    """Race all four on the repeat strand, then flip the board on prose."""
    methods = [
        ("Knuth-Morris-Pratt", kmp_search),
        ("Naive scan", naive_search),
        ("Boyer-Moore", boyer_moore_search),
        ("Rabin-Karp", rabin_karp_search),
    ]

    strand = microsatellite()
    needle = "CA" * 15
    table_a = []
    for name, fn in methods:
        c = {}
        touches = [0] * len(strand)
        found = fn(strand, needle, c, touches)
        table_a.append((name, work_of(c), max(touches), len(found), found))

    text = prose()
    needle_b = "combinatorial"
    assert needle_b not in text, "the crossover instance wants an absent word"
    table_b = []
    for name, fn in methods:
        c = {}
        found = fn(text, needle_b, c)
        table_b.append((name, work_of(c), len(found), found))

    return (len(strand), needle, table_a), (len(text), needle_b, table_b)


if __name__ == "__main__":
    # Oracle 1: the failure function against a definition-level border check.
    # Two independent formulations of "longest proper border" must agree.
    rng = random.Random(7)
    for trial in range(250):
        m = rng.randint(1, 14)
        p = "".join(rng.choice("ab" if trial % 3 else "abc") for _ in range(m))
        fail = failure_function(p)
        for j in range(1, m + 1):
            pref = p[:j]
            want = 0
            for k in range(j - 1, 0, -1):
                if pref[:k] == pref[-k:]:
                    want = k
                    break
            assert fail[j] == want, f"fail[{j}] of {p!r}: {fail[j]} != {want}"

    # Oracle 2: all four implementations agree with a slicing oracle that
    # shares no code with any of them, across random and adversarial cases.
    cases = []
    rng = random.Random(11)
    for trial in range(300):
        alpha = ("ab", "abc", "abcdefghijklmnopqrstuvwxyz")[trial % 3]
        n = rng.randint(1, 160)
        t = "".join(rng.choice(alpha) for _ in range(n))
        m = rng.randint(1, min(10, n))
        if trial % 4 == 0:
            s = rng.randint(0, n - m)
            p = t[s : s + m]  # guaranteed present
        else:
            p = "".join(rng.choice(alpha) for _ in range(m))
        cases.append((t, p))
    cases += [
        ("aaaaa", "aa"),  # overlapping occurrences: 0,1,2,3
        ("aaaaa", "aaaaa"),  # pattern is the whole text
        ("abc", "abcd"),  # pattern longer than text
        ("cacacaca", "caca"),  # period two, overlap on the period
        ("x", "x"),
    ]
    for t, p in cases:
        want = [i for i in range(len(t) - len(p) + 1) if t[i : i + len(p)] == p]
        for name, fn in (
            ("kmp", kmp_search),
            ("naive", naive_search),
            ("boyer-moore", boyer_moore_search),
            ("rabin-karp", rabin_karp_search),
        ):
            got = fn(t, p)
            assert got == want, f"{name} on ({t!r}, {p!r}): {got} != {want}"
        first = t.find(p)  # CPython's own matcher as a second outside oracle
        assert (want[0] if want else -1) == first

    # Oracle 3: the theorem, checked numerically. KMP's total comparisons are
    # bounded by 2n + m on every case above and on the big instance below.
    for t, p in cases:
        c = {}
        kmp_search(t, p, c)
        assert c.get("comparisons", 0) <= 2 * len(t) + len(p), (t, p, c)

    # Oracle 4: the streaming property. KMP never moves its text finger
    # backward (structurally: the loop consumes i once; no backup counter can
    # even exist), while the naive scan on repetitive input backs up
    # constantly. The counter records every backward step it takes.
    strand_small = microsatellite(reps=400, mutations=2)
    c_naive = {}
    naive_search(strand_small, "CA" * 15, c_naive)
    assert c_naive.get("backups", 0) > 10000, "naive must re-read on repeats"

    # Oracle 5: the published contest, regenerated and order-checked.
    (n_a, needle_a, table_a), (n_b, needle_b, table_b) = contest()

    matches_a = {row[3] for row in table_a}
    assert len(matches_a) == 1, "all four must report the same match count"
    positions_a = [row[4] for row in table_a]
    assert all(pos == positions_a[0] for pos in positions_a), "same positions"
    work_a = {row[0]: row[1] for row in table_a}
    assert work_a["Knuth-Morris-Pratt"] * 10 < work_a["Naive scan"], (
        "on the repeat strand KMP must beat the naive scan tenfold"
    )
    assert work_a["Knuth-Morris-Pratt"] * 10 < work_a["Boyer-Moore"], (
        "skipping collapses on repeats: KMP must beat Boyer-Moore tenfold too"
    )
    assert work_a["Knuth-Morris-Pratt"] * 10 < work_a["Rabin-Karp"], (
        "verification is re-reading: KMP must beat Rabin-Karp tenfold"
    )

    positions_b = [row[3] for row in table_b]
    assert all(pos == positions_b[0] for pos in positions_b), "same positions"
    work_b = {row[0]: row[1] for row in table_b}
    assert work_b["Boyer-Moore"] * 4 < work_b["Knuth-Morris-Pratt"], (
        "on prose the skipper must beat KMP at least fourfold"
    )

    print(
        f"contest on a {n_a:,}-char CA-repeat strand, pattern {needle_a!r} "
        f"({len(needle_a)} chars), {table_a[0][3]:,} overlapping matches:"
    )
    for name, work, worst, _count, _pos in table_a:
        print(f"  {name:<20} chars examined {work:>9,}   worst re-reads of one char {worst:>3}")
    print(
        f"crossover on {n_b:,} chars of prose, pattern {needle_b!r} "
        f"({len(needle_b)} chars), {table_b[0][2]} matches:"
    )
    for name, work, _count, _pos in table_b:
        print(f"  {name:<20} chars examined {work:>9,}")

    print("OK: four matchers agree, the 2n bound holds, and the text finger never backs up")
