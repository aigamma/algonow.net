// The lesson's animation, without a DOM: the same batcher as solution.py (and
// the token budget of practice_answer.py), run on the same nine arrivals
// (python/fixtures/arrivals.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const lerp = (from, to, p) => from + (to - from) * p;

// batch from solution.py; with maxTokens it is batch from practice_answer.py.
// onEvent, when given, receives every join and every flush in the order the
// loop performs them, so the timeline can replay the decisions.
export function batchRequests(requests, maxBatch, maxWait, maxTokens = null, onEvent = null) {
  if (maxBatch < 1) throw new Error(`max_batch must be at least 1, got ${maxBatch}`);
  if (maxWait <= 0) throw new Error(`max_wait must be positive, got ${maxWait}`);
  const batches = [];
  let pending = [];
  let lastTime = 0.0;
  const flush = (at, reason, requestIndex) => {
    const ids = pending.map((request) => request.id);
    batches.push({ ids, at, reason });
    if (onEvent) onEvent({ kind: 'flush', batch: batches.length - 1, at, reason, requestIndex });
    pending = [];
  };
  requests.forEach((request, index) => {
    const t = request.t;
    if (t < lastTime) throw new Error(`requests must arrive in time order: ${request.id} at ${t} after ${lastTime}`);
    lastTime = t;
    if (pending.length && t >= pending[0].t + maxWait) flush(pending[0].t + maxWait, 'deadline', index);
    if (maxTokens !== null) {
      if (request.tokens > maxTokens) throw new Error(`${request.id} needs ${request.tokens} tokens, more than the budget of ${maxTokens}`);
      let pendingTokens = 0;
      for (const waiting of pending) pendingTokens += waiting.tokens;
      if (pendingTokens + request.tokens > maxTokens) flush(t, 'tokens', index);
    }
    pending.push(request);
    if (onEvent) onEvent({ kind: 'join', requestIndex: index, pending: pending.length });
    if (pending.length === maxBatch) flush(t, 'full', index);
  });
  if (pending.length) flush(pending[0].t + maxWait, 'deadline', requests.length);
  return batches;
}

// The most events inside any window of the given length that starts at an event.
export function busiestWindow(times, window) {
  let busiest = 0;
  for (const start of times) {
    let count = 0;
    for (const t of times) if (start <= t && t <= start + window) count += 1;
    busiest = Math.max(busiest, count);
  }
  return busiest;
}

function describe(batches, requests, withTokens, windowSeconds) {
  const arrival = {};
  const tokensOf = {};
  for (const request of requests) { arrival[request.id] = request.t; tokensOf[request.id] = request.tokens; }
  const records = batches.map((record) => {
    const row = { ids: [...record.ids], at: round6(record.at), reason: record.reason };
    if (withTokens) row.tokens = record.ids.reduce((sum, id) => sum + tokensOf[id], 0);
    return row;
  });
  const raw = [];
  const waits = [];
  for (const record of batches) {
    for (const id of record.ids) {
      raw.push(record.at - arrival[id]);
      waits.push({ id, t: arrival[id], at: round6(record.at), wait: round6(record.at - arrival[id]) });
    }
  }
  return {
    batches: records, waits,
    longest_wait: round6(Math.max(...raw)),
    average_wait: round6(raw.reduce((sum, wait) => sum + wait, 0) / raw.length),
    busiest_window: busiestWindow(batches.map((record) => record.at), windowSeconds),
  };
}

