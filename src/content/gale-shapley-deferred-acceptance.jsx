import GaleShapleyViz from '../viz/GaleShapleyViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gale_shapley_deferred_acceptance.py?raw';
import { narration } from './gale-shapley-deferred-acceptance.narration.js';

export const content = {
  given:
    'Two sides with opinions: n applicants, n programs, everyone ranking everyone across the aisle.',
  task: 'A matching no pair will defect from: STABLE: no two participants who prefer each other to what they got.',
  constraint:
    'Optimality is not the objective: stability is: the live Hungarian unit minimizes cost, this unit prevents elopement, and the two are different mathematics. Referees: every stable matching ENUMERATED at n ≤ 6 with the optimal/pessimal theorems checked against each one, and blocking pairs counted on all n² pairs of all 300 instances.',

  origins: (
    <p>
      Gale and Shapley, <strong>1962</strong>, in the American
      Mathematical Monthly: seven pages, no citations, and the
      founding paper of matching theory. The National Resident
      Matching Program had been running essentially this procedure
      since 1952 without the theory; Alvin Roth proved it in the
      1980s and redesigned the NRMP with it in the 1990s: kidney
      exchanges, school choice systems, and the <strong>2012 Nobel
      in Economics</strong> (Roth and Shapley) followed. The rare
      algorithm whose deployment record is measured in careers and
      organs.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>proposal rounds</strong>: every unmatched
      proposer works down their list, one proposal at a time, and
      the process runs until no one is left proposing. Each proposal
      is a fresh (proposer, receiver) pair, so the total can never
      exceed n²: counted and asserted on all 300 instances. What the
      rounds produce depends entirely on what receivers do with the
      offers: which is where the whole theorem stack lives.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>deferred acceptance</strong>: a receiver never
      says yes: only &quot;you may stay, for now&quot;: holding the
      best offer so far and releasing it the moment someone better
      calls. Rejections are forever; acceptances are provisional
      until the music stops. That single asymmetry yields the
      enumerated theorems: the outcome is <em>stable</em> (zero
      blocking pairs, 300/300), <em>proposer-optimal</em> and{' '}
      <em>receiver-pessimal</em> against every stable matching that
      exists (checked exhaustively, 60 instances, 25 with multiple
      stable matchings): and proposing measured worth{' '}
      <strong>3.01 ranks</strong> at n = 20.
    </p>
  ),

  picture: (
    <p>
      A dance where nobody sits down until the music stops. Suitors
      cross the floor in order of their hearts; each recipient keeps
      exactly one hand held: the best so far: and drops it without
      sentiment when a better offer arrives. The dropped suitor
      crosses to their next choice; nobody re-proposes where
      they&apos;ve been refused. When the floor quiets, look around:
      any two people who secretly prefer each other would have
      found each other: he would have proposed (he goes in order),
      and she would have held him (she keeps the best). The
      quiet <em>is</em> the proof of stability: and the asymmetry is
      real: the crossing side ends near the top of its list, the
      holding side near the bottom of what stability allows.
    </p>
  ),

  steps: [
    <>
      <strong>Propose in order:</strong> every unmatched proposer
      approaches the best receiver not yet refused them.
    </>,
    <>
      <strong>Hold, never accept:</strong> the receiver keeps the
      better of holder and newcomer: the other re-enters the pool.
    </>,
    <>
      <strong>Rejections are forever:</strong> each pair meets at
      most once: at most n² proposals (asserted).
    </>,
    <>
      <strong>Stop at silence:</strong> no unmatched proposer with
      names left: the matching stands, and it is stable.
    </>,
    <>
      <strong>Know which side you are:</strong> the outcome is
      proposer-optimal and receiver-pessimal: enumerated here, not
      recited: choose the proposing side when you can.
    </>,
  ],

  signals: [
    <>
      <strong>Both sides have preferences:</strong> residents and
      hospitals, students and schools: not a cost to minimize but
      opinions to reconcile.
    </>,
    <>
      <strong>Defection is the failure mode:</strong> the matching
      must survive participants comparing notes afterward: stability
      is a no-regrets contract.
    </>,
    <>
      <strong>The market repeats:</strong> annual matches, term
      systems: an unstable mechanism unravels into side deals and
      exploding offers: the pre-1952 residency chaos.
    </>,
  ],
  baseline: (
    <>
      The honest baselines are what markets do without the theorem.{' '}
      <strong>Random matching</strong>: 90 of 380 cross pairs would
      elope (measured). <strong>Rank-greedy</strong>: repeatedly
      seize the best mutual pair: locally lovely and still
      combustible: 6 blocking pairs on the client instance. Deferred
      acceptance: zero, on all 300 instances: the difference between
      pairing people up and clearing a market.
    </>
  ),

  strength: (
    <>
      <strong>Stability with the theorems enumerated.</strong> Zero
      blocking pairs on 300/300 instances (every n² pair checked);
      membership in the exhaustively enumerated stable set on all 60
      small instances; proposer-optimality and receiver-pessimality
      verified against <em>every</em> stable matching, not asserted
      from the paper; proposals within n² everywhere; and the
      propose-vs-receive edge measured at 3.01 ranks: theory made
      countable.
    </>
  ),
  weakness: (
    <>
      <strong>Stable is not fair, optimal, or honest-proof.</strong>{' '}
      The mechanism is systematically partial: proposer-optimal
      means receiver-pessimal, measured as a 3-rank gap: the choice
      of proposing side is a policy decision wearing a technical
      mask (the NRMP flipped it to applicant-proposing in 1997 for
      exactly this reason). Receivers can profitably misreport
      preferences (only proposers have truthfulness guaranteed).
      And total-welfare questions: minimize summed rank: belong to
      the live Hungarian unit&apos;s mathematics, not this one:
      stability and efficiency genuinely diverge.
    </>
  ),

  problem: 'Stable matching',
  problemSlug: 'stable-matching',
  rivals: [
    {
      name: 'Gale-Shapley × deferral',
      isThisUnit: true,
      algoName: 'Gale-Shapley',
      cost: 'O(n²)',
      wins: (
        <>
          <strong>Zero blocking pairs, guaranteed</strong>: with the
          optimal/pessimal structure enumerated and the n² proposal
          bound counted: the Nobel-vetted market-clearing default.
        </>
      ),
      costs: (
        <>
          Systematically partial to the proposing side (3.01 ranks
          measured), and receivers can game it.
        </>
      ),
      when: 'Two-sided markets that must not unravel: residencies, school choice, hiring rounds.',
    },
    {
      name: 'Hungarian × tight edges',
      algoName: 'Hungarian algorithm',
      cost: 'O(n³)',
      wins: (
        <>
          The live unit one page over: when preferences are{' '}
          <em>costs</em> and the objective is total welfare, it
          certifies the minimum-sum assignment: a different question,
          perfectly answered.
        </>
      ),
      costs: (
        <>
          Its optimum can be wildly unstable: pairs may prefer each
          other to their welfare-optimal partners and defect.
        </>
      ),
      when: 'One decision-maker paying all the costs: dispatch, not markets.',
    },
    {
      name: "Irving's algorithm",
      algoName: "Irving's algorithm",
      cost: 'O(n²)',
      wins: (
        <>
          Stability without the aisle: one pool, everyone ranking
          everyone (roommates): phase two&apos;s rotations decide
          existence, which is no longer guaranteed.
        </>
      ),
      costs: (
        <>
          A stable matching may simply not exist: the two-sided
          structure was doing more work than it looked.
        </>
      ),
      when: 'Single-pool pairing: roommates, chess pairings, P2P partnerships.',
    },
    {
      name: 'Top trading cycles',
      algoName: 'Top trading cycles',
      cost: 'O(n²)',
      wins: (
        <>
          The one-sided cousin: endowed goods (houses, kidneys),
          point-and-trade cycles: Pareto-efficient AND
          strategy-proof, which two-sided stability cannot combine.
        </>
      ),
      costs: (
        <>
          Only one side has preferences: the goods do not vote: a
          different market entirely.
        </>
      ),
      when: 'Allocation with endowments: kidney exchange chains, housing swaps.',
    },
  ],
  neverUse: {
    name: 'Shipping an unstable matching',
    why: (
      <>
        The naive pairings look fine on the day they are announced.
        Measured here: a random matching carries <strong>90 blocking
        pairs</strong>: ninety applicant-program couples who both
        prefer each other to their assignments: and even the
        plausible rank-greedy heuristic carries 6. Each one is a
        phone call waiting to happen: and in repeated markets the
        calls compound into the pre-1952 residency pathology:
        exploding offers, matches made two years early, everyone
        worse off. Stability is not aesthetics: it is the property
        that the announcement <em>survives contact with the
        participants</em>. A matching mechanism that leaves blocking
        pairs is not a lesser solution: it is kindling: and the
        market it serves will eventually burn it down and rebuild
        deferred acceptance, the way medicine, law clerkships, and
        school districts each separately did.
      </>
    ),
  },

  contest: {
    instance:
      'match 20 applicants to 20 programs, full preference lists; referee: every stable matching enumerated at n ≤ 6, blocking pairs counted on all n² pairs everywhere',
    columns: ['blocking pairs', 'nature'],
    rows: [
      {
        method: 'Random matching',
        values: ['90.4', 'kindling'],
        verdict: '90 of 380 cross pairs would elope on contact',
      },
      {
        method: 'Rank-greedy pairing',
        values: ['6', 'combustible'],
        verdict: 'locally lovely: the best mutual pairs first, and still it burns',
      },
      {
        method: 'Deferred acceptance',
        isThisUnit: true,
        values: ['0', 'stable'],
        best: 0,
        verdict: 'zero on 300/300 instances: the announcement survives the participants',
      },
    ],
    source:
      "python solutions/gale_shapley_deferred_acceptance.py prints this table and asserts: zero blocking pairs on 300 instances with proposals ≤ n²; GS's outcome inside the exhaustively enumerated stable set on 60 small instances (25 with multiple stable matchings), proposer-optimal and receiver-pessimal against every member; the propose-vs-receive edge at n = 20 measured (average partner rank 2.20 proposing vs 5.21 receiving = 3.01 ranks); and the naive rivals counted (random 90.4, rank-greedy 6).",
  },

  figure: (
    <Figure
      id="fig-deferred-acceptance"
      aspect="16 / 7"
      caption="Held, never accepted. Proposers work down their lists; each receiver keeps exactly one hand held: the best offer so far: and drops it without sentiment when better arrives. Rejections are forever, holds are provisional, and when the floor quiets the silence is the proof: any pair preferring each other would have found each other. The asymmetry is a theorem, enumerated on this page: the proposing side ends optimal, the holding side pessimal, among all stable matchings: worth 3.01 ranks at n = 20."
      cite={{
        text: 'Gale & Shapley, "College Admissions and the Stability of Marriage", American Mathematical Monthly 69(1), 1962: seven citation-free pages that founded matching theory; Roth deployed it (NRMP 1997 redesign, kidney exchange), and the 2012 Nobel followed.',
        href: 'https://doi.org/10.2307/2312726',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Proposers on the left crossing to receivers on the right, one held hand per receiver, one rejection bouncing back">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <circle cx={90} cy={60 + i * 56} r={13} fill="none" stroke="#5da2ff" strokeWidth="2" />
            <text x={84} y={65 + i * 56} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">{`a${i + 1}`}</text>
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <circle cx={550} cy={60 + i * 56} r={13} fill="none" stroke="#8b95ad" strokeWidth="2" />
            <text x={543} y={65 + i * 56} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{`p${i + 1}`}</text>
          </g>
        ))}
        <line x1="105" y1="60" x2="535" y2="116" stroke="#62d98a" strokeWidth="2" />
        <line x1="105" y1="116" x2="535" y2="60" stroke="#62d98a" strokeWidth="2" />
        <line x1="105" y1="172" x2="535" y2="172" stroke="#f0b94b" strokeWidth="1.8" strokeDasharray="6 4" />
        <text x="290" y="162" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">held, for now</text>
        <path d="M 105 228 C 300 240, 430 220, 535 176" fill="none" stroke="#e2606c" strokeWidth="1.6" strokeDasharray="4 4" />
        <text x="250" y="252" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">rejected: forever: a4 crosses to the next name</text>
        <text x="60" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">proposers go in heart-order · receivers hold exactly one hand · silence = stability</text>
        <text x="60" y="282" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 0 blocking pairs (300/300) · proposer-optimal, receiver-pessimal (enumerated) · proposing worth 3.01 ranks</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gale_shapley_deferred_acceptance.py',
  Viz: GaleShapleyViz,
  narration,
};
