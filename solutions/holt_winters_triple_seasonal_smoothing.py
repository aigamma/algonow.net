# Puzzle 164: Holt-Winters x Triple seasonal smoothing
# Seasonal forecasting: a monthly series has a level that drifts, a trend,
# and a pattern that repeats every m periods. Forecast the next two years.
# The algorithm is exponential smoothing: every estimate is a weighted
# average that forgets the past geometrically, so one pass over the data
# with three running numbers replaces a model fit. The heuristic is the
# triple decomposition (Holt 1957, Winters 1960): three smoothing
# equations, one each for level, trend, and seasonal index, with their
# own rates alpha, beta, gamma chosen to minimize the one-step-ahead
# squared error, and the seasonal indices kept as a cycle of m numbers,
# additive when the swings are constant, multiplicative when they grow
# with the level. The forecast h steps out is level plus h trends, plus
# (or times) the index for that month.
#
# Referees:
# (1) A SYNTHETIC SERIES WITH KNOWN PARTS: level 100 drifting 0.5 a
#     month, an additive twelve-month pattern of amplitude 20, Gaussian
#     noise of 3; ten years to fit, two held out. The oracle forecast
#     built from the true parts has root-mean-square error near 3, the
#     noise floor, and Holt-Winters must land within a factor of 1.5 of
#     it, ahead of the seasonal naive forecast, seasonal naive with
#     drift, simple exponential smoothing, and Holt's linear trend;
# (2) THE RESIDUALS: the one-step residuals of the fitted model must show
#     no seasonal pattern left (autocorrelation at lag 12 below 0.1),
#     while Holt's trend-only residuals must (above 0.25);
# (3) ADDITIVE VERSUS MULTIPLICATIVE: on a series whose swings grow with
#     the level, the multiplicative form must beat the additive one on
#     the held-out years;
# (4) THE AIRLINE SERIES: the Box and Jenkins monthly airline passengers,
#     1949 to 1960, ten years to fit and 1959 to 1960 held out, scored by
#     root-mean-square error and mean absolute percentage error against
#     the same rivals;
# (5) THE NEGATIVE EXAMPLES, measured: Holt's linear trend on seasonal
#     data, and Holt-Winters with the wrong season length.
#
# AUTHOR CORRECTIONS: the draft expected Holt's residuals to carry the
# whole seasonal pattern, an autocorrelation above 0.5 at lag 12. Holt's
# fit chases the swings with a large alpha, so its residuals are closer
# to the differenced pattern and the measured value is 0.37; the bound is
# 0.25, and the contrast with the Holt-Winters residual, near 0.02, stands.
# The draft also asserted the textbook result that the multiplicative form
# beats the additive one on the airline series; on this 24-month holdout
# with one-step fitting they are within 3% of each other and the additive
# form is slightly ahead, so the file selects a form by training error
# before looking at the holdout and reports all three forms.
import math
import random

SEED = 20260926

AIRLINE = [
    112, 118, 132, 129, 121, 135, 148, 148, 136, 119, 104, 118,
    115, 126, 141, 135, 125, 149, 170, 170, 158, 133, 114, 140,
    145, 150, 178, 163, 172, 178, 199, 199, 184, 162, 146, 166,
    171, 180, 193, 181, 183, 218, 230, 242, 209, 191, 172, 194,
    196, 196, 236, 235, 229, 243, 264, 272, 237, 211, 180, 201,
    204, 188, 235, 227, 234, 264, 302, 293, 259, 229, 203, 229,
    242, 233, 267, 269, 270, 315, 364, 347, 312, 274, 237, 278,
    284, 277, 317, 313, 318, 374, 413, 405, 355, 306, 271, 306,
    315, 301, 356, 348, 355, 422, 465, 467, 404, 347, 305, 336,
    340, 318, 362, 348, 363, 435, 491, 505, 404, 359, 310, 337,
    360, 342, 406, 396, 420, 472, 548, 559, 463, 407, 362, 405,
    417, 391, 419, 461, 472, 535, 622, 606, 508, 461, 390, 432,
]


