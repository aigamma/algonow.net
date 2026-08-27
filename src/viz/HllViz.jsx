import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live sketch. Left: all 1,024 registers (a 32 x 32 grid), each cell's
// brightness its stored maximum zero-run; an amber flash is a register being
// raised right now. Right: the estimate as a fraction of the true count,
// drawn as the stream flows; the green band is the sketch's promised ±3.3%.
// The point to watch: the grid fills early then almost stops changing,
// because raising a maximum gets exponentially harder, yet the estimate
// stays pinned to the truth while holding 768 bytes, forever.
const P = 10;
const M = 1 << P; // 1,024 registers
const GRID = 32;
const CELL = 6;
const GRID_W = GRID * CELL; // 192
const MARGIN = 12;
const LABEL_H = 18;
const CHART_X = MARGIN + GRID_W + 24;
const CHART_W = 640 - CHART_X - MARGIN;
const CHART_H = GRID_W;
const W = 640;
const H = 8 + LABEL_H + GRID_W + 34;
const SEED = 20260827;
const TOTAL_TICKS = 300;
const ITEMS_PER_TICK = 120;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function makeSketch(salt) {
  return {
    reg: new Uint8Array(M),
    flashed: new Set(),
    salt,
    add(id) {
      const h = h32(id ^ this.salt);
      const idx = h >>> (32 - P);
      const rest = (h << P) >>> 0;
      const rho = rest === 0 ? 32 - P + 1 : Math.clz32(rest) + 1;
      if (rho > this.reg[idx]) {
        this.reg[idx] = rho;
        this.flashed.add(idx);
      }
    },
    estimate() {
      let sum = 0;
      let zeros = 0;
      for (let i = 0; i < M; i++) {
        sum += Math.pow(2, -this.reg[i]);
        if (this.reg[i] === 0) zeros += 1;
      }
      const alpha = 0.7213 / (1 + 1.079 / M);
      const e = (alpha * M * M) / sum;
      if (e <= 2.5 * M && zeros > 0) return M * Math.log(M / zeros);
      return e;
    },
  };
}

export default function HllViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ truth: 0, est: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ truth: 0, est: 0 });

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
        const salt = h32(SEED + cycle.current * 7919);
        return {
          sketch: makeSketch(salt),
          rand: mulberry32(salt),
          seen: 0,
          distinct: 0,
          trace: [],
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.tick >= TOTAL_TICKS) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const salt = h32(SEED + cycle.current * 7919);
            s.sketch = makeSketch(salt);
            s.rand = mulberry32(salt);
            s.seen = 0;
            s.distinct = 0;
            s.trace = [];
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.sketch.flashed.clear();
        for (let i = 0; i < ITEMS_PER_TICK; i++) {
          // A growing universe: about a third of arrivals are new ids, the
          // rest are repeats of earlier ones. The viz tracks truth exactly.
          let id;
          if (s.distinct === 0 || s.rand() < 0.34) {
            id = s.distinct;
            s.distinct += 1;
          } else {
            id = Math.floor(s.rand() * s.distinct);
          }
          s.sketch.add(id);
          s.seen += 1;
        }
        s.tick += 1;
        const est = s.sketch.estimate();
        s.trace.push(est / s.distinct);
        statsRef.current = { truth: s.distinct, est: Math.round(est) };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('1,024 registers · 768 bytes, forever', MARGIN, 8 + 11);
        const y0 = 8 + LABEL_H;
        for (let i = 0; i < M; i++) {
          const x = MARGIN + (i % GRID) * CELL;
          const y = y0 + Math.floor(i / GRID) * CELL;
          const v = s.sketch.reg[i];
          ctx.fillStyle = v
            ? `${algo}${Math.min(40 + v * 12, 230).toString(16).padStart(2, '0')}`
            : 'rgba(255,255,255,0.04)';
          ctx.fillRect(x, y, CELL - 1, CELL - 1);
        }
        ctx.strokeStyle = heur;
        ctx.lineWidth = 1.4;
        for (const idx of s.sketch.flashed) {
          const x = MARGIN + (idx % GRID) * CELL;
          const y = y0 + Math.floor(idx / GRID) * CELL;
          ctx.strokeRect(x - 0.5, y - 0.5, CELL, CELL);
        }

        ctx.fillStyle = dim;
        ctx.fillText('estimate ÷ truth, as the stream flows', CHART_X, 8 + 11);
        const bandTop = y0 + CHART_H * (0.5 - 0.033 / 0.3);
        const bandH = CHART_H * (0.066 / 0.3);
        ctx.fillStyle = `${path}22`;
        ctx.fillRect(CHART_X, bandTop, CHART_W, bandH);
        ctx.strokeStyle = dim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(CHART_X, y0 + CHART_H / 2);
        ctx.lineTo(CHART_X + CHART_W, y0 + CHART_H / 2);
        ctx.stroke();
        ctx.strokeStyle = algo;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        s.trace.forEach((ratio, i) => {
          const x = CHART_X + (i / TOTAL_TICKS) * CHART_W;
          // Map ratio 0.85..1.15 across the chart height.
          const y = y0 + CHART_H * (0.5 - (ratio - 1) / 0.3);
          const yc = Math.max(y0, Math.min(y0 + CHART_H, y));
          if (i === 0) ctx.moveTo(x, yc);
          else ctx.lineTo(x, yc);
        });
        ctx.stroke();
        ctx.fillStyle = dim;
        const { truth, est } = statsRef.current;
        if (truth > 0) {
          const off = ((est - truth) / truth) * 100;
          const sign = off >= 0 ? '+' : '';
          ctx.fillText(
            `true ${truth.toLocaleString()} · sketch says ${est.toLocaleString()} (${sign}${off.toFixed(1)}%)`,
            CHART_X,
            y0 + CHART_H + 16,
          );
        }
        ctx.fillStyle = `${path}`;
        ctx.fillText('±3.3% band', CHART_X + CHART_W - 78, bandTop - 4);
      },
    },
    [restart],
  );

  const off = snap.truth > 0 ? (((snap.est - snap.truth) / snap.truth) * 100).toFixed(1) : null;

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
          new stream
        </button>
        <span className="viz-stat">
          {off !== null
            ? <>the registers never grow · current miss: <strong>{off}%</strong></>
            : 'hashing the stream…'}
        </span>
      </div>
    </>
  );
}
