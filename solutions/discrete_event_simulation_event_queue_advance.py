# Puzzle 136: Discrete event simulation x event-queue advance
# Systems modeling: a queue with random arrivals and random service
# times. How long do customers wait, how many are in the system, how
# often is the server idle? Discrete event simulation is the
# algorithm: keep the state (queue length, server busy or not), and a
# calendar of pending events (the next arrival, the next departure),
# and process events one at a time, each one updating the state and
# scheduling the events it causes. The heuristic is how time moves:
# the clock jumps straight to the earliest pending event, taken from a
# priority queue, and nothing is computed for the empty time in
# between. Every unit of simulated time costs exactly as many steps as
# there are events in it.
#
# Referees:
# (1) THE EXACT M/M/1 FORMULAS: with Poisson arrivals at rate 0.8 and
#     exponential service at rate 1 (utilization 0.8), the mean number
#     in the system is 4, the mean time in the system is 5, and the
#     server is idle 20% of the time; the simulation of 200,000
#     customers must land within 3% of each;
# (2) LITTLE'S LAW inside the run: the time-averaged number in the
#     system must equal the arrival rate times the customer-averaged
#     time in the system, measured independently in the same run;
# (3) THE CALENDAR: events come out in nondecreasing time order, the
#     clock never runs backwards, and the count of events is exactly
#     two per customer;
# (4) THE ABLATION, fixed-increment time advance: the same queue
#     stepped forward in slots of 0.1 and 0.01 time units, with events
#     detected per slot. On a 25,000-time-unit horizon it takes 250,000
#     and 2,500,000 steps against the event calendar's 40,000, and the
#     coarse slot biases the mean number in the system because events
#     inside one slot are resolved in the wrong order or merged;
# (5) A SECOND MODEL, M/D/1 (deterministic service of length 1): the
#     Pollaczek-Khinchine formula gives a mean wait in the queue of
#     rho / (2 mu (1 - rho)) = 2.0, so a mean time in the system of 3.0;
#     the same simulator with one line changed must land within 3%.
import heapq
import math
import random

SEED = 20260926
LAM = 0.8
MU = 1.0


def simulate_events(n_customers, rng, service):
    """Event-calendar simulation of a single-server FIFO queue.
    Returns (mean number in system, mean time in system, fraction of
    time idle, events processed, order violations)."""
    clock = 0.0
    calendar = []
    heapq.heappush(calendar, (rng.expovariate(LAM), 0, 'arrival'))
    seq = 1
    queue = []                                # arrival times of waiting customers
    busy_until = None
    in_system = 0
    area = 0.0                                # integral of in_system dt
    idle_time = 0.0
    last = 0.0
    total_time = 0.0
    served = 0
    arrived = 0
    events = 0
    violations = 0
    departure_of = None                       # arrival time of the customer in service
    while served < n_customers:
        t, _, kind = heapq.heappop(calendar)
        if t < clock:
            violations += 1
        area += in_system * (t - clock)
        if in_system == 0:
            idle_time += t - clock
        clock = t
        events += 1
        if kind == 'arrival':
            arrived += 1
            in_system += 1
            if arrived < n_customers:
                heapq.heappush(calendar, (clock + rng.expovariate(LAM), seq, 'arrival'))
                seq += 1
            if busy_until is None:
                busy_until = clock + service(rng)
                departure_of = clock
                heapq.heappush(calendar, (busy_until, seq, 'departure'))
                seq += 1
            else:
                queue.append(clock)
        else:
            served += 1
            in_system -= 1
            total_time += clock - departure_of
            if queue:
                departure_of = queue.pop(0)
                busy_until = clock + service(rng)
                heapq.heappush(calendar, (busy_until, seq, 'departure'))
                seq += 1
            else:
                busy_until = None
    return area / clock, total_time / served, idle_time / clock, events, violations, clock


def simulate_fixed_step(horizon, dt, rng, service):
    """Fixed-increment time advance: at every slot, check whether the
    next arrival or departure falls inside it. Events inside one slot
    are resolved at the slot's end, in a fixed order."""
    clock = 0.0
    next_arrival = rng.expovariate(LAM)
    next_departure = math.inf
    queue = 0
    in_service = False
    area = 0.0
    steps = 0
    served = 0
    total_wait_start = []
    total_time = 0.0
    n_steps = int(round(horizon / dt))
    for step in range(n_steps):
        steps += 1
        end = (step + 1) * dt                 # computed, not accumulated, so rounding cannot add or drop a slot
        n_now = queue + (1 if in_service else 0)
        area += n_now * dt
        if next_departure <= end:
            served += 1
            total_time += end - total_wait_start.pop(0)
            if queue > 0:
                queue -= 1
                next_departure = end + service(rng)
            else:
                in_service = False
                next_departure = math.inf
        while next_arrival <= end:
            total_wait_start.append(end)
            if not in_service:
                in_service = True
                next_departure = end + service(rng)
            else:
                queue += 1
            next_arrival += rng.expovariate(LAM)
        clock = end
    return area / clock, steps, served


