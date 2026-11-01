// The lesson's animation, without a DOM: the same line buffer as solution.py
// (and the usage capture of practice_answer.py), run on the same chunks
// (python/fixtures/chunks.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const removePrefix = (text, prefix) => (text.startsWith(prefix) ? text.slice(prefix.length) : text);

// read_stream from solution.py, with the practice's usage capture, and a step
// log for the figure: every line the buffer releases per chunk.
export function readStream(chunks) {
  let buffer = '';
  let text = '';
  let events = 0;
  let usage = null;
  let done = false;
  const log = [];
  const steps = [];
  for (let index = 0; index < chunks.length; index += 1) {
    if (done) break;
    const number = index + 1;
    const chunk = chunks[index];
    buffer += chunk;
    const appended = buffer;
    let parsedHere = 0;
    const lines = [];
    while (buffer.includes('\n') && !done) {
      const cut = buffer.indexOf('\n');
      const line = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 1);
      const stripped = line.trim();
      if (!stripped) { lines.push({ line, kind: 'blank', delta: null }); continue; }
      if (!stripped.startsWith('data:')) { lines.push({ line, kind: 'comment', delta: null }); continue; }
      const payload = removePrefix(stripped, 'data:').trim();
      if (payload === '[DONE]') { lines.push({ line, kind: 'done', delta: null }); done = true; break; }
      let event;
      try { event = JSON.parse(payload); } catch (error) { throw new Error(`chunk ${number}: malformed event '${payload}'`); }
      text += event.delta ?? '';
      if ('usage' in event) usage = event.usage;
      events += 1;
      parsedHere += 1;
      lines.push({ line, kind: 'usage' in event ? 'usage' : 'event', delta: event.delta ?? null });
    }
    log.push([number, chunk.length, parsedHere, buffer.length, text]);
    steps.push({ chunk: number, appended, lines, remaining: buffer, events_here: parsedHere, waiting: buffer.length, text });
  }
  if (!done) throw new Error(`stream ended without [DONE]; ${buffer.length} characters still waiting`);
  return { text, events, usage, log, steps };
}

// What shipped: each chunk parsed as one event.
export function shipped(chunks) {
  let delivered = '';
  for (let index = 0; index < chunks.length; index += 1) {
    const payload = removePrefix(chunks[index], 'data:').trim();
    try { delivered += JSON.parse(payload).delta ?? ''; } catch (error) { return { crashed_at: index + 1, delivered }; }
  }
  return { crashed_at: null, delivered };
}

export function buildTrace(data) {
  const result = readStream(data.chunks);
  return {
    chunks: data.chunks.map((chunk, index) => ({ number: index + 1, text: chunk, length: chunk.length })),
    steps: result.steps,
    text: result.text,
    events: result.events,
    shipped: shipped(data.chunks),
    practice: { usage: result.usage },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const CHUNK_BEAT = 2.4;
const APPEND_AT = 0.1, APPEND = 0.4;
const RELEASE_AT = 0.6, RELEASE_EACH = 0.3;
const OUTRO = 2.0;
const SHIPPED = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;

const quoted = (value) => `"${value}"`;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.chunks.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} network chunks of one streamed reply. A chunk can carry two events or half of one, so a reader needs a buffer: append the chunk, split off every complete line, keep the rest for the next chunk.`,
    captionLate: `What shipped parsed each chunk as one event. Chunk ${trace.shipped.crashed_at} was not one JSON document, so the stream died with ${quoted(trace.shipped.delivered)} delivered.` });
  t += INTRO;
  trace.steps.forEach((step, index) => {
    const chunk = trace.chunks[index];
    const deltas = step.lines.filter((line) => line.kind === 'event').map((line) => quoted(line.delta));
    const notes = [];
    if (!step.lines.length) notes.push(`no line break yet, so nothing is released and ${step.waiting} characters wait in the buffer`);
    else {
      const eventCount = deltas.length;
      if (eventCount) notes.push(`${eventCount} text event${eventCount > 1 ? 's' : ''}, ${deltas.join(' and ')}`);
      if (step.lines.some((line) => line.kind === 'comment')) notes.push('a keepalive comment, skipped');
      if (step.lines.some((line) => line.kind === 'usage')) notes.push('a usage event with no text');
      if (step.lines.some((line) => line.kind === 'done')) notes.push(`the end marker, so reading stops and the ${step.waiting} characters after it are never read`);
      else notes.push(`${step.waiting} waiting`);
    }
    const prefix = index > 0 && !trace.steps[index - 1].lines.length ? ' completes the split event:' : ':';
    beats.push({ kind: 'chunk', start: t, duration: CHUNK_BEAT, index,
      caption: `Chunk ${chunk.number} (${chunk.length} characters)${prefix} ${step.lines.length} line${step.lines.length === 1 ? '' : 's'} released, ${notes.join('; ')}. Text so far: ${quoted(step.text)}.` });
    t += CHUNK_BEAT;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `One string buffer, one split at the first line break, one loop while a line break is present: a reader independent of how the network cut the stream. ${trace.events} events, ${trace.text.length} characters of reply.` });
  t += OUTRO;
  beats.push({ kind: 'shipped', start: t, duration: SHIPPED,
    caption: `What shipped, on the same chunks: each chunk parsed as one JSON event. Chunk ${trace.shipped.crashed_at} held two events and was not valid JSON, so the browser received ${quoted(trace.shipped.delivered)} and then an error; chunk 3, half an event, would have failed the same way.` });
  t += SHIPPED;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: capture the usage event the provider sends before the end marker, so the gateway can bill without a second call.' });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `The usage event in chunk ${trace.steps.length} carries ${trace.practice.usage.output_tokens} output tokens. A membership test on the parsed event stores it, and the reader returns it as a fourth value; the text and the ${trace.events} events are unchanged.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'chunk', 'outro', 'shipped', 'practice-intro', 'practice'];

