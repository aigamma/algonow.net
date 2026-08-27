# Puzzle 45: Newton's method x tangent-line iteration
# Find a root of a differentiable function to machine precision (and
# beyond) in a handful of iterations: with the quadratic promise
# measured as digits doubling, and the dark side measured as gadgets.
#
# The pairing is the point. The algorithm is iterate-and-refine: keep
# replacing the guess with a better one until the residual dies. The
# heuristic is the tangent line: pretend the function IS its tangent at
# the current guess, and jump to where the tangent crosses zero:
# x <- x - f(x)/f'(x). Near a simple root the pretense is nearly true,
# and the error SQUARES each step: this file runs sqrt(2) in 60-digit
# decimal and watches correct digits go 1, 2, 5, 11, 23, 47. The same
# jump, started outside the basin, cycles forever or runs away at an
# exact factor of -2 per step: both measured, both on the page.
import math
from decimal import Decimal, getcontext


def newton(f, df, x0, tol=1e-12, max_iter=200, counter=None, trace=None):
    x = x0
    for it in range(max_iter):
        fx = f(x)
        if counter is not None:
            counter["evals"] = counter.get("evals", 0) + 1
        if trace is not None:
            trace.append(x)
        if abs(fx) < tol:
            return x, it
        d = df(x)
        if counter is not None:
            counter["evals"] += 1
        if d == 0:
            return None, it
        x = x - fx / d
    return None, max_iter


