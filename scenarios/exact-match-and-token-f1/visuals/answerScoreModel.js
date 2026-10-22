// The lesson's animation, without a DOM: the same normalize, exact match, and
// token F1 as solution.py, run on the same five answer pairs
// (python/fixtures/answers.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f3 = (x) => x.toFixed(3);

// ------------------------------------------------------------- the functions

// normalize from solution.py in two visible steps: the words after lowercasing
// and dropping punctuation, then the tokens after dropping the articles.
// JavaScript has no isalnum, so a letter-or-number class stands in; the
// fixture proves equality with the Python run.
export function wordsOf(text) {
  let kept = '';
  for (const char of text.toLowerCase()) {
    if (/[\p{L}\p{N}]/u.test(char) || /\s/.test(char)) kept += char;
  }
  return kept.split(/\s+/).filter((word) => word !== '');
}
export function normalize(text, articles) {
  return wordsOf(text).filter((word) => !articles.includes(word));
}
const sameList = (a, b) => a.length === b.length && a.every((item, index) => item === b[index]);
export function exactMatch(prediction, gold, articles) {
  return sameList(normalize(prediction, articles), normalize(gold, articles)) ? 1 : 0;
}
// Counter intersection, counted left to right: each gold token can be used once.
export function matchFlags(tokens, others) {
  const remaining = new Map();
  for (const token of others) remaining.set(token, (remaining.get(token) || 0) + 1);
  return tokens.map((token) => {
    const left = remaining.get(token) || 0;
    if (left > 0) remaining.set(token, left - 1);
    return left > 0;
  });
}
export function tokenF1(prediction, gold, articles) {
  const predicted = normalize(prediction, articles);
  const expected = normalize(gold, articles);
  if (!predicted.length && !expected.length) return [0, 1.0, 1.0, 1.0];
  if (!predicted.length || !expected.length) return [0, 0.0, 0.0, 0.0];
  const overlap = matchFlags(predicted, expected).filter(Boolean).length;
  if (overlap === 0) return [0, 0.0, 0.0, 0.0];
  const precision = overlap / predicted.length;
  const recall = overlap / expected.length;
  return [overlap, precision, recall, (2 * precision * recall) / (precision + recall)];
}
// score_pair from practice_answer.py: the best exact match and the best F1 over several golds.
export function scorePair(prediction, golds, articles) {
  let best = { em: 0, overlap: 0, precision: 0.0, recall: 0.0, f1: 0.0, index: 0 };
  golds.forEach((gold, index) => {
    const em = exactMatch(prediction, gold, articles);
    const [overlap, precision, recall, f1] = tokenF1(prediction, gold, articles);
    best.em = Math.max(best.em, em);
    if (f1 > best.f1) best = { ...best, overlap, precision, recall, f1, index };
  });
  return best;
}

const scored = (prediction, gold, articles) => {
  const [overlap, precision, recall, f1] = tokenF1(prediction, gold, articles);
  return { em: exactMatch(prediction, gold, articles), overlap, precision: round6(precision), recall: round6(recall), f1: round6(f1) };
};

