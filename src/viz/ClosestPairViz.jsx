import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One level of the recursion, watched. Forty points split at the median
// x; each half's best pair is circled blue with its delta; the strip
// (±delta of the midline) lights amber and everything outside dims; the
// y-ordered strip scan draws its few candidate checks (the counter
// tracks the lemma's ≤ 7); and the true closest pair, planted to
// straddle the midline, comes up green: the pair both halves missed.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 40;
const PHASES = [12, 16, 34, 20, 0, 60]; // appear, midline, halves, strip, scan (dynamic), verdict

function bruteBest(pts) {
  let best = Infinity;
  let pair = null;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < best) {
        best = d;
        pair = [pts[i], pts[j]];
      }
    }
  }
  return { best, pair };
}

function makeScene(seed) {
  // Retry seeds until the planted straddling pair truly is the global
  // winner AND falls inside the strip: the caption must never lie.
  for (let attempt = 0; attempt < 80; attempt++) {
    const scene = buildScene(seed + attempt * 977);
    const [p, q] = scene.bestPair;
    const planted = scene.planted;
    const isPlanted =
      (p === planted[0] && q === planted[1]) || (p === planted[1] && q === planted[0]);
    if (isPlanted) return scene;
  }
  return buildScene(seed);
}

function buildScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < N - 2; i++) {
    pts.push([4 + rand() * 92, 6 + rand() * 82]);
  }
  const xs = pts.map((p) => p[0]).sort((a, b) => a - b);
  const midx = xs[Math.floor(xs.length / 2)];
  // Plant the winner straddling the midline, closer than anything else.
  const py = 12 + rand() * 70;
  pts.push([midx - 0.4, py], [midx + 0.4, py + 0.3]);
  const planted = [pts[pts.length - 2], pts[pts.length - 1]];
  const left = pts.filter((p) => p[0] < midx);
  const right = pts.filter((p) => p[0] >= midx);
  const L = bruteBest(left);
  const R = bruteBest(right);
  const delta = Math.min(L.best, R.best);
  const strip = pts
    .filter((p) => Math.abs(p[0] - midx) < delta)
    .sort((a, b) => a[1] - b[1]);
  const checks = [];
  let best = delta;
  let bestPair = L.best <= R.best ? L.pair : R.pair;
  let maxPerPoint = 0;
  for (let i = 0; i < strip.length; i++) {
    let c = 0;
    for (let j = i + 1; j < strip.length && strip[j][1] - strip[i][1] < best; j++) {
      const d = Math.hypot(strip[i][0] - strip[j][0], strip[i][1] - strip[j][1]);
      c += 1;
      const win = d < best;
      checks.push({ a: strip[i], b: strip[j], win });
      if (win) {
        best = d;
        bestPair = [strip[i], strip[j]];
      }
    }
    maxPerPoint = Math.max(maxPerPoint, c);
  }
  return { pts, midx, L, R, delta, strip, checks, best, bestPair, maxPerPoint, planted };
}

export default function ClosestPairViz() {
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
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const scanTicks = s.scene.checks.length * 8 + 8;
        const total =
          PHASES[0] + PHASES[1] + PHASES[2] + PHASES[3] + scanTicks + PHASES[5];
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const scanTicks = sc.checks.length * 8 + 8;
        const bounds = [
          PHASES[0],
          PHASES[0] + PHASES[1],
          PHASES[0] + PHASES[1] + PHASES[2],
          PHASES[0] + PHASES[1] + PHASES[2] + PHASES[3],
          PHASES[0] + PHASES[1] + PHASES[2] + PHASES[3] + scanTicks,
        ];
        const t = s.tick;
        const phase = bounds.findIndex((b) => t < b);
        const ph = phase === -1 ? 5 : phase;

        const X = (v) => 20 + (v / 100) * (W - 40);
        const Y = (v) => 26 + (v / 94) * (H - 66);
        const scale = (W - 40) / 100;

        // Strip band.
        if (ph >= 3) {
          ctx.fillStyle = 'rgba(240,185,75,0.08)';
          ctx.fillRect(X(sc.midx - sc.delta), 20, 2 * sc.delta * scale, H - 56);
          ctx.strokeStyle = `${heur}66`;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(X(sc.midx - sc.delta), 20, 2 * sc.delta * scale, H - 56);
          ctx.setLineDash([]);
        }
        // Midline.
        if (ph >= 1) {
          ctx.strokeStyle = algo;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(X(sc.midx), 20);
          ctx.lineTo(X(sc.midx), H - 36);
          ctx.stroke();
        }

        // Points.
        const inStrip = new Set(sc.strip.map((p) => p.join(',')));
        sc.pts.forEach((p) => {
          const dimmed = ph >= 3 && ph < 5 && !inStrip.has(p.join(','));
          ctx.globalAlpha = dimmed ? 0.2 : 1;
          ctx.fillStyle = algo;
          ctx.beginPath();
          ctx.arc(X(p[0]), Y(p[1]), 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Half winners.
        if (ph >= 2 && ph < 5) {
          for (const side of [sc.L, sc.R]) {
            if (!side.pair) continue;
            ctx.strokeStyle = `${algo}cc`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(X(side.pair[0][0]), Y(side.pair[0][1]));
            ctx.lineTo(X(side.pair[1][0]), Y(side.pair[1][1]));
            ctx.stroke();
          }
        }

        // Strip scan.
        if (ph === 4) {
          const upTo = Math.min(Math.floor((t - bounds[3]) / 8) + 1, sc.checks.length);
          for (let i = 0; i < upTo; i++) {
            const c = sc.checks[i];
            ctx.strokeStyle = c.win ? good : `${heur}88`;
            ctx.lineWidth = c.win ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(X(c.a[0]), Y(c.a[1]));
            ctx.lineTo(X(c.b[0]), Y(c.b[1]));
            ctx.stroke();
          }
        }
        // Verdict.
        if (ph >= 5) {
          ctx.strokeStyle = good;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(X(sc.bestPair[0][0]), Y(sc.bestPair[0][1]));
          ctx.lineTo(X(sc.bestPair[1][0]), Y(sc.bestPair[1][1]));
          ctx.stroke();
          const mx = (X(sc.bestPair[0][0]) + X(sc.bestPair[1][0])) / 2;
          const my = (Y(sc.bestPair[0][1]) + Y(sc.bestPair[1][1])) / 2;
          ctx.strokeStyle = `${good}88`;
          ctx.beginPath();
          ctx.arc(mx, my, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        const labels = [
          'the points arrive',
          'split at the median x',
          'each half reports its best pair: δ = the better one',
          'only the strip (±δ of the line) can hide a better pair',
          `scan the strip in y order: ${sc.checks.length} checks, max ${sc.maxPerPoint}/point (lemma allows 7)`,
          `the planted straddling pair wins: the strip found what both halves missed`,
        ];
        ctx.fillText(labels[ph], 14, 16);
        ctx.fillStyle = ink;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          `n = ${N} · brute force would make ${(N * (N - 1)) / 2} checks`,
          14,
          H - 8,
        );

        statsRef.current = {
          line: ph >= 5 ? labels[5] : labels[ph],
        };
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
          new field
        </button>
        <span className="viz-stat">
          {snap.line || 'scattering mushrooms…'}
        </span>
      </div>
    </>
  );
}
