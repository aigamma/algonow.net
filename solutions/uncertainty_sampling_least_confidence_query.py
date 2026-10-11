"""Uncertainty sampling x Least-confidence query: pool-based active learning
(Lewis and Gale 1994) with a Newton-trained logistic regression, against
random sampling and its own failure modes. Pure Python, seeded; the three
AUTHOR CORRECTIONS are printed at the end of the run.
"""
import math
import random
import time

T0 = time.time()


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def solve(A, b):
    """Gaussian elimination with partial pivoting (small Newton systems)."""
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        piv = M[c][c]
        for j in range(c, n + 1):
            M[c][j] /= piv
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                for j in range(c, n + 1):
                    M[r][j] -= f * M[c][j]
    return [M[i][n] for i in range(n)]


def sigmoid(z):
    if z >= 0:
        return 1 / (1 + math.exp(-z))
    e = math.exp(z)
    return e / (1 + e)


def fit(X, y, lam=0.05, iters=15):
    """L2-regularized logistic regression by Newton's method; bias first."""
    d = len(X[0]) + 1
    w = [0.0] * d
    for _ in range(iters):
        g = [lam * wi for wi in w]
        H = [[lam * (i == j) for j in range(d)] for i in range(d)]
        for xi, yi in zip(X, y):
            x = [1.0] + xi
            p = sigmoid(dot(w, x))
            r, s = p - yi, p * (1 - p)
            for i in range(d):
                g[i] += r * x[i]
                for j in range(d):
                    H[i][j] += s * x[i] * x[j]
        step = solve(H, g)
        w = [wi - si for wi, si in zip(w, step)]
        if max(abs(s) for s in step) < 1e-6:
            break
    return w


def prob(w, x):
    return sigmoid(w[0] + dot(w[1:], x))


def acc(w, X, y):
    return sum((prob(w, x) >= 0.5) == (yi == 1) for x, yi in zip(X, y)) / len(X)


def cluster(rng, c, sd, n):
    return [[rng.gauss(ci, sd) for ci in c] for _ in range(n)]


def two_class(rng, n, sep, sd=1.0, d=2):
    c0 = [-sep / 2] + [0.0] * (d - 1)
    c1 = [sep / 2] + [0.0] * (d - 1)
    return cluster(rng, c0, sd, n) + cluster(rng, c1, sd, n), [0] * n + [1] * n


def least_conf(p):
    return 1 - max(p, 1 - p)


def rbf_density(X, bw=1.5):
    """Mean similarity of each point to the pool (Settles and Craven's density)."""
    out = []
    for a in X:
        s = 0.0
        for b in X:
            s += math.exp(-sum((u - v) ** 2 for u, v in zip(a, b)) / (2 * bw * bw))
        out.append(s / len(X))
    return out


def farthest_first(X, k, rng):
    """Diversity seed: k pool points by farthest-first traversal."""
    S = [rng.randrange(len(X))]
    dist = [sum((u - v) ** 2 for u, v in zip(x, X[S[0]])) for x in X]
    while len(S) < k:
        j = max(range(len(X)), key=lambda i: dist[i])
        S.append(j)
        dist = [min(dist[i], sum((u - v) ** 2 for u, v in zip(X[i], X[j]))) for i in range(len(X))]
    return S


def run(rng, X, y, Xt, yt, strategy, budget, seeds=1, density=None, seed_idx=None):
    """One active learning run. Returns (curve, queried indices, pool points scored)."""
    if seed_idx is None:
        L = rng.sample([i for i in range(len(y)) if y[i] == 0], seeds) + rng.sample([i for i in range(len(y)) if y[i] == 1], seeds)
    else:
        L = list(seed_idx)
    U = [i for i in range(len(y)) if i not in set(L)]
    curve, queried, scored = [], [], 0
    for _ in range(budget):
        w = fit([X[i] for i in L], [y[i] for i in L])
        curve.append(acc(w, Xt, yt))
        if strategy == 'random':
            k = rng.randrange(len(U))
        else:
            scored += len(U)
            best, k = -1.0, 0
            for pos, i in enumerate(U):
                u = least_conf(prob(w, X[i])) * (density[i] if density else 1.0)
                if u > best:
                    best, k = u, pos
        queried.append(U[k])
        L.append(U.pop(k))
    curve.append(acc(fit([X[i] for i in L], [y[i] for i in L]), Xt, yt))
    return curve, queried, scored, L


def mean_se(v):
    m = sum(v) / len(v)
    return m, (sum((x - m) ** 2 for x in v) / (len(v) - 1) / len(v)) ** 0.5 if len(v) > 1 else 0.0


