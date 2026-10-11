"""BLAST x Seed-and-extend word matches (Altschul, Gish, Miller, Myers, Lipman
1990): hash every length-w word of the database, extend each exact hit along
its diagonal without gaps until the score drops X below its best, judge hits
by Karlin-Altschul statistics. Referee: Smith-Waterman (linear gaps) on every
sequence, plus the exact best ungapped segment of every pair and of the null.
Seeded; regenerates in about two seconds. Thresholds sit one point above the
best decoy for each method: zero false positives on the same 200 decoys.

AUTHOR CORRECTIONS (the measurement won): the draft claimed w = 11 complete to
15% divergence; one 10% copy shares no eleven-base word, so the page reports
sensitivity as measured and names the cause (every miss is an unfired seed).
The draft set thresholds by fitted E-values; the Smith-Waterman fit from 200
decoys extrapolated to 142 against a best decoy of 106, so both use the
empirical rule with the fitted E-value reported beside it. The first null
mixed decoys with fresh query pairs; it now fits on 500 fresh sequences against
this query and tests out of sample on the decoys.
"""
import math
import random
import time

M, X, G = 5, -4, -6
ALPH = 'ACGT'


def rand_seq(rng, n):
    return ''.join(rng.choice(ALPH) for _ in range(n))


def mutate(rng, s, d):
    out = []
    for c in s:
        r = rng.random()
        if r < d:
            out.append(rng.choice(ALPH.replace(c, '')))
        elif r < d + d / 8:  # indel
            if rng.random() < 0.5:
                out.append(c + rng.choice(ALPH))
        else:
            out.append(c)
    return ''.join(out)


def sw_score(a, b):
    """Smith-Waterman best local score with linear gaps; cells = len(a) * len(b)."""
    m = len(b)
    prev = [0] * (m + 1)
    best = 0
    for ca in a:
        cur = [0] * (m + 1)
        for j in range(1, m + 1):
            v = prev[j - 1] + (M if ca == b[j - 1] else X)
            t = prev[j] + G
            if t > v:
                v = t
            t = cur[j - 1] + G
            if t > v:
                v = t
            if v < 0:
                v = 0
            cur[j] = v
            if v > best:
                best = v
        prev = cur
    return best


def banded_sw(a, b, diag, band):
    """Smith-Waterman within |j - i - diag| <= band: (score, cells)."""
    n, m = len(a), len(b)
    best = cells = 0
    prev = {}
    for i in range(n):
        cur = {}
        for j in range(max(0, i + diag - band), min(m, i + diag + band + 1)):
            cells += 1
            v = prev.get(j - 1, 0) + (M if a[i] == b[j] else X)
            t = prev.get(j, 0) + G
            if t > v:
                v = t
            t = cur.get(j - 1, 0) + G
            if t > v:
                v = t
            cur[j] = v if v > 0 else 0
            if v > best:
                best = v
        prev = cur
    return best, cells


def best_ungapped(a, b):
    """Exact best ungapped segment score over every diagonal."""
    n, m = len(a), len(b)
    best = 0
    for d in range(1 - n, m):
        i = -d if d < 0 else 0
        j = i + d
        run = 0
        while i < n and j < m:
            run += M if a[i] == b[j] else X
            if run < 0:
                run = 0
            elif run > best:
                best = run
            i += 1
            j += 1
    return best


def ungapped_score(a, b, qs, qe, diag):
    return sum(M if a[i] == b[i + diag] else X for i in range(qs, qe))


def build_index(db, w):
    idx = {}
    for sid, s in enumerate(db):
        for p in range(len(s) - w + 1):
            idx.setdefault(s[p:p + w], []).append((sid, p))
    return idx


