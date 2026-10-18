"""Answer to the practice variation: a third side, test, below its own share,
with validation in the next band and train above both. Everything outside the
marked region is the practice starter, unchanged. Run alone: python practice_answer.py
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


# --- answer begins ---
def side_of(record_id, test_share, validation_share):
    """Test below test_share, validation below test_share + validation_share, train otherwise."""
    number = bucket(record_id)
    if number < test_share:
        return "test"
    if number < test_share + validation_share:
        return "validation"
    return "train"
# --- answer ends ---


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
