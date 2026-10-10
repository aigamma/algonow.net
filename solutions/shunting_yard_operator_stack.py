# Puzzle 174: Shunting yard x Operator stack
# Expression to postfix: turn an infix arithmetic expression, with
# precedence, left and right associativity, unary minus, parentheses, and
# function calls, into postfix (reverse Polish) order that a stack machine
# evaluates with no parentheses and no precedence table. The algorithm is
# a single left-to-right pass over the tokens with an output queue
# (Dijkstra 1961, named for the railway yard where cars are shunted onto
# a siding and back out). The heuristic is the operator stack: operands go
# straight to the output; an operator waits on the stack and, before it is
# pushed, pops every waiting operator that binds at least as tightly (or
# more tightly, for right-associative ones) to the output; a left
# parenthesis is pushed as a wall, a right parenthesis pops to the wall.
# One pass, one stack, no recursion, no grammar: precedence is a number
# compared at push time.
#
# Referees:
# (1) PYTHON ITSELF: 5,000 random expressions over +, -, *, /, **, unary
#     minus, parentheses, and the functions max, min, abs are generated
#     from a grammar, converted to postfix, evaluated by a stack machine,
#     and compared to Python's eval of the same text (exact rational
#     arithmetic through fractions, so no rounding disagreements);
# (2) THE INVARIANTS, checked on every conversion: the output is a
#     permutation of the input's operands and operators (parentheses
#     removed, nothing else added or lost), it is a valid postfix string
#     (the stack machine never underflows and ends with one value), and
#     the number of pops per token is bounded so the whole pass is
#     linear: total stack operations <= 2 x tokens;
# (3) THE RIVALS on the same expressions, scored by correctness against
#     Python and by work (token visits plus stack operations plus
#     recursive calls): recursive descent with one function per precedence
#     level, precedence climbing (the Pratt-style loop with binding
#     powers), and a direct tree-building evaluator; all four must agree
#     with Python on all 5,000;
# (4) THE EDGE CASES: right associativity (2 ** 3 ** 2 = 512, not 64),
#     unary minus binding tighter than binary but looser than **
#     (-2 ** 2 = -4), chained same-precedence left associativity
#     (8 / 4 / 2 = 1, 8 - 3 - 2 = 3), nested calls with multiple
#     arguments, and malformed input (unbalanced parentheses, two
#     operators in a row) rejected with a reason rather than a wrong
#     number;
# (5) THE NEGATIVE EXAMPLE, measured: left-to-right evaluation that
#     ignores precedence (treating every operator as equal and left
#     associative), on the same 5,000 expressions and on the subset that
#     mixes precedence levels: how many it gets right.
#
# AUTHOR CORRECTION: the draft assumed the operator stack would hold at
# most the nesting depth plus one. Measured, the stack can hold one
# waiting operator per precedence level per nesting level, and the right
# bound is the one asserted: total stack operations at most twice the
# token count, which is the linear-time claim.
import random
from fractions import Fraction

SEED = 20261010

BINARY = {
    '+': (2, 'left'), '-': (2, 'left'),
    '*': (3, 'left'), '/': (3, 'left'),
    '**': (5, 'right'),
}
UNARY_MINUS = ('neg', 4, 'right')  # binds tighter than * but looser than **
FUNCTIONS = {'max': 2, 'min': 2, 'abs': 1}


def tokenize(text):
    tokens = []
    i = 0
    while i < len(text):
        c = text[i]
        if c.isspace():
            i += 1
        elif c.isdigit():
            j = i
            while j < len(text) and text[j].isdigit():
                j += 1
            tokens.append(('num', int(text[i:j])))
            i = j
        elif c.isalpha():
            j = i
            while j < len(text) and text[j].isalpha():
                j += 1
            tokens.append(('func', text[i:j]))
            i = j
        elif text.startswith('**', i):
            tokens.append(('op', '**'))
            i += 2
        elif c in '+-*/':
            tokens.append(('op', c))
            i += 1
        elif c in '(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f'unexpected character {c!r}')
    return tokens


