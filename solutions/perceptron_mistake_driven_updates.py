# Puzzle 130: Perceptron x mistake-driven updates
# Linear classification: find a weight vector w and bias b such that
# sign(w . x + b) reproduces the labels of a training set. The
# perceptron is the algorithm: sweep the examples, and on every
# mistake add y x to w and y to b, then sweep again until a full pass
# makes no mistake. The heuristic is that it updates ONLY on mistakes:
# examples already on the right side leave the weights alone, so the
# final separator is a sum of the misclassified examples, with a bound
# on how many mistakes can ever happen.
#
# Referees:
# (1) THE NOVIKOFF BOUND (1962): if some unit vector u separates the
#     data with margin gamma (y (u . x) >= gamma for every x, with the
#     bias folded into x) and every |x| <= R, the perceptron makes at
#     most (R / gamma)^2 mistakes, ever, in any order. The bound is
#     computed from the maximum-margin separator found by an
#     independent brute-force search over candidate directions and
#     the mistake count must stay under it for every one of 20
#     shuffles;
# (2) SEPARATION, exactly: the returned separator classifies every
#     training example correctly (zero mistakes on a final pass);
# (3) THE MARGIN LAW, measured: shrinking the margin (moving the two
#     classes closer) raises the mistake count, and the bound with it;
# (4) THE ABLATION: updating on every example, mistake or not, at the
#     same step size does not converge on the same data within the
#     same budget of passes (the separator is dragged by examples it
#     already gets right);
# (5) THE FAILURE, measured two ways. On data that no line separates
#     (XOR by quadrant), the perceptron cycles forever: the run caps
#     the passes and reports the mistakes that never stop, with the
#     last separator near half wrong because no line can do better
#     (the averaged perceptron is no better there, and the page says
#     so). On nearly separable data (the margin-0.2 set with ten labels
#     flipped) it also never converges, and the separator it holds
#     when stopped depends on the last few mistakes; the averaged
#     perceptron (Freund and Schapire 1999) reads the same stream and
#     returns the average of every intermediate separator, which is
#     scored against the true labels alongside the last one.
import math
import random

SEED = 20260926


def make_data(n, rng, margin, dim=2):
    """Two classes on either side of a random direction, at least
    `margin` apart (each point pushed away from the boundary by at least
    margin / 2), inside the unit disk (|x| <= 1 with the bias folded in
    as a third coordinate of 1, so R = sqrt 2)."""
    t = rng.uniform(0, 2 * math.pi)
    u = (math.cos(t), math.sin(t))
    X = []
    y = []
    while len(X) < n:
        p = (rng.uniform(-1, 1), rng.uniform(-1, 1))
        if p[0] ** 2 + p[1] ** 2 > 1:
            continue
        s = p[0] * u[0] + p[1] * u[1]
        if abs(s) < margin / 2:
            continue
        X.append(p)
        y.append(1 if s > 0 else -1)
    return X, y


def perceptron(X, y, order, max_passes=1000, always_update=False):
    """Returns (w, b, mistakes, passes, converged). `order` is the
    visiting order used on every pass."""
    w = [0.0, 0.0]
    b = 0.0
    mistakes = 0
    for p in range(1, max_passes + 1):
        wrong = 0
        for i in order:
            x = X[i]
            pred = 1 if w[0] * x[0] + w[1] * x[1] + b > 0 else -1
            if pred != y[i]:
                wrong += 1
                mistakes += 1
                w[0] += y[i] * x[0]
                w[1] += y[i] * x[1]
                b += y[i]
            elif always_update:
                w[0] += y[i] * x[0]
                w[1] += y[i] * x[1]
                b += y[i]
        if wrong == 0:
            return w, b, mistakes, p, True
    return w, b, mistakes, max_passes, False


def averaged_perceptron(X, y, order, passes):
    """Freund and Schapire's averaged perceptron: the prediction uses the
    average of every intermediate weight vector, one per example seen."""
    w = [0.0, 0.0]
    b = 0.0
    sw = [0.0, 0.0]
    sb = 0.0
    count = 0
    for _ in range(passes):
        for i in order:
            x = X[i]
            pred = 1 if w[0] * x[0] + w[1] * x[1] + b > 0 else -1
            if pred != y[i]:
                w[0] += y[i] * x[0]
                w[1] += y[i] * x[1]
                b += y[i]
            sw[0] += w[0]
            sw[1] += w[1]
            sb += b
            count += 1
    return [sw[0] / count, sw[1] / count], sb / count


def errors(w, b, X, y):
    return sum((1 if w[0] * x[0] + w[1] * x[1] + b > 0 else -1) != yy for x, yy in zip(X, y))


def max_margin(X, y, steps=3600):
    """Independent referee: the best separating direction over a fine
    sweep of unit vectors u = (cos t, sin t, c) in the lifted space (the
    bias folded in), normalized; gamma is the smallest y (u . x'). Exact
    enough for the bound: a slightly smaller gamma only loosens it."""
    best = 0.0
    for k in range(steps):
        t = 2 * math.pi * k / steps
        for c in (-0.8, -0.6, -0.4, -0.3, -0.2, -0.1, -0.05, 0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8):
            norm = math.sqrt(1 + c * c)
            u = (math.cos(t) / norm, math.sin(t) / norm, c / norm)
            g = min(yy * (u[0] * x[0] + u[1] * x[1] + u[2]) for x, yy in zip(X, y))
            if g > best:
                best = g
    return best


