// The lesson's animation, without a DOM: the paired bootstrap from solution.py
// on python/fixtures/results.json, laid out on a reading-pace timeline and
// turned into a drawable scene for any moment. Python's seeded generator is
// not replayed in the browser: the drawn indices of the shown resamples and
// the two hundred differences travel in python/fixtures/expected-trace.json,
// and the model rescores the shown resamples from their indices and recomputes
// the percentiles and the better share from the list. Tests compare the result
// with that fixture, which the Python suite derives from the real solution.

export const W = 900;
export const H = 486;
export const STEP_MS = 50;              // one animation tick; the motion preference stretches it

// ------------------------------------------------- the lesson's arithmetic
const sum = (values) => values.reduce((total, value) => total + value, 0);
export const accuracy = (results) => sum(results) / results.length;
const round4 = (value) => Math.round(value * 1e4) / 1e4;

// Python's round() sends a half to the even neighbour; the percentile position
// must land on the same index as the Python file.
export function roundHalfEven(value) {
  const floor = Math.floor(value);
  if (value - floor === 0.5) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(value);
}

// percentile from solution.py: nearest rank on the sorted list.
export function percentile(values, share) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[roundHalfEven((share / 100) * (ordered.length - 1))];
}

// Score one resample from its drawn indices, as the inner loop of solution.py does.
export function scoreResample(old, fresh, indices) {
  let oldRight = 0;
  let newRight = 0;
  for (const index of indices) {
    oldRight += old[index];
    newRight += fresh[index];
  }
  return { indices: [...indices], old: oldRight, new: newRight, difference: round4((newRight - oldRight) / old.length) };
}

// `python` is the part of the trace fixture the browser cannot produce: the
// drawn indices of the shown resamples and every difference.
export function buildTrace(data, python) {
  if (data.old.length !== data.new.length) throw new Error('paired results need one entry per item');
  const resamples = python.resamples.map((entry) => scoreResample(data.old, data.new, entry.indices));
  const differences = [...python.differences];
  const low = percentile(differences, 2.5);
  const high = percentile(differences, 97.5);
  return {
    accuracy: { old: accuracy(data.old), new: accuracy(data.new), difference: accuracy(data.new) - accuracy(data.old) },
    resamples,
    differences,
    interval: { low, high },
    includes_zero: low <= 0 && 0 <= high,
    better_fraction: differences.filter((difference) => difference > 0).length / differences.length,
  };
}

// ---------------------------------------------------------------- timeline

// Seconds at the calm setting: a reading pace. Four resamples are shown one
// at a time, eight more quickly, the rest as a counter; the whole run is
// under half a minute. The slow motion setting stretches all of it.
const INTRO = 3;
const INTRO_LATE_AT = 1.6;
const RESAMPLE = 2.6;        // one shown resample: draw the tiles, score, add to the histogram, hold
const TILES_AT = 0.2;
const TILES = 1.0;
const SCORE_AT = 1.3;
const COUNT_AT = 1.6;        // when its bar grows in the histogram
const QUICK = 3;             // resamples five to twelve, one every QUICK_STEP seconds
const QUICK_STEP = 0.3;
const FILL = 3;              // the remaining resamples as a counter
const INTERVAL = 3;
const OUTRO = 2;
const PRACTICE_INTRO = 1;
const PRACTICE = 3;
const SHOWN = 4;             // resamples shown one at a time
const QUICK_COUNT = 8;       // resamples shown quickly

