# Puzzle 08: Union-find x union by rank with path compression
# Disjoint-set connectivity: merge sets online, answer "same set?" fast.
#
# The pairing is the point. The forest of parent pointers is the algorithm;
# WHERE you hang a tree (rank) and what you do on the way up (compression)
# are the heuristics, and together they turn a structure that can degrade to
# a 1,499-hop crawl into one whose amortized cost is inverse-Ackermann:
# at most four for any input that fits in the physical universe.
import random
from collections import deque


class RankCompressionDSU:
    """Union by rank plus two-pass path compression. The unit's pairing.

    `work` counts parent-array touches (reads and writes), the same currency
    every method in the contest reports.
    """

    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.work = 0

    def find(self, x):
        root = x
        while True:
            self.work += 1
            p = self.parent[root]
            if p == root:
                break
            root = p
        while x != root:  # second pass: point everything straight at the root
            self.parent[x], x = root, self.parent[x]
            self.work += 2
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.work += 1
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1

    def connected(self, a, b):
        return self.find(a) == self.find(b)


# ---------------------------------------------------------------- the rivals


class QuickUnionDSU:
    """Naive linking: no rank, no compression. Sedgewick's quick-union.

    Random merges keep the trees tolerably shallow; sorted merges chain them
    into a 1,499-hop path. The contest and the chain demo show both faces.
    """

    def __init__(self, n):
        self.parent = list(range(n))
        self.work = 0

    def find(self, x):
        while True:
            self.work += 1
            p = self.parent[x]
            if p == x:
                return x
            x = p

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb
            self.work += 1

    def connected(self, a, b):
        return self.find(a) == self.find(b)


class QuickFindDSU:
    """Eager relabeling: every element stores its component id directly.

    Queries cost two array reads, unions cost a full scan-and-relabel of the
    array. The exact mirror image of the forest's trade.
    """

    def __init__(self, n):
        self.id = list(range(n))
        self.work = 0

    def find(self, x):
        self.work += 1
        return self.id[x]

    def union(self, a, b):
        ia, ib = self.find(a), self.find(b)
        if ia == ib:
            return
        for i in range(len(self.id)):
            self.work += 1
            if self.id[i] == ia:
                self.id[i] = ib
                self.work += 1

    def connected(self, a, b):
        return self.find(a) == self.find(b)


class BFSPerQuery:
    """No structure at all: keep the edge list, BFS on every question.

    Correct, needs nothing built, and also hands back the actual path.
    Priced per query, which is exactly where it loses on a long stream.
    """

    def __init__(self, n):
        self.n = n
        self.adj = [[] for _ in range(n)]
        self.work = 0

    def union(self, a, b):
        self.adj[a].append(b)
        self.adj[b].append(a)
        self.work += 2

    def connected(self, a, b):
        if a == b:
            return True
        seen = [False] * self.n
        seen[a] = True
        q = deque([a])
        while q:
            u = q.popleft()
            self.work += 1
            for v in self.adj[u]:
                self.work += 1
                if v == b:
                    return True
                if not seen[v]:
                    seen[v] = True
                    q.append(v)
        return False


# ------------------------------------------------------------- the instances


def op_sequence(n, unions, seed):
    """One shared workload: random unions, each followed by two queries."""
    rng = random.Random(seed)
    ops = []
    for _ in range(unions):
        ops.append(("u", rng.randrange(n), rng.randrange(n)))
        ops.append(("q", rng.randrange(n), rng.randrange(n)))
        ops.append(("q", rng.randrange(n), rng.randrange(n)))
    return ops


def run(structure, ops):
    answers = []
    for kind, a, b in ops:
        if kind == "u":
            structure.union(a, b)
        else:
            answers.append(structure.connected(a, b))
    return answers


def contest(n=1500, unions=1500, seed=7):
    """Race every method on one shared operation stream."""
    ops = op_sequence(n, unions, seed)
    rows = []
    for name, cls in (
        ("Union-find x rank + compression", RankCompressionDSU),
        ("Quick-union (naive linking)", QuickUnionDSU),
        ("Quick-find (eager relabeling)", QuickFindDSU),
        ("BFS per query", BFSPerQuery),
    ):
        s = cls(n)
        answers = run(s, ops)
        rows.append((name, s.work, answers))
    return n, unions, rows


