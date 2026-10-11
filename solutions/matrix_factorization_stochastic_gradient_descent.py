"""Matrix factorization x stochastic gradient descent, puzzle 213.

Biased MF (Funk 2006; Koren, Bell, Volinsky 2009), r_hat = mu + b_u + b_i +
p_u . q_i, trained by SGD with L2 shrinkage on ratings PLANTED from a
rank-3 model with Gaussian noise, so the oracle is exact (noise floor,
noiseless truth). Rivals on the same split: mean, biases, user k-NN, ALS.
Rank and shrinkage sweeps, cold users, a diverging step, and the dense SVD
of the zero-filled matrix (the negative example) are measured.

AUTHOR CORRECTIONS (measured, then the text was changed): the draft
expected lambda = 0 to overfit at the planted rank; at k = 3 the held-out
error was 0.584 against 0.583 with shrinkage (the decaying step is enough
regularization when capacity matches the data), so the overfitting
demonstration moved to k = 20, where lambda = 0 memorizes (train 0.048,
held-out 1.06, early-stopping best 0.925 at epoch 11) and lambda 0.05
gives 0.697. The draft also claimed the held-out curve is flat past the
true rank; it rises from 0.583 at k = 3 to 0.697 at k = 20. Every number
below regenerates from the seeds.
"""
import math
import random
import time

U, I, K, SIGMA, MU, FSD = 150, 100, 3, 0.5, 3.5, 0.8
P_TRAIN, P_TEST = 0.25, 0.05


def make_data(seed):
    rng = random.Random(seed)
    bu = [rng.gauss(0, 0.3) for _ in range(U)]
    bi = [rng.gauss(0, 0.4) for _ in range(I)]
    P = [[rng.gauss(0, FSD) for _ in range(K)] for _ in range(U)]
    Q = [[rng.gauss(0, FSD) for _ in range(K)] for _ in range(I)]
    truth = [[MU + bu[u] + bi[i] + sum(P[u][f] * Q[i][f] for f in range(K)) for i in range(I)] for u in range(U)]
    train, test = [], []
    for u in range(U):
        for i in range(I):
            x = rng.random()
            if x < P_TRAIN:
                train.append((u, i, truth[u][i] + rng.gauss(0, SIGMA)))
            elif x < P_TRAIN + P_TEST:
                test.append((u, i, truth[u][i] + rng.gauss(0, SIGMA)))
    return truth, train, test


def rmse(pred, data):
    return math.sqrt(sum((pred(u, i) - r) ** 2 for u, i, r in data) / len(data))


def sgd_fit(train, k, lam, gamma=0.05, epochs=60, seed=1, decay=0.97, test=None, clip=1e6, init=0.3):
    rng = random.Random(seed)
    mu = sum(r for _, _, r in train) / len(train)
    bu, bi = [0.0] * U, [0.0] * I
    P = [[rng.gauss(0, init) for _ in range(k)] for _ in range(U)]
    Q = [[rng.gauss(0, init) for _ in range(k)] for _ in range(I)]

    def predict(u, i):
        return mu + bu[u] + bi[i] + sum(P[u][f] * Q[i][f] for f in range(k))

    order = list(train)
    tr_curve, te_curve, updates, diverged = [], [], 0, None
    for ep in range(epochs):
        rng.shuffle(order)
        for u, i, r in order:
            e = r - predict(u, i)
            if abs(e) > clip or e != e:
                diverged = ep + 1
                return predict, tr_curve, te_curve, updates, diverged
            bu[u] += gamma * (e - lam * bu[u])
            bi[i] += gamma * (e - lam * bi[i])
            pu, qi = P[u], Q[i]
            for f in range(k):
                pf, qf = pu[f], qi[f]
                pu[f] += gamma * (e * qf - lam * pf)
                qi[f] += gamma * (e * pf - lam * qf)
            updates += 1
        gamma *= decay
        tr_curve.append(rmse(predict, train))
        if test is not None:
            te_curve.append(rmse(predict, test))
    return predict, tr_curve, te_curve, updates, diverged


