"""Answer to the practice variation: each tenant gets its own bucket, kept in
a dictionary keyed by the tenant and created full the first time the tenant
is seen. Everything outside the marked region is the practice starter,
unchanged. Run alone: python practice_answer.py
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


# --- answer begins ---
def admit(requests, capacity, rate):
    """Decide each request in arrival order with one bucket per tenant. Returns one
    (id, tenant, t, tokens before, decision, tokens after) record per request."""
    if capacity < 1:
        raise ValueError(f"capacity must be at least 1, got {capacity}")
    if rate <= 0:
        raise ValueError(f"rate must be positive, got {rate}")
    buckets = {}                   # tenant -> that tenant's own bucket state
    last_time = 0.0                # arrival order is still checked across every tenant
    records = []
    for request in requests:
        t = request["t"]
        if t < last_time:
            raise ValueError(f"requests must arrive in time order: {request['id']} at {t} after {last_time}")
        last_time = t
        tenant = request["tenant"]
        if tenant not in buckets:
            buckets[tenant] = {"tokens": float(capacity), "last": 0.0}   # a full bucket on first sight
        bucket = buckets[tenant]
        elapsed = t - bucket["last"]
        bucket["tokens"] = min(capacity, bucket["tokens"] + elapsed * rate)   # refill this tenant's bucket
        bucket["last"] = t
        before = bucket["tokens"]
        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1      # the request spends one of its tenant's tokens
            decision = "admit"
        else:
            decision = "reject"
        records.append((request["id"], tenant, t, before, decision, bucket["tokens"]))
    return records
# --- answer ends ---


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