def labels_to(curve, target, seeds=2):
    for i, a in enumerate(curve):
        if a >= target:
            return i + 2 * seeds
    return None


# ---------------------------------------------------------------- (1) curves
R, BUDGET = 30, 40
CONDS = (('plane', 2, 3.0), ('four dims', 4, 3.0), ('four dims, wide gap', 4, 5.0))
summary = {}
scored_total = {'uncertainty': 0, 'random': 0}
print('two Gaussian classes, 300-point pool, 400-point test, 2 seed labels, 40 queries, 30 seeds; target = Bayes accuracy minus 0.03')
print(f"{'data':<21}{'strategy':<13}{'acc@10':>8}{'acc@20':>8}{'acc@42':>8}{'AULC':>8}{'+-':>7}{'to target':>10}")
for tag, d, sep in CONDS:
    bayes = 0.5 * (1 + math.erf(sep / 2 / math.sqrt(2)))
    target = bayes - 0.03
    for strat in ('uncertainty', 'random'):
        cs = []
        for s in range(R):
            rng = random.Random(1000 * s + int(sep * 10) + d)
            X, y = two_class(rng, 150, sep, 1.0, d)
            Xt, yt = two_class(rng, 200, sep, 1.0, d)
            c, _, sc, _ = run(rng, X, y, Xt, yt, strat, BUDGET)
            cs.append(c)
            scored_total[strat] += sc
        mean_curve = [sum(c[i] for c in cs) / R for i in range(len(cs[0]))]
        a10, a20 = mean_se([c[8] for c in cs])[0], mean_se([c[18] for c in cs])[0]
        a42, e42 = mean_se([c[40] for c in cs])
        aulc, eaulc = mean_se([sum(c) / len(c) for c in cs])
        summary[(tag, strat)] = dict(a10=a10, a20=a20, a42=a42, e42=e42, aulc=aulc, eaulc=eaulc, to=labels_to(mean_curve, target), bayes=bayes, target=target)
        print(f"{tag:<21}{strat:<13}{a10:>8.4f}{a20:>8.4f}{a42:>8.4f}{aulc:>8.4f}{eaulc:>7.4f}{str(labels_to(mean_curve, target)):>10}")
    print(f"  Bayes accuracy {bayes:.4f}, target {target:.3f}")


def zscore(tag):
    u, r = summary[(tag, 'uncertainty')], summary[(tag, 'random')]
    return (u['aulc'] - r['aulc']) / (u['eaulc'] ** 2 + r['eaulc'] ** 2) ** 0.5


Z = {tag: zscore(tag) for tag, _, _ in CONDS}
print('AULC gain of uncertainty over random, in standard errors of the difference: ' + ', '.join(f"{t} {Z[t]:.1f}" for t in Z))
U4, R4 = summary[('four dims', 'uncertainty')], summary[('four dims', 'random')]
U2, R2_ = summary[('plane', 'uncertainty')], summary[('plane', 'random')]
UW, RW = summary[('four dims, wide gap', 'uncertainty')], summary[('four dims, wide gap', 'random')]
assert Z['four dims'] > 2.5, 'uncertainty must beat random on AULC in four dimensions by 2.5 standard errors'
assert U4['to'] is not None and (R4['to'] is None or U4['to'] < R4['to'])
assert UW['to'] is not None and RW['to'] is not None and UW['to'] <= RW['to']
assert Z['plane'] < Z['four dims']
assert scored_total['random'] == 0 and scored_total['uncertainty'] == len(CONDS) * R * sum(298 - i for i in range(BUDGET))
print(f"pool points scored over all runs: uncertainty {scored_total['uncertainty']:,}, random 0; both train {BUDGET + 1} models per run")

# ------------------------------------------------- (2) criteria agreement
rng = random.Random(7)
X, y = two_class(rng, 150, 2.5)
Xt, yt = two_class(rng, 100, 2.5)
L = [0, 150]
U = list(range(1, 150)) + list(range(151, 300))
agree = 0
for _ in range(40):
    w = fit([X[i] for i in L], [y[i] for i in L])
    ps = [prob(w, X[i]) for i in U]
    lc = max(range(len(U)), key=lambda k: 1 - max(ps[k], 1 - ps[k]))
    mg = min(range(len(U)), key=lambda k: abs(2 * ps[k] - 1))
    en = max(range(len(U)), key=lambda k: -sum(q * math.log(q) for q in (ps[k], 1 - ps[k]) if q > 0))
    assert lc == mg == en
    agree += 1
    L.append(U.pop(lc))
