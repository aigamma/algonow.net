# Puzzle 131: First fit decreasing x descending size order
# Bin packing: items of sizes in (0, 1] must be packed into as few
# unit-capacity bins as possible. First fit is the algorithm: take the
# items one at a time and put each into the first (lowest-numbered)
# bin where it fits, opening a new bin only when none does. The
# heuristic is the order: sort the items by size, largest first, so the
# big items claim bins while there is nothing to block them and the
# small items fill the gaps afterward. That single sort is the
# difference between a worst case of 1.7 x OPT (first fit in arrival
# order) and 11/9 x OPT + 6/9 (Dosa 2007, tight).
#
# Referees:
# (1) THE EXACT OPTIMUM by dynamic programming over subsets for 200
#     random 12-item instances (bins[S] = 1 + min over one-bin subsets
#     T of bins[S \ T], 3^12 submask iterations): first fit decreasing
#     must satisfy FFD <= 11/9 OPT + 6/9 on every instance, and the
#     run counts how often it is exactly optimal and its worst excess;
# (2) THE ABLATION: the same first fit in arrival order, and next fit
#     (only the current bin stays open), on the same instances against
#     the same optimum;
# (3) THE TIGHT WORST CASE, constructed: Johnson's family with items of
#     1/2+e, 1/4+2e, 1/4+e, 1/4-2e, where OPT = 9 bins (an explicit
#     packing is verified bin by bin) and FFD opens 11, the 11/9;
# (4) THE LOWER BOUND at scale: on 2,000 items FFD lands within a few
#     bins of ceil(total size), which no packing can beat;
# (5) THE INDEX: the first bin that fits found by a max-tree over bin
#     capacities (O(log n) per item) gives the identical packing to the
#     linear scan while touching a fraction of the bins.
import math
import random

SEED = 20260926


def first_fit(sizes, counter=None):
    """Bins as lists of sizes, in the order the items are given."""
    bins = []
    rem = []
    for s in sizes:
        placed = False
        for k in range(len(bins)):
            if counter is not None:
                counter[0] += 1
            if rem[k] >= s - 1e-12:
                bins[k].append(s)
                rem[k] -= s
                placed = True
                break
        if not placed:
            bins.append([s])
            rem.append(1.0 - s)
    return bins


def first_fit_decreasing(sizes, counter=None):
    return first_fit(sorted(sizes, reverse=True), counter)


def next_fit(sizes):
    bins = [[]]
    rem = 1.0
    for s in sizes:
        if s <= rem + 1e-12:
            bins[-1].append(s)
            rem -= s
        else:
            bins.append([s])
            rem = 1.0 - s
    return bins


class MaxTree:
    """A segment tree over potential bins holding each bin's remaining
    capacity; leftmost bin with capacity >= s in O(log n). Counts the
    nodes it touches."""

    def __init__(self, n):
        self.size = 1
        while self.size < n:
            self.size *= 2
        self.tree = [1.0] * (2 * self.size)
        self.touched = 0

    def first_fit_index(self, s):
        node = 1
        if self.tree[node] < s - 1e-12:
            return None
        while node < self.size:
            self.touched += 1
            left = 2 * node
            node = left if self.tree[left] >= s - 1e-12 else left + 1
        return node - self.size

    def take(self, index, s):
        node = index + self.size
        self.tree[node] -= s
        node //= 2
        while node >= 1:
            self.touched += 1
            self.tree[node] = max(self.tree[2 * node], self.tree[2 * node + 1])
            node //= 2


def first_fit_decreasing_tree(sizes):
    order = sorted(sizes, reverse=True)
    tree = MaxTree(len(order))
    bins = {}
    for s in order:
        k = tree.first_fit_index(s)
        bins.setdefault(k, []).append(s)
        tree.take(k, s)
    return [bins[k] for k in sorted(bins)], tree.touched


def optimum(sizes):
    """Exact minimum bins by subset DP; n must be small (12 here)."""
    n = len(sizes)
    full = (1 << n) - 1
    total = [0.0] * (1 << n)
    for S in range(1, 1 << n):
        low = S & -S
        total[S] = total[S ^ low] + sizes[low.bit_length() - 1]
    fits = [total[S] <= 1.0 + 1e-12 for S in range(1 << n)]
    INF = 10 ** 9
    bins = [INF] * (1 << n)
    bins[0] = 0
    for S in range(1, 1 << n):
        # iterate over submasks T of S that contain S's lowest item (so
        # each bin is enumerated once)
        low = S & -S
        rest = S ^ low
        T = rest
        best = INF
        while True:
            U = T | low
            if fits[U]:
                c = bins[S ^ U]
                if c + 1 < best:
                    best = c + 1
            if T == 0:
                break
            T = (T - 1) & rest
        bins[S] = best
    return bins[full]


def valid(bins, sizes):
    flat = sorted(s for b in bins for s in b)
    return flat == sorted(sizes) and all(sum(b) <= 1.0 + 1e-9 for b in bins)


