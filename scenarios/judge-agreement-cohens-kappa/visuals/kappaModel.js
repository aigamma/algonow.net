// The lesson's animation, without a DOM: the same kappa computation as
// solution.py (and the collapse of practice_answer.py), run on the same graded
// answers (python/fixtures/grades.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const lerp = (from, to, p) => from + (to - from) * p;

// kappa from solution.py: pair counts, totals, observed and chance agreement.
export function kappa(records) {
  if (!records.length) throw new Error('no graded answers');
  const counts = new Map();
  const labelSet = new Set();
  for (const record of records) {
    for (const grader of ['human', 'judge']) if (!record[grader]) throw new Error(`${record.id} has no ${grader} grade`);
    const pair = `${record.human}|${record.judge}`;
    counts.set(pair, (counts.get(pair) || 0) + 1);
    labelSet.add(record.human);
    labelSet.add(record.judge);
  }
  const labels = [...labelSet].sort();
  const humanTotals = {};
  const judgeTotals = {};
  for (const [pair, count] of counts) {
    const [human, judge] = pair.split('|');
    humanTotals[human] = (humanTotals[human] || 0) + count;
    judgeTotals[judge] = (judgeTotals[judge] || 0) + count;
  }
  const n = records.length;
  let agreed = 0;
  for (const label of labels) agreed += counts.get(`${label}|${label}`) || 0;
  const observed = agreed / n;
  let chance = 0.0;
  for (const label of labels) chance += ((humanTotals[label] || 0) / n) * ((judgeTotals[label] || 0) / n);
  if (chance === 1.0) throw new Error(`every grade is ${labels[0]}, so chance agreement is certain and kappa is undefined`);
  return { counts, humanTotals, judgeTotals, labels, n, agreed, observed, chance, kappa: (observed - chance) / (1 - chance) };
}

export function band(value) {
  if (value <= 0) return 'no better than chance';
  if (value < 0.2) return 'slight';
  if (value < 0.4) return 'fair';
  if (value < 0.6) return 'moderate';
  if (value < 0.8) return 'substantial';
  return 'almost perfect';
}

// collapse from practice_answer.py: new records, grades passed through the mapping.
export function collapse(records, mapping) {
  return records.map((record) => ({
    id: record.id,
    human: Object.hasOwn(mapping, record.human) ? mapping[record.human] : record.human,
    judge: Object.hasOwn(mapping, record.judge) ? mapping[record.judge] : record.judge,
  }));
}

const summary = (result) => ({
  labels: result.labels, agreed: Math.round(result.observed * result.n), n: result.n,
  observed: round6(result.observed), chance: round6(result.chance), kappa: round6(result.kappa), band: band(result.kappa),
});
const sortedObject = (object) => Object.fromEntries(Object.keys(object).sort().map((key) => [key, object[key]]));

