// The lesson animation must replay the real plan: its trace is compared with
// the fixture the Python suite derives from solution.py and practice_answer.py,
// its timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, buildManifest, planIngest, W, H } from '../scenarios/incremental-ingest-by-content-hash/visuals/ingestDiffModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/incremental-ingest-by-content-hash/python/fixtures/documents.json');
const expected = read('../scenarios/incremental-ingest-by-content-hash/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.rows.map((row) => [row.id, row.decision]), [['d1', 'unchanged'], ['d2', 'changed'], ['d3', 'unchanged'], ['d5', 'unchanged'], ['d6', 'new'], ['d4', 'deleted']]);
  assert.deepEqual(trace.practice.rows.map((row) => [row.id, row.decision]), [['d1', 'unchanged'], ['d2', 'changed'], ['d3', 'unchanged'], ['d5', 'unchanged'], ['d6', 'moved']]);
  assert.equal(trace.practice.rows[4].from, 'd4');
  assert.throws(() => buildManifest([...data.current, { id: 'd1', text: 'again', sha256: 'ff' }]), /duplicate document id 'd1'/);
  const previous = buildManifest(data.previous);
  assert.deepEqual(planIngest({}, data.current).rows.map((row) => row.decision), ['new', 'new', 'new', 'new', 'new'], 'an empty manifest makes everything new');
  assert.deepEqual(planIngest(previous, data.previous).rows.map((row) => row.decision), ['unchanged', 'unchanged', 'unchanged', 'unchanged', 'unchanged'], 'identical runs plan nothing');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'doc' || b.kind === 'deleted')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3, 'about three seconds per decision');
  assert.equal(kinds.filter((kind) => kind === 'doc').length, data.current.length);
  assert.equal(kinds.filter((kind) => kind === 'deleted').length, 1);
  assert.deepEqual(kinds.filter((kind) => kind !== 'doc' && kind !== 'deleted'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured hashes and decisions, and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['5 embeddings on an export of 5', 'd1: hash 37182e256ecf equals the manifest\'s 37182e256ecf: unchanged, skipped',
    'd2: hash 462cbf1e668d differs from the manifest\'s f3a147442ac1: changed, re-embed', 'the manifest has no d6: new, embed',
    'd4 is in the manifest but not in tonight\'s export: deleted', 'embed 2 (d2, d6), delete 1 (d4), skip 3 (d1, d3, d5)', '3 of 5 embeddings saved, 60 percent',
    'Look at d6 and d4: the same hash', 'd4 -> d6, so nothing is deleted', 'embed 1 (d2), moved 1 (d4 -> d6), delete 0 (none), skip 3 (d1, d3, d5): 80 percent saved']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 1.0);
  assert.deepEqual(atOutro.currentRows.map((row) => row.decision), ['unchanged', 'changed', 'unchanged', 'unchanged', 'new']);
  assert.deepEqual(atOutro.previousRows.map((row) => row.state), ['match', 'differs', 'match', 'deleted', 'match']);
  assert.deepEqual([atOutro.plan.embed, atOutro.plan.delete, atOutro.plan.skip, atOutro.plan.saved_percent, atOutro.plan.practice], [2, 1, 3, 60, false]);
  assert.ok(atOutro.plan.alpha === 1);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.currentRows[4].decision, 'moved');
  assert.equal(end.currentRows[4].fromId, 'd4');
  assert.equal(end.previousRows[3].state, 'moved');
  assert.deepEqual([end.plan.embed, end.plan.moved, end.plan.delete, end.plan.skip, end.plan.saved_percent, end.plan.practice], [1, 1, 0, 3, 80, true]);
  assert.equal(end.moveLinks.length, 1);
  assert.equal(end.finished, true);
});

test('each document beat hashes, glides to its manifest row, and decides, in order', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'doc')) {
    const early = sceneAt(timeline, trace, data, beat.start + 0.05);
    const row = early.currentRows.find((r) => r.id === beat.row.id);
    assert.equal(row.decision, null, `${beat.row.id} is undecided at the start of its beat`);
    const mid = sceneAt(timeline, trace, data, beat.start + 1.0);
    assert.ok(mid.link && mid.link.progress > 0 && mid.link.progress < 1, `${beat.row.id} connector in flight`);
    assert.equal(mid.currentRows.find((r) => r.id === beat.row.id).hashAlpha, 1, 'the hash is shown before the glide ends');
    const late = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.05);
    assert.equal(late.currentRows.find((r) => r.id === beat.row.id).decision, beat.row.decision);
    assert.equal(late.link.progress, 1);
  }
});

test('every sampled moment is consistent: decisions only accumulate, the plan appears once, captions present', () => {
  let decidedBefore = 0;
  let planSeen = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.previousRows.length, data.previous.length);
    assert.equal(scene.currentRows.length, data.current.length);
    const decided = scene.currentRows.filter((row) => row.decision !== null).length;
    assert.ok(decided >= decidedBefore, `decisions vanished at ${t}`);
    decidedBefore = decided;
    for (const row of scene.currentRows) assert.ok(row.hashAlpha >= 0 && row.hashAlpha <= 1 && row.alpha >= 0 && row.alpha <= 1);
    if (scene.plan.alpha > 0) planSeen = true;
    if (planSeen && scene.beat !== 'outro') assert.equal(scene.plan.alpha, 1, `plan stays once shown at ${t}`);
  }
  assert.ok(planSeen);
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (key === 'measureText' ? () => ({ width: 60 }) : (...args) => { calls.add(String(key)); return undefined; })),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.6, 4.5, 6, 8.5, 11, 13.8, 16, 17.5, 19, 20.5, 22, 23.5, 25, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
