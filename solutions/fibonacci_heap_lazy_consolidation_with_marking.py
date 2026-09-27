# Puzzle 163: Fibonacci heap x Lazy consolidation with marking
# Amortized-optimal priority queue: insert, find-min, delete-min, and
# decrease-key, with decrease-key in constant amortized time, which is
# what makes Dijkstra run in O(m + n log n) instead of O(m log n). The
# algorithm is the Fibonacci heap (Fredman and Tarjan 1987): a forest
# of heap-ordered trees kept in a circular root list with a pointer to
# the minimum. The heuristic is laziness plus marking: insert just adds
# a one-node tree; decrease-key cuts the node from its parent and drops
# it into the root list; delete-min is the only operation that tidies,
# consolidating the root list by linking trees of equal degree until
# every degree appears at most once. Marks keep the trees fat: a node
# that loses a second child is cut from its own parent (a cascading
# cut), which is what guarantees that a node of degree k has at least
# F(k + 2) descendants, so the maximum degree is at most log base phi
# of n and delete-min stays logarithmic.
#
# Referees:
# (1) CORRECTNESS: a random workload of inserts, decrease-keys, and
#     delete-mins against a sorted reference; every delete-min must
#     return the reference minimum, for the Fibonacci heap, a binary
#     heap with a position map, and a pairing heap;
# (2) THE FIBONACCI PROPERTY: after the workload, every node of degree k
#     has a subtree of at least F(k + 2) nodes, and the maximum degree is
#     at most log base phi of n; the same heap with the marking rule
#     switched off (cut without cascading) is driven by an adversary that
#     strips grandchildren, and the property breaks, with the maximum
#     degree measured against the marking version on the same sequence;
# (3) THE AMORTIZED ACCOUNTING, measured: cuts per decrease-key (at most
#     two by the potential argument), links per delete-min against
#     log base two of n, and the total actual work against the sum of
#     the amortized bounds;
# (4) DIJKSTRA on a complete graph and on a sparse graph, distances
#     checked against an array-based O(n^2) Dijkstra, with decrease-key
#     counts, primitive-step counts, and wall time for the Fibonacci
#     heap, the binary heap with decrease-key, the pairing heap, and the
#     lazy binary heap that inserts duplicates instead of decreasing;
# (5) THE NEGATIVE EXAMPLE, measured: the Fibonacci heap's wall time in
#     this interpreter against the binary and pairing heaps, the
#     constant factors that keep it out of most production code.
import heapq
import math
import random
import time

SEED = 20260926
PHI = (1 + math.sqrt(5)) / 2


class FibNode:
    __slots__ = ('key', 'item', 'parent', 'child', 'left', 'right', 'degree', 'mark')

    def __init__(self, key, item):
        self.key = key
        self.item = item
        self.parent = None
        self.child = None
        self.left = self
        self.right = self
        self.degree = 0
        self.mark = False


