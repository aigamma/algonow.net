"""Worked example: compare two prompt versions ticket by ticket.

Orbit's assistant routes support tickets into one of four categories:
billing, access, outage, or feature. Prompt B rewrote the instructions and
scored higher than prompt A on the evaluation set, so it shipped. Then two
outage tickets that prompt A had routed correctly came back misrouted.
Aggregate accuracy hid a regression on the most urgent category. This file
pairs the two prompts ticket by ticket instead: for every ticket it decides
whether A is right and whether B is right, counts the four combinations,
and lists the regressions and the gains by ticket id.

Input: four parallel lists with one entry per ticket: the ids, the gold
labels, prompt A's answers, prompt B's answers. Output: a dictionary with
the two-by-two counts, the regressions (A right, B wrong), and the gains
(A wrong, B right). Run alone: python solution.py
"""

IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"]
GOLD = ["billing", "access", "outage", "feature", "outage", "billing", "access", "feature", "outage"]
PROMPT_A = ["billing", "access", "outage", "billing", "outage", "access", "feature", "feature", "feature"]
PROMPT_B = ["billing", "access", "access", "feature", "Outage ", "billing", "access", "feature", "billing"]


def compare(ids, gold, a, b):
    """Pair the two prompts ticket by ticket. Count every combination of A right
    or wrong with B right or wrong, and name the tickets that moved."""
    outcomes = []
    for ticket, label, answer_a, answer_b in zip(ids, gold, a, b, strict=True):
        outcomes.append((ticket, label, answer_a == label, answer_b == label))

    counts = {(True, True): 0, (True, False): 0, (False, True): 0, (False, False): 0}
    for ticket, label, a_right, b_right in outcomes:
        counts[(a_right, b_right)] += 1

    regressions = [(ticket, label) for ticket, label, a_right, b_right in outcomes if a_right and not b_right]
    gains = [(ticket, label) for ticket, label, a_right, b_right in outcomes if b_right and not a_right]
    return {
        "n": len(outcomes),
        "a_right": counts[(True, True)] + counts[(True, False)],
        "b_right": counts[(True, True)] + counts[(False, True)],
        "counts": counts,
        "regressions": regressions,
        "gains": gains,
    }


def percent(part, whole):
    """A share as a whole-number percentage; an empty set is 0%."""
    if whole == 0:
        return "0%"
    return f"{part / whole:.0%}"


def describe(pairs):
    """Join (ticket, label) pairs into one line, such as 't3 outage, t5 outage'."""
    return ", ".join([f"{ticket} {label}" for ticket, label in pairs])


if __name__ == "__main__":
    result = compare(IDS, GOLD, PROMPT_A, PROMPT_B)
    counts = result["counts"]
    print(f"{result['n']} tickets, gold label against prompt A and prompt B")
    print(f"\nprompt A right: {result['a_right']} of {result['n']} ({percent(result['a_right'], result['n'])})")
    print(f"prompt B right: {result['b_right']} of {result['n']} ({percent(result['b_right'], result['n'])})")
    print(f"\n{'':<10}{'B right':>9}{'B wrong':>10}")
    print(f"{'A right':<10}{counts[(True, True)]:>9}{counts[(True, False)]:>10}")
    print(f"{'A wrong':<10}{counts[(False, True)]:>9}{counts[(False, False)]:>10}")
    print(f"\nregressions (A right, B wrong): {describe(result['regressions'])}")
    print(f"gains (A wrong, B right): {describe(result['gains'])}")

    try:
        compare(IDS, GOLD[:8], PROMPT_A, PROMPT_B)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert counts == {(True, True): 3, (True, False): 2, (False, True): 3, (False, False): 1}, "the two-by-two counts"
    assert result["a_right"] == sum(answer == label for answer, label in zip(PROMPT_A, GOLD)), "True counts as 1"
    assert result["regressions"] == [("t3", "outage"), ("t5", "outage")], "both regressions are outage tickets"
    print("\nOK")
