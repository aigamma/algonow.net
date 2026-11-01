"""Practice: change one behavior of the worked example.

The worked solution reports the nearest rank: the sample at index ceil(p times
n over 100) minus one. Most numeric and plotting libraries report a different
default, linear interpolation between the two samples on either side of the
fractional position (n minus 1) times p over 100, so a dashboard built on one
of them disagrees with a report built on the other. Make percentile
interpolate. Everything else stays the same.

Hint: keep the guards and the sorted copy. Compute position as the length
minus one, times p, divided by 100. Take lower = math.floor(position) and
fraction = position - lower. When lower + 1 reaches the end of the list,
return the last sample; otherwise return ordered[lower] plus fraction times
the gap from ordered[lower] to ordered[lower + 1].

Expected: old p50 332.50, p95 365.25, p99 369.05; new p50 182.50, p95 1210.00,
p99 1362.00. Run alone: python starter.py   (it prints NOT OK until the change
is made)
"""
import math
import sys

DEPLOYMENTS = {
    "old": [310, 295, 330, 350, 300, 345, 320, 365, 305, 340, 325, 355, 315, 335, 360, 300, 345, 330, 370, 350],
    "new": [175, 190, 160, 1200, 185, 170, 200, 180, 165, 195, 1400, 175, 185, 160, 190, 170, 205, 180, 165, 190],
}


def percentile(latencies, p):
    """The nearest-rank percentile. Your change goes here: interpolate linearly
    between the two samples around the fractional position instead."""
    if len(latencies) == 0:
        raise ValueError("latencies must not be empty")
    if p <= 0 or p > 100:
        raise ValueError(f"percentile must be above 0 and at most 100, got {p}")
    ordered = sorted(latencies)                  # a new list, smallest first; the input is untouched
    rank = math.ceil(p * len(ordered) / 100)     # how many samples sit at or below the answer
    return ordered[rank - 1]                     # ranks count from 1, list indexes from 0


def summarize(latencies):
    """The mean and the three percentiles of one deployment, in a dictionary."""
    return {
        "mean": sum(latencies) / len(latencies),
        "p50": percentile(latencies, 50),
        "p95": percentile(latencies, 95),
        "p99": percentile(latencies, 99),
    }


if __name__ == "__main__":
    summaries = {}
    for name, latencies in DEPLOYMENTS.items():
        summaries[name] = summarize(latencies)
    old = summaries["old"]
    new = summaries["new"]
    if round(old["p95"], 2) != 365.25 or round(new["p95"], 2) != 1210.0 or round(new["p99"], 2) != 1362.0:
        print(f"NOT OK: expected old p95 365.25, new p95 1210.00, new p99 1362.00 by interpolation; got {old['p95']}, {new['p95']}, {new['p99']}")
        print("Make percentile interpolate linearly between the two nearest ranks.")
        sys.exit(1)
    print(f"{len(DEPLOYMENTS['old'])} samples per deployment, time to first token in ms, interpolated percentiles")
    print(f"{'deployment':<10}  {'mean':>7}  {'p50':>8}  {'p95':>8}  {'p99':>8}")
    for name in ["old", "new"]:
        summary = summaries[name]
        print(f"{name:<10}  {summary['mean']:>7.2f}  {summary['p50']:>8.2f}  {summary['p95']:>8.2f}  {summary['p99']:>8.2f}")

    print()
    for key in ["mean", "p50", "p95", "p99"]:
        change = new[key] - old[key]             # below zero means the new deployment is faster
        if change < 0:
            print(f"{key}: new is {-change:.2f} ms faster")
        else:
            print(f"{key}: new is {change:.2f} ms slower")

    try:
        percentile([], 50)
    except ValueError as error:
        print(f"\nrejected: {error}")
    try:
        percentile(DEPLOYMENTS["old"], 0)
    except ValueError as error:
        print(f"rejected: {error}")

    print("\nOK")
