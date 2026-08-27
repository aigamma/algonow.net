import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live comparison. Both panels attack the SAME 100-bar array at the SAME
// pace, eight operations per tick. The top panel is Kadane's single pass:
// the amber band is the current run (watch it restart, with a red flash,
// whenever its sum goes negative), the green underline is the best interval
// so far. The bottom panel is brute force trying every window: the blue band
// crawls through all 5,050 of them. Both end on the identical green answer;
// one of them ends fifty times sooner.
const N = 100;
const BAR = 6;
const MARGIN = 14;
const LABEL_H = 18;
const GRID_H = 96;
const GAP = 18;
const W = MARGIN * 2 + N * BAR + 4;
const H = 8 + LABEL_H + GRID_H + GAP + LABEL_H + GRID_H + 12;
const SEED = 20260827;
const STEP_BUDGET = 8;

function makeValues(seed) {
  const rand = mulberry32(seed);
  return Array.from({ length: N }, () => Math.round((rand() * 2 - 1) * 9));
}

function makeKadane(values) {
  return {
    label: 'Kadane · one pass',
    idx: 0,
    run: 0,
    runStart: 0,
    best: -Infinity,
    bi: 0,
    bj: 0,
    ops: 0,
    resetAt: -1,
    resetTtl: 0,
    done: false,
    step() {
      if (this.done) return;
      const x = values[this.idx];
      this.ops += 1;
      if (this.idx === 0 || this.run <= 0) {
        if (this.idx > 0 && this.run <= 0) {
          this.resetAt = this.idx;
          this.resetTtl = 14;
        }
        this.run = x;
        this.runStart = this.idx;
      } else {
        this.run += x;
      }
      if (this.run > this.best) {
        this.best = this.run;
        this.bi = this.runStart;
        this.bj = this.idx;
      }
      this.idx += 1;
      if (this.idx >= N) this.done = true;
    },
  };
}

function makeBrute(values) {
  return {
    label: 'brute force · every window',
    i: 0,
    j: 0,
    running: 0,
    best: -Infinity,
    bi: 0,
    bj: 0,
    ops: 0,
    total: (N * (N + 1)) / 2,
    done: false,
    step() {
      if (this.done) return;
      if (this.j === this.i) this.running = values[this.j];
      else this.running += values[this.j];
      this.ops += 1;
      if (this.running > this.best) {
        this.best = this.running;
        this.bi = this.i;
        this.bj = this.j;
      }
      this.j += 1;
      if (this.j >= N) {
        this.i += 1;
        this.j = this.i;
        if (this.i >= N) this.done = true;
      }
    },
  };
}

function drawPanel(ctx, run, values, y0, colors, kind) {
  const { algo, heur, warn, path, dim } = colors;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  const pct = kind === 'brute' ? ` (${Math.round((run.ops / run.total) * 100)}%)` : '';
  const best = run.best === -Infinity ? '…' : (run.best > 0 ? `+${run.best}` : `${run.best}`);
  ctx.fillText(
    `${run.label} · ops ${run.ops.toLocaleString()}${pct} · best ${best}${run.done ? ' · done' : ''}`,
    MARGIN,
    y0 + 12,
  );
  const mid = y0 + LABEL_H + GRID_H / 2;
  // The active band behind the bars: amber current run, blue current window.
  const band = (a, b, color) => {
    ctx.fillStyle = `${color}26`;
    ctx.fillRect(MARGIN + a * BAR, y0 + LABEL_H, (b - a + 1) * BAR, GRID_H);
  };
  if (!run.done) {
    if (kind === 'kadane' && run.idx > 0) band(run.runStart, Math.min(run.idx, N - 1), heur);
    if (kind === 'brute') band(run.i, Math.min(run.j, N - 1), algo);
  }
  for (let k = 0; k < N; k++) {
    const v = values[k];
    const h = (Math.abs(v) / 9) * (GRID_H / 2 - 4);
    ctx.fillStyle = v >= 0 ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(MARGIN + k * BAR, v >= 0 ? mid - h : mid, BAR - 1, Math.max(h, 1));
  }
  ctx.strokeStyle = dim;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(MARGIN, mid);
  ctx.lineTo(MARGIN + N * BAR, mid);
  ctx.stroke();
  if (run.best !== -Infinity) {
    ctx.fillStyle = path;
    ctx.fillRect(MARGIN + run.bi * BAR, y0 + LABEL_H + GRID_H - 3, (run.bj - run.bi + 1) * BAR - 1, 3);
  }
  if (kind === 'kadane' && run.resetTtl > 0) {
    ctx.strokeStyle = warn;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(MARGIN + run.resetAt * BAR - 1, y0 + LABEL_H - 1, BAR + 1, GRID_H + 2);
    run.resetTtl -= 1;
  }
}

export default function KadaneViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ k: 0, b: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ k: 0, b: 0 });

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
        const values = makeValues(SEED + cycle.current * 7919);
        return {
          values,
          kadane: makeKadane(values),
          brute: makeBrute(values),
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.kadane.done && s.brute.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const values = makeValues(SEED + cycle.current * 7919);
            s.values = values;
            s.kadane = makeKadane(values);
            s.brute = makeBrute(values);
            s.rest = 0;
          }
          return true;
        }
        for (let b = 0; b < STEP_BUDGET; b++) s.kadane.step();
        for (let b = 0; b < STEP_BUDGET; b++) s.brute.step();
        statsRef.current = { k: s.kadane.ops, b: s.brute.ops };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          algo: css.getPropertyValue('--algo').trim() || '#5da2ff',
          heur: css.getPropertyValue('--heur').trim() || '#f0b94b',
          warn: css.getPropertyValue('--warn').trim() || '#e06767',
          path: css.getPropertyValue('--path').trim() || '#62d98a',
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
        };
        drawPanel(ctx, s.kadane, s.values, 8, colors, 'kadane');
        drawPanel(ctx, s.brute, s.values, 8 + LABEL_H + GRID_H + GAP, colors, 'brute');
      },
    },
    [restart],
  );

  const ratio = snap.k > 0 ? (snap.b / snap.k).toFixed(1) : null;

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
          new array
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same array, same pace · brute force has spent <strong>{ratio}×</strong> the operations</>
            : 'scanning…'}
        </span>
      </div>
    </>
  );
}
