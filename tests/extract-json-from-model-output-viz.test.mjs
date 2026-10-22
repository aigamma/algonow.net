// The lesson animation must replay the real brace walk, parse, and checks: its
// trace is compared with the fixture the Python suite derives from solution.py,
// its timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, findJsonSpan, validate, repairTrailingCommas, CHECK_LABELS, W, H } from '../scenarios/extract-json-from-model-output/visuals/jsonExtractModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/extract-json-from-model-output/python/fixtures/replies.json');
const expected = read('../scenarios/extract-json-from-model-output/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(findJsonSpan('x {"a": {"b": 1}} y'), [2, 16]);
  assert.deepEqual(findJsonSpan('{"a": "say \\"}\\"", "b": 2}'), [0, 25]);
  assert.equal(findJsonSpan('{"a": "unterminated }'), null);
  assert.equal(validate({ intent: 'x', priority: true, tags: [] }, data.required_keys, data.priority_range), 'priority must be an integer from 1 to 3');
  assert.equal(validate({ intent: 'x', priority: 2, tags: ['a'] }, data.required_keys, data.priority_range), null);
  assert.equal(repairTrailingCommas('{"a": [1,\n  ],\n}'), '{"a": [1\n  ]\n}');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'reply')) assert.ok(beat.duration >= 3 && beat.duration <= 3.5, 'about three seconds per reply');
  assert.equal(timeline.beats.filter((b) => b.kind === 'reply').length, data.replies.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'reply'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured positions and verdicts, and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['parses 2 of the 6 (r1, r5)', 'raises on 4', 'opens at 0 and the object closes at 64', '65 characters', 'before position 8',
    'opens at 34', 'braces at 97 and 101 sit inside a string', 'closes at 104', 'stops at 77', 'no object', 'closes at 61', 'priority must be an integer from 1 to 3',
    'closes at 80', 'invalid json', 'accepted 3 (r1, r2, r3), rejected 3', 'comma at position 79', 'repaired a trailing comma', 'accepted 4, rejected 2']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.tally.chips.map((chip) => chip.state), ['accepted', 'accepted', 'accepted', 'rejected', 'rejected', 'rejected']);
  assert.deepEqual([atOutro.tally.accepted, atOutro.tally.rejected], [3, 3]);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.finished, true);
  assert.deepEqual([end.tally.accepted, end.tally.rejected], [4, 2]);
  assert.equal(end.stamp.kind, 'accepted');
  assert.ok(end.stamp.text.includes('repaired a trailing comma'));
  assert.equal(end.practice.removed, true);
  assert.ok(end.checklist.every((item) => item.state === 'ok'));
});

test('each reply beat walks every character, ticks the checks in order, and stamps the recorded verdict', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'reply')) {
    const entry = expected.replies[beat.index];
    const end = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    assert.equal(end.reply.cursor, entry.length, `${entry.id} walked to the end`);
    assert.equal(end.reply.closed, entry.span !== null);
    assert.deepEqual(end.reply.ignored, entry.ignored_braces);
    assert.equal(end.stamp.kind, entry.outcome);
    const states = end.checklist.map((item) => item.state);
    if (entry.outcome === 'accepted') assert.deepEqual(states, CHECK_LABELS.map(() => 'ok'));
    else {
      assert.ok(states.includes('fail'), `${entry.id} shows a failed check`);
      assert.ok(!states.slice(states.indexOf('fail') + 1).includes('ok'), 'nothing after the failed check passes');
    }
    const mid = sceneAt(timeline, trace, data, beat.start + 0.9);
    assert.ok(mid.reply.cursor > 0 && mid.reply.cursor < entry.length, `${entry.id} mid-walk`);
    assert.equal(mid.stamp, null);
  }
});

test('every sampled moment is consistent: cursor within the reply, depth within the walk, tallies never shrink before the practice', () => {
  let lastSettled = 0;
  const practice = timeline.beats.find((beat) => beat.kind === 'practice');
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    if (scene.reply) {
      assert.ok(scene.reply.cursor >= 0 && scene.reply.cursor <= scene.reply.length, `cursor at ${t}`);
      assert.ok(scene.reply.depth >= 0 && scene.reply.depth <= 1, `depth at ${t}`);
    }
    const settled = scene.tally.accepted + scene.tally.rejected;
    if (t < practice.start) assert.ok(settled >= lastSettled, `tally shrank at ${t}`);
    lastSettled = settled;
    assert.equal(scene.checklist.length, CHECK_LABELS.length);
    assert.equal(scene.tally.chips.length, data.replies.length);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.2, 4, 5.5, 6.5, 9, 10.5, 13, 16.5, 20, 23.2, 24, 26, 27, 28.5, 29.8, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
