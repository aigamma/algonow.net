import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The matching rule on a seeded random graph, one edge per tick: an uncovered
// edge takes both endpoints (amber edge, blue vertices) and its neighbours
// are deleted; a covered edge is skipped. The invariant checked every tick is
// that every deleted edge touches the cover and the cover has exactly twice
// as many vertices as kept edges; at the end every edge is covered and the
// cover is at most twice the exact optimum (brute force over subsets).
const W = 640;
const H = 300;
const SEED = 20261010;

function exactOpt(n, edges) {
  const masks = edges.map(([u, v]) => (1 << u) | (1 << v));
  let best = n;
  for (let m = 0; m < 1 << n; m += 1) {
    let bits = 0;
    for (let x = m; x; x &= x - 1) bits += 1;
    if (bits >= best) continue;
    let ok = true;
    for (let i = 0; i < masks.length && ok; i += 1) if ((masks[i] & m) === 0) ok = false;
    if (ok) best = bits;
  }
  return best;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 11 + Math.floor(rand() * 4); // 11 to 14 vertices
  const edges = [];
  for (let u = 0; u < n; u += 1) for (let v = u + 1; v < n; v += 1) if (rand() < 0.28) edges.push([u, v]);
  if (edges.length === 0) edges.push([0, 1]);
  for (let i = edges.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  const pos = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [320 + Math.cos(a) * 118, 150 + Math.sin(a) * 108];
  });
  return {
    n, edges, pos, i: 0, cover: new Set(), kept: [], state: edges.map(() => 'alive'),
    opt: exactOpt(n, edges), done: false, ok: true, last: `${n} vertices, ${edges.length} edges; exact optimum ${exactOpt(n, edges)}`,
  };
}

function check(sc) {
  let ok = sc.cover.size === 2 * sc.kept.length;
  sc.edges.forEach(([u, v], k) => {
    if (sc.state[k] !== 'alive' && !sc.cover.has(u) && !sc.cover.has(v)) ok = false;
  });
  return ok;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.i >= sc.edges.length) {
    const covered = sc.edges.every(([u, v]) => sc.cover.has(u) || sc.cover.has(v));
    sc.ok = sc.ok && covered && sc.cover.size <= 2 * sc.opt && sc.kept.length <= sc.opt;
    sc.done = true;
    sc.last = `done: ${sc.kept.length} matched edges, cover ${sc.cover.size} against optimum ${sc.opt} (ratio ${(sc.cover.size / sc.opt).toFixed(2)}); |M| <= OPT <= 2|M| and every edge covered: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const [u, v] = sc.edges[sc.i];
  if (!sc.cover.has(u) && !sc.cover.has(v)) {
    sc.cover.add(u);
    sc.cover.add(v);
    sc.kept.push(sc.i);
    sc.state[sc.i] = 'kept';
    sc.edges.forEach(([a, b], k) => {
      if (sc.state[k] === 'alive' && (sc.cover.has(a) || sc.cover.has(b))) sc.state[k] = 'deleted';
    });
    sc.last = `edge ${sc.i + 1} of ${sc.edges.length}: uncovered, take both ends (${u}, ${v}); cover ${sc.cover.size}, matching ${sc.kept.length}`;
  } else {
    sc.last = `edge ${sc.i + 1} of ${sc.edges.length}: already covered, skip`;
  }
  sc.i += 1;
  sc.ok = sc.ok && check(sc);
  return false;
}

export default function VertexCoverViz() {
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
      stepMs: 420,
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('any uncovered edge: take both ends (amber edge, blue vertices), delete what they touch; the kept edges are a matching', 12, 18);
        sc.edges.forEach(([u, v], k) => {
          const st = sc.state[k];
          ctx.strokeStyle = st === 'kept' ? heur : st === 'deleted' ? `${warn}55` : `${dim}99`;
          ctx.lineWidth = st === 'kept' ? 3 : 1.2;
          if (k === sc.i && !s.done) {
            ctx.strokeStyle = ink;
            ctx.lineWidth = 2;
          }
          ctx.beginPath();
          ctx.moveTo(sc.pos[u][0], sc.pos[u][1]);
          ctx.lineTo(sc.pos[v][0], sc.pos[v][1]);
          ctx.stroke();
        });
        sc.pos.forEach(([x, y], i) => {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = sc.cover.has(i) ? algo : '#2a3142';
          ctx.fill();
          ctx.strokeStyle = sc.cover.has(i) ? algo : dim;
          ctx.stroke();
          ctx.fillStyle = sc.cover.has(i) ? '#0b1020' : dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(String(i), x - (i > 9 ? 5 : 3), y + 3);
        });
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`edges alive ${sc.state.filter((t) => t === 'alive').length}, kept ${sc.kept.length}, deleted ${sc.state.filter((t) => t === 'deleted').length}`, 12, 44);
        ctx.fillText(`cover ${sc.cover.size} = 2 x ${sc.kept.length}; exact optimum ${sc.opt}; bound 2 x OPT = ${2 * sc.opt}`, 12, 60);
        ctx.fillText('the file: 1.495 x OPT mean, 2.000 worst, on 300 random graphs', 12, 76);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: deleted edges touch the cover; |cover| = 2|M|' : 'INVARIANT BROKEN', 12, 92);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new graph
        </button>
        <span className="viz-stat">{snap.line || 'covering…'}</span>
      </div>
    </>
  );
}
