import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// The table, filling. Two words frame the grid; each cell is the edit
// distance between their prefixes, computed from its three neighbors and
// tinted by its value. When the corner lands, the backtrace walks home in
// green: that path IS the edit script, and its moves are named below the
// grid. New word pairs rotate each cycle.
const PAIRS = [
  ['KITTEN', 'SITTING'],
  ['SUNDAY', 'SATURDAY'],
  ['FLAW', 'LAWN'],
  ['ALGORITHM', 'ALTRUISM'],
  ['HONEST', 'MONIES'],
];
const W = 640;
const H = 300;
const TICKS_PER_CELL = 3;

function build(s, t) {
  const n = s.length;
  const m = t.length;
  const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      D[i][j] = Math.min(
        D[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1),
        D[i - 1][j] + 1,
        D[i][j - 1] + 1,
      );
    }
  }
  // Backtrace path with op labels.
  const path = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    path.push([i, j]);
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)) {
      i -= 1;
      j -= 1;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  path.push([0, 0]);
  return { s, t, n, m, D, path };
}

export default function EditDistanceViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ dist: 0, done: false, pair: PAIRS[0] });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ dist: 0, done: false, pair: PAIRS[0] });

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
        const [s, t] = PAIRS[cycle.current % PAIRS.length];
        return { grid: build(s, t), tick: 0, rest: 0, stopAtRest: isStill() };
      },
      tick: (s) => {
        const cellsTotal = (s.grid.n + 1) * (s.grid.m + 1);
        const traceTicks = s.grid.path.length * 4;
        if (s.tick >= cellsTotal * TICKS_PER_CELL + traceTicks + 16) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const [a, b] = PAIRS[cycle.current % PAIRS.length];
            s.grid = build(a, b);
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, st) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const g = st.grid;
        const cols = g.m + 1;
        const rows = g.n + 1;
        const cell = Math.min(46, Math.floor(520 / cols), Math.floor(230 / rows));
        const x0 = 70;
        const y0 = 44;
        const cellsTotal = rows * cols;
        const filled = Math.min(Math.floor(st.tick / TICKS_PER_CELL), cellsTotal);
        const tracing = filled >= cellsTotal;
        const traceAt = tracing
          ? Math.min(Math.floor((st.tick - cellsTotal * TICKS_PER_CELL) / 4), g.path.length)
          : 0;
        const onPath = new Set(
          g.path.slice(0, traceAt).map(([i, j]) => i * 1000 + j),
        );

        // Axis letters.
        ctx.font = '13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        for (let j = 0; j < g.m; j++) {
          ctx.fillStyle = heur;
          ctx.fillText(g.t[j], x0 + (j + 1) * cell + cell / 2, y0 - 8);
        }
        for (let i = 0; i < g.n; i++) {
          ctx.fillStyle = algo;
          ctx.fillText(g.s[i], x0 - 14, y0 + (i + 1) * cell + cell / 2 + 4);
        }

        const maxD = Math.max(g.n, g.m);
        for (let k = 0; k < filled; k++) {
          const i = Math.floor(k / cols);
          const j = k % cols;
          const v = g.D[i][j];
          const x = x0 + j * cell;
          const y = y0 + i * cell;
          const traced = onPath.has(i * 1000 + j);
          ctx.fillStyle = traced
            ? 'rgba(98,217,138,0.28)'
            : `rgba(93,162,255,${0.06 + (v / maxD) * 0.3})`;
          ctx.fillRect(x, y, cell - 1, cell - 1);
          ctx.fillStyle = traced ? path : ink;
          ctx.font = `${Math.min(13, cell - 8)}px ui-monospace, monospace`;
          ctx.fillText(String(v), x + cell / 2, y + cell / 2 + 4);
        }
        if (!tracing && filled < cellsTotal) {
          const i = Math.floor(filled / cols);
          const j = filled % cols;
          ctx.strokeStyle = heur;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x0 + j * cell - 0.5, y0 + i * cell - 0.5, cell, cell);
        }
        ctx.textAlign = 'start';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        const d = g.D[g.n][g.m];
        ctx.fillText(
          tracing && traceAt >= g.path.length
            ? `${g.s} → ${g.t}: distance ${d} · the green walk is the edit script`
            : tracing
              ? `corner reached: ${d} · walking the argmins home…`
              : `filling ${filled}/${cellsTotal} cells · each from its three neighbors`,
          14,
          H - 12,
        );
        statsRef.current = { dist: d, done: tracing && traceAt >= g.path.length, pair: [g.s, g.t] };
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
          next pair
        </button>
        <span className="viz-stat">
          {snap.done
            ? <>{snap.pair[0]} → {snap.pair[1]} costs <strong>{snap.dist}</strong> edits, witnessed by the green path</>
            : 'prefix versus prefix, three neighbors per answer…'}
        </span>
      </div>
    </>
  );
}
