// The spoken lesson for puzzle seventy nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy nine: Manacher’s algorithm, paired with mirrored radius reuse, for the longest palindromic substring. Here is the puzzle. A string, and the question every DNA scanner, plagiarism checker, and interview room eventually asks: find the longest stretch that reads the same in both directions: and find it in linear time. The danger is nesting: every center could expand all the way to the edges, and on the all a adversary the naive method pays eight million two thousand match steps at four thousand characters. The referees: center expansion itself, agreeing on four hundred strings with every witness checked to actually be a palindrome of the reported length: brute force over every substring on sixty small strings: and the linearity claim asserted by counter, not asymptotics: seven thousand nine hundred ninety nine expansions, under the two n bound, on the very adversary that kills the baseline.',
  },
  {
    section: 'origins',
    text:
      'Glenn Manacher, in the Journal of the ACM, nineteen seventy five: a linear time algorithm for the smallest initial palindrome of a string, built in the intellectual neighborhood of Knuth Morris Pratt. What the world now calls Manacher’s algorithm is competitive programming folklore grown from that paper: the generalization to every center at once, with the separator transform: hash a hash b hash: as its standard opening move, unifying odd and even palindromes into one sweep. The modern heir is the Eertree of twenty fifteen, which indexes every distinct palindrome a string contains: but the mirror trick on this page is where linear palindromy began, and it remains the tool you can rebuild at a whiteboard.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the center sweep. Transform the string with separators so that every character and every gap becomes a center: nineteen characters become thirty nine centers: then grow a radius at each center while the two ends match, tracking two numbers across the whole sweep: the rightmost reach R ever achieved, and the center C that achieved it. The bill is the expansions: and here is the entire linearity proof in one sentence: every successful expansion pushes R rightward, and R never retreats: so the total across all centers is at most the string’s length. Asserted by counter: seven thousand nine hundred ninety nine on the four thousand a adversary. The heuristic supplies the free start: a new center i inside R has a twin j, mirrored across C: and inside the big palindrome, the text reads identically both ways: so whatever radius j already verified, i inherits: the minimum of j’s radius and the distance to R: without touching a single character. Audited at fifty thousand palindrome dense characters: sixty percent of all radius was inherited rather than verified.',
  },
  {
    section: 'picture',
    text:
      'Picture a hall of mirrors with one great mirror already mounted: the big palindrome, spanning from its center C out to the frontier R. Stand anywhere inside it and look toward C: you have a twin on the far side, exactly as far from C as you are. Whatever the hall has already certified about your twin: a palindrome of radius four lives at that spot: is certified about you as well, because the great mirror is itself the proof that the two halves of the hall match. Your only fresh work begins where the great mirror ends: peeking past R, one character at a time: and every successful peek extends the great mirror itself, so everyone after you inherits more. The hall never re checks a reflection. That single discipline is the entire difference between eight million steps and eight thousand.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Transform: interleave separators, so odd and even palindromes become one case. Inherit: for center i inside the frontier, start its radius at the minimum of its mirror’s radius and the distance to R: the free start. Expand: push past the inherited radius while the ends match: these steps, and only these, cost anything. Advance the frontier: if this palindrome now reaches past R, it becomes the great mirror: C and R update, and R has only ever moved right. And read everything off the radius array at the end: the longest palindrome is the maximum entry: the count of all palindromic substrings is the sum of the half radii, rounded up: verified on this page against brute enumeration: and per position questions come free. One pass, one array, three questions answered.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, symmetry is the actual query: palindromic repeats in DNA fold into hairpins and mark restriction sites: puzzle engines and aesthetic scanners ask reads both ways directly. Second, repetitive input is expected: runs and near runs are exactly where naive expansion dies its quadratic death: eight million steps at four thousand characters, measured: and repetitive is what genomes and padded logs are. Third, you want all centers, not just the champion: the radius array answers longest, count, and every per position variant in one pass: when the interviewer escalates, the follow ups are already computed.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: linearity asserted rather than claimed, with the referees stacked. The expansion counter came in under two n on the adversary: seven thousand nine hundred ninety nine against eight million two thousand: a thousand to one. Four hundred strings equal to center expansion, with every witness verified to be a palindrome of the reported length at the reported position. Sixty strings against full enumeration. The counting identity: sum of half radii: verified against enumeration too. And the mirror audit quantifying the reuse: sixty percent of all radius inherited, one hundred forty nine thousand units of verification never repeated. The weakness: one question, exact matches, contiguous only. Palindromic subsequences belong to dynamic programming. Approximate palindromes with mismatch budgets break the mirror’s certificate: symmetry with errors does not inherit. Indexing every distinct palindrome for repeated queries is the Eertree’s job. And an honest note about the baseline: on random, non repetitive text, the fifteen line expander is nearly linear in practice: the adversary, not the average, is why the mirror exists.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Center expansion: fifteen transparent lines, no transform, no frontier: this page’s referee on four hundred strings: and quadratic exactly when palindromes nest, which is exactly when the input matters. The suffix array, live on this site: index the string concatenated with its reverse, and longest common extension queries answer palindrome questions along with a hundred others: the right road when the index already exists for other reasons: heavy machinery when it does not. And the Eertree: the twenty fifteen structure with one node per distinct palindrome: at most n plus two exist, a lovely theorem: occurrence counts, suffix palindrome chains, fully online: real machinery, for questions the radius array cannot ask. The ladder is the site’s familiar one: a transparent quadratic, a linear specialist, an index that generalizes: know which rung the question actually needs.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is trusting average case behavior on adversarial input, and the palindrome expander is a perfect specimen. On random text it is nearly linear: which is exactly how it gets shipped. Then production meets a run: repeated characters in a genome, a padded log field, generated test data: and the quadratic wakes up: eight million steps at four thousand characters: a hundred billion at a million: the service that was fine for months times out on one strange file. The pattern generalizes well past palindromes: quicksort’s sorted input death, which the live quickselect unit measured: hash flooding: catastrophic regex backtracking. Average case comfort plus adversarial input is an outage schedule. The defense is this page’s habit: know your adversary, measure on it, and prefer machinery whose guarantee is worst case: the mirror’s R only moves right, no matter what the string does.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the separator transform, the sweep with the mirrored free start and the frontier update, an expansion counter, the center expansion baseline with its own counter, the full substring brute force, and the palindrome counting identity. The self test asserts, in order: four hundred strings equal to center expansion: palindrome dense, mixed alphabet, and planted palindromes in noise: with every witness checked. Sixty strings against full enumeration. Sixty more for the counting identity. The adversary: Manacher’s expansions at most two n plus one, measured seven thousand nine hundred ninety nine: the baseline asserted above n squared over two, measured eight million two thousand. The mirror audit: more than half of all radius inherited at fifty thousand characters: measured sixty percent. And the client: a man a plan a canal panama, its own longest palindrome at twenty one characters. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
