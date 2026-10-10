import Ac3Viz from '../viz/Ac3Viz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/maintaining_arc_consistency_ac3_propagation.py?raw';
import { narration } from './maintaining-arc-consistency-ac3-propagation.narration.js';

export const content = {
  given:
    'Variables with finite domains and constraints between pairs of them: a timetable, a Sudoku, a wiring plan. Find an assignment that satisfies every constraint, or prove that none exists, and do it without wandering through the dⁿ assignments that exist on paper.',
  task: 'Maintaining arc consistency. The algorithm is backtracking search with inference at every node: after each assignment, propagate before branching again, so a dead end is found where it is created instead of many levels deeper. The heuristic is AC-3 (Mackworth 1977): a queue of arcs (x, y); for each, delete from x’s domain every value with no supporting value left in y’s domain, and if anything was deleted, requeue every arc (z, x) into x. When the queue is empty the network is arc consistent: every surviving value has a partner in every neighbor. Run inside the search, this is MAC (Sabin and Freuder 1994), the result that contradicted the conventional wisdom that the cheaper forward checking must be better.',
  constraint:
    'Measured on random binary CSPs (25 variables, domain size 6, density 0.3, 12 instances per tightness) with every solution checked constraint by constraint and every finishing solver agreeing on satisfiability: at tightness 0.44, past the transition, MAC with minimum-remaining-values ordering refutes an instance in 6 nodes on average against 93 for forward checking and 9 for MAC with a static order, while chronological backtracking exhausts 200,000 nodes on 9 of 12 instances; at 0.30, where every instance is satisfiable, 33 nodes against 102 and 184,620 (11 unfinished). The propagation is the cost: 11,484 constraint checks against 2,231 for forward checking at 0.44. On 40 small instances enumerated exhaustively, six solver variants agreed with the enumeration on every one; AC-3 left every surviving value supported, was idempotent, and never removed a value from any solution; one run spent 1,670 checks against the e d³ bound of 35,856. On Sudoku, AC-3 alone solves the textbook easy puzzle with no search (11,356 checks); on a hard puzzle MAC takes 291 nodes to forward checking’s 498.',

  origins: (
    <p>
      Ugo Montanari (1974) framed constraint networks and their
      consistency; Alan Mackworth (<strong>1977</strong>, &quot;Consistency
      in networks of relations,&quot; Artificial Intelligence) gave AC-1
      through AC-3, and Mackworth and Freuder (1985) proved AC-3 runs in
      O(e d³). Mohr and Henderson&apos;s AC-4 (1986) reached the optimal
      O(e d²) with support counts; Bessière and Régin&apos;s AC-2001 (2001)
      got there with one remembered support per value. Haralick and
      Elliott (1980) had argued for forward checking as the right amount
      of lookahead; Daniel Sabin and Eugene Freuder (<strong>1994</strong>,
      &quot;Contradicting conventional wisdom in constraint
      satisfaction&quot;) showed that maintaining full arc consistency
      during search, MAC, wins on hard problems, and Bessière and Régin
      (1996) confirmed it at scale. Every constraint solver since
      (Gecode, OR-Tools CP-SAT, Choco, MiniZinc backends) propagates to a
      consistency level at every node; Norvig&apos;s Sudoku essay (2006) is
      the same idea in a hundred lines.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>search</strong>: choose a variable (fewest remaining
      values first), try each value, recurse, undo. The referee is
      threefold: every solution any solver returns is checked against
      every constraint; all solvers that finish must agree on
      satisfiability on every instance, and on 40 small instances an
      exhaustive enumeration of the dⁿ assignments agrees with all six
      variants. Without inference the search is honest and hopeless:
      chronological backtracking runs out a budget of{' '}
      <strong>200,000 nodes</strong> on 11 of 12 instances at tightness
      0.30 and 9 of 12 at 0.44.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>inference</strong>: AC-3&apos;s arc queue after every
      assignment. Measured: <strong>6 nodes</strong> per unsatisfiable
      instance at tightness 0.44 against 93 for forward checking (which
      prunes only the neighbors of the assigned variable, once) and 9 for
      MAC with a static order; 33 against 102 at 0.30 where every instance
      has a solution; a hard Sudoku in 291 nodes against 498, and the easy
      one with no search at all. The cost is on the other column: 11,484
      constraint checks per instance against 2,231, because the queue
      keeps running until nothing changes, and the theorem that bounds it
      (e d³ = 35,856) is loose by twenty times here (1,670).
    </p>
  ),

  picture: (
    <p>
      Seating a committee where some pairs refuse to sit together, each
      member with a list of acceptable chairs. Every time a chair is
      assigned, a clerk walks every rule that touches the room and
      crosses off chairs that no longer have any compatible partner on
      the other side of the rule, and whenever a list shrinks, the clerk
      revisits every rule that touches that member. He stops only when a
      full pass changes nothing. If any list goes empty, the last
      assignment was wrong and nobody else need be seated to prove it.
      The clerk is slow per step and fast per problem.
    </p>
  ),

  steps: [
    <>
      <strong>Queue:</strong> all arcs (x, y) initially; inside the search,
      only the arcs (y, x) into the just-assigned variable x.
    </>,
    <>
      <strong>Revise (x, y):</strong> remove from D(x) every value with no
      value in D(y) that satisfies the constraint.
    </>,
    <>
      <strong>Wipe-out:</strong> if D(x) becomes empty, fail: the current
      partial assignment cannot be extended.
    </>,
    <>
      <strong>Requeue:</strong> if D(x) shrank, add every arc (z, x) for
      neighbors z ≠ y not already queued; repeat until the queue empties.
    </>,
    <>
      <strong>Search:</strong> pick the unassigned variable with the
      fewest remaining values, assign, propagate, recurse; a solution is
      an assignment with every domain a singleton and every constraint
      checked.
    </>,
  ],

  signals: [
    <>
      <strong>Binary constraints you can test in a table:</strong> inequality,
      no-conflict, compatibility pairs; Sudoku, coloring, scheduling.
    </>,
    <>
      <strong>Hard instances near a phase transition:</strong> most
      branches die deep; propagation finds the death early.
    </>,
    <>
      <strong>A proof of infeasibility matters:</strong> MAC refutes an
      unsatisfiable instance in 6 nodes where blind search never finishes.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>forward checking</strong>: after each
      assignment, prune only the neighbors&apos; domains, once. 102, 386,
      and 93 nodes at tightness 0.30, 0.40, 0.44 against 33, 26, and 6,
      at a third to a fifth of MAC&apos;s constraint checks.
    </>
  ),

  strength: (
    <>
      <strong>The smallest search tree, and proofs of infeasibility.</strong>{' '}
      6 nodes against 93 and 200,000 at the transition; a dead end found at
      its source; an easy Sudoku solved with no search; agreement with
      exhaustive enumeration on 40 of 40 small instances.
    </>
  ),
  weakness: (
    <>
      <strong>Propagation costs checks, and a loose instance needs
      none.</strong> 11,484 constraint checks per instance against 2,231
      for forward checking at 0.44; 168,988 against 16,178 on the hard
      Sudoku; the queue runs to a fixpoint whether or not it will prune
      anything. On easy, loosely constrained problems forward checking
      wins on time, and both lose to a linear-time special algorithm when
      one exists.
    </>
  ),

  problem: 'Constraint satisfaction',
  problemSlug: 'constraint-satisfaction',
  rivals: [
    {
      name: 'Maintaining arc consistency × AC-3 propagation',
      isThisUnit: true,
      algoName: 'Maintaining arc consistency',
      cost: 'O(e d³) propagation per node',
      wins: (
        <>
          <strong>6 nodes</strong> against 93 at the transition; 33 against
          102 where instances are satisfiable; refutes the unsatisfiable in
          4 nodes.
        </>
      ),
      costs: (
        <>
          Two to five times forward checking&apos;s constraint checks.
        </>
      ),
      when: 'Hard or infeasible instances; the default inside every modern constraint solver.',
    },
    {
      name: 'Forward checking',
      algoName: 'Forward checking',
      cost: 'O(deg × d) per node',
      wins: (
        <>
          The cheapest useful lookahead: 1,686 checks per instance at 0.30,
          a fifth of MAC&apos;s.
        </>
      ),
      costs: (
        <>
          A tree three to fifteen times larger (102 against 33; 93 against
          6).
        </>
      ),
      when: 'Loose, easy instances where checks are the cost and the tree is small anyway.',
    },
    {
      name: 'Backtracking search',
      algoName: 'Backtracking search',
      cost: 'O(deg) per node, no inference',
      wins: (
        <>
          Nothing to maintain; trivially correct; fine on tiny instances.
        </>
      ),
      costs: (
        <>
          200,000 nodes exhausted on 11 of 12 instances at 0.30 and 9 of 12
          at 0.44; blind to dead ends until it reaches them.
        </>
      ),
      when: 'Instances so small that inference is not worth the code.',
    },
    {
      name: 'Min-conflicts',
      algoName: 'Min-conflicts',
      cost: 'local repair; no proof of infeasibility',
      wins: (
        <>
          Solves huge satisfiable instances (the million-queens result) in
          near-linear time by repairing a complete assignment.
        </>
      ),
      costs: (
        <>
          Cannot prove unsatisfiability; can cycle; needs restarts.
        </>
      ),
      when: 'Large, loosely constrained, satisfiable problems where any solution will do.',
    },
  ],
  neverUse: {
    name: 'Chronological backtracking without propagation at the phase transition',
    why: (
      <>
        Unsatisfiable instance 0 at tightness 0.44: 25 variables, 6 values
        each, 83 constraints. MAC refutes it in <strong>4 nodes</strong>:
        the first propagation wipes out a domain almost at once. Plain
        backtracking checks each new value only against the variables
        already assigned, so a value doomed by two unassigned neighbors
        looks fine, and the search descends twenty levels before any
        contradiction surfaces, then does it again for the next value, and
        the next. It exhausts a budget of 200,000 nodes without an answer
        on 9 of the 12 instances at this tightness. The constraint that
        kills a branch is known from the start; only inference reads it
        before the branch is grown.
      </>
    ),
  },

  contest: {
    instance:
      'random binary CSPs with 25 variables, domain size 6, constraint density 0.3 (about 83 constraints), 12 instances per tightness, node budget 200,000; one currency: search nodes and constraint checks per instance; referee: every solution checked constraint by constraint, agreement of every finishing solver, exhaustive enumeration on 40 small instances',
    columns: ['t = 0.30 (all satisfiable)', 't = 0.40 (none)', 't = 0.44 (none)', 'hard Sudoku'],
    rows: [
      {
        method: 'MAC (AC-3) + MRV',
        isThisUnit: true,
        values: ['33 nodes, 7,227 checks', '26 nodes, 20,206 checks', '6 nodes, 11,484 checks', '291 nodes, 168,988 checks'],
        best: 2,
        verdict: 'the smallest tree at every tightness',
      },
      {
        method: 'MAC (AC-3), static order',
        values: ['41 nodes, 10,457 checks', '91 nodes, 61,207 checks', '9 nodes, 15,377 checks', '·'],
        verdict: 'propagation alone does most of the work',
      },
      {
        method: 'forward checking + MRV',
        values: ['102 nodes, 1,686 checks', '386 nodes, 7,148 checks', '93 nodes, 2,231 checks', '498 nodes, 16,178 checks'],
        verdict: 'the baseline: fewer checks, a larger tree',
      },
      {
        method: 'chronological backtracking',
        values: ['184,620 nodes (11 of 12 unfinished)', '200,004 nodes (12 unfinished)', '171,781 nodes (9 unfinished)', '·'],
        verdict: 'no inference, no answer',
      },
      {
        method: 'AC-3 alone, no search',
        values: ['·', '·', '·', 'easy puzzle solved: 11,356 checks'],
        verdict: 'propagation can be the whole solution',
      },
    ],
    source:
      'python solutions/maintaining_arc_consistency_ac3_propagation.py prints this table and asserts: on 40 small instances six solver variants agree with exhaustive enumeration, and AC-3 leaves every surviving value supported, is idempotent, and never removes a value from a solution; one AC-3 run under the 2 e d^3 bound; every returned solution consistent; every finishing solver agreeing on each of 72 instances; at tightness 0.40, 0.44, and 0.48 MAC + MRV under forward checking in nodes and above it in checks, MAC static under chronological backtracking, and no MAC or FC run unfinished; chronological backtracking unfinished on some instance at 0.44; AC-3 alone reducing every domain of the easy Sudoku to one value; MAC at or under forward checking in nodes on the hard Sudoku; and one unsatisfiable instance that MAC refutes while plain backtracking exhausts 200,000 nodes.',
  },

  figure: (
    <Figure
      id="fig-ac3-transition"
      aspect="16 / 7"
      caption="Left: search nodes per instance (log scale) against constraint tightness for the four solvers, with the share of satisfiable instances shaded: the transition from all-satisfiable at 0.30 to none at 0.40 is where trees explode, and where propagation matters most. Right: constraint checks per instance, the price of the smaller tree: MAC spends two to five times forward checking's checks at every tightness."
      cite={{
        text: 'A. K. Mackworth, "Consistency in networks of relations," Artificial Intelligence 8(1), 1977, pp. 99-118, DOI 10.1016/0004-3702(77)90007-8. D. Sabin and E. C. Freuder, "Contradicting conventional wisdom in constraint satisfaction," ECAI 1994. A. K. Mackworth and E. C. Freuder, "The complexity of some polynomial network consistency algorithms," Artificial Intelligence 25(1), 1985.',
        href: 'https://doi.org/10.1016/0004-3702(77)90007-8',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Search nodes per instance on a log scale against tightness for four solvers with the satisfiable fraction shaded, and constraint checks per instance for the same solvers">
        {(() => {
          const ts = [0.30, 0.36, 0.40, 0.44, 0.48, 0.54];
          const nodes = {
            bt: [184620, 200004, 200004, 171781, 163807, 118314],
            fc: [102, 295, 386, 93, 46, 29],
            ms: [41, 72, 91, 9, 4, 1],
            mac: [33, 40, 26, 6, 3, 1],
          };
          const checks = {
            bt: [443326, 428451, 400511, 316733, 283595, 186040],
            fc: [1686, 5518, 7148, 2231, 1255, 861],
            ms: [10457, 39560, 61207, 15377, 9673, 2857],
            mac: [7227, 20319, 20206, 11484, 8540, 2857],
          };
          const sat = [12, 8, 0, 0, 0, 0];
          const colors = { bt: '#e2606c', fc: '#f0b94b', ms: '#9aa5bd', mac: '#5da2ff' };
          const panel = (x0, data, title, maxLog) => {
            const y0 = 230;
            const pw = 250;
            const ph = 180;
            const X = (t) => x0 + ((t - 0.28) / 0.28) * pw;
            const Y = (v) => y0 - (Math.log10(Math.max(v, 1)) / maxLog) * ph;
            return (
              <g>
                {ts.map((t, i) => (
                  <rect key={t} x={X(t) - 10} y={y0 - ph} width="20" height={ph} fill="#62d98a" fillOpacity={0.12 * (sat[i] / 12)} />
                ))}
                <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
                {Object.entries(data).map(([k, vals]) => (
                  <g key={k}>
                    <polyline points={ts.map((t, i) => `${X(t)},${Y(vals[i])}`).join(' ')} fill="none" stroke={colors[k]} strokeWidth="2" />
                    {ts.map((t, i) => <circle key={t} cx={X(t)} cy={Y(vals[i])} r="2.5" fill={colors[k]} />)}
                  </g>
                ))}
                {ts.map((t) => <text key={t} x={X(t) - 10} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{t.toFixed(2)}</text>)}
                {[1, 2, 3, 4, 5].filter((e) => e <= maxLog).map((e) => <text key={e} x={x0 - 26} y={Y(10 ** e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">10^{e}</text>)}
                <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{title}</text>
              </g>
            );
          };
          return (
            <g>
              {panel(40, nodes, 'search nodes per instance (log); green: satisfiable share', 5.5)}
              {panel(370, checks, 'constraint checks per instance (log)', 6)}
              <text x="40" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red backtracking</text>
              <text x="160" y="262" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber forward checking</text>
              <text x="330" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">gray MAC static</text>
              <text x="450" y="262" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue MAC + MRV</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'maintaining_arc_consistency_ac3_propagation.py',
  Viz: Ac3Viz,
  narration,
};
