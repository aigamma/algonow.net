// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py, its timeline
// must be a reading pace, and its scenes must stay consistent at every
// sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, groupTurns, buildExamples, W, H } from '../scenarios/format-transcripts-into-sft-examples/visuals/transcriptWindowModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/format-transcripts-into-sft-examples/python/fixtures/turns.json');
const expected = read('../scenarios/format-transcripts-into-sft-examples/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(trace.walk.map((r) => [r.turn, r.decision, r.context_size, r.dropped]), [[2, 'example', 1, 0], [4, 'skipped-empty', 0, 0], [6, 'example', 4, 1], [2, 'example', 1, 0]]);
  assert.throws(() => groupTurns([...data.rows, { conversation: 'c1', turn: 2, role: 'assistant', text: 'Rotate it.' }]), /two turns with index 2/);
  for (const window of [0, 1, 2, 3, 4, 10]) {
    for (const example of buildExamples(data.rows, window).examples) assert.ok(example.context.length <= window, `window ${window}`);
  }
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'walk')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3.2, 'about three seconds per assistant turn');
  assert.deepEqual(kinds, ['intro', 'sort', 'walk', 'walk', 'walk', 'walk', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the final scene holds the practice result', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['9 rows', 'turn 5 before turn 4', '2 examples, and c1\'s context held 5 turns', 'c1 has 6 turns, c2 has 3', 'c1 turn 2: 1 earlier turn', 'context holds 1',
    'c1 turn 4: the assistant text is empty', 'c1 turn 6: 5 earlier turns', 'context holds 4 and turn 1 falls outside the window', 'Example 3', '3 examples, 1 skipped',
    'one with 5 turns of context', 'c2 turn 2 has 2 words and is skipped', '2 examples, 2 skipped']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.equal(end.finished, true);
  assert.deepEqual(end.counts, { examples: 2, skipped: 2 });
  assert.equal(end.cards.length, 3);
  assert.ok(end.cards.find((card) => card.conversation === 'c2').alpha < 0.5, 'the short answer\'s card fades');
  assert.ok(end.practice && end.practice.systemAlpha === 1);
});

test('the walk beats show the right window and target, and cards appear in order', () => {
  const walks = timeline.beats.filter((b) => b.kind === 'walk');
  walks.forEach((beat, index) => {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const record = trace.walk[index];
    assert.equal(scene.target.conversation, record.conversation);
    assert.equal(scene.target.position, record.position);
    if (record.decision === 'example') {
      assert.deepEqual([scene.window.start, scene.window.end], [record.start, record.position]);
      assert.equal(scene.cards.length, beat.number);
      assert.equal(scene.cards[scene.cards.length - 1].contextSize, record.context_size);
    } else {
      assert.equal(scene.window, null);
      assert.equal(scene.target.kind, 'skip');
      assert.ok(scene.skipNote && scene.skipNote.text.includes('empty'));
    }
  });
  const outro = sceneAt(timeline, trace, data, timeline.beats[6].start + 0.1);
  assert.deepEqual(outro.counts, { examples: 3, skipped: 1 });
});

test('every sampled moment is consistent: rows stay on the canvas, counts never exceed the totals, captions present', () => {
  let lastCards = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.rows.length, data.rows.length);
    for (const row of scene.rows) assert.ok(row.x >= 0 && row.x <= W && row.y >= 0 && row.y <= H, `row off canvas at ${t}`);
    assert.ok(scene.counts.examples <= trace.examples.length && scene.counts.skipped <= trace.practice.skipped);
    if (scene.beat !== 'practice' && scene.beatIndex < 7) { assert.ok(scene.cards.length >= lastCards, `cards shrank at ${t}`); lastCards = scene.cards.length; }
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.5, 6, 7, 9, 10.5, 12, 13.5, 15, 17, 18.5, 20, 21.5, 22.5, 24, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
