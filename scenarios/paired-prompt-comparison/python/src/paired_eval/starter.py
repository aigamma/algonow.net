"""Practice: change one behavior of the worked example.

The worked solution compares answers as exact strings, so prompt B's
"Outage " for ticket t5 (a capital letter and a trailing space) counts as
wrong, and t5 shows up as a regression. Make the comparison ignore case
and surrounding whitespace by completing normalize: it should return its
text with the surrounding whitespace removed and every letter in lower
case. compare already passes every label and answer through normalize,
so nothing else changes.

Hint: strings have methods for exactly this. text.strip() removes the
whitespace at both ends and text.lower() lowers the letters. Chain them.

Expected: prompt B right 7 of 9 (78%), the table becomes 4, 1, 3, 1, and
the only regression left is t3 outage. The file ends with OK.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys

IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"]
GOLD = ["billing", "access", "outage", "feature", "outage", "billing", "access", "feature", "outage"]
PROMPT_A = ["billing", "access", "outage", "billing", "outage", "access", "feature", "feature", "feature"]
PROMPT_B = ["billing", "access", "access", "feature", "Outage ", "billing", "access", "feature", "billing"]


def normalize(text):
    """Make two spellings of the same label compare equal. Your change goes here."""
    return text


def compare(ids, gold, a, b):
    """Pair the two prompts ticket by ticket. Count every combination of A right
    or wrong with B right or wrong, and name the tickets that moved."""
    outcomes = []
    for ticket, label, answer_a, answer_b in zip(ids, gold, a, b, strict=True):
        a_right = normalize(answer_a) == normalize(label)
        b_right = normalize(answer_b) == normalize(label)
        outcomes.append((ticket, label, a_right, b_right))

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
    if result["b_right"] != 7:
        print(f"NOT OK: expected prompt B right 7 of 9 after normalizing, got {result['b_right']} of 9")
        print("Complete normalize so that 'Outage ' and 'outage' compare equal.")
        sys.exit(1)
    counts = result["counts"]
    print(f"{result['n']} tickets, gold label against prompt A and prompt B")
    print(f"\nprompt A right: {result['a_right']} of {result['n']} ({percent(result['a_right'], result['n'])})")
    print(f"prompt B right: {result['b_right']} of {result['n']} ({percent(result['b_right'], result['n'])})")
    print(f"\n{'':<10}{'B right':>9}{'B wrong':>10}")
    print(f"{'A right':<10}{counts[(True, True)]:>9}{counts[(True, False)]:>10}")
    print(f"{'A wrong':<10}{counts[(False, True)]:>9}{counts[(False, False)]:>10}")
    print(f"\nregressions (A right, B wrong): {describe(result['regressions'])}")
    print(f"gains (A wrong, B right): {describe(result['gains'])}")
    if result["regressions"] != [("t3", "outage")]:
        print("\nNOT OK: the only regression left should be t3 outage")
        sys.exit(1)
    print("\nOK")
