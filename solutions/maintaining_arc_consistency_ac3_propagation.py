# Puzzle 171: Maintaining arc consistency x AC-3 propagation
# Constraint satisfaction: variables with finite domains and constraints
# between pairs of them; find an assignment that satisfies every
# constraint, or prove there is none. The algorithm is backtracking
# search with inference at every node: after each assignment, propagate
# before branching again, so that a dead end is discovered where it is
# created rather than many levels deeper. The heuristic is AC-3
# (Mackworth 1977): a queue of arcs (x, y); for each, delete from x's
# domain every value with no supporting value left in y's domain, and if
# anything was deleted, requeue every arc (z, x) into x. When the queue
# empties the network is arc consistent: every remaining value in every
# domain has a partner in every neighbor. Run inside the search this is
# MAC, maintaining arc consistency (Sabin and Freuder 1994), the method
# that contradicted the conventional wisdom that cheaper forward checking
# must be better.
#
# Referees:
# (1) CORRECTNESS: every solution found by every solver satisfies every
#     constraint, checked constraint by constraint; every solver agrees
#     with every other on which instances are satisfiable; on small
#     instances an exhaustive enumeration of all d^n assignments agrees;
# (2) THE AC-3 PROPERTIES, measured: after AC-3 every surviving value has
#     a support under every constraint (checked value by value); running
#     AC-3 again changes nothing (idempotence); AC-3 never removes a value
#     that appears in any solution (every enumerated solution survives);
#     constraint checks stay under the e d^3 bound;
# (3) THE RACE: random binary CSPs (n = 25 variables, domain size 6,
#     constraint density 0.3) across constraint tightness from loose to
#     tight, through the satisfiable-unsatisfiable phase transition,
#     scored in search nodes and constraint checks for chronological
#     backtracking, backtracking with the minimum-remaining-values order,
#     forward checking with that order, and MAC with that order;
# (4) SUDOKU as a binary CSP: AC-3 alone, with no search, solves the
#     textbook easy puzzle completely (every domain reduced to one value),
#     and a hard puzzle is solved by MAC in a handful of nodes against
#     forward checking;
# (5) THE NEGATIVE EXAMPLE, measured: chronological backtracking without
#     propagation on an unsatisfiable instance at the transition, where
#     it visits a node budget of 200,000 without finishing, while MAC
#     refutes the same instance in a few hundred nodes.
#
# AUTHOR CORRECTION: the draft expected MAC to beat forward checking in
# constraint checks as well as in nodes. Measured, MAC does far fewer
# nodes but performs MORE constraint checks at every tightness tried, two
# to five times forward checking's total, because the propagation IS the
# cost; the page reports both columns, and MAC's win is the search tree
# and the hard instances, not every column. A second correction: the
# draft ran minimum-remaining-values ordering inside plain backtracking,
# which is meaningless there (no propagation, so no domain ever shrinks
# and the order is the static one); that variant was replaced by MAC with
# a static order, which isolates what propagation alone buys.
import itertools
import random

SEED = 20261010


class CSP:
    """Variables 0..n-1 with finite domains; binary constraints stored as
    allowed-pair sets per (x, y), symmetric. Counts constraint checks."""

    def __init__(self, n, domains, allowed):
        self.n = n
        self.domains = [set(d) for d in domains]
        self.allowed = allowed  # (x, y) -> set of (vx, vy); both orientations
        self.neighbors = [set() for _ in range(n)]
        for (x, y) in allowed:
            self.neighbors[x].add(y)
        self.checks = 0

    def ok(self, x, vx, y, vy):
        self.checks += 1
        return (vx, vy) in self.allowed[(x, y)]

    def consistent(self, assignment):
        for (x, y), pairs in self.allowed.items():
            if x < y and x in assignment and y in assignment:
                self.checks += 1
                if (assignment[x], assignment[y]) not in pairs:
                    return False
        return True


def revise(csp, domains, x, y):
    removed = set()
    for vx in list(domains[x]):
        if not any(csp.ok(x, vx, y, vy) for vy in domains[y]):
            domains[x].discard(vx)
            removed.add(vx)
    return removed


