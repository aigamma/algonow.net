// The lesson's animation, without a DOM: the same dot, norm, cosine, and
// rank_chunks as solution.py, run on the same five chunks
// (python/fixtures/chunks.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift
// from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const lerp = (from, to, p) => from + (to - from) * p;
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

// dot, norm, cosine, by_score_then_id, and rank_chunks from solution.py
// (rank_chunks with a minimum is the practice answer; minimum 0 is the worked run).
export function dot(a, b) {
  if (a.length !== b.length) throw new Error('zip() argument 2 is shorter than argument 1');
  let total = 0.0;
  for (let index = 0; index < a.length; index += 1) total += a[index] * b[index];
  return total;
}
export function norm(a) {
  return Math.sqrt(dot(a, a));
}
export function cosine(a, b) {
  const lengthA = norm(a);
  const lengthB = norm(b);
  if (lengthA === 0 || lengthB === 0) throw new Error('a zero vector has no direction');
  return dot(a, b) / (lengthA * lengthB);
}
export function byScoreThenId(x, y) {
  if (x.score !== y.score) return y.score - x.score;
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}
export function rankChunks(query, chunks, k, minimum = 0) {
  const scored = [];
  for (const chunk of chunks) {
    const score = cosine(query, chunk.vector);
    if (score < minimum) continue;
    scored.push({ id: chunk.id, score });
  }
  scored.sort(byScoreThenId);
  return scored.slice(0, k);
}

