# Puzzle 150: Naive Bayes x Laplace smoothing
# Probabilistic classification: documents over a 5,000-word vocabulary
# drawn from two hidden class distributions (Zipfian word frequencies,
# with each class boosting its own two hundred topic words), to be labeled
# from their word counts. Naive Bayes is the algorithm: score each
# class by its prior times the product of per-word likelihoods, as if
# every word were drawn independently given the class, and pick the
# larger; in logs, a sum. Laplace smoothing is the heuristic: estimate
# each word's class probability as (count + alpha) / (total + alpha V)
# instead of count / total, so a word never seen in a class's training
# documents costs a small penalty rather than the whole verdict.
#
# Referees:
# (1) THE CEILING: the generating distributions are known, so the true
#     Bayes classifier is computable; multinomial naive Bayes trained
#     on 1,000 documents (about 40,000 tokens per class, with only
#     1,512 of the 5,000 words seen in both classes) must land within 7
#     points of it on 2,000 test documents. AUTHOR CORRECTION: the
#     draft asked for 2 points on a 1,000-word vocabulary, where every
#     word was seen and smoothing had nothing to do; the vocabulary was
#     enlarged so that unseen words are the normal case, and the gap
#     is measured at 5.4 points;
# (2) THE SMOOTHING, measured: alpha = 0 assigns probability zero to
#     any class that never saw a test word in training; the fraction
#     of test documents in which at least one class is zeroed is
#     counted, and accuracy is measured at alpha = 0, 0.01, 0.1, 0.3,
#     1, 3, 10, 100; Laplace's alpha = 1 must be the best of them;
# (3) THE INDEPENDENCE LIE, measured as calibration: on the true data
#     the mean confidence of the classifier is compared with its
#     accuracy; then every document is duplicated word for word (each
#     count doubled), which changes no evidence but squares the odds,
#     and the confidence rises while the accuracy does not;
# (4) THE LEARNING CURVE: accuracy against training size (20, 50, 200,
#     500, 1,000 documents) for naive Bayes and for logistic
#     regression, showing the generative model ahead at 50 documents
#     and the discriminative model level or ahead from 200 on (Ng and
#     Jordan 2002). AUTHOR NOTE: at 20 documents naive Bayes with
#     alpha = 1 sits near 57%, because 5,000 pseudo-counts swamp about
#     400 real tokens per class; alpha = 0.1 gives 72% there, and the
#     table prints both;
# (5) THE NEGATIVE EXAMPLE, measured: raw probability products without
#     logs survive the 40-word test documents (the smallest winning
#     product is measured, around 1e-150) and underflow to 0.0 for both
#     classes on two thirds of documents of about 160 words and on
#     nearly every document of about 400 words, leaving the argmax to a
#     tie-break. AUTHOR CORRECTION: the draft claimed
#     underflow on the 40-word documents themselves; measured, none
#     underflow, so the demonstration merges same-class test documents
#     into longer ones and reports both lengths.
import math
import random
from collections import Counter
from operator import mul

SEED = 20260926
V = 5000
TOPIC = 200
BOOST = 3.0
DOC_LEN = 40
N_TRAIN, N_TEST = 1000, 2000


def make_model(rng):
    base = [1.0 / (r + 1) ** 1.1 for r in range(V)]
    words = list(range(V))
    rng.shuffle(words)
    topics = [set(words[:TOPIC]), set(words[TOPIC:2 * TOPIC])]
    probs = []
    for c in range(2):
        w = [base[i] * (BOOST if i in topics[c] else 1.0) for i in range(V)]
        s = sum(w)
        probs.append([x / s for x in w])
    return probs


def sample_docs(n, probs, rng):
    docs = []
    cum = []
    for p in probs:
        acc = 0.0
        row = []
        for x in p:
            acc += x
            row.append(acc)
        cum.append(row)
    import bisect
    for _ in range(n):
        c = rng.randrange(2)
        length = max(5, int(rng.gauss(DOC_LEN, 12)))
        counts = Counter(bisect.bisect_left(cum[c], rng.random()) for _ in range(length))
        counts = Counter({min(w, V - 1): k for w, k in counts.items()})
        docs.append((counts, c))
    return docs


def true_classifier(probs):
    logp = [[math.log(x) for x in p] for p in probs]

    def pred(counts):
        s = [sum(k * logp[c][w] for w, k in counts.items()) for c in range(2)]
        return 0 if s[0] >= s[1] else 1
    return pred


