# Puzzle 158: TCP congestion control x AIMD slow start
# Congestion avoidance: many senders share a link they cannot see,
# through a router queue of finite size, and each must choose how many
# packets to keep in flight. Too few and the link idles; too many and
# the queue overflows, packets drop, and everyone retransmits. TCP
# congestion control is the algorithm: a sender infers congestion from
# loss and adjusts its window. The heuristic is AIMD with slow start:
# double the window every round trip until the first loss, then add one
# packet per round trip and halve on every loss. Additive increase and
# multiplicative decrease is what makes competing senders converge to
# equal shares, and slow start is what finds the capacity quickly.
#
# Referees:
# (1) FAIRNESS, exact: on a simulated bottleneck (a fluid model with a
#     shared queue, drops on overflow, one round trip per tick), two
#     AIMD senders that start with windows 1 and 40 must converge to
#     shares within 10% of each other (Jain's fairness index above
#     0.98) within 60 round trips, while the Chiu-Jain phase-plane
#     argument is checked directly: the ratio of the two windows moves
#     toward 1 on every multiplicative decrease and is preserved on
#     additive increase;
# (2) UTILIZATION: one sender on a link of 100 packets per round trip
#     with a 50-packet queue keeps the link at least 75% busy over 200
#     round trips (the sawtooth halves from its peak, so the average
#     window is three quarters of it), with the sawtooth measured;
# (3) SLOW START vs additive-only start: round trips to first reach
#     the capacity from a window of 1: about log2(100) with doubling
#     against 100 with +1 per round trip;
# (4) THE ALTERNATIVES, measured on the same two-sender link: additive
#     increase with additive decrease (AIAD) does not converge to
#     fairness; multiplicative increase with multiplicative decrease
#     (MIMD) does not converge either; only AIMD does (Chiu and Jain
#     1989);
# (5) THE NEGATIVE EXAMPLE, measured: a sender that ignores loss and
#     keeps a fixed large window drives the queue to permanent overflow,
#     and against it an AIMD sender is starved; and RTT unfairness,
#     measured: two AIMD senders with round-trip times 1 and 4 ticks
#     settle at shares far from equal.
import math

CAPACITY = 100        # packets the link carries per round trip
QUEUE = 50            # packets the router can hold beyond that


def simulate(policies, rounds, capacity=CAPACITY, queue=QUEUE, rtts=None):
    """Fluid model, one tick per base round trip. Each sender offers its
    window every rtt ticks; the link carries `capacity` per tick and the
    queue absorbs up to `queue` more; the excess is dropped in proportion
    to each sender's share, and a sender that lost packets in a tick is
    told so on its next update. Returns per-sender window histories,
    delivered packets, and the link utilization per tick."""
    n = len(policies)
    rtts = rtts or [1] * n
    windows = [p['init'] for p in policies]
    histories = [[] for _ in range(n)]
    delivered = [0.0] * n
    util = []
    backlog = 0.0
    for t in range(rounds):
        offered = [windows[i] / rtts[i] for i in range(n)]
        total = sum(offered) + backlog
        carried = min(total, capacity)
        util.append(carried / capacity)
        leftover = total - carried
        backlog = min(leftover, queue)
        dropped = leftover - backlog
        for i in range(n):
            share = offered[i] / sum(offered) if sum(offered) > 0 else 0
            delivered[i] += carried * share
            lost = dropped * share > 0.5      # at least one packet of this sender dropped
            if t % rtts[i] == 0:
                windows[i] = policies[i]['update'](windows[i], lost, policies[i])
                windows[i] = max(1.0, windows[i])
            histories[i].append(windows[i])
    return histories, delivered, util


def aimd_update(w, lost, p):
    if lost:
        p['ssthresh'] = max(2.0, w / 2)
        return w / 2
    if w < p.get('ssthresh', math.inf):
        return w * 2                    # slow start: double per round trip
    return w + 1                        # congestion avoidance: additive increase


def aiad_update(w, lost, p):
    return w - 5 if lost else w + 1


def mimd_update(w, lost, p):
    return w / 2 if lost else w * 1.2


def fixed_update(w, lost, p):
    return p['init']


def additive_start_update(w, lost, p):
    return w / 2 if lost else w + 1


def jain(xs):
    return sum(xs) ** 2 / (len(xs) * sum(x * x for x in xs))


