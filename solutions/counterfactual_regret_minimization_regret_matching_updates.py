# Puzzle 166: Counterfactual regret minimization x Regret-matching updates
# Imperfect-information equilibria: two players, hidden cards, bets and
# bluffs; find a strategy that cannot be exploited (a Nash equilibrium of
# the extensive-form game). The algorithm is self-play over the game tree:
# every information set accumulates, per action, how much better that
# action would have done than the strategy played, weighted by the
# probability that the OTHER player and chance brought the game there
# (the counterfactual reach). The heuristic is regret matching (Hart and
# Mas-Colell 2000): play each action in proportion to its positive
# cumulative regret, uniformly when none is positive. Zinkevich, Johanson,
# Bowling, and Piccione (2007): average regret <= Delta |I| sqrt(|A|) /
# sqrt(T), so the average strategy is a 2 R / T equilibrium.
#
# Referees: (1) Kuhn poker's exact value -1/18 and closed-form equilibrium
# family (alpha in [0, 1/3]; king bet 3 alpha; queen call 1/3; jack bet
# after check 1/3; queen call after check-bet alpha + 1/3); (2) exact
# exploitability by a best-response traversal, under the measured regret
# bound (R_1 + R_2) / T; (3) rock-paper-scissors (uniform) and biased
# matching pennies (2, -1, -1, 1: heads 2/5, value 1/5); (4) the rivals on
# the same tree in nodes touched: CFR+, outcome-sampling MCCFR, and
# fictitious play (XFP); (5) determinized minimax (perfect-information
# Monte Carlo), its exploitability measured.
#
# AUTHOR CORRECTION: the draft asserted MCCFR would beat vanilla CFR at an
# equal node budget. Measured, the sampled method is noisier at every
# budget tried; the page reports it as the cheaper-per-iteration rival that
# pays in variance.
import math
import random

SEED = 20261010

# ------------------------------------------------------------ the games
# A game is a class with: root(), is_terminal(h), utility(h) for player 0
# (zero-sum: player 1 gets the negative), player(h) in {0, 1, 'c'},
# chance(h) -> list of (outcome, probability), actions(h), infoset(h).
# Histories are tuples.


class KuhnPoker:
    CARDS = (0, 1, 2)  # jack, queen, king

    def root(self):
        return ()

    def player(self, h):
        if len(h) < 2:
            return 'c'
        return (len(h) - 2) % 2

    def chance(self, h):
        if len(h) == 0:
            return [((c,), 1 / 3) for c in self.CARDS]
        return [((c,), 1 / 2) for c in self.CARDS if c != h[0]]

    def actions(self, h):
        return ('p', 'b')  # pass (check or fold), bet (bet or call)

    def is_terminal(self, h):
        if len(h) < 4:
            return False
        acts = h[2:]
        if acts in (('p', 'p'), ('b', 'p'), ('b', 'b')):
            return True
        return acts in (('p', 'b', 'p'), ('p', 'b', 'b'))

    def utility(self, h):
        c0, c1 = h[0], h[1]
        acts = h[2:]
        if acts == ('p', 'p'):
            return 1 if c0 > c1 else -1
        if acts == ('b', 'p'):
            return 1
        if acts == ('p', 'b', 'p'):
            return -1
        return 2 if c0 > c1 else -2  # ('b','b') or ('p','b','b')

    def infoset(self, h):
        p = self.player(h)
        return ('JQK'[h[p]], ''.join(h[2:]))


class MatrixGame:
    """A one-shot simultaneous game as a two-step tree: player 0 moves,
    player 1 moves without seeing it (one information set)."""

    def __init__(self, payoff, labels):
        self.payoff = payoff
        self.labels = labels

    def root(self):
        return ()

    def player(self, h):
        return len(h)

    def chance(self, h):
        return []

    def actions(self, h):
        return tuple(range(len(self.labels)))

    def is_terminal(self, h):
        return len(h) == 2

    def utility(self, h):
        return self.payoff[h[0]][h[1]]

    def infoset(self, h):
        return (len(h),)


# ------------------------------------------------------- strategy tools

def regret_matching(regrets, actions):
    pos = {a: max(regrets.get(a, 0.0), 0.0) for a in actions}
    total = sum(pos.values())
    if total <= 0:
        return {a: 1 / len(actions) for a in actions}
    return {a: pos[a] / total for a in actions}


