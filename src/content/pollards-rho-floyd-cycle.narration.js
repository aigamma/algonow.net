// The spoken lesson for puzzle seventy eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy eight: Pollard’s rho, paired with Floyd cycle detection, for integer factorization. Here is the puzzle. A composite number stands condemned: the live Miller Rabin unit has certified its guilt in milliseconds: composite, certainly: but the witness names no accomplice. Produce a nontrivial factor: without dividing by candidates one at a time, and without storing the walk you take. Trial division would march to the smallest factor candidate by candidate: nine hundred ninety nine thousand nine hundred seventy nine divisions on this page’s client. The referees: every recovered factor is checked by multiplication, never by trust: every full factorization is rebuilt into its product with every part certified prime: and the running time itself must obey a law: the square root of p, invoiced by the birthday paradox and measured at two scales.',
  },
  {
    section: 'origins',
    text:
      'John Pollard, nineteen seventy five, in the journal BIT: A Monte Carlo Method for Factorization: four pages that made randomness a factoring tool. The name is a drawing: the walk’s trace: a tail wandering in, then a loop forever: spells the Greek letter rho. Richard Brent’s nineteen eighty refinement: a teleporting hare and batched g c ds: carries the famous twenty five percent saving, and this page measures it at twenty six. The rho idea seeded a family: Pollard’s kangaroo for discrete logarithms, and the parallel rho collisions that set the security estimates for elliptic curve keys to this day. Not bad for a walk that refuses to remember where it has been.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the rho walk: iterate x to x squared plus c, modulo n, from a random c. The trick is what happens modulo the unseen prime factor p. There, the same sequence lives in only p possible states: so by the birthday paradox it must collide with itself within about the square root of p steps. A collision modulo p, while the two values still differ modulo n, means the g c d of their difference with n exposes p itself. Measured as a scale law on this page: grow the hidden factor one hundred times, and the mean step count grew nine point four times: the square root law predicts ten. The heuristic supplies Floyd’s cycle detection: the tortoise and the hare: one walker stepping once, one stepping twice: guaranteed to meet inside any loop while storing nothing at all: constant memory, where the naive remember every value approach holds root p states. Brent’s variant batches the g c ds and teleports the hare: twenty six percent fewer function evaluations on the same sixty semiprimes, counted.',
  },
  {
    section: 'picture',
    text:
      'Picture a runner on a foggy track shaped like the letter rho: a straightaway leading into a loop that circles forever. You cannot see the track: only the numbers on the runner’s wristwatch as they pass you. Send two runners, one exactly twice as fast. If the track loops: at any size: the fast runner must eventually lap the slow one: no map, no memory, no chalk marks on the ground. Pollard’s twist is the doubled world: the track modulo n looks endless, but modulo the hidden factor p it is a small rho with only p positions. The two runners collide in p’s shadow world while still far apart in n’s visible one: and the g c d of their wristwatch difference reads the shadow’s name right off the collision.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Walk: x to x squared plus c mod n, from x equals two, with a random c. Race: tortoise one step, hare two: three function evaluations per round, two integers of state. Listen: take the g c d of the runners’ difference with n. One: keep walking. Strictly between one and n: that is the factor: verified by multiplication before anything is believed. Equal to n: the walk collided modulo every factor at once: retry with a fresh c: this page’s driver does, up to forty times. Recurse for the full factorization: split, certify each part with Miller Rabin, rho the composites again: and rebuild the product to check. And when function evaluations are the scarce resource, use Brent’s form: the hare teleports to positions at powers of two, the g c ds accumulate in a batch: the same birthday, twenty six percent cheaper.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, compositeness is already certified and the factor is what is missing: the exact handoff from the live Miller Rabin unit: this shelf is a pipeline, test then factor. Second, the smallest factor is mid sized: ten to the fourth up to ten to the twelfth or so: where root p steps demolishes trial division’s march to p, and the heavy sieves are not yet warranted. Third, memory is nothing: two integers and a g c d: the walk suits firmware, contest time limits, and any setting where storing root p values for a collision table is absurd.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the birthday paradox on the invoice, and nothing taken on trust. Three hundred semiprime factors, each checked by multiplication. Two hundred full factorizations to ten to the twelfth, rebuilt exactly, every part certified prime. The square root law measured: one hundred times the factor, nine point four times the steps, against a prediction of ten. Brent’s refinement counted at twenty six percent, beside the literature’s twenty five. And a folklore correction in the honest tradition: the received wisdom says c equals zero: bare squaring: is broken and must never be used. The first assert encoded that folklore as failures, and measured zero failures in sixty attempts. The truth at these scales: the squaring map’s structured orbits still collide, but slowly: a measured four point two times step tax. Structure was expensive, not fatal: the folklore had the right direction and the wrong severity. The weakness: probabilistic patience, and a hard ceiling. Runtimes are distributions: this page’s one hundred sixty nine step crack was a lucky draw against a thousand step expectation. And against balanced semiprimes with both factors past ten to the eighth, root p stops being mercy: RSA moduli shrug at rho by design.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Trial division with the wheel: deterministic, ordered, and it proves minimality: the right opener that strips the small factors before anything clever runs: and a march of five thousand nine hundred seventeen times this page’s bill when the factor sits near a million. Miller Rabin, live: the upstream verdict: composite in milliseconds at any size, naming no factor ever: always run it first, because factoring a prime by random walk is an infinite errand. And the heavy artillery past the birthday’s reach: the quadratic sieve, collecting smooth relations and solving linear algebra: and Lenstra’s elliptic curve method beside it: factories, not pocketknives, for the balanced thirty digit semiprimes where rho’s square root has become the problem rather than the solution. The shelf reads as an escalation ladder: wheel, witness, walk, sieve: each handing its survivors upward.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is reading rho’s clock as a deadline. The expected bill is about root p: the distribution around it is wide. This page’s twelve digit client fell in one hundred sixty nine steps against a thousand step expectation: a six times lucky draw: and the same number, under a different c, can run five times long, or collide modulo every factor at once and demand a restart from scratch. Size a timeout, a contest submission, or a batch pipeline to the mean, and rho will randomly fail in production: the tail is the specification. Engineer for the distribution instead: retry loops with fresh constants: this page’s driver: budgets set at comfortable multiples of root p, and Brent’s form when evaluations are the scarce currency. It is the site’s recurring probability lesson with sharper teeth: a randomized guarantee is a contract about averages: it was never a contract about your run.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the rho walk with Floyd’s tortoise and hare and per step g c ds, Brent’s batched variant with its own evaluation counter, the retry driver with fresh random constants, the recursive full factorization with Miller Rabin certification, and prime generation for the test semiprimes. The self test asserts, in order: three hundred semiprime factors, each verified by multiplication. Two hundred full factorizations rebuilt exactly to n, every part certified prime. The scale law: mean steps growing nine point four times when the hidden factor grows one hundred, inside the five to twenty band around the predicted ten. Brent strictly under Floyd on evaluations. The c equals zero measurement: zero failures, and a step tax above three: measured at four point two. And the textbook clients: eight thousand fifty one as eighty three times ninety seven, and the twelve digit semiprime, cracked and checked. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
