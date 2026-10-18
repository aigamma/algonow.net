"""Answer to the practice variation: the peak is held for hold_steps after
warmup, and the cosine decay runs over the steps that remain. Everything
outside the marked region is the practice starter, unchanged.
Run alone: python practice_answer.py
"""
import math
import sys

TOTAL_STEPS = 100   # steps 0 to 100: a run of 100 updates uses 0 to 99, and the decay lands at 100
WARMUP_STEPS = 10
HOLD_STEPS = 20
PEAK = 2e-4         # 0.0002 in scientific notation: two times ten to the minus four


# --- answer begins ---
def learning_rate(step, total_steps, warmup_steps, hold_steps, peak):
    """The rate for one step: linear warmup to the peak, a hold at the peak,
    then cosine decay to zero over the steps that remain."""
    if warmup_steps + hold_steps >= total_steps:
        raise ValueError(f"warmup of {warmup_steps} and hold of {hold_steps} leave no steps for the decay in {total_steps}")
    if step < 0 or step > total_steps:
        raise ValueError(f"step {step} is outside 0 to {total_steps}")
    if step < warmup_steps:
        return peak * step / warmup_steps
    if step < warmup_steps + hold_steps:
        return peak                                      # the new phase: one more early return
    progress = (step - warmup_steps - hold_steps) / (total_steps - warmup_steps - hold_steps)
    return peak * 0.5 * (1 + math.cos(math.pi * progress))
# --- answer ends ---


if __name__ == "__main__":
    probe = learning_rate(25, TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK)
    if probe != PEAK:
        print(f"NOT OK: expected the peak {PEAK:.2e} at step 25 with a hold of {HOLD_STEPS} steps, got {probe:.2e}")
        print("Make learning_rate hold the peak for hold_steps after warmup before the decay begins.")
        sys.exit(1)
    print(f"schedule: {TOTAL_STEPS} steps, warmup {WARMUP_STEPS}, hold {HOLD_STEPS}, peak {PEAK:.2e}")
    rows = []
    for step in range(0, TOTAL_STEPS + 1):
        rows.append((step, learning_rate(step, TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK)))

    print("\nstep  rate      of peak")
    for step, rate in rows:
        if step % 10 == 0 or step == 5:
            print(f"{step:4}  {rate:.2e}  {rate / PEAK:4.0%}")

    first_peak = None
    last_peak = None
    for step, rate in rows:
        if rate == PEAK:
            if first_peak is None:
                first_peak = step
            last_peak = step
    print(f"\npeak held from step {first_peak} to step {last_peak}")

    midpoint = WARMUP_STEPS + HOLD_STEPS + (TOTAL_STEPS - WARMUP_STEPS - HOLD_STEPS) // 2
    print(f"midpoint of the decay, step {midpoint}: {learning_rate(midpoint, TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK):.2e} (half the peak)")

    rates = []
    for step, rate in rows:
        rates.append(rate)
    if max(rates) > PEAK or min(rates) < 0.0:
        print("\nNOT OK: a rate left the band between 0 and the peak")
        sys.exit(1)
    print(f"rates stay within 0 and the peak over all {len(rates)} steps")

    if (first_peak, last_peak) != (WARMUP_STEPS, WARMUP_STEPS + HOLD_STEPS):
        print(f"\nNOT OK: the peak should be held from step {WARMUP_STEPS} to step {WARMUP_STEPS + HOLD_STEPS}")
        sys.exit(1)
    if abs(learning_rate(midpoint, TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK) - PEAK / 2) > 1e-12:
        print("\nNOT OK: the decay midpoint should be half the peak")
        sys.exit(1)
    if learning_rate(TOTAL_STEPS, TOTAL_STEPS, WARMUP_STEPS, HOLD_STEPS, PEAK) != 0.0:
        print("\nNOT OK: the decay should still land at zero on the last step")
        sys.exit(1)
    print("\nOK")
