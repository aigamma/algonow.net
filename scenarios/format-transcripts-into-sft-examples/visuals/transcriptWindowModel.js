// The lesson's animation, without a DOM: the same group, sort, walk, and
// window as solution.py, run on the same nine rows (python/fixtures/turns.json),
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const words = (text) => text.split(/\s+/).filter((w) => w !== '').length;   // len(text.split())

// group_turns from solution.py: first-seen order of conversations, turns sorted by index.
export function groupTurns(rows) {
  const conversations = new Map();
  for (const row of rows) {
    if (!conversations.has(row.conversation)) conversations.set(row.conversation, []);
    conversations.get(row.conversation).push(row);
  }
  for (const [id, turns] of conversations) {
    turns.sort((a, b) => a.turn - b.turn);
    for (let position = 1; position < turns.length; position += 1) {
      if (turns[position].turn === turns[position - 1].turn) throw new Error(`conversation '${id}' has two turns with index ${turns[position].turn}`);
    }
  }
  return conversations;
}

// build_examples from solution.py; with a system message and a minimum word
// count it is the practice answer.
export function buildExamples(rows, maxHistory, { system = null, minWords = 0 } = {}) {
  const examples = [];
  let skipped = 0;
  for (const [id, turns] of groupTurns(rows)) {
    turns.forEach((turn, position) => {
      if (turn.role !== 'assistant') return;
      if (turn.text === '' || words(turn.text) < minWords) { skipped += 1; return; }
      const start = Math.max(0, position - maxHistory);
      const context = system === null ? [] : [{ role: 'system', text: system }];
      for (const earlier of turns.slice(start, position)) context.push({ role: earlier.role, text: earlier.text });
      examples.push({ conversation: id, turn: turn.turn, context, target: turn.text });
    });
  }
  return { examples, skipped };
}

// What shipped: one example per conversation, the whole transcript as context.
export function lastTurnExamples(rows) {
  const examples = [];
  for (const [id, turns] of groupTurns(rows)) {
    let last = -1;
    turns.forEach((turn, position) => { if (turn.role === 'assistant' && turn.text !== '') last = position; });
    if (last >= 0) examples.push({ conversation: id, turn: turns[last].turn, context_size: last });
  }
  return examples;
}

function walk(conversations, maxHistory, skipReason) {
  const records = [];
  for (const [id, turns] of conversations) {
    turns.forEach((turn, position) => {
      if (turn.role !== 'assistant') return;
      const count = words(turn.text);
      const skippedAs = skipReason(turn.text, count);
      const start = Math.max(0, position - maxHistory);
      const record = { conversation: id, position, turn: turn.turn, words: count, decision: skippedAs || 'example', start, context_size: 0, dropped: 0 };
      if (!skippedAs) { record.context_size = position - start; record.dropped = start; }
      records.push(record);
    });
  }
  return records;
}

