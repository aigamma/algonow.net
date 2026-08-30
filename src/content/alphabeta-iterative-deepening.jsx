import AlphaBetaIDViz from '../viz/AlphaBetaIDViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/alphabeta_iterative_deepening.py?raw';
import { narration } from './alphabeta-iterative-deepening.narration.js';

export const content = {
  given:
    'A game tree of branching 8 and depth 8: about 19 million leaves: and an alpha-beta searcher whose entire power depends on which move it happens to try first at every node.',
  task: 'Search depth 1, then 2, then 3, up to the target: each iteration remembers every node’s best move and feeds a per-ply history table, so the next, deeper iteration tries yesterday’s answers first and cuts almost immediately.',
  constraint:
    'Exhaustive minimax referees depth 6 exactly (40 random trees plus the contest tree); at depth 8, three adversarial orderings must agree. The paradox is asserted, not narrated: all six ID iterations together cost 3,940 nodes against one blind depth-6 search’s 14,004: and with oracle ordering the Knuth-Moore floor is hit exactly: 431 leaves against the formula’s 431.',

  origins: (
    <p>
      Alpha-beta&apos;s cutoff idea circulated through the 1950s
      chess efforts (McCarthy, Newell-Shaw-Simon), but the
      subject became a science with <strong>Knuth and
      Moore&apos;s 1975 analysis</strong>: with best-first
      ordering, alpha-beta examines b^⌈d/2⌉ + b^⌊d/2⌋ - 1
      leaves: the <em>square root</em> of the tree: and this
      page&apos;s oracle-ordered run hits that formula exactly,
      431 against 431. The heuristic half arrived in working
      code: Slate and Atkin&apos;s Chess 4.5 (1977) searched
      iteratively deeper and reused each iteration&apos;s best
      moves to order the next: heresy on paper, decisive in
      play: and Korf&apos;s 1985 analysis proved the repeated
      shallow searches cost only a constant factor. Every
      serious engine since: Deep Blue through Stockfish: is an
      elaboration of this pair: deepen, remember, order, cut.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>window and the cutoff</strong>: negamax
      with an (α, β) interval; a child&apos;s refutation that
      lifts α to β proves the whole remaining sibling list
      irrelevant: unopened, and provably so. Correctness is
      ordering-independent and this page leans on that twice:
      exhaustive minimax confirms the exact root value on 40
      random trees and the depth-6 contest, and at depth 8:
      where the full tree is ~19 million nodes: three
      adversarial orderings (random, reversed, ID) agree on the
      value, which is the referee exhaustion cannot be.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>order</strong>, which is everything:
      the same cutoff machinery visits 14,004 nodes with random
      ordering and 431 leaves with perfect ordering (the
      Knuth-Moore floor, hit exactly). Iterative deepening
      manufactures near-perfect order from cheap searches: each
      iteration&apos;s best-move table puts yesterday&apos;s
      answer first, and a per-ply history table (cutoff-causing
      moves rise) orders the rest. Measured: the final iteration
      alone cost 2,338 nodes: 17% of blind: riding the tables
      the shallow passes built, with cutoffs arriving at mean
      move index 0.53 against random&apos;s 1.38.
    </p>
  ),

  picture: (
    <p>
      Studying a chess position under a clock. The blind
      approach: stare eight moves deep immediately, considering
      replies in whatever order they occur to you: you spend
      most of the hour refuting nonsense, because you do not yet
      know which lines matter. The engine&apos;s approach feels
      wasteful and is not: think one move deep (instant), then
      two, then three, each pass shallow and quick: and carry
      forward, at every branch, <em>which reply looked best last
      pass</em>. By the deep passes you examine the critical
      reply first almost everywhere, and whole forests of
      alternatives die to a single refutation before being
      explored. The six quick studies plus the deep one cost
      less than the deep one alone would have: measured here,
      3,940 against 14,004: because the deep study without the
      shallow ones is a search without a guide. And there is a
      bonus the numbers do not show: when the clock stops early,
      the iterative thinker always has a complete answer from
      the last finished depth.
    </p>
  ),

  steps: [
    <>
      <strong>Search depth 1:</strong> trivial: and it already
      ranks the root moves.
    </>,
    <>
      <strong>Deepen with memory:</strong> at each node, try the
      previous iteration&apos;s best move first; order the rest
      by the per-ply history table.
    </>,
    <>
      <strong>Cut early:</strong> good first moves lift α to β
      almost immediately: mean cutoff index 0.53 vs
      random&apos;s 1.38, measured.
    </>,
    <>
      <strong>Repeat to the target:</strong> all six iterations
      totaled 3,940 nodes: under one blind search&apos;s 14,004:
      the paradox, asserted.
    </>,
    <>
      <strong>Bank the floor:</strong> perfect order reaches
      b^⌈d/2⌉ + b^⌊d/2⌋ - 1 exactly (431 = 431 here): ordering
      buys the square root of the tree.
    </>,
  ],

  signals: [
    <>
      <strong>Adversarial lookahead with a clock:</strong> chess,
      checkers, any turn-based game engine: the deepen-remember-
      order loop is the entire classical canon.
    </>,
    <>
      <strong>Anytime answers required:</strong> iterative
      deepening always holds a finished result from the last
      completed depth: interrupt it whenever the clock says.
    </>,
    <>
      <strong>Move quality correlates across positions:</strong>{' '}
      the model note that is really a signal: ordering knowledge
      transfers only when the domain has structure (this
      page&apos;s hash-random draft measurably killed the
      paradox).
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>exhaustive minimax</strong>:
      299,593 nodes at depth 6, every leaf, no judgment: and it
      is also the referee that certifies every faster number on
      this page. Alpha-beta with random ordering cuts that to
      14,004; ordering discipline cuts it to 3,940 including all
      the shallow passes. Same value, every time, by
      construction and by assertion.
    </>
  ),

  strength: (
    <>
      <strong>The square root of the tree, bought with
      memory.</strong> The Knuth-Moore floor was not
      approached but hit: 431 leaves against the formula&apos;s
      431 under oracle ordering: and the practical machinery
      gets close: at depth 8 the ID search paid 40,769 nodes
      against random ordering&apos;s 251,348 (16%), with all
      values referee-identical. The paradox is banked: six
      searches for less than the price of one, plus an anytime
      answer at every depth on the way.
    </>
  ),
  weakness: (
    <>
      <strong>Memory, correlation, and a horizon.</strong> The
      tables are the trick and the bill: best-move and history
      state per searched node (real engines cap transposition
      tables and evict). The whole dividend rests on move
      quality correlating across positions: this page&apos;s
      first draft used uncorrelated hash-random leaves and the
      paradox rightly vanished: no structure, nothing for
      ordering to learn. Fixed-depth search also inherits the
      horizon effect (a disaster one ply past the cutoff is
      invisible: engines bolt on quiescence search), and against
      truly enormous branching factors the whole alpha-beta
      family cedes to sampling: which is the MCTS unit&apos;s
      opening argument.
    </>
  ),

  problem: 'Game-tree search',
  problemSlug: 'game-tree-search',
  rivals: [
    {
      name: 'Alpha-beta × ID ordering',
      isThisUnit: true,
      algoName: 'Alpha-beta pruning',
      cost: '~b^(d/2) well-ordered',
      wins: (
        <>
          <strong>The engine canon</strong>: 3,940 nodes for six
          depths vs 14,004 for one blind: exact values, anytime
          answers, the floor hit at 431 = 431.
        </>
      ),
      costs: (
        <>
          Tables to store, correlation to rely on, and a horizon
          to fear one ply past the cutoff.
        </>
      ),
      when: 'Turn-based adversarial search with a clock: the classical default.',
    },
    {
      name: 'Minimax × α-β ordering',
      algoName: 'Minimax',
      cost: 'O(b^d) exhaustive',
      wins: (
        <>
          The live unit and this page&apos;s referee: the
          ground-truth value with no judgment required: and where
          alpha-beta&apos;s own ordering lesson begins.
        </>
      ),
      costs: (
        <>
          299,593 nodes where the ordered searcher paid 3,940:
          exhaustion does not scale past toy depths.
        </>
      ),
      when: 'Tiny trees, referee duty, or teaching the invariant everything else preserves.',
    },
    {
      name: 'Principal variation search',
      cost: 'null-window re-search',
      wins: (
        <>
          The refinement built ON this unit&apos;s ordering:
          search the first move fully, prove the rest inferior
          with zero-width windows: cheaper still when the
          ordering is as good as ID makes it.
        </>
      ),
      costs: (
        <>
          Re-searches on failure: with poor ordering it pays
          twice: it amplifies good ordering, never replaces it.
        </>
      ),
      when: 'On top of ID + tables in a real engine: the production stack.',
    },
    {
      name: 'Monte Carlo tree search',
      cost: 'sampling, no depth wall',
      wins: (
        <>
          The live unit: when branching explodes or evaluation
          is opaque (Go), abandon exhaustive logic for guided
          sampling: strength from playouts, not floors.
        </>
      ),
      costs: (
        <>
          No exact values, no proofs of inferiority: tactical
          precision traded for scalability.
        </>
      ),
      when: 'Huge branching, hard-to-evaluate states, or no cheap heuristic ordering.',
    },
  ],
  neverUse: {
    name: 'The single deep dive',
    why: (
      <>
        The intuitive plan: you want depth 6, so you search
        depth 6: once, no warm-up, no &quot;wasted&quot; shallow
        passes. Measured here at <strong>14,004 nodes against
        3,940 for all six iterations together</strong>: the
        thrifty-looking plan pays 3.6× because it does its
        deepest, most expensive search with its worst ordering,
        and ordering is worth the square root of the tree
        (431 = 431 at the floor). It also fails the clock:
        interrupted mid-search it has <em>nothing</em>, where
        the iterative engine always holds the last finished
        depth&apos;s answer. The instinct that repetition is
        waste is exactly backwards in search: the shallow passes
        are not overhead on the deep one: they are what makes
        the deep one affordable.
      </>
    ),
  },

  contest: {
    instance:
      'one currency (nodes visited); referees: exhaustive minimax at depth 6, three-way ordering agreement at depth 8 (b = 8, strongly ordered tree + noise)',
    columns: ['depth 6', 'depth 8'],
    rows: [
      {
        method: 'Exhaustive minimax',
        values: ['299,593', '~19.2M (skipped)'],
        verdict: 'every node, no judgment: the referee',
      },
      {
        method: 'Alpha-beta, random order',
        values: ['14,004', '251,348'],
        verdict: 'cutoffs, but late: mean cutoff index 1.38: ordering is everything',
      },
      {
        method: 'Alpha-beta + ID ordering (all depths 1..d summed)',
        isThisUnit: true,
        values: ['3,940', '40,769'],
        best: 0,
        verdict: 'the paradox: d searches < one blind search: the final pass alone was 17% of blind',
      },
    ],
    source:
      'python solutions/alphabeta_iterative_deepening.py prints this table and asserts: alpha-beta equal to exhaustive minimax on 40 random trees and the depth-6 contest under every ordering; three adversarial orderings agreeing at depth 8; the paradox (ID total 3,940 < blind 14,004, with the final iteration alone under 55% of blind); mean cutoff index 0.53 vs 1.38; the Knuth-Moore floor b^⌈d/2⌉ + b^⌊d/2⌋ - 1 hit exactly at 431 leaves under oracle ordering; and the model note enforced by history: a hash-random first draft (no cross-node correlation) measurably killed the paradox, and the strongly-ordered-plus-noise model that replaced it is stated in the file.',
  },

  figure: (
    <Figure
      id="fig-alphabeta-id"
      aspect="16 / 7"
      caption="Deepen, remember, order, cut. Each iteration's best-move table puts yesterday's answer first at every node and the per-ply history table orders the rest, so the deeper search cuts at mean move index 0.53 (random: 1.38) and whole sibling forests die unopened. All six iterations cost 3,940 nodes against one blind depth-6 search's 14,004: the paradox that repetition is cheaper than a single dive: and under oracle ordering the Knuth-Moore floor is hit exactly, 431 leaves against b^⌈d/2⌉ + b^⌊d/2⌋ - 1 = 431: ordering is worth the square root of the tree."
      cite={{
        text: 'D. E. Knuth, R. W. Moore, "An analysis of alpha-beta pruning," Artificial Intelligence 6(4), 1975. DOI 10.1016/0004-3702(75)90019-3. Iterative deepening in practice: Slate-Atkin, Chess 4.5 (1977); analysis: Korf 1985.',
        href: 'https://doi.org/10.1016/0004-3702(75)90019-3',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An iterative deepening ladder feeding move ordering into an alpha-beta search with large pruned regions">
        {[1, 2, 3, 4, 5, 6].map((d, i) => (
          <g key={d}>
            <rect x={40} y={30 + i * 26} width={Math.max(8, [2, 5, 10, 22, 60, 160][i] * 1.6)} height={16} fill="rgba(93,162,255,0.3)" stroke="#5da2ff" strokeWidth="1.2" />
            <text x={44 + Math.max(8, [2, 5, 10, 22, 60, 160][i] * 1.6)} y={42 + i * 26} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">depth {d}</text>
          </g>
        ))}
        <path d="M 60 46 v 130" stroke="#f0b94b" strokeWidth="1.4" markerEnd="" />
        <text x="66" y="120" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">best moves + history flow down</text>
        <text x="40" y="216" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">all six iterations: 3,940 nodes</text>
        <rect x={330} y={40} width={260} height={18} fill="rgba(226,96,108,0.25)" stroke="#e2606c" strokeWidth="1.4" />
        <text x={330} y={34} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">one blind depth-6 search: 14,004 nodes (3.6×)</text>
        <rect x={330} y={92} width={73} height={18} fill="rgba(98,217,138,0.3)" stroke="#62d98a" strokeWidth="1.4" />
        <text x={330} y={86} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">the final ID pass alone: 2,338 (17% of blind)</text>
        <text x="330" y="150" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">cutoff arrives at move index 0.53 vs 1.38:</text>
        <text x="330" y="164" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">yesterday&apos;s search is today&apos;s oracle</text>
        <text x="330" y="192" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">the floor, hit exactly: oracle order visits 431</text>
        <text x="330" y="206" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">leaves = b^⌈d/2⌉ + b^⌊d/2⌋ - 1 (Knuth-Moore)</text>
        <text x="40" y="248" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">depth 8: ID 40,769 vs random 251,348 (16%), values agreeing across three adversarial orderings</text>
        <text x="40" y="270" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the model note: on uncorrelated hash-random trees the paradox measurably dies: structure is the soil</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'alphabeta_iterative_deepening.py',
  Viz: AlphaBetaIDViz,
  narration,
};
