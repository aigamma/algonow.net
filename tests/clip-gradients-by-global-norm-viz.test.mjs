// The lesson animation must replay the real clipping: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, globalNorm, clipByGlobalNorm, applyUpdate, W, H } from '../scenarios/clip-gradients-by-global-norm/visuals/gradClipModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/clip-gradients-by-global-norm/python/fixtures/gradients.json');
const expected = read('../scenarios/clip-gradients-by-global-norm/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const beatOf = (kind) => timeline.beats.find((beat) => beat.kind === kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(globalNorm([[3, 4]]), 5);
  assert.throws(() => clipByGlobalNorm(data.grads, 0), /must be positive/);
  assert.throws(() => applyUpdate(data.params, [[3, 4], [12], [1]], 0.1), /parameter group 2 has 2 values but 1 gradients/);
  const small = clipByGlobalNorm(data.small_grads, data.max_norm);
  assert.equal(small.scale, 1);
  assert.deepEqual(small.clipped, data.small_grads);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => !['intro', 'practice-intro', 'practice'].includes(b.kind))) assert.ok(beat.duration >= 2.5 && beat.duration <= 3.2, `${beat.kind}: about three seconds per decision`);
  assert.deepEqual(kinds, ['intro', 'squares', 'scale', 'clip', 'step', 'ordinary', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the per-group result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['moved the parameters 1.3038', 'ordinary step of 0.1304', '9 + 16 + 0 + 144 + 1 = 170', 'square root is 13.0384', '5.0 / 13.0384 = 0.3835',
    '3.0 becomes 1.1504', '12.0 becomes 4.6018', 'norm is now 5.0000', '1.3038 without clipping, 0.5000 with clipping', 'global norm 1.3038 is under the max',
    'scaled by 0.4167 to [0.0000, 5.0000]', 'Together the norm is 7.1414', 'the step is 0.7141']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.beat, 'practice');
  assert.deepEqual(end.practice.groups.map((g) => +g.shown.toFixed(4)), [5, 5, 1]);
  assert.equal(end.practice.combined, expected.per_group.global_norm_after);
  assert.deepEqual(end.rows.map((row) => +row.shown.toFixed(4)), [3, 4, 0, 5, 1]);
  assert.equal(end.finished, true);
});

test('the shrink walks the real trace: at the end of the clip beat every bar shows its clipped value', () => {
  const clip = beatOf('clip');
  const scene = sceneAt(timeline, trace, data, clip.start + clip.duration - 0.01);
  assert.deepEqual(scene.rows.map((row) => +row.shown.toFixed(6)), expected.batches[0].clipped.flat());
  assert.ok(Math.abs(scene.normBar.length - expected.batches[0].norm * expected.batches[0].scale) < 1e-6);
  const step = beatOf('step');
  const stepScene = sceneAt(timeline, trace, data, step.start + step.duration - 0.01);
  assert.deepEqual([+stepScene.arrows.without.toFixed(6), +stepScene.arrows.with.toFixed(6)], [expected.batches[0].step_without, expected.batches[0].step_with]);
  const ordinary = beatOf('ordinary');
  const ordinaryScene = sceneAt(timeline, trace, data, ordinary.start + ordinary.duration - 0.01);
  assert.equal(ordinaryScene.batchName, 'ordinary');
  assert.deepEqual(ordinaryScene.rows.map((row) => row.shown), data.small_grads.flat());
  assert.equal(ordinaryScene.readout.scale, 1);
});

test('every sampled moment is consistent: bars stay between the clipped and original values, the norm bar never exceeds the norm, captions present', () => {
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.rows.length, 5);
    for (const row of scene.rows) {
      const low = Math.min(row.value, row.clipped, 0), high = Math.max(row.value, row.clipped);
      assert.ok(row.shown >= low - 1e-9 && row.shown <= high + 1e-9, `row ${row.group}.${row.index} at ${t}: ${row.shown}`);
    }
    assert.ok(scene.normBar.length >= -1e-9 && scene.normBar.length <= scene.normBar.full + 1e-9, `norm bar at ${t}`);
    if (scene.practice) for (const g of scene.practice.groups) assert.ok(g.shown <= g.norm + 1e-9 && g.shown >= Math.min(g.norm, data.max_norm) - 1e-5, `group bar at ${t}: ${g.shown}`);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 5, 6.5, 9, 10.5, 12.5, 14, 16, 18, 20, 21.5, 23, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
