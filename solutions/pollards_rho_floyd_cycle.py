# Puzzle 78: Pollard's rho x Floyd cycle detection
# Find a nontrivial factor of n without dividing by anything: run a
# pseudorandom walk modulo n, and let the birthday paradox force a
# collision modulo the unknown prime factor.
#
# The pairing is the point. The algorithm is the rho walk: iterate
# x -> x^2 + c mod n. Modulo an unseen prime factor p, the sequence
# lives in only p states, so by the birthday paradox it collides
# with itself within about sqrt(p) steps: the walk's tail and loop
# draw the letter rho. A collision mod p with distinct values mod n
# means gcd(x - y, n) is a nontrivial factor. The heuristic is Floyd
# cycle detection: the tortoise and the hare: one walker at single
# speed, one at double, meeting inside any cycle without storing a
# single previous value: constant memory against the naive set that
# holds sqrt(p) states. Referees: every recovered factor checked by
# multiplication; full factorizations rebuilt and compared against
# the product on 200 numbers to 10^12 with every factor
# Miller-Rabin-certified; THE BIRTHDAY BILL as a scale law: mean
# steps grow as sqrt(p), measured at two scales 100x apart and
# asserted near ratio 10; Brent's refinement raced by f-evaluation
# counters; and the degenerate c = 0 walk measured failing where
# random c succeeds.
import math
import random


def miller_rabin(x):
    if x < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if x % p == 0:
            return x == p
    d = x - 1
    r = 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
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


def rho_floyd(n, c, counter=None, max_steps=10**7):
    """One rho attempt with Floyd's tortoise and hare. Returns a
    nontrivial factor, or None (walk failed for this c)."""
    if n % 2 == 0:
        return 2
    f = lambda x: (x * x + c) % n
    tortoise = hare = 2
    steps = 0
    while steps < max_steps:
        tortoise = f(tortoise)
        hare = f(f(hare))
        steps += 1
        if counter is not None:
            counter["evals"] = counter.get("evals", 0) + 3
        g = math.gcd(abs(tortoise - hare), n)
        if g == n:
            return None  # collision mod every factor at once: retry
        if g > 1:
            if counter is not None:
                counter["steps"] = counter.get("steps", 0) + steps
            return g
    return None


def rho_brent(n, c, counter=None, max_steps=10**7):
    """Brent's refinement: the hare teleports to powers of two and
    gcds are batched: fewer f-evaluations for the same birthday."""
    if n % 2 == 0:
        return 2
    f = lambda x: (x * x + c) % n
    y, r, q = 2, 1, 1
    g = 1
    m = 128
    while g == 1:
        x = y
        for _ in range(r):
            y = f(y)
            if counter is not None:
                counter["evals"] = counter.get("evals", 0) + 1
        k = 0
        while k < r and g == 1:
            ys = y
            for _ in range(min(m, r - k)):
                y = f(y)
                q = q * abs(x - y) % n
                if counter is not None:
                    counter["evals"] = counter.get("evals", 0) + 1
            g = math.gcd(q, n)
            k += m
        r *= 2
        if r > max_steps:
            return None
    if g == n:
        g = 1
        while g == 1:
            ys = f(ys)
            g = math.gcd(abs(x - ys), n)
        if g == n:
            return None
    return g


def factor_of(n, rng, method=rho_floyd, counter=None):
    """Retry with fresh random c until a factor falls out."""
    for _ in range(40):
        c = rng.randrange(1, n - 1)
        g = method(n, c, counter)
        if g is not None and 1 < g < n:
            return g
    return None


