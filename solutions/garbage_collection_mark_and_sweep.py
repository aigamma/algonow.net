# Puzzle 157: Garbage collection x mark and sweep
# Automatic memory management: a program allocates objects that point
# at each other, drops references as it goes, and never frees anything
# itself. Something must find the objects no longer reachable from the
# program's roots and give their memory back, without ever freeing one
# that is still in use. Garbage collection is the algorithm: when the
# heap fills, stop the program, find the live objects, reclaim the
# rest. Mark and sweep is the heuristic for finding them: mark every
# object reachable from the roots by following pointers, then sweep
# the whole heap, freeing whatever is unmarked. Reachability is the
# definition of live, so the collector cannot be wrong about a cycle,
# a shared object, or a chain of any depth.
#
# Referees:
# (1) SAFETY AND COMPLETENESS, on every collection: the set of objects
#     the collector keeps must equal the set reachable from the roots
#     as computed by an independent traversal; no live object freed, no
#     dead object kept, checked after each of the collections the
#     workload triggers, and every pointer in a live object must point
#     at a live object afterward;
# (2) THE CYCLES, measured: reference counting, the rival that frees
#     an object the moment its count hits zero, run on the same
#     workload, with the objects it can never free (cyclic garbage)
#     counted at the end, against mark and sweep's zero;
# (3) THE COST: mark work proportional to the live objects and sweep
#     work proportional to the heap, measured at 10%, 50%, and 90%
#     live, against a copying collector (Cheney) whose work is
#     proportional to the live objects alone but which can use only half
#     the heap;
# (4) FRAGMENTATION, measured: with long-lived objects pinned through
#     the heap, the free space after mark and sweep is thousands of
#     small holes, and a request for one large block fails while the
#     total free space is many times larger; the copying collector's
#     free space is one block and the same request succeeds;
# (5) THE NEGATIVE EXAMPLE, measured: never collecting (an arena that
#     only grows) exhausts the heap at a counted allocation, and
#     reference counting leaks the cycles on this page's workload.
import random
from collections import deque

SEED = 20260926
HEAP = 20000


class Heap:
    """Objects have a size in slots and a list of pointer fields. The heap is
    an array of slots; allocation is first-fit over a free list."""

    def __init__(self, size):
        self.size = size
        self.objects = {}            # id -> {'addr', 'size', 'fields'}
        self.free = [(0, size)]      # (start, length) sorted
        self.next_id = 1
        self.roots = []
        self.pinned = []             # long-lived objects that never leave the root set
        self.collections = 0
        self.mark_work = 0
        self.sweep_work = 0
        self.failed = None

    def free_total(self):
        return sum(length for _, length in self.free)

    def largest_hole(self):
        return max((length for _, length in self.free), default=0)

    def allocate(self, size, fields):
        for i, (start, length) in enumerate(self.free):
            if length >= size:
                oid = self.next_id
                self.next_id += 1
                self.objects[oid] = {'addr': start, 'size': size, 'fields': list(fields)}
                if length == size:
                    self.free.pop(i)
                else:
                    self.free[i] = (start + size, length - size)
                return oid
        return None

    def release(self, oid):
        o = self.objects.pop(oid)
        self.free.append((o['addr'], o['size']))
        self.free.sort()
        merged = []
        for start, length in self.free:
            if merged and merged[-1][0] + merged[-1][1] == start:
                merged[-1] = (merged[-1][0], merged[-1][1] + length)
            else:
                merged.append((start, length))
        self.free = merged

    def all_roots(self):
        return self.roots + self.pinned

    def mark_sweep(self):
        marked = set()
        stack = self.all_roots()
        while stack:
            oid = stack.pop()
            if oid in marked:
                continue
            marked.add(oid)
            self.mark_work += 1
            stack.extend(self.objects[oid]['fields'])
        for oid in list(self.objects):
            self.sweep_work += 1
            if oid not in marked:
                self.release(oid)
        self.collections += 1
        return marked


def reachable(objects, roots):
    """The independent referee: breadth-first over the object graph."""
    seen = set()
    q = deque(roots)
    while q:
        oid = q.popleft()
        if oid in seen:
            continue
        seen.add(oid)
        q.extend(objects[oid]['fields'])
    return seen


class CopyingHeap:
    """Cheney: two semispaces of half the size; live objects are copied to
    the other space in breadth-first order; the free space is one block."""

    def __init__(self, size):
        self.half = size // 2
        self.objects = {}
        self.used = 0
        self.next_id = 1
        self.roots = []
        self.pinned = []
        self.collections = 0
        self.copy_work = 0
        self.failed = None

    def free_total(self):
        return self.half - self.used

    def largest_hole(self):
        return self.free_total()

    def allocate(self, size, fields):
        if self.used + size > self.half:
            return None
        oid = self.next_id
        self.next_id += 1
        self.objects[oid] = {'size': size, 'fields': list(fields)}
        self.used += size
        return oid

    def all_roots(self):
        return self.roots + self.pinned

    def collect(self):
        live = reachable(self.objects, self.all_roots())
        self.copy_work += len(live)
        self.objects = {oid: o for oid, o in self.objects.items() if oid in live}
        self.used = sum(o['size'] for o in self.objects.values())
        self.collections += 1
        return live