def extend(q, s, qp, sp, w, xdrop):
    """Ungapped X-drop extension of the word hit q[qp:qp+w] == s[sp:sp+w]."""
    diag = sp - qp
    score = best = w * M
    qe, i = qp + w, qp + w
    cells = 0
    while i < len(q) and i + diag < len(s):
        cells += 1
        score += M if q[i] == s[i + diag] else X
        i += 1
        if score > best:
            best, qe = score, i
        elif best - score > xdrop:
            break
    score = best
    qs, i = qp, qp - 1
    while i >= 0 and i + diag >= 0:
        cells += 1
        score += M if q[i] == s[i + diag] else X
        if score > best:
            best, qs = score, i
        elif best - score > xdrop:
            break
        i -= 1
    return best, qs, qe, diag, cells


def blast(q, db, w, xdrop=20, two_hit=False, window=40):
    idx = build_index(db, w)
    best, seen, last = {}, {}, {}
    hits = ext = cells = 0
    for qp in range(len(q) - w + 1):
        for sid, sp in idx.get(q[qp:qp + w], ()):
            hits += 1
            key = (sid, sp - qp)
            cov = seen.get(key)
            if cov and cov[0] <= qp < cov[1]:
                continue
            if two_hit:
                prev = last.get(key)
                last[key] = qp
                if prev is None or qp - prev < w or qp - prev > window:
                    continue
            sc, qs, qe, diag, c = extend(q, db[sid], qp, sp, w, xdrop)
            ext += 1
            cells += c
            seen[key] = (qs, qe)
            if sc > best.get(sid, (0,))[0]:
                best[sid] = (sc, qs, qe, diag)
    return best, hits, ext, cells


def gumbel_fit(scores):
    n = len(scores)
    mean = sum(scores) / n
    sd = math.sqrt(sum((s - mean) ** 2 for s in scores) / (n - 1))
    beta = sd * math.sqrt(6) / math.pi
    mu = mean - 0.5772156649 * beta
    return 1 / beta, mu  # lambda, location


def karlin_lambda():
    lo, hi = 1e-6, 2.0
    for _ in range(100):
        mid = (lo + hi) / 2
        f = 0.25 * math.exp(M * mid) + 0.75 * math.exp(X * mid) - 1
        lo, hi = (mid, hi) if f < 0 else (lo, mid)
    return (lo + hi) / 2


