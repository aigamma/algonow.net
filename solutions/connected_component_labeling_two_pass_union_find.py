# Puzzle 190: Connected component labeling x Two-pass union-find
# Region labeling: a binary image, foreground pixels on a background; give
# every foreground pixel the number of the connected blob it belongs to,
# so that two pixels share a label exactly when a path of foreground
# neighbors joins them (4-connectivity: edge neighbors; 8-connectivity:
# edge and corner neighbors). The algorithm is the two-pass raster scan of
# Rosenfeld and Pfaltz (1966): pass one reads the pixels in reading order
# and gives each foreground pixel the label of an already-scanned neighbor,
# or a fresh provisional label when it has none; pass two rewrites every
# provisional label to its final component number. The heuristic is the
# union-find between the passes: whenever a pixel sees two different
# labels among its scanned neighbors (the two arms of a U meeting at the
# bottom), record that they are equivalent by a union, and resolve every
# label with find, using path compression and union by rank so the whole
# bookkeeping costs amortized near-constant time per operation. Two
# streaming passes over the pixels, no stack, no recursion, no revisiting.
#
# Referees:
# (1) THE PARTITION, compared pixel set by pixel set (label numbers
#     ignored), against an independent iterative breadth-first flood fill on
#     every image for both connectivities, and against a count known by
#     construction on images of separated disks;
# (2) THE COUNTS: pixel visits (exactly two per pixel), provisional labels
#     against final components, unions and finds, and the average number of
#     parent links followed per find, which must stay near one under path
#     compression and union by rank;
# (3) THE RIVALS: breadth-first flood fill (visits and the queue's maximum
#     size), recursive depth-first flood fill (its maximum recursion depth,
#     which equals the length of a thin snake), run-length labeling (unions
#     over runs instead of pixels), and union-find over the raw pixels (one
#     set per pixel, no provisional labels), all giving the same partition,
#     with unions equal to sets made minus components for every one of them;
# (4) 4- AGAINST 8-CONNECTIVITY on diagonal stripes: every pixel its own
#     component under 4-connectivity, one component per stripe under 8;
# (5) THE NEGATIVE EXAMPLE, measured: a single raster pass that takes the
#     smallest neighbor label but never records equivalences, which splits
#     every U-shaped component into two or more labels; and the recursive
#     flood fill at Python's default recursion limit on a snake longer than
#     the limit, which raises RecursionError.
#
# AUTHOR CORRECTION: the draft expected the two-pass first pass to create
# about as many provisional labels as there are components. Measured on
# random blobs, pass one creates several labels per blob (every row where
# a blob widens on the left starts a new one), and the union-find merges
# them: the ratio is reported rather than assumed.
import random
import sys
from collections import deque

SEED = 20261010


class UnionFind:
    def __init__(self):
        self.parent = []
        self.rank = []
        self.unions = 0
        self.finds = 0
        self.links = 0  # parent links followed during finds

    def make(self):
        self.parent.append(len(self.parent))
        self.rank.append(0)
        return len(self.parent) - 1

    def find(self, x):
        self.finds += 1
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
            self.links += 1
        while self.parent[x] != root:  # path compression
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        self.unions += 1
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1


def scanned_neighbors(x, y, conn):
    yield x - 1, y
    yield x, y - 1
    if conn == 8:
        yield x - 1, y - 1
        yield x + 1, y - 1


def all_neighbors(x, y, conn):
    yield x - 1, y
    yield x + 1, y
    yield x, y - 1
    yield x, y + 1
    if conn == 8:
        yield x - 1, y - 1
        yield x + 1, y - 1
        yield x - 1, y + 1
        yield x + 1, y + 1