print(f"two classes: least confidence, margin, and entropy chose the same point on {agree} of {agree} rounds")


def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]


def fit_softmax(X, y, W, iters=30, lr=0.5, lam=0.01):
    K, d = len(W), len(W[0])
    for _ in range(iters):
        G = [[lam * W[k][j] for j in range(d)] for k in range(K)]
        for xi, yi in zip(X, y):
            x = [1.0] + xi
            p = softmax([dot(W[k], x) for k in range(K)])
            for k in range(K):
                r = p[k] - (1 if k == yi else 0)
                for j in range(d):
                    G[k][j] += r * x[j]
        W = [[W[k][j] - lr * G[k][j] / len(X) for j in range(d)] for k in range(K)]
    return W


diverge, rounds3 = 0, 0
for s in range(4):
    rng = random.Random(500 + s)
    cents = [(-2.5, 0.0), (2.5, 0.0), (0.0, 3.5)]
    X3 = sum((cluster(rng, c, 1.0, 30) for c in cents), [])
    y3 = [0] * 30 + [1] * 30 + [2] * 30
    L = [0, 30, 60]
    U = [i for i in range(90) if i not in L]
    W = [[0.0] * 3 for _ in range(3)]
    for _ in range(25):
        W = fit_softmax([X3[i] for i in L], [y3[i] for i in L], W)
        P = [softmax([dot(W[k], [1.0] + X3[i]) for k in range(3)]) for i in U]
        lc = max(range(len(U)), key=lambda k: 1 - max(P[k]))
        mg = min(range(len(U)), key=lambda k: (lambda q: q[0] - q[1])(sorted(P[k], reverse=True)))
        en = max(range(len(U)), key=lambda k: -sum(q * math.log(q) for q in P[k] if q > 0))
        rounds3 += 1
        if not (lc == mg == en):
            diverge += 1
        L.append(U.pop(lc))
print(f"three classes (softmax): the three criteria disagreed on {diverge} of {rounds3} rounds ({diverge / rounds3:.0%})")
assert diverge > 0

# ------------------------------------------------- (3a) the hidden cluster
R2 = 20
hid = {'uncertainty': [], 'random': [], 'diversity seed': []}
hidq = {'uncertainty': [], 'random': [], 'diversity seed': []}
main_acc = {k: [] for k in hid}
for s in range(R2):
    rng = random.Random(9000 + s)
    X = cluster(rng, (-2.0, 0.0), 0.8, 120) + cluster(rng, (2.0, 0.0), 0.8, 120) + cluster(rng, (-5.0, 6.0), 0.5, 20)
    y = [0] * 120 + [1] * 140
    Xt = cluster(rng, (-2.0, 0.0), 0.8, 200) + cluster(rng, (2.0, 0.0), 0.8, 200) + cluster(rng, (-5.0, 6.0), 0.5, 40)
    yt = [0] * 200 + [1] * 240
    hidden = set(range(240, 260))
    for strat in hid:
        rr = random.Random(77 + s)
        if strat == 'diversity seed':
            c, q, _, Lf = run(rr, X, y, Xt, yt, 'uncertainty', 34, seed_idx=farthest_first(X, 6, rr))
        else:  # the seed labels come from the known main clusters, as in practice
            c, q, _, Lf = run(rr, X, y, Xt, yt, strat, 38, seed_idx=[rr.randrange(120), 120 + rr.randrange(120)])
        assert len(Lf) == 40
        hidq[strat].append(sum(1 for i in Lf if i in hidden))
        wf = fit([X[i] for i in Lf], [y[i] for i in Lf])
        hid[strat].append(sum(prob(wf, x) >= 0.5 for x in Xt[400:]) / 40)
        main_acc[strat].append(acc(wf, Xt[:400], yt[:400]))
print('hidden cluster (20 of 260 pool points, class 1, far from the main boundary), 40 labels, 20 seeds')
for strat in hid:
    m, e = mean_se(hid[strat])
    mq, _ = mean_se(hidq[strat])
    ma, _ = mean_se(main_acc[strat])
    print(f"  {strat:<15} queries in the hidden cluster {mq:5.2f}; accuracy on it {m:.3f} +- {e:.3f}; on the main clusters {ma:.3f}")
assert sum(hidq['uncertainty']) == 0, 'uncertainty sampling must never query the hidden cluster'
assert mean_se(hid['uncertainty'])[0] < 0.05 < mean_se(hid['random'])[0] < mean_se(hid['diversity seed'])[0]
assert all(sum(1 for i in farthest_first(X, 6, random.Random(s)) if i in hidden) >= 1 for s in range(10))

