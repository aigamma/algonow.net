// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, klDivergence, jsDivergence, topRoute, W, H } from '../scenarios/kl-divergence-per-example/visuals/klDivergenceModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/kl-divergence-per-example/python/fixtures/examples.json');
const expected = read('../scenarios/kl-divergence-per-example/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(klDivergence([0.5, 0.5], [0.5, 0.5], data.tolerance, data.floor), 0);
  assert.throws(() => klDivergence([0.5, 0.3, 0.1], [0.4, 0.4, 0.2], data.tolerance, data.floor), /sums to/);
  assert.throws(() => klDivergence([1.2, -0.2], [0.5, 0.5], data.tolerance, data.floor), /negative/);
  const clipped = klDivergence([0.7, 0.2, 0.1], [0.7, 0.3, 0.0], data.tolerance, data.floor);
  assert.ok(Number.isFinite(clipped) && clipped > 1.5, 'a zero student probability is clipped, not infinite');
  const e2 = data.examples[1];
  assert.ok(Math.abs(jsDivergence(e2.teacher, e2.student, data.tolerance, data.floor) - jsDivergence(e2.student, e2.teacher, data.tolerance, data.floor)) < 1e-12);
  assert.equal(topRoute([0.1, 0.8, 0.1]), 1);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'example')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3.2, 'about three seconds per example');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'example').length, data.examples.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'example'), ['intro', 'rank', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the ranking, the verdict, and the JS values', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['4 of 4, 100 percent', 'e1: p times the log of p over q per route: billing +0.1079, access -0.0811, outage +0.0000; KL 0.0268',
    'e2: p times the log of p over q per route: billing -0.1386, access +0.3760, outage +0.0000; KL 0.2374', 'puts 0.8 on access and the student only 0.5',
    'e3: p times the log of p over q per route: billing -0.0553, access +0.0315, outage +0.0315; KL 0.0076',
    'e4: p times the log of p over q per route: billing -0.0487, access +0.0112, outage +0.0805; KL 0.0430',
    'Ranked worst first: e2 0.2374, e4 0.0430, e1 0.0268, e3 0.0076', 'Only e2 crosses the 0.2 line', 'Mean KL 0.0787',
    'the student gives access 0.5 where the teacher gives 0.8', 'JS: e2 0.0657, e4 0.0079, e1 0.0070, e3 0.0019']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.rankedOrder, ['e2', 'e4', 'e1', 'e3']);
  assert.deepEqual(end.inputOrder.map((id) => end.slots[id].position), [2, 0, 3, 1], 'e1 sits third, e2 first, e3 fourth, e4 second');
  assert.ok(end.rows.every((row) => row.termsProgress === 1 && row.klAlpha === 1));
  assert.equal(end.jsAlpha, 1);
  assert.equal(end.outroAlpha, 1);
  assert.equal(end.worstId, 'e2');
  assert.equal(end.finished, true);
});

test('each example beat ends with its terms fully drawn and its divergence shown, and nothing later is shown early', () => {
  const exampleBeats = timeline.beats.filter((b) => b.kind === 'example');
  exampleBeats.forEach((beat, index) => {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    assert.equal(scene.rows[index].termsProgress, 1, `terms of e${index + 1}`);
    assert.equal(scene.rows[index].klAlpha, 1, `divergence of e${index + 1}`);
    for (let later = index + 1; later < exampleBeats.length; later += 1) {
      assert.equal(scene.rows[later].termsProgress, 0, `e${later + 1} waits its turn`);
      assert.equal(scene.slots[`e${later + 1}`].alpha, 0);
    }
    assert.equal(scene.thresholdAlpha, 0, 'the threshold appears only in the ranking beat');
    assert.equal(scene.jsAlpha, 0, 'JS appears only in the practice');
  });
});

test('every sampled moment is consistent: slots stay within the panel, progress never runs backwards, captions present', () => {
  let lastDone = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    for (const id of scene.inputOrder) {
      const slot = scene.slots[id];
      assert.ok(slot.position >= 0 && slot.position <= 3, `slot ${id} at ${t}`);
      assert.ok(slot.alpha >= 0 && slot.alpha <= 1);
    }
    const done = scene.rows.filter((row) => row.termsProgress === 1).length;
    assert.ok(done >= lastDone, `an example lost its terms at ${t}`);
    lastDone = done;
    assert.equal(scene.rows.length, data.examples.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4.5, 6.5, 9, 12, 14.9, 15.5, 16.5, 18.5, 20, 21.5, 23, 25, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'strokeRect']) assert.ok(calls.has(needed), needed);
});
