// The lesson's animation, without a DOM: the same grouping, cap, order
// restoration, and practice floor as solution.py and practice_answer.py, run
// on the same twelve records (python/fixtures/records.json), recorded as a
// trace, laid out on a reading-pace timeline, and turned into a drawable scene
// for any moment. Python's random.Random is not ported: the ids that the seeded
// sample and the seeded repeat chose are read from python/fixtures/
// expected-trace.json, which the Python suite derives from the real functions.
// Everything else (groups, counts, the kept order, the dropped ids, the
// baselines) is recomputed here, and the test compares the whole trace with
// that fixture, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// group_by_label and count_labels from solution.py.
export function groupByLabel(records) {
  const groups = new Map();
  for (const record of records) {
    if (!('label' in record)) throw new Error(`record '${record.id}' has no label`);
    if (!groups.has(record.label)) groups.set(record.label, []);
    groups.get(record.label).push(record);
  }
  return groups;
}
export function countLabels(records) {
  const counts = {};
  for (const record of records) counts[record.label] = (counts[record.label] || 0) + 1;
  return counts;
}

// downsample from solution.py, with the seeded sample's ids supplied for any
// label over the cap (the fixture carries them, in the order they were drawn).
export function downsample(records, cap, sampled) {
  if (cap < 1) throw new Error(`cap must be at least 1, got ${cap}`);
  const groups = groupByLabel(records);
  const keptIds = new Set();
  for (const label of [...groups.keys()].sort()) {
    const group = groups.get(label);
    const chosen = group.length <= cap ? group.map((record) => record.id) : sampled[label];
    if (!Array.isArray(chosen) || (group.length > cap && chosen.length !== cap)) throw new Error(`no seeded sample for ${label}`);
    for (const id of chosen) keptIds.add(id);
  }
  // The position sort in solution.py restores input order; filtering the input
  // in order is the same result.
  const kept = records.filter((record) => keptIds.has(record.id));
  const dropped = records.filter((record) => !keptIds.has(record.id)).map((record) => record.id);
  return { kept, dropped };
}

// balance from practice_answer.py, with the seeded repeats supplied.
export function balance(records, cap, floor, sampled, repeats) {
  const { kept, dropped } = downsample(records, cap, sampled);
  const counts = countLabels(kept);
  const out = kept.slice();
  for (const id of repeats) {
    const record = kept.find((candidate) => candidate.id === id);
    if (!record) throw new Error(`repeat ${id} is not a kept record`);
    out.push(record);
    counts[record.label] += 1;
  }
  for (const label of Object.keys(counts)) if (counts[label] < floor) throw new Error(`${label} is still below the floor`);
  return { kept: out, dropped, repeats: repeats.slice() };
}

const sortedCounts = (counts) => Object.fromEntries(Object.keys(counts).sort().map((label) => [label, counts[label]]));
const biggest = (counts) => Math.max(...Object.values(counts));

