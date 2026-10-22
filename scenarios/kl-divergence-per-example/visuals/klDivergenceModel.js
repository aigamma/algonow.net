// The lesson's animation, without a DOM: the same divergence arithmetic as
// solution.py (and the practice answer's Jensen-Shannon variant), run on the
// same four examples (python/fixtures/examples.json), recorded as a trace,
// laid out on a reading-pace timeline, and turned into a drawable scene for
// any moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f4 = (x) => x.toFixed(4);
const signed4 = (x) => (x < 0 ? '' : '+') + x.toFixed(4);
const lerp = (from, to, p) => from + (to - from) * p;

// check_distribution, kl_terms, kl_divergence, top_route, rank_by_divergence,
// and agreement from solution.py; js_divergence from practice_answer.py.
export function checkDistribution(probs, tolerance) {
  let total = 0.0;
  for (const p of probs) {
    if (p < 0) throw new Error(`distribution has a negative entry`);
    total += p;
  }
  if (Math.abs(total - 1.0) > tolerance) throw new Error(`distribution sums to ${total}, not 1`);
}
export function klTerms(teacher, student, tolerance, floor) {
  checkDistribution(teacher, tolerance);
  checkDistribution(student, tolerance);
  if (teacher.length !== student.length) throw new Error('zip() arguments differ in length');
  const terms = [];
  for (let index = 0; index < teacher.length; index += 1) {
    const p = teacher[index];
    if (p === 0) { terms.push(0.0); continue; }
    const q = Math.max(student[index], floor);
    terms.push(p * Math.log(p / q));
  }
  return terms;
}
export function klDivergence(teacher, student, tolerance, floor) {
  let total = 0.0;
  for (const term of klTerms(teacher, student, tolerance, floor)) total += term;
  return total;
}
export function jsDivergence(teacher, student, tolerance, floor) {
  const midpoint = [];
  for (let index = 0; index < teacher.length; index += 1) midpoint.push((teacher[index] + student[index]) / 2);
  return 0.5 * klDivergence(teacher, midpoint, tolerance, floor) + 0.5 * klDivergence(student, midpoint, tolerance, floor);
}
export function topRoute(probs) {
  let best = 0;
  for (let index = 1; index < probs.length; index += 1) if (probs[index] > probs[best]) best = index;
  return best;
}
const worstFirst = (a, b) => (b[0] - a[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
export function rankByDivergence(examples, tolerance, floor) {
  return examples.map((example) => [klDivergence(example.teacher, example.student, tolerance, floor), example.id]).sort(worstFirst);
}
export function agreement(examples) {
  let agreed = 0;
  for (const example of examples) if (topRoute(example.teacher) === topRoute(example.student)) agreed += 1;
  return agreed;
}

export function buildTrace(data) {
  const { tolerance, floor } = data;
  const rows = data.examples.map((example) => ({
    id: example.id,
    teacher: example.teacher,
    student: example.student,
    terms: klTerms(example.teacher, example.student, tolerance, floor).map(round6),
    kl: round6(klDivergence(example.teacher, example.student, tolerance, floor)),
    js: round6(jsDivergence(example.teacher, example.student, tolerance, floor)),
    teacher_top: topRoute(example.teacher),
    student_top: topRoute(example.student),
  }));
  let total = 0.0;
  for (const example of data.examples) total += klDivergence(example.teacher, example.student, tolerance, floor);
  const jsRanked = data.examples.map((example) => [jsDivergence(example.teacher, example.student, tolerance, floor), example.id]).sort(worstFirst);
  return {
    routes: data.routes,
    rows,
    mean_kl: round6(total / data.examples.length),
    ranked: rankByDivergence(data.examples, tolerance, floor).map(([kl, id]) => [round6(kl), id]),
    ranked_js: jsRanked.map(([js, id]) => [round6(js), id]),
    agreement: agreement(data.examples),
    threshold: data.threshold,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. One beat per example computes
// its three terms and its divergence; a ranking beat reorders the examples
// worst first; the whole run is under half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const EXAMPLE_BEAT = 3.0;
const RANK_BEAT = 3.0;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;
const TERMS_AT = 0.2;           // sub-phases inside an example beat
const TERMS = 1.2;
const KL_AT = 1.5;
const MOVE_GAP = 0.5;           // the ranking moves start one after another
const MOVE = 0.6;

function exampleCaption(row, routes, data) {
  const parts = routes.map((route, index) => `${route} ${signed4(row.terms[index])}`).join(', ');
  const base = `${row.id}: p times the log of p over q per route: ${parts}; KL ${f4(row.kl)}.`;
  const teacherTop = routes[row.teacher_top];
  const bigIndex = row.terms.indexOf(Math.max(...row.terms));
  const note = row.kl >= data.threshold
    ? ` The teacher puts ${row.teacher[bigIndex]} on ${routes[bigIndex]} and the student only ${row.student[bigIndex]}: that one term drives the sum.`
    : ` Both pick ${teacherTop}; the largest term, ${routes[bigIndex]} ${signed4(row.terms[bigIndex])}, comes from ${row.teacher[bigIndex]} against ${row.student[bigIndex]}.`;
  return base + note;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = trace.rows.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} examples, ${trace.routes.length} routes. For each, the teacher's probabilities (blue, filled) and the student's (amber, outlined), route by route.`,
    captionLate: `What shipped: top-route agreement. The student picks the same route as the teacher on every example: ${trace.agreement} of ${n}, ${Math.round((100 * trace.agreement) / n)} percent.` });
  t += INTRO;
  trace.rows.forEach((row, index) => {
    beats.push({ kind: 'example', start: t, duration: EXAMPLE_BEAT, index, caption: exampleCaption(row, trace.routes, data) });
    t += EXAMPLE_BEAT;
  });
  const rankedText = trace.ranked.map(([kl, id]) => `${id} ${f4(kl)}`).join(', ');
  const above = trace.ranked.filter(([kl]) => kl >= trace.threshold).map(([, id]) => id);
  beats.push({ kind: 'rank', start: t, duration: RANK_BEAT,
    caption: `Ranked worst first: ${rankedText}. Only ${above.join(' and ')} crosses the ${trace.threshold} line. Mean KL ${f4(trace.mean_kl)}.` });
  t += RANK_BEAT;
  const worst = trace.rows.find((row) => row.id === trace.ranked[0][1]);
  const worstRoute = trace.routes[worst.teacher_top];
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Top-route agreement said ${trace.agreement} of ${n}. The divergence says ${worst.id} is the example to look at: the student gives ${worstRoute} ${worst.student[worst.teacher_top]} where the teacher gives ${worst.teacher[worst.teacher_top]}, and any rule that reads the probability, not just the top route, treats them differently.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: the Jensen-Shannon divergence, half the KL from each side to their midpoint, so it reads the same both ways.' });
  t += PRACTICE_INTRO;
  const jsText = trace.ranked_js.map(([js, id]) => `${id} ${f4(js)}`).join(', ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `JS: ${jsText}. The same order as KL, smaller numbers, and the same value whichever side goes first.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: the four rows with their bars, term
// bars, and divergence readouts; the ranking panel with slot positions; the
// summary lines; and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const rankBeat = kinds.indexOf('rank');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const exampleBeatOf = (index) => kinds.indexOf('example') + index;

  const rows = trace.rows.map((row, index) => {
    const myBeat = exampleBeatOf(index);
    const alpha = beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.25, 0.5) : 1;
    let termsProgress = 0;
    let klAlpha = 0;
    if (beatIndex > myBeat) { termsProgress = 1; klAlpha = 1; }
    else if (beatIndex === myBeat) { termsProgress = easeInOut(ramp(local, TERMS_AT, TERMS)); klAlpha = ramp(local, KL_AT, 0.5); }
    return { id: row.id, teacher: row.teacher, student: row.student, terms: row.terms, kl: row.kl, js: row.js,
      teacherTop: row.teacher_top, studentTop: row.student_top, alpha, highlight: beatIndex === myBeat, termsProgress, klAlpha };
  });

  // Ranking panel: a slot per example, in input order until the rank beat moves
  // them worst first, one move after another.
  const inputOrder = trace.rows.map((row) => row.id);
  const rankedOrder = trace.ranked.map(([, id]) => id);
  const slots = {};
  trace.rows.forEach((row, index) => {
    const from = index;
    const to = rankedOrder.indexOf(row.id);
    let position = from;
    if (beatIndex > rankBeat) position = to;
    else if (beatIndex === rankBeat) {
      const moveIndex = rankedOrder.indexOf(row.id);     // the k-th ranked example makes the k-th move
      position = lerp(from, to, easeInOut(ramp(local, moveIndex * MOVE_GAP, MOVE)));
    }
    const myBeat = exampleBeatOf(index);
    const alpha = beatIndex > myBeat ? 1 : (beatIndex === myBeat ? ramp(local, KL_AT, 0.5) : 0);
    slots[row.id] = { position, alpha, kl: row.kl, js: row.js };
  });
  const thresholdAlpha = beat.kind === 'rank' ? ramp(local, 0.2, 0.6) : (beatIndex > rankBeat ? 1 : 0);
  const meanAlpha = beat.kind === 'rank' ? ramp(local, 2.0, 0.6) : (beatIndex > rankBeat ? 1 : 0);
  const agreementAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : 1;
  const outroAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const jsAlpha = beat.kind === 'practice' ? ramp(local, 0.3, 0.8) : (beatIndex > practiceBeat ? 1 : 0);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, slots, inputOrder, rankedOrder, thresholdAlpha, meanAlpha, agreementAlpha, outroAlpha, jsAlpha,
    threshold: trace.threshold, meanKl: trace.mean_kl, agreement: trace.agreement, routes: trace.routes, worstId: rankedOrder[0], finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const ROW_X = 28, ROW_W = 548, ROW_Y0 = 70, ROW_H = 92;     // the four example rows
const BAR_X = 128, BAR_W = 140;                              // probability bars, 0 to 1
const AXIS_X = 356, TERM_SCALE = 190;                        // signed term bars, pixels per unit
const PX = 604, PW = 268;                                    // the ranking panel
const SLOT_Y0 = 112, SLOT_H = 44, KL_BAR_X = PX + 48, KL_BAR_W = 150, KL_MAX = 0.25;

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
  ctx.fillText('KL divergence from the teacher to the student, one example at a time', 28, 36);
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('teacher (blue, filled) and student (amber, outlined) per route; term = p × log(p / q)', 28, 54);

  // The four example rows.
  scene.rows.forEach((row, index) => {
    if (row.alpha <= 0) return;
    const top = ROW_Y0 + index * ROW_H;
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = row.highlight ? '#243052' : PANEL;
    rounded(ctx, ROW_X, top, ROW_W, ROW_H - 8, 6); ctx.fill();
    ctx.strokeStyle = row.highlight ? BLUE : LINE;
    rounded(ctx, ROW_X, top, ROW_W, ROW_H - 8, 6); ctx.stroke();
    ctx.font = `bold 12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(row.id, ROW_X + 10, top + 20);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText(`top route: ${scene.routes[row.teacherTop]} / ${scene.routes[row.studentTop]}`, ROW_X + 56, top + 77);
    scene.routes.forEach((route, r) => {
      const y = top + 14 + r * 20;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillStyle = r === row.teacherTop ? INK : DIM;
      ctx.fillText(route, ROW_X + 56, y + 4);
      // teacher filled, student outlined, both on the same 0 to 1 scale
      ctx.fillStyle = BLUE;
      ctx.fillRect(BAR_X, y - 6, BAR_W * row.teacher[r], 6);
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1;
      ctx.strokeRect(BAR_X + 0.5, y + 1.5, Math.max(1, BAR_W * row.student[r]), 5);
      ctx.fillStyle = DIM;
      ctx.font = `9.5px ${MONO}`;
      ctx.fillText(`${row.teacher[r]} / ${row.student[r]}`, BAR_X + BAR_W + 6, y + 3);
      // the signed term bar, growing during the example's beat
      if (row.termsProgress > 0) {
        const value = row.terms[r] * row.termsProgress;
        const width = value * TERM_SCALE;
        ctx.fillStyle = value >= 0 ? BLUE : DIM;   // a negative term is not a rejection: dim ink, not red
        if (width >= 0) ctx.fillRect(AXIS_X, y - 5, width, 8);
        else ctx.fillRect(AXIS_X + width, y - 5, -width, 8);
        ctx.fillStyle = INK;
        ctx.font = `10px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.fillText(signed4(value), AXIS_X + 118, y + 3);
        ctx.textAlign = 'left';
      }
    });
    // the term axis
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(AXIS_X, top + 4); ctx.lineTo(AXIS_X, top + 64); ctx.stroke();
    if (row.klAlpha > 0) {
      ctx.globalAlpha = row.alpha * row.klAlpha;
      ctx.font = `bold 12px ${MONO}`;
      ctx.fillStyle = row.kl >= scene.threshold ? AMBER : INK;
      ctx.fillText(`KL ${f4(row.kl)}`, AXIS_X + 128, top + 30);
      if (scene.jsAlpha > 0) {
        ctx.globalAlpha = row.alpha * scene.jsAlpha;
        ctx.font = `11px ${MONO}`;
        ctx.fillStyle = GREEN;
        ctx.fillText(`JS ${f4(row.js)}`, AXIS_X + 128, top + 50);
      }
    }
    ctx.globalAlpha = 1;
  });

  // The ranking panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, PX, 70, PW, 300, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, PX, 70, PW, 300, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('divergence per example', PX + 12, 88);
  const klX = (value) => KL_BAR_X + (Math.min(value, KL_MAX) / KL_MAX) * KL_BAR_W;
  if (scene.thresholdAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.thresholdAlpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(klX(scene.threshold), SLOT_Y0 - 4); ctx.lineTo(klX(scene.threshold), SLOT_Y0 + 4 * SLOT_H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`${scene.threshold}`, klX(scene.threshold) - 8, SLOT_Y0 - 8);
    ctx.restore();
  }
  for (const id of scene.inputOrder) {
    const slot = scene.slots[id];
    if (slot.alpha <= 0) continue;
    const y = SLOT_Y0 + slot.position * SLOT_H;
    ctx.globalAlpha = slot.alpha;
    ctx.font = `bold 11px ${MONO}`;
    ctx.fillStyle = id === scene.worstId && scene.thresholdAlpha > 0 ? AMBER : INK;
    ctx.fillText(id, PX + 14, y + 16);
    ctx.fillStyle = slot.kl >= scene.threshold ? AMBER : BLUE;
    ctx.fillRect(KL_BAR_X, y + 7, klX(slot.kl) - KL_BAR_X, 10);
    ctx.font = `10.5px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(f4(slot.kl), KL_BAR_X + KL_BAR_W + 8, y + 16);
    if (scene.jsAlpha > 0) {
      ctx.globalAlpha = slot.alpha * scene.jsAlpha;
      ctx.fillStyle = GREEN;
      ctx.fillRect(KL_BAR_X, y + 21, (Math.min(slot.js, KL_MAX) / KL_MAX) * KL_BAR_W, 5);
      ctx.font = `9.5px ${MONO}`;
      ctx.fillText(`JS ${f4(slot.js)}`, KL_BAR_X + KL_BAR_W + 8, y + 28);
    }
    ctx.globalAlpha = 1;
  }
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('0', KL_BAR_X, SLOT_Y0 + 4 * SLOT_H + 14);
  ctx.fillText(`${KL_MAX}`, KL_BAR_X + KL_BAR_W - 14, SLOT_Y0 + 4 * SLOT_H + 14);
  if (scene.meanAlpha > 0) {
    ctx.globalAlpha = scene.meanAlpha;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(`mean KL ${f4(scene.meanKl)}`, PX + 12, 334);
    ctx.globalAlpha = 1;
  }
  if (scene.agreementAlpha > 0) {
    ctx.globalAlpha = scene.agreementAlpha;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = AMBER;
    ctx.fillText(`what shipped: top-route agreement ${scene.agreement} of ${scene.rows.length}`, PX + 12, 354);
    ctx.globalAlpha = 1;
  }

  // The verdict panel below the ranking.
  if (scene.outroAlpha > 0) {
    ctx.globalAlpha = scene.outroAlpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, PX, 384, PW, 56, 6); ctx.fill();
    ctx.strokeStyle = AMBER;
    rounded(ctx, PX, 384, PW, 56, 6); ctx.stroke();
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    const worst = scene.rows.find((row) => row.id === scene.worstId);
    ctx.fillText(`${worst.id} crosses ${scene.threshold}: look at it first`, PX + 12, 406);
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`${scene.routes[worst.teacherTop]}: teacher ${worst.teacher[worst.teacherTop]}, student ${worst.student[worst.teacherTop]}`, PX + 12, 426);
    ctx.globalAlpha = 1;
  }
}
