"""Practice: change one behavior of the worked example.

The worked solution reports an interval. Add one more number: the probability
that the new model is better, estimated as the share of resamples whose
difference is above zero. A difference of exactly zero does not count as
better.

Hint: one short function. Count the differences greater than zero with a
loop, then divide the count by how many differences there are, and return
that share as a float between 0 and 1.

Expected: 119 of the 200 resamples favor the new model, a share of 59.5%,
printed as "probability the new model is better: 59.5% of resamples".
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import random
import sys

OLD = [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0]   # 17 right
NEW = [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0]   # 18 right
RESAMPLES = 200
SEED = 5
EXPECTED_BETTER = 0.595   # 119 of the 200 resamples


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


def better_fraction(differences):
    """The share of resamples where the new model scored higher.
    Not written yet: your change goes here."""
    return None


if __name__ == "__main__":
    differences = bootstrap_differences(OLD, NEW, RESAMPLES, SEED)
    fraction = better_fraction(differences)
    if fraction != EXPECTED_BETTER:
        print(f"NOT OK: expected a better share of {EXPECTED_BETTER:.1%}, got {fraction}")
        print("Make better_fraction count the differences above zero and divide by the number of differences.")
        sys.exit(1)

    observed = accuracy(NEW) - accuracy(OLD)
    print(f"{len(OLD)} items, paired: old model right {sum(OLD)} ({accuracy(OLD):.1%}), new model right {sum(NEW)} ({accuracy(NEW):.1%})")
    print(f"observed difference: {observed * 100:+.1f} points")

    low = percentile(differences, 2.5)
    high = percentile(differences, 97.5)
    includes_zero = low <= 0 <= high
    verdict = "not established" if includes_zero else "established"
    print(f"bootstrap: {RESAMPLES} resamples of the {len(OLD)} items, seed {SEED}")
    print(f"95% interval for the difference: {low * 100:+.1f} to {high * 100:+.1f} points")
    print(f"the interval {'includes' if includes_zero else 'excludes'} zero: the {observed * 100:.0f}-point gain is {verdict}")
    print(f"probability the new model is better: {fraction:.1%} of resamples")

    try:
        bootstrap_differences(OLD, NEW[:24], RESAMPLES, SEED)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert low < high, "a real interval"
    assert low <= observed <= high, "the interval brackets the observed difference"
    assert includes_zero, "on this benchmark the gain is not established"
    print("\nOK")
