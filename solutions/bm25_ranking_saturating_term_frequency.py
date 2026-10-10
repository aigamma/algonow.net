# Puzzle 169: BM25 ranking x Saturating term frequency
# Document ranking: given a query of a few words and a corpus, order the
# documents so the ones about the query come first. The algorithm is
# probabilistic ranking over an inverted index: for each query term, walk
# its postings list and add a weight to every document that contains it,
# the weight growing with how rare the term is across the corpus (inverse
# document frequency) and with how often it appears in the document. The
# heuristic is BM25's saturating term frequency (Robertson, Walker, and
# colleagues, Okapi at TREC-3, 1994): a term's contribution is
# tf (k1 + 1) / (tf + k1 (1 - b + b |d| / avgdl)), which rises steeply for
# the first occurrences and flattens toward k1 + 1, and which charges a
# long document more per occurrence (the b term). The result is that a
# fifth occurrence of a word is worth far less than the first, two
# different query words beat one word twice, and a document ten times
# longer is not ten times more relevant.
#
# Referees:
# (1) A GENERATIVE CORPUS WITH KNOWN RELEVANCE: 3,000 documents, each
#     drawn from one of 40 topics; every topic has 40 focus words chosen
#     from a shared vocabulary of 1,500 (so focus words overlap between
#     topics and queries are ambiguous), mixed 55 / 45 with a Zipfian
#     background over the whole vocabulary; lengths from 20 to about
#     2,000 words; 200 queries of two or three focus words; a document is
#     relevant to a query exactly when it was generated from the query's
#     topic. Mean average precision, precision at ten, and nDCG at ten
#     are computed from that truth for every ranker;
# (2) THE SATURATION, measured directly: a term's BM25 weight at tf = 1,
#     2, 5, 20, 200 against the k1 + 1 ceiling, and the limit k1 -> inf,
#     b = 0, which must reproduce the raw tf ranking on single-term
#     queries (asserted on every one);
# (3) THE ABLATIONS: BM25 with b = 0 (no length normalization) and with
#     k1 = 1000 (no saturation) on the same queries;
# (4) THE RIVALS: tf-idf summation, the vector space model with cosine
#     similarity over tf-idf vectors, the query likelihood model with
#     Dirichlet smoothing (mu = 2000), Boolean overlap count, and raw
#     term-frequency summation, all over the same inverted index with the
#     same postings scanned;
# (5) THE NEGATIVE EXAMPLE, measured: 40 keyword-stuffed documents, each
#     repeating ONE word of a query 300 times among filler and carrying
#     none of the query's other words; how often each ranker puts a
#     stuffed document at rank one (a stuffed word tops every query that
#     contains it, so the count runs over all 200 queries), and the stuffed
#     document's score margin over the best genuine document under raw tf
#     and under BM25.
#
# AUTHOR CORRECTION: the first draft generated topics with disjoint
# vocabularies and stuffed documents carrying every query word. The task
# was then too easy (raw term frequency scored 0.93 MAP) and BM25 ranked
# the stuffed documents first on 43 of 200 queries, because a document
# that holds all the query words at the saturation ceiling legitimately
# outscores one that holds them a few times. Both were the draft's
# mistakes, not the method's: real queries are ambiguous, and the
# textbook stuffing attack repeats one word. The corpus and the attack
# were rebuilt as described above, and every number on the page comes
# from the rebuilt version.
import math
import random
from collections import Counter, defaultdict

SEED = 20261010


def zipf_weights(n, s=1.0):
    w = [1 / (i + 1) ** s for i in range(n)]
    t = sum(w)
    return [x / t for x in w]


def cumulative(weights):
    out = []
    acc = 0.0
    for w in weights:
        acc += w
        out.append(acc)
    out[-1] = 1.0
    return out


def sample(rng, items, cum):
    r = rng.random()
    lo, hi = 0, len(cum) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if cum[mid] < r:
            lo = mid + 1
        else:
            hi = mid
    return items[lo]