def holt_winters(y, m, alpha, beta, gamma, mult=False, h=0):
    """Triple exponential smoothing. Returns (one-step fitted values,
    h-step forecasts from the end, sum of squared one-step errors)."""
    n = len(y)
    level = sum(y[:m]) / m
    trend = (sum(y[m:2 * m]) - sum(y[:m])) / (m * m)
    season = [(y[i] / level if mult else y[i] - level) for i in range(m)]
    fitted = []
    sse = 0.0
    for t in range(n):
        s = season[t % m]
        f = (level + trend) * s if mult else level + trend + s
        fitted.append(f)
        e = y[t] - f
        sse += e * e
        prev_level = level
        if mult:
            level = alpha * (y[t] / s) + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend
            season[t % m] = gamma * (y[t] / level) + (1 - gamma) * s
        else:
            level = alpha * (y[t] - s) + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend
            season[t % m] = gamma * (y[t] - level) + (1 - gamma) * s
    forecasts = []
    for k in range(1, h + 1):
        s = season[(n + k - 1) % m]
        forecasts.append((level + k * trend) * s if mult else level + k * trend + s)
    return fitted, forecasts, sse


def fit_holt_winters(y, m, mult=False, h=0):
    """Choose alpha, beta, gamma by one-step squared error: a coarse grid,
    then a fine grid around the best cell."""
    best = None
    grid = [i / 20 for i in range(1, 20)]
    for a in grid:
        for b in grid:
            for g in grid:
                sse = holt_winters(y, m, a, b, g, mult)[2]
                if best is None or sse < best[0]:
                    best = (sse, a, b, g)
    _, a0, b0, g0 = best
    fine = [i / 100 for i in range(-5, 6)]
    for da in fine:
        for db in fine:
            for dg in fine:
                a, b, g = a0 + da, b0 + db, g0 + dg
                if not (0 < a < 1 and 0 < b < 1 and 0 < g < 1):
                    continue
                sse = holt_winters(y, m, a, b, g, mult)[2]
                if sse < best[0]:
                    best = (sse, a, b, g)
    sse, a, b, g = best
    fitted, forecasts, _ = holt_winters(y, m, a, b, g, mult, h)
    return (a, b, g), fitted, forecasts, sse


def ses(y, h):
    """Simple exponential smoothing, alpha by one-step squared error."""
    best = None
    for i in range(1, 100):
        a = i / 100
        level = y[0]
        sse = 0.0
        fitted = []
        for t in range(len(y)):
            fitted.append(level)
            sse += (y[t] - level) ** 2
            level = a * y[t] + (1 - a) * level
        if best is None or sse < best[0]:
            best = (sse, a, fitted, [level] * h)
    return best[1], best[2], best[3]


def holt(y, h):
    """Holt's linear trend, alpha and beta by one-step squared error."""
    best = None
    for i in range(1, 50):
        for j in range(1, 50):
            a, b = i / 50, j / 50
            level, trend = y[0], y[1] - y[0]
            sse = 0.0
            fitted = []
            for t in range(len(y)):
                f = level + trend
                fitted.append(f)
                sse += (y[t] - f) ** 2
                prev = level
                level = a * y[t] + (1 - a) * (level + trend)
                trend = b * (level - prev) + (1 - b) * trend
            if best is None or sse < best[0]:
                best = (sse, (a, b), fitted, [level + k * trend for k in range(1, h + 1)])
    return best[1], best[2], best[3]


def seasonal_naive(y, m, h, drift=False):
    n = len(y)
    d = (y[-1] - y[m - 1]) / (n - m) if drift else 0.0
    return [y[n - m + ((k - 1) % m)] + k * d for k in range(1, h + 1)]


def rmse(a, b):
    return math.sqrt(sum((x - z) ** 2 for x, z in zip(a, b)) / len(a))


def mape(actual, forecast):
    return 100 * sum(abs(x - z) / abs(x) for x, z in zip(actual, forecast)) / len(actual)


def autocorr(x, lag):
    mean = sum(x) / len(x)
    num = sum((x[t] - mean) * (x[t - lag] - mean) for t in range(lag, len(x)))
    den = sum((v - mean) ** 2 for v in x)
    return num / den if den else 0.0


