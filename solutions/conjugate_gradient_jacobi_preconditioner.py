# Puzzle 140: Conjugate gradient x Jacobi preconditioner
# SPD sparse systems: solve A x = b where A is symmetric positive
# definite and sparse, too large to eliminate. Conjugate gradient is
# the algorithm: an iteration that touches A only through
# matrix-vector products, building search directions that are
# A-conjugate to every previous one, so each step's progress is never
# undone, and the exact answer arrives in at most N steps in exact
# arithmetic and in about sqrt(condition number) steps in practice.
# The heuristic is the preconditioner: solve M^-1 A x = M^-1 b with M
# a cheap approximation of A, and the cheapest of all is Jacobi, M =
# diag(A), which costs one division per unknown per iteration and
# removes any bad scaling of the rows.
#
# The systems: the 2-D Poisson equation on an n x n grid (the 5-point
# Laplacian, N = n^2 unknowns), once with a uniform coefficient and
# once with a coefficient that jumps by 10^4 across the domain.
#
# Referees:
# (1) THE DIRECT SOLVE: on the 8 x 8 grid (64 unknowns) the CG answer
#     must match Gaussian elimination to 1e-9, and CG must terminate
#     within N + 2 iterations (finite termination, up to rounding);
# (2) THE RESIDUAL: on the 32 x 32 grid (1,024 unknowns) the relative
#     residual |b - A x| / |b| must fall below 1e-8;
# (3) THE CONDITION-NUMBER LAW: the Laplacian's extreme eigenvalues are
#     known in closed form; CG's iteration count must sit under the
#     classical bound derived from sqrt(kappa), and grow like the grid
#     size n (sqrt(kappa) is proportional to n), measured at n = 16,
#     32, 64;
# (4) THE PRECONDITIONER: on the uniform grid Jacobi changes nothing
#     (the diagonal is constant), and the run says so; on the jumping
#     coefficient it cuts the iterations by a measured factor, because
#     dividing by the diagonal undoes the scaling that the jump put
#     into the condition number;
# (5) THE ABLATION: steepest descent (the same quadratic, the gradient
#     as the direction, no conjugacy) capped at 20,000 iterations,
#     measured against CG on the same 32 x 32 system.
import math

SEED = 20260926


def build(n, coeff):
    """5-point discretization of -div(c grad u) on an n x n interior
    grid with zero boundary; coeff(i, j) gives the cell coefficient.
    Returns (N, apply, diag)."""
    N = n * n
    c = [[coeff(i, j) for j in range(n)] for i in range(n)]

    def edge(i, j, i2, j2):
        if i2 < 0 or j2 < 0 or i2 >= n or j2 >= n:
            return c[i][j]
        return 2 * c[i][j] * c[i2][j2] / (c[i][j] + c[i2][j2])       # harmonic mean

    neighbors = []
    diag = [0.0] * N
    for i in range(n):
        for j in range(n):
            k = i * n + j
            lst = []
            for di, dj in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                w = edge(i, j, i + di, j + dj)
                diag[k] += w
                if 0 <= i + di < n and 0 <= j + dj < n:
                    lst.append(((i + di) * n + (j + dj), w))
            neighbors.append(lst)

    def apply(x):
        y = [0.0] * N
        for k in range(N):
            s = diag[k] * x[k]
            for m, w in neighbors[k]:
                s -= w * x[m]
            y[k] = s
        return y

    return N, apply, diag, neighbors


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def norm(a):
    return math.sqrt(dot(a, a))


def cg(apply, b, N, tol=1e-8, max_iter=100000, precond=None):
    """Preconditioned conjugate gradient. precond maps r -> M^-1 r.
    Returns (x, iterations, residual history)."""
    x = [0.0] * N
    r = list(b)
    z = precond(r) if precond else r
    p = list(z)
    rz = dot(r, z)
    bnorm = norm(b)
    history = [norm(r) / bnorm]
    it = 0
    while history[-1] > tol and it < max_iter:
        Ap = apply(p)
        alpha = rz / dot(p, Ap)
        x = [xi + alpha * pi for xi, pi in zip(x, p)]
        r = [ri - alpha * api for ri, api in zip(r, Ap)]
        z = precond(r) if precond else r
        rz_new = dot(r, z)
        beta = rz_new / rz
        p = [zi + beta * pi for zi, pi in zip(z, p)]
        rz = rz_new
        it += 1
        history.append(norm(r) / bnorm)
    return x, it, history


def steepest_descent(apply, b, N, tol=1e-8, max_iter=20000):
    x = [0.0] * N
    r = list(b)
    bnorm = norm(b)
    it = 0
    res = norm(r) / bnorm
    while res > tol and it < max_iter:
        Ar = apply(r)
        alpha = dot(r, r) / dot(r, Ar)
        x = [xi + alpha * ri for xi, ri in zip(x, r)]
        r = [ri - alpha * ari for ri, ari in zip(r, Ar)]
        it += 1
        res = norm(r) / bnorm
    return x, it, res


def dense_solve(N, apply):
    """Gaussian elimination with partial pivoting on the explicit matrix."""
    cols = []
    for k in range(N):
        e = [0.0] * N
        e[k] = 1.0
        cols.append(apply(e))
    A = [[cols[j][i] for j in range(N)] for i in range(N)]
    return A