if __name__ == '__main__':
    t0 = time.time()
    rng = random.Random(20261010)
    Q, L, DIVS, PER, DECOYS = 80, 160, [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40], 16, 200
    XD = 40  # ungapped X-drop in raw score units, about eleven bits here
    q = rand_seq(rng, Q)
    db, truth = [], {}
    for d in DIVS:
        for _ in range(PER):
            core = mutate(rng, q, d)
            pre = rand_seq(rng, (L - len(core)) // 2)
            truth[len(db)] = d
            db.append(pre + core + rand_seq(rng, L - len(pre) - len(core)))
    for _ in range(DECOYS):
        db.append(rand_seq(rng, L))
    N, H = len(db), len(truth)

    # referee: Smith-Waterman on every sequence; one currency: cells
    sw = [sw_score(q, s) for s in db]
    sw_cells = Q * L * N
    lam_sw, mu_sw = gumbel_fit(sw[H:])
    T_sw = max(sw[H:]) + 1  # zero false positives on the decoys, same rule for every method
    # exact ungapped null for this query: fit on 500 fresh random sequences, test on the 200 decoys
    null = [best_ungapped(q, rand_seq(rng, L)) for _ in range(500)]
    decoy_null = [best_ungapped(q, db[i]) for i in range(H, N)]
    lam_fit, mu = gumbel_fit(null)
    lam_ka = karlin_lambda()
    K = math.exp(lam_fit * mu) / (Q * L)
    T = max(decoy_null) + 1
    E_T = N * (1 - math.exp(-K * Q * L * math.exp(-lam_fit * T)))
    T2 = next(t for t in range(1, 400) if DECOYS * (1 - math.exp(-K * Q * L * math.exp(-lam_fit * t))) < 10)
    pred2 = DECOYS * (1 - math.exp(-K * Q * L * math.exp(-lam_fit * T2)))
    obs2 = sum(1 for s in decoy_null if s >= T2)
    fp = sum(1 for s in decoy_null if s >= T)
    fp_sw = sum(1 for s in sw[H:] if s >= T_sw)

    KEYS = [(4, False), (7, False), (7, True), (11, False), (11, True), (15, False)]
    runs = {k: blast(q, db, k[0], XD, two_hit=k[1]) for k in KEYS}
    exact_eq = exact_n = 0
    for k, (best, hits, ext, cells) in runs.items():
        for sid, (sc, qs, qe, diag) in best.items():
            assert ungapped_score(q, db[sid], qs, qe, diag) == sc, 'HSP score recount'
            assert sc <= sw[sid], 'an ungapped alignment is a feasible gapped one'
            bu = best_ungapped(q, db[sid])
            assert sc <= bu, 'HSP never beats the exact ungapped maximum'
            if k == (11, False) and sc >= T:
                exact_n += 1
                exact_eq += sc == bu
    # gapped BLAST stage: banded Smith-Waterman around the best seed of each candidate
    b11 = runs[(11, False)][0]
    cand = [i for i in b11 if b11[i][0] >= T // 2]
    gap_score, gcells, equal_full = {}, 0, 0
    for i in cand:
        sc, c = banded_sw(q, db[i], b11[i][3], 8)
        assert sc <= sw[i], 'a banded alignment is a feasible full one'
        gap_score[i], gcells = sc, gcells + c
        equal_full += sc == sw[i]
    found = {k: (lambda i, b=runs[k][0]: b.get(i, (0,))[0] >= T) for k in KEYS}
    found['sw'] = lambda i: sw[i] >= T_sw
    found['gap'] = lambda i: gap_score.get(i, 0) >= T_sw
    tot = {k: sum(1 for i in truth if f(i)) for k, f in found.items()}
    fp_gap = sum(1 for i in cand if i >= H and gap_score[i] >= T_sw)

    print(f'query {Q} bases against {N} sequences of {L} ({DECOYS} decoys, {H} homologs, {PER} per divergence); scores {M}/{X}, gap {G}, X-drop {XD}')
    print(f'Karlin-Altschul lambda {lam_ka:.3f}; Gumbel fit on {len(null)} fresh ungapped null scores: lambda {lam_fit:.3f}, K {K:.4f}; SW null fit lambda {lam_sw:.3f}')
    print(f'thresholds one above the best decoy: ungapped T = {T} (fitted E-value {E_T:.3f} per search, {fp} decoys reach it), gapped T = {T_sw} ({fp_sw} decoys); at T2 = {T2}: predicted {pred2:.1f} decoys, observed {obs2}')
    print('divergence   SW   w=7  w=11  w=15  gapped(11)')
    rows = {}
    for d in DIVS:
        ids = [i for i, dd in truth.items() if dd == d]
        rows[d] = [sum(1 for i in ids if found[k](i)) / len(ids) for k in ['sw', (7, False), (11, False), (15, False), 'gap']]
        print(f'  {d:.2f}      ' + '  '.join(f'{x:4.2f}' for x in rows[d]))
    print('word two-hit     hits  extensions      cells  found  speedup over SW cells')
    for k, (best, hits, ext, cells) in runs.items():
        print(f'  {k[0]:2d}  {str(k[1]):5s}  {hits:7,d}  {ext:10,d}  {cells:9,d}  {tot[k]:3d}/{H}  {sw_cells / cells:8.1f}x')
    print(f'gapped stage: {len(cand)} candidates, banded SW {gcells:,} cells, {equal_full} equal the full SW score, found {tot["gap"]}/{H}, {fp_gap} decoys; full SW {sw_cells:,} cells, found {tot["sw"]}/{H}')
    print(f'HSPs above T at w = 11: {exact_eq} of {exact_n} equal the exact best ungapped segment')
    top_b, top_s = max(b11, key=lambda i: b11[i][0]), max(range(N), key=lambda i: sw[i])
    # why w = 11 misses what the referee finds: no shared word, a weak exact segment, or a short extension
    def longest_run(a, b):
        best = 0
        for d in range(1 - len(a), len(b)):
            i, j, run = (-d if d < 0 else 0), (0 if d < 0 else d), 0
            while i < len(a) and j < len(b):
                run = run + 1 if a[i] == b[j] else 0
                best = max(best, run)
                i, j = i + 1, j + 1
        return best
    missed = [i for i in truth if found['sw'](i) and not found[(11, False)](i)]
    no_seed = sum(1 for i in missed if longest_run(q, db[i]) < 11)
    weak = sum(1 for i in missed if longest_run(q, db[i]) >= 11 and best_ungapped(q, db[i]) < T)
    short = len(missed) - no_seed - weak
    print(f'w = 11 misses {len(missed)} homologs the referee finds: {no_seed} share no eleven-base word with the query, {weak} have a seed but no ungapped segment reaching T, {short} had the segment but the extension fell short')
    high = [i for i in truth if truth[i] >= 0.30 and found['sw'](i)]
    miss15 = [i for i in high if not found[(15, False)](i)]
    r4, r11 = runs[(4, False)], runs[(11, False)]
    print(f'top hit: BLAST {top_b} (divergence {truth.get(top_b)}), SW {top_s}; w = 15 misses {len(miss15)} of {len(high)} at 30%+ that SW finds; w = 4: {r4[1]:,} hits, {r4[3]:,} cells against {r11[1]:,} and {r11[3]:,} at w = 11')
    el = time.time() - t0

    assert all(rows[d][0] == 1.0 for d in DIVS[:5]), 'SW finds every homolog to 25%'
    assert rows[DIVS[0]][2] == 1.0 and rows[DIVS[0]][4] == 1.0, 'w = 11 complete at 5%'
    assert no_seed + weak + short == len(missed) and short <= len(missed) // 4, 'misses are mostly the seed or the indels, not the extension'
    assert all(rows[d][0] >= rows[d][2] for d in DIVS), 'SW at least as sensitive at every divergence'
    assert tot[(7, False)] >= tot[(11, False)] >= tot[(15, False)], 'sensitivity falls with word size'
    assert tot['sw'] >= tot['gap'] >= tot[(11, False)], 'gapped stage between ungapped and the referee'
    assert runs[(11, True)][2] < r11[2] and runs[(7, True)][2] < runs[(7, False)][2], 'two-hit extends less'
    assert r4[1] > 10 * r11[1] and r4[3] > 5 * r11[3], 'small words explode'
    assert sw_cells / r11[3] > 100 and sw_cells / (r11[3] + gcells) > 20, 'seed and extend beats the full matrix'
    assert abs(lam_fit - lam_ka) / lam_ka < 0.30, 'fitted lambda near Karlin-Altschul'
    assert abs(pred2 - obs2) <= max(3, 2.5 * math.sqrt(pred2)), 'E-value prediction within statistical error'
    assert fp == 0 and fp_sw == 0 and fp_gap == 0 and E_T < 3 and top_b == top_s and equal_full >= 0.9 * len(cand), 'no false positives, same top hit, band equals full'
    assert len(miss15) >= len(high) // 2, 'the long word misses what the referee finds'
    print(f'OK: w = 11 found {tot[(11, False)]} of {H} planted homologs ungapped and {tot["gap"]} with the banded gapped stage (SW {tot["sw"]}) in {r11[3]:,} + {gcells:,} cells against {sw_cells:,} ({sw_cells / (r11[3] + gcells):.0f}x), {fp} decoys above T = {T}; every HSP recounts and never exceeds SW; lambda {lam_fit:.3f} against Karlin-Altschul {lam_ka:.3f}, {obs2} decoys at T2 against {pred2:.1f} predicted; two-hit {runs[(11, True)][2]} extensions against {r11[2]}; w = 15 misses {len(miss15)} of {len(high)} divergent homologs, w = 4 fires {r4[1]:,} hits; {el:.1f} s')
