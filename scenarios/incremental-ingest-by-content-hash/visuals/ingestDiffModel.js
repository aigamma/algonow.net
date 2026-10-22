// The lesson's animation, without a DOM: the same build_manifest and
// plan_ingest as solution.py (and practice_answer.py with moves detected), run
// on the same documents (python/fixtures/documents.json), recorded as a trace,
// laid out on a reading-pace timeline, and turned into a drawable scene for any
// moment. The browser model does not compute SHA-256 itself: the fixture
// carries the real hex digest of every text, and a Python test pins each one to
// content_hash. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture cannot
// drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const short = (hash) => (hash === null ? '(none)' : hash.slice(0, 12));

// build_manifest from solution.py, reading the recorded digest of each text.
export function buildManifest(docs) {
  const manifest = {};
  for (const doc of docs) {
    if (has(manifest, doc.id)) throw new Error(`duplicate document id '${doc.id}'`);
    manifest[doc.id] = doc.sha256;
  }
  return manifest;
}

// plan_ingest from solution.py; with detectMoves it is practice_answer.py.
export function planIngest(previous, docs, detectMoves = false) {
  const manifest = buildManifest(docs);
  const deleted = Object.keys(previous).filter((id) => !has(manifest, id)).sort();
  const movedFrom = new Map();
  if (detectMoves) for (const oldId of deleted) movedFrom.set(previous[oldId], oldId);
  const rows = [];
  for (const docId of Object.keys(manifest)) {
    const current = manifest[docId];
    if (has(previous, docId) && previous[docId] === current) {
      rows.push({ id: docId, decision: 'unchanged', previous: current, current });
    } else if (has(previous, docId)) {
      rows.push({ id: docId, decision: 'changed', previous: previous[docId], current });
    } else if (movedFrom.has(current)) {
      const oldId = movedFrom.get(current);
      rows.push({ id: docId, decision: 'moved', previous: current, current, from: oldId });
      deleted.splice(deleted.indexOf(oldId), 1);
    } else {
      rows.push({ id: docId, decision: 'new', previous: null, current });
    }
  }
  for (const oldId of deleted) rows.push({ id: oldId, decision: 'deleted', previous: previous[oldId], current: null });
  return { rows, manifest };
}

const idsWith = (rows, decision) => rows.filter((row) => row.decision === decision).map((row) => row.id);

