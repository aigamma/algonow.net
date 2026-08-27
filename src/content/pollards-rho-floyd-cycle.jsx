import PollardViz from '../viz/PollardViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/pollards_rho_floyd_cycle.py?raw';
import { narration } from './pollards-rho-floyd-cycle.narration.js';

export const content = {
  given:
    'A composite n that Miller-Rabin (a live unit) has already condemned: composite, certainly: factor unknown.',
  task: 'A nontrivial factor: without dividing by candidates, and without storing the walk.',
  constraint:
    'Trial division marches to the smallest factor one candidate at a time: 999,979 ops on the client. The walk must beat that by the birthday paradox: and every recovered factor is checked by multiplication, every full factorization rebuilt to n with Miller-Rabin-certified prime parts.',

  origins: (
    <p>
      John Pollard, <strong>1975</strong>, in BIT: &quot;A Monte
      Carlo method for factorization&quot;: four pages that made
      randomness a factoring tool. The walk&apos;s trace: a tail
      into a loop: draws the Greek letter <strong>ρ</strong>, and
      the name stuck. Richard Brent&apos;s 1980 refinement (batched
      gcds, a teleporting hare) is raced below at its
      literature-famous ~25% saving: measured here at 26%. The rho
      idea seeded a family: Pollard&apos;s kangaroos for discrete
      logs, and the parallel rho attacks that size elliptic-curve
      keys today.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rho walk</strong>: iterate x → x² + c mod n.
      The trick is what happens modulo the <em>unseen</em> prime
      factor p: there the sequence lives in only p states, so the
      birthday paradox forces a self-collision within ~√p steps.
      Collision mod p with distinct values mod n means
      gcd(x − y, n) exposes p. Measured as a scale law: p grown
      100×, mean steps grew <strong>9.4×</strong> against the √-law&apos;s
      predicted 10: the birthday paradox, invoiced.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>Floyd&apos;s cycle detection</strong>: the
      tortoise and the hare: one walker at single speed, one at
      double: guaranteed to meet inside any cycle, while storing{' '}
      <em>nothing</em>: constant memory where the naive
      remember-everything set holds √p states. Each step gcds
      |tortoise − hare| against n; a gcd strictly between 1 and n
      is the factor. Brent&apos;s variant teleports the hare to
      powers of two and batches the gcds: <strong>26% fewer
      f-evaluations</strong> on the same 60 semiprimes, counted.
    </p>
  ),

  picture: (
    <p>
      A runner on a foggy track shaped like a ρ: a stretch of
      straightaway, then a loop forever. You cannot see the track:
      only the runner&apos;s wristwatch numbers as they pass. Send
      two runners, one twice as fast: if there is a loop of any
      size, the fast one laps the slow one: no map, no memory, no
      markers dropped. Pollard&apos;s twist: the track modulo n
      looks endless, but modulo the hidden factor p it is a small ρ
      with only p positions: the runners collide <em>in
      p&apos;s shadow world</em> while still apart in n&apos;s, and
      the gcd of their distance reads the shadow&apos;s name off
      the collision.
    </p>
  ),

  steps: [
    <>
      <strong>Walk:</strong> x → x² + c mod n, from x = 2, with a
      random c.
    </>,
    <>
      <strong>Race:</strong> tortoise one step, hare two: constant
      memory, no stored history.
    </>,
    <>
      <strong>Listen:</strong> g = gcd(|tortoise − hare|, n): 1 keep
      walking; strictly between: <em>the factor</em>; n: retry with
      fresh c.
    </>,
    <>
      <strong>Recurse:</strong> split n, Miller-Rabin each part,
      rho the composites: full factorization, rebuilt and checked.
    </>,
    <>
      <strong>Batch when counting evals:</strong> Brent&apos;s
      teleport-and-batch: 26% measured: the production form.
    </>,
  ],

  signals: [
    <>
      <strong>Composite confirmed, factor wanted:</strong> the exact
      handoff from the live Miller-Rabin unit: certainty of guilt,
      identity unknown.
    </>,
    <>
      <strong>The smallest factor is mid-sized:</strong> √p steps
      beats trial division&apos;s p march: the 10⁶ factor fell in
      169 steps here.
    </>,
    <>
      <strong>Memory is nothing:</strong> two integers and a gcd:
      firmware, contest, or embedded settings where √p storage is
      absurd.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>trial division</strong>:
      999,979 candidate divisions to reach the client&apos;s
      smallest factor, against the walk&apos;s 169 steps:
      5,917× on this instance, and √p-vs-p in law. The honest
      ceiling: past ~10¹⁵, the quadratic sieve and ECM take over:
      rho&apos;s kingdom is the wide middle where factors are real
      but not cryptographic.
    </>
  ),

  strength: (
    <>
      <strong>The birthday paradox on the invoice, and nothing
      trusted.</strong> Every factor multiplication-checked (300
      semiprimes); every full factorization rebuilt to n with
      MR-certified parts (200 numbers to 10¹²); the √p scale law
      measured at 9.4× per 100× (predicted 10); Brent&apos;s
      refinement counted at 26% (literature: ~25%); and the c = 0
      folklore corrected by measurement: zero failures, but a 4.2×
      step tax: structure was expensive, not fatal.
    </>
  ),
  weakness: (
    <>
      <strong>Probabilistic patience, and a hard ceiling.</strong>{' '}
      The walk can collide mod every factor at once (gcd = n):
      retry with fresh c: runtimes are distributions, not promises
      (this page&apos;s 169-step crack was a lucky draw against a
      ~1,000-step expectation). Against balanced semiprimes with
      both factors past ~10⁸, √p stops being mercy: RSA moduli
      shrug at rho, by design: the quadratic sieve and ECM shelf
      begins where this unit&apos;s birthday runs out.
    </>
  ),

  problem: 'Integer factorization',
  problemSlug: 'integer-factorization',
  rivals: [
    {
      name: 'Rho × tortoise-hare',
      isThisUnit: true,
      algoName: "Pollard's rho",
      cost: 'O(√p) expected',
      wins: (
        <>
          <strong>169 steps where trial division marches 999,979</strong>:
          two integers of memory, the √p law measured, and Brent&apos;s
          26% on top.
        </>
      ),
      costs: (
        <>
          Probabilistic runtimes, retry-on-n gcds, and helpless past
          ~10¹⁵ balanced semiprimes.
        </>
      ),
      when: 'Mid-sized factors after a compositeness verdict: contests, tool internals, CTFs.',
    },
    {
      name: 'Trial division × wheel',
      algoName: 'Trial division',
      cost: 'O(p) to the factor',
      wins: (
        <>
          Deterministic, ordered, and it <em>proves</em> minimality:
          the right opener for small factors and the wheel strips
          2-3-5 for free.
        </>
      ),
      costs: (
        <>
          Marches candidate by candidate: 5,917× the client&apos;s
          bill: dead by 10⁷ where rho strolls.
        </>
      ),
      when: 'Stripping small factors first: every serious factorizer opens with it.',
    },
    {
      name: 'Miller-Rabin × witnesses',
      algoName: 'Miller-Rabin',
      cost: 'O(k log³ n)',
      wins: (
        <>
          The live unit upstream: certifies <em>composite</em> in
          milliseconds at any size: the verdict that dispatches this
          unit.
        </>
      ),
      costs: (
        <>
          Names no factor, ever: the witness proves guilt without
          identifying an accomplice.
        </>
      ),
      when: 'Always first: test, then factor: the pipeline this shelf forms.',
    },
    {
      name: 'Quadratic sieve',
      algoName: 'Quadratic sieve',
      cost: 'subexponential',
      wins: (
        <>
          The heavy artillery: smooth relations and linear algebra:
          where balanced 30-digit semiprimes stop being a wall.
        </>
      ),
      costs: (
        <>
          A factory, not a pocketknife: sieving arrays, matrix
          steps: nothing you rederive under pressure.
        </>
      ),
      when: 'Past rho’s birthday: the serious-factorization shelf (with ECM beside it).',
    },
  ],
  neverUse: {
    name: 'Reading rho’s clock as a deadline',
    why: (
      <>
        The expected bill is ~√p: the <em>distribution</em> is wide.
        This page&apos;s 12-digit client fell in 169 steps against a
        ~1,000-step expectation: a 6× lucky draw: and the same
        instance on another c can run 5× long, or collide mod every
        factor at once and demand a restart. Sizing a timeout, a
        contest submission, or a batch job to the mean is how rho
        &quot;randomly&quot; fails in production: the tail is the
        spec. Engineer for the distribution: retry loops with fresh
        c (this page&apos;s factor_of), budgets set at multiples of
        √p, and Brent&apos;s form when evaluations are the scarce
        resource. Randomized runtimes are contracts about
        averages: never about your run.
      </>
    ),
  },

  contest: {
    instance:
      'factor the 12-digit semiprime 999,983 × 999,979; referee: every factor verified by multiplication, full factorizations rebuilt to n with MR-certified prime parts',
    columns: ['ops', 'nature'],
    rows: [
      {
        method: 'Trial division',
        values: ['999,979', 'a march'],
        verdict: 'one candidate at a time, to the smallest factor',
      },
      {
        method: 'Rho + Floyd',
        isThisUnit: true,
        values: ['169', 'a birthday'],
        best: 0,
        verdict: 'the paradox does the searching: 5,917× fewer (a lucky draw against ~√p)',
      },
      {
        method: 'Rho + Brent',
        values: ['26% fewer evals', 'batched'],
        verdict: 'the teleporting hare: the literature’s ~25%, measured at 26%',
      },
    ],
    source:
      "python solutions/pollards_rho_floyd_cycle.py prints this table and asserts: 300 semiprime factors multiplication-checked; 200 full factorizations to 10¹² rebuilt exactly with every part Miller-Rabin-certified; the √p scale law (p grown 100× → mean steps 9.4×, predicted 10×, over 80 semiprimes); Brent under Floyd on f-evals (60,424 vs 81,117); the c = 0 folklore corrected (zero failures in 60, but a 4.2× step tax, asserted > 3×); and the textbook 8051 = 83 × 97 plus the 12-digit client cracked.",
  },

  figure: (
    <Figure
      id="fig-rho-track"
      aspect="16 / 7"
      caption="The track spells ρ. Modulo n the walk looks endless; modulo the hidden factor p it has only p positions: a tail into a loop, forced to self-collide within ~√p steps by the birthday paradox. The tortoise and hare meet inside the loop with zero memory, and gcd(|x − y|, n) reads the hidden factor off a collision that happened in p's shadow world while the walkers were still far apart in n's. Measured: 100× the factor, 9.4× the steps: the √ law on the invoice."
      cite={{
        text: 'Pollard, "A Monte Carlo Method for Factorization", BIT 15, 1975: four pages that made randomness a factoring tool; Brent\'s 1980 batched variant measured here at its famous ~25%.',
        href: 'https://doi.org/10.1007/BF01933667',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A rho-shaped track with tail and loop, tortoise and hare markers, and the gcd readout">
        <path d="M 80 240 C 150 200, 200 170, 250 140" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        <ellipse cx="360" cy="110" rx="115" ry="70" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        <circle cx="292" cy="152" r="7" fill="#f0b94b" />
        <text x="252" y="180" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">tortoise</text>
        <circle cx="452" cy="80" r="7" fill="#62d98a" />
        <text x="466" y="72" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">hare (2×)</text>
        <text x="70" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the tail: ~√p steps in · the loop: ~√p around · mod p there are only p places to stand</text>
        <text x="330" y="228" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">meet ⇒ gcd(|x−y|, n) = p</text>
        <text x="70" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 100× the factor → 9.4× the steps (law: 10×) · Brent −26% evals · c = 0: a 4.2× tax, not a failure</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'pollards_rho_floyd_cycle.py',
  Viz: PollardViz,
  narration,
};
