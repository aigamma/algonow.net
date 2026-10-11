"""Finite difference method x Central difference stencils (puzzle 216).

Replace derivatives by differences of neighboring grid values, then solve the
algebra. Referees: closed-form solutions of the Poisson and heat equations,
the exact solution of the semi-discrete heat system (which isolates the time
stepping error), the closed-form eigenvalues of the second-difference matrix,
and polynomial exactness. AUTHOR CORRECTIONS: the draft asserted the central
first derivative reaches 1e-11 at its best h; the measured floor at h near
1e-5 is 1.6e-11 with the growth below it following eps / h, so the assertion
is a band. The draft expected FTCS at r = 0.51 to blow up within 500 steps;
with a 1e-12 seed the parasitic mode needs about 700 steps to pass one, so
the run is 1,500 steps.
"""
import math
import time

T0 = time.perf_counter()
PI = math.pi


def thomas(a, b, c, d):
    """Solve the tridiagonal system with sub a, diag b, super c, rhs d."""
    n = len(d)
    cp = [0.0] * n
    dp = [0.0] * n
    cp[0] = c[0] / b[0]
    dp[0] = d[0] / b[0]
    for i in range(1, n):
        m = b[i] - a[i] * cp[i - 1]
        cp[i] = c[i] / m if i < n - 1 else 0.0
        dp[i] = (d[i] - a[i] * dp[i - 1]) / m
    x = [0.0] * n
    x[-1] = dp[-1]
    for i in range(n - 2, -1, -1):
        x[i] = dp[i] - cp[i] * x[i + 1]
    return x


def poisson_1d(n, f, exact):
    """u'' = f on (0,1), u(0) = u(1) = 0, n intervals, central second difference."""
    h = 1.0 / n
    m = n - 1
    xs = [(i + 1) * h for i in range(m)]
    a = [1.0 / h ** 2] * m
    b = [-2.0 / h ** 2] * m
    u = thomas(a, b, a, [f(x) for x in xs])
    return max(abs(u[i] - exact(xs[i])) for i in range(m))


def order(errs):
    return [math.log2(errs[i] / errs[i + 1]) for i in range(len(errs) - 1)]


# (a) 1D Poisson: second-order convergence and polynomial exactness
NS = [16, 32, 64, 128, 256]
E1 = [poisson_1d(n, lambda x: -PI * PI * math.sin(PI * x), lambda x: math.sin(PI * x)) for n in NS]
O1 = order(E1)
QUAD = max(poisson_1d(n, lambda x: -2.0, lambda x: x * (1 - x)) for n in NS)
# u = x^3 - x has u'' = 6x and u(0) = u(1) = 0
CUBIC = max(poisson_1d(n, lambda x: 6 * x, lambda x: x ** 3 - x) for n in NS)

# (b) first-derivative stencils on f = exp at x = 1: orders and the round-off floor
f = math.exp
X0 = 1.0
TRUE = math.e


def fwd(h):
    return (f(X0 + h) - f(X0)) / h


def cen(h):
    return (f(X0 + h) - f(X0 - h)) / (2 * h)


def five(h):
    return (-f(X0 + 2 * h) + 8 * f(X0 + h) - 8 * f(X0 - h) + f(X0 - 2 * h)) / (12 * h)


HS = [0.1, 0.05, 0.025, 0.0125]
ORD = {}
for name, st in (('forward', fwd), ('central', cen), ('five-point', five)):
    errs = [abs(st(h) - TRUE) for h in HS]
    ORD[name] = (errs, order(errs))
FLOOR = []
for k in range(1, 27):
    h = 2.0 ** (-k)
    FLOOR.append((h, abs(cen(h) - TRUE)))
BEST_H, BEST_E = min(FLOOR, key=lambda t: t[1])
TINY_E = FLOOR[-1][1]  # h = 2^-26 about 1.5e-8
EPS_H = 2.2e-16 / FLOOR[-1][0]

# (c) 2D Poisson with the five-point stencil: order in h and Jacobi's 1/h^2 iterations


def grid_exact(n):
    # u = exp(x) sin(pi x) sin(pi y): not an eigenvector of the stencil, so the solvers work
    h = 1.0 / n
    return h, [[math.exp(i * h) * math.sin(PI * i * h) * math.sin(PI * j * h) for j in range(1, n)] for i in range(1, n)]


