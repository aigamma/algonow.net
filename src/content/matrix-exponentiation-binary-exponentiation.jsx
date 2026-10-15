import MatrixPowerViz from '../viz/MatrixPowerViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/matrix_exponentiation_binary_exponentiation.py?raw';
import { narration } from './matrix-exponentiation-binary-exponentiation.narration.js';

export const content = {
  given:
    'The n-th term of a linear recurrence, Fibonacci or any fixed order, for an n far too large to iterate: a quintillion steps, exactly or modulo a prime, in the time it takes to blink.',
  task: 'Matrix exponentiation. The algorithm: one step of a k-th order recurrence is a k × k companion matrix M applied to the vector of the last k terms, so n steps are Mⁿ applied once. The heuristic is binary exponentiation (square and multiply, Pingala c. 200 BC, al-Kashi 1427): write n in binary, square the running power once per bit and multiply it in when the bit is one, so Mⁿ costs floor(log₂ n) squarings plus popcount(n) − 1 multiplications instead of n − 1. The same trick powers anything associative: integers modulo a prime, adjacency matrices to count walks, affine maps, string transformations.',
  constraint:
    'Measured: F(20,000), a 4,180-digit integer, from 18 matrix products against 20,000 iteration steps, equal to the iterated value and passing Cassini’s identity F(n−1)F(n+1) − F(n)² = (−1)ⁿ. At n = 10¹⁸ modulo 10⁹ + 7, the matrix power, the fast-doubling identities, and Kitamasa’s polynomial method all return 209783453, in 656, 180, and 492 scalar multiplications (82 matrix products: 59 squarings and 23 multiplies). A random order-5 recurrence at n = 100,000: iteration 99,996 steps and 499,980 multiplications, the companion matrix 23 products and 2,875 multiplications, Kitamasa 22 products and 850, all equal; at n = 10¹⁸, 12,125 against 3,595. Binary exponentiation performed exactly floor(log₂ n) + popcount(n) − 1 products on every n to 4,096 and on 50 random 64-bit n (mean 92.9 against n − 1 ≈ 10¹⁹); 1,000 modular powers equal Python’s pow. Aᴸ equals a dynamic-programming walk count for L = 1 to 12. Naive recursion needs 1,664,079 calls for F(30); iterating to n = 10¹⁸ at the measured 0.045 s per million steps would take about 1,400 years; the matrix power took 0.09 ms.',

  origins: (
    <p>
      Pingala&apos;s Chandahsutra (<strong>c. 200 BC</strong>) computed powers of
      two by halving the exponent; al-Kashi (1427) and the medieval Indian
      and Arabic arithmetic traditions used square-and-multiply for
      integer powers, and Knuth&apos;s Art of Computer Programming (vol. 2,
      4.6.3) is the modern reference, including the addition-chain question
      of whether fewer multiplications are possible (they are, by at most a
      few). The Fibonacci matrix identity [[1,1],[1,0]]ⁿ = [[F(n+1),F(n)],
      [F(n),F(n−1)]] appears in Knuth vol. 1 and underlies the O(log n)
      methods; Kitamasa&apos;s method (1980s, Japanese competitive
      programming folklore) reduces the matrix to a polynomial for high
      order; the Cayley-Hamilton theorem explains why both work.
      Exponentiation by squaring is the inner loop of RSA (puzzle 128 on this
      site, modular exponentiation), of walk counting on graphs, and of every
      programming contest that asks for the 10¹⁸-th term of something.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>reduction</strong>: a recurrence becomes a matrix, so
      &quot;advance n steps&quot; becomes &quot;raise to the n-th power,&quot; and
      associativity lets the powers be grouped any way at all. The referee
      is plain iteration in exact big integers (F(20,000), 4,180 digits,
      equal) plus an algebraic identity independent of both methods
      (Cassini), plus the agreement of <strong>three unrelated algorithms</strong>{' '}
      at n = 10¹⁸ modulo a prime, where no iteration can reach: 209783453
      from the matrix, from fast doubling, and from Kitamasa. A walk-counting
      dynamic program certifies Aᴸ for L = 1 to 12.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>exponent</strong>: binary digits, one squaring per bit,
      one multiply per one bit. Measured exactly: floor(log₂ n) + popcount(n)
      − 1 products on every n up to 4,096 and 50 random 64-bit exponents,{' '}
      <strong>82 products at n = 10¹⁸</strong> (59 squarings, 23 multiplies)
      where repeated multiplication needs 10¹⁸ − 1; 0.09 ms against about
      1,400 years of iteration. The honest constant: fast doubling, a
      Fibonacci-specific shortcut, does the same job in 180 scalar
      multiplications to the matrix&apos;s 656, and Kitamasa in 492 for one
      recurrence and 3,595 against 12,125 at order 5; the matrix wins on
      generality, not on constants.
    </p>
  ),

  picture: (
    <p>
      A clerk who must apply the same rule a quintillion times, say
      &quot;advance the calendar one day,&quot; and has only an afternoon.
      Applying the rule twice is itself a rule, &quot;advance two days,&quot; and
      applying that twice is &quot;advance four days.&quot; Sixty doublings of the
      rule reach a quintillion, and the rule for an arbitrary count is the
      product of the doubled rules at the one bits of the count. The clerk
      never advances a single day sixty times; the clerk composes rules,
      which is why the rule must be something you can compose: a matrix,
      a modular number, a function.
    </p>
  ),

  steps: [
    <>
      <strong>Companion matrix:</strong> for a<sub>t</sub> = c₁a<sub>t−1</sub> + ... +
      c<sub>k</sub>a<sub>t−k</sub>, the k × k matrix with (c₁ ... c<sub>k</sub>) in
      the first row and ones below the diagonal; Fibonacci is [[1,1],[1,0]].
    </>,
    <>
      <strong>Binary exponentiation:</strong> result = I, base = M; for each
      bit of n from the lowest: if the bit is 1, result = result × base;
      then base = base × base (skip the last squaring and the first multiply
      by I).
    </>,
    <>
      <strong>Reduce as you go:</strong> modulo p after every product for
      modular answers; exact big integers otherwise (F(20,000) is 4,180
      digits).
    </>,
    <>
      <strong>Read the answer:</strong> a<sub>n</sub> = first row of Mⁿ⁻ᵏ⁺¹
      dotted with (a<sub>k−1</sub> ... a₀); for Fibonacci, F(n) is the
      off-diagonal entry of Mⁿ.
    </>,
    <>
      <strong>Count the work:</strong> floor(log₂ n) squarings plus
      popcount(n) − 1 multiplies, each k³ scalar multiplications; use
      Kitamasa (k² log n) when k is large.
    </>,
  ],

  signals: [
    <>
      <strong>A fixed linear rule applied astronomically often:</strong>{' '}
      recurrences, Markov chains, counting walks or strings of length n.
    </>,
    <>
      <strong>An exponent you can read in binary:</strong> n up to 10¹⁸ or
      beyond costs 60 to 120 products, exactly.
    </>,
    <>
      <strong>Anything associative:</strong> modular numbers, matrices,
      function composition, min-plus for shortest paths of length n.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>plain iteration</strong>: apply the
      recurrence n times. Exact, trivial, and the referee here for n up to
      100,000; at n = 10¹⁸ it would run about 1,400 years at the measured
      pace.
    </>
  ),

  strength: (
    <>
      <strong>Logarithmic steps for any associative rule, with an exact
      count.</strong> 82 products at n = 10¹⁸ where iteration needs 10¹⁸;
      three unrelated methods agree to the last digit; one companion
      matrix serves every order; Aᴸ counts walks with the same loop.
    </>
  ),
  weakness: (
    <>
      <strong>Cubic in the order, and not the cheapest constant.</strong>{' '}
      k³ scalar multiplications per product: 12,125 against Kitamasa&apos;s
      3,595 at order 5 and n = 10¹⁸, and fast doubling&apos;s 180 against 656
      for Fibonacci itself; exact integers grow to thousands of digits so
      the arithmetic, not the step count, dominates; a nonlinear
      recurrence has no matrix at all.
    </>
  ),

  problem: 'Linear recurrence evaluation',
  problemSlug: 'linear-recurrences',
  rivals: [
    {
      name: 'Matrix exponentiation × Binary exponentiation',
      isThisUnit: true,
      algoName: 'Matrix exponentiation',
      cost: 'O(k³ log n) scalar multiplications',
      wins: (
        <>
          <strong>82 products at n = 10¹⁸</strong>; any order, any associative
          rule; the count is a formula.
        </>
      ),
      costs: (
        <>
          k³ per product; 656 scalar multiplications where doubling uses 180.
        </>
      ),
      when: 'Any linear recurrence or associative rule at astronomical n: the default.',
    },
    {
      name: 'Kitamasa’s algorithm',
      algoName: "Kitamasa's algorithm",
      cost: 'O(k² log n) with polynomial reduction',
      wins: (
        <>
          3,595 scalar multiplications against 12,125 at order 5 and
          n = 10¹⁸; the same answer, k² instead of k³ per step.
        </>
      ),
      costs: (
        <>
          One recurrence only (no walks, no general matrices); a
          polynomial modulus to carry.
        </>
      ),
      when: 'High-order recurrences where k³ hurts and the matrix structure is not needed.',
    },
    {
      name: 'Fibonacci DP',
      algoName: 'Fibonacci DP',
      cost: 'O(n) additions',
      wins: (
        <>
          The exact referee for every n you can afford: 20,000 steps, no
          algebra, all terms along the way.
        </>
      ),
      costs: (
        <>
          Linear in n: 0.045 s per million steps, about 1,400 years at 10¹⁸.
        </>
      ),
      when: 'You need all the terms, or n is small; see puzzle 143 for the memoization lesson.',
    },
    {
      name: 'Modular exponentiation',
      algoName: 'Modular exponentiation',
      cost: 'O(log n) modular multiplications',
      wins: (
        <>
          The same heuristic on scalars: exactly floor(log₂ n) + popcount(n)
          − 1 products, verified against pow on 1,000 triples.
        </>
      ),
      costs: (
        <>
          Scalars only; the recurrence needs the matrix (or Kitamasa) first.
        </>
      ),
      when: 'Powers of numbers, RSA, primality tests; puzzle 128 is the full lesson.',
    },
  ],
  neverUse: {
    name: 'Iteration or naive recursion when n has eighteen digits',
    why: (
      <>
        Naive recursive Fibonacci makes 2F(n+1) − 1 calls:{' '}
        <strong>1,664,079 for F(30)</strong> (0.09 s), and the count itself
        grows like 1.618ⁿ, so F(60) alone would take years. Plain iteration
        is linear and fine to a hundred million, but n = 10¹⁸ at the
        measured 0.045 s per million steps is about 1,400 years of a tight
        loop. Binary exponentiation of the 2 × 2 matrix returned the same
        residue, 209783453, in 82 products and 0.09 ms, and two unrelated
        methods confirmed it. When the step count has a logarithm in it, no
        constant factor of the linear method catches up.
      </>
    ),
  },

  contest: {
    instance:
      'F(n) mod 10⁹ + 7 at n = 10¹⁸, a random order-5 recurrence at n = 100,000 and n = 10¹⁸, and F(20,000) exactly; referees: iteration in exact integers, Cassini’s identity, three-way agreement, Python’s pow, and a walk-counting dynamic program; one currency: scalar multiplications',
    columns: ['F(10¹⁸) mod p: mults', 'order 5, n = 10⁵: mults', 'order 5, n = 10¹⁸: mults', 'generality'],
    rows: [
      {
        method: 'companion matrix, binary exponentiation',
        isThisUnit: true,
        values: ['656 (82 products)', '2,875 (23 products)', '12,125', 'any order, any associative rule'],
        best: 3,
        verdict: 'logarithmic and general',
      },
      {
        method: 'Kitamasa (polynomial reduction)',
        values: ['492', '850 (22 products)', '3,595', 'one recurrence'],
        best: 2,
        verdict: 'k² beats k³ at high order',
      },
      {
        method: 'fast doubling (Fibonacci identities)',
        values: ['180', '·', '·', 'Fibonacci only'],
        best: 0,
        verdict: 'the best constant, one sequence',
      },
      {
        method: 'plain iteration',
        values: ['10¹⁸ steps (about 1,400 years)', '499,980 (99,996 steps)', 'infeasible', 'any recurrence, all terms'],
        verdict: 'the referee where it can run',
      },
      {
        method: 'naive recursion',
        values: ['infeasible', 'infeasible', 'infeasible', '2F(n+1) − 1 calls: 1,664,079 at n = 30'],
        verdict: 'exponential',
      },
    ],
    source:
      'python solutions/matrix_exponentiation_binary_exponentiation.py prints this table and asserts: matrix F(n) equal to iterated F(n) for six n to 20,000 and Cassini’s identity at 20,000; matrix, doubling, and Kitamasa equal at n = 10¹⁸ modulo 10⁹ + 7 and at small n; companion matrix, iteration, and Kitamasa equal on a random order-5 recurrence at n = 100,000 and for n = 0 to 39, matrix and Kitamasa equal at 10¹⁸; the product count equal to floor(log₂ n) + popcount(n) − 1 for every n to 4,096 and 50 random 64-bit n; 1,000 modular powers equal to pow; Aᴸ equal to the walk DP for L = 1 to 12; the recursive call count equal to 2F(31) − 1; and 59 squarings at n = 10¹⁸.',
  },

  figure: (
    <Figure
      id="fig-binary-exponentiation"
      aspect="16 / 7"
      caption="Left: the exponent 10¹⁸ in binary (60 bits, 24 ones). Reading the bits from the top, each bit squares the running power and each one bit multiplies the base in: 59 squarings and 23 multiplies, 82 products, against 10¹⁸ − 1 for repeated multiplication. Right: scalar multiplications for F(10¹⁸) mod p by three methods, and for an order-5 recurrence at n = 10¹⁸ by two, on a log scale: the matrix is the general tool, not the cheapest constant."
      cite={{
        text: 'D. E. Knuth, The Art of Computer Programming, vol. 2, section 4.6.3 "Evaluation of powers," and vol. 1, section 1.2.8 (the Fibonacci matrix). Pingala, Chandahsutra, c. 200 BC. J. al-Kashi, Miftah al-Hisab, 1427.',
        href: 'https://doi.org/10.1145/359327.359336',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The 60 binary digits of ten to the eighteenth with the squaring and multiply operations they induce, beside a log-scale bar chart of scalar multiplications by method">
        {(() => {
          const bits = '110111100000101101101011001110100111011000000000000000000000';
          const ones = bits.split('').filter((b) => b === '1').length;
          const x0 = 20;
          const bw = 5.3;
          const bars = [['matrix F', 656, '#5da2ff'], ['doubling', 180, '#62d98a'], ['Kitamasa F', 492, '#f0b94b'], ['matrix k=5', 12125, '#5da2ff'], ['Kitamasa k=5', 3595, '#f0b94b']];
          const bx = 400;
          const by = 230;
          const hgt = (v) => (Math.log10(v) / Math.log10(20000)) * 170;
          return (
            <g>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">10^18: {bits.length} bits, {ones} one-bits</text>
              {bits.split('').map((b, i) => (
                <rect key={i} x={x0 + i * bw} y={b === '1' ? 40 : 52} width={bw - 1} height={b === '1' ? 24 : 12} fill={b === '1' ? '#f0b94b' : '#9aa5bd'} fillOpacity={b === '1' ? 0.95 : 0.4} />
              ))}
              <text x={x0} y="90" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: 24 one bits, 23 multiplies (the first sets the result)</text>
              <text x={x0} y="106" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">59 squarings between the 60 bits; 82 matrix products in all</text>
              <text x={x0} y="134" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">repeated multiplication: 999,999,999,999,999,999 products</text>
              <text x={x0} y="162" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured: 0.09 ms for the power; iteration at 0.045 s per</text>
              <text x={x0} y="176" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">million steps would take about 1,400 years</text>
              <text x={x0} y="204" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">all three methods: 209783453 mod 1,000,000,007</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">scalar multiplications at n = 10^18 (log)</text>
              {bars.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 46} y={by - hgt(v)} width="34" height={hgt(v)} fill={c} fillOpacity="0.85" />
                  <text x={bx + i * 46} y={by - hgt(v) - 4} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v.toLocaleString()}</text>
                  <text x={bx + i * 46 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="7">{name}</text>
                </g>
              ))}
              <text x={bx} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">general tool, not the cheapest constant</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'matrix_exponentiation_binary_exponentiation.py',
  Viz: MatrixPowerViz,
  narration,
};
