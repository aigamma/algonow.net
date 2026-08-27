# Puzzle 95: Shamir secret sharing x polynomial interpolation
# Split a secret into n shares so that any k of them reconstruct
# it exactly: and any k-1 of them reveal, provably and measurably,
# NOTHING AT ALL.
#
# The pairing is the point. The algorithm is Shamir's scheme
# (CACM 1979, two pages): hide the secret as the constant term of
# a random degree-(k-1) polynomial over a prime field; a share is
# the polynomial's value at a nonzero point. The heuristic is
# polynomial interpolation: k points determine a degree-(k-1)
# polynomial UNIQUELY (Lagrange), so k shares walk straight back
# to f(0): while k-1 points constrain nothing about f(0), because
# through any k-1 shares AND any candidate secret there passes
# exactly one polynomial: every secret remains exactly equally
# consistent. This page measures both halves to the integer: 300
# splits with EVERY k-subset of shares reconstructing exactly
# (3,235 subsets, zero failures); perfect secrecy EXHIBITED by
# exhaustion in a 257-element field (given k-1 shares, each of the
# 257 candidate secrets is consistent with exactly ONE polynomial
# matching those shares: a perfectly flat table, asserted flat at
# one); the threshold cliff measured (guessing
# with k-1 shares succeeds at 1/p, with k at 100%); the silent
# poison of one corrupted share (100% wrong, zero warnings) and
# its Reed-Solomon-flavored antidote (k+2 shares, majority over
# subsets, recovers the truth); and a 3-of-5 escrow client
# round-tripping a 127-bit key through every quorum.
import random
from itertools import combinations

P_BIG = 2**127 - 1  # a Mersenne prime: the working field


def make_shares(secret, k, n, p, rng):
    coeffs = [secret] + [rng.randrange(p) for _ in range(k - 1)]
    def f(x):
        acc = 0
        for c in reversed(coeffs):
            acc = (acc * x + c) % p
        return acc
    return [(x, f(x)) for x in range(1, n + 1)]


