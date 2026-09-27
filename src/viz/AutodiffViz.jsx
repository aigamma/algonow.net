import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// Scene A: the computation graph of f = sin(x) exp(y) + x^2 / y. The
// forward pass fills the values node by node (blue); the reverse sweep
// then walks the tape backwards and accumulates adjoints (amber), so
// one sweep yields both partials, checked against the closed form.
// Scene B: a chain with one input and six outputs, where forward mode
// carries a derivative along in one pass and reverse mode would need
// one sweep per output; the counters say which direction to sweep.
const W = 640;
const H = 300;

const NODES_A = [
  { id: 'x', label: 'x', x: 60, y: 90, op: 'input' },
  { id: 'y', label: 'y', x: 60, y: 200, op: 'input' },
  { id: 'a', label: 'a = sin x', x: 170, y: 60, op: 'sin', parents: ['x'] },
  { id: 'b', label: 'b = exp y', x: 170, y: 130, op: 'exp', parents: ['y'] },
  { id: 'd', label: 'd = x·x', x: 170, y: 200, op: 'sq', parents: ['x'] },
  { id: 'c', label: 'c = a·b', x: 290, y: 95, op: 'mul', parents: ['a', 'b'] },
  { id: 'e', label: 'e = d / y', x: 290, y: 200, op: 'div', parents: ['d', 'y'] },
  { id: 'f', label: 'f = c + e', x: 400, y: 148, op: 'add', parents: ['c', 'e'] },
];

export function makeSceneA(x, y) {
  const v = { x, y };
  v.a = Math.sin(x);
  v.b = Math.exp(y);
  v.d = x * x;
  v.c = v.a * v.b;
  v.e = v.d / y;
  v.f = v.c + v.e;
  // local derivatives along each edge (child, parent) -> d child / d parent
  const local = {
    'a|x': Math.cos(x),
    'b|y': v.b,
    'd|x': 2 * x,
    'c|a': v.b,
    'c|b': v.a,
    'e|d': 1 / y,
    'e|y': -v.d / (y * y),
    'f|c': 1,
    'f|e': 1,
  };
  const closed = { x: Math.cos(x) * Math.exp(y) + (2 * x) / y, y: Math.sin(x) * Math.exp(y) - (x * x) / (y * y) };
  return { kind: 'A', v, local, adj: {}, forwardOrder: ['x', 'y', 'a', 'b', 'd', 'c', 'e', 'f'], reverseOrder: ['f', 'e', 'c', 'd', 'b', 'a', 'y', 'x'], step: 0, phase: 'forward', filled: new Set(), closed, ops: { forward: 0, reverse: 0 }, done: false };
}

export function tickA(sc) {
  if (sc.phase === 'forward') {
    const id = sc.forwardOrder[sc.step];
    sc.filled.add(id);
    const node = NODES_A.find((n) => n.id === id);
    if (node.op !== 'input') sc.ops.forward += 1;
    sc.step += 1;
    if (sc.step >= sc.forwardOrder.length) {
      sc.phase = 'reverse';
      sc.step = 0;
      sc.adj.f = 1;
    }
    return false;
  }
  const id = sc.reverseOrder[sc.step];
  const node = NODES_A.find((n) => n.id === id);
  const a = sc.adj[id] || 0;
  if (node.parents) {
    for (const p of node.parents) {
      sc.adj[p] = (sc.adj[p] || 0) + a * sc.local[`${id}|${p}`];
      sc.ops.reverse += 1;
    }
  }
  sc.step += 1;
  if (sc.step >= sc.reverseOrder.length) sc.done = true;
  return sc.done;
}

const CHAIN = 6;

export function makeSceneB(x) {
  const values = [x];
  const derivs = [1];
  return { kind: 'B', x, values, derivs, step: 0, done: false, ops: { forward: 0, reverseWouldBe: 0 } };
}

export function tickB(sc) {
  if (sc.done) return true;
  const k = sc.step;
  const prev = sc.values[sc.values.length - 1];
  const dprev = sc.derivs[sc.derivs.length - 1];
  const inner = prev * 0.9 + 0.1 * (k + 1);
  sc.values.push(Math.sin(inner));
  sc.derivs.push(Math.cos(inner) * 0.9 * dprev);
  sc.ops.forward += 2;
  sc.step += 1;
  if (sc.step >= CHAIN) {
    sc.done = true;
    sc.ops.reverseWouldBe = CHAIN * 2 * CHAIN;
  }
  return sc.done;
}

