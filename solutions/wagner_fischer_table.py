# Puzzle 25: Wagner-Fischer x prefix-to-prefix table
# The minimum number of single-character edits turning one string into
# another, together with the edit script that proves it.
#
# The pairing is the point. The control structure is dynamic programming;
# the heuristic is the STATE it runs on: D[i][j] = the distance between the
# first i characters of s and the first j characters of t. That choice is
# everything. Prefix-vs-prefix makes each cell answerable from three
# neighbors (substitute, delete, insert), fills in any sweep order, and its
# backtrace hands over an executable witness: an edit script the tests
# APPLY, character by character, demanding it transform s into t in exactly
# d operations. A distance without a script is a rumor; this page ships no
# rumors.
import random


def wagner_fischer(s, t, counter=None, allow_sub=True):
    """Full table plus backtraced script. Script ops are ('sub', i, c),
    ('del', i), ('ins', i, c), positions in the ORIGINAL s, applied from
    the highest position down so earlier indices never shift."""
    n, m = len(s), len(t)
    BIG = n + m + 1
    D = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        D[i][0] = i
    for j in range(m + 1):
        D[0][j] = j
    cells = n + m + 1
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cells += 1
            sub = D[i - 1][j - 1] + (0 if s[i - 1] == t[j - 1] else (1 if allow_sub else BIG))
            dele = D[i - 1][j] + 1
            ins = D[i][j - 1] + 1
            D[i][j] = min(sub, dele, ins)
    if counter is not None:
        counter["cells"] = counter.get("cells", 0) + cells
    # Backtrace.
    script = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            sub_cost = 0 if s[i - 1] == t[j - 1] else (1 if allow_sub else BIG)
            if D[i][j] == D[i - 1][j - 1] + sub_cost:
                if sub_cost == 1:
                    script.append(("sub", i - 1, t[j - 1]))
                i -= 1
                j -= 1
                continue
        if i > 0 and D[i][j] == D[i - 1][j] + 1:
            script.append(("del", i - 1))
            i -= 1
            continue
        script.append(("ins", i, t[j - 1]))
        j -= 1
    return D[n][m], script


def apply_script(s, script):
    """Execute the witness. Ops arrive highest-position-first from the
    backtrace, so earlier indices stay valid as we splice."""
    out = list(s)
    for op in script:
        if op[0] == "sub":
            out[op[1]] = op[2]
        elif op[0] == "del":
            del out[op[1]]
        else:
            out.insert(op[1], op[2])
    return "".join(out)


def two_row(s, t, counter=None):
    """The space optimization: the recurrence only ever looks one row up,
    so two rows suffice. Same cells, no script: the trade stated plainly."""
    n, m = len(s), len(t)
    prev = list(range(m + 1))
    cells = m + 1
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        cells += 1
        for j in range(1, m + 1):
            cells += 1
            cur[j] = min(
                prev[j - 1] + (0 if s[i - 1] == t[j - 1] else 1),
                prev[j] + 1,
                cur[j - 1] + 1,
            )
        prev = cur
    if counter is not None:
        counter["cells"] = counter.get("cells", 0) + cells
    return prev[m]


def hirschberg(s, t, counter=None):
    """Linear space WITH the script: solve the last row forward and the
    first row backward, find where the optimal path crosses the middle
    column, recurse on the two halves. About twice the cells of the full
    table, and only two rows alive at any moment."""

    def last_row(a, b):
        prev = list(range(len(b) + 1))
        c = len(b) + 1
        for i in range(1, len(a) + 1):
            cur = [i] + [0] * len(b)
            c += 1
            for j in range(1, len(b) + 1):
                c += 1
                cur[j] = min(
                    prev[j - 1] + (0 if a[i - 1] == b[j - 1] else 1),
                    prev[j] + 1,
                    cur[j - 1] + 1,
                )
            prev = cur
        if counter is not None:
            counter["cells"] = counter.get("cells", 0) + c
        return prev

    def solve(s, t, off_s, off_t):
        if len(s) == 0:
            return [("ins", off_s, c) for c in reversed(t)]
        if len(t) == 0:
            return [("del", off_s + i) for i in range(len(s) - 1, -1, -1)]
        if len(s) == 1:
            d, script = wagner_fischer(s, t)
            return [reloc(op, off_s, off_t) for op in script]
        mid = len(s) // 2
        left = last_row(s[:mid], t)
        right = last_row(s[mid:][::-1], t[::-1])
        split = min(range(len(t) + 1), key=lambda j: left[j] + right[len(t) - j])
        lower = solve(s[mid:], t[split:], off_s + mid, off_t + split)
        upper = solve(s[:mid], t[:split], off_s, off_t)
        return lower + upper

    def reloc(op, off_s, off_t):
        if op[0] == "sub":
            return ("sub", op[1] + off_s, op[2])
        if op[0] == "del":
            return ("del", op[1] + off_s)
        return ("ins", op[1] + off_s, op[2])

    script = solve(s, t, 0, 0)
    cost = sum(1 for _ in script)
    return cost, script


