// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, dot, cosine, rankChunks, W, H } from '../scenarios/cosine-top-k-retrieval/visuals/cosineRankModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/cosine-top-k-retrieval/python/fixtures/chunks.json');
const expected = read('../scenarios/cosine-top-k-retrieval/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  const billing = data.chunks[1].vector;
  const longer = billing.map((x) => x * 10);
  assert.ok(Math.abs(cosine(data.query, longer) - cosine(data.query, billing)) < 1e-12, 'cosine ignores length');
  assert.ok(dot(data.query, longer) > dot(data.query, billing), 'the dot product does not');
  assert.throws(() => cosine(data.query, [0, 0, 0, 0]), /zero vector/);
  assert.throws(() => dot(data.query, [0.5, 0.5, 0.5]), /shorter/);
  assert.deepEqual(rankChunks(data.query, data.chunks, data.k).map((record) => record.id), expected.by_cosine.slice(0, data.k));
  assert.deepEqual(rankChunks(data.query, data.chunks, data.k, data.minimum).map((record) => record.id), expected.practice.kept.map((record) => record.id));
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'about two and a half seconds per chunk');
  assert.deepEqual(timeline.beats.filter((b) => b.kind === 'chunk').map((b) => b.id), data.chunks.map((chunk) => chunk.id));
  assert.deepEqual(kinds.filter((kind) => kind !== 'chunk'), ['intro', 'sort', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the kept and dropped rows', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['c2 Billing overview came first with 1.85', 'c1 Rotate an API key was third with 0.94', 'lengths 0.99 and 0.97, cosine 0.979',
    'lengths 0.99 and 4.87, cosine 0.383', 'cosine 0.864', 'Sorted by cosine: c1 0.979, c4 0.864, c3 0.415, c2 0.383, c5 0.195',
    'Top 3 by cosine: c1, c4, c3', 'top 3 were c2, c3, c1', '2 chunks remain, c1 (0.979) and c4 (0.864)', 'c3 at 0.415 is dropped, and so are c2 and c5']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual([...end.rows].sort((a, b) => a.y - b.y).map((row) => row.id), expected.by_cosine, 'rows end in cosine order');
  assert.deepEqual(end.rows.filter((row) => row.state === 'kept').map((row) => row.id), expected.practice.kept.map((record) => record.id));
  assert.deepEqual(end.rows.filter((row) => row.state === 'dropped').map((row) => row.id).sort(), [...expected.practice.dropped].sort());
  assert.equal(end.thresholdAlpha, 1);
  assert.equal(end.cutAlpha, 1);
  assert.equal(end.finished, true);
});

test('each chunk beat ends with that chunk scored and the readout showing its cosine', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const row = scene.rows[beat.index];
    assert.equal(row.dotProgress, 1, `${beat.id} dot bar`);
    assert.equal(row.cosProgress, 1, `${beat.id} cosine bar`);
    assert.equal(scene.readout.id, beat.id);
    assert.equal(scene.readout.cosine, expected.rows[beat.index].cosine);
    assert.ok(scene.readout.showCosine);
    for (const later of scene.rows.slice(beat.index + 1)) assert.equal(later.dotProgress + later.cosProgress, 0, `${later.id} not yet scored`);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const sorted = sceneAt(timeline, trace, data, outro.start + 0.05);
  assert.deepEqual([...sorted.rows].sort((a, b) => a.y - b.y).map((row) => row.id), expected.by_cosine);
  assert.deepEqual(sorted.rows.filter((row) => row.state === 'kept').map((row) => row.id).sort(), expected.top.map((record) => record.id).sort());
});

test('every sampled moment is consistent: bars within range, rows inside the canvas, captions present', () => {
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.rows.length, data.chunks.length);
    for (const row of scene.rows) {
      assert.ok(row.dotProgress >= 0 && row.dotProgress <= 1 && row.cosProgress >= 0 && row.cosProgress <= 1, `progress at ${t}`);
      assert.ok(row.dotFrac > 0 && row.dotFrac <= 1 && row.cosFrac > 0 && row.cosFrac <= 1, `fractions at ${t}`);
      assert.ok(row.y >= 60 && row.y <= H - 60, `row ${row.id} inside the canvas at ${t}`);
    }
    if (scene.beat !== 'sort') {   // rows glide past each other only during the sort beat
      const ys = scene.rows.map((row) => Math.round(row.y));
      assert.equal(new Set(ys).size, ys.length, `no two rows share a slot at ${t}`);
    }
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 5, 8.2, 12, 15.5, 16.5, 17.5, 19.5, 20.5, 22, 23.5, 24.5, 25.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