def normalize(strategy_sum, actions):
    total = sum(strategy_sum.get(a, 0.0) for a in actions)
    if total <= 0:
        return {a: 1 / len(actions) for a in actions}
    return {a: strategy_sum.get(a, 0.0) / total for a in actions}


def enumerate_histories(game):
    out = []
    stack = [game.root()]
    while stack:
        h = stack.pop()
        out.append(h)
        if game.is_terminal(h):
            continue
        if game.player(h) == 'c':
            for o, _ in game.chance(h):
                stack.append(h + o)
        else:
            for a in game.actions(h):
                stack.append(h + (a,))
    return out


def game_value(game, sigma, h=None):
    """Expected utility for player 0 under the profile sigma (a dict
    infoset -> {action: prob}, uniform where missing)."""
    if h is None:
        h = game.root()
    if game.is_terminal(h):
        return game.utility(h)
    p = game.player(h)
    if p == 'c':
        return sum(q * game_value(game, sigma, h + o) for o, q in game.chance(h))
    acts = game.actions(h)
    s = sigma.get(game.infoset(h), {a: 1 / len(acts) for a in acts})
    return sum(s[a] * game_value(game, sigma, h + (a,)) for a in acts)


def best_response_value(game, sigma, i):
    """Best-response value for player i against sigma; each information set
    decides once, by the counterfactual-reach-weighted sum over its histories."""
    cf = {}
    members = {}

    def reach(h, w):
        cf[h] = w
        if game.is_terminal(h):
            return
        p = game.player(h)
        if p == 'c':
            for o, q in game.chance(h):
                reach(h + o, w * q)
        elif p == i:
            members.setdefault(game.infoset(h), []).append(h)
            for a in game.actions(h):
                reach(h + (a,), w)
        else:
            acts = game.actions(h)
            s = sigma.get(game.infoset(h), {a: 1 / len(acts) for a in acts})
            for a in acts:
                reach(h + (a,), w * s[a])

    reach(game.root(), 1.0)
    sign = 1 if i == 0 else -1
    choice = {}
    memo = {}

    def W(h):
        if h in memo:
            return memo[h]
        if game.is_terminal(h):
            v = cf[h] * sign * game.utility(h)
        else:
            p = game.player(h)
            if p == 'c':
                v = sum(W(h + o) for o, _ in game.chance(h))
            elif p == i:
                I = game.infoset(h)
                if I not in choice:
                    best, best_v = None, -math.inf
                    for a in game.actions(h):
                        tot = sum(W(g + (a,)) for g in members[I])
                        if tot > best_v:
                            best, best_v = a, tot
                    choice[I] = best
                v = W(h + (choice[I],))
            else:
                v = sum(W(h + (a,)) for a in game.actions(h))
        memo[h] = v
        return v

    return W(game.root()), choice


def exploitability(game, sigma):
    b0, _ = best_response_value(game, sigma, 0)
    b1, _ = best_response_value(game, sigma, 1)
    return (b0 + b1) / 2


# ------------------------------------------------------------ vanilla CFR

class CFR:
    def __init__(self, game):
        self.game = game
        self.regret = {}
        self.strategy_sum = {}
        self.nodes = 0
        self.t = 0

    def sigma_now(self, I, acts):
        return regret_matching(self.regret.setdefault(I, {}), acts)

    def average(self):
        g = self.game
        return {I: normalize(s, g.actions(h)) for I, (s, h) in self.strategy_sum.items()}

    def iterate(self):
        self.t += 1
        self._cfr(self.game.root(), 1.0, 1.0, 1.0)

    def _cfr(self, h, p0, p1, pc):
        g = self.game
        self.nodes += 1
        if g.is_terminal(h):
            return g.utility(h)
        p = g.player(h)
        if p == 'c':
            return sum(q * self._cfr(h + o, p0, p1, pc * q) for o, q in g.chance(h))
        acts = g.actions(h)
        I = g.infoset(h)
        s = self.sigma_now(I, acts)
        vals = {a: self._cfr(h + (a,), p0 * (s[a] if p == 0 else 1), p1 * (s[a] if p == 1 else 1), pc) for a in acts}
        v = sum(s[a] * vals[a] for a in acts)
        own = p0 if p == 0 else p1
        opp = (p1 if p == 0 else p0) * pc
        sign = 1 if p == 0 else -1
        R = self.regret[I]
        for a in acts:
            R[a] = R.get(a, 0.0) + opp * sign * (vals[a] - v)
        S = self.strategy_sum.setdefault(I, ({}, h))[0]
        for a in acts:
            S[a] = S.get(a, 0.0) + own * s[a]
        return v

    def positive_regret(self, player):
        g = self.game
        total = 0.0
        for I, (_, h) in self.strategy_sum.items():
            if g.player(h) == player:
                total += max(max(self.regret[I].values()), 0.0)
        return total


