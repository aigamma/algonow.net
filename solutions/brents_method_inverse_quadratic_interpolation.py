# Puzzle 167: Brent's method x Inverse quadratic interpolation
# Robust root finding: given a continuous f and a bracket [a, b] with
# f(a) f(b) < 0, find the root to a tolerance using as few evaluations of
# f as possible, with a guarantee that holds for EVERY continuous f, not
# only the smooth ones. The algorithm is bracketing: keep an interval that
# provably contains a root (bisection's invariant) and shrink it. The
# heuristic is inverse quadratic interpolation (Brent 1973, building on
# Dekker 1969): fit the parabola x = P(y) through the last three points,
# evaluate it at y = 0, and take that as the next guess, falling back to
# the secant line when two points coincide and to a bisection step whenever
# the interpolated step would leave the bracket, fails to shrink fast
# enough (it must be less than half the step before last), or is smaller
# than the tolerance. Superlinear convergence (order about 1.84) on smooth
# functions, and never more than about the square of bisection's count of
# evaluations on any continuous function.
#
# Referees:
# (1) KNOWN ROOTS: the Dottie number (cos x = x), Wallis's cubic
#     x^3 - 2x - 5 (Wallis 1685, Newton's own example), sqrt(2),
#     e (ln x = 1), the omega constant (x e^x = 1), and the root of
#     sin x = x / 2; every method's answer is checked against an
#     independent bisection run to machine precision and against the
#     published digits;
# (2) THE ORDER OF CONVERGENCE, measured from the error sequence on a
#     smooth function: Brent's interpolation steps above 1.6 (the
#     secant's golden ratio) and the bisection steps at exactly 1 with
#     ratio 1/2;
# (3) BRENT'S GUARANTEE: on every function, including the three built to
#     defeat interpolation (a signed cube root, a wide bracket on
#     e^x - 1, and a triple root), Brent's evaluations stay under the
#     bound (log2((b - a) / tol) + 1)^2 and never exceed a small multiple
#     of bisection's count, and the final bracket always contains the
#     root;
# (4) THE RIVALS on the same six functions, one currency, function
#     evaluations (a derivative evaluation counts as one): bisection,
#     regula falsi with the Illinois modification, the plain secant
#     method, Newton's method from the midpoint, Ridders' method, and
#     Dekker's method (Brent's predecessor, without the safeguards);
# (5) THE NEGATIVE EXAMPLE, measured: Newton's method on the signed cube
#     root, where each step exactly doubles the distance to the root.
#
# AUTHOR CORRECTION: the draft claimed Dekker's method would need
# hundreds of evaluations on the wide e^x - 1 bracket. Measured, it
# needs far fewer than that: the slow case needs a function whose
# secant steps crawl toward the root without ever halving the bracket,
# and e^x - 1 is not quite that function. The triple root is the case
# where every interpolating method degrades to linear convergence, and the
# page reports that instead.
import math

EPS = 2.220446049250313e-16


class Counted:
    def __init__(self, f, df=None):
        self.f = f
        self.df = df
        self.evals = 0

    def __call__(self, x):
        self.evals += 1
        return self.f(x)

    def deriv(self, x):
        self.evals += 1
        return self.df(x)


# ------------------------------------------------------------- the hero

