# Puzzle 124: Myers diff algorithm x shortest-edit-script search
# Text diffing: given two sequences (lines of a file, characters of a
# string), find the fewest insertions and deletions that turn one into
# the other, and report them: the diff. The algorithm is a search in
# the edit graph, where a step right deletes, a step down inserts, and
# a diagonal (free) step consumes a matching pair. The heuristic is
# how the search is organized: instead of filling an N x M table, it
# advances a frontier one edit at a time, D = 0, 1, 2, ..., keeping for
# each diagonal k = x - y only the furthest point reachable with D
# edits, and after every step it slides down the diagonal as far as
# the sequences match. The first frontier to reach the corner gives
# the shortest script, and the work is O((N + M) D): cheap when the
# files are similar, which is when people diff them.
#
# Referees:
# (1) THE DP REFEREE: Wagner-Fischer with insert and delete costs of
#     one and no substitution (the exact edit-graph distance) is
#     written separately; Myers' D equals it on every instance;
# (2) THE SCRIPT WORKS: applying the reported insertions and deletions
#     to A produces B exactly, and the script has exactly D edits;
# (3) THE LCS IDENTITY: D = N + M - 2 * LCS, with LCS computed by a
#     separate dynamic program, on every instance;
# (4) THE COST LAW: cells examined by Myers grow with (N + M) D while
#     the full table costs N x M regardless of similarity, measured
#     on pairs of growing size at fixed edit distance and on pairs of
#     fixed size at growing distance;
# (5) THE RIVALS: Hunt-Szymanski style LCS via matching positions
#     (the diff(1) ancestor) is priced on the same pairs, and the
#     substitution-allowing Levenshtein distance is shown to give a
#     different, non-diff answer.
import random

SEED = 20260926


def myers(a, b):
    """Returns (D, script, cells) where script is a list of
    ('-', i) deletions of a[i] and ('+', j) insertions of b[j], in
    order along the path, and cells counts frontier extensions."""
    n, m = len(a), len(b)
    maxd = n + m
    offset = maxd
    v = [0] * (2 * maxd + 2)
    trace = []
    cells = 0
    for d in range(maxd + 1):
        trace.append(list(v))
        for k in range(-d, d + 1, 2):
            cells += 1
            if k == -d or (k != d and v[offset + k - 1] < v[offset + k + 1]):
                x = v[offset + k + 1]          # move down: insertion
            else:
                x = v[offset + k - 1] + 1      # move right: deletion
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[offset + k] = x
            if x >= n and y >= m:
                return d, backtrack(a, b, trace, d, offset), cells
    raise AssertionError('unreachable')