class FibHeap:
    def __init__(self, cascade=True):
        self.min = None
        self.n = 0
        self.cascade = cascade
        self.links = 0
        self.cuts = 0
        self.cascading = 0
        self.marks = 0
        self.root_scans = 0

    @staticmethod
    def _splice(a, node):
        """Insert node into the circular list containing a, to the right of a."""
        node.left = a
        node.right = a.right
        a.right.left = node
        a.right = node

    @staticmethod
    def _unlink(node):
        node.left.right = node.right
        node.right.left = node.left
        node.left = node.right = node

    def insert(self, key, item=None):
        node = FibNode(key, item)
        if self.min is None:
            self.min = node
        else:
            self._splice(self.min, node)
            if key < self.min.key:
                self.min = node
        self.n += 1
        return node

    def find_min(self):
        return self.min

    def delete_min(self):
        z = self.min
        if z is None:
            return None
        if z.child is not None:
            children = []
            c = z.child
            while True:
                children.append(c)
                c = c.right
                if c is z.child:
                    break
            for c in children:
                self._unlink(c)
                c.parent = None
                c.mark = False
                self._splice(z, c)
            z.child = None
            z.degree = 0
        if z.right is z:
            self.min = None
        else:
            self.min = z.right
            self._unlink(z)
            self._consolidate()
        self.n -= 1
        return z

    def _consolidate(self):
        roots = []
        w = self.min
        while True:
            roots.append(w)
            w = w.right
            if w is self.min:
                break
        self.root_scans += len(roots)
        table = {}
        for x in roots:
            d = x.degree
            while d in table:
                y = table.pop(d)
                if y.key < x.key:
                    x, y = y, x
                self._link(y, x)
                d += 1
            table[d] = x
        self.min = None
        for x in table.values():
            x.left = x.right = x
            if self.min is None:
                self.min = x
            else:
                self._splice(self.min, x)
                if x.key < self.min.key:
                    self.min = x

    def _link(self, y, x):
        """Make root y a child of root x."""
        self._unlink(y)
        y.parent = x
        y.mark = False
        if x.child is None:
            x.child = y
        else:
            self._splice(x.child, y)
        x.degree += 1
        self.links += 1

    def decrease_key(self, node, key):
        if key > node.key:
            raise ValueError('new key is greater than the current key')
        node.key = key
        y = node.parent
        if y is not None and node.key < y.key:
            self._cut(node, y)
            self._cascading_cut(y)
        if node.key < self.min.key:
            self.min = node

    def _cut(self, x, y):
        if x.right is x:
            y.child = None
        else:
            if y.child is x:
                y.child = x.right
            self._unlink(x)
        y.degree -= 1
        x.parent = None
        x.mark = False
        self._splice(self.min, x)
        self.cuts += 1

    def _cascading_cut(self, y):
        if not self.cascade:
            return
        z = y.parent
        while z is not None:
            if not y.mark:
                y.mark = True
                self.marks += 1
                return
            self._cut(y, z)
            self.cascading += 1
            y, z = z, z.parent

    def delete(self, node):
        self.decrease_key(node, float('-inf'))
        return self.delete_min()

    def nodes(self):
        out = []

        def walk(start, parent):
            if start is None:
                return
            c = start
            while True:
                out.append((c, parent))
                walk(c.child, c)
                c = c.right
                if c is start:
                    break
        walk(self.min, None)
        return out

    def check_fibonacci_property(self):
        """Returns (violations, max_degree, n). A node of degree k must
        have at least F(k + 2) descendants including itself."""
        fib = [1, 1]
        while len(fib) < 200:
            fib.append(fib[-1] + fib[-2])

        sizes = {}

        def size(node):
            s = 1
            c = node.child
            if c is not None:
                start = c
                while True:
                    s += size(c)
                    c = c.right
                    if c is start:
                        break
            sizes[id(node)] = s
            return s

        violations = 0
        max_degree = 0
        total = 0
        for node, _ in self.nodes():
            total += 1
        for node, parent in self.nodes():
            if parent is None:
                size(node)
        for node, _ in self.nodes():
            max_degree = max(max_degree, node.degree)
            if sizes[id(node)] < fib[node.degree + 1]:
                violations += 1
        return violations, max_degree, total


class BinaryHeap:
    """A binary min-heap with a position map so decrease-key is O(log n)."""

    def __init__(self):
        self.a = []
        self.pos = {}
        self.steps = 0

    def __len__(self):
        return len(self.a)

    def insert(self, key, item):
        self.a.append([key, item])
        self.pos[item] = len(self.a) - 1
        self._up(len(self.a) - 1)

    def _swap(self, i, j):
        self.a[i], self.a[j] = self.a[j], self.a[i]
        self.pos[self.a[i][1]] = i
        self.pos[self.a[j][1]] = j
        self.steps += 1

    def _up(self, i):
        while i > 0:
            p = (i - 1) // 2
            if self.a[i][0] < self.a[p][0]:
                self._swap(i, p)
                i = p
            else:
                break

    def _down(self, i):
        n = len(self.a)
        while True:
            l, r, s = 2 * i + 1, 2 * i + 2, i
            if l < n and self.a[l][0] < self.a[s][0]:
                s = l
            if r < n and self.a[r][0] < self.a[s][0]:
                s = r
            if s == i:
                return
            self._swap(i, s)
            i = s

    def delete_min(self):
        top = self.a[0]
        last = self.a.pop()
        del self.pos[top[1]]
        if self.a:
            self.a[0] = last
            self.pos[last[1]] = 0
            self._down(0)
        return top

    def decrease_key(self, item, key):
        i = self.pos[item]
        self.a[i][0] = key
        self._up(i)


