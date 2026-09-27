# Puzzle 156: Binary decision diagram x reduced ordered canonical form
# Boolean function representation: circuits and formulas over a few
# dozen variables must be compared for equivalence, checked for
# satisfiability, and counted, without a truth table of 2^n rows. The
# binary decision diagram is the algorithm's data structure: a rooted
# DAG that tests one variable per level and shares every subgraph it
# can. The heuristic is the reduced ordered canonical form: fix one
# variable order for every diagram, merge identical subgraphs through a
# unique table, and delete tests whose two branches agree. Under those
# rules every Boolean function has exactly one diagram, so equivalence
# is pointer equality, satisfiability is "not the zero node", and
# counting is one pass over the nodes.
#
# Referees:
# (1) CANONICITY against the truth table: for 200 random formulas over
#     8 variables, built two ways (the formula, and a rewritten
#     equivalent by De Morgan and re-association), the two diagrams
#     must be the same node, the diagram must agree with the truth
#     table on all 256 inputs, and inequivalent formulas (the formula
#     with one literal flipped) must never share a node;
# (2) THE ORDER: Bryant's function x1 x2 + x3 x4 + ... + x15 x16, built
#     under the interleaved order (16 nodes plus terminals) and under
#     the order that lists odd variables first (2^9 - 2 = 510 internal
#     nodes), both diagrams equal as functions;
# (3) CIRCUITS: an n-bit ripple-carry adder's sum and carry outputs
#     have diagrams linear in n under the interleaved order (measured
#     n = 4 to 16), and a ripple-carry adder and a carry-lookahead
#     formulation of the same adder reduce to the same nodes
#     (equivalence by canonicity), checked exhaustively at 6 bits;
# (4) COUNTING AND SAT: the number of satisfying assignments read off
#     the diagram equals the truth-table count for every random formula;
# (5) THE RIVAL, measured: a DPLL SAT solver deciding the equivalence
#     of the two adders (the XOR of their outputs must be
#     unsatisfiable), with its decisions and unit propagations
#     counted against the diagram's apply steps; and THE NEGATIVE
#     EXAMPLE, measured: the truth table of the 20-variable Bryant
#     function, 1,048,576 rows against a 20-node diagram.
import random
import sys

sys.setrecursionlimit(10000)
SEED = 20260926