export function buildTrace(data) {
  const { rows, max_history: maxHistory, system, min_target_words: minWords } = data;
  const conversations = groupTurns(rows);
  const worked = buildExamples(rows, maxHistory);
  const practice = buildExamples(rows, maxHistory, { system, minWords });
  const shipped = lastTurnExamples(rows);
  const conversationsOut = {};
  for (const [id, turns] of conversations) conversationsOut[id] = turns.map((t) => ({ turn: t.turn, role: t.role, text: t.text }));
  return {
    max_history: maxHistory,
    conversations: conversationsOut,
    walk: walk(conversations, maxHistory, (text) => (text === '' ? 'skipped-empty' : null)),
    examples: worked.examples,
    skipped: worked.skipped,
    practice: {
      system, min_target_words: minWords,
      walk: walk(conversations, maxHistory, (text, count) => (count < minWords ? (text === '' ? 'skipped-empty' : 'skipped-short') : null)),
      examples: practice.examples, skipped: practice.skipped,
    },
    shipped: { examples: shipped, max_context: Math.max(...shipped.map((e) => e.context_size)) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. The run plays as an intro, a
// sort, one beat per assistant turn, an outro, and the practice; about twenty
// five seconds in all.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;
const SORT = 2.8;
const WALK = 3.0;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

const short = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const shippedC1 = trace.shipped.examples.find((e) => e.conversation === 'c1');
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${data.rows.length} rows from the export: conversation, turn, role, text. Two conversations are interleaved and c1 arrives with turn 5 before turn 4.`,
    captionLate: `What shipped: one example per conversation, the whole transcript as context. ${trace.shipped.examples.length} examples, and c1's context held ${shippedC1.context_size} turns, over the window of ${trace.max_history}; the answer at turn 2 was never a target.` });
  t += INTRO;
  beats.push({ kind: 'sort', start: t, duration: SORT,
    caption: `group_turns: a dictionary of lists, one per conversation, each sorted by turn index with a key function. c1 has ${trace.conversations.c1.length} turns, c2 has ${trace.conversations.c2.length}.` });
  t += SORT;
  let number = 0;
  trace.walk.forEach((record, index) => {
    let caption;
    if (record.decision === 'example') {
      number += 1;
      const example = trace.examples[number - 1];
      const earlier = record.position;
      caption = `${record.conversation} turn ${record.turn}: ${earlier} earlier turn${earlier === 1 ? '' : 's'}, window ${trace.max_history}, so the context holds ${record.context_size}${record.dropped ? ` and turn 1 falls outside the window` : ''}. Target: "${short(example.target, 52)}". Example ${number}.`;
    } else {
      caption = `${record.conversation} turn ${record.turn}: the assistant text is empty, so it is skipped as a target. It stays in later contexts as the conversation happened.`;
    }
    beats.push({ kind: 'walk', start: t, duration: WALK, record, number: record.decision === 'example' ? number : null, index, caption });
    t += WALK;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.examples.length} examples, ${trace.skipped} skipped. The longest context has ${trace.max_history} turns, the window; what shipped made ${trace.shipped.examples.length} examples, one with ${trace.shipped.max_context} turns of context.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: a system message first in every context, and a target shorter than ${trace.practice.min_target_words} words is skipped.` });
  t += PRACTICE_INTRO;
  const shortOne = trace.practice.walk.find((r) => r.decision === 'skipped-short');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `With the system message first, every context grows by one entry; ${shortOne.conversation} turn ${shortOne.turn} has ${shortOne.words} words and is skipped. ${trace.practice.examples.length} examples, ${trace.practice.skipped} skipped.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (a, b, p) => a + (b - a) * p;

const LIST_X = 28, LIST_Y0 = 78, LIST_H = 21;        // the flat rows in export order
const LANE_X = 92, LANE_Y = { c1: 318, c2: 404 }, CHIP_W = 56, CHIP_GAP = 8, CHIP_H = 30;
const CARD_X = 470, CARD_Y0 = 74, CARD_W = 402, CARD_H = 96, CARD_GAP = 10;

const laneSlot = (conversation, position) => ({ x: LANE_X + position * (CHIP_W + CHIP_GAP), y: LANE_Y[conversation] });

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const sortBeat = kinds.indexOf('sort');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const positionIn = {};
  for (const [id, turns] of Object.entries(trace.conversations)) turns.forEach((turn, position) => { positionIn[`${id}:${turn.turn}`] = position; });

  // Rows: a list in export order, gliding into their lane slots during the sort.
  const rows = data.rows.map((row, index) => {
    const listPos = { x: LIST_X, y: LIST_Y0 + index * LIST_H };
    const slot = laneSlot(row.conversation, positionIn[`${row.conversation}:${row.turn}`]);
    let p = 0;
    if (beatIndex > sortBeat) p = 1;
    else if (beat.kind === 'sort') p = easeInOut(ramp(local, 0.2 + index * 0.15, 0.8));
    const alpha = beat.kind === 'intro' ? ramp(local, 0.15 + index * 0.18, 0.4) : 1;
    return { ...row, index, x: lerp(listPos.x, slot.x, p), y: lerp(listPos.y, slot.y, p), lane: p, alpha, highlight: null };
  });

  // The walk: a window bracket on the lane and a highlighted target chip.
  let window = null;
  let target = null;
  const cards = [];
  let skipNote = null;
  const counts = { examples: 0, skipped: 0 };
  const walkBeats = timeline.beats.filter((b) => b.kind === 'walk');
  walkBeats.forEach((wb) => {
    const done = wb.start + wb.duration <= t;
    const active = beat === wb;
    if (!done && !active) return;
    const r = wb.record;
    const reveal = active ? ramp(local, 0.2, 0.6) : 1;
    const cardReveal = active ? ramp(local, 1.0, 0.7) : 1;
    if (r.decision === 'example') {
      if (done || cardReveal > 0) counts.examples = Math.max(counts.examples, wb.number);
      const example = trace.examples[wb.number - 1];
      cards.push({ number: wb.number, conversation: r.conversation, turn: r.turn, contextSize: r.context_size, dropped: r.dropped,
        roles: example.context.map((m) => m.role), target: example.target, alpha: cardReveal, slotIndex: cards.length });
      if (active) {
        window = { conversation: r.conversation, start: r.start, end: r.position, alpha: reveal };
        target = { conversation: r.conversation, position: r.position, kind: 'example', alpha: reveal };
      }
    } else {
      if (done || reveal > 0) counts.skipped = 1;
      if (active) {
        target = { conversation: r.conversation, position: r.position, kind: 'skip', alpha: reveal };
        skipNote = { text: `${r.conversation} turn ${r.turn}: empty, skipped as a target`, alpha: ramp(local, 0.9, 0.6) };
      } else skipNote = { text: `${r.conversation} turn ${r.turn}: empty, skipped as a target`, alpha: 1 };
    }
  });
  if (beatIndex >= outroBeat) { counts.examples = trace.examples.length; counts.skipped = trace.skipped; }

  // The practice: a system entry on every card, the short answer's card fades.
  let practice = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const p = beat.kind === 'practice' ? ramp(local, 0.3, 0.8) : 1;
    const shortOne = trace.practice.walk.find((r) => r.decision === 'skipped-short');
    practice = { systemAlpha: p, shortConversation: shortOne.conversation, shortTurn: shortOne.turn, shortWords: shortOne.words, fade: p,
      examples: trace.practice.examples.length, skipped: trace.practice.skipped };
    for (const card of cards) if (card.conversation === shortOne.conversation && card.turn === shortOne.turn) card.alpha = 1 - 0.65 * p;
    counts.examples = Math.round(lerp(trace.examples.length, trace.practice.examples.length, p));
    counts.skipped = Math.round(lerp(trace.skipped, trace.practice.skipped, p));
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, window, target, cards, skipNote, counts, practice,
    maxHistory: trace.max_history, lanes: Object.keys(trace.conversations), sorted: beatIndex > sortBeat || (beat.kind === 'sort' && local > 1.6), finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const roleColor = (role) => (role === 'assistant' ? BLUE : role === 'system' ? AMBER : DIM);

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`transcript rows to fine-tuning examples: ${scene.rows.length} rows, window ${scene.maxHistory} turns`, 28, 36);

  // Lane labels (visible once sorting begins).
  if (scene.sorted || scene.rows.some((r) => r.lane > 0)) {
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('conversations in turn order', LIST_X, LANE_Y.c1 - 28);
    for (const id of scene.lanes) { ctx.fillStyle = INK; ctx.fillText(id, LIST_X + 4, LANE_Y[id] + 19); }
  } else {
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('rows in export order (conversation, turn, role, text)', LIST_X, LIST_Y0 - 14);
  }

  // The window bracket under the chips it covers.
  if (scene.window && scene.window.alpha > 0) {
    const a = laneSlot(scene.window.conversation, scene.window.start);
    const b = laneSlot(scene.window.conversation, scene.window.end - 1);
    ctx.save();
    ctx.globalAlpha = scene.window.alpha;
    ctx.strokeStyle = GREEN;
    ctx.setLineDash([4, 3]);
    rounded(ctx, a.x - 4, a.y - 5, (b.x + CHIP_W) - a.x + 8, CHIP_H + 10, 6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`context: ${scene.window.end - scene.window.start} of ${scene.maxHistory}`, a.x, a.y - 10);
    ctx.restore();
  }

  // Rows: list lines becoming lane chips.
  for (const row of scene.rows) {
    if (row.alpha <= 0) continue;
    ctx.globalAlpha = row.alpha;
    const isTarget = scene.target && scene.target.conversation === row.conversation && scene.target.position === scene.rows.filter((r) => r.conversation === row.conversation && r.turn < row.turn).length;
    const chipAlpha = row.lane;
    if (chipAlpha < 1) {
      ctx.globalAlpha = row.alpha * (1 - chipAlpha);
      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = roleColor(row.role);
      ctx.fillText(`${row.conversation}  turn ${row.turn}  ${row.role.padEnd(9)}`, row.x, row.y + 14);
      ctx.fillStyle = INK;
      ctx.fillText(short(row.text === '' ? '(empty)' : row.text, 30), row.x + 190, row.y + 14);
    }
    if (chipAlpha > 0) {
      ctx.globalAlpha = row.alpha * chipAlpha;
      const color = isTarget ? (scene.target.kind === 'skip' ? RED : GREEN) : roleColor(row.role);
      ctx.fillStyle = PANEL;
      rounded(ctx, row.x, row.y, CHIP_W, CHIP_H, 5); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isTarget ? 2 : 1;
      rounded(ctx, row.x, row.y, CHIP_W, CHIP_H, 5); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(`t${row.turn} ${row.role === 'assistant' ? 'asst' : 'user'}`, row.x + CHIP_W / 2, row.y + 13);
      ctx.fillStyle = row.text === '' ? RED : DIM;
      ctx.fillText(row.text === '' ? 'empty' : `${words(row.text)}w`, row.x + CHIP_W / 2, row.y + 25);
      ctx.textAlign = 'left';
    }
  }
  ctx.globalAlpha = 1;

  // Example cards on the right.
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('examples (context, then target)', CARD_X, CARD_Y0 - 12);
  for (const card of scene.cards) {
    if (card.alpha <= 0) continue;
    const y = CARD_Y0 + card.slotIndex * (CARD_H + CARD_GAP);
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, CARD_X, y, CARD_W, CARD_H, 6); ctx.fill();
    ctx.strokeStyle = LINE;
    rounded(ctx, CARD_X, y, CARD_W, CARD_H, 6); ctx.stroke();
    ctx.font = `11.5px ${MONO}`;
    ctx.fillStyle = INK;
    const extra = scene.practice ? 1 : 0;
    ctx.fillText(`example ${card.number}: ${card.conversation} turn ${card.turn}, context ${card.contextSize + extra}${card.dropped ? ` (turn 1 outside the window)` : ''}`, CARD_X + 12, y + 20);
    const roles = scene.practice ? ['system', ...card.roles] : card.roles;
    let x = CARD_X + 12;
    roles.forEach((role, i) => {
      const isSystem = role === 'system';
      ctx.globalAlpha = card.alpha * (isSystem ? scene.practice.systemAlpha : 1);
      const w = 64;
      ctx.fillStyle = BG;
      rounded(ctx, x, y + 32, w, 18, 4); ctx.fill();
      ctx.strokeStyle = roleColor(role);
      rounded(ctx, x, y + 32, w, 18, 4); ctx.stroke();
      ctx.fillStyle = roleColor(role);
      ctx.font = `10px ${MONO}`;
      ctx.fillText(role === 'assistant' ? 'assistant' : role, x + 6, y + 45);
      x += w + 6;
    });
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`target: ${short(card.target, 52)}`, CARD_X + 12, y + 70);
    if (scene.practice && card.conversation === scene.practice.shortConversation && card.turn === scene.practice.shortTurn) {
      ctx.globalAlpha = scene.practice.fade;
      ctx.fillStyle = RED;
      ctx.fillText(`skipped: ${scene.practice.shortWords} words, under ${3}`, CARD_X + 12, y + 86);
    }
  }
  ctx.globalAlpha = 1;
  if (scene.skipNote && scene.skipNote.alpha > 0) {
    ctx.globalAlpha = scene.skipNote.alpha;
    ctx.fillStyle = RED;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(scene.skipNote.text, CARD_X, CARD_Y0 + scene.cards.length * (CARD_H + CARD_GAP) + 16);
    ctx.globalAlpha = 1;
  }

  // Counters.
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`examples ${scene.counts.examples}   skipped ${scene.counts.skipped}`, CARD_X, H - 26);
}
