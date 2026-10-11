import LiveVariablesViz from '../viz/LiveVariablesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/live_variable_analysis_backward_dataflow.py?raw';
import { narration } from './live-variable-analysis-backward-dataflow.narration.js';

export const content = {
  given:
    'A program as a control-flow graph: blocks of assignments joined by branches and loops. At every point, which variables will still be read before they are written again? A register holding a dead value can be reused; a store nobody reads can be deleted. Every allocator asks this first.',
  task: 'Live variable analysis. A variable is live at a point when some path onward reads it before writing it. Per block: use, the variables read before any write in the block, and def, the variables written before any read. IN[B] = use[B] ∪ (OUT[B] − def[B]); OUT[B] is the union of IN over the successors; the exit\'s OUT is empty. The heuristic is backward dataflow on a worklist in postorder: the facts flow against control, so process a block after its successors and revisit a predecessor only when a successor\'s IN grew. Union distributes over these transfer functions, so the fixpoint is the exact meet over all paths, bounded by loop depth + 2 passes.',
  constraint:
    'Measured: 300 random structured programs over six variables (if/else and while nested to depth 3; 8,497 blocks, 11,877 statements; 217 with a loop). The postorder worklist fixpoint equals two referees that never form a set equation: a per-variable reachability search, and the exhaustive enumeration of every simple path (114,559 paths), on 300 of 300. Sets never shrank; round robin in postorder converged within depth + 2 passes on every program (5 at most, tight on 127). Visits: 11,930 for the worklist in postorder against 25,872 random, 28,815 round robin, and 81,175 against the flow. Dead-store elimination removed 2,106 assignments and the programs printed identical output on all 9,000 executions. The liveness interference graph needs 5.17 registers on average against 6 and equals the largest live set on every program. A single backward sweep missed 5,287 live facts and its elimination changed the output of 191 programs.',

  origins: (
    <p>
      Liveness is the oldest consumer-driven dataflow problem: IBM&apos;s
      Fortran H and Allen and Cocke&apos;s optimizer (<strong>1970</strong>)
      kept live-variable bit vectors to decide which values stayed in
      registers. Gary Kildall (POPL <strong>1973</strong>) placed it in the
      lattice framework beside reaching definitions: a monotone transfer per
      block, a meet at every join, one iterative solver; liveness is the
      framework run backward. Kennedy&apos;s 1979 survey organized the
      backward problems and their node-listing schedules; Hecht and Ullman
      and Kam and Ullman bounded round robin by the loop-connectedness of the
      graph. Chaitin&apos;s 1982 allocator turned live ranges into an
      interference graph and colored it (puzzle 162 here). The forward twin,
      reaching definitions, is puzzle 187: same engine, opposite direction,
      pasts instead of futures.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>equations</strong>: use and def per block, union at
      every join of futures, IN = use ∪ (OUT − def), and the claim that the
      least solution is exactly the set of variables some path reads before
      writing. The referees never solve an equation: a per-variable search
      that walks forward from a block through blocks that do not write v and
      stops at the first block that reads it, and the exhaustive enumeration
      of every simple path, <strong>114,559 paths</strong> over the 300
      programs (a liveness witness is a simple path, so one visit per block
      suffices, unlike the two that reaching definitions needed). Both equal
      the fixpoint on 300 of 300. The consumers follow: a store whose target
      is dead afterward is removed, and 9,000 executions printed the same
      output before and after; two variables live at the same point interfere.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>schedule</strong>: backward, because a block&apos;s
      IN depends on its successors; postorder, so every block is processed
      after the blocks it flows into and only loop back edges carry stale
      information; a worklist, so a block is revisited only when a successor
      grew. Over 8,497 blocks: <strong>11,930 visits</strong>, 1.40 per block,
      against 25,872 for a random worklist order, 28,815 for round robin in
      postorder, and 81,175 for round robin in reverse postorder, the right
      order for the forward twin and the wrong one here. Round robin stayed
      within depth + 2 passes on every program, 5 at most, and that bound was
      tight on 127 of 300.
    </p>
  ),

  picture: (
    <p>
      A relay of runners carrying lanterns along one-way corridors, running
      the course backward from the finish. A lantern is a variable someone
      ahead still needs. A room that reads x lights the x lantern for every
      runner arriving from behind it; a room that writes x before reading it
      snuffs the lantern, since whatever x held before is never seen again. A
      loop corridor hands lanterns back to a room already passed, which is why
      one backward lap is not enough. The marshal visits rooms in finish-first
      order, returns to a room only when a room ahead of it lit something new,
      and stops when a full lap changes nothing. The lanterns at each door are
      exactly the values some path ahead will read.
    </p>
  ),

  steps: [
    <>
      <strong>Number the blocks:</strong> depth-first search from the entry,
      take the finishing order itself; successors finish before their
      predecessors, so postorder follows the facts.
    </>,
    <>
      <strong>Use and def per block:</strong> use is every variable read
      before any write inside the block, def every variable written before
      any read; the branch condition is a read at the block&apos;s end.
    </>,
    <>
      <strong>Seed:</strong> IN and OUT empty everywhere, the exit&apos;s OUT
      stays empty; the worklist holds every block in postorder.
    </>,
    <>
      <strong>Pop and transfer:</strong> OUT = union of the successors&apos;
      IN; IN = use ∪ (OUT − def); if IN grew, push each predecessor not
      already queued.
    </>,
    <>
      <strong>Read the answer:</strong> walk each block backward from OUT to
      get the live set after every statement; a write whose target is not
      live after it is a dead store; variables live together interfere.
    </>,
  ],

  signals: [
    <>
      <strong>A question about the future of a value:</strong> will it be
      read again, can its register be reused, can this store go; every
      &quot;still needed&quot; question is backward and merges by union.
    </>,
    <>
      <strong>A graph with loops:</strong> a value read by the loop head is
      live through the whole body; one backward sweep missed 5,287 such facts
      and broke 191 of 217 looping programs.
    </>,
    <>
      <strong>A consumer that needs intervals, not provenance:</strong>{' '}
      register allocation, dead-store and dead-code elimination, stack-slot
      reuse, garbage-collector root maps.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>round robin</strong>: sweep every block
      in postorder until a pass changes nothing. Exact and bounded by depth +
      2 passes (5 here), at 28,815 visits to the worklist&apos;s 11,930;
      swept in reverse postorder, the forward twin&apos;s order, it needs
      81,175 visits and 2,156 passes over the 300 programs.
    </>
  ),

  strength: (
    <>
      <strong>Exact for the graph at 1.4 visits per block.</strong> Equal to a
      per-variable search and to 114,559 enumerated simple paths on 300 of
      300 programs; 2,106 dead stores removed with identical output on 9,000
      executions; the interference graph&apos;s chromatic number equal to the
      largest live set on every program.
    </>
  ),
  weakness: (
    <>
      <strong>Exact for the graph, not for the program.</strong> It believes
      every path the edges allow, so a value read only on an impossible
      branch stays live and holds its register. It knows nothing about values
      or aliases, it stops at the procedure boundary, and with every variable
      initialized from input and printed late, the interference graph still
      needed 5.17 registers of 6: liveness finds reuse, it cannot invent it.
    </>
  ),

  problem: 'Dataflow analysis',
  problemSlug: 'dataflow-analysis',
  rivals: [
    {
      name: 'Live variable analysis × Backward dataflow',
      isThisUnit: true,
      algoName: 'Live variable analysis',
      cost: 'O(blocks × depth) visits, a set union per edge',
      wins: (
        <>
          <strong>Exact meet over all paths</strong> at 1.40 visits per block,
          within depth + 2 passes; dead stores and the interference graph
          fall out of the same sets.
        </>
      ),
      costs: (
        <>
          Path-insensitive and value-blind; one fact per variable per point,
          no provenance for a use.
        </>
      ),
      when: 'Whenever the question is whether a value is still needed: before allocating registers or deleting a store.',
    },
    {
      name: 'Reaching definitions × Forward dataflow',
      algoName: 'Reaching definitions',
      cost: 'O(blocks × depth) visits, forward',
      wins: (
        <>
          The same engine run <strong>forward</strong> in reverse postorder:
          which writes may have produced the value here; use-def chains and
          dead stores from the other side.
        </>
      ),
      costs: (
        <>
          Answers about pasts, not futures: it cannot say whether a register
          is free; its witness paths need two visits per block.
        </>
      ),
      when: 'Provenance for a use: constant and copy propagation, SSA construction, uninitialized-variable warnings (puzzle 187).',
    },
    {
      name: 'Register allocation × Graph coloring',
      algoName: 'Register allocation',
      cost: 'O(V²) interference edges plus a coloring heuristic',
      wins: (
        <>
          The <strong>consumer</strong>: variables live together interfere,
          the graph is colored with k registers, spills break the rest; here
          the chromatic number equaled the largest live set on 300 of 300.
        </>
      ),
      costs: (
        <>
          Needs liveness first and exactly; with every variable live late the
          graph still needed 5.17 of 6 registers.
        </>
      ),
      when: 'After liveness, when values outnumber registers (puzzle 162).',
    },
    {
      name: 'Dead code elimination × Mark-and-sweep on IR',
      algoName: 'Dead code elimination',
      cost: 'O(statements) marking from the roots',
      wins: (
        <>
          Marks every statement that reaches an observable effect through
          use-def edges and sweeps the rest; removes whole dead computations,
          not only the last store.
        </>
      ),
      costs: (
        <>
          Needs def-use edges (SSA or reaching definitions) to mark; on plain
          blocks liveness is the cheaper test for a single store.
        </>
      ),
      when: 'Chains of useless work after other optimizations expose them; liveness alone when one store is in question.',
    },
  ],
  neverUse: {
    name: 'A single backward sweep that never revisits a block',
    why: (
      <>
        One pass in postorder looks like the analysis and costs one visit per
        block, but a value read by a loop head is live through the body only
        along the back edge, and the head is processed after the body.
        Measured: <strong>5,287 live facts missing</strong>, and a dead-store
        pass trusting those sets deleted a store the head still read in 191
        of the 217 looping programs, changing what they printed. The real
        schedule costs 0.40 extra visits per block; the sweep saves them by
        deleting code the program needs.
      </>
    ),
  },

  contest: {
    instance:
      '300 random structured programs over six variables (if/else and while nested to depth 3; 8,497 blocks); referees: a per-variable reachability search, 114,559 exhaustive simple paths, 9,000 executions before and after dead-store elimination, the depth + 2 pass bound; one currency: block visits and set operations',
    columns: ['block visits (300 programs)', 'set operations', 'passes', 'result'],
    rows: [
      {
        method: 'worklist, postorder',
        isThisUnit: true,
        values: ['11,930 (1.40 per block)', '26,245', '·', 'equal to both referees on 300 of 300'],
        best: 1,
        verdict: 'the schedule that follows the facts backward',
      },
      {
        method: 'worklist, random order',
        values: ['25,872 (3.04 per block)', '58,337', '·', 'exact; 2.2× the visits'],
        verdict: 'same answer, more revisits',
      },
      {
        method: 'round robin, postorder',
        values: ['28,815 (3.39 per block)', '62,913', '903 (5 at most = depth + 2)', 'exact; the bound tight on 127 of 300'],
        best: 2,
        verdict: 'every block every pass, but bounded',
      },
      {
        method: 'round robin, reverse postorder',
        values: ['81,175 (9.55 per block)', '177,775', '2,156', 'exact, eventually: the forward order is wrong here'],
        verdict: 'direction is the whole game',
      },
      {
        method: 'single backward sweep, no iteration',
        values: ['8,497 (1 per block)', '18,482', '1', '5,287 facts missing; its dead-store pass broke 191 programs'],
        verdict: 'fast and unsound',
      },
    ],
    source:
      'python solutions/live_variable_analysis_backward_dataflow.py prints this table and asserts: the fixpoint equal to the reachability referee and to every enumerated simple path on all 300 programs; no set shrinking between visits; round robin within depth + 2 passes; the iterating solvers returning identical sets; visits ordered postorder < random < round robin < reversed; every program printing the same output before and after dead-store elimination on 30 executions; the chromatic number at least the largest live set; the single sweep missing facts and breaking programs.',
  },

  figure: (
    <Figure
      id="fig-live-variables"
      aspect="16 / 7"
      caption="A loop in four blocks, solved backward. The head B1 reads y, so y is live through the body B2 along the back edge, and the body's store y = 3 is live. After one backward sweep in postorder (B2 before B1) the body saw OUT = {} and would delete that store; pass two carries {x, y} around. Right: block visits per block over the 300 programs by schedule."
      cite={{
        text: 'G. A. Kildall, "A unified approach to global program optimization," POPL 1973. K. Kennedy, "A survey of data flow analysis techniques," 1979. G. J. Chaitin, "Register allocation and spilling via graph coloring," 1982. Aho, Lam, Sethi, Ullman, Compilers, section 9.2.5.',
        href: 'https://doi.org/10.1145/512927.512945',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A four-block loop with the live sets after each backward pass, beside block visits per block for five schedules">
        {(() => {
          const blocks = [
            ['B0', 'x = in; y = in', 40, 22, 110],
            ['B1', 'if y', 40, 78, 110],
            ['B2', 'x = x + 1; y = 3', 200, 78, 140],
            ['B3', 'print x', 40, 134, 110],
          ];
          const rows = [
            ['worklist, postorder', '1.40', '#5da2ff'],
            ['worklist, random order', '3.04', '#9aa5bd'],
            ['round robin, postorder', '3.39', '#f0b94b'],
            ['round robin, reverse postorder', '9.55', '#9aa5bd'],
            ['one sweep (unsound)', '1.00', '#e2606c'],
          ];
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="14" y="12" fill="#9aa5bd" fontSize="10">liveness flows backward; the back edge (amber) carries the head&apos;s reads into the body</text>
              {blocks.map(([id, txt, x, y, w]) => (
                <g key={id}>
                  <rect x={x} y={y} width={w} height="30" rx="4" fill="none" stroke="#9aa5bd" strokeWidth="1" />
                  <text x={x + 6} y={y + 12} fill="#e9edf6" fontSize="9">{id}</text>
                  <text x={x + 6} y={y + 24} fill="#9aa5bd" fontSize="8">{txt}</text>
                </g>
              ))}
              <path d="M 95 52 V 78 M 150 93 H 200 M 95 108 V 134" fill="none" stroke="#5da2ff" strokeWidth="1.2" />
              <path d="M 270 78 C 270 50, 130 50, 130 78" fill="none" stroke="#f0b94b" strokeWidth="1.4" />
              <text x="160" y="60" fill="#f0b94b" fontSize="8">back edge B2 to B1</text>
              <text x="40" y="186" fill="#9aa5bd" fontSize="9">pass 1 (postorder B2, B3, B1, B0): OUT[B2] = {'{}'}, so y = 3 looks dead</text>
              <text x="40" y="202" fill="#62d98a" fontSize="9">pass 2: OUT[B2] = IN[B1] = {'{x, y}'}; the store is live, IN[B2] = {'{x}'}</text>
              <text x="40" y="218" fill="#e2606c" fontSize="9">one sweep deletes y = 3; the head then reads a stale y and loops on</text>
              <text x="400" y="12" fill="#9aa5bd" fontSize="10">block visits per block, 300 programs</text>
              {rows.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x="400" y={28 + i * 22} width={Number(v) * 18} height="12" fill={c} fillOpacity="0.85" />
                  <text x={406 + Number(v) * 18} y={38 + i * 22} fill={c} fontSize="9">{v}</text>
                  <text x="400" y={48 + i * 22} fill="#9aa5bd" fontSize="7">{name}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'live_variable_analysis_backward_dataflow.py',
  Viz: LiveVariablesViz,
  narration,
};
