"""Answer to the practice variation: the grades pass through the COLLAPSE
mapping before the kappa is computed, in new records that leave the input
unchanged. Everything outside the marked region is the practice starter,
unchanged. Run alone: python practice_answer.py
"""
import sys

GRADES = [
    {"id": "b01", "human": "pass", "judge": "pass"},
    {"id": "b02", "human": "pass", "judge": "pass"},
    {"id": "b03", "human": "pass", "judge": "pass"},
    {"id": "b04", "human": "pass", "judge": "pass"},
    {"id": "b05", "human": "pass", "judge": "pass"},
    {"id": "b06", "human": "pass", "judge": "partial"},
    {"id": "b07", "human": "partial", "judge": "pass"},
    {"id": "b08", "human": "partial", "judge": "fail"},
    {"id": "b09", "human": "partial", "judge": "partial"},
    {"id": "b10", "human": "fail", "judge": "fail"},
    {"id": "b11", "human": "fail", "judge": "fail"},
    {"id": "b12", "human": "fail", "judge": "pass"},
]
COLLAPSE = {"partial": "fail"}      # a grade on the left is read as the grade on the right


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


# --- answer begins ---
def collapse(records, mapping):
    """Return new records with every grade replaced by its mapping, when it has
    one. The input records are left exactly as they were."""
    collapsed = []
    for record in records:
        collapsed.append({
            "id": record["id"],
            "human": mapping.get(record["human"], record["human"]),   # the mapped grade, or the grade itself
            "judge": mapping.get(record["judge"], record["judge"]),
        })
    return collapsed
# --- answer ends ---


if __name__ == "__main__":
    before = kappa(GRADES)
    after = kappa(collapse(GRADES, COLLAPSE))
    if after["labels"] != ["fail", "pass"] or round(after["kappa"], 2) != 0.50:
        print(f"NOT OK: expected two labels and kappa 0.50 once partial counts as fail, got labels {after['labels']} and kappa {after['kappa']:.2f}")
        print("Make collapse return new records whose grades have been passed through the mapping.")
        sys.exit(1)
    print(f"{len(GRADES)} answers graded with three labels, then with partial counted as fail")
    print(f"{'id':<4}  {'human':<7}  {'judge':<7}  agree")
    for record in GRADES:
        agree = "yes" if record["human"] == record["judge"] else "no"
        print(f"{record['id']:<4}  {record['human']:<7}  {record['judge']:<7}  {agree}")
    print()
    for name, result in (("three labels:           ", before), ("partial counted as fail:", after)):
        print(f"{name}  observed {result['observed']:.2f}  chance {result['chance']:.2f}  kappa {result['kappa']:.2f}  {band(result['kappa'])}")

    if GRADES[5]["judge"] != "partial":
        print("\nNOT OK: collapse must build new records and leave the input unchanged")
        sys.exit(1)
    print("\nOK")
