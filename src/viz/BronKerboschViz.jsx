import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// One random graph, searched twice for its maximal cliques. Act 1: the
// plain Bron-Kerbosch recursion, one call per tick: R (green) is the
// clique being built, P (blue ring) the candidates that could extend
// it, X (dim ring) the vertices already reported with R. Act 2: the
// same search with Tomita's pivot: the vertex of P union X with the
// most neighbors in P is ringed amber, and only candidates outside its
// neighborhood are branched on. Both find the same cliques; the call
// counters show what the pivot saves.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 14;

function randomGraph(rand) {
  const adj = Array.from({ length: N }, () => new Set());
  for (let u = 0; u < N; u++) {
    for (let v = u + 1; v < N; v++) {
      if (rand() < 0.5) {
        adj[u].add(v);
        adj[v].add(u);
      }
    }
  }
  return adj;
}

export function trace(adj, pivot) {
  const events = [];
  const cliques = [];
  const rec = (R, P, X) => {
    if (P.size === 0 && X.size === 0) {
      cliques.push([...R].sort((a, b) => a - b));
      events.push({ R: [...R], P: [], X: [], pivot: -1, candidates: [], found: [...R] });
      return;
    }
    let u = -1;
    let candidates = [...P];
    if (pivot) {
      let best = -1;
      for (const w of new Set([...P, ...X])) {
        let c = 0;
        for (const y of P) if (adj[w].has(y)) c += 1;
        if (c > best) { best = c; u = w; }
      }
      candidates = [...P].filter((v) => !adj[u].has(v));
    }
    events.push({ R: [...R], P: [...P], X: [...X], pivot: u, candidates: [...candidates], found: null });
    let Pn = new Set(P);
    let Xn = new Set(X);
    for (const v of candidates.sort((a, b) => a - b)) {
      rec(new Set([...R, v]), new Set([...Pn].filter((y) => adj[v].has(y))), new Set([...Xn].filter((y) => adj[v].has(y))));
      Pn.delete(v);
      Xn.add(v);
    }
  };
  rec(new Set(), new Set([...Array(N).keys()]), new Set());
  return { events, cliques };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const adj = randomGraph(rand);
  const plain = trace(adj, false);
  const piv = trace(adj, true);
  const edges = [];
  for (let u = 0; u < N; u++) for (const v of adj[u]) if (v > u) edges.push([u, v]);
  return { adj, edges, plain, piv };
}

export default function BronKerboschViz() {
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
      stepMs: 45,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const run = s.act === 0 ? s.scene.plain : s.scene.piv;
        if (s.tick >= run.events.length + 8) {
          s.tick = run.events.length + 8;
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const done = s.act >= 2;
        const act = done ? 1 : s.act;
        const run = act === 0 ? sc.plain : sc.piv;
        const idx = done ? run.events.length - 1 : Math.min(run.events.length - 1, s.tick);
        const ev = run.events[idx];
        const finished = done || s.tick >= run.events.length;
        const pos = (v) => [150 + 110 * Math.cos((2 * Math.PI * v) / N - Math.PI / 2), 160 + 110 * Math.sin((2 * Math.PI * v) / N - Math.PI / 2)];

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(act === 0
          ? `act 1 · plain Bron-Kerbosch: call ${Math.min(idx + 1, run.events.length)} of ${run.events.length}, branching on every candidate`
          : `act 2 · with Tomita’s pivot: call ${Math.min(idx + 1, run.events.length)} of ${run.events.length}, branching only outside the pivot’s neighborhood`, 14, 18);

        const inR = new Set(ev.R);
        const inP = new Set(ev.P);
        const inX = new Set(ev.X);
        const cand = new Set(ev.candidates);
        // edges
        ctx.lineWidth = 1;
        for (const [u, v] of sc.edges) {
          const [x1, y1] = pos(u);
          const [x2, y2] = pos(v);
          const both = inR.has(u) && inR.has(v);
          ctx.strokeStyle = both ? good : `${dim}55`;
          ctx.lineWidth = both ? 2.2 : 1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        // vertices
        for (let v = 0; v < N; v++) {
          const [x, y] = pos(v);
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = inR.has(v) ? good : inP.has(v) ? 'rgba(93,162,255,0.25)' : inX.has(v) ? 'rgba(154,165,189,0.18)' : 'rgba(154,165,189,0.06)';
          ctx.fill();
          ctx.lineWidth = v === ev.pivot ? 3 : cand.has(v) ? 2.2 : 1;
          ctx.strokeStyle = v === ev.pivot ? heur : cand.has(v) ? algo : inP.has(v) ? `${algo}88` : inX.has(v) ? dim : `${dim}55`;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(String(v), x - (v >= 10 ? 6 : 3), y + 4);
        }
        // ledger
        const lx = 300;
        const foundSoFar = run.events.slice(0, idx + 1).filter((e) => e.found).length;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`${N} vertices, ${sc.edges.length} edges`, lx, 52);
        ctx.fillStyle = good;
        ctx.fillText(`maximal cliques found: ${foundSoFar} of ${run.cliques.length}`, lx, 72);
        ctx.fillStyle = dim;
        ctx.fillText(`plain search: ${sc.plain.events.length} calls`, lx, 100);
        ctx.fillStyle = heur;
        ctx.fillText(`pivoted search: ${sc.piv.events.length} calls`, lx, 120);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('green: R, the clique being built · blue: P, candidates', lx, 148);
        ctx.fillText('grey: X, already reported with R · amber ring: the pivot', lx, 162);
        ctx.fillText('bright blue ring: the candidates actually branched on', lx, 176);
        if (ev.pivot >= 0 && !finished) {
          ctx.fillStyle = heur;
          ctx.fillText(`pivot ${ev.pivot}: ${ev.P.length} candidates, ${ev.candidates.length} outside its neighborhood`, lx, 200);
        }
        let line;
        if (finished) {
          line = act === 0
            ? `${run.cliques.length} maximal cliques in ${run.events.length} calls: every candidate branched, most branches redundant`
            : `the same ${run.cliques.length} cliques in ${run.events.length} calls: every maximal clique holds the pivot or a non-neighbor of it`;
          ctx.fillStyle = good;
        } else if (ev.found) {
          line = `maximal: P and X empty, R = {${ev.found.join(', ')}} reported`;
          ctx.fillStyle = good;
        } else if (act === 0) {
          line = `R = {${ev.R.join(', ')}}: ${ev.P.length} candidates, ${ev.X.length} excluded; branch on all ${ev.candidates.length}`;
          ctx.fillStyle = ink;
        } else {
          line = `R = {${ev.R.join(', ')}}: pivot ${ev.pivot} covers ${ev.P.length - ev.candidates.length} of ${ev.P.length} candidates, so only ${ev.candidates.length} branch`;
          ctx.fillStyle = heur;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `${sc.piv.cliques.length} maximal cliques: ${sc.plain.events.length} calls without a pivot, ${sc.piv.events.length} with one` : line };
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
        <span className="viz-stat">{snap.line || 'searching…'}</span>
      </div>
    </>
  );
}
