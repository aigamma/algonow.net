# Puzzle 118: Knuth's Algorithm X x dancing links
# Exact cover: given a 0/1 matrix, choose a set of rows so that every
# column has exactly one 1. N-queens, sudoku, pentomino tilings, and
# every "each thing used exactly once" puzzle are this matrix. The
# algorithm is Knuth's Algorithm X: pick a column, try each row that
# covers it, remove every column that row satisfies and every row that
# would now collide, recurse, restore, next row. The heuristic pair is
# what makes it fast: DANCING LINKS, the circular doubly linked lists
# whose nodes unlink themselves in two pointer writes and relink
# themselves in two more (x.left.right = x; x.right.left = x), so
# backtracking costs exactly what the forward step cost and nothing is
# ever copied; and Knuth's S heuristic, always branching on the column
# with the fewest candidate rows.
#
# Referees:
# (1) COUNTS AGAINST INDEPENDENT ORACLES: the number of N-queens
#     solutions found by the exact-cover solver equals the count from
#     a plain row-by-row backtracking counter written separately, and
#     equals the published sequence (92 for 8, 724 for 10);
# (2) SUDOKU: the exact-cover solution satisfies every row, column,
#     and box constraint, is unique (the solver counts exactly one),
#     and equals the grid found by an independent cell-by-cell
#     backtracking solver;
# (3) PENTOMINOES on a 3 x 20 board: the solver counts 8 tilings, which
#     is the published 2 distinct tilings times the 4 symmetries of the
#     rectangle, every tiling verified to cover all 60 cells once;
# (4) THE STRUCTURE IS RESTORED: after every complete search, every
#     link of the dancing-links matrix is back where it started,
#     checked node by node against a snapshot (the cover/uncover
#     discipline proven, not assumed);
# (5) THE ABLATIONS: the same solver branching on the first live
#     column instead of the smallest visits far more nodes (measured),
#     and a matrix-copying backtracker with the same branching rule
#     does about the same work on a toy (8-queens, 64 rows) and
#     thirty times the work on a sudoku (561 rows): the undo bill grows
#     with the matrix for copying and with the work for dancing links.
import sys

sys.setrecursionlimit(10000)


class Node:
    __slots__ = ('L', 'R', 'U', 'D', 'C', 'row', 'size', 'name')

    def __init__(self):
        self.L = self.R = self.U = self.D = self.C = self
        self.row = -1
        self.size = 0
        self.name = None


class DLX:
    """Knuth's Algorithm X on dancing links. Columns named in `primary`
    must be covered exactly once; columns in `secondary` at most once
    (they hang off no header ring, so they are never chosen)."""

    def __init__(self, primary, secondary=()):
        self.root = Node()
        self.cols = {}
        prev = self.root
        for name in primary:
            c = Node()
            c.name = name
            c.L = prev
            c.R = prev.R
            prev.R.L = c
            prev.R = c
            prev = c
            self.cols[name] = c
        for name in secondary:
            c = Node()
            c.name = name
            self.cols[name] = c
        self.rows = []
        self.links = 0

    def add_row(self, names):
        first = None
        for name in names:
            c = self.cols[name]
            x = Node()
            x.C = c
            x.row = len(self.rows)
            x.U = c.U
            x.D = c
            c.U.D = x
            c.U = x
            c.size += 1
            if first is None:
                first = x
            else:
                x.L = first.L
                x.R = first
                first.L.R = x
                first.L = x
        self.rows.append(list(names))

    def cover(self, c):
        c.R.L = c.L
        c.L.R = c.R
        self.links += 2
        i = c.D
        while i is not c:
            j = i.R
            while j is not i:
                j.D.U = j.U
                j.U.D = j.D
                j.C.size -= 1
                self.links += 2
                j = j.R
            i = i.D

    def uncover(self, c):
        i = c.U
        while i is not c:
            j = i.L
            while j is not i:
                j.C.size += 1
                j.D.U = j
                j.U.D = j
                self.links += 2
                j = j.L
            i = i.U
        c.R.L = c
        c.L.R = c
        self.links += 2

    def choose(self, smallest):
        if not smallest:
            return self.root.R
        best = None
        c = self.root.R
        while c is not self.root:
            if best is None or c.size < best.size:
                best = c
            c = c.R
        return best

    def search(self, on_solution, smallest=True, limit=None, node_limit=None):
        """Returns (solutions, nodes). on_solution(rows) may return False
        to stop the search; node_limit stops it after that many nodes
        (the links are still fully restored on the way out)."""
        self.nodes = 0
        self.solutions = 0
        self.stopped = False
        self._limit = limit
        self._node_limit = node_limit
        self._sol = []
        self._on = on_solution
        self._smallest = smallest
        self._search()
        return self.solutions, self.nodes

    def _search(self):
        if self.stopped:
            return
        if self.root.R is self.root:
            self.solutions += 1
            if self._on(list(self._sol)) is False or (self._limit and self.solutions >= self._limit):
                self.stopped = True
            return
        c = self.choose(self._smallest)
        if c.size == 0:
            return
        self.cover(c)
        r = c.D
        while r is not c and not self.stopped:
            self.nodes += 1
            if self._node_limit and self.nodes > self._node_limit:
                self.stopped = True
                break
            self._sol.append(r.row)
            j = r.R
            while j is not r:
                self.cover(j.C)
                j = j.R
            self._search()
            j = r.L
            while j is not r:
                self.uncover(j.C)
                j = j.L
            self._sol.pop()
            r = r.D
        self.uncover(c)

    def snapshot(self):
        """Every link of every node, for the restoration oracle."""
        out = []
        c = self.root
        ids = {}

        def ident(n):
            if id(n) not in ids:
                ids[id(n)] = len(ids)
            return ids[id(n)]

        for col in [self.root] + list(self.cols.values()):
            out.append((ident(col), ident(col.L), ident(col.R), ident(col.U), ident(col.D), col.size))
            x = col.D
            while x is not col:
                out.append((ident(x), ident(x.L), ident(x.R), ident(x.U), ident(x.D), x.row))
                x = x.D
        return out


