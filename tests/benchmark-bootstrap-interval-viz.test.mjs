// The lesson animation must replay the real bootstrap: the shown resamples are
// rescored from the indices Python drew, the interval and the better share are
// recomputed from Python's two hundred differences, and the result must equal
// the trace the Python suite derives from solution.py. The timeline must be a
// reading pace, and the scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, percentile, roundHalfEven, binsFor, W, H } from '../scenarios/benchmark-bootstrap-interval/visuals/bootstrapModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/benchmark-bootstrap-interval/python/fixtures/results.json');
const expected = read('../scenarios/benchmark-bootstrap-interval/python/fixtures/expected-trace.json');
const trace = buildTrace(data, { resamples: expected.resamples, differences: expected.differences });
const timeline = buildTimeline(trace, data);

test('the percentile helper rounds halves to even like Python and reads the nearest rank', () => {
  assert.equal(roundHalfEven(4.5), 4);
  assert.equal(roundHalfEven(5.5), 6);
  assert.equal(roundHalfEven(0.225), 0);
  assert.equal(roundHalfEven(8.775), 9);
  const values = [9, 0, 8, 1, 7, 2, 6, 3, 5, 4];
  assert.equal(percentile(values, 0), 0);
  assert.equal(percentile(values, 50), 4);
  assert.equal(percentile(values, 97.5), 9);
  assert.deepEqual(values, [9, 0, 8, 1, 7, 2, 6, 3, 5, 4], 'the list is not sorted in place');
});

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(trace.resamples.length, 12);
  assert.equal(trace.differences.length, 200);
  assert.deepEqual(trace.interval, { low: -0.12, high: 0.2 });
  assert.equal(trace.includes_zero, true);
  assert.equal(trace.better_fraction, 0.595);
  assert.deepEqual(trace.resamples[0], { indices: expected.resamples[0].indices, old: 20, new: 18, difference: -0.08 });
  assert.throws(() => buildTrace({ ...data, new: data.new.slice(0, 24) }, expected), /one entry per item/);
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'resample')) assert.ok(beat.duration >= 2.4 && beat.duration <= 3, 'about two and a half seconds per shown resample');
  assert.deepEqual(timeline.beats.map((beat) => beat.kind),
    ['intro', 'resample', 'resample', 'resample', 'resample', 'quick', 'fill', 'interval', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene shows the interval and the better share', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['Old right 17 of 25 (68.0%)', 'new right 18 of 25 (72.0%)', 'a +4.0-point gain', 'Resample 1:',
    'old right 20, new right 18, difference -8.0 points', '-12.0 and +20.0 points', 'includes zero', 'not established',
    '32 points wide', '119 of 200 resamples are above zero: 59.5%', 'computed by the Python file']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.completed, 200);
  assert.equal(end.intervalAlpha, 1);
  assert.equal(end.shadeAlpha, 1);
  assert.equal(end.better, 119);
  assert.equal(end.bins.reduce((total, bin) => total + bin.count, 0), 200);
  assert.equal(end.maxCount, 36);
  assert.deepEqual(binsFor(trace.differences).map((bin) => bin.points).slice(0, 3), [-16, -12, -8]);
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: the histogram never exceeds the resamples completed, tiles match the shown resample', () => {
  let sawTiles = false;
  let previousCompleted = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.completed >= previousCompleted, `completed never falls at ${t}`);
    previousCompleted = scene.completed;
    assert.equal(scene.bins.reduce((total, bin) => total + bin.count, 0), scene.completed, `histogram total at ${t}`);
    if (scene.current) {
      const drawn = scene.items.reduce((total, item) => total + item.drawn, 0);
      assert.equal(drawn, scene.current.indices.length, `drawn counts at ${t}`);
      assert.ok(scene.current.indices.length <= 25);
      if (scene.current.indices.length > 0) sawTiles = true;
      const shown = trace.resamples[scene.current.number - 1];
      assert.equal(scene.current.difference, shown.difference);
    }
    if (scene.beat === 'intro') assert.equal(scene.completed, 0);
    if (scene.intervalAlpha > 0) assert.ok(scene.completed === 200, 'the interval appears only once every resample is in');
  }
  assert.ok(sawTiles);
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.2, 4, 4.8, 5.5, 8.5, 12, 13.5, 14.2, 16, 18, 19.5, 21, 23, 24.5, 26, 27.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
