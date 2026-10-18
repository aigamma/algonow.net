// The lesson's animation, without a DOM: the same gradient descent as
// solution.py, run on the same eight answers (python/fixtures/answers.json),
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real solution, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it
export const SHOWN_EPOCHS = [1, 10, 25, 50, 100, 150, 200];   // the beats of the training run

const round6 = (x) => Number(x.toFixed(6));
const f4 = (x) => x.toFixed(4);
const f3 = (x) => x.toFixed(3);
const lerp = (from, to, p) => from + (to - from) * p;

// sigmoid, forward, log_loss, loss_and_gradients, and fit from solution.py
// (fit with a tolerance is the practice answer; tolerance 0 is the worked run).
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
export function forward(score, a, b) {
  return sigmoid(a * score + b);
}
export function logLoss(p, label) {
  return label === 1 ? -Math.log(p) : -Math.log(1 - p);
}
export function lossAndGradients(scores, labels, a, b) {
  if (scores.length !== labels.length) throw new Error('zip() argument 2 is shorter than argument 1');
  let totalLoss = 0.0;
  let gradA = 0.0;
  let gradB = 0.0;
  for (let index = 0; index < scores.length; index += 1) {
    const score = scores[index];
    const label = labels[index];
    if (label !== 0 && label !== 1) throw new Error(`label ${label} is not 0 or 1`);
    const p = forward(score, a, b);
    totalLoss += logLoss(p, label);
    gradA += (p - label) * score;
    gradB += p - label;
  }
  const n = scores.length;
  return [totalLoss / n, gradA / n, gradB / n];
}
export function fit(scores, labels, start, learningRate, epochs, tolerance = 0) {
  let a = start.a;
  let b = start.b;
  const history = [];
  let previous = null;
  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    const [loss, gradA, gradB] = lossAndGradients(scores, labels, a, b);
    history.push({ epoch, a, b, loss, gradA, gradB });
    if (previous !== null && previous - loss < tolerance) break;
    previous = loss;
    a -= learningRate * gradA;
    b -= learningRate * gradB;
  }
  return { a, b, history };
}

