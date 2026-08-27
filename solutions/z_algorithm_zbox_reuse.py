# Puzzle 80: Z-algorithm x Z-box window reuse
# For every position i, the length of the longest common prefix of
# the string and its own suffix starting at i: the Z-array: computed
# in linear time by the same never-re-verify economics as the
# Manacher unit one shelf over, pointed at prefixes instead of
# palindromes.
#
# The pairing is the point. The algorithm is the prefix-similarity
# sweep: Z[i] answers "how long does the text at i impersonate the
# start?", and with one sentinel trick the array becomes a complete
# pattern matcher. The heuristic is the Z-box: the rightmost window
# [L, R] known to copy the prefix. A new i inside it has a twin
# i - L back at the start, and INSIDE the box the text is a verified
# copy: so Z[i] starts at min(Z[i - L], R - i + 1), and comparisons
# are spent only past R: R only moves right, so the total is under
# 2n: asserted by counter on the all-a adversary. Referees: the
# naive per-position LCP scan equal on 400 arrays (full array
# equality); all pattern occurrences equal to Python's own find on
# 200 cases via the sentinel; THE BRIDGE: KMP's failure function
# (the live unit's machinery) RECONSTRUCTED from the Z-array and
# asserted equal to its direct computation on 200 strings: the two
# prefix machines are one machine; and the periodicity client:
# smallest periods vs brute force.
import random


def z_array(s, counter=None):
    n = len(s)
    Z = [0] * n
    if n == 0:
        return Z
    Z[0] = n
    L = R = 0  # the Z-box: rightmost window matching the prefix
    for i in range(1, n):
        if i <= R:
            Z[i] = min(R - i + 1, Z[i - L])  # the twin's certificate
        while i + Z[i] < n and s[Z[i]] == s[i + Z[i]]:
            Z[i] += 1
            if counter is not None:
                counter["cmps"] = counter.get("cmps", 0) + 1
        if i + Z[i] - 1 > R:
            L, R = i, i + Z[i] - 1
    return Z


def z_naive(s, counter=None):
    n = len(s)
    Z = [0] * n
    if n:
        Z[0] = n
    for i in range(1, n):
        while i + Z[i] < n and s[Z[i]] == s[i + Z[i]]:
            Z[i] += 1
            if counter is not None:
                counter["cmps"] = counter.get("cmps", 0) + 1
    return Z


def find_all(pattern, text):
    """All start positions of pattern in text, via one Z pass on
    pattern + sentinel + text."""
    m = len(pattern)
    Z = z_array(pattern + "\x00" + text)
    return [i - m - 1 for i in range(m + 1, len(Z)) if Z[i] >= m]


def prefix_function(s):
    """KMP's failure function, computed directly (the live unit)."""
    n = len(s)
    pi = [0] * n
    for i in range(1, n):
        k = pi[i - 1]
        while k and s[i] != s[k]:
            k = pi[k - 1]
        if s[i] == s[k]:
            k += 1
        pi[i] = k
    return pi


def prefix_from_z(s):
    """THE BRIDGE: rebuild the failure function from the Z-array.
    Each Z-box [i, i+Z[i]-1] says: the prefix of length Z[i] ends at
    position i+Z[i]-1: sweep right-to-left filling the best
    (longest-border) claim at each endpoint, then propagate borders
    of borders leftward."""
    n = len(s)
    Z = z_array(s)
    pi = [0] * n
    for i in range(n - 1, 0, -1):
        j = i + Z[i] - 1
        if Z[i] > 0 and pi[j] < Z[i]:
            pi[j] = Z[i]
    # a border of length k at j implies a border of length k-1 at j-1
    for j in range(n - 2, -1, -1):
        if pi[j] < pi[j + 1] - 1:
            pi[j] = pi[j + 1] - 1
    return pi


def smallest_period(s):
    """Via Z: p is a period iff Z[p] >= n - p (the shifted copy runs
    to the end)."""
    n = len(s)
    Z = z_array(s)
    for p in range(1, n + 1):
        if p == n or Z[p] >= n - p:
            return p
    return n


def period_brute(s):
    n = len(s)
    for p in range(1, n + 1):
        if all(s[i] == s[i % p] for i in range(n)):
            return p
    return n


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: full Z-array equality with the naive scan, 400 strings.
    for trial in range(400):
        n = rng.randint(1, 300)
        sigma = "ab" if trial % 3 == 0 else "abcd"
        s = "".join(rng.choice(sigma) for _ in range(n))
        assert z_array(s) == z_naive(s), s

    # Oracle 2: linearity by counter on the adversary.
    n = 4_000
    s = "a" * n
    c_z, c_n = {}, {}
    assert z_array(s, c_z) == z_naive(s, c_n)
    assert c_z["cmps"] <= 2 * n
    assert c_n["cmps"] > n * n / 3
    ratio = c_n["cmps"] / c_z["cmps"]

    # Oracle 3: the sentinel matcher vs Python's own find, 200 cases.
    for _ in range(200):
        t = "".join(rng.choice("ab") for _ in range(rng.randint(1, 400)))
        p = "".join(rng.choice("ab") for _ in range(rng.randint(1, 6)))
        want = []
        k = t.find(p)
        while k != -1:
            want.append(k)
            k = t.find(p, k + 1)
        assert find_all(p, t) == want, (p, t)

    # Oracle 4: THE BRIDGE. The failure function rebuilt from the
    # Z-array equals its direct KMP computation: 200 strings: the
    # site's two prefix machines are one machine.
    for trial in range(200):
        n2 = rng.randint(1, 200)
        sigma = "ab" if trial % 2 == 0 else "abc"
        s2 = "".join(rng.choice(sigma) for _ in range(n2))
        assert prefix_from_z(s2) == prefix_function(s2), s2

    # Oracle 5: the periodicity client vs brute force, 200 strings
    # (heavy on genuinely periodic inputs).
    for trial in range(200):
        if trial % 2 == 0:
            unit = "".join(rng.choice("ab") for _ in range(rng.randint(1, 6)))
            reps = rng.randint(2, 8)
            s3 = (unit * reps)[: rng.randint(len(unit), len(unit) * reps)]
        else:
            s3 = "".join(rng.choice("ab") for _ in range(rng.randint(1, 60)))
        if not s3:
            continue
        assert smallest_period(s3) == period_brute(s3), s3

    print(f"contest: the Z-array of 'a' x {n:,} (the adversarial input); referee: the naive per-position LCP scan, full array equality on 400 strings")
    print(f"  {'method':<26} {'comparisons':>12}   nature")
    print(f"  {'Naive per-position LCP':<26} {c_n['cmps']:>12,}   every suffix re-verified from scratch")
    print(f"  {'Z-algorithm':<26} {c_z['cmps']:>12,}   the box's certificate inherited: {ratio:,.0f}x fewer")
    print(f"the sentinel matcher: pattern + sentinel + text, one Z pass: all occurrences equal to Python's find on 200 cases")
    print(f"THE BRIDGE: KMP's failure function reconstructed FROM the Z-array and asserted equal to its direct computation on 200 strings: the live KMP unit and this one are the same machine in two coordinate systems")
    print(f"the periodicity client: smallest period via Z[p] >= n-p, equal to brute force on 200 strings (periodic-heavy)")
    print("OK: full Z-array equality on 400 strings, linearity by counter on the adversary, the sentinel matcher against find, the Z-to-KMP bridge exact on 200, and periods brute-verified")
