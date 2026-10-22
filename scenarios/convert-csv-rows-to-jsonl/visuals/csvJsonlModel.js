// The lesson's animation, without a DOM: the same parse and decisions as
// solution.py, run on the same export (python/fixtures/export.json), recorded
// as a trace, laid out on a reading-pace timeline, and turned into a drawable
// scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift from the code. The csv module
// does not exist in the browser, so parseCsv below is a small field walker for
// the module's default dialect (a quote opens a field, a doubled quote inside
// is one quote, a comma ends a field, a newline outside quotes ends a record);
// the trace comparison proves it agrees with csv.DictReader on this export.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// ------------------------------------------------------------- the functions

export function parseCsv(text) {
  const records = [];
  let fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { fields.push(field); field = ''; }
    else if (ch === '\n') { fields.push(field); records.push(fields); fields = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || fields.length) { fields.push(field); records.push(fields); }
  return records;
}

// The raw text of each record, header first: a newline outside quotes ends a record.
export function splitRecords(text) {
  const records = [];
  let current = '';
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === '\n' && !inQuotes) { records.push(current); current = ''; } else current += ch;
  }
  if (current) records.push(current);
  return records;
}

const stripNewlines = (text) => text.replace(/^\n+/, '').replace(/\n+$/, '');

// What shipped: every line of the file split on commas, quotes ignored.
export function splitOnCommas(text) {
  return stripNewlines(text).split('\n').slice(1).map((line) => line.split(','));
}

// rows_to_examples from solution.py (and practice_answer.py when maxChars is a number).
export function rowsToExamples(rows, maxChars = null) {
  const examples = [];
  const skipped = { not_closed: [], empty_reply: [] };
  if (maxChars !== null) skipped.too_long = [];
  const decisions = [];
  for (const row of rows) {
    const status = row.status.trim().toLowerCase();
    const prompt = row.customer_question.trim();
    const reply = row.agent_reply.trim();
    const chars = prompt.length + reply.length;
    if (status !== 'closed') { skipped.not_closed.push(row.ticket_id); decisions.push({ id: row.ticket_id, decision: 'not_closed', chars }); continue; }
    if (reply === '') { skipped.empty_reply.push(row.ticket_id); decisions.push({ id: row.ticket_id, decision: 'empty_reply', chars }); continue; }
    if (maxChars !== null && chars > maxChars) { skipped.too_long.push(row.ticket_id); decisions.push({ id: row.ticket_id, decision: 'too_long', chars }); continue; }
    examples.push({ prompt, completion: reply });
    decisions.push({ id: row.ticket_id, decision: 'kept', chars });
  }
  return { examples, skipped, decisions };
}

// json.dumps(example, ensure_ascii=False) for a two-key record: the same
// separators and the same escapes for this export's text.
export function jsonLine(example) {
  return `{"prompt": ${JSON.stringify(example.prompt)}, "completion": ${JSON.stringify(example.completion)}}`;
}
export function toJsonl(examples) {
  let text = '';
  for (const example of examples) text = text + jsonLine(example) + '\n';
  return text;
}

