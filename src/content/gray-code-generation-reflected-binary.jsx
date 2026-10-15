import GrayCodeViz from '../viz/GrayCodeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gray_code_generation_reflected_binary.py?raw';
import { narration } from './gray-code-generation-reflected-binary.narration.js';

export const content = {
  given:
    'Every subset of n items, or every n-bit string, listed so that consecutive entries differ in exactly one element, in constant work per step: a path that visits every corner of the n-dimensional cube once, along the edges.',
  task: 'Gray code generation. The algorithm is the ordering itself: 2ⁿ binary strings in which each neighbor pair differs in one bit, a Hamiltonian cycle of the n-cube, so whatever a subset means (a sum, a configuration, a sensor pattern) changes by one thing per step. The heuristic is the reflected construction (Frank Gray, Bell Labs, patent filed 1947): the n-bit list is the (n − 1)-bit list with a leading 0, followed by the same list reversed with a leading 1. The reflection makes the seam a single flip, and the recursion collapses to a closed form, g(i) = i XOR (i >> 1), with the bit that flips at step i being the number of trailing zeros of i: the ruler sequence.',
  constraint:
    'Measured: the reflected list equals the closed form on all 131,070 codes for n = 1 to 16, every neighbor pair differs in exactly one bit, the cycle closes, every code is distinct, the inverse recovers every index, and the flipped bit at step i is the trailing-zero count of i, checked at every step. An 8-bit absolute encoder read mid-transition with misaligned sensors: in natural binary the rollover 127 to 128 can read as any of 256 values and the worst misread is 127 positions (mean of the per-transition worst errors 3.50); in Gray every reading is one of the two positions the shaft is between. All 1,048,576 subset sums of 20 numbers by one add or subtract each (1,048,575 operations, 0.17 s) against 2,097,130 for binary counting with incremental updates (1.99998 bit flips per step) and 20,971,520 for recomputing each sum (0.77 s), every incremental sum equal to the direct one. Binary counting flips 1.733, 1.969, 1.997, 1.99976 bits per step at n = 4, 8, 12, 16 (worst n); a subset listing by size changes 2.66 elements per step (worst 12); Steinhaus-Johnson-Trotter walks all 720 permutations of six items by adjacent swaps.',

  origins: (
    <p>
      Frank Gray at Bell Labs filed the reflected binary code in{' '}
      <strong>1947</strong> (US Patent 2,632,058, granted 1953) for pulse
      code modulation, so that a vacuum-tube converter sampling a changing
      voltage could not produce a wildly wrong digit mid-transition; the
      same idea had appeared in Baudot&apos;s telegraph code (1878) and in
      Louis Gros&apos;s 1872 solution of the Chinese rings puzzle, whose
      moves are exactly a Gray code. Gilbert (1958) studied the codes&apos;
      structure, Knuth gives the full account in The Art of Computer
      Programming 4A, section 7.2.1.1, and Savage&apos;s 1997 survey covers
      the combinatorial Gray codes that followed: listings of permutations,
      combinations, trees, and partitions in which each step is one small
      change. Gray codes sit in rotary and linear encoders, in Karnaugh maps
      (adjacent cells differ in one variable), in genetic algorithms&apos;
      bit encodings, in error-correction and quantization, and in every
      enumeration that keeps a running total instead of recomputing it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>ordering</strong>: a sequence of all 2ⁿ codes in
      which each step is one bit, closing back on itself. The referee is
      the closed form and the cube: for every n from 1 to 16 the reflected
      list equals g(i) = i XOR (i >> 1) on all <strong>131,070 codes</strong>,
      every neighbor pair has Hamming distance exactly 1, the last code
      returns to the first in one flip, all codes are distinct, and the
      prefix-XOR inverse recovers every index. With that order a subset
      sum, a sensor pattern, or a configuration changes by one element per
      step: 1,048,575 operations for all 1,048,576 subset sums of 20
      numbers, each equal to the direct sum.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>construction</strong>: prefix 0 to the shorter list,
      prefix 1 to its mirror image, and the seam between the halves is one
      flip because the two middle entries are the same shorter code. The
      recursion is what makes the closed form work and what puts the
      flipped bit at step i at position trailing-zeros(i), the ruler
      sequence, checked at every one of 131,070 steps. The payoff is
      measured on the encoder: natural binary misreads by up to{' '}
      <strong>127 positions</strong> (the rollover 127 to 128 can read as
      anything) while every Gray reading is one of the two positions the
      shaft is between; and on enumeration, 1 operation per step against
      1.99998 for binary counting and 20 for recomputation.
    </p>
  ),

  picture: (
    <p>
      A combination lock whose wheels you want to try in every setting,
      turning only one wheel by one notch at a time. Count in ordinary
      binary and the step from 0111 to 1000 asks you to turn four wheels at
      once; look at the lock halfway through that step and it says
      something that was never a setting. The reflected order walks the
      settings so that each step turns exactly one wheel, and it does so
      by listing the settings of the smaller lock, then the same list
      backward with one more wheel turned: the two lists meet in the
      middle at the same setting, so the seam costs one turn.
    </p>
  ),

  steps: [
    <>
      <strong>Reflect:</strong> L(0) = [&quot;&quot;]; L(n) = 0 · L(n − 1)
      followed by 1 · reverse(L(n − 1)); the seam flips the new bit only.
    </>,
    <>
      <strong>Closed form:</strong> the i-th code is g(i) = i XOR (i >> 1);
      no list needed, random access to any code.
    </>,
    <>
      <strong>Inverse:</strong> i = g XOR (g >> 1) XOR (g >> 2) XOR ...:
      each bit of i is the parity of the bits of g above it.
    </>,
    <>
      <strong>Step i flips bit trailing-zeros(i):</strong> the ruler
      sequence 0, 1, 0, 2, 0, 1, 0, 3, ...; the item to add or remove is
      known without inspecting the code.
    </>,
    <>
      <strong>Walk:</strong> keep a running total; at step i add or remove
      element trailing-zeros(i) according to its new bit; after 2ⁿ − 1
      steps every subset has been seen once and one more flip returns to
      the start.
    </>,
  ],

  signals: [
    <>
      <strong>A running quantity over all subsets:</strong> sums, products,
      counts, satisfied clauses; one update per step instead of n.
    </>,
    <>
      <strong>A reading taken during a change:</strong> encoders, converters,
      asynchronous counters, where a mixed old-and-new reading must still be
      near the truth.
    </>,
    <>
      <strong>Adjacency should mean small difference:</strong> Karnaugh
      maps, genetic encodings, test-pattern ordering, cube walks.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>binary counting</strong> over the
      power set: increment, read the bits. Every subset once, in order of
      value, but 1.99998 bits flipped per step on average and n at the
      rollover, which is 2× the updates and the encoder&apos;s 127-position
      misread.
    </>
  ),

  strength: (
    <>
      <strong>One change per step, with a closed form.</strong> 131,070 codes
      checked against g(i) = i XOR (i >> 1) with a one-bit step and a closed
      cycle at every n; 1 operation per subset against 1.99998 and 20; an
      encoder that never reads a position it is not between; the ruler
      sequence tells you which element moves without looking.
    </>
  ),
  weakness: (
    <>
      <strong>Not sorted, not balanced, not for sizes.</strong> The order is
      not numeric, so a binary search over codes needs the inverse; the
      reflected code flips bit 0 half the time and bit n − 1 once
      (a balanced Gray code spreads the wear); and it enumerates all
      subsets, not subsets of one size, which is Chase&apos;s sequence or the
      revolving-door order instead.
    </>
  ),

  problem: 'Subset and combination enumeration',
  problemSlug: 'subset-enumeration',
  rivals: [
    {
      name: 'Gray code generation × Reflected binary',
      isThisUnit: true,
      algoName: 'Gray code generation',
      cost: 'O(1) per step; a closed form',
      wins: (
        <>
          <strong>One bit per step</strong> on all 131,070 codes to n = 16;
          1 operation per subset sum; the encoder never misreads.
        </>
      ),
      costs: (
        <>
          Unsorted order; unbalanced bit wear; all sizes at once.
        </>
      ),
      when: 'A running total over all subsets, or a code read during transitions: the default.',
    },
    {
      name: 'Powerset enumeration',
      algoName: 'Powerset enumeration',
      cost: 'O(1) amortized per step',
      wins: (
        <>
          Binary counting: numeric order, the simplest loop, random access by
          index.
        </>
      ),
      costs: (
        <>
          1.99998 bit flips per step and n at the rollover; 2,097,130
          operations against 1,048,575; a 127-position misread.
        </>
      ),
      when: 'Subsets are needed in value order, or the step cost does not matter.',
    },
    {
      name: 'Combinatorial Gray flip',
      algoName: 'Combinatorial Gray flip',
      cost: 'loopless: O(1) worst case per step',
      wins: (
        <>
          The same one-change promise for other objects (combinations,
          trees, partitions) with a bounded, not amortized, step.
        </>
      ),
      costs: (
        <>
          Per-object constructions; focus pointers or auxiliary arrays.
        </>
      ),
      when: 'Enumerating structured objects where every step must be O(1), not just on average.',
    },
    {
      name: 'Steinhaus-Johnson-Trotter',
      algoName: 'Steinhaus-Johnson-Trotter',
      cost: 'one adjacent swap per permutation',
      wins: (
        <>
          The Gray code of permutations: all 720 permutations of six items
          by adjacent transpositions; lexicographic order changes 2.62
          positions per step.
        </>
      ),
      costs: (
        <>
          Direction bookkeeping per element; permutations, not subsets.
        </>
      ),
      when: 'Permutations with a running quantity (a tour length, a schedule cost) updated per swap.',
    },
  ],
  neverUse: {
    name: 'A natural binary absolute encoder',
    why: (
      <>
        Eight tracks, 256 positions, sensors that cannot all switch at the
        same instant. Between positions 127 (01111111) and 128 (10000000)
        every bit changes, so a reading taken during the transition can be
        any of the <strong>256 values</strong>, and the worst reading is{' '}
        <strong>127 positions</strong> from where the shaft actually is,
        half the dial. Over all 256 transitions the mean of the worst
        misreads is 3.50 positions. Encode the same dial in Gray and
        exactly one track changes at every transition, so a mid-transition
        reading is one of the two positions the shaft is between, measured
        on every transition: worst error 0. This is the problem Gray filed
        the patent to solve, and natural binary on a moving shaft is still
        the textbook way to build a device that occasionally reports the
        far side of the circle.
      </>
    ),
  },

  contest: {
    instance:
      'all 2ⁿ subsets of n items changing one element at a time, and an 8-bit absolute encoder read during transitions; referees: the closed form g(i) = i XOR (i >> 1) with its inverse on all 131,070 codes for n = 1 to 16, the one-bit and cycle properties, the ruler sequence, and every incremental subset sum of 20 numbers against the direct sum',
    columns: ['changes per step', 'ops for 2²⁰ subset sums', 'seconds', 'encoder worst misread (8-bit)'],
    rows: [
      {
        method: 'Gray order (reflected binary)',
        isThisUnit: true,
        values: ['exactly 1', '1,048,575', '0.17', '0 (always one of the two positions)'],
        best: 1,
        verdict: 'one change, one operation, no misread',
      },
      {
        method: 'binary counting, incremental',
        values: ['1.99998 (worst 20)', '2,097,130', '0.18', '127 (the rollover reads as anything)'],
        verdict: 'the baseline: twice the updates',
      },
      {
        method: 'recompute each subset sum',
        values: ['n = 20', '20,971,520', '0.77', '·'],
        verdict: 'the cost of not keeping a total',
      },
      {
        method: 'listing by size, lexicographic (n = 12)',
        values: ['2.66 (worst 12)', '·', '·', '·'],
        verdict: 'tidy to read, costly to walk',
      },
    ],
    source:
      'python solutions/gray_code_generation_reflected_binary.py prints this table and asserts: the reflected list equal to g(i) = i XOR (i >> 1) and the inverse recovering i on all 131,070 codes for n = 1 to 16; Hamming distance exactly 1 between neighbors and across the closing pair; all codes distinct; the flipped bit at step i equal to the trailing-zero count of i; the encoder worst error 127 in binary with the rollover readable as all 256 values, and 0 in Gray; every Gray-order incremental subset sum equal to the direct sum, with 2²⁰ − 1 operations against the exact (2ⁿ⁺¹ − n − 2) / (2ⁿ − 1) bit flips per step of binary counting and 20 per subset for recomputation; the lexicographic-by-size listing changing more than 2 elements per step; and Steinhaus-Johnson-Trotter producing all 720 permutations of six items by adjacent swaps.',
  },

  figure: (
    <Figure
      id="fig-gray-reflection"
      aspect="16 / 7"
      caption="Left: the reflected construction from one bit to four. Each list is the previous list with a leading 0 (blue) followed by the same list upside down with a leading 1 (amber); the mirror makes the two middle codes identical except for the new bit, so the seam is one flip, and so is every other step. Right: the eight-bit encoder's worst mid-transition misread at each of the 256 transitions, natural binary (red) against Gray (green, zero everywhere): the binary spikes are the carries, 127 positions at the half-way rollover."
      cite={{
        text: 'F. Gray, "Pulse code communication," US Patent 2,632,058, filed 1947, granted 1953. E. N. Gilbert, "Gray codes and paths on the n-cube," Bell System Technical Journal 37(3), 1958, DOI 10.1002/j.1538-7305.1958.tb03887.x. D. E. Knuth, The Art of Computer Programming, vol. 4A, section 7.2.1.1.',
        href: 'https://doi.org/10.1002/j.1538-7305.1958.tb03887.x',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Four columns of reflected Gray codes for one to four bits with the mirrored halves colored, beside a bar chart of the worst mid-transition misread for every transition of an eight-bit binary encoder, which Gray keeps at zero">
        {(() => {
          const gray = (i) => i ^ (i >> 1);
          const cols = [1, 2, 3, 4].map((n) => Array.from({ length: 1 << n }, (_, i) => gray(i).toString(2).padStart(n, '0')));
          const x0 = 20;
          const bars = [];
          for (let i = 0; i < 256; i += 1) {
            const a = i;
            const b = (i + 1) % 256;
            const diff = a ^ b;
            // worst distance of any mixed reading from the pair {a, b}: the
            // mixed readings span all combinations of the changed bits
            let worst = 0;
            const bits = [];
            for (let k = 0; k < 8; k += 1) if (diff >> k & 1) bits.push(k);
            for (let m = 0; m < (1 << bits.length); m += 1) {
              let v = a;
              bits.forEach((k, j) => { if (m >> j & 1) v ^= 1 << k; });
              worst = Math.max(worst, Math.min(Math.abs(v - a), Math.abs(v - b)));
            }
            bars.push(worst);
          }
          const bx = 330;
          const by = 236;
          const bw = 290;
          return (
            <g>
              <text x={x0} y="20" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">prefix 0; reverse and prefix 1</text>
              {cols.map((list, c) => (
                <g key={c}>
                  <text x={x0 + c * 72} y="40" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{c + 1} bit{c ? 's' : ''}</text>
                  {list.map((code, i) => (
                    <text key={code} x={x0 + c * 72} y={56 + i * 12.5} fill={i < list.length / 2 ? '#5da2ff' : '#f0b94b'} fontFamily="ui-monospace, monospace" fontSize="10">{code}</text>
                  ))}
                </g>
              ))}
              <text x={x0} y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the seam: 01 and 11, 010 and 110, 0100 and 1100</text>
              <text x={bx} y="20" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">8-bit encoder, worst misread by transition</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              {bars.map((w, i) => (
                w > 0 ? <rect key={i} x={bx + (i / 256) * bw} y={by - (w / 127) * 180} width={Math.max(1, bw / 256)} height={(w / 127) * 180} fill="#e2606c" fillOpacity="0.85" /> : null
              ))}
              <line x1={bx} y1={by - 2} x2={bx + bw} y2={by - 2} stroke="#62d98a" strokeWidth="2" />
              <text x={bx + bw / 2 - 60} y={by - 185} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">127 at the rollover 127 to 128</text>
              <text x={bx} y={by + 14} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">Gray: 0 at every transition (green line)</text>
              <text x={bx} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">binary: mean of worst misreads 3.50 positions</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'gray_code_generation_reflected_binary.py',
  Viz: GrayCodeViz,
  narration,
};
