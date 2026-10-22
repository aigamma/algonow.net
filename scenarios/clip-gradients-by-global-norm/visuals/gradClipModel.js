// The lesson's animation, without a DOM: the same global-norm clipping as
// solution.py, run on the same gradients (python/fixtures/gradients.json),
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f4 = (x) => x.toFixed(4);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// global_norm, clip_by_global_norm, apply_update, and distance from
// solution.py, and clip_by_group_norm from practice_answer.py.
export function globalNorm(grads) {
  let total = 0.0;
  for (const group of grads) for (const value of group) total += value * value;
  return Math.sqrt(total);
}
export function clipByGlobalNorm(grads, maxNorm) {
  if (maxNorm <= 0) throw new Error(`max_norm must be positive, got ${maxNorm}`);
  const norm = globalNorm(grads);
  const scale = Math.min(1.0, maxNorm / (norm + 1e-6));
  const clipped = grads.map((group) => group.map((value) => value * scale));
  return { clipped, norm, scale };
}
export function applyUpdate(params, grads, learningRate) {
  if (params.length !== grads.length) throw new Error(`${params.length} parameter groups but ${grads.length} gradient groups`);
  return params.map((group, index) => {
    if (group.length !== grads[index].length) throw new Error(`parameter group ${index + 1} has ${group.length} values but ${grads[index].length} gradients`);
    return group.map((value, j) => value - learningRate * grads[index][j]);
  });
}
export function distance(before, after) {
  return globalNorm(before.map((group, i) => group.map((value, j) => after[i][j] - value)));
}
export function clipByGroupNorm(grads, maxNorm) {
  if (maxNorm <= 0) throw new Error(`max_norm must be positive, got ${maxNorm}`);
  const clipped = [], norms = [], scales = [];
  for (const group of grads) {
    const norm = globalNorm([group]);
    const scale = Math.min(1.0, maxNorm / (norm + 1e-6));
    clipped.push(group.map((value) => value * scale));
    norms.push(norm);
    scales.push(scale);
  }
  return { clipped, norms, scales };
}

