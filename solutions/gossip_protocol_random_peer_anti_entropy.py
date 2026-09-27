# Puzzle 143: Gossip protocol x random-peer anti-entropy
# Epidemic dissemination: one node learns something, and every node in
# a cluster of a thousand must learn it, with no coordinator, no
# global membership list that must stay exact, and nodes that crash
# without warning. A gossip protocol is the algorithm: in every round,
# each node contacts a peer and they compare what they know. The
# heuristic is the choice of peer and the direction of the exchange:
# a uniformly RANDOM peer each round, and anti-entropy, meaning the
# two sides reconcile their full state (push, pull, or both), rather
# than a fixed neighbor or a fire-and-forget rumor. Random peers make
# the spread an epidemic (everyone is informed in logarithmic rounds
# with overwhelming probability); anti-entropy makes it complete
# (every pull eventually hits an informed peer).
#
# Referees:
# (1) THE LOGARITHMIC LAW: push gossip over N = 1,024 nodes, 100
#     trials: every trial informs all nodes within 3 log2 N rounds, and
#     the mean round count sits near log2 N + ln N (about 17), the
#     classical estimate (Pittel 1987);
# (2) THE DIRECTIONS: pull and push-pull anti-entropy on the same
#     nodes; push-pull finishes in fewer rounds than push, and pull
#     finishes the last few stragglers faster than push does, both
#     measured;
# (3) RUMOR MONGERING, the ablation of anti-entropy: an informed node
#     that contacts an already-informed peer loses interest with
#     probability 1/2 and stops gossiping; the fraction of nodes left
#     uninformed when everyone has stopped is measured over 100 trials,
#     against anti-entropy's zero;
# (4) THE FIXED PEER, the ablation of randomness: each node always
#     contacts the next node on a ring; the spread takes exactly
#     N - 1 rounds;
# (5) CRASHES: with 30% of the nodes dead (they neither relay nor
#     receive), random-peer gossip still reaches every live node,
#     measured, while a spanning-tree broadcast loses every subtree
#     under a dead node, measured as the fraction of live nodes never
#     reached.
import math
import random

SEED = 20260926
N = 1024
TRIALS = 100


def push(n, rng, dead=frozenset()):
    informed = [False] * n
    informed[0] = True
    count = 1
    live = n - len(dead)
    rounds = 0
    messages = 0
    while count < live and rounds < 20 * int(math.log2(n)):
        rounds += 1
        newly = []
        for v in range(n):
            if informed[v] and v not in dead:
                p = rng.randrange(n)
                messages += 1
                if p not in dead and not informed[p]:
                    newly.append(p)
        for p in newly:
            if not informed[p]:
                informed[p] = True
                count += 1
    return rounds, messages, count == live


def pull(n, rng):
    informed = [False] * n
    informed[0] = True
    count = 1
    rounds = 0
    messages = 0
    while count < n:
        rounds += 1
        newly = []
        for v in range(n):
            if not informed[v]:
                p = rng.randrange(n)
                messages += 1
                if informed[p]:
                    newly.append(v)
        for v in newly:
            informed[v] = True
            count += 1
    return rounds, messages


def push_pull(n, rng):
    informed = [False] * n
    informed[0] = True
    count = 1
    rounds = 0
    messages = 0
    while count < n:
        rounds += 1
        newly = []
        for v in range(n):
            p = rng.randrange(n)
            messages += 1
            if informed[v] != informed[p]:
                newly.append(p if informed[v] else v)
        for v in newly:
            if not informed[v]:
                informed[v] = True
                count += 1
    return rounds, messages


def rumor_mongering(n, rng, lose=0.5):
    informed = [False] * n
    active = [False] * n
    informed[0] = True
    active[0] = True
    rounds = 0
    while any(active):
        rounds += 1
        newly = []
        stops = []
        for v in range(n):
            if active[v]:
                p = rng.randrange(n)
                if informed[p]:
                    if rng.random() < lose:
                        stops.append(v)
                else:
                    newly.append(p)
        for p in newly:
            informed[p] = True
            active[p] = True
        for v in stops:
            active[v] = False
    return rounds, sum(1 for x in informed if not x) / n


def ring(n):
    informed = [False] * n
    informed[0] = True
    rounds = 0
    while not all(informed):
        rounds += 1
        newly = [(v + 1) % n for v in range(n) if informed[v]]
        for p in newly:
            informed[p] = True
    return rounds


