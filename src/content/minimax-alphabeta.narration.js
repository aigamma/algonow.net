// The spoken lesson for puzzle three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle three: the minimax algorithm, paired with alpha beta pruning and its move ordering heuristic, for adversarial game trees. Here is the puzzle. You are given a two player game of perfect information, such as tic tac toe, checkers, or chess: two players alternate moves, both see everything, and what is good for one is exactly bad for the other. Your task is to choose the move that guarantees the best outcome against a perfect opponent. The constraint is the tree. Every move branches into replies, replies branch into counter replies, and the tree of possibilities grows as the branching factor raised to the depth. Reading all of it is possible only for toy games, and wasteful even there.',
  },
  {
    section: 'origins',
    text:
      'The mathematics is older than the computer. John von Neumann proved the minimax theorem in nineteen twenty eight, showing that zero sum games have a value both players can guarantee. Claude Shannon sketched how a machine could play chess with it in nineteen fifty. Alpha beta pruning emerged in the late nineteen fifties and was analyzed definitively by Donald Knuth and Ronald Moore in nineteen seventy five, with the striking result that pruning changes nothing about the answer and, with well ordered moves, nearly squares the reachable depth. Every strong classical game engine since, including Deep Blue, was built on this pair.',
  },
  {
    section: 'pair',
    text:
      'The control structure is minimax. It walks the game tree depth first. At leaves, it scores the position. At your turns, the maximizing levels, it backs up the largest child value, and at the opponent turns, the minimizing levels, the smallest. The value that reaches the root is the outcome of perfect play, and the child that delivered it is your move. The guiding rule is alpha beta with move ordering. While the walk runs, alpha carries the best score the maximizer can already force, and beta the best the minimizer can. The moment a subtree proves at least as good as beta, or at most alpha, its remaining siblings become irrelevant: a rational opponent would never steer the game there, so the search refuses to read them. How much gets refused depends entirely on the order children are tried. Examine the strongest move first and the window slams shut almost immediately, cutting the work to roughly twice the square root of the full tree. Examine the weakest first and nothing is ever cut. Real engines guess the ordering with a cheap positional heuristic, and the guess does not need to be perfect, only decent.',
  },
  {
    section: 'picture',
    text:
      'Picture a chess coach walking the hall during a simultaneous exhibition, deciding a move for one board. She considers her most promising candidate first and reads it deeply: if I go here, his best reply is that, and the line settles at roughly even. Now she glances at her second candidate, and after one reply she sees it loses a bishop for nothing. She stops instantly. Not because she read every continuation, but because the line is already worse than the even one she has banked. Every continuation of a refuted idea is time she never spends. That banked even line is alpha. The instant dismissal is the cutoff. Her habit of checking the most natural move first is the ordering heuristic, and it is why she dismisses bad ideas after one glance instead of twenty.',
  },
  {
    section: 'run',
    text:
      'Here is the loop for one node. First, if the position is terminal or at the depth limit, return its score. Second, gather the legal moves and sort them by the ordering heuristic, best guess first. Third, for each move in order, apply it, search the child with the current alpha and beta window, and undo it. Fourth, at a maximizing node, raise the running best and raise alpha with it; at a minimizing node, lower the running best and lower beta. Fifth, the cutoff: the instant alpha meets or passes beta, stop reading siblings; the opponent already has a refutation. Sixth, return the running best upward, and at the root, return the move that produced it.',
  },
  {
    section: 'signals',
    text:
      'The signals for this pair are crisp. Two players alternate with perfect information, and the payoffs are zero sum. The game is small enough, or the depth limit shallow enough, that a scored lookahead is feasible. And a cheap guess exists for which moves are strong, captures before quiet moves, center before edge, which is what feeds the ordering. The baseline is plain minimax, which reads everything: b to the d nodes. On the full tic tac toe tree, our tested solution visits five hundred forty nine thousand nine hundred forty six nodes plain, eighteen thousand two hundred ninety seven with pruning in naive order, and seven thousand two hundred seventy five with the center first ordering heuristic: seventy five times less work for the identical, provably identical, answer.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is a free lunch, rare in this field. Alpha beta returns exactly the minimax value, exactly the minimax move, while reading a vanishing fraction of the tree, and memory stays linear in the depth because the walk is depth first. The weakness is everything the exhaustive frame inherits. The tree still explodes with depth, so real engines stop early and lean on an evaluation function whose blind spots become the blind spots of the engine. The gains hinge on ordering quality. And the method assumes a deterministic, fully visible, zero sum world: dice, hidden cards, or cooperative payoffs each break a load bearing assumption.',
  },
  {
    section: 'tradeoffs',
    text:
      'Put the method on a bench with its rivals, all searching the same empty board, and the numbers make the argument better than any adjective could. Plain minimax, the definition itself, visits five hundred forty nine thousand nine hundred forty six nodes to conclude that tic tac toe is a draw. Alpha beta with no move ordering at all visits eighteen thousand two hundred ninety seven, which is three point three percent of that, and it needs no knowledge of the game whatsoever. Alpha beta with the center first ordering, which is this unit, visits seven thousand two hundred seventy five, one point three percent, and the entire difference comes from a single line of domain knowledge about where strong moves tend to live. And alpha beta with a transposition table visits one thousand nine hundred eighty one nodes, four tenths of one percent of plain minimax, a two hundred seventy eight fold saving, because the same position is reachable by many different move orders and remembering it once is cheaper than proving it again. Every one of those four methods returns the identical answer. That invariant is asserted in the code, so a change that made the fast version faster and wrong would fail the build rather than ship.',
  },
  {
    section: 'tradeoffs',
    text:
      'The transposition table deserves a warning, because it is the classic way this optimization goes wrong, and it went wrong while this very page was being written. When a cutoff fires, alpha beta stops early and returns a bound rather than the true value: all it proved was that the value is at least this, or at most that. Store that bound in the table as though it were exact, then reuse it later under a different window, and the search will confidently return the wrong answer. On the first run of this page the memoized version claimed that tic tac toe is a win for X. The fix is standard and worth memorizing: record with each entry which kind of number it holds, exact, lower bound, or upper bound, and let a cached bound narrow the search window rather than answer the question outright.',
  },
  {
    section: 'tradeoffs',
    text:
      'One method you would never bring to this particular board is Monte Carlo tree search. Tic tac toe has five thousand four hundred seventy eight reachable positions and an exact answer that alpha beta with a table proves in under two thousand node visits. Running random playouts instead trades a proof for a sample: thousands of simulations to become fairly confident of something you could have known with certainty in milliseconds. That is not humility, it is discarding a guarantee you were being handed for free. The same method becomes the right answer the moment the tree stops being solvable, which is exactly the subject of puzzle six, and knowing which side of that line you are standing on is the whole skill.',
  },
  {
    section: 'code',
    text:
      'The Python solution plays perfect tic tac toe. The board is a list of nine cells. The alpha beta function returns a value and a move: plus one for a certain cross win, minus one for a certain circle win, zero for a draw. The ordering heuristic is one tuple: center first, then corners, then edges, which is simply the order strong tic tac toe moves tend to appear. Each candidate move is applied, searched, and undone, and the cutoff breaks the loop the moment alpha meets beta. The file then holds itself to account four ways. Pruned values must equal plain minimax values from assorted positions, the equivalence oracle. The engine must take an immediate win and must block an immediate loss. Perfect play against itself must end drawn. And the node counters must actually show the promised collapse, ordered under unordered under plain. That is the pair. Minimax supplies the guarantee. The pruning order supplies the affordable price, and the answer never changes by a single point.',
  },
];
