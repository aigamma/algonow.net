// The lesson's animation, without a DOM: the same shingles, Jaccard, and
// first-kept walk as solution.py (and the character shingles of
// practice_answer.py), run on the same records (python/fixtures/records.json),
// recorded as a trace, laid out on a reading-pace timeline, and turned into a
// drawable scene for any moment. Tests compare the trace with
// python/fixtures/expected-trace.json, which the Python suite derives from the
// real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
// Two decimals the way Python's format prints them: an exact tie such as 0.625
// rounds to the even digit (0.62), where toFixed would give 0.63.
const f2 = (x) => {
  const scaled = x * 100;
  const floor = Math.floor(scaled);
  if (Math.abs(scaled - floor - 0.5) < 1e-9) return ((floor % 2 === 0 ? floor : floor + 1) / 100).toFixed(2);
  return (Math.round(scaled) / 100).toFixed(2);
};

// words_of from solution.py: lowercase words with punctuation stripped.
export function wordsOf(text) {
  const words = [];
  for (const raw of text.toLowerCase().split(/\s+/)) {
    let word = '';
    for (const character of raw) if (/[\p{L}\p{N}]/u.test(character)) word += character;
    if (word) words.push(word);
  }
  return words;
}

// shingles from solution.py: runs of `size` words, keyed as a joined string.
export function wordShingles(text, size) {
  const words = wordsOf(text);
  const found = new Set();
  for (let start = 0; start <= words.length - size; start += 1) found.add(words.slice(start, start + size).join(' '));
  return found;
}

// shingles from practice_answer.py: runs of `size` characters of the normalized text.
export function charShingles(text, size) {
  const joined = wordsOf(text).join(' ');
  const found = new Set();
  for (let start = 0; start <= joined.length - size; start += 1) found.add(joined.slice(start, start + size));
  return found;
}

export function jaccard(a, b) {
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
}
const sharedCount = (a, b) => { let n = 0; for (const item of a) if (b.has(item)) n += 1; return n; };

// near_duplicates from solution.py: keep a record unless its best match among
// the kept records reaches the threshold.
export function nearDuplicates(records, shingleFunction, size, threshold) {
  const kept = [];
  const decisions = [];
  for (const record of records) {
    const own = shingleFunction(record.text, size);
    if (!own.size) throw new Error(`${record.id} is too short for shingles of ${size}`);
    let bestId = null;
    let best = 0.0;
    for (const [keptId, other] of kept) {
      const score = jaccard(own, other);
      if (score > best) { bestId = keptId; best = score; }
    }
    if (best >= threshold) decisions.push({ id: record.id, action: 'dropped', match: bestId, score: round6(best) });
    else { kept.push([record.id, own]); decisions.push({ id: record.id, action: 'kept', match: null, score: round6(best) }); }
  }
  return decisions;
}

function pairTable(records, shingleFunction, size, threshold) {
  const sets = {};
  for (const record of records) sets[record.id] = shingleFunction(record.text, size);
  const pairs = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = sets[records[i].id];
      const b = sets[records[j].id];
      const shared = sharedCount(a, b);
      const union = a.size + b.size - shared;
      const score = jaccard(a, b);
      pairs.push({ a: records[i].id, b: records[j].id, shared, union, jaccard: round6(score), flagged: score >= threshold });
    }
  }
  return { sets, pairs };
}

