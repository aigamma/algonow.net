// The lesson's animation, without a DOM: the same retry loop as solution.py run
// on the same scripts (python/fixtures/scripts.json) with simulated time,
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

const ERRORS = { timeout: 'no response in 10 seconds', 'rate limited': '429 too many requests', 'invalid request': 'prompt is empty' };
const RETRYABLE = ['timeout', 'rate limited'];
const ANSWER = 'The key is not active yet; rotation finishes after seven days.';

// Python prints a whole-number float with one decimal (1.0), JavaScript does not.
export const py = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const round6 = (x) => Math.round(x * 1e6) / 1e6;

// call_with_retry from solution.py (the practice answer when maxWait is given),
// run on a scripted endpoint. Waits are summed instead of slept.
export function traceRun(name, script, maxAttempts, baseDelay, maxWait) {
  const attempts = [];
  let waited = 0;
  let result = null;
  let message = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const outcome = script[attempt - 1];
    attempts.push({ attempt, outcome, at: round6(waited), wait: null });
    if (outcome === 'ok') { result = 'answer'; message = ANSWER; break; }
    const error = ERRORS[outcome];
    if (!RETRYABLE.includes(outcome)) { result = 'not retried'; message = error; break; }
    if (attempt === maxAttempts) { result = 'gave up'; message = `gave up after ${maxAttempts} attempts: ${error}`; break; }
    const delay = baseDelay * 2 ** (attempt - 1);
    if (maxWait !== undefined && waited + delay > maxWait) {
      result = 'budget exhausted';
      message = `wait budget of ${py(maxWait)} s exhausted after ${attempt} attempts: ${error}`;
      break;
    }
    attempts[attempts.length - 1].wait = delay;
    waited += delay;
  }
  return { name, script: [...script], attempts, result, message, total_wait: round6(waited) };
}