def synthetic(rng, n, level, drift, amplitude, sigma, m=12, mult=False):
    pattern = [amplitude * math.sin(2 * math.pi * i / m) + 0.4 * amplitude * math.cos(4 * math.pi * i / m) for i in range(m)]
    truth = []
    y = []
    for t in range(n):
        base = level + drift * t
        s = pattern[t % m]
        clean = base * (1 + s / 100) if mult else base + s
        truth.append(clean)
        y.append(clean + rng.gauss(0, sigma))
    return y, truth


if __name__ == '__main__':
    rng = random.Random(SEED)
    m = 12
    H = 24

    # Oracle 1 and 2: the additive synthetic series.
    y, truth = synthetic(rng, 144, 100.0, 0.5, 20.0, 3.0)
    train, test = y[:120], y[120:]
    params, fitted, fc_hw, sse = fit_holt_winters(train, m, False, H)
    _, _, fc_add_mult, _ = fit_holt_winters(train, m, True, H)
    a_ses, fit_ses, fc_ses = ses(train, H)
    p_holt, fit_holt, fc_holt = holt(train, H)
    fc_sn = seasonal_naive(train, m, H)
    fc_snd = seasonal_naive(train, m, H, drift=True)
    fc_oracle = truth[120:]
    err = {
        'oracle (true parts)': rmse(test, fc_oracle),
        'Holt-Winters additive': rmse(test, fc_hw),
        'Holt-Winters multiplicative': rmse(test, fc_add_mult),
        'seasonal naive with drift': rmse(test, fc_snd),
        'seasonal naive': rmse(test, fc_sn),
        'simple exponential smoothing': rmse(test, fc_ses),
        "Holt's linear trend": rmse(test, fc_holt),
    }
    assert err['Holt-Winters additive'] < 1.5 * err['oracle (true parts)'], err
    assert err['Holt-Winters additive'] < err['seasonal naive with drift'] < err['seasonal naive'], err
    assert err["Holt's linear trend"] > 3 * err['Holt-Winters additive'], err
    assert err['simple exponential smoothing'] > 3 * err['Holt-Winters additive'], err
    res_hw = [train[t] - fitted[t] for t in range(m, 120)]
    res_holt = [train[t] - fit_holt[t] for t in range(m, 120)]
    r12_hw = autocorr(res_hw, 12)
    r12_holt = autocorr(res_holt, 12)
    assert abs(r12_hw) < 0.1 and r12_holt > 0.25, (r12_hw, r12_holt)
    # the wrong season length
    _, _, fc_wrong, _ = fit_holt_winters(train, 4, False, H)
    err_wrong = rmse(test, fc_wrong)
    assert err_wrong > 3 * err['Holt-Winters additive'], err_wrong

    # Oracle 3: swings that grow with the level.
    y2, truth2 = synthetic(rng, 144, 100.0, 1.5, 25.0, 4.0, mult=True)
    train2, test2 = y2[:120], y2[120:]
    p_add2, _, fc_add2, _ = fit_holt_winters(train2, m, False, H)
    p_mul2, _, fc_mul2, _ = fit_holt_winters(train2, m, True, H)
    e_add2, e_mul2, e_or2 = rmse(test2, fc_add2), rmse(test2, fc_mul2), rmse(test2, truth2[120:])
    assert e_mul2 < e_add2, (e_mul2, e_add2)

    # Oracle 4: the airline passengers. Three forms of the hero; the one
    # with the smallest one-step training error in passengers is selected
    # before the held-out years are looked at.
    tr, te = AIRLINE[:120], AIRLINE[120:]
    p_am, fit_am, fc_am, _ = fit_holt_winters(tr, m, True, H)
    p_aa, fit_aa, fc_aa, _ = fit_holt_winters(tr, m, False, H)
    log_tr = [math.log(v) for v in tr]
    p_al, fit_al_log, fc_al_log, _ = fit_holt_winters(log_tr, m, False, H)
    fit_al = [math.exp(v) for v in fit_al_log]
    fc_al = [math.exp(v) for v in fc_al_log]
    forms = {
        'Holt-Winters multiplicative': (p_am, fit_am, fc_am),
        'Holt-Winters additive': (p_aa, fit_aa, fc_aa),
        'Holt-Winters additive on log': (p_al, fit_al, fc_al),
    }
    train_rmse = {k: rmse(tr[m:], v[1][m:]) for k, v in forms.items()}
    selected = min(train_rmse, key=train_rmse.get)
    _, _, fc_a_ses = ses(tr, H)
    _, _, fc_a_holt = holt(tr, H)
    fc_a_sn = seasonal_naive(tr, m, H)
    fc_a_snd = seasonal_naive(tr, m, H, drift=True)
    air = {k: (rmse(te, v[2]), mape(te, v[2])) for k, v in forms.items()}
    air.update({
        'seasonal naive with drift': (rmse(te, fc_a_snd), mape(te, fc_a_snd)),
        'seasonal naive': (rmse(te, fc_a_sn), mape(te, fc_a_sn)),
        "Holt's linear trend": (rmse(te, fc_a_holt), mape(te, fc_a_holt)),
        'simple exponential smoothing': (rmse(te, fc_a_ses), mape(te, fc_a_ses)),
    })
    assert air[selected][0] < air['seasonal naive with drift'][0], (selected, air)
    assert air[selected][0] < air["Holt's linear trend"][0] / 3, (selected, air)
    assert max(air[k][0] for k in forms) < air['seasonal naive with drift'][0], air

    print('contest: forecast two years of a monthly seasonal series; referees: a synthetic series with known level, drift, pattern, and noise (the oracle forecast from the true parts is the floor), '
          'the residual autocorrelation at lag 12, and the Box-Jenkins airline passengers with 1959 to 1960 held out')
    print(f'synthetic additive series (level 100, drift 0.5 a month, amplitude 20, noise 3), fitted alpha {params[0]:.2f} beta {params[1]:.2f} gamma {params[2]:.2f}; held-out RMSE over 24 months:')
    for k, v in err.items():
        print(f'  {k:>30} {v:8.2f}')
    print(f'  {"wrong season length (m = 4)":>30} {err_wrong:8.2f}')
    print(f'residual autocorrelation at lag 12 on the fit: Holt-Winters {r12_hw:+.2f}, Holt linear trend {r12_holt:+.2f} (Holt alpha {p_holt[0]:.2f} beta {p_holt[1]:.2f} chases the swings)')
    print(f'multiplicative series (swings grow with the level, drift 1.5): additive form {e_add2:.2f}, multiplicative form {e_mul2:.2f}, oracle {e_or2:.2f} (multiplicative alpha {p_mul2[0]:.2f} beta {p_mul2[1]:.2f} gamma {p_mul2[2]:.2f})')
    print(f'airline passengers 1949-1958 fitted, 1959-1960 held out; selected by training one-step RMSE before looking: {selected} '
          f'({", ".join(f"{k.split()[-1] if k != chr(72) + chr(111) + chr(108) + chr(116) + "-Winters additive on log" else "log"} {v:.1f}" for k, v in train_rmse.items())}); held-out RMSE and MAPE:')
    for k, (r, p) in air.items():
        print(f'  {k:>30} {r:8.1f} {p:6.1f}%')
    print(f'  fitted rates: multiplicative alpha {p_am[0]:.2f} beta {p_am[1]:.2f} gamma {p_am[2]:.2f}; additive {p_aa[0]:.2f} {p_aa[1]:.2f} {p_aa[2]:.2f}; log-additive {p_al[0]:.2f} {p_al[1]:.2f} {p_al[2]:.2f}')
    print(f"OK: Holt-Winters within {err['Holt-Winters additive'] / err['oracle (true parts)']:.2f}x of the noise floor on the synthetic series, ahead of seasonal naive with drift ({err['seasonal naive with drift']:.2f}) and Holt ({err[chr(72) + 'olt' + chr(39) + 's linear trend']:.2f}); "
          f'residual lag-12 autocorrelation {r12_hw:+.2f} against {r12_holt:+.2f}; multiplicative beats additive on growing swings ({e_mul2:.2f} vs {e_add2:.2f}); '
          f"airline: the pre-selected {selected} at MAPE {air[selected][1]:.1f}% against {air['seasonal naive with drift'][1]:.1f}% for seasonal naive with drift and {air[chr(72) + 'olt' + chr(39) + 's linear trend'][1]:.1f}% for Holt")
