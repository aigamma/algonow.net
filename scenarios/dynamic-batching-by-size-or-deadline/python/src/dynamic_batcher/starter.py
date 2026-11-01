"""Practice: change one behavior of the worked example.

The worked solution bounds a batch by its size and by the wait of its oldest
request. A model also has a budget of tokens per call, so add a third bound:
before a request joins the pending batch, if the pending tokens plus this
request's tokens would pass MAX_TOKENS, send the pending batch first with the
reason "tokens". A single request larger than the budget can never be sent:
raise a ValueError for it instead of silently splitting or dropping it.

Hint: inside the loop, after the deadline check and before the append, first
compare the request's tokens with max_tokens and raise when it is too large.
Then add up the tokens of the requests already in pending with a small loop,
and when that total plus the new request's tokens is more than max_tokens,
call flush with the arrival time and the reason "tokens" before appending.
Keep the deadline check first: a deadline that has already passed is settled
before anything else happens at this arrival.

Expected: four batches, sent for tokens, deadline, tokens, deadline, none of
them above 500 tokens, and the longest wait still 1.00 s. Run alone:
python starter.py   (it prints NOT OK until the change is made)
"""
import sys

MAX_BATCH = 4       # the most requests one model call carries: the size cap
MAX_WAIT = 1.0      # the longest any request waits for company, in seconds
MAX_TOKENS = 500    # the most tokens one model call carries: the budget
REQUESTS = [
    {"id": "r1", "t": 0.0, "tokens": 120},
    {"id": "r2", "t": 0.1, "tokens": 80},
    {"id": "r3", "t": 0.3, "tokens": 300},
    {"id": "r4", "t": 0.4, "tokens": 100},
    {"id": "r5", "t": 0.5, "tokens": 200},
    {"id": "r6", "t": 0.9, "tokens": 150},
    {"id": "r7", "t": 1.7, "tokens": 90},
    {"id": "r8", "t": 2.0, "tokens": 400},
    {"id": "r9", "t": 2.2, "tokens": 60},
]


def flush(pending, at, reason, batches):
    """Send the pending requests as one model call: record the batch and hand
    back an empty list for the caller to continue with."""
    ids = []
    for request in pending:
        ids.append(request["id"])
    batches.append({"ids": ids, "at": at, "reason": reason})
    return []


def batch(requests, max_batch, max_wait, max_tokens):
    """Group requests in arrival order into batches bounded by size, by the
    wait of the oldest request, and by a token budget. The max_tokens
    parameter is not used yet: your change goes here."""
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
    batches = batch(REQUESTS, MAX_BATCH, MAX_WAIT, MAX_TOKENS)
    tokens_of = {}
    arrival = {}
    for request in REQUESTS:
        tokens_of[request["id"]] = request["tokens"]
        arrival[request["id"]] = request["t"]
    reasons = []
    totals = []
    for record in batches:
        reasons.append(record["reason"])
        total = 0
        for request_id in record["ids"]:
            total += tokens_of[request_id]
        totals.append(total)
    if reasons != ["tokens", "deadline", "tokens", "deadline"] or max(totals) > MAX_TOKENS:
        print(f"NOT OK: expected four batches sent for tokens, deadline, tokens, deadline within {MAX_TOKENS} tokens each, got {', '.join(reasons)} with token totals {totals}")
        print("Make batch send the pending requests before a request that would push the batch past max_tokens.")
        sys.exit(1)
    print(f"{len(REQUESTS)} requests, at most {MAX_BATCH} per batch, at most {MAX_TOKENS} tokens per batch, at most {MAX_WAIT} s of waiting")
    print(f"{'batch':<5}  {'sent at':>7}  {'reason':<8}  {'tokens':>6}  members")
    for number, record in enumerate(batches, start=1):
        print(f"{number:<5}  {record['at']:>7.2f}  {record['reason']:<8}  {totals[number - 1]:>6}  {', '.join(record['ids'])}")

    print(f"\n{'id':<4}  {'arrived':>7}  {'sent at':>7}  {'wait':>5}")
    waits = []
    for record in batches:
        for request_id in record["ids"]:
            wait = record["at"] - arrival[request_id]
            waits.append(wait)
            print(f"{request_id:<4}  {arrival[request_id]:>7.2f}  {record['at']:>7.2f}  {wait:>5.2f}")
    print(f"\n{len(batches)} model calls instead of {len(REQUESTS)}; longest wait {max(waits):.2f} s (the cap), average wait {sum(waits) / len(waits):.2f} s")

    try:
        batch([{"id": "r1", "t": 1.0, "tokens": 10}, {"id": "r2", "t": 0.5, "tokens": 10}], MAX_BATCH, MAX_WAIT, MAX_TOKENS)
    except ValueError as error:
        print(f"\nrejected: {error}")
    try:
        batch([{"id": "big", "t": 0.0, "tokens": 600}], MAX_BATCH, MAX_WAIT, MAX_TOKENS)
        print("\nNOT OK: a request larger than the budget must raise a ValueError")
        sys.exit(1)
    except ValueError as error:
        print(f"rejected: {error}")

    if max(waits) > MAX_WAIT + 1e-9:
        print("\nNOT OK: a request waited longer than max_wait")
        sys.exit(1)
    print("\nOK")
