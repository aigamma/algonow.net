// The lesson's animation, without a DOM: the same pass at k estimator as
// solution.py (and pass_all_k from practice_answer.py), run on the same six
// problems (python/fixtures/problems.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift
// from the code. The subsets the figure enumerates are the ones the estimator
// counts: the first c samples of a problem are the passing ones.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f3 = (x) => x.toFixed(3);

// comb, pass_at_k, and pass_all_k from the lesson files. math.comb has no
// JavaScript twin, so a small multiplicative version stands in; the fixture
// derived from Python pins every estimate it produces.
export function comb(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
}
export function passAtK(n, c, k) {
  if (k < 1 || k > n) throw new Error(`k must be between 1 and n: k ${k}, n ${n}`);
  if (c < 0 || c > n) throw new Error(`c must be between 0 and n: c ${c}, n ${n}`);
  if (n - c < k) return 1.0;
  return (comb(n, k) - comb(n - c, k)) / comb(n, k);
}
export function passAllK(n, c, k) {
  if (k < 1 || k > n) throw new Error(`k must be between 1 and n: k ${k}, n ${n}`);
  if (c < 0 || c > n) throw new Error(`c must be between 0 and n: c ${c}, n ${n}`);
  if (c < k) return 0.0;
  return comb(c, k) / comb(n, k);
}
// Every k-subset of 0..n-1 in lexicographic order, as itertools.combinations yields them.
export function combinations(n, k) {
  const out = [];
  const current = [];
  const walk = (start) => {
    if (current.length === k) { out.push([...current]); return; }
    for (let i = start; i < n; i += 1) { current.push(i); walk(i + 1); current.pop(); }
  };
  walk(0);
  return out;
}

function table(problems, ks, score) {
  const rows = problems.map((p) => ({ id: p.id, name: p.name, n: p.n, c: p.c, scores: ks.map((k) => round6(score(p.n, p.c, k))) }));
  const means = ks.map((_, position) => round6(rows.reduce((total, row) => total + row.scores[position], 0) / rows.length));
  return { rows, means };
}
function subsetsFor(problems, id, k, allPass) {
  const problem = problems.find((p) => p.id === id);
  const samples = Array.from({ length: problem.n }, (_, index) => index < problem.c);
  const subsets = combinations(problem.n, k).map((indexes) => {
    const flags = indexes.map((i) => samples[i]);
    return { indexes, counts: allPass ? flags.every(Boolean) : flags.some(Boolean) };
  });
  const value = allPass ? passAllK(problem.n, problem.c, k) : passAtK(problem.n, problem.c, k);
  return { problem: id, n: problem.n, c: problem.c, k, samples, subsets, counting: subsets.filter((s) => s.counts).length, total: subsets.length, estimate: round6(value) };
}

