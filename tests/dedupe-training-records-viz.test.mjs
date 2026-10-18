// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, normalize, W, H } from '../scenarios/dedupe-training-records/visuals/dedupeModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/dedupe-training-records/python/fixtures/records.json');
const expected = read('../scenarios/dedupe-training-records/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.steps.map((step) => step.decision), ['kept', 'kept', 'kept', 'dropped', 'kept', 'dropped', 'dropped', 'kept']);
  assert.deepEqual(trace.practice.steps.map((step) => step.decision), ['kept', 'overlap', 'kept', 'dropped', 'overlap', 'overlap', 'dropped', 'kept']);
  assert.equal(normalize('  Rotate,   the\tkey!!  '), 'rotate the key');
  assert.equal(normalize('E4031: key not active'), 'e4031 key not active');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'record')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat for the repetitive records');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'record').length, 8);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'overlap').length, 1);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'practice').length, 1);
});

test('captions state the measured keys and decisions, and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => beat.caption + (beat.captionLate || '')).join(' ');
  for (const phrase of ['normalizes to "how do i rotate a key"', 'duplicate of r1', 'duplicate of r2', 'r4 "how do i rotate a key"',
    'r7 "How do I rotate a key ?"', '2 of 3 have a twin', '(r2, r5)', '5 kept, 3 dropped', '3 kept (r1, r3, r8)', '2 duplicates (r4, r7)',
    '3 overlaps (r2, r5, r6)', 'r6 shares the key of r2', 'exact-string dedupe', 'has 8 members']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.setRows.map((row) => row.id), ['r1', 'r2', 'r3', 'r5', 'r8']);
  assert.deepEqual(atOutro.keptIds.map((entry) => entry.id), ['r1', 'r2', 'r3', 'r5', 'r8']);
  assert.deepEqual(atOutro.links.map((link) => [data.records[link.card].id, data.records[link.twin].id]), [['r4', 'r1'], ['r6', 'r2'], ['r7', 'r1']]);
  assert.deepEqual(atOutro.evalRows.map((row) => (row.match === null ? null : atOutro.setRows[row.match].id)), ['r2', null, 'r5']);
  assert.deepEqual(atOutro.counts, { kept: 5, dropped: 3, overlaps: 0 });
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.keptIds.filter((entry) => entry.alpha > 0.5).map((entry) => entry.id), ['r1', 'r3', 'r8']);
  assert.deepEqual(end.cards.filter((card) => card.state === 'overlap').map((card) => card.id), ['r2', 'r5', 'r6']);
  assert.deepEqual(end.counts, { kept: 3, dropped: 2, overlaps: 3 });
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: bounded sets, monotonic counts until the practice, a ghost that travels', () => {
  const practice = timeline.beats.find((beat) => beat.kind === 'practice');
  let previousKept = 0;
  let sawGhost = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.setRows.length <= 5 && scene.keptIds.length <= 5 && scene.links.length <= 3, `bounds at ${t}`);
    if (t < practice.start) {
      assert.ok(scene.counts.kept >= previousKept, `monotonic kept at ${t}`);
      previousKept = scene.counts.kept;
    }
    for (const row of scene.setRows) assert.ok(row.alpha >= 0 && row.alpha <= 1 && row.overlap >= 0 && row.overlap <= 1);
    for (const card of scene.cards) assert.ok(['waiting', 'kept', 'dropped', 'overlap'].includes(card.state));
    if (scene.keyBox) for (const stage of scene.keyBox.stages) assert.ok(stage.alpha >= 0 && stage.alpha <= 1);
    if (scene.ghost) {
      sawGhost = true;
      assert.ok(scene.ghost.progress >= 0 && scene.ghost.progress <= 1);
    }
  }
  assert.ok(sawGhost, 'the key must be seen travelling to the set');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.2, 3.9, 4.6, 5.5, 8.4, 11.2, 13, 16, 18.7, 21.5, 24.4, 25.5, 27, 28.5, 30.5, 31.5, 33, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'bezierCurveTo']) assert.ok(calls.has(needed), needed);
});