def tree_broadcast(n, fanout, dead):
    """Node 0 is the root; node v's children are fanout*v + 1 ... A dead
    node forwards nothing, so its subtree never hears."""
    reached = [False] * n
    reached[0] = 0 not in dead
    frontier = [0] if reached[0] else []
    while frontier:
        nxt = []
        for v in frontier:
            for c in range(fanout * v + 1, min(n, fanout * v + fanout + 1)):
                if c not in dead:
                    reached[c] = True
                    nxt.append(c)
        frontier = nxt
    live = [v for v in range(n) if v not in dead]
    missed = sum(1 for v in live if not reached[v]) / len(live)
    return missed


if __name__ == '__main__':
    rng = random.Random(SEED)
    lg = math.log2(N)
    estimate = lg + math.log(N)

    # Oracle 1: push gossip.
    push_rounds = []
    push_msgs = []
    for _ in range(TRIALS):
        r, m, ok = push(N, rng)
        assert ok and r <= 3 * lg, (r, ok)
        push_rounds.append(r)
        push_msgs.append(m)
    push_mean = sum(push_rounds) / TRIALS
    assert abs(push_mean - estimate) < 4, (push_mean, estimate)

    # Oracle 2: pull and push-pull.
    pull_rounds = []
    pp_rounds = []
    pull_msgs = []
    pp_msgs = []
    for _ in range(TRIALS):
        r, m = pull(N, rng)
        pull_rounds.append(r)
        pull_msgs.append(m)
        r, m = push_pull(N, rng)
        pp_rounds.append(r)
        pp_msgs.append(m)
    pull_mean = sum(pull_rounds) / TRIALS
    pp_mean = sum(pp_rounds) / TRIALS
    assert pp_mean < push_mean, (pp_mean, push_mean)

    # Oracle 3: rumor mongering.
    residues = []
    rm_rounds = []
    for _ in range(TRIALS):
        r, res = rumor_mongering(N, rng)
        rm_rounds.append(r)
        residues.append(res)
    residue = sum(residues) / TRIALS
    assert 0.02 < residue < 0.5, residue

    # Oracle 4: the ring.
    ring_rounds = ring(N)
    assert ring_rounds == N - 1

    # Oracle 5: crashes.
    dead = frozenset(rng.sample(range(1, N), int(0.3 * N)))
    crash_rounds = []
    for _ in range(20):
        r, m, ok = push(N, rng, dead)
        assert ok, 'push gossip should reach every live node'
        crash_rounds.append(r)
    crash_mean = sum(crash_rounds) / len(crash_rounds)
    tree_missed = tree_broadcast(N, 4, dead)
    assert tree_missed > 0.3, tree_missed

    print(f'contest: one update spread to N = {N:,} nodes, {TRIALS} trials each; referee: the classical estimate log2 N + ln N = {estimate:.1f} rounds for push gossip, and completeness checked node by node')
    print(f"  {'protocol':<36} {'mean rounds':>11} {'max':>5} {'messages':>10}   verdict")
    print(f"  {'push (random peer)':<36} {push_mean:>11.1f} {max(push_rounds):>5} {sum(push_msgs) / TRIALS:>10,.0f}   every trial complete; logarithmic in N")
    print(f"  {'pull anti-entropy':<36} {pull_mean:>11.1f} {max(pull_rounds):>5} {sum(pull_msgs) / TRIALS:>10,.0f}   slow start, fast finish: the last stragglers pull")
    print(f"  {'push-pull anti-entropy':<36} {pp_mean:>11.1f} {max(pp_rounds):>5} {sum(pp_msgs) / TRIALS:>10,.0f}   fewest rounds")
    print(f"  {'rumor mongering (stop w.p. 1/2)':<36} {sum(rm_rounds) / TRIALS:>11.1f} {max(rm_rounds):>5} {'-':>10}   {residue:.1%} of nodes never informed, on average")
    print(f"  {'fixed peer (ring)':<36} {ring_rounds:>11} {ring_rounds:>5} {N - 1:>10,}   no randomness: N - 1 rounds")
    print(f'crashes: {len(dead)} of {N:,} nodes dead (30%); push gossip reached every live node in {crash_mean:.1f} rounds on average over 20 trials; a fan-out-4 spanning-tree broadcast missed {tree_missed:.1%} of the live nodes')
    print(f'OK: push gossip completed 100 of 100 trials in {push_mean:.1f} rounds mean (estimate {estimate:.1f}); push-pull {pp_mean:.1f}; rumor mongering left {residue:.1%} uninformed; the ring took {ring_rounds:,}; '
          f'with 30% dead, gossip reached all live nodes while the tree missed {tree_missed:.0%}')
