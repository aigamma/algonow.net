# Puzzle 126: Backpropagation x stochastic gradient descent
# Neural network training: fit a small multilayer network to labeled
# points by minimizing a loss over its weights. Backpropagation is the
# algorithm: one forward pass computes every activation, one backward
# pass applies the chain rule layer by layer, and the gradient of the
# loss with respect to every weight comes out for about twice the
# cost of a forward pass. The heuristic is how the gradient is used:
# stochastic gradient descent updates the weights after a small random
# minibatch instead of after the whole data set, trading a noisy
# gradient for many more updates per pass, which is what lets networks
# train on data that does not fit in memory and escape the flat
# regions that stall full-batch descent.
#
# Referees:
# (1) THE GRADIENT CHECK: for random weights and inputs, every
#     backpropagated partial derivative is compared with a central
#     finite difference of the loss, and the relative error must be
#     below one part in a hundred thousand on every parameter (the
#     measured worst case is a few parts in a million, at the floor
#     of double precision for a step of ten to the minus five);
# (2) THE TASK: two rings of points that no straight line separates;
#     the trained two-layer network must reach at least 98 percent
#     accuracy on a held-out set, while a linear model (no hidden
#     layer, same trainer) must fail below 70 percent, proving the
#     hidden layer is doing the work;
# (3) THE HEURISTIC: full-batch gradient descent and minibatch SGD are
#     run with the same gradient code and priced in gradient
#     evaluations (backward passes) to reach the same training loss;
# (4) THE COST LAW: multiply-adds are counted; a backward pass costs
#     about twice a forward pass, and a finite-difference gradient
#     costs two forward passes PER PARAMETER;
# (5) THE FAILURE: a learning rate too large diverges, and the run
#     reports the loss climbing rather than hiding it.
import math
import random

SEED = 20260926
FLOPS = [0]


def rings(n, rng):
    """Inner disk labeled 0, outer ring labeled 1."""
    X, Y = [], []
    for _ in range(n):
        label = rng.random() < 0.5
        r = (rng.uniform(0.0, 0.9) if not label else rng.uniform(1.4, 2.2))
        t = rng.uniform(0, 2 * math.pi)
        X.append([r * math.cos(t) + rng.gauss(0, 0.08), r * math.sin(t) + rng.gauss(0, 0.08)])
        Y.append(1.0 if label else 0.0)
    return X, Y


def tanh(x):
    return math.tanh(x)


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x)) if x > -30 else 0.0


class MLP:
    """Layers: sizes[0] inputs ... sizes[-1] = 1 output (sigmoid), tanh
    hidden units, binary cross-entropy loss."""

    def __init__(self, sizes, rng):
        self.sizes = sizes
        self.W = []
        self.b = []
        for a, b_ in zip(sizes, sizes[1:]):
            scale = 1.0 / math.sqrt(a)
            self.W.append([[rng.gauss(0, scale) for _ in range(a)] for _ in range(b_)])
            self.b.append([0.0] * b_)

    def params(self):
        for l in range(len(self.W)):
            for i in range(len(self.W[l])):
                for j in range(len(self.W[l][i])):
                    yield ('W', l, i, j)
                yield ('b', l, i, None)

    def get(self, key):
        kind, l, i, j = key
        return self.W[l][i][j] if kind == 'W' else self.b[l][i]

    def set(self, key, value):
        kind, l, i, j = key
        if kind == 'W':
            self.W[l][i][j] = value
        else:
            self.b[l][i] = value

    def forward(self, x):
        """Returns activations per layer (a[0] = x) and pre-activations."""
        acts = [x]
        pres = []
        a = x
        for l, (W, b) in enumerate(zip(self.W, self.b)):
            z = []
            for i in range(len(W)):
                s = b[i]
                row = W[i]
                for j in range(len(row)):
                    s += row[j] * a[j]
                FLOPS[0] += len(row)
                z.append(s)
            last = l == len(self.W) - 1
            a = [sigmoid(v) if last else tanh(v) for v in z]
            pres.append(z)
            acts.append(a)
        return acts, pres

    def loss(self, x, y):
        p = self.forward(x)[0][-1][0]
        eps = 1e-12
        return -(y * math.log(p + eps) + (1 - y) * math.log(1 - p + eps))

    def backward(self, x, y):
        """Gradient of the cross-entropy loss for one example: lists
        shaped like W and b."""
        acts, pres = self.forward(x)
        gW = [[[0.0] * len(r) for r in W] for W in self.W]
        gb = [[0.0] * len(b) for b in self.b]
        # output layer: dL/dz = p - y for sigmoid + cross-entropy
        delta = [acts[-1][0] - y]
        for l in range(len(self.W) - 1, -1, -1):
            a_prev = acts[l]
            for i in range(len(self.W[l])):
                for j in range(len(a_prev)):
                    gW[l][i][j] = delta[i] * a_prev[j]
                gb[l][i] = delta[i]
            FLOPS[0] += len(self.W[l]) * len(a_prev)
            if l > 0:
                new_delta = []
                for j in range(len(a_prev)):
                    s = 0.0
                    for i in range(len(self.W[l])):
                        s += self.W[l][i][j] * delta[i]
                    new_delta.append(s * (1 - a_prev[j] ** 2))     # tanh'
                FLOPS[0] += len(self.W[l]) * len(a_prev)
                delta = new_delta
        return gW, gb

    def step(self, grads, lr, count):
        gW, gb = grads
        for l in range(len(self.W)):
            for i in range(len(self.W[l])):
                for j in range(len(self.W[l][i])):
                    self.W[l][i][j] -= lr * gW[l][i][j] / count
                self.b[l][i] -= lr * gb[l][i] / count


