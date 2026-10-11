import CarryLookaheadViz from '../viz/CarryLookaheadViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/carry_lookahead_adder_generate_propagate_logic.py?raw';
import { narration } from './carry-lookahead-adder-generate-propagate-logic.narration.js';

export const content = {
  given:
    'Two 64-bit numbers arrive at an adder and the clock gives the circuit a fixed number of gate delays to produce their sum. The schoolbook circuit, a chain of full adders, waits for each carry to ripple into the next column: two gate delays per bit, 129 delays for 64 bits, six clock cycles of a budget that allows one.',
  task: 'Carry-lookahead addition. The algorithm computes every carry directly from the inputs instead of waiting for the column below. The heuristic is the pair of signals that makes that possible: each column generates a carry (g = a AND b) or propagates one it receives (p = a XOR b), so the carry into column i + 1 is g_i OR p_i g_{i−1} OR p_i p_{i−1} g_{i−2} ... OR p_i ... p_0 c_in, a sum of products written in advance. A group of columns has the same two summary bits, so groups combine like columns and the depth grows with the logarithm of the width.',
  constraint:
    'Measured on gate-level netlists of two-input gates (one unit of delay each), checked bit for bit against Python integer addition: six adders agree on all 512 four-bit and 131,072 eight-bit cases with both carry-ins and on 6,009 random and crafted cases at each of 16, 32, and 64 bits. At 64 bits the ripple carry needs 129 delays and 320 gates; the four-level block lookahead 21 delays and 782 gates; Kogge-Stone 15 and 1,157; Brent-Kung 24 and 554; carry-select 38 with 8-bit blocks (54 with 4-bit). The flat single-level lookahead at 64 bits needs a fan-in of 65 and 47,904 literals across its carries, 2,080 of them in the last carry alone. 8.1 s.',

  origins: (
    <p>
      Arnold Weinberger and J. L. Smith set down the lookahead equations in
      <strong> A Logic for High-Speed Addition</strong> (National Bureau of
      Standards Circular 591, 1958), for the vacuum-tube and early transistor
      machines of that decade. Jack Sklansky&apos;s conditional-sum adder
      (1960) is the ancestor of carry-select. The prefix view arrived with
      Peter Kogge and Harold Stone (1973), who showed that any recurrence over
      an associative operator admits a logarithmic-depth parallel evaluation,
      and Richard Brent and H. T. Kung (1982) gave the regular layout that
      halves the wiring for twice the depth. Every modern datapath adder is a
      member of this family: generate and propagate signals combined by a
      prefix tree chosen for the depth, area, and wiring budget at hand.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>carries</strong>. The ripple adder&apos;s carry into
      column i is the carry out of column i − 1, so the chain is as long as
      the word: measured <strong>2n + 1</strong> delays at every width, 129 at
      64 bits. The lookahead adder writes each carry as an explicit sum of
      products of the inputs; the hierarchical form computes them four columns
      at a time, four levels deep for 64 bits, in <strong>21</strong> delays.
      Every output bit of every adder on this page equals the integer sum on
      every case tried.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>structure</strong>. Generate and propagate compress a
      column to two bits, and the same two bits summarize a block: a block
      generates if its top column generates or propagates into a generating
      column below, and propagates only if every column does. The combining
      operator (G, P) ∘ (G′, P′) = (G ∨ P G′, P P′) is associative, checked on
      all 64 triples of states, which is why Kogge-Stone and Brent-Kung can
      rearrange it into prefix trees and get the same carries: 15 and 24
      delays at 64 bits for 1,157 and 554 gates.
    </p>
  ),

  picture: (
    <p>
      Picture sixty-four tellers along a counter, each waiting to hear whether
      the neighbour on the right is handing over a coin before deciding what to
      pass on. That is the ripple. Now give every teller two flags before the
      message starts: red if they will hand over a coin no matter what, yellow
      if only when they receive one. A supervisor who sees all the flags knows
      every handover at once: a coin reaches teller twenty if some teller below
      is red and every teller in between is yellow. Groups of four raise one
      flag for the group, and groups of groups do the same, so the supervisor
      reads four levels of flags instead of sixty-four tellers in a row.
    </p>
  ),

  steps: [
    <>
      <strong>Generate and propagate:</strong> for every column, g = a AND b
      and p = a XOR b. One gate delay.
    </>,
    <>
      <strong>Block terms:</strong> for each group of four columns, G = g₃ ∨
      p₃g₂ ∨ p₃p₂g₁ ∨ p₃p₂p₁g₀ and P = p₃p₂p₁p₀; repeat for groups of groups
      until one block covers the word.
    </>,
    <>
      <strong>Carries downward:</strong> each block&apos;s carry-in comes from
      the block terms below it and the word carry-in by the same sums of
      products; each block then computes its inner carries from its own g, p,
      and carry-in.
    </>,
    <>
      <strong>Sums:</strong> s_i = p_i XOR c_i. Count the depth: 1 + 4 per
      level up + 4 per level down + 1, which is 21 at 64 bits.
    </>,
    <>
      <strong>Pick the tree for the budget:</strong> Kogge-Stone for depth
      (15), Brent-Kung for wiring (24, half the gates), blocks of four in
      between (21).
    </>,
  ],

  signals: [
    <>
      <strong>A chain of dependent steps over a small associative operator:</strong>{' '}
      addition, counting, comparison, prefix sums.
    </>,
    <>
      <strong>Latency per operation is the budget:</strong> trading gates for
      depth is the right trade when the clock period is what sells.
    </>,
    <>
      <strong>A group summarizes as compactly as an element:</strong> two bits
      per column, two per block, so the tree never widens.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>ripple-carry adder</strong>: 5n gates,
      2n + 1 delays, 129 at 64 bits against the block lookahead&apos;s 21 and
      Kogge-Stone&apos;s 15.
    </>
  ),

  strength: (
    <>
      <strong>Logarithmic depth from two bits per column.</strong> 21 delays at
      64 bits for the block design, 15 for Kogge-Stone, against 129 for the
      ripple; the same carries, bit for bit, on every case.
    </>
  ),
  weakness: (
    <>
      <strong>Depth is bought with gates and wires.</strong> 2.44× the ripple
      adder&apos;s gates for the block design and 3.62× for Kogge-Stone at 64
      bits; the flat single-level form needs a fan-in of 65 and never scales.
    </>
  ),

  problem: 'Hardware arithmetic',
  problemSlug: 'hardware-arithmetic',
  rivals: [
    {
      name: 'Carry-lookahead adder × Generate-propagate logic',
      isThisUnit: true,
      algoName: 'Carry-lookahead adder',
      cost: 'O(log n) delays, O(n) gates with four-column blocks',
      wins: (
        <>
          <strong>21 delays at 64 bits</strong> against the ripple&apos;s 129,
          with 782 gates (2.44×); every carry known before it is needed.
        </>
      ),
      costs: (
        <>
          Two and a half times the gates; the flat single-level form needs a
          fan-in of 65 and 47,904 literals, so the hierarchy is mandatory.
        </>
      ),
      when: 'The default fast adder when area is moderate and the clock period is the budget.',
    },
    {
      name: 'Kogge-Stone adder × Parallel prefix carry',
      algoName: 'Kogge-Stone adder',
      cost: 'log₂ n prefix levels, about n log n gates',
      wins: (
        <>
          <strong>15 delays at 64 bits</strong>, the shallowest tree measured
          (13 without a carry-in); the same carries as the lookahead.
        </>
      ),
      costs: (
        <>
          1,157 gates, 3.62× the ripple, and a wiring fan that spans the word at
          every level.
        </>
      ),
      when: 'The fastest datapath where area and power are cheap and the last few delays decide the clock.',
    },
    {
      name: 'Parallel prefix sum × Blelloch scan',
      algoName: 'Parallel prefix sum',
      cost: 'O(n) work, O(log n) depth, in software',
      wins: (
        <>
          The same recurrence over any associative operator, an up-sweep and a
          down-sweep; Brent-Kung is this scan in silicon: <strong>24 delays,
          554 gates</strong>, half of Kogge-Stone&apos;s.
        </>
      ),
      costs: (
        <>
          Nine more delays than Kogge-Stone at 64 bits; the software version
          pays memory traffic, not gates.
        </>
      ),
      when: 'Wiring and power matter more than the last delays, or the data lives in an array rather than a wire.',
    },
    {
      name: 'Wallace tree multiplier × Carry-save reduction',
      algoName: 'Wallace tree multiplier',
      cost: 'O(log n) levels of carry-save adders, one real adder at the end',
      wins: (
        <>
          Never resolves a carry while summing dozens of partial products; keeps
          sum and carry bits apart and spends one lookahead adder at the end.
        </>
      ),
      costs: (
        <>
          Only pays off when many numbers are summed at once; a single addition
          still needs the final carry-resolving adder.
        </>
      ),
      when: 'Multipliers and multi-operand accumulators, where resolving carries early would waste most of the work.',
    },
  ],
  neverUse: {
    name: 'A ripple chain or a flat single-level lookahead at 64 bits',
    why: (
      <>
        The ripple adder needs <strong>129 gate delays</strong> at 64 bits,
        measured, because every column waits for the one below; at a clock
        with twenty delays per cycle that is six cycles for one addition. The
        flat lookahead removes the wait but its last carry is a sum of 65
        products holding <strong>2,080 literals</strong>, a 65-input gate no
        process offers; all 64 carries without sharing take 47,904 literals
        and 48,032 two-input gates, 150× the ripple adder. Between those two
        failures sits the hierarchy: 21 delays and 782 gates. Carry-select,
        the other textbook middle, measured 38 delays with 8-bit blocks and 54
        with 4-bit, never close to the tree.
      </>
    ),
  },

  contest: {
    instance:
      'Gate-level netlists of two-input gates, one unit of delay per gate, with a real carry-in; six adders at 4 to 64 bits, each checked bit for bit against integer addition on all 512 four-bit and 131,072 eight-bit cases and 6,009 random and crafted cases per wider width; critical path and gate count read from the netlist',
    columns: ['delays at 16 bits', 'delays at 64 bits', 'gates at 64 bits', 'gates vs ripple'],
    rows: [
      {
        method: 'ripple carry',
        values: ['33', '129', '320', '1.00×'],
        verdict: 'the baseline: 2n + 1 delays',
      },
      {
        method: 'block lookahead (groups of 4)',
        isThisUnit: true,
        values: ['13', '21', '782', '2.44×'],
        best: 3,
        verdict: 'logarithmic depth, moderate area',
      },
      {
        method: 'Kogge-Stone prefix',
        values: ['11', '15', '1,157', '3.62×'],
        best: 1,
        verdict: 'shallowest, most wire',
      },
      {
        method: 'Brent-Kung prefix',
        values: ['16', '24', '554', '1.73×'],
        verdict: 'the Blelloch scan in silicon',
      },
      {
        method: 'carry-select (8-bit blocks at 64)',
        values: ['18', '38', '932', '2.91×'],
        verdict: 'a middle that never reaches the tree',
      },
    ],
    source:
      'python solutions/carry_lookahead_adder_generate_propagate_logic.py prints these tables and asserts: the (G, P) operator is associative on all 64 triples; every adder equals integer addition on every exhaustive 4- and 8-bit case and on 6,009 random and crafted cases at 16, 32, and 64 bits; the ripple depth is 2n + 1 at every width; the 64-bit depths are 129, 21, 15, and 24; the flat form needs a fan-in of 65; Kogge-Stone without a carry-in measures 13.',
  },

  figure: (
    <Figure
      id="fig-adder-depth"
      aspect="16 / 7"
      caption="Left: critical path in gate delays against word width (log scale) for five adders, read from the netlists. The ripple chain climbs as 2n + 1 while the block lookahead, Kogge-Stone, and Brent-Kung rise by a few delays per doubling. Right: gates at 64 bits. Depth is bought with gates: the shallowest tree costs the most, Brent-Kung halves the wiring for nine more delays, and the ripple is cheapest and slowest."
      cite={{
        text: 'A. Weinberger and J. L. Smith, "A logic for high-speed addition," NBS Circular 591, 1958. P. M. Kogge and H. S. Stone, "A parallel algorithm for the efficient solution of a general class of recurrence equations," IEEE Trans. Computers C-22(8), 1973. R. P. Brent and H. T. Kung, "A regular layout for parallel adders," IEEE Trans. Computers C-31(3), 1982. J. Sklansky, "Conditional-sum addition logic," 1960.',
        href: 'https://doi.org/10.1109/TC.1973.5009159',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Line chart of critical path in gate delays against width for ripple, block lookahead, Kogge-Stone, Brent-Kung, and carry-select adders, beside a bar chart of gate counts at 64 bits">
        {(() => {
          const widths = [4, 8, 16, 32, 64];
          const series = [
            ['ripple', [9, 17, 33, 65, 129], '#e2606c'],
            ['carry-select', [9, 12, 18, 26, 38], '#9aa5bd'],
            ['Brent-Kung', [8, 12, 16, 20, 24], '#f0b94b'],
            ['block lookahead', [6, 11, 13, 19, 21], '#5da2ff'],
            ['Kogge-Stone', [7, 9, 11, 13, 15], '#62d98a'],
          ];
          const px = (i) => 50 + i * 60;
          const py = (d) => 236 - (d / 130) * 200;
          const bars = [['ripple', 320, '#e2606c'], ['Brent-Kung', 554, '#f0b94b'], ['lookahead', 782, '#5da2ff'], ['select', 932, '#9aa5bd'], ['Kogge-Stone', 1157, '#62d98a']];
          const by = (g) => 236 - (g / 1200) * 190;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">gate delays on the critical path, by width</text>
              {series.map(([name, ds, c]) => (
                <g key={name}>
                  <polyline points={ds.map((d, i) => `${px(i)},${py(d)}`).join(' ')} fill="none" stroke={c} strokeWidth="2" />
                  {ds.map((d, i) => <circle key={i} cx={px(i)} cy={py(d)} r="3" fill={c} />)}
                  <text x={px(4) + 8} y={py(ds[4]) + 4} fill={c} fontSize="9">{name} {ds[4]}</text>
                </g>
              ))}
              {widths.map((w, i) => <text key={w} x={px(i) - 8} y="254" fill="#9aa5bd" fontSize="9">{w}</text>)}
              <text x="20" y="270" fill="#9aa5bd" fontSize="9">bits (log scale); the ripple is 2n + 1, the trees add a few delays per doubling</text>
              <text x="400" y="22" fill="#9aa5bd" fontSize="10">gates at 64 bits</text>
              {bars.map(([name, g, c], i) => (
                <g key={name}>
                  <rect x={400 + i * 46} y={by(g)} width="34" height={236 - by(g)} fill={c} fillOpacity="0.85" />
                  <text x={400 + i * 46} y={by(g) - 5} fill={c} fontSize="9">{g.toLocaleString()}</text>
                  <text x={398 + i * 46} y="254" fill="#9aa5bd" fontSize="8">{name}</text>
                </g>
              ))}
              <text x="400" y="270" fill="#9aa5bd" fontSize="9">depth is bought with gates: 1.0x, 1.7x, 2.4x, 2.9x, 3.6x the ripple</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'carry_lookahead_adder_generate_propagate_logic.py',
  Viz: CarryLookaheadViz,
  narration,
};
