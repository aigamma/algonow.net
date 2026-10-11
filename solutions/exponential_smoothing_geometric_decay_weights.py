"""Exponential smoothing x Geometric decay weights (puzzle 207).

One running level that moves a fraction alpha toward each observation,
which is a weighted average of the past with weights alpha (1 - alpha)^k.
Referees: the explicit weighted sum (equal to the recursion to 1e-12), the
steady-state Kalman gain of the local level model (the alpha that a
squared-error fit should find), the ARIMA(0,1,1) recursion with theta =
alpha - 1 (identical forecasts), the h-step variance formula checked by
coverage, and the rivals: naive, mean, moving average, Holt's linear trend,
seasonal naive, Holt-Winters.

AUTHOR CORRECTIONS (draft claims the measurement overturned):
- The draft wrote the trend lag as b (1 - alpha) / alpha; the unrolled sum
  gives b / alpha for the one-step forecast, and the measurement agrees
  with b / alpha (0.960 against 0.959), not the draft.
- The draft expected the one-step interval to cover 95 percent; with the
  innovation sd estimated from 280 in-sample errors it covers 92.5 percent
  at h = 1 and 93.5 at h = 10, so the page reports the measured coverage
  and the assertion is a band of 92 to 98 percent, not a point.
"""
import math
import random
import time

T0 = time.time()
rng = random.Random(20261010)


def ses(y, a, s0=None):
    """Simple exponential smoothing: returns (final level, forecasts, errors)."""
    s = y[0] if s0 is None else s0
    f, e = [], []
    for v in y:
        f.append(s)
        e.append(v - s)
        s = a * v + (1 - a) * s
    return s, f, e


def explicit_level(y, a, t):
    """The level after y[0..t-1] as the unrolled geometric sum (s0 = y[0])."""
    acc = (1 - a) ** t * y[0]
    for k in range(t):
        acc += a * (1 - a) ** k * y[t - 1 - k]
    return acc


def sse(y, a, burn=10):
    return sum(e * e for e in ses(y, a)[2][burn:])


def fit_alpha(y, lo=0.001, hi=0.999):
    """Coarse grid, then golden-section search on the one-step squared error."""
    grid = [lo + (hi - lo) * i / 18 for i in range(19)]
    best = min(grid, key=lambda a: sse(y, a))
    i = grid.index(best)
    a, b = grid[max(0, i - 1)], grid[min(18, i + 1)]
    g = (math.sqrt(5) - 1) / 2
    c, d = b - g * (b - a), a + g * (b - a)
    fc, fd = sse(y, c), sse(y, d)
    for _ in range(24):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - g * (b - a)
            fc = sse(y, c)
        else:
            a, c, fc = c, d, fd
            d = a + g * (b - a)
            fd = sse(y, d)
    return (a + b) / 2


def local_level(n, sig_eta, sig_eps, mu0=100.0):
    mu, y = mu0, []
    for _ in range(n):
        mu += rng.gauss(0, sig_eta)
        y.append(mu + rng.gauss(0, sig_eps))
    return y


def rmse(e):
    return math.sqrt(sum(v * v for v in e) / len(e))


def mae(e):
    return sum(abs(v) for v in e) / len(e)


def mean_se(xs):
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return m, math.sqrt(v / len(xs))


def holt(y, a, b):
    """Holt's linear trend: level and slope, one-step forecasts and errors."""
    lvl, tr = y[0], y[1] - y[0]
    f, e = [], []
    for v in y:
        p = lvl + tr
        f.append(p)
        e.append(v - p)
        nl = a * v + (1 - a) * p
        tr = b * (nl - lvl) + (1 - b) * tr
        lvl = nl
    return f, e


def fit_holt(y):
    best, arg = None, None
    for i in range(1, 20):
        for j in range(1, 20):
            a, b = i / 20, j / 20
            s = sum(v * v for v in holt(y, a, b)[1][10:])
            if best is None or s < best:
                best, arg = s, (a, b)
    return arg


def moving_average_errors(y, k):
    return [y[t] - sum(y[t - k:t]) / k for t in range(k, len(y))]


# 1. The recursion is the geometric weighted sum; the weights sum to one and
#    have mean lag (1 - alpha) / alpha.
gap = 0.0
for a in (0.1, 0.3, 0.5, 0.8):
    y = [rng.gauss(50, 10) for _ in range(60)]
    s, f, _ = ses(y, a)
    for t in (1, 7, 30, 59):
        gap = max(gap, abs(f[t] - explicit_level(y, a, t)))
    gap = max(gap, abs(s - explicit_level(y, a, 60)))
assert gap < 1e-12, gap
wsum = sum(0.3 * 0.7 ** k for k in range(3000))
wlag = sum(k * 0.3 * 0.7 ** k for k in range(3000))
assert abs(wsum - 1) < 1e-12 and abs(wlag - 0.7 / 0.3) < 1e-9, (wsum, wlag)
half = math.ceil(math.log(0.5) / math.log(0.7))  # observations holding half the weight
print(f"recursion = unrolled sum to {gap:.1e}; alpha 0.3: weights sum {wsum:.12f}, "
      f"mean lag {wlag:.4f} = (1 - a)/a {0.7 / 0.3:.4f}, half the weight inside the last {half} values")

