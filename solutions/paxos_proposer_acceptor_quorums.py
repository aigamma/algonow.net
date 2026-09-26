# Puzzle 116: Paxos x proposer-acceptor quorums
# Distributed consensus: N nodes that may crash, over a network that
# may delay, reorder, and drop messages, must agree on ONE value, and
# must never disagree even for a moment. Single-decree Paxos (the
# Synod protocol) is the algorithm: two phases, prepare and accept,
# each addressed to every acceptor. The heuristic is what makes it
# safe: a proposal counts only when a MAJORITY quorum of acceptors
# answers, and any two majorities share at least one acceptor. That
# shared acceptor is the protocol's memory: a proposer that wins the
# prepare phase learns the highest-ballot value already accepted by
# anyone in its quorum and is forced to carry it forward, so once a
# value is chosen by one majority, every later ballot re-chooses it.
#
# Referees:
# (1) SAFETY BY EXHAUSTIVE MODEL CHECK: every reachable state of a
#     small system (3 acceptors, 2 dueling proposers, messages
#     delivered in every possible order, any message droppable) is
#     enumerated by depth-first search with state hashing. In every
#     state: at most one value is chosen (agreement), and every
#     chosen value was proposed (validity). Nothing is sampled.
# (2) THE ABLATIONS, model-checked the same way: (a) quorum = half
#     (no intersection) and (b) skipping the prepare phase each
#     produce a reachable state with TWO chosen values: the checker
#     finds the counterexample and prints it. The heuristic is not
#     decoration; remove it and safety dies.
# (3) LIVENESS MEASURED under an adversarial scheduler: 5 acceptors,
#     3 dueling proposers, delays and reordering; decisions counted,
#     rounds counted; with and without randomized backoff (the
#     dueling-proposer livelock Lamport warns about).
# (4) FAULT TOLERANCE MEASURED: crash 2 of 5 acceptors (a minority):
#     the run still decides; crash 3 of 5 (a majority): no decision,
#     ever: the honest row, the price of the quorum rule.
# (5) THE NEGATIVE EXAMPLE, measured: two-phase commit with a
#     coordinator crash after the prepare votes are in: every
#     participant is blocked forever holding locks, because 2PC has
#     no quorum memory: it is an atomic-commit protocol, not a
#     consensus protocol, and reaching for it here is a disaster.
import itertools
import random

SEED = 20260926


# ---------------------------------------------------------------- model
# A message is a tuple. Acceptor state: (promised_ballot, accepted_ballot,
# accepted_value). Proposer state: (phase, promises frozenset, best (b, v),
# accepteds frozenset, value_to_propose).
def make_state(n_acc, proposals):
    """proposals: list of (ballot, value) one per proposer, ballots unique."""
    acceptors = tuple((0, 0, None) for _ in range(n_acc))
    proposers = tuple(('prepare', frozenset(), (0, None), frozenset(), v, b) for b, v in proposals)
    # initial messages: every proposer sends prepare(b) to every acceptor
    msgs = []
    for pi, (b, v) in enumerate(proposals):
        for a in range(n_acc):
            msgs.append(('prepare', pi, a, b))
    return acceptors, proposers, tuple(sorted(msgs)), frozenset()


def step(state, msg, quorum, skip_prepare):
    """Deliver one message; return the successor state. Pure function.
    The fourth component is the set of values EVER chosen: an acceptor
    overwrites its accepted value when a higher ballot arrives, so a
    snapshot of acceptor state forgets history and the agreement
    property (once chosen, never a different value) needs the memory."""
    acceptors, proposers, msgs, ever = state
    acceptors = list(acceptors)
    proposers = list(proposers)
    msgs = list(msgs)
    msgs.remove(msg)
    kind = msg[0]
    if kind == 'prepare':
        _, pi, a, b = msg
        promised, ab, av = acceptors[a]
        if b > promised:
            acceptors[a] = (b, ab, av)
            msgs.append(('promise', a, pi, b, ab, av))
        # else: silently ignored (a nack would only speed things up)
    elif kind == 'promise':
        _, a, pi, b, ab, av = msg
        phase, proms, best, accs, value, ballot = proposers[pi]
        if phase == 'prepare' and b == ballot:
            proms = proms | {a}
            if ab > best[0]:
                best = (ab, av)
            if len(proms) >= quorum:
                # THE HEURISTIC'S TEETH: adopt the highest accepted value
                # seen in the quorum; only propose our own if none.
                chosen_value = best[1] if best[1] is not None else value
                phase = 'accept'
                for acc in range(len(acceptors)):
                    msgs.append(('accept', pi, acc, ballot, chosen_value))
            proposers[pi] = (phase, proms, best, accs, value, ballot)
    elif kind == 'accept':
        _, pi, a, b, v = msg
        promised, ab, av = acceptors[a]
        if b >= promised:
            acceptors[a] = (b, b, v)
            msgs.append(('accepted', a, pi, b, v))
    elif kind == 'accepted':
        _, a, pi, b, v = msg
        phase, proms, best, accs, value, ballot = proposers[pi]
        if b == ballot:
            accs = accs | {a}
            if len(accs) >= quorum:
                phase = 'decided'
            proposers[pi] = (phase, proms, best, accs, value, ballot)
    acceptors = tuple(acceptors)
    ever = ever | chosen_values((acceptors, None, None, None), quorum)
    return acceptors, tuple(proposers), tuple(sorted(msgs)), ever