export default function AutodiffViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const make = (c) => (c % 2 === 0 ? makeSceneA(0.7 + 0.3 * ((c / 2) % 3), 1.5 + 0.2 * ((c / 2) % 2)) : makeSceneB(0.4 + 0.1 * (((c - 1) / 2) % 4)));

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 600,
      init: () => ({ scene: make(cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: make(cycle.current), done: false, rest: 0 });
          }
          return true;
        }
        const sc = s.scene;
        if ((sc.kind === 'A' ? tickA(sc) : tickB(sc))) s.done = true;
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
        let line;
        if (sc.kind === 'A') {
          ctx.fillStyle = dim;
          ctx.fillText(`f = sin(x)·exp(y) + x²/y at x = ${sc.v.x.toFixed(2)}, y = ${sc.v.y.toFixed(2)}: forward pass (blue), then one reverse sweep (amber)`, 12, 18);
          for (const n of NODES_A) {
            if (!n.parents) continue;
            for (const p of n.parents) {
              const pn = NODES_A.find((m) => m.id === p);
              const active = sc.phase === 'reverse' && sc.adj[p] !== undefined && sc.adj[n.id] !== undefined;
              ctx.strokeStyle = active ? heur : `${dim}66`;
              ctx.lineWidth = active ? 2 : 1;
              ctx.beginPath();
              ctx.moveTo(pn.x + 14, pn.y);
              ctx.lineTo(n.x - 14, n.y);
              ctx.stroke();
            }
          }
          ctx.lineWidth = 1;
          for (const n of NODES_A) {
            const filled = sc.filled.has(n.id);
            const hasAdj = sc.adj[n.id] !== undefined;
            ctx.fillStyle = hasAdj ? heur : filled ? algo : `${dim}55`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ink;
            ctx.fillText(n.label, n.x - 26, n.y - 18);
            if (filled) {
              ctx.fillStyle = algo;
              ctx.fillText(sc.v[n.id].toFixed(3), n.x - 22, n.y + 26);
            }
            if (hasAdj) {
              ctx.fillStyle = heur;
              ctx.fillText(`̄ ${sc.adj[n.id].toFixed(3)}`, n.x - 22, n.y + 40);
            }
          }
          ctx.fillStyle = dim;
          ctx.fillText(`forward ops ${sc.ops.forward}, reverse ops ${sc.ops.reverse}`, 470, 60);
          if (sc.done) {
            ctx.fillStyle = good;
            ctx.fillText(`∂f/∂x = ${sc.adj.x.toFixed(4)}`, 470, 100);
            ctx.fillText(`∂f/∂y = ${sc.adj.y.toFixed(4)}`, 470, 118);
            ctx.fillStyle = dim;
            ctx.fillText(`closed form: ${sc.closed.x.toFixed(4)}, ${sc.closed.y.toFixed(4)}`, 470, 140);
            line = `one forward pass and one reverse sweep gave both partials, matching the closed form to ${Math.max(Math.abs(sc.adj.x - sc.closed.x), Math.abs(sc.adj.y - sc.closed.y)).toExponential(0)}`;
            ctx.fillStyle = good;
          } else {
            line = sc.phase === 'forward' ? 'forward: each node computes its value and records its local derivatives on the tape' : 'reverse: each node passes its adjoint to its parents, scaled by the recorded local derivative';
            ctx.fillStyle = ink;
          }
        } else {
          ctx.fillStyle = dim;
          ctx.fillText(`the other direction: one input x = ${sc.x.toFixed(2)}, six outputs g₁ … g₆, each gₖ = sin(0.9 gₖ₋₁ + 0.1k); forward mode carries (value, derivative)`, 12, 18);
          for (let k = 0; k <= CHAIN; k++) {
            const x = 50 + k * 90;
            const y = 130;
            const filled = k < sc.values.length;
            if (k < CHAIN) {
              ctx.strokeStyle = filled && k + 1 < sc.values.length ? heur : `${dim}66`;
              ctx.beginPath();
              ctx.moveTo(x + 14, y);
              ctx.lineTo(x + 90 - 14, y);
              ctx.stroke();
            }
            ctx.fillStyle = filled ? (k === 0 ? algo : heur) : `${dim}55`;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ink;
            ctx.fillText(k === 0 ? 'x' : `g${k}`, x - 6, y - 18);
            if (filled) {
              ctx.fillStyle = algo;
              ctx.fillText(sc.values[k].toFixed(3), x - 22, y + 26);
              ctx.fillStyle = heur;
              ctx.fillText(`d ${sc.derivs[k].toFixed(3)}`, x - 22, y + 40);
            }
          }
          ctx.fillStyle = dim;
          ctx.fillText(`forward mode: ${sc.ops.forward} ops in one pass for all six derivatives`, 12, 210);
          if (sc.done) {
            ctx.fillStyle = heur;
            ctx.fillText(`reverse mode here would sweep once per output: ${CHAIN} sweeps, about ${sc.ops.reverseWouldBe} ops`, 12, 230);
            line = 'many outputs, one input: sweep forward; many inputs, one output: sweep backward. The heuristic is the direction.';
            ctx.fillStyle = good;
          } else {
            line = 'a dual number carries the derivative along with the value; one pass, one input direction';
            ctx.fillStyle = ink;
          }
        }
        ctx.font = '11px ui-monospace, monospace';
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
          next scene
        </button>
        <span className="viz-stat">{snap.line || 'differentiating…'}</span>
      </div>
    </>
  );
}
