"""LL(1) parsing x First-follow table (puzzle 203).

Nullable, FIRST, and FOLLOW as least fixpoints; the LL(1) table with
conflict detection; a table-driven predictive parser with an explicit
stack that builds the parse tree. Referees: the textbook sets (Aho, Lam,
Sethi, Ullman 4.4), an Earley recognizer run on the same strings (it also
measures the longest viable prefix, which the LL(1) error position must
equal), a hand-written recursive descent parser, and a Pratt parser whose
operator tree the LL(1) tree must fold into. Every number regenerates.
AUTHOR CORRECTION: the draft asserted that every parse sits within three
slopes of the linear work fit; one-token inputs sit sixteen ops off the
line (fourteen ops for one token), so the page states the measured bound.
"""
import random
import time
from collections import defaultdict

END = '$'


class Grammar:
    def __init__(self, start, rules):
        self.start, self.rules = start, rules
        self.prods = defaultdict(list)
        for lhs, rhs in rules:
            self.prods[lhs].append(tuple(rhs))
        self.nts = list(self.prods)
        self.nullable, self.first, self.follow = set(), {}, {}
        self.passes = self._fixpoints()

    def _fixpoints(self):
        A_, F_, W_ = self.nullable, self.first, self.follow
        for A in self.nts:
            F_[A], W_[A] = set(), set()
        W_[self.start].add(END)

        def nullable_step():
            ch = False
            for A, rhs in self.rules:
                if A not in A_ and all(s in A_ for s in rhs):
                    A_.add(A)
                    ch = True
            return ch

        def first_step():
            ch = False
            for A, rhs in self.rules:
                f, _ = self.first_seq(rhs)
                if not f <= F_[A]:
                    F_[A] |= f
                    ch = True
            return ch

        def follow_step():
            ch = False
            for A, rhs in self.rules:
                for i, s in enumerate(rhs):
                    if s not in self.prods:
                        continue
                    f, nul = self.first_seq(rhs[i + 1:])
                    add = f | (W_[A] if nul else set())
                    if not add <= W_[s]:
                        W_[s] |= add
                        ch = True
            return ch

        return tuple(self._iterate(st) for st in (nullable_step, first_step, follow_step))

    @staticmethod
    def _iterate(step):
        passes = 1
        while step():
            passes += 1
        return passes

    def first_seq(self, seq):
        """FIRST of a symbol sequence and whether the whole sequence is nullable."""
        out = set()
        for s in seq:
            if s not in self.prods:
                out.add(s)
                return out, False
            out |= self.first[s]
            if s not in self.nullable:
                return out, False
        return out, True

    def table(self):
        """tab[A][a] -> list of (rhs, route); conflicts -> list of (A, a, kind)."""
        tab = defaultdict(lambda: defaultdict(list))
        for A, rhs in self.rules:
            f, nul = self.first_seq(rhs)
            for a in f:
                tab[A][a].append((tuple(rhs), 'first'))
            if nul:
                for b in self.follow[A]:
                    tab[A][b].append((tuple(rhs), 'follow'))
        conflicts = []
        for A in tab:
            for a, cell in tab[A].items():
                if len(cell) > 1:
                    kind = 'first/follow' if any(r == 'follow' for _, r in cell) else 'first/first'
                    conflicts.append((A, a, kind))
        return tab, conflicts


def ll1_parse(g, tab, toks, pick=0, cap=5000):
    """Table-driven predictive parse. Returns (tree | None | 'LOOP', error_pos, lookups, stack_ops)."""
    toks = list(toks) + [END]
    root = [g.start]
    stack = [[END], root]
    i, lookups, ops = 0, 0, 2
    while stack:
        node = stack.pop()
        ops += 1
        sym, a = node[0], toks[i]
        if sym == END:
            return (root if a == END else None), i, lookups, ops
        if sym not in g.prods:
            if sym != a:
                return None, i, lookups, ops
            i += 1
            continue
        lookups += 1
        cell = tab[sym].get(a)
        if not cell:
            return None, i, lookups, ops
        rhs = cell[pick if pick < len(cell) else -1][0]
        kids = [[s] for s in rhs]
        node.extend(kids)
        for k in reversed(kids):
            stack.append(k)
            ops += 1
        if ops > cap:
            return 'LOOP', i, lookups, ops
    return None, i, lookups, ops


