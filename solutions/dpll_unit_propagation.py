# Puzzle 84: DPLL x unit propagation
# Boolean satisfiability by backtracking search, with the 1962
# insight that turned enumeration into deduction: whenever a clause
# has exactly one literal left alive, that literal is FORCED, and
# forcing it can force others: a cascade of free inferences between
# every guessed decision.
#
# The pairing is the point. The algorithm is DPLL
# (Davis-Logemann-Loveland 1962): assign a variable, simplify,
# recurse, backtrack on conflict: complete, so it proves UNSAT as
# readily as SAT. The heuristic is unit propagation: after every
# decision, chase the chain of clauses reduced to a single live
# literal and assign them all before guessing again. The experiment
# is controlled: both arms branch identically, one arm propagates
# and the other only guesses, so the measured gap belongs to
# propagation alone. The referee is exhaustion: every one of the
# 2^n assignments on 250 small instances, verdicts matched exactly,
# every SAT model re-checked clause by clause. The famous phase
# transition is measured, not recited: SAT probability collapsing
# through the ~4.26 clauses-per-variable threshold while difficulty
# spikes exactly there: the easy-hard-easy pattern. Clients: the
# pigeonhole formula (DPLL's nemesis, exponential nodes, honestly
# shown) and a 3-coloring of the Petersen graph decoded from the
# model and verified edge by edge.
import random


def unit_propagate(clauses, assign, trail, stats=None):
    """Repeatedly assign the sole live literal of any unit clause.
    Returns False on conflict (a clause with every literal false).
    Audit invariant: a literal is forced only when every other
    literal in its clause is false under the current assignment."""
    changed = True
    while changed:
        changed = False
        for cl in clauses:
            live = None
            n_live = 0
            sat = False
            for lit in cl:
                v = assign.get(abs(lit))
                if v is None:
                    live = lit
                    n_live += 1
                    if n_live > 1:
                        break
                elif (lit > 0) == v:
                    sat = True
                    break
            if sat or n_live > 1:
                continue
            if n_live == 0:
                return False  # conflict: all literals false
            # audit: every OTHER literal in cl is assigned false
            assert all(
                (assign.get(abs(l2)) is not None and ((l2 > 0) != assign[abs(l2)]))
                for l2 in cl if l2 != live
            )
            assign[abs(live)] = live > 0
            trail.append(abs(live))
            if stats is not None:
                stats["props"] += 1
            changed = True
    return True


def pick_branch(clauses, assign):
    """Branch on the most frequent literal among the shortest live
    clauses (MOMS-lite). Identical in both experiment arms, so the
    ablation isolates propagation."""
    best_len = None
    counts = {}
    for cl in clauses:
        live = []
        sat = False
        for lit in cl:
            v = assign.get(abs(lit))
            if v is None:
                live.append(lit)
            elif (lit > 0) == v:
                sat = True
                break
        if sat or not live:
            continue
        if best_len is None or len(live) < best_len:
            best_len = len(live)
            counts = {}
        if len(live) == best_len:
            for lit in live:
                counts[lit] = counts.get(lit, 0) + 1
    if not counts:
        return None
    return max(counts, key=lambda l: (counts[l], -abs(l)))


def all_satisfied(clauses, assign):
    for cl in clauses:
        if not any(assign.get(abs(l)) is not None and ((l > 0) == assign[abs(l)]) for l in cl):
            return False
    return True


def dpll(clauses, assign, stats, use_up=True):
    if use_up:
        trail = []
        if not unit_propagate(clauses, assign, trail, stats):
            for v in trail:
                del assign[v]
            return None
    else:
        trail = []
        # No propagation: only detect outright conflict.
        for cl in clauses:
            if all(assign.get(abs(l)) is not None and ((l > 0) != assign[abs(l)]) for l in cl):
                return None
    if all_satisfied(clauses, assign):
        return dict(assign)
    lit = pick_branch(clauses, assign)
    if lit is None:
        # No live clause but not all satisfied: cannot happen when
        # all_satisfied is false; guard anyway.
        for v in trail:
            del assign[v]
        return None
    for value in ((lit > 0), (lit <= 0)):
        var = abs(lit)
        if assign.get(var) is not None:
            break
        stats["decisions"] += 1
        assign[var] = value
        res = dpll(clauses, assign, stats, use_up)
        if res is not None:
            return res
        del assign[var]
    for v in trail:
        del assign[v]
    return None


