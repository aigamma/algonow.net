import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('modular exponentiation reduces arbitrary bases before its multiplication loop', () => {
  const script = String.raw`
import random
from solutions.modular_exponentiation_square_multiply import sqm, ladder

# Observe operand sizes, not elapsed time: correctness alone did not expose
# the unreduced base multiplying modulus-sized accumulators on every 1 bit.
products = []
class TrackedInt(int):
    def __mod__(self, other):
        return TrackedInt(int(self) % int(other))
    def __mul__(self, other):
        value = int(self) * int(other)
        products.append(value)
        return TrackedInt(value)
    __rmul__ = __mul__

modulus = 101
huge_base = (1 << 10000) + 73
for method in (sqm, ladder):
    products.clear()
    result = method(TrackedInt(huge_base), 12345, modulus)
    assert result == pow(huge_base, 12345, modulus)
    assert products and max(products) < modulus * modulus, (method.__name__, max(products).bit_length())

rng = random.Random(20261015)
for _ in range(75):
    a = rng.getrandbits(4096) * rng.choice([-1, 1])
    e = rng.randrange(0, 1 << 16)
    m = rng.randrange(1, 1 << 20)
    assert sqm(a, e, m) == ladder(a, e, m) == pow(a, e, m)
`;
  const result = spawnSync('python', ['-c', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
