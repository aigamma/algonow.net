// The lesson animation must replay the real sliding-window chunker: its trace
// is compared with the fixture the Python suite derives from solution.py and
// practice_answer.py, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, chunkWords, wholeIn, expand, W, H } from '../scenarios/sliding-window-chunks-with-overlap/visuals/windowChunksModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/sliding-window-chunks-with-overlap/python/fixtures/document.json');
const expected = read('../scenarios/sliding-window-chunks-with-overlap/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace);
const kinds = timeline.beats.map((beat) => beat.kind);
const words = data.document.split(' ');

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.chunks.map((chunk) => [chunk.start, chunk.end]), [[0, 12], [8, 20], [16, 28], [24, 36], [32, 39]]);
  assert.equal(trace.stored_words, 55);
  assert.deepEqual(trace.span.whole_in, ['c3']);
  assert.deepEqual(trace.no_overlap.whole_in, []);
  assert.throws(() => chunkWords(data.document, 0, 0), /window/);
  assert.throws(() => chunkWords(data.document, 12, 12), /overlap/);
  assert.deepEqual(chunkWords('', 12, 4), []);
  assert.deepEqual(chunkWords('one two three four', 2, 1).map((c) => [c.start, c.end]), [[0, 2], [1, 3], [2, 4]]);
  assert.deepEqual(wholeIn(trace.chunks, 20, 32), []);
  assert.deepEqual(expand(trace.chunks, words, 'c5').ids, ['c4', 'c5']);
  assert.throws(() => expand(trace.chunks, words, 'c9'), /unknown chunk/);
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 40, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'a steady beat per window');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'chunk').length, 5);
  assert.deepEqual(kinds.filter((kind) => kind !== 'chunk'), ['intro', 'span', 'storage', 'shipped', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured positions, texts, and counts, and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['instruction "set the timeout to thirty seconds," sits at words 22 to 27', 'boundary at word 24 cuts the instruction in two',
    'c1: words 0 to 11, "The gateway returns a timeout when the model takes longer than the"',
    'c2: words 8 to 19, "takes longer than the limit. Check the queue depth and the logs."; it starts 8 words after c1 and shares words 8 to 11 with it',
    'c5: words 32 to 38 (the last window is short: 7 words reach the end)', 'lies whole in c3 (words 16 to 27)', 'every span of up to 5 words a home',
    '5 chunks hold 55 words for a document of 39, 1.41 times', 'overlap 0 gives 4 chunks with boundaries at 12, 24, 36',
    'is 12 words long, so no 12-word window at stride 8 holds it whole', 'returns c2, c3, c4: words 8 to 35, which contains the whole sentence (words 20 to 31)',
    'c1 expands to c1 and c2 only']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, timeline.duration);
  assert.equal(end.placed, 5);
  assert.equal(end.stored, 55);
  assert.equal(end.spanState, 'whole');
  assert.equal(end.practice.phase, 2);
  assert.equal(end.practice.expandAlpha, 1);
  assert.deepEqual(end.practice.expanded, { ids: ['c2', 'c3', 'c4'], start: 8, end: 36 });
  assert.equal(end.finished, true);
});

test('each window beat ends with its bar complete, its overlap hatched, and the stored count including it', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'chunk')) {
    const scene = sceneAt(timeline, trace, beat.start + beat.duration - 0.01);
    assert.equal(scene.placed, beat.index + 1, `${expected.chunks[beat.index].id} placed`);
    const bar = scene.bars[beat.index];
    assert.equal(bar.progress, 1);
    if (beat.index) assert.deepEqual(bar.overlap, { start: expected.chunks[beat.index].start, end: expected.chunks[beat.index - 1].end });
    else assert.equal(bar.overlap, null);
    assert.equal(scene.stored, expected.chunks.slice(0, beat.index + 1).reduce((sum, chunk) => sum + chunk.end - chunk.start, 0));
    const growing = sceneAt(timeline, trace, beat.start + 0.45);
    assert.ok(growing.bars[beat.index].progress > 0 && growing.bars[beat.index].progress < 1, 'the bar is growing early in the beat');
    assert.equal(growing.bars[beat.index].overlap, null, 'no hatch before the bar is complete');
    assert.equal(growing.spanState, 'plain');
  }
  const spanBeat = timeline.beats.find((b) => b.kind === 'span');
  assert.equal(sceneAt(timeline, trace, spanBeat.start + 1).spanState, 'whole');
  const shipped = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'shipped').start + 1.5);
  assert.equal(shipped.shippedAlpha, 1);
  assert.equal(sceneAt(timeline, trace, spanBeat.start + 1).shippedAlpha, 0);
  const practiceIntro = sceneAt(timeline, trace, timeline.beats.find((b) => b.kind === 'practice-intro').start + 0.9);
  assert.equal(practiceIntro.practice.phase, 1);
  assert.equal(practiceIntro.practice.expandAlpha, 0);
});

test('every sampled moment is consistent: bars only accumulate, counts bounded, captions present', () => {
  let placed = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.placed >= placed, `bars vanished at ${t}`);
    placed = scene.placed;
    assert.ok(scene.stored <= 55 && scene.placed <= 5);
    assert.equal(scene.bars.length, 5);
    for (const bar of scene.bars) assert.ok(bar.progress >= 0 && bar.progress <= 1);
    for (const alpha of [scene.rulerAlpha, scene.spanPulse, scene.storageAlpha, scene.shippedAlpha]) assert.ok(alpha >= 0 && alpha <= 1);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 4.5, 6, 8.5, 10, 12.4, 14.5, 16, 18, 20.5, 23, 25.5, 27, 28.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, t), trace);
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'clip', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
