// The spoken lesson for puzzle forty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty three: Hopcroft Karp, paired with layered augmenting phases, for bipartite matching. Here is the puzzle. A bipartite graph: workers and jobs, students and course slots, servers and requests. Find a maximum matching, in E times root V time. And not just a big matching: a certified one. Every answer on this page ships with the other side of a duality: a vertex cover of exactly the matching’s size, constructed from the algorithm’s own final search, and checked against every single edge. When the cover and the matching agree, neither can be improved, and you know it without trusting anyone.',
  },
  {
    section: 'origins',
    text:
      'John Hopcroft and Richard Karp published the root V phase bound in nineteen seventy three, with Karzanov arriving at it independently the same year, and it stood as the matching speed record for decades. The deeper spine is older. Berge’s lemma, nineteen fifty seven: a matching with no augmenting path is maximum. And König’s theorem, nineteen thirty one: in bipartite graphs, the maximum matching and the minimum vertex cover have the same size: the duality this page uses as its referee. The algorithm is also a family reunion for this site: run Dinic’s blocking flow method, a live unit here, on the unit capacity bipartite network, and Hopcroft Karp is exactly what falls out.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns augmentation. An alternating path starts at a free left vertex, walks an unmatched edge, then a matched edge, then unmatched, and ends at a free right vertex. Flip every edge along it, and the matching grows by one. Berge’s lemma says a matching admitting no such path is maximum, so augmentation is complete as well as sound. Augmenting one path per search is Kuhn’s algorithm, the V times E baseline: measured here at one point seven eight million edge touches, correct, and six point three times the price. The heuristic supplies the phase batch. One breadth first search, from all free left vertices at once, layers the entire graph by shortest alternating distance. One depth first search then harvests a maximal set of vertex disjoint shortest augmenting paths, and the whole batch flips at once. Between phases, the shortest augmenting length strictly grows, and after root V phases fewer than root V augmentations can remain: at most about two root V phases, asserted. The measured graph needed four, against a permitted two hundred.',
  },
  {
    section: 'picture',
    text:
      'Picture a job fair at closing time. Matching one candidate at a time means re walking the entire hall for each placement: that is the patient shuttle, and it works, slowly. The phase trick runs the hall like a tide. Announce: everyone still unplaced, one step forward. A whole wave of reassignment chains resolves at once, each chain the shortest available: this candidate takes that job, whose previous holder slides over to the next job, ending at a position nobody had filled. The chains in one wave never share a person or a post, so they all resolve together without conflict. Each successive wave has to reach farther than the last, and the theorem says the fair closes after about root V waves, not V of them.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Breadth first search from every free left vertex simultaneously, layering the graph by alternating distance: unmatched edges travel rightward, matched edges travel leftward. Stop the layering at the first layer containing a free right vertex: that depth is this phase’s shortest augmenting length. Then depth first search inside the layers, harvesting vertex disjoint shortest augmenting paths greedily until the layering yields no more. Flip the whole batch: the matching grows by the batch size. Repeat until a breadth first search finds no free right vertex at all. And then do not throw that failed search away: the set of vertices it reached, combined with the ones it could not, IS König’s minimum vertex cover. The certificate of optimality falls out of the stopping condition for free.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, assignment without weights: the question is whether everyone can be placed, not at what price: server request affinities, course slots, crew rosters. Second, scale where V times E hurts: on graphs with millions of edges, the root V phase bound is the difference between seconds and hours. Third, you need the certificate: the König cover, or equivalently the Hall violator set, is the explanation: it names the bottleneck. On this page, ten left vertices squeezed into three shared neighbors matched exactly five, and the cover said precisely why.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: a root V theorem, and answers that carry their own proof. Four phases where two hundred were permitted. Every matching on this page, three hundred small trials and the fifty thousand edge instance, certified by a constructed König cover that touches every edge, asserted edge by edge. The Hall violation gadget diagnosed exactly. Berge, König, and Hall, all load bearing in one working file. The weakness: bipartite only, cardinality only. General graphs have odd cycles that break the layering; they need Edmonds’ blossom machinery. Weighted assignment needs the Hungarian algorithm or auction methods: the moment jobs carry values, this page’s tool answers the wrong question, which is the same boundary the activity selection unit drew between counting and value. And on benign random graphs the measured gap over Kuhn is six point three times, not the worst case: the batch pays off most exactly where the inputs are structured against you.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: five thousand plus five thousand vertices, fifty thousand random edges. Hopcroft Karp: two hundred seventy nine thousand, eight hundred eighty six edge touches, matching four thousand nine hundred ninety nine, in four phases against a permitted two hundred. Kuhn, one path at a time: one million, seven hundred seventy six thousand and thirty edge touches: the same matching, asserted equal, at six point three times the touches. Greedy, with no augmenting at all: four thousand six hundred fifty nine: ninety three point two percent of maximum here, at essentially one pass over the edges. And behind every row, the referee: a vertex cover of four thousand nine hundred ninety nine vertices, constructed from the final search, verified to touch all fifty thousand edges, one by one. The cover is what turns, we found no more paths, into, no more paths exist.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is greedy matching as the final answer, and the honesty cuts both ways. Take any available edge is a fine heuristic: a maximal matching is provably at least half of maximum, and on the random instance it scored ninety three percent. But the P three gadget pins it to exactly fifty percent, by construction: five hundred small chains in which grabbing the first edge blocks both completions, scoring five hundred where a thousand existed. And the failure mode is silent: greedy returns a plausible number with no indication that augmenting paths were left on the table. The rule is one sentence: if the answer matters, augment; and if you must know the answer is right, demand the cover. An optimum without a certificate is a claim; with one, it is a fact.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Hopcroft Karp with the layered breadth first search, the batch depth first harvest, and an edge touch counter; Kuhn’s single path augmenter; the greedy maximal matcher; an exhaustive brute force for small graphs; and the König cover constructor. The self test asserts, in order: on three hundred small random graphs, Hopcroft Karp equals Kuhn equals brute force, and each answer’s König cover has exactly the matching’s size and touches every edge. The constructed Hall violation matches exactly five, three plus one plus one. At scale, the phase count stays within twice root V, the cover is verified against all fifty thousand edges individually, Kuhn agrees at six point three times the touches, and greedy respects its half bound while the P three gadget pins it to equality. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
