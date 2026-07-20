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

    print(f"OK: matches DP on 20 instances; nodes {plain[0]:,} plain -> "
          f"{bounded[0]:,} bounded on 18 items")