def solve(A, b):
    """Gaussian elimination with partial pivoting."""
    n = len(b)
    M = [row[:] + [b[r]] for r, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for j in range(c, n + 1):
                    M[r][j] -= f * M[c][j]
    return [M[r][n] / M[r][r] for r in range(n)]


def als_fit(train, k, lam, iters=15, seed=1):
    """Biased ALS: ridge-solve every user (bias as a constant feature), then every item."""
    rng = random.Random(seed)
    mu = sum(r for _, _, r in train) / len(train)
    X = [[rng.gauss(0, 0.1) for _ in range(k)] + [0.0] for _ in range(U)]  # factors + bias
    Y = [[rng.gauss(0, 0.1) for _ in range(k)] + [0.0] for _ in range(I)]
    by_u = [[] for _ in range(U)]
    by_i = [[] for _ in range(I)]
    for u, i, r in train:
        by_u[u].append((i, r))
        by_i[i].append((u, r))
    flops = 0

    def step(rows, other, lists):
        nonlocal flops
        d = k + 1
        for a in range(len(rows)):
            if not lists[a]:
                continue
            A = [[lam * len(lists[a]) * (1.0 if r == c else 0.0) for c in range(d)] for r in range(d)]
            b = [0.0] * d
            for o, r in lists[a]:
                v = other[o][:k] + [1.0]
                res = r - mu - other[o][k]
                for r_ in range(d):
                    b[r_] += v[r_] * res
                    for c in range(d):
                        A[r_][c] += v[r_] * v[c]
                flops += d * d + d
            rows[a] = solve(A, b)
            flops += d ** 3

    for _ in range(iters):
        step(X, Y, by_u)
        step(Y, X, by_i)

    def predict(u, i):
        return mu + X[u][k] + Y[i][k] + sum(X[u][f] * Y[i][f] for f in range(k))
    return predict, flops


def knn_fit(train, neigh=20):
    """User-based Pearson k-NN on mean-centered ratings."""
    mu = sum(r for _, _, r in train) / len(train)
    ru = [{} for _ in range(U)]
    isum, icnt = [0.0] * I, [0] * I
    for u, i, r in train:
        ru[u][i] = r
        isum[i] += r
        icnt[i] += 1
    umean = [sum(d.values()) / len(d) if d else mu for d in ru]
    imean = [isum[i] / icnt[i] if icnt[i] else mu for i in range(I)]
    sim = [{} for _ in range(U)]
    for a in range(U):
        for b in range(a + 1, U):
            common = ru[a].keys() & ru[b].keys()
            if len(common) < 3:
                continue
            da = [ru[a][i] - umean[a] for i in common]
            db = [ru[b][i] - umean[b] for i in common]
            num = sum(x * y for x, y in zip(da, db))
            den = math.sqrt(sum(x * x for x in da) * sum(y * y for y in db))
            if den > 0:
                s = num / den * min(len(common), 10) / 10  # significance shrinkage
                sim[a][b] = sim[b][a] = s

    def predict(u, i):
        cands = sorted(((s, v) for v, s in sim[u].items() if i in ru[v] and s > 0), reverse=True)[:neigh]
        if not cands:
            return imean[i] + umean[u] - mu
        num = sum(s * (ru[v][i] - umean[v]) for s, v in cands)
        return umean[u] + num / sum(s for s, _ in cands)
    return predict


def dense_svd_fit(train, k, iters=30, seed=1):
    """Rank-k SVD of the ZERO-FILLED matrix by subspace iteration: the classic mistake."""
    rng = random.Random(seed)
    A = [[0.0] * I for _ in range(U)]
    for u, i, r in train:
        A[u][i] = r
    V = [[rng.gauss(0, 1) for _ in range(k)] for _ in range(I)]

    def orth(M):
        n, d = len(M), len(M[0])
        for c in range(d):
            for p in range(c):
                dot = sum(M[r][c] * M[r][p] for r in range(n))
                for r in range(n):
                    M[r][c] -= dot * M[r][p]
            nrm = math.sqrt(sum(M[r][c] ** 2 for r in range(n))) or 1.0
            for r in range(n):
                M[r][c] /= nrm
        return M

    for _ in range(iters):
        Uk = orth([[sum(A[u][i] * V[i][f] for i in range(I)) for f in range(k)] for u in range(U)])
        V = orth([[sum(A[u][i] * Uk[u][f] for u in range(U)) for f in range(k)] for i in range(I)])
    S = [[sum(A[u][i] * V[i][f] for i in range(I)) for f in range(k)] for u in range(U)]  # U_k Sigma_k
    return lambda u, i: sum(S[u][f] * V[i][f] for f in range(k))


def main():
    t0 = time.time()
    truth, train, test = make_data(2026)
    print(f"planted rank {K}, {U} users x {I} items, {len(train)} train / {len(test)} test ratings, noise {SIGMA}")
    g_mean = sum(r for _, _, r in train) / len(train)
    base_mean = rmse(lambda u, i: g_mean, test)
    bias_pred, *_ = sgd_fit(train, 0, 0.05, test=test)
    base_bias = rmse(bias_pred, test)
    mf, tr, te, updates, div = sgd_fit(train, K, 0.05, test=test)
    mf_test = te[-1]
    mf_truth = math.sqrt(sum((mf(u, i) - truth[u][i]) ** 2 for u, i, _ in test) / len(test))
    print(f"global mean {base_mean:.3f} | biases only {base_bias:.3f} | MF k={K} held-out {mf_test:.3f} (noise floor {SIGMA}) | error vs noiseless truth {mf_truth:.3f}")
    assert div is None and SIGMA <= mf_test < SIGMA + 0.12, mf_test
    assert mf_truth < 0.75 * SIGMA, mf_truth
    assert mf_test < base_bias < base_mean

    # (b) rivals across seeds
    rows = {"global mean": [], "biases only": [], "user k-NN (Pearson, 20)": [], "ALS (biased, lam 0.05)": [], "MF-SGD (k=3, lam 0.05)": []}
    als_flops = 0
    for seed in range(5):
        tr_, tr_set, te_set = make_data(100 + seed)
        gm = sum(r for _, _, r in tr_set) / len(tr_set)
        rows["global mean"].append(rmse(lambda u, i: gm, te_set))
        bp, *_ = sgd_fit(tr_set, 0, 0.05)
        rows["biases only"].append(rmse(bp, te_set))
        rows["user k-NN (Pearson, 20)"].append(rmse(knn_fit(tr_set), te_set))
        ap, fl = als_fit(tr_set, K, 0.05)
        als_flops = fl
        rows["ALS (biased, lam 0.05)"].append(rmse(ap, te_set))
        mp, *_ = sgd_fit(tr_set, K, 0.05)
        rows["MF-SGD (k=3, lam 0.05)"].append(rmse(mp, te_set))
    stats = {}
    for name, xs in rows.items():
        m = sum(xs) / len(xs)
        se = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1) / len(xs))
        stats[name] = (m, se)
        print(f"  {name:28s} held-out RMSE {m:.3f} +- {se:.3f}")
    assert stats["MF-SGD (k=3, lam 0.05)"][0] < stats["user k-NN (Pearson, 20)"][0] - 0.05
    assert stats["MF-SGD (k=3, lam 0.05)"][0] < stats["biases only"][0] - 0.1
    assert abs(stats["MF-SGD (k=3, lam 0.05)"][0] - stats["ALS (biased, lam 0.05)"][0]) < 0.05

    # (c) shrinkage: irrelevant at the true rank, decisive at k = 20
    _, tr0, te0, _, _ = sgd_fit(train, K, 0.0, test=test)
    _, tr20, te20, _, _ = sgd_fit(train, 20, 0.0, decay=1.0, test=test)
    _, _, te20r, _, _ = sgd_fit(train, 20, 0.05, test=test)
    _, _, te20s, _, _ = sgd_fit(train, 20, 0.1, test=test)
    best_ep = min(range(len(te20)), key=lambda e: te20[e]) + 1
    print(f"lambda 0 at k={K}: held-out {te0[-1]:.3f} against {te[-1]:.3f} with lambda 0.05 (no overfit at the true rank)")
    print(f"k=20: lambda 0 train {tr20[-1]:.3f} held-out {te20[-1]:.3f} (best {min(te20):.3f} at epoch {best_ep}); lambda 0.05 held-out {te20r[-1]:.3f}; lambda 0.1 {te20s[-1]:.3f}")
    assert abs(te0[-1] - te[-1]) < 0.02
    assert tr20[-1] < 0.1 and te20[-1] > min(te20) + 0.1 and te20r[-1] < te20[-1] - 0.2 and te20s[-1] < te20r[-1]

    # (d) rank sweep
    sweep = {}
    for k in (1, 2, 3, 5, 10, 20):
        _, _, tek, _, _ = sgd_fit(train, k, 0.05, test=test)
        sweep[k] = tek[-1]
    print("rank sweep held-out: " + ", ".join(f"k={k} {v:.3f}" for k, v in sweep.items()))
    assert min(sweep, key=sweep.get) == K and sweep[1] > sweep[3] + 0.3 and sweep[20] > sweep[3] + 0.05

    # (e) cold start
    cnt = [0] * U
    for u, _, _ in train:
        cnt[u] += 1
    # cold set: drop all but one rating of 20 users
    rng = random.Random(7)
    victims = set(rng.sample(range(U), 20))
    kept = {}
    tr_cold = []
    for u, i, r in train:
        if u in victims:
            if u in kept:
                continue
            kept[u] = i
        tr_cold.append((u, i, r))
    mfc, *_ = sgd_fit(tr_cold, K, 0.05)
    cold_test = [(u, i, r) for u, i, r in test if u in victims]
    warm_test = [(u, i, r) for u, i, r in test if u not in victims and cnt[u] >= 10]
    bias_c, *_ = sgd_fit(tr_cold, 0, 0.05)
    r_cold, r_warm = rmse(mfc, cold_test), rmse(mfc, warm_test)
    print(f"cold start: 20 users cut to one rating ({len(cold_test)} held-out) RMSE {r_cold:.3f} against {r_warm:.3f} warm (10+ ratings); biases alone {rmse(bias_c, cold_test):.3f} on the cold users")
    assert r_cold > r_warm + 0.05

    # (f) cost
    sgd_mults = updates * (2 * K + 2)
    print(f"cost: SGD {updates} updates, about {sgd_mults} multiply-adds; ALS 15 sweeps, about {als_flops} plus {15 * (U + I)} 4x4 solves; a dense SVD pass touches all {U * I} cells")

    # negative examples
    svd_pred = dense_svd_fit(train, K)
    svd_rmse = rmse(svd_pred, test)
    _, _, _, _, div_ep = sgd_fit(train, K, 0.05, gamma=0.5, epochs=20, decay=1.0)
    print(f"negative: rank-{K} SVD of the zero-filled matrix held-out RMSE {svd_rmse:.3f} (missing cells pulled toward zero); SGD at step size 0.5 diverged in epoch {div_ep}")
    assert svd_rmse > base_mean and div_ep is not None

    secs = time.time() - t0
    print(f"OK: MF by SGD reaches held-out RMSE {mf_test:.3f} against the noise floor {SIGMA} ({mf_truth:.3f} vs the noiseless truth) where biases give {base_bias:.3f} and the mean {base_mean:.3f}; over 5 seeds MF {stats['MF-SGD (k=3, lam 0.05)'][0]:.3f} +- {stats['MF-SGD (k=3, lam 0.05)'][1]:.3f}, ALS {stats['ALS (biased, lam 0.05)'][0]:.3f}, user k-NN {stats['user k-NN (Pearson, 20)'][0]:.3f}, biases {stats['biases only'][0]:.3f}; at the true rank lambda 0 costs nothing ({te0[-1]:.3f}) but at k=20 it memorizes (train {tr20[-1]:.3f}, held-out {te20[-1]:.3f}, best {min(te20):.3f} at epoch {best_ep}) where lambda 0.05 gives {te20r[-1]:.3f}; rank sweep k=1 {sweep[1]:.3f}, k=3 {sweep[3]:.3f}, k=20 {sweep[20]:.3f}; cold users {r_cold:.3f} against warm {r_warm:.3f}; zero-filled SVD {svd_rmse:.3f}; step 0.5 diverges in epoch {div_ep}; {secs:.1f} s")


if __name__ == "__main__":
    main()