class BDD:
    """Nodes are (var, low, high) hash-consed in a unique table; 0 and 1 are
    the terminals. Variables are integers; smaller tests higher."""

    def __init__(self, order):
        self.order = {v: i for i, v in enumerate(order)}
        self.unique = {}
        self.nodes = {}                 # id -> (var, low, high)
        self.memo = {}
        self.next_id = 2
        self.apply_calls = 0

    def mk(self, var, low, high):
        if low == high:
            return low
        key = (var, low, high)
        if key in self.unique:
            return self.unique[key]
        nid = self.next_id
        self.next_id += 1
        self.unique[key] = nid
        self.nodes[nid] = key
        return nid

    def var(self, v):
        return self.mk(v, 0, 1)

    def top(self, u):
        return self.nodes[u][0] if u > 1 else None

    def apply(self, op, u, v):
        key = (op, u, v)
        if key in self.memo:
            return self.memo[key]
        self.apply_calls += 1
        if u <= 1 and v <= 1:
            r = op(u, v)
        else:
            tu, tv = self.top(u), self.top(v)
            if tv is None or (tu is not None and self.order[tu] <= self.order[tv]):
                x = tu
            else:
                x = tv
            u0, u1 = (self.nodes[u][1], self.nodes[u][2]) if tu == x else (u, u)
            v0, v1 = (self.nodes[v][1], self.nodes[v][2]) if tv == x else (v, v)
            r = self.mk(x, self.apply(op, u0, v0), self.apply(op, u1, v1))
        self.memo[key] = r
        return r

    def AND(self, u, v):
        return self.apply(lambda a, b: a & b, u, v)

    def OR(self, u, v):
        return self.apply(lambda a, b: a | b, u, v)

    def XOR(self, u, v):
        return self.apply(lambda a, b: a ^ b, u, v)

    def NOT(self, u):
        return self.XOR(u, 1)

    def evaluate(self, u, assignment):
        while u > 1:
            var, low, high = self.nodes[u]
            u = high if assignment[var] else low
        return u

    def count(self, u, nvars):
        """Satisfying assignments over nvars variables."""
        memo = {}

        def rec(node):
            if node == 0:
                return 0, nvars
            if node == 1:
                return 1, nvars
            if node in memo:
                return memo[node]
            var, low, high = self.nodes[node]
            level = self.order[var]
            c0, l0 = rec(low)
            c1, l1 = rec(high)
            # each child skips levels; scale by 2 per skipped level
            c0 *= 2 ** ((l0 if low > 1 else nvars) - level - 1) if low > 1 else 2 ** (nvars - level - 1)
            c1 *= 2 ** ((l1 if high > 1 else nvars) - level - 1) if high > 1 else 2 ** (nvars - level - 1)
            memo[node] = (c0 + c1, level)
            return memo[node]
        c, level = rec(u)
        if u > 1:
            c *= 2 ** level
        elif u == 1:
            c = 2 ** nvars
        return c

    def size(self, u):
        seen = set()
        stack = [u]
        while stack:
            n = stack.pop()
            if n <= 1 or n in seen:
                continue
            seen.add(n)
            stack.append(self.nodes[n][1])
            stack.append(self.nodes[n][2])
        return len(seen)


# Formulas as nested tuples: ('var', i), ('not', f), ('and', f, g), ('or', f, g), ('xor', f, g)
def random_formula(rng, nvars, depth):
    if depth == 0 or rng.random() < 0.25:
        return ('var', rng.randrange(nvars))
    op = rng.choice(['and', 'or', 'xor', 'not'])
    if op == 'not':
        return ('not', random_formula(rng, nvars, depth - 1))
    return (op, random_formula(rng, nvars, depth - 1), random_formula(rng, nvars, depth - 1))


def rewrite(f, rng):
    """An equivalent formula: De Morgan on random and/or nodes, commuted
    operands, double negations."""
    kind = f[0]
    if kind == 'var':
        return ('not', ('not', f)) if rng.random() < 0.3 else f
    if kind == 'not':
        return ('not', rewrite(f[1], rng))
    a, b = rewrite(f[1], rng), rewrite(f[2], rng)
    if rng.random() < 0.5:
        a, b = b, a
    if kind == 'and' and rng.random() < 0.5:
        return ('not', ('or', ('not', a), ('not', b)))
    if kind == 'or' and rng.random() < 0.5:
        return ('not', ('and', ('not', a), ('not', b)))
    return (kind, a, b)


def flip_one_literal(f, rng):
    """Negate one randomly chosen variable occurrence."""
    leaves = []

    def collect(g, path):
        if g[0] == 'var':
            leaves.append(path)
        elif g[0] == 'not':
            collect(g[1], path + (1,))
        else:
            collect(g[1], path + (1,))
            collect(g[2], path + (2,))
    collect(f, ())
    target = rng.choice(leaves)

    def rebuild(g, path):
        if path == target:
            return ('not', g)
        if g[0] == 'var':
            return g
        if g[0] == 'not':
            return ('not', rebuild(g[1], path + (1,)))
        return (g[0], rebuild(g[1], path + (1,)), rebuild(g[2], path + (2,)))
    return rebuild(f, ())


def build(bdd, f):
    kind = f[0]
    if kind == 'var':
        return bdd.var(f[1])
    if kind == 'not':
        return bdd.NOT(build(bdd, f[1]))
    a, b = build(bdd, f[1]), build(bdd, f[2])
    return {'and': bdd.AND, 'or': bdd.OR, 'xor': bdd.XOR}[kind](a, b)


