// The spoken lesson for puzzle six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle six: Monte Carlo tree search, paired with the U C B one exploration bonus, for games too big to solve. Here is the puzzle. You are given a game position and a clock. Your task is to choose a strong move. But unlike our minimax puzzle, this game is enormous: the tree of continuations outruns any exhaustive search, and worse, nobody can hand you a trustworthy evaluation function for the middle of a game. The constraint, then, is double ignorance. You cannot read everything, and you cannot score what you see. All you can actually do is finish games, quickly and randomly, and count what happens. The question is how to spend a budget of random games so the counting becomes knowledge.',
  },
  {
    section: 'origins',
    text:
      'Three threads braid together here. In two thousand two, Peter Auer, Nicolo Cesa Bianchi, and Paul Fischer analyzed the multi armed bandit problem, a gambler facing a row of slot machines, and proved that a simple rule, upper confidence bounds, keeps regret logarithmic: over time, almost every pull goes to the best machine. In two thousand six, Remi Coulom coined Monte Carlo tree search and built it into his Go program Crazy Stone, and in the same year Levente Kocsis and Csaba Szepesvari showed how to run the bandit rule at every node of a growing tree, an algorithm they called U C T. A decade later, this pair, with a neural network whispering the priors, sat inside AlphaGo when it defeated Lee Sedol. Computer Go had been stuck for decades; this idea unstuck it.',
  },
  {
    section: 'pair',
    text:
      'The control structure is Monte Carlo tree search, a loop of four moves. Selection: walk down the tree you have built so far, choosing a child at each step. Expansion: when you reach the frontier, add one new node to the tree. Rollout: from there, finish the game with fast random moves. Backpropagation: carry the result back up the path, incrementing a visit count and a win count at every node. The tree is a growing memory of everything the playouts have taught. The guiding rule is U C B one, and it answers the only open question in that loop: which child deserves the walk. Its formula adds two terms. The first is the child’s measured win rate, the exploitation term, the voice of greed. The second is an exploration bonus, a constant c times the square root of the logarithm of the parent’s visits divided by the child’s visits. Rarely tried children carry big bonuses; heavily tried ones carry almost none. The sum is an upper confidence bound: optimism in the face of uncertainty, made precise. Set c to zero and the search is a glutton, gorging on the first branch that ever paid out. Set c huge and it is a tourist, sampling everything and mastering nothing. In between sits the balance the bandit theorem blesses.',
  },
  {
    section: 'picture',
    text:
      'Picture a food critic new in town with thirty dinners to spend and a hundred restaurants. Pure greed walks back, every night, to the first place that served a decent plate: a lifetime of mediocre noodles, while the best kitchen in the city goes unvisited. Pure novelty tries a new door every night and ends the month knowing nothing deeply. The seasoned critic keeps a notebook: each restaurant’s average so far, adjusted upward by how rarely it has been tried. Each night she dines wherever the adjusted score peaks. Early on, that sends her everywhere; by month’s end, it sends her, almost every night, to the genuinely best table in the city. Her notebook is the tree. Her adjustment is the exploration bonus. Her dinners are the simulation budget.',
  },
  {
    section: 'run',
    text:
      'Here is one simulation. First, selection: starting at the root, repeatedly descend to the child with the highest U C B one score, win rate plus c root log parent visits over child visits, until you reach a node with an untried move. Second, expansion: play that untried move and add the resulting position to the tree as a fresh node. Third, rollout: from the fresh node, finish the game with uniformly random moves; no wisdom, just speed. Fourth, backpropagation: walk the path back to the root, and at each node add one to the visits and add the result to the wins, scoring each node from the perspective of the player who just moved there. Repeat for the whole budget, thousands of times. Finally, act: play the root child with the most visits, the move the evidence gathered around.',
  },
  {
    section: 'signals',
    text:
      'The signals for this pair. The branching factor or depth makes exhaustive search laughable. No reliable mid game evaluation function exists, but finishing a random game is cheap, which inverts the minimax situation exactly. The budget is elastic: the search is anytime, better with every simulation, and never wrong to interrupt. And decisions repeat, so the tree from one move seeds the next. The naive baseline is uniform sampling: spread the playouts evenly over the moves and pick the best average. It wastes most of its budget proving, over and over, that bad moves are bad. In our tested solution, the bandit oracle makes the contrast concrete: facing one machine that pays eighty percent and one that pays twenty, U C B one spent nine hundred eighty one of one thousand pulls on the good machine, and still spent nineteen confirming the bad one stayed bad. Uniform sampling would have burned five hundred there.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is scale with grace. No evaluation function is needed, memory grows only with the nodes you choose to build, the tree grows asymmetrically toward the lines that matter, and the answer improves smoothly as the budget grows. This is the search that made superhuman Go possible. The weakness is variance and blind tactics. Random rollouts are noisy graders: in razor sharp positions, where one precise line wins and every sibling loses, playout averages blur the difference and the search can miss a shallow trap that minimax would see instantly. The exploration constant needs tuning per game. And convergence guarantees are asymptotic, promises about the limit, not about the budget you can actually afford tonight.',
  },
  {
    section: 'tradeoffs',
    text:
      'To judge the heuristic honestly, put it on a bench against the other standard answers to the same question: given a set of options with unknown payoffs and a fixed budget of trials, how should you spend them? The instance is four slot machines paying at rates of fifty, fifty five, sixty, and forty five percent, a budget of one thousand pulls, averaged over forty independent runs with identical seeds for every policy. The currency is regret, meaning the reward given up compared with an oracle that always plays the best arm, so lower is better and zero is unreachable without clairvoyance.',
  },
  {
    section: 'tradeoffs',
    text:
      'The results are not the ones a page about U C B one would prefer. Uniform sampling, spreading pulls evenly, finished with seventy five regret, the worst average on the board, because it keeps paying full price for arms it has already established are bad. Pure greed finished at fifty four point seven on average, better than uniform, with a worst run of one hundred forty nine point seven, nearly three times its own average. That variance is the entire problem with greed: one unlucky early sample on the genuinely best arm and it never plays that arm again. Epsilon greedy, exploring at random ten percent of the time, finished with twenty three point eight, the best mean on the bench. Thompson sampling finished at twenty seven point nine. And U C B one, the heuristic this unit is built on, finished at forty eight point seven. Fourth of five.',
  },
  {
    section: 'tradeoffs',
    text:
      'That result deserves to be understood rather than explained away, and it is asserted in the code so this page can never quietly drift into overselling its own subject. U C B one over explores at short horizons. The bonus term keeps sampling arms it has very nearly ruled out, and with one thousand pulls there is not enough time to amortize that curiosity. Its guarantee is asymptotic, a promise about the limit rather than about tonight. Two things it does win are worth more than the average. First, robustness: its worst run of forty was sixty six point six, against greed at one hundred forty nine point seven, so its bad nights stay close to its ordinary ones. Second, it is tuned to nothing at all. The epsilon that won this bench was chosen for this problem, and there is no rule that gives you the right epsilon in advance on a problem you have not seen. Choose U C B one when you cannot tune, cannot repeat the experiment, and care more about the bad night than the average one. Choose Thompson sampling when the payoff model is tractable, because it came within a whisker of the tuned winner while tuning nothing.',
  },
  {
    section: 'tradeoffs',
    text:
      'One setting where you would never use U C B one is a horizon of a single pull. The exploration bonus is a statement about how much you still stand to learn, and on the last decision you will never act on that information again, so its correct value is zero and the right policy is pure greed. The principle generalizes past the trivial case. The weight on exploration should scale with the remaining opportunity to use what it buys, which is exactly why U C B one loses to a tuned epsilon greedy over one thousand pulls and would win it back over a million.',
  },
  {
    section: 'code',
    text:
      'The Python solution plays tic tac toe, not because the game needs Monte Carlo, but because its perfection is checkable. Each node stores its board, its children, its untried moves, and two numbers, wins and visits, with wins scored for the player who just moved, so the parent’s selection formula reads its children correctly. The four phases are laid out plainly in the search function: the U C B one descent, the single expansion, the random rollout, the walk back up. A second function strips the heuristic to its skeleton: U C B one alone, on a row of slot machines. The file then holds the pair to account: the bandit test must concentrate at least eighty five percent of pulls on the good arm while never abandoning the bad one, the searcher must take an immediate win and block an immediate loss, and self play from the empty board must end in the draw that perfect play guarantees. That is the pair, and the closing of our first six. Monte Carlo tree search supplies the growing memory. U C B one decides, pull by pull, which memory is worth growing.',
  },
];
