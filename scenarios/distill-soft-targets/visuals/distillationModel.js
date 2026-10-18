// The lesson's animation, without a DOM: the same softmax and losses as
// solution.py run on the same logits (python/fixtures/logits.json), recorded as
// a trace, laid out on a reading-pace timeline, and turned into a drawable
// scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// softmax from solution.py: scale, subtract the max, exponentiate, normalize.
export function softmax(logits, temperature) {
  if (temperature <= 0) throw new Error(`temperature must be positive, got ${temperature}`);
  const scaled = logits.map((value) => value / temperature);
  const largest = Math.max(...scaled);
  const exponentials = scaled.map((value) => Math.exp(value - largest));
  let total = 0;
  for (const value of exponentials) total += value;
  return exponentials.map((value) => value / total);
}

export function crossEntropy(targets, probabilities) {
  let total = 0.0;
  for (let index = 0; index < targets.length; index += 1) total -= targets[index] * Math.log(probabilities[index]);
  return total;
}

export function klDivergence(targets, probabilities) {
  let total = 0.0;
  for (let index = 0; index < targets.length; index += 1) total += targets[index] * Math.log(targets[index] / probabilities[index]);
  return total;
}

export const oneHot = (classes, label) => classes.map((name) => (name === label ? 1.0 : 0.0));
export const hardLoss = (classes, studentLogits, label) => crossEntropy(oneHot(classes, label), softmax(studentLogits, 1.0));
export const softLoss = (teacherLogits, studentLogits, temperature) =>
  klDivergence(softmax(teacherLogits, temperature), softmax(studentLogits, temperature)) * temperature ** 2;
export const distillationLoss = (classes, teacher, student, label, temperature, alpha) =>
  alpha * softLoss(teacher, student, temperature) + (1 - alpha) * hardLoss(classes, student, label);

const r6 = (value) => Number(value.toFixed(6));
const mean = (values) => { let total = 0; for (const value of values) total += value; return total / values.length; };