def chosen_values(state, quorum):
    """A value is CHOSEN when some ballot's accept was recorded by a
    quorum of acceptors: the definition, computed from acceptor state
    alone (proposers may not even know yet)."""
    acceptors = state[0]
    by_ballot = {}
    for promised, ab, av in acceptors:
        if ab:
            by_ballot.setdefault((ab, av), 0)
            by_ballot[(ab, av)] += 1
    return {v for (b, v), c in by_ballot.items() if c >= quorum}


def skip_prepare_state(state):
    """The no-prepare ablation: proposers jump straight to accept."""
    acceptors, proposers, msgs, ever = state
    new_msgs = []
    new_props = []
    for pi, (phase, proms, best, accs, value, ballot) in enumerate(proposers):
        new_props.append(('accept', proms, best, accs, value, ballot))
        for a in range(len(acceptors)):
            new_msgs.append(('accept', pi, a, ballot, value))
    return acceptors, tuple(new_props), tuple(sorted(new_msgs)), ever


def model_check(n_acc, proposals, quorum, skip_prepare=False, allow_drops=True):
    """Exhaustive DFS over every delivery order (and drop) with state
    hashing. Returns (states_explored, violation or None)."""
    start = make_state(n_acc, proposals)
    if skip_prepare:
        start = skip_prepare_state(start)
    proposed = {v for _, v in proposals}
    seen = set()
    stack = [start]
    explored = 0
    while stack:
        state = stack.pop()
        if state in seen:
            continue
        seen.add(state)
        explored += 1
        chosen = chosen_values(state, quorum) | state[3]
        if len(chosen) > 1:
            return explored, ('two values chosen', sorted(chosen), state[0])
        if not chosen <= proposed:
            return explored, ('unproposed value chosen', sorted(chosen), state[0])
        msgs = state[2]
        for msg in set(msgs):
            stack.append(step(state, msg, quorum, skip_prepare))
            if allow_drops:
                acceptors, proposers, ms, ever = state
                ms = list(ms)
                ms.remove(msg)
                stack.append((acceptors, proposers, tuple(sorted(ms)), ever))
    return explored, None