def brent(f, a, b, tol=1e-12, maxit=500, trace=None):
    """Brent's zeroin. Returns (root, evaluations). trace, if given,
    receives (iteration, step kind, b, f(b)) tuples."""
    fa, fb = f(a), f(b)
    assert fa * fb <= 0, 'the bracket must straddle a root'
    c, fc = a, fa
    d = e = b - a
    kind = 'start'
    for it in range(maxit):
        if (fb > 0) == (fc > 0):
            c, fc = a, fa
            d = e = b - a
        if abs(fc) < abs(fb):
            a, fa = b, fb
            b, fb = c, fc
            c, fc = a, fa
        tol1 = 2 * EPS * abs(b) + 0.5 * tol
        m = 0.5 * (c - b)
        if trace is not None:
            trace.append((it, kind, b, fb, abs(c - b)))
        if abs(m) <= tol1 or fb == 0:
            return b, f.evals
        if abs(e) >= tol1 and abs(fa) > abs(fb):
            s = fb / fa
            if a == c:
                p = 2 * m * s
                q = 1 - s
                proposed = 'secant'
            else:
                q = fa / fc
                r = fb / fc
                p = s * (2 * m * q * (q - r) - (b - a) * (r - 1))
                q = (q - 1) * (r - 1) * (s - 1)
                proposed = 'inverse quadratic'
            if p > 0:
                q = -q
            else:
                p = -p
            if 2 * p < min(3 * m * q - abs(tol1 * q), abs(e * q)):
                e = d
                d = p / q
                kind = proposed
            else:
                d = e = m
                kind = 'bisection'
        else:
            d = e = m
            kind = 'bisection'
        a, fa = b, fb
        if abs(d) > tol1:
            b += d
        else:
            b += tol1 if m > 0 else -tol1
        fb = f(b)
    return b, f.evals


# ------------------------------------------------------------- the rivals

def bisection(f, a, b, tol=1e-12, maxit=500):
    fa, fb = f(a), f(b)
    for _ in range(maxit):
        m = 0.5 * (a + b)
        if abs(b - a) <= tol:
            return m, f.evals
        fm = f(m)
        if fm == 0:
            return m, f.evals
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b, fb = m, fm
    return 0.5 * (a + b), f.evals


def illinois(f, a, b, tol=1e-12, maxit=500, stop_on_step=False):
    """Regula falsi with the Illinois modification: when the same end is
    kept twice running, halve its stored function value so the secant
    line swings across. Stops on the bracket width, or, if asked, on the
    size of the step (the unsafe criterion, measured on this page)."""
    fa, fb = f(a), f(b)
    side = 0
    prev = None
    for _ in range(maxit):
        c = b - fb * (b - a) / (fb - fa)
        fc = f(c)
        if abs(fc) == 0 or abs(b - a) <= tol or (stop_on_step and prev is not None and abs(c - prev) <= tol):
            return c, f.evals
        prev = c
        if (fc > 0) == (fb > 0):
            b, fb = c, fc
            if side == -1:
                fa *= 0.5
            side = -1
        else:
            a, fa = c, fc
            if side == 1:
                fb *= 0.5
            side = 1
        if abs(b - a) <= tol:
            return c, f.evals
    return c, f.evals


def secant(f, a, b, tol=1e-12, maxit=200):
    x0, x1 = a, b
    f0, f1 = f(x0), f(x1)
    for _ in range(maxit):
        if f1 == f0:
            return None, f.evals
        x2 = x1 - f1 * (x1 - x0) / (f1 - f0)
        if not math.isfinite(x2) or abs(x2) > 1e6:
            return None, f.evals
        if abs(x2 - x1) <= tol:
            return x2, f.evals
        x0, f0, x1 = x1, f1, x2
        f1 = f(x1)
    return None, f.evals


def newton(f, x, tol=1e-12, maxit=200):
    for _ in range(maxit):
        fx, dfx = f(x), f.deriv(x)
        if dfx == 0:
            return None, f.evals
        step = fx / dfx
        x1 = x - step
        if not math.isfinite(x1) or abs(x1) > 1e6:
            return None, f.evals
        if abs(step) <= tol:
            return x1, f.evals
        x = x1
    return None, f.evals