# ---------------------------------------------------------- instances
def queens_rows(n):
    """Exact cover for N-queens: primary columns rank r and file f (each
    exactly once), secondary columns for the two diagonal families
    (at most once)."""
    primary = [f'r{i}' for i in range(n)] + [f'f{i}' for i in range(n)]
    secondary = [f'a{i}' for i in range(2 * n - 1)] + [f'b{i}' for i in range(2 * n - 1)]
    rows = []
    for r in range(n):
        for f in range(n):
            rows.append([f'r{r}', f'f{f}', f'a{r + f}', f'b{r - f + n - 1}'])
    return primary, secondary, rows


def queens_backtrack_count(n):
    """The independent referee: plain row-by-row backtracking."""
    count = 0
    cols = set()
    d1 = set()
    d2 = set()

    def place(r):
        nonlocal count
        if r == n:
            count += 1
            return
        for f in range(n):
            if f in cols or (r + f) in d1 or (r - f) in d2:
                continue
            cols.add(f)
            d1.add(r + f)
            d2.add(r - f)
            place(r + 1)
            cols.remove(f)
            d1.discard(r + f)
            d2.discard(r - f)

    place(0)
    return count


SUDOKU = (
    '8........'
    '..36.....'
    '.7..9.2..'
    '.5...7...'
    '....457..'
    '...1...3.'
    '..1....68'
    '..85...1.'
    '.9....4..'
)


def sudoku_rows(grid):
    primary = ([f'c{i}' for i in range(81)] + [f'r{r}{d}' for r in range(9) for d in range(1, 10)]
               + [f'k{c}{d}' for c in range(9) for d in range(1, 10)] + [f'b{b}{d}' for b in range(9) for d in range(1, 10)])
    rows = []
    meta = []
    for i in range(81):
        r, c = divmod(i, 9)
        b = (r // 3) * 3 + c // 3
        given = grid[i]
        for d in range(1, 10):
            if given != '.' and int(given) != d:
                continue
            rows.append([f'c{i}', f'r{r}{d}', f'k{c}{d}', f'b{b}{d}'])
            meta.append((i, d))
    return primary, rows, meta


def sudoku_backtrack(grid):
    """The independent referee: cell by cell, digit by digit."""
    g = [int(ch) if ch != '.' else 0 for ch in grid]

    def ok(i, d):
        r, c = divmod(i, 9)
        for k in range(9):
            if g[r * 9 + k] == d or g[k * 9 + c] == d:
                return False
        br, bc = (r // 3) * 3, (c // 3) * 3
        for rr in range(br, br + 3):
            for cc in range(bc, bc + 3):
                if g[rr * 9 + cc] == d:
                    return False
        return True

    nodes = [0]

    def solve(i):
        while i < 81 and g[i]:
            i += 1
        if i == 81:
            return True
        for d in range(1, 10):
            if ok(i, d):
                nodes[0] += 1
                g[i] = d
                if solve(i + 1):
                    return True
                g[i] = 0
        return False

    assert solve(0)
    return g, nodes[0]


def sudoku_valid(g):
    for r in range(9):
        if sorted(g[r * 9:(r + 1) * 9]) != list(range(1, 10)):
            return False
    for c in range(9):
        if sorted(g[c::9]) != list(range(1, 10)):
            return False
    for b in range(9):
        br, bc = (b // 3) * 3, (b % 3) * 3
        cells = [g[(br + rr) * 9 + bc + cc] for rr in range(3) for cc in range(3)]
        if sorted(cells) != list(range(1, 10)):
            return False
    return True


PENTOMINOES = {
    'F': [(0, 1), (0, 2), (1, 0), (1, 1), (2, 1)],
    'I': [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)],
    'L': [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1)],
    'N': [(0, 1), (1, 1), (2, 0), (2, 1), (3, 0)],
    'P': [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0)],
    'T': [(0, 0), (0, 1), (0, 2), (1, 1), (2, 1)],
    'U': [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2)],
    'V': [(0, 0), (1, 0), (2, 0), (2, 1), (2, 2)],
    'W': [(0, 0), (1, 0), (1, 1), (2, 1), (2, 2)],
    'X': [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1)],
    'Y': [(0, 1), (1, 0), (1, 1), (2, 1), (3, 1)],
    'Z': [(0, 0), (0, 1), (1, 1), (2, 1), (2, 2)],
}


