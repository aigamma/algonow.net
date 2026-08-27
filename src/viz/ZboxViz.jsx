import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One continuous sweep over a period-heavy string. The string sits
// as a bar; above each processed position its Z-value rises as a
// column: green columns were fully inherited from the box's twin
// (free), amber columns paid fresh comparisons past R. The Z-box
// itself glows as a bracket that only ever slides right, and the
// meters keep the score: comparisons paid vs values inherited: the
// forger's registry, drawn.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 44;
const STEP_TICKS = 10;
const END_HOLD = 66;

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Period-heavy: a short unit repeated with occasional corruption.
  const unit = Array.from({ length: 3 + Math.floor(rand() * 3) }, () =>
    'ab'[Math.floor(rand() * 2)],
  ).join('');
  let s = '';
  while (s.length < N) {
    s += rand() < 0.85 ? unit : 'ab'[Math.floor(rand() * 2)];
  }
  s = s.slice(0, N);
  // Run Z with per-position records.
  const n = s.length;
  const Z = Array(n).fill(0);
  Z[0] = n;
  let L = 0;
  let R = 0;
  const frames = [{ i: 0, z: n, free: 0, paid: 0, L: 0, R: 0 }];
  let paidTotal = 0;
  let freeTotal = 0;
  for (let i = 1; i < n; i++) {
    let free = 0;
    if (i <= R) {
      free = Math.min(R - i + 1, Z[i - L]);
      Z[i] = free;
    }
    let paid = 0;
    while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) {
      Z[i] += 1;
      paid += 1;
    }
    paidTotal += paid;
    freeTotal += free;
    if (i + Z[i] - 1 > R) {
      L = i;
      R = i + Z[i] - 1;
    }
    frames.push({ i, z: Z[i], free, paid, L, R, paidTotal, freeTotal });
  }
  return { s, n, frames };
}

export default function ZboxViz() {
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
        scene: makeScene(SEED + cycle.current * 5701),
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
              scene: makeScene(SEED + cycle.current * 5701),
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

        const X = (i) => 26 + (i / (sc.n - 1)) * 588;
        const BASE = 216;
        const colW = 588 / (sc.n - 1) - 2;

        // The prefix highlight.
        ctx.fillStyle = 'rgba(93,162,255,0.14)';
        const pfxLen = Math.min(8, sc.n);
        ctx.fillRect(X(0) - 4, BASE, X(pfxLen) - X(0), 22);

        // The string characters.
        ctx.font = '10px ui-monospace, monospace';
        for (let i = 0; i < sc.n; i++) {
          ctx.fillStyle = i < shown ? ink : '#3a4560';
          ctx.fillText(sc.s[i], X(i) - 3, BASE + 15);
        }

        // Z-columns (skip position 0: its value is n by convention).
        const maxZ = Math.max(...sc.frames.slice(1).map((f) => f.z), 4);
        for (let k = 1; k < shown; k++) {
          const f = sc.frames[k];
          if (f.z === 0) continue;
          const h = (f.z / maxZ) * 150;
          const fullyFree = f.paid === 0 && f.free > 0;
          ctx.fillStyle = fullyFree ? good : heur;
          ctx.globalAlpha = k === shown - 1 ? 1 : 0.55;
          ctx.fillRect(X(f.i) - colW / 2, BASE - 6 - h, colW, h);
          ctx.globalAlpha = 1;
        }

        // The Z-box bracket.
        if (cur && cur.R > 0) {
          const xl = X(cur.L);
          const xr = X(Math.min(cur.R, sc.n - 1));
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(xl, BASE + 30);
          ctx.lineTo(xl, BASE + 38);
          ctx.lineTo(xr, BASE + 38);
          ctx.lineTo(xr, BASE + 30);
          ctx.stroke();
          ctx.fillStyle = algo;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('the Z-box: a certified copy of the prefix', (xl + xr) / 2 - 90, BASE + 52);
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('columns: Z[i] · green: fully inherited from the twin (free) · amber: paid fresh comparisons', 14, 20);

        let line;
        if (!finished && cur) {
          const kind = cur.paid === 0 && cur.free > 0 ? 'all inherited' : cur.free > 0 ? `${cur.free} free + ${cur.paid} paid` : `${cur.paid} paid`;
          line = `i = ${cur.i} · Z = ${cur.z} (${kind}) · paid ${cur.paidTotal ?? 0} vs inherited ${cur.freeTotal ?? 0}`;
          ctx.fillStyle = cur.paid === 0 && cur.free > 0 ? good : heur;
        } else {
          const f = sc.frames[sc.n - 1];
          line = `done: ${f.paidTotal} comparisons paid, ${f.freeTotal} values inherited: nothing inside a certified copy inspected twice`;
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
          {snap.line || 'the registry opens…'}
        </span>
      </div>
    </>
  );
}
