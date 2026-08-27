# Puzzle 16: PageRank x damped random walk
# Score every page of a linked graph by importance, robustly, with a
# definition rather than a formula: the stationary distribution of a walk.
#
# The pairing is the point. The control structure is power iteration: apply
# the link matrix again and again until the score vector stops moving. Alone
# it is fragile: dead ends leak probability, closed loops (spider traps)
# absorb all of it, and convergence has no guarantee. The heuristic is the
# damped walk: with probability d follow a random out-link, with probability
# 1 - d teleport to a uniformly random page. One dial (d = 0.85) makes the
# chain irreducible and aperiodic, caps the error decay at d^k so the
# iteration count is known in advance, drains every trap, and gives the
# score a meaning: the long-run share of time a distractible reader spends
# on each page.
import random


def make_web(n=2000, seed=20260827):
    """A power-law-ish web with the two classic pathologies planted:
    a 30-node tightly-knit clique (dense mutual links, but with exits) and
    a 10-node spider trap (reachable, no way out). Plus ~50 dead ends."""
    rng = random.Random(seed)
    out = [[] for _ in range(n)]
    for v in range(10, n - 90):
        for _ in range(rng.randint(3, 8)):
            t = rng.randrange(v)  # link an earlier page: old pages get rich
            if t != v:
                out[v].append(t)
    base_hi = n - 90
    clique = list(range(base_hi, base_hi + 30))
    for v in clique:
        peers = rng.sample([c for c in clique if c != v], 20)
        out[v].extend(peers)
        out[v].extend(rng.sample(range(200), 2))  # exits: dense, not a trap
    for _ in range(15):
        out[rng.randrange(200)].append(rng.choice(clique))
    trap = list(range(base_hi + 30, base_hi + 40))
    for i, v in enumerate(trap):
        out[v].append(trap[(i + 1) % 10])  # a ring with no exit
        out[v].append(trap[(i + 3) % 10])
    for _ in range(20):
        out[rng.randrange(500)].append(rng.choice(trap))
    # The remaining 50 nodes dangle: reachable, no out-links at all.
    dangling = list(range(base_hi + 40, n))
    for v in dangling:
        out[rng.randrange(500)].append(v)
    return out, clique, trap


def pagerank(out, d=0.85, tol=1e-8, cap=100000):
    """Power iteration on the damped walk. Dangling mass is spread
    uniformly; the vector is a probability distribution at every step."""
    n = len(out)
    x = [1.0 / n] * n
    iters = 0
    while iters < cap:
        iters += 1
        nxt = [0.0] * n
        dangling_mass = 0.0
        for v in range(n):
            if out[v]:
                share = x[v] / len(out[v])
                for t in out[v]:
                    nxt[t] += share
            else:
                dangling_mass += x[v]
        base = (1.0 - d) / n + d * dangling_mass / n
        nxt = [base + d * w for w in nxt]
        delta = sum(abs(a - b) for a, b in zip(nxt, x))
        x = nxt
        if delta < tol:
            return x, iters, True
    return x, iters, False


def hits(out, tol=1e-8, cap=2000):
    """Kleinberg's hubs and authorities, run globally: a good authority is
    linked by good hubs, a good hub links good authorities. The principal
    eigenvector belongs to the densest corner of the graph, which is the
    tightly-knit-community effect this page measures."""
    n = len(out)
    inn = [[] for _ in range(n)]
    for v in range(n):
        for t in out[v]:
            inn[t].append(v)
    a = [1.0] * n
    h = [1.0] * n
    iters = 0
    while iters < cap:
        iters += 1
        na = [sum(h[u] for u in inn[v]) for v in range(n)]
        norm = sum(w * w for w in na) ** 0.5 or 1.0
        na = [w / norm for w in na]
        nh = [sum(na[t] for t in out[v]) for v in range(n)]
        norm = sum(w * w for w in nh) ** 0.5 or 1.0
        nh = [w / norm for w in nh]
        delta = sum(abs(p - q) for p, q in zip(na, a)) + sum(
            abs(p - q) for p, q in zip(nh, h)
        )
        a, h = na, nh
        if delta < tol:
            break
    s = sum(a) or 1.0
    return [w / s for w in a], iters