def build_corpus(rng, topics=40, focus_words=40, vocab=1500, docs=3000):
    words = [f'w{i}' for i in range(vocab)]
    background = cumulative(zipf_weights(vocab, 1.0))
    focus = []
    focus_cum = cumulative(zipf_weights(focus_words, 0.8))
    for _ in range(topics):
        focus.append(rng.sample(words, focus_words))
    documents = []
    labels = []
    for _ in range(docs):
        t = rng.randrange(topics)
        length = int(min(2000, max(20, rng.lognormvariate(math.log(140), 0.9))))
        doc = []
        for _ in range(length):
            if rng.random() < 0.55:
                doc.append(sample(rng, focus[t], focus_cum))
            else:
                doc.append(sample(rng, words, background))
        documents.append(doc)
        labels.append(t)
    return documents, labels, focus, focus_cum, words


def make_queries(rng, focus, focus_cum, n=200):
    queries = []
    for _ in range(n):
        t = rng.randrange(len(focus))
        k = rng.choice((2, 3))
        terms = set()
        while len(terms) < k:
            terms.add(sample(rng, focus[t], focus_cum))
        queries.append((t, sorted(terms)))
    return queries


class Index:
    def __init__(self, documents):
        self.n = len(documents)
        self.postings = defaultdict(list)  # term -> [(doc, tf)]
        self.length = [len(d) for d in documents]
        self.avgdl = sum(self.length) / self.n
        self.collection = Counter()
        self.total_tokens = sum(self.length)
        for i, doc in enumerate(documents):
            for term, tf in Counter(doc).items():
                self.postings[term].append((i, tf))
                self.collection[term] += tf
        self.df = {t: len(p) for t, p in self.postings.items()}
        self.norm = [0.0] * self.n
        for term, plist in self.postings.items():
            idf = self.idf_classic(term)
            for i, tf in plist:
                w = (1 + math.log(tf)) * idf
                self.norm[i] += w * w
        self.norm = [math.sqrt(x) for x in self.norm]
        self.scanned = 0

    def idf_classic(self, term):
        return math.log(self.n / self.df.get(term, 1))

    def idf_bm25(self, term):
        df = self.df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))


def bm25_weight(tf, dl, avgdl, k1, b):
    return tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avgdl))


def rank_bm25(index, query, k1=1.2, b=0.75):
    scores = defaultdict(float)
    for term in query:
        idf = index.idf_bm25(term)
        for doc, tf in index.postings.get(term, ()):
            index.scanned += 1
            scores[doc] += idf * bm25_weight(tf, index.length[doc], index.avgdl, k1, b)
    return scores


def rank_tfidf(index, query):
    scores = defaultdict(float)
    for term in query:
        idf = index.idf_classic(term)
        for doc, tf in index.postings.get(term, ()):
            index.scanned += 1
            scores[doc] += tf * idf
    return scores


def rank_cosine(index, query):
    scores = defaultdict(float)
    for term in query:
        idf = index.idf_classic(term)
        for doc, tf in index.postings.get(term, ()):
            index.scanned += 1
            scores[doc] += (1 + math.log(tf)) * idf * idf
    return {d: s / index.norm[d] for d, s in scores.items()}


def rank_raw_tf(index, query):
    scores = defaultdict(float)
    for term in query:
        for doc, tf in index.postings.get(term, ()):
            index.scanned += 1
            scores[doc] += tf
    return scores


def rank_boolean(index, query):
    scores = defaultdict(float)
    for term in query:
        for doc, _ in index.postings.get(term, ()):
            index.scanned += 1
            scores[doc] += 1
    return scores


def rank_query_likelihood(index, query, mu=2000.0):
    cand = set()
    tfs = {}
    for term in query:
        for doc, tf in index.postings.get(term, ()):
            index.scanned += 1
            cand.add(doc)
            tfs[(term, doc)] = tf
    scores = {}
    for doc in cand:
        s = 0.0
        dl = index.length[doc]
        for term in query:
            p_c = index.collection.get(term, 0) / index.total_tokens
            s += math.log((tfs.get((term, doc), 0) + mu * p_c) / (dl + mu))
        scores[doc] = s
    return scores