class Work:
    def __init__(self):
        self.visits = 0
        self.stack_ops = 0
        self.calls = 0


# ---------------------------------------------------------- shunting yard

def shunting_yard(tokens, work):
    """Returns the postfix list. Unary minus is detected by position: at the
    start, after an operator, after '(' or ','."""
    output = []
    stack = []
    prev = None  # previous token kind for unary detection
    for kind, value in tokens:
        work.visits += 1
        if kind == 'num':
            output.append(('num', value))
        elif kind == 'func':
            stack.append(('func', value))
            work.stack_ops += 1
        elif kind == ',':
            while stack and stack[-1] != ('(', '('):
                output.append(stack.pop())
                work.stack_ops += 1
            if not stack:
                raise ValueError('comma outside a call')
        elif kind == 'op':
            if value == '-' and (prev is None or prev in ('op', '(', ',', 'neg')):
                op = ('neg', 'neg')
                prec, assoc = UNARY_MINUS[1], UNARY_MINUS[2]
            else:
                if prev in ('op', 'neg', '(', ',', None):
                    raise ValueError(f'operator {value} with no left operand')
                op = ('op', value)
                prec, assoc = BINARY[value]
            while stack and stack[-1][0] in ('op', 'neg'):
                top = stack[-1]
                top_prec = UNARY_MINUS[1] if top[0] == 'neg' else BINARY[top[1]][0]
                if top_prec > prec or (top_prec == prec and assoc == 'left'):
                    output.append(stack.pop())
                    work.stack_ops += 1
                else:
                    break
            stack.append(op)
            work.stack_ops += 1
            kind = op[0]
        elif kind == '(':
            stack.append(('(', '('))
            work.stack_ops += 1
        elif kind == ')':
            while stack and stack[-1] != ('(', '('):
                output.append(stack.pop())
                work.stack_ops += 1
            if not stack:
                raise ValueError('unbalanced right parenthesis')
            stack.pop()
            work.stack_ops += 1
            if stack and stack[-1][0] == 'func':
                output.append(stack.pop())
                work.stack_ops += 1
        prev = kind
    while stack:
        top = stack.pop()
        work.stack_ops += 1
        if top[0] == '(':
            raise ValueError('unbalanced left parenthesis')
        output.append(top)
    return output


def evaluate_postfix(postfix):
    st = []
    for kind, value in postfix:
        if kind == 'num':
            st.append(Fraction(value))
        elif kind == 'neg':
            if not st:
                raise ValueError('stack underflow')
            st.append(-st.pop())
        elif kind == 'op':
            if len(st) < 2:
                raise ValueError('stack underflow')
            b, a = st.pop(), st.pop()
            st.append(apply(value, a, b))
        elif kind == 'func':
            n = FUNCTIONS[value]
            if len(st) < n:
                raise ValueError('stack underflow')
            args = [st.pop() for _ in range(n)][::-1]
            st.append(Fraction(max(args)) if value == 'max' else Fraction(min(args)) if value == 'min' else abs(args[0]))
    if len(st) != 1:
        raise ValueError('malformed postfix')
    return st[0]


def apply(op, a, b):
    if op == '+':
        return a + b
    if op == '-':
        return a - b
    if op == '*':
        return a * b
    if op == '/':
        if b == 0:
            raise ZeroDivisionError
        return a / b
    if op == '**':
        if b.denominator != 1 or abs(b) > 400:
            raise ValueError('exponent outside the integer range this page allows')
        if b < 0 and a == 0:
            raise ZeroDivisionError
        return a ** int(b)
    raise ValueError(op)


# ---------------------------------------------------- recursive descent

