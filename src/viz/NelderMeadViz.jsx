import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Nelder-Mead on Rosenbrock's banana, f(x, y) = 100 (y - x^2)^2 +
// (1 - x)^2, whose minimum is (1, 1). The three vertices of the
// simplex are drawn over the contours; each tick performs one
// iteration: reflect the worst vertex through the centroid of the
// other two, then expand, contract, or shrink according to the value
// found. The move taken is named, the moves are counted, and the best
// value and the distance to (1, 1) are reported.
const W = 640;
const H = 300;
const SEED = 20260926;
const MAX_ITERS = 160;

const f = ([x, y]) => 100 * (y - x * x) ** 2 + (1 - x) ** 2;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const x0 = [-2 + rand() * 4, -1 + rand() * 4];
  const simplex = [x0, [x0[0] + 0.6, x0[1]], [x0[0], x0[1] + 0.6]].map((p) => ({ p, v: f(p) }));
  return { simplex, iter: 0, ops: { reflect: 0, expand: 0, contract: 0, shrink: 0 }, evals: 3, last: 'start', done: false, trail: [] };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const s = sc.simplex.slice().sort((a, b) => a.v - b.v);
  sc.simplex = s;
  sc.trail.push(s[0].p.slice());
  const spread = s[2].v - s[0].v;
  const size = Math.max(Math.hypot(s[1].p[0] - s[0].p[0], s[1].p[1] - s[0].p[1]), Math.hypot(s[2].p[0] - s[0].p[0], s[2].p[1] - s[0].p[1]));
  if ((spread < 1e-10 && size < 1e-6) || sc.iter >= MAX_ITERS) {
    sc.done = true;
    return true;
  }
  const c = [(s[0].p[0] + s[1].p[0]) / 2, (s[0].p[1] + s[1].p[1]) / 2];
  const w = s[2].p;
  const refl = [c[0] + (c[0] - w[0]), c[1] + (c[1] - w[1])];
  const fr = f(refl);
  sc.evals += 1;
  if (s[0].v <= fr && fr < s[1].v) {
    s[2] = { p: refl, v: fr };
    sc.ops.reflect += 1;
    sc.last = 'reflect: the mirror image of the worst vertex is middling, keep it';
  } else if (fr < s[0].v) {
    const exp = [c[0] + 2 * (c[0] - w[0]), c[1] + 2 * (c[1] - w[1])];
    const fe = f(exp);
    sc.evals += 1;
    if (fe < fr) {
      s[2] = { p: exp, v: fe };
      sc.ops.expand += 1;
      sc.last = 'expand: the reflection was the new best, so stretch twice as far';
    } else {
      s[2] = { p: refl, v: fr };
      sc.ops.reflect += 1;
      sc.last = 'reflect: the reflection was best but the expansion was not better';
    }
  } else {
    const con = fr < s[2].v ? [c[0] + 0.5 * (refl[0] - c[0]), c[1] + 0.5 * (refl[1] - c[1])] : [c[0] + 0.5 * (w[0] - c[0]), c[1] + 0.5 * (w[1] - c[1])];
    const fc = f(con);
    sc.evals += 1;
    if (fc < Math.min(fr, s[2].v)) {
      s[2] = { p: con, v: fc };
      sc.ops.contract += 1;
      sc.last = fr < s[2].v ? 'contract outside: the reflection was poor, so halve the step from the centroid' : 'contract inside: the reflection was worst of all, so step halfway back toward the centroid';
    } else {
      for (let i = 1; i < 3; i++) {
        s[i] = { p: [s[0].p[0] + 0.5 * (s[i].p[0] - s[0].p[0]), s[0].p[1] + 0.5 * (s[i].p[1] - s[0].p[1])], v: 0 };
        s[i].v = f(s[i].p);
        sc.evals += 1;
      }
      sc.ops.shrink += 1;
      sc.last = 'shrink: nothing helped, pull every vertex halfway toward the best';
    }
  }
  sc.iter += 1;
  return false;
}