export function buildTrace(data) {
  const lr = data.learning_rate;
  const batches = [];
  for (const [name, grads] of [['bad', data.grads], ['ordinary', data.small_grads]]) {
    const { clipped, norm, scale } = clipByGlobalNorm(grads, data.max_norm);
    const squares = grads.map((g) => g.map((v) => round6(v * v)));
    const sum = (list) => list.reduce((a, b) => a + b, 0);
    batches.push({
      name, grads, squares, group_sums: squares.map((g) => round6(sum(g))), total: round6(sum(squares.map(sum))),
      norm: round6(norm), scale: round6(scale), clipped: clipped.map((g) => g.map(round6)), norm_after: round6(globalNorm(clipped)),
      step_without: round6(distance(data.params, applyUpdate(data.params, grads, lr))),
      step_with: round6(distance(data.params, applyUpdate(data.params, clipped, lr))),
    });
  }
  const byGroup = clipByGroupNorm(data.grads, data.max_norm);
  return {
    max_norm: data.max_norm, learning_rate: lr, batches,
    per_group: { norms: byGroup.norms.map(round6), scales: byGroup.scales.map(round6), clipped: byGroup.clipped.map((g) => g.map(round6)),
      global_norm_after: round6(globalNorm(byGroup.clipped)), step: round6(distance(data.params, applyUpdate(data.params, byGroup.clipped, lr))) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace, about three seconds per
// decision; the whole run is under half a minute.
const INTRO = 3.0, INTRO_LATE_AT = 1.5, SQUARES = 3.0, SCALE = 2.8, CLIP = 3.2, STEP = 3.0, ORDINARY = 3.0, OUTRO = 2.6, PRACTICE_INTRO = 1.0, PRACTICE = 4.0;

export function buildTimeline(trace, data) {
  const [bad, ordinary] = trace.batches;
  const p = trace.per_group;
  const beats = [];
  let t = 0;
  const push = (kind, duration, caption, extra = {}) => { beats.push({ kind, start: t, duration, caption, ...extra }); t += duration; };
  const values = data.grads.flat().length;
  const maxText = trace.max_norm.toFixed(1);
  push('intro', INTRO, `${data.grads.length} parameter groups and ${values} gradient values from the bad batch: ${data.grads.map((g) => `[${g.join(', ')}]`).join(', ')}. Max norm ${maxText}, learning rate ${trace.learning_rate}.`,
    { captionLate: `What shipped: no clipping. This batch moved the parameters ${f4(bad.step_without)}, ten times an ordinary step of ${f4(ordinary.step_without)}, and the loss went to NaN.` });
  push('squares', SQUARES, `Global norm: square every value and add them up, ${bad.squares.flat().map((s) => s.toFixed(0)).join(' + ')} = ${bad.total.toFixed(0)}; the square root is ${f4(bad.norm)}.`);
  push('scale', SCALE, `The max norm ${maxText} is less than ${f4(bad.norm)}, so the scale is ${maxText} / ${f4(bad.norm)} = ${f4(bad.scale)}. The min with 1 means a batch under the max keeps a scale of 1.`);
  push('clip', CLIP, `Every value times ${f4(bad.scale)}: 3.0 becomes ${f4(bad.clipped[0][0])}, 4.0 becomes ${f4(bad.clipped[0][1])}, 12.0 becomes ${f4(bad.clipped[1][1])}, 1.0 becomes ${f4(bad.clipped[2][0])}. The norm is now ${f4(bad.norm_after)} and the direction is unchanged.`);
  push('step', STEP, `Parameter step: ${f4(bad.step_without)} without clipping, ${f4(bad.step_with)} with clipping, along the same direction.`);
  push('ordinary', ORDINARY, `An ordinary batch: global norm ${f4(ordinary.norm)} is under the max, so the scale is ${ordinary.scale.toFixed(1)} and the gradients pass through unchanged; the step is ${f4(ordinary.step_with)}.`);
  push('outro', OUTRO, `One number, the global norm, decides; one scale applies to every value. The bad batch becomes a step of ${f4(bad.step_with)} and an ordinary batch is untouched. That is clip grad norm, written out.`);
  push('practice-intro', PRACTICE_INTRO, `Practice variation: clip each group to the max norm on its own.`);
  push('practice', PRACTICE, `Per group: group 1 at norm ${f4(p.norms[0])} stays, group 2 is scaled by ${f4(p.scales[1])} to [${p.clipped[1].map(f4).join(', ')}], group 3 stays. Together the norm is ${f4(p.global_norm_after)}, over the max of ${maxText}: each group is bounded, the whole is not; the step is ${f4(p.step)}.`);
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

// The drawable state at `elapsed` seconds: the element bars, the norm bar,
// the max line, the step arrows, the per-group bars, the readout, the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const at = (kind) => kinds.indexOf(kind);
  const [bad, ordinary] = trace.batches;
  const p = trace.per_group;

  const batch = beat.kind === 'ordinary' ? ordinary : bad;
  // How far the shrink has gone: 0 at the original values, 1 at the clipped values.
  let shrink = 0;
  if (beat.kind === 'clip') shrink = easeInOut(ramp(local, 0.2, 1.8));
  else if (beatIndex > at('clip') && beat.kind !== 'ordinary') shrink = 1;
  if (beat.kind === 'ordinary') shrink = 1;      // scale 1: shown values equal the originals anyway
  let practiceShrink = 0;
  if (beat.kind === 'practice') practiceShrink = easeInOut(ramp(local, 0.3, 1.8));

  const rows = [];
  batch.grads.forEach((group, g) => group.forEach((value, j) => {
    const clipped = batch.clipped[g][j];
    let shown = value + (clipped - value) * shrink;
    if (beat.kind === 'practice') shown = value + (p.clipped[g][j] - value) * practiceShrink;
    rows.push({ group: g + 1, index: j, value, clipped, shown, alpha: beat.kind === 'intro' ? ramp(local, 0.2 + rows.length * 0.15, 0.4) : 1 });
  }));
  const labelAlpha = beat.kind === 'clip' ? ramp(local, 2.0, 0.6) : (beatIndex > at('clip') ? 1 : 0);

  const grow = beat.kind === 'squares' ? easeInOut(ramp(local, 0.2, 2.0)) : (beatIndex > at('squares') ? 1 : 0);
  const normLength = batch.norm * (1 - shrink * (1 - batch.scale)) * grow;
  const segments = batch.group_sums.map((sum) => sum / batch.total);
  const normBar = { alpha: grow > 0 ? 1 : 0, length: normLength, full: batch.norm, segments, labelAlpha: beat.kind === 'squares' ? ramp(local, 2.2, 0.5) : (beatIndex > at('squares') ? 1 : 0) };
  const maxAlpha = beat.kind === 'scale' ? ramp(local, 0.2, 0.6) : (beatIndex > at('scale') ? 1 : 0);
  const scaleAlpha = beat.kind === 'scale' ? ramp(local, 1.0, 0.6) : (beatIndex > at('scale') ? 1 : 0);

  let arrows = null;
  if (beat.kind === 'step' || beat.kind === 'outro') {
    const a = beat.kind === 'step' ? easeInOut(ramp(local, 0.2, 1.4)) : 1;
    arrows = { without: bad.step_without * a, with: bad.step_with * a, labelAlpha: beat.kind === 'step' ? ramp(local, 1.6, 0.5) : 1, kind: 'bad' };
  } else if (beat.kind === 'ordinary') {
    const a = easeInOut(ramp(local, 1.2, 1.0));
    arrows = { without: ordinary.step_without * a, with: ordinary.step_with * a, labelAlpha: ramp(local, 2.2, 0.5), kind: 'ordinary' };
  }

  let practice = null;
  if (beat.kind === 'practice') {
    practice = {
      alpha: ramp(local, 0, 0.3),
      groups: p.norms.map((norm, g) => ({ norm, shown: norm + (globalNormOfGroup(p.clipped[g]) - norm) * practiceShrink, scale: p.scales[g] })),
      combined: p.global_norm_after, combinedAlpha: ramp(local, 2.4, 0.6), step: p.step,
    };
  }

  const readout = {
    batch: beat.kind === 'ordinary' ? 'batch 2 (an ordinary batch)' : 'batch 1 (the bad batch)',
    norm: grow >= 1 ? batch.norm : null, maxNorm: trace.max_norm, scale: scaleAlpha > 0 ? batch.scale : null,
    normAfter: labelAlpha > 0 || beat.kind === 'ordinary' ? batch.norm_after : null,
    stepWithout: arrows && arrows.labelAlpha > 0 ? batch.step_without : null, stepWith: arrows && arrows.labelAlpha > 0 ? batch.step_with : null,
    perGroup: practice && practice.combinedAlpha > 0 ? { norm: p.global_norm_after, step: p.step } : null,
  };
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, batchName: batch.name, rows, labelAlpha, normBar, maxAlpha, scaleAlpha, arrows, practice, readout,
    maxNorm: trace.max_norm, learningRate: trace.learning_rate, finished: t >= timeline.duration };
}
function globalNormOfGroup(group) { return globalNorm([group]); }

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const GROUP_COLORS = [BLUE, '#8fb8ff', '#3f7fd6'];
const X0 = 150;                 // where every bar starts
const PX = 34;                  // pixels per gradient unit (the norm bars)
const STEP_PX = 200;            // pixels per unit of parameter step
const ROW_Y0 = 86, ROW_H = 27;  // the five element rows
const NORM_Y = 272;             // the global norm bar
const BOTTOM_Y = 372;           // the step arrows or the per-group bars
const RX = 636, RW = 236;       // the readout panel

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}
function dashedVertical(ctx, x, y0, y1, color, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`clip gradients by their global norm: max norm ${scene.maxNorm.toFixed(1)}, learning rate ${scene.learningRate}`, 28, 36);
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(`${scene.readout.batch}: one bar per gradient value, grouped by parameter group`, 28, 60);

  // The element rows: value bars that shrink by the one scale.
  scene.rows.forEach((row, i) => {
    const y = ROW_Y0 + i * ROW_H;
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`group ${row.group}`, 28, y + 14);
    ctx.fillStyle = INK;
    ctx.fillText(row.value.toFixed(1), 92, y + 14);
    ctx.fillStyle = PANEL;
    rounded(ctx, X0, y + 3, 12 * PX, 16, 3); ctx.fill();
    ctx.fillStyle = GROUP_COLORS[row.group - 1];
    rounded(ctx, X0, y + 3, Math.max(0, row.shown * PX), 16, 3); ctx.fill();
    if (scene.labelAlpha > 0 && scene.batchName === 'bad' && scene.beat !== 'practice') {
      ctx.globalAlpha = row.alpha * scene.labelAlpha;
      ctx.fillStyle = INK;
      ctx.fillText(`${f4(row.clipped)}`, X0 + Math.max(0, row.shown * PX) + 8, y + 15);
    }
    if (scene.beat === 'practice') {
      ctx.fillStyle = INK;
      ctx.fillText(`${f4(row.shown)}`, X0 + Math.max(0, row.shown * PX) + 8, y + 15);
    }
    ctx.globalAlpha = 1;
  });

  // The global norm bar, split by each group's share of the squared sum.
  if (scene.normBar.alpha > 0) {
    ctx.globalAlpha = scene.beat === 'practice' ? 0.35 : 1;   // the global bar is the worked result; the practice panel below carries the per-group one
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('global norm', 28, NORM_Y - 10);
    ctx.fillStyle = PANEL;
    rounded(ctx, X0, NORM_Y, 14 * PX, 18, 3); ctx.fill();
    let x = X0;
    scene.normBar.segments.forEach((share, g) => {
      const w = share * scene.normBar.length * PX;
      ctx.fillStyle = GROUP_COLORS[g];
      ctx.fillRect(x, NORM_Y, Math.max(0, w), 18);
      x += w;
    });
    if (scene.normBar.labelAlpha > 0) {
      ctx.globalAlpha = scene.normBar.labelAlpha;
      ctx.fillStyle = INK;
      ctx.fillText(f4(scene.normBar.length), X0 + scene.normBar.length * PX + 8, NORM_Y + 13);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    for (const tick of [0, 5, 10]) { ctx.fillText(String(tick), X0 + tick * PX - 3, NORM_Y + 32); }
    ctx.globalAlpha = 1;
  }
  // The max norm line crosses the element rows and the norm bar.
  dashedVertical(ctx, X0 + scene.maxNorm * PX, ROW_Y0 - 6, NORM_Y + 22, AMBER, scene.maxAlpha);
  if (scene.maxAlpha > 0) {
    ctx.save(); ctx.globalAlpha = scene.maxAlpha; ctx.fillStyle = AMBER; ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`max norm ${scene.maxNorm.toFixed(1)}`, X0 + scene.maxNorm * PX + 6, ROW_Y0 - 10); ctx.restore();
  }

  // The bottom panel: the parameter step arrows, or the per-group bars.
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  if (scene.arrows) {
    ctx.fillText('parameter step (how far the update moves)', 28, BOTTOM_Y - 10);
    const bars = scene.arrows.kind === 'bad'
      ? [['without clipping', scene.arrows.without, AMBER], ['with clipping', scene.arrows.with, BLUE]]
      : [['scale 1.0: unchanged', scene.arrows.with, GREEN]];
    bars.forEach(([label, length, color], i) => {
      const y = BOTTOM_Y + i * 30;
      ctx.fillStyle = DIM; ctx.font = `10.5px ${MONO}`;
      ctx.fillText(label, 28, y + 13);
      ctx.fillStyle = color;
      rounded(ctx, X0, y + 2, Math.max(0, length * STEP_PX), 16, 3); ctx.fill();
      if (scene.arrows.labelAlpha > 0) {
        ctx.globalAlpha = scene.arrows.labelAlpha; ctx.fillStyle = INK;
        ctx.fillText(f4(length), X0 + length * STEP_PX + 8, y + 14); ctx.globalAlpha = 1;
      }
    });
    dashedVertical(ctx, X0 + 0.5 * STEP_PX, BOTTOM_Y - 4, BOTTOM_Y + bars.length * 30, AMBER, scene.maxAlpha);
  } else if (scene.practice) {
    ctx.globalAlpha = scene.practice.alpha;
    ctx.fillText('per-group clipping: each group against its own max', 28, BOTTOM_Y - 10);
    scene.practice.groups.forEach((group, g) => {
      const y = BOTTOM_Y + g * 24;
      ctx.fillStyle = DIM; ctx.font = `10.5px ${MONO}`;
      ctx.fillText(`group ${g + 1}`, 28, y + 12);
      ctx.fillStyle = PANEL; rounded(ctx, X0, y + 1, 12 * PX, 14, 3); ctx.fill();
      ctx.fillStyle = GROUP_COLORS[g]; rounded(ctx, X0, y + 1, Math.max(0, group.shown * PX), 14, 3); ctx.fill();
      ctx.fillStyle = INK; ctx.fillText(f4(group.shown), X0 + group.shown * PX + 8, y + 12);
    });
    dashedVertical(ctx, X0 + scene.maxNorm * PX, BOTTOM_Y - 4, BOTTOM_Y + 72, AMBER, 1);
    if (scene.practice.combinedAlpha > 0) {
      ctx.globalAlpha = scene.practice.combinedAlpha; ctx.fillStyle = RED; ctx.font = `11px ${MONO}`;
      ctx.fillText(`together: norm ${f4(scene.practice.combined)}, over the max; step ${f4(scene.practice.step)}`, 28, BOTTOM_Y + 90);
    }
    ctx.globalAlpha = 1;
  }

  // Readout panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, 70, RW, 220, 6); ctx.fill();
  ctx.strokeStyle = LINE; rounded(ctx, RX, 70, RW, 220, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`; ctx.fillStyle = DIM;
  ctx.fillText('clipping readout', RX + 12, 92);
  const r = scene.readout;
  const lines = [
    r.batch,
    r.norm === null ? 'global norm: not measured yet' : `global norm ${f4(r.norm)}`,
    `max norm ${r.maxNorm.toFixed(1)}`,
    r.scale === null ? 'scale: pending' : `scale ${f4(r.scale)}`,
    r.normAfter === null ? '' : `norm after ${f4(r.normAfter)}`,
    r.stepWithout === null ? '' : `step without ${f4(r.stepWithout)}`,
    r.stepWith === null ? '' : `step with ${f4(r.stepWith)}`,
    r.perGroup ? `per group: norm ${f4(r.perGroup.norm)}` : '',
    r.perGroup ? `per group: step ${f4(r.perGroup.step)}` : '',
  ].filter((line) => line !== '');
  ctx.font = `12px ${MONO}`; ctx.fillStyle = INK;
  lines.forEach((line, i) => ctx.fillText(line, RX + 12, 116 + i * 20));
  ctx.fillStyle = DIM; ctx.font = `10.5px ${MONO}`;
  ctx.fillText('scale = min(1, max norm / norm)', RX + 12, 316);
  ctx.fillText('every value times the scale', RX + 12, 334);
  ctx.fillText('amber: what shipped and the max', RX + 12, 362);
  ctx.fillText('blue: the clipped gradients', RX + 12, 380);
}
