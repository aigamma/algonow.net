// The lesson animation must replay the real grounding check: its trace is
// compared with the fixture the Python suite derives from solution.py, its
// timeline must be a reading pace, and its scenes must stay consistent at
// every sampled moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrace, buildTimeline, sceneAt, drawScene, splitSentences, splitCitation, contentWords, checkGrounding, W, H } from '../scenarios/grounding-check-by-sentence-overlap/visuals/groundingModel.js';

const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = read('../scenarios/grounding-check-by-sentence-overlap/python/fixtures/answer.json');
const expected = read('../scenarios/grounding-check-by-sentence-overlap/python/fixtures/expected-trace.json');
const trace = buildTrace(data);
const timeline = buildTimeline(trace, data);
const kinds = timeline.beats.map((beat) => beat.kind);
const stopwords = new Set(data.stopwords);

test('the animation replays exactly the trace the Python solution produces', () => {
  assert.deepEqual(trace, expected);
  assert.deepEqual(splitSentences('Is it lost? Yes! Rotate it. Then stop'), ['Is it lost?', 'Yes!', 'Rotate it.', 'Then stop']);
  assert.deepEqual(splitCitation('Revoke it [c2, c3].'), { text: 'Revoke it.', cited: ['c2', 'c3'] });
  assert.deepEqual([...contentWords('Revoke the OLD key; revocation takes effect!', stopwords)].sort(), ['effect', 'key', 'old', 'revocation', 'revoke', 'takes']);
  assert.throws(() => checkGrounding('   ', data.chunks, data.threshold, stopwords), /no sentences/);
  assert.deepEqual(checkGrounding(data.answer, data.chunks, data.threshold, stopwords, true).map((row) => row.verdict), expected.practice.verdicts);
});

test('the timeline is a reading pace and complete: no beat under a second, about half a minute in all', () => {
  assert.ok(timeline.duration >= 25 && timeline.duration <= 45, `duration ${timeline.duration}`);
  for (let index = 1; index < timeline.markers.length; index += 1) assert.ok(timeline.markers[index] > timeline.markers[index - 1]);
  for (const beat of timeline.beats) assert.ok(beat.duration >= 1, `${beat.kind} lasts ${beat.duration} seconds`);
  for (const beat of timeline.beats.filter((b) => b.kind === 'sentence')) assert.ok(beat.duration >= 3 && beat.duration <= 3.5, 'about three seconds per sentence');
  assert.equal(timeline.beats.filter((b) => b.kind === 'sentence').length, expected.sentences.length);
  assert.deepEqual(kinds.filter((kind) => kind !== 'sentence'), ['intro', 'outro', 'practice-intro', 'practice']);
});

test('captions state the measured scores and the final scene holds every verdict, with the practice change', () => {
  const captions = timeline.beats.map((beat) => `${beat.caption} ${beat.captionLate || ''}`).join(' ');
  for (const phrase of ['4 of 4 passed', 'Sentence 1 (cites c1): 8 content words; shares 7 with c1 (0.875)', 'Sentence 2 (cites c3): 7 content words; shares 3 with c1 (0.429), 6 with c2 (0.857)',
    'Best c2 at 0.857, at or above 0.6: supported', 'Sentence 3 (cites c1): 6 content words; shares 1 with c1 (0.167)', 'Best c1 at 0.167, below 0.6: unsupported',
    'Every chunk shares only "key"', '5 with c2 (1.000)', '3 of 4 sentences supported; flagged: sentence 3', 'Sentence 2 scores 0.857 against c2 but cites c3: miscited',
    'Now 2 of 4 supported; flagged: sentence 2 (miscited), 3 (unsupported)']) {
    assert.ok(captions.includes(phrase), phrase);
  }
  const outro = timeline.beats.find((beat) => beat.kind === 'outro');
  const atOutro = sceneAt(timeline, trace, data, outro.start + 0.1);
  assert.deepEqual(atOutro.sentences.map((s) => s.verdict), expected.sentences.map((s) => s.verdict));
  assert.deepEqual(atOutro.summary, { checked: 4, total: 4, supported: 3, flagged: ['3'] });
  assert.ok(atOutro.sentences.every((s) => s.verdictAlpha === 1 && s.link && s.link.alpha > 0));
  const end = sceneAt(timeline, trace, data, timeline.duration);
  assert.deepEqual(end.sentences.map((s) => s.verdict), expected.practice.verdicts);
  assert.deepEqual(end.sentences.map((s) => s.color), ['green', 'amber', 'red', 'green']);
  assert.deepEqual(end.summary, { checked: 4, total: 4, supported: 2, flagged: ['2 (miscited)', '3 (unsupported)'] });
  assert.equal(end.finished, true);
});