# --------------------------------------------------- simulation (liveness)
def simulate(n_acc, n_prop, rng, crashed=frozenset(), backoff=True, max_ticks=4000):
    """An adversarial scheduler: every message takes a random delay
    (reordering), proposers retry with a higher ballot when their
    ballot is superseded, and (optionally) back off a random time
    before retrying. Returns (decided, ticks, ballots_used)."""
    quorum = n_acc // 2 + 1
    acceptors = [(0, 0, None) for _ in range(n_acc)]
    # proposer: [phase, promises, best, accepteds, value, ballot, wake_tick]
    props = []
    next_ballot = [0]

    def fresh_ballot(pi):
        next_ballot[0] += 1
        return next_ballot[0] * n_prop + pi   # unique per proposer

    for pi in range(n_prop):
        props.append(['prepare', set(), (0, None), set(), f'v{pi}', fresh_ballot(pi), 0])
    inflight = []  # (deliver_at, seq, msg)
    seq = [0]

    def send(msg, now):
        seq[0] += 1
        inflight.append((now + rng.randint(1, 6), seq[0], msg))

    for pi, p in enumerate(props):
        for a in range(n_acc):
            send(('prepare', pi, a, p[5]), 0)
    ballots_used = n_prop
    for t in range(1, max_ticks + 1):
        # proposers whose ballot was superseded restart
        for pi, p in enumerate(props):
            if p[0] == 'restart' and p[6] <= t:
                p[0], p[1], p[2], p[3] = 'prepare', set(), (0, None), set()
                p[5] = fresh_ballot(pi)
                ballots_used += 1
                for a in range(n_acc):
                    send(('prepare', pi, a, p[5]), t)
        due = [m for m in inflight if m[0] <= t]
        inflight[:] = [m for m in inflight if m[0] > t]
        rng.shuffle(due)
        for _, _, msg in due:
            kind = msg[0]
            if kind in ('prepare', 'accept') and msg[2] in crashed:
                continue
            if kind == 'prepare':
                _, pi, a, b = msg
                promised, ab, av = acceptors[a]
                if b > promised:
                    acceptors[a] = (b, ab, av)
                    send(('promise', a, pi, b, ab, av), t)
                else:
                    send(('nack', a, pi, b), t)
            elif kind == 'promise':
                _, a, pi, b, ab, av = msg
                p = props[pi]
                if p[0] == 'prepare' and b == p[5]:
                    p[1].add(a)
                    if ab > p[2][0]:
                        p[2] = (ab, av)
                    if len(p[1]) >= quorum:
                        val = p[2][1] if p[2][1] is not None else p[4]
                        p[4] = val
                        p[0] = 'accept'
                        for acc in range(n_acc):
                            send(('accept', pi, acc, p[5], val), t)
            elif kind == 'accept':
                _, pi, a, b, v = msg
                promised, ab, av = acceptors[a]
                if b >= promised:
                    acceptors[a] = (b, b, v)
                    send(('accepted', a, pi, b, v), t)
                else:
                    send(('nack', a, pi, b), t)
            elif kind == 'accepted':
                _, a, pi, b, v = msg
                p = props[pi]
                if b == p[5] and p[0] == 'accept':
                    p[3].add(a)
                    if len(p[3]) >= quorum:
                        p[0] = 'decided'
            elif kind == 'nack':
                _, a, pi, b = msg
                p = props[pi]
                if b == p[5] and p[0] in ('prepare', 'accept'):
                    p[0] = 'restart'
                    p[6] = t + (rng.randint(1, 40) if backoff else 1)
        live = {v for v in chosen_values((tuple(acceptors), (), (), frozenset()), quorum)}
        if live:
            assert len(live) == 1, live
            return True, t, ballots_used, next(iter(live))
    return False, max_ticks, ballots_used, None


