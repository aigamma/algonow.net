// The spoken lesson for puzzle one hundred forty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred forty four: the parallel prefix sum, paired with the Blelloch scan, the data parallel primitive. Here is the puzzle. A sequence of n values and an associative operation. Produce every running total, all n of them, on a machine with as many processors as elements. Sequentially it is one pass of n operations, but the pass is a chain: each total waits for the one before it, so n processors would sit idle behind one. The method breaks the chain with a tree. The heuristic is Blelloch’s two sweep scan. Up-sweep: combine adjacent pairs into their right element, then pairs of pairs, building a balanced tree of partial totals in log n levels. Clear the root. Down-sweep: walk the tree back down, each node handing its left child the running total from the left and keeping the combined total for its right child. Every element ends up holding the total of everything before it, for twice n operations at twice log n depth. On this page every scan runs on a simulated parallel machine that records every level, the results are held to the sequential scan under three operations, one of them deliberately non commutative, and the work and depth are counted and matched to their closed forms.',
  },
  {
    section: 'origins',
    text:
      'The prefix problem is older than parallel computers. Ofman used it in nineteen sixty two for fast binary addition, and Kogge and Stone in nineteen seventy three, and Brent and Kung in nineteen eighty two, built the carry lookahead adders that still sit in every processor: log depth circuits that are prefix sums in disguise. Ladner and Fischer proved the general parallel prefix construction in nineteen eighty. Hillis and Steele gave the n log n scan for the Connection Machine in nineteen eighty six. And Guy Blelloch, in nineteen eighty nine and in his nineteen ninety report Prefix Sums and Their Applications, gave the work efficient two sweep version and argued that scan should be a primitive of the machine, as basic as addition. It became one. Harris, Sengupta, and Owens put Blelloch’s scan on the GPU in two thousand seven; Merrill and Garland made it single pass in twenty sixteen; and every GPU radix sort, sparse matrix product, and stream compaction runs on it.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the problem and its lower bound: n running totals of an associative operation, which any sequential method does in n minus one operations and n minus one dependent steps, and which any parallel method must do in at least n minus one operations. The referee is the sequential scan, and the operation is allowed to be anything associative. On this page: integer addition, maximum, and two by two matrix multiplication, which does not commute. The scans agree on all three, and a scan that swaps its operands, which addition would forgive, gives a different answer on the matrices. The order is checked, not assumed. The heuristic supplies the tree: up-sweep, clear the root, down-sweep. Counted on the simulated machine at two hundred fifty six, one thousand twenty four, four thousand ninety six, and sixteen thousand three hundred eighty four elements: five hundred ten, two thousand forty six, eight thousand one hundred ninety, and thirty two thousand seven hundred sixty six operations, exactly twice n minus one, at depths sixteen, twenty, twenty four, and twenty eight, exactly twice log n. Hillis and Steele reach the same totals in half the levels, eight to fourteen, with n log n minus n plus one operations: one thousand eight hundred to two hundred thirteen thousand, six and a half times the work at the largest size. The sequential chain is n minus one operations at depth n minus one: sixteen thousand dependent steps. And the naive parallel plan, every prefix by its own chain, is n times n minus one over two: five hundred twenty four thousand operations at one thousand twenty four elements. Blelloch’s scan is the one that is both work optimal and log deep, which is why it is the one in the hardware.',
  },
  {
    section: 'picture',
    text:
      'A stadium of people, each holding a number, told to work out, for every seat, the sum of all the numbers before it. Passing a running total down the row takes as many steps as there are seats. Blelloch’s stadium does two things instead. First, pairs of neighbors add, and the right one holds the pair’s total; then pairs of pairs; then blocks of four, eight, sixteen. In a dozen rounds the right end holds the grand total, and a tree of block sums is spread through the stands. Then the right end writes down zero, and the rounds run in reverse: each block holder tells its left half, the total before you is what I was given, and its right half, the total before you is that plus the left half’s sum. Two dozen rounds, twice the additions a single walker would do, and every seat has its answer.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Up-sweep: for a stride of one, two, four, and so on, the element at the end of each block absorbs the element in the middle of it, half as many operations per level each time. Root: the last element is set to the identity. Down-sweep: for strides from half the length down to one, each block’s middle element receives what its end held, and the end receives that plus what the middle held before. The result is the exclusive scan, and one more parallel level of adding the input back makes it inclusive. On this page: sixteen thousand elements in twenty eight levels and thirty two thousand operations. Hillis and Steele: fourteen levels, two hundred thirteen thousand operations. Sequential: sixteen thousand levels, sixteen thousand operations. And the applications: stream compaction that kept three hundred fifteen multiples of three in order, and a ten pass radix sort, both built from the scan, both matching the library.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: an associative operation and many processors. A graphics processor, a vector unit, a carry chain, anything where depth is the cost and work is nearly free. Second: positions, not just totals. Compaction, radix sort, allocation, and segmented reductions all ask how many before me, and that question is a scan. Third: a non commutative operation. Matrix products, string concatenation, state machine composition; the scan needs associativity only, and the page proves it by breaking a scan that assumed more.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The Hillis and Steele scan: half the levels, depth fourteen at sixteen thousand elements, one line of code, and no down-sweep. It costs n log n operations, two hundred thirteen thousand against thirty two thousand, six and a half times the work; reach for it when n is small enough that work is free and only the depth is paid, as inside one GPU warp. And the Kogge and Stone adder: the prefix sum as a circuit, the carries for a sixty four bit addition in six gate levels, in silicon in every processor. It is Hillis and Steele’s work in wires, and Brent and Kung trade depth for fewer cells; reach for it in hardware, where depth is latency and cells are area.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Twice the levels of Hillis and Steele: the two sweeps cost twice log n levels, which matters when the depth is the whole bill and work is free. The basic form wants n to be a power of two and pads otherwise. And each level is a synchronization, which on a real graphics processor means a block level scan, a second scan over the block totals, and a fix up pass, the shape every library actually ships.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: every prefix by its own chain. The instinct with n processors is to give each one a prefix to compute: processor i adds up elements zero through i. Counted, that is n times n minus one over two operations, five hundred twenty four thousand at one thousand twenty four elements against Blelloch’s two thousand, and the depth is still n minus one, because the last processor’s chain is as long as the sequential one. It is worse than doing nothing in parallel at all: five hundred twelve times the work of the sequential scan for the same depth. The tree exists because prefixes share their work. The scan computes each partial total once and routes it to everyone who needs it.',
  },
  {
    section: 'code',
    text:
      'The code on this page is four scans on a simulated parallel machine. A machine class that records each level’s writes, applies them in lockstep from a snapshot so nothing depends on order within a level, and counts operations and depth. The Blelloch exclusive scan, the Hillis and Steele inclusive scan, the sequential scan, and the naive plan with a chain per prefix. Two by two matrix multiplication as the non commutative operation. Stream compaction and a radix digit pass built from the scan. The self test asserts: the sequential, Hillis and Steele, and Blelloch scans agree on integers under addition and maximum and on matrices under multiplication, with the exclusive scan equal to the inclusive one shifted; a scan with swapped operands differing on the matrices; the work and depth equal to their closed forms at every size tried; and compaction and radix sort equal to the library’s filter and sort. When it prints O K, the primitive under every GPU sort has been counted level by level and held to its lower bound. The file would fail before it would lie to you.',
  },
];
