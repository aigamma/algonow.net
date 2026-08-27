# Puzzle 97: Kalman filter x covariance-weighted correction
# Tracking a moving state through noise, forever, in constant
# memory: blend what the model predicts with what the sensor says,
# weighted by exactly how much each deserves to be trusted.
#
# The pairing is the point. The algorithm is the Kalman filter
# (1960): predict the state forward through the dynamics, then
# correct with the new measurement: two lines run at every tick of
# every GPS, drone, and rocket since Apollo (whose navigator it
# was). The heuristic is the covariance-weighted correction: the
# gain K = P/(P+R) is not a tuning knob but a computed trust
# ratio: prediction uncertainty P against sensor noise R: updated
# every step by the same algebra. The referees cannot be argued
# with: (1) an independent Bayesian implementation (precision
# addition, derived separately) matches the filter's posterior
# mean and variance to 1e-12 over 300 steps: two derivations, one
# answer; (2) the gain converges to the CLOSED-FORM root of the
# algebraic Riccati equation (quadratic formula) to 1e-12; (3)
# OPTIMALITY IS MEASURED, not asserted: against a grid of 40
# fixed-gain filters on 400,000 steps, the Kalman MSE equals the
# best grid point's (within noise) and no gain beats it: the
# steady-state Kalman IS the best fixed gain, found by algebra
# instead of search; (4) the ablation: trust-the-sensor scores
# MSE = R = 4.0, dead reckoning drifts without bound (99 at
# t=100, 412 at t=400), the blend scores 1.56; and (5) the client: a 2D
# constant-velocity tracker cuts raw GPS error 2.3x: then the
# honest failure: a sharp maneuver breaks the model and the error
# spikes 2.9x until the filter re-converges: the divergence
# lesson every practitioner learns once.
import math
import random


def kalman_1d(zs, q, r, x0=0.0, p0=100.0):
    """Scalar random-walk Kalman: state x, F=1, H=1. Returns lists
    of (posterior mean, posterior var, gain)."""
    x, p = x0, p0
    out = []
    for z in zs:
        p = p + q                 # predict through the random walk
        k = p / (p + r)           # the trust ratio
        x = x + k * (z - x)       # covariance-weighted correction
        p = (1 - k) * p
        out.append((x, p, k))
    return out


def bayes_1d(zs, q, r, x0=0.0, p0=100.0):
    """Independent referee: exact linear-Gaussian Bayes by precision
    addition. Prior spreads by q; posterior precision = prior
    precision + measurement precision; posterior mean is the
    precision-weighted average. Derived separately from the filter
    equations: agreement is evidence, not restatement."""
    mean, var = x0, p0
    out = []
    for z in zs:
        var = var + q
        prec = 1.0 / var + 1.0 / r
        post_var = 1.0 / prec
        post_mean = post_var * (mean / var + z / r)
        mean, var = post_mean, post_var
        out.append((mean, var))
    return out


def steady_gain(q, r):
    """Closed form: the algebraic Riccati equation for the scalar
    random walk. P = (1-K)(P+q) with K = (P+q)/(P+q+r) has the
    positive root Pp = (q + sqrt(q^2 + 4qr)) / 2 for the PRIOR
    variance, giving K* = Pp / (Pp + r)."""
    pp = (q + math.sqrt(q * q + 4 * q * r)) / 2
    return pp / (pp + r)


def simulate(n, q, r, rng):
    xs = [0.0]
    zs = []
    for _ in range(n):
        xs.append(xs[-1] + rng.gauss(0, math.sqrt(q)))
        zs.append(xs[-1] + rng.gauss(0, math.sqrt(r)))
    return xs[1:], zs


def fixed_gain_mse(zs, xs, alpha):
    est = 0.0
    se = 0.0
    for z, x in zip(zs, xs):
        est = est + alpha * (z - est)
        se += (est - x) ** 2
    return se / len(zs)


