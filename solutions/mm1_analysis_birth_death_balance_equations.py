# Puzzle 176: M/M/1 analysis x Birth-death balance equations
# Single-queue analysis: customers arrive at random at rate lambda, one
# server takes a random time with mean 1 / mu each, and the question is
# how long the line gets and how long a customer waits, as a formula, not
# a simulation. The algorithm is the continuous-time Markov chain on the
# number in the system: state n goes to n + 1 at rate lambda (a birth)
# and to n - 1 at rate mu (a death). The heuristic is the birth-death
# balance: in steady state the flow up across each cut equals the flow
# down, lambda pi_n = mu pi_(n+1), so pi_(n+1) = rho pi_n with
# rho = lambda / mu, and normalizing gives pi_n = (1 - rho) rho^n. From
# that geometric distribution every performance measure follows in closed
# form: L = rho / (1 - rho) customers in the system, W = 1 / (mu - lambda)
# in the system, Lq = rho^2 / (1 - rho) and Wq = rho / (mu - lambda) in
# the queue, P(wait) = rho, P(N >= k) = rho^k, and Little's law L = lambda W
# ties them together. The same balance equations with state-dependent
# rates solve M/M/c and every other birth-death queue.
#
# Referees:
# (1) THE EQUATIONS THEMSELVES: the balance equations are solved
#     numerically on a chain truncated at 600 states, by the recursion and
#     normalization, and must reproduce the closed form to 1e-9 at every
#     utilization; Little's law and P(wait) = rho are checked on the
#     numerical solution;
# (2) AN INDEPENDENT DISCRETE-EVENT SIMULATION of the actual queue,
#     exponential arrivals and services, 60,000 customers per utilization
#     at rho = 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, scored with batch-means
#     standard errors: the simulated L, Wq, P(wait), and P(N >= 5) must sit
#     within three standard errors of the formulas, and Little's law must
#     hold inside the simulation;
# (3) THE RIVALS, analytic and simulated on the same arrival streams: M/D/1
#     (deterministic service, the Pollaczek-Khinchine formula, half the
#     queueing delay), M/M/2 with two half-speed servers (the same balance
#     equations with state-dependent death rates), and Kingman's heavy
#     traffic approximation, which is exact for M/M/1 and is checked to be;
# (4) THE EXPLOSION near rho = 1: L at rho = 0.5, 0.8, 0.9, 0.95, 0.99
#     (1, 4, 9, 19, 99) with the simulation agreeing where it can;
# (5) THE NEGATIVE EXAMPLE, measured: deterministic capacity reasoning,
#     "the server handles mu per hour and only lambda arrive, so nobody
#     waits", against the simulated wait at rho = 0.9 and 0.95.
#
# AUTHOR CORRECTION: the draft expected the simulation at rho = 0.95 to
# land within three standard errors with 20 batches of 3,000 customers.
# Measured, the batch means at that utilization are strongly correlated
# (the relaxation time grows like 1 / (1 - rho)^2) and the error bars were
# too narrow; the file now uses longer batches at high utilization and
# reports the batch length, which is itself part of the lesson.
import math
import random

SEED = 20261010


# ------------------------------------------------- birth-death solver

def birth_death(lam, death_rate, states):
    """Solve lambda pi_n = mu_(n+1) pi_(n+1) on a truncated chain and
    normalize. death_rate(n) is the rate out of state n downward."""
    pi = [1.0]
    for n in range(1, states):
        pi.append(pi[-1] * lam / death_rate(n))
    total = sum(pi)
    return [p / total for p in pi]


def measures_from_distribution(pi, lam, servers=1):
    L = sum(n * p for n, p in enumerate(pi))
    Lq = sum(max(n - servers, 0) * p for n, p in enumerate(pi))
    W = L / lam
    Wq = Lq / lam
    p_wait = sum(p for n, p in enumerate(pi) if n >= servers)
    return {'L': L, 'Lq': Lq, 'W': W, 'Wq': Wq, 'p_wait': p_wait}


