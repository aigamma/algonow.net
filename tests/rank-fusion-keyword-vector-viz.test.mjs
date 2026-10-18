// The lesson animation must replay the real fusion: its trace is compared with
// the fixture the Python suite derives from solution.py, its timeline must be
// a reading pace, and its scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, traceFusion, SPOTLIGHT, BAR_FULL, W, H } from '../scenarios/rank-fusion-keyword-vector/visuals/rankFusionModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/rank-fusion-keyword-vector/python/fixtures/rankings.json');
const expected = read('../scenarios/rank-fusion-keyword-vector/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.ok(data.rankings.keyword.includes(SPOTLIGHT) && data.rankings.vector.includes(SPOTLIGHT), 'the spotlighted document is in both lists');
  assert.throws(() => traceFusion({ keyword: ['a', 'b', 'a'], vector: ['c'] }, 60), /keyword ranking lists 'a'/);
});

test('the timeline is a reading pace and complete: no beat under a second, under forty seconds in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'contribution')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'about two and a half seconds per contribution');
  assert.equal(kinds.filter((kind) => kind === 'contribution').length, 10);
  assert.deepEqual(kinds.filter((kind) => kind !== 'contribution'), ['intro', 'sort', 'outro', 'practice-intro', 'practice-score', 'practice-sort']);
});

test('captions state the measured arithmetic and the final scene shows the weighted order', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['1/(60 + 3) = 0.015873', 'to 0.015873: total 0.032266', '1/(60 + 4) = 0.015625 to 0.016393: total 0.032018',
    'runbook rotate a key 0.032266, errors E4031 0.032018, cli rotate-key 0.032002', 'audit log and incident call tie at 0.015385',
    'errors E4031 lands fourth and is dropped', 'moves from fourth to second', 'errors E4031 0.048412, runbook rotate a key 0.048139, cli rotate-key 0.048131',
    'errors E4031 is first']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  const byPosition = [...end.rows].sort((a, b) => a.position - b.position);
  assert.deepEqual(byPosition.map((row) => row.doc), expected.weighted.fused.map((entry) => entry.doc));
  assert.deepEqual(byPosition.map((row) => Number(row.score.toFixed(6))), expected.weighted.fused.map((entry) => entry.score));
  assert.equal(end.finished, true);
  assert.equal(end.frameAlpha, 1);
});

test('after the ten contributions the rows hold the fused totals, and after the sort they stand in fused order', () => {
  const sortBeat = timeline.beats[kinds.indexOf('sort')];
  const before = sceneAt(timeline, trace, data, sortBeat.start);
  assert.deepEqual(before.rows.map((row) => [row.doc, Number(row.score.toFixed(6))]), expected.contributions
    .reduce((acc, c) => { const hit = acc.find((pair) => pair[0] === c.doc); if (hit) hit[1] = c.total; else acc.push([c.doc, c.total]); return acc; }, []));
  assert.deepEqual(before.rows.map((row) => row.position), before.rows.map((row) => row.created), 'creation order before the sort');
  const after = sceneAt(timeline, trace, data, sortBeat.start + sortBeat.duration);
  const byPosition = [...after.rows].sort((a, b) => a.position - b.position);
  assert.deepEqual(byPosition.map((row) => row.doc), expected.fused.map((entry) => entry.doc));
  assert.equal(byPosition[1].doc, SPOTLIGHT, 'the error table is second once both lists count');
});

test('every sampled moment is consistent: at most seven rows, scores within the bar, ghost rows exist, positions distinct', () => {
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.rows.length <= 7, `rows at ${t}`);
    for (const row of scene.rows) {
      assert.ok(row.score >= 0 && row.score <= BAR_FULL, `score ${row.score} at ${t}`);
      assert.ok(row.position >= 0 && row.position <= 6, `position ${row.position} at ${t}`);
    }
    if (scene.ghost) assert.ok(scene.ghost.toRow < scene.rows.length, `ghost target at ${t}`);
    const settled = scene.rows.filter((row) => Number.isInteger(row.position)).map((row) => row.position);
    assert.equal(new Set(settled).size, settled.length, `two rows share a settled position at ${t}`);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.2, 3.6, 4.2, 5.5, 8, 15.2, 20, 27.2, 28.5, 29.7, 30.5, 32.5, 34, 36.5, 37.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
