"""Worked example: stop hammering a failing model provider with a circuit breaker.

Orbit's gateway calls a hosted model provider. When the provider degraded one
afternoon, every request waited the full timeout and then failed, and the
retries kept the provider saturated and the gateway's workers busy doing
nothing. This file protects the calls with a circuit breaker: after THRESHOLD
consecutive failures the breaker opens and the gateway stops calling the
provider; after COOLDOWN seconds it goes half-open and lets one trial call
through; a successful trial closes it, a failed trial opens it again.

Input: calls in arrival order, each a dictionary with an id, an arrival time
in seconds, and what the provider would answer if the call reached it ("ok"
or "fail"). That last field is a scripted stand-in for the provider, so the
example runs alone. Output: one record per call with the breaker's state
before it, what happened, and the state after. Run alone: python solution.py
"""

THRESHOLD = 3       # consecutive failures that open the breaker
COOLDOWN = 2.0      # seconds the breaker stays open before it allows one trial call
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


def protect(calls, threshold, cooldown):
    """Decide each call in arrival order. Returns one
    (id, t, state before, action, state after) record per call."""
    if threshold < 1:
        raise ValueError(f"threshold must be at least 1, got {threshold}")
    if cooldown <= 0:
        raise ValueError(f"cooldown must be positive, got {cooldown}")
    state = "closed"           # closed: calls go through; open: calls are skipped; half-open: one trial
    failures = 0               # consecutive failures seen while closed
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
                state = "half-open"        # the cooldown has passed: this call is the trial
            else:
                records.append((call["id"], t, "open", "skipped", "open"))
                continue                   # the provider is not called; the caller gets an error at once
        before = state
        outcome = call["provider"]         # the scripted answer the provider would give
        if state == "half-open":
            if outcome == "ok":
                state = "closed"           # the trial succeeded: back to normal
                failures = 0
                action = "trial ok"
            else:
                state = "open"             # the trial failed: wait out another cooldown
                opened_at = t
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


if __name__ == "__main__":
    records = protect(CALLS, THRESHOLD, COOLDOWN)
    print(f"{len(CALLS)} calls, breaker opens after {THRESHOLD} consecutive failures, cooldown {COOLDOWN} seconds")
    print(f"{'id':<4}  {'time':>4}  {'before':<9}  {'action':<12}  after")
    for call_id, t, before, action, after in records:
        print(f"{call_id:<4}  {t:>4.2f}  {before:<9}  {action:<12}  {after}")
    reached = []
    returned_failure = []
    skipped = []
    for call_id, t, before, action, after in records:
        if action == "skipped":
            skipped.append(call_id)
        else:
            reached.append(call_id)
            if action == "failed" or action == "trial failed":
                returned_failure.append(call_id)
    print(f"\nprovider calls {len(reached)} of {len(CALLS)}, failures returned {len(returned_failure)}, skipped {len(skipped)} ({', '.join(skipped)})")

    try:
        protect([{"id": "c1", "t": 1.0, "provider": "ok"}, {"id": "c2", "t": 0.5, "provider": "ok"}], THRESHOLD, COOLDOWN)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(reached) == 7, "seven calls reach the provider"
    assert skipped == ["c5", "c6", "c8"], "the three calls that arrived while the breaker was open"
    assert records[6][2] == "half-open", "c7 is the trial call once the first cooldown has passed"
    assert records[-1][4] == "closed", "the breaker ends closed"
    print("\nOK")