function afterLines(appended, count) {
  let remainder = appended;
  for (let i = 0; i < count; i += 1) remainder = remainder.slice(remainder.indexOf('\n') + 1);
  return remainder;
}

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);
  let consumed = 0;            // chunks fully processed
  let appending = 0;           // 0..1 glide of the current chunk into the buffer
  let releasedHere = 0;        // lines released from the current step
  if (beat.kind === 'chunk') {
    consumed = beat.index;
    appending = easeInOut(ramp(local, APPEND_AT, APPEND));
    const step = trace.steps[beat.index];
    releasedHere = Math.min(step.lines.length, Math.floor(Math.max(0, local - RELEASE_AT + 1e-9) / RELEASE_EACH));
    if (releasedHere >= step.lines.length && local >= RELEASE_AT + step.lines.length * RELEASE_EACH) consumed = beat.index + 1;
  } else if (stage > 1) consumed = trace.steps.length;
  const current = beat.kind === 'chunk' && consumed === beat.index ? beat.index : null;
  let buffer;
  if (current === null) buffer = consumed ? trace.steps[consumed - 1].remaining : '';
  else if (appending < 1) buffer = consumed ? trace.steps[consumed - 1].remaining : '';
  else buffer = afterLines(trace.steps[current].appended, releasedHere);
  const released = [];
  for (let i = 0; i < consumed; i += 1) released.push(...trace.steps[i].lines.map((line) => ({ ...line, chunk: i + 1 })));
  if (current !== null) released.push(...trace.steps[current].lines.slice(0, releasedHere).map((line) => ({ ...line, chunk: current + 1 })));
  let text = '';
  for (const line of released) if (line.kind === 'event') text += line.delta;
  const eventsSoFar = released.filter((line) => line.kind === 'event' || line.kind === 'usage').length;
  const finished = trace.steps.length;
  const chunks = trace.chunks.map((chunk, index) => ({
    ...chunk,
    state: index < consumed ? 'consumed' : (index === current ? (appending > 0 ? 'current' : 'next') : (index >= finished ? 'unread' : 'waiting')),
    appending: index === current ? appending : (index < consumed ? 1 : 0),
  }));
  const done = released.some((line) => line.kind === 'done');
  const shippedAlpha = beat.kind === 'shipped' ? easeInOut(ramp(local, 0.2, 0.6)) : (beat.kind === 'intro' && local >= INTRO_LATE_AT ? easeInOut(ramp(local, INTRO_LATE_AT, 0.6)) : 0);
  const practiceAlpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 0.8)) : (stage > 5 ? 1 : 0);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, chunks, buffer, released, text, eventsSoFar, consumed, current, done, shippedAlpha, practiceAlpha,
    waiting: buffer.length, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const STRIP_Y = 78, CHUNK_W = 118, CHUNK_H = 40, CHUNK_X0 = 28;
const BUF_X = 28, BUF_Y = 150, BUF_W = 470, BUF_H = 150;
const LOG_X = 522, LOG_Y = 150, LOG_W = 350, LOG_H = 240;
const OUT_Y = 328;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const visible = (text) => text.replace(/\n/g, '⏎');

function wrap(text, width) {
  const lines = [];
  for (let i = 0; i < text.length; i += width) lines.push(text.slice(i, i + width));
  return lines;
}

