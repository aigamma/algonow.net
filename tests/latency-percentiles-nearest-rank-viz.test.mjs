// The lesson animation must replay the real percentile arithmetic: its trace
// is compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, percentile, interpolated, ordinal, W, H } from '../scenarios/latency-percentiles-nearest-rank/visuals/percentileModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/latency-percentiles-nearest-rank/python/fixtures/latencies.json');
const expected = read('../scenarios/latency-percentiles-nearest-rank/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const picks = timeline.beats.filter((beat) => beat.kind === 'pick');

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(percentile(data.deployments.old, 50), 330);
  assert.equal(percentile(data.deployments.new, 95), 1200);
  assert.equal(percentile(data.deployments.new, 99), 1400);
  assert.equal(percentile(data.deployments.old, 100), 370);
  assert.equal(percentile(data.deployments.new, 0.1), 160);
  assert.equal(percentile([417], 50), 417);
  assert.throws(() => percentile([], 50), /empty/);
  assert.throws(() => percentile(data.deployments.old, 0), /percentile/);
  assert.throws(() => percentile(data.deployments.old, 101), /percentile/);
  assert.ok(Math.abs(interpolated(data.deployments.new, 95) - 1210) < 1e-9);
  assert.ok(Math.abs(interpolated(data.deployments.old, 95) - 365.25) < 1e-9);
  assert.equal(interpolated(data.deployments.new, 100), 1400);
  assert.equal(Math.ceil(35 * 20 / 100), 7, 'multiplying first keeps whole ranks whole');
  assert.deepEqual([1, 2, 3, 4, 10, 11, 12, 13, 19, 20, 21].map(ordinal), ['1st', '2nd', '3rd', '4th', '10th', '11th', '12th', '13th', '19th', '20th', '21st']);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of picks) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per pick');
  assert.equal(picks.length, 6, 'three percentiles on two deployments');
  assert.deepEqual(picks.map((beat) => `${beat.key}:${beat.name}`), ['p50:old', 'p50:new', 'p95:old', 'p95:new', 'p99:old', 'p99:new']);
  assert.deepEqual(kinds.filter((kind) => kind !== 'pick'), ['intro', 'sort', 'sort', 'mean', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured ranks, values, and comparisons, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['20 samples per deployment', 'old: 295 to 370 ms', 'new: 160 to 1400 ms, 2 samples above a second',
    'compared means, 332.25 ms (old) versus 292.00 ms (new)', 'The two largest, 1200 and 1400 ms, land at ranks 19 and 20',
    'p50, old: 50 × 20 / 100 = 10.0, ceil 10: the 10th smallest of 20 is 330 ms (index 9)',
    'p95, new: 95 × 20 / 100 = 19.0, ceil 19: the 19th smallest of 20 is 1200 ms (index 18)',
    'p99, new: 99 × 20 / 100 = 19.8, ceil 20: the 20th smallest of 20 is 1400 ms (index 19), the maximum',
    'On the mean alone, new is 40.25 ms faster', 'mean: new is 40.25 ms faster. p50: new is 150 ms faster. p95: new is 835 ms slower. p99: new is 1030 ms slower',
    'The mean hid the tail: 2 of the 20 new samples are above a second',
    'position (20 - 1) × 95 / 100 = 18.05, between the 19th (1200 ms) and 20th (1400 ms) smallest: 1200 + 0.05 × 200 = 1210.00 ms',
    'Nearest rank said 1200 ms: the methods differ by 10.00 ms here; old p95 becomes 365.25 ms']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.practice.alpha, 1);
  assert.equal(end.practice.name, 'new');
  assert.equal(end.practice.position, 18.05);
  assert.equal(end.practice.value, expected.deployments.new.interpolated.p95.value);
  assert.equal(end.practice.nearest, 1200);
  for (const name of ['old', 'new']) {
    assert.equal(end.panels[name].meanAlpha, 1);
    assert.equal(end.panels[name].sortProgress, 1);
    assert.deepEqual(end.panels[name].highlights.map((h) => [h.key, h.rank, h.value, h.alpha]),
      ['p50', 'p95', 'p99'].map((key) => [key, expected.deployments[name].nearest[key].rank, expected.deployments[name].nearest[key].value, 1]));
  }
  assert.equal(end.finished, true);
});

test('each pick beat ends with its rank lit at the record value, after the cursor has travelled to that rank', () => {
  picks.forEach((beat, order) => {
    const record = expected.deployments[beat.name].nearest[beat.key];
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const lit = scene.panels[beat.name].highlights.find((h) => h.key === beat.key);
    assert.equal(lit.alpha, 1, `${beat.key} ${beat.name}`);
    assert.equal(lit.value, record.value);
    assert.equal(lit.rank, record.rank);
    const litCount = ['old', 'new'].flatMap((name) => scene.panels[name].highlights).filter((h) => h.alpha >= 1).length;
    assert.equal(litCount, order + 1, `${order + 1} picks lit after ${beat.key} ${beat.name}`);
    const middle = sceneAt(timeline, trace, data, beat.start + 0.7);
    assert.equal(middle.cursor.name, beat.name);
    assert.ok(middle.cursor.rank >= 1 && middle.cursor.rank <= record.rank, `cursor on its way to rank ${record.rank}`);
    assert.equal(middle.cursor.target, record.rank);
    const landed = sceneAt(timeline, trace, data, beat.start + 1.2);
    assert.ok(Math.abs(landed.cursor.rank - record.rank) < 1e-9, 'the cursor has reached the rank');
    const sortedBar = landed.panels[beat.name].bars.find((bar) => Math.abs(bar.x - record.index) < 1e-9);
    assert.equal(sortedBar.value, record.value, 'the lit slot holds the sample the function returns');
  });
});

test('every sampled moment is consistent: bars hold the samples, slots stay in range, lit picks only accumulate', () => {
  let lit = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    for (const name of ['old', 'new']) {
      const panel = scene.panels[name];
      assert.equal(panel.bars.length, 20);
      assert.deepEqual([...panel.bars.map((bar) => bar.value)].sort((a, b) => a - b), expected.deployments[name].sorted);
      for (const bar of panel.bars) assert.ok(bar.x >= -1e-9 && bar.x <= 19 + 1e-9 && bar.alpha >= 0 && bar.alpha <= 1, `bar ${bar.value} at ${t}`);
      if (panel.sortProgress >= 1) assert.deepEqual(panel.bars.map((bar) => bar.x), expected.deployments[name].samples.map((value, index) =>
        expected.deployments[name].samples.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v || p.i - q.i).findIndex((entry) => entry.i === index)));
      for (const highlight of panel.highlights) assert.ok(highlight.alpha >= 0 && highlight.alpha <= 1);
      assert.ok(panel.meanAlpha >= 0 && panel.meanAlpha <= 1);
    }
    const count = ['old', 'new'].flatMap((name) => scene.panels[name].highlights).filter((h) => h.alpha >= 1).length;
    assert.ok(count >= lit, `lit picks vanished at ${t}`);
    lit = count;
    if (scene.cursor) assert.ok(scene.cursor.rank >= 1 && scene.cursor.rank <= 20);
    if (scene.practice) assert.ok(scene.practice.alpha >= 0 && scene.practice.alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 4.5, 6, 7.5, 8.5, 10, 12.4, 14.8, 17.2, 19.6, 21.4, 22.5, 24, 26, 27.5, 29, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