if __name__ == '__main__':
    rng = random.Random(SEED)

    # Oracle 1 + 2: against the exact optimum on 200 small instances.
    n_small = 12
    stats = {'ffd_opt': 0, 'ff_opt': 0, 'nf_opt': 0, 'ffd_excess': 0, 'ff_excess': 0, 'nf_excess': 0, 'ffd_sum': 0, 'ff_sum': 0, 'nf_sum': 0, 'opt_sum': 0, 'ff_worse': 0}
    for _ in range(200):
        sizes = [rng.uniform(0.05, 0.95) for _ in range(n_small)]
        opt = optimum(sizes)
        ffd = first_fit_decreasing(sizes)
        ff = first_fit(sizes)
        nf = next_fit(sizes)
        assert valid(ffd, sizes) and valid(ff, sizes) and valid(nf, sizes)
        assert len(ffd) <= 11 / 9 * opt + 6 / 9 + 1e-9, (len(ffd), opt)
        assert len(ffd) >= opt and len(ff) >= opt and len(nf) >= opt
        stats['ffd_opt'] += len(ffd) == opt
        stats['ff_opt'] += len(ff) == opt
        stats['nf_opt'] += len(nf) == opt
        stats['ffd_excess'] = max(stats['ffd_excess'], len(ffd) - opt)
        stats['ff_excess'] = max(stats['ff_excess'], len(ff) - opt)
        stats['nf_excess'] = max(stats['nf_excess'], len(nf) - opt)
        stats['ffd_sum'] += len(ffd)
        stats['ff_sum'] += len(ff)
        stats['nf_sum'] += len(nf)
        stats['opt_sum'] += opt
        stats['ff_worse'] += len(ff) > len(ffd)
    assert stats['ffd_opt'] > stats['ff_opt'] > stats['nf_opt'], stats
    assert stats['ffd_sum'] < stats['ff_sum'] < stats['nf_sum']

    # Oracle 3: the tight worst case, constructed.
    e = 0.01
    worst = [0.5 + e] * 6 + [0.25 + 2 * e] * 6 + [0.25 + e] * 6 + [0.25 - 2 * e] * 12
    ffd_worst = first_fit_decreasing(worst)
    opt_packing = [[0.5 + e, 0.25 + e, 0.25 - 2 * e]] * 6 + [[0.25 + 2 * e, 0.25 + 2 * e, 0.25 - 2 * e, 0.25 - 2 * e]] * 3
    assert valid(opt_packing, worst) and len(opt_packing) == 9
    assert len(ffd_worst) == 11, len(ffd_worst)
    assert math.ceil(sum(worst) - 1e-9) <= 9
    ff_worst = first_fit(worst)                 # arrival order happens to be sorted here: identical
    nf_worst = next_fit(worst)

    # Oracle 4 + 5: scale, the lower bound, and the tree.
    big = [rng.uniform(0.01, 0.99) for _ in range(2000)]
    scan_counter = [0]
    ffd_big = first_fit_decreasing(big, scan_counter)
    tree_bins, touched = first_fit_decreasing_tree(big)
    lower = math.ceil(sum(big) - 1e-9)
    assert valid(ffd_big, big) and valid(tree_bins, big)
    assert [sorted(b) for b in ffd_big] == [sorted(b) for b in tree_bins], 'the tree must reproduce the scan exactly'
    assert lower <= len(ffd_big) <= lower * 1.05, (lower, len(ffd_big))
    assert touched < 0.2 * scan_counter[0], (touched, scan_counter[0])
    ff_big = first_fit(big)
    nf_big = next_fit(big)

    print(f'contest: 200 random instances of {n_small} items, sizes uniform in [0.05, 0.95], unit bins; referee: the exact optimum by subset DP (3^{n_small} submask steps per instance)')
    print(f"  {'method':<28} {'bins (total)':>12} {'optimal on':>10} {'worst excess':>12}   verdict")
    print(f"  {'optimum (subset DP)':<28} {stats['opt_sum']:>12} {'200 / 200':>10} {'0':>12}   the referee")
    print(f"  {'first fit decreasing':<28} {stats['ffd_sum']:>12} {str(stats['ffd_opt']) + ' / 200':>10} {stats['ffd_excess']:>12}   largest first: big items claim bins before anything blocks them")
    print(f"  {'first fit, arrival order':<28} {stats['ff_sum']:>12} {str(stats['ff_opt']) + ' / 200':>10} {stats['ff_excess']:>12}   the same rule without the sort; worse on {stats['ff_worse']} of 200")
    print(f"  {'next fit':<28} {stats['nf_sum']:>12} {str(stats['nf_opt']) + ' / 200':>10} {stats['nf_excess']:>12}   one open bin at a time")
    print(f'tight worst case (Johnson family, 30 items): OPT 9 (packing verified), FFD {len(ffd_worst)} = 11/9 OPT, next fit {len(nf_worst)}; sum of sizes {sum(worst):.2f}')
    print(f'scale (2,000 items): FFD {len(ffd_big)} bins vs lower bound ceil(sum) = {lower} ({len(ffd_big) / lower - 1:.2%} above); first fit unsorted {len(ff_big)}, next fit {len(nf_big)}; '
          f'linear scan {scan_counter[0]:,} bin checks vs max-tree {touched:,} node touches ({touched / scan_counter[0]:.1%}), identical packing')
    print(f"OK: FFD optimal on {stats['ffd_opt']} of 200 small instances with worst excess {stats['ffd_excess']} and never above 11/9 OPT + 6/9; arrival-order first fit optimal on {stats['ff_opt']}, next fit on {stats['nf_opt']}; "
          f'the Johnson family hits 11 vs 9 exactly; 2,000 items packed within {len(ffd_big) / lower - 1:.2%} of the lower bound with the tree touching {touched / scan_counter[0]:.1%} of the scan')
