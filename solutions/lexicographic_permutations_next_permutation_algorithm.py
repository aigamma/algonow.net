"""Lexicographic permutations x Next-permutation algorithm (puzzle 206).

Narayana Pandita's rule (Ganita Kaumudi, 1356; Knuth TAOCP 4A, 7.2.1.2,
Algorithm L): find the longest non-increasing suffix, the element before
it is the pivot; swap the pivot with the rightmost suffix element larger
than it; reverse the suffix. Repeating from the sorted sequence visits
every arrangement of a multiset exactly once in increasing lexicographic
order, in place, with O(1) extra memory and O(1) amortized work per step.

Oracles: itertools.permutations (lexicographic from sorted input) and
exhaustive sets for n <= 8; the multinomial count for multisets; Heap's
algorithm and Steinhaus-Johnson-Trotter re-implemented and checked as
exact enumerations with one swap per step; Lehmer-code ranking and
unranking against the sequential order; brute force for the next bigger
number with the same digits.

AUTHOR CORRECTIONS: the draft guessed 1.36 swaps per step (one for the
pivot plus "half the suffix"); the measurement is 1.543, because the
reversal of a suffix of length L costs floor(L/2) swaps and the mean of
that over the 1/k! suffix-length law is 0.543, not 0.359. The draft also
called Heap's one swap per permutation "cheaper"; per step it is, but
Algorithm L's 1.54 swaps buy sorted order, which the page states instead.
"""
import itertools
import math
import random
import time

W = {"cmp": 0, "swap": 0, "moves": 0, "suffix": 0}


def next_permutation(a):
    """Advance a in place to the next lexicographic arrangement.
    Returns False (leaving a reversed to sorted order) when a was the last."""
    n = len(a)
    i = n - 2
    while i >= 0:
        W["cmp"] += 1
        if a[i] < a[i + 1]:
            break
        i -= 1
    W["suffix"] += n - 1 - i
    if i < 0:
        a.reverse()
        return False
    j = n - 1
    while True:
        W["cmp"] += 1
        if a[j] > a[i]:
            break
        j -= 1
    a[i], a[j] = a[j], a[i]
    W["swap"] += 1
    W["moves"] += 2
    lo, hi = i + 1, n - 1
    while lo < hi:
        a[lo], a[hi] = a[hi], a[lo]
        W["swap"] += 1
        W["moves"] += 2
        lo += 1
        hi -= 1
    return True


def enumerate_lex(items):
    a = sorted(items)
    out = [tuple(a)]
    while next_permutation(a):
        out.append(tuple(a))
    return out


def heaps(n):
    """Heap's algorithm (1963), iterative form: one swap per new permutation."""
    a = list(range(n))
    c = [0] * n
    out = [tuple(a)]
    swaps = 0
    i = 1
    while i < n:
        if c[i] < i:
            if i % 2 == 0:
                a[0], a[i] = a[i], a[0]
            else:
                a[c[i]], a[i] = a[i], a[c[i]]
            swaps += 1
            out.append(tuple(a))
            c[i] += 1
            i = 1
        else:
            c[i] = 0
            i += 1
    return out, swaps


def sjt(n):
    """Steinhaus-Johnson-Trotter with Even's directions: adjacent swaps only."""
    a = list(range(n))
    d = [-1] * n
    out = [tuple(a)]
    while True:
        k = -1
        for i in range(n):
            j = i + d[i]
            if 0 <= j < n and a[i] > a[j] and (k < 0 or a[i] > a[k]):
                k = i
        if k < 0:
            return out
        j = k + d[k]
        a[k], a[j] = a[j], a[k]
        d[k], d[j] = d[j], d[k]
        for i in range(n):
            if a[i] > a[j]:
                d[i] = -d[i]
        out.append(tuple(a))