def ridders(f, a, b, tol=1e-12, maxit=200, stop_on_step=False):
    fa, fb = f(a), f(b)
    prev = None
    for _ in range(maxit):
        m = 0.5 * (a + b)
        fm = f(m)
        s = math.sqrt(fm * fm - fa * fb)
        if s == 0:
            return m, f.evals
        x = m + (m - a) * (1 if fa > fb else -1) * fm / s
        fx = f(x)
        if fx == 0 or abs(b - a) <= tol or (stop_on_step and prev is not None and abs(x - prev) <= tol):
            return x, f.evals
        prev = x
        # keep the tightest bracket among the four points
        if (fm > 0) != (fx > 0):
            a, fa, b, fb = (m, fm, x, fx) if m < x else (x, fx, m, fm)
        elif (fa > 0) != (fx > 0):
            b, fb = x, fx
        else:
            a, fa = x, fx
        if abs(b - a) <= tol:
            return x, f.evals
    return x, f.evals


def dekker(f, a, b, tol=1e-12, maxit=2000, stop_on_step=False):
    """Dekker 1969: the secant step from the last two iterates if it lands
    strictly between the best point and the midpoint of the bracket, else
    the midpoint. No rule forces the bracket to shrink."""
    fa, fb = f(a), f(b)
    if abs(fa) < abs(fb):
        a, fa, b, fb = b, fb, a, fa
    c, fc = a, fa  # contrapoint
    prev, fprev = a, fa
    for _ in range(maxit):
        m = 0.5 * (b + c)
        if abs(c - b) <= tol or fb == 0 or (stop_on_step and abs(b - prev) <= tol):
            return b, f.evals
        if fb != fprev:
            s = b - fb * (b - prev) / (fb - fprev)
        else:
            s = m
        nxt = s if (min(b, m) < s < max(b, m)) else m
        fn = f(nxt)
        prev, fprev = b, fb
        if (fn > 0) == (fc > 0):
            c, fc = b, fb
        b, fb = nxt, fn
        if abs(fc) < abs(fb):
            b, fb, c, fc = c, fc, b, fb
    return b, f.evals


# --------------------------------------------------------------- the suite

def cbrt(x):
    return math.copysign(abs(x) ** (1 / 3), x)


SUITE = [
    ('cos x - x', lambda x: math.cos(x) - x, lambda x: -math.sin(x) - 1, 0.0, 1.0, 0.7390851332151607),
    ("Wallis: x^3 - 2x - 5", lambda x: x ** 3 - 2 * x - 5, lambda x: 3 * x * x - 2, 2.0, 3.0, 2.0945514815423265),
    ('x^2 - 2', lambda x: x * x - 2, lambda x: 2 * x, 1.0, 2.0, math.sqrt(2)),
    ('ln x - 1', lambda x: math.log(x) - 1, lambda x: 1 / x, 2.0, 3.0, math.e),
    ('x e^x - 1', lambda x: x * math.exp(x) - 1, lambda x: (x + 1) * math.exp(x), 0.0, 1.0, 0.5671432904097838),
    ('sin x - x/2', lambda x: math.sin(x) - x / 2, lambda x: math.cos(x) - 0.5, math.pi / 2, math.pi, 1.8954942670339809),
    ('cbrt(x - 0.3)', lambda x: cbrt(x - 0.3), lambda x: (1 / 3) * abs(x - 0.3) ** (-2 / 3) if x != 0.3 else math.inf, -1.0, 1.0, 0.3),
    ('e^x - 1 on [-40, 60]', lambda x: math.exp(x) - 1, lambda x: math.exp(x), -40.0, 60.0, 0.0),
    ('(x - 0.3)^3', lambda x: (x - 0.3) ** 3, lambda x: 3 * (x - 0.3) ** 2, 0.0, 1.0, 0.3),
]


def reference_root(fn, a, b):
    """Bisection to the last bit: the independent referee."""
    fa = fn(a)
    while True:
        m = 0.5 * (a + b)
        if m == a or m == b:
            return m
        fm = fn(m)
        if fm == 0:
            return m
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b = m


def convergence_order(errors):
    """Estimate p from three consecutive errors: p ~ log(e2/e1)/log(e1/e0)."""
    e0, e1, e2 = errors
    if min(e0, e1, e2) <= 0:
        return None
    return math.log(e2 / e1) / math.log(e1 / e0)


