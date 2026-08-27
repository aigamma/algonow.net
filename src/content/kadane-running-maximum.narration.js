// The spoken lesson for puzzle thirteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirteen: Kadane’s algorithm, paired with the running maximum, for the maximum subarray problem. Here is the puzzle. You are given an array of n numbers, positive and negative freely mixed. Your task is to find the contiguous run with the largest total, and to report exactly where it sits. Contiguous is the whole game: you may not pick and choose elements, you take an unbroken stretch or nothing. And one more clause that sounds small and is not: at least one element must be taken. So an array that is entirely negative still has a real answer, namely its largest single element. Hold that clause; it is where careless implementations go wrong.',
  },
  {
    section: 'origins',
    text:
      'The problem has one of the best documented origin stories in the field, thanks to Jon Bentley. In nineteen seventy seven the statistician Ulf Grenander posed it at Brown University, as the one dimensional core of a pattern detection task: find the brightest region in a digitized image. His method ran in time proportional to n squared. Michael Shamos heard the problem and built the n log n divide and conquer solution in a single night. Then in nineteen eighty four, Shamos presented the problem at a Carnegie Mellon seminar, and a statistician in the audience, Jay Kadane, sketched the linear time solution in under a minute. One pass, two numbers of state, provably optimal. Bentley published the whole arms race in his Programming Pearls column that September, and the one minute algorithm has carried Kadane’s name ever since. Let that timeline teach its own lesson: the fastest solution was not found by the best algorithm designer in the room; it was found by the person who asked what the smallest sufficient state was.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the state design. Every candidate window ends somewhere. So it is enough to know, at each position, one number: the best sum of a run ending exactly here. Take the maximum of that quantity over all positions and you have covered every candidate window without enumerating any of them. That is dynamic programming with the smallest state that still covers the whole candidate space: not a table, one number. The heuristic owns the update that makes the one number sufficient: extend or restart. The best run ending here is either the best run ending at the previous element, extended by this element, or this element alone, starting fresh. Take whichever is larger. And the reason restarting is safe is a single inequality: any window that drags a negative prefix along scores exactly the fresh window’s sum plus a negative number. It loses now, and it loses on every future extension. Dead weight stays dead.',
  },
  {
    section: 'picture',
    text:
      'Picture a year of daily gains and losses, and you want to know the best stretch you ever had. Walk the year once, with two numbers in your pocket. The first is how the current stretch is going. The second is the best stretch you have ever seen. Each morning there is exactly one decision: is yesterday’s momentum an asset or baggage? If the running total of the current stretch is still positive, carry it forward, it can only help. The moment it goes negative, drop it and let today begin a fresh stretch, because any future stretch would be strictly better without that debt. When the walk ends, the answer is already in your pocket. You never looked back, you never compared stretches side by side, and you never wrote anything down beyond those two numbers.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, seed both numbers with the first element: the current run is it, the best is it, and the run starts at index zero. Second, at each new element x, decide extend or restart: if the current run is negative, restart at x and remember this index as the new start; otherwise extend the run by x. Third, if the run now beats the best, record the run as the new best, together with its start index and the current index; those two indices are the witness, and they fall out of the same pass for free. Fourth, when the pass ends, the best and its interval are the final answer. There is no second pass and no table. And fifth, the convention: because the rule always takes at least the current element, an all negative array answers with its largest element, never with an imaginary empty run worth zero.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the array is static and the question is one shot; if elements keep changing and the answer must stay current, the segment tree in the trade offs section is the right tool, and the measurements show exactly when. Second, you need the location as well as the value, and this pass produces the witness indices at no extra cost. Third, memory is constant, so the same loop runs over a stream too large to store: telemetry, tick data, sensor feeds. If you can only read the data once and remember almost nothing, this is one of the few optimization problems you can still solve exactly.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: provably unbeatable, and the proof is made structural rather than rhetorical. Any correct method must read every element at least once, since an unread element could have been the answer. Kadane reads each element exactly once: the tested solution asserts that its work counter equals n, exactly, not approximately. Constant memory, streaming ready, witness included. The weakness: it knows nothing the moment the data moves. Change one element and the scan must start over. Under two thousand point updates, each demanding a fresh whole array answer, the rescan bill is eight million reads, while a segment tree pays thirty three thousand nine hundred thirty six node merges: two hundred thirty six times less. And the contiguity premise is load bearing: if you are ever allowed to skip elements, the problem changes species, and the answer becomes simply the sum of the positive elements.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, counting element reads plus tree node merges so every method pays in one currency. One shot at four thousand elements: Kadane, four thousand reads, exactly n. Divide and conquer, fifty one thousand nine hundred four, thirteen times more, and the number is not an indictment, because that formulation is the one that parallelizes: its merge of total, best, prefix, and suffix is associative, which is how the problem map reduces across shards. The segment tree, seven thousand nine hundred ninety nine, about double Kadane, paid once at build time. And brute force, every window by running sums: eight million two thousand, two thousand times Kadane, which is the definition being priced rather than a method being recommended. One shot at three hundred thousand elements: Kadane three hundred thousand, exactly n again; divide and conquer five million seven hundred seventy five thousand seven hundred twelve; brute force would be forty five billion and was not run. Then the workload flips: two thousand point updates, a fresh answer after each. Kadane can only rescan: eight million reads. The segment tree repairs one path per update and reads its root: thirty three thousand nine hundred thirty six. Two hundred thirty six to one. Same problem, opposite winner, and the deciding question is simply whether the data moves.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is the interval table: the reflex that says this is an optimization problem, so allocate a dynamic programming table over every start and end pair. That table has n squared over two cells, eight million at four thousand elements, and filling it is brute force wearing a DP costume. The lesson cuts deeper than one problem: the art of dynamic programming is state design, not table allocation. Kadane IS dynamic programming here, with a state of one number and a transition of one max. When the state genuinely cannot shrink, edit distances, parse tables, shortest paths with structure, the table earns its memory. Here it never does, and reaching for it costs a factor of two thousand.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries all four methods. Kadane is nine lines with index tracking. Brute force is the executable definition and serves as the oracle. Divide and conquer returns the best of left, right, and crossing, where the crossing case is two greedy scans outward from the split. The segment tree stores four numbers per node, total, best, prefix, suffix, merged associatively, with point updates repairing one root to leaf path. The self test asserts five things. All four methods agree with the brute force definition across four hundred seven cases, including all negative arrays, single elements, and constant arrays, and every reported witness interval is re-summed independently and must achieve its method’s value, which also handles ties gracefully. The all negative convention is pinned: the answer to minus three, minus one, minus four is minus one, not zero. Kadane’s read counter equals n exactly, making the optimality claim structural. After each of three hundred random point updates, the tree’s root equals a fresh full rescan. And the published contest regenerates with its orderings asserted, so if any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