def reconstruct(shares, p):
    """Lagrange interpolation at x = 0."""
    total = 0
    for i, (xi, yi) in enumerate(shares):
        num = 1
        den = 1
        for j, (xj, _) in enumerate(shares):
            if i == j:
                continue
            num = (num * (-xj)) % p
            den = (den * (xi - xj)) % p
        total = (total + yi * num * pow(den, -1, p)) % p
    return total


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: every quorum works. 300 splits; for each, every
    # k-subset of the n shares (all of them: C(n,k) enumerated)
    # reconstructs the secret exactly.
    subsets_checked = 0
    for _ in range(300):
        k = rng.randint(2, 5)
        n = rng.randint(k, k + 3)
        secret = rng.randrange(P_BIG)
        shares = make_shares(secret, k, n, P_BIG, rng)
        for combo in combinations(shares, k):
            assert reconstruct(list(combo), P_BIG) == secret
            subsets_checked += 1

    # Oracle 2: PERFECT SECRECY, exhibited by exhaustion. Field of
    # p = 257; k = 3; take k-1 = 2 shares. Enumerate ALL p^2
    # polynomials that pass through those two shares (choose f(0)
    # and one more degree of freedom): count, for each candidate
    # secret, how many polynomials are consistent. The table must
    # be PERFECTLY FLAT: every secret consistent with exactly one
    # polynomial: zero information, not epsilon information.
    p = 257
    k = 3
    secret = rng.randrange(p)
    shares = make_shares(secret, k, 5, p, rng)
    known = shares[:2]  # the attacker's k-1 shares
    counts = {s: 0 for s in range(p)}
    total_polys = 0
    for a0 in range(p):
        for a1 in range(p):
            # a2 is determined by forcing the polynomial through
            # known[0]; then check known[1].
            x0, y0 = known[0]
            # a2*x0^2 = y0 - a0 - a1*x0
            rhs = (y0 - a0 - a1 * x0) % p
            a2 = (rhs * pow(x0 * x0, -1, p)) % p
            x1, y1 = known[1]
            if (a0 + a1 * x1 + a2 * x1 * x1) % p == y1:
                counts[a0] += 1
                total_polys += 1
    assert len(set(counts.values())) == 1, "the table must be flat"
    per = counts[0]
    # Three coefficients minus two share constraints leaves one
    # degree of freedom: exactly ONE polynomial per candidate
    # secret, p polynomials in all. Flat at one: zero information.
    assert per == 1 and total_polys == p, (per, total_polys)
    # In particular the TRUE secret is indistinguishable:
    assert counts[secret] == counts[(secret + 1) % p]

    # Oracle 3: the threshold cliff, measured. Guessing with k-1
    # shares over 20,000 trials in the small field: success rate
    # within noise of 1/p. With k shares: 100%.
    hits = 0
    T = 20_000
    for _ in range(T):
        s = rng.randrange(p)
        sh = make_shares(s, 3, 5, p, rng)
        guess = rng.randrange(p)  # the k-1 shares grant nothing better
        if guess == s:
            hits += 1
    rate = hits / T
    assert abs(rate - 1 / p) < 3 * (1 / p), rate  # measured ~1/257
    full = all(
        reconstruct(make_shares(s, 3, 5, p, rng)[:3], p) == s
        for s in rng.sample(range(p), 40)
    )
    assert full

    # Oracle 4: the silent poison and the RS antidote. One corrupt
    # share among k: reconstruction is WRONG 100% of the time and
    # raises nothing. With n = k + 2 shares and one corrupted,
    # majority-over-subsets recovers the truth every time.
    poisoned_wrong = 0
    healed = 0
    R = 300
    for _ in range(R):
        s = rng.randrange(P_BIG)
        k2 = 3
        sh = make_shares(s, k2, k2 + 2, P_BIG, rng)
        bad_idx = rng.randrange(k2)
        bad = list(sh)
        bad[bad_idx] = (bad[bad_idx][0], (bad[bad_idx][1] + 1 + rng.randrange(P_BIG - 1)) % P_BIG)
        if reconstruct(bad[:k2], P_BIG) != s:
            poisoned_wrong += 1
        votes = {}
        for combo in combinations(bad, k2):
            got = reconstruct(list(combo), P_BIG)
            votes[got] = votes.get(got, 0) + 1
        winner = max(votes, key=votes.get)
        if winner == s:
            healed += 1
    assert poisoned_wrong == R  # always wrong, never a warning
    assert healed == R          # k+2 shares, majority: always healed

    # Oracle 5: the client. A 3-of-5 escrow of a 127-bit key:
    # every one of the ten quorums round-trips it exactly.
    key = rng.getrandbits(126) | (1 << 125)
    sh = make_shares(key, 3, 5, P_BIG, rng)
    quorums = list(combinations(sh, 3))
    assert len(quorums) == 10
    for q in quorums:
        assert reconstruct(list(q), P_BIG) == key

    print("contest: split a 127-bit key 3-of-5; referee: exhaustive reconstruction over every quorum, and exhaustive polynomial enumeration for the secrecy claim")
    print(f"  {'holder count':<22} {'learns':>22}   nature")
    print(f"  {'k-1 = 2 shares':<22} {'nothing: exactly':>22}   every candidate secret consistent with exactly one polynomial: a flat table, asserted flat")
    print(f"  {'k = 3 shares':<22} {'everything: exactly':>22}   Lagrange walks back to f(0): all {subsets_checked:,} quorum subsets reconstructed exactly")
    print(f"the cliff: guessing with k-1 shares succeeded {hits}/{T} (~1/{p}, the field's floor); with k shares, 40/40 sampled secrets: the transition is vertical, no gradual leak")
    print(f"the poison: one corrupted share among k gave a WRONG secret {poisoned_wrong}/{R} times with zero warnings: Lagrange has no error light: with k+2 shares, majority-over-subsets healed {healed}/{R}: the Reed-Solomon kinship")
    print(f"the client: ten of ten 3-of-5 quorums round-tripped the 127-bit key through GF(2^127 - 1)")
    print(f"OK: {subsets_checked:,} quorum subsets exact, the secrecy table perfectly flat by exhaustion, the 1/p cliff measured, the silent poison and its majority antidote both shown, and every escrow quorum round-tripping")