export function buildTrace(data) {
  const { sets, pairs } = pairTable(data.records, wordShingles, data.size, data.threshold);
  const decisions = nearDuplicates(data.records, wordShingles, data.size, data.threshold);
  const chars = pairTable(data.records, charShingles, data.practice_size, data.threshold);
  const charDecisions = nearDuplicates(data.records, charShingles, data.practice_size, data.threshold);
  return {
    records: data.records.map((record) => ({ id: record.id, text: record.text, words: wordsOf(record.text).length, shingles: sets[record.id].size })),
    size: data.size,
    threshold: data.threshold,
    pairs,
    decisions,
    kept: decisions.filter((d) => d.action === 'kept').length,
    practice: { size: data.practice_size, records: data.records.map((record) => ({ id: record.id, shingles: chars.sets[record.id].size })),
      pairs: chars.pairs, decisions: charDecisions, kept: charDecisions.filter((d) => d.action === 'kept').length },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const PAIR_BEAT = 1.8;
const FILL_AT = 0.2;
const FILL = 0.5;
const DECISION_BEAT = 1.6;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.records.length;
  const sizes = Object.fromEntries(trace.records.map((record) => [record.id, record.shingles]));
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} support answers. r2 is r1 with one word changed, r4 is r1 with "Please" in front, r5 is a fragment of r1, and r3 is unrelated. Word shingles: every run of ${trace.size} consecutive words after lowercasing and stripping punctuation; r1 has ${sizes.r1}.`,
    captionLate: `What shipped: exact-match deduplication after normalization. No two texts are identical, so all ${n} survived and the model saw the same answer three times.` });
  t += INTRO;
  trace.pairs.forEach((pair, index) => {
    const verdict = pair.flagged ? `at or above ${f2(trace.threshold)}: near-duplicates` : `below ${f2(trace.threshold)}`;
    beats.push({ kind: 'pair', start: t, duration: PAIR_BEAT, index,
      caption: `${pair.a} and ${pair.b}: ${sizes[pair.a]} and ${sizes[pair.b]} shingles, ${pair.shared} shared, ${pair.union} in the union: ${pair.shared} / ${pair.union} = ${f2(pair.jaccard)}, ${verdict}.` });
    t += PAIR_BEAT;
  });
  trace.decisions.forEach((decision, index) => {
    let caption;
    if (index === 0) caption = `${decision.id}: nothing kept yet, so it is kept.`;
    else if (decision.action === 'dropped') caption = `${decision.id}: its best match among the kept records is ${decision.match} at ${f2(decision.score)}, at or above ${f2(trace.threshold)}: dropped as a near-duplicate of ${decision.match}.`;
    else caption = `${decision.id}: its best match among the kept records scores ${f2(decision.score)}, below ${f2(trace.threshold)}: kept.`;
    beats.push({ kind: 'decision', start: t, duration: DECISION_BEAT, index, caption });
    t += DECISION_BEAT;
  });
  const keptIds = trace.decisions.filter((d) => d.action === 'kept').map((d) => d.id);
  const droppedIds = trace.decisions.filter((d) => d.action === 'dropped').map((d) => d.id);
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Kept ${trace.kept} of ${n}: ${keptIds.join(', ')}. Exact matching had kept all ${n}; the two near-copies of r1, ${droppedIds.join(' and ')}, are gone from the training set, and the fragment r5 stays because it shares too little of the union.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: shingles of ${trace.practice.size} characters over the normalized text instead of ${trace.size} words, the same Jaccard and the same walk.` });
  t += PRACTICE_INTRO;
  const wordPair = trace.pairs[0];
  const charPair = trace.practice.pairs[0];
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `With character shingles r1 has ${trace.practice.records[0].shingles} shingles instead of ${sizes.r1}, and r1 versus r2 rises from ${f2(wordPair.jaccard)} to ${f2(charPair.jaccard)}: the changed word sits in ${sizes.r1 - wordPair.shared} of r1's ${sizes.r1} word shingles but in only ${trace.practice.records[0].shingles - charPair.shared} of its ${trace.practice.records[0].shingles} character shingles. The same ${trace.practice.kept} records are kept.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'pair', 'decision', 'outro', 'practice-intro', 'practice'];

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);

  let computed = 0;                       // pairs whose value has appeared
  let current = null;                     // the pair being computed: { index, fill }
  if (beat.kind === 'pair') {
    const fill = easeInOut(ramp(local, FILL_AT, FILL));
    computed = beat.index + (fill >= 1 ? 1 : 0);
    current = { index: beat.index, fill };
  } else if (stage > 1) computed = trace.pairs.length;
  let decided = 0;
  let deciding = null;
  if (beat.kind === 'decision') {
    const fill = easeInOut(ramp(local, 0.15, 0.5));
    decided = beat.index + (fill >= 1 ? 1 : 0);
    deciding = { index: beat.index, fill };
  } else if (stage > 2) decided = trace.decisions.length;
  const recordAlpha = (index) => (beat.kind === 'intro' ? easeInOut(ramp(local, 0.1 + index * 0.15, 0.5)) : 1);
  const practiceAlpha = stage >= 4 ? (beat.kind === 'practice-intro' ? 0 : easeInOut(ramp(local, 0.2, 0.9))) : 0;
  const source = practiceAlpha >= 0.5 ? trace.practice : trace;
  const cells = trace.pairs.map((pair, index) => {
    const shown = source.pairs[index];
    return { a: pair.a, b: pair.b, value: shown.jaccard, flagged: shown.flagged, shared: shown.shared, union: shown.union,
      alpha: index < computed ? 1 : (current && current.index === index ? current.fill : 0), current: Boolean(current && current.index === index) };
  });
  const records = trace.records.map((record, index) => {
    const decision = index < decided ? source.decisions[index] : null;
    return { ...record, shingles: practiceAlpha >= 0.5 ? trace.practice.records[index].shingles : record.shingles, alpha: recordAlpha(index), decision,
      highlighted: current ? (trace.pairs[current.index].a === record.id || trace.pairs[current.index].b === record.id) : (deciding ? deciding.index === index : false) };
  });
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, cells, records, computed, decided, current, deciding, practiceAlpha,
    unit: practiceAlpha >= 0.5 ? 'characters' : 'words', size: practiceAlpha >= 0.5 ? trace.practice.size : trace.size, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 28, LY = 92, ROW_H = 40;                       // the record list
const MX = 470, MY = 110, CELL = 58;                      // the pair matrix (rows r1..r4, columns r2..r5)
const PX = 700, PY = 300, PW = 176;                       // the computation panel

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

const indexOf = (id) => Number(id.slice(1)) - 1;

export function drawScene(ctx, scene, trace) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`near-duplicates: shingles of ${scene.size} ${scene.unit}, Jaccard = shared / union, threshold ${f2(trace.threshold)}`, 28, 36);

  // The records, with their shingle counts and their decisions.
  ctx.font = `11px ${MONO}`;
  scene.records.forEach((record, index) => {
    if (record.alpha <= 0) return;
    const y = LY + index * ROW_H;
    ctx.globalAlpha = record.alpha;
    if (record.highlighted) {
      ctx.fillStyle = PANEL;
      rounded(ctx, LX - 8, y - 14, 430, ROW_H - 4, 5); ctx.fill();
    }
    ctx.fillStyle = record.highlighted ? INK : DIM;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`${record.id}  ${record.words} words, ${record.shingles} shingles`, LX, y);
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    const text = record.text.length > 58 ? `${record.text.slice(0, 57)}…` : record.text;
    ctx.fillText(text, LX, y + 14);
    if (record.decision) {
      const kept = record.decision.action === 'kept';
      ctx.fillStyle = kept ? GREEN : RED;
      ctx.font = `10.5px ${MONO}`;
      const label = kept ? 'kept' : `dropped: ${f2(record.decision.score)} of ${record.decision.match}`;
      ctx.textAlign = 'right';
      ctx.fillText(label, LX + 418, y);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  });

  // The pair matrix: upper triangle, rows r1..r4 and columns r2..r5.
  const ids = trace.records.map((record) => record.id);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'center';
  for (let column = 1; column < ids.length; column += 1) ctx.fillText(ids[column], MX + (column - 1) * CELL + CELL / 2, MY - 10);
  ctx.textAlign = 'right';
  for (let row = 0; row < ids.length - 1; row += 1) ctx.fillText(ids[row], MX - 8, MY + row * CELL + CELL / 2 + 4);
  for (const cell of scene.cells) {
    const row = indexOf(cell.a);
    const column = indexOf(cell.b) - 1;
    const x = MX + column * CELL;
    const y = MY + row * CELL;
    ctx.fillStyle = PANEL;
    rounded(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 5); ctx.fill();
    if (cell.current) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      rounded(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 5); ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (cell.alpha <= 0) continue;
    ctx.globalAlpha = cell.alpha * 0.22;
    ctx.fillStyle = cell.flagged ? RED : BLUE;
    rounded(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 5); ctx.fill();
    ctx.globalAlpha = cell.alpha;
    ctx.fillStyle = cell.flagged ? RED : INK;
    ctx.font = `13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(f2(cell.value), x + CELL / 2, y + CELL / 2 + 5);
    ctx.globalAlpha = 1;
  }
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('red: at or above the threshold', MX, MY + (ids.length - 1) * CELL + 18);

  // The computation panel for the current pair.
  const shown = scene.current ? scene.cells[scene.current.index] : (scene.deciding ? null : null);
  ctx.fillStyle = PANEL;
  rounded(ctx, PX, PY, PW, 150, 6); ctx.fill();
  ctx.strokeStyle = LINE;
  rounded(ctx, PX, PY, PW, 150, 6); ctx.stroke();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('this pair', PX + 12, PY + 20);
  if (shown) {
    const a = scene.records[indexOf(shown.a)];
    const b = scene.records[indexOf(shown.b)];
    const scale = (PW - 24) / Math.max(shown.union, 1);
    const bar = (y, label, count, color) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(PX + 12, y, count * scale, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = INK;
      ctx.fillText(`${label} ${count}`, PX + 12, y - 4);
    };
    bar(PY + 46, shown.a, a.shingles, BLUE);
    bar(PY + 76, shown.b, b.shingles, BLUE);
    bar(PY + 106, 'shared', shown.shared, GREEN);
    ctx.fillStyle = shown.flagged ? RED : INK;
    ctx.fillText(`${shown.shared} / ${shown.union} = ${f2(shown.value)}`, PX + 12, PY + 138);
  } else {
    ctx.fillStyle = DIM;
    ctx.fillText(scene.decided ? `kept ${scene.records.filter((r) => r.decision && r.decision.action === 'kept').length} of ${trace.records.length}` : `${scene.computed} of ${trace.pairs.length} pairs scored`, PX + 12, PY + 46);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