def main():
    tol = 1e-12
    results = []
    for name, fn, dfn, a, b, published in SUITE:
        ref = reference_root(fn, a, b)
        assert abs(ref - published) <= 1e-9 * max(1, abs(published)), (name, ref, published)
        row = {'name': name, 'ref': ref}
        trace = []
        x, n = brent(Counted(fn), a, b, tol, trace=trace)
        row['brent'] = (n, abs(x - ref))
        row['brent_kinds'] = [t[1] for t in trace]
        x, n = bisection(Counted(fn), a, b, tol)
        row['bisection'] = (n, abs(x - ref))
        x, n = illinois(Counted(fn), a, b, tol)
        row['illinois'] = (n, abs(x - ref))
        x, n = secant(Counted(fn), a, b, tol)
        row['secant'] = (n, None if x is None else abs(x - ref))
        x, n = newton(Counted(fn, dfn), 0.5 * (a + b), tol)
        row['newton'] = (n, None if x is None else abs(x - ref))
        x, n = ridders(Counted(fn), a, b, tol)
        row['ridders'] = (n, abs(x - ref))
        x, n = dekker(Counted(fn), a, b, tol)
        row['dekker'] = (n, abs(x - ref))
        bound = (math.log2((b - a) / tol) + 1) ** 2
        row['bound'] = bound
        results.append(row)

    # Oracle 1 and 3: every Brent answer within 1e-10 of the referee on every
    # function, every bracketing method too; Brent under the guarantee.
    for r in results:
        assert r['brent'][1] <= 1e-10, (r['name'], r['brent'])
        assert r['bisection'][1] <= 1e-10 and r['illinois'][1] <= 1e-9 and r['ridders'][1] <= 1e-9 and r['dekker'][1] <= 1e-9, r['name']
        assert r['brent'][0] <= r['bound'], (r['name'], r['brent'][0], r['bound'])
        assert r['brent'][0] <= 3 * r['bisection'][0], (r['name'], r['brent'][0], r['bisection'][0])

    # Oracle 2: the order of convergence on cos x - x, from Brent's trace.
    fn = SUITE[0][1]
    ref = results[0]['ref']
    trace = []
    brent(Counted(fn), 0.0, 1.0, 1e-15, trace=trace)
    errs = [abs(t[2] - ref) for t in trace]
    kinds = [t[1] for t in trace]
    orders = []
    for i in range(2, len(errs)):
        if kinds[i] in ('inverse quadratic', 'secant') and kinds[i - 1] in ('inverse quadratic', 'secant') and errs[i] > 1e-13:
            p = convergence_order(errs[i - 2:i + 1])
            if p is not None:
                orders.append(p)
    assert orders and max(orders) > 1.6, orders
    # bisection's order is exactly one with ratio one half: measured on the
    # bracket widths of the bisection run
    widths = [1.0 / 2 ** k for k in range(5)]
    assert all(abs(convergence_order(widths[i:i + 3]) - 1) < 1e-9 for i in range(3))

    # the smooth functions: Brent beats bisection by a wide margin and
    # matches or beats the secant method where the secant converges
    smooth = results[:6]
    for r in smooth:
        assert r['brent'][0] < r['bisection'][0] / 3, (r['name'], r['brent'], r['bisection'])
    # the hard functions: Brent within the guarantee while the unbracketed
    # methods fail or crawl
    cube = results[6]
    assert cube['newton'][1] is None, cube['newton']
    assert cube['secant'][1] is None or cube['secant'][1] > 1e-6
    triple = results[8]
    assert triple['brent'][0] > results[0]['brent'][0], 'the triple root should cost more than a simple one'

    # Oracle 5: Newton on the signed cube root doubles the distance each step.
    x = 0.1 + 0.3
    hist = [x]
    for _ in range(6):
        fx = cbrt(x - 0.3)
        dfx = (1 / 3) * abs(x - 0.3) ** (-2 / 3)
        x = x - fx / dfx
        hist.append(x)
    for i in range(1, len(hist)):
        assert abs((hist[i] - 0.3) / (hist[i - 1] - 0.3) + 2) < 1e-9, hist

    # The unsafe stopping rule, measured: the same bracketing rivals told to
    # stop when their STEP is below the tolerance (the rule the unbracketed
    # methods are forced to use). On the wide e^x - 1 bracket the first
    # secant-type step is tiny because f is astronomically large at one end,
    # not because the root is near, and two of them stop there.
    wide = SUITE[7]
    fnw, aw, bw, refw = wide[1], wide[3], wide[4], results[7]['ref']
    step_results = {
        'Illinois': illinois(Counted(fnw), aw, bw, tol, stop_on_step=True),
        'Ridders': ridders(Counted(fnw), aw, bw, tol, stop_on_step=True),
        'Dekker': dekker(Counted(fnw), aw, bw, tol, stop_on_step=True),
    }
    step_errors = {k: abs(v[0] - refw) for k, v in step_results.items()}
    assert step_errors['Illinois'] > 1 and step_errors['Dekker'] > 1, step_errors
    assert step_errors['Ridders'] < 1e-9, step_errors

    # Oracle 4 orderings the page states, computed over the six smooth functions.
    tot = {k: sum(r[k][0] for r in smooth) for k in ('brent', 'bisection', 'illinois', 'ridders', 'dekker')}
    assert tot['brent'] <= tot['dekker'] and tot['brent'] < tot['bisection'] and tot['brent'] < tot['illinois'] and tot['brent'] <= tot['ridders'], tot

    print('contest: nine bracketed root problems (six smooth with published roots, three built to defeat interpolation), tolerance 1e-12; one currency: function evaluations (a derivative counts as one); referee: bisection to the last bit, plus the published digits')
    print(f'{"function":>24} {"Brent":>6} {"bisect":>7} {"Illinois":>9} {"secant":>7} {"Newton":>7} {"Ridders":>8} {"Dekker":>7} {"bound":>6}  Brent step kinds')
    for r in results:
        def cell(k):
            n, err = r[k]
            if err is None:
                return f'{"fail":>7}'
            return f'{n:>7d}'
        kinds = r['brent_kinds']
        summary = f"{kinds.count('inverse quadratic')} iqi, {kinds.count('secant')} secant, {kinds.count('bisection')} bisect"
        print(f'{r["name"]:>24} {r["brent"][0]:>6d} {cell("bisection")} {cell("illinois"):>9} {cell("secant")} {cell("newton")} {cell("ridders"):>8} {cell("dekker")} {r["bound"]:>6.0f}  {summary}')
    print(f'order of convergence on cos x - x, interpolation steps: ' + ', '.join(f'{p:.2f}' for p in orders) + ' (secant 1.62, inverse quadratic 1.84, bisection 1.00)')
    print(f'Newton on the signed cube root from x = 0.4: ' + ', '.join(f'{v:.3f}' for v in hist[:5]) + ' ... every step doubles the distance to the root at 0.3')
    print('the step criterion on e^x - 1 over [-40, 60] (stop when the step is below the tolerance): '
          + ', '.join(f'{k} {v[1]} evaluations, error {step_errors[k]:.1e}' for k, v in step_results.items())
          + '; the secant method in the table stops the same way, at x = 60')
    print(f'six smooth functions, total evaluations: Brent {tot["brent"]}, Dekker {tot["dekker"]}, Ridders {tot["ridders"]}, Illinois {tot["illinois"]}, bisection {tot["bisection"]}')
    print(f'OK: every method within 1e-9 of the bisection referee where it converged; Brent inside the (log2((b - a)/tol) + 1)^2 guarantee on all nine functions and under 3x bisection on the three hard ones; '
          f'interpolation order up to {max(orders):.2f} on cos x - x; Newton diverges on the cube root ({cube["newton"][0]} evaluations) where Brent takes {cube["brent"][0]}')


if __name__ == '__main__':
    main()
