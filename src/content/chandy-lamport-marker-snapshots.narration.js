// The spoken lesson for puzzle ninety nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety nine: the Chandy-Lamport algorithm, paired with marker-based snapshots, for photographing a distributed system that will not hold still. Here is the puzzle. Money moves between six banks over network channels. An auditor must total the books: one hundred thousand units, to the unit: while the transfers keep flying, because there is no pause button on a running system. Read each bank whenever you can get to it and add the numbers, and you will be wrong: this page measures it: three hundred audits, three hundred wrong totals: because at any moment, money is IN THE CHANNELS, mid-flight, invisible to every process-local reading. The method solves it with a special message: the marker: and the referee is the sternest one imaginable: the conservation law itself. Across three hundred randomized runs with the shutter clicked at random moments, the snapshot’s total: recorded balances plus recorded channel contents: equals one hundred thousand exactly. Every run. While the money never stopped moving.',
  },
  {
    section: 'origins',
    text:
      'K. Mani Chandy and Leslie Lamport, published in the A C M Transactions on Computer Systems, nineteen eighty five: and by Lamport’s own telling, Chandy posed the global-state problem over dinner and the two of them had the algorithm before the evening ended. The speed makes sense: the hard idea was already seven years old. Lamport’s nineteen seventy eight insight: that time in a distributed system IS the causal order of events, not any clock: made the question answerable, and the snapshot protocol is that insight wearing work clothes. The descendants are everywhere state must be captured in motion: Apache Flink’s checkpoint barriers are Chandy-Lamport markers nearly verbatim, powering exactly-once stream processing at planetary scale: deadlock detectors, termination detectors, and distributed debuggers all ride the same cut. One page of protocol, one dinner conversation, forty years of production.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the protocol, and it fits in three sentences. Any process may click the shutter: it records its own state and sends a MARKER down every outgoing channel. Every process, on receiving its FIRST marker, records its own state and floods markers down all of its channels too: the snapshot propagates itself. And each process records, per incoming channel, the messages that arrive after its own photo but before that channel’s marker. The heuristic is what the marker buys on first-in-first-out channels: a moving cut. The marker sweeps each channel like a squeegee: every message ahead of it belongs to the snapshot’s past: everything behind it, to the future: so in-flight traffic is captured exactly once, with no clock, no pause, no coordination beyond the flood. Measured here: a mean of seven point two transfers per run caught INSIDE channels: money that no instantaneous camera could ever see.',
  },
  {
    section: 'picture',
    text:
      'Photographing a relay race with one slow camera. Walk the track shooting each runner whenever you reach them, and the composite will show the baton twice, or not at all: four individually true photographs composing one false world. The marker trick: hand the lead runner a flag. Every runner photographs themselves the instant they first see a flag, then passes flags along with every baton exchange: and each stretch of track gets photographed for exactly the interval between one runner’s photo and the flag’s arrival: whatever batons are mid-air in that window belong to the picture. Nobody stopped running. And here is the beautiful subtlety: the composite is not a moment that ever existed on any wall clock. It is something better: a state the race COULD have been in, consistent with every cause and effect: and for questions like how many batons exist, a could-have-been state is exactly as good as a real instant, because conservation laws hold in every possible state.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Click: a random bank records its balance and sends six markers minus one: one down each channel. First-marker rule: each bank, on its first marker, photographs itself and floods markers onward. Sweep: each channel’s recorded content is what lands between the receiver’s photo and that channel’s marker: FIFO makes the boundary knife-sharp. Terminate by counting: exactly one marker per channel: thirty in the six-bank client: when all have arrived, the global photo is complete: asserted on all three hundred runs. Then the referee: sum the six photographed balances, add the channel catches: one hundred thousand, exactly, every single run: while the naive auditor, reading the same six banks at six different moments on the same storms, missed the invariant three hundred times out of three hundred. And the causal audit goes deeper than totals: every message credited as received inside the cut has its send debited inside the cut: zero effects without causes, checked message by message.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: global questions about running systems: totals and conservation checks, deadlock detection, termination detection, garbage collection across machines: the classical stable properties: once true, they stay true, so a could-have-been snapshot that shows them true is proof. Second: checkpointing live streams. If you have used Apache Flink, you have run this algorithm: its barriers flow through the dataflow exactly as markers flow through channels, and exactly-once processing is the moving cut with a restore button. Third, the transferable instinct: causality over clocks. The moment a system spans two machines, at-the-same-time stops being a real thing: and every correct tool in this space: Lamport timestamps, vector clocks, this snapshot: replaces the clock question with the causal one. Ask what happened before what, never what happened at three o’clock.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, which are one family tree. Lamport timestamps, nineteen seventy eight: one counter per process, bumped on every event, maxed on every message: gives a total order of events consistent with causality: the foundation everything here stands on. Cheap and decisive: but it orders even unrelated events, arbitrarily, so it cannot tell you whether two events were genuinely concurrent. Vector clocks pay for that knowledge: a full vector of counters on every message: compare two stamps and know exactly whether one caused the other or neither did: the complete happened-before record, at O of n per message. The strategic split: timestamps when you just need AN order: mutexes, log sequencing: vector clocks when concurrent-versus-caused is the actual question: conflict detection in replicated databases: and the snapshot when the question is about the whole system at once.',
  },
  {
    section: 'tradeoffs',
    text:
      'The fourth relative is the live Raft unit, and the contrast teaches the most. A replicated state machine under consensus snapshots trivially: everyone already agrees on the log order, so photograph any prefix: done: that is Raft’s log compaction. But that ease was bought with quorums, leaders, and elections: the whole consensus machinery. Chandy-Lamport photographs systems that never agreed on an order at all: no leader, no quorum, just channels and causality: which is why it costs only a marker flood. The honest limits: FIFO channels are load-bearing: on reordering transports the squeegee leaks, and real systems layer sequence numbers to restore the discipline. The photo is causal, not chronological: it answers could-have-been, never what-was-at-noon. And crashes mid-protocol need heavier checkpointing machinery: this page’s processes are mortal in balance but immortal in protocol.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: the wall-clock cut. Synchronize everything with N T P, read every node at exactly three o’clock, call it a snapshot: the naive photographer with better equipment and the same disease. The measurement stands: the staggered audit missed the invariant three hundred times out of three hundred: and sharper clocks do not fix it, for two separate reasons. First, the in-flight messages: no set of process-local readings, however simultaneous, can see money that is currently in a channel: the channel accounting IS the algorithm. Second, simultaneity itself: N T P skew, garbage-collection pauses, and network delay smear any instant across milliseconds, and in those milliseconds the system moves. Every individual reading in the naive audit was true. The composite was false. The failure lives BETWEEN the readings: and that is the deepest sentence in distributed systems. Cut along causality and the books balance exactly. Cut along a clock and you audit a world that never existed.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a small honest world. A FIFO-channel token simulator: six banks, random transfers, random delivery interleavings: with the snapshot protocol inside it: first-marker recording, channel windows, marker accounting: and a message-level history so causality itself can be audited. The self test asserts: three hundred runs, snapshot totals equal to one hundred thousand exactly, every run, with the in-flight catches counted: the naive staggered audit wrong on all three hundred of the same storms: zero causal violations: every receive inside the cut matched by its send inside the cut: and termination exact: thirty markers, all processes photographed, all channels closed. When it prints O K, you have watched a dinner-table algorithm from nineteen eighty five do the impossible-sounding thing it has done ever since: photograph a river without stopping the water.',
  },
];
