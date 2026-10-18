// The lesson animation must replay the real retry loop: its trace is compared
// with the fixture the Python suite derives from solution.py and the practice
// answer, its timeline must be a reading pace, and its scenes must stay
// consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, py, W, H } from '../scenarios/retry-with-backoff/visuals/retryBackoffModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/retry-with-backoff/python/fixtures/scripts.json');
const expected = read('../scenarios/retry-with-backoff/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(py(1), '1.0');
  assert.equal(py(0.5), '0.5');
  assert.equal(py(3.5), '3.5');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  const attempts = timeline.beats.filter((b) => b.kind === 'attempt');
  for (const beat of attempts) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'two to three seconds per attempt');
  assert.equal(attempts.length, 8, 'three, four, and one attempts');
  assert.deepEqual(attempts.map((b) => b.lane), [0, 0, 0, 1, 1, 1, 1, 2]);
  assert.equal(timeline.beats.filter((b) => b.kind === 'budget').length, 1);
});

test('captions state the measured waits, the cap, the untouched error, and the budget arithmetic', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['0.5 × 1 = 0.5 s', '0.5 × 2 = 1.0 s', '0.5 × 4 = 2.0 s', 'after 1.5 s of waiting over 3 attempts',
    'gave up after 4 attempts, 3.5 s waited', 'not retried, raised at once', '4 calls in the same instant',
    '0.5 + 1.0 + 2.0 = 3.5 s would exceed the budget of 3.0 s: give up after attempt 3', '1.5 s waited over 3 attempts']) {
    assert.ok(captions.includes(phrase), phrase);
  }
});

test('the final scene shows every attempt, the budget cut on the second lane, and no ghost', () => {
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.lanes.map((lane) => lane.attempts.length), [3, 4, 1]);
  for (const lane of end.lanes) for (const a of lane.attempts) { assert.equal(a.alpha, 1); if (a.wait !== null) assert.equal(a.bracket, 1); }
  assert.deepEqual(end.lanes[1].attempts.map((a) => a.cut), [false, false, true, true], 'attempts three and four are cut by the budget');
  assert.deepEqual(end.lanes[1].attempts.map((a) => a.at), [0, 0.5, 1.5, 3.5]);
  assert.equal(end.shipped, 0);
  assert.equal(end.budget.alpha, 1);
  assert.equal(end.budget.at, 3);
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: attempts appear in order, brackets never exceed their waits', () => {
  let sawShipped = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    if (scene.shipped > 0.99) sawShipped = true;
    for (const lane of scene.lanes) {
      let previous = 1;
      for (const a of lane.attempts) {
        assert.ok(a.alpha >= 0 && a.alpha <= 1 && a.bracket >= 0 && a.bracket <= 1);
        assert.ok(a.at >= 0 && a.at <= 4, 'every attempt starts within the four-second axis');
        assert.ok(a.alpha <= previous + 1e-9, `attempt ${a.attempt} visible before its predecessor at ${t}`);
        previous = a.alpha;
      }
    }
  }
  assert.ok(sawShipped, 'the tight loop that shipped must be shown');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.5, 6, 8.5, 12, 15, 18.5, 20, 22, 24, 26, 28, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
