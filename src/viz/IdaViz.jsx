import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// An 8-puzzle scrambled by random moves. IDA* runs as a stepped
// depth-first search bounded by f = g + h (Manhattan distance): each
// tick generates a batch of nodes; when a bounded search fails, the
// bound rises to the smallest f that exceeded it and the search
// restarts from the root. The board shows the tip of the current
// path, the stack its depth, and the table the nodes each bound cost.
// The optimal length is checked against a breadth-first search.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 3;
const SCRAMBLE = 40;
const NODES_PER_TICK = 25;
const GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function key(s) {
  return s.join('');
}

function neighbors(state) {
  const z = state.indexOf(0);
  const r = Math.floor(z / N);
  const c = z % N;
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
    const j = rr * N + cc;
    const s = state.slice();
    s[z] = s[j];
    s[j] = 0;
    out.push(s);
  }
  return out;
}

export function manhattan(state) {
  let d = 0;
  for (let i = 0; i < 9; i++) {
    const v = state[i];
    if (v) d += Math.abs(Math.floor(i / N) - Math.floor(v / N)) + Math.abs((i % N) - (v % N));
  }
  return d;
}

export function bfsDistance(start) {
  const goalKey = key(GOAL);
  const seen = new Set([key(start)]);
  let frontier = [start];
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      if (key(s) === goalKey) return d;
      for (const t of neighbors(s)) {
        const k = key(t);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(t);
        }
      }
    }
    frontier = next;
    d += 1;
  }
  return -1;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  let s = GOAL.slice();
  let prev = null;
  for (let i = 0; i < SCRAMBLE; i++) {
    const opts = neighbors(s).filter((t) => !prev || key(t) !== key(prev));
    prev = s;
    s = opts[Math.floor(rand() * opts.length)];
  }
  const start = s;
  const sc = { start, optimal: bfsDistance(start), bound: manhattan(start), stack: null, nodes: 0, iterNodes: 0, iters: [], nextBound: Infinity, found: null, done: false, maxDepth: 0 };
  resetIteration(sc);
  return sc;
}

function resetIteration(sc) {
  sc.stack = [{ state: sc.start, g: 0, kids: neighbors(sc.start), idx: 0, prevKey: null }];
  sc.iterNodes = 0;
  sc.nextBound = Infinity;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  let budget = NODES_PER_TICK;
  while (budget > 0) {
    if (sc.stack.length === 0) {
      // the bounded search failed: raise the bound and restart
      sc.iters.push({ bound: sc.bound, nodes: sc.iterNodes });
      if (sc.nextBound === Infinity) {
        sc.done = true;
        return true;
      }
      sc.bound = sc.nextBound;
      resetIteration(sc);
      continue;
    }
    const top = sc.stack[sc.stack.length - 1];
    if (key(top.state) === key(GOAL)) {
      sc.found = top.g;
      sc.iters.push({ bound: sc.bound, nodes: sc.iterNodes });
      sc.done = true;
      return true;
    }
    if (top.idx >= top.kids.length) {
      sc.stack.pop();
      continue;
    }
    const child = top.kids[top.idx];
    top.idx += 1;
    if (top.prevKey && key(child) === top.prevKey) continue;
    sc.nodes += 1;
    sc.iterNodes += 1;
    budget -= 1;
    const g = top.g + 1;
    const f = g + manhattan(child);
    if (f > sc.bound) {
      if (f < sc.nextBound) sc.nextBound = f;
      continue;
    }
    sc.stack.push({ state: child, g, kids: neighbors(child), idx: 0, prevKey: key(top.state) });
    sc.maxDepth = Math.max(sc.maxDepth, sc.stack.length);
  }
  return false;
}

export default function IdaViz() {
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
      stepMs: 120,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 3) {
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`8-puzzle scrambled by ${SCRAMBLE} moves; depth-first search under f = g + Manhattan ≤ bound, ${NODES_PER_TICK} nodes per tick, restart with a larger bound`, 12, 18);
        const drawBoard = (state, x, y, cell, label) => {
          for (let i = 0; i < 9; i++) {
            const r = Math.floor(i / N);
            const c = i % N;
            const v = state[i];
            ctx.fillStyle = v === 0 ? 'transparent' : v === i ? `${good}33` : `${algo}33`;
            ctx.fillRect(x + c * cell, y + r * cell, cell - 2, cell - 2);
            ctx.strokeStyle = `${dim}66`;
            ctx.strokeRect(x + c * cell, y + r * cell, cell - 2, cell - 2);
            if (v) {
              ctx.fillStyle = ink;
              ctx.font = `${Math.floor(cell * 0.5)}px ui-monospace, monospace`;
              ctx.fillText(String(v), x + c * cell + cell * 0.32, y + r * cell + cell * 0.65);
            }
          }
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = dim;
          ctx.fillText(label, x, y + 3 * cell + 14);
        };
        drawBoard(sc.start, 20, 40, 34, 'start');
        const tip = sc.stack.length ? sc.stack[sc.stack.length - 1].state : sc.start;
        drawBoard(tip, 150, 40, 34, `path tip, depth ${Math.max(0, sc.stack.length - 1)}`);
        // the stack as a depth bar
        const bx = 280;
        ctx.fillStyle = dim;
        ctx.fillText(`memory: the path, ${sc.stack.length} states (deepest ${sc.maxDepth})`, bx, 50);
        for (let i = 0; i < sc.stack.length; i++) {
          ctx.fillStyle = i === sc.stack.length - 1 ? heur : `${algo}aa`;
          ctx.fillRect(bx + i * 10, 58, 8, 14);
        }
        // the iteration table
        ctx.fillStyle = ink;
        ctx.fillText(`bound ${sc.bound}: ${sc.iterNodes.toLocaleString()} nodes so far`, bx, 96);
        ctx.fillStyle = dim;
        sc.iters.slice(-6).forEach((it, i) => {
          ctx.fillText(`bound ${it.bound}: ${it.nodes.toLocaleString()} nodes${sc.done && i === sc.iters.slice(-6).length - 1 ? ' (found)' : ' (exhausted)'}`, bx, 116 + i * 16);
        });
        ctx.fillStyle = dim;
        ctx.fillText(`total nodes ${sc.nodes.toLocaleString()}; breadth-first distance ${sc.optimal}`, bx, 226);
        ctx.fillText('the file: 100 states, Manhattan 3,043 nodes vs plain deepening 398,551; A* stores 2,311 states', 12, 262);
        let line;
        if (s.done) {
          const ok = sc.found === sc.optimal;
          line = `solved in ${sc.found} moves, ${ok ? 'equal to the breadth-first distance' : 'NOT the breadth-first distance'}; ${sc.nodes.toLocaleString()} nodes over ${sc.iters.length} bounds, never more than ${sc.maxDepth} states in memory`;
          ctx.fillStyle = ok ? good : heur;
        } else {
          line = `bound ${sc.bound}: every node with g + h above the bound is cut; the smallest cut f becomes the next bound (${sc.nextBound === Infinity ? 'none yet' : sc.nextBound})`;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
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
          new scramble
        </button>
        <span className="viz-stat">{snap.line || 'searching…'}</span>
      </div>
    </>
  );
}
