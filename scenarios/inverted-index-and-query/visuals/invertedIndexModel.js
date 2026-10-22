// The lesson's animation, without a DOM: the same tokenize, build_index, and
// and_query as solution.py (and or_query from practice_answer.py), run on the
// same five documents (python/fixtures/docs.json), recorded as a trace, laid
// out on a reading-pace timeline, and turned into a drawable scene for any
// moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// tokenize from solution.py: lowercase, letters and digits and whitespace only,
// then split on whitespace. JavaScript has no isalnum, so a letter-or-number
// class stands in; the trace fixture proves equality on the lesson's text.
export function tokenize(text) {
  const lowered = text.toLowerCase();
  let kept = '';
  for (const char of lowered) {
    if (/[\p{L}\p{N}]/u.test(char) || /\s/.test(char)) kept += char;
  }
  return kept.split(/\s+/).filter((word) => word !== '');
}

// build_index from solution.py, recording one step per document for the figure.
export function buildIndex(docs) {
  const index = {};
  const order = [];
  const steps = [];
  for (const doc of docs) {
    const tokens = tokenize(doc.text);
    const distinct = [...new Set(tokens)].sort();
    const newTerms = [];
    for (const term of distinct) {
      if (!Object.hasOwn(index, term)) {
        index[term] = [];
        order.push(term);
        newTerms.push(term);
      }
      index[term].push(doc.id);
    }
    const repeated = distinct.filter((term) => tokens.filter((t) => t === term).length > 1).sort();
    steps.push({ doc: doc.id, tokens, distinct, repeated, new_terms: newTerms });
  }
  return { index, order, steps };
}

export function andQuery(index, terms) {
  if (terms.length === 0) throw new Error('query has no terms');
  let result = new Set(index[terms[0]] || []);
  for (const term of terms.slice(1)) {
    const postings = new Set(index[term] || []);
    result = new Set([...result].filter((id) => postings.has(id)));
  }
  return [...result].sort();
}

export function postingsRead(index, terms) {
  let total = 0;
  for (const term of terms) total += (index[term] || []).length;
  return total;
}

