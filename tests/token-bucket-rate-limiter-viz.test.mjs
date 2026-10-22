// The lesson animation must replay the real token bucket: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, admit, busiestWindow, W, H } from '../scenarios/token-bucket-rate-limiter/visuals/tokenBucketModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/token-bucket-rate-limiter/python/fixtures/requests.json');
const expected = read('../scenarios/token-bucket-rate-limiter/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.records.map((r) => r.decision), ['admit', 'admit', 'admit', 'reject', 'admit', 'reject', 'admit', 'admit']);
  assert.throws(() => admit(data.requests, 0, 1), /capacity/);
  assert.throws(() => admit(data.requests, 3, 0), /rate/);
  assert.throws(() => admit([{ id: 'a', t: 1 }, { id: 'b', t: 0.5 }], 3, 1), /time order/);
  assert.equal(busiestWindow([0, 0.2, 0.4, 0.6, 1.5, 1.6, 4.0, 4.1], 1.0), 4);
  assert.equal(busiestWindow([0, 0.2, 0.4, 1.5, 4.0, 4.1], 1.0), 3);
  const drained = admit([{ id: 'a', t: 0 }, { id: 'b', t: 0 }, { id: 'c', t: 0 }, { id: 'd', t: 1.0 }], 3, 1);
  assert.equal(drained[3].decision, 'admit', 'exactly one refilled token admits');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per arrival');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'request').length, 8);
  assert.deepEqual(kinds.filter((kind) => kind !== 'request'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured levels and decisions, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['6 of the 8 reach the provider inside 1.6 seconds', '4 of them inside one second', 'q1 at 0.00 s: the bucket starts full at 3.00',
    'refilled from 2.00 to 2.20', 'One token spent: 1.20 left', 'q4 at 0.60 s', 'less than one token. Rejected; the level stays at 0.60',
    'q7 at 4.00 s: 2.40 s passed, the refill would pass the top; the cap holds it at 3.00 (capacity)', '6 admitted (q1, q2, q3, q5, q7, q8), 2 rejected (q4, q6)',
    'holds 3 admissions instead of 4 arrivals', "q4 and q6 now find tenant b's bucket full: 8 of 8 admitted, tenant a 5, tenant b 3",
    'rejected only tenant b']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.practice.alpha, 1);
  assert.deepEqual(end.practice.levels, { a: 2, b: 2 });
  assert.ok(end.practice.chips.every((chip) => chip.decision === 'admit'));
  assert.deepEqual(end.counts, { admitted: 6, rejected: 2 });
  assert.equal(end.level, expected.records[7].after);
  assert.equal(end.finished, true);
});

test('each arrival beat ends on its record: the level equals the after value and its chip is placed', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const record = expected.records[beat.index];
    assert.ok(Math.abs(scene.level - record.after) < 1e-9, `${record.id} level ${scene.level}`);
    assert.equal(scene.chips.filter((chip) => chip.alpha >= 1).length, beat.index + 1, `${record.id} chips`);
    assert.equal(scene.log.length, beat.index + 1);
    assert.equal(scene.counts.admitted + scene.counts.rejected, beat.index + 1);
    const middle = sceneAt(timeline, trace, data, beat.start + 0.95);
    assert.ok(Math.abs(middle.level - record.before) < 1e-9, `${record.id} refilled before the decision`);
  }
});

test('every sampled moment is consistent: the level stays inside the bucket, chips only accumulate, captions present', () => {
  let placed = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.level >= -1e-9 && scene.level <= data.capacity + 1e-9, `level ${scene.level} at ${t}`);
    const count = scene.chips.filter((chip) => chip.alpha >= 1).length;
    assert.ok(count >= placed, `chips vanished at ${t}`);
    placed = count;
    assert.equal(scene.arrivals.length, 8);
    for (const chip of scene.chips) assert.ok(chip.alpha >= 0 && chip.alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.2, 5.5, 8, 10.9, 12.4, 16, 20, 23.8, 24.5, 26.5, 27.9, 29, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc']) assert.ok(calls.has(needed), needed);
});
