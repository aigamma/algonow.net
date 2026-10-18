"""Worked example: build distillation targets from a teacher with temperature softmax.

Orbit replaces its large assistant with a small router model that sorts
tickets into billing, access, outage, or feature. Trained on hard labels
alone, the student stalled: a label says "outage" and nothing about how close
"access" was. The large model knows that. Its logits rank the wrong answers
too, and a temperature makes that ranking visible as probabilities. This file
turns the teacher's logits into soft targets and scores a student against
them, in plain Python; in a framework the same two steps are a log softmax
over the temperature and a KL divergence against the softened teacher,
scaled by the temperature squared.

Input: a list of logits per example for the teacher and for the student, one
number per class, and the gold label. Output: the teacher's probabilities at
temperature 1 and at the distillation temperature, and the student's soft and
hard losses. Run alone: python solution.py
"""
import math

CLASSES = ["billing", "access", "outage", "feature"]
TEACHER_LOGITS = [
    [2.0, 0.5, 3.5, -1.0],    # example 1: a clear outage
    [4.0, 1.0, 0.0, -2.0],    # example 2: a clear billing question
    [0.5, 2.5, 2.0, -0.5],    # example 3: access, with outage close behind
]
STUDENT_LOGITS = [
    [1.0, 1.0, 2.0, 0.0],
    [2.5, 1.5, 0.5, -1.0],
    [0.5, 1.5, 1.5, 0.0],     # the student cannot separate access from outage yet
]
LABELS = ["outage", "billing", "access"]
TEMPERATURE = 2.0   # the distillation temperature: 1 keeps the teacher's peaks, higher flattens them


def check_row(logits):
    """One logit per class, or the row is rejected."""
    if len(logits) != len(CLASSES):
        raise ValueError(f"expected {len(CLASSES)} logits, one per class, got {len(logits)}")


def softmax(logits, temperature):
    """Turn logits into probabilities that sum to 1. A higher temperature flattens them."""
    if temperature <= 0:
        raise ValueError(f"temperature must be positive, got {temperature}")
    scaled = []
    for value in logits:
        scaled.append(value / temperature)
    largest = max(scaled)
    exponentials = []
    for value in scaled:
        exponentials.append(math.exp(value - largest))   # the max trick: the biggest exponent is exp(0) = 1
    total = sum(exponentials)
    probabilities = []
    for value in exponentials:
        probabilities.append(value / total)
    return probabilities


def cross_entropy(targets, probabilities):
    """How surprised the probabilities are by the targets: minus the sum of target times log probability."""
    total = 0.0
    for target, probability in zip(targets, probabilities, strict=True):
        total -= target * math.log(probability)
    return total


def kl_divergence(targets, probabilities):
    """How far the probabilities are from the targets: the sum of target times
    log(target over probability). Zero when the two distributions match."""
    total = 0.0
    for target, probability in zip(targets, probabilities, strict=True):
        total += target * math.log(target / probability)
    return total


def one_hot(label):
    """The hard target: 1.0 on the gold class, 0.0 on every other class."""
    targets = []
    for name in CLASSES:
        if name == label:
            targets.append(1.0)
        else:
            targets.append(0.0)
    return targets


def hard_loss(student_logits, label):
    """The usual training loss: cross-entropy against the one-hot label at temperature 1."""
    check_row(student_logits)
    return cross_entropy(one_hot(label), softmax(student_logits, 1.0))


def soft_loss(teacher_logits, student_logits, temperature):
    """The distillation loss: how far the student's softened distribution is from the
    teacher's, scaled by temperature squared so its gradients stay on the hard loss's scale."""
    check_row(teacher_logits)
    check_row(student_logits)
    targets = softmax(teacher_logits, temperature)
    predicted = softmax(student_logits, temperature)
    return kl_divergence(targets, predicted) * temperature ** 2


def formatted(values):
    """Probabilities as a row of three-decimal numbers."""
    parts = []
    for value in values:
        parts.append(f"{value:.3f}")
    return "  ".join(parts)


if __name__ == "__main__":
    print("classes: " + "  ".join(CLASSES))
    soft_losses = []
    hard_losses = []
    for number in range(len(LABELS)):
        teacher = TEACHER_LOGITS[number]
        student = STUDENT_LOGITS[number]
        label = LABELS[number]
        sharp = softmax(teacher, 1.0)
        soft = softmax(teacher, TEMPERATURE)
        soft_losses.append(soft_loss(teacher, student, TEMPERATURE))
        hard_losses.append(hard_loss(student, label))
        print(f"\nexample {number + 1}, gold label {label}")
        print(f"  teacher at T=1: {formatted(sharp)}")
        print(f"  teacher at T={TEMPERATURE:g}: {formatted(soft)}")
        print(f"  student soft loss at T={TEMPERATURE:g}: {soft_losses[-1]:.3f}   hard loss: {hard_losses[-1]:.3f}")
        assert abs(sum(sharp) - 1.0) < 1e-9 and abs(sum(soft) - 1.0) < 1e-9, "probabilities sum to 1"
        assert max(soft) < max(sharp), "a higher temperature flattens the distribution"
        assert soft.index(max(soft)) == sharp.index(max(sharp)), "the temperature never changes the top class"
        assert soft_losses[-1] > 0 and hard_losses[-1] > 0, "losses are positive"
    print(f"\nmean soft loss: {sum(soft_losses) / len(soft_losses):.3f}   mean hard loss: {sum(hard_losses) / len(hard_losses):.3f}")

    try:
        soft_loss([1.0, 2.0, 3.0], STUDENT_LOGITS[0], TEMPERATURE)
    except ValueError as error:
        print(f"\nrejected: {error}")
    print("\nOK")
