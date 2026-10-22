"""Practice: change one behavior of the worked example.

The worked solution keeps one bucket for everyone, so one tenant's burst
empties it for the others. Give each tenant its own bucket: keep the bucket
state in the BUCKETS dictionary, keyed by the tenant, created with a full
bucket the first time a tenant is seen, and run the same refill and spend on
that tenant's state. Everything else stays the same.

Hint: inside the loop, read the request's tenant, test whether it is already
a key of the dictionary with in, and when it is not, store a small
dictionary holding the tokens and the last time for it. Then do the refill,
the cap, and the spend on that stored dictionary instead of the shared
variables.

Expected: every one of the eight requests is admitted, because the two that
the shared bucket rejected belong to tenant b, whose own bucket is full when
they arrive. Run alone: python starter.py   (it prints NOT OK until the
change is made)
"""
import sys

CAPACITY = 3        # the most tokens a bucket holds: the burst allowance
RATE = 1.0          # tokens added per second: the steady rate the provider allows
REQUESTS = [
    {"id": "q1", "t": 0.0, "tenant": "a"},
    {"id": "q2", "t": 0.2, "tenant": "a"},
    {"id": "q3", "t": 0.4, "tenant": "a"},
    {"id": "q4", "t": 0.6, "tenant": "b"},
    {"id": "q5", "t": 1.5, "tenant": "a"},
    {"id": "q6", "t": 1.6, "tenant": "b"},
    {"id": "q7", "t": 4.0, "tenant": "a"},
    {"id": "q8", "t": 4.1, "tenant": "b"},
]


def admit(requests, capacity, rate):
    """Decide each request in arrival order. Returns one
    (id, tenant, t, tokens before, decision, tokens after) record per request.
    The buckets dictionary is not used yet: your change goes here."""
    if capacity < 1:
        raise ValueError(f"capacity must be at least 1, got {capacity}")
    if rate <= 0:
        raise ValueError(f"rate must be positive, got {rate}")
    buckets = {}                   # tenant -> that tenant's own bucket state
    tokens = float(capacity)       # the shared bucket starts full
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
        records.append((request["id"], request["tenant"], t, before, decision, tokens))
    return records


if __name__ == "__main__":
    records = admit(REQUESTS, CAPACITY, RATE)
    rejected = []
    for request_id, tenant, t, before, decision, after in records:
        if decision == "reject":
            rejected.append(request_id)
    if rejected:
        print(f"NOT OK: expected every request to be admitted once each tenant has its own bucket, got rejections: {', '.join(rejected)}")
        print("Make admit keep one bucket per tenant in the buckets dictionary.")
        sys.exit(1)
    print(f"{len(REQUESTS)} requests from 2 tenants, capacity {CAPACITY} tokens per bucket, refill {RATE} per second")
    print(f"{'id':<4}  {'tenant':<6}  {'time':>4}  {'before':>6}  {'decision':<8}  {'after':>5}")
    counts = {}
    for request_id, tenant, t, before, decision, after in records:
        print(f"{request_id:<4}  {tenant:<6}  {t:>4.2f}  {before:>6.2f}  {decision:<8}  {after:>5.2f}")
        if tenant not in counts:
            counts[tenant] = {"admit": 0, "reject": 0}
        counts[tenant][decision] += 1
    print()
    for tenant in sorted(counts):
        print(f"tenant {tenant}: {counts[tenant]['admit']} admitted, {counts[tenant]['reject']} rejected")

    try:
        admit([{"id": "q1", "t": 1.0, "tenant": "a"}, {"id": "q2", "t": 0.5, "tenant": "b"}], CAPACITY, RATE)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if counts != {"a": {"admit": 5, "reject": 0}, "b": {"admit": 3, "reject": 0}}:
        print("\nNOT OK: expected tenant a to be admitted 5 times and tenant b 3 times")
        sys.exit(1)
    print("\nOK")