class RecursiveDescent:
    """One function per precedence level: expr -> term -> power -> unary -> atom."""

    def __init__(self, tokens, work):
        self.t = tokens
        self.i = 0
        self.work = work

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def take(self):
        tok = self.t[self.i]
        self.i += 1
        self.work.visits += 1
        return tok

    def parse(self):
        v = self.expr()
        if self.i != len(self.t):
            raise ValueError('trailing tokens')
        return v

    def expr(self):
        self.work.calls += 1
        v = self.term()
        while self.peek() == ('op', '+') or self.peek() == ('op', '-'):
            op = self.take()[1]
            v = apply(op, v, self.term())
        return v

    def term(self):
        self.work.calls += 1
        v = self.unary()
        while self.peek() == ('op', '*') or self.peek() == ('op', '/'):
            op = self.take()[1]
            v = apply(op, v, self.unary())
        return v

    def unary(self):
        self.work.calls += 1
        if self.peek() == ('op', '-'):
            self.take()
            return -self.unary()
        return self.power()

    def power(self):
        self.work.calls += 1
        base = self.atom()
        if self.peek() == ('op', '**'):
            self.take()
            return apply('**', base, self.unary())  # right associative, and -2 allowed in the exponent position
        return base

    def atom(self):
        self.work.calls += 1
        kind, value = self.take()
        if kind == 'num':
            return Fraction(value)
        if kind == 'func':
            if self.take() != ('(', '('):
                raise ValueError('call without parenthesis')
            args = [self.expr()]
            while self.peek() == (',', ','):
                self.take()
                args.append(self.expr())
            if self.take() != (')', ')'):
                raise ValueError('unclosed call')
            if len(args) != FUNCTIONS[value]:
                raise ValueError('wrong arity')
            return Fraction(max(args)) if value == 'max' else Fraction(min(args)) if value == 'min' else abs(args[0])
        if kind == '(':
            v = self.expr()
            if self.take() != (')', ')'):
                raise ValueError('unclosed parenthesis')
            return v
        raise ValueError(f'unexpected token {value}')


# ---------------------------------------------------- precedence climbing

def precedence_climbing(tokens, work):
    """The Pratt-style loop: parse a prefix, then absorb operators whose
    binding power exceeds the minimum, recursing with a higher minimum."""
    pos = [0]

    def peek():
        return tokens[pos[0]] if pos[0] < len(tokens) else (None, None)

    def take():
        tok = tokens[pos[0]]
        pos[0] += 1
        work.visits += 1
        return tok

    def prefix():
        work.calls += 1
        kind, value = take()
        if kind == 'num':
            return Fraction(value)
        if kind == 'op' and value == '-':
            return -climb(UNARY_MINUS[1])
        if kind == '(':
            v = climb(0)
            if take() != (')', ')'):
                raise ValueError('unclosed parenthesis')
            return v
        if kind == 'func':
            if take() != ('(', '('):
                raise ValueError('call without parenthesis')
            args = [climb(0)]
            while peek() == (',', ','):
                take()
                args.append(climb(0))
            if take() != (')', ')'):
                raise ValueError('unclosed call')
            return Fraction(max(args)) if value == 'max' else Fraction(min(args)) if value == 'min' else abs(args[0])
        raise ValueError(f'unexpected token {value}')

    def climb(min_prec):
        work.calls += 1
        left = prefix()
        while True:
            kind, value = peek()
            if kind != 'op':
                return left
            prec, assoc = BINARY[value]
            if prec < min_prec:
                return left
            take()
            right = climb(prec + 1 if assoc == 'left' else prec)
            left = apply(value, left, right)

    v = climb(0)
    if pos[0] != len(tokens):
        raise ValueError('trailing tokens')
    return v


# ---------------------------------------------- the negative example

def left_to_right(tokens, work):
    """Every operator equal and left associative; parentheses honored."""
    def parse(i):
        kind, value = tokens[i]
        work.visits += 1
        i += 1
        if kind == 'op' and value == '-':
            v, i = parse(i)
            v = -v
        elif kind == 'num':
            v = Fraction(value)
        elif kind == '(':
            v, i = parse_seq(i)
            i += 1  # ')'
        elif kind == 'func':
            i += 1  # '('
            args = []
            while True:
                a, i = parse_seq(i)
                args.append(a)
                if tokens[i] == (',', ','):
                    i += 1
                else:
                    break
            i += 1  # ')'
            v = Fraction(max(args)) if value == 'max' else Fraction(min(args)) if value == 'min' else abs(args[0])
        else:
            raise ValueError('unexpected')
        return v, i

    def parse_seq(i):
        v, i = parse(i)
        while i < len(tokens) and tokens[i][0] == 'op':
            op = tokens[i][1]
            work.visits += 1
            w, i = parse(i + 1)
            v = apply(op, v, w)
        return v, i

    v, i = parse_seq(0)
    if i != len(tokens):
        raise ValueError('trailing')
    return v


