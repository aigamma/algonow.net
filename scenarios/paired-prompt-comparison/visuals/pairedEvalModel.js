// The lesson's animation, without a DOM: the same comparison as solution.py run
// on the same tickets (python/fixtures/tickets.json), recorded as a trace, laid
// out on a reading-pace timeline, and turned into a drawable scene for any
// moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real compare, so the picture cannot
// drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

export function normalize(text) {
  return text.trim().toLowerCase();
}

const cellOf = (aRight, bRight) => (aRight ? (bRight ? 'both' : 'only_a') : (bRight ? 'only_b' : 'neither'));

// compare from solution.py (exact strings) and from practice_answer.py (with a normalizer).
export function compare(ids, gold, a, b, normalizer) {
  if (new Set([ids.length, gold.length, a.length, b.length]).size !== 1) throw new Error('every list must have one entry per ticket');
  const same = (x, y) => (normalizer ? normalizer(x) === normalizer(y) : x === y);
  const items = ids.map((id, index) => {
    const aRight = same(a[index], gold[index]);
    const bRight = same(b[index], gold[index]);
    return { id, gold: gold[index], a: a[index], b: b[index], a_right: aRight, b_right: bRight, cell: cellOf(aRight, bRight) };
  });
  const counts = { both: 0, only_a: 0, only_b: 0, neither: 0 };
  for (const item of items) counts[item.cell] += 1;
  return {
    items,
    counts,
    regressions: items.filter((item) => item.cell === 'only_a').map((item) => [item.id, item.gold]),
    gains: items.filter((item) => item.cell === 'only_b').map((item) => [item.id, item.gold]),
    accuracy: { a: counts.both + counts.only_a, b: counts.both + counts.only_b, n: items.length },
  };
}

