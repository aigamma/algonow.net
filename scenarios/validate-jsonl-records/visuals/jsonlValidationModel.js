// The lesson's animation, without a DOM: the same checks as solution.py run on
// the same lines (python/fixtures/lines.json), recorded as a trace, laid out on
// a reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real generator, so the picture cannot drift
// from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

export const CHECKS = ['json parses', 'is an object', 'has a prompt', 'has an answer', 'both non-empty', 'answer within limit', 'prompt not seen yet'];
const WORKED_CHECKS = 6;                // the practice variation adds the seventh
const REASON_CHECK = {
  'malformed json': 0, 'not an object': 1, 'missing prompt': 2, 'missing answer': 3,
  'empty prompt': 4, 'empty answer': 4, 'answer too long': 5, 'duplicate prompt': 6,
};

// validate from solution.py (and from practice_answer.py when `seen` is a Set), one line at a time.
export function checkLine(line, maxAnswerChars, seen) {
  const rejected = (reason, record = null) => ({ outcome: 'rejected', reason, record });
  const text = line.trim();
  if (text === '') return { outcome: 'blank', reason: null, record: null };
  let record;
  try { record = JSON.parse(text); } catch (error) { return rejected('malformed json'); }
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return rejected('not an object');
  const { prompt, answer } = record;
  if (typeof prompt !== 'string') return rejected('missing prompt');
  if (typeof answer !== 'string') return rejected('missing answer');
  if (prompt.trim() === '') return rejected('empty prompt');
  if (answer.trim() === '') return rejected('empty answer');
  if (answer.length > maxAnswerChars) return rejected('answer too long', record);
  if (seen) {
    if (seen.has(prompt)) return rejected('duplicate prompt', record);
    seen.add(prompt);
  }
  return { outcome: 'kept', reason: null, record };
}

// One trace step per physical line, with running counts, exactly as the Python
// suite derives them; by_reason is Counter.most_common (count descending, ties
// in first-seen order).
export function traceLines(lines, maxAnswerChars, dedupe) {
  const seen = dedupe ? new Set() : null;
  const counts = new Map();
  const steps = [];
  let kept = 0;
  let rejected = 0;
  lines.forEach((line, index) => {
    const result = checkLine(line, maxAnswerChars, seen);
    const step = { line: index + 1, text_preview: line.slice(0, 40), outcome: result.outcome, reason: result.reason,
      prompt_preview: null, answer_chars: null, kept_count: 0, rejected_count: 0 };
    if (result.outcome === 'kept') {
      kept += 1;
      step.prompt_preview = result.record.prompt.slice(0, 40);
      step.answer_chars = result.record.answer.length;
    } else if (result.outcome === 'rejected') {
      rejected += 1;
      counts.set(result.reason, (counts.get(result.reason) || 0) + 1);
      if (result.reason === 'answer too long') step.answer_chars = result.record.answer.length;
    }
    step.kept_count = kept;
    step.rejected_count = rejected;
    steps.push(step);
  });
  const by_reason = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => [reason, count]);
  return { steps, by_reason };
}

