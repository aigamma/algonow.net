import StrassenViz from '../viz/StrassenViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/strassen_seven_products.py?raw';
import { narration } from './strassen-seven-products.narration.js';

export const content = {
  given:
    'Two n × n matrices.',
  task: 'Their product, exactly, in fewer than n³ scalar multiplications.',
  constraint:
    'Exactly means audited: every product on this page is verified by an independent randomized check (Freivalds’ probes), because a fast wrong answer is worth nothing, and the check itself costs 8× less than recomputing.',

  origins: (
    <p>
      Volker Strassen set out in <strong>1969</strong> to prove that
      Gaussian elimination, and with it n³ matrix multiplication, was
      optimal, and found the opposite: his paper is titled{' '}
      <em>&quot;Gaussian Elimination is not Optimal&quot;</em> because the
      intended theorem died in the writing. Seven block products where
      eight seemed necessary, and the exponent barrier fell: Pan, then
      Coppersmith-Winograd (2.376), then decades of refinements to today&apos;s
      ≈2.37, and in 2022 DeepMind&apos;s AlphaTensor rediscovered and
      extended small-case identities by search. Meanwhile the 1969 original
      is the only one of the line that real libraries actually run.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>block recursion</strong>. An n × n product is a 2 × 2
      product of half-size blocks; done naively that is eight half-size
      multiplications, and the recursion T(n) = 8T(n/2) + O(n²) lands back
      on n³ exactly: divide and conquer, by itself, buys{' '}
      <strong>nothing here</strong>. The control structure&apos;s whole job
      is to be the amplifier: any saving at the 2 × 2 level compounds at
      every level of the recursion.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the saving: <strong>seven products instead of eight</strong>.
      M₁ through M₇ are cunning sums-times-sums of blocks whose additions
      and subtractions reassemble all four quadrants of the answer: the
      identity is verified on 500 random scalar cases in the tests, term by
      term. One multiplication traded for eighteen additions per level, and
      through the amplifier the exponent falls to log₂ 7 ≈ 2.807: at
      n = 256 that is <strong>9,834,496</strong> multiplications against
      the classical 16,777,216, and fewer <em>total</em> operations too
      (22.3M vs 33.5M).
    </p>
  ),

  picture: (
    <p>
      A courier pricing trick, compounded. Shipping one big consignment
      costs eight standard sub-shipments; a clever packer finds a way to do
      it with seven, at the cost of some extra sorting on both docks. Once
      would be a curiosity. But every sub-shipment is itself packed the
      same way, and its sub-sub-shipments too: the one-in-eight saving
      multiplies through every layer, and at eight layers deep the fleet
      is running at (7/8)⁸ ≈ 34% fewer trucks: the sorting got heavier,
      the trucks got fewer, and trucks are what you pay for.
    </p>
  ),

  steps: [
    <>
      <strong>Split</strong> each matrix into 2 × 2 blocks of size n/2.
    </>,
    <>
      <strong>Form the seven:</strong> M₁ = (A₁₁+A₂₂)(B₁₁+B₂₂), M₂ =
      (A₂₁+A₂₂)B₁₁, … seven block products from sums and differences.
    </>,
    <>
      <strong>Assemble:</strong> C₁₁ = M₁+M₄−M₅+M₇, C₁₂ = M₃+M₅, C₂₁ =
      M₂+M₄, C₂₂ = M₁−M₂+M₃+M₆. The identity, checked on 500 scalar
      cases.
    </>,
    <>
      <strong>Recurse</strong> into each M, down to a cutoff where
      classical multiplication takes over (the sweep below says where).
    </>,
    <>
      <strong>Audit:</strong> Freivalds&apos; random 0/1 probes check
      A(Bv) = Cv in O(n²) per probe: twenty probes, error under 2⁻²⁰,
      8× cheaper than recomputing.
    </>,
  ],

  signals: [
    <>
      Matrices are <strong>large and dense</strong>, and multiplications
      genuinely dominate cost: big integers, rationals, secure
      multi-party arithmetic, hardware where mul ≫ add.
    </>,
    <>
      <strong>Exact or well-conditioned</strong> arithmetic: Strassen&apos;s
      error bounds are modestly weaker than classical&apos;s (Higham), a
      non-issue over the integers here.
    </>,
    <>
      A <strong>cutoff hybrid</strong> is acceptable: the measured sweep,
      not the asymptotic exponent, picks the recursion depth.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the classical triple loop:{' '}
      <strong>16,777,216</strong> multiplications and 16.7M additions at
      n = 256, exactly n³ by construction (asserted to the integer). The
      cutoff-16 hybrid beats it on multiplications by 41% and on{' '}
      <em>total</em> operations by a third, and the sweep shows every
      deeper recursion level helping: the exponent is not a technicality;
      it is 11.1 million operations, here, at this size.
    </>
  ),

  strength: (
    <>
      <strong>The exponent is real and the recursion amplifies it.</strong>{' '}
      7^log₂ n multiplications exactly (117,649 = 7⁶ at n = 64, asserted),
      a measured total-ops win at practical sizes (22.3M vs 33.5M at 256),
      and the historical door: everything from 2.807 down to today&apos;s
      2.37 walks through this identity&apos;s idea.
    </>
  ),
  weakness: (
    <>
      <strong>Additions, memory traffic, and stability.</strong> Eighteen
      block additions per level are the tax (12.5M adds at cutoff 16), the
      temporaries stress caches in ways op-counts cannot see, and error
      bounds are somewhat weaker in floating point. And the fast
      successors are galactic: the 2.37-exponent methods have never
      profitably multiplied a real matrix (the never-here, with numbers).
    </>
  ),

  problem: 'Fast matrix multiplication',
  problemSlug: 'matrix-multiplication',
  rivals: [
    {
      name: 'Strassen × seven products',
      isThisUnit: true,
      algoName: "Strassen's algorithm",
      cost: 'O(n^2.807)',
      wins: (
        <>
          <strong>9,834,496</strong> multiplications and 22.3M total ops at
          n = 256 (classical: 16.8M and 33.5M): the only sub-cubic method
          that actually runs in libraries.
        </>
      ),
      costs: (
        <>
          The 18-additions tax, heavier memory traffic, and slightly
          weaker floating-point bounds. Winograd&apos;s variant trims the
          adds to 15; same identity, polished.
        </>
      ),
      when: 'Large exact or well-conditioned products where multiplications dominate: bignums, MPC, deep recursion over BLAS.',
    },
    {
      name: 'Coppersmith-Winograd',
      cost: 'O(n^2.376), galactic',
      wins: (
        <>
          The exponent lineage&apos;s famous milestone, refined since
          toward 2.37: proof that the barrier keeps moving, and the
          theoretical scaffolding for everything after.
        </>
      ),
      costs: (
        <>
          Constants so large it has <strong>never once</strong> been the
          fastest way to multiply an actual matrix: the crossover size
          exceeds anything storable.
        </>
      ),
      when: 'As a lower-bound conversation and a research substrate; never as code.',
    },
    {
      name: "Freivalds' algorithm",
      cost: 'O(kn²) to verify',
      wins: (
        <>
          Audits a claimed product in <strong>3.9M ops against 33.5M</strong>{' '}
          to recompute (8×), error under 2⁻²⁰, and it caught the
          single-entry corruption planted in the tests.
        </>
      ),
      costs: (
        <>
          It verifies, never computes; randomized with one-sided error;
          and it needs the claimed C in hand.
        </>
      ),
      when: 'Checking outsourced or accelerated products: the referee this whole page runs under.',
    },
  ],
  neverUse: {
    name: 'A galactic exponent, in production',
    why: (
      <>
        The 2.37-exponent methods beat Strassen only past matrix sizes
        that do not fit in any machine, or universe of machines: their
        constants are the whole story, and the measured sweep on this page
        is the small-scale version of the same lesson (recursion depth is
        chosen by the ledger, not the exponent). An asymptotic win with an
        unpayable constant is mathematics, and good mathematics, and not
        an algorithm you run. Know the difference and cite both honestly.
      </>
    ),
  },

  contest: {
    instance:
      'n = 256, exact integer matrices; scalar multiplications and additions counted exactly (asserted: classical = n³, cutoff-16 = 7⁴·16³, pure = 7^log₂ n at n = 64); every product audited by Freivalds',
    columns: ['multiplications', 'additions'],
    rows: [
      {
        method: 'Classical triple loop',
        values: ['16,777,216', '16,711,680'],
        verdict: 'n³ to the integer: the definition, and the amplifier’s input',
      },
      {
        method: 'Strassen × cutoff 16',
        isThisUnit: true,
        values: ['9,834,496', '12,514,560'],
        best: 0,
        verdict: '41% fewer mults, a third fewer total ops, at practical size',
      },
      {
        method: 'Strassen pure (n = 64)',
        values: ['117,649', '681,318'],
        verdict: 'exactly 7⁶: the exponent with no cutoff, adds and all',
      },
    ],
    source:
      'python solutions/strassen_seven_products.py prints this table plus the cutoff sweep (total ops fall monotonically from classical’s 33.5M to 22.3M at cutoff 16) and asserts the seven-product identity on 500 scalar cases, agreement of pure, cutoff, and padded variants with the classical product on sizes including 31, 33, and 100, exact multiplication counts, Freivalds’ audit passing on every product and catching a planted one-entry corruption, and the 8× verify-versus-recompute ratio.',
  },

  figure: (
    <Figure
      id="fig-strassen-identity"
      aspect="16 / 7"
      caption="The trade at the heart of the exponent. Eight block products is what the 2×2 pattern seems to demand; these seven, with eighteen additions, assemble the same four quadrants, verified term by term in the tests. The recursion is the amplifier: one-in-eight saved at every level compounds to (7/8)^log₂ n, and the exponent itself moves: log₂ 8 = 3 becomes log₂ 7 = 2.807."
      cite={{
        text: 'Strassen, "Gaussian Elimination is not Optimal", Numerische Mathematik 13, 1969: the paper whose title records the theorem its author failed to prove. The verification probe is Freivalds, 1977; the galactic milestone is Coppersmith-Winograd, 1990.',
        href: 'https://doi.org/10.1007/BF02165411',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The seven Strassen products listed beside the four quadrant assemblies they build">
        <text x="30" y="34" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">the seven products</text>
        {[
          'M₁ = (A₁₁+A₂₂)(B₁₁+B₂₂)',
          'M₂ = (A₂₁+A₂₂)·B₁₁',
          'M₃ = A₁₁·(B₁₂−B₂₂)',
          'M₄ = A₂₂·(B₂₁−B₁₁)',
          'M₅ = (A₁₁+A₁₂)·B₂₂',
          'M₆ = (A₂₁−A₁₁)(B₁₁+B₁₂)',
          'M₇ = (A₁₂−A₂₂)(B₂₁+B₂₂)',
        ].map((s, i) => (
          <text key={i} x="30" y={62 + i * 26} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{s}</text>
        ))}
        <line x1="330" y1="30" x2="330" y2="250" stroke="#232c40" strokeWidth="1" />
        <text x="356" y="34" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="13">the four quadrants</text>
        {[
          'C₁₁ = M₁+M₄−M₅+M₇',
          'C₁₂ = M₃+M₅',
          'C₂₁ = M₂+M₄',
          'C₂₂ = M₁−M₂+M₃+M₆',
        ].map((s, i) => (
          <text key={i} x="356" y={68 + i * 30} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{s}</text>
        ))}
        <text x="356" y="206" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">7 multiplies, 18 adds, per level</text>
        <text x="356" y="226" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">T(n) = 7·T(n/2) + O(n²)</text>
        <text x="356" y="246" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">⇒ n^log₂7 = n^2.807</text>
        <text x="30" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">verified on 500 random scalar cases before any matrix trusted it</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'strassen_seven_products.py',
  Viz: StrassenViz,
  narration,
};