# 2. Local level model: the squared-error alpha against the Kalman gain,
#    and the ARIMA(0,1,1) recursion with theta = alpha - 1.
Q = 0.25
ALPHA_STAR = (-Q + math.sqrt(Q * Q + 4 * Q)) / 2
fits = []
for _ in range(150):
    fits.append(fit_alpha(local_level(400, math.sqrt(Q), 1.0)))
fa, fse = mean_se(fits)
assert abs(fa - ALPHA_STAR) < 3 * fse + 0.02, (fa, fse, ALPHA_STAR)
y = local_level(300, math.sqrt(Q), 1.0)
_, f_ses, e_ses = ses(y, ALPHA_STAR)
theta = ALPHA_STAR - 1
f_ma, prev_f = [y[0]], y[0]
for t in range(1, 300):
    prev_f = y[t - 1] + theta * (y[t - 1] - prev_f)
    f_ma.append(prev_f)
arima_gap = max(abs(u - v) for u, v in zip(f_ses, f_ma))
assert arima_gap < 1e-9, arima_gap
print(f"local level q = {Q}: Kalman gain alpha* {ALPHA_STAR:.4f}; squared-error fit over 150 series "
      f"{fa:.4f} +- {fse:.4f}; ARIMA(0,1,1) with theta {theta:.4f} forecasts equal to {arima_gap:.1e}")

# 3. One-step accuracy, fit on the first half, scored on the second half.
rows = {"smoothing": [], "naive": [], "mean": [], "moving avg": [], "alpha 0.01": []}
maes = {k: [] for k in rows}
best_ks = []
for _ in range(150):
    y = local_level(400, math.sqrt(Q), 1.0)
    a = fit_alpha(y[:200])
    ks = range(1, 41)
    k = min(ks, key=lambda kk: sum(v * v for v in moving_average_errors(y[:200], kk)))
    best_ks.append(k)
    e = ses(y, a)[2][200:]
    rows["smoothing"].append(rmse(e)); maes["smoothing"].append(mae(e))
    e = ses(y, 1.0)[2][200:]
    rows["naive"].append(rmse(e)); maes["naive"].append(mae(e))
    e = [y[t] - sum(y[:t]) / t for t in range(200, 400)]
    rows["mean"].append(rmse(e)); maes["mean"].append(mae(e))
    e = moving_average_errors(y, k)[200 - k:]
    rows["moving avg"].append(rmse(e)); maes["moving avg"].append(mae(e))
    e = ses(y, 0.01)[2][200:]
    rows["alpha 0.01"].append(rmse(e)); maes["alpha 0.01"].append(mae(e))
acc = {k: mean_se(v) for k, v in rows.items()}
accm = {k: mean_se(v)[0] for k, v in maes.items()}
floor = math.sqrt(1.0 / (1 - ALPHA_STAR))  # steady-state innovation sd at the true gain
print(f"one-step RMSE on the local level series (noise sd 1, innovation floor {floor:.3f}):")
for k in rows:
    m, s = acc[k]
    print(f"  {k:11s} {m:.3f} +- {s:.3f}  (MAE {accm[k]:.3f})")
print(f"  best moving average window {sum(best_ks) / len(best_ks):.1f} on average")
assert acc["smoothing"][0] < acc["moving avg"][0] < acc["naive"][0] < acc["mean"][0]
assert acc["smoothing"][0] < 1.15 * floor

# 4. A trend: smoothing lags by b / alpha; Holt's linear trend removes it.
B, SIG = 0.5, 2.0
ses_bias, holt_bias, ses_rm, holt_rm, alphas = [], [], [], [], []
for _ in range(60):
    y = [50 + B * t + rng.gauss(0, SIG) for t in range(300)]
    a = fit_alpha(y[:150])
    alphas.append(a)
    e = ses(y, a)[2][150:]
    ses_bias.append(sum(e) / len(e)); ses_rm.append(rmse(e))
    ha, hb = fit_holt(y[:150])
    e = holt(y, ha, hb)[1][150:]
    holt_bias.append(sum(e) / len(e)); holt_rm.append(rmse(e))
am = sum(alphas) / len(alphas)
sb, sbse = mean_se(ses_bias)
hb_, hbse = mean_se(holt_bias)
lag_formula = B / am
assert abs(sb - lag_formula) < 0.15 * lag_formula, (sb, lag_formula)
assert abs(hb_) < 3 * hbse + 0.1 and mean_se(holt_rm)[0] < mean_se(ses_rm)[0]
print(f"trend b = {B} with noise {SIG}: smoothing alpha {am:.2f} lags {sb:.3f} +- {sbse:.3f} "
      f"(b / alpha = {lag_formula:.3f}), RMSE {mean_se(ses_rm)[0]:.3f}; Holt bias {hb_:.3f} +- {hbse:.3f}, "
      f"RMSE {mean_se(holt_rm)[0]:.3f}")

