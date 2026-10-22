// The lesson animation must replay the real parse and decisions: its trace is
// compared with the fixture the Python suite derives from solution.py and
// csv.DictReader, its timeline must be a reading pace, and its scenes must
// stay consistent at every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, parseCsv, splitOnCommas, rowsToExamples, jsonLine, W, H } from '../scenarios/convert-csv-rows-to-jsonl/visuals/csvJsonlModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/convert-csv-rows-to-jsonl/python/fixtures/export.json');
const expected = read('../scenarios/convert-csv-rows-to-jsonl/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(parseCsv(data.csv_text).slice(1).map((fields) => fields.length), [4, 4, 4, 4, 4], 'the field walker agrees with csv.DictReader');
  assert.deepEqual(parseCsv('a,"b ""x"" c",d\n')[0], ['a', 'b "x" c', 'd'], 'a doubled quote inside quotes is one quote');
  assert.deepEqual(splitOnCommas(data.csv_text).map((fields) => fields.length), [4, 5, 4, 2, 4, 4]);
  assert.equal(jsonLine({ prompt: 'A?', completion: 'one\ntwo "q"' }), '{"prompt": "A?", "completion": "one\\ntwo \\"q\\""}');
  const practice = rowsToExamples(trace.rows, 93);
  assert.deepEqual(practice.skipped.too_long, ['t1'], 'one under the longest example drops it');
  assert.deepEqual(rowsToExamples(trace.rows, 94).skipped.too_long, [], 'exactly the budget still fits');
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) assert.ok(beat.duration >= 2.2 && beat.duration <= 3, 'about three seconds per row');
  assert.equal(timeline.beats.filter((beat) => beat.kind === 'row').length, 5);
  assert.deepEqual(kinds.filter((kind) => kind !== 'row'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured numbers and the scenes end in the right states', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['6 lines with 4, 5, 4, 2, 4, 4 fields', 'two of the 5 rows shredded', 't1: 4 fields, no quotes', 'kept as JSONL line 1',
    'split on commas would give 5 fields', 'kept as JSONL line 2', 'spans two lines of the file', '4 and 2 fields', 'line break as two characters',
    'skipped as not_closed', 'skipped as empty_reply', '5 rows read, 3 examples kept', 'not_closed t4; empty_reply t5', 'budget of 90',
    't1 is 94 characters', 't2 (79) and t3 (76) fit', '2 examples kept']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.output.map((line) => line.id), ['t1', 't2', 't3']);
  assert.deepEqual(atOutro.output.map((line) => line.text), expected.steps.filter((step) => step.decision === 'kept').map((step) => step.line));
  assert.deepEqual(atOutro.skipped.map((entry) => [entry.id, entry.reason]), [['t4', 'not_closed'], ['t5', 'empty_reply']]);
  assert.deepEqual(atOutro.counts, { rows: 5, kept: 3, skipped: 2 });
  assert.deepEqual(atOutro.rows.map((row) => row.state), ['kept', 'kept', 'kept', 'skipped', 'skipped']);
  assert.equal(atOutro.meter, null);
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.meter.items.map((item) => [item.id, item.chars, item.over]), [['t1', 94, true], ['t2', 79, false], ['t3', 76, false]]);
  assert.equal(end.meter.kept, 2);
  assert.equal(end.meter.budget, 90);
  assert.equal(end.finished, true);
});

test('each row beat parses its row, shows the shards, decides, and delivers the line or the skip', () => {
  let delivered = 0;
  for (const beat of timeline.beats.filter((b) => b.kind === 'row')) {
    const mid = sceneAt(timeline, trace, data, beat.start + 1.9);
    assert.equal(mid.parser.id, beat.step.id);
    assert.deepEqual(mid.parser.fields.map((field) => field.value), beat.step.fields);
    assert.ok(mid.parser.fields.every((field) => field.alpha === 1), 'all four fields are in place before the decision');
    assert.deepEqual(mid.parser.shards, beat.step.naive_lines);
    assert.equal(mid.parser.decision, beat.step.decision);
    assert.equal(mid.rows[beat.index].state, beat.step.decision === 'kept' ? 'kept' : 'skipped');
    const end = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    delivered += 1;
    assert.equal(end.counts.rows, delivered, `row ${beat.step.id} delivered by the end of its beat`);
    assert.equal(end.parser.moving, false);
  }
});

test('every sampled moment is consistent: counts never fall, states only settle, captions present', () => {
  let lastRows = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.ok(scene.counts.rows >= lastRows, `rows read fell at ${t}`);
    lastRows = scene.counts.rows;
    assert.equal(scene.counts.kept + scene.counts.skipped, scene.counts.rows);
    assert.equal(scene.rows.length, 5);
    assert.ok(scene.output.length <= 3 && scene.skipped.length <= 2);
    for (const row of scene.rows) assert.ok(['pending', 'active', 'kept', 'skipped'].includes(row.state));
    if (scene.meter) for (const item of scene.meter.items) assert.ok(item.shown >= 0 && item.shown <= item.chars + 1e-9);
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2, 3, 3.5, 4.2, 4.8, 5.5, 6.5, 7.5, 9, 10.5, 12, 13.2, 15, 16.8, 18.5, 19.5, 21.5, 23, 24.5, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath']) assert.ok(calls.has(needed), needed);
});
