// The lesson's animation, without a DOM: the same token bucket as solution.py
// (and the per-tenant buckets of practice_answer.py), run on the same eight
// arrivals (python/fixtures/requests.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const lerp = (from, to, p) => from + (to - from) * p;

// admit from solution.py; with perTenant it is admit from practice_answer.py.
export function admit(requests, capacity, rate, perTenant = false) {
  if (capacity < 1) throw new Error(`capacity must be at least 1, got ${capacity}`);
  if (rate <= 0) throw new Error(`rate must be positive, got ${rate}`);
  const buckets = new Map();
  let tokens = capacity;               // the shared bucket starts full
  let lastTime = 0.0;
  const records = [];
  for (const request of requests) {
    const t = request.t;
    if (t < lastTime) throw new Error(`requests must arrive in time order: ${request.id} at ${t} after ${lastTime}`);
    let before;
    let decision;
    let after;
    if (perTenant) {
      lastTime = t;
      if (!buckets.has(request.tenant)) buckets.set(request.tenant, { tokens: capacity, last: 0.0 });
      const bucket = buckets.get(request.tenant);
      const elapsed = t - bucket.last;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * rate);
      bucket.last = t;
      before = bucket.tokens;
      if (bucket.tokens >= 1) { bucket.tokens -= 1; decision = 'admit'; } else decision = 'reject';
      after = bucket.tokens;
    } else {
      const elapsed = t - lastTime;
      tokens = Math.min(capacity, tokens + elapsed * rate);
      lastTime = t;
      before = tokens;
      if (tokens >= 1) { tokens -= 1; decision = 'admit'; } else decision = 'reject';
      after = tokens;
    }
    records.push({ id: request.id, tenant: request.tenant, t, before, decision, after });
  }
  return records;
}

// The most arrivals inside any window of the given length that starts at an arrival.
export function busiestWindow(times, window) {
  let busiest = 0;
  for (const start of times) {
    let count = 0;
    for (const t of times) if (start <= t && t <= start + window) count += 1;
    busiest = Math.max(busiest, count);
  }
  return busiest;
}

