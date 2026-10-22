// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from the lesson files, its
// timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, topKSparse, topPSparse, sortKey, klFromStored, W, H } from '../scenarios/truncate-teacher-top-k/visuals/topKTruncateModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/truncate-teacher-top-k/python/fixtures/positions.json');
const expected = read('../scenarios/truncate-teacher-top-k/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual([[0, 0.3], [1, 0.3], [2, 0.2]].sort(sortKey), [[0, 0.3], [1, 0.3], [2, 0.2]], 'the tie keeps the lower index first');
  assert.deepEqual(topKSparse([0.1, 0.6, 0.3], 2), [[1, 0.6], [2, 0.3]]);
  assert.throws(() => topKSparse(data.positions[0].probs, 7), /between 1 and 6/);
  assert.deepEqual(data.positions.map((position) => topPSparse(position.probs, data.p).length), [4, 4, 1]);
  for (const position of trace.positions) {
    const sparse = topKSparse(position.probs, data.k);
    assert.ok(Math.abs(klFromStored(position.probs, sparse) + Math.log(position.kept_mass)) < 1e-12, 'KL from the stored targets is minus the log of the kept mass');
    assert.deepEqual(position.kept.map(([index]) => index), position.kept.map((_, i) => i), 'the sorted order equals the index order, so the running mass reads left to right');
  }
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'pick' || b.kind === 'renorm' || b.kind === 'practice')) {
    assert.ok(beat.duration >= 2 && beat.duration <= 3, `about three seconds per decision (${beat.kind} ${beat.duration})`);
  }
  assert.deepEqual(kinds, ['intro', 'pick', 'renorm', 'pick', 'renorm', 'pick', 'renorm', 'outro', 'practice-intro', 'practice', 'practice', 'practice']);
});

test('captions state the measured numbers and the final scene holds the top-p states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['key 0.500, scope 0.200, token 0.150', '0.150 of the mass', 'kept mass 0.850', 'key 0.588, scope 0.235, token 0.176',
    'key and scope tie at 0.300', 'kept mass 0.800', 'key 0.375, scope 0.375, token 0.250', 'kept mass 0.970', 'key 0.928',
    'mean dropped mass 0.127', '0.1625, 0.2231, 0.0305', 'the flat p2 loses the most', 'reaches 0.9', 'fourth token (secret, total 0.950), so 4 are kept and 0.050',
    'fourth token (secret, total 0.900), so 4 are kept and 0.100', 'first token (key, total 0.900), so 1 is kept and 0.100', 'thirty two thousand']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.mode, 'practice');
  assert.deepEqual(end.panels.map((panel) => panel.bars.filter((bar) => bar.state === 'kept').length), [4, 4, 1]);
  assert.deepEqual(end.panels.map((panel) => panel.status.count), [4, 4, 1]);
  assert.deepEqual(end.panels.map((panel) => panel.cumulative.crossing), [3, 3, 0]);
  assert.equal(end.finished, true);
});

test('each renormalize beat ends with the kept bars at the renormalized values and the rest faded', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'renorm')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const panel = scene.panels[beat.position];
    const expectedValues = new Map(expected.positions[beat.position].renormalized);
    for (const bar of panel.bars) {
      if (expectedValues.has(bar.index)) {
        assert.equal(bar.state, 'kept');
        assert.ok(Math.abs(bar.height - expectedValues.get(bar.index)) < 1e-6, `bar ${bar.index} height at the end of ${beat.position}`);
        assert.equal(bar.showRenormalized, true);
      } else {
        assert.equal(bar.state, 'dropped');
        assert.ok(bar.alpha < 0.5);
      }
    }
    assert.ok(Math.abs(panel.status.droppedShown - expected.positions[beat.position].dropped) < 1e-9);
    assert.equal(panel.status.renormalized, true);
  }
  const outro = timeline.beats.find((b) => b.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + outro.duration - 0.01);
  assert.ok(atOutro.summaryAlpha > 0.99);
  assert.ok(atOutro.summary.includes('mean dropped mass 0.127'));
});

test('every sampled moment is consistent: heights and alphas bounded, at most k kept bars in the worked part, captions present', () => {
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    for (const panel of scene.panels) {
      assert.equal(panel.bars.length, data.vocab.length);
      for (const bar of panel.bars) {
        assert.ok(bar.height >= 0 && bar.height <= 1.000001, `height at ${t}`);
        assert.ok(bar.alpha >= 0.29 && bar.alpha <= 1, `alpha at ${t}`);
        assert.ok(bar.height >= bar.teacher - 1e-9, 'a bar never shrinks below the teacher value');
      }
      const kept = panel.bars.filter((bar) => bar.state === 'kept').length;
      if (scene.mode === 'worked') assert.ok(kept <= data.k, `at most k kept at ${t}`);
      if (panel.cumulative) assert.ok(panel.cumulative.reach <= panel.cumulative.points.length);
    }
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 5, 6.5, 8, 10, 13, 16, 19, 20, 22, 23, 24, 26, 28, 30, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'arc']) assert.ok(calls.has(needed), needed);
});
