// The lesson animation must replay the real circuit breaker: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, protect, W, H } from '../scenarios/circuit-breaker-for-model-calls/visuals/circuitBreakerModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/circuit-breaker-for-model-calls/python/fixtures/calls.json');
const expected = read('../scenarios/circuit-breaker-for-model-calls/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const STATES = new Set(['closed', 'open', 'half-open']);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.records.map((r) => r.action), ['ok', 'failed', 'failed', 'failed', 'skipped', 'skipped', 'trial failed', 'skipped', 'trial ok', 'ok']);
  assert.throws(() => protect(data.calls, 0, 2), /threshold/);
  assert.throws(() => protect(data.calls, 3, 0), /cooldown/);
  assert.throws(() => protect([{ id: 'a', t: 1, provider: 'ok' }, { id: 'b', t: 0.5, provider: 'ok' }], 3, 2), /time order/);
  const opens = [{ id: 'a', t: 0, provider: 'fail' }, { id: 'b', t: 0, provider: 'fail' }, { id: 'c', t: 0, provider: 'fail' }];
  assert.equal(protect([...opens, { id: 'd', t: 2.0, provider: 'ok' }], 3, 2)[3].action, 'trial ok', 'exactly at the end of the cooldown is the trial');
  assert.equal(protect([...opens, { id: 'd', t: 1.999, provider: 'ok' }], 3, 2)[3].action, 'skipped');
  assert.deepEqual(protect(data.calls, 3, 2, 2).map((r) => r.after).slice(8), ['half-open', 'closed'], 'two trial successes to close');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'call')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per call');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'call').length, 10);
  assert.deepEqual(kinds.filter((kind) => kind !== 'call'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured states, counts, and cooldowns, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['10 provider calls, 7 failures', '7 failures in a row from 0.40 s to 4.00 s',
    'c1 at 0.00 s: closed, the call goes to the provider: ok. Failures in a row: 0.',
    'c2 at 0.40 s: closed, the call goes to the provider: failed. Failures in a row: 1 of 3.',
    'c4 at 1.20 s: failed, 3 of 3 consecutive failures: the breaker opens',
    'c5 at 1.50 s: open for 0.30 s of the 2.00 s cooldown: skipped, the provider is not called',
    'c7 at 3.30 s: 2.10 s since it opened: half-open, one trial call; the provider fails: open again',
    'c8 at 4.00 s: open for 0.70 s of the 2.00 s cooldown: skipped',
    'c9 at 5.40 s: 2.10 s since it opened: half-open, the trial succeeds: closed',
    '7 provider calls instead of 10, 4 failures returned instead of 7, 3 skipped (c5, c6, c8)', 'spared 3 timeouts',
    'c9 at 5.40 s is the first trial success: 1 of 2, the breaker stays half-open; c10 at 5.80 s is the second: trial ok, closed after 2 trial successes']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.practice.alpha, 1);
  assert.equal(end.practice.step, 1);
  assert.deepEqual(end.practice.trials, ['c9', 'c10']);
  assert.equal(end.state, 'closed');
  assert.equal(end.failures, 0);
  assert.equal(end.cooldown, null);
  assert.deepEqual(end.counts, { reached: 7, failures: 4, skipped: 3 });
  assert.equal(end.log.length, 10);
  assert.equal(end.finished, true);
  const firstTrial = sceneAt(timeline, trace, data, timeline.beats[kinds.indexOf('practice')].start + 1.0);
  assert.equal(firstTrial.state, 'half-open');
  assert.equal(firstTrial.practice.successes, 1);
});

test('each call beat ends on its record: the badge shows the after state, its chip is placed, the counter is updated', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'call')) {
    const record = timeline.details.records[beat.index];
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    assert.equal(scene.state, record.after, `${record.id} after`);
    assert.equal(scene.failures, record.failuresAfter, `${record.id} failures after`);
    assert.equal(scene.chips.filter((chip) => chip.alpha >= 1).length, beat.index + 1, `${record.id} chips`);
    assert.equal(scene.log.length, beat.index + 1);
    assert.equal(scene.counts.reached + scene.counts.skipped, beat.index + 1);
    const middle = sceneAt(timeline, trace, data, beat.start + 0.95);
    assert.equal(middle.state, record.before, `${record.id} before the decision`);
    assert.equal(middle.failures, record.failuresBefore, `${record.id} failures before`);
    if (record.action === 'skipped') { assert.equal(middle.travel, 0); assert.ok(middle.turnedBack >= 1, `${record.id} turned back`); }
    else { assert.equal(middle.turnedBack, 0); assert.ok(middle.travel >= 1, `${record.id} reached the provider`); }
    if (record.before === 'open') assert.ok(Math.abs(middle.cooldown.elapsed - record.sinceOpen) < 1e-9, `${record.id} cooldown elapsed`);
    if (record.after === 'closed') assert.equal(scene.cooldown, null);
  }
  const opened = sceneAt(timeline, trace, data, timeline.beats[1 + 3].start + 2.39);   // c4's beat, after its decision
  assert.equal(opened.state, 'open');
  assert.deepEqual(opened.cooldown, { elapsed: 0, total: 2 });
});

test('every sampled moment is consistent: a valid state, the counter inside the threshold, chips only accumulate, captions present', () => {
  let placed = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(STATES.has(scene.state), `state ${scene.state} at ${t}`);
    assert.ok(scene.failures >= 0 && scene.failures <= data.threshold, `failures ${scene.failures} at ${t}`);
    if (scene.cooldown) assert.ok(scene.cooldown.elapsed >= 0 && scene.cooldown.total === data.cooldown);
    const count = scene.chips.filter((chip) => chip.alpha >= 1).length;
    assert.ok(count >= placed, `chips vanished at ${t}`);
    placed = count;
    assert.equal(scene.arrivals.length, 10);
    for (const chip of scene.chips) assert.ok(chip.alpha >= 0 && chip.alpha <= 1);
    assert.ok(scene.travel >= 0 && scene.travel <= 1 && scene.turnedBack >= 0 && scene.turnedBack <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.2, 5.5, 8, 10.9, 12.4, 14, 16, 18.5, 20, 23.8, 24.5, 26.5, 27.9, 29, 31, 32.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc']) assert.ok(calls.has(needed), needed);
});
