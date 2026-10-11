"""Fruchterman-Reingold x Force-directed placement (puzzle 198).

Pairs repel (k^2 / d), edges attract (d^2 / k), k = sqrt(area / n), and a
displacement cap cools linearly. Referees: crossings, edge-length CV, a
scale-free stress against graph distance, cycle convexity, grid corner
angles, the FR energy, Kamada-Kawai and spectral layout from their papers,
the grid-cell variant against exact repulsion, bitwise determinism, and the
known rectilinear crossing numbers of K6 and K8.
AUTHOR CORRECTIONS: the draft clamped positions to the unit square (the
paper's frame) and the 12-cycle came out convex once in ten at CV 0.2, its
natural polygon being larger than the frame; the free plane gives ten of ten
at CV 0.005. The draft said FR beats the circular layout on every graph; on
the 40-cycle the circle is optimal. The draft expected final moves under 1%
of the opening ones; they are cap-bound near 3%.
"""
import math
import random
import time
from collections import deque

# graphs
def grid(a, b):
    v = lambda i, j: i * b + j
    return a * b, [(v(i, j), v(i, j + 1)) for i in range(a) for j in range(b - 1)] + \
        [(v(i, j), v(i + 1, j)) for i in range(a - 1) for j in range(b)]

def cycle(n):
    return n, [(i, (i + 1) % n) for i in range(n)]

def path(n):
    return n, [(i, i + 1) for i in range(n - 1)]

def rand_tree(n, rng):
    return n, [(rng.randrange(i), i) for i in range(1, n)]

def small_world(n, chords, rng):
    es = set((i, (i + 1) % n) for i in range(n))
    while len(es) < n + chords:
        a, b = rng.sample(range(n), 2)
        if (a, b) not in es and (b, a) not in es:
            es.add((a, b))
    return n, sorted(es)

def complete(n):
    return n, [(i, j) for i in range(n) for j in range(i + 1, n)]

def bfs_dist(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b); adj[b].append(a)
    D = []
    for s in range(n):
        d = [-1] * n; d[s] = 0; q = deque([s])
        while q:
            u = q.popleft()
            for w in adj[u]:
                if d[w] < 0:
                    d[w] = d[u] + 1; q.append(w)
        D.append(d)
    return adj, D

# layouts
def random_layout(n, rng):
    return [[rng.random(), rng.random()] for _ in range(n)]

def circular_layout(n):
    return [[0.5 + 0.45 * math.cos(2 * math.pi * i / n), 0.5 + 0.45 * math.sin(2 * math.pi * i / n)] for i in range(n)]

def repulse(pos, k, rng, grid_cells):
    """k^2/d over all pairs, or only within neighboring cells of side 2k."""
    n = len(pos)
    disp = [[0.0, 0.0] for _ in range(n)]
    pairs = 0
    if grid_cells:
        side = 2 * k
        cells = {}
        for i, (x, y) in enumerate(pos):
            cells.setdefault((math.floor(x / side), math.floor(y / side)), []).append(i)
        for (cx, cy), members in cells.items():
            for i in members:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        for j in cells.get((cx + dx, cy + dy), ()):
                            if j <= i:
                                continue
                            pairs += 1
                            ddx = pos[j][0] - pos[i][0]; ddy = pos[j][1] - pos[i][1]
                            d = math.hypot(ddx, ddy) or 1e-9
                            f = k * k / d / d
                            disp[j][0] += ddx * f; disp[j][1] += ddy * f
                            disp[i][0] -= ddx * f; disp[i][1] -= ddy * f
        return disp, pairs
    for i in range(n):
        xi, yi = pos[i]
        for j in range(i + 1, n):
            pairs += 1
            ddx = pos[j][0] - xi; ddy = pos[j][1] - yi
            d = math.hypot(ddx, ddy)
            if d < 1e-9:
                ddx, ddy, d = rng.random() * 1e-6, rng.random() * 1e-6, 1e-6
            f = k * k / d / d           # k^2/d along the unit vector
            disp[j][0] += ddx * f; disp[j][1] += ddy * f
            disp[i][0] -= ddx * f; disp[i][1] -= ddy * f
    return disp, pairs

