# Puzzle 128: AdaBoost x exponential reweighting
# Boosted classification: combine many weak classifiers, here decision
# stumps (one feature, one threshold, one polarity), into a strong one.
# AdaBoost is the algorithm: T rounds, each fitting one stump to a
# weighted training set and giving it a vote of alpha_t = 0.5 ln((1 -
# e_t) / e_t), where e_t is its weighted error. The heuristic is the
# reweighting between rounds: multiply each example's weight by
# exp(-alpha_t y_i h_t(x_i)), so the points the last stump got wrong
# grow and the ones it got right shrink, then renormalize. The next
# stump is fitted to the mistakes of the last.
#
# Referees:
# (1) THE EXACT IDENTITIES: after reweighting, the stump just fitted has
#     weighted error exactly 1/2 on the new distribution (it has been
#     made useless, so the next round must find something new), and the
#     normalizer Z_t equals 2 sqrt(e_t (1 - e_t)) to machine precision;
# (2) THE FREUND-SCHAPIRE BOUND: the training error of the weighted
#     vote after t rounds is at most the product of Z_1 ... Z_t, checked
#     at every round;
# (3) GENERALIZATION, measured on 1,000 held-out points: the boosted
#     vote against a single stump, against the same rounds with the
#     reweighting removed (uniform weights: the ablation, which refits
#     the same stump every round), and against bagged stumps (bootstrap
#     resampling plus a majority vote: the classic rival that averages
#     variance but cannot reduce a stump's bias);
# (4) THE HONEST WEAKNESS: with 10% of the training labels flipped, the
#     share of the total weight resting on the flipped points by the
#     last round is measured, along with the held-out accuracy it costs.
import math
import random

SEED = 20260926
R2 = 2 / math.pi          # a disk of this radius squared covers half the square
ROUNDS = 200
N_TRAIN = 400
N_TEST = 1000


def make_data(n, rng, noise=0.0):
    X = [(rng.uniform(-1, 1), rng.uniform(-1, 1)) for _ in range(n)]
    y = [1 if a * a + b * b < R2 else -1 for a, b in X]
    flipped = set()
    if noise > 0:
        flipped = set(rng.sample(range(n), int(noise * n)))
        for i in flipped:
            y[i] = -y[i]
    return X, y, flipped


def sort_orders(X):
    return [sorted(range(len(X)), key=lambda i: X[i][f]) for f in range(2)]


def best_stump(X, y, w, orders):
    """The stump (weighted error, feature, threshold, polarity) with the
    least weighted error. Prefix sums along each feature's sorted order
    make every threshold O(1), so a round costs O(n) per feature."""
    n = len(X)
    W = sum(w)
    tot_pos = sum(w[i] for i in range(n) if y[i] > 0)
    best = (float('inf'), 0, 0.0, 1)
    for f in range(2):
        order = orders[f]
        pos = neg = 0.0
        for k in range(n + 1):
            if k > 0:
                i = order[k - 1]
                if y[i] > 0:
                    pos += w[i]
                else:
                    neg += w[i]
            if 0 < k < n and X[order[k - 1]][f] == X[order[k]][f]:
                continue
            if k == 0:
                thr = X[order[0]][f] - 1.0
            elif k == n:
                thr = X[order[-1]][f] + 1.0
            else:
                thr = 0.5 * (X[order[k - 1]][f] + X[order[k]][f])
            err_plus = neg + (tot_pos - pos)      # x[f] <= thr votes +1
            err_minus = W - err_plus              # x[f] <= thr votes -1
            if err_plus < best[0]:
                best = (err_plus, f, thr, 1)
            if err_minus < best[0]:
                best = (err_minus, f, thr, -1)
    return best


def stump_predict(stump, x):
    _, f, thr, pol = stump
    return pol if x[f] <= thr else -pol


def adaboost(X, y, rounds, orders, reweight=True, log=None):
    """Returns the ensemble [(alpha, stump)], the normalizers, and the
    final weights. reweight=False is the ablation: uniform weights every
    round, so every round refits the same stump."""
    n = len(X)
    w = [1.0 / n] * n
    H = []
    Zs = []
    for t in range(rounds):
        stump = best_stump(X, y, w, orders)
        err = stump[0]
        if err <= 0 or err >= 0.5:
            break
        alpha = 0.5 * math.log((1 - err) / err)
        H.append((alpha, stump))
        preds = [stump_predict(stump, x) for x in X]
        if reweight:
            w = [w[i] * math.exp(-alpha * y[i] * preds[i]) for i in range(n)]
            Z = sum(w)
            w = [v / Z for v in w]
            Zs.append(Z)
        if log is not None:
            log(t, err, alpha, Zs[-1] if reweight else None, w, preds, H)
    return H, Zs, w


def vote(H, x):
    s = sum(alpha * stump_predict(st, x) for alpha, st in H)
    return 1 if s >= 0 else -1


def accuracy(H, X, y):
    return sum(vote(H, x) == yy for x, yy in zip(X, y)) / len(X)


def bagged_stumps(X, y, rounds, orders, rng):
    """Bootstrap resampling as multiplicity weights on the original order,
    one stump per resample, majority vote."""
    n = len(X)
    stumps = []
    for _ in range(rounds):
        counts = [0.0] * n
        for _ in range(n):
            counts[rng.randrange(n)] += 1.0 / n
        stumps.append(best_stump(X, y, counts, orders))

    def predict(x):
        s = sum(stump_predict(st, x) for st in stumps)
        return 1 if s >= 0 else -1
    return predict


