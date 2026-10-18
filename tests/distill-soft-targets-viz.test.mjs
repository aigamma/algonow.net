// The lesson animation must replay the real arithmetic: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline must
// be a reading pace, and its scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, softmax, W, H } from '../scenarios/distill-soft-targets/visuals/distillationModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/distill-soft-targets/python/fixtures/logits.json');
const expected = read('../scenarios/distill-soft-targets/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const sum = (values) => values.reduce((a, b) => a + b, 0);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.throws(() => softmax([1, 2, 3, 4], 0), /temperature must be positive/);
  const huge = softmax([1000, 999, 998, 997], 1);
  assert.ok(Math.abs(sum(huge) - 1) < 1e-12 && huge.every(Number.isFinite), 'the max trick survives large logits in the browser too');
});

test('the timeline is a reading pace and complete: no beat under a second, under a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  const sharpen = timeline.beats.filter((beat) => beat.kind === 'sharpen');
  assert.equal(sharpen.length, 3);
  for (const beat of sharpen) assert.ok(beat.duration >= 2 && beat.duration <= 3.5, 'two to three and a half seconds per example');
  for (const kind of ['intro', 'soften', 'student', 'outro', 'practice-intro', 'practice', 'final']) {
    assert.equal(timeline.beats.filter((beat) => beat.kind === kind).length, 1, kind);
  }
});

test('captions carry the measured numbers and the final scene shows every distribution and loss', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['0.174, 0.039, 0.779, 0.009', 'outage 0.329 next to access 0.422', '0.389, 0.494, 0.125', '0.627, 0.427, 0.952',
    'Mean soft loss 0.336, mean hard loss 0.669', '0.460, 0.474, 0.373', 'mean 0.436', 'subtract the largest (3.5)']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.finished, true);
  assert.equal(end.temperature, 2);
  assert.equal(end.alphaLabel, 'alpha = 0.7');
  assert.equal(end.panels.length, 3);
  end.panels.forEach((panel, index) => {
    assert.deepEqual(panel.teacher, trace.examples[index].teacher_t2);
    assert.deepEqual(panel.student, trace.examples[index].student_t2);
    assert.equal(panel.losses.lossAlpha, 1);
    assert.equal(panel.losses.blendAlpha, 1);
    assert.equal(panel.losses.blended, trace.blend.per_example[index]);
  });
});

test('every sampled moment is consistent: bars stay probabilities, the top class never changes, T only rises', () => {
  let previousT = 0;
  let sawSpotlight = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.temperature >= previousT - 1e-9, `temperature falls at ${t}`);
    previousT = scene.temperature;
    assert.equal(scene.panels.length, 3);
    for (const panel of scene.panels) {
      assert.equal(panel.teacher.length, 4);
      for (const value of panel.teacher) assert.ok(value >= 0 && value <= 1 + 1e-9, `teacher bar ${value} at ${t}`);
      assert.ok(Math.abs(sum(panel.teacher) - 1) < 1e-6, `teacher bars sum ${sum(panel.teacher)} at ${t}`);
      const top = panel.teacher.indexOf(Math.max(...panel.teacher));
      assert.equal(top, panel.goldIndex, `the top class moved off the gold class at ${t}`);
      if (panel.student) for (const value of panel.student) assert.ok(value >= 0 && value <= 1 + 1e-9, `student bar ${value} at ${t}`);
      if (panel.spotlight) sawSpotlight = true;
    }
  }
  assert.ok(sawSpotlight, 'example 3 must be spotlighted during the outro');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.5, 5, 7, 9.5, 12, 13.5, 15.5, 18, 20, 22, 24, 25.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
