import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The definition, made visible. Two hundred surfers walk a small web: each
// tick every surfer follows a random out-link with probability 0.85 and
// teleports with probability 0.15. Each node's filled disc is the surfers'
// empirical share of visits; the ring around it is the true PageRank,
// computed by power iteration when the graph is built. Watch the discs grow
// into their rings: the walk IS the ranking. The three red-ringed pages are
// a spider trap; teleportation is why the swarm doesn't end up living there.
const W = 640;
const H = 300;
const N = 24;
const WALKERS = 200;
const D = 0.85;
const SEED = 20260827;
const TOTAL_TICKS = 620;

function makeGraph(seed) {
  const rand = mulberry32(seed);
  const cx = W / 2;
  const cy = H / 2 - 6;
  const pos = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    const r = 104 + rand() * 26;
    return [cx + Math.cos(a) * r * 1.55, cy + Math.sin(a) * r * 0.82];
  });
  const out = Array.from({ length: N }, () => []);
  const trap = [17, 18, 19];
  for (let v = 0; v < N; v++) {
    if (trap.includes(v)) continue;
    const k = 2 + Math.floor(rand() * 3);
    for (let e = 0; e < k; e++) {
      const t = Math.floor(rand() * N);
      if (t !== v) out[v].push(t);
    }
  }
  out[17] = [18];
  out[18] = [19];
  out[19] = [17, 18];
  out[3].push(17); // the trap is reachable
  out[9].push(18);
  out[21] = []; // two dead ends
  out[11] = [];
  return { pos, out, trap };
}

function truePagerank(out) {
  const n = out.length;
  let x = new Array(n).fill(1 / n);
  for (let it = 0; it < 300; it++) {
    const nxt = new Array(n).fill(0);
    let dangling = 0;
    for (let v = 0; v < n; v++) {
      if (out[v].length) {
        const share = x[v] / out[v].length;
        for (const t of out[v]) nxt[t] += share;
      } else dangling += x[v];
    }
    const base = (1 - D) / n + (D * dangling) / n;
    x = nxt.map((w) => base + D * w);
  }
  return x;
}

export default function PagerankViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ err: 1, steps: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ err: 1, steps: 0 });

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
        const graph = makeGraph(SEED + cycle.current * 7919);
        const rand = mulberry32(SEED + cycle.current * 7919 + 1);
        return {
          graph,
          truth: truePagerank(graph.out),
          rand,
          at: Array.from({ length: WALKERS }, () => Math.floor(rand() * N)),
          visits: new Float64Array(N),
          total: 0,
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        if (s.tick >= TOTAL_TICKS) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const graph = makeGraph(SEED + cycle.current * 7919);
            const rand = mulberry32(SEED + cycle.current * 7919 + 1);
            Object.assign(s, {
              graph,
              truth: truePagerank(graph.out),
              rand,
              at: Array.from({ length: WALKERS }, () => Math.floor(rand() * N)),
              visits: new Float64Array(N),
              total: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        for (let w = 0; w < WALKERS; w++) {
          const v = s.at[w];
          const links = s.graph.out[v];
          s.at[w] =
            !links.length || s.rand() > D
              ? Math.floor(s.rand() * N)
              : links[Math.floor(s.rand() * links.length)];
          s.visits[s.at[w]] += 1;
          s.total += 1;
        }
        s.tick += 1;
        let err = 0;
        for (let v = 0; v < N; v++) {
          err += Math.abs(s.visits[v] / s.total - s.truth[v]);
        }
        statsRef.current = { err: err / 2, steps: s.total };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const warn = css.getPropertyValue('--warn').trim() || '#e06767';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.lineWidth = 1;
        for (let v = 0; v < N; v++) {
          const [x1, y1] = s.graph.pos[v];
          for (const t of s.graph.out[v]) {
            const [x2, y2] = s.graph.pos[t];
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        const radius = (share) => 3 + Math.sqrt(share) * 60;
        for (let v = 0; v < N; v++) {
          const [x, y] = s.graph.pos[v];
          const isTrap = s.graph.trap.includes(v);
          ctx.beginPath();
          ctx.arc(x, y, radius(s.truth[v]), 0, Math.PI * 2);
          ctx.strokeStyle = isTrap ? warn : path;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          const emp = s.total ? s.visits[v] / s.total : 0;
          ctx.beginPath();
          ctx.arc(x, y, radius(emp), 0, Math.PI * 2);
          ctx.fillStyle = `${algo}66`;
          ctx.fill();
        }
        // A sample of surfers, drawn as sparks around their current node.
        ctx.fillStyle = '#e9edf6';
        for (let w = 0; w < 70; w++) {
          const [x, y] = s.graph.pos[s.at[w]];
          const jx = ((w * 37) % 15) - 7;
          const jy = ((w * 53) % 13) - 6;
          ctx.fillRect(x + jx, y + jy, 1.6, 1.6);
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        const { err, steps } = statsRef.current;
        ctx.fillText(
          `${WALKERS} surfers · ${steps.toLocaleString()} clicks · rings = the eigenvector · discs = where the swarm actually lives · gap ${(err * 100).toFixed(1)}%`,
          14,
          H - 10,
        );
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
          new web
        </button>
        <span className="viz-stat">
          {snap.steps > 0
            ? <>the swarm is <strong>{(snap.err * 100).toFixed(1)}%</strong> away from the eigenvector · red ring = the trap teleportation drains</>
            : 'releasing the surfers…'}
        </span>
      </div>
    </>
  );
}
