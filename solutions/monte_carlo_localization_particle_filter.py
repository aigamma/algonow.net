# Puzzle 138: Monte Carlo localization x particle filter
# Robot localization: a robot moves along a known map with a noisy
# odometer and a noisy sensor, and must work out where it is. Its
# belief about its position is a probability distribution, and the
# right answer is Bayes' rule applied at every step: predict through
# the motion model, then multiply by the likelihood of what the sensor
# saw. Monte Carlo localization is the algorithm: represent the belief
# by a cloud of particles (guessed positions), move every particle
# through the noisy motion model, weight each by how well it explains
# the sensor reading, and resample so that likely particles multiply
# and unlikely ones die. The heuristic is the particle filter itself,
# the resampling step above all: without it the weights collapse onto
# one particle and the cloud stops representing anything.
#
# The world: a circular corridor 100 m around with doors at known
# positions. The robot advances 2 m per step (odometry noise 0.3 m)
# and its sensor reports the distance to the nearest door (noise 1 m).
# It starts somewhere unknown: the prior is uniform over the loop.
#
# Referees:
# (1) THE EXACT BAYES FILTER on a 2,000-cell grid (predict by
#     circular convolution with the motion noise, update by the same
#     likelihood): the particle filter's posterior mean must track the
#     grid filter's to within 1 m on average once both have converged,
#     and the grid filter itself must track the true position;
# (2) CONVERGENCE from a uniform prior: the position error falls under
#     2 m within a measured number of steps and stays there;
# (3) THE PARTICLE COUNT: the steady-state error for 50, 200, 1,000,
#     and 5,000 particles, showing the cost of too few;
# (4) THE ABLATION: the same filter with resampling removed keeps the
#     weights but never resamples; its effective sample size collapses
#     toward 1 and its error is measured against the resampled filter;
# (5) THE KIDNAPPED ROBOT: teleported at step 120, the plain filter
#     (no random particles) is measured for whether and when it
#     recovers, against the augmented filter that injects 2% random
#     particles per step.
import math
import random

SEED = 20260926
LOOP = 100.0
DOORS = [10.0, 30.0, 37.0, 70.0]
STEP = 2.0
ODO_SD = 0.3
SENSOR_SD = 1.0
N_STEPS = 200
KIDNAP_AT = 120
KIDNAP_TO = 85.0


def wrap(x):
    return x % LOOP


def nearest_door_distance(x):
    best = LOOP
    for d in DOORS:
        diff = abs(x - d)
        best = min(best, diff, LOOP - diff)
    return best


def likelihood(z, x):
    r = z - nearest_door_distance(x)
    return math.exp(-0.5 * (r / SENSOR_SD) ** 2)


def circular_mean(xs, ws=None):
    n = len(xs)
    if ws is None:
        ws = [1.0] * n
    s = sum(w * math.sin(2 * math.pi * x / LOOP) for x, w in zip(xs, ws))
    c = sum(w * math.cos(2 * math.pi * x / LOOP) for x, w in zip(xs, ws))
    return wrap(math.atan2(s, c) * LOOP / (2 * math.pi))


def circ_err(a, b):
    d = abs(a - b) % LOOP
    return min(d, LOOP - d)


def simulate_robot(rng, kidnap=False):
    """The truth: positions and sensor readings."""
    x = rng.uniform(0, LOOP)
    truth = []
    readings = []
    for t in range(N_STEPS):
        if kidnap and t == KIDNAP_AT:
            x = KIDNAP_TO
        x = wrap(x + STEP + rng.gauss(0, ODO_SD))
        truth.append(x)
        readings.append(nearest_door_distance(x) + rng.gauss(0, SENSOR_SD))
    return truth, readings


