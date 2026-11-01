// The lesson animation must replay the real kappa computation: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, kappa, band, collapse, W, H } from '../scenarios/judge-agreement-cohens-kappa/visuals/kappaModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/judge-agreement-cohens-kappa/python/fixtures/grades.json');
const expected = read('../scenarios/judge-agreement-cohens-kappa/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.counts, { 'fail|fail': 2, 'fail|pass': 1, 'pass|fail': 1, 'pass|pass': 6 });
  assert.equal(trace.kappa, 0.52381);
  assert.equal(trace.always_pass.kappa, 0);
  assert.equal(trace.practice.collapsed.kappa, 0.5);
  assert.throws(() => kappa([]), /no graded answers/);
  assert.throws(() => kappa([{ id: 'a03', human: 'pass', judge: '' }]), /a03 has no judge grade/);
  assert.throws(() => kappa([{ id: 'a01', human: 'pass', judge: 'pass' }]), /undefined/);
  assert.equal(band(0), 'no better than chance');
  assert.equal(band(0.52), 'moderate');
  assert.equal(band(0.95), 'almost perfect');
  const collapsed = collapse(data.practice_grades, data.collapse);
  assert.equal(collapsed.filter((record) => record.judge === 'partial').length, 0);
  assert.equal(data.practice_grades[5].judge, 'partial', 'the input is left alone');
});

test('the timeline is a reading pace and complete: no beat under a second, about forty seconds in all', () => {
  assert.ok(timeline.duration >= 30 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) assert.ok(beat.duration >= 1.5 && beat.duration <= 2.5, 'a steady beat per answer');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'row').length, 10);
  assert.deepEqual(kinds.filter((kind) => kind !== 'row'), ['intro', 'totals', 'observed', 'chance', 'kappa', 'lazy', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured pairs and statistics, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['agrees with the human on 8 of the 10', 'report said 80 percent agreement', '7 of the 10 pass anyway',
    'a07: human pass, judge fail, disagree: the pass/fail cell, off the diagonal. Agreed so far: 6 of 7',
    'a10: human fail, judge fail, agree: the fail/fail cell, on the diagonal. Agreed so far: 8 of 10',
    'the human passed 7 and failed 3; the judge passed 7 and failed 3', 'diagonal holds 8 of the 10 answers, so 0.80',
    'fail 0.30 x 0.30 + pass 0.70 x 0.70 = 0.58', '(0.80 - 0.58) / (1 - 0.58) = 0.52, moderate',
    'passes everything agrees with the human on 7 of 10, 0.70', 'kappa 0.00, no better than chance',
    'Three labels: observed 0.67, chance 0.40, kappa 0.45', 'Partial counted as fail: observed 0.75, chance 0.50, kappa 0.50',
    'raised raw agreement by 0.08 but kappa by only 0.05']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.placed, 10);
  assert.equal(end.agreedSoFar, 8);
  assert.deepEqual(end.cells, expected.counts);
  assert.equal(end.practicePhase, 2);
  assert.ok(Math.abs(end.marker.value - 0.5) < 1e-9, 'the gauge ends on the collapsed kappa');
  assert.equal(end.finished, true);
});

test('each answer beat ends with its chip landed: the cell counts and the agreed count include it', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.placed, beat.index + 1, `${expected.items[beat.index].id} placed`);
    assert.equal(scene.flight, null);
    const landed = expected.items.slice(0, beat.index + 1);
    assert.equal(scene.agreedSoFar, landed.filter((item) => item.agree).length);
    assert.equal(Object.values(scene.cells).reduce((a, b) => a + b, 0), beat.index + 1);
    const flying = sceneAt(timeline, trace, beat.start + 0.4);
    assert.ok(flying.flight && flying.flight.index === beat.index && flying.flight.progress > 0 && flying.flight.progress < 1, 'the chip is in flight early in the beat');
    assert.equal(flying.placed, beat.index);
  }
  const afterKappa = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'kappa').start + 3.4);
  assert.ok(Math.abs(afterKappa.marker.value - expected.kappa) < 1e-9, 'the marker reaches kappa by the end of its beat');
  assert.equal(afterKappa.kappaAlpha, 1);
  const afterLazy = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'lazy').start + 2.4);
  assert.ok(Math.abs(afterLazy.marker.value) < 1e-9, 'the lazy judge sits at zero');
});

test('every sampled moment is consistent: cells only accumulate, counts bounded, captions present', () => {
  let placed = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.placed >= placed, `rows vanished at ${t}`);
    placed = scene.placed;
    assert.ok(scene.placed <= 10 && scene.agreedSoFar <= scene.placed);
    assert.equal(scene.items.length, 10);
    for (const alpha of [scene.totalsAlpha, scene.observedAlpha, scene.chanceAlpha, scene.kappaAlpha, scene.lazyAlpha, scene.practiceAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
    if (scene.marker) assert.ok(scene.marker.value >= -1e-9 && scene.marker.value <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 5, 8.2, 12, 16.4, 19.5, 21, 23, 25.5, 28, 30.5, 33, 35, 37, 38.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc', 'rotate']) assert.ok(calls.has(needed), needed);
});
