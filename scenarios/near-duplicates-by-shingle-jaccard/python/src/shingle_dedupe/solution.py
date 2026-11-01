"""Worked example: find near-duplicate records with word shingles and Jaccard similarity.

Orbit's fine-tuning set had already been deduplicated by exact normalized
text, and the model still memorized: the same support answer appeared five
times with one word changed, a word added, or a sentence dropped. Exact
matching cannot see that. This file compares records by their word shingles,
every run of three consecutive words, and scores each pair with Jaccard
similarity: the shingles two records share, divided by the shingles either
one has. Pairs at or above a threshold are near-duplicates, and the walk
keeps the first record of each group.

Input: records with an id and a text. Output: the similarity of every pair,
then one decision per record, kept or dropped. Run alone: python solution.py
"""

RECORDS = [
    {"id": "r1", "text": "Restart the worker, then set the timeout to thirty seconds and confirm the alert clears."},
    {"id": "r2", "text": "Restart the worker, then set the timeout to thirty seconds and check the alert clears."},
    {"id": "r3", "text": "Rotate the API key from the billing page and update the gateway secret."},
    {"id": "r4", "text": "Please restart the worker, then set the timeout to thirty seconds and confirm the alert clears."},
    {"id": "r5", "text": "Set the timeout to thirty seconds."},
]
SHINGLE = 3         # words per shingle
THRESHOLD = 0.5     # Jaccard similarity at or above this is a near-duplicate


def words_of(text):
    """Lowercase words with punctuation stripped: 'worker,' and 'Worker' are the same word."""
    words = []
    for raw in text.lower().split():
        word = ""
        for character in raw:
            if character.isalnum():
                word += character
        if word:
            words.append(word)
    return words


def shingles(text, size):
    """The set of every run of `size` consecutive words, each run a tuple."""
    words = words_of(text)
    found = set()
    for start in range(len(words) - size + 1):
        found.add(tuple(words[start:start + size]))   # a tuple can live in a set; a list cannot
    return found


def jaccard(a, b):
    """Shared shingles over all shingles: 1.0 for identical sets, 0.0 for disjoint ones."""
    return len(a & b) / len(a | b)


def near_duplicates(records, size, threshold):
    """Walk the records in order. Keep a record unless its best Jaccard match
    among the records already kept reaches the threshold. Returns one
    (id, action, matched id, similarity) decision per record."""
    kept = []                                  # (id, shingle set) of every record kept so far
    decisions = []
    for record in records:
        own = shingles(record["text"], size)
        if not own:
            raise ValueError(f"{record['id']} is too short for shingles of {size}")
        best_id = None
        best = 0.0
        for kept_id, other in kept:
            score = jaccard(own, other)
            if score > best:                   # the closest record kept so far
                best_id = kept_id
                best = score
        if best >= threshold:
            decisions.append((record["id"], "dropped", best_id, best))
        else:
            kept.append((record["id"], own))
            decisions.append((record["id"], "kept", None, best))
    return decisions


if __name__ == "__main__":
    print(f"{len(RECORDS)} records, word shingles of {SHINGLE}, threshold {THRESHOLD:.2f}")
    print(f"{'pair':<7} {'shared':>6} {'union':>5}  jaccard")
    sets = {}
    for record in RECORDS:
        sets[record["id"]] = shingles(record["text"], SHINGLE)
    for i in range(len(RECORDS)):
        for j in range(i + 1, len(RECORDS)):        # every pair once, in order
            a = sets[RECORDS[i]["id"]]
            b = sets[RECORDS[j]["id"]]
            score = jaccard(a, b)
            flag = "  near-duplicate" if score >= THRESHOLD else ""
            pair = f"{RECORDS[i]['id']} {RECORDS[j]['id']}"
            print(f"{pair:<7} {len(a & b):>6} {len(a | b):>5}  {score:7.2f}{flag}")

    decisions = near_duplicates(RECORDS, SHINGLE, THRESHOLD)
    print()
    kept = 0
    for record_id, action, match, score in decisions:
        if action == "kept":
            kept += 1
            print(f"{record_id}  kept")
        else:
            print(f"{record_id}  dropped: {score:.2f} of {match}")
    print(f"kept {kept} of {len(RECORDS)}")

    try:
        near_duplicates([{"id": "r9", "text": "Restart it."}], SHINGLE, THRESHOLD)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert [d[1] for d in decisions] == ["kept", "dropped", "kept", "dropped", "kept"]
    assert decisions[1][2] == "r1" and decisions[3][2] == "r1", "both near-copies trace back to the first record"
    assert len(sets["r1"]) == 13 and jaccard(sets["r1"], sets["r1"]) == 1.0, "fifteen words give thirteen shingles"
    print("\nOK")