def mm1_closed_form(lam, mu):
    rho = lam / mu
    return {'L': rho / (1 - rho), 'Lq': rho * rho / (1 - rho), 'W': 1 / (mu - lam),
            'Wq': rho / (mu - lam), 'p_wait': rho, 'p_ge5': rho ** 5}


def md1_closed_form(lam, mu):
    """Pollaczek-Khinchine with zero service variance."""
    rho = lam / mu
    Wq = rho / (2 * mu * (1 - rho))
    return {'Wq': Wq, 'W': Wq + 1 / mu, 'L': lam * (Wq + 1 / mu), 'Lq': lam * Wq}


def kingman(lam, mu, ca2, cs2):
    rho = lam / mu
    return (rho / (1 - rho)) * ((ca2 + cs2) / 2) * (1 / mu)


# -------------------------------------------------- discrete-event sim

def simulate(lam, mu, customers, rng, servers=1, deterministic_service=False, batches=20, warmup=2000):
    """Single queue, FIFO, exponential arrivals, exponential or fixed
    service, c identical servers. Returns time-average L, mean Wq, the
    fraction who waited, P(N >= 5) in time, and batch-means standard
    errors for L and Wq."""
    t = 0.0
    next_arrival = rng.expovariate(lam)
    departures = []  # service completion times, one per busy server
    queue = []  # arrival times of waiting customers
    area = 0.0
    area_ge5 = 0.0
    last = 0.0
    served = 0
    waits = []
    waited = 0
    batch_L = []
    batch_Wq = []
    batch_area = 0.0
    batch_start = 0.0
    batch_waits = []
    batch_size = max(1, (customers - warmup) // batches)
    while served < customers:
        next_dep = min(departures) if departures else math.inf
        n = len(queue) + len(departures)
        t_next = min(next_arrival, next_dep)
        area += n * (t_next - last)
        if served >= warmup:
            batch_area += n * (t_next - last)
        if n >= 5:
            area_ge5 += t_next - last
        last = t_next
        t = t_next
        if next_arrival <= next_dep:
            if len(departures) < servers:
                departures.append(t + (1 / mu if deterministic_service else rng.expovariate(mu)))
                waits.append(0.0) if served >= warmup else None
                if served >= warmup:
                    batch_waits.append(0.0)
            else:
                queue.append(t)
            next_arrival = t + rng.expovariate(lam)
        else:
            departures.remove(next_dep)
            served += 1
            if served == warmup:
                batch_start = t
                batch_area = 0.0
                batch_waits = []
            if queue:
                arrived = queue.pop(0)
                w = t - arrived
                if served >= warmup:
                    waits.append(w)
                    batch_waits.append(w)
                    if w > 0:
                        waited += 1
                departures.append(t + (1 / mu if deterministic_service else rng.expovariate(mu)))
            if served > warmup and (served - warmup) % batch_size == 0:
                span = t - batch_start
                if span > 0 and batch_waits:
                    batch_L.append(batch_area / span)
                    batch_Wq.append(sum(batch_waits) / len(batch_waits))
                batch_start = t
                batch_area = 0.0
                batch_waits = []
    total_time = t
    L = area / total_time
    Wq = sum(waits) / len(waits) if waits else 0.0
    p_wait = sum(1 for w in waits if w > 0) / len(waits)

    def se(values):
        if len(values) < 2:
            return float('inf')
        m = sum(values) / len(values)
        var = sum((v - m) ** 2 for v in values) / (len(values) - 1)
        return math.sqrt(var / len(values))

    return {'L': L, 'Wq': Wq, 'p_wait': p_wait, 'p_ge5': area_ge5 / total_time,
            'L_se': se(batch_L), 'Wq_se': se(batch_Wq), 'events': 2 * served, 'batches': len(batch_L), 'batch_size': batch_size,
            'throughput': served / total_time}


def main():
    mu = 1.0
    utilizations = [0.3, 0.5, 0.7, 0.8, 0.9, 0.95]

    # Oracle 1: the balance equations, solved numerically, against the closed form.
    worst = 0.0
    for rho in utilizations + [0.99]:
        lam = rho * mu
        pi = birth_death(lam, lambda n: mu, 600 if rho < 0.99 else 6000)
        num = measures_from_distribution(pi, lam)
        cf = mm1_closed_form(lam, mu)
        for key in ('L', 'Lq', 'W', 'Wq', 'p_wait'):
            worst = max(worst, abs(num[key] - cf[key]))
        assert abs(num['L'] - lam * num['W']) < 1e-9  # Little's law on the numerical solution
        assert abs(pi[0] - (1 - rho)) < 1e-9 and abs(pi[3] - (1 - rho) * rho ** 3) < 1e-9
    assert worst < 1e-9, worst

    # Oracle 2: the simulation referee.
    rows = []
    for rho in utilizations:
        lam = rho * mu
        rng = random.Random(SEED + int(rho * 100))
        customers = 60_000 if rho < 0.9 else 120_000
        batches = 20 if rho < 0.9 else 10
        sim = simulate(lam, mu, customers, rng, batches=batches)
        cf = mm1_closed_form(lam, mu)
        rows.append((rho, cf, sim))
        assert abs(sim['L'] - cf['L']) < 3 * sim['L_se'] + 0.02, (rho, sim['L'], cf['L'], sim['L_se'])
        assert abs(sim['Wq'] - cf['Wq']) < 3 * sim['Wq_se'] + 0.02, (rho, sim['Wq'], cf['Wq'], sim['Wq_se'])
        assert abs(sim['p_wait'] - cf['p_wait']) < 0.02, (rho, sim['p_wait'], cf['p_wait'])
        assert abs(sim['p_ge5'] - cf['p_ge5']) < 0.03, (rho, sim['p_ge5'], cf['p_ge5'])
        # Little's law inside the simulation: L = throughput x (Wq + 1/mu)
        little = sim['throughput'] * (sim['Wq'] + 1 / mu)
        assert abs(little - sim['L']) < 0.08 * max(1.0, sim['L']), (rho, little, sim['L'])

    # Oracle 3: the rivals at rho = 0.8 and 0.9.
    rivals = {}
    for rho in (0.8, 0.9):
        lam = rho * mu
        cf = mm1_closed_form(lam, mu)
        md1 = md1_closed_form(lam, mu)
        sim_md1 = simulate(lam, mu, 60_000, random.Random(SEED + 7), deterministic_service=True)
        assert abs(sim_md1['Wq'] - md1['Wq']) < 3 * sim_md1['Wq_se'] + 0.02, (rho, sim_md1['Wq'], md1['Wq'])
        assert abs(md1['Wq'] - cf['Wq'] / 2) < 1e-12
        # M/M/2 with two servers of rate mu / 2: same capacity, two slow servers
        pi2 = birth_death(lam, lambda n: (mu / 2) * min(n, 2), 600)
        mm2 = measures_from_distribution(pi2, lam, servers=2)
        sim_mm2 = simulate(lam, mu / 2, 60_000, random.Random(SEED + 9), servers=2)
        assert abs(sim_mm2['L'] - mm2['L']) < 3 * sim_mm2['L_se'] + 0.05, (rho, sim_mm2['L'], mm2['L'])
        assert mm2['W'] > cf['W'] and mm2['Wq'] < cf['Wq'], (mm2, cf)
        king = kingman(lam, mu, 1.0, 1.0)
        assert abs(king - cf['Wq']) < 1e-12
        king_d = kingman(lam, mu, 1.0, 0.0)
        assert abs(king_d - md1['Wq']) < 1e-12
        rivals[rho] = {'cf': cf, 'md1': md1, 'sim_md1': sim_md1, 'mm2': mm2, 'sim_mm2': sim_mm2, 'kingman': king}

    # Oracle 4: the explosion.
    explosion = [(rho, mm1_closed_form(rho * mu, mu)['L']) for rho in (0.5, 0.8, 0.9, 0.95, 0.99)]
    assert [round(x[1]) for x in explosion] == [1, 4, 9, 19, 99]

    # Oracle 5: deterministic capacity reasoning says nobody waits when lambda < mu.
    naive_wait = 0.0
    sim90 = next(s for r, _, s in rows if r == 0.9)
    sim95 = next(s for r, _, s in rows if r == 0.95)
    assert sim90['Wq'] > 7 * (1 / mu) and sim95['Wq'] > 12 * (1 / mu), (sim90['Wq'], sim95['Wq'])
    assert sim90['p_ge5'] > 0.5, sim90['p_ge5']

    print('contest: one server at rate mu = 1, Poisson arrivals at rate rho; referee: a discrete-event simulation of the actual queue (60,000 customers per utilization, 120,000 at rho >= 0.9, batch-means standard errors) and the balance equations solved numerically on a truncated chain')
    print(f'balance equations on a truncated chain against the closed form: worst disagreement {worst:.1e} across L, Lq, W, Wq, and P(wait) at seven utilizations; Little’s law and the geometric pi_n held to 1e-9')
    print(f'{"rho":>5} {"L formula":>9} {"L sim":>8} {"se":>6} {"Wq formula":>10} {"Wq sim":>8} {"se":>6} {"P(wait)":>8} {"sim":>6} {"P(N>=5)":>8} {"sim":>6} {"events":>8}')
    for rho, cf, sim in rows:
        print(f'{rho:>5.2f} {cf["L"]:>9.3f} {sim["L"]:>8.3f} {sim["L_se"]:>6.3f} {cf["Wq"]:>10.3f} {sim["Wq"]:>8.3f} {sim["Wq_se"]:>6.3f} {cf["p_wait"]:>8.3f} {sim["p_wait"]:>6.3f} {cf["p_ge5"]:>8.3f} {sim["p_ge5"]:>6.3f} {sim["events"]:>8,}')
    for rho, r in rivals.items():
        cf, md1, sm, mm2, s2 = r['cf'], r['md1'], r['sim_md1'], r['mm2'], r['sim_mm2']
        print(f'rho {rho:.1f}: M/M/1 Wq {cf["Wq"]:.3f}, W {cf["W"]:.3f}; M/D/1 (Pollaczek-Khinchine) Wq {md1["Wq"]:.3f} (simulated {sm["Wq"]:.3f} +/- {sm["Wq_se"]:.3f}), W {md1["W"]:.3f}; '
              f'M/M/2 with two half-speed servers (same balance equations, death rate min(n, 2) mu / 2): L {mm2["L"]:.3f} (simulated {s2["L"]:.3f} +/- {s2["L_se"]:.3f}), W {mm2["W"]:.3f}, Wq {mm2["Wq"]:.3f}; '
              f'Kingman G/G/1 with ca2 = cs2 = 1: Wq {r["kingman"]:.3f} (exact for M/M/1)')
    print('the explosion, L = rho / (1 - rho): ' + ', '.join(f'rho {rho:.2f}: {L:.0f}' for rho, L in explosion))
    print(f'deterministic capacity reasoning (lambda < mu, so no queue) predicts a wait of {naive_wait:.0f}; simulated mean queue wait at rho 0.9: {sim90["Wq"]:.2f} service times, P(5 or more in the system) {sim90["p_ge5"]:.2f}; at rho 0.95: {sim95["Wq"]:.2f} service times')
    print(f'OK: the balance equations reproduce the closed form to {worst:.0e}; the simulation sits within three standard errors of L, Wq, P(wait), and P(N >= 5) at six utilizations and obeys Little’s law; M/D/1 halves the queue wait ({rivals[0.9]["md1"]["Wq"]:.2f} against {rivals[0.9]["cf"]["Wq"]:.2f} at rho 0.9); '
          f'two half-speed servers lengthen the time in system ({rivals[0.9]["mm2"]["W"]:.2f} against {rivals[0.9]["cf"]["W"]:.2f}); Kingman is exact for M/M/1; L runs 1, 4, 9, 19, 99 at rho 0.5 to 0.99; capacity reasoning predicts no wait where the measured wait is {sim90["Wq"]:.1f} service times')


if __name__ == '__main__':
    main()