export function buildTrace(data, given) {
  const { records, cap, seed, floor } = data;
  const groups = groupByLabel(records);
  const labels = [...groups.keys()].sort();
  const sampled = {};
  for (const label of labels) {
    const group = groups.get(label);
    sampled[label] = group.length <= cap ? group.map((record) => record.id) : given.sampled[label].slice();
  }
  const before = countLabels(records);
  const { kept, dropped } = downsample(records, cap, sampled);
  const after = countLabels(kept);
  const practice = balance(records, cap, floor, sampled, given.repeats);
  const practiceAfter = countLabels(practice.kept);
  return {
    cap, seed, floor, labels,
    before: sortedCounts(before),
    sampled,
    kept: kept.map((record) => record.id),
    dropped,
    after: sortedCounts(after),
    majority: { before: [biggest(before), records.length], after: [biggest(after), kept.length] },
    practice: {
      repeats: practice.repeats,
      kept: practice.kept.map((record) => record.id),
      after: sortedCounts(practiceAfter),
      majority: [biggest(practiceAfter), practice.kept.length],
    },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. The intro and the count are
// brisk, each label gets one beat for its decision, the kept records glide
// back into input order, the outro shows the counts and the baseline, and the
// practice adds the repeat; the whole run is under half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;
const COUNT = 2.5;
const LABEL_BEAT = 3.2;
const ORDER = 3.5;
const OUTRO = 3.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 4.0;

const pct = (count, total) => Math.round((100 * count) / total);
const list = (ids) => ids.join(', ');

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.records.length;
  const [topBefore, totalBefore] = trace.majority.before;
  const [topAfter, totalAfter] = trace.majority.after;
  const counts = trace.labels.map((label) => `${label} ${trace.before[label]}`).join(', ');
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} records from the support export, each an id, a label, and the customer's text, shown by label. The cap is ${trace.cap} per label.`,
    captionLate: `What shipped: trained on the skew. Always answering billing is right ${topBefore} of ${totalBefore} times (${pct(topBefore, totalBefore)} percent), so that is what the model learned to do.` });
  t += INTRO;
  beats.push({ kind: 'count', start: t, duration: COUNT,
    caption: `count_labels, a Counter that adds one per record: ${counts}. The labels are then visited in sorted order against the cap of ${trace.cap}.` });
  t += COUNT;
  for (const label of trace.labels) {
    const size = trace.before[label];
    const keptIds = trace.sampled[label];
    const droppedIds = trace.dropped.filter((id) => data.records.find((record) => record.id === id).label === label);
    const caption = size <= trace.cap
      ? `${label} has ${size} record${size === 1 ? '' : 's'}, within the cap of ${trace.cap}: every record is kept (${list(keptIds)}).`
      : `${label} has ${size} records, over the cap: random.Random(${trace.seed}).sample keeps ${list(keptIds)} and drops ${list(droppedIds)}.`;
    beats.push({ kind: 'label', start: t, duration: LABEL_BEAT, label, over: size > trace.cap, caption });
    t += LABEL_BEAT;
  }
  beats.push({ kind: 'order', start: t, duration: ORDER,
    caption: `The kept records were gathered label by label, so they are sorted back into input order by position: ${list(trace.kept)}.` });
  t += ORDER;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.kept.length} kept, ${trace.dropped.length} dropped, every label at ${trace.cap} or fewer. Always answering billing is right ${topAfter} of ${totalAfter} times (${pct(topAfter, totalAfter)} percent) after, down from ${pct(topBefore, totalBefore)}.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: lift every label below a floor of ${trace.floor} by repeating a seeded random pick of its own records.` });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  const repeatLabel = data.records.find((record) => record.id === p.repeats[0]).label;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${repeatLabel} gains one repeat, ${list(p.repeats)}: ${p.kept.length} records, every label at ${trace.floor}. The best constant answer is right ${p.majority[0]} of ${p.majority[1]} times (${pct(p.majority[0], p.majority[1])} percent).` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (from, to, p) => from + (to - from) * p;

export const COL_X = [40, 330, 620];     // one column per label, in sorted label order
export const COL_W = 250;
const HEADER_Y = 70;
const CARD_Y0 = 92;
const CARD_H = 28;
const CARD_PITCH = 34;
const STRIP_X0 = 40, STRIP_Y = 384, CHIP_W = 44, CHIP_H = 24, CHIP_PITCH = 52;
const PANEL = { x: 570, y: 344, w: 300, h: 132 };   // clear of the billing column's cards, room for a two-line baseline
const CHIP_STAGGER = 0.22, CHIP_GLIDE = 0.7;

