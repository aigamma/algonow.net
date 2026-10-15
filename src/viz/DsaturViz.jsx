import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The same graph colored twice, one vertex per tick: on the left by the
// DSatur order (most saturated uncolored vertex next, ties by uncolored
// degree), on the right by largest-first (sorted once by degree). Even
// cycles use a seeded random graph of 20 vertices whose exact chromatic
// number is computed by a small branch-and-bound at the start; odd
// cycles use the crown graph on eight plus eight vertices (bipartite,
// chromatic number 2), the graph that fools a static order. Vertices sit
// on a circle; the vertex being colored is ringed; the colors in use are
// counted against the exact answer.
const W = 640;
const H = 300;
const SEED = 20261014;
const PALETTE_SIZE = 9;

function randomGraph(n, p, rand) {
  const adj = Array.from({ length: n }, () => []);
  for (let u = 0; u < n; u += 1) {
    for (let v = u + 1; v < n; v += 1) {
      if (rand() < p) {
        adj[u].push(v);
        adj[v].push(u);
      }
    }
  }
  return adj;
}

function crownGraph(k) {
  const adj = Array.from({ length: 2 * k }, () => []);
  for (let i = 0; i < k; i += 1) {
    for (let j = 0; j < k; j += 1) {
      if (i !== j) {
        adj[2 * i].push(2 * j + 1);
        adj[2 * j + 1].push(2 * i);
      }
    }
  }
  return adj;
}

export function chromaticNumber(adj, upper) {
  const n = adj.length;
  const color = new Array(n).fill(-1);
  const sat = Array.from({ length: n }, () => new Set());
  let best = upper;
  const rec = (colored, used) => {
    if (used >= best) return;
    if (colored === n) {
      best = used;
      return;
    }
    let u = -1;
    for (let v = 0; v < n; v += 1) {
      if (color[v] < 0 && (u < 0 || sat[v].size > sat[u].size || (sat[v].size === sat[u].size && adj[v].length > adj[u].length))) u = v;
    }
    for (let c = 0; c < Math.min(used + 1, best - 1); c += 1) {
      if (sat[u].has(c)) continue;
      color[u] = c;
      const touched = [];
      for (const v of adj[u]) {
        if (color[v] < 0 && !sat[v].has(c)) {
          sat[v].add(c);
          touched.push(v);
        }
      }
      rec(colored + 1, Math.max(used, c + 1));
      for (const v of touched) sat[v].delete(c);
      color[u] = -1;
      if (best <= used) break;
    }
  };
  rec(0, 0);
  return best;
}

function smallestFree(used) {
  let c = 0;
  while (used.has(c)) c += 1;
  return c;
}

