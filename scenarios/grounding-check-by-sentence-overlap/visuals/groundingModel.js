// The lesson's animation, without a DOM: the same sentence splitting, word
// sets, support scores, and verdicts as solution.py, run on the same chunks
// and answer (python/fixtures/answer.json), recorded as a trace, laid out on a
// reading-pace timeline, and turned into a drawable scene for any moment.
// Tests compare the trace with python/fixtures/expected-trace.json, which the
// Python suite derives from the real functions, so the picture cannot drift
// from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f3 = (x) => x.toFixed(3);

// split_sentences, split_citation, content_words, support_score, and
// check_grounding from solution.py (require_citation is the practice answer).
export function splitSentences(text) {
  const sentences = [];
  let buffer = '';
  for (const char of text) {
    buffer += char;
    if ('.?!'.includes(char)) {
      const sentence = buffer.trim();
      if (sentence !== '') sentences.push(sentence);
      buffer = '';
    }
  }
  const leftover = buffer.trim();
  if (leftover !== '') sentences.push(leftover);
  return sentences;
}
export function splitCitation(sentence) {
  const start = sentence.indexOf('[');
  const end = sentence.indexOf(']');
  if (start === -1 || end === -1 || end < start) return { text: sentence, cited: [] };
  const cited = sentence.slice(start + 1, end).split(',').map((part) => part.trim());
  const text = sentence.slice(0, start).trimEnd() + sentence.slice(end + 1);
  return { text, cited };
}
export function contentWords(text, stopwords) {
  let kept = '';
  for (const char of text.toLowerCase()) kept += (/[\p{L}\p{N}]/u.test(char) || /\s/.test(char)) ? char : ' ';
  const words = new Set();
  for (const word of kept.split(/\s+/)) if (word !== '' && !stopwords.has(word)) words.add(word);
  return words;
}
export function supportScore(sentenceWords, chunkWords) {
  if (sentenceWords.size === 0) return 0.0;
  let shared = 0;
  for (const word of sentenceWords) if (chunkWords.has(word)) shared += 1;
  return shared / sentenceWords.size;
}
export function checkGrounding(answer, chunks, threshold, stopwords, requireCitation = false) {
  const sentences = splitSentences(answer);
  if (sentences.length === 0) throw new Error('the answer has no sentences');
  const rows = [];
  sentences.forEach((sentence, index) => {
    const { text, cited } = splitCitation(sentence);
    const words = contentWords(text, stopwords);
    let bestId = null;
    let bestScore = -1.0;
    for (const chunk of chunks) {
      const score = supportScore(words, contentWords(chunk.text, stopwords));
      if (score > bestScore) { bestId = chunk.id; bestScore = score; }
    }
    let verdict;
    if (words.size === 0) verdict = 'no content';
    else if (bestScore >= threshold) verdict = 'supported';
    else verdict = 'unsupported';
    if (requireCitation && verdict === 'supported' && !cited.includes(bestId)) verdict = 'miscited';
    rows.push({ number: index + 1, text, cited, best: bestId, score: bestScore, verdict });
  });
  return rows;
}

