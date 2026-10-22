"""Practice: change one behavior of the worked example.

The worked solution clips all the gradients together, by their global norm.
Make clip_by_group_norm clip each parameter group on its own instead: one
norm and one scale per group, each group bounded by MAX_NORM by itself.
Everything else stays the same.

Hint: inside a loop over the groups, the norm of one group is the global
norm of a list holding just that group, and the scale is the same min as
before. Append the scaled group, its norm, and its scale to three lists.

Expected: group 1 (norm 5.0) is left as it is, group 2 (norm 12.0) is scaled
by 0.4167 to [0.0, 5.0], group 3 (norm 1.0) is untouched, and the global
norm of the result is 7.1414, over the max of 5.0: each group is bounded,
the whole is not. The parameter step becomes 0.7141.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import math
import sys

GRADS = [[3.0, 4.0], [0.0, 12.0], [1.0]]          # the bad batch: one list per parameter group
PARAMS = [[0.5, -0.2], [1.0, 0.3], [0.1]]         # the parameters, the same shape as the gradients
SMALL_GRADS = [[0.3, 0.4], [0.0, 1.2], [0.1]]     # an ordinary batch, for comparison
MAX_NORM = 5.0                                     # the longest step the gradients may take
LEARNING_RATE = 0.1


def global_norm(grads):
    """The length of all the gradients taken together: the square root of the
    sum of every squared value, across every group."""
    total = 0.0
    for group in grads:
        for value in group:
            total += value * value
    return math.sqrt(total)


def clip_by_global_norm(grads, max_norm):
    """Scale every gradient by the same factor when their global norm is over
    max_norm. Returns the new lists, the norm before clipping, and the scale."""
    if max_norm <= 0:
        raise ValueError(f"max_norm must be positive, got {max_norm}")
    norm = global_norm(grads)
    scale = min(1.0, max_norm / (norm + 1e-6))   # 1.0 leaves a small batch alone; the millionth avoids dividing by zero
    clipped = []
    for group in grads:
        new_group = []
        for value in group:
            new_group.append(value * scale)
        clipped.append(new_group)
    return clipped, norm, scale


def clip_by_group_norm(grads, max_norm):
    """Clip each group to max_norm on its own: one norm and one scale per group.
    Returns the new lists, the norm of each group, and the scale of each group.
    Your change goes here: as shipped it clips by the global norm and repeats
    that single scale for every group."""
    clipped, norm, scale = clip_by_global_norm(grads, max_norm)
    norms = []
    scales = []
    for group in grads:
        norms.append(global_norm([group]))
        scales.append(scale)
    return clipped, norms, scales


def apply_update(params, grads, learning_rate):
    """One optimizer step: each parameter moves against its gradient. Returns
    new lists; the inputs are not changed."""
    if len(params) != len(grads):
        raise ValueError(f"{len(params)} parameter groups but {len(grads)} gradient groups")
    updated = []
    for index, (group, group_grads) in enumerate(zip(params, grads), start=1):
        if len(group) != len(group_grads):
            raise ValueError(f"parameter group {index} has {len(group)} values but {len(group_grads)} gradients")
        new_group = []
        for value, grad in zip(group, group_grads):
            new_group.append(value - learning_rate * grad)
        updated.append(new_group)
    return updated


def distance(before, after):
    """How far the parameters moved: the global norm of the differences."""
    differences = []
    for group_before, group_after in zip(before, after):
        group = []
        for value_before, value_after in zip(group_before, group_after):
            group.append(value_after - value_before)
        differences.append(group)
    return global_norm(differences)


def show(group):
    """A group of numbers with four decimals, for the tables."""
    parts = []
    for value in group:
        parts.append(f"{value:.4f}")
    return "[" + ", ".join(parts) + "]"


if __name__ == "__main__":
    by_group, group_norms, group_scales = clip_by_group_norm(GRADS, MAX_NORM)
    if round(by_group[1][1], 4) != 5.0 or round(global_norm([by_group[0]]), 4) != 5.0:
        print(f"NOT OK: expected group 2 clipped to 5.0 and group 1 left at norm 5.0, got {show(by_group[1])} and norm {global_norm([by_group[0]]):.4f}")
        print("Make clip_by_group_norm compute a norm and a scale for each group on its own.")
        sys.exit(1)

    values = 0
    for group in GRADS:
        values += len(group)
    print(f"{len(GRADS)} parameter groups, {values} gradient values, max norm {MAX_NORM}, learning rate {LEARNING_RATE}")

    print("\nbatch 1 (the bad batch)")
    clipped, norm, scale = clip_by_global_norm(GRADS, MAX_NORM)
    print(f"global norm {norm:.4f}, over the max: scale {scale:.4f}")
    print(f"{'group':>5}  {'gradient':<18}  clipped")
    for index, (group, new_group) in enumerate(zip(GRADS, clipped), start=1):
        print(f"{index:>5}  {str(group):<18}  {show(new_group)}")
    print(f"norm after clipping {global_norm(clipped):.4f}")
    step_without = distance(PARAMS, apply_update(PARAMS, GRADS, LEARNING_RATE))
    step_with = distance(PARAMS, apply_update(PARAMS, clipped, LEARNING_RATE))
    print(f"parameter step: {step_without:.4f} without clipping, {step_with:.4f} with clipping")

    print(f"\nper-group clipping, max norm {MAX_NORM} for each group on its own")
    print(f"{'group':>5}  {'norm':>7}  {'scale':>6}  clipped")
    for index, (group_norm, group_scale, new_group) in enumerate(zip(group_norms, group_scales, by_group), start=1):
        print(f"{index:>5}  {group_norm:>7.4f}  {group_scale:>6.4f}  {show(new_group)}")
    print(f"global norm after per-group clipping {global_norm(by_group):.4f}, over the max of {MAX_NORM}")
    step_by_group = distance(PARAMS, apply_update(PARAMS, by_group, LEARNING_RATE))
    print(f"parameter step: {step_by_group:.4f} with per-group clipping")

    print("\nbatch 2 (an ordinary batch)")
    small_clipped, small_norm, small_scale = clip_by_global_norm(SMALL_GRADS, MAX_NORM)
    print(f"global norm {small_norm:.4f}, under the max: scale {small_scale:.4f}")
    print(f"gradients unchanged: {small_clipped == SMALL_GRADS}")
    small_step = distance(PARAMS, apply_update(PARAMS, small_clipped, LEARNING_RATE))
    print(f"parameter step: {small_step:.4f} (the same either way)")

    try:
        apply_update(PARAMS, [[3.0, 4.0], [12.0], [1.0]], LEARNING_RATE)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert abs(global_norm(clipped) - MAX_NORM) < 1e-5, "the clipped gradients are exactly max_norm long"
    assert global_norm(by_group) > MAX_NORM, "per-group clipping bounds each group, not the whole"
    assert step_with < step_by_group < step_without, "per-group clipping shortens the step less than global clipping"
    print("\nOK")
