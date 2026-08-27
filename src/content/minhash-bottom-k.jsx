import MinHashViz from '../viz/MinHashViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/minhash_bottom_k.py?raw';
import { narration } from './minhash-bottom-k.narration.js';

export const content = {
  given:
    'Two large sets: documents as shingle sets, users as feature sets.',
  task: 'Estimate their Jaccard similarity |A∩B| / |A∪B| from tiny sketches.',
  constraint:
    'At corpus scale the sets cannot meet: comparing all pairs of 200 documents is 19,900 full set intersections, and real corpora have millions. Sketches must be tiny, one-pass, and composable: the sketch of a union must be computable from the sketches alone (asserted exact below).',

  origins: (
    <p>
      Andrei Broder invented min-wise hashing at <strong>AltaVista in
      1997</strong> to deduplicate the early web: the search engine was
      drowning in mirror copies. The collision theorem is his: under a
      random permutation, the probability two sets share a minimum{' '}
      <em>is</em> their Jaccard similarity, exactly. Indyk and
      Motwani&apos;s locality-sensitive hashing (1998) turned sketches
      into sub-quadratic <em>search</em>; genomics adopted the idea as
      Mash distance (its own atlas entry); and today the largest
      deployment is LLM training-set deduplication: the same 1997 trick,
      now guarding trillion-token corpora.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>collision theorem</strong>. Hash every element
      with one random function; the minimum of A∪B is a uniformly random
      element of the union, and the two sets report the same minimum
      precisely when that element lies in the intersection: so P[min
      collision] = J, <em>exactly</em>. The page measures it at its
      exact value: over 2,000 independent hash functions on a pair of
      known J = 1/3, the single-min collision rate came out{' '}
      <strong>0.3340</strong>. A one-line theorem, verified to three
      decimals.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>bottom-k economy</strong>. Repeating the
      theorem with k independent hash functions costs k hashes per
      element (2,560,000 for one 10,000-element set at k = 256).
      Bottom-k keeps the k smallest values of <em>one</em> hash: 10,000
      hashes, <strong>256× cheaper</strong>, counted: one pass, and the
      union&apos;s sketch is exactly the merge of the sketches (asserted
      as list equality, 100/100 pairs). The error law is the binomial
      one, measured: RMSE 0.0961 → 0.0115 as k climbs 16 → 1,024,
      tracking 1/√k.
    </p>
  ),

  picture: (
    <p>
      Two clubs hold a joint lottery. Every membership card gets a
      random ticket number; shared members hold one card that counts for
      both clubs. Ask each club for its lowest ticket: the overall
      lowest card in the room is a uniformly random card, so the clubs
      announce the <em>same</em> number exactly when that card belongs
      to both: probability equal to the shared fraction. One draw is one
      noisy bit; keeping the k lowest tickets is running k lotteries
      from a single drawing: and two clubs can compare membership
      without ever showing their lists.
    </p>
  ),

  steps: [
    <>
      <strong>Shingle:</strong> turn each document into a set (3-word
      windows here: the sets are what similarity is measured on).
    </>,
    <>
      <strong>Hash once per element</strong>, keep the k smallest values:
      the signature.
    </>,
    <>
      <strong>Estimate:</strong> among the k smallest of the merged
      signatures, the fraction present in both is Ĵ.
    </>,
    <>
      <strong>Compose freely:</strong> sketch(A∪B) = merge of sketches,
      exactly: distributed corpora sketch shard-by-shard.
    </>,
    <>
      <strong>Search with bands:</strong> split signatures into bands;
      only band-collisions become candidate pairs: 5/5 planted
      duplicates found at 3,980× fewer comparisons, measured.
    </>,
  ],

  signals: [
    <>
      <strong>Similarity at corpus scale:</strong> dedup, plagiarism,
      near-duplicate web pages, training-set decontamination: the
      all-pairs wall is the enemy.
    </>,
    <>
      <strong>Sets, and Jaccard is the right question:</strong> shingles,
      n-grams, feature sets: for weighted vectors and cosine, the
      hyperplane cousin (SimHash) is the tool.
    </>,
    <>
      <strong>One pass, mergeable, private-ish:</strong> streams sketch
      as they flow, shards merge exactly, and the sets themselves never
      travel.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>exact set comparison</strong>: it is
      also this page&apos;s referee (every estimate is checked against
      full set ops, including on this repository&apos;s own prose). For
      one pair it is cheap and right. The wall is pairs: 19,900
      intersections for 200 documents, ten billion for 100,000: the
      sketch does not beat the set on accuracy: it beats the{' '}
      <em>quadratic</em> on existence.
    </>
  ),

  strength: (
    <>
      <strong>An exact theorem, a priced error dial, and
      composability.</strong> Collision rate 0.3340 vs true 0.3333;
      RMSE halving per 4× k exactly as 1/√k promises (0.0961 / 0.0500 /
      0.0255 / 0.0115, measured); union sketches exact; and the banding
      step turns estimation into <em>search</em>: perfect recall on
      every planted near-duplicate at 1/3,980th the comparisons.
    </>
  ),
  weakness: (
    <>
      <strong>Jaccard only, k hashes of noise, and tiny-J
      blindness.</strong> The estimate carries √(J(1−J)/k) noise, so
      distinguishing J = 0.02 from 0.04 (this site&apos;s two narrations
      measured 0.034) needs k in the thousands; weighted similarity
      wants SimHash or weighted MinHash variants; and banding&apos;s
      S-curve must be tuned to the threshold you care about: bands
      catch what they were shaped to catch.
    </>
  ),

  problem: 'Similarity sketching and near-duplicates',
  problemSlug: 'similarity-sketching',
  rivals: [
    {
      name: 'MinHash × bottom-k signatures',
      isThisUnit: true,
      algoName: 'MinHash',
      cost: 'O(|S|) sketch, O(k) compare',
      wins: (
        <>
          One hash per element (<strong>256× cheaper</strong> than
          k-wise, counted), exact composability, and the 1/√k dial
          measured end to end.
        </>
      ),
      costs: (
        <>
          Positionally unaligned rows: banding needs the k-wise variant;
          and tiny similarities drown in the noise floor.
        </>
      ),
      when: 'Set similarity at scale: dedup, containment, sketch-and-merge pipelines: the tier-one default.',
    },
    {
      name: 'Shingling × MinHash-LSH',
      algoName: 'Shingling near-duplicate',
      cost: 'O(n·k) index, sub-quadratic search',
      wins: (
        <>
          Turns sketches into search: banded signatures surfaced{' '}
          <strong>all 5 planted near-duplicates in 5 candidate
          pairs</strong> where all-pairs needed 19,900: the S-curve
          doing its job.
        </>
      ),
      costs: (
        <>
          The band/row split is a tuned threshold filter: pairs far from
          the target similarity are invisible by design.
        </>
      ),
      when: 'Finding the duplicates, not just measuring them: web dedup, training-data hygiene at corpus scale.',
    },
    {
      name: 'SimHash × random hyperplanes',
      algoName: 'SimHash',
      cost: 'O(d) per doc, Hamming compare',
      wins: (
        <>
          The cosine-space cousin: weighted features project onto random
          hyperplanes into a single 64-bit fingerprint; Google crawled
          the web on it.
        </>
      ),
      costs: (
        <>
          Estimates angle, not Jaccard: weights help, set semantics
          blur, and containment questions stop making sense.
        </>
      ),
      when: 'Weighted vector similarity and tight memory: one machine word per document.',
    },
  ],
  neverUse: {
    name: 'All-pairs exact comparison at corpus scale',
    why: (
      <>
        Exact Jaccard is this page&apos;s <em>referee</em>: per pair it
        is the right tool. As a corpus strategy it is a quadratic bill
        for mostly-zero answers: 19,900 full intersections for 200
        documents, ten billion for 100,000, almost all of them
        confirming that two unrelated pages are unrelated. The banding
        demo did the same job with 5 candidate comparisons and perfect
        recall. Spending exactness on pairs that a 32-byte sketch could
        dismiss is the quadratic tax in its purest form: pay it per
        candidate, never per pair.
      </>
    ),
  },

  contest: {
    instance:
      'sets of 3,000 elements with exact-Jaccard referees (constructed to target J ∈ {0.1, 0.3, 0.5, 0.8}); 200 trials per sketch size; reference: √(J(1−J)/k) at J = 0.5',
    columns: ['RMSE (measured)', '1/√k reference'],
    rows: [
      {
        method: 'k = 16',
        values: ['0.0961', '0.1250'],
        verdict: 'a 128-byte opinion: fine for coarse buckets',
      },
      {
        method: 'k = 64',
        values: ['0.0500', '0.0625'],
        verdict: 'the banding workhorse size',
      },
      {
        method: 'k = 256',
        isThisUnit: true,
        values: ['0.0255', '0.0312'],
        best: 0,
        verdict: '±2.5 points from 2KB: the deployed default',
      },
      {
        method: 'k = 1,024',
        values: ['0.0115', '0.0156'],
        verdict: 'four times the sketch, half the noise: the law, obeyed',
      },
    ],
    source:
      'python solutions/minhash_bottom_k.py prints this table and asserts: the collision theorem measured at 668/2,000 = 0.3340 vs exact 1/3; composability exact (sketch of union == merged sketches) on 100/100 pairs; the RMSE ladder strictly monotone with the 4×k → ≥2.5× shrink; the hashing bill counted (10,000 vs 2,560,000); this repo’s own prose refereed by full set ops (two narrations J = 0.034; the plan vs its front 70%: J = 0.703, est 0.656); and LSH banding surfacing all 5 planted near-duplicates in 5 candidate pairs (3,980× fewer comparisons than all-pairs).',
  },

  figure: (
    <Figure
      id="fig-minhash-collision"
      aspect="16 / 7"
      caption="The collision theorem. Hash every element of both sets with one random function; the minimum of the union is a uniformly random element of the union, so the two sets report the same minimum exactly when that element is shared: P[collision] = J. Measured here at 0.3340 against a true 1/3 over 2,000 independent hash functions. Bottom-k runs k such lotteries from one drawing; banding turns agreement into an index."
      cite={{
        text: 'Broder, "On the resemblance and containment of documents", SEQUENCES 1997 (the AltaVista dedup work); LSH: Indyk & Motwani, STOC 1998. The genomics reading is Mash (Ondov et al. 2016), its own atlas entry.',
        href: 'https://doi.org/10.1109/SEQUEN.1997.666900',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two overlapping sets with hashed elements and the shared minimum event">
        <circle cx="230" cy="120" r="88" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeWidth="1.5" />
        <circle cx="340" cy="120" r="88" fill="rgba(240,185,75,0.10)" stroke="#f0b94b" strokeWidth="1.5" />
        <text x="150" y="40" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">A</text>
        <text x="412" y="40" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">B</text>
        <text x="266" y="124" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">A∩B</text>
        <circle cx="285" cy="152" r="6" fill="#62d98a" />
        <text x="252" y="180" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the union&apos;s minimum</text>
        <text x="60" y="238" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">P[the minimum lies in the overlap] = |A∩B| / |A∪B| = J, exactly</text>
        <text x="60" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 668 of 2,000 lotteries shared their winner: 0.3340 vs a true 0.3333</text>
        <text x="470" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">bottom-k: keep the k</text>
        <text x="470" y="138" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">lowest tickets: k</text>
        <text x="470" y="156" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">lotteries, one drawing</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'minhash_bottom_k.py',
  Viz: MinHashViz,
  narration,
};
