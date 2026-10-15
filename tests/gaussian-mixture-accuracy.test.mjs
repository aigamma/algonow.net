import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('a covariance ridge can lower ordinary likelihood without invalidating the Gaussian fit', () => {
  const script = String.raw`
import math
from solutions.gaussian_mixture_expectation_maximization import em_fit

# The initial identity covariance is already the exact maximum-likelihood
# fit of these four points. Adding a positive ridge must lower its likelihood.
s = math.sqrt(2)
points = [(s, 0), (-s, 0), (0, s), (0, -s)]
w, means, cov, history, responsibilities = em_fit(points, 1, [(0, 0)], 3, ridge=0.5)
assert history[1] < history[0] - 0.1, history
assert w == [1] and means == [[0, 0]]
assert abs(cov[0][0] - 1.5) < 1e-12 and abs(cov[0][3] - 1.5) < 1e-12
assert all(row == [1] for row in responsibilities)

unregularized = em_fit(points, 1, [(0, 0)], 3, ridge=0)
assert all(b >= a - 1e-9 for a, b in zip(unregularized[3], unregularized[3][1:]))
assert abs(unregularized[2][0][0] - 1) < 1e-12
`;
  const result = spawnSync('python', ['-c', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
