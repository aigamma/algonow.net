"""Worked example: build an inverted index and answer AND queries with set intersection.

Orbit's keyword retriever scanned every runbook for every question: each
query cost a pass over the whole collection, and the cost grew with every
document added. An inverted index turns that around. It maps each term to
the ids of the documents that contain it, so a query reads only the posting
lists of its own terms and intersects them.

Input: five short documents, each a dictionary with an id and a text, and
three queries, each a list of terms that must all appear. Output: the index
(a dictionary from term to a list of document ids), the documents matching
each query, and how many posting entries each query read.
Run alone: python solution.py
"""

DOCS = [
    {"id": "d1", "text": "Rotate the API key, then revoke the old key."},
    {"id": "d2", "text": "List calls need the read scope."},
    {"id": "d3", "text": "A lost key cannot be recovered; create a new key."},
    {"id": "d4", "text": "The write scope adds create and delete."},
    {"id": "d5", "text": "Invoices are under Billing, one PDF per month."},
]

QUERIES = [
    ["key", "revoke"],
    ["scope", "create"],
    ["key", "scope"],
]


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


def postings_read(index, terms):
    """How many posting entries a query touches: the work the index does."""
    total = 0
    for term in terms:
        total += len(index.get(term, []))
    return total


if __name__ == "__main__":
    index = build_index(DOCS)
    print(f"{len(DOCS)} documents, {len(index)} distinct terms")
    print("\nterms in two or more documents:")
    for term in sorted(index):
        if len(index[term]) >= 2:
            print(f"  {term:<8}{', '.join(index[term])}")
    print()
    total_read = 0
    for terms in QUERIES:
        found = and_query(index, terms)
        read = postings_read(index, terms)
        total_read += read
        label = " AND ".join(terms)
        if found:
            shown = ", ".join(found)
        else:
            shown = "none"
        print(f"{label:<18} -> {shown:<6} postings read: {read}")
    print(f"\n{total_read} posting entries read for {len(QUERIES)} queries; a scan reads {len(DOCS) * len(QUERIES)} documents")

    try:
        and_query(index, [])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert and_query(index, ["key", "revoke"]) == ["d1"], "one document has both terms"
    assert and_query(index, ["key", "scope"]) == [], "no document has both terms"
    assert index["key"] == ["d1", "d3"], "a term repeated inside d1 is listed once"
    print("\nOK")