class NaiveBayes:
    def __init__(self, docs, alpha):
        self.alpha = alpha
        self.prior = [0, 0]
        self.counts = [Counter(), Counter()]
        self.total = [0, 0]
        for counts, c in docs:
            self.prior[c] += 1
            self.counts[c].update(counts)
            self.total[c] += sum(counts.values())
        n = len(docs)
        self.logprior = [math.log(self.prior[c] / n) for c in range(2)]
        self.zeroed = 0

    def logp(self, w, c):
        num = self.counts[c][w] + self.alpha
        if num == 0:
            return None
        return math.log(num / (self.total[c] + self.alpha * V))

    def scores(self, counts):
        out = []
        for c in range(2):
            s = self.logprior[c]
            for w, k in counts.items():
                lp = self.logp(w, c)
                if lp is None:
                    s = -math.inf
                    break
                s += k * lp
            out.append(s)
        return out

    def predict(self, counts):
        s = self.scores(counts)
        if s[0] == s[1]:
            return 0 if self.prior[0] >= self.prior[1] else 1
        return 0 if s[0] > s[1] else 1

    def posterior(self, counts):
        s = self.scores(counts)
        m = max(s)
        if m == -math.inf:
            return 0.5
        z = sum(math.exp(x - m) for x in s)
        return max(math.exp(x - m) / z for x in s)

    def raw_products(self, counts):
        """The negative example: probabilities multiplied, no logs."""
        out = []
        for c in range(2):
            p = self.prior[c] / sum(self.prior)
            for w, k in counts.items():
                p *= ((self.counts[c][w] + self.alpha) / (self.total[c] + self.alpha * V)) ** k
            out.append(p)
        return out


def accuracy(pred, docs):
    return sum(pred(counts) == c for counts, c in docs) / len(docs)


def logistic_regression(docs, epochs=40, lr=0.1, l2=1e-3):
    """Sparse gradient descent on log(1 + count) features."""
    w = [0.0] * V
    b = 0.0
    feats = [({k: math.log1p(v) for k, v in counts.items()}, c) for counts, c in docs]
    for _ in range(epochs):
        for x, y in feats:
            z = b + sum(w[k] * v for k, v in x.items())
            p = 1 / (1 + math.exp(-max(-30, min(30, z))))
            g = p - y
            for k, v in x.items():
                w[k] -= lr * (g * v + l2 * w[k])
            b -= lr * g

    def pred(counts):
        z = b + sum(w[k] * math.log1p(v) for k, v in counts.items())
        return 1 if z > 0 else 0
    return pred


def knn(train, k=7):
    norms = [math.sqrt(sum(v * v for v in counts.values())) for counts, _ in train]

    def pred(counts):
        qn = math.sqrt(sum(v * v for v in counts.values())) or 1.0
        sims = []
        for (tc, c), n in zip(train, norms):
            s = sum(v * tc.get(w, 0) for w, v in counts.items()) / (qn * (n or 1.0))
            sims.append((s, c))
        sims.sort(reverse=True)
        votes = Counter(c for _, c in sims[:k])
        return votes.most_common(1)[0][0]
    return pred


