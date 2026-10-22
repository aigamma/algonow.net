// The lesson animation must replay the real greedy loop: its trace is
// compared with the fixture the Python suite derives from solution.py and the
// practice answer, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, mmr, topByRelevance, pairwiseMax, W, H } from '../scenarios/mmr-diversify-results/visuals/mmrModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/mmr-diversify-results/python/fixtures/candidates.json');
const expected = read('../scenarios/mmr-diversify-results/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const ids = (indexes) => indexes.map((index) => data.candidates[index].id);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(ids(topByRelevance(data.candidates, 3)), ['c1', 'c2', 'c3']);
  assert.deepEqual(ids(mmr(data.candidates, data.similarity, 3, 0.7).picks.map((pick) => pick.index)), ['c1', 'c4', 'c5']);
  assert.deepEqual(ids(mmr(data.candidates, data.similarity, 3, 0.7, 1).picks.map((pick) => pick.index)), ['c1', 'c4', 'c6']);
  assert.throws(() => mmr(data.candidates, data.similarity, 3, 1.5), /between 0 and 1/);
  assert.throws(() => mmr(data.candidates, data.similarity.slice(0, 5), 3, 0.7), /rows/);
  assert.equal(pairwiseMax(data.similarity, [0, 3, 4]), 0.5);
  assert.equal(mmr(data.candidates, data.similarity, 10, 0.7).picks.length, 6, 'k beyond the pool returns every candidate');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => ['pick', 'score', 'choose'].includes(b.kind))) assert.ok(beat.duration >= 2 && beat.duration <= 3, `about three seconds per decision beat: ${beat.kind} ${beat.duration}`);
  assert.deepEqual(kinds, ['intro', 'pick', 'score', 'choose', 'score', 'choose', 'outro', 'practice-intro', 'practice-block', 'practice-pick']);
});

test('captions state the measured numbers and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['c1, c2, c3: three copies', '0.90 to 0.92', 'c1 scores 0.644', 'c2 0.92 and c3 0.90', 'c2 0.354, c3 0.346, c4 0.425, c5 0.375, c6 0.265',
    'c4 wins at 0.425', 'c2 0.354, c3 0.346, c5 0.375, c6 0.265', 'c5 wins at 0.375', 'highest similarity between any two is 0.50', '2 sources are covered',
    'at most 1 pick per source', 'skips c2 and c3', 'only c6 is allowed', 'c6 is picked at 0.265', 'c1, c4, c6, highest similarity 0.45, three sources']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.slots, ['c1', 'c4', 'c5']);
  assert.equal(atOutro.readout.title, 'compare');
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.slots, ['c1', 'c4', 'c6']);
  assert.deepEqual(end.chips.filter((chip) => chip.state === 'blocked').map((chip) => chip.id), ['c2', 'c3', 'c5']);
  assert.equal(end.finished, true);
  assert.equal(end.inPractice, true);
});

test('each choice beat ends with the round\'s pick in its slot and the round\'s penalties on the chips', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'choose' || b.kind === 'pick')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const round = beat.kind === 'pick' ? expected.rounds[0] : expected.rounds[beat.round];
    const slot = beat.kind === 'pick' ? 0 : beat.round;
    assert.equal(scene.slots[slot], round.picked, `${beat.kind} ${slot}`);
    for (const row of round.rows) {
      const chip = scene.chips.find((c) => c.id === row.id);
      assert.ok(Math.abs(chip.penalty.value - row.penalty) < 1e-9 && Math.abs(chip.score.value - row.score) < 1e-9, `${row.id} in round ${slot}`);
    }
  }
  const scoreBeats = timeline.beats.filter((b) => b.kind === 'score');
  for (const beat of scoreBeats) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    for (const row of expected.rounds[beat.round].rows) {
      const chip = scene.chips.find((c) => c.id === row.id);
      assert.ok(Math.abs(chip.penalty.shown - row.penalty) < 1e-9, `penalty bar fully grown for ${row.id}`);
    }
  }
});

test('every sampled moment is consistent: six chips, bounded values, slots only grow until the practice reset', () => {
  let lastFilled = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.chips.length, data.candidates.length);
    const filled = scene.slots.filter((id) => id !== null).length;
    assert.ok(filled <= 3);
    if (scene.beat === 'practice-block' && lastFilled === 3) lastFilled = 2;    // the practice replays the third pick
    assert.ok(filled >= lastFilled, `slots shrank at ${t}`);
    lastFilled = filled;
    for (const chip of scene.chips) {
      assert.ok(chip.penalty.value >= 0 && chip.penalty.value <= 1 && chip.penalty.shown <= chip.penalty.value + 1e-9, `penalty of ${chip.id} at ${t}`);
      assert.ok(chip.score.value >= -1 && chip.score.value <= 1, `score of ${chip.id} at ${t}`);
      assert.ok(chip.pos.x >= 0 && chip.pos.x + chip.pos.w <= W && chip.pos.y >= 0 && chip.pos.y + 48 <= H, `${chip.id} inside the canvas at ${t}`);
      assert.ok(chip.alpha >= 0 && chip.alpha <= 1);
    }
    const selectedIds = scene.chips.filter((chip) => chip.state === 'selected').map((chip) => chip.id).sort();
    assert.deepEqual(selectedIds, scene.slots.filter((id) => id !== null).sort(), `selected chips match the slots at ${t}`);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 5, 6.5, 8, 9.5, 11, 13, 14.5, 16, 18, 19.5, 21, 23, 24.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
