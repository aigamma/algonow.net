import EditDistanceViz from '../viz/EditDistanceViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/wagner_fischer_table.py?raw';
import { narration } from './wagner-fischer-table.narration.js';

export const content = {
  given:
    'Two strings.',
  task: 'The minimum number of single-character insertions, deletions, and substitutions turning one into the other, plus the edit script that witnesses it.',
  constraint:
    'The script is not optional. An unverifiable distance is a rumor, so the tests apply every script produced on this page, character by character, and demand it transform s into t in exactly d operations.',

  origins: (
    <p>
      This is the most independently discovered algorithm on the site.
      Levenshtein defined the distance in 1965 (Soviet coding theory);
      Vintsyuk built the DP for speech recognition in 1968; Needleman and
      Wunsch reinvented it for biology in 1970; Wagner and Fischer&apos;s
      1974 JACM paper gave computer science its canonical form and name.
      Four fields, one table, none of them reading the others. The
      refinements then split by need: Hirschberg squeezed the space to
      linear (1975), Ukkonen banded the work when the distance is small
      (1985), and Myers&apos; 1986 diff algorithm, the engine behind{' '}
      <code>git diff</code>, races the no-substitution variant in O(nd).
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>lattice</strong>. Once the state is chosen, dynamic
      programming does the rest: each cell D[i][j] takes the minimum of
      three neighbors (diagonal for match-or-substitute, above for delete,
      left for insert), any sweep order works, the count is exactly
      (n+1)(m+1) cells (asserted to the integer), and the backtrace through
      the argmins <em>is</em> the edit script: the witness, for free.
    </p>
  ),
  heurRole: (
    <p>
      Chose the state, and the state is everything:{' '}
      <strong>D[i][j] = the distance between the first i characters of s
      and the first j characters of t</strong>. Prefix-versus-prefix is
      what makes three neighbors sufficient: any optimal alignment&apos;s
      last move is a substitute, a delete, or an insert, and stripping it
      lands on a smaller prefix pair. This is Kadane&apos;s lesson (state
      design is the art of DP) one dimension up: there the state shrank to
      one number; here it provably cannot, and the honest response is to
      shrink <em>space</em> (two rows), <em>work</em> (the band), or the{' '}
      <em>metric</em> (Myers), each priced in the contest.
    </p>
  ),

  picture: (
    <p>
      A proofreader turning one word into another, working left to right
      with a finger on each word. At every step the fingers frame a
      question: &quot;having reconciled this much of mine with that much of
      yours, what is the cheapest history that got me here?&quot; Each
      answer needs only three earlier answers: the same question one letter
      back on both (keep or swap), one letter back on mine (I deleted), or
      one letter back on yours (I inserted). Fill the whole grid of
      questions and the bottom-right corner holds the cost; walking the
      choices backward replays the cheapest history itself.
    </p>
  ),

  steps: [
    <>
      <strong>Frame:</strong> a table of (n+1)×(m+1) cells; row 0 and
      column 0 are the trivial histories (all inserts, all deletes).
    </>,
    <>
      <strong>Fill:</strong> D[i][j] = min of diagonal + (0 if the
      characters match, else 1), above + 1, left + 1. Any order that
      respects dependencies.
    </>,
    <>
      <strong>Read:</strong> D[n][m] is the distance: 37 on the
      2,000-character pair below, for exactly 3,993,996 cell updates.
    </>,
    <>
      <strong>Backtrace:</strong> walk the argmins from the corner to the
      origin: out falls the edit script, applied and verified by the
      tests.
    </>,
    <>
      <strong>Shrink what the problem allows:</strong> two rows if only the
      number matters; Hirschberg&apos;s halving if the script must survive
      in linear space; the k-band if the distance is known small.
    </>,
  ],

  signals: [
    <>
      You need the <strong>exact</strong> distance and the{' '}
      <strong>script</strong>: spell-check suggestions, DNA alignment,
      diff views, fuzzy joins with receipts.
    </>,
    <>
      Lengths are <strong>moderate</strong>: n·m cells is millions at
      thousands of characters, fine; at hundreds of thousands it is 10¹⁰,
      and no cleverness fixes that (see the weakness).
    </>,
    <>
      The expected distance is <strong>small</strong>: then the band does
      22× less work here, and Myers&apos; diff does 1,000× less in its own
      metric.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the recurrence without the table: the naive
      recursion recomputes overlapping prefix pairs exponentially, measured
      at <strong>797,161 calls</strong> for twelve characters where the
      table needs 169 cells, and 3ⁿ forever after. Memoization is not an
      optimization here; it is the difference between an algorithm and a
      forest fire.
    </>
  ),

  strength: (
    <>
      <strong>Total, exact, and witnessed.</strong> Any two strings, the
      true minimum, the script included and machine-verified, in an
      entirely predictable (n+1)(m+1) cells: no pathologies, no lucky and
      unlucky inputs. And the state design generalizes: weighted costs
      give Needleman-Wunsch, gaps give bioinformatics, probabilities give
      HMM alignment.
    </>
  ),
  weakness: (
    <>
      <strong>The quadratic wall, and it is probably a law.</strong>{' '}
      Backurs and Indyk (2015) showed a strongly subquadratic edit
      distance would break the Strong Exponential Time Hypothesis, so the
      4M cells on this page&apos;s pair scale to 10¹⁰ at 100k characters
      by necessity, not laziness. The escapes all trade something: two
      rows lose the script, the band needs the distance small, Myers
      changes the metric.
    </>
  ),

  problem: 'Edit distance and sequence alignment',
  problemSlug: 'edit-distance',
  rivals: [
    {
      name: 'Wagner-Fischer × prefix table',
      isThisUnit: true,
      algoName: 'Wagner-Fischer',
      cost: 'Θ(nm) cells, always',
      wins: (
        <>
          Distance <strong>37</strong> with a verified script in exactly{' '}
          <strong>3,993,996</strong> cells: total, exact, and utterly
          predictable.
        </>
      ),
      costs: (
        <>
          The full table in memory if the script is wanted the easy way:
          space equal to work.
        </>
      ),
      when: 'The default for exact similarity with receipts, at lengths where n·m is affordable.',
    },
    {
      name: "Hirschberg's algorithm",
      cost: '2·nm cells, linear space',
      wins: (
        <>
          The script <strong>survives in linear space</strong>: 3,992 cells
          held instead of four million, by finding where the optimal path
          crosses the middle and recursing on the halves.
        </>
      ),
      costs: (
        <>
          Twice the cell updates (<strong>8,045,979</strong> measured), and
          the recursion is genuinely fiddly to write.
        </>
      ),
      when: 'Long sequences where the alignment itself is the product: genomes, large diffs.',
    },
    {
      name: "Ukkonen's edit distance",
      cost: 'O(k·n) cells',
      wins: (
        <>
          When the answer is small, only the diagonal band can matter:{' '}
          <strong>179,781</strong> cells against 3,993,996, a 22× saving,
          with an honest &quot;more than k&quot; when the band overflows.
        </>
      ),
      costs: (
        <>
          k must be known or guessed (doubling works), and a distant pair
          pays the band for nothing before saying so.
        </>
      ),
      when: 'Near-duplicate detection, spell-check, any workload where most pairs are close.',
    },
    {
      name: 'Myers diff algorithm',
      cost: 'O((n+m)·d)',
      wins: (
        <>
          <strong>3,626 steps</strong> on this pair, three orders under the
          table, by greedily racing &quot;snakes&quot; down matching
          diagonals. This is <code>git diff</code>.
        </>
      ),
      costs: (
        <>
          A different metric: no substitutions (a change costs
          delete-plus-insert: d_indel = 53 here vs 37), and its worst case
          is the dissimilar pair.
        </>
      ),
      when: 'Diffing similar documents and code, where changes are sparse and substitutions unneeded.',
    },
  ],
  neverUse: {
    name: 'The recurrence without the table',
    why: (
      <>
        The three-way recursion is correct and it recomputes the same
        prefix pairs astronomically: <strong>797,161 calls</strong> at
        twelve characters where the table spends 169 cells, a 4,700×
        penalty that cubes onward as 3ⁿ. It is the sharpest small
        demonstration on this site of what &quot;overlapping
        subproblems&quot; means: the recursion tree has exponentially many
        nodes but only (n+1)(m+1) distinct questions. The table is not a
        cache bolted on; it is the discovery that the question space was
        tiny all along.
      </>
    ),
  },

  contest: {
    instance:
      'two strings of 2,000 and 1,995 characters with 40 planted edits (true distance 37); work in cell updates or search steps; every produced script is applied and must reconstruct t exactly',
    columns: ['work', 'space (cells held)'],
    rows: [
      {
        method: 'Wagner-Fischer, full table',
        isThisUnit: true,
        values: ['3,993,996', '3,993,996'],
        verdict: 'exact, scripted, predictable: the reference everything answers to',
      },
      {
        method: 'Two-row variant',
        values: ['3,993,996', '3,992'],
        verdict: 'same work, thousandth of the space, and the script is gone',
      },
      {
        method: "Hirschberg's algorithm",
        values: ['8,045,979', '3,992'],
        verdict: 'twice the work buys the script back into linear space',
      },
      {
        method: 'Ukkonen band, k = 45',
        values: ['179,781', '182'],
        best: 0,
        verdict: 'small distance means the diagonal band is the whole problem',
      },
      {
        method: 'Myers diff (indel metric)',
        values: ['3,626', 'O(n+m)'],
        verdict: 'snakes down the diagonals: three orders less, in its own currency (d = 53)',
      },
      {
        method: 'Naive recursion',
        values: ['797,161 at n=12', 'stack'],
        verdict: '3ⁿ: the price of forgetting that the questions repeat',
      },
    ],
    source:
      'python solutions/wagner_fischer_table.py prints this table and asserts every script (full-table and Hirschberg) transforms s into t in exactly d operations on 300 random pairs and the big pair, the metric axioms including the triangle inequality on 200 triples, the indel identity d = n + m − 2·LCS confirmed by three independent programs (substitution-free DP, separate LCS, Myers), the band honest in both directions, and the cell count equal to (n+1)(m+1) exactly.',
  },

  figure: (
    <Figure
      id="fig-wf-recurrence"
      aspect="16 / 7"
      caption="One cell, three histories. The distance between prefixes s[..i] and t[..j] must end in one of three moves: substitute-or-match (diagonal), delete from s (above), insert from t (left), each landing on a strictly smaller prefix pair. That exhaustiveness is the whole proof, the argmin arrows are the edit script waiting to be walked, and the same three-arrow cell, reweighted, becomes Needleman-Wunsch, gap-affine alignment, and the rest of the alignment family."
      cite={{
        text: 'Wagner and Fischer, "The String-to-String Correction Problem", JACM 21(1), 1974. The distance is Levenshtein, 1965; the same table was found independently by Vintsyuk (1968, speech) and Needleman-Wunsch (1970, biology); the conditional quadratic lower bound is Backurs and Indyk, 2015.',
        href: 'https://doi.org/10.1145/321796.321811',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A DP cell receiving three arrows: diagonal for substitute or match, top for delete, left for insert, with the minimum chosen">
        {[[250, 60], [390, 60], [250, 160], [390, 160]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={120} height={74} rx={8}
            fill={i === 3 ? 'rgba(98,217,138,0.12)' : 'rgba(93,162,255,0.08)'}
            stroke={i === 3 ? '#62d98a' : '#5da2ff'} strokeWidth={i === 3 ? 2 : 1.2} />
        ))}
        <text x="310" y="90" textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">D[i−1][j−1]</text>
        <text x="450" y="90" textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">D[i−1][j]</text>
        <text x="310" y="190" textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">D[i][j−1]</text>
        <text x="450" y="190" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="14">D[i][j]</text>
        <text x="450" y="212" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">min of the three</text>
        <line x1="370" y1="134" x2="412" y2="160" stroke="#f0b94b" strokeWidth="2" />
        <text x="286" y="130" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">substitute / match (+0 or +1)</text>
        <line x1="450" y1="134" x2="450" y2="158" stroke="#e06767" strokeWidth="2" />
        <text x="466" y="150" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">delete (+1)</text>
        <line x1="370" y1="196" x2="388" y2="196" stroke="#5da2ff" strokeWidth="2" />
        <text x="252" y="222" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">insert (+1)</text>
        <text x="40" y="80" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">the state:</text>
        <text x="40" y="100" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">prefix vs prefix</text>
        <text x="40" y="130" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">(n+1)(m+1) distinct</text>
        <text x="40" y="150" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">questions, ever</text>
        <text x="40" y="266" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">walking the chosen arrows backward from the corner IS the edit script</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'wagner_fischer_table.py',
  Viz: EditDistanceViz,
  narration,
};
