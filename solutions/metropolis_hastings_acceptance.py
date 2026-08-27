# Puzzle 36: Metropolis-Hastings x proposal acceptance ratio
# Draw samples from a distribution you can only evaluate up to an
# unknown constant, and estimate expectations under it.
#
# The pairing is the point. The algorithm is the Markov chain: propose a
# local move, sometimes take it, and let the chain's LONG-RUN occupancy,
# not any single state, be the answer. The heuristic is the acceptance
# ratio min(1, pi(y)/pi(x)): the one formula that makes detailed balance
# hold for ANY target, with the normalizing constant cancelling in the
# ratio. Nothing here is taken on faith: detailed balance is verified
# term by term on an exact discrete chain, the stationary distribution
# is recovered three independent ways (theorem, linear algebra,
# simulation), Z-independence is proven by bitwise-identical chains, and
# the acceptance-rate dial is priced in effective samples.
import math
import random


def mh_chain(logpi, x0, sigma, steps, rng):
    """Random-walk Metropolis: symmetric Gaussian proposals."""
    x = x0
    lp = logpi(x)
    out = []
    acc = 0
    for _ in range(steps):
        y = x + rng.gauss(0, sigma)
        lq = logpi(y)
        if lq - lp > math.log(rng.random()):
            x, lp = y, lq
            acc += 1
        out.append(x)
    return out, acc / steps