export function buildTrace(data) {
  const worked = traceLines(data.lines, data.max_answer_chars, false);
  const practice = traceLines(data.practice_lines, data.max_answer_chars, true);
  return { max_answer_chars: data.max_answer_chars, steps: worked.steps, by_reason: worked.by_reason, practice };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each line gets a short pick-up,
// a glide to the gate, one lit check per tenth of a second, a glide to its
// stack, and the rest of the beat to read the caption. The eight record lines
// are the repetitive part, so they keep a steady beat; the whole run is about
// half a minute. The slow motion setting stretches all of it.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.6;     // when the "what shipped" caption and the crash mark appear
const LINE_BEAT = 2.6;
const BLANK_BEAT = 1.4;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.4;
const PRACTICE_BEAT = 3.2;
const FINAL = 2.0;
const PICK = 0.2;              // sub-phases inside a line beat
const TO_GATE = 0.6;
const CHECK_EACH = 0.1;
const TO_STACK = 0.6;

function captionFor(step, maxChars, duplicateOf) {
  const n = step.line;
  if (step.outcome === 'blank') return `Line ${n} is blank: skipped and not counted.`;
  if (step.outcome === 'kept') {
    return `Line ${n}: parses, is an object, has a non-empty prompt and answer, ${step.answer_chars} characters within ${maxChars}: kept, ${step.kept_count} so far.`;
  }
  const because = {
    'malformed json': `json.loads raises before anything else is checked: rejected, malformed json`,
    'not an object': `parses, but it is not an object: rejected, not an object`,
    'missing prompt': `parses and is an object, but there is no prompt string: rejected, missing prompt`,
    'missing answer': `parses and is an object with a prompt, but there is no answer key: rejected, missing answer`,
    'empty prompt': `parses with both keys, but the prompt is empty after strip: rejected, empty prompt`,
    'empty answer': `parses with both keys, but the answer is empty after strip: rejected, empty answer`,
    'answer too long': `parses with both keys, but the answer is ${step.answer_chars} characters, over the limit of ${maxChars}: rejected, answer too long`,
    'duplicate prompt': `passes every check, but its prompt was already kept from line ${duplicateOf}: rejected, duplicate prompt`,
  }[step.reason];
  return `Line ${n}: ${because}. ${step.rejected_count} rejected so far.`;
}

export function buildTimeline(trace, data) {
  const maxChars = data.max_answer_chars;
  const beats = [];
  let t = 0;
  const record = trace.steps.filter((step) => step.outcome !== 'blank').length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${trace.steps.length} physical lines of the export, one JSON object per line. Every line goes through the same checks; a bad one is named and skipped, never fatal.`,
    captionLate: `What shipped: json.loads on every line with no guard. Line ${trace.steps.find((s) => s.reason === 'malformed json').line} is malformed, so the job crashed there and the night was lost.` });
  t += INTRO;
  trace.steps.forEach((step) => {
    const blank = step.outcome === 'blank';
    beats.push({ kind: blank ? 'blank' : 'line', start: t, duration: blank ? BLANK_BEAT : LINE_BEAT, step, caption: captionFor(step, maxChars) });
    t += blank ? BLANK_BEAT : LINE_BEAT;
  });
  const last = trace.steps[trace.steps.length - 1];
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${last.kept_count} kept, ${last.rejected_count} rejected out of ${record} records, every rejection named with its line: the export can be fixed at the source before the next run.` });
  t += OUTRO;
  // The practice variation replays only its new line: the first eight decide exactly as above.
  const practiceStep = trace.practice.steps.find((step) => step.reason === 'duplicate prompt');
  const duplicateOf = trace.practice.steps.find((step) => step.outcome === 'kept'
    && step.prompt_preview === JSON.parse(data.practice_lines[practiceStep.line - 1]).prompt.slice(0, 40)).line;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO, step: practiceStep,
    caption: `Practice variation: line ${practiceStep.line} repeats the prompt of line ${duplicateOf} with a different answer. The gate gains one check: has this prompt been kept already?` });
  t += PRACTICE_INTRO;
  beats.push({ kind: 'practice-line', start: t, duration: PRACTICE_BEAT, step: practiceStep, caption: captionFor(practiceStep, maxChars, duplicateOf) });
  t += PRACTICE_BEAT;
  const practiceLast = trace.practice.steps[trace.practice.steps.length - 1];
  beats.push({ kind: 'final', start: t, duration: FINAL,
    caption: `With the duplicate rule: ${practiceLast.kept_count} kept, ${practiceLast.rejected_count} rejected. The first occurrence stays; the repeat is named with its line.` });
  t += FINAL;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const previewOf = (text) => (text.trim() === '' ? '(blank)' : text.slice(0, 34) + (text.length > 34 ? '…' : ''));

