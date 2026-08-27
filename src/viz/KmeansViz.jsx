import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live comparison. The SAME twelve blobs are clustered in both panels
// with the SAME Lloyd's iteration; only the seeding differs. Left: k-means++
// D-squared seeds, one per blob almost every time. Right: uniform random
// seeds, which double up somewhere nearly every run, and the doubled blob
// splits while two other blobs fuse around one stranded center, a defect
// the descent can never repair. Crosses are centers; points wear their
// cluster's hue; the SSE counters are live.
const K = 12;
const PER = 30;
const N = K * PER;
const W = 640;
const PANEL_W = 296;
const PANEL_H = 220;
const H = 8 + 16 + PANEL_H + 34;
const SEED = 20260827;
const TICKS_PER_STEP = 10;

function makeBlobs(rand) {
  // 12 blob centers on a jittered 4x3 grid inside a panel.
  const centers = [];
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 3; gy++) {
      centers.push([
        34 + gx * 76 + (rand() - 0.5) * 18,
        36 + gy * 74 + (rand() - 0.5) * 16,
      ]);
    }
  }
  const pts = [];
  for (const [cx, cy] of centers) {
    for (let i = 0; i < PER; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.abs(rand() + rand() - 1) * 13;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

function seedRandom(pts, rand) {
  const idx = new Set();
  while (idx.size < K) idx.add(Math.floor(rand() * pts.length));
  return [...idx].map((i) => [...pts[i]]);
}

function seedPP(pts, rand) {
  const centers = [[...pts[Math.floor(rand() * pts.length)]]];
  const dist = pts.map((p) => d2(p, centers[0]));
  while (centers.length < K) {
    const total = dist.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let pick = pts.length - 1;
    for (let i = 0; i < pts.length; i++) {
      r -= dist[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centers.push([...pts[pick]]);
    for (let i = 0; i < pts.length; i++) {
      dist[i] = Math.min(dist[i], d2(pts[i], centers[centers.length - 1]));
    }
  }
  return centers;
}

function makeRun(pts, centers, label) {
  return {
    label,
    pts,
    centers: centers.map((c) => [...c]),
    assign: new Array(pts.length).fill(0),
    sse: 0,
    done: false,
    step() {
      if (this.done) return;
      let moved = false;
      let sse = 0;
      for (let i = 0; i < this.pts.length; i++) {
        let best = 0;
        let bd = Infinity;
        for (let c = 0; c < K; c++) {
          const d = d2(this.pts[i], this.centers[c]);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best !== this.assign[i]) moved = true;
        this.assign[i] = best;
        sse += bd;
      }
      this.sse = sse;
      const sums = Array.from({ length: K }, () => [0, 0, 0]);
      for (let i = 0; i < this.pts.length; i++) {
        const a = this.assign[i];
        sums[a][0] += this.pts[i][0];
        sums[a][1] += this.pts[i][1];
        sums[a][2] += 1;
      }
      for (let c = 0; c < K; c++) {
        if (sums[c][2]) {
          this.centers[c] = [sums[c][0] / sums[c][2], sums[c][1] / sums[c][2]];
        }
      }
      if (!moved) this.done = true;
    },
  };
}

const hue = (c) => `hsl(${(c * 137.5) % 360}, 62%, 62%)`;

function drawPanel(ctx, run, x0, colors) {
  const { dim, ink } = colors;
  ctx.fillStyle = dim;
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(
    `${run.label} · SSE ${Math.round(run.sse).toLocaleString()}${run.done ? ' · converged' : ''}`,
    x0,
    8 + 11,
  );
  const y0 = 8 + 16;
  for (let i = 0; i < run.pts.length; i++) {
    ctx.fillStyle = hue(run.assign[i]);
    ctx.fillRect(x0 + run.pts[i][0] - 1.2, y0 + run.pts[i][1] - 1.2, 2.4, 2.4);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  for (const [cx, cy] of run.centers) {
    ctx.beginPath();
    ctx.moveTo(x0 + cx - 5, y0 + cy);
    ctx.lineTo(x0 + cx + 5, y0 + cy);
    ctx.moveTo(x0 + cx, y0 + cy - 5);
    ctx.lineTo(x0 + cx, y0 + cy + 5);
    ctx.stroke();
  }
}

export default function KmeansViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ pp: 0, rand: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ pp: 0, rand: 0 });

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
        const rand = mulberry32(SEED + cycle.current * 7919);
        const pts = makeBlobs(rand);
        return {
          pp: makeRun(pts, seedPP(pts, rand), 'k-means++ seeds'),
          rand: makeRun(pts, seedRandom(pts, rand), 'random seeds'),
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.pp.done && s.rand.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const rand = mulberry32(SEED + cycle.current * 7919);
            const pts = makeBlobs(rand);
            Object.assign(s, {
              pp: makeRun(pts, seedPP(pts, rand), 'k-means++ seeds'),
              rand: makeRun(pts, seedRandom(pts, rand), 'random seeds'),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick % TICKS_PER_STEP === 0) {
          s.pp.step();
          s.rand.step();
          statsRef.current = { pp: s.pp.sse, rand: s.rand.sse };
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const colors = {
          dim: css.getPropertyValue('--ink-dim').trim() || '#9aa5bd',
          ink: css.getPropertyValue('--ink').trim() || '#e9edf6',
        };
        drawPanel(ctx, s.pp, 14, colors);
        drawPanel(ctx, s.rand, 14 + PANEL_W + 20, colors);
        ctx.fillStyle = colors.dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          'same blobs, same descent, different openings · a doubled seed is a defect the descent cannot repair',
          14,
          H - 10,
        );
      },
    },
    [restart],
  );

  const ratio = snap.pp > 0 ? (snap.rand / snap.pp).toFixed(2) : null;

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
          new blobs
        </button>
        <span className="viz-stat">
          {ratio
            ? <>same data, different openings · random seeding is carrying <strong>{ratio}×</strong> the error</>
            : 'opening the shops…'}
        </span>
      </div>
    </>
  );
}