def salsa(out, tol=1e-8, cap=2000):
    """Lempel and Moran's stochastic HITS: authorities score by a walk that
    steps backward along one in-link then forward along that hub's random
    out-link. Normalizing each step is what defuses the dense-clique
    capture."""
    n = len(out)
    inn = [[] for _ in range(n)]
    for v in range(n):
        for t in out[v]:
            inn[t].append(v)
    has = [v for v in range(n) if inn[v]]
    a = [1.0 / len(has) if inn[v] else 0.0 for v in range(n)]
    iters = 0
    while iters < cap:
        iters += 1
        hub = [0.0] * n
        for v in range(n):
            if a[v] > 0 and inn[v]:
                share = a[v] / len(inn[v])
                for u in inn[v]:
                    hub[u] += share
        na = [0.0] * n
        for u in range(n):
            if hub[u] > 0 and out[u]:
                share = hub[u] / len(out[u])
                for t in out[u]:
                    na[t] += share
        delta = sum(abs(p - q) for p, q in zip(na, a))
        a = na
        if delta < tol:
            break
    s = sum(a) or 1.0
    return [w / s for w in a], iters


def in_degree(out):
    n = len(out)
    deg = [0] * n
    for v in range(n):
        for t in out[v]:
            deg[t] += 1
    s = sum(deg) or 1
    return [d / s for d in deg]


def top_k(scores, k=20):
    return sorted(range(len(scores)), key=lambda v: -scores[v])[:k]


def mass_on(scores, nodes):
    return sum(scores[v] for v in nodes)


