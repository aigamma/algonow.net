// The spoken lesson for puzzle sixty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty two: Mo’s algorithm, paired with sqrt block query ordering, for offline range queries. Here is the puzzle. An array, and nine hundred range queries known in advance: count the distinct values between positions l and r. This query has a cruel property: it does not decompose. Knowing the distinct count of two halves tells you almost nothing about their union, so the segment tree’s door is closed. What you do have is a window: two pointers with constant time add and remove, a frequency table, a running count. Any query is reachable by sliding the ends. The entire remaining freedom is the order you visit the queries in: and the meter on this page counts every single pointer move, exactly, for six different orders through the same machinery, while a brute force recount referees every answer.',
  },
  {
    section: 'origins',
    text:
      'A rare thing on this site: an algorithm with no paper. Mo’s algorithm is competitive programming folklore, named for Mo Tao, who popularized it in Chinese olympiad circles around twenty ten; it spread worldwide through Codeforces blog posts and the cp algorithms reference. The underlying move is genuinely novel: square root decomposition applied not to the data, but to the query schedule. The Hilbert curve refinement raced on this page is its second generation folklore, discovered the same way: by contestants timing their submissions. Provenance this informal deserves honest labeling, so this page treats the measurements as the citation: six orderings, one meter, every answer checked.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the two pointer window. Maintain the current range with constant time add and remove: a frequency table, and a distinct counter that ticks up when a value’s count leaves zero and down when it returns. The machinery is identical in every race on this page, and every ordering produced exactly the same nine hundred answers, asserted against the brute force referee. Only the bill changed. The heuristic supplies the schedule: sort the queries by left endpoint’s block: blocks square root of n wide: and within a block, by right endpoint. Now the right pointer sweeps monotonically across each block, never doubling back: n moves per block: while the left pointer is caged, jittering at most a block width per query. Total: n squared over the block size, plus q times the block size. Measured: four hundred eleven thousand moves at the folklore block, against three million sixty thousand for random order. Seven point four to one, from sorting.',
  },
  {
    section: 'picture',
    text:
      'Picture a librarian with one cart who must fetch hundreds of shelf ranges. The cart cannot teleport: it rolls left or right, picking up or shelving one book at a time. Serve the requests in arrival order, and the cart crisscrosses the building all day. Mo’s insight is a dispatcher’s insight: batch by neighborhood. Chop the left ends into districts, square root of n shelves wide. Within one district, serve requests in right end order, so the cart’s far edge rolls steadily forward, never retreating, until the district is done. The snake refinement alternates direction district by district, so the far edge never resets either. And the Hilbert refinement abolishes districts entirely: it drives the cart along one space filling curve through the plane of requests. Same requests, same cart, same books: the schedule is the algorithm.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Build the window: add and remove maintain the frequency table and the distinct count in constant time. Order the queries: left block, then right endpoint. Slide the window query to query, reading answers off the counter. Then take the free refinements, all measured here: snake the right direction on odd blocks: two hundred forty one thousand moves, a one point seven times saving, because the sweep never returns to the block’s start. Or order by Hilbert curve position: one hundred fifty four thousand moves, the best on the page. And tune the dial honestly: the folklore block, square root of n, is calibrated for q close to n. With nine hundred queries on six thousand elements, the true balance point is n over the square root of q: block two hundred: which cut the moves by a measured forty four percent.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the query has no merge: distinct count, mode, how many values appear exactly k times: anything where two half answers refuse to combine: the segment tree and its cousins are simply unavailable, and this schedule is the escape. Second, offline is acceptable: all the queries are known up front and the answers may be computed in any order: a batch report, an analytics pass, a contest problem. Third, the sizes sit in the honest middle: tens of thousands to a million, where n plus q times root n comfortably beats recounting, and the heavyweight online alternatives cost more memory and code than the batch is worth.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one meter, six orderings, and a nineteen point eight to one spread with identical answers. Every ordering was asserted equal to the brute force recount, so the entire difference: three million down to one hundred fifty four thousand: is purely the visiting order. The sqrt block schedule landed inside its theory bound. The snake saved another one point seven times for one line of code. The Hilbert curve, with no blocks at all, took the crown. And the block dial was measured rather than recited: too narrow thrashes the right pointer, too wide thrashes the left, and the U shape brackets a real optimum. The weakness: strictly offline, allergic to updates, and the folklore dial lies. One online query, or one insertion into the array, breaks the frame: the whole schedule assumes a frozen world. And square root of n is the right block only when q is near n: here, with q far below n, the true balance point cut the folklore’s bill by forty four percent. Tune the block to the workload, not to the slogan.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the contest, nine hundred distinct count queries on six thousand elements, every ordering answering identically. Random order: three million sixty thousand moves: both pointers thrash a third of the array per query. Sorted by left endpoint only: nine hundred twenty seven thousand: the left pointer is monotone but the right resets every query. Mo’s sqrt blocks: four hundred eleven thousand: seven point four times better than random. Snake plus the tuned block: two hundred twenty nine thousand. Hilbert: one hundred fifty four thousand: nineteen point eight to one. The rivals mark the borders. The segment tree, a live unit here, answers any decomposable query online in logarithmic time with updates welcome: when a merge exists, it wins outright. Sqrt decomposition applies the same root n instinct to the data instead of the schedule: online, updatable, but it too needs a merge. And the persistent segment tree is the online heavyweight for distinct in range: version per prefix, logarithmic queries, n log n memory: the price of refusing to batch.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is Mo’s on a decomposable query. If two half answers combine: sum, minimum, maximum, greatest common divisor: the segment tree answers online, in logarithmic time per query, absorbing updates as they come. Reaching for Mo’s there trades an eighteen line tree for a batch pass that is asymptotically worse per query: root n against log n: cannot absorb a single update, and must re sort the world when one more query arrives. Mo’s algorithm exists for the queries the tree cannot express. Using it where the tree is fluent is paying the schedule’s rigidity and getting nothing back. The test is one question: do the half answers merge? If yes, build the tree. If no: distinct, mode, majority in a range: batch the queries and slide the window.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the window with move counting, the block schedule with the optional snake, and the Hilbert curve key, plus a brute force recount as the referee. The self test asserts, in order: all six orderings produce answers identical to the recount on every one of the nine hundred queries. The sqrt block schedule under half of both random order and sorted by left, and inside its theory bound of two times n squared over b plus q b plus n. The snake strictly under plain blocks, and Hilbert strictly under plain blocks. And the dial’s U shape, measured at four block sizes: eight hundred eighty thousand at ten, four hundred eleven at the folklore root n, two hundred twenty nine at n over root q, five hundred nineteen at two thousand: with the tuned block asserted strictly cheaper than the folklore. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