export function buildTrace(data) {
  const result = kappa(data.grades);
  const counts = {};
  for (const key of [...result.counts.keys()].sort()) counts[key] = result.counts.get(key);
  const three = kappa(data.practice_grades);
  const collapsed = kappa(collapse(data.practice_grades, data.collapse));
  const lazy = kappa(data.grades.map((record) => ({ id: record.id, human: record.human, judge: 'pass' })));
  return {
    items: data.grades.map((record) => ({ id: record.id, human: record.human, judge: record.judge, agree: record.human === record.judge })),
    counts,
    human_totals: sortedObject(result.humanTotals),
    judge_totals: sortedObject(result.judgeTotals),
    ...summary(result),
    always_pass: summary(lazy),
    practice: { mapping: data.collapse, three_labels: summary(three), collapsed: summary(collapsed) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each graded answer gets a short
// glide into its cell and time to read; the statistics then build one beat at
// a time; the whole run is about forty seconds.
const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const ROW_BEAT = 1.7;
const GLIDE_AT = 0.15;
const GLIDE = 0.6;
const TOTALS = 2.5;
const OBSERVED = 2.5;
const CHANCE = 3.0;
const KAPPA = 3.5;
const LAZY = 2.5;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.n;
  const passTotal = trace.human_totals.pass;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} answers, each graded by the human reviewer and the model judge: pass or fail. The judge agrees with the human on ${trace.agreed} of the ${n}.`,
    captionLate: `What shipped: the report said ${Math.round(trace.observed * 100)} percent agreement and the human review was about to be retired. But ${passTotal} of the ${n} pass anyway, so two graders who mostly pass agree often by luck.` });
  t += INTRO;
  let agreedSoFar = 0;
  trace.items.forEach((item, index) => {
    if (item.agree) agreedSoFar += 1;
    const cell = `${item.human}/${item.judge}`;
    const verdict = item.agree ? `agree: the ${cell} cell, on the diagonal` : `disagree: the ${cell} cell, off the diagonal`;
    beats.push({ kind: 'row', start: t, duration: ROW_BEAT, index,
      caption: `${item.id}: human ${item.human}, judge ${item.judge}, ${verdict}. Agreed so far: ${agreedSoFar} of ${index + 1}.` });
    t += ROW_BEAT;
  });
  const ht = trace.human_totals;
  const jt = trace.judge_totals;
  beats.push({ kind: 'totals', start: t, duration: TOTALS,
    caption: `Totals from the cells: the human passed ${ht.pass} and failed ${ht.fail}; the judge passed ${jt.pass} and failed ${jt.fail}. Each total is a row sum or a column sum of the table.` });
  t += TOTALS;
  beats.push({ kind: 'observed', start: t, duration: OBSERVED,
    caption: `Observed agreement: the diagonal holds ${trace.agreed} of the ${n} answers, so ${f2(trace.observed)}.` });
  t += OBSERVED;
  const terms = trace.labels.map((label) => `${label} ${f2(ht[label] / n)} x ${f2(jt[label] / n)}`).join(' + ');
  beats.push({ kind: 'chance', start: t, duration: CHANCE,
    caption: `Chance agreement: for each label, the share the human gives it times the share the judge gives it, summed: ${terms} = ${f2(trace.chance)}.` });
  t += CHANCE;
  beats.push({ kind: 'kappa', start: t, duration: KAPPA,
    caption: `Kappa: (${f2(trace.observed)} - ${f2(trace.chance)}) / (1 - ${f2(trace.chance)}) = ${f2(trace.kappa)}, ${trace.band}: the judge agrees beyond chance about half as much as it possibly could.` });
  t += KAPPA;
  const lazy = trace.always_pass;
  beats.push({ kind: 'lazy', start: t, duration: LAZY,
    caption: `A judge that passes everything agrees with the human on ${lazy.agreed} of ${n}, ${f2(lazy.observed)}, and its chance agreement is also ${f2(lazy.chance)}: kappa ${f2(lazy.kappa)}, ${lazy.band}. Raw agreement rewards the base rate; kappa does not.` });
  t += LAZY;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Agreement ${f2(trace.observed)} became kappa ${f2(trace.kappa)}: ${trace.band} agreement, not the near-perfect judge the percentage suggested. The decision: keep a human sample in the loop and report kappa beside the percentage.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: a batch graded with three labels, pass, partial, and fail, where partial is to count as fail. A mapping passes every grade through dict.get before the same kappa runs.' });
  t += PRACTICE_INTRO;
  const three = trace.practice.three_labels;
  const two = trace.practice.collapsed;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Three labels: observed ${f2(three.observed)}, chance ${f2(three.chance)}, kappa ${f2(three.kappa)}. Partial counted as fail: observed ${f2(two.observed)}, chance ${f2(two.chance)}, kappa ${f2(two.kappa)}. Collapsing raised raw agreement by ${f2(two.observed - three.observed)} but kappa by only ${f2(two.kappa - three.kappa)}, because chance agreement rose too.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'row', 'totals', 'observed', 'chance', 'kappa', 'lazy', 'outro', 'practice-intro', 'practice'];

// The drawable state at `elapsed` seconds: which rows have landed in the
// table, the chip in flight, the cell counts, the statistics revealed so far,
// the gauge marker, and the caption.
export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);

  let placed = 0;                        // rows whose chip has landed in a cell
  let flight = null;                     // the chip in flight: { index, progress }
  if (beat.kind === 'row') {
    const progress = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    placed = beat.index + (progress >= 1 ? 1 : 0);
    if (progress < 1) flight = { index: beat.index, progress };
  } else if (stage > 1) {
    placed = trace.items.length;
  }
  const cells = {};
  for (const key of Object.keys(trace.counts)) cells[key] = 0;
  let agreedSoFar = 0;
  for (const item of trace.items.slice(0, placed)) {
    cells[`${item.human}|${item.judge}`] += 1;
    if (item.agree) agreedSoFar += 1;
  }
  const rowAlpha = (index) => (beat.kind === 'intro' ? ramp(local, 0.15 + index * 0.1, 0.4) : 1);
  const items = trace.items.map((item, index) => ({ ...item, alpha: rowAlpha(index), landed: index < placed, current: beat.kind === 'row' && beat.index === index }));

  const reveal = (kind, at = 0.1, duration = 0.6) => {
    const index = STAGES.indexOf(kind);
    if (stage > index) return 1;
    if (stage < index) return 0;
    return easeInOut(ramp(local, at, duration));
  };
  const totalsAlpha = reveal('totals');
  const observedAlpha = reveal('observed');
  const chanceAlpha = reveal('chance');
  const kappaAlpha = reveal('kappa');
  const lazyAlpha = reveal('lazy');

  // The gauge marker: rises to kappa, drops to zero for the lazy judge, then
  // plays the practice values.
  let marker = null;
  if (beat.kind === 'kappa') marker = { value: lerp(0, trace.kappa, easeInOut(ramp(local, 0.3, 1.2))), label: 'kappa' };
  else if (beat.kind === 'lazy') marker = { value: lerp(trace.kappa, trace.always_pass.kappa, easeInOut(ramp(local, 0.3, 1.0))), label: 'lazy judge' };
  else if (beat.kind === 'outro') marker = { value: trace.kappa, label: 'kappa' };
  else if (beat.kind === 'practice-intro') marker = { value: trace.practice.three_labels.kappa, label: 'three labels' };
  else if (beat.kind === 'practice') {
    const three = trace.practice.three_labels.kappa;
    const two = trace.practice.collapsed.kappa;
    marker = local < 1.4 ? { value: three, label: 'three labels' } : { value: lerp(three, two, easeInOut(ramp(local, 1.4, 0.9))), label: 'partial as fail' };
  }
  const practiceAlpha = stage >= 8 ? (beat.kind === 'practice-intro' ? easeInOut(ramp(local, 0.1, 0.6)) : 1) : 0;
  const practicePhase = beat.kind === 'practice' ? (local < 1.4 ? 1 : 2) : (stage > 9 ? 2 : 0);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, items, flight, cells, placed, agreedSoFar,
    totalsAlpha, observedAlpha, chanceAlpha, kappaAlpha, lazyAlpha, marker, practiceAlpha, practicePhase,
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 28, LY = 104, ROW_H = 24;                     // the list of graded answers
const TX = 318, TY = 128, CELL_W = 92, CELL_H = 62;      // the agreement table
const PX = 624, PW = 252;                                // the statistics panel
const GY = 392, GX0 = PX + 12, GX1 = PX + PW - 12;       // the kappa gauge

const chipColor = (label) => (label === 'pass' ? GREEN : label === 'fail' ? RED : AMBER);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function chip(ctx, x, y, label, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = chipColor(label);
  rounded(ctx, x, y - 10, 52, 16, 4); ctx.fill();
  ctx.fillStyle = BG;
  ctx.font = `10.5px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 26, y + 2);
  ctx.restore();
}