export function buildTrace(data) {
  const { base_delay: base, max_attempts: max, max_wait: maxWait, scripts } = data;
  return {
    base_delay: base,
    max_attempts: max,
    runs: ['recovers', 'exhausts', 'invalid'].map((name) => traceRun(name, scripts[name], max, base)),
    budget: { max_wait: maxWait, runs: [traceRun('exhausts', scripts.exhausts, max, base, maxWait)] },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each attempt gets a marker, a
// wait bracket that grows to the next attempt, and time to read the caption;
// the whole run is about half a minute. The slow motion setting stretches it.
const INTRO = 3;
const INTRO_SHIPPED_AT = 1.4;   // when the tight loop that shipped appears, with its caption
const ATTEMPT = 2.4;            // one attempt: marker, bracket, hold
const OUTRO = 2.5;
const BUDGET_INTRO = 1;
const BUDGET = 3;
const FINAL = 2;

const LABELS = { timeout: 'timeout', 'rate limited': 'rate limited', 'invalid request': 'invalid request', ok: 'ok' };
const LANE_NAMES = ['Script 1', 'Script 2', 'Script 3'];

function attemptCaption(lane, run, index, trace) {
  const a = run.attempts[index];
  const name = LANE_NAMES[lane];
  const where = `attempt ${a.attempt} at ${py(a.at)} s`;
  if (a.outcome === 'ok') {
    return `${name}: ${where}: ok. The answer comes back after ${py(run.total_wait)} s of waiting over ${a.attempt} attempts.`;
  }
  if (!RETRYABLE.includes(a.outcome)) {
    return `${name}: ${where}: ${LABELS[a.outcome]} (${ERRORS[a.outcome]}). ValueError is not in the except tuple: not retried, raised at once.`;
  }
  if (a.wait === null) {
    return `${name}: ${where}: ${LABELS[a.outcome]}. That was the cap: gave up after ${trace.max_attempts} attempts, ${py(run.total_wait)} s waited.`;
  }
  return `${name}: ${where}: ${LABELS[a.outcome]} (${ERRORS[a.outcome]}). Wait ${py(trace.base_delay)} × ${2 ** (a.attempt - 1)} = ${py(a.wait)} s before attempt ${a.attempt + 1}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const [recovers, exhausts] = trace.runs;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `Three scripted runs of the same call: ${trace.max_attempts} attempts at most, a first wait of ${py(trace.base_delay)} s, doubling after every failure.`,
    captionLate: `What shipped: a tight loop. On the all-timeout script it made ${trace.max_attempts} calls in the same instant, then nothing.` });
  t += INTRO;
  trace.runs.forEach((run, lane) => {
    run.attempts.forEach((attempt, index) => {
      beats.push({ kind: 'attempt', start: t, duration: ATTEMPT, lane, index, caption: attemptCaption(lane, run, index, trace) });
      t += ATTEMPT;
    });
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Total waits: ${py(recovers.total_wait)} s to recover, ${py(exhausts.total_wait)} s before giving up, none for the invalid request. The calls spread out instead of hammering the endpoint.` });
  t += OUTRO;
  const budget = trace.budget.runs[0];
  const maxWait = trace.budget.max_wait;
  const cutAttempt = budget.attempts[budget.attempts.length - 1];
  const nextDelay = trace.base_delay * 2 ** (cutAttempt.attempt - 1);
  const taken = budget.attempts.filter((a) => a.wait !== null).map((a) => py(a.wait));
  beats.push({ kind: 'budget-intro', start: t, duration: BUDGET_INTRO,
    caption: `Practice variation: a wait budget of ${py(maxWait)} s in all, on the all-timeout script.` });
  t += BUDGET_INTRO;
  beats.push({ kind: 'budget', start: t, duration: BUDGET, cutAttempt: cutAttempt.attempt,
    caption: `${taken.join(' + ')} + ${py(nextDelay)} = ${py(budget.total_wait + nextDelay)} s would exceed the budget of ${py(maxWait)} s: give up after attempt ${cutAttempt.attempt}.` });
  t += BUDGET;
  beats.push({ kind: 'final', start: t, duration: FINAL,
    caption: `With the budget the third wait is never taken: ${py(budget.total_wait)} s waited over ${budget.attempts.length} attempts. Without it, ${py(exhausts.total_wait)} s over ${trace.max_attempts}.` });
  t += FINAL;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: for each lane, which attempts are
// visible, how far each wait bracket has grown, the tight-loop ghost, and the
// budget line and cut of the practice segment.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;

  const lanes = trace.runs.map((run, lane) => ({
    label: LANE_NAMES[lane],
    script: run.script.join(', '),
    result: run.result,
    alpha: beat.kind === 'intro' ? ramp(local, 0.2 + lane * 0.25, 0.4) : 1,
    attempts: run.attempts.map((a) => ({ ...a, alpha: 0, bracket: 0, active: false, cut: false })),
  }));

  // Everything before the current beat is complete; the current attempt animates.
  for (let index = 1; index < timeline.beats.length; index += 1) {
    const done = timeline.beats[index];
    if (done.kind !== 'attempt') continue;
    const a = lanes[done.lane].attempts[done.index];
    if (index < beatIndex) { a.alpha = 1; a.bracket = 1; }
    if (index === beatIndex) {
      a.active = true;
      a.alpha = ramp(local, 0, 0.3);
      a.bracket = easeInOut(ramp(local, 0.4, 1));
    }
  }

  let shipped = 0;
  if (beat.kind === 'intro') shipped = ramp(local, INTRO_SHIPPED_AT, 0.5);
  else if (beatIndex === 1) shipped = 1 - ramp(local, 0, 0.6);

  // Practice segment: the budget line appears, then the wait that would cross it is cut.
  const budgetIndex = timeline.beats.findIndex((b) => b.kind === 'budget-intro');
  let budget = { alpha: 0, at: trace.budget.max_wait, cutAttempt: null, progress: 0 };
  if (beatIndex >= budgetIndex) {
    const intro = timeline.beats[budgetIndex];
    budget.alpha = beatIndex === budgetIndex ? easeInOut(ramp(local, 0.1, intro.duration - 0.1)) : 1;
    const cutBeat = timeline.beats[budgetIndex + 1];
    if (beatIndex > budgetIndex) {
      budget.cutAttempt = cutBeat.cutAttempt;
      budget.progress = beatIndex === budgetIndex + 1 ? easeInOut(ramp(local, 0.2, 1)) : 1;
      const lane = lanes[1];
      lane.attempts.forEach((a) => { if (a.attempt >= cutBeat.cutAttempt) a.cut = true; });
    }
  }

  const caption = beat.kind === 'intro' && local >= INTRO_SHIPPED_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, lanes, shipped, budget, maxAttempts: trace.max_attempts, baseDelay: trace.base_delay, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const AX0 = 240, AX1 = 870, SECONDS = 4;        // the time axis: 0 to 4 s of simulated time
const LANE_Y = [140, 240, 340], GHOST_Y = 430;
const xOf = (seconds) => AX0 + ((AX1 - AX0) * seconds) / SECONDS;
const colorOf = (outcome) => (outcome === 'ok' ? GREEN : outcome === 'rate limited' ? AMBER : RED);

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `13px ${MONO}`;
  ctx.fillText(`call_with_retry on three scripted endpoints: ${scene.maxAttempts} attempts at most, first wait ${py(scene.baseDelay)} s, doubling`, 28, 36);

  // Time axis with ticks every half second.
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('simulated time', 28, 70);
  for (let s = 0; s <= SECONDS; s += 0.5) {
    const x = xOf(s);
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x, GHOST_Y + 20);
    ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.textAlign = 'center';
    ctx.fillText(s === 0 ? '0 s' : `${py(s)} s`, x, 70);
    ctx.textAlign = 'left';
  }

  scene.lanes.forEach((lane, index) => {
    if (lane.alpha <= 0) return;
    const y = LANE_Y[index];
    ctx.globalAlpha = lane.alpha;
    ctx.fillStyle = PANEL;
    ctx.fillRect(28, y - 34, W - 56, 68);
    ctx.strokeStyle = LINE;
    ctx.strokeRect(28, y - 34, W - 56, 68);
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(lane.label, 40, y - 12);
    ctx.fillStyle = DIM;
    ctx.font = `9px ${MONO}`;
    ctx.fillText(lane.script, 40, y + 4);
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(AX0, y);
    ctx.lineTo(AX1, y);
    ctx.stroke();

    lane.attempts.forEach((a) => {
      if (a.alpha <= 0) return;
      const x = xOf(a.at);
      const color = colorOf(a.outcome);
      ctx.globalAlpha = lane.alpha * a.alpha;
      // The wait bracket grows from this attempt to the next one.
      if (a.wait !== null && a.bracket > 0) {
        const x2 = x + (xOf(a.at + a.wait) - x) * a.bracket;
        ctx.strokeStyle = a.cut ? RED : BLUE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 18);
        ctx.lineTo(x2 - 2, y + 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 13);
        ctx.lineTo(x + 8, y + 23);
        ctx.stroke();
        if (a.bracket >= 1) {
          ctx.beginPath();
          ctx.moveTo(x2 - 2, y + 13);
          ctx.lineTo(x2 - 2, y + 23);
          ctx.stroke();
          ctx.fillStyle = a.cut ? RED : BLUE;
          ctx.font = `10px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.fillText(`${py(a.wait)} s`, (x + x2) / 2, y + 31);
          ctx.textAlign = 'left';
        }
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, a.active ? 8 : 7, 0, Math.PI * 2);
      ctx.fill();
      if (a.cut) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 11, y - 11); ctx.lineTo(x + 11, y + 11);
        ctx.moveTo(x + 11, y - 11); ctx.lineTo(x - 11, y + 11);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = INK;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(`attempt ${a.attempt}`, x, y - 14);
      ctx.fillStyle = color;
      let label = LABELS[a.outcome];
      if (a.outcome !== 'ok' && a.wait === null && lane.result === 'gave up' && !a.cut) label = `${label}: gave up`;
      if (lane.result === 'not retried') label = 'ValueError, not retried';
      if (a.cut && a.wait === null) label = 'never made';
      ctx.fillText(label, x, y + (a.wait !== null ? 42 : 31));
      ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  });

  // The tight loop that shipped: four calls stacked on the same instant.
  if (scene.shipped > 0) {
    ctx.globalAlpha = scene.shipped;
    ctx.fillStyle = DIM;
    ctx.font = `12px ${MONO}`;
    ctx.fillText('what shipped', 40, GHOST_Y - 8);
    ctx.font = `9.5px ${MONO}`;
    ctx.fillText('tight loop, no wait', 40, GHOST_Y + 8);
    for (let n = 0; n < scene.maxAttempts; n += 1) {
      ctx.fillStyle = RED;
      ctx.globalAlpha = scene.shipped * 0.85;
      ctx.beginPath();
      ctx.arc(xOf(0), GHOST_Y - 16 + n * 10, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = scene.shipped;
    ctx.fillStyle = RED;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`${scene.maxAttempts} calls at 0 s, then nothing`, xOf(0) + 14, GHOST_Y + 4);
    ctx.globalAlpha = 1;
  }

  // The practice budget line across the second lane.
  if (scene.budget.alpha > 0) {
    const x = xOf(scene.budget.at);
    const y = LANE_Y[1];
    ctx.save();
    ctx.globalAlpha = scene.budget.alpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x, y + 34);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = scene.budget.alpha;
    ctx.fillStyle = AMBER;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`budget ${py(scene.budget.at)} s`, x, y - 40);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}
