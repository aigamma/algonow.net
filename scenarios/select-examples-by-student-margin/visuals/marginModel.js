// The lesson's animation, without a DOM: the same scoring, ranking, and
// selection as solution.py (and the entropy of practice_answer.py), run on
// the same candidates (python/fixtures/candidates.json), recorded as a trace,
// laid out on a reading-pace timeline, and turned into a drawable scene for
// any moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const lerp = (from, to, p) => from + (to - from) * p;
// Two decimals the way Python's format prints them: an exact tie rounds to the even digit.
const f2 = (x) => {
  const scaled = x * 100;
  const floor = Math.floor(scaled);
  if (Math.abs(scaled - floor - 0.5) < 1e-9) return ((floor % 2 === 0 ? floor : floor + 1) / 100).toFixed(2);
  return (Math.round(scaled) / 100).toFixed(2);
};

// Python's sorted(zip(probs, routes), reverse=True): largest probability first, ties by route name descending.
function rankedPairs(probs, routes) {
  const pairs = probs.map((p, index) => ({ p, route: routes[index] }));
  pairs.sort((a, b) => (b.p - a.p) || (a.route < b.route ? 1 : a.route > b.route ? -1 : 0));
  return pairs;
}

function checkProbs(probs, routes) {
  if (probs.length !== routes.length) throw new Error(`${probs.length} probabilities for ${routes.length} routes`);
  const total = probs.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1.0) > 1e-6) throw new Error(`probabilities must sum to 1, got ${total.toFixed(2)}`);
}

// score from solution.py.
export function score(probs, routes) {
  checkProbs(probs, routes);
  const ranked = rankedPairs(probs, routes);
  return { top: ranked[0].route, second: ranked[1].route, margin: ranked[0].p - ranked[1].p };
}

// uncertainty from practice_answer.py.
export function entropy(probs, routes) {
  checkProbs(probs, routes);
  const ranked = rankedPairs(probs, routes);
  let total = 0.0;
  for (const p of probs) if (p > 0) total -= p * Math.log(p);
  return { top: ranked[0].route, entropy: total };
}