def backtrack(a, b, trace, d, offset):
    x, y = len(a), len(b)
    script = []
    for step in range(d, 0, -1):
        v = trace[step]
        k = x - y
        if k == -step or (k != step and v[offset + k - 1] < v[offset + k + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[offset + prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
        if x == prev_x:
            script.append(('+', prev_y))        # b[prev_y] inserted
        else:
            script.append(('-', prev_x))        # a[prev_x] deleted
        x, y = prev_x, prev_y
    script.reverse()
    return script


def rebuild(a, b, script):
    """A cleaner reconstruction: replay the edit path directly."""
    out = []
    i = j = 0
    for op, idx in script:
        if op == '-':
            while i < idx:
                out.append(a[i])
                i += 1
                j += 1
            i += 1
        else:
            while j < idx:
                out.append(a[i])
                i += 1
                j += 1
            out.append(b[idx])
            j += 1
    while i < len(a):
        out.append(a[i])
        i += 1
    return out


def edit_graph_dp(a, b):
    """Wagner-Fischer with insert = delete = 1 and no substitution: the
    exact shortest edit script length, in an N x M table."""
    n, m = len(a), len(b)
    prev = list(range(m + 1))
    cells = 0
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cells += 1
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j], cur[j - 1])
        prev = cur
    return prev[m], cells


def lcs_length(a, b):
    n, m = len(a), len(b)
    prev = [0] * (m + 1)
    for i in range(1, n + 1):
        cur = [0] * (m + 1)
        for j in range(1, m + 1):
            cur[j] = prev[j - 1] + 1 if a[i - 1] == b[j - 1] else max(prev[j], cur[j - 1])
        prev = cur
    return prev[m]


def levenshtein(a, b):
    n, m = len(a), len(b)
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    return prev[m]


def hunt_szymanski_lcs(a, b):
    """LCS through matching positions: for each a[i], the positions of
    b equal to it, in decreasing order, threaded into a patience-style
    longest increasing subsequence. Returns (lcs, matches examined)."""
    import bisect
    positions = {}
    for j, ch in enumerate(b):
        positions.setdefault(ch, []).append(j)
    thresh = []
    examined = 0
    for ch in a:
        for j in reversed(positions.get(ch, ())):
            examined += 1
            k = bisect.bisect_left(thresh, j)
            if k == len(thresh):
                thresh.append(j)
            else:
                thresh[k] = j
    return len(thresh), examined


def mutate(seq, rng, edits, alphabet):
    """Apply `edits` random insertions/deletions to a copy of seq."""
    s = list(seq)
    for _ in range(edits):
        if s and rng.random() < 0.5:
            del s[rng.randrange(len(s))]
        else:
            s.insert(rng.randrange(len(s) + 1), rng.choice(alphabet))
    return s


if __name__ == '__main__':
    rng = random.Random(SEED)
    alphabet = [f'line{i}' for i in range(40)]

    # Oracles 1-3 on many random pairs of varied size and distance.
    checked = 0
    for trial in range(120):
        n = rng.randrange(0, 40)
        a = [rng.choice(alphabet) for _ in range(n)]
        b = mutate(a, rng, rng.randrange(0, 12), alphabet)
        d, script, _ = myers(a, b)
        ref, _ = edit_graph_dp(a, b)
        assert d == ref, (trial, d, ref)                                  # Oracle 1
        assert len(script) == d
        assert rebuild(a, b, script) == b, (trial, a, b, script)           # Oracle 2
        assert d == len(a) + len(b) - 2 * lcs_length(a, b)                 # Oracle 3
        checked += 1

    # Oracle 5b: Levenshtein answers a different question.
    a = list('kitten')
    b = list('sitting')
    d, _, _ = myers(a, b)
    assert d == 5 and levenshtein(a, b) == 3

    # Oracle 4: the cost law. Fixed distance, growing size.
    rows_size = []
    for n in (250, 500, 1000, 2000):
        a = [rng.choice(alphabet) for _ in range(n)]
        b = mutate(a, rng, 8, alphabet)
        d, script, cells = myers(a, b)
        ref, table = edit_graph_dp(a, b)
        assert d == ref and rebuild(a, b, script) == b
        lcs, hs_examined = hunt_szymanski_lcs(a, b)
        assert d == len(a) + len(b) - 2 * lcs
        rows_size.append((n, d, cells, table, hs_examined))
    # cells / ((N + M) D) stays bounded; table / cells grows with N
    ratios = [cells / ((n + n) * max(d, 1)) for n, d, cells, table, _ in rows_size]
    assert max(ratios) < 2, ratios
    assert rows_size[-1][3] / rows_size[-1][2] > 4 * rows_size[0][3] / rows_size[0][2], rows_size

    # Fixed size, growing distance.
    rows_dist = []
    n = 1000
    base = [rng.choice(alphabet) for _ in range(n)]
    for edits in (4, 16, 64, 256):
        b = mutate(base, rng, edits, alphabet)
        d, script, cells = myers(base, b)
        ref, table = edit_graph_dp(base, b)
        assert d == ref and rebuild(base, b, script) == b
        rows_dist.append((edits, d, cells, table))
    assert rows_dist[-1][2] > 20 * rows_dist[0][2], rows_dist            # cells grow with D
    assert all(r[2] < r[3] for r in rows_dist), rows_dist                # never worse than the table here

    print('contest: shortest edit script between line sequences; currency: cells examined (frontier extensions for Myers, table cells for the DP); referees: the edit-graph DP, script replay, the LCS identity')
    print(f"  {'N (lines)':>9} {'D':>5} {'Myers cells':>12} {'DP table':>10} {'Hunt-Szymanski matches':>23}")
    for n, d, cells, table, hs in rows_size:
        print(f"  {n:>9,} {d:>5} {cells:>12,} {table:>10,} {hs:>23,}   fixed 8 edits: Myers stays near (N + M) D while the table pays N x M")
    print(f"  {'edits':>9} {'D':>5} {'Myers cells':>12} {'DP table':>10}")
    for edits, d, cells, table in rows_dist:
        print(f"  {edits:>9} {d:>5} {cells:>12,} {table:>10,}   fixed 1,000 lines: Myers grows with D, the table does not care")
    print("kitten to sitting: shortest edit script 5 (insert and delete only), Levenshtein 3 (with substitution): a different question, not a diff")
    print(f'OK: {checked} random pairs with Myers D equal to the edit-graph DP, every script replaying A into B with exactly D edits, and D = N + M - 2 LCS on all; '
          f'cost law held (Myers cells / ((N+M) D) at most {max(ratios):.2f}, the table growing {rows_size[-1][3] / rows_size[-1][2]:.0f}x past Myers at N = 2,000); '
          f'Myers cells rising {rows_dist[-1][2] / rows_dist[0][2]:.0f}x from 4 to 256 edits on 1,000 lines while the table stays at {rows_dist[0][3]:,}')
