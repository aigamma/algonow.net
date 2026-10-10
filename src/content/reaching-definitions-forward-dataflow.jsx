import ReachingDefinitionsViz from '../viz/ReachingDefinitionsViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/reaching_definitions_forward_dataflow.py?raw';
import { narration } from './reaching-definitions-forward-dataflow.narration.js';

export const content = {
  given:
    'A program as a control-flow graph: basic blocks of assignments joined by branches and loops. For every block, which assignments anywhere in the program might be the one that last wrote each variable when control arrives? Every optimizer asks this first.',
  task: 'Reaching definitions. The algorithm (Kildall 1973): each block has gen, its last write of each variable, and kill, every other definition of those variables; IN[B] is the union of OUT over the predecessors and OUT[B] = gen[B] ∪ (IN[B] − kill[B]); iterate until nothing changes. The heuristic is forward dataflow on a worklist in reverse postorder: process blocks in the direction the facts flow and revisit a successor only when its input changed. Union distributes over these transfer functions, so the fixpoint equals the meet over all paths: exact for the graph, with the loop depth bounding the passes.',
  constraint:
    'Measured: 300 random structured programs (if/else and while nested to depth 3; 12,815 blocks, 23,841 definitions). The worklist fixpoint equals two independent referees on all 300: a per-definition reachability search and the exhaustive union over every walk from the entry visiting no block more than twice (8,462,078 walks). Sets never shrank; round robin in reverse postorder converged within depth + 2 passes on every program (5 at most). Block visits: 24,767 for the worklist in reverse postorder against 46,833 for round robin and 171,343 against the flow. In 120 executions per program, all 18,405 observed use-def pairs were inside the chains allowed and none of the 8,200 flagged dead stores was read. A single sweep without iteration missed 26,421 facts and was wrong on all 224 looping programs.',

  origins: (
    <p>
      Frances Allen and John Cocke built global dataflow analysis for the IBM
      optimizing compilers (Allen, <strong>1970</strong>, &quot;Control flow
      analysis&quot;; Allen and Cocke, 1976), with reaching definitions, live
      variables, and available expressions as bit vectors over the blocks.
      Gary Kildall (POPL <strong>1973</strong>) unified them: a lattice of
      facts, a monotone transfer function per block, a meet at every join,
      and one iterative algorithm reaching the least fixpoint, which equals
      the meet over all paths when the functions distribute over the meet.
      Hecht and Ullman (1975) and Kam and Ullman (1976) tied the round-robin
      pass count in reverse postorder to the loop-connectedness of the graph;
      Kam and Ullman (1977) showed that for merely monotone frameworks the
      fixpoint is safe but can be weaker than the meet over all paths. The
      Dragon Book&apos;s chapter 9 is the textbook form. Liveness, the
      backward twin, feeds the interference graph of puzzle 162 on this site.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>equations</strong>: gen and kill per block, union at
      every join, OUT = gen ∪ (IN − kill), and the claim that the least
      solution is the exact meet over all paths. The referees never form a
      set equation: a per-definition forward search, and the exhaustive union
      over <strong>8,462,078 walks</strong> visiting no block more than twice
      (a reaching fact&apos;s witness is a simple path to the defining block
      followed by a simple path onward, so two visits suffice); both equal
      the fixpoint on 300 of 300 programs. On top sit use-def chains (a
      block&apos;s last local write, else IN&apos;s definitions of the
      variable) and dead stores (definitions in no chain): executions
      confirmed 18,405 pairs and found none of the 8,200 dead stores read.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>schedule</strong>: forward, because the facts flow
      forward; reverse postorder, so every block is processed after the
      blocks that feed it and only back edges carry stale information; a
      worklist, so a block is revisited only when a predecessor&apos;s OUT
      changed. Over 12,815 blocks: <strong>24,767 visits</strong>, 1.93 per
      block, against 38,379 for a random worklist order, 46,833 for round
      robin in reverse postorder, and 171,343 for round robin against the
      flow; round robin in reverse postorder stayed within depth + 2 passes
      on every program (5 at most, tight on 257). The honest edge: 20 of 300
      programs were no worse under the random order, because a shallow graph
      converges in one sweep whatever the order.
    </p>
  ),

  picture: (
    <p>
      A building of rooms joined by one-way corridors, and in each room a
      whiteboard per variable that someone may overwrite. A reaching
      definition is a sticky note, &quot;b here may have been written in room
      7,&quot; carried along every corridor out of the room. A room that
      rewrites b throws away every b note it received and sends its own. A
      loop corridor carries notes back to a room already visited, which is
      why one walk through the building is not enough. The clerk walks the
      rooms in corridor order, delivers to a room again only when its mail
      changed, and stops when a full round delivers nothing new. The final
      boards hold exactly the notes some path could have carried.
    </p>
  ),

  steps: [
    <>
      <strong>Number the blocks:</strong> depth-first search from the entry,
      reverse the finishing order; forward edges go up the numbering, only
      loop back edges go down.
    </>,
    <>
      <strong>Gen and kill per block:</strong> gen is the last write of each
      variable in the block; kill is every other definition of those
      variables anywhere in the program.
    </>,
    <>
      <strong>Seed:</strong> IN and OUT empty everywhere; the worklist holds
      every block in reverse postorder.
    </>,
    <>
      <strong>Pop and transfer:</strong> IN = union of the predecessors&apos;
      OUT; OUT = gen ∪ (IN − kill); if OUT changed, push each successor not
      already queued.
    </>,
    <>
      <strong>Read the answer:</strong> a use is reached by its block&apos;s
      last local write or by IN&apos;s definitions of its variable; a
      definition reaching no use is a dead store.
    </>,
  ],

  signals: [
    <>
      <strong>Facts that travel with control and merge by union:</strong>{' '}
      what may reach, may alias, may be uninitialized; every &quot;may&quot;
      question has this shape.
    </>,
    <>
      <strong>A graph with loops:</strong> a loop-carried assignment reaches
      the head only on the second visit; one sweep was wrong on 224 of 224
      looping programs.
    </>,
    <>
      <strong>Optimizations that need provenance per use:</strong> constant
      and copy propagation, dead-store elimination, SSA construction,
      &quot;may be used before set&quot; diagnostics.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>round robin</strong>: sweep every block
      in reverse postorder until a pass changes nothing. Exact and bounded by
      depth + 2 passes (5 here), at 46,833 visits to the worklist&apos;s
      24,767; swept against the flow it needs 171,343 visits and up to 22
      passes.
    </>
  ),

  strength: (
    <>
      <strong>Exact for the graph, at about two visits per block.</strong>{' '}
      Equal to a per-definition search and to 8,462,078 enumerated walks on
      300 of 300 programs; all 18,405 executed use-def pairs allowed; all
      8,200 flagged dead stores unread; 24,767 visits over 12,815 blocks.
    </>
  ),
  weakness: (
    <>
      <strong>Exact for the graph, not for the program.</strong> It believes
      every path the edges allow: 120 executions exercised 44.9% of the
      40,971 chains it admits, and 7,453 definitions never read in any run
      could not be ruled out, because conditions and values are invisible to
      it. Sets grow as blocks × definitions (87,308 facts), it says nothing
      about values, and it stops at the procedure boundary.
    </>
  ),

  problem: 'Dataflow analysis',
  problemSlug: 'dataflow-analysis',
  rivals: [
    {
      name: 'Reaching definitions × Forward dataflow',
      isThisUnit: true,
      algoName: 'Reaching definitions',
      cost: 'O(blocks × depth) visits, a set union per edge',
      wins: (
        <>
          <strong>Exact meet over all paths</strong>, 1.93 visits per block,
          within depth + 2 passes; use-def chains and dead stores fall out.
        </>
      ),
      costs: (
        <>
          Path-insensitive and value-blind: 44.9% of its chains were ever
          exercised; sets of size blocks × definitions.
        </>
      ),
      when: 'The first analysis of any optimizer: provenance for every use before constants, copies, or dead stores are touched.',
    },
    {
      name: 'Live variable analysis',
      algoName: 'Live variable analysis',
      cost: 'O(blocks × depth) visits, backward',
      wins: (
        <>
          The same engine run <strong>backward</strong>: IN = use ∪ (OUT −
          def), OUT the union over successors, in postorder; it answers
          &quot;will this value be read again?&quot; directly.
        </>
      ),
      costs: (
        <>
          A different question (futures, not pasts); its own iteration; no
          provenance for a use.
        </>
      ),
      when: 'When the question is about the future of a value: register allocation and the interference graph (puzzle 162), dead-code elimination.',
    },
    {
      name: 'Available expressions',
      algoName: 'Available expressions',
      cost: 'O(blocks × depth) visits, intersection meet',
      wins: (
        <>
          Forward like this unit but a <strong>must</strong> analysis: the
          meet is intersection, seeded with every expression, so a fact
          survives a join only if every path computed it; the input to
          common-subexpression elimination.
        </>
      ),
      costs: (
        <>
          Loses facts at every join where one path lacks them; seeded with
          the empty set instead of the universal one, the answer is wrong.
        </>
      ),
      when: 'Redundant computation: an expression already evaluated on every path can be reused instead of recomputed.',
    },
    {
      name: 'Constant propagation',
      algoName: 'Constant propagation',
      cost: 'O(blocks × variables × lattice height) visits',
      wins: (
        <>
          Carries <strong>values</strong>, not definitions: each variable is
          undefined, a constant, or not-a-constant, and expressions fold as
          the facts arrive.
        </>
      ),
      costs: (
        <>
          Not distributive: the fixpoint is safe but can be weaker than the
          meet over all paths, so the exactness proved here does not
          transfer; sparse conditional constant propagation is the modern
          form.
        </>
      ),
      when: 'When you need the values that reach a use, after reaching definitions tells you where they come from.',
    },
  ],
  neverUse: {
    name: 'A single forward sweep that never revisits a block',
    why: (
      <>
        One pass in reverse postorder looks like the analysis and runs at
        one visit per block, but a definition inside a loop body reaches the
        loop head only along the back edge, processed after the head was
        already visited. Measured: <strong>26,421 reaching facts missing</strong>,
        wrong on every one of the 224 programs with a loop, and 4,005 use-def
        pairs that real executions took were denied on 163 programs. An
        optimizer trusting it would fold a loop-carried variable to its
        initial constant or delete the store that feeds the next iteration,
        to save 0.93 visits per block.
      </>
    ),
  },

  contest: {
    instance:
      '300 random structured programs (if/else and while nested to depth 3; 12,815 blocks); referees: a per-definition search, the exhaustive union over 8,462,078 bounded walks, 120 executions per program, the depth + 2 pass bound; one currency: block visits and set operations',
    columns: ['block visits (300 programs)', 'set operations', 'passes', 'result'],
    rows: [
      {
        method: 'worklist, reverse postorder',
        isThisUnit: true,
        values: ['24,767 (1.93 per block)', '79,058', '·', 'equal to both referees on 300 of 300'],
        best: 1,
        verdict: 'the schedule that follows the flow',
      },
      {
        method: 'worklist, random order',
        values: ['38,379 (2.99 per block)', '123,078', '·', 'exact; worst program 2.8× the visits'],
        verdict: 'same answer, more revisits',
      },
      {
        method: 'round robin, reverse postorder',
        values: ['46,833 (3.65 per block)', '147,363', '982 (5 at most = depth + 2)', 'exact; the bound tight on 257 of 300'],
        best: 2,
        verdict: 'every block every pass, but bounded',
      },
      {
        method: 'round robin, against the flow',
        values: ['171,343 (13.4 per block)', '539,561', '3,105 (22 at most)', 'exact, eventually'],
        verdict: 'the order is the whole game',
      },
      {
        method: 'single forward sweep, no iteration',
        values: ['12,815 (1 per block)', '·', '1', '26,421 facts missing; wrong on all 224 looping programs; 4,005 executed pairs denied'],
        verdict: 'fast and unsound',
      },
    ],
    source:
      'python solutions/reaching_definitions_forward_dataflow.py prints this table and asserts: the fixpoint equal to both referees on all 300 programs; no set shrinking between passes; round robin within depth + 2 passes; the iterating solvers returning identical sets; visits strictly ordered reverse postorder < random < round robin < against the flow; every executed use-def pair inside the analysis and no flagged dead store read; the single sweep missing facts.',
  },

  figure: (
    <Figure
      id="fig-reaching-definitions"
      aspect="16 / 7"
      caption="A loop in five blocks. After one sweep in reverse postorder the head B1 and the exit B3 know only the entry's a0 and b0; the body's a2 and b2 arrive along the back edge on the second pass, so a single sweep would fold c = a to the constant 1. Right: block visits per block over the 300 programs by schedule."
      cite={{
        text: 'G. A. Kildall, "A unified approach to global program optimization," POPL 1973. M. S. Hecht and J. D. Ullman, SIAM J. Computing 1975. J. B. Kam and J. D. Ullman, Acta Informatica 1977. Aho, Lam, Sethi, Ullman, Compilers, chapter 9.',
        href: 'https://doi.org/10.1145/512927.512945',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A five-block loop with the reaching definition sets after each pass, beside block visits per block for five schedules">
        {(() => {
          const blocks = [
            ['B0', 'a0: a = 1; b0: b = 2', 40, 22, 100],
            ['B1', 'if b', 40, 78, 100],
            ['B2', 'a2: a = a + b; b2: b = b - 1', 190, 78, 150],
            ['B3', 'c = a', 40, 134, 100],
            ['B4', 'print c', 40, 190, 100],
          ];
          const rows = [
            ['worklist, reverse postorder', '1.93', '#5da2ff'],
            ['worklist, random order', '2.99', '#9aa5bd'],
            ['round robin, reverse postorder', '3.65', '#f0b94b'],
            ['round robin, against the flow', '13.4', '#9aa5bd'],
            ['one sweep (unsound)', '1.00', '#e2606c'],
          ];
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="14" y="12" fill="#9aa5bd" fontSize="10">a loop: definitions carried around the back edge (amber)</text>
              {blocks.map(([id, txt, x, y, w]) => (
                <g key={id}>
                  <rect x={x} y={y} width={w} height="30" rx="4" fill="none" stroke="#9aa5bd" strokeWidth="1" />
                  <text x={x + 6} y={y + 12} fill="#e9edf6" fontSize="9">{id}</text>
                  <text x={x + 6} y={y + 24} fill="#9aa5bd" fontSize="8">{txt}</text>
                </g>
              ))}
              <path d="M 90 52 V 78 M 140 93 H 190 M 90 108 V 134 M 90 164 V 190" fill="none" stroke="#5da2ff" strokeWidth="1.2" />
              <path d="M 265 78 C 265 50, 120 50, 120 78" fill="none" stroke="#f0b94b" strokeWidth="1.4" />
              <text x="150" y="60" fill="#f0b94b" fontSize="8">back edge B2 to B1</text>
              <text x="150" y="134" fill="#9aa5bd" fontSize="9">IN[B1] and IN[B3] after pass 1: {'{a0, b0}'}</text>
              <text x="150" y="150" fill="#62d98a" fontSize="9">after pass 2: {'{a0, b0, a2, b2}'}; pass 3 changes nothing</text>
              <text x="150" y="172" fill="#e2606c" fontSize="9">one sweep stops after pass 1: c = a folds to 1, wrong</text>
              <text x="400" y="12" fill="#9aa5bd" fontSize="10">block visits per block, 300 programs</text>
              {rows.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x="400" y={28 + i * 22} width={Number(v) * 13} height="12" fill={c} fillOpacity="0.85" />
                  <text x={406 + Number(v) * 13} y={38 + i * 22} fill={c} fontSize="9">{v}</text>
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
  filename: 'reaching_definitions_forward_dataflow.py',
  Viz: ReachingDefinitionsViz,
  narration,
};
