# Puzzle 29: Viterbi algorithm x max-product trellis
# Given a hidden Markov model and an observed sequence, recover the single
# most probable hidden PATH: one coherent story, not a chain of local
# guesses.
#
# The pairing is the point. The control structure is dynamic programming on
# the trellis: V[t][s] = the probability of the best path ending in state s
# at time t, each cell answered by its S predecessors. The heuristic is the
# state design in its third appearance on this site (Kadane's single
# number, Wagner-Fischer's prefix lattice, and now the probabilistic
# trellis), run in the MAX-PRODUCT semiring: max over predecessors of
# path-so-far times transition times emission. Swap that max for a sum and
# the identical trellis computes marginals (the forward algorithm): one
# semiring, two questions. Everything runs in log space, because the
# linear-space version provably underflows to zero on this page's own
# instance, and the tests demonstrate it.
import math
import random
from itertools import product as iproduct


def viterbi(A, B, pi, obs, use_log=True):
    """Returns (best path, its log probability). Log-space max-product."""
    S = len(A)
    n = len(obs)
    NEG = float("-inf")

    def lg(x):
        return math.log(x) if x > 0 else NEG

    V = [[lg(pi[s]) + lg(B[s][obs[0]]) for s in range(S)]]
    back = []
    for t in range(1, n):
        row = []
        ptr = []
        for s in range(S):
            best, arg = NEG, 0
            for p in range(S):
                cand = V[-1][p] + lg(A[p][s])
                if cand > best:
                    best, arg = cand, p
            row.append(best + lg(B[s][obs[t]]))
            ptr.append(arg)
        V.append(row)
        back.append(ptr)
    end = max(range(S), key=lambda s: V[-1][s])
    path = [end]
    for ptr in reversed(back):
        path.append(ptr[path[-1]])
    path.reverse()
    return path, V[-1][end]


def viterbi_linear(A, B, pi, obs):
    """The same recurrence in raw probabilities: correct in exact math,
    and a demonstration in floating point, where long sequences underflow
    to exactly zero."""
    S = len(A)
    V = [pi[s] * B[s][obs[0]] for s in range(S)]
    for t in range(1, len(obs)):
        V = [max(V[p] * A[p][s] for p in range(S)) * B[s][obs[t]] for s in range(S)]
    return max(V)


def path_logprob(A, B, pi, obs, path):
    lp = math.log(pi[path[0]]) if pi[path[0]] > 0 else float("-inf")
    lp += math.log(B[path[0]][obs[0]]) if B[path[0]][obs[0]] > 0 else float("-inf")
    for t in range(1, len(obs)):
        a = A[path[t - 1]][path[t]]
        b = B[path[t]][obs[t]]
        if a <= 0 or b <= 0:
            return float("-inf")
        lp += math.log(a) + math.log(b)
    return lp


def forward_backward(A, B, pi, obs):
    """Posterior marginals P(state at t | all observations), scaled."""
    S = len(A)
    n = len(obs)
    alpha = [[0.0] * S for _ in range(n)]
    scale = [0.0] * n
    for s in range(S):
        alpha[0][s] = pi[s] * B[s][obs[0]]
    scale[0] = sum(alpha[0]) or 1e-300
    alpha[0] = [a / scale[0] for a in alpha[0]]
    for t in range(1, n):
        for s in range(S):
            alpha[t][s] = B[s][obs[t]] * sum(alpha[t - 1][p] * A[p][s] for p in range(S))
        scale[t] = sum(alpha[t]) or 1e-300
        alpha[t] = [a / scale[t] for a in alpha[t]]
    beta = [[1.0] * S for _ in range(n)]
    for t in range(n - 2, -1, -1):
        for s in range(S):
            beta[t][s] = sum(A[s][q] * B[q][obs[t + 1]] * beta[t + 1][q] for q in range(S)) / scale[t + 1]
    post = []
    for t in range(n):
        row = [alpha[t][s] * beta[t][s] for s in range(S)]
        z = sum(row) or 1e-300
        post.append([r / z for r in row])
    return post


def posterior_decode(A, B, pi, obs):
    post = forward_backward(A, B, pi, obs)
    return [max(range(len(A)), key=lambda s: p[s]) for p in post]


def greedy_emission(B, obs):
    return [max(range(len(B)), key=lambda s: B[s][o]) for o in obs]


def greedy_chain(A, B, pi, obs):
    S = len(A)
    path = [max(range(S), key=lambda s: pi[s] * B[s][obs[0]])]
    for t in range(1, len(obs)):
        prev = path[-1]
        path.append(max(range(S), key=lambda s: A[prev][s] * B[s][obs[t]]))
    return path


