// The lesson's animation, without a DOM: the same label building and padding
// as solution.py (and the left truncation of practice_answer.py), run on the
// same examples (python/fixtures/examples.json), recorded as a trace, laid out
// on a reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const lerp = (from, to, p) => from + (to - from) * p;

// encode from solution.py: ids in order of first appearance, 0 and 1 reserved.
export function encode(text, vocab) {
  const ids = [];
  for (const word of text.split(/\s+/).filter((w) => w.length)) {
    if (!(word in vocab)) vocab[word] = Object.keys(vocab).length + 2;
    ids.push(vocab[word]);
  }
  return ids;
}

// build_labels from solution.py.
export function buildLabels(example, vocab, eos, ignore) {
  const promptIds = encode(example.prompt, vocab);
  const completionIds = encode(example.completion, vocab);
  if (!completionIds.length) throw new Error(`nothing to train on: empty completion for prompt '${example.prompt}'`);
  const ids = [...promptIds, ...completionIds, eos];
  const labels = [...new Array(promptIds.length).fill(ignore), ...completionIds, eos];
  return { ids, labels };
}

// pad_batch from solution.py.
export function padBatch(rows, pad, ignore) {
  let longest = 0;
  for (const row of rows) longest = Math.max(longest, row.ids.length);
  return rows.map((row) => {
    const missing = longest - row.ids.length;
    return { ids: [...row.ids, ...new Array(missing).fill(pad)], labels: [...row.labels, ...new Array(missing).fill(ignore)],
      mask: [...new Array(row.ids.length).fill(1), ...new Array(missing).fill(0)] };
  });
}

// fit from practice_answer.py: drop prompt positions from the left.
export function fit(ids, labels, maxLen, ignore) {
  if (ids.length <= maxLen) return { ids, labels };
  const promptLength = labels.filter((label) => label === ignore).length;
  const trained = ids.length - promptLength;
  if (trained > maxLen) throw new Error(`a completion of ${trained - 1} tokens plus eos does not fit a maximum length of ${maxLen}`);
  return { ids: ids.slice(-maxLen), labels: labels.slice(-maxLen) };
}

const countTrained = (batch, ignore) => batch.reduce((sum, row) => sum + row.labels.filter((label) => label !== ignore).length, 0);
const countReal = (batch) => batch.reduce((sum, row) => sum + row.mask.reduce((a, b) => a + b, 0), 0);