export function drawScene(ctx, scene, trace) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText('a line buffer over network chunks: append, split off complete lines, keep the rest', 28, 36);

  // The arrival strip.
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('network chunks in arrival order', CHUNK_X0, STRIP_Y - 12);
  for (const chunk of scene.chunks) {
    const x = CHUNK_X0 + (chunk.number - 1) * (CHUNK_W + 10);
    const lift = chunk.state === 'current' ? -6 * Math.sin(Math.PI * Math.min(1, chunk.appending)) : 0;
    ctx.globalAlpha = chunk.state === 'consumed' ? 0.45 : (chunk.state === 'unread' ? 0.3 : 1);
    ctx.fillStyle = chunk.state === 'current' ? BLUE : PANEL;
    rounded(ctx, x, STRIP_Y + lift, CHUNK_W, CHUNK_H, 5); ctx.fill();
    ctx.fillStyle = chunk.state === 'current' ? BG : INK;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`chunk ${chunk.number}`, x + 8, STRIP_Y + lift + 16);
    ctx.fillStyle = chunk.state === 'current' ? BG : DIM;
    ctx.font = `9.5px ${MONO}`;
    ctx.fillText(chunk.state === 'unread' ? 'never read' : `${chunk.length} chars`, x + 8, STRIP_Y + lift + 31);
    ctx.globalAlpha = 1;
  }

  // The buffer.
  ctx.fillStyle = PANEL;
  rounded(ctx, BUF_X, BUF_Y, BUF_W, BUF_H, 6); ctx.fill();
  ctx.strokeStyle = scene.current !== null ? BLUE : LINE;
  rounded(ctx, BUF_X, BUF_Y, BUF_W, BUF_H, 6); ctx.stroke();
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(`buffer: ${scene.waiting} characters waiting${scene.done ? ' (unread after the end marker)' : ''}`, BUF_X + 12, BUF_Y + 18);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = scene.done ? DIM : INK;
  wrap(visible(scene.buffer), 52).slice(0, 7).forEach((line, index) => ctx.fillText(line, BUF_X + 12, BUF_Y + 40 + index * 15));

  // The released lines.
  ctx.fillStyle = PANEL;
  rounded(ctx, LOG_X, LOG_Y, LOG_W, LOG_H, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, LOG_X, LOG_Y, LOG_W, LOG_H, 6); ctx.stroke();
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(`lines released: ${scene.released.length}, events ${scene.eventsSoFar}`, LOG_X + 12, LOG_Y + 18);
  const shown = scene.released.slice(-13);
  shown.forEach((line, index) => {
    const y = LOG_Y + 36 + index * 15;
    const colour = line.kind === 'event' ? GREEN : (line.kind === 'done' ? AMBER : (line.kind === 'usage' ? BLUE : DIM));
    ctx.fillStyle = colour;
    ctx.fillText(line.kind, LOG_X + 12, y);
    ctx.fillStyle = line.kind === 'event' ? INK : DIM;
    const detail = line.kind === 'event' ? `delta ${JSON.stringify(line.delta)}` : (line.kind === 'blank' ? '(separator)' : line.line.trim().slice(0, 32));
    ctx.fillText(detail, LOG_X + 80, y);
  });

  // The assembled reply.
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('reply assembled from the deltas', BUF_X, OUT_Y - 6);
  ctx.fillStyle = PANEL;
  rounded(ctx, BUF_X, OUT_Y, BUF_W, 34, 6); ctx.fill();
  ctx.strokeStyle = GREEN;
  rounded(ctx, BUF_X, OUT_Y, BUF_W, 34, 6); ctx.stroke();
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(scene.text, BUF_X + 12, OUT_Y + 22);
  if (scene.shippedAlpha > 0) {
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = RED;
    ctx.fillText(`what shipped: crashed at chunk ${trace.shipped.crashed_at}, delivered only`, BUF_X, OUT_Y + 58);
    ctx.fillStyle = PANEL;
    rounded(ctx, BUF_X, OUT_Y + 64, BUF_W, 30, 6); ctx.fill();
    ctx.strokeStyle = RED;
    rounded(ctx, BUF_X, OUT_Y + 64, BUF_W, 30, 6); ctx.stroke();
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = RED;
    ctx.fillText(`${trace.shipped.delivered}▌`, BUF_X + 12, OUT_Y + 84);
    ctx.globalAlpha = 1;
  }
  if (scene.practiceAlpha > 0) {
    ctx.globalAlpha = scene.practiceAlpha;
    ctx.fillStyle = BLUE;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`usage captured: ${trace.practice.usage.output_tokens} output tokens`, LOG_X, OUT_Y + 84);
    ctx.globalAlpha = 1;
  }
}
