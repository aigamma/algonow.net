"""Worked example: smooth request bursts to a model endpoint with a token bucket.

Orbit's gateway forwarded every request to the hosted model the instant it
arrived. A burst of twenty requests in one second tripped the provider's rate
limit, the provider rejected all twenty, and the retries made it worse. This
file admits or rejects requests with a token bucket: the bucket holds up to
CAPACITY tokens, refills at RATE tokens per second, each admitted request
takes one token, and a request that finds less than one token is rejected.

Input: requests in arrival order, each a dictionary with an id and an arrival
time in seconds. Output: one record per request with the bucket level before
and after it and the decision. Run alone: python solution.py
"""

CAPACITY = 3        # the most tokens the bucket holds: the burst allowance
RATE = 1.0          # tokens added per second: the steady rate the provider allows
REQUESTS = [
    {"id": "q1", "t": 0.0},
    {"id": "q2", "t": 0.2},
    {"id": "q3", "t": 0.4},
    {"id": "q4", "t": 0.6},
    {"id": "q5", "t": 1.5},
    {"id": "q6", "t": 1.6},
    {"id": "q7", "t": 4.0},
    {"id": "q8", "t": 4.1},
]


def admit(requests, capacity, rate):
    """Decide each request in arrival order. Returns one
    (id, t, tokens before, decision, tokens after) record per request."""
    if capacity < 1:
        raise ValueError(f"capacity must be at least 1, got {capacity}")
    if rate <= 0:
        raise ValueError(f"rate must be positive, got {rate}")
    tokens = float(capacity)       # the bucket starts full
    last_time = 0.0                # when the bucket was last brought up to date
    records = []
    for request in requests:
        t = request["t"]
        if t < last_time:
            raise ValueError(f"requests must arrive in time order: {request['id']} at {t} after {last_time}")
        elapsed = t - last_time
        tokens = min(capacity, tokens + elapsed * rate)   # refill for the time passed, never past the top
        last_time = t
        before = tokens
        if tokens >= 1:
            tokens -= 1                # the request spends one token
            decision = "admit"
        else:
            decision = "reject"        # less than a whole token: nothing is spent
        records.append((request["id"], t, before, decision, tokens))
    return records


if __name__ == "__main__":
    records = admit(REQUESTS, CAPACITY, RATE)
    print(f"{len(REQUESTS)} requests, capacity {CAPACITY} tokens, refill {RATE} per second")
    print(f"{'id':<4}  {'time':>4}  {'before':>6}  {'decision':<8}  {'after':>5}")
    for request_id, t, before, decision, after in records:
        print(f"{request_id:<4}  {t:>4.2f}  {before:>6.2f}  {decision:<8}  {after:>5.2f}")
    admitted = []
    rejected = []
    for request_id, t, before, decision, after in records:
        if decision == "admit":
            admitted.append(request_id)
        else:
            rejected.append(request_id)
    print(f"\nadmitted {len(admitted)}, rejected {len(rejected)} ({', '.join(rejected)})")

    try:
        admit([{"id": "q1", "t": 1.0}, {"id": "q2", "t": 0.5}], CAPACITY, RATE)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(admitted) == 6, "six requests fit the capacity and the refill"
    assert rejected == ["q4", "q6"], "the two that found less than one token"
    highest = 0.0
    for request_id, t, before, decision, after in records:
        highest = max(highest, before)
    assert highest <= CAPACITY, "the bucket never overfills"
    print("\nOK")
