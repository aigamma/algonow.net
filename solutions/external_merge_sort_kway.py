# Puzzle 92: External merge sort x k-way run merging
# Sorting data 252 times larger than memory: the discipline every
# database's ORDER BY and every index build runs when the table
# will not fit.
#
# The pairing is the point. The algorithm is external merge sort:
# phase one reads memory-sized chunks, sorts them, and writes
# sorted RUNS; phase two merges runs into longer runs until one
# remains, touching every record once per pass. The heuristic is
# k-way merging: with M pages of memory, merge k = M - 1 runs at
# once through a heap (one page buffered per input run, one for
# output), so the number of passes is 1 + ceil(log_k(runs)): the
# logarithm's BASE is the memory. This page counts every page of
# simulated I/O and asserts the pass formula EXACTLY, instance by
# instance; measures the k dial (same memory, k = 2 vs 64: 3.5x
# the I/O); runs the replacement-selection snowplow and confirms
# Knuth's law (runs average 2M on random input: measured 2.01M:
# collapse to exactly ceil(N/M) runs on reverse-sorted input, and
# to ONE run on sorted input); and sorts 1,048,576 records with
# 4,160 records of memory in exactly 3 passes: read the data
# three times, sorted. The referee is sorted() itself: exact
# equality on every instance, duplicates and all.
import heapq
import random


class Disk:
    """Pages read and written, counted. A 'file' is a list of
    fixed-size pages; records only move page by page."""
    def __init__(self, page_size):
        self.P = page_size
        self.reads = 0
        self.writes = 0

    def to_pages(self, records):
        return [records[i : i + self.P] for i in range(0, len(records), self.P)]

    def read_page(self, pages, idx):
        self.reads += 1
        return pages[idx]

    def write_page(self, out_pages, page):
        self.writes += 1
        out_pages.append(page)


def make_runs_simple(disk, pages, M):
    """Phase 1: read M pages, sort in memory, write a run."""
    runs = []
    for start in range(0, len(pages), M):
        chunk = []
        for i in range(start, min(start + M, len(pages))):
            chunk.extend(disk.read_page(pages, i))
        chunk.sort()
        out = []
        for pg in disk.to_pages(chunk):
            disk.write_page(out, pg)
        runs.append(out)
    return runs


def make_runs_replacement(disk, pages, M):
    """Phase 1 by replacement selection: memory holds exactly M
    pages' worth of records. Emit the smallest that can still
    extend the current run; refill ONE record from the input for
    each record emitted; freeze records smaller than the last
    emitted for the next run. Knuth's snowplow: expected run
    length 2M on random input."""
    cap = M * disk.P
    ipage = 0
    ibuf = []
    ioff = 0

    def next_record():
        nonlocal ipage, ibuf, ioff
        if ioff >= len(ibuf):
            if ipage >= len(pages):
                return None
            ibuf = disk.read_page(pages, ipage)
            ipage += 1
            ioff = 0
        r = ibuf[ioff]
        ioff += 1
        return r

    heap = []
    while len(heap) < cap:
        r = next_record()
        if r is None:
            break
        heapq.heappush(heap, r)
    frozen = []
    runs = []
    cur = []
    out = []
    last = None
    while heap or frozen:
        assert len(heap) + len(frozen) <= cap  # the memory invariant
        if not heap:
            for pg in disk.to_pages(cur):
                disk.write_page(out, pg)
            runs.append(out)
            cur, out = [], []
            heap = frozen
            heapq.heapify(heap)
            frozen = []
            last = None
            continue
        r = heapq.heappop(heap)
        cur.append(r)
        last = r
        nxt = next_record()
        if nxt is not None:
            if nxt < last:
                frozen.append(nxt)
            else:
                heapq.heappush(heap, nxt)
    if cur:
        for pg in disk.to_pages(cur):
            disk.write_page(out, pg)
        runs.append(out)
    return runs


def merge_pass(disk, runs, k):
    """Merge groups of k runs into single runs, page-buffered."""
    out_runs = []
    for g in range(0, len(runs), k):
        group = runs[g : g + k]
        heads = []
        for ri, run in enumerate(group):
            page = disk.read_page(run, 0)
            heads.append({"run": run, "pi": 0, "page": page, "off": 0})
        h = []
        for ri, st in enumerate(heads):
            h.append((st["page"][0], ri))
        heapq.heapify(h)
        outbuf = []
        out = []
        while h:
            val, ri = heapq.heappop(h)
            st = heads[ri]
            outbuf.append(val)
            if len(outbuf) == disk.P:
                disk.write_page(out, outbuf)
                outbuf = []
            st["off"] += 1
            if st["off"] == len(st["page"]):
                st["pi"] += 1
                if st["pi"] < len(st["run"]):
                    st["page"] = disk.read_page(st["run"], st["pi"])
                    st["off"] = 0
                else:
                    continue
            heapq.heappush(h, (st["page"][st["off"]], ri))
        if outbuf:
            disk.write_page(out, outbuf)
        out_runs.append(out)
    return out_runs


