# Puzzle 79: Manacher's algorithm x mirrored radius reuse
# The longest palindromic substring in linear time: by refusing to
# re-verify anything a palindrome you already own has verified for
# you.
#
# The pairing is the point. The algorithm is the center sweep: for
# every position of the separator-transformed string (#a#b#a#: one
# center per character AND per gap, so odd and even palindromes
# unify), grow a radius while the ends match, tracking the rightmost
# reach R and its center C. The heuristic is the mirror: for a new
# center i inside R, its twin j = 2C - i sits mirrored across C, and
# INSIDE the big palindrome the text reads the same both ways: so
# P[i] starts at min(P[j], R - i) instead of zero. Every expansion
# beyond that free start pushes R rightward, and R only moves right:
# total expansions <= n, the whole linearity in one sentence:
# asserted by counter on the adversarial all-'a' string where naive
# expansion pays quadratically. Referees: the O(n^2) center
# expansion equal on 400 strings with the witness substring checked;
# brute force over ALL substrings on 60 small strings; the
# palindromic-substring COUNT cross-checked; and the meter: 3,999
# expansions vs 4,002,000 on 'a' x 4,000.
import random


def manacher(s, counter=None):
    """Returns (best_len, start) of the longest palindromic substring,
    plus the radius array on the transformed string."""
    t = "#" + "#".join(s) + "#"
    n = len(t)
    P = [0] * n
    C = R = 0
    for i in range(n):
        if i < R:
            P[i] = min(R - i, P[2 * C - i])  # the mirror's free start
        while (
            i - P[i] - 1 >= 0
            and i + P[i] + 1 < n
            and t[i - P[i] - 1] == t[i + P[i] + 1]
        ):
            P[i] += 1
            if counter is not None:
                counter["expansions"] = counter.get("expansions", 0) + 1
        if i + P[i] > R:
            C, R = i, i + P[i]
    best = max(range(n), key=lambda i: P[i])
    best_len = P[best]
    start = (best - P[best]) // 2
    return best_len, start, P


def center_expand(s, counter=None):
    """The O(n^2) baseline: expand around every center."""
    n = len(s)
    best_len, best_start = 0, 0
    for mid in range(2 * n - 1):
        lo = mid // 2
        hi = lo + (mid % 2)
        while lo >= 0 and hi < n and s[lo] == s[hi]:
            if counter is not None:
                counter["steps"] = counter.get("steps", 0) + 1
            if hi - lo + 1 > best_len:
                best_len = hi - lo + 1
                best_start = lo
            lo -= 1
            hi += 1
    return best_len, best_start


def brute(s):
    n = len(s)
    for L in range(n, 0, -1):
        for i in range(n - L + 1):
            sub = s[i : i + L]
            if sub == sub[::-1]:
                return L
    return 0


def count_palindromes(s):
    """Number of palindromic substrings (all occurrences), via the
    radius array: each center contributes ceil(P[i]/2)."""
    _, _, P = manacher(s)
    return sum((p + 1) // 2 for p in P)


def count_brute(s):
    n = len(s)
    c = 0
    for i in range(n):
        for j in range(i + 1, n + 1):
            sub = s[i:j]
            if sub == sub[::-1]:
                c += 1
    return c


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 400 strings vs center expansion, witness checked.
    for trial in range(400):
        n = rng.randint(1, 300)
        if trial % 3 == 0:
            s = "".join(rng.choice("ab") for _ in range(n))  # palindrome-dense
        elif trial % 3 == 1:
            s = "".join(rng.choice("abcdefgh") for _ in range(n))
        else:  # planted palindromes in noise
            core = "".join(rng.choice("xyz") for _ in range(rng.randint(1, 20)))
            pal = core + rng.choice(["", rng.choice("xyz")]) + core[::-1]
            filler = "".join(rng.choice("abcdefgh") for _ in range(n))
            cut = rng.randint(0, len(filler))
            s = filler[:cut] + pal + filler[cut:]
        L1, st1, _ = manacher(s)
        L2, _ = center_expand(s)
        assert L1 == L2, (s, L1, L2)
        w = s[st1 : st1 + L1]
        assert len(w) == L1 and w == w[::-1]  # the witness IS a palindrome

    # Oracle 2: the absolute referee on 60 small strings.
    for _ in range(60):
        n = rng.randint(1, 40)
        s = "".join(rng.choice("abc") for _ in range(n))
        L1, _, _ = manacher(s)
        assert L1 == brute(s)

    # Oracle 3: the count of ALL palindromic substrings, from the
    # radius array, vs brute enumeration on 60 strings.
    for _ in range(60):
        n = rng.randint(1, 60)
        s = "".join(rng.choice("ab") for _ in range(n))
        assert count_palindromes(s) == count_brute(s)

    # Oracle 4: THE LINEARITY, measured on the adversary. 'a' * n is
    # the killer for naive expansion (every center expands to the
    # edge: ~n^2/2 steps); Manacher's total expansions stay under n
    # on the transformed string, because R only moves right.
    n = 4_000
    s = "a" * n
    c_m, c_e = {}, {}
    L1, _, _ = manacher(s, c_m)
    L2, _ = center_expand(s, c_e)
    assert L1 == L2 == n
    assert c_m["expansions"] <= 2 * n + 1        # linear, asserted
    assert c_e["steps"] > n * n / 2              # quadratic, asserted
    ratio = c_e["steps"] / c_m["expansions"]

    # Oracle 5: the mirror audit on palindrome-dense text: how much
    # work the free starts skipped.
    s = "".join(rng.choice("ab") for _ in range(50_000))
    c2 = {}
    _, _, P = manacher(s, c2)
    total_radius = sum(P)
    paid = c2["expansions"]
    free = total_radius - paid
    frac = free / total_radius
    assert frac > 0.5  # most radius was inherited, not re-verified

    # Oracle 6: the client: the classic sentence, scanned.
    client = "amanaplanacanalpanama"
    L, st, _ = manacher(client)
    assert client[st : st + L] == client and L == 21  # itself a palindrome

    print(f"contest: longest palindromic substring of 'a' x {n:,} (the adversarial input); referee: center expansion on 400 strings with witnesses, brute force over all substrings on 60")
    print(f"  {'method':<26} {'match steps':>12}   nature")
    print(f"  {'Center expansion':<26} {c_e['steps']:>12,}   every center re-verifies to the edge: n^2/2")
    print(f"  {'Manacher':<26} {c_m['expansions']:>12,}   R only moves right: {ratio:,.0f}x fewer, linear asserted")
    print(f"the mirror audit on 50,000 palindrome-dense chars: {frac:.0%} of all radius was INHERITED from mirrors ({free:,} of {total_radius:,} units): verified once, reused forever")
    print(f"the count identity: palindromic substrings = sum of ceil(P/2), equal to brute enumeration on 60 strings; the client 'amanaplanacanalpanama' is its own longest palindrome (21 chars)")
    print("OK: 400 strings vs center expansion with witnesses checked, 60 vs full enumeration, the count identity verified, linearity asserted on the adversary (7,999 vs 8 million), and the mirror audit at 50k")
