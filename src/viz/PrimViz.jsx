import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on one map of villages. Act one: Prim electrifies the
// island: the lit region grows one village per beat, each purchase
// the cheapest edge crossing the glow's boundary, candidate edges
// flickering dim before the winner lands green. Act two: the same
// map, one keystroke changed: Dijkstra keys grow a shortest-path
// tree from the same seed: watch it buy the long direct spokes the
// MST refused, the two totals side by side at the end.
const W = 640;
const H = 300;
const SEED = 20260827;
const NV = 16;
const STEP_TICKS = 22;
const END_HOLD = 64;

function sceneOnce(seed) {
  const rand = mulberry32(seed);
  // Villages scattered with a min-distance rule for legibility; the
  // spacing relaxes if the dart-throwing runs long.
  const pts = [];
  let tries = 0;
  while (pts.length < NV) {
    tries += 1;
    const gap = tries > 400 ? 40 : 58;
    const p = [40 + rand() * 560, 46 + rand() * 180];
    if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > gap)) pts.push(p);
  }
  const dist = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
  // Edges: each vertex to its 3 nearest (symmetrized).
  const adj = Array.from({ length: NV }, () => new Map());
  for (let a = 0; a < NV; a++) {
    const near = [...Array(NV).keys()]
      .filter((b) => b !== a)
      .sort((x, y) => dist(a, x) - dist(a, y))
      .slice(0, 3);
    near.forEach((b) => {
      adj[a].set(b, dist(a, b));
      adj[b].set(a, dist(a, b));
    });
  }
  const run = (mode) => {
    // mode 'prim': key = w; mode 'dijk': key = d + w.
    const inTree = Array(NV).fill(false);
    const dval = Array(NV).fill(Infinity);
    inTree[0] = true;
    dval[0] = 0;
    const picks = [];
    let total = 0;
    for (let step = 0; step < NV - 1; step++) {
      let best = Infinity;
      let be = null;
      for (let u = 0; u < NV; u++) {
        if (!inTree[u]) continue;
        for (const [v, w] of adj[u]) {
          if (inTree[v]) continue;
          const key = mode === 'prim' ? w : dval[u] + w;
          if (key < best) {
            best = key;
            be = [u, v, w];
          }
        }
      }
      if (!be) break;
      const [u, v, w] = be;
      inTree[v] = true;
      dval[v] = dval[u] + w;
      total += w;
      picks.push([u, v]);
    }
    return { picks, total };
  };
  const prim = run('prim');
  const dijk = run('dijk');
  return { pts, adj, prim, dijk };
}

function makeScene(seed) {
  // Retry deterministically until the 3-nearest graph is connected
  // (a full tree of NV-1 picks) and the two trees genuinely differ.
  for (let bump = 0; bump < 40; bump++) {
    const sc = sceneOnce(seed + bump * 977);
    if (
      sc.prim.picks.length === NV - 1 &&
      sc.dijk.total > sc.prim.total * 1.02
    )
      return sc;
  }
  return sceneOnce(seed);
}

export default function PrimViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT_TOTAL = (NV - 1) * STEP_TICKS + END_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 6089),
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
              scene: makeScene(SEED + cycle.current * 6089),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= ACT_TOTAL) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = ACT_TOTAL;
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const sc = s.scene;
        const runRes = actIdx === 0 ? sc.prim : sc.dijk;
        const tick = done ? ACT_TOTAL - 1 : s.tick;
        const bought = Math.min(Math.floor(tick / STEP_TICKS), runRes.picks.length);

        // Base edges, faint.
        const drawn = new Set();
        for (let a = 0; a < NV; a++) {
          for (const [b] of sc.adj[a]) {
            const k = a < b ? `${a}-${b}` : `${b}-${a}`;
            if (drawn.has(k)) continue;
            drawn.add(k);
            ctx.strokeStyle = '#232c44';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sc.pts[a][0], sc.pts[a][1]);
            ctx.lineTo(sc.pts[b][0], sc.pts[b][1]);
            ctx.stroke();
          }
        }

        // Bought edges.
        const lit = new Set([0]);
        for (let i = 0; i < bought; i++) {
          const [u, v] = runRes.picks[i];
          lit.add(u);
          lit.add(v);
          const fresh = i === bought - 1 && bought < runRes.picks.length + 1 && !done;
          ctx.strokeStyle = actIdx === 0 ? (fresh ? heur : good) : fresh ? heur : warn;
          ctx.lineWidth = fresh ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(sc.pts[u][0], sc.pts[u][1]);
          ctx.lineTo(sc.pts[v][0], sc.pts[v][1]);
          ctx.stroke();
        }

        // Villages.
        for (let v = 0; v < NV; v++) {
          ctx.beginPath();
          ctx.arc(sc.pts[v][0], sc.pts[v][1], v === 0 ? 8 : 5.5, 0, Math.PI * 2);
          ctx.fillStyle = v === 0 ? heur : lit.has(v) ? (actIdx === 0 ? good : warn) : '#243052';
          ctx.fill();
          if (v === 0) {
            ctx.strokeStyle = heur;
            ctx.stroke();
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(
          actIdx === 0
            ? 'act 1 · Prim: buy the cheapest edge crossing the glow: key = w'
            : 'act 2 · one keystroke changed: key = d + w: Dijkstra grows commuter routes',
          14,
          20,
        );

        const spentSoFar = runRes.picks
          .slice(0, bought)
          .reduce((a, [u, v]) => a + sc.adj[u].get(v), 0);
        let line;
        if (bought < runRes.picks.length) {
          line = `${bought}/${runRes.picks.length} purchases · copper so far: ${spentSoFar.toFixed(0)}`;
          ctx.fillStyle = actIdx === 0 ? good : warn;
        } else if (actIdx === 0) {
          line = `MST complete: total copper ${sc.prim.total.toFixed(0)}`;
          ctx.fillStyle = good;
        } else {
          const ratio = sc.dijk.total / sc.prim.total;
          line = `same seed, same map: shortest-path tree ${sc.dijk.total.toFixed(0)} vs MST ${sc.prim.total.toFixed(0)} (${ratio.toFixed(2)}x): a different question, answered perfectly`;
          ctx.fillStyle = warn;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'key = w buys copper; key = d + w buys commutes: read the objective twice' : line,
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
          new island
        </button>
        <span className="viz-stat">
          {snap.line || 'the station powers up…'}
        </span>
      </div>
    </>
  );
}
