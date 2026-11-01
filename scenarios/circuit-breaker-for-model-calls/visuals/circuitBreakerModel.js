// The lesson's animation, without a DOM: the same circuit breaker as
// solution.py (and the two-trial rule of practice_answer.py), run on the same
// ten calls (python/fixtures/calls.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const f2 = (x) => x.toFixed(2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// protect from solution.py; with a recovery above 1 it is protect from
// practice_answer.py. Each record also carries the bookkeeping the picture
// shows (the failure count, the trial count, and the time since the breaker
// opened); buildTrace strips those before the comparison with the fixture.
export function protect(calls, threshold, cooldown, recovery = 1) {
  if (threshold < 1) throw new Error(`threshold must be at least 1, got ${threshold}`);
  if (cooldown <= 0) throw new Error(`cooldown must be positive, got ${cooldown}`);
  if (recovery < 1) throw new Error(`recovery must be at least 1, got ${recovery}`);
  let state = 'closed';
  let failures = 0;
  let successes = 0;
  let openedAt = 0.0;
  let lastTime = 0.0;
  const records = [];
  for (const call of calls) {
    const t = call.t;
    if (t < lastTime) throw new Error(`calls must arrive in time order: ${call.id} at ${t} after ${lastTime}`);
    lastTime = t;
    const failuresBefore = failures;
    const successesBefore = successes;
    const sinceOpen = state === 'open' ? t - openedAt : null;
    if (state === 'open') {
      if (t - openedAt >= cooldown) state = 'half-open';
      else {
        records.push({ id: call.id, t, before: 'open', action: 'skipped', after: 'open', provider: call.provider,
          failuresBefore, failuresAfter: failures, successesBefore, successesAfter: successes, sinceOpen, openedAt });
        continue;
      }
    }
    const before = state;
    let action;
    if (state === 'half-open') {
      if (call.provider === 'ok') {
        successes += 1;
        action = 'trial ok';
        if (successes >= recovery) { state = 'closed'; failures = 0; successes = 0; }
      } else { state = 'open'; openedAt = t; successes = 0; action = 'trial failed'; }
    } else if (call.provider === 'ok') { failures = 0; action = 'ok'; }
    else { failures += 1; action = 'failed'; if (failures >= threshold) { state = 'open'; openedAt = t; } }
    records.push({ id: call.id, t, before, action, after: state, provider: call.provider,
      failuresBefore, failuresAfter: failures, successesBefore, successesAfter: successes, sinceOpen, openedAt });
  }
  return records;
}

const strip = (r) => ({ id: r.id, t: r.t, before: r.before, action: r.action, after: r.after });
const isFailure = (r) => r.action === 'failed' || r.action === 'trial failed';

export function buildDetails(data) {
  return { records: protect(data.calls, data.threshold, data.cooldown), practice: protect(data.calls, data.threshold, data.cooldown, data.recovery) };
}