def solve(clauses, use_up=True):
    stats = {"decisions": 0, "props": 0}
    model = dpll(clauses, {}, stats, use_up)
    return model, stats


def brute_sat(clauses, n):
    for mask in range(1 << n):
        assign = {v: bool(mask >> (v - 1) & 1) for v in range(1, n + 1)}
        if all_satisfied(clauses, assign):
            return assign
    return None


def check_model(clauses, model):
    """A model may be partial: DPLL stops once every clause is
    satisfied, leaving don't-care variables unassigned. Each clause
    must contain a literal made true by an ASSIGNED variable."""
    assert all(
        any(model.get(abs(l)) is not None and (l > 0) == model[abs(l)] for l in cl)
        for cl in clauses
    )


def random_3sat(n, m, rng):
    cls = []
    for _ in range(m):
        vs = rng.sample(range(1, n + 1), 3)
        cls.append([v if rng.random() < 0.5 else -v for v in vs])
    return cls


def pigeonhole(pigeons, holes):
    """PHP(p, h): p pigeons into h holes, one hole each: UNSAT when
    p > h, and famously exponential for DPLL. Var x_{i,j} = pigeon i
    in hole j."""
    def x(i, j):
        return i * holes + j + 1
    cls = [[x(i, j) for j in range(holes)] for i in range(pigeons)]
    for j in range(holes):
        for i1 in range(pigeons):
            for i2 in range(i1 + 1, pigeons):
                cls.append([-x(i1, j), -x(i2, j)])
    return cls


PETERSEN = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 0),
    (5, 7), (7, 9), (9, 6), (6, 8), (8, 5),
    (0, 5), (1, 6), (2, 7), (3, 8), (4, 9),
]


