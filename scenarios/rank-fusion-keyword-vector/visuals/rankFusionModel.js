// The lesson's animation, without a DOM: the same accumulation as solution.py,
// run on the same two rankings (python/fixtures/rankings.json), recorded as a
// trace, laid out on a reading-pace timeline, and turned into a drawable scene
// for any moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real solution, so the picture cannot
// drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;                 // one animation tick; the motion preference stretches it
export const SPOTLIGHT = 'errors E4031';   // the exact-match document the shipped merge buried
export const BAR_FULL = 0.05;              // a bar is full at this fused score

const round6 = (x) => Number(x.toFixed(6));
const fmt = (x) => x.toFixed(6);
const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][n - 1] || `${n}th`;

// fusion_order from solution.py as a comparator: highest score first, ties by name.
export function fusionOrder(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  return a.doc < b.doc ? -1 : a.doc > b.doc ? 1 : 0;
}

// fuse from solution.py (and the weighted practice answer), recording every
// contribution in the order the Python loop makes it.
export function traceFusion(rankings, k, weights) {
  const scores = {};
  const seen = [];                         // documents in first-seen order, like a Python dict
  const contributions = [];
  for (const [name, ranking] of Object.entries(rankings)) {
    ranking.forEach((doc, index) => {
      const rank = index + 1;
      if (ranking.filter((other) => other === doc).length > 1) throw new Error(`the ${name} ranking lists '${doc}' more than once`);
      const weight = weights ? (weights[name] === undefined ? 1 : weights[name]) : 1;
      const add = weight / (k + rank);
      if (!(doc in scores)) { scores[doc] = 0.0; seen.push(doc); }
      scores[doc] = scores[doc] + add;
      contributions.push({ list: name, rank, doc, add: round6(add), total: round6(scores[doc]) });
    });
  }
  const fused = seen.map((doc) => ({ doc, score: scores[doc] })).sort(fusionOrder).map(({ doc, score }) => {
    const ranks = {};
    for (const [name, ranking] of Object.entries(rankings)) if (ranking.includes(doc)) ranks[name] = ranking.indexOf(doc) + 1;
    return { doc, score: round6(score), ranks };
  });
  return { contributions, fused };
}

// The merge that shipped: the vector list, then keyword documents not already present.
export function shippedOrder(rankings) {
  const order = [...rankings.vector];
  for (const doc of rankings.keyword) if (!order.includes(doc)) order.push(doc);
  return order;
}

