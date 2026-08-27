// The spoken lesson for puzzle fifty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty six: Smith Waterman, paired with zero floored local scores, for sequence alignment. Here is the puzzle. Two sequences: DNA, proteins, or prose: that may share only a small, strongly similar island amid long stretches of unrelated flanking material. Find the highest scoring local alignment: the best matching pair of substrings: and hand back the alignment itself as a certificate. The definitional bar is exact and, at small sizes, enumerable: Smith Waterman’s answer must equal the maximum, over every possible pair of substrings, of their global alignment score. This page verifies that equivalence exhaustively, thousands of substring pairs per trial, one hundred fifty trials.',
  },
  {
    section: 'origins',
    text:
      'Temple Smith and Michael Waterman published the two line modification in nineteen eighty one. Needleman and Wunsch had given biology global alignment a decade earlier, but evolution conserves domains, not whole sequences: a shared functional region inside otherwise divergent proteins is the question biology actually asks. The floor at zero made it a dynamic program; Gotoh added affine gap penalties the following year; and Altschul’s BLAST industrialized the local question in nineteen ninety with seed and extend, becoming one of the most cited tools in all of science. And the statistical fine print, Karlin Altschul phase theory, bit this very page during construction: the story is kept, measured, in the tradeoffs.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the alignment grid: cell i j scores the best alignment ending at those prefix positions, built from three moves: the diagonal, carrying a match or mismatch score, and the two gap moves. This is Needleman Wunsch’s machinery, unchanged, n times m cells. Global alignment reads its answer at the far corner, which is precisely why it drowns here: both ends are forced to align, and four hundred characters of unrelated flank taxed the planted island down to a global score of minus two hundred eighty five. The heuristic supplies two one token edits that change the question entirely. First: floor every cell at zero. An alignment may start anywhere, because debts are never carried in: the moment the running score would go negative, it resets, and history is forgiven. Second: take the answer as the maximum over the whole matrix, not the corner. An alignment may end anywhere: credit is banked at the peak. The same grid then scored the island at seventy. And the ablation isolates the floor’s share: run identically but without the zero, and the best score collapses to nineteen.',
  },
  {
    section: 'picture',
    text:
      'Picture comparing two long family histories for evidence of a shared ancestor. The global judge insists the entire documents correspond, first page to last: two unrelated families who happen to share one great grandmother score terribly, because the one common chapter is taxed away by four hundred pages of noise on either side. The local judge reads with a simple discipline: keep a running resemblance score, and the moment it drops to zero, forget everything and start fresh: no debt survives: while remembering the best stretch ever seen. Debts forgiven at zero, credit banked at the peak. Under that discipline, the shared chapter stands out like a signature, no matter where in either book it happens to sit.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Fill the grid: each cell is the maximum of zero, the diagonal neighbor plus the match or mismatch score, and each straight neighbor plus the gap penalty. The zero is the entire heuristic. Track the argmax as you go: the best cell anywhere in the matrix is the local score, and the alignment ends there. Trace back from that peak, following whichever move produced each cell, until you reach a zero: that is where the alignment began, and the path you walked is the certificate: this page re prices every traceback move by move and asserts the total equals the matrix score. Score in the log phase: choose penalties so that random sequence loses money on average: the fine print measured below. And band only on a bet: restricting to a diagonal band is twelve times cheaper here and exactly as blind as its assumption, both directions measured.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, conserved regions in divergent contexts: protein domains, gene fragments moved by rearrangement, plagiarized paragraphs inside rewritten essays: the island shape, wherever it occurs. Second, you need the alignment and not merely a score: the traceback is the evidence: where the similarity sits, how long it runs, which positions mutated. Third, sensitivity is the contract: Smith Waterman is the exact gold standard that BLAST approximates, and when a miss is expensive: a drug target, a forensic match: the full grid earns its quadratic bill as the verifier of last resort.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: definitionally exact, certificate bearing, and immune to where the island sits. Equal to exhaustive substring pair enumeration on all one hundred fifty trials. Every traceback re priced. The planted island recovered with at least eighty five percent overlap at both tested offsets, scoring one hundred twenty four near the diagonal and one hundred twenty shifted four hundred away: where the banded shortcut found only the first. The weakness, in two honest parts. The full grid costs n times m always: one point four four million cells here whether the island is easy, hard, or absent: which is exactly why BLAST’s seeds exist for database scale. And the scoring parameters are load bearing in a way this page learned by measurement: the first draft used gentle penalties, and the best local alignment of two UNRELATED flanks measured one hundred seventy two: outscoring the seventy four point island by meandering through chance matches. That is the linear phase of Karlin Altschul theory, and the fix is mismatch penalties strong enough that randomness loses money: the BLASTN style scoring this page now runs.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The island experiment at four hundred characters: local score seventy, global score minus two hundred eighty five: the same grid, the same sequences, two different questions. The floor ablation: without the zero, nineteen: the reset is the engine. At scale, a sixty character island in twelve hundred by twelve hundred sequences: the full grid, one point four four million cells, found it at both offsets, one twenty four and one twenty. The banded variant at width fifty: one hundred eighteen thousand cells, an eight to twelve fold discount: found the near diagonal island at the identical one twenty four, and scored twenty one on the shifted one: blind, exactly as its bet predicts. And the referee behind everything: on one hundred fifty small instances, Smith Waterman’s score equaled the maximum over every substring pair of their global alignment score: the definition, checked by brute force, with every certificate re priced.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is local alignment outside the log phase, and this page earns the right to say so, because it committed the sin first. The draft’s gentle scoring: match plus two, mismatch minus one, gap minus two: produced a best local alignment of two unrelated random sequences scoring one hundred seventy two, comfortably above the planted island’s seventy four. Nothing crashed. The traceback looked authoritative. The answer was noise wearing a certificate. Karlin Altschul theory names the disease: when the expected score of random aligned letters is not firmly negative, local scores grow with sequence length and statistical significance evaporates. The discipline costs one sentence: choose penalties so that chance loses money: and the test that catches the violation is the one this page ran: plant an island, and verify the score comes from the island.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the global scorer, the local grid with the zero floor and full traceback, a floorless ablation variant, the banded variant, and an alignment re pricer, under BLASTN style log phase scoring, with the phase lesson recorded as a comment where the constants are defined. The self test asserts, in order: the definitional equivalence against exhaustive substring pair enumeration on one hundred fifty trials, across two alphabets, with every certificate re priced move by move. The four hundred character island recovered at eighty five percent overlap or better, with the global score negative and the ablated score collapsed. At scale, the island found at both offsets by the full grid; the band’s cell count under one eighth of full; the band matching the full score when the island sits inside it, and scoring under half when shifted away. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