def batch_means_ess(xs, batches=100):
    """Effective sample size by batch means: tau ~ B * var(batch means)
    / var(x); ESS = N / tau. Coarse, and plenty for ordering claims."""
    n = len(xs)
    b = n // batches
    xs = xs[: b * batches]
    mean = sum(xs) / len(xs)
    var = sum((v - mean) ** 2 for v in xs) / len(xs)
    if var == 0:
        return 1.0
    means = [sum(xs[i * b : (i + 1) * b]) / b for i in range(batches)]
    var_means = sum((m - mean) ** 2 for m in means) / batches
    tau = max(1.0, b * var_means / var)
    return len(xs) / tau


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: an exact discrete chain. Twelve states on a ring with
    # arbitrary unnormalized weights; proposal = step left/right with
    # probability 1/2; accept with min(1, w_j / w_i).
    S = 12
    w = [rng.randint(1, 20) for _ in range(S)]
    Z = sum(w)
    pi = [wi / Z for wi in w]
    P = [[0.0] * S for _ in range(S)]
    for i in range(S):
        for j in ((i - 1) % S, (i + 1) % S):
            P[i][j] = 0.5 * min(1.0, w[j] / w[i])
        P[i][i] = 1.0 - sum(P[i][j] for j in range(S) if j != i)
    # (a) The theorem, checked term by term: pi_i P_ij == pi_j P_ji.
    for i in range(S):
        for j in range(S):
            assert abs(pi[i] * P[i][j] - pi[j] * P[j][i]) < 1e-12
    # (b) Linear algebra: power iteration from a point mass converges
    # to pi without a single random number.
    v = [1.0] + [0.0] * (S - 1)
    for _ in range(2_000):
        v = [sum(v[i] * P[i][j] for i in range(S)) for j in range(S)]
    assert max(abs(v[j] - pi[j]) for j in range(S)) < 1e-10
    # (c) Simulation: the actual MH chain's occupancy matches pi.
    x = 0
    counts = [0] * S
    for _ in range(300_000):
        y = (x + rng.choice((-1, 1))) % S
        if w[y] / w[x] > rng.random():
            x = y
        counts[x] += 1
    freq = [c / 300_000 for c in counts]
    assert max(abs(freq[j] - pi[j]) for j in range(S)) < 0.008

    # Oracle 2: Z-independence, proven bitwise. The same seed, the same
    # target, once with an arbitrary constant added to log pi: the two
    # chains must be IDENTICAL, because only differences of log pi enter.
    def make_logpi(shift):
        def logpi(t):
            a = -0.5 * (t + 3.0) ** 2
            b = -0.5 * (t - 3.0) ** 2
            m = max(a, b)  # log-sum-exp: the reckless sigma visits far tails
            return m + math.log(math.exp(a - m) + math.exp(b - m)) + math.log(0.5) + shift
        return logpi

    bimodal = make_logpi(0.0)
    chain_a, _ = mh_chain(bimodal, -3.0, 2.4, 5_000, random.Random(7))
    chain_b, _ = mh_chain(make_logpi(math.log(7.3)), -3.0, 2.4, 5_000, random.Random(7))
    assert chain_a == chain_b  # the unknown constant never mattered

    # Oracle 3: known moments of the bimodal mixture 0.5 N(-3,1) +
    # 0.5 N(3,1): mean 0, E[X^2] = 10, P(X > 0) = 1/2.
    xs, _ = mh_chain(bimodal, -3.0, 2.4, 200_000, rng)
    xs = xs[2_000:]
    m1 = sum(xs) / len(xs)
    m2 = sum(v * v for v in xs) / len(xs)
    p_pos = sum(1 for v in xs if v > 0) / len(xs)
    assert abs(m1) < 0.2, m1
    assert abs(m2 - 10.0) < 0.6, m2
    assert abs(p_pos - 0.5) < 0.04, p_pos

    # Oracle 4: the acceptance-rate dial, priced. Three step sizes on
    # the same target: acceptance, effective samples, mode crossings.
    dial = {}
    for sigma in (0.1, 2.4, 50.0):
        ch, acc = mh_chain(bimodal, -3.0, sigma, 100_000, rng)
        crossings = sum(
            1 for i in range(1, len(ch)) if (ch[i] > 0) != (ch[i - 1] > 0)
        )
        dial[sigma] = (acc, batch_means_ess(ch), crossings)
    assert dial[0.1][0] > 0.90        # baby steps: almost always accepted
    assert dial[50.0][0] < 0.15       # wild leaps: almost always rejected
    assert 0.2 < dial[2.4][0] < 0.75  # the tuned middle
    assert dial[2.4][1] > 3 * dial[0.1][1], dial
    # An honest surprise, kept: in ONE dimension the reckless jumper
    # retains decent ESS, because a landed 5% leap teleports across the
    # whole support. The tuned step still wins, but modestly here; the
    # timid crawler is the true disaster. Dimension is what kills the
    # jumper, and Oracle 6 measures that execution.
    assert dial[2.4][1] > 1.3 * dial[50.0][1], dial
    assert dial[2.4][2] > 10 * max(1, dial[0.1][2]), dial

    # Oracle 5: Bayesian inference with an exact posterior. 7 heads in
    # 10 flips, uniform prior: posterior Beta(8, 4), mean 2/3,
    # variance 8*4 / (12^2 * 13).
    def log_post(p):
        if p <= 0.0 or p >= 1.0:
            return -math.inf
        return 7 * math.log(p) + 3 * math.log(1 - p)

    ps, _ = mh_chain(log_post, 0.5, 0.15, 100_000, rng)
    ps = ps[1_000:]
    pm = sum(ps) / len(ps)
    pv = sum((v - pm) ** 2 for v in ps) / len(ps)
    assert abs(pm - 2 / 3) < 0.01, pm
    assert abs(pv - 32 / (144 * 13)) < 0.004, pv

    # Oracle 6: the never-use, priced. Rejection sampling for a 6-d
    # Gaussian from a uniform box envelope: the true acceptance rate is
    # (2 pi)^3 / 10^6 = 2.5 per ten thousand, and it squares away with
    # every added dimension. MH walks the same target comfortably.
    D = 6
    attempts = 200_000
    accepts = 0
    for _ in range(attempts):
        pt = [rng.uniform(-5, 5) for _ in range(D)]
        if rng.random() < math.exp(-0.5 * sum(t * t for t in pt)):
            accepts += 1
    assert 10 <= accepts <= 150, accepts

    xd = [0.0] * D
    lp = -0.5 * sum(t * t for t in xd)
    acc6 = 0
    coord_sq = 0.0
    coord_sum = 0.0
    first = []
    sig6 = 2.4 / math.sqrt(D)
    for _ in range(attempts):
        yd = [t + rng.gauss(0, sig6) for t in xd]
        lq = -0.5 * sum(t * t for t in yd)
        if lq - lp > math.log(rng.random()):
            xd, lp = yd, lq
            acc6 += 1
        coord_sq += sum(t * t for t in xd) / D
        coord_sum += sum(xd) / D
        first.append(xd[0])
    assert abs(coord_sq / attempts - 1.0) < 0.08     # E[x_i^2] = 1
    assert abs(coord_sum / attempts) < 0.08          # E[x_i] = 0
    ess6 = batch_means_ess(first)
    assert ess6 > 20 * accepts, (ess6, accepts)

    # The jumper's execution, in dimension: the same reckless sigma that
    # survived 1-D is dead at d = 6, because a 50-sigma leap essentially
    # never lands in the typical set again.
    xw = [0.0] * D
    lpw = -0.5 * sum(t * t for t in xw)
    accw = 0
    for _ in range(50_000):
        yw = [t + rng.gauss(0, 50.0) for t in xw]
        lqw = -0.5 * sum(t * t for t in yw)
        if lqw - lpw > math.log(rng.random()):
            xw, lpw = yw, lqw
            accw += 1
    wild_rate = accw / 50_000
    assert wild_rate < 0.005, wild_rate

    print("contest: the bimodal target 0.5*N(-3,1) + 0.5*N(3,1), unnormalized (an arbitrary constant is PROVEN irrelevant by bitwise-identical chains); 100,000 steps per row")
    print(f"  {'step size':<22} {'acceptance':>10} {'ESS/100K':>9} {'mode crossings':>15}")
    for sigma, label in ((0.1, 'sigma 0.1 (timid)'), (2.4, 'sigma 2.4 (tuned)'), (50.0, 'sigma 50 (reckless)')):
        acc, ess, cr = dial[sigma]
        print(f"  {label:<22} {acc:>9.1%} {ess:>9.0f} {cr:>15,}")
    print(f"exact-chain referee: detailed balance verified on all 144 state pairs; power iteration and a 300,000-step chain both land on pi (max errors 1e-10 and {max(abs(freq[j] - pi[j]) for j in range(S)):.4f})")
    print(f"bimodal moments: mean {m1:+.3f} (exact 0), E[X^2] {m2:.2f} (exact 10), P(X>0) {p_pos:.3f} (exact 0.5)")
    print(f"coin posterior Beta(8,4): sampled mean {pm:.4f} (exact {2/3:.4f}), variance {pv:.5f} (exact {32/(144*13):.5f})")
    print(f"never-use, priced at d = {D}: rejection sampling accepted {accepts} of {attempts:,} tries ({accepts/attempts:.2%}, theory 0.025%); MH on the same budget: {acc6/attempts:.1%} acceptance, ESS {ess6:.0f} on the first coordinate ({ess6/max(accepts,1):.0f}x the useful output), coordinate moments verified")
    print(f"the jumper's execution: sigma 50 survived 1-D (ESS {dial[50.0][1]:.0f}) but at d = {D} its acceptance is {wild_rate:.2%}: dimension, not step size alone, is the killer")
    print("OK: detailed balance exact, three routes to pi agree, Z-independence bitwise, moments and the Beta posterior match theory, the dial's ESS ordering holds, and rejection sampling's exponential collapse is measured, not asserted")
