// The lesson animation must replay the real line buffer: its trace is compared
// with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, readStream, shipped, W, H } from '../scenarios/parse-streamed-model-events/visuals/streamModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/parse-streamed-model-events/python/fixtures/chunks.json');
const expected = read('../scenarios/parse-streamed-model-events/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);
const REPLY = 'Restart the worker, then set the timeout.';

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.equal(trace.text, REPLY);
  assert.equal(trace.events, 6);
  assert.deepEqual(trace.steps.map((step) => step.waiting), [0, 0, 11, 0, 0, 40]);
  assert.deepEqual(trace.shipped, { crashed_at: 2, delivered: 'Restart ' });
  const whole = data.chunks.join('');
  for (const cut of [1, 5, 12, 29, 40, 81, 100, whole.length - 1]) {
    const result = readStream([whole.slice(0, cut), whole.slice(cut)]);
    assert.equal(result.text, REPLY, `cut at ${cut}`);
  }
  assert.equal(readStream([...whole]).text, REPLY, 'one character at a time');
  assert.throws(() => readStream(['data: {"delta": "x"\n\n']), /malformed event/);
  assert.throws(() => readStream(['data: {"delta": "x"}\n\n']), /without \[DONE\]/);
  assert.deepEqual(shipped([data.chunks[0], data.chunks[2]]), { crashed_at: 2, delivered: 'Restart ' });
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 22 && timeline.duration <= 40, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per chunk');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'chunk').length, 6);
  assert.deepEqual(kinds.filter((kind) => kind !== 'chunk'), ['intro', 'outro', 'shipped', 'practice-intro', 'practice']);
});

test('captions state the measured lines, deltas, and waits, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['6 network chunks of one streamed reply', 'Chunk 2 was not one JSON document, so the stream died with "Restart " delivered',
    'Chunk 1 (29 characters): 2 lines released, 1 text event, "Restart "; 0 waiting. Text so far: "Restart "',
    'Chunk 2 (52 characters): 4 lines released, 2 text events, "the " and "worker"; 0 waiting',
    'Chunk 3 (11 characters): 0 lines released, no line break yet, so nothing is released and 11 characters wait in the buffer',
    'Chunk 4 (30 characters) completes the split event: 4 lines released, 1 text event, ", then "; a keepalive comment, skipped; 0 waiting',
    'Chunk 6 (92 characters): 3 lines released, a usage event with no text; the end marker, so reading stops and the 40 characters after it are never read',
    '6 events, 41 characters of reply', 'carries 9 output tokens']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.text, REPLY);
  assert.equal(end.eventsSoFar, 6);
  assert.equal(end.consumed, 6);
  assert.equal(end.done, true);
  assert.equal(end.waiting, 40);
  assert.equal(end.practiceAlpha, 1);
  assert.equal(end.finished, true);
});

test('each chunk beat appends, releases its lines in order, and ends with the fixture buffer and text', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) {
    const step = expected.steps[beat.index];
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.consumed, beat.index + 1, `chunk ${step.chunk} consumed`);
    assert.equal(scene.buffer, step.remaining, `chunk ${step.chunk} buffer`);
    assert.equal(scene.text, step.text, `chunk ${step.chunk} text`);
    assert.equal(scene.released.length, expected.steps.slice(0, beat.index + 1).reduce((sum, s) => sum + s.lines.length, 0));
    const early = sceneAt(timeline, trace, beat.start + 0.05);
    assert.equal(early.consumed, beat.index);
    assert.equal(early.chunks[beat.index].state, 'next');
    const appended = sceneAt(timeline, trace, beat.start + 0.55);
    assert.equal(appended.buffer, step.appended, `chunk ${step.chunk} appended before any release`);
    assert.equal(appended.chunks[beat.index].state, 'current');
    if (step.lines.length > 1) {
      const partial = sceneAt(timeline, trace, beat.start + 0.6 + 0.3 * 1.5);
      assert.equal(partial.released.length - expected.steps.slice(0, beat.index).reduce((sum, s) => sum + s.lines.length, 0), 1, `chunk ${step.chunk} releases one line at a time`);
    }
  }
  const shippedScene = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'shipped').start + 1.5);
  assert.equal(shippedScene.shippedAlpha, 1);
});

test('every sampled moment is consistent: released lines only accumulate, text is a prefix of the reply, captions present', () => {
  let released = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.released.length >= released, `lines vanished at ${t}`);
    released = scene.released.length;
    assert.ok(REPLY.startsWith(scene.text), `text ${JSON.stringify(scene.text)} at ${t}`);
    assert.equal(scene.chunks.length, 6);
    assert.ok(scene.waiting >= 0);
    for (const alpha of [scene.shippedAlpha, scene.practiceAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4, 5.5, 7, 8.5, 10, 12, 13.5, 15, 16.5, 18, 19.5, 21, 23, 25, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
