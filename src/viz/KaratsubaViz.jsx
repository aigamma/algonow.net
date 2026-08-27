import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The grid, thinned. Act one: the schoolbook 8x8 digit grid fills cell
// by cell to its full 64. Act two: the same product re-covered by
// Karatsuba: three half-grids (48), then each thins again (36), then
// again (27): the area falling by 3/4 per level while the counter
// narrates the compounding. Act three: Gauss's identity on live
// numbers: (a+b)(c+d) - ac - bd computes the cross term on canvas.
const W = 640;
const H = 300;
const SEED = 20260827;
const FILL_TICKS = 90;
const LEVEL_TICKS = 55;
const ID_HOLD = 100;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = 10 + Math.floor(rand() * 90);
  const b = 10 + Math.floor(rand() * 90);
  const c = 10 + Math.floor(rand() * 90);
  const d = 10 + Math.floor(rand() * 90);
  return { a, b, c, d };
}

export default function KaratsubaViz() {
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
        const total = FILL_TICKS + 3 * LEVEL_TICKS + ID_HOLD;
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
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const CS = 20;
        const drawGrid = (x0, y0, size, cells, color, filled) => {
          let k = 0;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const on = cells === null || cells(r, c);
              if (!on) continue;
              k += 1;
              const alive = k <= filled;
              ctx.fillStyle = alive ? `${color}33` : 'rgba(255,255,255,0.02)';
              ctx.fillRect(x0 + c * CS, y0 + r * CS, CS - 2, CS - 2);
              if (alive) {
                ctx.strokeStyle = `${color}88`;
                ctx.strokeRect(x0 + c * CS + 0.5, y0 + r * CS + 0.5, CS - 3, CS - 3);
              }
            }
          }
          return k;
        };

        const t = s.tick;
        let line = '';
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (t < FILL_TICKS) {
          // Act 1: schoolbook.
          const filled = Math.ceil((t / FILL_TICKS) * 64);
          drawGrid(60, 60, 8, null, warn, filled);
          ctx.fillText('act 1 · the schoolbook grid: every digit meets every digit', 14, 20);
          line = `cells: ${Math.min(filled, 64)} of 64 = n²`;
          ctx.fillStyle = ink;
        } else if (t < FILL_TICKS + 3 * LEVEL_TICKS) {
          // Act 2: the thinning levels.
          const lvl = Math.min(Math.floor((t - FILL_TICKS) / LEVEL_TICKS), 2);
          const within = (t - FILL_TICKS) % LEVEL_TICKS;
          const counts = [48, 36, 27];
          const frac = Math.min(1, within / (LEVEL_TICKS * 0.6));
          // Level 0: three 4x4 grids; deeper levels shown as count only
          // via denser masks on the same three grids.
          const masks = [
            (r, c) => true,
            (r, c) => !(r >= 2 && c >= 2), // 12 of 16 per grid = 36 total
            (r, c) => (r < 2 && c < 2) || (r < 2 && c >= 2 && c < 3) || (r >= 2 && r < 3 && c < 2) || (r === 2 && c === 2), // 9 of 16 = 27
          ];
          const mask = masks[lvl];
          const positions = [[60, 60], [60, 149], [149, 60]];
          let total = 0;
          positions.forEach(([x0, y0]) => {
            total += drawGrid(x0, y0, 4, mask, [heur, good, good][lvl], Math.ceil(frac * 16));
          });
          ctx.fillText(
            `act 2 · level ${lvl + 1}: three half-grids, each thinning by 3/4 again`,
            14,
            20,
          );
          line = `64 → 48 → 36 → 27: now ${counts[lvl]} cells · the exponent is the compounding`;
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`(3/4)^${lvl + 1} of the grid survives`, 340, 100);
        } else {
          // Act 3: the identity live.
          const { a, b, c, d } = sc;
          const ac = a * c;
          const bd = b * d;
          const mid = (a + b) * (c + d);
          const cross = mid - ac - bd;
          ctx.fillText('act 3 · Gauss’s trick on live numbers: the cross term for one product', 14, 20);
          ctx.fillStyle = ink;
          ctx.font = '13px ui-monospace, monospace';
          const lines = [
            `x = ${a}·B + ${b}    y = ${c}·B + ${d}`,
            `ac = ${ac}     bd = ${bd}`,
            `(a+b)(c+d) = ${a + b} × ${c + d} = ${mid}`,
            `${mid} − ${ac} − ${bd} = ${cross}`,
            `ad + bc = ${a * d} + ${b * c} = ${a * d + b * c}  ✓`,
          ];
          lines.forEach((ln, i) => {
            ctx.fillStyle = i === 3 ? heur : i === 4 ? good : ink;
            ctx.fillText(ln, 60, 70 + i * 34);
          });
          line = 'three multiplications bought all four terms: recurse and the exponent falls';
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
          new numbers
        </button>
        <span className="viz-stat">
          {snap.line || 'ruling the grid…'}
        </span>
      </div>
    </>
  );
}
