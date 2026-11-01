"""Worked example: batch single requests to a model by size or deadline.

Orbit's embedding service forwarded each request to the model as its own
call. Every call pays the model's fixed per-call overhead, so at busy hours
the service fell behind while the accelerator sat mostly idle between tiny
calls. This file collects requests that arrive close together into one model
call, bounded two ways: a batch is sent when it holds MAX_BATCH requests, or
when its oldest request has waited MAX_WAIT seconds, whichever comes first.

Input: requests in arrival order, each a dictionary with an id and an arrival
time in seconds. Output: one record per batch with its members, the time it
was sent, and the reason it was sent. Run alone: python solution.py
"""

MAX_BATCH = 4       # the most requests one model call carries: the size cap
MAX_WAIT = 1.0      # the longest any request waits for company, in seconds
REQUESTS = [
    {"id": "r1", "t": 0.0},
    {"id": "r2", "t": 0.1},
    {"id": "r3", "t": 0.3},
    {"id": "r4", "t": 0.4},
    {"id": "r5", "t": 0.5},
    {"id": "r6", "t": 0.9},
    {"id": "r7", "t": 1.7},
    {"id": "r8", "t": 2.0},
    {"id": "r9", "t": 2.2},
]


def flush(pending, at, reason, batches):
    """Send the pending requests as one model call: record the batch and hand
    back an empty list for the caller to continue with."""
    ids = []
    for request in pending:
        ids.append(request["id"])
    batches.append({"ids": ids, "at": at, "reason": reason})
    return []


def batch(requests, max_batch, max_wait):
    """Group requests in arrival order into batches. A batch is sent when it
    holds max_batch requests, or when its oldest request has waited max_wait
    seconds, whichever comes first. Returns one record per batch."""
    if max_batch < 1:
        raise ValueError(f"max_batch must be at least 1, got {max_batch}")
    if max_wait <= 0:
        raise ValueError(f"max_wait must be positive, got {max_wait}")
    batches = []
    pending = []                   # the requests waiting for the next model call
    last_time = 0.0
    for request in requests:
        t = request["t"]
        if t < last_time:
            raise ValueError(f"requests must arrive in time order: {request['id']} at {t} after {last_time}")
        last_time = t
        if pending and t >= pending[0]["t"] + max_wait:
            # The oldest pending request's deadline passed before this arrival,
            # so the timer fired first: settle it before anything else.
            pending = flush(pending, pending[0]["t"] + max_wait, "deadline", batches)
        pending.append(request)
        if len(pending) == max_batch:
            pending = flush(pending, t, "full", batches)
    if pending:
        pending = flush(pending, pending[0]["t"] + max_wait, "deadline", batches)
    return batches


if __name__ == "__main__":
    batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT)
    print(f"{len(REQUESTS)} requests, at most {MAX_BATCH} per batch, at most {MAX_WAIT} s of waiting")
    print(f"{'batch':<5}  {'sent at':>7}  {'reason':<8}  members")
    for number, record in enumerate(batches, start=1):
        print(f"{number:<5}  {record['at']:>7.2f}  {record['reason']:<8}  {', '.join(record['ids'])}")

    arrival = {}
    for request in REQUESTS:
        arrival[request["id"]] = request["t"]
    print(f"\n{'id':<4}  {'arrived':>7}  {'sent at':>7}  {'wait':>5}")
    waits = []
    for record in batches:
        for request_id in record["ids"]:
            wait = record["at"] - arrival[request_id]
            waits.append(wait)
            print(f"{request_id:<4}  {arrival[request_id]:>7.2f}  {record['at']:>7.2f}  {wait:>5.2f}")
    print(f"\n{len(batches)} model calls instead of {len(REQUESTS)}; longest wait {max(waits):.2f} s (the cap), average wait {sum(waits) / len(waits):.2f} s")

    try:
        batch([{"id": "r1", "t": 1.0}, {"id": "r2", "t": 0.5}], MAX_BATCH, MAX_WAIT)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert len(batches) == 3, "three model calls carry the nine requests"
    reasons = []
    for record in batches:
        reasons.append(record["reason"])
        assert len(record["ids"]) <= MAX_BATCH, "no batch holds more than the cap"
    assert reasons == ["full", "deadline", "deadline"], "one batch filled up, two hit the deadline"
    assert max(waits) <= MAX_WAIT + 1e-9, "no request waits longer than the deadline"
    print("\nOK")