test('each sentence beat ends with its verdict stamped and its link drawn to the best chunk', () => {
  for (const beat of timeline.beats.filter((b) => b.kind === 'sentence')) {
    const scene = sceneAt(timeline, trace, data, beat.start + beat.duration - 0.01);
    const sentence = scene.sentences[beat.index];
    const entry = expected.sentences[beat.index];
    assert.equal(sentence.state, 'active');
    assert.equal(sentence.verdict, entry.verdict);
    assert.ok(sentence.verdictAlpha > 0.99, `verdict stamped for sentence ${entry.number}`);
    assert.equal(data.chunks[sentence.link.chunkIndex].id, entry.best);
    assert.ok(sentence.link.alpha > 0.99);
    assert.equal(scene.panel.number, entry.number);
    assert.deepEqual(scene.panel.scores.map((s) => s.score), entry.scores.map((s) => s.score));
    assert.ok(scene.panel.words.every((chip) => chip.alpha === 1));
    assert.equal(scene.chunks[sentence.link.chunkIndex].shared.size, entry.scores.find((s) => s.id === entry.best).shared.length);
  }
});

test('every sampled moment is consistent: alphas in range, done sentences keep their verdicts, captions present', () => {
  let maxChecked = 0;
  for (let t = 0; t <= timeline.duration; t += 0.25) {
    const scene = sceneAt(timeline, trace, data, t);
    assert.ok(scene.caption.length > 20, `caption at ${t}`);
    assert.equal(scene.sentences.length, expected.sentences.length);
    assert.equal(scene.chunks.length, data.chunks.length);
    for (const sentence of scene.sentences) {
      for (const value of [sentence.alpha, sentence.verdictAlpha, sentence.highlight, sentence.citeHighlight]) assert.ok(value >= 0 && value <= 1, `alpha at ${t}`);
      if (sentence.link) assert.ok(sentence.link.alpha >= 0 && sentence.link.alpha <= 1 && ['green', 'amber', 'red'].includes(sentence.link.color));
      if (sentence.state === 'done' && !scene.practice) assert.equal(sentence.verdict, expected.sentences[sentence.number - 1].verdict);
    }
    if (scene.panel) for (const s of scene.panel.scores) assert.ok(s.fill >= 0 && s.fill <= s.score + 1e-9, `fill at ${t}`);
    assert.ok(scene.summary.checked >= maxChecked, `checked count shrank at ${t}`);
    maxChecked = scene.summary.checked;
  }
});

test('drawScene runs against a bare 2D context at sampled moments', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : (...args) => { calls.add(String(key)); return undefined; }),
    set: () => true,
  });
  for (const t of [0, 1, 2.5, 3.6, 4.5, 5.5, 6.5, 7.9, 10, 12.5, 14.4, 17, 18.5, 21, 22, 24, timeline.duration]) {
    drawScene(ctx, sceneAt(timeline, trace, data, t));
  }
  for (const needed of ['fillRect', 'fillText', 'stroke', 'fill', 'beginPath', 'bezierCurveTo']) assert.ok(calls.has(needed), needed);
});