export function buildTrace(data) {
  const exact = compare(data.ids, data.gold, data.prompt_a, data.prompt_b, null);
  const normalized = compare(data.ids, data.gold, data.prompt_a, data.prompt_b, normalize);
  return { ...exact, normalized };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace, not a movie. Each ticket gets a
// short glide into its cell and over a second to read the caption; the whole
// run is about half a minute. The slow motion setting stretches all of it.
const INTRO = 3;
const INTRO_LATE_AT = 1.5;     // when the caption turns to what shipped
const ITEM = 2.4;              // one ticket: highlight, glide into its cell, hold
const HIGHLIGHT_AT = 0.2;
const GLIDE = 0.8;
const TOTALS = 3;
const FILL = 0.9;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1;
const PRACTICE_MOVE = 3;
const PRACTICE_FINAL = 2;

const CELL_TITLES = { both: 'both right', only_a: 'regressions', only_b: 'gains', neither: 'both wrong' };
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%');
const judged = (right) => (right ? 'right' : 'wrong');
const pairList = (pairs) => pairs.map(([id, label]) => `${id} ${label}`).join(' and ');

function itemCaption(item) {
  const phrase = { both: 'both right', only_a: 'a regression', only_b: 'a gain', neither: 'both wrong' }[item.cell];
  return `${item.id}, gold ${item.gold}: A said "${item.a}" (${judged(item.a_right)}), B said "${item.b}" (${judged(item.b_right)}): ${phrase}.`;
}

export function buildTimeline(trace, data) {
  const { counts, accuracy } = trace;
  const after = trace.normalized;
  const moved = trace.items.map((item, index) => ({ before: item, after: after.items[index] })).filter((pair) => pair.before.cell !== pair.after.cell);
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${accuracy.n} tickets, each with a gold label and the answers of prompt A and prompt B. Which prompt should ship?`,
    captionLate: `What shipped: prompt B is right on ${accuracy.b} of ${accuracy.n} (${pct(accuracy.b, accuracy.n)}), prompt A on ${accuracy.a} of ${accuracy.n} (${pct(accuracy.a, accuracy.n)}). B shipped on aggregate accuracy.` });
  t += INTRO;
  trace.items.forEach((item, index) => {
    beats.push({ kind: 'item', start: t, duration: ITEM, item: index, caption: itemCaption(item) });
    t += ITEM;
  });
  beats.push({ kind: 'totals', start: t, duration: TOTALS,
    caption: `Counts: both right ${counts.both}, regressions ${counts.only_a}, gains ${counts.only_b}, both wrong ${counts.neither}. Prompt A right ${accuracy.a} of ${accuracy.n}, prompt B right ${accuracy.b} of ${accuracy.n}.` });
  t += TOTALS;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${counts.only_a} regressions, ${pairList(trace.regressions)}: the aggregate accuracy of ${pct(accuracy.b, accuracy.n)} hid them. Pairing the answers ticket by ticket finds them.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: compare after strip and lower, so a spelling difference stops counting as a wrong answer.' });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice-move', start: t, duration: PRACTICE_MOVE, moved,
    caption: moved.length
      ? moved.map(({ before, after: next }) => `${before.id}: "${before.b}" becomes "${normalize(before.b)}" after strip and lower, equal to the gold label ${before.gold}. ${before.id} leaves ${CELL_TITLES[before.cell]} and joins ${CELL_TITLES[next.cell]}.`).join(' ')
      : 'Nothing moves: every answer was already a clean label.' });
  t += PRACTICE_MOVE;
  beats.push({ kind: 'practice-final', start: t, duration: PRACTICE_FINAL,
    caption: `After normalizing: both right ${after.counts.both}, regressions ${after.counts.only_a} (${pairList(after.regressions) || 'none'}), gains ${after.counts.only_b}, both wrong ${after.counts.neither}. Prompt B right ${after.accuracy.b} of ${after.accuracy.n} (${pct(after.accuracy.b, after.accuracy.n)}).` });
  t += PRACTICE_FINAL;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- layout

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const CELL_COLOR = { both: GREEN, only_a: RED, only_b: BLUE, neither: AMBER };
const CELL_LABEL = { both: 'A right, B right', only_a: 'A right, B wrong: regressions', only_b: 'A wrong, B right: gains', neither: 'A wrong, B wrong' };
const CELL_GRID = { both: [0, 0], only_a: [1, 0], only_b: [0, 1], neither: [1, 1] };
const QX = 28, QY = 86, QW = 150, QH = 30, QGAP = 40;          // the ticket queue on the left
const GX = 300, GY = 86, CW = 280, CH = 158, CGAP = 12;         // the two-by-two grid
const SLOT_H = 26, SLOT_GAP = 32, CHIP_W = 260;
const BAR_Y = 440, BAR_H = 14, BAR_W = 240;

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (a, b, p) => a + (b - a) * p;

export function cellRect(cell) {
  const [col, row] = CELL_GRID[cell];
  return { x: GX + col * (CW + CGAP), y: GY + row * (CH + CGAP), w: CW, h: CH };
}
export function queueRect(index) { return { x: QX, y: QY + index * QGAP, w: QW, h: QH }; }
export function slotRect(cell, slot) {
  const r = cellRect(cell);
  return { x: r.x + 10, y: r.y + 26 + slot * SLOT_GAP, w: CHIP_W, h: SLOT_H };
}

// ------------------------------------------------------------------ scene

// Slot assignment: each ticket takes the next free slot of its cell, in order
// of arrival. The practice move takes the next free slot of the new cell.
function assignSlots(items) {
  const used = { both: 0, only_a: 0, only_b: 0, neither: 0 };
  return items.map((item) => { const slot = used[item.cell]; used[item.cell] += 1; return slot; });
}

export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const firstItem = kinds.indexOf('item');
  const totalsIndex = kinds.indexOf('totals');
  const outroIndex = kinds.indexOf('outro');
  const moveIndex = kinds.indexOf('practice-move');
  const finalIndex = kinds.indexOf('practice-final');

  const slots = assignSlots(trace.items);
  const afterSlots = (() => {
    // After the practice move, unmoved tickets keep their slots and moved ones append to the new cell.
    const used = { both: 0, only_a: 0, only_b: 0, neither: 0 };
    trace.items.forEach((item, index) => { if (trace.normalized.items[index].cell === item.cell) used[item.cell] = Math.max(used[item.cell], slots[index] + 1); });
    return trace.items.map((item, index) => {
      const next = trace.normalized.items[index];
      if (next.cell === item.cell) return slots[index];
      const slot = used[next.cell]; used[next.cell] += 1; return slot;
    });
  })();

  const chips = trace.items.map((item, index) => {
    const queue = queueRect(index);
    const target = slotRect(item.cell, slots[index]);
    let state = 'queued', progress = 0;
    if (beat.kind === 'item') {
      if (index < beat.item) { state = 'placed'; progress = 1; }
      else if (index === beat.item) { state = 'moving'; progress = easeInOut(ramp(local, HIGHLIGHT_AT, GLIDE)); }
    } else if (beatIndex > firstItem) { state = 'placed'; progress = 1; }
    let cell = item.cell;
    let x = lerp(queue.x, target.x, progress), y = lerp(queue.y, target.y, progress), w = lerp(queue.w, target.w, progress), h = lerp(queue.h, target.h, progress);
    let alpha = beat.kind === 'intro' ? ramp(local, 0.15 + index * 0.18, 0.3) : 1;
    const next = trace.normalized.items[index];
    if (next.cell !== item.cell && beatIndex >= moveIndex) {
      const from = target, to = slotRect(next.cell, afterSlots[index]);
      const p = beatIndex === moveIndex ? easeInOut(ramp(local, HIGHLIGHT_AT, GLIDE)) : 1;
      x = lerp(from.x, to.x, p); y = lerp(from.y, to.y, p);
      if (p >= 1) cell = next.cell;
      state = beatIndex === moveIndex ? 'moving' : 'placed';
    }
    return { id: item.id, gold: item.gold, a: item.a, b: item.b, cell, x, y, w, h, alpha, active: state === 'moving', state, color: CELL_COLOR[cell] };
  });

  // Counts show from the totals beat on; the practice final beat switches to the normalized counts.
  const showCounts = beatIndex >= totalsIndex;
  const countsSource = beatIndex >= finalIndex ? trace.normalized.counts : trace.counts;
  const countAlpha = beatIndex === totalsIndex ? ramp(local, 0, 0.5) : (showCounts ? 1 : 0);
  const cells = {};
  for (const cell of Object.keys(CELL_GRID)) {
    cells[cell] = { count: showCounts ? countsSource[cell] : null, alpha: countAlpha, framed: beatIndex === outroIndex && cell === 'only_a', label: CELL_LABEL[cell], color: CELL_COLOR[cell] };
  }

  // Accuracy bars: drawn at the totals beat, B grows to its normalized value at the end.
  let bars = null;
  if (showCounts) {
    const fill = beatIndex === totalsIndex ? easeInOut(ramp(local, 0.4, FILL)) : 1;
    const { a, b, n } = trace.accuracy;
    let bValue = b * fill;
    if (beatIndex >= finalIndex) bValue = lerp(b, trace.normalized.accuracy.b, easeInOut(ramp(local, 0, FILL)));
    if (beatIndex > finalIndex) bValue = trace.normalized.accuracy.b;
    const bShown = beatIndex >= finalIndex ? trace.normalized.accuracy.b : b;   // the label states the count the bar is filling toward
    bars = { a: { value: a * fill, shown: a, max: n, label: 'prompt A right' }, b: { value: bValue, shown: bShown, max: n, label: 'prompt B right' } };
  }

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, chips, cells, bars, n: trace.accuracy.n, finished: t >= timeline.duration };
}

// ---------------------------------------------------------------- drawing

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`compare prompt A and prompt B on ${scene.n} tickets: which prompt is right on each one?`, QX, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('tickets (id, gold label)', QX, 62);
  ctx.fillText('the four combinations', GX, 62);

  // The two-by-two cells.
  for (const [cell, info] of Object.entries(scene.cells)) {
    const r = cellRect(cell);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = info.framed ? RED : LINE;
    ctx.lineWidth = info.framed ? 2.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = info.color;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(info.label, r.x + 10, r.y + 16);
    if (info.count !== null) {
      ctx.globalAlpha = info.alpha;
      ctx.fillStyle = INK;
      ctx.font = `bold 15px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(String(info.count), r.x + r.w - 10, r.y + 18);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  // Chips: placed ones first, the moving one on top.
  const drawChip = (chip) => {
    if (chip.alpha <= 0) return;
    const inCell = chip.state !== 'queued';
    ctx.globalAlpha = chip.alpha;
    ctx.fillStyle = inCell ? chip.color : BLUE;
    ctx.globalAlpha = chip.alpha * (chip.active ? 0.45 : inCell ? 0.22 : 0.14);
    rounded(ctx, chip.x, chip.y, chip.w, chip.h, 4); ctx.fill();
    ctx.globalAlpha = chip.alpha;
    ctx.strokeStyle = chip.active ? INK : inCell ? chip.color : LINE;
    ctx.lineWidth = chip.active ? 1.5 : 1;
    rounded(ctx, chip.x, chip.y, chip.w, chip.h, 4); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `bold 11px ${MONO}`;
    ctx.fillText(chip.id, chip.x + 8, chip.y + chip.h / 2 + 4);
    ctx.font = `11px ${MONO}`;
    ctx.fillText(chip.gold, chip.x + 34, chip.y + chip.h / 2 + 4);
    if (chip.w > 200) {
      ctx.fillStyle = DIM;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(`A "${chip.a}"  B "${chip.b}"`, chip.x + chip.w - 8, chip.y + chip.h / 2 + 4);
      ctx.textAlign = 'left';
    }
  };
  scene.chips.filter((chip) => !chip.active).forEach(drawChip);
  scene.chips.filter((chip) => chip.active).forEach(drawChip);
  ctx.globalAlpha = 1;

  // Accuracy bars under the grid.
  if (scene.bars) {
    const rows = [['a', GX], ['b', GX + CW + CGAP]];
    for (const [key, x] of rows) {
      const bar = scene.bars[key];
      ctx.fillStyle = PANEL;
      rounded(ctx, x, BAR_Y, BAR_W, BAR_H, 3); ctx.fill();
      ctx.fillStyle = GREEN;
      ctx.globalAlpha = 0.6;
      rounded(ctx, x, BAR_Y, (BAR_W * bar.value) / bar.max, BAR_H, 3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = LINE;
      rounded(ctx, x, BAR_Y, BAR_W, BAR_H, 3); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(`${bar.label} ${bar.shown} of ${bar.max}`, x, BAR_Y - 6);
    }
  }
  ctx.globalAlpha = 1;
}
