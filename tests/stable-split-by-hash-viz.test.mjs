// The lesson animation must replay the real rule: its SHA-256 and bucket
// arithmetic are pinned to known digests and to the trace the Python suite
// derives from solution.py, its timeline must be a reading pace, and its
// scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, sha256Hex, bucket, threeWaySide, W, H } from '../scenarios/stable-split-by-hash/visuals/stableSplitModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/stable-split-by-hash/python/fixtures/transcripts.json');
const expected = read('../scenarios/stable-split-by-hash/python/fixtures/expected-trace.json');
const trace = buildTrace(data, expected.shuffle);
const timeline = buildTimeline(trace, data);

test('the browser SHA-256 matches known digests, across the padding boundary, and Python for the ids', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  assert.equal(sha256Hex('a'.repeat(200)).length, 64);
  assert.equal(sha256Hex('t-1813').slice(0, 8), '778f7950');
  assert.equal(bucket('t-1813'), 8);
  assert.equal(bucket('t-1817'), 94);
  assert.equal(threeWaySide('t-1816', data.test_share, data.validation_share), 'validation');
});

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.records.map((record) => record.bucket), [8, 56, 19, 28, 94, 40, 47, 7]);
  assert.equal(trace.unchanged, true);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'place')) assert.ok(beat.duration >= 2 && beat.duration <= 3, 'two to three seconds per placement');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'place').length, 8);
  assert.deepEqual(timeline.beats.map((beat) => beat.kind).filter((kind) => kind !== 'place'),
    ['intro', 'week-two', 'unchanged', 'shuffle', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene shows the three-way split', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['778f7950', '2005891408', 'mod 100 = 8: validation', 'mod 100 = 94: train', 'seed 7',
    'week 1 validation t-1817', 'week 2 validation t-1819, t-1820', 't-1817 was validation in week 1 and train in week 2',
    'test t-1813, t-1820', 'validation t-1815, t-1816', 'did not move']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.markers.length, 8);
  assert.equal(end.practice, 1);
  assert.deepEqual(end.markers.map((marker) => end.threeWay[marker.id]), ['test', 'train', 'validation', 'validation', 'train', 'train', 'train', 'test']);
  assert.equal(end.shuffleAlpha, 1);
  assert.equal(end.finished, true);
  assert.equal(end.ghost, null);
});

test('every sampled moment is consistent: markers only for landed ids, in order, labels on distinct spots', () => {
  let sawGhost = false;
  let sawFrame = false;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.markers.length <= 8, `markers at ${t}`);
    const placed = timeline.beats.slice(0, scene.beatIndex).filter((beat) => beat.kind === 'place').length;
    assert.ok(scene.markers.length >= placed && scene.markers.length <= placed + 1, `landed count at ${t}`);
    scene.markers.forEach((marker, index) => {
      assert.equal(marker.id, trace.records[index].id, 'ids land in arrival order');
      assert.ok(marker.alpha >= 0 && marker.alpha <= 1);
      scene.markers.slice(0, index).forEach((other) => {
        if (other.row === marker.row) assert.ok(Math.abs(other.x - marker.x) >= 64, `labels overlap at ${t}`);
      });
    });
    if (scene.ghost) { sawGhost = true; assert.equal(scene.beat, 'place'); }
    if (scene.frameAlpha > 0) { sawFrame = true; assert.ok(['unchanged', 'shuffle'].includes(scene.beat)); }
    if (scene.beat === 'intro') assert.equal(scene.markers.length, 0);
    for (const chip of scene.chips) assert.ok(chip.alpha >= 0 && chip.alpha <= 1);
  }
  assert.ok(sawGhost && sawFrame);
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.9, 3.2, 4, 5.3, 8, 12, 17, 18, 19.5, 22, 23.5, 25, 27, 30, 32, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