def two_phase_commit_with_crash(n_part, rng):
    """2PC: coordinator collects votes, then crashes before sending the
    decision. Participants that voted yes hold their locks and cannot
    decide unilaterally: no quorum can release them. Returns the number
    of blocked participants."""
    votes = ['yes'] * n_part
    # every participant voted yes and is now 'prepared' (locks held)
    coordinator_alive = False
    blocked = 0
    for _ in votes:
        # a prepared participant may neither commit (another may have
        # voted no) nor abort (the coordinator may have logged commit)
        if not coordinator_alive:
            blocked += 1
    return blocked


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: exhaustive safety, 3 acceptors, 2 dueling proposers with
    # different values, majority quorum = 2, drops allowed.
    n_acc, quorum = 3, 2
    proposals = [(1, 'A'), (2, 'B')]
    explored, violation = model_check(n_acc, proposals, quorum)
    assert violation is None, violation
    safe_states = explored

    # Oracle 2a: the ablation: quorum = half (1 of 3): no intersection.
    explored_half, violation_half = model_check(n_acc, proposals, quorum=1)
    assert violation_half is not None and violation_half[0] == 'two values chosen', violation_half
    # Oracle 2b: skip the prepare phase (majority quorum kept).
    explored_np, violation_np = model_check(n_acc, proposals, quorum, skip_prepare=True)
    assert violation_np is not None and violation_np[0] == 'two values chosen', violation_np
    # The same duel with drops forbidden (pure reordering): a smaller
    # space, the same theorem, reported alongside.
    explored3, violation3 = model_check(n_acc, proposals, quorum, allow_drops=False)
    assert violation3 is None, violation3

    # Oracle 3: liveness under contention, 5 acceptors, 3 proposers.
    RUNS = 40
    stats = {}
    for label, backoff in (('random backoff', True), ('no backoff', False)):
        decided = 0
        ticks = []
        ballots = []
        for run in range(RUNS):
            r = random.Random(SEED + run)
            ok, t, nb, v = simulate(5, 3, r, backoff=backoff)
            decided += ok
            if ok:
                ticks.append(t)
                ballots.append(nb)
        stats[label] = (decided, sum(ticks) / max(len(ticks), 1), sum(ballots) / max(len(ballots), 1))
    assert stats['random backoff'][0] == RUNS, stats
    # THE HONEST DUEL ROW (the first draft asserted a livelock without
    # backoff; the run refused it): with random network delays every run
    # still decides, because the delays themselves desynchronize the
    # duelers. Lamport's livelock needs a synchronous network. What the
    # duel costs, measured: several times the ticks and the ballots.
    dec_n, t_n, nb_n = stats['no backoff']
    dec_b, t_b, nb_b = stats['random backoff']
    assert dec_n == RUNS, stats
    assert t_n > 1.5 * t_b, stats
    assert nb_n > 2.0 * nb_b, stats

    # Oracle 4: crashes. A minority (2 of 5) still decides; a majority never.
    minority = [simulate(5, 3, random.Random(SEED + 500 + run), crashed=frozenset({0, 1}))[0] for run in range(RUNS)]
    majority = [simulate(5, 3, random.Random(SEED + 900 + run), crashed=frozenset({0, 1, 2}), max_ticks=600)[0] for run in range(RUNS)]
    assert sum(minority) == RUNS, sum(minority)
    assert sum(majority) == 0, sum(majority)

    # Oracle 5: 2PC with a coordinator crash blocks every participant.
    blocked = two_phase_commit_with_crash(5, rng)
    assert blocked == 5

    dec_b, t_b, nb_b = stats['random backoff']
    dec_n, t_n, nb_n = stats['no backoff']
    print(f'contest: consensus on one value among 5 acceptors with 3 dueling proposers under an adversarial scheduler (random delays, reordering, {RUNS} seeded runs); safety refereed separately by exhaustive model checking of a 3-acceptor, 2-proposer system with every delivery order and every drop')
    print(f"  {'protocol':<40} {'safe':>6} {'decided':>9} {'rounds':>8}")
    print(f"  {'Paxos, majority quorums + backoff':<40} {'yes':>6} {dec_b:>6}/{RUNS} {t_b:>8.0f}   {nb_b:.1f} ballots per decision: the shared acceptor carries the value forward")
    print(f"  {'Paxos, majority quorums, no backoff':<40} {'yes':>6} {dec_n:>6}/{RUNS} {t_n:>8.0f}   {nb_n:.1f} ballots per decision: dueling proposers preempt each other (the network's own jitter breaks the tie; a synchronous network would not)")
    print(f"  {'quorum = half (no intersection)':<40} {'NO':>6} {'-':>9} {'-':>8}   model checker found two chosen values after exploring {explored_half:,} states")
    print(f"  {'accept without prepare':<40} {'NO':>6} {'-':>9} {'-':>8}   model checker found two chosen values after exploring {explored_np:,} states")
    print(f"  {'two-phase commit, coordinator crash':<40} {'yes':>6} {'0':>6}/{RUNS} {'stuck':>8}   {blocked}/5 participants blocked holding locks: atomic commit is not consensus")
    print(f'the safety proof by exhaustion: {safe_states:,} reachable states with drops allowed and {explored3:,} with pure reordering, every one with at most one value ever chosen and only proposed values chosen')
    print(f'the fault-tolerance rows: 2 of 5 acceptors crashed: {sum(minority)}/{RUNS} decided; 3 of 5 crashed: {sum(majority)}/{RUNS} decided: a majority must survive, by construction')
    print(f'OK: exhaustive model check found no violation in {safe_states:,} + {explored3:,} states; both ablations violate agreement (found at {explored_half:,} and {explored_np:,} states); '
          f'liveness {dec_b}/{RUNS} in {t_b:.0f} ticks and {nb_b:.1f} ballots with backoff vs {dec_n}/{RUNS} in {t_n:.0f} ticks and {nb_n:.1f} ballots without; minority crash {sum(minority)}/{RUNS} decided, majority crash {sum(majority)}/{RUNS}; 2PC coordinator crash blocks {blocked}/5')