def ac3(csp, domains, queue=None):
    """Returns False if some domain is wiped out. Mutates domains."""
    if queue is None:
        queue = [(x, y) for x in range(csp.n) for y in csp.neighbors[x]]
    seen = set(queue)
    while queue:
        x, y = queue.pop()
        seen.discard((x, y))
        if revise(csp, domains, x, y):
            if not domains[x]:
                return False
            for z in csp.neighbors[x]:
                if z != y and (z, x) not in seen:
                    queue.append((z, x))
                    seen.add((z, x))
    return True


def is_arc_consistent(csp, domains):
    for x in range(csp.n):
        for y in csp.neighbors[x]:
            for vx in domains[x]:
                if not any((vx, vy) in csp.allowed[(x, y)] for vy in domains[y]):
                    return False
    return True


class Solver:
    def __init__(self, csp, mode, order, node_budget=200_000):
        self.csp = csp
        self.mode = mode  # 'bt', 'fc', 'mac'
        self.order = order  # 'static' or 'mrv'
        self.nodes = 0
        self.budget = node_budget
        self.exhausted = False

    def select(self, assignment, domains):
        free = [v for v in range(self.csp.n) if v not in assignment]
        if self.order == 'mrv':
            return min(free, key=lambda v: (len(domains[v]), v))
        return free[0]

    def solve(self):
        domains = [set(d) for d in self.csp.domains]
        if self.mode == 'mac' and not ac3(self.csp, domains):
            return None
        return self._search({}, domains)

    def _search(self, assignment, domains):
        if len(assignment) == self.csp.n:
            return dict(assignment)
        if self.nodes >= self.budget:
            self.exhausted = True
            return None
        var = self.select(assignment, domains)
        for val in sorted(domains[var]):
            self.nodes += 1
            if self.mode == 'bt':
                # check against assigned neighbors only
                if not all(self.csp.ok(var, val, y, assignment[y]) for y in self.csp.neighbors[var] if y in assignment):
                    continue
                assignment[var] = val
                result = self._search(assignment, domains)
                del assignment[var]
                if result is not None:
                    return result
                if self.exhausted:
                    return None
                continue
            new_domains = [set(d) for d in domains]
            new_domains[var] = {val}
            assignment[var] = val
            feasible = True
            if self.mode == 'fc':
                for y in self.csp.neighbors[var]:
                    if y in assignment:
                        continue
                    new_domains[y] = {vy for vy in new_domains[y] if self.csp.ok(y, vy, var, val)}
                    if not new_domains[y]:
                        feasible = False
                        break
            else:  # mac: AC-3 from the arcs into the assigned variable
                feasible = ac3(self.csp, new_domains, [(y, var) for y in self.csp.neighbors[var]])
            if feasible:
                result = self._search(assignment, new_domains)
                if result is not None:
                    del assignment[var]
                    return result
                if self.exhausted:
                    del assignment[var]
                    return None
            del assignment[var]
        return None


def random_csp(rng, n, d, density, tightness):
    """Model B random binary CSP: each pair constrained with probability
    density; a constrained pair forbids a fixed fraction of value pairs."""
    allowed = {}
    pairs = list(itertools.product(range(d), repeat=2))
    forbid = int(round(tightness * d * d))
    for x in range(n):
        for y in range(x + 1, n):
            if rng.random() < density:
                forbidden = set(rng.sample(pairs, forbid))
                ok_xy = {p for p in pairs if p not in forbidden}
                allowed[(x, y)] = ok_xy
                allowed[(y, x)] = {(b, a) for (a, b) in ok_xy}
    return CSP(n, [range(d)] * n, allowed)


def brute_force(csp):
    sols = []
    for values in itertools.product(*[sorted(dom) for dom in csp.domains]):
        assignment = dict(enumerate(values))
        if csp.consistent(assignment):
            sols.append(assignment)
    return sols