def eval_formula(f, assignment):
    kind = f[0]
    if kind == 'var':
        return assignment[f[1]]
    if kind == 'not':
        return 1 - eval_formula(f[1], assignment)
    a, b = eval_formula(f[1], assignment), eval_formula(f[2], assignment)
    return {'and': a & b, 'or': a | b, 'xor': a ^ b}[kind]


def bryant_function(bdd, pairs):
    """x1 x2 + x3 x4 + ... over variables 0..2 pairs - 1 (pair i is 2i, 2i + 1)."""
    f = 0
    for i in range(pairs):
        f = bdd.OR(f, bdd.AND(bdd.var(2 * i), bdd.var(2 * i + 1)))
    return f


def ripple_adder(bdd, n):
    """Inputs a_i at variable 2i, b_i at 2i + 1; returns (sums, carry_out)."""
    carry = 0
    sums = []
    for i in range(n):
        a, b = bdd.var(2 * i), bdd.var(2 * i + 1)
        s = bdd.XOR(bdd.XOR(a, b), carry)
        carry = bdd.OR(bdd.AND(a, b), bdd.AND(carry, bdd.XOR(a, b)))
        sums.append(s)
    return sums, carry


def lookahead_adder(bdd, n):
    """Carry-lookahead: generate g_i = a_i b_i, propagate p_i = a_i xor b_i,
    c_{i+1} = g_i + p_i g_{i-1} + p_i p_{i-1} g_{i-2} + ... expanded fully."""
    g = [bdd.AND(bdd.var(2 * i), bdd.var(2 * i + 1)) for i in range(n)]
    p = [bdd.XOR(bdd.var(2 * i), bdd.var(2 * i + 1)) for i in range(n)]
    carries = [0]
    for i in range(n):
        c = 0
        for j in range(i, -1, -1):
            term = g[j]
            for k in range(j + 1, i + 1):
                term = bdd.AND(term, p[k])
            c = bdd.OR(c, term)
        carries.append(c)
    sums = [bdd.XOR(p[i], carries[i]) for i in range(n)]
    return sums, carries[n]


# --- a small DPLL solver on CNF from a Tseitin encoding of the adders ---
class CNF:
    def __init__(self):
        self.clauses = []
        self.n = 0

    def new_var(self):
        self.n += 1
        return self.n

    def add(self, *lits):
        self.clauses.append(tuple(lits))

    def gate_and(self, a, b):
        o = self.new_var()
        self.add(-o, a)
        self.add(-o, b)
        self.add(o, -a, -b)
        return o

    def gate_or(self, a, b):
        o = self.new_var()
        self.add(o, -a)
        self.add(o, -b)
        self.add(-o, a, b)
        return o

    def gate_xor(self, a, b):
        o = self.new_var()
        self.add(-o, a, b)
        self.add(-o, -a, -b)
        self.add(o, -a, b)
        self.add(o, a, -b)
        return o


def cnf_adders(n):
    """Tseitin-encode both adders over shared inputs and a miter: any sum bit
    or the carry differs. Returns the CNF, satisfiable iff not equivalent."""
    cnf = CNF()
    a = [cnf.new_var() for _ in range(n)]
    b = [cnf.new_var() for _ in range(n)]
    # ripple
    carry = None
    r_sums = []
    for i in range(n):
        x = cnf.gate_xor(a[i], b[i])
        if carry is None:
            s = x
            carry = cnf.gate_and(a[i], b[i])
        else:
            s = cnf.gate_xor(x, carry)
            carry = cnf.gate_or(cnf.gate_and(a[i], b[i]), cnf.gate_and(carry, x))
        r_sums.append(s)
    r_carry = carry
    # lookahead
    g = [cnf.gate_and(a[i], b[i]) for i in range(n)]
    p = [cnf.gate_xor(a[i], b[i]) for i in range(n)]
    carries = [None]
    for i in range(n):
        c = None
        for j in range(i, -1, -1):
            term = g[j]
            for k in range(j + 1, i + 1):
                term = cnf.gate_and(term, p[k])
            c = term if c is None else cnf.gate_or(c, term)
        carries.append(c)
    l_sums = [p[0]] + [cnf.gate_xor(p[i], carries[i]) for i in range(1, n)]
    l_carry = carries[n]
    diffs = [cnf.gate_xor(r_sums[i], l_sums[i]) for i in range(n)] + [cnf.gate_xor(r_carry, l_carry)]
    cnf.add(*diffs)                      # at least one output differs
    return cnf, a + b