if __name__ == "__main__":
    # Oracle 1: exactness on a solvable instance. Solve the 4-node PageRank
    # linear system by Gaussian elimination and match power iteration.
    out_small = [[1, 2], [2], [0], [0, 1, 2]]  # node 3 links in, others cycle
    n4, d = 4, 0.85
    A = [[(1.0 if i == j else 0.0) for j in range(n4)] + [(1 - d) / n4] for i in range(n4)]
    for j in range(n4):
        for t in out_small[j]:
            A[t][j] -= d / len(out_small[j])
    for col in range(n4):  # plain elimination
        piv = max(range(col, n4), key=lambda r: abs(A[r][col]))
        A[col], A[piv] = A[piv], A[col]
        for r in range(n4):
            if r != col and A[col][col] != 0:
                f = A[r][col] / A[col][col]
                A[r] = [a - f * b for a, b in zip(A[r], A[col])]
    exact = [A[i][n4] / A[i][i] for i in range(n4)]
    power, _, ok = pagerank(out_small, d=d, tol=1e-14)
    assert ok and max(abs(p - e) for p, e in zip(power, exact)) < 1e-10, (power, exact)

    # Oracle 2: symmetry. On a directed 10-cycle every page must score
    # exactly one tenth.
    ring = [[(i + 1) % 10] for i in range(10)]
    pr_ring, _, _ = pagerank(ring, tol=1e-13)
    assert max(abs(p - 0.1) for p in pr_ring) < 1e-9

    # Oracle 3: the vector is a probability distribution and a fixed point.
    out, clique, trap = make_web()
    pr, iters_085, converged = pagerank(out)
    assert converged
    assert abs(sum(pr) - 1.0) < 1e-9, "mass leaked"
    pr2, _, _ = pagerank(out, tol=1e-15, cap=1)  # one more application
    # (re-applying from pr requires a fresh run; verify via delta instead)
    again, one_iter, _ = pagerank(out, tol=0, cap=iters_085 + 1)
    assert sum(abs(a - b) for a, b in zip(pr, again)) < 1e-6

    # Oracle 4: convergence is priced by d, and the price is monotone.
    _, it_50, _ = pagerank(out, d=0.50)
    _, it_95, _ = pagerank(out, d=0.95)
    assert it_50 < iters_085 < it_95, (it_50, iters_085, it_95)

    # Oracle 5: the trap. Undamped, the walk drains into the ten-node loop;
    # damped, the teleport keeps it a minor neighborhood.
    # Note the honest wrinkle: the standard dangling-page patch (spread a
    # dead end's mass uniformly) acts as a faint built-in teleport, so the
    # undamped trap keeps ~three quarters rather than everything. Ten pages
    # hoarding 76% of all rank is a ~150x distortion of their fair share.
    pr_raw, iters_raw, raw_converged = pagerank(out, d=1.0, cap=500)
    trap_raw = mass_on(pr_raw, trap)
    trap_damped = mass_on(pr, trap)
    assert trap_raw > 0.5, f"undamped trap mass {trap_raw:.3f}"
    assert trap_raw > 100 * (len(trap) / len(out)), "trap must hoard far past its share"
    assert trap_damped < 0.05, f"damped trap mass {trap_damped:.3f}"

    # Oracle 6: the tightly-knit-community effect. HITS hands its top-20
    # authorities to the planted clique; PageRank and SALSA do not.
    hits_a, iters_hits = hits(out)
    salsa_a, iters_salsa = salsa(out)
    deg = in_degree(out)
    cs = set(clique)
    hits_capture = sum(1 for v in top_k(hits_a) if v in cs) / 20
    pr_capture = sum(1 for v in top_k(pr) if v in cs) / 20
    salsa_capture = sum(1 for v in top_k(salsa_a) if v in cs) / 20
    assert hits_capture >= 0.9, f"HITS should be captured: {hits_capture}"
    assert pr_capture <= 0.3, f"PageRank should resist: {pr_capture}"
    assert salsa_capture <= 0.5, f"SALSA should resist: {salsa_capture}"

    # Oracle 7: the farm, measured honestly. A hundred sock-puppet pages
    # pointing at one obscure target crown it the in-degree champion for
    # free. PageRank does NOT shrug: each sock contributes its teleport
    # floor, so the farm buys a real boost, but a diluted one: the target
    # climbs to somewhere in the top ten, not to the crown, and the price
    # was one hundred whole pages. Dilution, not immunity: closing the rest
    # is what trust-seeded teleports (TrustRank) exist for.
    target = 1500
    pr_before_rank = sorted(range(len(pr)), key=lambda v: -pr[v]).index(target) + 1
    out_farm = [list(l) for l in out] + [[] for _ in range(100)]
    for i in range(100):
        out_farm[len(out) + i] = [target]
    deg_farm = in_degree(out_farm)
    pr_farm, _, _ = pagerank(out_farm)
    deg_rank = sorted(range(len(deg_farm)), key=lambda v: -deg_farm[v]).index(target) + 1
    pr_rank = sorted(range(len(pr_farm)), key=lambda v: -pr_farm[v]).index(target) + 1
    assert deg_rank == 1, f"in-degree should crown the farm target, rank {deg_rank}"
    assert pr_rank > 3, f"PageRank should deny the crown: rank {pr_rank}"
    assert pr_rank < pr_before_rank, "the farm does buy a real (diluted) boost"

    print(
        f"contest on a {len(out):,}-page web (planted: 30-page clique with exits, "
        f"10-page spider trap, 50 dead ends):"
    )
    print(f"  {'method':<26} {'iterations':>10} {'trap mass':>10} {'clique capture (top 20)':>24}")
    raw_iters_txt = str(iters_raw) if raw_converged else f">{iters_raw}"
    raw_capture = sum(1 for v in top_k(pr_raw) if v in cs) / 20
    rows = [
        ("PageRank, d = 0.85", str(iters_085), f"{trap_damped:.1%}", f"{pr_capture:.0%}"),
        ("Random walk, d = 1.0", raw_iters_txt, f"{trap_raw:.1%}", f"{raw_capture:.0%}"),
        ("HITS (authorities)", str(iters_hits), f"{mass_on(hits_a, trap):.1%}", f"{hits_capture:.0%}"),
        ("SALSA (authorities)", str(iters_salsa), f"{mass_on(salsa_a, trap):.1%}", f"{salsa_capture:.0%}"),
        ("In-degree count", "1 pass", f"{mass_on(deg, trap):.1%}", f"{sum(1 for v in top_k(deg) if v in cs) / 20:.0%}"),
    ]
    for name, a, b, c in rows:
        print(f"  {name:<26} {a:>10} {b:>10} {c:>24}")
    print(
        f"farm experiment: 100 sock pages aim at one obscure target "
        f"(PageRank rank {pr_before_rank} before): in-degree rank {deg_rank}, "
        f"PageRank rank {pr_rank} after"
    )
    print("OK: matches the exact linear solve, symmetry, fixed point, damping price, trap, TKC capture, and the farm")