def full_factor(n, rng):
    if n == 1:
        return []
    if miller_rabin(n):
        return [n]
    g = factor_of(n, rng)
    assert g is not None
    return sorted(full_factor(g, rng) + full_factor(n // g, rng))


def primes_in(rng, lo, hi, count):
    out = []
    while len(out) < count:
        x = rng.randrange(lo, hi) | 1
        if miller_rabin(x):
            out.append(x)
    return out


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 300 semiprimes p*q: the recovered factor IS p or q,
    # checked by multiplication (never by trust).
    ps = primes_in(rng, 10**3, 10**5, 60)
    for _ in range(300):
        p, q = rng.sample(ps, 2)
        n = p * q
        g = factor_of(n, rng)
        assert g in (p, q) and n % g == 0

    # Oracle 2: full factorization on 200 numbers to 10^12: product
    # rebuilds n, every factor Miller-Rabin-certified prime.
    for _ in range(200):
        n = rng.randrange(4, 10**12)
        fs = full_factor(n, rng)
        prod = 1
        for f in fs:
            assert miller_rabin(f)
            prod *= f
        assert prod == n

    # Oracle 3: THE BIRTHDAY BILL as a scale law. Mean Floyd steps to
    # crack p*q grows like sqrt(p): two scales of p, 100x apart, so
    # the step ratio should sit near 10.
    def mean_steps(p_lo, p_hi, trials):
        pool = primes_in(rng, p_lo, p_hi, 25)
        big = primes_in(rng, 10**8, 10**9, 10)
        tot = 0
        for _ in range(trials):
            p = rng.choice(pool)
            q = rng.choice(big)
            cnt = {}
            g = factor_of(p * q, rng, rho_floyd, cnt)
            assert g is not None and (p * q) % g == 0
            tot += cnt["steps"]
        return tot / trials

    s_small = mean_steps(10**4, 2 * 10**4, 40)   # p ~ 1.5e4
    s_large = mean_steps(10**6, 2 * 10**6, 40)   # p ~ 1.5e6: 100x
    ratio = s_large / s_small
    assert 5 < ratio < 20, ratio  # sqrt(100) = 10, birthday-priced

    # Oracle 4: Brent vs Floyd, f-evaluations counted on the same 60
    # semiprimes: the refinement spends fewer evals in aggregate.
    ps2 = primes_in(rng, 10**5, 10**6, 20)
    ev_f = ev_b = 0
    for _ in range(60):
        p, q = rng.sample(ps2, 2)
        n = p * q
        cf, cb = {}, {}
        g1 = factor_of(n, rng, rho_floyd, cf)
        g2 = factor_of(n, rng, rho_brent, cb)
        assert n % g1 == 0 and n % g2 == 0
        ev_f += cf["evals"]
        ev_b += cb["evals"]
    assert ev_b < ev_f

    # Oracle 5: the degenerate walk, measured honestly. Folklore
    # says c = 0 (bare squaring) is broken and must be avoided. The
    # first assert here encoded that folklore as outright failures:
    # and measured ZERO failures on 60 semiprimes. The real story at
    # these scales: the squaring map's structured orbits still
    # collide, but slowly: c = 0 pays a measured 5x step tax over a
    # random c. Structure was expensive, not fatal: the folklore's
    # direction was right and its severity was wrong.
    steps_c0 = steps_rand = 0
    for _ in range(60):
        p, q = rng.sample(ps, 2)
        n = p * q
        c0, cr = {}, {}
        g0 = rho_floyd(n, 0, c0, max_steps=500_000)
        gr = rho_floyd(n, rng.randrange(1, n - 1), cr, max_steps=500_000)
        assert g0 is not None and n % g0 == 0
        assert gr is not None and n % gr == 0
        steps_c0 += c0["steps"]
        steps_rand += cr["steps"]
    c0_tax = steps_c0 / steps_rand
    assert c0_tax > 3, c0_tax

    # Oracle 6: the meter on the textbook client. 8051 = 83 * 97,
    # and a 12-digit semiprime vs what trial division would pay.
    g = factor_of(8051, rng)
    assert g in (83, 97)
    p, q = 999_983, 999_979
    n = p * q
    cnt = {}
    g = factor_of(n, rng, rho_floyd, cnt)
    assert g in (p, q)
    td_ops = min(p, q)  # trial division marches to the factor
    rho_steps = cnt["steps"]

    print(f"contest: factor a 12-digit semiprime ({p:,} x {q:,}); referee: every factor verified by multiplication, every full factorization rebuilt to n with MR-certified primes")
    print(f"  {'method':<26} {'ops':>12}   nature")
    print(f"  {'Trial division':<26} {td_ops:>12,}   marches to the smallest factor, one candidate at a time")
    print(f"  {'Pollard rho + Floyd':<26} {rho_steps:>12,}   the birthday paradox does the searching: {td_ops//max(rho_steps,1):,}x fewer")
    print(f"the birthday bill as a scale law: p grown 100x -> mean steps grew {ratio:.1f}x (sqrt law predicts 10x): measured over 80 semiprimes")
    print(f"the refinement: Brent's batched-gcd variant spent {ev_b:,} f-evals where Floyd spent {ev_f:,} on the same 60 semiprimes ({100*(1-ev_b/ev_f):.0f}% saved)")
    print(f"the degenerate walk, folklore corrected: c = 0 (bare squaring) FAILED ZERO of 60 attempts: but paid a {c0_tax:.1f}x step tax over random c on the same semiprimes: structure was expensive, not fatal")
    print("OK: 300 semiprime factors multiplication-checked, 200 full factorizations rebuilt with MR-certified primes, the sqrt(p) scale law measured at 100x, Brent's saving counted, the c=0 tax measured with its folklore corrected, and the textbook client cracked")
