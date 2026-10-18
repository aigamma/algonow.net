// The lesson's animation, without a DOM: the same normalize and dedupe as
// solution.py run on the same records (python/fixtures/records.json), recorded
// as a trace, laid out on a reading-pace timeline, and turned into a drawable
// scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// normalize from solution.py: lowercase, letters and digits and whitespace
// only, then any run of whitespace becomes one space. JavaScript has no
// isalnum, so a letter-or-number class stands in; the fixture proves equality.
export function normalize(text) {
  const lowered = text.toLowerCase();
  let kept = '';
  for (const char of lowered) {
    if (/[\p{L}\p{N}]/u.test(char) || /\s/.test(char)) kept += char;
  }
  return kept.split(/\s+/).filter((word) => word !== '').join(' ');
}

// The three visible stages of normalize, for the figure's key box.
export function stages(text) {
  const lowered = text.toLowerCase();
  let stripped = '';
  for (const char of lowered) {
    if (/[\p{L}\p{N}]/u.test(char) || /\s/.test(char)) stripped += char;
  }
  return [lowered, stripped, normalize(text)];
}

// dedupe from solution.py (and from practice_answer.py when evalKeys is a Set).
export function dedupe(records, evalKeys) {
  const firstId = new Map();
  const steps = [];
  const kept = [];
  const dropped = [];
  const overlaps = [];
  for (const record of records) {
    const key = normalize(record.prompt);
    const step = { id: record.id, prompt: record.prompt, key, decision: 'kept', twin: null };
    if (evalKeys && evalKeys.has(key)) {
      step.decision = 'overlap';
      overlaps.push(record.id);
    } else if (firstId.has(key)) {
      step.decision = 'dropped';
      step.twin = firstId.get(key);
      dropped.push([record.id, firstId.get(key)]);
    } else {
      firstId.set(key, record.id);
      kept.push(record.id);
    }
    steps.push(step);
  }
  return { steps, kept, dropped, overlaps };
}

export function buildTrace(data) {
  const worked = dedupe(data.records, null);
  const idForKey = new Map(worked.steps.filter((step) => step.decision === 'kept').map((step) => [step.key, step.id]));
  const evalKeys = data.eval_prompts.map((prompt) => normalize(prompt));
  const matches = [];
  data.eval_prompts.forEach((prompt, index) => {
    const key = evalKeys[index];
    if (idForKey.has(key)) matches.push({ eval: prompt, key, training_id: idForKey.get(key) });
  });
  const practice = dedupe(data.records, new Set(evalKeys));
  return {
    steps: worked.steps,
    kept: worked.kept,
    dropped: worked.dropped,
    overlap: { eval_keys: evalKeys, matches },
    practice: { steps: practice.steps, kept: practice.kept, dropped: practice.dropped, overlaps: practice.overlaps },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each record gets a short
// pick-up, three visible normalization stages, a glide of its key into the
// set, and the rest of the beat to read the caption; the whole run is about
// half a minute. The slow motion setting stretches all of it.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;    // when the "what shipped" caption appears
const RECORD_BEAT = 2.6;
const OVERLAP_BEAT = 3.0;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE_BEAT = 3.0;
const PICK = 0.2;             // sub-phases inside a record beat
const STAGE = 0.4;
const GLIDE = 0.6;

function captionFor(step, counts) {
  const base = `${step.id} "${step.prompt}" normalizes to "${step.key}"`;
  if (step.decision === 'dropped') {
    return `${base}: already seen, so it is dropped as a duplicate of ${step.twin}. ${counts.kept} kept, ${counts.dropped} dropped.`;
  }
  return `${base}: not seen before, so it is kept. ${counts.kept} kept${counts.dropped ? `, ${counts.dropped} dropped` : ''}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const rawDistinct = new Set(data.records.map((record) => record.prompt)).size;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${data.records.length} records from the export, each a prompt and an answer. The same question appears in several spellings; a normalized key decides which records are the same.`,
    captionLate: `What shipped: exact-string dedupe. A set of the raw prompts has ${rawDistinct} members, because every spelling differs, so nothing was dropped.` });
  t += INTRO;
  const counts = { kept: 0, dropped: 0 };
  trace.steps.forEach((step, index) => {
    if (step.decision === 'kept') counts.kept += 1; else counts.dropped += 1;
    beats.push({ kind: 'record', start: t, duration: RECORD_BEAT, step, index, caption: captionFor(step, { ...counts }) });
    t += RECORD_BEAT;
  });
  const matched = trace.overlap.matches.map((match) => match.training_id);
  beats.push({ kind: 'overlap', start: t, duration: OVERLAP_BEAT,
    caption: `Evaluation prompts, normalized the same way: ${matched.length} of ${data.eval_prompts.length} have a twin among the kept records (${matched.join(', ')}). Those evaluation items would be memorized, not answered.` });
  t += OVERLAP_BEAT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.kept.length} kept, ${trace.dropped.length} dropped, each drop naming its twin. The overlap is reported, not removed: that is the practice variation.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: a record whose key matches an evaluation prompt is removed as an overlap, reported separately from the duplicates.' });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  const sharedTwin = p.steps.find((step) => step.decision === 'overlap' && !matched.includes(step.id));
  beats.push({ kind: 'practice', start: t, duration: PRACTICE_BEAT,
    caption: `With the overlap removed: ${p.kept.length} kept (${p.kept.join(', ')}), ${p.dropped.length} duplicates (${p.dropped.map((pair) => pair[0]).join(', ')}), ${p.overlaps.length} overlaps (${p.overlaps.join(', ')}).${sharedTwin ? ` ${sharedTwin.id} shares the key of ${matched.find((id) => trace.steps.find((s) => s.id === id).key === sharedTwin.key)}, so it is an overlap too, never a duplicate of a kept record.` : ''}` });
  t += PRACTICE_BEAT;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: the record cards and their fates,
