import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one fit. Act one: EM converging on three tilted,
// overlapping sources: every point wears a BLEND of the component
// colors (its responsibilities), the 2-sigma ellipses tighten
// onto the planted structure, and the log-likelihood readout
// climbs monotonically: the theorem, on screen. Act two: the
// trapdoor: a ridgeless component pinned on one point collapses,
// and the likelihood climbs without bound while the fit explains
// nothing: the reason every real implementation ships a ridge.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const ITERS = 36;

function logGauss2(x, y, mu, cov) {
  const [a, b, , d] = cov;
  const det = a * d - b * b;
  const ia = d / det;
  const ib = -b / det;
  const id = a / det;
  const dx = x - mu[0];
  const dy = y - mu[1];
  const q = dx * (ia * dx + ib * dy) + dy * (ib * dx + id * dy);
  return -0.5 * q - 0.5 * Math.log(4 * Math.PI * Math.PI * det);
}

function logsumexp(v) {
  const m = Math.max(...v);
  return m + Math.log(v.reduce((s, x) => s + Math.exp(x - m), 0));
}

export function respOf(x, y, params) {
  const lp = params.map((c) => Math.log(c.w) + logGauss2(x, y, c.mu, c.cov));
  const z = logsumexp(lp);
  return lp.map((v) => Math.exp(v - z));
}

export function emTrajectory(pts, init, iters) {
  // Records {params, ll} per iteration; ridge 1e-4.
  const k = init.length;
  let params = init.map((c) => ({ w: c.w, mu: [...c.mu], cov: [...c.cov] }));
  const frames = [];
  for (let t = 0; t < iters; t++) {
    let ll = 0;
    const resp = pts.map(([x, y]) => {
      const lp = params.map((c) => Math.log(c.w) + logGauss2(x, y, c.mu, c.cov));
      const z = logsumexp(lp);
      ll += z;
      return lp.map((v) => Math.exp(v - z));
    });
    frames.push({ params: params.map((c) => ({ w: c.w, mu: [...c.mu], cov: [...c.cov] })), ll });
    const next = [];
    for (let j = 0; j < k; j++) {
      let nj = 0;
      let mx = 0;
      let my = 0;
      for (let i = 0; i < pts.length; i++) {
        nj += resp[i][j];
        mx += resp[i][j] * pts[i][0];
        my += resp[i][j] * pts[i][1];
      }
      mx /= nj;
      my /= nj;
      let sa = 0;
      let sb = 0;
      let sd = 0;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] - mx;
        const dy = pts[i][1] - my;
        sa += resp[i][j] * dx * dx;
        sb += resp[i][j] * dx * dy;
        sd += resp[i][j] * dy * dy;
      }
      next.push({ w: nj / pts.length, mu: [mx, my], cov: [sa / nj + 1e-4, sb / nj, sb / nj, sd / nj + 1e-4] });
    }
    params = next;
  }
  return frames;
}

export function ellipseOf(cov) {
  const [a, b, , d] = cov;
  const tr = a + d;
  const df = a - d;
  const disc = Math.sqrt(df * df + 4 * b * b);
  const l1 = (tr + disc) / 2;
  const l2 = (tr - disc) / 2;
  const theta = 0.5 * Math.atan2(2 * b, df);
  return { r1: 2 * Math.sqrt(Math.max(l1, 1e-9)), r2: 2 * Math.sqrt(Math.max(l2, 1e-9)), theta };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const TRUE = [
    { w: 0.5, mu: [0, 0], chol: [2.0, 0.9, 0.55] },
    { w: 0.3, mu: [5, 1.5], chol: [1.0, -0.9, 1.3] },
    { w: 0.2, mu: [2, 4.5], chol: [0.77, 0, 0.77] },
  ];
  const pts = [];
  for (let i = 0; i < 240; i++) {
    const u = rand();
    const c = u < 0.5 ? TRUE[0] : u < 0.8 ? TRUE[1] : TRUE[2];
    const z1 = gauss();
    const z2 = gauss();
    pts.push([c.mu[0] + c.chol[0] * z1, c.mu[1] + c.chol[1] * z1 + c.chol[2] * z2]);
  }
  // deliberately clumsy init: uniform weights, identity covs, spread seeds
  const init = [0, 1, 2].map((j) => ({ w: 1 / 3, mu: [...pts[10 + j * 70]], cov: [1, 0, 0, 1] }));
  const frames = emTrajectory(pts, init, ITERS);
  // act 2: the ladder: one component pinned on pts2[0], variance shrinking
  const pts2 = pts.slice(0, 30);
  let mx = 0;
  let my = 0;
  for (const [x, y] of pts2) {
    mx += x / pts2.length;
    my += y / pts2.length;
  }
  let sa = 0;
  let sd = 0;
  for (const [x, y] of pts2) {
    sa += (x - mx) ** 2 / pts2.length;
    sd += (y - my) ** 2 / pts2.length;
  }
  const ladder = (eps) => {
    let ll = 0;
    for (const [x, y] of pts2) {
      ll += logsumexp([
        Math.log(0.5) + logGauss2(x, y, pts2[0], [eps, 0, 0, eps]),
        Math.log(0.5) + logGauss2(x, y, [mx, my], [sa, 0, 0, sd]),
      ]);
    }
    return ll;
  };
  return { pts, frames, pts2, ladder, sane: { mu: [mx, my], cov: [sa, 0, 0, sd] } };
}

