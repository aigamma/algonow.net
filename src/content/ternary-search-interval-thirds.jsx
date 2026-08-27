import TernaryViz from '../viz/TernaryViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ternary_search_interval_thirds.py?raw';
import { narration } from './ternary-search-interval-thirds.narration.js';

export const content = {
  given:
    'A unimodal function on an interval: rises, then falls: evaluable pointwise, nothing else known.',
  task: 'The location of the maximum, to any precision, from comparisons alone.',
  constraint:
    'No derivatives, no formula, no order: binary search’s monotone predicate does not exist here. Unimodality supplies a different one: two probes settle which third of the interval cannot hold the peak: and every test function’s argmax is known analytically before the search runs.',

  origins: (
    <p>
      The interval-shrinking family is optimization&apos;s oldest
      corner: Kiefer proved in <strong>1953</strong> that the{' '}
      <em>Fibonacci/golden-section</em> spacing is minimax-optimal for
      comparison-only unimodal search: the same golden ratio measured
      beating plain thirds on this page, 46 evaluations to 104.
      Ternary search itself is competitive programming&apos;s workhorse
      phrasing (convex cost curves, aggressive binary-search
      generalizations), and the pattern: shrink a bracket by a
      predicate: is binary search&apos;s soul wearing a different
      contract.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>bracket shrinking</strong>: maintain an interval
      guaranteed to contain the peak, cut it every round, stop below
      tolerance. The frame is binary search&apos;s (a live unit here):
      what changes is the <em>predicate</em>: no single probe can
      decide anything about a peak, because a lone value carries no
      direction. The intelligence, as always on this site, lives in
      what the skeleton consults.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>two probes at the thirds</strong>. If
      f(m₁) &lt; f(m₂), the peak cannot lie left of m₁: a unimodal
      function cannot fall and rise again: so the left third dies;
      symmetrically for the right. One comparison, one third, every
      round: 104 evaluations to 10⁻⁹ (matching the (2/3)-shrink theory
      to within rounding), 600 constructed-argmax tests exact, and the
      revenue client&apos;s p* = 20.000000 recovered against its
      analytic answer.
    </p>
  ),

  picture: (
    <p>
      Finding the highest point of a hill ridge in fog, with only an
      altimeter. Standing in one place tells you nothing: height
      without direction. But two scouts at the one-third and two-thirds
      marks settle something certain: if the second stands higher, the
      summit cannot be in the first third: a ridge that rises past both
      would have had to dip and rise again. Send a third of the
      mountain home each round. The refinement is where the scouts
      stand: at the golden sections, one scout&apos;s position{' '}
      <em>remains a golden section</em> of the shrunken interval: half
      the walking, same certainty.
    </p>
  ),

  steps: [
    <>
      <strong>Probe</strong> m₁ and m₂ at the interval&apos;s thirds.
    </>,
    <>
      <strong>Compare:</strong> the lower probe&apos;s outer third
      cannot contain the peak: discard it.
    </>,
    <>
      <strong>Repeat</strong> until the bracket is smaller than ε:
      (3/2)-fold shrink per round, ~104 evaluations to 10⁻⁹.
    </>,
    <>
      <strong>Upgrade the spacing:</strong> golden-section probes
      recycle one evaluation per round: 46 to the same precision
      (measured): Kiefer&apos;s 1953 optimum.
    </>,
    <>
      <strong>Honor the contract:</strong> unimodality is the entire
      certificate: the bimodal gadget below is what confident
      wrongness looks like.
    </>,
  ],

  signals: [
    <>
      <strong>One bump, no gradients:</strong> tuning a single
      parameter with a concave response: a price, a threshold, a
      timing offset: where each evaluation is an experiment.
    </>,
    <>
      <strong>Comparisons are trustworthy, values barely:</strong> the
      method never uses magnitudes: only which probe is higher:
      robustness the derivative methods cannot claim.
    </>,
    <>
      <strong>Integer lattices too:</strong> unimodal arrays (measured
      exact on 300): the competitive-programming form.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>grid scan</strong>: a billion
      evaluations to 10⁻⁹, no assumptions, no risk: and the honest
      ceiling is <strong>binary search on the derivative</strong> (~30
      single evaluations) when f′ exists: a richer contract, not a
      better algorithm: the live Newton unit takes that road further.
      Ternary&apos;s niche is exactly the gap: structure enough to beat
      the grid, information too poor for calculus.
    </>
  ),

  strength: (
    <>
      <strong>Comparison-only, theory-matched, and honest about its
      premise.</strong> 600 constructed-argmax tests exact (continuous
      and lattice); evaluation bills matching the shrink-rate theories
      (104 and 46, both within 4 of prediction); the plateau case safe;
      and the golden refinement measured, not cited: the φ spacing
      recycles a probe and halves the bill.
    </>
  ),
  weakness: (
    <>
      <strong>The premise is the certificate, and the bill is linear
      per digit.</strong> On the bimodal gadget the first comparison
      discards the third containing the <em>2.0-tall global
      spike</em>, and the dance converges confidently to the 1.0 hill
      (measured: 0.700): no error, no warning, wrong. And each digit
      of precision costs ~11 more evaluations: when derivatives exist,
      Newton&apos;s digit-doubling (a live unit) is a different sport.
    </>
  ),

  problem: 'Unimodal extremum search',
  problemSlug: 'unimodal-search',
  rivals: [
    {
      name: 'Ternary × interval thirds',
      isThisUnit: true,
      algoName: 'Ternary search',
      cost: '2 evals/round, ×(2/3)',
      wins: (
        <>
          <strong>104 evaluations to 10⁻⁹</strong> from comparisons
          alone; exact on 600 constructed tests; five lines anyone can
          rederive under pressure.
        </>
      ),
      costs: (
        <>
          Two fresh probes per round: the golden refinement halves it:
          and the unimodality premise carries all the risk.
        </>
      ),
      when: 'One-parameter concave tuning and lattice peak-finding: the contest and back-of-envelope default.',
    },
    {
      name: 'Golden-section search',
      cost: '1 eval/round, ×0.618',
      wins: (
        <>
          <strong>46 evaluations</strong> to the same 10⁻⁹ (measured):
          the φ spacing leaves one probe already in place each round:
          Kiefer&apos;s 1953 minimax optimum for this contract.
        </>
      ),
      costs: (
        <>
          The bookkeeping of carrying probes across rounds: five lines
          become fifteen.
        </>
      ),
      when: 'Whenever evaluations are expensive: the strict upgrade inside the same comparison-only contract.',
    },
    {
      name: 'Binary search × halving invariant',
      algoName: 'Binary search',
      cost: '1 eval/round, ×0.5',
      wins: (
        <>
          The sibling contract (a live unit): with a <em>monotone</em>{' '}
          predicate: including sign-of-f′ when derivatives exist: one
          probe per round beats two.
        </>
      ),
      costs: (
        <>
          Needs monotonicity somewhere: on a raw unimodal value, a
          single probe decides nothing.
        </>
      ),
      when: 'The moment any monotone reformulation exists: always check before reaching for two probes.',
    },
    {
      name: "Newton's method × tangent iteration",
      algoName: "Newton's method",
      cost: 'digit-doubling',
      wins: (
        <>
          On f′ with a warm start: quadratic convergence (the live
          unit&apos;s measured ladder): a handful of steps where
          bracketing pays per digit.
        </>
      ),
      costs: (
        <>
          Needs derivatives and a basin: the richer contract, priced on
          its own page.
        </>
      ),
      when: 'Smooth functions with cheap true derivatives: a different sport, honestly compared.',
    },
  ],
  neverUse: {
    name: 'Two probes on an unverified premise',
    why: (
      <>
        The bimodal gadget is the whole case: a 2.0-tall spike at 0.06,
        a 1.0 hill at 0.70: and the very first comparison (f(1/3) ≈ 0
        &lt; f(2/3) ≈ 0.9) discards the third containing the global
        maximum. The search then converges, smoothly and confidently,
        to <strong>0.700</strong>: measured: no error raised, half the
        value missed. Multimodal landscapes want the annealing and
        restart machinery of the metaheuristics shelf: two probes
        certify nothing there. The recurring site lesson in its purest
        form: the guarantee was never in the loop: it was in the
        premise the loop consumed.
      </>
    ),
  },

  contest: {
    instance:
      'maximum of a unimodal function on [0, 1] to 10⁻⁹; referee: every test function’s argmax known analytically by construction (600 tests, continuous and lattice)',
    columns: ['evaluations', 'requires'],
    rows: [
      {
        method: 'Grid scan',
        values: ['10⁹', 'nothing'],
        verdict: 'assumption-free, and a billion evaluations',
      },
      {
        method: 'Ternary × thirds',
        isThisUnit: true,
        values: ['104', 'unimodality + comparisons'],
        verdict: 'a third dies per comparison: theory-matched to ±4',
      },
      {
        method: 'Golden-section',
        values: ['46', 'the same contract'],
        best: 0,
        verdict: 'φ spacing recycles a probe: Kiefer’s optimum, measured',
      },
      {
        method: 'Binary on f′',
        values: ['~30', 'a derivative'],
        verdict: 'a richer contract, not a better algorithm',
      },
    ],
    source:
      "python solutions/ternary_search_interval_thirds.py prints this table and asserts: 300 constructed-argmax continuous functions (three shapes) and 300 unimodal arrays, exact; both evaluation bills within 4 of their shrink-rate theories with golden < 0.6× ternary; the plateau case returning a true maximum; the revenue client's p* = 20.000000 against its analytic answer; and the bimodal betrayal measured: the 2.0 spike's third discarded in round one, convergence to the 1.0 hill at 0.700.",
  },

  figure: (
    <Figure
      id="fig-ternary-thirds"
      aspect="16 / 7"
      caption="Two probes, one dead third. If f(m₁) < f(m₂), no unimodal function can hide its peak left of m₁: falling from a peak and rising again is the one shape the premise forbids. The golden refinement moves the probes to the φ sections, where the surviving probe is already a φ section of the shrunken bracket: one fresh evaluation per round instead of two, measured 46 vs 104. The premise is the certificate: spend it only where it holds."
      cite={{
        text: 'Kiefer, "Sequential minimax search for a maximum", Proc. AMS 4, 1953: golden-section spacing is optimal for comparison-only unimodal search. The bracket-shrinking frame is binary search’s, one contract over.',
        href: 'https://doi.org/10.1090/S0002-9939-1953-0055639-3',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A unimodal curve with two probes and the discarded left third">
        <path d="M 60 220 C 180 200, 260 60, 340 55 C 420 60, 500 190, 590 225" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        <line x1="60" y1="240" x2="590" y2="240" stroke="#2a3450" />
        <line x1="237" y1="240" x2="237" y2="120" stroke="#f0b94b" strokeWidth="1.8" strokeDasharray="5 4" />
        <line x1="413" y1="240" x2="413" y2="62" stroke="#f0b94b" strokeWidth="1.8" strokeDasharray="5 4" />
        <text x="228" y="258" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">m₁</text>
        <text x="404" y="258" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">m₂</text>
        <rect x="60" y="48" width="177" height="192" fill="rgba(226,96,108,0.10)" />
        <text x="80" y="80" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">f(m₁) &lt; f(m₂):</text>
        <text x="80" y="98" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">this third dies</text>
        <circle cx="340" cy="55" r="4.5" fill="#62d98a" />
        <text x="330" y="42" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">peak</text>
        <text x="60" y="282" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: thirds 104 evals to 1e-9 · golden sections 46 · the premise carries the proof</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'ternary_search_interval_thirds.py',
  Viz: TernaryViz,
  narration,
};
