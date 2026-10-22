// The lesson's animation, without a DOM: the same top-k truncation as
// solution.py (and the top-p variation of practice_answer.py), run on the same
// three positions (python/fixtures/positions.json), recorded as a trace, laid
// out on a reading-pace timeline, and turned into a drawable scene for any
// moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift from the code.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f3 = (x) => x.toFixed(3);
const f4 = (x) => x.toFixed(4);
const lerp = (from, to, p) => from + (to - from) * p;

// sort_key, top_k_sparse, renormalize, dropped_mass from solution.py and
// top_p_sparse from practice_answer.py, as plain functions over arrays of
// [index, probability] pairs.
export function sortKey(a, b) {
  if (a[1] !== b[1]) return b[1] - a[1];      // the larger probability first
  return a[0] - b[0];                         // among equals, the lower index first
}
export function topKSparse(probs, k) {
  if (k < 1 || k > probs.length) throw new Error(`k must be between 1 and ${probs.length}, got ${k}`);
  const pairs = probs.map((prob, index) => [index, prob]);
  pairs.sort(sortKey);
  return pairs.slice(0, k);
}
export function renormalize(sparse) {
  let keptSum = 0.0;
  for (const [, prob] of sparse) keptSum += prob;
  return sparse.map(([index, prob]) => [index, prob / keptSum]);
}
export function droppedMass(probs, sparse) {
  const keptIndices = new Set(sparse.map(([index]) => index));
  let dropped = 0.0;
  probs.forEach((prob, index) => { if (!keptIndices.has(index)) dropped += prob; });
  return dropped;
}
export function topPSparse(probs, p) {
  const pairs = probs.map((prob, index) => [index, prob]);
  pairs.sort(sortKey);
  const kept = [];
  let mass = 0.0;
  for (const pair of pairs) {
    kept.push(pair);
    mass += pair[1];
    if (mass >= p) break;
  }
  return kept;
}
// KL divergence from the stored (renormalized) targets to the teacher, term by term.
export function klFromStored(probs, sparse) {
  let total = 0.0;
  const values = renormalize(sparse);
  for (let i = 0; i < sparse.length; i += 1) total += values[i][1] * Math.log(values[i][1] / sparse[i][1]);
  return total;
}