export const pct = (value) => `${(value * 100).toFixed(1)}%`;
export const points = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}`;

function describeDraw(resample) {
  const counts = {};
  for (const index of resample.indices) counts[index] = (counts[index] || 0) + 1;
  const distinct = Object.keys(counts).length;
  let most = resample.indices[0];
  for (const index of Object.keys(counts)) if (counts[index] > counts[most]) most = Number(index);
  return `${distinct} distinct (item ${Number(most) + 1} drawn ${counts[most]} times)`;
}

export function buildTimeline(trace, data) {
  const n = data.old.length;
  const total = trace.differences.length;
  const beats = [];
  let t = 0;
  const push = (beat) => { beats.push({ ...beat, start: t }); t += beat.duration; };
  const gain = points(trace.accuracy.difference);
  push({ kind: 'intro', duration: INTRO,
    caption: `${n} benchmark items, each answered by the old model and the new one. Old right ${sum(data.old)} of ${n} (${pct(trace.accuracy.old)}), new right ${sum(data.new)} of ${n} (${pct(trace.accuracy.new)}).`,
    captionLate: `What shipped: ${pct(trace.accuracy.new)} beats ${pct(trace.accuracy.old)}, a ${gain}-point gain, so ship it. ${n} items cannot settle ${gain.replace('+', '')} points on their own.` });
  trace.resamples.slice(0, SHOWN).forEach((resample, index) => push({ kind: 'resample', duration: RESAMPLE, number: index + 1, resample,
    caption: `Resample ${index + 1}: ${n} items drawn with replacement, ${describeDraw(resample)}: old right ${resample.old}, new right ${resample.new}, difference ${points(resample.difference)} points.` }));
  push({ kind: 'quick', duration: QUICK,
    caption: `Resamples ${SHOWN + 1} to ${SHOWN + QUICK_COUNT}, one every third of a second: each adds one difference to the histogram.` });
  push({ kind: 'fill', duration: FILL,
    caption: `The remaining ${total - SHOWN - QUICK_COUNT} resamples, computed by the Python file, fill the histogram: ${total} differences in all.` });
  const { low, high } = trace.interval;
  push({ kind: 'interval', duration: INTERVAL,
    caption: `Sorted, the 2.5th and 97.5th percentiles are ${points(low)} and ${points(high)} points: the 95% interval ${trace.includes_zero ? 'includes' : 'excludes'} zero, so the ${gain.replace('+', '')}-point gain is ${trace.includes_zero ? 'not established' : 'established'}.` });
  push({ kind: 'outro', duration: OUTRO,
    caption: `A ${gain}-point gain sits inside an interval ${((high - low) * 100).toFixed(0)} points wide (${points(low)} to ${points(high)}). The point estimate said ship; the interval says not yet.` });
  push({ kind: 'practice-intro', duration: PRACTICE_INTRO,
    caption: 'Practice: the probability that the new model is better is the share of resamples with a difference above zero.' });
  const better = trace.differences.filter((difference) => difference > 0).length;
  push({ kind: 'practice', duration: PRACTICE,
    caption: `${better} of ${total} resamples are above zero: ${pct(trace.better_fraction)}. More likely better than not, and far from certain.` });
  return { beats, duration: t, markers: beats.map((beat) => beat.start) };
}

// ----------------------------------------------------------------- scene

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ramp = (t, from, duration) => clamp01((t - from) / duration);

const BIN_STEP = 0.04;   // every difference is a multiple of one item over twenty-five items

export function binsFor(differences) {
  const values = differences.map((difference) => Math.round(difference * 100));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = Math.round(BIN_STEP * 100);
  const bins = [];
  for (let value = low; value <= high; value += step) bins.push({ points: value, count: 0 });
  return bins;
}

// The drawable state at `elapsed` seconds.
export function sceneAt(timeline, trace, data, elapsed) {
  const t = Math.max(0, Math.min(elapsed, timeline.duration));
  let beatIndex = timeline.beats.findIndex((beat) => t < beat.start + beat.duration);
  if (beatIndex < 0) beatIndex = timeline.beats.length - 1;
  const beat = timeline.beats[beatIndex];
  const local = t - beat.start;
  const kinds = timeline.beats.map((b) => b.kind);
  const quickIndex = kinds.indexOf('quick');
  const fillIndex = kinds.indexOf('fill');
  const intervalIndex = kinds.indexOf('interval');
  const practiceIndex = kinds.indexOf('practice');
  const total = trace.differences.length;

  const items = data.old.map((oldResult, index) => ({ index, old: oldResult, new: data.new[index], drawn: 0 }));
  let gridAlpha = 1;
  if (beat.kind === 'intro') gridAlpha = ramp(local, 0.1, 0.6);

  // How many resamples have entered the histogram, and which one is on show.
  let completed = 0;
  let current = null;           // { number, indices (shown so far), old, new, difference, scored }
  let counter = null;           // the fill beat's running count
  if (beat.kind === 'resample') {
    completed = beat.number - 1 + (local >= COUNT_AT ? 1 : 0);
    const shown = Math.round(ramp(local, TILES_AT, TILES) * beat.resample.indices.length);
    current = { number: beat.number, indices: beat.resample.indices.slice(0, shown), old: beat.resample.old, new: beat.resample.new,
      difference: beat.resample.difference, scored: local >= SCORE_AT };
  } else if (beatIndex > 0 && beatIndex < quickIndex) {
    completed = SHOWN;
  } else if (beat.kind === 'quick') {
    const started = Math.min(QUICK_COUNT, Math.floor(local / QUICK_STEP) + 1);
    completed = SHOWN + started;
    const resample = trace.resamples[SHOWN + started - 1];
    current = { number: SHOWN + started, indices: resample.indices, old: resample.old, new: resample.new, difference: resample.difference, scored: true };
  } else if (beat.kind === 'fill') {
    const shownSoFar = SHOWN + QUICK_COUNT;
    completed = shownSoFar + Math.round(easeInOut(ramp(local, 0.2, FILL - 0.6)) * (total - shownSoFar));
    counter = { done: completed, total };
  } else if (beatIndex > fillIndex) {
    completed = total;
  }
  if (current) for (const index of current.indices) items[index].drawn += 1;

  const bins = binsFor(trace.differences);
  trace.differences.slice(0, completed).forEach((difference) => {
    const bin = bins.find((entry) => entry.points === Math.round(difference * 100));
    if (bin) bin.count += 1;
  });
  const finalBins = binsFor(trace.differences);
  trace.differences.forEach((difference) => { const bin = finalBins.find((entry) => entry.points === Math.round(difference * 100)); if (bin) bin.count += 1; });
  const maxCount = Math.max(...finalBins.map((bin) => bin.count));

  const intervalAlpha = beatIndex < intervalIndex ? 0 : beatIndex === intervalIndex ? ramp(local, 0.2, 0.8) : 1;
  const shadeAlpha = beatIndex < practiceIndex ? 0 : beatIndex === practiceIndex ? easeInOut(ramp(local, 0.2, 1)) : 1;
  const better = trace.differences.filter((difference) => difference > 0).length;

  const caption = beat.kind === 'intro' && local >= INTRO_LATE_AT ? beat.captionLate : beat.caption;
  return {
    t, beatIndex, beat: beat.kind, caption, items, gridAlpha, current, counter, completed, total, bins, maxCount,
    interval: trace.interval, intervalAlpha, shadeAlpha, better, betterFraction: trace.better_fraction,
    accuracy: trace.accuracy, oldRight: sum(data.old), newRight: sum(data.new), n: data.old.length, seed: data.seed,
    finished: t >= timeline.duration,
  };
}

// ------------------------------------------------------------------ drawing

const INK = '#e9edf6', DIM = '#9aa5bd', PANEL = '#1e2740', LINE = '#232c40', BG = '#0d1119';
const BLUE = '#5da2ff', GREEN = '#62d98a', AMBER = '#f0b94b', RED = '#e06767';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const GRID_X = 28, GRID_Y = 80, CELL = 40, GAP = 6;
const TILE_X = 300, TILE_Y = 80, TILE_W = 46, TILE_H = 28, TILE_GAP = 5;
const HIST_X = 596, HIST_W = 284, HIST_BASE = 300, HIST_MAX = 180;

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.max(0, w), h, r);
  else ctx.rect(x, y, Math.max(0, w), h);
}

export function cellRect(index) {
  return { x: GRID_X + (index % 5) * (CELL + GAP), y: GRID_Y + Math.floor(index / 5) * (CELL + GAP), w: CELL, h: CELL };
}
export function tileRect(position) {
  return { x: TILE_X + (position % 5) * (TILE_W + TILE_GAP), y: TILE_Y + Math.floor(position / 5) * (TILE_H + TILE_GAP), w: TILE_W, h: TILE_H };
}

const itemColor = (item) => (item.new && !item.old ? BLUE : item.old && !item.new ? RED : item.old ? GREEN : DIM);

export function drawScene(ctx, scene) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(`paired bootstrap of the benchmark difference: ${scene.n} items, ${scene.total} resamples, seed ${scene.seed}`, GRID_X, 36);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText('items: old | new (green right, red wrong)', GRID_X, 62);
  ctx.fillText(scene.current ? `resample ${scene.current.number} of ${scene.total}` : 'resample', TILE_X, 62);
  ctx.fillText('differences, new minus old (points)', HIST_X, 62);

  // The 25 items as split squares: old on the left half, new on the right.
  ctx.globalAlpha = scene.gridAlpha;
  scene.items.forEach((item) => {
    const r = cellRect(item.index);
    ctx.fillStyle = PANEL;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    ctx.globalAlpha = scene.gridAlpha * 0.55;
    ctx.fillStyle = item.old ? GREEN : RED;
    ctx.fillRect(r.x + 3, r.y + 3, r.w / 2 - 4, r.h - 6);
    ctx.fillStyle = item.new ? GREEN : RED;
    ctx.fillRect(r.x + r.w / 2 + 1, r.y + 3, r.w / 2 - 4, r.h - 6);
    ctx.globalAlpha = scene.gridAlpha;
    ctx.strokeStyle = item.drawn ? BLUE : LINE;
    ctx.lineWidth = item.drawn ? 1.5 : 1;
    rounded(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = INK;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(item.index + 1), r.x + r.w / 2, r.y + r.h / 2 + 4);
    if (item.drawn > 1) {
      ctx.fillStyle = BLUE;
      ctx.font = `9px ${MONO}`;
      ctx.fillText(`x${item.drawn}`, r.x + r.w - 9, r.y + 10);
    }
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  const summaryY = GRID_Y + 5 * (CELL + GAP) + 10;
  ctx.fillText(`old right ${scene.oldRight} of ${scene.n} (${pct(scene.accuracy.old)})`, GRID_X, summaryY);
  ctx.fillText(`new right ${scene.newRight} of ${scene.n} (${pct(scene.accuracy.new)})`, GRID_X, summaryY + 16);
  ctx.fillText(`observed difference ${points(scene.accuracy.difference)} points`, GRID_X, summaryY + 32);

  // The current resample: its drawn indices as tiles, duplicates repeated.
  if (scene.current) {
    const c = scene.current;
    c.indices.forEach((index, position) => {
      const r = tileRect(position);
      const item = scene.items[index];
      ctx.fillStyle = PANEL;
      rounded(ctx, r.x, r.y, r.w, r.h, 3); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = itemColor(item);
      rounded(ctx, r.x, r.y, r.w, r.h, 3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = LINE;
      rounded(ctx, r.x, r.y, r.w, r.h, 3); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), r.x + r.w / 2, r.y + r.h / 2 + 4);
      ctx.textAlign = 'left';
    });
    if (c.scored) {
      const y = TILE_Y + 5 * (TILE_H + TILE_GAP) + 14;
      ctx.fillStyle = DIM;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(`old right ${c.old}   new right ${c.new}`, TILE_X, y);
      ctx.fillStyle = c.difference > 0 ? BLUE : c.difference < 0 ? RED : INK;
      ctx.font = `13px ${MONO}`;
      ctx.fillText(`difference ${points(c.difference)} points`, TILE_X, y + 20);
    }
  }
  if (scene.counter) {
    ctx.fillStyle = INK;
    ctx.font = `13px ${MONO}`;
    ctx.fillText(`resamples done: ${scene.counter.done} of ${scene.counter.total}`, TILE_X, TILE_Y + 60);
    ctx.fillStyle = DIM;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText('computed by the Python file', TILE_X, TILE_Y + 80);
  }
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('tiles: blue new only right, red old only right', TILE_X, TILE_Y + 5 * (TILE_H + TILE_GAP) + 66);

  // The histogram of differences, growing as resamples complete.
  const binW = HIST_W / scene.bins.length;
  const scale = HIST_MAX / Math.max(1, scene.maxCount);
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(HIST_X, HIST_BASE + 0.5);
  ctx.lineTo(HIST_X + HIST_W, HIST_BASE + 0.5);
  ctx.stroke();
  scene.bins.forEach((bin, index) => {
    const x = HIST_X + index * binW;
    const h = bin.count * scale;
    if (bin.count > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = BLUE;
      ctx.fillRect(x + 1, HIST_BASE - h, binW - 2, h);
      if (bin.points > 0 && scene.shadeAlpha > 0) {
        ctx.globalAlpha = 0.55 * scene.shadeAlpha;
        ctx.fillStyle = GREEN;
        ctx.fillRect(x + 1, HIST_BASE - h, binW - 2, h);
      }
      ctx.globalAlpha = 1;
    }
    if (bin.points % 8 === 0) {
      ctx.fillStyle = DIM;
      ctx.font = `9.5px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(bin.points), x + binW / 2, HIST_BASE + 13);
      ctx.textAlign = 'left';
    }
  });
  ctx.fillStyle = DIM;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(`${scene.completed} of ${scene.total} resamples`, HIST_X, HIST_BASE - HIST_MAX - 10);

  // The zero line and the interval bracket.
  const zeroIndex = scene.bins.findIndex((bin) => bin.points === 0);
  if (zeroIndex >= 0 && scene.intervalAlpha > 0) {
    const x = HIST_X + (zeroIndex + 0.5) * binW;
    ctx.save();
    ctx.globalAlpha = scene.intervalAlpha;
    ctx.strokeStyle = INK;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, HIST_BASE - HIST_MAX);
    ctx.lineTo(x, HIST_BASE + 22);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = scene.intervalAlpha;
    ctx.fillStyle = INK;
    ctx.font = `9.5px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('zero', x, HIST_BASE + 33);
    ctx.textAlign = 'left';
  }
  if (scene.intervalAlpha > 0) {
    const lowIndex = scene.bins.findIndex((bin) => bin.points === Math.round(scene.interval.low * 100));
    const highIndex = scene.bins.findIndex((bin) => bin.points === Math.round(scene.interval.high * 100));
    const x0 = HIST_X + (lowIndex + 0.5) * binW;
    const x1 = HIST_X + (highIndex + 0.5) * binW;
    const y = HIST_BASE + 46;
    ctx.globalAlpha = scene.intervalAlpha;
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y - 6); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 6);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = AMBER;
    ctx.font = `10.5px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`95% interval ${points(scene.interval.low)} to ${points(scene.interval.high)}`, (x0 + x1) / 2, y + 15);
    ctx.textAlign = 'left';
  }
  if (scene.shadeAlpha > 0) {
    ctx.globalAlpha = scene.shadeAlpha;
    ctx.fillStyle = GREEN;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(`above zero: ${scene.better} of ${scene.total} (${pct(scene.betterFraction)})`, HIST_X, HIST_BASE - HIST_MAX - 26);
  }
  ctx.globalAlpha = 1;
}