def fruchterman_reingold(n, edges, pos, iters=200, t0=0.1, cool=True, grid_cells=False, seed=0):
    """The 1991 algorithm on the free plane; the unit square is the start."""
    rng = random.Random(seed)
    k = math.sqrt(1.0 / n)
    pos = [p[:] for p in pos]
    pairs = 0
    moves = []          # total displacement applied per iteration
    energy = []         # sum d^3/(3k) over edges - k^2 ln d over pairs
    for it in range(iters):
        t = t0 * (1 - it / iters) if cool else t0
        disp, np_ = repulse(pos, k, rng, grid_cells)
        pairs += np_
        for a, b in edges:
            ddx = pos[b][0] - pos[a][0]; ddy = pos[b][1] - pos[a][1]
            d = math.hypot(ddx, ddy) or 1e-9
            f = d / k                            # d^2/k along the unit vector
            disp[b][0] -= ddx * f; disp[b][1] -= ddy * f
            disp[a][0] += ddx * f; disp[a][1] += ddy * f
        moved = 0.0
        for i in range(n):
            dx, dy = disp[i]
            m = math.hypot(dx, dy)
            if m > 0:
                s = min(m, t) / m
                pos[i][0] += dx * s; pos[i][1] += dy * s
                moved += m * s
        moves.append(moved)
        if n <= 64:
            u = sum(math.dist(pos[a], pos[b]) ** 3 / (3 * k) for a, b in edges)
            u -= sum(k * k * math.log(max(math.dist(pos[i], pos[j]), 1e-9)) for i in range(n) for j in range(i + 1, n))
            energy.append(u)
    return pos, {"pairs": pairs, "moves": moves, "energy": energy, "k": k}

def kamada_kawai(n, D, pos, sweeps=60, L=None):
    """Kamada-Kawai 1989: springs L d_ij, stiffness 1/d_ij^2, Newton steps."""
    dmax = max(max(r) for r in D)
    L = L or 0.9 / dmax
    pos = [p[:] for p in pos]
    def energy():
        e = 0.0
        for i in range(n):
            for j in range(i + 1, n):
                dij = D[i][j]; l = L * dij
                e += 0.5 / dij ** 2 * (math.dist(pos[i], pos[j]) - l) ** 2
        return e
    e0 = energy(); steps = 0
    for _ in range(sweeps):
        for m in range(n):
            gx = gy = gxx = gyy = gxy = 0.0
            xm, ym = pos[m]
            for i in range(n):
                if i == m:
                    continue
                dij = D[m][i]; l = L * dij; kk = 1.0 / dij ** 2
                dx = xm - pos[i][0]; dy = ym - pos[i][1]
                r = math.hypot(dx, dy) or 1e-9; r3 = r ** 3
                gx += kk * (dx - l * dx / r); gy += kk * (dy - l * dy / r)
                gxx += kk * (1 - l * dy * dy / r3); gyy += kk * (1 - l * dx * dx / r3)
                gxy += kk * (l * dx * dy / r3)
            det = gxx * gyy - gxy * gxy
            if abs(det) < 1e-12:
                continue
            pos[m][0] -= (gyy * gx - gxy * gy) / det
            pos[m][1] -= (gxx * gy - gxy * gx) / det
            steps += 1
    return pos, {"e0": e0, "e1": energy(), "steps": steps}

def spectral_layout(n, adj, iters=4000):
    """Hall 1970: two Laplacian eigenvectors by deflated power iteration."""
    deg = [len(a) for a in adj]
    c = 2 * max(deg)
    def mult(v):
        return [c * v[i] - deg[i] * v[i] + sum(v[j] for j in adj[i]) for i in range(n)]
    def orth(v, basis):
        for b in basis:
            s = sum(x * y for x, y in zip(v, b))
            v = [x - s * y for x, y in zip(v, b)]
        return v
    def norm(v):
        s = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / s for x in v]
    basis = [norm([1.0] * n)]; vecs = []
    rng = random.Random(7)
    for _ in range(2):
        v = norm(orth([rng.random() - 0.5 for _ in range(n)], basis))
        for _ in range(iters):
            w = norm(orth(mult(v), basis))
            if sum(abs(a - b) for a, b in zip(w, v)) < 1e-10:
                v = w; break
            v = w
        vecs.append(v); basis.append(v)
    lo = [min(vecs[0]), min(vecs[1])]; hi = [max(vecs[0]), max(vecs[1])]
    return [[0.05 + 0.9 * (vecs[0][i] - lo[0]) / (hi[0] - lo[0] or 1), 0.05 + 0.9 * (vecs[1][i] - lo[1]) / (hi[1] - lo[1] or 1)] for i in range(n)]

