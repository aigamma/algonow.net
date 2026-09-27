import BpeViz from '../viz/BpeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/byte_pair_encoding_frequency_merge_vocabulary.py?raw';
import { narration } from './byte-pair-encoding-frequency-merge-vocabulary.narration.js';

export const content = {
  given:
    'A training text of 441 words (2,410 bytes) and a held-out passage of 101 words. Build a vocabulary of tokens small enough to model and rich enough that common words are single tokens, while any string at all, including words never seen and characters never seen, can still be encoded and decoded exactly.',
  task: 'Start from the 256 bytes. Count every adjacent pair of tokens in the training text, merge the most frequent pair into one new token everywhere it occurs, record the merge, and repeat. Encoding new text replays the merges in order; decoding concatenates the bytes. The vocabulary grows by exactly one token per merge.',
  constraint:
    'Every text round-trips byte for byte at 0, 50, 200, and 467 merges: training, held-out, and a string with French, Japanese, and an emoji the corpus never saw. The incremental pair counts equal a full recount after each of the first 60 merges, and the vocabulary is exactly 256 + k. Tokens per word fall from 4.46 to 1.00 on the training text (at 467 merges every training word is one token, the point where the pairs run out) and from 4.60 to 1.76 held out. Two hundred random merges instead of the most frequent give 3.22 tokens per word held out against 2.13. A word-level vocabulary of the same text leaves 36.6% of the held-out words unencodable; byte pair encoding encodes all of them, 71% as a single token.',

  origins: (
    <p>
      Philip Gage published byte pair encoding in <strong>1994</strong>{' '}
      (C/C++ Users Journal) as a compression trick: replace the most
      common pair of bytes with an unused byte, repeat. Sennrich,
      Haddow, and Birch (ACL 2016) turned it into a vocabulary for
      neural machine translation, so that rare and unseen words become
      sequences of subwords instead of an unknown-word token; Schuster
      and Nakajima&apos;s WordPiece (2012) had done the same with a
      likelihood criterion, and Kudo&apos;s unigram model (2018) and
      SentencePiece (Kudo and Richardson, 2018) made it
      language-agnostic. GPT-2 (Radford et al., 2019) took the base
      alphabet down to raw bytes so that no string could ever be
      out of vocabulary, which is the version on this page, and every
      large language model since tokenizes with a merge table learned
      exactly this way: 50,257 tokens for GPT-2, about 100,000 for its
      successors, each one a fragment the training corpus used often.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>encoding and its exactness</strong>: a merge
      table applied in order turns any byte string into tokens, and
      concatenating the tokens&apos; bytes gives the string back.
      Measured: round trips exact at every vocabulary size on the
      training text, the held-out text, and a string with characters
      the corpus never contained; the vocabulary exactly 256 + k after
      k merges; the learner&apos;s incremental pair counts equal to a
      full recount after each of the first 60 merges, and each merge a
      most-frequent pair. The base of bytes is what makes it total:
      a word-level vocabulary from the same text cannot encode{' '}
      <strong>36.6%</strong> of the held-out words at all.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>choice of what to merge</strong>: the most
      frequent adjacent pair, greedily, one at a time, so the
      vocabulary becomes the corpus&apos;s own common fragments and
      nothing else. The first merges learned here: he, the, in, er,
      an, ed, and, to. Measured as tokens per word: <strong>4.46 →
      2.74 → 1.67 → 1.00</strong> on the training text at 0, 50, 200,
      and 467 merges, and 4.60 → 2.99 → 2.13 → 1.76 held out; the
      gap is the generalization cost of a vocabulary fitted to 441
      words. Merge random pairs instead and the same 200-token budget
      buys 3.22 tokens per word held out against 2.13: frequency is
      what makes a merge worth a vocabulary slot. At 467 merges the
      pairs run out, every training word is one token, and the
      held-out text is still 1.76.
    </p>
  ),

  picture: (
    <p>
      A stenographer inventing shorthand for one office. She starts
      with the alphabet and watches the mail. The letter pair that
      comes up most often, t followed by h, gets its own squiggle;
      then the squiggle followed by e; then i-n, e-r, a-n. Every new
      squiggle is the most common pair of the symbols she already
      has, so the shorthand grows into exactly the words and word
      pieces this office uses, and after a few hundred squiggles most
      of the office&apos;s words are one stroke. Mail from another
      office takes more strokes, because their words are built of the
      same pieces but not the same whole words, and a word she has
      never seen still takes a stroke per piece, never a shrug. Pick
      the squiggles at random instead and she has the same number of
      symbols and nothing to use them on.
    </p>
  ),

  steps: [
    <>
      <strong>Base:</strong> every word as its UTF-8 bytes; vocabulary =
      256.
    </>,
    <>
      <strong>Count:</strong> adjacent token pairs across the corpus,
      weighted by word frequency.
    </>,
    <>
      <strong>Merge:</strong> the most frequent pair becomes one token
      everywhere; record (a, b); update counts incrementally.
    </>,
    <>
      <strong>Repeat</strong> k times: vocabulary 256 + k; here the
      pairs run out at 467.
    </>,
    <>
      <strong>Encode / decode:</strong> replay the merges in order;
      concatenate bytes; check the round trip byte for byte.
    </>,
  ],

  signals: [
    <>
      <strong>An open vocabulary:</strong> names, typos, code, other
      languages; anything a fixed word list would call unknown.
    </>,
    <>
      <strong>A budget of tokens:</strong> a model&apos;s input length
      and embedding table are paid per token, and 1.76 per word beats
      4.60.
    </>,
    <>
      <strong>A corpus to learn from:</strong> the merges are the
      corpus&apos;s statistics; a different corpus wants a different
      table.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the bytes themselves</strong>:
      zero merges, 256 tokens, every string encodable, 4.60 tokens per
      word held out. Everything the merges buy is measured from there,
      and everything they cost (a table to learn and ship) too.
    </>
  ),

  strength: (
    <>
      <strong>Total, exact, and fitted.</strong> No string is out of
      vocabulary, decoding is byte-exact at every size, and 467
      frequency merges cut the held-out text from 4.60 to 1.76 tokens
      per word where random merges of the same count reach only 3.22;
      the whole learner is a pair count and a merge table.
    </>
  ),
  weakness: (
    <>
      <strong>Greedy, corpus-bound, and blind to meaning.</strong> Each
      merge is locally best and never revisited; the table fitted to
      441 words leaves held-out text at 1.76 tokens per word while the
      training text sits at 1.00; the tokens follow spelling, not
      morphology (&quot;ing&quot; and &quot;ed&quot; appear, but so do
      fragments that mean nothing), and numbers and code split
      unpredictably. WordPiece&apos;s likelihood criterion and the
      unigram model exist to choose merges by what they buy the model,
      not by raw count.
    </>
  ),

  problem: 'Subword tokenization',
  problemSlug: 'tokenization',
  rivals: [
    {
      name: 'Byte pair encoding × frequency-merge vocabulary',
      isThisUnit: true,
      algoName: 'Byte pair encoding',
      cost: 'one pair count per merge',
      wins: (
        <>
          <strong>4.60 → 1.76 tokens per word</strong> held out, every
          string encodable, byte-exact round trips.
        </>
      ),
      costs: (
        <>
          Greedy by count; a table fitted to its corpus (1.00 on
          training text, 1.76 held out).
        </>
      ),
      when: 'Tokenizing text for a model with an open vocabulary and a token budget.',
    },
    {
      name: 'WordPiece',
      cost: 'a likelihood score per candidate merge',
      wins: (
        <>
          Merges the pair that most raises the corpus likelihood under
          a unigram model, not the most frequent one; BERT&apos;s
          tokenizer.
        </>
      ),
      costs: (
        <>
          A score to compute per candidate, and a word-initial
          convention (the ## prefix) to carry.
        </>
      ),
      when: 'When merges should be judged by what they buy the model rather than by raw count.',
    },
    {
      name: 'SentencePiece',
      cost: 'a unigram model trained by EM, pruned',
      wins: (
        <>
          Language-agnostic: raw text in, no pre-tokenization, spaces
          as symbols; the unigram model can sample alternative
          segmentations for regularization.
        </>
      ),
      costs: (
        <>
          More machinery than a merge table; the segmentation is a
          Viterbi search, not a replay.
        </>
      ),
      when: 'Multilingual text, scripts without spaces, or when segmentation should be probabilistic.',
    },
  ],
  neverUse: {
    name: 'A word-level vocabulary',
    why: (
      <>
        Splitting on spaces and listing the words seen is the obvious
        tokenizer, and it fails on the first unseen word. Measured on
        this corpus: a 209-word vocabulary leaves{' '}
        <strong>37 of 101 held-out words (36.6%) unencodable</strong>,
        every one of them an unknown token that the model can neither
        read nor produce, while byte pair encoding encodes all 101 and
        71% of them as a single token. Names, plurals, typos, and other
        languages are not edge cases; they are a third of any text the
        list did not see.
      </>
    ),
  },

  contest: {
    instance:
      'training text 441 words (2,410 bytes), held-out text 101 words; referee: byte-for-byte round trips and a full pair recount after each of the first 60 merges',
    columns: ['vocabulary', 'tokens per word, training', 'tokens per word, held out'],
    rows: [
      {
        method: '0 merges (bytes)',
        values: ['256', '4.46', '4.60'],
        verdict: 'every word is its letters',
      },
      {
        method: '50 frequency merges',
        values: ['306', '2.74', '2.99'],
        verdict: 'he, the, in, er, an, ed, and, to …',
      },
      {
        method: '200 frequency merges',
        isThisUnit: true,
        values: ['456', '1.67', '2.13'],
        best: 2,
        verdict: 'common fragments are tokens',
      },
      {
        method: '467 frequency merges (the pairs run out)',
        values: ['723', '1.00', '1.76'],
        verdict: 'every training word one token; held out still 1.76',
      },
      {
        method: '200 random merges',
        values: ['456', '2.86', '3.22'],
        verdict: 'the same budget spent on fragments nobody uses',
      },
      {
        method: 'Word-level vocabulary',
        values: ['209 words', '1.00', '36.6% unencodable'],
        verdict: 'the unknown token, a third of the time',
      },
    ],
    source:
      'python solutions/byte_pair_encoding_frequency_merge_vocabulary.py prints this table and asserts: incremental pair counts equal to a full recount for 60 merges and every merge a most-frequent pair; vocabulary exactly 256 + k; round trips exact at 0, 50, 200, and 467 merges on three texts including one with unseen characters; tokens per word strictly falling with k on both texts; random merges at least 1.3× worse than frequency merges held out; and a word-level out-of-vocabulary rate above 5%.',
  },

  figure: (
    <Figure
      id="fig-bpe-merges"
      aspect="16 / 7"
      caption="The first merges and what they buy. Left: the word “ledger” as bytes, then as the tokens it becomes after the merges that touch it; “the” is one token by the second merge. Right: tokens per word against the number of merges, training text (blue) and held-out text (amber), with the random-merge ablation at 200 (gray). At 467 merges the training pairs run out and every training word is a single token; the held-out text sits at 1.76 because it is made of the same pieces but not the same words."
      cite={{
        text: 'R. Sennrich, B. Haddow, A. Birch, "Neural machine translation of rare words with subword units," ACL 2016. DOI 10.18653/v1/P16-1162. P. Gage, "A new algorithm for data compression," C Users Journal 12(2), 1994. A. Radford et al., "Language models are unsupervised multitask learners," 2019.',
        href: 'https://doi.org/10.18653/v1/P16-1162',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A word shown as bytes and then as merged tokens, beside a chart of tokens per word falling as merges increase for training and held-out text">
        {[['l', 'e', 'd', 'g', 'e', 'r'], ['l', 'ed', 'g', 'er'], ['ledger']].map((toks, row) => (
          <g key={row}>
            <text x="30" y={60 + row * 44} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{row === 0 ? '0 merges' : row === 1 ? 'after ed, er' : 'after 467'}</text>
            {toks.map((t, i) => (
              <g key={i}>
                <rect x={110 + i * (t.length * 9 + 14)} y={46 + row * 44} width={t.length * 9 + 10} height="20" fill={row === 2 ? 'rgba(98,217,138,0.3)' : 'rgba(93,162,255,0.3)'} stroke="rgba(154,165,189,0.4)" />
                <text x={114 + i * (t.length * 9 + 14)} y={60 + row * 44} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{t}</text>
              </g>
            ))}
          </g>
        ))}
        <text x="30" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">first merges: he, the, in, er, an, ed, and, to, ha, ou, sa, it</text>
        <text x="30" y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">word-level vocabulary: 36.6% of held-out words unencodable</text>
        <text x="30" y="236" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">BPE: all 101 encoded, 71% as a single token</text>
        <rect x="340" y="40" width="280" height="190" fill="rgba(154,165,189,0.05)" stroke="rgba(154,165,189,0.35)" />
        <text x="300" y="46" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">5</text>
        <text x="300" y="234" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0</text>
        <text x="340" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0</text>
        <text x="600" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">467</text>
        <polyline points="340,60.5 370,126 460,166.5 620,192" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <polyline points="340,55 370,116 460,149 620,163" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <circle cx="460" cy="107.6" r="4" fill="#9aa5bd" />
        <text x="470" y="104" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">random 200: 3.22</text>
        <text x="470" y="160" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">held out: 1.76</text>
        <text x="500" y="205" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">training: 1.00</text>
        <text x="340" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">tokens per word vs merges (0, 50, 200, 467)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'byte_pair_encoding_frequency_merge_vocabulary.py',
  Viz: BpeViz,
  narration,
};
