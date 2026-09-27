import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Bryant's function x1 x2 + x3 x4 + x5 x6 as a reduced ordered diagram
// under two variable orders: interleaved (x1, x2, x3, x4, x5, x6) on
// the left and odd-then-even (x1, x3, x5, x2, x4, x6) on the right.
// The diagrams are revealed one level per tick; then random inputs
// walk both from root to terminal (dashed low edge for 0, solid high
// edge for 1) and the two answers are compared with the formula.
const W = 640;
const H = 300;
const SEED = 20260926;
const PAIRS = 3;
const NV = 2 * PAIRS;
const WALKS = 8;

class Bdd {
  constructor(order) {
    this.order = new Map(order.map((v, i) => [v, i]));
    this.unique = new Map();
    this.nodes = new Map();
    this.memo = new Map();
    this.next = 2;
  }

  mk(v, lo, hi) {
    if (lo === hi) return lo;
    const k = `${v},${lo},${hi}`;
    if (this.unique.has(k)) return this.unique.get(k);
    const id = this.next++;
    this.unique.set(k, id);
    this.nodes.set(id, { v, lo, hi });
    return id;
  }

  variable(v) {
    return this.mk(v, 0, 1);
  }

  top(u) {
    return u > 1 ? this.nodes.get(u).v : null;
  }

  apply(op, u, w) {
    const k = `${op},${u},${w}`;
    if (this.memo.has(k)) return this.memo.get(k);
    let r;
    if (u <= 1 && w <= 1) r = op === 'and' ? u & w : u | w;
    else {
      const tu = this.top(u);
      const tw = this.top(w);
      let x;
      if (tw === null || (tu !== null && this.order.get(tu) <= this.order.get(tw))) x = tu;
      else x = tw;
      const [u0, u1] = tu === x ? [this.nodes.get(u).lo, this.nodes.get(u).hi] : [u, u];
      const [w0, w1] = tw === x ? [this.nodes.get(w).lo, this.nodes.get(w).hi] : [w, w];
      r = this.mk(x, this.apply(op, u0, w0), this.apply(op, u1, w1));
    }
    this.memo.set(k, r);
    return r;
  }

  reachable(root) {
    const seen = new Set();
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (n <= 1 || seen.has(n)) continue;
      seen.add(n);
      stack.push(this.nodes.get(n).lo, this.nodes.get(n).hi);
    }
    return seen;
  }

  evaluate(root, x) {
    let u = root;
    const path = [u];
    while (u > 1) {
      const n = this.nodes.get(u);
      u = x[n.v] ? n.hi : n.lo;
      path.push(u);
    }
    return { value: u, path };
  }
}

function bryant(bdd) {
  let f = 0;
  for (let i = 0; i < PAIRS; i++) f = bdd.apply('or', f, bdd.apply('and', bdd.variable(2 * i), bdd.variable(2 * i + 1)));
  return f;
}

function formula(x) {
  for (let i = 0; i < PAIRS; i++) if (x[2 * i] && x[2 * i + 1]) return 1;
  return 0;
}

function layout(bdd, root, order) {
  const ids = Array.from(bdd.reachable(root));
  const byLevel = order.map(() => []);
  for (const id of ids) byLevel[bdd.order.get(bdd.nodes.get(id).v)].push(id);
  const pos = new Map();
  byLevel.forEach((level, li) => {
    level.sort((a, b) => a - b);
    level.forEach((id, i) => pos.set(id, { x: (i + 1) / (level.length + 1), y: li }));
  });
  pos.set(0, { x: 0.3, y: order.length });
  pos.set(1, { x: 0.7, y: order.length });
  return { pos, size: ids.length };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const goodOrder = [0, 1, 2, 3, 4, 5];
  const badOrder = [0, 2, 4, 1, 3, 5];
  const good = new Bdd(goodOrder);
  const bad = new Bdd(badOrder);
  const rootGood = bryant(good);
  const rootBad = bryant(bad);
  const inputs = Array.from({ length: WALKS }, () => Array.from({ length: NV }, () => (rand() < 0.5 ? 1 : 0)));
  return {
    good, bad, rootGood, rootBad, goodOrder, badOrder,
    layoutGood: layout(good, rootGood, goodOrder), layoutBad: layout(bad, rootBad, badOrder),
    revealed: 0, inputs, walk: -1, agreed: 0, done: false,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.revealed < NV + 1) {
    sc.revealed += 1;
    return false;
  }
  sc.walk += 1;
  if (sc.walk >= WALKS) {
    sc.done = true;
    return true;
  }
  const x = sc.inputs[sc.walk];
  const a = sc.good.evaluate(sc.rootGood, x).value;
  const b = sc.bad.evaluate(sc.rootBad, x).value;
  if (a === b && a === formula(x)) sc.agreed += 1;
  return false;
}

