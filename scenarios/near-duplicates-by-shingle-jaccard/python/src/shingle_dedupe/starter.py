"""Practice: change one behavior of the worked example.

Word shingles punish a single changed word three times over: the word sits
in three consecutive shingles, so one edit in a fifteen-word answer costs
three of its thirteen shingles. Character shingles are gentler and also
survive typos. Make shingles slide a window of SHINGLE characters over the
normalized text, the words joined by single spaces, instead of a window of
SHINGLE words. Everything else stays the same.

Hint: join the normalized words with a single space to get one string. A
string slice from start to start plus the size is a window of characters,
and a string can go straight into a set. Loop start over range of the
string's length minus the size plus one, like the word version.

Expected: r1 has 79 character shingles instead of 13 word shingles, and the
similarity of r1 and r2 rises from 0.62 to 0.79, because the changed word
sits in three of r1's thirteen word shingles but in only ten of its
seventy-nine character shingles. The same three records are kept. Run alone:
python starter.py   (it prints NOT OK until the change is made)
"""
import sys

RECORDS = [
    {"id": "r1", "text": "Restart the worker, then set the timeout to thirty seconds and confirm the alert clears."},
    {"id": "r2", "text": "Restart the worker, then set the timeout to thirty seconds and check the alert clears."},
    {"id": "r3", "text": "Rotate the API key from the billing page and update the gateway secret."},
    {"id": "r4", "text": "Please restart the worker, then set the timeout to thirty seconds and confirm the alert clears."},
    {"id": "r5", "text": "Set the timeout to thirty seconds."},
]
SHINGLE = 5         # characters per shingle
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
    """The set of every run of `size` consecutive words, each run a tuple.
    Not changed yet: this is still the word version."""
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
    sets = {}
    for record in RECORDS:
        sets[record["id"]] = shingles(record["text"], SHINGLE)
    if len(sets["r1"]) != 79 or round(jaccard(sets["r1"], sets["r2"]), 2) != 0.79:
        print(f"NOT OK: expected 79 character shingles for r1 and a similarity of 0.79 between r1 and r2, got {len(sets['r1'])} shingles and {jaccard(sets['r1'], sets['r2']):.2f}")
        print("Make shingles slide a window of SHINGLE characters over the normalized text.")
        sys.exit(1)
    print(f"{len(RECORDS)} records, character shingles of {SHINGLE}, threshold {THRESHOLD:.2f}")
    print(f"{'pair':<7} {'shared':>6} {'union':>5}  jaccard")
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
        near_duplicates([{"id": "r9", "text": "Ok."}], SHINGLE, THRESHOLD)
    except ValueError as error:
        print(f"\nrejected: {error}")

    if [d[1] for d in decisions] != ["kept", "dropped", "kept", "dropped", "kept"]:
        print("\nNOT OK: expected the same three records kept with character shingles")
        sys.exit(1)
    print("\nOK")