export function buildTrace(data) {
  const records = parseCsv(data.csv_text);
  const header = records[0];
  const rows = records.slice(1).map((fields) => {
    const row = {};
    header.forEach((name, index) => { row[name] = fields[index]; });
    return row;
  });
  const raws = splitRecords(data.csv_text).slice(1);
  const worked = rowsToExamples(rows, null);
  const lines = toJsonl(worked.examples).split('\n');
  lines.pop();
  const steps = [];
  let kept = 0;
  rows.forEach((row, index) => {
    const raw = raws[index];
    const step = {
      id: row.ticket_id, raw, quoted: raw.includes('"'),
      naive_lines: raw.split('\n').map((line) => line.split(',')),
      fields: data.required.map((column) => row[column]),
      chars: worked.decisions[index].chars,
      decision: worked.decisions[index].decision,
    };
    if (step.decision === 'kept') { step.line = lines[kept]; kept += 1; }
    steps.push(step);
  });
  const practice = rowsToExamples(rows, data.max_chars);
  return {
    required: data.required,
    rows,
    steps,
    naive: { lines: stripNewlines(data.csv_text).split('\n').slice(1), field_counts: splitOnCommas(data.csv_text).map((fields) => fields.length) },
    kept: steps.filter((step) => step.decision === 'kept').map((step) => step.id),
    skipped: worked.skipped,
    jsonl: toJsonl(worked.examples),
    practice: {
      max_chars: data.max_chars,
      steps: practice.decisions.map((entry) => ({ id: entry.id, chars: entry.chars, decision: entry.decision })),
      kept: practice.decisions.filter((entry) => entry.decision === 'kept').map((entry) => entry.id),
      skipped: practice.skipped,
      jsonl: toJsonl(practice.examples),
    },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each row gets a pick-up, a
// glide into the parser, its four fields, the shards a split on commas would
// have made, a decision, and the move to the output; about three seconds in
// all, with the rest of the beat to read the caption.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption and the field counts appear
const ROW_BEAT = 3.0;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;
const GLIDE_AT = 0.3;            // sub-phases inside a row beat
const GLIDE = 0.7;
const FIELDS_AT = 1.0;
const SHARDS_AT = 1.3;
const DECIDE_AT = 1.8;
const MOVE_AT = 2.3;
const MOVE = 0.6;

function rowCaption(step, lineNumber) {
  const counts = step.naive_lines.map((shards) => shards.length);
  if (step.decision === 'not_closed') {
    return `${step.id}: status "${step.fields[3]}", so it is skipped as not_closed; the reply is never looked at.`;
  }
  if (step.decision === 'empty_reply') {
    return `${step.id}: status closed, but the reply is empty after strip, so it is skipped as empty_reply.`;
  }
  if (step.quoted && counts.length > 1) {
    return `${step.id}: the quoted reply spans two lines of the file, and the module reads it as one field (split on commas would give ${counts.join(' and ')} fields). json.dumps writes the line break as two characters, so JSONL line ${lineNumber} stays one line.`;
  }
  if (step.quoted) {
    return `${step.id}: the reply is quoted, so the comma inside it stays in one field; split on commas would give ${counts[0]} fields. Status closed, reply present: kept as JSONL line ${lineNumber}.`;
  }
  return `${step.id}: ${counts[0]} fields, no quotes. Status closed, reply present: kept as JSONL line ${lineNumber}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = trace.steps.length;
  const counts = trace.naive.field_counts;
  const wrong = counts.filter((count) => count !== 4).length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} rows of the support export, one ticket per record: id, question, reply, status. Two replies are quoted: one holds a comma, one holds a line break.`,
    captionLate: `What shipped: split every line on commas. That gives ${counts.length} lines with ${counts.join(', ')} fields: ${wrong} broken lines, two of the ${n} rows shredded.` });
  t += INTRO;
  let lineNumber = 0;
  trace.steps.forEach((step, index) => {
    if (step.decision === 'kept') lineNumber += 1;
    beats.push({ kind: 'row', start: t, duration: ROW_BEAT, index, step, lineNumber: step.decision === 'kept' ? lineNumber : null, caption: rowCaption(step, lineNumber) });
    t += ROW_BEAT;
  });
  const skippedText = Object.entries(trace.skipped).map(([reason, ids]) => `${reason} ${ids.join(', ')}`).join('; ');
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${n} rows read, ${trace.kept.length} examples kept: JSONL lines 1 to ${trace.kept.length}. Skipped: ${skippedText}. Each kept line is one JSON object, and the line break inside ${trace.steps.find((step) => step.quoted && step.naive_lines.length > 1).id} travels as two characters.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: a character budget of ${data.max_chars} on the prompt plus the completion, checked after the status and the reply.` });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  const over = p.steps.filter((step) => step.decision === 'too_long');
  const fit = p.steps.filter((step) => step.decision === 'kept');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${over.map((step) => `${step.id} is ${step.chars} characters`).join(', ')}, over the budget of ${data.max_chars}, so it is skipped as too_long; ${fit.map((step) => `${step.id} (${step.chars})`).join(' and ')} fit. ${p.kept.length} examples kept.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: every row's state, the parser
// panel, the output lines, the skipped box, the counts, and the practice meter.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const activeIndex = beat.kind === 'row' ? beat.index : (beatIndex > outroBeat - 1 ? trace.steps.length : -1);

  // Row tiles: settled rows carry their decision; the active row is marked once its decision shows.
  const rows = trace.steps.map((step, index) => {
    let state = 'pending';
    if (index < activeIndex) state = step.decision === 'kept' ? 'kept' : 'skipped';
    else if (index === activeIndex && beat.kind === 'row') state = local >= DECIDE_AT ? (step.decision === 'kept' ? 'kept' : 'skipped') : 'active';
    const alpha = beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.25, 0.4) : 1;
    return { id: step.id, status: step.fields[3], raw: step.naive_lines[0].join(','), quoted: step.quoted, decision: step.decision, state, alpha };
  });
  const naiveAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : 1;

  // The parser panel for the active row.
  let parser = null;
  if (beat.kind === 'row') {
    const step = beat.step;
    const glide = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    const fieldsIn = ramp(local, FIELDS_AT, 0.6);
    const shardsAlpha = ramp(local, SHARDS_AT, 0.4);
    const decideAlpha = ramp(local, DECIDE_AT, 0.4);
    const moving = step.decision === 'kept' || true;
    const move = ramp(local, MOVE_AT, MOVE);
    parser = {
      id: step.id, glide, ghostAlpha: local < FIELDS_AT ? 1 : 1 - ramp(local, FIELDS_AT, 0.3),
      fields: trace.required.map((name, i) => ({ name, value: step.fields[i], quoted: step.quoted && name === 'agent_reply', alpha: clamp01(fieldsIn * 4 - i) })),
      shards: step.naive_lines, shardsAlpha,
      decision: step.decision, lineNumber: beat.lineNumber, decideAlpha,
      move: easeInOut(move), moving: local >= MOVE_AT && move < 1,
    };
  }

  // Output lines and the skipped box: settled before this beat, arriving during it.
  const settledKept = [];
  const settledSkipped = [];
  trace.steps.forEach((step, index) => {
    const done = index < activeIndex || (index === activeIndex && beat.kind === 'row' && local >= MOVE_AT + MOVE);
    if (!done) return;
    if (step.decision === 'kept') settledKept.push({ id: step.id, text: step.line, n: settledKept.length + 1, alpha: 1 });
    else settledSkipped.push({ id: step.id, reason: step.decision, alpha: 1 });
  });
  const counts = { rows: settledKept.length + settledSkipped.length, kept: settledKept.length, skipped: settledSkipped.length };

  // The practice meter: every kept example's length against the budget.
  let meter = null;
  if (beat.kind === 'practice' || beatIndex > practiceBeat) {
    const grow = beat.kind === 'practice' ? easeInOut(ramp(local, 0.2, 1.2)) : 1;
    const verdictAlpha = beat.kind === 'practice' ? ramp(local, 1.6, 0.5) : 1;
    meter = {
      budget: trace.practice.max_chars, alpha: beat.kind === 'practice' ? ramp(local, 0, 0.3) : 1, verdictAlpha,
      items: trace.practice.steps.filter((step) => step.decision === 'kept' || step.decision === 'too_long').map((step) => ({ id: step.id, chars: step.chars, shown: step.chars * grow, over: step.decision === 'too_long' })),
      kept: trace.practice.kept.length,
    };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, naiveAlpha, naiveCounts: trace.naive.field_counts, parser, output: settledKept, skipped: settledSkipped, counts,
    total: trace.steps.length, meter, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const CX = 28, CW = 276, ROW_Y = 78, ROW_H = 40, ROW_GAP = 48;   // the export column
const PX = 324, PW = 272;                                         // the parser column
const OX = 616, OW = 256, OUT_Y = 78, OUT_H = 44, OUT_GAP = 52;   // the output column

const fit = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const reasonColor = (reason) => (reason === 'kept' ? GREEN : reason === 'not_closed' ? AMBER : RED);

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}
function panel(ctx, x, y, w, h, stroke = LINE, fill = PANEL) {
  ctx.fillStyle = fill; rounded(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = stroke; rounded(ctx, x, y, w, h, 6); ctx.stroke();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('csv.DictReader over the export: closed tickets with a reply become JSONL examples', CX, 34);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('export.csv  (ticket_id, question, reply, status)', CX, 62);
  ctx.fillText('csv.DictReader row', PX, 62);
  ctx.fillText('examples.jsonl', OX, 62);

  // The export rows.
  scene.rows.forEach((row, index) => {
    if (row.alpha <= 0) return;
    const y = ROW_Y + index * ROW_GAP;
    ctx.globalAlpha = row.alpha;
    const stroke = row.state === 'active' ? BLUE : row.state === 'kept' ? GREEN : row.state === 'skipped' ? reasonColor(row.decision) : LINE;
    panel(ctx, CX, y, CW, ROW_H, stroke, row.state === 'pending' ? PANEL : '#1a2236');
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(row.id, CX + 10, y + 16);
    ctx.fillStyle = row.status === 'closed' ? GREEN : AMBER;
    ctx.fillText(row.status, CX + 40, y + 16);
    if (row.quoted) { ctx.fillStyle = BLUE; ctx.fillText('quoted reply', CX + 100, y + 16); }
    if (row.state === 'kept' || row.state === 'skipped') { ctx.fillStyle = reasonColor(row.decision); ctx.textAlign = 'right'; ctx.fillText(row.decision, CX + CW - 10, y + 16); ctx.textAlign = 'left'; }
    ctx.font = `10.5px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText(fit(row.raw, 40), CX + 10, y + 32);
    ctx.globalAlpha = 1;
  });
  if (scene.naiveAlpha > 0) {
    ctx.globalAlpha = scene.naiveAlpha;
    const y = ROW_Y + scene.rows.length * ROW_GAP + 10;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText('what shipped: split(",") on every line of the file', CX, y);
    ctx.fillText('fields per line:', CX, y + 16);
    let x = CX + 112;
    scene.naiveCounts.forEach((count) => {
      ctx.fillStyle = count === 4 ? DIM : AMBER;
      ctx.fillText(String(count), x, y + 16);
      x += 14;
    });
    ctx.fillStyle = DIM;
    ctx.fillText('six lines for five rows: two rows shredded', CX, y + 32);
    ctx.globalAlpha = 1;
  }

  // The parser panel.
  panel(ctx, PX, ROW_Y, PW, 300);
  const p = scene.parser;
  if (p) {
    if (p.ghostAlpha > 0 && p.glide < 1) {
      const rowY = ROW_Y + scene.rows.findIndex((row) => row.id === p.id) * ROW_GAP;
      const gx = CX + (PX - CX) * p.glide;
      const gy = rowY + (ROW_Y - rowY) * p.glide;
      ctx.globalAlpha = p.ghostAlpha * 0.9;
      panel(ctx, gx, gy, CW, ROW_H, BLUE, '#1a2236');
      ctx.font = `12px ${MONO}`; ctx.fillStyle = INK; ctx.fillText(p.id, gx + 10, gy + 24);
      ctx.globalAlpha = 1;
    }
    p.fields.forEach((field, i) => {
      const y = ROW_Y + 14 + i * 46;
      ctx.globalAlpha = field.alpha;
      ctx.font = `10.5px ${MONO}`; ctx.fillStyle = DIM; ctx.fillText(field.name, PX + 10, y + 14);
      const lines = field.value.split('\n');
      panel(ctx, PX + 124, y, PW - 134, lines.length > 1 ? 36 : 24, field.quoted ? BLUE : LINE, '#141b2c');
      ctx.font = `11px ${MONO}`; ctx.fillStyle = INK;
      lines.forEach((line, k) => ctx.fillText(fit(line, 19), PX + 130, y + 16 + k * 13));
      if (field.quoted) { ctx.font = `10px ${MONO}`; ctx.fillStyle = BLUE; ctx.fillText('one field', PX + 10, y + 27); }
      ctx.globalAlpha = 1;
    });
    if (p.shardsAlpha > 0) {
      ctx.globalAlpha = p.shardsAlpha;
      const y0 = ROW_Y + 208;
      ctx.font = `10.5px ${MONO}`; ctx.fillStyle = DIM;
      const total = p.shards.map((shards) => shards.length);
      ctx.fillText(`split(",") would give ${total.join(' and ')} fields:`, PX + 10, y0);
      p.shards.forEach((shards, lineIndex) => {
        let x = PX + 10;
        const y = y0 + 10 + lineIndex * 20;
        shards.forEach((shard, k) => {
          const text = fit(shard.trim() || '""', 9);
          const w = text.length * 6.6 + 8;
          ctx.globalAlpha = p.shardsAlpha * 0.6;
          panel(ctx, x, y, w, 15, total[lineIndex] === 4 && total.length === 1 ? LINE : AMBER, '#141b2c');
          ctx.fillStyle = k % 2 ? DIM : INK;
          ctx.fillText(text, x + 4, y + 11);
          x += w + 4;
        });
      });
      ctx.globalAlpha = 1;
    }
    if (p.decideAlpha > 0) {
      ctx.globalAlpha = p.decideAlpha;
      const label = p.decision === 'kept' ? `kept: JSONL line ${p.lineNumber}` : `skipped: ${p.decision}`;
      panel(ctx, PX + 10, ROW_Y + 262, PW - 20, 26, reasonColor(p.decision), '#141b2c');
      ctx.font = `12px ${MONO}`; ctx.fillStyle = reasonColor(p.decision); ctx.fillText(label, PX + 20, ROW_Y + 280);
      ctx.globalAlpha = 1;
    }
    if (p.moving) {
      // The chip travels from the decision box to its slot in the output column.
      const fromX = PX + 10, fromY = ROW_Y + 262;
      const slot = p.decision === 'kept' ? scene.output.length : scene.skipped.length;
      const toX = OX, toY = p.decision === 'kept' ? OUT_Y + slot * OUT_GAP : 262 + slot * 18;
      const x = fromX + (toX - fromX) * p.move, y = fromY + (toY - fromY) * p.move;
      panel(ctx, x, y, 120, 22, reasonColor(p.decision), '#141b2c');
      ctx.font = `11px ${MONO}`; ctx.fillStyle = reasonColor(p.decision);
      ctx.fillText(p.decision === 'kept' ? `${p.id}: line ${p.lineNumber}` : `${p.id}: ${p.decision}`, x + 8, y + 15);
    }
  } else {
    ctx.font = `11px ${MONO}`; ctx.fillStyle = DIM;
    ctx.fillText(scene.beat === 'intro' ? 'the next row passes through here' : 'every row has passed through', PX + 12, ROW_Y + 26);
  }

  // The output column: JSONL lines, the skipped box, the counts.
  scene.output.forEach((line, index) => {
    const y = OUT_Y + index * OUT_GAP;
    ctx.globalAlpha = line.alpha;
    panel(ctx, OX, y, OW, OUT_H, GREEN, '#141b2c');
    ctx.font = `10.5px ${MONO}`; ctx.fillStyle = DIM; ctx.fillText(String(line.n), OX + 8, y + 17);
    ctx.fillStyle = INK;
    const cut = line.text.indexOf(', "completion"');
    ctx.fillText(fit(line.text.slice(0, cut), 33), OX + 24, y + 17);
    ctx.fillText(fit(line.text.slice(cut + 2), 33), OX + 24, y + 33);
    ctx.globalAlpha = 1;
  });
  panel(ctx, OX, 242, OW, 72);
  ctx.font = `10.5px ${MONO}`; ctx.fillStyle = DIM; ctx.fillText('skipped', OX + 10, 258);
  scene.skipped.forEach((entry, index) => {
    ctx.globalAlpha = entry.alpha;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = reasonColor(entry.reason);
    ctx.fillText(`${entry.id}  ${entry.reason}`, OX + 10, 276 + index * 18);
    ctx.globalAlpha = 1;
  });
  ctx.font = `12px ${MONO}`; ctx.fillStyle = INK;
  ctx.fillText(`${scene.counts.rows} of ${scene.total} rows read, ${scene.counts.kept} kept, ${scene.counts.skipped} skipped`, OX, 336);

  // The practice meter.
  if (scene.meter && scene.meter.alpha > 0) {
    const m = scene.meter;
    ctx.globalAlpha = m.alpha;
    panel(ctx, OX, 350, OW, 120);
    ctx.font = `10.5px ${MONO}`; ctx.fillStyle = DIM;
    ctx.fillText(`practice: budget ${m.budget} characters`, OX + 10, 366);
    const x0 = OX + 44, span = OW - 60, scale = span / 100;
    const budgetX = x0 + m.budget * scale;
    m.items.forEach((item, index) => {
      const y = 380 + index * 24;
      ctx.fillStyle = INK; ctx.font = `11px ${MONO}`; ctx.fillText(item.id, OX + 10, y + 12);
      ctx.fillStyle = '#141b2c'; ctx.fillRect(x0, y, span, 14);
      ctx.fillStyle = item.over && m.verdictAlpha > 0.5 ? RED : BLUE;
      ctx.fillRect(x0, y, Math.min(span, item.shown * scale), 14);
      ctx.fillStyle = DIM; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
      ctx.fillText(String(item.chars), x0 + span, y + 11);
      ctx.textAlign = 'left';
    });
    ctx.strokeStyle = AMBER; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(budgetX, 376); ctx.lineTo(budgetX, 452); ctx.stroke();
    ctx.setLineDash([]);
    if (m.verdictAlpha > 0) {
      ctx.globalAlpha = m.alpha * m.verdictAlpha;
      ctx.fillStyle = INK; ctx.font = `11px ${MONO}`;
      const over = m.items.filter((item) => item.over).map((item) => `${item.id} too_long`).join(', ');
      ctx.fillText(`${over}; ${m.kept} kept`, OX + 10, 464);
    }
    ctx.globalAlpha = 1;
  }
}