export function buildTrace(data) {
  let totalDropped = 0.0;
  const positions = data.positions.map((position) => {
    const sparse = topKSparse(position.probs, data.k);
    const dropped = droppedMass(position.probs, sparse);
    totalDropped += dropped;
    const topP = topPSparse(position.probs, data.p);
    return {
      id: position.id, context: position.context, probs: position.probs,
      kept: sparse.map(([index, prob]) => [index, round6(prob)]),
      renormalized: renormalize(sparse).map(([index, value]) => [index, round6(value)]),
      kept_mass: round6(sparse.reduce((s, [, prob]) => s + prob, 0)), dropped: round6(dropped),
      kl_from_stored: round6(klFromStored(position.probs, sparse)),
      top_p: {
        kept: topP.map(([index, prob]) => [index, round6(prob)]),
        renormalized: renormalize(topP).map(([index, value]) => [index, round6(value)]),
        count: topP.length, kept_mass: round6(topP.reduce((s, [, prob]) => s + prob, 0)),
        dropped: round6(droppedMass(position.probs, topP)),
      },
    };
  });
  return { k: data.k, p: data.p, vocab: data.vocab, positions, mean_dropped: round6(totalDropped / data.positions.length),
    storage: { kept: data.k, vocab: data.vocab.length } };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Each position gets a pick beat
// (the three largest light up, the rest fade) and a renormalize beat (the
// kept bars grow to their new values); the practice replays the three
// positions with the running mass; the whole run is about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const PICK = 2.8;
const RENORM = 2.6;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 2.6;

const tokenName = (trace, index) => trace.vocab[index];
const listKept = (trace, pairs) => pairs.map(([index, prob]) => `${tokenName(trace, index)} ${f3(prob)}`).join(', ');

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const n = trace.positions.length;
  const vocab = trace.vocab.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} positions from the teacher, ${vocab} tokens each: the probability of every next token, in index order. Almost all of the mass sits on a few tokens.`,
    captionLate: `What shipped: the whole distribution stored at every position, ${vocab} floats here and thirty two thousand in production. The top ${trace.k} per position are enough to keep.` });
  t += INTRO;
  trace.positions.forEach((position, index) => {
    const dropped = position.probs.length - position.kept.length;
    const tie = position.kept.length >= 2 && position.kept[0][1] === position.kept[1][1]
      ? ` ${tokenName(trace, position.kept[0][0])} and ${tokenName(trace, position.kept[1][0])} tie at ${f3(position.kept[0][1])}; the lower index wins.`
      : '';
    beats.push({ kind: 'pick', start: t, duration: PICK, position: index,
      caption: `${position.id} (after "${position.context}"): the ${trace.k} largest are ${listKept(trace, position.kept)}.${tie} The other ${dropped}, ${f3(position.dropped)} of the mass, are dropped.` });
    t += PICK;
    beats.push({ kind: 'renorm', start: t, duration: RENORM, position: index,
      caption: `Renormalized by the kept mass ${f3(position.kept_mass)}: ${listKept(trace, position.renormalized)}. They sum to one again; the ratios between them are unchanged.` });
    t += RENORM;
  });
  const kls = trace.positions.map((position) => f4(position.kl_from_stored)).join(', ');
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Stored: ${trace.storage.kept} (index, probability) pairs per position instead of ${trace.storage.vocab} probabilities; mean dropped mass ${f3(trace.mean_dropped)}. Distance of the stored targets from the teacher (KL, minus the log of the kept mass): ${kls}; the flat ${trace.positions[1].id} loses the most.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: top-p keeps the smallest set of largest probabilities whose running mass reaches ${trace.p}, so a confident position stores fewer tokens and a flat one stores more.` });
  t += PRACTICE_INTRO;
  trace.positions.forEach((position, index) => {
    const tp = position.top_p;
    const last = tp.kept[tp.kept.length - 1];
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][tp.count - 1];
    beats.push({ kind: 'practice', start: t, duration: PRACTICE, position: index,
      caption: `${position.id}: the running mass reaches ${trace.p} at the ${ordinal} token (${tokenName(trace, last[0])}, total ${f3(tp.kept_mass)}), so ${tp.count} ${tp.count === 1 ? 'is' : 'are'} kept and ${f3(tp.dropped)} is dropped; top-k kept ${trace.k}.` });
    t += PRACTICE;
  });
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// The drawable state at `elapsed` seconds: one panel per position with six
// bars (height, alpha, state, rank, shown values), the status lines, the
// practice cumulative line, the summary, and the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const outroBeat = kinds.indexOf('outro');
  const practiceIntro = kinds.indexOf('practice-intro');
  const mode = beatIndex >= practiceIntro ? 'practice' : 'worked';

  const panels = trace.positions.map((position, index) => {
    const pickBeat = timeline.beats.findIndex((b) => b.kind === 'pick' && b.position === index);
    const renormBeat = pickBeat + 1;
    const practiceBeat = timeline.beats.findIndex((b) => b.kind === 'practice' && b.position === index);
    const keptRank = new Map(position.kept.map(([tokenIndex], rank) => [tokenIndex, rank + 1]));
    const renormValue = new Map(position.renormalized);
    const bars = position.probs.map((prob, tokenIndex) => ({
      index: tokenIndex, token: tokenName(trace, tokenIndex), teacher: prob, height: prob, alpha: 1, state: 'plain', rank: null, renormalized: null, showRenormalized: false,
    }));
    let status = { shown: false, keptMass: null, dropped: null, droppedShown: 0, renormalized: false, count: null };
    let cumulative = null;
    if (mode === 'worked') {
      // The pick beat: ranks appear one by one, then the rest fade while the dropped counter climbs.
      if (beatIndex > pickBeat || (beatIndex === pickBeat)) {
        const inPick = beatIndex === pickBeat;
        bars.forEach((bar) => {
          const rank = keptRank.get(bar.index);
          if (rank) {
            const shown = inPick ? ramp(local, 0.2 + (rank - 1) * 0.5, 0.3) : 1;
            if (shown > 0) { bar.state = 'kept'; bar.rank = rank; bar.highlight = shown; }
          } else {
            const fade = inPick ? ramp(local, 1.6, 0.6) : 1;
            bar.state = fade > 0 ? 'dropped' : 'plain';
            bar.alpha = lerp(1, 0.3, fade);
          }
        });
        const counter = inPick ? ramp(local, 1.6, 0.8) : 1;
        status = { shown: inPick ? local >= 1.6 : true, keptMass: position.kept_mass, dropped: position.dropped, droppedShown: position.dropped * counter, renormalized: false, count: position.kept.length };
      }
      // The renormalize beat: kept bars grow from the teacher value to the renormalized value.
      if (beatIndex >= renormBeat) {
        const progress = beatIndex === renormBeat ? easeInOut(ramp(local, 0.2, 1.4)) : 1;
        bars.forEach((bar) => {
          if (bar.state === 'kept') {
            bar.renormalized = renormValue.get(bar.index);
            bar.height = lerp(bar.teacher, bar.renormalized, progress);
            bar.showRenormalized = progress >= 1;
          }
        });
        status.renormalized = beatIndex > renormBeat || local >= 1.6;
      }
    } else {
      // The practice: teacher heights again, a running mass that climbs across the bars.
      if (beatIndex >= practiceBeat) {
        const tp = position.top_p;
        const keptSet = new Set(tp.kept.map(([tokenIndex]) => tokenIndex));
        const progress = beatIndex === practiceBeat ? easeInOut(ramp(local, 0.2, 1.6)) : 1;
        // The sorted order equals the index order at these three positions (the
        // Python test pins that), so the running mass reads left to right.
        const points = [];
        let running = 0;
        position.probs.forEach((prob, tokenIndex) => {
          running += prob;
          points.push({ index: tokenIndex, mass: running });
        });
        const reach = progress * (tp.count - 1 + 0.999);     // how many bars the line has crossed
        cumulative = { points, threshold: trace.p, crossing: tp.count - 1, reach, alpha: beatIndex === practiceBeat ? ramp(local, 0.1, 0.3) : 1 };
        bars.forEach((bar) => {
          if (keptSet.has(bar.index) && bar.index <= reach) { bar.state = 'kept'; bar.rank = bar.index + 1; bar.highlight = 1; }
          else if (!keptSet.has(bar.index) && progress >= 1) { bar.state = 'dropped'; bar.alpha = 0.3; }
        });
        status = { shown: progress >= 1, keptMass: tp.kept_mass, dropped: tp.dropped, droppedShown: tp.dropped, renormalized: false, count: tp.count };
      }
    }
    return { id: position.id, context: position.context, bars, status, cumulative, active: beat.position === index };
  });

  const summaryAlpha = beat.kind === 'outro' ? ramp(local, 0.2, 0.6) : (beatIndex > outroBeat && mode === 'worked' ? 1 : 0);
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, mode, caption, panels, summaryAlpha,
    summary: `stored ${trace.storage.kept} (index, probability) pairs per position instead of ${trace.storage.vocab} probabilities; mean dropped mass ${f3(trace.mean_dropped)}`,
    k: trace.k, p: trace.p, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const PANEL_X = [28, 314, 600], PANEL_W = 272;