# ------------------------------------------------------------------ CFR+

class CFRPlus(CFR):
    """Tammelin 2014: regrets floored at zero, alternating updates, linear
    averaging."""

    def iterate(self):
        self.t += 1
        for player in (0, 1):
            self._cfrp(self.game.root(), 1.0, 1.0, 1.0, player)

    def _cfrp(self, h, p0, p1, pc, upd):
        g = self.game
        self.nodes += 1
        if g.is_terminal(h):
            return g.utility(h)
        p = g.player(h)
        if p == 'c':
            return sum(q * self._cfrp(h + o, p0, p1, pc * q, upd) for o, q in g.chance(h))
        acts = g.actions(h)
        I = g.infoset(h)
        s = self.sigma_now(I, acts)
        vals = {a: self._cfrp(h + (a,), p0 * (s[a] if p == 0 else 1), p1 * (s[a] if p == 1 else 1), pc, upd) for a in acts}
        v = sum(s[a] * vals[a] for a in acts)
        if p == upd:
            opp = (p1 if p == 0 else p0) * pc
            own = p0 if p == 0 else p1
            sign = 1 if p == 0 else -1
            R = self.regret[I]
            for a in acts:
                R[a] = max(R.get(a, 0.0) + opp * sign * (vals[a] - v), 0.0)
            S = self.strategy_sum.setdefault(I, ({}, h))[0]
            for a in acts:
                S[a] = S.get(a, 0.0) + self.t * own * s[a]
        return v


# ------------------------------------------------- outcome-sampling MCCFR

class OutcomeSamplingMCCFR(CFR):
    """Lanctot et al. 2009: one sampled trajectory per iteration, epsilon
    exploration for the traverser, regrets divided by the sampling probability."""

    def __init__(self, game, rng, epsilon=0.6):
        super().__init__(game)
        self.rng = rng
        self.eps = epsilon

    def iterate(self):
        self.t += 1
        for i in (0, 1):
            self._walk(self.game.root(), i, 1.0, 1.0, 1.0)

    def _walk(self, h, i, pi_i, pi_o, s):
        g = self.game
        self.nodes += 1
        if g.is_terminal(h):
            u = g.utility(h) * (1 if i == 0 else -1)
            return u / s, 1.0
        p = g.player(h)
        if p == 'c':
            outs = g.chance(h)
            r = self.rng.random()
            acc = 0.0
            for o, q in outs:
                acc += q
                if r < acc:
                    return self._walk(h + o, i, pi_i, pi_o * q, s * q)
            o, q = outs[-1]
            return self._walk(h + o, i, pi_i, pi_o * q, s * q)
        acts = g.actions(h)
        I = g.infoset(h)
        sigma = self.sigma_now(I, acts)
        if p == i:
            probs = {a: self.eps / len(acts) + (1 - self.eps) * sigma[a] for a in acts}
        else:
            probs = sigma
        r = self.rng.random()
        acc = 0.0
        chosen = acts[-1]
        for a in acts:
            acc += probs[a]
            if r < acc:
                chosen = a
                break
        q = probs[chosen]
        if p == i:
            u, tail = self._walk(h + (chosen,), i, pi_i * sigma[chosen], pi_o, s * q)
            W = u * pi_o
            R = self.regret[I]
            for a in acts:
                if a == chosen:
                    R[a] = R.get(a, 0.0) + W * tail * (1 - sigma[a])
                else:
                    R[a] = R.get(a, 0.0) - W * tail * sigma[chosen]
            return u, tail * sigma[chosen]
        u, tail = self._walk(h + (chosen,), i, pi_i, pi_o * sigma[chosen], s * q)
        S = self.strategy_sum.setdefault(I, ({}, h))[0]
        for a in acts:
            S[a] = S.get(a, 0.0) + (pi_o / s) * sigma[a]
        return u, tail