export function buildTrace(data) {
  const { classes, temperature, alpha } = data;
  const examples = data.labels.map((label, index) => {
    const teacher = data.teacher_logits[index];
    const student = data.student_logits[index];
    return {
      label,
      teacher_logits: teacher,
      student_logits: student,
      teacher_t1: softmax(teacher, 1.0).map(r6),
      teacher_t2: softmax(teacher, temperature).map(r6),
      student_t2: softmax(student, temperature).map(r6),
      soft_loss: r6(softLoss(teacher, student, temperature)),
      hard_loss: r6(hardLoss(classes, student, label)),
    };
  });
  const soft = data.labels.map((label, index) => softLoss(data.teacher_logits[index], data.student_logits[index], temperature));
  const hard = data.labels.map((label, index) => hardLoss(classes, data.student_logits[index], label));
  const blend = data.labels.map((label, index) => distillationLoss(classes, data.teacher_logits[index], data.student_logits[index], label, temperature, alpha));
  return {
    classes,
    temperature,
    examples,
    means: { soft: r6(mean(soft)), hard: r6(mean(hard)) },
    blend: { alpha, per_example: blend.map(r6), mean: r6(mean(blend)) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace, not a movie. Each example gets
// one eased morph and over a second to read its caption; the whole run is
// under half a minute. The slow motion setting stretches all of it.
const INTRO = 3;
const INTRO_LATE_AT = 1.5;      // when the caption turns to what shipped
const SHARPEN = 2.8;            // one example: its bars morph from the hard label to the teacher at T = 1
const SOFTEN = 3.2;             // all three soften to the distillation temperature
const STUDENT = 3.2;            // the student's outlined bars and both losses appear
const OUTRO = 3;
const PRACTICE_INTRO = 1;
const PRACTICE = 3.2;
const FINAL = 2;
const MORPH_AT = 0.2;           // sub-phases inside a beat
const MORPH = 0.9;

const f3 = (value) => value.toFixed(3);
const list3 = (values) => values.map(f3).join(', ');
const pretty = (value) => (Number.isInteger(value) ? `${value}` : `${value}`);

export function buildTimeline(trace, data) {
  const T = trace.temperature;
  const { examples, means, blend } = trace;
  const gold = (example) => trace.classes.indexOf(example.label);
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `Three tickets, four classes. A hard label is one full bar on the gold class; the teacher's logits say more than that.`,
    captionLate: `What shipped: hard labels only. For example 1, outage is 1 and every other class is 0: zero credit for a near miss.` });
  t += INTRO;
  examples.forEach((example, index) => {
    const largest = Math.max(...example.teacher_logits);
    beats.push({ kind: 'sharpen', start: t, duration: SHARPEN, example: index,
      caption: `Example ${index + 1}, gold ${example.label}. Teacher logits ${example.teacher_logits.map(pretty).join(', ')} at T = 1: subtract the largest (${pretty(largest)}), exponentiate, divide by the sum: ${list3(example.teacher_t1)}.` });
    t += SHARPEN;
  });
  const peaks = examples.map((example) => `${f3(Math.max(...example.teacher_t1))} to ${f3(Math.max(...example.teacher_t2))}`).join(', ');
  const third = examples[2];
  beats.push({ kind: 'soften', start: t, duration: SOFTEN,
    caption: `At T = ${pretty(T)} every logit is divided by ${pretty(T)} before the softmax. The peaks drop (${peaks}); example 3 now gives outage ${f3(third.teacher_t2[2])} next to access ${f3(third.teacher_t2[1])}. No top class changes.` });
  t += SOFTEN;
  beats.push({ kind: 'student', start: t, duration: STUDENT,
    caption: `The student at T = ${pretty(T)}, outlined. Soft loss per example, KL times T squared: ${list3(examples.map((example) => example.soft_loss))}. Hard loss at T = 1: ${list3(examples.map((example) => example.hard_loss))}.` });
  t += STUDENT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Mean soft loss ${f3(means.soft)}, mean hard loss ${f3(means.hard)}. Example 3: the hard target gives outage 0, the teacher gives it ${f3(third.teacher_t2[2])}, so the student's lean toward outage costs ${f3(third.soft_loss)} soft against ${f3(third.hard_loss)} hard: a near miss, not a miss.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: blend alpha times the soft loss with (1 - alpha) times the hard loss, so the student learns the gold label and the teacher's ranking.` });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `alpha ${pretty(blend.alpha)}: blended losses ${list3(blend.per_example)}, mean ${f3(blend.mean)}, between the soft mean ${f3(means.soft)} and the hard mean ${f3(means.hard)}.` });
  t += PRACTICE;
  beats.push({ kind: 'final', start: t, duration: FINAL,
    caption: `Four probabilities per example, two losses, two knobs: the temperature reveals the teacher's ranking, alpha decides how much of it the student follows.` });
  t += FINAL;
  void gold;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (a, b, p) => a + (b - a) * p;
const mix = (from, to, p) => from.map((value, index) => lerp(value, to[index], p));

export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const firstSharpen = kinds.indexOf('sharpen');
  const softenIndex = kinds.indexOf('soften');
  const studentIndex = kinds.indexOf('student');
  const outroIndex = kinds.indexOf('outro');
  const practiceIndex = kinds.indexOf('practice');
  const morph = easeInOut(ramp(local, MORPH_AT, MORPH));

  // The temperature label and value: 1 until the softening beat, then 2.
  let temperature = 1;
  if (beat.kind === 'soften') temperature = lerp(1, trace.temperature, morph);
  else if (beatIndex > softenIndex) temperature = trace.temperature;

  const panels = trace.examples.map((example, index) => {
    const hard = oneHot(trace.classes, example.label);
    let teacher = hard;
    let active = false;
    if (beat.kind === 'sharpen') {
      if (index < beat.example) teacher = example.teacher_t1;
      else if (index === beat.example) { teacher = mix(hard, example.teacher_t1, morph); active = true; }
    } else if (beat.kind === 'soften') {
      teacher = mix(example.teacher_t1, example.teacher_t2, morph);
      active = true;
    } else if (beatIndex > softenIndex) {
      teacher = example.teacher_t2;
    } else if (beatIndex > firstSharpen) {
      teacher = example.teacher_t1;
    }
    let student = null;
    let studentAlpha = 0;
    if (beat.kind === 'student') { student = example.student_t2.map((value) => value * morph); studentAlpha = ramp(local, MORPH_AT, MORPH); active = true; }
    else if (beatIndex > studentIndex) { student = example.student_t2; studentAlpha = 1; }
    const lossAlpha = beat.kind === 'student' ? ramp(local, MORPH_AT + MORPH, 0.6) : (beatIndex > studentIndex ? 1 : 0);
    const blendAlpha = beat.kind === 'practice' ? ramp(local, MORPH_AT, 0.8) : (beatIndex > practiceIndex ? 1 : 0);
    const alpha = beat.kind === 'intro' ? ramp(local, 0.15 + index * 0.3, 0.4) : 1;
    return {
      index, label: example.label, goldIndex: trace.classes.indexOf(example.label),
      teacher, student, studentAlpha, active, alpha,
      losses: { soft: example.soft_loss, hard: example.hard_loss, blended: trace.blend.per_example[index], lossAlpha, blendAlpha },
      spotlight: beat.kind === 'outro' && index === 2,
    };
  });

  const alphaLabel = beatIndex >= practiceIndex ? `alpha = ${pretty(trace.blend.alpha)}` : null;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, panels, temperature, classes: trace.classes, alphaLabel,
    shippedNote: beat.kind === 'intro' && local >= INTRO_LATE_AT, means: trace.means, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const PX = 28, PY = 76, PW = 600, PH = 118, PGAP = 10;     // the three example panels
const NAME_X = 40, BAR_X = 118, BAR_W = 380, ROW_H = 23, ROWS_Y = 26;
const TEACHER_H = 9, STUDENT_H = 6;
const RX = 652, RW = 220;                                  // the loss readouts

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function panelRect(index) { return { x: PX, y: PY + index * (PH + PGAP), w: PW, h: PH }; }

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('temperature softmax: the teacher\'s logits become targets for the student', PX, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('teacher probability per class (filled), student (outlined), gold class in green', PX, 60);

  // The temperature readout, top right, and the blend weight once the practice runs.
  ctx.textAlign = 'right';
  ctx.font = `bold 14px ${MONO}`;
  ctx.fillStyle = AMBER;
  ctx.fillText(`T = ${scene.temperature.toFixed(2).replace(/\.?0+$/, '')}`, W - PX, 36);
  if (scene.alphaLabel) {
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = GREEN;
    ctx.fillText(scene.alphaLabel, W - PX, 60);
  }
  ctx.textAlign = 'left';

  scene.panels.forEach((panel) => {
    if (panel.alpha <= 0) return;
    const r = panelRect(panel.index);
    ctx.globalAlpha = panel.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = panel.spotlight ? RED : panel.active ? BLUE : LINE;
    ctx.lineWidth = panel.spotlight || panel.active ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `bold 11px ${MONO}`;
    ctx.fillText(`example ${panel.index + 1}`, r.x + 12, r.y + 17);
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`gold ${panel.label}`, r.x + 96, r.y + 17);

    scene.classes.forEach((name, row) => {
      const y = r.y + ROWS_Y + row * ROW_H;
      const gold = row === panel.goldIndex;
      ctx.fillStyle = gold ? GREEN : DIM;
      ctx.font = `${gold ? 'bold ' : ''}10.5px ${MONO}`;
      ctx.fillText(name, r.x + NAME_X - 28, y + 9);
      // The track, the teacher's bar, then the student's outline beneath it.
      ctx.fillStyle = BG;
      ctx.globalAlpha = panel.alpha * 0.6;
      rounded(ctx, r.x + BAR_X, y, BAR_W, TEACHER_H + STUDENT_H + 3, 2); ctx.fill();
      ctx.globalAlpha = panel.alpha;
      ctx.fillStyle = gold ? GREEN : BLUE;
      ctx.globalAlpha = panel.alpha * 0.75;
      rounded(ctx, r.x + BAR_X, y, BAR_W * panel.teacher[row], TEACHER_H, 2); ctx.fill();
      ctx.globalAlpha = panel.alpha;
      ctx.fillStyle = INK;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText(panel.teacher[row].toFixed(3), r.x + BAR_X + BAR_W + 8, y + 9);
      if (panel.student && panel.studentAlpha > 0) {
        ctx.globalAlpha = panel.alpha * panel.studentAlpha;
        ctx.strokeStyle = INK;
        rounded(ctx, r.x + BAR_X + 0.5, y + TEACHER_H + 2.5, Math.max(0, BAR_W * panel.student[row] - 1), STUDENT_H, 1.5); ctx.stroke();
        ctx.fillStyle = DIM;
        ctx.font = `9.5px ${MONO}`;
        ctx.fillText(panel.student[row].toFixed(3), r.x + BAR_X + BAR_W + 58, y + 9);
        ctx.globalAlpha = panel.alpha;
      }
    });

    // Loss readouts to the right of the panel.
    const { losses } = panel;
    if (losses.lossAlpha > 0) {
      ctx.globalAlpha = panel.alpha * losses.lossAlpha;
      ctx.fillStyle = INK;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(`soft loss  ${losses.soft.toFixed(3)}`, RX, r.y + 34);
      ctx.fillStyle = panel.spotlight ? RED : INK;
      ctx.fillText(`hard loss  ${losses.hard.toFixed(3)}`, RX, r.y + 56);
      ctx.globalAlpha = panel.alpha;
    }
    if (losses.blendAlpha > 0) {
      ctx.globalAlpha = panel.alpha * losses.blendAlpha;
      ctx.fillStyle = GREEN;
      ctx.font = `bold 11px ${MONO}`;
      ctx.fillText(`blended    ${losses.blended.toFixed(3)}`, RX, r.y + 82);
      ctx.globalAlpha = panel.alpha;
    }
  });
  ctx.globalAlpha = 1;

  // The what-shipped note during the intro, and the means after the outro.
  if (scene.shippedNote) {
    ctx.fillStyle = RED;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('what shipped: hard labels only', RX, PY + 34);
    ctx.fillStyle = DIM;
    ctx.fillText('near miss, far miss: the same score', RX, PY + 52);
  }
  if (scene.beatIndex >= 0 && scene.panels[0].losses.lossAlpha >= 1 && scene.beat !== 'student') {
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`means: soft ${scene.means.soft.toFixed(3)}, hard ${scene.means.hard.toFixed(3)}`, RX, H - 30);
  }
  void RW;
}
