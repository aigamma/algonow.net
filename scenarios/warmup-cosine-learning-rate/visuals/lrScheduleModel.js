// The lesson's animation, without a DOM: the same schedule function as
// solution.py (and the practice answer's hold variant) evaluated on the same
// parameters (python/fixtures/schedule.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment. Tests
// compare the trace with python/fixtures/expected-trace.json, which the Python
// suite derives from the real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

const round12 = (x) => Number(x.toFixed(12));

// learning_rate from solution.py.
export function learningRate(step, totalSteps, warmupSteps, peak) {
  if (warmupSteps >= totalSteps) throw new Error(`warmup of ${warmupSteps} steps leaves no steps for the decay in ${totalSteps}`);
  if (step < 0 || step > totalSteps) throw new Error(`step ${step} is outside 0 to ${totalSteps}`);
  if (step < warmupSteps) return peak * step / warmupSteps;
  const progress = (step - warmupSteps) / (totalSteps - warmupSteps);
  return peak * 0.5 * (1 + Math.cos(Math.PI * progress));
}

// learning_rate from practice_answer.py: a hold at the peak before the decay.
export function learningRateWithHold(step, totalSteps, warmupSteps, holdSteps, peak) {
  if (warmupSteps + holdSteps >= totalSteps) throw new Error('warmup and hold leave no steps for the decay');
  if (step < 0 || step > totalSteps) throw new Error(`step ${step} is outside 0 to ${totalSteps}`);
  if (step < warmupSteps) return peak * step / warmupSteps;
  if (step < warmupSteps + holdSteps) return peak;
  const progress = (step - warmupSteps - holdSteps) / (totalSteps - warmupSteps - holdSteps);
  return peak * 0.5 * (1 + Math.cos(Math.PI * progress));
}

