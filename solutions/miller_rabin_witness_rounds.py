# Puzzle 32: Miller-Rabin x witness rounds
# Decide whether an odd integer is prime, fast, without factoring it,
# with an error probability you choose and then drive below any bound.
#
# The pairing is the point. The algorithm is the strong test's algebraic
# skeleton: write n-1 = 2^s * d with d odd, compute a^d, then square s
# times; in a field the only square roots of 1 are +-1, so a chain that
# reaches 1 from a stranger has exhibited a nontrivial root of unity and
# n cannot be prime. The heuristic is the witness lottery: Rabin's 1980
# theorem says at most a quarter of the bases lie for any odd composite,
# so k random witnesses drive the error under 4^-k. The bound is not
# assumed here: it is checked exhaustively, every base tried, on every
# strong pseudoprime below one hundred thousand.
import random

FIRST_12_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]


def sieve(limit):
    """Eratosthenes: the trial-division referee, exact by construction."""
    is_p = bytearray([1]) * (limit + 1)
    is_p[0] = is_p[1] = 0
    p = 2
    while p * p <= limit:
        if is_p[p]:
            for m in range(p * p, limit + 1, p):
                is_p[m] = 0
        p += 1
    return is_p


def decompose(n):
    """n - 1 = 2^s * d with d odd."""
    s, d = 0, n - 1
    while d % 2 == 0:
        s += 1
        d //= 2
    return s, d


def fermat_passes(n, a):
    """The weaker 1640 test: a^(n-1) == 1 (mod n)."""
    return pow(a, n - 1, n) == 1


def strong_passes(n, a, counter=None):
    """One Miller-Rabin round: does witness a fail to expose n?"""
    if counter is not None:
        counter["modexps"] = counter.get("modexps", 0) + 1
    s, d = decompose(n)
    x = pow(a, d, n)
    if x == 1 or x == n - 1:
        return True
    for _ in range(s - 1):
        x = x * x % n
        if x == n - 1:
            return True
    return False  # chain never reached -1: composite, proven


def miller_rabin(n, k, rng, counter=None):
    """k random witness rounds; error below 4^-k for composites."""
    if n < 2:
        return False
    for p in (2, 3):
        if n % p == 0:
            return n == p
    for _ in range(k):
        a = rng.randrange(2, n - 1)
        if not strong_passes(n, a, counter):
            return False
    return True


def deterministic_mr(n, counter=None):
    """The first twelve primes as witnesses: PROVEN correct for every
    n < 3.317 x 10^24 (Sorenson & Webster 2015), which covers 64-bit
    integers with room to spare. The referee for the big-number hunts."""
    if n < 2:
        return False
    for p in FIRST_12_PRIMES:
        if n % p == 0:
            return n == p
    for a in FIRST_12_PRIMES:
        if not strong_passes(n, a, counter):
            return False
    return True