export function buildTrace(data) {
  const previous = buildManifest(data.previous);
  const worked = planIngest(previous, data.current, false);
  const embed = [...idsWith(worked.rows, 'changed'), ...idsWith(worked.rows, 'new')];
  const deleted = idsWith(worked.rows, 'deleted');
  const skip = idsWith(worked.rows, 'unchanged');
  const practice = planIngest(previous, data.current, true);
  const moved = idsWith(practice.rows, 'moved');
  const pEmbed = [...idsWith(practice.rows, 'changed'), ...idsWith(practice.rows, 'new')];
  const pDeleted = idsWith(practice.rows, 'deleted');
  const pSkip = idsWith(practice.rows, 'unchanged');
  const total = data.current.length;
  return {
    previous,
    rows: worked.rows,
    manifest: worked.manifest,
    plan: { embed, delete: deleted, skip },
    counts: { embed: embed.length, delete: deleted.length, skip: skip.length, total, saved_percent: Math.floor((100 * skip.length) / total) },
    practice: {
      rows: practice.rows,
      moved,
      plan: { embed: pEmbed, delete: pDeleted, skip: pSkip },
      counts: { embed: pEmbed.length, moved: moved.length, delete: pDeleted.length, skip: pSkip.length,
        saved_percent: Math.floor((100 * (pSkip.length + moved.length)) / total) },
    },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each document gets a hash, a
// glide to its manifest row, and a decision, with the rest of the beat to read
// the caption; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const DOC_BEAT = 2.8;
const DELETED_BEAT = 2.8;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;
const HASH_AT = 0.1, HASH = 0.5;    // sub-phases inside a document beat
const GLIDE_AT = 0.6, GLIDE = 0.8;
const BADGE_AT = 1.4, BADGE = 0.5;

const list = (ids) => (ids.length ? ids.join(', ') : 'none');

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.previous.length;
  const m = data.current.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} documents in the previous run's manifest, each with the SHA-256 hash of its text, and ${m} documents in tonight's export. The hashes decide what is embedded again.`,
    captionLate: `What shipped: every document re-embedded every night. ${m} embeddings on an export of ${m}, whether or not anything changed.` });
  t += INTRO;
  const running = { embed: 0, delete: 0, skip: 0 };
  trace.rows.forEach((row, index) => {
    if (row.decision === 'unchanged') running.skip += 1;
    else if (row.decision === 'deleted') running.delete += 1;
    else running.embed += 1;
    let caption;
    if (row.decision === 'unchanged') caption = `${row.id}: hash ${short(row.current)} equals the manifest's ${short(row.previous)}: unchanged, skipped. Running plan: embed ${running.embed}, skip ${running.skip}.`;
    else if (row.decision === 'changed') caption = `${row.id}: hash ${short(row.current)} differs from the manifest's ${short(row.previous)}: changed, re-embed. Running plan: embed ${running.embed}, skip ${running.skip}.`;
    else if (row.decision === 'new') caption = `${row.id}: hash ${short(row.current)}, and the manifest has no ${row.id}: new, embed. Running plan: embed ${running.embed}, skip ${running.skip}.`;
    else caption = `${row.id} is in the manifest but not in tonight's export: deleted; its vectors leave the index. Running plan: embed ${running.embed}, delete ${running.delete}, skip ${running.skip}.`;
    beats.push({ kind: row.decision === 'deleted' ? 'deleted' : 'doc', start: t, duration: row.decision === 'deleted' ? DELETED_BEAT : DOC_BEAT, row, index, caption });
    t += row.decision === 'deleted' ? DELETED_BEAT : DOC_BEAT;
  });
  const c = trace.counts;
  const twin = trace.rows.find((row) => row.decision === 'new' && trace.rows.some((other) => other.decision === 'deleted' && other.previous === row.current));
  const twinOld = twin ? trace.rows.find((other) => other.decision === 'deleted' && other.previous === twin.current) : null;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `plan: embed ${c.embed} (${list(trace.plan.embed)}), delete ${c.delete} (${list(trace.plan.delete)}), skip ${c.skip} (${list(trace.plan.skip)}): ${c.skip} of ${c.total} embeddings saved, ${c.saved_percent} percent.${twin ? ` Look at ${twin.id} and ${twinOld.id}: the same hash.` : ''}` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: a new id whose hash equals a deleted document\'s hash is a move, not a new document.' });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  const moves = p.rows.filter((row) => row.decision === 'moved').map((row) => `${row.from} -> ${row.id}`);
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `With moves detected: ${moves.length ? `${moves.join(', ')}, so nothing is deleted and nothing is embedded for it` : 'no move found'}. embed ${p.counts.embed} (${list(p.plan.embed)}), moved ${p.counts.moved} (${list(moves)}), delete ${p.counts.delete} (${list(p.plan.delete)}), skip ${p.counts.skip} (${list(p.plan.skip)}): ${p.counts.saved_percent} percent saved.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: both columns, the connector in
// flight, the decision badges, the plan panel, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const inPractice = beatIndex >= practiceBeat;
  const practiceAlpha = beat.kind === 'practice' ? ramp(local, 0.3, 0.8) : (inPractice ? 1 : 0);
  const prevIndex = (id) => data.previous.findIndex((doc) => doc.id === id);
  const curIndex = (id) => data.current.findIndex((doc) => doc.id === id);
  const practiceRowFor = (id) => trace.practice.rows.find((row) => row.id === id);

  // Which rows are already decided: every beat before this one, plus this
  // one once its badge has appeared.
  const decided = new Map();
  timeline.beats.forEach((b, index) => {
    if ((b.kind !== 'doc' && b.kind !== 'deleted') || index > beatIndex) return;
    const done = index < beatIndex || local >= BADGE_AT;
    decided.set(b.row.id, { row: b.row, done, badgeAlpha: index < beatIndex ? 1 : ramp(local, BADGE_AT, BADGE) });
  });

  const previousRows = data.previous.map((doc, index) => {
    const entry = decided.get(doc.id);
    let state = 'idle';
    if (entry && entry.done) {
      if (entry.row.decision === 'unchanged') state = 'match';
      else if (entry.row.decision === 'changed') state = 'differs';
      else if (entry.row.decision === 'deleted') state = 'deleted';
    }
    if (inPractice && practiceAlpha >= 0.5 && trace.practice.rows.some((row) => row.decision === 'moved' && row.from === doc.id)) state = 'moved';
    const alpha = beat.kind === 'intro' ? ramp(local, 0.1 + index * 0.12, 0.4) : 1;
    return { id: doc.id, text: doc.text, hash: doc.sha256, state, alpha, index };
  });

  const currentRows = data.current.map((doc, index) => {
    const entry = decided.get(doc.id);
    const isCurrentBeat = (beat.kind === 'doc') && beat.row.id === doc.id;
    let hashAlpha = 0;
    if (entry || isCurrentBeat) hashAlpha = isCurrentBeat ? ramp(local, HASH_AT, HASH) : 1;
    let decision = entry && entry.done ? entry.row.decision : null;
    let fromId = null;
    const practiceRow = practiceRowFor(doc.id);
    if (inPractice && practiceAlpha >= 0.5 && practiceRow && practiceRow.decision === 'moved') { decision = 'moved'; fromId = practiceRow.from; }
    const alpha = beat.kind === 'intro' ? ramp(local, 0.9 + index * 0.12, 0.4) : 1;
    return { id: doc.id, text: doc.text, hash: doc.sha256, hashAlpha, decision, badgeAlpha: entry ? entry.badgeAlpha : 0, fromId, alpha, index };
  });

  let link = null;
  if (beat.kind === 'doc') {
    const progress = easeInOut(ramp(local, GLIDE_AT, GLIDE));
    const target = prevIndex(beat.row.id);
    link = { from: curIndex(beat.row.id), to: target, progress, decision: beat.row.decision, alpha: progress > 0 ? 1 : 0 };
  } else if (beat.kind === 'deleted') {
    link = { from: -1, to: prevIndex(beat.row.id), progress: easeInOut(ramp(local, GLIDE_AT, GLIDE)), decision: 'deleted', alpha: 1 };
  }
  const moveLinks = inPractice ? trace.practice.rows.filter((row) => row.decision === 'moved').map((row) => ({ from: prevIndex(row.from), to: curIndex(row.id), alpha: practiceAlpha })) : [];

  const planAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const counts = inPractice && practiceAlpha >= 0.5 ? { ...trace.practice.counts, practice: true } : { ...trace.counts, moved: 0, practice: false };
  const shippedAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : 0.6;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, previousRows, currentRows, link, moveLinks, plan: { ...counts, alpha: planAlpha }, shippedAlpha, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 36, LW = 360;                 // the previous manifest column
const RX = 504, RW = 360;                // the current export column
const ROW_Y = 92, ROW_H = 56;            // five rows in each column
const PLAN_Y = 392, PLAN_H = 74;         // the plan panel along the bottom
const CHIP_H = 18;

const COLOR_FOR = { unchanged: GREEN, changed: BLUE, new: AMBER, deleted: RED, moved: GREEN };
const LABEL_FOR = { unchanged: 'unchanged: skip', changed: 'changed: embed', new: 'new: embed', deleted: 'deleted: remove', moved: 'moved: keep' };

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function snippet(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function drawRow(ctx, x, width, y, row, side, color) {
  ctx.save();
  ctx.globalAlpha = row.alpha;
  ctx.fillStyle = PANEL;
  rounded(ctx, x, y, width, ROW_H - 8, 6); ctx.fill();
  if (color) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; rounded(ctx, x, y, width, ROW_H - 8, 6); ctx.stroke(); }
  ctx.font = `bold 12px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(row.id, x + 10, y + 17);
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(snippet(row.text, 44), x + 40, y + 17);
  // The hash chip on the second line: the current column reveals it when hashed.
  const hashAlpha = side === 'previous' ? 1 : row.hashAlpha;
  if (hashAlpha > 0) {
    ctx.globalAlpha = row.alpha * hashAlpha;
    ctx.fillStyle = BG;
    rounded(ctx, x + 10, y + 24, 118, CHIP_H, 4); ctx.fill();
    ctx.fillStyle = color || DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`sha256 ${row.hash.slice(0, 12)}`, x + 16, y + 37);
  }
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('plan tonight\'s ingest from content hashes: embed only what changed', 28, 34);
  if (scene.shippedAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.fillStyle = AMBER;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`what shipped: re-embed all ${scene.currentRows.length}, every night`, 28, 54);
    ctx.restore();
  }
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('previous manifest (saved by the last run)', LX, ROW_Y - 10);
  ctx.fillText('tonight\'s export', RX, ROW_Y - 10);

  const stateColor = { idle: null, match: GREEN, differs: BLUE, deleted: RED, moved: GREEN };
  scene.previousRows.forEach((row) => drawRow(ctx, LX, LW, ROW_Y + row.index * ROW_H, row, 'previous', stateColor[row.state]));
  scene.currentRows.forEach((row) => drawRow(ctx, RX, RW, ROW_Y + row.index * ROW_H, row, 'current', row.decision ? COLOR_FOR[row.decision] : null));

  // The connector in flight: from the current row's chip toward its manifest row
  // (or down to "no entry" for a new document), then the decision badge.
  const chipY = (index) => ROW_Y + index * ROW_H + 24 + CHIP_H / 2;
  if (scene.link && scene.link.alpha > 0 && scene.link.progress > 0) {
    const { link } = scene;
    ctx.save();
    ctx.strokeStyle = COLOR_FOR[link.decision];
    ctx.lineWidth = 2;
    if (link.decision === 'new' || link.decision === 'deleted') ctx.setLineDash([5, 4]);
    const x0 = link.from >= 0 ? RX + 10 : LX + LW;
    const y0 = link.from >= 0 ? chipY(link.from) : chipY(link.to);
    const x1 = (link.decision === 'new' || link.decision === 'deleted') ? LX + LW + 54 : LX + 128;   // new and deleted sweep into the gap
    const y1 = link.decision === 'new' ? ROW_Y + scene.previousRows.length * ROW_H - 4 : (link.decision === 'deleted' ? y0 : chipY(link.to));
    const x = x0 + (x1 - x0) * link.progress;
    const y = y0 + (y1 - y0) * link.progress;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.setLineDash([]);
    if (link.decision === 'new' && link.progress >= 1) {
      ctx.fillStyle = AMBER;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText('no such id', LX + LW + 10, y1 + 4);
    }
    ctx.restore();
  }
  // The practice move link is drawn first so the badges (filled with the background) stay legible over it.
  for (const move of scene.moveLinks) {
    if (move.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = move.alpha;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(LX + LW, chipY(move.from));
    ctx.bezierCurveTo(LX + LW + 50, chipY(move.from), RX - 50, chipY(move.to), RX, chipY(move.to));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('same hash', (LX + LW + RX) / 2, ROW_Y + Math.max(move.from, move.to) * ROW_H + ROW_H + 6);   // under the lower row, clear of the badges
    ctx.restore();
  }

  scene.currentRows.forEach((row) => {
    if (!row.decision || row.badgeAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = row.badgeAlpha;
    const label = row.decision === 'moved' ? `moved from ${row.fromId}: keep` : LABEL_FOR[row.decision];
    ctx.font = `10.5px ${MONO}`;
    const width = ctx.measureText ? Math.max(84, ctx.measureText(label).width + 14) : 110;
    const x = (LX + LW + RX) / 2 - width / 2;
    const y = ROW_Y + row.index * ROW_H + 2;
    ctx.fillStyle = BG;
    rounded(ctx, x, y, width, 18, 9); ctx.fill();
    ctx.strokeStyle = COLOR_FOR[row.decision];
    rounded(ctx, x, y, width, 18, 9); ctx.stroke();
    ctx.fillStyle = COLOR_FOR[row.decision];
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + 13);
    ctx.restore();
  });
  scene.previousRows.forEach((row) => {
    if (row.state !== 'deleted' && row.state !== 'moved') return;
    ctx.save();
    ctx.fillStyle = row.state === 'deleted' ? RED : GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(row.state === 'deleted' ? 'not in the export: delete' : 'moved: vectors kept', LX + 140, chipY(row.index) + 4);
    ctx.restore();
  });
  // The plan panel.
  ctx.fillStyle = PANEL;
  rounded(ctx, LX, PLAN_Y, RX + RW - LX, PLAN_H, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, LX, PLAN_Y, RX + RW - LX, PLAN_H, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText(scene.plan.practice ? 'the plan, with moves detected' : 'the plan: what tonight\'s job does', LX + 12, PLAN_Y + 20);
  if (scene.plan.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.plan.alpha;
    const items = [[`embed ${scene.plan.embed}`, BLUE], [`delete ${scene.plan.delete}`, RED], [`skip ${scene.plan.skip}`, GREEN]];
    if (scene.plan.practice) items.splice(1, 0, [`moved ${scene.plan.moved}`, GREEN]);
    items.push([`${scene.plan.saved_percent}% of the embeddings saved`, INK]);
    ctx.font = `12px ${MONO}`;
    let x = LX + 12;
    for (const [label, color] of items) {
      ctx.fillStyle = color;
      ctx.fillText(label, x, PLAN_Y + 48);
      x += (ctx.measureText ? ctx.measureText(label).width : label.length * 7.2) + 28;
    }
    ctx.restore();
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText('deciding document by document', LX + 12, PLAN_Y + 48);
  }
  ctx.globalAlpha = 1;
}