class PairNode:
    __slots__ = ('key', 'item', 'child', 'sibling', 'prev')

    def __init__(self, key, item):
        self.key = key
        self.item = item
        self.child = None
        self.sibling = None
        self.prev = None


class PairingHeap:
    """A two-pass pairing heap (Fredman, Sedgewick, Sleator, Tarjan 1986)."""

    def __init__(self):
        self.root = None
        self.n = 0
        self.links = 0

    def _link(self, a, b):
        self.links += 1
        if b.key < a.key:
            a, b = b, a
        b.prev = a
        b.sibling = a.child
        if a.child is not None:
            a.child.prev = b
        a.child = b
        return a

    def insert(self, key, item=None):
        node = PairNode(key, item)
        self.root = node if self.root is None else self._link(self.root, node)
        self.n += 1
        return node

    def find_min(self):
        return self.root

    def delete_min(self):
        z = self.root
        heads = []
        c = z.child
        while c is not None:
            nxt = c.sibling
            c.sibling = None
            c.prev = None
            heads.append(c)
            c = nxt
        paired = []
        for i in range(0, len(heads) - 1, 2):
            paired.append(self._link(heads[i], heads[i + 1]))
        if len(heads) % 2:
            paired.append(heads[-1])
        root = None
        for t in reversed(paired):
            root = t if root is None else self._link(t, root)
        self.root = root
        self.n -= 1
        return z

    def decrease_key(self, node, key):
        node.key = key
        if node is self.root:
            return
        # detach the subtree rooted at node
        if node.prev.child is node:
            node.prev.child = node.sibling
        else:
            node.prev.sibling = node.sibling
        if node.sibling is not None:
            node.sibling.prev = node.prev
        node.sibling = None
        node.prev = None
        self.root = self._link(self.root, node)


def fib_number(k):
    a, b = 1, 1
    for _ in range(k - 1):
        a, b = b, a + b
    return a


def dijkstra_array(n, adj, src):
    dist = [math.inf] * n
    done = [False] * n
    dist[src] = 0
    for _ in range(n):
        u = -1
        best = math.inf
        for v in range(n):
            if not done[v] and dist[v] < best:
                best = dist[v]
                u = v
        if u < 0:
            break
        done[u] = True
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist


def dijkstra_fib(n, adj, src):
    heap = FibHeap()
    dist = [math.inf] * n
    dist[src] = 0
    nodes = [heap.insert(dist[v], v) for v in range(n)]
    decreases = 0
    while heap.n:
        z = heap.delete_min()
        u = z.item
        nodes[u] = None
        for v, w in adj[u]:
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                heap.decrease_key(nodes[v], nd)
                decreases += 1
    return dist, decreases, heap.links + heap.cuts + heap.root_scans


def dijkstra_binary(n, adj, src):
    heap = BinaryHeap()
    dist = [math.inf] * n
    dist[src] = 0
    for v in range(n):
        heap.insert(dist[v], v)
    decreases = 0
    while len(heap):
        _, u = heap.delete_min()
        for v, w in adj[u]:
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                heap.decrease_key(v, nd)
                decreases += 1
    return dist, decreases, heap.steps


def dijkstra_pairing(n, adj, src):
    heap = PairingHeap()
    dist = [math.inf] * n
    dist[src] = 0
    nodes = [heap.insert(dist[v], v) for v in range(n)]
    decreases = 0
    while heap.n:
        z = heap.delete_min()
        u = z.item
        for v, w in adj[u]:
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                heap.decrease_key(nodes[v], nd)
                decreases += 1
    return dist, decreases, heap.links