export function buildTrace(data) {
  const { query, chunks } = data;
  const rows = chunks.map((chunk) => ({ id: chunk.id, title: chunk.title, dot: round6(dot(query, chunk.vector)), norm: round6(norm(chunk.vector)), cosine: round6(cosine(query, chunk.vector)) }));
  const order = (scoreOf) => chunks.map((chunk) => ({ id: chunk.id, score: scoreOf(chunk.vector) })).sort(byScoreThenId).map((record) => record.id);
  const top = rankChunks(query, chunks, data.k);
  const kept = rankChunks(query, chunks, data.k, data.minimum);
  const full = chunks.map((chunk) => ({ id: chunk.id, score: cosine(query, chunk.vector) })).sort(byScoreThenId);
  return {
    k: data.k,
    query_norm: round6(norm(query)),
    rows,
    by_dot: order((vector) => dot(query, vector)),
    by_cosine: order((vector) => cosine(query, vector)),
    top: top.map((record) => ({ id: record.id, score: round6(record.score) })),
    practice: {
      minimum: data.minimum,
      kept: kept.map((record) => ({ id: record.id, score: round6(record.score) })),
      dropped: full.filter((record) => record.score < data.minimum).map((record) => record.id),
    },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. One beat per chunk computes
// its two scores, one beat sorts the rows into cosine order one move at a
// time, and the whole run is under half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const CHUNK_BEAT = 2.6;         // name the chunk, grow the dot bar, grow the cosine bar, read
const DOT_AT = 0.2;
const COS_AT = 0.95;
const GROW = 0.7;
const SORT_BEAT = 3.2;
const MOVE_STAGGER = 0.35;
const MOVE = 0.9;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = trace.rows.length;
  const byId = Object.fromEntries(trace.rows.map((row) => [row.id, row]));
  const first = byId[trace.by_dot[0]];
  const needed = trace.rows[0];
  const neededDotRank = trace.by_dot.indexOf(needed.id) + 1;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} runbook chunks and one question, all as vectors of ${data.query.length} numbers. The question: how do I rotate an API key? Which chunks should the assistant read?`,
    captionLate: `What shipped: ranked by the raw dot product. ${first.id} ${first.title} came first with ${f2(first.dot)}, and ${needed.id} ${needed.title} was ${ORDINALS[neededDotRank - 1]} with ${f2(needed.dot)}.` });
  t += INTRO;
  trace.rows.forEach((row, index) => {
    beats.push({ kind: 'chunk', start: t, duration: CHUNK_BEAT, index, id: row.id,
      caption: `${row.id} ${row.title}: dot ${f2(row.dot)}, lengths ${f2(trace.query_norm)} and ${f2(row.norm)}, cosine ${f3(row.cosine)}.` });
    t += CHUNK_BEAT;
  });
  const sortedList = trace.by_cosine.map((id) => `${id} ${f3(byId[id].cosine)}`).join(', ');
  beats.push({ kind: 'sort', start: t, duration: SORT_BEAT,
    caption: `Sorted by cosine: ${sortedList}. The rows move one at a time into cosine order; the dot product bars no longer decide anything.` });
  t += SORT_BEAT;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Top ${trace.k} by cosine: ${trace.top.map((record) => record.id).join(', ')}. By dot product the top ${trace.k} were ${trace.by_dot.slice(0, trace.k).join(', ')}: the runbook the user needed was ${ORDINALS[neededDotRank - 1]}, behind two long chunks.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: drop any chunk whose cosine is below a minimum of ${trace.practice.minimum}, even when fewer than ${trace.k} remain.` });
  t += PRACTICE_INTRO;
  const kept = trace.practice.kept.map((record) => `${record.id} (${f3(record.score)})`).join(' and ');
  const firstDropped = byId[trace.practice.dropped[0]];
  const others = trace.practice.dropped.slice(1).join(' and ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `With a minimum of ${trace.practice.minimum}: ${trace.practice.kept.length} chunks remain, ${kept}. ${firstDropped.id} at ${f3(firstDropped.cosine)} is dropped, and so are ${others}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

const ROW_Y0 = 100;      // center of the first row
const ROW_H = 58;
const slot = (index) => ROW_Y0 + index * ROW_H;

// The drawable state at `elapsed` seconds: every row's bars, position, and
// state, the readout, the cut line, the threshold line, and the caption.
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
  const maxDot = Math.max(...trace.rows.map((row) => row.dot));
  const cosineIndex = Object.fromEntries(trace.by_cosine.map((id, index) => [id, index]));
  const keptIds = new Set(trace.practice.kept.map((record) => record.id));

  const rows = trace.rows.map((row, index) => {
    let alpha = 1;
    let dotProgress = 0;
    let cosProgress = 0;
    if (beat.kind === 'intro') {
      alpha = ramp(local, 0.2 + index * 0.25, 0.5);
    } else if (beat.kind === 'chunk') {
      if (index < beat.index) { dotProgress = 1; cosProgress = 1; }
      if (index === beat.index) {
        dotProgress = easeInOut(ramp(local, DOT_AT, GROW));
        cosProgress = easeInOut(ramp(local, COS_AT, GROW));
      }
    } else {
      dotProgress = 1;
      cosProgress = 1;
    }
    let y = slot(index);
    if (beat.kind === 'sort') {
      const target = cosineIndex[row.id];
      const progress = easeInOut(ramp(local, target * MOVE_STAGGER, MOVE));
      y = lerp(slot(index), slot(target), progress);
    } else if (beatIndex > sortBeat) {
      y = slot(cosineIndex[row.id]);
    }
    let state = beat.kind === 'intro' || (beat.kind === 'chunk' && index > beat.index) ? 'pending' : 'scored';
    if (beat.kind === 'outro' || beatIndex > outroBeat) state = cosineIndex[row.id] < trace.k ? 'kept' : 'cut';
    let dropAlpha = 0;
    if (beat.kind === 'practice' || beatIndex > practiceBeat) {
      if (!keptIds.has(row.id)) { state = 'dropped'; dropAlpha = beat.kind === 'practice' ? ramp(local, 0.6, 0.8) : 1; }
    }
    return { id: row.id, title: row.title, dot: row.dot, norm: row.norm, cosine: row.cosine, dotFrac: row.dot / maxDot, cosFrac: row.cosine,
      dotProgress, cosProgress, y, alpha, state, dropAlpha };
  });

  // The readout follows the chunk being scored, then shows the two rankings.
  let readout = null;
  if (beat.kind === 'chunk') {
    const row = trace.rows[beat.index];
    readout = { id: row.id, title: row.title, dot: row.dot, queryNorm: trace.query_norm, norm: row.norm, cosine: row.cosine,
      showDot: local >= DOT_AT, showLengths: local >= DOT_AT + GROW * 0.6, showCosine: local >= COS_AT };
  } else if (beatIndex > sortBeat - 1 && beat.kind !== 'intro') {
    const row = trace.rows[trace.rows.length - 1];
    readout = { id: row.id, title: row.title, dot: row.dot, queryNorm: trace.query_norm, norm: row.norm, cosine: row.cosine, showDot: true, showLengths: true, showCosine: true };
  }
  const rankingsAlpha = beat.kind === 'sort' ? ramp(local, 0.4, 0.8) : (beatIndex > sortBeat ? 1 : 0);
  const cutAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat ? 1 : 0);
  const thresholdAlpha = beat.kind === 'practice' ? ramp(local, 0.1, 0.5) : (beatIndex > practiceBeat ? 1 : 0);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, readout, rankingsAlpha, byDot: trace.by_dot, byCosine: trace.by_cosine,
    k: trace.k, cutY: slot(trace.k - 1) + ROW_H / 2, cutAlpha, thresholdAlpha, minimum: trace.practice.minimum, maxDot,
    queryNorm: trace.query_norm, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LABEL_X = 28;                      // id and title
