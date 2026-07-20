import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, prefersReducedMotion, mulberry32 } from './useCanvasLoop.js';

const W = 640;
const H = 400;
const CELL = 40;
const GRID = CELL * 9;
const GX = (W - GRID) / 2;
const GY = (H - GRID) / 2;
const SEED = 81181;

const MODES = [
  { key: 'mrv', label: 'tightest cell first · mrv' },
  { key: 'row', label: 'reading order' },
];

function candidatesOf(board, cell) {
  const r = Math.floor(cell / 9);
  const c = cell % 9;
  const used = new Set();
  for (let i = 0; i < 9; i += 1) {
    used.add(board[r * 9 + i]);
    used.add(board[i * 9 + c]);
  }
  const br = 3 * Math.floor(r / 3);
  const bc = 3 * Math.floor(c / 3);
  for (let dr = 0; dr < 3; dr += 1) {
    for (let dc = 0; dc < 3; dc += 1) used.add(board[(br + dr) * 9 + (bc + dc)]);
  }
  const out = [];
  for (let d = 1; d <= 9; d += 1) if (!used.has(d)) out.push(d);
  return out;
}

// Build a full valid grid by randomized backtracking, then open ~44 holes.
// Uniqueness is not required for the animation; any solution is a solution.
function makePuzzle(seed) {
  const rng = mulberry32(seed);
  const board = new Uint8Array(81);
  const fill = (cell) => {
    if (cell === 81) return true;
    const cands = candidatesOf(board, cell);
    for (let i = cands.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [cands[i], cands[j]] = [cands[j], cands[i]];
    }
    for (const d of cands) {
      board[cell] = d;
      if (fill(cell + 1)) return true;
      board[cell] = 0;
    }
    return false;
  };
  fill(0);
  const givens = board.slice();
  const order = [...Array(81).keys()];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let k = 0; k < 44; k += 1) givens[order[k]] = 0;
  return givens;
}

