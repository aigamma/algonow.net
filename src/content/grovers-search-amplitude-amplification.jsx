import GroverViz from '../viz/GroverViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/grovers_search_amplitude_amplification.py?raw';
import { narration } from './grovers-search-amplitude-amplification.narration.js';

export const content = {
  given:
    'N = 4,096 items, one of them marked, and the only tool an oracle that answers “is this one marked?” No order, no index, no structure. Classically, a random-order scan expects (N + 1)/2 = 2,048.5 oracle calls.',
  task: 'Prepare an equal superposition over all N items and repeat one round about (π/4)√N times: the oracle flips the sign of the marked amplitude, then the diffusion operator reflects every amplitude about the mean. Measure. Amplitude amplification is the geometry of that round: each one rotates the state by 2θ toward the marked item, sin θ = √(k/N), so the marked probability climbs as sin²((2t + 1)θ).',
  constraint:
    'The exact state-vector simulation matches the closed form sin²((2t + 1)θ) to 2 × 10⁻¹⁵ at every round. With t* = 50 oracle calls the marked probability is 0.9999 and 2,000 of 2,000 simulated measurements hit; the classical scan measured 2,112 calls. Keep going and it falls: 0.0009 at 100 rounds. Four marked items need 25 rounds (0.9995), and the one-item schedule on four items lands at 0.0002; the Boyer-Brassard-Høyer-Tapp schedule finds a marked item in 51.9 calls on average without knowing k. From N = 256 to 16,384 the optimal round count grows √2 per doubling: 12, 17, 25, 35, 50, 71, 100. The oracle alone leaves the probability at 1/N forever; the diffusion alone changes nothing.',

  origins: (
    <p>
      Lov Grover published the algorithm in <strong>1996</strong> (STOC,
      &quot;A fast quantum mechanical algorithm for database search&quot;)
      two years after Shor&apos;s factoring, and it was the second
      result to show a quantum computer beating every classical
      algorithm for a natural task. Bennett, Bernstein, Brassard, and
      Vazirani had already proved in 1994, before the algorithm
      existed, that no quantum search can beat √N queries, so Grover
      was optimal on arrival; Zalka (1999) made the constant tight.
      Boyer, Brassard, Høyer, and Tapp (1998) worked out the geometry
      used on this page, the exact success probability, the case of
      several marked items, and the schedule for an unknown number of
      them; Brassard, Høyer, Mosca, and Tapp (2002) generalized the
      whole thing to amplitude amplification of any quantum
      subroutine. The algorithm has been run on real hardware for a
      handful of qubits since 1998 (Chuang, Gershenfeld, Kubinec, NMR).
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>round and the count</strong>: oracle (flip the
      marked signs), then diffusion (a<sub>i</sub> ← 2·mean − a<sub>i</sub>),
      repeated t* = round(π/(4θ) − ½) times. Measured on the exact
      state vector for N = 4,096: <strong>50 oracle calls</strong> to a
      marked probability of 0.9999, 2,000 of 2,000 simulated
      measurements hitting, against 2,112 calls for the classical scan;
      four marked items in 25 rounds at 0.9995. The square-root law
      measured across N = 256 … 16,384: t* = 12, 17, 25, 35, 50, 71,
      100, ratios 1.40 to 1.47 per doubling against √2 = 1.41.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>geometry that says when to stop</strong>.
      In the plane spanned by the marked and unmarked states, oracle
      then diffusion is a rotation by 2θ with sin θ = √(k/N), so
      after t rounds the marked probability is exactly sin²((2t + 1)θ):
      the simulation agrees to <strong>2 × 10⁻¹⁵</strong> at every
      round. That tells you the peak (t*), and that the peak is a
      peak: at 2t* the probability is 0.0009 and at 3t* it is back
      above 0.99. It tells you k matters: the one-item schedule on
      four items lands at 0.0002. And it gives the fix when k is
      unknown: random round counts under a cap that grows by 6/5 on
      each failure, 51.9 calls on average to a confirmed hit. The
      ablations are exact: the oracle alone leaves the probability at
      1/N (a sign is invisible to measurement); the diffusion alone
      leaves the uniform state fixed.
    </p>
  ),

  picture: (
    <p>
      A choir of 4,096 voices singing the same note at the same
      volume, one of them the person you are looking for. The oracle
      cannot point; it can only make that one voice sing a half-beat
      out of phase. The diffusion step is the conductor telling
      everyone: sing at twice the average minus what you were singing.
      For the voices in phase that changes almost nothing. For the
      out-of-phase voice, whose contribution was pulling the average
      down, it means a louder voice than before. Repeat: out of phase,
      reflect; out of phase, reflect. Each pass tilts the whole choir a
      fixed angle toward the one voice, and after about √N passes it
      is nearly the only one you hear. Keep going and the tilt carries
      past it, and the voice fades again: measure at the peak.
    </p>
  ),

  steps: [
    <>
      <strong>Prepare:</strong> a<sub>i</sub> = 1/√N for all N items;
      θ = arcsin √(k/N).
    </>,
    <>
      <strong>Oracle:</strong> a<sub>i</sub> ← −a<sub>i</sub> for
      every marked i (one query).
    </>,
    <>
      <strong>Diffusion:</strong> a<sub>i</sub> ← 2·mean(a) − a<sub>i</sub>{' '}
      for all i: reflect about the mean.
    </>,
    <>
      <strong>Repeat</strong> t* = round(π/(4θ) − ½) times: 50 for
      N = 4,096, k = 1.
    </>,
    <>
      <strong>Measure:</strong> P(marked) = sin²((2t* + 1)θ) = 0.9999;
      check the item classically with one more query.
    </>,
  ],

  signals: [
    <>
      <strong>No structure to exploit:</strong> the only handle on the
      data is a yes/no oracle; anything sorted or indexed beats √N
      classically.
    </>,
    <>
      <strong>The oracle is a circuit:</strong> a predicate you can
      evaluate in superposition (SAT clauses, a hash preimage, a
      collision), not a lookup in classical memory.
    </>,
    <>
      <strong>Quadratic is enough:</strong> √N turns 2¹²⁸ into 2⁶⁴
      and halves symmetric key lengths; it does not turn exponential
      into polynomial.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the classical scan</strong>: query
      items in random order until the oracle says yes, (N + 1)/2 =
      2,048.5 expected calls, measured at 2,112 over 2,000 orders.
      Grover&apos;s 50 is the whole story, and the BBBV bound says no
      quantum method does better than order √N.
    </>
  ),

  strength: (
    <>
      <strong>A provable quadratic speedup with a closed form you can
      check.</strong> 50 calls against 2,112, the simulation matching
      sin²((2t + 1)θ) to 10⁻¹⁵, the √2 law measured across seven
      sizes, and optimality proven before the algorithm existed.
    </>
  ),
  weakness: (
    <>
      <strong>Quadratic, not exponential, and it needs the count.</strong>{' '}
      √N is the ceiling (BBBV): no version of this reaches
      polynomial time on NP-hard search. Overshoot is real (0.0009 at
      2t*), the wrong k is fatal (0.0002), and the fix for unknown k
      costs a constant factor (51.9 vs 50). The oracle must be a
      reversible circuit; loading a classical database into it costs
      the N you were trying to save.
    </>
  ),

  problem: 'Unstructured search',
  problemSlug: 'quantum-search',
  rivals: [
    {
      name: 'Grover’s search × amplitude amplification',
      isThisUnit: true,
      algoName: "Grover's search",
      cost: 'about (π/4)√(N/k) oracle calls',
      wins: (
        <>
          <strong>50 calls where the scan needs 2,112</strong>, at
          probability 0.9999, with the closed form to say exactly when
          to measure.
        </>
      ),
      costs: (
        <>
          A quantum computer, an oracle as a circuit, and the number
          of marked items (or the BBHT schedule).
        </>
      ),
      when: 'A predicate you can evaluate in superposition over a space with no exploitable structure.',
    },
    {
      name: 'Linear search',
      cost: '(N + 1)/2 expected',
      wins: (
        <>
          No hardware assumptions, no oracle circuit, one comparison
          per item; the classical floor for unstructured data.
        </>
      ),
      costs: (
        <>
          2,112 calls measured against 50; the gap grows as √N.
        </>
      ),
      when: 'Everything classical, or N small enough that 2,000 calls is nothing.',
    },
    {
      name: 'Quantum walk search',
      cost: 'O(√N) steps on a graph',
      wins: (
        <>
          The same quadratic speedup when the items sit on a graph and
          the oracle must move locally (grids, Johnson graphs).
        </>
      ),
      costs: (
        <>
          More machinery, and on a 2-D grid the speedup shrinks to
          √N log N.
        </>
      ),
      when: 'Spatial search, element distinctness, triangle finding.',
    },
    {
      name: 'Binary search',
      cost: 'log₂ N',
      wins: (
        <>
          12 queries on 4,096 sorted items, four times fewer than
          Grover, with no quantum computer.
        </>
      ),
      costs: (
        <>
          Needs the data sorted or indexed; useless on an oracle
          alone.
        </>
      ),
      when: 'Whenever the structure exists: order, an index, a hash.',
    },
  ],
  neverUse: {
    name: 'Grover on data that has structure',
    why: (
      <>
        The mistake is aiming the algorithm at the wrong problem. On
        4,096 sorted items binary search takes <strong>12 queries</strong>;
        Grover takes 50, and each of the 50 is a superposed evaluation
        on quantum hardware. The √N speedup is against the classical
        floor for unstructured search, and only there; against an index
        it is a loss of four times with a machine you do not have. The
        same trap in reverse: loading an unstructured classical
        database into a quantum oracle costs N operations up front,
        which returns every one of the 2,062 calls Grover saved.
      </>
    ),
  },

  contest: {
    instance:
      'unstructured search over N = 4,096 items on an exactly simulated state vector; referee: the closed form sin²((2t + 1)θ), sin θ = √(k/N), checked at every round',
    columns: ['oracle calls', 'success probability'],
    rows: [
      {
        method: 'Classical random scan, k = 1',
        values: ['2,112 (mean of 2,000 orders)', '1.000'],
        verdict: 'expected (N + 1)/2 = 2,048.5',
      },
      {
        method: 'Grover, k = 1, t* = 50',
        isThisUnit: true,
        values: ['50', '0.9999'],
        best: 0,
        verdict: '2,000 of 2,000 measurements hit',
      },
      {
        method: 'Grover, k = 1, 2t* = 100 (overshoot)',
        values: ['100', '0.0009'],
        verdict: 'past the peak the amplitude rotates away',
      },
      {
        method: 'Grover, k = 4, t* = 25',
        values: ['25', '0.9995'],
        verdict: 'four targets, half the rounds',
      },
      {
        method: 'Grover, k = 4 on the k = 1 schedule',
        values: ['50', '0.0002'],
        verdict: 'the wrong round count is fatal',
      },
      {
        method: 'BBHT, k unknown (2,000 runs)',
        values: ['51.9 (mean)', '1.000 (confirmed)'],
        verdict: 'random round counts under a growing cap; √(N/k) = 32',
      },
    ],
    source:
      'python solutions/grovers_search_amplitude_amplification.py prints this table and asserts: the simulated marked probability within 10⁻¹² of sin²((2t + 1)θ) at every round for k = 1 and k = 4; t* = 50 with probability above 0.999 and more than 1,980 of 2,000 measurement hits; the classical mean within statistical error of (N + 1)/2; t* ratios between 1.3 and 1.5 per doubling from N = 256 to 16,384; probability below 0.01 at 2t* and above 0.99 at 3t*; k = 4 above 0.999 at its own t* and below 0.5 on the k = 1 schedule; BBHT under 4√(N/k) calls; and the two ablations exact.',
  },

  figure: (
    <Figure
      id="fig-grover-rotation"
      aspect="16 / 7"
      caption="Amplitude amplification as a rotation. The state lives in the plane spanned by the unmarked superposition (horizontal) and the marked item (vertical); it starts at angle θ = arcsin √(1/N) above the axis. The oracle reflects it across the horizontal axis; the diffusion reflects it across the starting state; two reflections make a rotation by 2θ. After t rounds the angle is (2t + 1)θ and the marked probability sin² of it: 0.9999 at t* = 50 for N = 4,096, 0.0009 at 100, back above 0.99 at 150. Right: the measured optimal round counts from N = 256 to 16,384, growing √2 per doubling."
      cite={{
        text: 'L. K. Grover, "A fast quantum mechanical algorithm for database search," STOC 1996. DOI 10.1145/237814.237866. M. Boyer, G. Brassard, P. Høyer, A. Tapp, "Tight bounds on quantum searching," Fortschritte der Physik 46, 1998.',
        href: 'https://doi.org/10.1145/237814.237866',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A unit quarter circle with the state vector rotating from a small angle toward the vertical marked axis, and a bar chart of optimal round counts doubling in N">
        <line x1="40" y1="230" x2="260" y2="230" stroke="rgba(154,165,189,0.5)" />
        <line x1="40" y1="230" x2="40" y2="30" stroke="rgba(154,165,189,0.5)" />
        <path d="M 240 230 A 200 200 0 0 0 40 30" fill="none" stroke="rgba(154,165,189,0.3)" strokeDasharray="4 4" />
        <text x="200" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">unmarked</text>
        <text x="46" y="26" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">marked</text>
        <line x1="40" y1="230" x2="238" y2="205" stroke="#9aa5bd" strokeWidth="2" />
        <text x="150" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">start, angle θ</text>
        <line x1="40" y1="230" x2="222" y2="140" stroke="#5da2ff" strokeWidth="2" />
        <text x="160" y="132" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">after 1 round: 3θ</text>
        <line x1="40" y1="230" x2="150" y2="62" stroke="#5da2ff" strokeWidth="2" />
        <text x="120" y="56" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">after t rounds: (2t + 1)θ</text>
        <line x1="40" y1="230" x2="56" y2="32" stroke="#62d98a" strokeWidth="2.5" />
        <text x="60" y="52" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">t* = 50: sin² = 0.9999</text>
        <text x="40" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">oracle: reflect across the axis; diffusion: reflect across the start; together: rotate by 2θ</text>
        <text x="320" y="40" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">optimal rounds t* by N (√2 per doubling)</text>
        {[[256, 12], [512, 17], [1024, 25], [2048, 35], [4096, 50], [8192, 71], [16384, 100]].map(([n, t], i) => (
          <g key={n}>
            <rect x={330 + i * 42} y={230 - t * 1.7} width="30" height={t * 1.7} fill={n === 4096 ? '#62d98a' : '#5da2ff'} opacity="0.85" />
            <text x={330 + i * 42} y={224 - t * 1.7} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{t}</text>
            <text x={326 + i * 42} y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n >= 1024 ? `${n / 1024}k` : n}</text>
          </g>
        ))}
        <text x="320" y="270" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">classical scan at N = 4,096: 2,112 calls measured; Grover: 50</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'grovers_search_amplitude_amplification.py',
  Viz: GroverViz,
  narration,
};
