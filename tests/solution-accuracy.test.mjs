import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('audited solutions validate Sudoku, count moves, and bound sorting and sketch storage', () => {
  const script = String.raw`
import sys
from solutions.backtracking_mrv import solve
from solutions.astar_manhattan import contest
from solutions.quicksort_median_of_three import quicksort, choose_median_of_three, counting_lt
from solutions.minhash_bottom_k import bottom_k, h64

assert solve([1] * 81) is False, 'a full invalid Sudoku is not a solution'
for _, _, moves in contest([[0, 0]], (0, 0), (0, 1)):
    assert moves == 1, 'two adjacent cells are one move'
for _, _, moves in contest([[0]], (0, 0), (0, 0)):
    assert moves == 0, 'a zero-length route stays at its start'

# The old stack kept one empty left range for every equal-key partition.
# Observe pending storage while running the actual implementation.
maximum = [0]
def trace(frame, event, arg):
    if event == 'line' and frame.f_code is quicksort.__code__:
        maximum[0] = max(maximum[0], len(frame.f_locals.get('stack', [])))
    return trace
a = [7] * 128
sys.settrace(trace)
try:
    quicksort(a, counting_lt({}), choose_median_of_three)
finally:
    sys.settrace(None)
assert a == [7] * 128
assert maximum[0] <= 8, maximum[0]
for a in [list(range(90)), list(range(90, -1, -1)), [5, 1, 9, 1, -2, 4]]:
    expected = sorted(a)
    quicksort(a, counting_lt({}), choose_median_of_three)
    assert a == expected

# A stream with duplicates must produce the exact k smallest distinct hashes.
# Its retained hash storage must depend on k, not the stream length.
maximum_retained = [0]
def trace_sketch(frame, event, arg):
    if event == 'line' and frame.f_code is bottom_k.__code__:
        maximum_retained[0] = max(maximum_retained[0], len(frame.f_locals.get('kept', [])))
    return trace_sketch
items = [i % 731 for i in range(5000)]
sys.settrace(trace_sketch)
try:
    sketch = bottom_k(iter(items), 17)
finally:
    sys.settrace(None)
assert sketch == sorted({h64(i) for i in items})[:17]
assert maximum_retained[0] <= 17
assert bottom_k(iter([]), 17) == []
try:
    bottom_k([1], 0)
except ValueError:
    pass
else:
    raise AssertionError('zero-sized signatures must be rejected')
`;
  const result = spawnSync('python', ['-c', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
