import BddViz from '../viz/BddViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/binary_decision_diagram_reduced_ordered_canonical_form.py?raw';
import { narration } from './binary-decision-diagram-reduced-ordered-canonical-form.narration.js';

export const content = {
  given:
    'Circuits and formulas over a few dozen Boolean variables must be compared for equivalence, checked for satisfiability, and counted, without a truth table of 2ⁿ rows. Two descriptions of a 6-bit adder, ripple-carry and carry-lookahead, should be the same function; a 20-variable formula has a million-row table; a random formula and its De Morgan rewrite look nothing alike and mean the same thing.',
  task: 'The binary decision diagram: a rooted directed acyclic graph that tests one variable per node, low edge for 0 and high edge for 1, down to the terminals 0 and 1. The heuristic is the reduced ordered canonical form: fix one variable order for every diagram, merge identical subgraphs through a unique table, and delete any test whose two branches agree. Under those three rules every Boolean function has exactly one diagram, so equivalence is pointer equality, satisfiability is “not the zero node”, and counting is one pass over the nodes.',
  constraint:
    'Measured against truth tables and exhaustive checks: 200 random formulas over 8 variables, each rebuilt by De Morgan and re-association, reduce to the same node 200 of 200 times; the 185 one-literal flips that changed the function never shared a node; every diagram agrees with its 256-row truth table on every input and counts its satisfying assignments exactly; 2,848 nodes in the shared table. The order: x₁x₂ + x₃x₄ + ⋯ + x₁₅x₁₆ has 16 internal nodes interleaved and 510 (2⁹ − 2) with the odd variables first, the same function. Ripple-carry adders of 4, 8, 12, 16 bits: carry 11 / 23 / 35 / 47 nodes (3n − 1), largest sum 12 / 24 / 36 / 48, the whole table 71 / 285 / 643 / 1,145. A 6-bit ripple-carry and carry-lookahead adder reduce to the same nodes for every output after 1,398 apply steps, both equal to integer addition on all 4,096 inputs; a DPLL solver proves the same equivalence unsatisfiable-to-differ after 8,190 decisions and 99,698 unit propagations on a 113-variable, 333-clause miter. The 20-variable function x₁x₂ + ⋯ + x₁₉x₂₀: 1,048,576 truth-table rows (989,527 ones) against a 20-node diagram.',

  origins: (
    <p>
      Lee (1959) and Akers (1978) drew Boolean functions as branching
      programs, but the structure became an algorithm when Randal
      Bryant (<strong>1986</strong>, IEEE Transactions on Computers,
      &quot;Graph-based algorithms for Boolean function manipulation&quot;)
      added the two rules that make it canonical, a fixed variable order
      and maximal sharing, and gave the apply operation that builds the
      diagram of f ∘ g from the diagrams of f and g in time proportional
      to their product of sizes. Canonicity turned equivalence checking
      into pointer comparison and made symbolic model checking possible:
      Burch, Clarke, McMillan, Dill, and Hwang (1990) verified systems
      of 10²⁰ states by representing sets of states as diagrams, and
      McMillan&apos;s SMV (1993) built an industry on it. Bryant (1991)
      proved multiplication has no small diagram under any order;
      Rudell (1993) introduced dynamic reordering by sifting; Minato
      (1993) the zero-suppressed variant for sparse sets. Diagrams
      remain the representation of choice in logic synthesis, hardware
      equivalence checking, and every tool that must ask &quot;are these
      two functions the same&quot; many thousands of times.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>diagram and the apply operation</strong>: a DAG
      of variable tests whose paths are the rows of the truth table,
      built compositionally, f AND g from f and g, without ever writing
      a row. The referee is the truth table itself, 256 rows at 8
      variables and 4,096 at 12, and every diagram built on this page
      agrees with it on every input, counts its ones exactly, and, for
      the two 6-bit adders, equals integer addition on all 4,096 input
      pairs. The algorithm also owns what makes the diagram worth
      building: satisfiability is a check that the root is not the zero
      node, counting is one memoized pass (exact on 200 of 200 random
      formulas), and the whole 20-variable function{' '}
      <strong>x₁x₂ + ⋯ + x₁₉x₂₀ is 20 nodes</strong> where its truth table
      is 1,048,576 rows.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>uniqueness</strong>. Three rules, a fixed
      order, no node with equal branches, and no two nodes alike (the
      unique table returns the existing node instead of making a
      second), leave exactly one diagram per function, so two formulas
      mean the same thing if and only if they build to the same pointer:
      measured, 200 of 200 De Morgan rewrites hit the same node and 185
      of 185 function-changing flips did not. The order is the price of
      the rules, and it is measured too: Bryant&apos;s function has{' '}
      <strong>16 nodes under the interleaved order and 510 under the
      odd-first order</strong>, because the second must remember which of
      the eight odd variables were 1 before it sees any even one. Adders
      are the good case, 3n − 1 nodes for an n-bit carry; multipliers
      are the bad case under every order, and the rules cannot help
      them.
    </p>
  ),

  picture: (
    <p>
      A flowchart for a yes-or-no decision that asks about the inputs
      one at a time, always in the same order, with two arrows out of
      every question. Now tidy it under three rules: if both arrows
      from a question lead to the same place, skip the question; if two
      boxes ask the same question with the same two destinations, keep
      one and point everyone at it; never change the order. The tidying
      has a remarkable end: two people who write flowcharts for the
      same decision, however differently they think about it, end with
      the identical chart, box for box. So comparing two decisions is
      comparing two charts for identity, counting the yes answers is
      one walk down the chart, and the only choice left to make, the
      order of the questions, is the one that decides whether the chart
      fits on a page.
    </p>
  ),

  steps: [
    <>
      <strong>Order:</strong> fix a variable order; every node tests a
      later variable than its parent.
    </>,
    <>
      <strong>mk(v, low, high):</strong> if low = high return low; else
      look up (v, low, high) in the unique table, creating it once.
    </>,
    <>
      <strong>apply(op, u, w):</strong> memoized; split both on the
      earlier top variable, recurse on the two cofactors, mk the result.
    </>,
    <>
      <strong>Answer:</strong> equal pointers ⇔ equal functions; root ≠
      0 ⇔ satisfiable; count(u) = 2^skipped · (count(low) + count(high)).
    </>,
    <>
      <strong>Reorder</strong> if the diagram grows: the function is
      fixed, the size is not.
    </>,
  ],

  signals: [
    <>
      <strong>Many equivalence questions about the same functions:</strong>
      hardware verification, synthesis, model checking; canonical form
      pays for itself on the second question.
    </>,
    <>
      <strong>Structure a good order can exploit:</strong> adders, control
      logic, sets of states with locality; the diagram stays linear.
    </>,
    <>
      <strong>Counting or enumeration, not just yes or no:</strong> #SAT,
      reliability, probabilities over the function; a SAT solver
      cannot count.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the truth table</strong>: exact,
      canonical too, and 2ⁿ rows. It is the referee on this page up to
      12 variables, and at 20 it is 1,048,576 rows for a function whose
      diagram has 20 nodes.
    </>
  ),

  strength: (
    <>
      <strong>Canonical, compositional, and countable.</strong> 200 of
      200 rewrites to the same pointer, exact counts on every formula,
      adders in 3n − 1 nodes, and a million-row function in 20 nodes.
    </>
  ),
  weakness: (
    <>
      <strong>The order, and the functions no order saves.</strong> A
      bad order turns 16 nodes into 510 on this page, and finding the
      best order is itself NP-hard, so reordering is a heuristic search
      of its own; multiplication is exponential under every order
      (Bryant 1991), which is why arithmetic verification moved to SAT
      and word-level methods; apply is quadratic in the operand sizes,
      so a sequence of operations can blow up in the middle even when
      the final result is small; and memory, not time, is what runs out.
    </>
  ),

  problem: 'Boolean function representation',
  problemSlug: 'logic-minimization',
  rivals: [
    {
      name: 'Binary decision diagram × Reduced ordered canonical form',
      isThisUnit: true,
      algoName: 'Binary decision diagram',
      cost: 'apply: |f| · |g| per operation',
      wins: (
        <>
          <strong>Equivalence by pointer, 200 of 200</strong>; counting in
          one pass; 20 nodes for a million-row function.
        </>
      ),
      costs: (
        <>
          Order-sensitive (16 vs 510); exponential on multipliers.
        </>
      ),
      when: 'Many equivalence or counting questions on structured functions of tens to hundreds of variables.',
    },
    {
      name: 'CDCL',
      algoName: 'CDCL',
      cost: 'search with learned clauses',
      wins: (
        <>
          One satisfiability question at a time on thousands of
          variables; multipliers and arithmetic where no diagram fits.
          The DPLL ancestor here proved the adders equivalent in 8,190
          decisions.
        </>
      ),
      costs: (
        <>
          No canonical form: each new question is a new search; cannot
          count without extra machinery.
        </>
      ),
      when: 'Large formulas, one or a few queries, and no need to count.',
    },
    {
      name: 'Quine-McCluskey',
      algoName: 'Quine-McCluskey',
      cost: 'prime implicants over 2ⁿ minterms',
      wins: (
        <>
          A minimal sum-of-products, which a diagram is not: the
          smallest two-level circuit, exactly.
        </>
      ),
      costs: (
        <>
          Exponential in the variables from the first step; a dozen
          variables is already heavy.
        </>
      ),
      when: 'Small functions that must become minimal gates, not questions about functions.',
    },
    {
      name: 'And-inverter graph rewriting',
      algoName: 'And-inverter graph rewriting',
      cost: 'local rewrites over a two-input gate graph',
      wins: (
        <>
          Scales to millions of gates; the representation inside
          modern synthesis and equivalence tools, with SAT for the
          hard corners.
        </>
      ),
      costs: (
        <>
          Not canonical: equal functions can be different graphs, so
          equivalence needs a solver.
        </>
      ),
      when: 'Industrial-scale circuits where a canonical diagram would not fit in memory.',
    },
  ],
  neverUse: {
    name: 'The truth table past a dozen variables',
    why: (
      <>
        The truth table is canonical too, which is why it is the
        referee on this page, and it is the wrong representation the
        moment the variables pass a dozen: 2ⁿ rows, every one of them
        written whether the function is simple or not. Measured: the
        20-variable function x₁x₂ + x₃x₄ + ⋯ + x₁₉x₂₀ needs{' '}
        <strong>1,048,576 rows</strong>, of which 989,527 are ones, and
        its diagram has 20 nodes; at 40 variables the table is a
        trillion rows and the diagram is 40 nodes. The table pays for
        the size of the domain; the diagram pays for the size of the
        function&apos;s structure. When the structure is small, and the
        three rules find it whenever the order lets them, the difference
        is the difference between a lookup and the age of the universe.
      </>
    ),
  },

  contest: {
    instance:
      'Boolean functions over 8 to 20 variables and 4- to 16-bit adders; referees: truth tables (256 rows at 8 variables, 4,096 at 12), integer addition on all 4,096 input pairs of the 6-bit adders, exhaustive counts',
    columns: ['result', 'size', 'work'],
    rows: [
      {
        method: '200 random 8-variable formulas, rebuilt by De Morgan',
        isThisUnit: true,
        values: ['same node 200 of 200; 185 flips distinct', '2,848 shared nodes', 'truth table and count exact on every one'],
        best: 0,
        verdict: 'canonical',
      },
      {
        method: 'x₁x₂ + ⋯ + x₁₅x₁₆, interleaved / odd-first order',
        values: ['the same function', '16 / 510 nodes', '2⁹ − 2 under the bad order'],
        verdict: 'the order is the price',
      },
      {
        method: 'ripple-carry adder, 4 / 8 / 12 / 16 bits',
        values: ['equal to integer addition', 'carry 11 / 23 / 35 / 47; table 71 / 285 / 643 / 1,145', '3n − 1 nodes for the carry'],
        verdict: 'linear in n',
      },
      {
        method: 'ripple vs lookahead 6-bit adders, diagram',
        values: ['same pointer for every output', '·', '1,398 apply steps'],
        verdict: 'equivalence by pointer',
      },
      {
        method: 'the same equivalence by DPLL on a miter',
        values: ['unsatisfiable (equivalent)', '113 variables, 333 clauses', '8,190 decisions, 99,698 propagations'],
        verdict: 'a proof per question',
      },
      {
        method: 'x₁x₂ + ⋯ + x₁₉x₂₀, truth table / diagram',
        values: ['989,527 ones, both agree', '1,048,576 rows / 20 nodes', 'one pass to count'],
        verdict: 'domain size vs structure size',
      },
    ],
    source:
      'python solutions/binary_decision_diagram_reduced_ordered_canonical_form.py prints this table and asserts: every diagram equal to its truth table on all inputs with the exact count; rewrites to the same node and function-changing flips to different nodes on all 200 formulas; 16 and 510 nodes under the two orders with equal evaluations; carry diagrams of exactly 3n − 1 nodes and sums of 3n with a linearly growing table; the two 6-bit adders identical by pointer and equal to integer addition on all 4,096 inputs; the DPLL miter unsatisfiable; and the 20-variable diagram of 20 nodes counting exactly the truth table’s ones.',
  },

  figure: (
    <Figure
      id="fig-bdd-orders"
      aspect="16 / 7"
      caption="x₁x₂ + x₃x₄ + x₅x₆ under two orders. Left, interleaved: each pair is decided as it is met, so a level needs to remember only whether the pair so far is undecided, six nodes. Right, odd variables first: after seeing x₁, x₃, x₅ the diagram must remember which of them were 1 before any even variable arrives, one node per subset, and the count doubles per level, fourteen nodes (2⁴ − 2). At eight pairs the file measures 16 against 510."
      cite={{
        text: 'R. E. Bryant, "Graph-based algorithms for Boolean function manipulation," IEEE Transactions on Computers C-35(8), 1986. DOI 10.1109/TC.1986.1676819. J. R. Burch, E. M. Clarke, K. L. McMillan, D. L. Dill, L. J. Hwang, "Symbolic model checking: 10^20 states and beyond," LICS 1990. R. Rudell, "Dynamic variable ordering for ordered binary decision diagrams," ICCAD 1993.',
        href: 'https://doi.org/10.1109/TC.1986.1676819',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two decision diagrams for the same function: a six-node chain under the interleaved order and a fourteen-node tree under the odd-first order">
        {(() => {
          const node = (x, y, label, key, color = '#5da2ff') => (
            <g key={key}>
              <circle cx={x} cy={y} r="11" fill={`${color}33`} stroke={color} />
              <text x={x - 7} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
            </g>
          );
          const edge = (x1, y1, x2, y2, dashed, key) => <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa5bd" strokeOpacity="0.7" strokeDasharray={dashed ? '3 3' : undefined} />;
          const term = (x, y, label, key) => (
            <g key={key}>
              <rect x={x - 10} y={y - 9} width="20" height="18" fill="#62d98a22" stroke="#62d98a" />
              <text x={x - 3} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
            </g>
          );
          // left: interleaved chain
          const L = [];
          const lx = 90;
          const ys = [40, 70, 100, 130, 160, 190];
          const labels = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'];
          // x1 low -> x3, high -> x2; x2 low -> x3, high -> 1; ... x6 low -> 0, high -> 1
          const t0 = [60, 235];
          const t1 = [130, 235];
          for (let i = 0; i < 6; i++) {
            const y = ys[i];
            const x = i % 2 === 0 ? lx : lx + 40;
            const nextOdd = i + (i % 2 === 0 ? 2 : 1);
            if (i % 2 === 0) {
              L.push(edge(x, y + 11, lx + 40, ys[i + 1] - 11, false, `le-${i}h`));
              if (i + 2 < 6) L.push(edge(x, y + 11, lx, ys[i + 2] - 11, true, `le-${i}l`));
              else L.push(edge(x, y + 11, t0[0], t0[1] - 9, true, `le-${i}l`));
            } else {
              L.push(edge(x, y + 11, t1[0], t1[1] - 9, false, `le-${i}h`));
              if (nextOdd < 6) L.push(edge(x, y + 11, lx, ys[nextOdd] - 11, true, `le-${i}l`));
              else L.push(edge(x, y + 11, t0[0], t0[1] - 9, true, `le-${i}l`));
            }
          }
          for (let i = 0; i < 6; i++) L.push(node(i % 2 === 0 ? lx : lx + 40, ys[i], labels[i], `ln-${i}`));
          L.push(term(t0[0], t0[1], '0', 'lt0'));
          L.push(term(t1[0], t1[1], '1', 'lt1'));
          // right: odd-first tree levels x1 (1), x3 (2), x5 (4), x2 (4), x4 (2), x6 (1) = 14
          const R = [];
          const rx0 = 260;
          const rw = 360;
          const levels = [
            ['x1', 1], ['x3', 2], ['x5', 4], ['x2', 4], ['x4', 2], ['x6', 1],
          ];
          const pos = [];
          levels.forEach(([lab, cnt], li) => {
            const row = [];
            for (let k = 0; k < cnt; k++) row.push([rx0 + ((k + 1) / (cnt + 1)) * rw, ys[li]]);
            pos.push(row);
          });
          // edges: schematic branching down the levels (both children to the next level)
          for (let li = 0; li < 5; li++) {
            pos[li].forEach(([x, y], k) => {
              const nxt = pos[li + 1];
              const a = nxt[Math.min(nxt.length - 1, 2 * k)];
              const b = nxt[Math.min(nxt.length - 1, 2 * k + 1)];
              const c = nxt[Math.min(nxt.length - 1, Math.floor(k / 2))];
              if (li < 2) {
                R.push(edge(x, y + 11, a[0], a[1] - 11, true, `re-${li}-${k}l`));
                R.push(edge(x, y + 11, b[0], b[1] - 11, false, `re-${li}-${k}h`));
              } else if (li === 2) {
                R.push(edge(x, y + 11, nxt[k][0], nxt[k][1] - 11, true, `re-${li}-${k}l`));
                R.push(edge(x, y + 11, nxt[k][0], nxt[k][1] - 11, false, `re-${li}-${k}h`));
              } else {
                R.push(edge(x, y + 11, c[0], c[1] - 11, true, `re-${li}-${k}l`));
                R.push(edge(x, y + 11, c[0], c[1] - 11, false, `re-${li}-${k}h`));
              }
            });
          }
          pos.forEach((row, li) => row.forEach(([x, y], k) => R.push(node(x, y, levels[li][0], `rn-${li}-${k}`, '#f0b94b'))));
          R.push(edge(pos[5][0][0], ys[5] + 11, 400, 226, true, 'rt0e'));
          R.push(edge(pos[5][0][0], ys[5] + 11, 480, 226, false, 'rt1e'));
          R.push(term(400, 235, '0', 'rt0'));
          R.push(term(480, 235, '1', 'rt1'));
          return (
            <g>
              {L}
              {R}
              <text x="30" y="262" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">interleaved: 6 nodes</text>
              <text x="260" y="262" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">odd variables first: 14 nodes (levels 1, 2, 4, 4, 2, 1), edges schematic</text>
              <text x="30" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">dashed: 0 branch; solid: 1 branch. Eight pairs in the file: 16 vs 510 nodes</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'binary_decision_diagram_reduced_ordered_canonical_form.py',
  Viz: BddViz,
  narration,
};
