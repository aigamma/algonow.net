# Puzzle 44: Boyer-Moore x bad-character and good-suffix rules
# Find a pattern in a text while reading FEWER characters than the text
# contains: sublinear search, measured, on this repository's own prose.
#
# The pairing is the point. The algorithm is the right-to-left scan: at
# each alignment, compare the pattern from its LAST character backward,
# so a mismatch arrives holding maximum information about what the text
# just revealed. The heuristics are the two precomputed skip tables that
# spend that information: the bad-character rule (slide until the
# mismatched text character lines up under its rightmost occurrence in
# the pattern, or past it) and the good-suffix rule (slide until the
# already-matched suffix re-aligns with another of its occurrences).
# Take the larger shift. On English text the alignment leaps clear over
# most of the haystack: character inspections measured at a FRACTION of
# n, shrinking as the pattern grows: the property no left-to-right
# method can have. The honest edges are measured too: binary alphabets
# collapse the skips, and the classic a^n / a^m worst case goes
# quadratic without Galil's patch.
import random
from pathlib import Path


def occurrences_ref(text, pat):
    """The stdlib referee: str.find in a loop."""
    out = []
    i = text.find(pat)
    while i != -1:
        out.append(i)
        i = text.find(pat, i + 1)
    return out


def naive_search(text, pat, counter=None):
    n, m = len(text), len(pat)
    out = []
    for i in range(n - m + 1):
        j = 0
        while j < m:
            if counter is not None:
                counter["chars"] = counter.get("chars", 0) + 1
            if text[i + j] != pat[j]:
                break
            j += 1
        if j == m:
            out.append(i)
    return out


def kmp_search(text, pat, counter=None):
    m = len(pat)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k and pat[i] != pat[k]:
            k = fail[k - 1]
        if pat[i] == pat[k]:
            k += 1
        fail[i] = k
    out = []
    k = 0
    for i, c in enumerate(text):
        if counter is not None:
            counter["chars"] = counter.get("chars", 0) + 1
        while k and c != pat[k]:
            k = fail[k - 1]
        if c == pat[k]:
            k += 1
        if k == m:
            out.append(i - m + 1)
            k = fail[k - 1]
    return out


def horspool_search(text, pat, counter=None):
    """The 1980 simplification: bad-character shift only, keyed on the
    text character under the pattern's last position."""
    n, m = len(text), len(pat)
    if m == 0 or n < m:
        return []
    shift = {}
    for j in range(m - 1):
        shift[pat[j]] = m - 1 - j
    out = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0:
            if counter is not None:
                counter["chars"] = counter.get("chars", 0) + 1
            if text[i + j] != pat[j]:
                break
            j -= 1
        if j < 0:
            out.append(i)
            i += shift.get(text[i + m - 1], m) if i + m - 1 < n else 1
        else:
            i += shift.get(text[i + m - 1], m)
    return out


def build_good_suffix(pat):
    """Classic good-suffix table: shift[j] = slide after a mismatch at
    pattern position j (having matched pat[j+1:])."""
    m = len(pat)
    shift = [m] * (m + 1)
    border = [0] * (m + 1)
    i, j = m, m + 1
    border[i] = j
    while i > 0:
        while j <= m and pat[i - 1] != pat[j - 1]:
            if shift[j] == m:
                shift[j] = j - i
            j = border[j]
        i -= 1
        j -= 1
        border[i] = j
    j = border[0]
    for i in range(m + 1):
        if shift[i] == m:
            shift[i] = j
        if i == j:
            j = border[j]
    return shift


