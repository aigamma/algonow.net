// The lesson animation must replay the real shingle comparison: its trace is
// compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, wordsOf, wordShingles, charShingles, jaccard, nearDuplicates, W, H } from '../scenarios/near-duplicates-by-shingle-jaccard/visuals/shingleModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/near-duplicates-by-shingle-jaccard/python/fixtures/records.json');
const expected = read('../scenarios/near-duplicates-by-shingle-jaccard/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.pairs.map((pair) => pair.jaccard), [0.625, 0, 0.928571, 0.307692, 0, 0.588235, 0.307692, 0, 0, 0.285714]);
  assert.deepEqual(trace.decisions.map((d) => d.action), ['kept', 'dropped', 'kept', 'dropped', 'kept']);
  assert.equal(trace.practice.pairs[0].jaccard, 0.793103);
  assert.deepEqual(wordsOf('Restart the worker, then set'), ['restart', 'the', 'worker', 'then', 'set']);
  assert.equal(wordShingles(data.records[0].text, 3).size, 13);
  assert.equal(charShingles(data.records[0].text, 5).size, 79);
  assert.equal(wordShingles('one two', 3).size, 0);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
  assert.throws(() => nearDuplicates([{ id: 'r9', text: 'Restart it.' }], wordShingles, 3, 0.5), /too short/);
});

test('the timeline is a reading pace and complete: no beat under a second, about thirty five seconds in all', () => {
  assert.ok(timeline.duration >= 28 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'pair')) assert.ok(beat.duration >= 1.5 && beat.duration <= 2.5, 'a steady beat per pair');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'pair').length, 10);
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'decision').length, 5);
  assert.deepEqual(kinds.filter((kind) => kind !== 'pair' && kind !== 'decision'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured counts, similarities, and decisions, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['r1 has 13', 'all 5 survived',
    'r1 and r2: 13 and 13 shingles, 10 shared, 16 in the union: 10 / 16 = 0.62, at or above 0.50: near-duplicates',
    'r1 and r5: 13 and 4 shingles, 4 shared, 13 in the union: 4 / 13 = 0.31, below 0.50',
    'r1 and r4: 13 and 14 shingles, 13 shared, 14 in the union: 13 / 14 = 0.93',
    'r1: nothing kept yet, so it is kept', 'r2: its best match among the kept records is r1 at 0.62, at or above 0.50: dropped as a near-duplicate of r1',
    'r5: its best match among the kept records scores 0.31, below 0.50: kept', 'Kept 3 of 5: r1, r3, r5',
    'r1 has 79 shingles instead of 13, and r1 versus r2 rises from 0.62 to 0.79', "sits in 3 of r1's 13 word shingles but in only 10 of its 79 character shingles"]) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.computed, 10);
  assert.equal(end.decided, 5);
  assert.equal(end.practiceAlpha, 1);
  assert.equal(end.unit, 'characters');
  assert.equal(end.cells[0].value, 0.793103);
  assert.equal(end.records[0].shingles, 79);
  assert.deepEqual(end.records.map((record) => record.decision.action), ['kept', 'dropped', 'kept', 'dropped', 'kept']);
  assert.equal(end.finished, true);
});

test('each pair beat ends with its cell filled and each decision beat with its tag placed', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'pair')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.computed, beat.index + 1, `pair ${beat.index} computed`);
    assert.equal(scene.cells[beat.index].alpha, 1);
    assert.equal(scene.cells[beat.index].value, expected.pairs[beat.index].jaccard);
    assert.equal(scene.unit, 'words');
    const early = sceneAt(timeline, trace, beat.start + 0.1);
    assert.equal(early.computed, beat.index);
    assert.ok(early.records.filter((record) => record.highlighted).length === 2, 'both records of the pair are highlighted');
  }
  for (const beat of timeline.beats.filter((b) => b.kind === 'decision')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.decided, beat.index + 1);
    assert.deepEqual(scene.records[beat.index].decision, expected.decisions[beat.index]);
    assert.equal(scene.computed, 10);
  }
});

test('every sampled moment is consistent: cells and decisions only accumulate, captions present', () => {
  let computed = 0;
  let decided = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.computed >= computed && scene.decided >= decided, `progress went backwards at ${t}`);
    computed = scene.computed;
    decided = scene.decided;
    assert.equal(scene.cells.length, 10);
    assert.equal(scene.records.length, 5);
    for (const cell of scene.cells) assert.ok(cell.alpha >= 0 && cell.alpha <= 1);
    assert.ok(scene.practiceAlpha >= 0 && scene.practiceAlpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4.5, 6, 9, 12.5, 16, 19.5, 21, 23, 25.5, 27.5, 29.5, 31, 33, 34.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
