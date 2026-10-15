import NimViz from '../viz/NimViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/nim_solving_nimber_xor.py?raw';
import { narration } from './nim-solving-nimber-xor.narration.js';

export const content = {
  given:
    'Heaps of counters. Two players alternate; a move takes any positive number of counters from one heap; whoever takes the last counter wins. From any position, say who wins with best play, and name the winning move, without searching the game tree.',
  task: 'Nim solving. The algorithm is game solving by backward induction: a position is a previous-player win (P) when every move leads to a next-player win (N), and an N-position when some move leads to a P-position; the full tree settles any finite game at a cost that grows with every heap. The heuristic is the nimber (Bouton 1901): write each heap in binary and XOR the heaps. The position is P exactly when the XOR is zero, and from a nonzero XOR s there is always a heap h with h ⊕ s < h; reducing it to h ⊕ s restores zero. The Sprague-Grundy theorem (1935, 1939) makes the same number the value of every impartial game: a position’s Grundy number is the minimum excluded value of its options, a sum of games has the XOR of its parts, and the sum is lost for the player to move exactly when that XOR is zero.',
  constraint:
    'Measured against exhaustive backward induction: all 1,531 canonical positions with up to three heaps of fifteen (816) and four heaps of nine (715) carry the label the XOR predicts, and from every one of the 1,407 N-positions Bouton’s move reaches a labeled P-position. The Sprague-Grundy theorem held on 1,234 sums whose Grundy numbers were computed from their own options (the subtraction game {1, 3, 4}, period 7, and a Nim heap plus a subtraction heap). Misère play matched its flipped rule on 783 positions. Over 2,000 random starting positions of three to five heaps of up to twenty counters, the XOR player won 2,000 of 2,000 games moving first from a nonzero nim-sum and 2,000 of 2,000 moving second from zero against a random mover, a greedy mover, a cautious mover, and a memoized solver, at 82.7 heap inspections per game; the solver memoized 57,844 positions to do the same. Plain minimax on three heaps of six visits 9,968 nodes where memoization needs 29 and the XOR needs three operations; the greedy mover wins 1,255 of 2,000 against random play, random wins 1,032.',

  origins: (
    <p>
      Charles Bouton named the game and solved it in <strong>1901</strong>{' '}
      (&quot;Nim, a game with a complete mathematical theory,&quot; Annals of
      Mathematics), the first complete analysis of a combinatorial game,
      with the binary addition without carry that is now called XOR.
      Roland Sprague (1935) and Patrick Grundy (1939) independently proved
      that every impartial game under normal play is equivalent to a Nim
      heap, so Bouton&apos;s number values every such game and sums add by
      XOR. Berlekamp, Conway, and Guy&apos;s Winning Ways (1982) built the
      theory of partizan games on top of it; Wythoff (1907) solved the
      two-heap variant where a move may take equally from both. The
      Nimatron (1940 World&apos;s Fair) and Ferranti&apos;s Nimrod (1951, the
      first computer built to play a game) played perfect Nim by this rule
      in relays and valves; the XOR move is a standard interview question
      and the nimber the gateway to combinatorial game theory.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>definition of winning</strong>: backward induction
      from the empty position, P when every move leads to N, N when some
      move leads to P, and the winning move is any move to a P-position.
      It is the referee of this page: every canonical position with up to
      three heaps of fifteen and four heaps of nine (1,531 positions) is
      labeled by the full solve, misère play too (783), and a memoized
      solver plays the race with 57,844 positions in its table. Its cost
      is the price of generality: plain minimax on three heaps of six
      visits <strong>9,968 nodes</strong>, more than four times as many for
      each counter added to each heap.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>number</strong>: XOR the heaps. Measured, the label
      &quot;XOR is zero&quot; agreed with the exhaustive solve on{' '}
      <strong>1,531 of 1,531 positions</strong>, and Bouton&apos;s constructive
      move reached a P-position from all 1,407 N-positions. The same number
      valued 1,234 sums of other games exactly (Sprague-Grundy). In play it
      won 8,000 of 8,000 games it should win, at 82.7 heap inspections per
      game against 57,844 memoized positions for the solver, and three
      operations where minimax spends 9,968.
    </p>
  ),

  picture: (
    <p>
      Stack each heap as a column of binary digits and look at every bit
      position as its own tiny game: a bit position with an even number of
      ones is balanced. A position where every column is balanced is a
      trap, because any move changes the digits of one heap and must
      unbalance some column. From an unbalanced position there is always
      one heap you can rewrite so that every column balances again: it is
      the heap with a one in the highest unbalanced column. Hand your
      opponent balance every turn, and the last counter is yours.
    </p>
  ),

  steps: [
    <>
      <strong>Nim-sum:</strong> s = h<sub>1</sub> ⊕ h<sub>2</sub> ⊕ … ⊕ h<sub>k</sub>
      (binary addition without carry).
    </>,
    <>
      <strong>Verdict:</strong> s = 0 means the player to move loses with
      best play (a P-position); s ≠ 0 means they win.
    </>,
    <>
      <strong>Move:</strong> find a heap h with h ⊕ s &lt; h (the one with a
      1 in s&apos;s highest bit); reduce it to h ⊕ s, which makes the new
      nim-sum zero.
    </>,
    <>
      <strong>Other games:</strong> compute each component&apos;s Grundy number
      by mex over its options, XOR them, and play the same way on the sum.
    </>,
    <>
      <strong>Misère:</strong> play the normal strategy until every heap
      except one is at most one, then leave an odd number of ones.
    </>,
  ],

  signals: [
    <>
      <strong>An impartial game:</strong> the same moves available to both
      players, normal play; heaps, pins, coins, subtraction games.
    </>,
    <>
      <strong>A sum of independent components:</strong> value each part,
      XOR the values; the tree of the whole is never built.
    </>,
    <>
      <strong>Perfect play on demand:</strong> an interview, a puzzle, a
      machine with no search budget.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>minimax over the game tree</strong>:
      correct on every position, 9,968 nodes on three heaps of six,
      growing more than fourfold per counter; memoized, 29 positions there
      and 57,844 over the race.
    </>
  ),

  strength: (
    <>
      <strong>Perfect play in one XOR.</strong> 1,531 of 1,531 positions
      labeled correctly, the winning move constructive from every one of
      1,407, 8,000 of 8,000 games won; the same number values any sum of
      impartial games (1,234 sums checked) without building the tree.
    </>
  ),
  weakness: (
    <>
      <strong>Impartial, normal-play games only, and the component values
      still cost.</strong> Partizan games (chess, Go) have no nimber; misère
      needs its own rule (measured on 783 positions); a component&apos;s
      Grundy number is a mex computation that can itself be exponential;
      and the strategy tells you nothing about an opponent who is not
      playing perfectly, only that you cannot lose.
    </>
  ),

  problem: 'Combinatorial game solving',
  problemSlug: 'combinatorial-games',
  rivals: [
    {
      name: 'Nim solving × Nimber XOR',
      isThisUnit: true,
      algoName: 'Nim solving',
      cost: 'k XOR operations',
      wins: (
        <>
          <strong>1,531 of 1,531 positions</strong>, 8,000 of 8,000 games,
          3 operations against 9,968 nodes.
        </>
      ),
      costs: (
        <>
          Impartial normal-play games only; misère by a special rule.
        </>
      ),
      when: 'Nim and anything that reduces to it: a sum of impartial games with known Grundy numbers.',
    },
    {
      name: 'Minimax',
      algoName: 'Minimax',
      cost: 'the whole tree',
      wins: (
        <>
          Any two-player perfect-information game; the definition of best
          play.
        </>
      ),
      costs: (
        <>
          9,968 nodes on (6, 6, 6), 2,186 on (5, 5, 5): more than fourfold
          per counter.
        </>
      ),
      when: 'Partizan games, or anything without a closed form; with alpha-beta, see puzzle 05.',
    },
    {
      name: 'Retrograde analysis',
      algoName: 'Retrograde analysis',
      cost: 'one pass over the state space',
      wins: (
        <>
          Every position labeled once, backward from the terminals: the
          referee of this page (1,531 positions) and the method behind
          endgame tablebases.
        </>
      ),
      costs: (
        <>
          A table the size of the state space: 57,844 positions memoized
          over the race against 82.7 inspections per game.
        </>
      ),
      when: 'The state space fits in memory and you want every position solved, not one.',
    },
    {
      name: 'Sprague-Grundy theorem',
      algoName: 'Sprague-Grundy theorem',
      cost: 'a mex per position per component',
      wins: (
        <>
          Every impartial game is a Nim heap: the subtraction game {'{'}1, 3,
          4{'}'} has period-7 Grundy numbers, and 1,234 sums valued by XOR.
        </>
      ),
      costs: (
        <>
          The component values still need computing; nothing for partizan
          games.
        </>
      ),
      when: 'A sum of different impartial games, where Nim’s number is the common currency.',
    },
  ],
  neverUse: {
    name: 'Searching the game tree for a position with a closed form',
    why: (
      <>
        Three heaps of six: plain minimax visits <strong>9,968 nodes</strong>{' '}
        to learn what one XOR says in three operations, and each counter
        added to each heap multiplies the tree by more than four (24, 106,
        480, 2,186, 9,968 for heaps of two to six). Memoization cuts it to
        29 positions there and 57,844 over the race, which is the honest
        general tool, but on the twenty-counter heaps of the race the plain
        tree is beyond reach while the XOR player spends 82.7 heap
        inspections per game and never loses. The search is not wrong; it
        is answering a question that has already been answered.
      </>
    ),
  },

  contest: {
    instance:
      'Nim under normal play; referees: exhaustive backward induction over all 1,531 canonical positions with up to three heaps of fifteen and four heaps of nine, Sprague-Grundy sums computed from their own options, and 2,000 random starts of three to five heaps of one to twenty counters per matchup',
    columns: ['positions labeled correctly', 'games won first / second', 'work'],
    rows: [
      {
        method: 'XOR rule (Bouton)',
        isThisUnit: true,
        values: ['1,531 / 1,531', '8,000 / 8,000', '82.7 heap inspections per game; 3 operations per verdict'],
        best: 2,
        verdict: 'perfect play in one number',
      },
      {
        method: 'memoized solver (retrograde)',
        values: ['1,531 / 1,531', 'optimal (drew the XOR player to 0 wins)', '57,844 positions memoized over the race'],
        verdict: 'the referee',
      },
      {
        method: 'plain minimax, (6, 6, 6)',
        values: ['correct', '·', '9,968 nodes (29 memoized)'],
        verdict: 'more than fourfold per counter',
      },
      {
        method: 'greedy: take the largest heap',
        values: ['·', '0 / 2,000 against XOR; 1,255 / 2,000 against random', 'none'],
        verdict: 'a slight edge, not a strategy',
      },
      {
        method: 'random mover',
        values: ['·', '0 / 2,000 against XOR; 1,032 / 2,000 against random', 'none'],
        verdict: 'the baseline',
      },
    ],
    source:
      'python solutions/nim_solving_nimber_xor.py prints this table and asserts: the XOR label equals the exhaustive label on every one of 1,531 positions and Bouton’s move reaches a P-position from every N-position; the subtraction game’s Grundy numbers have period 7 and every two-component sum (961) and mixed sum (273) has the XOR of its parts; misère labels match the flipped rule on 783 positions; the XOR player wins all 2,000 games first from a nonzero start and all 2,000 second from a zero start against each of four opponents; random and greedy first movers win fewer than 1,300 of 2,000 against random; and plain minimax on (6, 6, 6) exceeds fifty times the memoized count and more than doubles per counter.',
  },

  figure: (
    <Figure
      id="fig-nim-binary"
      aspect="16 / 7"
      caption="Left: heaps of 7, 10, and 12 in binary. The 8s, 4s, and 2s columns each have two ones; only the 1s column is unbalanced, so the nim-sum is 0001 = 1 and the position is a win for the player to move. The heap of 7 is reduced by XOR with 1 to 6: every column balances, and the opponent faces a nim-sum of zero. Right: nodes visited by plain minimax on three equal heaps (red) against the memoized position count (gray) and the three XOR operations (blue), log scale."
      cite={{
        text: 'C. L. Bouton, "Nim, a game with a complete mathematical theory," Annals of Mathematics 3(1/4), 1901, pp. 35-39, DOI 10.2307/1967631. R. P. Sprague, "Uber mathematische Kampfspiele," Tohoku Mathematical Journal 41, 1935. P. M. Grundy, "Mathematics and games," Eureka 2, 1939.',
        href: 'https://doi.org/10.2307/1967631',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Three heaps written in binary with their XOR and the Bouton move, beside a log-scale bar chart of minimax nodes against memoized positions and XOR operations">
        {(() => {
          const heaps = [7, 10, 12];
          const bits = (n) => [8, 4, 2, 1].map((b) => (n & b ? 1 : 0));
          const xor = heaps.reduce((a, b) => a ^ b, 0);
          const x0 = 40;
          const y0 = 50;
          const cw = 30;
          const rh = 26;
          const mono = 'ui-monospace, monospace';
          const costs = [[2, 24, 7], [3, 106, 11], [4, 480, 16], [5, 2186, 22], [6, 9968, 29]];
          const bx = 380;
          const by = 232;
          const hgt = (v) => (Math.log10(Math.max(v, 1)) / 4.1) * 170;
          return (
            <g>
              <text x={x0} y="24" fill="#9aa5bd" fontFamily={mono} fontSize="10">heaps 7, 10, 12 in binary; columns 8 4 2 1</text>
              {heaps.map((h, r) => (
                <g key={h}>
                  <text x={x0 - 28} y={y0 + r * rh + 14} fill="#e9edf6" fontFamily={mono} fontSize="12">{h}</text>
                  {bits(h).map((b, c) => (
                    <text key={c} x={x0 + c * cw + 8} y={y0 + r * rh + 14} fill={b ? '#5da2ff' : '#9aa5bd'} fontFamily={mono} fontSize="13" fontWeight={b ? '700' : '400'}>{b}</text>
                  ))}
                </g>
              ))}
              <line x1={x0 - 30} y1={y0 + 3 * rh + 2} x2={x0 + 4 * cw} y2={y0 + 3 * rh + 2} stroke="#9aa5bd" strokeOpacity="0.6" />
              <text x={x0 - 28} y={y0 + 3 * rh + 20} fill="#f0b94b" fontFamily={mono} fontSize="12">{xor}</text>
              {bits(xor).map((b, c) => (
                <text key={c} x={x0 + c * cw + 8} y={y0 + 3 * rh + 20} fill={b ? '#f0b94b' : '#9aa5bd'} fontFamily={mono} fontSize="13" fontWeight={b ? '700' : '400'}>{b}</text>
              ))}
              <text x={x0 + 4 * cw + 12} y={y0 + 3 * rh + 20} fill="#f0b94b" fontFamily={mono} fontSize="10">nim-sum {xor}: the mover wins</text>
              <text x={x0 - 28} y={y0 + 4 * rh + 34} fill="#9aa5bd" fontFamily={mono} fontSize="10">Bouton: 7 ⊕ 1 = 6 &lt; 7, so take one from the heap of 7</text>
              <text x={x0 - 28} y={y0 + 4 * rh + 50} fill="#62d98a" fontFamily={mono} fontSize="10">6 ⊕ 10 ⊕ 12 = 0: every column balanced</text>
              <text x={x0 - 28} y={y0 + 4 * rh + 66} fill="#9aa5bd" fontFamily={mono} fontSize="10">the file checked this on 1,407 N-positions</text>
              <text x={bx} y="24" fill="#9aa5bd" fontFamily={mono} fontSize="10">three heaps of n: nodes to decide (log)</text>
              {costs.map(([n, plain, memo], i) => (
                <g key={n}>
                  <rect x={bx + i * 50} y={by - hgt(plain)} width="14" height={hgt(plain)} fill="#e2606c" fillOpacity="0.85" />
                  <rect x={bx + i * 50 + 15} y={by - hgt(memo)} width="14" height={hgt(memo)} fill="#9aa5bd" fillOpacity="0.85" />
                  <rect x={bx + i * 50 + 30} y={by - hgt(3)} width="14" height={hgt(3)} fill="#5da2ff" fillOpacity="0.85" />
                  <text x={bx + i * 50} y={by - hgt(plain) - 4} fill="#e2606c" fontFamily={mono} fontSize="8">{plain.toLocaleString()}</text>
                  <text x={bx + i * 50 + 12} y={by + 12} fill="#9aa5bd" fontFamily={mono} fontSize="9">n = {n}</text>
                </g>
              ))}
              <text x={bx} y="262" fill="#9aa5bd" fontFamily={mono} fontSize="10">red minimax, gray memoized, blue XOR (3)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'nim_solving_nimber_xor.py',
  Viz: NimViz,
  narration,
};
