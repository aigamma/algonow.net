// The lesson's animation, without a DOM: the same loop as solution.py run on the
// same records (python/fixtures/blocks.json), recorded as a trace, laid out on a
// slow timeline, and turned into a drawable scene for any moment. Tests compare
// the trace with python/fixtures/expected-trace.json, which the Python suite
// derives from the real solution, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

export function chunkText(heading, text) {
  return heading + '\n' + text;
}

// pack_blocks from solution.py, recording why each block went where it went.
export function traceBlocks(blocks, maxChars) {
  const chunks = [];
  const steps = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const { heading, text } = blocks[index];
    const size = chunkText(heading, text).length;
    if (size > maxChars) {
      steps.push({ block: index, action: 'reject', size });
      break;
    }
    const last = chunks[chunks.length - 1];
    if (last && last.heading === heading) {
      const joined = last.text + '\n\n' + text;
      const candidate = chunkText(heading, joined).length;
      if (candidate <= maxChars) {
        const before = chunkText(last.heading, last.text).length;
        last.text = joined;
        steps.push({ block: index, chunk: chunks.length - 1, after: candidate, action: 'join', before, candidate });
        continue;
      }
      chunks.push({ heading, text });
      steps.push({ block: index, chunk: chunks.length - 1, after: size, action: 'open', reason: 'budget', candidate });
      continue;
    }
    const step = { block: index, chunk: chunks.length, after: size, action: 'open', reason: last ? 'heading' : 'first' };
    if (last) step.by_size = chunkText(last.heading, last.text + '\n\n' + text).length;
    chunks.push({ heading, text });
    steps.push(step);
  }
  return { chunks, steps };
}

// split_long_blocks from practice_answer.py.
export function splitLongBlocks(blocks, maxChars) {
  const result = [];
  for (const block of blocks) {
    if (chunkText(block.heading, block.text).length > maxChars) {
      for (const line of block.text.split('\n')) result.push({ heading: block.heading, text: line });
    } else {
      result.push(block);
    }
  }
  return result;
}

// Where fixed windows over the joined text would cut: the approach that shipped.
export function fixedWindowCuts(blocks, maxChars) {
  const joined = blocks.map((block) => block.text).join('\n\n');
  const cuts = [];
  for (let boundary = maxChars; boundary < joined.length; boundary += maxChars) {
    for (let index = 0; index < blocks.length; index += 1) {
      const start = joined.indexOf(blocks[index].text);
      const end = start + blocks[index].text.length;
      if (start < boundary && boundary < end) cuts.push({ boundary, block: index, offset: boundary - start });
    }
  }
  return cuts;
}

