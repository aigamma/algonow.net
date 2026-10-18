// The lesson animation must replay the real training loop: its trace is
// compared with the fixture the Python suite derives from solution.py, its
// timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, fit, lossAndGradients, sigmoid, SHOWN_EPOCHS, W, H } from '../scenarios/calibrate-confidence-by-gradient-descent/visuals/calibrationFitModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/calibrate-confidence-by-gradient-descent/python/fixtures/answers.json');
const expected = read('../scenarios/calibrate-confidence-by-gradient-descent/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(sigmoid(0), 0.5);
  assert.throws(() => lossAndGradients([0.5], [2], 1, 0), /not 0 or 1/);
  assert.throws(() => lossAndGradients([0.5, 0.6], [1], 1, 0), /shorter/);
  const zero = fit(data.scores, data.labels, data.start, 0, 3);
  assert.deepEqual([zero.a, zero.b], [data.start.a, data.start.b], 'a zero learning rate moves nothing');
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'epoch')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'about two and a half seconds per shown epoch');
  assert.deepEqual(timeline.beats.filter((b) => b.kind === 'epoch').map((b) => b.epoch), SHOWN_EPOCHS);
  assert.deepEqual(kinds.filter((kind) => kind !== 'epoch'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the fitted and early-stopped curves', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['2 were right: 67 percent', 'loss 0.6941', 'moves a to 0.9694 and b to -0.0818', 'Epoch 50: a = 1.5246, b = -0.9634, loss 0.6129',
    'after its update a = 3.2320, b = -2.1830, loss 0.5533', '0.9 reads 0.674', '0.7 reads 0.520', '0.5 reads 0.362', '5 of the 8 answers now escalate instead of 2',
    'Early stop at epoch 87', 'improved by 0.000497', 'a = 2.0350, b = -1.3266']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.ok(Math.abs(end.curve.a - expected.fitted.a) < 1e-9 && Math.abs(end.curve.b - expected.fitted.b) < 1e-9, 'the curve ends at the fitted parameters');
  assert.equal(end.readout.fitted, true);
  assert.deepEqual([end.practiceCurve.a, end.practiceCurve.b], [expected.early_stop.a, expected.early_stop.b]);
  assert.equal(end.spark.upTo, data.epochs);
  assert.equal(end.ticks.filter((tick) => tick.escalates).length, expected.escalation.calibrated);
  assert.equal(end.finished, true);
});

test('the curve walks the real trace: at each shown epoch the parameters equal that epoch record', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'epoch')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const target = beat.to > data.epochs ? expected.fitted : expected.records[beat.to - 1];
    assert.ok(Math.abs(scene.curve.a - target.a) < 1e-9 && Math.abs(scene.curve.b - target.b) < 1e-9, `epoch ${beat.epoch}`);
    assert.ok(Math.abs(scene.readout.loss - target.loss) < 1e-9, `loss at epoch ${beat.epoch}`);
  }
});

test('every sampled moment is consistent: parameters stay within the run, the sparkline only grows, captions present', () => {
  const aValues = expected.records.map((r) => r.a).concat(expected.fitted.a);
  const bValues = expected.records.map((r) => r.b).concat(expected.fitted.b);
  let lastUpTo = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    if (scene.curve) {
      assert.ok(scene.curve.a >= Math.min(...aValues) - 1e-9 && scene.curve.a <= Math.max(...aValues) + 1e-9, `a at ${t}`);
      assert.ok(scene.curve.b >= Math.min(...bValues) - 1e-9 && scene.curve.b <= Math.max(...bValues) + 1e-9, `b at ${t}`);
    }
    assert.ok(scene.spark.upTo >= lastUpTo, `sparkline shrank at ${t}`);
    lastUpTo = scene.spark.upTo;
    assert.equal(scene.dots.length, data.scores.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 5, 8.2, 12, 16, 20, 21.2, 22, 24.5, 25.5, 27, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc']) assert.ok(calls.has(needed), needed);
});
