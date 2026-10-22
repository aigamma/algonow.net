// The lesson animation must replay the real metrics: its trace is compared
// with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, precisionAtK, recallAtK, reciprocalRank, ndcgAtK, W, H } from '../scenarios/retrieval-precision-recall-mrr/visuals/retrievalMetricsModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/retrieval-precision-recall-mrr/python/fixtures/queries.json');
const expected = read('../scenarios/retrieval-precision-recall-mrr/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python functions produce', () => {
  assert.deepEqual(trace, expected);
  const ranked = ['a', 'b', 'c', 'd', 'e'];
  assert.equal(precisionAtK(ranked, ['b', 'e'], 3), 1 / 3);
  assert.equal(recallAtK(ranked, ['b', 'e'], 3), 1 / 2);
  assert.equal(reciprocalRank(ranked, ['b', 'e']), 1 / 2);
  assert.equal(reciprocalRank(ranked, ['z']), 0);
  assert.equal(ndcgAtK(ranked, ['a'], 3), 1);
  assert.throws(() => precisionAtK(ranked, ['a'], 0), /at least 1/);
  assert.throws(() => recallAtK(ranked, [], 3), /empty/);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  const rankingBeats = timeline.beats.filter((b) => b.kind === 'old' || b.kind === 'new');
  for (const beat of rankingBeats) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a brisk, steady beat per ranking');
  assert.equal(rankingBeats.length, data.queries.length * 2);
  assert.deepEqual(kinds.filter((kind) => kind !== 'old' && kind !== 'new'), ['intro', 'outro', 'practice-intro', 'practice']);
  assert.deepEqual(rankingBeats.map((b) => `${b.query}${b.kind}`), ['0old', '0new', '1old', '1new', '2old', '2new', '3old', '3new']);
});

test('captions state the measured numbers and the final scene holds the complete table', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['felt better', 'q1 “how do I rotate an API key?”, old ranking: the relevant chunk c1 sits at position 3', 'RR 0.333 (first hit at position 3)',
    'q1 new ranking: the relevant chunk c1 sits at position 1', 'The same hit, 2 places earlier', 'relevant chunks c3 and c8 sit at positions 2 and 3', 'P@3 0.667 (2 of 3 results relevant)',
    '1 place later: a small regression', 'Nothing found by either model', 'MRR 0.458 against 0.625', 'finds the same relevant chunks and puts them earlier',
    'q2 old hits at positions 2 and 3 earn 0.631 and 0.500 of a possible 1.631, so 0.693', 'new hits at positions 1 and 2 earn 1.631, so 1.000', 'Means 0.548 old against 0.658 new']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.table.rows.length, 8);
  assert.ok(end.table.rows.every((row) => row.alpha === 1));
  assert.equal(end.table.means.alpha, 1);
  assert.equal(end.table.ndcgAlpha, 1);
  assert.equal(end.discount.alpha, 1);
  assert.equal(end.query.id, 'q2', 'the practice shows the query with two relevant chunks');
  assert.deepEqual(end.discount.oldHits, [2, 3]);
  assert.deepEqual(end.discount.newHits, [1, 2]);
  assert.equal(end.rows.old.readout.fill, 1);
  assert.equal(end.finished, true);
});

test('each ranking beat reveals its own row: slots light in order, the readout fills, the table row appears', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'old' || b.kind === 'new')) {
    const early = sceneAt(timeline, trace, data, beat.start + 0.05);
    const row = early.rows[beat.kind];
    assert.ok(row.slots.every((slot) => slot.lit === 0), `${beat.kind} ${beat.query} starts unlit`);
    assert.equal(row.readout.alpha, 0);
    const late = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const lateRow = late.rows[beat.kind];
    assert.ok(lateRow.slots.every((slot) => slot.lit === 1), 'every slot lit by the end of the beat');
    assert.equal(lateRow.readout.fill, 1);
    const record = expected.rankings[beat.kind].rows[beat.query];
    assert.equal(lateRow.readout.rr, record.rr);
    assert.equal(lateRow.slots.filter((slot) => slot.relevant).length, record.hit_positions.length);
    assert.equal(lateRow.firstHit, record.hit_positions[0] || null);
    const tableRow = late.table.rows.find((r) => r.current);
    assert.ok(tableRow && tableRow.alpha === 1 && tableRow.id === record.id && tableRow.key === beat.kind);
    if (beat.kind === 'new') assert.ok(late.rows.old.slots.every((slot) => slot.lit === 1), 'the old row stays fully shown under the new one');
  }
});

test('every sampled moment is consistent: alphas inside 0..1, the table only grows, captions present', () => {
  let revealed = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    for (const key of ['old', 'new']) {
      assert.equal(scene.rows[key].slots.length, 5);
      for (const slot of scene.rows[key].slots) assert.ok(slot.lit >= 0 && slot.lit <= 1);
      assert.ok(scene.rows[key].readout.fill >= 0 && scene.rows[key].readout.fill <= 1);
    }
    const now = scene.table.rows.filter((row) => row.alpha === 1).length;
    assert.ok(now >= revealed, `table shrank at ${t}`);
    revealed = now;
    assert.ok(scene.table.means.alpha >= 0 && scene.table.means.alpha <= 1);
    assert.ok(scene.queryIndex >= 0 && scene.queryIndex < data.queries.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.5, 5.4, 6, 8, 10.2, 12, 15, 18, 20, 22.2, 24, 25.5, 27, 28.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
