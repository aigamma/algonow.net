// The lesson animation must replay the real scoring functions: its trace is
// compared with the fixture the Python suite derives from solution.py, its
// timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, normalize, tokenF1, exactMatch, scorePair, W, H } from '../scenarios/exact-match-and-token-f1/visuals/answerScoreModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/exact-match-and-token-f1/python/fixtures/answers.json');
const expected = read('../scenarios/exact-match-and-token-f1/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(normalize('  Rotate,   the\tKEY!!  ', data.articles), ['rotate', 'key']);
  assert.deepEqual(normalize('A key in an hour: 7 days', data.articles), ['key', 'in', 'hour', '7', 'days']);
  assert.deepEqual(tokenF1('', '', data.articles), [0, 1, 1, 1]);
  assert.deepEqual(tokenF1('no', 'yes', data.articles), [0, 0, 0, 0]);
  assert.equal(tokenF1('seven days', '7 days', data.articles)[3], tokenF1('7 days', 'seven days', data.articles)[3]);
  assert.equal(exactMatch('read scope', 'scope read', data.articles), 0);
  assert.deepEqual(scorePair('seven days', ['7 days', 'seven days'], data.articles).f1, 1);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'pair')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3, 'about three seconds per pair');
  assert.deepEqual(timeline.beats.filter((b) => b.kind === 'pair').map((b) => b.index), [0, 1, 2, 3, 4]);
  assert.deepEqual(kinds.filter((kind) => kind !== 'pair'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['0 of 5 pairs are equal as strings', 'both read read scope, so exact match 1 and F1 1.000', '6 tokens against 9 after normalization, 5 shared',
    'precision 0.833, recall 0.556, F1 0.667', '1 shared: precision 0.500, recall 0.500, F1 0.500', 'both read billing then invoices', 'no shared token, so the overlap is 0 and F1 is 0.000',
    'exact match 0.400 (2 of 5) and F1 0.633', 'normalization rescued e1 and e4', 'gave e2 and e3 partial credit', 'e3 gains the gold answer "seven days": exact match 1, F1 1.000',
    "e2's second gold answer scores 0.500, so its 0.667 stands", 'Means: exact match 0.600, F1 0.733']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.finished, true);
  assert.equal(end.pair.id, 'e3');
  assert.equal(end.pair.gold, 'seven days');
  assert.equal(end.pair.meters.f1, 1);
  assert.equal(end.pair.em, 1);
  assert.deepEqual(end.running.perPair.map((entry) => entry.f1), [1, 0.666667, 1, 1, 0]);
  assert.equal(end.running.em, 3);
  assert.ok(Math.abs(end.running.meanF1 - expected.practice.mean_f1) < 1e-6);
});

test('each pair beat ends on that pair\'s own scores and links exactly the overlap', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'pair')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const row = expected.rows[beat.index];
    assert.equal(scene.pair.id, row.id);
    assert.deepEqual([scene.pair.meters.precision, scene.pair.meters.recall, scene.pair.meters.f1], [row.precision, row.recall, row.f1]);
    assert.equal(scene.pair.links.length, row.overlap, `${row.id} links`);
    assert.equal(scene.pair.predictionChips.filter((chip) => chip.dropped).length, row.prediction_words.length - row.prediction_tokens.length);
    assert.equal(scene.pair.meters.fill, 1);
    assert.equal(scene.running.n, beat.index + 1);
  }
  const outro = timeline.beats.find((b) => b.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 1);
  assert.deepEqual(atOutro.running.perPair.map((entry) => entry.em), [1, 0, 0, 1, 0]);
  assert.equal(atOutro.running.em, 2);
  assert.ok(Math.abs(atOutro.running.meanF1 - expected.mean_f1) < 1e-6);
});

test('every sampled moment is consistent: meters within the unit interval, counts never shrink before the practice, captions present', () => {
  const practice = timeline.beats.find((b) => b.kind === 'practice');
  let lastN = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    if (scene.pair) {
      for (const value of [scene.pair.meters.precision, scene.pair.meters.recall, scene.pair.meters.f1, scene.pair.meters.fill, scene.pair.linkAlpha]) {
        assert.ok(value >= 0 && value <= 1, `meter value at ${t}`);
      }
      for (const chip of [...scene.pair.predictionChips, ...scene.pair.goldChips]) assert.ok(chip.alpha >= 0 && chip.alpha <= 1);
    }
    if (t < practice.start) { assert.ok(scene.running.n >= lastN, `scored count shrank at ${t}`); lastN = scene.running.n; }
    assert.equal(scene.running.perPair.length, data.pairs.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.5, 5.5, 6.5, 9, 12, 15, 17.9, 18.5, 20, 21.5, 23, 24, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
