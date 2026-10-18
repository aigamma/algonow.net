"""Practice: change one behavior of the worked example.

The worked solution has two sides. Add a third: a test set that is never
touched until the end. Buckets below TEST_SHARE (10) are test, buckets below
TEST_SHARE + VALIDATION_SHARE (10 + 20 = 30) are validation, and the rest
are train. Buckets never change, so the test set is as stable as the others.

Hint: only side_of changes. It already receives test_share and ignores it.
Compare the bucket against the two thresholds in order, smallest first, and
return "test", "validation", or "train". assign already has a list for each.

Expected: test t-1813 and t-1820, validation t-1815 and t-1816, train
t-1814, t-1817, t-1818, and t-1819. Run alone: python starter.py
(it prints NOT OK until the change is made)
"""
import hashlib
import sys

TEST_SHARE = 10         # buckets 0 to 9
VALIDATION_SHARE = 20   # the next twenty buckets, 10 to 29

TRANSCRIPTS = ["t-1813", "t-1814", "t-1815", "t-1816", "t-1817", "t-1818", "t-1819", "t-1820"]
EXPECTED = {
    "train": ["t-1814", "t-1817", "t-1818", "t-1819"],
    "validation": ["t-1815", "t-1816"],
    "test": ["t-1813", "t-1820"],
}


def bucket(record_id):
    """A number from 0 to 99 that depends only on the id: the same on every machine, every run."""
    digest = hashlib.sha256(record_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


def side_of(record_id, test_share, validation_share):
    """Your change goes here: test below test_share, validation below
    test_share + validation_share, train otherwise. The test share is not used yet."""
    if bucket(record_id) < validation_share:
        return "validation"
    return "train"


def assign(ids, test_share, validation_share):
    """Sort ids into train, validation, and test, keeping input order on each side."""
    sides = {"train": [], "validation": [], "test": []}
    for record_id in ids:
        if record_id == "":
            raise ValueError("an empty id cannot be assigned")
        if record_id in sides["train"] or record_id in sides["validation"] or record_id in sides["test"]:
            raise ValueError(f"duplicate id '{record_id}'")
        sides[side_of(record_id, test_share, validation_share)].append(record_id)
    return sides


if __name__ == "__main__":
    sides = assign(TRANSCRIPTS, TEST_SHARE, VALIDATION_SHARE)
    if sides != EXPECTED:
        print(f"NOT OK: expected test {EXPECTED['test']}, got {sides['test']}")
        print("Make side_of return test below TEST_SHARE and validation below TEST_SHARE + VALIDATION_SHARE.")
        sys.exit(1)
    print(f"test share: {TEST_SHARE} of 100 buckets, validation share: {VALIDATION_SHARE}")
    print(f"\n{len(TRANSCRIPTS)} transcripts")
    for record_id in TRANSCRIPTS:
        print(f"{record_id}  bucket {bucket(record_id):2}  {side_of(record_id, TEST_SHARE, VALIDATION_SHARE)}")
    print(f"train {len(sides['train'])}, validation {len(sides['validation'])}, test {len(sides['test'])}")
    print("\nOK")