def orientations(cells):
    seen = set()
    out = []
    cur = list(cells)
    for _ in range(2):
        for _ in range(4):
            cur = [(c, -r) for r, c in cur]
            mr = min(r for r, c in cur)
            mc = min(c for r, c in cur)
            norm = tuple(sorted((r - mr, c - mc) for r, c in cur))
            if norm not in seen:
                seen.add(norm)
                out.append(norm)
        cur = [(r, -c) for r, c in cur]
    return out


def pentomino_rows(h, w):
    primary = list(PENTOMINOES.keys()) + [f'{r},{c}' for r in range(h) for c in range(w)]
    rows = []
    for name, cells in PENTOMINOES.items():
        for shape in orientations(cells):
            sh = max(r for r, c in shape) + 1
            sw = max(c for r, c in shape) + 1
            for r0 in range(h - sh + 1):
                for c0 in range(w - sw + 1):
                    rows.append([name] + [f'{r0 + r},{c0 + c}' for r, c in shape])
    return primary, rows


# --------------------------------------------- the copying backtracker
def copying_exact_cover(rows, primary, smallest=True):
    """Algorithm X without dancing links: sets of live rows and columns,
    copied at every branch. Columns not in `primary` are secondary (at
    most once): rows colliding on them are removed, but they are never
    chosen. Counts elementary operations (set element copies and
    membership tests) as the work currency."""
    work = [0]
    solutions = [0]
    row_cols = [frozenset(r) for r in rows]
    col_rows = {}
    for i, r in enumerate(row_cols):
        for c in r:
            col_rows.setdefault(c, set()).add(i)

    def search(live_rows, live_cols):
        if not live_cols:
            solutions[0] += 1
            return
        if smallest:
            c = min(sorted(live_cols), key=lambda col: len(col_rows[col] & live_rows))
            work[0] += sum(len(col_rows[col]) for col in live_cols)
        else:
            c = min(live_cols)
        cands = col_rows[c] & live_rows
        work[0] += len(col_rows[c])
        for r in sorted(cands):
            covered = row_cols[r]
            new_rows = {x for x in live_rows if not (row_cols[x] & covered)}
            work[0] += len(live_rows)
            new_cols = live_cols - covered
            work[0] += len(live_cols)
            search(new_rows, new_cols)

    search(set(range(len(rows))), set(primary))
    return solutions[0], work[0]