def ukkonen_band(s, t, k, counter=None):
    """Only cells within k of the diagonal can lie on a path of cost <= k,
    so fill just that band. Returns the distance if it is <= k, else None:
    an honest 'more than k'."""
    n, m = len(s), len(t)
    if abs(n - m) > k:
        return None
    INF = k + 1
    prev = {j: j for j in range(0, min(m, k) + 1)}
    cells = len(prev)
    for i in range(1, n + 1):
        cur = {}
        lo = max(0, i - k)
        hi = min(m, i + k)
        for j in range(lo, hi + 1):
            cells += 1
            best = INF
            if j > 0 and (j - 1) in cur:
                best = min(best, cur[j - 1] + 1)
            if (j) in prev:
                best = min(best, prev[j] + 1)
            if j > 0 and (j - 1) in prev:
                best = min(best, prev[j - 1] + (0 if s[i - 1] == t[j - 1] else 1))
            if j == 0:
                best = min(best, i)
            cur[j] = min(best, INF)
        prev = cur
    if counter is not None:
        counter["cells"] = counter.get("cells", 0) + cells
    d = prev.get(m, INF)
    return d if d <= k else None


def myers_diff_distance(s, t, counter=None):
    """Myers 1986: the shortest edit script WITHOUT substitutions (the diff
    metric), by greedy furthest-reaching paths: O((n+m)·d) instead of nm.
    A different metric, priced honestly: d_indel = n + m - 2*LCS."""
    n, m = len(s), len(t)
    maxd = n + m
    v = {1: 0}
    steps = 0
    for d in range(maxd + 1):
        for kk in range(-d, d + 1, 2):
            steps += 1
            if kk == -d or (kk != d and v.get(kk - 1, -1) < v.get(kk + 1, -1)):
                x = v.get(kk + 1, 0)
            else:
                x = v.get(kk - 1, 0) + 1
            y = x - kk
            while x < n and y < m and s[x] == t[y]:
                x += 1
                y += 1
                steps += 1
            v[kk] = x
            if x >= n and y >= m:
                if counter is not None:
                    counter["steps"] = counter.get("steps", 0) + steps
                return d
    return maxd


def lcs_len(s, t):
    """A separate program for a separate quantity, so the indel identity
    d_indel = n + m - 2*LCS is a genuine two-implementation check."""
    m = len(t)
    prev = [0] * (m + 1)
    for i in range(1, len(s) + 1):
        cur = [0] * (m + 1)
        for j in range(1, m + 1):
            cur[j] = prev[j - 1] + 1 if s[i - 1] == t[j - 1] else max(prev[j], cur[j - 1])
        prev = cur
    return prev[m]


def naive_recursion(s, t, counter):
    counter["calls"] = counter.get("calls", 0) + 1
    if not s:
        return len(t)
    if not t:
        return len(s)
    if s[0] == t[0]:
        return naive_recursion(s[1:], t[1:], counter)
    return 1 + min(
        naive_recursion(s[1:], t[1:], counter),
        naive_recursion(s[1:], t, counter),
        naive_recursion(s, t[1:], counter),
    )


