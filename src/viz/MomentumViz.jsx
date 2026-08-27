import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The canyon, live. Both marbles start at the same point on the same
// ill-conditioned bowl (contours drawn as ellipses). The dim marble is
// plain gradient descent: it obeys the local slope, which points at the
// opposite wall, so it zigzags. The blue marble carries Polyak momentum:
// crosswise motion cancels, down-valley motion accumulates, and it coasts.
// Counters are honest iteration counts to the same tolerance.
const W = 640;
const H = 300;
const SEED = 20260827;
const KAPPA = 25;
const TICKS_PER_STEP = 3;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const angle = (rand() - 0.5) * 0.9;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const l1 = 1.0; // soft (long) axis
  const l2 = KAPPA; // stiff (short) axis
  // f(u,v) = (l1*u^2 + l2*v^2)/2 in rotated coordinates.
  const toUV = (x, y) => [cos * x + sin * y, -sin * x + cos * y];
  const gradXY = (x, y) => {
    const [u, v] = toUV(x, y);
    const gu = l1 * u;
    const gv = l2 * v;
    return [cos * gu - sin * gv, sin * gu + cos * gv];
  };
  const start = [-0.95, 0.16 + rand() * 0.06];
  const eta = 2 / (l1 + l2);
  const etaHb = 4 / (Math.sqrt(l1) + Math.sqrt(l2)) ** 2;
  const beta = ((Math.sqrt(KAPPA) - 1) / (Math.sqrt(KAPPA) + 1)) ** 2;
  const tol = 2e-3;

  const gd = [start];
  let p = start;
  for (let i = 0; i < 400; i++) {
    const g = gradXY(p[0], p[1]);
    if (Math.hypot(g[0], g[1]) < tol) break;
    p = [p[0] - eta * g[0], p[1] - eta * g[1]];
    gd.push(p);
  }
  const hb = [start];
  let cur = start;
  let prev = start;
  for (let i = 0; i < 400; i++) {
    const g = gradXY(cur[0], cur[1]);
    if (Math.hypot(g[0], g[1]) < tol) break;
    const nxt = [
      cur[0] - etaHb * g[0] + beta * (cur[0] - prev[0]),
      cur[1] - etaHb * g[1] + beta * (cur[1] - prev[1]),
    ];
    prev = cur;
    cur = nxt;
    hb.push(cur);
  }
  return { angle, gd, hb };
}

const px = ([x, y]) => [320 + x * 300, 152 + y * 300];

export default function MomentumViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ gd: 0, hb: 0, gdDone: false, hbDone: false });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ gd: 0, hb: 0 });

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
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const longest = Math.max(s.scene.gd.length, s.scene.hb.length);
        if (s.tick >= longest * TICKS_PER_STEP + 20) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(SEED + cycle.current * 7919);
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        const at = Math.floor(s.tick / TICKS_PER_STEP);
        statsRef.current = {
          gd: Math.min(at, s.scene.gd.length - 1),
          hb: Math.min(at, s.scene.hb.length - 1),
          gdDone: at >= s.scene.gd.length - 1,
          hbDone: at >= s.scene.hb.length - 1,
        };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        // Contours of the rotated bowl.
        ctx.save();
        ctx.translate(320, 152);
        ctx.rotate(s.scene.angle);
        for (const t of [1, 0.75, 0.52, 0.32, 0.16]) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 300 * t, (300 / Math.sqrt(KAPPA)) * t, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(93,162,255,0.22)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = path;
        ctx.beginPath();
        ctx.arc(320, 152, 3.5, 0, Math.PI * 2);
        ctx.fill();

        const at = Math.floor(s.tick / TICKS_PER_STEP);
        const drawTrail = (pts, upto, color, width) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          for (let i = 0; i <= Math.min(upto, pts.length - 1); i++) {
            const [x, y] = px(pts[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          const [hx, hy] = px(pts[Math.min(upto, pts.length - 1)]);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(hx, hy, 4, 0, Math.PI * 2);
          ctx.fill();
        };
        drawTrail(s.scene.gd, at, 'rgba(255,255,255,0.45)', 1.2);
        drawTrail(s.scene.hb, at, algo, 1.8);

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        const st = statsRef.current;
        ctx.fillText(
          `plain descent: step ${st.gd}${st.gdDone ? ` · done (${s.scene.gd.length - 1})` : ''}   ·   momentum: step ${st.hb}${st.hbDone ? ` · done (${s.scene.hb.length - 1})` : ''}`,
          14,
          H - 10,
        );
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
          new canyon
        </button>
        <span className="viz-stat">
          same start, same slopes · the white marble is massless, the blue one <strong>remembers its last step</strong>
        </span>
      </div>
    </>
  );
}