// select from solution.py: smallest margins first, ties by id.
export function select(candidates, routes, budget) {
  if (budget < 0 || budget > candidates.length) throw new Error(`budget must be between 0 and ${candidates.length}, got ${budget}`);
  const scored = candidates.map((candidate) => ({ id: candidate.id, ...score(candidate.probs, routes) }));
  const ranked = [...scored].sort((a, b) => (a.margin - b.margin) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { scored, ranked: ranked.map((row) => row.id), picked: ranked.slice(0, budget).map((row) => row.id) };
}

export function buildTrace(data) {
  const { scored, ranked, picked } = select(data.candidates, data.routes, data.budget);
  const margins = Object.fromEntries(scored.map((row) => [row.id, row.margin]));
  const first = data.candidates.slice(0, data.budget).map((candidate) => candidate.id);
  const mean = (ids) => round6(ids.reduce((sum, id) => sum + margins[id], 0) / data.budget);
  const entropies = data.candidates.map((candidate) => ({ id: candidate.id, ...entropy(candidate.probs, data.routes) }));
  const entropyRanked = [...entropies].sort((a, b) => (b.entropy - a.entropy) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    routes: data.routes,
    budget: data.budget,
    rows: data.candidates.map((candidate, index) => ({ id: candidate.id, probs: candidate.probs, top: scored[index].top, second: scored[index].second, margin: round6(scored[index].margin) })),
    ranking: ranked,
    picked,
    picked_mean_margin: mean(picked),
    shipped: { picked: first, mean_margin: mean(first) },
    practice: { rows: entropies.map((row) => ({ id: row.id, top: row.top, entropy: round6(row.entropy) })),
      picked: entropyRanked.slice(0, data.budget).map((row) => row.id), even_split: round6(Math.log(data.routes.length)) },
  };
}

// ---------------------------------------------------------------- timeline

const INTRO = 2.5;
const INTRO_LATE_AT = 1.3;
const ROW_BEAT = 1.6;
const RANK = 3.0;
const PICK = 3.0;
const SHIPPED = 3.0;
const OUTRO = 2.0;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.5;

export function buildTimeline(trace) {
  const beats = [];
  let t = 0;
  const n = trace.rows.length;
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} unlabeled prompts, each with the student's probabilities over ${trace.routes.join(', ')}. The teacher budget covers ${trace.budget}. A dot marks each route's probability; the margin is the gap between the two rightmost dots.`,
    captionLate: `What shipped: the first ${trace.budget} prompts in arrival order, ${trace.shipped.picked.join(', ')}, mean margin ${f2(trace.shipped.mean_margin)}. One of them, u1 at ${f2(trace.rows[0].margin)}, the student already answers with confidence.` });
  t += INTRO;
  trace.rows.forEach((row, index) => {
    const probs = row.probs.map((p, i) => `${trace.routes[i]} ${f2(p)}`).join(', ');
    const reading = row.margin < 0.05 ? 'the student is torn' : (row.margin > 0.6 ? 'the student is sure' : 'some doubt');
    beats.push({ kind: 'row', start: t, duration: ROW_BEAT, index,
      caption: `${row.id}: ${probs}. Top ${row.top}, second ${row.second}: margin ${f2(row.margin)}, ${reading}.` });
    t += ROW_BEAT;
  });
  beats.push({ kind: 'rank', start: t, duration: RANK,
    caption: `Sorted by margin with ties broken by id: ${trace.ranking.join(', ')}. The two ties at ${f2(trace.rows[3].margin)} come first in id order.` });
  t += RANK;
  beats.push({ kind: 'pick', start: t, duration: PICK,
    caption: `The ${trace.budget} smallest margins go to the teacher: ${trace.picked.join(', ')}, mean margin ${f2(trace.picked_mean_margin)}. The other ${n - trace.budget} wait for a later round.` });
  t += PICK;
  beats.push({ kind: 'shipped', start: t, duration: SHIPPED,
    caption: `What shipped, on the same prompts: ${trace.shipped.picked.join(', ')}, mean margin ${f2(trace.shipped.mean_margin)} against ${f2(trace.picked_mean_margin)}. A teacher call on u1 confirms what the student already knows.` });
  t += SHIPPED;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `Sort a copy of the probabilities, take the top two, subtract: one number per prompt that says how much a teacher label would teach. Rank by it and spend the budget from the top.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: `Practice variation: rank by the entropy of the whole distribution instead of the margin between the top two.` });
  t += PRACTICE_INTRO;
  const e = Object.fromEntries(trace.practice.rows.map((row) => [row.id, row.entropy]));
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `Entropy ranks u4 (${e.u4.toFixed(3)}) and u6 (${e.u6.toFixed(3)}) first as before, then u3 (${e.u3.toFixed(3)}) above u2 (${e.u2.toFixed(3)}): u3 spreads its doubt over three routes, which the two-way margin did not see. The picks become ${trace.practice.picked.join(', ')}.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);
const STAGES = ['intro', 'row', 'rank', 'pick', 'shipped', 'outro', 'practice-intro', 'practice'];

export function sceneAt(timeline, trace, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const stage = STAGES.indexOf(beat.kind);
  const arrival = trace.rows.map((row) => row.id);
  const byMargin = trace.ranking;
  const entropyOrder = [...trace.practice.rows].sort((a, b) => (b.entropy - a.entropy) || (a.id < b.id ? -1 : 1)).map((row) => row.id);
  // The row order: arrival until the rank beat, then by margin, then by entropy in the practice.
  let fromOrder = arrival;
  let toOrder = arrival;
  let blend = 0;
  if (beat.kind === 'rank') { fromOrder = arrival; toOrder = byMargin; blend = easeInOut(ramp(local, 0.2, 1.2)); }
  else if (stage > 2 && stage < 7) { fromOrder = byMargin; toOrder = byMargin; blend = 1; }
  else if (beat.kind === 'practice') { fromOrder = byMargin; toOrder = entropyOrder; blend = easeInOut(ramp(local, 0.3, 1.2)); }
  const slotOf = (order, id) => order.indexOf(id);
  let scored = 0;
  let current = null;
  if (beat.kind === 'row') {
    const bracket = easeInOut(ramp(local, 0.15, 0.5));
    scored = beat.index + (bracket >= 1 ? 1 : 0);
    current = { index: beat.index, bracket };
  } else if (stage > 1) scored = trace.rows.length;
  const practiceAlpha = beat.kind === 'practice' ? easeInOut(ramp(local, 0.3, 1.2)) : (stage > 7 ? 1 : 0);
  const pickAlpha = beat.kind === 'pick' ? easeInOut(ramp(local, 0.2, 0.6)) : (stage > 3 ? 1 : 0);
  const shippedAlpha = beat.kind === 'shipped' ? easeInOut(ramp(local, 0.2, 0.6)) : (beat.kind === 'intro' && local >= INTRO_LATE_AT ? easeInOut(ramp(local, INTRO_LATE_AT, 0.6)) : 0);
  const picks = practiceAlpha >= 0.5 ? trace.practice.picked : trace.picked;
  const rows = trace.rows.map((row, index) => ({
    ...row,
    slot: lerp(slotOf(fromOrder, row.id), slotOf(toOrder, row.id), blend),
    alpha: beat.kind === 'intro' ? easeInOut(ramp(local, 0.1 + index * 0.12, 0.5)) : 1,
    bracket: index < scored ? 1 : (current && current.index === index ? current.bracket : 0),
    current: Boolean(current && current.index === index),
    picked: pickAlpha > 0 && picks.includes(row.id),
    shipped: trace.shipped.picked.includes(row.id),
    entropy: trace.practice.rows[index].entropy,
  }));
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, rows, scored, pickAlpha, shippedAlpha, practiceAlpha, measure: practiceAlpha >= 0.5 ? 'entropy' : 'margin',
    finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const ROUTE_COLOURS = ['#5da2ff', '#9fc4ff', '#2f5f9e'];
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const AX0 = 150, AX1 = 560, ROW0 = 118, ROW_H = 38;      // the probability axis per row
const VX = 600;                                           // the value column

export function drawScene(ctx, scene, trace) {
  const xOf = (p) => AX0 + p * (AX1 - AX0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(`which prompts earn a teacher label: the ${trace.budget} ${scene.measure === 'margin' ? 'smallest margins' : 'largest entropies'} of ${trace.rows.length}`, 28, 36);
  // Legend for the routes.
  ctx.font = `10px ${MONO}`;
  trace.routes.forEach((route, index) => {
    const x = 28 + index * 110;
    ctx.fillStyle = ROUTE_COLOURS[index];
    ctx.beginPath(); ctx.arc(x + 5, 56, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DIM;
    ctx.fillText(route, x + 16, 60);
  });
  ctx.fillStyle = AMBER;
  ctx.fillRect(370, 52, 18, 3);
  ctx.fillStyle = DIM;
  ctx.fillText('margin: top minus second', 394, 60);
  // The axis.
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(AX0, ROW0 - 22); ctx.lineTo(AX1, ROW0 - 22); ctx.stroke();
  ctx.textAlign = 'center';
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.beginPath(); ctx.moveTo(xOf(p), ROW0 - 22); ctx.lineTo(xOf(p), ROW0 - 17); ctx.stroke();
    ctx.fillText(p.toFixed(2), xOf(p), ROW0 - 28);
  }
  ctx.fillText('probability', (AX0 + AX1) / 2, ROW0 - 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.fillText(scene.measure, VX, ROW0 - 28);
  ctx.fillText('top / second', VX + 70, ROW0 - 28);

  for (const row of scene.rows) {
    if (row.alpha <= 0) continue;
    const y = ROW0 + row.slot * ROW_H;
    ctx.globalAlpha = row.alpha;
    if (row.current) {
      ctx.fillStyle = PANEL;
      ctx.fillRect(28, y - 14, 850, ROW_H - 6);
    }
    if (row.picked) {
      ctx.globalAlpha = row.alpha * scene.pickAlpha * 0.25;
      ctx.fillStyle = GREEN;
      ctx.fillRect(28, y - 14, 850, ROW_H - 6);
      ctx.globalAlpha = row.alpha;
    }
    if (scene.shippedAlpha > 0 && row.shipped) {
      ctx.globalAlpha = row.alpha * scene.shippedAlpha;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(28, y - 14, 850, ROW_H - 6);
      ctx.lineWidth = 1;
      ctx.globalAlpha = row.alpha;
    }
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = row.current ? INK : DIM;
    ctx.fillText(row.id, 40, y + 4);
    // The row's own axis line and its three dots.
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(AX0, y); ctx.lineTo(AX1, y); ctx.stroke();
    const ranked = [...row.probs].map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
    if (row.bracket > 0) {
      const x1 = xOf(ranked[1].p);
      const x2 = lerp(x1, xOf(ranked[0].p), row.bracket);
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y - 9); ctx.lineTo(x2, y - 9); ctx.stroke();
      ctx.lineWidth = 1;
    }
    row.probs.forEach((p, i) => {
      ctx.fillStyle = ROUTE_COLOURS[i];
      ctx.beginPath(); ctx.arc(xOf(p), y, 5, 0, Math.PI * 2); ctx.fill();
    });
    // The value column.
    if (row.bracket >= 1) {
      ctx.font = `11px ${MONO}`;
      if (scene.practiceAlpha < 0.5) {
        ctx.fillStyle = row.margin < 0.05 ? AMBER : INK;
        ctx.fillText(f2(row.margin), VX, y + 4);
      } else {
        ctx.fillStyle = BLUE;
        ctx.fillText(row.entropy.toFixed(3), VX, y + 4);
      }
      ctx.fillStyle = DIM;
      ctx.font = `10px ${MONO}`;
      ctx.fillText(`${row.top} / ${row.second}`, VX + 70, y + 4);
    }
    if (row.picked) {
      ctx.globalAlpha = row.alpha * scene.pickAlpha;
      ctx.fillStyle = GREEN;
      ctx.font = `10px ${MONO}`;
      ctx.fillText('to the teacher', VX + 190, y + 4);
    } else if (scene.pickAlpha > 0 && row.bracket >= 1) {
      ctx.globalAlpha = row.alpha * scene.pickAlpha;
      ctx.fillStyle = DIM;
      ctx.font = `10px ${MONO}`;
      ctx.fillText('waits', VX + 190, y + 4);
    }
    ctx.globalAlpha = 1;
  }
  // Footer: the means.
  const fy = ROW0 + trace.rows.length * ROW_H + 8;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  if (scene.pickAlpha > 0) {
    ctx.globalAlpha = scene.pickAlpha;
    ctx.fillStyle = GREEN;
    const picksLine = scene.practiceAlpha >= 0.5
      ? `picked by entropy ${trace.practice.picked.join(', ')} (by margin it was ${trace.picked.join(', ')})`
      : `picked ${trace.picked.join(', ')}: mean margin ${f2(trace.picked_mean_margin)}`;
    ctx.fillText(picksLine, 28, fy);
    ctx.globalAlpha = 1;
  }
  if (scene.shippedAlpha > 0) {
    ctx.globalAlpha = scene.shippedAlpha;
    ctx.fillStyle = RED;
    ctx.fillText(`what shipped, the first ${trace.budget}: ${trace.shipped.picked.join(', ')}, mean margin ${f2(trace.shipped.mean_margin)}`, 440, fy);
    ctx.globalAlpha = 1;
  }
  if (scene.practiceAlpha >= 0.5) {
    ctx.fillStyle = BLUE;
    ctx.fillText(`by entropy: ${trace.practice.picked.join(', ')}; an even split would score ${trace.practice.even_split.toFixed(3)}`, 440, fy);
  }
  ctx.globalAlpha = 1;
}
