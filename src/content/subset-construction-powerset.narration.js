// The spoken lesson for puzzle eighty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty seven: the subset construction, paired with powerset determinization, for turning a nondeterministic automaton into a deterministic one. Here is the puzzle. A nondeterministic machine is allowed to guess: on the same input it may have many possible futures at once, and it accepts if any one of them works out. Real hardware and real scanners cannot guess. The job is a machine with no choices at all that accepts exactly the same strings. The idea: the set of states the guessing machine could be in is itself a single, definite thing: so make each set a state. The referee is exhaustion: on two hundred fifty random automata, heavy with epsilon moves, the built machine must agree with direct frontier simulation on every one of the two thousand forty seven strings of length up to ten: over half a million checks: plus twenty thousand longer strings. And the famous exponential blowup is not recited here: it is measured, and then proven minimal.',
  },
  {
    section: 'origins',
    text:
      'Michael Rabin and Dana Scott, nineteen fifty nine, in the I B M Journal: the paper that invented nondeterminism as a proof device, and tamed it in the same stroke. Any machine that guesses can be simulated by one that tracks every guess at once, because the set of live states is itself a state. That one page of mathematics earned the nineteen seventy six Turing Award. It also became the engine room of practical computing: Ken Thompson’s nineteen sixty eight regular expression compiler feeds it, grep descends from it, and the modern guaranteed linear engines: R E two, Rust’s regex crate: stake their entire no pathology promise on exactly this construction, run lazily. Determinize, and matching becomes one table lookup per character. Forever.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the construction. The deterministic start state is the epsilon closure of the nondeterministic start: everything reachable for free before reading anything. To step a subset on a symbol: apply the nondeterministic transition to every member, union the results, and close under epsilon again. A subset accepts exactly when it contains an accepting member. The invariant is the whole proof: after reading any string, the subset you hold is exactly the set of states the guessing machine could occupy on that string: nothing forgotten, nothing invented: and the referee checked that equivalence over half a million times. The heuristic is the laziness: of the two to the n subsets that could exist, materialize only the ones the start state actually reaches. Measured on sparse sixteen state machines: a mean of twelve subsets built, out of sixty five thousand five hundred thirty six possible: five thousand times never constructed.',
  },
  {
    section: 'picture',
    text:
      'A detective follows a suspect who might have taken any of several routes. The amateur picks one route and runs it: dead end: backtracks, runs the next: on a bad map he revisits the same corners exponentially often. The professional stands at a whiteboard and tracks the set of everywhere the suspect could be right now. Each new clue updates the whole set at once: some possibilities die, new ones open: and the state of the board after each clue is one definite thing, no matter how many maybes it contains. The set of maybes is itself a certainty. That is the entire construction. Nondeterminism on the street: one deterministic whiteboard in the office: and the price, sometimes, is a whiteboard big enough to show two to the n different sets.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Close: compute the epsilon closure of the start: that subset is state one of the new machine. Explore: for each discovered subset and each symbol, step every member, union, close: the union is the successor: if it is new, queue it. Accept by membership. Build lazily: breadth first from the start, so only reachable subsets ever exist. On this page, the kind case and the cruel case are both run. Kind: sparse sixteen state machines touch a dozen subsets. Cruel: the language, the n-th symbol from the end is a: its guessing machine has n plus one states: state zero loops forever and guesses which a matters: and its deterministic machine needs every one of the two to the n subsets, because it must remember the last n symbols exactly. The construction reaches exactly two to the n states, for n three through fourteen: and a Moore refinement pass then proves that not one of those states is redundant, through one thousand twenty four states at n equals ten. The lower bound is not folklore here. It ran.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: scan heavy, guess shaped problems: lexers, regex engines, protocol matchers, anything that reads untrusted bytes fast: build the table once, then one lookup per character for the rest of time. Second: predictable latency is a requirement, not a preference. The deterministic machine’s per character cost is constant by construction: that is the property the guaranteed linear engines sell, and the reason they exist. Third, and widest: the frontier is the state. Whenever a set of live possibilities can be carried as one value: belief states in planning, the trellis in Viterbi decoding, candidate sets in search: naming the uncertainty turns it into data, and the subset construction is the purest form of that move.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, which are mostly teammates in one pipeline. Thompson’s construction is the front half: regular expression to nondeterministic automaton, in linear size, one little box per operator: but its output still guesses, riddled with epsilon moves, useless for fast scanning until this page’s stage names the frontiers. Hopcroft’s minimization is the back half: partition refinement that collapses equivalent states in n log n time: this page’s Moore check is its slower sibling: and it shrinks real lexer tables substantially. But minimization is not magic: on the blowup family it hands back exactly two to the n states, because that is what the language costs. The pipeline is: regex, Thompson, subset construction, Hopcroft, table: four names, one artifact.',
  },
  {
    section: 'tradeoffs',
    text:
      'The genuinely different road is Brzozowski derivatives: skip automata entirely and differentiate the regular expression itself with respect to each character read: the derivative is a new expression matching what may follow. Elegant, allocation light, and beloved in functional settings: it also handles complement and intersection operators that nondeterministic machines treat awkwardly. Memoize the derivatives and the same minimal deterministic machine appears: which is the theorem whispering that the two to the n wall does not care how you spell the construction. And plain frontier simulation: this page’s referee: deserves respect as a rival too: linear time, no table, no blowup ever: it simply re-pays the set union work on every single run, one point four states touched per character on the scanner client against the table’s exactly one.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: a backtracking regex engine on untrusted input. The amateur detective, shipped to production. Backtracking engines explore one guess at a time, and on pathological patterns they revisit exponentially many paths that the frontier would have merged into a single subset. This is not a theoretical worry. It has a name: ReDoS: regular expression denial of service: and a famous casualty: catastrophic backtracking took Cloudflare down globally in twenty nineteen. The subset idea is the immunity, not just an optimization: the guaranteed linear engines were built for exactly this reason. Feeding attacker controlled strings to a backtracking matcher is handing strangers the exponent. The frontier merges guesses. The backtracker relives them, one at a time, all two to the n of them.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole pipeline in miniature. Epsilon closure by depth first search. Frontier simulation: the referee. The lazy subset construction: breadth first over reachable subsets only. Moore partition refinement, to certify minimality. The blowup family generator, and a keyword scanner built as a guessing machine and determinized. The self test asserts: over half a million exhaustive short string agreements plus twenty thousand long: exactly two to the n reachable states for the blowup family, Moore verified minimal through n equals ten: the laziness dividend above one hundred fold, measured at five thousand: and the scanner agreeing with Python’s own substring search on all five thousand strings, at exactly one transition per character. When it prints O K, the theorem has been run at both of its edges: the kind one, and the cruel one.',
  },
];