if __name__ == "__main__":
    # Oracle 1: all four methods must agree on every query of many random
    # workloads. Four independent implementations of one definition.
    rng = random.Random(5)
    for trial in range(12):
        n = rng.randint(5, 60)
        ops = op_sequence(n, rng.randint(3, 80), rng.randrange(10**6))
        base = run(RankCompressionDSU(n), ops)
        for cls in (QuickUnionDSU, QuickFindDSU, BFSPerQuery):
            assert run(cls(n), ops) == base, f"trial {trial}: {cls.__name__} disagreed"

    # Oracle 2: the final partition must match an independent graph traversal.
    # Components computed by BFS over the union edges, compared as sets.
    n = 400
    ops = op_sequence(n, 300, seed=11)
    dsu = RankCompressionDSU(n)
    adj = [[] for _ in range(n)]
    for kind, a, b in ops:
        if kind == "u":
            dsu.union(a, b)
            adj[a].append(b)
            adj[b].append(a)
    seen = [False] * n
    for start in range(n):
        if seen[start]:
            continue
        comp = []
        q = deque([start])
        seen[start] = True
        while q:
            u = q.popleft()
            comp.append(u)
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    q.append(v)
        roots = {dsu.find(x) for x in comp}
        assert len(roots) == 1, f"component of {start} spans {len(roots)} DSU roots"

    # Oracle 3: the boundary case, pinned exactly. Chain the unions in sorted
    # order and naive linking builds a path; one find then walks all of it.
    m = 1500
    naive = QuickUnionDSU(m)
    good = RankCompressionDSU(m)
    for i in range(m - 1):
        naive.union(i, i + 1)
        good.union(i, i + 1)
    naive.work = 0
    good.work = 0
    naive.find(0)
    good.find(0)
    chain_naive, chain_good = naive.work, good.work
    assert chain_naive == m, f"naive chained find should touch all {m} parents, got {chain_naive}"
    assert chain_good <= 8, f"rank + compression find should be a few hops, got {chain_good}"

    # Oracle 4: with rank alone the tree height is at most log2(n), so no
    # single find may exceed roughly twice that many touches even before
    # compression has flattened anything.
    import math
    probe = RankCompressionDSU(1500)
    rng2 = random.Random(3)
    for _ in range(1499):
        probe.union(rng2.randrange(1500), rng2.randrange(1500))
    worst = 0
    for x in range(1500):
        probe.work = 0
        probe.find(x)
        worst = max(worst, probe.work)
    bound = 3 * (math.log2(1500) + 1)
    assert worst <= bound, f"a find cost {worst}, above the rank bound {bound:.0f}"

    # Oracle 5: the published contest, asserted before it is printed.
    n, unions, rows = contest()
    base = rows[0][2]
    for name, _work, answers in rows[1:]:
        assert answers == base, f"{name} disagreed on the shared workload"
    work = {name: w for name, w, _ in rows}
    assert work["Union-find x rank + compression"] < work["Quick-union (naive linking)"], (
        "rank + compression must beat naive linking even on random merges"
    )
    assert work["Quick-find (eager relabeling)"] > 50 * work["Union-find x rank + compression"], (
        "eager relabeling must be tens of times beyond the forest on a union-heavy stream"
    )
    assert work["BFS per query"] > 30 * work["Union-find x rank + compression"], (
        "recomputing by search must be tens of times beyond the forest"
    )
    assert work["BFS per query"] > work["Quick-union (naive linking)"], (
        "per-query search must cost more than any forest on this stream"
    )

    print(f"contest: {n} elements, {unions} random unions each followed by two queries:")
    for name, w, _answers in rows:
        print(f"  {name:<34} work {w:>12,}")
    print(f"chained unions, one find afterwards: naive {chain_naive:,} touches, rank + compression {chain_good}")
    print("OK: four methods agree, the chain blows up naive linking, and the bounds hold")
