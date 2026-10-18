"""Worked example: decide whether a benchmark gain is real with a bootstrap interval.

Orbit's new assistant model scored 18 of 25 on the internal support benchmark
and the old one scored 17 of 25. Four points looked like progress, and the
team wanted to ship on it. Twenty-five items cannot settle a four-point
difference by themselves. This file resamples the items with replacement,
many times, scores both models on the same resampled items, and reports the
range that the middle 95 percent of those differences fall in. If the range
includes zero, the gain is not established.

Input: two lists with one entry per item, 1 for right and 0 for wrong, in
the same item order, so the results are paired. Output: the observed
difference and a 95 percent bootstrap interval for it.
Run alone: python solution.py
"""
import random

OLD = [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0]   # 17 right
NEW = [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0]   # 18 right
RESAMPLES = 200
SEED = 5


def accuracy(results):
    """The share of items answered right: a count of 1s over the length."""
    return sum(results) / len(results)


def percentile(values, share):
    """The value sitting at the given share of the sorted list (nearest rank,
    one of several conventions): 2.5 means the 2.5th percentile."""
    ordered = sorted(values)
    position = round(share / 100 * (len(ordered) - 1))
    return ordered[position]


def bootstrap_differences(old, new, resamples, seed):
    """Resample the items with replacement, score both models on the same
    resample, and collect new accuracy minus old accuracy for every resample."""
    pairs = list(zip(old, new, strict=True))
    if resamples < 1:
        raise ValueError("at least one resample is needed")
    generator = random.Random(seed)
    count = len(pairs)
    differences = []
    for _ in range(resamples):
        old_right = 0
        new_right = 0
        for _ in range(count):
            old_item, new_item = pairs[generator.randrange(count)]
            old_right += old_item
            new_right += new_item
        differences.append((new_right - old_right) / count)
    return differences


if __name__ == "__main__":
    observed = accuracy(NEW) - accuracy(OLD)
    print(f"{len(OLD)} items, paired: old model right {sum(OLD)} ({accuracy(OLD):.1%}), new model right {sum(NEW)} ({accuracy(NEW):.1%})")
    print(f"observed difference: {observed * 100:+.1f} points")

    differences = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
    low = percentile(differences, 2.5)
    high = percentile(differences, 97.5)
    includes_zero = low <= 0 <= high
    verdict = "not established" if includes_zero else "established"
    print(f"bootstrap: {RESAMPLES} resamples of the {len(OLD)} items, seed {SEED}")
    print(f"95% interval for the difference: {low * 100:+.1f} to {high * 100:+.1f} points")
    print(f"the interval {'includes' if includes_zero else 'excludes'} zero: the {observed * 100:.0f}-point gain is {verdict}")

    try:
        bootstrap_differences(OLD, NEW[:24], RESAMPLES, SEED)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert low < high, "a real interval"
    assert low <= observed <= high, "the interval brackets the observed difference"
    assert includes_zero, "on this benchmark the gain is not established"
    print("\nOK")
