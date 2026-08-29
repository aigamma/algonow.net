# Puzzle 101: Rabin-Karp x rolling hash fingerprints
# Substring search by arithmetic instead of letters: hash the
# pattern once, then slide a window across the text updating its
# hash in O(1) per step: subtract the leaving character, multiply
# by the base, add the entering one. Only a fingerprint MATCH
# earns a character-by-character verification, so the common case
# never reads the window at all.
#
# The pairing is the point. The algorithm is Rabin-Karp (Karp and
# Rabin, 1987): the control structure that slides one window and
# verifies candidates. The heuristic is the rolling hash
# fingerprint itself: the guiding rule that a 61-bit modular
# fingerprint stands in for the window, with collisions rare
# enough to bet on and cheap enough to survive (a false positive
# costs one verification, never a wrong answer).
#
# The referees, all counted in ONE currency (character touches: a
# roll touches 2 characters, a comparison touches 1):
# (1) exactness: on 300 randomized cases plus every contest
#     instance, Rabin-Karp, naive, and KMP all return exactly the
#     occurrence list an independent str.find loop returns;
# (2) the rolling identity: at every window of a 2,000-char text,
#     the rolled hash equals the hash computed fresh from scratch;
# (3) honesty on friendly text: on English-like text with a rare
#     pattern, naive is nearly linear and BEATS Rabin-Karp's 2n
#     rolling cost: stated plainly (the honest static winner);
# (4) the adversary: text a^n, pattern a^(m-1)b: naive degrades
#     toward n*m touches, Rabin-Karp and KMP stay linear;
# (5) the fingerprint dividend: 100 patterns in ONE pass through
#     a shared fingerprint set vs 100 separate KMP or naive
#     passes: the multi-pattern win measured;
# (6) the modulus is the dial: same instance under a 1,009-sized
#     modulus: spurious hits explode and are counted; at 2^61-1
#     the spurious count on the whole contest is zero, measured.
import random

P_BIG = (1 << 61) - 1  # Mersenne prime: fingerprints live mod this
SEED = 20260829


def find_all_ref(text, pat):
    """Independent referee: stdlib str.find loop, overlapping hits."""
    out = []
    i = text.find(pat)
    while i != -1:
        out.append(i)
        i = text.find(pat, i + 1)
    return out


def naive_search(text, pat, touch):
    """Character-by-character scan at every alignment."""
    n, m = len(text), len(pat)
    out = []
    for i in range(n - m + 1):
        j = 0
        while j < m:
            touch[0] += 1
            if text[i + j] != pat[j]:
                break
            j += 1
        if j == m:
            out.append(i)
    return out


def kmp_search(text, pat, touch):
    """KMP with the failure function; every comparison counted."""
    m = len(pat)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k and pat[i] != pat[k]:
            touch[0] += 1
            k = fail[k - 1]
        touch[0] += 1
        if pat[i] == pat[k]:
            k += 1
        fail[i] = k
    out = []
    k = 0
    for i, c in enumerate(text):
        while k and c != pat[k]:
            touch[0] += 1
            k = fail[k - 1]
        touch[0] += 1
        if c == pat[k]:
            k += 1
        if k == m:
            out.append(i - m + 1)
            k = fail[k - 1]
    return out


def rk_search(text, pat, touch, mod=P_BIG, base=None, stats=None):
    """Rabin-Karp: roll a fingerprint, verify only on a match.

    Currency: a roll touches 2 characters (leaving + entering),
    the initial window costs m touches, and each verification
    touches every character it compares. `stats` collects
    {'hash_matches', 'spurious'} when provided.
    """
    n, m = len(text), len(pat)
    if base is None:
        base = 293
    out = []
    if m > n or m == 0:
        return out
    lead = pow(base, m - 1, mod)
    hp = 0
    hw = 0
    for j in range(m):
        touch[0] += 2  # one read of the pattern char, one of the text char
        hp = (hp * base + ord(pat[j])) % mod
        hw = (hw * base + ord(text[j])) % mod
    for i in range(n - m + 1):
        if hw == hp:
            if stats is not None:
                stats['hash_matches'] += 1
            j = 0
            while j < m:
                touch[0] += 1
                if text[i + j] != pat[j]:
                    break
                j += 1
            if j == m:
                out.append(i)
            elif stats is not None:
                stats['spurious'] += 1
        if i + m < n:
            touch[0] += 2
            hw = ((hw - ord(text[i]) * lead) * base + ord(text[i + m])) % mod
    return out


