import MillerRabinViz from '../viz/MillerRabinViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/miller_rabin_witness_rounds.py?raw';
import { narration } from './miller-rabin-witness-rounds.narration.js';

export const content = {
  given:
    'An odd integer n, possibly thousands of bits long.',
  task: 'Decide prime or composite, without factoring, with an error probability you choose.',
  constraint:
    'Cost must stay polynomial in the number of digits. Factoring is hopeless at cryptographic sizes (the measured never-use below), yet every RSA key ever issued needed two fresh primes: this test is how they are born.',

  origins: (
    <p>
      Fermat&apos;s 1640 little theorem gave the first filter: if n is
      prime, then a<sup>n−1</sup> ≡ 1. By <strong>1910</strong> Carmichael
      had found its blind spot: composites that pass for{' '}
      <em>every</em> coprime base (561 is the smallest, verified
      exhaustively below). Gary Miller strengthened the test in{' '}
      <strong>1976</strong>, deterministic if the extended Riemann
      hypothesis holds; Solovay and Strassen showed in 1977 that
      randomness could replace the hypothesis; and Michael Rabin proved in{' '}
      <strong>1980</strong> that Miller&apos;s version needs no hypothesis
      at all: at most a quarter of bases lie for any odd composite. AKS
      settled the theory in 2002 (primality is in P), but the keys
      protecting this page were still minted by witness rounds.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>strong chain</strong>. Write n−1 = 2<sup>s</sup>·d
      with d odd, compute a<sup>d</sup>, then square s times. If n is
      prime, arithmetic mod n is a field, and a field allows only ±1 as
      square roots of 1: so the chain must enter the run of 1s through
      the front door, −1, or start there. A chain that reaches 1{' '}
      <em>from a stranger</em> has exhibited a nontrivial square root of
      1: a certificate that n is composite, no factor needed. The
      &quot;composite&quot; verdict is a proof, always.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>witness lottery</strong>. Rabin&apos;s theorem:
      for any odd composite, at most (n−1)/4 bases fail to expose it, so
      k random witnesses drive the error below 4<sup>−k</sup>. This page
      does not assume the bound: it tries <em>every</em> base on{' '}
      <em>every</em> strong pseudoprime below 100,000, and the worst liar
      fraction ever measured is <strong>0.1857</strong>, safely under the
      quarter. Twenty rounds: error under 10<sup>−12</sup>, at 4.31
      modular exponentiations per number, measured.
    </p>
  ),

  picture: (
    <p>
      A courtroom. The number n stands trial, and each witness a
      testifies by running the squaring chain. The Fermat test only asks
      witnesses for a character reference (the final value), and a
      Carmichael number like 561 is a con artist with perfect references:
      all 320 coprime bases vouch for it, verified. The strong test
      cross-examines the <em>alibi step by step</em>: how did you reach
      1? Through −1, or from a stranger? Under cross-examination,
      561&apos;s supporters collapse from 320 to 10. And the theorem says
      no defendant can bribe more than a quarter of the witness pool: so
      call twenty at random.
    </p>
  ),

  steps: [
    <>
      <strong>Decompose:</strong> n−1 = 2<sup>s</sup>·d with d odd.
    </>,
    <>
      <strong>Draw a witness</strong> a uniformly from [2, n−2].
    </>,
    <>
      <strong>Run the chain:</strong> x = a<sup>d</sup> mod n; if x is ±1,
      the witness passes. Otherwise square up to s−1 times; reaching −1
      passes, anything else convicts.
    </>,
    <>
      <strong>Convict on proof:</strong> one failed witness ends it: n is
      composite, certified by a nontrivial root of 1 (or a failed Fermat
      exit).
    </>,
    <>
      <strong>Repeat k times:</strong> k clean rounds leave error below
      4<sup>−k</sup>; below 3.3·10<sup>24</sup>, swap the lottery for the
      proven 12-witness set and the verdict becomes deterministic.
    </>,
  ],

  signals: [
    <>
      <strong>Generating or checking keys:</strong> RSA, DH, ECDSA
      parameter primes; the 63-bit hunt below found 5 primes in 96
      candidates, every verdict refereed.
    </>,
    <>
      <strong>n is far beyond factoring range</strong> but you only need
      primality, not factors: the two problems have wildly different
      prices (8.4M divisions vs 1 exponentiation, measured).
    </>,
    <>
      <strong>You can tolerate 4<sup>−k</sup></strong>, or n is under
      3.3·10<sup>24</sup> where the fixed witness set is proven: either
      way the test is a few dozen exponentiations.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>Fermat test, base 2</strong>: one
      exponentiation, and wrong <strong>78 times</strong> below 100,000,
      measured. Its failure is structural, not statistical: Carmichael
      numbers pass at every coprime base, so more Fermat rounds cannot
      save it. The strong chain fixes the structure (16 wrong at base 2,
      none with random rounds), which is why the fix is a different
      question asked of the same witness, not more witnesses asked the
      same question.
    </>
  ),

  strength: (
    <>
      <strong>Chosen error, proven conviction, log-cubed cost.</strong>{' '}
      &quot;Composite&quot; is always a certificate; &quot;prime&quot;
      carries error under 4<sup>−k</sup> against every composite,
      including Carmichaels (the quarter bound verified exhaustively
      here); and the whole trial is k exponentiations. This is the
      primality test running inside OpenSSL, GMP, and every TLS
      handshake&apos;s key ceremony.
    </>
  ),
  weakness: (
    <>
      <strong>&quot;Prime&quot; is confidence, not proof.</strong> The
      randomized verdict never certifies primality; below 3.3·10
      <sup>24</sup> the proven witness set closes the gap, beyond it you
      buy certainty only with slower machinery (ECPP, AKS). Fixed witness
      sets outside their proven range are adversarially attackable:
      composites are known that fool any published finite base list. And
      the test yields no factors: it convicts without naming an
      accomplice.
    </>
  ),

  problem: 'Primality testing',
  problemSlug: 'primality-testing',
  rivals: [
    {
      name: 'Miller-Rabin × witness rounds',
      isThisUnit: true,
      algoName: 'Miller-Rabin',
      cost: 'O(k log³ n)',
      wins: (
        <>
          <strong>0 wrong</strong> in the 100,000 sweep at 4.31 modexps
          per number; error under 4<sup>−k</sup> at any size, Carmichaels
          included.
        </>
      ),
      costs: (
        <>
          &quot;Prime&quot; is probabilistic; no factors produced; needs
          honest randomness (a predictable lottery is an attackable one).
        </>
      ),
      when: 'Cryptographic prime generation and any primality question past 64 bits: the industry default.',
    },
    {
      name: 'Deterministic Miller-Rabin × fixed witness set',
      algoName: 'Deterministic Miller-Rabin',
      cost: 'O(12 log³ n)',
      wins: (
        <>
          The same chain with the first 12 primes as witnesses:{' '}
          <strong>proven</strong> exact below 3.3·10<sup>24</sup>, no
          randomness, 2.41 modexps average: the referee this page&apos;s
          hunts answer to.
        </>
      ),
      costs: (
        <>
          The proof stops at 3.3·10<sup>24</sup> (about 81 bits); beyond
          it, a fixed public list is an adversarial target with known
          fooling composites.
        </>
      ),
      when: '64-bit integers: hashing, competitive programming, anywhere the range is bounded and randomness unwelcome.',
    },
    {
      name: 'Fermat primality test',
      cost: 'O(log³ n) per base',
      wins: (
        <>
          One exponentiation, the simplest possible filter, and the
          historical root of the whole lineage.
        </>
      ),
      costs: (
        <>
          <strong>78 wrong</strong> below 100,000 at base 2, and
          Carmichael numbers (561: all 320 coprime bases fooled,
          verified) make extra rounds useless: the failure is structural.
        </>
      ),
      when: 'Only as a quick pre-filter before a real test, never as the verdict.',
    },
    {
      name: 'AKS primality test',
      cost: 'O(log⁶ n), deterministic',
      wins: (
        <>
          The 2002 theorem: primality is in P, unconditionally, no
          randomness, no hypothesis. One of the great results.
        </>
      ),
      costs: (
        <>
          Constants and exponent make it orders of magnitude slower than
          witness rounds at every practical size; nobody&apos;s TLS stack
          runs it.
        </>
      ),
      when: 'When the question is theoretical: as running code, the lottery wins.',
    },
  ],
  neverUse: {
    name: 'Trial division on a cryptographic modulus',
    why: (
      <>
        Measured here: factoring a 48-bit semiprime by trial division
        took <strong>8,388,600 divisions</strong>; the strong test
        convicted the same number in <strong>one</strong> exponentiation.
        Scale the crawl to a 2048-bit RSA modulus and the divisions
        number around 10<sup>300</sup> years of compute: the two
        questions, &quot;is it prime&quot; and &quot;what divides
        it&quot;, live in different complexity worlds, and reaching for
        the factoring tool when you only need the verdict is the
        category error this pair exists to prevent.
      </>
    ),
  },

  contest: {
    instance:
      'all 49,999 odd n in [3, 100,000), classified prime or composite; referee: a sieve whose prime count 9,592 matches the published π(10⁵)',
    columns: ['wrong answers', 'cost'],
    rows: [
      {
        method: 'Fermat, base 2',
        values: ['78', '1 modexp'],
        verdict: 'first at 341 = 11·31; 561 fools all 320 coprime bases',
      },
      {
        method: 'Miller-Rabin, base 2 only',
        values: ['16', '1 modexp'],
        verdict: 'first at 2,047 = 23·89: one witness is a coin, not a jury',
      },
      {
        method: 'Miller-Rabin, 20 random',
        isThisUnit: true,
        values: ['0', '4.31 modexps avg'],
        best: 0,
        verdict: 'error under 4⁻²⁰; worst liar fraction 0.1857, exhaustively',
      },
      {
        method: 'Deterministic 12-witness',
        values: ['0', '2.41 modexps avg'],
        verdict: 'proven below 3.3·10²⁴: the referee for the 63-bit hunt',
      },
    ],
    source:
      'python solutions/miller_rabin_witness_rounds.py prints this table and asserts: the sieve matches π(10⁵) = 9,592; the offenders arrive on schedule (341, 561, 2047); strong liars are a subset of Fermat liars; zero errors for the 20-round and proven-set sweeps; Rabin’s quarter bound holds exhaustively on all 16 strong pseudoprimes (worst 0.1857); 561’s liars collapse 320 → 10 under cross-examination; a refereed 63-bit hunt lands 5 primes in 96 candidates; and the 48-bit semiprime costs 8,388,600 divisions to factor but 1 modexp to convict.',
  },

  figure: (
    <Figure
      id="fig-mr-chain"
      aspect="16 / 7"
      caption="The squaring chain and its two doors. From a^d, square s times toward a^(n−1). A prime admits only two histories: the chain starts at 1, or passes through −1 on its way in. Reaching 1 from any other value exhibits a nontrivial square root of 1, impossible in a field: composite, certified. Rabin's theorem prices the lottery: at most a quarter of witnesses miss, measured worst case 0.1857."
      cite={{
        text: 'Rabin, "Probabilistic algorithm for testing primality", Journal of Number Theory 12, 1980. The deterministic witness bound is Sorenson & Webster, 2015; the Carmichael blind spot dates to 1910.',
        href: 'https://doi.org/10.1016/0022-314X(80)90084-0',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The Miller-Rabin squaring chain with the passing doors and the conviction case">
        <text x="24" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">n − 1 = 2^s · d,  chain: a^d → a^2d → a^4d → … → a^(n−1)</text>
        {['a^d', 'a^2d', 'a^4d', '…', 'a^(n−1)'].map((s, i) => (
          <g key={i}>
            <rect x={24 + i * 120} y={54} width={92} height={40} fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeWidth="1.2" rx="6" />
            <text x={70 + i * 120} y={79} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13" textAnchor="middle">{s}</text>
            {i < 4 && <text x={122 + i * 120} y={79} fill="#9aa5bd" fontSize="13" fontFamily="ui-monospace, monospace">²→</text>}
          </g>
        ))}
        <text x="24" y="136" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">pass, door one: a^d ≡ 1 (starts inside)</text>
        <text x="24" y="158" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">pass, door two: some a^(2^i · d) ≡ −1 (enters through −1)</text>
        <text x="24" y="192" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">convict: x² ≡ 1 with x ≢ ±1 → nontrivial √1 → n is not a field → composite, certified</text>
        <text x="24" y="226" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">Rabin 1980: liars ≤ (n−1)/4 for every odd composite</text>
        <text x="24" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">checked here on every base of every strong pseudoprime below 100,000: worst 0.1857</text>
        <text x="24" y="274" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">k rounds ⇒ error &lt; 4^−k · twenty rounds ⇒ under one in a trillion</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'miller_rabin_witness_rounds.py',
  Viz: MillerRabinViz,
  narration,
};
