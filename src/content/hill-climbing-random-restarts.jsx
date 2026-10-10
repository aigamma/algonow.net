import HillClimbingViz from '../viz/HillClimbingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hill_climbing_random_restarts.py?raw';
import { narration } from './hill-climbing-random-restarts.narration.js';

export const content = {
  given:
    'A state space too large to enumerate, an objective to minimize, and a neighborhood: which states are one move away. Find the best state, or a state as good as the best, with nothing but those three things.',
  task: 'Hill climbing. The algorithm: from the current state, look at every neighbor and move to the best one as long as it improves the objective; stop when none does, which is a local optimum. The heuristic is random restarts: when a climb stalls somewhere that is not the goal, throw the state away and climb again from a fresh random start. If one climb reaches the global optimum with probability p, the number of climbs until success is geometric with mean 1/p, so a method that is complete almost never on its own becomes complete almost surely, at a cost that is a formula in p and the length of one climb.',
  constraint:
    'Measured on eight queens (objective: attacking pairs; the 92 solutions computed by exhaustive backtracking as referee) and on Rastrigin’s function in two dimensions (global minimum 0 at the origin, a local minimum near every lattice point). One steepest-ascent climb from a random queens state succeeds 14.3% of the time (Russell and Norvig: about 14%), in 4.01 steps when it succeeds and 3.06 when it sticks; with up to 100 sideways moves 95.4% (about 94%). The geometric law: 1/p = 6.99 climbs expected, 7.83 measured over 600 runs, and all 92 solutions found. One pattern-search climb on Rastrigin succeeds 2.67% of the time (1/p = 38); 34 climbs measured. At a budget of 5,000 evaluations on eight queens, restarts succeed 95.0% (1,520 evaluations to success) against 14.5% for one climb, 95.0% for sideways moves, 98.0% for simulated annealing, 100% for tabu search (700), 89.0% for iterated local search; at 20,000 evaluations on Rastrigin, restarts 89% (6,495; the formula 1 − (1 − p)^(budget/climb) predicts 90.6%), annealing 100% (19,776), iterated local search 100% (3,709), one climb 3%.',

  origins: (
    <p>
      Local search is older than its name: Lin&apos;s 1965 exchange method
      for the traveling salesman, Kernighan and Lin&apos;s 1970 partitioner,
      and the &quot;iterative improvement&quot; of operations research all
      climb and restart. Russell and Norvig&apos;s textbook (1995 onward)
      made eight queens the standard demonstration, with the numbers this
      page reproduces: <strong>14%</strong> of steepest-ascent climbs
      succeed, 94% with sideways moves, so random restarts expect about
      seven climbs. Johnson, Papadimitriou, and Yannakakis (1988) showed
      that even reaching a local optimum can be hard in the worst case
      (the class PLS), and Selman, Levesque, and Mitchell&apos;s GSAT (1992)
      turned climb-and-restart into a satisfiability solver that beat
      systematic search on hard random instances, the ancestor of
      WalkSAT. Kirkpatrick, Gelatt, and Vecchi (1983) and Glover (1986)
      offered the two rivals that escape instead of restarting: simulated
      annealing (puzzle 2) and tabu search.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>climb</strong>: evaluate every neighbor, take the
      best, repeat until no neighbor improves. On eight queens that is 56
      evaluations per step and about four steps per climb; on Rastrigin a
      pattern search over eight compass points with a halving step, 228
      evaluations per climb. The referee is the set of all{' '}
      <strong>92 solutions</strong>, computed by exhaustive backtracking:
      every state a climb returns with zero conflicts is checked against
      it, and across the run all 92 were reached. Alone, the climb is a
      gamble: 14.3% on eight queens, 2.67% on Rastrigin, and when it
      sticks it stays stuck.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>completeness</strong>: climb, fail, start over. The
      number of climbs until success is geometric with mean 1/p, measured
      at <strong>7.83 against 6.99</strong> on eight queens and 34 against
      38 on Rastrigin, and the success rate within a budget follows
      1 − (1 − p)^(budget / climb): 90.6% predicted, 89% measured. Within
      5,000 evaluations, 95% of queens runs succeed where a single climb
      manages 14.5%. The cost is also a formula: a failed climb is wasted
      work, so a landscape where p is one in a thousand needs a thousand
      climbs, and nothing learned from one climb helps the next.
    </p>
  ),

  picture: (
    <p>
      A hiker in fog on a range of hills, told to find the highest peak.
      Walking uphill until every direction goes down finds a peak, but
      almost always the wrong one. Her trick is a helicopter: when she
      tops out and the altimeter says it is not the summit, she is dropped
      at a random spot and walks up again. She does not know where the
      summit is, but she knows the odds: if one drop in seven lands on the
      right hill, she expects seven drops, and after twenty she has missed
      it with probability under five percent. The helicopter is dumb, and
      that is the point: it needs no map, no memory, and no temperature.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> a uniformly random state (eight random rows;
      a random point in the square).
    </>,
    <>
      <strong>Climb:</strong> evaluate all neighbors; if the best is better
      than the current state, move there and repeat; otherwise stop.
    </>,
    <>
      <strong>Check:</strong> if the objective is at its optimum (zero
      conflicts; a value below 10⁻⁴), return the state.
    </>,
    <>
      <strong>Restart:</strong> otherwise discard the state and go to step
      one; count climbs.
    </>,
    <>
      <strong>Budget:</strong> stop after a fixed number of evaluations;
      the success probability is 1 − (1 − p)^(climbs), where p is one
      climb&apos;s success rate.
    </>,
  ],

  signals: [
    <>
      <strong>A cheap climb and a fair chance:</strong> p of a few percent
      or better and a climb of a few hundred evaluations, so 1/p climbs is
      affordable.
    </>,
    <>
      <strong>You can recognize the optimum:</strong> zero conflicts, a
      known bound, a satisfied formula; otherwise you keep the best seen.
    </>,
    <>
      <strong>No time to tune:</strong> no temperature, no tenure, no kick
      size; the only parameter is the budget.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>a single climb</strong>: steepest
      ascent to the first local optimum. 14.5% on eight queens and 3% on
      Rastrigin at the same budget, in 227 and 236 evaluations, then
      nothing.
    </>
  ),

  strength: (
    <>
      <strong>Complete almost surely, with the odds in closed form.</strong>{' '}
      95% of queens runs and 89% of Rastrigin runs within budget; the mean
      climbs to success 7.83 and 34 against 1/p of 6.99 and 38; zero
      parameters; every solution returned one of the 92.
    </>
  ),
  weakness: (
    <>
      <strong>Blind restarts waste what a climb learned.</strong> Tabu
      search solved every queens run in 700 evaluations against 1,520, and
      iterated local search every Rastrigin run in 3,709 against 6,495,
      because a kick from a good state is a better start than a random
      one; when p is tiny the expected 1/p climbs is the whole budget;
      and sideways moves alone (95.4%) do most of what restarts do on
      plateaus.
    </>
  ),

  problem: 'Local search and escaping local optima',
  problemSlug: 'local-search-escape',
  rivals: [
    {
      name: 'Hill climbing × Random restarts',
      isThisUnit: true,
      algoName: 'Hill climbing',
      cost: '1/p climbs of a few hundred evaluations; no parameters',
      wins: (
        <>
          <strong>95% and 89%</strong> within budget from 14.5% and 3% for
          one climb; the geometric law measured within 12%.
        </>
      ),
      costs: (
        <>
          Each restart forgets everything; 1,520 and 6,495 evaluations to
          success.
        </>
      ),
      when: 'A cheap climb, a recognizable optimum, and no appetite for tuning.',
    },
    {
      name: 'Simulated annealing',
      algoName: 'Simulated annealing',
      cost: 'one evaluation per proposal; a cooling schedule',
      wins: (
        <>
          Escapes without forgetting: 98% on queens, 100% on Rastrigin;
          converges in theory with slow enough cooling.
        </>
      ),
      costs: (
        <>
          2,001 and 19,776 evaluations to success; a schedule to tune.
        </>
      ),
      when: 'Many local optima of similar depth and a budget you will spend anyway; see puzzle 2.',
    },
    {
      name: 'Tabu search',
      algoName: 'Tabu search',
      cost: 'a full neighborhood scan per step; a tenure',
      wins: (
        <>
          100% on queens in 700 evaluations, the best here: memory forbids
          undoing recent moves, so the walk leaves a plateau.
        </>
      ),
      costs: (
        <>
          A tenure to set; a neighborhood scan every step; needs a discrete
          move structure.
        </>
      ),
      when: 'Discrete problems with plateaus and cycles, where a short memory is cheap.',
    },
    {
      name: 'Iterated local search',
      algoName: 'Iterated local search',
      cost: 'climb, kick, climb; an acceptance rule',
      wins: (
        <>
          A kick from the current optimum keeps most of its structure: 100%
          on Rastrigin in 3,709 evaluations against 6,495.
        </>
      ),
      costs: (
        <>
          89% on queens here (a two-queen kick can cycle); a kick size and
          an acceptance rule to choose.
        </>
      ),
      when: 'Good solutions cluster: a nearby restart beats a random one.',
    },
  ],
  neverUse: {
    name: 'One greedy climb on a landscape full of local optima',
    why: (
      <>
        Rastrigin&apos;s function has a local minimum near every point of the
        integer lattice, about a hundred of them in the square of side
        10.24, and one global minimum. A single pattern-search climb from a
        random start reaches it <strong>2.67% of the time</strong>, 3% within
        the race budget, and the other 97% of climbs stop at a lattice
        point and report it with full confidence, no error bar, no hint
        that anything is wrong. On eight queens a single climb fails 86% of
        the time the same way. The climb is not the mistake; stopping after
        one is. Thirty-eight expected restarts, or a kick, or a
        temperature, turns the same climb into a method that works.
      </>
    ),
  },

  contest: {
    instance:
      'eight queens (attacking pairs, 92 solutions as the referee) at a budget of 5,000 objective evaluations over 200 runs, and Rastrigin in two dimensions (success: value below 10⁻⁴) at 20,000 evaluations over 100 runs; one currency: objective evaluations',
    columns: ['queens: success', 'queens: evals to success', 'Rastrigin: success', 'Rastrigin: evals to success'],
    rows: [
      {
        method: 'hill climbing + random restarts',
        isThisUnit: true,
        values: ['95.0%', '1,520', '89%', '6,495'],
        verdict: 'complete almost surely, no parameters',
      },
      {
        method: 'single climb',
        values: ['14.5%', '227', '3%', '236'],
        verdict: 'the baseline: the first local optimum',
      },
      {
        method: 'climb + up to 100 sideways moves',
        values: ['95.0%', '946', '·', '·'],
        verdict: 'plateaus crossed, basins not',
      },
      {
        method: 'simulated annealing',
        values: ['98.0%', '2,001', '100%', '19,776'],
        verdict: 'escapes without forgetting',
      },
      {
        method: 'tabu search (tenure 7)',
        values: ['100%', '700', '·', '·'],
        best: 1,
        verdict: 'the queens winner',
      },
      {
        method: 'iterated local search',
        values: ['89.0%', '1,504', '100%', '3,709'],
        best: 3,
        verdict: 'the Rastrigin winner',
      },
    ],
    source:
      'python solutions/hill_climbing_random_restarts.py prints this table and asserts: exactly 92 solutions from the backtracking referee and every returned solution among them; one-climb success between 10% and 20% with mean steps near 4 on success and 3 when stuck; sideways success above 85%; mean climbs to success within 15% of 1/p on eight queens and 25% on Rastrigin; Rastrigin one-climb success between 1% and 6%; restarts above 90% on queens and more than 50 points above a single climb; restarts above 50% on Rastrigin and a single climb below 5%.',
  },

  figure: (
    <Figure
      id="fig-restarts-geometric"
      aspect="16 / 7"
      caption="Left: the probability that random restarts have found a solution within k climbs, 1 − (1 − p)^k, for the measured p = 0.143 on eight queens (blue) and p = 0.0267 on Rastrigin (amber), with the measured mean climbs to success marked: 7.83 and 34 against the expected 6.99 and 38. Right: success rates within the race budgets, eight queens at 5,000 evaluations and Rastrigin at 20,000."
      cite={{
        text: 'S. Russell and P. Norvig, Artificial Intelligence: A Modern Approach, section 4.1 (local search), eight-queens figures. D. S. Johnson, C. H. Papadimitriou, and M. Yannakakis, "How easy is local search?," Journal of Computer and System Sciences 37(1), 1988, DOI 10.1016/0022-0000(88)90046-3. B. Selman, H. Levesque, and D. Mitchell, "A new method for solving hard satisfiability problems," AAAI 1992.',
        href: 'https://doi.org/10.1016/0022-0000(88)90046-3',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two geometric success curves against the number of climbs with measured means marked, and bars of success rates for six methods on two problems">
        {(() => {
          const x0 = 44;
          const y0 = 230;
          const pw = 280;
          const ph = 180;
          const X = (k) => x0 + (k / 100) * pw;
          const Y = (v) => y0 - v * ph;
          const curve = (p) => Array.from({ length: 101 }, (_, k) => `${X(k)},${Y(1 - (1 - p) ** k)}`).join(' ');
          const bars = [['restarts', 95, 89, '#5da2ff'], ['one climb', 14.5, 3, '#e2606c'], ['sideways', 95, null, '#9aa5bd'], ['annealing', 98, 100, '#f0b94b'], ['tabu', 100, null, '#9aa5bd'], ['ILS', 89, 100, '#9aa5bd']];
          const bx = 380;
          const by = 230;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={curve(0.143)} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={curve(0.0267)} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <line x1={X(7.83)} y1={y0} x2={X(7.83)} y2={Y(1 - (1 - 0.143) ** 7.83)} stroke="#5da2ff" strokeDasharray="3 3" />
              <line x1={X(34)} y1={y0} x2={X(34)} y2={Y(1 - (1 - 0.0267) ** 34)} stroke="#f0b94b" strokeDasharray="3 3" />
              <text x={X(7.83) + 4} y={y0 - 6} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">mean 7.83 (1/p 6.99)</text>
              <text x={X(34) + 4} y={y0 - 20} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">mean 34 (1/p 38)</text>
              {[0, 25, 50, 75, 100].map((k) => <text key={k} x={X(k) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{k}</text>)}
              {[0.5, 1].map((v) => <text key={v} x={x0 - 26} y={Y(v) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">P(solved within k climbs) = 1 − (1 − p)^k</text>
              <text x={x0} y="36" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">queens p = 0.143</text>
              <text x={x0 + 130} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">Rastrigin p = 0.0267</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">climbs</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">success within budget: queens (left bar), Rastrigin (right)</text>
              {bars.map(([name, q, r, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 40} y={by - q * 1.7} width="14" height={q * 1.7} fill={c} fillOpacity="0.9" />
                  {r !== null && <rect x={bx + i * 40 + 16} y={by - r * 1.7} width="14" height={r * 1.7} fill={c} fillOpacity="0.45" />}
                  <text x={bx + i * 40 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="7">{name}</text>
                  <text x={bx + i * 40} y={by - q * 1.7 - 4} fill={c} fontFamily="ui-monospace, monospace" fontSize="8">{q}</text>
                </g>
              ))}
              <text x={bx} y={by + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">5,000 and 20,000 evaluations; tabu and sideways on queens only</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'hill_climbing_random_restarts.py',
  Viz: HillClimbingViz,
  narration,
};
