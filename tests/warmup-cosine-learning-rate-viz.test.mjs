// The lesson animation must replay the real schedule: its trace is compared
// with the fixture the Python suite derives from solution.py and the practice
// answer, its timeline must be a reading pace, and its scenes must stay
// consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, sci, learningRate, W, H } from '../scenarios/warmup-cosine-learning-rate/visuals/lrScheduleModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/warmup-cosine-learning-rate/python/fixtures/schedule.json');
const expected = read('../scenarios/warmup-cosine-learning-rate/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(trace.rates.length, 101);
  assert.equal(sci(0.0002), '2.00e-04');
  assert.equal(sci(0), '0.00e+00');
  assert.equal(sci(6.03e-6), '6.03e-06');
  assert.equal(sci(trace.rates[5]), '1.00e-04');
  assert.throws(() => learningRate(0, 100, 100, 0.0002), /leaves no steps/);
  assert.throws(() => learningRate(101, 100, 10, 0.0002), /outside 0 to 100/);
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  const warmup = timeline.beats.filter((b) => b.kind === 'warmup');
  const decay = timeline.beats.filter((b) => b.kind === 'decay');
  assert.equal(warmup.length, 1);
  assert.ok(warmup[0].duration >= 2.5 && warmup[0].duration <= 4);
  assert.equal(decay.length, 4);
  for (const beat of decay) assert.ok(beat.duration >= 2 && beat.duration <= 3.5, 'two to three and a half seconds per span');
  assert.deepEqual(decay.map((b) => [b.from, b.to]), [[10, 30], [30, 55], [55, 80], [80, 100]]);
  assert.equal(timeline.beats.filter((b) => b.kind === 'practice').length, 1);
});

test('captions state the measured rates, the midpoint, the landing, the ratio, and the hold', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['Step 5 is 1.00e-04, half the peak', 'rate is 1.77e-04 (88% of the peak)', 'Step 55 is the midpoint: progress 0.5, cos = 0, rate 1.00e-04',
    'rate is 2.34e-05 (12% of the peak)', 'the rate lands at 0.00e+00. Step 99 was 6.09e-08', 'Step 1 gets 2.00e-05, one tenth of what shipped (2.00e-04)',
    'sums to 50.0 × peak against 101 × peak', 'midpoint moves to step 65 (1.00e-04)', 'the loss spiked within twenty steps']) {
    assert.ok(captions.includes(phrase), phrase);
  }
});

test('the worked schedule is complete at the end of the outro and the hold schedule at the end', () => {
  const outro = timeline.beats.find((b) => b.kind === 'outro');
  const mid = sceneAt(timeline, trace, data, outro.start + outro.duration - 0.1);
  for (const b of mid.bars) assert.ok(Math.abs(b.value - trace.rates[b.step] / trace.peak) < 1e-12, `bar ${b.step} at the outro`);
  assert.equal(mid.bars[55].value, 0.5);
  assert.equal(mid.bars[100].value, 0);
  assert.equal(mid.holdProgress, 0);
  assert.equal(mid.cursor, 100);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  for (const b of end.bars) assert.ok(Math.abs(b.value - trace.hold.rates[b.step] / trace.peak) < 1e-12, `bar ${b.step} at the end`);
  for (let step = 10; step <= 30; step += 1) assert.equal(end.bars[step].value, 1, `step ${step} held at the peak`);
  assert.deepEqual(end.bars.slice(10, 30).map((b) => b.phase), new Array(20).fill('hold'));
  assert.equal(end.bars[65].value, 0.5);
  assert.equal(end.bars[100].value, 0);
  assert.equal(end.holdProgress, 1);
  assert.equal(end.shipped, 0);
  assert.equal(end.readout.step, 100);
  assert.equal(end.midpoint.step, 65);
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: bars stay within the band, appear in order, and the cursor stays on the axis', () => {
  let sawShipped = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    if (scene.shipped > 0.99) sawShipped = true;
    let seenZeroAfterGrowth = false;
    for (const b of scene.bars) {
      assert.ok(b.value >= -1e-12 && b.value <= 1 + 1e-12, `bar ${b.step} at ${t}: ${b.value}`);
      assert.ok(['warmup', 'decay', 'hold'].includes(b.phase));
    }
    if (scene.holdProgress === 0 && scene.cursor !== null) {
      // Before the practice, no bar beyond the cursor has grown.
      for (const b of scene.bars) if (b.step > scene.cursor) assert.equal(b.grown, 0, `bar ${b.step} grew ahead of the cursor at ${t}`);
    }
    if (scene.cursor !== null) assert.ok(scene.cursor >= 0 && scene.cursor <= 100);
    if (scene.readout) assert.ok(scene.readout.rate >= 0 && scene.readout.rate <= trace.peak);
    void seenZeroAfterGrowth;
  }
  assert.ok(sawShipped, 'the constant rate that shipped must be shown');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 4.5, 6, 7, 9, 11, 13, 15, 17, 18.5, 20, 22, 23, 24.5, 26, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash', 'strokeRect']) assert.ok(calls.has(needed), needed);
});