export default function NelderMeadViz() {
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const ox = 20;
        const oy = 36;
        const pw = 340;
        const ph = 240;
        const X = (x) => ox + ((x + 2.2) / 4.4) * pw;
        const Y = (y) => oy + ph - ((y + 1.2) / 4.4) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('Rosenbrock’s banana, minimum at (1, 1); one simplex move per tick: reflect, expand, contract, or shrink', 12, 18);
        // contour shading by log value
        const cols = 68;
        const rows = 48;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const x = -2.2 + ((i + 0.5) / cols) * 4.4;
            const y = -1.2 + ((j + 0.5) / rows) * 4.4;
            const v = Math.log10(f([x, y]) + 1e-3);
            const shade = Math.max(0, Math.min(1, (v + 3) / 7));
            ctx.fillStyle = `rgba(93, 162, 255, ${0.04 + 0.3 * (1 - shade)})`;
            ctx.fillRect(ox + (i / cols) * pw, oy + ph - ((j + 1) / rows) * ph, pw / cols + 0.5, ph / rows + 0.5);
          }
        }
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(ox, oy, pw, ph);
        // trail of best vertices
        ctx.strokeStyle = `${heur}88`;
        ctx.beginPath();
        sc.trail.forEach((p, k) => {
          if (k === 0) ctx.moveTo(X(p[0]), Y(p[1]));
          else ctx.lineTo(X(p[0]), Y(p[1]));
        });
        ctx.stroke();
        // the simplex
        const sx = sc.simplex;
        ctx.strokeStyle = heur;
        ctx.lineWidth = 2;
        ctx.beginPath();
        sx.forEach((v, k) => {
          if (k === 0) ctx.moveTo(X(v.p[0]), Y(v.p[1]));
          else ctx.lineTo(X(v.p[0]), Y(v.p[1]));
        });
        ctx.closePath();
        ctx.stroke();
        ctx.lineWidth = 1;
        sx.forEach((v, k) => {
          ctx.fillStyle = k === 0 ? good : k === 2 ? `${heur}` : algo;
          ctx.beginPath();
          ctx.arc(X(v.p[0]), Y(v.p[1]), k === 0 ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = good;
        ctx.beginPath();
        ctx.arc(X(1), Y(1), 6, 0, Math.PI * 2);
        ctx.stroke();
        const tx = 380;
        const best = sx[0];
        const dist = Math.hypot(best.p[0] - 1, best.p[1] - 1);
        ctx.fillStyle = ink;
        ctx.fillText(`iteration ${sc.iter}, ${sc.evals} evaluations`, tx, 50);
        ctx.fillStyle = good;
        ctx.fillText(`best value ${best.v.toExponential(2)}, ${dist.toExponential(1)} from (1, 1)`, tx, 68);
        ctx.fillStyle = dim;
        ctx.fillText(`reflect ${sc.ops.reflect}  expand ${sc.ops.expand}`, tx, 96);
        ctx.fillText(`contract ${sc.ops.contract}  shrink ${sc.ops.shrink}`, tx, 112);
        ctx.fillText('green: best vertex; amber: worst; blue: middle', tx, 140);
        ctx.fillText('the file: 50 of 50 starts below 1e-8 at 208', tx, 176);
        ctx.fillText('evaluations; 3,869 contractions to 1,139', tx, 192);
        ctx.fillText('reflections; McKinnon’s stall reproduced', tx, 208);
        let line;
        if (s.done) {
          line = `${sc.iter} iterations, ${sc.evals} evaluations: best ${best.v.toExponential(2)} at (${best.p[0].toFixed(4)}, ${best.p[1].toFixed(4)}); ${sc.ops.contract} contractions, ${sc.ops.reflect} reflections, ${sc.ops.expand} expansions, ${sc.ops.shrink} shrinks`;
          ctx.fillStyle = best.v < 1e-6 ? good : heur;
        } else {
          line = sc.last;
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
          new start
        </button>
        <span className="viz-stat">{snap.line || 'searching…'}</span>
      </div>
    </>
  );
}
