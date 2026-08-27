import SmithWatermanViz from '../viz/SmithWatermanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/smith_waterman_zero_floor.py?raw';
import { narration } from './smith-waterman-zero-floor.narration.js';

export const content = {
  given:
    'Two sequences that may share only a small, strongly similar island amid unrelated flanks.',
  task: 'The highest-scoring local alignment: the best matching substring pair, with its alignment as a certificate.',
  constraint:
    'The definitional bar is exact and enumerable: Smith-Waterman’s answer must equal the maximum over ALL substring pairs of their global alignment score: verified here by exhaustive enumeration on 150 trials, thousands of pairs each.',

  origins: (
    <p>
      Smith and Waterman published the two-line modification in{' '}
      <strong>1981</strong>: Needleman-Wunsch (1970) had given biology
      global alignment, but evolution conserves <em>domains</em>, not
      whole sequences: the local question needed asking. The floor-at-
      zero trick made it a dynamic program; Gotoh added affine gaps in
      1982; and Altschul&apos;s <strong>BLAST</strong> (1990)
      industrialized it with seed-and-extend, becoming one of the most
      cited tools in science. The statistical fine print: Karlin-
      Altschul phase theory: bit this very page during construction,
      and the story is kept below.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>alignment grid</strong>: cell (i, j) scores the
      best alignment ending at prefix positions i and j, built from the
      diagonal (match/mismatch) and the two gap moves: Needleman-
      Wunsch&apos;s machinery, unchanged, O(nm) cells. Global
      alignment reads the answer at the far corner: which is exactly
      why it drowns: both <em>ends</em> are forced to align, and 400
      characters of unrelated flank taxed the planted island down to a
      global score of <strong>−285</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>two one-token edits</strong> that change the
      question. Floor every cell at zero: an alignment may{' '}
      <em>start</em> anywhere, because debts are never carried in. Take
      the answer as the argmax over the whole matrix: it may{' '}
      <em>end</em> anywhere. The same grid then scored the island at{' '}
      <strong>70</strong> where global scored −285: and the ablation
      isolates the floor&apos;s share: without it, the best score
      collapses to 19. Two edits, verified equal to exhaustive
      substring-pair enumeration on every trial.
    </p>
  ),

  picture: (
    <p>
      Comparing two long family histories for a shared ancestor.
      Global alignment is a judge who insists the <em>entire</em>{' '}
      documents correspond, first page to last: two unrelated families
      with one common great-grandmother score terribly, the shared
      chapter taxed away by four hundred pages of noise. The local
      judge reads with a simple discipline: the moment the running
      resemblance drops to zero, forget everything and start fresh:
      and remember the best stretch ever seen. Debts forgiven at zero,
      credit banked at the peak: the shared chapter stands out like a
      signature.
    </p>
  ),

  steps: [
    <>
      <strong>Fill the grid:</strong> H[i][j] = max(0, diag +
      match/mismatch, up + gap, left + gap): the 0 is the whole
      heuristic.
    </>,
    <>
      <strong>Track the argmax:</strong> the best cell anywhere is the
      local score: the alignment ends there.
    </>,
    <>
      <strong>Trace back to the first zero:</strong> that is where it
      began: the path is the certificate (re-priced move-by-move in the
      tests).
    </>,
    <>
      <strong>Score in the log phase:</strong> random drift must be
      firmly negative (BLASTN-strength mismatches), or local scores of
      pure noise grow with length: measured here, the hard way.
    </>,
    <>
      <strong>Band only on a bet:</strong> the diagonal band is 12×
      cheaper and exactly as blind as its assumption (both measured).
    </>,
  ],

  signals: [
    <>
      <strong>Conserved regions in divergent contexts:</strong> protein
      domains, gene fragments, code plagiarism inside rewritten files:
      the island shape.
    </>,
    <>
      <strong>You need the alignment, not just a score:</strong> the
      traceback is evidence: where, how long, which mutations.
    </>,
    <>
      <strong>Sensitivity is the contract:</strong> SW is the exact
      gold standard BLAST approximates: when a miss is expensive, the
      full grid earns its O(nm).
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Needleman-Wunsch</strong>, the
      grid without the floor and with the corner answer: the right tool
      when sequences correspond end-to-end (comparing two versions of
      the same gene), and measured here scoring the island instance at{' '}
      <strong>−285</strong>: not wrong, answering a different question.
      The site&apos;s live Wagner-Fischer unit is this same grid in its
      edit-distance costume.
    </>
  ),

  strength: (
    <>
      <strong>Definitionally exact, certificate-bearing, and
      shape-immune.</strong> Equal to exhaustive substring-pair
      enumeration on all 150 trials; the traceback re-priced
      move-by-move; the planted island recovered at ≥85% overlap at
      both aligned and shifted offsets (scores 124 and 120): where the
      banded shortcut found only the first (124 vs 21, measured).
    </>
  ),
  weakness: (
    <>
      <strong>O(nm) always, and statistically sharp-edged.</strong> The
      full grid pays 1.44M cells whether the island is easy or absent:
      BLAST&apos;s seeds exist because databases cannot. And the
      scoring parameters are load-bearing: this page&apos;s first draft
      used gentle penalties (2/−1/−2) and measured a meandering local
      score of 172 against a 74-point island: the linear phase of
      Karlin-Altschul theory, found by measurement and fixed with
      BLASTN-strength mismatches. Local alignment without phase
      discipline is a random-number generator with a traceback.
    </>
  ),

  problem: 'Edit distance and sequence alignment',
  problemSlug: 'edit-distance',
  rivals: [
    {
      name: 'Smith-Waterman × zero floor',
      isThisUnit: true,
      algoName: 'Smith-Waterman',
      cost: 'O(nm), exact',
      wins: (
        <>
          <strong>The definitional gold standard</strong>: equal to
          all-substring-pairs enumeration (asserted); islands found at
          any offset; the traceback as evidence.
        </>
      ),
      costs: (
        <>
          The full grid every time, and scoring parameters that must
          keep random drift negative (measured lesson).
        </>
      ),
      when: 'Conserved-region discovery where sensitivity is the contract: the verifier behind every faster tool.',
    },
    {
      name: 'Needleman-Wunsch',
      cost: 'O(nm), global',
      wins: (
        <>
          The end-to-end question answered exactly: comparing
          full-length homologs, versions, transcripts: the 1970
          original the floor was carved from.
        </>
      ),
      costs: (
        <>
          Forced ends: the island instance scored <strong>−285</strong>
          : unrelated flanks tax everything.
        </>
      ),
      when: 'Sequences that correspond globally: same gene, two individuals: a different question, honestly.',
    },
    {
      name: 'Banded alignment × diagonal band',
      algoName: 'Banded alignment',
      cost: 'O(n·k)',
      wins: (
        <>
          <strong>118,650 cells vs 1,440,000</strong> (12×), and the
          same 124-point island when its bet holds: similar sequences
          stay near the diagonal.
        </>
      ),
      costs: (
        <>
          The bet is the blindness: the island shifted 400 off-diagonal
          scored <strong>21</strong>: missed entirely, measured.
        </>
      ),
      when: 'Similar-length, similar-structure pairs: resequencing reads against a reference: where the bet is physics.',
    },
    {
      name: 'BLAST × seed-and-extend',
      algoName: 'BLAST',
      cost: 'sublinear per query, heuristic',
      wins: (
        <>
          The industrial layer: exact word seeds locate candidate
          islands, SW-style extension confirms: databases of billions
          searched in seconds: among the most cited tools in science.
        </>
      ),
      costs: (
        <>
          A heuristic with tuned sensitivity: seeds can miss weak
          islands the full grid would find: SW remains its verifier.
        </>
      ),
      when: 'Database scale: one query against millions of sequences: the reason genomics is interactive.',
    },
  ],
  neverUse: {
    name: 'Local alignment outside the log phase',
    why: (
      <>
        This page&apos;s first draft used gentle scoring (match +2,
        mismatch −1, gap −2) and the &quot;best local alignment&quot;
        of two <em>unrelated</em> flanks measured 172: outscoring the
        74-point planted island by meandering through chance matches.
        Nothing crashed; the traceback looked authoritative; the answer
        was noise. Karlin-Altschul theory names the disease: when
        expected random score drifts non-negative, local scores grow
        with length (the linear phase) and significance evaporates.
        The fix is parameter discipline: mismatches strong enough that
        randomness loses money: and the test that catches it is the one
        run here: plant an island, and check the score comes from it.
      </>
    ),
  },

  contest: {
    instance:
      'a 60-char island planted in 1,200×1,200 sequences, at near-diagonal and 400-shifted offsets; referee: exhaustive substring-pair enumeration on 150 small trials (SW == max over all pairs of global score, exactly), tracebacks re-priced move-by-move',
    columns: ['cells', 'near-diag / shifted'],
    rows: [
      {
        method: 'Needleman-Wunsch (global)',
        values: ['1,440,000', 'drowned / drowned'],
        verdict: 'forced ends: the 400-char instance scored −285',
      },
      {
        method: 'Smith-Waterman (full)',
        isThisUnit: true,
        values: ['1,440,000', '124 / 120'],
        best: 1,
        verdict: 'found at any offset: the shape-immune gold standard',
      },
      {
        method: 'Banded, k = 50',
        values: ['118,650', '124 / 21'],
        verdict: '12× cheaper, and exactly as blind as its bet: measured',
      },
    ],
    source:
      "python solutions/smith_waterman_zero_floor.py prints this table and asserts: the definitional equivalence (SW == max over all substring pairs of global score) exhaustively on 150 trials with certificates re-priced; the 400-char island recovered at ≥85% overlap with local 70 vs global −285 and the floor ablated (19 without it); the band's discount (< 1/8 the cells) and its blindness (21 vs 120 on the shifted island); and the phase note recorded in-code: the draft's gentle scoring measured a 172-point meander over a 74-point island before BLASTN-strength penalties restored the log phase.",
  },

  figure: (
    <Figure
      id="fig-sw-floor"
      aspect="16 / 7"
      caption="Two one-token edits. The grid is Needleman-Wunsch's; the floor at zero lets alignments start anywhere (debts forgiven), and the argmax over the matrix lets them end anywhere (credit banked at the peak). The island lights up as a diagonal ridge rising from a sea of zeros: global alignment, forced corner-to-corner, scored the same instance at −285. The fine print is the phase: random drift must lose money, or the sea itself starts rising: measured on this page, the hard way."
      cite={{
        text: 'Smith & Waterman, "Identification of Common Molecular Subsequences", J. Molecular Biology 147, 1981; global sibling: Needleman-Wunsch 1970; affine gaps: Gotoh 1982; the phase statistics: Karlin & Altschul 1990.',
        href: 'https://doi.org/10.1016/0022-2836(81)90087-5',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An alignment matrix with a bright diagonal ridge over a sea of zeros">
        <rect x="60" y="40" width="220" height="200" fill="rgba(93,162,255,0.06)" stroke="#2a3450" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={100 + i * 16} y={90 + i * 14} width="14" height="12" fill={`rgba(98,217,138,${0.25 + i * 0.08})`} />
        ))}
        <text x="60" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">H[i][j] = max(0, diag+s, up+g, left+g)</text>
        <text x="248" y="228" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">argmax: end here</text>
        <text x="88" y="86" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">first 0: start here</text>
        <text x="330" y="70" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">the island: local 70</text>
        <text x="330" y="94" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">same instance, global: −285</text>
        <text x="330" y="118" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">floor ablated: 19 (the 0 is the engine)</text>
        <text x="330" y="156" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">the phase fine print, measured:</text>
        <text x="330" y="178" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">gentle scoring (2/−1/−2): noise scored 172</text>
        <text x="330" y="196" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">log-phase scoring (2/−3/−4): islands rule</text>
        <text x="60" y="270" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">verified equal to ALL substring-pairs enumeration, 150 trials · traceback re-priced move by move</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'smith_waterman_zero_floor.py',
  Viz: SmithWatermanViz,
  narration,
};
