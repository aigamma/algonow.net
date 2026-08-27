// The spoken lesson for puzzle seventeen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventeen: L R U caching, paired with least recently used eviction, for the page replacement problem. Here is the puzzle. You hold a cache of k items, and requests arrive one at a time, forever. A request for something you hold is a hit, served instantly. A request for something you lack is a miss: you must fetch it, and if the cache is full, something resident has to die to make room. Your task is to choose the victims so that hits are maximized over the whole stream. The constraint is the word online: you see the past, never the future, every eviction is final, and the adversary writing the request stream has read your policy before writing it.',
  },
  {
    section: 'origins',
    text:
      'IBM Research, nineteen sixty six. Laszlo Belady, studying paging for virtual memory machines, catalogs the replacement policies of the day and describes the unbeatable one: evict whatever will be needed farthest in the future. No machine can run it, because it consumes the future, but it gives every real policy a ceiling to be measured against, and this lesson uses it exactly that way. Three years later Belady found the anomaly that carries his name: first in first out eviction can take more page faults when you give it more memory. Then in nineteen eighty five, Sleator and Tarjan invented competitive analysis on precisely this problem, proving that L R U’s cost is at most k times the clairvoyant’s, and that no deterministic online policy can beat that bound. The entire theory of online algorithms was born in the coat check room this lesson is about to visit.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the online discipline: serve a hit, fetch a miss, evict only when full, never revisit a decision. Implemented as a hash map over a doubly linked list, every operation is constant time, which is why this exact structure lives in kernels, databases, content networks, and half of all coding interviews. Notice that the framework is policy agnostic. It holds one socket open, for one question: who dies? The heuristic plugs into that socket with recency: evict the least recently used resident. That is a bet about the world, called temporal locality: what was touched recently will be touched again soon, so the coldest resident by recency has the least promising future. The bet comes with two certificates. No deterministic online policy has a better worst case guarantee. And L R U has the stack property: at every instant, the contents of a k slot cache are a subset of the contents of a k plus one slot cache, so adding memory can never, ever hurt. The tested solution does not cite that property; it asserts it, step by step, across thirty thousand requests.',
  },
  {
    section: 'picture',
    text:
      'Picture a coat check room with sixty four hooks at a party of a thousand coats. Whenever a coat is requested that is not hanging, some hanging coat must be sent to deep storage in the basement. The recency clerk’s rule is simple: the coat untouched longest goes downstairs. Most nights this is brilliant, because parties have regulars: the same dozen guests keep stepping out for air and coming back, and their coats never leave the hooks. Then one night the conga line forms: eighty guests file past the counter in strict rotation, again and again. Now watch the disaster in slow motion: the clerk ships each coat to the basement moments before its owner comes back around, every single time, all night long. Not one hit. The clerk is not stupid. The conga line is simply the exact inverse of the recency bet: on that pattern, the thing touched longest ago is precisely the thing needed soonest.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. On a hit: serve the item, and move it to the most recent end of the recency list. That single touch is the entire bookkeeping, and it is what separates L R U from first in first out. On a miss with room to spare: fetch and insert at the most recent end. On a miss with a full cache: evict the item at the least recent end, then insert the newcomer. With a hash map pointing into a doubly linked list, each of those steps is constant time. And the discipline that makes it online: the policy reads nothing but the order of past touches. No frequencies, no future, no hints. From that ordering alone comes the stack property, because the k most recently touched items are always a prefix of the k plus one most recently touched items.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, reuse in your workload is driven by temporal locality: working sets, user sessions, hot keys, loops over small data. That is most real systems, most of the time, which is why L R U is the default answer. Second, the workload drifts: this hour’s hot set is not last week’s. Recency forgets at exactly the speed the world changes, and the measurements will show the frequency based rival punished brutally for remembering too well. Third, you need constant time per request and an eviction rule you can reason about when an adversary, or a batch job, starts hammering the cache.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: a guarantee, a monotonicity, and constant time. Sleator and Tarjan’s theorem says no deterministic online policy beats L R U’s worst case; the stack property says growing the cache monotonically helps, a sentence that sounds obvious until you meet the rival for which it is false; and the bookkeeping is one list touch per request. The weakness: two famous blind spots. The sequential scan, measured at exactly zero point zero percent in a moment, where recency predicts precisely backwards. And one hit wonders: a flood of items requested exactly once flushes the hot set on its way through. The modern fixes are hybrids: A R C balances recency against frequency adaptively, L I R S looks at reuse distance instead of raw recency, and Tiny L F U puts a frequency sketch at the admission door so cold items cannot evict warm ones. Every one of them is a response to the two measurements this page makes.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: a sixty four slot cache, one hundred thousand requests per trace, three traces. First, a stationary Zipf web trace over a thousand objects, a few hot, a long cold tail. L R U: thirty nine point six percent. First in first out: thirty four point seven, and those five points are exactly the value of re-timestamping on every touch. Random eviction: thirty four point eight. L F U, evicting by frequency: forty nine point three, the best online policy on this column, because stable fame is frequency’s home turf. And Belady’s clairvoyant: sixty two point three, the ceiling. Second trace: the same Zipf shape, but every twenty thousand requests the identities behind the ranks reshuffle, the way real popularity moves. L R U: thirty nine point six, identical, because recency forgets instantly. L F U: seventeen percent, a collapse from first place to last, because its accumulated counts keep yesterday’s celebrities resident while today’s go homeless. Memory became the disease. Third trace: the conga line, a cyclic scan of eighty items through sixty four slots. L R U: zero point zero percent. First in first out: zero. L F U: zero. Random eviction: sixty two point five percent, because no fixed pattern can be the exact inverse of luck. And the clairvoyant: seventy nine point seven, showing just how much the pattern offered to anyone who could see it coming.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is the strongest row on the table: Belady’s algorithm, as a production policy. Evict the item needed farthest in the future is not a policy; it is a definition that consumes information no online system possesses. Its real jobs are all offline. It is the measuring stick that told us L R U leaves twenty two points of headroom on the web trace, so better policies are worth hunting. It is the cache sizing oracle. And lately it is the teacher: modern learned eviction systems train predictors to imitate the clairvoyant’s offline decisions from features of the past. The moment a deployed cache claims to implement the optimum, it is describing a predictor of the future, and it should be graded like one: on its misses.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements five policies against one honest harness. L R U rides Python’s insertion ordered dictionaries: delete and reinsert on every touch keeps the least recent at the front. First in first out is a queue and a set. Random eviction is seeded. L F U evicts the minimum count, breaking ties toward least recent. And Belady precomputes, for every position in the trace, the next use of that item, then evicts whatever is needed farthest ahead. The self test earns the page’s claims in order. Belady is verified genuinely optimal by exhaustive dynamic programming over all reachable cache states on fifty small instances: the theorem, checked, not cited. Every policy passes a residency audit: a shadow simulation confirms no cache overflows and no policy ever claims a hit on an absent item. The stack property is asserted at every step: a thirty two slot L R U cache remains a subset of a thirty three slot one across thirty thousand requests. Belady’s anomaly is pinned on his own nineteen sixty nine string: nine faults for FIFO with three frames, ten with four, exactly. And the contest regenerates with every ordering asserted, so if any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
