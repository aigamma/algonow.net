import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Hopcroft-Karp harvests maximal disjoint batches of actual shortest augmenting paths', () => {
  const script = String.raw`
from collections import deque
import random
from solutions.hopcroft_karp_layered_phases import hopcroft_karp, brute_max_matching

def shortest_path(adj, ml, mr, blocked_l=frozenset(), blocked_r=frozenset()):
    # Independent BFS over both sides, with one edge per distance unit.
    queue = deque((0, u, 0) for u, v in enumerate(ml) if v == -1 and u not in blocked_l)
    seen = {(side, u) for side, u, _ in queue}
    while queue:
        side, vertex, distance = queue.popleft()
        if side == 1 and mr[vertex] == -1:
            return distance
        targets = ([v for v in adj[vertex] if v != ml[vertex] and v not in blocked_r]
                   if side == 0 else [mr[vertex]])
        for target in targets:
            next_side = 1 - side
            if next_side == 0 and target in blocked_l:
                continue
            key = (next_side, target)
            if key not in seen:
                seen.add(key)
                queue.append((next_side, target, distance + 1))
    return None

def check(adj, nr):
    log = []
    ml, mr, phases = hopcroft_karp(len(adj), nr, adj, phase_log=log)
    assert phases == len(log)
    previous = 0
    for phase in log:
        before_l, before_r = phase['before_l'], phase['before_r']
        length = shortest_path(adj, before_l, before_r)
        assert phase['shortest_length'] == length and length > previous
        previous = length
        used_l, used_r = set(), set()
        for path in phase['paths']:
            assert 2 * len(path) - 1 == length, (path, length)
            assert before_l[path[0][0]] == -1 and before_r[path[-1][1]] == -1
            for i, (u, v) in enumerate(path):
                assert v in adj[u] and before_l[u] != v
                assert u not in used_l and v not in used_r
                used_l.add(u)
                used_r.add(v)
                if i + 1 < len(path):
                    assert before_r[v] == path[i + 1][0]
        # No additional vertex-disjoint shortest path can join this batch.
        remaining = shortest_path(adj, before_l, before_r, used_l, used_r)
        assert remaining is None or remaining > length
    assert sum(v != -1 for v in ml) == brute_max_matching(len(adj), nr, adj)
    assert all(v == -1 or mr[v] == u for u, v in enumerate(ml))
    assert shortest_path(adj, ml, mr) is None
    return log

# Previously the second phase chose two length-5 paths while length 3 was available.
fixture = [[6], [0, 1, 3, 4], [0, 4, 5], [1, 2, 3, 6], [1, 4], [0, 1, 4, 6], [0, 3, 6, 7], [0, 2, 4, 5]]
log = check(fixture, 8)
assert log[1]['shortest_length'] == 3
rng = random.Random(20261015)
for _ in range(512):
    nl, nr = rng.randrange(1, 9), rng.randrange(1, 9)
    check([[v for v in range(nr) if rng.random() < .35] for _ in range(nl)], nr)
`;
  const result = spawnSync('python', ['-c', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