# 5. Interval variance: sigma^2 (1 + (h - 1) alpha^2), checked by coverage.
H = 10
errs = {h: [] for h in range(1, H + 1)}
cover = {h: 0 for h in range(1, H + 1)}
R = 400
for _ in range(R):
    y = local_level(300 + H, math.sqrt(Q), 1.0)
    lvl, _, e = ses(y[:300], ALPHA_STAR)
    sig1 = math.sqrt(sum(v * v for v in e[20:]) / (len(e) - 20))
    for h in range(1, H + 1):
        err = y[299 + h] - lvl
        errs[h].append(err)
        if abs(err) <= 1.96 * sig1 * math.sqrt(1 + (h - 1) * ALPHA_STAR ** 2):
            cover[h] += 1
var1 = sum(v * v for v in errs[1]) / R
ratios = {h: (sum(v * v for v in errs[h]) / R) / var1 for h in errs}
for h in (1, 5, 10):
    assert 0.92 <= cover[h] / R <= 0.98, (h, cover[h] / R)
assert abs(ratios[10] - (1 + 9 * ALPHA_STAR ** 2)) < 0.25 * (1 + 9 * ALPHA_STAR ** 2)
print("h-step intervals over 400 series: coverage "
      + ", ".join(f"h={h} {cover[h] / R:.3f}" for h in (1, 2, 5, 10))
      + f"; error variance ratio at h=10 {ratios[10]:.2f} against 1 + 9 alpha^2 = {1 + 9 * ALPHA_STAR ** 2:.2f}")

# 6. Negative example: smoothing on a seasonal series, against seasonal
#    naive and Holt-Winters; the degenerate alphas on the local level model.
M = 12
sea_ses, sea_naive, sea_hw, lags = [], [], [], []
for _ in range(40):
    y = [100 + 20 * math.sin(2 * math.pi * t / M) + rng.gauss(0, 2) for t in range(240)]
    a = fit_alpha(y[:120])
    f, e = ses(y, a)[1:]
    sea_ses.append(rmse(e[120:]))
    sea_naive.append(rmse([y[t] - y[t - M] for t in range(120, 240)]))
    # additive Holt-Winters, level and season only (alpha 0.2, gamma 0.3)
    lvl = sum(y[:M]) / M
    idx = [y[i] - lvl for i in range(M)]
    eh = []
    for t in range(len(y)):
        p = lvl + idx[t % M]
        eh.append(y[t] - p)
        nl = 0.2 * (y[t] - idx[t % M]) + 0.8 * lvl
        idx[t % M] = 0.3 * (y[t] - nl) + 0.7 * idx[t % M]
        lvl = nl
    sea_hw.append(rmse(eh[120:]))
    clean = [100 + 20 * math.sin(2 * math.pi * t / M) for t in range(240)]
    best_lag = min(range(0, 7), key=lambda L: sum((f[t] - clean[t - L]) ** 2 for t in range(130, 240)))
    lags.append(best_lag)
s_ses, s_nv, s_hw = (mean_se(v)[0] for v in (sea_ses, sea_naive, sea_hw))
assert s_ses > 2.5 * s_nv and s_hw < 1.5 * s_nv
print(f"seasonal series (amplitude 20, noise 2): smoothing RMSE {s_ses:.2f} trailing the signal by "
      f"{sum(lags) / len(lags):.1f} months; seasonal naive {s_nv:.2f}; Holt-Winters {s_hw:.2f}")
print(f"degenerate ends on the local level series: alpha 1 (naive) {acc['naive'][0]:.3f}, alpha 0.01 "
      f"{acc['alpha 0.01'][0]:.3f}, against {acc['smoothing'][0]:.3f} fitted; {time.time() - T0:.1f} s")

print(f"OK: the recursion equals the geometric sum to {gap:.0e} with weights summing to one and mean lag "
      f"(1 - a)/a; the squared-error alpha {fa:.3f} +- {fse:.3f} sits by the Kalman gain {ALPHA_STAR:.3f} "
      f"over 150 local level series and the ARIMA(0,1,1) recursion matches to {arima_gap:.0e}; one-step RMSE "
      f"{acc['smoothing'][0]:.3f} against moving average {acc['moving avg'][0]:.3f}, naive {acc['naive'][0]:.3f}, "
      f"mean {acc['mean'][0]:.3f}; on a trend the forecast lags b / alpha ({sb:.2f} against {lag_formula:.2f}) "
      f"where Holt's bias is {hb_:.2f}; 95% intervals cover {cover[1] / R:.3f} at h=1 and {cover[10] / R:.3f} at "
      f"h=10; on a seasonal series {s_ses:.2f} against seasonal naive {s_nv:.2f}; {time.time() - T0:.1f} s")
