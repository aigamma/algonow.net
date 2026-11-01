"""Answer to the practice variation: a kept prompt is graded gold when the
teacher's samples were unanimous and silver when a majority agreed, so the
training loop can weight the two tiers differently. Everything outside the
marked region is the practice starter, unchanged. Run alone: python practice_answer.py
"""
import sys
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


# --- answer begins ---
def tier_of(agreement, threshold):
    """gold for a unanimous teacher, silver for a majority at or above the
    threshold, and dropped below it."""
    if agreement == 1.0:
        return "gold"
    elif agreement >= threshold:
        return "silver"
    else:
        return "dropped"
# --- answer ends ---


def decide(prompt, threshold):
    """Count the normalized votes and decide. Returns a dictionary with the
    id, the counts, the action, and either the label, agreement, and tier or the reason."""
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
    tier = tier_of(agreement, threshold)
    if tier == "dropped":
        return {"id": prompt["id"], "counts": dict(ranked), "action": "dropped", "reason": f"agreement {agreement:.2f} below {threshold:.2f}"}
    return {"id": prompt["id"], "counts": dict(ranked), "action": "kept", "label": top, "agreement": agreement, "tier": tier}


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
    tiers = {"gold": 0, "silver": 0, "dropped": 0}
    for decision in decisions:
        if decision["action"] == "kept":
            tiers[decision["tier"]] += 1
        else:
            tiers["dropped"] += 1
    if tiers != {"gold": 1, "silver": 3, "dropped": 1}:
        print(f"NOT OK: expected 1 gold, 3 silver, and 1 dropped, got {tiers}")
        print("Make tier_of return gold for a unanimous teacher and silver for a majority at or above the threshold.")
        sys.exit(1)
    print(f"{len(SAMPLES)} prompts, {len(SAMPLES[0]['votes'])} teacher samples each, agreement threshold {THRESHOLD:.2f}, graded in tiers")
    for decision in decisions:
        parts = []
        for answer, count in decision["counts"].items():
            parts.append(f"{answer} {count}")
        if decision["action"] == "kept":
            verdict = f"{decision['tier']}: {decision['label']} ({decision['agreement']:.2f})"
        else:
            verdict = f"dropped: {decision['reason']}"
        print(f"{decision['id']}  {', '.join(parts):<34} {verdict}")
    print(f"gold {tiers['gold']}, silver {tiers['silver']}, dropped {tiers['dropped']}")

    try:
        filter_samples([{"id": "p9", "votes": []}], THRESHOLD)
    except ValueError as error:
        print(f"\nrejected: {error}")

    print("\nOK")