export function buildTrace(data) {
  const { scores, labels } = data;
  const run = fit(scores, labels, data.start, data.learning_rate, data.epochs);
  const records = run.history.map((r) => ({ epoch: r.epoch, a: round6(r.a), b: round6(r.b), loss: round6(r.loss), grad_a: round6(r.gradA), grad_b: round6(r.gradB) }));
  const [finalLoss] = lossAndGradients(scores, labels, run.a, run.b);
  const stop = fit(scores, labels, data.start, data.learning_rate, data.epochs, data.tolerance);
  const last = stop.history[stop.history.length - 1];
  const beforeLast = stop.history[stop.history.length - 2];
  const probabilities = scores.map((score) => forward(score, run.a, run.b));
  return {
    learning_rate: data.learning_rate,
    epochs: data.epochs,
    records,
    fitted: { a: round6(run.a), b: round6(run.b), loss: round6(finalLoss) },
    printed: data.printed,
    calibrated: data.calibrated_scores.map((score) => ({ score, probability: round6(forward(score, run.a, run.b)) })),
    escalation: {
      threshold: data.threshold,
      raw: scores.filter((score) => score < data.threshold).length,
      calibrated: probabilities.filter((p) => p < data.threshold).length,
      probabilities: probabilities.map(round6),
    },
    early_stop: { tolerance: data.tolerance, stopped_at: last.epoch, a: round6(stop.a), b: round6(stop.b), loss: round6(last.loss),
      improvement: round6(beforeLast.loss - last.loss) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. The run plays as seven beats,
// each morphing the curve along the real per-epoch trace to the next shown
// epoch; the whole run is under half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the shipped identity line and its caption appear
const EPOCH_BEAT = 2.6;         // name the epoch, bend the curve, read the numbers
const MORPH_AT = 0.2;
const MORPH = 1.6;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.scores.length;
  const top = data.scores.map((score, index) => [score, data.labels[index]]).filter(([score]) => score >= 0.85);
  const topRight = top.filter(([, label]) => label === 1).length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} reviewed answers: the raw confidence on the horizontal axis, and whether the answer was right (top) or wrong (bottom).`,
    captionLate: `What shipped: the raw score was shown as the probability, so 0.9 meant 90 percent. Of the ${top.length} answers scored 0.85 or higher, ${topRight} were right: ${Math.round((100 * topRight) / top.length)} percent.` });
  t += INTRO;
  let previous = 1;
  for (const epoch of SHOWN_EPOCHS) {
    const record = trace.records[epoch - 1];
    let caption;
    if (epoch === 1) {
      const next = trace.records[1];
      caption = `Epoch 1: a = ${f4(record.a)}, b = ${f4(record.b)}, loss ${f4(record.loss)}. Mean gradients ${f4(record.grad_a)} and ${f4(record.grad_b)}: the update moves a to ${f4(next.a)} and b to ${f4(next.b)}.`;
    } else if (epoch === data.epochs) {
      caption = `Epoch ${epoch}: a = ${f4(record.a)}, b = ${f4(record.b)}, loss ${f4(record.loss)}; after its update a = ${f4(trace.fitted.a)}, b = ${f4(trace.fitted.b)}, loss ${f4(trace.fitted.loss)}. A raw 0.9 reads ${f3(forward(0.9, trace.fitted.a, trace.fitted.b))}.`;
    } else {
      caption = `Epoch ${epoch}: a = ${f4(record.a)}, b = ${f4(record.b)}, loss ${f4(record.loss)}. A raw 0.9 now reads ${f3(forward(0.9, record.a, record.b))}.`;
    }
    beats.push({ kind: 'epoch', start: t, duration: EPOCH_BEAT, epoch, from: previous, to: epoch === data.epochs ? data.epochs + 1 : epoch, caption });
    previous = epoch === data.epochs ? data.epochs + 1 : epoch;
    t += EPOCH_BEAT;
  }
  const cal = trace.calibrated.map((entry) => `${entry.score} reads ${f3(entry.probability)}`).join(', ');
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Calibrated: ${cal}. Below the ${trace.escalation.threshold} threshold, ${trace.escalation.calibrated} of the ${n} answers now escalate instead of ${trace.escalation.raw}.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: stop early once an epoch improves the loss by less than ${trace.early_stop.tolerance}.` });
  t += PRACTICE_INTRO;
  const stop = trace.early_stop;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Early stop at epoch ${stop.stopped_at}: the loss improved by ${stop.improvement.toFixed(6)}, under the tolerance. a = ${f4(stop.a)}, b = ${f4(stop.b)}, loss ${f4(stop.loss)}: a flatter curve than the full run.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The parameters at a fractional epoch, read off the real trace: epoch k is
// the state before the k-th update, and epochs + 1 is the fitted state.
function paramsAt(trace, f) {
  const sequence = [...trace.records.map((r) => ({ a: r.a, b: r.b, loss: r.loss })), { a: trace.fitted.a, b: trace.fitted.b, loss: trace.fitted.loss }];
  const index = Math.max(1, Math.min(sequence.length, f)) - 1;
  const i0 = Math.floor(index);
  const i1 = Math.min(sequence.length - 1, i0 + 1);
  const frac = index - i0;
  return { a: lerp(sequence[i0].a, sequence[i1].a, frac), b: lerp(sequence[i0].b, sequence[i1].b, frac), loss: lerp(sequence[i0].loss, sequence[i1].loss, frac), epoch: Math.min(trace.epochs, Math.round(f)), fitted: f >= sequence.length };
}