def particle_filter(readings, n, rng, resample=True, random_fraction=0.0):
    """Returns the posterior mean per step and the minimum effective
    sample size seen."""
    particles = [rng.uniform(0, LOOP) for _ in range(n)]
    weights = [1.0 / n] * n
    means = []
    min_ess = n
    for z in readings:
        particles = [wrap(p + STEP + rng.gauss(0, ODO_SD)) for p in particles]
        weights = [w * likelihood(z, p) for w, p in zip(weights, particles)]
        total = sum(weights)
        if total == 0:
            weights = [1.0 / n] * n
        else:
            weights = [w / total for w in weights]
        ess = 1.0 / sum(w * w for w in weights)
        min_ess = min(min_ess, ess)
        means.append(circular_mean(particles, weights))
        if resample:
            # low-variance (systematic) resampling
            new = []
            r = rng.uniform(0, 1.0 / n)
            c = weights[0]
            i = 0
            for m in range(n):
                u = r + m / n
                while u > c and i < n - 1:
                    i += 1
                    c += weights[i]
                new.append(particles[i])
            k = int(random_fraction * n)
            for j in range(k):
                new[rng.randrange(n)] = rng.uniform(0, LOOP)
            particles = new
            weights = [1.0 / n] * n
    return means, min_ess


def grid_filter(readings, cells=2000):
    """The exact Bayes filter on a circular grid."""
    dx = LOOP / cells
    belief = [1.0 / cells] * cells
    centers = [(i + 0.5) * dx for i in range(cells)]
    # motion kernel: shift by STEP with Gaussian spread ODO_SD, on the circle
    kernel = {}
    reach = int(math.ceil(4 * ODO_SD / dx))
    shift = STEP / dx
    for k in range(int(shift) - reach, int(shift) + reach + 2):
        kernel[k] = math.exp(-0.5 * ((k * dx - STEP) / ODO_SD) ** 2)
    ksum = sum(kernel.values())
    kernel = {k: v / ksum for k, v in kernel.items()}
    like = [[likelihood(z, c) for c in centers] for z in set(readings)]
    like_of = {z: row for z, row in zip(set(readings), like)}
    means = []
    for z in readings:
        moved = [0.0] * cells
        for i, b in enumerate(belief):
            if b < 1e-12:
                continue
            for k, w in kernel.items():
                moved[(i + k) % cells] += b * w
        lk = like_of[z]
        belief = [m * l for m, l in zip(moved, lk)]
        total = sum(belief)
        belief = [b / total for b in belief]
        means.append(circular_mean(centers, belief))
    return means


