import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Chaitin's simplify-select on fourteen live ranges over forty positions,
// twelve inside a loop whose accesses count ten-fold. Overlapping ranges
// interfere. Simplify pushes any value with fewer than K = 4 neighbors,
// or when stuck the smallest cost per degree as a spill candidate; select
// pops the stack and hands out registers, spilling what finds none.
const W = 640;
const H = 300;
const SEED = 20260926;
const K = 4;
const N = 14;
const T = 40;
const LOOP = [12, 26];

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const vals = [];
  for (let i = 0; i < N; i++) {
    const a = Math.floor(rand() * (T - 4));
    const len = 2 + Math.floor(rand() * 14);
    const b = Math.min(T - 1, a + len);
    const uses = 1 + Math.floor(rand() * 4);
    let cost = 0;
    for (let u = 0; u <= uses; u++) {
      const p = a + Math.floor(((b - a) * u) / Math.max(uses, 1));
      cost += p >= LOOP[0] && p < LOOP[1] ? 10 : 1;
    }
    vals.push({ id: i, a, b, cost, uses: uses + 1 });
  }
  const adj = vals.map(() => new Set());
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (vals[i].a <= vals[j].b && vals[j].a <= vals[i].b) {
        adj[i].add(j);
        adj[j].add(i);
      }
    }
  }
  let pressure = 0;
  for (let p = 0; p < T; p++) {
    let c = 0;
    for (const v of vals) if (v.a <= p && p <= v.b) c += 1;
    pressure = Math.max(pressure, c);
  }
  return {
    vals,
    adj,
    pressure,
    phase: 'simplify',
    work: new Set(vals.map((v) => v.id)),
    deg: vals.map((_, i) => adj[i].size),
    stack: [],
    color: new Map(),
    spilled: new Set(),
    kind: new Map(),
    last: 'start: the overlaps are the interference graph',
    done: false,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.phase === 'simplify') {
    if (sc.work.size === 0) {
      sc.phase = 'select';
      sc.last = 'the stack is complete: now pop it and hand out registers';
      return false;
    }
    const low = [...sc.work].filter((v) => sc.deg[v] < K);
    let v;
    if (low.length) {
      v = low.reduce((p, q) => (sc.deg[q] < sc.deg[p] ? q : p));
      sc.kind.set(v, 'easy');
      sc.last = `simplify: v${v} has ${sc.deg[v]} neighbors left, fewer than ${K}: it can be colored last, push it`;
    } else {
      v = [...sc.work].reduce((p, q) => (sc.vals[q].cost / Math.max(sc.deg[q], 1) < sc.vals[p].cost / Math.max(sc.deg[p], 1) ? q : p));
      sc.kind.set(v, 'candidate');
      sc.last = `stuck: all have ${K} or more neighbors; push v${v} as the spill candidate, cost ${sc.vals[v].cost} over degree ${sc.deg[v]}`;
    }
    sc.stack.push(v);
    sc.work.delete(v);
    for (const m of sc.adj[v]) if (sc.work.has(m)) sc.deg[m] -= 1;
    return false;
  }
  if (sc.stack.length === 0) {
    sc.done = true;
    return true;
  }
  const v = sc.stack.pop();
  const used = new Set();
  for (const m of sc.adj[v]) if (sc.color.has(m)) used.add(sc.color.get(m));
  let c = -1;
  for (let i = 0; i < K; i++) {
    if (!used.has(i)) {
      c = i;
      break;
    }
  }
  if (c >= 0) {
    sc.color.set(v, c);
    sc.last = `select: v${v} takes r${c}${sc.kind.get(v) === 'candidate' ? ' after all: its neighbors left one free' : ''}`;
  } else {
    sc.spilled.add(v);
    sc.last = `select: v${v} finds all ${K} registers held by neighbors: spill it (cost ${sc.vals[v].cost})`;
  }
  return false;
}

export default function RegAllocViz() {
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
      stepMs: 650,
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
        const ox = 44;
        const oy = 34;
        const pw = 330;
        const rowH = 15;
        const X = (p) => ox + (p / T) * pw;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`live ranges over ${T} positions, K = ${K}; shaded band: a loop, accesses count ten-fold`, 12, 18);
        ctx.fillStyle = `${heur}22`;
        ctx.fillRect(X(LOOP[0]), oy - 4, X(LOOP[1]) - X(LOOP[0]), N * rowH + 4);
        sc.vals.forEach((v, i) => {
          const y = oy + i * rowH;
          const inStack = sc.stack.includes(v.id);
          const kind = sc.kind.get(v.id);
          let fill = `${dim}55`;
          let label = `v${i}`;
          if (sc.color.has(v.id)) {
            fill = good;
            label = `v${i} r${sc.color.get(v.id)}`;
          } else if (sc.spilled.has(v.id)) {
            fill = warn;
            label = `v${i} spill`;
          } else if (inStack) {
            fill = kind === 'candidate' ? `${heur}88` : `${algo}66`;
          }
          ctx.fillStyle = fill;
          ctx.fillRect(X(v.a), y, Math.max(3, X(v.b + 1) - X(v.a)), rowH - 4);
          ctx.fillStyle = sc.spilled.has(v.id) ? warn : sc.color.has(v.id) ? good : dim;
          ctx.fillText(label, 4, y + 10);
          ctx.fillStyle = dim;
          ctx.fillText(`c${v.cost}`, X(T) + 6, y + 10);
        });
        const tx = 430;
        ctx.fillStyle = ink;
        ctx.fillText(`pressure ${sc.pressure}, K ${K}`, tx, 50);
        ctx.fillStyle = dim;
        ctx.fillText(`phase: ${sc.phase}`, tx, 68);
        ctx.fillText(`stack depth ${sc.stack.length}`, tx, 84);
        ctx.fillStyle = good;
        ctx.fillText(`in registers ${sc.color.size}`, tx, 108);
        ctx.fillStyle = warn;
        let spillCost = 0;
        for (const v of sc.spilled) spillCost += sc.vals[v].cost;
        ctx.fillText(`spilled ${sc.spilled.size}, weighted cost ${spillCost}`, tx, 124);
        ctx.fillStyle = dim;
        ctx.fillText('blue: pushed with fewer than K', tx, 150);
        ctx.fillText('neighbors; amber: spill candidate', tx, 166);
        ctx.fillText('the file: 1,998 loads and stores', tx, 196);
        ctx.fillText('at K = 12 vs 15,485 for linear scan', tx, 212);
        let line;
        if (s.done) {
          line = `done: ${sc.color.size} values in ${K} registers, ${sc.spilled.size} spilled (cost ${spillCost}) at pressure ${sc.pressure}; at least ${Math.max(0, sc.pressure - K)} had to go`;
          ctx.fillStyle = sc.spilled.size === Math.max(0, sc.pressure - K) ? good : heur;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 8);
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
          new program
        </button>
        <span className="viz-stat">{snap.line || 'building the interference graph…'}</span>
      </div>
    </>
  );
}