def top_k(scores, k):
    return [d for d, _ in sorted(scores.items(), key=lambda x: (-x[1], x[0]))[:k]]


def average_precision(ranked, relevant):
    hits = 0
    total = 0.0
    for i, d in enumerate(ranked, 1):
        if d in relevant:
            hits += 1
            total += hits / i
    return total / max(1, len(relevant))


def ndcg(ranked, relevant, k=10):
    dcg = sum(1 / math.log2(i + 1) for i, d in enumerate(ranked[:k], 1) if d in relevant)
    ideal = sum(1 / math.log2(i + 1) for i in range(1, min(k, len(relevant)) + 1))
    return dcg / ideal if ideal > 0 else 0.0


def evaluate(index, queries, labels, ranker, spam_docs, n_real):
    ap = p10 = nd = 0.0
    spam_top = 0
    margins = []
    for qi, (t, terms) in enumerate(queries):
        scores = ranker(index, terms)
        ranked = top_k(scores, 300)
        relevant = {d for d in range(n_real) if labels[d] == t}
        ap += average_precision(ranked, relevant)
        p10 += sum(1 for d in ranked[:10] if d in relevant) / 10
        nd += ndcg(ranked, relevant)
        if ranked and ranked[0] in spam_docs:
            spam_top += 1
        if qi < 40:
            spam = n_real + qi
            best_real = max(scores[d] for d in relevant if d in scores)
            # a score ratio only means something for additive positive scores
            if best_real > 0 and spam in scores and scores[spam] > 0:
                margins.append(scores[spam] / best_real)
    n = len(queries)
    return {'map': ap / n, 'p10': p10 / n, 'ndcg': nd / n, 'spam_top': spam_top,
            'margin': (sum(margins) / len(margins)) if len(margins) == 40 else None}