if __name__ == '__main__':
    rng = random.Random(SEED)
    truth, readings = simulate_robot(rng)

    # Oracle 1 + 2: the grid referee and convergence.
    grid_means = grid_filter(readings)
    pf_means, ess_pf = particle_filter(readings, 1000, random.Random(SEED + 1))
    grid_err = [circ_err(m, t) for m, t in zip(grid_means, truth)]
    pf_err = [circ_err(m, t) for m, t in zip(pf_means, truth)]
    conv_grid = next(i for i in range(N_STEPS) if all(e < 2.0 for e in grid_err[i:i + 20]))
    conv_pf = next(i for i in range(N_STEPS) if all(e < 2.0 for e in pf_err[i:i + 20]))
    settled = max(conv_grid, conv_pf) + 20
    agree = sum(circ_err(a, b) for a, b in zip(pf_means[settled:], grid_means[settled:])) / (N_STEPS - settled)
    steady_grid = sum(grid_err[settled:]) / (N_STEPS - settled)
    steady_pf = sum(pf_err[settled:]) / (N_STEPS - settled)
    assert agree < 1.0, agree
    assert steady_grid < 1.5 and steady_pf < 1.5, (steady_grid, steady_pf)
    assert conv_pf < 80, conv_pf

    # Oracle 3: the particle count.
    by_n = {}
    for n in (50, 200, 1000, 5000):
        errs = []
        for trial in range(3):
            means, _ = particle_filter(readings, n, random.Random(SEED + 10 + trial))
            errs.append(sum(circ_err(m, t) for m, t in zip(means[settled:], truth[settled:])) / (N_STEPS - settled))
        by_n[n] = sum(errs) / len(errs)
    assert by_n[5000] < by_n[50], by_n

    # Oracle 4: no resampling.
    sis_means, ess_sis = particle_filter(readings, 1000, random.Random(SEED + 1), resample=False)
    sis_err = sum(circ_err(m, t) for m, t in zip(sis_means[settled:], truth[settled:])) / (N_STEPS - settled)
    assert ess_sis < 5 and ess_pf > 20, (ess_sis, ess_pf)

    # Oracle 5: the kidnapped robot.
    truth_k, readings_k = simulate_robot(random.Random(SEED), kidnap=True)
    plain_means, _ = particle_filter(readings_k, 1000, random.Random(SEED + 2))
    aug_means, _ = particle_filter(readings_k, 1000, random.Random(SEED + 2), random_fraction=0.02)
    plain_err = [circ_err(m, t) for m, t in zip(plain_means, truth_k)]
    aug_err = [circ_err(m, t) for m, t in zip(aug_means, truth_k)]

    def recovery(err):
        for i in range(KIDNAP_AT + 1, N_STEPS - 10):
            if all(e < 3.0 for e in err[i:i + 10]):
                return i - KIDNAP_AT
        return None

    rec_plain = recovery(plain_err)
    rec_aug = recovery(aug_err)
    assert rec_aug is not None, 'the augmented filter should recover'
    plain_tail = sum(plain_err[KIDNAP_AT + 20:]) / (N_STEPS - KIDNAP_AT - 20)
    aug_tail = sum(aug_err[KIDNAP_AT + 20:]) / (N_STEPS - KIDNAP_AT - 20)
    assert aug_tail < plain_tail, (aug_tail, plain_tail)

    print(f'contest: a robot on a {LOOP:.0f} m loop with doors at {DOORS}, {STEP:.0f} m steps (odometry sd {ODO_SD}), a nearest-door range sensor (sd {SENSOR_SD}), uniform prior; referee: the exact Bayes filter on a 2,000-cell grid')
    print(f"  {'filter':<44} {'converged by':>12} {'steady error (m)':>16}   verdict")
    print(f"  {'exact grid filter (2,000 cells)':<44} {f'step {conv_grid}':>12} {steady_grid:>16.2f}   the referee: Bayes rule on every cell")
    print(f"  {'particle filter, 1,000 particles':<44} {f'step {conv_pf}':>12} {steady_pf:>16.2f}   tracks the grid mean to {agree:.2f} m; min ESS {ess_pf:.0f}")
    for n in (50, 200, 1000, 5000):
        print(f"  {f'particle filter, {n:,} particles (3 trials)':<44} {'-':>12} {by_n[n]:>16.2f}   {'too few: the cloud misses the truth' if n == 50 else 'more particles, less error, more work'}")
    print(f"  {'no resampling (weights only), 1,000':<44} {'-':>12} {sis_err:>16.2f}   effective sample size collapsed to {ess_sis:.1f}")
    print(f'kidnapped at step {KIDNAP_AT} (teleported to {KIDNAP_TO:.0f} m): plain filter {"recovered after " + str(rec_plain) + " steps" if rec_plain else "never recovered"} (tail error {plain_tail:.1f} m); '
          f'augmented filter (2% random particles per step) recovered after {rec_aug} steps (tail error {aug_tail:.1f} m)')
    print(f'OK: the particle filter tracked the exact grid filter to {agree:.2f} m once settled, converged by step {conv_pf} with steady error {steady_pf:.2f} m; error by particle count '
          f'{by_n[50]:.2f} / {by_n[200]:.2f} / {by_n[1000]:.2f} / {by_n[5000]:.2f} m; no resampling collapsed to ESS {ess_sis:.1f}; the augmented filter recovered from kidnapping in {rec_aug} steps')