if __name__ == '__main__':
    # Oracle 1: N-queens counts.
    published = {8: 92, 10: 724}
    queens = {}
    for n in (8, 10):
        primary, secondary, rows = queens_rows(n)
        d = DLX(primary, secondary)
        for r in rows:
            d.add_row(r)
        before = d.snapshot()
        sols, nodes = d.search(lambda s: None)
        after = d.snapshot()
        assert after == before, 'dancing links did not restore themselves'   # Oracle 4
        assert sols == published[n] == queens_backtrack_count(n), (n, sols)
        links_min = d.links
        d.links = 0
        sols_first, nodes_first = d.search(lambda s: None, smallest=False)
        assert sols_first == sols
        assert d.snapshot() == before
        queens[n] = (sols, nodes, nodes_first, links_min)

    # Oracle 2: sudoku.
    primary, rows, meta = sudoku_rows(SUDOKU)
    d = DLX(primary)
    for r in rows:
        d.add_row(r)
    before = d.snapshot()
    found = []
    sols, nodes = d.search(lambda s: found.append(list(s)))
    assert sols == 1, sols
    assert d.snapshot() == before
    grid = [0] * 81
    for ri in found[0]:
        i, dgt = meta[ri]
        grid[i] = dgt
    assert sudoku_valid(grid)
    ref_grid, ref_nodes = sudoku_backtrack(SUDOKU)
    assert grid == ref_grid
    SUDOKU_CAP = 200_000
    sols_first, nodes_first = d.search(lambda s: None, smallest=False, node_limit=SUDOKU_CAP)
    assert d.snapshot() == before
    sudoku_stats = (nodes, nodes_first, ref_nodes, sols_first)

    # Oracle 3: pentominoes on 3 x 20 (published: 2 tilings up to symmetry,
    # so the raw count is 2 x 4 orientations of the rectangle).
    primary, rows = pentomino_rows(3, 20)
    d = DLX(primary)
    for r in rows:
        d.add_row(r)
    before = d.snapshot()
    tilings = [0]

    def check_tiling(sol):
        cells = [c for ri in sol for c in rows[ri][1:]]
        assert len(cells) == 60 and len(set(cells)) == 60
        tilings[0] += 1

    sols, nodes_pent = d.search(check_tiling)
    assert sols == 8 == tilings[0], sols
    assert d.snapshot() == before

    # Oracle 5b: the copying backtracker with the same branching rule on
    # three matrices of growing size. THE HONEST MEASUREMENT (the first
    # draft asserted a tenfold gap on 8-queens; the run refused it): on
    # the 64-row toy the two are at parity, and the gap opens with the
    # matrix, because copying pays for every live row at every node while
    # the links pay only for the rows the step actually touches.
    undo = []
    for n in (8, 10):
        pq, sq, rq = queens_rows(n)
        cs, cw = copying_exact_cover(rq, pq)
        assert cs == published[n]
        undo.append((f'{n}-queens', len(rq), queens[n][3], cw))
    primary_s, rows_s, _ = sudoku_rows(SUDOKU)
    d = DLX(primary_s)
    for r in rows_s:
        d.add_row(r)
    d.links = 0
    d.search(lambda s: None)
    cs, cw = copying_exact_cover(rows_s, primary_s)
    assert cs == 1
    undo.append(('sudoku', len(rows_s), d.links, cw))
    ratios = [cw / links for _, _, links, cw in undo]
    assert ratios[0] < ratios[1] < ratios[2] and ratios[2] > 10, ratios
    dlx_links, copy_work = undo[2][2], undo[2][3]

    q8, q10 = queens[8], queens[10]
    assert q10[2] > q10[1]
    # THE HONEST CAP: first-column branching on the sudoku did not finish
    # inside the node budget, so the row reads "unfinished", not a number
    # that was never measured.
    assert sudoku_stats[1] > SUDOKU_CAP and sudoku_stats[3] == 0, sudoku_stats

    print('contest: exact cover on the same instances: 8-queens (92 solutions), 10-queens (724), a hard sudoku (unique), pentominoes on 3 x 20 (8 tilings: the published 2 in 4 orientations); currency: search nodes, and pointer writes vs set copies for the undo')
    print(f"  {'solver':<44} {'8-queens':>9} {'10-queens':>10} {'sudoku':>8}")
    print(f"  {'Algorithm X + DLX, smallest column':<44} {q8[1]:>9,} {q10[1]:>10,} {sudoku_stats[0]:>8,}   nodes; undo in two pointer writes per link")
    print(f"  {'Algorithm X + DLX, first column':<44} {q8[2]:>9,} {q10[2]:>10,} {'>' + format(SUDOKU_CAP, ','):>8}   nodes; same answers on the queens, and the sudoku still unsolved at the cap")
    print(f"  {'cell-by-cell sudoku backtracking':<44} {'-':>9} {'-':>10} {sudoku_stats[2]:>8,}   nodes; the plain solver that ignores the matrix view")
    print("the undo bill, same branching rule, pointer writes (dancing links) vs elementary operations (copying sets at every node):")
    for label, nrows, links, cw in undo:
        print(f"  {label:<10} {nrows:>4} rows   links {links:>10,}   copying {cw:>10,}   {cw / links:>5.1f}x: parity on the toy, the gap grows with the matrix")
    print(f"pentominoes 3 x 20: {sols} tilings (the published 2, times 4 orientations) in {nodes_pent:,} nodes, every tiling covering all 60 cells exactly once; every search left every link exactly where it started")
    print(f'OK: queens counts {q8[0]} and {q10[0]} match the backtracking referee and the published sequence; sudoku unique and equal to the independent solver; 8 pentomino tilings of 3 x 20; '
          f'links restored after every search; smallest-column beats first-column ({q10[1]:,} vs {q10[2]:,} nodes on 10-queens, {sudoku_stats[0]:,} vs unfinished at {SUDOKU_CAP:,} on sudoku); '
          f'undo ratios {ratios[0]:.2f} < {ratios[1]:.2f} < {ratios[2]:.1f} (sudoku: dancing links {dlx_links:,} writes vs copying {copy_work:,} operations)')