const BAR_X0 = 232, BAR_W = 330;         // both bars share the same scale width
const RX = 636, RW = 236, PY0 = 78;      // the readout panel and rankings column
const SY0 = 252, SY1 = 408;              // the rankings box

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`cosine = dot / (|query| × |chunk|): ${scene.rows.length} chunks, query length ${f2(scene.queryNorm)}, top ${scene.k} kept`, 28, 36);
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = AMBER;
  ctx.fillText(`dot product (scaled to the largest, ${f2(scene.maxDot)})`, BAR_X0, 64);
  ctx.fillStyle = BLUE;
  ctx.fillText('cosine (0 to 1)', BAR_X0 + 232, 64);

  // Rows: id and title, the amber dot bar above the blue cosine bar.
  const sortedByY = [...scene.rows].sort((a, b) => a.y - b.y);
  for (const row of sortedByY) {
    if (row.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = row.alpha * (row.state === 'cut' ? 0.45 : 1) * (row.state === 'dropped' ? 1 - 0.65 * row.dropAlpha : 1);
    ctx.fillStyle = row.state === 'kept' ? GREEN : (row.state === 'dropped' && row.dropAlpha > 0.5 ? RED : INK);
    ctx.font = `12px ${MONO}`;
    ctx.fillText(`${row.id}  ${row.title}`, LABEL_X, row.y + 4);
    // the dot bar
    ctx.fillStyle = LINE;
    ctx.fillRect(BAR_X0, row.y - 17, BAR_W, 10);
    const dotWidth = BAR_W * row.dotFrac * row.dotProgress;
    ctx.fillStyle = AMBER;
    ctx.fillRect(BAR_X0, row.y - 17, dotWidth, 10);
    if (row.dotProgress >= 1) {
      ctx.fillStyle = DIM;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText(f2(row.dot), BAR_X0 + dotWidth + 6, row.y - 8);
    }
    // the cosine bar
    ctx.fillStyle = LINE;
    ctx.fillRect(BAR_X0, row.y + 1, BAR_W, 10);
    const cosWidth = BAR_W * row.cosFrac * row.cosProgress;
    ctx.fillStyle = BLUE;
    ctx.fillRect(BAR_X0, row.y + 1, cosWidth, 10);
    if (row.cosProgress >= 1) {
      ctx.fillStyle = INK;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText(f3(row.cosine), BAR_X0 + cosWidth + 6, row.y + 10);
    }
    ctx.restore();
  }

  // The cut after the top k, and the practice threshold on the cosine scale.
  if (scene.cutAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.cutAlpha;
    ctx.strokeStyle = GREEN;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(LABEL_X, scene.cutY); ctx.lineTo(BAR_X0 + BAR_W + 40, scene.cutY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`top ${scene.k} kept`, LABEL_X, scene.cutY - 5);
    ctx.restore();
  }
  if (scene.thresholdAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.thresholdAlpha;
    const x = BAR_X0 + BAR_W * scene.minimum;
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, slot(0) - 30); ctx.lineTo(x, slot(scene.rows.length - 1) + 22); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`minimum ${scene.minimum}`, x + 6, slot(0) - 32);
    ctx.restore();
  }

  // Readout panel: the computation for the chunk being scored.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, PY0, RW, 150, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, PY0, RW, 150, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('scoring readout', RX + 12, PY0 + 22);
  ctx.font = `12px ${MONO}`;
  if (scene.readout) {
    const r = scene.readout;
    const lines = [[`${r.id}  ${r.title}`, INK, true], [`dot = ${f2(r.dot)}`, AMBER, r.showDot],
      [`lengths ${f2(r.queryNorm)} and ${f2(r.norm)}`, DIM, r.showLengths], [`cosine = ${f3(r.cosine)}`, BLUE, r.showCosine]];
    lines.forEach(([line, color, visible], index) => {
      if (!visible) return;
      ctx.fillStyle = color;
      ctx.fillText(line, RX + 12, PY0 + 48 + index * 24);
    });
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText('not started', RX + 12, PY0 + 48);
  }

  // Rankings box: what shipped against the cosine order.
  ctx.fillStyle = PANEL;
  rounded(ctx, RX, SY0, RW, SY1 - SY0, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, RX, SY0, RW, SY1 - SY0, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('ranking', RX + 12, SY0 + 18);
  if (scene.rankingsAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.rankingsAlpha;
    ctx.fillStyle = AMBER;
    ctx.fillText('by dot', RX + 12, SY0 + 40);
    ctx.fillStyle = BLUE;
    ctx.fillText('by cosine', RX + 124, SY0 + 40);
    ctx.font = `12px ${MONO}`;
    scene.byDot.forEach((id, index) => {
      ctx.fillStyle = index < scene.k ? INK : DIM;
      ctx.fillText(`${index + 1}  ${id}`, RX + 12, SY0 + 62 + index * 18);
    });
    scene.byCosine.forEach((id, index) => {
      ctx.fillStyle = index < scene.k ? GREEN : DIM;
      ctx.fillText(`${index + 1}  ${id}`, RX + 124, SY0 + 62 + index * 18);
    });
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