export function buildTrace(data) {
  const details = buildDetails(data);
  const records = details.records.map(strip);
  const answered = {};
  for (const call of data.calls) answered[call.id] = call.provider;
  const skipped = records.filter((r) => r.action === 'skipped').map((r) => r.id);
  return {
    threshold: data.threshold,
    cooldown: data.cooldown,
    records,
    reached: records.filter((r) => r.action !== 'skipped').map((r) => r.id),
    returned_failure: records.filter(isFailure).map((r) => r.id),
    skipped,
    shipped: {
      provider_calls: data.calls.length,
      failures: data.calls.filter((c) => c.provider === 'fail').length,
      skipped_would_have_failed: skipped.filter((id) => answered[id] === 'fail').length,
      skipped_would_have_succeeded: skipped.filter((id) => answered[id] === 'ok').length,
    },
    practice: { recovery: data.recovery, records: details.practice.map(strip), trials: details.practice.filter((r) => r.action === 'trial ok').map((r) => r.id) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each call gets its arrival, the
// trip to the provider or the turn-back at the breaker, the answer, and the
// rest of the beat to read the caption; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;
const CALL_BEAT = 2.4;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;
const ARRIVE_AT = 0.2;          // the tick brightens; a trial's badge turns half-open
const TRAVEL_AT = 0.3;          // the call travels the wire, or is turned back
const TRAVEL = 0.6;
const DECIDE_AT = 1.0;          // the answer chip fades in
const DECIDE = 0.5;             // at its end the badge takes the after state
const PRACTICE_STEP_AT = 1.6;   // the practice beat shows the first trial, then the second

function callCaption(r, threshold, cooldown) {
  const at = `${r.id} at ${f2(r.t)} s`;
  if (r.action === 'skipped') return `${at}: open for ${f2(r.sinceOpen)} s of the ${f2(cooldown)} s cooldown: skipped, the provider is not called.`;
  if (r.action === 'trial failed') return `${at}: ${f2(r.sinceOpen)} s since it opened: half-open, one trial call; the provider fails: open again.`;
  if (r.action === 'trial ok') return `${at}: ${f2(r.sinceOpen)} s since it opened: half-open, the trial succeeds: closed.`;
  if (r.action === 'ok') return `${at}: closed, the call goes to the provider: ok. Failures in a row: ${r.failuresAfter}.`;
  if (r.after === 'open') return `${at}: failed, ${r.failuresAfter} of ${threshold} consecutive failures: the breaker opens.`;
  return `${at}: closed, the call goes to the provider: failed. Failures in a row: ${r.failuresAfter} of ${threshold}.`;
}

export function buildTimeline(trace, data) {
  const details = buildDetails(data);
  const beats = [];
  let t = 0;
  const n = data.calls.length;
  const fails = data.calls.filter((c) => c.provider === 'fail');
  const { shipped } = trace;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} calls arrive over ${f2(data.calls[n - 1].t)} seconds: ${fails.length} failures in a row from ${f2(fails[0].t)} s to ${f2(fails[fails.length - 1].t)} s, successes before and after. The breaker opens after ${trace.threshold} consecutive failures and stays open for a ${f2(trace.cooldown)} s cooldown.`,
    captionLate: `What shipped: every call went to the provider. ${shipped.provider_calls} provider calls, ${shipped.failures} failures, and each failure waited out the full timeout before the gateway answered.` });
  t += INTRO;
  details.records.forEach((record, index) => {
    beats.push({ kind: 'call', start: t, duration: CALL_BEAT, index, caption: callCaption(record, trace.threshold, trace.cooldown) });
    t += CALL_BEAT;
  });
  const spared = shipped.skipped_would_have_succeeded === 0
    ? `every skipped call's script says it would have failed, so the breaker spared ${shipped.skipped_would_have_failed} timeouts and lost no answer here.`
    : `${shipped.skipped_would_have_succeeded} of them would have been answered: the cost of failing fast.`;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.reached.length} provider calls instead of ${n}, ${trace.returned_failure.length} failures returned instead of ${shipped.failures}, ${trace.skipped.length} skipped (${trace.skipped.join(', ')}): ${spared}` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: closing takes ${data.recovery} consecutive trial successes instead of 1, so the first good trial leaves the breaker half-open.` });
  t += PRACTICE_INTRO;
  const trials = details.practice.filter((r) => r.action === 'trial ok');
  const first = trials[0];
  const last = trials[trials.length - 1];
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${first.id} at ${f2(first.t)} s is the first trial success: ${first.successesAfter} of ${data.recovery}, the breaker stays half-open; ${last.id} at ${f2(last.t)} s is the second: trial ok, closed after ${data.recovery} trial successes. Provider calls and skips are unchanged: ${trace.reached.length} and ${trace.skipped.length}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start), details };
}

// ----------------------------------------------------------------- scene