def tree_yield(g, node):
    if len(node) == 1:
        return [] if node[0] in g.prods else [node[0]]
    return [t for k in node[1:] for t in tree_yield(g, k)]


def earley(g, toks):
    """Earley recognizer: (accepted, longest viable prefix length, items built)."""
    n = len(toks)
    chart = [[] for _ in range(n + 1)]
    seen = [set() for _ in range(n + 1)]

    def add(k, it):
        if it not in seen[k]:
            seen[k].add(it)
            chart[k].append(it)

    for rhs in g.prods[g.start]:
        add(0, (g.start, rhs, 0, 0))
    viable = 0
    for k in range(n + 1):
        j = 0
        while j < len(chart[k]):
            A, rhs, dot, org = chart[k][j]
            j += 1
            if dot < len(rhs):
                s = rhs[dot]
                if s in g.prods:
                    for r in g.prods[s]:
                        add(k, (s, r, 0, k))
                    if s in g.nullable:
                        add(k, (A, rhs, dot + 1, org))
                elif k < n and toks[k] == s:
                    add(k + 1, (A, rhs, dot + 1, org))
            else:
                for B, r2, d2, o2 in list(chart[org]):
                    if d2 < len(r2) and r2[d2] == A:
                        add(k, (B, r2, d2 + 1, o2))
        if chart[k]:
            viable = k
    acc = any(A == g.start and dot == len(rhs) and org == 0 for A, rhs, dot, org in chart[n])
    return acc, viable, sum(len(c) for c in chart)


def generate(g, rand, sym, depth=0):
    if sym not in g.prods:
        return [sym]
    rhss = g.prods[sym]
    if depth > 5:
        rhss = sorted(rhss, key=lambda r: sum(s in g.prods for s in r))[:1]
    return [t for s in rand.choice(rhss) for t in generate(g, rand, s, depth + 1)]


def corrupt(toks, rand, alphabet):
    t = list(toks)
    op = rand.randrange(3)
    if op == 0 and len(t) > 1:
        del t[rand.randrange(len(t))]
    elif op == 1:
        t.insert(rand.randrange(len(t) + 1), rand.choice(alphabet))
    else:
        i, j = rand.randrange(len(t)), rand.randrange(len(t))
        t[i], t[j] = t[j], t[i]
    return t


class RecursiveDescent:
    """Hand-written parser for the same expression grammar, counting procedure calls."""

    def __init__(self, toks):
        self.t, self.i, self.calls = list(toks) + [END], 0, 0

    def parse(self):
        try:
            self.E()
            return self.t[self.i] == END
        except SyntaxError:
            return False

    def eat(self, x):
        if self.t[self.i] != x:
            raise SyntaxError
        self.i += 1

    def E(self):
        self.calls += 1
        self.T()
        self.Ep()

    def Ep(self):
        self.calls += 1
        if self.t[self.i] == '+':
            self.eat('+')
            self.T()
            self.Ep()

    def T(self):
        self.calls += 1
        self.F()
        self.Tp()

    def Tp(self):
        self.calls += 1
        if self.t[self.i] == '*':
            self.eat('*')
            self.F()
            self.Tp()

    def F(self):
        self.calls += 1
        if self.t[self.i] == '(':
            self.eat('(')
            self.E()
            self.eat(')')
        else:
            self.eat('id')


def pratt(toks):
    """Pratt parser for the expression subset, returning a left-associative operator tree."""
    t, pos, bp = list(toks) + [END], [0], {'+': 10, '*': 20}

    def nud():
        a = t[pos[0]]
        pos[0] += 1
        if a == 'id':
            return 'id'
        if a == '(':
            e = expr(0)
            if t[pos[0]] != ')':
                raise SyntaxError
            pos[0] += 1
            return e
        raise SyntaxError

    def expr(rbp):
        left = nud()
        while t[pos[0]] in bp and bp[t[pos[0]]] > rbp:
            op = t[pos[0]]
            pos[0] += 1
            left = (op, left, expr(bp[op]))
        return left

    e = expr(0)
    if t[pos[0]] != END:
        raise SyntaxError
    return e