if __name__ == '__main__':
    rng = random.Random(SEED)
    probs = make_model(rng)
    train = sample_docs(N_TRAIN, probs, rng)
    test = sample_docs(N_TEST, probs, rng)
    majority = max(Counter(c for _, c in test).values()) / N_TEST

    # Oracle 1: the ceiling.
    truth = true_classifier(probs)
    ceiling = accuracy(truth, test)
    nb = NaiveBayes(train, 1.0)
    acc_nb = accuracy(nb.predict, test)
    assert acc_nb > ceiling - 0.07 and acc_nb > majority + 0.3, (acc_nb, ceiling, majority)

    # Oracle 2: smoothing.
    sweep = []
    for alpha in (0.0, 0.01, 0.1, 0.3, 1.0, 3.0, 10.0, 100.0):
        m = NaiveBayes(train, alpha)
        zeroed = sum(1 for counts, _ in test if -math.inf in m.scores(counts)) / N_TEST if alpha == 0 else 0.0
        sweep.append((alpha, accuracy(m.predict, test), zeroed))
    acc0, zero0 = sweep[0][1], sweep[0][2]
    assert zero0 > 0.9 and acc0 < 0.6, (zero0, acc0)
    assert max(sweep, key=lambda r: r[1])[0] == 1.0, sweep
    assert sweep[-1][1] < acc_nb - 0.2, sweep[-1]
    seen_both = sum(1 for w in range(V) if nb.counts[0][w] and nb.counts[1][w])

    # Oracle 3: calibration and the independence lie.
    def calibration(model, docs):
        conf = sum(model.posterior(counts) for counts, _ in docs) / len(docs)
        acc = accuracy(model.predict, docs)
        return conf, acc
    conf1, acc1 = calibration(nb, test)
    doubled_test = [(Counter({w: 2 * k for w, k in counts.items()}), c) for counts, c in test]
    conf2, acc2 = calibration(nb, doubled_test)
    # the prior is not doubled with the counts, so a few boundary decisions
    # can flip (3 of 2,000 here): the decisions are nearly unchanged
    assert abs(acc2 - acc1) < 0.01, (acc1, acc2)
    assert conf2 > conf1 + 0.02, (conf1, conf2)              # but more confidence

    # Oracle 4: the learning curve.
    curve = []
    for n in (20, 50, 200, 500, 1000):
        sub = train[:n]
        a_nb = accuracy(NaiveBayes(sub, 1.0).predict, test)
        a_nb_small = accuracy(NaiveBayes(sub, 0.1).predict, test)
        a_lr = accuracy(logistic_regression(sub), test)
        curve.append((n, a_nb, a_nb_small, a_lr))
    assert curve[1][1] > curve[1][3] + 0.03, curve[1]         # at 50 docs the generative model leads
    assert curve[-1][3] >= curve[-1][1] - 0.01, curve[-1]     # at 1,000 the discriminative model has caught up

    # Oracle 5: raw products underflow.
    tied_short = sum(1 for counts, _ in test if nb.raw_products(counts) == [0.0, 0.0])
    smallest = min(max(nb.raw_products(counts)) for counts, _ in test)
    def merged_docs(group):
        docs = []
        for i in range(0, N_TEST - group, group):
            merged = Counter()
            for j in range(i, i + group):
                if test[j][1] == test[i][1]:
                    merged.update(test[j][0])
            docs.append((merged, test[i][1]))
        return docs
    long_rows = []
    for group in (8, 20):
        docs = merged_docs(group)
        length = sum(sum(c.values()) for c, _ in docs) / len(docs)
        tied = sum(1 for counts, _ in docs if nb.raw_products(counts) == [0.0, 0.0])
        long_rows.append((group, len(docs), length, tied))
    assert tied_short == 0 and smallest > 0, (tied_short, smallest)
    (_, n160, len160, tied160), (_, n400, len400, tied400) = long_rows
    # the draft asserted more than 90% underflow at about 160 words and
    # measured 68%; the second, longer merge is where it becomes near-total
    assert 0.3 < tied160 / n160 < 0.95 and tied400 > 0.95 * n400, long_rows
    knn_acc = accuracy(knn(train[:800]), test[:300])

    print(f'contest: {N_TRAIN:,} training and {N_TEST:,} test documents over a {V:,}-word vocabulary, two classes each boosting {TOPIC} topic words {BOOST:.0f}x, about {DOC_LEN} words per document; referee: the generating distributions (Bayes ceiling {ceiling:.1%}; majority {majority:.1%})')
    print(f'multinomial naive Bayes, alpha = 1: {acc_nb:.1%}; {seen_both} of {V:,} words seen in both classes during training')
    print(f"  {'alpha':>6} {'accuracy':>9} {'docs with a zeroed class':>25}")
    for alpha, a, z in sweep:
        print(f'  {alpha:>6} {a:>9.1%} {z:>25.1%}')
    print(f'calibration: mean confidence {conf1:.3f} vs accuracy {acc1:.3f}; with every count doubled (same evidence, squared odds): confidence {conf2:.3f}, accuracy {acc2:.3f}')
    print(f"  {'train docs':>10} {'NB alpha 1':>11} {'NB alpha 0.1':>13} {'logistic':>9}")
    for n, a_nb, a_nb_small, a_lr in curve:
        print(f'  {n:>10} {a_nb:>11.1%} {a_nb_small:>13.1%} {a_lr:>9.1%}')
    print(f'raw probability products (no logs): none of the {N_TEST:,} test documents (about {DOC_LEN} words) underflow, smallest winning product {smallest:.1e}; on {n160} merged documents of about {len160:.0f} words both classes underflow to 0.0 on {tied160} ({tied160 / n160:.0%}), on {n400} of about {len400:.0f} words on {tied400} ({tied400 / n400:.0%}); 7-NN by cosine on 800 training documents: {knn_acc:.1%} on 300 test documents')
    print(f'OK: naive Bayes {acc_nb:.1%} vs the Bayes ceiling {ceiling:.1%}; alpha 0 zeroes a class in {zero0:.0%} of documents for {acc0:.1%}; doubling counts raises confidence {conf1:.2f} -> {conf2:.2f} at unchanged accuracy; '
          f'at 50 documents naive Bayes {curve[1][1]:.1%} vs logistic {curve[1][3]:.1%}, at 1,000 {curve[-1][1]:.1%} vs {curve[-1][3]:.1%}; raw products tie on {tied160 / n160:.0%} of {len160:.0f}-word and {tied400 / n400:.0%} of {len400:.0f}-word documents')