export function buildTrace(data) {
  const plain = data.requests.map((request) => ({ id: request.id, t: request.t }));
  const records = admit(plain, data.capacity, data.rate).map((r) => ({ id: r.id, t: r.t, before: round6(r.before), decision: r.decision, after: round6(r.after) }));
  const practiceRecords = admit(data.requests, data.capacity, data.rate, true)
    .map((r) => ({ id: r.id, tenant: r.tenant, t: r.t, before: round6(r.before), decision: r.decision, after: round6(r.after) }));
  const counts = {};
  for (const record of practiceRecords) {
    if (!counts[record.tenant]) counts[record.tenant] = { admit: 0, reject: 0 };
    counts[record.tenant][record.decision] += 1;
  }
  const arrivals = data.requests.map((request) => request.t);
  const admittedTimes = records.filter((r) => r.decision === 'admit').map((r) => r.t);
  return {
    capacity: data.capacity,
    rate: data.rate,
    records,
    admitted: records.filter((r) => r.decision === 'admit').map((r) => r.id),
    rejected: records.filter((r) => r.decision === 'reject').map((r) => r.id),
    shipped: {
      window_seconds: data.window_seconds,
      burst_seconds: data.burst_seconds,
      within_burst: arrivals.filter((t) => t <= data.burst_seconds).length,
      busiest_window: busiestWindow(arrivals, data.window_seconds),
      limited_busiest_window: busiestWindow(admittedTimes, data.window_seconds),
    },
    practice: { records: practiceRecords, counts },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each arrival gets a short
// name, a visible refill, the spend or the refusal, and the rest of the beat
// to read the caption; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const REQUEST_BEAT = 2.6;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;
const REFILL_AT = 0.2;          // sub-phases inside a request beat
const REFILL = 0.7;
const SPEND_AT = 1.0;
const SPEND = 0.5;

function requestCaption(record, previous, capacity, rate) {
  const passed = previous === null ? null : record.t - previous.t;
  const prior = previous === null ? capacity : previous.after;
  let refill;
  if (previous === null) refill = `the bucket starts full at ${f2(prior)}`;
  else if (prior + passed * rate >= capacity - 1e-9) refill = `${f2(passed)} s passed, the refill would pass the top; the cap holds it at ${f2(record.before)} (capacity)`;
  else refill = `${f2(passed)} s passed, so the bucket refilled from ${f2(prior)} to ${f2(record.before)}`;
  if (record.decision === 'admit') return `${record.id} at ${f2(record.t)} s: ${refill}. One token spent: ${f2(record.after)} left. Admitted.`;
  return `${record.id} at ${f2(record.t)} s: ${refill}, less than one token. Rejected; the level stays at ${f2(record.after)}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.requests.length;
  const last = data.requests[n - 1].t;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} requests arrive in ${f2(last)} seconds: a burst of four inside the first second, two more at 1.50 and 1.60, two late ones at 4.00 and 4.10. The bucket starts full at ${trace.capacity} tokens and refills ${trace.rate.toFixed(1)} per second.`,
    captionLate: `What shipped: every request forwarded the instant it arrived. ${trace.shipped.within_burst} of the ${n} reach the provider inside ${trace.shipped.burst_seconds} seconds, ${trace.shipped.busiest_window} of them inside one second, against a sustained limit of ${trace.rate.toFixed(0)} per second.` });
  t += INTRO;
  trace.records.forEach((record, index) => {
    const previous = index ? trace.records[index - 1] : null;
    beats.push({ kind: 'request', start: t, duration: REQUEST_BEAT, index, caption: requestCaption(record, previous, trace.capacity, trace.rate) });
    t += REQUEST_BEAT;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.admitted.length} admitted (${trace.admitted.join(', ')}), ${trace.rejected.length} rejected (${trace.rejected.join(', ')}). The busiest one-second window holds ${trace.shipped.limited_busiest_window} admissions instead of ${trace.shipped.busiest_window} arrivals: the bucket spends at most the capacity plus one second of refill.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: one bucket per tenant, kept in a dictionary keyed by the tenant and created full the first time the tenant is seen.' });
  t += PRACTICE_INTRO;
  const tenants = Object.keys(trace.practice.counts);
  const members = (tenant) => trace.practice.records.filter((r) => r.tenant === tenant).map((r) => r.id).join(', ');
  const admittedAll = trace.practice.records.filter((r) => r.decision === 'admit').length;
  const starved = trace.rejected.map((id) => trace.practice.records.find((r) => r.id === id).tenant);
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Tenant ${tenants[0]} (${members(tenants[0])}) and tenant ${tenants[1]} (${members(tenants[1])}) each get a bucket of ${trace.capacity}. ${trace.rejected.join(' and ')} now find tenant ${starved[0]}'s bucket full: ${admittedAll} of ${n} admitted, tenant ${tenants[0]} ${trace.practice.counts[tenants[0]].admit}, tenant ${tenants[1]} ${trace.practice.counts[tenants[1]].admit}. The shared bucket had rejected only tenant ${starved[0]}, starved by tenant ${tenants[0]}'s burst.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: the bucket level, the decision
// chips on the time axis, the log, the counts, the practice gauges, the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const practiceBeat = kinds.indexOf('practice');
  const { capacity } = trace;

  // How many decisions are complete, and the level of the fill right now.
  let done = 0;
  let level = capacity;
  let currentId = null;
  let currentAlpha = 0;
  if (beat.kind === 'request') {
    done = beat.index;
    const record = trace.records[beat.index];
    const prior = beat.index ? trace.records[beat.index - 1].after : capacity;
    currentId = record.id;
    level = lerp(prior, record.before, easeInOut(ramp(local, REFILL_AT, REFILL)));
    currentAlpha = ramp(local, SPEND_AT, SPEND);
    if (record.decision === 'admit' && local >= SPEND_AT) level = lerp(record.before, record.after, easeInOut(ramp(local, SPEND_AT, SPEND)));
    if (currentAlpha >= 1) done = beat.index + 1;
  } else if (beat.kind !== 'intro') {
    done = trace.records.length;
    level = trace.records[trace.records.length - 1].after;
  }
  const arrivalAlpha = (index) => (beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.15, 0.4) : 1);
  const arrivals = data.requests.map((request, index) => ({ id: request.id, t: request.t, tenant: request.tenant, alpha: arrivalAlpha(index) }));
  const chips = trace.records.map((record, index) => ({
    id: record.id, t: record.t, decision: record.decision,
    alpha: index < done ? 1 : (record.id === currentId ? currentAlpha : 0),
  }));
  const log = trace.records.slice(0, done);
  const counts = { admitted: log.filter((r) => r.decision === 'admit').length, rejected: log.filter((r) => r.decision === 'reject').length };

  let practice = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const alpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.8)) : 1;
    const levels = {};
    for (const record of trace.practice.records) levels[record.tenant] = record.after;
    practice = { alpha, levels, counts: trace.practice.counts, records: trace.practice.records,
      chips: trace.practice.records.map((record) => ({ id: record.id, t: record.t, tenant: record.tenant, decision: record.decision })) };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, capacity, rate: trace.rate, level, arrivals, chips, currentId, log, counts, practice,
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const AX0 = 70, AX1 = 560, AY = 120, AXIS_END = 4.5;      // the time axis
const GX = 610, GW = 80, GY0 = 96, GY1 = 406;             // the bucket gauge: GY0 is the capacity, GY1 is empty
const LX = 720, LW = 158;                                 // the log panel

