# Puzzle 190: Connected component labeling x Two-pass union-find
# Region labeling: number every foreground pixel of a binary image by its
# blob under 4- or 8-connectivity. Rosenfeld and Pfaltz (1966): pass one
# labels each pixel from a scanned neighbor or starts a provisional label,
# the union-find records every meeting of two labels, pass two rewrites
# labels to components. Referee: an independent BFS flood fill, compared as
# a partition, plus counts known by construction and work identities.
# AUTHOR CORRECTION: the draft expected one provisional label per
# component; measured, several per blob.
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
        self.links = 0

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


def neighbors(x, y, conn, scanned=False):
    nb = [(x - 1, y), (x, y - 1)] if scanned else [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
    if conn == 8:
        nb += [(x - 1, y - 1), (x + 1, y - 1)] if scanned else [(x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1)]
    return nb


def two_pass(img, conn):
    h, w = len(img), len(img[0])
    labels = [[0] * w for _ in range(h)]
    uf = UnionFind()
    uf.make()
    visits = 0
    provisional = 0
    for y in range(h):
        row = img[y]
        for x in range(w):
            visits += 1
            if not row[x]:
                continue
            seen = [labels[ny][nx] for nx, ny in neighbors(x, y, conn, True) if 0 <= nx < w and 0 <= ny < h and labels[ny][nx]]
            if not seen:
                best = uf.make()
                provisional += 1
            else:
                best = min(seen)
                for other in seen:
                    if other != best:
                        uf.union(best, other)
            labels[y][x] = best
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
                    for nx, ny in neighbors(cx, cy, conn):
                        visits += 1
                        if 0 <= nx < w and 0 <= ny < h and img[ny][nx] and not out[ny][nx]:
                            out[ny][nx] = comps
                            q.append((nx, ny))
    return out, {'visits': visits, 'components': comps, 'max_queue': max_queue}


def dfs_recursive(img, conn, limit):
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
        for nx, ny in neighbors(x, y, conn):
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
    h, w = len(img), len(img[0])
    uf = UnionFind()
    idx = [[-1] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if img[y][x]:
                idx[y][x] = uf.make()
                for nx, ny in neighbors(x, y, conn, True):
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
    h, w = len(img), len(img[0])
    out = [[0] * w for _ in range(h)]
    labels = 0
    for y in range(h):
        for x in range(w):
            if not img[y][x]:
                continue
            seen = [out[ny][nx] for nx, ny in neighbors(x, y, conn, True) if 0 <= nx < w and 0 <= ny < h and out[ny][nx]]
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
    img = blank(w, h)
    centers = []
    while len(centers) < n:
        cx, cy = rng.randrange(r + 1, w - r - 1), rng.randrange(r + 1, h - r - 1)
        if all(abs(cx - ox) > 2 * r + 2 or abs(cy - oy) > 2 * r + 2 for ox, oy in centers):
            centers.append((cx, cy))
            paint_disk(img, cx, cy, r)
    return img


def snake(w, h):
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
    img = blank(w, h)
    placed = 0
    attempts = 0
    while placed < n and attempts < 10000:
        attempts += 1
        uw, uh = rng.randint(6, 14), rng.randint(5, 12)
        x0, y0 = rng.randrange(0, w - uw), rng.randrange(0, h - uh)
        if any(img[y][x] for y in range(max(0, y0 - 1), min(h, y0 + uh + 1)) for x in range(max(0, x0 - 1), min(w, x0 + uw + 1))):
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
    blobs = random_blobs(rng, W, H, 60)
    results = {}
    for conn in (4, 8):
        lab, stats = two_pass(blobs, conn)
        ref, rstats = bfs_flood_fill(blobs, conn)
        assert partition(lab) == partition(ref), conn
        assert stats['components'] == rstats['components']
        assert stats['visits'] == 2 * W * H
        assert stats['links_per_find'] < 1.5, stats['links_per_find']
        rl, rlstats = run_length_labeling(blobs, conn)
        assert partition(rl) == partition(ref), (conn, 'run-length')
        pu, pustats = pixel_union_find(blobs, conn)
        assert partition(pu) == partition(ref), (conn, 'pixel union-find')
        assert pustats['unions'] == pustats['sets'] - rstats['components']
        assert stats['unions'] == stats['provisional'] - stats['components']
        assert rlstats['unions'] == rlstats['runs'] - rlstats['components']
        ok_dfs, d = dfs_recursive(blobs, conn, 50000)
        assert ok_dfs is not None and partition(ok_dfs) == partition(ref)
        assert d['visits'] == rstats['visits'], 'same neighbor visits as BFS'
        results[conn] = (stats, rstats, rlstats, pustats, d)
    for k in (10, 25, 40):
        img = separated_disks(rng, W, H, k, 4)
        for conn in (4, 8):
            lab, stats = two_pass(img, conn)
            assert stats['components'] == k, (k, conn, stats['components'])
            assert partition(lab) == partition(bfs_flood_fill(img, conn)[0])
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

    snake_img, snake_len = snake(W, 40)
    lab, sstats = two_pass(snake_img, 4)
    assert sstats['components'] == 1
    ok_lab, dstats = dfs_recursive(snake_img, 4, 50000)
    assert ok_lab is not None and dstats['max_depth'] >= snake_len - 1, dstats
    assert partition(ok_lab) == partition(lab)
    _, dfail = dfs_recursive(snake_img, 4, 1000)
    assert dfail['failed'], 'snake overflows the default limit'
    bfs_snake, bstats = bfs_flood_fill(snake_img, 4)
    assert partition(bfs_snake) == partition(lab)

    stripes = diagonal_stripes(60, 60, 3)
    pixels = sum(sum(r) for r in stripes)
    lab4, s4 = two_pass(stripes, 4)
    lab8, s8 = two_pass(stripes, 8)
    assert s4['components'] == pixels, (s4['components'], pixels)
    stripe_count = len({(x - y) for y in range(60) for x in range(60) if stripes[y][x]})
    assert s8['components'] == stripe_count, (s8['components'], stripe_count)
    assert partition(lab8) == partition(bfs_flood_fill(stripes, 8)[0])

    u_img, placed = u_shapes(rng, W, H, 30)
    lab_u, ustats = two_pass(u_img, 4)
    assert ustats['components'] == placed
    naive_u, nstats = naive_single_pass(u_img, 4)
    assert nstats['labels'] >= 2 * placed, (nstats['labels'], placed)
    assert partition(naive_u) != partition(lab_u)
    naive_b, nbstats = naive_single_pass(blobs, 8)
    s8b = results[8][0]
    assert nbstats['labels'] > s8b['components']

    fg = sum(sum(r) for r in blobs)
    print(f'contest: 160 x 120, 60 disks, {fg:,} foreground pixels; referee BFS flood fill as a partition; currency: visits, sets, unions, finds')
    fmt = '{:>26} {:>4} {:>10} {:>8} {:>11} {:>7} {:>7} {:>10}'
    print(fmt.format('method', 'conn', 'components', 'visits', 'sets made', 'unions', 'finds', 'links/find'))
    for conn in (4, 8):
        s, r, rl, pu, d = results[conn]
        print(fmt.format('two-pass + union-find', conn, s['components'], f'{s["visits"]:,}', s['provisional'], s['unions'], f'{s["finds"]:,}', f'{s["links_per_find"]:.3f}'))
        print(fmt.format('BFS flood fill', conn, r['components'], f'{r["visits"]:,}', '-', '-', '-', f'queue max {r["max_queue"]}'))
        print(fmt.format('run-length labeling', conn, rl['components'], '-', f'{rl["runs"]} runs', rl['unions'], f'{rl["finds"]:,}', '-'))
        print(fmt.format('union-find over pixels', conn, pu['components'], '-', f'{pu["sets"]:,}', f'{pu["unions"]:,}', f'{pu["finds"]:,}', f'{pu["links_per_find"]:.3f}'))
        print(fmt.format('recursive flood fill', conn, d['components'], f'{d["visits"]:,}', '-', '-', '-', f'depth {d["max_depth"]}'))
    print(f'separated disks 10, 25, 40 exact; {checked} random image-connectivity pairs matched (two-pass, run-length, pixel union-find)')
    print(f'snake: {snake_len:,} pixels, one component; two-pass {sstats["visits"]:,} visits, {sstats["provisional"]} labels, {sstats["unions"]} unions; BFS queue max {bstats["max_queue"]}; recursion depth {dstats["max_depth"]:,}, RecursionError at 1,000')
    print(f'stripes 60 x 60 period 3: {pixels:,} components (4-conn), {stripe_count} (8-conn)')
    print(f'naive single pass: {nstats["labels"]} labels for {placed} U shapes, {nbstats["labels"]} for {s8b["components"]} blobs (8-conn); two-pass: {ustats["provisional"]} labels, {ustats["unions"]} unions')
    print(f'OK: the two-pass partition equals the flood fill on every image under both connectivities ({checked + 8} comparisons) and run-length labeling and union-find over pixels agree; unions equal labels minus components for every method; counts known by construction recovered exactly; '
          f'{s8b["links_per_find"]:.3f} parent links per find with path compression and rank; the snake of {snake_len:,} pixels needs recursion depth {dstats["max_depth"]:,} where the two passes need none; '
          f'4-connectivity {pixels:,} against 8-connectivity {stripe_count} on the stripes; the naive single pass splits every U ({nstats["labels"]} labels for {placed})')


if __name__ == '__main__':
    main()