export function buildTrace(data) {
  const all = [...data.blocks, data.too_long];
  const packing = traceBlocks(all, data.max_chars).steps;
  const expanded = splitLongBlocks(all, data.max_chars);
  const split = traceBlocks(expanded, data.max_chars).steps.slice(data.blocks.length);
  return {
    max_chars: data.max_chars,
    packing,
    fixed_window_cuts: fixedWindowCuts(data.blocks, data.max_chars),
    split: { lines: expanded.slice(data.blocks.length).map((block) => block.text), steps: split },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting. Every movement takes seconds, not frames, and
// every decision is held long enough to read twice.
const INTRO = 10;
const BEAT = 12;        // one block: name it, carry it over, fill the bar, hold
const GLIDE_AT = 1;     // sub-phases inside a beat
const GLIDE = 2.5;
const FILL = 2.5;
const SPLIT_INTRO = 3;
const LINE_BEAT = 7.5;  // the same glide and fill as a block, with a shorter hold
const OUTRO = 6;

const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n] || `${n + 1}th`;

function captionFor(step, block, label, maxChars) {
  const len = block.text.length;
  const name = `${label}, ${block.heading}, ${len} characters.`;
  if (step.action === 'reject') {
    return `${label}, ${block.heading}, five steps, ${len} characters, ${step.size} with its heading. Over the budget of ${maxChars} on its own: ValueError, rejected.`;
  }
  const chunk = step.chunk + 1;
  if (step.action === 'join') {
    return `${name} Same heading. ${step.before} + 2 + ${len} = ${step.candidate}, within ${maxChars}, so it joins chunk ${chunk}.`;
  }
  if (step.reason === 'first') return `${name} No chunk is open yet, so chunk ${chunk} opens: ${step.after} with its heading.`;
  if (step.reason === 'budget') return `${name} Same heading, but ${step.candidate - len - 2} + 2 + ${len} = ${step.candidate}, over ${maxChars}, so chunk ${chunk} opens: ${step.after}.`;
  return `${name} The heading changed, so chunk ${chunk} opens: ${step.after}, although ${step.by_size} would have fit by size.`;
}

export function buildTimeline(trace, data) {
  const maxChars = data.max_chars;
  const blocks = [...data.blocks, data.too_long];
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `Five blocks in document order, each a heading and a text. Budget: ${maxChars} characters per chunk text.`,
    captionLate: `What shipped: fixed ${maxChars}-character windows over the joined text. The cuts land inside step one of the procedure and inside the scopes paragraph.` });
  t += INTRO;
  trace.packing.forEach((step) => {
    const block = blocks[step.block];
    beats.push({ kind: step.action === 'reject' ? 'reject' : 'step', start: t, duration: BEAT, step, block,
      caption: captionFor(step, block, `Block ${step.block + 1}`, maxChars) });
    t += BEAT;
  });
  beats.push({ kind: 'split-intro', start: t, duration: SPLIT_INTRO,
    caption: 'Practice variation: the oversized block is split at its line breaks into five blocks under the same heading, then packed the same way.' });
  t += SPLIT_INTRO;
  trace.split.steps.forEach((step, index) => {
    const block = { heading: data.too_long.heading, text: trace.split.lines[index] };
    beats.push({ kind: 'line', start: t, duration: LINE_BEAT, step, block, line: index,
      caption: captionFor(step, block, `Line ${index + 1}`, maxChars) });
    t += LINE_BEAT;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: 'Six chunks, every one within the budget, and nothing cut inside a block. The loop then rests before it plays again.' });
  t += OUTRO;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: which cards are visible, which bars