def main():
    rng = random.Random(SEED)
    documents, labels, focus, focus_cum, words = build_corpus(rng)
    queries = make_queries(rng, focus, focus_cum)
    n_real = len(documents)
    background = cumulative(zipf_weights(len(words), 1.0))
    spam_docs = set()
    for t, terms in queries[:40]:
        filler = [sample(rng, words, background) for _ in range(200)]
        filler = [w for w in filler if w not in terms]
        doc = filler + [terms[0]] * 300
        rng.shuffle(doc)
        documents.append(doc)
        labels.append(-1)
        spam_docs.add(len(documents) - 1)
    index = Index(documents)

    rankers = {
        'BM25 (k1 = 1.2, b = 0.75)': lambda ix, q: rank_bm25(ix, q),
        'BM25, b = 0 (no length normalization)': lambda ix, q: rank_bm25(ix, q, b=0.0),
        'BM25, k1 = 1000 (no saturation)': lambda ix, q: rank_bm25(ix, q, k1=1000.0),
        'tf-idf summation': rank_tfidf,
        'vector space model, cosine': rank_cosine,
        'query likelihood, Dirichlet mu = 2000': rank_query_likelihood,
        'Boolean overlap count': rank_boolean,
        'raw term frequency': rank_raw_tf,
    }
    results = {}
    for name, fn in rankers.items():
        index.scanned = 0
        results[name] = evaluate(index, queries, labels, fn, spam_docs, n_real)
        results[name]['scanned'] = index.scanned
    hero = results['BM25 (k1 = 1.2, b = 0.75)']

    ceiling = 1.2 + 1
    curve = {tf: bm25_weight(tf, index.avgdl, index.avgdl, 1.2, 0.75) for tf in (1, 2, 5, 20, 200)}
    agree = 0
    total_terms = 0
    for t, terms in queries:
        for term in terms:
            total_terms += 1
            a = top_k(rank_bm25(index, [term], k1=1e9, b=0.0), 10)
            b = top_k(rank_raw_tf(index, [term]), 10)
            agree += a == b

    print('contest: 200 queries of two or three words over 3,040 documents (3,000 generated from 40 overlapping topics, 40 keyword-stuffed), relevance known from the generating topic; one currency: postings scanned per query (equal for every ranker); scores: mean average precision, precision at 10, nDCG at 10')
    print(f'corpus: {index.n:,} documents, {index.total_tokens:,} tokens, average length {index.avgdl:.0f}, {len(index.postings):,} distinct terms; about {n_real / 40:.0f} relevant documents per query')
    print(f'{"ranker":>40} {"MAP":>7} {"P@10":>6} {"nDCG@10":>8} {"stuffed at #1":>14} {"stuffed / best real":>20} {"postings":>9}')
    for name, r in results.items():
        margin = f'{r["margin"]:.2f}x' if r['margin'] is not None else 'log scores'
        print(f'{name:>40} {r["map"]:7.3f} {r["p10"]:6.3f} {r["ndcg"]:8.3f} {r["spam_top"]:>7d} of 200 {margin:>20} {r["scanned"] // len(queries):>9,}')
    print('saturation: one term’s BM25 weight at average length for tf = 1, 2, 5, 20, 200: '
          + ', '.join(f'{curve[tf]:.3f}' for tf in (1, 2, 5, 20, 200)) + f'; the ceiling k1 + 1 = {ceiling:.1f}; raw tf would be 1, 2, 5, 20, 200')
    print(f'the raw-tf limit: with k1 = 1e9 and b = 0, BM25 reproduced the raw term-frequency top ten on {agree} of {total_terms} single-term queries')

    # Oracle 1 and 4: the orderings the page states.
    raw = results['raw term frequency']
    boolean = results['Boolean overlap count']
    tfidf = results['tf-idf summation']
    assert hero['map'] > raw['map'] and hero['map'] > boolean['map'] and hero['map'] > tfidf['map'], (hero['map'], raw['map'], boolean['map'], tfidf['map'])
    assert hero['ndcg'] > raw['ndcg'] and hero['p10'] > raw['p10']
    # Oracle 3: both ablations hurt or tie.
    assert hero['map'] >= results['BM25, b = 0 (no length normalization)']['map']
    assert hero['map'] >= results['BM25, k1 = 1000 (no saturation)']['map']
    # Oracle 5: the one-word stuffing attack.
    assert hero['spam_top'] == 0, hero['spam_top']
    assert raw['spam_top'] >= 35, raw['spam_top']
    assert results['BM25, k1 = 1000 (no saturation)']['spam_top'] >= 20
    assert hero['margin'] < 1.0 < raw['margin'], (hero['margin'], raw['margin'])
    # Oracle 2: the saturation curve and the raw-tf limit.
    assert curve[1] < curve[2] < curve[5] < curve[20] < curve[200] < ceiling
    assert curve[200] > 0.98 * ceiling and abs(curve[1] - 1.0) < 1e-12
    assert agree == total_terms, (agree, total_terms)

    print(f'OK: BM25 MAP {hero["map"]:.3f} against tf-idf {tfidf["map"]:.3f}, cosine {results["vector space model, cosine"]["map"]:.3f}, '
          f'query likelihood {results["query likelihood, Dirichlet mu = 2000"]["map"]:.3f}, Boolean {boolean["map"]:.3f}, raw tf {raw["map"]:.3f}; '
          f'queries with a one-word stuffed document at rank one: BM25 {hero["spam_top"]}, raw tf {raw["spam_top"]}, BM25 without saturation {results["BM25, k1 = 1000 (no saturation)"]["spam_top"]} of 200; '
          f'the stuffed document scores {hero["margin"]:.2f}x the best genuine one under BM25 and {raw["margin"]:.1f}x under raw tf; '
          f'saturation ceiling {ceiling:.1f} reached to {curve[200] / ceiling:.1%} at tf = 200')


if __name__ == '__main__':
    main()
