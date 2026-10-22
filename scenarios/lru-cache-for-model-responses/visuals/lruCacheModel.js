// The lesson's animation, without a DOM: the same key normalization and cache
// logic as solution.py (and the practice answer's time to live), run on the
// same nine requests (python/fixtures/requests.json), recorded as a trace,
// laid out on a reading-pace timeline, and turned into a drawable scene for
// any moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift from the code. A Map stands in for the Python dictionary: both
// keep insertion order, so the first key is the oldest.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

export function keyFor(prompt) {
  return prompt.toLowerCase().split(/\s+/).filter((word) => word !== '').join(' ');
}

// cached_answer from solution.py: a hit is deleted and reinserted (most recent),
// a miss calls the model and evicts the first key when over capacity.
export function cachedAnswer(cache, prompt, capacity, callModel, stats) {
  if (capacity < 1) throw new Error(`capacity must be at least 1, got ${capacity}`);
  const key = keyFor(prompt);
  if (cache.has(key)) {
    const answer = cache.get(key);
    cache.delete(key);
    cache.set(key, answer);
    stats.hits += 1;
    return [answer, 'hit', null];
  }
  const answer = callModel(prompt);
  stats.calls += 1;
  cache.set(key, answer);
  let evicted = null;
  if (cache.size > capacity) {
    evicted = cache.keys().next().value;
    cache.delete(evicted);
    stats.evictions += 1;
  }
  return [answer, 'miss', evicted];
}

// First-in-first-out on the same requests: a hit is not refreshed (the comparison in the tests).
export function fifoAnswer(cache, prompt, capacity, callModel, stats) {
  const key = keyFor(prompt);
  if (cache.has(key)) { stats.hits += 1; return 'hit'; }
  cache.set(key, callModel(prompt));
  stats.calls += 1;
  if (cache.size > capacity) { cache.delete(cache.keys().next().value); stats.evictions += 1; }
  return 'miss';
}

// cached_answer from practice_answer.py: entries are [answer, inserted minute].
export function cachedAnswerTtl(cache, request, capacity, callModel, stats, ttl) {
  if (capacity < 1) throw new Error(`capacity must be at least 1, got ${capacity}`);
  const key = keyFor(request.prompt);
  const now = request.t;
  let outcome = 'miss';
  if (cache.has(key)) {
    const [answer, insertedAt] = cache.get(key);
    if (now - insertedAt <= ttl) {
      cache.delete(key);
      cache.set(key, [answer, insertedAt]);
      stats.hits += 1;
      return [answer, 'hit', null];
    }
    cache.delete(key);
    stats.expired += 1;
    outcome = 'expired';
  }
  const answer = callModel(request.prompt);
  stats.calls += 1;
  cache.set(key, [answer, now]);
  let evicted = null;
  if (cache.size > capacity) {
    evicted = cache.keys().next().value;
    cache.delete(evicted);
    stats.evictions += 1;
  }
  return [answer, outcome, evicted];
}

