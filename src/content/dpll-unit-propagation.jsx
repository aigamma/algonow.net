import DPLLViz from '../viz/DPLLViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dpll_unit_propagation.py?raw';
import { narration } from './dpll-unit-propagation.narration.js';

export const content = {
  given:
    'A Boolean formula in clauses: the first problem ever proven NP-complete, and the one industry decided to solve anyway.',
  task: 'Decide satisfiability: find a model or prove none exists: by backtracking search that deduces everything it can between guesses.',
  constraint:
    'Exhaustion over all 2ⁿ assignments referees 250 instances (197 SAT, 53 UNSAT): verdicts must match exactly and every model is re-checked clause by clause. The ablation is controlled: both arms branch identically, one propagates and one only guesses, so the measured 7× belongs to unit propagation alone.',

  origins: (
    <p>
      Martin Davis and Hilary Putnam&apos;s 1960 procedure eliminated
      variables by resolution and drowned in the clauses it
      generated. Two years later Davis, George Logemann, and Donald
      Loveland replaced elimination with <strong>backtracking
      search</strong> (CACM <strong>1962</strong>): guess a variable,
      simplify, undo on conflict: and kept one deduction rule as the
      engine: the unit clause. DPLL is the trunk of the SAT family
      tree: CDCL grafted clause learning onto it in the 1990s and
      modern solvers took industrial verification by storm. The
      1990s also found its <em>physics</em>: random 3-SAT flips from
      almost-surely-satisfiable to almost-surely-not near 4.26
      clauses per variable, and search difficulty spikes exactly at
      the boundary: measured on this page, not recited.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>complete search</strong>: pick an unassigned
      variable (here: most frequent literal among the shortest live
      clauses, identical in both experiment arms), try a value,
      recurse, and on conflict undo the trail and try the opposite.
      Completeness is the point: an exhausted tree is a{' '}
      <strong>proof of UNSAT</strong>, which is why DPLL answers
      questions local search cannot: this page proves a 53-instance
      UNSAT docket, pigeonhole&apos;s impossibility, and the
      Petersen graph&apos;s 2-uncolorability, all by the same
      machinery that finds models.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>deduction between guesses</strong>: when a
      clause has every literal false but one, that survivor is
      forced: assign it, and the assignment may reduce other clauses
      to units: a cascade. Each forced literal is a free inference:
      a whole subtree that will never be searched. Same instances,
      same branching, propagation off: <strong>2,306 nodes</strong>;
      propagation on: <strong>343</strong>: 7× from the one rule.
      Every forced literal is audited at force time: all other
      literals in its clause false, asserted.
    </p>
  ),

  picture: (
    <p>
      Sudoku players know this loop by heart. A guess in one cell
      (the decision) makes some row need exactly one digit in
      exactly one place: write it in (the forced move): and that
      entry forces another, and another: a cascade of pencil-free
      certainties rippling out from a single guess. Only when the
      cascade dries up do you guess again. Play the same puzzle
      refusing to write forced moves: guess every cell, notice
      contradictions late, erase mountains of work: the same rules,
      several times the labor. DPLL is exactly this discipline
      applied to logic: guess rarely, deduce greedily, and let each
      contradiction cancel an entire subtree of futures at once.
    </p>
  ),

  steps: [
    <>
      <strong>Propagate:</strong> while any clause has one live
      literal left, that literal is forced: assign it, extend the
      cascade (audited: all other literals false at force time).
    </>,
    <>
      <strong>Check:</strong> a clause with every literal false is a
      conflict: undo the trail, flip the last decision.
    </>,
    <>
      <strong>Decide:</strong> all quiet and clauses remain: branch
      on the most frequent literal among the shortest clauses, and
      recurse.
    </>,
    <>
      <strong>Terminate honestly:</strong> all clauses satisfied is
      SAT with a checkable model; an exhausted tree is a proof of
      UNSAT: completeness is the feature.
    </>,
    <>
      <strong>Know the landscape:</strong> difficulty is not
      uniform: it spikes at the SAT/UNSAT boundary (524 mean
      decisions at m/n = 4.26 vs 56 and 154 at the easy edges,
      measured at n = 90).
    </>,
  ],

  signals: [
    <>
      <strong>The answer must be trusted both ways:</strong>{' '}
      verification, planning, dependency solving need UNSAT proven,
      not just models found: complete search or nothing.
    </>,
    <>
      <strong>Your problem encodes to clauses:</strong> coloring,
      scheduling, circuit equivalence: this page 3-colors the
      Petersen graph through 85 clauses and decodes the model back.
    </>,
    <>
      <strong>Constraint cascades exist:</strong> if one commitment
      forces others, propagation converts guessing into deduction:
      the same instinct as AC-3, Sudoku, and type inference.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>truth-table exhaustion</strong>:
      all 2ⁿ assignments, exact, and this page&apos;s referee at
      n ≤ 13: 8,192 rows it checks without complaint, 2⁹⁰ it never
      could. The instructive middle is <strong>backtracking without
      propagation</strong>: same branching, guesses only: 7× the
      nodes: the distance between enumeration and deduction.
    </>
  ),

  strength: (
    <>
      <strong>A complete solver whose every claim is refereed.</strong>{' '}
      250 verdicts identical to exhaustion with models re-checked
      clause by clause; the ablation controlled so the 7× is
      propagation&apos;s alone; the phase transition measured (SAT
      fraction 100% → 60% → 0% through m/n = 4.26 while difficulty
      spikes 524 vs 56); pigeonhole&apos;s impossibility and a
      verified Petersen 3-coloring from the same code path; and
      every forced literal audited at force time.
    </>
  ),
  weakness: (
    <>
      <strong>Exponential where it hurts, and proud of it.</strong>{' '}
      PHP(6,5): six pigeons, five holes, obviously impossible: costs
      748 decisions of grinding, because search without clause
      learning re-discovers the same dead ends: the gap CDCL was
      born to close (learned clauses turn each conflict into a
      permanent theorem). At the threshold the spike is exponential
      in n: no branching rule repeals it: and pure DPLL re-solves
      structure it has already refuted elsewhere in the tree. When
      clauses are all binary, this machinery is overkill squared:
      2-SAT falls to implication-graph SCCs in linear time.
    </>
  ),

  problem: 'Boolean satisfiability',
  problemSlug: 'boolean-satisfiability',
  rivals: [
    {
      name: 'DPLL × unit propagation',
      isThisUnit: true,
      algoName: 'DPLL',
      cost: 'exponential worst case',
      wins: (
        <>
          <strong>Complete and transparent</strong>: models found,
          UNSAT proven, every inference auditable: the trunk of the
          SAT family tree.
        </>
      ),
      costs: (
        <>
          Forgets every conflict it resolves: pigeonhole&apos;s 748
          decisions are the bill for searching without learning.
        </>
      ),
      when: 'Teaching, small-to-medium encodings, and as the skeleton every modern solver still wears.',
    },
    {
      name: 'CDCL × VSIDS',
      algoName: 'CDCL',
      cost: 'exponential, far later',
      wins: (
        <>
          The descendant that ate industry: each conflict becomes a
          learned clause (a permanent theorem), VSIDS steers
          branching toward the fight, restarts escape bad prefixes:
          millions of variables in practice.
        </>
      ),
      costs: (
        <>
          Engineering mass: watched literals, clause databases,
          decay schedules: the transparency of this page traded for
          three orders of magnitude.
        </>
      ),
      when: 'Any SAT instance you did not write by hand: verification, scheduling, dependency resolution.',
    },
    {
      name: 'WalkSAT × random flips',
      algoName: 'WalkSAT',
      cost: 'O(flips), incomplete',
      wins: (
        <>
          Local search: start random, flip a variable in an unsatisfied
          clause, repeat: often finds models on huge satisfiable
          instances where tree search stalls.
        </>
      ),
      costs: (
        <>
          Incomplete: silence proves nothing: a million flips
          without a model is not an UNSAT proof, it is a shrug.
        </>
      ),
      when: 'Satisfiable-heavy workloads (planning, configuration) where a model is the only deliverable.',
    },
    {
      name: '2-SAT × implication SCC',
      algoName: '2-SAT via implication SCC',
      cost: 'O(n + m)',
      wins: (
        <>
          When every clause has two literals, (a ∨ b) is two
          implications: build the graph, find strongly connected
          components: satisfiable iff no variable shares a component
          with its negation: linear time, exact.
        </>
      ),
      costs: (
        <>
          Three literals anywhere and the trapdoor slams shut: the
          structure is the whole trick.
        </>
      ),
      when: 'Binary constraints only: recognize the special case before paying the general price.',
    },
  ],
  neverUse: {
    name: 'WalkSAT asked to prove UNSAT',
    why: (
      <>
        An incomplete solver on a completeness question. WalkSAT is
        a fine rival on the SAT half: but run it on this
        page&apos;s pigeonhole formula and it flips forever,
        learning nothing, proving nothing: no amount of silence is
        evidence of impossibility, because the algorithm has no
        notion of an exhausted search space. Shipping
        &quot;probably unsatisfiable: we looked hard&quot; where a
        proof was required is the same sin as reading one Karger
        run as the min cut or trusting Space-Saving&apos;s
        placeholder counters: mistaking absence of a witness for a
        certificate. The question &quot;can this be proven
        impossible?&quot; is structural, and only complete search
        (this page) or learning search (CDCL) can answer it.
      </>
    ),
  },

  contest: {
    instance:
      'boolean satisfiability; referee: exhaustion over all 2ⁿ assignments on 250 instances (197 SAT, 53 UNSAT), verdicts identical, every model re-checked',
    columns: ['decisions', 'nature'],
    rows: [
      {
        method: 'Truth-table exhaustion',
        values: ['2ⁿ', 'exact'],
        verdict: 'the referee: 8,192 rows at n = 13, unthinkable at n = 90',
      },
      {
        method: 'Backtracking, no UP',
        values: ['2,306', 'complete'],
        verdict: 'same branching rule, guesses only: the control arm',
      },
      {
        method: 'DPLL with unit propagation',
        isThisUnit: true,
        values: ['343', 'complete'],
        best: 0,
        verdict: '7× fewer nodes from one deduction rule: the cascade is the solver',
      },
    ],
    source:
      "python solutions/dpll_unit_propagation.py prints this table and asserts: 250 verdicts equal to 2ⁿ exhaustion with every SAT model re-checked clause by clause; the controlled ablation above 3× (measured 7×: 2,306 vs 343 decisions on 30 near-threshold instances, branching identical in both arms); every forced literal audited at force time (all other literals in its clause false); the phase transition at n = 90 (SAT fraction 100% / 100% / 100% / 60% / 0% / 0% across m/n = 2, 3, 3.8, 4.26, 5, 6, weakly monotone, with mean decisions 56 / 43 / 131 / 524 / 349 / 154 peaking at 4.26, more than 3× both easy edges); PHP(6,5) UNSAT in 748 decisions with the satisfiable PHP(5,5) control passing; and the Petersen graph 3-colored via 85 clauses with the decoded coloring verified on all 15 edges, 2 colors proven impossible.",
  },

  figure: (
    <Figure
      id="fig-dpll-phase"
      aspect="16 / 7"
      caption="The easy-hard-easy signature, measured at n = 90 with 45 instances per ratio. Sparse formulas are easy yeses; dense ones are easy nos; the boundary near 4.26 clauses per variable is where the SAT fraction collapses (100% to 60% to 0%) and search cost spikes: 524 mean decisions against 56 and 154 at the edges. Hardness is not about size: these instances are all the same size: it lives at the boundary between yes and no, where formulas are maximally undecided and every wrong guess survives longest before contradiction."
      cite={{
        text: 'Davis, Logemann & Loveland, "A Machine Program for Theorem-Proving", CACM 5(7), 1962: backtracking replaces resolution, the unit rule stays. The threshold physics entered with the 1990s random 3-SAT studies.',
        href: 'https://doi.org/10.1145/368273.368557',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Bar chart: mean decisions across clause-to-variable ratios, spiking at 4.26 where the SAT fraction collapses">
        {[
          [2.0, 55.6, 100],
          [3.0, 43.2, 100],
          [3.8, 131.2, 100],
          [4.26, 524.4, 60],
          [5.0, 349.2, 0],
          [6.0, 153.6, 0],
        ].map(([r, d, sat], i) => {
          const x = 70 + i * 92;
          const h = (d / 524.4) * 170;
          const hot = r === 4.26;
          return (
            <g key={i}>
              <rect x={x} y={220 - h} width={52} height={h} fill={hot ? 'rgba(226,96,108,0.5)' : 'rgba(93,162,255,0.4)'} stroke={hot ? '#e2606c' : '#5da2ff'} strokeWidth="1.6" />
              <text x={x + 2} y={212 - h} fill={hot ? '#e2606c' : '#5da2ff'} fontFamily="ui-monospace, monospace" fontSize="11">{Math.round(d)}</text>
              <text x={x + 4} y={238} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{r}</text>
              <text x={x + 4} y={256} fill={sat > 50 ? '#62d98a' : '#e2606c'} fontFamily="ui-monospace, monospace" fontSize="10">{sat}% SAT</text>
            </g>
          );
        })}
        <text x="70" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">mean decisions at n = 90, by clauses per variable</text>
        <text x="330" y="60" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the spike sits where yes turns to no</text>
        <text x="70" y="280" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">m/n ratio · green/red row: fraction satisfiable · easy-hard-easy</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'dpll_unit_propagation.py',
  Viz: DPLLViz,
  narration,
};
