// The spoken lesson for puzzle thirty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty one: Strassen’s algorithm, paired with the seven product block split, for fast matrix multiplication. Here is the puzzle. Multiply two n by n matrices, exactly, in fewer than n cubed scalar multiplications. And the constraint that keeps the page honest: exactly means audited. Every product computed here is verified by an independent randomized check, Freivalds’ probes, because a fast wrong answer is worth nothing, and the check itself turns out to cost eight times less than recomputing the product would.',
  },
  {
    section: 'origins',
    text:
      'In nineteen sixty nine, Volker Strassen set out to prove that Gaussian elimination, and with it the classical n cubed matrix multiplication, was optimal. He found the opposite, and the paper’s title records the failure: Gaussian Elimination is not Optimal. The intended theorem died in the writing, and in its place stood seven block products where eight had seemed necessary. The exponent barrier fell, and kept falling: Pan in the seventies, then Coppersmith and Winograd at two point three seven six in nineteen ninety, then decades of refinements down to roughly two point three seven today. In twenty twenty two, DeepMind’s AlphaTensor rediscovered and extended these small case identities by machine search. And through all of it, the nineteen sixty nine original remains the only member of the whole lineage that real numerical libraries actually run.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the block recursion. An n by n product is a two by two product of half size blocks. Done naively, that is eight half size multiplications, and the recurrence, eight subproblems at half size, lands back on n cubed exactly. Divide and conquer, by itself, buys nothing here. Its whole job is to be the amplifier: any saving at the two by two level compounds at every level of the recursion. The heuristic supplies the saving: seven products instead of eight. M one through M seven are cunning sums times sums of blocks, and their additions and subtractions reassemble all four quadrants of the answer. The tests verify that identity on five hundred random scalar cases before any matrix is allowed to trust it. One multiplication traded for eighteen additions per level, and through the amplifier the exponent falls from three to log base two of seven, about two point eight zero seven. At size two hundred fifty six, that is nine point eight million multiplications against the classical sixteen point eight million, and fewer total operations too: twenty two point three million against thirty three point five.',
  },
  {
    section: 'picture',
    text:
      'Picture a courier pricing trick, compounded. Shipping one big consignment costs eight standard sub shipments. A clever packer finds a way to do it with seven, at the price of some extra sorting work on both loading docks. Once, that would be a curiosity. But every sub shipment is itself packed the same clever way, and its own sub shipments too. The one in eight saving multiplies through every layer, and eight layers deep the fleet runs at seven eighths to the eighth power, about a third fewer trucks. The sorting got heavier. The trucks got fewer. And trucks are what you pay for.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Split each matrix into two by two blocks of half size. Form the seven products: M one is the sum of A one one and A two two, times the sum of B one one and B two two; M two is the sum of A two one and A two two, times B one one; and so on through M seven, each a product of block sums and differences. Assemble the quadrants: C one one is M one plus M four minus M five plus M seven; C one two is M three plus M five; C two one is M two plus M four; C two two is M one minus M two plus M three plus M six. Recurse into each of the seven, down to a cutoff size where the classical method takes over; the measured sweep, not the asymptotic exponent, chooses that cutoff. Finally, audit: Freivalds’ check multiplies both sides by a random zero one vector, comparing A times B v against C v, at quadratic cost per probe. Twenty probes push the error probability below one in a million, and the whole audit costs eight times less than recomputing.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the matrices are large and dense, and multiplications genuinely dominate the cost: big integer arithmetic, exact rationals, secure multi party computation, hardware where a multiply costs far more than an add. Second, the arithmetic is exact or well conditioned: Strassen’s floating point error bounds are modestly weaker than the classical method’s, which is a real consideration in numerical work and a non issue over the integers here. Third, a cutoff hybrid is acceptable: nobody runs the pure recursion to the scalar floor, and the right recursion depth is read off a measured sweep.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the exponent is real, and the recursion amplifies it. At size sixty four with no cutoff, the multiplication count is exactly seven to the sixth power, one hundred seventeen thousand six hundred forty nine, asserted to the integer. At practical size with a practical cutoff, the total operation count still wins by a third. And this identity is the historical door: everything from two point eight down to today’s two point three seven walks through its idea. The weakness: additions, memory traffic, and stability. Eighteen block additions per level are the tax, twelve and a half million of them at cutoff sixteen. The temporary matrices stress caches in ways operation counts cannot see. Error bounds are somewhat weaker in floating point. And the fast successors are galactic: the two point three seven exponent methods have never once profitably multiplied a real matrix.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, at size two hundred fifty six on exact integer matrices, with every count asserted to the integer and every product audited. The classical triple loop: sixteen million, seven hundred seventy seven thousand, two hundred sixteen multiplications, which is two hundred fifty six cubed by definition, plus sixteen point seven million additions. Strassen with cutoff sixteen: nine million, eight hundred thirty four thousand, four hundred ninety six multiplications, forty one percent fewer, plus twelve point five million additions, for a total of twenty two point three million operations against the classical thirty three point five. The cutoff sweep shows every deeper level of recursion helping: total operations fall monotonically as the cutoff drops from two hundred fifty six, which is pure classical, down to sixteen. And Freivalds’ referee prices verification at three point nine million operations against thirty three point five million to recompute: eight times cheaper, with the planted corruption caught.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is a galactic exponent in production, and the trap deserves its anatomy, because it is the same lesson as the cutoff sweep at a cosmic scale. The two point three seven exponent methods, Coppersmith Winograd and its refinements, are genuinely better asymptotically; that is a theorem. But their hidden constants are so large that the crossover size, the matrix dimension where they would first beat Strassen, exceeds anything storable in any machine, or any warehouse of machines. They have never once been the fastest way to multiply an actual matrix, and barring a breakthrough in the constants, they never will be. The measured sweep on this page is the small honest version of the same principle: recursion depth is chosen by the ledger, not by the exponent. An asymptotic win with an unpayable constant is mathematics, and good mathematics, and not an algorithm you run. Know the difference, and cite both honestly.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the classical triple loop with exact operation counters, the Strassen recursion with its seven products and a tunable cutoff, a padding wrapper for sizes that are not powers of two, and Freivalds’ randomized verifier. The self test asserts, in order: the seven product identity itself on five hundred random scalar cases, term by term; agreement of the pure, cutoff, and padded variants with the classical product on sizes including thirty one, thirty three, and one hundred; the multiplication count exactly seven to the sixth at size sixty four, and exactly seven to the fourth times sixteen cubed at cutoff sixteen; the auditor passing every honest product and refusing a copy with a single corrupted entry; the sweep’s verdict that real recursion beats the pure classical count; and the eight to one price ratio of verifying against recomputing. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