// exist and how full they are, where the travelling copy is, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const maxChars = data.max_chars;
  const blocks = [...data.blocks, data.too_long];
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;

  const cards = blocks.map((block, index) => ({
    heading: block.heading, chars: block.text.length, size: chunkText(block.heading, block.text).length,
    alpha: 1, active: false, kind: 'block',
  }));
  const cuts = trace.fixed_window_cuts.map((cut) => ({ ...cut, alpha: 0 }));
  const lines = trace.split.lines.map((text, index) => ({ chars: text.length, alpha: 0, active: false, index }));
  const bars = [];
  let rejected = null;     // the oversized block's attempt: shown beside the chunks, never one of them
  let ghost = null;
  let splitProgress = 0;
  let rejectedAlpha = 1;

  // Intro: cards fade in one by one, then the window cuts appear.
  if (beat.kind === 'intro') {
    cards.forEach((card, index) => { card.alpha = ramp(local, 0.6 + index * 0.9, 0.8); });
    cuts.forEach((cut, index) => { cut.alpha = ramp(local, 6.5 + index * 1, 1); });
  } else {
    cuts.forEach((cut) => { cut.alpha = beat.kind === 'step' && beatIndex === 1 ? 1 - ramp(local, 0, 1) : 0; });
  }

  const applyCompleted = (step, isLine) => {
    if (step.action === 'reject') {
      if (rejectedAlpha > 0) rejected = { row: bars.length, heading: blocks[step.block].heading, size: step.size, target: step.size, alpha: rejectedAlpha };
      return;
    }
    if (step.action === 'join') { bars[step.chunk].size = step.after; bars[step.chunk].target = step.after; return; }
    bars.push({ row: bars.length, heading: isLine ? data.too_long.heading : blocks[step.block].heading, size: step.after, target: step.after, alpha: 1, practice: isLine });
  };

  // Everything before the current beat is complete. The rejected attempt fades
  // out during the practice introduction and leaves its row to the practice chunks.
  const rejectBeat = timeline.beats.findIndex((b) => b.kind === 'reject');
  if (beatIndex > rejectBeat) {
    const splitIntro = timeline.beats.find((b) => b.kind === 'split-intro');
    rejectedAlpha = 1 - ramp(t, splitIntro.start, splitIntro.duration);
  }
  for (let index = 1; index < beatIndex; index += 1) {
    const done = timeline.beats[index];
    if (done.kind === 'step' || done.kind === 'reject') applyCompleted(done.step, false);
    if (done.kind === 'line') applyCompleted(done.step, true);
  }

  const splitStarted = timeline.beats.findIndex((b) => b.kind === 'split-intro');
  if (beatIndex >= splitStarted) {
    const splitIntro = timeline.beats[splitStarted];
    splitProgress = beatIndex === splitStarted ? easeInOut(ramp(local, 0.5, splitIntro.duration - 0.5)) : 1;
    cards[cards.length - 1].alpha = 1 - splitProgress;
    lines.forEach((line) => { line.alpha = splitProgress; });
  }

  // The current beat animates one decision.
  if (beat.kind === 'step' || beat.kind === 'reject' || beat.kind === 'line') {
    const { step } = beat;
    const isLine = beat.kind === 'line';
    const source = isLine ? lines[beat.line] : cards[step.block];
    source.active = true;
    const glide = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    const fill = easeInOut(ramp(local, GLIDE_AT + GLIDE, FILL));
    let bar;
    if (step.action === 'join') {
      bar = bars[step.chunk];
      bar.size = step.before + (step.after - step.before) * fill;
      bar.target = step.after;
    } else if (step.action === 'reject') {
      bar = { row: bars.length, heading: blocks[step.block].heading, size: step.size * fill, target: step.size, alpha: ramp(local, GLIDE_AT, GLIDE) };
      rejected = bar;
    } else {
      bar = { row: bars.length, heading: isLine ? data.too_long.heading : blocks[step.block].heading, size: step.after * fill, target: step.after, alpha: ramp(local, GLIDE_AT, GLIDE), practice: isLine };
      bars.push(bar);
    }
    if (local >= GLIDE_AT && local < GLIDE_AT + GLIDE + FILL) {
      ghost = { from: isLine ? { line: beat.line } : { card: step.block }, toRow: bar.row, progress: glide, alpha: 1 - fill, chars: source.chars, heading: bar.heading };
    }
  }

  const caption = beat.kind === 'intro' && local >= 6.5 ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, cards, cuts, lines, bars, rejected, ghost, splitProgress, maxChars, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 28, RX = 560, TRACK = 300;          // one character is one unit on both sides; a track holds 300
const ROW0 = 96, ROW = 60, CARD_H = 38;
const LINE_H = 10, LINE_GAP = 3;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const stepColor = (bar, scene) => (bar.rejected ? RED : bar.practice ? GREEN : GREEN);

function cardRect(index) { return { x: LX, y: ROW0 + index * ROW - CARD_H / 2, w: TRACK, h: CARD_H }; }
function lineRect(index) {
  const top = ROW0 + 5 * ROW - (5 * (LINE_H + LINE_GAP) - LINE_GAP) / 2;
  return { x: LX, y: top + index * (LINE_H + LINE_GAP), w: TRACK, h: LINE_H };
}
function rowRect(row) { return { x: RX, y: ROW0 + row * ROW - CARD_H / 2, w: TRACK, h: CARD_H }; }