export function buildTrace(data) {
  const plain = data.requests.map((request) => ({ id: request.id, t: request.t }));
  const worked = describe(batchRequests(plain, data.max_batch, data.max_wait), plain, false, data.window_seconds);
  const practice = describe(batchRequests(data.requests, data.max_batch, data.max_wait, data.max_tokens), data.requests, true, data.window_seconds);
  return {
    max_batch: data.max_batch,
    max_wait: data.max_wait,
    max_tokens: data.max_tokens,
    window_seconds: data.window_seconds,
    ...worked,
    shipped: { model_calls: data.requests.length, busiest_window: busiestWindow(data.requests.map((r) => r.t), data.window_seconds) },
    practice,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each arrival gets a short
// clock advance, a visible join, and when a batch leaves, a visible slide;
// the rest of the beat is for reading. The whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const REQUEST_BEAT = 2.4;
const FINAL_BEAT = 2.0;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;
const CLOCK = 0.5;              // sub-phases inside a beat: the clock advances to the arrival
const PRE_FLUSH_AT = 0.5;       // a deadline that already passed: the batch slides out
const FLUSH = 0.6;
const JOIN = 0.3;               // the new request fades into the tray
const POST_FLUSH_AT = 1.5;      // the arrival filled the batch: it slides out

const ids = (record) => record.ids.join(', ');

export function buildTimeline(trace, data) {
  const plain = data.requests.map((request) => ({ id: request.id, t: request.t }));
  const events = [];
  batchRequests(plain, data.max_batch, data.max_wait, null, (event) => events.push(event));
  const n = plain.length;
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} requests arrive within ${f2(plain[n - 1].t)} seconds: four inside the first half second, two more at 0.50 and 0.90, three late ones at 1.70, 2.00, and 2.20. A batch is sent when it holds ${trace.max_batch} requests or when its oldest request has waited ${f2(trace.max_wait)} s, whichever comes first.`,
    captionLate: `What shipped: one model call per request, ${trace.shipped.model_calls} calls for ${n} requests, ${trace.shipped.busiest_window} of them inside one second.` });
  t += INTRO;
  const waitsOf = (record) => record.ids.map((id) => f2(trace.waits.find((w) => w.id === id).wait)).join(', ');
  plain.forEach((request, index) => {
    const own = events.filter((event) => event.requestIndex === index);
    const pre = own.find((event) => event.kind === 'flush' && event.reason === 'deadline');
    const join = own.find((event) => event.kind === 'join');
    const post = own.find((event) => event.kind === 'flush' && event.reason === 'full');
    const batchOf = trace.batches.findIndex((record) => record.ids.includes(request.id));
    const oldest = trace.batches[batchOf].ids[0];
    let caption;
    if (pre) {
      const gone = trace.batches[pre.batch];
      caption = `${f2(request.t)} s: the oldest pending, ${gone.ids[0]}, has waited ${f2(trace.max_wait)} s: batch ${pre.batch + 1} (${ids(gone)}) went at ${f2(gone.at)} s by deadline. ${request.id} starts batch ${batchOf + 1}; its deadline is ${f2(request.t + trace.max_wait)} s.`;
    } else if (post) {
      const sent = trace.batches[post.batch];
      caption = `${request.id} at ${f2(request.t)} s joins: ${join.pending} pending, the cap. Batch ${post.batch + 1} (${ids(sent)}) is sent at ${f2(sent.at)} s, full. Waits ${waitsOf(sent)}.`;
    } else if (join.pending === 1) {
      caption = `${request.id} at ${f2(request.t)} s starts batch ${batchOf + 1}; its deadline is ${f2(request.t + trace.max_wait)} s.`;
    } else {
      const oldestT = plain.find((r) => r.id === oldest).t;
      caption = `${request.id} at ${f2(request.t)} s joins: ${join.pending} pending, the oldest (${oldest}) has waited ${f2(request.t - oldestT)} s of ${f2(trace.max_wait)}.`;
    }
    beats.push({ kind: 'request', start: t, duration: REQUEST_BEAT, index, pre: pre ? pre.batch : null, post: post ? post.batch : null, caption });
    t += REQUEST_BEAT;
  });
  const last = trace.batches[trace.batches.length - 1];
  const finalEvent = events.find((event) => event.kind === 'flush' && event.requestIndex === n);
  beats.push({ kind: 'final', start: t, duration: FINAL_BEAT, flush: finalEvent ? finalEvent.batch : null,
    caption: `No more arrivals. ${last.ids[0]}'s deadline passes at ${f2(last.at)} s: batch ${trace.batches.length} (${ids(last)}) is sent by deadline. Waits ${waitsOf(last)}.` });
  t += FINAL_BEAT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.batches.length} model calls instead of ${n} (${trace.batches.map((r) => r.reason).join(', ')}). Longest wait ${f2(trace.longest_wait)} s, the cap; average wait ${f2(trace.average_wait)} s. Shipped, the busiest second carried ${trace.shipped.busiest_window} calls; batched, ${trace.busiest_window}.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: a token budget of ${trace.max_tokens} per batch, checked before a request joins; a request larger than the budget is rejected.` });
  t += PRACTICE_INTRO;
  const practice = trace.practice;
  const pushes = practice.batches.map((record, index) => {
    if (record.reason !== 'tokens') return null;
    const lastId = record.ids[record.ids.length - 1];
    const trigger = data.requests[data.requests.findIndex((r) => r.id === lastId) + 1];
    return `${trigger.id} (${trigger.tokens}) would push ${ids(record)} (${record.tokens}) to ${record.tokens + trigger.tokens}, so batch ${index + 1} goes at ${f2(record.at)} s for tokens`;
  }).filter(Boolean).join('; ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Box widths show tokens. ${pushes}. ${practice.batches.length} model calls: ${practice.batches.map((r) => r.reason).join(', ')}; longest wait still ${f2(practice.longest_wait)} s, average ${f2(practice.average_wait)} s.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: the simulated clock, the tray of
// pending requests with its deadline bar, the batch sliding out if one is, the
// batches already sent, the waits, the practice column, the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const practiceBeat = kinds.indexOf('practice');
  const finalAt = trace.batches[trace.batches.length - 1].at;
  const requests = data.requests;

  // Progress of every join and every flush, from the beats that carry them.
  const joinProgress = requests.map(() => 0);
  const flushProgress = trace.batches.map(() => 0);
  let simTime = 0;
  for (const b of timeline.beats) {
    if (b.start > t) break;
    const lb = Math.min(t - b.start, b.duration);
    const done = t >= b.start + b.duration;
    if (b.kind === 'request') {
      const previous = b.index ? requests[b.index - 1].t : 0;
      simTime = done ? requests[b.index].t : lerp(previous, requests[b.index].t, ramp(lb, 0, CLOCK));
      if (b.pre !== null) flushProgress[b.pre] = done ? 1 : ramp(lb, PRE_FLUSH_AT, FLUSH);
      const joinAt = b.pre !== null ? PRE_FLUSH_AT + FLUSH : CLOCK;
      joinProgress[b.index] = done ? 1 : ramp(lb, joinAt, JOIN);
      if (b.post !== null) flushProgress[b.post] = done ? 1 : ramp(lb, POST_FLUSH_AT, FLUSH);
    } else if (b.kind === 'final') {
      simTime = done ? finalAt : lerp(requests[requests.length - 1].t, finalAt, ramp(lb, 0, CLOCK));
      if (b.flush !== null) flushProgress[b.flush] = done ? 1 : ramp(lb, PRE_FLUSH_AT, FLUSH);
    } else if (b.kind !== 'intro') {
      simTime = finalAt;
    }
  }

  const batchOf = (id) => trace.batches.findIndex((record) => record.ids.includes(id));
  const tray = [];
  let moving = null;
  const sent = [];
  trace.batches.forEach((record, index) => {
    const fp = flushProgress[index];
    if (fp >= 1) sent.push({ index, ids: record.ids, at: record.at, reason: record.reason, alpha: 1 });
    else if (fp > 0) moving = { index, ids: record.ids, at: record.at, reason: record.reason, progress: easeInOut(fp), fromSlots: record.ids.map((_, slot) => slot) };
  });
  requests.forEach((request, index) => {
    const jp = joinProgress[index];
    if (jp <= 0) return;
    if (flushProgress[batchOf(request.id)] > 0) return;      // sliding out or already sent
    tray.push({ id: request.id, t: request.t, alpha: jp });
  });
  let deadline = null;
  if (tray.length) {
    const oldest = tray[0];
    const waited = Math.max(0, Math.min(trace.max_wait, simTime - oldest.t));
    deadline = { oldestId: oldest.id, waited, progress: waited / trace.max_wait, at: oldest.t + trace.max_wait };
  }
  const waits = sent.flatMap((record) => record.ids.map((id) => trace.waits.find((w) => w.id === id)));
  const arrivalAlpha = (index) => (beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.12, 0.4) : 1);
  const arrivals = requests.map((request, index) => ({ id: request.id, t: request.t, tokens: request.tokens, alpha: arrivalAlpha(index) }));

  let practice = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const alpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.8)) : 1;
    practice = { alpha, batches: trace.practice.batches, waits: trace.practice.waits, maxTokens: trace.max_tokens };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, maxBatch: trace.max_batch, maxWait: trace.max_wait, simTime,
    arrivals, tray, deadline, moving, sent, waits, counts: { sent: sent.length, requests: waits.length }, practice,
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', AMBER = '#f0b94b';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const AX0 = 70, AX1 = 560, AY = 104, AXIS_END = 3.5;      // the time axis
const TX = 70, TW = 490, TY = 162, TH = 96;               // the pending tray
const SLOT_X = TX + 14, SLOT_PITCH = 64, BOX_W = 52, BOX_H = 34, BOX_Y = TY + 28;
const CX = 600, CW = 280, CY = 96, ROW_Y = CY + 46, ROW_PITCH = 72;   // the model-call column
const COL_BOX_W = 40, COL_BOX_H = 28, COL_GAP = 6, COL_X = CX + 12, BUDGET_W = 200;
const WX = 70, WY = 296, WW = 490;                        // the waits panel

const xOf = (seconds) => AX0 + (seconds / AXIS_END) * (AX1 - AX0);
const reasonColor = (reason) => (reason === 'full' ? BLUE : reason === 'deadline' ? AMBER : INK);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function box(ctx, x, y, w, h, label, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = BLUE;
  rounded(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = BG;
  rounded(ctx, x, y, w, h, 4); ctx.stroke();
  ctx.fillStyle = BG;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  rounded(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, x, y, w, h, 6); ctx.stroke();
}

function drawRow(ctx, record, y, alpha, tokensScale) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`batch ${record.index + 1}  ${f2(record.at)} s`, COL_X, y);
  ctx.fillStyle = reasonColor(record.reason);
  ctx.fillText(record.reason, COL_X + 134, y);
  if (tokensScale) {
    ctx.fillStyle = DIM;
    ctx.fillText(`${record.tokens} tok`, COL_X + 218, y);
    let x = COL_X;
    for (const id of record.ids) {
      const w = (tokensScale[id] / tokensScale.budget) * BUDGET_W;
      box(ctx, x, y + 8, w, COL_BOX_H, id, 1);
      x += w;
    }
  } else {
    record.ids.forEach((id, slot) => box(ctx, COL_X + slot * (COL_BOX_W + COL_GAP), y + 8, COL_BOX_W, COL_BOX_H, id, 1));
  }
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`dynamic batching: at most ${scene.maxBatch} requests per model call, at most ${f2(scene.maxWait)} s of waiting`, 28, 36);
  const practiceAlpha = scene.practice ? scene.practice.alpha : 0;

  // The time axis with the arrivals and the simulated clock.
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
  ctx.fillText('arrival time', (AX0 + AX1) / 2, AY + 34);
  scene.arrivals.forEach((arrival, index) => {
    if (arrival.alpha <= 0) return;
    ctx.globalAlpha = arrival.alpha;
    const x = xOf(arrival.t);
    const inTray = scene.tray.some((entry) => entry.id === arrival.id);
    ctx.strokeStyle = inTray ? INK : DIM;
    ctx.lineWidth = inTray ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, AY - 20); ctx.lineTo(x, AY); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = inTray ? INK : DIM;
    ctx.fillText(arrival.id, x, AY - 26 - (index % 2 ? 13 : 0));   // alternate heights so neighbours never touch
  });
  ctx.globalAlpha = 1;
  if (scene.beat !== 'intro' && practiceAlpha < 1) {
    ctx.globalAlpha = 1 - practiceAlpha;
    const x = xOf(Math.min(scene.simTime, AXIS_END));
    ctx.strokeStyle = AMBER;
    ctx.beginPath(); ctx.moveTo(x, AY - 4); ctx.lineTo(x, AY + 10); ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.textAlign = 'left';
    ctx.fillText(`now ${f2(scene.simTime)} s`, Math.min(x + 6, AX1 - 60), AY + 50);
    ctx.globalAlpha = 1;
  }

  // The pending tray with its deadline bar (fades out for the practice).
  if (practiceAlpha < 1) {
    ctx.globalAlpha = 1 - practiceAlpha;
    panel(ctx, TX, TY, TW, TH);
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.fillText(scene.tray.length ? `pending: ${scene.tray.length} of ${scene.maxBatch}` : (scene.moving ? `sending batch ${scene.moving.index + 1}` : 'pending: empty'), TX + 14, TY + 18);
    scene.tray.forEach((entry, slot) => box(ctx, SLOT_X + slot * SLOT_PITCH, BOX_Y, BOX_W, BOX_H, entry.id, entry.alpha * (1 - practiceAlpha)));
    if (scene.deadline) {
      const trackX = SLOT_X, trackW = TW - 28, barY = TY + TH - 16;
      ctx.fillStyle = LINE;
      ctx.fillRect(trackX, barY, trackW, 6);
      ctx.fillStyle = AMBER;
      ctx.fillRect(trackX, barY, trackW * scene.deadline.progress, 6);
      ctx.fillStyle = AMBER;
      ctx.textAlign = 'right';
      ctx.fillText(`oldest ${scene.deadline.oldestId} waited ${f2(scene.deadline.waited)} s of ${f2(scene.maxWait)}; deadline ${f2(scene.deadline.at)} s`, TX + TW - 14, TY + 18);
    }
    ctx.globalAlpha = 1;
  }

  // A batch sliding from the tray to the column.
  if (scene.moving && practiceAlpha < 1) {
    const row = ROW_Y + scene.moving.index * ROW_PITCH;
    scene.moving.ids.forEach((id, slot) => {
      const x = lerp(SLOT_X + slot * SLOT_PITCH, COL_X + slot * (COL_BOX_W + COL_GAP), scene.moving.progress);
      const y = lerp(BOX_Y, row + 8, scene.moving.progress);
      const w = lerp(BOX_W, COL_BOX_W, scene.moving.progress);
      const h = lerp(BOX_H, COL_BOX_H, scene.moving.progress);
      box(ctx, x, y, w, h, id, 1 - practiceAlpha);
    });
    ctx.save();
    ctx.globalAlpha = scene.moving.progress * (1 - practiceAlpha);
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.fillText(`batch ${scene.moving.index + 1}  ${f2(scene.moving.at)} s`, COL_X, row);
    ctx.fillStyle = reasonColor(scene.moving.reason);
    ctx.fillText(scene.moving.reason, COL_X + 134, row);
    ctx.restore();
  }

  // The column of model calls: the worked run, crossfading to the practice run.
  panel(ctx, CX, CY, CW, H - CY - 26);
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.fillText(scene.practice && practiceAlpha >= 0.5 ? `model calls (budget ${scene.practice.maxTokens} tokens)` : 'model calls', CX + 12, CY + 20);
  for (const record of scene.sent) drawRow(ctx, record, ROW_Y + record.index * ROW_PITCH, 1 - practiceAlpha, null);
  if (scene.practice) {
    const scale = { budget: scene.practice.maxTokens };
    for (const arrival of scene.arrivals) scale[arrival.id] = arrival.tokens;
    scene.practice.batches.forEach((record, index) => drawRow(ctx, { ...record, index }, ROW_Y + index * ROW_PITCH, practiceAlpha, scale));
    ctx.save();
    ctx.globalAlpha = practiceAlpha;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(COL_X + BUDGET_W, ROW_Y - 8); ctx.lineTo(COL_X + BUDGET_W, ROW_Y + scene.practice.batches.length * ROW_PITCH - 24); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.textAlign = 'center';
    ctx.fillText(`${scene.practice.maxTokens}`, COL_X + BUDGET_W, ROW_Y + scene.practice.batches.length * ROW_PITCH - 10);
    ctx.restore();
  }

  // The waits so far, three columns.
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  const rows = scene.practice && practiceAlpha >= 0.5 ? scene.practice.waits : scene.waits;
  ctx.fillText(rows.length ? `waits (s): ${rows.length} of ${scene.arrivals.length} requests answered` : 'waits (s)', WX, WY);
  ctx.fillStyle = INK;
  rows.forEach((entry, index) => {
    const column = Math.floor(index / 3), rowIndex = index % 3;
    ctx.fillText(`${entry.id} waited ${f2(entry.wait)}`, WX + column * 165, WY + 22 + rowIndex * 20);
  });
  ctx.globalAlpha = 1;
}
