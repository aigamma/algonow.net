"""Worked example: clip gradients by their global norm before the update.

Orbit's fine-tune hit NaN at step three hundred. One bad batch produced
gradients ten times larger than usual, the update stepped ten times as far
as it should have, and the loss never recovered. Global-norm clipping
measures the length of all the gradients taken together and, when that
length is over a maximum, scales every gradient by the same factor so the
step is at most the maximum long while its direction is unchanged. This is
the operation a framework's clip-grad-norm call performs, written out.

Input: the gradients of one training step, one list per parameter group,
the parameters themselves, the maximum norm, and the learning rate.
Output: the clipped gradients, the norm before and after, the scale, and the
updated parameters. Run alone: python solution.py
"""
import math

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
    assert abs(clipped[1][1] / clipped[0][0] - 12.0 / 3.0) < 1e-9, "the direction is unchanged"
    assert small_clipped == SMALL_GRADS and small_scale == 1.0, "a small batch passes through"
    assert step_with < step_without, "clipping shortens the step"
    print("\nOK")
