// The lesson's animation, without a DOM: the same precision, recall,
// reciprocal rank, and nDCG functions as solution.py and practice_answer.py,
// run on the same four queries (python/fixtures/queries.json), recorded as a
// trace, laid out on a reading-pace timeline, and turned into a drawable
// scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it
export const KEYS = ['old', 'new'];

const round6 = (x) => Number(x.toFixed(6));
const f3 = (x) => x.toFixed(3);

// hits_in_top, precision_at_k, recall_at_k, reciprocal_rank from solution.py,
// and ndcg_at_k from practice_answer.py. The fixture stores the relevant set
// as a sorted list, so membership is a list search here.
export function hitsInTop(ranked, relevant, k) {
  if (k < 1) throw new Error(`k must be at least 1, got ${k}`);
  if (!relevant.length) throw new Error('the relevant set is empty: nothing can be scored');
  let hits = 0;
  for (const chunkId of ranked.slice(0, k)) if (relevant.includes(chunkId)) hits += 1;
  return hits;
}
export function precisionAtK(ranked, relevant, k) {
  return hitsInTop(ranked, relevant, k) / k;
}
export function recallAtK(ranked, relevant, k) {
  return hitsInTop(ranked, relevant, k) / relevant.length;
}
export function reciprocalRank(ranked, relevant) {
  if (!relevant.length) throw new Error('the relevant set is empty: nothing can be scored');
  for (let index = 0; index < ranked.length; index += 1) {
    if (relevant.includes(ranked[index])) return 1 / (index + 1);
  }
  return 0.0;
}
export function ndcgAtK(ranked, relevant, k) {
  if (k < 1) throw new Error(`k must be at least 1, got ${k}`);
  if (!relevant.length) throw new Error('the relevant set is empty: nothing can be scored');
  let gain = 0.0;
  const top = ranked.slice(0, k);
  for (let index = 0; index < top.length; index += 1) {
    if (relevant.includes(top[index])) gain += 1 / Math.log2(index + 2);
  }
  const idealHits = Math.min(k, relevant.length);
  let ideal = 0.0;
  for (let position = 1; position <= idealHits; position += 1) ideal += 1 / Math.log2(position + 1);
  return gain / ideal;
}
export function hitPositions(ranked, relevant) {
  const positions = [];
  ranked.forEach((chunkId, index) => { if (relevant.includes(chunkId)) positions.push(index + 1); });
  return positions;
}
export function evaluate(queries, key, k) {
  const rows = [];
  let totalPrecision = 0.0, totalRecall = 0.0, totalRr = 0.0, totalNdcg = 0.0;
  for (const query of queries) {
    const ranked = query[key];
    const relevant = query.relevant;
    const precision = precisionAtK(ranked, relevant, k);
    const recall = recallAtK(ranked, relevant, k);
    const rr = reciprocalRank(ranked, relevant);
    const ndcg = ndcgAtK(ranked, relevant, k);
    rows.push({ id: query.id, precision, recall, rr, ndcg, hitPositions: hitPositions(ranked, relevant), hitsInTopK: hitsInTop(ranked, relevant, k) });
    totalPrecision += precision; totalRecall += recall; totalRr += rr; totalNdcg += ndcg;
  }
  const n = rows.length;
  return { rows, means: { precision: totalPrecision / n, recall: totalRecall / n, mrr: totalRr / n, ndcg: totalNdcg / n } };
}