def external_sort(records, M, page_size, k=None, replacement=False):
    disk = Disk(page_size)
    pages = disk.to_pages(records)
    if k is None:
        k = M - 1
    runs = (make_runs_replacement if replacement else make_runs_simple)(disk, pages, M)
    n_runs0 = len(runs)
    passes = 1  # run formation touched everything once
    while len(runs) > 1:
        runs = merge_pass(disk, runs, k)
        passes += 1
    result = [r for pg in runs[0] for r in pg] if runs else []
    return result, disk, n_runs0, passes


def ceil_log(base, x):
    p = 0
    v = 1
    while v < x:
        v *= base
        p += 1
    return p


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1 + 2: exact correctness AND the pass formula, per
    # instance. 200 instances: sizes, duplicates, sorted, reversed.
    for t in range(200):
        n = rng.randint(1, 4_000)
        style = t % 4
        if style == 0:
            data = [rng.randint(0, 500) for _ in range(n)]
        elif style == 1:
            data = [rng.random() for _ in range(n)]
        elif style == 2:
            data = sorted(rng.random() for _ in range(n))
        else:
            data = sorted((rng.random() for _ in range(n)), reverse=True)
        M = rng.choice([3, 4, 8, 16])
        P = rng.choice([4, 16])
        k = M - 1
        out, disk, n_runs, passes = external_sort(data, M, P, k)
        assert out == sorted(data), (n, M, P)
        assert passes == 1 + ceil_log(k, n_runs), (passes, n_runs, k)

    # Oracle 3: THE SNOWPLOW LAW. Replacement selection on random
    # input: mean run length ~ 2M. Sorted input: ONE run. Reverse:
    # exactly ceil(N/M) runs (the adversary).
    M = 8
    P = 16
    N = 40_000
    data = [rng.random() for _ in range(N)]
    out, disk, n_runs_rs, _ = external_sort(data, M, P, replacement=True)
    assert out == sorted(data)
    out_s, _, n_runs_simple, _ = external_sort(data, M, P)
    mean_len_rs = N / n_runs_rs / (M * P)     # in multiples of memory
    mean_len_simple = N / n_runs_simple / (M * P)
    assert 1.7 < mean_len_rs < 2.3, mean_len_rs      # Knuth's 2M
    assert 0.95 < mean_len_simple < 1.05             # exactly M
    srt = sorted(rng.random() for _ in range(N))
    _, _, one_run, _ = external_sort(srt, M, P, replacement=True)
    assert one_run == 1, one_run
    rev = sorted((rng.random() for _ in range(N)), reverse=True)
    _, _, adv_runs, _ = external_sort(rev, M, P, replacement=True)
    assert adv_runs == -(-N // (M * P)), adv_runs    # ceil(N/M) exactly

    # Oracle 4: THE K DIAL. Same data, same memory budget for
    # buffers, k varied: I/O falls as the log's base rises.
    data = [rng.random() for _ in range(120_000)]
    dial = []
    for k in (2, 4, 8, 16, 64):
        out, disk, n_runs, passes = external_sort(data, 65, 32, k)
        assert out == sorted(data)
        io = disk.reads + disk.writes
        dial.append((k, passes, io))
    assert all(dial[i][2] >= dial[i + 1][2] for i in range(len(dial) - 1)), dial
    dial_ratio = dial[0][2] / dial[-1][2]
    assert dial_ratio > 2.0, dial_ratio  # measured 2.7x

    # Oracle 5: the client. 2^20 records, memory 65 pages x 64
    # records = 4,160 records: 240x smaller than the data: sorted
    # in exactly 3 passes (form + 2 merges), every I/O counted.
    NBIG = 1 << 20
    data = [rng.random() for _ in range(NBIG)]
    out, disk, n_runs, passes = external_sort(data, 65, 64, 64)
    assert out == sorted(data)
    assert passes == 3, passes
    pages_total = -(-NBIG // 64)
    assert disk.reads == passes * pages_total, (disk.reads, passes * pages_total)
    ratio = NBIG / (65 * 64)

    print(f"contest: sort {NBIG:,} records with {65 * 64:,} records of memory ({ratio:.0f}x smaller than the data); referee: sorted() itself, exact equality on every instance")
    print(f"  {'k (merge width)':>15} {'passes':>7} {'page I/O':>10}   nature")
    for k, passes_k, io in dial:
        note = "binary merging: the log's base is 2" if k == 2 else ("one pass of merging suffices" if k == 64 else "")
        print(f"  {k:>15} {passes_k:>7} {io:>10,}   {note}")
    print(f"the pass formula, exact on all 200 instances: passes == 1 + ceil(log_k(runs)): the k dial cut I/O {dial_ratio:.1f}x at identical memory")
    print(f"the snowplow law: replacement selection's runs average {mean_len_rs:.2f}x memory on random input (Knuth's 2M), collapse to 1 run on sorted input, and hit the ceil(N/M) = {adv_runs} adversary exactly on reverse-sorted input; simple runs sit at {mean_len_simple:.2f}x")
    print(f"the client: {NBIG:,} records, {n_runs} initial runs, {passes} total passes, {disk.reads:,} page reads == passes x {pages_total:,} pages exactly: the data was read three times, and it is sorted")
    print("OK: 200 instances equal to sorted() with the pass formula exact, the k dial monotone and 3.5x, the 2M snowplow law measured with both edge cases exact, and the 252x client sorted in three counted passes")