# referees
def crossings(edges, pos):
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    c = 0
    for x in range(len(edges)):
        a, b = edges[x]
        for y in range(x + 1, len(edges)):
            cc, dd = edges[y]
            if len({a, b, cc, dd}) < 4:
                continue
            p, q, r, s = pos[a], pos[b], pos[cc], pos[dd]
            if orient(p, q, r) * orient(p, q, s) < 0 and orient(r, s, p) * orient(r, s, q) < 0:
                c += 1
    return c

def edge_cv(edges, pos):
    ls = [math.dist(pos[a], pos[b]) for a, b in edges]
    mu = sum(ls) / len(ls)
    return math.sqrt(sum((l - mu) ** 2 for l in ls) / len(ls)) / mu

def stress(D, pos):
    """1 - cos^2 between Euclidean and graph distances (0 is perfect)."""
    n = len(pos); se = sd = sed = 0.0
    for i in range(n):
        for j in range(i + 1, n):
            e = math.dist(pos[i], pos[j]); d = D[i][j]
            se += e * e; sd += d * d; sed += e * d
    return 1 - sed * sed / (se * sd)

def convex_cycle(n, pos):
    signs = set()
    for i in range(n):
        p, q, r = pos[i], pos[(i + 1) % n], pos[(i + 2) % n]
        signs.add((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]) > 0)
    return len(signs) == 1

def right_angles(adj, pos):
    """Mean |angle - 90| between consecutive edges at degree-4 vertices."""
    devs = []
    for v, nb in enumerate(adj):
        if len(nb) != 4:
            continue
        angs = sorted(math.atan2(pos[u][1] - pos[v][1], pos[u][0] - pos[v][0]) for u in nb)
        for i in range(4):
            devs.append(abs(math.degrees((angs[(i + 1) % 4] - angs[i]) % (2 * math.pi)) - 90))
    return sum(devs) / len(devs)

def fmt(x, nd=3):
    return f"{x:.{nd}f}"

