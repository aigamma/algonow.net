// The lesson animation must replay the real label building: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, encode, buildLabels, padBatch, fit, W, H } from '../scenarios/mask-prompt-tokens-in-labels/visuals/labelMaskModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/mask-prompt-tokens-in-labels/python/fixtures/examples.json');
const expected = read('../scenarios/mask-prompt-tokens-in-labels/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(trace.trained, 20);
  assert.equal(trace.real, 33);
  assert.equal(trace.shipped.trained, 33);
  assert.deepEqual(trace.practice.rows.map((row) => row.dropped), [2, 0, 1]);
  const vocab = {};
  assert.deepEqual(encode('my password my', vocab), [2, 3, 2]);
  assert.throws(() => buildLabels({ prompt: 'thanks', completion: '' }, {}, 1, -100), /empty completion/);
  assert.deepEqual(padBatch([], 0, -100), []);
  assert.throws(() => fit([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1], [-100, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1], 10, -100), /does not fit/);
  assert.deepEqual(fit([2, 3, 4, 1], [-100, -100, 4, 1], 3, -100), { ids: [3, 4, 1], labels: [-100, 4, 1] });
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 22 && timeline.duration <= 40, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'example')) assert.ok(beat.duration >= 2.5 && beat.duration <= 3.5, 'a steady beat per example');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'example').length, 3);
  assert.deepEqual(kinds.filter((kind) => kind !== 'example'), ['intro', 'pad', 'count', 'shipped', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured counts, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['pad is 0, end of sequence is 1, and -100 is the label the loss skips', 'every one of the 33 real tokens, the 13 prompt tokens included',
    'Example 1: "how do i reset my password" then "use the forgot password link". The 6 prompt tokens get the label -100; the 5 completion tokens and eos keep their ids as labels: 6 trained of 12',
    'Example 3: "cancel my plan"', '8 trained of 11', 'padded to its longest row, 12 positions', 'Trained tokens: 20 of 33 real tokens, 61 percent', 'The other 13 are prompt tokens',
    'every real token trained, 33 of 33', 'accepts at most 10 positions, and example 1 has 12', 'example 1 drops 2, example 2 drops 0, example 3 drops 1',
    'The batch pads to 10', 'trained count is still 20, now of 30 real tokens']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.practiceAlpha, 1);
  assert.equal(end.trained, 20);
  assert.equal(end.real, 33);
  assert.deepEqual(end.rows.map((row) => row.dropped), [2, 0, 1]);
  assert.equal(end.rows[0].cells.filter((cell) => cell.dropped).length, 2);
  assert.equal(end.finished, true);
});

test('each example beat ends with its ids and labels shown and the running count including it', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'example')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.rows[beat.index].idsAlpha, 1);
    assert.equal(scene.rows[beat.index].maskAlpha, 1);
    const shownRows = expected.examples.slice(0, beat.index + 1);
    assert.equal(scene.real, shownRows.reduce((sum, example) => sum + example.ids.length, 0));
    assert.equal(scene.trained, shownRows.reduce((sum, example) => sum + example.completion_tokens + 1, 0));
    assert.equal(scene.padAlpha, 0, 'no pads before the pad beat');
    const early = sceneAt(timeline, trace, beat.start + 0.5);
    assert.ok(early.rows[beat.index].idsAlpha > 0 && early.rows[beat.index].maskAlpha === 0, 'ids appear before the labels');
    if (beat.index + 1 < 3) assert.equal(early.rows[beat.index + 1].idsAlpha, 0, 'later rows wait');
  }
  const padded = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'pad').start + 2);
  assert.equal(padded.padAlpha, 1);
  assert.equal(padded.rows[1].cells.filter((cell) => cell.kind === 'pad').length, 2);
  assert.equal(padded.rows[2].cells.filter((cell) => cell.kind === 'pad').length, 1);
  const shippedBeat = timeline.beats.find((b) => b.kind === 'shipped');
  assert.equal(sceneAt(timeline, trace, shippedBeat.start + 1.5).shippedAlpha, 1);
  assert.equal(sceneAt(timeline, trace, shippedBeat.start + shippedBeat.duration + 0.5).shippedAlpha, 0, 'the shipped view reverts');
});

test('every sampled moment is consistent: rows only accumulate, counts bounded, captions present', () => {
  let trained = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.trained >= trained, `trained went backwards at ${t}`);
    trained = scene.trained;
    assert.ok(scene.trained <= 20 && scene.real <= 33);
    assert.equal(scene.rows.length, 3);
    for (const row of scene.rows) {
      assert.equal(row.cells.length, 12);
      assert.ok(row.idsAlpha >= 0 && row.idsAlpha <= 1 && row.maskAlpha >= 0 && row.maskAlpha <= 1);
    }
    for (const alpha of [scene.padAlpha, scene.shippedAlpha, scene.practiceAlpha, scene.countAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4.5, 6, 8, 10.5, 12, 13.5, 15, 17, 19, 21, 23, 24.5, 25.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'clip']) assert.ok(calls.has(needed), needed);
});