def coloring_cnf(edges, n_vertices, k):
    """Vertex v gets color c => var v*k+c+1. Each vertex some color,
    no vertex two colors, no edge same color."""
    def x(v, c):
        return v * k + c + 1
    cls = [[x(v, c) for c in range(k)] for v in range(n_vertices)]
    for v in range(n_vertices):
        for c1 in range(k):
            for c2 in range(c1 + 1, k):
                cls.append([-x(v, c1), -x(v, c2)])
    for (u, v) in edges:
        for c in range(k):
            cls.append([-x(u, c), -x(v, c)])
    return cls


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the exhaustion referee. 250 instances, n <= 13:
    # verdicts equal to brute force over all 2^n assignments, every
    # SAT model re-checked against every clause.
    agree_sat = agree_unsat = 0
    for _ in range(250):
        n = rng.randint(4, 13)
        m = int(n * (2.0 + rng.random() * 4.0))
        cls = random_3sat(n, m, rng)
        model, _ = solve(cls)
        brute = brute_sat(cls, n)
        assert (model is None) == (brute is None), (n, m, cls)
        if model is not None:
            check_model(cls, model)
            agree_sat += 1
        else:
            agree_unsat += 1

    # Oracle 2: THE CONTROLLED ABLATION. Same instances, same
    # branching rule: one arm propagates units, the other only
    # guesses. The measured gap belongs to unit propagation alone.
    up_nodes = bare_nodes = 0
    verdict_agree = 0
    for _ in range(30):
        cls = random_3sat(18, 76, rng)  # ratio 4.22, near threshold
        m1, s1 = solve(cls, use_up=True)
        m2, s2 = solve(cls, use_up=False)
        assert (m1 is None) == (m2 is None)
        if m1 is not None:
            check_model(cls, m1)
            check_model(cls, m2)
        verdict_agree += 1
        up_nodes += s1["decisions"]
        bare_nodes += s2["decisions"]
    ablation = bare_nodes / max(1, up_nodes)
    assert ablation > 3, ablation  # measured 7x

    # Oracle 3: THE PHASE TRANSITION, measured. SAT probability
    # collapses through ~4.26 clauses per variable; mean decisions
    # spike at the threshold: easy-hard-easy.
    ratios = [2.0, 3.0, 3.8, 4.26, 5.0, 6.0]
    sat_frac = []
    difficulty = []
    N_PT = 90
    per = 45
    for r in ratios:
        s_count = 0
        dec = 0
        for _ in range(per):
            cls = random_3sat(N_PT, int(N_PT * r), rng)
            model, st = solve(cls)
            if model is not None:
                s_count += 1
                check_model(cls, model)
            dec += st["decisions"]
        sat_frac.append(s_count / per)
        difficulty.append(dec / per)
    assert sat_frac[0] > 0.97, sat_frac
    assert sat_frac[-1] < 0.03, sat_frac
    assert all(sat_frac[i] >= sat_frac[i + 1] - 0.06 for i in range(len(ratios) - 1)), sat_frac
    peak = difficulty.index(max(difficulty))
    assert ratios[peak] in (3.8, 4.26, 5.0), (ratios[peak], difficulty)
    assert max(difficulty) > 3 * max(difficulty[0], difficulty[-1]), difficulty

    # Oracle 4: the nemesis. PHP(6,5) is UNSAT (6 pigeons, 5 holes)
    # and DPLL must grind: the node count is the honest price of
    # proof by search without clause learning.
    php = pigeonhole(6, 5)
    php_model, php_stats = solve(php)
    assert php_model is None
    assert php_stats["decisions"] > 200, php_stats  # measured 748: proof by search is expensive here
    php_small = pigeonhole(5, 5)  # satisfiable control
    m_ok, _ = solve(php_small)
    assert m_ok is not None
    check_model(php_small, m_ok)

    # Oracle 5: the client. 3-color the Petersen graph via CNF; the
    # model decodes to a coloring verified edge by edge; 2 colors is
    # UNSAT (odd cycles).
    cnf3 = coloring_cnf(PETERSEN, 10, 3)
    model3, st3 = solve(cnf3)
    assert model3 is not None
    colors = {}
    for v in range(10):
        cs = [c for c in range(3) if model3.get(v * 3 + c + 1)]
        assert len(cs) == 1
        colors[v] = cs[0]
    for (u, v) in PETERSEN:
        assert colors[u] != colors[v], (u, v)
    cnf2 = coloring_cnf(PETERSEN, 10, 2)
    model2, _ = solve(cnf2)
    assert model2 is None  # odd cycles forbid 2 colors

    print(f"contest: boolean satisfiability; referee: exhaustion over all 2^n assignments on 250 instances ({agree_sat} SAT, {agree_unsat} UNSAT, verdicts identical, every model re-checked)")
    print(f"  {'method':<26} {'decisions':>10}   nature")
    print(f"  {'Backtracking, no UP':<26} {bare_nodes:>10,}   same branching rule, guesses only")
    print(f"  {'DPLL with unit prop':<26} {up_nodes:>10,}   the cascade of forced literals: {ablation:.0f}x fewer nodes on 30 near-threshold instances")
    print(f"the phase transition, measured at n = {N_PT}, {per} instances per ratio:")
    for r, f, d in zip(ratios, sat_frac, difficulty):
        bar = '#' * int(d / max(difficulty) * 30)
        print(f"  m/n = {r:<5} SAT {f * 100:5.1f}%   mean decisions {d:8.1f}  {bar}")
    print(f"easy-hard-easy: difficulty peaks at m/n = {ratios[peak]} ({max(difficulty):.0f} decisions) while the SAT fraction falls {sat_frac[0] * 100:.0f}% -> {sat_frac[-1] * 100:.0f}%: hardness lives at the boundary between yes and no")
    print(f"the nemesis: pigeonhole PHP(6,5) proven UNSAT in {php_stats['decisions']:,} decisions ({php_stats['props']:,} propagations): search without clause learning pays exponentially: the gap CDCL was born to close")
    print(f"the client: Petersen graph 3-colored via CNF ({len(cnf3)} clauses), model decoded and verified on all 15 edges in {st3['decisions']} decisions; 2 colors proven impossible")
    print("OK: 250 verdicts equal to exhaustion, the controlled ablation isolating unit propagation, the phase transition and its difficulty spike measured, the pigeonhole price paid honestly, and a real coloring decoded from a model")
