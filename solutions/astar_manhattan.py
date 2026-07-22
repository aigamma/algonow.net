# Puzzle 01: A* search x Manhattan distance
# Shortest path on a 2D grid where 0 is walkable and 1 is a wall.
#
# This file does two jobs. `a_star` is the unit's method. The rest is the
# contest: three other real methods that attack the same problem, run on one
# shared instance so the page can publish measured numbers instead of
# adjectives. Run it directly to see both the self-test and the table.
import heapq
from collections import deque


def a_star(grid, start, goal, counter=None):
    """Return the optimal path from start to goal as a list of (row, col)
    tuples, or [] when no path exists.

    The algorithm is A*: a best-first expansion ordered by f = g + h, where
    g is the exact cost walked so far and h is the heuristic estimate of the
    cost remaining. The heuristic is Manhattan distance, which never
    overestimates on a 4-direction grid, so the first time the goal is
    popped its path is provably optimal.

    `counter` is an optional dict; when given, the number of cells actually
    settled is recorded under "expanded". That count is what the contest
    measures, because it is the work the heuristic is supposed to save.
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
        if counter is not None:
            counter["expanded"] = counter.get("expanded", 0) + 1

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


# ---------------------------------------------------------------- the rivals


def dijkstra(grid, start, goal, counter=None):
    """Dijkstra's algorithm: A* with the heuristic switched off (h = 0).

    Still optimal, and it pays for that optimality by settling cells in every
    direction, including the ones pointing away from the goal.
    """
    rows, cols = len(grid), len(grid[0])
    open_heap = [(0, start)]
    parent, best_g, closed = {}, {start: 0}, set()

    while open_heap:
        g, cell = heapq.heappop(open_heap)
        if cell in closed:
            continue
        closed.add(cell)
        if counter is not None:
            counter["expanded"] = counter.get("expanded", 0) + 1
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
            if g + 1 < best_g.get(nb, float("inf")):
                best_g[nb] = g + 1
                parent[nb] = cell
                heapq.heappush(open_heap, (g + 1, nb))
    return []


def bfs(grid, start, goal, counter=None):
    """Breadth-first search: optimal only because every edge costs 1 here.

    It is the right tool on an unweighted grid and the wrong one the moment a
    single cell costs 2, which is exactly the lesson worth carrying.
    """
    rows, cols = len(grid), len(grid[0])
    seen = {start}
    q = deque([start])
    parent = {}
    while q:
        cell = q.popleft()
        if counter is not None:
            counter["expanded"] = counter.get("expanded", 0) + 1
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
            if grid[nb[0]][nb[1]] == 1 or nb in seen:
                continue
            seen.add(nb)
            parent[nb] = cell
            q.append(nb)
    return []


def greedy_best_first(grid, start, goal, counter=None):
    """Greedy best-first search: order by h alone, ignoring the cost paid.

    Usually the fastest to reach the goal and under no obligation to be
    right. The contest publishes its path length next to the optimum so the
    gap is visible rather than asserted.
    """
    rows, cols = len(grid), len(grid[0])

    def h(cell):
        return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

    open_heap = [(h(start), start)]
    parent, seen = {}, {start}
    while open_heap:
        _, cell = heapq.heappop(open_heap)
        if counter is not None:
            counter["expanded"] = counter.get("expanded", 0) + 1
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
            if grid[nb[0]][nb[1]] == 1 or nb in seen:
                continue
            seen.add(nb)
            parent[nb] = cell
            heapq.heappush(open_heap, (h(nb), nb))
    return []


def pocket_map(size=121):
    """A deterministic map with one U-shaped pocket opening toward the start.

    The pocket is the point. Every step into it reduces the straight-line
    estimate, so a method steered by the estimate alone walks in and has to
    come back out. A method that also remembers the cost paid does not.
    """
    grid = [[0] * size for _ in range(size)]
    mid = size // 2
    top, bot, right = mid - 18, mid + 18, mid + 22
    for c in range(mid - 6, right + 1):
        grid[top][c] = 1
        grid[bot][c] = 1
    for r in range(top, bot + 1):
        grid[r][right] = 1
    return grid


def open_field(size=201, gap=17):
    """A mostly-open map with periodic wall stubs, start and goal on one row.

    This is the geometry where an admissible heuristic pays best: Dijkstra
    settles a diamond of radius equal to the distance, while A* settles
    little more than the corridor between the two points.
    """
    grid = [[0] * size for _ in range(size)]
    for r in range(gap, size - gap, gap):
        for c in range(size):
            if (c // gap) % 3 != 1:
                grid[r][c] = 1
    return grid


METHODS = (
    ("A* x Manhattan", a_star),
    ("Dijkstra", dijkstra),
    ("Breadth-first search", bfs),
    ("Greedy best-first", greedy_best_first),
)


def contest(grid=None, start=None, goal=None):
    """Race every method on one shared instance and return the numbers.

    Defaults to the pocket map, which is the instance published on the page
    because it separates all three behaviours at once: optimal and cheap,
    optimal and expensive, cheap and wrong.
    """
    if grid is None:
        size = 121
        grid, start, goal = pocket_map(size), (size // 2, 6), (size // 2, size - 7)
    results = []
    for name, fn in METHODS:
        counter = {}
        path = fn(grid, start, goal, counter)
        results.append((name, counter.get("expanded", 0), len(path)))
    return results


if __name__ == "__main__":
    # Self-test: the found path must match breadth-first search's optimal
    # length, step only through open cells, and vanish when the goal is
    # walled off.
    def bfs_len(grid, start, goal):
        path = bfs(grid, start, goal)
        return len(path)

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

    # The rivals must agree with A* wherever they claim optimality, and the
    # greedy one must not: that disagreement is the lesson the page teaches.
    rows = contest()
    by_name = {name: (exp, length) for name, exp, length in rows}
    optimum = by_name["A* x Manhattan"][1]
    assert by_name["Dijkstra"][1] == optimum, "Dijkstra must match the optimum"
    assert by_name["Breadth-first search"][1] == optimum, "BFS must match the optimum"
    assert by_name["A* x Manhattan"][0] < by_name["Dijkstra"][0], (
        "the heuristic must settle fewer cells than blind Dijkstra"
    )
    assert by_name["Greedy best-first"][1] > optimum, (
        "the pocket must actually punish the greedy method"
    )
    assert by_name["Greedy best-first"][0] < by_name["A* x Manhattan"][0], (
        "greedy must be cheaper, which is exactly why the wrong answer tempts"
    )

    print("contest on the 121x121 pocket map, start (60,6) to goal (60,114):")
    for name, expanded, length in rows:
        flag = "" if length == optimum else f"  <- {length - optimum} steps worse"
        print(f"  {name:<22} expanded {expanded:>6}   path {length:>4}{flag}")

    # The best case for the heuristic, quoted in the page's prose: with start
    # and goal on one row of a mostly-open field, A* settles little more than
    # the corridor while Dijkstra settles a diamond.
    size = 201
    field = open_field(size)
    fs, fg = (size // 2, 20), (size // 2, size - 21)
    astar_ctr, dij_ctr = {}, {}
    a_star(field, fs, fg, astar_ctr)
    dijkstra(field, fs, fg, dij_ctr)
    print(
        f"open field 201x201: A* expanded {astar_ctr['expanded']}, "
        f"Dijkstra expanded {dij_ctr['expanded']}"
    )
    assert astar_ctr["expanded"] * 50 < dij_ctr["expanded"], (
        "on open ground the heuristic should save more than fiftyfold"
    )

    print("OK: a_star finds the optimal path and respects walls")