export function buildTrace(data) {
  const stopwords = new Set(data.stopwords);
  const chunkWords = new Map(data.chunks.map((chunk) => [chunk.id, contentWords(chunk.text, stopwords)]));
  const rows = checkGrounding(data.answer, data.chunks, data.threshold, stopwords);
  const practice = checkGrounding(data.answer, data.chunks, data.threshold, stopwords, true);
  const sentences = splitSentences(data.answer).map((sentence, index) => {
    const { text, cited } = splitCitation(sentence);
    const words = contentWords(text, stopwords);
    const scores = data.chunks.map((chunk) => {
      const shared = [...words].filter((word) => chunkWords.get(chunk.id).has(word)).sort();
      return { id: chunk.id, shared, score: round6(supportScore(words, chunkWords.get(chunk.id))) };
    });
    const row = rows[index];
    return { number: index + 1, sentence, text, cited, words: [...words].sort(), scores, best: row.best, score: round6(row.score), verdict: row.verdict };
  });
  return {
    threshold: data.threshold,
    chunks: data.chunks.map((chunk) => ({ id: chunk.id, words: [...chunkWords.get(chunk.id)].sort() })),
    sentences,
    summary: { supported: rows.filter((row) => row.verdict === 'supported').length, flagged: rows.filter((row) => row.verdict !== 'supported').map((row) => row.number) },
    shipped: { with_citation: rows.filter((row) => row.cited.length > 0).length, total: rows.length },
    practice: { verdicts: practice.map((row) => row.verdict), supported: practice.filter((row) => row.verdict === 'supported').length,
      flagged: practice.filter((row) => row.verdict !== 'supported').map((row) => row.number) },
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. One beat per sentence: name
// it, collect its content words, grow the three scores, draw the link to the
// best chunk, stamp the verdict; the whole run is about half a minute.
const INTRO = 3.5;
const INTRO_LATE_AT = 1.8;    // when the "what shipped" caption appears
const SENTENCE_BEAT = 3.5;
const OUTRO = 3.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 4.0;
const WORDS_AT = 0.3, WORDS = 0.9;      // sub-phases inside a sentence beat
const SCORES_AT = 1.0, SCORES = 1.1;
const LINK_AT = 2.2, LINK = 0.6;
const STAMP_AT = 2.7;

function sentenceCaption(entry, trace) {
  const parts = entry.scores.map((s) => `${s.shared.length} with ${s.id} (${f3(s.score)})`).join(', ');
  const relation = entry.score >= trace.threshold ? `at or above ${trace.threshold}` : `below ${trace.threshold}`;
  let tail = `Best ${entry.best} at ${f3(entry.score)}, ${relation}: ${entry.verdict}.`;
  if (entry.verdict === 'unsupported') {
    const only = entry.scores[0].shared.length === 1 && entry.scores.every((s) => s.shared.length === 1 && s.shared[0] === entry.scores[0].shared[0]);
    tail += only ? ` Every chunk shares only "${entry.scores[0].shared[0]}": the step is invented.` : ' No chunk says this.';
  }
  return `Sentence ${entry.number} (cites ${entry.cited.join(', ')}): ${entry.words.length} content words; shares ${parts}. ${tail}`;
}

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${data.chunks.length} retrieved runbook chunks on the left and the assistant's ${trace.sentences.length}-sentence answer on the right, each sentence ending in a citation.`,
    captionLate: `What shipped: a citation-presence check. Every sentence carries a bracket, so ${trace.shipped.with_citation} of ${trace.shipped.total} passed, including the invented restart step.` });
  t += INTRO;
  trace.sentences.forEach((entry, index) => {
    beats.push({ kind: 'sentence', start: t, duration: SENTENCE_BEAT, index, caption: sentenceCaption(entry, trace) });
    t += SENTENCE_BEAT;
  });
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${trace.summary.supported} of ${trace.sentences.length} sentences supported; flagged: sentence ${trace.summary.flagged.join(', ')}. The shipped check passed all ${trace.shipped.total}; the overlap check catches the one sentence no chunk supports.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: with citations required, a supported sentence must cite its best chunk, or it is miscited.' });
  t += PRACTICE_INTRO;
  const p = trace.practice;
  const changed = trace.sentences.filter((entry, index) => p.verdicts[index] !== entry.verdict);
  const changedText = changed.map((entry) => `Sentence ${entry.number} scores ${f3(entry.score)} against ${entry.best} but cites ${entry.cited.join(', ')}: ${p.verdicts[entry.number - 1]}.`).join(' ');
  const flaggedText = p.flagged.map((number) => `${number} (${p.verdicts[number - 1]})`).join(', ');
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${changedText} Now ${p.supported} of ${trace.sentences.length} supported; flagged: sentence ${flaggedText}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const normalizeWord = (word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const CH_X0 = 28, CH_W = 290, CH_Y0 = 74, CH_H = 90, CH_GAP = 14;     // chunk boxes, left column
const SN_X0 = 576, SN_W = 296, SN_Y0 = 74, SN_H = 70, SN_GAP = 6;     // sentence boxes, right column
const BT_X0 = 28, BT_Y0 = 382, BT_W = 844, BT_H = 90;                  // the score panel at the bottom
const CHARS_PER_LINE = 42;

function wrapWords(text, maxChars) {
  const lines = [];
  let line = [];
  let col = 0;
  for (const word of text.split(' ')) {
    if (word === '') continue;
    if (col > 0 && col + 1 + word.length > maxChars) { lines.push(line); line = []; col = 0; }
    line.push({ word, col: col === 0 ? 0 : col + 1 });
    col = col === 0 ? word.length : col + 1 + word.length;
  }
  if (line.length) lines.push(line);
  return lines;
}
const chunkY = (index) => CH_Y0 + index * (CH_H + CH_GAP);
const sentenceY = (index) => SN_Y0 + index * (SN_H + SN_GAP);
const verdictColorName = (verdict) => (verdict === 'supported' ? 'green' : verdict === 'miscited' ? 'amber' : 'red');

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const firstSentenceBeat = kinds.indexOf('sentence');
  const outroBeat = kinds.indexOf('outro');
  const practiceBeat = kinds.indexOf('practice');
  const activeIndex = beat.kind === 'sentence' ? beat.index : -1;
  const doneCount = beat.kind === 'sentence' ? beat.index : (beatIndex >= outroBeat ? trace.sentences.length : 0);
  const inPractice = beatIndex >= practiceBeat;
  const practiceProgress = beat.kind === 'practice' ? ramp(local, 0.3, 0.8) : (inPractice ? 1 : 0);

  // Sub-phases of the active sentence beat.
  const wordsProgress = activeIndex >= 0 ? easeInOut(ramp(local, WORDS_AT, WORDS)) : 0;
  const scoresProgress = activeIndex >= 0 ? easeInOut(ramp(local, SCORES_AT, SCORES)) : 0;
  const linkProgress = activeIndex >= 0 ? easeInOut(ramp(local, LINK_AT, LINK)) : 0;
  const stampAlpha = activeIndex >= 0 ? ramp(local, STAMP_AT, 0.4) : 0;
  const active = activeIndex >= 0 ? trace.sentences[activeIndex] : null;
  const activeShared = active ? new Set(active.scores.find((s) => s.id === active.best).shared) : new Set();

  const chunks = data.chunks.map((chunk, index) => {
    const entry = trace.chunks[index];
    const isBest = Boolean(active && active.best === chunk.id);
    return {
      id: chunk.id,
      lines: wrapWords(chunk.text, CHARS_PER_LINE),
      alpha: beat.kind === 'intro' ? ramp(local, 0.2 + index * 0.25, 0.5) : 1,
      words: new Set(entry.words),
      shared: active ? new Set(active.scores[index].shared) : new Set(),
      highlight: active ? scoresProgress : 0,
      bestGlow: isBest ? linkProgress : 0,
    };
  });

  const sentences = trace.sentences.map((entry, index) => {
    const done = index < doneCount;
    const isActive = index === activeIndex;
    let verdict = entry.verdict;
    let verdictAlpha = done ? 1 : (isActive ? stampAlpha : 0);
    let linkAlpha = done ? 0.45 : (isActive ? linkProgress : 0);
    let color = verdictColorName(entry.verdict);
    const practiceVerdict = trace.practice.verdicts[index];
    let citeHighlight = 0;
    if (inPractice && practiceVerdict !== entry.verdict) {
      verdict = practiceProgress >= 0.5 ? practiceVerdict : entry.verdict;
      color = practiceProgress >= 0.5 ? verdictColorName(practiceVerdict) : color;
      verdictAlpha = 1;
      linkAlpha = 0.45 + 0.55 * practiceProgress;
      citeHighlight = practiceProgress;
    }
    return {
      number: entry.number,
      cited: entry.cited,
      lines: wrapWords(entry.text, CHARS_PER_LINE),
      alpha: beat.kind === 'intro' ? ramp(local, 0.4 + index * 0.25, 0.5) : 1,
      state: done ? 'done' : (isActive ? 'active' : 'pending'),
      verdict,
      verdictAlpha,
      color,
      best: entry.best,
      bestIndex: data.chunks.findIndex((chunk) => chunk.id === entry.best),
      score: entry.score,
      link: (done || isActive) ? { chunkIndex: data.chunks.findIndex((chunk) => chunk.id === entry.best), alpha: linkAlpha, color } : null,
      shared: isActive ? activeShared : new Set(),
      highlight: isActive ? wordsProgress : 0,
      citeHighlight,
    };
  });

  const panel = active ? {
    number: active.number,
    cited: active.cited,
    wordCount: active.words.length,
    words: active.words.map((word, index) => ({ word, alpha: clamp01((wordsProgress * active.words.length - index) / 1), shared: activeShared.has(word) })),
    scores: active.scores.map((s) => ({ id: s.id, score: s.score, shared: s.shared.length, fill: s.score * scoresProgress, labelAlpha: scoresProgress })),
    best: active.best,
    verdict: active.verdict,
    verdictAlpha: stampAlpha,
  } : null;

  const shippedAlpha = beat.kind === 'intro' ? ramp(local, INTRO_LATE_AT, 0.5) : 0;
  const checked = beat.kind === 'sentence' ? beat.index + (stampAlpha > 0 ? 1 : 0) : doneCount;
  const summaryVerdicts = sentences.map((s) => s.verdict);
  const supported = summaryVerdicts.slice(0, checked).filter((v) => v === 'supported').length;
  const flagged = sentences.slice(0, checked).filter((s) => s.verdict !== 'supported').map((s) => `${s.number}${inPractice && practiceProgress >= 0.5 ? ` (${s.verdict})` : ''}`);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, chunks, sentences, panel, shippedAlpha, shipped: trace.shipped,
    summary: { checked, total: trace.sentences.length, supported, flagged }, threshold: trace.threshold,
    practice: inPractice, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const COLORS = { green: GREEN, amber: AMBER, red: RED, blue: BLUE };
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const CHAR_W = 6.3;      // 10.5px monospace

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

function drawBox(ctx, x, y, w, h, alpha, stroke) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PANEL;
  rounded(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = stroke || LINE;
  ctx.lineWidth = stroke ? 1.5 : 1;
  rounded(ctx, x, y, w, h, 6); ctx.stroke();
  ctx.restore();
}

// Wrapped text, word by word, so shared words can take a color of their own.
function drawWrapped(ctx, lines, x, y, lineHeight, colorFor) {
  ctx.font = `10.5px ${MONO}`;
  ctx.textAlign = 'left';
  lines.forEach((line, row) => {
    for (const { word, col } of line) {
      ctx.fillStyle = colorFor(word);
      ctx.fillText(word, x + col * CHAR_W, y + row * lineHeight);
    }
  });
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`grounding check: share of a sentence's content words found in a chunk, threshold ${scene.threshold}`, 28, 36);
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('retrieved chunks', CH_X0, 62);
  ctx.fillText('answer sentences (each cites a chunk)', SN_X0, 62);

  // Chunk boxes: id, wrapped text with the active sentence's shared words in green.
  scene.chunks.forEach((chunk, index) => {
    const y = chunkY(index);
    drawBox(ctx, CH_X0, y, CH_W, CH_H, chunk.alpha, chunk.bestGlow > 0 ? BLUE : null);
    ctx.save();
    ctx.globalAlpha = chunk.alpha;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = BLUE;
    ctx.fillText(chunk.id, CH_X0 + 10, y + 17);
    if (chunk.highlight > 0 && chunk.shared.size > 0) {
      ctx.fillStyle = GREEN;
      ctx.font = `10.5px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(`shares ${chunk.shared.size}`, CH_X0 + CH_W - 10, y + 17);
      ctx.textAlign = 'left';
    }
    drawWrapped(ctx, chunk.lines, CH_X0 + 10, y + 34, 13, (word) => (chunk.highlight > 0 && chunk.shared.has(normalizeWord(word)) ? GREEN : INK));
    ctx.restore();
  });

  // Links from each checked sentence to its best chunk, through the gap.
  scene.sentences.forEach((sentence, index) => {
    if (!sentence.link || sentence.link.alpha <= 0) return;
    const x0 = SN_X0, y0 = sentenceY(index) + SN_H / 2;
    const x1 = CH_X0 + CH_W, y1 = chunkY(sentence.link.chunkIndex) + CH_H / 2;
    ctx.save();
    ctx.globalAlpha = sentence.link.alpha;
    ctx.strokeStyle = COLORS[sentence.link.color];
    ctx.lineWidth = sentence.state === 'active' || scene.practice ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 - 110, y0, x1 + 110, y1, x1, y1);
    ctx.stroke();
    ctx.fillStyle = COLORS[sentence.link.color];
    ctx.font = `10.5px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(f3(sentence.score), (x0 + x1) / 2, (y0 + y1) / 2 - 5 + (index % 2 ? 11 : 0));
    ctx.textAlign = 'left';
    ctx.restore();
  });

  // Sentence boxes: number, citation, wrapped text, verdict stamp.
  scene.sentences.forEach((sentence, index) => {
    const y = sentenceY(index);
    const dim = sentence.state === 'pending' ? 0.55 : 1;
    drawBox(ctx, SN_X0, y, SN_W, SN_H, sentence.alpha * dim, sentence.state === 'active' ? BLUE : null);
    ctx.save();
    ctx.globalAlpha = sentence.alpha * dim;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(`${sentence.number}`, SN_X0 + 10, y + 17);
    ctx.fillStyle = sentence.citeHighlight > 0 ? AMBER : DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`cites ${sentence.cited.join(', ')}`, SN_X0 + 26, y + 17);
    if (sentence.verdictAlpha > 0) {
      ctx.globalAlpha = sentence.alpha * sentence.verdictAlpha;
      ctx.fillStyle = COLORS[sentence.color];
      ctx.textAlign = 'right';
      ctx.fillText(sentence.verdict, SN_X0 + SN_W - 10, y + 17);
      ctx.textAlign = 'left';
      ctx.globalAlpha = sentence.alpha * dim;
    }
    drawWrapped(ctx, sentence.lines, SN_X0 + 10, y + 34, 13, (word) => (sentence.highlight > 0 && sentence.shared.has(normalizeWord(word)) ? GREEN : INK));
    ctx.restore();
  });

  // The shipped check, during the intro.
  if (scene.shippedAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(`what shipped: ${scene.shipped.with_citation} of ${scene.shipped.total} sentences cite a chunk, all pass`, SN_X0 + SN_W, 62);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Score panel: the active sentence's content words and its three scores.
  drawBox(ctx, BT_X0, BT_Y0, BT_W, BT_H, 1, null);
  ctx.font = `10.5px ${MONO}`;
  if (scene.panel) {
    const p = scene.panel;
    ctx.fillStyle = DIM;
    ctx.fillText(`sentence ${p.number}: ${p.wordCount} content words (stopwords dropped)`, BT_X0 + 12, BT_Y0 + 20);
    let x = BT_X0 + 12;
    let y = BT_Y0 + 42;
    for (const chip of p.words) {
      if (chip.alpha <= 0) continue;
      const w = chip.word.length * CHAR_W + 12;
      if (x + w > BT_X0 + 470) { x = BT_X0 + 12; y += 20; }
      ctx.save();
      ctx.globalAlpha = chip.alpha;
      ctx.fillStyle = chip.shared && p.scores[0].labelAlpha > 0 ? '#1f3b2c' : LINE;
      rounded(ctx, x, y - 12, w, 17, 4); ctx.fill();
      ctx.fillStyle = chip.shared && p.scores[0].labelAlpha > 0 ? GREEN : INK;
      ctx.fillText(chip.word, x + 6, y);
      ctx.restore();
      x += w + 6;
    }
    // Three score bars with the threshold tick.
    const bx = BT_X0 + 520, bw = 170;
    p.scores.forEach((s, index) => {
      const by = BT_Y0 + 18 + index * 22;
      ctx.fillStyle = s.id === p.best && p.verdictAlpha > 0 ? COLORS[verdictColorName(p.verdict)] : DIM;
      ctx.fillText(s.id, bx - 30, by + 4);
      ctx.fillStyle = LINE;
      ctx.fillRect(bx, by - 6, bw, 12);
      ctx.fillStyle = s.id === p.best ? BLUE : '#4a5f8a';
      ctx.fillRect(bx, by - 6, bw * s.fill, 12);
      ctx.strokeStyle = AMBER;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(bx + bw * scene.threshold, by - 9); ctx.lineTo(bx + bw * scene.threshold, by + 9); ctx.stroke();
      ctx.setLineDash([]);
      if (s.labelAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = s.labelAlpha;
        ctx.fillStyle = INK;
        ctx.fillText(`${f3(s.score)}  shares ${s.shared}`, bx + bw + 8, by + 4);
        ctx.restore();
      }
    });
    if (p.verdictAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = p.verdictAlpha;
      ctx.fillStyle = COLORS[verdictColorName(p.verdict)];
      ctx.fillText(`best ${p.best} ${f3(p.scores.find((s) => s.id === p.best).score)} ${p.scores.find((s) => s.id === p.best).score >= scene.threshold ? 'at or above' : 'below'} ${scene.threshold}: ${p.verdict}`, BT_X0 + 12, BT_Y0 + 80);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = DIM;
    const s = scene.summary;
    const text = s.checked === 0
      ? `${scene.shipped.total} sentences to check against ${scene.chunks.length} chunks`
      : `${s.supported} of ${s.total} sentences supported${s.flagged.length ? `; flagged: sentence ${s.flagged.join(', ')}` : ''}`;
    ctx.fillText(text, BT_X0 + 12, BT_Y0 + 24);
    ctx.fillStyle = INK;
    ctx.fillText(scene.practice ? 'citations required: a supported sentence must cite its best chunk' : `threshold ${scene.threshold}: the best chunk must share at least that share of the sentence's content words`, BT_X0 + 12, BT_Y0 + 48);
  }
  ctx.globalAlpha = 1;
}