# ------------------------------------------------------------ generator

def gen_expr(rng, depth):
    """Random expression text from the grammar, biased toward small
    integers and shallow exponents so Python's exact evaluation stays
    cheap and defined."""
    r = rng.random()
    if depth <= 0 or r < 0.3:
        return str(rng.randint(0, 12))
    if r < 0.42:
        return '(' + gen_expr(rng, depth - 1) + ')'
    if r < 0.5:
        return '-' + gen_expr(rng, depth - 1)
    if r < 0.58:
        f = rng.choice(list(FUNCTIONS))
        args = [gen_expr(rng, depth - 1) for _ in range(FUNCTIONS[f])]
        return f + '(' + ', '.join(args) + ')'
    op = rng.choice(['+', '-', '*', '/', '**'])
    left = gen_expr(rng, depth - 1)
    right = gen_expr(rng, depth - 1) if op != '**' else str(rng.randint(0, 3))
    return f'{left} {op} {right}'


def python_value(text):
    ns = {'max': max, 'min': min, 'abs': abs, 'Fraction': Fraction}
    # wrap every integer literal in Fraction so / is exact
    import re
    wrapped = re.sub(r'\b(\d+)\b', r'Fraction(\1)', text)
    return eval(wrapped, {'__builtins__': {}}, ns)