export function buildTrace(data) {
  const atLeast = table(data.problems, data.ks, passAtK);
  const all = table(data.problems, data.ks, passAllK);
  const anyCorrect = data.problems.filter((p) => p.c > 0).length;
  return {
    ks: data.ks,
    rows: atLeast.rows,
    means: atLeast.means,
    any_correct: anyCorrect,
    any_rate: round6(anyCorrect / data.problems.length),
    subsets: subsetsFor(data.problems, data.subset_problem, data.subset_k, false),
    all_k: { rows: all.rows, means: all.means, subsets: subsetsFor(data.problems, data.practice_problem, data.subset_k, true) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. One beat shows the samples of
// one problem, one lays out its ten subsets, one reads the ratio, then one
// beat per problem fills the table; the whole run is about thirty five seconds.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;
const SAMPLES = 2.5;
const SUBSETS = 5.0;
const SUBSET_GAP = 0.4;          // one subset row appears every 0.4 s
const RATIO = 2.5;
const ROW_BEAT = 2.4;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 4.0;

function formulaText(n, c, k, value) {
  if (n - c < k) return `pass@${k} = 1.000 (only ${n - c} failure${n - c === 1 ? '' : 's'}: every subset of ${k} holds a pass)`;
  return `pass@${k} = (${comb(n, k)} - ${comb(n - c, k)})/${comb(n, k)} = ${f3(value)}`;
}
function rowCaption(row, ks) {
  if (row.c === row.n) return `${row.id} ${row.name}, ${row.c} of ${row.n} passed: no failures, so every subset holds a pass and ${ks.map((k) => `pass@${k}`).join(', ')} are all 1.000.`;
  const parts = ks.map((k, position) => formulaText(row.n, row.c, k, row.scores[position]));
  return `${row.id} ${row.name}, ${row.c} of ${row.n} passed: ${parts.join('; ')}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.problems[0].n;
  const sub = trace.subsets;
  const subName = data.problems.find((p) => p.id === sub.problem).name;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${data.problems.length} problems, ${n} samples each: for every problem, c of the ${n} samples passed the tests.`,
    captionLate: `What shipped: "any sample passed" on ${trace.any_correct} of ${data.problems.length} problems (${f3(trace.any_rate)}), reported as the model's score. That is pass@${n}, not what a single-sample user sees.` });
  t += INTRO;
  beats.push({ kind: 'samples', start: t, duration: SAMPLES,
    caption: `${sub.problem} ${subName}: ${sub.c} of ${sub.n} samples passed. A user who takes ${sub.k} samples: which subsets of ${sub.k} hold a pass?` });
  t += SAMPLES;
  beats.push({ kind: 'subsets', start: t, duration: SUBSETS,
    caption: `The ${sub.total} subsets of ${sub.k} from ${sub.n}: ${sub.counting} hold at least one passing sample; the ${sub.total - sub.counting} made only of failures does not.` });
  t += SUBSETS;
  beats.push({ kind: 'ratio', start: t, duration: RATIO,
    caption: `pass@${sub.k} for ${sub.problem} = ${sub.counting}/${sub.total} = ${f3(sub.estimate)}. In one line: (C(${sub.n},${sub.k}) - C(${sub.n - sub.c},${sub.k}))/C(${sub.n},${sub.k}) = (${comb(sub.n, sub.k)} - ${comb(sub.n - sub.c, sub.k)})/${comb(sub.n, sub.k)}.` });
  t += RATIO;
  trace.rows.forEach((row, index) => {
    beats.push({ kind: 'row', start: t, duration: ROW_BEAT, index, caption: rowCaption(row, data.ks) });
    t += ROW_BEAT;
  });
  const means = data.ks.map((k, position) => `pass@${k} ${f3(trace.means[position])}`).join(', ');
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Means: ${means}. The shipped "any sample passed" (${f3(trace.any_rate)}) is the pass@${n} mean; a user who takes one sample passes ${f3(trace.means[0])} of the problems.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: the chance that every one of the k samples passes, counted over the subsets made only of passes.' });
  t += PRACTICE_INTRO;
  const ps = trace.all_k.subsets;
  const psName = data.problems.find((p) => p.id === ps.problem).name;
  const allMeans = data.ks.map((k, position) => `all@${k} ${f3(trace.all_k.means[position])}`).join(', ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${ps.problem} ${psName}, ${ps.c} of ${ps.n} passed: ${ps.counting} of the ${ps.total} subsets of ${ps.k} are all passes, so all@${ps.k} = C(${ps.c},${ps.k})/C(${ps.n},${ps.k}) = ${f3(ps.estimate)}. Means: ${allMeans}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: the sample chips, the subset grid,
// the ratio counter, the table rows revealed so far, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const samplesBeat = kinds.indexOf('samples');
  const subsetsBeat = kinds.indexOf('subsets');
  const ratioBeat = kinds.indexOf('ratio');
  const firstRow = kinds.indexOf('row');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const practice = beatIndex >= practiceBeat;
  const source = practice ? trace.all_k.subsets : trace.subsets;
  const mode = practice ? 'all' : 'atLeast';

  const samplesAlpha = beatIndex < samplesBeat ? 0 : (beat.kind === 'samples' ? 1 : 1);
  const samples = source.samples.map((pass, index) => ({ pass, alpha: beatIndex < samplesBeat ? 0 : (beat.kind === 'samples' ? ramp(local, 0.1 + index * 0.25, 0.4) : (beat.kind === 'practice' ? ramp(local, 0.1, 0.5) : 1)) }));
  const subsets = source.subsets.map((subset, index) => {
    let alpha = 0;
    if (beat.kind === 'subsets') alpha = ramp(local, 0.2 + index * SUBSET_GAP, 0.4);
    else if (beatIndex > subsetsBeat && !practice) alpha = 1;
    else if (beat.kind === 'practice') alpha = ramp(local, 0.6 + index * 0.25, 0.4);
    return { indexes: subset.indexes, counts: subset.counts, alpha };
  });
  const visibleSubsets = subsets.filter((s) => s.alpha > 0).length;
  const counter = {
    alpha: beat.kind === 'ratio' ? ramp(local, 0.2, 0.6) : (beatIndex > ratioBeat && !practice ? 1 : (beat.kind === 'practice' ? ramp(local, 3.2, 0.6) : 0)),
    hits: source.counting, total: source.total, estimate: source.estimate, k: source.k, problem: source.problem, mode,
  };

  const rows = trace.rows.map((row, index) => {
    let alpha = 0;
    if (beat.kind === 'row') alpha = index < beat.index ? 1 : (index === beat.index ? ramp(local, 0.1, 0.8) : 0);
    else if (beatIndex > firstRow + trace.rows.length - 1) alpha = 1;
    return { ...row, alpha };
  });
  const meansAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.7) : (beatIndex > outroBeat ? 1 : 0);
  const highlight = beat.kind === 'row' ? beat.index : -1;
  const allRows = practice ? trace.all_k.rows.map((row) => ({ ...row, alpha: beat.kind === 'practice' ? ramp(local, 3.2, 0.7) : 1 })) : null;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, mode, samples, samplesAlpha, subsets, visibleSubsets, counter, rows, meansAlpha, highlight,
    means: trace.means, allRows, allMeans: trace.all_k.means, ks: trace.ks, anyRate: trace.any_rate, anyCorrect: trace.any_correct, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 28;                                   // left panel: samples and subsets
const SAMPLE_Y = 96, SAMPLE_SIZE = 34, SAMPLE_GAP = 46;
const GRID_Y = 170, GRID_ROW = 42, GRID_COL = 200, CELL = 16;
const TX = 460, TW = 412;                        // right panel: the table
const TABLE_Y = 78, ROW_H = 40;
const COLS = [TX + 12, TX + 196, TX + 258, TX + 328, TX + 398];   // problem, c/n, k columns (right edges for numbers)

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(scene.mode === 'all' ? 'all@k: the chance that every one of k samples passes, from n samples with c passes' : 'pass@k: the chance that at least one of k samples passes, from n samples with c passes', LX, 36);

  // Left panel: the samples of one problem and its subsets of k.
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(`${scene.counter.problem}: ${scene.samples.length} samples, the first ${scene.samples.filter((s) => s.pass).length} passed`, LX, SAMPLE_Y - 14);
  scene.samples.forEach((sample, index) => {
    if (sample.alpha <= 0) return;
    ctx.globalAlpha = sample.alpha;
    ctx.fillStyle = sample.pass ? GREEN : RED;
    rounded(ctx, LX + index * SAMPLE_GAP, SAMPLE_Y, SAMPLE_SIZE, SAMPLE_SIZE, 5); ctx.fill();
    ctx.fillStyle = BG;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`s${index + 1}`, LX + index * SAMPLE_GAP + SAMPLE_SIZE / 2, SAMPLE_Y + 22);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  if (scene.visibleSubsets > 0) ctx.fillText(`subsets of ${scene.counter.k} (${scene.mode === 'all' ? 'green: all passes' : 'green: holds a pass'})`, LX, GRID_Y - 12);
  scene.subsets.forEach((subset, index) => {
    if (subset.alpha <= 0) return;
    const column = Math.floor(index / 5);
    const row = index % 5;
    const x = LX + column * GRID_COL;
    const y = GRID_Y + row * GRID_ROW;
    ctx.globalAlpha = subset.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, x, y, 184, 32, 5); ctx.fill();
    subset.indexes.forEach((sampleIndex, position) => {
      const pass = scene.samples[sampleIndex].pass;
      ctx.fillStyle = pass ? GREEN : RED;
      rounded(ctx, x + 8 + position * (CELL + 6), y + 8, CELL, CELL, 3); ctx.fill();
    });
    ctx.fillStyle = subset.counts ? GREEN : RED;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(subset.counts ? 'counts' : 'no', x + 82, y + 20);
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`s${subset.indexes.map((i) => i + 1).join(' s')}`, x + 128, y + 20);
  });
  ctx.globalAlpha = 1;
  if (scene.counter.alpha > 0) {
    ctx.globalAlpha = scene.counter.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, LX, 392, 400, 54, 6); ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `13px ${MONO}`;
    const label = scene.mode === 'all' ? 'all' : 'pass';
    ctx.fillText(`${label}@${scene.counter.k} for ${scene.counter.problem} = ${scene.counter.hits}/${scene.counter.total} = ${f3(scene.counter.estimate)}`, LX + 12, 416);
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(scene.mode === 'all' ? 'subsets made only of passes, over all subsets' : 'all subsets minus the all-failure subsets, over all subsets', LX + 12, 436);
    ctx.globalAlpha = 1;
  }

  // Right panel: the table, one row per problem, one column per k.
  ctx.fillStyle = PANEL;
  rounded(ctx, TX, TABLE_Y - 24, TW, ROW_H * (scene.rows.length + 1) + 44, 6); ctx.fill();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('problem', COLS[0], TABLE_Y - 6);
  ctx.textAlign = 'right';
  ctx.fillText('c/n', COLS[1], TABLE_Y - 6);
  const label = scene.mode === 'all' ? 'all' : 'pass';
  scene.ks.forEach((k, position) => ctx.fillText(`${label}@${k}`, COLS[2 + position], TABLE_Y - 6));
  const rows = scene.mode === 'all' && scene.allRows ? scene.allRows : scene.rows;
  rows.forEach((row, index) => {
    const y = TABLE_Y + 8 + index * ROW_H;
    if (scene.highlight === index) {
      ctx.fillStyle = LINE;
      rounded(ctx, TX + 4, y - 4, TW - 8, ROW_H - 6, 4); ctx.fill();
    }
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.fillText(`${row.id} ${row.name}`, COLS[0], y + 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = DIM;
    ctx.fillText(`${row.c}/${row.n}`, COLS[1], y + 16);
    if (row.alpha > 0) {
      ctx.globalAlpha = row.alpha;
      row.scores.forEach((score, position) => {
        const right = COLS[2 + position];
        ctx.fillStyle = LINE;
        ctx.fillRect(right - 50, y + 22, 50, 4);
        ctx.fillStyle = BLUE;
        ctx.fillRect(right - 50, y + 22, 50 * score, 4);
        ctx.fillStyle = INK;
        ctx.fillText(f3(score), right, y + 16);
      });
      ctx.globalAlpha = 1;
    }
  });
  const meansY = TABLE_Y + 8 + rows.length * ROW_H + 10;
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(TX + 8, meansY - 6); ctx.lineTo(TX + TW - 8, meansY - 6); ctx.stroke();
  if (scene.meansAlpha > 0) {
    ctx.globalAlpha = scene.meansAlpha;
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = AMBER;
    ctx.fillText('mean', COLS[0], meansY + 14);
    ctx.textAlign = 'right';
    const means = scene.mode === 'all' ? scene.allMeans : scene.means;
    means.forEach((mean, position) => ctx.fillText(f3(mean), COLS[2 + position], meansY + 14));
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    if (scene.mode !== 'all') ctx.fillText(`shipped: any sample passed ${scene.anyCorrect}/${scene.rows.length} = ${f3(scene.anyRate)}, the pass@${scene.rows[0].n} mean`, COLS[0], meansY + 34);
    else ctx.fillText('with one sample, at least one and all of them are the same event', COLS[0], meansY + 34);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}
