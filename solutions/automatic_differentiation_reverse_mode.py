# Puzzle 137: Automatic differentiation x reverse mode
# Gradient computation: a program computes a number y from inputs x_1
# ... x_n through millions of elementary operations. Automatic
# differentiation is the algorithm: every elementary operation knows
# its own derivative, so the chain rule can be applied mechanically to
# the program itself, giving derivatives exact to rounding, not the
# truncated ones of finite differences and not the expression swell of
# symbolic algebra. The heuristic is the direction of the sweep.
# Forward mode carries a derivative alongside every value, one input
# direction per pass: n passes for n inputs. Reverse mode records the
# operations on a tape during one forward pass, then sweeps the tape
# backwards accumulating d(output)/d(node) for every node: one pass
# for all n inputs, at the price of storing the tape. Backpropagation
# is reverse mode applied to a neural network.
#
# Referees:
# (1) HAND-DERIVED GRADIENTS on closed-form functions, exact to 1e-12
#     for both modes;
# (2) CENTRAL FINITE DIFFERENCES on a 3-layer tanh network loss with
#     501 parameters: reverse mode agrees to 1e-6 (the difference
#     quotient's own floor), while the two AD modes agree with each
#     other to 1e-12;
# (3) THE COST LAW, counted in elementary operations: the reverse
#     sweep costs a small constant times the forward evaluation
#     regardless of n (measured at n = 17, 501, 5,401), forward mode
#     costs n forward evaluations (measured at 17 and 501; at 5,401 it
#     would be 460 million operations, so it is not run), finite
#     differences 2n;
# (4) THE OTHER DIRECTION: for a function with one input and 500
#     outputs (a Jacobian column), forward mode needs one pass and
#     reverse mode needs 500 sweeps, counted;
# (5) THE TAPE: reverse mode's memory is the number of recorded
#     operations, measured against forward mode's constant.
import math
import random

SEED = 20260926
OPS = {'count': 0}


class Tape:
    def __init__(self):
        self.nodes = []              # (parents, local derivatives)

    def push(self, parents, derivs):
        self.nodes.append((parents, derivs))
        return len(self.nodes) - 1


class Rev:
    """A reverse-mode variable: value plus an index on the tape."""
    __slots__ = ('v', 'i', 'tape')

    def __init__(self, v, tape, parents=(), derivs=()):
        self.v = v
        self.tape = tape
        self.i = tape.push(parents, derivs)

    def _lift(self, other):
        return other if isinstance(other, Rev) else Rev(float(other), self.tape)

    def __add__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Rev(self.v + o.v, self.tape, (self.i, o.i), (1.0, 1.0))

    __radd__ = __add__

    def __sub__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Rev(self.v - o.v, self.tape, (self.i, o.i), (1.0, -1.0))

    def __rsub__(self, o):
        return self._lift(o).__sub__(self)

    def __mul__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Rev(self.v * o.v, self.tape, (self.i, o.i), (o.v, self.v))

    __rmul__ = __mul__

    def __truediv__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Rev(self.v / o.v, self.tape, (self.i, o.i), (1.0 / o.v, -self.v / (o.v * o.v)))

    def __neg__(self):
        OPS['count'] += 1
        return Rev(-self.v, self.tape, (self.i,), (-1.0,))

    def exp(self):
        OPS['count'] += 1
        e = math.exp(self.v)
        return Rev(e, self.tape, (self.i,), (e,))

    def log(self):
        OPS['count'] += 1
        return Rev(math.log(self.v), self.tape, (self.i,), (1.0 / self.v,))

    def sin(self):
        OPS['count'] += 1
        return Rev(math.sin(self.v), self.tape, (self.i,), (math.cos(self.v),))

    def tanh(self):
        OPS['count'] += 1
        t = math.tanh(self.v)
        return Rev(t, self.tape, (self.i,), (1.0 - t * t,))


def backward(output):
    """One sweep over the tape: adjoint[j] = d output / d node j."""
    tape = output.tape
    adj = [0.0] * len(tape.nodes)
    adj[output.i] = 1.0
    for j in range(len(tape.nodes) - 1, -1, -1):
        a = adj[j]
        if a == 0.0:
            continue
        parents, derivs = tape.nodes[j]
        for p, d in zip(parents, derivs):
            OPS['count'] += 1
            adj[p] += a * d
    return adj