if __name__ == '__main__':
    rng = random.Random(SEED)
    n = 200
    R = math.sqrt(2.0)                     # |x| <= 1 plus the folded bias coordinate 1

    results = {}
    for margin in (0.4, 0.2, 0.1):
        X, y = make_data(n, rng, margin)
        gamma = max_margin(X, y)
        bound = (R / gamma) ** 2
        worst = 0
        worst_passes = 0
        for trial in range(20):
            order = list(range(n))
            random.Random(SEED + trial).shuffle(order)
            w, b, mistakes, passes, converged = perceptron(X, y, order)
            assert converged and errors(w, b, X, y) == 0, (margin, trial)
            assert mistakes <= bound, (margin, trial, mistakes, bound)
            worst = max(worst, mistakes)
            worst_passes = max(worst_passes, passes)
        results[margin] = (gamma, bound, worst, worst_passes, X, y)

    # Oracle 3: the margin law.
    assert results[0.4][2] <= results[0.2][2] <= results[0.1][2], [results[m][2] for m in (0.4, 0.2, 0.1)]
    assert results[0.4][1] < results[0.2][1] < results[0.1][1]

    # Oracle 4: the ablation, on the widest-margin data.
    X, y = results[0.4][4], results[0.4][5]
    order = list(range(n))
    random.Random(SEED).shuffle(order)
    _, _, m_mistake, p_mistake, conv_mistake = perceptron(X, y, order, max_passes=200)
    w_a, b_a, m_always, p_always, conv_always = perceptron(X, y, order, max_passes=200, always_update=True)
    always_errors = errors(w_a, b_a, X, y)
    assert conv_mistake and not conv_always, (conv_mistake, conv_always)

    # Oracle 5: the inseparable case.
    Xx = []
    yx = []
    rng_x = random.Random(SEED + 99)
    for _ in range(200):
        p = (rng_x.uniform(-1, 1), rng_x.uniform(-1, 1))
        Xx.append(p)
        yx.append(1 if p[0] * p[1] > 0 else -1)          # XOR by quadrant
    order_x = list(range(200))
    random.Random(SEED).shuffle(order_x)
    w_x, b_x, m_x, p_x, conv_x = perceptron(Xx, yx, order_x, max_passes=200)
    last_errors = errors(w_x, b_x, Xx, yx)
    w_avg, b_avg = averaged_perceptron(Xx, yx, order_x, 200)
    avg_errors = errors(w_avg, b_avg, Xx, yx)
    assert not conv_x and m_x > 1000, (conv_x, m_x)
    assert last_errors > 0.4 * 200 and avg_errors > 0.4 * 200, (last_errors, avg_errors)

    # Oracle 5b: nearly separable data (ten flipped labels) and the averaged separator.
    Xn, yn_true = results[0.2][4], list(results[0.2][5])
    yn = list(yn_true)
    for i in random.Random(SEED + 7).sample(range(n), 10):
        yn[i] = -yn[i]
    order_n = list(range(n))
    random.Random(SEED).shuffle(order_n)
    w_n, b_n, m_n, p_n, conv_n = perceptron(Xn, yn, order_n, max_passes=200)
    last_true_errors = errors(w_n, b_n, Xn, yn_true)
    w_na, b_na = averaged_perceptron(Xn, yn, order_n, 200)
    avg_true_errors = errors(w_na, b_na, Xn, yn_true)
    assert not conv_n, 'ten flipped labels should stop convergence'
    assert avg_true_errors < last_true_errors, (avg_true_errors, last_true_errors)

    print(f'contest: {n} points in the unit disk, two classes at three margins; referee: the Novikoff bound (R / gamma)^2 with gamma from an independent max-margin sweep, R = sqrt 2; 20 shuffles each')
    print(f"  {'margin':>6} {'gamma':>7} {'bound':>8} {'worst mistakes':>15} {'worst passes':>13}   verdict")
    for margin in (0.4, 0.2, 0.1):
        gamma, bound, worst, passes, _, _ = results[margin]
        print(f'  {margin:>6} {gamma:>7.3f} {bound:>8.1f} {worst:>15} {passes:>13}   converged in all 20 shuffles, every count under the bound')
    print(f'ablation on margin 0.4: mistake-driven {m_mistake} mistakes, converged in {p_mistake} passes; update-on-every-example: {always_errors} errors after {p_always} passes, never converged')
    print(f'inseparable (XOR by quadrant, 200 points): {m_x:,} mistakes in {p_x} passes and still {last_errors} errors on the last separator; averaged perceptron on the same stream: {avg_errors} (no line does better)')
    print(f'nearly separable (margin 0.2, 10 labels flipped): {m_n:,} mistakes in {p_n} passes, never converged; last separator {last_true_errors} errors against the true labels, averaged perceptron {avg_true_errors}')
    print(f'OK: perceptron separated every training set with mistake counts under the Novikoff bound in 60 of 60 runs (worst {results[0.4][2]} / {results[0.2][2]} / {results[0.1][2]} at margins 0.4 / 0.2 / 0.1 against bounds '
          f'{results[0.4][1]:.0f} / {results[0.2][1]:.0f} / {results[0.1][1]:.0f}); updating on every example never converged; XOR cycled with {last_errors} errors on the last separator; ten flipped labels: last separator {last_true_errors} true errors vs averaged {avg_true_errors}')
