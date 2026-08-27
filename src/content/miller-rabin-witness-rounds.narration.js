// The spoken lesson for puzzle thirty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty two: Miller Rabin, paired with random witness rounds, for primality testing. Here is the puzzle. You are handed an odd integer, possibly thousands of bits long. Decide whether it is prime or composite, without factoring it, with an error probability you choose in advance and can drive below any bound. The constraint that gives the problem its teeth: the cost must stay polynomial in the number of digits. Factoring is hopeless at cryptographic sizes, and yet every R S A key ever issued needed two fresh primes. This test is how those primes are born.',
  },
  {
    section: 'origins',
    text:
      'Fermat’s little theorem, from sixteen forty, gave the first filter: if n is prime, then a to the n minus one is congruent to one, for any base a. By nineteen ten, Robert Carmichael had found the filter’s blind spot: composite numbers that pass the Fermat test for every single coprime base. Five hundred sixty one is the smallest, and this page verifies that claim exhaustively. Gary Miller strengthened the test in nineteen seventy six, and proved it deterministic if the extended Riemann hypothesis holds. Solovay and Strassen showed in nineteen seventy seven that randomness could stand in for the unproven hypothesis. And Michael Rabin proved in nineteen eighty that Miller’s stronger test needs no hypothesis at all: for any odd composite, at most a quarter of the possible witnesses fail to expose it. In two thousand two, the A K S test settled the theory by putting primality in polynomial time unconditionally. But the keys protecting this very page were still minted by witness rounds.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the strong chain. Write n minus one as two to the s times d, with d odd. Compute a to the d, then square it s times, arriving at a to the n minus one. If n is prime, arithmetic modulo n is a field, and in a field the only square roots of one are plus one and minus one. So the chain must either start at one, or enter the ones through the front door, which is minus one. A chain that reaches one from a stranger has exhibited a nontrivial square root of one: a certificate that n is composite, with no factor needed. The composite verdict is always a proof. The heuristic supplies the witness lottery. Rabin’s theorem says at most one quarter of bases lie for any odd composite, so k random witnesses drive the error below four to the minus k. This page does not assume that bound. It tries every base on every strong pseudoprime below one hundred thousand, and the worst liar fraction ever measured is point one eight five seven: safely under the quarter. Twenty rounds put the error under one in a trillion, at four point three one modular exponentiations per number, measured.',
  },
  {
    section: 'picture',
    text:
      'Picture a courtroom. The number n stands trial for impersonating a prime, and each witness testifies by running the squaring chain. The Fermat test only asks each witness for a character reference: the final value, and nothing else. A Carmichael number like five hundred sixty one is a con artist with immaculate references: all three hundred twenty coprime bases vouch for it, every single one, verified on this page. The strong test cross examines the alibi step by step: you reached one, but how? Through minus one, like an honest prime? Or from a stranger? Under cross examination, five hundred sixty one’s supporters collapse from three hundred twenty to ten. And Rabin’s theorem is the rule that makes the lottery fair: no defendant can bribe more than a quarter of the entire witness pool. So you call twenty witnesses at random, and you rest.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, decompose: write n minus one as two to the s times d, with d odd. Second, draw a witness a uniformly between two and n minus two. Third, run the chain: compute x equals a to the d, modulo n. If x is one or minus one, this witness passes. Otherwise, square x up to s minus one times; if the chain reaches minus one, the witness passes; anything else convicts. Fourth, convict on proof: a single failed witness ends the trial, because the failure is a certificate. Fifth, repeat: k clean rounds leave the error below four to the minus k. And below three point three times ten to the twenty four, swap the lottery for the first twelve primes as witnesses: that set is proven exact, and the verdict becomes deterministic.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you are generating or checking cryptographic keys: R S A moduli, Diffie Hellman parameters, curve orders. The sixty three bit hunt on this page found five primes in ninety six random candidates, with every verdict refereed against the proven witness set. Second, the number is far beyond factoring range but you only need primality, not factors. The two questions have wildly different prices: eight million divisions against one exponentiation, measured below. Third, you can tolerate an error of four to the minus k, or your numbers fit under three point three times ten to the twenty four, where the fixed witness set is proven: either way, the whole test is a few dozen exponentiations.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: chosen error, proven conviction, log cubed cost. A composite verdict is always a certificate, never a guess. A prime verdict carries error below four to the minus k against every composite, Carmichael numbers included, because the quarter bound covers them all, and this page verified that bound exhaustively rather than citing it. And the whole trial costs k modular exponentiations. This is the primality test running inside OpenSSL, inside G M P, inside every T L S handshake’s key ceremony. The weakness: prime is confidence, not proof. The randomized verdict never certifies primality. Below three point three times ten to the twenty four, the proven witness set closes that gap; beyond it, certainty costs slower machinery, like elliptic curve primality proving. Fixed witness sets used outside their proven range are adversarial targets: composites are known that fool any published finite list of bases. And the test names no factors: it convicts without identifying an accomplice.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: all forty nine thousand nine hundred ninety nine odd numbers below one hundred thousand, classified prime or composite, against a sieve whose prime count, nine thousand five hundred ninety two, matches the published value exactly. The Fermat test at base two: seventy eight wrong answers, the first at three hundred forty one, and the Carmichael number five hundred sixty one fooling it at all three hundred twenty coprime bases. Miller Rabin with the single witness two: sixteen wrong answers, the first at two thousand forty seven, which is twenty three times eighty nine: one witness is a coin, not a jury. Miller Rabin with twenty random witnesses: zero wrong answers, at four point three one exponentiations per number on average. And the deterministic twelve witness set: zero wrong answers at two point four one exponentiations, proven correct to three point three times ten to the twenty four: the referee this page’s hunts answer to. Behind the zero sits the exhaustive check: across all sixteen strong pseudoprimes, the worst fraction of lying witnesses was point one eight five seven. The theorem promised a quarter. The measurement came in under it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is trial division on a cryptographic modulus, and the price was measured, not imagined. Factoring a forty eight bit semiprime by trial division took eight million, three hundred eighty eight thousand, six hundred divisions before the smaller factor surfaced. The strong test convicted the same number in one single exponentiation: its first witness exposed a nontrivial root and the trial was over. Now scale the crawl. A two thousand forty eight bit R S A modulus would need on the order of ten to the three hundredth years of division. The lesson is a category distinction worth keeping: is it prime, and what divides it, are different questions living in different complexity worlds. Primality is cheap. Factoring is the hard problem your bank depends on. Reaching for the factoring tool when you only need the verdict is the category error this pair exists to prevent.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the sieve referee, the Fermat test, the strong single round chain, the twenty round lottery, and the deterministic twelve witness variant, with exponentiation counters throughout. The self test asserts, in order: the sieve’s prime count matches the published pi of ten to the five, nine thousand five hundred ninety two. The historic offenders arrive exactly on schedule: three hundred forty one for Fermat, two thousand forty seven for the single strong witness. Every strong liar is also a Fermat liar, the theorem checked as a subset relation. The twenty round and proven set sweeps make zero errors. Rabin’s quarter bound holds exhaustively: every base tried, on every one of the sixteen strong pseudoprimes. Five hundred sixty one’s liars collapse from three hundred twenty to ten under cross examination. A sixty three bit prime hunt lands five primes in ninety six candidates with every verdict refereed. And the semiprime is both factored the slow way and convicted the fast way, with the division counter as the price tag. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