class Fwd:
    """A forward-mode dual number: value plus derivative along one direction."""
    __slots__ = ('v', 'd')

    def __init__(self, v, d=0.0):
        self.v = v
        self.d = d

    def _lift(self, o):
        return o if isinstance(o, Fwd) else Fwd(float(o))

    def __add__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Fwd(self.v + o.v, self.d + o.d)

    __radd__ = __add__

    def __sub__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Fwd(self.v - o.v, self.d - o.d)

    def __rsub__(self, o):
        return self._lift(o).__sub__(self)

    def __mul__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Fwd(self.v * o.v, self.d * o.v + self.v * o.d)

    __rmul__ = __mul__

    def __truediv__(self, o):
        o = self._lift(o)
        OPS['count'] += 1
        return Fwd(self.v / o.v, (self.d * o.v - self.v * o.d) / (o.v * o.v))

    def __neg__(self):
        OPS['count'] += 1
        return Fwd(-self.v, -self.d)

    def exp(self):
        OPS['count'] += 1
        e = math.exp(self.v)
        return Fwd(e, e * self.d)

    def log(self):
        OPS['count'] += 1
        return Fwd(math.log(self.v), self.d / self.v)

    def sin(self):
        OPS['count'] += 1
        return Fwd(math.sin(self.v), math.cos(self.v) * self.d)

    def tanh(self):
        OPS['count'] += 1
        t = math.tanh(self.v)
        return Fwd(t, (1.0 - t * t) * self.d)


class Plain:
    """Plain floats through the same code, for counting a forward evaluation."""
    __slots__ = ('v',)

    def __init__(self, v):
        self.v = v

    def _lift(self, o):
        return o if isinstance(o, Plain) else Plain(float(o))

    def __add__(self, o):
        OPS['count'] += 1
        return Plain(self.v + self._lift(o).v)

    __radd__ = __add__

    def __sub__(self, o):
        OPS['count'] += 1
        return Plain(self.v - self._lift(o).v)

    def __rsub__(self, o):
        return self._lift(o).__sub__(self)

    def __mul__(self, o):
        OPS['count'] += 1
        return Plain(self.v * self._lift(o).v)

    __rmul__ = __mul__

    def __truediv__(self, o):
        OPS['count'] += 1
        return Plain(self.v / self._lift(o).v)

    def __neg__(self):
        OPS['count'] += 1
        return Plain(-self.v)

    def exp(self):
        OPS['count'] += 1
        return Plain(math.exp(self.v))

    def log(self):
        OPS['count'] += 1
        return Plain(math.log(self.v))

    def sin(self):
        OPS['count'] += 1
        return Plain(math.sin(self.v))

    def tanh(self):
        OPS['count'] += 1
        return Plain(math.tanh(self.v))


def closed_form(x, y):
    return x.sin() * y.exp() + x * x / y


def closed_form_grad(x, y):
    return (math.cos(x) * math.exp(y) + 2 * x / y, math.sin(x) * math.exp(y) - x * x / (y * y))


def network_loss(params, sizes, data):
    """A tanh network with a squared-error loss; params is a flat list of
    variables of any of the three kinds."""
    k = 0
    weights = []
    for a, b in zip(sizes, sizes[1:]):
        W = [[params[k + i * a + j] for j in range(a)] for i in range(b)]
        k += a * b
        bias = params[k:k + b]
        k += b
        weights.append((W, bias))
    loss = None
    for xs, target in data:
        h = xs
        for layer, (W, bias) in enumerate(weights):
            out = []
            for i in range(len(W)):
                s = bias[i]
                for j in range(len(h)):
                    s = s + W[i][j] * h[j]
                out.append(s.tanh() if layer < len(weights) - 1 else s)
            h = out
        err = h[0] - target
        loss = err * err if loss is None else loss + err * err
    return loss


def count_params(sizes):
    return sum(a * b + b for a, b in zip(sizes, sizes[1:]))


def reverse_gradient(values, f):
    tape = Tape()
    vs = [Rev(v, tape) for v in values]
    out = f(vs)
    adj = backward(out)
    return out.v, [adj[v.i] for v in vs], len(tape.nodes)


def forward_gradient(values, f):
    grad = []
    for k in range(len(values)):
        vs = [Fwd(v, 1.0 if i == k else 0.0) for i, v in enumerate(values)]
        grad.append(f(vs).d)
    return grad


def finite_difference_gradient(values, f, h=1e-5):
    grad = []
    for k in range(len(values)):
        up = list(values)
        dn = list(values)
        up[k] += h
        dn[k] -= h
        grad.append((f([Plain(v) for v in up]).v - f([Plain(v) for v in dn]).v) / (2 * h))
    return grad


def counted(fn):
    OPS['count'] = 0
    result = fn()
    return result, OPS['count']


