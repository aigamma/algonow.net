# Puzzle 76: Sieve of Eratosthenes x crossing off from the square
# Enumerate every prime up to n: not by testing numbers one at a
# time, but by letting the composites cross THEMSELVES off: the
# oldest named algorithm on this site, and still the way every prime
# table on earth is built.
#
# The pairing is the point. The algorithm is the shared table: one
# boolean per number, and each discovered prime sweeps its multiples
# out of everyone's future: work is pooled across all the numbers at
# once, which is why the total bill is n log log n rather than n
# times anything. The heuristic is the square rule: start each
# prime's sweep at p squared, because every smaller multiple of p
# owns a factor smaller than p and was already swept: and the same
# observation PROVES the outer loop may stop at sqrt(n). Referees:
# two independent judges on every number to 20,000 (trial division,
# and the live Miller-Rabin unit's deterministic bases); the exact
# famous constants pi(10^6) = 78,498 and twin-prime count 8,169;
# THE MERTENS BILL: total crossings at n = 10^6 measured against
# n(ln ln sqrt(n) + M): theory matched within 3%; and Goldbach
# verified for every even number to 20,000: the sieve as the
# substrate of number-theory experiments.
import math
import random


def sieve(n, counter=None, from_square=True):
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = is_prime[1] = 0
    p = 2
    while p * p <= n:
        if is_prime[p]:
            start = p * p if from_square else 2 * p
            for m in range(start, n + 1, p):
                is_prime[m] = 0
                if counter is not None:
                    counter["crossings"] = counter.get("crossings", 0) + 1
        p += 1
    return is_prime


def trial_division_prime(x, counter=None):
    if x < 2:
        return False
    d = 2
    while d * d <= x:
        if counter is not None:
            counter["divs"] = counter.get("divs", 0) + 1
        if x % d == 0:
            return False
        d += 1
    return True


def miller_rabin(x):
    """Deterministic for x < 3,215,031,751 with bases 2,3,5,7: the
    live unit's machinery, reused as an independent second judge."""
    if x < 2:
        return False
    for p in (2, 3, 5, 7):
        if x % p == 0:
            return x == p
    d = x - 1
    r = 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in (2, 3, 5, 7):
        y = pow(a, d, x)
        if y in (1, x - 1):
            continue
        for _ in range(r - 1):
            y = y * y % x
            if y == x - 1:
                break
        else:
            return False
    return True


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: two independent judges on EVERY number to 20,000.
    N1 = 20_000
    tab = sieve(N1)
    for x in range(N1 + 1):
        s = bool(tab[x])
        assert s == trial_division_prime(x), x
        assert s == miller_rabin(x), x

    # Oracle 2: the famous constants, exact. pi(10^6) and the twin
    # prime count to 10^6 are known to the digit: the sieve must
    # reproduce both.
    N = 1_000_000
    c_sq = {}
    tab6 = sieve(N, c_sq)
    primes6 = [i for i in range(N + 1) if tab6[i]]
    assert len(primes6) == 78_498
    twins = sum(1 for i in range(len(primes6) - 1) if primes6[i + 1] - primes6[i] == 2)
    assert twins == 8_169

    # Oracle 3: THE MERTENS BILL. Naive crossings (sweeps from 2p)
    # total ~ n * (sum of 1/p over p <= sqrt(n)) ~ n(ln ln sqrt(n)
    # + M), Mertens's constant M = 0.2615: and the square rule's
    # measured shave is EXACTLY the gap between that asymptotic and
    # the from-square count (~ sum of p below sqrt(n)). First run
    # taught this: the from-square count sat 3.3% under the Mertens
    # line, and the 3.3% was the shave itself.
    M_MERTENS = 0.26149721
    predicted = N * (math.log(math.log(math.isqrt(N))) + M_MERTENS)
    c_naive = {}
    sieve(N, c_naive, from_square=False)
    naive = c_naive["crossings"]
    measured = c_sq["crossings"]
    assert abs(naive - predicted) / predicted < 0.01, (naive, predicted)
    saved = naive - measured
    # Exact identity: per prime, naive sweeps floor(n/p)-1 multiples,
    # from-square sweeps floor(n/p)-p+1: the saving is p-2, exactly.
    assert saved == sum(p - 2 for p in primes6 if p * p <= N), saved
    # its real earnings are structural: the sweep starting at p^2 is
    # WHY stopping the outer loop at sqrt(n) is correct at all.

    # Oracle 4: the race. Testing every number to 100,000 one at a
    # time by trial division vs sieving them all at once.
    N2 = 100_000
    c_td = {}
    for x in range(N2 + 1):
        trial_division_prime(x, c_td)
    c_sv = {}
    sieve(N2, c_sv)
    ratio = c_td["divs"] / c_sv["crossings"]
    assert ratio > 12  # measured 14.2x

    # Oracle 5: the client: Goldbach, verified. Every even number
    # from 4 to 20,000 is a sum of two primes: found via the table.
    pset = set(i for i in range(N1 + 1) if tab[i])
    for e in range(4, N1 + 1, 2):
        assert any((e - p) in pset for p in primes6 if p <= e // 2), e

    print(f"contest: every prime to 100,000; referee: trial division AND the live Miller-Rabin unit agreeing on every number to 20,000, plus the famous constants exact")
    print(f"  {'method':<28} {'ops':>12}   nature")
    print(f"  {'Trial division, per number':<28} {c_td['divs']:>12,}   each number interrogated alone")
    print(f"  {'Sieve, shared table':<28} {c_sv['crossings']:>12,}   composites cross themselves off: {ratio:.1f}x fewer")
    print(f"the Mertens bill at n = 10^6: naive crossings {naive:,} vs n(ln ln sqrt n + M) = {predicted:,.0f}: theory within {100*abs(naive-predicted)/predicted:.2f}%; from-square measured {measured:,}")
    print(f"the square rule: {saved:,} crossings saved vs starting at 2p: EXACTLY sum(p-2) over primes below sqrt(n), asserted to the unit: and the structural earnings: p^2 as the first unswept multiple is WHY the outer loop may stop at sqrt(n)")
    print(f"the constants, exact: pi(10^6) = 78,498 and 8,169 twin pairs: both asserted to the digit; Goldbach verified for every even number to 20,000")
    print("OK: two independent judges on every number to 20,000, the famous constants exact, the Mertens bill within 1%, the square-rule saving exact, the 14x race won, and Goldbach checked even by even")
