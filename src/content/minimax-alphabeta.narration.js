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
      'The strength is a free lunch, rare in this field. Alpha beta returns exactly the minimax value, exactly the minimax move, while reading a vanishing fraction of the tree, and memory stays linear in the depth because the walk is depth first. The weakness is everything the exhaustive frame inherits. The tree still explodes with depth, so real engines stop early and lean on an evaluation function whose blind spots become the engine's blind spots. The gains hinge on ordering quality. And the method assumes a deterministic, fully visible, zero sum world: dice, hidden cards, or cooperative payoffs each break a load bearing assumption.',
  },
  {
    section: 'code',
    text:
      'The Python solution plays perfect tic tac toe. The board is a list of nine cells. The alpha beta function returns a value and a move: plus one for a certain cross win, minus one for a certain circle win, zero for a draw. The ordering heuristic is one tuple: center first, then corners, then edges, which is simply the order strong tic tac toe moves tend to appear. Each candidate move is applied, searched, and undone, and the cutoff breaks the loop the moment alpha meets beta. The file then holds itself to account four ways. Pruned values must equal plain minimax values from assorted positions, the equivalence oracle. The engine must take an immediate win and must block an immediate loss. Perfect play against itself must end drawn. And the node counters must actually show the promised collapse, ordered under unordered under plain. That is the pair. Minimax supplies the guarantee. The pruning order supplies the affordable price, and the answer never changes by a single point.',
  },
];
