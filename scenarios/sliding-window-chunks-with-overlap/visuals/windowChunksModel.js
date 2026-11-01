// The lesson's animation, without a DOM: the same sliding-window chunker as
// solution.py (and the neighbour expansion of practice_answer.py), run on the
// same document (python/fixtures/document.json), recorded as a trace, laid out
// on a reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const lerp = (from, to, p) => from + (to - from) * p;

// chunk_words from solution.py.
export function chunkWords(text, window, overlap) {
  if (window < 1) throw new Error(`window must be at least 1, got ${window}`);
  if (overlap < 0 || overlap >= window) throw new Error(`overlap must be between 0 and window - 1: window ${window}, overlap ${overlap}`);
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const stride = window - overlap;
  const chunks = [];
  for (let start = 0; start < words.length; start += stride) {
    const end = Math.min(start + window, words.length);
    chunks.push({ id: `c${chunks.length + 1}`, start, end, text: words.slice(start, end).join(' ') });
    if (end === words.length) break;
  }
  return chunks;
}

// whole_in from solution.py.
export function wholeIn(chunks, spanStart, spanEnd) {
  return chunks.filter((chunk) => chunk.start <= spanStart && spanEnd <= chunk.end).map((chunk) => chunk.id);
}

// expand from practice_answer.py.
export function expand(chunks, words, hitId) {
  const ids = chunks.map((chunk) => chunk.id);
  const index = ids.indexOf(hitId);
  if (index < 0) throw new Error(`unknown chunk ${hitId}`);
  const first = Math.max(0, index - 1);
  const last = Math.min(chunks.length - 1, index + 1);
  const start = chunks[first].start;
  const end = chunks[last].end;
  return { ids: ids.slice(first, last + 1), start, end, text: words.slice(start, end).join(' ') };
}

