// The lesson's animation, without a DOM: the same nearest-rank percentile as
// solution.py (and the interpolation of practice_answer.py), run on the same
// two deployments (python/fixtures/latencies.json), recorded as a trace, laid
// out on a reading-pace timeline, and turned into a drawable scene for any
// moment. Tests compare the trace with python/fixtures/expected-trace.json,
// which the Python suite derives from the real functions, so the picture
// cannot drift.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;             // one animation tick; the motion preference stretches it

const round6 = (x) => Number(x.toFixed(6));
const f2 = (x) => x.toFixed(2);
const lerp = (from, to, p) => from + (to - from) * p;
const KEYS = ['mean', 'p50', 'p95', 'p99'];
const sortedCopy = (latencies) => [...latencies].sort((a, b) => a - b);
const mean = (xs) => xs.reduce((total, x) => total + x, 0) / xs.length;

function guard(latencies, p) {
  if (latencies.length === 0) throw new Error('latencies must not be empty');
  if (p <= 0 || p > 100) throw new Error(`percentile must be above 0 and at most 100, got ${p}`);
}

// percentile from solution.py: the nearest rank.
export function percentile(latencies, p) {
  guard(latencies, p);
  const ordered = sortedCopy(latencies);
  const rank = Math.ceil(p * ordered.length / 100);
  return ordered[rank - 1];
}

// percentile from practice_answer.py: linear interpolation between ranks.
export function interpolated(latencies, p) {
  guard(latencies, p);
  const ordered = sortedCopy(latencies);
  const position = (ordered.length - 1) * p / 100;
  const lower = Math.floor(position);
  const fraction = position - lower;
  if (lower + 1 >= ordered.length) return ordered[ordered.length - 1];
  return ordered[lower] + fraction * (ordered[lower + 1] - ordered[lower]);
}

function summarize(latencies, method) {
  return { mean: mean(latencies), p50: method(latencies, 50), p95: method(latencies, 95), p99: method(latencies, 99) };
}

