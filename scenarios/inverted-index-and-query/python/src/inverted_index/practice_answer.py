"""Answer to the practice variation: or_query counts, for each document, how
many of the query terms list it, and ranks the documents by that count.
Everything outside the marked region is the practice starter, unchanged.
Run alone: python practice_answer.py
"""
import sys

DOCS = [
    {"id": "d1", "text": "Rotate the API key, then revoke the old key."},
    {"id": "d2", "text": "List calls need the read scope."},
    {"id": "d3", "text": "A lost key cannot be recovered; create a new key."},
    {"id": "d4", "text": "The write scope adds create and delete."},
    {"id": "d5", "text": "Invoices are under Billing, one PDF per month."},
]

OR_QUERY = ["key", "scope", "create"]


def tokenize(text):
    """The terms of a text: lowercase, letters and digits only, split on whitespace."""
    lowered = text.lower()
    kept_chars = ""
    for char in lowered:
        if char.isalnum() or char.isspace():
            kept_chars = kept_chars + char
    return kept_chars.split()


def build_index(docs):
    """A dictionary from each term to the ids of the documents that contain it,
    in input order. A term that repeats inside one document is listed once."""
    index = {}
    for doc in docs:
        for term in sorted(set(tokenize(doc["text"]))):
            if term not in index:
                index[term] = []
            index[term].append(doc["id"])
    return index


def and_query(index, terms):
    """The ids of the documents that contain every term: the intersection of
    the terms' posting lists, sorted for a stable answer."""
    if len(terms) == 0:
        raise ValueError("query has no terms")
    result = set(index.get(terms[0], []))
    for term in terms[1:]:
        result = result & set(index.get(term, []))
    return sorted(result)


# --- answer begins ---
def match_order(pair):
    """The sort key for a (id, count) pair: most matches first, then by id."""
    return (-pair[1], pair[0])


def or_query(index, terms):
    """Documents that contain any of the terms, as (id, matched term count)
    pairs, most matches first, ties broken by id."""
    if len(terms) == 0:
        raise ValueError("query has no terms")
    counts = {}
    for term in terms:
        for doc_id in index.get(term, []):
            counts[doc_id] = counts.get(doc_id, 0) + 1
    pairs = []
    for doc_id in counts:
        pairs.append((doc_id, counts[doc_id]))
    return sorted(pairs, key=match_order)
# --- answer ends ---


if __name__ == "__main__":
    index = build_index(DOCS)
    ranked = or_query(index, OR_QUERY)
    if ranked != [("d3", 2), ("d4", 2), ("d1", 1), ("d2", 1)]:
        print(f"NOT OK: expected four documents ranked by matched terms for {' OR '.join(OR_QUERY)}, got {ranked}")
        print("Make or_query count how many query terms list each document, then sort by that count, highest first, and by id for ties.")
        sys.exit(1)
    print(f"{len(DOCS)} documents, {len(index)} distinct terms")
    print(f"\n{' AND '.join(OR_QUERY)} -> {', '.join(and_query(index, OR_QUERY)) or 'none'}")
    print(f"\n{' OR '.join(OR_QUERY)}, ranked by matched terms:")
    for doc_id, count in ranked:
        print(f"  {doc_id}  {count} of {len(OR_QUERY)}")
    if or_query(index, ["key"]) != [("d1", 1), ("d3", 1)] or or_query(index, ["zebra"]) != []:
        print("\nNOT OK: a one-term OR query must list that term's documents with a count of 1, and an unknown term must match nothing")
        sys.exit(1)
    print("\nOK")
