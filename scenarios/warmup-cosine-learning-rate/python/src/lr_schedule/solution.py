"""Worked example: shape a learning-rate schedule, linear warmup then cosine decay.

Orbit's fine-tune of its support model diverged in its first twenty steps:
the loss spiked and never recovered, because training began at the full
learning rate on freshly initialized adapter weights. The fix is a schedule.
For the first steps the rate climbs in a straight line from zero to the peak
(warmup); after that it falls along a cosine curve from the peak to zero
(decay). A trainer reads this function every step and sets the optimizer's
learning rate from it. This file is the schedule, not the trainer, so it can
be printed and checked before a GPU minute is spent.

Input: the total number of steps, the number of warmup steps, and the peak
rate. Output: the rate for any step from 0 to total_steps, as a number.
Run alone: python solution.py
"""
import math

TOTAL_STEPS = 100   # steps 0 to 100: a run of 100 updates uses 0 to 99, and the decay lands at 100
WARMUP_STEPS = 10
PEAK = 2e-4         # 0.0002 in scientific notation: two times ten to the minus four


def learning_rate(step, total_steps, warmup_steps, peak):
    """The rate for one step: linear warmup to the peak, then cosine decay to zero."""
    if warmup_steps >= total_steps:
        raise ValueError(f"warmup of {warmup_steps} steps leaves no steps for the decay in {total_steps}")
    if step < 0 or step > total_steps:
        raise ValueError(f"step {step} is outside 0 to {total_steps}")
    if step < warmup_steps:
        return peak * step / warmup_steps
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return peak * 0.5 * (1 + math.cos(math.pi * progress))


if __name__ == "__main__":
    print(f"schedule: {TOTAL_STEPS} steps, warmup {WARMUP_STEPS}, peak {PEAK:.2e}")
    rows = []
    for step in range(0, TOTAL_STEPS + 1):
        rows.append((step, learning_rate(step, TOTAL_STEPS, WARMUP_STEPS, PEAK)))

    print("\nstep  rate      of peak")
    for step, rate in rows:
        if step % 10 == 0 or step == 5:
            print(f"{step:4}  {rate:.2e}  {rate / PEAK:4.0%}")

    peak_step, peak_rate = rows[0]
    for step, rate in rows:
        if rate > peak_rate:
            peak_step, peak_rate = step, rate
    print(f"\npeak reached at step {peak_step}")

    midpoint = WARMUP_STEPS + (TOTAL_STEPS - WARMUP_STEPS) // 2
    print(f"midpoint of the decay, step {midpoint}: {learning_rate(midpoint, TOTAL_STEPS, WARMUP_STEPS, PEAK):.2e} (half the peak)")

    rates = []
    for step, rate in rows:
        rates.append(rate)
    assert max(rates) <= PEAK and min(rates) >= 0.0, "a rate left the band between 0 and the peak"
    print(f"rates stay within 0 and the peak over all {len(rates)} steps")

    try:
        learning_rate(0, TOTAL_STEPS, TOTAL_STEPS, PEAK)
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert peak_step == WARMUP_STEPS and peak_rate == PEAK, "the peak arrives exactly at the end of warmup"
    assert abs(learning_rate(midpoint, TOTAL_STEPS, WARMUP_STEPS, PEAK) - PEAK / 2) < 1e-12, "the midpoint is half the peak"
    assert learning_rate(TOTAL_STEPS, TOTAL_STEPS, WARMUP_STEPS, PEAK) == 0.0, "the decay lands at zero"
    print("\nOK")
