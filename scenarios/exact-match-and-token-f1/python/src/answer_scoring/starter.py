"""Practice: change one behavior of the worked example.

Each pair now carries a LIST of acceptable gold answers instead of one. Make
score_pair score the prediction against every gold answer and keep the best
exact match and the best F1 for that pair. As shipped it scores only the
first gold answer, so e3 ("seven days" against "7 days") still earns half
credit although "seven days" is on its list.

Hint: loop over the gold answers, keep a best exact match and a best F1 that
start at zero, and raise them with max as better scores appear; report the
overlap, precision, and recall of the gold answer that produced the best F1.

Expected: e3 becomes an exact match with F1 1.000, e2 keeps its 0.667 because
its second gold answer scores lower, mean exact match 0.600, mean F1 0.733.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import sys
from collections import Counter

PAIRS = [
    {"id": "e1", "prediction": "The read scope.", "gold": ["read scope"]},
    {"id": "e2", "prediction": "rotate the key, then revoke the old one",
     "gold": ["Create a replacement key, deploy it, then revoke the old one",
              "revoke the old key after deploying a replacement"]},
    {"id": "e3", "prediction": "seven days", "gold": ["7 days", "seven days"]},
    {"id": "e4", "prediction": "Billing, then Invoices", "gold": ["billing then invoices"]},
    {"id": "e5", "prediction": "no", "gold": ["yes"]},
]
ARTICLES = ("a", "an", "the")   # dropped before comparing, as the SQuAD scorer does


def normalize(text):
    """The tokens of an answer: lowercase, letters and digits only, no articles."""
    lowered = text.lower()
    kept_chars = ""
    for char in lowered:
        if char.isalnum() or char.isspace():
            kept_chars = kept_chars + char
    tokens = []
    for word in kept_chars.split():
        if word not in ARTICLES:
            tokens.append(word)
    return tokens


def exact_match(prediction, gold):
    """1 when the two answers have the same tokens in the same order, else 0."""
    if normalize(prediction) == normalize(gold):
        return 1
    return 0


def token_f1(prediction, gold):
    """Partial credit: the tokens the answers share, balanced both ways.
    Returns the overlap count, precision, recall, and F1."""
    predicted = normalize(prediction)
    expected = normalize(gold)
    if not predicted and not expected:
        return 0, 1.0, 1.0, 1.0           # two empty answers agree
    if not predicted or not expected:
        return 0, 0.0, 0.0, 0.0           # one empty answer cannot match
    overlap = sum((Counter(predicted) & Counter(expected)).values())
    if overlap == 0:
        return 0, 0.0, 0.0, 0.0           # nothing shared: avoid dividing by zero
    precision = overlap / len(predicted)
    recall = overlap / len(expected)
    f1 = 2 * precision * recall / (precision + recall)
    return overlap, precision, recall, f1


def score_pair(prediction, golds):
    """Score one prediction against its acceptable gold answers.
    Scores only the first one for now: your change goes here."""
    gold = golds[0]
    em = exact_match(prediction, gold)
    overlap, precision, recall, f1 = token_f1(prediction, gold)
    return em, overlap, precision, recall, f1


def score_all(pairs):
    """One row per pair and the two means. A gold answer with no tokens is a data bug."""
    rows = []
    total_em = 0
    total_f1 = 0.0
    for pair in pairs:
        for gold in pair["gold"]:
            if not normalize(gold):
                raise ValueError(f"pair '{pair['id']}' has an empty gold answer")
        em, overlap, precision, recall, f1 = score_pair(pair["prediction"], pair["gold"])
        rows.append((pair["id"], em, overlap, precision, recall, f1))
        total_em += em
        total_f1 += f1
    return rows, total_em / len(pairs), total_f1 / len(pairs)


if __name__ == "__main__":
    rows, mean_em, mean_f1 = score_all(PAIRS)
    if rows[2][1] == 0:
        print(f"NOT OK: expected e3 to match one of its {len(PAIRS[2]['gold'])} acceptable answers exactly, got exact match {rows[2][1]} and F1 {rows[2][5]:.3f}")
        print("Make score_pair try every gold answer and keep the best exact match and the best F1.")
        sys.exit(1)
    print(f"{len(PAIRS)} answer pairs, scored against every acceptable gold answer")
    print(f"{'id':<3} {'EM':>3} {'overlap':>8} {'P':>6} {'R':>6} {'F1':>6}")
    for pair_id, em, overlap, precision, recall, f1 in rows:
        print(f"{pair_id:<3} {em:>3} {overlap:>8} {precision:>6.3f} {recall:>6.3f} {f1:>6.3f}")
    print(f"\nmean exact match {mean_em:.3f}, mean F1 {mean_f1:.3f}")

    try:
        score_all([{"id": "e6", "prediction": "yes", "gold": ["yes", "..."]}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    if round(mean_em, 3) != 0.6 or round(mean_f1, 3) != 0.733:
        print(f"\nNOT OK: expected mean exact match 0.600 and mean F1 0.733, got {mean_em:.3f} and {mean_f1:.3f}")
        sys.exit(1)
    print("\nOK")
