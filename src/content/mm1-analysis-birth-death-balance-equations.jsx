import Mm1Viz from '../viz/Mm1Viz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/mm1_analysis_birth_death_balance_equations.py?raw';
import { narration } from './mm1-analysis-birth-death-balance-equations.narration.js';

export const content = {
  given:
    'Customers arrive at random at rate λ, one server takes a random time with mean 1/μ each, and the question is how long the line gets and how long a customer waits: as a formula you can put in a capacity plan, not as a simulation you must rerun.',
  task: 'M/M/1 analysis. The algorithm is the continuous-time Markov chain on the number in the system: state n goes to n + 1 at rate λ (a birth) and to n − 1 at rate μ (a death). The heuristic is the birth-death balance: in steady state the flow up across every cut equals the flow down, λ πₙ = μ πₙ₊₁, so πₙ₊₁ = ρ πₙ with ρ = λ/μ, and normalizing gives the geometric law πₙ = (1 − ρ) ρⁿ. Everything follows in closed form: L = ρ/(1 − ρ) in the system, W = 1/(μ − λ), Lq = ρ²/(1 − ρ) and Wq = ρ/(μ − λ) in the queue, P(wait) = ρ, P(N ≥ k) = ρᵏ, and Little’s law L = λW ties them together. The same cut equations with state-dependent rates solve M/M/c and every other birth-death queue.',
  constraint:
    'Measured with μ = 1: the balance equations solved numerically on a chain of 600 states reproduce the closed form to 3 × 10⁻¹¹ at seven utilizations, with Little’s law and the geometric πₙ held to 10⁻⁹. An independent discrete-event simulation of the actual queue (60,000 customers per utilization, 120,000 at ρ ≥ 0.9, batch-means standard errors) lands within three standard errors of L, Wq, P(wait), and P(N ≥ 5) at ρ = 0.3, 0.5, 0.7, 0.8, 0.9, 0.95 (at 0.9: L 8.47 ± 0.34 against 9, Wq 8.43 ± 0.37 against 9, P(wait) 0.897 against 0.9) and obeys Little’s law inside the run. The explosion: L = 1, 4, 9, 19, 99 at ρ = 0.5, 0.8, 0.9, 0.95, 0.99. Deterministic service (M/D/1, Pollaczek-Khinchine) halves the queue wait, 4.5 against 9 at ρ = 0.9 (simulated 4.50 ± 0.32); two half-speed servers lengthen the time in system, 10.53 against 10.00; Kingman’s heavy-traffic formula is exact for M/M/1. Capacity reasoning (λ < μ, so nobody waits) predicts a wait of 0 where the measured wait is 8.4 service times at ρ = 0.9 and 17.0 at 0.95.',

  origins: (
    <p>
      Agner Krarup Erlang, an engineer at the Copenhagen Telephone Company,
      published the first queueing analysis in <strong>1909</strong>
      (&quot;The theory of probabilities and telephone conversations&quot;),
      deriving the Poisson arrival law and, in 1917, the blocking and delay
      formulas that still size call centers. Felix Pollaczek (1930) and
      Aleksandr Khinchine (1932) handled general service times; David
      Kendall&apos;s 1953 notation named the queue M/M/1 (Markovian arrivals,
      Markovian service, one server); John Little proved L = λW in{' '}
      <strong>1961</strong>; Leonard Kleinrock&apos;s Queueing Systems (1975)
      made the birth-death chain the textbook route to every formula and
      applied it to the ARPANET. The same cut equations price bank tellers,
      hospital beds, thread pools, and the latency of a web service at 90%
      utilization, which is where the formula’s warning is loudest.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>model</strong>: a Markov chain on the count in the
      system, births at λ, deaths at μ, whose steady state is a vector π
      that can be computed by recursion and normalization on a truncated
      chain, 600 states here, with no formula at all. The referee is an
      independent discrete-event simulation of the actual queue, exponential
      arrivals and services, 60,000 to 120,000 customers per utilization
      with batch-means error bars: it lands within three standard errors of
      every measure at every utilization and obeys Little’s law inside
      the run (<strong>L 8.47 ± 0.34 against 9 at ρ = 0.9</strong>), and
      the numerical chain matches the closed form to 3 × 10⁻¹¹.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>closed form</strong>: cut the chain between n and
      n + 1, equate the flows, and the whole distribution is geometric,
      πₙ = (1 − ρ) ρⁿ, so L = ρ/(1 − ρ) and W = 1/(μ − λ) with no
      iteration and no run. The shape is the lesson: <strong>1, 4, 9, 19,
      99</strong> customers at ρ = 0.5, 0.8, 0.9, 0.95, 0.99, a wait of 8.4
      service times measured at 90% utilization where capacity reasoning
      says nobody waits, and the same equations with death rate
      min(n, 2) μ/2 showing that two half-speed servers are slower (W 10.53
      against 10.00) while deterministic service halves the queue (4.5
      against 9).
    </p>
  ),

  picture: (
    <p>
      A single checkout lane where shoppers arrive at random moments and
      each takes a random time. Stand at the gap between &quot;three in
      line&quot; and &quot;four in line&quot; and count crossings: every
      time the line grows past three it must later shrink back past three,
      so over a long day the two counts are equal. Growing happens at the
      arrival rate while three are there; shrinking happens at the service
      rate while four are there. That one sentence, applied at every gap,
      fixes the odds of every line length: each extra person is ρ times as
      likely as the one before. At 90% busy the lane averages nine people,
      and the manager who sized it by capacity alone cannot see why.
    </p>
  ),

  steps: [
    <>
      <strong>Model:</strong> states n = 0, 1, 2, ...; up at rate λ from
      every state, down at rate μ from every state above zero.
    </>,
    <>
      <strong>Cut:</strong> between n and n + 1, flow up λ πₙ equals flow
      down μ πₙ₊₁, so πₙ₊₁ = ρ πₙ.
    </>,
    <>
      <strong>Normalize:</strong> Σ πₙ = 1 gives π₀ = 1 − ρ and πₙ =
      (1 − ρ) ρⁿ, valid only when ρ &lt; 1.
    </>,
    <>
      <strong>Read off:</strong> L = Σ n πₙ = ρ/(1 − ρ); Little’s law
      W = L/λ = 1/(μ − λ); Wq = W − 1/μ; P(wait) = 1 − π₀ = ρ.
    </>,
    <>
      <strong>Generalize:</strong> replace μ by μₙ (min(n, c) μ for c
      servers, or a finite buffer) and run the same recursion numerically
      when the sum has no closed form.
    </>,
  ],

  signals: [
    <>
      <strong>Random arrivals, one or a few servers:</strong> tickets, calls,
      requests, jobs; a mean rate and a mean service time are all you know.
    </>,
    <>
      <strong>A number for a plan:</strong> how many servers, what latency
      at what load, where the cliff is; a formula beats a simulation you
      must rerun per scenario.
    </>,
    <>
      <strong>Utilization above 70%:</strong> where intuition fails and the
      1/(1 − ρ) factor takes over.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>discrete-event simulation</strong>
      (puzzle 136): build the queue and run it. 240,000 events and error
      bars of ±0.34 to reproduce the number the formula gives exactly, and
      at ρ = 0.95 it still sits two standard errors low after 120,000
      customers.
    </>
  ),

  strength: (
    <>
      <strong>Every measure in closed form, from one sentence about
      flows.</strong> L, W, Lq, Wq, P(wait), the full distribution; the
      numerical chain agrees to 3 × 10⁻¹¹ and the simulation to three
      standard errors at six utilizations; the generalization to c servers
      is the same recursion.
    </>
  ),
  weakness: (
    <>
      <strong>Exponential everything, and steady state only.</strong>{' '}
      Deterministic service halves the queue (4.5 against 9), heavy-tailed
      service does the reverse, and real arrivals bunch; the formula knows
      nothing of time of day, finite buffers (unless you add them to the
      chain), or the hours a queue near saturation takes to settle, which
      is why the ρ = 0.95 simulation ran 2 standard errors under 19.
    </>
  ),

  problem: 'Queueing and performance analysis',
  problemSlug: 'queueing-performance',
  rivals: [
    {
      name: 'M/M/1 analysis × Birth-death balance equations',
      isThisUnit: true,
      algoName: 'M/M/1 analysis',
      cost: 'O(1) per measure; O(states) for the numerical chain',
      wins: (
        <>
          <strong>L = ρ/(1 − ρ) exactly</strong>; the simulation within 3
          standard errors at every utilization; Little’s law for free.
        </>
      ),
      costs: (
        <>
          Exponential service and arrivals assumed; steady state only.
        </>
      ),
      when: 'Sizing a single queue or a few servers under random load, and finding the utilization cliff.',
    },
    {
      name: 'Pollaczek-Khinchine formula',
      algoName: 'Pollaczek-Khinchine formula',
      cost: 'O(1); needs the service-time variance',
      wins: (
        <>
          Any service distribution (M/G/1): deterministic service gives Wq
          4.5 against 9 at ρ = 0.9, matched by simulation to 4.50 ± 0.32.
        </>
      ),
      costs: (
        <>
          Mean waits only, not the distribution; Poisson arrivals still
          assumed.
        </>
      ),
      when: 'Service times are far from exponential and you know their variance.',
    },
    {
      name: 'Erlang C formula',
      algoName: 'Erlang C formula',
      cost: 'O(c) for c servers',
      wins: (
        <>
          The c-server case in closed form: P(wait) and Wq for call-center
          staffing; the same chain with death rate min(n, c) μ.
        </>
      ),
      costs: (
        <>
          Infinite patience and exponential service assumed; one class of
          customer.
        </>
      ),
      when: 'How many agents for a target wait, the question Erlang first answered.',
    },
    {
      name: 'Discrete event simulation',
      algoName: 'Discrete event simulation',
      cost: 'O(events); error ~ 1/√events',
      wins: (
        <>
          Any arrival process, any service law, priorities, balking,
          time-varying load: whatever the formula cannot hold.
        </>
      ),
      costs: (
        <>
          240,000 events for L 8.47 ± 0.34 where the formula says 9; slow to
          settle near saturation.
        </>
      ),
      when: 'The system has structure no closed form captures, or the formula is the thing to be checked.',
    },
  ],
  neverUse: {
    name: 'Capacity reasoning: λ < μ, so nobody waits',
    why: (
      <>
        The server completes one job per unit time and only 0.9 arrive, so a
        deterministic planner sees 10% slack and no queue. Measured, the
        mean queue wait at ρ = 0.9 is <strong>8.4 service times</strong> and
        five or more customers are present 57% of the time; at ρ = 0.95 the
        wait is 17 service times. The planner&apos;s picture is right only
        if arrivals come on a schedule and every job takes exactly its mean;
        with random arrivals and random service the idle moments cannot be
        banked, so every burst is paid for in full. The 1/(1 − ρ) factor is
        the price of randomness, and it is invisible to any argument made
        with averages alone.
      </>
    ),
  },

  contest: {
    instance:
      'one server at rate μ = 1, Poisson arrivals at rate ρ; referee: a discrete-event simulation of the actual queue (60,000 customers per utilization, 120,000 at ρ ≥ 0.9, batch-means standard errors) and the balance equations solved numerically on a 600-state chain; measures: L, Wq, P(wait), P(N ≥ 5)',
    columns: ['ρ = 0.5', 'ρ = 0.8', 'ρ = 0.9', 'ρ = 0.95', 'work'],
    rows: [
      {
        method: 'M/M/1 closed form, L',
        isThisUnit: true,
        values: ['1.000', '4.000', '9.000', '19.000', 'O(1)'],
        best: 4,
        verdict: 'the formula',
      },
      {
        method: 'balance equations, numerical chain, L',
        values: ['1.000', '4.000', '9.000', '19.000', '600 states'],
        verdict: 'agrees to 3e-11',
      },
      {
        method: 'simulation, L (± standard error)',
        values: ['1.018 ± 0.012', '3.948 ± 0.132', '8.466 ± 0.338', '17.04 ± 1.05', '120,000 to 240,000 events'],
        verdict: 'within 3 standard errors; slow near saturation',
      },
      {
        method: 'closed form Wq and simulation',
        values: ['1.000 / 1.039', '4.000 / 3.962', '9.000 / 8.428', '19.00 / 16.96', '·'],
        verdict: 'the queue wait, in service times',
      },
      {
        method: 'closed form P(wait) and simulation',
        values: ['0.500 / 0.506', '0.800 / 0.793', '0.900 / 0.897', '0.950 / 0.950', '·'],
        verdict: 'P(wait) = ρ',
      },
      {
        method: 'M/D/1 (Pollaczek-Khinchine) Wq',
        values: ['0.500', '2.000', '4.500', '9.500', 'O(1)'],
        verdict: 'half the queue wait',
      },
      {
        method: 'capacity reasoning, Wq',
        values: ['0', '0', '0', '0', '·'],
        verdict: 'the negative example',
      },
    ],
    source:
      'python solutions/mm1_analysis_birth_death_balance_equations.py prints these numbers and asserts: the numerical chain within 1e-9 of the closed form for L, Lq, W, Wq, and P(wait) at seven utilizations with Little’s law and the geometric πₙ to 1e-9; the simulation within three standard errors (plus 0.02) of L and Wq, within 0.02 of P(wait) and 0.03 of P(N ≥ 5) at six utilizations, and Little’s law inside the run within 8%; M/D/1 simulated within three standard errors of Pollaczek-Khinchine and exactly half the M/M/1 queue wait; two half-speed servers with a longer time in system and a shorter queue wait, simulated within three standard errors of the chain; Kingman exact for M/M/1 and M/D/1; L rounding to 1, 4, 9, 19, 99; and the simulated wait above 7 service times at ρ = 0.9 and 12 at 0.95 against the capacity planner’s zero.',
  },

  figure: (
    <Figure
      id="fig-mm1-geometric"
      aspect="16 / 7"
      caption="Left: the steady-state distribution of the number in the system, πₙ = (1 − ρ) ρⁿ, at ρ = 0.5 (blue) and ρ = 0.9 (amber): each extra customer is ρ times as likely as the one before, so at 90% utilization five or more are present 59% of the time. Right: the mean number in the system against utilization, L = ρ/(1 − ρ), with the simulated means and their error bars at six utilizations: 1 at half load, 9 at 90%, 19 at 95%, 99 at 99%."
      cite={{
        text: 'A. K. Erlang, "The theory of probabilities and telephone conversations," Nyt Tidsskrift for Matematik B 20, 1909. D. G. Kendall, "Stochastic processes occurring in the theory of queues and their analysis by the method of the imbedded Markov chain," Annals of Mathematical Statistics 24(3), 1953, DOI 10.1214/aoms/1177728975. J. D. C. Little, "A proof for the queuing formula L = λW," Operations Research 9(3), 1961.',
        href: 'https://doi.org/10.1214/aoms/1177728975',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Geometric state probabilities at two utilizations, and the mean number in system against utilization with simulated points">
        {(() => {
          const x0 = 40;
          const y0 = 230;
          const ph = 170;
          const bars = [];
          for (let n = 0; n <= 14; n += 1) {
            const p5 = 0.5 * 0.5 ** n;
            const p9 = 0.1 * 0.9 ** n;
            bars.push(
              <g key={n}>
                <rect x={x0 + n * 20} y={y0 - p5 / 0.5 * ph} width="8" height={p5 / 0.5 * ph} fill="#5da2ff" fillOpacity="0.85" />
                <rect x={x0 + n * 20 + 9} y={y0 - p9 / 0.5 * ph} width="8" height={p9 / 0.5 * ph} fill="#f0b94b" fillOpacity="0.85" />
                {n % 2 === 0 && <text x={x0 + n * 20 + 2} y={y0 + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{n}</text>}
              </g>,
            );
          }
          const bx = 390;
          const by = 230;
          const bw = 220;
          const bh = 180;
          const X = (r) => bx + r * bw;
          const Y = (L) => by - (Math.log10(L + 1) / Math.log10(100)) * bh;
          const curve = Array.from({ length: 99 }, (_, i) => (i + 1) / 100).filter((r) => r <= 0.99).map((r) => `${X(r)},${Y(r / (1 - r))}`).join(' ');
          const sims = [[0.3, 0.43, 0.004], [0.5, 1.018, 0.012], [0.7, 2.323, 0.072], [0.8, 3.948, 0.132], [0.9, 8.466, 0.338], [0.95, 17.04, 1.05]];
          return (
            <g>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">P(n in system): blue rho 0.5, amber rho 0.9</text>
              {bars}
              <text x={x0} y={y0 + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">each step down is a factor rho; P(N {'>='} 5) = 0.03 and 0.59</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={curve} fill="none" stroke="#5da2ff" strokeWidth="2" />
              {sims.map(([r, L, se]) => (
                <g key={r}>
                  <line x1={X(r)} y1={Y(L - 3 * se)} x2={X(r)} y2={Y(L + 3 * se)} stroke="#e9edf6" />
                  <circle cx={X(r)} cy={Y(L)} r="3" fill="#e9edf6" />
                </g>
              ))}
              {[0.5, 0.9, 0.99].map((r) => <text key={r} x={X(r) - 10} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{r}</text>)}
              {[1, 9, 99].map((L) => <text key={L} x={bx - 22} y={Y(L) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{L}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">L = ρ/(1−ρ), log; simulation dots</text>
              <text x={bx} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">1 at 0.5, 9 at 0.9, 19 at 0.95, 99 at 0.99</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'mm1_analysis_birth_death_balance_equations.py',
  Viz: Mm1Viz,
  narration,
};
