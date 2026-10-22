// The lesson animation must replay the real functions: its trace is compared
// with the fixture the Python suite derives from solution.py and
// practice_answer.py (the seeded sample's ids come from that fixture, since
// random.Random is not ported), its timeline must be a reading pace, and its
// scenes must stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, downsample, countLabels, W, H } from '../scenarios/balance-classes-by-downsampling/visuals/classBalanceModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/balance-classes-by-downsampling/python/fixtures/records.json');
const expected = read('../scenarios/balance-classes-by-downsampling/python/fixtures/expected-trace.json');
const given = { sampled: expected.sampled, repeats: expected.practice.repeats };
const trace = buildTrace(data, given);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const beatOf = (kind) => timeline.beats.find((beat) => beat.kind === kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(countLabels(data.records), { billing: 7, access: 3, outage: 2 });
  assert.deepEqual(downsample(data.records, 7, {}).dropped, [], 'a cap at the biggest label drops nothing');
  assert.deepEqual(downsample(data.records, 3, given.sampled).kept.map((record) => record.id), expected.kept, 'input order is restored');
  assert.throws(() => downsample(data.records, 0, given.sampled), /cap must be at least 1/);
  assert.throws(() => downsample([{ id: 'r13', text: 'no label' }], 3, {}), /no label/);
  assert.throws(() => downsample(data.records, 3, {}), /no seeded sample/);
});

test('the timeline is a reading pace and complete: no beat under a second, under half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'label')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3.5, 'about three seconds per label');
  assert.deepEqual(kinds, ['intro', 'count', 'label', 'label', 'label', 'order', 'outro', 'practice-intro', 'practice']);
  assert.deepEqual(timeline.beats.filter((b) => b.kind === 'label').map((b) => b.label), trace.labels);
  assert.deepEqual(timeline.beats.filter((b) => b.kind === 'label').map((b) => b.over), [false, true, false]);
});

test('captions state the measured numbers and the final scene holds the balanced set', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['right 7 of 12 times (58 percent)', 'access 3, billing 7, outage 2', 'keeps r6, r8, r12 and drops r1, r3, r4, r9',
    'every record is kept (r2, r7, r11)', 'every record is kept (r5, r10)', 'input order by position: r2, r5, r6, r7, r8, r10, r11, r12',
    '8 kept, 4 dropped', 'right 3 of 8 times (38 percent)', 'outage gains one repeat, r10', 'right 3 of 9 times (33 percent)']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.chips.map((chip) => chip.id), expected.practice.kept);
  assert.deepEqual(end.chips.map((chip) => chip.kind), [...expected.kept.map(() => 'kept'), 'repeat']);
  assert.equal(end.cards.length, data.records.length + 1, 'the repeat card joins the twelve');
  const dropped = end.cards.filter((card) => card.border === 'red');
  assert.deepEqual(dropped.map((card) => card.id), expected.dropped);
  for (const card of dropped) assert.ok(card.alpha < 0.5 && card.tag === 'dropped');
  for (const card of end.cards.filter((card) => card.border === 'blue')) assert.equal(card.label, 'billing', 'the sampled label is marked blue');
  for (const card of end.cards.filter((card) => card.border === 'green')) assert.ok(['access', 'outage'].includes(card.label));
  assert.deepEqual(end.counts, { kept: 8, dropped: 4, repeats: 1 });
  assert.ok(end.panel.majorityText.includes('3 of 9'));
  assert.equal(end.finished, true);
});

test('the outro scene holds the worked result before the practice changes it', () => {
  const outro = beatOf('outro');
  const scene = sceneAt(timeline, trace, data, outro.start + outro.duration - 0.01);
  assert.deepEqual(scene.chips.map((chip) => chip.id), expected.kept);
  assert.equal(scene.cards.length, data.records.length);
  assert.deepEqual(scene.panel.rows.map((row) => Math.round(row.afterShown)), [3, 3, 2]);
  assert.ok(scene.panel.majorityText.includes('before 7 of 12 (58%), after 3 of 8 (38%)'));
  const order = beatOf('order');
  const before = sceneAt(timeline, trace, data, order.start - 0.01);
  assert.equal(before.chips.length, 0, 'chips appear only in the order beat');
  assert.equal(before.counts.kept, 8);
});

test('every sampled moment is consistent: alphas bounded, chips inside the canvas, counts only grow', () => {
  let lastChips = 0;
  let lastKept = 0;
  let lastDropped = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.cards.length === 12 || scene.cards.length === 13, `cards at ${t}`);
    for (const card of scene.cards) assert.ok(card.alpha >= 0 && card.alpha <= 1 && card.x >= 0 && card.x + 250 <= W && card.y >= 0 && card.y + 28 <= H, `card ${card.id} at ${t}`);
    for (const chip of scene.chips) assert.ok(chip.x >= 0 && chip.x + 44 <= W && chip.y >= 0 && chip.y + 24 <= H && chip.alpha >= 0 && chip.alpha <= 1, `chip ${chip.id} at ${t}`);
    assert.ok(scene.chips.length >= lastChips, `chips shrank at ${t}`);
    assert.ok(scene.counts.kept >= lastKept && scene.counts.dropped >= lastDropped, `counts fell at ${t}`);
    lastChips = scene.chips.length;
    lastKept = scene.counts.kept;
    lastDropped = scene.counts.dropped;
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3.5, 5, 6.5, 9, 10.5, 12, 14, 16, 18, 20, 22, 23.5, 25, 26.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'setLineDash']) assert.ok(calls.has(needed), needed);
});
