import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Steepest-ascent hill climbing with random restarts on eight queens,
// one climb step per tick. The board shows the queens and the attacking
// pairs; the conflict count falls as queens move, and when no single move
// improves it and the count is not zero, the board is thrown away and a
// fresh random one appears (the restart, flashed red). Climbs are counted
// against the measured one-climb success rate, so the expected number of
// climbs (about seven) is on screen. The invariant checked every tick is
// that the displayed conflict count equals a recount, and at the end that
// the final board has zero conflicts and is one of the 92 solutions,
// which are enumerated by backtracking when the module loads.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 8;
const P_SINGLE = 0.143;

function conflicts(s) {
  let c = 0;
  for (let i = 0; i < N; i += 1) for (let j = i + 1; j < N; j += 1) if (s[i] === s[j] || Math.abs(s[i] - s[j]) === j - i) c += 1;
  return c;
}

const SOLUTIONS = (() => {
  const out = new Set();
  const cols = new Array(N).fill(0);
  const place = (c, rows, d1, d2) => {
    if (c === N) {
      out.add(cols.join(','));
      return;
    }
    for (let r = 0; r < N; r += 1) {
      if (rows.has(r) || d1.has(r - c) || d2.has(r + c)) continue;
      cols[c] = r;
      place(c + 1, new Set([...rows, r]), new Set([...d1, r - c]), new Set([...d2, r + c]));
    }
  };
  place(0, new Set(), new Set(), new Set());
  return out;
})();

export const SOLUTION_COUNT = SOLUTIONS.size;

function randomState(rand) {
  return Array.from({ length: N }, () => Math.floor(rand() * N));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const state = randomState(rand);
  return { rand, state, cur: conflicts(state), climbs: 1, steps: 0, evals: 1, restartFlash: 0, lastMove: null, done: false, ok: true, last: `climb 1 starts at ${conflicts(state)} attacking pairs` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.restartFlash = Math.max(0, sc.restartFlash - 1);
  if (sc.cur === 0) {
    sc.done = true;
    sc.ok = sc.ok && conflicts(sc.state) === 0 && SOLUTIONS.has(sc.state.join(','));
    sc.last = `solved on climb ${sc.climbs} after ${sc.steps} steps and ${sc.evals.toLocaleString()} evaluations; expected climbs 1/p = ${(1 / P_SINGLE).toFixed(1)}; one of the ${SOLUTIONS.size} solutions`;
    return true;
  }
  // one steepest-ascent step
  let best = null;
  let bestMoves = [];
  for (let c = 0; c < N; c += 1) {
    for (let r = 0; r < N; r += 1) {
      if (r === sc.state[c]) continue;
      const old = sc.state[c];
      sc.state[c] = r;
      const v = conflicts(sc.state);
      sc.evals += 1;
      sc.state[c] = old;
      if (best === null || v < best) {
        best = v;
        bestMoves = [[c, r]];
      } else if (v === best) bestMoves.push([c, r]);
    }
  }
  if (best < sc.cur) {
    const [c, r] = bestMoves[Math.floor(sc.rand() * bestMoves.length)];
    sc.lastMove = [c, sc.state[c], r];
    sc.state[c] = r;
    sc.cur = best;
    sc.steps += 1;
    sc.ok = sc.ok && conflicts(sc.state) === sc.cur;
    sc.last = `climb ${sc.climbs}, step ${sc.steps}: queen in column ${c + 1} moves to row ${r + 1}; ${sc.cur} attacking pair${sc.cur === 1 ? '' : 's'} left`;
  } else {
    // stuck at a local optimum that is not a solution: restart
    sc.last = `climb ${sc.climbs} stuck at ${sc.cur} attacking pairs with no improving move: restart from a random board`;
    sc.state = randomState(sc.rand);
    sc.cur = conflicts(sc.state);
    sc.evals += 1;
    sc.climbs += 1;
    sc.restartFlash = 2;
    sc.lastMove = null;
    if (sc.climbs > 60) {
      sc.done = true;
      sc.ok = false;
    }
  }
  return false;
}

export default function HillClimbingViz() {
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
      stepMs: 550,
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('eight queens, one steepest-ascent step per tick; red lines: attacking pairs; a stuck climb restarts from a random board', 12, 18);
        const cell = 27;
        const ox = 30;
        const oy = 40;
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            ctx.fillStyle = (r + c) % 2 === 0 ? `${dim}33` : `${dim}18`;
            ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
          }
        }
        if (sc.restartFlash > 0) {
          ctx.strokeStyle = warn;
          ctx.lineWidth = 3;
          ctx.strokeRect(ox - 2, oy - 2, N * cell + 4, N * cell + 4);
          ctx.lineWidth = 1;
        }
        // attacking pairs
        ctx.strokeStyle = `${warn}aa`;
        for (let i = 0; i < N; i += 1) {
          for (let j = i + 1; j < N; j += 1) {
            if (sc.state[i] === sc.state[j] || Math.abs(sc.state[i] - sc.state[j]) === j - i) {
              ctx.beginPath();
              ctx.moveTo(ox + i * cell + cell / 2, oy + sc.state[i] * cell + cell / 2);
              ctx.lineTo(ox + j * cell + cell / 2, oy + sc.state[j] * cell + cell / 2);
              ctx.stroke();
            }
          }
        }
        for (let c = 0; c < N; c += 1) {
          const r = sc.state[c];
          const moved = sc.lastMove && sc.lastMove[0] === c;
          ctx.fillStyle = sc.cur === 0 ? good : moved ? heur : algo;
          ctx.beginPath();
          ctx.arc(ox + c * cell + cell / 2, oy + r * cell + cell / 2, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        const tx = 290;
        ctx.fillStyle = ink;
        ctx.fillText(`climb ${sc.climbs}, step ${sc.steps}`, tx, 60);
        ctx.fillStyle = sc.cur === 0 ? good : ink;
        ctx.fillText(`${sc.cur} attacking pair${sc.cur === 1 ? '' : 's'}`, tx, 78);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.evals.toLocaleString()} evaluations (56 per step)`, tx, 96);
        ctx.fillText(`one climb succeeds ${(P_SINGLE * 100).toFixed(1)}% of the time (measured)`, tx, 124);
        ctx.fillText(`expected climbs 1/p = ${(1 / P_SINGLE).toFixed(1)}; measured mean 7.83`, tx, 140);
        ctx.fillText(`P(solved within ${sc.climbs} climbs) = ${((1 - (1 - P_SINGLE) ** sc.climbs) * 100).toFixed(0)}%`, tx, 156);
        // climbs as dots
        for (let k = 0; k < Math.min(sc.climbs, 40); k += 1) {
          ctx.fillStyle = k < sc.climbs - 1 ? warn : (sc.cur === 0 ? good : heur);
          ctx.fillRect(tx + (k % 20) * 14, 180 + Math.floor(k / 20) * 14, 10, 10);
        }
        ctx.fillStyle = dim;
        ctx.fillText('red: climbs that stuck; amber: the current climb; green: solved', tx, 222);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? `the recount matches; ${SOLUTIONS.size} solutions known` : 'INVARIANT BROKEN', tx, 250);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new board
        </button>
        <span className="viz-stat">{snap.line || 'climbing…'}</span>
      </div>
    </>
  );
}
