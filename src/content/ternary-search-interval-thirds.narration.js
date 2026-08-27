// The spoken lesson for puzzle fifty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty eight: ternary search, paired with two probe interval thirds, for unimodal extremum search. Here is the puzzle. A function on an interval that rises and then falls: unimodal: evaluable at any point, with nothing else known. Locate its maximum to any precision you name, using comparisons alone. The constraint is what is missing: no derivatives, no formula, and no ordering for binary search’s monotone predicate to consume: a single probe of a peaked function tells you a height and no direction at all. Unimodality supplies a different predicate: two probes settle which third of the interval cannot contain the peak. And the referee on this page is construction itself: every test function’s argmax is known analytically before the search runs: six hundred tests, continuous and lattice, all exact.',
  },
  {
    section: 'origins',
    text:
      'The interval shrinking family is optimization’s oldest corner, and its crown theorem is older than most of computing: Jack Kiefer proved in nineteen fifty three that the golden section spacing is minimax optimal for comparison only unimodal search: no strategy can guarantee fewer evaluations. That golden ratio refinement is not cited here but measured: forty six evaluations against plain thirds’ one hundred four, to the same nine digits. Ternary search itself is competitive programming’s phrasing of the idea, the standard tool for convex cost curves and the aggressive cousin of binary search on answers. The pattern underneath: keep a bracket, kill a piece of it each round by a predicate: is binary search’s soul, wearing a different contract.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns bracket shrinking: maintain an interval guaranteed to contain the peak, cut it every round, stop when it is smaller than the tolerance. The frame is exactly binary search’s, a live unit on this site: what changes is the predicate the frame consults, and, as always on this site, the intelligence lives there, not in the loop. The heuristic supplies the two probes at the thirds. Compare f at one third and two thirds. If the first probe is lower, the peak cannot lie left of it: a unimodal function that had already fallen by the first probe would have to rise again to beat the second, and falling then rising is the single shape the premise forbids. So the left third dies. Symmetrically on the other side. One comparison, one third, every round: one hundred four evaluations to nine digits, matching the two thirds shrink theory to within rounding, and the revenue client’s optimal price recovered as twenty point zero zero zero zero zero zero against its calculus answer.',
  },
  {
    section: 'picture',
    text:
      'Picture finding the highest point of a hill ridge in thick fog, with only an altimeter. Standing in one spot tells you nothing useful: a height, no direction. But send two scouts, to the one third and two thirds marks of the ridge, and their altimeters settle something certain: if the second scout stands higher than the first, the summit cannot be in the first third: a ridge that peaked back there would have had to descend and then climb again, and single peaked ridges do not do that. Send a third of the mountain home each round. The refinement is purely about where the scouts stand: place them at the golden sections, and after each cut, one scout finds himself already standing at a golden section of the shorter ridge: he never walks again. Half the scouting, the same certainty: and that spacing is provably the best possible.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Probe at one third and two thirds of the bracket. Compare: whichever probe is lower, the outer third on its side cannot contain the peak: discard it. Repeat until the bracket is narrower than epsilon: each round keeps two thirds, so precision costs about eleven evaluations per decimal digit: one hundred four to nine digits, measured. To upgrade, move the probes to the golden sections: after each cut, one interior probe survives in place, so each round needs one fresh evaluation instead of two: forty six to the same precision, measured, and optimal by Kiefer’s theorem. And honor the contract: unimodality is the entire certificate. The page breaks it on purpose, and the tradeoffs section prices what happens.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, one bump and no gradients: tuning a single parameter with a concave response: a price against revenue, a threshold against yield, a timing offset against throughput: especially when each evaluation is an experiment, a simulation, or a deployment. Second, comparisons are trustworthy where magnitudes are not: the method never consumes values, only which of two probes is higher: a robustness that calculus based methods cannot claim on noisy scales. Third, integer lattices: unimodal arrays, exact argmax by the same discipline: measured perfect on three hundred arrays here: the form competitive programmers reach for weekly.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: comparison only, theory matched, and honest about its premise. Six hundred constructed argmax tests exact, continuous and lattice. Both evaluation bills within four of their shrink rate theories. The plateau case safe: any returned point attains the maximum. And the golden refinement measured rather than cited: the phi spacing recycles a probe and cuts the bill from one hundred four to forty six. The weakness, in two honest parts. The premise carries the entire proof: on the bimodal gadget, the very first comparison discards the third containing the two point zero tall global spike, and the dance converges smoothly and confidently to the one point zero hill: measured at zero point seven zero zero, no error raised, half the value missed. And the bill is linear per digit: eleven more evaluations per decimal: where derivatives exist, Newton’s digit doubling ladder, a live unit here, plays a different sport entirely.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, all to nine digits of precision on the unit interval. The grid scan: a billion evaluations: no assumptions, no risk, no mercy. Ternary with fresh thirds: one hundred four evaluations: two per round, a third dying each time, within four of the pure theory. Golden section: forty six: one fresh evaluation per round, because the phi spacing leaves yesterday’s probe standing exactly where today needs it: under half of ternary’s bill, asserted. And binary search on the derivative, when a derivative exists: about thirty: the cheapest of all, on a contract this unit deliberately does not assume. Beneath the table, the client: revenue equal to price times a thousand times e to the minus price over twenty, maximized by calculus at exactly twenty, and by sixty comparisons at twenty point zero zero zero zero zero zero.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is two probes on an unverified premise, and the gadget makes it visceral. A tall narrow spike of height two sits at six percent of the interval; a broad hill of height one sits at seventy percent. The first comparison probes one third and two thirds: near zero versus nearly point nine: and discards the left third, which contains the global maximum. Round one. Everything after is flawless machinery grinding toward the wrong answer: convergence to point seven zero zero, confident, warning free, measured. Multimodal landscapes belong to the annealing and restart machinery on this site’s metaheuristics shelf: two probes certify nothing there. The site’s recurring lesson in its purest form: the guarantee was never in the loop. It was in the premise the loop consumed: verify the premise, or the precision is theater.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements ternary search with an evaluation counter, golden section search with probe reuse, and the integer lattice variant. The self test asserts, in order: three hundred constructed argmax continuous functions across three shapes: parabolas, asymmetric powers, and smooth bumps: each recovered to seven decimals by both methods. Three hundred unimodal arrays, exact. Both evaluation bills within four of their shrink rate theories, with golden strictly under sixty percent of ternary. The revenue client at its analytic optimum. The plateau returning a true maximum. And the bimodal betrayal: the spike’s third discarded in round one, convergence to the lesser hill, both asserted. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