// The drawable state at `elapsed` seconds: the file rows and their fates, the
// gate's check lights, the kept and rejected stacks, the tally, the travelling
// chip, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const maxChars = data.max_answer_chars;
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;

  const rows = data.lines.map((text, index) => ({
    line: index + 1, preview: previewOf(text), blank: text.trim() === '', alpha: 1, active: false, slot: index, state: 'waiting', crash: 0,
  }));
  const practiceIndex = timeline.beats.findIndex((b) => b.kind === 'practice-intro');
  const practiceStep = timeline.beats[practiceIndex].step;
  const practiceRow = { line: practiceStep.line, preview: previewOf(data.practice_lines[practiceStep.line - 1]), blank: false,
    alpha: 0, active: false, slot: practiceStep.line - 1, state: 'waiting', crash: 0, practice: true };
  const checks = CHECKS.map((label, index) => ({ label, state: 'idle', alpha: index < WORKED_CHECKS ? 1 : 0 }));
  const kept = [];
  const rejected = [];
  const tally = [];
  let ghost = null;

  const bump = (reason) => {
    const entry = tally.find((item) => item.reason === reason);
    if (entry) entry.count += 1; else tally.push({ reason, count: 1 });
  };
  const land = (step, row, alpha = 1) => {
    if (step.outcome === 'kept') { kept.push({ line: step.line, label: step.prompt_preview, alpha }); row.state = 'kept'; }
    if (step.outcome === 'rejected') { rejected.push({ line: step.line, reason: step.reason, alpha }); row.state = 'rejected'; bump(step.reason); }
  };
  const rowFor = (b) => (b.kind === 'practice-line' ? practiceRow : rows[b.step.line - 1]);

  // Everything before the current beat is complete.
  for (let index = 1; index < beatIndex; index += 1) {
    const done = timeline.beats[index];
    if (done.kind === 'line' || done.kind === 'practice-line') land(done.step, rowFor(done));
    if (done.kind === 'blank') rows[done.step.line - 1].state = 'skipped';
  }
  if (beatIndex > practiceIndex) {
    practiceRow.alpha = 1;
    rows[rows.length - 1].slot = rows.length;   // the blank line becomes line ten
    rows[rows.length - 1].line = rows.length + 1;
    checks[WORKED_CHECKS].alpha = 1;
  }

  // The current beat animates one decision.
  if (beat.kind === 'intro') {
    rows.forEach((row, index) => { row.alpha = ramp(local, 0.15 + index * 0.18, 0.3); });
    const crashed = trace.steps.find((s) => s.reason === 'malformed json');
    if (crashed) rows[crashed.line - 1].crash = ramp(local, INTRO_LATE_AT, 0.4);
  } else if (beat.kind === 'line' || beat.kind === 'practice-line') {
    if (beatIndex === 1) {
      const crashed = trace.steps.find((s) => s.reason === 'malformed json');
      if (crashed) rows[crashed.line - 1].crash = 1 - ramp(local, 0, 0.5);
    }
    const { step } = beat;
    const row = rowFor(beat);
    row.active = true;
    const shown = beat.kind === 'practice-line' ? CHECKS.length : WORKED_CHECKS;
    const failIndex = step.outcome === 'rejected' ? REASON_CHECK[step.reason] : -1;
    const checksStart = PICK + TO_GATE;
    const checksEnd = checksStart + shown * CHECK_EACH;
    checks.forEach((check, index) => {
      if (index >= shown || local < checksStart + index * CHECK_EACH) return;
      if (failIndex >= 0 && index > failIndex) return;
      check.state = index === failIndex ? 'fail' : 'pass';
    });
    const toGate = easeInOut(ramp(local, PICK, TO_GATE));
    const toStack = easeInOut(ramp(local, checksEnd, TO_STACK));
    const settled = ramp(local, checksEnd + TO_STACK * 0.7, TO_STACK * 0.3);
    if (local >= PICK && settled < 1) {
      ghost = { line: step.line, fromSlot: row.slot, toGate, toStack, toRow: step.outcome === 'kept' ? kept.length : rejected.length,
        outcome: step.outcome, decided: local >= checksEnd, alpha: 1 - settled };
    }
    if (settled > 0) land(step, row, settled);
  } else if (beat.kind === 'blank') {
    const row = rows[beat.step.line - 1];
    row.active = true;
    if (local >= 0.6) row.state = 'skipped';
  } else if (beat.kind === 'practice-intro') {
    const slide = easeInOut(ramp(local, 0.2, 0.5));
    practiceRow.alpha = slide;
    rows[rows.length - 1].slot = rows.length - 1 + slide;
    if (slide >= 0.5) rows[rows.length - 1].line = rows.length + 1;
    checks[WORKED_CHECKS].alpha = ramp(local, 0.7, 0.4);
  }

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows: [...rows, practiceRow], checks, kept, rejected, tally, ghost, maxChars,
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const FILE_X = 28, FILE_W = 272, ROW_Y0 = 84, ROW_STEP = 34, ROW_H = 26;
const GATE_X = 330, GATE_W = 232, GATE_Y = 84, SLOT_H = 22, CHECK_Y0 = 128, CHECK_STEP = 24;
const TALLY_Y = 318, TALLY_STEP = 19;
const STACK_X = 592, STACK_W = 280, STACK_H = 26, STACK_STEP = 32, KEPT_Y0 = 84, REJ_HEADER_Y = 256, REJ_Y0 = 266;
const CHIP_W = 88, CHIP_H = 22;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const rowY = (slot) => ROW_Y0 + slot * ROW_STEP;
const slotRect = () => ({ x: GATE_X + 8, y: GATE_Y + 8, w: GATE_W - 16, h: SLOT_H });
const keptRect = (index) => ({ x: STACK_X, y: KEPT_Y0 + index * STACK_STEP, w: STACK_W, h: STACK_H });
const rejectedRect = (index) => ({ x: STACK_X, y: REJ_Y0 + index * STACK_STEP, w: STACK_W, h: STACK_H });

