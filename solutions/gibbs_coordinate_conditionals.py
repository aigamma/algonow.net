# Puzzle 63: Gibbs sampling x coordinate-wise conditional draws
# Sample a joint distribution you cannot draw from directly, by
# cycling its coordinates and drawing each one EXACTLY from its
# conditional given the rest.
#
# The pairing is the point. The algorithm is the Metropolis-Hastings
# frame (a live unit): propose, accept, and the chain's occupancy
# becomes the answer. The heuristic is the proposal: use the full
# conditional itself, and the acceptance ratio becomes exactly 1:
# there is no reject branch in this file at all. The referees are
# analytic and exhaustive: a bivariate Gaussian whose conditionals,
# moments, and even whose CHAIN AUTOCORRELATION are known in closed
# form (the x-chain is AR(1) with coefficient rho^2, so the mixing
# time (1+rho^2)/(1-rho^2) is a checkable prediction, matched here at
# rho 0.6 and 0.995), and a 4x4 Ising model whose 65,536 states are
# ENUMERATED for exact expectations: the Geman brothers' own habitat.
# The betrayal is measured, not narrated: at rho 0.995 the never-
# rejecting sampler crawls, its mixing time blowing up 94-fold.
import math
import random


def gibbs_gauss(rho, sweeps, rng):
    """Bivariate normal, unit variances: x|y ~ N(rho y, 1-rho^2)."""
    s = math.sqrt(1 - rho * rho)
    x = y = 0.0
    xs = [0.0] * sweeps
    ys = [0.0] * sweeps
    for t in range(sweeps):
        x = rho * y + s * rng.gauss(0.0, 1.0)  # exact conditional: accept prob 1
        y = rho * x + s * rng.gauss(0.0, 1.0)
        xs[t] = x
        ys[t] = y
    return xs, ys


def mh_gauss(rho, steps, sigma, rng):
    """The live MH unit's random walk on the same target, for the race."""
    x = y = 0.0
    acc = 0
    xs = [0.0] * steps
    ys = [0.0] * steps
    logpi = lambda x, y: -(x * x - 2 * rho * x * y + y * y) / (2 * (1 - rho * rho))
    lp = logpi(x, y)
    for t in range(steps):
        nx = x + rng.gauss(0.0, sigma)
        ny = y + rng.gauss(0.0, sigma)
        nlp = logpi(nx, ny)
        if math.log(rng.random() + 1e-300) < nlp - lp:
            x, y, lp = nx, ny, nlp
            acc += 1
        xs[t] = x
        ys[t] = y
    return xs, ys, acc / steps


def corr(xs, ys):
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    sxx = sum((a - mx) ** 2 for a in xs)
    syy = sum((b - my) ** 2 for b in ys)
    return sxy / math.sqrt(sxx * syy)


def lag1(xs):
    return corr(xs[:-1], xs[1:])


EDGES = []
for r in range(4):
    for c in range(4):
        i = 4 * r + c
        if c < 3:
            EDGES.append((i, i + 1))
        if r < 3:
            EDGES.append((i, i + 4))


def ising_exact(beta):
    """All 65,536 states of the 4x4 free-boundary Ising model."""
    Z = 0.0
    m_acc = 0.0
    e_acc = 0.0
    for state in range(1 << 16):
        diff = 0
        for i, j in EDGES:
            diff += (state >> i ^ state >> j) & 1
        energy = -(len(EDGES) - 2 * diff)  # agree: -1, disagree: +1
        mag = abs(2 * bin(state).count("1") - 16)
        w = math.exp(-beta * energy)
        Z += w
        m_acc += mag * w
        e_acc += energy * w
    return m_acc / Z / 16, e_acc / Z