export function isProper(adj, color) {
  for (let u = 0; u < adj.length; u += 1) {
    if (color[u] < 0) continue;
    for (const v of adj[u]) if (color[v] === color[u]) return false;
  }
  return true;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const crown = seed % 2 === 1;
  const adj = crown ? crownGraph(8) : randomGraph(20, 0.3 + rand() * 0.2, rand);
  const n = adj.length;
  // DSatur state
  const ds = { color: new Array(n).fill(-1), sat: Array.from({ length: n }, () => new Set()), udeg: adj.map((a) => a.length), used: 0 };
  // largest-first state
  const order = [...Array(n).keys()].sort((a, b) => adj[b].length - adj[a].length || a - b);
  const lf = { color: new Array(n).fill(-1), order, i: 0, used: 0 };
  const chi = crown ? 2 : chromaticNumber(adj, n);
  return { adj, n, crown, ds, lf, chi, tick: 0, lastDs: -1, lastLf: -1, done: false, ok: true, last: crown ? 'the crown graph: bipartite, every degree 7; largest-first falls back to index order' : `a random graph on ${n} vertices; exact chromatic number ${chi}` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= sc.n) {
    sc.done = true;
    return true;
  }
  const { adj, ds, lf } = sc;
  // DSatur step
  let best = -1;
  for (let u = 0; u < sc.n; u += 1) {
    if (ds.color[u] >= 0) continue;
    if (best < 0 || ds.sat[u].size > ds.sat[best].size || (ds.sat[u].size === ds.sat[best].size && ds.udeg[u] > ds.udeg[best])) best = u;
  }
  const c = smallestFree(ds.sat[best]);
  ds.color[best] = c;
  ds.used = Math.max(ds.used, c + 1);
  for (const v of adj[best]) {
    if (ds.color[v] < 0) {
      ds.sat[v].add(c);
      ds.udeg[v] -= 1;
    }
  }
  sc.lastDs = best;
  // largest-first step
  const u = lf.order[lf.i];
  lf.i += 1;
  const usedSet = new Set();
  for (const v of adj[u]) if (lf.color[v] >= 0) usedSet.add(lf.color[v]);
  const c2 = smallestFree(usedSet);
  lf.color[u] = c2;
  lf.used = Math.max(lf.used, c2 + 1);
  sc.lastLf = u;
  sc.ok = isProper(adj, ds.color) && isProper(adj, lf.color);
  sc.tick += 1;
  if (sc.tick >= sc.n) {
    sc.done = true;
    sc.ok = sc.ok && ds.used >= sc.chi && lf.used >= sc.chi && (!sc.crown || ds.used === 2);
    sc.last = `done: DSatur ${ds.used} colors, largest-first ${lf.used}, exact chromatic number ${sc.chi}${sc.crown ? ' (the crown graph: 8 against 2 at this size, 50 against 2 in the file)' : ''}`;
    return true;
  }
  sc.last = `vertex ${sc.tick} of ${sc.n}: DSatur colors vertex ${best} (saturation ${ds.sat[best].size}) with color ${c + 1}; largest-first colors vertex ${u} (degree ${adj[u].length}) with color ${c2 + 1}`;
  return false;
}

export default function DsaturViz() {
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
      stepMs: 600,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
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
        const palette = [algo, heur, good, warn, '#c08cff', '#5fd3e6', '#ff9f68', '#b6e36b', dim];
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(sc.crown ? 'the crown graph, one vertex per tick in each panel; ring: the vertex just colored' : 'one random graph, one vertex per tick in each panel; ring: the vertex just colored', 12, 18);
        const drawGraph = (cx, cy, r, color, last, title, used) => {
          const n = sc.n;
          const pos = (i) => {
            let ang;
            if (sc.crown) {
              // two columns for the crown graph
              const side = i % 2;
              const k = Math.floor(i / 2);
              return [cx + (side === 0 ? -r * 0.6 : r * 0.6), cy - r + (k / (n / 2 - 1)) * 2 * r];
            }
            ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
          };
          ctx.strokeStyle = `${dim}44`;
          for (let u = 0; u < n; u += 1) {
            const [x1, y1] = pos(u);
            for (const v of sc.adj[u]) {
              if (v > u) {
                const [x2, y2] = pos(v);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            }
          }
          for (let u = 0; u < n; u += 1) {
            const [x, y] = pos(u);
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = color[u] >= 0 ? palette[color[u] % PALETTE_SIZE] : `${dim}33`;
            ctx.fill();
            if (u === last) {
              ctx.strokeStyle = ink;
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.lineWidth = 1;
            }
          }
          ctx.fillStyle = dim;
          ctx.fillText(title, cx - r, cy - r - 14);
          ctx.fillStyle = ink;
          ctx.fillText(`${used} color${used === 1 ? '' : 's'} so far`, cx - r, cy + r + 22);
        };
        drawGraph(150, 150, 85, sc.ds.color, sc.lastDs, 'DSatur order (saturation first)', sc.ds.used);
        drawGraph(430, 150, 85, sc.lf.color, sc.lastLf, 'largest-first order (static)', sc.lf.used);
        ctx.fillStyle = dim;
        ctx.fillText(`exact chromatic number ${sc.chi}`, 12, 278);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'both colorings proper' : 'IMPROPER COLORING', 350, 278);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = good;
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
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          next graph
        </button>
        <span className="viz-stat">{snap.line || 'coloring…'}</span>
      </div>
    </>
  );
}
