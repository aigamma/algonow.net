// The lesson's animation, without a DOM: the same brace walk, parse, and
// validation as solution.py on the same six replies (python/fixtures/replies.json),
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code. JSON.parse stands
// in for json.loads on the extracted span; the fixture pins every outcome.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it
export const COLUMNS = 80;             // characters per strip row

// ------------------------------------------------------------ the functions

// find_json_span from solution.py, recording the depth and the string flag
// after every character, the braces ignored inside strings, and the span.
export function walkTrace(text) {
  let depth = 0;
  let start = null;
  let inString = false;
  let escaped = false;
  let span = null;
  const depths = [];
  const flags = [];
  const ignored = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (span !== null) { depths.push(0); flags.push(0); continue; }
    if (depth === 0) {
      if (char === '{') { start = index; depth = 1; }
    } else if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      else if (char === '{' || char === '}') ignored.push(index);
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) span = [start, index];
    }
    depths.push(depth);
    flags.push(inString ? 1 : 0);
  }
  return { depths, in_string: flags, ignored_braces: ignored, span };
}

export function findJsonSpan(text) {
  return walkTrace(text).span;
}

// validate from solution.py: the first problem, or null.
export function validate(record, requiredKeys, range) {
  for (const key of requiredKeys) if (!(key in record)) return `missing key ${key}`;
  if (typeof record.intent !== 'string' || record.intent === '') return 'intent must be a non-empty string';
  const priority = record.priority;
  if (typeof priority === 'boolean' || !Number.isInteger(priority) || priority < range[0] || priority > range[1]) {
    return `priority must be an integer from ${range[0]} to ${range[1]}`;
  }
  if (!Array.isArray(record.tags)) return 'tags must be a list of strings';
  for (const tag of record.tags) if (typeof tag !== 'string') return 'tags must be a list of strings';
  return null;
}

function tryParse(candidate) {
  try { return JSON.parse(candidate); } catch { return undefined; }
}

// parse_reply from solution.py (repair = false) and from practice_answer.py (repair = true).
export function parseReply(text, requiredKeys, range, repair = false) {
  const span = findJsonSpan(text);
  if (span === null) return { record: null, reason: 'no object' };
  const candidate = text.slice(span[0], span[1] + 1);
  let record = tryParse(candidate);
  let note = null;
  if (record === undefined) {
    if (!repair) return { record: null, reason: 'invalid json' };
    record = tryParse(repairTrailingCommas(candidate));
    if (record === undefined) return { record: null, reason: 'invalid json' };
    note = 'repaired a trailing comma';
  }
  const problem = validate(record, requiredKeys, range);
  if (problem !== null) return { record: null, reason: problem };
  return { record, reason: note };
}

// repair_trailing_commas from practice_answer.py.
export function repairTrailingCommas(candidate) {
  let repaired = '';
  for (let index = 0; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (char === ',') {
      const rest = candidate.slice(index + 1).replace(/^\s+/, '');
      if (rest.startsWith('}') || rest.startsWith(']')) continue;
    }
    repaired += char;
  }
  return repaired;
}

