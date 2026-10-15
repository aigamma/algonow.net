import test from 'node:test';
import assert from 'node:assert/strict';
import { textBounds } from '../scripts/unit-tooling/audit_canvas_text_bounds.mjs';

test('text bounds include alignment, baseline, density transform, and constrained text width', () => {
  const metrics = { width: 100, actualBoundingBoxLeft: 50, actualBoundingBoxRight: 50,
    actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 };
  assert.deepEqual(textBounds(metrics, 60, 10, { a: 2, b: 0, c: 0, d: 2, e: 3, f: 4 }),
    { left: 23, right: 223, top: 8, bottom: 28 });
  assert.deepEqual(textBounds(metrics, 60, 10, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 50),
    { left: 35, right: 85, top: 2, bottom: 12 });
  assert.deepEqual(textBounds(metrics, 60, 10, { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }),
    { left: -12, right: -2, top: 10, bottom: 110 });
});
