import Bm25Viz from '../viz/Bm25Viz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bm25_ranking_saturating_term_frequency.py?raw';
import { narration } from './bm25-ranking-saturating-term-frequency.narration.js';

export const content = {
  given:
    'A query of two or three words and a corpus of thousands of documents of wildly different lengths, some of them written to game the ranker. Order the documents so the ones about the query come first.',
  task: 'BM25 ranking. The algorithm is probabilistic ranking over an inverted index: for each query term, walk its postings list and add a weight to every document that contains it, growing with the term’s rarity across the corpus (inverse document frequency) and with its count in the document. The heuristic is the saturating term frequency of Okapi BM25 (Robertson, Walker, and colleagues, TREC-3, 1994): a term contributes tf (k1 + 1) / (tf + k1 (1 − b + b |d| / avgdl)), steep for the first occurrences and flat toward the ceiling k1 + 1, with a longer document charged more per occurrence. The fifth occurrence of a word is worth far less than the first; two different query words beat one word twice; ten times the length is not ten times the relevance.',
  constraint:
    'Measured on a generated corpus with known relevance (3,000 documents from 40 overlapping topics, lengths 20 to 2,000, plus 40 keyword-stuffed documents; 200 queries of two or three words; relevant means generated from the query’s topic): BM25 (k1 = 1.2, b = 0.75) mean average precision 0.897, precision at ten 0.992, nDCG at ten 0.992; without length normalization (b = 0) 0.855; without saturation (k1 = 1000) 0.820; tf-idf summation 0.706; cosine vector space 0.874; query likelihood with Dirichlet smoothing 0.822; Boolean overlap 0.788; raw term frequency 0.684. One term’s weight at tf = 1, 2, 5, 20, 200: 1.000, 1.375, 1.774, 2.075, 2.187 against the ceiling 2.2. A document repeating one query word 300 times tops the raw-tf ranking on 67 of 200 queries at 5.9× the best genuine score; under BM25 it tops none and scores 0.49× the best genuine document.',

  origins: (
    <p>
      Stephen Robertson and Karen Spärck Jones derived the probabilistic
      relevance framework in <strong>1976</strong>; the City University
      Okapi group (Robertson, Walker, Jones, Hancock-Beaulieu, Gatford)
      turned it into the BM25 weighting at <strong>TREC-3 in 1994</strong>,
      the saturation in tf coming from a two-Poisson model of how an
      &quot;elite&quot; term behaves in documents about it, the length term
      from a correction Robertson and Walker added that year. It became the
      default ranking function of Lucene (and so Elasticsearch and Solr)
      in 2015, of Xapian, Terrier, and Anserini, and the lexical half of
      most hybrid retrieval systems next to dense embeddings. Robertson
      and Zaragoza&apos;s 2009 survey (&quot;The probabilistic relevance
      framework: BM25 and beyond&quot;) is the standard account; BM25F
      (2004) extends it to fielded documents.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>walk</strong>: an inverted index from term to
      postings (document, count), one pass per query term, a weight added
      to each posting&apos;s document, the top scores returned. Every ranker
      on this page walks the same 540 postings per query; what differs is
      only the weight. The referee is a generated corpus whose relevance
      is known by construction: 40 topics sharing a vocabulary of 1,500
      words, so queries are ambiguous, and 200 queries scored by mean
      average precision, precision at ten, and nDCG at ten against the
      generating topic. Raw term frequency over that walk scores{' '}
      <strong>MAP 0.684</strong>; Boolean overlap 0.788.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>weight</strong>: idf times a term frequency that
      saturates and a length that costs. Measured, <strong>MAP 0.897</strong>{' '}
      and precision at ten 0.992 against 0.706 for tf-idf and 0.684 for raw
      counts; take the length term away and MAP falls to 0.855, take the
      saturation away (k1 = 1000) and it falls to 0.820. The curve itself:
      1.000, 1.375, 1.774, 2.075, 2.187 for tf = 1, 2, 5, 20, 200 against the
      ceiling 2.2, so a word repeated 300 times is worth about two
      occurrences of two different words, which is why the stuffed
      documents top nothing under BM25 and 67 of 200 queries under raw tf.
    </p>
  ),

  picture: (
    <p>
      A librarian judging which books answer &quot;volcanic glaciers.&quot;
      She gives a book credit for each word it mentions, more credit for
      the rarer word, and the credit for mentioning a word again shrinks
      each time: the second mention is worth a third of the first, the
      hundredth nearly nothing. A thick book has to mention a word a few
      more times to earn the same credit as a pamphlet, because thick
      books mention everything. The pamphlet that says both words twice
      beats the tome that says &quot;volcanic&quot; three hundred times and
      never mentions a glacier.
    </p>
  ),

  steps: [
    <>
      <strong>Index:</strong> for every term, a postings list of (document,
      tf); store each document&apos;s length and the average length avgdl.
    </>,
    <>
      <strong>idf:</strong> for each query term, log(1 + (N − df + 0.5) /
      (df + 0.5)).
    </>,
    <>
      <strong>Saturate:</strong> for each posting, weight = tf (k1 + 1) /
      (tf + k1 (1 − b + b |d| / avgdl)), with k1 = 1.2 and b = 0.75.
    </>,
    <>
      <strong>Accumulate:</strong> score(d) += idf × weight, term at a time
      over the postings; documents with no query term score zero.
    </>,
    <>
      <strong>Return</strong> the top k by score; a ceiling of (k1 + 1) × idf
      per term bounds what any one word can buy.
    </>,
  ],

  signals: [
    <>
      <strong>Keyword queries over text:</strong> search boxes, log
      search, code search, the lexical half of hybrid retrieval.
    </>,
    <>
      <strong>Lengths vary and some authors cheat:</strong> abstracts next
      to books, product titles next to descriptions, stuffed pages.
    </>,
    <>
      <strong>No training data:</strong> two parameters with good defaults
      and an index you already have; the baseline every neural ranker is
      measured against.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>tf-idf summation</strong>: count times
      rarity, added up. MAP 0.706 against 0.897, and a stuffed document on
      top of 67 of 200 queries: the rarity is right and the count is
      wrong.
    </>
  ),

  strength: (
    <>
      <strong>The right shape for counts, with two knobs.</strong> MAP
      0.897 and precision at ten 0.992 on ambiguous queries over
      documents of every length; the stuffed document scores 0.49× the
      best genuine one where raw counts give it 5.9×; both ablations
      measured and both worse.
    </>
  ),
  weakness: (
    <>
      <strong>Words, not meaning, and two parameters by folklore.</strong>{' '}
      A synonym scores zero and a homonym scores full; k1 and b are tuned
      per collection or left at 1.2 and 0.75; the length prior is a guess
      that fails on collections where long means thorough; and a document
      holding every query word at the ceiling outranks a better one with
      modest counts, so stuffing all the words still works.
    </>
  ),

  problem: 'Document ranking and retrieval',
  problemSlug: 'document-ranking',
  rivals: [
    {
      name: 'BM25 ranking × Saturating term frequency',
      isThisUnit: true,
      algoName: 'BM25 ranking',
      cost: 'one postings walk per term; two parameters',
      wins: (
        <>
          <strong>MAP 0.897</strong>, P@10 0.992; the stuffed document at
          0.49× the best genuine score; the default of Lucene since 2015.
        </>
      ),
      costs: (
        <>
          No synonyms; k1 and b by folklore; all-words stuffing still wins.
        </>
      ),
      when: 'Any keyword search over text, and the lexical side of a hybrid system.',
    },
    {
      name: 'TF-IDF ranking',
      algoName: 'TF-IDF ranking',
      cost: 'one postings walk per term; no parameters',
      wins: (
        <>
          The rarity weighting is already right; trivial to compute and
          explain.
        </>
      ),
      costs: (
        <>
          MAP 0.706; linear in count, so a stuffed document tops 67 of 200
          queries at 5.7× the best genuine score.
        </>
      ),
      when: 'Feature engineering and teaching; as a ranker, only when nobody games it.',
    },
    {
      name: 'Vector space model',
      algoName: 'Vector space model',
      cost: 'tf-idf vectors and a norm per document',
      wins: (
        <>
          Cosine normalizes length for free: MAP 0.874, close behind; a
          geometry that extends to any vector.
        </>
      ),
      costs: (
        <>
          The norm does not stop stuffing: 17 of 200 queries topped by a
          stuffed document; no saturation of its own.
        </>
      ),
      when: 'Documents as vectors is the abstraction you want, and the corpus is honest.',
    },
    {
      name: 'Query likelihood model',
      algoName: 'Query likelihood model',
      cost: 'a smoothed language model per document',
      wins: (
        <>
          A principled probability, Dirichlet smoothing as the length
          prior, P@10 0.952; extends to translation and relevance models.
        </>
      ),
      costs: (
        <>
          MAP 0.822 here; 22 of 200 queries topped by a stuffed document;
          μ to tune.
        </>
      ),
      when: 'You want probabilities you can combine with priors and feedback, not just a score.',
    },
  ],
  neverUse: {
    name: 'A ranker linear in the term count on a corpus anyone can write to',
    why: (
      <>
        Forty documents each repeat one word of a query 300 times among
        filler and never mention the query&apos;s other words. Under raw
        term frequency, and equally under tf-idf and under BM25 with the
        saturation removed (k1 = 1000), a stuffed document sits at rank one
        for <strong>67 of 200 queries</strong>, scoring 5.9× the best
        genuine document; mean average precision falls to 0.684, 0.706,
        and 0.820. Under BM25 the same documents top no query and score
        0.49× the best genuine one, because the 300th occurrence buys
        0.0005 of a point and the missing second word costs a whole one.
        Any score that keeps paying for repetition hands the top of every
        list to whoever repeats the most.
      </>
    ),
  },

  contest: {
    instance:
      '200 queries of two or three words over 3,040 documents (3,000 generated from 40 topics with overlapping vocabularies, lengths 20 to 2,000, plus 40 documents each repeating one query word 300 times); relevance known from the generating topic, about 75 relevant documents per query; every ranker walks the same 540 postings per query',
    columns: ['MAP', 'P@10', 'nDCG@10', 'queries topped by a stuffed doc (of 200)', 'stuffed score / best genuine'],
    rows: [
      {
        method: 'BM25 (k1 = 1.2, b = 0.75)',
        isThisUnit: true,
        values: ['0.897', '0.992', '0.992', '0', '0.49×'],
        best: 0,
        verdict: 'saturation and length, both earning their keep',
      },
      {
        method: 'BM25, b = 0 (no length normalization)',
        values: ['0.855', '0.991', '0.992', '0', '0.44×'],
        verdict: 'the length term is worth 0.04 MAP',
      },
      {
        method: 'BM25, k1 = 1000 (no saturation)',
        values: ['0.820', '0.880', '0.843', '67', '6.77×'],
        verdict: 'the saturation is worth 0.08 MAP and the top of the list',
      },
      {
        method: 'vector space model, cosine',
        values: ['0.874', '0.931', '0.922', '17', '0.85×'],
        verdict: 'close; the norm is not a ceiling',
      },
      {
        method: 'query likelihood, Dirichlet μ = 2000',
        values: ['0.822', '0.952', '0.943', '22', 'log scores'],
        verdict: 'principled, tunable, behind here',
      },
      {
        method: 'Boolean overlap count',
        values: ['0.788', '0.939', '0.941', '0', '0.42×'],
        verdict: 'coordination alone beats raw counts',
      },
      {
        method: 'tf-idf summation',
        values: ['0.706', '0.808', '0.782', '67', '5.69×'],
        verdict: 'the baseline',
      },
      {
        method: 'raw term frequency',
        values: ['0.684', '0.796', '0.771', '67', '5.90×'],
        verdict: 'the count is the problem',
      },
    ],
    source:
      'python solutions/bm25_ranking_saturating_term_frequency.py prints this table and asserts: BM25 above tf-idf, Boolean, and raw tf on MAP, and above raw tf on P@10 and nDCG; BM25 at or above both ablations; no query topped by a stuffed document under BM25 against at least 35 under raw tf and at least 20 without saturation; the stuffed margin below 1 under BM25 and above 1 under raw tf; the saturation curve increasing toward and within 2% of the ceiling 2.2 with weight exactly 1 at tf = 1; and BM25 with k1 = 1e9 and b = 0 reproducing the raw term-frequency top ten on all 496 single-term queries.',
  },

  figure: (
    <Figure
      id="fig-bm25-saturation"
      aspect="16 / 7"
      caption="Left: one term's weight against its count in the document, for raw term frequency (gray, off the chart by tf = 5), BM25 at average length (blue, flattening toward the ceiling k1 + 1 = 2.2), and BM25 for a document three times the average length (amber, charged more per occurrence). Right: how often a document repeating one query word 300 times took rank one on the 200 queries, by ranker."
      cite={{
        text: 'S. E. Robertson, S. Walker, S. Jones, M. M. Hancock-Beaulieu, and M. Gatford, "Okapi at TREC-3," NIST Special Publication 500-225, 1995. S. Robertson and H. Zaragoza, "The probabilistic relevance framework: BM25 and beyond," Foundations and Trends in Information Retrieval 3(4), 2009, DOI 10.1561/1500000019.',
        href: 'https://doi.org/10.1561/1500000019',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Curves of term weight against term frequency for raw counts and two BM25 settings, beside bars counting queries topped by a keyword-stuffed document for each ranker">
        {(() => {
          const x0 = 40;
          const y0 = 230;
          const pw = 300;
          const ph = 180;
          const X = (tf) => x0 + (tf / 20) * pw;
          const Y = (w) => y0 - (w / 3) * ph;
          const k1 = 1.2;
          const b = 0.75;
          const bm = (tf, ratio) => (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * ratio));
          const pts = (fn) => Array.from({ length: 81 }, (_, i) => i / 4).filter((t) => t > 0).map((t) => `${X(t)},${Y(Math.min(fn(t), 3.2))}`).join(' ');
          const bars = [['BM25', 0, '#5da2ff'], ['b = 0', 0, '#5da2ff'], ['Boolean', 0, '#9aa5bd'], ['cosine', 17, '#f0b94b'], ['QL', 22, '#f0b94b'], ['tf-idf', 67, '#e2606c'], ['raw tf', 67, '#e2606c'], ['k1=1000', 67, '#e2606c']];
          const bx = 390;
          const by = 230;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={y0 - ph} x2={x0} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={Y(2.2)} x2={x0 + pw} y2={Y(2.2)} stroke="#5da2ff" strokeOpacity="0.5" strokeDasharray="4 3" />
              <text x={x0 + 4} y={Y(2.2) - 5} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">ceiling k1 + 1 = 2.2</text>
              <polyline points={pts((t) => t)} fill="none" stroke="#9aa5bd" strokeWidth="1.5" />
              <polyline points={pts((t) => bm(t, 1))} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={pts((t) => bm(t, 3))} fill="none" stroke="#f0b94b" strokeWidth="2" />
              {[0, 5, 10, 15, 20].map((t) => <text key={t} x={X(t) - 4} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{t}</text>)}
              {[1, 2, 3].map((w) => <text key={w} x={x0 - 16} y={Y(w) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{w}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">weight of one term vs its count: gray raw tf, blue BM25 (avg length), amber BM25 (3x length)</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured: 1.000, 1.375, 1.774, 2.075, 2.187 at tf = 1, 2, 5, 20, 200</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">queries topped by a stuffed doc (of 200)</text>
              {bars.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 30} y={by - Math.max(v, 1) * 2.4} width="22" height={Math.max(v, 1) * 2.4} fill={c} fillOpacity="0.85" />
                  <text x={bx + i * 30} y={by - Math.max(v, 1) * 2.4 - 4} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 30 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="7">{name}</text>
                </g>
              ))}
              <text x={bx} y={by + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one word x 300, none of the others</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'bm25_ranking_saturating_term_frequency.py',
  Viz: Bm25Viz,
  narration,
};