// The drawable state at `elapsed` seconds: the badge state, the failure boxes,
// the cooldown bar, the travelling call, the chips on the axis, the log, the
// counts, the practice replay, the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const { details } = timeline;
  const last = details.records[details.records.length - 1];
  let done = 0;
  let state = 'closed';
  let failures = 0;
  let cooldown = null;             // { elapsed, total } while the breaker is open or half-open
  let currentId = null;
  let currentAlpha = 0;
  let travel = 0;                  // the call's progress along the wire to the provider
  let turnedBack = 0;              // the skip marker's progress at the breaker
  let answer = null;               // the provider's answer for the current call once it is in
  if (beat.kind === 'call') {
    const r = details.records[beat.index];
    const prior = beat.index ? details.records[beat.index - 1] : null;
    done = beat.index;
    const decided = local >= DECIDE_AT + DECIDE;
    state = local < ARRIVE_AT ? (prior ? prior.after : 'closed') : (decided ? r.after : r.before);
    failures = decided ? r.failuresAfter : r.failuresBefore;
    currentId = r.id;
    currentAlpha = ramp(local, DECIDE_AT, DECIDE);
    if (currentAlpha >= 1) done = beat.index + 1;
    if (r.action === 'skipped') turnedBack = easeInOut(ramp(local, TRAVEL_AT, TRAVEL));
    else travel = easeInOut(ramp(local, TRAVEL_AT, TRAVEL));
    if (local >= DECIDE_AT && r.action !== 'skipped') answer = r.provider;
    if (state === 'open') cooldown = { elapsed: decided ? r.t - r.openedAt : r.sinceOpen, total: trace.cooldown };
    else if (state === 'half-open') cooldown = { elapsed: r.sinceOpen === null ? trace.cooldown : r.sinceOpen, total: trace.cooldown };
  } else if (beat.kind !== 'intro') {
    done = details.records.length;
    state = last.after;
    failures = last.failuresAfter;
  }
  const arrivalAlpha = (index) => (beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.15, 0.4) : 1);
  const arrivals = data.calls.map((call, index) => ({ id: call.id, t: call.t, provider: call.provider, alpha: arrivalAlpha(index) }));
  const chips = details.records.map((record, index) => ({
    id: record.id, t: record.t, action: record.action, alpha: index < done ? 1 : (record.id === currentId ? currentAlpha : 0),
  }));
  let log = details.records.slice(0, done);

  let practice = null;
  const practiceBeat = timeline.beats.findIndex((b) => b.kind === 'practice');
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const step = beat.kind === 'practice' && local < PRACTICE_STEP_AT ? 0 : 1;
    const trials = details.practice.filter((r) => r.action === 'trial ok');
    const shown = trials[step];
    practice = { alpha: beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.8)) : 1, step, recovery: data.recovery,
      records: details.practice, trials: trials.map((r) => r.id), successes: shown.successesAfter };
    state = shown.after;
    failures = shown.failuresAfter;
    cooldown = state === 'half-open' ? { elapsed: trace.cooldown, total: trace.cooldown } : null;
    log = details.practice;
  }
  const counts = { reached: log.filter((r) => r.action !== 'skipped').length, failures: log.filter(isFailure).length, skipped: log.filter((r) => r.action === 'skipped').length };
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, threshold: trace.threshold, cooldownSeconds: trace.cooldown, state, failures, cooldown,
    currentId, travel, turnedBack, answer, arrivals, chips, log, counts, practice, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const STATE_COLOR = { closed: GREEN, open: RED, 'half-open': AMBER };
const AX0 = 70, AX1 = 560, AY = 104, AXIS_END = 6.5;      // the time axis
const WY = 262;                                           // the wire: gateway, breaker, provider
const GW0 = 70, GW1 = 160, BX0 = 245, BX1 = 395, PX0 = 450, PX1 = 560;
const LX = 610, LW = 268, LY0 = 88, LY1 = 416;            // the log panel

const xOf = (seconds) => AX0 + (seconds / AXIS_END) * (AX1 - AX0);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function chip(ctx, x, y, action, alpha, radius = 5) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (action === 'skipped') { ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
  else { ctx.fillStyle = action === 'ok' || action === 'trial ok' ? GREEN : RED; ctx.fill(); }
  ctx.globalAlpha = 1;
}

