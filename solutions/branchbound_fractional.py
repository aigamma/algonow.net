# Puzzle 05: Branch and bound x fractional relaxation bound
# The 0/1 knapsack: exact answers without reading the whole 2^n tree.
import random


def fractional_bound(items, i, weight_left, value_so_far):
    """Optimistic ceiling for the subtree at item i.

    Relax the one hard rule: allow fractions of items. Greedily pour the
    remaining items, densest first, and cut the last one to fit. No 0/1
    packing of these items can beat this number, which is what makes it a
    sound pruning certificate (items must be pre-sorted by value density).
    """
    bound = value_so_far
    for w, v in items[i:]:
        if w <= weight_left:
            weight_left -= w
            bound += v
        else:
            bound += v * (weight_left / w)
            break
    return bound


def knapsack_branch_and_bound(items, capacity, counter=None, use_bound=True):
    """Return (best_value, chosen_indices) for the 0/1 knapsack.

    The algorithm is depth-first branch and bound over include/exclude
    decisions. The heuristic is the fractional relaxation: before descending
    into a subtree, compute its optimistic ceiling; if the ceiling cannot
    beat the best complete packing already in hand, the subtree is discarded
    unopened. Sorting by density makes the ceiling tight, so pruning bites.
    """
    order = sorted(range(len(items)), key=lambda k: items[k][1] / items[k][0], reverse=True)
    sorted_items = [items[k] for k in order]
    best = {'value': 0, 'chosen': []}

    def dfs(i, weight_left, value, chosen):
        if counter is not None:
            counter[0] += 1
        if value > best['value']:
            best['value'] = value
            best['chosen'] = chosen[:]
        if i == len(sorted_items):
            return
        if use_bound and fractional_bound(sorted_items, i, weight_left, value) <= best['value']:
            return                        # the discard: ceiling cannot beat the bag in hand
        w, v = sorted_items[i]
        if w <= weight_left:              # branch 1: include item i
            chosen.append(order[i])
            dfs(i + 1, weight_left - w, value + v, chosen)
            chosen.pop()
        dfs(i + 1, weight_left, value, chosen)   # branch 2: exclude item i

    dfs(0, capacity, 0, [])
    return best['value'], sorted(best['chosen'])


def knapsack_dp(items, capacity):
    """Independent exact oracle: classic O(n * capacity) dynamic programming."""
    table = [0] * (capacity + 1)
    for w, v in items:
        for c in range(capacity, w - 1, -1):
            table[c] = max(table[c], table[c - w] + v)
    return table[capacity]


# ---------------------------------------------------------------- the rivals


def knapsack_greedy_density(items, capacity):
    """Take items by value-to-weight ratio until nothing else fits.

    This is the fractional relaxation rounded down, which is exactly the
    bound this unit uses. As an ANSWER it has no guarantee at all: the
    classic counterexample is one dense pebble crowding out the gold bar.
    """
    order = sorted(range(len(items)), key=lambda k: items[k][1] / items[k][0],
                   reverse=True)
    total_w, total_v, chosen = 0, 0, []
    for k in order:
        w, v = items[k]
        if total_w + w <= capacity:
            total_w += w
            total_v += v
            chosen.append(k)
    return total_v, sorted(chosen)


def knapsack_greedy_plus_best_single(items, capacity):
    """Greedy density, or the single most valuable item that fits, whichever
    is better.

    A one-line repair with a real theorem behind it: this is a 1/2
    approximation, so it can never return less than half the optimum. The
    contrast with plain greedy is the whole lesson about approximation
    guarantees being cheap when you know where the bad case lives.
    """
    gv, gc = knapsack_greedy_density(items, capacity)
    best_single, best_k = 0, None
    for k, (w, v) in enumerate(items):
        if w <= capacity and v > best_single:
            best_single, best_k = v, k
    if best_single > gv:
        return best_single, [best_k]
    return gv, gc


def knapsack_exhaustive(items, capacity, counter=None):
    """Every subset, no pruning: the honest exponential baseline."""
    n = len(items)
    best_v, best_set = 0, []
    for mask in range(1 << n):
        if counter is not None:
            counter[0] += 1
        w = v = 0
        chosen = []
        for k in range(n):
            if mask >> k & 1:
                w += items[k][0]
                v += items[k][1]
                chosen.append(k)
                if w > capacity:
                    break
        if w <= capacity and v > best_v:
            best_v, best_set = v, chosen
    return best_v, best_set