export function buildTrace(data) {
  const rankings = {};
  for (const key of KEYS) {
    const { rows, means } = evaluate(data.queries, key, data.k);
    rankings[key] = {
      rows: rows.map((row) => ({ id: row.id, precision: round6(row.precision), recall: round6(row.recall), rr: round6(row.rr), ndcg: round6(row.ndcg),
        hit_positions: row.hitPositions, hits_in_top_k: row.hitsInTopK })),
      means: { precision: round6(means.precision), recall: round6(means.recall), mrr: round6(means.mrr), ndcg: round6(means.ndcg) },
    };
  }
  const old = rankings.old.means, fresh = rankings.new.means;
  let sameHits = true;
  for (const query of data.queries) {
    const hitsOf = (key) => query[key].slice(0, data.k).filter((id) => query.relevant.includes(id)).sort().join(',');
    if (hitsOf('old') !== hitsOf('new')) sameHits = false;
  }
  return {
    k: data.k,
    rankings,
    delta: { precision: round6(fresh.precision - old.precision), recall: round6(fresh.recall - old.recall), mrr: round6(fresh.mrr - old.mrr), ndcg: round6(fresh.ndcg - old.ndcg) },
    same_hits_in_top_k: sameHits,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each query plays as two beats,
// the old ranking then the new one, dense but varied; the whole run is about
// half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const RANKING_BEAT = 2.4;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;
const SLOT_AT = 0.15;           // sub-phases inside a ranking beat
const SLOT_STEP = 0.2;
const SLOT_FADE = 0.25;
const READOUT_AT = 1.2;
const READOUT_FILL = 0.6;

function describeHits(query, row) {
  const positions = row.hit_positions;
  if (!positions.length) return 'no relevant chunk in the top 5';
  const ids = query[row.key === 'old' ? 'old' : 'new'];
  if (positions.length === 1) return `the relevant chunk ${ids[positions[0] - 1]} sits at position ${positions[0]}`;
  return `the relevant chunks ${positions.map((p) => ids[p - 1]).join(' and ')} sit at positions ${positions.join(' and ')}`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const k = data.k;
  beats.push({ kind: 'intro', start: t, duration: INTRO, query: 0,
    caption: `${data.queries.length} questions, each with the chunks a reviewer marked relevant and the top 5 results from the old and the new embedding model. Only the first ${k} results are judged.`,
    captionLate: 'What shipped: the new embedding model, chosen because its results felt better. Nobody measured which relevant chunks it found, or where in the list.' });
  t += INTRO;
  data.queries.forEach((query, index) => {
    const oldRow = { ...trace.rankings.old.rows[index], key: 'old' };
    const newRow = { ...trace.rankings.new.rows[index], key: 'new' };
    const nRel = query.relevant.length;
    const detail = (row) => row.hit_positions.length
      ? `P@${k} ${f3(row.precision)} (${row.hits_in_top_k} of ${k} results relevant), R@${k} ${f3(row.recall)} (${row.hits_in_top_k} of ${nRel} relevant found), RR ${f3(row.rr)} (first hit at position ${row.hit_positions[0]}).`
      : `P@${k} 0.000, R@${k} 0.000, RR 0.000.`;
    beats.push({ kind: 'old', start: t, duration: RANKING_BEAT, query: index,
      caption: `${query.id} “${query.question}”, old ranking: ${describeHits(query, oldRow)}. ${detail(oldRow)}` });
    t += RANKING_BEAT;
    let compare;
    if (!oldRow.hit_positions.length && !newRow.hit_positions.length) compare = 'Nothing found by either model: the relevant chunk may not be indexed at all.';
    else if (newRow.rr > oldRow.rr) compare = `The same hit${newRow.hits_in_top_k > 1 ? 's' : ''}, ${oldRow.hit_positions[0] - newRow.hit_positions[0]} place${oldRow.hit_positions[0] - newRow.hit_positions[0] > 1 ? 's' : ''} earlier.`;
    else if (newRow.rr < oldRow.rr) compare = `The same hit, ${newRow.hit_positions[0] - oldRow.hit_positions[0]} place later: a small regression the mean would hide.`;
    else compare = 'No change.';
    beats.push({ kind: 'new', start: t, duration: RANKING_BEAT, query: index,
      caption: `${query.id} new ranking: ${describeHits(query, newRow)}. ${detail(newRow)} ${compare}` });
    t += RANKING_BEAT;
  });
  const o = trace.rankings.old.means, n = trace.rankings.new.means;
  beats.push({ kind: 'outro', start: t, duration: OUTRO, query: data.queries.length - 1,
    caption: `Means: P@${k} ${f3(o.precision)} against ${f3(n.precision)}, R@${k} ${f3(o.recall)} against ${f3(n.recall)}, MRR ${f3(o.mrr)} against ${f3(n.mrr)}. The new model finds the same relevant chunks and puts them earlier: that is what felt better.` });
  t += OUTRO;
  const practiceQuery = Math.max(0, data.queries.findIndex((query) => query.relevant.length > 1));
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO, query: practiceQuery,
    caption: `Practice variation: nDCG@${k} discounts each hit by 1 over log2 of its position plus 1, then divides by the best total possible for that question.` });
  t += PRACTICE_INTRO;
  const pq = data.queries[practiceQuery];
  const oldRow = trace.rankings.old.rows[practiceQuery], newRow = trace.rankings.new.rows[practiceQuery];
  const gains = (positions) => positions.filter((p) => p <= k).map((p) => 1 / Math.log2(p + 1));
  const ideal = gains(Array.from({ length: Math.min(k, pq.relevant.length) }, (_, i) => i + 1)).reduce((a, b) => a + b, 0);
  beats.push({ kind: 'practice', start: t, duration: PRACTICE, query: practiceQuery,
    caption: `nDCG@${k}: ${pq.id} old hits at positions ${oldRow.hit_positions.join(' and ')} earn ${gains(oldRow.hit_positions).map(f3).join(' and ')} of a possible ${f3(ideal)}, so ${f3(oldRow.ndcg)}; new hits at positions ${newRow.hit_positions.join(' and ')} earn ${f3(gains(newRow.hit_positions).reduce((a, b) => a + b, 0))}, so ${f3(newRow.ndcg)}. Means ${f3(o.ndcg)} old against ${f3(n.ndcg)} new.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

function rowState(query, row, reveal, local) {
  // reveal: 'none' | 'progress' | 'full'
  const slots = query[row.key].map((id, index) => {
    const relevant = query.relevant.includes(id);
    let lit = 0;
    if (reveal === 'full') lit = 1;
    else if (reveal === 'progress') lit = ramp(local, SLOT_AT + index * SLOT_STEP, SLOT_FADE);
    return { id, position: index + 1, relevant, lit, first: row.hit_positions[0] === index + 1 };
  });
  let alpha = 0, fill = 0;
  if (reveal === 'full') { alpha = 1; fill = 1; }
  else if (reveal === 'progress') { alpha = ramp(local, READOUT_AT, 0.3); fill = easeInOut(ramp(local, READOUT_AT, READOUT_FILL)); }
  return { key: row.key, slots, readout: { precision: row.precision, recall: row.recall, rr: row.rr, ndcg: row.ndcg, alpha, fill }, firstHit: row.hit_positions[0] || null };
}

// The drawable state at `elapsed` seconds: the shown query's two rankings,
// the score table on the right, the means, and the practice discount plot.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceIntroBeat = kinds.indexOf('practice-intro');
  const practiceBeat = kinds.indexOf('practice');
  const q = beat.query;
  const query = data.queries[q];
  const rowOf = (key) => ({ ...trace.rankings[key].rows[q], key });
  const reveal = (key) => {
    if (beat.kind === 'intro') return 'none';
    if (beat.kind === 'old') return key === 'old' ? 'progress' : 'none';
    if (beat.kind === 'new') return key === 'old' ? 'full' : 'progress';
    return 'full';
  };
  const rows = { old: rowState(query, rowOf('old'), reveal('old'), local), new: rowState(query, rowOf('new'), reveal('new'), local) };

  // The table on the right fills one row per ranking beat, in beat order.
  const tableRows = [];
  timeline.beats.forEach((b, index) => {
    if (b.kind !== 'old' && b.kind !== 'new') return;
    const row = trace.rankings[b.kind].rows[b.query];
    let alpha = 0;
    if (index < beatIndex) alpha = 1;
    else if (index === beatIndex) alpha = ramp(local, 1.3, 0.5);
    tableRows.push({ key: b.kind, id: row.id, precision: row.precision, recall: row.recall, rr: row.rr, ndcg: row.ndcg, alpha, current: index === beatIndex });
  });
  const meansAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const ndcgAlpha = beat.kind === 'practice' ? ramp(local, 0.2, 0.6) : (beatIndex > practiceBeat ? 1 : 0);
  const discountAlpha = beat.kind === 'practice-intro' ? ramp(local, 0.1, 0.6) : (beatIndex > practiceIntroBeat ? 1 : 0);
  const k = data.k;
  const discount = {
    alpha: discountAlpha,
    values: Array.from({ length: 5 }, (_, i) => 1 / Math.log2(i + 2)),
    oldHits: trace.rankings.old.rows[q].hit_positions.filter((p) => p <= k),
    newHits: trace.rankings.new.rows[q].hit_positions.filter((p) => p <= k),
    oldNdcg: trace.rankings.old.rows[q].ndcg,
    newNdcg: trace.rankings.new.rows[q].ndcg,
    ideal: Array.from({ length: Math.min(k, query.relevant.length) }, (_, i) => 1 / Math.log2(i + 2)).reduce((a, b) => a + b, 0),
  };
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, queryIndex: q, query: { id: query.id, question: query.question, relevant: query.relevant }, rows,
    table: { rows: tableRows, means: { old: trace.rankings.old.means, new: trace.rankings.new.means, alpha: meansAlpha }, delta: trace.delta, ndcgAlpha },
    discount, k, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const SLOT_X0 = 80, SLOT_STEP_X = 92, SLOT_W = 80, SLOT_H = 40;
const ROW_Y = { old: 90, new: 176 };
const RX = 584, RW = 300, RY = 60, RH = 384;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function drawRow(ctx, row, scene) {
  const y = ROW_Y[row.key];
  ctx.font = `12px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.fillText(row.key, 36, y + 25);
  // The judged window around the first k slots.
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.setLineDash([4, 4]);
  ctx.globalAlpha = 0.9;
  rounded(ctx, SLOT_X0 - 5, y - 5, scene.k * SLOT_STEP_X - (SLOT_STEP_X - SLOT_W) + 10, SLOT_H + 10, 6);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.font = `10px ${MONO}`;
  ctx.fillText(`top ${scene.k} judged`, SLOT_X0 - 4, y - 9);
  row.slots.forEach((slot) => {
    const x = SLOT_X0 + (slot.position - 1) * SLOT_STEP_X;
    ctx.fillStyle = PANEL;
    rounded(ctx, x, y, SLOT_W, SLOT_H, 5); ctx.fill();
    if (slot.relevant && slot.lit > 0) {
      ctx.save(); ctx.globalAlpha = slot.lit; ctx.fillStyle = GREEN; rounded(ctx, x, y, SLOT_W, SLOT_H, 5); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = slot.first && slot.lit > 0.5 ? INK : LINE;
    ctx.lineWidth = slot.first && slot.lit > 0.5 ? 2 : 1;
    rounded(ctx, x, y, SLOT_W, SLOT_H, 5); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = slot.relevant && slot.lit > 0.5 ? BG : INK;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(slot.id, x + SLOT_W / 2, y + 26);
    ctx.fillStyle = slot.relevant && slot.lit > 0.5 ? BG : DIM;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(slot.position), x + 5, y + 12);
  });
  ctx.textAlign = 'left';
  // Readout: three mini meters.
  if (row.readout.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = row.readout.alpha;
    const my = y + 62;
    const meters = [['P@' + scene.k, row.readout.precision, 80], ['R@' + scene.k, row.readout.recall, 240], ['RR', row.readout.rr, 400]];
    for (const [label, value, mx] of meters) {
      ctx.fillStyle = DIM; ctx.font = `11px ${MONO}`; ctx.fillText(label, mx, my);
      ctx.fillStyle = LINE; ctx.fillRect(mx + 34, my - 8, 70, 7);
      ctx.fillStyle = BLUE; ctx.fillRect(mx + 34, my - 8, 70 * value * row.readout.fill, 7);
      ctx.fillStyle = INK; ctx.fillText(f3(value * row.readout.fill), mx + 110, my);
    }
    ctx.restore();
  }
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`precision@${scene.k}, recall@${scene.k}, and reciprocal rank: old against new ranking`, 28, 36);
  ctx.font = `12px ${MONO}`;
  ctx.fillText(`${scene.query.id}  “${scene.query.question}”`, 36, 66);
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(`relevant: ${scene.query.relevant.join(', ')}`, 36 + 7.3 * (scene.query.question.length + 8), 66);

  drawRow(ctx, scene.rows.old, scene);
  drawRow(ctx, scene.rows.new, scene);

  // Legend and, in the practice, the discount plot.
  ctx.fillStyle = DIM;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('green: a relevant chunk   bright border: the first relevant hit   amber box: the results judged', 36, 266);
  if (scene.discount.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.discount.alpha;
    const base = 420, top = 316;
    ctx.fillStyle = INK; ctx.font = `11px ${MONO}`;
    ctx.fillText(`nDCG@${scene.k}: a hit at position p earns 1 / log2(p + 1)`, 36, 300);
    scene.discount.values.forEach((value, index) => {
      const position = index + 1;
      const x = SLOT_X0 + index * SLOT_STEP_X;
      const h = (base - top) * value;
      const newHit = scene.discount.newHits.includes(position), oldHit = scene.discount.oldHits.includes(position);
      ctx.fillStyle = position <= scene.k ? (newHit ? GREEN : PANEL) : LINE;
      ctx.fillRect(x, base - h, SLOT_W, h);
      if (oldHit) { ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.strokeRect(x + 1, base - h + 1, SLOT_W - 2, h - 2); ctx.lineWidth = 1; }
      ctx.fillStyle = DIM; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(f3(value), x + SLOT_W / 2, base - h - 5);
      ctx.fillText(`position ${position}`, x + SLOT_W / 2, base + 13);
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = INK; ctx.font = `10px ${MONO}`;
    ctx.fillText(`${scene.query.id} old hits (blue outline) at ${scene.discount.oldHits.join(', ')}: ${f3(scene.discount.oldNdcg)} of the ideal ${f3(scene.discount.ideal)}`, 36, 446);
    ctx.fillText(`${scene.query.id} new hits (green) at ${scene.discount.newHits.join(', ')}: ${f3(scene.discount.newNdcg)}`, 36, 462);
    ctx.restore();
  }

  // Score table.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, RY, RW, RH, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText(`scores, k = ${scene.k}`, RX + 12, RY + 20);
  const cols = [[`P@${scene.k}`, RX + 128], [`R@${scene.k}`, RX + 178], ['RR', RX + 228], ['nDCG', RX + 284]];
  ctx.fillText('query', RX + 12, RY + 44);
  ctx.textAlign = 'right';
  cols.forEach(([label, x], index) => {
    ctx.save(); if (index === 3) ctx.globalAlpha = scene.table.ndcgAlpha; ctx.fillText(label, x, RY + 44); ctx.restore();
  });
  scene.table.rows.forEach((row, index) => {
    if (row.alpha <= 0) return;
    const y = RY + 66 + index * 22;
    ctx.save();
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = row.current ? BLUE : INK;
    ctx.textAlign = 'left';
    ctx.fillText(`${row.id} ${row.key}`, RX + 12, y);
    ctx.textAlign = 'right';
    [row.precision, row.recall, row.rr].forEach((value, column) => ctx.fillText(f3(value), cols[column][1], y));
    ctx.globalAlpha = row.alpha * scene.table.ndcgAlpha;
    ctx.fillText(f3(row.ndcg), cols[3][1], y);
    ctx.restore();
  });
  const dividerY = RY + 66 + scene.table.rows.length * 22 - 6;
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(RX + 12, dividerY); ctx.lineTo(RX + RW - 12, dividerY); ctx.stroke();
  if (scene.table.means.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.table.means.alpha;
    ['old', 'new'].forEach((key, index) => {
      const m = scene.table.means[key];
      const y = dividerY + 22 + index * 22;
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText(`mean ${key}`, RX + 12, y);
      ctx.textAlign = 'right';
      [m.precision, m.recall, m.mrr].forEach((value, column) => ctx.fillText(f3(value), cols[column][1], y));
      ctx.globalAlpha = scene.table.means.alpha * scene.table.ndcgAlpha;
      ctx.fillText(f3(m.ndcg), cols[3][1], y);
      ctx.globalAlpha = scene.table.means.alpha;
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = AMBER;
    const dy = dividerY + 78;
    const sign = (v) => (v >= 0 ? '+' : '') + f3(v);
    ctx.fillText(`new minus old: MRR ${sign(scene.table.delta.mrr)}`, RX + 12, dy);
    ctx.globalAlpha = scene.table.means.alpha * scene.table.ndcgAlpha;
    ctx.fillText(`nDCG@${scene.k} ${sign(scene.table.delta.ndcg)}`, RX + 12, dy + 18);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}