export function buildTrace(data) {
  const { articles } = data;
  const rows = data.pairs.map((pair) => {
    const predicted = normalize(pair.prediction, articles);
    const gold = normalize(pair.gold, articles);
    return {
      id: pair.id, prediction: pair.prediction, gold: pair.gold,
      prediction_words: wordsOf(pair.prediction), gold_words: wordsOf(pair.gold),
      prediction_tokens: predicted, gold_tokens: gold,
      prediction_matched: matchFlags(predicted, gold), gold_matched: matchFlags(gold, predicted),
      string_equal: pair.prediction === pair.gold, ...scored(pair.prediction, pair.gold, articles),
    };
  });
  const meanEm = rows.reduce((sum, row) => sum + row.em, 0) / rows.length;
  const meanF1 = rows.reduce((sum, row) => sum + row.f1, 0) / rows.length;
  const practiceRows = data.pairs.map((pair) => {
    const golds = data.practice_golds[pair.id];
    const perGold = golds.map((gold) => scored(pair.prediction, gold, articles));
    const best = scorePair(pair.prediction, golds, articles);
    const goldTokens = normalize(golds[best.index], articles);
    const predicted = normalize(pair.prediction, articles);
    return {
      id: pair.id, golds, per_gold: perGold, best_gold: best.index, best_gold_tokens: goldTokens,
      prediction_matched: matchFlags(predicted, goldTokens), gold_matched: matchFlags(goldTokens, predicted),
      em: best.em, overlap: best.overlap, precision: round6(best.precision), recall: round6(best.recall), f1: round6(best.f1),
    };
  });
  const practiceEm = practiceRows.reduce((sum, row) => sum + row.em, 0) / practiceRows.length;
  const practiceF1 = practiceRows.reduce((sum, row) => sum + row.f1, 0) / practiceRows.length;
  return {
    rows,
    mean_em: round6(meanEm), mean_f1: round6(meanF1),
    shipped: { string_equal_count: rows.filter((row) => row.string_equal).length, exact_match_count: rows.reduce((sum, row) => sum + row.em, 0) },
    practice: { rows: practiceRows, mean_em: round6(practiceEm), mean_f1: round6(practiceF1) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each pair gets one beat: the raw
// strings, the tokens (articles fading), the matches, then the three meters.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const PAIR_BEAT = 3.0;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;
const TOKENS_AT = 0.3, TOKENS = 0.5, DROP_AT = 0.9, DROP = 0.4, LINKS_AT = 1.1, LINKS = 0.6, METERS_AT = 1.6, METERS = 0.8;

function pairCaption(row, running) {
  const base = `${row.id}: "${row.prediction}" against "${row.gold}"`;
  let body;
  if (row.em === 1) body = `${base}: after normalization both read ${row.prediction_tokens.join(' ')}, so exact match 1 and F1 1.000.`;
  else if (row.overlap === 0) body = `${base}: no shared token, so the overlap is 0 and F1 is 0.000, without dividing by zero.`;
  else body = `${base}: ${row.prediction_tokens.length} tokens against ${row.gold_tokens.length} after normalization, ${row.overlap} shared: precision ${f3(row.precision)}, recall ${f3(row.recall)}, F1 ${f3(row.f1)}; exact match 0.`;
  return `${body} Running: ${running.em} exact of ${running.n}, mean F1 ${f3(running.meanF1)}.`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = trace.rows.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} answer pairs from the evaluation set: the model's answer above, the gold answer below. Capitals, punctuation, and articles differ; the words mostly agree.`,
    captionLate: `What shipped: string equality. ${trace.shipped.string_equal_count} of ${n} pairs are equal as strings, so the evaluation reported ${trace.shipped.string_equal_count} exact matches.` });
  t += INTRO;
  let emSoFar = 0;
  let f1SoFar = 0;
  trace.rows.forEach((row, index) => {
    emSoFar += row.em;
    f1SoFar += row.f1;
    beats.push({ kind: 'pair', start: t, duration: PAIR_BEAT, index, caption: pairCaption(row, { em: emSoFar, n: index + 1, meanF1: f1SoFar / (index + 1) }) });
    t += PAIR_BEAT;
  });
  const rescued = trace.rows.filter((row) => row.em === 1 && !row.string_equal).map((row) => row.id);
  const partial = trace.rows.filter((row) => row.em === 0 && row.f1 > 0).map((row) => row.id);
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Means over the ${n} pairs: exact match ${f3(trace.mean_em)} (${trace.shipped.exact_match_count} of ${n}) and F1 ${f3(trace.mean_f1)}. String equality scored ${trace.shipped.string_equal_count} of ${n}; normalization rescued ${rescued.join(' and ')}, and F1 gave ${partial.join(' and ')} partial credit.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: each pair carries several acceptable gold answers; score against each and keep the best exact match and the best F1.' });
  t += PRACTICE_INTRO;
  const changed = trace.practice.rows.find((row, index) => row.f1 !== trace.rows[index].f1);
  const unchanged = trace.practice.rows.find((row) => row.golds.length > 1 && row !== changed);
  const unchangedOther = unchanged ? unchanged.per_gold.find((entry, index) => index !== unchanged.best_gold) : null;
  beats.push({ kind: 'practice', start: t, duration: PRACTICE, changed: changed ? changed.id : null,
    caption: `${changed.id} gains the gold answer "${changed.golds[changed.best_gold]}": exact match ${changed.em}, F1 ${f3(changed.f1)}.${unchanged ? ` ${unchanged.id}'s second gold answer scores ${f3(unchangedOther.f1)}, so its ${f3(unchanged.f1)} stands.` : ''} Means: exact match ${f3(trace.practice.mean_em)}, F1 ${f3(trace.practice.mean_f1)}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// Chips for one side: every word, flagged dropped (an article) or matched.
function chipsFor(words, tokens, matched, articles) {
  let tokenIndex = 0;
  return words.map((word) => {
    if (articles.includes(word)) return { text: word, dropped: true, matched: false };
    const chip = { text: word, dropped: false, matched: matched[tokenIndex] };
    tokenIndex += 1;
    return chip;
  });
}
// Links pair each matched prediction chip with the next unused matched gold chip of the same text.
function linksFor(predictionChips, goldChips) {
  const used = new Set();
  const links = [];
  predictionChips.forEach((chip, from) => {
    if (!chip.matched) return;
    const to = goldChips.findIndex((candidate, index) => candidate.matched && candidate.text === chip.text && !used.has(index));
    if (to >= 0) { used.add(to); links.push({ from, to }); }
  });
  return links;
}

function pairView(row, predictionWords, goldWords, predictionMatched, goldMatched, articles, local) {
  const predictionChips = chipsFor(predictionWords, row.prediction_tokens, predictionMatched, articles);
  const goldChips = chipsFor(goldWords, row.gold_tokens, goldMatched, articles);
  const tokenAlpha = ramp(local, TOKENS_AT, TOKENS);
  const dropProgress = ramp(local, DROP_AT, DROP);
  const linkAlpha = easeInOut(ramp(local, LINKS_AT, LINKS));
  const fill = easeInOut(ramp(local, METERS_AT, METERS));
  return {
    id: row.id, prediction: row.prediction, gold: row.gold, rawAlpha: ramp(local, 0, 0.3),
    predictionChips: predictionChips.map((chip) => ({ ...chip, alpha: chip.dropped ? tokenAlpha * (1 - 0.7 * dropProgress) : tokenAlpha })),
    goldChips: goldChips.map((chip) => ({ ...chip, alpha: chip.dropped ? tokenAlpha * (1 - 0.7 * dropProgress) : tokenAlpha })),
    links: linksFor(predictionChips, goldChips), linkAlpha,
    meters: { precision: row.precision, recall: row.recall, f1: row.f1, overlap: row.overlap, fill },
    em: row.em, emAlpha: fill,
  };
}

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const n = trace.rows.length;
  const pairIndex = beat.kind === 'pair' ? beat.index : (beatIndex > n ? n - 1 : -1);
  const scoredUpTo = beat.kind === 'pair' ? beat.index : (beatIndex > n ? n : 0);   // pairs whose score is final
  const currentFill = beat.kind === 'pair' ? easeInOut(ramp(local, METERS_AT, METERS)) : 1;
  const practiceLive = beat.kind === 'practice';
  const practiceAlpha = practiceLive ? easeInOut(ramp(local, 0.3, 0.9)) : (beatIndex > timeline.beats.length - 2 ? 1 : 0);

  const perPair = trace.rows.map((row, index) => {
    const practiceRow = trace.practice.rows[index];
    const visible = index < scoredUpTo ? 1 : (index === pairIndex && beat.kind === 'pair' ? currentFill : 0);
    const f1 = practiceAlpha > 0 ? row.f1 + (practiceRow.f1 - row.f1) * practiceAlpha : row.f1;
    const em = practiceAlpha >= 1 ? practiceRow.em : row.em;
    return { id: row.id, f1, em, alpha: visible, changed: practiceAlpha > 0 && practiceRow.f1 !== row.f1 };
  });
  const countedRows = perPair.filter((entry) => entry.alpha > 0);
  const running = {
    n: countedRows.length,
    em: countedRows.reduce((sum, entry) => sum + entry.em, 0),
    meanF1: countedRows.length ? countedRows.reduce((sum, entry) => sum + entry.f1, 0) / countedRows.length : 0,
    perPair,
  };

  let pair = null;
  if (beat.kind === 'pair') {
    const row = trace.rows[beat.index];
    pair = pairView(row, row.prediction_words, row.gold_words, row.prediction_matched, row.gold_matched, data.articles, local);
  } else if (beat.kind === 'practice' || beatIndex > timeline.beats.length - 2) {
    const index = trace.rows.findIndex((row) => row.id === timeline.beats[timeline.beats.length - 1].changed);
    const row = trace.rows[index];
    const practiceRow = trace.practice.rows[index];
    const goldText = practiceRow.golds[practiceRow.best_gold];
    const merged = { ...row, gold: goldText, gold_tokens: practiceRow.best_gold_tokens, precision: practiceRow.precision, recall: practiceRow.recall, f1: practiceRow.f1, overlap: practiceRow.overlap, em: practiceRow.em };
    const phase = practiceLive ? local : PRACTICE;
    pair = pairView(merged, row.prediction_words, wordsOf(goldText), practiceRow.prediction_matched, practiceRow.gold_matched, data.articles, phase);
    pair.practice = { firstGold: row.gold, firstF1: row.f1, alpha: practiceLive ? ramp(local, 0, 0.3) : 1 };
  }
  const intro = beat.kind === 'intro' ? { listAlpha: ramp(local, 0.1, 0.6), shippedAlpha: ramp(local, INTRO_LATE_AT, 0.5) } : null;
  const outro = beat.kind === 'outro' || beat.kind === 'practice-intro' ? { alpha: beat.kind === 'outro' ? ramp(local, 0.1, 0.5) : 1 } : null;
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, intro, outro, pair, running, pairs: data.pairs, trace, practiceAlpha, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const LX = 28, LW = 592;                 // the left area: raw strings, token rows, meters
const RX = 640, RW = 232;                // the right column: running means and F1 by pair
const PRED_Y = 160, GOLD_Y = 238, CHIP_H = 22;
const METER_Y = [300, 336, 372];

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}
const chipWidth = (text) => 7 * text.length + 12;
function chipBoxes(chips) {
  let x = LX;
  return chips.map((chip) => { const box = { x, w: chipWidth(chip.text) }; x += box.w + 6; return box; });
}
function drawChipRow(ctx, chips, y, label) {
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(label, LX, y - 8);
  const boxes = chipBoxes(chips);
  chips.forEach((chip, index) => {
    if (chip.alpha <= 0) return;
    const { x, w } = boxes[index];
    ctx.save();
    ctx.globalAlpha = chip.alpha;
    ctx.fillStyle = chip.matched ? 'rgba(98, 217, 138, 0.22)' : PANEL;
    rounded(ctx, x, y, w, CHIP_H, 4); ctx.fill();
    ctx.strokeStyle = chip.matched ? GREEN : (chip.dropped ? LINE : DIM);
    rounded(ctx, x, y, w, CHIP_H, 4); ctx.stroke();
    ctx.fillStyle = chip.dropped ? DIM : INK;
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(chip.text, x + w / 2, y + 15);
    if (chip.dropped) { ctx.strokeStyle = DIM; ctx.beginPath(); ctx.moveTo(x + 5, y + 11); ctx.lineTo(x + w - 5, y + 11); ctx.stroke(); }
    ctx.textAlign = 'left';
    ctx.restore();
  });
  return boxes;
}
function drawMeter(ctx, y, label, value, fill, color) {
  ctx.fillStyle = DIM;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(label, LX, y + 11);
  ctx.fillStyle = PANEL;
  rounded(ctx, LX + 82, y, 320, 14, 4); ctx.fill();
  if (fill > 0) {
    ctx.fillStyle = color;
    rounded(ctx, LX + 82, y, 320 * value * fill, 14, 4); ctx.fill();
    ctx.save();
    ctx.globalAlpha = fill;
    ctx.fillStyle = INK;
    ctx.fillText(f3(value), LX + 412, y + 11);
    ctx.restore();
  }
}
function fitText(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `13px ${MONO}`;
  ctx.fillText('exact match and token F1 after normalization: lowercase, no punctuation, no articles', LX, 36);

  // Left area: the intro list, a pair, or the outro summary.
  if (scene.intro) {
    ctx.save();
    ctx.globalAlpha = scene.intro.listAlpha;
    scene.pairs.forEach((pair, index) => {
      const y = 78 + index * 44;
      ctx.fillStyle = INK; ctx.font = `11px ${MONO}`;
      ctx.fillText(`${pair.id}  model: "${fitText(pair.prediction, 60)}"`, LX, y);
      ctx.fillStyle = DIM;
      ctx.fillText(`     gold:  "${fitText(pair.gold, 60)}"`, LX, y + 16);
    });
    ctx.restore();
    if (scene.intro.shippedAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = scene.intro.shippedAlpha;
      ctx.fillStyle = AMBER; ctx.font = `11px ${MONO}`;
      ctx.fillText(`what shipped: string equality, ${scene.trace.shipped.string_equal_count} of ${scene.pairs.length} equal`, LX, 78 + scene.pairs.length * 44 + 4);
      ctx.restore();
    }
  }
  if (scene.pair) {
    const pair = scene.pair;
    ctx.save();
    ctx.globalAlpha = pair.rawAlpha;
    ctx.fillStyle = INK; ctx.font = `13px ${MONO}`;
    ctx.fillText(pair.id, LX, 76);
    ctx.font = `11px ${MONO}`; ctx.fillStyle = DIM;
    ctx.fillText(`model: "${fitText(pair.prediction, 66)}"`, LX + 36, 76);
    ctx.fillText(`gold:  "${fitText(pair.gold, 66)}"`, LX + 36, 94);
    if (pair.practice) {
      ctx.save();
      ctx.globalAlpha = pair.practice.alpha;
      ctx.fillStyle = AMBER;
      ctx.fillText(`first gold: "${fitText(pair.practice.firstGold, 40)}" scored F1 ${f3(pair.practice.firstF1)}; the best acceptable answer counts`, LX + 36, 112);
      ctx.restore();
    }
    ctx.restore();
    const predBoxes = drawChipRow(ctx, pair.predictionChips, PRED_Y, 'model answer, normalized (struck words are dropped articles)');
    const goldBoxes = drawChipRow(ctx, pair.goldChips, GOLD_Y, 'gold answer, normalized');
    if (pair.linkAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = pair.linkAlpha;
      ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5;
      for (const link of pair.links) {
        const a = predBoxes[link.from], b = goldBoxes[link.to];
        ctx.beginPath(); ctx.moveTo(a.x + a.w / 2, PRED_Y + CHIP_H); ctx.lineTo(b.x + b.w / 2, GOLD_Y); ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.restore();
    }
    const m = pair.meters;
    drawMeter(ctx, METER_Y[0], 'precision', m.precision, m.fill, BLUE);
    drawMeter(ctx, METER_Y[1], 'recall', m.recall, m.fill, BLUE);
    drawMeter(ctx, METER_Y[2], 'F1', m.f1, m.fill, pair.em === 1 ? GREEN : (m.f1 === 0 ? RED : BLUE));
    if (pair.emAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = pair.emAlpha;
      ctx.fillStyle = pair.em === 1 ? GREEN : DIM; ctx.font = `11px ${MONO}`;
      ctx.fillText(`exact match ${pair.em}   overlap ${m.overlap} of ${pair.predictionChips.filter((c) => !c.dropped).length} and ${pair.goldChips.filter((c) => !c.dropped).length}`, LX + 82, METER_Y[2] + 36);
      ctx.restore();
    }
  }
  if (scene.outro) {
    ctx.save();
    ctx.globalAlpha = scene.outro.alpha;
    const tr = scene.trace;
    const lines = [
      [INK, `mean exact match ${f3(tr.mean_em)}   (${tr.shipped.exact_match_count} of ${tr.rows.length})`],
      [INK, `mean F1          ${f3(tr.mean_f1)}`],
      [AMBER, `string equality scored ${tr.shipped.string_equal_count} of ${tr.rows.length}`],
      [GREEN, `rescued by normalization: ${tr.rows.filter((r) => r.em === 1 && !r.string_equal).map((r) => r.id).join(', ')}`],
      [BLUE, `partial credit from F1: ${tr.rows.filter((r) => r.em === 0 && r.f1 > 0).map((r) => r.id).join(', ')}`],
    ];
    ctx.font = `12px ${MONO}`;
    lines.forEach(([color, text], index) => { ctx.fillStyle = color; ctx.fillText(text, LX, 96 + index * 28); });
    ctx.restore();
  }

  // Right column: running means and F1 by pair.
  ctx.fillStyle = PANEL; rounded(ctx, RX, 78, RW, 110, 6); ctx.fill();
  ctx.strokeStyle = LINE; rounded(ctx, RX, 78, RW, 110, 6); ctx.stroke();
  ctx.fillStyle = DIM; ctx.font = `11px ${MONO}`;
  ctx.fillText('running means', RX + 12, 100);
  ctx.fillStyle = INK; ctx.font = `12px ${MONO}`;
  const r = scene.running;
  if (r.n === 0) {
    ctx.fillStyle = DIM;
    ctx.fillText('not started', RX + 12, 126);
  } else {
    ctx.fillText(`pairs scored   ${r.n} of ${scene.pairs.length}`, RX + 12, 126);
    ctx.fillText(`exact matches  ${r.em}`, RX + 12, 150);
    ctx.fillText(`mean F1        ${f3(r.meanF1)}`, RX + 12, 174);
  }
  ctx.fillStyle = PANEL; rounded(ctx, RX, 208, RW, 200, 6); ctx.fill();
  ctx.strokeStyle = LINE; rounded(ctx, RX, 208, RW, 200, 6); ctx.stroke();
  ctx.fillStyle = DIM; ctx.font = `11px ${MONO}`;
  ctx.fillText('F1 by pair', RX + 12, 230);
  r.perPair.forEach((entry, index) => {
    const y = 248 + index * 30;
    ctx.fillStyle = DIM; ctx.font = `11px ${MONO}`;
    ctx.fillText(entry.id, RX + 12, y + 11);
    ctx.fillStyle = BG; rounded(ctx, RX + 44, y, 120, 12, 3); ctx.fill();
    if (entry.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = entry.alpha;
      ctx.fillStyle = entry.em === 1 ? GREEN : (entry.f1 === 0 ? RED : BLUE);
      rounded(ctx, RX + 44, y, 120 * entry.f1, 12, 3); ctx.fill();
      ctx.fillStyle = entry.changed ? GREEN : INK;
      ctx.fillText(f3(entry.f1), RX + 172, y + 11);
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}
