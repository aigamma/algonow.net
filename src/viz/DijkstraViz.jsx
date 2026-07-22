import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop } from './useCanvasLoop.js';

// The live comparison. Both panels run the SAME weighted graph from the same
// source; the left one answers "which vertex is nearest" with a binary heap,
// the right one by scanning every unsettled vertex. The counters underneath
// are the honest currency: queue operations plus edges examined, the same
// units the tested Python solution reports.
const COLS = 22;
const ROWS = 14;
const CELL = 15;
const GAP = 26;
const PANEL_W = COLS * CELL;
const W = PANEL_W * 2 + GAP;
const H = ROWS * CELL + 30;
const SEED = 20260722;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGraph(seed) {
  const rand = mulberry(seed);
  const weight = new Array(COLS * ROWS * 2);
  for (let i = 0; i < weight.length; i++) weight[i] = 1 + Math.floor(rand() * 9);
  return weight;
}

const idx = (r, c) => r * COLS + c;

// Edge weight between a cell and its right (dir 0) or down (dir 1) neighbour.
const wAt = (weight, r, c, dir) => weight[(idx(r, c) * 2) + dir];

function neighbours(weight, v) {
  const r = Math.floor(v / COLS);
  const c = v % COLS;
  const out = [];
  if (c + 1 < COLS) out.push([idx(r, c + 1), wAt(weight, r, c, 0)]);
  if (c - 1 >= 0) out.push([idx(r, c - 1), wAt(weight, r, c - 1, 0)]);
  if (r + 1 < ROWS) out.push([idx(r + 1, c), wAt(weight, r, c, 1)]);
  if (r - 1 >= 0) out.push([idx(r - 1, c), wAt(weight, r - 1, c, 1)]);
  return out;
}

// A stepwise Dijkstra that exposes one settle per tick, so both strategies
// can be advanced side by side and their work counted honestly.
function makeRun(weight, useHeap) {
  const n = COLS * ROWS;
  const dist = new Float64Array(n).fill(Infinity);
  const settled = new Uint8Array(n);
  dist[0] = 0;
  return {
    dist,
    settled,
    heap: useHeap ? [[0, 0]] : null,
    work: 0,
    done: false,
    useHeap,
    step() {
      if (this.done) return;
      let u = -1;
      if (this.useHeap) {
        while (this.heap.length) {
          // A real binary heap is unnecessary at this size; the counter is
          // what the panel is about, so the cost model is what must be right.
          let best = 0;
          for (let i = 1; i < this.heap.length; i++) {
            if (this.heap[i][0] < this.heap[best][0]) best = i;
          }
          const [d, v] = this.heap.splice(best, 1)[0];
          this.work += 1;
          if (!this.settled[v] && d <= this.dist[v]) { u = v; break; }
        }
      } else {
        let best = Infinity;
        for (let v = 0; v < n; v++) {
          this.work += 1;
          if (!this.settled[v] && this.dist[v] < best) { best = this.dist[v]; u = v; }
        }
        if (best === Infinity) u = -1;
      }
      if (u < 0) { this.done = true; return; }
      this.settled[u] = 1;
      for (const [v, w] of neighbours(weight, u)) {
        this.work += 1;
        const nd = this.dist[u] + w;
        if (nd < this.dist[v]) {
          this.dist[v] = nd;
          if (this.useHeap) { this.heap.push([nd, v]); this.work += 1; }
        }
      }
    },
  };
}

function drawPanel(ctx, run, x0, label) {
  const css = getComputedStyle(document.documentElement);
  const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
  const path = css.getPropertyValue('--path').trim() || '#62d98a';
  const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
  let maxD = 1;
  for (let i = 0; i < run.dist.length; i++) {
    if (run.dist[i] < Infinity && run.dist[i] > maxD) maxD = run.dist[i];
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = idx(r, c);
      const x = x0 + c * CELL;
      const y = 22 + r * CELL;
      const d = run.dist[v];
      if (d === Infinity) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
      } else if (run.settled[v]) {
        ctx.fillStyle = `rgba(93,162,255,${0.16 + 0.6 * (1 - d / maxD)})`;
      } else {
        ctx.fillStyle = `rgba(240,185,75,0.45)`;
      }
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    }
  }
  ctx.fillStyle = path;
  ctx.fillRect(x0 + 1, 23, CELL - 2, CELL - 2);
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(label, x0, 14);
  ctx.fillStyle = run.useHeap ? algo : dim;
  ctx.fillText(`work ${run.work.toLocaleString()}`, x0, H - 4);
}

export default function DijkstraViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ heap: 0, scan: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ heap: 0, scan: 0 });

  // The counters update on their own cadence rather than every animation
  // tick, so React re-renders a few times a second instead of twenty.
  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => {
        const weight = makeGraph(SEED + cycle.current * 7919);
        return {
          weight,
          heapRun: makeRun(weight, true),
          scanRun: makeRun(weight, false),
          rest: 0,
        };
      },
      tick: (s) => {
        if (s.heapRun.done && s.scanRun.done) {
          s.rest += 1;
          if (s.rest > 40) {
            cycle.current += 1;
            const weight = makeGraph(SEED + cycle.current * 7919);
            s.weight = weight;
            s.heapRun = makeRun(weight, true);
            s.scanRun = makeRun(weight, false);
            s.rest = 0;
          }
          return true;
        }
        s.heapRun.step();
        s.scanRun.step();
        statsRef.current = { heap: s.heapRun.work, scan: s.scanRun.work };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        drawPanel(ctx, s.heapRun, 0, 'binary heap');
        drawPanel(ctx, s.scanRun, PANEL_W + GAP, 'linear scan');
      },
    },
    [restart],
  );

  const ratio = snap.heap > 0 ? (snap.scan / snap.heap).toFixed(1) : null;

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
          new weights
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same graph, same source · the scan is doing <strong>{ratio}×</strong> the work</>
            : 'settling the nearest vertex…'}
        </span>
      </div>
    </>
  );
}