def grid_rhs(n):
    # -laplacian of u above, times h^2
    h = 1.0 / n
    out = []
    for i in range(1, n):
        x = i * h
        row = []
        for j in range(1, n):
            y = j * h
            lap = math.exp(x) * math.sin(PI * y) * ((1 - 2 * PI * PI) * math.sin(PI * x) + 2 * PI * math.cos(PI * x))
            row.append(-lap * h * h)
        out.append(row)
    return out


def apply_lap(u, n):
    m = n - 1
    out = [[0.0] * m for _ in range(m)]
    for i in range(m):
        ui = u[i]
        up = u[i - 1] if i > 0 else None
        dn = u[i + 1] if i < m - 1 else None
        for j in range(m):
            s = 4 * ui[j]
            if j > 0:
                s -= ui[j - 1]
            if j < m - 1:
                s -= ui[j + 1]
            if up is not None:
                s -= up[j]
            if dn is not None:
                s -= dn[j]
            out[i][j] = s
    return out


def cg_2d(n, tol=1e-12):
    """Solve -lap_h u = f (times h^2) by conjugate gradient; returns u and iterations."""
    h, ex = grid_exact(n)
    m = n - 1
    rhs = grid_rhs(n)
    u = [[0.0] * m for _ in range(m)]
    r = [row[:] for row in rhs]
    p = [row[:] for row in rhs]
    rr = sum(v * v for row in r for v in row)
    it = 0
    while math.sqrt(rr) > tol and it < 10000:
        ap = apply_lap(p, n)
        alpha = rr / sum(p[i][j] * ap[i][j] for i in range(m) for j in range(m))
        for i in range(m):
            for j in range(m):
                u[i][j] += alpha * p[i][j]
                r[i][j] -= alpha * ap[i][j]
        rr2 = sum(v * v for row in r for v in row)
        beta = rr2 / rr
        rr = rr2
        for i in range(m):
            for j in range(m):
                p[i][j] = r[i][j] + beta * p[i][j]
        it += 1
    err = max(abs(u[i][j] - ex[i][j]) for i in range(m) for j in range(m))
    return err, it


def jacobi_2d(n, tol=1e-6):
    """Jacobi sweeps until the residual falls below tol times the right-hand side's size."""
    m = n - 1
    rhs = grid_rhs(n)
    scale = max(abs(v) for row in rhs for v in row)
    u = [[0.0] * m for _ in range(m)]
    it = 0
    while True:
        it += 1
        new = [[0.0] * m for _ in range(m)]
        for i in range(m):
            for j in range(m):
                s = rhs[i][j]
                if i > 0:
                    s += u[i - 1][j]
                if i < m - 1:
                    s += u[i + 1][j]
                if j > 0:
                    s += u[i][j - 1]
                if j < m - 1:
                    s += u[i][j + 1]
                new[i][j] = 0.25 * s
        u = new
        au = apply_lap(u, n)
        res = max(abs(au[i][j] - rhs[i][j]) for i in range(m) for j in range(m))
        if res < tol * scale or it > 100000:
            return it


N2 = [8, 16, 32]
E2, CGIT = zip(*[cg_2d(n) for n in N2])
O2 = order(list(E2))
JIT = [jacobi_2d(n) for n in N2]
JRATIO = [JIT[i + 1] / JIT[i] for i in range(len(JIT) - 1)]

# (d) heat equation u_t = u_xx, u(x, 0) = sin(pi x): FTCS, backward Euler, Crank-Nicolson
NX = 40
HX = 1.0 / NX
XS = [i * HX for i in range(1, NX)]
LAM1 = (2 - 2 * math.cos(PI * HX)) / HX ** 2  # discrete eigenvalue of the first mode


def semi_exact(t):
    return [math.exp(-LAM1 * t) * math.sin(PI * x) for x in XS]