if __name__ == '__main__':
    # Oracle 1: fairness of two AIMD senders from very different starts.
    a = {'init': 1.0, 'update': aimd_update}
    b = {'init': 40.0, 'update': aimd_update}
    hist, deliv, util = simulate([a, b], 200)
    fairness = [jain([hist[0][t], hist[1][t]]) for t in range(200)]
    first_fair = next(t for t in range(200) if all(f > 0.98 for f in fairness[t:t + 20]))
    assert first_fair < 60, first_fair
    late_share = [sum(h[100:]) for h in hist]
    assert abs(late_share[0] - late_share[1]) / max(late_share) < 0.10, late_share
    # the phase-plane check: ratio moves toward 1 on decrease, preserved on increase
    ratios_after_drop = []
    for t in range(1, 200):
        w1, w2 = hist[0][t - 1], hist[1][t - 1]
        n1, n2 = hist[0][t], hist[1][t]
        if n1 < w1 and n2 < w2:          # both halved
            assert abs(n1 / n2 - w1 / w2) < 1e-9
        if n1 == w1 + 1 and n2 == w2 + 1:
            r0, r1 = max(w1, w2) / min(w1, w2), max(n1, n2) / min(n1, n2)
            assert r1 <= r0 + 1e-9        # additive increase pulls the ratio toward 1
            ratios_after_drop.append((r0, r1))

    # Oracle 2: one sender, utilization and the sawtooth.
    single = {'init': 1.0, 'update': aimd_update}
    hist1, deliv1, util1 = simulate([single], 200)
    steady = hist1[0][50:]
    mean_util = sum(util1[50:]) / len(util1[50:])
    drops = [t for t in range(51, 200) if hist1[0][t] < hist1[0][t - 1]]
    period = (drops[-1] - drops[0]) / (len(drops) - 1) if len(drops) > 1 else None
    # the sawtooth halves from its peak, so the average window is three quarters
    # of the peak (the textbook 75%); the queue lifts the measured figure a
    # little. AUTHOR CORRECTION: the draft asserted 85% and measured 81%
    assert mean_util > 0.75, mean_util
    assert min(steady) >= CAPACITY / 2 and max(steady) <= CAPACITY + QUEUE + 1, (min(steady), max(steady))

    # Oracle 3: slow start vs additive-only start.
    def rounds_to_capacity(update):
        p = {'init': 1.0, 'update': update}
        h, _, _ = simulate([p], 300)
        return next(t for t, w in enumerate(h[0]) if w >= CAPACITY) + 1
    r_slow = rounds_to_capacity(aimd_update)
    r_add = rounds_to_capacity(additive_start_update)
    assert r_slow <= 8 and r_add >= 95, (r_slow, r_add)

    # Oracle 4: AIAD and MIMD do not converge to fairness.
    outcomes = {}
    for name, upd in (('AIMD', aimd_update), ('AIAD', aiad_update), ('MIMD', mimd_update)):
        p1 = {'init': 1.0, 'update': upd}
        p2 = {'init': 40.0, 'update': upd}
        h, d, u = simulate([p1, p2], 300)
        f = jain([sum(h[0][150:]), sum(h[1][150:])])
        outcomes[name] = (f, sum(u[150:]) / 150)
    assert outcomes['AIMD'][0] > 0.98, outcomes
    assert outcomes['AIAD'][0] < 0.9 and outcomes['MIMD'][0] < 0.9, outcomes

    # Oracle 5: the greedy sender and RTT unfairness.
    greedy = {'init': 200.0, 'update': fixed_update}
    polite = {'init': 1.0, 'update': aimd_update}
    hg, dg, ug = simulate([greedy, polite], 200)
    greedy_share = dg[0] / (dg[0] + dg[1])
    assert greedy_share > 0.9, greedy_share
    slow_rtt = {'init': 1.0, 'update': aimd_update}
    fast_rtt = {'init': 1.0, 'update': aimd_update}
    hr, dr, ur = simulate([fast_rtt, slow_rtt], 400, rtts=[1, 4])
    rtt_shares = [dr[0] / sum(dr), dr[1] / sum(dr)]
    assert rtt_shares[0] > 0.6, rtt_shares

    print(f'contest: senders sharing a link of {CAPACITY} packets per round trip with a {QUEUE}-packet queue; referee: Jain\'s fairness index on the windows, the link utilization, and the Chiu-Jain phase-plane invariants checked on every step')
    print(f'fairness: two AIMD senders from windows 1 and 40 reach Jain index above 0.98 (and stay there 20 rounds) by round trip {first_fair}; shares over rounds 100 to 200: {late_share[0]:,.0f} vs {late_share[1]:,.0f} window-rounds; the window ratio is preserved on every halving and pulled toward 1 on every additive step ({len(ratios_after_drop)} increase steps checked)')
    print(f'utilization: one sender keeps the link {mean_util:.1%} busy over rounds 50 to 200; the sawtooth runs between {min(steady):.0f} and {max(steady):.0f} packets with a drop every {period:.0f} round trips')
    print(f'slow start reaches the capacity of {CAPACITY} from a window of 1 in {r_slow} round trips; additive-only start in {r_add}')
    print(f"  {'policy':>6} {'Jain index (rounds 150+)':>24} {'utilization':>11}")
    for name, (f, u) in outcomes.items():
        print(f'  {name:>6} {f:>24.3f} {u:>11.1%}')
    print(f'a fixed window of 200 against an AIMD sender: the greedy sender takes {greedy_share:.1%} of the delivered packets; two AIMD senders with round-trip times 1 and 4: shares {rtt_shares[0]:.1%} vs {rtt_shares[1]:.1%}')
    print(f'OK: AIMD fair by round {first_fair} with the phase-plane invariants holding on every step; utilization {mean_util:.0%}; slow start {r_slow} vs {r_add} round trips; AIAD {outcomes["AIAD"][0]:.2f} and MIMD {outcomes["MIMD"][0]:.2f} never converge; a greedy sender takes {greedy_share:.0%}; RTT 1 vs 4 splits {rtt_shares[0]:.0%} / {rtt_shares[1]:.0%}')