def solve_dense(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for k in range(n):
        p = max(range(k, n), key=lambda i: abs(M[i][k]))
        M[k], M[p] = M[p], M[k]
        for i in range(k + 1, n):
            f = M[i][k] / M[k][k]
            for j in range(k, n + 1):
                M[i][j] -= f * M[k][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x


def laplacian_condition(n):
    lam = lambda k: 2 - 2 * math.cos(math.pi * k / (n + 1))
    lo = 2 * lam(1)
    hi = 2 * lam(n)
    return hi / lo


def cg_bound(kappa, tol):
    """Iterations k with 2 ((sqrt k - 1)/(sqrt k + 1))^k <= tol."""
    q = (math.sqrt(kappa) - 1) / (math.sqrt(kappa) + 1)
    return math.ceil(math.log(tol / 2) / math.log(q))


if __name__ == '__main__':
    import random
    rng = random.Random(SEED)
    uniform = lambda i, j: 1.0

    # Oracle 1: the direct solve and finite termination on 64 unknowns.
    N8, apply8, diag8, _ = build(8, uniform)
    b8 = [rng.uniform(-1, 1) for _ in range(N8)]
    x_cg, it8, _ = cg(apply8, b8, N8, tol=1e-12)
    x_dense = solve_dense(dense_solve(N8, apply8), b8)
    worst = max(abs(a - c) for a, c in zip(x_cg, x_dense))
    assert worst < 1e-9, worst
    assert it8 <= N8 + 2, it8

    # Oracle 2 + 3: the residual and the condition-number law.
    table = []
    for n in (16, 32, 64):
        N, apply, diag, _ = build(n, uniform)
        b = [rng.uniform(-1, 1) for _ in range(N)]
        x, it, hist = cg(apply, b, N)
        r = [bi - yi for bi, yi in zip(b, apply(x))]
        rel = norm(r) / norm(b)
        kappa = laplacian_condition(n)
        bound = cg_bound(kappa, 1e-8)
        assert rel < 1e-8, rel
        assert it <= bound, (n, it, bound)
        table.append((n, N, kappa, bound, it, rel))
    ratios = [table[i + 1][4] / table[i][4] for i in range(2)]
    assert all(1.5 < r < 2.6 for r in ratios), ratios

    # Oracle 4: the preconditioner, uniform and jumping.
    N32, apply32, diag32, _ = build(32, uniform)
    b32 = [rng.uniform(-1, 1) for _ in range(N32)]
    jac32 = lambda r: [ri / d for ri, d in zip(r, diag32)]
    _, it_plain_u, _ = cg(apply32, b32, N32)
    _, it_jac_u, _ = cg(apply32, b32, N32, precond=jac32)
    assert abs(it_plain_u - it_jac_u) <= 1, (it_plain_u, it_jac_u)
    jump = lambda i, j: 1e4 if (i < 16) == (j < 16) else 1.0
    Nj, applyj, diagj, _ = build(32, jump)
    bj = [rng.uniform(-1, 1) for _ in range(Nj)]
    jacj = lambda r: [ri / d for ri, d in zip(r, diagj)]
    xj_plain, it_plain_j, hist_plain_j = cg(applyj, bj, Nj, max_iter=20000)
    xj_jac, it_jac_j, hist_jac_j = cg(applyj, bj, Nj, precond=jacj, max_iter=20000)
    rel_plain_j = norm([bi - yi for bi, yi in zip(bj, applyj(xj_plain))]) / norm(bj)
    rel_jac_j = norm([bi - yi for bi, yi in zip(bj, applyj(xj_jac))]) / norm(bj)
    assert rel_jac_j < 1e-8, rel_jac_j
    assert it_jac_j * 1.5 < it_plain_j, (it_jac_j, it_plain_j)

    # Oracle 5: steepest descent.
    x_sd, it_sd, res_sd = steepest_descent(apply32, b32, N32)
    _, it_cg32, _ = cg(apply32, b32, N32)
    assert it_sd > 10 * it_cg32, (it_sd, it_cg32)

    print('contest: the 2-D Poisson equation (5-point Laplacian), symmetric positive definite; referees: Gaussian elimination on 64 unknowns, the residual, and the closed-form condition number')
    print(f"  {'grid':>6} {'unknowns':>9} {'kappa':>9} {'CG bound':>9} {'CG iters':>9} {'residual':>10}   verdict")
    for n, N, kappa, bound, it, rel in table:
        print(f'  {n:>3}x{n:<2} {N:>9,} {kappa:>9.0f} {bound:>9} {it:>9} {rel:>10.1e}   under the sqrt(kappa) bound; iterations grow with n')
    print(f'64 unknowns: CG vs Gaussian elimination worst difference {worst:.1e}, terminated in {it8} iterations (N = {N8})')
    print(f'Jacobi on the uniform 32x32 grid: {it_plain_u} iterations plain, {it_jac_u} preconditioned (the diagonal is constant: nothing to fix)')
    print(f'Jacobi on the 10^4 coefficient jump (32x32): plain CG {it_plain_j} iterations to residual {rel_plain_j:.1e}; Jacobi-preconditioned CG {it_jac_j} iterations to {rel_jac_j:.1e}')
    print(f'steepest descent on the uniform 32x32 grid: {it_sd:,} iterations reached residual {res_sd:.1e} (CG: {it_cg32})')
    print(f'OK: CG matched elimination to {worst:.0e} and terminated within N on 64 unknowns; residual {table[1][5]:.0e} on 1,024 unknowns in {table[1][4]} iterations under the bound {table[1][3]}; '
          f'iterations grew x{ratios[0]:.2f} and x{ratios[1]:.2f} per doubling of n; Jacobi cut the jumping system from {it_plain_j} to {it_jac_j} iterations and changed the uniform one by {abs(it_plain_u - it_jac_u)}; steepest descent {it_sd:,} vs CG {it_cg32}')
