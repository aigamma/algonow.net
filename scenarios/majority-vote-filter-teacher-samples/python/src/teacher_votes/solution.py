"""Worked example: keep a teacher label only when the teacher's samples agree.

Orbit builds the distillation set for its small router by sampling the large
assistant, the teacher, five times per prompt at a temperature above zero.
The script that shipped took the first sample as the label. Some prompts got
five different answers, and contradictory labels went into the training set.
This file counts the normalized answers per prompt, takes the most common,
and keeps the prompt with that label only when enough of the samples agree.

Input: prompts, each with the teacher's sampled route labels. Output: one
decision per prompt, kept with a label and an agreement, or dropped with a
reason. Run alone: python solution.py
"""
from collections import Counter

SAMPLES = [
    {"id": "p1", "votes": ["billing", "billing", "billing", "billing", "billing"]},
    {"id": "p2", "votes": ["access", "outage", "access", "access", "outage"]},
    {"id": "p3", "votes": ["access", "billing", "outage", "billing", "access"]},
    {"id": "p4", "votes": ["outage", "outage", "billing", "outage", "outage"]},
    {"id": "p5", "votes": ["outage", "billing", "Billing", "access", "billing "]},
]
THRESHOLD = 0.6     # the share of samples that must agree: three of five


def normalize(answer):
    """One spelling per answer: surrounding space removed, lowercase."""
    return answer.strip().lower()


def decide(prompt, threshold):
    """Count the normalized votes and decide. Returns a dictionary with the
    id, the counts, the action, and either the label and agreement or the reason."""
    if not prompt["votes"]:
        raise ValueError(f"{prompt['id']} has no samples")
    counts = Counter()
    for vote in prompt["votes"]:
        counts[normalize(vote)] += 1           # a missing key counts as 0, so += 1 just works
    ranked = counts.most_common()              # (answer, count) pairs, largest count first
    top, top_count = ranked[0]
    agreement = top_count / len(prompt["votes"])
    if len(ranked) > 1 and ranked[1][1] == top_count:
        return {"id": prompt["id"], "counts": dict(ranked), "action": "dropped", "reason": f"tie at {top_count}"}
    if agreement < threshold:
        return {"id": prompt["id"], "counts": dict(ranked), "action": "dropped", "reason": f"agreement {agreement:.2f} below {threshold:.2f}"}
    return {"id": prompt["id"], "counts": dict(ranked), "action": "kept", "label": top, "agreement": agreement}


def filter_samples(samples, threshold):
    """One decision per prompt, in order."""
    if threshold <= 0.5 or threshold > 1.0:
        raise ValueError(f"threshold must be above 0.5 (a majority) and at most 1.0, got {threshold}")
    decisions = []
    for prompt in samples:
        decisions.append(decide(prompt, threshold))
    return decisions


if __name__ == "__main__":
    decisions = filter_samples(SAMPLES, THRESHOLD)
    print(f"{len(SAMPLES)} prompts, {len(SAMPLES[0]['votes'])} teacher samples each, agreement threshold {THRESHOLD:.2f}")
    kept = 0
    for decision in decisions:
        parts = []
        for answer, count in decision["counts"].items():
            parts.append(f"{answer} {count}")
        if decision["action"] == "kept":
            kept += 1
            verdict = f"kept as {decision['label']} ({decision['agreement']:.2f})"
        else:
            verdict = f"dropped: {decision['reason']}"
        print(f"{decision['id']}  {', '.join(parts):<34} {verdict}")
    print(f"kept {kept} of {len(SAMPLES)}")

    print("\nwhat shipped, the first sample as the label:")
    disagreements = 0
    for prompt, decision in zip(SAMPLES, decisions):
        first = normalize(prompt["votes"][0])
        if decision["action"] == "kept" and first == decision["label"]:
            note = "same label"
        elif decision["action"] == "kept":
            note = f"minority answer; the majority said {decision['label']}"
            disagreements += 1
        else:
            note = "a label for a prompt the teacher could not settle"
            disagreements += 1
        print(f"  {prompt['id']}  {first:<8} {note}")
    print(f"{disagreements} of {len(SAMPLES)} shipped labels were wrong or unsettled")

    for bad_threshold in (0.5, 1.5):
        try:
            filter_samples(SAMPLES, bad_threshold)
        except ValueError as error:
            print(f"rejected: {error}")

    assert [d["action"] for d in decisions] == ["kept", "kept", "dropped", "kept", "kept"]
    assert decisions[4]["label"] == "billing" and decisions[4]["counts"]["billing"] == 3, "the spellings of billing count together"
    assert decisions[2]["reason"] == "tie at 2"
    print("\nOK")
