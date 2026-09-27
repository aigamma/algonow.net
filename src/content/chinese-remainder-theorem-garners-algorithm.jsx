import CrtViz from '../viz/CrtViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/chinese_remainder_theorem_garners_algorithm.py?raw';
import { narration } from './chinese-remainder-theorem-garners-algorithm.narration.js';

export const content = {
  given:
    'A large integer x is known only by its remainders r₁ … r_k modulo pairwise coprime moduli m₁ … m_k. Reconstruct it. The Chinese remainder theorem promises that x is determined uniquely modulo M = m₁ ⋯ m_k and gives a formula: x = Σ rᵢ Mᵢ (Mᵢ⁻¹ mod mᵢ) mod M, with Mᵢ = M / mᵢ. Correct, and every one of its operations is on numbers the size of M: a 704-bit product for ten 64-bit moduli.',
  task: 'Garner’s algorithm. Build x in mixed radix, x = v₁ + v₂ m₁ + v₃ m₁ m₂ + ⋯, one digit per modulus: v₁ = r₁, and each later digit v_j comes from r_j by subtracting the earlier digits and multiplying by one small inverse, all modulo m_j. No intermediate exceeds one modulus until the final assembly, the inverses are between pairs of small moduli, and the digits come out one at a time.',
  constraint:
    'Measured: 2,000 random integers below a 100-bit M (five moduli near 10⁶) rebuilt exactly by Garner and by the direct formula, every residue of the result checked. Uniqueness verified exhaustively: all 1,155 integers below 3 · 5 · 7 · 11 have distinct residue tuples, and with moduli 6 and 10 (a shared factor) 0 and 30 collide. On ten 64-bit moduli, Garner’s largest intermediate is 64 bits in 90 small operations against the direct formula’s 704 bits in 30 big ones. A 640-bit product computed as ten 64-bit residue products and reassembled equals the integer product. RSA-512 decryption by CRT across p and q recovers the message at 25% of the multiplication cost of plain exponentiation. The textbook sieve finds the same digits in 2,181,053 additions where Garner spends 20 operations.',

  origins: (
    <p>
      The problem is in the <strong>Sunzi Suanjing</strong> (third to
      fifth century): a number that leaves 2 counted by threes, 3 by
      fives, and 2 by sevens (it is 23). Qin Jiushao gave the general
      method in 1247 (the Dayan rule in the Shushu Jiuzhang), and Gauss
      stated it in modern form in the Disquisitiones (1801). Harvey
      Garner published the mixed-radix conversion that carries his name
      in <strong>1959</strong> (IRE Transactions on Electronic
      Computers, &quot;The residue number system&quot;), for hardware
      that does every digit&apos;s arithmetic in parallel and pays for
      the theorem only when it must compare, detect overflow, or
      convert out; Knuth made it the standard presentation in The Art
      of Computer Programming (volume 2, 4.3.2). Quisquater and
      Couvreur (1982) applied it to RSA decryption for a fourfold
      speedup, which every RSA library now ships; Boneh, DeMillo, and
      Lipton (1997) showed that one faulty half of that computation
      leaks the private key, which is why every RSA library also
      checks the result before releasing it. Computer algebra systems
      compute determinants and polynomial products modulo many
      word-sized primes and reassemble the same way.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>existence and uniqueness</strong>: for pairwise
      coprime moduli there is exactly one x in [0, M) with the given
      residues, and the direct formula computes it. The referee is the
      original integer: <strong>2,000 of 2,000</strong> random values
      below a 100-bit M rebuilt exactly, both by Garner and by the
      formula, with every residue of the result checked in reverse.
      Uniqueness is checked without trust: all 1,155 integers below
      3 · 5 · 7 · 11 have distinct residue tuples, and the theorem&apos;s
      precondition is shown to matter, since with moduli 6 and 10 the
      integers 0 and 30 have the same pair of residues and no formula
      can tell them apart. The theorem is also what makes residue
      arithmetic legal: a 640-bit product computed as ten 64-bit
      products of residues reassembles to the true product, because
      the ring of integers mod M is the product of the rings mod mᵢ.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>mixed-radix ladder</strong>. The direct
      formula&apos;s terms rᵢ Mᵢ yᵢ are each the size of M and then some:
      on ten 64-bit moduli its largest intermediate is{' '}
      <strong>704 bits</strong>, and every inverse is of a 576-bit
      number. Garner never leaves one modulus until the end: largest
      intermediate <strong>64 bits</strong>, 90 small operations, and
      the 45 inverses are between pairs of 64-bit moduli, computed once
      per modulus set. The digits also carry meaning as they arrive:
      after j digits the value is known modulo m₁ ⋯ m_j, so the
      candidates shrink from M to M / m₁ to M / m₁ m₂, and the top
      digit alone says which range x lies in, which is what a residue
      number system needs for comparison and overflow. RSA is the
      familiar payoff: decrypting modulo p and q separately costs
      388 + 375 half-size multiplications, about a quarter of the 756
      full-size ones, and two-digit Garner glues the halves.
    </p>
  ),

  picture: (
    <p>
      A shipment counted by three clerks with tiny counters: one wraps
      at seven, one at eleven, one at thirteen. Each reports only where
      the counter stopped. The direct formula has each clerk compute
      with the product of everyone else&apos;s limits, big numbers all
      round. Garner&apos;s clerk reconstructs the true count without ever
      writing a number above thirteen until the last line: take the
      first clerk&apos;s reading as it stands; ask how many sevens must
      have passed for the second reading to come out right, a number
      below eleven; ask how many seventy-sevens for the third, a number
      below thirteen; and only then multiply out. Five, plus seven
      times one, plus seventy-seven times seven: five hundred fifty
      one. The digits are the answer in a base that changes at every
      position.
    </p>
  ),

  steps: [
    <>
      <strong>Inverses:</strong> c<sub>ij</sub> = m<sub>i</sub><sup>−1</sup>{' '}
      mod m<sub>j</sub> for i &lt; j, once per modulus set.
    </>,
    <>
      <strong>First digit:</strong> v₁ = r₁.
    </>,
    <>
      <strong>Digit j:</strong> t ← r<sub>j</sub>; for i &lt; j: t ←
      (t − v<sub>i</sub>) · c<sub>ij</sub> mod m<sub>j</sub>; v<sub>j</sub> ← t.
    </>,
    <>
      <strong>Assemble:</strong> x = v₁ + m₁(v₂ + m₂(v₃ + ⋯)), the only
      step that touches a number the size of M.
    </>,
    <>
      <strong>Verify:</strong> x mod m<sub>i</sub> = r<sub>i</sub> for
      every i, and 0 ≤ x &lt; M.
    </>,
  ],

  signals: [
    <>
      <strong>The arithmetic already happened in residues:</strong> a
      residue number system, multi-modular computer algebra, RSA-CRT;
      reassembly is the only place the big number appears.
    </>,
    <>
      <strong>Many word-sized moduli:</strong> Garner&apos;s inverses are
      word-sized and precomputable; the direct formula&apos;s are the
      size of M / mᵢ.
    </>,
    <>
      <strong>You need the magnitude before the value:</strong> the
      mixed-radix digits give comparison, sign, and overflow detection
      digit by digit.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the direct CRT formula</strong>:
      the same answer on all 2,000 integers, k independent terms that
      can be computed in parallel, and no digit sequence. It costs
      M-sized products and Mᵢ-sized inverses: 704-bit intermediates
      where Garner&apos;s are 64.
    </>
  ),

  strength: (
    <>
      <strong>Word-sized intermediates all the way down.</strong> 64 bits
      against 704 on ten 64-bit moduli, 45 small precomputed inverses,
      RSA decryption at a quarter of the cost, and a 640-bit product
      from ten independent 64-bit pieces, all exact against the
      integer referee.
    </>
  ),
  weakness: (
    <>
      <strong>Sequential, quadratic in k, and fragile to faults.</strong>{' '}
      The digits depend on each other, so the k(k − 1)/2 inner steps
      run in order while the direct formula&apos;s k terms are
      independent; the precomputed inverse table is quadratic in the
      number of moduli; the moduli must be pairwise coprime, or
      uniqueness fails outright (0 and 30 under 6 and 10); and in
      RSA-CRT a single faulty half-exponentiation leaks the private key
      through the gluing step, so the result must be verified before it
      leaves.
    </>
  ),

  problem: 'Modular reconstruction',
  problemSlug: 'modular-arithmetic',
  rivals: [
    {
      name: 'Chinese remainder theorem × Garner’s algorithm',
      isThisUnit: true,
      algoName: 'Chinese remainder theorem',
      cost: 'k(k − 1)/2 small multiplies, one assembly',
      wins: (
        <>
          <strong>64-bit intermediates</strong> on ten 64-bit moduli;
          digits that mean something as they arrive.
        </>
      ),
      costs: (
        <>
          Sequential digits; a quadratic inverse table.
        </>
      ),
      when: 'Reassembling from many word-sized moduli, or gluing RSA halves.',
    },
    {
      name: 'CRT explicit sum construction',
      algoName: 'Chinese remainder theorem',
      cost: 'k products of M-sized numbers, k big inverses',
      wins: (
        <>
          k independent terms, trivially parallel; the Mᵢ yᵢ weights
          precompute once for a fixed modulus set.
        </>
      ),
      costs: (
        <>
          704-bit intermediates on the same ten moduli; every inverse
          is of a 576-bit number.
        </>
      ),
      when: 'Two or three moduli, or a fixed modulus set with precomputed weights and parallel hardware.',
    },
    {
      name: 'Extended Euclidean algorithm',
      algoName: 'Extended Euclidean algorithm',
      cost: 'O(log m) steps per inverse',
      wins: (
        <>
          The engine under both: every inverse here comes from Bézout
          coefficients; with two moduli it is the whole reconstruction.
        </>
      ),
      costs: (
        <>
          One inverse at a time; it organizes nothing across k moduli.
        </>
      ),
      when: 'A single inverse or a single pair of congruences; the building block, not the plan.',
    },
    {
      name: 'Montgomery multiplication',
      algoName: 'Montgomery multiplication',
      cost: 'one extra reduction per product, no division',
      wins: (
        <>
          Fast repeated multiplication modulo one big modulus; RSA-CRT
          runs Montgomery inside each half.
        </>
      ),
      costs: (
        <>
          Does not split the modulus; the operands stay the size of n.
        </>
      ),
      when: 'Many products modulo one fixed modulus, as in exponentiation; complementary, not competing.',
    },
  ],
  neverUse: {
    name: 'The sieve: add the modulus until it fits',
    why: (
      <>
        The oldest method, and the one a first attempt reaches for:
        start at r₁, add m₁ until the value has residue r₂, then add
        m₁m₂ until it has residue r₃, and so on. It is exact and it is
        Garner in disguise, finding each digit by counting up to it one
        step at a time. Measured on the five million-sized moduli:{' '}
        <strong>2,181,053 additions</strong> to find digits that Garner
        finds in 20 small operations, because each digit costs about
        half a modulus of steps. On ten 64-bit moduli that is up to
        2<sup>64</sup> steps per digit, which is not a slow method but
        no method at all. One modular inverse replaces the entire walk.
      </>
    ),
  },

  contest: {
    instance:
      'rebuild an integer from its residues; referee: the original integer, the direct CRT formula computed independently, exhaustive uniqueness on small moduli, and Python’s own integer product and modular exponentiation',
    columns: ['Garner', 'direct CRT formula', 'the sieve'],
    rows: [
      {
        method: 'five moduli near 10⁶, 100-bit M, 2,000 integers',
        values: ['exact, 2,000 of 2,000', 'exact, 2,000 of 2,000', 'exact; 2,181,053 steps on one integer'],
        verdict: 'both formulas exact; the sieve walks',
      },
      {
        method: 'ten 64-bit moduli, 640-bit M: largest intermediate',
        isThisUnit: true,
        values: ['64 bits, 90 small operations', '704 bits, 30 big operations', 'up to 2⁶⁴ steps per digit; not run'],
        best: 0,
        verdict: 'the modulus is the word',
      },
      {
        method: '319-bit × 320-bit product via ten residue products',
        values: ['exact, 638-bit result', 'exact by the same theorem', '·'],
        verdict: 'residue arithmetic is legal',
      },
      {
        method: 'RSA-512 decryption, multiplications',
        values: ['388 + 375 half-size, ≈ 191 full (25%)', 'plain exponentiation: 756 full-size', '·'],
        verdict: 'a quarter of the cost, same message',
      },
      {
        method: 'moduli 6 and 10 (shared factor 2)',
        values: ['0 and 30 share residues (0, 0)', 'M₁ = 10 has no inverse mod 6', 'finds 0, never 30'],
        verdict: 'pairwise coprime or nothing',
      },
    ],
    source:
      'python solutions/chinese_remainder_theorem_garners_algorithm.py prints this table and asserts: Garner and the direct formula equal the original on 2,000 random integers with every residue of the result rechecked; all 1,155 integers below 3 · 5 · 7 · 11 have distinct residue tuples and 0 and 30 collide under 6 and 10; on ten 64-bit moduli Garner’s largest intermediate is at most 64 bits and the direct formula’s exceeds 640; the residue product equals the integer product; RSA by CRT recovers the message at under 60% of the plain cost; and the sieve, exact on the small moduli exhaustively, costs more than 100 times Garner’s operations on the million-sized ones.',
  },

  figure: (
    <Figure
      id="fig-garner-ladder"
      aspect="16 / 7"
      caption="The integer 551 seen through moduli 7, 11, 13 (M = 1,001): residues 5, 1, 5. Garner’s ladder finds the mixed-radix digits 5, 1, 7 with one small inverse per rung and assembles 5 + 7 · 1 + 77 · 7 = 551; nothing exceeds 13 until the last line. The direct formula computes the same 551 as 5 · 143 · 5 + 1 · 91 · 4 + 5 · 77 · 12 = 8,559 mod 1,001, every term larger than M. On ten 64-bit moduli the gap is 64 bits against 704."
      cite={{
        text: 'H. L. Garner, "The residue number system," IRE Transactions on Electronic Computers EC-8(2), 1959. DOI 10.1109/TEC.1959.5219515. D. E. Knuth, The Art of Computer Programming, vol. 2, section 4.3.2. J.-J. Quisquater, C. Couvreur, "Fast decipherment algorithm for RSA public-key cryptosystem," Electronics Letters 18(21), 1982.',
        href: 'https://doi.org/10.1109/TEC.1959.5219515',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Three residue dials for 551 modulo 7, 11, and 13; Garner's three-rung ladder of small digits on the left, the direct formula's large terms on the right">
        {[[7, 5], [11, 1], [13, 5]].map(([m, r], i) => {
          const cx = 60 + i * 90;
          const cy = 60;
          const rad = 26;
          const a = (r / m) * Math.PI * 2 - Math.PI / 2;
          return (
            <g key={m}>
              <circle cx={cx} cy={cy} r={rad} fill="none" stroke="#9aa5bd" strokeOpacity="0.5" />
              {Array.from({ length: m }, (_, k) => {
                const b = (k / m) * Math.PI * 2 - Math.PI / 2;
                return <circle key={k} cx={cx + Math.cos(b) * rad} cy={cy + Math.sin(b) * rad} r={k === r ? 3.5 : 1.5} fill={k === r ? '#5da2ff' : '#9aa5bd'} />;
              })}
              <line x1={cx} y1={cy} x2={cx + Math.cos(a) * (rad - 5)} y2={cy + Math.sin(a) * (rad - 5)} stroke="#5da2ff" strokeWidth="2" />
              <text x={cx - 30} y={cy + rad + 16} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">{`551 mod ${m} = ${r}`}</text>
            </g>
          );
        })}
        <text x="30" y="132" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">Garner: nothing above 13 until the last line</text>
        <text x="30" y="152" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">v1 = 5</text>
        <text x="30" y="170" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">v2 = (1 − 5) · 7⁻¹ mod 11 = 7 · 8 mod 11 = 1</text>
        <text x="30" y="188" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">v3 = ((5 − 5) · 7⁻¹ − 1) · 11⁻¹ mod 13 = 12 · 6 mod 13 = 7</text>
        <text x="30" y="206" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">x = 5 + 7 · 1 + 77 · 7 = 551</text>
        <text x="30" y="236" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the sieve: 5, +7 until ≡ 1 (mod 11): 12; +77 until ≡ 5 (mod 13): 551</text>
        <text x="30" y="254" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">8 additions here; 2,181,053 on the million-sized moduli</text>
        <text x="345" y="132" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">direct formula: every term bigger than M</text>
        <text x="345" y="152" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">M1 = 143, 143⁻¹ mod 7 = 5</text>
        <text x="345" y="170" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">M2 = 91,  91⁻¹ mod 11 = 4</text>
        <text x="345" y="188" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">M3 = 77,  77⁻¹ mod 13 = 12</text>
        <text x="345" y="206" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">5·143·5 + 1·91·4 + 5·77·12 = 8,559</text>
        <text x="345" y="224" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">8,559 mod 1,001 = 551</text>
        <text x="345" y="254" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ten 64-bit moduli: 64-bit vs 704-bit intermediates</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'chinese_remainder_theorem_garners_algorithm.py',
  Viz: CrtViz,
  narration,
};