def bisection(f, lo, hi, tol=1e-12, counter=None):
    flo = f(lo)
    if counter is not None:
        counter["evals"] = counter.get("evals", 0) + 1
    its = 0
    while hi - lo > tol:
        mid = (lo + hi) / 2
        fm = f(mid)
        if counter is not None:
            counter["evals"] += 1
        its += 1
        if (flo < 0) == (fm < 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return (lo + hi) / 2, its


def secant(f, x0, x1, tol=1e-12, max_iter=200, counter=None):
    f0 = f(x0)
    f1 = f(x1)
    if counter is not None:
        counter["evals"] = counter.get("evals", 0) + 2
    its = 0
    while abs(f1) > tol and its < max_iter:
        if f1 == f0:
            return None, its
        x0, x1 = x1, x1 - f1 * (x1 - x0) / (f1 - f0)
        f0, f1 = f1, f(x1)
        if counter is not None:
            counter["evals"] += 1
        its += 1
    return x1, its


if __name__ == "__main__":
    # Oracle 1: the quadratic law as a digit ladder, beyond floats.
    # sqrt(2) in 60-digit decimal from x0 = 1: correct digits must at
    # least double-minus-one every step until precision is exhausted.
    getcontext().prec = 60
    two = Decimal(2)
    true_sqrt2 = two.sqrt()
    x = Decimal(1)
    digit_ladder = []
    for _ in range(7):
        x = (x + two / x) / 2  # Newton on x^2 - 2, simplified form
        err = abs(x - true_sqrt2)
        digits = 60 if err == 0 else max(0, int(-err.log10()))
        digit_ladder.append(min(digits, 58))
    for a, b in zip(digit_ladder, digit_ladder[1:]):
        if a < 25:  # until precision saturates
            assert b >= 2 * a - 1, digit_ladder

    # Oracle 2: the eval-for-eval contest to 1e-12 on x^2 - 2.
    f = lambda t: t * t - 2
    df = lambda t: 2 * t
    c_b, c_s, c_n = {}, {}, {}
    root_b, it_b = bisection(f, 1.0, 2.0, 1e-12, c_b)
    root_s, it_s = secant(f, 1.0, 2.0, 1e-12, counter=c_s)
    root_n, it_n = newton(f, df, 1.0, 1e-12, counter=c_n)
    for r in (root_b, root_s, root_n):
        assert abs(r - math.sqrt(2)) < 1e-9
    assert it_b >= 35            # halving pays a digit per ~3.3 steps
    assert it_n <= 6             # squaring pays double digits per step
    assert it_s <= 9
    # The honest footnote: per FUNCTION EVALUATION the secant's order
    # 1.618 beats Newton's sqrt(2)-per-eval, and the counters show it.
    assert c_s["evals"] <= c_n["evals"]

    # Oracle 3: the 2-cycle gadget, exact. f = x^3 - 2x + 2 from 0:
    # 0 -> 1 -> 0 -> 1 forever. Measured as literal state repetition.
    g = lambda t: t**3 - 2 * t + 2
    dg = lambda t: 3 * t * t - 2
    tr = []
    newton(g, dg, 0.0, 1e-12, max_iter=12, trace=tr)
    assert tr[:6] == [0.0, 1.0, 0.0, 1.0, 0.0, 1.0], tr[:6]

    # Oracle 4: the runaway gadget, exact. f = cbrt(x): the tangent
    # step is x - 3x = -2x: each iteration exactly doubles the distance
    # and flips the side. Measured to the factor.
    h = lambda t: math.copysign(abs(t) ** (1 / 3), t)
    dh = lambda t: (1 / 3) * abs(t) ** (-2 / 3) if t != 0 else float("inf")
    tr2 = []
    newton(h, dh, 1.0, 1e-15, max_iter=8, trace=tr2)
    for a, b in zip(tr2, tr2[1:]):
        assert abs(b + 2 * a) < 1e-9 * max(1.0, abs(a)), (a, b)

    # Oracle 5: Kepler's equation, the historic client. Solve
    # E - e*sin(E) = M for a comet-grade eccentricity e = 0.9.
    e = 0.9
    M = 1.0
    kf = lambda E: E - e * math.sin(E) - M
    kdf = lambda E: 1 - e * math.cos(E)
    E_root, it_k = newton(kf, kdf, M, 1e-14)
    assert abs(kf(E_root)) < 1e-13
    assert it_k <= 8

    # Oracle 6: a cash-flow IRR, the everyday client. NPV root of
    # [-1000, 300, 420, 680, 200] with a bisection cross-check.
    flows = [-1000.0, 300.0, 420.0, 680.0, 200.0]
    npv = lambda r: sum(c / (1 + r) ** k for k, c in enumerate(flows))
    dnpv = lambda r: sum(-k * c / (1 + r) ** (k + 1) for k, c in enumerate(flows))
    irr_n, it_irr = newton(npv, dnpv, 0.1, 1e-12)
    irr_b, _ = bisection(npv, 0.0, 1.0, 1e-12)
    assert abs(irr_n - irr_b) < 1e-9  # two roads, one rate
    assert abs(npv(irr_n)) < 1e-10
    assert it_irr <= 8

    print("contest: x^2 - 2 = 0 to 1e-12; iterations and function evaluations counted")
    print(f"  {'method':<22} {'iterations':>10} {'f-evals':>8}")
    print(f"  {'Bisection [1,2]':<22} {it_b:>10} {c_b['evals']:>8}   one digit per ~3.3 halvings, guaranteed")
    print(f"  {'Secant':<22} {it_s:>10} {c_s['evals']:>8}   order 1.618, derivative-free")
    print(f"  {'Newton (tangent)':<22} {it_n:>10} {c_n['evals']:>8}   order 2, two evals per step")
    print(f"the digit ladder (sqrt(2), 60-digit decimal, from x0 = 1): correct digits per iteration: {digit_ladder}")
    print("the dark side, measured: x^3 - 2x + 2 from 0 cycles 0 -> 1 -> 0 forever (asserted literally); cbrt(x) from 1 obeys x_next = -2x exactly: each step doubles the miss")
    print(f"clients: Kepler's equation at e = 0.9 solved in {it_k} iterations (residual < 1e-13); the cash-flow IRR = {irr_n:.6%} in {it_irr} iterations, agreeing with a bisection cross-check to 1e-9")
    print("OK: the quadratic law verified as digit doubling in 60-digit decimal, the eval ledger counted with the secant's per-eval win kept honestly, both failure gadgets asserted exactly, and two real clients solved with independent cross-checks")
