// The lesson animation must replay the real estimator: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, comb, passAtK, passAllK, combinations, W, H } from '../scenarios/pass-at-k-estimator/visuals/passAtKModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/pass-at-k-estimator/python/fixtures/problems.json');
const expected = read('../scenarios/pass-at-k-estimator/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(comb(5, 3), 10);
  assert.equal(comb(5, 0), 1);
  assert.equal(comb(3, 5), 0);
  assert.equal(passAtK(5, 2, 3), 0.9);
  assert.equal(passAtK(5, 3, 3), 1);
  assert.equal(passAllK(5, 4, 3), 0.4);
  assert.equal(passAllK(5, 2, 3), 0);
  assert.throws(() => passAtK(5, 2, 6), /k must be between 1 and n/);
  assert.throws(() => passAllK(5, 6, 1), /c must be between 0 and n/);
  assert.equal(combinations(5, 3).length, 10);
  assert.deepEqual(combinations(4, 2), [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per table row');
  assert.equal(timeline.beats.filter((b) => b.kind === 'row').length, data.problems.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'row'), ['intro', 'samples', 'subsets', 'ratio', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['5 of 6 problems (0.833)', 'p5 topological sort: 2 of 5 samples passed', '9 hold at least one passing sample', 'pass@3 for p5 = 9/10 = 0.900',
    '(10 - 1)/10', 'p3 LRU cache, 1 of 5 passed: pass@1 = (5 - 4)/5 = 0.200; pass@3 = (10 - 4)/10 = 0.600; pass@5 = 1.000 (only 4 failures',
    'p4 email check, 0 of 5 passed: pass@1 = (5 - 5)/5 = 0.000', 'Means: pass@1 0.500, pass@3 0.750, pass@5 0.833', 'passes 0.500 of the problems',
    'p6 binary search, 4 of 5 passed: 4 of the 10 subsets of 3 are all passes', 'all@3 = C(4,3)/C(5,3) = 0.400', 'all@1 0.500, all@3 0.250, all@5 0.167']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const ratio = timeline.beats.find((beat) => beat.kind === 'ratio');
  const atRatio = sceneAt(timeline, trace, data, ratio.start + ratio.duration - 0.01);
  assert.equal(atRatio.subsets.filter((s) => s.alpha > 0.99).length, 10);
  assert.equal(atRatio.subsets.filter((s) => s.counts).length, 9);
  assert.equal(atRatio.counter.hits, 9);
  assert.equal(atRatio.rows.filter((row) => row.alpha > 0).length, 0, 'the table is still empty at the ratio');
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + outro.duration - 0.01);
  assert.equal(atOutro.rows.filter((row) => row.alpha > 0.99).length, 6);
  assert.deepEqual(atOutro.rows.map((row) => row.scores), expected.rows.map((row) => row.scores));
  assert.equal(atOutro.meansAlpha, 1);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.mode, 'all');
  assert.equal(end.counter.problem, 'p6');
  assert.equal(end.subsets.filter((s) => s.counts).length, 4);
  assert.deepEqual(end.allRows.map((row) => row.scores), expected.all_k.rows.map((row) => row.scores));
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: alphas bounded, rows reveal in order, subsets never shrink before the practice', () => {
  const practice = timeline.beats.find((beat) => beat.kind === 'practice');
  let lastVisible = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    for (const row of scene.rows) assert.ok(row.alpha >= 0 && row.alpha <= 1);
    for (let i = 1; i < scene.rows.length; i += 1) assert.ok(scene.rows[i].alpha <= scene.rows[i - 1].alpha + 1e-9, `rows reveal in order at ${t}`);
    assert.equal(scene.samples.length, 5);
    assert.equal(scene.subsets.length, 10);
    if (t < practice.start) { assert.ok(scene.visibleSubsets >= lastVisible, `subsets shrank at ${t}`); lastVisible = scene.visibleSubsets; }
    assert.ok(scene.counter.estimate >= 0 && scene.counter.estimate <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 5, 6, 8, 10, 12, 13.5, 16, 20, 24, 27, 29, 31, 33, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
