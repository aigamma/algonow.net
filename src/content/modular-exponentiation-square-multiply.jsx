import ModExpViz from '../viz/ModExpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/modular_exponentiation_square_multiply.py?raw';
import { narration } from './modular-exponentiation-square-multiply.narration.js';

export const content = {
  given:
    'A base, a 2048-bit exponent, a modulus: and the fact that every TLS handshake, RSA signature, and Diffie-Hellman agreement is exactly this computation.',
  task: 'Compute aᵉ mod m by reading the exponent in binary: square for every bit, multiply only on the 1s: three thousand operations where the naive ladder needs a number with 617 digits.',
  constraint:
    "The referee is Python's built-in pow: matched exactly on 3,006 triples up to 2048 bits, every edge case included. The count law is asserted exactly (squares = bit length − 1, multiplies = popcount − 1 on 500 exponents), and the naive ladder is actually run and counted where it can survive.",

  origins: (
    <p>
      Binary exponentiation is plausibly the oldest nontrivial
      algorithm still in production: Pingala&apos;s rules for
      Sanskrit meter (~200 BC) already halve the problem, and Knuth
      traces the method through al-Kashi to every era&apos;s
      arithmetic. It became load-bearing for civilization in{' '}
      <strong>1976</strong>, when Diffie and Hellman&apos;s &quot;New
      Directions in Cryptography&quot; built key exchange on modular
      exponentiation&apos;s one-way asymmetry: easy forward (this
      page: 3,091 operations at 2048 bits), believed hard backward
      (discrete log). RSA followed in 1977. The modern chapters are
      about the <em>side channels</em>: Kocher&apos;s 1996 timing
      attacks read exponent bits from running time, and
      constant-time ladders became a security requirement, not a
      style choice.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>modular frame</strong>: reduce after every
      operation, so intermediates never exceed m² and 2048-bit work
      stays 2048-bit work (compute aᵉ first and the intermediate
      for a 2048-bit exponent would not fit in the observable
      universe). Owns correctness at the edges: e = 0, m = 1, the
      identities: all matched against pow on 3,006 triples. And
      owns the clients: Miller-Rabin primality (which itself rides
      this loop), RSA round-tripping 50 messages through 512-bit
      primes, and 100 Diffie-Hellman handshakes agreeing on both
      sides.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>binary reading</strong>: scan the
      exponent&apos;s bits left to right: square the accumulator
      for every bit, multiply by a on each 1. The count law is
      exact and asserted: bit_length − 1 squares, popcount − 1
      multiplies: <strong>29 operations for e ≈ 10⁶</strong>{' '}
      (measured against the naive ladder&apos;s 999,983: 34,482×)
      and 3,091 at 2048 bits. The fine print is a security fact:
      that count <em>depends on the exponent&apos;s 1s</em>:
      measured here as a 493-operation gap between same-length
      exponents: which is the leak Kocher exploited, and the
      Montgomery ladder seals.
    </p>
  ),

  picture: (
    <p>
      To carry water a million floors up, you could climb one floor
      a million times: or take the express elevator that doubles
      its floor with every press, stepping off to walk single
      floors only where the destination&apos;s binary digits say
      so. Twenty presses and a handful of steps reach the
      millionth floor. The modulus is the building&apos;s trick
      door: every floor number is taken mod m, so the elevator car
      never leaves a small lobby no matter how high the nominal
      floor: the numbers stay pocket-sized while the exponent
      soars. And the surveillance camera in the lobby counts your
      single-floor steps: walk a different number of them and a
      watcher learns your destination&apos;s digits: unless you
      walk every floor&apos;s worth of steps regardless, which is
      the ladder&apos;s discipline.
    </p>
  ),

  steps: [
    <>
      <strong>Reduce always:</strong> every square and multiply is
      followed by mod m: intermediates stay bounded, 2048-bit work
      stays 2048-bit.
    </>,
    <>
      <strong>Read the bits:</strong> left to right after the
      leading 1: square per bit, multiply per 1.
    </>,
    <>
      <strong>Trust the count law:</strong> bit_length − 1 squares
      plus popcount − 1 multiplies: asserted exactly on 500
      exponents.
    </>,
    <>
      <strong>Mind the leak:</strong> that count reads the
      exponent&apos;s 1s aloud (493-op gap measured): secrets
      demand the ladder&apos;s fixed rhythm.
    </>,
    <>
      <strong>Build upward:</strong> Miller-Rabin, RSA, and
      Diffie-Hellman are this loop called in anger: all three run
      and round-trip on this page.
    </>,
  ],

  signals: [
    <>
      <strong>Huge exponents, bounded arithmetic:</strong> crypto,
      primality testing, hashing to groups: anywhere aᵉ mod m
      appears with e past a few thousand.
    </>,
    <>
      <strong>Any associative operation:</strong> the trick is
      about repeated squaring, not numbers: matrix powers
      (Fibonacci in O(log n)), permutation powers, function
      iteration all ride the same bits.
    </>,
    <>
      <strong>The exponent is a secret:</strong> then the operation
      count is a broadcast: reach for the constant-time ladder and
      never branch on a key bit.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive ladder</strong>:
      e − 1 multiplications: run here in full at e = 999,983
      (999,983 multiplications, counted) against
      square-and-multiply&apos;s 29: 34,482×. At 2048 bits the
      baseline&apos;s count is a 617-digit number: not slow:
      cosmologically impossible: the gap between O(e) and O(log e)
      is the gap on which public-key cryptography stands.
    </>
  ),

  strength: (
    <>
      <strong>Exact against the standard library, with the law and
      the leak both counted.</strong> 3,006 matches against pow up
      to 2048 bits; the count law exact on 500 exponents; the
      naive ladder executed and beaten 34,482× where it could
      survive; the popcount leak measured as exactly the popcount
      gap (493 ops) and sealed by the ladder&apos;s identical
      counts; RSA and Diffie-Hellman round-tripping on top.
    </>
  ),
  weakness: (
    <>
      <strong>The plain form reads secrets aloud, and log e is not
      free.</strong> Square-and-multiply&apos;s data-dependent
      count (and, in real silicon, its data-dependent branches and
      cache traffic) is the classic timing side channel: Kocher
      1996: production crypto uses Montgomery ladders, fixed
      windows, and blinding, paying up to 2× the operations for
      silence. Each 2048-bit multiplication is itself expensive
      (Montgomery multiplication, Karatsuba and friends: the live
      Toom-Cook unit&apos;s territory): the 3,091 operations are
      3,091 big-number multiplications, not machine instructions.
      And for fixed bases or batch exponentiations, windowed and
      precomputed-table methods beat the plain binary scan.
    </>
  ),

  problem: 'Modular arithmetic',
  problemSlug: 'modular-arithmetic',
  rivals: [
    {
      name: 'Square-and-multiply',
      isThisUnit: true,
      algoName: 'Modular exponentiation',
      cost: '~1.5 log e mults',
      wins: (
        <>
          <strong>The count law</strong>: log-many operations,
          exact and asserted: the loop under every handshake on
          the internet.
        </>
      ),
      costs: (
        <>
          The count depends on the key&apos;s 1s: a measured 493-op
          broadcast when the exponent is a secret.
        </>
      ),
      when: 'The default for public exponents and any associative power: matrices, permutations, group elements.',
    },
    {
      name: 'Montgomery ladder',
      algoName: 'Modular exponentiation',
      cost: '2 log e mults',
      wins: (
        <>
          Every bit pays a square AND a multiply: counts identical
          for all same-length exponents (asserted): the timing
          leak sealed by construction, and the standard on smart
          cards and ECC.
        </>
      ),
      costs: (
        <>
          Up to 2× the plain form&apos;s operations: silence is
          bought, not free.
        </>
      ),
      when: 'Whenever the exponent is a key: constant-time is a security requirement, not a style.',
    },
    {
      name: 'Fixed-window exponentiation',
      algoName: 'Modular exponentiation',
      cost: 'log e / w mults + 2ʷ table',
      wins: (
        <>
          Precompute a¹..a^(2ʷ−1): then one multiply per w-bit
          window: fewer multiplies than binary for the same
          exponent, and constant-time variants exist.
        </>
      ),
      costs: (
        <>
          The table costs memory and setup: worthless for a
          one-shot power, decisive for RSA signing with a fixed
          key.
        </>
      ),
      when: 'Repeated exponentiations with one base or one modulus: amortize the table, win every call.',
    },
    {
      name: 'Pollard rho for dlog',
      algoName: "Pollard's rho",
      cost: 'O(√p) group ops',
      wins: (
        <>
          The adversary&apos;s road, priced: inverting this
          page&apos;s function (discrete log) costs the live rho
          unit&apos;s √p random walk: 2¹²⁸ work at comfortable
          sizes.
        </>
      ),
      costs: (
        <>
          That price IS the security margin: forward 3,091 ops,
          backward 10³⁸: the asymmetry is the product.
        </>
      ),
      when: 'Never as an implementation choice: always as the reason the key sizes are what they are.',
    },
  ],
  neverUse: {
    name: 'Branch-on-secret in production crypto',
    why: (
      <>
        Shipping textbook square-and-multiply with a secret
        exponent is publishing the key at acoustic volume. The
        operation count differs by exactly the popcount (measured:
        493 operations between same-length exponents), the
        branches differ per bit, and the cache traffic differs per
        window: Kocher read RSA keys from timing in 1996, and
        power-analysis rigs read smart cards the same way. This is
        the site&apos;s recurring lesson wearing its
        highest-stakes costume: an implementation detail invisible
        to correctness testing (all 3,006 referee matches pass
        either way!) is the entire vulnerability. Correct output
        is not the only observable: time, power, and cache are
        outputs too, and the ladder exists because of it.
      </>
    ),
  },

  contest: {
    instance:
      "aᵉ mod m at 2048 bits; referee: Python's built-in pow, matched exactly on 3,006 triples including every edge case",
    columns: ['ops at e ≈ 10⁶', 'ops at 2048 bits'],
    rows: [
      {
        method: 'Naive ladder',
        values: ['999,983', '~10⁶¹⁷'],
        verdict: 'e − 1 multiplications: run only where survivable',
      },
      {
        method: 'Square-and-multiply',
        isThisUnit: true,
        values: ['29', '3,091'],
        best: 0,
        verdict: 'squares per bit, multiplies per 1: 34,482× measured',
      },
      {
        method: 'Montgomery ladder',
        values: ['40', '4,096'],
        verdict: 'every bit pays both: the count leaks only the length',
      },
    ],
    source:
      "python solutions/modular_exponentiation_square_multiply.py prints this table and asserts: square-and-multiply and the Montgomery ladder equal to pow on 3,006 triples up to 2048 bits with all edge cases; the count law exact on 500 exponents (squares = bit_length − 1, multiplies = popcount − 1); the naive ladder executed in full at e = 999,983 and beaten above 20,000× (measured 34,482×); the leak counted (same 1024-bit length, popcount 3 vs 496: an op gap of exactly 493) and sealed (ladder counts identical); RSA over 512-bit Miller-Rabin primes round-tripping 50 messages; and 100 Diffie-Hellman handshakes agreeing on both sides and matching g^(ab).",
  },

  figure: (
    <Figure
      id="fig-modexp-bits"
      aspect="16 / 7"
      caption="The exponent read as binary. Each bit costs one squaring; each 1 costs one extra multiply; the modulus keeps every intermediate pocket-sized. The count law is exact: bit_length − 1 squares plus popcount − 1 multiplies: 3,091 operations at 2048 bits where the naive ladder's count is a 617-digit number. The same law is the leak: the count reads the exponent's 1s aloud (493-op gap measured between same-length keys), which is why secret exponents ride the Montgomery ladder's fixed rhythm instead."
      cite={{
        text: 'Diffie & Hellman, "New Directions in Cryptography", IEEE Trans. Information Theory 22(6), 1976: key exchange built on this loop\'s one-way asymmetry: easy forward, believed hard backward.',
        href: 'https://doi.org/10.1109/TIT.1976.1055638',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An exponent in binary with square and multiply operations per bit, and the count comparison">
        {['1', '0', '1', '1', '0', '1'].map((b, i) => (
          <g key={i}>
            <rect x={60 + i * 60} y={40} width={44} height={34} fill={b === '1' ? 'rgba(240,185,75,0.35)' : 'rgba(93,162,255,0.18)'} stroke={b === '1' ? '#f0b94b' : '#5da2ff'} strokeWidth="1.6" />
            <text x={78 + i * 60} y={63} fill={b === '1' ? '#f0b94b' : '#5da2ff'} fontFamily="ui-monospace, monospace" fontSize="15">{b}</text>
            {i > 0 && (
              <text x={66 + i * 60} y={94} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">SQ{b === '1' ? '+M' : ''}</text>
            )}
          </g>
        ))}
        <text x="60" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">e = 45: five squares, three multiplies: 3⁴⁵ mod m in eight ops, not forty-four</text>
        <text x="60" y="156" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the law, asserted: squares = bit_length − 1 · multiplies = popcount − 1</text>
        <text x="60" y="180" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: e ≈ 10⁶: naive 999,983 vs 29 (34,482×) · 2048 bits: 3,091 vs a 617-digit count</text>
        <text x="60" y="216" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the leak: same length, popcount 3 vs 496: 1,025 vs 1,518 ops: the count spells the key</text>
        <text x="60" y="240" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the seal: Montgomery ladder: 2,048 ops for both, identical: silence costs 2×</text>
        <text x="60" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">clients run: RSA (512-bit MR primes, 50 round-trips) · Diffie-Hellman (100 handshakes agreeing)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'modular_exponentiation_square_multiply.py',
  Viz: ModExpViz,
  narration,
};
