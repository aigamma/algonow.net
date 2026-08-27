import ChandyLamportViz from '../viz/ChandyLamportViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/chandy_lamport_marker_snapshots.py?raw';
import { narration } from './chandy-lamport-marker-snapshots.narration.js';

export const content = {
  given:
    'Money moving between banks over network channels, and an auditor who must total the books while the transfers keep flying: no pause button exists.',
  task: 'Record a consistent global state of a running distributed system: each process photographs itself on first marker, and the markers sweep every channel clean of in-flight traffic.',
  constraint:
    'The referee is the conserved total itself: across 300 randomized runs with the shutter fired at random moments, recorded balances plus recorded channel contents equal 100,000 exactly, every run: while the naive auditor (staggered reads, no channel accounting) is wrong on all 300. Causal consistency is audited message-by-message: zero effects-without-causes.',

  origins: (
    <p>
      K. Mani Chandy and Leslie Lamport, ACM TOCS <strong>1985</strong>:
      by Lamport&apos;s own telling, Chandy posed the global-state
      problem over dinner and they had the algorithm the same
      evening: a page of protocol atop Lamport&apos;s deeper 1978
      insight that distributed time is <em>causal order</em>, not
      clock order. The snapshot&apos;s descendants run everywhere
      state must be captured in motion: Flink&apos;s checkpoint
      barriers are Chandy-Lamport markers almost verbatim,
      deadlock and termination detectors ride it, and every
      exactly-once streaming pipeline owes it the trick of
      photographing a river without damming it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>protocol</strong>: any process may click the
      shutter: record own state, send a marker down every outgoing
      channel. Every process, on its <em>first</em> marker: record
      state, flood markers onward. A channel&apos;s recorded
      contents are the messages arriving after the receiver&apos;s
      photo but before that channel&apos;s marker. Termination is
      counted: <strong>exactly one marker per channel</strong>{' '}
      (30 per run), every process recorded, every channel closed,
      300 of 300 runs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>moving cut</strong>: on FIFO channels
      the marker acts as a sweep line: everything ahead of it
      belongs to the snapshot&apos;s past, everything behind to
      its future: so the recorded state is a <em>consistent
      cut</em> through causality with no shared clock and no
      pause. Measured: a mean of <strong>7.2 in-flight transfers
      per run</strong> caught inside channels: money no
      instantaneous camera could see: and the causal audit found
      zero receives-without-sends across every message of every
      run.
    </p>
  ),

  picture: (
    <p>
      Photographing a relay race with one slow camera. Shoot each
      runner at a different moment and the baton appears twice or
      not at all: four true readings composing one false world.
      The marker trick: hand the lead runner a flag; every runner
      photographs themselves the instant they first see a flag
      and passes flags to everyone they exchange batons with: and
      each stretch of track photographs whatever batons are
      mid-air between one runner&apos;s photo and the flag&apos;s
      arrival. Nobody stopped running. The composite is not a
      moment that ever existed on any wall clock: it is better: a
      state the system <em>could</em> have been in, with every
      baton accounted for exactly once.
    </p>
  ),

  steps: [
    <>
      <strong>Click:</strong> any process records its state and
      sends a marker down every outgoing channel.
    </>,
    <>
      <strong>First marker rule:</strong> on your first marker,
      record your state and flood markers onward: the snapshot
      propagates itself.
    </>,
    <>
      <strong>Record the sweep:</strong> a channel&apos;s
      contents = messages arriving after your photo but before
      that channel&apos;s marker (FIFO makes the boundary sharp).
    </>,
    <>
      <strong>Terminate by counting:</strong> one marker per
      channel: when all have arrived, the global photo is
      complete (30 markers, 300/300 runs).
    </>,
    <>
      <strong>Total the cut:</strong> states + channel records =
      the invariant, exactly: 100,000 to the unit, every run.
    </>,
  ],

  signals: [
    <>
      <strong>Global questions about running systems:</strong>{' '}
      totals, deadlock, termination, stable properties: anything
      needing one coherent view without stopping the world.
    </>,
    <>
      <strong>Checkpointing live streams:</strong> Flink&apos;s
      barriers ARE this protocol: exactly-once processing rides
      the moving cut.
    </>,
    <>
      <strong>Causality over clocks:</strong> whenever
      &quot;at the same time&quot; is meaningless (it always is,
      distributed), the consistent cut is the honest replacement.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive audit</strong>:
      read each process when you can get to it, add: measured
      wrong <strong>300 of 300 times</strong>, because in-flight
      money is invisible to any set of process-local readings.
      Its expensive cousin: <strong>stop-the-world</strong>:
      pause everything, read, resume: is correct and pays with
      availability: the entire system down for every audit.
    </>
  ),

  strength: (
    <>
      <strong>The invariant itself as referee, at zero
      tolerance.</strong> 300 randomized storms, the shutter
      fired at random moments: recorded states plus channel
      records equal to 100,000 exactly, every run, with a mean of
      7.2 in-flight transfers caught mid-channel; the causal
      audit (every receive&apos;s send inside the cut) at zero
      violations; marker accounting exact; and the naive
      auditor&apos;s 0-for-300 on the identical storms as the
      measured contrast.
    </>
  ),
  weakness: (
    <>
      <strong>FIFO channels are the load-bearing assumption, and
      the photo is causal, not chronological.</strong> On
      non-FIFO transports the marker no longer separates past
      from future (real systems layer sequence numbers to
      restore it). The snapshot is a state the system{' '}
      <em>could</em> have occupied: perfect for stable properties
      (once true, stays true) and conserved totals: but it
      cannot answer &quot;what was true at 3:00:00 PM,&quot;
      because no such global instant exists. Channels must be
      known and finite, processes must not crash mid-protocol
      (crash-tolerant checkpointing needs more machinery), and
      the marker flood is O(channels) traffic per snapshot.
    </>
  ),

  problem: 'Distributed snapshots',
  problemSlug: 'distributed-snapshots',
  rivals: [
    {
      name: 'Chandy-Lamport × markers',
      isThisUnit: true,
      algoName: 'Chandy-Lamport',
      cost: 'O(channels) markers',
      wins: (
        <>
          <strong>A consistent photo with no pause</strong>: the
          conserved total exact 300/300 while the money never
          stopped moving.
        </>
      ),
      costs: (
        <>
          FIFO assumed, causal not chronological, and crashes
          mid-protocol need heavier machinery.
        </>
      ),
      when: 'Audits, deadlock and termination detection, and every streaming checkpoint since.',
    },
    {
      name: 'Lamport timestamps',
      algoName: 'Lamport timestamps',
      cost: 'one counter per process',
      wins: (
        <>
          The 1978 foundation: a single counter per process
          ordering events consistently with causality: the idea
          that made &quot;before&quot; meaningful without clocks.
        </>
      ),
      costs: (
        <>
          A total order that loses concurrency information: two
          unrelated events still get ordered, arbitrarily.
        </>
      ),
      when: 'Ordering decisions cheaply: mutexes, log ordering: when full causality is overkill.',
    },
    {
      name: 'Vector clocks',
      algoName: 'Vector clocks',
      cost: 'O(n) per message',
      wins: (
        <>
          Full causality: compare two stamps and know precisely
          whether one caused the other or they were concurrent:
          the complete happened-before record.
        </>
      ),
      costs: (
        <>
          A vector on every message, growing with the process
          count: the price of remembering everything.
        </>
      ),
      when: 'Conflict detection in replicated stores: when concurrent-vs-caused is the actual question.',
    },
    {
      name: 'Raft × log snapshots',
      algoName: 'Raft',
      cost: 'consensus + compaction',
      wins: (
        <>
          The live unit&apos;s world: replicated state machines
          snapshot their log prefix for compaction: consensus
          makes the cut trivial because everyone agrees on order
          first.
        </>
      ),
      costs: (
        <>
          Buying total order costs quorums and leaders:
          Chandy-Lamport photographs systems that never agreed
          on an order at all.
        </>
      ),
      when: 'When you already run consensus: snapshot the log; markers are for the orderless world.',
    },
  ],
  neverUse: {
    name: 'A wall-clock cut of a distributed system',
    why: (
      <>
        Synchronize the clocks with NTP, read every node at
        &quot;exactly&quot; 3:00:00, call it a snapshot: the
        naive photographer with extra confidence. The measurement
        stands: staggered local readings missed the invariant{' '}
        <strong>300 times out of 300</strong>, and better clocks
        do not fix it, because the error is not skew: it is the
        in-flight messages that no set of process-local readings
        can see, plus the physical truth that simultaneity across
        machines is not a real thing (NTP skew, GC pauses,
        network delay all smear the &quot;instant&quot;). Every
        reading in the naive audit was individually TRUE: the
        composite was false: the failure lives between the
        readings. Distributed time is causal order: cut along
        causality (markers) and totals balance exactly: cut along
        a clock and you audit a world that never existed.
      </>
    ),
  },

  contest: {
    instance:
      'audit 100,000 units across 6 banks WITHOUT pausing the transfers; referee: the conserved total itself, and the causal order of every message',
    columns: ['exact totals', 'nature'],
    rows: [
      {
        method: 'Naive (staggered reads)',
        values: ['0/300', 'wrong'],
        verdict: 'four true readings, one false world: in-flight money invisible',
      },
      {
        method: 'Stop-the-world',
        values: ['exact', 'paused'],
        verdict: 'correct, and the whole system is down for every audit',
      },
      {
        method: 'Chandy-Lamport markers',
        isThisUnit: true,
        values: ['300/300', 'running'],
        best: 0,
        verdict: 'states + channel records = 100,000 exactly, mid-flight, every run',
      },
    ],
    source:
      "python solutions/chandy_lamport_marker_snapshots.py prints this table and asserts: across 300 randomized runs with snapshots initiated at random moments, recorded process states plus recorded channel contents equal 100,000 exactly on every run (a mean of 7.2 in-flight transfers caught inside channels); the naive staggered audit wrong on all 300 of the same storms; causal consistency audited message-by-message with zero receives-in-the-cut whose sends are outside it; and termination exact: 30 markers (one per channel), every process recorded, every channel closed, all runs.",
  },

  figure: (
    <Figure
      id="fig-chandy-cut"
      aspect="16 / 7"
      caption="A cut through causality, not through time. Each process photographs itself on its first marker; the marker then sweeps each FIFO channel, and whatever arrives between the photo and the sweep IS the channel's in-flight content: recorded once, missed never. The composite state never existed at any wall-clock instant: it is a state the system could have occupied, which is exactly what conservation laws and stable properties need: measured here as 300 of 300 exact totals while the naive clock-style audit went 0 for 300 on the same storms."
      cite={{
        text: 'Chandy & Lamport, "Distributed Snapshots: Determining Global States of Distributed Systems", ACM TOCS 3(1), 1985: posed over dinner, solved that evening, running in every stream checkpoint since.',
        href: 'https://doi.org/10.1145/214451.214456',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Process timelines with a jagged consistent cut through them, markers sweeping channels, versus a straight wall-clock line">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1="60" y1={60 + i * 50} x2="600" y2={60 + i * 50} stroke="rgba(154,165,189,0.4)" strokeWidth="1.4" />
            <text x="20" y={64 + i * 50} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">P{i + 1}</text>
          </g>
        ))}
        <path d="M 250 45 L 250 75 L 330 95 L 330 125 L 280 145 L 280 175" fill="none" stroke="#5da2ff" strokeWidth="2.4" />
        <text x="240" y="38" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">the consistent cut: jagged in clock time, straight in causality</text>
        <line x1="420" y1="45" x2="420" y2="175" stroke="#e2606c" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x="428" y="56" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">the wall-clock line:</text>
        <text x="428" y="70" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">0/300 exact</text>
        <path d="M 300 60 L 380 110" stroke="#f0b94b" strokeWidth="1.8" />
        <circle cx="352" cy="92" r="5" fill="#f0b94b" />
        <text x="330" y="130" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">in-flight: caught by the sweep</text>
        <text x="60" y="220" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: photos + channel records = 100,000 exactly, 300/300, ~7.2 transfers caught mid-channel per run</text>
        <text x="60" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">causal audit: every receive inside the cut has its send inside the cut: zero violations</text>
        <text x="60" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">termination: exactly one marker per channel (30), every run complete</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'chandy_lamport_marker_snapshots.py',
  Viz: ChandyLamportViz,
  narration,
};