# -------------------------------------------------- fictitious play (XFP)

def own_reach(game, sigma, player):
    """Each information set's reach probability under the player's OWN
    actions only (perfect recall makes it a property of the set)."""
    out = {}

    def walk(h, w):
        if game.is_terminal(h):
            return
        p = game.player(h)
        if p == 'c':
            for o, _ in game.chance(h):
                walk(h + o, w)
            return
        acts = game.actions(h)
        if p == player:
            I = game.infoset(h)
            out[I] = w
            s = sigma.get(I, {a: 1 / len(acts) for a in acts})
            for a in acts:
                walk(h + (a,), w * s[a])
        else:
            for a in acts:
                walk(h + (a,), w)

    walk(game.root(), 1.0)
    return out


class FictitiousPlay:
    """Extensive-form fictitious play (Heinrich, Lanctot, Silver 2015): best
    responses to the average, mixed in by 1 / t in sequence form
    (realization-weighted behavioral mixing)."""

    def __init__(self, game):
        self.game = game
        self.sigma = {}
        self.t = 0
        self.nodes = 0

    def average(self):
        return self.sigma

    def iterate(self):
        g = self.game
        self.t += 1
        eta = 1 / self.t
        new = dict(self.sigma)
        for i in (0, 1):
            _, choice = best_response_value(g, self.sigma, i)
            self.nodes += len(enumerate_histories(g))
            beta = {}
            for I, a in choice.items():
                acts = g.actions(next(h for h in enumerate_histories(g) if not g.is_terminal(h) and g.player(h) == i and g.infoset(h) == I))
                beta[I] = {b: 1.0 if b == a else 0.0 for b in acts}
            x_old = own_reach(g, self.sigma, i)
            x_new = own_reach(g, beta, i)
            for I, b in beta.items():
                acts = list(b)
                old = self.sigma.get(I, {a: 1 / len(acts) for a in acts})
                wo = (1 - eta) * x_old.get(I, 0.0)
                wn = eta * x_new.get(I, 0.0)
                if wo + wn <= 0:
                    continue
                new[I] = {a: (wo * old[a] + wn * b[a]) / (wo + wn) for a in acts}
        self.sigma = new


# ---------------------------------------- determinized minimax (PIMC)

def determinized_minimax_strategy(game):
    """Perfect-information Monte Carlo: solve each consistent deal with all
    cards face up, average the action values, play the best one."""

    def pi_value(h, player):
        if game.is_terminal(h):
            return game.utility(h) * (1 if player == 0 else -1)
        p = game.player(h)
        if p == 'c':
            return sum(q * pi_value(h + o, player) for o, q in game.chance(h))
        vals = [pi_value(h + (a,), player) for a in game.actions(h)]
        return max(vals) if p == player else min(vals)

    members = {}
    for h in enumerate_histories(game):
        if not game.is_terminal(h) and game.player(h) != 'c':
            members.setdefault(game.infoset(h), []).append(h)
    sigma = {}
    for I, hs in members.items():
        p = game.player(hs[0])
        acts = game.actions(hs[0])
        avg = {a: sum(pi_value(h + (a,), p) for h in hs) / len(hs) for a in acts}
        best = max(acts, key=lambda a: avg[a])
        sigma[I] = {a: 1.0 if a == best else 0.0 for a in acts}
    return sigma


# ------------------------------------------------------------------ main

def run_cfr(game, solver, iterations, checkpoints):
    trace = {}
    for t in range(1, iterations + 1):
        solver.iterate()
        if t in checkpoints:
            trace[t] = exploitability(game, solver.average())
    return trace