const xOf = (seconds) => AX0 + (seconds / AXIS_END) * (AX1 - AX0);
const yOfLevel = (level, capacity) => GY1 - (level / capacity) * (GY1 - GY0);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function drawGauge(ctx, x, width, level, capacity, label, sublabel, alpha, showScale) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PANEL;
  rounded(ctx, x, GY0 - 8, width, GY1 - GY0 + 16, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, x, GY0 - 8, width, GY1 - GY0 + 16, 6); ctx.stroke();
  const top = yOfLevel(Math.max(0, Math.min(capacity, level)), capacity);
  ctx.fillStyle = BLUE;
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillRect(x + 6, top, width - 12, GY1 - top);
  ctx.globalAlpha = alpha;
  ctx.font = `10.5px ${MONO}`;
  for (let tokens = 0; tokens <= capacity; tokens += 1) {
    const y = yOfLevel(tokens, capacity);
    ctx.strokeStyle = tokens === 1 ? AMBER : LINE;
    if (tokens === 1) ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + width - 2, y); ctx.stroke();
    ctx.setLineDash([]);
    if (!showScale) continue;
    ctx.fillStyle = tokens === 1 ? AMBER : DIM;
    ctx.textAlign = 'right';
    ctx.fillText(tokens === 1 ? 'needs 1' : String(tokens), x - 6, y + 4);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(label, x + width / 2, GY1 + 26);
  ctx.fillStyle = DIM;
  ctx.fillText(sublabel, x + width / 2, GY1 + 42);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`token bucket: capacity ${scene.capacity} tokens, refill ${scene.rate.toFixed(1)} per second, one token per request`, 28, 36);

  // The time axis with the arrivals.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(AX0, AY); ctx.lineTo(AX1 + 8, AY); ctx.stroke();
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.textAlign = 'center';
  for (let s = 0; s <= AXIS_END; s += 0.5) {
    ctx.beginPath(); ctx.moveTo(xOf(s), AY); ctx.lineTo(xOf(s), AY + 5); ctx.stroke();
    if (Number.isInteger(s)) ctx.fillText(`${s}s`, xOf(s), AY + 18);
  }
  ctx.fillText('arrival time', (AX0 + AX1) / 2, AY + 36);
  scene.arrivals.forEach((arrival, index) => {
    if (arrival.alpha <= 0) return;
    ctx.globalAlpha = arrival.alpha;
    const x = xOf(arrival.t);
    ctx.strokeStyle = arrival.id === scene.currentId ? INK : DIM;
    ctx.lineWidth = arrival.id === scene.currentId ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, AY - 22); ctx.lineTo(x, AY); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = arrival.id === scene.currentId ? INK : DIM;
    // Labels alternate heights so the burst's neighbours never touch.
    ctx.fillText(arrival.id, x, AY - 28 - (index % 2 ? 14 : 0));
    if (scene.practice) {
      ctx.globalAlpha = arrival.alpha * scene.practice.alpha;
      ctx.fillStyle = AMBER;
      ctx.fillText(arrival.tenant, x, AY + 64);
    }
  });
  ctx.globalAlpha = 1;
  // Decision chips: shared bucket decisions, replaced by the per-tenant ones in the practice.
  const sharedAlpha = scene.practice ? 1 - scene.practice.alpha : 1;
  for (const chip of scene.chips) {
    const alpha = chip.alpha * sharedAlpha;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = chip.decision === 'admit' ? GREEN : RED;
    ctx.beginPath(); ctx.arc(xOf(chip.t), AY + 50, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (scene.practice) {
    for (const chip of scene.practice.chips) {
      ctx.globalAlpha = scene.practice.alpha;
      ctx.fillStyle = chip.decision === 'admit' ? GREEN : RED;
      ctx.beginPath(); ctx.arc(xOf(chip.t), AY + 50, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('admitted', AX0, AY + 86);
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(AX0 + 62, AY + 82, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = DIM;
  ctx.fillText('rejected', AX0 + 84, AY + 86);
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(AX0 + 146, AY + 82, 5, 0, Math.PI * 2); ctx.fill();

  // The counts so far, below the axis.
  ctx.fillStyle = INK;
  ctx.font = `12px ${MONO}`;
  const summary = scene.practice
    ? Object.keys(scene.practice.counts).map((tenant) => `tenant ${tenant}: ${scene.practice.counts[tenant].admit} admitted, ${scene.practice.counts[tenant].reject} rejected`).join('   ')
    : `admitted ${scene.counts.admitted}, rejected ${scene.counts.rejected}`;
  ctx.fillText(summary, AX0, AY + 124);

  // The gauge: one shared bucket, crossfading to one bucket per tenant in the practice.
  const practiceAlpha = scene.practice ? scene.practice.alpha : 0;
  drawGauge(ctx, GX, GW, scene.level, scene.capacity, 'shared bucket', `level ${f2(scene.level)}`, 1 - practiceAlpha, true);
  if (scene.practice) {
    // Two slim gauges at a 60 px pitch: the labels fit side by side, and only the first carries the scale.
    Object.keys(scene.practice.levels).forEach((tenant, index) => {
      drawGauge(ctx, GX + index * 60, 30, scene.practice.levels[tenant], scene.capacity, `tenant ${tenant}`, f2(scene.practice.levels[tenant]), practiceAlpha, index === 0);
    });
  }

  // The log panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, LX, GY0 - 8, LW, GY1 - GY0 + 16, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, LX, GY0 - 8, LW, GY1 - GY0 + 16, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('id   before  after', LX + 10, GY0 + 14);
  const rows = scene.practice && scene.practice.alpha >= 0.5 ? scene.practice.records : scene.log;
  rows.forEach((record, index) => {
    const y = GY0 + 38 + index * 32;
    ctx.fillStyle = record.decision === 'admit' ? GREEN : RED;
    ctx.beginPath(); ctx.arc(LX + 14, y - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(`${record.id}   ${f2(record.before)}   ${record.decision === 'admit' ? f2(record.after) : 'reject'}`, LX + 24, y);
  });
  ctx.globalAlpha = 1;
}
