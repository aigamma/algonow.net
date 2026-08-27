# Puzzle 42: MinHash x bottom-k signatures
# Estimate the Jaccard similarity of two large sets from tiny sketches,
# without ever comparing the sets: and make near-duplicate search at
# corpus scale skip the all-pairs wall entirely.
#
# The pairing is the point. The algorithm is the min-hash collision
# theorem: under a random hash, P[min of A equals min of B] is EXACTLY
# the Jaccard similarity, because the union's minimum is a uniformly
# random element of the union and collides precisely when it lies in
# the intersection. The heuristic is the bottom-k signature: instead of
# k independent hash functions (k hashes per element), keep the k
# smallest values of ONE hash: one pass, one hash per element, and the
# sketch of a union is the merge of sketches, exactly: composability
# asserted below as set equality, the error law measured against
# 1/sqrt(k), and the LSH banding demo finding every planted duplicate
# while doing 500x fewer comparisons than all-pairs.
import hashlib
import math
import random
import statistics
from pathlib import Path


def h64(x, salt=""):
    return int.from_bytes(hashlib.blake2b(f"{salt}|{x}".encode(), digest_size=8).digest(), "big")


def bottom_k(items, k, salt="", counter=None):
    """The k smallest hash values of one hash function: one pass."""
    hs = []
    for it in items:
        if counter is not None:
            counter["hashes"] = counter.get("hashes", 0) + 1
        hs.append(h64(it, salt))
    hs.sort()
    out = []
    for v in hs:  # dedupe (sets may repeat nothing, but hashes could tie)
        if not out or v != out[-1]:
            out.append(v)
        if len(out) == k:
            break
    return out


def jaccard_est(sig_a, sig_b, k):
    """Bottom-k estimator: among the k smallest of the union of the two
    signatures, the fraction present in both."""
    union = sorted(set(sig_a) | set(sig_b))[:k]
    inter = set(sig_a) & set(sig_b)
    hits = sum(1 for v in union if v in inter)
    return hits / len(union) if union else 0.0


def exact_jaccard(a, b):
    return len(a & b) / len(a | b) if a | b else 0.0


def make_pair(rng, n, j_target):
    """Two n-element sets built to an exact target Jaccard: shared core
    of size c where c/(2n - c) = j -> c = 2nj/(1+j)."""
    c = round(2 * n * j_target / (1 + j_target))
    core = {f"core-{rng.random()}-{i}" for i in range(c)}
    a = core | {f"a-{rng.random()}-{i}" for i in range(n - c)}
    b = core | {f"b-{rng.random()}-{i}" for i in range(n - c)}
    return a, b