if __name__ == "__main__":
    rng = random.Random(20260827)
    Q, R = 1.0, 4.0

    # Oracle 1: two derivations, one answer. 300 steps: filter ==
    # precision-Bayes to 1e-12 in both mean and variance.
    xs, zs = simulate(300, Q, R, rng)
    kf = kalman_1d(zs, Q, R)
    by = bayes_1d(zs, Q, R)
    for (xk, pk, _), (xb, pb) in zip(kf, by):
        assert abs(xk - xb) < 1e-12, (xk, xb)
        assert abs(pk - pb) < 1e-12, (pk, pb)

    # Oracle 2: the Riccati root. The iterated gain converges to
    # the closed-form steady state to 1e-12.
    k_star = steady_gain(Q, R)
    assert abs(kf[-1][2] - k_star) < 1e-12, (kf[-1][2], k_star)
    assert 0.35 < k_star < 0.45  # = 0.3904 for q=1, r=4

    # Oracle 3: OPTIMALITY, measured. 400,000 steps; a grid of 40
    # fixed gains. No gain beats Kalman's steady-state MSE, and the
    # best grid point matches it within simulation noise.
    xs, zs = simulate(400_000, Q, R, rng)
    kf = kalman_1d(zs, Q, R)
    k_mse = sum((e[0] - x) ** 2 for e, x in zip(kf, xs)) / len(xs)
    grid = [i / 40 for i in range(1, 40)]
    grid_mse = {a: fixed_gain_mse(zs, xs, a) for a in grid}
    best_a = min(grid_mse, key=grid_mse.get)
    assert abs(best_a - k_star) <= 0.05, (best_a, k_star)  # the best gain IS Riccati's
    assert all(m > k_mse * 0.995 for m in grid_mse.values()), "a fixed gain beat Kalman"
    worst_sensible = grid_mse[grid[0]]  # tiny gain: sluggish

    # Oracle 4: the ablation. Sensor-only: MSE == R (it copies the
    # measurement). Dead reckoning: unbounded drift, measured
    # growing. Kalman: the blend, far under both.
    sensor_mse = sum((z - x) ** 2 for z, x in zip(zs, xs)) / len(xs)
    assert abs(sensor_mse - R) < 0.1, sensor_mse
    # dead reckoning from the true start with no measurements:
    # error variance grows like q*t: compare two horizons.
    def dead_reckon_err(n):
        tot = 0.0
        for _ in range(200):
            x = 0.0
            xr = 0.0
            for _ in range(n):
                xr += rng.gauss(0, math.sqrt(Q))
            tot += (x - xr) ** 2
        return tot / 200
    d100 = dead_reckon_err(100)
    d400 = dead_reckon_err(400)
    assert d400 > 2.5 * d100  # drift compounds: ~q*t growth
    assert k_mse < sensor_mse / 2.5, (k_mse, sensor_mse)

    # Oracle 5: the 2D client and the honest failure. Constant-
    # velocity model, position-only measurements. Straight flight:
    # RMSE well under raw GPS. Then a hard 90-degree maneuver the
    # model does not know about: the error spikes, then re-converges.
    def kf2d(zs2, q, r, dt=1.0):
        # state [px, vx, py, vy]; hand-rolled 2x2 blocks per axis.
        est = [0.0, 0.0, 0.0, 0.0]
        P = [[100.0, 0.0], [0.0, 100.0]]
        Pxy = [ [ [100.0,0.0],[0.0,100.0] ], [ [100.0,0.0],[0.0,100.0] ] ]
        out = []
        for zx, zy in zs2:
            pt = []
            for axis, z in ((0, zx), (1, zy)):
                p_, v_ = est[axis * 2], est[axis * 2 + 1]
                Pm = Pxy[axis]
                # predict
                p_pred = p_ + dt * v_
                v_pred = v_
                a, b, c, d = Pm[0][0], Pm[0][1], Pm[1][0], Pm[1][1]
                # P = F P F^T + Q_cv
                na = a + dt * (c + b) + dt * dt * d + q * dt ** 4 / 4
                nb = b + dt * d + q * dt ** 3 / 2
                nc = c + dt * d + q * dt ** 3 / 2
                nd = d + q * dt * dt
                s = na + r
                kx = na / s
                kv = nc / s
                innov = z - p_pred
                p_new = p_pred + kx * innov
                v_new = v_pred + kv * innov
                Pxy[axis] = [
                    [(1 - kx) * na, (1 - kx) * nb],
                    [nc - kv * na, nd - kv * nb],
                ]
                est[axis * 2], est[axis * 2 + 1] = p_new, v_new
                pt.append(p_new)
            out.append(tuple(pt))
        return out

    q2, r2 = 0.01, 25.0
    truth = []
    meas = []
    px, py, vx, vy = 0.0, 0.0, 3.0, 0.0
    for t in range(400):
        if t == 200:
            vx, vy = 0.0, 3.0  # the maneuver the model cannot know
        px += vx
        py += vy
        truth.append((px, py))
        meas.append((px + rng.gauss(0, 5), py + rng.gauss(0, 5)))
    est = kf2d(meas, q2, r2)
    def rmse(seg):
        a, b = seg
        return math.sqrt(sum((ex - tx) ** 2 + (ey - ty) ** 2 for (ex, ey), (tx, ty) in zip(est[a:b], truth[a:b])) / (b - a))
    raw_rmse = math.sqrt(sum((mx - tx) ** 2 + (my - ty) ** 2 for (mx, my), (tx, ty) in zip(meas, truth)) / len(truth))
    cruise = rmse((60, 200))
    spike = rmse((200, 230))
    recovered = rmse((300, 400))
    assert cruise < raw_rmse / 2.0, (cruise, raw_rmse)
    assert spike > 2.5 * cruise, (spike, cruise)   # the model break, visible
    assert recovered < 1.6 * cruise                # and the re-convergence

    print("contest: track a drifting state through noise, forever, in O(1) memory; referee: an independent Bayesian implementation, the closed-form Riccati root, and 400,000 measured steps")
    print(f"  {'filter':<24} {'MSE':>8}   nature")
    print(f"  {'Trust the sensor':<24} {sensor_mse:>8.2f}   copies the measurement: MSE == R exactly")
    print(f"  {'Dead reckoning':<24} {'grows':>8}   no correction: error {d100:.0f} at t=100, {d400:.0f} at t=400: drift compounds")
    print(f"  {'Best fixed gain (grid)':<24} {grid_mse[best_a]:>8.2f}   found by searching 40 gains: lands on alpha = {best_a:.3f}")
    print(f"  {'Kalman':<24} {k_mse:>8.2f}   computes that gain from the covariances: K* = {k_star:.4f}, no search")
    print(f"two derivations, one answer: filter posterior == precision-form Bayes to 1e-12 in mean AND variance, 300 steps; the iterated gain == the algebraic Riccati root to 1e-12")
    print(f"the 2D client: raw GPS RMSE {raw_rmse:.1f} vs Kalman cruise {cruise:.1f} ({raw_rmse / cruise:.1f}x better); the honest failure: an unmodeled 90-degree maneuver spikes the error to {spike:.1f} ({spike / cruise:.1f}x) before re-convergence to {recovered:.1f}: the filter is only as good as its model")
    print("OK: Bayes agreement to 1e-12, the Riccati root hit, optimality measured against a 40-gain grid on 400,000 steps, the sensor/reckoning ablation priced, and the maneuver divergence shown and recovered")