export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const countBeat = kinds.indexOf('count');
  const orderBeat = kinds.indexOf('order');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const labelBeatIndex = (label) => timeline.beats.findIndex((b) => b.kind === 'label' && b.label === label);
  const sampledSet = new Set(trace.labels.flatMap((label) => trace.sampled[label]));
  const groups = groupByLabel(data.records);

  // Column headers: the Counter's numbers appear in the count beat.
  const columns = trace.labels.map((label, index) => ({
    label, x: COL_X[index], before: trace.before[label], after: trace.after[label],
    countAlpha: beatIndex > countBeat ? 1 : (beat.kind === 'count' ? ramp(local, 0.2 + index * 0.4, 0.6) : 0),
  }));
  const capAlpha = beatIndex > countBeat ? 1 : (beat.kind === 'count' ? ramp(local, 1.5, 0.6) : 0);

  // Cards: one per record in its label's column, decided in that label's beat.
  const cards = data.records.map((record, index) => {
    const column = trace.labels.indexOf(record.label);
    const row = groups.get(record.label).indexOf(record);
    const decideAt = labelBeatIndex(record.label);
    const over = trace.before[record.label] > trace.cap;
    const kept = sampledSet.has(record.id);
    let alpha = beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.15, 0.4) : 1;
    let border = 'none';
    let tag = '';
    let decided = 0;
    if (beatIndex > decideAt) decided = 1;
    else if (beatIndex === decideAt) decided = ramp(local, 0.4, 0.8);
    if (decided > 0) {
      if (kept) border = over ? 'blue' : 'green';
      else { border = 'red'; tag = 'dropped'; alpha = lerp(1, 0.35, decided); }
    }
    return { id: record.id, label: record.label, text: record.text, x: COL_X[column], y: CARD_Y0 + row * CARD_PITCH, alpha, border, tag, decided };
  });

  // Chips: every kept record glides from its card to the strip in the order beat.
  const chips = [];
  let stripAlpha = 0;
  if (beatIndex >= orderBeat) {
    stripAlpha = beat.kind === 'order' ? ramp(local, 0, 0.5) : 1;
    trace.kept.forEach((id, slot) => {
      const card = cards.find((candidate) => candidate.id === id);
      const progress = beat.kind === 'order' ? easeInOut(ramp(local, 0.4 + slot * CHIP_STAGGER, CHIP_GLIDE)) : 1;
      // A chip fades in as it leaves its card, so nothing sits over the card's
      // own id at the beat's first instant; it is solid for the rest of the glide.
      chips.push({ id, kind: 'kept', x: lerp(card.x + 4, STRIP_X0 + slot * CHIP_PITCH, progress), y: lerp(card.y + 2, STRIP_Y, progress), alpha: Math.min(1, progress / 0.25) });
    });
  }

  // The practice: a repeat card in its column and a repeat chip at the end of the strip.
  let practiceAlpha = 0;
  if (beat.kind === 'practice') practiceAlpha = ramp(local, 0.3, 0.7);
  else if (beatIndex > practiceBeat) practiceAlpha = 1;
  if (practiceAlpha > 0) {
    trace.practice.repeats.forEach((id, extra) => {
      const original = data.records.find((record) => record.id === id);
      const column = trace.labels.indexOf(original.label);
      const row = groups.get(original.label).length + extra;
      cards.push({ id, label: original.label, text: original.text, x: COL_X[column], y: CARD_Y0 + row * CARD_PITCH, alpha: practiceAlpha, border: 'amber', tag: 'repeat', decided: 1 });
      const slot = trace.kept.length + extra;
      const chipAlpha = beat.kind === 'practice' ? ramp(local, 1.0, 0.6) : 1;
      chips.push({ id, kind: 'repeat', x: STRIP_X0 + slot * CHIP_PITCH, y: STRIP_Y, alpha: chipAlpha });
    });
  }

  // The panel: counts before and after per label, and the constant-answer baseline.
  let panelAlpha = 0;
  if (beat.kind === 'outro') panelAlpha = ramp(local, 0, 0.6);
  else if (beatIndex > outroBeat) panelAlpha = 1;
  const barProgress = beat.kind === 'outro' ? easeInOut(ramp(local, 0.4, 1.0)) : (beatIndex > outroBeat ? 1 : 0);
  const practiceCounts = beat.kind === 'practice' ? ramp(local, 1.8, 0.6) : (beatIndex > practiceBeat ? 1 : 0);
  const rows = trace.labels.map((label) => ({
    label, before: trace.before[label],
    after: lerp(trace.after[label], trace.practice.after[label], practiceCounts),
    afterShown: trace.after[label] * barProgress + (trace.practice.after[label] - trace.after[label]) * practiceCounts,
  }));
  const [topAfter, totalAfter] = trace.majority.after;
  const [topP, totalP] = trace.practice.majority;
  // The baseline is two short lines (a label, then the numbers), because one
  // line with both fractions runs past the panel.
  const majorityLabel = practiceCounts >= 1 ? `best constant answer, floor ${trace.floor}` : 'best constant answer, before and after';
  const majorityText = practiceCounts >= 1
    ? `at most ${topP} of ${totalP} (${pct(topP, totalP)}%)`
    : `${trace.majority.before[0]} of ${trace.majority.before[1]} (${pct(...trace.majority.before)}%)  →  ${topAfter} of ${totalAfter} (${pct(topAfter, totalAfter)}%)`;
  const panel = { alpha: panelAlpha, rows, barProgress, majorityLabel, majorityText };

  const keptSoFar = cards.filter((card) => card.border === 'green' || card.border === 'blue').length;
  const droppedSoFar = cards.filter((card) => card.border === 'red').length;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, columns, capAlpha, cards, chips, stripAlpha, panel,
    counts: { kept: keptSoFar, dropped: droppedSoFar, repeats: practiceAlpha > 0 ? trace.practice.repeats.length : 0 },
    cap: trace.cap, seed: trace.seed, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL_FILL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const BORDER_COLOR = { green: GREEN, blue: BLUE, red: RED, amber: AMBER };

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const shorten = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`cap each label at ${scene.cap} with a seeded sample: ${scene.cards.filter((c) => c.tag !== 'repeat').length} records, seed ${scene.seed}`, 28, 36);

  // Column headers and the Counter's numbers.
  ctx.font = `11.5px ${MONO}`;
  for (const column of scene.columns) {
    ctx.fillStyle = INK;
    ctx.fillText(column.label, column.x, HEADER_Y);
    if (column.countAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = column.countAlpha;
      ctx.fillStyle = DIM;
      ctx.fillText(`${column.before} record${column.before === 1 ? '' : 's'}`, column.x + 80, HEADER_Y);
      ctx.restore();
    }
  }

  // The cap line across the columns.
  if (scene.capAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.capAlpha;
    const y = CARD_Y0 + scene.cap * CARD_PITCH - 3;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(COL_X[0], y); ctx.lineTo(COL_X[COL_X.length - 1] + COL_W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(`cap ${scene.cap}`, COL_X[COL_X.length - 1] + COL_W, y - 5);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Cards.
  for (const card of scene.cards) {
    if (card.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL_FILL;
    rounded(ctx, card.x, card.y, COL_W, CARD_H, 5); ctx.fill();
    ctx.strokeStyle = card.border === 'none' ? LINE : BORDER_COLOR[card.border];
    ctx.lineWidth = card.border === 'none' ? 1 : 1.5;
    rounded(ctx, card.x, card.y, COL_W, CARD_H, 5); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = card.border === 'none' ? INK : BORDER_COLOR[card.border];
    ctx.fillText(card.id, card.x + 8, card.y + 18);
    ctx.fillStyle = card.border === 'red' ? DIM : INK;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(shorten(card.text, card.tag ? 20 : 29), card.x + 40, card.y + 18);
    if (card.tag) {
      ctx.fillStyle = BORDER_COLOR[card.border];
      ctx.textAlign = 'right';
      ctx.fillText(card.tag, card.x + COL_W - 8, card.y + 18);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // The strip of kept ids in input order.
  if (scene.stripAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.stripAlpha;
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('kept, input order (then repeats)', STRIP_X0, STRIP_Y + CHIP_H + 15);   // below the chips, clear of their glide paths
    ctx.restore();
  }
  for (const chip of scene.chips) {
    if (chip.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = chip.alpha;
    const color = chip.kind === 'repeat' ? AMBER : GREEN;
    ctx.fillStyle = PANEL_FILL;
    rounded(ctx, chip.x, chip.y, CHIP_W, CHIP_H, 5); ctx.fill();
    ctx.strokeStyle = color;
    rounded(ctx, chip.x, chip.y, CHIP_W, CHIP_H, 5); ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(chip.id, chip.x + CHIP_W / 2, chip.y + 16);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // The counts panel.
  if (scene.panel.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.panel.alpha;
    ctx.fillStyle = PANEL_FILL;
    rounded(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 6); ctx.fill();
    ctx.strokeStyle = LINE;
    rounded(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 6); ctx.stroke();
    ctx.font = `10.5px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('records per label: before (amber), after (blue)', PANEL.x + 12, PANEL.y + 18);
    scene.panel.rows.forEach((row, index) => {
      const y = PANEL.y + 34 + index * 24;
      ctx.fillStyle = INK;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(row.label, PANEL.x + 12, y + 9);
      const x0 = PANEL.x + 84;
      ctx.fillStyle = AMBER;
      ctx.fillRect(x0, y, row.before * 18, 5);
      ctx.fillStyle = BLUE;
      ctx.fillRect(x0, y + 7, Math.max(0, row.afterShown) * 18, 5);
      ctx.fillStyle = DIM;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText(`${row.before} → ${Math.round(row.after)}`, x0 + 7 * 18 + 12, y + 10);
    });
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(scene.panel.majorityLabel, PANEL.x + 12, PANEL.y + PANEL.h - 25);
    ctx.fillStyle = INK;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(scene.panel.majorityText, PANEL.x + 12, PANEL.y + PANEL.h - 10);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
