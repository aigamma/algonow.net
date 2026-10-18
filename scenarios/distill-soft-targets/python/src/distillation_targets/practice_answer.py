"""Answer to the practice variation: the distillation loss blends the soft loss
and the hard loss with the weight alpha. Everything outside the marked region
is the practice starter, unchanged. Run alone: python practice_answer.py
"""
import math
import sys

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
ALPHA = 0.7         # the weight of the soft loss in the blend; the hard loss gets the rest


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


# --- answer begins ---
def distillation_loss(teacher_logits, student_logits, label, temperature, alpha):
    """alpha times the soft loss plus (1 minus alpha) times the hard loss."""
    soft = soft_loss(teacher_logits, student_logits, temperature)
    hard = hard_loss(student_logits, label)
    return alpha * soft + (1 - alpha) * hard
# --- answer ends ---


if __name__ == "__main__":
    soft_losses = []
    hard_losses = []
    blended = []
    for number in range(len(LABELS)):
        teacher = TEACHER_LOGITS[number]
        student = STUDENT_LOGITS[number]
        label = LABELS[number]
        soft_losses.append(soft_loss(teacher, student, TEMPERATURE))
        hard_losses.append(hard_loss(student, label))
        blended.append(distillation_loss(teacher, student, label, TEMPERATURE, ALPHA))
    mean_soft = sum(soft_losses) / len(soft_losses)
    mean_hard = sum(hard_losses) / len(hard_losses)
    mean_blended = sum(blended) / len(blended)
    expected_mean = ALPHA * mean_soft + (1 - ALPHA) * mean_hard
    if abs(mean_blended - expected_mean) > 1e-9:
        print(f"NOT OK: expected the mean blended loss {expected_mean:.3f} at alpha {ALPHA}, got {mean_blended:.3f}")
        print("Make distillation_loss return alpha times the soft loss plus (1 - alpha) times the hard loss.")
        sys.exit(1)
    print("classes: " + "  ".join(CLASSES))
    print(f"blend: alpha {ALPHA} on the soft loss, {1 - ALPHA:.1f} on the hard loss")
    for number in range(len(LABELS)):
        print(f"\nexample {number + 1}, gold label {LABELS[number]}: "
              f"soft {soft_losses[number]:.3f}   hard {hard_losses[number]:.3f}   blended {blended[number]:.3f}")
    print(f"\nmean soft loss: {mean_soft:.3f}   mean hard loss: {mean_hard:.3f}   mean blended loss: {mean_blended:.3f}")
    print("\nOK")
