"""Answer to the practice variation: a hit whose entry is older than the time
to live counts as expired, so the model is called again and the fresh answer
is inserted with the current minute. Everything outside the marked region is
the practice starter, unchanged. Run alone: python practice_answer.py
"""
import sys

CAPACITY = 3   # how many answers the cache keeps
TTL_MINUTES = 40   # an entry older than this is stale

REQUESTS = [
    {"id": "r1", "t": 0, "prompt": "Rotate a key?"},
    {"id": "r2", "t": 15, "prompt": "List call scope?"},
    {"id": "r3", "t": 20, "prompt": "Find my invoice?"},
    {"id": "r4", "t": 25, "prompt": "rotate a key?"},
    {"id": "r5", "t": 28, "prompt": "LIST call scope?"},
    {"id": "r6", "t": 30, "prompt": "Lost key recovery?"},
    {"id": "r7", "t": 42, "prompt": "Rotate  a key?"},
    {"id": "r8", "t": 44, "prompt": "List call scope?"},
    {"id": "r9", "t": 46, "prompt": "Find my invoice?"},
]

ANSWERS = {   # what the hosted model would say; the fake below stands in for it
    "rotate a key?": "Create a replacement key, deploy it, then revoke the old one.",
    "list call scope?": "List calls need the read scope.",
    "find my invoice?": "Open Billing, then Invoices; each month is a PDF.",
    "lost key recovery?": "A lost key cannot be recovered. Create a replacement.",
}


def key_for(prompt):
    """The cache key: lowercase, with any run of whitespace collapsed to one space."""
    return " ".join(prompt.lower().split())


def fake_model(prompt):
    """Stands in for the hosted model: the canned answer for the question."""
    return ANSWERS[key_for(prompt)]


# --- answer begins ---
def cached_answer(cache, request, capacity, call_model, stats, ttl):
    """Answer one request from the cache when it can, else from the model.
    Entries are (answer, inserted minute) pairs; one older than ttl is stale.
    Returns the answer, the outcome (hit, expired, or miss), and the evicted key."""
    if capacity < 1:
        raise ValueError(f"capacity must be at least 1, got {capacity}")
    key = key_for(request["prompt"])
    now = request["t"]
    outcome = "miss"
    if key in cache:
        answer, inserted_at = cache[key]
        if now - inserted_at <= ttl:
            del cache[key]              # take it out of its old place...
            cache[key] = (answer, inserted_at)   # ...and put it back as the most recent entry
            stats["hits"] += 1
            return answer, "hit", None
        del cache[key]                  # stale: drop it and fall through to the miss path
        stats["expired"] += 1
        outcome = "expired"
    answer = call_model(request["prompt"])
    stats["calls"] += 1
    cache[key] = (answer, now)
    evicted = None
    if len(cache) > capacity:
        evicted = next(iter(cache))   # the first key is the oldest
        del cache[evicted]
        stats["evictions"] += 1
    return answer, outcome, evicted
# --- answer ends ---


if __name__ == "__main__":
    cache = {}
    stats = {"calls": 0, "hits": 0, "expired": 0, "evictions": 0}
    rows = []
    for request in REQUESTS:
        answer, outcome, evicted = cached_answer(cache, request, CAPACITY, fake_model, stats, TTL_MINUTES)
        shown = "-"
        if evicted is not None:
            shown = evicted
        rows.append(f"{request['id']:<3} {request['t']:>4}  {outcome:<7} {shown:<18} {' | '.join(cache)}")
    if stats["expired"] == 0:
        print(f"NOT OK: expected the entry for 'rotate a key?' to expire at minute 42 (inserted at minute 0,"
              f" time to live {TTL_MINUTES}), got {stats['expired']} expired entries and {stats['calls']} model calls")
        print("Make cached_answer compare the entry's age with the time to live on every hit.")
        sys.exit(1)
    print(f"{len(REQUESTS)} requests, cache capacity {CAPACITY}, entries expire after {TTL_MINUTES} minutes")
    print(f"{'id':<3} {'min':>4}  {'outcome':<7} {'evicted':<18} cache, oldest first")
    for row in rows:
        print(row)
    print(f"\nmodel calls {stats['calls']}, hits {stats['hits']}, expired {stats['expired']}, evictions {stats['evictions']}"
          f" (no cache would call the model {len(REQUESTS)} times)")
    if stats != {"calls": 6, "hits": 3, "expired": 1, "evictions": 2}:
        print(f"\nNOT OK: expected 6 calls, 3 hits, 1 expired, 2 evictions, got {stats}")
        sys.exit(1)
    print("\nOK")
