import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live comparison. Both panels quicksort the SAME almost-sorted array,
// one comparison per step; the only difference is the pivot rule. The top
// panel samples first, middle, last and pivots on their median; the bottom
// panel pivots on the first element, which on nearly-ordered input is nearly
// the minimum, so every expensive sweep retires a single bar. Green bars are
// in their final position forever; the amber bar is the current pivot; the
// blue bar is the comparison happening right now. Counters use the same
// currency as the tested Python solution: comparisons.
const N = 96;
const BAR = 6;
const MARGIN = 14;
const LABEL_H = 18;
const GRID_H = 112;
const GAP = 18;
const W = MARGIN * 2 + N * BAR + 8;
const H = 8 + LABEL_H + GRID_H + GAP + LABEL_H + GRID_H + 12;
const SEED = 20260827;
const STEP_BUDGET = 8; // comparisons per tick per panel

function makeAlmostSorted(seed) {
  const rand = mulberry32(seed);
  const a = Array.from({ length: N }, (_, i) => i + 1);
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(rand() * N);
    const j = Math.floor(rand() * N);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function medianOfThree(a, lo, hi) {
  const mid = (lo + hi) >> 1;
  const x = a[lo];
  const y = a[mid];
  const z = a[hi];
  // The 2-3 comparisons this rule spends are charged in setup below.
  if (x < y) {
    if (y < z) return mid;
    return x < z ? hi : lo;
  }
  if (x < z) return lo;
  return y < z ? hi : mid;
}

// A comparison-granular Lomuto quicksort: one step() is one comparison, so
// the two panels advance in honest lockstep.
function makeSorter(values, useMedian, label) {
  return {
    label,
    a: values.slice(),
    stack: [[0, N - 1]],
    cur: null,
    final: new Uint8Array(N),
    work: 0,
    done: false,
    compareAt: -1,
    pivotAt: -1,
    step() {
      if (this.done) return;
      while (this.cur === null) {
        if (!this.stack.length) {
          this.done = true;
          this.compareAt = -1;
          this.pivotAt = -1;
          return;
        }
        const [lo, hi] = this.stack.pop();
        if (lo > hi) continue;
        if (lo === hi) {
          this.final[lo] = 1;
          continue;
        }
        let p = lo;
        if (useMedian && hi - lo >= 2) {
          p = medianOfThree(this.a, lo, hi);
          this.work += 3; // the insurance premium, charged honestly
        }
        [this.a[p], this.a[hi]] = [this.a[hi], this.a[p]];
        this.cur = { lo, hi, i: lo, j: lo };
        this.pivotAt = hi;
      }
      const c = this.cur;
      this.work += 1;
      this.compareAt = c.j;
      if (this.a[c.j] < this.a[c.hi]) {
        [this.a[c.i], this.a[c.j]] = [this.a[c.j], this.a[c.i]];
        c.i += 1;
      }
      c.j += 1;
      if (c.j === c.hi) {
        [this.a[c.i], this.a[c.hi]] = [this.a[c.hi], this.a[c.i]];
        this.final[c.i] = 1;
        this.stack.push([c.i + 1, c.hi]);
        this.stack.push([c.lo, c.i - 1]);
        this.cur = null;
        this.pivotAt = -1;
      }
    },
  };
}

function drawPanel(ctx, run, y0, colors) {
  const { algo, heur, path, dim } = colors;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  const status = run.done ? ' · done' : '';
  ctx.fillText(
    `${run.label} · comparisons ${run.work.toLocaleString()}${status}`,
    MARGIN,
    y0 + 12,
  );
  const base = y0 + LABEL_H + GRID_H;
  for (let i = 0; i < N; i++) {
    const h = (run.a[i] / N) * (GRID_H - 6);
    const x = MARGIN + i * BAR;
    if (run.final[i]) ctx.fillStyle = path;
    else if (i === run.pivotAt) ctx.fillStyle = heur;
    else if (i === run.compareAt) ctx.fillStyle = algo;
    else ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, base - h, BAR - 1, h);
  }
}

export default function QuicksortViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ median: 0, first: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ median: 0, first: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => {
        const values = makeAlmostSorted(SEED + cycle.current * 7919);
        return {
          median: makeSorter(values, true, 'median-of-three pivot'),
          first: makeSorter(values, false, 'first-element pivot'),
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.median.done && s.first.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const values = makeAlmostSorted(SEED + cycle.current * 7919);
            s.median = makeSorter(values, true, 'median-of-three pivot');
            s.first = makeSorter(values, false, 'first-element pivot');
            s.rest = 0;
          }
          return true;
        }
        for (let b = 0; b < STEP_BUDGET; b++) s.median.step();
        for (let b = 0; b < STEP_BUDGET; b++) s.first.step();
        statsRef.current = { median: s.median.work, first: s.first.work };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          path: css.getPropertyValue('--path').trim() || '#62d98a',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
        };
        drawPanel(ctx, s.median, 8, colors);
        drawPanel(ctx, s.first, 8 + LABEL_H + GRID_H + GAP, colors);
      },
    },
    [restart],
  );

  const ratio = snap.median > 0 ? (snap.first / snap.median).toFixed(1) : null;

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new almost-sorted array
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same array, same algorithm · the naive pivot has spent <strong>{ratio}×</strong> the comparisons</>
            : 'partitioning…'}
        </span>
      </div>
    </>
  );
}