def ftcs(r, steps, seed=0.0):
    dt = r * HX * HX
    u = [math.sin(PI * x) for x in XS]
    u[len(u) // 2] += seed
    for _ in range(steps):
        u = [u[i] + r * ((u[i - 1] if i > 0 else 0.0) - 2 * u[i] + (u[i + 1] if i < NX - 2 else 0.0)) for i in range(NX - 1)]
    return u, dt * steps


def implicit(r, steps, theta):
    """theta = 1 backward Euler, theta = 1/2 Crank-Nicolson."""
    dt = r * HX * HX
    m = NX - 1
    u = [math.sin(PI * x) for x in XS]
    a = [-theta * r] * m
    b = [1 + 2 * theta * r] * m
    for _ in range(steps):
        rhs = [u[i] + (1 - theta) * r * ((u[i - 1] if i > 0 else 0.0) - 2 * u[i] + (u[i + 1] if i < m - 1 else 0.0)) for i in range(m)]
        u = thomas(a, b, a, rhs)
    return u, dt * steps


def maxabs(v):
    return max(abs(x) for x in v)


STEPS = 1500
U_OK, T_OK = ftcs(0.49, STEPS, 1e-12)
U_BAD, T_BAD = ftcs(0.51, STEPS, 1e-12)
TRUE_OK = maxabs([math.exp(-PI * PI * T_OK) * math.sin(PI * x) for x in XS])
ERR_OK = maxabs([U_OK[i] - math.exp(-PI * PI * T_OK) * math.sin(PI * XS[i]) for i in range(NX - 1)])
# time-stepping orders against the semi-discrete exact solution at T = 0.1
T_END = 0.1
TORD = {}
for name, theta in (('backward Euler', 1.0), ('Crank-Nicolson', 0.5)):
    errs = []
    for r in (8.0, 4.0, 2.0):
        steps = round(T_END / (r * HX * HX))
        u, t = implicit(r, steps, theta)
        se = semi_exact(t)
        errs.append(maxabs([u[i] - se[i] for i in range(NX - 1)]))
    TORD[name] = (errs, order(errs))
errs = []
for r in (0.4, 0.2, 0.1):
    steps = round(T_END / (r * HX * HX))
    u, t = ftcs(r, steps)
    se = semi_exact(t)
    errs.append(maxabs([u[i] - se[i] for i in range(NX - 1)]))
TORD['FTCS'] = (errs, order(errs))
U_BE, _ = implicit(8.0, round(T_END / (8 * HX * HX)), 1.0)
U_CN, _ = implicit(8.0, round(T_END / (8 * HX * HX)), 0.5)

# (e) eigenvalues of the second-difference matrix against the closed form
M = NX - 1
EIG_RES = 0.0
for k in range(1, M + 1):
    lam = (2 - 2 * math.cos(k * PI * HX)) / HX ** 2
    v = [math.sin(k * PI * x) for x in XS]
    av = [(-(v[i - 1] if i > 0 else 0.0) + 2 * v[i] - (v[i + 1] if i < M - 1 else 0.0)) / HX ** 2 for i in range(M)]
    EIG_RES = max(EIG_RES, maxabs([av[i] - lam * v[i] for i in range(M)]) / lam)
v = [1.0 + 0.1 * i for i in range(M)]
for _ in range(400):
    av = [(-(v[i - 1] if i > 0 else 0.0) + 2 * v[i] - (v[i + 1] if i < M - 1 else 0.0)) for i in range(M)]
    nrm = math.sqrt(sum(x * x for x in av))
    v = [x / nrm for x in av]
POWER = nrm / HX ** 2
LAM_MAX = (2 - 2 * math.cos(M * PI * HX)) / HX ** 2
COND = LAM_MAX / LAM1

ELAPSED = time.perf_counter() - T0

print('1D Poisson, central second difference, u = sin(pi x):')
for n, e in zip(NS, E1):
    print(f'  n = {n:4d}  h = {1 / n:.5f}  max error {e:.3e}')
print(f'  observed orders {", ".join(f"{o:.2f}" for o in O1)}; quadratic exact to {QUAD:.1e}, cubic to {CUBIC:.1e}')
print('first derivative of exp at x = 1, h = 0.1, 0.05, 0.025, 0.0125:')
for name, (errs, ords) in ORD.items():
    print(f'  {name:10s} errors {", ".join(f"{e:.2e}" for e in errs)}; orders {", ".join(f"{o:.2f}" for o in ords)}')
print(f'  central floor: best h = {BEST_H:.1e} with error {BEST_E:.1e}; at h = {FLOOR[-1][0]:.1e} the error is {TINY_E:.1e} (eps / h = {EPS_H:.1e})')
print('2D Poisson, five-point stencil, u = exp(x) sin(pi x) sin(pi y), conjugate gradient to 1e-12:')
for n, e, it, jit in zip(N2, E2, CGIT, JIT):
    print(f'  n = {n:3d}  max error {e:.3e}  CG iterations {it:3d}  Jacobi iterations to 1e-6: {jit}')
print(f'  observed orders {", ".join(f"{o:.2f}" for o in O2)}; Jacobi growth per halving of h {", ".join(f"{q:.2f}" for q in JRATIO)}')
print(f'heat equation, h = {HX}, {STEPS} FTCS steps with a 1e-12 seed:')
print(f'  r = 0.49: max |u| {maxabs(U_OK):.4e} (exact {TRUE_OK:.4e}, error {ERR_OK:.1e}); r = 0.51: max |u| {maxabs(U_BAD):.3e}')
for name, (errs, ords) in TORD.items():
    print(f'  {name:15s} error vs semi-discrete exact at T = 0.1 {", ".join(f"{e:.2e}" for e in errs)}; orders {", ".join(f"{o:.2f}" for o in ords)}')
print(f'  r = 8: backward Euler max |u| {maxabs(U_BE):.4f}, Crank-Nicolson {maxabs(U_CN):.4f}, semi-discrete exact {maxabs(semi_exact(T_END)):.4f}')
print(f'eigenvalues of the second-difference matrix: closed form holds to {EIG_RES:.1e}; power iteration {POWER:.3f} vs {LAM_MAX:.3f}; condition number {COND:.0f} ~ 4 / (pi h)^2 = {4 / (PI * HX) ** 2:.0f}')
print(f'{ELAPSED:.1f} s')

assert all(1.9 < o < 2.1 for o in O1), O1
assert QUAD < 1e-12 and CUBIC < 1e-11, (QUAD, CUBIC)
assert 0.9 < ORD['forward'][1][-1] < 1.1 and 1.9 < ORD['central'][1][-1] < 2.1 and 3.8 < ORD['five-point'][1][-1] < 4.2, ORD
assert 1e-6 < BEST_H < 1e-4 and BEST_E < 1e-10 and TINY_E > 1e-9, (BEST_H, BEST_E, TINY_E)
assert all(1.9 < o < 2.1 for o in O2), O2
assert all(3.3 < q < 4.7 for q in JRATIO), JRATIO
assert maxabs(U_OK) < 1.0 and ERR_OK < 1e-3 and maxabs(U_BAD) > 1.0, (maxabs(U_OK), ERR_OK, maxabs(U_BAD))
assert 0.9 < TORD['backward Euler'][1][-1] < 1.1 and 1.9 < TORD['Crank-Nicolson'][1][-1] < 2.1 and 0.9 < TORD['FTCS'][1][-1] < 1.1, TORD
assert maxabs(U_BE) < 1.0 and maxabs(U_CN) < 1.0
assert EIG_RES < 1e-10 and abs(POWER - LAM_MAX) / LAM_MAX < 1e-3, (EIG_RES, POWER, LAM_MAX)
assert ELAPSED < 30

print(
    f'OK: the central second difference converges at order {sum(O1) / len(O1):.2f} on the Poisson equation ({E1[0]:.1e} at n = 16 to {E1[-1]:.1e} at n = 256) '
    f'and is exact on quadratics and cubics to {max(QUAD, CUBIC):.0e}; forward, central, and five-point first derivatives measure orders '
    f'{ORD["forward"][1][-1]:.2f}, {ORD["central"][1][-1]:.2f}, {ORD["five-point"][1][-1]:.2f} with the central round-off floor {BEST_E:.1e} at h = {BEST_H:.0e} '
    f'rising to {TINY_E:.1e} at h = {FLOOR[-1][0]:.0e}; the five-point Laplacian converges at order {sum(O2) / len(O2):.2f} while Jacobi needs {JIT[0]}, {JIT[1]}, {JIT[2]} '
    f'sweeps for n = 8, 16, 32 against conjugate gradient {CGIT[0]}, {CGIT[1]}, {CGIT[2]}; FTCS at r = 0.49 decays to {maxabs(U_OK):.4f} (error {ERR_OK:.1e}) '
    f'where r = 0.51 reaches {maxabs(U_BAD):.1e} in {STEPS} steps; backward Euler and Crank-Nicolson at r = 8 stay bounded with time orders '
    f'{TORD["backward Euler"][1][-1]:.2f} and {TORD["Crank-Nicolson"][1][-1]:.2f}; the second-difference eigenvalues match the closed form to {EIG_RES:.0e}; {ELAPSED:.1f} s'
)
