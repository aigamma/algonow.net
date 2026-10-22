// The lesson animation must replay the real cache: its trace is compared with
// the fixture the Python suite derives from solution.py and practice_answer.py,
// its timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, cachedAnswer, keyFor, W, H } from '../scenarios/lru-cache-for-model-responses/visuals/lruCacheModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/lru-cache-for-model-responses/python/fixtures/requests.json');
const expected = read('../scenarios/lru-cache-for-model-responses/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(keyFor('Rotate  a key?'), 'rotate a key?');
  assert.throws(() => cachedAnswer(new Map(), 'Rotate a key?', 0, () => 'x', { calls: 0, hits: 0, evictions: 0 }), /capacity must be at least 1/);
  assert.deepEqual(trace.steps.map((step) => step.outcome), ['miss', 'miss', 'miss', 'hit', 'hit', 'miss', 'hit', 'hit', 'miss']);
  assert.deepEqual([trace.totals.calls, trace.fifo.calls, trace.no_cache_calls, trace.practice.totals.calls], [5, 7, 9, 6]);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3, 'a steady beat for the repetitive requests');
  assert.equal(kinds.filter((kind) => kind === 'request').length, data.requests.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'request'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured outcomes and the final scene holds the practice totals', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['9 requests arrive over 46 minutes', '4 distinct questions', 'no cache. Every request was a model call: 9 calls',
    'r1 "Rotate a key?" has key "rotate a key?"', 'the model is called (call 1)', 'r4 "rotate a key?"', 'already cached, so no model call',
    'r6 "Lost key recovery?"', 'the oldest entry "find my invoice?" is evicted', '4 calls, 2 hits, 1 eviction.', 'r9 "Find my invoice?"', '"lost key recovery?" is evicted',
    '5 model calls, 4 hits, 2 evictions for 9 requests', 'First-in-first-out on the same requests: 7 calls', 'r7 and r8 found their answers already evicted',
    'expires after 40 minutes', 'At minute 42, r7 finds "rotate a key?" inserted at minute 0: 42 minutes old', 'r8 at minute 44 finds an entry 29 minutes old, still a hit',
    '6 calls, 3 hits, 1 expired, 2 evictions']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.counters, { requests: 9, calls: 6, hits: 3, evictions: 2, expired: 1 });
  assert.deepEqual([...end.slots].sort((a, b) => a.position - b.position).map((slot) => slot.key), expected.practice.steps[6].order);
  assert.equal(end.slots.find((slot) => slot.key === 'rotate a key?').state, 'expired');
  assert.equal(end.bars.cacheCalls, 6);
  assert.equal(end.finished, true);
});

test('at the end of each request beat the shelf holds exactly the recorded order and the counters match', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'request')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const resting = scene.slots.filter((slot) => slot.state !== 'evict');
    assert.deepEqual(resting.sort((a, b) => a.position - b.position).map((slot) => slot.key), beat.step.order, `order after ${beat.step.id}`);
    assert.deepEqual([scene.counters.calls, scene.counters.hits, scene.counters.evictions], [beat.step.calls, beat.step.hits, beat.step.evictions], `counters after ${beat.step.id}`);
    assert.equal(scene.counters.requests, beat.index + 1);
    assert.equal(scene.request.outcome, beat.step.outcome);
    assert.equal(scene.tray.length, beat.step.evictions);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 1.5);
  assert.deepEqual(atOutro.counters, { requests: 9, calls: 5, hits: 4, evictions: 2, expired: null });
  assert.equal(atOutro.bars.fifoAlpha, 1);
});

test('every sampled moment is consistent: never more than three resting slots, counters never fall, captions present', () => {
  let lastCalls = 0;
  let lastRequests = 0;
  const practice = timeline.beats.find((beat) => beat.kind === 'practice');
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.slots.filter((slot) => slot.state !== 'evict').length <= data.capacity, `slots at ${t}`);
    for (const slot of scene.slots) assert.ok(slot.position >= -1 && slot.position < data.capacity, `slot position at ${t}`);
    if (t < practice.start) {
      assert.ok(scene.counters.calls >= lastCalls, `calls fell at ${t}`);
      assert.ok(scene.counters.requests >= lastRequests, `requests fell at ${t}`);
      lastCalls = scene.counters.calls;
      lastRequests = scene.counters.requests;
    }
    assert.equal(scene.queue.length, data.requests.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.4, 4.2, 5.5, 8, 10.8, 13.5, 16, 18.4, 20.5, 23, 26, 26.8, 28, 29.4, 30.2, 31.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
