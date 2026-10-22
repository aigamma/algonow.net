// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, tokenize, andQuery, orQuery, chipPosition, W, H } from '../scenarios/inverted-index-and-query/visuals/invertedIndexModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/inverted-index-and-query/python/fixtures/docs.json');
const expected = read('../scenarios/inverted-index-and-query/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(tokenize('Rotate, the KEY!!'), ['rotate', 'the', 'key']);
  assert.deepEqual(tokenize('E4031: key\tnot   active\n'), ['e4031', 'key', 'not', 'active']);
  assert.throws(() => andQuery(trace.index, []), /no terms/);
  assert.deepEqual(andQuery(trace.index, ['zebra']), []);
  assert.deepEqual(orQuery(trace.index, ['key']), [['d1', 1], ['d3', 1]]);
  assert.equal(trace.order.length, 31);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'doc')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per document');
  assert.equal(kinds.filter((kind) => kind === 'doc').length, data.docs.length);
  assert.equal(kinds.filter((kind) => kind === 'query').length, data.queries.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'doc' && kind !== 'query'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the whole index and the ranked practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['What shipped: a linear scan', '15 document reads for these 3 queries', 'has 9 tokens and 7 distinct terms', 'key and the repeat and are listed once',
    '7 new chips. Index: 7 terms', 'the already indexed, so d2 joins its list', 'Index: 31 terms', 'key is in d1, d3; revoke is in d1. The intersection is d1: 3 postings read',
    'scope is in d2, d4; create is in d3, d4. The intersection is d4: 4 postings read', 'The intersection is empty: no document has both, 4 postings read',
    '31 distinct terms, 4 of them (create, key, scope, the)', 'read 11 posting entries in all', 'read 15 documents', 'd3 and d4 contain 2 of the 3 terms, d1 and d2 contain 1',
    'Ranked: d3, d4, d1, d2', 'finds nothing']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.chips.filter((chip) => chip.alpha > 0).length, 31);
  for (const chip of end.chips) assert.deepEqual(chip.ids, expected.index[chip.term], chip.term);
  assert.deepEqual(end.cards.map((card) => card.count), [1, 1, 2, 2, null]);
  assert.ok(end.query && end.query.result.text === 'ranked: d3, d4, d1, d2');
  assert.equal(end.status.read, 11);
  assert.equal(end.status.scanned, 15);
  assert.equal(end.finished, true);
});

test('the index grows document by document: at the end of each document beat the chips equal the index built so far', () => {
  let indexedSoFar = 0;
  for (const beat of timeline.beats.filter((b) => b.kind === 'doc')) {
    indexedSoFar += beat.step.new_terms.length;
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const visible = scene.chips.filter((chip) => chip.alpha > 0);
    assert.equal(visible.length, indexedSoFar, `document ${beat.index + 1}`);
    assert.deepEqual(visible.map((chip) => chip.term), expected.order.slice(0, indexedSoFar));
    const docsSoFar = expected.steps.slice(0, beat.index + 1).map((step) => step.doc);
    for (const chip of visible) assert.deepEqual(chip.ids, expected.index[chip.term].filter((id) => docsSoFar.includes(id)), chip.term);
    assert.equal(scene.glides.length, 0, 'every term has landed by the end of its beat');
    assert.equal(scene.cards[beat.index].state, 'active');
  }
  for (const beat of timeline.beats.filter((b) => b.kind === 'query')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    assert.deepEqual(scene.cards.filter((card) => card.state === 'hit').map((card) => card.id), beat.query.result);
    assert.deepEqual(scene.chips.filter((chip) => chip.state === 'query').map((chip) => chip.term).sort(), [...beat.query.terms].sort());
    assert.equal(scene.query.result.ok, beat.query.result.length > 0);
  }
});

test('every sampled moment is consistent: chips only accumulate, glides stay inside the canvas, captions present', () => {
  let lastVisible = 0;
  let lastIds = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.cards.length, data.docs.length);
    const visible = scene.chips.filter((chip) => chip.alpha > 0).length;
    const ids = scene.chips.reduce((n, chip) => n + chip.ids.length, 0);
    assert.ok(visible >= lastVisible, `chips shrank at ${t}`);
    assert.ok(ids >= lastIds, `postings shrank at ${t}`);
    lastVisible = visible;
    lastIds = ids;
    for (const glide of scene.glides) assert.ok(glide.x >= 0 && glide.x <= W && glide.y >= 0 && glide.y <= H, `glide off canvas at ${t}`);
    for (const chip of scene.chips) {
      const { x, y } = chipPosition(chip.slot);
      assert.ok(x >= 0 && x + 125 <= W && y >= 0 && y + 34 <= H, `chip ${chip.term} off canvas`);
    }
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.2, 4, 5.5, 8, 12, 16, 17.5, 18.5, 20.5, 23, 26.5, 28, 29.5, 31, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
