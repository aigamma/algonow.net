// The lesson animation must replay the real batcher: its trace is compared
// with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, batchRequests, busiestWindow, W, H } from '../scenarios/dynamic-batching-by-size-or-deadline/visuals/dynamicBatcherModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/dynamic-batching-by-size-or-deadline/python/fixtures/arrivals.json');
const expected = read('../scenarios/dynamic-batching-by-size-or-deadline/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const scene = (seconds) => sceneAt(timeline, trace, data, seconds);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.batches.map((r) => r.reason), ['full', 'deadline', 'deadline']);
  assert.deepEqual(trace.practice.batches.map((r) => r.reason), ['tokens', 'deadline', 'tokens', 'deadline']);
  assert.throws(() => batchRequests(data.requests, 0, 1), /max_batch/);
  assert.throws(() => batchRequests(data.requests, 4, 0), /max_wait/);
  assert.throws(() => batchRequests([{ id: 'a', t: 1 }, { id: 'b', t: 0.5 }], 4, 1), /time order/);
  assert.throws(() => batchRequests([{ id: 'big', t: 0, tokens: 600 }], 4, 1, 500), /600 tokens/);
  assert.deepEqual(batchRequests([{ id: 'a', t: 0 }, { id: 'b', t: 1.0 }], 4, 1).map((r) => r.ids), [['a'], ['b']], 'an arrival at the deadline finds the batch sent');
  assert.deepEqual(batchRequests([{ id: 'a', t: 0 }, { id: 'b', t: 0.999 }], 4, 1).map((r) => r.ids), [['a', 'b']], 'a hair earlier it joins');
  assert.equal(busiestWindow([0, 0.1, 0.3, 0.4, 0.5, 0.9, 1.7, 2.0, 2.2], 1.0), 6);
  assert.equal(busiestWindow([0.4, 1.5, 2.7], 1.0), 1);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per arrival');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'request').length, 9);
  assert.deepEqual(kinds.filter((kind) => kind !== 'request'), ['intro', 'final', 'outro', 'practice-intro', 'practice']);
  const flushes = timeline.beats.filter((b) => b.kind === 'request').map((b) => [b.pre, b.post]);
  assert.deepEqual(flushes, [[null, null], [null, null], [null, null], [null, 0], [null, null], [null, null], [1, null], [null, null], [null, null]]);
  assert.equal(timeline.beats.find((b) => b.kind === 'final').flush, 2);
});

test('captions state the measured joins, flushes, waits, and counts, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['9 calls for 9 requests, 6 of them inside one second', 'r1 at 0.00 s starts batch 1; its deadline is 1.00 s',
    'r2 at 0.10 s joins: 2 pending, the oldest (r1) has waited 0.10 s of 1.00', 'r4 at 0.40 s joins: 4 pending, the cap. Batch 1 (r1, r2, r3, r4) is sent at 0.40 s, full. Waits 0.40, 0.30, 0.10, 0.00',
    'r5 at 0.50 s starts batch 2; its deadline is 1.50 s', '1.70 s: the oldest pending, r5, has waited 1.00 s: batch 2 (r5, r6) went at 1.50 s by deadline. r7 starts batch 3; its deadline is 2.70 s',
    "r7's deadline passes at 2.70 s: batch 3 (r7, r8, r9) is sent by deadline. Waits 1.00, 0.70, 0.50",
    '3 model calls instead of 9 (full, deadline, deadline). Longest wait 1.00 s, the cap; average wait 0.51 s', 'the busiest second carried 6 calls; batched, 1',
    'r4 (100) would push r1, r2, r3 (500) to 600, so batch 1 goes at 0.40 s for tokens', 'r9 (60) would push r7, r8 (490) to 550, so batch 3 goes at 2.20 s for tokens',
    '4 model calls: tokens, deadline, tokens, deadline; longest wait still 1.00 s, average 0.54 s']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = scene(timeline.duration);
  assert.equal(end.practice.alpha, 1);
  assert.equal(end.practice.batches.length, 4);
  assert.deepEqual(end.practice.batches.map((r) => r.tokens), [500, 450, 490, 60]);
  assert.equal(end.practice.waits.length, 9);
  assert.deepEqual(end.counts, { sent: 3, requests: 9 });
  assert.equal(end.tray.length, 0);
  assert.equal(end.moving, null);
  assert.equal(end.simTime, expected.batches[2].at);
  assert.equal(end.finished, true);
});

