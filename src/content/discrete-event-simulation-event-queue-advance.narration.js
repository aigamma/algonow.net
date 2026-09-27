// The spoken lesson for puzzle one hundred thirty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty six: discrete event simulation, paired with event-queue advance, for systems modeling. Here is the puzzle. A single server. Customers arrive at random, on average point eight per unit of time, and take random service times, on average one. How many customers are in the system on average? How long does each spend there? How often is the server idle? And then the same questions for a server whose service time is exactly one. The method: keep the state, who is in service and who is waiting, and a calendar of pending events, the next arrival and the next departure. Pop the earliest event, jump the clock to its time, update the state, schedule whatever that event causes, and repeat. The heuristic is the clock: it jumps straight to the next event, and nothing at all is computed for the time in between. On this page the simulator is held to the exact queueing formulas, to Little’s law inside its own run, and to the ablation everyone writes first: a clock that ticks in fixed slots.',
  },
  {
    section: 'origins',
    text:
      'Keith Tocher’s General Simulation Program of nineteen sixty, written for the British steel industry, is usually counted the first discrete event simulator. Geoffrey Gordon’s GPSS at IBM in nineteen sixty one made the event scheduling worldview a language; Markowitz, Hausner, and Karr’s SIMSCRIPT at RAND followed in nineteen sixty two; and Dahl and Nygaard’s SIMULA, between nineteen sixty two and sixty seven, invented classes and objects to model the entities in a simulation, which is how object oriented programming was born as a side effect of queueing models. Little proved his law in nineteen sixty one. Kendall’s notation from nineteen fifty three and the Pollaczek and Khinchine formula from nineteen thirty supply the exact answers this page checks against. The calendar itself became a data structures problem: Vaucher and Duval compared event lists in nineteen seventy five, and Randy Brown’s calendar queue of nineteen eighty eight made the next event operation constant time on average. SimPy, Arena, and AnyLogic run the same loop today.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the state machine. An arrival adds a customer and either starts service or joins the queue. A departure frees the server and starts the next in line. Each event schedules the ones it causes. Measured against the exact formulas for the memoryless queue, over two hundred thousand customers: a mean of three point nine four customers in the system where the formula says four; a mean time of four point nine three five where it says five; an idle fraction of point two zero two where it says point two. Little’s law, computed two independent ways inside the same run, the time average of the count and the arrival rate times the customer average of the time, agrees to four decimals. Change one line, a deterministic service time, and the same loop lands within a fifth of a percent of the Pollaczek and Khinchine formula: two point three nine five against two point four. The heuristic supplies the clock: a priority queue of pending events, and the clock jumps to the earliest. Every unit of simulated time costs exactly as many steps as it has events: four hundred thousand events for four hundred thousand state changes, in nondecreasing time order, with zero violations. The ablation advances the clock in fixed slots and checks for events inside each one. With a slot of one hundredth, it takes two and a half million steps for a horizon the calendar covers in forty thousand, sixty two times the work, for a mean three percent off. With a slot of one tenth, it takes two hundred fifty thousand steps and lands sixteen percent off, because two events inside one slot are resolved at the slot’s end in a fixed order, which delays departures and inflates the queue. The calendar has no slot. It pays nothing for empty time and never reorders.',
  },
  {
    section: 'picture',
    text:
      'A night dispatcher who sleeps between calls. The naive dispatcher sets an alarm for every minute, wakes, checks whether anything happened, and goes back to sleep. Most alarms find nothing, and when two things happen in the same minute they are logged in whatever order the checklist reads, at the minute’s end. The event dispatcher keeps a list of what is scheduled, a truck due at two seventeen, a shift ending at three oh five, and sets one alarm for the earliest. When it rings, the clock is set to that moment exactly, the event is handled, anything it triggers is added to the list, and the alarm is reset for the new earliest. A quiet night costs no wakeups. A busy one costs one per event. Nothing is ever handled late or out of order.',
  },
  {
    section: 'run',
    text:
      'Here is the run. The calendar is a heap of events, each with a time, a sequence number to break ties, and a kind; it is seeded with the first arrival. Pop the earliest event, advance the clock to its time, and accumulate the time weighted state on the way. Handle it: an arrival joins the queue or starts service, schedules the next arrival, and if it started service, schedules its own departure; a departure starts the next customer in line or leaves the server idle. Repeat until two hundred thousand customers have left: four hundred thousand events, and the clock never runs backwards. On this page: the memoryless queue, within one and a half percent of its formulas. Little’s law inside the run, to four decimals. The slot clock at one tenth: two hundred fifty thousand steps, sixteen percent off. The slot clock at one hundredth: two and a half million steps, three percent off, sixty two times the calendar’s forty thousand for the same horizon. And the deterministic server, within a fifth of a percent of Pollaczek and Khinchine, from the same loop with one line changed.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the state changes at instants, not continuously. Arrivals, departures, failures, packets, jobs; nothing happens between events, so nothing should be computed there. Second: sparse events in long time. The calendar costs per event and the slot clock per unit of time, and the gap between them is the idle fraction times the number of slots. Third: no closed form. The memoryless queue has one, which is why it is the referee here; a network of queues with priorities, breakdowns, and general service times does not, and the same loop handles it.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Markov chain simulation: the same randomness as a chain of states, jumping or uniformized, which gives the memoryless queue’s numbers without a calendar. It needs memoryless timing; the deterministic server is not a Markov chain in the customer count. Reach for it with exponential holding times and a small enough state space. Mean value analysis: exact mean queue lengths and times for closed product form networks, with no sampling at all. It holds only under the product form assumptions, no priorities, no breakdowns, no general service times; reach for it for closed networks of exponential servers where those hold. And Jackson network analysis: open networks of memoryless nodes decompose exactly, each node priced alone with one formula. Poisson routing and exponential service or nothing; reach for it to size an open network before a simulation is worth building.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. It gives statistics, not answers: two hundred thousand customers to get within one and a half percent, ten times more for a third of that error, and a warm up transient to discard. Continuous dynamics, a tank draining between events, need a hybrid. Dense events, every packet in a data center, push the calendar itself, which is why calendar queues and time warp exist. And the model is only as right as its distributions: a simulator of a queue that does not exist is exact about nothing.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: fixed increment time advance for sparse events. Measured on the same queue and the same horizon: two and a half million steps at a slot of one hundredth, where the calendar took forty thousand, for a mean still three percent off; and at a slot of one tenth, a tenth of that work with the mean sixteen percent wrong, because two events in one slot are merged at the slot’s end in a fixed order, which delays every departure that shared a slot with an arrival. The slot clock pays for empty time and gets the busy time wrong, and the finer you make it, the more it pays. The calendar pays per event and is exact.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the simulator, the slot clock, and the formulas. The event calendar simulation on a heap, returning the time average of the count, the customer average of the time, the idle fraction, the event count, the order violations, and the horizon. The fixed increment simulation, with its slot ends computed rather than accumulated so rounding cannot add or drop a slot. The exact memoryless formulas and the Pollaczek and Khinchine formula. The self test asserts: the count, the time, and the idle fraction within three percent of the formulas; Little’s law inside the run to half a percent; zero calendar order violations and exactly two events per customer; the slot clock at exactly two hundred fifty thousand and two and a half million steps, more than fifty times the calendar’s for the same horizon; and the deterministic server within three percent of Pollaczek and Khinchine. When it prints O K, the loop inside every factory, network, and hospital simulator has been held to the one queue whose answer is known exactly. The file would fail before it would lie to you.',
  },
];
