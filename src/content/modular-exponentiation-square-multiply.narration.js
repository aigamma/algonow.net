// The spoken lesson for puzzle eighty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty eight: modular exponentiation, paired with square and multiply, for fast modular powers. Here is the puzzle. A base, an exponent two thousand forty eight bits long, a modulus: compute the base to that exponent, mod that modulus. Every T L S handshake, every R S A signature, every Diffie Hellman agreement is exactly this computation: and the naive way: multiply by the base, e minus one times: would need a number of multiplications with six hundred seventeen decimal digits. Not slow. Cosmologically impossible. The method reads the exponent in binary: square for every bit, multiply only on the ones: three thousand and ninety one operations at two thousand forty eight bits, measured. The referee is Python’s built in pow: matched exactly on three thousand and six triples, every edge case included: and the count law itself: squares equal bit length minus one, multiplies equal popcount minus one: is asserted, exponent by exponent, on five hundred of them.',
  },
  {
    section: 'origins',
    text:
      'Binary exponentiation may be the oldest nontrivial algorithm still in production. Pingala’s rules for Sanskrit poetic meter, around two hundred B C, already halve the problem: Knuth traces the method through al-Kashi and every era’s arithmetic since. It became load bearing for civilization in nineteen seventy six, when Whitfield Diffie and Martin Hellman published New Directions in Cryptography: key exchange built on this loop’s one way asymmetry: easy to run forward: three thousand operations: believed intractable to run backward, which is the discrete logarithm. R S A followed within the year. The modern chapters are about what the loop leaks: Paul Kocher, nineteen ninety six: the running time of the plain form reads the exponent’s bits aloud: and constant time ladders stopped being a style preference and became a security requirement.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the modular frame. Reduce after every single operation, so intermediate values never exceed the modulus squared: two thousand bit work stays two thousand bit work, because computing the power first and reducing later would need an intermediate too large for the observable universe. It owns the edges: exponent zero, modulus one, all matched against pow. The heuristic owns the reading. Scan the exponent’s bits, left to right, after the leading one. Square the accumulator for every bit: that doubles the exponent so far. Multiply by the base on every one bit: that adds one. Twenty nine operations for an exponent near a million: measured against the naive ladder’s nine hundred ninety nine thousand nine hundred eighty three: thirty four thousand times. The law is exact and it is asserted: bit length minus one squares. Popcount minus one multiplies. No estimates anywhere.',
  },
  {
    section: 'picture',
    text:
      'To carry water a million floors up, you could climb one floor a million times. Or take the express elevator that doubles its floor number with every press: floor one, two, four, eight: and step off to climb a single floor only where the destination’s binary digits say to. Twenty presses and a handful of single floors reach the millionth story. The modulus is the building’s trick: every floor number is taken mod m, so the elevator car never leaves a small lobby no matter how high the nominal floor gets: the numbers stay pocket sized while the exponent soars. And notice the surveillance camera in the lobby: it counts your single floor steps. Walk a different number of them and a watcher learns your destination’s digits: unless you walk the same steps on every trip regardless, which is exactly the ladder’s discipline, and exactly what it costs.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Start the accumulator at the base: that is the leading one bit. For each remaining bit: square, reduce. If the bit is one: multiply by the base, reduce. Done: at two thousand forty eight bits, about three thousand big number multiplications, each one itself a serious computation: the live Toom Cook unit’s territory. This page then runs the loop in anger three ways. Miller Rabin primality testing, which is this loop called forty times per candidate, generates two five hundred twelve bit primes. R S A round trips fifty messages through them: encrypt with the public exponent, decrypt with the private one, get the message back exactly, fifty times. And one hundred Diffie Hellman handshakes: each side raises the other’s public value to its own secret: both sides land on the same shared secret, and that secret equals g to the product of the exponents, checked directly. The entire public key internet, in forty lines, refereed by the standard library.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: huge exponents over bounded arithmetic: cryptography, primality testing, hashing into groups: anywhere a to the e mod m appears with e beyond a few thousand, the binary reading is mandatory, not optional. Second, and this is the transferable one: the trick is about repeated squaring, not about integers. Any associative operation rides the same bits: matrix powers give Fibonacci numbers in logarithmic time: permutation powers, polynomial powers, function composition: if it associates, it squares. Third: the exponent is a secret. Then the operation count is a broadcast: the plain form’s count depends on the key’s one bits, and you reach for the constant time ladder and never branch on a key bit again.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, and the first one is the security story. The Montgomery ladder runs one square AND one multiply for every bit, whether it is zero or one. This page counts it: two exponents of the same length, one with three one-bits, one with four hundred ninety six: square and multiply pays one thousand twenty five operations versus one thousand five hundred eighteen: a gap of exactly four hundred ninety three, exactly the popcount difference: an eavesdropper with a stopwatch reads the key. The ladder pays two thousand forty eight for both: identical, asserted. The price of silence is up to double the work, and every smart card on earth pays it gladly. Fixed window exponentiation is the throughput rival: precompute a table of small powers, then one multiply per window of w bits: fewer multiplies than the binary scan, at the cost of table memory and setup: worthless for one shot, decisive when R S A signs with the same key all day.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strangest rival on this page is the adversary’s algorithm, priced as a feature. Inverting this loop: recovering the exponent from the result: is the discrete logarithm, and the live Pollard rho unit’s square root of p random walk is among the best generic attacks known. Forward: three thousand and ninety one operations. Backward: on the order of ten to the thirty eighth. That asymmetry is not an implementation detail: it is the entire product. Public key cryptography is the discovery that a gap between O of log e and O of square root of p can hold up world commerce. When you choose key sizes, you are choosing the width of that gap: and when a better backward algorithm appears for a group, as index calculus did for some, the keys grow or the group is abandoned.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: branching on a secret, in production cryptography. Ship the textbook loop with a secret exponent, and correctness testing will never object: all three thousand and six referee matches on this page pass identically either way. But the operation count differs by the popcount: measured, four hundred ninety three operations: the branches differ bit by bit, the cache traffic differs window by window: and Kocher read R S A keys from exactly those differences in nineteen ninety six, as power analysis rigs still read smart cards today. This is the site’s recurring lesson in its highest stakes costume: the output is not the only observable. Time is an output. Power is an output. The cache is an output. Constant time code is not a style: it is the recognition that an adversary grades everything you emit, not just the answer.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole stack in miniature. Square and multiply, left to right, with operation counters. The Montgomery ladder, with its fixed rhythm. The naive ladder, run in full where it can survive. Miller Rabin riding the fast loop: prime generation: R S A: Diffie Hellman. The self test asserts: three thousand and six exact matches against Python’s pow, up to two thousand forty eight bits: the count law, exact on five hundred exponents: the naive ladder beaten thirty four thousand fold by actual execution: the popcount leak counted to the operation and sealed by the ladder’s identical totals: fifty R S A round trips: one hundred agreeing handshakes. When it prints O K, you have watched the oldest algorithm in the catalog hold up the newest infrastructure on earth.',
  },
];