def main():
    rng = random.Random(SEED)
    kuhn = KuhnPoker()
    histories = enumerate_histories(kuhn)
    infosets = {kuhn.infoset(h) for h in histories if not kuhn.is_terminal(h) and kuhn.player(h) != 'c'}

    # Oracle 1 and 2: vanilla CFR on Kuhn poker against the closed form.
    T = 10000
    checkpoints = {10, 100, 1000, 10000}
    cfr = CFR(kuhn)
    trace = run_cfr(kuhn, cfr, T, checkpoints)
    avg = cfr.average()
    value = game_value(kuhn, avg)
    expl = trace[T]
    assert abs(value - (-1 / 18)) < 0.01, value
    assert expl < 0.01, expl
    r0, r1 = cfr.positive_regret(0), cfr.positive_regret(1)
    bound = (r0 + r1) / T
    assert expl <= bound + 1e-9, (expl, bound)
    delta = 2.0  # the utility range of Kuhn poker is [-2, 2], so Delta = 4 / 2 per player? Use the conservative 4.
    theorem = 4.0 * len([I for I in infosets if I[1] in ('', 'pb')]) * math.sqrt(2) / math.sqrt(T)
    assert r0 / T <= theorem and r1 / T <= theorem, (r0 / T, r1 / T, theorem)
    # the equilibrium family
    alpha = avg[('J', '')]['b']
    assert 0 <= alpha <= 1 / 3 + 0.02, alpha
    assert abs(avg[('K', '')]['b'] - 3 * alpha) < 0.05, (avg[('K', '')]['b'], 3 * alpha)
    assert abs(avg[('Q', 'b')]['b'] - 1 / 3) < 0.05, avg[('Q', 'b')]['b']
    assert abs(avg[('J', 'p')]['b'] - 1 / 3) < 0.05, avg[('J', 'p')]['b']
    assert abs(avg[('Q', 'pb')]['b'] - (alpha + 1 / 3)) < 0.05, avg[('Q', 'pb')]['b']
    assert avg[('K', 'b')]['b'] > 0.99 and avg[('J', 'b')]['b'] < 0.01
    assert trace[10] > trace[100] > trace[1000] > trace[10000]

    # Oracle 3: the matrix games.
    rps = MatrixGame([[0, -1, 1], [1, 0, -1], [-1, 1, 0]], ('rock', 'paper', 'scissors'))
    c = CFR(rps)
    for _ in range(20000):
        c.iterate()
    a = c.average()
    assert all(abs(a[(0,)][k] - 1 / 3) < 0.01 for k in range(3)), a[(0,)]
    assert all(abs(a[(1,)][k] - 1 / 3) < 0.01 for k in range(3)), a[(1,)]
    assert exploitability(rps, a) < 0.01
    pennies = MatrixGame([[2, -1], [-1, 1]], ('heads', 'tails'))
    c2 = CFR(pennies)
    for _ in range(20000):
        c2.iterate()
    a2 = c2.average()
    assert abs(a2[(0,)][0] - 0.4) < 0.01, a2[(0,)]
    assert abs(game_value(pennies, a2) - 0.2) < 0.01, game_value(pennies, a2)
    assert exploitability(pennies, a2) < 0.01

    # Oracle 4: the rivals on the Kuhn tree. One currency: nodes touched.
    plus = CFRPlus(kuhn)
    trace_plus = run_cfr(kuhn, plus, 1000, {10, 100, 1000})
    assert trace_plus[1000] < trace[1000], (trace_plus[1000], trace[1000])
    assert trace_plus[100] < trace[100]
    nodes_per_cfr_iter = cfr.nodes / T
    mc = OutcomeSamplingMCCFR(kuhn, random.Random(SEED + 1))
    budget_nodes = int(1000 * nodes_per_cfr_iter)  # the nodes CFR spends in 1,000 iterations
    mc_trace = {}
    while mc.nodes < budget_nodes:
        mc.iterate()
        if mc.t in (1000, 5000, 10000):
            mc_trace[mc.t] = exploitability(kuhn, mc.average())
    mc_final = exploitability(kuhn, mc.average())
    mc_iters = mc.t
    fp = FictitiousPlay(kuhn)
    fp_trace = {}
    for t in range(1, 1001):
        fp.iterate()
        if t in (10, 100, 1000):
            fp_trace[t] = exploitability(kuhn, fp.average())
    assert fp_trace[1000] > trace[1000], (fp_trace[1000], trace[1000])
    assert fp_trace[1000] < fp_trace[10]
    assert mc_final < 0.1 and mc_final > trace[1000]

    # Oracle 5: determinized minimax, exploitability measured.
    pimc = determinized_minimax_strategy(kuhn)
    pimc_expl = exploitability(kuhn, pimc)
    br0_vs_pimc, _ = best_response_value(kuhn, pimc, 0)  # player one exploiting player two's PIMC
    br1_vs_pimc, br_vs_pimc = best_response_value(kuhn, pimc, 1)  # player two exploiting player one's PIMC
    assert pimc_expl > 0.1 and pimc_expl > 10 * trace[1000], (pimc_expl, trace[1000])
    assert br1_vs_pimc >= 1 / 18 - 1e-9 and br0_vs_pimc >= -1 / 18 - 1e-9

    print('contest: Kuhn poker (12 information sets, 58 histories), exact value -1/18; currency: nodes touched; referee: exact best response (exploitability) and the closed-form family')
    print(f'vanilla CFR, {T:,} iterations ({cfr.nodes:,} nodes): value {value:+.4f}, exploitability {expl:.5f}; positive regret per iteration {r0 / T:.5f} + {r1 / T:.5f} = {bound:.5f} (the theorem bound {theorem:.3f})')
    print(f'  exploitability by iteration: ' + ', '.join(f'T={t}: {trace[t]:.4f}' for t in sorted(trace)))
    print(f'  family: alpha = P(bet|J) {alpha:.3f}; P(bet|K) {avg[("K", "")]["b"]:.3f} (3 alpha {3 * alpha:.3f}); P(call|Q,bet) {avg[("Q", "b")]["b"]:.3f} (1/3); '
          f'P(bet|J,check) {avg[("J", "p")]["b"]:.3f} (1/3); P(call|Q,check-bet) {avg[("Q", "pb")]["b"]:.3f} (alpha + 1/3 = {alpha + 1 / 3:.3f})')
    print(f'rock-paper-scissors, 20,000 iterations: row {tuple(round(a[(0,)][k], 3) for k in range(3))}, exploitability {exploitability(rps, a):.4f}; pennies: P(heads) {a2[(0,)][0]:.3f} (2/5), value {game_value(pennies, a2):.3f} (1/5)')
    print(f'{"method":>34} {"iterations":>10} {"nodes":>10} {"exploitability":>14}')
    print(f'{"CFR (regret matching)":>34} {1000:>10,} {int(1000 * nodes_per_cfr_iter):>10,} {trace[1000]:>14.4f}')
    print(f'{"CFR+":>34} {1000:>10,} {plus.nodes:>10,} {trace_plus[1000]:>14.4f}')
    print(f'{"outcome-sampling MCCFR":>34} {mc_iters:>10,} {mc.nodes:>10,} {mc_final:>14.4f}')
    print(f'{"fictitious play (XFP)":>34} {1000:>10,} {fp.nodes:>10,} {fp_trace[1000]:>14.4f}')
    print(f'{"determinized minimax (PIMC)":>34} {"-":>10} {"-":>10} {pimc_expl:>14.4f}')
    print('  CFR+: ' + ', '.join(f'T={t}: {trace_plus[t]:.4f}' for t in sorted(trace_plus)) + '; fictitious play: ' + ', '.join(f'T={t}: {fp_trace[t]:.4f}' for t in sorted(fp_trace))
          + '; MCCFR: ' + ', '.join(f'T={t}: {mc_trace[t]:.4f}' for t in sorted(mc_trace)))
    print(f'  determinized minimax (deterministic at every information set): player one loses {br1_vs_pimc:.3f} per hand to a best response (equilibrium {1 / 18:.4f}), '
          f'player two loses {br0_vs_pimc:.3f}; the best response to it: {br_vs_pimc}')
    print(f'OK: CFR on Kuhn poker: value {value:+.4f} (exact -0.0556), exploitability {expl:.4f} after {T:,} iterations inside the regret bound {bound:.4f}, on the closed-form family (alpha {alpha:.2f}); '
          f'at 1,000 iterations CFR {trace[1000]:.4f}, CFR+ {trace_plus[1000]:.4f}, fictitious play {fp_trace[1000]:.4f}; MCCFR {mc_final:.4f} at an equal node budget; determinized minimax exploitable for {pimc_expl:.3f}')


if __name__ == '__main__':
    main()