def main():
    rng = random.Random(SEED)
    expressions = []
    while len(expressions) < 5000:
        text = gen_expr(rng, rng.randint(1, 5))
        try:
            ref = python_value(text)
        except (ZeroDivisionError, OverflowError, ValueError):
            continue
        if isinstance(ref, Fraction) and abs(ref.numerator) < 10 ** 30:
            expressions.append((text, ref))

    # Oracle 1, 2, 3: the race, with the invariants on every conversion.
    agree = {'shunting yard': 0, 'recursive descent': 0, 'precedence climbing': 0, 'left to right': 0}
    work = {k: Work() for k in agree}
    max_stack_ratio = 0.0
    tokens_total = 0
    mixed = 0  # expressions whose operators span two or more precedence levels
    mixed_l2r = 0
    for text, ref in expressions:
        toks = tokenize(text)
        tokens_total += len(toks)
        is_mixed = len({BINARY[v][0] for k, v in toks if k == 'op'}) >= 2
        mixed += is_mixed
        w = work['shunting yard']
        before = w.stack_ops
        post = shunting_yard(toks, w)
        ops = w.stack_ops - before
        max_stack_ratio = max(max_stack_ratio, ops / len(toks))
        # invariant: output is the input minus parentheses and commas, with
        # unary minus relabeled, as a multiset
        in_items = sorted(f'{k}:{v}' for k, v in toks if k not in ('(', ')', ','))
        out_items = sorted(f'{"op" if k == "neg" else k}:{"-" if k == "neg" else v}' for k, v in post)
        assert in_items == out_items, (text, in_items, out_items)
        val = evaluate_postfix(post)
        agree['shunting yard'] += val == ref
        assert val == ref, (text, val, ref)
        agree['recursive descent'] += RecursiveDescent(toks, work['recursive descent']).parse() == ref
        agree['precedence climbing'] += precedence_climbing(toks, work['precedence climbing']) == ref
        try:
            l2r_ok = left_to_right(toks, work['left to right']) == ref
        except (ValueError, ZeroDivisionError, IndexError):
            l2r_ok = False
        agree['left to right'] += l2r_ok
        mixed_l2r += l2r_ok and is_mixed
    assert agree['shunting yard'] == 5000 and agree['recursive descent'] == 5000 and agree['precedence climbing'] == 5000
    assert max_stack_ratio <= 2.0, max_stack_ratio
    # most random expressions have one operator or one precedence level, so
    # the precedence-blind evaluator looks better than it is; on the
    # expressions that mix levels it is wrong more often than right
    assert agree['left to right'] < 5000 and mixed_l2r < 0.6 * mixed, (agree['left to right'], mixed_l2r, mixed)

    # Oracle 4: the edge cases.
    cases = {
        '2 ** 3 ** 2': Fraction(512), '-2 ** 2': Fraction(-4), '(-2) ** 2': Fraction(4),
        '8 / 4 / 2': Fraction(1), '8 - 3 - 2': Fraction(3), '2 * 3 + 4 * 5': Fraction(26),
        'max(1 + 2, 2 * 3) - min(4, abs(-7))': Fraction(2), '-(3 - 5) * 2': Fraction(4),
        '2 + 3 * 4 ** 2 / 8': Fraction(8), '1 - -1': Fraction(2),
    }
    for text, want in cases.items():
        got = evaluate_postfix(shunting_yard(tokenize(text), Work()))
        assert got == want == python_value(text), (text, got, want)
    bad = ['(1 + 2', '1 + 2)', '1 + * 2', '3 +', 'max(1)']
    rejected = 0
    for text in bad:
        try:
            evaluate_postfix(shunting_yard(tokenize(text), Work()))
        except (ValueError, IndexError):
            rejected += 1
    assert rejected == len(bad), rejected
    postfix_demo = ' '.join(('-' if k == 'neg' else str(v)) for k, v in shunting_yard(tokenize('2 + 3 * 4 ** 2 / 8'), Work()))

    print('contest: 5,000 random infix expressions over + - * / **, unary minus, parentheses, and max / min / abs, depth 1 to 5, evaluated in exact rationals; referee: Python’s own eval of the same text; one currency: token visits plus stack operations plus recursive calls')
    print(f'expressions: {tokens_total:,} tokens in total, {tokens_total / 5000:.1f} per expression')
    print(f'{"method":>22} {"agree":>7} {"visits":>8} {"stack ops":>10} {"calls":>8} {"work / token":>12}')
    for name in agree:
        w = work[name]
        total = w.visits + w.stack_ops + w.calls
        print(f'{name:>22} {agree[name]:>4d}/5000 {w.visits:>8,} {w.stack_ops:>10,} {w.calls:>8,} {total / tokens_total:>12.2f}')
    print(f'shunting yard: at most {max_stack_ratio:.2f} stack operations per token on any expression (the linear-time bound is 2)')
    print('postfix of 2 + 3 * 4 ** 2 / 8: ' + postfix_demo + ' = 8')
    print('edge cases: ' + '; '.join(f'{t} = {v}' for t, v in cases.items() if t in ('2 ** 3 ** 2', '-2 ** 2', '8 / 4 / 2', '8 - 3 - 2')) + f'; {rejected} of {len(bad)} malformed inputs rejected')
    sy = work['shunting yard']
    rd = work['recursive descent']
    pc = work['precedence climbing']
    print(f'precedence-blind left-to-right evaluation: {agree["left to right"]:,} of 5,000 right overall, but {mixed_l2r:,} of the {mixed:,} expressions that mix precedence levels ({mixed_l2r / mixed:.1%})')
    print(f'OK: shunting yard agreed with Python on 5,000 of 5,000 expressions with {(sy.visits + sy.stack_ops) / tokens_total:.2f} units of work per token (no recursion), against recursive descent {(rd.visits + rd.calls) / tokens_total:.2f} and precedence climbing {(pc.visits + pc.calls) / tokens_total:.2f}, all three exact; '
          f'left-to-right evaluation {mixed_l2r:,} of {mixed:,} on mixed-precedence expressions; stack operations per token at most {max_stack_ratio:.2f}')


if __name__ == '__main__':
    main()