export function drawScene(ctx, scene) {
  const { maxChars } = scene;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`validate on the export: one JSON object per line, answers within ${maxChars} characters`, FILE_X, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('file lines', FILE_X, 66);
  ctx.fillText('checks, in order', GATE_X, 66);
  ctx.fillText('kept records', STACK_X, 66);
  ctx.fillText('rejected lines, with the reason', STACK_X, REJ_HEADER_Y);

  // File rows.
  scene.rows.forEach((row) => {
    if (row.alpha <= 0) return;
    const y = rowY(row.slot);
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, FILE_X, y, FILE_W, ROW_H, 4); ctx.fill();
    if (row.state === 'kept' || row.state === 'rejected') {
      ctx.fillStyle = row.state === 'kept' ? GREEN : RED;
      ctx.globalAlpha = row.alpha * 0.16;
      rounded(ctx, FILE_X, y, FILE_W, ROW_H, 4); ctx.fill();
      ctx.globalAlpha = row.alpha;
    }
    ctx.strokeStyle = row.active ? BLUE : (row.crash > 0 ? RED : LINE);
    ctx.lineWidth = row.active ? 1.5 : 1;
    if (row.crash > 0 && !row.active) ctx.globalAlpha = row.alpha * (0.4 + 0.6 * row.crash);
    rounded(ctx, FILE_X, y, FILE_W, ROW_H, 4); ctx.stroke();
    ctx.globalAlpha = row.alpha;
    ctx.lineWidth = 1;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = row.state === 'skipped' ? DIM : INK;
    ctx.fillText(`line ${row.line}`, FILE_X + 8, y + 17);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText(row.preview, FILE_X + 62, y + 17);
    if (row.crash > 0) {
      ctx.globalAlpha = row.alpha * row.crash;
      ctx.fillStyle = PANEL;
      rounded(ctx, FILE_X + FILE_W - 52, y + 4, 46, ROW_H - 8, 3); ctx.fill();
      ctx.fillStyle = RED;
      ctx.globalAlpha = row.alpha * row.crash * 0.25;
      rounded(ctx, FILE_X + FILE_W - 52, y + 4, 46, ROW_H - 8, 3); ctx.fill();
      ctx.globalAlpha = row.alpha * row.crash;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText('crash', FILE_X + FILE_W - 10, y + 17);
      ctx.textAlign = 'left';
      ctx.globalAlpha = row.alpha;
    }
  });
  ctx.globalAlpha = 1;

  // The gate: a slot for the line under test and the checks in order.
  const shownChecks = scene.checks.filter((check) => check.alpha > 0).length;
  const gateH = CHECK_Y0 - GATE_Y + shownChecks * CHECK_STEP + 4;
  ctx.fillStyle = PANEL;
  rounded(ctx, GATE_X, GATE_Y, GATE_W, gateH, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, GATE_X, GATE_Y, GATE_W, gateH, 6); ctx.stroke();
  const slot = slotRect();
  ctx.strokeStyle = LINE;
  ctx.setLineDash([3, 3]);
  rounded(ctx, slot.x, slot.y, slot.w, slot.h, 4); ctx.stroke();
  ctx.setLineDash([]);
  scene.checks.forEach((check, index) => {
    if (check.alpha <= 0) return;
    const y = CHECK_Y0 + index * CHECK_STEP;
    ctx.globalAlpha = check.alpha;
    ctx.beginPath();
    ctx.arc(GATE_X + 18, y - 4, 5, 0, Math.PI * 2);
    if (check.state === 'idle') { ctx.strokeStyle = DIM; ctx.stroke(); } else { ctx.fillStyle = check.state === 'pass' ? GREEN : RED; ctx.fill(); }
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = check.state === 'idle' ? DIM : INK;
    ctx.fillText(check.label, GATE_X + 32, y);
    if (check.state !== 'idle') {
      ctx.textAlign = 'right';
      ctx.fillStyle = check.state === 'pass' ? GREEN : RED;
      ctx.fillText(check.state === 'pass' ? 'ok' : 'no', GATE_X + GATE_W - 10, y);
      ctx.textAlign = 'left';
    }
  });
  ctx.globalAlpha = 1;

  // The tally by reason.
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('rejections by reason', GATE_X, TALLY_Y);
  scene.tally.forEach((entry, index) => {
    const y = TALLY_Y + 20 + index * TALLY_STEP;
    ctx.fillStyle = INK;
    ctx.fillText(entry.reason, GATE_X + 8, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = AMBER;
    ctx.fillText(String(entry.count), GATE_X + GATE_W - 8, y);
    ctx.textAlign = 'left';
  });

  // The two stacks.
  const drawStackRow = (rect, color, label, alpha) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, rect.x, rect.y, rect.w, rect.h, 4); ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.18;
    rounded(ctx, rect.x, rect.y, rect.w, rect.h, 4); ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = LINE;
    rounded(ctx, rect.x, rect.y, rect.w, rect.h, 4); ctx.stroke();
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(label, rect.x + 8, rect.y + 17);
    ctx.globalAlpha = 1;
  };
  scene.kept.forEach((entry, index) => drawStackRow(keptRect(index), GREEN, `line ${entry.line}  ${entry.label}`, entry.alpha));
  scene.rejected.forEach((entry, index) => drawStackRow(rejectedRect(index), RED, `line ${entry.line}  ${entry.reason}`, entry.alpha));

  // The travelling chip for the line under test.
  if (scene.ghost) {
    const g = scene.ghost;
    const start = { x: FILE_X + 6, y: rowY(g.fromSlot) + 2 };
    const gate = { x: slot.x + 2, y: slot.y };
    const dest = g.outcome === 'kept' ? keptRect(g.toRow) : rejectedRect(g.toRow);
    const end = { x: dest.x + 6, y: dest.y + 2 };
    const exit = { x: GATE_X + GATE_W + 12, y: gate.y };
    let x;
    let y;
    if (!g.decided) {
      x = start.x + (gate.x - start.x) * g.toGate;
      y = start.y + (gate.y - start.y) * g.toGate;
    } else if (g.toStack < 0.4) {
      const p = g.toStack / 0.4;
      x = gate.x + (exit.x - gate.x) * p;
      y = gate.y;
    } else {
      const p = (g.toStack - 0.4) / 0.6;
      x = exit.x + (end.x - exit.x) * p;
      y = exit.y + (end.y - exit.y) * p;
    }
    const color = g.decided ? (g.outcome === 'kept' ? GREEN : RED) : BLUE;
    ctx.globalAlpha = Math.max(0, g.alpha) * 0.35;
    ctx.fillStyle = color;
    rounded(ctx, x, y, CHIP_W, CHIP_H, 4); ctx.fill();
    ctx.globalAlpha = Math.max(0, g.alpha);
    ctx.strokeStyle = color;
    rounded(ctx, x, y, CHIP_W, CHIP_H, 4); ctx.stroke();
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(`line ${g.line}`, x + 10, y + 15);
  }
  ctx.globalAlpha = 1;
}
