# Puzzle 01: A* search x Manhattan distance
# Shortest path on a 2D grid where 0 is walkable and 1 is a wall.
import heapq


def a_star(grid, start, goal):
    """Return the optimal path from start to goal as a list of (row, col)
    tuples, or [] when no path exists.

    The algorithm is A*: a best-first expansion ordered by f = g + h, where
    g is the exact cost walked so far and h is the heuristic estimate of the
    cost remaining. The heuristic is Manhattan distance, which never
    overestimates on a 4-direction grid, so the first time the goal is
    popped its path is provably optimal.
    """
    rows, cols = len(grid), len(grid[0])

    def h(cell):
        return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

    open_heap = [(h(start), 0, start)]   # (f, g, cell)
    parent = {}
    best_g = {start: 0}
    closed = set()

    while open_heap:
        f, g, cell = heapq.heappop(open_heap)
        if cell in closed:
            continue
        closed.add(cell)

        if cell == goal:
            path = [cell]
            while cell in parent:
                cell = parent[cell]
                path.append(cell)
            return path[::-1]

        r, c = cell
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nb = (r + dr, c + dc)
            if not (0 <= nb[0] < rows and 0 <= nb[1] < cols):
                continue
            if grid[nb[0]][nb[1]] == 1 or nb in closed:
                continue
            tentative = g + 1
            if tentative < best_g.get(nb, float("inf")):
                best_g[nb] = tentative
                parent[nb] = cell
                heapq.heappush(open_heap, (tentative + h(nb), tentative, nb))

    return []


if __name__ == "__main__":
    # Self-test: the found path must match breadth-first search's optimal
    # length, step only through open cells, and vanish when the goal is
    # walled off.
    from collections import deque

    def bfs_len(grid, start, goal):
        rows, cols = len(grid), len(grid[0])
        seen, q = {start}, deque([(start, 1)])
        while q:
            (r, c), n = q.popleft()
            if (r, c) == goal:
                return n
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nb = (r + dr, c + dc)
                if (0 <= nb[0] < rows and 0 <= nb[1] < cols
                        and grid[nb[0]][nb[1]] == 0 and nb not in seen):
                    seen.add(nb)
                    q.append((nb, n + 1))
        return 0

    maze = [
        [0, 0, 0, 1, 0, 0, 0, 0],
        [1, 1, 0, 1, 0, 1, 1, 0],
        [0, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ]
    path = a_star(maze, (0, 0), (6, 7))
    assert path, "expected a path through the maze"
    assert path[0] == (0, 0) and path[-1] == (6, 7)
    assert len(path) == bfs_len(maze, (0, 0), (6, 7)), "path must be optimal"
    for (r1, c1), (r2, c2) in zip(path, path[1:]):
        assert abs(r1 - r2) + abs(c1 - c2) == 1, "path must move one step at a time"
        assert maze[r2][c2] == 0, "path must stay on open cells"

    blocked = [[0, 1, 0], [1, 1, 0], [0, 0, 0]]
    assert a_star(blocked, (0, 0), (0, 2)) == [], "walled-off goal returns []"

    print("OK: a_star finds the optimal path and respects walls")