// or_query from practice_answer.py: count the query terms that list each document.
export function orQuery(index, terms) {
  if (terms.length === 0) throw new Error('query has no terms');
  const counts = {};
  for (const term of terms) {
    for (const id of index[term] || []) counts[id] = (counts[id] || 0) + 1;
  }
  return Object.keys(counts).map((id) => [id, counts[id]]).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function buildTrace(data) {
  const { index, order, steps } = buildIndex(data.docs);
  const queries = data.queries.map((terms) => ({
    terms,
    postings: Object.fromEntries(terms.map((term) => [term, index[term] || []])),
    result: andQuery(index, terms),
    postings_read: postingsRead(index, terms),
  }));
  const ranked = orQuery(index, data.or_query);
  return {
    index,
    order,
    steps,
    shared_terms: Object.keys(index).filter((term) => index[term].length >= 2).sort(),
    queries,
    or_query: { terms: data.or_query, counts: Object.fromEntries(ranked.map(([id, count]) => [id, count])), ranked },
    scan_reads: data.docs.length * data.queries.length,
    index_reads: queries.reduce((total, query) => total + query.postings_read, 0),
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. One beat per document (its
// distinct terms glide into the index), one beat per query, about half a
// minute in all. The slow motion setting stretches all of it.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;    // when the "what shipped" caption appears
const DOC_BEAT = 2.8;
const QUERY_BEAT = 3.0;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE_BEAT = 3.0;
const GLIDE_START = 0.3;      // sub-phases inside a document beat
const GLIDE_STAGGER = 0.12;
const GLIDE = 0.6;

const joinAnd = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

function docCaption(step, doc, existing, indexSize) {
  let note = '';
  if (step.repeated.length) note += ` (${joinAnd(step.repeated)} repeat${step.repeated.length === 1 ? 's' : ''} and ${step.repeated.length === 1 ? 'is' : 'are'} listed once)`;
  if (existing.length) note += `; ${existing.join(', ')} already indexed, so ${doc.id} joins ${existing.length === 1 ? 'its list' : 'their lists'}`;
  return `${doc.id} "${doc.text}" has ${step.tokens.length} tokens and ${step.distinct.length} distinct terms${note}: ${step.new_terms.length} new chips. Index: ${indexSize} terms.`;
}

function queryCaption(query) {
  const lists = query.terms.map((term) => `${term} is in ${query.postings[term].length ? query.postings[term].join(', ') : 'no document'}`).join('; ');
  if (query.result.length) {
    return `${query.terms.join(' AND ')}: ${lists}. The intersection is ${query.result.join(', ')}: ${query.postings_read} postings read instead of 5 documents scanned.`;
  }
  return `${query.terms.join(' AND ')}: ${lists}. The intersection is empty: no document has both, ${query.postings_read} postings read.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = data.docs.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} documents from the runbooks, each an id and a text. The index will map every term to the documents that contain it.`,
    captionLate: `What shipped: a linear scan. Every query reads all ${n} documents, ${trace.scan_reads} document reads for these ${data.queries.length} queries.` });
  t += INTRO;
  let indexSize = 0;
  trace.steps.forEach((step, index) => {
    indexSize += step.new_terms.length;
    const existing = step.distinct.filter((term) => !step.new_terms.includes(term));
    beats.push({ kind: 'doc', start: t, duration: DOC_BEAT, index, step, caption: docCaption(step, data.docs[index], existing, indexSize) });
    t += DOC_BEAT;
  });
  trace.queries.forEach((query, index) => {
    beats.push({ kind: 'query', start: t, duration: QUERY_BEAT, index, query, caption: queryCaption(query) });
    t += QUERY_BEAT;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.order.length} distinct terms, ${trace.shared_terms.length} of them (${trace.shared_terms.join(', ')}) in two or more documents. The ${data.queries.length} queries read ${trace.index_reads} posting entries in all; the scan that shipped read ${trace.scan_reads} documents.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: an OR query, where any term matches, ranked by how many of the query terms each document contains.' });
  t += PRACTICE_INTRO;
  const ranked = trace.or_query.ranked;
  const top = ranked.filter(([, count]) => count === ranked[0][1]).map(([id]) => id);
  const rest = ranked.filter(([, count]) => count !== ranked[0][1]);
  beats.push({ kind: 'practice', start: t, duration: PRACTICE_BEAT,
    caption: `${trace.or_query.terms.join(' OR ')}: ${joinAnd(top)} contain ${ranked[0][1]} of the ${trace.or_query.terms.length} terms${rest.length ? `, ${joinAnd(rest.map(([id]) => id))} contain ${rest[0][1]}` : ''}. Ranked: ${ranked.map(([id]) => id).join(', ')}. The AND query for the same terms finds ${andQuery(trace.index, trace.or_query.terms).length ? 'a match' : 'nothing'}.` });
  t += PRACTICE_BEAT;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- layout

export const CARD = { x: 28, y0: 66, w: 296, h: 46, gap: 52 };
export const GRID = { x0: 346, y0: 66, cols: 4, colW: 131, rowH: 40 };
export const QUERY_PANEL = { x: 28, y: 338, w: 296, h: 132 };
export const STATUS = { x: 346, y: 400, w: 524, h: 70 };
export const chipPosition = (slot) => ({ x: GRID.x0 + (slot % GRID.cols) * GRID.colW, y: GRID.y0 + Math.floor(slot / GRID.cols) * GRID.rowH });
export const cardPosition = (index) => ({ x: CARD.x, y: CARD.y0 + index * CARD.gap });

export function wrapText(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > width && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const lerp = (from, to, p) => from + (to - from) * p;

// The drawable state at `elapsed` seconds: the document cards, the index
// chips, the terms in flight, the query panel, the status lines, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const firstDoc = kinds.indexOf('doc');
  const firstQuery = kinds.indexOf('query');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');

  // Documents fully indexed before this moment, and the glides of the current one.
  let docsDone = 0;
  if (beat.kind === 'doc') docsDone = beat.index;
  else if (beatIndex > firstDoc) docsDone = trace.steps.length;
  const glides = [];
  const arrived = new Set();
  if (beat.kind === 'doc') {
    const from = cardPosition(beat.index);
    beat.step.distinct.forEach((term, j) => {
      const start = GLIDE_START + j * GLIDE_STAGGER;
      const p = ramp(local, start, GLIDE);
      if (p >= 1) { arrived.add(term); return; }
      if (p <= 0) return;
      const slot = trace.order.indexOf(term);
      const to = chipPosition(slot);
      const e = easeInOut(p);
      glides.push({ term, isNew: beat.step.new_terms.includes(term),
        x: lerp(from.x + CARD.w, to.x + 8, e), y: lerp(from.y + CARD.h / 2, to.y + 20, e), alpha: 1 - Math.max(0, p - 0.85) / 0.15 });
    });
  }
  const idsFor = (term) => {
    const ids = [];
    for (let i = 0; i < docsDone; i += 1) if (trace.steps[i].distinct.includes(term)) ids.push(trace.steps[i].doc);
    if (beat.kind === 'doc' && arrived.has(term)) ids.push(beat.step.doc);
    return ids;
  };
  const queryTerms = beat.kind === 'query' ? beat.query.terms : (beat.kind === 'practice' ? trace.or_query.terms : []);
  const chips = trace.order.map((term, slot) => {
    const ids = idsFor(term);
    if (!ids.length) return { term, slot, ids, alpha: 0, state: 'hidden', flash: 0 };
    let state = 'normal';
    let flash = 0;
    if (beat.kind === 'doc' && arrived.has(term)) {
      const j = beat.step.distinct.indexOf(term);
      const arrivedAt = GLIDE_START + j * GLIDE_STAGGER + GLIDE;
      flash = 1 - ramp(local, arrivedAt, 0.8);
      state = beat.step.new_terms.includes(term) ? 'new' : 'append';
    } else if (queryTerms.includes(term)) {
      state = beat.kind === 'practice' ? 'practice' : 'query';
      flash = ramp(local, 0.1, 0.4);
    }
    return { term, slot, ids, alpha: 1, state, flash };
  });

  // Cards: highlight the active document, the query hits, and the practice counts.
  const cards = data.docs.map((doc, index) => {
    const alpha = beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.2, 0.4) : 1;
    let state = 'normal';
    if (beat.kind === 'doc' && beat.index === index) state = 'active';
    if (beat.kind === 'query' && beat.query.result.includes(doc.id) && local >= 1.6) state = 'hit';
    let count = null;
    if (beat.kind === 'practice' || beatIndex > practiceBeat) {
      const value = trace.or_query.counts[doc.id];
      const rank = trace.or_query.ranked.findIndex(([id]) => id === doc.id);
      if (value !== undefined && (beat.kind !== 'practice' || local >= 0.4 + rank * 0.35)) count = value;
    }
    return { id: doc.id, lines: wrapText(doc.text, 40), alpha, state, count };
  });

  // The query panel: the posting lists appear one by one, then the result.
  let query = null;
  if (beat.kind === 'query') {
    const q = beat.query;
    query = {
      label: q.terms.join(' AND '),
      lines: q.terms.map((term, j) => ({ text: `${term}: ${q.postings[term].length ? q.postings[term].join(', ') : 'no document'}`, alpha: ramp(local, 0.3 + j * 0.45, 0.4) })),
      result: { text: q.result.length ? `= ${q.result.join(', ')}` : '= none', ok: q.result.length > 0, alpha: ramp(local, 1.6, 0.5) },
      read: `postings read: ${q.postings_read}`,
    };
  } else if (beat.kind === 'practice') {
    const o = trace.or_query;
    query = {
      label: o.terms.join(' OR '),
      lines: o.ranked.map(([id, count], j) => ({ text: `${id}  ${count} of ${o.terms.length} terms`, alpha: ramp(local, 0.4 + j * 0.35, 0.4) })),
      result: { text: `ranked: ${o.ranked.map(([id]) => id).join(', ')}`, ok: true, alpha: ramp(local, 1.9, 0.5) },
      read: `AND for the same terms: ${andQuery(trace.index, o.terms).length ? andQuery(trace.index, o.terms).join(', ') : 'none'}`,
    };
  } else if (beatIndex > practiceBeat) {
    const o = trace.or_query;
    query = { label: o.terms.join(' OR '), lines: o.ranked.map(([id, count]) => ({ text: `${id}  ${count} of ${o.terms.length} terms`, alpha: 1 })),
      result: { text: `ranked: ${o.ranked.map(([id]) => id).join(', ')}`, ok: true, alpha: 1 }, read: '' };
  }

  // Status: the index size and the running postings count.
  const termsIndexed = chips.filter((chip) => chip.alpha > 0).length;
  let read = 0;
  if (beat.kind === 'query') read = trace.queries.slice(0, beat.index).reduce((n, q) => n + q.postings_read, 0) + (local >= 1.6 ? beat.query.postings_read : 0);
  else if (beatIndex > firstQuery && firstQuery >= 0) read = trace.index_reads;
  const scanned = beat.kind === 'query' ? (beat.index + (local >= 1.6 ? 1 : 0)) * data.docs.length : (beatIndex >= outroBeat ? trace.scan_reads : 0);
  const status = { terms: termsIndexed, total: trace.order.length, shared: beatIndex >= outroBeat ? trace.shared_terms.length : null, read, scanned,
    showReads: beat.kind === 'query' || beatIndex >= outroBeat };

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, cards, chips, glides, query, status, finished: t >= timeline.duration };
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

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('inverted index: each term lists the documents that contain it; a query reads only its own posting lists', 28, 36);

  // Document cards.
  ctx.font = `10.5px ${MONO}`;
  scene.cards.forEach((card, index) => {
    if (card.alpha <= 0) return;
    const { x, y } = cardPosition(index);
    ctx.save();
    ctx.globalAlpha = card.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, x, y, CARD.w, CARD.h, 6); ctx.fill();
    ctx.strokeStyle = card.state === 'active' ? AMBER : (card.state === 'hit' ? GREEN : LINE);
    ctx.lineWidth = card.state === 'normal' ? 1 : 2;
    rounded(ctx, x, y, CARD.w, CARD.h, 6); ctx.stroke();
    ctx.fillStyle = card.state === 'hit' ? GREEN : INK;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(card.id, x + 8, y + 18);
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    card.lines.slice(0, 2).forEach((line, j) => ctx.fillText(line, x + 34, y + 18 + j * 15));
    if (card.count !== null) {
      ctx.fillStyle = BLUE;
      ctx.textAlign = 'right';
      ctx.fillText(`${card.count} term${card.count === 1 ? '' : 's'}`, x + CARD.w - 8, y + 33);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  });

  // Index grid.
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('index: term and the documents that contain it', GRID.x0, GRID.y0 - 10);
  for (const chip of scene.chips) {
    if (chip.alpha <= 0) continue;
    const { x, y } = chipPosition(chip.slot);
    ctx.save();
    ctx.globalAlpha = chip.alpha;
    ctx.fillStyle = PANEL;
    rounded(ctx, x, y, GRID.colW - 6, GRID.rowH - 6, 5); ctx.fill();
    const accent = chip.state === 'new' ? BLUE : chip.state === 'append' ? GREEN : chip.state === 'query' ? AMBER : chip.state === 'practice' ? BLUE : LINE;
    ctx.strokeStyle = accent;
    ctx.lineWidth = chip.state === 'normal' ? 1 : 1 + chip.flash;
    rounded(ctx, x, y, GRID.colW - 6, GRID.rowH - 6, 5); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(chip.term, x + 8, y + 15);
    ctx.fillStyle = chip.state === 'append' && chip.flash > 0 ? GREEN : (chip.state === 'query' || chip.state === 'practice') ? accent : DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(chip.ids.join(' '), x + 8, y + 29);
    ctx.restore();
  }

  // Terms in flight.
  for (const glide of scene.glides) {
    if (glide.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = glide.alpha;
    ctx.font = `11px ${MONO}`;
    const width = glide.term.length * 6.8 + 12;
    ctx.fillStyle = glide.isNew ? BLUE : GREEN;
    rounded(ctx, glide.x - 6, glide.y - 12, width, 17, 8); ctx.fill();
    ctx.fillStyle = BG;
    ctx.fillText(glide.term, glide.x, glide.y);
    ctx.restore();
  }

  // Query panel.
  const q = QUERY_PANEL;
  ctx.fillStyle = PANEL;
  rounded(ctx, q.x, q.y, q.w, q.h, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rounded(ctx, q.x, q.y, q.w, q.h, 6); ctx.stroke();
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(scene.query && scene.query.label.includes(' OR ') ? 'practice: OR query ranked by matches' : 'query: every term must appear', q.x + 10, q.y + 18);
  if (scene.query) {
    ctx.fillStyle = INK;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(scene.query.label, q.x + 10, q.y + 38);
    ctx.font = `11px ${MONO}`;
    scene.query.lines.forEach((line, j) => {
      if (line.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = line.alpha;
      ctx.fillStyle = DIM;
      ctx.fillText(line.text, q.x + 10, q.y + 58 + j * 15);
      ctx.restore();
    });
    if (scene.query.result.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = scene.query.result.alpha;
      ctx.fillStyle = scene.query.result.ok ? GREEN : RED;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(scene.query.result.text, q.x + 10, q.y + 58 + scene.query.lines.length * 15 + 4);
      ctx.fillStyle = DIM;
      ctx.font = `10.5px ${MONO}`;
      if (scene.query.read) ctx.fillText(scene.query.read, q.x + 10, q.y + q.h - 10);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('queries run once the index is built', q.x + 10, q.y + 40);
  }

  // Status panel.
  const s = STATUS;
  ctx.fillStyle = PANEL;
  rounded(ctx, s.x, s.y, s.w, s.h, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, s.x, s.y, s.w, s.h, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = INK;
  const sharedNote = scene.status.shared === null ? '' : `, ${scene.status.shared} shared by two or more documents`;
  ctx.fillText(`index: ${scene.status.terms} of ${scene.status.total} terms${sharedNote}`, s.x + 12, s.y + 24);
  if (scene.status.showReads) {
    ctx.fillStyle = BLUE;
    ctx.fillText(`index reads: ${scene.status.read} posting entries`, s.x + 12, s.y + 46);
    ctx.fillStyle = AMBER;
    ctx.fillText(`scan reads: ${scene.status.scanned} documents`, s.x + 280, s.y + 46);
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText('building the index one document at a time', s.x + 12, s.y + 46);
  }
}