def two_pass(img, conn):
    h, w = len(img), len(img[0])
    labels = [[0] * w for _ in range(h)]
    uf = UnionFind()
    uf.make()  # label 0 is the background
    visits = 0
    provisional = 0
    for y in range(h):
        row = img[y]
        for x in range(w):
            visits += 1
            if not row[x]:
                continue
            best = 0
            seen = []
            for nx, ny in scanned_neighbors(x, y, conn):
                if 0 <= nx < w and 0 <= ny < h and labels[ny][nx]:
                    seen.append(labels[ny][nx])
            if not seen:
                best = uf.make()
                provisional += 1
            else:
                best = min(seen)
                for other in seen:
                    if other != best:
                        uf.union(best, other)
            labels[y][x] = best
    # second pass: compact final labels
    final = {}
    out = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            visits += 1
            if labels[y][x]:
                root = uf.find(labels[y][x])
                if root not in final:
                    final[root] = len(final) + 1
                out[y][x] = final[root]
    return out, {'visits': visits, 'provisional': provisional, 'components': len(final), 'unions': uf.unions, 'finds': uf.finds, 'links_per_find': uf.links / max(1, uf.finds)}


def bfs_flood_fill(img, conn):
    h, w = len(img), len(img[0])
    out = [[0] * w for _ in range(h)]
    visits = 0
    comps = 0
    max_queue = 0
    for y in range(h):
        for x in range(w):
            visits += 1
            if img[y][x] and not out[y][x]:
                comps += 1
                out[y][x] = comps
                q = deque([(x, y)])
                while q:
                    max_queue = max(max_queue, len(q))
                    cx, cy = q.popleft()
                    for nx, ny in all_neighbors(cx, cy, conn):
                        visits += 1
                        if 0 <= nx < w and 0 <= ny < h and img[ny][nx] and not out[ny][nx]:
                            out[ny][nx] = comps
                            q.append((nx, ny))
    return out, {'visits': visits, 'components': comps, 'max_queue': max_queue}


def dfs_recursive(img, conn, limit):
    """Recursive flood fill; reports the maximum depth, or the failure."""
    h, w = len(img), len(img[0])
    out = [[0] * w for _ in range(h)]
    depth = [0]
    max_depth = [0]
    visits = [0]
    old = sys.getrecursionlimit()
    sys.setrecursionlimit(limit)

    def fill(x, y, c):
        depth[0] += 1
        max_depth[0] = max(max_depth[0], depth[0])
        out[y][x] = c
        for nx, ny in all_neighbors(x, y, conn):
            visits[0] += 1
            if 0 <= nx < w and 0 <= ny < h and img[ny][nx] and not out[ny][nx]:
                fill(nx, ny, c)
        depth[0] -= 1

    comps = 0
    failed = False
    try:
        for y in range(h):
            for x in range(w):
                visits[0] += 1
                if img[y][x] and not out[y][x]:
                    comps += 1
                    fill(x, y, comps)
    except RecursionError:
        failed = True
    finally:
        sys.setrecursionlimit(old)
    return (None if failed else out), {'components': comps, 'max_depth': max_depth[0], 'failed': failed, 'visits': visits[0]}


