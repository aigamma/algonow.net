"""Worked example: calibrate model confidence with a hand-written training loop.

Orbit's assistant shows a confidence score with each answer and escalates to
a human when the score is below 0.6. A week of reviewed answers showed that
answers scored 0.9 were right about seven times in ten, so the number on the
screen meant nothing. This file fits a two-parameter calibration (Platt
scaling) to scored answers by gradient descent, written out by hand: the
same forward, loss, gradient, update loop that a framework such as PyTorch
runs for you, with every step visible.

Input: raw confidence scores and whether each reviewed answer was right.
Output: two numbers a and b such that sigmoid(a * score + b) is a calibrated
probability, plus the loss at every epoch. Run alone: python solution.py
"""
import math

SCORES = [0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.4, 0.3]   # the model's raw confidence per answer
LABELS = [1, 1, 0, 1, 0, 1, 0, 0]                     # 1 when the reviewed answer was right
START_A = 1.0          # a rescales the score, b shifts it: 1.0 and 0.0 mean "trust the score as is"
START_B = 0.0
LEARNING_RATE = 0.5
EPOCHS = 200


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


def fit(scores, labels, learning_rate=0.5, epochs=200):
    """Gradient descent: measure the loss and its gradients, step against them, repeat.
    Returns the fitted a and b and one (epoch, a, b, loss) record per epoch."""
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
    a, b, history = fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)
    print(f"{len(SCORES)} reviewed answers, learning rate {LEARNING_RATE}, {EPOCHS} epochs")
    print(f"{'epoch':>5}  {'a':>7}  {'b':>7}  {'loss':>6}")
    for epoch, a_now, b_now, loss in history:
        if epoch == 1 or epoch % 50 == 0:
            print(f"{epoch:>5}  {a_now:>7.4f}  {b_now:>7.4f}  {loss:>6.4f}")
    final_loss, _, _ = loss_and_gradients(SCORES, LABELS, a, b)
    print(f"\nfitted: a = {a:.4f}, b = {b:.4f}")
    print(f"mean loss before fitting {history[0][3]:.4f}, after {final_loss:.4f}")
    print("\nraw score  calibrated")
    for raw in [0.9, 0.7, 0.5]:
        print(f"{raw:>9.2f}  {forward(raw, a, b):>10.3f}")

    try:
        fit(SCORES, LABELS[:7])
    except ValueError as error:
        print(f"\nrejected: {error}")

    assert final_loss < history[0][3], "fitting must reduce the loss"
    assert forward(0.9, a, b) < 0.9, "a raw 0.9 was never 90 percent right"
    assert 2.0 < a < 4.0 and -3.0 < b < -1.0, "the fit rescales and shifts the score"
    print("\nOK")
