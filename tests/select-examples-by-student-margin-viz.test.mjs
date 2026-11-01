// The lesson animation must replay the real margin selection: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, score, entropy, select, W, H } from '../scenarios/select-examples-by-student-margin/visuals/marginModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/select-examples-by-student-margin/python/fixtures/candidates.json');
const expected = read('../scenarios/select-examples-by-student-margin/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.picked, ['u4', 'u6', 'u2']);
  assert.deepEqual(trace.ranking, ['u4', 'u6', 'u2', 'u7', 'u3', 'u8', 'u5', 'u1']);
  assert.deepEqual(trace.practice.picked, ['u4', 'u6', 'u3']);
  assert.deepEqual(score([0.34, 0.33, 0.33], data.routes), { top: 'billing', second: 'outage', margin: 0.34 - 0.33 });
  assert.throws(() => score([0.6, 0.6, 0.1], data.routes), /sum to 1/);
  assert.throws(() => score([0.5, 0.5], data.routes), /2 probabilities for 3 routes/);
  assert.throws(() => select(data.candidates, data.routes, 9), /budget/);
  assert.ok(Math.abs(entropy([1 / 3, 1 / 3, 1 / 3], data.routes).entropy - Math.log(3)) < 1e-12);
  assert.equal(entropy([1, 0, 0], data.routes).entropy, 0);
});

test('the timeline is a reading pace and complete: no beat under a second, about thirty seconds in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 40, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) assert.ok(beat.duration >= 1.5 && beat.duration <= 2.5, 'a steady beat per prompt');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'row').length, 8);
  assert.deepEqual(kinds.filter((kind) => kind !== 'row'), ['intro', 'rank', 'pick', 'shipped', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured probabilities, margins, picks, and means, and the final scene holds the practice order', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['The teacher budget covers 3', 'u1, u2, u3, mean margin 0.42', 'u1 at 0.87, the student already answers with confidence',
    'u1: billing 0.92, access 0.05, outage 0.03. Top billing, second access: margin 0.87, the student is sure',
    'u4: billing 0.34, access 0.33, outage 0.33. Top billing, second outage: margin 0.01, the student is torn',
    'u6: billing 0.39, access 0.21, outage 0.40. Top outage, second billing: margin 0.01',
    'Sorted by margin with ties broken by id: u4, u6, u2, u7, u3, u8, u5, u1', 'go to the teacher: u4, u6, u2, mean margin 0.02',
    'mean margin 0.42 against 0.02', 'Entropy ranks u4 (1.099) and u6 (1.061) first as before, then u3 (0.938) above u2 (0.898)', 'The picks become u4, u6, u3']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.measure, 'entropy');
  const order = [...end.rows].sort((a, b) => a.slot - b.slot).map((row) => row.id);
  assert.deepEqual(order, ['u4', 'u6', 'u3', 'u2', 'u7', 'u8', 'u5', 'u1']);
  assert.deepEqual(end.rows.filter((row) => row.picked).map((row) => row.id), ['u2', 'u3', 'u4', 'u6'].filter((id) => trace.practice.picked.includes(id)));
  assert.equal(end.scored, 8);
  assert.equal(end.finished, true);
});

test('each prompt beat ends with its bracket drawn, rows re-sort by margin in the rank beat, and picks appear in the pick beat', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.scored, beat.index + 1, `${expected.rows[beat.index].id} scored`);
    assert.equal(scene.rows[beat.index].bracket, 1);
    assert.equal(scene.rows[beat.index].slot, beat.index, 'arrival order until the rank beat');
    const early = sceneAt(timeline, trace, beat.start + 0.3);
    assert.ok(early.rows[beat.index].bracket > 0 && early.rows[beat.index].bracket < 1, 'the bracket is drawing early in the beat');
    assert.equal(early.pickAlpha, 0);
  }
  const ranked = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'rank').start + 2.5);
  const order = [...ranked.rows].sort((a, b) => a.slot - b.slot).map((row) => row.id);
  assert.deepEqual(order, expected.ranking);
  const picked = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'pick').start + 2);
  assert.equal(picked.pickAlpha, 1);
  assert.deepEqual(picked.rows.filter((row) => row.picked).map((row) => row.id), ['u2', 'u4', 'u6']);
  const shipped = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'shipped').start + 1.5);
  assert.equal(shipped.shippedAlpha, 1);
  assert.deepEqual(shipped.rows.filter((row) => row.shipped).map((row) => row.id), ['u1', 'u2', 'u3']);
});

test('every sampled moment is consistent: scored rows only accumulate, slots stay inside the list, captions present', () => {
  let scored = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.scored >= scored, `scored went backwards at ${t}`);
    scored = scene.scored;
    assert.equal(scene.rows.length, 8);
    for (const row of scene.rows) {
      assert.ok(row.slot >= -1e-9 && row.slot <= 7 + 1e-9, `slot ${row.slot} at ${t}`);
      assert.ok(row.bracket >= 0 && row.bracket <= 1 && row.alpha >= 0 && row.alpha <= 1);
    }
    for (const alpha of [scene.pickAlpha, scene.shippedAlpha, scene.practiceAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4, 6, 8.5, 11, 13.5, 15, 16.5, 18, 20, 22.5, 25, 27, 28.5, 30, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc', 'strokeRect']) assert.ok(calls.has(needed), needed);
});