const cellOrigin = (labels, human, judge) => ({ x: TX + labels.indexOf(judge) * CELL_W, y: TY + labels.indexOf(human) * CELL_H });

export function drawScene(ctx, scene, trace) {
  const { labels } = trace;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`Cohen's kappa: agreement beyond chance, ${trace.n} answers, two graders`, 28, 36);

  // The list of graded answers.
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  ctx.fillText('id    human   judge', LX, LY - 14);
  scene.items.forEach((item, index) => {
    if (item.alpha <= 0) return;
    const y = LY + index * ROW_H + 8;
    ctx.globalAlpha = item.alpha * (item.current ? 1 : item.landed ? 0.85 : 0.6);
    ctx.fillStyle = item.current ? INK : DIM;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(item.id, LX, y + 2);
    chip(ctx, LX + 42, y, item.human, 1);
    chip(ctx, LX + 104, y, item.judge, 1);
    if (item.landed) {
      ctx.fillStyle = item.agree ? GREEN : RED;
      ctx.beginPath(); ctx.arc(LX + 172, y - 2, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(`agreed ${scene.agreedSoFar} of ${scene.placed}`, LX, LY + scene.items.length * ROW_H + 18);

  // The agreement table: rows are the human's grade, columns the judge's.
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = DIM;
  ctx.fillText('judge', TX + CELL_W, TY - 34);
  labels.forEach((label, index) => ctx.fillText(label, TX + index * CELL_W + CELL_W / 2, TY - 14));
  ctx.save();
  ctx.translate(TX - 44, TY + CELL_H);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('human', 0, 0);
  ctx.restore();
  ctx.textAlign = 'right';
  labels.forEach((label, index) => ctx.fillText(label, TX - 8, TY + index * CELL_H + CELL_H / 2 + 4));
  for (const human of labels) {
    for (const judge of labels) {
      const { x, y } = cellOrigin(labels, human, judge);
      const diagonal = human === judge;
      ctx.fillStyle = PANEL;
      rounded(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 5); ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = diagonal ? GREEN : RED;
      rounded(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 5); ctx.fill();
      ctx.globalAlpha = 1;
      const count = scene.cells[`${human}|${judge}`] || 0;
      ctx.fillStyle = count ? INK : DIM;
      ctx.font = `20px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(count), x + CELL_W / 2, y + CELL_H / 2 + 7);
    }
  }
  // Totals beside the rows and under the columns.
  if (scene.totalsAlpha > 0) {
    ctx.globalAlpha = scene.totalsAlpha;
    ctx.fillStyle = AMBER;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'left';
    labels.forEach((label, index) => ctx.fillText(String(trace.human_totals[label]), TX + labels.length * CELL_W + 10, TY + index * CELL_H + CELL_H / 2 + 4));
    ctx.textAlign = 'center';
    labels.forEach((label, index) => ctx.fillText(String(trace.judge_totals[label]), TX + index * CELL_W + CELL_W / 2, TY + labels.length * CELL_H + 18));
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('judge totals', TX + CELL_W, TY + labels.length * CELL_H + 34);
    ctx.textAlign = 'left';
    ctx.fillText('human', TX + labels.length * CELL_W + 10, TY - 14);
    ctx.fillText('totals', TX + labels.length * CELL_W + 10, TY - 2);
    ctx.globalAlpha = 1;
  }
  // The chip in flight, from its row to its cell.
  if (scene.flight) {
    const item = trace.items[scene.flight.index];
    const from = { x: LX + 104 + 26, y: LY + scene.flight.index * ROW_H + 8 };
    const cell = cellOrigin(labels, item.human, item.judge);
    const to = { x: cell.x + CELL_W / 2, y: cell.y + CELL_H / 2 };
    const p = scene.flight.progress;
    ctx.fillStyle = item.agree ? GREEN : RED;
    ctx.beginPath(); ctx.arc(lerp(from.x, to.x, p), lerp(from.y, to.y, p) - 4, 6, 0, Math.PI * 2); ctx.fill();
  }

  // The statistics panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, PX, 60, PW, 300, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, PX, 60, PW, 300, 6); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `11.5px ${MONO}`;
  const line = (y, text, alpha, color = INK) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(text, PX + 14, y);
    ctx.globalAlpha = 1;
  };
  const n = trace.n;
  line(84, `agreed      ${scene.agreedSoFar} of ${scene.placed}`, 1, DIM);
  line(112, `observed    ${f2(trace.observed)}   (${trace.agreed} of ${n} on the diagonal)`, scene.observedAlpha);
  line(140, `chance      ${f2(trace.chance)}`, scene.chanceAlpha);
  labels.forEach((label, index) => line(158 + index * 16, `  ${label} ${f2(trace.human_totals[label] / n)} x ${f2(trace.judge_totals[label] / n)} = ${f2((trace.human_totals[label] / n) * (trace.judge_totals[label] / n))}`, scene.chanceAlpha, DIM));
  line(206, `kappa       ${f2(trace.kappa)}   ${trace.band}`, scene.kappaAlpha, BLUE);
  line(224, `  (${f2(trace.observed)} - ${f2(trace.chance)}) / (1 - ${f2(trace.chance)})`, scene.kappaAlpha, DIM);
  const lazy = trace.always_pass;
  line(258, `judge that passes everything`, scene.lazyAlpha, DIM);
  line(276, `agreement ${f2(lazy.observed)}, kappa ${f2(lazy.kappa)}`, scene.lazyAlpha, AMBER);
  if (scene.practiceAlpha > 0) {
    const three = trace.practice.three_labels;
    const two = trace.practice.collapsed;
    line(310, `practice: three labels`, scene.practiceAlpha, DIM);
    line(326, `observed ${f2(three.observed)}  chance ${f2(three.chance)}  kappa ${f2(three.kappa)}`, scene.practiceAlpha);
    if (scene.practicePhase >= 2) {
      line(344, `partial as fail: ${f2(two.observed)}  ${f2(two.chance)}  kappa ${f2(two.kappa)}`, 1, BLUE);
    }
  }

  // The kappa gauge with its bands.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(GX0, GY); ctx.lineTo(GX1, GY); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.font = `9.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'center';
  const gx = (value) => GX0 + clamp01(value) * (GX1 - GX0);
  [[0, '0'], [0.2, '0.2'], [0.4, '0.4'], [0.6, '0.6'], [0.8, '0.8'], [1, '1']].forEach(([value, label]) => {
    ctx.strokeStyle = DIM;
    ctx.beginPath(); ctx.moveTo(gx(value), GY - 8); ctx.lineTo(gx(value), GY + 8); ctx.stroke();
    ctx.fillText(label, gx(value), GY + 22);
  });
  [['slight', 0.1], ['fair', 0.3], ['moderate', 0.5], ['substantial', 0.7], ['almost perfect', 0.9]].forEach(([label, value]) => ctx.fillText(label, gx(value), GY - 14));
  ctx.fillText('kappa', (GX0 + GX1) / 2, GY + 40);
  if (scene.marker) {
    const x = gx(scene.marker.value);
    ctx.fillStyle = scene.marker.label === 'lazy judge' ? AMBER : BLUE;
    ctx.beginPath(); ctx.moveTo(x, GY - 2); ctx.lineTo(x - 7, GY - 30 + 18); ctx.lineTo(x + 7, GY - 30 + 18); ctx.closePath(); ctx.fill();
    ctx.font = `11px ${MONO}`;
    ctx.fillText(f2(scene.marker.value), x, GY + 58);
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}