export function buildTrace(data) {
  const callModel = (prompt) => data.answers[keyFor(prompt)];
  const cache = new Map();
  const stats = { calls: 0, hits: 0, evictions: 0 };
  const steps = [];
  for (const request of data.requests) {
    const [, outcome, evicted] = cachedAnswer(cache, request.prompt, data.capacity, callModel, stats);
    steps.push({ id: request.id, key: keyFor(request.prompt), outcome, evicted, order: [...cache.keys()], calls: stats.calls, hits: stats.hits, evictions: stats.evictions });
  }
  const fifoCache = new Map();
  const fifoStats = { calls: 0, hits: 0, evictions: 0 };
  const fifoOutcomes = data.requests.map((request) => fifoAnswer(fifoCache, request.prompt, data.capacity, callModel, fifoStats));
  const practiceCache = new Map();
  const practiceStats = { calls: 0, hits: 0, expired: 0, evictions: 0 };
  const practiceSteps = [];
  for (const request of data.requests) {
    const key = keyFor(request.prompt);
    const age = practiceCache.has(key) ? request.t - practiceCache.get(key)[1] : null;
    const [, outcome, evicted] = cachedAnswerTtl(practiceCache, request, data.capacity, callModel, practiceStats, data.ttl_minutes);
    practiceSteps.push({ id: request.id, t: request.t, key, outcome, age, evicted, order: [...practiceCache.keys()] });
  }
  return {
    capacity: data.capacity,
    steps,
    totals: stats,
    no_cache_calls: data.requests.length,
    fifo: { outcomes: fifoOutcomes, ...fifoStats },
    practice: { ttl: data.ttl_minutes, steps: practiceSteps, totals: practiceStats },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each request gets a short
// pick-up, a glide of its key into the shelf (a hit slides to the recent end,
// a miss enters and may push the oldest entry out), a counter update, and the
// rest of the beat to read; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const REQUEST_BEAT = 2.6;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;
const PICK = 0.3;               // sub-phases inside a request beat
const GLIDE = 0.8;
const FILL_AT = 1.3;

function requestCaption(step, request) {
  const counts = `${step.calls} call${step.calls === 1 ? '' : 's'}, ${step.hits} hit${step.hits === 1 ? '' : 's'}${step.evictions ? `, ${step.evictions} eviction${step.evictions === 1 ? '' : 's'}` : ''}.`;
  const head = `${step.id} "${request.prompt}" has key "${step.key}":`;
  if (step.outcome === 'hit') return `${head} already cached, so no model call; the entry moves to the most recent end. ${counts}`;
  if (step.evicted) return `${head} not in the cache, so the model is called (call ${step.calls}); the cache is over capacity, so the oldest entry "${step.evicted}" is evicted. ${counts}`;
  return `${head} not in the cache, so the model is called (call ${step.calls}) and the answer is stored. ${counts}`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.requests.length;
  const distinct = new Set(data.requests.map((request) => keyFor(request.prompt))).size;
  const lastMinute = data.requests[n - 1].t;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} requests arrive over ${lastMinute} minutes, ${distinct} distinct questions once case and spacing are normalized. The cache holds ${data.capacity} answers; the oldest entry leaves first.`,
    captionLate: `What shipped: no cache. Every request was a model call: ${trace.no_cache_calls} calls for ${distinct} distinct questions.` });
  t += INTRO;
  trace.steps.forEach((step, index) => {
    beats.push({ kind: 'request', start: t, duration: REQUEST_BEAT, index, step, caption: requestCaption(step, data.requests[index]) });
    t += REQUEST_BEAT;
  });
  const fifoMisses = trace.fifo.outcomes.map((outcome, index) => [outcome, trace.steps[index]]).filter(([outcome, step]) => outcome === 'miss' && step.outcome === 'hit').map(([, step]) => step.id);
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.totals.calls} model calls, ${trace.totals.hits} hits, ${trace.totals.evictions} evictions for ${n} requests. No cache: ${trace.no_cache_calls} calls. First-in-first-out on the same requests: ${trace.fifo.calls} calls, because ${fifoMisses.join(' and ')} found their answers already evicted; LRU kept them because the earlier hits had refreshed them.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: every entry carries the minute it was inserted and expires after ${trace.practice.ttl} minutes.` });
  t += PRACTICE_INTRO;
  const expiredIndex = trace.practice.steps.findIndex((step) => step.outcome === 'expired');
  const expired = trace.practice.steps[expiredIndex];
  const next = trace.practice.steps[expiredIndex + 1];
  const totals = trace.practice.totals;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE, expiredIndex,
    caption: `At minute ${expired.t}, ${expired.id} finds "${expired.key}" inserted at minute ${expired.t - expired.age}: ${expired.age} minutes old, over the time to live, so it expires and the model is called again. ${next.id} at minute ${next.t} finds an entry ${next.age} minutes old, still a hit. ${totals.calls} calls, ${totals.hits} hits, ${totals.expired} expired, ${totals.evictions} evictions.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (from, to, p) => from + (to - from) * p;

// Slot motion between two orders: every key of the union gets a fractional
// slot position, an alpha, and a state (stay, enter, evict).
function slotsBetween(before, after, progress, trayIndex) {
  const keys = [...new Set([...before, ...after])];
  return keys.map((key) => {
    const from = before.indexOf(key);
    const to = after.indexOf(key);
    if (from >= 0 && to >= 0) return { key, position: lerp(from, to, progress), alpha: 1, state: 'stay' };
    if (from < 0) return { key, position: to, alpha: progress, state: 'enter', lift: 1 - progress };
    // Evicted: drop from its slot straight down into the next tray slot, then hand over to the tray.
    return { key, position: lerp(from, trayIndex, progress), alpha: 1 - 0.45 * progress, state: 'evict', drop: progress };
  }).filter((slot) => !(slot.state === 'evict' && progress >= 1));
}

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const n = data.requests.length;

  // How many requests are complete, and which one is in flight.
  let done = 0;
  let current = -1;
  if (beat.kind === 'request') { done = beat.index; current = beat.index; }
  else if (beatIndex > kinds.lastIndexOf('request')) done = n;
  const settled = beat.kind === 'request' && local >= FILL_AT;
  const stepFor = (index) => (index >= 0 ? trace.steps[index] : null);
  const previous = stepFor(done - 1);
  const counts = settled || beat.kind !== 'request'
    ? (stepFor(Math.min(n, done + (beat.kind === 'request' ? 1 : 0)) - 1) || { calls: 0, hits: 0, evictions: 0 })
    : (previous || { calls: 0, hits: 0, evictions: 0 });
  const requestsSoFar = beat.kind === 'request' ? (settled ? done + 1 : done) : done;

  const queue = data.requests.map((request, index) => {
    const step = trace.steps[index];
    let state = 'pending';
    if (index < done) state = 'done';
    if (index === current) state = settled ? 'done' : 'current';
    return { id: request.id, state, outcome: state === 'done' ? step.outcome : null };
  });

  let request = null;
  let slots;
  let tray = trace.steps.slice(0, done).filter((step) => step.evicted).map((step) => ({ key: step.evicted, alpha: 1 }));
  if (beat.kind === 'request') {
    const step = beat.step;
    request = { id: step.id, prompt: data.requests[beat.index].prompt, key: step.key, alpha: ramp(local, 0, PICK), outcome: settled ? step.outcome : null };
    const before = previous ? previous.order : [];
    const progress = easeInOut(ramp(local, PICK, GLIDE));
    slots = slotsBetween(before, step.order, progress, tray.length);
    if (step.evicted && progress >= 1) tray = [...tray, { key: step.evicted, alpha: ramp(local, PICK + GLIDE, 0.4) }];
  } else {
    const order = previous ? previous.order : [];
    slots = order.map((key, index) => ({ key, position: index, alpha: 1, state: 'stay' }));
  }

  // Practice: the expiry at r7, replayed on the shelf state before it.
  let practice = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const steps = trace.practice.steps;
    const expired = steps[beat.kind === 'practice' ? beat.expiredIndex : timeline.beats[practiceBeat].expiredIndex];
    const before = steps[steps.indexOf(expired) - 1].order;
    const badgeAlpha = beat.kind === 'practice' ? ramp(local, 0.2, 0.5) : 1;
    const progress = beat.kind === 'practice' ? easeInOut(ramp(local, 1.0, GLIDE)) : 1;
    slots = slotsBetween(before, expired.order, progress, 0).map((slot) => (slot.key === expired.key ? { ...slot, state: 'expired' } : slot));
    practice = { badgeAlpha, key: expired.key, age: expired.age, ttl: trace.practice.ttl, minute: expired.t, insertedAt: expired.t - expired.age,
      totals: trace.practice.totals, settled: beat.kind !== 'practice' || local >= 2.0 };
    request = { id: expired.id, prompt: data.requests[steps.indexOf(expired)].prompt, key: expired.key, alpha: 1, outcome: practice.settled ? 'expired' : null, minute: expired.t };
    tray = steps.slice(0, steps.indexOf(expired)).filter((step) => step.evicted).map((step) => ({ key: step.evicted, alpha: 1 }));
  }

  const showFifo = beat.kind === 'outro' ? ramp(local, 0.4, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const practiceCalls = practice && practice.settled ? trace.practice.totals.calls : null;
  const bars = { requests: requestsSoFar, cacheCalls: practiceCalls !== null ? practiceCalls : counts.calls, fifoCalls: trace.fifo.calls, noCacheCalls: trace.no_cache_calls, fifoAlpha: showFifo, max: trace.no_cache_calls,
    cacheLabel: practiceCalls !== null ? 'LRU + time to live' : 'LRU cache' };
  const counters = practice && practice.settled
    ? { requests: n, calls: trace.practice.totals.calls, hits: trace.practice.totals.hits, evictions: trace.practice.totals.evictions, expired: trace.practice.totals.expired }
    : { requests: requestsSoFar, calls: counts.calls, hits: counts.hits, evictions: counts.evictions, expired: null };
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  const idleText = done === 0 ? 'waiting for the first request' : `all ${done} requests handled: ${counts.calls} model calls, ${counts.hits} hits`;
  return { t, beatIndex, beat: beat.kind, caption, queue, request, idleText, slots, tray, counters, bars, practice, capacity: data.capacity, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const QX0 = 40, QY = 58, QW = 62, QPITCH = 70, QH = 28;            // the request queue
const RX0 = 40, RY = 104, RW = 616, RH = 46;                        // the request box
const SX0 = 40, SY = 190, SW = 196, SPITCH = 210, SH = 60;          // the shelf slots
const TY = 300, TH = 40;                                            // the evicted tray
const CX = 690, CY = 104, CW = 186, CH = 236;                       // the counters panel
const BX0 = 190, BX1 = 860, BY = 392, BPITCH = 28;                  // the comparison bars

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function chip(ctx, x, y, w, h, fill, stroke, text, color, alpha = 1, font = `12px ${MONO}`) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  rounded(ctx, x, y, w, h, 6); ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; rounded(ctx, x, y, w, h, 6); ctx.stroke(); }
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `13px ${MONO}`;
  ctx.fillText(`a cache of ${scene.capacity} answers in a plain dictionary: the first key is the oldest, a hit is reinserted last`, 28, 36);

  // The request queue.
  scene.queue.forEach((item, index) => {
    const x = QX0 + index * QPITCH;
    let fill = PANEL, stroke = null, color = DIM;
    if (item.state === 'current') { fill = BLUE; color = BG; }
    if (item.state === 'done') { stroke = item.outcome === 'hit' ? GREEN : AMBER; color = INK; }
    chip(ctx, x, QY, QW, QH, fill, stroke, item.id, color);
  });

  // The request box.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX0, RY, RW, RH, 6); ctx.fill();
  if (scene.request) {
    ctx.save();
    ctx.globalAlpha = scene.request.alpha;
    ctx.fillStyle = INK;
    ctx.font = `12.5px ${MONO}`;
    const minute = scene.request.minute !== undefined ? `  (minute ${scene.request.minute})` : '';
    ctx.fillText(`${scene.request.id}  "${scene.request.prompt}"${minute}`, RX0 + 14, RY + 19);
    ctx.fillStyle = DIM;
    ctx.font = `11.5px ${MONO}`;
    ctx.fillText(`key: "${scene.request.key}"`, RX0 + 14, RY + 37);
    if (scene.request.outcome) {
      const color = scene.request.outcome === 'hit' ? GREEN : (scene.request.outcome === 'expired' ? AMBER : AMBER);
      chip(ctx, RX0 + RW - 92, RY + 10, 80, 26, BG, color, scene.request.outcome === 'miss' ? 'MISS: call' : scene.request.outcome.toUpperCase(), color, 1, `11px ${MONO}`);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = DIM;
    ctx.font = `11.5px ${MONO}`;
    ctx.fillText(scene.idleText, RX0 + 14, RY + 28);
  }

  // The shelf: three slots, oldest on the left.
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('cache, oldest on the left, most recent on the right', SX0, SY - 12);
  for (let index = 0; index < scene.capacity; index += 1) {
    ctx.strokeStyle = LINE;
    ctx.setLineDash([4, 4]);
    rounded(ctx, SX0 + index * SPITCH, SY, SW, SH, 8); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const slot of scene.slots) {
    const x = SX0 + slot.position * SPITCH;
    let y = SY + 6;
    if (slot.state === 'enter') y -= 40 * (slot.lift || 0);
    if (slot.state === 'evict') y += (TY - SY - 6) * (slot.drop || 0);
    const stroke = slot.state === 'evict' ? RED : (slot.state === 'expired' ? AMBER : BLUE);
    chip(ctx, x + 6, y, SW - 12, SH - 12, PANEL, stroke, slot.key, INK, slot.alpha);
  }

  // The evicted tray.
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('evicted', SX0, TY - 8);
  scene.tray.forEach((item, index) => {
    chip(ctx, SX0 + index * SPITCH + 6, TY, SW - 12, TH, BG, RED, item.key, DIM, 0.4 + 0.6 * item.alpha, `11px ${MONO}`);
  });

  // The practice badge: the age against the time to live.
  if (scene.practice && scene.practice.badgeAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.practice.badgeAlpha;
    ctx.fillStyle = AMBER;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`"${scene.practice.key}": inserted at minute ${scene.practice.insertedAt}, age ${scene.practice.age} > time to live ${scene.practice.ttl}: expired, call the model again`, SX0, TY + TH + 22);
    ctx.restore();
  }

  // Counters.
  ctx.fillStyle = PANEL;
  rounded(ctx, CX, CY, CW, CH, 6); ctx.fill();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('running totals', CX + 12, CY + 22);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  const rows = [[`requests`, scene.counters.requests], [`model calls`, scene.counters.calls], [`hits`, scene.counters.hits], [`evictions`, scene.counters.evictions]];
  if (scene.counters.expired !== null && scene.counters.expired !== undefined) rows.push(['expired', scene.counters.expired]);
  rows.forEach(([label, value], index) => {
    ctx.fillStyle = DIM;
    ctx.fillText(label, CX + 12, CY + 50 + index * 26);
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(String(value), CX + CW - 12, CY + 50 + index * 26);
    ctx.textAlign = 'left';
  });

  // Comparison bars: model calls under each policy, scaled to the request count.
  ctx.font = `11px ${MONO}`;
  const bars = [
    ['no cache', scene.bars.requests, AMBER, 1],
    [scene.bars.cacheLabel, scene.bars.cacheCalls, BLUE, 1],
    ['first in, first out', scene.bars.fifoCalls, DIM, scene.bars.fifoAlpha],
  ];
  bars.forEach(([label, value, color, alpha], index) => {
    if (alpha <= 0) return;
    const y = BY + index * BPITCH;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = DIM;
    ctx.fillText(label, 28, y + 13);
    ctx.fillStyle = LINE;
    ctx.fillRect(BX0, y, BX1 - BX0, 18);
    ctx.fillStyle = color;
    ctx.fillRect(BX0, y, (BX1 - BX0) * (value / scene.bars.max), 18);
    const width = (BX1 - BX0) * (value / scene.bars.max);
    const text = `${value} call${value === 1 ? '' : 's'}`;
    if (BX0 + width + 70 <= BX1) {
      ctx.fillStyle = INK;
      ctx.fillText(text, BX0 + width + 8, y + 13);
    } else {
      ctx.fillStyle = BG;
      ctx.textAlign = 'right';
      ctx.fillText(text, BX0 + width - 8, y + 13);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}
