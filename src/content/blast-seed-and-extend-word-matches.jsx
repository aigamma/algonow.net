import BlastViz from '../viz/BlastViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/blast_seed_and_extend_word_matches.py?raw';
import { narration } from './blast-seed-and-extend-word-matches.narration.js';

export const content = {
  given:
    'A query sequence and a database of thousands to millions of sequences; find the ones sharing a region of common ancestry with the query, fast enough to answer interactively, and say how surprised to be by each hit.',
  task: 'BLAST (Altschul, Gish, Miller, Myers, Lipman 1990). The algorithm: index every length-w word of the database once; look up the query’s words; extend each exact hit along its diagonal without gaps until the score drops X below its best (the high-scoring segment pair, HSP); judge each HSP by Karlin-Altschul statistics, E = K m n e^(−λS). The heuristic is seed-and-extend: a real homolog almost always keeps one short exact word, so never look where no word matches.',
  constraint:
    'Measured: a query of 80 bases against 328 sequences of 160 (200 random decoys, 128 planted homologs, 16 per divergence from 5% to 40%, with indels; +5/−4, gap −6, X-drop 40). 1,144 hits, 92 extensions, 5,408 cells against 4,198,400 for Smith-Waterman on every sequence (776×). At thresholds one above the best decoy (zero false positives for every method), w = 11 found 74 of 128 homologs, Smith-Waterman 121; all 47 misses share no 11-base word with the query. 69 of 74 HSPs equal the exact best ungapped segment; the same top hit. λ 0.192 from the scoring scheme, 0.197 fitted on 500 random sequences; 9.1 chance decoys predicted at a lower threshold, 13 observed. Banded gapped stage: 75 candidates, 102,000 cells, all 75 exact, no extra homolog. w = 7: 105 found at 15,458 cells; 15: 54, missing 40 of 41 at 30%+; 4: 120 at 410,736 cells (10×).',

  origins: (
    <p>
      Lipman and Pearson&apos;s FASTP (1985) and FASTA (1988) found diagonals
      rich in short identical k-tuples and aligned only there. Altschul,
      Gish, Miller, Myers, and Lipman published BLAST in the{' '}
      <strong>Journal of Molecular Biology, 1990</strong>: a word index, an
      ungapped X-drop extension, and a probability for every hit from the
      statistics Karlin and Altschul proved the same year (the best ungapped
      local score of two random sequences is extreme-value distributed, λ
      and K set by the scoring scheme). It became one of the most cited
      papers in science. Gapped BLAST and PSI-BLAST (1997) added the two-hit
      rule, gapped extension from the best seed, and iterated profiles;
      megablast (2000) stretched the word to 28 for near-identical DNA.
      Nucleotide BLAST seeds on 11-base words, protein BLAST on 3-letter
      words plus a neighborhood of similar words. BLAT, BWA, Bowtie, and
      minimap2 are seed-and-extend heirs.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>index and the verdict</strong>. The database is hashed
      once (49,200 words of 11); the query&apos;s 70 words return 1,144 hits,
      92 of them on uncovered diagonals are extended, 5,408 cells where the
      referee spends 4,198,400. The verdict is Karlin-Altschul: λ fitted on
      500 fresh random sequences is 0.197 against the theoretical 0.192 for
      +5/−4; at threshold 54 the fit predicts 9.1 chance decoys and 13
      appear. The referee is <strong>Smith-Waterman on every sequence</strong>{' '}
      plus the exact best ungapped segment of every pair: every HSP recounts
      from its extents, never exceeds either, and 69 of 74 equal the exact
      ungapped optimum. Both methods pick the same top hit.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>filter</strong>, and pays for it in sensitivity.
      Smith-Waterman found 121 of 128 planted homologs at zero decoys; the
      11-base seeds found <strong>74</strong>, and every one of the 47 misses
      shares no 11-base word with the query: not one extension stopped
      short. Complete at 5% divergence, 0.75 at 20%, 0.44 at 25%, 0.06 at
      40%. Shorter words see further (w = 7: 105 found, 15,458 cells; w = 4:
      120 found, 410,736 cells), longer words see less (w = 15: 54). The
      gapped stage reproduces the exact Smith-Waterman score for all 75
      candidates at 102,000 cells but adds no homolog: it cannot rescue a
      seed that never fired.
    </p>
  ),

  picture: (
    <p>
      A librarian hunting a paraphrased passage across a whole library.
      Reading every book line by line against the passage is Smith-Waterman:
      certain, and a lifetime. Instead she keeps a concordance of every rare
      phrase and the pages it occurs on, looks up the passage&apos;s phrases,
      and goes only to those pages, reading outward from each match forward
      and backward until the text has drifted far enough from the best
      stretch she has seen. A paraphrase that kept no phrase intact is
      invisible to her. That is the bargain: everything that still shares a
      phrase, in a sliver of the time; nothing that shares none.
    </p>
  ),

  steps: [
    <>
      <strong>Index:</strong> hash every length-w word of the database with its
      sequence and position, once (49,200 entries at w = 11), amortized
      over every future query.
    </>,
    <>
      <strong>Seed:</strong> slide the query one base at a time, look up each
      word; every entry returned is a hit on the diagonal (subject position
      − query position): 1,144 hits.
    </>,
    <>
      <strong>Extend:</strong> from each hit on an uncovered diagonal, step
      outward both ways adding +5 or −4, remember the best score and its
      extents, stop when the running score falls more than X = 40 below the
      best; the segment at the best is the HSP (92 extensions, 5,408 cells).
    </>,
    <>
      <strong>Judge:</strong> E = K m n e^(−λS) with λ from the scoring scheme
      (0.192; fitted 0.197); keep HSPs above the threshold (66 here, one
      above the best decoy).
    </>,
    <>
      <strong>Refine:</strong> banded Smith-Waterman around the seed diagonal
      for candidates above half the threshold: 75 candidates, 102,000 cells,
      all 75 equal to the full score.
    </>,
  ],

  signals: [
    <>
      <strong>A database searched many times:</strong> index once, pay per
      hit; the cost scales with the hits, not the database.
    </>,
    <>
      <strong>Homologs close enough to keep exact words:</strong> at w = 11,
      roughly 25% divergence or less; sensitivity 1.00 at 5%, 0.44 at 25%,
      0.06 at 40%.
    </>,
    <>
      <strong>You need a probability, not a score:</strong> Karlin-Altschul
      turns S into an expected count of chance hits; λ matched theory to 3%.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Smith-Waterman on every sequence</strong>:
      the exact local alignment, 121 of 128 homologs at zero decoys, and the
      referee here, at 4,198,400 cells for 328 short sequences.
    </>
  ),

  strength: (
    <>
      <strong>Hits, not sequences, set the cost, and the verdict is a
      probability.</strong> 5,408 cells against 4,198,400 (776×), zero
      decoys, the same top hit as the referee, 69 of 74 HSPs exactly
      optimal, and a fitted λ within 3% of the theory that prices every hit.
    </>
  ),
  weakness: (
    <>
      <strong>It sees only what shares an exact word.</strong> 47 homologs
      the referee found, all 47 without one shared 11-base word, and no
      extension or gapped stage recovers a seed that never fired;
      sensitivity 0.44 at 25% divergence against 1.00; the E-value is an
      extrapolation (1.4 chance hits predicted at the threshold, none seen);
      the two-hit rule starves on a short DNA query (31 found of 74).
    </>
  ),

  problem: 'Sequence database search',
  problemSlug: 'sequence-database-search',
  rivals: [
    {
      name: 'BLAST × Seed-and-extend word matches',
      isThisUnit: true,
      algoName: 'BLAST',
      cost: 'index once; per query O(hits × extension length)',
      wins: (
        <>
          <strong>5,408 cells against 4,198,400</strong>; 74 of 128 homologs
          at zero decoys; a probability on every hit.
        </>
      ),
      costs: (
        <>
          Every miss is an unfired seed: 47 of 47; sensitivity 0.44 at 25%
          divergence.
        </>
      ),
      when: 'A big database, many queries, homologs that still share exact words: the default.',
    },
    {
      name: 'FASTA search',
      algoName: 'FASTA search',
      cost: 'k-tuple diagonal counting, then banded alignment',
      wins: (
        <>
          Shorter tuples see further: words of 7 found 105 and words of 4
          found 120 of 128 here, against 74 at 11.
        </>
      ),
      costs: (
        <>
          Hits explode: 20,101 hits and 410,736 cells at w = 4, a 10×
          speedup where 11 gave 776×; the diagonal filter is the tax.
        </>
      ),
      when: 'Moderately divergent sequences where sensitivity matters more than speed.',
    },
    {
      name: 'Smith-Waterman',
      algoName: 'Smith-Waterman',
      cost: 'O(m n) cells per sequence, every sequence',
      wins: (
        <>
          <strong>121 of 128</strong> at zero decoys; the exact referee;
          finds the homologs that kept no word at all.
        </>
      ),
      costs: (
        <>
          4,198,400 cells for 328 short sequences; every cell of every
          matrix, no index to amortize.
        </>
      ),
      when: 'Small databases, or the final banded stage on seeded candidates (75 of 75 exact here); puzzle 56.',
    },
    {
      name: 'BWA-MEM',
      algoName: 'BWA-MEM',
      cost: 'FM-index lookups per read, then banded extension',
      wins: (
        <>
          Maximal exact match seeds in a compressed index: lookup cost
          independent of genome size; built for millions of reads.
        </>
      ),
      costs: (
        <>
          Long seeds want near identity: our 15-base words missed 40 of 41
          homologs at 30%+ divergence.
        </>
      ),
      when: 'Mapping short reads to one reference at a percent or two of divergence, not remote homology.',
    },
  ],
  neverUse: {
    name: 'A word size tuned for one regime, used in another',
    why: (
      <>
        Words of 15 bases missed <strong>40 of the 41 homologs</strong> at 30%
        divergence or more that Smith-Waterman found (54 of 128 against 74
        at w = 11) to save fewer than 2,000 cells; megablast&apos;s 28 expects
        near identity and is blind to anything else. The other way, words
        of 4 fired 20,101 hits and 12,135 extensions, 410,736 cells, a 10×
        speedup where 11 gave 776×, and still missed 8 homologs. The word is
        the dial between the two failures; set it by the divergence you
        expect, never by habit.
      </>
    ),
  },

  contest: {
    instance:
      'A query of 80 bases against 328 sequences of 160: 200 random decoys and 128 planted homologs (16 per divergence from 5% to 40%, with indels); +5/−4, gap −6, X-drop 40; zero false positives on the decoys for every method; one currency: cells (extension steps for the seeded methods)',
    columns: ['found of 128', 'cells', 'speedup', 'the catch'],
    rows: [
      {
        method: 'BLAST, w = 11, ungapped',
        isThisUnit: true,
        values: ['74', '5,408', '776×', 'every miss is an unfired seed (47 of 47)'],
        verdict: 'the bargain',
      },
      {
        method: 'BLAST, w = 11, banded gapped stage',
        values: ['74', '107,408', '39×', 'exact Smith-Waterman scores for all 75 candidates, no new homolog'],
        verdict: 'better alignments, same hits',
      },
      {
        method: 'BLAST, w = 7',
        values: ['105', '15,458', '272×', '2,341 hits, 337 extensions'],
        verdict: 'the dial turned toward sensitivity',
      },
      {
        method: 'BLAST, w = 15',
        values: ['54', '3,424', '1,226×', 'misses 40 of 41 at 30%+'],
        verdict: 'blind to divergence',
      },
      {
        method: 'BLAST, w = 4',
        values: ['120', '410,736', '10×', '20,101 hits, 12,135 extensions'],
        verdict: 'the hit list explodes',
      },
      {
        method: 'BLAST, w = 11, two-hit rule',
        values: ['31', '2,080', '2,019×', 'a protein trick starving on 80 bases of DNA'],
        best: 2,
        verdict: 'fast and nearly blind',
      },
      {
        method: 'Smith-Waterman on every sequence',
        values: ['121', '4,198,400', '1×', 'every cell of every matrix'],
        best: 0,
        verdict: 'the referee',
      },
    ],
    source:
      'python solutions/blast_seed_and_extend_word_matches.py prints this table and asserts: every HSP recounts and never exceeds the Smith-Waterman score or the exact ungapped maximum of its pair; Smith-Waterman complete to 25% and at least as sensitive at every level; sensitivity falling from w = 7 to 11 to 15; two-hit extends less; w = 4 fires over ten times the hits; w = 11 under a hundredth of the referee cells; fitted λ within 30% of Karlin-Altschul, chance hits within statistical error; no decoy admitted; the same top hit; every banded score equal to the full one; every w = 11 miss an unfired seed.',
  },

  figure: (
    <Figure
      id="fig-seed-and-extend"
      aspect="16 / 7"
      caption="Left: sensitivity against divergence for Smith-Waterman (green) and words of 7 (amber), 11 (blue), and 15 (red), 16 planted homologs per point, zero false positives on 200 decoys for every method. The seeded curves fall where exact words stop surviving: all 47 misses at w = 11 share no 11-base word with the query. Right: cells of work on a log scale; the 11-base search spends 776 times less than Smith-Waterman, and the banded gapped stage buys exact scores for 75 candidates at 102,000 more."
      cite={{
        text: 'S. F. Altschul, W. Gish, W. Miller, E. W. Myers, D. J. Lipman, "Basic local alignment search tool," Journal of Molecular Biology 215(3), 1990, 403-410. S. Karlin, S. F. Altschul, PNAS 87, 1990, 2264-2268. S. F. Altschul et al., "Gapped BLAST and PSI-BLAST," Nucleic Acids Research 25(17), 1997, 3389-3402.',
        href: 'https://doi.org/10.1016/S0022-2836(05)80360-2',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Sensitivity against divergence for Smith-Waterman and three word sizes, beside a log-scale bar chart of cells of work by method">
        {(() => {
          const divs = [5, 10, 15, 20, 25, 30, 35, 40];
          const series = [
            ['Smith-Waterman', [1, 1, 1, 1, 1, 0.94, 0.94, 0.69], '#62d98a'],
            ['w = 7', [1, 1, 1, 1, 0.94, 0.69, 0.75, 0.19], '#f0b94b'],
            ['w = 11', [1, 0.94, 0.88, 0.75, 0.44, 0.38, 0.19, 0.06], '#5da2ff'],
            ['w = 15', [1, 0.94, 0.62, 0.56, 0.19, 0, 0.06, 0], '#e2606c'],
          ];
          const px = (d) => 40 + ((d - 5) / 35) * 250;
          const py = (v) => 220 - v * 170;
          const bars = [['SW', 4198400, '#62d98a'], ['w=4', 410736, '#f0b94b'], ['w=11+gap', 107408, '#5da2ff'], ['w=7', 15458, '#f0b94b'], ['w=11', 5408, '#5da2ff'], ['w=15', 3424, '#e2606c']];
          const bx = 360;
          const by = 220;
          const hgt = (v) => (Math.log10(v) / Math.log10(5000000)) * 170;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="40" y="22" fill="#9aa5bd" fontSize="10">fraction of the 16 planted homologs found, by divergence</text>
              <line x1="40" y1="220" x2="290" y2="220" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="40" y1="50" x2="40" y2="220" stroke="#9aa5bd" strokeOpacity="0.5" />
              {divs.map((d) => (
                <text key={d} x={px(d) - 6} y="234" fill="#9aa5bd" fontSize="9">{d}%</text>
              ))}
              {[0, 0.5, 1].map((v) => (
                <text key={v} x="18" y={py(v) + 3} fill="#9aa5bd" fontSize="9">{v.toFixed(1)}</text>
              ))}
              {series.map(([name, ys, c], k) => (
                <g key={name}>
                  <polyline fill="none" stroke={c} strokeWidth="2" points={ys.map((v, i) => `${px(divs[i])},${py(v)}`).join(' ')} />
                  {ys.map((v, i) => <circle key={i} cx={px(divs[i])} cy={py(v)} r="2.5" fill={c} />)}
                  <text x={44} y={262 + 0 * k} dx={k * 62} fill={c} fontSize="9">{name}</text>
                </g>
              ))}
              <text x={bx} y="22" fill="#9aa5bd" fontSize="10">cells of work, log scale (328 sequences)</text>
              {bars.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 44} y={by - hgt(v)} width="32" height={hgt(v)} fill={c} fillOpacity="0.85" />
                  <text x={bx + i * 44 - 2} y={by - hgt(v) - 4} fill={c} fontSize="8">{v.toLocaleString()}</text>
                  <text x={bx + i * 44 - 2} y={by + 12} fill="#9aa5bd" fontSize="8">{name}</text>
                </g>
              ))}
              <text x={bx} y={by + 30} fill="#9aa5bd" fontSize="10">776x less work at w = 11; 39x with the gapped stage</text>
              <text x={bx} y={by + 44} fill="#9aa5bd" fontSize="10">found: 121, 120, 74, 105, 74, 54 of 128</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'blast_seed_and_extend_word_matches.py',
  Viz: BlastViz,
  narration,
};
