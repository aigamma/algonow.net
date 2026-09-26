import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two classes in the unit disk with a margin between them, and the
// perceptron's line moving only when it is wrong. Each tick advances the
// sweep to the next mistake: the offending point flashes amber, the
// weight vector gains y x, and the line (blue) jumps. A full pass with no
// mistake ends the run; the line turns green. The counter compares the
// mistakes made against the Novikoff bound (R / gamma)^2, computed from
// the widest-margin direction found by a sweep over 720 candidates.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 120;
const MARGINS = [0.4, 0.2, 0.1];

export function makeScene(seed, margin) {
  const rand = mulberry32(seed);
  const t = rand() * Math.PI * 2;
  const u = [Math.cos(t), Math.sin(t)];
  const X = [];
  const y = [];
  while (X.length < N) {
    const p = [rand() * 2 - 1, rand() * 2 - 1];
    if (p[0] * p[0] + p[1] * p[1] > 1) continue;
    const s = p[0] * u[0] + p[1] * u[1];
    if (Math.abs(s) < margin / 2) continue;
    X.push(p);
    y.push(s > 0 ? 1 : -1);
  }
  const order = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Independent max-margin sweep (lifted space, bias folded in).
  let gamma = 0;
  for (let k = 0; k < 720; k++) {
    const a = (2 * Math.PI * k) / 720;
    for (const c of [-0.8, -0.6, -0.4, -0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8]) {
      const norm = Math.sqrt(1 + c * c);
      const ux = Math.cos(a) / norm;
      const uy = Math.sin(a) / norm;
      const uc = c / norm;
      let g = Infinity;
      for (let i = 0; i < N; i++) g = Math.min(g, y[i] * (ux * X[i][0] + uy * X[i][1] + uc));
      if (g > gamma) gamma = g;
    }
  }
  const bound = gamma > 0 ? 2 / (gamma * gamma) : Infinity;
  return { X, y, order, margin, gamma, bound, w: [0, 0], b: 0, pos: 0, pass: 1, cleanRun: 0, mistakes: 0, last: null, done: false };
}

// Advance to the next mistake (or to convergence). Returns true when a
// full pass has gone by with no mistake.
export function sceneStep(sc) {
  for (let guard = 0; guard < 2 * N + 2; guard++) {
    if (sc.cleanRun >= N) {
      sc.done = true;
      sc.last = null;
      return true;
    }
    const i = sc.order[sc.pos];
    sc.pos += 1;
    if (sc.pos >= N) {
      sc.pos = 0;
      sc.pass += 1;
    }
    const x = sc.X[i];
    const pred = sc.w[0] * x[0] + sc.w[1] * x[1] + sc.b > 0 ? 1 : -1;
    if (pred !== sc.y[i]) {
      sc.w[0] += sc.y[i] * x[0];
      sc.w[1] += sc.y[i] * x[1];
      sc.b += sc.y[i];
      sc.mistakes += 1;
      sc.cleanRun = 0;
      sc.last = i;
      return false;
    }
    sc.cleanRun += 1;
  }
  return false;
}

export default function PerceptronViz() {
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
      stepMs: 220,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919, MARGINS[cycle.current % MARGINS.length]), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919, MARGINS[cycle.current % MARGINS.length]), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneStep(s.scene)) s.done = true;
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
        const cx = 150;
        const cy = 158;
        const rad = 128;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} points in the unit disk, margin ${sc.margin}; the line moves only on a mistake`, 12, 18);
        ctx.strokeStyle = `${dim}55`;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < N; i++) {
          const px = cx + sc.X[i][0] * rad;
          const py = cy - sc.X[i][1] * rad;
          const pred = sc.w[0] * sc.X[i][0] + sc.w[1] * sc.X[i][1] + sc.b > 0 ? 1 : -1;
          ctx.fillStyle = sc.y[i] > 0 ? algo : '#e2606c';
          ctx.beginPath();
          ctx.arc(px, py, 2.6, 0, Math.PI * 2);
          ctx.fill();
          if (pred !== sc.y[i] && (sc.w[0] !== 0 || sc.w[1] !== 0)) {
            ctx.strokeStyle = `${dim}aa`;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        if (sc.last !== null) {
          const px = cx + sc.X[sc.last][0] * rad;
          const py = cy - sc.X[sc.last][1] * rad;
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (sc.w[0] !== 0 || sc.w[1] !== 0) {
          // w . x + b = 0 clipped to the disk's bounding square
          const pts = [];
          const [a, bb] = sc.w;
          const c = sc.b;
          for (const xv of [-1.05, 1.05]) if (Math.abs(bb) > 1e-9) { const yv = -(a * xv + c) / bb; if (Math.abs(yv) <= 1.05) pts.push([xv, yv]); }
          for (const yv of [-1.05, 1.05]) if (Math.abs(a) > 1e-9) { const xv = -(bb * yv + c) / a; if (Math.abs(xv) < 1.05) pts.push([xv, yv]); }
          if (pts.length >= 2) {
            ctx.strokeStyle = s.done ? good : algo;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + pts[0][0] * rad, cy - pts[0][1] * rad);
            ctx.lineTo(cx + pts[1][0] * rad, cy - pts[1][1] * rad);
            ctx.stroke();
            ctx.lineWidth = 1;
          }
        }
        const tx = 310;
        ctx.fillStyle = ink;
        ctx.fillText(`mistakes so far: ${sc.mistakes}`, tx, 52);
        ctx.fillStyle = dim;
        ctx.fillText(`pass ${sc.pass}; clean run ${sc.cleanRun} of ${N}`, tx, 72);
        ctx.fillText(`max margin γ = ${sc.gamma.toFixed(3)} (independent sweep)`, tx, 100);
        ctx.fillText(`Novikoff bound (R/γ)² = ${Number.isFinite(sc.bound) ? sc.bound.toFixed(1) : '∞'} mistakes`, tx, 118);
        const barW = 300;
        const frac = Number.isFinite(sc.bound) ? Math.min(1, sc.mistakes / sc.bound) : 0;
        ctx.strokeStyle = `${dim}88`;
        ctx.strokeRect(tx, 132, barW, 14);
        ctx.fillStyle = algo;
        ctx.fillRect(tx, 132, barW * frac, 14);
        ctx.fillStyle = dim;
        ctx.fillText('mistakes as a share of the bound', tx, 162);
        ctx.fillStyle = heur;
        ctx.fillText('amber ring: the point that just moved the line;', tx, 192);
        ctx.fillText('every other point left the weights alone', tx, 208);
        ctx.fillStyle = dim;
        ctx.fillText('gray rings: points the current line still gets wrong', tx, 232);
        let line;
        if (s.done) {
          line = `separated after ${sc.mistakes} mistakes and ${sc.pass} passes; the bound allowed ${Number.isFinite(sc.bound) ? sc.bound.toFixed(0) : '∞'}`;
          ctx.fillStyle = good;
        } else {
          line = 'the final line is a sum of the points it got wrong; the bound says how many that can be';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          next margin
        </button>
        <span className="viz-stat">{snap.line || 'sweeping…'}</span>
      </div>
    </>
  );
}