export function buildTrace(data) {
  const { total_steps: total, warmup_steps: warmup, hold_steps: hold, peak } = data;
  const raw = [];
  for (let step = 0; step <= total; step += 1) raw.push(learningRate(step, total, warmup, peak));
  const rates = raw.map(round12);
  const printed = [];
  for (let step = 0; step <= total; step += 1) if (step % 10 === 0 || step === 5) printed.push({ step, rate: rates[step] });
  const holdRates = [];
  for (let step = 0; step <= total; step += 1) holdRates.push(round12(learningRateWithHold(step, total, warmup, hold, peak)));
  const midpoint = warmup + Math.floor((total - warmup) / 2);
  const holdMidpoint = warmup + hold + Math.floor((total - warmup - hold) / 2);
  let sum = 0;
  for (const rate of raw) sum += rate;
  return {
    total_steps: total, warmup_steps: warmup, peak,
    rates, printed,
    phases: [{ name: 'warmup', from: 0, to: warmup }, { name: 'decay', from: warmup, to: total }],
    midpoint: { step: midpoint, rate: rates[midpoint] },
    step_one: { schedule: rates[1], constant: peak },
    sums: { schedule: round12(sum), constant: round12(peak * (total + 1)) },
    hold: {
      hold_steps: hold, rates: holdRates,
      phases: [{ name: 'warmup', from: 0, to: warmup }, { name: 'hold', from: warmup, to: warmup + hold }, { name: 'decay', from: warmup + hold, to: total }],
      midpoint: { step: holdMidpoint, rate: holdRates[holdMidpoint] },
    },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. The warmup rises as one beat,
// the decay as four spans, each with time to read its numbers; the whole run
// is under half a minute. The slow motion setting stretches it.
const INTRO = 3;
const INTRO_SHIPPED_AT = 1.4;   // when the constant rate that shipped appears, with its caption
const WARMUP = 3.2;
const SPAN = 2.8;               // one decay span
const OUTRO = 3;
const PRACTICE_INTRO = 1;
const PRACTICE = 3;
const FINAL = 2.5;

export const sci = (x) => {
  if (x === 0) return '0.00e+00';
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  let mantissa = x / 10 ** exponent;
  let e = exponent;
  if (Number(mantissa.toFixed(2)) >= 10) { mantissa /= 10; e += 1; }
  const sign = e < 0 ? '-' : '+';
  return `${mantissa.toFixed(2)}e${sign}${String(Math.abs(e)).padStart(2, '0')}`;
};
const pct = (rate, peak) => `${Math.round((rate / peak) * 100)}%`;

export function buildTimeline(trace, data) {
  const { total_steps: total, warmup_steps: warmup, peak } = trace;
  const hold = trace.hold.hold_steps;
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `One schedule for ${total} steps: a peak of ${sci(peak)}, ${warmup} warmup steps, then a cosine decay to zero.`,
    captionLate: `What shipped: the full rate ${sci(peak)} from step 1 on fresh adapter weights, and the loss spiked within twenty steps.` });
  t += INTRO;
  beats.push({ kind: 'warmup', start: t, duration: WARMUP, from: 0, to: warmup,
    caption: `Warmup, steps 0 to ${warmup}: the rate climbs in a straight line, peak × step / ${warmup}. Step 5 is ${sci(trace.rates[5])}, half the peak.` });
  t += WARMUP;
  const spans = [[warmup, 30], [30, trace.midpoint.step], [trace.midpoint.step, 80], [80, total]];
  spans.forEach(([from, to]) => {
    const progress = (to - warmup) / (total - warmup);
    let caption;
    if (to === trace.midpoint.step) {
      caption = `Decay, steps ${from} to ${to}: progress = (step - ${warmup}) / ${total - warmup}. Step ${to} is the midpoint: progress 0.5, cos = 0, rate ${sci(trace.rates[to])}, exactly half the peak.`;
    } else if (to === total) {
      caption = `Decay, steps ${from} to ${to}: at step ${to} progress is 1 and cos(π) is -1, so the rate lands at ${sci(trace.rates[to])}. Step ${total - 1} was ${sci(trace.rates[total - 1])}.`;
    } else {
      caption = `Decay, steps ${from} to ${to}: progress = (step - ${warmup}) / ${total - warmup}. At step ${to} progress is ${progress.toFixed(3)} and the rate is ${sci(trace.rates[to])} (${pct(trace.rates[to], peak)} of the peak).`;
    }
    beats.push({ kind: 'decay', start: t, duration: SPAN, from, to, caption });
    t += SPAN;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Step 1 gets ${sci(trace.step_one.schedule)}, one tenth of what shipped (${sci(trace.step_one.constant)}). Over ${total + 1} steps the schedule sums to ${(trace.sums.schedule / peak).toFixed(1)} × peak against ${(trace.sums.constant / peak).toFixed(0)} × peak for the constant rate.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: hold the peak for ${hold} steps after warmup, then decay over the remaining ${total - warmup - hold}.` });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Hold, steps ${warmup} to ${warmup + hold} at ${sci(peak)}; the decay now runs ${warmup + hold} to ${total} and its midpoint moves to step ${trace.hold.midpoint.step} (${sci(trace.hold.midpoint.rate)}).` });
  t += PRACTICE;
  beats.push({ kind: 'final', start: t, duration: FINAL,
    caption: 'Three phases, one pure function of the step: printable, testable, and resumable before a GPU minute is spent.' });
  t += FINAL;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (a, b, p) => a + (b - a) * p;

// The drawable state at `elapsed` seconds: one bar per step (its height as a
// fraction of the peak, its phase), the cursor step, the readout, the ghost of
// the constant rate that shipped, and how far the practice hold has taken over.
export function sceneAt(timeline, trace, data, elapsed) {
  const { total_steps: total, warmup_steps: warmup, peak } = trace;
  const hold = trace.hold.hold_steps;
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;

  const phaseOf = (step) => (step < warmup ? 'warmup' : 'decay');
  const holdPhaseOf = (step) => (step < warmup ? 'warmup' : step < warmup + hold ? 'hold' : 'decay');
  const bars = [];
  for (let step = 0; step <= total; step += 1) bars.push({ step, value: 0, phase: phaseOf(step), grown: 0 });

  // A bar grows during the beat that covers its step; earlier beats are complete.
  let cursor = null;
  const growIn = (b, step, index, count, duration) => {
    const startAt = 0.15 + (index / count) * (duration - 0.9);
    const grown = easeInOut(ramp(local, startAt, 0.45));
    b.grown = grown;
    b.value = (trace.rates[step] / peak) * grown;
    if (local >= startAt && (cursor === null || step > cursor)) cursor = step;
  };
  timeline.beats.forEach((done, index) => {
    if (done.kind !== 'warmup' && done.kind !== 'decay') return;
    const first = done.kind === 'warmup' ? done.from : done.from + 1;
    const steps = [];
    for (let step = first; step <= done.to; step += 1) steps.push(step);
    steps.forEach((step, position) => {
      const b = bars[step];
      if (index < beatIndex) { b.grown = 1; b.value = trace.rates[step] / peak; }
      else if (index === beatIndex) growIn(b, step, position, steps.length, done.duration);
    });
  });
  if (beatIndex > timeline.beats.findIndex((b) => b.kind === 'decay' && b.to === total)) cursor = total;
  if (beat.kind === 'intro') cursor = null;

  // The practice hold: bars move from the worked schedule to the hold schedule.
  const practiceIndex = timeline.beats.findIndex((b) => b.kind === 'practice');
  let holdProgress = 0;
  if (beatIndex === practiceIndex) holdProgress = easeInOut(ramp(local, 0.2, PRACTICE - 0.9));
  else if (beatIndex > practiceIndex) holdProgress = 1;
  if (holdProgress > 0) {
    bars.forEach((b) => {
      b.value = lerp(trace.rates[b.step] / peak, trace.hold.rates[b.step] / peak, holdProgress);
      if (holdPhaseOf(b.step) === 'hold') b.phase = holdProgress >= 0.5 ? 'hold' : b.phase;
      else b.phase = holdPhaseOf(b.step);
    });
    cursor = holdProgress >= 1 ? total : warmup + Math.round(hold * holdProgress);
  }

  let shipped = 0;
  if (beat.kind === 'intro') shipped = ramp(local, INTRO_SHIPPED_AT, 0.5);
  else if (beatIndex === 1) shipped = 1 - ramp(local, 0, 0.6);

  // The readout follows the cursor.
  let readout = null;
  if (cursor !== null) {
    const inHold = holdProgress >= 0.5;
    const phase = inHold ? holdPhaseOf(cursor) : phaseOf(cursor);
    const rate = inHold ? trace.hold.rates[cursor] : trace.rates[cursor];
    let formula;
    if (phase === 'warmup') formula = `peak × ${cursor} / ${warmup}`;
    else if (phase === 'hold') formula = 'peak';
    else if (inHold) formula = `peak × 0.5 × (1 + cos(π × ${cursor - warmup - hold} / ${total - warmup - hold}))`;
    else formula = `peak × 0.5 × (1 + cos(π × ${cursor - warmup} / ${total - warmup}))`;
    readout = { step: cursor, phase, rate, percent: pct(rate, peak), formula };
  }

  const midpoint = holdProgress >= 0.5 ? trace.hold.midpoint : trace.midpoint;
  const showMidpoint = beatIndex > timeline.beats.findIndex((b) => b.kind === 'decay' && b.to === trace.midpoint.step) || holdProgress > 0;
  const caption = beat.kind === 'intro' && local >= INTRO_SHIPPED_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, bars, cursor, readout, shipped, holdProgress, midpoint, showMidpoint,
    total, warmup, hold, peak, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const AX0 = 60, AX1 = 640, BASE_Y = 400, PEAK_Y = 110;     // the step axis and the rate axis
const RX = 680, RW = 192;                                 // the readout panel
const xOf = (step, total) => AX0 + ((AX1 - AX0) * step) / total;
const PHASE_COLOR = { warmup: BLUE, decay: AMBER, hold: GREEN };

export function drawScene(ctx, scene) {
  const { total, warmup, peak } = scene;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `13px ${MONO}`;
  ctx.fillText(`learning_rate for every step: ${total} steps, warmup ${warmup}, peak ${sci(peak)}`, 28, 36);

  // Axes: a baseline, the step ticks, the peak line.
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(AX0, BASE_Y);
  ctx.lineTo(AX1, BASE_Y);
  ctx.stroke();
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.textAlign = 'center';
  for (let step = 0; step <= total; step += 10) {
    const x = xOf(step, total);
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(x, BASE_Y);
    ctx.lineTo(x, BASE_Y + 5);
    ctx.stroke();
    ctx.fillText(String(step), x, BASE_Y + 18);
  }
  ctx.fillText('step', (AX0 + AX1) / 2, BASE_Y + 36);
  ctx.textAlign = 'left';
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(AX0, PEAK_Y);
  ctx.lineTo(AX1, PEAK_Y);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = AMBER;
  ctx.fillText(`peak ${sci(peak)}`, AX0, PEAK_Y - 8);
  ctx.fillStyle = DIM;
  ctx.textAlign = 'right';
  ctx.fillText('0', AX0 - 8, BASE_Y + 4);
  ctx.fillText('peak', AX0 - 8, PEAK_Y + 4);
  ctx.textAlign = 'left';

  // The constant rate that shipped, as faint flat bars.
  if (scene.shipped > 0) {
    ctx.globalAlpha = scene.shipped * 0.28;
    ctx.fillStyle = RED;
    for (let step = 0; step <= total; step += 1) {
      const x = xOf(step, total);
      ctx.fillRect(x - 1.5, PEAK_Y, 3, BASE_Y - PEAK_Y);
    }
    ctx.globalAlpha = scene.shipped;
    ctx.fillStyle = RED;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('what shipped: the full rate from step 1', AX0 + 190, PEAK_Y - 8);
    ctx.globalAlpha = 1;
  }

  // One bar per step.
  scene.bars.forEach((b) => {
    if (b.value <= 0) return;
    const x = xOf(b.step, total);
    const h = (BASE_Y - PEAK_Y) * Math.min(1, b.value);
    ctx.fillStyle = PHASE_COLOR[b.phase];
    ctx.globalAlpha = b.step === scene.cursor ? 1 : 0.75;
    ctx.fillRect(x - 1.6, BASE_Y - h, 3.2, h);
  });
  ctx.globalAlpha = 1;

  // The cursor.
  if (scene.cursor !== null) {
    const x = xOf(scene.cursor, total);
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, PEAK_Y - 20);
    ctx.lineTo(x, BASE_Y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x, PEAK_Y - 22);
    ctx.lineTo(x - 5, PEAK_Y - 30);
    ctx.lineTo(x + 5, PEAK_Y - 30);
    ctx.closePath();
    ctx.fill();
  }

  // The decay midpoint marker.
  if (scene.showMidpoint) {
    const x = xOf(scene.midpoint.step, total);
    const y = BASE_Y - (BASE_Y - PEAK_Y) * 0.5;
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(AX0, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // The label sits on a small panel so it stays legible over the bars.
    const label = `midpoint ${scene.midpoint.step}: half the peak`;
    ctx.font = `10px ${MONO}`;
    const measured = typeof ctx.measureText === 'function' ? ctx.measureText(label) : null;
    const width = (measured && measured.width) || label.length * 6;
    const lx = Math.min(x + 8, AX1 - width - 12);
    ctx.fillStyle = BG;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(lx - 4, y - 19, width + 8, 15);
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.fillText(label, lx, y - 8);
  }

  // The readout panel.
  ctx.fillStyle = PANEL;
  ctx.fillRect(RX, 70, RW, 250);
  ctx.strokeStyle = LINE;
  ctx.strokeRect(RX, 70, RW, 250);
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('readout', RX + 12, 90);
  if (scene.readout) {
    const r = scene.readout;
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(`step ${r.step}`, RX + 12, 118);
    ctx.fillStyle = PHASE_COLOR[r.phase];
    ctx.fillText(`phase: ${r.phase}`, RX + 12, 142);
    ctx.fillStyle = INK;
    ctx.fillText(`rate ${sci(r.rate)}`, RX + 12, 166);
    ctx.fillStyle = DIM;
    ctx.fillText(`${r.percent} of the peak`, RX + 12, 190);
    ctx.font = `10px ${MONO}`;
    const words = r.formula.split(' ');
    let line = '';
    let y = 222;
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > 24) {
        ctx.fillText(line, RX + 12, y);
        y += 15;
        line = word;
      } else line = candidate;
    });
    ctx.fillText(line, RX + 12, y);
  } else {
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('no step yet', RX + 12, 118);
  }

  // The phase legend.
  ctx.font = `10.5px ${MONO}`;
  const legend = [['warmup', BLUE], ['decay', AMBER]];
  if (scene.holdProgress > 0) legend.splice(1, 0, ['hold', GREEN]);
  let lx = RX + 12;
  legend.forEach(([name, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(lx, 342, 10, 10);
    ctx.fillStyle = DIM;
    ctx.fillText(name, lx + 14, 351);
    lx += 14 + name.length * 6.6 + 14;
  });
  ctx.fillStyle = DIM;
  ctx.fillText('one bar per step', RX + 12, 372);
  ctx.fillText('bar height = rate / peak', RX + 12, 388);
}
