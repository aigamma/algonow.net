import ScanViz from '../viz/ScanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/parallel_prefix_sum_blelloch_scan.py?raw';
import { narration } from './parallel-prefix-sum-blelloch-scan.narration.js';

export const content = {
  given:
    'A sequence of n values and an associative operation. Produce every running total, all n of them, on a machine with as many processors as elements. Sequentially it is one pass of n operations, but the pass is a chain: total i waits for total i − 1, so n processors would sit idle behind one.',
  task: 'Blelloch’s two-sweep scan. Up-sweep: combine adjacent pairs into their right element, then pairs of pairs, building a balanced tree of partial totals in log₂ n levels. Clear the root. Down-sweep: walk the tree back down, each node handing its left child the running total from the left and keeping the combined total for its right child. Every element ends up holding the total of everything before it, for 2(n − 1) operations at 2 log₂ n depth.',
  constraint:
    'On a simulated parallel machine that records every level, the Blelloch scan matches the sequential scan on 256 integers under addition and maximum and on 256 two-by-two matrices under multiplication, which is associative but not commutative, so a scan that swapped operands would fail, and one that does is shown to. Counted at n = 256, 1,024, 4,096, 16,384: work 510, 2,046, 8,190, 32,766, exactly 2(n − 1), at depth 16, 20, 24, 28, exactly 2 log₂ n; Hillis-Steele 1,793 to 212,993 (n log₂ n − n + 1) at depth 8 to 14; sequential n − 1 at depth n − 1; the naive independent prefixes 523,776 at n = 1,024. Stream compaction and a ten-pass radix sort built from the scan match filter and sort.',

  origins: (
    <p>
      The prefix problem is older than parallel computers: Ofman (1962)
      used it for fast binary addition, and Kogge and Stone (1973)
      and Brent and Kung (1982) built the carry-lookahead adders that
      still sit in every processor, log-depth circuits that are prefix
      sums in disguise. Ladner and Fischer (1980) proved the general
      parallel prefix construction; Hillis and Steele (1986, CACM)
      gave the n log n scan for the Connection Machine; and Guy
      Blelloch (<strong>1989</strong>, IEEE Transactions on Computers,
      and the 1990 report &quot;Prefix sums and their applications&quot;)
      gave the work-efficient two-sweep version and argued that scan
      should be a primitive of the machine, as basic as addition. It
      became one: Harris, Sengupta, and Owens (GPU Gems 3, 2007) put
      Blelloch&apos;s scan on the GPU, Merrill and Garland (2016) made
      it single-pass, and every CUDA radix sort, sparse matrix product,
      and stream compaction runs on it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>problem and its lower bound</strong>: n running
      totals of an associative operation, which any sequential method
      does in n − 1 operations and n − 1 dependent steps, and which
      any parallel method must do in at least n − 1 operations. The
      referee is the sequential scan, and the operation is allowed to
      be anything associative: on this page, integer addition,
      maximum, and 2 × 2 matrix multiplication, which does not
      commute. The scans agree on all three, and a scan that swaps its
      operands, which addition would forgive, gives a different answer
      on the matrices: <strong>the order is checked, not assumed</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>tree</strong>: up-sweep, clear the root,
      down-sweep. Counted on the simulated machine at n = 256, 1,024,
      4,096, and 16,384: <strong>510, 2,046, 8,190, 32,766 operations</strong>,
      exactly 2(n − 1), at depth 16, 20, 24, 28, exactly 2 log₂ n.
      Hillis-Steele reaches the same totals in half the levels (8 to
      14) with n log₂ n − n + 1 operations: 1,793 to 212,993, six
      and a half times the work at 16,384. The sequential chain is
      n − 1 operations at depth n − 1: 16,383 dependent steps. The
      naive parallel plan, every prefix by its own chain, is n(n − 1)/2:
      523,776 operations at n = 1,024. Blelloch&apos;s scan is the one
      that is both work-optimal and log-deep, which is why it is the
      one in the hardware.
    </p>
  ),

  picture: (
    <p>
      A stadium of people each holding a number, told to work out, for
      every seat, the sum of all the numbers before it. Passing a
      running total down the row takes as many steps as there are
      seats. Blelloch&apos;s stadium does two things instead. First,
      pairs of neighbors add and the right one holds the pair&apos;s
      total; then pairs of pairs; then blocks of four, eight, sixteen:
      in a dozen rounds the right end holds the grand total and a tree
      of block sums is spread through the stands. Then the right end
      writes down zero and the rounds run in reverse: each block holder
      tells its left half &quot;the total before you is what I was
      given&quot; and its right half &quot;the total before you is that
      plus the left half&apos;s sum.&quot; Two dozen rounds, twice the
      additions a single walker would do, and every seat has its
      answer.
    </p>
  ),

  steps: [
    <>
      <strong>Up-sweep:</strong> for d = 1, 2, 4, …: x[i + 2d − 1] ←
      x[i + d − 1] ⊕ x[i + 2d − 1]; n/2d operations per level.
    </>,
    <>
      <strong>Root:</strong> x[n − 1] ← identity.
    </>,
    <>
      <strong>Down-sweep:</strong> for d = n/2 … 1: t ← x[i + d − 1];
      x[i + d − 1] ← x[i + 2d − 1]; x[i + 2d − 1] ← x[i + 2d − 1] ⊕ t.
    </>,
    <>
      <strong>Result:</strong> the exclusive scan; one more parallel
      level of x[i] ⊕ a[i] makes it inclusive.
    </>,
    <>
      <strong>Count:</strong> 2(n − 1) work, 2 log₂ n depth; check
      against the sequential scan on three operations.
    </>,
  ],

  signals: [
    <>
      <strong>An associative operation and many processors:</strong> a
      GPU, a SIMD unit, a carry chain; anything where depth is the
      cost and work is nearly free.
    </>,
    <>
      <strong>Positions, not just totals:</strong> compaction, radix
      sort, allocation, and segmented reductions all ask &quot;how many
      before me&quot;, which is a scan.
    </>,
    <>
      <strong>A non-commutative operation:</strong> matrix products,
      string concatenation, state-machine composition; the scan needs
      associativity only.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the sequential scan</strong>:
      n − 1 operations, the fewest possible, in n − 1 dependent steps.
      Blelloch pays twice the operations to cut the depth from 16,383
      to 28 at n = 16,384; on one processor the sequential scan wins and
      should.
    </>
  ),

  strength: (
    <>
      <strong>Work-optimal and log-deep at once.</strong> 2(n − 1)
      operations at 2 log₂ n levels, exact under three operations
      including a non-commutative one, and the primitive under
      compaction, radix sort, and sparse products on every GPU.
    </>
  ),
  weakness: (
    <>
      <strong>Twice the levels of Hillis-Steele, and a power of two.</strong>{' '}
      The two sweeps cost 2 log₂ n levels where Hillis-Steele costs
      log₂ n, which matters when the depth is the whole bill and work
      is free; the basic form wants n a power of two and pads
      otherwise; and each level is a synchronization, which on a real
      GPU means a block-level scan plus a second scan over block
      totals plus a fix-up pass, the shape every library actually
      ships.
    </>
  ),

  problem: 'Data-parallel primitive',
  problemSlug: 'parallel-scan-reduce',
  rivals: [
    {
      name: 'Parallel prefix sum × Blelloch scan',
      isThisUnit: true,
      algoName: 'Parallel prefix sum',
      cost: '2(n − 1) work, 2 log₂ n depth',
      wins: (
        <>
          <strong>32,766 operations at depth 28</strong> for 16,384
          elements, exact on non-commutative operations.
        </>
      ),
      costs: (
        <>
          Twice the levels of Hillis-Steele; wants a power of two.
        </>
      ),
      when: 'Many processors, work that counts, and any associative operation.',
    },
    {
      name: 'Hillis-Steele scan',
      algoName: 'Parallel prefix sum',
      cost: 'n log₂ n − n + 1 work, log₂ n depth',
      wins: (
        <>
          Half the levels: depth 14 at 16,384, one line of code, no
          down-sweep.
        </>
      ),
      costs: (
        <>
          212,993 operations against 32,766 at n = 16,384: six and a
          half times the work.
        </>
      ),
      when: 'When n is small enough that work is free and only the depth is paid, as inside one GPU warp.',
    },
    {
      name: 'Kogge-Stone adder',
      cost: 'log₂ n gate levels, n log₂ n cells',
      wins: (
        <>
          The prefix sum as a circuit: carries for a 64-bit add in six
          levels, in silicon in every processor.
        </>
      ),
      costs: (
        <>
          Hillis-Steele&apos;s work in wires; Brent-Kung trades depth
          for fewer cells.
        </>
      ),
      when: 'Hardware, where depth is latency and cells are area.',
    },
  ],
  neverUse: {
    name: 'Every prefix by its own chain',
    why: (
      <>
        The instinct with n processors is to give each one a prefix to
        compute: processor i adds up elements 0 through i. Counted,
        that is n(n − 1)/2 operations, <strong>523,776 at n = 1,024</strong>{' '}
        against Blelloch&apos;s 2,046, and the depth is still n − 1
        because the last processor&apos;s chain is as long as the
        sequential one. It is worse than doing nothing in parallel at
        all: 512× the work of the sequential scan for the same depth.
        The tree exists because prefixes share their work; the scan
        computes each partial total once and routes it to everyone who
        needs it.
      </>
    ),
  },

  contest: {
    instance:
      'prefix sums of n elements on a simulated parallel machine that records every level; referee: the sequential scan for addition, maximum, and 2 × 2 matrix multiplication, and the closed-form work and depth of each scan',
    columns: ['Blelloch work / depth', 'Hillis-Steele work / depth', 'sequential / naive parallel'],
    rows: [
      {
        method: 'n = 256',
        values: ['510 / 16', '1,793 / 8', '255 / 255; naive 32,640 / 255'],
        verdict: '2(n − 1) at 2 log₂ n',
      },
      {
        method: 'n = 1,024',
        values: ['2,046 / 20', '9,217 / 10', '1,023 / 1,023; naive 523,776 / 1,023'],
        verdict: 'the naive plan is 256× the work',
      },
      {
        method: 'n = 4,096',
        values: ['8,190 / 24', '45,057 / 12', '4,095 / 4,095'],
        verdict: 'Hillis-Steele 5.5× the work, half the depth',
      },
      {
        method: 'n = 16,384',
        isThisUnit: true,
        values: ['32,766 / 28', '212,993 / 14', '16,383 / 16,383'],
        best: 0,
        verdict: 'work-optimal and log-deep',
      },
      {
        method: 'Applications, n = 1,024',
        values: ['compaction: 2,361 / 21', 'radix sort, 10 passes: 51,160 / 410', 'match filter and sort'],
        verdict: 'positions from prefix counts',
      },
    ],
    source:
      'python solutions/parallel_prefix_sum_blelloch_scan.py prints this table and asserts: the sequential, Hillis-Steele, and Blelloch scans agree on 256 integers under addition and maximum and on 256 matrices under multiplication, with the exclusive scan equal to the inclusive one shifted; a scan with swapped operands differing on the matrices; work and depth equal to 2(n − 1) and 2 log₂ n, n log₂ n − n + 1 and log₂ n, n − 1 and n − 1, and n(n − 1)/2 and n − 1 at every n tried; and compaction and radix sort equal to Python’s filter and sorted.',
  },

  figure: (
    <Figure
      id="fig-blelloch-sweeps"
      aspect="16 / 7"
      caption="Eight values through the two sweeps. Up-sweep: adjacent pairs combine into their right element, then pairs of pairs, until the last element holds the total; a tree of partial sums is left behind. The root is set to the identity. Down-sweep: each node hands its left child the value it holds and its right child that value plus the left child’s old partial sum. After log₂ n levels each way, element i holds the sum of elements 0 through i − 1. Counted at n = 16,384: 32,766 operations in 28 levels, against 212,993 in 14 for Hillis-Steele and 16,383 in 16,383 sequentially."
      cite={{
        text: 'G. E. Blelloch, "Scans as primitive parallel operations," IEEE Transactions on Computers 38(11), 1989. DOI 10.1109/12.42122. W. D. Hillis, G. L. Steele, "Data parallel algorithms," CACM 29(12), 1986. M. Harris, S. Sengupta, J. D. Owens, "Parallel prefix sum (scan) with CUDA," GPU Gems 3, 2007.',
        href: 'https://doi.org/10.1109/12.42122',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Three rows of eight cells: the input, the array after the up-sweep with partial sums, and the exclusive prefix sums after the down-sweep, with arrows for the tree">
        {[
          ['input', [3, 1, 7, 0, 4, 1, 6, 3], '#9aa5bd'],
          ['after up-sweep', [3, 4, 7, 11, 4, 5, 6, 25], '#5da2ff'],
          ['after down-sweep (exclusive scan)', [0, 3, 4, 11, 11, 15, 16, 22], '#62d98a'],
        ].map(([label, vals, color], row) => (
          <g key={row}>
            <text x="30" y={50 + row * 80} fill={color} fontFamily="ui-monospace, monospace" fontSize="11">{label}</text>
            {vals.map((v, i) => (
              <g key={i}>
                <rect x={30 + i * 48} y={58 + row * 80} width="42" height="28" fill={`${color}33`} stroke={color} />
                <text x={44 + i * 48} y={77 + row * 80} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{v}</text>
              </g>
            ))}
          </g>
        ))}
        {[[0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b], i) => <line key={`u1-${i}`} x1={51 + a * 48} y1="90" x2={51 + b * 48} y2="136" stroke="#f0b94b" strokeWidth="1.5" />)}
        {[[1, 3], [5, 7]].map(([a, b], i) => <line key={`u2-${i}`} x1={51 + a * 48} y1="90" x2={51 + b * 48} y2="136" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="4 3" />)}
        <text x="430" y="50" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">amber: the up-sweep tree (solid d = 1, dashed d = 2; d = 4 joins 3 and 7)</text>
        <text x="430" y="230" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">3 up levels, root cleared, 3 down levels: 14 operations for 8 values</text>
        <text x="430" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">n = 16,384: 32,766 / 28 vs Hillis-Steele 212,993 / 14</text>
        <text x="430" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">naive independent prefixes at 1,024: 523,776 operations</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'parallel_prefix_sum_blelloch_scan.py',
  Viz: ScanViz,
  narration,
};