export function buildTrace(data) {
  const plain = traceFusion(data.rankings, data.k);
  const weighted = traceFusion(data.rankings, data.k, data.weights);
  return {
    k: data.k,
    contributions: plain.contributions,
    fused: plain.fused,
    shipped: shippedOrder(data.rankings),
    weighted: { weights: data.weights, contributions: weighted.contributions, fused: weighted.fused },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each contribution gets a short
// glide, a short fill, and over a second to read its caption; the sorts glide
// the rows into place; the whole run is under forty seconds.
const INTRO = 3.2;
const INTRO_SHIPPED_AT = 1.3;   // when the shipped order and its caption appear
const CONTRIB = 2.4;            // one contribution: highlight, carry over, grow the bar, hold
const GLIDE_AT = 0.2;
const GLIDE = 0.7;
const FILL = 0.7;
const SORT = 2.5;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1;
const PRACTICE_SCORE = 3;
const PRACTICE_SORT = 2.5;

function tieText(fused) {
  const groups = new Map();
  for (const entry of fused) groups.set(entry.score, [...(groups.get(entry.score) || []), entry.doc]);
  const ties = [...groups.entries()].filter(([, docs]) => docs.length > 1);
  if (!ties.length) return '';
  return '; ' + ties.map(([score, docs]) => `${docs.join(' and ')} tie at ${fmt(score)} and sort by name`).join('; ');
}

export function buildTimeline(trace, data) {
  const k = data.k;
  const beats = [];
  let t = 0;
  const spotShipped = trace.shipped.indexOf(SPOTLIGHT) + 1;
  const spotFused = trace.fused.findIndex((entry) => entry.doc === SPOTLIGHT) + 1;
  const spotWeighted = trace.weighted.fused.findIndex((entry) => entry.doc === SPOTLIGHT) + 1;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: 'Two rankings for one question: the keyword index on the left, the vector index on the right, five documents each. The prompt has room for the top three.',
    captionLate: `What shipped: the vector list first, then the keyword leftovers. ${SPOTLIGHT} lands ${ordinal(spotShipped)} and is dropped from the prompt.` });
  t += INTRO;
  const totals = {};
  trace.contributions.forEach((contribution, index) => {
    const before = totals[contribution.doc] || 0;
    const caption = before === 0
      ? `${contribution.list} rank ${contribution.rank}: ${contribution.doc} adds 1/(${k} + ${contribution.rank}) = ${fmt(contribution.add)}. New document: total ${fmt(contribution.total)}.`
      : `${contribution.list} rank ${contribution.rank}: ${contribution.doc} adds 1/(${k} + ${contribution.rank}) = ${fmt(contribution.add)} to ${fmt(before)}: total ${fmt(contribution.total)}.`;
    beats.push({ kind: 'contribution', start: t, duration: CONTRIB, index, contribution, before, caption });
    totals[contribution.doc] = contribution.total;
    t += CONTRIB;
  });
  const top = trace.fused.slice(0, 3);
  beats.push({ kind: 'sort', start: t, duration: SORT,
    caption: `Sort by score, ties by name: ${top.map((entry) => `${entry.doc} ${fmt(entry.score)}`).join(', ')} lead${tieText(trace.fused)}.` });
  t += SORT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `The top three go into the prompt: ${top.map((entry) => entry.doc).join(', ')}. ${SPOTLIGHT} moves from ${ordinal(spotShipped)} to ${ordinal(spotFused)}: it appears in both lists, and two middling ranks beat one top rank alone.` });
  t += OUTRO;
  const weights = trace.weighted.weights;
  const weightedTop = trace.weighted.fused.slice(0, 3);
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: weight the lists. ${Object.entries(weights).map(([name, weight]) => `${name} ${weight}`).join(', ')}.` });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice-score', start: t, duration: PRACTICE_SCORE,
    caption: `Keyword contributions count ${weights.keyword} times, vector contributions ${weights.vector}. New totals: ${weightedTop.map((entry) => `${entry.doc} ${fmt(entry.score)}`).join(', ')}.` });
  t += PRACTICE_SCORE;
  beats.push({ kind: 'practice-sort', start: t, duration: PRACTICE_SORT,
    caption: `Weighted order: ${weightedTop.map((entry) => entry.doc).join(', ')} lead. ${SPOTLIGHT} is ${ordinal(spotWeighted)} when the keyword list is trusted more.` });
  t += PRACTICE_SORT;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The sequence of single moves that turns one order into another: for each
// slot in turn, the document that belongs there travels from where it is and
// the documents it passes shift by one slot.
function moveSequence(start, target) {
  const states = [start.slice()];
  const movers = [];
  let current = start.slice();
  target.forEach((doc, slot) => {
    const from = current.indexOf(doc);
    if (from === slot) return;
    current = current.slice();
    current.splice(from, 1);
    current.splice(slot, 0, doc);
    states.push(current);
    movers.push(doc);
  });
  return { states, movers };
}

// Positions part way through a reorder: move number k is in flight while the
// overall progress sits in its share of the beat, eased on its own.
function reorderAt(start, target, progress) {
  const { states, movers } = moveSequence(start, target);
  const final = states[states.length - 1];
  if (!movers.length || progress >= 1) return { positions: Object.fromEntries(final.map((doc, index) => [doc, index])), traveling: null };
  const scaled = progress * movers.length;
  const move = Math.min(movers.length - 1, Math.floor(scaled));
  const p = easeInOut(scaled - move);
  const before = states[move];
  const after = states[move + 1];
  const positions = {};
  before.forEach((doc) => { positions[doc] = before.indexOf(doc) + (after.indexOf(doc) - before.indexOf(doc)) * p; });
  return { positions, traveling: movers[move] };
}

// The drawable state at `elapsed` seconds: the two card columns, the fused rows
// with their current scores and positions, the travelling copy, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const sortBeat = kinds.indexOf('sort');
  const outroBeat = kinds.indexOf('outro');
  const practiceIntroBeat = kinds.indexOf('practice-intro');
  const practiceScoreBeat = kinds.indexOf('practice-score');
  const practiceSortBeat = kinds.indexOf('practice-sort');

  const lists = {};
  Object.entries(data.rankings).forEach(([name, ranking], column) => {
    lists[name] = ranking.map((doc, index) => ({ doc, rank: index + 1, alpha: 1, active: false, column }));
  });
  let shippedAlpha = 0;
  if (beat.kind === 'intro') {
    Object.values(lists).forEach((cards, column) => cards.forEach((card, index) => { card.alpha = ramp(local, 0.1 + column * 0.1 + index * 0.15, 0.3); }));
    shippedAlpha = ramp(local, INTRO_SHIPPED_AT, 0.5);
  } else if (beatIndex === 1) {
    shippedAlpha = 1 - ramp(local, 0, 0.5);
  }

  // Rows in first-seen order, scored by every contribution completed before this beat.
  const rows = [];
  const rowOf = {};
  const addRow = (doc) => { rowOf[doc] = rows.length; rows.push({ doc, score: 0, created: rows.length, alpha: 1, ranks: [] }); };
  const completed = timeline.beats.slice(0, beatIndex).filter((b) => b.kind === 'contribution').length;
  for (let index = 0; index < completed; index += 1) {
    const contribution = trace.contributions[index];
    if (!(contribution.doc in rowOf)) addRow(contribution.doc);
    rows[rowOf[contribution.doc]].score = contribution.total;
    rows[rowOf[contribution.doc]].ranks.push(`${contribution.list} ${contribution.rank}`);
  }

  // The current contribution animates one glide and one fill.
  let ghost = null;
  if (beat.kind === 'contribution') {
    const { contribution } = beat;
    const source = lists[contribution.list][contribution.rank - 1];
    source.active = true;
    if (!(contribution.doc in rowOf)) addRow(contribution.doc);
    const row = rows[rowOf[contribution.doc]];
    const glide = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    const fill = easeInOut(ramp(local, GLIDE_AT + GLIDE, FILL));
    row.score = beat.before + (contribution.total - beat.before) * fill;
    if (beat.before === 0) row.alpha = ramp(local, GLIDE_AT, GLIDE);
    if (fill >= 1) row.ranks.push(`${contribution.list} ${contribution.rank}`);
    // The travelling copy is a bare highlight box: the source card and the
    // destination row carry the document's name, and the box is the width of
    // the card, so a label on it would overprint one of them at a slight
    // offset for most of the flight. It fades out a quarter second after
    // landing, before the bar fills.
    const landed = ramp(local, GLIDE_AT + GLIDE, 0.25);
    if (local >= GLIDE_AT && landed < 1) {
      ghost = { list: contribution.list, index: contribution.rank - 1, toRow: rowOf[contribution.doc], progress: glide, alpha: 1 - landed, doc: contribution.doc };
    }
  }

  // Positions: creation order, then the fused order after the sort, then the
  // weighted order after the practice sort. A reorder plays as a sequence of
  // single moves (reorderAt): the row that belongs in the next slot travels
  // there while the rows it passes shift by one, so the eye follows one mover
  // at a time. Scores move to the weighted totals during the practice re-score.
  const weightedScore = {};
  trace.weighted.fused.forEach((entry) => { weightedScore[entry.doc] = entry.score; });
  const present = (order) => order.filter((doc) => doc in rowOf);
  const createdOrder = rows.slice().sort((a, b) => a.created - b.created).map((row) => row.doc);
  const fusedOrder = present(trace.fused.map((entry) => entry.doc));
  const weightedOrder = present(trace.weighted.fused.map((entry) => entry.doc));
  let sortProgress = 0;
  let scoreProgress = 0;
  let practiceSortProgress = 0;
  if (beat.kind === 'sort') sortProgress = ramp(local, 0.2, SORT - 0.7);
  else if (beatIndex > sortBeat) sortProgress = 1;
  if (beat.kind === 'practice-score') scoreProgress = easeInOut(ramp(local, 0.3, PRACTICE_SCORE - 1.2));
  else if (beatIndex > practiceScoreBeat) scoreProgress = 1;
  if (beat.kind === 'practice-sort') practiceSortProgress = ramp(local, 0.2, PRACTICE_SORT - 0.7);
  else if (beatIndex > practiceSortBeat) practiceSortProgress = 1;
  let placement;
  if (practiceSortProgress > 0) placement = reorderAt(fusedOrder, weightedOrder, practiceSortProgress);
  else if (sortProgress > 0) placement = reorderAt(createdOrder, fusedOrder, sortProgress);
  else placement = { positions: Object.fromEntries(createdOrder.map((doc, index) => [doc, index])), traveling: null };
  rows.forEach((row) => {
    row.position = placement.positions[row.doc];
    row.traveling = placement.traveling === row.doc;
    if (scoreProgress > 0) row.score = row.score + (weightedScore[row.doc] - row.score) * scoreProgress;
  });
  const frameAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.5) : (beatIndex > outroBeat ? 1 : 0);
  const practice = beatIndex >= practiceIntroBeat;
  const caption = beat.kind === 'intro' && local >= INTRO_SHIPPED_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, lists, rows, ghost, shippedAlpha, shipped: trace.shipped, frameAlpha, practice,
    k: data.k, weights: data.weights, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const COL_X = [28, 662], COL_W = 210, CARD_H = 36, CARD_STEP = 60, CARD_Y0 = 86;   // the two ranking columns
const MX = 258, MW = 384, ROW_H = 40, ROW_STEP = 48, ROW_Y0 = 86;               // the fused table

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}
const cardRect = (column, index) => ({ x: COL_X[column], y: CARD_Y0 + index * CARD_STEP, w: COL_W, h: CARD_H });
const rowRect = (position) => ({ x: MX, y: ROW_Y0 + position * ROW_STEP, w: MW, h: ROW_H });

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`reciprocal rank fusion: each list adds 1/(k + rank), k = ${scene.k}`, COL_X[0], 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  const names = Object.keys(scene.lists);
  ctx.fillText(`${names[0]} ranking`, COL_X[0], 66);
  ctx.fillText(`${names[1]} ranking`, COL_X[1], 66);
  ctx.fillText(scene.practice ? `fused score, weights ${Object.entries(scene.weights).map(([n, w]) => `${n} ${w}`).join(', ')}` : `fused score (bar full at ${BAR_FULL})`, MX, 66);

  // The two ranking columns.
  names.forEach((name, column) => {
    scene.lists[name].forEach((card, index) => {
      if (card.alpha <= 0) return;
      const r = cardRect(column, index);
      ctx.globalAlpha = card.alpha;
      ctx.fillStyle = PANEL;
      rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
      ctx.strokeStyle = card.active ? BLUE : LINE;
      ctx.lineWidth = card.active ? 1.5 : 1;
      rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
      ctx.fillStyle = card.active ? BLUE : DIM;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(`${card.rank}`, r.x + 8, r.y + 22);
      ctx.fillStyle = INK;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(card.doc, r.x + 24, r.y + 22);
    });
  });
  ctx.lineWidth = 1;

  // The shipped order, shown in the middle during the intro.
  if (scene.shippedAlpha > 0) {
    ctx.globalAlpha = scene.shippedAlpha;
    scene.shipped.forEach((doc, index) => {
      const r = rowRect(index);
      const spot = doc === SPOTLIGHT;
      ctx.fillStyle = spot ? RED : DIM;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(`${index + 1}. ${doc}${spot ? '   dropped from the prompt' : ''}`, r.x + 8, r.y + 24);
    });
    const top = rowRect(0), third = rowRect(2);
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 3]);
    rounded(ctx, top.x - 4, top.y - 4, top.w + 8, third.y + third.h - top.y + 8, 5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('prompt: top 3 of what shipped', top.x, top.y - 9);
  }

  // The fused rows with their bars.
  [...scene.rows].sort((a, b) => (a.traveling ? 1 : 0) - (b.traveling ? 1 : 0)).forEach((row) => {
    if (row.alpha <= 0) return;
    const r = rowRect(row.position);
    if (row.traveling) r.x += 18;   // the mover steps slightly aside and draws on top
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.globalAlpha = row.alpha * 0.35;
    rounded(ctx, r.x, r.y, Math.min(1, row.score / BAR_FULL) * r.w, r.h, 4); ctx.fill();
    ctx.globalAlpha = row.alpha;
    ctx.strokeStyle = row.traveling ? BLUE : LINE;
    ctx.lineWidth = row.traveling ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(row.doc, r.x + 8, r.y + 16);
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`${fmt(row.score)}${row.ranks.length ? '   ' + row.ranks.join(', ') : ''}`, r.x + 8, r.y + 31);
  });

  // The prompt frame around the top three rows, once sorted.
  if (scene.frameAlpha > 0) {
    const top = rowRect(0), third = rowRect(2);
    ctx.globalAlpha = scene.frameAlpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 3]);
    rounded(ctx, top.x - 4, top.y - 4, top.w + 8, third.y + third.h - top.y + 8, 5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('prompt: top 3', top.x, top.y - 9);
  }

  // The travelling copy of the document being scored.
  if (scene.ghost) {
    const g = scene.ghost;
    const from = cardRect(scene.lists[g.list][0].column, g.index);
    const to = rowRect(scene.rows[g.toRow].position);
    const x = from.x + (to.x - from.x) * g.progress;
    const y = from.y + (to.y - from.y) * g.progress;
    ctx.globalAlpha = Math.max(0, g.alpha) * 0.35;
    ctx.fillStyle = BLUE;
    rounded(ctx, x, y, from.w, from.h, 4); ctx.fill();
    ctx.globalAlpha = Math.max(0, g.alpha);
    ctx.strokeStyle = BLUE;
    rounded(ctx, x, y, from.w, from.h, 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