export function buildTrace(data) {
  const keys = data.required_keys;
  const range = data.priority_range;
  const replies = [];
  const reasons = {};
  const naive = { parses: [], raises: [], schema_invalid_parsed: [] };
  for (const reply of data.replies) {
    const walk = walkTrace(reply.text);
    const { record, reason } = parseReply(reply.text, keys, range);
    replies.push({ id: reply.id, length: reply.text.length, ...walk, outcome: record ? 'accepted' : 'rejected', reason, record });
    if (!record) (reasons[reason] = reasons[reason] || []).push(reply.id);
    const whole = tryParse(reply.text);
    if (whole === undefined) naive.raises.push(reply.id);
    else {
      naive.parses.push(reply.id);
      if (validate(whole, keys, range) !== null) naive.schema_invalid_parsed.push(reply.id);
    }
  }
  const six = data.replies.find((reply) => reply.id === 'r6');
  const span = findJsonSpan(six.text);
  const candidate = six.text.slice(span[0], span[1] + 1);
  let commaIndex = null;
  for (let index = 0; index < candidate.length; index += 1) {
    const rest = candidate.slice(index + 1).replace(/^\s+/, '');
    if (candidate[index] === ',' && (rest.startsWith('}') || rest.startsWith(']'))) commaIndex = span[0] + index;
  }
  const practiced = parseReply(six.text, keys, range, true);
  let practiceAccepted = 0;
  for (const reply of data.replies) if (parseReply(reply.text, keys, range, true).record) practiceAccepted += 1;
  const accepted = replies.filter((entry) => entry.outcome === 'accepted').length;
  return {
    replies,
    counts: { accepted, rejected: replies.length - accepted },
    reasons,
    practice: { id: 'r6', comma_index: commaIndex, repaired_candidate: repairTrailingCommas(candidate), note: practiced.reason, record: practiced.record,
      counts: { accepted: practiceAccepted, rejected: replies.length - practiceAccepted } },
    naive,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each reply gets a cursor walk
// over its characters, the checks ticking one by one, and the verdict to read;
// the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const REPLY_BEAT = 3.4;
const WALK_AT = 0.2;
const WALK = 1.4;
const CHECKS_AT = 1.8;
const CHECK_GAP = 0.12;
const STAMP_AT = 2.5;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

export const CHECK_LABELS = ['object closes', 'json parses', 'intent is text', 'priority 1 to 3', 'tags is a list'];

function captionFor(entry) {
  const [start, end] = entry.span || [null, null];
  if (entry.outcome === 'accepted') {
    if (entry.id === 'r1') return `${entry.id}: a clean object; the first brace opens at ${start} and the object closes at ${end} (${entry.length} characters, depth never above 1): json parses, every check passes, accepted.`;
    if (entry.id === 'r2') return `${entry.id}: a code fence; the fence characters before position ${start} are skipped, the object closes at ${end}: parses, passes, accepted.`;
    return `${entry.id}: prose before and after; the object opens at ${start}, the braces at ${entry.ignored_braces.join(' and ')} sit inside a string and do not count, it closes at ${end}: parses, passes, accepted.`;
  }
  if (entry.reason === 'no object') return `${entry.id}: the reply stops at ${entry.length - 1} before the object closes; depth never returns to 0, so there is no object: rejected (no object).`;
  if (entry.reason === 'invalid json') return `${entry.id}: the object closes at ${end}, but the comma before the closing brace is not valid JSON: rejected (invalid json).`;
  return `${entry.id}: the object closes at ${end} and parses, but priority is the text high, not an integer from 1 to 3: rejected (${entry.reason}).`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.replies.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} replies from the model, each supposed to be one JSON object with intent, priority, and tags. The service parsed the whole reply.`,
    captionLate: `What shipped: json.loads on the whole reply parses ${trace.naive.parses.length} of the ${n} (${trace.naive.parses.join(', ')}), raises on ${trace.naive.raises.length}, and passes ${trace.naive.schema_invalid_parsed.join(', ')}'s text priority downstream.` });
  t += INTRO;
  trace.replies.forEach((entry, index) => {
    beats.push({ kind: 'reply', start: t, duration: REPLY_BEAT, index, caption: captionFor(entry) });
    t += REPLY_BEAT;
  });
  const acceptedIds = trace.replies.filter((entry) => entry.outcome === 'accepted').map((entry) => entry.id);
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `accepted ${trace.counts.accepted} (${acceptedIds.join(', ')}), rejected ${trace.counts.rejected}, each with a named reason: ${Object.keys(trace.reasons).join('; ')}.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: drop a comma whose next non-space character is a closing brace or bracket, then parse again.' });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${p.id}: the comma at position ${p.comma_index} is dropped, the second parse succeeds, every check passes: accepted (${p.note}); accepted ${p.counts.accepted}, rejected ${p.counts.rejected}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// Which checks an entry passes, in order, and where it fails (null when accepted).
function checkStates(entry, upTo) {
  const failAt = entry.outcome === 'accepted' ? -1
    : entry.reason === 'no object' ? 0
      : entry.reason === 'invalid json' ? 1
        : entry.reason.startsWith('intent') ? 2
          : entry.reason.startsWith('priority') ? 3 : 4;
  return CHECK_LABELS.map((label, index) => {
    let state = 'pending';
    if (index < upTo) {
      if (failAt === -1 || index < failAt) state = 'ok';
      else if (index === failAt) state = 'fail';
    }
    return { label, state };
  });
}

function replyView(entry, text, cursor) {
  return {
    id: entry.id, text, length: entry.length, cursor,
    depth: cursor > 0 ? entry.depths[Math.min(cursor, entry.length) - 1] : 0,
    spanStart: entry.span ? entry.span[0] : null, spanEnd: entry.span ? entry.span[1] : null,
    closed: Boolean(entry.span) && cursor > entry.span[1],
    inString: entry.in_string, ignored: entry.ignored_braces.filter((position) => position < cursor),
  };
}

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const textOf = (id) => data.replies.find((reply) => reply.id === id).text;
  const kinds = timeline.beats.map((b) => b.kind);
  const firstReply = kinds.indexOf('reply');
  const lastReply = kinds.lastIndexOf('reply');
  const practiceBeat = kinds.indexOf('practice');

  // Outcomes settled so far, for the tally chips.
  const settled = trace.replies.map((entry, index) => {
    const replyBeatIndex = firstReply + index;
    if (beatIndex > replyBeatIndex) return entry.outcome;
    if (beatIndex === replyBeatIndex && local >= STAMP_AT) return entry.outcome;
    return 'pending';
  });
  if (beatIndex >= practiceBeat && local >= (beat.kind === 'practice' ? 2.4 : 0)) settled[5] = 'accepted';
  const tally = {
    accepted: settled.filter((state) => state === 'accepted').length,
    rejected: settled.filter((state) => state === 'rejected').length,
    chips: trace.replies.map((entry, index) => ({ id: entry.id, state: settled[index] })),
  };

  let reply = null;
  let checklist = checkStates(trace.replies[0], 0);
  let stamp = null;
  let intro = null;
  let practice = null;
  if (beat.kind === 'intro') {
    intro = { alpha: ramp(local, 0.1, 0.6), previews: data.replies.map((item) => ({ id: item.id, text: item.text.replace(/\n/g, '⏎').slice(0, 58) })) };
  } else if (beat.kind === 'reply') {
    const entry = trace.replies[beat.index];
    const progress = easeInOut(ramp(local, WALK_AT, WALK));
    const cursor = Math.round(progress * entry.length);
    reply = replyView(entry, textOf(entry.id), cursor);
    const upTo = local < CHECKS_AT ? 0 : Math.min(CHECK_LABELS.length, Math.floor((local - CHECKS_AT) / CHECK_GAP) + 1);
    checklist = checkStates(entry, upTo);
    if (local >= STAMP_AT) {
      stamp = entry.outcome === 'accepted'
        ? { kind: 'accepted', text: `${entry.id}: accepted`, detail: `intent ${entry.record.intent}, priority ${entry.record.priority}, tags ${entry.record.tags.join(', ')}` }
        : { kind: 'rejected', text: `${entry.id}: rejected`, detail: entry.reason };
    }
  } else if (beat.kind === 'outro' || beat.kind === 'practice-intro') {
    const entry = trace.replies[lastReply - firstReply];
    reply = replyView(entry, textOf(entry.id), entry.length);
    checklist = checkStates(entry, CHECK_LABELS.length);
    stamp = { kind: 'summary', text: `${trace.counts.accepted} accepted, ${trace.counts.rejected} rejected`, detail: 'every rejection names its reason' };
  } else {
    const entry = trace.replies[5];
    reply = replyView(entry, textOf(entry.id), entry.length);
    const removed = local >= 1.2;
    practice = { commaIndex: trace.practice.comma_index, commaAlpha: removed ? 1 - ramp(local, 1.2, 0.5) : ramp(local, 0.3, 0.4), removed };
    const upTo = local < 1.6 ? 0 : Math.min(CHECK_LABELS.length, Math.floor((local - 1.6) / CHECK_GAP) + 1);
    checklist = checkStates({ outcome: 'accepted', reason: null }, upTo);
    if (local >= 2.4) {
      const record = trace.practice.record;
      stamp = { kind: 'accepted', text: `${entry.id}: accepted (${trace.practice.note})`, detail: `intent ${record.intent}, priority ${record.priority}, tags ${record.tags.join(', ')}` };
    }
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, reply, checklist, stamp, tally, intro, practice, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const SX = 40, SY = 90, CHAR_W = 7.6, ROW_H = 24;        // the character strip
const PX0 = 28, PY0 = 62, PW = 648, PH = 76;               // the strip panel

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const cellX = (index) => SX + (index % COLUMNS) * CHAR_W;
const cellY = (index) => SY + Math.floor(index / COLUMNS) * ROW_H;

function drawStrip(ctx, reply, practice) {
  ctx.fillStyle = PANEL;
  rounded(ctx, PX0, PY0, PW, PH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, PX0, PY0, PW, PH, 6); ctx.stroke();
  if (!reply) {
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('the reply, one character per cell', SX, SY);
    return;
  }
  ctx.font = `12px ${MONO}`;
  for (let index = 0; index < reply.length; index += 1) {
    const x = cellX(index);
    const y = cellY(index);
    const walked = index < reply.cursor;
    if (walked && reply.inString[index] === 1) {
      ctx.fillStyle = 'rgba(93, 162, 255, 0.18)';
      ctx.fillRect(x, y - 13, CHAR_W, 17);
    }
    if (practice && index === practice.commaIndex) {
      ctx.fillStyle = `rgba(224, 103, 103, ${0.25 + 0.5 * practice.commaAlpha})`;
      ctx.fillRect(x - 1, y - 14, CHAR_W + 2, 19);
    }
    let char = reply.text[index];
    if (char === '\n') char = '⏎';
    if (practice && practice.removed && index === practice.commaIndex) char = ' ';
    ctx.fillStyle = walked ? INK : DIM;
    ctx.globalAlpha = walked ? 1 : 0.45;
    ctx.fillText(char, x + 0.5, y);
    ctx.globalAlpha = 1;
    if (reply.ignored.includes(index)) {
      ctx.strokeStyle = AMBER;
      ctx.strokeRect(x + 0.5, y - 13.5, CHAR_W - 1, 17);
    }
  }
  if (reply.closed) {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    for (let index = reply.spanStart; index <= reply.spanEnd; index += 1) {
      if (index % COLUMNS === 0 || index === reply.spanStart) ctx.beginPath(), ctx.moveTo(cellX(index), cellY(index) + 5);
      ctx.lineTo(cellX(index) + CHAR_W, cellY(index) + 5);
      if ((index + 1) % COLUMNS === 0 || index === reply.spanEnd) ctx.stroke();
    }
    ctx.lineWidth = 1;
  }
  if (reply.cursor < reply.length) {
    ctx.fillStyle = AMBER;
    ctx.fillRect(cellX(reply.cursor) - 1, cellY(reply.cursor) - 15, 2, 20);
  }
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText('find the first balanced object, parse only that span, then check the keys and the types', 28, 36);

  drawStrip(ctx, scene.reply, scene.practice);

  // Depth meter beside the strip.
  ctx.fillStyle = PANEL;
  rounded(ctx, 696, PY0, 64, PH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, 696, PY0, 64, PH, 6); ctx.stroke();
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('depth', 706, PY0 + 16);
  const depth = scene.reply ? scene.reply.depth : 0;
  for (let level = 0; level < 3; level += 1) {
    ctx.fillStyle = level < depth ? BLUE : LINE;
    ctx.fillRect(706, PY0 + 60 - level * 12, 28, 9);
  }
  ctx.fillStyle = INK;
  ctx.font = `12px ${MONO}`;
  ctx.fillText(String(depth), 742, PY0 + 68);

  // Checklist.
  ctx.fillStyle = PANEL;
  rounded(ctx, 696, 150, 176, 138, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, 696, 150, 176, 138, 6); ctx.stroke();
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('checks, in order', 708, 168);
  ctx.font = `11.5px ${MONO}`;
  scene.checklist.forEach((item, index) => {
    const y = 190 + index * 20;
    ctx.fillStyle = item.state === 'pending' ? DIM : INK;
    ctx.globalAlpha = item.state === 'pending' ? 0.55 : 1;
    ctx.fillText(item.label, 708, y);
    ctx.globalAlpha = 1;
    if (item.state !== 'pending') {
      ctx.fillStyle = item.state === 'ok' ? GREEN : RED;
      ctx.textAlign = 'right';
      ctx.fillText(item.state, 862, y);
      ctx.textAlign = 'left';
    }
  });

  // Intro previews, or the verdict stamp.
  if (scene.intro) {
    ctx.globalAlpha = scene.intro.alpha;
    ctx.font = `11.5px ${MONO}`;
    scene.intro.previews.forEach((preview, index) => {
      const y = 170 + index * 20;
      ctx.fillStyle = INK;
      ctx.fillText(preview.id, 40, y);
      ctx.fillStyle = DIM;
      ctx.fillText(preview.text, 72, y);
    });
    ctx.globalAlpha = 1;
  }
  if (scene.stamp) {
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = scene.stamp.kind === 'rejected' ? RED : scene.stamp.kind === 'accepted' ? GREEN : INK;
    ctx.fillText(scene.stamp.text, 40, 176);
    ctx.font = `11.5px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText(scene.stamp.detail, 40, 198);
  }

  // Tally with one chip per reply.
  ctx.fillStyle = PANEL;
  rounded(ctx, PX0, 300, 648, 70, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, PX0, 300, 648, 70, 6); ctx.stroke();
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`accepted ${scene.tally.accepted}   rejected ${scene.tally.rejected}`, 40, 324);
  scene.tally.chips.forEach((chip, index) => {
    const x = 40 + index * 56;
    ctx.fillStyle = chip.state === 'accepted' ? GREEN : chip.state === 'rejected' ? RED : LINE;
    rounded(ctx, x, 336, 46, 22, 4); ctx.fill();
    ctx.fillStyle = chip.state === 'pending' ? DIM : BG;
    ctx.textAlign = 'center';
    ctx.fillText(chip.id, x + 23, 351);
    ctx.textAlign = 'left';
  });

  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('shaded: inside a string   amber box: a brace that did not count   blue underline: the span handed to the parser', 40, 400);
}