const SX = (x) => 40 + (x + 5) * 28;
const SY = (y) => 254 - (y + 4) * 19;

export default function GmmViz() {
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
      stepMs: 60,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? ITERS * 6 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
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
        const COLS = [
          [93, 162, 255],
          [240, 185, 75],
          [98, 217, 138],
        ];

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const t = done ? ITERS * 6 : Math.min(s.tick, ITERS * 6);
          const it = Math.min(ITERS - 1, Math.floor(t / 6));
          const fr = sc.frames[it];
          ctx.fillText('act 1 · guess softly, refit exactly: every point wears its responsibilities as a color blend', 14, 20);
          // points, blended by responsibility under current params
          for (const [x, y] of sc.pts) {
            const r = respOf(x, y, fr.params);
            const rgb = [0, 1, 2].map((c) => Math.round(r[0] * COLS[0][c] + r[1] * COLS[1][c] + r[2] * COLS[2][c]));
            const px = SX(x);
            const py = SY(y);
            if (px < 14 || px > 470 || py < 30 || py > 280) continue;
            ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;
            ctx.fillRect(px - 1.7, py - 1.7, 3.4, 3.4);
          }
          // 2-sigma ellipses
          fr.params.forEach((c, j) => {
            const e = ellipseOf(c.cov);
            ctx.strokeStyle = `rgb(${COLS[j][0]},${COLS[j][1]},${COLS[j][2]})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(SX(c.mu[0]), SY(c.mu[1]), e.r1 * 28, e.r2 * 19, -e.theta, 0, Math.PI * 2);
            ctx.stroke();
          });
          // the likelihood staircase
          const lls = sc.frames.map((f) => f.ll);
          const lo = Math.min(...lls);
          const hi = Math.max(...lls);
          ctx.strokeStyle = good;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i <= it; i++) {
            const px = 500 + (i / (ITERS - 1)) * 120;
            const py = 210 - ((lls[i] - lo) / (hi - lo + 1e-9)) * 150;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.fillStyle = good;
          ctx.fillText('log-likelihood', 500, 232);
          ctx.fillStyle = ink;
          ctx.fillText(`iter ${it + 1}/${ITERS}`, 500, 246);
          ctx.fillText(`ll ${fr.ll.toFixed(0)}`, 500, 260);
          let line;
          if (done || t >= ITERS * 6) {
            line = 'converged: ellipses on the planted tilt, seam points visibly blended, the staircase never stepped down';
            ctx.fillStyle = good;
          } else if (it < 4) {
            line = 'clumsy start: identity circles, wrong spots: the E-step still hands out honest fractions';
            ctx.fillStyle = ink;
          } else {
            line = 'E: score and normalize · M: refit under the fractions · the theorem: the climb is monotone';
            ctx.fillStyle = heur;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the trapdoor: a ridgeless component pinned on ONE point: variance to zero, likelihood to infinity', 14, 20);
          const frac = Math.min(1, t / 200);
          const logEps = -1 - frac * 59; // 1e-1 .. 1e-60
          const eps = Math.pow(10, logEps);
          const ll = sc.ladder(eps);
          // points
          for (const [x, y] of sc.pts2) {
            ctx.fillStyle = 'rgba(154,165,189,0.8)';
            ctx.fillRect(SX(x) - 1.7, SY(y) - 1.7, 3.4, 3.4);
          }
          // sane component ellipse
          const se = ellipseOf(sc.sane.cov);
          ctx.strokeStyle = `${algo}AA`;
          ctx.beginPath();
          ctx.ellipse(SX(sc.sane.mu[0]), SY(sc.sane.mu[1]), se.r1 * 28, se.r2 * 19, -se.theta, 0, Math.PI * 2);
          ctx.stroke();
          // the collapsing one: drawn radius floored for visibility
          const px = SX(sc.pts2[0][0]);
          const py = SY(sc.pts2[0][1]);
          const rr = Math.max(2, Math.sqrt(eps) * 28 * 2);
          ctx.strokeStyle = warn;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px, py, rr, Math.max(2, rr * (19 / 28)), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = warn;
          ctx.fillText(`variance ${eps.toExponential(0)}`, Math.min(px + 10, 500), Math.max(py - 10, 34));
          ctx.fillStyle = warn;
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(`log-likelihood ${ll.toFixed(0)} and climbing`, 420, 80);
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = dim;
          ctx.fillText('one point memorized exactly;', 420, 100);
          ctx.fillText('the other 29 explained no better', 420, 114);
          let line;
          if (done || t >= 200) {
            line = 'unbounded objective, exploited by its own optimizer: the variance ridge exists for this';
            ctx.fillStyle = warn;
          } else {
            line = 'the M-step refits a singleton component to zero scatter: nothing stops the collapse';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'soft fractions climb honestly; unbounded likelihoods cheat: regularize, then trust the theorem'
              : line,
          };
        }
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
          new sample
        </button>
        <span className="viz-stat">
          {snap.line || 'handing out responsibilities…'}
        </span>
      </div>
    </>
  );
}
