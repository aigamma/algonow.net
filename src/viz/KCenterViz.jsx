import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Farthest-first traversal on a seeded point set, two ticks per center: the
// point farthest from the chosen centers lights up amber, then becomes the
// next blue center and every nearest-center distance shrinks. The invariant
// checked every tick is that the highlighted point is the true farthest by an
// independent recomputation and that the radius never rose; at the end the
// radius is at most twice the exact optimum (brute force over subsets).
const W = 640;
const H = 300;
const SEED = 20261010;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function exactOpt(pts, k) {
  const n = pts.length;
  const D = pts.map((a) => pts.map((b) => dist(a, b)));
  let best = Infinity;
  const combo = [];
  const rec = (start) => {
    if (combo.length === k) {
      let worst = 0;
      for (let i = 0; i < n; i += 1) {
        let m = Infinity;
        for (const c of combo) if (D[i][c] < m) m = D[i][c];
        if (m > worst) {
          worst = m;
          if (worst >= best) return;
        }
      }
      best = worst;
      return;
    }
    for (let i = start; i <= n - (k - combo.length); i += 1) {
      combo.push(i);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return best;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 24 + Math.floor(rand() * 7); // 24 to 30 points
  const k = 4 + Math.floor(rand() * 2); // 4 or 5 centers
  const blobs = Array.from({ length: 2 + Math.floor(rand() * 3) }, () => [90 + rand() * 460, 80 + rand() * 150]);
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    if (rand() < 0.72) {
      const [cx, cy] = blobs[Math.floor(rand() * blobs.length)];
      const r = rand() * 50;
      const a = rand() * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    } else {
      pts.push([50 + rand() * 540, 60 + rand() * 190]);
    }
  }
  const start = Math.floor(rand() * n);
  const opt = exactOpt(pts, k);
  return {
    pts, k, centers: [start], d: pts.map((p) => dist(p, pts[start])), far: -1, phase: 'find', radii: [], opt, done: false, ok: true,
    last: `${n} points, k = ${k}; the first center is point ${start}; exact optimum radius ${opt.toFixed(1)}`,
  };
}

function farthestIndependently(sc) {
  let best = -1;
  let bd = -1;
  sc.pts.forEach((p, i) => {
    let m = Infinity;
    for (const c of sc.centers) {
      const e = dist(p, sc.pts[c]);
      if (e < m) m = e;
    }
    if (m > bd) {
      bd = m;
      best = i;
    }
  });
  return [best, bd];
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.phase === 'find') {
    const [far, r] = farthestIndependently(sc);
    const incremental = Math.max(...sc.d);
    sc.ok = sc.ok && Math.abs(incremental - r) < 1e-9 && (sc.radii.length === 0 || r <= sc.radii[sc.radii.length - 1] + 1e-9);
    sc.radii.push(r);
    sc.far = far;
    if (sc.centers.length === sc.k) {
      sc.ok = sc.ok && r <= 2 * sc.opt + 1e-9;
      sc.done = true;
      sc.last = `done: ${sc.k} centers, radius ${r.toFixed(1)} against exact optimum ${sc.opt.toFixed(1)} (ratio ${(r / sc.opt).toFixed(2)}, bound 2.00); every pick was the true farthest point: ${sc.ok ? 'yes' : 'NO'}`;
      return true;
    }
    sc.phase = 'open';
    sc.last = `point ${far} is farthest from the ${sc.centers.length} center${sc.centers.length > 1 ? 's' : ''} at ${r.toFixed(1)}: it becomes center ${sc.centers.length + 1}`;
    return false;
  }
  sc.centers.push(sc.far);
  sc.pts.forEach((p, i) => {
    const e = dist(p, sc.pts[sc.far]);
    if (e < sc.d[i]) sc.d[i] = e;
  });
  sc.far = -1;
  sc.phase = 'find';
  sc.last = `center ${sc.centers.length} of ${sc.k} opened; radius now ${Math.max(...sc.d).toFixed(1)}`;
  return false;
}

export default function KCenterViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
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
        const r = Math.max(...sc.d);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('farthest-first: the amber point is farthest from the blue centers and becomes the next one; circles show the radius', 12, 18);
        sc.centers.forEach((c) => {
          ctx.beginPath();
          ctx.arc(sc.pts[c][0], sc.pts[c][1], r, 0, Math.PI * 2);
          ctx.strokeStyle = `${algo}55`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        sc.pts.forEach((p, i) => {
          const isC = sc.centers.includes(i);
          ctx.beginPath();
          ctx.arc(p[0], p[1], isC ? 7 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isC ? algo : i === sc.far ? heur : `${dim}bb`;
          ctx.fill();
        });
        if (sc.far >= 0) {
          const p = sc.pts[sc.far];
          ctx.strokeStyle = s.done ? warn : heur;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = dim;
        ctx.fillText(`centers ${sc.centers.length} of ${sc.k}; radius ${r.toFixed(1)}; exact optimum ${sc.opt.toFixed(1)}; bound 2 x OPT = ${(2 * sc.opt).toFixed(1)}`, 12, 44);
        ctx.fillText('the file: 1.285 x OPT mean, 1.922 worst on 230 exact instances; exactly 2.000 on the tight family', 12, 60);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every pick was the true farthest point; the radius never rose' : 'INVARIANT BROKEN', 12, 76);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new points
        </button>
        <span className="viz-stat">{snap.line || 'placing centers…'}</span>
      </div>
    </>
  );
}