if __name__ == '__main__':
    rng = random.Random(SEED)
    Xtr, ytr, _ = make_data(N_TRAIN, rng)
    Xte, yte, _ = make_data(N_TEST, rng)
    orders = sort_orders(Xtr)

    # Oracles 1 and 2 are checked inside the round log with running scores.
    stats = {'worst_half': 0.0, 'worst_Z': 0.0, 'prodZ': 1.0, 'F': [0.0] * N_TRAIN, 'curve': {}, 'zero_round': None}

    def log(t, err, alpha, Z, w, preds, H):
        e_new = sum(w[i] for i in range(N_TRAIN) if preds[i] != ytr[i])
        stats['worst_half'] = max(stats['worst_half'], abs(e_new - 0.5))
        stats['worst_Z'] = max(stats['worst_Z'], abs(Z - 2 * math.sqrt(err * (1 - err))))
        stats['prodZ'] *= Z
        F = stats['F']
        for i in range(N_TRAIN):
            F[i] += alpha * preds[i]
        train_err = sum((1 if F[i] >= 0 else -1) != ytr[i] for i in range(N_TRAIN)) / N_TRAIN
        assert train_err <= stats['prodZ'] + 1e-12, (t, train_err, stats['prodZ'])
        if train_err == 0 and stats['zero_round'] is None:
            stats['zero_round'] = t + 1
        if t + 1 in (1, 10, 50, 100, 200):
            stats['curve'][t + 1] = (train_err, stats['prodZ'], accuracy(H, Xte, yte))

    H, Zs, w_final = adaboost(Xtr, ytr, ROUNDS, orders, log=log)
    assert len(H) == ROUNDS, len(H)
    assert stats['worst_half'] < 1e-9, stats['worst_half']
    assert stats['worst_Z'] < 1e-9, stats['worst_Z']
    ada_acc = accuracy(H, Xte, yte)
    stump_acc = accuracy(H[:1], Xte, yte)

    # Oracle 3: the ablation and the rival.
    H_uniform, _, _ = adaboost(Xtr, ytr, ROUNDS, orders, reweight=False)
    uniform_acc = accuracy(H_uniform, Xte, yte)
    assert all(st[1:] == H_uniform[0][1][1:] for _, st in H_uniform), 'uniform weights must refit the same stump'
    assert uniform_acc == stump_acc, (uniform_acc, stump_acc)
    bag = bagged_stumps(Xtr, ytr, ROUNDS, orders, random.Random(SEED + 1))
    bag_acc = sum(bag(x) == yy for x, yy in zip(Xte, yte)) / N_TEST
    assert stump_acc < 0.8 and bag_acc < 0.8, (stump_acc, bag_acc)
    assert ada_acc > 0.9 and ada_acc > bag_acc + 0.1, (ada_acc, bag_acc)

    # Oracle 4: label noise and where the weight goes.
    rng_n = random.Random(SEED + 2)
    Xn, yn, flipped = make_data(N_TRAIN, rng_n, noise=0.10)
    orders_n = sort_orders(Xn)
    H_noisy, _, w_noisy = adaboost(Xn, yn, ROUNDS, orders_n)
    flipped_weight = sum(w_noisy[i] for i in flipped)
    noisy_acc = accuracy(H_noisy, Xte, yte)
    noisy_acc_20 = accuracy(H_noisy[:20], Xte, yte)
    assert flipped_weight > 0.3, flipped_weight
    assert noisy_acc < ada_acc, (noisy_acc, ada_acc)

    print(f'contest: a disk-versus-ring boundary in the unit square, {N_TRAIN} training points, {N_TEST} held out, decision stumps as the weak learner, {ROUNDS} rounds')
    print(f"  {'method':<40} {'held-out accuracy':>18}   verdict")
    rows = [
        ('AdaBoost, exponential reweighting', ada_acc, "the vote of stumps fitted to each other's mistakes"),
        ('single stump', stump_acc, 'one axis-aligned threshold against a disk'),
        ('200 rounds, uniform weights (ablation)', uniform_acc, 'no reweighting: the same stump refitted 200 times'),
        ('200 bagged stumps (bootstrap + majority)', bag_acc, "averages variance; a stump's bias stays"),
        ('AdaBoost on 10% flipped labels', noisy_acc, f'{flipped_weight:.0%} of the weight sits on the 40 flipped points by round {ROUNDS}'),
    ]
    for name, acc, verdict in rows:
        print(f'  {name:<40} {acc:>18.3f}   {verdict}')
    print('  round   train error   bound prod Z   held-out accuracy')
    for r in (1, 10, 50, 100, 200):
        te, pz, acc = stats['curve'][r]
        print(f'  {r:>5}   {te:>11.3f}   {pz:>12.4f}   {acc:>17.3f}')
    print(f'identities: worst |weighted error on new weights - 1/2| = {stats["worst_half"]:.1e}; worst |Z - 2 sqrt(e(1-e))| = {stats["worst_Z"]:.1e}; '
          f'training error first zero at round {stats["zero_round"]}; noisy run at round 20: {noisy_acc_20:.3f}')
    print(f'OK: AdaBoost {ada_acc:.3f} held out vs stump {stump_acc:.3f}, uniform-weight ablation {uniform_acc:.3f}, bagged stumps {bag_acc:.3f}; '
          f'the training error sat under the product-of-Z bound at all {ROUNDS} rounds; the refitted stump has weighted error 1/2 on the new weights to {stats["worst_half"]:.0e}; '
          f'with 10% flipped labels {flipped_weight:.0%} of the weight rests on the flipped points and held-out accuracy falls to {noisy_acc:.3f}')