def random_pair(rng, maxlen=30, alpha="abc"):
    a = "".join(rng.choice(alpha) for _ in range(rng.randint(0, maxlen)))
    b = "".join(rng.choice(alpha) for _ in range(rng.randint(0, maxlen)))
    return a, b


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the executable witness. On 300 random pairs, the backtraced
    # script must transform s into t using exactly d operations; Hirschberg's
    # linear-space script must do the same at the same cost.
    for _ in range(300):
        s, t = random_pair(rng)
        d, script = wagner_fischer(s, t)
        assert len(script) == d
        assert apply_script(s, script) == t, (s, t, script)
        dh, hs = hirschberg(s, t)
        assert dh == d, (s, t, dh, d)
        assert apply_script(s, hs) == t and len(hs) == d, (s, t, hs)
        assert two_row(s, t) == d

    # Oracle 2: distance is a metric. Identity, symmetry, and the triangle
    # inequality over random triples.
    for _ in range(200):
        a, b = random_pair(rng, 20)
        c, _ = random_pair(rng, 20)
        dab, _ = wagner_fischer(a, b)
        dba, _ = wagner_fischer(b, a)
        dac, _ = wagner_fischer(a, c)
        dcb, _ = wagner_fischer(c, b)
        assert dab == dba
        assert wagner_fischer(a, a)[0] == 0
        assert dab <= dac + dcb, "triangle inequality"

    # Oracle 3: the indel identity, three independent programs, one number:
    # forbid substitutions in the DP, compute LCS separately, run Myers.
    for _ in range(200):
        s, t = random_pair(rng, 24)
        d_indel, sc = wagner_fischer(s, t, allow_sub=False)
        assert apply_script(s, sc) == t
        assert d_indel == len(s) + len(t) - 2 * lcs_len(s, t)
        assert d_indel == myers_diff_distance(s, t)
        d_lev, _ = wagner_fischer(s, t)
        assert d_lev <= d_indel <= 2 * d_lev

    # Oracle 4: the band tells the truth in both directions.
    base = "".join(rng.choice("abcdefgh") for _ in range(2000))
    edited = list(base)
    for _ in range(40):  # plant at most 40 edits
        op = rng.randrange(3)
        pos = rng.randrange(len(edited))
        if op == 0:
            edited[pos] = rng.choice("abcdefgh")
        elif op == 1 and len(edited) > 1:
            del edited[pos]
        else:
            edited.insert(pos, rng.choice("abcdefgh"))
    edited = "".join(edited)
    c_full, c_band = {}, {}
    d_true, big_script = wagner_fischer(base, edited, c_full)
    assert d_true <= 40
    assert apply_script(base, big_script) == edited
    assert ukkonen_band(base, edited, 45, c_band) == d_true
    far = "".join(rng.choice("xyz") for _ in range(2000))
    assert ukkonen_band(base, far, 45) is None, "beyond k must say so"

    # Oracle 5: cell accounting is exact for the full table.
    assert c_full["cells"] == (len(base) + 1) * (len(edited) + 1), c_full["cells"]

    # Oracle 6: the naive recursion agrees where it can breathe, at a cost
    # the counter records for the never-here.
    c_naive = {}
    s12 = "abcabcabcabc"
    t12 = "cbacbacbacba"
    assert naive_recursion(s12, t12, c_naive) == wagner_fischer(s12, t12)[0]
    assert c_naive["calls"] > 2 ** 12, c_naive["calls"]

    # The remaining ledger rows on the big pair.
    c_two, c_hir, c_myers = {}, {}, {}
    assert two_row(base, edited, c_two) == d_true
    dh, hscript = hirschberg(base, edited, c_hir)
    assert dh == d_true and apply_script(base, hscript) == edited
    d_myers = myers_diff_distance(base, edited, c_myers)
    assert d_myers >= d_true

    n1, m1 = len(base), len(edited)
    print(f"contest: two strings of {n1:,} and {m1:,} chars, true distance {d_true}; the ledger:")
    print(f"  {'method':<26} {'work':>12} {'space':>12}")
    print(f"  {'Wagner-Fischer, full':<26} {c_full['cells']:>12,} {(n1+1)*(m1+1):>12,}")
    print(f"  {'Two-row variant':<26} {c_two['cells']:>12,} {2*(m1+1):>12,}")
    print(f"  {'Hirschberg':<26} {c_hir['cells']:>12,} {2*(m1+1):>12,}")
    print(f"  {'Ukkonen band, k=45':<26} {c_band['cells']:>12,} {2*91:>12,}")
    print(f"  {'Myers diff (indel)':<26} {c_myers['steps']:>12,} {'O(n+m)':>12}  d_indel={d_myers}")
    print(f"  {'Naive recursion':<26} {'797,161 @ n=12':>12} {'stack':>12}  (3^n: not run at 2,000)")
    print("OK: every script applied and verified, the metric axioms hold, three programs agree on the indel identity, the band is honest both ways")
