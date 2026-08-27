# Puzzle 59: Boyer-Moore majority vote x pairwise cancellation
# Find the majority element of a stream (the value holding MORE than
# half the positions) in one pass and two words of memory: a candidate
# and a counter.
#
# The pairing is the point. The algorithm is the one-candidate counter
# scan: adopt when the counter is zero, increment on a match, decrement
# on a mismatch. The heuristic is pairwise cancellation: every decrement
# pairs one occurrence of the candidate with one non-candidate element
# and throws BOTH away. Deleting two DIFFERENT values can never change
# who holds a majority, and a value with more than half the positions
# cannot be exhausted by pairing: at most n-m pairs can each destroy
# one copy, leaving a surplus of at least 2m-n. The referee is theory
# made checkable: that surplus bound is asserted on every trial, exact
# equality on the adversarial alternating gadget. And the contract is
# broken on purpose: with NO majority present the surviving candidate
# is garbage: the deterministic gadget crowns the RAREST element: so
# the cheap second verify pass is part of the method, not an option.
import random
from collections import Counter


def majority_vote(stream):
    """One pass, two words: the unverified candidate."""
    candidate = None
    count = 0
    for x in stream:
        if count == 0:
            candidate = x
            count = 1
        elif x == candidate:
            count += 1
        else:
            count -= 1
    return candidate, count


def verify(stream, candidate):
    """The second pass that turns a guess into an answer."""
    return sum(1 for x in stream if x == candidate) * 2 > len(stream)


def majority(stream):
    """The honest method: vote, then verify. None when no majority."""
    candidate, _ = majority_vote(stream)
    return candidate if verify(stream, candidate) else None


