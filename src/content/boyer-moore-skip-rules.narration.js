// The spoken lesson for puzzle forty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty four: Boyer Moore, paired with the bad character and good suffix rules, for substring search. Here is the puzzle. A text of n characters, a pattern of m. Report every occurrence: while reading fewer than n characters. Sublinearity is the whole point and the whole surprise. This page finds a thirteen character pattern in its own sixty thousand character build plan while inspecting ten point nine percent of it, measured against a standard library referee. And the effect deepens: the longer the pattern, the less of the text gets read: six percent at thirty two characters.',
  },
  {
    section: 'origins',
    text:
      'Robert Boyer and J Strother Moore published the right to left scan in nineteen seventy seven, and the claim still sounds illegal on first hearing: find the needle without reading most of the haystack. Nigel Horspool showed in nineteen eighty that the bad character rule alone usually suffices, and Sunday trimmed further in eighty six. Zvi Galil added the patch that makes the worst case truly linear in seventy nine. The most famous deployment is grep: the celebrated explanation of why GNU grep is fast opens with exactly this algorithm and exactly this property: it does not look at most of the bytes.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the right to left scan. At each alignment of the pattern under the text, compare from the pattern’s last character backward. A mismatch there is not a failure: it is intelligence. The text character just revealed may not occur anywhere in the pattern, in which case no alignment overlapping it can ever match, and the pattern may leap its entire length in one move. A left to right scan can never learn this: K M P, measured on the same search, read exactly one hundred point zero percent of the text, because its guarantee requires witnessing everything. The heuristics are the two precomputed tables that spend the intelligence. The bad character rule: slide until the mismatched text character sits under its rightmost occurrence in the pattern, or past the whole pattern if it occurs nowhere. The good suffix rule: slide until the already matched tail re aligns with its next occurrence inside the pattern. Take the larger of the two. On prose, the first rule does nearly all the work: Horspool’s one table version tied this unit exactly, at six thousand five hundred ninety nine inspections. The second rule earns its keep on small alphabets, where bad character collapses and good suffix holds the line: measured below.',
  },
  {
    section: 'picture',
    text:
      'Picture checking whether a twelve digit serial number appears anywhere on a long printed tape. The amateur reads the tape digit by digit, every digit. The inspector lays a stencil of the serial over the tape and looks only at the last window position. The symbol there is a seven, and the serial contains no seven. Then the stencil cannot match here, nor at any alignment that overlaps this seven: slide the whole stencil past it. One glance bought twelve positions of certainty. Repeat, and most of the tape passes under the stencil without ever being read: which is precisely why this page’s measured search left eighty nine percent of its own text untouched.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Precompute two tables, once, in time proportional to the pattern plus the alphabet: the rightmost position of each symbol in the pattern, and the good suffix shifts, built from the pattern’s borders. Align the pattern at the left end of the text. Compare backward from the pattern’s last character. On a mismatch, shift right by the larger of the two rules’ recommendations, never less than one. On a full match, report the occurrence and shift by the pattern’s period, which is what the good suffix table stores for a complete match. Repeat to the end of the text. The measured dial: at pattern length four, thirty one percent of the text read; at eight, sixteen point six; at sixteen, ten; at thirty two, six. Longer patterns leap further, because every mismatch rules out more.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, longish patterns over rich alphabets: words and phrases in text, byte signatures in binaries: the leap scales with both the pattern length and the diversity of symbols. Second, the text dwarfs the pattern and will be scanned once: searching logs, an editor’s find command, malware signatures over a disk image: no index exists and building one is not worth it for a single pass. Third, reading itself is the cost that matters: when every byte touched is a cache miss or a page fault, an algorithm that skips bytes beats an algorithm that merely processes them quickly.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: sublinear on real text, and deepening with pattern length. Ten point nine percent of the text read for a thirteen character pattern, six percent at thirty two, every occurrence agreeing with the standard library referee, and eighty nine percent of the haystack never touched at all. This is the property no left to right method can have, and it is why the fastest search tools begin their explanations with this algorithm. The weakness, in three honest parts. Small alphabets: on binary text the bad character rule collapses, and Horspool alone read one and a half times the text: more than reading everything: while the good suffix rule held the full pair to half. Short patterns: at three characters or fewer, the leaps barely pay for the machinery. And the quadratic tail: the unpatched worst case is real and measured: an all a text of twenty thousand searched for twenty a’s cost almost four hundred thousand inspections. Galil’s rule repairs it to linear; this page cites the patch and measures the disease.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on this site’s own build plan of sixty thousand three hundred sixty five characters, searching for the thirteen character phrase, the algorithm. Naive left to right: sixty four thousand six hundred sixty one characters read: one hundred seven percent of the text, some of it twice. K M P: sixty thousand three hundred sixty five: one hundred point zero percent, exactly the text length, which is its design and its guarantee. Horspool, bad character only: six thousand five hundred ninety nine: ten point nine percent. Boyer Moore with both rules: the same six thousand five hundred ninety nine: an exact tie on prose. The tie is the honest headline for rich alphabets, and the split arrives on binary text: Horspool one point five zero n, the full pair zero point five zero n. The second table is not decoration. It is insurance, and the premium comes due exactly when the alphabet shrinks.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the bad character rule alone on a small alphabet, and the number deserves repeating because it sounds impossible: on random binary text, Horspool read one hundred fifty percent of the text it was searching. More characters inspected than the text contains, because inspections revisit windows that the tiny shifts barely move. The same instance, with the good suffix table in play, cost half the text. Genomes over a four letter alphabet, bitmasks, binary protocols: these are exactly the places where the usually harmless simplification quietly triples its bill. The general lesson is one sentence: a heuristic that earns its keep on average inputs can still have a structural blind spot, and the alphabet size is this one’s: measure on your data’s alphabet, not on English.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements naive search, K M P with its failure function, Horspool with the single bad character table, and full Boyer Moore with both tables, the good suffix construction done via the border array, all with character inspection counters. The self test asserts, in order: all four methods equal the standard library referee across six hundred adversarial trials spanning binary through English like alphabets, patterns present and absent, overlapping occurrences included. Sublinearity on real prose, deepening monotonically with pattern length. K M P reading at least n characters, as its design requires. The small alphabet split: Horspool above one point zero n on binary while the full pair stays below zero point eight, with the two tying within two percent on prose. And the unpatched worst case measured beyond five n. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
