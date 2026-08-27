import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The scan, live. Points in the plane; candidate edges are considered from
// lightest (shortest) to heaviest. An accepted edge turns green and merges
// two components (watch the node colors flow together: that is union-find
// relabeling in real time). A rejected edge flashes red: its endpoints
// already share a color, so it would close a cycle, and by scan order it is
// the heaviest thing on it. Exactly n − 1 greens later, the MST stands.
const N = 42;
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_EDGE = 6;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = Array.from({ length: N }, () => [
    30 + rand() * (W - 60),
    30 + rand() * (H - 88),
  ]);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  // Candidate edges: 5 nearest neighbors each, deduplicated.
  const set = new Set();
  for (let i = 0; i < N; i++) {
    const near = [...Array(N).keys()]
      .filter((j) => j !== i)
      .sort((a, b) => d2(pts[i], pts[a]) - d2(pts[i], pts[b]))
      .slice(0, 5);
    for (const j of near) set.add(i < j ? i * 100 + j : j * 100 + i);
  }
  const edges = [...set]
    .map((k) => [Math.floor(k / 100), k % 100])
    .map(([u, v]) => ({ u, v, w: Math.sqrt(d2(pts[u], pts[v])) }))
    .sort((a, b) => a.w - b.w);
  // Precompute accept/reject with union-find.
  const parent = [...Array(N).keys()];
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const e of edges) {
    const ru = find(e.u);
    const rv = find(e.v);
    e.accept = ru !== rv;
    if (e.accept) parent[ru] = rv;
  }
  return { pts, edges };
}

export default function KruskalViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ taken: 0, skipped: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ taken: 0, skipped: 0 });

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
      init: () => ({
        scene: makeScene(h32(SEED + cycle.current * 7919)),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = (s.scene.edges.length + 4) * TICKS_PER_EDGE;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(h32(SEED + cycle.current * 7919));
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const warn = css.getPropertyValue('--warn').trim() || '#e06767';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const upto = Math.min(Math.floor(s.tick / TICKS_PER_EDGE), s.scene.edges.length);
        // Recompute components up to this point for coloring.
        const parent = [...Array(N).keys()];
        const find = (x) => {
          while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
          }
          return x;
        };
        let taken = 0;
        let skipped = 0;
        for (let i = 0; i < upto; i++) {
          const e = s.scene.edges[i];
          if (e.accept) {
            parent[find(e.u)] = find(e.v);
            taken += 1;
          } else skipped += 1;
        }
        statsRef.current = { taken, skipped };

        // Accepted edges so far.
        for (let i = 0; i < upto; i++) {
          const e = s.scene.edges[i];
          if (!e.accept) continue;
          ctx.strokeStyle = path;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(s.scene.pts[e.u][0], s.scene.pts[e.u][1]);
          ctx.lineTo(s.scene.pts[e.v][0], s.scene.pts[e.v][1]);
          ctx.stroke();
        }
        // The edge under consideration.
        if (upto < s.scene.edges.length) {
          const e = s.scene.edges[upto];
          ctx.strokeStyle = e.accept ? heur : warn;
          ctx.lineWidth = 2.2;
          ctx.setLineDash(e.accept ? [] : [5, 4]);
          ctx.beginPath();
          ctx.moveTo(s.scene.pts[e.u][0], s.scene.pts[e.u][1]);
          ctx.lineTo(s.scene.pts[e.v][0], s.scene.pts[e.v][1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Nodes, colored by component root.
        for (let v = 0; v < N; v++) {
          const root = find(v);
          ctx.fillStyle = `hsl(${(root * 137.5) % 360}, 60%, 62%)`;
          ctx.beginPath();
          ctx.arc(s.scene.pts[v][0], s.scene.pts[v][1], 4.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(
          upto >= s.scene.edges.length
            ? `the MST stands: ${taken} edges taken, ${skipped} rejected as cycle-heaviest`
            : `lightest first · taken ${taken} · rejected ${skipped} · components ${N - taken}`,
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
          new villages
        </button>
        <span className="viz-stat">
          {snap.taken >= N - 1
            ? <>done: <strong>{N - 1}</strong> cables laid · every skipped edge was its cycle&apos;s heaviest</>
            : <>components share a color when union-find says so · <strong>{N - snap.taken}</strong> grids remain</>}
        </span>
      </div>
    </>
  );
}