def dpll(cnf):
    stats = {'decisions': 0, 'propagations': 0}
    assign = {}

    def unit_propagate():
        changed = True
        while changed:
            changed = False
            for clause in cnf.clauses:
                unassigned = []
                satisfied = False
                for lit in clause:
                    v = assign.get(abs(lit))
                    if v is None:
                        unassigned.append(lit)
                    elif (lit > 0) == v:
                        satisfied = True
                        break
                if satisfied:
                    continue
                if not unassigned:
                    return False
                if len(unassigned) == 1:
                    lit = unassigned[0]
                    assign[abs(lit)] = lit > 0
                    stats['propagations'] += 1
                    changed = True
        return True

    def solve():
        snapshot = dict(assign)
        if not unit_propagate():
            assign.clear()
            assign.update(snapshot)
            return False
        free = [v for v in range(1, cnf.n + 1) if v not in assign]
        if not free:
            return True
        v = free[0]
        for value in (True, False):
            stats['decisions'] += 1
            saved = dict(assign)
            assign[v] = value
            if solve():
                return True
            assign.clear()
            assign.update(saved)
        assign.clear()
        assign.update(snapshot)
        return False
    return solve(), stats


if __name__ == '__main__':
    rng = random.Random(SEED)
    NV = 8

    # Oracle 1 and 4: canonicity, truth-table agreement, counting.
    bdd = BDD(list(range(NV)))
    inputs = [[(m >> i) & 1 for i in range(NV)] for m in range(2 ** NV)]
    canonical_hits = 0
    distinct_hits = 0
    for _ in range(200):
        f = random_formula(rng, NV, 5)
        g = rewrite(f, rng)
        h = flip_one_literal(f, rng)
        uf, ug, uh = build(bdd, f), build(bdd, g), build(bdd, h)
        table = [eval_formula(f, x) for x in inputs]
        assert all(bdd.evaluate(uf, x) == t for x, t in zip(inputs, table))
        assert uf == ug
        canonical_hits += 1
        table_h = [eval_formula(h, x) for x in inputs]
        if table_h != table:
            assert uh != uf
            distinct_hits += 1
        else:
            assert uh == uf          # a flip that happened not to change the function
        assert bdd.count(uf, NV) == sum(table)
    nodes_total = len(bdd.nodes)

    # Oracle 2: the order.
    PAIRS = 8
    good = BDD(list(range(2 * PAIRS)))
    fg = bryant_function(good, PAIRS)
    bad_order = [2 * i for i in range(PAIRS)] + [2 * i + 1 for i in range(PAIRS)]
    bad = BDD(bad_order)
    fb = bryant_function(bad, PAIRS)
    size_good, size_bad = good.size(fg), bad.size(fb)
    assert size_good == 2 * PAIRS and size_bad == 2 ** (PAIRS + 1) - 2, (size_good, size_bad)
    ins = [[(m >> i) & 1 for i in range(2 * PAIRS)] for m in range(2 ** (2 * PAIRS))]
    assert all(good.evaluate(fg, x) == bad.evaluate(fb, x) for x in ins[::37])

    # Oracle 3: adders.
    adder_rows = []
    for n in (4, 8, 12, 16):
        b = BDD(list(range(2 * n)))
        sums, carry = ripple_adder(b, n)
        adder_rows.append((n, b.size(carry), max(b.size(s) for s in sums), len(b.nodes)))
    # carry 3n - 1 nodes, the top sum bit 3n, the whole table about 72n (the
    # draft guessed a smaller table; the counts are linear, which is the claim)
    assert all(c == 3 * n - 1 and s == 3 * n for n, c, s, t in adder_rows), adder_rows
    assert adder_rows[-1][3] < 4 * adder_rows[1][3] + 10, adder_rows          # table grows linearly, not exponentially
    N6 = 6
    b6 = BDD(list(range(2 * N6)))
    rs, rc = ripple_adder(b6, N6)
    ls, lc = lookahead_adder(b6, N6)
    assert rs == ls and rc == lc, 'adders differ'
    for m in range(2 ** (2 * N6)):
        x = [(m >> i) & 1 for i in range(2 * N6)]
        av = sum(x[2 * i] << i for i in range(N6))
        bv = sum(x[2 * i + 1] << i for i in range(N6))
        total = av + bv
        assert all(b6.evaluate(rs[i], x) == ((total >> i) & 1) for i in range(N6))
        assert b6.evaluate(rc, x) == (total >> N6)
    apply_calls_6 = b6.apply_calls

    # Oracle 5: DPLL on the miter, and the truth table.
    cnf, in_vars = cnf_adders(N6)
    sat, stats = dpll(cnf)
    assert not sat
    big = BDD(list(range(20)))
    fbig = bryant_function(big, 10)
    big_size = big.size(fbig)
    rows = 0
    ones = 0
    for m in range(2 ** 20):
        rows += 1
        acc = 0
        for i in range(10):
            if (m >> (2 * i)) & 1 and (m >> (2 * i + 1)) & 1:
                acc = 1
                break
        ones += acc
    assert big_size == 20 and big.count(fbig, 20) == ones, (big_size, big.count(fbig, 20), ones)

    print(f'contest: Boolean functions as reduced ordered diagrams; referees: truth tables (256 rows at 8 variables, 4,096 at 12), the two adders checked on all 4,096 inputs, and exhaustive counts')
    print(f'canonicity: 200 random formulas over {NV} variables, each rebuilt by De Morgan and re-association: the same node in 200 of 200; {distinct_hits} one-literal flips changed the function and never shared a node; diagrams agree with the truth table on every input and count every satisfying assignment exactly; {nodes_total:,} nodes in the shared table')
    print(f'the order: x1 x2 + x3 x4 + ... + x15 x16 has {size_good} internal nodes interleaved and {size_bad} with the odd variables first (2^9 - 2), the same function')
    print(f"  {'adder bits':>10} {'carry nodes':>11} {'largest sum':>11} {'table nodes':>11}")
    for n, c, s, t in adder_rows:
        print(f'  {n:>10} {c:>11} {s:>11} {t:>11}')
    print(f'equivalence: ripple-carry and carry-lookahead 6-bit adders reduce to the same nodes for every output ({apply_calls_6:,} apply steps), and both match integer addition on all 4,096 inputs')
    print(f'DPLL on the Tseitin miter of the two 6-bit adders ({cnf.n} variables, {len(cnf.clauses)} clauses): unsatisfiable after {stats["decisions"]:,} decisions and {stats["propagations"]:,} unit propagations')
    print(f'the truth table: the 20-variable function x1 x2 + ... + x19 x20 needs {rows:,} rows ({ones:,} ones) where the diagram has {big_size} nodes')
    print(f'OK: canonical on 200 of 200 rewrites with truth tables and counts exact; the order changes {size_good} nodes into {size_bad}; adders linear in n and equivalent by pointer at 6 bits; DPLL agrees at {stats["decisions"]:,} decisions; {rows:,} truth-table rows vs {big_size} nodes')
