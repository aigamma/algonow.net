import TimingAnalysisViz from '../viz/TimingAnalysisViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/static_timing_analysis_longest_path_arrival_propagation.py?raw';
import { narration } from './static-timing-analysis-longest-path-arrival-propagation.narration.js';

export const content = {
  given:
    'A netlist: between the flip-flops, a directed acyclic graph of gates and wires, each with a delay. The clock arrives every period whether the signals are ready or not. You need the longest register-to-register delay, the path that sets it, and the slack at every pin, for millions of gates and a number of paths that grows exponentially with the depth.',
  task: 'Static timing analysis. The algorithm forgets what the logic computes: every gate is a delay, every wire is a delay, and the only question is when a signal could arrive. The heuristic is longest-path arrival propagation: visit the nodes in topological order and give each one the latest arrival over its fan-ins plus wire, plus its own delay. One pass over the edges finds the worst of the exponentially many paths without listing any of them. A backward pass of required times (period minus setup at the outputs, the earliest requirement among the fan-outs elsewhere) turns the sweep into a slack at every node; the zero-slack chain is the critical path. Repeat with minimums for hold.',
  constraint:
    'Measured against every path enumerated explicitly on 300 random netlists (4,963 paths): every arrival equals the longest enumerated path and Bellman-Ford, every shortest arrival the shortest path, 6,873 relaxations in all. A ladder 6 wide and 24 deep holds 4,738,381,338,321,616,896 paths and takes 865 relaxations. A 130-node sequential wrapper: longest register path 78.74 ns over 38 gates, Fmax 12.7 MHz, matched by a binary search over the period; 0.4 ns of capture skew shifts every setup slack by +0.4 and every hold slack by −0.4. The false path: STA 10.7 ns, all 240 vector pairs 2.3 ns; on 60 random four-input circuits the simulation never exceeds STA, which is strictly pessimistic on 14 of the 59 toggling ones (worst gap 54%). Monte Carlo over 1,000 delay samples at 10% gate sigma on 210 nodes: 99.87th percentile 116.23 ns against a 3σ corner of 141.60 (22% pessimistic). 2,112 checks in 0.3 s.',

  origins: (
    <p>
      Kirkpatrick and Clark described the longest-path view of circuit timing
      at IBM in 1966; the timing analysis program of Hitchcock, Smith, and
      Cheng (1982) made it the sign-off standard every chip has used since.
      The recurrence is older: Kelley and Walker&apos;s critical path method
      (1959) ran the same passes on construction schedules, as did PERT for
      the Polaris program. Static analysis displaced vector simulation because
      no vector set exercises every path of a large circuit. Its known
      weakness, the <strong>false path</strong>, a structural path no input can
      activate, was studied through the 1980s; statistical timing, treating
      delays as distributions, grew through the 2000s with process variation.
      Sapatnekar&apos;s <strong>Timing</strong> (2004) collects the modern form.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>model</strong>: logic stripped to a weighted DAG, a node
      per gate, an edge per wire, delays on both, inputs and outputs at the
      ends. That abstraction turns sign-off into the longest path in a DAG.
      The file holds it to enumeration: on 300 netlists every arrival equals
      the longest of the <strong>4,963</strong> explicitly listed paths, every
      shortest arrival the shortest path, and Bellman-Ford, which needs no
      ordering at all, agrees on every node.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>sweep</strong>: Kahn&apos;s order (puzzle 21) settles
      every fan-in before its gate, each gate takes the maximum of arrival
      plus wire over its fan-ins plus its own delay, and the backward pass
      takes minimums. <strong>6,873 relaxations</strong> said what 4,963 paths
      said; on the 6 × 24 ladder, <strong>865 relaxations</strong> against
      4.7 × 10²¹ paths. The winning fan-in recorded at each node makes the
      critical path a walk backward from the latest output.
    </p>
  ),

  picture: (
    <p>
      Picture a relay race through a city where every runner must wait for
      the slowest teammate handing off to them. You could time every route
      from start to finish, but routes multiply at every intersection.
      Instead, stand at each intersection in order and write down the latest
      moment a runner could possibly arrive there, using only the times
      written at the intersections feeding it. At the finish line you know the
      worst case without ever following one complete route.
    </p>
  ),

  steps: [
    <>
      <strong>Build the graph:</strong> a node per input, gate, and output; an
      edge per wire; a delay on every gate and wire.
    </>,
    <>
      <strong>Order with Kahn:</strong> release a node when all its fan-ins
      are done; a leftover node means a combinational loop.
    </>,
    <>
      <strong>Forward pass:</strong> inputs start at zero (or clock-to-Q), each
      node takes max over fan-ins of arrival + wire, plus its delay; remember
      the winner.
    </>,
    <>
      <strong>Backward pass:</strong> outputs are required at period − setup;
      each node takes min over fan-outs of required − fan-out delay − wire.
    </>,
    <>
      <strong>Report:</strong> slack = required − arrival everywhere; walk the
      winners back from the latest output for the critical path; repeat with
      minimums against the hold time.
    </>,
  ],

  signals: [
    <>
      <strong>An acyclic graph and a worst-case question:</strong> logic
      between registers, schedules, build graphs, pipelines.
    </>,
    <>
      <strong>Paths are hopeless, edges are not:</strong> linear in the edges
      where enumeration is exponential in the depth.
    </>,
    <>
      <strong>You need slack everywhere:</strong> the backward pass gives every
      node its margin, which sizing and placement tools consume.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>event-driven timing simulation</strong>{' '}
      (puzzle 136): exact for the vectors applied, 150,036 events for 60
      four-input circuits, and 4ⁿ vector pairs to be complete.
    </>
  ),

  strength: (
    <>
      <strong>The worst path and every slack in one linear sweep.</strong>{' '}
      865 relaxations where the paths number 4.7 × 10²¹; exact against every
      enumerated path on 300 netlists.
    </>
  ),
  weakness: (
    <>
      <strong>Pessimistic by construction and blind to logic.</strong> The
      false path reads 10.7 ns against a true 2.3; 14 of 59 random circuits
      carry a longest path no vector exercises; one delay per gate, no
      variation.
    </>
  ),

  problem: 'Timing verification',
  problemSlug: 'timing-analysis',
  rivals: [
    {
      name: 'Static timing analysis × Longest-path arrival propagation',
      isThisUnit: true,
      algoName: 'Static timing analysis',
      cost: 'O(V + E): one forward and one backward pass',
      wins: (
        <>
          <strong>Exact on every node</strong> against enumeration and
          Bellman-Ford; 865 relaxations for 4.7 × 10²¹ paths; slack everywhere.
        </>
      ),
      costs: (
        <>
          Reports false paths (10.7 ns against a true 2.3); pessimistic on 14
          of 59 random circuits; a single delay corner.
        </>
      ),
      when: 'Sign-off of any synchronous design, and any DAG where the worst case and the margin at every node matter.',
    },
    {
      name: 'Statistical static timing × Variation-aware distributions',
      algoName: 'Statistical static timing',
      cost: 'distributions through the same sweep, or M full analyses',
      wins: (
        <>
          Monte Carlo over 1,000 samples: 99.87th percentile{' '}
          <strong>116.23 ns</strong> where the all-gates-at-3σ corner claims
          141.60, 22% pessimistic.
        </>
      ),
      costs: (
        <>
          1,000 × 404 relaxations here; a correlation model between gates; the
          max of distributions is not Gaussian.
        </>
      ),
      when: 'Process variation decides whether the chip ships and the corner would leave performance on the table.',
    },
    {
      name: 'Discrete-event simulation × Event-queue advance',
      algoName: 'Discrete-event simulation',
      cost: 'events per vector pair; 4ⁿ pairs to be complete',
      wins: (
        <>
          <strong>Never reports a false path:</strong> 2.3 ns where STA says
          10.7; exact for the vectors applied (puzzle 136).
        </>
      ),
      costs: (
        <>
          240 pairs and 2,080 events for four inputs; 4ⁿ pairs in general, so
          no simulation certifies a real chip.
        </>
      ),
      when: 'Confirming a suspicious path, validating the static model, or circuits small enough to exhaust.',
    },
    {
      name: 'Critical path method (project schedules)',
      algoName: 'Critical path method',
      cost: 'O(V + E), the same passes in days',
      wins: (
        <>
          Finish on <strong>day 90</strong> for 30 tasks with 13 critical
          tasks of zero float, confirmed by 351 enumerated schedule paths.
        </>
      ),
      costs: (
        <>
          Same blind spots: durations are point estimates, and resource
          limits are not in the graph.
        </>
      ),
      when: 'Any schedule or build graph that needs a worst case and the float of every task.',
    },
  ],
  neverUse: {
    name: 'Trusting the static report on a path no vector can exercise',
    why: (
      <>
        Input a crawls through four slow buffers into the first mux&apos;s zero
        leg (chosen when the select is low); the first mux feeds the second
        mux&apos;s one leg (chosen when the select is high). STA follows the
        structure and reports <strong>10.7 ns</strong>. The exhaustive
        simulation over all 240 vector pairs never saw the output settle later
        than <strong>2.3 ns</strong>, because no single select value opens both
        legs. A designer who trusted the report would upsize gates, add a
        pipeline stage, or slow the clock more than fourfold to fix a delay
        that cannot happen. Declare the false path or confirm it by
        simulation, as the file does.
      </>
    ),
  },

  contest: {
    instance:
      '300 random netlists with every path enumerated; the 6 × 24 ladder; a four-input false-path circuit over all 240 vector pairs; a 210-node netlist under 10% gate-delay variation',
    columns: ['referee agreement', 'work', 'false paths', 'variation'],
    rows: [
      {
        method: 'static timing analysis',
        isThisUnit: true,
        values: ['exact on every node', '865 relaxations on the ladder', 'reported: 10.7 vs 2.3 ns', 'one corner: 141.6 ns'],
        best: 1,
        verdict: 'the sweep, linear in the edges',
      },
      {
        method: 'path enumeration (referee)',
        values: ['defines the answer', '4.7 × 10²¹ paths on the ladder', 'reported', 'none'],
        verdict: 'exponential in the depth',
      },
      {
        method: 'event-driven simulation',
        values: ['exact for the vectors', '150,036 events, 60 circuits', 'never reported', 'per sample'],
        verdict: 'complete only at 4ⁿ pairs',
      },
      {
        method: 'Monte Carlo statistical timing',
        values: ['nominal 112.25 ns', '1,000 × 404 relaxations', 'reported', '99.87th pct 116.23 ns'],
        best: 3,
        verdict: '22% under the corner',
      },
    ],
    source:
      'python solutions/static_timing_analysis_longest_path_arrival_propagation.py prints these tables and asserts: every arrival equals the longest enumerated path and Bellman-Ford, and every shortest arrival the shortest path, on 300 netlists; the enumeration count equals the DP count; the ladders match their formulas; the critical path has zero slack and no slack is negative at the critical period; a binary search over the period lands on the longest register path plus setup; skew shifts setup and hold by exactly its value; the simulation never settles later than STA; the false path reads 10.7 against 2.3; the schedule finish equals its longest path; the Monte Carlo quantile lies between the nominal and the corner.',
  },

  figure: (
    <Figure
      id="fig-sta-paths-vs-relaxations"
      aspect="16 / 7"
      caption="Left: the ladder netlists on a log scale, paths (outline) from 81 to 4.7 × 10²¹ against relaxations (solid) from 37 to 865. Right: the false path, the static report against the latest settling time over all 240 vector pairs."
      cite={{
        text: 'T. I. Kirkpatrick and N. R. Clark, "PERT as an aid to logic design," IBM J. Res. Dev. 10(2), 1966. R. B. Hitchcock, G. L. Smith, and D. D. Cheng, "Timing analysis of computer hardware," IBM J. Res. Dev. 26(1), 1982. J. E. Kelley and M. R. Walker, "Critical-path planning and scheduling," 1959. S. S. Sapatnekar, Timing, 2004.',
        href: 'https://doi.org/10.1147/rd.102.0135',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Log-scale bars of path counts against relaxation counts for four ladder netlists, beside bars comparing the static timing report with exhaustive simulation on the false-path circuit">
        {(() => {
          const ladders = [['3x4', 81, 37], ['4x8', 65536, 129], ['4x16', 4.29e9, 257], ['6x24', 4.74e21, 865]];
          const ly = (v) => 230 - (Math.log10(v) / 22) * 190;
          const fp = [['STA report', 10.7, '#5da2ff'], ['all 240 vector pairs', 2.3, '#62d98a']];
          const fy = (v) => 230 - (v / 12) * 160;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">ladder netlists, log scale: paths (outline) against relaxations (solid)</text>
              {ladders.map(([name, p, r], i) => (
                <g key={name}>
                  <rect x={40 + i * 70} y={ly(p)} width="44" height={230 - ly(p)} fill="none" stroke="#e2606c" strokeOpacity="0.9" />
                  <rect x={46 + i * 70} y={ly(r)} width="32" height={230 - ly(r)} fill="#5da2ff" fillOpacity="0.9" />
                  <text x={38 + i * 70} y={ly(p) - 5} fill="#e2606c" fontSize="8">{p >= 1e6 ? p.toExponential(1) : p.toLocaleString()}</text>
                  <text x={44 + i * 70} y={ly(r) - 4} fill="#5da2ff" fontSize="8">{r}</text>
                  <text x={44 + i * 70} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="20" y="268" fill="#62d98a" fontSize="10">865 relaxations settle a graph with 4.7 x 10^21 paths</text>
              <text x="340" y="22" fill="#9aa5bd" fontSize="10">the false path: reported against exercised (ns)</text>
              {fp.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={370 + i * 110} y={fy(v)} width="70" height={230 - fy(v)} fill={c} fillOpacity="0.85" />
                  <text x={372 + i * 110} y={fy(v) - 6} fill={c} fontSize="10">{v.toFixed(1)} ns</text>
                  <text x={360 + i * 110} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="340" y="268" fill="#f0b94b" fontSize="10">random circuits: 14 of 59 carry a path no vector reaches (worst gap 54%)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'static_timing_analysis_longest_path_arrival_propagation.py',
  Viz: TimingAnalysisViz,
  narration,
};