def pixel_union_find(img, conn):
    """The structure alone, no provisional labels: every foreground pixel is
    its own set, every foreground adjacency to a scanned neighbor is a union,
    and one find per pixel at the end reads the component."""
    h, w = len(img), len(img[0])
    uf = UnionFind()
    idx = [[-1] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if img[y][x]:
                idx[y][x] = uf.make()
                for nx, ny in scanned_neighbors(x, y, conn):
                    if 0 <= nx < w and 0 <= ny < h and img[ny][nx]:
                        uf.union(idx[y][x], idx[ny][nx])
    out = [[0] * w for _ in range(h)]
    final = {}
    for y in range(h):
        for x in range(w):
            if idx[y][x] >= 0:
                root = uf.find(idx[y][x])
                if root not in final:
                    final[root] = len(final) + 1
                out[y][x] = final[root]
    return out, {'sets': len(uf.parent), 'unions': uf.unions, 'finds': uf.finds, 'components': len(final), 'links_per_find': uf.links / max(1, uf.finds)}


def run_length_labeling(img, conn):
    """Label runs of foreground per row, union runs that overlap (or touch
    diagonally, for 8-connectivity) with runs of the previous row."""
    h, w = len(img), len(img[0])
    uf = UnionFind()
    runs_by_row = []
    run_count = 0
    for y in range(h):
        runs = []
        x = 0
        while x < w:
            if img[y][x]:
                start = x
                while x < w and img[y][x]:
                    x += 1
                runs.append((start, x - 1, uf.make()))
                run_count += 1
            else:
                x += 1
        if y > 0:
            slack = 1 if conn == 8 else 0
            prev = runs_by_row[-1]
            j = 0
            for (s, e, lab) in runs:
                while j < len(prev) and prev[j][1] + slack < s:
                    j += 1
                k = j
                while k < len(prev) and prev[k][0] - slack <= e:
                    uf.union(lab, prev[k][2])
                    k += 1
        runs_by_row.append(runs)
    out = [[0] * w for _ in range(h)]
    final = {}
    for y, runs in enumerate(runs_by_row):
        for (s, e, lab) in runs:
            root = uf.find(lab)
            if root not in final:
                final[root] = len(final) + 1
            for x in range(s, e + 1):
                out[y][x] = final[root]
    return out, {'runs': run_count, 'unions': uf.unions, 'finds': uf.finds, 'components': len(final)}


def naive_single_pass(img, conn):
    """Smallest scanned-neighbor label, no equivalence bookkeeping."""
    h, w = len(img), len(img[0])
    out = [[0] * w for _ in range(h)]
    labels = 0
    for y in range(h):
        for x in range(w):
            if not img[y][x]:
                continue
            seen = [out[ny][nx] for nx, ny in scanned_neighbors(x, y, conn) if 0 <= nx < w and 0 <= ny < h and out[ny][nx]]
            if seen:
                out[y][x] = min(seen)
            else:
                labels += 1
                out[y][x] = labels
    return out, {'labels': labels}


def partition(labeling):
    groups = {}
    for y, row in enumerate(labeling):
        for x, lab in enumerate(row):
            if lab:
                groups.setdefault(lab, []).append((x, y))
    return frozenset(frozenset(g) for g in groups.values())


# ------------------------------------------------------------- images

def blank(w, h):
    return [[0] * w for _ in range(h)]


def paint_disk(img, cx, cy, r):
    h, w = len(img), len(img[0])
    for y in range(max(0, cy - r), min(h, cy + r + 1)):
        for x in range(max(0, cx - r), min(w, cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                img[y][x] = 1


def random_blobs(rng, w, h, n):
    img = blank(w, h)
    for _ in range(n):
        paint_disk(img, rng.randrange(w), rng.randrange(h), rng.randint(2, 9))
    return img


def separated_disks(rng, w, h, n, r):
    """Disks whose bounding boxes are at least 2 pixels apart: exactly n
    components by construction, under either connectivity."""
    img = blank(w, h)
    centers = []
    while len(centers) < n:
        cx, cy = rng.randrange(r + 1, w - r - 1), rng.randrange(r + 1, h - r - 1)
        if all(abs(cx - ox) > 2 * r + 2 or abs(cy - oy) > 2 * r + 2 for ox, oy in centers):
            centers.append((cx, cy))
            paint_disk(img, cx, cy, r)
    return img


def snake(w, h):
    """A serpentine path one pixel wide: one component of w * (h // 2) pixels, roughly."""
    img = blank(w, h)
    length = 0
    for y in range(0, h, 2):
        for x in range(w):
            img[y][x] = 1
            length += 1
        if y + 1 < h:
            x = w - 1 if (y // 2) % 2 == 0 else 0
            img[y + 1][x] = 1
            length += 1
    return img, length


def u_shapes(rng, w, h, n):
    """n U shapes with arms that only meet at the bottom row of each U."""
    img = blank(w, h)
    placed = 0
    attempts = 0
    while placed < n and attempts < 10000:
        attempts += 1
        uw, uh = rng.randint(6, 14), rng.randint(5, 12)
        x0, y0 = rng.randrange(0, w - uw), rng.randrange(0, h - uh)
        box = [(x, y) for y in range(y0 - 1, y0 + uh + 1) for x in range(x0 - 1, x0 + uw + 1) if 0 <= x < w and 0 <= y < h]
        if any(img[y][x] for x, y in box):
            continue
        for y in range(y0, y0 + uh):
            img[y][x0] = 1
            img[y][x0 + uw - 1] = 1
        for x in range(x0, x0 + uw):
            img[y0 + uh - 1][x] = 1
        placed += 1
    return img, placed


def diagonal_stripes(w, h, period):
    img = blank(w, h)
    for y in range(h):
        for x in range(w):
            if (x - y) % period == 0:
                img[y][x] = 1
    return img


def main():
    rng = random.Random(SEED)
    W, H = 160, 120

    # Oracle 1 and 2: random blobs under both connectivities against BFS.
    images = [('random blobs', random_blobs(rng, W, H, 60))]
    results = {}
    for name, img in images:
        for conn in (4, 8):
            lab, stats = two_pass(img, conn)
            ref, rstats = bfs_flood_fill(img, conn)
            assert partition(lab) == partition(ref), (name, conn)
            assert stats['components'] == rstats['components']
            assert stats['visits'] == 2 * W * H
            assert stats['links_per_find'] < 1.5, stats['links_per_find']
            rl, rlstats = run_length_labeling(img, conn)
            assert partition(rl) == partition(ref), (name, conn, 'run-length')
            pu, pustats = pixel_union_find(img, conn)
            assert partition(pu) == partition(ref), (name, conn, 'pixel union-find')
            assert pustats['unions'] == pustats['sets'] - rstats['components']
            assert stats['unions'] == stats['provisional'] - stats['components']
            assert rlstats['unions'] == rlstats['runs'] - rlstats['components']
            results[(name, conn)] = (stats, rstats, rlstats, pustats)
    # separated disks: the count is known by construction
    for k in (10, 25, 40):
        img = separated_disks(rng, W, H, k, 4)
        for conn in (4, 8):
            lab, stats = two_pass(img, conn)
            assert stats['components'] == k, (k, conn, stats['components'])
            assert partition(lab) == partition(bfs_flood_fill(img, conn)[0])
    # many random images, both connectivities, against BFS
    checked = 0
    for _ in range(40):
        img = random_blobs(rng, 64, 48, rng.randint(5, 40))
        for conn in (4, 8):
            lab, _ = two_pass(img, conn)
            ref, _ = bfs_flood_fill(img, conn)
            assert partition(lab) == partition(ref)
            rl, _ = run_length_labeling(img, conn)
            assert partition(rl) == partition(ref)
            pu, _ = pixel_union_find(img, conn)
            assert partition(pu) == partition(ref)
            checked += 1

    # Oracle 3: the recursive flood fill and the snake.
    snake_img, snake_len = snake(W, 40)
    lab, sstats = two_pass(snake_img, 4)
    assert sstats['components'] == 1
    ok_lab, dstats = dfs_recursive(snake_img, 4, 50000)
    assert ok_lab is not None and dstats['max_depth'] >= snake_len - 1, dstats
    assert partition(ok_lab) == partition(lab)
    _, dfail = dfs_recursive(snake_img, 4, 1000)
    assert dfail['failed'], 'the recursive fill should overflow the default limit on the snake'
    bfs_snake, bstats = bfs_flood_fill(snake_img, 4)
    assert partition(bfs_snake) == partition(lab)

    # Oracle 4: diagonal stripes.
    stripes = diagonal_stripes(60, 60, 3)
    pixels = sum(sum(r) for r in stripes)
    lab4, s4 = two_pass(stripes, 4)
    lab8, s8 = two_pass(stripes, 8)
    assert s4['components'] == pixels, (s4['components'], pixels)
    stripe_count = len({(x - y) for y in range(60) for x in range(60) if stripes[y][x]})
    assert s8['components'] == stripe_count, (s8['components'], stripe_count)
    assert partition(lab8) == partition(bfs_flood_fill(stripes, 8)[0])

    # Oracle 5: the naive single pass on U shapes (and on the blobs).
    u_img, placed = u_shapes(rng, W, H, 30)
    lab_u, ustats = two_pass(u_img, 4)
    assert ustats['components'] == placed
    naive_u, nstats = naive_single_pass(u_img, 4)
    assert nstats['labels'] >= 2 * placed, (nstats['labels'], placed)
    assert partition(naive_u) != partition(lab_u)
    naive_b, nbstats = naive_single_pass(images[0][1], 8)
    blob_stats = results[('random blobs', 8)][0]
    assert nbstats['labels'] > blob_stats['components']

    s4b, r4b, rl4b, pu4b = results[('random blobs', 4)]
    s8b, r8b, rl8b, pu8b = results[('random blobs', 8)]
    dfs_blobs = {}
    for conn, rstats in ((4, r4b), (8, r8b)):
        ok_dfs, d = dfs_recursive(images[0][1], conn, 50000)
        assert ok_dfs is not None and partition(ok_dfs) == partition(bfs_flood_fill(images[0][1], conn)[0])
        assert d['visits'] == rstats['visits'], 'the recursive and queue fills examine the same neighbors'
        dfs_blobs[conn] = d
    fg = sum(sum(r) for r in images[0][1])
    print('contest: a 160 x 120 binary image of 60 random disks (' + f'{fg:,} foreground pixels) labeled under 4- and 8-connectivity; referee: an independent breadth-first flood fill, compared as a partition of pixels; disks placed apart as a count known by construction; one currency: pixel visits, unions, finds')
    print(f'{"method":>26} {"conn":>4} {"components":>10} {"visits":>8} {"sets made":>11} {"unions":>7} {"finds":>7} {"links/find":>10}')
    for conn, (s, r, rl, pu) in ((4, (s4b, r4b, rl4b, pu4b)), (8, (s8b, r8b, rl8b, pu8b))):
        print(f'{"two-pass + union-find":>26} {conn:>4} {s["components"]:>10} {s["visits"]:>8,} {s["provisional"]:>11} {s["unions"]:>7} {s["finds"]:>7,} {s["links_per_find"]:>10.3f}')
        print(f'{"BFS flood fill":>26} {conn:>4} {r["components"]:>10} {r["visits"]:>8,} {"-":>11} {"-":>7} {"-":>7} {"queue max " + str(r["max_queue"]):>10}')
        print(f'{"run-length labeling":>26} {conn:>4} {rl["components"]:>10} {"-":>8} {str(rl["runs"]) + " runs":>11} {rl["unions"]:>7} {rl["finds"]:>7,} {"-":>10}')
        print(f'{"union-find over pixels":>26} {conn:>4} {pu["components"]:>10} {"-":>8} {pu["sets"]:>11,} {pu["unions"]:>7,} {pu["finds"]:>7,} {pu["links_per_find"]:>10.3f}')
    print(f'recursive flood fill on the same image: {dfs_blobs[4]["visits"]:,} and {dfs_blobs[8]["visits"]:,} visits (equal to the queue version), maximum depth {dfs_blobs[4]["max_depth"]:,} and {dfs_blobs[8]["max_depth"]:,}')
    print(f'separated disks: 10, 25, and 40 components found exactly under both connectivities; {checked} random image-connectivity pairs matched the flood fill (two-pass and run-length both)')
    print(f'the snake: one component of {snake_len:,} pixels; two-pass {sstats["visits"]:,} visits, {sstats["provisional"]} provisional labels and {sstats["unions"]} unions; BFS queue never above {bstats["max_queue"]}; recursive flood fill needs depth {dstats["max_depth"]:,} and raises RecursionError at the default limit of 1,000')
    print(f'diagonal stripes (60 x 60, period 3): {pixels:,} components under 4-connectivity (every pixel alone), {stripe_count} under 8-connectivity (one per stripe)')
    print(f'the naive single pass: {nstats["labels"]} labels for {placed} U shapes (every U split at least in two), and {nbstats["labels"]} labels for the {blob_stats["components"]} blobs under 8-connectivity; the two-pass gave {ustats["provisional"]} provisional labels for the {placed} U shapes and merged them with {ustats["unions"]} unions')
    print(f'OK: the two-pass partition equals the flood fill on every image under both connectivities ({checked + 8} comparisons) and run-length labeling and union-find over pixels agree; unions equal labels minus components for every method; counts known by construction recovered exactly; '
          f'{s8b["links_per_find"]:.3f} parent links per find with path compression and rank; the snake of {snake_len:,} pixels needs recursion depth {dstats["max_depth"]:,} where the two passes need none; '
          f'4-connectivity {pixels:,} against 8-connectivity {stripe_count} on the stripes; the naive single pass splits every U ({nstats["labels"]} labels for {placed})')


if __name__ == '__main__':
    main()