if __name__ == "__main__":
    T0 = time.perf_counter()
    rng = random.Random(198)
    print("FR: k = sqrt(area/n), repulsion k^2/d, attraction d^2/k, cap t from 0.1 to 0 over 200 iterations\n")

    # 1. shapes with a known good drawing, ten random starts each
    print("shape recovery from ten random starts:")
    n, E = cycle(12); adj, D = bfs_dist(n, E)
    conv = 0; cvs = []
    for s in range(10):
        p, _ = fruchterman_reingold(n, E, random_layout(n, random.Random(s)), seed=s)
        conv += crossings(E, p) == 0 and convex_cycle(n, p); cvs.append(edge_cv(E, p))
    rnd_cross = sum(crossings(E, random_layout(n, random.Random(s))) for s in range(10)) / 10
    print(f"  C12: convex crossing-free polygon {conv} of 10, edge CV mean {fmt(sum(cvs)/10)} max {fmt(max(cvs))}; random layouts average {fmt(rnd_cross,1)} crossings")
    assert conv == 10 and max(cvs) < 0.05
    n, E = grid(5, 5); adj, D = bfs_dist(n, E)
    unf = 0; angs = []; cvg = []
    for s in range(10):
        p, _ = fruchterman_reingold(n, E, random_layout(n, random.Random(s)), seed=s)
        c = crossings(E, p); unf += c == 0
        if c == 0:
            angs.append(right_angles(adj, p)); cvg.append(edge_cv(E, p))
    print(f"  5x5 grid: unfolded (0 crossings) in {unf} of 10 starts; on those, corner error mean {fmt(sum(angs)/len(angs),1)} deg, edge-length CV mean {fmt(sum(cvg)/len(cvg))}")
    p, _ = fruchterman_reingold(n, E, circular_layout(n))
    print(f"  5x5 grid from the circular start: {crossings(E, p)} crossings left, a folded sheet")
    assert unf >= 1 and max(angs) < 15
    n, E = path(12); adj, D = bfs_dist(n, E)
    strs = []
    for s in range(10):
        p, _ = fruchterman_reingold(n, E, random_layout(n, random.Random(s)), seed=s)
        strs.append(math.dist(p[0], p[-1]) / sum(math.dist(p[a], p[b]) for a, b in E))
    print(f"  P12: end-to-end over path length mean {fmt(sum(strs)/10)} min {fmt(min(strs))} (1.000 is straight)")
    assert min(strs) > 0.5

    # 2. quality against rivals on four graphs
    print("\nlayout quality (crossings / edge-length CV / stress):")
    graphs = [("6x6 grid", grid(6, 6)), ("random tree n=40", rand_tree(40, rng)), ("ring n=40 + 6 chords", small_world(40, 6, rng)), ("cycle C40", cycle(40))]
    table = {}
    for name, (n, E) in graphs:
        adj, D = bfs_dist(n, E)
        r0 = random_layout(n, random.Random(1)); c0 = circular_layout(n)
        tf = time.perf_counter(); pf, sf = fruchterman_reingold(n, E, r0, seed=1); tf = time.perf_counter() - tf
        tk = time.perf_counter(); pk, sk = kamada_kawai(n, D, r0); tk = time.perf_counter() - tk
        ts = time.perf_counter(); ps = spectral_layout(n, adj); ts = time.perf_counter() - ts
        rows = [("random", r0, "-"), ("circular", c0, "-"), ("Fruchterman-Reingold", pf, f"{sf['pairs']:,} pair forces, {tf*1000:.0f} ms"),
                ("Kamada-Kawai", pk, f"{sk['steps']:,} Newton steps, {tk*1000:.0f} ms"), ("spectral", ps, f"{ts*1000:.0f} ms")]
        print(f"  {name} (n={n}, m={len(E)}):")
        res = {}
        for lab, p, work in rows:
            res[lab] = (crossings(E, p), edge_cv(E, p), stress(D, p))
            print(f"    {lab:22s} cross {res[lab][0]:4d}  CV {fmt(res[lab][1])}  stress {fmt(res[lab][2],4)}  {work}")
        table[name] = res
        assert res["Fruchterman-Reingold"][2] < res["random"][2] and res["Fruchterman-Reingold"][0] < res["random"][0]
        if name == "cycle C40":   # AUTHOR CORRECTION: the circle is optimal here and FR from a random start misses it
            assert res["circular"][2] < res["Fruchterman-Reingold"][2] and res["Fruchterman-Reingold"][0] >= 1
        else:
            assert res["Fruchterman-Reingold"][2] < res["circular"][2]
        assert res["Kamada-Kawai"][2] <= res["Fruchterman-Reingold"][2] and sk["e1"] < sk["e0"]
    g6 = table["6x6 grid"]

    # 3. cooling: displacement and energy settle
    n, E = grid(6, 6); adj, D = bfs_dist(n, E)
    r0 = random_layout(n, random.Random(1))
    pf, sf = fruchterman_reingold(n, E, r0, seed=1)
    pn, sn = fruchterman_reingold(n, E, r0, seed=1, cool=False)
    mv = sf["moves"]; mvn = sn["moves"]; en = sf["energy"]
    dec = sum(1 for a, b in zip(en, en[1:]) if b < a) / (len(en) - 1)
    print(f"\ncooling on the 6x6 grid: displacement per iteration first ten {fmt(sum(mv[:10])/10)} -> last ten {fmt(sum(mv[-10:])/10,5)};")
    print(f"  energy {fmt(en[0],2)} -> {fmt(en[-1],2)}, decreased on {dec*100:.0f}% of iterations; crossings {crossings(E, pf)}, stress {fmt(g6['Fruchterman-Reingold'][2],4)}")
    print(f"  NEGATIVE, no cooling (t fixed at 0.1): last-ten displacement {fmt(sum(mvn[-10:])/10)} (never settles), crossings {crossings(E, pn)}, stress {fmt(stress(D, pn),4)}, CV {fmt(edge_cv(E, pn))}")
    # AUTHOR CORRECTION: the final moves are cap-bound (about 3% of the opening moves, not under 1%)
    assert sum(mv[-10:]) < 0.05 * sum(mv[:10]) and en[-1] < en[0] and sum(mvn[-10:]) > 10 * sum(mv[-10:])
    assert stress(D, pn) > g6["Fruchterman-Reingold"][2]

    # 4. determinism and the start
    pf2, _ = fruchterman_reingold(n, E, r0, seed=1)
    assert pf2 == pf
    pc, _ = fruchterman_reingold(n, E, circular_layout(n), seed=1)
    print(f"determinism: the same seed reproduces every coordinate bitwise; the circular start gives stress {fmt(stress(D, pc),4)} and {crossings(E, pc)} crossings against {fmt(g6['Fruchterman-Reingold'][2],4)} and {g6['Fruchterman-Reingold'][0]} from the random start")

    # 5. the grid variant against exact repulsion at n = 144
    n, E = grid(12, 12); adj, D = bfs_dist(n, E)
    r0 = random_layout(n, random.Random(3))
    te = time.perf_counter(); pe, se = fruchterman_reingold(n, E, r0, seed=3); te = time.perf_counter() - te
    tg = time.perf_counter(); pg, sg = fruchterman_reingold(n, E, r0, seed=3, grid_cells=True); tg = time.perf_counter() - tg
    kk = math.sqrt(1.0 / n)
    de, _ = repulse(r0, kk, random.Random(0), False); dg, _ = repulse(r0, kk, random.Random(0), True)
    ferr = sum(math.dist(a, b) for a, b in zip(de, dg)) / sum(math.hypot(*a) for a in de)
    print(f"\ngrid variant at n = 144, 200 iterations: exact {se['pairs']:,} pair forces, {te*1000:.0f} ms, stress {fmt(stress(D, pe),4)}, {crossings(E, pe)} crossings; cells of side 2k {sg['pairs']:,} pair forces, {tg*1000:.0f} ms, stress {fmt(stress(D, pg),4)}, {crossings(E, pg)} crossings")
    print(f"  at the random start the bucketed repulsion differs from the exact sum by {ferr*100:.1f}% of its norm; {se['pairs']//200:,} pairs per iteration here, about 5e11 at a million vertices")
    assert sg["pairs"] < se["pairs"]

    # 6. dense graphs: the known rectilinear crossing numbers
    print("\nNEGATIVE, dense graphs (rectilinear crossing numbers K6 3, K8 19; convex position 15, 70):")
    for nk, known, convex in ((6, 3, 15), (8, 19, 70)):
        n, E = complete(nk)
        p, _ = fruchterman_reingold(n, E, random_layout(n, random.Random(2)), seed=2)
        c = crossings(E, p)
        print(f"  K{nk}: {c} crossings (minimum {known}, regular polygon {convex})")
        assert c >= known

    print(f"\n{time.perf_counter() - T0:.1f} s")
    print(f"OK: C12 convex and crossing-free on 10 of 10 starts (edge CV at most {fmt(max(cvs))}); 5x5 grid unfolded on {unf} of 10 with {fmt(sum(angs)/len(angs),1)} deg corner error; 6x6 grid stress {fmt(g6['Fruchterman-Reingold'][2],4)} with {g6['Fruchterman-Reingold'][0]} crossings (random {fmt(g6['random'][2],4)}, circular {fmt(g6['circular'][2],4)}, Kamada-Kawai {fmt(g6['Kamada-Kawai'][2],4)}, spectral {fmt(g6['spectral'][2],4)}); cooled displacement {fmt(sum(mv[:10])/10)} -> {fmt(sum(mv[-10:])/10,5)}, uncooled {fmt(sum(mvn[-10:])/10)}; grid cells {sg['pairs']:,} pair forces against {se['pairs']:,}; K8 {c} crossings against the minimum 19")