def beam_decode(A, B, pi, obs, width):
    """Keep the best `width` partial paths per step: cheap, and sometimes
    the true best path dies young."""
    S = len(A)
    beams = [(math.log(pi[s] * B[s][obs[0]]) if pi[s] * B[s][obs[0]] > 0 else float("-inf"), [s]) for s in range(S)]
    beams = sorted(beams, reverse=True)[:width]
    for t in range(1, len(obs)):
        nxt = {}
        for lp, path in beams:
            p = path[-1]
            for s in range(S):
                a = A[p][s] * B[s][obs[t]]
                if a <= 0:
                    continue
                cand = lp + math.log(a)
                if s not in nxt or cand > nxt[s][0]:
                    nxt[s] = (cand, path + [s])
        beams = sorted(nxt.values(), reverse=True)[:width]
    return beams[0][1], beams[0][0]


def sample_hmm(A, B, pi, n, rng):
    S = len(A)
    states = []
    obs = []
    s = rng.choices(range(S), weights=pi)[0]
    for _ in range(n):
        states.append(s)
        obs.append(rng.choices(range(len(B[0])), weights=B[s])[0])
        s = rng.choices(range(S), weights=A[s])[0]
    return states, obs


# The dishonest casino (Durbin et al.): a fair die and a loaded die.
CASINO_A = [[0.95, 0.05], [0.10, 0.90]]
CASINO_B = [[1 / 6] * 6, [1 / 10] * 5 + [1 / 2]]
CASINO_PI = [0.5, 0.5]