// The drawable state at `elapsed` seconds: the dots, the lines, the curve's
// parameters, the readout, the loss sparkline, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');

  const dots = data.scores.map((score, index) => ({ score, label: data.labels[index], alpha: beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.12, 0.4) : 1 }));
  const identityAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : (beatIndex === 1 ? 0.35 + 0.65 * (1 - ramp(local, 0, 0.8)) : 0.35);

  // The curve: absent in the intro, fading in at epoch 1, then morphing along the trace.
  let curve = null;
  let f = 1;
  if (beat.kind === 'epoch') {
    const progress = easeInOut(ramp(local, MORPH_AT, MORPH));
    f = beat.from + (beat.to - beat.from) * progress;
    const params = paramsAt(trace, f);
    curve = { ...params, alpha: beat.epoch === 1 ? ramp(local, 0.1, 0.7) : 1 };
  } else if (beatIndex > 1 || (beat.kind !== 'intro')) {
    f = trace.epochs + 1;
    curve = { ...paramsAt(trace, f), alpha: 1 };
  }
  const readout = curve ? { epoch: curve.fitted ? trace.epochs : curve.epoch, a: curve.a, b: curve.b, loss: curve.loss, fitted: curve.fitted } : null;

  const losses = trace.records.map((r) => r.loss);
  const upTo = curve ? Math.min(trace.epochs, Math.max(1, Math.floor(f))) : 0;
  const spark = { losses, upTo, min: Math.min(...losses, trace.fitted.loss), max: Math.max(...losses),
    stopAt: trace.early_stop.stopped_at, stopAlpha: beat.kind === 'practice' ? ramp(local, 0.2, 0.6) : (beatIndex > practiceBeat ? 1 : 0) };

  const thresholdAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const ticksAlpha = beat.kind === 'outro' ? ramp(local, 0.8, 0.8) : (beatIndex > outroBeat ? 1 : 0);
  const ticks = data.scores.map((score, index) => ({ score, probability: trace.escalation.probabilities[index], escalates: trace.escalation.probabilities[index] < trace.escalation.threshold }));
  let practiceCurve = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    practiceCurve = { a: trace.early_stop.a, b: trace.early_stop.b, alpha: beat.kind === 'practice' ? ramp(local, 0.4, 0.8) : 1 };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, dots, identityAlpha, curve, readout, spark, thresholdAlpha, ticksAlpha, ticks, practiceCurve,
    threshold: trace.escalation.threshold, learningRate: trace.learning_rate, epochs: trace.epochs, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const PX0 = 70, PX1 = 590, PY0 = 78, PY1 = 428;      // the plot: raw score across, probability up
const RX = 636, RW = 236;                           // the readout panel and sparkline column
const SX0 = RX, SX1 = RX + RW, SY0 = 268, SY1 = 408; // the sparkline box

