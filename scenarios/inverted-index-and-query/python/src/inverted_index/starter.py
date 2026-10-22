"""Practice: change one behavior of the worked example.

The worked solution answers AND queries: a document must contain every term.
Write or_query instead: a document that contains any of the terms is a match,
and the matches are ranked by how many of the query terms they contain, most
first, with ties broken by id. Everything else stays the same.

Hint: walk the posting list of each term and count, per document id, how many
terms listed it, in a dictionary from id to count. Turn the dictionary into a
list of (id, count) pairs and sort it with a key function that returns the
negative count and then the id.

Expected: for the three-term query, d3 and d4 match two terms each, d1 and d2
match one each, so the ranking is d3, d4, d1, d2.
Run alone: python starter.py   (it prints NOT OK until the change is made)
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


def or_query(index, terms):
    """Documents that contain any of the terms, as (id, matched term count)
    pairs, most matches first, ties broken by id.
    Not written yet: as shipped this returns the AND result. Your change goes here."""
    pairs = []
    for doc_id in and_query(index, terms):
        pairs.append((doc_id, len(terms)))
    return pairs


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