def accumulate(net, batch):
    gW = [[[0.0] * len(r) for r in W] for W in net.W]
    gb = [[0.0] * len(b) for b in net.b]
    for x, y in batch:
        dW, db = net.backward(x, y)
        for l in range(len(gW)):
            for i in range(len(gW[l])):
                for j in range(len(gW[l][i])):
                    gW[l][i][j] += dW[l][i][j]
                gb[l][i] += db[l][i]
    return gW, gb


def mean_loss(net, data):
    return sum(net.loss(x, y) for x, y in data) / len(data)


def accuracy(net, data):
    return sum((net.forward(x)[0][-1][0] > 0.5) == (y > 0.5) for x, y in data) / len(data)


def gradient_check(net, x, y, h=1e-5):
    gW, gb = net.backward(x, y)
    worst = 0.0
    n = 0
    for key in net.params():
        kind, l, i, j = key
        analytic = gW[l][i][j] if kind == 'W' else gb[l][i]
        v = net.get(key)
        net.set(key, v + h)
        lp = net.loss(x, y)
        net.set(key, v - h)
        lm = net.loss(x, y)
        net.set(key, v)
        numeric = (lp - lm) / (2 * h)
        rel = abs(analytic - numeric) / max(1e-8, abs(analytic) + abs(numeric))
        worst = max(worst, rel)
        n += 1
    return worst, n


def train(net, data, lr, batch_size, target_loss, max_epochs, rng):
    """Returns (gradient evaluations, epochs, final loss, diverged)."""
    evals = 0
    order = list(range(len(data)))
    for epoch in range(1, max_epochs + 1):
        rng.shuffle(order)
        for start in range(0, len(order), batch_size):
            batch = [data[k] for k in order[start:start + batch_size]]
            grads = accumulate(net, batch)
            evals += len(batch)
            net.step(grads, lr, len(batch))
        L = mean_loss(net, data)
        if not math.isfinite(L) or L > 5.0:
            return evals, epoch, L, True
        if L < target_loss:
            return evals, epoch, L, False
    return evals, max_epochs, mean_loss(net, data), False