export default function BddViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        ctx.fillText('x1 x2 + x3 x4 + x5 x6 as one reduced ordered diagram per variable order; levels revealed per tick, then random inputs walk both', 12, 18);
        const x = sc.walk >= 0 && sc.walk < WALKS ? sc.inputs[sc.walk] : null;
        const drawDiagram = (bdd, root, order, lay, ox, width, label) => {
          const pathSet = new Set();
          if (x) {
            const { path } = bdd.evaluate(root, x);
            path.forEach((n, i) => pathSet.add(`${n}>${path[i + 1]}`));
          }
          const P = (id) => {
            const p = lay.pos.get(id);
            return [ox + p.x * width, 44 + p.y * 30];
          };
          const nodes = Array.from(bdd.reachable(root)).filter((id) => bdd.order.get(bdd.nodes.get(id).v) < sc.revealed);
          for (const id of nodes) {
            const n = bdd.nodes.get(id);
            const [x1, y1] = P(id);
            for (const [child, dashed] of [[n.lo, true], [n.hi, false]]) {
              const childLevel = child > 1 ? bdd.order.get(bdd.nodes.get(child).v) : NV;
              if (childLevel >= sc.revealed && child > 1) continue;
              if (child <= 1 && sc.revealed <= NV) continue;
              const [x2, y2] = P(child);
              const onPath = pathSet.has(`${id}>${child}`);
              ctx.strokeStyle = onPath ? good : `${dim}66`;
              ctx.lineWidth = onPath ? 2.5 : 1;
              ctx.setLineDash(dashed ? [3, 3] : []);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
          for (const id of nodes) {
            const n = bdd.nodes.get(id);
            const [px, py] = P(id);
            const onPath = x && bdd.evaluate(root, x).path.includes(id);
            ctx.fillStyle = onPath ? `${good}55` : `${algo}33`;
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = onPath ? good : algo;
            ctx.stroke();
            ctx.fillStyle = ink;
            ctx.fillText(`x${n.v + 1}`, px - 7, py + 4);
          }
          if (sc.revealed > NV) {
            for (const t of [0, 1]) {
              const [px, py] = P(t);
              const hit = x && bdd.evaluate(root, x).value === t;
              ctx.fillStyle = hit ? `${good}55` : `${dim}33`;
              ctx.fillRect(px - 10, py - 9, 20, 18);
              ctx.strokeStyle = hit ? good : dim;
              ctx.strokeRect(px - 10, py - 9, 20, 18);
              ctx.fillStyle = ink;
              ctx.fillText(String(t), px - 3, py + 4);
            }
          }
          ctx.fillStyle = dim;
          ctx.fillText(`${label}: ${lay.size} internal nodes`, ox, 262);
        };
        drawDiagram(sc.good, sc.rootGood, sc.goodOrder, sc.layoutGood, 20, 200, 'interleaved order');
        drawDiagram(sc.bad, sc.rootBad, sc.badOrder, sc.layoutBad, 250, 370, 'odd variables first');
        ctx.fillStyle = dim;
        ctx.fillText('dashed: the 0 branch; solid: the 1 branch; nodes with equal branches are gone, equal subgraphs merged', 12, 280);
        let line;
        if (s.done) {
          line = `${sc.layoutGood.size} nodes vs ${sc.layoutBad.size} for the same function; ${sc.agreed} of ${WALKS} random inputs gave the same answer on both, equal to the formula; the file: 16 vs 510 at eight pairs`;
          ctx.fillStyle = sc.agreed === WALKS ? good : warn;
        } else if (x) {
          line = `input (${x.join('')}): both diagrams answer ${formula(x)} along the green paths; canonical form makes equivalence a pointer test`;
          ctx.fillStyle = ink;
        } else {
          line = `revealing level ${Math.min(sc.revealed, NV)} of ${NV}: the order decides how many distinct subfunctions each level must remember`;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8 - 12);
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
          new inputs
        </button>
        <span className="viz-stat">{snap.line || 'building…'}</span>
      </div>
    </>
  );
}
