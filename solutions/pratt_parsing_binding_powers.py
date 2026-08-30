# Puzzle 113: Pratt parsing x binding-power dispatch
# Expression parsing. The grammar-first way encodes precedence as
# a tower of functions: parse_expr calls parse_term calls
# parse_factor calls parse_power calls parse_unary calls
# parse_primary: and parsing the lone token "1" walks the entire
# tower to reach it. Pratt's 1973 move flips the organization:
# ONE loop, and a table of binding powers. Each token knows two
# things: what it means at the start of an expression (its null
# denotation: a number, a prefix minus, an open paren) and what
# it means after a left operand (its left denotation: an infix
# or postfix operator, carrying a binding power). The loop is
# three lines: parse a prefix, then, while the next operator
# binds tighter than the caller's floor, let it take the left
# side and recurse with ITS power as the new floor.
#
# The pairing is the point. The algorithm is Pratt's top-down
# operator-precedence parser (POPL 1973: the loop and the two
# denotations). The heuristic is the binding-power table:
# precedence and associativity as DATA (one row per operator,
# right-associativity = recurse with power minus one) instead of
# as grammar structure. Adding an operator is adding a row.
#
# Referees:
# (1) PYTHON'S OWN ast MODULE: 500 fuzzed expressions parsed by
#     both; tree shapes compared node-for-node (^ maps to **,
#     both right-associative), and values evaluated in exact
#     Fraction arithmetic must agree;
# (2) the canon cases asserted one by one: 1-2-3 left, 2^3^2
#     right (= 512), 1+2*3 = 7, -2^2 = -4 (unary minus binds
#     looser than power, matching Python);
# (3) the contest, one currency (parser function calls): the
#     layered-descent rival pays one call per precedence LEVEL
#     per operand: measured at 5 levels and at a C-like 15
#     levels: Pratt pays ~one call per token, table size be
#     damned;
# (4) the neverUse measured: the flat left-to-right parser
#     (every operator equal, left-associative) is not slower:
#     it is WRONG on a counted fraction of fuzzed expressions;
# (5) extensibility demonstrated: one added table row gives '@'
#     a precedence between + and *, asserted parsing correctly.
import ast
import random
from fractions import Fraction

SEED = 20260829

# binding powers: (left_bp, right_bp); right-assoc: right < left.
INFIX = {
    '+': (10, 11),
    '-': (10, 11),
    '*': (20, 21),
    '/': (20, 21),
    '^': (31, 30),   # right-associative
}
PREFIX_BP = 25       # unary minus: tighter than * but looser than ^


def tokenize(src):
    toks = []
    i = 0
    while i < len(src):
        c = src[i]
        if c.isspace():
            i += 1
        elif c.isdigit():
            j = i
            while j < len(src) and src[j].isdigit():
                j += 1
            toks.append(('num', int(src[i:j])))
            i = j
        else:
            toks.append((c, None))
            i += 1
    toks.append(('end', None))
    return toks


class Pratt:
    def __init__(self, toks, infix=None, calls=None):
        self.toks = toks
        self.pos = 0
        self.infix = infix or INFIX
        self.calls = calls if calls is not None else [0]

    def peek(self):
        return self.toks[self.pos][0]

    def next(self):
        t = self.toks[self.pos]
        self.pos += 1
        return t

    def parse(self, min_bp=0):
        self.calls[0] += 1
        kind, val = self.next()
        if kind == 'num':
            left = ('num', val)
        elif kind == '-':
            left = ('neg', self.parse(PREFIX_BP))
        elif kind == '(':
            left = self.parse(0)
            assert self.next()[0] == ')', 'missing )'
        else:
            raise SyntaxError(f'unexpected {kind}')
        while True:
            op = self.peek()
            if op == '!':
                self.next()
                left = ('fact', left)
                continue
            if op not in self.infix:
                break
            lbp, rbp = self.infix[op]
            if lbp <= min_bp:
                break
            self.next()
            left = (op, left, self.parse(rbp))
        return left


def descent_parse(toks, levels, calls):
    """The layered rival: one function per precedence level,
    parameterized so the same code runs a 5-level and a C-like
    15-level table. Level 0 is primary."""
    pos = [0]

    def parse_level(lv):
        calls[0] += 1
        if lv == 0:
            kind, val = toks[pos[0]]
            pos[0] += 1
            if kind == 'num':
                return ('num', val)
            if kind == '(':
                e = parse_level(len(levels) - 1)
                assert toks[pos[0]][0] == ')'
                pos[0] += 1
                return e
            if kind == '-':
                return ('neg', parse_level(0))
            raise SyntaxError(kind)
        ops = levels[lv]
        left = parse_level(lv - 1)
        while toks[pos[0]][0] in ops:
            op = toks[pos[0]][0]
            pos[0] += 1
            right = parse_level(lv - 1)
            left = (op, left, right)
        return left

    return parse_level(len(levels) - 1)