if __name__ == '__main__':
    rng = random.Random(SEED)
    X, Y = rings(400, rng)
    train_set = list(zip(X[:300], Y[:300]))
    test_set = list(zip(X[300:], Y[300:]))

    # Oracle 1: the gradient check, several random networks and points.
    worst = 0.0
    n_params = 0
    for trial in range(6):
        net = MLP([2, 6, 5, 1], random.Random(SEED + trial))
        x = [rng.gauss(0, 1), rng.gauss(0, 1)]
        y = float(trial % 2)
        w, n_params = gradient_check(net, x, y)
        worst = max(worst, w)
    assert worst < 1e-5, worst

    # Oracle 4: the cost law, counted on one example.
    net = MLP([2, 16, 16, 1], random.Random(SEED))
    x, y = train_set[0]
    FLOPS[0] = 0
    net.forward(x)
    fwd = FLOPS[0]
    FLOPS[0] = 0
    net.backward(x, y)
    bwd = FLOPS[0]
    P = sum(1 for _ in net.params())
    fd_cost = 2 * P * fwd
    assert 1.5 * fwd <= bwd <= 3.5 * fwd, (fwd, bwd)
    assert fd_cost > 100 * bwd

    # Oracle 3: full batch vs minibatch, same target loss.
    TARGET = 0.08
    results = {}
    for label, batch in (('full batch', 300), ('minibatch 16', 16), ('minibatch 4', 4)):
        net = MLP([2, 16, 16, 1], random.Random(SEED))
        evals, epochs, L, diverged = train(net, train_set, lr=0.1, batch_size=batch, target_loss=TARGET, max_epochs=400, rng=random.Random(SEED + 7))
        assert not diverged, label
        results[label] = (evals, epochs, L, accuracy(net, test_set))
    assert results['minibatch 16'][0] < results['full batch'][0] / 3, results
    assert results['minibatch 16'][3] >= 0.98, results                      # Oracle 2

    # Oracle 2b: the linear model with the same trainer fails.
    linear = MLP([2, 1], random.Random(SEED))
    train(linear, train_set, lr=0.1, batch_size=16, target_loss=TARGET, max_epochs=200, rng=random.Random(SEED + 7))
    lin_acc = accuracy(linear, test_set)
    assert lin_acc < 0.7, lin_acc

    # Oracle 5: too large a learning rate diverges, reported honestly.
    hot = MLP([2, 16, 16, 1], random.Random(SEED))
    evals_hot, epochs_hot, L_hot, diverged = train(hot, train_set, lr=8.0, batch_size=16, target_loss=TARGET, max_epochs=40, rng=random.Random(SEED + 7))
    assert diverged or L_hot > TARGET, (L_hot, diverged)

    print(f'contest: two rings (300 training points, 100 held out), a 2-16-16-1 tanh network ({P} parameters), cross-entropy loss, target training loss {TARGET}; currency: gradient evaluations (backward passes) to reach the target, and multiply-adds per pass')
    print(f"  {'trainer':<16} {'grad evals':>11} {'epochs':>7} {'final loss':>11} {'test acc':>9}")
    for label in ('full batch', 'minibatch 16', 'minibatch 4'):
        evals, epochs, L, acc = results[label]
        print(f"  {label:<16} {evals:>11,} {epochs:>7} {L:>11.4f} {acc:>9.3f}   {'one update per pass: many passes' if label == 'full batch' else 'noisy gradients, many updates per pass'}")
    print(f"  {'linear (no hidden)':<16} {'-':>11} {'200':>7} {'-':>11} {lin_acc:>9.3f}   no straight line separates rings: the hidden layer is the model")
    print(f"  {'lr = 8.0':<16} {'-':>11} {epochs_hot:>7} {'diverged' if diverged else f'{L_hot:.2f}':>11} {'-':>9}   too hot: the loss climbs, reported not hidden")
    print(f'the cost law: forward {fwd:,} multiply-adds, backward {bwd:,} ({bwd / fwd:.1f}x), finite differences {fd_cost:,} for the same gradient ({fd_cost / bwd:,.0f}x): two forward passes per parameter')
    print(f'gradient check: worst relative error {worst:.2e} over {n_params} parameters x 6 random networks (central differences, h = 1e-5)')
    print(f'OK: every backpropagated partial within {worst:.1e} of central finite differences; backward {bwd / fwd:.1f}x forward and finite differences {fd_cost / bwd:.0f}x backward; '
          f'minibatch 16 reached loss {TARGET} in {results["minibatch 16"][0]:,} gradient evaluations vs full batch {results["full batch"][0]:,} with test accuracy {results["minibatch 16"][3]:.3f}; '
          f'the linear model stalls at {lin_acc:.3f}; lr 8.0 {"diverged" if diverged else "failed to converge"}')