function box(ctx, x0, x1, label, color) {
  ctx.fillStyle = PANEL;
  rounded(ctx, x0, WY - 22, x1 - x0, 44, 6); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = color === LINE ? 1 : 2;
  rounded(ctx, x0, WY - 22, x1 - x0, 44, 6); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = `12px ${MONO}`;
  ctx.fillText(label, (x0 + x1) / 2, WY + 4);
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `13px ${MONO}`;
  const rule = scene.practice ? `, closes after ${scene.practice.recovery} trial successes` : ', one trial call when it ends';
  ctx.fillText(`circuit breaker: opens after ${scene.threshold} consecutive failures, cooldown ${f2(scene.cooldownSeconds)} s${rule}`, 28, 36);

  // The time axis with the arrivals and the decision chips.
  ctx.strokeStyle = LINE; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(AX0, AY); ctx.lineTo(AX1 + 8, AY); ctx.stroke();
  ctx.fillStyle = DIM; ctx.font = `10.5px ${MONO}`; ctx.textAlign = 'center';
  for (let s = 0; s <= AXIS_END; s += 0.5) {
    ctx.beginPath(); ctx.moveTo(xOf(s), AY); ctx.lineTo(xOf(s), AY + 5); ctx.stroke();
    if (Number.isInteger(s)) ctx.fillText(`${s}s`, xOf(s), AY + 18);
  }
  ctx.fillText('arrival time', (AX0 + AX1) / 2, AY + 34);
  scene.arrivals.forEach((arrival, index) => {
    if (arrival.alpha <= 0) return;
    ctx.globalAlpha = arrival.alpha;
    const x = xOf(arrival.t);
    const current = arrival.id === scene.currentId;
    ctx.strokeStyle = current ? INK : DIM; ctx.lineWidth = current ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, AY - 22); ctx.lineTo(x, AY); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = current ? INK : DIM;
    ctx.fillText(arrival.id, x, AY - 28 - (index % 2 ? 14 : 0));   // alternate heights so neighbours never touch
  });
  ctx.globalAlpha = 1;
  for (const c of scene.chips) chip(ctx, xOf(c.t), AY + 52, c.action, c.alpha);
  ctx.fillStyle = DIM; ctx.textAlign = 'left'; ctx.font = `10.5px ${MONO}`;
  ctx.fillText('ok', AX0 + 14, AY + 88); chip(ctx, AX0 + 4, AY + 84, 'ok', 1);
  ctx.fillStyle = DIM; ctx.fillText('failed', AX0 + 62, AY + 88); chip(ctx, AX0 + 52, AY + 84, 'failed', 1);
  ctx.fillStyle = DIM; ctx.fillText('skipped', AX0 + 134, AY + 88); chip(ctx, AX0 + 124, AY + 84, 'skipped', 1);

  // The wire: gateway, breaker badge, provider.
  const stateColor = STATE_COLOR[scene.state];
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(GW1, WY); ctx.lineTo(BX0, WY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(BX1, WY); ctx.lineTo(PX0, WY); ctx.stroke();
  if (scene.travel > 0) {
    // The call travels gateway to breaker, then breaker to provider.
    const first = Math.min(1, scene.travel * 2);
    const second = Math.max(0, scene.travel * 2 - 1);
    ctx.strokeStyle = BLUE;
    ctx.beginPath(); ctx.moveTo(GW1, WY); ctx.lineTo(GW1 + (BX0 - GW1) * first, WY); ctx.stroke();
    if (second > 0) { ctx.beginPath(); ctx.moveTo(BX1, WY); ctx.lineTo(BX1 + (PX0 - BX1) * second, WY); ctx.stroke(); }
    const x = second > 0 ? BX1 + (PX0 - BX1) * second : GW1 + (BX0 - GW1) * first;
    ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(x, WY, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (scene.turnedBack > 0) {
    // A skipped call reaches the breaker and is turned back: a red cross on the wire.
    ctx.strokeStyle = RED;
    ctx.beginPath(); ctx.moveTo(GW1, WY); ctx.lineTo(GW1 + (BX0 - GW1) * scene.turnedBack, WY); ctx.stroke();
    if (scene.turnedBack >= 1) {
      const x = BX0 - 14;
      ctx.beginPath(); ctx.moveTo(x - 6, WY - 6); ctx.lineTo(x + 6, WY + 6); ctx.moveTo(x + 6, WY - 6); ctx.lineTo(x - 6, WY + 6); ctx.stroke();
    }
  }
  ctx.lineWidth = 1;
  box(ctx, GW0, GW1, 'gateway', LINE);
  box(ctx, PX0, PX1, 'provider', scene.answer ? (scene.answer === 'ok' ? GREEN : RED) : LINE);
  box(ctx, BX0, BX1, scene.state, stateColor);
  if (scene.answer) {
    ctx.fillStyle = scene.answer === 'ok' ? GREEN : RED; ctx.textAlign = 'center'; ctx.font = `11px ${MONO}`;
    ctx.fillText(scene.answer === 'ok' ? 'answers ok' : 'fails', (PX0 + PX1) / 2, WY + 40);
  }
  // Failures in a row: one box per failure the breaker tolerates, filled red as they come.
  ctx.font = `10.5px ${MONO}`; ctx.textAlign = 'left';
  const boxW = 18, gap = 6, fx = (BX0 + BX1) / 2 - (scene.threshold * boxW + (scene.threshold - 1) * gap) / 2;
  for (let i = 0; i < scene.threshold; i += 1) {
    ctx.fillStyle = i < scene.failures ? RED : PANEL;
    rounded(ctx, fx + i * (boxW + gap), WY + 34, boxW, 12, 3); ctx.fill();
    ctx.strokeStyle = LINE; rounded(ctx, fx + i * (boxW + gap), WY + 34, boxW, 12, 3); ctx.stroke();
  }
  ctx.fillStyle = DIM; ctx.textAlign = 'center';
  ctx.fillText(`failures in a row ${scene.failures} of ${scene.threshold}`, (BX0 + BX1) / 2, WY + 62);
  // The cooldown bar while the breaker is open or half-open.
  if (scene.cooldown) {
    const share = Math.min(1, scene.cooldown.elapsed / scene.cooldown.total);
    ctx.fillStyle = PANEL; rounded(ctx, BX0, WY + 74, BX1 - BX0, 10, 3); ctx.fill();
    ctx.fillStyle = share >= 1 ? AMBER : RED; rounded(ctx, BX0, WY + 74, (BX1 - BX0) * share, 10, 3); ctx.fill();
    ctx.fillStyle = DIM;
    const note = scene.practice && scene.state === 'half-open'
      ? `trial successes ${scene.practice.successes} of ${scene.practice.recovery}`
      : (share >= 1 ? `cooldown over: trial call` : `cooldown ${f2(scene.cooldown.elapsed)} / ${f2(scene.cooldown.total)} s`);
    ctx.fillText(note, (BX0 + BX1) / 2, WY + 100);
  }
  // The counts so far.
  ctx.fillStyle = INK; ctx.font = `12px ${MONO}`; ctx.textAlign = 'left';
  ctx.fillText(`provider calls ${scene.counts.reached}, failures returned ${scene.counts.failures}, skipped ${scene.counts.skipped}`, AX0, 404);

  // The log panel.
  ctx.fillStyle = PANEL; rounded(ctx, LX, LY0, LW, LY1 - LY0, 6); ctx.fill();
  ctx.strokeStyle = LINE; rounded(ctx, LX, LY0, LW, LY1 - LY0, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`; ctx.fillStyle = DIM;
  ctx.fillText('id   before     action', LX + 12, LY0 + 20);
  scene.log.forEach((record, index) => {
    const y = LY0 + 44 + index * 26;
    chip(ctx, LX + 16, y - 4, record.action, 1, 4);
    ctx.fillStyle = INK;
    ctx.fillText(`${record.id.padEnd(4)} ${record.before.padEnd(10)} ${record.action}`, LX + 28, y);
  });
  ctx.globalAlpha = 1;
}
