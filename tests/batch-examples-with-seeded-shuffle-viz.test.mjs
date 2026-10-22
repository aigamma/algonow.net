// The lesson animation must replay the real batching: its trace is compared
// with the fixture the Python suite derives from solution.py (the shuffled
// orders come from that fixture; everything else is recomputed here), its
// timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, labelMix, batchesOf, slices, poolSlot, rowSlot, CARD_W, CARD_H, W, H } from '../scenarios/batch-examples-with-seeded-shuffle/visuals/batchShuffleModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/batch-examples-with-seeded-shuffle/python/fixtures/examples.json');
const expected = read('../scenarios/batch-examples-with-seeded-shuffle/python/fixtures/expected-trace.json');
const trace = buildTrace(data, expected);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const ids = data.examples.map((example) => example.id);

test('the animation recomputes exactly the trace the Python solution produces from the pinned orders', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.epochs[0].batches.map((batch) => batch.ids), [['e9', 'e4', 'e2', 'e5'], ['e8', 'e1', 'e10', 'e7'], ['e3', 'e6']]);
  assert.deepEqual(trace.practice.map((entry) => entry.left_out), [['e3', 'e6'], ['e4', 'e6']]);
  assert.deepEqual(trace.mixed_full_batches, [2, 2]);
  assert.equal(trace.file_order.single_label_batches, 2);
  assert.deepEqual(labelMix(data.examples), { billing: 5, access: 5 });
  assert.deepEqual(slices([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(batchesOf([1, 2, 3, 4, 5], 2, true), [[1, 2], [3, 4]]);
  assert.throws(() => slices([1], 0), /at least 1/);
  assert.throws(() => buildTrace(data, { epochs: [{ seed: 7, order: ids.slice(0, 9) }, expected.epochs[1]] }), /permutation/);
  assert.throws(() => buildTrace(data, { epochs: [{ ...expected.epochs[0], seed: 9 }, expected.epochs[1]] }), /seed/);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'batch')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per batch');
  assert.deepEqual(kinds, ['intro', 'shuffle', 'batch', 'batch', 'batch', 'shuffle', 'batch', 'batch', 'batch', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured orders, mixes, and drops', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['billing 5, access 5', 'batch 1 billing 4', '2 of 3 batches hold a single label', 'seed 7', 'e9, e4, e2, e5, e8, e1, e10, e7, e3, e6',
    'Batch 1: e9, e4, e2, e5: access 1, billing 3', 'Batch 2: e8, e1, e10, e7: access 3, billing 1', 'Batch 3: e3, e6: the ragged last batch, 2 examples instead of 4',
    'seed 8', 'Batch 1: e9, e3, e10, e5: access 2, billing 2', 'Batch 2: e1, e8, e2, e7: billing 2, access 2', 'Batch 3: e6, e4',
    '2 of 2 in epoch 1, 2 of 2 in epoch 2', 'epoch 1 leaves out e3 and e6', 'epoch 2 leaves out e4 and e6', '8 examples per epoch']) {
    assert.ok(captions.includes(phrase), phrase);
  }
});

test('cards end each shuffle in the shuffled slots and each epoch in the batch rows; the practice fades only the ragged pair', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'shuffle')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const epoch = trace.epochs[beat.epochIndex];
    for (const card of scene.cards) {
      const slot = poolSlot(epoch.order.indexOf(card.id));
      assert.ok(Math.abs(card.x - slot.x) < 1e-9 && Math.abs(card.y - slot.y) < 1e-9, `${card.id} after shuffle ${epoch.epoch}`);
    }
  }
  const lastBatchBeats = timeline.beats.filter((b) => b.kind === 'batch' && b.batchIndex === 2);
  lastBatchBeats.forEach((beat) => {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const epoch = trace.epochs[beat.epochIndex];
    for (const card of scene.cards) {
      const slot = epoch.order.indexOf(card.id);
      const place = rowSlot(Math.floor(slot / data.batch_size), slot % data.batch_size);
      assert.ok(Math.abs(card.x - place.x) < 1e-9 && Math.abs(card.y - place.y) < 1e-9, `${card.id} in epoch ${epoch.epoch} rows`);
      assert.equal(card.state, 'batch');
    }
    assert.ok(scene.rows.every((row) => row.placed));
  });
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.cards.filter((card) => card.state === 'dropped').map((card) => card.id).sort(), ['e4', 'e6']);
  assert.ok(end.cards.filter((card) => card.state === 'dropped').every((card) => card.alpha < 0.5));
  assert.ok(end.cards.filter((card) => card.state !== 'dropped').every((card) => card.alpha === 1));
  assert.equal(end.rows[2].dropped, true);
  assert.equal(end.readout.dropLast, true);
  assert.equal(end.finished, true);
});

test('every sampled moment is consistent: ten cards inside the canvas, distinct resting slots, captions present', () => {
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.cards.length, 10);
    for (const card of scene.cards) {
      assert.ok(Number.isFinite(card.x) && Number.isFinite(card.y), `${card.id} at ${t}`);
      assert.ok(card.x >= 0 && card.x + CARD_W <= W && card.y >= 0 && card.y + CARD_H <= H, `${card.id} inside the canvas at ${t}`);
      assert.ok(card.alpha >= 0 && card.alpha <= 1);
    }
    if (scene.beat !== 'shuffle' && scene.beat !== 'batch') {
      const spots = new Set(scene.cards.map((card) => `${card.x},${card.y}`));
      assert.equal(spots.size, 10, `cards share a slot at ${t}`);
    }
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 5, 7.9, 8.5, 10, 12.4, 14, 15.5, 17, 20.5, 23, 26, 28, 30.3, 31.5, 33, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
