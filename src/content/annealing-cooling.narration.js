// The spoken lesson for puzzle two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle two: simulated annealing, paired with the geometric cooling schedule, for traveling salesman tours. Here is the puzzle. You are given the coordinates of a few dozen cities. Your task is to produce one closed loop that visits every city exactly once and returns home, keeping the total distance as short as you can. The constraint is brutal arithmetic. The number of possible tours grows as the factorial of the city count, and for even forty cities that is a number with nearly fifty digits. Checking every tour is out of the question, and this puzzle does not demand the provably perfect answer. It demands an excellent one, soon.',
  },
  {
    section: 'origins',
    text:
      'The method descends from physics. In nineteen fifty three, Nicholas Metropolis and his colleagues at Los Alamos showed how to simulate the way matter settles into low energy states. Thirty years later, in nineteen eighty three, Scott Kirkpatrick, Daniel Gelatt, and Mario Vecchi at I B M realized the same mathematics could optimize circuits and tours. The name comes from metallurgy. A blacksmith who cools steel slowly, annealing it, lets the atoms find an orderly, strong arrangement. Quench the same steel fast and the atoms freeze mid chaos, brittle. The algorithm treats a bad tour the way physics treats a hot metal: jostle it hard at first, then ever more gently, and order emerges.',
  },
  {
    section: 'pair',
    text:
      'The control structure is simulated annealing itself. It holds one current tour, proposes a small local change, and decides whether to accept it. The classic proposal is called two opt: pick two edges of the loop, cut them, and reconnect the loop with the segment between them reversed. The algorithm always accepts a change that shortens the tour. The surprise is that it sometimes accepts a change that lengthens it, with probability e to the minus delta over T, where delta is how much worse the trade is and T is the current temperature. It also remembers the best tour ever seen, because the walk is allowed to wander away from it. The guiding rule is the cooling schedule. Temperature is the willingness to take bad trades. The geometric schedule multiplies T by a constant alpha, a little below one, after each round of proposals. Early on, T is high and the walk leaps over hills, escaping the traps that doom pure greed. Late, T is tiny and only improvements survive. The schedule is the entire art: it decides how much exploring happens before the polishing begins.',
  },
  {
    section: 'picture',
    text:
      'Picture a marble dropped onto an egg carton the size of a table, full of dents and one deepest hollow somewhere in the middle. Set the marble down and it rolls into the nearest dent, almost never the deepest one. That is greedy search. Now shake the carton hard. The marble hops between dents freely, sampling everywhere. Slowly ease the shaking. The marble still escapes shallow dents, but the deep hollows start to hold it. By the time your hands are still, the marble sits, far more often than chance would allow, in one of the deepest hollows on the table. The shaking is temperature. The easing is the schedule. The marble is your tour.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, start with any random tour, and set the temperature high, around the scale of the largest distance in the map. Second, propose a two opt move: cut two edges, reverse the segment between them, and compute delta, the change in tour length, which takes constant time because only two edges leave and two arrive. Third, if delta improves the tour, accept it. If it worsens the tour, accept it anyway with probability e to the minus delta over T. Fourth, after a batch of proposals, cool: multiply T by alpha, something like zero point nine nine. Fifth, keep the best tour ever visited off to the side. Sixth, when T reaches a floor near zero, stop, and hand back that best tour.',
  },
  {
    section: 'signals',
    text:
      'Reach for this pair when you see three signals together. The search space is astronomically large and discrete, so calculus and gradients have nothing to grip. Evaluating one candidate, or better, the delta between neighbors, is cheap. And the ask is a good answer inside a budget, not a certificate of optimality. Tours, chip layouts, exam timetables, protein folds: the shape repeats everywhere. The naive baselines frame the trade. Exact dynamic programming, the Held Karp algorithm, guarantees the optimum in time on the order of n squared times two to the n, which suffocates near twenty cities. Greedy nearest neighbor runs instantly and typically hands you a tour ten to twenty five percent longer than the best, because it walks into traps it can never leave. Annealing runs in time proportional to the proposal budget, k times n, holds one tour in memory, and lands within a few percent of optimal with a patient schedule.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is escape. Accepting uphill trades while hot is precisely what frees the walk from local optima, and the cooled finish polishes whatever basin it settles in. The method is also an anytime algorithm: stop it early and it still hands you the best tour seen so far. The weakness is the absence of a guarantee. Nothing certifies the answer, two runs with different seeds return different tours, and everything hinges on the schedule. Cool too fast and you quench: the tour freezes tangled. Cool too slowly and you burn compute polishing air. Tuning alpha, the starting temperature, and the proposal budget is a craft learned per problem family.',
  },
  {
    section: 'tradeoffs',
    text:
      'Four other real methods attack this same problem, and the comparison is more humbling than the textbooks suggest. Nearest neighbor builds a tour by always hopping to the closest city not yet visited. It is instant, it is ten lines, and it is greedy to a fault, because the last few cities are simply whatever nobody wanted. Two opt hill climbing takes any tour and repeatedly uncrosses pairs of edges until no single uncrossing helps. No temperature, no schedule, no randomness, and it closes most of the gap on its own. Two opt with random restarts runs that same climb from many different random tours and keeps the best. And Held Karp is the exact method: dynamic programming over subsets, which proves the true optimum, and which suffocates somewhere around twenty cities because its cost grows as two to the number of cities.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers on one shared instance: twelve random cities in the unit square, chosen small enough that Held Karp can prove the true optimum, so every gap on the page is measured against certainty rather than against opinion. Nearest neighbor returned a tour of three point six four, which is thirty three percent longer than optimal. Two opt hill climbing returned two point eight eight, cutting the excess to five and a half percent. Two opt with twelve random restarts returned two point seven three, which is the proven optimum exactly. Simulated annealing also returned the proven optimum. And Held Karp confirms that optimum at two point seven three.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the part worth being honest about, because it is the part that builds real judgment. On a larger instance of sixty cities, where Held Karp is impossible and no optimum can be proven, two opt with restarts returned five point seven eight in four hundredths of a second, while simulated annealing at its default schedule returned five point nine one in fifty five hundredths of a second. The famous method lost, on quality and on time, by a factor of fourteen in wall clock. That result is not a knock on annealing. It is the actual state of affairs on Euclidean traveling salesman instances of modest size, where climbs are cheap and restarts are a very strong baseline, and it is why a tuned schedule matters so much. The lesson to carry is a habit, not a ranking: run the simple local search first, measure it, and make the sophisticated method prove it earns its complexity on your instance, at your size, with your budget.',
  },
  {
    section: 'tradeoffs',
    text:
      'One method you would never bring here is brute force permutation search. Enumerating every possible tour means considering the factorial of the number of cities, divided by two for symmetry. At the twelve cities in our table that is roughly twenty million tours, which a laptop will actually grind through, and that is exactly what makes it such a dangerous habit to form. At twenty cities it is sixty quadrillion. At sixty cities the number of tours exceeds the number of atoms in the observable universe by more than fifty orders of magnitude. Held Karp is the exact method worth knowing. Permutation search is the one worth refusing.',
  },
  {
    section: 'code',
    text:
      'The Python solution keeps one current tour as a list of city indices. Each proposal draws two cut points, computes the two opt delta from just four distances, and applies the Metropolis rule: accept if the delta is negative, otherwise accept with probability e to the minus delta over temperature. Accepted moves reverse the segment in place and update the running length incrementally, so no full recount happens inside the loop. The outer loop multiplies temperature by alpha until it crosses the floor. And the file checks itself three ways: on cities arranged in a circle, where the perfect tour is known, the annealed answer must land within two percent of it. On random cities, it must beat the greedy nearest neighbor baseline outright. And the incremental length bookkeeping must match a fresh recount to within rounding. That is the pair. Annealing supplies the walk and the memory of the best. The schedule supplies the courage, and then withdraws it on exactly the right timetable.',
  },
];
