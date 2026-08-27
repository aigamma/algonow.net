// The spoken lesson for puzzle twenty-nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty nine: the Viterbi algorithm, paired with the max product trellis, for decoding hidden sequences. Here is the puzzle. You are given a hidden Markov model, transition probabilities between hidden states and emission probabilities from states to observations, and one observed sequence. Your task is to recover the single most probable hidden state path: one coherent story for the whole sequence, jointly best, not a chain of independently plausible guesses. And the constraint is exactness under real arithmetic: the answer must beat every one of the S to the n possible paths, which the tests verify by enumerating all of them at toy size, and it must survive floating point, because the naive version of this computation underflows to exactly zero on this very page’s instance.',
  },
  {
    section: 'origins',
    text:
      'Andrew Viterbi published the algorithm in nineteen sixty seven, for decoding convolutional error correcting codes, and by his own cheerful account he intended it as a proof device, a tool for bounding error rates, not something anyone would run. Engineers noticed it was eminently runnable. David Forney’s nineteen seventy three exposition drew the trellis picture and fixed the name, Viterbi went on to co found Qualcomm largely on what followed, and essentially every phone call and satellite link since has pushed its bits through this recurrence. The second life came when Lawrence Rabiner’s nineteen eighty nine tutorial carried the same trellis into speech recognition through hidden Markov models, and biology adopted it for gene finding; the dishonest casino example this page measures is from Durbin’s bioinformatics classic. A proof device, twice over the most executed algorithm of its kind on earth.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the trellis: hidden states as rows, time as columns, and in each cell the probability of the best path ending in that state at that time. Each cell is answered by its S predecessors, so the whole computation is n times S squared, with backpointers remembering each cell’s winner, and the backtrace at the end reads the decoded story right off the lattice. Listeners of this site will recognize the third member of a trilogy: Kadane’s state was a single number, Wagner Fischer’s was a prefix lattice, and Viterbi’s is the probabilistic trellis: same discipline, richer algebra. The heuristic is the algebra: the max product semiring. Best path in equals, over predecessors, the maximum of path so far times transition, times emission; in practice max plus over logarithms, and the tests demonstrate why with a number: the linear space recurrence on two thousand observations underflows to exactly zero point zero, while log space calmly reports minus three thousand five hundred ninety four point four. And here is the deepest sentence on the page: change exactly one operation, max to sum, and the identical trellis answers a different question: the total weight of all stories, which is the forward algorithm, the marginals, and the door to training. One lattice, one symbol apart, two philosophies of inference.',
  },
  {
    section: 'picture',
    text:
      'Picture a casino that secretly switches between a fair die and a loaded one, and you hold nothing but the roll history. There are two different accusations you might build. One: go roll by roll, asking, was this particular roll probably thrown with the loaded die? That is the marginal question. Two: write the single most believable screenplay of the entire night: who held which die, when, with every secret switch paying its transition price. That is Viterbi’s question. And the gap between them is not academic. The roll by roll answers, stitched together into a sequence, can assert a night that could not have happened, a switch the house rules forbid; the tests construct exactly such a case and the marginals walk straight into it. The screenplay, by construction, is always a night that could have happened, and among all such nights, the most probable one.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, seed the trellis: each state’s starting cell is its prior times its emission of the first observation, in logs. Second, advance column by column: each cell takes the maximum over predecessors of their cell plus the log transition, then adds its own log emission, and records which predecessor won. Third, finish: the largest cell in the final column is the probability of the best full story. Fourth, backtrace: follow the recorded winners from that cell back to the start, and the sequence of states you walk is the answer. Fifth, know the sibling: run the same trellis with sums instead of maxes, forward and then backward, and you have per position marginals, sequence likelihood, and the machinery Baum Welch trains models with. The trellis is a platform; the semiring chooses the product.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the output is consumed as one coherent path: a segmentation, an alignment, a tag sequence, a decode: anywhere a downstream reader takes the whole story at face value. Second, the transitions carry hard constraints: forbidden switches, grammar rules, structural zeros: because this decoder is incapable of violating them, structurally, while per position methods can and, measured here, do. Third, S squared per step is affordable. When the state space explodes into the millions, as in speech lattices, the beam rival buys tractability, and the measurements price exactly what it risks.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: jointly optimal, structurally legal, numerically sane. No rival’s decoded path ever exceeded Viterbi’s log probability, asserted sequence by sequence. No forbidden transition can appear in its output, because a zero transition is minus infinity in the max and can never win. It matches brute force enumeration exactly where enumeration is possible. And it runs in logarithms, where the naive recurrence dies. The weakness is philosophical and measured: the best story is not the best per scene guess. On the casino, posterior decoding, which optimizes each position separately, scores eighty two point five percent per state accuracy against Viterbi’s eighty one point zero, a real, reproducible gap, even though every single posterior path scored lower as a path, and on the constructed instance, a posterior path scored zero. Choose by what the answer is for: one story, or many small verdicts. And the S squared cost is real: on twelve states, the beam decoder is four times cheaper and went zero for fifty on optimality: the trade cuts both ways, and both edges are measured.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. Arena one: the dishonest casino, two states, thirty sequences of three hundred rolls, per state accuracy against the true hidden sequence. Viterbi: eighty one point zero percent, with all fifty of fifty optimal paths in the twelve state arena, and never an illegal story anywhere. Posterior decoding by forward backward: eighty two point five percent, the per position winner, and on the canonical three stories instance it outputs the exact path B then A, whose probability is zero, because B to A does not exist: it wins each scene and can assert a night that never happened. Greedy chained argmax: fifty eight point seven percent. Sit with that one: it is fourteen points below the decoder that ignores transitions entirely, at seventy two point eight, because committing to one early wrong state propagates the error down a sticky chain. And in the twelve state arena, beam search at width three: four times cheaper per sequence than the full trellis, and zero of fifty sequences decoded optimally, every miss certified by comparing against Viterbi’s exact answer. Pruning has a price, and on this model the price was every single sequence.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is greedy chained argmax, and its number deserves the closing argument. It feels like a lightweight Viterbi: take the best state now, then the best successor of that, and so on. Fifty eight point seven percent. The failure is instructive in general: when a model rewards persistence, sticky transitions, a committed error persists too; each step conditions on a mistake and the chain drags it forward. The trellis exists precisely so that no commitment is made until every path has been priced: Viterbi is not cleverness added to greed, it is the refusal to decide early, made affordable. That refusal costs S squared per step and buys back twenty two accuracy points and every impossible story.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries the whole bench: log space Viterbi with backpointers, the linear space version kept deliberately so its underflow can be demonstrated rather than described, scaled forward backward with posterior decoding, both greedy decoders, beam search with a width parameter, and the dishonest casino and trap models. The self test asserts, in order: on fifteen toy models, Viterbi’s path and log probability exactly match brute force enumeration of all two thousand one hundred eighty seven paths, and forward backward’s marginals match the enumerated marginals to nine decimals; the linear recurrence underflows to exactly zero at two thousand observations while log space stays finite; no rival path ever exceeds Viterbi’s log probability, across thirty sequences; posterior accuracy meets or beats Viterbi’s per position while posterior decoding outputs the impossible B then A story on the canonical instance; and beam three never beats and measurably loses to the exact answer, fifty times of fifty. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
