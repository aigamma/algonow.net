// The lesson animation must replay the real checks: its trace is compared with
// the fixture the Python suite derives from solution.py, its timeline must be
// a reading pace, and its scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, W, H } from '../scenarios/validate-jsonl-records/visuals/jsonlValidationModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/validate-jsonl-records/python/fixtures/lines.json');
const expected = read('../scenarios/validate-jsonl-records/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.steps.map((step) => step.outcome), ['kept', 'kept', 'rejected', 'kept', 'rejected', 'rejected', 'kept', 'rejected', 'blank']);
  assert.deepEqual(trace.practice.steps.map((step) => step.reason).slice(8), ['duplicate prompt', null]);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'line')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat for the repetitive lines');
  for (const beat of timeline.beats.filter((b) => b.kind === 'practice-line')) assert.ok(beat.duration >= 2.5 && beat.duration <= 3.5);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'line').length, 8);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'blank').length, 1);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'practice-line').length, 1);
});

test('captions state the measured lines and reasons, and the final scene shows four kept and five rejected', () => {
  const captions = timeline.beats.map((beat) => beat.caption + (beat.captionLate || '')).join(' ');
  for (const phrase of ['Line 3: json.loads raises', 'malformed json', 'Line 5:', 'missing answer', 'Line 6:', 'empty answer',
    'Line 8:', '345 characters, over the limit of 300', 'Line 9 is blank', 'Line 9: passes every check', 'kept from line 1', 'duplicate prompt',
    '4 kept, 4 rejected out of 8 records', 'Line 3 is malformed, so the job crashed']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.kept.map((row) => row.line), [1, 2, 4, 7]);
  assert.deepEqual(atOutro.rejected.map((row) => [row.line, row.reason]), [[3, 'malformed json'], [5, 'missing answer'], [6, 'empty answer'], [8, 'answer too long']]);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.kept.length, 4);
  assert.deepEqual(end.rejected.map((row) => row.line), [3, 5, 6, 8, 9]);
  assert.equal(end.tally.reduce((sum, entry) => sum + entry.count, 0), 5);
  assert.equal(end.rows.find((row) => row.practice).alpha, 1, 'the practice line is shown at the end');
  assert.equal(end.checks.filter((check) => check.alpha > 0).length, 7, 'the seventh check is shown at the end');
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: counts never exceed the trace, never decrease, and the tally matches the rejected stack', () => {
  let previousKept = 0;
  let previousRejected = 0;
  let sawChip = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.kept.length <= 4 && scene.rejected.length <= 5, `stacks at ${t}`);
    assert.ok(scene.kept.length >= previousKept && scene.rejected.length >= previousRejected, `monotonic at ${t}`);
    previousKept = scene.kept.length;
    previousRejected = scene.rejected.length;
    assert.equal(scene.tally.reduce((sum, entry) => sum + entry.count, 0), scene.rejected.length, `tally at ${t}`);
    for (const check of scene.checks) assert.ok(['idle', 'pass', 'fail'].includes(check.state));
    assert.ok(scene.checks.filter((check) => check.state === 'fail').length <= 1, `at most one failed check at ${t}`);
    for (const row of scene.rows) assert.ok(Number.isFinite(row.slot) && row.alpha >= 0 && row.alpha <= 1);
    if (scene.ghost) {
      sawChip = true;
      for (const value of [scene.ghost.toGate, scene.ghost.toStack, scene.ghost.alpha]) assert.ok(value >= 0 && value <= 1);
    }
  }
  assert.ok(sawChip, 'the chip must be seen travelling');
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.2, 3.9, 4.6, 5.4, 8.4, 9.2, 10.5, 13.8, 16.6, 19.2, 22, 24.2, 25.8, 27.5, 28.8, 30, 31, 33, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc']) assert.ok(calls.has(needed), needed);
});