// Animated backtracking: MRV aims at the cell with fewest legal digits;
// reading order takes the first empty cell it finds. Same puzzle across both
// modes, so placements and backtracks are honestly comparable.
export default function SudokuViz() {
  const canvasRef = useRef(null);
  const [modeKey, setModeKey] = useState('mrv');
  const [restartTick, setRestartTick] = useState(0);
  const cycleRef = useRef(0);
  const countsRef = useRef({});
  const liveRef = useRef({ steps: 0, backtracks: 0 });
  const [snap, setSnap] = useState({ steps: 0, backtracks: 0, counts: {} });

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      maxTicks: 100000,
      init: () => {
        const givens = makePuzzle(SEED + cycleRef.current * 733);
        return {
          givens,
          board: givens.slice(),
          stack: [],
          needSelect: true,
          steps: 0,
          backtracks: 0,
          flash: null, // {cell, kind:'undo'|'place', ttl}
          phase: 'solve',
          rest: 0,
          stopAtRest: prefersReducedMotion(),
        };
      },
      tick: (st) => {
        if (st.phase === 'solve') {
          // Fast-forward when the naive order digs a deep hole, so the
          // animation never strands the viewer; the counters keep the truth.
          const budget = st.steps > 2600 ? 64 : st.steps > 900 ? 16 : 6;
          for (let op = 0; op < budget && st.phase === 'solve'; op += 1) {
            if (st.needSelect) {
              const empties = [];
              for (let i = 0; i < 81; i += 1) if (st.board[i] === 0) empties.push(i);
              if (!empties.length) {
                countsRef.current[modeKey] = { steps: st.steps, backtracks: st.backtracks };
                st.phase = 'done';
                st.rest = 90;
                if (st.stopAtRest) return false;
                break;
              }
              let cell = empties[0];
              if (modeKey === 'mrv') {
                let bestLen = 10;
                for (const e of empties) {
                  const len = candidatesOf(st.board, e).length;
                  if (len < bestLen) {
                    bestLen = len;
                    cell = e;
                    if (len <= 1) break;
                  }
                }
              }
              st.stack.push({ cell, cands: candidatesOf(st.board, cell), i: 0 });
              st.needSelect = false;
            } else {
              const top = st.stack[st.stack.length - 1];
              if (!top) {
                st.phase = 'done'; // contradictory puzzle: does not occur with generated grids
                st.rest = 60;
                break;
              }
              if (top.i < top.cands.length) {
                st.board[top.cell] = top.cands[top.i];
                top.i += 1;
                st.steps += 1;
                st.flash = { cell: top.cell, kind: 'place', ttl: 4 };
                st.needSelect = true;
              } else {
                st.board[top.cell] = 0;
                st.stack.pop();
                st.backtracks += 1;
                st.steps += 1;
                st.flash = { cell: top.cell, kind: 'undo', ttl: 6 };
              }
            }
          }
          liveRef.current = { steps: st.steps, backtracks: st.backtracks };
          if (st.flash && (st.flash.ttl -= 1) <= 0) st.flash = null;
        } else {
          st.rest -= 1;
          if (st.rest <= 0) {
            cycleRef.current += 1;
            countsRef.current = {};
            const givens = makePuzzle(SEED + cycleRef.current * 733);
            Object.assign(st, {
              givens,
              board: givens.slice(),
              stack: [],
              needSelect: true,
              steps: 0,
              backtracks: 0,
              flash: null,
              phase: 'solve',
            });
          }
        }
        return true;
      },
      draw: (ctx, st) => {
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, W, H);

        const solved = st.phase === 'done';
        const active = st.stack.length ? st.stack[st.stack.length - 1].cell : -1;

        for (let cell = 0; cell < 81; cell += 1) {
          const r = Math.floor(cell / 9);
          const c = cell % 9;
          const x = GX + c * CELL;
          const y = GY + r * CELL;

          if (st.flash && st.flash.cell === cell) {
            ctx.fillStyle =
              st.flash.kind === 'undo' ? 'rgba(224, 103, 103, 0.35)' : 'rgba(93, 162, 255, 0.25)';
            ctx.fillRect(x, y, CELL, CELL);
          }
          if (cell === active && !solved) {
            ctx.strokeStyle = '#5da2ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
          }

          const v = st.board[cell];
          if (v) {
            const given = st.givens[cell] !== 0;
            ctx.fillStyle = solved ? '#62d98a' : given ? '#e9edf6' : '#5da2ff';
            ctx.font = `${given ? '600 ' : ''}20px ui-monospace, Consolas, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 1);
          } else {
            // The heuristic's view: how many legal digits remain. Fewer
            // candidates burn brighter amber; the tightest cells shout.
            const n = candidatesOf(st.board, cell).length;
            const heat = n === 0 ? 0.9 : Math.max(0, (5 - n) / 5);
            if (heat > 0.05) {
              ctx.fillStyle = `rgba(240, 185, 75, ${0.15 + 0.5 * heat})`;
              ctx.font = '11px ui-monospace, Consolas, monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(n), x + CELL / 2, y + CELL / 2 + 1);
            }
          }
        }

        for (let i = 0; i <= 9; i += 1) {
          const heavy = i % 3 === 0;
          ctx.strokeStyle = heavy ? '#2c3650' : '#1b2334';
          ctx.lineWidth = heavy ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(GX + i * CELL, GY);
          ctx.lineTo(GX + i * CELL, GY + GRID);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(GX, GY + i * CELL);
          ctx.lineTo(GX + GRID, GY + i * CELL);
          ctx.stroke();
        }
      },
    },
    [modeKey, restartTick]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnap({
        steps: liveRef.current.steps,
        backtracks: liveRef.current.backtracks,
        counts: { ...countsRef.current },
      });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const done = MODES.filter((m) => snap.counts[m.key])
    .map((m) => `${m.key} ${snap.counts[m.key].steps} steps / ${snap.counts[m.key].backtracks} undos`)
    .join(' · ');

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`btn${m.key === modeKey ? ' btn-primary' : ''}`}
            aria-pressed={m.key === modeKey}
            onClick={() => setModeKey(m.key)}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycleRef.current += 1;
            countsRef.current = {};
            setRestartTick((t) => t + 1);
          }}
        >
          new puzzle
        </button>
        <span className="viz-stat">
          {done || (
            <>
              steps <b>{snap.steps}</b> · backtracks <b>{snap.backtracks}</b>
            </>
          )}
        </span>
      </div>
    </>
  );
}
