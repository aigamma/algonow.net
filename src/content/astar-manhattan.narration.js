// The spoken lesson. Written for the ear, not the eye: numbers are spelled
// out, symbols are read as words, and sentences carry one idea each. The
// `section` key ties each paragraph to the page section it accompanies, so
// the player can highlight and follow along.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Welcome to algonow. Puzzle one: the A star search algorithm, paired with the Manhattan distance heuristic, for shortest pathfinding on grid maps. Here is the puzzle. You are given a rectangular grid where every cell is either open or a wall, along with one starting cell and one goal cell. Your task is to produce a provably shortest route from start to goal, stepping only up, down, left, or right. If no route exists, you must say so. The constraint that makes this interesting is efficiency. You must guarantee the best answer without wasting effort settling the whole map.',
  },
  {
    section: 'origins',
    text:
      'This technique was published in nineteen sixty eight by Peter Hart, Nils Nilsson, and Bertram Raphael at the Stanford Research Institute, where it helped an early mobile robot named Shakey plan its way through rooms and corridors. Their insight joined two traditions. From Dijkstra came the rigorous guarantee of shortest path traversal. From informed search came the idea of using knowledge about the goal to decide what deserves attention next. Uniform cost methods explore blindly in every direction, like water spreading over a flat surface. A star instead biases the exploration toward the target, and it does so with a remarkable property: among all algorithms given the same heuristic information, none can expand fewer nodes and still guarantee an optimal answer.',
  },
  {
    section: 'pair',
    text:
      'Every lesson on this site separates the pair, and the separation is the point. The control structure here is the A star search algorithm. It owns the bookkeeping. It keeps an open set of discovered cells, prioritized by total expected cost. It keeps a closed set of fully settled cells so nothing is processed twice. It records the cheapest known cost to reach each cell, called the g score, and it keeps parent links so the finished route can be rebuilt at the end. The guiding rule is the Manhattan distance heuristic. For any cell, it adds the absolute difference in rows to the absolute difference in columns, measured against the goal. That is exactly the length of the walk if the map had no walls at all. On a grid that allows only four directions of movement, this estimate is admissible, meaning it never overestimates the true remaining cost, and consistent, meaning it never falls faster than one per step taken. Those two properties are the contract. Keep them, and the first time the goal leaves the open set, its path is mathematically optimal.',
  },
  {
    section: 'picture',
    text:
      'Picture a city laid out as a perfect rectangular grid, and a tall glass tower you are trying to reach on foot, past construction barriers and closed alleys. The algorithm is your pocket journal. At every intersection you have visited, it records exactly how many blocks you walked from your hotel to stand there. The heuristic is the look you take upward at the tower. From any corner, you can count the blocks north and the blocks east that would remain if every street were open. To choose your next move, you add the blocks already walked to the blocks the tower still appears to demand, and you always step toward the intersection with the smallest sum. You never wander far from the line the tower draws, yet the journal quietly protects you from dead ends the view cannot reveal.',
  },
  {
    section: 'run',
    text:
      'Here is one full turn of the loop. First, take the cell with the lowest total score from the open set, where the total score f equals g, the cost walked so far, plus h, the heuristic estimate of the cost remaining. Second, if that cell is the goal, stop. Follow the parent links backward and the route you rebuild is optimal. Third, otherwise move the cell into the closed set. It is settled, and its g score will never improve. Fourth, look at each open neighbor, one step away. If reaching it through the current cell is cheaper than any way seen before, record the better g score, point its parent link at the current cell, and push it into the open set under its new total score. Fifth, repeat. If the open set ever runs dry before the goal appears, no route exists, and you can prove it.',
  },
  {
    section: 'signals',
    text:
      'You will recognize this pair in the wild by three signals. The problem asks for a shortest or cheapest path, not just any path. The world is a grid or a graph with known coordinates for both the source and the destination, so a distance estimate is available for free. And moves are restricted to a few directions of unit cost, which is precisely the setting where Manhattan distance stays admissible. The naive alternative is breadth first search, or Dijkstra when edges carry weights. Both are correct, and both waste enormous effort expanding rings of cells that lead away from the goal. In the worst case, A star still takes time and memory on the order of the branching factor raised to the depth of the solution, because a maze of deceptive walls can force it to behave like its uninformed cousins. With an accurate heuristic on a realistic map, the work compresses dramatically, and in practice it approaches the length of the answer itself.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength of the pair is optimal efficiency. Given an admissible, consistent heuristic, A star is proved to expand the fewest nodes of any algorithm that guarantees the best path with the same information. The weakness is memory. The open and closed sets must remember every cell that has ever been discovered, and in large or high dimensional spaces that footprint can exhaust a machine long before time runs out. Sound designs keep A star for bounded maps, and swap in iterative deepening variants, such as I D A star, when memory is the scarce resource.',
  },
  {
    section: 'code',
    text:
      'The Python solution reads the same way the loop was spoken. The heap q module supplies the priority queue, so the open set always surrenders its lowest total score in logarithmic time. Each entry on the heap carries three things: the total score f, the exact cost so far g, and the cell itself. A dictionary of best g scores remembers the cheapest known way to reach each cell. A closed set skips any cell that has already been settled, which also disposes of stale duplicate heap entries. When the goal is popped, parent links rebuild the path in reverse. And at the bottom of the file, the solution checks itself: the path it returns must match the optimal length that breadth first search reports, must move one legal step at a time, and must vanish gracefully when the goal is walled off. That is the pair. A star carries the guarantees. Manhattan distance supplies the direction. Together they are the reason a map that would take millions of blind expansions falls in a few hundred informed ones.',
  },
];