export function drawScene(ctx, scene) {
  const { maxChars } = scene;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.fillText(`pack_blocks on the five-block example: budget ${maxChars} characters per chunk text`, LX, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('input blocks (one unit per character)', LX, 62);
  ctx.fillText(`chunks (text length out of ${maxChars})`, RX, 62);

  // Budget line across the chunk column.
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(RX + maxChars, ROW0 - CARD_H / 2 - 8);
  ctx.lineTo(RX + maxChars, ROW0 + 5 * ROW + CARD_H / 2 + 8);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.textAlign = 'right';
  ctx.fillText(`budget ${maxChars}`, RX + maxChars, ROW0 + 5 * ROW + CARD_H / 2 + 22);
  ctx.textAlign = 'left';

  // Input cards.
  scene.cards.forEach((card, index) => {
    if (card.alpha <= 0) return;
    const r = cardRect(index);
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    ctx.fillStyle = card.active ? BLUE : BLUE;
    ctx.globalAlpha = card.alpha * (card.active ? 0.45 : 0.22);
    rounded(ctx, r.x, r.y, card.chars, r.h, 4); ctx.fill();
    ctx.globalAlpha = card.alpha;
    ctx.strokeStyle = card.active ? BLUE : LINE;
    ctx.lineWidth = card.active ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(`block ${index + 1}  ${card.heading}`, r.x + 8, r.y + 15);
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`${card.chars} chars, ${card.size} with heading`, r.x + 8, r.y + 29);
  });
  ctx.lineWidth = 1;

  // Fixed-window cuts inside the cards they land in.
  scene.cuts.forEach((cut) => {
    if (cut.alpha <= 0) return;
    const r = cardRect(cut.block);
    ctx.globalAlpha = cut.alpha;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x + cut.offset, r.y - 4);
    ctx.lineTo(r.x + cut.offset, r.y + r.h + 4);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = RED;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`window cut at ${cut.boundary}`, r.x + r.w + 10, r.y + r.h / 2 + 4);
  });

  // The split lines of the oversized block.
  scene.lines.forEach((line) => {
    if (line.alpha <= 0) return;
    const r = lineRect(line.index);
    ctx.globalAlpha = line.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 2); ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.globalAlpha = line.alpha * (line.active ? 0.5 : 0.25);
    rounded(ctx, r.x, r.y, line.chars, r.h, 2); ctx.fill();
    ctx.globalAlpha = line.alpha;
    ctx.strokeStyle = line.active ? BLUE : LINE;
    rounded(ctx, r.x, r.y, r.w, r.h, 2); ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.font = `9px ${MONO}`;
    ctx.fillText(`line ${line.index + 1}  ${line.chars}`, r.x + r.w + 8, r.y + 8);
  });

  // Chunk bars, then the rejected attempt beside them.
  const drawBar = (bar, rejected) => {
    if (bar.alpha <= 0) return;
    const r = rowRect(bar.row);
    ctx.globalAlpha = bar.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    const within = Math.min(bar.size, maxChars);
    ctx.fillStyle = rejected ? AMBER : GREEN;
    ctx.globalAlpha = bar.alpha * 0.35;
    rounded(ctx, r.x, r.y, within, r.h, 4); ctx.fill();
    const over = bar.size > maxChars;
    if (over) {
      ctx.fillStyle = RED;
      ctx.globalAlpha = bar.alpha * 0.55;
      ctx.fillRect(r.x + maxChars, r.y, Math.min(bar.size, TRACK) - maxChars, r.h);
    }
    ctx.globalAlpha = bar.alpha;
    ctx.strokeStyle = over ? RED : LINE;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(rejected ? `${bar.heading}` : `chunk ${bar.row + 1}  ${bar.heading}${bar.practice ? ' (practice)' : ''}`, r.x + 8, r.y + 15);
    ctx.fillStyle = over ? RED : DIM;
    ctx.font = `10.5px ${MONO}`;
    const shown = Math.round(bar.size);
    ctx.fillText(over ? `${shown} of ${maxChars}: ValueError` : `${shown} of ${maxChars} characters`, r.x + 8, r.y + 29);
  };
  scene.bars.forEach((bar) => drawBar(bar, false));
  if (scene.rejected) drawBar(scene.rejected, true);

  // The travelling copy of the block being placed.
  if (scene.ghost) {
    const g = scene.ghost;
    const from = g.from.card !== undefined ? cardRect(g.from.card) : lineRect(g.from.line);
    const to = rowRect(g.toRow);
    const x = from.x + (to.x - from.x) * g.progress;
    const y = from.y + (to.y - from.y) * g.progress;
    ctx.globalAlpha = Math.max(0, g.alpha) * 0.9;
    ctx.fillStyle = BLUE;
    ctx.globalAlpha = Math.max(0, g.alpha) * 0.3;
    rounded(ctx, x, y, g.chars, from.h, 4); ctx.fill();
    ctx.globalAlpha = Math.max(0, g.alpha);
    ctx.strokeStyle = BLUE;
    rounded(ctx, x, y, g.chars, from.h, 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
