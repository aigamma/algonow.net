"""Worked example: report p50, p95, and p99 latency with the nearest-rank method.

Orbit's gateway team shipped a new deployment and reported that the mean time
to first token had dropped. The on-call kept receiving complaints about slow
answers: the mean hid a longer tail. This file computes the median, the 95th
percentile, and the 99th percentile of two deployments' latency samples with
the nearest-rank method and compares the deployments on all four numbers.

Input: twenty latency samples per deployment, in milliseconds, in the order
they were logged. Output: one row per deployment with the mean, p50, p95, and
p99, then the four differences. Run alone: python solution.py
"""
import math

DEPLOYMENTS = {
    "old": [310, 295, 330, 350, 300, 345, 320, 365, 305, 340, 325, 355, 315, 335, 360, 300, 345, 330, 370, 350],
    "new": [175, 190, 160, 1200, 185, 170, 200, 180, 165, 195, 1400, 175, 185, 160, 190, 170, 205, 180, 165, 190],
}


def percentile(latencies, p):
    """The nearest-rank percentile: the smallest sample that at least p percent
    of the samples are at or below."""
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
    print(f"{len(DEPLOYMENTS['old'])} samples per deployment, time to first token in ms")
    print(f"{'deployment':<10}  {'mean':>7}  {'p50':>5}  {'p95':>5}  {'p99':>5}")
    summaries = {}
    for name, latencies in DEPLOYMENTS.items():
        summary = summarize(latencies)
        summaries[name] = summary
        print(f"{name:<10}  {summary['mean']:>7.2f}  {summary['p50']:>5}  {summary['p95']:>5}  {summary['p99']:>5}")

    old = summaries["old"]
    new = summaries["new"]
    print()
    for key in ["mean", "p50", "p95", "p99"]:
        change = new[key] - old[key]             # below zero means the new deployment is faster
        if change < 0:
            print(f"{key}: new is {-change} ms faster")
        else:
            print(f"{key}: new is {change} ms slower")

    try:
        percentile([], 50)
    except ValueError as error:
        print(f"\nrejected: {error}")
    try:
        percentile(DEPLOYMENTS["old"], 0)
    except ValueError as error:
        print(f"rejected: {error}")

    assert new["p95"] == 1200 and new["p99"] == 1400, "two of the twenty new samples are above a second"
    assert old["p50"] == 330, "the tenth smallest of the old samples"
    assert new["mean"] < old["mean"], "the mean alone calls the new deployment faster"
    print("\nOK")
