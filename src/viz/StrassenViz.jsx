import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The trade, watched. A and B are 2x2 blocks (scalars here, so every value
// is checkable). The seven M-products form one at a time: the participating
// cells of A (blue) and B (amber) light up, subtracted cells outlined in
// red, and the product drops into its M slot. Then the four C quadrants
// assemble in green from the Ms. Counter: 7 multiplies where 8 were
// expected; the recursion amplifies that into the exponent.
const W = 640;
const H = 300;
const SEED = 20260827;
const PHASE_TICKS = 26;

const M_DEFS = [
  { a: [[0, 0, 1], [1, 1, 1]], b: [[0, 0, 1], [1, 1, 1]], label: 'M₁ = (A₁₁+A₂₂)(B₁₁+B₂₂)' },
  { a: [[1, 0, 1], [1, 1, 1]], b: [[0, 0, 1]], label: 'M₂ = (A₂₁+A₂₂)·B₁₁' },
  { a: [[0, 0, 1]], b: [[0, 1, 1], [1, 1, -1]], label: 'M₃ = A₁₁·(B₁₂−B₂₂)' },
  { a: [[1, 1, 1]], b: [[1, 0, 1], [0, 0, -1]], label: 'M₄ = A₂₂·(B₂₁−B₁₁)' },
  { a: [[0, 0, 1], [0, 1, 1]], b: [[1, 1, 1]], label: 'M₅ = (A₁₁+A₁₂)·B₂₂' },
  { a: [[1, 0, 1], [0, 0, -1]], b: [[0, 0, 1], [0, 1, 1]], label: 'M₆ = (A₂₁−A₁₁)(B₁₁+B₁₂)' },
  { a: [[0, 1, 1], [1, 1, -1]], b: [[1, 0, 1], [1, 1, 1]], label: 'M₇ = (A₁₂−A₂₂)(B₂₁+B₂₂)' },
];
const C_DEFS = [
  { r: 0, c: 0, ms: [[0, 1], [3, 1], [4, -1], [6, 1]], label: 'C₁₁ = M₁+M₄−M₅+M₇' },
  { r: 0, c: 1, ms: [[2, 1], [4, 1]], label: 'C₁₂ = M₃+M₅' },
  { r: 1, c: 0, ms: [[1, 1], [3, 1]], label: 'C₂₁ = M₂+M₄' },
  { r: 1, c: 1, ms: [[0, 1], [1, -1], [2, 1], [5, 1]], label: 'C₂₂ = M₁−M₂+M₃+M₆' },
];

function makeScene(seed) {
  const rand = mulberry32(seed);
  const cell = () => Math.floor(rand() * 9) - 4;
  const A = [[cell(), cell()], [cell(), cell()]];
  const B = [[cell(), cell()], [cell(), cell()]];
  const pick = (M, cells) => cells.reduce((s, [r, c, sg]) => s + sg * M[r][c], 0);
  const mVals = M_DEFS.map((d) => pick(A, d.a) * pick(B, d.b));
  const cVals = C_DEFS.map((d) => d.ms.reduce((s, [k, sg]) => s + sg * mVals[k], 0));
  // The referee: the classical 2x2 product, computed independently.
  const ref = [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  const audited = C_DEFS.every((d, i) => cVals[i] === ref[d.r][d.c]);
  return { A, B, mVals, cVals, audited };
}

const TOTAL_PHASES = M_DEFS.length + C_DEFS.length; // 7 products, then 4 assemblies

export default function StrassenViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ label: '', done: false, audited: false });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ label: '', done: false, audited: false });

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
        if (s.tick >= TOTAL_PHASES * PHASE_TICKS) {
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const phase = Math.min(Math.floor(s.tick / PHASE_TICKS), TOTAL_PHASES - 1);
        const finished = s.tick >= TOTAL_PHASES * PHASE_TICKS;
        const mPhase = !finished && phase < M_DEFS.length ? phase : -1;
        const cPhase = !finished && phase >= M_DEFS.length ? phase - M_DEFS.length : -1;
        const mDone = finished ? M_DEFS.length : Math.min(phase, M_DEFS.length);
        const cDone = finished ? C_DEFS.length : Math.max(phase - M_DEFS.length, 0);

        const CELL = 42;
        const grid = (x0, y0, name, M, color, hi) => {
          ctx.fillStyle = dim;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(name, x0 + CELL - 4, y0 - 10);
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
              const x = x0 + c * (CELL + 2);
              const y = y0 + r * (CELL + 2);
              const h = hi && hi.find(([hr, hc]) => hr === r && hc === c);
              ctx.fillStyle = h ? `${color}33` : 'rgba(255,255,255,0.03)';
              ctx.fillRect(x, y, CELL, CELL);
              ctx.strokeStyle = h ? (h[2] < 0 ? warn : color) : `${color}55`;
              ctx.lineWidth = h ? 2 : 1;
              ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
              if (M) {
                ctx.fillStyle = h ? ink : dim;
                ctx.font = '13px ui-monospace, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(String(M[r][c]), x + CELL / 2, y + CELL / 2 + 4);
                ctx.textAlign = 'start';
                if (h && h[2] < 0) {
                  ctx.fillStyle = warn;
                  ctx.font = '10px ui-monospace, monospace';
                  ctx.fillText('−', x + 3, y + 11);
                }
              }
            }
          }
        };

        const aHi = mPhase >= 0 ? M_DEFS[mPhase].a : null;
        const bHi = mPhase >= 0 ? M_DEFS[mPhase].b : null;
        grid(30, 62, 'A', s.scene.A, algo, aHi);
        ctx.fillStyle = dim;
        ctx.font = '14px ui-monospace, monospace';
        ctx.fillText('×', 128, 110);
        grid(148, 62, 'B', s.scene.B, heur, bHi);
        ctx.fillText('=', 246, 110);

        // C grid: filled cells as they assemble.
        const cHiCells = [];
        if (cPhase >= 0) cHiCells.push([C_DEFS[cPhase].r, C_DEFS[cPhase].c, 1]);
        grid(266, 62, 'C', null, good, cHiCells);
        C_DEFS.forEach((d, i) => {
          if (i < cDone || (cPhase === i && s.tick % PHASE_TICKS > PHASE_TICKS / 2)) {
            const x = 266 + d.c * (CELL + 2);
            const y = 62 + d.r * (CELL + 2);
            ctx.fillStyle = `${good}22`;
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = ink;
            ctx.font = '13px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(s.scene.cVals[i]), x + CELL / 2, y + CELL / 2 + 4);
            ctx.textAlign = 'start';
          }
        });

        // The running tally, right side.
        ctx.fillStyle = ink;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(`products used: ${mDone} / 7`, 420, 78);
        ctx.fillStyle = dim;
        ctx.fillText('classical spends 8', 420, 96);
        ctx.fillStyle = mDone >= 7 ? heur : dim;
        ctx.fillText('one multiply saved,', 420, 122);
        ctx.fillText('every level, forever', 420, 138);

        // M slots along the bottom.
        const SLOT_W = 74;
        for (let k = 0; k < 7; k++) {
          const x = 30 + k * (SLOT_W + 10);
          const y = 224;
          const active = mPhase === k;
          const feeds = cPhase >= 0 ? C_DEFS[cPhase].ms.find(([mk]) => mk === k) : null;
          ctx.fillStyle = active ? `${heur}22` : feeds ? `${good}22` : 'rgba(255,255,255,0.03)';
          ctx.fillRect(x, y, SLOT_W, 30);
          ctx.strokeStyle = active ? heur : feeds ? (feeds[1] < 0 ? warn : good) : '#2a3450';
          ctx.lineWidth = active || feeds ? 2 : 1;
          ctx.strokeRect(x + 0.5, y + 0.5, SLOT_W - 1, 29);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`M${String.fromCharCode(0x2081 + k)}`, x + 4, y - 4);
          if (k < mDone || (active && s.tick % PHASE_TICKS > PHASE_TICKS / 2)) {
            ctx.fillStyle = ink;
            ctx.font = '12px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(s.scene.mVals[k]), x + SLOT_W / 2, y + 20);
            ctx.textAlign = 'start';
          }
        }

        // The identity being formed, and the header.
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        if (finished) {
          ctx.fillText(
            s.scene.audited
              ? 'assembled · referee: the classical 2×2 product agrees, entry by entry'
              : 'assembled · referee disagrees (should never happen)',
            14, 22,
          );
          statsRef.current = { label: '', done: true, audited: s.scene.audited };
        } else {
          const label = mPhase >= 0 ? M_DEFS[mPhase].label : C_DEFS[cPhase].label;
          ctx.fillText(label, 14, 22);
          statsRef.current = { label, done: false, audited: false };
        }
        ctx.fillText('T(n) = 7·T(n/2) + O(n²)  ⇒  n^log₂ 7 = n^2.807', 14, H - 10);
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
          new matrices
        </button>
        <span className="viz-stat">
          {snap.done
            ? <>4 quadrants from <strong>7</strong> products, not 8 · classical referee agrees</>
            : snap.label
              ? <>forming {snap.label.split(' =')[0]} · 7 multiplies where 8 were expected</>
              : 'splitting into blocks…'}
        </span>
      </div>
    </>
  );
}