def rank(p):
    """Lehmer code: the position of p among the permutations of range(n)."""
    n, r = len(p), 0
    for i in range(n):
        smaller = sum(1 for x in p[i + 1:] if x < p[i])
        r += smaller * math.factorial(n - 1 - i)
    return r


def unrank(k, n):
    items = list(range(n))
    out = []
    for i in range(n - 1, -1, -1):
        f = math.factorial(i)
        out.append(items.pop(k // f))
        k %= f
    return tuple(out)


COPIES = {"elems": 0}


def recursive_perms(items):
    """The textbook recursion that builds every prefix as a fresh list."""
    if len(items) <= 1:
        COPIES["elems"] += len(items)
        return [list(items)]
    out = []
    for i, x in enumerate(items):
        rest = items[:i] + items[i + 1:]
        COPIES["elems"] += len(rest)
        for tail in recursive_perms(rest):
            COPIES["elems"] += 1 + len(tail)
            out.append([x] + tail)
    return out


def next_bigger(digits):
    a = list(digits)
    return "".join(a) if next_permutation(a) else None


def next_bigger_brute(digits):
    cands = sorted({"".join(p) for p in itertools.permutations(digits)})
    i = cands.index(digits)
    return cands[i + 1] if i + 1 < len(cands) else None


def multinomial(items):
    r = math.factorial(len(items))
    for v in set(items):
        r //= math.factorial(items.count(v))
    return r


def main():
    rng = random.Random(206)
    checks = 0
    # (a) exact lexicographic enumeration against itertools, n = 1 to 8
    for n in range(1, 9):
        for k in W:
            W[k] = 0
        seq = enumerate_lex(range(n))
        ref = list(itertools.permutations(range(n)))
        assert seq == ref and len(seq) == math.factorial(n)
        assert all(seq[i] < seq[i + 1] for i in range(len(seq) - 1))
        checks += 1
    # multisets: the multinomial count, each arrangement once, in order
    msets = [[0, 0, 1, 1, 2], [0, 0, 0, 1, 1, 2, 2], list("MISSISSIPPI"), [1, 1, 1, 1]]
    for ms in msets:
        seq = enumerate_lex(ms)
        ref = sorted(set(itertools.permutations(ms)))
        assert seq == ref and len(seq) == multinomial(ms), (ms, len(seq))
        checks += 1
    miss = multinomial(list("MISSISSIPPI"))
    # (b) amortized cost over the whole enumeration, n = 8 and 9
    rows = []
    for n in (8, 9):
        for k in W:
            W[k] = 0
        a = list(range(n))
        t0 = time.perf_counter()
        count = 1
        while next_permutation(a):
            count += 1
        t = time.perf_counter() - t0
        f = math.factorial(n)
        assert count == f and a == list(range(n))
        rows.append((n, f, W["suffix"] / f, W["cmp"] / f, W["swap"] / f, W["moves"] / f, t))
        checks += 1
    n9 = rows[1]
    t9 = n9[6]
    per = t9 / n9[1]
    e1 = math.e - 1
    assert abs(rows[0][2] - e1) < 0.01 and abs(n9[2] - e1) < 0.01, (rows[0][2], n9[2])
    assert 1.50 < n9[4] < 1.60, n9[4]
    checks += 1
    # Heap's algorithm and Steinhaus-Johnson-Trotter as exact enumerations
    n = 7
    lex = enumerate_lex(range(n))
    hp, hswaps = heaps(n)
    assert len(hp) == math.factorial(n) and len(set(hp)) == len(hp) and hswaps == len(hp) - 1
    assert sorted(hp) == lex and hp != lex
    heap_order_breaks = sum(1 for i in range(len(hp) - 1) if hp[i] > hp[i + 1])
    st = sjt(n)
    assert len(st) == math.factorial(n) and len(set(st)) == len(st) and sorted(st) == lex
    for p, q in zip(st, st[1:]):
        diff = [i for i in range(n) if p[i] != q[i]]
        assert len(diff) == 2 and diff[1] == diff[0] + 1
    sjt_order_breaks = sum(1 for i in range(len(st) - 1) if st[i] > st[i + 1])
    checks += 2
    # (c) Lehmer code ranking and unranking against the sequential order
    lex8 = enumerate_lex(range(8))
    for _ in range(2000):
        k = rng.randrange(math.factorial(8))
        p = unrank(k, 8)
        assert p == lex8[k] and rank(p) == k
    for k in (0, 1, 40319):
        assert unrank(k, 8) == lex8[k]
    checks += 1
    # (d) scale: 12! and 20!, extrapolated from the measured n = 9 pace
    f12, f20 = math.factorial(12), math.factorial(20)
    est12 = f12 * per
    est20_years = f20 * per / (365.25 * 86400)
    assert f12 == 479001600 and f20 == 2432902008176640000
    checks += 1
    # negative example: the copying recursion, n = 8
    COPIES["elems"] = 0
    rp = recursive_perms(list(range(8)))
    assert len(rp) == math.factorial(8) and sorted(tuple(p) for p in rp) == lex8
    copies_per = COPIES["elems"] / math.factorial(8)
    checks += 1
    # the interview problem: next bigger number with the same digits
    agree = none_cases = 0
    for _ in range(300):
        L = rng.randrange(4, 8)
        s = "".join(rng.choice("0123456789") for _ in range(L))
        if rng.random() < 0.15:
            s = "".join(sorted(s, reverse=True))
        a, b = next_bigger(s), next_bigger_brute(s)
        assert a == b, (s, a, b)
        agree += 1
        none_cases += a is None
    checks += 1

    print("Algorithm L over the whole enumeration (per permutation, measured):")
    print(f"  {'n':>2} {'n!':>8} {'suffix':>7} {'cmps':>6} {'swaps':>6} {'moves':>6} {'seconds':>8}")
    for n, f, su, cm, sw, mv, t in rows:
        print(f"  {n:>2} {f:>8,} {su:>7.3f} {cm:>6.3f} {sw:>6.3f} {mv:>6.3f} {t:>8.2f}")
    print(f"  theory: mean suffix e - 1 = {e1:.3f}")
    print(f"rivals at n = 7 (5,040 permutations, each exactly once): Heap {hswaps} swaps,"
          f" order breaks {heap_order_breaks}; Johnson-Trotter adjacent swaps {len(st) - 1},"
          f" order breaks {sjt_order_breaks}; Algorithm L order breaks 0")
    print(f"Lehmer unrank/rank: 2,000 random k agree with the sequential order at n = 8")
    print(f"scale: 12! = {f12:,} would take about {est12 / 60:.0f} minutes at the n = 9 pace,"
          f" 20! = {f20:,} about {est20_years:,.0f} years")
    print(f"copying recursion: {copies_per:.1f} elements copied per permutation at n = 8"
          f" against 2 indices of extra memory in place")
    print(f"next bigger number: {agree} random digit strings agree with brute force, {none_cases} with no answer")
    print(f"OK: Algorithm L equals itertools on every n to 8 ({math.factorial(8):,} at n = 8) and lists"
          f" all {miss:,} arrangements of MISSISSIPPI once in order; the mean suffix is"
          f" {n9[2]:.3f} against e - 1 = {e1:.3f} with {n9[4]:.2f} swaps and {n9[3]:.2f} comparisons"
          f" per step, {math.factorial(9):,} permutations in {t9:.2f} s; Heap's {hswaps} single swaps"
          f" and Johnson-Trotter's {len(st) - 1} adjacent swaps each visit 5,040 once but break"
          f" sorted order {heap_order_breaks} and {sjt_order_breaks} times; unrank(k) equals the"
          f" k-th output on 2,000 draws; the copying recursion moves {copies_per:.1f} elements per"
          f" permutation; {agree} next-bigger-number cases agree with brute force; {checks} checks")


if __name__ == "__main__":
    main()
