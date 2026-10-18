// The lesson animation must replay the real loop: its trace is compared with
// the fixture the Python suite derives from solution.py, its timeline must be
// slow, and its scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, W, H } from '../scenarios/rag-chunk-boundary-recall/visuals/packBlocksModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/rag-chunk-boundary-recall/python/fixtures/blocks.json');
const expected = read('../scenarios/rag-chunk-boundary-recall/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
});

test('the timeline is a reading pace and complete: no beat under a second, under a minute in all', () => {
  assert.ok(timeline.duration >= 35 && timeline.duration <= 60, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'step' || b.kind === 'reject')) assert.ok(beat.duration >= 3.5 && beat.duration <= 5, 'about four seconds per decision');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'step').length, 5);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'reject').length, 1);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'line').length, 5);
});

test('captions state the measured arithmetic and the final scene shows six chunks within budget', () => {
  const captions = timeline.beats.map((beat) => beat.caption).join(' ');
  for (const phrase of ['74 + 2 + 119 = 195', '195 + 2 + 97 = 294', '193 would have fit', '281 with its heading', '136 + 2 + 94 = 232', '108 + 2 + 51 = 161']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.bars.map((bar) => Math.round(bar.size)), [106, 195, 110, 88, 136, 161]);
  assert.ok(end.bars.every((bar) => bar.size <= data.max_chars));
  assert.equal(end.rejected, null, 'the rejected attempt has faded out by the end');
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: bars never pass their targets, the rejection reaches 281, at most six bars', () => {
  let sawRejection = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.bars.length <= 6, `bars at ${t}`);
    for (const bar of scene.bars) {
      assert.ok(bar.size <= bar.target + 1e-9, `bar ${bar.row} at ${t}: ${bar.size} > ${bar.target}`);
      assert.ok(bar.size <= data.max_chars + 1e-9, `a chunk bar may never pass the budget (${bar.size} at ${t})`);
    }
    if (scene.rejected) {
      assert.ok(scene.rejected.size <= 281 + 1e-9);
      assert.equal(scene.rejected.row, scene.bars.length, 'the attempt sits in the next free row');
      if (Math.round(scene.rejected.size) === 281) sawRejection = true;
    }
  }
  assert.ok(sawRejection, 'the rejected block must be shown reaching 281');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 3.4, 4, 4.6, 5.5, 7.5, 12, 20, 24.5, 26, 27.4, 28.5, 30, 36, 42, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