def optree(g, node):
    """Fold an LL(1) parse tree of the textbook grammar into the same operator tree."""
    sym, kids = node[0], node[1:]
    if sym in ('E', 'T'):
        left, chain = optree(g, kids[0]), kids[1]
        while len(chain) > 1:
            left = (chain[1][0], left, optree(g, chain[2]))
            chain = chain[3]
        return left
    return 'id' if len(kids) == 1 else optree(g, kids[1])


def nested_if(d):
    return ['if', 'c', 'then'] * d + ['other', 'else', 'other']


def else_depth(node, depth=0):
    """Depth of the if that owns the else (S' -> else S)."""
    if node[0] == "S'" and len(node) > 1:
        return depth
    best = None
    for k in node[1:]:
        r = else_depth(k, depth + (1 if k[0] == 'S' else 0))
        if r is not None:
            best = r
    return best


def main():
    rand = random.Random(203)
    t0 = time.perf_counter()
    TEXT = Grammar('E', [
        ('E', ['T', "E'"]), ("E'", ['+', 'T', "E'"]), ("E'", []),
        ('T', ['F', "T'"]), ("T'", ['*', 'F', "T'"]), ("T'", []),
        ('F', ['(', 'E', ')']), ('F', ['id']),
    ])
    LREC = Grammar('E', [
        ('E', ['E', '+', 'T']), ('E', ['T']),
        ('T', ['T', '*', 'F']), ('T', ['F']),
        ('F', ['(', 'E', ')']), ('F', ['id']),
    ])
    # (a) textbook sets
    want_first = {'E': {'(', 'id'}, 'T': {'(', 'id'}, 'F': {'(', 'id'}, "E'": {'+'}, "T'": {'*'}}
    want_follow = {'E': {')', END}, "E'": {')', END}, 'T': {'+', ')', END}, "T'": {'+', ')', END}, 'F': {'+', '*', ')', END}}
    assert TEXT.first == want_first and TEXT.follow == want_follow and TEXT.nullable == {"E'", "T'"}
    tab, conflicts = TEXT.table()
    assert conflicts == []
    cells = sum(len(r) for r in tab.values())
    print(f"textbook grammar: nullable {{E', T'}}, FIRST/FOLLOW equal the book's sets, {cells} table cells, 0 conflicts, "
          f"fixpoint passes nullable {TEXT.passes[0]} first {TEXT.passes[1]} follow {TEXT.passes[2]}")

    # (b) generated sentences and corruptions against Earley; error positions against the viable prefix
    alphabet = ['id', '+', '*', '(', ')']
    valid, bad, n_acc, n_rej, pts, rd_calls, ll_lookups, ll_ops, ear_items = [], [], 0, 0, [], 0, 0, 0, 0
    t_ll = t_ea = 0.0
    while len(valid) < 1500:
        s = generate(TEXT, rand, 'E')
        if len(s) <= 60:
            valid.append(s)
    for s in valid:
        bad.append(corrupt(s, rand, alphabet))
    for s in valid:
        tree, pos, lk, ops = ll1_parse(TEXT, tab, s)
        assert tree is not None and tree_yield(TEXT, tree) == s
        assert lk > 0
        rd = RecursiveDescent(s)
        assert rd.parse()
        assert optree(TEXT, tree) == pratt(s)
        pts.append((len(s), ops))
        rd_calls += rd.calls
        ll_lookups += lk
        ll_ops += ops
        n_acc += 1
    for s in bad:
        a = time.perf_counter()
        tree, pos, lk, ops = ll1_parse(TEXT, tab, s)
        t_ll += time.perf_counter() - a
        a = time.perf_counter()
        acc, viable, items = earley(TEXT, s)
        t_ea += time.perf_counter() - a
        ear_items += items
        assert (tree is not None) == acc == RecursiveDescent(s).parse()
        if tree is None:
            assert pos == viable, (s, pos, viable)
            n_rej += 1
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    icpt = my - slope * mx
    ratio = max(y / x for x, y in pts)
    resid = max(abs(y - (slope * x + icpt)) for x, y in pts)
    assert ratio <= 15 and resid < 20
    tot = sum(xs)
    print(f"{n_acc} generated sentences ({tot} tokens, longest {max(xs)}): all accepted, every tree re-yields its string, "
          f"recursive descent agrees ({rd_calls} calls) and the Pratt operator tree matches on all; "
          f"{n_rej} of {len(bad)} corruptions rejected, Earley agrees on all {len(bad)}, every error position equals the viable prefix")
    print(f"work: stack ops = {slope:.2f} x tokens + {icpt:.1f}, every string within {resid:.0f} ops of the line (max {ratio:.0f} per token on a one-token input), "
          f"{ll_lookups} lookups = one per expansion; "
          f"Earley {ear_items} items ({ear_items / sum(len(s) for s in bad):.1f} per token), {t_ea / t_ll:.0f}x the LL(1) time on the corruptions")

    # (c) left recursion: conflicts, then the transformed grammar on the same language
    ltab, lconf = LREC.table()
    assert len(lconf) == 4 and all(k == 'first/first' for _, _, k in lconf)
    same = 0
    for s in valid[:400]:
        acc, _, _ = earley(LREC, s)
        assert acc
        same += 1
    for _ in range(400):
        s = generate(LREC, rand, 'E')
        if len(s) <= 60:
            acc_e, _, _ = earley(LREC, s)
            assert acc_e and ll1_parse(TEXT, tab, s)[0] is not None
            same += 1
    for s in bad[:400]:
        assert earley(LREC, s)[0] == (ll1_parse(TEXT, tab, s)[0] is not None)
        same += 1
    loops = sum(ll1_parse(LREC, ltab, s, pick=0)[0] == 'LOOP' for s in valid[:300])
    rej_last = sum(ll1_parse(LREC, ltab, s, pick=-1)[0] is None for s in valid[:300])
    with_op = sum(('+' in s or '*' in s) for s in valid[:300])
    assert loops == 300 and rej_last == with_op
    print(f"left-recursive grammar: {len(lconf)} FIRST/FIRST conflicts (E and T on id and '('); the transformed grammar agrees with Earley "
          f"on {same} strings both ways; fed to the LL(1) parser directly, preferring the recursive production loops on {loops} of 300 "
          f"valid inputs and preferring the other rejects {rej_last} of 300 (every input with an operator)")

    # (d) dangling else and two-token lookahead
    IFG = Grammar('S', [('S', ['if', 'c', 'then', 'S', "S'"]), ('S', ['other']), ("S'", ['else', 'S']), ("S'", [])])
    itab, iconf = IFG.table()
    assert iconf == [("S'", 'else', 'first/follow')]
    depths = []
    for d in range(1, 7):
        tree = ll1_parse(IFG, itab, nested_if(d), pick=0)[0]
        assert tree is not None and tree_yield(IFG, tree) == nested_if(d)
        depths.append(else_depth(tree, 1))
        assert ll1_parse(IFG, itab, nested_if(d), pick=-1)[0] is None
    assert depths == list(range(1, 7))
    TWO = Grammar('S', [('S', ['a', 'b']), ('S', ['a', 'c'])])
    FAC = Grammar('S', [('S', ['a', "S'"]), ("S'", ['b']), ("S'", ['c'])])
    assert len(TWO.table()[1]) == 1 and FAC.table()[1] == []
    print(f"dangling else: 1 FIRST/FOLLOW conflict on (S', else); preferring 'else S' binds each else to the innermost if "
          f"(depths {depths[0]} to {depths[-1]} on {len(depths)} nestings), preferring epsilon rejects all {len(depths)}; "
          f"S -> a b | a c: 1 conflict, left-factored 0")
    secs = time.perf_counter() - t0
    print(f"OK: FIRST and FOLLOW equal the textbook sets with 0 conflicts in {cells} cells; {n_acc} generated sentences parsed and "
          f"re-yielded, Pratt trees and recursive descent agree on all, {n_rej} of {len(bad)} corruptions rejected exactly where "
          f"the viable prefix ends (Earley agrees on every string); stack work {slope:.2f} ops per token; the left-recursive grammar "
          f"has {len(lconf)} conflicts and loops on {loops} of 300 inputs when fed to the parser; the dangling else is 1 FIRST/FOLLOW "
          f"conflict resolved to the nearest if on {len(depths)} nestings; {secs:.1f} s")


if __name__ == '__main__':
    main()
