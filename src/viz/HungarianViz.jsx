import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on cost matrices. Act one: the greedy trap: four
// [[1,2],[1,1000]] blocks: greedy picks cascade row by row, each
// first row stealing the shared cheap column, each second row
// slamming into its 1,000: the running total bleeds red to 4,004:
// then the optimal cells flash green: 12. Act two: the machine on a
// random 6x6: the same verified potentials algorithm runs in JS,
// matched cells filling blue one augmenting path at a time, the
// stipend and discount bars updating on each dual nudge, and the
// finale banner balancing the books: sum of potentials = total cost.
const W = 640;
const H = 300;
const SEED = 20260827;
const PICK_TICKS = 22;
const REVEAL_TICKS = 60;
const PHASE_TICKS = 40;
const END_HOLD = 64;

function hungarianJS(cost) {
  const n = cost.length;
  const INF = Infinity;
  const u = Array(n + 1).fill(0);
  const v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0);
  const way = Array(n + 1).fill(0);
  const phases = [];
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(INF);
    const used = Array(n + 1).fill(false);
    let updates = 0;
    for (;;) {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      updates += 1;
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
      if (p[j0] === 0) break;
    }
    while (j0) {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    }
    const match = Array(n).fill(-1);
    for (let j = 1; j <= n; j++) if (p[j]) match[p[j] - 1] = j - 1;
    phases.push({ match, u: u.slice(), v: v.slice(), updates });
  }
  const match = phases[phases.length - 1].match;
  const total = match.reduce((a, j, i) => a + cost[i][j], 0);
  return { phases, total };
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: the trap.
  const M = 9999;
  const trap = Array.from({ length: 8 }, () => Array(8).fill(M));
  for (let b = 0; b < 4; b++) {
    trap[2 * b][2 * b] = 1;
    trap[2 * b][2 * b + 1] = 2;
    trap[2 * b + 1][2 * b] = 1;
    trap[2 * b + 1][2 * b + 1] = 1000;
  }
  const greedyPicks = [];
  const taken = Array(8).fill(false);
  let gTotal = 0;
  for (let i = 0; i < 8; i++) {
    let best = Infinity;
    let bj = -1;
    for (let j = 0; j < 8; j++) {
      if (!taken[j] && trap[i][j] < best) {
        best = trap[i][j];
        bj = j;
      }
    }
    taken[bj] = true;
    gTotal += best;
    greedyPicks.push({ i, j: bj, c: best });
  }
  const optTrap = hungarianJS(trap);
  // Act 2: a random 6x6.
  const n = 6;
  const cost = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 1 + Math.floor(rand() * 9)),
  );
  const solved = hungarianJS(cost);
  return { trap, greedyPicks, gTotal, optTrap, cost, solved };
}

export default function HungarianViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT1_TOTAL = 8 * PICK_TICKS + REVEAL_TICKS;
  const ACT2_TOTAL = 6 * PHASE_TICKS + 50;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 4759),
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
              scene: makeScene(SEED + cycle.current * 4759),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL + END_HOLD)) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = (s.act === 0 ? ACT1_TOTAL : ACT2_TOTAL + END_HOLD);
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

        const sc = s.scene;
        if (s.act === 0) {
          const picks = Math.min(Math.floor(s.tick / PICK_TICKS), 8);
          const reveal = s.tick >= 8 * PICK_TICKS;
          const cw = 26;
          const ox = 120;
          const oy = 44;
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 1 · the trap: greedy takes the shared cheap column, the neighbor pays 1000', 14, 20);
          for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
              const c = sc.trap[i][j];
              const isPick = sc.greedyPicks.slice(0, picks).some((g) => g.i === i && g.j === j);
              const isOpt = reveal && sc.optTrap.phases[7].match[i] === j;
              ctx.fillStyle = isOpt
                ? 'rgba(98,217,138,0.35)'
                : isPick
                  ? c >= 1000
                    ? 'rgba(226,96,108,0.45)'
                    : 'rgba(240,185,75,0.35)'
                  : 'transparent';
              ctx.fillRect(ox + j * cw, oy + i * cw, cw - 2, cw - 2);
              ctx.strokeStyle = '#2a3450';
              ctx.strokeRect(ox + j * cw, oy + i * cw, cw - 2, cw - 2);
              if (c < 9999) {
                ctx.fillStyle = c >= 1000 ? warn : dim;
                ctx.font = '9px ui-monospace, monospace';
                ctx.fillText(String(c), ox + j * cw + 3, oy + i * cw + 16);
              }
            }
          }
          const gSoFar = sc.greedyPicks.slice(0, picks).reduce((a, g) => a + g.c, 0);
          let line;
          if (!reveal) {
            line = `greedy total so far: ${gSoFar.toLocaleString()}`;
            ctx.fillStyle = gSoFar >= 1000 ? warn : dim;
          } else {
            line = `greedy ${sc.gTotal.toLocaleString()} vs optimal ${sc.optTrap.total} (green): opportunity cost, unbooked`;
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const done = s.act >= 2;
          const t = done ? ACT2_TOTAL - 1 : Math.min(s.tick, ACT2_TOTAL - 1);
          const phase = Math.min(Math.floor(t / PHASE_TICKS), 5);
          const ph = sc.solved.phases[phase];
          const cw = 34;
          const ox = 170;
          const oy = 50;
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · the machine: one alternating path per row; stipends u and discounts v keep the books', 14, 20);
          for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
              const c = sc.cost[i][j];
              const tight = ph.u[i + 1] + ph.v[j + 1] === c;
              const matched = ph.match[i] === j;
              ctx.fillStyle = matched
                ? 'rgba(93,162,255,0.3)'
                : tight
                  ? 'rgba(98,217,138,0.14)'
                  : 'transparent';
              ctx.fillRect(ox + j * cw, oy + i * cw, cw - 2, cw - 2);
              ctx.strokeStyle = matched ? algo : tight ? good : '#2a3450';
              ctx.strokeRect(ox + j * cw, oy + i * cw, cw - 2, cw - 2);
              ctx.fillStyle = dim;
              ctx.font = '11px ui-monospace, monospace';
              ctx.fillText(String(c), ox + j * cw + 12, oy + i * cw + 21);
            }
            ctx.fillStyle = heur;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`u=${ph.u[i + 1]}`, ox - 44, oy + i * cw + 21);
          }
          for (let j = 0; j < 6; j++) {
            ctx.fillStyle = heur;
            ctx.fillText(`v=${ph.v[j + 1]}`, ox + j * cw + 2, oy + 6 * cw + 14);
          }
          const matchedCount = ph.match.filter((x) => x >= 0).length;
          const sumUV = ph.u.slice(1).reduce((a, b) => a + b, 0) + ph.v.slice(1).reduce((a, b) => a + b, 0);
          let line;
          if (!done && matchedCount < 6) {
            line = `row ${matchedCount + 1}: growing the tight-edge tree (${ph.updates} dual nudges this phase)`;
            ctx.fillStyle = heur;
          } else {
            line = `all matched: Σu + Σv = ${sumUV} = total cost ${sc.solved.total}: the equality IS the proof`;
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
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
          new costs
        </button>
        <span className="viz-stat">
          {snap.line || 'the ledger opens…'}
        </span>
      </div>
    </>
  );
}
