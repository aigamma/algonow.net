import DesViz from '../viz/DesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/discrete_event_simulation_event_queue_advance.py?raw';
import { narration } from './discrete-event-simulation-event-queue-advance.narration.js';

export const content = {
  given:
    'A single server, customers arriving at random (Poisson, 0.8 per unit time) and taking random service times (exponential, mean 1). How many are in the system on average, how long does each spend there, how often is the server idle? Then the same questions for a server whose service time is exactly 1.',
  task: 'Keep the state (who is in service, who is waiting) and a calendar of pending events: the next arrival, the next departure. Pop the earliest event, jump the clock to its time, update the state, schedule whatever it causes, repeat. Nothing is computed for the time between events.',
  constraint:
    'Over 200,000 customers the calendar processed exactly 400,000 events with zero order violations across 250,547 time units, and its mean number in the system 3.940, mean time 4.935, and idle fraction 0.202 sit within 1.5% of the exact M/M/1 values 4, 5, and 0.2; Little’s law holds inside the run to four decimals (λW = 3.940 = L). The same simulator with one line changed for deterministic service lands within 0.2% of Pollaczek-Khinchine (L = 2.395 vs 2.4). The ablation, a clock that advances in fixed slots, needs 2,500,000 steps at Δt = 0.01 for a horizon the calendar covers in 40,000 (62×), and at Δt = 0.1 its mean is 16.2% off because events inside one slot are merged and reordered.',

  origins: (
    <p>
      Keith Tocher&apos;s General Simulation Program (1960), written
      for the British steel industry, is usually counted the first
      discrete event simulator; Geoffrey Gordon&apos;s GPSS at IBM
      (<strong>1961</strong>) made the event-scheduling worldview a
      language, Markowitz, Hausner, and Karr&apos;s SIMSCRIPT (RAND,
      1962) followed, and Dahl and Nygaard&apos;s SIMULA (1962 to 1967)
      invented classes and objects to model the entities in a
      simulation, which is how object-oriented programming was born as
      a side effect of queueing models. Little proved his law in
      1961; Kendall&apos;s notation (1953) and the Pollaczek-Khinchine
      formula (1930) supply the exact answers this page checks
      against. The calendar itself became a data-structures problem:
      Vaucher and Duval (1975) compared event lists, and Randy
      Brown&apos;s calendar queue (1988) made the next-event operation
      O(1) on average. SimPy, Arena, and AnyLogic run the same loop.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>state machine</strong>: an arrival adds a
      customer and either starts service or joins the queue; a
      departure frees the server and starts the next in line; each
      event schedules the ones it causes. Measured against the exact
      M/M/1 formulas over 200,000 customers: mean number in the system{' '}
      <strong>3.940 (exact 4)</strong>, mean time 4.935 (exact 5),
      idle 0.202 (exact 0.2). Little&apos;s law, computed two
      independent ways inside the same run, agrees to four decimals.
      Change one line, deterministic service, and the same loop lands
      within 0.2% of Pollaczek-Khinchine: 2.395 against 2.4.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>clock</strong>: a priority queue of pending
      events, and the clock jumps to the earliest. Every unit of
      simulated time costs exactly as many steps as it has events:{' '}
      <strong>400,000 events for 400,000 state changes</strong>, in
      nondecreasing time order with zero violations. The ablation
      advances the clock in fixed slots and checks for events in each:
      at Δt = 0.01 it takes 2,500,000 steps for a horizon the calendar
      covers in 40,000, 62× the work, for a mean 3.3% off; at Δt = 0.1
      it takes 250,000 steps and lands <strong>16.2% off</strong>,
      because two events inside one slot are resolved at the
      slot&apos;s end in a fixed order, which delays departures and
      inflates the queue. The calendar has no slot: it pays nothing for
      empty time and never reorders.
    </p>
  ),

  picture: (
    <p>
      A night dispatcher who sleeps between calls. The naive
      dispatcher sets an alarm for every minute, wakes, checks whether
      anything happened, and goes back to sleep: most alarms find
      nothing, and when two things happen in the same minute they
      are logged in whatever order the checklist reads, at the
      minute&apos;s end. The event dispatcher keeps a list of what is
      scheduled, a truck due at 2:17, a shift ending at 3:05, and sets
      one alarm for the earliest. When it rings, the clock is set to
      that moment exactly, the event is handled, anything it triggers
      is added to the list, and the alarm is reset for the new
      earliest. A quiet night costs no wakeups; a busy one costs one
      per event; nothing is ever handled late or out of order.
    </p>
  ),

  steps: [
    <>
      <strong>Calendar:</strong> a heap of (time, sequence, kind);
      seed it with the first arrival.
    </>,
    <>
      <strong>Pop:</strong> the earliest event; advance the clock to
      its time, accumulating time-weighted state on the way.
    </>,
    <>
      <strong>Handle:</strong> arrival: join or start service, schedule
      the next arrival and, if starting, the departure; departure:
      start the next in line or go idle.
    </>,
    <>
      <strong>Repeat</strong> until 200,000 customers have left:
      400,000 events, clock never backwards.
    </>,
    <>
      <strong>Check:</strong> L, W, idle against the formulas; L = λW
      inside the run; then M/D/1 against Pollaczek-Khinchine.
    </>,
  ],

  signals: [
    <>
      <strong>State changes at instants, not continuously:</strong>{' '}
      arrivals, departures, failures, packets, jobs; nothing happens
      between events.
    </>,
    <>
      <strong>Sparse events in long time:</strong> the calendar costs
      per event, the slot clock per unit of time, and the gap is the
      idle fraction times the slot count.
    </>,
    <>
      <strong>No closed form:</strong> M/M/1 has one (the referee);
      a network of queues with priorities and breakdowns does not.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>fixed-increment time advance</strong>:
      tick the clock by Δt and check what happened. It is the first
      simulator everyone writes, and it is measured here at 62× the
      steps for 3.3% error at Δt = 0.01, or a tenth of that work for a
      16.2% error at Δt = 0.1. The calendar is exact at both.
    </>
  ),

  strength: (
    <>
      <strong>Exact event timing at a cost proportional to events.</strong>{' '}
      Within 1.5% of the M/M/1 formulas and 0.2% of Pollaczek-Khinchine,
      Little&apos;s law to four decimals, zero ordering errors in
      400,000 events, and the whole thing changes models by changing
      one line of the service-time draw.
    </>
  ),
  weakness: (
    <>
      <strong>Statistics, not answers.</strong> 200,000 customers to get
      within 1.5%; ten times more for a third of that error; and a
      warm-up transient to discard. Continuous dynamics (a tank
      draining between events) need a hybrid. Dense events (every
      packet in a data center) push the calendar itself, which is why
      calendar queues and time warp exist; and the model is only as
      right as its distributions.
    </>
  ),

  problem: 'Systems modeling',
  problemSlug: 'queueing-performance',
  rivals: [
    {
      name: 'Discrete event simulation × event-queue advance',
      isThisUnit: true,
      algoName: 'Discrete event simulation',
      cost: 'O(events × log calendar)',
      wins: (
        <>
          <strong>Any model, exact timing</strong>: 1.5% of M/M/1 and
          0.2% of M/D/1 from the same loop, 62× fewer steps than a
          slot clock.
        </>
      ),
      costs: (
        <>
          Sampling error that falls as 1/√n; a warm-up to discard.
        </>
      ),
      when: 'Queues, networks, and schedules with random timing and no closed form.',
    },
    {
      name: 'Markov chain simulation',
      cost: 'one transition per step',
      wins: (
        <>
          The same randomness as a chain of states; jump-chain or
          uniformized, it gives the M/M/1 numbers without a calendar.
        </>
      ),
      costs: (
        <>
          Needs memoryless (exponential) timing; M/D/1 is not a
          Markov chain in the customer count.
        </>
      ),
      when: 'Exponential holding times and a small enough state space.',
    },
    {
      name: 'Mean value analysis',
      cost: 'a recursion over customers',
      wins: (
        <>
          Exact mean queue lengths and times for closed product-form
          networks, with no sampling at all.
        </>
      ),
      costs: (
        <>
          Product-form assumptions only: no priorities, no breakdowns,
          no general service times.
        </>
      ),
      when: 'Closed networks of exponential servers where the assumptions hold.',
    },
    {
      name: 'Jackson network analysis',
      cost: 'one formula per node',
      wins: (
        <>
          Open networks of M/M/1 nodes decompose exactly: each node is
          priced alone.
        </>
      ),
      costs: (
        <>
          Poisson routing and exponential service or nothing.
        </>
      ),
      when: 'Sizing an open network before a simulation is worth building.',
    },
  ],
  neverUse: {
    name: 'Fixed-increment time advance for sparse events',
    why: (
      <>
        Measured on the same queue and horizon: <strong>2,500,000 steps
        at Δt = 0.01</strong> where the calendar took 40,000, for a
        mean still 3.3% off; and at Δt = 0.1, a tenth of that work
        with the mean 16.2% wrong, because two events in one slot are
        merged at the slot&apos;s end in a fixed order, which delays
        every departure that shared a slot with an arrival. The slot
        clock pays for empty time and gets the busy time wrong; the
        finer you make it, the more it pays. The calendar pays per
        event and is exact.
      </>
    ),
  },

  contest: {
    instance:
      'a single-server queue, arrivals at rate 0.8, service at rate 1 (utilization 80%); referees: the exact M/M/1 and M/D/1 (Pollaczek-Khinchine) formulas and Little’s law',
    columns: ['steps', 'mean in system', 'exact'],
    rows: [
      {
        method: 'Event calendar, M/M/1, 200,000 customers',
        isThisUnit: true,
        values: ['400,000', '3.940', '4.0'],
        best: 1,
        verdict: 'time in system 4.935 (exact 5), idle 0.202 (exact 0.2)',
      },
      {
        method: 'Fixed step 0.1, same queue, 25,000 time units',
        values: ['250,000', '4.647', '4.0'],
        verdict: '16.2% off: events inside a slot are merged and reordered',
      },
      {
        method: 'Fixed step 0.01, same queue, 25,000 time units',
        values: ['2,500,000', '3.867', '4.0'],
        verdict: '3.3% off, at 62× the calendar’s 40,000 steps for the same horizon',
      },
      {
        method: 'Event calendar, M/D/1, 200,000 customers',
        values: ['400,000', '2.395', '2.4'],
        verdict: 'time in system 2.996 (Pollaczek-Khinchine 3.0); one line changed',
      },
    ],
    source:
      'python solutions/discrete_event_simulation_event_queue_advance.py prints this table and asserts: L, W, and the idle fraction within 3% of the M/M/1 formulas; Little’s law inside the run to 0.5%; zero calendar order violations and exactly two events per customer; the fixed-step clock at exactly 250,000 and 2,500,000 steps, more than 50× the calendar’s for the same horizon; and the M/D/1 mean time and number within 3% of Pollaczek-Khinchine.',
  },

  figure: (
    <Figure
      id="fig-des-calendar"
      aspect="16 / 7"
      caption="Two clocks over the same customers. Top: the event calendar jumps from event to event (arrivals up, departures down), and the number in the system is a step function that is exact between jumps. Bottom: a slot clock ticks at fixed intervals; an arrival and a departure that fall in the same slot are both resolved at its end, so the departure is delayed and the queue is overcounted. Measured over 25,000 time units: the calendar 40,000 steps and exact; slots of 0.1, 250,000 steps and 16.2% off; slots of 0.01, 2,500,000 steps and 3.3% off."
      cite={{
        text: 'G. Gordon, "A general purpose systems simulation program," AFIPS Eastern Joint Computer Conference, 1961. DOI 10.1145/1460764.1460768. J. D. C. Little, "A proof for the queuing formula L = λW," Operations Research 9(3), 1961. R. Brown, "Calendar queues," CACM 31(10), 1988.',
        href: 'https://doi.org/10.1145/1460764.1460768',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="An event timeline with jumps at arrivals and departures above a slot timeline with evenly spaced ticks, and the measured step counts and errors">
        <line x1="40" y1="90" x2="600" y2="90" stroke="rgba(154,165,189,0.5)" />
        {[70, 110, 125, 190, 240, 275, 330, 360, 420, 470, 520, 560].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={i % 3 === 2 ? 90 : 72} x2={x} y2={i % 3 === 2 ? 108 : 90} stroke={i % 3 === 2 ? '#e2606c' : '#5da2ff'} strokeWidth="2" />
            {i === 4 && <text x={x - 30} y="60" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">clock jumps here</text>}
          </g>
        ))}
        <text x="40" y="40" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">event calendar: 40,000 steps for 25,000 time units, exact order</text>
        <text x="40" y="128" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">blue: arrivals; red: departures; the clock visits only these</text>
        <line x1="40" y1="200" x2="600" y2="200" stroke="rgba(154,165,189,0.5)" />
        {Array.from({ length: 29 }, (_, i) => <line key={i} x1={40 + i * 20} y1="194" x2={40 + i * 20} y2="206" stroke="rgba(154,165,189,0.6)" />)}
        <rect x="100" y="182" width="20" height="36" fill="rgba(240,185,75,0.25)" stroke="#f0b94b" />
        <line x1="110" y1="182" x2="110" y2="200" stroke="#5da2ff" strokeWidth="2" />
        <line x1="125" y1="200" x2="125" y2="218" stroke="#e2606c" strokeWidth="2" />
        <text x="130" y="176" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">two events, one slot: resolved at its end, in a fixed order</text>
        <text x="40" y="160" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">slot clock: 250,000 steps at 0.1 (16.2% off), 2,500,000 at 0.01 (3.3% off)</text>
        <text x="40" y="250" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">M/M/1: L 3.940 (4), W 4.935 (5), idle 0.202 (0.2); Little’s law λW = 3.940 = L</text>
        <text x="40" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">M/D/1 with one line changed: L 2.395 (Pollaczek-Khinchine 2.4), W 2.996 (3.0)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'discrete_event_simulation_event_queue_advance.py',
  Viz: DesViz,
  narration,
};