if __name__ == "__main__":
    rng = random.Random(20260827)
    N = 100_000

    # Oracle 1: the referee itself is checked against a published
    # constant: pi(10^5) = 9,592 primes below one hundred thousand.
    is_p = sieve(N)
    primes_below = sum(is_p)
    assert primes_below == 9_592, primes_below

    # The classification sweep: every odd n in [3, N), four methods.
    c_mr20 = {}
    c_det = {}
    fermat2_wrong = []
    strong2_wrong = []
    mr20_wrong = []
    det_wrong = []
    for n in range(3, N, 2):
        actually_prime = bool(is_p[n])
        if fermat_passes(n, 2) and not actually_prime:
            fermat2_wrong.append(n)
        if strong_passes(n, 2) and not actually_prime:
            strong2_wrong.append(n)
        if miller_rabin(n, 20, rng, c_mr20) != actually_prime:
            mr20_wrong.append(n)
        if deterministic_mr(n, c_det) != actually_prime:
            det_wrong.append(n)

    # Oracle 2: the historic offenders appear exactly on schedule.
    assert fermat2_wrong[0] == 341, fermat2_wrong[:3]   # 341 = 11 * 31
    assert 561 in fermat2_wrong                          # the Carmichael
    assert strong2_wrong[0] == 2047, strong2_wrong[:3]  # 2047 = 23 * 89
    # Theorem check: every strong liar is a Fermat liar (same base).
    assert set(strong2_wrong) <= set(fermat2_wrong)
    # Oracle 3: randomness and the proven witness set make zero errors.
    assert mr20_wrong == [], mr20_wrong
    assert det_wrong == [], det_wrong

    # Oracle 4: the Carmichael anatomy, exhaustively. 561 = 3 * 11 * 17
    # fools Fermat at EVERY coprime base (that is the definition, and
    # phi(561) = 320), yet only a handful of bases lie to the strong test.
    assert not is_p[561] and 561 == 3 * 11 * 17
    fermat_liars_561 = [a for a in range(1, 561) if pow(a, 560, 561) == 1]
    coprime_561 = [a for a in range(1, 561) if a % 3 and a % 11 and a % 17]
    assert fermat_liars_561 == coprime_561 and len(fermat_liars_561) == 320
    strong_liars_561 = [a for a in range(1, 561) if strong_passes(561, a)]
    assert len(strong_liars_561) <= (561 - 1) // 4  # Rabin's bound

    # Oracle 5: Rabin's quarter bound, checked exhaustively on every
    # base-2 strong pseudoprime below N: try ALL bases, count the liars.
    worst_fraction = 0.0
    for n in strong2_wrong:
        liars = sum(1 for a in range(1, n) if strong_passes(n, a))
        frac = liars / (n - 1)
        worst_fraction = max(worst_fraction, frac)
        assert liars <= (n - 1) // 4, (n, liars)

    # Oracle 6: the 63-bit prime hunt, refereed. Every candidate's
    # random-witness verdict must agree with the proven 12-witness set.
    hunts = []
    for _ in range(5):
        tries = 0
        while True:
            cand = rng.randrange(2 ** 62, 2 ** 63) | 1
            tries += 1
            rand_says = miller_rabin(cand, 20, rng)
            proven_says = deterministic_mr(cand)
            assert rand_says == proven_says, cand
            if proven_says:
                hunts.append((cand, tries))
                break
    total_tries = sum(t for _, t in hunts)
    assert 5 <= total_tries <= 1000  # PNT expects ~ln(2^63)/2 = 22/prime

    # Oracle 7: the never-use, priced. Trial division must crawl to the
    # smaller factor of a 48-bit semiprime; the strong test convicts in
    # one witness round. Both verdicts checked against the referee.
    p_big = 2 ** 24 - 1
    while not deterministic_mr(p_big):
        p_big -= 2
    q_big = p_big - 2
    while not deterministic_mr(q_big):
        q_big -= 2
    semi = p_big * q_big
    divisions = 1  # the test by 2
    found = None
    if semi % 2 == 0:
        found = 2
    else:
        d = 3
        while d * d <= semi:
            divisions += 1
            if semi % d == 0:
                found = d
                break
            d += 2
    assert found == q_big and p_big * q_big == semi
    c_semi = {}
    verdict = miller_rabin(semi, 20, rng, c_semi)
    assert verdict is False
    assert not deterministic_mr(semi)

    n_odds = len(range(3, N, 2))
    print(f"contest: all {n_odds:,} odd n in [3, {N:,}), referee: a sieve whose prime count {primes_below:,} matches the published pi(10^5)")
    print(f"  {'method':<28} {'wrong answers':>13}   worst offender")
    print(f"  {'Fermat, base 2':<28} {len(fermat2_wrong):>13}   first at 341 = 11*31; fooled by 561 at all 320 coprime bases")
    print(f"  {'Miller-Rabin, base 2 only':<28} {len(strong2_wrong):>13}   first at 2,047 = 23*89")
    print(f"  {'Miller-Rabin, 20 random':<28} {len(mr20_wrong):>13}   none; avg {c_mr20['modexps'] / n_odds:.2f} modexps/number")
    print(f"  {'Deterministic 12-witness':<28} {len(det_wrong):>13}   none; proven below 3.3e24; avg {c_det['modexps'] / n_odds:.2f} modexps/number")
    print(f"Rabin's bound, exhaustive: worst strong-liar fraction across all {len(strong2_wrong)} strong pseudoprimes = {worst_fraction:.4f} (theorem says <= 0.25)")
    print(f"561 anatomy: Fermat liars 320/320 coprime bases; strong liars {len(strong_liars_561)}/560 = {len(strong_liars_561) / 560:.4f}")
    print(f"63-bit hunt: 5 primes in {total_tries} candidates (PNT expects ~22 per prime); every verdict matched the proven witness set")
    print(f"never-use, priced: trial division crawled {divisions:,} divisions to factor the 48-bit semiprime; the strong test convicted it in round 1 ({c_semi['modexps']} modexp); at 2048 bits the crawl becomes ~10^300 years")
    print("OK: referee matches pi(10^5), offenders on schedule, strong liars subset of Fermat liars, zero errors in 20-round and proven-set sweeps, quarter bound exhaustively verified, Carmichael anatomy exact, hunt refereed, semiprime factored and convicted")
