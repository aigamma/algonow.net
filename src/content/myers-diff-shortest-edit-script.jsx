import MyersDiffViz from '../viz/MyersDiffViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/myers_diff_shortest_edit_script.py?raw';
import { narration } from './myers-diff-shortest-edit-script.narration.js';

export const content = {
  given:
    'Two versions of a file, thousands of lines each, nearly identical. Report the fewest insertions and deletions that turn one into the other: the diff every version-control system shows you.',
  task: 'Walk the edit graph, where right deletes, down inserts, and a diagonal step is a free match. Instead of filling the N × M table, advance a frontier one edit at a time: for each diagonal keep only the furthest point reachable with D edits, slide along matches, and stop at the first frontier that reaches the corner.',
  constraint:
    'On 120 random pairs the reported D equals the edit-graph dynamic program (insert and delete only, written separately), every script replays A into B with exactly D edits, and D = N + M − 2·LCS holds with LCS from a third program. The cost law is measured: at 8 edits the frontier examines about 40 points whether the files have 250 or 2,000 lines, while the table pays 62,000 to 3,996,000 cells; at 1,000 lines the frontier grows from 12 to 30,020 as the edits grow from 4 to 256, and the table stays at a million.',

  origins: (
    <p>
      Eugene Myers, <strong>1986</strong>, An O(ND) Difference
      Algorithm and Its Variations (Algorithmica): the diff that
      GNU diff, git, Mercurial, and nearly every editor&apos;s compare
      view run. The problem is older: Unix diff (Hunt and McIlroy,
      1976) computed the longest common subsequence by threading
      matching positions, and Wagner and Fischer (1974) had the
      full dynamic-programming table. Myers&apos; observation was
      that people diff similar files, so the answer D is small, and
      an algorithm whose cost is proportional to D rather than to
      N × M wins by orders of magnitude in the case that matters.
      The same paper gives the linear-space refinement (a middle
      snake found from both ends), and later work added
      heuristics for very different files, the histogram and
      patience variants, and the readable-diff tweaks git offers
      today.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>edit graph and the answer&apos;s
      exactness</strong>. Vertices are pairs (x, y) of positions in
      A and B; a step right deletes A[x], a step down inserts B[y],
      and a diagonal step is free when A[x] = B[y]. A shortest
      path from (0, 0) to (N, M) is a shortest edit script, and its
      length D satisfies D = N + M − 2·LCS. The referees: on
      120 random pairs Myers&apos; D equals the edit-graph dynamic
      program written separately; the reported script, replayed,
      turns A into B with exactly D edits; and the LCS identity
      holds against a third program. The classic kitten-to-sitting
      pair reports 5 (insert and delete only) where Levenshtein
      reports 3: a different question.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>frontier search</strong>. For D = 0, 1,
      2, …, and for every diagonal k = x − y in reach, keep only
      the furthest point reachable with D edits, extend it by one
      edit from the better neighbor diagonal, then slide down the
      diagonal as far as the sequences match (the snake). The first
      frontier to touch (N, M) is optimal. Work is O((N + M)·D) in
      the worst case and tiny in practice: with 8 edits the
      frontier examined <strong>42 points on 2,000 lines</strong>{' '}
      where the table filled 3,996,000 cells; on 1,000 lines the
      frontier grew from 12 to 30,020 points as the edits grew from
      4 to 256 while the table stayed at about a million regardless.
    </p>
  ),

  picture: (
    <p>
      Two editors of a long manuscript compare their copies. The
      slow way is a ledger with a row for every line of one copy
      and a column for every line of the other, every cell filled
      in: a million entries for a thousand-line chapter, even if the
      copies differ by one word. The fast way is to bet the copies
      are nearly the same. Lay them side by side, run a finger down
      both while the lines agree, and stop at the first
      disagreement. Now allow exactly one edit, in every way it
      could be made, and from each of those run the fingers forward
      again as far as they agree. Then two edits, then three. The
      first time a finger run reaches the ends of both copies, you
      have the fewest edits, and the trail of finger runs is the
      diff. The cost is the number of edits squared, not the number
      of lines squared, and for two copies of one manuscript the
      edits are few.
    </p>
  ),

  steps: [
    <>
      <strong>Edit graph:</strong> right = delete A[x], down = insert
      B[y], diagonal = free match; shortest path = shortest script.
    </>,
    <>
      <strong>Frontier D:</strong> for each diagonal k in
      −D..D, take the further of (right from k − 1) and (down
      from k + 1).
    </>,
    <>
      <strong>Snake:</strong> slide along matches as far as they
      go; store the endpoint as the diagonal&apos;s furthest point.
    </>,
    <>
      <strong>Stop:</strong> the first frontier touching (N, M)
      gives D; backtrack through the stored frontiers for the
      script.
    </>,
    <>
      <strong>Check:</strong> replay the script (A becomes B,
      exactly D edits) and D = N + M − 2·LCS, 120/120.
    </>,
  ],

  signals: [
    <>
      <strong>Similar inputs:</strong> versions of one file, one
      genome against a variant, one config against last
      week&apos;s: D small, the frontier tiny.
    </>,
    <>
      <strong>Insert and delete only:</strong> a diff must show
      what was removed and what was added; substitution would hide
      both behind one symbol.
    </>,
    <>
      <strong>An exact minimum matters:</strong> patches, merges,
      and blame lines are built on the script, so a heuristic
      near-diff would produce wrong hunks.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>Wagner-Fischer
      table</strong> with insert and delete costing one and no
      substitution: the referee on this page, exact, and blind to
      similarity. It fills 3,996,000 cells for two 2,000-line files
      that differ by 8 edits, where the frontier examines 42
      points; it fills the same million cells for 1,000-line files
      whether they differ by 4 edits or 256.
    </>
  ),

  strength: (
    <>
      <strong>Exact, and priced by the answer instead of the
      input.</strong> 120/120 pairs agree with the table, every
      script replays, the LCS identity holds; the frontier
      examined about 40 points for 8 edits at every size from 250 to
      2,000 lines, a ratio to (N + M)·D of at most 0.01, and the
      table grew to 95,000× the frontier&apos;s work at 2,000 lines.
      The same scan finds the script, not just its length.
    </>
  ),
  weakness: (
    <>
      <strong>Quadratic in D, and the shortest diff is not always
      the readable one.</strong> Very different files have D near
      N + M and the frontier degrades to the table&apos;s cost with
      worse constants (30,020 points at 256 edits and rising);
      real diff tools cap the effort and fall back to heuristics.
      The stored frontiers cost O(D²) memory unless the
      middle-snake refinement is used. And the minimum-edit script
      can align a closing brace with the wrong block; patience and
      histogram diffs trade a few extra edits for hunks a human
      would draw.
    </>
  ),

  problem: 'Text diffing',
  problemSlug: 'text-diffing',
  rivals: [
    {
      name: 'Myers × frontier search',
      isThisUnit: true,
      algoName: 'Myers diff algorithm',
      cost: 'O((N + M)·D)',
      wins: (
        <>
          <strong>Exact and answer-sized</strong>: 42 points for 8
          edits on 2,000 lines, 120/120 agreement with the table,
          the script recovered in the same pass.
        </>
      ),
      costs: (
        <>
          O(D²) when the files are unrelated, O(D²) memory
          without the middle snake, and minimal is not always
          readable.
        </>
      ),
      when: 'Version control and every compare view: similar inputs where the edit count is the small number.',
    },
    {
      name: 'Wagner-Fischer',
      cost: 'O(N·M) always',
      wins: (
        <>
          The live unit here, in its insert-and-delete form: exact,
          simple, and the referee for every answer on this page.
        </>
      ),
      costs: (
        <>
          A million cells for two thousand-line files that differ
          by four edits; the table does not know the files are
          alike.
        </>
      ),
      when: 'Short inputs, substitution costs, or when you need the whole distance matrix anyway.',
    },
    {
      name: 'Longest common subsequence',
      algoName: 'Longest common subsequence',
      cost: 'matches, threaded',
      wins: (
        <>
          Hunt-Szymanski: list the matching positions of each line
          and thread them into a longest increasing chain: the
          original Unix diff, fast when matches are rare.
        </>
      ),
      costs: (
        <>
          Pays per match: 103,071 match examinations on the
          2,000-line pair with a 40-line vocabulary, against 42
          frontier points.
        </>
      ),
      when: 'Large alphabets with few repeated lines, where the match list is short.',
    },
    {
      name: 'Patience diff',
      cost: 'unique-line anchors',
      wins: (
        <>
          Anchor on lines that appear exactly once in both files,
          then diff the gaps: hunks that follow the structure a
          human sees, which is why git offers it.
        </>
      ),
      costs: (
        <>
          Not minimal: it will spend extra edits to keep a block
          together, and it degrades to Myers between anchors.
        </>
      ),
      when: 'Code review, where a readable diff beats a shortest one.',
    },
  ],
  neverUse: {
    name: 'Levenshtein distance as your diff',
    why: (
      <>
        It is the edit distance everyone learns first, and it is
        one cell-update away from the right table, so it gets
        pasted in. But it allows substitution, and a diff cannot:
        kitten to sitting is <strong>3 under Levenshtein and 5 as an
        edit script</strong>, and the two extra edits are exactly
        the information a diff exists to show (which characters were
        removed, which were added). A patch built from a
        substitution-allowing alignment does not apply, a merge
        built from it loses lines, and the lengths disagree with
        every other tool in the pipeline. The right table is the
        insert-delete one; the right search over it is the
        frontier.
      </>
    ),
  },

  contest: {
    instance:
      'shortest edit script between line sequences over a 40-line vocabulary; currency: cells examined (frontier extensions for Myers, table cells for the dynamic program, match examinations for Hunt-Szymanski); referees: the edit-graph DP, script replay, the LCS identity',
    columns: ['250 lines, 8 edits', '2,000 lines, 8 edits', '1,000 lines, 256 edits'],
    rows: [
      {
        method: 'Myers frontier',
        isThisUnit: true,
        values: ['42', '42', '30,020'],
        best: 1,
        verdict: 'priced by D: flat across file size, growing with the edits',
      },
      {
        method: 'Wagner-Fischer table (insert/delete)',
        values: ['62,000', '3,996,000', '986,000'],
        verdict: 'priced by N × M: blind to similarity',
      },
      {
        method: 'Hunt-Szymanski matches',
        values: ['1,827', '103,071', '-'],
        verdict: 'priced by the number of matching pairs: a small vocabulary means many',
      },
    ],
    source:
      'python solutions/myers_diff_shortest_edit_script.py prints these tables and asserts: 120 random pairs with Myers D equal to the edit-graph dynamic program, every script replaying A into B with exactly D edits, and D = N + M − 2·LCS on all; the cost law (frontier work over (N + M)·D at most 0.01, the table 95,143× the frontier at 2,000 lines, the frontier rising 2,502× from 4 to 256 edits while the table stays near a million); and kitten-to-sitting at 5 against Levenshtein’s 3.',
  },

  figure: (
    <Figure
      id="fig-myers-frontier"
      aspect="16 / 7"
      caption="The edit graph and the frontier. Right deletes, down inserts, diagonals are free matches. Each frontier holds, per diagonal, the furthest point reachable with D edits; a step takes the better neighbor and then snakes along matches. The first frontier to reach the corner is the shortest edit script. Measured: with 8 edits the frontier examined 42 points whether the files had 250 or 2,000 lines, while the table filled 62,000 to 3,996,000 cells; with 1,000 lines the frontier grew from 12 points at 4 edits to 30,020 at 256 while the table stayed near a million."
      cite={{
        text: 'E. W. Myers, "An O(ND) Difference Algorithm and Its Variations," Algorithmica 1(1-4), 1986. DOI 10.1007/BF01840446. Hunt-McIlroy 1976; Wagner-Fischer 1974.',
        href: 'https://doi.org/10.1007/BF01840446',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An edit-graph grid with diagonal match segments, three expanding frontiers of furthest points, and the shortest path drawn to the corner">
        {[...Array(8).keys()].map((i) => (
          <g key={i}>
            <line x1={60 + i * 32} y1={40} x2={60 + i * 32} y2={264} stroke="rgba(154,165,189,0.25)" strokeWidth="1" />
            <line x1={60} y1={40 + i * 32} x2={284} y2={40 + i * 32} stroke="rgba(154,165,189,0.25)" strokeWidth="1" />
          </g>
        ))}
        {[[0, 0], [1, 1], [2, 2], [4, 3], [5, 4], [6, 5], [3, 5], [2, 6]].map(([x, y], i) => (
          <line key={i} x1={60 + x * 32} y1={40 + y * 32} x2={92 + x * 32} y2={72 + y * 32} stroke="rgba(154,165,189,0.7)" strokeWidth="1.2" />
        ))}
        <path d="M 60 40 L 156 136 L 188 136 L 220 168 L 252 168 L 284 200 L 284 232 L 284 264" fill="none" stroke="#62d98a" strokeWidth="2.6" />
        {[[156, 136], [188, 136], [124, 168]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#5da2ff" />)}
        {[[220, 168], [252, 168], [156, 200], [92, 200]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="rgba(93,162,255,0.6)" />)}
        <text x="300" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">right: delete A[x] · down: insert B[y] · diagonal: free match (the snake)</text>
        <text x="300" y="84" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">frontier D: the furthest point on each diagonal k = x − y</text>
        <text x="300" y="104" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">green: the first path to the corner, D = 3, the shortest script</text>
        <text x="300" y="140" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">8 edits: 42 frontier points at 250 lines and at 2,000</text>
        <text x="300" y="160" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the table: 62,000 cells at 250, 3,996,000 at 2,000</text>
        <text x="300" y="192" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">1,000 lines: frontier 12 → 30,020 as edits go 4 → 256</text>
        <text x="300" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the table stays near a million cells regardless</text>
        <text x="300" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">referees: DP agreement 120/120, script replay exact, D = N + M − 2·LCS</text>
        <text x="300" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">kitten → sitting: script 5, Levenshtein 3 (a different question)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'myers_diff_shortest_edit_script.py',
  Viz: MyersDiffViz,
  narration,
};