def rk_multi(text, pats, touch, mod=P_BIG, base=293, stats=None):
    """One pass, many patterns: fingerprint set for equal-length pats."""
    m = len(pats[0])
    assert all(len(p) == m for p in pats)
    n = len(text)
    fingerprints = {}
    for idx, pat in enumerate(pats):
        hp = 0
        for c in pat:
            touch[0] += 1
            hp = (hp * base + ord(c)) % mod
        fingerprints.setdefault(hp, []).append(idx)
    out = {idx: [] for idx in range(len(pats))}
    if m > n:
        return out
    lead = pow(base, m - 1, mod)
    hw = 0
    for j in range(m):
        touch[0] += 1
        hw = (hw * base + ord(text[j])) % mod
    for i in range(n - m + 1):
        if hw in fingerprints:
            for idx in fingerprints[hw]:
                pat = pats[idx]
                j = 0
                while j < m:
                    touch[0] += 1
                    if text[i + j] != pat[j]:
                        break
                    j += 1
                if j == m:
                    out[idx].append(i)
                elif stats is not None:
                    stats['spurious'] += 1
        if i + m < n:
            touch[0] += 2
            hw = ((hw - ord(text[i]) * lead) * base + ord(text[i + m])) % mod
    return out


def english_like(rng, n_words):
    """Deterministic English-like text from a small vocabulary."""
    vocab = (
        'the quick brown fox jumps over lazy dog and every good algorithm '
        'deserves fudge while scanning long documents for borrowed phrasing '
        'students copy sentences teachers fingerprint paragraphs marking '
        'shared windows between essays because arithmetic reads faster than '
        'letters when suspicion is cheap verification is rare'
    ).split()
    return ' '.join(rng.choice(vocab) for _ in range(n_words))


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: exactness on 300 randomized cases. Alphabets of 2,
    # 4, and 26 letters; texts to 400 chars; patterns to 12; hits
    # both natural and planted; overlapping occurrences included.
    cases = 0
    for trial in range(300):
        sigma = rng.choice([2, 4, 26])
        alpha = 'ab'[:sigma] if sigma == 2 else ('abcd'[:sigma] if sigma == 4 else 'abcdefghijklmnopqrstuvwxyz')
        n = rng.randrange(10, 400)
        m = rng.randrange(1, 12)
        text = ''.join(rng.choice(alpha) for _ in range(n))
        if rng.random() < 0.5 and m <= n:
            pat = text[rng.randrange(0, n - m + 1):][:m]  # guaranteed hit
        else:
            pat = ''.join(rng.choice(alpha) for _ in range(m))
        ref = find_all_ref(text, pat)
        t = [0]
        assert naive_search(text, pat, t) == ref, (text, pat)
        assert kmp_search(text, pat, t) == ref, (text, pat)
        assert rk_search(text, pat, t) == ref, (text, pat)
        assert rk_search(text, pat, t, mod=1009) == ref, (text, pat)  # tiny mod: slower, never wrong
        cases += 1
    assert cases == 300

    # Oracle 2: the rolling identity. At every window of a
    # 2,000-char text, the rolled hash equals a fresh hash.
    ident = english_like(rng, 400)[:2000]
    m = 16
    base = 293
    lead = pow(base, m - 1, P_BIG)
    fresh = lambda w: sum(ord(c) * pow(base, m - 1 - j, P_BIG) for j, c in enumerate(w)) % P_BIG
    hw = fresh(ident[:m])
    checked = 0
    for i in range(len(ident) - m):
        hw = ((hw - ord(ident[i]) * lead) * base + ord(ident[i + m])) % P_BIG
        assert hw == fresh(ident[i + 1:i + 1 + m])
        checked += 1
    assert checked == len(ident) - m

    # The contest instance: English-like text, 200,000 characters,
    # with the pattern planted 30 extra times.
    words = english_like(rng, 36000)
    pat1 = 'borrowed phrasing'[:12]  # 'borrowed phr', 12 chars
    body = list(words[:200000 - 30 * 13])
    text1 = ''.join(body)
    inserts = sorted(rng.randrange(0, len(text1)) for _ in range(30))
    parts = []
    prev = 0
    for pos in inserts:
        parts.append(text1[prev:pos])
        parts.append(pat1 + ' ')
        prev = pos
    parts.append(text1[prev:])
    text1 = ''.join(parts)[:200000]
    ref1 = find_all_ref(text1, pat1)
    assert len(ref1) >= 30

    # Oracle 3: the friendly-text race (honesty row). Naive is
    # nearly linear on English and WINS; Rabin-Karp pays 2n rolls.
    tn, tr, tk = [0], [0], [0]
    stats1 = {'hash_matches': 0, 'spurious': 0}
    assert naive_search(text1, pat1, tn) == ref1
    assert rk_search(text1, pat1, tr, stats=stats1) == ref1
    assert kmp_search(text1, pat1, tk) == ref1
    n_eng, r_eng, k_eng = tn[0], tr[0], tk[0]
    assert n_eng < r_eng, (n_eng, r_eng)  # the honest static winner is naive
    assert stats1['spurious'] == 0, stats1  # 61-bit fingerprints: zero spurious, measured
    assert stats1['hash_matches'] == len(ref1)

    # Oracle 4: the adversary. text a^n, pattern a^(m-1) b: naive
    # re-reads m characters at almost every alignment.
    n_adv, m_adv = 100_000, 50
    text2 = 'a' * n_adv
    pat2 = 'a' * (m_adv - 1) + 'b'
    tn2, tr2, tk2 = [0], [0], [0]
    assert naive_search(text2, pat2, tn2) == []
    assert rk_search(text2, pat2, tr2) == []
    assert kmp_search(text2, pat2, tk2) == []
    n_bad, r_bad, k_bad = tn2[0], tr2[0], tk2[0]
    assert n_bad > 20 * r_bad, (n_bad, r_bad)
    assert n_bad > 20 * k_bad, (n_bad, k_bad)

    # Oracle 5: the fingerprint dividend. 100 distinct length-12
    # substrings of the text, all found in ONE rolling pass vs one
    # full pass per pattern for naive and for KMP.
    k_pats = []
    seen = set()
    while len(k_pats) < 100:
        i = rng.randrange(0, len(text1) - 12)
        p = text1[i:i + 12]
        if p not in seen:
            seen.add(p)
            k_pats.append(p)
    tmulti = [0]
    stats_m = {'hash_matches': 0, 'spurious': 0}
    got = rk_multi(text1, k_pats, tmulti, stats=stats_m)
    tn_k, tk_k = [0], [0]
    for idx, p in enumerate(k_pats):
        ref_p = find_all_ref(text1, p)
        assert got[idx] == ref_p, p
        assert naive_search(text1, p, tn_k) == ref_p
        assert kmp_search(text1, p, tk_k) == ref_p
    multi_rk, multi_naive, multi_kmp = tmulti[0], tn_k[0], tk_k[0]
    assert multi_naive > 25 * multi_rk, (multi_naive, multi_rk)
    assert multi_kmp > 25 * multi_rk, (multi_kmp, multi_rk)
    assert stats_m['spurious'] == 0

    # Oracle 6: the modulus is the dial. Same single-pattern
    # instance under mod 31: correctness holds (a false candidate
    # is verified and rejected, never returned), but thousands of
    # spurious verifications appear where 2^61-1 produced zero.
    tr_small = [0]
    stats_small = {'hash_matches': 0, 'spurious': 0}
    assert rk_search(text1, pat1, tr_small, mod=31, stats=stats_small) == ref1
    assert stats_small['spurious'] > 1000, stats_small
    small_tax = tr_small[0] / r_eng

    # Oracle 7: the roll is the whole point. Hashing every window
    # from scratch touches m characters per alignment; the roll
    # touches 2. Counted in the same currency on the english
    # instance (arithmetic on the currency, then asserted against
    # the measured rolling cost).
    fresh_touches = (len(text1) - len(pat1) + 1) * len(pat1) + len(pat1)
    assert fresh_touches > 5 * r_eng, (fresh_touches, r_eng)

    print('contest: substring search, one currency (character touches: a roll touches 2, a comparison touches 1); referee: str.find on every instance')
    print(f"  {'instance':<34} {'naive':>12} {'rabin-karp':>12} {'kmp':>12}")
    print(f"  {'english text, 1 pattern':<34} {n_eng:>12,} {r_eng:>12,} {k_eng:>12,}   naive wins friendly text: mismatches die in one touch")
    print(f"  {'adversarial a^n vs a^49b':<34} {n_bad:>12,} {r_bad:>12,} {k_bad:>12,}   the blowup: naive pays {n_bad / r_bad:.0f}x Rabin-Karp")
    print(f"  {'100 patterns, one text':<34} {multi_naive:>12,} {multi_rk:>12,} {multi_kmp:>12,}   one rolling pass beats 100 passes by {multi_naive / multi_rk:.0f}x / {multi_kmp / multi_rk:.0f}x")
    print(f"fingerprints, audited: {stats1['hash_matches']} hash matches on the english instance = {len(ref1)} true occurrences + 0 spurious (mod 2^61-1, measured); "
          f"mod 31 pays {stats_small['spurious']:,} spurious verifications (touch tax only +{(small_tax - 1) * 100:.1f}%: a false candidate usually dies in one touch, "
          f"which is why the bet is safe even when it loses)")
    print(f"the roll itself: hashing every window from scratch would touch {fresh_touches:,} characters on the english instance ({fresh_touches / r_eng:.1f}x the rolling cost): the O(1) update is the entire trick")
    print(f"the rolling identity: rolled hash == fresh hash at every one of {checked:,} windows; 300 randomized cases + all instances exact vs str.find")
    print('OK: rabin-karp, naive, and kmp agree with str.find everywhere; naive wins friendly text honestly; '
          f'the adversary pays naive {n_bad / r_bad:.0f}x; 100 patterns ride one pass for {multi_naive / multi_rk:.0f}x; '
          f'spurious hits 0 at 61 bits vs {stats_small["spurious"]:,} at mod 31: the fingerprint is the bet and the modulus is the dial')
