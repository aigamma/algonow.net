"""Practice: change one behavior of the worked example.

The worked solution always runs the full number of epochs. Make fit stop
early instead: when the mean loss improves by less than TOLERANCE from one
epoch to the next, leave the loop, so the fitted a and b are the values that
produced that last loss. Everything else stays the same.

Hint: keep the previous epoch's loss in a variable that starts as None.
Right after the new loss is measured, compare the improvement with the
tolerance and break out of the loop when it is too small; otherwise remember
the new loss and update a and b as before.

Expected: the loop stops at epoch 87, where the loss improved by 0.000497,
under the tolerance of 0.0005, with a = 2.0350 and b = -1.3266.
Run alone: python starter.py   (it prints NOT OK until the change is made)
"""
import math
import sys

SCORES = [0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.4, 0.3]   # the model's raw confidence per answer
LABELS = [1, 1, 0, 1, 0, 1, 0, 0]                     # 1 when the reviewed answer was right
START_A = 1.0          # a rescales the score, b shifts it: 1.0 and 0.0 mean "trust the score as is"
START_B = 0.0
LEARNING_RATE = 0.5
EPOCHS = 200
TOLERANCE = 0.0005     # stop once an epoch improves the loss by less than this


def sigmoid(x):
    """Squash any number into the open interval 0 to 1."""
    return 1 / (1 + math.exp(-x))


def forward(score, a, b):
    """The calibrated probability for one raw score: the model's prediction."""
    return sigmoid(a * score + b)


def log_loss(p, label):
    """How wrong one prediction is: near 0 when p agrees with the label, large when it does not."""
    if label == 1:
        return -math.log(p)
    return -math.log(1 - p)


def loss_and_gradients(scores, labels, a, b):
    """One pass over the examples: the mean loss and how it changes with a and with b."""
    total_loss = 0.0
    grad_a = 0.0
    grad_b = 0.0
    for score, label in zip(scores, labels, strict=True):
        if label not in (0, 1):
            raise ValueError(f"label {label!r} is not 0 or 1")
        p = forward(score, a, b)
        total_loss += log_loss(p, label)
        grad_a += (p - label) * score
        grad_b += p - label
    n = len(scores)
    return total_loss / n, grad_a / n, grad_b / n


def fit(scores, labels, learning_rate=0.5, epochs=200, tolerance=0.0):
    """Gradient descent: measure the loss and its gradients, step against them, repeat.
    Returns the fitted a and b and one (epoch, a, b, loss) record per epoch.
    The tolerance is not used yet: your change goes here."""
    a = START_A
    b = START_B
    history = []
    for epoch in range(1, epochs + 1):
        loss, grad_a, grad_b = loss_and_gradients(scores, labels, a, b)
        history.append((epoch, a, b, loss))
        a -= learning_rate * grad_a
        b -= learning_rate * grad_b
    return a, b, history


if __name__ == "__main__":
    a, b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS, tolerance=TOLERANCE)
    if len(history) == EPOCHS:
        print(f"NOT OK: expected the loop to stop before {EPOCHS} epochs once an epoch improved the loss by less than {TOLERANCE}, got {len(history)} epochs")
        print("Make fit compare each epoch's improvement with the tolerance and break when it is too small.")
        sys.exit(1)
    print(f"{len(SCORES)} reviewed answers, learning rate {LEARNING_RATE}, up to {EPOCHS} epochs, tolerance {TOLERANCE}")
    print(f"{'epoch':>5}  {'a':>7}  {'b':>7}  {'loss':>6}")
    for epoch, a_now, b_now, loss in history:
        if epoch == 1 or epoch % 50 == 0 or epoch == len(history):
            print(f"{epoch:>5}  {a_now:>7.4f}  {b_now:>7.4f}  {loss:>6.4f}")
    improvement = history[-2][3] - history[-1][3]
    print(f"stopped at epoch {len(history)}: the loss improved by {improvement:.6f}, under the tolerance of {TOLERANCE}")
    final_loss, _, _ = loss_and_gradients(SCORES, LABELS, a, b)
    print(f"\nfitted: a = {a:.4f}, b = {b:.4f}")
    print(f"mean loss before fitting {history[0][3]:.4f}, after {final_loss:.4f}")
    print("\nraw score  calibrated")
    for raw in [0.9, 0.7, 0.5]:
        print(f"{raw:>9.2f}  {forward(raw, a, b):>10.3f}")
    if len(history) != 87 or improvement >= TOLERANCE:
        print(f"\nNOT OK: expected the stop at epoch 87 with an improvement under {TOLERANCE}")
        sys.exit(1)
    print("\nOK")
