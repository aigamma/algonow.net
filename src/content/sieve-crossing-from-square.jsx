import SieveViz from '../viz/SieveViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/sieve_crossing_from_square.py?raw';
import { narration } from './sieve-crossing-from-square.narration.js';

export const content = {
  given:
    'Every prime up to n: not one primality question but all of them at once.',
  task: 'The complete table, with a bill of n log log n: barely more than reading the numbers.',
  constraint:
    'Two independent judges audit every entry to 20,000 (trial division, and the live Miller-Rabin unit): the famous constants must land to the digit (π(10⁶) = 78,498; twin pairs 8,169): and the work bill must match Mertens’s theorem, measured here within 0.17%.',

  origins: (
    <p>
      The oldest named algorithm on this site by twenty-two
      centuries: <strong>Eratosthenes of Cyrene</strong>, chief
      librarian of Alexandria around 240 BC, who also measured the
      circumference of the Earth with a stick and a well. The sieve
      reaches us through Nicomachus&apos;s <em>Introduction to
      Arithmetic</em>: and never left: Bays and Hudson&apos;s 1977
      segmented form pushed it to 10¹², and every prime table behind
      modern number theory experiments: Goldbach checks, twin-prime
      hunts, zeta verifications: is still this sieve wearing cache
      optimizations.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>shared table</strong>: one boolean per number,
      and each discovered prime sweeps its multiples out of{' '}
      <em>everyone&apos;s</em> future at once. That pooling is the
      entire economics: no number is ever interrogated alone, so the
      total bill is Σ n/p over primes: which Mertens&apos;s theorem
      prices at n(ln ln √n + M): measured here at 2,197,839
      crossings against the predicted 2,194,142: <strong>0.17%</strong>:
      a nineteenth-century theorem invoiced to four digits.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>square rule</strong>: start each
      prime&apos;s sweep at p², because every smaller multiple of p
      has a factor smaller than p and was already swept. The saving
      is exact and asserted to the unit: <strong>75,791 crossings
      = Σ(p−2)</strong> over primes below √n: and the structural
      earnings are bigger than the arithmetic: p² being the first
      unswept multiple is <em>the proof</em> that the outer loop may
      stop at √n: the observation and the correctness argument are
      the same sentence.
    </p>
  ),

  picture: (
    <p>
      A hall of numbered doors, and no inspector. Two walks the hall
      slamming every second door after his own; three slams every
      third: and here is the rule&apos;s elegance: when five begins
      his walk, doors 10, 15, and 20 are already slammed: 10 by two,
      15 by three, 20 by two: his first <em>fresh</em> door is 25:
      his own square. Every walker starts at his square: and once
      the walkers past √n would start beyond the hall entirely, the
      remaining open doors are open forever. Nobody ever knocked to
      ask a door whether it was prime: the composites slammed
      themselves, each by its smallest factor&apos;s hand.
    </p>
  ),

  steps: [
    <>
      <strong>Table:</strong> one boolean per number, all standing
      open: 0 and 1 closed by convention.
    </>,
    <>
      <strong>Sweep:</strong> for each open p from 2, slam p², p²+p,
      p²+2p, … : the square rule.
    </>,
    <>
      <strong>Stop at √n:</strong> a composite ≤ n has a factor ≤
      √n: the square rule stated backward: the proof rides free.
    </>,
    <>
      <strong>Read the table:</strong> everything still open is
      prime: π(10⁶) = 78,498, to the digit.
    </>,
    <>
      <strong>Scale by segments:</strong> sieve [L, R) windows with
      the small primes: Bays-Hudson to 10¹², cache-sized blocks
      today.
    </>,
  ],

  signals: [
    <>
      <strong>All the primes, not one:</strong> tables, factorization
      sieves, number-theory experiments: enumeration is the actual
      question.
    </>,
    <>
      <strong>The range is dense and bounded:</strong> up-to-n is the
      sieve&apos;s home: one isolated 300-digit candidate is the
      live Miller-Rabin unit&apos;s.
    </>,
    <>
      <strong>Memory for n bits exists:</strong> a byte (or bit) per
      number: past RAM, segment: the structure the refinements all
      keep.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>trial division per number</strong>:
      2,745,694 divisions to clear 100,000 numbers, against the
      sieve&apos;s 193,078 crossings: <strong>14.2×</strong>: and the
      gap is philosophical before it is numerical: the divider
      interrogates each number alone; the sieve lets every prime do
      its damage to all of them at once. Pooled work is the whole
      trick, and log log n is its price tag.
    </>
  ),

  strength: (
    <>
      <strong>Judged twice everywhere, famous constants to the
      digit, and a theorem on the invoice.</strong> Trial division
      AND Miller-Rabin agree on every number to 20,000; π(10⁶) =
      78,498 and 8,169 twin pairs, exact; the Mertens bill within
      0.17%; the square rule&apos;s shave exact to the unit
      (Σ(p−2) = 75,791); and Goldbach verified for every even
      number to 20,000: the sieve as the substrate the experiments
      stand on.
    </>
  ),
  weakness: (
    <>
      <strong>Dense ranges only, memory-bound, and blind past its
      wall.</strong> The table costs n bits no matter how few primes
      you want from it: one candidate far out is Miller-Rabin&apos;s
      question. Cache misses, not arithmetic, bound real
      implementations (the segmented refinement exists for exactly
      this). And enumeration says nothing about <em>structure</em>:
      factoring a single hard composite is another shelf entirely.
    </>
  ),

  problem: 'Prime sieves and multiplicative tables',
  problemSlug: 'prime-sieves',
  rivals: [
    {
      name: 'Sieve × square rule',
      isThisUnit: true,
      algoName: 'Sieve of Eratosthenes',
      cost: 'O(n log log n)',
      wins: (
        <>
          <strong>All primes to n at 14.2× under trial division</strong>,
          the bill Mertens-priced to 0.17%, and a 2,260-year service
          record.
        </>
      ),
      costs: (
        <>
          n bits of table for any answer at all: the dense-range
          contract is absolute.
        </>
      ),
      when: 'Every prime up to a bound: tables, experiments, competition precomputes.',
    },
    {
      name: 'Miller-Rabin × witnesses',
      algoName: 'Miller-Rabin',
      cost: 'O(k log³ n) per number',
      wins: (
        <>
          The live unit and this page&apos;s second judge: one
          isolated candidate of any size, no table: the
          cryptographic workhorse.
        </>
      ),
      costs: (
        <>
          Per-number pricing: enumerating a dense range this way is
          the race this page runs and loses 14× before MR&apos;s
          exponents even enter.
        </>
      ),
      when: 'One big number, or sparse faraway candidates: the opposite contract.',
    },
    {
      name: 'Segmented sieve',
      algoName: 'Segmented sieve',
      cost: 'O(n log log n), O(√n) mem',
      wins: (
        <>
          The same sweep through a sliding window: √n memory, cache-
          sized blocks: Bays-Hudson&apos;s road to 10¹² and every
          serious implementation since.
        </>
      ),
      costs: (
        <>
          The small primes must be sieved first anyway: it is this
          unit wearing a window, not an alternative to it.
        </>
      ),
      when: 'Past RAM, or for primes in a far interval [L, R): the production form.',
    },
    {
      name: 'Sieve of Atkin',
      algoName: 'Sieve of Atkin',
      cost: 'O(n / log log n)',
      wins: (
        <>
          The asymptotic one-up: quadratic-form characters instead
          of sweeps: theoretically sublinear in the log log.
        </>
      ),
      costs: (
        <>
          Constants and complexity that lose to a wheeled, segmented
          Eratosthenes in nearly every benchmark that has ever been
          run.
        </>
      ),
      when: 'The asymptotics conversation: rarely the table you actually build.',
    },
  ],
  neverUse: {
    name: 'Trial-dividing a dense range',
    why: (
      <>
        Each number asks &quot;is anything my factor?&quot; and pays
        up to √x divisions to hear silence: measured here at{' '}
        <strong>2,745,694 divisions</strong> for 100,000 numbers,
        against 193,078 pooled crossings: 14.2×, and widening with n.
        The deeper error is architectural: the questions share
        almost all their work: every number is asking about the
        same small primes: and per-number testing rebuilds that
        shared answer from scratch, n times. It is the same failure
        the index units teach (rebuilding per query), wearing number
        theory&apos;s clothes. When the questions overlap, build
        the shared structure once: the sieve is that principle&apos;s
        oldest monument.
      </>
    ),
  },

  contest: {
    instance:
      'every prime to 100,000; referee: trial division AND the live Miller-Rabin unit agreeing on all numbers to 20,000, the famous constants exact, Mertens on the invoice',
    columns: ['ops', 'nature'],
    rows: [
      {
        method: 'Trial division per number',
        values: ['2,745,694', 'interrogation'],
        verdict: 'each number asked alone: the shared work rebuilt n times',
      },
      {
        method: 'Sieve, shared table',
        isThisUnit: true,
        values: ['193,078', 'pooled sweeps'],
        best: 0,
        verdict: 'composites cross themselves off: 14.2×, Mertens-priced to 0.17%',
      },
    ],
    source:
      "python solutions/sieve_crossing_from_square.py prints this table and asserts: sieve == trial division == Miller-Rabin on every number to 20,000; π(10⁶) = 78,498 and twin pairs 8,169, exact; naive crossings 2,197,839 vs the Mertens prediction 2,194,142 (0.17%); the square rule's shave exactly Σ(p−2) = 75,791 to the unit; the 14.2× race; and Goldbach verified for every even number to 20,000.",
  },

  figure: (
    <Figure
      id="fig-sieve-square"
      aspect="16 / 7"
      caption="Five's first fresh door is 25. When 5 begins its sweep, 10, 15, and 20 are already slammed by 2 and 3: every multiple below p² owns a smaller factor. Starting at the square saves exactly Σ(p−2) crossings: 75,791 at a million, asserted to the unit: and proves the deeper fact free of charge: once p² exceeds n, no sweep would touch anything: the outer loop stops at √n. The total bill obeys Mertens's theorem: n(ln ln √n + M): invoiced here at 0.17%."
      cite={{
        text: 'Eratosthenes of Cyrene, c. 240 BC, via Nicomachus. The modern form that scales: Bays & Hudson, "The segmented sieve of Eratosthenes and primes in arithmetic progressions to 10¹²", BIT 17, 1977.',
        href: 'https://doi.org/10.1007/BF01932283',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A number line with sweeps from 2 and 3 already covering the early multiples of 5, whose first fresh mark is 25">
        {Array.from({ length: 29 }, (_, i) => i + 2).map((v) => {
          const slam2 = v % 2 === 0 && v > 2;
          const slam3 = v % 3 === 0 && v > 3 && !slam2;
          const slam5 = v === 25;
          const prime = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29].includes(v);
          return (
            <g key={v}>
              <rect
                x={30 + (v - 2) * 21}
                y={90}
                width={18}
                height={26}
                fill={slam5 ? 'rgba(240,185,75,0.4)' : slam2 || slam3 ? '#232c44' : 'rgba(98,217,138,0.15)'}
                stroke={prime ? '#62d98a' : '#2a3450'}
                strokeWidth={prime ? 1.8 : 1}
              />
              <text x={33 + (v - 2) * 21} y={108} fill={prime ? '#62d98a' : slam5 ? '#f0b94b' : '#5a647d'} fontFamily="ui-monospace, monospace" fontSize="10">{v}</text>
            </g>
          );
        })}
        <text x="30" y="70" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">after 2 and 3 have swept: green doors open, dark doors slammed</text>
        <path d="M 96 150 C 200 190, 380 190, 512 122" fill="none" stroke="#f0b94b" strokeWidth="1.8" strokeDasharray="6 4" />
        <text x="220" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">5 walks past 10, 15, 20 (already slammed) to its square: 25</text>
        <text x="30" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the shave: exactly Σ(p−2) = 75,791 crossings at n = 10⁶ · the proof: past √n, every sweep starts beyond the hall</text>
        <text x="30" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: Mertens invoice 0.17% · π(10⁶) = 78,498 exact · trial division 14.2× dearer</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'sieve_crossing_from_square.py',
  Viz: SieveViz,
  narration,
};