export function buildTrace(data) {
  const words = data.document.split(/\s+/).filter((word) => word.length > 0);
  const chunks = chunkWords(data.document, data.window, data.overlap);
  const flat = chunkWords(data.document, data.window, 0);
  const stored = chunks.reduce((sum, chunk) => sum + (chunk.end - chunk.start), 0);
  const [spanStart, spanEnd] = data.span;
  const [sentenceStart, sentenceEnd] = data.sentence;
  const grown = expand(chunks, words, data.hit);
  const hit = chunks[Number(data.hit.slice(1)) - 1];
  const edges = {};
  for (const edge of ['c1', chunks[chunks.length - 1].id]) {
    const result = expand(chunks, words, edge);
    edges[edge] = { ids: result.ids, start: result.start, end: result.end };
  }
  return {
    words: words.length,
    window: data.window,
    overlap: data.overlap,
    stride: data.window - data.overlap,
    chunks,
    stored_words: stored,
    factor: round6(stored / words.length),
    span: { start: spanStart, end: spanEnd, text: words.slice(spanStart, spanEnd).join(' '), whole_in: wholeIn(chunks, spanStart, spanEnd) },
    no_overlap: { chunks: flat.map((chunk) => ({ id: chunk.id, start: chunk.start, end: chunk.end })),
      whole_in: wholeIn(flat, spanStart, spanEnd), boundary: data.window * (Math.floor(spanStart / data.window) + 1) },
    guarantee: data.overlap + 1,
    practice: {
      hit: data.hit,
      alone: { start: hit.start, end: hit.end },
      expanded: { ids: grown.ids, start: grown.start, end: grown.end },
      sentence: { start: sentenceStart, end: sentenceEnd, text: words.slice(sentenceStart, sentenceEnd).join(' '), whole_in: wholeIn(chunks, sentenceStart, sentenceEnd) },
      edges,
    },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const CHUNK_BEAT = 2.2;
const GROW_AT = 0.15;
const GROW = 0.7;
const SPAN_BEAT = 3.0;
const STORAGE = 2.5;
const SHIPPED = 3.5;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

const last = (end) => end - 1;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `One runbook paragraph of ${trace.words} words and four sentences, no headings. The ruler counts word positions from 0; the instruction "${trace.span.text}" sits at words ${trace.span.start} to ${last(trace.span.end)}.`,
    captionLate: `What shipped: windows of ${trace.window} words with no overlap, boundaries at every ${trace.window}th word. The boundary at word ${trace.no_overlap.boundary} cuts the instruction in two: one chunk ends "set the", the next begins "timeout to thirty seconds,".` });
  t += INTRO;
  trace.chunks.forEach((chunk, index) => {
    const previous = index ? trace.chunks[index - 1] : null;
    const shared = previous ? `; it starts ${trace.stride} words after ${previous.id} and shares words ${chunk.start} to ${last(previous.end)} with it` : '';
    const short = chunk.end - chunk.start < trace.window ? ` (the last window is short: ${chunk.end - chunk.start} words reach the end)` : '';
    beats.push({ kind: 'chunk', start: t, duration: CHUNK_BEAT, index,
      caption: `${chunk.id}: words ${chunk.start} to ${last(chunk.end)}${short}, "${chunk.text}"${shared}.` });
    t += CHUNK_BEAT;
  });
  beats.push({ kind: 'span', start: t, duration: SPAN_BEAT,
    caption: `The instruction, words ${trace.span.start} to ${last(trace.span.end)}, lies whole in ${trace.span.whole_in.join(', ')} (words ${trace.chunks[2].start} to ${last(trace.chunks[2].end)}). An overlap of ${trace.overlap} guarantees every span of up to ${trace.guarantee} words a home; this six-word span fits by its position.` });
  t += SPAN_BEAT;
  beats.push({ kind: 'storage', start: t, duration: STORAGE,
    caption: `The price: ${trace.chunks.length} chunks hold ${trace.stored_words} words for a document of ${trace.words}, ${trace.factor.toFixed(2)} times the text to embed and store. Each overlap re-stores ${trace.overlap} words.` });
  t += STORAGE;
  beats.push({ kind: 'shipped', start: t, duration: SHIPPED,
    caption: `What shipped, on the same document: overlap 0 gives ${trace.no_overlap.chunks.length} chunks with boundaries at ${trace.no_overlap.chunks.slice(1).map((chunk) => chunk.start).join(', ')}. The boundary at ${trace.no_overlap.boundary} falls inside the instruction, so no chunk holds it whole: a retriever can return "set the" or "timeout to thirty seconds," but never the sentence.` });
  t += SHIPPED;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Window ${trace.window}, overlap ${trace.overlap}, stride ${trace.stride}: ${trace.chunks.length} chunks, every span of up to ${trace.guarantee} words whole somewhere, ${trace.factor.toFixed(2)} times the storage. The window and the overlap are the two knobs of a flat chunker.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: the sentence "${trace.practice.sentence.text}" is ${trace.practice.sentence.end - trace.practice.sentence.start} words long, so no ${trace.window}-word window at stride ${trace.stride} holds it whole. A hit on ${trace.practice.hit} alone returns it cut.` });
  t += PRACTICE_INTRO;
  const grown = trace.practice.expanded;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Expanding the hit to its neighbours returns ${grown.ids.join(', ')}: words ${grown.start} to ${last(grown.end)}, which contains the whole sentence (words ${trace.practice.sentence.start} to ${last(trace.practice.sentence.end)}). At the ends of the list, ${Object.keys(trace.practice.edges)[0]} expands to ${trace.practice.edges.c1.ids.join(' and ')} only.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'chunk', 'span', 'storage', 'shipped', 'outro', 'practice-intro', 'practice'];

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);

  const bars = trace.chunks.map((chunk, index) => {
    let progress = 0;
    if (beat.kind === 'chunk') {
      if (index < beat.index) progress = 1;
      else if (index === beat.index) progress = easeInOut(ramp(local, GROW_AT, GROW));
    } else if (stage > 1) progress = 1;
    const previous = index ? trace.chunks[index - 1] : null;
    const overlap = previous && progress >= 1 ? { start: chunk.start, end: previous.end } : null;
    return { id: chunk.id, start: chunk.start, end: chunk.end, progress, overlap, current: beat.kind === 'chunk' && beat.index === index };
  });
  const placed = bars.filter((bar) => bar.progress >= 1).length;
  const stored = trace.chunks.slice(0, placed).reduce((sum, chunk) => sum + (chunk.end - chunk.start), 0);
  const rulerAlpha = beat.kind === 'intro' ? easeInOut(ramp(local, 0.1, 0.6)) : 1;
  const spanState = stage >= 2 ? 'whole' : 'plain';
  const spanPulse = beat.kind === 'span' ? easeInOut(ramp(local, 0.1, 0.6)) : (stage > 2 ? 1 : 0);
  const storageAlpha = beat.kind === 'storage' ? easeInOut(ramp(local, 0.1, 0.6)) : (stage > 3 ? 1 : 0);
  const shippedAlpha = beat.kind === 'shipped' ? easeInOut(ramp(local, 0.1, 0.7)) : (beat.kind === 'intro' && local >= INTRO_LATE_AT ? easeInOut(ramp(local, INTRO_LATE_AT, 0.6)) : 0);
  let practice = null;
  if (stage >= 6) {
    const phase = beat.kind === 'practice-intro' ? 1 : 2;
    const expandAlpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.9)) : (stage > 7 ? 1 : 0);
    practice = { alpha: beat.kind === 'practice-intro' ? easeInOut(ramp(local, 0.1, 0.6)) : 1, phase, expandAlpha,
      hit: trace.practice.hit, alone: trace.practice.alone, expanded: trace.practice.expanded, sentence: trace.practice.sentence };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, bars, placed, stored, rulerAlpha, spanState, spanPulse, storageAlpha, shippedAlpha, practice,
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const RX0 = 70, RX1 = 870, RY = 112;                 // the word ruler
const ROW0 = 176, ROW_H = 44, BAR_H = 22;            // the chunk rows
const SENTENCES = [[0, 13, 'S1'], [13, 20, 'S2'], [20, 32, 'S3'], [32, 39, 'S4']];

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene, trace) {
  const xOf = (position) => RX0 + (position / trace.words) * (RX1 - RX0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`sliding windows: ${trace.window} words, overlap ${trace.overlap}, stride ${trace.stride}, one document of ${trace.words} words`, 28, 36);

  // The ruler of word positions, with the four sentences marked above it.
  ctx.globalAlpha = scene.rulerAlpha;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(RX0, RY); ctx.lineTo(RX1, RY); ctx.stroke();
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'center';
  for (let position = 0; position <= trace.words; position += 1) {
    const x = xOf(position);
    ctx.beginPath(); ctx.moveTo(x, RY); ctx.lineTo(x, RY + (position % 4 === 0 ? 7 : 3)); ctx.stroke();
    if (position % 4 === 0 || position === trace.words) ctx.fillText(String(position), x, RY + 20);
  }
  ctx.fillText('word position', (RX0 + RX1) / 2, RY + 36);
  for (const [start, end, label] of SENTENCES) {
    const x0 = xOf(start) + 1;
    const x1 = xOf(end) - 1;
    ctx.fillStyle = PANEL;
    rounded(ctx, x0, RY - 30, x1 - x0, 16, 3); ctx.fill();
    ctx.fillStyle = DIM;
    ctx.fillText(label, (x0 + x1) / 2, RY - 18);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.fillText('sentences', RX0 - 42, RY - 18);
  // The instruction span under the ruler: green once a chunk is shown to hold it whole.
  const span = trace.span;
  ctx.fillStyle = scene.spanState === 'whole' ? GREEN : AMBER;
  ctx.globalAlpha = scene.rulerAlpha * (0.55 + 0.45 * scene.spanPulse);
  rounded(ctx, xOf(span.start) + 1, RY - 7, xOf(span.end) - xOf(span.start) - 2, 6, 2); ctx.fill();
  ctx.globalAlpha = scene.rulerAlpha;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = scene.spanState === 'whole' ? GREEN : AMBER;
  ctx.fillText(`instruction ${span.start} to ${span.end - 1}`, (xOf(span.start) + xOf(span.end)) / 2, RY + 50);
  ctx.globalAlpha = 1;

  // The chunk rows: one bar per window, the overlap with the previous chunk hatched in amber.
  scene.bars.forEach((bar, index) => {
    const y = ROW0 + index * ROW_H;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = bar.progress > 0 ? (bar.current ? INK : DIM) : LINE;
    ctx.fillText(bar.id, RX0 - 12, y + BAR_H / 2 + 4);
    if (bar.progress <= 0) return;
    const x0 = xOf(bar.start);
    const x1 = lerp(x0, xOf(bar.end), bar.progress);
    ctx.fillStyle = BLUE;
    ctx.globalAlpha = bar.current ? 0.95 : 0.7;
    rounded(ctx, x0 + 1, y, x1 - x0 - 2, BAR_H, 4); ctx.fill();
    ctx.globalAlpha = 1;
    if (bar.overlap) {
      ctx.save();
      ctx.beginPath();
      rounded(ctx, xOf(bar.overlap.start) + 1, y, xOf(bar.overlap.end) - xOf(bar.overlap.start) - 2, BAR_H, 4);
      ctx.clip();
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      for (let x = xOf(bar.overlap.start) - BAR_H; x < xOf(bar.overlap.end) + BAR_H; x += 7) {
        ctx.beginPath(); ctx.moveTo(x, y + BAR_H); ctx.lineTo(x + BAR_H, y); ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = 1;
    }
    if (bar.progress >= 1) {
      ctx.font = `10px ${MONO}`;
      // The last window ends at the canvas edge: its label sits inside the bar.
      if (xOf(bar.end) + 70 > W) {
        ctx.fillStyle = BG;
        ctx.textAlign = 'right';
        ctx.fillText(`${bar.start} to ${bar.end - 1}`, xOf(bar.end) - 8, y + BAR_H / 2 + 4);
      } else {
        ctx.fillStyle = DIM;
        ctx.textAlign = 'left';
        ctx.fillText(`${bar.start} to ${bar.end - 1}`, xOf(bar.end) + 8, y + BAR_H / 2 + 4);
      }
    }
  });
  // The practice: the hit, the sentence, and the expansion across three rows.
  if (scene.practice) {
    const p = scene.practice;
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    const sy = RY - 7;
    ctx.strokeRect(xOf(p.sentence.start) + 1, sy - 3, xOf(p.sentence.end) - xOf(p.sentence.start) - 2, 12);
    ctx.setLineDash([]);
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText(`sentence ${p.sentence.start} to ${p.sentence.end - 1}`, (xOf(p.sentence.start) + xOf(p.sentence.end)) / 2, RY + 62);
    const hitIndex = Number(p.hit.slice(1)) - 1;
    const hy = ROW0 + hitIndex * ROW_H;
    ctx.strokeStyle = INK;
    ctx.strokeRect(xOf(p.alone.start), hy - 2, xOf(p.alone.end) - xOf(p.alone.start), BAR_H + 4);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.fillText(`hit ${p.hit}`, xOf(p.alone.end) + 56, hy + BAR_H / 2 + 4);
    if (p.expandAlpha > 0) {
      ctx.globalAlpha = p.alpha * p.expandAlpha;
      const firstRow = Number(p.expanded.ids[0].slice(1)) - 1;
      const lastRow = Number(p.expanded.ids[p.expanded.ids.length - 1].slice(1)) - 1;
      const top = ROW0 + firstRow * ROW_H - 6;
      const bottom = ROW0 + lastRow * ROW_H + BAR_H + 6;
      ctx.fillStyle = GREEN;
      ctx.globalAlpha = p.alpha * p.expandAlpha * 0.16;
      rounded(ctx, xOf(p.expanded.start) - 2, top, xOf(p.expanded.end) - xOf(p.expanded.start) + 4, bottom - top, 6); ctx.fill();
      ctx.globalAlpha = p.alpha * p.expandAlpha;
      ctx.strokeStyle = GREEN;
      rounded(ctx, xOf(p.expanded.start) - 2, top, xOf(p.expanded.end) - xOf(p.expanded.start) + 4, bottom - top, 6); ctx.stroke();
      ctx.fillStyle = GREEN;
      ctx.textAlign = 'left';
      ctx.fillText(`expanded ${p.expanded.ids.join(', ')}: words ${p.expanded.start} to ${p.expanded.end - 1}`, xOf(p.expanded.start) + 6, bottom + 14);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }
  // What shipped: the no-overlap boundaries as red dashed lines through the rows.
  if (scene.shippedAlpha > 0) {
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.strokeStyle = RED;
    ctx.setLineDash([5, 4]);
    for (const chunk of trace.no_overlap.chunks.slice(1)) {
      const x = xOf(chunk.start);
      ctx.beginPath(); ctx.moveTo(x, RY - 36); ctx.lineTo(x, ROW0 + trace.chunks.length * ROW_H); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = RED;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`no-overlap boundary at ${trace.no_overlap.boundary} cuts the instruction`, xOf(trace.no_overlap.boundary), ROW0 + trace.chunks.length * ROW_H + 14);
    ctx.globalAlpha = 1;
  }
  // The storage line.
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.fillText(`stored ${scene.stored} words so far in ${scene.placed} chunks`, RX0, H - 22);
  if (scene.storageAlpha > 0) {
    ctx.globalAlpha = scene.storageAlpha;
    ctx.fillStyle = AMBER;
    ctx.fillText(`${trace.stored_words} stored for ${trace.words}: ${trace.factor.toFixed(2)}x the text to embed`, RX0 + 300, H - 22);
    ctx.globalAlpha = 1;
  }
}
