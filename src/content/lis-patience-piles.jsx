import LisViz from '../viz/LisViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lis_patience_piles.py?raw';
import { narration } from './lis-patience-piles.narration.js';

export const content = {
  given:
    'A sequence of values in a fixed order: versions, heights, timestamps’ payloads: and the order is not negotiable.',
  task: 'The longest strictly increasing subsequence: its length and one witness: keeping the order, skipping freely.',
  constraint:
    'The quadratic DP is the obvious answer and 49,995,000 comparisons at n = 10,000 is its price. The referees: that DP on 400 arrays with witnesses verified card by card, FULL 2^n enumeration on 50 small arrays, and a duality theorem asserted on every single trial.',

  origins: (
    <p>
      The solitaire is folklore: <em>patience</em>, dealt by bored
      card players for a century: its mathematics is a royal line.
      Ulam posed the random-permutation question in the 1960s;
      Hammersley cracked the scaling; Vershik-Kerov and Logan-Shepp
      pinned the constant 2√n: and Baik, Deift, and Johansson (1999)
      identified the fluctuations as <strong>Tracy-Widom</strong>:
      the same law as random-matrix eigenvalues. Aldous and
      Diaconis&apos;s Bulletin survey tells the whole arc{' '}
      <em>through this very card game</em>: this page measures its
      first chapter and its famous constant.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>one-pass deal with binary search</strong>:
      each value lands on the leftmost pile whose top is ≥ it: found
      by bisect on the pile tops, which stay sorted: or starts a new
      pile on the right. One bisect per card: 73,897 steps at
      n = 10,000 against the DP&apos;s 49,995,000: <strong>677×
      fewer</strong>, measured: with backpointers recorded as cards
      land, so the witness costs nothing extra.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>pile invariant that makes the count the
      answer</strong>: every pile is decreasing top to bottom, so an
      increasing subsequence can take at most one card per pile: LIS
      ≤ piles: while each card&apos;s backpointer to the top of the
      pile on its left splices an increasing sequence with exactly
      one card per pile: piles ≤ LIS. Equality, constructive:
      asserted on all 400 arrays with the reconstructed witness
      checked card by card: and the piles themselves hand over
      Erdős-Szekeres (LIS × LDS ≥ n) as a corollary, asserted every
      trial.
    </p>
  ),

  picture: (
    <p>
      Deal the array into solitaire. Each card goes on the leftmost
      pile whose visible top beats it; a card too big for every top
      starts a new pile on the right. Two facts, both visible on the
      table: each pile only ever <em>decreases</em> (you place onto
      bigger tops), so any climbing subsequence touches each pile at
      most once: and every new pile was forced by a card bigger than
      all the tops: a card that, chased leftward through the tops it
      beat, drags a full climbing chain behind it. The pile count is
      squeezed from both sides: it <em>is</em> the answer, and the
      chase <em>is</em> the witness.
    </p>
  ),

  steps: [
    <>
      <strong>Deal:</strong> bisect the pile tops (they stay sorted);
      the card lands leftmost-fitting or founds a new pile.
    </>,
    <>
      <strong>Backpoint:</strong> each landing card records the top
      of the pile to its left: the future witness thread.
    </>,
    <>
      <strong>Count:</strong> pile count = LIS length: squeezed from
      both sides by the invariant.
    </>,
    <>
      <strong>Reconstruct:</strong> chase backpointers from the last
      pile&apos;s top: one card per pile, strictly climbing:
      verified card by card here.
    </>,
    <>
      <strong>Mind strictness:</strong> ties: bisect_left for
      strict, bisect_right for non-decreasing: the off-by-one that
      flips answers on tied data (heavy-tie arrays tested).
    </>,
  ],

  signals: [
    <>
      <strong>Order fixed, selection free:</strong> versions that
      must move forward, envelopes that must nest, jobs that must
      chain: keep the order, skip the rest.
    </>,
    <>
      <strong>n past a few thousand:</strong> the DP&apos;s n²/2
      dies where n log n strolls: 677× at 10,000, measured.
    </>,
    <>
      <strong>2D dominance in disguise:</strong> sort one axis, LIS
      the other (ties broken descending): the envelope client below,
      and half of interview hard-mode.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>O(n²) DP</strong>: best[i] =
      1 + max over smaller-valued predecessors: transparent,
      witness-friendly, and this page&apos;s referee on all 400
      arrays: at 49,995,000 comparisons for n = 10,000. Below it
      sits <strong>full enumeration</strong>: 2^n subsequences: run
      here as the absolute referee at n ≤ 15, where its honesty is
      affordable.
    </>
  ),

  strength: (
    <>
      <strong>677× measured, witness free, and theorems in the
      machinery.</strong> DP-matched on 400 arrays with every witness
      verified strictly-increasing and index-ordered; the absolute
      2^n referee on 50 arrays; the pile duality (count = LIS) and
      Erdős-Szekeres (LIS × LDS ≥ n) asserted on every trial; and
      Ulam&apos;s constant measured: mean LIS of a random
      2,500-permutation = 93.7 against the 2√n = 100 ceiling: the
      shave is Tracy-Widom-sized, and the piles computed it.
    </>
  ),
  weakness: (
    <>
      <strong>Subsequence only, strictness is a footgun, and the
      piles forget everything else.</strong> Contiguous runs are
      Kadane&apos;s street (a live unit), not this one. The
      bisect_left / bisect_right choice silently flips answers on
      tied data: tested here because it bites in production. And the
      tops array holds only what reconstruction needs: counting{' '}
      <em>all</em> LIS, or weighting elements, sends you back to the
      DP or to Fenwick-indexed variants (a live unit&apos;s
      machinery).
    </>
  ),

  problem: 'Longest increasing subsequence',
  problemSlug: 'longest-increasing-subsequence',
  rivals: [
    {
      name: 'Patience × bisect',
      isThisUnit: true,
      algoName: 'Longest increasing subsequence',
      cost: 'O(n log n)',
      wins: (
        <>
          <strong>73,897 steps vs 49,995,000</strong> (677×), witness
          included, duality theorems riding along: the deal IS the
          proof.
        </>
      ),
      costs: (
        <>
          Length and one witness only: counting all optima or adding
          weights outgrows the piles.
        </>
      ),
      when: 'LIS at any real scale, and every 2D-dominance problem wearing its trench coat.',
    },
    {
      name: 'Quadratic DP',
      algoName: 'Longest increasing subsequence',
      cost: 'O(n²)',
      wins: (
        <>
          The transparent referee: trivially adapted to counting,
          weights, printing all optima: the flexible form this page
          verifies against.
        </>
      ),
      costs: (
        <>
          49,995,000 comparisons at n = 10,000: dead by 10⁵ where
          the piles stroll.
        </>
      ),
      when: 'Small n, or the moment the question mutates past plain length-plus-witness.',
    },
    {
      name: 'Fenwick-indexed LIS',
      algoName: 'Fenwick tree',
      cost: 'O(n log n)',
      wins: (
        <>
          The live unit&apos;s machinery pointed here:
          coordinate-compress values, prefix-max over the tree: same
          bound, and <em>weights and counts</em> come naturally.
        </>
      ),
      costs: (
        <>
          Compression plus tree code where the piles need six lines:
          machinery justified by the richer questions.
        </>
      ),
      when: 'Weighted LIS, number-of-LIS, or LIS under point updates: the piles’ big sibling.',
    },
    {
      name: 'Kadane × running max',
      algoName: "Kadane's algorithm",
      cost: 'O(n)',
      wins: (
        <>
          The live unit for the <em>contiguous</em> cousin: when
          gaps are forbidden, one pass and two variables end the
          conversation.
        </>
      ),
      costs: (
        <>
          Answers a different question: forced contiguity is exactly
          what LIS exists to relax.
        </>
      ),
      when: 'Runs, not chains: read the problem statement twice: this pair is the classic confusion.',
    },
  ],
  neverUse: {
    name: 'The quadratic DP past ten thousand',
    why: (
      <>
        The n² DP is correct, beloved, and the first thing every
        candidate writes: and at n = 10,000 it spent{' '}
        <strong>49,995,000 comparisons</strong> where the piles spent
        73,897. The failure mode is sneakier than slowness: LIS
        hides inside production problems: longest chain of nested
        boxes, longest run of improving builds, schedulable
        upgrades: where n is the row count of a table, not the
        length of an interview array. A correct quadratic quietly
        becomes the pipeline&apos;s dominant cost, and nobody
        suspects the six-line classic. The tell is the shape: order
        fixed, selection free: and the fix is a deal of cards with
        a bisect: same answer, same witness, 677× measured. Keep
        the DP for what it is here: the referee, and the flexible
        form for mutated questions.
      </>
    ),
  },

  contest: {
    instance:
      'LIS of 10,000 values; referee: the O(n²) DP on 400 arrays with witnesses verified card by card, and FULL 2^n enumeration on 50 small arrays',
    columns: ['ops', 'note'],
    rows: [
      {
        method: 'Full enumeration',
        values: ['2^n', 'absolute'],
        verdict: 'the definition: run as referee where n ≤ 15 makes it affordable',
      },
      {
        method: 'Quadratic DP',
        values: ['49,995,000', 'n(n−1)/2'],
        verdict: 'transparent and flexible: the referee at scale',
      },
      {
        method: 'Patience + bisect',
        isThisUnit: true,
        values: ['73,897', '677× fewer'],
        best: 0,
        verdict: 'one bisect per card: the deal is the proof, the chase is the witness',
      },
    ],
    source:
      "python solutions/lis_patience_piles.py prints this table and asserts: DP equality on 400 arrays (heavy-tie cases included) with every witness verified strictly increasing and index-ordered; full-enumeration equality on 50 arrays (n ≤ 15); the pile duality (count = LIS, piles decreasing) and Erdős-Szekeres (LIS × LDS ≥ n) on every trial; the op meter (73,897 vs 49,995,000); Ulam's constant (mean LIS of random 2,500-permutations = 93.7 vs 2√n = 100); and the 200-envelope nesting client, chain 23, verified pair by pair and DP-matched.",
  },

  figure: (
    <Figure
      id="fig-patience-piles"
      aspect="16 / 7"
      caption="The deal is the proof. Each card lands on the leftmost pile whose top beats it, so piles only decrease: an increasing subsequence takes at most one card per pile. Each new pile was forced by a card bigger than every top: chase its backpointers leftward and a full climbing chain emerges, one card per pile. The count is squeezed to equality from both sides: and the same piles hand over Erdős-Szekeres (LIS × LDS ≥ n) and, dealt a random permutation, Ulam's 2√n: measured here at 93.7 against the ceiling of 100."
      cite={{
        text: 'Aldous & Diaconis, "Longest increasing subsequences: from patience sorting to the Baik-Deift-Johansson theorem", Bulletin of the AMS 36(4), 1999: the survey that walks from this card game to Tracy-Widom fluctuations.',
        href: 'https://doi.org/10.1090/S0273-0979-99-00796-X',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Patience piles with decreasing cards and the witness chain threading one card per pile">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">deal 3 1 5 2 8 6 9 → four piles · pile count = LIS = 4</text>
        {[['3', '1'], ['5', '2'], ['8', '6'], ['9']].map((pile, k) =>
          pile.map((v, d) => {
            const onChain = ['1', '2', '6', '9'].includes(v);
            return (
              <g key={`${k}-${d}`}>
                <rect
                  x={100 + k * 120}
                  y={54 + d * 46}
                  width={54}
                  height={38}
                  rx={5}
                  fill="#1d2740"
                  stroke={onChain ? '#62d98a' : '#40507a'}
                  strokeWidth={onChain ? 2.2 : 1.4}
                />
                <text
                  x={120 + k * 120}
                  y={79 + d * 46}
                  fill={onChain ? '#62d98a' : '#9aa5bd'}
                  fontFamily="ui-monospace, monospace"
                  fontSize="15"
                >
                  {v}
                </text>
              </g>
            );
          }),
        )}
        <path d="M 458 72 C 420 110, 400 118, 342 118" stroke="#f0b94b" strokeWidth="1.6" fill="none" strokeDasharray="5 4" />
        <path d="M 338 128 C 300 140, 280 142, 226 142" stroke="#f0b94b" strokeWidth="1.6" fill="none" strokeDasharray="5 4" />
        <path d="M 222 152 C 190 158, 170 152, 156 132" stroke="#f0b94b" strokeWidth="1.6" fill="none" strokeDasharray="5 4" />
        <text x="180" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the chase: 9 → 6 → 2 → 1: each backpointer recorded at deal time</text>
        <text x="40" y="226" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">witness read forward: 1 2 6 9: strictly climbing, one card per pile: piles ≤ LIS ≤ piles</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 73,897 steps vs the DP’s 49,995,000 (677×) · LIS × LDS ≥ n on every trial · Ulam’s mean 93.7 vs 2√n = 100</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lis_patience_piles.py',
  Viz: LisViz,
  narration,
};