def dijkstra_lazy(n, adj, src):
    dist = [math.inf] * n
    dist[src] = 0
    pq = [(0, src)]
    pushes = pops = 0
    while pq:
        d, u = heapq.heappop(pq)
        pops += 1
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
                pushes += 1
    return dist, pushes, pushes + pops


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: a random workload against a sorted reference.
    fh = FibHeap()
    bh = BinaryHeap()
    ph = PairingHeap()
    ref = []                         # sorted list of (key, id)
    live = {}                        # id -> key
    fnodes = {}
    pnodes = {}
    next_id = 0
    mismatches = 0
    ops = {'insert': 0, 'decrease': 0, 'delete_min': 0}
    for step in range(60000):
        r = rng.random()
        if not live or r < 0.45:
            key = rng.random() * 1000
            i = next_id
            next_id += 1
            live[i] = key
            fnodes[i] = fh.insert(key, i)
            bh.insert(key, i)
            pnodes[i] = ph.insert(key, i)
            ref.append((key, i))
            ops['insert'] += 1
        elif r < 0.8:
            i = rng.choice(list(live))
            key = live[i] - rng.random() * 100
            ref.remove((live[i], i))
            live[i] = key
            ref.append((key, i))
            fh.decrease_key(fnodes[i], key)
            bh.decrease_key(i, key)
            ph.decrease_key(pnodes[i], key)
            ops['decrease'] += 1
        else:
            kmin = min(ref)
            ref.remove(kmin)
            a = fh.delete_min()
            b = bh.delete_min()
            c = ph.delete_min()
            if not (a.key == b[0] == c.key == kmin[0]):
                mismatches += 1
            del live[a.item]
            fnodes.pop(a.item, None)
            pnodes.pop(a.item, None)
            ops['delete_min'] += 1
    assert mismatches == 0, mismatches
    violations, max_degree, total = fh.check_fibonacci_property()
    assert violations == 0 and total == fh.n, (violations, total, fh.n)
    degree_bound = int(math.log(max(fh.n, 2)) / math.log(PHI))
    assert max_degree <= degree_bound, (max_degree, degree_bound)
    assert fh.cuts <= 2 * ops['decrease'], (fh.cuts, ops['decrease'])
    cuts_per_dk = fh.cuts / ops['decrease']
    links_per_dm = fh.links / ops['delete_min']
    log2n = math.log2(max(fh.n + ops['delete_min'], 2))
    # the potential argument: actual work <= amortized total, with the CLRS constants
    actual = fh.links + fh.cuts + fh.root_scans
    amortized = ops['insert'] * 1 + ops['delete_min'] * 4 * degree_bound + ops['decrease'] * 4

    # Oracle 2: the adversary that strips grandchildren, with and without marks.
    def adversary(cascade, rounds=30, size=8192):
        h = FibHeap(cascade=cascade)
        nodes = []
        for i in range(size):
            nodes.append(h.insert(rng.random() * 1e6 + 10, i))
        h.delete_min()                             # consolidate into binomial-like trees
        worst = 0
        for _ in range(rounds):
            # cut every grandchild of every root: the parents keep their degree
            # (no marks) or are themselves cut once they lose a second child
            roots = []
            w = h.min
            while True:
                roots.append(w)
                w = w.right
                if w is h.min:
                    break
            for r in roots:
                if r.child is None:
                    continue
                kids = []
                c = r.child
                while True:
                    kids.append(c)
                    c = c.right
                    if c is r.child:
                        break
                for k in kids:
                    if k.child is None:
                        continue
                    gks = []
                    g = k.child
                    while True:
                        gks.append(g)
                        g = g.right
                        if g is k.child:
                            break
                    for g in gks:
                        h.decrease_key(g, g.key - 1e6)      # cut, but not below the minimum's neighborhood
            h.delete_min()                                    # consolidate the debris
            v, md, _ = h.check_fibonacci_property()
            worst = max(worst, md)
        v, md, tot = h.check_fibonacci_property()
        return v, worst, tot, h

    v_mark, md_mark, n_mark, _ = adversary(True)
    v_nomark, md_nomark, n_nomark, _ = adversary(False)
    assert v_mark == 0, v_mark
    assert v_nomark > 0 and md_nomark > md_mark, (v_nomark, md_nomark, md_mark)

    # Oracle 4: Dijkstra, dense and sparse, against the array version.
    def complete_graph(n):
        adj = [[] for _ in range(n)]
        for u in range(n):
            for v in range(u + 1, n):
                w = rng.randint(1, 1000)
                adj[u].append((v, w))
                adj[v].append((u, w))
        return adj

    def sparse_graph(n, m):
        adj = [[] for _ in range(n)]
        for v in range(1, n):
            u = rng.randrange(v)
            w = rng.randint(1, 1000)
            adj[u].append((v, w))
            adj[v].append((u, w))
        for _ in range(m - (n - 1)):
            u, v = rng.randrange(n), rng.randrange(n)
            if u != v:
                w = rng.randint(1, 1000)
                adj[u].append((v, w))
                adj[v].append((u, w))
        return adj

    def cascade_graph(n):
        # w(u, v) = 2 (v - u) - 1 for u < v: settling each vertex improves every
        # later vertex by one, so Dijkstra performs a decrease-key on every edge
        adj = [[] for _ in range(n)]
        for u in range(n):
            for v in range(u + 1, n):
                w = 2 * (v - u) - 1
                adj[u].append((v, w))
                adj[v].append((u, w))
        return adj

    results = {}
    for name, n, adj in (('complete, n = 1,000', 1000, complete_graph(1000)), ('sparse, n = 3,000, m = 12,000', 3000, sparse_graph(3000, 12000)), ('cascade, n = 1,000', 1000, cascade_graph(1000))):
        m = sum(len(a) for a in adj) // 2
        truth = dijkstra_array(n, adj, 0)
        rows = []
        for label, fn in (('Fibonacci heap', dijkstra_fib), ('binary heap, decrease-key', dijkstra_binary), ('pairing heap', dijkstra_pairing), ('lazy binary heap (heapq)', dijkstra_lazy)):
            t0 = time.perf_counter()
            dist, decreases, work = fn(n, adj, 0)
            dt = time.perf_counter() - t0
            assert dist == truth, label
            rows.append((label, decreases, work, dt))
        results[name] = (n, m, rows)

    print('contest: a priority queue with decrease-key; referees: a sorted reference on a random workload, the Fibonacci property checked node by node, and an array Dijkstra for the distances')
    print(f"random workload of {sum(ops.values()):,} operations ({ops['insert']:,} inserts, {ops['decrease']:,} decrease-keys, {ops['delete_min']:,} delete-mins): {mismatches} mismatches across the Fibonacci, binary, and pairing heaps; "
          f'final heap of {fh.n:,} nodes: {violations} Fibonacci-property violations, max degree {max_degree} against the bound {degree_bound} (log base phi of n)')
    print(f"amortized accounting: {cuts_per_dk:.3f} cuts per decrease-key (bound 2; {fh.cascading:,} cascading cuts, {fh.marks:,} marks), {links_per_dm:.1f} links per delete-min against log2 n = {log2n:.1f}; "
          f'actual work {actual:,} (links + cuts + root scans) against the amortized total {amortized:,}')
    print(f'the adversary that strips grandchildren over 30 rounds on 8,192 nodes: with marks {v_mark} violations and max degree {md_mark}; without marks {v_nomark} violations and max degree {md_nomark}')
    for name, (n, m, rows) in results.items():
        print(f'Dijkstra on the {name} graph ({m:,} edges), distances checked against the array version:')
        print(f"  {'structure':>26} {'decrease-keys':>13} {'primitive steps':>15} {'seconds':>8}")
        for label, decreases, work, dt in rows:
            print(f'  {label:>26} {decreases:>13,} {work:>15,} {dt:>8.2f}')
    dense = results['cascade, n = 1,000'][2]
    fib_t = dense[0][3]
    bin_t = dense[1][3]
    pair_t = dense[2][3]
    assert dense[0][1] == 499500, dense[0][1]                       # a decrease-key on every edge
    assert dense[0][2] < dense[3][2], (dense[0][2], dense[3][2])     # fewer primitive steps than the lazy heap's pushes and pops
    print(f'OK: {mismatches} mismatches on {sum(ops.values()):,} operations; Fibonacci property holds on every node with marks and breaks on {v_nomark} nodes without them (max degree {md_nomark} vs {md_mark}); '
          f'{cuts_per_dk:.2f} cuts per decrease-key; Dijkstra distances exact on all three graphs; on the cascade graph with a decrease-key per edge the Fibonacci heap took {fib_t:.2f} s against {bin_t:.2f} s for the binary heap and {pair_t:.2f} s for the pairing heap')
