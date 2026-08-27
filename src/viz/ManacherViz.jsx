import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous sweep over a palindrome-dense string. The text sits
// on a line; above it, each processed center's radius draws as an
// arc: green arcs were fully inherited from a mirror (free), amber
// arcs mark centers that did fresh expansion work, and the great
// mirror: the rightmost-reaching palindrome: glows blue with its
// frontier R as a vertical bar that ONLY MOVES RIGHT. Meters keep
// the honest score: expansions spent vs radius inherited.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 34;
const STEP_TICKS = 12;
const END_HOLD = 66;

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Palindrome-dense: binary alphabet with planted mirror segments.
  let s = '';
  while (s.length < N) {
    if (rand() < 0.45 && s.length >= 3) {
      const k = 2 + Math.floor(rand() * Math.min(5, s.length));
      s += s.slice(s.length - k).split('').reverse().join('');
    } else {
      s += 'ab'[Math.floor(rand() * 2)];
    }
  }
  s = s.slice(0, N);
  // Run Manacher on the transformed string, recording per-center info.
  const t = '#' + s.split('').join('#') + '#';
  const n = t.length;
  const P = Array(n).fill(0);
  let C = 0;
  let R = 0;
  const frames = [];
  let paid = 0;
  let inherited = 0;
  for (let i = 0; i < n; i++) {
    let free = 0;
    if (i < R) {
      free = Math.min(R - i, P[2 * C - i]);
      P[i] = free;
      inherited += free;
    }
    let exp = 0;
    while (
      i - P[i] - 1 >= 0 &&
      i + P[i] + 1 < n &&
      t[i - P[i] - 1] === t[i + P[i] + 1]
    ) {
      P[i] += 1;
      exp += 1;
      paid += 1;
    }
    if (i + P[i] > R) {
      C = i;
      R = i + P[i];
    }
    frames.push({ i, p: P[i], free, exp, C, R, paid, inherited });
  }
  const best = frames.reduce((a, f) => (f.p > a.p ? f : a), frames[0]);
  return { s, t, n, frames, best };
}

export default function ManacherViz() {
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
        scene: makeScene(SEED + cycle.current * 8039),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.scene.n * STEP_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 8039),
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
        const shown = Math.min(Math.floor(s.tick / STEP_TICKS) + 1, sc.n);
        const finished = shown >= sc.n && s.tick >= sc.n * STEP_TICKS;
        const cur = sc.frames[shown - 1];

        const X = (i) => 24 + (i / (sc.n - 1)) * 592;
        const BASE = 210;

        // The text (original chars at odd transformed positions).
        ctx.font = '11px ui-monospace, monospace';
        for (let i = 0; i < sc.n; i++) {
          const ch = sc.t[i];
          if (ch === '#') continue;
          ctx.fillStyle = i <= (cur ? cur.i : 0) ? ink : '#3a4560';
          ctx.fillText(ch, X(i) - 3, BASE + 20);
        }

        // Arcs for processed centers.
        for (let k = 0; k < shown; k++) {
          const f = sc.frames[k];
          if (f.p === 0) continue;
          const isBest = finished && f.i === sc.best.i;
          const fullyFree = f.exp === 0 && f.free > 0;
          ctx.strokeStyle = isBest ? ink : fullyFree ? good : heur;
          ctx.lineWidth = isBest ? 2.6 : k === shown - 1 ? 2.2 : 1.1;
          ctx.globalAlpha = k === shown - 1 || isBest ? 1 : 0.45;
          const x1 = X(f.i - f.p);
          const x2 = X(f.i + f.p);
          const r = (x2 - x1) / 2;
          ctx.beginPath();
          ctx.arc((x1 + x2) / 2, BASE, r, Math.PI, 0);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // The great mirror and its frontier.
        if (cur) {
          const xc = X(cur.C);
          const xr = X(Math.min(cur.R, sc.n - 1));
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(xr, BASE - 150);
          ctx.lineTo(xr, BASE + 6);
          ctx.stroke();
          ctx.fillStyle = algo;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('R', xr + 5, BASE - 138);
          ctx.fillStyle = algo;
          ctx.beginPath();
          ctx.arc(xc, BASE, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('green arcs: fully inherited (free) · amber: fresh expansion · blue bar: the frontier R, only ever moving right', 14, 20);

        let line;
        if (!finished && cur) {
          const kind = cur.exp === 0 && cur.free > 0 ? 'all inherited: free' : cur.free > 0 ? `${cur.free} free + ${cur.exp} fresh` : `${cur.exp} fresh`;
          line = `center ${shown}/${sc.n} · radius ${cur.p} (${kind}) · paid ${cur.paid} vs inherited ${cur.inherited}`;
          ctx.fillStyle = cur.exp === 0 && cur.free > 0 ? good : heur;
        } else {
          const f = sc.frames[sc.n - 1];
          const witness = sc.s.slice((sc.best.i - sc.best.p) / 2, (sc.best.i - sc.best.p) / 2 + sc.best.p);
          line = `longest: "${witness}" (${sc.best.p}) · total paid ${f.paid} expansions vs ${f.inherited} inherited: verified once, reused forever`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

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
          new string
        </button>
        <span className="viz-stat">
          {snap.line || 'the hall of mirrors opens…'}
        </span>
      </div>
    </>
  );
}
