"""Worked example: cache model responses by prompt with a small LRU cache.

Orbit's assistant answers the same ten questions all day, and every one of
them was a call to the hosted model. This file keeps recent answers in a
plain dictionary keyed by the normalized prompt. A dictionary remembers the
order keys were inserted, so the first key is always the oldest: a hit is
deleted and reinserted to become the most recent, and when the cache grows
past its capacity the first key is evicted. That is a least-recently-used
cache, written out so every step is visible.

Input: nine requests in arrival order, each with an id, the minute it
arrived, and the prompt as typed. Output: for each request whether it was a
hit or a miss, what was evicted, and the cache order, then the totals.
Run alone: python solution.py
"""

CAPACITY = 3   # how many answers the cache keeps

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


def cached_answer(cache, prompt, capacity, call_model, stats):
    """Answer one prompt from the cache when it can, else from the model.
    Returns the answer, the outcome (hit or miss), and the evicted key or None."""
    if capacity < 1:
        raise ValueError(f"capacity must be at least 1, got {capacity}")
    key = key_for(prompt)
    if key in cache:
        answer = cache[key]
        del cache[key]              # take it out of its old place...
        cache[key] = answer         # ...and put it back as the most recent entry
        stats["hits"] += 1
        return answer, "hit", None
    answer = call_model(prompt)
    stats["calls"] += 1
    cache[key] = answer
    evicted = None
    if len(cache) > capacity:
        evicted = next(iter(cache))   # the first key is the oldest
        del cache[evicted]
        stats["evictions"] += 1
    return answer, "miss", evicted


if __name__ == "__main__":
    cache = {}
    stats = {"calls": 0, "hits": 0, "evictions": 0}
    print(f"{len(REQUESTS)} requests, cache capacity {CAPACITY}, least recently used evicted first")
    print(f"{'id':<3} {'outcome':<7} {'evicted':<18} cache, oldest first")
    for request in REQUESTS:
        answer, outcome, evicted = cached_answer(cache, request["prompt"], CAPACITY, fake_model, stats)
        shown = "-"
        if evicted is not None:
            shown = evicted
        print(f"{request['id']:<3} {outcome:<7} {shown:<18} {' | '.join(cache)}")
    print(f"\nmodel calls {stats['calls']}, hits {stats['hits']}, evictions {stats['evictions']}"
          f" (no cache would call the model {len(REQUESTS)} times)")

    try:
        cached_answer({}, "Rotate a key?", 0, fake_model, {"calls": 0, "hits": 0, "evictions": 0})
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert stats == {"calls": 5, "hits": 4, "evictions": 2}, "five calls, four hits, two evictions"
    assert list(cache) == ["rotate a key?", "list call scope?", "find my invoice?"], "oldest first"
    assert cache["rotate a key?"] == ANSWERS["rotate a key?"], "a cached answer is the model's answer"
    print("\nOK")
