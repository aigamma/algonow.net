import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The clerks' clipboards, watched. Three rows of eighteen cells; a
// seeded parade of banners streams through: three elephants and a
// crowd of mice. Each arrival flashes its one cell per row and the
// heat builds. Then two queries: the elephant's three cells light,
// the minimum wins, and the estimate sits within a whisker of truth;
// the mouse's cells light and the estimate is mostly strangers: the
// flat absolute error, visible as color.
const W = 640;
const H = 300;
const SEED = 20260827;
const D = 3;
const WCELLS = 18;
const STREAM_LEN = 260;
const ADDS_PER_TICK = 2;
const QUERY_HOLD = 70;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const hs = Array.from({ length: D }, () => [
    1 + Math.floor(rand() * 997),
    Math.floor(rand() * 997),
  ]);
  const cellOf = (r, x) => ((hs[r][0] * x + hs[r][1]) % 2003) % WCELLS;
  // Universe: elephants 0,1,2 (weights) + mice 3..40.
  const stream = [];
  for (let i = 0; i < STREAM_LEN; i++) {
    const u = rand();
    let x;
    if (u < 0.3) x = 0;
    else if (u < 0.5) x = 1;
    else if (u < 0.62) x = 2;
    else x = 3 + Math.floor(rand() * 38);
    stream.push(x);
  }
  const truth = {};
  stream.forEach((x) => (truth[x] = (truth[x] || 0) + 1));
  const mouse = stream.find((x) => x >= 3 && truth[x] <= 2) ?? 5;
  return { hs, cellOf, stream, truth, queries: [0, mouse] };
}

export default function CountMinViz() {
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
        const streamTicks = Math.ceil(STREAM_LEN / ADDS_PER_TICK);
        const total = streamTicks + s.scene.queries.length * QUERY_HOLD;
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const streamTicks = Math.ceil(STREAM_LEN / ADDS_PER_TICK);
        const added = Math.min(s.tick * ADDS_PER_TICK, STREAM_LEN);
        const inQuery = s.tick >= streamTicks;
        const qIdx = inQuery
          ? Math.min(Math.floor((s.tick - streamTicks) / QUERY_HOLD), sc.queries.length - 1)
          : -1;

        // Build grid state from the prefix.
        const grid = Array.from({ length: D }, () => new Array(WCELLS).fill(0));
        for (let i = 0; i < added; i++) {
          const x = sc.stream[i];
          for (let r = 0; r < D; r++) grid[r][sc.cellOf(r, x)] += 1;
        }
        const last = added > 0 && !inQuery ? sc.stream[added - 1] : null;

        const cw = 30;
        const x0 = 60;
        const y0 = 70;
        const maxCell = Math.max(1, ...grid.flat());
        const q = qIdx >= 0 ? sc.queries[qIdx] : null;
        for (let r = 0; r < D; r++) {
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`h${r + 1}`, 30, y0 + r * 46 + 20);
          for (let c = 0; c < WCELLS; c++) {
            const v = grid[r][c];
            const heat = v / maxCell;
            const isLast = last !== null && sc.cellOf(r, last) === c;
            const isQ = q !== null && sc.cellOf(r, q) === c;
            ctx.fillStyle = isQ
              ? `${good}55`
              : isLast
                ? `${heur}66`
                : `rgba(93,162,255,${0.06 + heat * 0.5})`;
            ctx.fillRect(x0 + c * cw, y0 + r * 46, cw - 3, 30);
            ctx.strokeStyle = isQ ? good : isLast ? heur : '#2a3450';
            ctx.lineWidth = isQ || isLast ? 2 : 1;
            ctx.strokeRect(x0 + c * cw + 0.5, y0 + r * 46 + 0.5, cw - 4, 29);
            if (v > 0) {
              ctx.fillStyle = ink;
              ctx.font = '10px ui-monospace, monospace';
              ctx.textAlign = 'center';
              ctx.fillText(String(v), x0 + c * cw + (cw - 3) / 2, y0 + r * 46 + 19);
              ctx.textAlign = 'start';
            }
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (!inQuery) {
          const name = last === 0 ? '🐘 A' : last === 1 ? '🐘 B' : last === 2 ? '🐘 C' : `mouse #${last}`;
          ctx.fillText(`the parade: ${added}/${STREAM_LEN} banners filed · each +1 lands in one cell per row`, 14, 20);
          line = last !== null ? `arriving: ${name}` : 'starting…';
          ctx.fillStyle = ink;
        } else {
          const cells = Array.from({ length: D }, (_, r) => grid[r][sc.cellOf(r, q)]);
          const est = Math.min(...cells);
          const t = sc.truth[q] || 0;
          const isElephant = q < 3;
          ctx.fillText(
            `query ${isElephant ? 'the elephant' : 'a mouse'}: read its ${D} cells, keep the minimum`,
            14,
            20,
          );
          line = `cells [${cells.join(', ')}] → est ${est} · true ${t} · overcount +${est - t}${isElephant ? ': a whisker' : ': mostly strangers'}`;
          ctx.fillStyle = isElephant ? good : warn;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('cells only ever ADD · the estimate never falls below the truth', 14, H - 32);

        statsRef.current = {
          line: inQuery ? line : `${added}/${STREAM_LEN} filed`,
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
          new parade
        </button>
        <span className="viz-stat">
          {snap.line || 'handing out clipboards…'}
        </span>
      </div>
    </>
  );
}