const xOf = (score) => PX0 + score * (PX1 - PX0);
const yOf = (p) => PY1 - p * (PY1 - PY0);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function drawCurve(ctx, a, b, color, dashed, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let step = 0; step <= 60; step += 1) {
    const score = step / 60;
    const p = forward(score, a, b);
    if (step === 0) ctx.moveTo(xOf(score), yOf(p));
    else ctx.lineTo(xOf(score), yOf(p));
  }
  ctx.stroke();
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`fit p = sigmoid(a × score + b) by gradient descent: learning rate ${scene.learningRate}, ${scene.epochs} epochs`, 28, 36);

  // Axes and ticks.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PX0, PY0 - 6); ctx.lineTo(PX0, PY1); ctx.lineTo(PX1 + 6, PY1);
  ctx.stroke();
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.textAlign = 'center';
    ctx.fillText(v.toFixed(2), xOf(v), PY1 + 16);
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(2), PX0 - 8, yOf(v) + 4);
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(xOf(v), PY1); ctx.lineTo(xOf(v), PY1 + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PX0 - 4, yOf(v)); ctx.lineTo(PX0, yOf(v)); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillText('raw confidence score', (PX0 + PX1) / 2, PY1 + 34);
  ctx.save();
  ctx.translate(26, (PY0 + PY1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('probability the answer is right', 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  // The identity line that shipped and the escalation threshold.
  if (scene.identityAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.identityAlpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0)); ctx.lineTo(xOf(1), yOf(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('what shipped: p = score', xOf(0.56), yOf(0.6) - 10);
    ctx.restore();
  }
  if (scene.thresholdAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.thresholdAlpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(PX0, yOf(scene.threshold)); ctx.lineTo(PX1, yOf(scene.threshold)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`escalate below ${scene.threshold}`, PX0 + 6, yOf(scene.threshold) + 14);
    ctx.restore();
  }

  // The eight answers: right ones along the top, wrong ones along the bottom.
  scene.dots.forEach((dot, index) => {
    if (dot.alpha <= 0) return;
    ctx.globalAlpha = dot.alpha;
    ctx.fillStyle = dot.label === 1 ? GREEN : RED;
    ctx.beginPath(); ctx.arc(xOf(dot.score), yOf(dot.label), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    // Labels sit above every dot (clear of the axis ticks), staggered so neighbours never touch.
    ctx.fillText(dot.score.toFixed(2), xOf(dot.score), yOf(dot.label) - 12 - (index % 2 ? 12 : 0));
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;

  // The calibration curve, the practice curve, and the calibrated ticks.
  if (scene.practiceCurve) drawCurve(ctx, scene.practiceCurve.a, scene.practiceCurve.b, GREEN, true, scene.practiceCurve.alpha);
  if (scene.curve) drawCurve(ctx, scene.curve.a, scene.curve.b, BLUE, false, scene.curve.alpha);
  if (scene.ticksAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.ticksAlpha;
    for (const tick of scene.ticks) {
      ctx.fillStyle = tick.escalates ? AMBER : BLUE;
      ctx.beginPath(); ctx.arc(xOf(tick.score), yOf(tick.probability), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Readout panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, PY0, RW, 150, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, PY0, RW, 150, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('training loop readout', RX + 12, PY0 + 22);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  if (scene.readout) {
    const r = scene.readout;
    const lines = [r.fitted ? `after ${scene.epochs} epochs (fitted)` : `epoch ${r.epoch} of ${scene.epochs}`, `a = ${r.a.toFixed(4)}`, `b = ${r.b.toFixed(4)}`, `mean loss ${r.loss.toFixed(4)}`];
    lines.forEach((line, index) => ctx.fillText(line, RX + 12, PY0 + 48 + index * 24));
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText('not started: a = 1.0000, b = 0.0000', RX + 12, PY0 + 48);
  }

  // Loss sparkline.
  ctx.fillStyle = PANEL;
  rounded(ctx, SX0, SY0, RW, SY1 - SY0, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, SX0, SY0, RW, SY1 - SY0, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('mean loss per epoch', SX0 + 12, SY0 + 18);
  const { spark } = scene;
  const sx = (epoch) => SX0 + 46 + ((epoch - 1) / (spark.losses.length - 1)) * (RW - 60);   // room for the loss labels on the left
  const sy = (loss) => SY1 - 14 - ((loss - spark.min) / (spark.max - spark.min)) * (SY1 - SY0 - 44);
  ctx.fillText(spark.max.toFixed(2), SX0 + 12, sy(spark.max) + 4);
  ctx.fillText(spark.min.toFixed(2), SX0 + 12, sy(spark.min) + 4);
  if (spark.upTo > 0) {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let epoch = 1; epoch <= spark.upTo; epoch += 1) {
      const x = sx(epoch);
      const y = sy(spark.losses[epoch - 1]);
      if (epoch === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (spark.stopAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = spark.stopAlpha;
    const x = sx(spark.stopAt);
    ctx.strokeStyle = GREEN;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, SY0 + 26); ctx.lineTo(x, SY1 - 10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GREEN;
    ctx.fillText(`stop: epoch ${spark.stopAt}`, x + 6, SY0 + 36);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
