"""Worked example: score short answers with exact match and token F1.

Orbit's question answering evaluation compared the model's answer with the
gold answer as strings. "The read scope." against "read scope" counted as
wrong, so the accuracy number punished punctuation and articles instead of
mistakes, and a mostly right answer earned nothing. This file scores answers
the way the SQuAD benchmark does: exact match after normalization, and token
F1 for partial credit.

Input: pairs of a predicted answer and a gold answer, inline below.
Output: per pair, exact match (0 or 1), the token overlap, precision, recall,
and F1, and the two means over all pairs. Run alone: python solution.py
"""
from collections import Counter

PAIRS = [
    {"id": "e1", "prediction": "The read scope.", "gold": "read scope"},
    {"id": "e2", "prediction": "rotate the key, then revoke the old one",
     "gold": "Create a replacement key, deploy it, then revoke the old one"},
    {"id": "e3", "prediction": "seven days", "gold": "7 days"},
    {"id": "e4", "prediction": "Billing, then Invoices", "gold": "billing then invoices"},
    {"id": "e5", "prediction": "no", "gold": "yes"},
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


def score_all(pairs):
    """One row per pair and the two means. A gold answer with no tokens is a data bug."""
    rows = []
    total_em = 0
    total_f1 = 0.0
    for pair in pairs:
        if not normalize(pair["gold"]):
            raise ValueError(f"pair '{pair['id']}' has an empty gold answer")
        em = exact_match(pair["prediction"], pair["gold"])
        overlap, precision, recall, f1 = token_f1(pair["prediction"], pair["gold"])
        rows.append((pair["id"], em, overlap, precision, recall, f1))
        total_em += em
        total_f1 += f1
    return rows, total_em / len(pairs), total_f1 / len(pairs)


if __name__ == "__main__":
    rows, mean_em, mean_f1 = score_all(PAIRS)
    print(f"{len(PAIRS)} answer pairs, scored after normalization")
    print(f"{'id':<3} {'EM':>3} {'overlap':>8} {'P':>6} {'R':>6} {'F1':>6}")
    for pair_id, em, overlap, precision, recall, f1 in rows:
        print(f"{pair_id:<3} {em:>3} {overlap:>8} {precision:>6.3f} {recall:>6.3f} {f1:>6.3f}")
    print(f"\nmean exact match {mean_em:.3f}, mean F1 {mean_f1:.3f}")

    try:
        score_all([{"id": "e6", "prediction": "yes", "gold": "..."}])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert mean_em == 0.4, "two of the five answers match exactly"
    assert round(rows[1][5], 3) == 0.667, "e2 earns partial credit"
    assert round(mean_f1, 3) == 0.633, "the mean F1 over these five pairs"
    print("\nOK")