def contest(n=18, seed=2026):
    """Race every method on one shared instance and return the numbers."""
    rng = random.Random(seed)
    items = [(rng.randint(3, 30), rng.randint(5, 60)) for _ in range(n)]
    capacity = int(sum(w for w, _ in items) * 0.4)
    optimum = knapsack_dp(items, capacity)

    rows = []

    c = [0]
    v, _ = knapsack_exhaustive(items, capacity, counter=c)
    rows.append(("Exhaustive subsets", c[0], v))

    c = [0]
    v, _ = knapsack_branch_and_bound(items, capacity, counter=c, use_bound=False)
    rows.append(("Branch and bound, no bound", c[0], v))

    c = [0]
    v, _ = knapsack_branch_and_bound(items, capacity, counter=c, use_bound=True)
    rows.append(("Branch and bound x fractional bound", c[0], v))

    v, _ = knapsack_greedy_density(items, capacity)
    rows.append(("Greedy by density", len(items), v))

    v, _ = knapsack_greedy_plus_best_single(items, capacity)
    rows.append(("Greedy or best single item", len(items), v))

    rows.append(("Dynamic programming", len(items) * capacity, optimum))

    return items, capacity, optimum, rows


if __name__ == "__main__":
    rng = random.Random(2026)

    # Oracle 1: on twenty random instances, branch and bound must match the
    # dynamic-programming value exactly, and the chosen items must be a real
    # packing: within capacity, with the claimed value.
    for trial in range(20):
        n = rng.randint(8, 16)
        items = [(rng.randint(3, 30), rng.randint(5, 60)) for _ in range(n)]
        capacity = int(sum(w for w, _ in items) * 0.4)
        value, chosen = knapsack_branch_and_bound(items, capacity)
        assert value == knapsack_dp(items, capacity), f"trial {trial}: value mismatch"
        assert sum(items[k][0] for k in chosen) <= capacity, f"trial {trial}: overweight"
        assert sum(items[k][1] for k in chosen) == value, f"trial {trial}: value miscount"

    # Oracle 2: the bound must earn its keep. On one 18-item instance, count
    # nodes with and without pruning; bounded search must visit far fewer.
    items = [(rng.randint(3, 30), rng.randint(5, 60)) for _ in range(18)]
    capacity = int(sum(w for w, _ in items) * 0.4)
    bounded, plain = [0], [0]
    v1, _ = knapsack_branch_and_bound(items, capacity, counter=bounded, use_bound=True)
    v2, _ = knapsack_branch_and_bound(items, capacity, counter=plain, use_bound=False)
    assert v1 == v2 == knapsack_dp(items, capacity)
    assert bounded[0] * 10 < plain[0], (
        f"expected pruning to cut nodes by >10x: {bounded[0]} vs {plain[0]}"
    )

    # Oracle 3: the ceiling really is a ceiling. For assorted prefixes, the
    # fractional bound must never sit below the true best completion.
    order = sorted(range(len(items)), key=lambda k: items[k][1] / items[k][0], reverse=True)
    sitems = [items[k] for k in order]
    for i in (0, 5, 9, 14):
        true_best = knapsack_dp(sitems[i:], capacity)
        assert fractional_bound(sitems, i, capacity, 0) >= true_best - 1e-9, (
            f"bound at {i} undercuts the true optimum"
        )

    # Oracle 4: the published contest. Every exact method must agree with the
    # dynamic-programming optimum, and neither greedy may exceed it.
    citems, cap, optimum, rows = contest()
    by_name = {name: (work, value) for name, work, value in rows}
    for exact in ("Exhaustive subsets", "Branch and bound, no bound",
                  "Branch and bound x fractional bound", "Dynamic programming"):
        assert by_name[exact][1] == optimum, f"{exact} disagreed with the optimum"
    for approx in ("Greedy by density", "Greedy or best single item"):
        assert by_name[approx][1] <= optimum, f"{approx} beat the optimum"
    assert (by_name["Branch and bound x fractional bound"][0]
            < by_name["Branch and bound, no bound"][0]
            < by_name["Exhaustive subsets"][0]), "unexpected work ordering"
    assert by_name["Greedy or best single item"][1] >= optimum / 2, (
        "the 1/2 approximation guarantee must hold"
    )

    print(f"contest on {len(citems)} items, capacity {cap}, optimum {optimum}:")
    for name, work, value in rows:
        gap = (1 - value / optimum) * 100
        print(f"  {name:<36} work {work:>9,}   value {value:>5}   gap {gap:5.2f}%")
    print(f"OK: matches DP on 20 instances; nodes {plain[0]:,} plain -> "
          f"{bounded[0]:,} bounded on 18 items")