def make_loss(sizes, data):
    """The network loss as a function of a parameter list of any kind
    (Plain, Fwd, or Rev), lifting the data points to the same kind."""
    def f(vs):
        kind = type(vs[0])
        lifted = []
        for xs, t in data:
            if kind is Rev:
                lifted.append(([Rev(x, vs[0].tape) for x in xs], t))
            else:
                lifted.append(([kind(x) for x in xs], t))
        return network_loss(vs, sizes, lifted)
    return f


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: closed forms.
    worst = 0.0
    for _ in range(20):
        x, y = rng.uniform(-2, 2), rng.uniform(0.5, 3)
        gx, gy = closed_form_grad(x, y)
        _, (rx, ry), _ = reverse_gradient([x, y], lambda v: closed_form(v[0], v[1]))
        fx, fy = forward_gradient([x, y], lambda v: closed_form(v[0], v[1]))
        worst = max(worst, abs(rx - gx), abs(ry - gy), abs(fx - gx), abs(fy - gy))
    assert worst < 1e-12, worst

    # Oracle 2 + 3: the network, three ways, and the cost law.
    sizes_list = [(2, 4, 1), (2, 20, 20, 1), (2, 100, 50, 1)]
    data = [([rng.uniform(-1, 1), rng.uniform(-1, 1)], rng.uniform(-1, 1)) for _ in range(8)]
    table = []
    agreement_fd = 0.0
    agreement_modes = 0.0
    for sizes in sizes_list:
        n = count_params(sizes)
        params = [rng.gauss(0, 0.5) for _ in range(n)]
        f = make_loss(sizes, data)
        (_, fwd_ops) = counted(lambda: f([Plain(v) for v in params]))
        ((loss, rgrad, tape_len), rev_ops) = counted(lambda: reverse_gradient(params, f))
        scale = max(abs(g) for g in rgrad) or 1.0
        if n <= 600:
            (fgrad, fwdmode_ops) = counted(lambda: forward_gradient(params, f))
            (fdgrad, fd_ops) = counted(lambda: finite_difference_gradient(params, f))
            agreement_fd = max(agreement_fd, max(abs(a - b) for a, b in zip(rgrad, fdgrad)) / scale)
            agreement_modes = max(agreement_modes, max(abs(a - b) for a, b in zip(rgrad, fgrad)) / scale)
        else:
            fwdmode_ops = None
            fd_ops = None
        table.append((n, fwd_ops, rev_ops, fwdmode_ops, fd_ops, tape_len))
    assert agreement_fd < 1e-6, agreement_fd
    assert agreement_modes < 1e-12, agreement_modes
    for n, fwd_ops, rev_ops, fwdmode_ops, fd_ops, tape_len in table:
        assert rev_ops < 4 * fwd_ops, (n, rev_ops, fwd_ops)
        if fwdmode_ops is not None:
            assert fwdmode_ops > 0.8 * n * fwd_ops, (n, fwdmode_ops, fwd_ops)
        if fd_ops is not None:
            assert abs(fd_ops - 2 * n * fwd_ops) <= 2 * n, (fd_ops, n, fwd_ops)
    ratios = [rev_ops / fwd_ops for _, fwd_ops, rev_ops, _, _, _ in table]
    assert max(ratios) - min(ratios) < 1.0, ratios

    # Oracle 4: one input, many outputs.
    m = 500

    def many_outputs(v):
        x = v[0]
        outs = []
        cur = x
        for k in range(m):
            cur = (cur * 0.99 + k * 0.001).sin()
            outs.append(cur)
        return outs

    x0 = 0.7
    ((_, fwd1_ops)) = counted(lambda: [o.v for o in many_outputs([Plain(x0)])])
    (col_fwd, fwdmode1_ops) = counted(lambda: [o.d for o in many_outputs([Fwd(x0, 1.0)])])

    def reverse_column():
        tape = Tape()
        x = Rev(x0, tape)
        outs = many_outputs([x])
        return [backward(o)[x.i] for o in outs]

    (col_rev, revmode1_ops) = counted(reverse_column)
    assert max(abs(a - b) for a, b in zip(col_fwd, col_rev)) < 1e-12
    assert fwdmode1_ops < 3 * fwd1_ops and revmode1_ops > 50 * fwdmode1_ops, (fwd1_ops, fwdmode1_ops, revmode1_ops)

    print('contest: the gradient of a tanh-network loss with n parameters; referees: closed-form derivatives, central finite differences, and the two AD modes against each other')
    print(f"  {'parameters n':>12} {'forward eval':>12} {'reverse mode':>12} {'ratio':>6} {'forward mode':>13} {'finite diff':>12} {'tape nodes':>10}")
    for n, fwd_ops, rev_ops, fwdmode_ops, fd_ops, tape_len in table:
        print(f'  {n:>12,} {fwd_ops:>12,} {rev_ops:>12,} {rev_ops / fwd_ops:>6.2f} {(f"{fwdmode_ops:,}" if fwdmode_ops else "not run"):>13} {(f"{fd_ops:,}" if fd_ops else "not run"):>12} {tape_len:>10,}')
    print(f'agreement: reverse vs forward mode {agreement_modes:.1e} (relative); reverse vs central differences {agreement_fd:.1e}; closed forms {worst:.1e}')
    print(f'one input, {m} outputs: forward evaluation {fwd1_ops:,} ops; forward mode (one pass) {fwdmode1_ops:,}; reverse mode ({m} sweeps) {revmode1_ops:,}')
    print(f'OK: both modes match closed forms to {worst:.0e} and each other to {agreement_modes:.0e}; reverse mode costs {min(ratios):.1f}-{max(ratios):.1f}x a forward evaluation for every n where forward mode costs n of them; '
          f'with one input and {m} outputs the directions swap ({fwdmode1_ops:,} vs {revmode1_ops:,} ops)')