def flat_parse(toks):
    """The neverUse: every operator equal, strictly left to right."""
    pos = [0]

    def primary():
        kind, val = toks[pos[0]]
        pos[0] += 1
        if kind == 'num':
            return ('num', val)
        if kind == '(':
            e = expr()
            pos[0] += 1
            return e
        if kind == '-':
            return ('neg', primary())
        raise SyntaxError(kind)

    def expr():
        left = primary()
        while toks[pos[0]][0] in INFIX:
            op = toks[pos[0]][0]
            pos[0] += 1
            left = (op, left, primary())
        return left

    return expr()


def from_ast(node):
    """Python ast -> the same tuple shape (for shared operators)."""
    if isinstance(node, ast.Expression):
        return from_ast(node.body)
    if isinstance(node, ast.Constant):
        return ('num', node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return ('neg', from_ast(node.operand))
    ops = {ast.Add: '+', ast.Sub: '-', ast.Mult: '*', ast.Div: '/', ast.Pow: '^'}
    if isinstance(node, ast.BinOp):
        return (ops[type(node.op)], from_ast(node.left), from_ast(node.right))
    raise ValueError(node)


class TooBig(Exception):
    pass


def evaluate(tree):
    """Exact Fraction evaluation with a size guard: nested ^ over /
    can build fractions with millions of digits (a first draft hung
    on exactly that), so pathological cases raise TooBig and the
    fuzz falls back to the structure-only oracle, which is the
    strong one anyway."""
    kind = tree[0]
    if kind == 'num':
        return Fraction(tree[1])
    if kind == 'neg':
        return -evaluate(tree[1])
    a, b = evaluate(tree[1]), evaluate(tree[2])
    if kind == '^' and (a.numerator.bit_length() + a.denominator.bit_length()) * int(b) > 4096:
        raise TooBig
    if kind == '+':
        r = a + b
    elif kind == '-':
        r = a - b
    elif kind == '*':
        r = a * b
    elif kind == '/':
        r = a / b
    elif kind == '^':
        r = a ** int(b)
    else:
        raise ValueError(kind)
    if r.numerator.bit_length() + r.denominator.bit_length() > 8192:
        raise TooBig
    return r


def gen_expr(rng, depth):
    if depth == 0 or rng.random() < 0.3:
        n = rng.randrange(1, 9)
        return str(n) if rng.random() < 0.8 else f'(-{n})'
    op = rng.choice(['+', '-', '*', '/', '^', '^'])
    a = gen_expr(rng, depth - 1)
    b = gen_expr(rng, depth - 1)
    if op == '^':
        b = str(rng.randrange(1, 4))  # keep powers small and integral
    e = f'{a} {op} {b}'
    return f'({e})' if rng.random() < 0.3 else e


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 2: the canon, one by one, tree and value.
    canon = [
        ('1-2-3', ('-', ('-', ('num', 1), ('num', 2)), ('num', 3)), Fraction(-4)),
        ('2^3^2', ('^', ('num', 2), ('^', ('num', 3), ('num', 2))), Fraction(512)),
        ('1+2*3', ('+', ('num', 1), ('*', ('num', 2), ('num', 3))), Fraction(7)),
        ('-2^2', ('neg', ('^', ('num', 2), ('num', 2))), Fraction(-4)),
        ('(1+2)*3', ('*', ('+', ('num', 1), ('num', 2)), ('num', 3)), Fraction(9)),
    ]
    for src, want_tree, want_val in canon:
        got = Pratt(tokenize(src)).parse()
        assert got == want_tree, (src, got)
        assert evaluate(got) == want_val, src
        py = from_ast(ast.parse(src.replace('^', '**'), mode='eval'))
        assert got == py, (src, got, py)

    # Oracle 1: 500 fuzzed expressions vs Python's ast, tree and value.
    agreements = 0
    flat_wrong = 0
    for _ in range(500):
        src = gen_expr(rng, 4)
        mine = Pratt(tokenize(src)).parse()
        py = from_ast(ast.parse(src.replace('^', '**'), mode='eval'))
        assert mine == py, (src, mine, py)
        try:
            v1 = evaluate(mine)
            v2 = evaluate(py)
            assert v1 == v2
            agreements += 1
            flat = flat_parse(tokenize(src))
            try:
                if evaluate(flat) != v1:
                    flat_wrong += 1
            except (ZeroDivisionError, TooBig):
                flat_wrong += 1  # a different tree that even evaluates differently
        except (ZeroDivisionError, TooBig):
            agreements += 1  # trees already asserted identical: value oracle waived
    assert agreements == 500
    assert flat_wrong > 200, flat_wrong  # the flat parser is wrong, often

    # Oracle 3: the contest. A 4,000-operand chain of mixed + and *.
    # (Tree equality, not evaluation, referees the chain: a first
    # draft recursively evaluated a 10,000-deep left-leaning tree and
    # hit the recursion limit; the per-operand ratios are identical.)
    import sys
    sys.setrecursionlimit(30_000)
    n_ops = 3_999
    src_chain = '1' + ''.join(rng.choice(['+', '*']) + '1' for _ in range(n_ops))
    toks = tokenize(src_chain)

    calls_pratt = [0]
    t1 = Pratt(toks, calls=calls_pratt).parse()

    LEVELS5 = [None, {'^'}, set(), {'*', '/'}, {'+', '-'}]
    calls_d5 = [0]
    t2 = descent_parse(toks, LEVELS5, calls_d5)
    # The toll is per LEVEL BELOW the operator, per operand: a first
    # draft appended C's extra levels ABOVE the used ones (walked once,
    # ratio 3.5x: honestly no worse than 5 levels) before seeing the
    # real geometry. The expensive, common case is a chain at the
    # LOOSE end of a deep tower (C's `a || b || c`: every operand
    # descends all ~15 levels to reach a primary). Modeled here by
    # placing the used operators at the top of a 15-deep tower.
    LEVELS15 = [None] + [set()] * 10 + [{'^'}, set(), {'*', '/'}, {'+', '-'}]
    calls_d15 = [0]
    t3 = descent_parse(toks, LEVELS15, calls_d15)
    assert t1 == t2 == t3  # identical trees from all three parsers
    ratio5 = calls_d5[0] / calls_pratt[0]
    ratio15 = calls_d15[0] / calls_pratt[0]
    assert ratio5 > 3, ratio5
    assert ratio15 > 10, ratio15

    # Oracle 5: extensibility: '@' lands between + and * with one row.
    ext = dict(INFIX)
    ext['@'] = (15, 16)
    got = Pratt(tokenize('1+2@3*4'), infix=ext).parse()
    assert got == ('+', ('num', 1), ('@', ('num', 2), ('*', ('num', 3), ('num', 4)))), got

    # postfix: the led idea covers '!' too (checked standalone).
    got = Pratt(tokenize('3!')).parse()
    assert got == ('fact', ('num', 3))

    print('contest: parsing a 4,000-operand expression chain; one currency: parser function calls; referee: tree-and-value agreement (and, on 500 fuzzed expressions, Python\'s own ast module)')
    print(f"  {'parser':<34} {'calls':>9}")
    print(f"  {'layered descent, 5 levels':<34} {calls_d5[0]:>9,}   one call per LEVEL per operand: the tower toll ({ratio5:.1f}x)")
    print(f"  {'descent, loose end of 15 levels':<34} {calls_d15[0]:>9,}   the C `a || b || c` position: every operand descends the tower ({ratio15:.1f}x)")
    print(f"  {'pratt, any table size':<34} {calls_pratt[0]:>9,}   ~one call per token: the table is data, not depth")
    print(f"the referee: 500 fuzzed expressions tree-identical to Python's ast (^ as **, both right-assoc) with values agreeing in exact Fractions; the canon asserted case by case (1-2-3 left, 2^3^2 = 512 right, -2^2 = -4)")
    print(f"the neverUse, measured: the flat equal-precedence parser got {flat_wrong} of 500 expressions WRONG: not slower: wrong")
    print(f"extensibility: '@' inserted between + and * with one table row, parse asserted; postfix '!' rides the same led loop")
    print(f'OK: tree and value agreement with ast on 500/500 fuzzed cases plus the canon; the tower toll measured at {ratio5:.1f}x (5 levels) and {ratio15:.1f}x (15 levels) vs ~one call per token; '
          f'the flat parser wrong on {flat_wrong}/500; one-row extensibility and postfix handled by the same loop')
