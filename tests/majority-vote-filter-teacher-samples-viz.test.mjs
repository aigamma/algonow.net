// The lesson animation must replay the real majority vote: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, normalize, tally, decide, filterSamples, tierOf, W, H } from '../scenarios/majority-vote-filter-teacher-samples/visuals/votesModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/majority-vote-filter-teacher-samples/python/fixtures/samples.json');
const expected = read('../scenarios/majority-vote-filter-teacher-samples/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.prompts.map((p) => p.action), ['kept', 'kept', 'dropped', 'kept', 'kept']);
  assert.deepEqual(trace.prompts[4].counts, [['billing', 3], ['outage', 1], ['access', 1]]);
  assert.equal(trace.shipped.wrong, 2);
  assert.deepEqual(trace.practice.counts, { gold: 1, silver: 3, dropped: 1 });
  assert.equal(normalize('  Billing '), 'billing');
  assert.deepEqual(tally(['a', 'b', 'b', 'c', 'a']), [['a', 2], ['b', 2], ['c', 1]]);
  assert.equal(decide({ id: 'x', votes: ['a', 'a', 'a', 'b', 'c'] }, 0.6).action, 'kept');
  assert.equal(decide({ id: 'x', votes: ['a', 'a', 'b', 'c', 'd'] }, 0.6).reason, 'agreement 0.40 below 0.60');
  assert.throws(() => decide({ id: 'p9', votes: [] }, 0.6), /no samples/);
  assert.throws(() => filterSamples(data.samples, 0.5), /threshold/);
  assert.equal(tierOf(1.0, 1.0), 'gold');
  assert.equal(tierOf(0.6, 0.6), 'silver');
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 22 && timeline.duration <= 40, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'prompt')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per prompt');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'prompt').length, 5);
  assert.deepEqual(kinds.filter((kind) => kind !== 'prompt'), ['intro', 'summary', 'shipped', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured tallies, decisions, and tiers, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['The threshold: 3 of 5 (0.60) must agree', "p3's samples never settled, and p5's first sample, outage, was a minority answer: 2 of 5 labels wrong or unsettled",
    'p1: billing 5: agreement 1.00, unanimous. Kept as billing', 'p2: access 3, outage 2: agreement 0.60, at the threshold. Kept as access',
    'p3: access 2, billing 2, outage 1: a tie at 2, the teacher could not settle it. Dropped', 'p4: outage 4, billing 1: agreement 0.80. Kept as outage',
    'p5: "Billing" and "billing " normalize to billing, so billing 3, outage 1, access 1: agreement 0.60', 'Without normalization every spelling would count once',
    'Kept 4 of 5', 'p3 got access for a prompt the teacher could not settle; p5 got outage, a minority answer', 'gold 1 (p1 at 1.00), silver 3 (p2, p4, p5), dropped 1 (p3)']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.keptSoFar, 4);
  assert.equal(end.decidedSoFar, 5);
  assert.equal(end.practiceAlpha, 1);
  assert.deepEqual(end.rows.map((row) => row.tier), ['gold', 'silver', 'dropped', 'silver', 'silver']);
  assert.equal(end.finished, true);
});

test('each prompt beat normalizes, feeds the chips in order, and ends on its decision', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'prompt')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    const row = scene.rows[beat.index];
    assert.equal(row.fed, 5, `${row.id} all chips counted`);
    assert.equal(row.decided, 1);
    assert.deepEqual(row.counts.map((c) => [c.answer, c.count]), expected.prompts[beat.index].counts);
    assert.equal(scene.decidedSoFar, beat.index + 1);
    const early = sceneAt(timeline, trace, beat.start + 0.3);
    assert.ok(early.rows[beat.index].normalized > 0, 'normalizing has begun');
    assert.equal(early.rows[beat.index].fed, 0, 'nothing counted yet');
    assert.equal(early.rows[beat.index].decided, 0);
    const middle = sceneAt(timeline, trace, beat.start + 0.6 + 0.24 * 2.5);
    assert.equal(middle.rows[beat.index].fed, 2, 'two chips counted part way through the feed');
    for (const c of middle.rows[beat.index].counts) assert.ok(c.count <= c.total);
  }
  const shipped = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'shipped').start + 1.5);
  assert.equal(shipped.shippedAlpha, 1);
  assert.deepEqual(shipped.rows.filter((row) => row.shipped.status !== 'same').map((row) => row.id), ['p3', 'p5']);
});

test('every sampled moment is consistent: decided rows only accumulate, tallies never exceed their totals, captions present', () => {
  let decided = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.decidedSoFar >= decided, `decisions vanished at ${t}`);
    decided = scene.decidedSoFar;
    assert.ok(scene.keptSoFar <= scene.decidedSoFar);
    assert.equal(scene.rows.length, 5);
    for (const row of scene.rows) {
      assert.ok(row.fed >= 0 && row.fed <= 5 && row.normalized >= 0 && row.normalized <= 1 && row.decided >= 0 && row.decided <= 1);
      for (const c of row.counts) assert.ok(c.count <= c.total, `${row.id} ${c.answer} over its total at ${t}`);
    }
    for (const alpha of [scene.shippedAlpha, scene.practiceAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4, 5.5, 7, 9, 11.5, 13, 15, 16.5, 18.5, 20, 22, 23.5, 25, 27, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
