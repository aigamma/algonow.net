// The spoken lesson for puzzle eighty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty: the Z algorithm, paired with Z box window reuse, for pattern preprocessing and substring search. Here is the puzzle. For every position of a string, one question: how long does the text starting here impersonate the very beginning? The answers form the Z array: Z at i is the longest common prefix of the string and its own suffix at i: and with one sentinel trick, the array becomes a complete pattern matcher. The naive answer re verifies every suffix from scratch: seven million nine hundred ninety eight thousand comparisons on the all a adversary. The referees: the naive scan itself, matched array for array on four hundred strings: linearity asserted by counter, three thousand nine hundred ninety nine: Python’s own find on two hundred matcher cases: and the deepest referee on the page: a bridge: the live KMP unit’s failure function, reconstructed from the Z array alone, equal to its direct computation on two hundred strings.',
  },
  {
    section: 'origins',
    text:
      'A rare pedigree on this site: the Z algorithm is textbook born. Dan Gusfield’s nineteen ninety seven book, Algorithms on Strings, Trees, and Sequences, introduced and named it as the clean first chapter of string matching: folklore machinery distilled so that Knuth Morris Pratt and Boyer Moore could be derived from it rather than memorized. The shelf on this site now makes the family visible: the live KMP unit carries the same information in a different coordinate system: proven on this page, not asserted: and yesterday’s Manacher unit is the same never re verify economics, pointed at palindromes instead of prefixes. Three units, one idea: never inspect what a standing certificate already covers.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the prefix similarity sweep. Z at i measures how long the suffix at i copies the prefix: and the harvest is triple. Concatenate pattern, sentinel, text, and run one Z pass: every position where Z reaches the pattern’s length is an occurrence: verified against Python’s own find on two hundred cases. Periodicity reads off the same array: p is a period exactly when Z at p runs to the end: brute verified on two hundred more. The heuristic supplies the Z box: the rightmost window already verified to copy the prefix. A new position inside the box has a twin back near the start: and inside a certified copy, the twin’s certificate transfers: Z at i starts at the minimum of the twin’s value and the distance to the box’s edge. Fresh comparisons happen only past the edge, every success extends some box, and the edge never retreats: total comparisons under two n: measured, three thousand nine hundred ninety nine against eight million.',
  },
  {
    section: 'picture',
    text:
      'Picture a forger’s registry. The opening of the document is the authentic signature, and at every later position the question is how many characters forge it convincingly. The registry keeps exactly one certificate: the furthest reaching verified copy found so far. Anyone starting inside that copy simply points at their twin near the original: whatever you certified about them holds for me: we live inside a verified duplicate: and inspection resumes only past the certificate’s edge. Every fresh inspection extends the certificate for everyone after. Nothing inside a verified copy is ever inspected twice. Three thousand nine hundred ninety nine inspections, where naive diligence performs eight million: diligence is not the virtue: bookkeeping is.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Sweep left to right, maintaining the box L to R. Inherit: for i inside the box, start Z at i from the minimum of the twin’s value and R minus i plus one. Compare only past R: each successful comparison is genuinely new territory. Advance the box whenever the current match reaches past R: R only ever moves right, which is the entire linearity argument. Then harvest: the sentinel matcher for all occurrences: the period test: and, when you need the online streaming form, convert: this page reconstructs KMP’s failure function from the Z array: each Z box announces that a prefix of length Z at i ends at position i plus Z at i minus one: sweep those claims right to left, propagate borders of borders, and the failure function emerges: asserted equal to its direct computation, string by string.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the question is prefix shaped: matching, borders, periods, string powers: the Z array answers the entire family from one pass. Second, you want string machinery you can derive rather than memorize: the box, the twin, the frontier: a picture: and the two famous rivals fall out of it: contest editorials assume it for exactly this reason. Third, repetitive input, once again: runs and periodic text are the naive scan’s quadratic death and the box’s best case: as with the Manacher unit one shelf over, the adversary, not the average, decides who wins.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: linear by counter, and refereed from four directions. Full array equality with the naive scan on four hundred strings. Comparisons under two n on the adversary: two thousand to one. Every occurrence equal to Python’s find across two hundred matcher cases. Smallest periods brute verified on two hundred periodic heavy strings. And the bridge: the live KMP unit’s failure function reconstructed from the Z array alone and asserted equal on two hundred strings: two famous machines, one information content, proven rather than remarked. The weakness: offline on its own string, and prefix shaped only. The Z array describes one fixed string: streaming a text past a pattern is KMP’s native mode: the bridge means you can always convert, but the automaton form is what runs online. Suffix shaped questions need the reversed pass: general substring questions belong to the live suffix array and suffix tree shelf: and the sentinel trick quietly assumes a character outside the alphabet exists to be the sentinel: binary protocols should check.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed, all three live. Knuth Morris Pratt: the same information as an automaton: streams text past a pattern with no sentinel, no lookahead, no second string: the deployable form: derive via Z, ship via KMP. Manacher: the identical economics: inherit inside a verified window, pay only past the frontier: pointed at symmetry: the second example that turns a trick into a pattern worth owning. And the suffix array: the heavyweight index for everything that is not prefix shaped: all substrings, many patterns, longest common extensions: the shelf that begins where the one pass array ends. The family portrait is the lesson: one idea: the standing certificate: wearing three costumes, and a conversion theorem tying two of them together with an assert.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is memorizing what you can derive, and the failure function is the canonical case. Its computation is the classic memorize and pray snippet: the while loop indexing pi at k minus one that candidates transcribe from memory and get subtly wrong under pressure: and an off by one there ships a matcher that is wrong only on some patterns: the worst kind of wrong, because the tests that were tried all passed. The bridge on this page is the alternative discipline. The Z array is derivable from a picture: a box, a twin, a frontier. And this page proves the failure function is the same information: rebuilt from Z, asserted equal, two hundred times. Own the derivable form: convert when deployment needs the other shape. A tool you can rebuild from a picture survives pressure. A memorized incantation fails precisely when it matters. That distinction is this entire site’s reason for pairing every algorithm with its why.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the Z sweep with the box, the twin inheritance, and a comparison counter: the naive per position scan: the sentinel matcher: the direct KMP failure function: the bridge that reconstructs it from the Z array by sweeping box claims right to left and propagating borders of borders: and the period detector. The self test asserts, in order: full Z array equality on four hundred strings across two alphabets. Linearity on the adversary: at most two n comparisons, measured three thousand nine hundred ninety nine, against the naive scan’s asserted quadratic eight million. All pattern occurrences equal to Python’s find on two hundred cases. The bridge exact on two hundred strings. And smallest periods equal to brute force on two hundred periodic heavy strings. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
