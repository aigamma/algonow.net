# Puzzle 58: Ternary search x two-probe interval thirds
# Locate the maximum of a unimodal function: rises, then falls: to any
# precision, using nothing but pointwise evaluations and comparisons.
#
# The pairing is the point. The algorithm is interval shrinking: keep a
# bracket guaranteed to contain the peak and cut it down until it is
# smaller than the tolerance: binary search's soul, wearing a different
# predicate. The heuristic is the two probes at the interval's thirds:
# if f(m1) < f(m2), the peak cannot live in the left third (unimodality
# says f cannot fall and rise again), so a third dies per round. The
# referee is construction: every test function's argmax is known
# analytically before the search runs. The refinement is measured:
# golden-section probes at the golden ratio and REUSES one probe per
# round, beating ternary's evaluation bill 45 to 104. And the contract
# is broken on purpose: on a bimodal function the same confident dance
# converges to the wrong peak: the premise was the certificate.
import math
import random


def ternary_max(f, lo, hi, eps=1e-9, counter=None):
    while hi - lo > eps:
        m1 = lo + (hi - lo) / 3
        m2 = hi - (hi - lo) / 3
        if counter is not None:
            counter["evals"] = counter.get("evals", 0) + 2
        if f(m1) < f(m2):
            lo = m1  # the peak cannot be left of m1
        else:
            hi = m2  # the peak cannot be right of m2
    return (lo + hi) / 2


PHI = (math.sqrt(5) - 1) / 2  # 0.618...


def golden_max(f, lo, hi, eps=1e-9, counter=None):
    """The reuse refinement: probes at the golden sections; after each
    cut, one interior probe is ALREADY in place: one eval per round."""
    m1 = hi - PHI * (hi - lo)
    m2 = lo + PHI * (hi - lo)
    f1 = f(m1)
    f2 = f(m2)
    if counter is not None:
        counter["evals"] = counter.get("evals", 0) + 2
    while hi - lo > eps:
        if f1 < f2:
            lo = m1
            m1, f1 = m2, f2
            m2 = lo + PHI * (hi - lo)
            f2 = f(m2)
        else:
            hi = m2
            m2, f2 = m1, f1
            m1 = hi - PHI * (hi - lo)
            f1 = f(m1)
        if counter is not None:
            counter["evals"] += 1
    return (lo + hi) / 2


def ternary_int(arr):
    """Integer lattice version on a unimodal array: exact argmax."""
    lo, hi = 0, len(arr) - 1
    while hi - lo > 2:
        m1 = lo + (hi - lo) // 3
        m2 = hi - (hi - lo) // 3
        if arr[m1] < arr[m2]:
            lo = m1 + 1
        else:
            hi = m2 - 1
    return max(range(lo, hi + 1), key=lambda i: arr[i])


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: 300 constructed unimodal functions with known argmax.
    for trial in range(300):
        p = rng.uniform(0.05, 0.95)
        kind = trial % 3
        if kind == 0:
            a = rng.uniform(0.5, 5)
            f = lambda x, p=p, a=a: -a * (x - p) ** 2
        elif kind == 1:  # asymmetric powers: still unimodal, peak at p
            aL = rng.uniform(1, 3)
            aR = rng.uniform(1, 3)
            f = lambda x, p=p, aL=aL, aR=aR: -(
                (p - x) ** 2 * aL if x < p else (x - p) ** 1.5 * aR
            )
        else:  # smooth bump
            w = rng.uniform(0.05, 0.4)
            f = lambda x, p=p, w=w: math.exp(-((x - p) ** 2) / w)
        got_t = ternary_max(f, 0.0, 1.0)
        got_g = golden_max(f, 0.0, 1.0)
        assert abs(got_t - p) < 1e-7, (trial, got_t, p)
        assert abs(got_g - p) < 1e-7, (trial, got_g, p)

    # Oracle 2: integer lattice: exact argmax on 300 unimodal arrays.
    for _ in range(300):
        n = rng.randint(1, 200)
        peak = rng.randrange(n)
        arr = [-abs(i - peak) * rng.randint(1, 3) - (i - peak) ** 2 for i in range(n)]
        assert ternary_int(arr) == peak

    # Oracle 3: the evaluation bill, measured against theory.
    f = lambda x: -((x - 0.6180339887) ** 2)
    c_t = {}
    ternary_max(f, 0.0, 1.0, 1e-9, c_t)
    c_g = {}
    golden_max(f, 0.0, 1.0, 1e-9, c_g)
    # Ternary shrinks by 2/3 per round (2 evals); golden by 0.618 (1).
    theory_t = 2 * math.ceil(math.log(1e-9) / math.log(2 / 3))
    theory_g = math.ceil(math.log(1e-9) / math.log(PHI)) + 2
    assert abs(c_t["evals"] - theory_t) <= 4
    assert abs(c_g["evals"] - theory_g) <= 4
    assert c_g["evals"] < c_t["evals"] * 0.6  # the reuse, priced

    # Oracle 4: a real client with an analytic answer. Revenue
    # r(p) = p * 1000 * exp(-p/20): maximized exactly at p = 20.
    revenue = lambda p: p * 1000 * math.exp(-p / 20)
    p_star = ternary_max(revenue, 0.0, 100.0, 1e-9)
    assert abs(p_star - 20.0) < 1e-6

    # Oracle 5: the plateau: any returned point attains the maximum.
    plat = lambda x: min(1.0, 4 * min(x, 1 - x))  # trapezoid top [0.25, 0.75]
    got = ternary_max(plat, 0.0, 1.0)
    assert abs(plat(got) - 1.0) < 1e-9

    # Oracle 6: the broken contract, measured. A tall narrow spike at
    # 0.06 (height 2.0) and a broad lesser hill at 0.70 (height 1.0):
    # the very first comparison (f(1/3) ~ 0 < f(2/3) ~ 0.9) discards
    # the left third: the global peak dies in round one, and the dance
    # converges confidently to the lesser hill.
    bimodal = lambda x: 2.0 * math.exp(-((x - 0.06) ** 2) / 0.0002) + math.exp(
        -((x - 0.70) ** 2) / 0.01
    )
    got_b = ternary_max(bimodal, 0.0, 1.0)
    assert abs(got_b - 0.70) < 0.02, got_b        # it found the hill
    assert bimodal(got_b) < bimodal(0.06) - 0.5   # and missed the spike

    print("contest: maximum of a unimodal function on [0, 1] to 1e-9; referee: every test function's argmax known analytically by construction")
    print(f"  {'method':<26} {'evals':>7}   requires")
    print(f"  {'Grid scan':<26} {'1e9':>7}   nothing: and a billion evaluations")
    print(f"  {'Ternary (2 probes/round)':<26} {c_t['evals']:>7}   unimodality + comparisons only")
    print(f"  {'Golden-section (reuse 1)':<26} {c_g['evals']:>7}   same contract: phi spacing recycles a probe")
    print(f"  {'Binary on derivative':<26} {'~30':>7}   f' available: a different, richer contract")
    print(f"the client: revenue p*1000*exp(-p/20) maximized at p = {p_star:.6f} (analytic: 20)")
    print(f"the broken contract, measured: a 2.0-tall spike at 0.06 dies in round one (f(1/3) < f(2/3) discards its third) and ternary converges confidently to the 1.0 hill at {got_b:.3f}: unimodality was the certificate")
    print("OK: 300 constructed-argmax functions and 300 unimodal arrays exact, the evaluation bills matching their shrink-rate theories with golden's reuse priced, the plateau safe, the revenue client analytic, and the bimodal betrayal measured")