def sudoku_csp(grid):
    """81 variables, domains from the givens, allowed pairs = different
    values, for every pair sharing a row, column, or box."""
    domains = []
    for ch in grid:
        domains.append({int(ch)} if ch in '123456789' else set(range(1, 10)))
    diff = {(a, b) for a in range(1, 10) for b in range(1, 10) if a != b}
    allowed = {}
    for i in range(81):
        for j in range(81):
            if i == j:
                continue
            same = (i // 9 == j // 9) or (i % 9 == j % 9) or (i // 27 == j // 27 and (i % 9) // 3 == (j % 9) // 3)
            if same:
                allowed[(i, j)] = diff
    return CSP(81, domains, allowed)


EASY = '003020600900305001001806400008102900700000008006708200002609500800203009005010300'
HARD = '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......'


def main():
    rng = random.Random(SEED)

    # Oracle 1 and 2 on small instances with exhaustive enumeration.
    small_checked = 0
    for _ in range(40):
        csp = random_csp(rng, 7, 4, 0.5, rng.uniform(0.2, 0.7))
        sols = brute_force(csp)
        sat = bool(sols)
        results = {}
        for mode in ('bt', 'fc', 'mac'):
            for order in ('static', 'mrv'):
                s = Solver(csp, mode, order)
                r = s.solve()
                assert not s.exhausted
                results[(mode, order)] = r
                assert (r is not None) == sat, (mode, order, sat)
                if r is not None:
                    assert csp.consistent(r)
        doms = [set(d) for d in csp.domains]
        ok = ac3(csp, doms)
        if ok:
            assert is_arc_consistent(csp, doms)
            again = [set(d) for d in doms]
            ac3(csp, again)
            assert again == doms, 'AC-3 is not idempotent'
            for sol in sols:
                for v, val in sol.items():
                    assert val in doms[v], 'AC-3 removed a value that appears in a solution'
        else:
            assert not sat, 'AC-3 wiped a domain of a satisfiable instance'
        small_checked += 1

    # the e d^3 bound on constraint checks for one AC-3 run
    csp = random_csp(rng, 25, 6, 0.3, 0.4)
    e = sum(1 for (x, y) in csp.allowed if x < y)
    csp.checks = 0
    doms = [set(d) for d in csp.domains]
    ac3(csp, doms)
    bound = 2 * e * 6 ** 3  # both orientations of every constraint
    assert csp.checks <= bound, (csp.checks, bound)
    ac3_checks, ac3_bound = csp.checks, bound

    # Oracle 3: the race across tightness.
    n, d, density = 25, 6, 0.3
    tightness_values = [0.30, 0.36, 0.40, 0.44, 0.48, 0.54]
    methods = [('bt', 'static', 'chronological backtracking'), ('fc', 'mrv', 'forward checking + MRV'), ('mac', 'static', 'MAC (AC-3), static order'), ('mac', 'mrv', 'MAC (AC-3) + MRV')]
    table = {}
    instances_per_point = 12
    for t in tightness_values:
        stats = {m[2]: {'nodes': 0, 'checks': 0, 'exhausted': 0, 'sat': 0} for m in methods}
        for i in range(instances_per_point):
            csp = random_csp(random.Random(SEED + int(t * 1000) * 100 + i), n, d, density, t)
            verdicts = {}
            for mode, order, name in methods:
                csp.checks = 0
                s = Solver(csp, mode, order, node_budget=200_000)
                r = s.solve()
                if r is not None:
                    assert csp.consistent(r)
                stats[name]['nodes'] += s.nodes
                stats[name]['checks'] += csp.checks
                stats[name]['exhausted'] += s.exhausted
                stats[name]['sat'] += r is not None
                if not s.exhausted:
                    verdicts[name] = r is not None
            # every solver that finished agrees
            assert len(set(verdicts.values())) <= 1, (t, i, verdicts)
        table[t] = stats
    # the orderings the page states, at the transition points (0.40 to 0.48)
    for t in (0.40, 0.44, 0.48):
        st = table[t]
        assert st['MAC (AC-3) + MRV']['nodes'] < st['forward checking + MRV']['nodes'], (t, st)
        assert st['MAC (AC-3), static order']['nodes'] < st['chronological backtracking']['nodes'], (t, st)
        assert st['MAC (AC-3) + MRV']['exhausted'] == 0 and st['forward checking + MRV']['exhausted'] == 0 and st['MAC (AC-3), static order']['exhausted'] == 0
        assert st['MAC (AC-3) + MRV']['checks'] > st['forward checking + MRV']['checks'], 'the propagation is the cost'
    assert table[0.44]['chronological backtracking']['exhausted'] > 0

    # Oracle 4: Sudoku.
    easy = sudoku_csp(EASY)
    doms = [set(d) for d in easy.domains]
    assert ac3(easy, doms)
    assert all(len(dd) == 1 for dd in doms), 'AC-3 alone should solve the easy puzzle'
    easy_solution = {i: next(iter(dd)) for i, dd in enumerate(doms)}
    assert easy.consistent(easy_solution)
    easy_checks = easy.checks
    hard = sudoku_csp(HARD)
    hard_results = {}
    for mode, order, name in (('fc', 'mrv', 'forward checking + MRV'), ('mac', 'mrv', 'MAC (AC-3) + MRV')):
        hard.checks = 0
        s = Solver(hard, mode, order, node_budget=2_000_000)
        r = s.solve()
        assert r is not None and hard.consistent(r) and not s.exhausted
        hard_results[name] = (s.nodes, hard.checks)
    assert hard_results['MAC (AC-3) + MRV'][0] <= hard_results['forward checking + MRV'][0]

    # Oracle 5: the negative example, one unsatisfiable instance at the transition.
    neg = None
    for i in range(instances_per_point):
        csp = random_csp(random.Random(SEED + int(0.44 * 1000) * 100 + i), n, d, density, 0.44)
        s = Solver(csp, 'mac', 'mrv')
        if s.solve() is None and not s.exhausted:
            neg = (i, s.nodes)
            csp.checks = 0
            bt = Solver(csp, 'bt', 'static', node_budget=200_000)
            bt_r = bt.solve()
            assert bt.exhausted and bt_r is None
            neg += (bt.nodes,)
            break
    assert neg is not None

    print('contest: random binary CSPs, 25 variables, domain size 6, constraint density 0.3, 12 instances per tightness; one currency: search nodes and constraint checks; referee: every solution checked constraint by constraint, every finishing solver agreeing on satisfiability, exhaustive enumeration on 40 small instances')
    print(f'small instances (7 variables, domain 4): {small_checked} instances enumerated exhaustively; six solver variants agreed with the enumeration on every one; AC-3 left every surviving value supported, was idempotent, and never removed a value that appears in a solution')
    print(f'one AC-3 run on the 25-variable instance: {ac3_checks:,} constraint checks against the bound 2 e d^3 = {ac3_bound:,} (e = {ac3_bound // (2 * 216)} constraints)')
    print(f'{"tightness":>9} {"sat":>5} | ' + ' | '.join(f'{m[2]:>28}' for m in methods))
    for t in tightness_values:
        st = table[t]
        sat = max(v['sat'] for v in st.values())
        cells = []
        for _, _, name in methods:
            v = st[name]
            ex = f' ({v["exhausted"]} unfinished)' if v['exhausted'] else ''
            cells.append(f'{v["nodes"] // instances_per_point:>8,} n {v["checks"] // instances_per_point:>10,} c{ex:>15}')
        print(f'{t:>9.2f} {sat:>2d}/12 | ' + ' | '.join(cells))
    print(f'Sudoku: the easy puzzle solved by AC-3 alone, no search, {easy_checks:,} constraint checks; the hard puzzle: ' + ', '.join(f'{k} {v[0]:,} nodes, {v[1]:,} checks' for k, v in hard_results.items()))
    print(f'the negative example: unsatisfiable instance {neg[0]} at tightness 0.44: MAC refutes it in {neg[1]:,} nodes; chronological backtracking exhausts a 200,000-node budget without finishing')
    mac44 = table[0.44]['MAC (AC-3) + MRV']
    fc44 = table[0.44]['forward checking + MRV']
    ms44 = table[0.44]['MAC (AC-3), static order']
    print(f'OK: at tightness 0.44 MAC with MRV {mac44["nodes"] // 12:,} nodes against forward checking {fc44["nodes"] // 12:,} and MAC with a static order {ms44["nodes"] // 12:,} per instance, chronological backtracking unfinished at 200,000; '
          f'constraint checks {mac44["checks"] // 12:,} against {fc44["checks"] // 12:,} and {ms44["checks"] // 12:,}; every finishing solver agreed on every instance; AC-3 alone solved the easy Sudoku')


if __name__ == '__main__':
    main()