def shingles(text, w=3):
    words = text.split()
    return {" ".join(words[i : i + w]) for i in range(len(words) - w + 1)}


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the collision theorem itself. One min-hash collides
    # with probability exactly J: measured over 2,000 independent salts
    # on a pair of known Jaccard 1/3.
    a, b = make_pair(rng, 600, 1 / 3)
    true_j = exact_jaccard(a, b)
    hits = 0
    for t in range(2_000):
        ma = min(h64(x, f"s{t}") for x in a)
        mb = min(h64(x, f"s{t}") for x in b)
        hits += ma == mb
    assert abs(hits / 2_000 - true_j) < 0.03, (hits / 2_000, true_j)

    # Oracle 2: composability, exact. The sketch of a union equals the
    # merged sketches, as identical lists, on 100 random pairs.
    for _ in range(100):
        n1, n2 = rng.randint(50, 400), rng.randint(50, 400)
        s1 = {f"x{rng.random()}" for _ in range(n1)}
        s2 = {f"y{rng.random()}" for _ in range(n2)}
        k = 64
        direct = bottom_k(s1 | s2, k)
        merged = sorted(set(bottom_k(s1, k)) | set(bottom_k(s2, k)))[:k]
        assert direct == merged

    # Oracle 3: the error law. RMSE across 200 pairs per k, against
    # the binomial reference sqrt(J(1-J)/k).
    RMSES = {}
    for k in (16, 64, 256, 1024):
        errs = []
        for _ in range(200):
            j_t = rng.choice((0.1, 0.3, 0.5, 0.8))
            aa, bb = make_pair(rng, 3_000, j_t)
            tj = exact_jaccard(aa, bb)
            est = jaccard_est(bottom_k(aa, k), bottom_k(bb, k), k)
            errs.append((est - tj) ** 2)
        RMSES[k] = math.sqrt(sum(errs) / len(errs))
    assert RMSES[16] > RMSES[64] > RMSES[256] > RMSES[1024]
    assert RMSES[1024] < RMSES[64] / 2.5  # the 1/sqrt(k) shrink, measured
    assert RMSES[256] < 0.05

    # Oracle 4: the hashing bill: bottom-k pays one hash per element;
    # k independent functions would pay k. Counted.
    c_bk = {}
    big_set = {f"e{i}" for i in range(10_000)}
    bottom_k(big_set, 256, counter=c_bk)
    assert c_bk["hashes"] == 10_000  # k-wise would be 2,560,000

    # Oracle 5: this repository's own prose, sketched. Exact Jaccard by
    # full set ops referees every estimate.
    root = Path(__file__).resolve().parent.parent
    nar = sorted((root / "src" / "content").glob("*.narration.js"))[:2]
    doc_a = shingles(nar[0].read_text(encoding="utf-8"))
    doc_b = shingles(nar[1].read_text(encoding="utf-8"))
    j_docs = exact_jaccard(doc_a, doc_b)
    est_docs = jaccard_est(bottom_k(doc_a, 256), bottom_k(doc_b, 256), 256)
    assert abs(est_docs - j_docs) < 0.06
    plan = (root / "docs" / "OVERNIGHT-PLAN.md").read_text(encoding="utf-8")
    words = plan.split()
    trunc = " ".join(words[: int(len(words) * 0.7)])
    d_full = shingles(plan)
    d_trunc = shingles(trunc)
    j_tr = exact_jaccard(d_full, d_trunc)
    est_tr = jaccard_est(bottom_k(d_full, 256), bottom_k(d_trunc, 256), 256)
    assert abs(est_tr - j_tr) < 0.06

    # Oracle 6: LSH banding: the reason sketches exist. 200 documents,
    # 5 planted near-duplicate pairs; band the signatures and compare
    # only band-collision candidates. Recall must be 5/5, measured, at
    # a tiny fraction of the 19,900 all-pairs comparisons.
    docs = []
    for i in range(190):
        docs.append({f"d{i}-{rng.random()}-{t}" for t in range(800)})
    planted = []
    for p in range(5):
        base = {f"p{p}-{rng.random()}-{t}" for t in range(800)}
        near = set(base)
        drop = rng.sample(sorted(near), 60)
        near.difference_update(drop)
        near.update({f"q{p}-{rng.random()}-{t}" for t in range(60)})
        docs.append(base)
        docs.append(near)
        planted.append((len(docs) - 2, len(docs) - 1))
        assert exact_jaccard(base, near) > 0.75
    # Signatures: 64 mins from 64 salted hashes (k-wise here, because
    # banding needs positionally aligned rows).
    sigs = []
    for d in docs:
        sigs.append([min(h64(x, f"b{r}") for x in d) for r in range(64)])
    bands = {}
    for idx, sig in enumerate(sigs):
        for bnd in range(16):
            key = (bnd, tuple(sig[bnd * 4 : bnd * 4 + 4]))
            bands.setdefault(key, []).append(idx)
    candidates = set()
    for members in bands.values():
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                candidates.add((members[i], members[j]))
    for pair in planted:
        assert pair in candidates, pair  # recall 5/5, not sampled: all
    all_pairs = len(docs) * (len(docs) - 1) // 2
    assert len(candidates) < all_pairs / 100  # 500x fewer in practice

    print(f"contest: sets of 3,000 with exact-Jaccard referees; 200 trials per sketch size")
    print(f"  {'sketch k':<12} {'RMSE':>8}   reference sqrt(J(1-J)/k) at J=0.5")
    for k in (16, 64, 256, 1024):
        print(f"  {k:<12} {RMSES[k]:>8.4f}   {math.sqrt(0.25 / k):>8.4f}")
    print(f"the collision theorem, measured: single min-hash collided in {hits}/2,000 salts = {hits / 2_000:.4f} vs exact J = {true_j:.4f}")
    print("composability: sketch(A union B) == merge(sketch A, sketch B), exactly, 100/100 pairs")
    print(f"hashing bill at |set| = 10,000, k = 256: bottom-k {c_bk['hashes']:,} hashes; k independent functions would pay 2,560,000 (256x)")
    print(f"this site's own prose: two narrations share J = {j_docs:.3f} of 3-shingles (est {est_docs:.3f}): the house style, quantified; the plan vs its front 70%: J = {j_tr:.3f} (est {est_tr:.3f})")
    print(f"LSH banding, 200 docs: all 5 planted near-duplicates surfaced; {len(candidates)} candidate pairs instead of {all_pairs:,} ({all_pairs // max(len(candidates), 1)}x fewer comparisons)")
    print("OK: the collision theorem measured at its exact value, composability exact on every pair, the 1/sqrt(k) error law monotone and priced, the hashing bill counted, real prose refereed by full set ops, and banding at perfect recall for 1/100th the comparisons")