const BASE_Y = 330, MAX_H = 200;         // a probability of 1 is 200 px tall
const BAR_W = 28, BAR_GAP = 12, BARS_X = 22;

const barX = (panel, index) => PANEL_X[panel] + BARS_X + index * (BAR_W + BAR_GAP);
const yOf = (value) => BASE_Y - value * MAX_H;

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
  const title = scene.mode === 'practice'
    ? `top-p targets: keep the smallest set whose running mass reaches ${scene.p}`
    : `top-k targets: keep the ${scene.k} largest probabilities per position, renormalize, drop the rest`;
  ctx.fillText(title, 28, 36);

  scene.panels.forEach((panel, p) => {
    const x0 = PANEL_X[p];
    // Panel frame and header.
    ctx.fillStyle = PANEL;
    rounded(ctx, x0, 52, PANEL_W, 356, 8); ctx.fill();
    ctx.strokeStyle = panel.active ? BLUE : LINE;
    rounded(ctx, x0, 52, PANEL_W, 356, 8); ctx.stroke();
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(panel.id, x0 + 12, 74);
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`after "${panel.context}"`, x0 + 40, 74);

    // Baseline.
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 + 14, BASE_Y + 0.5); ctx.lineTo(x0 + PANEL_W - 14, BASE_Y + 0.5); ctx.stroke();

    // Bars: teacher height in blue, kept bars green, dropped bars faded red.
    panel.bars.forEach((bar) => {
      const x = barX(p, bar.index);
      const top = yOf(bar.height);
      ctx.save();
      ctx.globalAlpha = bar.alpha;
      ctx.fillStyle = bar.state === 'kept' ? GREEN : (bar.state === 'dropped' ? RED : BLUE);
      ctx.fillRect(x, top, BAR_W, BASE_Y - top);
      if (bar.renormalized !== null && bar.height > bar.teacher) {
        // The teacher's value stays visible as a thin mark inside the grown bar.
        ctx.strokeStyle = BG;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(x, yOf(bar.teacher) + 0.5); ctx.lineTo(x + BAR_W, yOf(bar.teacher) + 0.5); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = bar.showRenormalized ? GREEN : DIM;
      const value = bar.showRenormalized ? bar.renormalized : bar.teacher;
      const lift = panel.cumulative ? 8 : 0;    // keep the labels clear of the running-mass dot
      ctx.fillText(f3(value), x + BAR_W / 2, top - 6 - lift);
      if (bar.rank !== null) {
        ctx.fillStyle = GREEN;
        ctx.fillText(`#${bar.rank}`, x + BAR_W / 2, top - 18 - lift);
      }
      ctx.fillStyle = DIM;
      ctx.fillText(bar.token, x + BAR_W / 2, BASE_Y + 16);
      ctx.textAlign = 'left';
      ctx.restore();
    });

    // The practice: the running mass as a stepped line and the threshold.
    if (panel.cumulative && panel.cumulative.alpha > 0) {
      const c = panel.cumulative;
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.strokeStyle = AMBER;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0 + 14, yOf(c.threshold)); ctx.lineTo(x0 + PANEL_W - 14, yOf(c.threshold)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = AMBER;
      ctx.font = `10px ${MONO}`;
      ctx.fillText(`p ${c.threshold}`, x0 + PANEL_W - 44, yOf(c.threshold) - 5);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let drawn = 0;
      c.points.forEach((point, i) => {
        if (i > c.reach) return;
        const px = barX(p, point.index) + BAR_W / 2;
        const py = yOf(point.mass);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        drawn += 1;
      });
      if (drawn > 0) ctx.stroke();
      ctx.lineWidth = 1;
      c.points.forEach((point, i) => {
        if (i > c.reach) return;
        ctx.fillStyle = i === c.crossing ? AMBER : BLUE;
        ctx.beginPath(); ctx.arc(barX(p, point.index) + BAR_W / 2, yOf(point.mass), 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // Status lines.
    const s = panel.status;
    ctx.font = `11px ${MONO}`;
    if (s.shown) {
      ctx.fillStyle = INK;
      ctx.fillText(`kept ${s.count} of ${panel.bars.length}, mass ${f3(s.keptMass)}`, x0 + 12, 366);
      ctx.fillStyle = RED;
      ctx.fillText(`dropped mass ${f3(s.droppedShown)}`, x0 + 12, 386);
      if (s.renormalized) {
        ctx.fillStyle = GREEN;
        ctx.fillText('renormalized: sums to 1.000', x0 + 12, 402);
      }
    } else {
      ctx.fillStyle = DIM;
      ctx.fillText('teacher probabilities, in index order', x0 + 12, 366);
    }
  });

  // Summary line.
  if (scene.summaryAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = scene.summaryAlpha;
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(scene.summary, 28, 440);
    ctx.restore();
  }
  ctx.font = `10.5px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('bar height = probability (a full bar is 1.0); green kept, red dropped', 28, 466);
}
