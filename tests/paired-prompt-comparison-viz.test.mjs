// The lesson animation must replay the real comparison: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline must
// be a reading pace, and its scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, cellRect, W, H } from '../scenarios/paired-prompt-comparison/visuals/pairedEvalModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/paired-prompt-comparison/python/fixtures/tickets.json');
const expected = read('../scenarios/paired-prompt-comparison/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const inside = (chip, cell) => {
  const r = cellRect(cell);
  return chip.x >= r.x && chip.x + chip.w <= r.x + r.w + 1e-6 && chip.y >= r.y && chip.y + chip.h <= r.y + r.h + 1e-6;
};

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  const items = timeline.beats.filter((beat) => beat.kind === 'item');
  assert.equal(items.length, 9);
  for (const beat of items) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'two to three seconds per ticket');
  for (const kind of ['intro', 'totals', 'outro', 'practice-intro', 'practice-move', 'practice-final']) {
    assert.equal(timeline.beats.filter((beat) => beat.kind === kind).length, 1, kind);
  }
});

test('captions state the measured numbers and the final scene shows the normalized result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['5 of 9 (56%)', '6 of 9 (67%)', '7 of 9 (78%)', 'a regression', 't3 outage and t5 outage', '"Outage " becomes "outage"', 'both right 4, regressions 1 (t3 outage)']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.finished, true);
  assert.deepEqual(Object.fromEntries(Object.entries(end.cells).map(([cell, info]) => [cell, info.count])), { both: 4, only_a: 1, only_b: 3, neither: 1 });
  assert.equal(Math.round(end.bars.b.value), 7);
  assert.equal(Math.round(end.bars.a.value), 5);
  assert.equal(end.chips.length, 9);
  assert.ok(end.chips.every((chip) => chip.state === 'placed' && inside(chip, chip.cell)));
  assert.equal(end.chips.filter((chip) => chip.cell === 'both').length, 4);
  assert.equal(end.chips.find((chip) => chip.id === 't5').cell, 'both');
});

test('every sampled moment is consistent: nine chips, at most one moving, cells never over their counts', () => {
  let sawRegressionsFramed = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.chips.length, 9);
    assert.ok(scene.chips.filter((chip) => chip.active).length <= 1, `moving chips at ${t}`);
    for (const chip of scene.chips) {
      assert.ok(Number.isFinite(chip.x) && Number.isFinite(chip.y) && chip.x >= 0 && chip.x + chip.w <= W && chip.y >= 0 && chip.y + chip.h <= H, `chip ${chip.id} at ${t}`);
      if (chip.state === 'placed') assert.ok(inside(chip, chip.cell), `${chip.id} placed outside ${chip.cell} at ${t}`);
    }
    for (const cell of ['both', 'only_a', 'only_b', 'neither']) {
      const placed = scene.chips.filter((chip) => chip.state === 'placed' && chip.cell === cell).length;
      assert.ok(placed <= Math.max(trace.counts[cell], trace.normalized.counts[cell]), `${cell} holds ${placed} at ${t}`);
      if (scene.cells[cell].count !== null) assert.ok(scene.cells[cell].count >= 0 && scene.cells[cell].count <= 9);
    }
    if (scene.bars) {
      assert.ok(scene.bars.a.value <= 9 + 1e-9 && scene.bars.b.value <= 9 + 1e-9);
      assert.ok(scene.bars.a.value >= 0 && scene.bars.b.value >= 0);
    }
    if (scene.cells.only_a.framed) sawRegressionsFramed = true;
  }
  assert.ok(sawRegressionsFramed, 'the regressions cell must be framed during the outro');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.2, 4, 6, 10.5, 15, 20, 24.6, 26, 28, 30.5, 32, 34, 35.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
