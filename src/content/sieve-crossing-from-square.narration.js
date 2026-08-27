// The spoken lesson for puzzle seventy six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy six: the sieve of Eratosthenes, paired with crossing off from the square, for prime enumeration. Here is the puzzle. Produce every prime up to n: not one primality question, but all of them at once: with a bill of n log log n: barely more than the cost of reading the numbers. The referees on this page are unusually redundant, on purpose: two independent judges audit every single entry up to twenty thousand: trial division, and the live Miller Rabin unit’s deterministic bases: the famous constants must land to the digit: seventy eight thousand four hundred ninety eight primes below a million, eight thousand one hundred sixty nine twin pairs: and the work bill itself must match a theorem of Mertens from eighteen seventy four, measured here within zero point one seven percent.',
  },
  {
    section: 'origins',
    text:
      'The oldest named algorithm on this site, by twenty two centuries. Eratosthenes of Cyrene, chief librarian of Alexandria around two hundred forty B C: the same man who measured the circumference of the Earth with a stick, a well, and a shadow: and the sieve reaches us through Nicomachus’s Introduction to Arithmetic, four centuries later. It never left service. Bays and Hudson’s nineteen seventy seven segmented form carried it to ten to the twelfth, and every prime table behind modern number theory experiments: Goldbach verifications, twin prime hunts, zeta zero computations: is still this sieve, wearing cache optimizations. Twenty two hundred years of production uptime.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the shared table: one boolean per number, everything standing open, and each discovered prime sweeps its multiples out of everyone’s future at once. The pooling is the entire economics: no number is ever interrogated alone, so the total work is the sum over primes of n over p: which Mertens’s theorem prices at n times the quantity log log root n plus a constant. Measured on this page: two million one hundred ninety seven thousand crossings against a predicted two million one hundred ninety four thousand: zero point one seven percent: a nineteenth century theorem, invoiced to four digits. The heuristic supplies the square rule: start each prime’s sweep at p squared, because every smaller multiple of p owns a factor smaller than p, and that factor already swept it. The saving is exact and asserted to the unit: seventy five thousand seven hundred ninety one crossings, which is precisely the sum of p minus two over the primes below root n. And the structural earnings dwarf the arithmetic: p squared being the first fresh multiple is the proof that the outer loop may stop at root n.',
  },
  {
    section: 'picture',
    text:
      'Picture a hall of numbered doors, and no inspector anywhere. Two walks the hall slamming every second door after his own. Three follows, slamming every third. And here is the rule’s elegance: when five begins his walk, doors ten, fifteen, and twenty are already slammed: ten by two, fifteen by three, twenty by two: so his first fresh door is twenty five: his own square. Every walker begins at his square. And the moment the next walker’s square lies beyond the end of the hall, the walking is over: every door still open stays open forever. Notice what never happened: nobody knocked on a door to ask whether it was prime. The composites slammed themselves, each by the hand of its smallest factor. Primality was never tested: it was what remained.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Lay the table: one boolean per number, all open: zero and one closed by convention. Sweep: for each still open p starting from two, slam p squared, then p squared plus p, and onward by p to the end. Stop when p squared exceeds n: which is not a shortcut but a theorem: any composite up to n has a factor at most root n, which is the square rule read backward. Read the table: everything still open is prime: seventy eight thousand four hundred ninety eight of them below a million, asserted to the digit. And when n outgrows memory, segment: sieve a sliding window with the small primes: the Bays Hudson form, and the shape of every production sieve since: same sweeps, cache sized rooms.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you want all the primes, not one: tables for factorization, number theory experiments, competitive programming precomputation: enumeration is the actual question, and per number testing rebuilds shared work n times. Second, the range is dense and bounded: up to n is the sieve’s home field: one isolated three hundred digit candidate belongs to the live Miller Rabin unit, the opposite contract. Third, memory for n bits exists, or root n does: a bit per number in the flat form: a window plus the small primes in the segmented form: the structure every refinement keeps.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: judged twice everywhere, famous constants to the digit, and a theorem on the invoice. Trial division and Miller Rabin: two judges with nothing in common: agree with the table on every number to twenty thousand. Pi of ten to the sixth: seventy eight thousand four hundred ninety eight, exact. Twin pairs: eight thousand one hundred sixty nine, exact. The Mertens bill within zero point one seven percent. The square rule’s shave exact to the unit. And Goldbach verified for every even number to twenty thousand: the sieve as the substrate the experiments stand on. The weakness: dense ranges only, memory bound, and blind past its wall. The table costs n bits whether you want all the primes or three of them: one faraway candidate is Miller Rabin’s question. Real implementations are bounded by cache misses, not arithmetic: the segmented refinement exists precisely for this. And enumeration says nothing about structure: factoring one hard composite is a different shelf entirely.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Miller Rabin, live, and this page’s second judge: one isolated candidate of any size, no table, the cryptographic workhorse: per number pricing that loses the dense range race fourteen times over before its exponents even matter. The segmented sieve: not an alternative but this unit wearing a window: root n memory, cache sized blocks, the road to ten to the twelfth and the form everything serious ships. And the sieve of Atkin: the asymptotic one up: quadratic form characters instead of sweeps, sublinear in the log log on paper: and in nearly every benchmark ever run, beaten by a wheeled, segmented Eratosthenes: constants are real, and twenty two centuries of tuning is a moat. The lesson in the lineup: refinements that keep the structure win; replacements that improve the exponent on paper mostly do not.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is trial dividing a dense range, and the meter makes it plain: two million seven hundred forty five thousand divisions to clear one hundred thousand numbers, against one hundred ninety three thousand pooled crossings: fourteen point two times, and widening with n. The deeper error is architectural, and this site has taught it before in other clothes: the questions share almost all of their work: every number in the range is asking about the same small primes: and per number testing rebuilds that shared answer from scratch, n separate times. It is the index units’ lesson: never rebuild per query what the queries share: wearing number theory’s clothes. When the questions overlap, build the shared structure once and let every question read it. The sieve is that principle’s oldest monument: twenty two hundred years old, and still the cheapest way humanity knows to know all the primes.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the sieve with a crossing counter and a switchable start: from the square, or naively from two p: plus trial division and the deterministic Miller Rabin as the two judges. The self test asserts, in order: all three methods agreeing on every number to twenty thousand. The famous constants exact: seventy eight thousand four hundred ninety eight primes, eight thousand one hundred sixty nine twin pairs. The Mertens bill: naive crossings within one percent of the theorem: measured, zero point one seven. The square rule’s saving equal, to the unit, to the sum of p minus two over primes below root n: an exact identity discovered when the first run sat three percent under the Mertens line and the gap turned out to be the shave itself. The fourteen times race. And Goldbach: every even number to twenty thousand written as a sum of two primes from the table. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