# ------------------------------------------------- (3b) scattered noise
R3 = 20
waste = {'uncertainty': [], 'density weighted': [], 'random': []}
aul = {k: [] for k in waste}
for s in range(R3):
    rng = random.Random(3000 + s)
    X, y = two_class(rng, 120, 2.5)
    X += [[rng.uniform(-7.0, 7.0), rng.uniform(-7.0, 7.0)] for _ in range(30)]
    y += [rng.randrange(2) for _ in range(30)]
    Xt, yt = two_class(rng, 200, 2.5)
    dens = rbf_density(X)
    for strat in waste:
        rr = random.Random(55 + s)
        seed_idx = [rr.randrange(120), 120 + rr.randrange(120)]
        c, q, _, _ = run(rr, X, y, Xt, yt, 'random' if strat == 'random' else 'uncertainty', 30, density=dens if strat == 'density weighted' else None, seed_idx=seed_idx)
        waste[strat].append(sum(1 for i in q[:15] if i >= 240))
        aul[strat].append(sum(c) / len(c))
print('30 random-label noise points scattered over the plane among 240 cluster points, 30 queries, 20 seeds')
for strat in waste:
    mw, _ = mean_se(waste[strat])
    ma, ea = mean_se(aul[strat])
    print(f"  {strat:<17} noise points among the first 15 queries {mw:5.2f} of 15; AULC {ma:.4f} +- {ea:.4f}")
wu, wd, wr = (mean_se(waste[k])[0] for k in ('uncertainty', 'density weighted', 'random'))
assert wd < wu < wr, 'density weighting must cut the noise queries below plain uncertainty, which sits below random'
assert abs(mean_se(aul['density weighted'])[0] - mean_se(aul['uncertainty'])[0]) < 2 * (mean_se(aul['uncertainty'])[1] + mean_se(aul['density weighted'])[1])
assert mean_se(aul['uncertainty'])[0] - mean_se(aul['random'])[0] > 2 * (mean_se(aul['uncertainty'])[1] + mean_se(aul['random'])[1])

# ------------------------------------------------- (4) cold start
cold = {1: [], 5: []}
for s in range(R):
    for k in cold:
        rng = random.Random(4000 + s)
        X, y = two_class(rng, 150, 2.5)
        Xt, yt = two_class(rng, 200, 2.5)
        c, _, _, Lf = run(rng, X, y, Xt, yt, 'uncertainty', 20 - 2 * k, seeds=k)
        assert len(Lf) == 20
        cold[k].append(c[-1])
m1, e1 = mean_se(cold[1])
m5, e5 = mean_se(cold[5])
print(f"cold start, 20 labels in hand: seed 1 per class then 18 queries {m1:.4f} +- {e1:.4f}; seed 5 per class then 10 queries {m5:.4f} +- {e5:.4f}")

elapsed = time.time() - T0
print('AUTHOR CORRECTIONS: (1) the plane at separation 2.5 showed no gain beyond noise; the page uses 3.0 and four dimensions and says so. (2) density weighting does not fix the hidden cluster (itself sparse); the farthest-first seed does. (3) plain uncertainty sampling queried less noise than random, so density weighting is reported as removing the few noise queries at no measurable cost, not as a rescue.')
print(f"OK: in four dimensions uncertainty sampling reaches {U4['target']:.3f} test accuracy in {U4['to']} labels against {R4['to']} for random (AULC {U4['aulc']:.4f} vs {R4['aulc']:.4f}, {Z['four dims']:.1f} standard errors, Bayes {U4['bayes']:.3f}), {UW['to']} against {RW['to']} with a wide gap, and {U2['to']} against {R2_['to']} in the plane where the gain is {Z['plane']:.1f} standard errors; least confidence, margin, and entropy agree on all {agree} two-class rounds and disagree on {diverge} of {rounds3} three-class rounds; the hidden cluster got {sum(hidq['uncertainty'])} queries and {mean_se(hid['uncertainty'])[0]:.2f} accuracy under uncertainty sampling against {mean_se(hid['random'])[0]:.2f} random and {mean_se(hid['diversity seed'])[0]:.2f} with a diversity seed; noise points among the first 15 queries {wu:.2f} plain, {wd:.2f} density weighted, {wr:.2f} random; {scored_total['uncertainty']:,} pool scores against 0; {elapsed:.1f} s")