def misra_gries(stream, k, high_water=None):
    """The k-counter generalization: candidates for every value with
    multiplicity > n/(k+1). Same cancellation idea: when the summary
    overflows, decrement ALL counters (a (k+1)-wise cancellation)."""
    counters = {}
    for x in stream:
        if x in counters:
            counters[x] += 1
        elif len(counters) < k:
            counters[x] = 1
        else:
            for key in list(counters):
                counters[key] -= 1
                if counters[key] == 0:
                    del counters[key]
        if high_water is not None:
            high_water["max"] = max(high_water.get("max", 0), len(counters))
    return counters


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: planted majorities under adversarial arrangements.
    # m > n/2 copies of x among fillers: front-loaded, back-loaded,
    # alternating, shuffled: the candidate is x every time, and the
    # final counter respects the pairing theory: count >= 2m - n.
    for trial in range(300):
        n = rng.randrange(3, 400)
        m = n // 2 + 1 + rng.randrange((n + 1) // 2)
        m = min(m, n)
        x = "MAJ"
        fillers = [f"z{i}" for i in range(n - m)]
        layout = trial % 4
        if layout == 0:
            stream = [x] * m + fillers
        elif layout == 1:
            stream = fillers + [x] * m
        elif layout == 2:  # alternate as long as fillers last
            stream = []
            xs, fs = m, list(fillers)
            while xs or fs:
                if xs:
                    stream.append(x)
                    xs -= 1
                if fs:
                    stream.append(fs.pop())
        else:
            stream = [x] * m + fillers
            rng.shuffle(stream)
        candidate, count = majority_vote(stream)
        assert candidate == x, (trial, layout)
        assert count >= 2 * m - n, (trial, layout, count, 2 * m - n)
        assert verify(stream, candidate)

    # The alternating gadget with distinct fillers achieves the bound
    # EXACTLY: every decrement destroys one majority copy.
    n, m = 200, 101
    stream = []
    xs, fs = m, [f"z{i}" for i in range(n - m)]
    while fs:
        stream.append("MAJ")
        xs -= 1
        stream.append(fs.pop())
    stream += ["MAJ"] * xs
    _, count = majority_vote(stream)
    assert count == 2 * m - n, count  # surplus exactly 2, nothing wasted

    # Oracle 2: full agreement with the dictionary truth on 500 mixed
    # random streams (some hold a majority, some do not).
    with_majority = 0
    for _ in range(500):
        n = rng.randrange(1, 120)
        alphabet = rng.randrange(1, 8)
        stream = [rng.randrange(alphabet) for _ in range(n)]
        if rng.random() < 0.5:  # sometimes force a majority in
            v = rng.randrange(alphabet)
            stream += [v] * n
            n = len(stream)
        truth_counts = Counter(stream)
        top, top_count = truth_counts.most_common(1)[0]
        truth = top if top_count * 2 > n else None
        got = majority(stream)
        assert got == truth, (stream, got, truth)
        with_majority += truth is not None

    # Oracle 3: the broken contract. Deterministic gadget first:
    # a b a b c: the pairs annihilate a against b twice, and the
    # RAREST element walks away with the vote.
    gadget = ["a", "b", "a", "b", "c"]
    candidate, _ = majority_vote(gadget)
    tally = Counter(gadget)
    assert candidate == "c"
    assert tally["c"] == min(tally.values())  # the strict minority
    assert not verify(gadget, candidate)      # the second pass catches it

    # And measured at scale: on no-majority streams, how often is the
    # unverified candidate not even the most frequent element?
    trials, not_mode = 0, 0
    while trials < 1000:
        stream = [rng.randrange(6) for _ in range(60)]
        counts = Counter(stream)
        top, top_count = counts.most_common(1)[0]
        if top_count * 2 > len(stream):
            continue  # only the no-majority world here
        trials += 1
        candidate, _ = majority_vote(stream)
        if counts[candidate] < top_count:
            not_mode += 1
    misled = not_mode / trials
    assert misled > 0.25, misled  # routinely not even the mode

    # Oracle 4: the memory contest at n = 1,000,000. One value planted
    # 500,001 times; the other 499,999 elements all distinct.
    n = 1_000_000
    m = n // 2 + 1
    big = ["MAJ"] * m + [f"u{i}" for i in range(n - m)]
    rng.shuffle(big)

    tally = Counter(big)  # the dictionary: exact, and half a million keys wide
    assert len(tally) == (n - m) + 1 == 500_000
    assert tally.most_common(1)[0][0] == "MAJ"

    mid = sorted(big)[n // 2]  # sort-and-middle: a majority must own the middle
    assert mid == "MAJ"

    hw = {}
    mg = misra_gries(big, 8, high_water=hw)
    assert hw["max"] <= 8            # the summary never grew past its budget
    assert "MAJ" in mg               # anything > n/9 must survive: the majority did

    candidate, _ = majority_vote(big)
    assert candidate == "MAJ" and verify(big, candidate)

    # Oracle 5: the client. Seven-way modular redundancy: 7 replicas
    # compute a reading, up to 3 fail ADVERSARIALLY (they collude on
    # the same wrong value: the worst case). 4 of 7 is a majority, so
    # the vote recovers the true reading on every one of 200 trials.
    for _ in range(200):
        truth = rng.randrange(1000)
        wrong = (truth + 1 + rng.randrange(998)) % 1000
        faults = rng.randrange(4)  # 0..3 colluding failures
        readings = [truth] * (7 - faults) + [wrong] * faults
        rng.shuffle(readings)
        assert majority(readings) == truth

    print("contest: majority element of a 1,000,000-item stream (500,001 copies planted among 499,999 distinct fillers); referee: the pairing theory's surplus bound asserted on every trial")
    print(f"  {'method':<24} {'memory held':>14}   guarantees")
    print(f"  {'Dictionary tally':<24} {len(tally):>14,}   exact counts for everything: one key per distinct value")
    print(f"  {'Sort and take middle':<24} {'1,000,000':>14}   a full mutable copy: the majority must own the middle seat")
    print(f"  {'Misra-Gries (k = 8)':<24} {hw['max']:>14}   every value over n/9 survives; counts approximate")
    print(f"  {'BM vote + verify':<24} {'2':>14}   the majority, or None: two words and two passes")
    print(f"the pairing theory, measured: alternating gadget's final counter exactly 2m - n = {2 * 101 - 200}; bound count >= 2m - n held on all 300 adversarial layouts")
    print(f"the broken contract, measured: on a b a b c the unverified vote crowns 'c', the RAREST element; on 1,000 no-majority streams the candidate was not even the mode {misled:.0%} of the time: the verify pass is the method")
    print(f"the client: 7-way redundancy with up to 3 colluding faults recovered the true reading in 200/200 trials ({with_majority} of oracle 2's 500 mixed streams held a true majority)")
    print("OK: 300 adversarial planted-majority layouts with the surplus bound, dictionary agreement on 500 mixed streams, the rarest-element gadget and its 1,000-stream generalization, the four-method memory contest at one million, and the redundancy client")