test('each arrival beat ends on its state: the pending count, the batches sent, and the clock at the arrival', () => {
  const pendingAfter = [1, 2, 3, 0, 1, 2, 1, 2, 3];
  const sentAfter = [0, 0, 0, 1, 1, 1, 2, 2, 2];
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) {
    const end = scene(beat.start + beat.duration - 0.01);
    assert.equal(end.tray.length, pendingAfter[beat.index], `${data.requests[beat.index].id} pending`);
    assert.equal(end.sent.length, sentAfter[beat.index], `${data.requests[beat.index].id} sent`);
    assert.equal(end.moving, null, 'nothing is still sliding at the end of a beat');
    assert.ok(Math.abs(end.simTime - data.requests[beat.index].t) < 1e-9, 'the clock has reached the arrival');
    assert.equal(end.tray.every((entry) => entry.alpha === 1), true);
    if (end.tray.length) {
      assert.equal(end.deadline.oldestId, end.tray[0].id);
      assert.ok(Math.abs(end.deadline.waited - (end.simTime - end.tray[0].t)) < 1e-9, 'the bar shows the oldest request\'s wait so far');
    }
    const early = scene(beat.start + 0.1);
    assert.ok(early.simTime < data.requests[beat.index].t || beat.index === 0, 'the clock is still advancing early in the beat');
  }
  const afterFinal = timeline.beats.find((b) => b.kind === 'final');
  const end = scene(afterFinal.start + afterFinal.duration - 0.01);
  assert.equal(end.tray.length, 0);
  assert.equal(end.sent.length, 3);
  assert.deepEqual(end.waits.map((w) => w.wait), expected.waits.map((w) => w.wait));
});

test('the deadline bar fills to the cap before a deadline batch slides out, and the clock never runs backwards', () => {
  const r7 = timeline.beats.find((b) => b.kind === 'request' && b.index === 6);
  const beforeFlush = scene(r7.start + 0.49);
  assert.deepEqual(beforeFlush.tray.map((e) => e.id), ['r5', 'r6']);
  assert.ok(beforeFlush.deadline.progress > 0.999, `bar ${beforeFlush.deadline.progress}`);
  assert.equal(beforeFlush.deadline.oldestId, 'r5');
  const sliding = scene(r7.start + 0.8);
  assert.equal(sliding.moving.index, 1);
  assert.deepEqual(sliding.moving.ids, ['r5', 'r6']);
  assert.equal(sliding.tray.length, 0);
  let last = -1;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const s = scene(t);
    assert.ok(s.simTime >= last - 1e-9, `clock went back at ${t}`);
    last = s.simTime;
  }
});

test('every sampled moment is consistent: the tray never exceeds the cap, batches only accumulate, every id is in one place', () => {
  let sent = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const s = scene(t);
    assert.ok(s.caption.length > 20, `caption at ${t}`);
    assert.ok(s.tray.length <= data.max_batch, `tray ${s.tray.length} at ${t}`);
    assert.ok(s.sent.length >= sent, `batches vanished at ${t}`);
    sent = s.sent.length;
    const places = [...s.tray.map((e) => e.id), ...(s.moving ? s.moving.ids : []), ...s.sent.flatMap((r) => r.ids)];
    assert.equal(new Set(places).size, places.length, `an id is in two places at ${t}`);
    assert.ok(places.length <= data.requests.length);
    if (s.deadline) assert.ok(s.deadline.progress >= 0 && s.deadline.progress <= 1 && s.deadline.waited <= data.max_wait + 1e-9);
    assert.equal(s.arrivals.length, 9);
    for (const entry of s.tray) assert.ok(entry.alpha > 0 && entry.alpha <= 1);
    assert.equal(s.waits.length, s.sent.reduce((n, r) => n + r.ids.length, 0));
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.6, 4.4, 5.5, 8, 9.4, 10.2, 12, 16, 17.5, 17.9, 18.6, 20, 24.6, 25.2, 26.5, 28, 29.5, 30.5, 31.6, 33, timeline.duration]) {
    drawScene(ctx, scene(t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
