import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two 60-sample series: a shape, and the same shape under a random
// smooth time warp with noise. The cost grid is filled ten rows per
// tick inside a Sakoe-Chiba band (amber), then the cheapest monotone
// path is traced back (green). The Euclidean pairing is the diagonal
// (red): it compares sample i with sample i and pays for every
// timing difference. The true warp, which the generator knows, is
// drawn dashed so the recovered path can be checked against it.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 60;
const WINDOW = 8;
const ROWS_PER_TICK = 6;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function shape(kind, t) {
  if (kind === 0) return Math.exp(-(((t - 0.5) / 0.08) ** 2));
  if (kind === 1) return Math.exp(-(((t - 0.3) / 0.06) ** 2)) + Math.exp(-(((t - 0.7) / 0.06) ** 2));
  if (kind === 2) return t > 0.3 && t < 0.7 ? 1 : 0;
  return 1 - Math.abs(2 * t - 1);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const kind = Math.floor(rand() * 4);
  const a = Array.from({ length: N }, (_, i) => shape(kind, i / (N - 1)));
  let logv = 0;
  const speeds = [];
  for (let i = 0; i < N; i++) {
    logv = Math.max(-1.4, Math.min(1.4, logv + gauss(rand) * 0.15));
    speeds.push(Math.exp(logv));
  }
  const cum = [0];
  for (const s of speeds) cum.push(cum[cum.length - 1] + s);
  const tmap = cum.slice(0, N).map((c) => c / cum[N]);
  const b = tmap.map((u) => shape(kind, u) + gauss(rand) * 0.04);
  const INF = Infinity;
  const cost = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(INF));
  cost[0][0] = 0;
  let euclid = 0;
  for (let i = 0; i < N; i++) euclid += (a[i] - b[i]) ** 2;
  return { kind, a, b, tmap, cost, row: 1, path: null, dist: null, euclid: Math.sqrt(euclid), cells: 0, done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.row <= N) {
    const end = Math.min(N, sc.row + ROWS_PER_TICK - 1);
    for (let i = sc.row; i <= end; i++) {
      const lo = Math.max(1, i - WINDOW);
      const hi = Math.min(N, i + WINDOW);
      for (let j = lo; j <= hi; j++) {
        sc.cells += 1;
        const d = (sc.a[i - 1] - sc.b[j - 1]) ** 2;
        sc.cost[i][j] = d + Math.min(sc.cost[i - 1][j], sc.cost[i][j - 1], sc.cost[i - 1][j - 1]);
      }
    }
    sc.row = end + 1;
    return false;
  }
  let i = N;
  let j = N;
  const path = [];
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);
    const c = Math.min(sc.cost[i - 1][j - 1], sc.cost[i - 1][j], sc.cost[i][j - 1]);
    if (c === sc.cost[i - 1][j - 1]) {
      i -= 1;
      j -= 1;
    } else if (c === sc.cost[i - 1][j]) i -= 1;
    else j -= 1;
  }
  path.reverse();
  sc.path = path;
  sc.dist = Math.sqrt(sc.cost[N][N]);
  sc.done = true;
  return true;
}

export function pathError(sc) {
  let sum = 0;
  let worst = 0;
  for (const [i, j] of sc.path) {
    const e = Math.abs(i - sc.tmap[j] * (N - 1));
    sum += e;
    worst = Math.max(worst, e);
  }
  return { mean: sum / sc.path.length, worst };
}

export default function DtwViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 380,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`two ${N}-sample series, one a random time warp of the other; the grid fills ${ROWS_PER_TICK} rows per tick inside a band of ±${WINDOW}`, 12, 18);
        // the grid
        const gx = 40;
        const gy = 40;
        const cell = 3.6;
        const size = N * cell;
        ctx.fillStyle = `${heur}18`;
        for (let i = 0; i < N; i++) {
          const lo = Math.max(0, i - WINDOW);
          const hi = Math.min(N - 1, i + WINDOW);
          ctx.fillRect(gx + lo * cell, gy + i * cell, (hi - lo + 1) * cell, cell);
        }
        let maxc = 0;
        for (let i = 1; i < sc.row && i <= N; i++) for (let j = 1; j <= N; j++) if (sc.cost[i][j] < Infinity) maxc = Math.max(maxc, sc.cost[i][j]);
        for (let i = 1; i < sc.row && i <= N; i++) {
          for (let j = 1; j <= N; j++) {
            const c = sc.cost[i][j];
            if (c === Infinity) continue;
            const v = maxc > 0 ? c / maxc : 0;
            ctx.fillStyle = `rgba(93, 162, 255, ${0.15 + 0.7 * (1 - v)})`;
            ctx.fillRect(gx + (j - 1) * cell, gy + (i - 1) * cell, cell, cell);
          }
        }
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(gx, gy, size, size);
        // the true warp, dashed
        ctx.strokeStyle = `${ink}88`;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        sc.tmap.forEach((u, j) => {
          const x = gx + (j + 0.5) * cell;
          const y = gy + (u * (N - 1) + 0.5) * cell;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        // the diagonal
        ctx.strokeStyle = `${warn}aa`;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + size, gy + size);
        ctx.stroke();
        if (sc.path) {
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.beginPath();
          sc.path.forEach(([i, j], k) => {
            const x = gx + (j + 0.5) * cell;
            const y = gy + (i + 0.5) * cell;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        // the two series on the right
        const sx = 290;
        const sw = 330;
        const plot = (series, y0, color) => {
          ctx.strokeStyle = color;
          ctx.beginPath();
          series.forEach((v, i) => {
            const x = sx + (i / (N - 1)) * sw;
            const y = y0 - v * 40;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };
        plot(sc.a, 95, algo);
        plot(sc.b, 175, heur);
        ctx.fillStyle = algo;
        ctx.fillText('series A (the shape)', sx, 48);
        ctx.fillStyle = heur;
        ctx.fillText('series B (warped, noisy)', sx, 128);
        if (sc.path) {
          ctx.strokeStyle = `${good}66`;
          for (let k = 0; k < sc.path.length; k += 3) {
            const [i, j] = sc.path[k];
            ctx.beginPath();
            ctx.moveTo(sx + (i / (N - 1)) * sw, 95 - sc.a[i] * 40);
            ctx.lineTo(sx + (j / (N - 1)) * sw, 175 - sc.b[j] * 40);
            ctx.stroke();
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText('grid: cost so far (brighter is cheaper); amber band; red diagonal = Euclidean pairing', 12, 268);
        ctx.fillText('dashed: the true warp the generator used; green: the recovered path', 12, 284);
        let line;
        if (s.done) {
          const { mean, worst } = pathError(sc);
          line = `DTW ${sc.dist.toFixed(2)} vs Euclidean ${sc.euclid.toFixed(2)}; the path tracks the true warp within ${mean.toFixed(1)} samples on average (worst ${worst.toFixed(0)}); ${sc.cells.toLocaleString()} cells of ${N * N}`;
          ctx.fillStyle = good;
        } else {
          line = `filling row ${Math.min(sc.row, N)} of ${N}: each cell is the local cost plus the cheapest of its three predecessors`;
          ctx.fillStyle = ink;
        }
        ctx.fillStyle = s.done ? good : ink;
        ctx.fillText(line, sx, 230);
        statsRef.current = { line };
      },
    },
    [restart],
  );

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
          new warp
        </button>
        <span className="viz-stat">{snap.line || 'aligning…'}</span>
      </div>
    </>
  );
}
