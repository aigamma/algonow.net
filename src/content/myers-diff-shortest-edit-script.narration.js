// The spoken lesson for puzzle one hundred twenty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred twenty four: the Myers diff algorithm, paired with shortest edit script search, for text diffing. Here is the puzzle. Two versions of a file, thousands of lines each, nearly identical. Report the fewest insertions and deletions that turn one into the other: the diff that every version control system shows you. The method walks the edit graph, where a step right deletes a line of the first file, a step down inserts a line of the second, and a diagonal step is a free match. The heuristic is how the walk is organized. Instead of filling a table with a cell for every pair of lines, it advances a frontier one edit at a time. For each diagonal it keeps only the furthest point reachable with that many edits, slides along the matches, and stops at the first frontier that reaches the far corner. On this page, one hundred twenty random pairs agree with an independent dynamic program, every script replays one file into the other, and the cost law is measured: with eight edits the frontier examines about forty points whether the files have two hundred fifty lines or two thousand, while the table pays sixty two thousand cells at the small size and four million at the large.',
  },
  {
    section: 'origins',
    text:
      'Eugene Myers, nineteen eighty six, in Algorithmica: An order N D difference algorithm and its variations. It is the diff that GNU diff, git, Mercurial, and nearly every editor’s compare view run. The problem is older. The original Unix diff, by Hunt and McIlroy in nineteen seventy six, computed the longest common subsequence by threading matching positions, and Wagner and Fischer had the full dynamic programming table in nineteen seventy four. Myers’ observation was that people diff similar files, so the answer, the number of edits, is small, and an algorithm whose cost is proportional to that number rather than to the product of the file lengths wins by orders of magnitude in exactly the case that matters. The same paper gives the linear space refinement, which finds a middle snake from both ends, and later work added the heuristics for very different files, the patience and histogram variants, and the readability tweaks git offers today.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the edit graph and the exactness of the answer. Vertices are pairs of positions, one in each file. A step right deletes, a step down inserts, and a diagonal step is free when the two lines match. A shortest path from the top left corner to the bottom right is a shortest edit script, and its length D equals the two lengths added together minus twice the longest common subsequence. The referees: on one hundred twenty random pairs, Myers’ D equals the edit graph dynamic program written separately. The reported script, replayed, turns the first file into the second with exactly D edits. And the identity with the longest common subsequence holds against a third program. The classic pair, kitten to sitting, reports five, insert and delete only, where Levenshtein distance reports three: a different question. The heuristic supplies the frontier search. For D equal to zero, one, two, and so on, and for every diagonal in reach, keep only the furthest point reachable with D edits, extend it by one edit from the better neighboring diagonal, then slide down the diagonal as far as the lines match: the snake. The first frontier to touch the corner is optimal. The work is proportional to the total length times D in the worst case, and tiny in practice: with eight edits the frontier examined forty two points on two thousand lines, where the table filled four million cells.',
  },
  {
    section: 'picture',
    text:
      'Two editors of a long manuscript compare their copies. The slow way is a ledger with a row for every line of one copy and a column for every line of the other, and every cell filled in: a million entries for a thousand line chapter, even if the copies differ by a single word. The fast way is to bet that the copies are nearly the same. Lay them side by side, run a finger down both while the lines agree, and stop at the first disagreement. Now allow exactly one edit, in every way it could be made, and from each of those run the fingers forward again as far as they agree. Then two edits. Then three. The first time a finger run reaches the ends of both copies, you have the fewest edits, and the trail of finger runs is the diff. The cost is the number of edits squared, not the number of lines squared, and for two copies of one manuscript the edits are few.',
  },
  {
    section: 'run',
    text:
      'Here is the run. The edit graph: right deletes, down inserts, diagonal is a free match, and a shortest path is a shortest script. Frontier D: for each diagonal from minus D to D, take the further of a step right from the diagonal below and a step down from the diagonal above. Snake: slide along the matches as far as they go and store the endpoint as the diagonal’s furthest point. Stop at the first frontier touching the corner; that D is the answer, and backtracking through the stored frontiers gives the script. On this page: at a fixed eight edits, files of two hundred fifty, five hundred, one thousand, and two thousand lines cost the frontier forty two, thirty nine, forty one, and forty two points, while the table cost sixty two thousand, two hundred fifty two thousand, one million, and four million cells. At a fixed thousand lines, four, sixteen, sixty four, and two hundred fifty six edits cost the frontier twelve, one hundred forty two, two thousand one hundred, and thirty thousand points, while the table stayed near a million throughout. And one hundred twenty random pairs: every D equal to the dynamic program, every script replaying exactly.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: similar inputs. Versions of one file, a genome against a variant, this week’s configuration against last week’s: the number of edits is small, and the frontier is tiny, forty points for a thousand line file with eight changes. Second: insert and delete only. A diff must show what was removed and what was added, and a substitution would hide both behind one symbol; the edit graph has no substitution step, on purpose. Third: an exact minimum matters. Patches, merges, and blame lines are all built from the script, so a heuristic near diff would produce hunks that do not apply and lines attributed to the wrong author.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The Wagner Fischer table, this site’s live unit, in its insert and delete form: exact, simple, and the referee for every answer on this page. It fills a million cells for two thousand line files that differ by four edits, because the table does not know the files are alike. Reach for it on short inputs, when substitution has a cost, or when you need the whole distance matrix anyway. The longest common subsequence by Hunt and Szymanski: list the matching positions of each line and thread them into a longest increasing chain, the original Unix diff, fast when matches are rare. It pays per match: one hundred three thousand match examinations on the two thousand line pair with a forty line vocabulary, against forty two frontier points, because a small vocabulary means many matches. And patience diff: anchor on lines that appear exactly once in both files, then diff the gaps: hunks that follow the structure a human sees, which is why git offers it. It is not minimal, it will spend extra edits to keep a block together, and it degrades to Myers between the anchors.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. It is quadratic in the number of edits. Very different files have D near the sum of the lengths, and the frontier degrades to the table’s cost with worse constants: thirty thousand points at two hundred fifty six edits and rising, which is why real diff tools cap the effort and fall back to heuristics when files are unrelated. The stored frontiers cost memory proportional to D squared unless the middle snake refinement is used, which recovers linear space at the price of doing the search twice. And the minimum edit script is not always the readable one: it can align a closing brace with the wrong block, and patience and histogram diffs trade a few extra edits for hunks a human would draw.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: Levenshtein distance as your diff. It is the edit distance everyone learns first, and it is one cell update away from the right table, so it gets pasted in. But it allows substitution, and a diff cannot. Kitten to sitting is three under Levenshtein and five as an edit script, and the two extra edits are exactly the information a diff exists to show: which characters were removed, and which were added. A patch built from a substitution allowing alignment does not apply. A merge built from it loses lines. And the lengths disagree with every other tool in the pipeline. The right table is the insert and delete one, and the right search over it is the frontier.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the frontier and its referees. Myers’ search with the stored frontiers and the backtrack that recovers the script. A replay function that applies the script to the first file and must produce the second. The edit graph dynamic program, insert and delete only, written separately. A longest common subsequence program for the identity. Levenshtein distance for the contrast. And the Hunt Szymanski threading for the rival’s price. The self test asserts: one hundred twenty random pairs with D equal to the dynamic program, every script replaying with exactly D edits, and the identity with the longest common subsequence on all of them; the cost law, with frontier work over the worst case bound at most one percent and the table ninety five thousand times the frontier at two thousand lines; the frontier rising two thousand five hundred times from four to two hundred fifty six edits while the table stays near a million; and kitten to sitting at five against Levenshtein’s three. When it prints O K, the algorithm behind every diff you have read has been checked against the table it replaced, on both axes of its cost law. The file would fail before it would lie to you.',
  },
];