def ising_gibbs(beta, sweeps, rng):
    """Single-site conditionals: P(s_i=+1 | rest) = sigmoid(2 beta h)."""
    NBR = [[] for _ in range(16)]
    for i, j in EDGES:
        NBR[i].append(j)
        NBR[j].append(i)
    s = [rng.choice((-1, 1)) for _ in range(16)]
    m_acc = 0.0
    e_acc = 0.0
    kept = 0
    for t in range(sweeps):
        for i in range(16):
            h = sum(s[j] for j in NBR[i])
            p = 1.0 / (1.0 + math.exp(-2.0 * beta * h))
            s[i] = 1 if rng.random() < p else -1  # exact conditional: no reject
        if t >= sweeps // 5:  # burn one fifth
            m_acc += abs(sum(s))
            e_acc += -sum(s[i] * s[j] for i, j in EDGES)
            kept += 1
    return m_acc / kept / 16, e_acc / kept


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the bivariate Gaussian at rho = 0.6, refereed by its
    # analytic moments AND its analytic mixing time. The x-subchain is
    # AR(1) with coefficient rho^2 (x -> y -> x composes two shrinks),
    # so lag-1 autocorrelation and the integrated autocorrelation time
    # tau = (1 + rho^2)/(1 - rho^2) are predictions, not vibes.
    rho = 0.6
    xs, ys = gibbs_gauss(rho, 200_000, rng)
    xs_b, ys_b = xs[10_000:], ys[10_000:]
    n = len(xs_b)
    mean_x = sum(xs_b) / n
    var_x = sum(v * v for v in xs_b) / n - mean_x**2
    c = corr(xs_b, ys_b)
    assert abs(mean_x) < 0.02
    assert abs(var_x - 1.0) < 0.03
    assert abs(c - rho) < 0.02
    a_hat = lag1(xs_b)
    assert abs(a_hat - rho * rho) < 0.01, a_hat  # AR(1) coef = rho^2
    tau_06 = (1 + a_hat) / (1 - a_hat)
    tau_06_theory = (1 + rho * rho) / (1 - rho * rho)
    assert abs(tau_06 - tau_06_theory) / tau_06_theory < 0.10

    # Oracle 2: the crawl at rho = 0.995, same referee. The staircase
    # takes steps of size sqrt(1 - rho^2): the mixing time explodes by
    # the predicted factor even though every draw is still accepted.
    rho_hi = 0.995
    xh, yh = gibbs_gauss(rho_hi, 400_000, rng)
    xh_b = xh[40_000:]
    a_hi = lag1(xh_b)
    assert abs(a_hi - rho_hi * rho_hi) < 0.004, a_hi
    tau_hi = (1 + a_hi) / (1 - a_hi)
    tau_hi_theory = (1 + rho_hi**2) / (1 - rho_hi**2)
    assert abs(tau_hi - tau_hi_theory) / tau_hi_theory < 0.25
    blowup = tau_hi / tau_06
    assert blowup > 50  # the betrayal: never rejecting, barely moving

    # Oracle 3: the race at rho = 0.6, equal scalar-draw budgets.
    # Gibbs never rejects by construction (there is no reject branch);
    # MH pays tuning: a good sigma wastes ~half its proposals, a bad
    # sigma nearly all of them.
    xs_g, ys_g = gibbs_gauss(rho, 100_000, rng)
    err_gibbs = abs(corr(xs_g[5000:], ys_g[5000:]) - rho)
    xm, ym, acc_good = mh_gauss(rho, 100_000, 1.2, rng)
    err_mh_good = abs(corr(xm[5000:], ym[5000:]) - rho)
    xm2, ym2, acc_bad = mh_gauss(rho, 100_000, 12.0, rng)
    err_mh_bad = abs(corr(xm2[5000:], ym2[5000:]) - rho)
    assert err_gibbs < err_mh_bad  # the untuned rival loses outright
    assert acc_bad < 0.05 < acc_good

    # Oracle 4: the Ising model, refereed by EXACT enumeration of all
    # 65,536 states (the Geman brothers' image-restoration habitat in
    # miniature: spins as pixels, neighbors as smoothness).
    beta = 0.4
    m_exact, e_exact = ising_exact(beta)
    m_gibbs, e_gibbs = ising_gibbs(beta, 60_000, rng)
    assert abs(m_gibbs - m_exact) < 0.02, (m_gibbs, m_exact)
    assert abs(e_gibbs - e_exact) / abs(e_exact) < 0.03, (e_gibbs, e_exact)

    print(f"contest: estimate corr of a rho = 0.6 Gaussian, 100,000 sweeps/steps each; referee: the analytic answer")
    print(f"  {'sampler':<24} {'accept':>8} {'|corr err|':>11}")
    print(f"  {'Gibbs conditionals':<24} {'1.000':>8} {err_gibbs:>11.4f}   no reject branch exists in the file")
    print(f"  {'MH, sigma 1.2 (tuned)':<24} {acc_good:>8.3f} {err_mh_good:>11.4f}   the live unit, well tuned: a fair fight")
    print(f"  {'MH, sigma 12 (untuned)':<24} {acc_bad:>8.3f} {err_mh_bad:>11.4f}   frozen: rejects ~{100*(1-acc_bad):.0f}% of everything")
    print(f"the mixing law, matched: lag-1 autocorr = rho^2 measured {a_hat:.4f} vs 0.36 and {a_hi:.4f} vs 0.9900; tau = (1+rho^2)/(1-rho^2): {tau_06:.1f} at rho 0.6 vs theory {tau_06_theory:.1f}, {tau_hi:.0f} at rho 0.995 vs theory {tau_hi_theory:.0f}: a {blowup:.0f}x crawl with every draw still accepted")
    print(f"the Ising referee, exact over all 65,536 states at beta 0.4: |M|/16 exact {m_exact:.4f} vs Gibbs {m_gibbs:.4f}; energy exact {e_exact:.2f} vs Gibbs {e_gibbs:.2f}")
    print("OK: analytic moments and the AR(1) mixing law matched at both correlations, the 94x crawl measured, the MH race run at equal budgets, and the exhaustive Ising enumeration agreeing with the sampler")