def boyer_moore_search(text, pat, counter=None):
    n, m = len(text), len(pat)
    if m == 0 or n < m:
        return []
    last = {}
    for j, c in enumerate(pat):
        last[c] = j
    gs = build_good_suffix(pat)
    out = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0:
            if counter is not None:
                counter["chars"] = counter.get("chars", 0) + 1
            if text[i + j] != pat[j]:
                break
            j -= 1
        if j < 0:
            out.append(i)
            i += gs[0]
        else:
            bad = j - last.get(text[i + j], -1)
            i += max(bad, gs[j + 1], 1)
    return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: all four methods equal the stdlib referee, on alphabets
    # chosen to hurt: binary (worst skips), 4-letter, English-like, and
    # patterns that do and do not occur, overlapping included.
    for trial in range(600):
        sigma = rng.choice(["ab", "abcd", "abcdefgh", " ethanoisr"])
        n = rng.randint(1, 200)
        text = "".join(rng.choice(sigma) for _ in range(n))
        m = rng.randint(1, min(12, n))
        if rng.random() < 0.5 and n >= m:
            k = rng.randint(0, n - m)
            pat = text[k : k + m]  # guaranteed present
        else:
            pat = "".join(rng.choice(sigma) for _ in range(m))
        want = occurrences_ref(text, pat)
        assert naive_search(text, pat) == want
        assert kmp_search(text, pat) == want
        assert horspool_search(text, pat) == want
        assert boyer_moore_search(text, pat) == want, (text, pat)

    # Oracle 2: sublinearity on this site's own prose, and the leap
    # grows with the pattern. Character inspections per text character.
    doc = (Path(__file__).resolve().parent.parent / "docs" / "OVERNIGHT-PLAN.md").read_text(
        encoding="utf-8"
    )
    n = len(doc)
    ratios = {}
    for m_len in (4, 8, 16, 32):
        pat = doc[1000 : 1000 + m_len]  # a real slice of the prose
        c_bm = {}
        got = boyer_moore_search(doc, pat, c_bm)
        assert got == occurrences_ref(doc, pat)
        ratios[m_len] = c_bm["chars"] / n
    assert ratios[4] < 1.0          # sublinear already at m = 4
    assert ratios[32] < ratios[8] < ratios[4]  # longer pattern, longer leaps
    assert ratios[32] < 0.25

    # Oracle 3: the contest on one real pattern.
    pat = "the algorithm"
    assert pat in doc
    want = occurrences_ref(doc, pat)
    c_n, c_k, c_h, c_b = {}, {}, {}, {}
    assert naive_search(doc, pat, c_n) == want
    assert kmp_search(doc, pat, c_k) == want
    assert horspool_search(doc, pat, c_h) == want
    assert boyer_moore_search(doc, pat, c_b) == want
    assert c_k["chars"] >= n              # left-to-right must read it all
    assert c_b["chars"] < 0.35 * n        # the leap, asserted

    # Oracle 4: the small-alphabet story, measured, and it is BETTER
    # than the folklore. On binary text the bad-character shift
    # collapses (the mismatched character is nearly always in the
    # pattern), and Horspool, which has nothing else, reads MORE than
    # the text: 1.49n. Full Boyer-Moore is rescued by the good-suffix
    # rule: 0.58n. On English the two rules tie almost exactly: the
    # good-suffix table earns its keep precisely where alphabets are
    # small. This is the measured reason the second rule exists.
    btext = "".join(rng.choice("ab") for _ in range(50_000))
    bpat = "".join(rng.choice("ab") for _ in range(12))
    c_bin_bm, c_bin_h = {}, {}
    assert boyer_moore_search(btext, bpat, c_bin_bm) == occurrences_ref(btext, bpat)
    assert horspool_search(btext, bpat, c_bin_h) == occurrences_ref(btext, bpat)
    bm_bin = c_bin_bm["chars"] / len(btext)
    h_bin = c_bin_h["chars"] / len(btext)
    assert h_bin > 1.0          # bad-char alone reads MORE than the text
    assert bm_bin < 0.8         # good-suffix rescues the small alphabet
    assert bm_bin > 0.3         # but English-grade leaps are gone: honesty
    assert abs(c_h["chars"] - c_b["chars"]) <= 0.02 * c_b["chars"]  # tie on prose

    # Oracle 5: the classic worst case, measured. All-a text, all-a
    # pattern: every alignment fully matches, the shift is the period
    # (1), and inspections go quadratic-ish. Galil's rule is the fix,
    # cited on the page, not implemented here.
    wtext = "a" * 20_000
    wpat = "a" * 20
    c_w = {}
    got_w = boyer_moore_search(wtext, wpat, c_w)
    assert len(got_w) == 20_000 - 20 + 1
    assert c_w["chars"] > 5 * len(wtext)  # far beyond linear

    print(f"contest: this site's own build plan ({n:,} chars), pattern '{pat}' ({len(pat)} chars, {len(want)} occurrences); referee: str.find")
    print(f"  {'method':<26} {'chars read':>11} {'of text':>8}")
    print(f"  {'Naive, left-to-right':<26} {c_n['chars']:>11,} {c_n['chars'] / n:>7.1%}")
    print(f"  {'KMP':<26} {c_k['chars']:>11,} {c_k['chars'] / n:>7.1%}   reads every character, by design")
    print(f"  {'Horspool (bad-char only)':<26} {c_h['chars']:>11,} {c_h['chars'] / n:>7.1%}   the 1980 simplification")
    print(f"  {'Boyer-Moore (both rules)':<26} {c_b['chars']:>11,} {c_b['chars'] / n:>7.1%}   most of the haystack was never read")
    print("pattern-length dial on the same text: " + " | ".join(f"m={m_}: {r:.1%}" for m_, r in sorted(ratios.items())))
    print(f"small-alphabet story, measured: on binary text Horspool reads {h_bin:.2f}n (MORE than the text) while the good-suffix rule holds full Boyer-Moore to {bm_bin:.2f}n: the second rule earns its keep exactly where alphabets shrink; on prose the two tie")
    print(f"worst case, measured: a^20000 searched for a^20: {c_w['chars']:,} inspections (> 5n): Galil's rule is the linearity patch, cited not implemented")
    print("OK: four methods equal the stdlib referee across 600 adversarial trials, sublinearity holds and deepens with pattern length on real prose, the left-to-right methods read everything as they must, and both honest edges (binary collapse, quadratic worst case) are measured")
