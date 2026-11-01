"""Worked example: measure judge agreement beyond chance with Cohen's kappa.

Orbit replaced human review of assistant answers with a model judge that
grades each answer pass or fail. The report said the judge agrees with the
human reviewer on eighty percent of answers. But seven answers in ten pass
anyway, so two graders who pass most answers agree often by luck. This file
computes Cohen's kappa: how much the two graders agree beyond what chance
alone would produce.

Input: graded answers, each with the human's grade and the judge's grade.
Output: the pair counts, the totals per grader, the observed agreement, the
chance agreement, kappa, and the band it falls in. Run alone: python solution.py
"""

GRADES = [
    {"id": "a01", "human": "pass", "judge": "pass"},
    {"id": "a02", "human": "pass", "judge": "pass"},
    {"id": "a03", "human": "pass", "judge": "pass"},
    {"id": "a04", "human": "pass", "judge": "pass"},
    {"id": "a05", "human": "pass", "judge": "pass"},
    {"id": "a06", "human": "pass", "judge": "pass"},
    {"id": "a07", "human": "pass", "judge": "fail"},
    {"id": "a08", "human": "fail", "judge": "pass"},
    {"id": "a09", "human": "fail", "judge": "fail"},
    {"id": "a10", "human": "fail", "judge": "fail"},
]


def kappa(records):
    """Cohen's kappa for two graders over the same answers. Returns a dictionary
    with the pair counts, the totals per grader, the labels, the observed and
    chance agreement, and kappa."""
    if not records:
        raise ValueError("no graded answers")
    counts = {}                                   # (human grade, judge grade) -> how many answers
    labels = set()                                # every grade either grader used
    for record in records:
        for grader in ("human", "judge"):
            if not record[grader]:
                raise ValueError(f"{record['id']} has no {grader} grade")
        pair = (record["human"], record["judge"])
        counts[pair] = counts.get(pair, 0) + 1    # 0 the first time a pair is seen
        labels.add(record["human"])
        labels.add(record["judge"])
    labels = sorted(labels)
    human_totals = {}
    judge_totals = {}
    for (human, judge), count in counts.items():  # unpack the tuple key and its count
        human_totals[human] = human_totals.get(human, 0) + count
        judge_totals[judge] = judge_totals.get(judge, 0) + count
    n = len(records)
    agreed = 0
    for label in labels:
        agreed += counts.get((label, label), 0)   # the diagonal: both said this label
    observed = agreed / n
    chance = 0.0
    for label in labels:
        chance += (human_totals.get(label, 0) / n) * (judge_totals.get(label, 0) / n)
    if chance == 1.0:
        raise ValueError(f"every grade is {labels[0]}, so chance agreement is certain and kappa is undefined")
    return {
        "counts": counts, "human_totals": human_totals, "judge_totals": judge_totals, "labels": labels,
        "observed": observed, "chance": chance, "kappa": (observed - chance) / (1 - chance),
    }


def band(value):
    """The customary reading of a kappa value."""
    if value <= 0:
        return "no better than chance"
    elif value < 0.2:
        return "slight"
    elif value < 0.4:
        return "fair"
    elif value < 0.6:
        return "moderate"
    elif value < 0.8:
        return "substantial"
    else:
        return "almost perfect"


if __name__ == "__main__":
    result = kappa(GRADES)
    print(f"{len(GRADES)} answers graded by the human reviewer and the model judge")
    print(f"{'id':<4}  {'human':<5}  {'judge':<5}  agree")
    for record in GRADES:
        agree = "yes" if record["human"] == record["judge"] else "no"
        print(f"{record['id']:<4}  {record['human']:<5}  {record['judge']:<5}  {agree}")

    parts = []
    for pair in sorted(result["counts"]):
        parts.append(f"{pair[0]}/{pair[1]} {result['counts'][pair]}")
    print(f"\npair counts (human/judge): {'  '.join(parts)}")
    totals = []
    for label in result["labels"]:
        totals.append(f"{label} {result['human_totals'][label]}/{result['judge_totals'][label]}")
    print(f"totals (human/judge): {'  '.join(totals)}")
    agreed = round(result["observed"] * len(GRADES))
    print(f"observed agreement  {result['observed']:.2f}  ({agreed} of {len(GRADES)} agree)")
    terms = []
    for label in result["labels"]:
        terms.append(f"{label} {result['human_totals'][label] / len(GRADES):.2f} x {result['judge_totals'][label] / len(GRADES):.2f}")
    print(f"chance agreement    {result['chance']:.2f}  ({' + '.join(terms)})")
    print(f"Cohen's kappa       {result['kappa']:.2f}  {band(result['kappa'])}")

    always_pass = []
    for record in GRADES:
        always_pass.append({"id": record["id"], "human": record["human"], "judge": "pass"})
    lazy = kappa(always_pass)
    print(f"\na judge that passes everything: agreement {lazy['observed']:.2f}, kappa {lazy['kappa']:.2f}, {band(lazy['kappa'])}")

    for bad in ([{"id": "a03", "human": "pass", "judge": ""}],
                [{"id": "a01", "human": "pass", "judge": "pass"}, {"id": "a02", "human": "pass", "judge": "pass"}]):
        try:
            kappa(bad)
        except ValueError as error:
            print(f"rejected: {error}")

    assert result["counts"] == {("pass", "pass"): 6, ("pass", "fail"): 1, ("fail", "pass"): 1, ("fail", "fail"): 2}
    assert abs(result["observed"] - 0.80) < 1e-9 and abs(result["chance"] - 0.58) < 1e-9
    assert round(result["kappa"], 4) == 0.5238, "eighty percent agreement is kappa zero point five two"
    assert abs(lazy["kappa"]) < 1e-9, "passing everything earns no credit beyond chance"
    print("\nOK")