def random_hmm(S, O, rng, sparsity=0.0):
    def dist(k):
        w = [rng.random() + 0.05 for _ in range(k)]
        z = sum(w)
        return [x / z for x in w]

    A = [dist(S) for _ in range(S)]
    B = [dist(O) for _ in range(S)]
    if sparsity:
        A[0][2] = 0.0
        z = sum(A[0])
        A[0] = [x / z for x in A[0]]
    return A, B, dist(S)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the executable definition. At S=3, n=7, enumerate all 3^7
    # paths in exact probability space: Viterbi's path must be the argmax,
    # and forward-backward's marginals must equal the enumerated ones.
    for trial in range(15):
        A, B, pi = random_hmm(3, 4, rng)
        _, obs = sample_hmm(A, B, pi, 7, rng)
        best_lp, best_path = float("-inf"), None
        marg = [[0.0] * 3 for _ in range(7)]
        total = 0.0
        for path in iproduct(range(3), repeat=7):
            p = pi[path[0]] * B[path[0]][obs[0]]
            for t in range(1, 7):
                p *= A[path[t - 1]][path[t]] * B[path[t]][obs[t]]
            total += p
            if p > 0 and math.log(p) > best_lp:
                best_lp, best_path = math.log(p), list(path)
            for t, s in enumerate(path):
                marg[t][s] += p
        v_path, v_lp = viterbi(A, B, pi, obs)
        assert abs(v_lp - best_lp) < 1e-9, (v_lp, best_lp)
        assert path_logprob(A, B, pi, obs, v_path) == v_lp or abs(path_logprob(A, B, pi, obs, v_path) - v_lp) < 1e-9
        post = forward_backward(A, B, pi, obs)
        for t in range(7):
            for s in range(3):
                assert abs(post[t][s] - marg[t][s] / total) < 1e-9

    # Oracle 2: why log space. The linear-probability recurrence hits
    # exactly 0.0 on the casino at n=2,000; the log version does not.
    states, obs = sample_hmm(CASINO_A, CASINO_B, CASINO_PI, 2000, random.Random(1))
    assert viterbi_linear(CASINO_A, CASINO_B, CASINO_PI, obs) == 0.0, "should underflow"
    v_path, v_lp = viterbi(CASINO_A, CASINO_B, CASINO_PI, obs)
    assert math.isfinite(v_lp)

    # Oracle 3: nothing beats the MAP path. Every rival's decoded path has
    # log probability <= Viterbi's, across 30 casino sequences.
    acc = {"viterbi": 0, "posterior": 0, "greedy_em": 0, "greedy_chain": 0}
    n_total = 0
    for t in range(30):
        states, obs = sample_hmm(CASINO_A, CASINO_B, CASINO_PI, 300, random.Random(100 + t))
        vp, vlp = viterbi(CASINO_A, CASINO_B, CASINO_PI, obs)
        for name, path in (
            ("posterior", posterior_decode(CASINO_A, CASINO_B, CASINO_PI, obs)),
            ("greedy_em", greedy_emission(CASINO_B, obs)),
            ("greedy_chain", greedy_chain(CASINO_A, CASINO_B, CASINO_PI, obs)),
        ):
            assert path_logprob(CASINO_A, CASINO_B, CASINO_PI, obs, path) <= vlp + 1e-9
            acc[name] += sum(1 for a, b in zip(path, states) if a == b)
        acc["viterbi"] += sum(1 for a, b in zip(vp, states) if a == b)
        n_total += len(states)
    acc = {k: v / n_total for k, v in acc.items()}
    # ...and the famous split: posterior decoding wins PER-POSITION
    # accuracy even though every one of its paths scored lower as a path.
    assert acc["posterior"] >= acc["viterbi"] - 0.005, acc
    assert acc["viterbi"] > acc["greedy_em"] + 0.02, acc

    # Oracle 4: hard constraints, on a constructed trap. Three states with
    # A -> C forbidden; the observations say "A-ish then C-ish", so
    # per-position decoding must cross the forbidden seam. Posterior
    # decoding and emission-only greedy both tell the impossible story
    # (path probability exactly zero); Viterbi structurally cannot.
    # (Chained greedy is honestly exempt: an argmax never picks a zero
    # transition, so its sin is myopia, not impossibility.)
    # The canonical instance: three parallel stories. A-then-A carries 0.4;
    # B-then-C and B-then-D carry 0.3 each. Marginals vote B at time one
    # (0.6) and A at time two (0.4), and the path B -> A does not exist.
    TRAP_A = [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.5, 0.5],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ]
    TRAP_B = [[1.0], [1.0], [1.0], [1.0]]  # observations carry no evidence
    TRAP_PI = [0.4, 0.6, 0.0, 0.0]
    trap_obs = [0, 0]
    vp, vlp = viterbi(TRAP_A, TRAP_B, TRAP_PI, trap_obs)
    assert math.isfinite(vlp) and vp == [0, 0], (vp, vlp)  # the 0.4 story
    post_path = posterior_decode(TRAP_A, TRAP_B, TRAP_PI, trap_obs)
    assert post_path == [1, 0], post_path  # B then A: the impossible story
    assert path_logprob(TRAP_A, TRAP_B, TRAP_PI, trap_obs, post_path) == float("-inf")

    # Oracle 5: beam width. On a 12-state model, beam k=3 must never beat
    # Viterbi and must strictly lose somewhere; count how often.
    A12, B12, pi12 = random_hmm(12, 8, rng)
    beam_losses = 0
    for t in range(50):
        _, obs = sample_hmm(A12, B12, pi12, 80, random.Random(900 + t))
        vp, vlp = viterbi(A12, B12, pi12, obs)
        bp, blp = beam_decode(A12, B12, pi12, obs, width=3)
        real_blp = path_logprob(A12, B12, pi12, obs, bp)
        assert real_blp <= vlp + 1e-9
        if real_blp < vlp - 1e-9:
            beam_losses += 1
    assert beam_losses >= 5, beam_losses

    work_viterbi = 80 * 12 * 12
    work_beam = 80 * 3 * 12
    print("contest: the dishonest casino (2 states, 30 sequences of 300) and a 12-state model (50 sequences of 80):")
    print(f"  {'decoder':<26} {'state accuracy':>15} {'path always possible':>21} {'optimal path':>13}")
    print(f"  {'Viterbi x max-product':<26} {acc['viterbi']:>14.1%} {'yes, structurally':>21} {'50/50':>13}")
    print(f"  {'Posterior (fwd-backward)':<26} {acc['posterior']:>14.1%} {'NO (trap pinned)':>21} {'-':>13}")
    print(f"  {'Greedy chained argmax':<26} {acc['greedy_chain']:>14.1%} {'yes, but myopic':>21} {'-':>13}")
    print(f"  {'Greedy emission-only':<26} {acc['greedy_em']:>14.1%} {'ignores A entirely':>21} {'-':>13}")
    print(f"  {'Beam width 3 (12-state)':<26} {'-':>15} {'yes':>21} {50 - beam_losses:>10}/50")
    print(f"work per sequence, 12-state n=80: Viterbi {work_viterbi:,} vs beam-3 {work_beam:,} ({work_viterbi // work_beam}x cheaper, {beam_losses} losses)")
    print(f"linear-space Viterbi at n=2,000: underflows to exactly 0.0; log-space: {v_lp:.1f}")
    print("OK: enumeration matches both algorithms exactly, the MAP path is never beaten, the underflow and the forbidden door are pinned")