class RefCountHeap(Heap):
    """Frees an object the instant its count drops to zero, recursively.
    Cycles keep each other alive forever."""

    def __init__(self, size):
        super().__init__(size)
        self.counts = {}

    def allocate(self, size, fields):
        oid = super().allocate(size, fields)
        if oid is not None:
            self.counts[oid] = 0
            for f in fields:
                self.counts[f] += 1
        return oid

    def add_root(self, oid):
        self.roots.append(oid)
        self.counts[oid] += 1

    def drop_root(self, oid):
        self.roots.remove(oid)
        self.decref(oid)

    def decref(self, oid):
        self.counts[oid] -= 1
        if self.counts[oid] == 0:
            fields = self.objects[oid]['fields']
            self.release(oid)
            del self.counts[oid]
            for f in fields:
                self.decref(f)


def workload(heap, rng, steps, cycle_rate=0.15, keep=40, big_every=None, big_size=64, refcount=False, pin_every=None):
    """Allocate small objects that point at recent objects, keep a rolling
    set of roots, and sometimes build a cycle (a pair pointing at each
    other) that is dropped from the roots soon after. With pin_every, a
    small pointer-free object is allocated every so many steps and pinned
    as a permanent root, so long-lived data is scattered through the heap.
    Returns the step at which an allocation failed, or None."""
    recent = []
    cycles_made = 0
    copying = isinstance(heap, CopyingHeap)

    def alloc(size, fields):
        oid = heap.allocate(size, fields)
        if oid is None:
            if copying:
                heap.collect()
            elif not refcount:
                heap.mark_sweep()
            oid = heap.allocate(size, fields)
        return oid

    for step in range(steps):
        size = rng.randint(1, 8)
        if big_every and step % big_every == 0:
            size = big_size
        fields = [rng.choice(recent) for _ in range(rng.randint(0, 2))] if recent else []
        oid = alloc(size, fields)
        if oid is None:
            heap.failed = step
            return step
        if refcount:
            heap.add_root(oid)
        else:
            heap.roots.append(oid)
        recent.append(oid)
        if len(recent) > 20:
            recent.pop(0)
        if pin_every and step % pin_every == 0:
            pin = alloc(rng.randint(1, 4), [])
            if pin is None:
                heap.failed = step
                return step
            heap.pinned.append(pin)
            if refcount:
                heap.counts[pin] += 1
        if rng.random() < cycle_rate:
            # a two-object cycle: the new object and a partner point at each other
            partner = alloc(rng.randint(1, 4), [oid])
            if partner is None:
                heap.failed = step
                return step
            heap.objects[oid]['fields'].append(partner)
            if refcount:
                heap.counts[partner] += 1
            cycles_made += 1
        while len(heap.roots) > keep:
            if refcount:
                heap.drop_root(heap.roots[0])
            else:
                heap.roots.pop(0)
    heap.cycles_made = cycles_made
    return None


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1: safety and completeness on every collection.
    heap = Heap(HEAP)
    checks = 0
    rng1 = random.Random(SEED)
    recent = []
    for step in range(60000):
        size = rng1.randint(1, 8)
        fields = [rng1.choice(recent) for _ in range(rng1.randint(0, 2))] if recent else []
        oid = heap.allocate(size, fields)
        if oid is None:
            before = set(heap.objects)
            truth = reachable(heap.objects, heap.roots)
            kept = heap.mark_sweep()
            assert kept == truth, 'collector disagrees with the referee'
            assert set(heap.objects) == truth
            for o in heap.objects.values():
                assert all(f in heap.objects for f in o['fields']), 'dangling pointer'
            checks += 1
            oid = heap.allocate(size, fields)
            assert oid is not None
        heap.roots.append(oid)
        recent.append(oid)
        if len(recent) > 20:
            recent.pop(0)
        if rng1.random() < 0.15 and recent:
            partner = heap.allocate(rng1.randint(1, 4), [oid])
            if partner is not None:
                heap.objects[oid]['fields'].append(partner)
        while len(heap.roots) > 40:
            heap.roots.pop(0)
    assert checks > 10, checks

    # Oracle 2 and 5: reference counting leaks the cycles.
    rc = RefCountHeap(HEAP)
    rc_failed = workload(rc, random.Random(SEED), 60000, refcount=True)
    rc_live = reachable(rc.objects, rc.all_roots())
    rc_leaked = len(rc.objects) - len(rc_live)
    ms = Heap(HEAP)
    ms_failed = workload(ms, random.Random(SEED), 60000)
    ms.mark_sweep()                                  # one more collection, then count what is left
    ms_leaked = len(ms.objects) - len(reachable(ms.objects, ms.all_roots()))
    assert ms_failed is None and ms_leaked == 0, (ms_failed, ms_leaked)
    assert rc_failed is not None and rc_leaked > 1000, (rc_failed, rc_leaked)
    arena = Heap(HEAP)
    arena_fail = None
    rng2 = random.Random(SEED)
    for step in range(60000):
        if arena.allocate(rng2.randint(1, 8), []) is None:
            arena_fail = step
            break
    assert arena_fail is not None and arena_fail < 10000, arena_fail

    # Oracle 3: cost at three live fractions, mark-sweep vs copying. The live
    # fraction is measured right after a collection, when only reachable
    # objects remain.
    cost_rows = []
    for keep in (250, 1250, 2250):
        h = Heap(HEAP)
        workload(h, random.Random(SEED), 40000, cycle_rate=0.0, keep=keep)
        h.mark_sweep()
        live_slots = sum(o['size'] for o in h.objects.values())
        c = CopyingHeap(HEAP)
        workload(c, random.Random(SEED), 40000, cycle_rate=0.0, keep=keep)
        cost_rows.append((keep, live_slots / HEAP, h.collections, h.mark_work / h.collections, h.sweep_work / h.collections, c.collections, c.copy_work / max(1, c.collections), c.failed))
    assert cost_rows[0][4] > 5 * cost_rows[0][3], cost_rows[0]         # at low liveness the sweep dominates
    assert cost_rows[2][6] > cost_rows[0][6], cost_rows                 # copying pays for live objects
    assert cost_rows[2][7] is not None and cost_rows[2][1] > 0.5, cost_rows[2]   # more than half live: copying cannot fit

    # Oracle 4: fragmentation. AUTHOR CORRECTION: the draft interleaved 64-slot
    # requests with the small objects and expected one to fail; measured, the
    # freed big objects leave holes exactly big enough and nothing failed in
    # 60,000 steps, so the test is a phase change: small objects with a
    # long-lived one pinned every 25 steps, then one 512-slot request.
    BIG = 512
    frag = Heap(HEAP)
    workload(frag, random.Random(SEED), 60000, pin_every=25)
    frag.mark_sweep()
    frag_free = frag.free_total()
    frag_hole = frag.largest_hole()
    frag_holes = len(frag.free)
    ms_big = frag.allocate(BIG, [])
    cfrag = CopyingHeap(HEAP)
    workload(cfrag, random.Random(SEED), 60000, pin_every=25)
    cfrag.collect()
    cfrag_free = cfrag.free_total()
    copy_big = cfrag.allocate(BIG, [])
    pinned_slots = sum(frag.objects[o]['size'] for o in frag.pinned if o in frag.objects)
    assert frag_free >= BIG and frag_hole < BIG and ms_big is None, (frag_free, frag_hole, ms_big)
    assert copy_big is not None and cfrag_free >= BIG, (copy_big, cfrag_free)

    print(f'contest: a {HEAP:,}-slot heap under a workload of small linked objects with a rolling root set and two-object cycles; referee: reachability from the roots by an independent breadth-first traversal')
    print(f'safety and completeness: {checks} collections, each keeping exactly the reachable set and leaving no dangling pointer')
    print(f'cycles: reference counting on the same 60,000-step workload ran out of heap at step {rc_failed:,} holding {rc_leaked:,} unreachable objects it can never free ({len(rc.objects):,} allocated, {len(rc_live):,} reachable); mark and sweep completes all 60,000 steps and after a final collection holds {ms_leaked} unreachable objects; an arena that never frees fails at allocation {arena_fail:,}')
    print(f"  {'live':>6} {'MS collections':>14} {'mark / coll':>11} {'sweep / coll':>12} {'copy collections':>16} {'copied / coll':>13}")
    for keep, live, mc, mw, sw, cc, cw, cf in cost_rows:
        print(f'  {live:>6.0%} {mc:>14} {mw:>11,.0f} {sw:>12,.0f} {cc:>16} {cw:>13,.0f}{"  (copying failed: half the heap)" if cf is not None else ""}')
    print(f'fragmentation: after 60,000 steps with a long-lived object pinned every 25 ({len(frag.pinned)} objects, {pinned_slots:,} slots), mark and sweep has {frag_free:,} free slots in {frag_holes:,} holes, the largest {frag_hole}, and a {BIG}-slot request fails; the copying collector, which compacts, has {cfrag_free:,} free slots in one block and the request succeeds')
    print(f'OK: {checks} collections exact against the referee; reference counting exhausts the heap at step {rc_failed:,} with {rc_leaked:,} cyclic objects leaked where mark and sweep finishes with {ms_leaked}; sweep work {cost_rows[0][4]:,.0f} vs mark {cost_rows[0][3]:,.0f} per collection at {cost_rows[0][1]:.0%} live; '
          f'fragmentation: a {BIG}-slot request fails with {frag_free:,} free slots whose largest hole is {frag_hole}, and succeeds under copying')