if __name__ == '__main__':
    exp_service = lambda rng: rng.expovariate(MU)
    det_service = lambda rng: 1.0 / MU
    rho = LAM / MU
    L_exact, W_exact, idle_exact = rho / (1 - rho), 1 / (MU - LAM), 1 - rho

    # Oracle 1 + 2 + 3: M/M/1 against the formulas, Little's law, the calendar.
    L, W, idle, events, violations, horizon = simulate_events(200_000, random.Random(SEED), exp_service)
    assert abs(L - L_exact) / L_exact < 0.03, (L, L_exact)
    assert abs(W - W_exact) / W_exact < 0.03, (W, W_exact)
    assert abs(idle - idle_exact) / idle_exact < 0.03, (idle, idle_exact)
    little = (200_000 / horizon) * W
    assert abs(L - little) / L < 0.005, (L, little)
    assert violations == 0 and events == 400_000, (violations, events)

    # Oracle 4: fixed-increment time advance on a 25,000-unit horizon.
    _, _, _, events_short, _, horizon_short = simulate_events(20_000, random.Random(SEED + 1), exp_service)
    L_fixed = {}
    for dt in (0.1, 0.01):
        Lf, steps, served_f = simulate_fixed_step(25_000, dt, random.Random(SEED + 1), exp_service)
        L_fixed[dt] = (Lf, steps, served_f)
    assert L_fixed[0.1][1] == 250_000 and L_fixed[0.01][1] == 2_500_000
    assert L_fixed[0.01][1] > 50 * events_short
    bias_coarse = abs(L_fixed[0.1][0] - L_exact) / L_exact
    bias_fine = abs(L_fixed[0.01][0] - L_exact) / L_exact

    # Oracle 5: M/D/1 against Pollaczek-Khinchine.
    Wq_pk = rho / (2 * MU * (1 - rho))
    W_pk = Wq_pk + 1 / MU
    L_pk = LAM * W_pk
    Ld, Wd, idle_d, _, _, _ = simulate_events(200_000, random.Random(SEED + 2), det_service)
    assert abs(Wd - W_pk) / W_pk < 0.03, (Wd, W_pk)
    assert abs(Ld - L_pk) / L_pk < 0.03, (Ld, L_pk)

    print(f'contest: a single-server queue, arrivals at rate {LAM}, service at rate {MU} (utilization {rho:.0%}); referees: the exact M/M/1 and M/D/1 (Pollaczek-Khinchine) formulas and Little\'s law')
    print(f"  {'method':<40} {'steps':>10} {'mean in system':>14} {'exact':>6}   verdict")
    print(f"  {'event calendar, M/M/1, 200,000 customers':<40} {events:>10,} {L:>14.3f} {L_exact:>6.1f}   time in system {W:.3f} (exact {W_exact:.1f}), idle {idle:.3f} (exact {idle_exact:.1f})")
    print(f"  {'fixed step 0.1, same queue, 25,000 units':<40} {L_fixed[0.1][1]:>10,} {L_fixed[0.1][0]:>14.3f} {L_exact:>6.1f}   {bias_coarse:.1%} off: events inside a slot are merged and reordered")
    print(f"  {'fixed step 0.01, same queue, 25,000 units':<40} {L_fixed[0.01][1]:>10,} {L_fixed[0.01][0]:>14.3f} {L_exact:>6.1f}   {bias_fine:.1%} off, at {L_fixed[0.01][1] / events_short:.0f}x the calendar's {events_short:,} steps for the same horizon")
    print(f"  {'event calendar, M/D/1, 200,000 customers':<40} {'400,000':>10} {Ld:>14.3f} {L_pk:>6.1f}   time in system {Wd:.3f} (Pollaczek-Khinchine {W_pk:.1f}); one line changed")
    print(f'Little\'s law inside the run: L = {L:.3f}, lambda W = {little:.3f}; calendar order violations {violations}; clock advanced only at events, {events:,} of them over {horizon:,.0f} time units')
    print(f'OK: event-calendar simulation within {max(abs(L - L_exact) / L_exact, abs(W - W_exact) / W_exact, abs(idle - idle_exact) / idle_exact):.1%} of the exact M/M/1 figures and {max(abs(Wd - W_pk) / W_pk, abs(Ld - L_pk) / L_pk):.1%} of M/D/1, '
          f'Little\'s law to {abs(L - little) / L:.2%}, zero order violations; fixed steps cost {L_fixed[0.01][1] / events_short:.0f}x for the same horizon and the coarse slot was {bias_coarse:.1%} off')