// the key box with its three stages, the set of keys seen, the kept chips, the
// duplicate and overlap links, the evaluation rows, the travelling key, and
// the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const overlapBeat = kinds.indexOf('overlap');
  const practiceBeat = kinds.indexOf('practice');

  const cards = data.records.map((record, index) => ({
    id: record.id, prompt: record.prompt, index, alpha: 1, active: false, state: 'waiting', twin: null, tagAlpha: 0,
  }));
  const setRows = [];          // keys in first-seen order: { key, id, alpha, overlap }
  const keptIds = [];          // { id, alpha }
  const links = [];            // { card, twin, alpha, color }: a dropped card and the kept card it duplicates
  const evalRows = data.eval_prompts.map((prompt, index) => ({ prompt, key: trace.overlap.eval_keys[index], alpha: 0, match: null, linkAlpha: 0 }));
  const counts = { kept: 0, dropped: 0, overlaps: 0 };
  let keyBox = null;
  let ghost = null;
  const rowOf = (key) => setRows.findIndex((row) => row.key === key);

  const apply = (step, alpha) => {
    const card = cards[trace.steps.indexOf(step)];
    if (step.decision === 'kept') {
      setRows.push({ key: step.key, id: step.id, alpha, overlap: 0 });
      keptIds.push({ id: step.id, alpha });
      card.state = 'kept';
      counts.kept += 1;
    } else {
      links.push({ card: card.index, twin: trace.steps.findIndex((s) => s.id === step.twin), alpha, color: 'red' });
      card.state = 'dropped';
      card.twin = step.twin;
      card.tagAlpha = alpha;
      counts.dropped += 1;
    }
  };

  // Everything before the current beat is complete.
  for (let index = 1; index < beatIndex; index += 1) {
    const done = timeline.beats[index];
    if (done.kind === 'record') apply(done.step, 1);
  }
  const matchRows = () => {
    evalRows.forEach((row) => {
      const match = trace.overlap.matches.find((m) => m.key === row.key);
      row.match = match ? rowOf(match.key) : null;
    });
  };
  if (beatIndex > overlapBeat) {
    matchRows();
    evalRows.forEach((row) => { row.alpha = 1; row.linkAlpha = row.match === null ? 0 : 1; });
    setRows.forEach((row) => { if (trace.overlap.matches.some((m) => m.key === row.key)) row.overlap = 1; });
  }

  // The current beat animates one decision.
  if (beat.kind === 'intro') {
    cards.forEach((card, index) => { card.alpha = ramp(local, 0.15 + index * 0.18, 0.3); });
  } else if (beat.kind === 'record') {
    const { step } = beat;
    const card = cards[beat.index];
    card.active = true;
    const texts = stages(step.prompt);
    keyBox = {
      id: step.id,
      stages: ['lowercase', 'letters, digits, spaces', 'single spaces'].map((label, i) => ({ label, text: texts[i], alpha: ramp(local, PICK + i * STAGE, 0.25) })),
      done: local >= PICK + 3 * STAGE,
    };
    const glideStart = PICK + 3 * STAGE;
    const glide = easeInOut(ramp(local, glideStart, GLIDE));
    if (local >= glideStart) {
      if (step.decision === 'kept') {
        setRows.push({ key: step.key, id: step.id, alpha: glide, overlap: 0 });
        keptIds.push({ id: step.id, alpha: ramp(local, glideStart + GLIDE, 0.3) });
        if (glide >= 1) { card.state = 'kept'; counts.kept += 1; }
      } else {
        links.push({ card: card.index, twin: trace.steps.findIndex((s) => s.id === step.twin), alpha: glide, color: 'red' });
        card.twin = step.twin;
        card.tagAlpha = glide;
        if (glide >= 1) { card.state = 'dropped'; counts.dropped += 1; }
      }
      if (glide < 1) ghost = { text: step.key, progress: glide, toRow: rowOf(step.key), kind: step.decision };
    }
  } else if (beat.kind === 'overlap') {
    matchRows();
    evalRows.forEach((row, index) => {
      row.alpha = ramp(local, 0.2 + index * 0.3, 0.3);
      if (row.match !== null) row.linkAlpha = ramp(local, 1.3 + index * 0.25, 0.4);
    });
    setRows.forEach((row) => {
      const match = trace.overlap.matches.findIndex((m) => m.key === row.key);
      if (match >= 0) row.overlap = ramp(local, 1.3 + match * 0.25, 0.4);
    });
  } else if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const fade = beat.kind === 'practice' ? easeInOut(ramp(local, 0.3, 0.9)) : 1;
    trace.practice.steps.forEach((step, index) => {
      if (step.decision !== 'overlap') return;
      const card = cards[index];
      card.state = fade >= 0.5 ? 'overlap' : card.state;
      card.tagAlpha = fade;
      const kept = keptIds.find((entry) => entry.id === step.id);
      if (kept) kept.alpha = 1 - fade;
      const link = links.find((entry) => entry.card === index);
      if (link) link.color = fade >= 0.5 ? 'amber' : link.color;
      const row = rowOf(step.key);
      if (row >= 0) setRows[row].overlap = Math.max(setRows[row].overlap, fade);
    });
    if (fade >= 0.5) {
      counts.kept = trace.practice.kept.length;
      counts.dropped = trace.practice.dropped.length;
      counts.overlaps = trace.practice.overlaps.length;
    }
  }

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, cards, keyBox, setRows, keptIds, links, evalRows, ghost, counts, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const CARD_X = 28, CARD_W = 264, CARD_Y0 = 84, CARD_STEP = 36, CARD_H = 28;
const BOX_X = 312, BOX_W = 264, BOX_Y = 84, BOX_H = 118;
const EVAL_Y = 232, EVAL_STEP = 30, EVAL_H = 24;
const SET_X = 596, SET_W = 276, SET_Y = 84, ROW_Y0 = 98, ROW_STEP = 26, ROW_H = 22;
const KEPT_Y = 266, CHIP_W = 48, CHIP_H = 22, CHIP_STEP = 54;
const COUNTS_Y = 330;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}
const cardRect = (index) => ({ x: CARD_X, y: CARD_Y0 + index * CARD_STEP, w: CARD_W, h: CARD_H });
const rowRect = (index) => ({ x: SET_X + 8, y: ROW_Y0 + index * ROW_STEP, w: SET_W - 16, h: ROW_H });
const evalRect = (index) => ({ x: BOX_X, y: EVAL_Y + 14 + index * EVAL_STEP, w: BOX_W, h: EVAL_H });
const trim = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('dedupe by normalized key: lowercase, letters and digits and spaces, single spaces', CARD_X, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('records (id, prompt)', CARD_X, 66);
  ctx.fillText('normalize', BOX_X, 66);
  ctx.fillText('keys seen (a set, first id kept)', SET_X, 66);

  // Links from a dropped card up to the kept card it duplicates: a loop in the
  // gap beside the column, so nothing crosses the key box.
  scene.links.forEach((link) => {
    if (link.alpha <= 0 || link.twin < 0) return;
    const from = cardRect(link.card);
    const to = cardRect(link.twin);
    ctx.globalAlpha = link.alpha * 0.85;
    ctx.strokeStyle = link.color === 'amber' ? AMBER : RED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(from.x + from.w, from.y + from.h / 2);
    ctx.bezierCurveTo(from.x + from.w + 16, from.y + from.h / 2, to.x + to.w + 16, to.y + to.h / 2, to.x + to.w, to.y + to.h / 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Record cards.
  scene.cards.forEach((card) => {
    if (card.alpha <= 0) return;
    const r = cardRect(card.index);
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    if (card.state !== 'waiting') {
      ctx.fillStyle = card.state === 'kept' ? GREEN : (card.state === 'overlap' ? AMBER : RED);
      ctx.globalAlpha = card.alpha * 0.16;
      rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
      ctx.globalAlpha = card.alpha;
    }
    ctx.strokeStyle = card.active ? BLUE : LINE;
    ctx.lineWidth = card.active ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(card.id, r.x + 8, r.y + 18);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = card.state === 'dropped' || card.state === 'overlap' ? DIM : INK;
    ctx.fillText(trim(card.prompt, card.tagAlpha > 0 ? 20 : 33), r.x + 34, r.y + 18);
    if (card.tagAlpha > 0) {
      const label = card.state === 'overlap' ? 'overlaps eval' : `duplicates ${card.twin}`;
      ctx.globalAlpha = card.alpha * card.tagAlpha;
      ctx.textAlign = 'right';
      ctx.fillStyle = card.state === 'overlap' ? AMBER : RED;
      ctx.fillText(label, r.x + r.w - 8, r.y + 18);
      ctx.textAlign = 'left';
    }
  });
  ctx.globalAlpha = 1;

  // The key box: the three stages of normalize for the record under test.
  ctx.fillStyle = PANEL;
  rounded(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 6); ctx.fill();
  ctx.strokeStyle = scene.keyBox ? BLUE : LINE;
  rounded(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 6); ctx.stroke();
  if (scene.keyBox) {
    scene.keyBox.stages.forEach((stage, i) => {
      if (stage.alpha <= 0) return;
      ctx.globalAlpha = stage.alpha;
      ctx.font = `9.5px ${MONO}`;
      ctx.fillStyle = DIM;
      ctx.fillText(stage.label, BOX_X + 10, BOX_Y + 20 + i * 36);
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = i === 2 && scene.keyBox.done ? GREEN : INK;
      ctx.fillText(`"${trim(stage.text, 34)}"`, BOX_X + 10, BOX_Y + 34 + i * 36);
    });
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('the next prompt passes through here', BOX_X + 10, BOX_Y + 24);
  }

  // Evaluation prompts, under the key box.
  if (scene.evalRows.some((row) => row.alpha > 0)) {
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('evaluation prompts, normalized', BOX_X, EVAL_Y);
    scene.evalRows.forEach((row, index) => {
      if (row.alpha <= 0) return;
      const r = evalRect(index);
      ctx.globalAlpha = row.alpha;
      ctx.fillStyle = PANEL;
      rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
      ctx.strokeStyle = row.match === null ? LINE : AMBER;
      rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.fillText(`"${trim(row.key, 30)}"`, r.x + 8, r.y + 16);
      if (row.match !== null && row.linkAlpha > 0) {
        const to = rowRect(row.match);
        ctx.globalAlpha = row.alpha * row.linkAlpha * 0.8;
        ctx.strokeStyle = AMBER;
        ctx.beginPath();
        ctx.moveTo(r.x + r.w, r.y + r.h / 2);
        ctx.bezierCurveTo(r.x + r.w + 20, r.y + r.h / 2, to.x - 20, to.y + to.h / 2, to.x, to.y + to.h / 2);
        ctx.stroke();
      } else if (row.match === null && row.alpha >= 1) {
        ctx.textAlign = 'right';
        ctx.fillStyle = DIM;
        ctx.fillText('no twin', r.x + r.w - 8, r.y + 16);
        ctx.textAlign = 'left';
      }
    });
    ctx.globalAlpha = 1;
  }

  // The set of keys seen.
  const setH = 16 + Math.max(scene.setRows.length, 1) * ROW_STEP;
  ctx.fillStyle = PANEL;
  rounded(ctx, SET_X, SET_Y, SET_W, setH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, SET_X, SET_Y, SET_W, setH, 6); ctx.stroke();
  if (scene.setRows.length === 0) {
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('empty', SET_X + 10, ROW_Y0 + 15);
  }
  scene.setRows.forEach((row, index) => {
    if (row.alpha <= 0) return;
    const r = rowRect(index);
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = row.overlap > 0 ? AMBER : GREEN;
    ctx.globalAlpha = row.alpha * (row.overlap > 0 ? 0.12 + 0.12 * row.overlap : 0.14);
    rounded(ctx, r.x, r.y, r.w, r.h, 3); ctx.fill();
    ctx.globalAlpha = row.alpha;
    ctx.strokeStyle = row.overlap > 0.5 ? AMBER : LINE;
    rounded(ctx, r.x, r.y, r.w, r.h, 3); ctx.stroke();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(`"${trim(row.key, 30)}"`, r.x + 6, r.y + 15);
    ctx.textAlign = 'right';
    ctx.fillStyle = DIM;
    ctx.fillText(row.id, r.x + r.w - 6, r.y + 15);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;

  // Kept records as chips, and the counts.
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('kept records', SET_X, KEPT_Y - 10);
  scene.keptIds.forEach((entry, index) => {
    if (entry.alpha <= 0) return;
    const x = SET_X + index * CHIP_STEP;
    ctx.globalAlpha = entry.alpha;
    ctx.fillStyle = GREEN;
    ctx.globalAlpha = entry.alpha * 0.22;
    rounded(ctx, x, KEPT_Y, CHIP_W, CHIP_H, 4); ctx.fill();
    ctx.globalAlpha = entry.alpha;
    ctx.strokeStyle = GREEN;
    rounded(ctx, x, KEPT_Y, CHIP_W, CHIP_H, 4); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(entry.id, x + 14, KEPT_Y + 15);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.font = `11px ${MONO}`;
  const overlapText = scene.counts.overlaps ? `, ${scene.counts.overlaps} overlaps removed` : '';
  ctx.fillText(`${scene.counts.kept} kept, ${scene.counts.dropped} dropped${overlapText}`, SET_X, COUNTS_Y);

  // The travelling key, from the key box to its row in the set.
  if (scene.ghost) {
    const g = scene.ghost;
    const from = { x: BOX_X + 10, y: BOX_Y + 34 + 2 * 36 - 14 };
    const to = g.toRow >= 0 ? rowRect(g.toRow) : rowRect(scene.setRows.length);
    const x = from.x + (to.x - from.x) * g.progress;
    const y = from.y + (to.y - from.y) * g.progress;
    const color = g.kind === 'kept' ? GREEN : RED;
    ctx.globalAlpha = 0.35 * (1 - g.progress * 0.5);
    ctx.fillStyle = color;
    rounded(ctx, x, y, 240, 20, 4); ctx.fill();
    ctx.globalAlpha = 1 - g.progress * 0.6;
    ctx.strokeStyle = color;
    rounded(ctx, x, y, 240, 20, 4); ctx.stroke();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(`"${trim(g.text, 30)}"`, x + 6, y + 14);
  }
  ctx.globalAlpha = 1;
}
