"""Answer to the practice variation: closing the breaker takes RECOVERY
consecutive trial successes. A successful trial adds one to the count and the
state stays half-open until the count reaches RECOVERY; a failed trial resets
the count and reopens the breaker. Everything outside the marked region is the
practice starter, unchanged. Run alone: python practice_answer.py
"""
import sys

THRESHOLD = 3       # consecutive failures that open the breaker
COOLDOWN = 2.0      # seconds the breaker stays open before it allows one trial call
RECOVERY = 2        # consecutive trial successes needed to close the breaker again
CALLS = [
    {"id": "c1", "t": 0.0, "provider": "ok"},
    {"id": "c2", "t": 0.4, "provider": "fail"},
    {"id": "c3", "t": 0.8, "provider": "fail"},
    {"id": "c4", "t": 1.2, "provider": "fail"},
    {"id": "c5", "t": 1.5, "provider": "fail"},
    {"id": "c6", "t": 2.0, "provider": "fail"},
    {"id": "c7", "t": 3.3, "provider": "fail"},
    {"id": "c8", "t": 4.0, "provider": "fail"},
    {"id": "c9", "t": 5.4, "provider": "ok"},
    {"id": "c10", "t": 5.8, "provider": "ok"},
]


# --- answer begins ---
def protect(calls, threshold, cooldown, recovery):
    """Decide each call in arrival order. Returns one
    (id, t, state before, action, state after) record per call.
    The breaker closes only after recovery consecutive trial successes."""
    if threshold < 1:
        raise ValueError(f"threshold must be at least 1, got {threshold}")
    if cooldown <= 0:
        raise ValueError(f"cooldown must be positive, got {cooldown}")
    if recovery < 1:
        raise ValueError(f"recovery must be at least 1, got {recovery}")
    state = "closed"           # closed: calls go through; open: calls are skipped; half-open: trials
    failures = 0               # consecutive failures seen while closed
    successes = 0              # consecutive trial successes seen while half-open
    opened_at = 0.0            # when the breaker last opened
    last_time = 0.0            # the previous arrival, for the time-order guard
    records = []
    for call in calls:
        t = call["t"]
        if t < last_time:
            raise ValueError(f"calls must arrive in time order: {call['id']} at {t} after {last_time}")
        last_time = t
        if state == "open":
            if t - opened_at >= cooldown:
                state = "half-open"        # the cooldown has passed: this call is a trial
            else:
                records.append((call["id"], t, "open", "skipped", "open"))
                continue                   # the provider is not called; the caller gets an error at once
        before = state
        outcome = call["provider"]         # the scripted answer the provider would give
        if state == "half-open":
            if outcome == "ok":
                successes += 1             # one more good trial
                action = "trial ok"
                if successes >= recovery:
                    state = "closed"       # enough good trials in a row: back to normal
                    failures = 0
                    successes = 0
            else:
                state = "open"             # the trial failed: wait out another cooldown
                opened_at = t
                successes = 0              # the run of good trials is broken
                action = "trial failed"
        else:
            if outcome == "ok":
                failures = 0               # a success ends the run of failures
                action = "ok"
            else:
                failures += 1
                action = "failed"
                if failures >= threshold:
                    state = "open"         # too many in a row: stop calling the provider
                    opened_at = t
        records.append((call["id"], t, before, action, state))
    return records
# --- answer ends ---


if __name__ == "__main__":
    records = protect(CALLS, THRESHOLD, COOLDOWN, RECOVERY)
    last = records[-1]
    if last[2] != "half-open" or last[3] != "trial ok":
        print(f"NOT OK: expected c10 to be the second trial call (half-open, trial ok), got {last[2]}, {last[3]}")
        print(f"Make protect close the breaker only after {RECOVERY} consecutive trial successes.")
        sys.exit(1)
    print(f"{len(CALLS)} calls, breaker opens after {THRESHOLD} consecutive failures, cooldown {COOLDOWN} seconds, closes after {RECOVERY} trial successes")
    print(f"{'id':<4}  {'time':>4}  {'before':<9}  {'action':<12}  after")
    for call_id, t, before, action, after in records:
        print(f"{call_id:<4}  {t:>4.2f}  {before:<9}  {action:<12}  {after}")
    reached = []
    returned_failure = []
    skipped = []
    trials = []
    for call_id, t, before, action, after in records:
        if action == "skipped":
            skipped.append(call_id)
        else:
            reached.append(call_id)
            if action == "failed" or action == "trial failed":
                returned_failure.append(call_id)
        if action == "trial ok":
            trials.append(call_id)
    print(f"\nprovider calls {len(reached)} of {len(CALLS)}, failures returned {len(returned_failure)}, skipped {len(skipped)} ({', '.join(skipped)})")

    try:
        protect([{"id": "c1", "t": 1.0, "provider": "ok"}, {"id": "c2", "t": 0.5, "provider": "ok"}], THRESHOLD, COOLDOWN, RECOVERY)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if trials != ["c9", "c10"] or last[4] != "closed":
        print("\nNOT OK: expected c9 and c10 to be the two trial successes and the breaker to end closed")
        sys.exit(1)
    print(f"\nclosed after {RECOVERY} trial successes ({', '.join(trials)})")
    print("\nOK")
