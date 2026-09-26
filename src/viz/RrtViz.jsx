import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One world, two trees, one seed. Left: the rapidly-exploring random
// tree as shipped (uniform sample, nearest node, fixed step), so each
// node grows in proportion to its Voronoi cell and the frontier rushes
// into the void. Right: the ablation (random node, random direction),
// the same loop with the bias removed, diffusing around its own
// center. The bug trap between start and goal is the concavity that
// kills greedy walking; the biased tree walks out, the blob does not.
const W = 640;
const H = 300;
const SEED = 20260926;
const WORLD = 100;
const STEP = 4;
const GOAL_R = 5;
const BUDGET = 1500;
const ITERS_PER_TICK = 3;
const START = [10, 50];
const GOAL = [90, 50];
const OBS = [
  [35, 25, 75, 30],
  [35, 70, 75, 75],
  [70, 30, 75, 70],
];

function inObstacle(p) {
  return OBS.some(([a, b, c, d]) => p[0] >= a && p[0] <= c && p[1] >= b && p[1] <= d);
}

// Exact segment-vs-rectangle intersection (Liang-Barsky), the same
// test the solution uses: sampling lost the resolution war twice.
export function segHitsRect(p, q, [a, b, c, d]) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  let t0 = 0;
  let t1 = 1;
  const checks = [[-dx, p[0] - a], [dx, c - p[0]], [-dy, p[1] - b], [dy, d - p[1]]];
  for (const [pp, qq] of checks) {
    if (pp === 0) {
      if (qq < 0) return false;
    } else {
      const t = qq / pp;
      if (pp < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
}

function edgeFree(p, q) {
  return !OBS.some((r) => segHitsRect(p, q, r));
}

function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

export function makeTree() {
  return { nodes: [START], parents: [-1], found: false, foundAt: 0, path: null, lastSample: null };
}

// One iteration. voronoi=true is the algorithm as shipped; false is
// the ablation. Returns nothing; mutates the tree.
export function grow(t, rand, voronoi) {
  if (t.found) return;
  const { nodes, parents } = t;
  let base;
  let ni;
  let next;
  if (voronoi) {
    const target = rand() < 0.05 ? GOAL : [rand() * WORLD, rand() * WORLD];
    t.lastSample = target;
    ni = 0;
    let best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d2 = (nodes[i][0] - target[0]) ** 2 + (nodes[i][1] - target[1]) ** 2;
      if (d2 < best) {
        best = d2;
        ni = i;
      }
    }
    base = nodes[ni];
    const d = dist(base, target);
    if (d < 1e-9) return;
    next = [base[0] + ((target[0] - base[0]) * STEP) / d, base[1] + ((target[1] - base[1]) * STEP) / d];
  } else {
    ni = Math.floor(rand() * nodes.length);
    base = nodes[ni];
    const ang = rand() * Math.PI * 2;
    next = [base[0] + STEP * Math.cos(ang), base[1] + STEP * Math.sin(ang)];
    t.lastSample = null;
  }
  if (next[0] < 0 || next[0] > WORLD || next[1] < 0 || next[1] > WORLD) return;
  if (inObstacle(next) || !edgeFree(base, next)) return;
  nodes.push(next);
  parents.push(ni);
  if (dist(next, GOAL) <= GOAL_R) {
    t.found = true;
    const path = [nodes.length - 1];
    while (parents[path[path.length - 1]] !== -1) path.push(parents[path[path.length - 1]]);
    t.path = path.reverse().map((i) => nodes[i]);
  }
}

export function coverage(nodes) {
  const cells = new Set();
  for (const [x, y] of nodes) cells.add(`${Math.min(9, Math.floor(x / 10))},${Math.min(9, Math.floor(y / 10))}`);
  return cells.size / 100;
}

function pathLength(path) {
  let s = 0;
  for (let i = 1; i < path.length; i++) s += dist(path[i - 1], path[i]);
  return s;
}

export default function RrtViz() {
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
      stepMs: 40,
      init: () => {
        const seed = SEED + cycle.current * 7919;
        return {
          randV: mulberry32(seed),
          randD: mulberry32(seed + 1),
          v: makeTree(),
          d: makeTree(),
          it: 0,
          done: false,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const seed = SEED + cycle.current * 7919;
            Object.assign(s, {
              randV: mulberry32(seed),
              randD: mulberry32(seed + 1),
              v: makeTree(),
              d: makeTree(),
              it: 0,
              done: false,
              rest: 0,
            });
          }
          return true;
        }
        for (let k = 0; k < ITERS_PER_TICK && s.it < BUDGET; k++) {
          s.it += 1;
          grow(s.v, s.randV, true);
          if (s.v.found && !s.v.foundAt) s.v.foundAt = s.it;
          grow(s.d, s.randD, false);
          if (s.d.found && !s.d.foundAt) s.d.foundAt = s.it;
        }
        // The race ends when the budget is spent, or a little after the
        // biased tree has arrived (so the diffusion blob gets the same
        // iterations the solution gives it, but the reader is not left
        // watching a finished panel for long).
        if (s.it >= BUDGET || (s.v.found && s.it >= s.v.foundAt + 300)) s.done = true;
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

        const panels = [
          { x0: 24, tree: s.v, color: algo, label: 'Voronoi-biased: nearest node to a uniform dart' },
          { x0: 344, tree: s.d, color: dim, label: 'ablated: random node, random direction (diffusion)' },
        ];
        const size = 236;
        const y0 = 34;
        const sx = (x) => (x / WORLD) * size;
        const sy = (y) => y0 + (1 - y / WORLD) * size;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`one seed, two trees, ${s.it} of ${BUDGET} iterations: the same loop with and without its hidden bias`, 14, 18);

        for (const panel of panels) {
          const { x0, tree, color, label } = panel;
          ctx.strokeStyle = 'rgba(154,165,189,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x0, y0, size, size);
          for (const [a, b, c, d] of OBS) {
            ctx.fillStyle = `${warn}55`;
            ctx.fillRect(x0 + sx(a), sy(d), sx(c - a), sx(d - b));
          }
          ctx.strokeStyle = `${color}99`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 1; i < tree.nodes.length; i++) {
            const p = tree.nodes[tree.parents[i]];
            const q = tree.nodes[i];
            ctx.moveTo(x0 + sx(p[0]), sy(p[1]));
            ctx.lineTo(x0 + sx(q[0]), sy(q[1]));
          }
          ctx.stroke();
          if (tree.lastSample && !tree.found) {
            const [tx, ty] = tree.lastSample;
            ctx.fillStyle = heur;
            ctx.beginPath();
            ctx.arc(x0 + sx(tx), sy(ty), 3, 0, Math.PI * 2);
            ctx.fill();
          }
          if (tree.path) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            tree.path.forEach(([px, py], i) => {
              if (i === 0) ctx.moveTo(x0 + sx(px), sy(py));
              else ctx.lineTo(x0 + sx(px), sy(py));
            });
            ctx.stroke();
          }
          ctx.fillStyle = good;
          ctx.beginPath();
          ctx.arc(x0 + sx(START[0]), sy(START[1]), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = good;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x0 + sx(GOAL[0]), sy(GOAL[1]), sx(GOAL_R), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = color === dim ? dim : algo;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(label, x0, y0 + size + 14);
          ctx.fillStyle = ink;
          ctx.fillText(
            `${tree.nodes.length} nodes · ${Math.round(coverage(tree.nodes) * 100)}% of cells${tree.found ? ` · goal at iteration ${tree.foundAt}` : ''}`,
            x0,
            y0 + size + 27,
          );
        }

        let line;
        if (s.v.found) {
          const len = pathLength(s.v.path) + GOAL_R;
          line = `biased tree: goal at iteration ${s.v.foundAt}, path ${Math.round(len)} units for an ${Math.round(dist(START, GOAL))} unit crow flight · diffusion: ${s.d.found ? `also arrived (iteration ${s.d.foundAt})` : `${Math.round(coverage(s.d.nodes) * 100)}% coverage, no path`}`;
          ctx.fillStyle = good;
        } else {
          line = 'the dart lands in some node’s Voronoi cell, and that node steps toward it: frontier nodes own the biggest cells';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = {
          line: s.done
            ? 'same code, one line different: pulled toward emptiness, the tree walks out of the trap; diffusing, it never leaves the room'
            : line,
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
          new darts
        </button>
        <span className="viz-stat">{snap.line || 'sampling…'}</span>
      </div>
    </>
  );
}