export function buildTrace(data) {
  const names = Object.keys(data.deployments);
  const deployments = {};
  for (const name of names) {
    const samples = data.deployments[name];
    const ordered = sortedCopy(samples);
    const n = ordered.length;
    const nearest = {};
    const interp = {};
    for (const p of data.percentiles) {
      const rank = Math.ceil(p * n / 100);
      nearest[`p${p}`] = { rank, index: rank - 1, value: ordered[rank - 1] };
      const position = (n - 1) * p / 100;
      const lower = Math.floor(position);
      interp[`p${p}`] = { position: round6(position), lower, fraction: round6(position - lower), value: round6(interpolated(samples, p)) };
    }
    deployments[name] = { samples: [...samples], sorted: ordered, mean: round6(mean(samples)), nearest, interpolated: interp };
  }
  const [first, second] = names;
  const differences = (method) => {
    const a = summarize(data.deployments[first], method);
    const b = summarize(data.deployments[second], method);
    const out = {};
    for (const key of KEYS) out[key] = round6(b[key] - a[key]);
    return out;
  };
  return { n: data.deployments[first].length, percentiles: [...data.percentiles], deployments,
    differences: { nearest: differences(percentile), interpolated: differences(interpolated) } };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. The samples appear, each
// deployment is sorted, each percentile is picked by its rank on both panels,
// the means are drawn, and the comparison is stated; about half a minute.
const INTRO = 3.0;
const INTRO_LATE_AT = 1.5;      // when the "what shipped" caption appears
const SORT = 2.0;
const PICK = 2.4;
const MEAN = 2.0;
const OUTRO = 2.5;
const PRACTICE_INTRO = 1.0;
const PRACTICE = 3.0;
const SLIDE_AT = 0.3;           // inside a pick beat: when the rank cursor starts moving
const SLIDE = 0.8;              // and how long it takes to reach its rank
const SORT_AT = 0.3;            // inside a sort beat: when the bars start moving
const SORT_MOVE = 1.2;

export function ordinal(k) {
  const tens = k % 100;
  if (tens >= 11 && tens <= 13) return `${k}th`;
  const last = k % 10;
  return `${k}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}

const aboveSecond = (samples) => samples.filter((x) => x > 1000).length;

export function buildTimeline(trace, data) {
  const beats = [];
  let t = 0;
  const names = Object.keys(trace.deployments);
  const [first, second] = names;
  const n = trace.n;
  const a = trace.deployments[first];
  const b = trace.deployments[second];
  beats.push({ kind: 'intro', start: t, duration: INTRO,
    caption: `${n} samples per deployment, time to first token in ms, in logged order. ${first}: ${a.sorted[0]} to ${a.sorted[n - 1]} ms. ${second}: ${b.sorted[0]} to ${b.sorted[n - 1]} ms, ${aboveSecond(b.samples)} samples above a second.`,
    captionLate: `What shipped: the report compared means, ${f2(a.mean)} ms (${first}) versus ${f2(b.mean)} ms (${second}), and called the new deployment faster.` });
  t += INTRO;
  beats.push({ kind: 'sort', start: t, duration: SORT, name: first,
    caption: `sorted(): a new list of the ${first} samples, smallest first, ${a.sorted[0]} to ${a.sorted[n - 1]} ms; the input list is untouched.` });
  t += SORT;
  beats.push({ kind: 'sort', start: t, duration: SORT, name: second,
    caption: `sorted(): the ${second} samples, smallest first. The two largest, ${b.sorted[n - 2]} and ${b.sorted[n - 1]} ms, land at ranks ${n - 1} and ${n}.` });
  t += SORT;
  for (const p of trace.percentiles) {
    for (const name of names) {
      const key = `p${p}`;
      const pick = trace.deployments[name].nearest[key];
      beats.push({ kind: 'pick', start: t, duration: PICK, name, key, p,
        caption: `${key}, ${name}: ${p} × ${n} / 100 = ${(p * n / 100).toFixed(1)}, ceil ${pick.rank}: the ${ordinal(pick.rank)} smallest of ${n} is ${pick.value} ms (index ${pick.index})${pick.rank === n ? ', the maximum' : ''}.` });
      t += PICK;
    }
  }
  const diff = trace.differences.nearest;
  beats.push({ kind: 'mean', start: t, duration: MEAN,
    caption: `Dashed lines: the means, ${first} ${f2(a.mean)} ms and ${second} ${f2(b.mean)} ms. On the mean alone, new is ${f2(-diff.mean)} ms faster.` });
  t += MEAN;
  const compare = (key) => `${key}: new is ${key === 'mean' ? f2(Math.abs(diff[key])) : Math.abs(diff[key])} ms ${diff[key] < 0 ? 'faster' : 'slower'}`;
  beats.push({ kind: 'outro', start: t, duration: OUTRO,
    caption: `${KEYS.map(compare).join('. ')}. The mean hid the tail: ${aboveSecond(b.samples)} of the ${n} new samples are above a second.` });
  t += OUTRO;
  beats.push({ kind: 'practice-intro', start: t, duration: PRACTICE_INTRO,
    caption: 'Practice variation: interpolate linearly between the two nearest ranks, the default of most numeric and plotting libraries.' });
  t += PRACTICE_INTRO;
  const ip = b.interpolated.p95;
  const gap = b.sorted[ip.lower + 1] - b.sorted[ip.lower];
  beats.push({ kind: 'practice', start: t, duration: PRACTICE,
    caption: `${second} p95 by interpolation: position (${n} - 1) × 95 / 100 = ${ip.position}, between the ${ordinal(ip.lower + 1)} (${b.sorted[ip.lower]} ms) and ${ordinal(ip.lower + 2)} (${b.sorted[ip.lower + 1]} ms) smallest: ${b.sorted[ip.lower]} + ${ip.fraction} × ${gap} = ${f2(ip.value)} ms. Nearest rank said ${b.nearest.p95.value} ms: the methods differ by ${f2(ip.value - b.nearest.p95.value)} ms here; ${first} p95 becomes ${f2(a.interpolated.p95.value)} ms, and the tail story stands.` });
  t += PRACTICE;
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

// Where each logged sample lands once sorted: a stable order by value, then by
// logged position, so equal samples keep their relative order.
function sortedSlots(samples) {
  const order = samples.map((value, index) => ({ value, index })).sort((p, q) => p.value - q.value || p.index - q.index);
  const slots = new Array(samples.length);
  order.forEach((entry, slot) => { slots[entry.index] = slot; });
  return slots;
}

// The drawable state at `elapsed` seconds: for each panel the bars (value,
// horizontal slot, alpha), the picked ranks, the rank cursor, the mean line,
// and the results line; the practice overlay; the caption.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const names = Object.keys(trace.deployments);
  const n = trace.n;
  const meanBeat = timeline.beats.findIndex((b) => b.kind === 'mean');
  const practiceBeat = timeline.beats.findIndex((b) => b.kind === 'practice');
  const meanAlpha = beatIndex < meanBeat ? 0 : (beatIndex === meanBeat ? easeInOut(ramp(local, 0.2, 1.0)) : 1);
  const practiceAlpha = beatIndex < practiceBeat ? 0 : (beatIndex === practiceBeat ? easeInOut(ramp(local, 0.2, 1.0)) : 1);

  const panels = {};
  let cursor = null;
  names.forEach((name) => {
    const deployment = trace.deployments[name];
    const sortIndex = timeline.beats.findIndex((b) => b.kind === 'sort' && b.name === name);
    const sortProgress = beatIndex < sortIndex ? 0 : (beatIndex === sortIndex ? easeInOut(ramp(local, SORT_AT, SORT_MOVE)) : 1);
    const slots = sortedSlots(deployment.samples);
    const bars = deployment.samples.map((value, index) => ({
      value,
      x: lerp(index, slots[index], sortProgress),
      alpha: beat.kind === 'intro' ? ramp(local, 0.1 + index * 0.06, 0.4) : 1,
    }));
    const highlights = trace.percentiles.map((p) => {
      const key = `p${p}`;
      const pick = deployment.nearest[key];
      const pickIndex = timeline.beats.findIndex((b) => b.kind === 'pick' && b.name === name && b.key === key);
      let alpha = 0;
      if (beatIndex > pickIndex) alpha = 1;
      else if (beatIndex === pickIndex) {
        alpha = ramp(local, SLIDE_AT + SLIDE, 0.3);
        cursor = { name, rank: lerp(1, pick.rank, easeInOut(ramp(local, SLIDE_AT, SLIDE))), target: pick.rank, alpha: 1 };
      }
      return { key, rank: pick.rank, index: pick.index, value: pick.value, alpha };
    });
    panels[name] = { bars, highlights, sortProgress, mean: deployment.mean, meanAlpha, interpolated: deployment.interpolated };
  });

  let practice = null;
  if (practiceAlpha > 0) {
    const name = names[1];
    const deployment = trace.deployments[name];
    const ip = deployment.interpolated.p95;
    practice = { alpha: practiceAlpha, name, key: 'p95', position: ip.position, lower: ip.lower, fraction: ip.fraction, value: ip.value,
      nearest: deployment.nearest.p95.value };
  }
  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return { t, beatIndex, beat: beat.kind, caption, n, names, panels, cursor, practice, finished: t >= timeline.duration };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', BAR = '#3b4a66';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const PANEL_X = [78, 492];                 // left edge of each panel, in panel order
const PANEL_W = 350;
const PY0 = 96, PY1 = 372;                 // the plot: PY0 is 1500 ms, PY1 is 0 ms
const TOP_MS = 1500;

const yOf = (ms) => PY1 - (Math.max(0, Math.min(TOP_MS, ms)) / TOP_MS) * (PY1 - PY0);

function drawPanel(ctx, scene, name, px, practiceAlpha) {
  const panel = scene.panels[name];
  const pitch = PANEL_W / scene.n;
  const centerOf = (slot) => px + slot * pitch + pitch / 2;
  ctx.font = `10.5px ${MONO}`;
  // Gridlines and the millisecond scale.
  for (const ms of [0, 500, 1000, 1500]) {
    const y = yOf(ms);
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + PANEL_W, y); ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.textAlign = 'right';
    ctx.fillText(ms === TOP_MS ? `${ms} ms` : String(ms), px - 8, y + 4);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `12px ${MONO}`;
  ctx.fillText(`${name} deployment`, px, PY0 - 20);
  ctx.textAlign = 'right';
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(panel.sortProgress < 0.5 ? 'logged order' : `sorted: rank 1 to ${scene.n}`, px + PANEL_W, PY0 - 20);
  // The bars.
  const lit = new Map();
  for (const highlight of panel.highlights) if (highlight.alpha > 0) lit.set(highlight.index, highlight);
  const slotOf = new Map();
  panel.bars.forEach((bar, index) => slotOf.set(index, bar.x));
  panel.bars.forEach((bar) => {
    if (bar.alpha <= 0) return;
    ctx.globalAlpha = bar.alpha;
    const top = yOf(bar.value);
    const x = px + bar.x * pitch + 3;
    ctx.fillStyle = BAR;
    ctx.fillRect(x, top, pitch - 6, PY1 - top);
    ctx.globalAlpha = 1;
  });
  // The picked ranks, lit blue once the cursor lands, with the value above.
  for (const highlight of panel.highlights) {
    if (highlight.alpha <= 0) continue;
    const slot = highlight.index;              // after the sort, slot k holds the (k + 1)th smallest
    const top = yOf(highlight.value);
    ctx.globalAlpha = highlight.alpha;
    ctx.fillStyle = BLUE;
    ctx.fillRect(px + slot * pitch + 3, top, pitch - 6, PY1 - top);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText(String(highlight.value), centerOf(slot), top - 6 - (highlight.rank % 2) * 12);
    ctx.globalAlpha = 1;
  }
  // The rank cursor under the axis.
  if (scene.cursor && scene.cursor.name === name) {
    const cx = centerOf(scene.cursor.rank - 1);
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.moveTo(cx, PY1 + 2); ctx.lineTo(cx - 5, PY1 + 10); ctx.lineTo(cx + 5, PY1 + 10); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillText(`rank ${scene.cursor.target}`, cx, PY1 + 24);
  }
  // The mean, dashed.
  if (panel.meanAlpha > 0) {
    ctx.globalAlpha = panel.meanAlpha;
    const y = yOf(panel.mean);
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + PANEL_W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.fillStyle = AMBER;
    ctx.fillText(`mean ${f2(panel.mean)}`, px + PANEL_W - 2, y - 5);
    ctx.globalAlpha = 1;
  }
  // The results line: nearest-rank values as they are picked, interpolated ones in the practice.
  ctx.textAlign = 'left';
  ctx.font = `11px ${MONO}`;
  const nearestLine = panel.highlights.filter((h) => h.alpha >= 1).map((h) => `${h.key} ${h.value}`).join('   ');
  const interpLine = Object.keys(panel.interpolated).map((key) => `${key} ${f2(panel.interpolated[key].value)}`).join('   ');
  if (practiceAlpha < 1 && nearestLine) {
    ctx.globalAlpha = 1 - practiceAlpha;
    ctx.fillStyle = INK;
    ctx.fillText(`nearest rank: ${nearestLine}`, px, PY1 + 46);
  }
  if (practiceAlpha > 0) {
    ctx.globalAlpha = practiceAlpha;
    ctx.fillStyle = GREEN;
    ctx.fillText(`interpolated: ${interpLine}`, px, PY1 + 46);
  }
  ctx.globalAlpha = 1;
  // The practice overlay: the fractional position between two bars of the new deployment.
  if (scene.practice && scene.practice.name === name) {
    const { alpha, position, value } = scene.practice;
    ctx.globalAlpha = alpha;
    const cx = centerOf(position);
    const y = yOf(value);
    ctx.strokeStyle = GREEN;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, PY1); ctx.lineTo(cx, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GREEN;
    ctx.beginPath(); ctx.arc(cx, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'right';
    ctx.fillText(`position ${position}: ${f2(value)} ms`, cx - 10, y - 26);
    ctx.globalAlpha = 1;
  }
}

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `13px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
  ctx.fillStyle = INK;
  ctx.fillText(`nearest rank: sort a copy, rank = ceil(p × ${scene.n} / 100), answer = sorted[rank - 1]`, 28, 36);
  const practiceAlpha = scene.practice ? scene.practice.alpha : 0;
  scene.names.forEach((name, index) => drawPanel(ctx, scene, name, PANEL_X[index], practiceAlpha));
  // The key.
  ctx.font = `10.5px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = BLUE; ctx.fillRect(28, 458, 10, 10);
  ctx.fillStyle = DIM; ctx.fillText('picked rank', 44, 467);
  ctx.strokeStyle = AMBER; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(140, 463); ctx.lineTo(166, 463); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('mean', 172, 467);
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(226, 463, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = DIM; ctx.fillText('interpolated value (practice)', 238, 467);
  ctx.globalAlpha = 1;
}