export function buildTrace(data) {
  const vocab = {};
  const rows = data.examples.map((example) => buildLabels(example, vocab, data.eos, data.ignore));
  const batch = padBatch(rows, data.pad, data.ignore);
  const idToWord = {};
  for (const [word, id] of Object.entries(vocab)) idToWord[id] = word;
  idToWord[data.eos] = '<eos>';
  idToWord[data.pad] = '<pad>';
  const fitted = rows.map((row) => fit(row.ids, row.labels, data.max_len, data.ignore));
  const practiceBatch = padBatch(fitted, data.pad, data.ignore);
  return {
    pad: data.pad, eos: data.eos, ignore: data.ignore,
    vocabulary: Object.keys(vocab).length,
    examples: data.examples.map((example, index) => ({
      prompt: example.prompt, completion: example.completion,
      prompt_tokens: example.prompt.split(' ').length, completion_tokens: example.completion.split(' ').length,
      ids: rows[index].ids, labels: rows[index].labels, words: rows[index].ids.map((id) => idToWord[id]),
    })),
    longest: batch[0].ids.length,
    batch,
    trained: countTrained(batch, data.ignore),
    real: countReal(batch),
    shipped: { trained: countReal(batch), prompt_tokens: data.examples.reduce((sum, example) => sum + example.prompt.split(' ').length, 0) },
    practice: { max_len: data.max_len,
      rows: fitted.map((row, index) => ({ ids: row.ids, labels: row.labels, dropped: rows[index].ids.length - row.ids.length })),
      longest: practiceBatch[0].ids.length, trained: countTrained(practiceBatch, data.ignore), real: countReal(practiceBatch) },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const EXAMPLE_BEAT = 3.0;
const IDS_AT = 0.15, IDS = 0.5;
const MASK_AT = 0.9, MASK = 0.7;
const PAD_BEAT = 2.5;
const COUNT = 2.5;
const SHIPPED = 3.0;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.examples.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} training examples, each a customer prompt and the assistant's completion. The stand-in tokenizer gives each new word the next id; pad is ${trace.pad}, end of sequence is ${trace.eos}, and ${trace.ignore} is the label the loss skips.`,
    captionLate: `What shipped: labels equal to the input ids, so the loss counted every one of the ${trace.shipped.trained} real tokens, the ${trace.shipped.prompt_tokens} prompt tokens included. The model was trained to write customer questions.` });
  t += INTRO;
  trace.examples.forEach((example, index) => {
    beats.push({ kind: 'example', start: t, duration: EXAMPLE_BEAT, index,
      caption: `Example ${index + 1}: "${example.prompt}" then "${example.completion}". The ${example.prompt_tokens} prompt tokens get the label ${trace.ignore}; the ${example.completion_tokens} completion tokens and eos keep their ids as labels: ${example.completion_tokens + 1} trained of ${example.ids.length}.` });
    t += EXAMPLE_BEAT;
  });
  beats.push({ kind: 'pad', start: t, duration: PAD_BEAT,
    caption: `The batch is padded to its longest row, ${trace.longest} positions: pad ids of ${trace.pad} on the right, labels of ${trace.ignore} under them, and an attention mask of 1 for a real token and 0 for a pad.` });
  t += PAD_BEAT;
  beats.push({ kind: 'count', start: t, duration: COUNT,
    caption: `Trained tokens: ${trace.trained} of ${trace.real} real tokens, ${Math.round((100 * trace.trained) / trace.real)} percent. The other ${trace.real - trace.trained} are prompt tokens the model reads but is never asked to predict.` });
  t += COUNT;
  beats.push({ kind: 'shipped', start: t, duration: SHIPPED,
    caption: `What shipped, on the same batch: every real token trained, ${trace.shipped.trained} of ${trace.real}. The ${trace.shipped.prompt_tokens} prompt tokens pulled the loss down just as well as the answers did, and the model learned to produce questions.` });
  t += SHIPPED;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Two lists of the same length, ids and labels, with ${trace.ignore} over every prompt position and over every pad: the loss sees only the ${trace.trained} answer tokens and the ${n} end-of-sequence tokens that teach the model to stop.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: the trainer accepts at most ${trace.practice.max_len} positions, and example 1 has ${trace.examples[0].ids.length}. Rows that are too long lose prompt tokens from the left.` });
  t += PRACTICE_INTRO;
  const dropped = trace.practice.rows.map((row, index) => `example ${index + 1} drops ${row.dropped}`).join(', ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `A negative slice keeps the last ${trace.practice.max_len} positions of ids and labels alike: ${dropped}. The batch pads to ${trace.practice.longest}, every completion and eos is intact, and the trained count is still ${trace.practice.trained}, now of ${trace.practice.real} real tokens.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'example', 'pad', 'count', 'shipped', 'outro', 'practice-intro', 'practice'];

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);
  const padAlpha = beat.kind === 'pad' ? easeInOut(ramp(local, 0.15, 0.7)) : (stage > 2 ? 1 : 0);
  const shippedAlpha = beat.kind === 'shipped' ? easeInOut(ramp(local, 0.2, 0.6)) * (local < SHIPPED - 0.5 ? 1 : easeInOut(ramp(SHIPPED - local, 0, 0.5))) : (beat.kind === 'intro' && local >= INTRO_LATE_AT ? easeInOut(ramp(local, INTRO_LATE_AT, 0.6)) : 0);
  const practiceAlpha = stage >= 7 ? easeInOut(ramp(local, 0.2, 1.0)) : 0;
  const rows = trace.examples.map((example, index) => {
    let idsAlpha = 0;
    let maskAlpha = 0;
    if (beat.kind === 'example') {
      if (index < beat.index) { idsAlpha = 1; maskAlpha = 1; } else if (index === beat.index) {
        idsAlpha = easeInOut(ramp(local, IDS_AT, IDS));
        maskAlpha = easeInOut(ramp(local, MASK_AT, MASK));
      }
    } else if (stage > 1) { idsAlpha = 1; maskAlpha = 1; }
    const padded = trace.batch[index];
    const practiceRow = trace.practice.rows[index];
    const cells = padded.ids.map((id, position) => {
      const real = padded.mask[position] === 1;
      const label = padded.labels[position];
      const kind = !real ? 'pad' : (id === trace.eos ? 'eos' : (label === trace.ignore ? 'prompt' : 'completion'));
      const word = real ? example.words[position] : '<pad>';
      return { position, id, label, word, kind, dropped: real && position < practiceRow.dropped };
    });
    return { index, example, cells, idsAlpha, maskAlpha, current: beat.kind === 'example' && beat.index === index, dropped: practiceRow.dropped };
  });
  let trained = 0;
  let real = 0;
  for (const row of rows) {
    if (row.maskAlpha < 1) continue;
    for (const cell of row.cells) if (cell.kind !== 'pad') { real += 1; if (cell.kind !== 'prompt') trained += 1; }
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, padAlpha, shippedAlpha, practiceAlpha, trained, real,
    countAlpha: beat.kind === 'count' ? easeInOut(ramp(local, 0.1, 0.5)) : (stage > 3 ? 1 : 0), finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const X0 = 92, CELL_W = 62, CELL_H = 30, ROW0 = 86, ROW_PITCH = 112;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene, trace) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`labels for causal fine-tuning: ${trace.ignore} over the prompt and the pads, ids over the completion and eos`, 28, 36);
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(`pad ${trace.pad}   eos ${trace.eos}   vocabulary ${trace.vocabulary} words`, 28, 54);

  const shift = scene.practiceAlpha;        // in the practice, dropped cells fade and the rest slide left
  for (const row of scene.rows) {
    const y = ROW0 + row.index * ROW_PITCH;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = row.current ? INK : DIM;
    ctx.textAlign = 'left';
    ctx.fillText(`ex ${row.index + 1}`, 28, y + 18);
    ctx.fillStyle = DIM;
    ctx.font = `9.5px ${MONO}`;
    ctx.fillText('ids', 28, y + 42);
    ctx.fillText('labels', 28, y + 72);
    for (const cell of row.cells) {
      const visibleAlpha = cell.kind === 'pad' ? scene.padAlpha : 1;
      if (visibleAlpha <= 0) continue;
      const slide = cell.dropped ? 0 : row.dropped * shift;      // cells slide left by the dropped count
      const x = X0 + (cell.position - slide) * CELL_W;
      const dropAlpha = cell.dropped ? 1 - shift : 1;
      const alpha = visibleAlpha * dropAlpha;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      // the word above the id box
      ctx.font = `9.5px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = cell.kind === 'pad' ? DIM : INK;
      ctx.fillText(cell.word.length > 8 ? `${cell.word.slice(0, 7)}…` : cell.word, x + CELL_W / 2, y + 6);
      // the id box
      ctx.fillStyle = PANEL;
      rounded(ctx, x + 2, y + 12, CELL_W - 4, CELL_H - 6, 4); ctx.fill();
      if (cell.kind === 'pad') {
        ctx.save();
        ctx.beginPath(); rounded(ctx, x + 2, y + 12, CELL_W - 4, CELL_H - 6, 4); ctx.clip();
        ctx.strokeStyle = LINE;
        for (let hx = x - CELL_H; hx < x + CELL_W + CELL_H; hx += 6) { ctx.beginPath(); ctx.moveTo(hx, y + 12 + CELL_H); ctx.lineTo(hx + CELL_H, y + 12); ctx.stroke(); }
        ctx.restore();
      }
      ctx.globalAlpha = alpha * row.idsAlpha;
      ctx.fillStyle = cell.kind === 'pad' ? DIM : INK;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(String(cell.id), x + CELL_W / 2, y + 12 + CELL_H / 2 + 1);
      // the label box: ignored positions dim, trained positions blue, eos green; what shipped turns everything blue
      ctx.globalAlpha = alpha * row.maskAlpha;
      const trainedColour = cell.kind === 'eos' ? GREEN : BLUE;
      const ignored = cell.kind === 'prompt' || cell.kind === 'pad';
      let fill = ignored ? PANEL : trainedColour;
      if (scene.shippedAlpha > 0 && cell.kind === 'prompt') fill = RED;
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha * row.maskAlpha * (ignored && !(scene.shippedAlpha > 0 && cell.kind === 'prompt') ? 0.9 : (scene.shippedAlpha > 0 && cell.kind === 'prompt' ? 0.25 + 0.6 * scene.shippedAlpha : 0.85));
      rounded(ctx, x + 2, y + 50, CELL_W - 4, CELL_H - 6, 4); ctx.fill();
      ctx.globalAlpha = alpha * row.maskAlpha;
      ctx.fillStyle = ignored ? (scene.shippedAlpha > 0 && cell.kind === 'prompt' ? INK : DIM) : BG;
      ctx.font = `11px ${MONO}`;
      const shownLabel = scene.shippedAlpha > 0.5 && cell.kind === 'prompt' ? String(cell.id) : String(cell.label);
      ctx.fillText(shownLabel, x + CELL_W / 2, y + 50 + CELL_H / 2 + 1);
      ctx.globalAlpha = 1;
    }
    // the attention mask under the row, once padded
    if (scene.padAlpha > 0) {
      ctx.globalAlpha = scene.padAlpha;
      ctx.font = `9.5px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = DIM;
      ctx.fillText('mask', 28, y + 98);
      ctx.textAlign = 'center';
      for (const cell of row.cells) {
        const slide = cell.dropped ? 0 : row.dropped * shift;
        const dropAlpha = cell.dropped ? 1 - shift : 1;
        if (dropAlpha <= 0.01) continue;
        ctx.globalAlpha = scene.padAlpha * dropAlpha;
        ctx.fillStyle = cell.kind === 'pad' ? DIM : AMBER;
        ctx.fillText(cell.kind === 'pad' ? '0' : '1', X0 + (cell.position - slide) * CELL_W + CELL_W / 2, y + 98);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Legend and the running count.
  const ly = ROW0 + scene.rows.length * ROW_PITCH + 4;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  const swatch = (x, colour, label) => { ctx.fillStyle = colour; rounded(ctx, x, ly - 9, 12, 10, 2); ctx.fill(); ctx.fillStyle = DIM; ctx.fillText(label, x + 17, ly); };
  swatch(28, PANEL, 'prompt or pad: label -100, ignored');
  swatch(260, BLUE, 'completion: label = id, trained');
  swatch(480, GREEN, 'eos: trained, teaches the stop');
  if (scene.shippedAlpha > 0) { ctx.globalAlpha = scene.shippedAlpha; swatch(690, RED, 'what shipped: prompt trained too'); ctx.globalAlpha = 1; }
  ctx.font = `11.5px ${MONO}`;
  ctx.fillStyle = INK;
  const shownTrained = scene.shippedAlpha > 0.5 ? trace.shipped.trained : scene.trained;
  ctx.fillText(`trained ${shownTrained} of ${scene.real} real tokens`, 28, ly + 22);
  if (scene.practiceAlpha > 0.5) {
    ctx.fillStyle = AMBER;
    ctx.fillText(`practice: at most ${trace.practice.max_len} positions, ${trace.practice.trained} of ${trace.practice.real} trained`, 300, ly + 22);
  }
  ctx.globalAlpha = 1;
}
